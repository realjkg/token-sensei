// Sliding-window rate limiter unit tests. Deterministic via an injected clock.

import { describe, it, expect } from 'vitest';
import { SlidingWindowRateLimiter } from './rateLimit';

describe('SlidingWindowRateLimiter', () => {
  it('allows requests under the limit and decrements remaining', () => {
    const limiter = new SlidingWindowRateLimiter(3, 60_000, () => 1000);
    expect(limiter.take('t').remaining).toBe(2);
    expect(limiter.take('t').remaining).toBe(1);
    const third = limiter.take('t');
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it('blocks with a Retry-After once the limit is exceeded', () => {
    const now = 1000;
    const limiter = new SlidingWindowRateLimiter(2, 60_000, () => now);
    limiter.take('t');
    limiter.take('t');
    const blocked = limiter.take('t');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('frees slots after the window elapses', () => {
    let now = 1000;
    const limiter = new SlidingWindowRateLimiter(1, 60_000, () => now);
    expect(limiter.take('t').allowed).toBe(true);
    expect(limiter.take('t').allowed).toBe(false);
    now += 60_001; // advance past the window
    expect(limiter.take('t').allowed).toBe(true);
  });

  it('keys independently per tenant', () => {
    const limiter = new SlidingWindowRateLimiter(1, 60_000, () => 1000);
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('b').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
  });
});

