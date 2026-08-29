import { describe, it, expect } from "vitest";
import { applyPreset, PRESET_VALUES } from "@/lib/effect-presets";
import { DEFAULT_EFFECTS, PRESETS, sanitizeEffects } from "@/lib/effects";

describe("applyPreset", () => {
  it("Original returns neutral defaults with the id", () => {
    expect(applyPreset("Original")).toEqual({
      ...DEFAULT_EFFECTS,
      presetId: "Original",
    });
  });

  it("Mono desaturates fully", () => {
    expect(applyPreset("Mono").saturation).toBe(-100);
  });

  it("stamps the presetId", () => {
    for (const id of PRESETS) {
      expect(applyPreset(id).presetId).toBe(id);
    }
  });

  it("produces values that survive server sanitize unchanged", () => {
    for (const id of PRESETS) {
      const applied = applyPreset(id);
      expect(sanitizeEffects(applied)).toEqual(applied);
    }
  });

  it("every preset override key is a valid effect field", () => {
    const valid = new Set(Object.keys(DEFAULT_EFFECTS));
    for (const partial of Object.values(PRESET_VALUES)) {
      for (const key of Object.keys(partial)) {
        expect(valid.has(key)).toBe(true);
      }
    }
  });
});
