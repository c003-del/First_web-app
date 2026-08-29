import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export const metadata = { title: "카테고리 관리" };

export default function AdminCategoriesPage() {
  return (
    <AdminPlaceholder
      title="카테고리 관리"
      phase="Phase 7"
      summary="개인/가족 scope별 카테고리·하위메뉴 CRUD, 드래그 정렬, slug 변경 시 이전 URL redirect, 빈 카테고리 삭제 및 게시물 이동을 제공합니다."
    />
  );
}
