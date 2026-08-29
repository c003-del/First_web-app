import { describe, it, expect } from "vitest";
import {
  buildCsp,
  generateNonce,
  STATIC_SECURITY_HEADERS,
} from "@/lib/security-headers";

describe("buildCsp", () => {
  it("includes the nonce in script-src with strict-dynamic", () => {
    const csp = buildCsp("abc123");
    expect(csp).toContain("script-src");
    expect(csp).toContain("'nonce-abc123'");
    expect(csp).toContain("'strict-dynamic'");
  });

  it("script-src excludes unsafe-inline and wildcard https:", () => {
    const csp = buildCsp("x");
    const scriptSrc = csp
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc?.split(/\s+/)).not.toContain("https:");
  });

  it("locks down framing and object-src", () => {
    const csp = buildCsp("x");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("allows https images/media for signed URLs", () => {
    const csp = buildCsp("x");
    expect(csp).toContain("img-src 'self' data: blob: https:");
    expect(csp).toContain("media-src 'self' blob: https:");
  });
});

describe("generateNonce", () => {
  it("returns a url-safe base64 string of adequate length", () => {
    const n = generateNonce();
    expect(n).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(n.length).toBeGreaterThanOrEqual(20);
  });

  it("returns a fresh value each call", () => {
    const seen = new Set(Array.from({ length: 32 }, generateNonce));
    expect(seen.size).toBe(32);
  });
});

describe("STATIC_SECURITY_HEADERS", () => {
  it("has the expected keys", () => {
    const keys = STATIC_SECURITY_HEADERS.map(([k]) => k);
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Permissions-Policy");
    expect(keys).toContain("Strict-Transport-Security");
    expect(keys).toContain("Cross-Origin-Opener-Policy");
  });
});
