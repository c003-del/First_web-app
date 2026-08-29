import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategories, getPostsByScope, getSiteSettings } from "@/lib/data";
import { MediaGallery } from "@/components/MediaGallery";

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ ownerSlug: string }>;
}) {
  const { ownerSlug } = await params;
  const site = await getSiteSettings();
  if (ownerSlug !== site.ownerSlug) notFound();

  const [cats, posts] = await Promise.all([
    getCategories("owner"),
    getPostsByScope("owner", 24),
  ]);
  const subCats = cats.filter((c) => !c.parentId);

  return (
    <div>
      <h1 className="text-3xl">{site.ownerLabel}</h1>

      {subCats.length > 0 ? (
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="하위 카테고리">
          {subCats.map((c) => (
            <Link
              key={c.id}
              href={`/${ownerSlug}/${c.slug}`}
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
