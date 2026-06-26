// GET /api/costsource/sources — lists configured cost sources.
// Thin Next.js route delegating to the mock client seam, mirroring
// pages/api/tokenomics.ts so mock and live behave identically.
//
// Errors: 405 — non-GET method.
import type { NextApiRequest, NextApiResponse } from 'next';
import { createCostSourceClient } from '@/costsource';
import type { CostSourceDescriptor } from '@/costsource';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CostSourceDescriptor[] | { error: string }>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const client = createCostSourceClient('mock');
  res.status(200).json(await client.listSources());
}

