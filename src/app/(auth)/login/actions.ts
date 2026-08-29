"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bumpRate, resetRate } from "@/lib/rate-limit";

/**
 * Server-side login with rate limiting.
 *
 * Rate limiting runs BEFORE the auth call so a bot can't drain Supabase-side
 * quotas or oracle-attack accounts. Buckets are keyed by (client IP + email)
 * so a shared network doesn't lock everyone out over one bad password.
 *
 * Error messages are deliberately generic — never leak whether an account
 * exists (guidelines §20).
 */

export interface LoginResult {
  ok: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

async function clientIpAsync(): Promise<string> {
  const hh = await headers();
  const xff = hh.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return hh.get("x-real-ip") ?? "unknown";
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  // Basic input shape check — a client can send anything, so validate here.
  if (!email || !password || email.length > 320 || password.length > 200) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const supabase = await createClient();
  if (!supabase) {
    // Demo mode: login is unavailable.
    return { ok: false, error: "Supabase가 연결되지 않았습니다." };
  }

  const ip = await clientIpAsync();
  const key = `login:${ip}:${email}`;
  const gate = bumpRate(key);
  if (!gate.allowed) {
    return {
      ok: false,
      error: `잠시 후 다시 시도해 주세요.`,
      retryAfterSeconds: gate.retryAfterSeconds,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    // Keep the counter bumped; never disclose whether the account exists.
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  resetRate(key);
  redirect("/mfa/verify");
}
