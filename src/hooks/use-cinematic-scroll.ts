"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { RoughEase } from "gsap/EasePack";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { ANIMATION } from "@/lib/animation-config";
import { director, resetShot } from "@/lib/director";
import { CHAPTER_START, SCROLL_SCALE, STAGE_CHAPTERS, STAGE_LENGTH, type ChapterId } from "@/lib/scene-config";
import { strike } from "@/lib/storm";
import { story } from "@/lib/story-store";

gsap.registerPlugin(ScrollTrigger, RoughEase);

type Options = {
  stageRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
  touch: boolean;
  hasVideo: boolean;
  /** A supplied transformation clip replaces the procedural burst on screen. */
  hasTransformVideo: boolean;
  /** Called with how much of the opening film is on screen (0–1). */
  onFilmPresence?: (presence: number) => void;
};

/** Where in each chapter (timeline units) the headline is fully revealed: chapter-nav jumps land here. */
const HEADLINE_AT: Partial<Record<ChapterId, number>> = {
  prologue: 0,
  awakening: 0.95,
  energy: 1.25,
  transformation: 1.75,
  ultra: 1.55,
  surge: 1.85,
};

const scrollScale = () =>
  window.matchMedia("(max-width: 767px)").matches ? SCROLL_SCALE.mobile : SCROLL_SCALE.desktop;

/** Pixels of scroll per unit of timeline time. */
const unit = () => window.innerHeight * scrollScale();

function chapterAt(t: number): ChapterId {
  let id: ChapterId = "prologue";
  for (const c of STAGE_CHAPTERS) if (t >= CHAPTER_START[c.id] - 0.04) id = c.id;
  return id;
}

/**
 * Builds the master timeline that *is* the film. One unit of timeline time is
 * one viewport height of scroll (see `lib/scene-config.ts`), the stage is
 * pinned for the whole story, and everything (the director values read by
 * WebGL, the copy and the DOM overlays) is placed on this single scrubbed
 * timeline, so scrolling backwards rewinds every layer in sync.
 */
export function useCinematicScroll({
  stageRef,
  reducedMotion,
  touch,
  hasVideo,
  hasTransformVideo,
  onFilmPresence,
}: Options) {
  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return;
      ScrollTrigger.config({ ignoreMobileResize: true });
      resetShot();

      const q = gsap.utils.selector(stage);
      const S = director.shot;
      const motion = reducedMotion ? 0 : 1;
      const flash = ANIMATION.intensity.flash * (reducedMotion ? 0.35 : 1);
      const shake = (v: number) => v * motion * ANIMATION.intensity.shake;
      const ab = (v: number) => v * motion * ANIMATION.intensity.aberration;

      const P = CHAPTER_START.prologue;
      const A = CHAPTER_START.awakening;
      const E = CHAPTER_START.energy;
      const T = CHAPTER_START.transformation;
      const U = CHAPTER_START.ultra;
      const F = CHAPTER_START.surge;

      let lastPresence = -1;

      const tl = gsap.timeline({
        defaults: { ease: "none", duration: 1 },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: () => `+=${STAGE_LENGTH * unit()}`,
          pin: true,
          // Reduced motion: the film follows the scrollbar directly, with no easing lag.
          scrub: reducedMotion ? true : touch ? ANIMATION.scrub.touch : ANIMATION.scrub.pointer,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate(self) {
            const t = self.progress * STAGE_LENGTH;
            story.setChapter(chapterAt(t));
            if (hasVideo) {
              const presence = Math.round(gsap.utils.clamp(0, 1, 1 - t / A) * 100) / 100;
              if (presence !== lastPresence) onFilmPresence?.((lastPresence = presence));
            }
          },
        },
      });

      // Pad the timeline so its duration is exactly the story length.
      tl.set({}, {}, STAGE_LENGTH);

      const cam = (vars: gsap.TweenVars, start: number, end: number, ease = "sine.inOut") =>
        tl.to(S, { ...vars, duration: end - start, ease }, start);
      const shot = (vars: gsap.TweenVars, start: number, end: number, ease = "none") =>
        tl.to(S, { ...vars, duration: end - start, ease }, start);
      const show = (sel: string, at: number) => tl.fromTo(q(sel), { opacity: 0 }, { opacity: 1, duration: 0.01 }, at);
      const hide = (sel: string, start: number, end: number, vars: gsap.TweenVars = {}) =>
        tl.to(q(sel), { opacity: 0, duration: end - start, ease: "power1.in", ...vars }, start);
      const chars = (chapter: string, line: number) =>
        q(`[data-chapter="${chapter}"] [data-line="${line}"] .split-char`);
      const kicker = (chapter: string, at: number) =>
        tl.fromTo(
          q(`[data-chapter="${chapter}"] [data-kicker]`),
          { opacity: 0, x: -24 },
          { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
          at,
        );
      const body = (chapter: string, at: number) =>
        tl.fromTo(
          q(`[data-chapter="${chapter}"] [data-body]`),
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
          at,
        );

      // ── 00 · Prologue ─────────────────────────────────────────────────
      tl.to(q("[data-hero-cue]"), { opacity: 0, duration: 0.2 }, P);
      tl.to(
        q("[data-hero-copy]"),
        { opacity: 0, y: -70, filter: "blur(10px)", duration: 0.6, ease: "power1.in" },
        P + 0.05,
      );
      if (hasVideo) {
        tl.fromTo(S, { cover: 1 }, { cover: 0, duration: 0.5 }, P + 0.3);
        tl.to(q("[data-video-layer]"), { opacity: 0, scale: 1.18, duration: 0.75, ease: "power1.in" }, P + 0.35);
      }
      cam({ camZ: 6.2, camY: 1.3 }, P, E, "power1.inOut");

      // ── 01 · Awakening ────────────────────────────────────────────────
      // The copy sits left of frame in chapters 1–2, so the figure moves right.
      cam({ camX: -0.85 }, A, A + 0.7);
      shot({ silhouette: 1 }, A + 0.2, A + 1.6, "power1.inOut");
      shot({ smoke: 0.4, dust: 0.55, lift: 0.1 }, A, E);
      if (motion) {
        // Scripted strikes fire only when the visitor is reading forwards,
        // never while rewinding or jumping (e.g. the replay button).
        const scripted = (intensity: number) => () => {
          const st = tl.scrollTrigger;
          if (st && st.direction === 1 && Math.abs(st.getVelocity()) < 4000) strike(intensity);
        };
        tl.call(scripted(0.95), [], A + 0.35);
        tl.call(scripted(1), [], A + 1.25);
      }
      show('[data-chapter="awakening"]', A + 0.25);
      kicker("awakening", A + 0.25);
      tl.fromTo(
        q('[data-chapter="awakening"] .split-char'),
        { yPercent: 110 },
        { yPercent: 0, duration: 0.4, stagger: 0.016, ease: "power3.out" },
        A + 0.3,
      );
      body("awakening", A + 0.62);
      hide('[data-chapter="awakening"]', A + 1.55, A + 1.88, { y: -40 });

      // ── 02 · The energy within ────────────────────────────────────────
      shot({ darkness: 0.65 }, E, E + 0.7, "sine.inOut");
      shot({ storm: 0.5 }, E, E + 0.8);
      shot({ aura: 0.6 }, E + 0.15, E + 1.9, "power1.in");
      shot({ gather: 1 }, E + 0.1, E + 1.5, "sine.inOut");
      shot({ crack: 0.65 }, E + 0.5, E + 1.9);
      shot({ dust: 1, smoke: 0.25 }, E, E + 1.9);
      shot({ shake: shake(0.22) }, E + 0.3, T);
      shot({ lift: 0.4 }, E + 0.3, T, "sine.inOut");
      shot({ arcs: 0.45 }, E + 1.1, T);
      cam({ camZ: 5, camY: 1, lookY: 1.7 }, E, T);
      show('[data-chapter="energy"]', E + 0.25);
      kicker("energy", E + 0.25);
      tl.fromTo(
        chars("energy", 0),
        { opacity: 0, y: 30, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.35, stagger: 0.012, ease: "power2.out" },
        E + 0.3,
      );
      body("energy", E + 0.6);
      tl.fromTo(
        chars("energy", 1),
        { opacity: 0, scale: 1.35, filter: "blur(10px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.35, stagger: 0.014, ease: "power3.out" },
        E + 0.95,
      );
      hide('[data-chapter="energy"]', E + 1.62, E + 1.92, { y: -30 });

      // ── 03 · Super Saiyan ─────────────────────────────────────────────
      // Tension: the aura stutters between blue and gold, the bars close in.
      shot(
        { gold: 0.3 },
        T,
        T + 0.8,
        "rough({ strength: 2, points: 24, template: power1.in, taper: none, randomize: false, clamp: true })",
      );
      shot({ aura: 0.95, shake: shake(0.55) }, T, T + 0.8, "power2.in");
      shot({ crack: 1, arcs: 1, darkness: 0.85 }, T, T + 0.8);
      cam({ camZ: 4.3 }, T, T + 0.8, "power1.in");
      cam({ camX: 0 }, T - 0.1, T + 0.6);
      tl.to(q("[data-overlay=letterbox]"), { scaleY: 1, duration: 0.5, ease: "power2.inOut" }, T + 0.1);

      // The burst.
      const B = T + 0.8;
      tl.to(q("[data-overlay=flash]"), { opacity: flash, duration: 0.1, ease: "power2.in" }, B);
      tl.to(q("[data-overlay=flash]"), { opacity: 0, duration: 0.3, ease: "power2.out" }, B + 0.1);
      shot({ ssj: 1 }, B + 0.02, B + 0.3, "power2.out");
      shot({ gold: 1 }, B + 0.02, B + 0.15);
      shot({ burst: 1 }, B + 0.05, B + 1.1, "power2.out");
      shot({ fracture: 1 }, B + 0.05, B + 0.7, "expo.out");
      shot({ lift: 1 }, B + 0.1, B + 1.4, "power2.out");
      shot({ gather: 0 }, B + 0.02, B + 0.2);
      shot({ aura: 1, dust: 0.8, smoke: 0.3 }, B, B + 0.3);
      shot({ aberration: ab(1) }, B, B + 0.1);
      shot({ aberration: ab(0.15) }, B + 0.1, B + 0.8);
      shot({ shake: shake(1) }, B, B + 0.08);
      shot({ shake: shake(0.3) }, B + 0.08, B + 1);
      shot({ exposure: 1.35 }, B, B + 0.1);
      shot({ exposure: 1 }, B + 0.1, B + 0.8);
      shot({ darkness: 0.25 }, B + 0.05, B + 0.5);

      // A supplied transformation clip plays over the burst, its playhead
      // scrubbed by scroll (it needs dense keyframes, see README).
      const clip = hasTransformVideo ? (q("[data-transform-video]")[0] as HTMLVideoElement | undefined) : undefined;
      if (clip) {
        const playhead = { p: 0 };
        const seek = () => {
          if (!clip.duration || clip.seeking) return;
          const target = playhead.p * (clip.duration - 0.05);
          if (Math.abs(clip.currentTime - target) > 1 / 30) clip.currentTime = target;
        };
        tl.fromTo(clip, { opacity: 0 }, { opacity: 1, duration: 0.2 }, T + 0.55);
        tl.fromTo(playhead, { p: 0 }, { p: 1, duration: 1.1, onUpdate: seek }, T + 0.55);
        shot({ cover: 1 }, T + 0.75, T + 0.76);
        shot({ cover: 0 }, T + 1.64, T + 1.65);
        tl.to(clip, { opacity: 0, duration: 0.3 }, T + 1.65);
      }

      // Hold on the new form for a breath, then pull back to reveal the scale of it.
      cam({ camZ: 4.1, camY: 1.55, lookY: 2.15 }, B + 0.05, B + 0.5, "sine.out");
      cam({ camZ: 13.5, camY: 3.4, lookY: 1.25, fov: 44 }, B + 0.5, B + 1.85, "power2.inOut");
      tl.to(q("[data-overlay=letterbox]"), { scaleY: 0, duration: 0.4, ease: "power2.inOut" }, T + 2.1);

      show('[data-chapter="transformation"]', T + 1.25);
      kicker("transformation", T + 1.25);
      tl.fromTo(
        chars("transformation", 0),
        { opacity: 0, scale: 2.2, filter: "blur(18px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.25, stagger: 0.01, ease: "power4.out" },
        T + 1.25,
      );
      tl.fromTo(
        chars("transformation", 1),
        { opacity: 0, yPercent: 120, rotation: "random(-28, 28)" },
        { opacity: 1, yPercent: 0, rotation: 0, duration: 0.3, stagger: 0.012, ease: "back.out(2)" },
        T + 1.45,
      );
      body("transformation", T + 1.7);
      hide('[data-chapter="transformation"]', T + 2.6, T + 2.95, { scale: 1.05 });

      // ── 04 · Ultra Instinct ───────────────────────────────────────────
      shot({ gold: 0 }, U, U + 0.8, "sine.inOut");
      shot({ ultra: 1 }, U + 0.1, U + 0.9, "sine.inOut");
      shot({ ssj: 0 }, U + 0.1, U + 0.7, "sine.inOut");
      shot({ storm: 0, arcs: 0, shake: 0, aberration: 0 }, U, U + 0.5);
      shot({ ground: 0, crack: 0, darkness: 0, exposure: 1 }, U, U + 0.8, "sine.inOut");
      shot({ cosmic: 1 }, U + 0.1, U + 0.9, "sine.inOut");
      shot({ dust: 0.1, smoke: 0.1 }, U, U + 0.6);
      shot({ aura: 0.55 }, U, U + 0.9, "sine.inOut");
      cam({ camZ: 9, camY: 1.3, lookY: 0.45, fov: 34 }, U, U + 1.2, "power2.inOut");
      shot({ orbit: 0.6 }, U + 0.4, F, "sine.inOut");
      shot({ trails: 1 }, U + 0.6, U + 1.3, "sine.inOut");

      show('[data-chapter="ultra"]', U + 0.6);
      kicker("ultra", U + 0.6);
      tl.fromTo(
        chars("ultra", 0),
        { opacity: 0, y: 12, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.022, ease: "sine.out" },
        U + 0.65,
      );
      tl.fromTo(
        chars("ultra", 1),
        { opacity: 0, y: 12, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.022, ease: "sine.out" },
        U + 1.1,
      );
      body("ultra", U + 1.35);
      hide('[data-chapter="ultra"]', U + 2.0, U + 2.35, { filter: "blur(8px)" });

      // ── 05 · The final surge ──────────────────────────────────────────
      shot({ gather: 1 }, F, F + 0.7, "sine.inOut");
      shot({ aura: 1, gold: 0.55, ultra: 0.45 }, F, F + 0.8, "power2.in");
      shot({ orbit: 0 }, F, F + 1.2, "sine.inOut");
      cam({ lookY: 1.4, camY: 1.5 }, F, F + 0.8);
      shot({ shake: shake(0.35) }, F, F + 0.8);
      shot({ arcs: 0.7 }, F + 0.3, F + 0.8);
      shot({ cosmic: 0.35 }, F + 0.3, F + 1);
      shot({ tunnel: 1 }, F + 0.5, F + 0.9, "sine.inOut");
      shot({ speed: 1 }, F + 0.5, F + 1.4, "power2.in");
      cam({ camZ: 2.8, fov: reducedMotion ? 40 : 58 }, F + 0.6, F + 1.5, "power2.in");
      shot({ aberration: ab(0.7), shake: shake(0.7) }, F + 0.7, F + 1.5);
      shot({ trails: 0, cosmic: 0 }, F + 0.9, F + 1.3);
      shot({ wave: 1, exposure: 2.6 }, F + 1.3, F + 1.7, "power2.in");
      tl.to(q("[data-overlay=white]"), { opacity: 1, duration: 0.22, ease: "power2.in" }, F + 1.5);

      show('[data-chapter="surge"]', F + 1.68);
      tl.fromTo(
        q('[data-chapter="surge"] .split-char'),
        { opacity: 0, scale: 0.55, filter: "blur(12px)" },
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.28,
          stagger: { each: 0.008, from: "center" },
          ease: "power3.out",
        },
        F + 1.68,
      );
      body("surge", F + 1.85);
      // Cut to black: the copy inverts on the same beat, so it never sits grey on grey.
      tl.fromTo(q('[data-chapter="surge"]'), { color: "#05060a" }, { color: "#eef1f7", duration: 0.06 }, F + 2.0);
      tl.to(q("[data-overlay=black]"), { opacity: 1, duration: 0.06 }, F + 2.0);
      shot({ cover: 1 }, F + 2.25, F + 2.3);
      hide('[data-chapter="surge"]', F + 2.3, F + 2.4);

      // ── chapter navigation targets ───────────────────────────────────
      const trigger = tl.scrollTrigger!;
      story.chapterScroll = (id) => {
        if (id === "legend") {
          const el = document.getElementById("legend");
          return el ? el.getBoundingClientRect().top + window.scrollY : null;
        }
        const at = HEADLINE_AT[id];
        return at === undefined ? null : Math.round(trigger.start + (CHAPTER_START[id] + at) * unit());
      };
      story.settle = () => {
        ScrollTrigger.update();
        trigger.getTween()?.progress(1);
      };
      ScrollTrigger.refresh();

      return () => {
        story.chapterScroll = () => null;
        story.settle = () => {};
        resetShot();
      };
    },
    { scope: stageRef, dependencies: [reducedMotion, touch, hasVideo, hasTransformVideo], revertOnUpdate: true },
  );
}
