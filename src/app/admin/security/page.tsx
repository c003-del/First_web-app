import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export const metadata = { title: "보안 설정" };

export default function AdminSecurityPage() {
  return (
    <AdminPlaceholder
      title="보안 설정"
      phase="Phase 7"
      summary="MFA 정책, 세션 관리, 로그인 실패 레이트리밋, 다운로드 권한, 백업 코드 재발급 등 보안 관련 설정을 관리합니다. 핵심 보안 설정은 owner만 변경할 수 있습니다."
    />
  );
}
