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

  return withSignedUrls(supabase, (data ?? []).map(rowToPost), {
    coverOnly: true,
  });
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

    return withSignedUrls(supabase, (data ?? []).map(rowToPost), {
      coverOnly: true,
    });
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
      posts: await withSignedUrls(supabase, (posts ?? []).map(rowToPost), {
        coverOnly: true,
      }),
    };
  },
);

export interface PostFilters {
  scope?: CategoryScope;
  categoryId?: string;
  kind?: "image" | "video";
  query?: string;
  year?: number;
  sort?: "newest" | "oldest" | "taken";
  limit?: number;
}

/**
 * Filtered listing used by the search/filter UI. Applies criteria at query
 * time (indexed columns) then relies on withSignedUrls to resolve display
 * URLs. Kind ("image"/"video") is post-filtered so we only surface posts that
 * carry media of the requested type. Not memoized by React `cache()` because
 * callers pass fresh object literals — the identity key would never hit.
 */
export async function searchPosts(filters: PostFilters = {}): Promise<Post[]> {
    const supabase = await createClient();
    if (!supabase) {
      const catIds = new Set(
        filters.scope
          ? DEMO_CATEGORIES.filter((c) => c.scope === filters.scope).map(
              (c) => c.id,
            )
          : DEMO_CATEGORIES.map((c) => c.id),
      );
      let posts = DEMO_POSTS.filter((p) => catIds.has(p.categoryId));
      posts = applyClientFilters(posts, filters);
      return posts.slice(0, filters.limit ?? 40);
    }

    const selectExpr = filters.scope
      ? `${POST_SELECT}, category:categories!inner(scope)`
      : POST_SELECT;
    let q = supabase.from("posts").select(selectExpr);

    if (filters.scope) q = q.eq("category.scope", filters.scope);
    if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
    if (filters.query) {
      // Slice raw input FIRST, then escape SQL LIKE metachars, then wrap in
      // PostgREST double-quotes so parens/commas/dots inside the term can't
      // close the .or() group or inject sibling filters.
      const raw = filters.query.trim().slice(0, 80);
      if (raw) {
        const pat = pgrstQuote(`%${escapeIlike(raw)}%`);
        q = q.or(`title.ilike.${pat},caption.ilike.${pat}`);
      }
    }
    if (typeof filters.year === "number" && Number.isFinite(filters.year)) {
      const y = Math.round(filters.year);
      q = q
        .gte("created_at", `${y}-01-01`)
        .lt("created_at", `${y + 1}-01-01`);
    }

    const order =
      filters.sort === "oldest"
        ? { column: "created_at", ascending: true }
        : filters.sort === "taken"
          ? { column: "taken_at", ascending: false }
          : { column: "created_at", ascending: false };
    q = q.order(order.column, {
      ascending: order.ascending,
      nullsFirst: false,
    });
    q = q.limit(filters.limit ?? 40);

    const { data } = await q;
    let posts = (data ?? []).map(rowToPost);
    if (filters.kind) {
      posts = posts.filter((p) =>
        p.media.some((m) => m.kind === filters.kind),
      );
    }
    return withSignedUrls(supabase, posts, { coverOnly: true });
}

function applyClientFilters(posts: Post[], f: PostFilters): Post[] {
  let out = posts;
  if (f.query) {
    const q = f.query.toLowerCase();
    out = out.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.caption ?? "").toLowerCase().includes(q),
    );
  }
  if (f.kind) out = out.filter((p) => p.media.some((m) => m.kind === f.kind));
  if (typeof f.year === "number") {
    out = out.filter((p) => new Date(p.createdAt).getFullYear() === f.year);
  }
  if (f.categoryId) out = out.filter((p) => p.categoryId === f.categoryId);
  if (f.sort === "oldest") {
    out = [...out].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (f.sort === "taken") {
    out = [...out].sort((a, b) =>
      (b.takenAt ?? "").localeCompare(a.takenAt ?? ""),
    );
  } else {
    out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return out;
}

/**
 * Escape the SQL LIKE metachars so a user's query can't inject wildcards.
 * The `,`, `(`, `)`, and `"` characters are NOT SQL wildcards — they are
 * PostgREST filter delimiters and are handled separately by `pgrstQuote`.
 */
function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => "\\" + m);
}

/**
 * Wrap a value for a PostgREST filter (e.g. inside `.or(title.ilike.<here>)`)
 * so `(`, `)`, `,`, `.`, and `:` inside the value do not terminate the
 * expression. Backslash and double-quote inside the value are escaped.
 */
function pgrstQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Editable text blocks, keyed by their stable string id.
 * Pass an explicit list of keys to fetch only what the page needs; omit for
 * the whole table (admin/texts uses this).
 */
export const getTextBlocks = cache(
  async (keys?: readonly string[]): Promise<Map<string, string>> => {
    const supabase = await createClient();
    const map = new Map<string, string>();
    if (!supabase) return map;

    let q = supabase.from("text_blocks").select("key, value");
    if (keys && keys.length > 0) q = q.in("key", keys as string[]);

    const { data } = await q;
    for (const row of data ?? []) {
      if (typeof row.key === "string" && typeof row.value === "string") {
        map.set(row.key, row.value);
      }
    }
    return map;
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
  id, category_id, title, caption, taken_at, visibility, created_at,
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
    visibility: r.visibility,
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
  opts: { coverOnly?: boolean } = {},
): Promise<Post[]> {
  const coverOnly = opts.coverOnly ?? false;
  const paths: string[] = [];
  for (const p of posts) {
    // List views render only the cover thumbnail, so sign just that — and
    // prefer the thumbnail over the full-resolution original to avoid handing
    // out signed originals that never get displayed.
    const media = coverOnly ? p.media.slice(0, 1) : p.media;
    for (const m of media) {
      // In coverOnly mode we still sign storagePath + posterPath alongside
      // the thumbnail so the click-to-open lightbox has a working full-res URL
      // (and a poster for videos) without a second round-trip.
      if (m.storagePath) paths.push(m.storagePath);
      if (m.thumbPath) paths.push(m.thumbPath);
      if (m.posterPath) paths.push(m.posterPath);
    }
  }
  const map = await signPaths(supabase, paths);
  if (map.size === 0) return posts;

  for (const p of posts) {
    for (const m of p.media) {
      if (m.storagePath && map.has(m.storagePath)) m.url = map.get(m.storagePath);
      if (m.thumbPath && map.has(m.thumbPath)) m.thumbUrl = map.get(m.thumbPath);
      if (m.posterPath && map.has(m.posterPath))
        m.posterUrl = map.get(m.posterPath);
    }
  }
  return posts;
}
