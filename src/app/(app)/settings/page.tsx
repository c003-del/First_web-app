import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { AccountForm } from "./SettingsForm";

export const metadata = { title: "내 계정" };

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="text-2xl">내 계정</h1>
        <p className="mt-4 rounded-md bg-surface-2 px-3 py-2 text-[13px] text-ink-muted">
          데모 모드입니다. Supabase 연결 후 계정 정보와 2단계 인증 관리가
          활성화됩니다.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase!.auth.getUser()) ?? { data: { user: null } };

  const [{ data: profile }, { data: factors }] = await Promise.all([
    supabase!.from("profiles").select("display_name, role").eq("id", user!.id).maybeSingle(),
    supabase!.auth.mfa.listFactors(),
  ]);

  const mfaEnrolled = Boolean(
    factors?.totp?.some((f) => f.status === "verified"),
  );

  return (
    <div>
      <h1 className="text-2xl">내 계정</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
        표시 이름, 2단계 인증 상태, 로그아웃을 관리합니다.
      </p>
      <div className="mt-6">
        <AccountForm
          initialName={profile?.display_name ?? ""}
          email={user?.email ?? ""}
          role={profile?.role ?? "viewer"}
          mfaEnrolled={mfaEnrolled}
        />
      </div>
    </div>
  );
}
