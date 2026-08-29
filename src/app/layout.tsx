import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_DEFAULTS } from "@/lib/config";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Self-hosted Pretendard (guidelines §7). Drop the provided
 * PretendardVariable.woff2 into /public/fonts to override the bundled copy —
 * no code change needed. `display: "swap"` + a system fallback (globals.css)
 * keeps text visible if the font is slow or missing.
 */
const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  style: "normal",
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: {
    default: SITE_DEFAULTS.siteName,
    template: `%s · ${SITE_DEFAULTS.siteName}`,
  },
  description: "초대받은 가족만 볼 수 있는 비공개 사진·영상 아카이브.",
  // Private archive: never index, never follow.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  themeColor: "#fcfaf5",
  width: "device-width",
  initialScale: 1,
};

/**
 * Render dynamically so the per-request CSP nonce (middleware.ts) is stamped
 * onto every Next.js script tag. Under `script-src '... strict-dynamic'`,
 * scripts without a matching nonce are blocked — a statically-prerendered page
 * would ship nonce-less scripts and break. This app is private and runs auth
 * middleware on every request anyway, so static optimization buys nothing here.
 */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        <div className="flex min-h-dvh flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
