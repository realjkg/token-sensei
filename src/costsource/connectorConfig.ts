// Generic config-gated connector seam — the shared shape every FOCUS-export
// connector (public cloud, Kubernetes, Nutanix) uses to ship DARK by default.
//
// This is the reusable distillation of pointfiveConfig.ts: a feature flag plus a
// set of required credential env vars resolve to a `disabled | unconfigured |
// configured` discriminated union, with `configured` the ONLY state that ever
// permits a network call. Each connector declares a `ConnectorSpec` (identity +
// env contract); the resolver, status note, and descriptor builder are pure
// functions of an env record so every branch is unit-testable without touching
// process.env or the network.
//
// Only the adapter (auth, fetch, identity) is source-specific. The engine, the
// version-negotiation shim, and the views are unchanged regardless of source.

import type {
  CostSourceDescriptor,
  SourceCapability,
  SourceCoverage,
  SourceKind,
} from './CostSourceClient';
import type { FocusVersion } from './focusVersions';

type EnvRecord = Record<string, string | undefined>;

/**
 * Status of a config-gated connector — a discriminated union over the three
 * real-world states, mirroring `PointFiveStatus`:
 *   - `disabled`     — feature flag OFF; the connector ships dark (default).
 *   - `unconfigured` — flag ON but one or more credentials are missing.
 *   - `configured`   — flag ON and all credentials present; live calls allowed.
 * Only `configured` ever permits a network call.
 */
export type ConnectorStatus =
  | { state: 'disabled' }
  | { state: 'unconfigured'; missing: string[] }
  | { state: 'configured'; credentials: Record<string, string> };

/** Static identity + env contract for a config-gated FOCUS-export connector. */
export interface ConnectorSpec {
  id: string;
  name: string;
  kind: SourceKind;
  coverage: SourceCoverage;
  focusVersion: FocusVersion; // the version this source natively exports
  capabilities: SourceCapability[];
  /** Feature-flag env var; OFF unless explicitly set to a truthy value. */
  flagEnv: string;
  /** Required credential env vars, keyed by logical credential name. */
  requiredEnv: Record<string, string>;
  /** One-line summary of what the live adapter does once configured. */
  liveSummary: string;
}

/** True only if the connector's feature flag is explicitly enabled. Default: false (dark). */
export function isConnectorEnabled(spec: ConnectorSpec, env: EnvRecord): boolean {
  const raw = env[spec.flagEnv];
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

/**
 * Resolve a connector's status from an env record. Pure — no process.env, no
 * I/O. Flag OFF short-circuits to `disabled` before any credential is read, so a
 * dark build never even inspects the credential env.
 */
export function resolveConnectorStatus(spec: ConnectorSpec, env: EnvRecord): ConnectorStatus {
  if (!isConnectorEnabled(spec, env)) return { state: 'disabled' };

  const missing: string[] = [];
  const credentials: Record<string, string> = {};
  for (const [key, envName] of Object.entries(spec.requiredEnv)) {
    const value = env[envName]?.trim();
    if (!value) missing.push(envName);
    else credentials[key] = value;
  }

  if (missing.length > 0) return { state: 'unconfigured', missing };
  return { state: 'configured', credentials };
}

/** Human-readable note for the source descriptor, per status. */
export function connectorStatusNote(spec: ConnectorSpec, status: ConnectorStatus): string {
  switch (status.state) {
    case 'disabled':
      return `${spec.liveSummary} — feature flag ${spec.flagEnv} is OFF; ships dark, no network calls.`;
    case 'unconfigured':
      return `Feature flag ${spec.flagEnv} ON but credentials missing (${status.missing.join(', ')}); no network calls until configured.`;
    case 'configured':
      return `${spec.liveSummary} — configured; fetches FOCUS v${spec.focusVersion} export rows and normalizes to canonical v1.4.`;
  }
}

/**
 * Build a connector's source descriptor from a status. `configured` is driven by
 * the resolved status, so `listSources()` honestly reflects whether the dark
 * connector has been switched on — without changing the engine or views.
 */
export function connectorDescriptor(
  spec: ConnectorSpec,
  status: ConnectorStatus,
): CostSourceDescriptor {
  return {
    id: spec.id,
    name: spec.name,
    kind: spec.kind,
    focusVersion: spec.focusVersion,
    coverage: spec.coverage,
    capabilities: spec.capabilities,
    configured: status.state === 'configured',
    note: connectorStatusNote(spec, status),
  };
}

