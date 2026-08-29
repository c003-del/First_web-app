/**
 * Per-key fixed-window rate limiter (in-memory, size-capped).
 *
 * Suitable for MVP and single-instance deployments. Because state lives in the
 * process, it does NOT protect across a horizontally-scaled fleet or across
 * container restarts. For production hardening on Vercel/multi-instance,
 * replace with a persistent store (e.g., a `login_attempts` table with a
 * service-role client, or an external KV store).
 *
 * The window is FIXED (resets when `now - firstAt > WINDOW_MS`), not sliding —
 * anyone tuning limits or replacing this implementation should size accordingly.
 * The map is capped and swept periodically so bot fuzzing with rotating keys
 * can't grow it unbounded.
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
const MAX_BUCKETS = 10_000; // hard cap; oldest are evicted first
const SWEEP_EVERY = 500; // sweep every N calls

let callsSinceSweep = 0;

function sweep(now: number): void {
  // Drop expired entries: past the window AND any lock has cleared.
  for (const [k, v] of buckets) {
    const windowExpired = now - v.firstAt > WINDOW_MS;
    const lockExpired = !v.lockedUntil || v.lockedUntil <= now;
    if (windowExpired && lockExpired) buckets.delete(k);
  }
  // Still too big? Evict oldest by insertion order (Map iterates in that order).
  if (buckets.size > MAX_BUCKETS) {
    const toDrop = buckets.size - MAX_BUCKETS;
    let i = 0;
    for (const k of buckets.keys()) {
      if (i++ >= toDrop) break;
      buckets.delete(k);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller may retry (only when allowed=false). */
  retryAfterSeconds?: number;
  remainingAttempts?: number;
}

/**
 * Check + record an attempt against `key`. Call BEFORE the expensive action.
 * Returns `allowed:false` if the caller is already locked out.
 */
export function bumpRate(key: string, now: number = Date.now()): RateLimitResult {
  if (++callsSinceSweep >= SWEEP_EVERY) {
    callsSinceSweep = 0;
    sweep(now);
  }

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

/** Clear the bucket after a successful attempt. Also clears any lockout. */
export function resetRate(key: string): void {
  buckets.delete(key);
}

/** Peek at the current state without bumping (for a two-phase check pattern). */
export function peekRate(key: string, now: number = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket) return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  if (bucket.lockedUntil && bucket.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
    };
  }
  if (now - bucket.firstAt > WINDOW_MS) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - bucket.count),
  };
}

/** Test helper (not exported from lib index). */
export function _clearAllRate(): void {
  buckets.clear();
  callsSinceSweep = 0;
}
