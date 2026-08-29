import type { MediaKind, MediaSupport } from "@/lib/types";

/**
 * Media format policy (guidelines §12).
 *
 * We deliberately DO NOT promise in-browser playback for every extension.
 * Files are classified into three tiers:
 *   - web-native      → shown/played directly
 *   - needs-conversion→ stored, but a derived preview/poster is required to show
 *   - archive-only    → stored & downloadable; no preview guaranteed
 *
 * SVG is blocked entirely (XSS / external-resource risk).
 */

export const WEB_NATIVE_IMAGE = ["jpg", "jpeg", "png", "webp", "avif", "gif"];
export const WEB_NATIVE_VIDEO = ["mp4", "webm"]; // assumes H.264/AAC or VP9

export const NEEDS_CONVERSION_IMAGE = ["heic", "heif", "bmp", "tif", "tiff"];
export const NEEDS_CONVERSION_VIDEO = ["mov", "m4v"];

export const ARCHIVE_ONLY_IMAGE = [
  "dng",
  "cr2",
  "cr3",
  "nef",
  "arw",
  "raf",
  "orf",
  "rw2",
];
export const ARCHIVE_ONLY_VIDEO = [
  "mkv",
  "avi",
  "wmv",
  "flv",
  "mts",
  "m2ts",
  "3gp",
  "hevc",
];

/** Extensions we refuse outright. */
export const BLOCKED = new Set(["svg", "svgz", "xml", "html", "htm"]);

const ALL_IMAGE = new Set([
  ...WEB_NATIVE_IMAGE,
  ...NEEDS_CONVERSION_IMAGE,
  ...ARCHIVE_ONLY_IMAGE,
]);
const ALL_VIDEO = new Set([
  ...WEB_NATIVE_VIDEO,
  ...NEEDS_CONVERSION_VIDEO,
  ...ARCHIVE_ONLY_VIDEO,
]);

export function normalizeExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "";
  return fileName.slice(dot + 1).toLowerCase().trim();
}

export function kindForExt(ext: string): MediaKind | null {
  if (ALL_IMAGE.has(ext)) return "image";
  if (ALL_VIDEO.has(ext)) return "video";
  return null;
}

export function supportForExt(ext: string): MediaSupport | null {
  if (WEB_NATIVE_IMAGE.includes(ext) || WEB_NATIVE_VIDEO.includes(ext)) {
    return "web-native";
  }
  if (
    NEEDS_CONVERSION_IMAGE.includes(ext) ||
    NEEDS_CONVERSION_VIDEO.includes(ext)
  ) {
    return "needs-conversion";
  }
  if (ARCHIVE_ONLY_IMAGE.includes(ext) || ARCHIVE_ONLY_VIDEO.includes(ext)) {
    return "archive-only";
  }
  return null;
}

export interface ClassificationResult {
  ok: boolean;
  ext: string;
  kind?: MediaKind;
  support?: MediaSupport;
  reason?: string;
}

/**
 * Client-side first-pass classification. This is a UX filter, NOT security —
 * the server must re-check MIME and magic bytes before accepting the file
 * (guidelines §12.3).
 */
export function classifyFile(fileName: string): ClassificationResult {
  const ext = normalizeExt(fileName);
  if (!ext) return { ok: false, ext, reason: "확장자를 확인할 수 없습니다." };
  if (BLOCKED.has(ext)) {
    return { ok: false, ext, reason: "보안상 허용되지 않는 형식입니다." };
  }
  const kind = kindForExt(ext);
  const support = supportForExt(ext);
  if (!kind || !support) {
    return { ok: false, ext, reason: "지원하지 않는 형식입니다." };
  }
  return { ok: true, ext, kind, support };
}

/** Human-readable notice shown next to a file before upload. */
export function supportNotice(support: MediaSupport): string {
  switch (support) {
    case "web-native":
      return "바로 표시할 수 있는 형식입니다.";
    case "needs-conversion":
      return "원본은 보관되며, 미리보기를 위해 변환본이 생성됩니다.";
    case "archive-only":
      return "원본은 안전하게 보관되지만 브라우저 미리보기는 보장되지 않습니다.";
  }
}

/** Default size limits (MVP). Confirm against the active plan before raising. */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB

/** Canonical MIME per extension (used when magic-byte sniffing is unavailable). */
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
};

export function mimeForExt(ext: string): string | null {
  return MIME_BY_EXT[ext] ?? null;
}
