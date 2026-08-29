/**
 * Per-key sliding-window rate limiter (in-memory).
 *
 * Suitable for MVP and single-instance deployments. Because state lives in the
 * process, it does NOT protect across a horizontally-scaled fleet or across
 * container restarts. For production hardening on Vercel/multi-instance,
 * replace `bump` with a persistent store (e.g., a `login_attempts` table with
 * a service-role client, or an external KV store).
 */

interface Entry {
  count: number;
  firstAt: number;
  lockedUntil: number | null;
}

const buckets = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 minutes

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller may retry (only when allowed=false). */
  retryAfterSeconds?: number;
  remainingAttempts?: number;
}

/** Check + record an attempt against `key`. Call BEFORE the expensive action. */
export function bumpRate(key: string, now: number = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);

  if (bucket?.lockedUntil && bucket.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
    };
  }

  // Reset the window if it has expired.
  if (!bucket || now - bucket.firstAt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAt: now, lockedUntil: null });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  const nextCount = bucket.count + 1;
  bucket.count = nextCount;

  if (nextCount > MAX_ATTEMPTS) {
    bucket.lockedUntil = now + LOCK_MS;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(LOCK_MS / 1000),
    };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - nextCount };
}

/** Clear the bucket after a successful attempt. */
export function resetRate(key: string): void {
  buckets.delete(key);
}

/** Test helper (not exported from lib index). */
export function _clearAllRate(): void {
  buckets.clear();
}
