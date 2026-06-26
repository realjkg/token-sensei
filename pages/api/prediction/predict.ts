// POST /api/prediction/predict — predict a proposed change's cost impact.
// Delegates to the mock client seam; pure over offline seed data. Mirrors the
// costsource route's thin shape.
//
// Errors:
//   400 — missing/invalid ProposedChange body
//   404 — unknown workload or model
//   405 — non-POST method
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPredictionClient } from '@/prediction';
import type { ChangePrediction, ProposedChange } from '@/prediction';

function statusForError(message: string): number {
  if (message.includes('Unknown')) return 404;
  return 500;
}

function isProposedChange(body: unknown): body is ProposedChange {
  return (
    typeof body === 'object' &&
    body !== null &&
    'type' in body &&
    'workloadId' in body
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChangePrediction | { error: string }>,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isProposedChange(req.body)) {
    res
      .status(400)
      .json({ error: 'A ProposedChange with `type` and `workloadId` is required' });
    return;
  }

  const client = createPredictionClient('mock');
  try {
    res.status(200).json(await client.predictChange(req.body));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(statusForError(message)).json({ error: message });
  }
}

