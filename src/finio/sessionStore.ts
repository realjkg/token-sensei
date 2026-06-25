// Self-validating session tokens for the FinIO demo.
// Instead of a server-side Map (which breaks when Next.js routes run in
// separate VM contexts), the sessionId embeds its own expiry and a short HMAC
// signature. The export route can verify authenticity without shared state.
//
// Format: "<expiresAtMs>.<hmac16hex>"  — intentionally readable for the demo.

import { createHmac } from 'crypto';

const SESSION_TTL_MS = 5 * 60_000; // 5 minutes
// Demo-only secret. Real systems use an env-var secret rotated regularly.
const DEMO_HMAC_SECRET = 'ratio-finio-demo-v1';

function sign(payload: string): string {
  return createHmac('sha256', DEMO_HMAC_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16);
}

/** Mint a new self-validating sessionId and its ISO expiry. */
export function createSession(): { sessionId: string; expiresAt: string } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const sessionId = `${payload}.${sign(payload)}`;
  return { sessionId, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Returns true if the sessionId has a valid signature and has not expired.
 * No shared state required — the token is self-contained.
 */
export function validateSession(sessionId: string): boolean {
  const dot = sessionId.lastIndexOf('.');
  if (dot === -1) return false;
  const payload = sessionId.slice(0, dot);
  const sig = sessionId.slice(dot + 1);
  if (sig !== sign(payload)) return false;
  const expiresAt = parseInt(payload, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
  return true;
}

