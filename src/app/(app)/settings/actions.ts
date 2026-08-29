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

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: clean })
    .eq("id", user.id);

  if (error) return { ok: false, error: "저장 실패" };
  revalidatePath("/settings");
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
