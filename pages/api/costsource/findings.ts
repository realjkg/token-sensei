// GET /api/costsource/findings?sourceId= — waste/opportunity findings.
// Delegates to the mock client seam. Pure over seed data — no external calls.
//
// Errors:
//   400 — missing sourceId
//   404 — unknown source
//   405 — non-GET method
import type { NextApiRequest, NextApiResponse } from 'next';
import { createCostSourceClient } from '@/costsource';
import type { CostFinding } from '@/costsource';

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CostFinding[] | { error: string }>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const sourceId = firstQueryValue(req.query.sourceId);
  if (!sourceId) {
    res.status(400).json({ error: 'sourceId query param is required' });
    return;
  }

  const client = createCostSourceClient('mock');
  try {
    res.status(200).json(await client.fetchFindings(sourceId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(message.includes('Unknown') ? 404 : 500).json({ error: message });
  }
}

