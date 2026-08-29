"use client";

import { useState } from "react";
import Link from "next/link";
import type { MediaItem, Post } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { Lightbox } from "@/components/Lightbox";

/**
 * Accessible gallery. Ordered CSS Grid (DOM order = date order) with a
 * click-to-open lightbox. Ctrl/Cmd-click still opens the full post detail
 * page in a new tab because each card is a real <Link>.
 */
export function MediaGallery({ posts }: { posts: Post[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (posts.length === 0) {
    return (
      <EmptyState
        title="아직 게시물이 없어요."
        hint="관리자 페이지에서 사진이나 영상을 올리면 여기에 표시됩니다."
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.map((post, i) => (
          <li key={post.id}>
            <GalleryCard
              post={post}
              priority={i < 4}
              onOpen={() => setOpenIndex(i)}
            />
          </li>
        ))}
      </ul>
      {openIndex !== null ? (
        <Lightbox
          posts={posts}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </>
  );
}

function GalleryCard({
  post,
  priority,
  onOpen,
}: {
  post: Post;
  priority: boolean;
  onOpen: () => void;
}) {
  const cover: MediaItem | undefined = post.media[0];
  const ratio =
    cover?.width && cover?.height
      ? `${cover.width} / ${cover.height}`
      : "4 / 3";
  // Prefer a resolved signed URL; treat *Path as a URL only if it already
  // looks like one (demo mode uses absolute picsum URLs there).
  const httpish = (p?: string | null) =>
    p && /^https?:\/\//i.test(p) ? p : undefined;
  const src =
    cover?.thumbUrl ??
    cover?.url ??
    httpish(cover?.thumbPath) ??
    httpish(cover?.storagePath) ??
    "";

  return (
    <Link
      href={`/post/${post.id}`}
      aria-label={post.title}
      className="group block focus-visible:outline-none"
      onClick={(e) => {
        // Modifier-click keeps default (open in new tab). Middle-click fires
        // `auxclick`/`mousedown`, not `click`, so it already bypasses this
        // handler entirely.
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        onOpen();
      }}
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
