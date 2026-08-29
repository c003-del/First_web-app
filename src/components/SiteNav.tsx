"use client";

import { useState } from "react";
import Link from "next/link";

export interface NavCategory {
  name: string;
  slug: string;
}

export interface SiteNavProps {
  siteName: string;
  ownerLabel: string;
  ownerSlug: string;
  ownerCategories: NavCategory[];
  familyCategories: NavCategory[];
  /** Demo mode shows a small banner explaining data isn't connected yet. */
  demo?: boolean;
}

export function SiteNav({
  siteName,
  ownerLabel,
  ownerSlug,
  ownerCategories,
  familyCategories,
  demo,
}: SiteNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <nav
        className="glass mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3"
        aria-label="주요 메뉴"
      >
        <Link href="/" className="text-[17px] font-semibold tracking-tight">
          {siteName}
        </Link>

        {/* Desktop menu */}
        <ul className="hidden items-center gap-1 md:flex">
          <NavLink href="/">홈</NavLink>
          <Dropdown label={ownerLabel} href={`/${ownerSlug}`} items={ownerCategories} base={`/${ownerSlug}`} />
          <Dropdown label="가족" href="/family" items={familyCategories} base="/family" />
          <NavLink href="/search">검색</NavLink>
          <NavLink href="/settings">계정</NavLink>
        </ul>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-strong md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">메뉴 열기</span>
          <span aria-hidden>{open ? "✕" : "☰"}</span>
        </button>
      </nav>

      {/* Mobile sheet */}
      {open ? (
        <div
          id="mobile-menu"
          className="glass mx-auto mt-2 max-w-content p-2 md:hidden"
        >
          <MobileLink href="/" onNavigate={() => setOpen(false)}>
            홈
          </MobileLink>
          <MobileGroup
            label={ownerLabel}
            href={`/${ownerSlug}`}
            base={`/${ownerSlug}`}
            items={ownerCategories}
            onNavigate={() => setOpen(false)}
          />
          <MobileGroup
            label="가족"
            href="/family"
            base="/family"
            items={familyCategories}
            onNavigate={() => setOpen(false)}
          />
          <MobileLink href="/search" onNavigate={() => setOpen(false)}>
            검색
          </MobileLink>
          <MobileLink href="/settings" onNavigate={() => setOpen(false)}>
            계정
          </MobileLink>
        </div>
      ) : null}

      {demo ? (
        <p className="mx-auto mt-2 max-w-content rounded-md bg-surface-2 px-3 py-2 text-center text-[12px] text-ink-muted">
          데모 모드 · Supabase를 연결하면 실제 데이터와 인증이 활성화됩니다.
        </p>
      ) : null}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="rounded-md px-3 py-2 text-[15px] hover:bg-surface-1"
      >
        {children}
      </Link>
    </li>
  );
}

function Dropdown({
  label,
  href,
  base,
  items,
}: {
  label: string;
  href: string;
  base: string;
  items: NavCategory[];
}) {
  return (
    <li className="group relative">
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-[15px] hover:bg-surface-1"
      >
        {label}
        {items.length > 0 ? <span aria-hidden className="text-ink-muted">▾</span> : null}
      </Link>
      {items.length > 0 ? (
        <ul className="glass invisible absolute left-0 top-full mt-1 min-w-44 p-1 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          {items.map((c) => (
            <li key={c.slug}>
              <Link
                href={`${base}/${c.slug}`}
                className="block rounded-md px-3 py-2 text-[14px] hover:bg-surface-1"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function MobileLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-md px-3 py-3 text-[15px] hover:bg-surface-1"
    >
      {children}
    </Link>
  );
}

function MobileGroup({
  label,
  href,
  base,
  items,
  onNavigate,
}: {
  label: string;
  href: string;
  base: string;
  items: NavCategory[];
  onNavigate: () => void;
}) {
  return (
    <details className="rounded-md">
      <summary className="flex cursor-pointer items-center justify-between rounded-md px-3 py-3 text-[15px] hover:bg-surface-1">
        <Link href={href} onClick={onNavigate}>
          {label}
        </Link>
        {items.length > 0 ? <span aria-hidden className="text-ink-muted">▾</span> : null}
      </summary>
      <div className="pb-1 pl-3">
        {items.map((c) => (
          <Link
            key={c.slug}
            href={`${base}/${c.slug}`}
            onClick={onNavigate}
            className="block rounded-md px-3 py-2.5 text-[14px] text-ink-secondary hover:bg-surface-1"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </details>
  );
}
