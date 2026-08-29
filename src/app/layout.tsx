import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SITE_DEFAULTS } from "@/lib/config";
import { SiteFooter } from "@/components/SiteFooter";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the per-request CSP nonce so Next.js hydration scripts inherit trust.
  // Next.js automatically applies this to its built-in <script> tags when the
  // request carries the `x-nonce` header from middleware.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="ko">
      <head>
        {/*
          Pretendard via CDN keeps builds independent of a bundled binary.
          To self-host (recommended for production per the guidelines), drop
          PretendardVariable.woff2 into /public/fonts and wire next/font/local.
        */}
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          nonce={nonce}
        />
      </head>
      <body>
        <div className="flex min-h-dvh flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
