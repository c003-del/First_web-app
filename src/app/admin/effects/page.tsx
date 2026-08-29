import { getRecentPosts } from "@/lib/data";
import { EffectsEditor } from "./EffectsEditor";

export const metadata = { title: "효과 편집기" };

export default async function AdminEffectsPage() {
  const posts = await getRecentPosts(100);
  const options = posts.map((p) => ({ id: p.id, title: p.title }));

  return (
    <div>
      <h1 className="text-2xl">효과 편집기</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
        WebGL로 실시간 미리보기하며 노출·대비·색감 등을 조절합니다. 원본은 절대
        변경되지 않으며, 조절값(파라미터)만 게시물에 저장됩니다. 갤러리 카드는
        WebGL을 쓰지 않고 정적 썸네일로 표시됩니다.
      </p>
      <div className="mt-6">
        <EffectsEditor posts={options} />
      </div>
    </div>
  );
}
