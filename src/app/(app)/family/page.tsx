import Link from "next/link";
import { getCategories, getPostsByScope } from "@/lib/data";
import { MediaGallery } from "@/components/MediaGallery";

export const metadata = { title: "가족" };

export default async function FamilyPage() {
  const [cats, posts] = await Promise.all([
    getCategories("family"),
    getPostsByScope("family", 24),
  ]);
  const subCats = cats.filter((c) => !c.parentId);

  return (
    <div>
      <h1 className="text-3xl">가족</h1>

      {subCats.length > 0 ? (
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="하위 카테고리">
          {subCats.map((c) => (
            <Link
              key={c.id}
              href={`/family/${c.slug}`}
              className="rounded-full border border-strong px-4 py-2 text-[14px] hover:bg-surface-1"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="mt-8">
        <MediaGallery posts={posts} />
      </div>
    </div>
  );
}
