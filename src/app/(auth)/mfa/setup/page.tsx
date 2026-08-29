import { MfaSetupForm } from "./MfaSetupForm";

export const metadata = { title: "인증 앱 등록" };

export default function MfaSetupPage() {
  return (
    <div className="glass glass-strong p-6 sm:p-8">
      <h1 className="text-2xl">인증 앱 등록</h1>
      <p className="mt-2 text-[14px] text-ink-secondary">
        Google Authenticator, 1Password 등 인증 앱으로 QR 코드를 스캔한 뒤
        6자리 코드를 입력해 등록을 완료하세요.
      </p>
      <div className="mt-6">
        <MfaSetupForm />
      </div>
    </div>
  );
}
