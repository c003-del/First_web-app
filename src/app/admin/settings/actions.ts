"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidSlug, normalizeSlug } from "@/lib/slug";

/**
 * Site-wide settings (guidelines §18): site name, owner display label + slug,
 * copyright text. RLS-gated to admins at AAL2.
 */
export async function saveSiteSettings(input: {
  siteName?: string;
  ownerLabel?: string;
  ownerSlug?: string;
  copyright?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };

  const patch: Record<string, string> = {};
  if (input.siteName !== undefined) {
    const v = input.siteName.trim();
    if (!v) return { ok: false, error: "사이트명을 비울 수 없습니다." };
    patch.site_name = v.slice(0, 80);
  }
  if (input.ownerLabel !== undefined) {
    const v = input.ownerLabel.trim();
    if (!v) return { ok: false, error: "표시 이름을 비울 수 없습니다." };
    patch.owner_label = v.slice(0, 40);
  }
  if (input.ownerSlug !== undefined) {
    const s = normalizeSlug(input.ownerSlug);
    if (!isValidSlug(s)) return { ok: false, error: "사용할 수 없는 slug입니다." };
    patch.owner_slug = s;
  }
  if (input.copyright !== undefined) {
    const c = input.copyright.trim();
    if (!c) return { ok: false, error: "저작권 문구를 비울 수 없습니다." };
    patch.copyright = c.slice(0, 200);
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const { data, error } = await supabase
    .from("site_settings")
    .update(patch)
    .eq("id", 1)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "저장 권한이 없습니다." };
  if (!data) return { ok: false, error: "사이트 설정 행이 없습니다." };

  revalidatePath("/", "layout");
  return { ok: true };
}
