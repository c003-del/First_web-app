import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";

const ADMIN_ROLES = new Set(["owner", "admin"]);

/**
 * /admin is ENFORCED, not merely hidden (guidelines §3, §8):
 *   - requires an authenticated session at AAL2 (MFA completed), AND
 *   - requires role owner|admin from the `profiles` table (server-checked).
 * Any failure returns 404 so the route's existence is not confirmed.
 *
 * In demo mode (no Supabase) the area is explorable with a clear banner, since
 * there is no auth to enforce.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) notFound();

    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") notFound();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !ADMIN_ROLES.has(profile.role)) notFound();
  }

  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-5 py-8 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
            <div className="glass p-2">
              <p className="px-3 py-2 text-[13px] font-semibold text-ink-muted">
                관리자
              </p>
              <AdminNavLink href="/admin">대시보드</AdminNavLink>
              <AdminNavLink href="/admin/posts">게시물</AdminNavLink>
              <AdminNavLink href="/admin/categories">카테고리</AdminNavLink>
              <AdminNavLink href="/admin/media">미디어</AdminNavLink>
              <AdminNavLink href="/admin/texts">문구</AdminNavLink>
              <AdminNavLink href="/admin/users">사용자</AdminNavLink>
              <AdminNavLink href="/admin/settings">사이트 설정</AdminNavLink>
              <AdminNavLink href="/admin/security">보안</AdminNavLink>
              <AdminNavLink href="/admin/audit">감사 로그</AdminNavLink>
            </div>
            {!isSupabaseConfigured() ? (
              <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-[12px] text-warning">
                데모 모드 · 인증 미연결 상태입니다. 배포 전 Supabase 연결 후
                접근 제어가 강제됩니다.
              </p>
            ) : null}
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}

function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-[14px] hover:bg-surface-1"
    >
      {children}
    </Link>
  );
}
