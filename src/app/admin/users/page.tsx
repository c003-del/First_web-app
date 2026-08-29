import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export const metadata = { title: "사용자 관리" };

export default function AdminUsersPage() {
  return (
    <AdminPlaceholder
      title="사용자 관리"
      phase="Phase 7"
      summary="이메일 초대, 역할 변경, 업로드·원본 다운로드 권한 설정, 계정 비활성화, 모든 세션 종료, MFA 재설정 요청을 제공합니다. 민감 작업은 재인증 확인과 감사 로그를 남깁니다."
    />
  );
}
