"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_EFFECTS,
  EFFECT_RANGES,
  PRESETS,
  effectsToCssFilter,
  type MediaEffects,
} from "@/lib/effects";
import { applyPreset } from "@/lib/effect-presets";
import {
  createEffectRenderer,
  isWebglAvailable,
  type EffectRenderer,
} from "@/lib/webgl-effects";
import { Button } from "@/components/Button";
import { savePostEffects } from "./actions";

const PREVIEW_MAX_EDGE = 1024;

const LABELS: Record<keyof typeof EFFECT_RANGES, string> = {
  exposure: "노출",
  contrast: "대비",
  saturation: "채도",
  temperature: "색온도",
  tint: "틴트",
  highlights: "하이라이트",
  shadows: "그림자",
  vignette: "비네팅",
  grain: "그레인",
  blur: "블러",
  sharpen: "선명도",
  bloom: "블룸",
};

type EffectKey = keyof typeof EFFECT_RANGES;

function effectsEqual(a: MediaEffects, b: MediaEffects): boolean {
  for (const k of Object.keys(EFFECT_RANGES) as EffectKey[]) {
    if (a[k] !== b[k]) return false;
  }
  return a.presetId === b.presetId;
}

export function EffectsEditor({
  posts,
}: {
  posts: { id: string; title: string }[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rendererRef = useRef<EffectRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Detect on the client after mount (document is unavailable during SSR).
  const [webglOk, setWebglOk] = useState(false);
  useEffect(() => setWebglOk(isWebglAvailable()), []);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [splitView, setSplitView] = useState(false);

  const [effects, setEffects] = useState<MediaEffects>(DEFAULT_EFFECTS);
  const [history, setHistory] = useState<MediaEffects[]>([DEFAULT_EFFECTS]);
  const [hi, setHi] = useState(0);
  const [savedBaseline, setSavedBaseline] =
    useState<MediaEffects>(DEFAULT_EFFECTS);

  const [postId, setPostId] = useState(posts[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = !effectsEqual(effects, savedBaseline);

  // Default sample image (same-origin data URL → no CORS taint for WebGL).
  useEffect(() => {
    if (previewUrl) return;
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = 640;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, 960, 640);
    g.addColorStop(0, "#e9d9c2");
    g.addColorStop(0.5, "#c98a6b");
    g.addColorStop(1, "#5b6b74");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 640);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(80 + i * 78, 120 + (i % 3) * 180, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    setPreviewUrl(c.toDataURL("image/png"));
  }, [previewUrl]);

  const draw = useCallback(() => {
    if (!webglOk) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !ready) return;
    if (!rendererRef.current || rendererRef.current.isLost()) {
      rendererRef.current?.dispose();
      rendererRef.current = createEffectRenderer(canvas);
      if (!rendererRef.current) return;
    }
    rendererRef.current.render(img, showOriginal ? DEFAULT_EFFECTS : effects);
  }, [webglOk, ready, showOriginal, effects]);

  // Throttle renders to animation frames.
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // Context-restore: recreate the renderer on the next tick.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onRestored = () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
      requestAnimationFrame(draw);
    };
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    return () => canvas.removeEventListener("webglcontextrestored", onRestored);
  }, [draw]);

  // Full cleanup on unmount: renderer + any blob: URL we created.
  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
      if (previewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Unsaved-changes navigation guard (guideline §14).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom text but require returnValue to be set.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function onImgLoad() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img) return;
    if (canvas) {
      const scale = Math.min(
        1,
        PREVIEW_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight),
      );
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    }
    setLoadError(null);
    setReady(true);
  }

  function onImgError() {
    setReady(false);
    setLoadError(
      "이미지를 열 수 없습니다. 다른 파일을 선택하거나 브라우저가 지원하는 형식(JPG/PNG/WebP)을 사용해 주세요.",
    );
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    setReady(false);
    setLoadError(null);
    // Revoke the previous blob URL synchronously so it can't leak.
    if (previewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const next = URL.createObjectURL(file);
    previewUrlRef.current = next;
    setPreviewUrl(next);
  }

  // record() must derive both next-history and next-index from the previous
  // state, not from stale closure values. Two records in the same batch would
  // otherwise desync hi and history.length.
  function record(next: MediaEffects) {
    setEffects(next);
    setHistory((prev) => {
      const truncated = prev.slice(0, hi + 1);
      const nextHistory = [...truncated, next];
      // Move the cursor to the new top in a followup setter so index derives
      // from the same value we just computed.
      queueMicrotask(() => setHi(nextHistory.length - 1));
      return nextHistory;
    });
  }

  function undo() {
    if (hi <= 0) return;
    const idx = hi - 1;
    setHi(idx);
    const v = history[idx];
    if (v) setEffects(v);
  }
  function redo() {
    if (hi >= history.length - 1) return;
    const idx = hi + 1;
    setHi(idx);
    const v = history[idx];
    if (v) setEffects(v);
  }

  async function save() {
    if (!postId) {
      setMessage("저장할 게시물을 선택해 주세요.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await savePostEffects(postId, effects);
    setSaving(false);
    if (res.ok) {
      setSavedBaseline(effects);
      setMessage("효과를 저장했습니다.");
    } else {
      setMessage(res.error ?? "저장 실패");
    }
  }

  // CSS fallback (or split-view "after" pane) filter string.
  const filterStr = effectsToCssFilter(showOriginal ? DEFAULT_EFFECTS : effects);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Preview */}
      <div>
        <div className="glass overflow-hidden p-3">
          <div className="relative overflow-hidden rounded-md bg-surface-2">
            {/* Hidden source image for WebGL (also visible in fallback / split). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={previewUrl ?? undefined}
              alt=""
              onLoad={onImgLoad}
              onError={onImgError}
              className={webglOk && !splitView ? "hidden" : "block w-full"}
              style={
                webglOk
                  ? undefined
                  : {
                      filter: filterStr,
                    }
              }
            />
            {webglOk ? (
              <canvas
                ref={canvasRef}
                className={
                  splitView
                    ? "absolute inset-y-0 left-0 h-full w-1/2 object-cover [clip-path:inset(0_0_0_0)]"
                    : "block h-auto w-full"
                }
              />
            ) : null}
            {splitView ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-surface-solid/80"
              />
            ) : null}
          </div>
        </div>

        {loadError ? (
          <p role="alert" className="mt-2 text-[13px] text-danger">
            {loadError}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-strong px-3 py-2 text-[14px]">
            사진 선택
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
            onPointerCancel={() => setShowOriginal(false)}
            onBlur={() => setShowOriginal(false)}
            className="rounded-md border border-strong px-3 py-2 text-[14px]"
          >
            원본 보기(누르기)
          </button>
          <button
            type="button"
            onClick={() => setSplitView((v) => !v)}
            aria-pressed={splitView}
            className={`rounded-md border px-3 py-2 text-[14px] ${
              splitView
                ? "border-accent-primary bg-accent-primary text-surface-solid"
                : "border-strong"
            }`}
          >
            분할 비교
          </button>
          <span className="text-[12px] text-ink-muted">
            {webglOk ? "WebGL 실시간 미리보기" : "CSS 폴백 미리보기"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-5">
        <div>
          <p className="text-[13px] text-ink-secondary">프리셋</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => record(applyPreset(p))}
                className={`rounded-full border px-3 py-1.5 text-[13px] ${
                  effects.presetId === p
                    ? "border-accent-primary bg-accent-primary text-surface-solid"
                    : "border-strong hover:bg-surface-1"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {(Object.keys(EFFECT_RANGES) as EffectKey[]).map((key) => {
            const r = EFFECT_RANGES[key];
            return (
              <label key={key} className="block">
                <span className="flex justify-between text-[13px] text-ink-secondary">
                  <span>{LABELS[key]}</span>
                  <span className="tabular-nums text-ink-muted">
                    {effects[key]}
                  </span>
                </span>
                <input
                  type="range"
                  min={r.min}
                  max={r.max}
                  value={effects[key]}
                  onChange={(e) =>
                    setEffects((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value),
                      presetId: undefined,
                    }))
                  }
                  onPointerUp={() => record(effects)}
                  onKeyUp={() => record(effects)}
                  className="mt-1 w-full accent-[var(--accent-primary)]"
                />
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={undo} disabled={hi <= 0}>
            실행 취소
          </Button>
          <Button
            variant="ghost"
            onClick={redo}
            disabled={hi >= history.length - 1}
          >
            다시 실행
          </Button>
          <Button variant="ghost" onClick={() => record(DEFAULT_EFFECTS)}>
            초기화
          </Button>
        </div>

        <div className="rounded-lg border border-soft bg-surface-1 p-4">
          <p className="text-[13px] text-ink-secondary">
            게시물에 효과 저장 (비파괴 · posts.effects)
            {dirty ? (
              <span className="ml-2 text-warning">· 저장되지 않은 변경</span>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="min-w-40 flex-1 rounded-md border border-strong bg-surface-solid px-3 py-2 text-[14px]"
            >
              {posts.length === 0 ? (
                <option value="">게시물 없음</option>
              ) : (
                posts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || "제목 없음"}
                  </option>
                ))
              )}
            </select>
            <Button onClick={save} disabled={saving || posts.length === 0}>
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
          {message ? (
            <p className="mt-2 text-[13px] text-ink-secondary" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
