/**
 * In-memory sliding-window rate limiter (guidelines §8, §16, §20).
 *
 * Login is capped at 10 failed attempts per window per key (IP). Only
 * *failures* are counted, and a success resets the key, so a legitimate user
 * is never locked out by their own successful logins.
 *
 * Caveat: module-level state lives per serverless instance, so this is
 * best-effort across a horizontally-scaled deployment. Supabase Auth also
 * enforces its own server-side auth rate limits. For strict global limits,
 * back this with a shared store (e.g. Upstash/Postgres) — the class API is
 * store-agnostic on purpose. See README "Known limitations".
 */

export interface RateLimitResult {
  /** Whether another attempt is currently permitted. */
  allowed: boolean;
  /** Remaining attempts before lockout. */
  remaining: number;
  /** If not allowed, milliseconds until the oldest failure ages out. */
  retryAfterMs: number;
}

type Clock = () => number;

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: Clock = Date.now,
  ) {}

  private recent(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    const times = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (times.length) this.hits.set(key, times);
    else this.hits.delete(key);
    return times;
  }

  private result(times: number[]): RateLimitResult {
    const allowed = times.length < this.limit;
    const oldest = times[0] ?? this.now();
    return {
      allowed,
      remaining: Math.max(0, this.limit - times.length),
      retryAfterMs: allowed ? 0 : Math.max(0, oldest + this.windowMs - this.now()),
    };
  }

  /** Read current state without recording an attempt. */
  peek(key: string): RateLimitResult {
    return this.result(this.recent(key));
  }

  /** Record one failed attempt and return the resulting state. */
  fail(key: string): RateLimitResult {
    const times = this.recent(key);
    times.push(this.now());
    this.hits.set(key, times);
    return this.result(times);
  }

  /** Clear a key after a successful attempt. */
  reset(key: string): void {
    this.hits.delete(key);
  }
}

/** Login limiter: 10 failed attempts per 15 minutes per IP. */
export const LOGIN_MAX_ATTEMPTS = 10;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const loginRateLimiter = new RateLimiter(
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
);
