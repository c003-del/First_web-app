import type { Metadata, Viewport } from "next";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
