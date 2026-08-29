"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_TEXT_BYTES = 5_000;

/**
 * Upsert a plain-text block by key. Values are stored as-is (no HTML) and
 * rendered by React with auto-escaping. RLS-gated to admins at AAL2.
 */
export async function saveTextBlock(
  key: string,
  value: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };

  const trimmedKey = key.trim();
  if (!/^[a-z0-9._-]{1,80}$/.test(trimmedKey)) {
    return { ok: false, error: "잘못된 키입니다." };
  }
  const cleanValue = value ?? "";
  if (new TextEncoder().encode(cleanValue).byteLength > MAX_TEXT_BYTES) {
    return { ok: false, error: `내용이 너무 깁니다. (최대 ${MAX_TEXT_BYTES}바이트)` };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("text_blocks")
    .upsert({
      key: trimmedKey,
      value: cleanValue,
      updated_by: user?.id ?? null,
    });

  if (error) return { ok: false, error: "저장 권한이 없습니다." };

  revalidatePath("/", "layout");
  return { ok: true };
}
