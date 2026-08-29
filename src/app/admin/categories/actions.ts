"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidSlug, normalizeSlug } from "@/lib/slug";
import type { CategoryScope } from "@/lib/types";

/**
 * Categories CRUD (guidelines §18). All writes go through the user's session
 * client, so RLS (`can_write` = admin + AAL2) is the real authorization gate;
 * this action layer only shapes the operation and re-validates slugs.
 */

interface Result {
  ok: boolean;
  error?: string;
}

function validScope(scope: unknown): scope is CategoryScope {
  return scope === "owner" || scope === "family";
}

export async function createCategory(input: {
  scope: CategoryScope;
  name: string;
  slug: string;
  description?: string;
}): Promise<Result> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };
  if (!validScope(input.scope)) return { ok: false, error: "잘못된 범위입니다." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "이름을 입력해 주세요." };

  const slug = normalizeSlug(input.slug || input.name);
  if (!isValidSlug(slug)) {
    return { ok: false, error: "사용할 수 없는 slug입니다." };
  }

  const { error } = await supabase.from("categories").insert({
    scope: input.scope,
    name,
    slug,
    description: input.description?.trim() || null,
  });
  if (error) return { ok: false, error: "저장 권한이 없거나 slug가 중복입니다." };

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCategory(input: {
  id: string;
  name?: string;
  slug?: string;
  description?: string | null;
  sort?: number;
}): Promise<Result> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };
  if (!input.id) return { ok: false, error: "id가 필요합니다." };

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) return { ok: false, error: "이름을 비울 수 없습니다." };
    patch.name = n;
  }
  if (input.slug !== undefined) {
    const s = normalizeSlug(input.slug);
    if (!isValidSlug(s)) return { ok: false, error: "사용할 수 없는 slug입니다." };
    patch.slug = s;
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.sort !== undefined && Number.isFinite(input.sort)) {
    patch.sort = Math.round(input.sort);
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", input.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "저장 권한이 없거나 slug가 중복입니다." };
  if (!data) return { ok: false, error: "카테고리를 찾을 수 없습니다." };

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<Result> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase가 연결되지 않았습니다." };
  if (!id) return { ok: false, error: "id가 필요합니다." };

  // Refuse deletion when this OR any descendant category still has posts —
  // ON DELETE CASCADE on categories would otherwise wipe children and
  // silently null their posts' category_id.
  const targets = await collectCategorySubtree(supabase, id);

  // Count includes soft-deleted posts so a future restore does not lose
  // its category assignment.
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .in("category_id", targets);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `이 카테고리(하위 포함)에 게시물 ${count}개가 있어 삭제할 수 없습니다. 먼저 다른 카테고리로 옮겨 주세요.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: "삭제 권한이 없습니다." };

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** BFS through categories.parent_id to gather this category + all descendants. */
async function collectCategorySubtree(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rootId: string,
): Promise<string[]> {
  if (!supabase) return [rootId];
  const seen = new Set<string>([rootId]);
  let frontier: string[] = [rootId];
  while (frontier.length > 0) {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .in("parent_id", frontier);
    const next: string[] = [];
    for (const row of data ?? []) {
      if (typeof row.id === "string" && !seen.has(row.id)) {
        seen.add(row.id);
        next.push(row.id);
      }
    }
    frontier = next;
  }
  return [...seen];
}
