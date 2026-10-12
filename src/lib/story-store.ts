import { useSyncExternalStore } from "react";
import type { ChapterId } from "./scene-config";

export type WebGLStatus = "loading" | "ready" | "unavailable";

type StoryState = {
  /** Chapter currently on screen. Changes a handful of times per visit. */
  chapter: ChapterId;
  webgl: WebGLStatus;
  soundOn: boolean;
};

let state: StoryState = { chapter: "prologue", webgl: "loading", soundOn: false };
const subscribers = new Set<() => void>();

function set(patch: Partial<StoryState>) {
  const next = { ...state, ...patch };
  if ((Object.keys(patch) as (keyof StoryState)[]).every((k) => next[k] === state[k])) return;
  state = next;
  subscribers.forEach((fn) => fn());
}

type ScrollOptions = { immediate?: boolean; duration?: number };

const nativeScrollTo = (y: number, { immediate }: ScrollOptions = {}) =>
  window.scrollTo({ top: y, behavior: immediate ? "instant" : "smooth" });

/**
 * Small external store shared by the DOM layer, the WebGL scene and the UI.
 * Only low-frequency state lives here, so React never re-renders on scroll.
 * Imperative hooks (scrolling, replaying the intro) are registered by the
 * components that own them.
 */
export const story = {
  get: () => state,
  subscribe(fn: () => void) {
    subscribers.add(fn);
    return () => void subscribers.delete(fn);
  },
  setChapter: (chapter: ChapterId) => set({ chapter }),
  setWebGL: (webgl: WebGLStatus) => set({ webgl }),
  setSound: (soundOn: boolean) => set({ soundOn }),

  /** Replaced by Lenis when smooth scrolling is active. */
  scrollTo: nativeScrollTo as (y: number, options?: ScrollOptions) => void,
  resetScrollTo() {
    story.scrollTo = nativeScrollTo;
  },
  /** Skip the scrub smoothing so the story jumps straight to the current scroll position. */
  settle: () => {},
  /** Scroll position (px) where a chapter's headline is fully on screen. */
  chapterScroll: (() => null) as (id: ChapterId) => number | null,
  /** Replays the opening title sequence and restarts the film. */
  restartIntro: () => {},
};

const serverState = state;

export function useStory<T>(select: (s: StoryState) => T): T {
  return useSyncExternalStore(
    story.subscribe,
    () => select(state),
    () => select(serverState),
  );
}
