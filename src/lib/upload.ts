import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  classifyFile,
  kindForExt,
} from "@/lib/media";
import type { MediaKind } from "@/lib/types";

/**
 * Server-side upload validation (guidelines §12.3). The client's extension
 * filter is only UX; the trusted path re-checks size, sniffs magic bytes, and
 * rejects extension/content mismatches before a file is accepted.
 */

/** Detect a container/format from the leading bytes. Returns a coarse MIME. */
export function sniffMime(bytes: Uint8Array): string | null {
  const b = bytes;
  const has = (sig: number[], offset = 0) =>
    sig.every((v, i) => b[offset + i] === v);
  const ascii = (s: string, offset = 0) =>
    [...s].every((c, i) => b[offset + i] === c.charCodeAt(0));

  // Images
  if (has([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (has([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii("GIF87a") || ascii("GIF89a")) return "image/gif";
  if (ascii("RIFF") && ascii("WEBP", 8)) return "image/webp";
  if (has([0x42, 0x4d])) return "image/bmp";
  if (has([0x49, 0x49, 0x2a, 0x00]) || has([0x4d, 0x4d, 0x00, 0x2a]))
    return "image/tiff";
  // HEIC/HEIF and MP4/MOV share the ISO-BMFF 'ftyp' box at offset 4.
  if (ascii("ftyp", 4)) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (brand.startsWith("hei") || brand.startsWith("mif")) return "image/heic";
    if (brand === "qt  ") return "video/quicktime";
    return "video/mp4"; // isom, mp42, M4V , etc.
  }
  // Videos
  if (has([0x1a, 0x45, 0xdf, 0xa3])) return "video/webm"; // also matroska
  if (ascii("RIFF") && ascii("AVI ", 8)) return "video/x-msvideo";

  return null;
}

/** Which sniffed MIMEs are consistent with a declared media kind. */
function mimeMatchesKind(mime: string, kind: MediaKind): boolean {
  return mime.startsWith(kind === "image" ? "image/" : "video/");
}

export interface UploadCandidate {
  fileName: string;
  size: number;
  /** First ~16 bytes of the file for magic-byte sniffing. */
  head: Uint8Array;
}

export interface UploadValidation {
  ok: boolean;
  ext: string;
  kind?: MediaKind;
  sniffedMime?: string | null;
  reason?: string;
}

export function validateUpload(c: UploadCandidate): UploadValidation {
  const cls = classifyFile(c.fileName);
  if (!cls.ok) return { ok: false, ext: cls.ext, reason: cls.reason };

  const kind = cls.kind!;
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (c.size <= 0) {
    return { ok: false, ext: cls.ext, kind, reason: "빈 파일입니다." };
  }
  if (c.size > limit) {
    return {
      ok: false,
      ext: cls.ext,
      kind,
      reason: `파일이 너무 큽니다. (최대 ${Math.round(limit / (1024 * 1024))}MB)`,
    };
  }

  const sniffed = sniffMime(c.head);
  // Archive-only formats (RAW, exotic containers) have no reliable signature
  // here; accept them on extension since they are stored, not rendered.
  if (cls.support !== "archive-only") {
    if (!sniffed || !mimeMatchesKind(sniffed, kind)) {
      return {
        ok: false,
        ext: cls.ext,
        kind,
        sniffedMime: sniffed,
        reason: "파일 내용이 확장자와 일치하지 않습니다.",
      };
    }
  }

  return { ok: true, ext: cls.ext, kind, sniffedMime: sniffed };
}

/** Deterministic storage path (guidelines §12.4). */
export function buildStoragePath(parts: {
  siteId: string;
  ownerId: string;
  postId: string;
  mediaId: string;
  ext: string;
  variant?: "original" | "preview" | "thumb" | "poster";
}): string {
  const variant = parts.variant ?? "original";
  const ext = variant === "original" ? parts.ext : "webp";
  return `${parts.siteId}/${parts.ownerId}/${parts.postId}/${parts.mediaId}/${variant}.${ext}`;
}

export { kindForExt };
