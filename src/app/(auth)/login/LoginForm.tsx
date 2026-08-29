"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();
  const demo = supabase === null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return;
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);

    if (error) {
      // Generic message — never reveal whether the account exists (§20).
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    // Middleware routes AAL1 sessions to /mfa/verify automatically.
    router.replace("/mfa/verify");
    router.refresh();
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

      <Button type="submit" disabled={busy || demo} className="w-full">
        {busy ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
