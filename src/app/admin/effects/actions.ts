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
  const { error } = await supabase
    .from("posts")
    .update({ effects: clean })
    .eq("id", postId);

  if (error) return { ok: false, error: "저장 권한이 없거나 실패했습니다." };

  revalidatePath("/", "layout");
  return { ok: true };
}
