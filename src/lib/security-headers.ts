/**
 * Security headers and CSP builder used by middleware. Kept in a plain lib so
 * the CSP source of truth is easy to inspect and unit test.
 *
 * CSP notes:
 *  - `script-src` uses a per-request nonce + `strict-dynamic`, so Next.js's
 *    hydration scripts inherit trust from the nonced entry script and no other
 *    origin can load JS. `unsafe-inline` is present as a legacy fallback for
 *    browsers that ignore `strict-dynamic` (they ignore the whole line if a
 *    nonce+strict-dynamic combo is unrecognized, so the allow list falls back
 *    to unsafe-inline for them).
 *  - `style-src 'unsafe-inline'` is unavoidable while Next.js/Tailwind inline
 *    critical CSS. Tightening requires either style hashes (build step) or
 *    dropping inline critical CSS.
 *  - `img-src`/`media-src` allow `https:` so signed Supabase Storage URLs (and
 *    demo picsum) work; the private bucket still gates access on its own.
 *  - `frame-ancestors 'none'` blocks embedding entirely.
 */

export function buildCsp(nonce: string): string {
  // script-src intentionally has NO 'unsafe-inline' and NO wildcard https:
  //   'nonce-XXX'      → nonced scripts (Next.js hydration entry) execute
  //   'strict-dynamic' → those scripts may propagate trust to imports they
  //                      load themselves; nothing else runs
  // On CSP1-only browsers (very rare in 2026) both directives are unknown
  // and script-src collapses to `'self'` — restrictive, not permissive.
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

export const STATIC_SECURITY_HEADERS: Array<[string, string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["Referrer-Policy", "no-referrer"],
  [
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  ],
  ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  // Explicit MIME opt-out; scripts/CSS with the wrong Content-Type won't run.
  ["Cross-Origin-Opener-Policy", "same-origin"],
];

/** Cryptographically-strong nonce, base64url, 16 bytes. */
export function generateNonce(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
