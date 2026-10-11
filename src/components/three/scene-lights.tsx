"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { shared } from "./shared-uniforms";

const STORM = new THREE.Color("#8fa6d8");
const GOLD = new THREE.Color("#ffb347");
const SILVER = new THREE.Color("#b9c6ff");

/** Lights for the standard-material debris, plus distance fog that follows the grade. */
export function SceneLights() {
  const key = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const { scene } = get();
    scene.fog = new THREE.FogExp2(shared.uFogColor.value.clone(), 0.035);
    return () => {
      scene.fog = null;
    };
  }, [get]);

  useFrame(({ scene }) => {
    const s = director.shot;
    const strike = director.strike * s.storm;
    if (key.current) {
      key.current.color.copy(STORM).lerp(GOLD, s.gold).lerp(SILVER, s.ultra);
      key.current.intensity = (0.7 + strike * 7 + s.gold * 1.4) * s.exposure;
    }
    if (hemi.current) hemi.current.intensity = (0.55 + s.cosmic * 0.5 + s.gold * 0.3) * s.exposure;
    if (fill.current) {
      fill.current.color.copy(shared.uAuraColor.value);
      fill.current.intensity = (0.25 + s.aura * 0.5) * s.exposure;
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(shared.uFogColor.value);
      scene.fog.density = 0.035 * (1 - s.cosmic * 0.7);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#7d8bb0", "#14141a", 0.55]} />
      <directionalLight ref={key} position={[-6, 10, -6]} intensity={0.7} />
      <directionalLight ref={fill} position={[3, 2, 10]} intensity={0.25} />
    </>
  );
}
