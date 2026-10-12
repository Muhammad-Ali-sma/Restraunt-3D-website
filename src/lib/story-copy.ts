import type { ChapterId } from "./scene-config";

/** On-screen copy for each chapter. Headlines are split into visual lines. */
export const HERO_COPY = {
  kicker: "An unofficial fan-made cinematic experience",
  title: ["The power", "within."],
  subtitle: "Beyond every limit lies another transformation.",
  cue: "Scroll to awaken",
} as const;

export const CHAPTER_COPY: Record<Exclude<ChapterId, "prologue" | "legend">, { lines: string[]; body: string }> = {
  awakening: {
    lines: ["A warrior", "never falls."],
    body: "The battlefield has gone quiet. Smoke hangs where the last blow landed, and one figure is still standing.",
  },
  energy: {
    lines: ["Power is not given.", "It is awakened."],
    body: "Under the exhaustion, something faint begins to answer: a cold blue light that gathers with every breath.",
  },
  transformation: {
    lines: ["Limits are made", "to be broken."],
    body: "Grief, anger and resolve collapse into a single golden instant, and the ground gives way beneath it.",
  },
  ultra: {
    lines: ["When the mind is still,", "the body moves."],
    body: "No rage and no thought, only movement answered perfectly, as quiet as starlight.",
  },
  surge: {
    lines: ["There is always", "another level."],
    body: "Every limit was only the next starting line.",
  },
};

export const LEGEND_COPY = {
  lines: ["The legend", "never ends."],
  replay: "Replay experience",
} as const;
