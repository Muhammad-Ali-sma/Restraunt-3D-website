import * as THREE from "three";
import { mulberry32 } from "@/lib/random";
import type { DishKind } from "@/lib/content";

/*
 * Procedural canvas textures. Generated once on the client and cached, so the
 * whole 3D experience ships without a single image/model download.
 */

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, color = true) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

function memo(key: string, make: () => THREE.Texture) {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

function speckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  alpha: number,
  light = true,
) {
  const r = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const v = light ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${r() * alpha})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

/** Curved fat streaks across a fish slice (salmon / bluefin marbling). */
function fatLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  opts: { count: number; width: [number, number]; alpha: number; color: string; wobble: number; blur: number },
) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.filter = `blur(${opts.blur}px)`;
  ctx.strokeStyle = opts.color;
  ctx.lineCap = "round";
  for (let i = 0; i < opts.count; i++) {
    const x0 = ((i + r() * 0.4) / opts.count) * w * 1.6 - w * 0.3;
    ctx.globalAlpha = opts.alpha * (0.6 + r() * 0.4);
    ctx.lineWidth = opts.width[0] + r() * (opts.width[1] - opts.width[0]);
    ctx.beginPath();
    for (let y = -10; y <= h + 10; y += 8) {
      const x =
        x0 - y * 0.55 + Math.sin(y * 0.03 + i) * opts.wobble + Math.sin(y * 0.011 + i * 2.3) * opts.wobble * 1.6;
      if (y === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function fishTexture(kind: Exclude<DishKind, "tamago" | "maki">) {
  return memo(`fish-${kind}`, () => {
    const W = 512;
    const H = 256;
    const { c, ctx } = canvas(W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    if (kind === "otoro") {
      g.addColorStop(0, "#f4c3bd");
      g.addColorStop(0.5, "#eaa7a2");
      g.addColorStop(1, "#f1b9b1");
    } else if (kind === "sake") {
      g.addColorStop(0, "#f39a5c");
      g.addColorStop(0.5, "#ee7f3f");
      g.addColorStop(1, "#f5a568");
    } else {
      g.addColorStop(0, "#7e1219");
      g.addColorStop(0.5, "#951b22");
      g.addColorStop(1, "#6d0f16");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (kind === "otoro") {
      fatLines(ctx, W, H, 11, { count: 26, width: [3, 10], alpha: 0.75, color: "#fff4ef", wobble: 9, blur: 3 });
      fatLines(ctx, W, H, 12, { count: 40, width: [1, 3], alpha: 0.5, color: "#fffaf6", wobble: 14, blur: 1 });
    } else if (kind === "sake") {
      fatLines(ctx, W, H, 21, { count: 11, width: [5, 9], alpha: 0.85, color: "#fff1e3", wobble: 6, blur: 1.5 });
      // binchōtan sear along one edge
      const s = ctx.createLinearGradient(0, 0, 0, H);
      s.addColorStop(0, "rgba(90,40,10,0.45)");
      s.addColorStop(0.18, "rgba(90,40,10,0)");
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, W, H);
    } else {
      fatLines(ctx, W, H, 31, { count: 9, width: [1, 2], alpha: 0.18, color: "#ffd0c8", wobble: 10, blur: 1 });
    }
    speckle(ctx, W, H, 7, 1800, 0.08);
    return toTexture(c);
  });
}

/** Grey-scale relief for the fish surface: fat lines catch light slightly. */
export function fishBump(kind: Exclude<DishKind, "tamago" | "maki">) {
  return memo(`fish-bump-${kind}`, () => {
    const W = 256;
    const H = 128;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, W, H);
    fatLines(ctx, W, H, kind === "sake" ? 21 : 11, {
      count: kind === "sake" ? 11 : 22,
      width: [2, 5],
      alpha: 0.6,
      color: "#b0b0b0",
      wobble: 5,
      blur: 2,
    });
    speckle(ctx, W, H, 3, 1200, 0.2, false);
    return toTexture(c, false);
  });
}

export function tamagoTexture() {
  return memo("tamago", () => {
    const W = 256;
    const H = 256;
    const { c, ctx } = canvas(W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#d79a32");
    g.addColorStop(0.12, "#f2c24f");
    g.addColorStop(1, "#f6d266");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = mulberry32(5);
    for (let y = 18; y < H; y += 9 + r() * 5) {
      ctx.strokeStyle = `rgba(190,120,20,${0.15 + r() * 0.2})`;
      ctx.lineWidth = 1 + r();
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 1.5);
      ctx.stroke();
    }
    speckle(ctx, W, H, 9, 900, 0.1);
    return toTexture(c);
  });
}

export function noriTexture() {
  return memo("nori", () => {
    const W = 256;
    const H = 256;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = "#121a12";
    ctx.fillRect(0, 0, W, H);
    const r = mulberry32(17);
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = `rgba(${40 + r() * 40},${60 + r() * 50},${35 + r() * 25},${0.15 + r() * 0.25})`;
      ctx.lineWidth = 0.6 + r();
      const x = r() * W;
      const y = r() * H;
      const a = r() * Math.PI;
      const l = 4 + r() * 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
    return toTexture(c);
  });
}

/** Cross-section of a hosomaki: nori ring, rice, salmon + avocado core. */
export function makiCapTexture() {
  return memo("maki-cap", () => {
    const S = 512;
    const { c, ctx } = canvas(S, S);
    const cx = S / 2;
    ctx.fillStyle = "#0f160f";
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = "#f3efe6";
    ctx.beginPath();
    ctx.arc(cx, cx, S * 0.46, 0, Math.PI * 2);
    ctx.fill();
    // individual rice grains
    const r = mulberry32(23);
    for (let i = 0; i < 520; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * S * 0.45;
      const x = cx + Math.cos(a) * d;
      const y = cx + Math.sin(a) * d;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI);
      ctx.fillStyle = `rgba(${200 + r() * 40},${196 + r() * 40},${186 + r() * 40},0.9)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 + r() * 4, 4 + r() * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(150,145,130,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    // salmon
    ctx.fillStyle = "#ef7d3e";
    ctx.beginPath();
    ctx.roundRect(cx - 70, cx - 62, 92, 74, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,240,225,0.8)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 64 + i * 22, cx - 58);
      ctx.lineTo(cx - 76 + i * 22, cx + 8);
      ctx.stroke();
    }
    // avocado
    const av = ctx.createLinearGradient(cx, cx, cx + 70, cx + 60);
    av.addColorStop(0, "#c9d66a");
    av.addColorStop(1, "#5f8a2e");
    ctx.fillStyle = av;
    ctx.beginPath();
    ctx.roundRect(cx + 4, cx - 14, 70, 72, 22);
    ctx.fill();
    // shiso
    ctx.fillStyle = "#3f7a33";
    ctx.beginPath();
    ctx.ellipse(cx - 30, cx + 46, 46, 14, -0.3, 0, Math.PI * 2);
    ctx.fill();
    return toTexture(c);
  });
}

export function slateTextures() {
  const map = memo("slate", () => {
    const S = 512;
    const { c, ctx } = canvas(S, S);
    ctx.fillStyle = "#1a1b1d";
    ctx.fillRect(0, 0, S, S);
    const r = mulberry32(41);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${255},${r() * 0.025})`;
      ctx.beginPath();
      ctx.ellipse(r() * S, r() * S, 30 + r() * 120, 6 + r() * 30, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // fine scratches
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${r() * 0.05})`;
      ctx.lineWidth = 0.5;
      const x = r() * S;
      const y = r() * S;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 20);
      ctx.stroke();
    }
    speckle(ctx, S, S, 43, 6000, 0.06);
    return toTexture(c);
  });
  const rough = memo("slate-rough", () => {
    const S = 256;
    const { c, ctx } = canvas(S, S);
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(0, 0, S, S);
    const r = mulberry32(47);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(40,40,40,${r() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(r() * S, r() * S, 20 + r() * 60, 4 + r() * 16, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    return toTexture(c, false);
  });
  return { map, rough };
}

/** Soft round sprite used by particle systems. */
export function dotTexture() {
  return memo("dot", () => {
    const S = 64;
    const { c, ctx } = canvas(S, S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return toTexture(c);
  });
}
