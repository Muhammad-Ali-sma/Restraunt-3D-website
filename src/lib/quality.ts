/**
 * Rendering budget per device class. Detected once on the client and lowered
 * at runtime if the measured frame rate drops (see `three/stage-canvas.tsx`).
 */
export type QualityTier = "high" | "medium" | "low";

export type QualitySettings = {
  tier: QualityTier;
  particles: number;
  rocks: number;
  smokeLayers: number;
  /** Bloom and chromatic aberration. */
  postprocessing: boolean;
  /** Resolution of the generated character textures. */
  figureTexture: number;
  maxDpr: number;
};

export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: {
    tier: "high",
    particles: 2600,
    rocks: 46,
    smokeLayers: 4,
    postprocessing: true,
    figureTexture: 1024,
    maxDpr: 2,
  },
  medium: {
    tier: "medium",
    particles: 1500,
    rocks: 30,
    smokeLayers: 3,
    postprocessing: true,
    figureTexture: 768,
    maxDpr: 1.5,
  },
  low: {
    tier: "low",
    particles: 700,
    rocks: 18,
    smokeLayers: 2,
    postprocessing: false,
    figureTexture: 512,
    maxDpr: 1.25,
  },
};

export function detectQuality(): QualitySettings {
  if (typeof window === "undefined") return QUALITY.medium;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if ((coarse && small) || memory <= 2 || cores <= 2) return QUALITY.low;
  if (coarse || cores <= 4 || memory <= 4) return QUALITY.medium;
  return QUALITY.high;
}

export function lowerTier(tier: QualityTier): QualityTier {
  return tier === "high" ? "medium" : "low";
}

export function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** True when WebGL can actually create a context (not just when the API exists). */
export function supportsWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
