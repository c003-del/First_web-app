import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export const metadata = { title: "사이트 설정" };

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholder
      title="사이트 설정"
      phase="Phase 7"
      summary="사이트명, owner 표시 이름·slug, 홈 문구, 테마 장식 강도, 푸터 저작권, 기본 정렬, 다운로드·워터마크 정책, 업로드 제한을 관리합니다. slug 변경은 라우트에 즉시 반영됩니다."
    />
  );
}
