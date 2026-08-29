import { describe, it, expect } from "vitest";

// Local copy of the escapeIlike helper for tests — the source lives inside
// src/lib/data.ts (server-only). This mirror is small enough to keep in sync;
// if it grows, extract to a shared helper.
function escapeIlike(s: string): string {
  return s.replace(/[\\%_,]/g, (m) => "\\" + m);
}

describe("escapeIlike", () => {
  it("escapes wildcard characters", () => {
    expect(escapeIlike("50%")).toBe("50\\%");
    expect(escapeIlike("a_b")).toBe("a\\_b");
  });
  it("escapes backslash and comma", () => {
    expect(escapeIlike("a\\b")).toBe("a\\\\b");
    expect(escapeIlike("a,b")).toBe("a\\,b");
  });
  it("leaves plain text alone", () => {
    expect(escapeIlike("서울")).toBe("서울");
    expect(escapeIlike("holiday 2026")).toBe("holiday 2026");
  });
});
