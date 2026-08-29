import { SITE_DEFAULTS } from "@/lib/config";

/**
 * Mandatory copyright footer, present on every page (guidelines §19).
 * The year is computed at render time; the label is admin-editable via
 * `site_settings.copyright` once the DB is connected.
 */
export function SiteFooter({ label }: { label?: string }) {
  const year = new Date().getFullYear();
  const owner = label ?? SITE_DEFAULTS.copyright;

  return (
    <footer className="mt-16 border-t border-soft px-5 py-8 text-center text-[13px] text-ink-muted">
      <p>
        © {year} {owner}. All rights reserved.
      </p>
    </footer>
  );
}
