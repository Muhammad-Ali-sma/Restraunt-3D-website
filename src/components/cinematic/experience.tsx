"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { useCoarsePointer, useReducedMotion } from "@/hooks/use-media-query";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import type { AssetManifest } from "@/lib/assets";
import { startStorm } from "@/lib/storm";
import { story } from "@/lib/story-store";
import { ChapterIndicator } from "./chapter-indicator";
import { EndingSection } from "./ending-section";
import type { HeroVideoHandle } from "./hero-video";
import { ScrollProgress } from "./scroll-progress";
import { SoundToggle } from "./sound-toggle";
import { StoryStage } from "./story-stage";

export function Experience({ assets }: { assets: AssetManifest }) {
  const reducedMotion = useReducedMotion();
  const touch = useCoarsePointer();
  const curtain = useRef<HTMLDivElement>(null);
  const film = useRef<HeroVideoHandle>(null);

  useSmoothScroll(!reducedMotion);
  useEffect(() => startStorm({ enabled: !reducedMotion }), [reducedMotion]);

  /** Fade to black, rewind everything to the first frame, and play the opening again. */
  const replay = useCallback(() => {
    const rewind = () => {
      story.scrollTo(0, { immediate: true });
      story.settle();
      film.current?.restart();
      story.restartIntro();
      document.getElementById("title")?.focus({ preventScroll: true });
    };
    if (reducedMotion) return rewind();
    gsap
      .timeline()
      .to(curtain.current, { opacity: 1, duration: 0.7, ease: "power2.in" })
      .add(rewind)
      .to(curtain.current, { opacity: 0, duration: 1.4, ease: "power2.out" }, "+=0.3");
  }, [reducedMotion]);

  return (
    <>
      <a
        href="#legend"
        className="eyebrow sr-only z-[80] bg-gold px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-1/2 focus:-translate-x-1/2"
      >
        Skip to the ending
      </a>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between gap-6 p-5 md:p-8">
        <p className="flex items-center gap-3 whitespace-nowrap">
          <span className="display text-[1.35rem] font-[800] tracking-[0.08em] text-bone">Son Goku</span>
          <span lang="ja" className="hidden font-jp text-[0.8rem] text-gold/90 sm:inline">
            孫悟空
          </span>
        </p>
        <ChapterIndicator reducedMotion={reducedMotion} />
      </header>

      <main>
        <StoryStage assets={assets} reducedMotion={reducedMotion} touch={touch} videoRef={film} />
        <EndingSection onReplay={replay} reducedMotion={reducedMotion} />
      </main>

      <div className="fixed right-4 bottom-5 z-50 md:right-8 md:bottom-8">
        <SoundToggle />
      </div>
      <ScrollProgress />
      <div ref={curtain} className="pointer-events-none fixed inset-0 z-[65] bg-black opacity-0" aria-hidden="true" />
    </>
  );
}
