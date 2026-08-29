/**
 * Central runtime configuration.
 *
 * Supabase env vars are optional at build time so the app compiles and runs a
 * "demo mode" before a project is connected. `isSupabaseConfigured()` gates any
 * code path that would otherwise crash without real credentials.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/**
 * Site-level defaults. These are overridden at runtime by the `site_settings`
 * row once the database is connected (see docs/DEVELOPMENT_GUIDELINES.md §19).
 */
export const SITE_DEFAULTS = {
  siteName: "우리 가족 아카이브",
  ownerLabel: "수진", // the owner's category name — editable in /admin
  ownerSlug: "sujin",
  copyright: "우리 가족 아카이브",
} as const;

/** Route segments that may never be used as a user (owner) slug. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "login",
  "logout",
  "mfa",
  "family",
  "post",
  "settings",
  "api",
  "auth",
  "recovery",
  "_next",
  "favicon.ico",
]);
