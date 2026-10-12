/**
 * The "director": a single mutable object describing the current shot.
 *
 * The scroll-scrubbed GSAP master timeline is the only writer of the scripted
 * fields; the WebGL scene, the CSS fallback scene and the sound engine read
 * them every frame. Keeping this outside React means scrolling never causes a
 * re-render, and because every visual reads from one place, nothing fights over
 * the same value.
 *
 * Ranges are 0–1 unless noted.
 */
export const INITIAL_SHOT = {
  // ── camera ──
  /** Camera distance from the character (world units). */
  camZ: 11.5,
  camY: 1.5,
  camX: 0,
  /** Height the camera looks at. */
  lookY: 1.45,
  /** Vertical field of view in degrees. */
  fov: 34,
  /** Orbit around the character (radians). */
  orbit: 0,
  roll: 0,
  shake: 0,

  // ── character ──
  /** Rim light / readability of the silhouette. */
  silhouette: 0.18,
  /** Aura strength. */
  aura: 0,
  /** Golden form (palette + hair). */
  gold: 0,
  /** Hair regrowth into the golden form. */
  ssj: 0,
  /** Silver Ultra Instinct treatment. */
  ultra: 0,
  /** Electric arcs crawling over the body. */
  arcs: 0,

  // ── environment ──
  /** Storm sky + ambient lightning. */
  storm: 1,
  /** Extra darkness pulled over the battlefield. */
  darkness: 0,
  /** Ground visibility (fades away in the cosmic void). */
  ground: 1,
  /** Glowing cracks in the ground. */
  crack: 0,
  /** Radius of the crater fracture (0–1 of the arena). */
  fracture: 0,
  /** Rocks rising off the ground. */
  lift: 0,
  /** Wind-blown dust and debris. */
  dust: 0.35,
  /** Foreground smoke. */
  smoke: 0.7,
  /** Star field + nebula. */
  cosmic: 0,
  /** Light trails sweeping around the character. */
  trails: 0,
  /** Tunnel of light. */
  tunnel: 0,
  /** Forward rush speed (tunnel streaks, debris flying past). */
  speed: 0,

  // ── energy ──
  /** Particles drawn in towards the character. */
  gather: 0,
  /** Shockwave ring travelling across the ground. */
  burst: 0,
  /** Final energy wave expanding through the camera. */
  wave: 0,

  // ── grade ──
  exposure: 1,
  aberration: 0,
  bloom: 1,
  /** How much of the frame an opaque DOM layer covers (the film, the final black). Rendering pauses at 1. */
  cover: 0,
};

export type Shot = typeof INITIAL_SHOT;

export const director = {
  shot: { ...INITIAL_SHOT } as Shot,
  /** Lightning flash, 1 at the strike and decaying (written by the storm). */
  strike: 0,
  /** Changes on every strike so bolts get a new shape. */
  strikeSeed: 0,
  /** Horizontal position of the latest strike, -1 (left) … 1 (right). */
  strikeX: 0,
  /** One-off push-in played with the title on load (time-based, not scroll). */
  introPush: 0,
};

export function resetShot() {
  Object.assign(director.shot, INITIAL_SHOT);
}
