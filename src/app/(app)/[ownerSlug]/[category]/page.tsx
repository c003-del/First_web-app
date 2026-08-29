import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostsByCategory, getSiteSettings } from "@/lib/data";
import { MediaGallery } from "@/components/MediaGallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ownerSlug: string; category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const { category: cat } = await getPostsByCategory("owner", category);
  return { title: cat?.name ?? "카테고리" };
}

export default async function OwnerCategoryPage({
  params,
}: {
  params: Promise<{ ownerSlug: string; category: string }>;
}) {
  const { ownerSlug, category } = await params;
  const site = await getSiteSettings();
  if (ownerSlug !== site.ownerSlug) notFound();

  const { category: cat, posts } = await getPostsByCategory("owner", category);
  if (!cat) notFound();

  return (
    <div>
      <p className="text-[13px] text-ink-muted">{site.ownerLabel}</p>
      <h1 className="mt-1 text-3xl">{cat.name}</h1>
      {cat.description ? (
        <p className="mt-2 text-ink-secondary">{cat.description}</p>
      ) : null}
      <div className="mt-8">
        <MediaGallery posts={posts} />
      </div>
    </div>
  );
}
