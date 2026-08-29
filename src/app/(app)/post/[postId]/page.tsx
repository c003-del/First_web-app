import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostById } from "@/lib/data";
import { supportNotice } from "@/lib/media";
import type { MediaItem } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPostById(postId);
  return { title: post?.title ?? "게시물" };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getPostById(postId);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl">{post.title}</h1>
        {post.takenAt ? (
          <time className="mt-1 block text-[13px] text-ink-muted">
            {post.takenAt}
          </time>
        ) : null}
        {post.caption ? (
          <p className="mt-3 text-ink-secondary">{post.caption}</p>
        ) : null}
      </header>

      <div className="space-y-6">
        {post.media.map((m) => (
          <MediaBlock key={m.id} item={m} />
        ))}
      </div>
    </article>
  );
}

function MediaBlock({ item }: { item: MediaItem }) {
  // Prefer the resolved signed URL (attached by the data layer in production);
  // demo content falls back to the absolute placeholder *Path.
  const src = item.url ?? item.storagePath;
  const poster = item.posterUrl ?? item.posterPath ?? undefined;
  const ratio =
    item.width && item.height ? `${item.width} / ${item.height}` : "4 / 3";

  return (
    <figure className="glass p-3">
      <div
        className="relative overflow-hidden rounded-md bg-surface-2"
        style={{ aspectRatio: ratio }}
      >
        {item.support === "archive-only" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-ink-primary">원본 보관 완료</p>
            <p className="text-[13px] text-ink-muted">
              이 형식(.{item.ext})은 브라우저 미리보기를 보장하지 않습니다.
              원본을 내려받아 확인해 주세요.
            </p>
          </div>
        ) : item.kind === "video" ? (
          <video
            className="h-full w-full object-contain"
            controls
            preload="metadata"
            poster={poster}
          >
            <source src={src} type={item.mime} />
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={item.alt ?? ""}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        )}
      </div>
      {item.support !== "web-native" ? (
        <figcaption className="px-1 pt-2 text-[12px] text-warning">
          {supportNotice(item.support)}
        </figcaption>
      ) : null}
    </figure>
  );
}
