"use client";

import { Canvas, useThree, type CanvasProps } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

/**
 * Shared canvas shell:
 * - stops rendering entirely while scrolled off-screen or when the tab is hidden
 * - adapts device-pixel-ratio to measured frame rate (PerformanceMonitor)
 * - studio reflections come from a tiny procedural light-box baked once with
 *   PMREM — no HDR download and none of the HDR/EXR loader code in the bundle
 */
export function Stage({
  children,
  camera,
  className,
  eventSource,
  paused = false,
}: {
  children: ReactNode;
  /** Keep the scene mounted (shaders compiled) but render nothing, e.g. while covered. */
  paused?: boolean;
  camera: CanvasProps["camera"];
  className?: string;
  eventSource?: React.RefObject<HTMLElement | null>;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [dpr, setDpr] = useState(1.5);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let inView = true;
    const update = () => setVisible(inView && document.visibilityState === "visible");
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div ref={wrap} className={className} aria-hidden="true">
      <Canvas
        frameloop={visible && !paused ? "always" : "never"}
        dpr={dpr}
        camera={camera}
        eventSource={eventSource as React.RefObject<HTMLElement> | undefined}
        eventPrefix={eventSource ? "client" : "offset"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <PerformanceMonitor
          bounds={() => [45, 58]}
          onIncline={() => setDpr((d) => Math.min(d + 0.25, Math.min(2, window.devicePixelRatio)))}
          onDecline={() => setDpr((d) => Math.max(d - 0.25, 0.75))}
          flipflops={4}
          onFallback={() => setDpr(1)}
        />
        <StudioLights />
        {children}
        <Warmup />
      </Canvas>
    </div>
  );
}

/**
 * Compile every shader up front so the first visible frame doesn't hitch.
 * compileAsync uses KHR_parallel_shader_compile where available, so linking
 * happens off the main thread instead of blocking it.
 */
function Warmup() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene, camera } = get();
    gl.compileAsync(scene, camera).catch(() => {});
  }, [get]);
  return null;
}

/** Soft-box panels rendered once into a prefiltered environment map. */
const PANELS: {
  color: string;
  intensity: number;
  position: [number, number, number];
  scale: [number, number];
  rotation: [number, number, number];
}[] = [
  { color: "#ffe2b8", intensity: 2.2, position: [0, 5, 2], scale: [8, 3], rotation: [Math.PI / 2, 0, 0] },
  { color: "#ffffff", intensity: 1.2, position: [-5, 2, 1], scale: [3, 6], rotation: [0, Math.PI / 2, 0] },
  { color: "#9cc7d6", intensity: 0.8, position: [5, 1.5, -2], scale: [2, 5], rotation: [0, -Math.PI / 2, 0] },
  { color: "#c9a35b", intensity: 0.6, position: [0, 1, -6], scale: [10, 1], rotation: [0, 0, 0] },
];

function StudioLights() {
  const get = useThree((s) => s.get);

  useLayoutEffect(() => {
    const { gl, scene } = get();
    const box = new THREE.Scene();
    const plane = new THREE.PlaneGeometry(1, 1);
    const mats: THREE.Material[] = [];
    for (const p of PANELS) {
      const m = new THREE.MeshBasicMaterial({
        color: new THREE.Color(p.color).multiplyScalar(p.intensity),
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      mats.push(m);
      const mesh = new THREE.Mesh(plane, m);
      mesh.position.set(...p.position);
      mesh.rotation.set(...p.rotation);
      mesh.scale.set(p.scale[0], p.scale[1], 1);
      box.add(mesh);
    }
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(box, 0.04);
    scene.environment = target.texture;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      plane.dispose();
      mats.forEach((m) => m.dispose());
    };
  }, [get]);

  return <ambientLight intensity={0.15} />;
}
