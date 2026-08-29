"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MediaItem, Post } from "@/lib/types";

/**
 * Accessible lightbox (guidelines §10).
 *  - ESC closes; ←/→ navigates; touch-swipe on media area.
 *  - Focus is trapped, returned to the trigger element on close.
 *  - Background scroll is locked.
 *  - Next media prefetched via a hidden preload <img>.
 *  - Videos pause automatically on transition (the old <video> is unmounted).
 *  - No download button by default; add one behind a permission flag later.
 */
export function Lightbox({
  posts,
  index,
  onClose,
  onIndexChange,
}: {
  posts: Post[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const post = posts[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (posts.length === 0) return;
      const next = (index + delta + posts.length) % posts.length;
      onIndexChange(next);
    },
    [index, posts.length, onIndexChange],
  );

  // Lock background scroll while the lightbox is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Remember and restore focus.
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      openerRef.current?.focus?.();
    };
  }, []);

  // Keyboard shortcuts + focus trap.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Tab") {
        // Simple focus trap: keep focus inside the dialog.
        const el = dialogRef.current;
        if (!el) return;
        const focusables = el.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!post) return null;
  const cover: MediaItem | undefined = post.media[0];
  const nextPost = posts[(index + 1) % posts.length];
  const nextCover = nextPost?.media[0];

  // In production the storage bucket is private — a raw storagePath would 404.
  // The data layer resolves short-lived signed URLs; if a URL is missing we
  // must NOT fall back to the raw path. Prefer signed `url`, then let the
  // browser show a broken state.  Demo mode already puts absolute picsum URLs
  // in *Path so cover.url is undefined but storagePath is safe there — a
  // simple heuristic: only accept storagePath if it starts with http.
  const httpish = (p?: string | null) =>
    p && /^https?:\/\//i.test(p) ? p : undefined;
  const src = cover?.url ?? httpish(cover?.storagePath);
  const poster = cover?.posterUrl ?? httpish(cover?.posterPath);
  const thumb = cover?.thumbUrl ?? httpish(cover?.thumbPath);
  const webNative = cover?.support === "web-native";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={post.title}
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 outline-none"
      onClick={(e) => {
        // Click on the backdrop (not the media) closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass glass-strong relative flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-soft px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[15px]">{post.title}</p>
            {post.takenAt ? (
              <time className="text-[12px] text-ink-muted">{post.takenAt}</time>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-strong px-3 py-1.5 text-[13px]"
            aria-label="닫기"
          >
            닫기 (ESC)
          </button>
        </header>

        <div
          className="relative flex flex-1 items-center justify-center bg-black"
          onTouchStart={(e) => {
            // Ignore touches on the video's own controls so scrubbing doesn't
            // trigger a slide change.
            const target = e.target as HTMLElement | null;
            if (target?.tagName === "VIDEO") {
              touchStartX.current = null;
              return;
            }
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            if (start === null) return;
            const end = e.changedTouches[0]?.clientX ?? start;
            const dx = end - start;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }}
        >
          {cover?.kind === "video" && webNative ? (
            <video
              key={post.id}
              className="max-h-[70dvh] w-auto max-w-full"
              controls
              preload="metadata"
              poster={poster}
            >
              {src ? <source src={src} type={cover.mime} /> : null}
            </video>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={post.id}
              src={webNative ? (src ?? "") : (thumb ?? src ?? "")}
              alt={cover?.alt ?? post.title}
              className="max-h-[70dvh] w-auto max-w-full object-contain"
            />
          )}

          {posts.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="이전"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-solid/80 px-3 py-2 text-[18px]"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="다음"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-solid/80 px-3 py-2 text-[18px]"
              >
                ›
              </button>
            </>
          ) : null}
        </div>

        {post.caption ? (
          <p className="border-t border-soft px-4 py-3 text-[13px] text-ink-secondary">
            {post.caption}
          </p>
        ) : null}
      </div>

      {/* Prefetch the next cover so navigation feels instant. */}
      {(() => {
        const nextSrc =
          nextCover?.thumbUrl ??
          nextCover?.url ??
          httpish(nextCover?.thumbPath) ??
          httpish(nextCover?.storagePath);
        return nextSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img alt="" aria-hidden src={nextSrc} className="hidden" />
        ) : null;
      })()}
    </div>
  );
}
