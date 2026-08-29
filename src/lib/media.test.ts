import { describe, it, expect } from "vitest";
import {
  classifyFile,
  kindForExt,
  supportForExt,
  normalizeExt,
  supportNotice,
} from "@/lib/media";

describe("normalizeExt", () => {
  it("lowercases and trims", () => {
    expect(normalizeExt("Photo.JPG")).toBe("jpg");
    expect(normalizeExt("clip.MP4")).toBe("mp4");
  });
  it("returns empty for no extension", () => {
    expect(normalizeExt("noext")).toBe("");
  });
});

describe("kindForExt / supportForExt", () => {
  it("maps images and videos", () => {
    expect(kindForExt("png")).toBe("image");
    expect(kindForExt("mp4")).toBe("video");
    expect(kindForExt("cr2")).toBe("image");
    expect(kindForExt("mkv")).toBe("video");
    expect(kindForExt("txt")).toBeNull();
  });
  it("tiers support correctly", () => {
    expect(supportForExt("jpg")).toBe("web-native");
    expect(supportForExt("heic")).toBe("needs-conversion");
    expect(supportForExt("nef")).toBe("archive-only");
    expect(supportForExt("mov")).toBe("needs-conversion");
    expect(supportForExt("avi")).toBe("archive-only");
  });
});

describe("classifyFile", () => {
  it("accepts a web-native image", () => {
    const r = classifyFile("a.jpg");
    expect(r).toMatchObject({ ok: true, kind: "image", support: "web-native" });
  });
  it("blocks svg for security", () => {
    const r = classifyFile("x.svg");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("보안");
  });
  it("rejects unknown formats", () => {
    expect(classifyFile("readme.txt").ok).toBe(false);
    expect(classifyFile("noext").ok).toBe(false);
  });
  it("classifies archive-only video", () => {
    const r = classifyFile("VID.MKV");
    expect(r).toMatchObject({ ok: true, kind: "video", support: "archive-only" });
  });
});

describe("supportNotice", () => {
  it("returns a message per tier", () => {
    expect(supportNotice("web-native")).toContain("바로");
    expect(supportNotice("needs-conversion")).toContain("변환");
    expect(supportNotice("archive-only")).toContain("보관");
  });
});
