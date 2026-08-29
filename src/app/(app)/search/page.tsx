import Link from "next/link";
import { getCategories, searchPosts, type PostFilters } from "@/lib/data";
import { MediaGallery } from "@/components/MediaGallery";
import { EmptyState } from "@/components/EmptyState";

export const metadata = { title: "검색" };

/**
 * Server-rendered search + filter page. URL query params are the source of
 * truth so results survive refresh and can be bookmarked (guidelines §9).
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [posts, ownerCats, familyCats] = await Promise.all([
    searchPosts(filters),
    getCategories("owner"),
    getCategories("family"),
  ]);

  return (
    <div>
      <h1 className="text-2xl">검색</h1>

      <form
        method="get"
        className="mt-5 grid gap-3 rounded-lg border border-soft bg-surface-1 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="text-[12px] text-ink-secondary">검색어</span>
          <input
            name="q"
            defaultValue={filters.query ?? ""}
            placeholder="제목·캡션에서 찾기"
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2.5 text-[15px]"
          />
        </label>

        <label className="block">
          <span className="text-[12px] text-ink-secondary">범위</span>
          <select
            name="scope"
            defaultValue={filters.scope ?? ""}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
          >
            <option value="">모두</option>
            <option value="owner">개인</option>
            <option value="family">가족</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[12px] text-ink-secondary">카테고리</span>
          <select
            name="cat"
            defaultValue={filters.categoryId ?? ""}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
          >
            <option value="">모두</option>
            <optgroup label="개인">
              {ownerCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="가족">
              {familyCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="block">
          <span className="text-[12px] text-ink-secondary">종류</span>
          <select
            name="kind"
            defaultValue={filters.kind ?? ""}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
          >
            <option value="">모두</option>
            <option value="image">사진</option>
            <option value="video">영상</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[12px] text-ink-secondary">정렬</span>
          <select
            name="sort"
            defaultValue={filters.sort ?? "newest"}
            className="mt-1 w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된 순</option>
            <option value="taken">촬영일순</option>
          </select>
        </label>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-accent-primary px-4 py-2.5 text-[14px] text-surface-solid hover:bg-accent-primary-hover"
          >
            적용
          </button>
          <Link
            href="/search"
            className="rounded-md border border-strong px-4 py-2.5 text-[14px]"
          >
            초기화
          </Link>
        </div>
      </form>

      <div className="mt-8">
        {posts.length === 0 ? (
          <EmptyState
            title="검색 결과가 없어요."
            hint="검색어를 바꾸거나 필터를 해제해 보세요."
          />
        ) : (
          <>
            <p className="mb-4 text-[13px] text-ink-muted">
              결과 {posts.length}개
            </p>
            <MediaGallery posts={posts} />
          </>
        )}
      </div>
    </div>
  );
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): PostFilters {
  const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const scope = one(sp.scope);
  const kind = one(sp.kind);
  const sort = one(sp.sort);
  return {
    query: one(sp.q),
    scope: scope === "owner" || scope === "family" ? scope : undefined,
    categoryId: one(sp.cat) || undefined,
    kind: kind === "image" || kind === "video" ? kind : undefined,
    sort:
      sort === "oldest" || sort === "taken" || sort === "newest"
        ? sort
        : undefined,
  };
}
