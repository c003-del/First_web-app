"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { isSupabaseConfigured } from "@/lib/config";
import { loginAction } from "./actions";

/**
 * Login goes through a server action so the rate-limit gate + Supabase auth
 * happen server-side. The action returns a generic error on any failure so a
 * client can't distinguish invalid password from unknown account.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const demo = !isSupabaseConfigured();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (demo) return;
    setError(null);
    start(async () => {
      const res = await loginAction({ email, password });
      // On success the action throws via redirect() and never returns.
      if (!res.ok) {
        setError(res.error ?? "로그인 실패");
      } else {
        router.replace("/mfa/verify");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {demo ? (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-ink-muted">
          데모 모드입니다. 로그인을 사용하려면 Supabase 환경변수를 설정하세요.
        </p>
      ) : null}

      <label className="block">
        <span className="text-[13px] text-ink-secondary">이메일</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px] outline-none focus:border-accent-primary"
        />
      </label>

      <label className="block">
        <span className="text-[13px] text-ink-secondary">비밀번호</span>
        <div className="mt-1 flex items-stretch gap-2">
          <input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px] outline-none focus:border-accent-primary"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="shrink-0 rounded-md border border-strong px-3 text-[13px] text-ink-secondary"
            aria-pressed={show}
          >
            {show ? "숨김" : "표시"}
          </button>
        </div>
      </label>

      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || demo} className="w-full">
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
