import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostsByCategory } from "@/lib/data";
import { MediaGallery } from "@/components/MediaGallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const { category: cat } = await getPostsByCategory("family", category);
  return { title: cat ? `가족 · ${cat.name}` : "가족" };
}

export default async function FamilyCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const { category: cat, posts } = await getPostsByCategory("family", category);
  if (!cat) notFound();

  return (
    <div>
      <p className="text-[13px] text-ink-muted">가족</p>
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
