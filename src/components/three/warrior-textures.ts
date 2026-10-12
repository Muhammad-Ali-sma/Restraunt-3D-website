import * as THREE from "three";
import { FIGURE_SIZE, figureLayers, figureParts, FIGURE_BODY, type Form, type Shape } from "@/lib/goku-figure";

/**
 * Builds the character textures on the client: one colour texture per form
 * (base, golden, silver), a half-resolution "glow" texture of blurred
 * silhouettes (R/G tight blur for base/golden, B/A wide blur for base/golden)
 * used by the rim light and the aura, and, for the drawn figure, an
 * "emissive" mask of the visible hair (R golden, G silver) so it can shine.
 */
export type FigureTextures = {
  base: THREE.Texture;
  superSaiyan?: THREE.Texture;
  ultra?: THREE.Texture;
  glow: THREE.DataTexture;
  emissive?: THREE.DataTexture;
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

/** Paints figure layers (SVG path data in the 1000-unit frame) onto a canvas. */
function paint(ctx: CanvasRenderingContext2D, shapes: Shape[], override?: string) {
  const paths = new Map<string, Path2D>();
  const path = (d: string) => paths.get(d) ?? paths.set(d, new Path2D(d)).get(d)!;
  for (const s of shapes) {
    ctx.save();
    if (s.clip) ctx.clip(path(s.clip));
    ctx.globalAlpha = override ? 1 : (s.opacity ?? 1);
    if (s.fill) {
      ctx.fillStyle = override ?? s.fill;
      ctx.fill(path(s.d));
    }
    if (s.stroke && s.width) {
      ctx.strokeStyle = override ?? s.stroke;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(path(s.d));
    }
    ctx.restore();
  }
}

function alphaOf(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3];
  return out;
}

/** The visible hair of a form: hair in white, everything in front of the back hair punched out. */
function hairMask(form: Form, width: number) {
  const height = Math.round(width * ASPECT);
  const { ctx } = canvas2d(width, height);
  ctx.scale(width / FIGURE_SIZE.width, width / FIGURE_SIZE.width);
  const { back, front } = figureParts(form);
  paint(ctx, back, "#fff");
  ctx.globalCompositeOperation = "destination-out";
  paint(
    ctx,
    FIGURE_BODY.filter((s) => s.fill),
    "#000",
  );
  ctx.globalCompositeOperation = "source-over";
  paint(ctx, front, "#fff");
  return alphaOf(ctx, width, height);
}

/** Rasterises the drawn Goku: three forms, glow and emissive masks. */
export function buildIllustratedFigure(width: number): FigureTextures {
  const height = Math.round(width * ASPECT);
  const forms = (["base", "ssj", "ultra"] as const).map((form) => {
    const { c, ctx } = canvas2d(width, height);
    ctx.scale(width / FIGURE_SIZE.width, width / FIGURE_SIZE.width);
    paint(ctx, figureLayers(form));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { tex, alpha: alphaOf(ctx, width, height) };
  });
  const [base, ssj, ultra] = forms;
  const glow = glowFrom(base.alpha, ssj.alpha, width, height);

  const hw = width >> 1;
  const hh = height >> 1;
  const gold = half(hairMask("ssj", width), width, height);
  const silver = half(hairMask("ultra", width), width, height);
  const emissive = dataTexture(
    packFloat(hw, hh, [gold, silver, new Float32Array(hw * hh), new Float32Array(hw * hh).fill(1)]),
    hw,
    hh,
  );

  return {
    base: base.tex,
    superSaiyan: ssj.tex,
    ultra: ultra.tex,
    glow,
    emissive,
    dispose: () => {
      forms.forEach((f) => f.tex.dispose());
      glow.dispose();
      emissive.dispose();
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
    base: b.tex,
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
