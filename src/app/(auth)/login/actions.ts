"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bumpRate, peekRate, resetRate } from "@/lib/rate-limit";

/**
 * Server-side login with rate limiting.
 *
 * Threat model:
 *  - Attacker knows a target email and password-sprays: we lock the account's
 *    bucket after 5 failures. We PEEK the bucket first and bump ONLY on a
 *    failed auth, so a shared-NAT user with the correct password doesn't
 *    consume attempts an attacker has already spent.
 *  - Attacker spoofs x-forwarded-for to rotate their apparent IP: on a trusted
 *    proxy we accept XFF[0]; otherwise we ignore it entirely and key the
 *    bucket on email alone. Set TRUST_PROXY=1 on Vercel/behind a proxy that
 *    overwrites XFF.
 *
 * Error messages are deliberately generic — never leak whether an account
 * exists (guidelines §20).
 */

export interface LoginResult {
  ok: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

const TRUST_PROXY = process.env.TRUST_PROXY === "1";

async function clientIpAsync(): Promise<string> {
  if (!TRUST_PROXY) return "untrusted";
  const hh = await headers();
  const xff = hh.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = hh.get("x-real-ip")?.trim();
  return real || "untrusted";
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
    return { ok: false, error: "Supabase가 연결되지 않았습니다." };
  }

  const ip = await clientIpAsync();
  const key = `login:${ip}:${email}`;

  // Peek FIRST: if already locked, refuse without bumping. This means a valid
  // password on a bucket someone else already tried doesn't push the count
  // higher (the honest user can still succeed and clear the bucket).
  const gate = peekRate(key);
  if (!gate.allowed) {
    return {
      ok: false,
      error: "잠시 후 다시 시도해 주세요.",
      retryAfterSeconds: gate.retryAfterSeconds,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Only failed attempts consume the budget.
    const after = bumpRate(key);
    return {
      ok: false,
      error: "이메일 또는 비밀번호가 올바르지 않습니다.",
      // Surface the lock timer only once the bump made the bucket refuse further attempts.
      retryAfterSeconds: after.allowed ? undefined : after.retryAfterSeconds,
    };
  }

  resetRate(key);
  redirect("/mfa/verify");
}
