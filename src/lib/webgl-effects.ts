import type { MediaEffects } from "@/lib/effects";

/**
 * Minimal WebGL renderer for the non-destructive effects editor (guidelines
 * §14). Draws a source image to a full-screen quad and applies adjustments in a
 * fragment shader. Real-time; the editor throttles renders with rAF. Falls back
 * to CSS filters (see effectsToCssFilter) when WebGL is unavailable.
 */

export function isWebglAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(
      c.getContext("webgl") || c.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

const VERT = `
attribute vec2 aPos;
attribute vec2 aUv;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uExposure;   // -1..1 (stops-ish)
uniform float uContrast;   // -1..1
uniform float uSaturation; // -1..1
uniform float uTemperature;// -1..1
uniform float uTint;       // -1..1
uniform float uHighlights; // -1..1
uniform float uShadows;    // -1..1
uniform float uVignette;   // 0..1
uniform float uGrain;      // 0..1
uniform float uBlur;       // 0..1
uniform float uSharpen;    // 0..1

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 c;

  // Optional light blur (4-tap) scaled by amount.
  if (uBlur > 0.001) {
    float r = uBlur * 3.0;
    vec3 sum = texture2D(uTex, vUv).rgb;
    sum += texture2D(uTex, vUv + vec2(uTexel.x * r, 0.0)).rgb;
    sum += texture2D(uTex, vUv - vec2(uTexel.x * r, 0.0)).rgb;
    sum += texture2D(uTex, vUv + vec2(0.0, uTexel.y * r)).rgb;
    sum += texture2D(uTex, vUv - vec2(0.0, uTexel.y * r)).rgb;
    c = sum / 5.0;
  } else {
    c = texture2D(uTex, vUv).rgb;
  }

  // Unsharp mask.
  if (uSharpen > 0.001) {
    vec3 blur = (
      texture2D(uTex, vUv + vec2(uTexel.x, 0.0)).rgb +
      texture2D(uTex, vUv - vec2(uTexel.x, 0.0)).rgb +
      texture2D(uTex, vUv + vec2(0.0, uTexel.y)).rgb +
      texture2D(uTex, vUv - vec2(0.0, uTexel.y)).rgb
    ) * 0.25;
    c += (c - blur) * uSharpen * 1.5;
  }

  // Exposure (multiplicative).
  c *= pow(2.0, uExposure);

  // Temperature / tint (simple channel shift).
  c.r += uTemperature * 0.12;
  c.b -= uTemperature * 0.12;
  c.g += uTint * 0.10;

  // Shadows / highlights via luma weighting.
  float l = luma(c);
  c += uShadows * 0.25 * (1.0 - l);
  c += uHighlights * 0.25 * l;

  // Contrast around mid grey.
  c = (c - 0.5) * (1.0 + uContrast) + 0.5;

  // Saturation.
  float g = luma(c);
  c = mix(vec3(g), c, 1.0 + uSaturation);

  // Vignette.
  if (uVignette > 0.001) {
    float d = distance(vUv, vec2(0.5));
    c *= 1.0 - uVignette * smoothstep(0.35, 0.85, d);
  }

  // Grain.
  if (uGrain > 0.001) {
    float n = rand(vUv) - 0.5;
    c += n * uGrain * 0.18;
  }

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("shader alloc failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("shader compile failed: " + log);
  }
  return sh;
}

export interface EffectRenderer {
  render(source: TexImageSource, effects: MediaEffects): void;
  dispose(): void;
}

export function createEffectRenderer(
  canvas: HTMLCanvasElement,
): EffectRenderer | null {
  const gl = (canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return null;
  }
  gl.useProgram(program);

  // Full-screen quad (pos + uv). UV y is flipped so the image is upright.
  const quad = new Float32Array([
    -1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, -1, 1, 0, 0, 1, -1, 1, 1, 1, 1, 1,
    0,
  ]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, "aPos");
  const aUv = gl.getAttribLocation(program, "aUv");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uni = {
    texel: u("uTexel"),
    exposure: u("uExposure"),
    contrast: u("uContrast"),
    saturation: u("uSaturation"),
    temperature: u("uTemperature"),
    tint: u("uTint"),
    highlights: u("uHighlights"),
    shadows: u("uShadows"),
    vignette: u("uVignette"),
    grain: u("uGrain"),
    blur: u("uBlur"),
    sharpen: u("uSharpen"),
  };

  return {
    render(source: TexImageSource, e: MediaEffects) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uni.texel, 1 / canvas.width, 1 / canvas.height);
      gl.uniform1f(uni.exposure, e.exposure / 100);
      gl.uniform1f(uni.contrast, e.contrast / 100);
      gl.uniform1f(uni.saturation, e.saturation / 100);
      gl.uniform1f(uni.temperature, e.temperature / 100);
      gl.uniform1f(uni.tint, e.tint / 100);
      gl.uniform1f(uni.highlights, e.highlights / 100);
      gl.uniform1f(uni.shadows, e.shadows / 100);
      gl.uniform1f(uni.vignette, e.vignette / 100);
      gl.uniform1f(uni.grain, e.grain / 100);
      gl.uniform1f(uni.blur, e.blur / 100);
      gl.uniform1f(uni.sharpen, e.sharpen / 100);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    },
  };
}
