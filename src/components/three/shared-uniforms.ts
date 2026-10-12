"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { director } from "@/lib/director";
import { PALETTE } from "@/lib/scene-config";

/**
 * Uniform objects shared by every custom material. Materials reference these
 * exact objects, so updating them once per frame updates the whole scene.
 */
export const shared = {
  uTime: { value: 0 },
  uExposure: { value: 1 },
  uStrike: { value: 0 },
  uAuraColor: { value: new THREE.Color(PALETTE.ki) },
  uFogColor: { value: new THREE.Color(PALETTE.storm) },
};

const KI = new THREE.Color(PALETTE.ki);
const GOLD = new THREE.Color(PALETTE.gold);
const SILVER = new THREE.Color(PALETTE.silver);
const FOG_STORM = new THREE.Color("#0c111d");
const FOG_GOLD = new THREE.Color("#6b3d12");
const FOG_COSMIC = new THREE.Color("#060818");
const FOG_DARK = new THREE.Color("#030408");

/** Blend of the three energy colours for the current form. */
export function auraColor(target: THREE.Color) {
  const s = director.shot;
  return target
    .copy(KI)
    .lerp(GOLD, s.gold)
    .lerp(SILVER, s.ultra * (1 - s.gold * 0.5));
}

/** Writes the shared uniforms. Runs before every other frame callback. */
export function SharedUniforms() {
  useFrame((_, dt) => {
    const s = director.shot;
    shared.uTime.value += Math.min(dt, 0.1);
    shared.uExposure.value = s.exposure;
    shared.uStrike.value = director.strike * s.storm;
    auraColor(shared.uAuraColor.value);
    shared.uFogColor.value
      .copy(FOG_STORM)
      .lerp(FOG_DARK, s.darkness * 0.8)
      .lerp(FOG_GOLD, s.gold * (1 - s.ultra))
      .lerp(FOG_COSMIC, s.cosmic);
  }, -10);
  return null;
}
