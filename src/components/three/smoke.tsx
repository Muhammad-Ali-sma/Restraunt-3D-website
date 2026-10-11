"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { NOISE, noiseDefines, OUTPUT, SHARED } from "./shaders";
import { shared } from "./shared-uniforms";

/**
 * Foreground smoke: a few drifting veils locked to the camera at different
 * depths, so smoke always passes between the lens and the character. It picks
 * up the aura's colour and flares with lightning.
 */
export function Smoke({ layers, lowEnd = false }: { layers: number; lowEnd?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const materialParams = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      defines: noiseDefines(lowEnd),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: { ...shared, uSmoke: { value: 0 }, uAura: { value: 0 }, uGold: { value: 0 }, uCosmic: { value: 0 } },
      vertexShader: /* glsl */ `
          attribute float aLayer;
          varying vec2 vUv;
          varying float vLayer;
          void main() {
            vUv = uv;
            vLayer = aLayer;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
      fragmentShader: /* glsl */ `
          ${SHARED}
          ${NOISE}
          uniform float uSmoke, uAura, uGold, uCosmic;
          varying vec2 vUv;
          varying float vLayer;
          void main() {
            float t = uTime * (0.025 + vLayer * 0.012);
            vec2 p = vUv * vec2(2.4, 1.3) + vec2(t * (vLayer + 1.0), vLayer * 7.3);
            float n = fbm(p + fbm(p * 1.7 - t) * 0.6);
            float d = smoothstep(0.5, 0.85, n);
            // thicker low in the frame, thinning out towards the sky
            d *= mix(1.0, 0.25, smoothstep(0.15, 0.85, vUv.y));
            d *= smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * smoothstep(0.0, 0.1, vUv.y);
            vec3 base = mix(vec3(0.06, 0.066, 0.085), vec3(0.15, 0.085, 0.035), uGold);
            base = mix(base, vec3(0.10, 0.11, 0.22), uCosmic);
            vec3 col = base + uAuraColor * uAura * 0.12 + vec3(0.5, 0.58, 0.8) * uStrike * 0.6;
            gl_FragColor = vec4(col * uExposure, d * uSmoke * (0.55 - vLayer * 0.06));
            ${OUTPUT}
          }
        `,
    }),
    [lowEnd],
  );
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < layers; i++) {
      const dist = 2.2 + i * 1.6;
      const g = new THREE.PlaneGeometry(dist * 1.9, dist * 0.9).translate(0, -dist * 0.12, -dist);
      g.setAttribute("aLayer", new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(i), 1));
      parts.push(g);
    }
    // Far layers first, so the nearest veil blends last.
    parts.reverse();
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    return merged;
  }, [layers]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera }) => {
    const s = director.shot;
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    g.visible = s.smoke > 0.01;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uSmoke.value = s.smoke;
    u.uAura.value = s.aura;
    u.uGold.value = s.gold;
    u.uCosmic.value = s.cosmic;
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} frustumCulled={false} renderOrder={8}>
        <shaderMaterial ref={material} args={[materialParams]} />
      </mesh>
    </group>
  );
}

/** Minimal non-indexed merge (avoids pulling in three/examples for one call). */
function mergeGeometries(parts: THREE.BufferGeometry[]) {
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "uv", "aLayer"] as const) {
    const itemSize = flat[0].attributes[name].itemSize;
    const total = flat.reduce((n, p) => n + p.attributes[name].array.length, 0);
    const data = new Float32Array(total);
    let offset = 0;
    for (const p of flat) {
      data.set(p.attributes[name].array as Float32Array, offset);
      offset += p.attributes[name].array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(data, itemSize));
  }
  flat.forEach((p, i) => p !== parts[i] && p.dispose());
  return out;
}
