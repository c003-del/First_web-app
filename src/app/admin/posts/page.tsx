import { getCategories, getRecentPosts } from "@/lib/data";
import { PostsEditor } from "./PostsEditor";

export const metadata = { title: "게시물 관리" };

export default async function AdminPostsPage() {
  const [posts, owner, family] = await Promise.all([
    getRecentPosts(100),
    getCategories("owner"),
    getCategories("family"),
  ]);

  const categoryOptions = [
    ...owner.map((c) => ({ id: c.id, name: c.name, scopeLabel: "개인" })),
    ...family.map((c) => ({ id: c.id, name: c.name, scopeLabel: "가족" })),
  ];

  return (
    <div>
      <h1 className="text-2xl">게시물 관리</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
        최근 게시물을 편집합니다. 삭제는 소프트 삭제(복원 가능)이며 원본 미디어는
        보존됩니다.
      </p>
      <div className="mt-6">
        <PostsEditor posts={posts} categories={categoryOptions} />
      </div>
    </div>
  );
}
