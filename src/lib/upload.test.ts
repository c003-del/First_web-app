import { describe, it, expect } from "vitest";
import { sniffMime, validateUpload, buildStoragePath } from "@/lib/upload";
import { MAX_IMAGE_BYTES } from "@/lib/media";

const bytes = (...xs: number[]) => Uint8Array.from(xs);
const ascii = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

describe("sniffMime", () => {
  it("detects common image signatures", () => {
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
    expect(sniffMime(ascii("GIF89a"))).toBe("image/gif");
  });
  it("detects webp via RIFF....WEBP", () => {
    const webp = concat(concat(ascii("RIFF"), bytes(0, 0, 0, 0)), ascii("WEBP"));
    expect(sniffMime(webp)).toBe("image/webp");
  });
  it("detects mp4 vs heic via ftyp brand", () => {
    const mp4 = concat(bytes(0, 0, 0, 0x18), concat(ascii("ftyp"), ascii("mp42")));
    expect(sniffMime(mp4)).toBe("video/mp4");
    const heic = concat(bytes(0, 0, 0, 0x18), concat(ascii("ftyp"), ascii("heic")));
    expect(sniffMime(heic)).toBe("image/heic");
  });
  it("returns null for unknown bytes", () => {
    expect(sniffMime(bytes(0x00, 0x01, 0x02, 0x03))).toBeNull();
  });
});

describe("validateUpload", () => {
  const jpegHead = bytes(0xff, 0xd8, 0xff, 0xe0);

  it("accepts a valid jpeg", () => {
    const r = validateUpload({ fileName: "a.jpg", size: 1000, head: jpegHead });
    expect(r.ok).toBe(true);
    expect(r.kind).toBe("image");
  });

  it("rejects extension/content mismatch", () => {
    // .png extension but jpeg bytes
    const r = validateUpload({ fileName: "a.png", size: 1000, head: jpegHead });
    expect(r.ok).toBe(true); // both are images → kind matches
    // .mp4 extension but jpeg bytes → kind mismatch
    const r2 = validateUpload({ fileName: "a.mp4", size: 1000, head: jpegHead });
    expect(r2.ok).toBe(false);
    expect(r2.reason).toContain("일치하지");
  });

  it("rejects empty and oversize files", () => {
    expect(validateUpload({ fileName: "a.jpg", size: 0, head: jpegHead }).ok).toBe(
      false,
    );
    expect(
      validateUpload({
        fileName: "a.jpg",
        size: MAX_IMAGE_BYTES + 1,
        head: jpegHead,
      }).ok,
    ).toBe(false);
  });

  it("blocks svg", () => {
    const r = validateUpload({ fileName: "x.svg", size: 100, head: ascii("<svg") });
    expect(r.ok).toBe(false);
  });

  it("accepts archive-only formats on extension without a signature", () => {
    const r = validateUpload({
      fileName: "raw.nef",
      size: 5000,
      head: bytes(0x00, 0x01, 0x02, 0x03),
    });
    expect(r.ok).toBe(true);
    expect(r.kind).toBe("image");
  });
});

describe("buildStoragePath", () => {
  const base = {
    siteId: "s1",
    ownerId: "o1",
    postId: "p1",
    mediaId: "m1",
    ext: "jpg",
  };
  it("builds the original path with the real extension", () => {
    expect(buildStoragePath(base)).toBe("s1/o1/p1/m1/original.jpg");
  });
  it("uses webp for derived variants", () => {
    expect(buildStoragePath({ ...base, variant: "thumb" })).toBe(
      "s1/o1/p1/m1/thumb.webp",
    );
    expect(buildStoragePath({ ...base, variant: "poster" })).toBe(
      "s1/o1/p1/m1/poster.webp",
    );
  });
});
