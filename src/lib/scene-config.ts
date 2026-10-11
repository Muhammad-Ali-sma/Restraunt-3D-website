/**
 * The chapter sequence. `span` is how much scrolling (in viewport heights) the
 * chapter occupies inside the pinned stage; the master timeline in
 * `hooks/use-cinematic-scroll.ts` uses the same numbers as durations, so one
 * unit of timeline time is always one screen of scroll.
 *
 * Reorder, retitle or retime chapters here. The visual beats inside each
 * chapter live in `lib/animation-config.ts`.
 */
export type ChapterId = "prologue" | "awakening" | "energy" | "transformation" | "ultra" | "surge" | "legend";

export type Chapter = {
  id: ChapterId;
  number: string;
  label: string;
  /** Kanji shown beside the chapter label. */
  kanji: string;
  /** Scroll length in viewport heights (desktop). The legend chapter is not pinned. */
  span: number;
};

export const CHAPTERS: Chapter[] = [
  { id: "prologue", number: "00", label: "Prologue", kanji: "序", span: 1.1 },
  { id: "awakening", number: "01", label: "Awakening", kanji: "覚醒", span: 2 },
  { id: "energy", number: "02", label: "Energy", kanji: "気", span: 2 },
  { id: "transformation", number: "03", label: "Transformation", kanji: "超", span: 3.2 },
  { id: "ultra", number: "04", label: "Ultra Instinct", kanji: "極意", span: 2.4 },
  { id: "surge", number: "05", label: "Final Surge", kanji: "限界", span: 2.4 },
  { id: "legend", number: "06", label: "Legend", kanji: "伝説", span: 0 },
];

/** Chapters that play inside the pinned stage (everything but the ending). */
export const STAGE_CHAPTERS = CHAPTERS.filter((c) => c.span > 0);

/** Timeline start (in viewport heights) of each pinned chapter. */
export const CHAPTER_START: Record<ChapterId, number> = (() => {
  let t = 0;
  const out = {} as Record<ChapterId, number>;
  for (const c of CHAPTERS) {
    out[c.id] = t;
    t += c.span;
  }
  return out;
})();

export const STAGE_LENGTH = STAGE_CHAPTERS.reduce((sum, c) => sum + c.span, 0);

/**
 * Pinned scroll length multiplier. Phones get a shorter story so the pin never
 * feels endless on a small screen.
 */
export const SCROLL_SCALE = { desktop: 1, mobile: 0.72 } as const;

/** Colour script for the whole film. Hex values are sRGB. */
export const PALETTE = {
  ink: "#05060a",
  storm: "#1a2233",
  stormGlow: "#5f7da8",
  ki: "#7fc8ff",
  kiCore: "#e8f6ff",
  gold: "#ffc531",
  goldHot: "#fff1b0",
  ember: "#ff7a1a",
  silver: "#cfd9ff",
  silverDeep: "#6f7dff",
  cosmic: "#0a0d24",
  white: "#ffffff",
} as const;

/** World-space framing used by the camera rig and scene layout. */
export const WORLD = {
  /** Height of the character, feet on y = 0. */
  figureHeight: 2.6,
  /** Ground radius where rocks and cracks are placed. */
  arena: 26,
} as const;
