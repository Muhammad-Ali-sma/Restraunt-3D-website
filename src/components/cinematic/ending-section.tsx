"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RotateCcw } from "lucide-react";
import { useMemo, useRef } from "react";
import { mulberry32 } from "@/lib/random";
import { CHAPTERS } from "@/lib/scene-config";
import { LEGEND_COPY } from "@/lib/story-copy";
import { story } from "@/lib/story-store";
import { SplitText } from "./split-text";

const legend = CHAPTERS.find((c) => c.id === "legend")!;

/** Chapter 06: the black-and-gold closing card, replay and credits. */
export function EndingSection({ onReplay, reducedMotion }: { onReplay: () => void; reducedMotion: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const q = gsap.utils.selector(root);
      ScrollTrigger.create({
        trigger: root.current,
        start: "top 55%",
        onEnter: () => story.setChapter("legend"),
        onLeaveBack: () => story.setChapter("surge"),
      });
      if (reducedMotion) return;
      gsap
        .timeline({
          scrollTrigger: { trigger: root.current, start: "top 85%", end: "top 15%", scrub: 0.6 },
        })
        .fromTo(
          q(".legend-char"),
          { opacity: 0, yPercent: 40, filter: "blur(10px)" },
          { opacity: 1, yPercent: 0, filter: "blur(0px)", stagger: 0.04, ease: "power2.out" },
        )
        .fromTo(q("[data-legend-fade]"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.1 }, "-=0.3");
    },
    { scope: root, dependencies: [reducedMotion] },
  );

  const embers = useMemo(() => {
    const r = mulberry32(11);
    return Array.from({ length: 18 }, () => ({
      left: `${r() * 100}%`,
      "--dur": `${7 + r() * 7}s`,
      "--delay": `${-r() * 12}s`,
      "--drift": `${(r() - 0.5) * 80}px`,
    }));
  }, []);

  return (
    <section
      ref={root}
      id="legend"
      aria-labelledby="legend-title"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-ink px-6 pt-32 pb-24 text-center md:pb-28"
    >
      <div className="legend-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="legend-embers pointer-events-none absolute inset-0" aria-hidden="true">
        {embers.map((style, i) => (
          <span key={i} className="legend-ember" style={style as React.CSSProperties} />
        ))}
      </div>

      <p data-legend-fade className="eyebrow relative mb-8 flex items-center gap-3 text-gold">
        <span>{legend.number}</span>
        <span className="h-px w-8 bg-current opacity-50" />
        <span>{legend.label}</span>
        <span lang="ja" className="font-jp text-[0.95rem] tracking-normal opacity-80">
          {legend.kanji}
        </span>
      </p>

      <SplitText
        as="h2"
        id="legend-title"
        lines={[...LEGEND_COPY.lines]}
        className="display gold-text relative text-[clamp(3.6rem,13vw,14rem)] font-[880]"
        charClassName="legend-char"
      />

      <button
        data-legend-fade
        type="button"
        onClick={onReplay}
        className="group relative mt-14 inline-flex items-center gap-4 border border-gold/50 px-7 py-4 text-gold transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink"
      >
        <RotateCcw
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className="transition-transform duration-700 group-hover:-rotate-[360deg]"
        />
        <span className="eyebrow">{LEGEND_COPY.replay}</span>
      </button>

      <footer
        data-legend-fade
        className="relative mt-auto w-full max-w-5xl pt-28 text-left text-[0.72rem] leading-relaxed text-dim"
      >
        <div className="grid gap-6 border-t border-line pt-6 md:grid-cols-3">
          <div>
            <p className="eyebrow mb-2 text-bone/70">Unofficial fan concept</p>
            <p>
              A non-commercial tribute, not affiliated with or endorsed by the rights holders. Dragon Ball and Son Goku
              © Bird Studio / Shueisha, Toei Animation.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2 text-bone/70">Visuals &amp; sound</p>
            <p>
              Every image, effect and sound in this build is generated in code: an original silhouette, GLSL shaders and
              a Web Audio soundscape. No official artwork is included. Licensed media can be dropped in (see README).
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2 text-bone/70">Built with</p>
            <p>
              Next.js, React Three Fiber, Three.js, GSAP ScrollTrigger, Lenis and Motion. Type: Big Shoulders, Inter and
              Noto Serif JP (SIL OFL).
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
