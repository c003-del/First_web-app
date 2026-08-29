"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const VISIBILITIES = ["private", "family", "owner"] as const;
type Visibility = (typeof VISIBILITIES)[number];

function validVisibility(v: unknown): v is Visibility {
  return typeof v === "string" && (VISIBILITIES as readonly string[]).includes(v);
}

export async function updatePost(input: {
  id: string;
  title?: string;
  caption?: string | null;
  categoryId?: string | null;
  visibility?: Visibility;
  takenAt?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };
  if (!input.id) return { ok: false, error: "id가 필요합니다." };

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const t = input.title.trim().slice(0, 200);
    if (!t) return { ok: false, error: "제목을 비울 수 없습니다." };
    patch.title = t;
  }
  if (input.caption !== undefined) {
    patch.caption = input.caption?.trim().slice(0, 2000) || null;
  }
  if (input.categoryId !== undefined) {
    if (!input.categoryId) {
      return { ok: false, error: "카테고리를 선택해 주세요." };
    }
    patch.category_id = input.categoryId;
  }
  if (input.visibility !== undefined) {
    if (!validVisibility(input.visibility)) {
      return { ok: false, error: "잘못된 공개 대상입니다." };
    }
    patch.visibility = input.visibility;
  }
  if (input.takenAt !== undefined) patch.taken_at = input.takenAt || null;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { data, error } = await supabase
    .from("posts")
    .update(patch)
    .eq("id", input.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "저장 권한이 없습니다." };
  if (!data) return { ok: false, error: "게시물을 찾을 수 없습니다." };

  revalidatePath(`/post/${input.id}`);
  revalidatePath("/admin/posts");
  return { ok: true };
}

/**
 * Soft-delete: set deleted_at so the post disappears from listings without
 * destroying the underlying media. Physical deletion is a separate later step
 * (guidelines §15).
 */
export async function softDeletePost(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };
  if (!id) return { ok: false, error: "id가 필요합니다." };

  // Verify existence FIRST — the read policy hides posts with deleted_at set,
  // so after a successful UPDATE we can't see the row we just soft-deleted.
  const { data: existing, error: readErr } = await supabase
    .from("posts")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: "권한을 확인할 수 없습니다." };
  if (!existing) {
    return { ok: false, error: "이미 삭제되었거나 찾을 수 없습니다." };
  }

  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "삭제 권한이 없습니다." };

  revalidatePath("/", "layout");
  return { ok: true };
}
