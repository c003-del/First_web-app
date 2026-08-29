"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { saveSiteSettings } from "./actions";
import type { SiteSettings } from "@/lib/data";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [siteName, setSiteName] = useState(initial.siteName);
  const [ownerLabel, setOwnerLabel] = useState(initial.ownerLabel);
  const [ownerSlug, setOwnerSlug] = useState(initial.ownerSlug);
  const [copyright, setCopyright] = useState(initial.copyright);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty =
    siteName !== initial.siteName ||
    ownerLabel !== initial.ownerLabel ||
    ownerSlug !== initial.ownerSlug ||
    copyright !== initial.copyright;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await saveSiteSettings({
        siteName,
        ownerLabel,
        ownerSlug,
        copyright,
      });
      setMessage(res.ok ? "저장되었습니다." : (res.error ?? "저장 실패"));
      if (res.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <label className="block">
        <span className="text-[13px] text-ink-secondary">사이트명</span>
        <input
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          maxLength={80}
          className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] text-ink-secondary">
            소유자 표시 이름 (예: 수진)
          </span>
          <input
            value={ownerLabel}
            onChange={(e) => setOwnerLabel(e.target.value)}
            maxLength={40}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-ink-secondary">
            소유자 slug (예: sujin)
          </span>
          <input
            value={ownerSlug}
            onChange={(e) => setOwnerSlug(e.target.value)}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[13px] text-ink-secondary">푸터 저작권 문구</span>
        <input
          value={copyright}
          onChange={(e) => setCopyright(e.target.value)}
          maxLength={200}
          className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]"
        />
      </label>
      {message ? (
        <p className="text-[13px] text-ink-secondary" role="status">
          {message}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </form>
  );
}
