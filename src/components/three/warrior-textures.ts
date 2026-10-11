import * as THREE from "three";
import { FIGURE_SIZE, WARRIOR } from "@/lib/warrior-figure";

/**
 * Builds the character textures on the client.
 *
 * figure (RGBA8): procedural mode packs four masks (R body, G resting hair,
 *   B golden hair, A rim-catching detail lines). Image mode stores the base
 *   artwork's colour.
 * glow (RGBA8, half resolution): blurred silhouettes used for the rim light
 *   and the aura (R/G tight blur for base/golden, B/A wide blur for base/golden).
 */
export type FigureTextures = {
  mode: "procedural" | "image";
  figure: THREE.Texture;
  /** Image mode only: the golden-form artwork and the Ultra Instinct artwork. */
  superSaiyan?: THREE.Texture;
  ultra?: THREE.Texture;
  glow: THREE.DataTexture;
  dispose: () => void;
};

const ASPECT = FIGURE_SIZE.height / FIGURE_SIZE.width;

function canvas2d(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

/** Rasterises SVG path data into an alpha mask (0–255). */
function rasterise(width: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const height = Math.round(width * ASPECT);
  const { ctx } = canvas2d(width, height);
  ctx.scale(width / FIGURE_SIZE.width, width / FIGURE_SIZE.width);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  draw(ctx);
  const data = ctx.getImageData(0, 0, width, height).data;
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3];
  return out;
}

function fillPaths(paths: readonly string[]) {
  return (ctx: CanvasRenderingContext2D) => paths.forEach((d) => ctx.fill(new Path2D(d)));
}

/** Downsample a mask by 2 (box filter) into floats 0–1. */
function half(src: Uint8ClampedArray, w: number, h: number) {
  const hw = w >> 1;
  const hh = h >> 1;
  const out = new Float32Array(hw * hh);
  for (let y = 0; y < hh; y++)
    for (let x = 0; x < hw; x++) {
      const i = y * 2 * w + x * 2;
      out[y * hw + x] = (src[i] + src[i + 1] + src[i + w] + src[i + w + 1]) / 1020;
    }
  return out;
}

/** Separable box blur (horizontal into b, vertical back into a), three passes ≈ Gaussian. */
function blur(src: Float32Array, w: number, h: number, radius: number) {
  const a = src.slice();
  const b = new Float32Array(a.length);
  const r = Math.max(1, Math.round(radius));
  const norm = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) sum += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = sum * norm;
        sum += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum * norm;
        sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

/** Packs four float masks into an RGBA DataTexture, flipping rows for GL. */
function packFloat(w: number, h: number, channels: [Float32Array, Float32Array, Float32Array, Float32Array]) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = y * w;
    const dst = (h - 1 - y) * w;
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 4; c++) data[(dst + x) * 4 + c] = Math.min(255, channels[c][src + x] * 255);
  }
  return data;
}

function dataTexture(data: Uint8Array, w: number, h: number) {
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function glowFrom(base: Uint8ClampedArray, ssj: Uint8ClampedArray, w: number, h: number) {
  const hw = w >> 1;
  const hh = h >> 1;
  const b = half(base, w, h);
  const s = half(ssj, w, h);
  const tight = hw * 0.006;
  const wide = hw * 0.045;
  const data = packFloat(hw, hh, [
    blur(b, hw, hh, tight),
    blur(s, hw, hh, tight),
    blur(b, hw, hh, wide),
    blur(s, hw, hh, wide),
  ]);
  return dataTexture(data, hw, hh);
}

export function buildProceduralFigure(width: number): FigureTextures {
  const height = Math.round(width * ASPECT);
  const body = rasterise(width, fillPaths(WARRIOR.body));
  const hairBase = rasterise(width, fillPaths(WARRIOR.hairBase));
  const hairSsj = rasterise(width, fillPaths(WARRIOR.hairSsj));
  const details = rasterise(width, (ctx) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const { d, w } of WARRIOR.details) {
      ctx.lineWidth = w;
      ctx.stroke(new Path2D(d));
    }
  });

  const figData = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const src = y * width;
    const dst = (height - 1 - y) * width;
    for (let x = 0; x < width; x++) {
      const o = (dst + x) * 4;
      const i = src + x;
      figData[o] = body[i];
      figData[o + 1] = hairBase[i];
      figData[o + 2] = hairSsj[i];
      figData[o + 3] = details[i];
    }
  }
  const unionBase = new Uint8ClampedArray(body.length);
  const unionSsj = new Uint8ClampedArray(body.length);
  for (let i = 0; i < body.length; i++) {
    unionBase[i] = Math.max(body[i], hairBase[i]);
    unionSsj[i] = Math.max(body[i], hairSsj[i]);
  }

  const figure = dataTexture(figData, width, height);
  const glow = glowFrom(unionBase, unionSsj, width, height);
  return {
    mode: "procedural",
    figure,
    glow,
    dispose: () => {
      figure.dispose();
      glow.dispose();
    },
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/**
 * Fits artwork into the figure frame (bottom-centred, feet on the ground line)
 * and returns both a colour texture and its alpha mask.
 */
function frameImage(img: HTMLImageElement, width: number) {
  const height = Math.round(width * ASPECT);
  const { c, ctx } = canvas2d(width, height);
  const boxTop = height * 0.12;
  const boxBottom = height * (1450 / 1500);
  const boxH = boxBottom - boxTop;
  const scale = Math.min((width * 0.92) / img.naturalWidth, boxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (width - w) / 2, boxBottom - h, w, h);
  const data = ctx.getImageData(0, 0, width, height).data;
  const alpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, alpha };
}

export async function buildImageFigure(
  width: number,
  sources: { base: string; superSaiyan?: string; ultra?: string },
): Promise<FigureTextures> {
  const [base, ssj, ultra] = await Promise.all([
    loadImage(sources.base),
    sources.superSaiyan ? loadImage(sources.superSaiyan) : Promise.resolve(undefined),
    sources.ultra ? loadImage(sources.ultra) : Promise.resolve(undefined),
  ]);
  const height = Math.round(width * ASPECT);
  const b = frameImage(base, width);
  const s = ssj ? frameImage(ssj, width) : undefined;
  const u = ultra ? frameImage(ultra, width) : undefined;
  const glow = glowFrom(b.alpha, s?.alpha ?? b.alpha, width, height);
  return {
    mode: "image",
    figure: b.tex,
    superSaiyan: s?.tex,
    ultra: u?.tex,
    glow,
    dispose: () => {
      b.tex.dispose();
      s?.tex.dispose();
      u?.tex.dispose();
      glow.dispose();
    },
  };
}
