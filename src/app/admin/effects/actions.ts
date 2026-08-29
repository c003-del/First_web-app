"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeEffects } from "@/lib/effects";

/**
 * Persist non-destructive effect parameters to a post (posts.effects JSONB).
 * Values are re-sanitized/clamped server-side; the write is RLS-gated to
 * admins at AAL2. The original media is never modified.
 */
export async function savePostEffects(
  postId: string,
  effects: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };
  if (!postId) return { ok: false, error: "게시물을 선택해 주세요." };

  const clean = sanitizeEffects(effects);
  // .select() with maybeSingle() proves a row actually updated — an UPDATE
  // that matches zero rows (deleted post, or RLS silently hides it) returns
  // no error and would otherwise be reported as success.
  const { data, error } = await supabase
    .from("posts")
    .update({ effects: clean })
    .eq("id", postId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "저장 권한이 없거나 실패했습니다." };
  if (!data) {
    return {
      ok: false,
      error: "게시물을 찾을 수 없거나 저장할 권한이 없습니다.",
    };
  }

  // Revalidate only the affected surfaces, not the whole site.
  revalidatePath(`/post/${postId}`);
  revalidatePath("/admin/effects");
  return { ok: true };
}
