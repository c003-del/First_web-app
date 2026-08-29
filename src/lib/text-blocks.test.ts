import { describe, it, expect } from "vitest";
import { TEXT_BLOCK_KEY_RE, MAX_TEXT_BYTES } from "@/lib/text-blocks";

describe("text_block key regex", () => {
  it("accepts dotted lowercase keys", () => {
    expect(TEXT_BLOCK_KEY_RE.test("home.hero.headline")).toBe(true);
    expect(TEXT_BLOCK_KEY_RE.test("footer.copyright")).toBe(true);
    expect(TEXT_BLOCK_KEY_RE.test("a")).toBe(true);
  });
  it("rejects spaces, uppercase, and unicode", () => {
    expect(TEXT_BLOCK_KEY_RE.test("Home.Hero.Headline")).toBe(false);
    expect(TEXT_BLOCK_KEY_RE.test("home hero")).toBe(false);
    expect(TEXT_BLOCK_KEY_RE.test("홈")).toBe(false);
  });
  it("rejects empty and overlong keys", () => {
    expect(TEXT_BLOCK_KEY_RE.test("")).toBe(false);
    expect(TEXT_BLOCK_KEY_RE.test("a".repeat(81))).toBe(false);
  });
  it("byte cap is a positive integer", () => {
    expect(MAX_TEXT_BYTES).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_TEXT_BYTES)).toBe(true);
  });
});
