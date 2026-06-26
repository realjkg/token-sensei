// withGateway integration tests — the guard chain in isolation with a trivial
// handler. Covers method guard, auth pass/fail, the offline mock bypass, input
// validation, and the rate-limit 429 path. Lives under src/ so Next never
// compiles it as a deployed route (the Wave2b lesson).

import { describe, it, expect } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withGateway, type GatewayHandler } from './withGateway';
import { SlidingWindowRateLimiter } from './rateLimit';

interface FakeRes {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  headersSent: boolean;
}

function makeRes(): NextApiResponse & FakeRes {
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
  return res as unknown as NextApiResponse & FakeRes;
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

const okHandler: GatewayHandler = (_req, res) => {
  res.status(200).json({ ok: true });
};

const noopLogger = () => {};
const acceptBody = () => ({ ok: true }) as const;

function errorBody(res: NextApiResponse & FakeRes): { code: string; message: string } {
  return (res.body as { error: { code: string; message: string } }).error;
}

describe('withGateway', () => {
  it('returns 405 on a disallowed method', async () => {
    const handler = withGateway(okHandler, {
      methods: ['POST'],
      env: {},
      logger: noopLogger,
      limiter: new SlidingWindowRateLimiter(),
    });
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
    expect(errorBody(res).code).toBe('method_not_allowed');
    expect(res.headers.allow).toBe('POST');
  });

  it('bypasses auth for the offline mock (no token, mock provider)', async () => {
    const handler = withGateway(okHandler, {
      env: {}, // no RATIO_API_TOKEN, AI_PROVIDER unset → mock
      logger: noopLogger,
      limiter: new SlidingWindowRateLimiter(),
      validateBody: acceptBody,
    });
    const res = makeRes();
    await handler(makeReq({ body: { valid: true } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects a missing token with 401 when a token is configured', async () => {
    const handler = withGateway(okHandler, {
      env: { RATIO_API_TOKEN: 'secret' },
      logger: noopLogger,
      limiter: new SlidingWindowRateLimiter(),
    });
    const res = makeRes();
    await handler(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(401);
    expect(errorBody(res).code).toBe('unauthorized');
  });

  it('rejects an invalid token with 401', async () => {
    const handler = withGateway(okHandler, {
      env: { RATIO_API_TOKEN: 'secret' },
      logger: noopLogger,
      limiter: new SlidingWindowRateLimiter(),
    });
    const res = makeRes();
    await handler(makeReq({ headers: { authorization: 'Bearer wrong' }, body: {} }), res);
    expect(res.statusCode).toBe(401);
  });

  it('accepts a valid token', async () => {
    const handler = withGateway(okHandler, {
      env: { RATIO_API_TOKEN: 'secret' },
      logger: noopLogger,
      limiter: new SlidingWindowRateLimiter(),
      validateBody: acceptBody,
    });
    const res = makeRes();
    await handler(
      makeReq({ headers: { authorization: 'Bearer secret' }, body: { valid: true } }),
      res,
    );
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 with a structured envelope on invalid body', async () => {
    const handler = withGateway(okHandler, {
      env: {},
      logger: noopLogger,
      limiter: new SlidingWindowRateLimiter(),
      validateBody: (body) =>
        body && (body as { valid?: boolean }).valid
          ? { ok: true }
          : { ok: false, message: 'bad body' },
    });
    const res = makeRes();
    await handler(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(errorBody(res).code).toBe('invalid_request');
    expect(errorBody(res).message).toBe('bad body');
  });

  it('returns 429 with Retry-After once the rate limit is exceeded', async () => {
    const handler = withGateway(okHandler, {
      env: {},
      logger: noopLogger,
      limiter: new SlidingWindowRateLimiter(1, 60_000, () => 1000),
      validateBody: acceptBody,
    });
    const first = makeRes();
    await handler(makeReq({ body: { valid: true } }), first);
    expect(first.statusCode).toBe(200);
    expect(first.headers['x-ratelimit-limit']).toBe('1');

    const second = makeRes();
    await handler(makeReq({ body: { valid: true } }), second);
    expect(second.statusCode).toBe(429);
    expect(errorBody(second).code).toBe('rate_limited');
    expect(second.headers['retry-after']).toBeDefined();
    expect(second.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('returns a 500 envelope (no stack trace) when the handler throws', async () => {
    const throwing: GatewayHandler = () => {
      throw new Error('boom');
    };
    const handler = withGateway(throwing, {
      env: {},
      logger: noopLogger,
      limiter: new SlidingWindowRateLimiter(),
      validateBody: acceptBody,
    });
    const res = makeRes();
    await handler(makeReq({ body: { valid: true } }), res);
    expect(res.statusCode).toBe(500);
    expect(errorBody(res)).toEqual({ code: 'internal_error', message: 'boom' });
  });
});

