import { describe, it, expect } from "vitest";
import {
  sanitizeEffects,
  effectsToCssFilter,
  DEFAULT_EFFECTS,
} from "@/lib/effects";

describe("sanitizeEffects", () => {
  it("returns defaults for empty/invalid input", () => {
    expect(sanitizeEffects(undefined)).toEqual(DEFAULT_EFFECTS);
    expect(sanitizeEffects(null)).toEqual(DEFAULT_EFFECTS);
    expect(sanitizeEffects("nope")).toEqual(DEFAULT_EFFECTS);
  });

  it("clamps out-of-range values", () => {
    const e = sanitizeEffects({ exposure: 9999, vignette: -50, blur: 500 });
    expect(e.exposure).toBe(100);
    expect(e.vignette).toBe(0); // min 0
    expect(e.blur).toBe(100);
  });

  it("keeps valid values and drops unknown keys", () => {
    const e = sanitizeEffects({ contrast: 25, hacker: "x", exposure: -10 });
    expect(e.contrast).toBe(25);
    expect(e.exposure).toBe(-10);
    expect((e as unknown as Record<string, unknown>).hacker).toBeUndefined();
  });

  it("accepts a known preset and rejects an unknown one", () => {
    expect(sanitizeEffects({ presetId: "Cream" }).presetId).toBe("Cream");
    expect(sanitizeEffects({ presetId: "Evil" }).presetId).toBeUndefined();
  });

  it("coerces NaN to 0", () => {
    expect(sanitizeEffects({ exposure: NaN }).exposure).toBe(0);
  });
});

describe("effectsToCssFilter", () => {
  it("produces a filter string with base adjustments", () => {
    const f = effectsToCssFilter(DEFAULT_EFFECTS);
    expect(f).toContain("brightness(");
    expect(f).toContain("contrast(");
    expect(f).toContain("saturate(");
  });
  it("adds blur only when set", () => {
    expect(effectsToCssFilter(DEFAULT_EFFECTS)).not.toContain("blur(");
    expect(effectsToCssFilter({ ...DEFAULT_EFFECTS, blur: 40 })).toContain(
      "blur(",
    );
  });
});
