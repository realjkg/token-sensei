// GET /api/finio/export?sessionId=<id> — step 2 of the FinIO A2A exchange.
//
// Validates the sessionId minted by /api/a2a/handshake, then builds a
// FOCUS-shaped payload from the seed workloads. Pure over seed data in v1
// — no persistence, no external service calls.
//
// Errors:
//   401 — missing, unknown, or expired sessionId
//   405 — non-GET method
import type { NextApiRequest, NextApiResponse } from 'next';
import { WORKLOADS } from '@/data/workloads';
import type { FinioExport } from '@/finio/FinioClient';
import { workloadsToFocusRows } from '@/finio/mapWorkloadToFocus';
import { validateSession } from '@/finio/sessionStore';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // --- Session validation ---
  // Accept sessionId via query param or Authorization: Bearer header.
  const sessionId =
    typeof req.query.sessionId === 'string'
      ? req.query.sessionId
      : (req.headers.authorization ?? '').replace(/^Bearer /, '');

  if (!sessionId || !validateSession(sessionId)) {
    res.status(401).json({ error: 'Invalid or expired sessionId' });
    return;
  }

  // --- Build FOCUS payload from seed workloads ---
  const payload: FinioExport = {
    focusVersion: '1.1',
    generatedAt: new Date().toISOString(),
    rows: workloadsToFocusRows(WORKLOADS),
  };

  res.status(200).json(payload);
}

