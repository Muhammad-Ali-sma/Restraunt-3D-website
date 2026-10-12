"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";
import { ANIMATION } from "@/lib/animation-config";
import { director } from "@/lib/director";
import { HERO_COPY } from "@/lib/story-copy";
import { story } from "@/lib/story-store";
import { SplitText } from "./split-text";

/**
 * Opening title card. Its entrance is time-based (it plays on load and on
 * replay) and only animates the characters, subtitle and cue. The scroll
 * timeline separately fades the whole block, so the two never compete for
 * the same element.
 */
export function HeroIntro({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      // Scene layers elsewhere in the stage opt into the camera push-in with data-hero-push.
      // (Resolved through the DOM: the parent's ref isn't attached yet when this effect runs.)
      const scene = (sel: string) => root.current?.closest(".stage")?.querySelectorAll(sel) ?? [];
      const { delay, charStagger, charDuration, push } = ANIMATION.intro;

      const play = () => {
        const tl = gsap.timeline({ delay: reducedMotion ? 0 : delay });
        if (reducedMotion) {
          tl.set(q(".hero-char"), { opacity: 1, yPercent: 0, filter: "none" })
            .fromTo(q("[data-hero-fade]"), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0)
            .set(director, { introPush: 1 }, 0);
          return tl;
        }
        tl.fromTo(
          q(".hero-char"),
          { opacity: 0, yPercent: 70, scaleY: 1.4, filter: "blur(14px)" },
          {
            opacity: 1,
            yPercent: 0,
            scaleY: 1,
            filter: "blur(0px)",
            duration: charDuration,
            ease: ANIMATION.ease.reveal,
            stagger: charStagger,
            clearProps: "filter",
          },
          0,
        )
          .fromTo(director, { introPush: 0 }, { introPush: 1, duration: push, ease: "power2.out" }, 0)
          .fromTo(
            scene("[data-hero-push]"),
            { scale: 1.14 },
            { scale: 1, duration: push, ease: "power2.out", transformOrigin: "50% 60%" },
            0,
          )
          .fromTo(
            q("[data-hero-fade]"),
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 1.2, ease: ANIMATION.ease.reveal, stagger: 0.18 },
            0.75,
          );
        return tl;
      };

      let intro = play();
      story.restartIntro = () => {
        intro.kill();
        intro = play();
      };
      return () => {
        story.restartIntro = () => {};
      };
    },
    { scope: root, dependencies: [reducedMotion] },
  );

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      <div
        data-hero-copy
        className="absolute inset-x-0 bottom-[16svh] flex flex-col items-center px-6 text-center md:bottom-[18svh]"
      >
        <p data-hero-fade className="eyebrow mb-5 text-dim md:mb-7">
          {HERO_COPY.kicker}
        </p>
        <SplitText
          as="h1"
          id="title"
          tabIndex={-1}
          lines={[...HERO_COPY.title]}
          className="display aberrate text-[clamp(4.25rem,15.5vw,15rem)] font-[850] text-bone outline-none"
          charClassName="hero-char"
        />
        <p data-hero-fade className="mt-6 max-w-[28ch] text-[0.95rem] leading-relaxed text-bone/80 md:mt-8 md:text-lg">
          {HERO_COPY.subtitle}
        </p>
      </div>

      <div
        data-hero-cue
        className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 md:bottom-8"
        aria-hidden="true"
      >
        <span data-hero-fade className="eyebrow cue-shimmer">
          {HERO_COPY.cue}
        </span>
        <span data-hero-fade className="scroll-cue-line block h-10 w-px bg-line md:h-14" />
      </div>
    </div>
  );
}
