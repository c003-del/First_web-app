"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { updateDisplayName, signOutAction } from "./actions";

export function AccountForm({
  initialName,
  email,
  role,
  mfaEnrolled,
}: {
  initialName: string;
  email: string;
  role: string;
  mfaEnrolled: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await updateDisplayName(name);
      setMessage(res.ok ? "저장되었습니다." : (res.error ?? "저장 실패"));
    });
  }

  return (
    <div className="max-w-xl space-y-8">
      <section>
        <h2 className="text-lg font-semibold">계정</h2>
        <dl className="mt-3 grid grid-cols-3 gap-y-2 rounded-lg border border-soft bg-surface-1 px-4 py-3 text-[14px]">
          <dt className="text-ink-muted">이메일</dt>
          <dd className="col-span-2">{email}</dd>
          <dt className="text-ink-muted">권한</dt>
          <dd className="col-span-2">{role}</dd>
          <dt className="text-ink-muted">2단계 인증</dt>
          <dd className="col-span-2">
            {mfaEnrolled ? "활성" : "미등록"}
            {!mfaEnrolled ? (
              <Link
                href="/mfa/setup"
                className="ml-2 text-accent-primary underline"
              >
                등록
              </Link>
            ) : null}
          </dd>
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold">표시 이름</h2>
        <form onSubmit={save} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[13px] text-ink-secondary">이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]"
            />
          </label>
          {message ? (
            <p className="text-[13px] text-ink-secondary" role="status">
              {message}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </Button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">로그아웃</h2>
        <form action={signOutAction} className="mt-3">
          <Button variant="ghost" type="submit">
            로그아웃
          </Button>
        </form>
      </section>
    </div>
  );
}
