import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export const metadata = { title: "미디어 관리" };

export default function AdminMediaPage() {
  return (
    <AdminPlaceholder
      title="미디어 관리"
      phase="Phase 5"
      summary="드래그 앤 드롭 업로드, 확장자/MIME/매직바이트 검증, 상태 머신(uploading→ready), 썸네일·포스터 생성, 실패·재시도, EXIF/GPS 처리를 제공합니다."
    />
  );
}
