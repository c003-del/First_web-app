import { getCategories } from "@/lib/data";
import { CategoriesEditor } from "./CategoriesForm";

export const metadata = { title: "카테고리 관리" };

export default async function AdminCategoriesPage() {
  const [owner, family] = await Promise.all([
    getCategories("owner"),
    getCategories("family"),
  ]);

  return (
    <div>
      <h1 className="text-2xl">카테고리 관리</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
        개인/가족 카테고리를 만들고, 이름과 slug, 설명을 편집합니다. slug는
        URL의 일부이며 예약어가 아닌 문자만 사용합니다. 게시물이 있는 카테고리는
        먼저 다른 카테고리로 옮긴 뒤에만 삭제할 수 있습니다.
      </p>
      <div className="mt-6">
        <CategoriesEditor
          ownerCategories={owner.filter((c) => !c.parentId)}
          familyCategories={family.filter((c) => !c.parentId)}
        />
      </div>
    </div>
  );
}
