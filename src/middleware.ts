import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { CANONICAL_HOST, isSupabaseConfigured } from "@/lib/config";
import { buildCsp, generateNonce } from "@/lib/security";

/**
 * Enforce HTTPS + a single canonical host (guidelines §27). TLS is terminated
 * upstream (Vercel/Cloudflare), so we read the forwarded proto/host. Returns a
 * 308 redirect when a canonical host is configured and the request arrives on
 * the wrong host or over plain http; otherwise null (no-op in dev/preview).
 */
function canonicalRedirect(request: NextRequest): NextResponse | null {
  if (!CANONICAL_HOST) return null;

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");

  const hostMismatch = host !== "" && host !== CANONICAL_HOST;
  const insecure = proto === "http";
  if (!hostMismatch && !insecure) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https";
  url.host = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

/**
 * Route gating (guidelines §3, §8, §16):
 *   - unauthenticated        → /login
 *   - authenticated, AAL1    → /mfa/verify  (MFA not yet completed)
 *   - authenticated, AAL2    → allowed
 *   - /admin/*               → requires AAL2 here; the admin layout additionally
 *                              re-checks the admin role on the server.
 *
 * Hiding /admin is NOT treated as security — it is enforced, not obscured.
 * In demo mode (no Supabase env) the app renders publicly so the UI is
 * explorable; a banner makes that explicit.
 *
 * Security headers (guidelines §20): a per-request nonce drives a strict CSP.
 * The nonce rides on the request headers so Next.js stamps its own scripts;
 * the CSP is also written to every response. Static headers live in
 * next.config.mjs.
 */

const PUBLIC_PREFIXES = ["/login", "/mfa", "/recovery", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  // Canonical host + HTTPS first, before any auth work.
  const canonical = canonicalRedirect(request);
  if (canonical) return canonical;

  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Forward the nonce + CSP on the request so Next.js can nonce its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const finalize = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  // Demo mode: no Supabase configured, so there is no auth to enforce. Let
  // everything render so the design is explorable. Keyed on configuration —
  // NOT on cookie presence — so a real deploy always gates unauthenticated
  // visitors regardless of whether they carry stale cookies.
  if (!isSupabaseConfigured()) {
    return finalize(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  const { response, isAuthenticated, aal } = await updateSession(
    request,
    requestHeaders,
  );
  const { pathname } = request.nextUrl;

  if (!isAuthenticated) {
    if (isPublic(pathname)) return finalize(response);
    return finalize(redirect(request, "/login"));
  }

  // Authenticated but has not completed MFA.
  if (aal !== "aal2") {
    if (pathname.startsWith("/mfa") || pathname.startsWith("/auth")) {
      return finalize(response);
    }
    return finalize(redirect(request, "/mfa/verify"));
  }

  // AAL2 users landing on auth pages get bounced home.
  if (pathname === "/login" || pathname === "/mfa/verify") {
    return finalize(redirect(request, "/"));
  }

  // /admin requires AAL2 (checked above). Role is re-verified in the layout.
  return finalize(response);
}

function redirect(request: NextRequest, to: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except static assets and image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
