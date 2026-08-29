"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

export function MfaVerifyForm() {
  const router = useRouter();
  const supabase = createClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      setLoading(false);
      if (error) {
        setError("인증 수단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) setFactorId(verified.id);
      else setError("등록된 인증 앱이 없습니다. 먼저 등록해 주세요.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !factorId) return;
    setError(null);
    setBusy(true);

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (cErr || !challenge) {
      setBusy(false);
      setError("인증을 시작하지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setBusy(false);

    if (vErr) {
      setError("코드가 올바르지 않습니다. 다시 확인해 주세요.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (!supabase) {
    return (
      <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] text-ink-muted">
        데모 모드입니다. Supabase를 연결하면 2단계 인증이 활성화됩니다.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-[13px] text-ink-secondary">인증 코드</span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-center text-2xl tracking-[0.4em] outline-none focus:border-accent-primary"
          placeholder="000000"
        />
      </label>

      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={busy || loading || !factorId || code.length < 6}
        className="w-full"
      >
        {busy ? "확인 중…" : "확인"}
      </Button>
    </form>
  );
}
