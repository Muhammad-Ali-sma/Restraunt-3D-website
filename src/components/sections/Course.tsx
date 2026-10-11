"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { courses } from "@/lib/content";

const CourseScene = dynamic(() => import("../three/CourseScene"), { ssr: false });

const AUTO_MS = 6500;

export function Course() {
  const section = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [near, setNear] = useState(false);
  const [auto, setAuto] = useState(true);
  const course = courses[index];

  // Mount the WebGL scene only when the section is about to scroll into view.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Gently cycle through the courses until the visitor takes over.
  useEffect(() => {
    if (!auto || !near) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % courses.length), AUTO_MS);
    return () => window.clearInterval(t);
  }, [auto, near]);

  const select = (i: number) => {
    setAuto(false);
    setIndex(i);
  };

  return (
    <section
      ref={section}
      id="course"
      className="relative overflow-hidden border-t border-line bg-ink-2 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
          <div>
            <p className="text-[11px] tracking-[0.35em] text-gold uppercase">02 — Tonight&apos;s omakase</p>
            <h2 className="mt-4 font-display text-4xl text-paper sm:text-6xl">
              The course, <em className="text-gold-soft">in the round.</em>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-paper-dim">
            Five of the seventeen pieces served this season. Pick one, then drag the plate to turn it in the light.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <ol
            className="order-2 divide-y divide-line border-y border-line lg:order-1"
            data-reveal
            style={{ "--d": "120ms" } as React.CSSProperties}
          >
            {courses.map((c, i) => {
              const active = i === index;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => select(i)}
                    onMouseEnter={() => select(i)}
                    aria-pressed={active}
                    className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-5 text-left"
                  >
                    <span className={`font-display text-sm transition ${active ? "text-gold" : "text-paper-dim"}`}>
                      {c.no}
                    </span>
                    <span>
                      <span
                        className={`block font-display text-2xl transition duration-500 sm:text-3xl ${active ? "translate-x-2 text-paper" : "text-paper/50 group-hover:text-paper/80"}`}
                      >
                        {c.name}
                      </span>
                      <span
                        className={`grid transition-all duration-500 ${active ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                      >
                        <span className="overflow-hidden text-sm leading-relaxed text-paper-dim">{c.note}</span>
                      </span>
                    </span>
                    <span className={`font-jp text-sm transition ${active ? "text-gold" : "text-paper/30"}`}>
                      {c.jp}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="relative order-1 aspect-[4/3] lg:order-2" data-reveal>
            <div
              aria-hidden="true"
              className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,#3a2a18_0%,transparent_100%)] opacity-70"
            />
            {near && <CourseScene kind={course.id} className="absolute inset-0 cursor-grab active:cursor-grabbing" />}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2 right-2 font-jp text-6xl text-paper/[0.06] [writing-mode:vertical-rl] sm:text-8xl"
            >
              {course.jp}
            </span>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between text-[11px] tracking-[0.25em] text-paper-dim uppercase">
              <span aria-live="polite">{course.origin}</span>
              <span className="hidden sm:inline">Drag to turn ⟲</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
