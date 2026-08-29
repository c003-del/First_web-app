import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export const metadata = { title: "게시물 관리" };

export default function AdminPostsPage() {
  return (
    <AdminPlaceholder
      title="게시물 관리"
      phase="Phase 4–7"
      summary="초안 생성, 다중 미디어 첨부, 대표 이미지 지정, 제목·캡션 편집, 카테고리 지정, 촬영일·공개 대상 설정, 게시·보관·삭제(soft delete)를 제공합니다."
    />
  );
}
