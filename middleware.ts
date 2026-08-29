import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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
 */

const PUBLIC_PREFIXES = ["/login", "/mfa", "/recovery", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { response, isAuthenticated, aal } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Demo mode: updateSession reports unauthenticated but we don't have auth to
  // enforce. Let everything render so the design is explorable.
  if (aal === null && !isAuthenticated && !hasSupabaseCookies(request)) {
    return response;
  }

  if (!isAuthenticated) {
    if (isPublic(pathname)) return response;
    return redirect(request, "/login");
  }

  // Authenticated but has not completed MFA.
  if (aal !== "aal2") {
    if (pathname.startsWith("/mfa") || pathname.startsWith("/auth")) {
      return response;
    }
    return redirect(request, "/mfa/verify");
  }

  // AAL2 users landing on auth pages get bounced home.
  if (pathname === "/login" || pathname === "/mfa/verify") {
    return redirect(request, "/");
  }

  // /admin requires AAL2 (checked above). Role is re-verified in the layout.
  return response;
}

function redirect(request: NextRequest, to: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  return NextResponse.redirect(url);
}

function hasSupabaseCookies(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export const config = {
  // Run on everything except static assets and image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
