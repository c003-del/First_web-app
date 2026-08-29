import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limit";

/** Test clock we can advance deterministically. */
function fakeClock(start = 0) {
  let t = start;
  const now = () => t;
  const advance = (ms: number) => {
    t += ms;
  };
  return { now, advance };
}

describe("RateLimiter", () => {
  it("allows attempts up to the limit, then blocks", () => {
    const clock = fakeClock();
    const rl = new RateLimiter(3, 1000, clock.now);

    expect(rl.peek("ip").allowed).toBe(true);
    rl.fail("ip");
    rl.fail("ip");
    expect(rl.peek("ip").allowed).toBe(true); // 2 failures < 3
    expect(rl.peek("ip").remaining).toBe(1);
    rl.fail("ip");
    expect(rl.peek("ip").allowed).toBe(false); // 3 failures == limit
    expect(rl.peek("ip").remaining).toBe(0);
  });

  it("reports retryAfterMs until the oldest failure ages out", () => {
    const clock = fakeClock();
    const rl = new RateLimiter(1, 1000, clock.now);
    rl.fail("ip");
    expect(rl.peek("ip").allowed).toBe(false);
    expect(rl.peek("ip").retryAfterMs).toBe(1000);
    clock.advance(400);
    expect(rl.peek("ip").retryAfterMs).toBe(600);
  });

  it("frees up attempts once the window passes", () => {
    const clock = fakeClock();
    const rl = new RateLimiter(2, 1000, clock.now);
    rl.fail("ip");
    rl.fail("ip");
    expect(rl.peek("ip").allowed).toBe(false);
    clock.advance(1001);
    expect(rl.peek("ip").allowed).toBe(true);
    expect(rl.peek("ip").remaining).toBe(2);
  });

  it("reset clears a key immediately (e.g. on successful login)", () => {
    const clock = fakeClock();
    const rl = new RateLimiter(2, 1000, clock.now);
    rl.fail("ip");
    rl.fail("ip");
    expect(rl.peek("ip").allowed).toBe(false);
    rl.reset("ip");
    expect(rl.peek("ip").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const clock = fakeClock();
    const rl = new RateLimiter(1, 1000, clock.now);
    rl.fail("a");
    expect(rl.peek("a").allowed).toBe(false);
    expect(rl.peek("b").allowed).toBe(true);
  });
});
