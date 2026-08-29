import { getCategories, getRecentPosts } from "@/lib/data";

export const metadata = { title: "관리자 대시보드" };

export default async function AdminDashboard() {
  const [ownerCats, familyCats, posts] = await Promise.all([
    getCategories("owner"),
    getCategories("family"),
    getRecentPosts(100),
  ]);

  const stats = [
    { label: "게시물", value: posts.length },
    {
      label: "이미지",
      value: posts.reduce(
        (n, p) => n + p.media.filter((m) => m.kind === "image").length,
        0,
      ),
    },
    {
      label: "영상",
      value: posts.reduce(
        (n, p) => n + p.media.filter((m) => m.kind === "video").length,
        0,
      ),
    },
    { label: "카테고리", value: ownerCats.length + familyCats.length },
  ];

  return (
    <div>
      <h1 className="text-2xl">대시보드</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-soft bg-surface-1 p-4">
            <p className="text-[13px] text-ink-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-soft bg-surface-1 p-5">
        <h2 className="text-lg">다음 단계</h2>
        <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
          이 관리자 영역은 기본 골격입니다. 게시물·카테고리·사용자·문구 편집,
          업로드 파이프라인, 효과 편집기는{" "}
          <code>docs/DEVELOPMENT_GUIDELINES.md</code>의 Phase 5–7을 따라
          구현합니다.
        </p>
      </div>
    </div>
  );
}
