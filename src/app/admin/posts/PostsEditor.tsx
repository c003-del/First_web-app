"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import type { Post, PostVisibility } from "@/lib/types";
import { softDeletePost, updatePost } from "./actions";

interface CategoryOption {
  id: string;
  name: string;
  scopeLabel: string;
}

export function PostsEditor({
  posts,
  categories,
}: {
  posts: Post[];
  categories: CategoryOption[];
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-lg border border-soft bg-surface-1 px-4 py-8 text-center text-[13px] text-ink-muted">
        게시물이 없습니다. 미디어 업로드에서 새 게시물을 만들어 보세요.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-soft rounded-lg border border-soft">
      {posts.map((p) => (
        <PostRow key={p.id} post={p} categories={categories} />
      ))}
    </ul>
  );
}

function PostRow({
  post,
  categories,
}: {
  post: Post;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [categoryId, setCategoryId] = useState(post.categoryId);
  const [visibility, setVisibility] = useState<PostVisibility>(
    post.visibility ?? "family",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMessage(null);
    start(async () => {
      const res = await updatePost({
        id: post.id,
        title,
        caption,
        categoryId,
        visibility,
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setMessage(res.error ?? "저장 실패");
      }
    });
  }

  function remove() {
    if (!confirm(`"${post.title}" 게시물을 삭제할까요? (복원 가능한 소프트 삭제)`))
      return;
    setMessage(null);
    start(async () => {
      const res = await softDeletePost(post.id);
      if (res.ok) router.refresh();
      else setMessage(res.error ?? "삭제 실패");
    });
  }

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[14px]">{post.title}</p>
          <p className="text-[12px] text-ink-muted">
            {post.takenAt ?? post.createdAt.slice(0, 10)} · 미디어{" "}
            {post.media.length}개 · 공개 {post.visibility ?? "family"}
          </p>
          {message ? (
            <p className="mt-1 text-[12px] text-danger" role="alert">
              {message}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/post/${post.id}`}
            className="rounded-md border border-strong px-3 py-2 text-[13px]"
          >
            열기
          </Link>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            편집
          </Button>
          <Button variant="danger" onClick={remove} disabled={pending}>
            삭제
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-3 px-4 py-3">
      <label className="block">
        <span className="text-[12px] text-ink-secondary">제목</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
        />
      </label>
      <label className="block">
        <span className="text-[12px] text-ink-secondary">캡션</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={2000}
          rows={3}
          className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12px] text-ink-secondary">카테고리</span>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.scopeLabel} · {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] text-ink-secondary">공개 대상</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
          >
            <option value="family">가족 (family)</option>
            <option value="owner">소유자·관리자만 (owner)</option>
            <option value="private">비공개 (private)</option>
          </select>
        </label>
      </div>
      {message ? (
        <p className="text-[12px] text-danger" role="alert">
          {message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={save} disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          취소
        </Button>
      </div>
    </li>
  );
}
