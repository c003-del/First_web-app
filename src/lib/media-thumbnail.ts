/**
 * Client-side derived-image generation (guidelines §12.2, §14). Runs in the
 * browser only. Best-effort: returns null on any failure so the original still
 * uploads. Thumbnails are webp, long edge capped for cheap gallery covers.
 */

const THUMB_MAX_EDGE = 640;

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.82),
  );
}

function scaled(w: number, h: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

export interface ImageThumbResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function generateImageThumb(
  file: File,
): Promise<ImageThumbResult | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const { w, h } = scaled(bitmap.width, bitmap.height, THUMB_MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await canvasToWebp(canvas);
    bitmap.close();
    if (!blob) return null;
    return { blob, width: bitmap.width, height: bitmap.height };
  } catch {
    return null;
  }
}

export interface VideoPosterResult {
  blob: Blob;
  width: number;
  height: number;
  durationSeconds: number;
}

export async function generateVideoPoster(
  file: File,
): Promise<VideoPosterResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: VideoPosterResult | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.remove();
      resolve(r);
    };

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = url;

    video.onerror = () => done(null);
    video.onloadedmetadata = () => {
      // Seek slightly in to avoid a black first frame.
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.onseeked = () => {
      try {
        const { w, h } = scaled(
          video.videoWidth,
          video.videoHeight,
          THUMB_MAX_EDGE,
        );
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return done(null);
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) =>
            done(
              blob
                ? {
                    blob,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    durationSeconds: video.duration || 0,
                  }
                : null,
            ),
          "image/webp",
          0.82,
        );
      } catch {
        done(null);
      }
    };

    // Safety timeout.
    setTimeout(() => done(null), 8000);
  });
}

/** First `n` bytes of a file, base64-encoded, for server magic-byte checks. */
export async function fileHeadBase64(file: File, n = 16): Promise<string> {
  const buf = new Uint8Array(await file.slice(0, n).arrayBuffer());
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin);
}
