"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { mulberry32 } from "@/lib/random";
import { OUTPUT, SHARED } from "./shaders";
import { shared } from "./shared-uniforms";

/**
 * One particle system with five behaviours blended on the GPU by the director:
 * wind-blown dust, ki gathering in towards the body, golden sparks rising after
 * the transformation, a slow orbit in the Ultra Instinct void, and streaks
 * rushing past the camera in the final surge. The CPU only updates uniforms.
 */
export function EnergyParticles({ count }: { count: number }) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const r = mulberry32(42);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = r();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    return g;
  }, [count]);

  const materialParams = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        ...shared,
        uGather: { value: 0 },
        uGold: { value: 0 },
        uUltra: { value: 0 },
        uSpeed: { value: 0 },
        uDust: { value: 0 },
        uAura: { value: 0 },
        uPixel: { value: 1 },
      },
      vertexShader: /* glsl */ `
          ${SHARED}
          uniform float uGather, uGold, uUltra, uSpeed, uDust, uAura, uPixel;
          attribute vec4 aSeed;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vec4 s = aSeed;
            float t = uTime;

            // wind-blown dust
            vec3 dust = vec3(
              fract(s.x + t * (0.012 + s.w * 0.03) * (0.4 + uDust * 1.6)) * 40.0 - 20.0,
              s.y * s.y * 7.0 + sin(t * 0.7 + s.w * 6.28) * 0.15,
              s.z * 30.0 - 20.0
            );
            // ki drawn in towards the body
            float gl = fract(s.x + t * (0.22 + s.y * 0.3));
            float gr = mix(6.0, 0.3, pow(gl, 0.75)) * (0.6 + s.z * 0.8);
            float ga = s.w * 6.2831 + t * (0.5 + s.y) + gl * 4.0;
            vec3 gather = vec3(cos(ga) * gr, 1.25 + (s.z - 0.5) * 2.8 * (1.0 - gl * 0.7), sin(ga) * gr);
            // golden sparks climbing
            float rl = fract(s.y + t * (0.16 + s.x * 0.3));
            float rr = 0.35 + s.z * s.z * 4.5;
            float ra = s.w * 6.2831 + t * 0.25;
            vec3 rise = vec3(cos(ra) * rr + sin(t * 1.7 + s.x * 10.0) * 0.12, rl * 6.5, sin(ra) * rr);
            // calm orbit
            float orr = 0.9 + s.x * 10.0;
            float oa = s.w * 6.2831 + t * (0.04 + 0.22 / orr);
            vec3 orbit = vec3(cos(oa) * orr, 1.35 + (s.y - 0.5) * 7.0 * (0.25 + s.z) + sin(t * 0.4 + s.z * 6.0) * 0.2, sin(oa) * orr);
            // streaks rushing past
            float sl = fract(s.x + t * (0.55 + s.y * 0.9));
            float sa = s.w * 6.2831;
            float sr = 0.8 + s.z * 4.0;
            vec3 streak = vec3(cos(sa) * sr, 1.4 + sin(sa) * sr, mix(-36.0, 14.0, sl));

            float wStreak = uSpeed;
            float rest = 1.0 - uSpeed;
            float wGather = uGather * rest;
            float wOrbit = uUltra * (1.0 - uGather) * rest;
            float wRise = uGold * (1.0 - uGather) * (1.0 - uUltra) * rest;
            float wDust = (1.0 - uGather) * (1.0 - uGold) * (1.0 - uUltra) * rest;
            float sum = wStreak + wGather + wOrbit + wRise + wDust + 1e-4;

            vec3 p = (dust * wDust + gather * wGather + rise * wRise + orbit * wOrbit + streak * wStreak) / sum;

            vec3 cDust = vec3(0.45, 0.5, 0.62) * (0.18 + uDust * 0.5 + uStrike * 1.2);
            vec3 cGather = uAuraColor * (0.7 + uAura * 0.9) * smoothstep(0.0, 0.25, gl);
            vec3 cRise = vec3(2.2, 1.45, 0.5) * sin(rl * 3.14159);
            vec3 cOrbit = vec3(1.1, 1.25, 1.9) * (0.5 + 0.5 * sin(t * 2.0 + s.x * 30.0));
            vec3 cStreak = mix(vec3(1.6, 1.8, 2.6), vec3(2.4, 1.9, 1.0), s.y) * smoothstep(0.0, 0.2, sl);
            vColor = (cDust * wDust + cGather * wGather + cRise * wRise + cOrbit * wOrbit + cStreak * wStreak) / sum;
            vColor *= uExposure;

            float pointSize = (0.7 * wDust + 0.8 * wGather + 1.1 * wRise + 0.75 * wOrbit + 1.5 * wStreak) / sum;
            pointSize *= 0.5 + s.z;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = pointSize * uPixel / max(-mv.z, 0.5);
            vAlpha = smoothstep(0.2, 1.4, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
      fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            a *= a;
            gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
            ${OUTPUT}
          }
        `,
    }),
    [],
  );
  const material = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const s = director.shot;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uGather.value = s.gather;
    u.uGold.value = s.gold;
    u.uUltra.value = s.ultra;
    u.uSpeed.value = s.speed;
    u.uDust.value = s.dust;
    u.uAura.value = s.aura;
    u.uPixel.value = size.height * dpr * 0.022;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={4}>
      <shaderMaterial ref={material} args={[materialParams]} />
    </points>
  );
}
