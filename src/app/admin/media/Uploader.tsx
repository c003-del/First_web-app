"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET } from "@/lib/storage";
import { classifyFile, supportNotice } from "@/lib/media";
import {
  fileHeadBase64,
  generateImageThumb,
  generateVideoPoster,
} from "@/lib/media-thumbnail";
import { prepareUploadBatch, finalizeMedia } from "./actions";
import { Button } from "@/components/Button";
import type { NavCategory } from "@/components/SiteNav";

type ItemStatus =
  | "pending"
  | "rejected"
  | "uploading"
  | "processing"
  | "done"
  | "failed";

interface Item {
  file: File;
  status: ItemStatus;
  note: string;
}

interface CategoryOption extends NavCategory {
  id: string;
  scopeLabel: string;
}

export function Uploader({ categories }: { categories: CategoryOption[] }) {
  const supabase = createClient();
  const demo = supabase === null;

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const next: Item[] = Array.from(fileList).map((file) => {
      const cls = classifyFile(file.name);
      return cls.ok
        ? { file, status: "pending", note: supportNotice(cls.support!) }
        : { file, status: "rejected", note: cls.reason ?? "지원하지 않는 형식" };
    });
    setItems((prev) => [...prev, ...next]);
  }, []);

  function patch(i: number, p: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }

  async function upload() {
    if (!supabase || busy) return;
    setMessage(null);

    const acceptedIdx = items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => it.status === "pending" || it.status === "failed");
    if (acceptedIdx.length === 0) {
      setMessage("업로드할 파일을 선택해 주세요.");
      return;
    }
    if (!categoryId) {
      setMessage("카테고리를 선택해 주세요.");
      return;
    }

    setBusy(true);
    try {
      const metas = await Promise.all(
        acceptedIdx.map(async ({ it }) => ({
          fileName: it.file.name,
          size: it.file.size,
          headB64: await fileHeadBase64(it.file),
        })),
      );

      const res = await prepareUploadBatch({ categoryId, title, files: metas });
      if (!res.ok || !res.uploads) {
        setMessage(res.error ?? "업로드를 시작하지 못했습니다.");
        setBusy(false);
        return;
      }

      res.rejected?.forEach((r) => {
        const target = acceptedIdx[r.index];
        if (target) patch(target.i, { status: "rejected", note: r.reason });
      });

      const bucket = supabase.storage.from(MEDIA_BUCKET);

      for (const up of res.uploads) {
        const target = acceptedIdx[up.index];
        if (!target) continue;
        const uiIndex = target.i;
        const file = target.it.file;
        patch(uiIndex, { status: "uploading", note: "업로드 중…" });

        const orig = await bucket.uploadToSignedUrl(
          up.original.path,
          up.original.token,
          file,
        );
        if (orig.error) {
          patch(uiIndex, { status: "failed", note: "업로드 실패" });
          await finalizeMedia({ mediaId: up.mediaId, failed: true });
          continue;
        }

        patch(uiIndex, { status: "processing", note: "썸네일 생성 중…" });

        let thumbPath: string | null = null;
        let posterPath: string | null = null;
        let width: number | null = null;
        let height: number | null = null;
        let durationSeconds: number | null = null;

        try {
          if (up.kind === "image" && up.thumb) {
            const thumb = await generateImageThumb(file);
            if (thumb) {
              const r = await bucket.uploadToSignedUrl(
                up.thumb.path,
                up.thumb.token,
                thumb.blob,
              );
              if (!r.error) thumbPath = up.thumb.path;
              width = thumb.width;
              height = thumb.height;
            }
          } else if (up.kind === "video" && up.poster) {
            const poster = await generateVideoPoster(file);
            if (poster) {
              const r = await bucket.uploadToSignedUrl(
                up.poster.path,
                up.poster.token,
                poster.blob,
              );
              if (!r.error) posterPath = up.poster.path;
              // reuse the poster as the gallery thumb when available
              if (up.thumb && !r.error) {
                const t = await bucket.uploadToSignedUrl(
                  up.thumb.path,
                  up.thumb.token,
                  poster.blob,
                );
                if (!t.error) thumbPath = up.thumb.path;
              }
              width = poster.width;
              height = poster.height;
              durationSeconds = poster.durationSeconds;
            }
          }
        } catch {
          // Derived assets are best-effort; the original is already stored.
        }

        const fin = await finalizeMedia({
          mediaId: up.mediaId,
          thumbPath,
          posterPath,
          width,
          height,
          durationSeconds,
        });
        patch(uiIndex, {
          status: fin.ok ? "done" : "failed",
          note: fin.ok ? "완료" : "상태 갱신 실패",
        });
      }

      setMessage("업로드가 완료되었습니다. 게시물이 생성되었습니다.");
      setTitle("");
    } finally {
      setBusy(false);
    }
  }

  if (demo) {
    return (
      <div className="rounded-lg border border-soft bg-surface-1 p-5">
        <p className="text-[14px] text-ink-secondary">
          업로드는 Supabase 연결 후 사용할 수 있습니다. 현재는 데모 모드입니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] text-ink-secondary">카테고리</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.scopeLabel} · {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] text-ink-secondary">게시물 제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 없음"
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]"
          />
        </label>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-strong bg-surface-1 px-6 py-10 text-center"
      >
        <p className="text-ink-primary">사진·영상을 끌어다 놓거나 클릭해 선택</p>
        <p className="mt-1 text-[12px] text-ink-muted">
          이미지(jpg·png·webp·heic·raw 등) · 영상(mp4·webm·mov 등)
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {items.length > 0 ? (
        <ul className="divide-y divide-soft rounded-lg border border-soft">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[14px]">{it.file.name}</p>
                <p className="text-[12px] text-ink-muted">{it.note}</p>
              </div>
              <StatusBadge status={it.status} />
            </li>
          ))}
        </ul>
      ) : null}

      {message ? (
        <p className="text-[13px] text-ink-secondary" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button onClick={upload} disabled={busy || items.length === 0}>
          {busy ? "업로드 중…" : "업로드"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setItems([])}
          disabled={busy || items.length === 0}
        >
          목록 비우기
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { label: string; cls: string }> = {
    pending: { label: "대기", cls: "text-ink-muted" },
    rejected: { label: "거부", cls: "text-danger" },
    uploading: { label: "업로드 중", cls: "text-accent-primary" },
    processing: { label: "처리 중", cls: "text-accent-primary" },
    done: { label: "완료", cls: "text-success" },
    failed: { label: "실패", cls: "text-danger" },
  };
  const s = map[status];
  return <span className={`shrink-0 text-[12px] ${s.cls}`}>{s.label}</span>;
}
