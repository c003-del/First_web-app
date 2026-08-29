/**
 * Non-destructive media effects (guidelines §14).
 *
 * Effects are stored as parameters (JSON), never baked into the original.
 * Every value is clamped to a known range on both client and server.
 */

export interface MediaEffects {
  version: 1;
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  vignette: number;
  grain: number;
  blur: number;
  sharpen: number;
  bloom: number;
  presetId?: string;
}

type Range = { min: number; max: number; default: number };

/** Allowed ranges for each numeric parameter (unitless, -100..100 style). */
export const EFFECT_RANGES: Record<
  Exclude<keyof MediaEffects, "version" | "presetId">,
  Range
> = {
  exposure: { min: -100, max: 100, default: 0 },
  contrast: { min: -100, max: 100, default: 0 },
  saturation: { min: -100, max: 100, default: 0 },
  temperature: { min: -100, max: 100, default: 0 },
  tint: { min: -100, max: 100, default: 0 },
  highlights: { min: -100, max: 100, default: 0 },
  shadows: { min: -100, max: 100, default: 0 },
  vignette: { min: 0, max: 100, default: 0 },
  grain: { min: 0, max: 100, default: 0 },
  blur: { min: 0, max: 100, default: 0 },
  sharpen: { min: 0, max: 100, default: 0 },
  bloom: { min: 0, max: 100, default: 0 },
};

export const DEFAULT_EFFECTS: MediaEffects = {
  version: 1,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  vignette: 0,
  grain: 0,
  blur: 0,
  sharpen: 0,
  bloom: 0,
};

export const PRESETS = [
  "Original",
  "Cream",
  "Airy",
  "Soft Film",
  "Pastel",
  "Golden",
  "Mono",
] as const;

export type PresetId = (typeof PRESETS)[number];

function clamp(value: number, { min, max }: Range): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

/**
 * Validate & clamp arbitrary input into a safe MediaEffects object.
 * Runs on the server before persisting (never trust client values).
 */
export function sanitizeEffects(input: unknown): MediaEffects {
  const src = (input ?? {}) as Record<string, unknown>;
  const out: MediaEffects = { ...DEFAULT_EFFECTS };
  for (const key of Object.keys(EFFECT_RANGES) as Array<
    keyof typeof EFFECT_RANGES
  >) {
    const raw = src[key];
    if (typeof raw === "number") {
      out[key] = clamp(raw, EFFECT_RANGES[key]);
    }
  }
  if (typeof src.presetId === "string" && (PRESETS as readonly string[]).includes(src.presetId)) {
    out.presetId = src.presetId;
  }
  return out;
}

/**
 * Approximate CSS filter string for cheap, non-WebGL previews (gallery cards,
 * reduced-capability devices). The real editor uses a WebGL shader for the
 * exact look; this is a faithful-enough fallback.
 */
export function effectsToCssFilter(e: MediaEffects): string {
  const brightness = 1 + e.exposure / 200;
  const contrast = 1 + e.contrast / 200;
  const saturate = 1 + e.saturation / 150;
  const blurPx = e.blur / 20;
  const sepia = e.temperature > 0 ? e.temperature / 300 : 0;
  const parts = [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${saturate.toFixed(3)})`,
  ];
  if (blurPx > 0) parts.push(`blur(${blurPx.toFixed(2)}px)`);
  if (sepia > 0) parts.push(`sepia(${sepia.toFixed(3)})`);
  return parts.join(" ");
}
