"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateUpload, buildStoragePath } from "@/lib/upload";
import { supportForExt, mimeForExt } from "@/lib/media";
import { MEDIA_BUCKET, SITE_ID } from "@/lib/storage";
import type { MediaKind } from "@/lib/types";

/**
 * Upload flow (guidelines §12). All writes go through the user's session
 * client, so RLS (`can_write` = admin + AAL2) is the real authorization gate —
 * these actions cannot be abused by a non-admin even though they are callable.
 *
 * 1. prepareUploadBatch — validate (size + magic bytes), create a draft post +
 *    media rows (status 'uploading'), return signed upload URLs.
 * 2. client uploads bytes directly to storage via the signed URLs.
 * 3. finalizeMedia — record derived variants + dimensions, flip to 'ready'.
 */

export interface UploadFileMeta {
  fileName: string;
  size: number;
  /** base64 of the first ~16 bytes, for server-side magic-byte sniffing. */
  headB64: string;
}

export interface SignedTarget {
  path: string;
  token: string;
}

export interface PreparedUpload {
  /** Position in the submitted files array, so the client can match results. */
  index: number;
  mediaId: string;
  kind: MediaKind;
  original: SignedTarget;
  thumb: SignedTarget | null;
  poster: SignedTarget | null;
}

export interface PrepareResult {
  ok: boolean;
  postId?: string;
  uploads?: PreparedUpload[];
  rejected?: { index: number; fileName: string; reason: string }[];
  error?: string;
}

export async function prepareUploadBatch(input: {
  categoryId: string;
  title: string;
  files: UploadFileMeta[];
}): Promise<PrepareResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "인증이 필요합니다." };

  if (!input.categoryId) return { ok: false, error: "카테고리를 선택해 주세요." };

  const accepted: {
    index: number;
    meta: UploadFileMeta;
    ext: string;
    kind: MediaKind;
    mime: string;
  }[] = [];
  const rejected: { index: number; fileName: string; reason: string }[] = [];
  input.files.forEach((f, index) => {
    const head = Uint8Array.from(Buffer.from(f.headB64, "base64"));
    const v = validateUpload({ fileName: f.fileName, size: f.size, head });
    if (!v.ok || !v.kind) {
      rejected.push({ index, fileName: f.fileName, reason: v.reason ?? "거부됨" });
    } else {
      accepted.push({
        index,
        meta: f,
        ext: v.ext,
        kind: v.kind,
        mime: v.sniffedMime ?? mimeForExt(v.ext) ?? "application/octet-stream",
      });
    }
  });
  if (accepted.length === 0) {
    return { ok: false, error: "업로드할 수 있는 파일이 없습니다.", rejected };
  }

  // Draft post — insert is refused by RLS unless the caller is an admin at AAL2.
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .insert({
      category_id: input.categoryId,
      title: input.title.trim() || "제목 없음",
      visibility: "family",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (postErr || !post) {
    return { ok: false, error: "게시물을 생성할 권한이 없습니다.", rejected };
  }

  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const uploads: PreparedUpload[] = [];

  for (const a of accepted) {
    const mediaId = crypto.randomUUID();
    const support = supportForExt(a.ext)!;
    const base = {
      siteId: SITE_ID,
      ownerId: user.id,
      postId: post.id,
      mediaId,
      ext: a.ext,
    };
    const originalPath = buildStoragePath(base);

    const { error: mediaErr } = await supabase.from("media").insert({
      id: mediaId,
      post_id: post.id,
      kind: a.kind,
      support,
      status: "uploading",
      ext: a.ext,
      mime: a.mime,
      storage_path: originalPath,
      original_name: a.meta.fileName,
    });
    if (mediaErr) {
      rejected.push({
        index: a.index,
        fileName: a.meta.fileName,
        reason: "미디어 레코드 생성 실패",
      });
      continue;
    }

    const original = await bucket.createSignedUploadUrl(originalPath);
    if (original.error || !original.data) {
      rejected.push({
        index: a.index,
        fileName: a.meta.fileName,
        reason: "업로드 URL 생성 실패",
      });
      continue;
    }

    // Derived-variant targets (client uploads webp only if it can generate one).
    const thumb = await bucket.createSignedUploadUrl(
      buildStoragePath({ ...base, variant: "thumb" }),
    );
    const poster =
      a.kind === "video"
        ? await bucket.createSignedUploadUrl(
            buildStoragePath({ ...base, variant: "poster" }),
          )
        : null;

    uploads.push({
      index: a.index,
      mediaId,
      kind: a.kind,
      original: { path: original.data.path, token: original.data.token },
      thumb:
        thumb.data && !thumb.error
          ? { path: thumb.data.path, token: thumb.data.token }
          : null,
      poster:
        poster && poster.data && !poster.error
          ? { path: poster.data.path, token: poster.data.token }
          : null,
    });
  }

  return { ok: true, postId: post.id, uploads, rejected };
}

export interface FinalizeInput {
  mediaId: string;
  thumbPath?: string | null;
  posterPath?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  failed?: boolean;
}

export async function finalizeMedia(
  input: FinalizeInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };

  const { error } = await supabase
    .from("media")
    .update({
      status: input.failed ? "failed" : "ready",
      thumb_path: input.thumbPath ?? null,
      poster_path: input.posterPath ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null,
    })
    .eq("id", input.mediaId);

  if (error) return { ok: false, error: "미디어 상태를 갱신하지 못했습니다." };

  revalidatePath("/", "layout");
  return { ok: true };
}
