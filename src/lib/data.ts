import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, CategoryScope, Post } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { DEMO_CATEGORIES, DEMO_POSTS, DEMO_SITE } from "@/lib/demo-data";
import { SITE_DEFAULTS } from "@/lib/config";
import { signPaths } from "@/lib/storage";

/**
 * Data-access layer. Reads from Supabase (subject to RLS) when configured,
 * otherwise returns demo content so the UI is explorable. Every consumer is a
 * Server Component.
 *
 * Each function is wrapped in React `cache()` so repeated calls within a single
 * request (layout + generateMetadata + page) hit the DB only once.
 */

export interface SiteSettings {
  siteName: string;
  ownerLabel: string;
  ownerSlug: string;
  copyright: string;
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
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
});

export const getCategories = cache(
  async (scope?: CategoryScope): Promise<Category[]> => {
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
  },
);

export const getRecentPosts = cache(async (limit = 8): Promise<Post[]> => {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.slice(0, limit);

  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  return withSignedUrls(supabase, (data ?? []).map(rowToPost));
});

/**
 * Posts belonging to a scope (owner|family), across ALL categories in that
 * scope including sub-categories. Queries by scope directly rather than
 * post-filtering a global recent list.
 */
export const getPostsByScope = cache(
  async (scope: CategoryScope, limit = 24): Promise<Post[]> => {
    const supabase = await createClient();
    if (!supabase) {
      const catIds = new Set(
        DEMO_CATEGORIES.filter((c) => c.scope === scope).map((c) => c.id),
      );
      return DEMO_POSTS.filter((p) => catIds.has(p.categoryId)).slice(0, limit);
    }

    const { data } = await supabase
      .from("posts")
      .select(`${POST_SELECT}, category:categories!inner(scope)`)
      .eq("category.scope", scope)
      .order("created_at", { ascending: false })
      .limit(limit);

    return withSignedUrls(supabase, (data ?? []).map(rowToPost));
  },
);

export const getPostsByCategory = cache(
  async (
    scope: CategoryScope,
    categorySlug: string,
  ): Promise<{ category: Category | null; posts: Post[] }> => {
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

    return {
      category: rowToCategory(cat),
      posts: await withSignedUrls(supabase, (posts ?? []).map(rowToPost)),
    };
  },
);

export const getPostById = cache(async (id: string): Promise<Post | null> => {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.find((p) => p.id === id) ?? null;

  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const [post] = await withSignedUrls(supabase, [rowToPost(data)]);
  return post ?? null;
});

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

/**
 * Resolve short-lived signed display URLs for every media path in a batch and
 * attach them (url/thumbUrl/posterUrl). Mutates and returns the same posts.
 */
async function withSignedUrls(
  supabase: SupabaseClient,
  posts: Post[],
): Promise<Post[]> {
  const paths: string[] = [];
  for (const p of posts) {
    for (const m of p.media) {
      if (m.storagePath) paths.push(m.storagePath);
      if (m.thumbPath) paths.push(m.thumbPath);
      if (m.posterPath) paths.push(m.posterPath);
    }
  }
  const map = await signPaths(supabase, paths);
  if (map.size === 0) return posts;

  for (const p of posts) {
    for (const m of p.media) {
      if (m.storagePath) m.url = map.get(m.storagePath) ?? m.url;
      if (m.thumbPath) m.thumbUrl = map.get(m.thumbPath) ?? m.thumbUrl;
      if (m.posterPath) m.posterUrl = map.get(m.posterPath) ?? m.posterUrl;
    }
  }
  return posts;
}
