import { describe, it, expect, beforeEach } from "vitest";
import { bumpRate, resetRate, _clearAllRate } from "@/lib/rate-limit";

describe("bumpRate", () => {
  beforeEach(() => _clearAllRate());

  it("allows attempts under the cap and reports remaining", () => {
    const r1 = bumpRate("a@x", 1000);
    expect(r1.allowed).toBe(true);
    expect(r1.remainingAttempts).toBe(4);
    const r2 = bumpRate("a@x", 1100);
    expect(r2.allowed).toBe(true);
    expect(r2.remainingAttempts).toBe(3);
  });

  it("locks out after the cap is exceeded", () => {
    const t0 = 1000;
    for (let i = 0; i < 5; i++) bumpRate("b@x", t0 + i);
    const denied = bumpRate("b@x", t0 + 100);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("stays locked until the lock expires", () => {
    const t0 = 1000;
    for (let i = 0; i < 6; i++) bumpRate("c@x", t0);
    const during = bumpRate("c@x", t0 + 60 * 1000);
    expect(during.allowed).toBe(false);
    // Lock is 15 minutes; step past it and the window has also expired.
    const after = bumpRate("c@x", t0 + 16 * 60 * 1000);
    expect(after.allowed).toBe(true);
  });

  it("resets the window after 15 minutes of quiet", () => {
    bumpRate("d@x", 1000);
    const after = bumpRate("d@x", 1000 + 16 * 60 * 1000);
    expect(after.allowed).toBe(true);
    expect(after.remainingAttempts).toBe(4);
  });

  it("scopes state by key", () => {
    for (let i = 0; i < 5; i++) bumpRate("e@x", 1000 + i);
    const other = bumpRate("f@x", 1200);
    expect(other.allowed).toBe(true);
  });

  it("resetRate clears a key after success", () => {
    bumpRate("g@x", 1000);
    resetRate("g@x");
    const r = bumpRate("g@x", 1100);
    expect(r.remainingAttempts).toBe(4);
  });
});
