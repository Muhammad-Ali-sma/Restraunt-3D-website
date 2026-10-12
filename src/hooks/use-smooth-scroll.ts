"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { story } from "@/lib/story-store";

/**
 * Lenis smooth scrolling driven by GSAP's ticker, so Lenis, ScrollTrigger and
 * the WebGL frame all advance in the same requestAnimationFrame. Touch devices
 * keep native scrolling (Lenis' default), and it is skipped entirely for
 * reduced motion.
 */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Scroll-linked animation must track the scroll position exactly, even
    // after a slow frame, so GSAP's lag smoothing stays off.
    gsap.ticker.lagSmoothing(0);
    if (!enabled) return;

    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);

    story.scrollTo = (y, { immediate, duration } = {}) =>
      lenis.scrollTo(y, { immediate, duration, force: true, lock: !immediate });

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      story.resetScrollTo();
    };
  }, [enabled]);
}
