// Gateway auth (Wave3b). Bearer-token authentication, one API key per tenant
// (.obvious/obvious.md API-First rule). Pure functions — no req/res — so the
// enforcement decision and token matching are independently testable.
//
// Offline/CI-safety invariant: with NO token configured AND the offline-safe
// mock provider (the default), auth is NOT enforced — the demo and CI stay green
// with zero env. Enforcement turns on only when a token is configured OR a live
// provider (claude | openai | openllm) is selected.

export interface GatewayAuthConfig {
  /** Whether a Bearer token is required for this request. */
  enforce: boolean;
  /** The configured server-side token, if any. */
  token: string | null;
}

export type AuthOutcome =
  | { ok: true; tenant: string }
  | { ok: false; code: 'unauthorized'; message: string };

const LIVE_PROVIDERS = new Set(['claude', 'openai', 'openllm']);

/** Decide whether to enforce Bearer auth from the server environment. */
export function resolveGatewayAuth(env: NodeJS.ProcessEnv): GatewayAuthConfig {
  const token = env.RATIO_API_TOKEN?.trim() || null;
  const provider = (env.AI_PROVIDER ?? '').toLowerCase();
  const liveProvider = LIVE_PROVIDERS.has(provider);
  return { enforce: Boolean(token) || liveProvider, token };
}

/** Parse a `Bearer <token>` Authorization header. Returns null when absent/malformed. */
export function extractBearer(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string') return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// Stable, non-reversible tenant id derived from the token (djb2 → base36) so we
// can key rate limits and log a tenant WITHOUT ever logging the raw secret.
export function tenantId(token: string): string {
  let hash = 5381;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 33) ^ token.charCodeAt(i);
  }
  return `tnt_${(hash >>> 0).toString(36)}`;
}

/** Validate the request's Bearer token against the configured token. */
export function checkAuth(
  authHeader: string | string[] | undefined,
  config: GatewayAuthConfig,
): AuthOutcome {
  if (!config.enforce) return { ok: true, tenant: 'anonymous' };

  if (!config.token) {
    // Live provider selected but no token configured — secure default: refuse
    // rather than expose a live LLM endpoint unauthenticated.
    return {
      ok: false,
      code: 'unauthorized',
      message: 'API token required: configure RATIO_API_TOKEN to enable authenticated access',
    };
  }

  const presented = extractBearer(authHeader);
  if (!presented) {
    return {
      ok: false,
      code: 'unauthorized',
      message: 'Missing Authorization: Bearer <token> header',
    };
  }
  if (presented !== config.token) {
    return { ok: false, code: 'unauthorized', message: 'Invalid API token' };
  }
  return { ok: true, tenant: tenantId(presented) };
}

