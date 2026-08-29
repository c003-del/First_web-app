import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "./security";

describe("generateNonce", () => {
  it("returns a non-empty base64 string", () => {
    const nonce = generateNonce();
    expect(nonce.length).toBeGreaterThan(0);
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("is unique per call", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

describe("buildCsp", () => {
  const nonce = "abc123==";

  it("embeds the nonce and strict-dynamic in script-src", () => {
    const csp = buildCsp(nonce);
    expect(csp).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
  });

  it("locks down framing and object/base/form vectors", () => {
    const csp = buildCsp(nonce);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("upgrades insecure requests", () => {
    expect(buildCsp(nonce)).toContain("upgrade-insecure-requests");
  });

  it("never allows unsafe-eval for scripts in production", () => {
    expect(buildCsp(nonce, false)).not.toContain("'unsafe-eval'");
  });

  it("allows unsafe-eval only in development (HMR)", () => {
    expect(buildCsp(nonce, true)).toContain("'unsafe-eval'");
  });

  it("allows Supabase over https and wss for XHR/websockets", () => {
    const csp = buildCsp(nonce);
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("wss://*.supabase.co");
  });
});
