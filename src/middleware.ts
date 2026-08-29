import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/config";
import {
  buildCsp,
  generateNonce,
  STATIC_SECURITY_HEADERS,
} from "@/lib/security-headers";

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
 * Every response also carries a fresh CSP nonce header (`x-nonce`, echoed into
 * the response's Content-Security-Policy) so Next.js's hydration scripts can
 * pick it up and third-party inline JS is rejected.
 */

const PUBLIC_PREFIXES = ["/login", "/mfa", "/recovery", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Request-side headers so server components can read the nonce via headers().
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Demo mode: no Supabase configured, so there is no auth to enforce. Let
  // everything render so the design is explorable. Keyed on configuration —
  // NOT on cookie presence — so a real deploy always gates unauthenticated
  // visitors regardless of whether they carry stale cookies.
  if (!isSupabaseConfigured()) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  const { response, isAuthenticated, aal } = await updateSession(
    request,
    requestHeaders,
  );
  const { pathname } = request.nextUrl;

  if (!isAuthenticated) {
    if (isPublic(pathname)) return withSecurityHeaders(response, csp);
    return withSecurityHeaders(redirect(request, "/login"), csp);
  }

  // Authenticated but has not completed MFA.
  if (aal !== "aal2") {
    if (pathname.startsWith("/mfa") || pathname.startsWith("/auth")) {
      return withSecurityHeaders(response, csp);
    }
    return withSecurityHeaders(redirect(request, "/mfa/verify"), csp);
  }

  // AAL2 users landing on auth pages get bounced home.
  if (pathname === "/login" || pathname === "/mfa/verify") {
    return withSecurityHeaders(redirect(request, "/"), csp);
  }

  // /admin requires AAL2 (checked above). Role is re-verified in the layout.
  return withSecurityHeaders(response, csp);
}

function withSecurityHeaders(res: NextResponse, csp: string): NextResponse {
  res.headers.set("Content-Security-Policy", csp);
  for (const [k, v] of STATIC_SECURITY_HEADERS) res.headers.set(k, v);
  return res;
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
