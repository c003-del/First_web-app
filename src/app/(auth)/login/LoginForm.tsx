"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { isSupabaseConfigured } from "@/lib/config";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm() {
  const router = useRouter();
  const demo = !isSupabaseConfigured();
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState(loginAction, initial);

  // On success the session cookies are set server-side; refresh so middleware
  // re-runs and routes the AAL1 session to /mfa/verify.
  useEffect(() => {
    if (state.status === "success") {
      router.replace("/mfa/verify");
      router.refresh();
    }
  }, [state, router]);

  const message =
    state.status === "error" || state.status === "locked"
      ? state.message
      : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {demo ? (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-ink-muted">
          데모 모드입니다. 로그인을 사용하려면 Supabase 환경변수를 설정하세요.
        </p>
      ) : null}

      <label className="block">
        <span className="text-[13px] text-ink-secondary">이메일</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px] outline-none focus:border-accent-primary"
        />
      </label>

      <label className="block">
        <span className="text-[13px] text-ink-secondary">비밀번호</span>
        <div className="mt-1 flex items-stretch gap-2">
          <input
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
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

      {message ? (
        <p role="alert" className="text-[13px] text-danger">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || demo || state.status === "success"}
        className="w-full"
      >
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
