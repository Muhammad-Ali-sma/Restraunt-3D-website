import { gsap } from "gsap";
import { ANIMATION } from "./animation-config";
import { director } from "./director";

type StrikeListener = (intensity: number) => void;

const listeners = new Set<StrikeListener>();
let lastStrike = -Infinity;

/** Subscribe to lightning strikes (used by the sound engine for thunder). */
export function onStrike(fn: StrikeListener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/**
 * Fire a lightning strike now. Scripted beats call this too, but it never
 * fires sooner than `storm.minGap` after the previous strike, which keeps the
 * flash rate far below the three-per-second photosensitivity threshold.
 */
export function strike(intensity = 1) {
  const now = performance.now() / 1000;
  if (now - lastStrike < ANIMATION.storm.minGap * 0.6) return;
  lastStrike = now;
  director.strike = Math.min(1, intensity);
  director.strikeSeed = Math.random() * 1000;
  director.strikeX = Math.random() * 1.6 - 0.8;
  listeners.forEach((fn) => fn(director.strike));
}

/**
 * Ambient lightning while the storm is visible. Strike frequency follows the
 * scripted `storm` value, so it fades out naturally as the story leaves the
 * battlefield. Returns a cleanup function.
 */
export function startStorm({ enabled }: { enabled: boolean }) {
  const { minGap, maxGap, decay } = ANIMATION.storm;
  const gap = () => minGap + Math.random() * (maxGap - minGap);
  let wait = 1.4;

  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    director.strike *= Math.exp(-decay * dt);
    if (director.strike < 0.002) director.strike = 0;
    if (!enabled) return;
    const storm = director.shot.storm;
    if (storm < 0.2 || document.visibilityState !== "visible") return;
    wait -= dt * storm;
    if (wait <= 0) {
      strike(0.55 + Math.random() * 0.45 * storm);
      wait = gap();
    }
  };

  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}
