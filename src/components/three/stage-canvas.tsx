"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { AssetManifest } from "@/lib/assets";
import { director } from "@/lib/director";
import { detectQuality, lowerTier, QUALITY, type QualitySettings } from "@/lib/quality";
import { story } from "@/lib/story-store";
import { GokuScene } from "./goku-scene";
import { Effects } from "./post-effects";

type Props = { assets: AssetManifest; reducedMotion: boolean };

/**
 * The WebGL layer. Rendering is driven from GSAP's ticker (frameloop "never"
 * + advance), so each frame renders right after the scroll timeline has
 * updated the director: text, overlays and 3D never drift apart. It pauses
 * when the stage is off-screen or fully covered by an opaque DOM layer.
 */
export default function StageCanvas({ assets, reducedMotion }: Props) {
  const [quality, setQuality] = useState<QualitySettings>(detectQuality);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, quality.maxDpr));
  const [figureReady, setFigureReady] = useState(false);
  const declines = useRef(0);
  const onFigureReady = useCallback(() => setFigureReady(true), []);

  useEffect(() => () => story.setWebGL("loading"), []);

  return (
    <CanvasBoundary>
      <Canvas
        frameloop="never"
        dpr={dpr}
        gl={{ antialias: !quality.postprocessing, alpha: false, powerPreference: "high-performance", stencil: false }}
        camera={{ fov: 34, near: 0.1, far: 220, position: [0, 1.5, 11.5] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.setClearColor("#05060a");
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            story.setWebGL("unavailable");
          });
          canvas.addEventListener("webglcontextrestored", () => story.setWebGL("ready"));
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <TickerDriver />
        <PerformanceMonitor
          bounds={() => [40, 58]}
          flipflops={3}
          onDecline={() => {
            declines.current++;
            setDpr((d) => Math.max(0.85, d - 0.25));
            if (declines.current >= 2 && quality.tier !== "low") {
              declines.current = 0;
              setQuality(QUALITY[lowerTier(quality.tier)]);
            }
          }}
          onIncline={() => setDpr((d) => Math.min(quality.maxDpr, window.devicePixelRatio || 1, d + 0.25))}
          onFallback={() => setQuality(QUALITY.low)}
        />
        <GokuScene assets={assets} quality={quality} reducedMotion={reducedMotion} onFigureReady={onFigureReady} />
        {quality.postprocessing ? <Effects multisampling={quality.tier === "high" ? 2 : 0} /> : null}
        <ReadySignal ready={figureReady} />
      </Canvas>
    </CanvasBoundary>
  );
}

function TickerDriver() {
  const advance = useThree((s) => s.advance);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting));
    io.observe(gl.domElement);
    const tick = (time: number) => {
      if (!onScreen) return;
      // Skip frames hidden behind an opaque layer, but only once the scene is
      // ready: it must keep rendering (and compiling) behind the opening film.
      if (director.shot.cover >= 0.999 && story.get().webgl === "ready") return;
      advance(time);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
    };
  }, [advance, gl]);

  return null;
}

/**
 * Reveals the canvas once the character exists and every shader has been
 * compiled (asynchronously where KHR_parallel_shader_compile is available),
 * so the crossfade from the CSS scene never hitches.
 */
function ReadySignal({ ready }: { ready: boolean }) {
  const { gl, scene, camera } = useThree();
  const state = useRef<"waiting" | "compiling" | "done">("waiting");

  useFrame(() => {
    if (!ready || state.current !== "waiting") return;
    state.current = "compiling";
    gl.compileAsync(scene, camera)
      .catch(() => {})
      .finally(() => {
        // two more frames so the first visible one is fully rendered
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            state.current = "done";
            story.setWebGL("ready");
          }),
        );
      });
  });

  return null;
}

/** Any WebGL/shader failure drops back to the CSS scene instead of a broken canvas. */
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[goku] WebGL scene failed; showing the simplified scene.", error);
    story.setWebGL("unavailable");
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
