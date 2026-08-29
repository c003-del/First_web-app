import { describe, it, expect } from "vitest";
import { normalizeSlug, isReservedSlug, isValidSlug } from "@/lib/slug";

describe("normalizeSlug", () => {
  it("lowercases ascii and hyphenates separators", () => {
    expect(normalizeSlug("My Travel Photos")).toBe("my-travel-photos");
    expect(normalizeSlug("  spaced  out  ")).toBe("spaced-out");
    expect(normalizeSlug("a__b--c")).toBe("a-b-c");
  });
  it("keeps unicode letters (Korean)", () => {
    expect(normalizeSlug("여행 사진")).toBe("여행-사진");
  });
  it("strips quotes and trailing separators", () => {
    expect(normalizeSlug("O'Brien's")).toBe("obriens");
    expect(normalizeSlug("-edge-")).toBe("edge");
  });
});

describe("isReservedSlug", () => {
  it("flags reserved route segments", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("family")).toBe(true);
    expect(isReservedSlug("holiday")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it("rejects empty, reserved, or non-normalized", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("admin")).toBe(false);
    expect(isValidSlug("Not Normalized")).toBe(false);
    expect(isValidSlug("good-slug")).toBe(true);
    expect(isValidSlug("여행-사진")).toBe(true);
  });
});
