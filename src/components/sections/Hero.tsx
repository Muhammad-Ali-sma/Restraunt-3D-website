"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { courses, type DishKind } from "@/lib/content";

// Three.js only ever loads in the browser, in its own chunk, after the film starts.
const HeroScene = dynamic(() => import("../three/HeroScene"), { ssr: false });

type Phase = "intro" | "reveal" | "live";

const FILM = [
  { src: "/media/kuroshio-film.webm", type: "video/webm" },
  { src: "/media/kuroshio-film.mp4", type: "video/mp4" },
];
const POSTER = "/media/kuroshio-poster.webp";
const SEEN_KEY = "kuroshio:intro";

// The boot script in layout.tsx decides before first paint whether to skip the
// film (repeat visit or reduced motion); read that decision without a re-render.
const noop = () => () => {};
const readSkip = () => document.documentElement.dataset.intro === "skip";

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const titleFilm = useRef<HTMLVideoElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const skip = useSyncExternalStore(noop, readSkip, () => false);
  const [phaseState, setPhase] = useState<Phase>("intro");
  const [sceneState, setScene] = useState(false);
  const [hovered, setHovered] = useState<DishKind | null>(null);
  const phase: Phase = skip ? "live" : phaseState;
  const scene = skip || sceneState;
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const finish = useCallback(() => {
    if (phaseRef.current !== "intro") return;
    phaseRef.current = "reveal";
    setScene(true);
    setPhase("reveal");
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    window.setTimeout(() => {
      setPhase("live");
      film.current?.pause();
    }, 1500);
  }, []);

  const replay = useCallback(() => {
    document.documentElement.removeAttribute("data-intro");
    window.scrollTo({ top: 0 });
    const v = film.current;
    if (!v) return;
    v.currentTime = 0;
    phaseRef.current = "intro";
    setScene(true);
    setPhase("intro");
    v.play().catch(() => setPhase("live"));
  }, []);

  // Boot: either skip straight to the 3D hero, or roll the film.
  useEffect(() => {
    if (readSkip()) return;
    const v = film.current!;
    v.play().catch(finish); // autoplay blocked (e.g. iOS low-power) → straight to 3D
    // Fetch + mount the 3D scene while the film plays, but only once the page
    // has loaded and the main thread is idle, so it never competes with first paint.
    let idle = 0;
    const schedule = () => {
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(() => setScene(true), { timeout: 2500 })
        : window.setTimeout(() => setScene(true), 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
    };
  }, [finish]);

  // Any intent to move on ends the film early.
  useEffect(() => {
    if (phase !== "intro") return;
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "Enter", " ", "ArrowDown", "PageDown"].includes(e.key)) finish();
    };
    const onWheel = (e: WheelEvent) => e.deltaY > 8 && finish();
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => touchY - e.touches[0].clientY > 30 && finish();
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [phase, finish]);

  const playTitle = () => titleFilm.current?.play().catch(() => {});
  const pauseTitle = () => titleFilm.current?.pause();
  const dish = hovered ? courses.find((c) => c.id === hovered) : null;

  return (
    <>
      {/* ------------------------------------------------ intro film */}
      <div
        className="intro fixed inset-0 z-50 bg-ink"
        data-phase={phase}
        role="dialog"
        aria-label="Intro film"
        aria-hidden={phase !== "intro"}
      >
        <video
          ref={film}
          className="absolute inset-0 h-full w-full object-cover object-[70%_50%]"
          poster={POSTER}
          muted
          playsInline
          preload="auto"
          onEnded={finish}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (progress.current && v.duration)
              progress.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
          }}
        >
          {FILM.map((f) => (
            <source key={f.type} src={f.src} type={f.type} />
          ))}
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/40" />

        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="intro-line font-jp text-6xl text-paper/90 sm:text-7xl" style={{ animationDelay: "0.4s" }}>
            黒潮
          </p>
          <p
            className="intro-line mt-6 font-display text-2xl italic text-paper sm:text-4xl"
            style={{ animationDelay: "1.6s" }}
          >
            From the black current
          </p>
          <p
            className="intro-line mt-2 font-display text-2xl italic text-gold-soft sm:text-4xl"
            style={{ animationDelay: "4s" }}
          >
            to a counter of twelve.
          </p>
        </div>

        <div className="absolute inset-x-6 bottom-6 flex items-center gap-6 sm:inset-x-10 sm:bottom-10">
          <div className="h-px flex-1 bg-paper/15">
            <div ref={progress} className="h-px origin-left scale-x-0 bg-gold" />
          </div>
          <button
            type="button"
            onClick={finish}
            className="text-xs tracking-[0.3em] text-paper/70 uppercase transition hover:text-gold-soft"
          >
            Enter ↵
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ 3D hero */}
      <section ref={section} id="top" className="relative flex h-[100svh] min-h-[620px] flex-col overflow-hidden">
        <div className="relative flex-1">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(60%_55%_at_55%_55%,#2a2016_0%,#0b0a09_70%)]"
          />
          {scene && (
            <HeroScene
              className="absolute inset-0"
              active={phase !== "intro"}
              onHover={setHovered}
              eventSource={section}
            />
          )}

          <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-5 pt-24 pb-6 sm:px-10 sm:pt-28">
            <div className="max-w-md">
              <p className="text-[11px] tracking-[0.35em] text-gold uppercase">
                Omakase · Twelve seats · Harbour District
              </p>
              <p className="mt-5 font-display text-3xl leading-tight text-paper sm:text-[2.6rem]">
                Seventeen courses, <em className="text-gold-soft">carried in</em> on the warmest current in the Pacific.
              </p>
              <div className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#reserve"
                  className="rounded-full bg-paper px-6 py-3 text-xs font-medium tracking-[0.2em] text-ink uppercase transition hover:bg-gold-soft"
                >
                  Reserve a seat
                </a>
                <button
                  type="button"
                  onClick={replay}
                  className="group flex items-center gap-3 rounded-full border border-paper/20 px-5 py-3 text-xs tracking-[0.2em] text-paper uppercase transition hover:border-gold hover:text-gold-soft"
                >
                  <span className="grid size-5 place-items-center rounded-full border border-current text-[8px]">
                    ▶
                  </span>
                  Replay the film
                </button>
              </div>
            </div>

            <div className="flex items-end justify-between gap-6">
              <p className="hidden text-[11px] tracking-[0.3em] text-paper-dim uppercase sm:block">
                Hover a piece · click to turn it
              </p>
              <div
                aria-live="polite"
                className={`ml-auto min-h-16 text-right transition duration-500 ${dish ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
              >
                {dish && (
                  <>
                    <p className="font-jp text-sm text-gold">{dish.jp}</p>
                    <p className="font-display text-2xl text-paper">{dish.name}</p>
                    <p className="text-xs text-paper-dim">{dish.origin}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* The film plays inside the letters while hovered (tap on touch screens) */}
        <div
          className="film-title relative shrink-0 cursor-default select-none"
          onPointerEnter={(e) => e.pointerType === "mouse" && playTitle()}
          onPointerLeave={(e) => e.pointerType === "mouse" && pauseTitle()}
          onClick={() => (titleFilm.current?.paused ? playTitle() : pauseTitle())}
        >
          <video
            ref={titleFilm}
            className="absolute inset-0 h-full w-full object-cover"
            poster={POSTER}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          >
            {FILM.map((f) => (
              <source key={f.type} src={f.src} type={f.type} />
            ))}
          </video>
          <h1 className="relative text-center font-display text-[15.6vw] leading-[0.82] font-black tracking-[-0.04em] uppercase">
            Kuroshio
          </h1>
        </div>
      </section>
    </>
  );
}
