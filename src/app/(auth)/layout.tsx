import Link from "next/link";
import { SITE_DEFAULTS } from "@/lib/config";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 text-center text-[17px] font-semibold">
        {SITE_DEFAULTS.siteName}
      </Link>
      {children}
    </div>
  );
}
