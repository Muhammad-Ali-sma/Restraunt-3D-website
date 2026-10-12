"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { CHAPTERS, type ChapterId } from "@/lib/scene-config";
import { story, useStory } from "@/lib/story-store";

type Tick = { id: ChapterId; label: string; number: string; at: number; y: number };

/**
 * Thin progress rail on the right edge. The fill is written straight to the
 * DOM from ScrollTrigger (no React renders while scrolling); the chapter marks
 * double as keyboard-accessible jump links.
 */
export function ScrollProgress() {
  const fill = useRef<HTMLSpanElement>(null);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const current = useStory((s) => s.chapter);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (fill.current) fill.current.style.transform = `scaleY(${self.progress.toFixed(4)})`;
      },
    });
    const measure = () => {
      const max = ScrollTrigger.maxScroll(window) || 1;
      setTicks(
        CHAPTERS.flatMap((c) => {
          const y = story.chapterScroll(c.id);
          return y === null ? [] : [{ id: c.id, label: c.label, number: c.number, y, at: Math.min(1, y / max) }];
        }),
      );
    };
    ScrollTrigger.addEventListener("refresh", measure);
    measure();
    return () => {
      ScrollTrigger.removeEventListener("refresh", measure);
      trigger.kill();
    };
  }, []);

  return (
    <nav
      aria-label="Chapters"
      className="pointer-events-none fixed top-1/2 right-3 z-50 h-[44vh] -translate-y-1/2 md:right-6"
    >
      <span className="absolute inset-y-0 right-[3px] w-px bg-line" aria-hidden="true" />
      <span
        ref={fill}
        className="absolute inset-y-0 right-[3px] w-px origin-top scale-y-0 bg-gradient-to-b from-ki via-gold to-silver"
        aria-hidden="true"
      />
      <ol className="hidden md:block">
        {ticks.map((t) => (
          <li key={t.id} className="absolute right-0" style={{ top: `${t.at * 100}%` }}>
            <button
              type="button"
              onClick={() => story.scrollTo(t.y, { duration: 1.8 })}
              className="group pointer-events-auto relative -mt-3 flex h-6 items-center gap-3 pr-0 pl-3"
              aria-label={`Go to chapter ${t.number}: ${t.label}`}
              aria-current={current === t.id ? "step" : undefined}
            >
              <span className="eyebrow pointer-events-none absolute right-5 translate-x-1 whitespace-nowrap text-[0.625rem] text-bone/0 transition duration-300 group-hover:translate-x-0 group-hover:text-bone/80 group-focus-visible:translate-x-0 group-focus-visible:text-bone/80">
                {t.number} · {t.label}
              </span>
              <span
                className={`block h-[7px] w-[7px] rotate-45 border transition-colors duration-500 ${
                  current === t.id ? "border-gold bg-gold" : "border-bone/40 bg-ink group-hover:border-bone"
                }`}
              />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
