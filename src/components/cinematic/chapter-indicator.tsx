"use client";

import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { CHAPTERS } from "@/lib/scene-config";
import { useStory } from "@/lib/story-store";

/** Fixed "03 / TRANSFORMATION" label. Re-renders only when the chapter changes. */
export function ChapterIndicator({ reducedMotion }: { reducedMotion: boolean }) {
  const id = useStory((s) => s.chapter);
  const chapter = CHAPTERS.find((c) => c.id === id)!;
  const motionProps = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 10, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -10, filter: "blur(6px)" },
      };

  return (
    <LazyMotion features={domAnimation}>
      <p className="sr-only" aria-live="polite">
        Chapter {chapter.number}: {chapter.label}
      </p>
      <div className="eyebrow flex items-center gap-3 text-bone/85" aria-hidden="true">
        <span className="tabular-nums text-gold">{chapter.number}</span>
        <span className="h-px w-6 bg-line" aria-hidden="true" />
        <span className="relative inline-grid min-w-[7.5rem] overflow-hidden sm:min-w-[9.5rem]">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={chapter.id}
              className="col-start-1 row-start-1 whitespace-nowrap"
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              {...motionProps}
            >
              {chapter.label}
              <span lang="ja" className="ml-2 hidden font-jp text-[0.8rem] tracking-normal text-bone/60 sm:inline">
                {chapter.kanji}
              </span>
            </m.span>
          </AnimatePresence>
        </span>
      </div>
    </LazyMotion>
  );
}
