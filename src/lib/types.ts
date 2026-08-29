/** Shared domain types. Mirrors the DB schema in supabase/migrations. */

export type Role = "owner" | "admin" | "family" | "viewer";

export type CategoryScope = "owner" | "family";

export type MediaKind = "image" | "video";

/**
 * Whether a given uploaded file can be shown in the browser as-is, needs a
 * derived preview, or can only be archived (original download only).
 * See guidelines §12.1.
 */
export type MediaSupport = "web-native" | "needs-conversion" | "archive-only";

export type MediaStatus =
  | "draft"
  | "uploading"
  | "uploaded"
  | "validating"
  | "processing"
  | "ready"
  | "failed"
  | "quarantined"
  | "deleted";

export interface Category {
  id: string;
  parentId: string | null;
  scope: CategoryScope;
  name: string;
  slug: string;
  sort: number;
  description?: string | null;
}

export interface MediaItem {
  id: string;
  postId: string;
  kind: MediaKind;
  support: MediaSupport;
  status: MediaStatus;
  ext: string;
  mime: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  /** Storage path only — never a signed URL (guidelines §5, §15). */
  storagePath: string;
  thumbPath?: string | null;
  posterPath?: string | null;
  /**
   * Short-lived signed display URLs resolved at read time (never persisted).
   * Populated by the data layer when Supabase is connected; in demo mode the
   * *Path fields already hold absolute placeholder URLs.
   */
  url?: string | null;
  thumbUrl?: string | null;
  posterUrl?: string | null;
  /** Placeholder for skeleton/blur — dominant color or tiny data URL. */
  placeholder?: string | null;
  alt?: string | null;
  sort: number;
}

export type PostVisibility = "private" | "family" | "owner";

export interface Post {
  id: string;
  categoryId: string;
  title: string;
  caption?: string | null;
  takenAt?: string | null;
  visibility?: PostVisibility;
  createdAt: string;
  media: MediaItem[];
}
