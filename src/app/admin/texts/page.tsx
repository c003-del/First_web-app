import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export const metadata = { title: "문구 관리" };

export default function AdminTextsPage() {
  return (
    <AdminPlaceholder
      title="문구 관리"
      phase="Phase 6"
      summary="사이트명, 홈 소개, 카테고리 설명, 캡션, 푸터 저작권 등 편집 가능한 텍스트 블록을 plain text로 저장·수정합니다. 저장/취소, 글자 수 제한, 충돌 감지를 포함합니다."
    />
  );
}
