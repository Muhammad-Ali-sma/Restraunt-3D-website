"use client";

import { useEffect } from "react";

/** Lenis inertial scrolling, loaded after hydration and skipped for reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: { destroy: () => void } | undefined;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: -40 } });
    });
    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, []);
  return null;
}
