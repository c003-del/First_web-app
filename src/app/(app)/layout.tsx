import { SiteNav, type NavCategory } from "@/components/SiteNav";
import { getCategories, getSiteSettings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/config";

/**
 * Shell for content pages: data-driven navigation built from the `categories`
 * table (never hard-coded — guidelines §3). Auth and /admin live in their own
 * layouts.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, owner, family] = await Promise.all([
    getSiteSettings(),
    getCategories("owner"),
    getCategories("family"),
  ]);

  const toNav = (name: string, slug: string): NavCategory => ({ name, slug });
  const ownerCats = owner
    .filter((c) => !c.parentId)
    .map((c) => toNav(c.name, c.slug));
  const familyCats = family
    .filter((c) => !c.parentId)
    .map((c) => toNav(c.name, c.slug));

  return (
    <>
      <SiteNav
        siteName={site.siteName}
        ownerLabel={site.ownerLabel}
        ownerSlug={site.ownerSlug}
        ownerCategories={ownerCats}
        familyCategories={familyCats}
        demo={!isSupabaseConfigured()}
      />
      <main className="mx-auto max-w-content px-5 py-8">{children}</main>
    </>
  );
}
