import Link from "next/link";
import { MfaVerifyForm } from "./MfaVerifyForm";

export const metadata = { title: "2단계 인증" };

export default function MfaVerifyPage() {
  return (
    <div className="glass glass-strong p-6 sm:p-8">
      <h1 className="text-2xl">2단계 인증</h1>
      <p className="mt-2 text-[14px] text-ink-secondary">
        인증 앱에 표시된 6자리 코드를 입력해 주세요.
      </p>
      <div className="mt-6">
        <MfaVerifyForm />
      </div>
      <p className="mt-6 text-center text-[13px] text-ink-muted">
        아직 인증 앱을 등록하지 않았나요?{" "}
        <Link href="/mfa/setup" className="text-accent-primary underline">
          등록하기
        </Link>
      </p>
    </div>
  );
}
