"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { shared } from "./shared-uniforms";

const target = new THREE.Vector3();

/**
 * Moves the camera along the scripted path. Scroll drives the shot (distance,
 * height, orbit, FOV) and this adds what makes it feel handheld: a slow
 * breath, pointer parallax, and noise-based shake scaled by the script.
 * Portrait screens pull back so the character always fits in frame.
 */
export function CinematicCamera({ reducedMotion }: { reducedMotion: boolean }) {
  const pointerRef = useRef({ x: 0, y: 0, sx: 0, sy: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    const pointer = pointerRef.current;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reducedMotion]);

  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const size = state.size;
    const pointer = pointerRef.current;
    const s = director.shot;
    const t = shared.uTime.value;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3);
    pointer.sx += (pointer.x - pointer.sx) * k;
    pointer.sy += (pointer.y - pointer.sy) * k;

    const aspect = size.width / size.height;
    const portrait = THREE.MathUtils.clamp((1.1 - aspect) / 0.6, 0, 1);
    const distance = (s.camZ + (1 - director.introPush) * 2.4) * (1 + portrait * 0.5);

    const motion = reducedMotion ? 0 : 1;
    const shake = s.shake * motion;
    const sx = (Math.sin(t * 23.1) * 0.6 + Math.sin(t * 37.7 + 1.3) * 0.4) * shake * 0.06;
    const sy = (Math.sin(t * 29.3 + 0.7) * 0.6 + Math.sin(t * 41.9) * 0.4) * shake * 0.05;
    const breathe = Math.sin(t * 0.45) * 0.04 * motion;

    const orbit = s.orbit + pointer.sx * 0.05 * motion;
    camera.position.set(
      Math.sin(orbit) * distance + sx,
      s.camY + breathe + sy - pointer.sy * 0.12 * motion + portrait * 0.15,
      Math.cos(orbit) * distance,
    );
    target.set(0, s.lookY + portrait * 0.1, 0);
    camera.lookAt(target);
    // Slide sideways in screen space so the character can sit off-centre
    // when copy shares the frame (landscape only; portrait keeps it centred).
    camera.translateX(s.camX * (1 - portrait));
    camera.rotateZ(s.roll + Math.sin(t * 19.7) * shake * 0.006);

    const fov = s.fov + portrait * 6;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, -5);

  return null;
}
