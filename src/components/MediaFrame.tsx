import Link from "next/link";
import type { MediaItem, Post } from "@/lib/types";

/**
 * Core exhibit unit: a cream-matted liquid-glass frame around one post's cover
 * media, linking to the post detail (guidelines §8).
 *
 * Design notes:
 *  - Aspect ratio is reserved to prevent layout shift.
 *  - Hover lift only on hover-capable (non-touch) devices.
 *  - The gallery uses static covers — WebGL effects run only in the editor /
 *    detail view, never on every card (guidelines §2, §14).
 *  - `src` prefers the resolved signed thumbnail URL (attached by the data
 *    layer in production); demo content falls back to the absolute *Path URLs.
 */
export function MediaFrame({
  post,
  priority = false,
}: {
  post: Post;
  priority?: boolean;
}) {
  const cover: MediaItem | undefined = post.media[0];
  const ratio =
    cover?.width && cover?.height
      ? `${cover.width} / ${cover.height}`
      : "4 / 3";
  const src =
    cover?.thumbUrl ??
    cover?.url ??
    cover?.thumbPath ??
    cover?.storagePath ??
    "";

  return (
    <Link
      href={`/post/${post.id}`}
      className="group block focus-visible:outline-none"
      aria-label={post.title}
    >
      <div
        className={
          "glass p-3 transition-transform duration-300 will-change-transform " +
          "[@media(hover:hover)]:group-hover:-translate-y-0.5 " +
          "[@media(hover:hover)]:group-hover:shadow-card " +
          "group-focus-visible:outline group-focus-visible:outline-2 " +
          "group-focus-visible:outline-focus"
        }
      >
        <div
          className="relative overflow-hidden rounded-md bg-surface-2"
          style={{ aspectRatio: ratio }}
        >
          {src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt={cover?.alt ?? post.title}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-muted">
              미리보기 없음
            </div>
          )}

          {cover?.kind === "video" ? (
            <span className="absolute right-2 top-2 rounded-full bg-surface-solid/80 px-2 py-0.5 text-[11px] text-ink-secondary">
              ▶ 영상
            </span>
          ) : null}

          {cover && cover.support !== "web-native" ? (
            <span className="absolute left-2 top-2 rounded-full bg-surface-solid/85 px-2 py-0.5 text-[11px] text-warning">
              {cover.support === "needs-conversion" ? "변환 필요" : "원본 보관"}
            </span>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between gap-3 px-1 pb-0.5 pt-3">
          <p className="truncate text-[15px] text-ink-primary">{post.title}</p>
          {post.takenAt ? (
            <time className="shrink-0 text-[12px] text-ink-muted">
              {post.takenAt}
            </time>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
