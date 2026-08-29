import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export const metadata = { title: "감사 로그" };

export default function AdminAuditPage() {
  return (
    <AdminPlaceholder
      title="감사 로그"
      phase="Phase 7"
      summary="역할 변경, 계정 비활성화, MFA 재설정, 권한 거부, 백업 코드 사용 등 관리자 행위와 보안 이벤트를 조회합니다. 로그는 일반 사용자가 수정·삭제할 수 없습니다."
    />
  );
}
