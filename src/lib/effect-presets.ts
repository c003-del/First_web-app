import type { MediaEffects, PresetId } from "@/lib/effects";
import { DEFAULT_EFFECTS } from "@/lib/effects";

/**
 * Preset parameter sets (guidelines §14). Each preset overrides a subset of the
 * defaults; unспecified params stay neutral. Applying a preset is a starting
 * point the user can then fine-tune — always non-destructive.
 */
export const PRESET_VALUES: Record<PresetId, Partial<MediaEffects>> = {
  Original: {},
  Cream: { temperature: 12, saturation: -8, exposure: 6, shadows: 10, vignette: 8 },
  Airy: { exposure: 14, contrast: -6, saturation: -4, highlights: 10 },
  "Soft Film": {
    contrast: 10,
    saturation: -6,
    grain: 22,
    vignette: 14,
    temperature: 6,
  },
  Pastel: { saturation: -18, exposure: 8, contrast: -8, tint: 6 },
  Golden: { temperature: 28, exposure: 6, saturation: 8, vignette: 10 },
  Mono: { saturation: -100, contrast: 12, grain: 14 },
};

/** Build a full effects object from a preset. */
export function applyPreset(presetId: PresetId): MediaEffects {
  return { ...DEFAULT_EFFECTS, ...PRESET_VALUES[presetId], presetId };
}
