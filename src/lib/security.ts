/**
 * Content-Security-Policy construction (guidelines §20).
 *
 * A fresh nonce is generated per request in middleware and threaded into both
 * the request headers (so Next.js stamps its own scripts with the nonce) and
 * the response `Content-Security-Policy` header. Scripts use
 * `'strict-dynamic'` + nonce — no blanket `'unsafe-inline'`/`'unsafe-eval'`
 * for scripts in production.
 *
 * Styles keep `'unsafe-inline'` because Next.js and `next/font` inject small
 * inline <style> blocks; that is a far lower risk than inline scripts and is
 * the pragmatic, widely-used trade-off.
 */

/** URL-safe base64 nonce from 16 random bytes (Edge-runtime `crypto`). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  // btoa is available in the Edge runtime.
  return btoa(binary);
}

/**
 * Build the CSP string. In development Next.js relies on `eval` for HMR/React
 * Refresh, so `'unsafe-eval'` is allowed there only — never in production.
 */
export function buildCsp(nonce: string, isDev = false): string {
  const script = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": script,
    // Inline styles from Next.js / next/font; no external style hosts (font is
    // self-hosted, so no CDN allowance is needed).
    "style-src": "'self' 'unsafe-inline'",
    "img-src": "'self' data: blob: https://*.supabase.co",
    "media-src": "'self' blob: https://*.supabase.co",
    "font-src": "'self' data:",
    "connect-src": "'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src": "'self' blob:",
    "frame-ancestors": "'none'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "manifest-src": "'self'",
    // Force browsers to upgrade any stray http subresource to https.
    "upgrade-insecure-requests": "",
  };

  return Object.entries(directives)
    .map(([key, value]) => (value ? `${key} ${value}` : key))
    .join("; ");
}
