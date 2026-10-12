/**
 * Motion and intensity knobs. Tune the feel of the film here without touching
 * the choreography in `hooks/use-cinematic-scroll.ts`.
 */
export const ANIMATION = {
  /**
   * ScrollTrigger scrub smoothing in seconds. A little lag gives the camera
   * weight; touch devices scroll natively, so they get a tighter value.
   */
  scrub: { pointer: 0.9, touch: 0.35 },

  /** Title entrance played once on load (and again on replay). */
  intro: { delay: 0.35, charStagger: 0.055, charDuration: 1.1, push: 3.2 },

  /** Global multipliers (0 disables an effect). */
  intensity: {
    shake: 1,
    /** Screen flashes at impacts. Lightning flashes are capped by `storm.minGap`. */
    flash: 1,
    aberration: 1,
    /** Multiplies particle counts on every quality tier. */
    particles: 1,
  },

  storm: {
    /**
     * Seconds between lightning strikes. Kept well above 1/3 s so the page
     * never exceeds three flashes per second (WCAG 2.3.1).
     */
    minGap: 2.6,
    maxGap: 6.5,
    /** How quickly a strike's light fades (per second). */
    decay: 5.5,
  },

  /** Ease for the title and copy reveals; per-beat eases live in the timeline. */
  ease: {
    reveal: "expo.out",
  },
} as const;
