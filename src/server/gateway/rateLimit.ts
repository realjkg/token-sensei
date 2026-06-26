// Sliding-window rate limiter (Wave3b gateway). In-memory, keyed by tenant —
// adequate for this single-instance demo. NOTE: production behind multiple
// instances would key a shared store (Redis) instead; the interface is the same
// so swapping the backing store is the only change.
//
// Aligns with the repo's API-First rule (.obvious/obvious.md): 1,000 req/min
// standard tier. A window is the trailing `windowMs`; each accepted request
// records a timestamp and stale timestamps are pruned on every call.

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms at which the window frees the oldest slot. */
  resetMs: number;
  /** Seconds the caller should wait before retrying (0 when allowed). */
  retryAfterSec: number;
}

export const STANDARD_TIER_LIMIT = 1000;
export const WINDOW_MS = 60_000;

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number = STANDARD_TIER_LIMIT,
    private readonly windowMs: number = WINDOW_MS,
    // Injectable clock keeps the limiter deterministic under test.
    private readonly now: () => number = () => Date.now(),
  ) {}

  take(key: string): RateLimitResult {
    const now = this.now();
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      const resetMs = recent[0] + this.windowMs;
      return {
        allowed: false,
        limit: this.limit,
        remaining: 0,
        resetMs,
        retryAfterSec: Math.max(1, Math.ceil((resetMs - now) / 1000)),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return {
      allowed: true,
      limit: this.limit,
      remaining: this.limit - recent.length,
      resetMs: now + this.windowMs,
      retryAfterSec: 0,
    };
  }

  /** Drop a key's history — exposed for tests and future tenant resets. */
  reset(key: string): void {
    this.hits.delete(key);
  }
}

