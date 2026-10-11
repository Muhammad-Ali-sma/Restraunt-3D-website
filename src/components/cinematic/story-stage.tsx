"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useCinematicScroll } from "@/hooks/use-cinematic-scroll";
import { ASSET_PATHS, type AssetManifest } from "@/lib/assets";
import { supportsWebGL } from "@/lib/quality";
import { story, useStory } from "@/lib/story-store";
import { FallbackScene } from "./fallback-scene";
import { HeroIntro } from "./hero-intro";
import { HeroVideo, type HeroVideoHandle } from "./hero-video";
import { StorySection } from "./story-section";

// Three.js, R3F and the post-processing stack load in their own chunk, only on
// the client, and only once the browser is idle after the first paint.
const StageCanvas = dynamic(() => import("@/components/three/stage-canvas"), { ssr: false });

type Props = {
  assets: AssetManifest;
  reducedMotion: boolean;
  touch: boolean;
  videoRef: RefObject<HeroVideoHandle | null>;
};

/**
 * The pinned 100svh stage the whole story plays on. Layers, back to front:
 * CSS fallback scene → WebGL scene → opening film → grade/overlays → copy.
 */
export function StoryStage({ assets, reducedMotion, touch, videoRef }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const webgl = useStory((s) => s.webgl);
  const [mount3D, setMount3D] = useState(false);
  const [crossfaded, setCrossfaded] = useState(false);

  useCinematicScroll({
    stageRef: stage,
    reducedMotion,
    touch,
    hasVideo: assets.introVideo,
    hasTransformVideo: assets.transformationVideo,
    onFilmPresence: (presence) => {
      const film = videoRef.current;
      if (!film) return;
      film.setPresence(presence);
      if (presence > 0) film.play();
      else film.pause();
    },
  });

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      if (!supportsWebGL()) story.setWebGL("unavailable");
      else setMount3D(true);
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(start, { timeout: 1500 });
    return () => {
      cancelled = true;
      cancelIdle(id);
    };
  }, []);

  const ready = webgl === "ready";

  return (
    <section id="story" aria-label="The story, told in five chapters">
      <div ref={stage} className="stage">
        <div data-hero-push className="stage-layer">
          <FallbackScene assets={assets} active={!ready || !crossfaded} />
        </div>

        {mount3D ? (
          <div
            className="stage-layer transition-opacity duration-[1200ms] ease-out"
            style={{ opacity: ready ? 1 : 0 }}
            onTransitionEnd={() => setCrossfaded(ready)}
            aria-hidden="true"
          >
            <StageCanvas assets={assets} reducedMotion={reducedMotion} />
          </div>
        ) : null}

        {assets.introVideo ? (
          <div data-hero-push className="stage-layer">
            <div data-video-layer className="stage-layer">
              <HeroVideo ref={videoRef} assets={assets} />
              <div className="stage-layer bg-gradient-to-b from-ink/40 via-transparent to-ink/80" />
            </div>
          </div>
        ) : null}

        {assets.transformationVideo ? (
          <video
            data-transform-video
            className="stage-layer h-full w-full object-cover opacity-0"
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            {assets.transformationVideoWebm ? (
              <source src={ASSET_PATHS.transformationVideoWebm} type="video/webm" />
            ) : null}
            <source src={ASSET_PATHS.transformationVideo} type="video/mp4" />
          </video>
        ) : null}

        <div className="stage-layer vignette pointer-events-none" aria-hidden="true" />
        <div
          data-overlay="flash"
          className="stage-layer pointer-events-none opacity-0 mix-blend-screen"
          style={{
            background:
              "radial-gradient(70% 60% at 50% 55%, #fffbe8 0%, #ffd56a 35%, rgb(255 140 30 / 0.55) 70%, rgb(255 120 20 / 0.2) 100%)",
          }}
          aria-hidden="true"
        />
        <div data-overlay="white" className="stage-layer pointer-events-none bg-white opacity-0" aria-hidden="true" />
        <div data-overlay="black" className="stage-layer pointer-events-none bg-ink opacity-0" aria-hidden="true" />
        <div data-overlay="letterbox" className="letterbox letterbox-top" aria-hidden="true" />
        <div data-overlay="letterbox" className="letterbox letterbox-bottom" aria-hidden="true" />

        <HeroIntro reducedMotion={reducedMotion} />
        <StorySection id="awakening" />
        <StorySection id="energy" />
        <StorySection id="transformation" />
        <StorySection id="ultra" />
        <StorySection id="surge" />

        <SceneStatus status={webgl} pending={mount3D && !ready} />
      </div>
    </section>
  );
}

function SceneStatus({ status, pending }: { status: string; pending: boolean }) {
  const message = pending ? "Rendering scene" : status === "unavailable" ? "Simplified mode: WebGL unavailable" : "";
  return (
    <p
      role="status"
      className={`eyebrow pointer-events-none absolute top-16 left-5 flex items-center gap-2 text-[0.625rem] text-dim transition-opacity duration-700 md:top-auto md:bottom-8 md:left-8 ${
        message ? "opacity-100" : "opacity-0"
      }`}
    >
      {pending ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ki" aria-hidden="true" /> : null}
      {message}
    </p>
  );
}
