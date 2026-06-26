// /api/v1/ai/chat route tests — exercises the gateway-wrapped handler end to end
// with a fake req/res. Lives under src/ (NOT pages/) so Next never compiles it
// into a deployed route. The mock provider path needs no keys or network.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/v1/ai/chat';

const ENV_KEYS = [
  'AI_PROVIDER',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'OPENLLM_BASE_URL',
  'OPENLLM_MODEL',
  'RATIO_API_TOKEN',
] as const;

let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function makeRes(): NextApiResponse & { statusCode: number; body: unknown; headers: Record<string, string> } {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    headersSent: false,
    setHeader(key: string, value: string | number) {
      res.headers[key.toLowerCase()] = String(value);
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      res.headersSent = true;
      return res;
    },
  };
  return res as unknown as NextApiResponse & {
    statusCode: number;
    body: unknown;
    headers: Record<string, string>;
  };
}

function makeReq(opts: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): NextApiRequest {
  return {
    method: opts.method ?? 'POST',
    url: '/api/v1/ai/chat',
    headers: opts.headers ?? {},
    body: opts.body,
  } as unknown as NextApiRequest;
}

const context = {
  initiatives: [
    {
      id: 'i1',
      name: 'GPT Summarizer',
      monthlyCost: 50000,
      annualRunRate: 600000,
      budgetConsumedPct: 85,
      status: 'At Risk',
      valueRatio: 2.1,
      savingsOpportunity: 8000,
    },
  ],
  summary: {
    totalMonthlySpend: 50000,
    projectedSavings: 8000,
    initiativesActive: 1,
    pendingApproval: 0,
  },
  asOf: '2026-06-26T00:00:00.000Z',
};
const validBody = {
  messages: [{ role: 'user', content: 'Which initiatives are at risk?' }],
  context,
};

describe('/api/v1/ai/chat', () => {
  it('answers via the offline mock provider with no env set', async () => {
    const res = makeRes();
    await handler(makeReq({ body: validBody }), res);
    expect(res.statusCode).toBe(200);
    const payload = res.body as {
      provider: string;
      message: { role: string; content: string };
      initiativesReferenced: string[];
    };
    expect(payload.provider).toBe('mock');
    expect(payload.message.role).toBe('assistant');
    expect(payload.initiativesReferenced).toContain('i1');
  });

  it('returns 405 on a non-POST method (gateway method guard)', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET', body: validBody }), res);
    expect(res.statusCode).toBe(405);
  });

  it('returns 400 on an invalid body (gateway validation)', async () => {
    const res = makeRes();
    await handler(makeReq({ body: { messages: [] } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('invalid_request');
  });

  it('returns 422 when AI_PROVIDER=claude but the key is missing (authenticated)', async () => {
    // Live provider selected → the gateway enforces auth, so configure + present
    // a token; the handler then surfaces the missing-key 422 before any LLM call.
    process.env.RATIO_API_TOKEN = 'secret';
    process.env.AI_PROVIDER = 'claude';
    const res = makeRes();
    await handler(
      makeReq({ headers: { authorization: 'Bearer secret' }, body: validBody }),
      res,
    );
    expect(res.statusCode).toBe(422);
    expect((res.body as { error: { code: string; message: string } }).error.message).toContain(
      'ANTHROPIC_API_KEY',
    );
  });

  it('returns 401 when a live provider is selected without a token', async () => {
    process.env.AI_PROVIDER = 'claude'; // enforce auth, but no RATIO_API_TOKEN
    const res = makeRes();
    await handler(makeReq({ body: validBody }), res);
    expect(res.statusCode).toBe(401);
  });
});

