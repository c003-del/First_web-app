import type { Post } from "@/lib/types";
import { MediaFrame } from "@/components/MediaFrame";
import { EmptyState } from "@/components/EmptyState";

/**
 * Accessible gallery. Uses an ordered CSS Grid (NOT CSS-columns masonry) so DOM
 * order matches visual/date order for keyboard and screen-reader users
 * (guidelines §9, §10). Responsive columns: 1 / 2 / 3–4.
 */
export function MediaGallery({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <EmptyState
        title="아직 게시물이 없어요."
        hint="관리자 페이지에서 사진이나 영상을 올리면 여기에 표시됩니다."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {posts.map((post, i) => (
        <li key={post.id}>
          <MediaFrame post={post} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
