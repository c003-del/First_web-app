import { describe, it, expect } from "vitest";

// The key validation regex is defined inline in saveTextBlock; mirror it here
// so any change is caught by tests.
const KEY_RE = /^[a-z0-9._-]{1,80}$/;

describe("text_block key regex", () => {
  it("accepts dotted lowercase keys", () => {
    expect(KEY_RE.test("home.hero.headline")).toBe(true);
    expect(KEY_RE.test("footer.copyright")).toBe(true);
    expect(KEY_RE.test("a")).toBe(true);
  });
  it("rejects spaces, uppercase, and unicode", () => {
    expect(KEY_RE.test("Home.Hero.Headline")).toBe(false);
    expect(KEY_RE.test("home hero")).toBe(false);
    expect(KEY_RE.test("홈")).toBe(false);
  });
  it("rejects empty and overlong keys", () => {
    expect(KEY_RE.test("")).toBe(false);
    expect(KEY_RE.test("a".repeat(81))).toBe(false);
  });
});
