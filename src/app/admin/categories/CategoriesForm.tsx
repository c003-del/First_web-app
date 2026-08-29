"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import type { Category, CategoryScope } from "@/lib/types";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "./actions";

export function CategoriesEditor({
  ownerCategories,
  familyCategories,
}: {
  ownerCategories: Category[];
  familyCategories: Category[];
}) {
  return (
    <div className="space-y-8">
      <ScopeSection scope="owner" title="개인 카테고리" list={ownerCategories} />
      <ScopeSection scope="family" title="가족 카테고리" list={familyCategories} />
    </div>
  );
}

function ScopeSection({
  scope,
  title,
  list,
}: {
  scope: CategoryScope;
  title: string;
  list: Category[];
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 divide-y divide-soft rounded-lg border border-soft">
        {list.length === 0 ? (
          <li className="px-4 py-6 text-center text-[13px] text-ink-muted">
            아직 카테고리가 없습니다.
          </li>
        ) : (
          list.map((c) => <CategoryRow key={c.id} category={c} />)
        )}
      </ul>
      <div className="mt-4">
        <NewCategoryForm scope={scope} />
      </div>
    </section>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [description, setDescription] = useState(category.description ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMessage(null);
    start(async () => {
      const res = await updateCategory({
        id: category.id,
        name,
        slug,
        description,
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
    if (!confirm(`"${category.name}" 카테고리를 삭제할까요?`)) return;
    setMessage(null);
    start(async () => {
      const res = await deleteCategory(category.id);
      if (res.ok) router.refresh();
      else setMessage(res.error ?? "삭제 실패");
    });
  }

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[14px]">{category.name}</p>
          <p className="text-[12px] text-ink-muted">
            /{category.slug}
            {category.description ? ` · ${category.description}` : ""}
          </p>
          {message ? (
            <p className="mt-1 text-[12px] text-danger" role="alert">
              {message}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditing(true)}>
            편집
          </Button>
          <Button variant="danger" onClick={remove} disabled={pending}>
            {pending ? "…" : "삭제"}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12px] text-ink-secondary">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-ink-secondary">slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[12px] text-ink-secondary">설명</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
        />
      </label>
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

function NewCategoryForm({ scope }: { scope: CategoryScope }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await createCategory({ scope, name, slug, description });
      if (res.ok) {
        setName("");
        setSlug("");
        setDescription("");
        router.refresh();
      } else {
        setMessage(res.error ?? "생성 실패");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-soft bg-surface-1 p-4"
    >
      <p className="text-[13px] font-medium text-ink-secondary">새 카테고리</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
        />
        <input
          placeholder="slug (비우면 자동 생성)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
        />
      </div>
      <input
        placeholder="설명(선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mt-2 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
      />
      {message ? (
        <p className="mt-2 text-[12px] text-danger" role="alert">
          {message}
        </p>
      ) : null}
      <div className="mt-3">
        <Button type="submit" disabled={pending}>
          {pending ? "만드는 중…" : "추가"}
        </Button>
      </div>
    </form>
  );
}
