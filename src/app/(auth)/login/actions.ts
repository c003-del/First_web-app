"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { loginRateLimiter } from "@/lib/rate-limit";

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "locked"; message: string }
  | { status: "success" };

async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Server-side login (guidelines §8, §16, §20). Enforces the 10-failed-attempt
 * limit *before* touching Supabase, counts only failures, and resets on
 * success. Error messages never reveal whether an account exists.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "데모 모드에서는 로그인할 수 없습니다." };
  }

  const key = await clientKey();
  const gate = loginRateLimiter.peek(key);
  if (!gate.allowed) {
    const mins = Math.ceil(gate.retryAfterMs / 60000);
    return {
      status: "locked",
      message: `로그인 시도가 너무 많습니다. 약 ${mins}분 후 다시 시도해 주세요.`,
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { status: "error", message: "이메일과 비밀번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { status: "error", message: "데모 모드에서는 로그인할 수 없습니다." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const after = loginRateLimiter.fail(key);
    if (!after.allowed) {
      const mins = Math.ceil(after.retryAfterMs / 60000);
      return {
        status: "locked",
        message: `로그인 시도가 너무 많습니다. 약 ${mins}분 후 다시 시도해 주세요.`,
      };
    }
    // Generic message — never disclose whether the account exists (§20).
    return {
      status: "error",
      message: `이메일 또는 비밀번호가 올바르지 않습니다. (남은 시도 ${after.remaining}회)`,
    };
  }

  loginRateLimiter.reset(key);
  return { status: "success" };
}
