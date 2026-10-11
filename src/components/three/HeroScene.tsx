"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { courses, type DishKind } from "@/lib/content";
import { Stage } from "./Stage";
import { Chopsticks, Gari, Nigiri, SlateBoard, SoyDish, Wasabi, Yunomi } from "./dishes";
import { GoldDust, Steam } from "./effects";

const damp = THREE.MathUtils.damp;

type Props = {
  /** false while the intro film is on screen: the board waits below, then rises in. */
  active: boolean;
  onHover?: (kind: DishKind | null) => void;
  eventSource: React.RefObject<HTMLElement | null>;
  className?: string;
};

export default function HeroScene({ active, onHover, eventSource, className }: Props) {
  return (
    <Stage
      paused={!active}
      className={className}
      camera={{ fov: 26, position: [0, 2.7, 7.2], near: 0.1, far: 50 }}
      eventSource={eventSource}
    >
      <Composition active={active} onHover={onHover} />
    </Stage>
  );
}

function Composition({ active, onHover }: Pick<Props, "active" | "onHover">) {
  const root = useRef<THREE.Group>(null);
  // Responsive framing: shift right of the copy on wide screens, shrink to fit on portrait ones.
  const aspect = useThree((s) => s.size.width / s.size.height);
  const portrait = aspect < 0.85;
  const fit = portrait ? 0.62 : THREE.MathUtils.clamp(aspect / 1.35, 0.5, 1);
  const shiftX = aspect > 1.3 ? Math.min(0.95, (aspect - 1.3) * 1.6) : 0;
  const spot = useRef<THREE.SpotLight>(null);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const progress = Math.min(window.scrollY / window.innerHeight, 1.2);
    const px = reduced.current ? 0 : state.pointer.x;
    const py = reduced.current ? 0 : state.pointer.y;
    const t = state.clock.elapsedTime;

    // entrance: rise from below once the film has handed over
    g.position.y = damp(g.position.y, active ? -0.35 - progress * 0.6 : -2.2, active ? 2.6 : 8, dt);
    const s = damp(g.scale.x, active ? 1 : 0.85, 2.6, dt);
    g.scale.setScalar(s);

    // parallax toward the cursor, plus a slow scroll-driven turn
    g.rotation.y = damp(g.rotation.y, -0.32 + px * 0.32 + progress * 0.9 + Math.sin(t * 0.25) * 0.03, 3, dt);
    g.rotation.x = damp(g.rotation.x, 0.06 - py * 0.1 + progress * 0.25, 3, dt);

    // the "knife light" follows the pointer across the board
    if (spot.current) {
      spot.current.position.x = damp(spot.current.position.x, px * 3.2, 4, dt);
      spot.current.position.z = damp(spot.current.position.z, 2.2 - py * 1.5, 4, dt);
    }
  });

  return (
    <>
      <spotLight
        ref={spot}
        position={[0, 4.2, 2.2]}
        angle={0.55}
        penumbra={0.9}
        intensity={3.2}
        decay={0}
        color="#ffe0b0"
      />
      <directionalLight position={[-3, 2, -4]} intensity={1.4} color="#8fb7c9" />
      <group position={[shiftX, portrait ? -0.75 : 0, 0]} scale={fit}>
        <group ref={root} position={[0, -2.2, 0]}>
          <SlateBoard />
          <ContactShadows
            position={[0, 0.003, 0]}
            scale={[4.4, 1.9]}
            resolution={512}
            blur={2.2}
            far={1.2}
            opacity={0.85}
            color="#000000"
          />

          <Piece kind="otoro" position={[-1.0, 0, 0.05]} rotation={0.95} onHover={onHover} />
          <Piece kind="sake" position={[0.02, 0, 0.0]} rotation={0.95} onHover={onHover} seed={5} />
          <Piece kind="akami" position={[1.0, 0, -0.05]} rotation={0.95} onHover={onHover} seed={8} />

          <group position={[-1.85, 0, -0.45]}>
            <Yunomi />
            <group position={[0, 0.55, 0]}>
              <Steam height={1.5} width={0.7} />
            </group>
          </group>
          <group position={[1.85, 0, -0.42]}>
            <SoyDish />
          </group>
          <group position={[1.9, 0, 0.45]}>
            <Gari />
          </group>
          <group position={[1.5, 0, 0.55]}>
            <Wasabi />
          </group>
          <group position={[-0.3, 0, 0.72]} rotation={[0, 0.05, 0]}>
            <Chopsticks />
          </group>
          <GoldDust count={240} area={[7, 3.4, 4]} />
        </group>
      </group>
    </>
  );
}

function Piece({
  kind,
  position,
  rotation,
  seed = 1,
  onHover,
}: {
  kind: Exclude<DishKind, "maki">;
  position: [number, number, number];
  rotation: number;
  seed?: number;
  onHover?: (kind: DishKind | null) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const spin = useRef(0);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.y = damp(g.position.y, hovered ? 0.22 : 0, 6, dt);
    g.rotation.z = damp(g.rotation.z, hovered ? 0.08 : 0, 6, dt);
    g.rotation.y = damp(g.rotation.y, rotation + spin.current, 3.2, dt);
  });

  const label = courses.find((c) => c.id === kind)?.name ?? kind;

  return (
    <group position={position}>
      <group
        ref={ref}
        rotation={[0, rotation, 0]}
        name={label}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover?.(kind);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover?.(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          spin.current += Math.PI * 2;
        }}
      >
        <Nigiri kind={kind} seed={seed} />
      </group>
    </group>
  );
}
