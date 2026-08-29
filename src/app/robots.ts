import type { MetadataRoute } from "next";

/**
 * Private archive — disallow all crawling (guidelines §21). This complements,
 * and never replaces, auth: robots.txt is advisory, so real protection comes
 * from login + MFA + RLS. Per-page `noindex, nofollow` is set in layout.tsx.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
