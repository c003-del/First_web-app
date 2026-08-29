import { LoginForm } from "./LoginForm";

export const metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="glass-strong glass p-6 sm:p-8">
      <h1 className="text-2xl">로그인</h1>
      <p className="mt-2 text-[14px] text-ink-secondary">
        초대받은 이메일과 비밀번호로 로그인해 주세요.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
