import { getRecentPosts, getSiteSettings } from "@/lib/data";
import { MediaGallery } from "@/components/MediaGallery";

export default async function HomePage() {
  const [site, posts] = await Promise.all([
    getSiteSettings(),
    getRecentPosts(8),
  ]);

  return (
    <div>
      <section className="glass mb-10 px-6 py-12 sm:px-10 sm:py-16">
        <p className="text-[13px] uppercase tracking-[0.18em] text-ink-muted">
          Private Family Archive
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl leading-[1.15] sm:text-5xl">
          {site.siteName}
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-7 text-ink-secondary">
          초대받은 가족만 함께 보는 사진과 영상. 로그인과 2단계 인증을 마친
          분들에게만 열립니다.
        </p>
      </section>

      <section aria-labelledby="recent">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 id="recent" className="text-2xl">
            최근 기록
          </h2>
        </div>
        <MediaGallery posts={posts} />
      </section>
    </div>
  );
}
