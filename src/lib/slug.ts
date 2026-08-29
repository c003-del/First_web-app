import { RESERVED_SLUGS } from "@/lib/config";

/**
 * Normalize a user-provided string into a URL-safe slug.
 * Keeps unicode letters/numbers (so Korean category names work), lowercases
 * ASCII, and collapses everything else to single hyphens.
 */
export function normalizeSlug(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** A slug is valid if it is non-empty, normalized, and not reserved. */
export function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  if (isReservedSlug(slug)) return false;
  return normalizeSlug(slug) === slug;
}
