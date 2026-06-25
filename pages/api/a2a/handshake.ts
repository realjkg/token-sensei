// POST /api/a2a/handshake — step 1 of the FinIO A2A exchange.
//
// Trust model (v1): a shared bearer token gates this route. A successful
// handshake mints a short-lived sessionId that authorises /api/finio/export.
//
// Errors:
//   401 — missing or wrong Authorization header
//   409 — focusVersion the responder does not support
//   405 — non-POST method
import type { NextApiRequest, NextApiResponse } from 'next';
import { FINIO_DEMO_TOKEN } from '@/finio/FinioClient';
import type { HandshakeRequest, HandshakeResult } from '@/finio/FinioClient';
import { createSession } from '@/finio/sessionStore';

const SUPPORTED_FOCUS_VERSIONS = ['1.1'];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): void {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // --- Auth: shared bearer token ---
  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== FINIO_DEMO_TOKEN) {
    res.status(401).json({ error: 'Invalid or missing bearer token' });
    return;
  }

  // --- Parse body ---
  const body = req.body as Partial<HandshakeRequest>;
  const { agentId, capabilities, focusVersion, nonce } = body;

  if (!agentId || !capabilities || !focusVersion || !nonce) {
    res.status(400).json({ error: 'Missing required handshake fields' });
    return;
  }

  // --- FOCUS version negotiation ---
  if (!SUPPORTED_FOCUS_VERSIONS.includes(focusVersion)) {
    res.status(409).json({
      error: `focusVersion mismatch: requested '${focusVersion}', responder supports '${SUPPORTED_FOCUS_VERSIONS.join(', ')}'`,
    });
    return;
  }

  // --- Mint session ---
  const { sessionId, expiresAt } = createSession();

  const result: HandshakeResult = {
    sessionId,
    accepts: ['finio.export'],
    focusVersion: '1.1',
    expiresAt,
  };

  res.status(200).json(result);
}

