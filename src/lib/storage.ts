import type { SupabaseClient } from "@supabase/supabase-js";

/** Private media bucket. Access is via short-lived signed URLs only. */
export const MEDIA_BUCKET = "private-media";

/** Display URL lifetime. Long enough to view a post/lightbox comfortably. */
export const DISPLAY_URL_TTL = 60 * 60; // 1 hour

/** Single-site deployment id used as the top storage segment. */
export const SITE_ID = "default";

/**
 * Batch-create signed URLs for a set of storage paths. Returns a Map from path
 * to signed URL; paths that fail are simply absent. Never persist these.
 */
export async function signPaths(
  supabase: SupabaseClient,
  paths: string[],
  expiresIn: number = DISPLAY_URL_TTL,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return out;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(unique, expiresIn);
  if (error || !data) return out;

  for (const row of data) {
    if (row.signedUrl && row.path) out.set(row.path, row.signedUrl);
  }
  return out;
}
