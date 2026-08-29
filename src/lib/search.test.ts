import { describe, it, expect } from "vitest";

// Local copies of helpers from src/lib/data.ts (server-only). If either drifts
// meaningfully, extract to a shared module. `escapeIlike` handles SQL LIKE
// metachars only; `pgrstQuote` protects PostgREST filter delimiters.
function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => "\\" + m);
}
function pgrstQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

describe("escapeIlike", () => {
  it("escapes SQL wildcard characters", () => {
    expect(escapeIlike("50%")).toBe("50\\%");
    expect(escapeIlike("a_b")).toBe("a\\_b");
    expect(escapeIlike("a\\b")).toBe("a\\\\b");
  });
  it("leaves PostgREST delimiters alone (pgrstQuote handles them)", () => {
    expect(escapeIlike("a,b")).toBe("a,b");
    expect(escapeIlike("a(b)")).toBe("a(b)");
  });
  it("leaves plain text alone", () => {
    expect(escapeIlike("서울")).toBe("서울");
  });
});

describe("pgrstQuote", () => {
  it("wraps in double quotes", () => {
    expect(pgrstQuote("hello")).toBe('"hello"');
  });
  it("escapes backslash and double quote inside", () => {
    expect(pgrstQuote('a"b')).toBe('"a\\"b"');
    expect(pgrstQuote("a\\b")).toBe('"a\\\\b"');
  });
  it("keeps parens/commas/dots inside the quoted value", () => {
    expect(pgrstQuote("Hong, Gil-dong")).toBe('"Hong, Gil-dong"');
    expect(pgrstQuote("(2024)")).toBe('"(2024)"');
  });
});
