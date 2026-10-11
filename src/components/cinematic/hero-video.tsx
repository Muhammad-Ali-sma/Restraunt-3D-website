"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ASSET_PATHS, type AssetManifest } from "@/lib/assets";
import { useStory } from "@/lib/story-store";

export type HeroVideoHandle = {
  play: () => void;
  pause: () => void;
  restart: () => void;
  /** 0–1: how much of the film is still on screen (drives its volume). */
  setPresence: (v: number) => void;
};

/**
 * The opening film, when one has been supplied. It always starts muted (the
 * only way browsers allow autoplay) and loops until the story takes over; the
 * scroll timeline only fades and scales its wrapper, never its playhead.
 */
export const HeroVideo = forwardRef<HeroVideoHandle, { assets: AssetManifest }>(function HeroVideo({ assets }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const presence = useRef(1);
  const soundOn = useStory((s) => s.soundOn);

  useImperativeHandle(ref, () => ({
    play: () => void video.current?.play().catch(() => {}),
    pause: () => video.current?.pause(),
    restart: () => {
      const v = video.current;
      if (!v) return;
      v.currentTime = 0;
      void v.play().catch(() => {});
    },
    setPresence: (v) => {
      presence.current = v;
      if (video.current) video.current.volume = Math.max(0, Math.min(1, v));
    },
  }));

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = !soundOn;
    v.volume = presence.current;
  }, [soundOn]);

  return (
    <video
      ref={video}
      className="h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={assets.introPoster ? ASSET_PATHS.introPoster : undefined}
      aria-label="Opening film: Goku powers up on a storm-lit battlefield"
    >
      {assets.introVideoMobile ? (
        <source src={ASSET_PATHS.introVideoMobile} type="video/mp4" media="(max-width: 767px)" />
      ) : null}
      {assets.introVideoWebm ? <source src={ASSET_PATHS.introVideoWebm} type="video/webm" /> : null}
      <source src={ASSET_PATHS.introVideo} type="video/mp4" />
      {assets.introCaptions ? (
        <track kind="captions" src={ASSET_PATHS.introCaptions} srcLang="en" label="English" default />
      ) : null}
    </video>
  );
});
