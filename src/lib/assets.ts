/**
 * Central registry of replaceable media.
 *
 * Every path is relative to `/public`. None of these files ship with the repo:
 * the experience renders an original procedural scene until you drop in media
 * you own or are licensed to use. `lib/asset-manifest.ts` checks at build time
 * which ones exist, so missing files never produce broken requests.
 *
 * See README → "Supplying your own media".
 */
export const ASSET_PATHS = {
  /** Full-screen opening film. MP4 (H.264) is required, WebM (VP9/AV1) optional. */
  introVideo: "/videos/goku-intro.mp4",
  introVideoWebm: "/videos/goku-intro.webm",
  /** Smaller encode served to phones (≤ 720p). Optional. */
  introVideoMobile: "/videos/goku-intro-mobile.mp4",
  /** First frame of the film, shown while it buffers. */
  introPoster: "/images/goku-intro-poster.webp",
  /** WebVTT captions/sound descriptions for the film's audio track. */
  introCaptions: "/videos/goku-intro.vtt",
  /**
   * Optional transformation clip, played inside chapter 03 in place of the
   * procedural hair transformation. Its playhead is scrubbed by scroll, so
   * encode it with frequent keyframes (see README).
   */
  transformationVideo: "/videos/goku-transformation.mp4",
  transformationVideoWebm: "/videos/goku-transformation.webm",

  /** Rigged GLB/GLTF character. Takes priority over the character images. */
  model: "/models/goku.glb",

  /** Transparent cut-outs of the character, one per form (WebP/PNG with alpha). */
  characterBase: "/images/goku-base.webp",
  characterSuperSaiyan: "/images/goku-super-saiyan.webp",
  characterUltraInstinct: "/images/goku-ultra-instinct.webp",

  /** Optional painted backdrops behind the 3D effects. */
  battlefield: "/images/battlefield.webp",
  cosmic: "/images/cosmic-environment.webp",
} as const;

export type AssetKey = keyof typeof ASSET_PATHS;

/** Which assets were found in /public (computed on the server). */
export type AssetManifest = Record<AssetKey, boolean>;

/**
 * Model tuning. Only used when `model` exists. Clip and mesh names are matched
 * case-insensitively against what the GLB actually contains, so nothing is
 * assumed: missing clips simply aren't played.
 */
export const MODEL_CONFIG = {
  /** Height the model is scaled to, in world units (the procedural figure is 2.6). */
  height: 2.6,
  /** Looping idle/power-up clip, if present. Falls back to the first clip. */
  idleClip: "idle",
  /** Clip whose playhead is scrubbed by scroll during the transformation. */
  transformClip: "transform",
  /** Meshes or materials whose colour shifts with each form (e.g. hair). */
  hairMatch: "hair",
  /** Y rotation (radians) to face the camera. */
  rotationY: 0,
} as const;
