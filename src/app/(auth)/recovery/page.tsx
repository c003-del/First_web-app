import Link from "next/link";

export const metadata = { title: "계정 복구" };

export default function RecoveryPage() {
  return (
    <div className="glass glass-strong p-6 sm:p-8">
      <h1 className="text-2xl">계정 복구</h1>
      <p className="mt-3 text-[14px] leading-6 text-ink-secondary">
        인증 앱을 사용할 수 없다면 등록 시 발급받은 백업 코드를 사용하거나,
        관리자에게 2단계 인증 재설정을 요청해 주세요.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-[14px] text-ink-secondary">
        <li>백업 코드는 최초 등록 시 한 번만 표시됩니다.</li>
        <li>관리자는 사용자의 원본 코드를 볼 수 없습니다.</li>
        <li>재설정 후 이전 코드는 모두 무효화됩니다.</li>
      </ul>
      <p className="mt-6 text-center text-[13px] text-ink-muted">
        <Link href="/login" className="text-accent-primary underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
