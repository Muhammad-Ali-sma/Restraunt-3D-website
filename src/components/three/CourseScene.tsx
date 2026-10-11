"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { DishKind } from "@/lib/content";
import { Stage } from "./Stage";
import { DishModel, Plate } from "./dishes";
import { GoldDust } from "./effects";

const damp = THREE.MathUtils.damp;

export default function CourseScene({ kind, className }: { kind: DishKind; className?: string }) {
  return (
    <Stage className={className} camera={{ fov: 24, position: [0, 3.4, 6.6], near: 0.1, far: 40 }}>
      <spotLight position={[2.5, 5, 3]} angle={0.5} penumbra={1} intensity={3} decay={0} color="#ffe2b8" />
      <directionalLight position={[-3, 2, -3]} intensity={1.2} color="#8fb7c9" />
      <DragTurn>
        <group position={[0, -0.55, 0]}>
          <Plate />
          <Switcher kind={kind} />
          <ContactShadows position={[0, 0.004, 0]} scale={3.4} resolution={384} blur={2} far={1} opacity={0.9} />
        </group>
      </DragTurn>
      <group position={[0, -0.6, 0]}>
        <GoldDust count={90} area={[5, 2.6, 3]} size={18} />
      </group>
    </Stage>
  );
}

/**
 * Drag to turn the plate (mouse or touch). Horizontal drags spin it freely,
 * vertical drags tilt it a little and spring back on release.
 */
function DragTurn({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const get = useThree((s) => s.get);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = get().gl.domElement;
    let drag: { id: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      target.current.y += (e.clientX - drag.x) * 0.012;
      target.current.x = THREE.MathUtils.clamp(target.current.x + (e.clientY - drag.y) * 0.006, -0.25, 0.45);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const up = () => {
      drag = null;
      target.current.x = 0;
    };
    el.style.touchAction = "pan-y"; // keep vertical page scrolling on touch screens
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [get]);

  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.rotation.y = damp(g.current.rotation.y, target.current.y, 6, dt);
    g.current.rotation.x = damp(g.current.rotation.x, target.current.x, 6, dt);
  });

  return <group ref={g}>{children}</group>;
}

/**
 * Plays an exit animation for the current dish, swaps it, then plays the
 * entrance. Only one dish is ever mounted, which keeps draw calls low.
 */
function Switcher({ kind }: { kind: DishKind }) {
  const [shown, setShown] = useState(kind);
  const g = useRef<THREE.Group>(null);
  const phase = useRef<"in" | "out">("in");

  useEffect(() => {
    if (kind !== shown) phase.current = "out";
  }, [kind, shown]);

  useFrame((state, dt) => {
    const grp = g.current;
    if (!grp) return;
    if (phase.current === "out") {
      const s = damp(grp.scale.x, 0, 14, dt);
      grp.scale.setScalar(s);
      grp.rotation.y += dt * 6;
      if (s < 0.03) {
        phase.current = "in";
        grp.rotation.y = -1.2;
        setShown(kind);
      }
    } else {
      grp.scale.setScalar(damp(grp.scale.x, 1, 7, dt));
      grp.rotation.y = damp(grp.rotation.y, Math.sin(state.clock.elapsedTime * 0.3) * 0.12, 3.5, dt);
    }
    grp.position.y = (1 - grp.scale.x) * 0.4;
  });

  return (
    <group ref={g} scale={0.01}>
      <DishModel kind={shown} />
    </group>
  );
}
