"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

interface Enrollment {
  factorId: string;
  qrSvg: string;
  secret: string;
}

export function MfaSetupForm() {
  const router = useRouter();
  const supabase = createClient();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    if (!supabase) return;
    setError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `기기 ${new Date().toLocaleDateString("ko-KR")}`,
    });
    setBusy(false);
    if (error || !data) {
      setError("등록을 시작하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    setEnrollment({
      factorId: data.id,
      qrSvg: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !enrollment) return;
    setError(null);
    setBusy(true);

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
      factorId: enrollment.factorId,
    });
    if (cErr || !challenge) {
      setBusy(false);
      setError("인증을 시작하지 못했습니다.");
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
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
        데모 모드입니다. Supabase를 연결하면 인증 앱 등록이 활성화됩니다.
      </p>
    );
  }

  if (!enrollment) {
    return (
      <Button onClick={startEnroll} disabled={busy} className="w-full">
        {busy ? "준비 중…" : "QR 코드 생성"}
      </Button>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4">
      <div
        className="mx-auto w-48 rounded-md bg-surface-solid p-3"
        // qr_code is an inline SVG string returned by Supabase.
        dangerouslySetInnerHTML={{ __html: enrollment.qrSvg }}
      />
      <div className="rounded-md bg-surface-2 px-3 py-2 text-center">
        <p className="text-[12px] text-ink-muted">수동 입력용 키</p>
        <code className="break-all text-[13px]">{enrollment.secret}</code>
      </div>

      <label className="block">
        <span className="text-[13px] text-ink-secondary">인증 코드</span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
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

      <Button type="submit" disabled={busy || code.length < 6} className="w-full">
        {busy ? "확인 중…" : "등록 완료"}
      </Button>
    </form>
  );
}
