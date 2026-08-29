import "server-only";
import type { Category, CategoryScope, Post } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { DEMO_CATEGORIES, DEMO_POSTS, DEMO_SITE } from "@/lib/demo-data";
import { SITE_DEFAULTS } from "@/lib/config";

/**
 * Data-access layer. Reads from Supabase (subject to RLS) when configured,
 * otherwise returns demo content so the UI is explorable. Every consumer is a
 * Server Component, so nothing here reaches the client bundle.
 */

export interface SiteSettings {
  siteName: string;
  ownerLabel: string;
  ownerSlug: string;
  copyright: string;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient();
  if (!supabase) return DEMO_SITE;

  const { data } = await supabase
    .from("site_settings")
    .select("site_name, owner_label, owner_slug, copyright")
    .eq("id", 1)
    .maybeSingle();

  if (!data) return { ...SITE_DEFAULTS };
  return {
    siteName: data.site_name ?? SITE_DEFAULTS.siteName,
    ownerLabel: data.owner_label ?? SITE_DEFAULTS.ownerLabel,
    ownerSlug: data.owner_slug ?? SITE_DEFAULTS.ownerSlug,
    copyright: data.copyright ?? SITE_DEFAULTS.copyright,
  };
}

export async function getCategories(scope?: CategoryScope): Promise<Category[]> {
  const supabase = await createClient();
  if (!supabase) {
    return DEMO_CATEGORIES.filter((c) => !scope || c.scope === scope).sort(
      (a, b) => a.sort - b.sort,
    );
  }

  let query = supabase
    .from("categories")
    .select("id, parent_id, scope, name, slug, sort, description")
    .order("sort", { ascending: true });
  if (scope) query = query.eq("scope", scope);

  const { data } = await query;
  return (data ?? []).map(rowToCategory);
}

export async function getRecentPosts(limit = 8): Promise<Post[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.slice(0, limit);

  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(rowToPost);
}

export async function getPostsByCategory(
  scope: CategoryScope,
  categorySlug: string,
): Promise<{ category: Category | null; posts: Post[] }> {
  const supabase = await createClient();
  if (!supabase) {
    const category =
      DEMO_CATEGORIES.find(
        (c) => c.scope === scope && c.slug === categorySlug,
      ) ?? null;
    const posts = category
      ? DEMO_POSTS.filter((p) => p.categoryId === category.id)
      : [];
    return { category, posts };
  }

  const { data: cat } = await supabase
    .from("categories")
    .select("id, parent_id, scope, name, slug, sort, description")
    .eq("scope", scope)
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!cat) return { category: null, posts: [] };

  const { data: posts } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("category_id", cat.id)
    .order("created_at", { ascending: false });

  return { category: rowToCategory(cat), posts: (posts ?? []).map(rowToPost) };
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.find((p) => p.id === id) ?? null;

  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();

  return data ? rowToPost(data) : null;
}

/* ----------------------------- row mappers ------------------------------ */

const POST_SELECT = `
  id, category_id, title, caption, taken_at, created_at,
  media:media (
    id, post_id, kind, support, status, ext, mime, width, height,
    duration_seconds, storage_path, thumb_path, poster_path, placeholder,
    alt, sort
  )
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToCategory(r: any): Category {
  return {
    id: r.id,
    parentId: r.parent_id,
    scope: r.scope,
    name: r.name,
    slug: r.slug,
    sort: r.sort ?? 0,
    description: r.description ?? null,
  };
}

function rowToPost(r: any): Post {
  const media = (r.media ?? [])
    .filter((m: any) => m.status === "ready")
    .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((m: any) => ({
      id: m.id,
      postId: m.post_id,
      kind: m.kind,
      support: m.support,
      status: m.status,
      ext: m.ext,
      mime: m.mime,
      width: m.width,
      height: m.height,
      durationSeconds: m.duration_seconds,
      storagePath: m.storage_path,
      thumbPath: m.thumb_path,
      posterPath: m.poster_path,
      placeholder: m.placeholder,
      alt: m.alt,
      sort: m.sort ?? 0,
    }));

  return {
    id: r.id,
    categoryId: r.category_id,
    title: r.title,
    caption: r.caption,
    takenAt: r.taken_at,
    createdAt: r.created_at,
    media,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
