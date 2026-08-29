"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(
  displayName: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const clean = displayName.trim().slice(0, 40);
  if (!clean) return { ok: false, error: "이름을 비울 수 없습니다." };

  // Upsert so a not-yet-provisioned profile row (auth trigger race) is
  // created rather than silently updating zero rows.
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: clean }, { onConflict: "id" })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "저장 실패" };
  if (!data) return { ok: false, error: "저장 결과를 확인할 수 없습니다." };
  revalidatePath("/settings");
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
