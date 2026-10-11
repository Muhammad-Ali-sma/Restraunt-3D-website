import { CHAPTERS, type ChapterId } from "@/lib/scene-config";
import { CHAPTER_COPY } from "@/lib/story-copy";
import { SplitText } from "./split-text";

type StoryChapterId = keyof typeof CHAPTER_COPY;

/**
 * Per-chapter composition. Each layout keeps the copy away from the centre of
 * the frame, where the character stands, and the type weight follows the
 * power level: heavy for the transformation, hairline for Ultra Instinct.
 */
const LAYOUT: Record<
  StoryChapterId,
  { block: string; headline: string; inner?: string; line?: [string, string]; body: string; kicker: string }
> = {
  awakening: {
    block: "left-5 right-5 bottom-[10svh] md:left-14 md:right-auto md:bottom-[12svh] md:max-w-[min(60vw,58rem)]",
    headline: "display aberrate text-[clamp(3.4rem,8vw,8.5rem)] font-[820] text-bone",
    body: "mt-5 max-w-[34ch] text-sm leading-relaxed text-bone/75 md:text-base",
    kicker: "text-ki",
  },
  energy: {
    block:
      "left-5 right-5 bottom-[10svh] md:left-14 md:right-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-w-[min(46vw,44rem)]",
    headline: "display text-[clamp(3rem,6.4vw,6.8rem)] font-[760] text-bone",
    line: ["", "text-ki [text-shadow:0_0_0.35em_rgb(127_200_255/0.75)]"],
    body: "mt-6 max-w-[34ch] text-sm leading-relaxed text-bone/75 md:text-base",
    kicker: "text-ki",
  },
  transformation: {
    block: "inset-x-5 top-[14svh] bottom-[9svh] md:inset-x-14 md:top-[15svh] md:bottom-[11svh]",
    headline: "display h-full text-[clamp(3.6rem,11.5vw,13.5rem)] font-[900]",
    inner: "flex h-full flex-col justify-between",
    line: ["gold-text text-left", "gold-text text-right"],
    body: "absolute bottom-[clamp(5rem,20svh,12rem)] right-0 max-w-[30ch] text-right text-sm leading-relaxed text-bone/80 md:text-base",
    kicker: "absolute left-0 -top-8 text-gold md:-top-10",
  },
  ultra: {
    block: "inset-x-5 bottom-[9svh] flex flex-col items-center text-center md:bottom-[10svh]",
    headline: "display text-[clamp(2.4rem,6.4vw,7rem)] font-[160] tracking-[0.06em] text-silver",
    line: ["", "[text-shadow:0_0_0.5em_rgb(207_217_255/0.55)]"],
    body: "mt-5 max-w-[38ch] text-sm leading-relaxed text-silver/75 md:text-base",
    kicker: "text-silver",
  },
  surge: {
    block: "inset-x-5 top-1/2 flex -translate-y-1/2 flex-col items-center text-center",
    headline: "display text-[clamp(3.4rem,11vw,12.5rem)] font-[900]",
    body: "mt-6 max-w-[34ch] text-sm leading-relaxed md:text-base",
    kicker: "",
  },
};

function Kicker({ id, className }: { id: ChapterId; className: string }) {
  const chapter = CHAPTERS.find((c) => c.id === id)!;
  return (
    <p data-kicker className={`eyebrow mb-4 flex items-center gap-3 md:mb-6 ${className}`}>
      <span>{chapter.number}</span>
      <span className="h-px w-8 bg-current opacity-50" />
      <span>{chapter.label}</span>
      <span lang="ja" className="font-jp text-[0.95rem] tracking-normal opacity-80">
        {chapter.kanji}
      </span>
    </p>
  );
}

export function StorySection({ id }: { id: StoryChapterId }) {
  const copy = CHAPTER_COPY[id];
  const layout = LAYOUT[id];
  const headingId = `chapter-${id}`;
  return (
    <section
      data-chapter={id}
      aria-labelledby={headingId}
      className={`chapter-copy pointer-events-none absolute ${layout.block}`}
    >
      <Kicker id={id} className={layout.kicker} />
      <SplitText
        as="h2"
        id={headingId}
        lines={copy.lines}
        className={layout.headline}
        lineClassName={layout.line ?? ""}
        innerClassName={layout.inner}
      />
      <p data-body className={layout.body}>
        {copy.body}
      </p>
    </section>
  );
}
