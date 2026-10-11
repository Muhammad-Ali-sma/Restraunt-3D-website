"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { NOISE, noiseDefines, OUTPUT, SHARED } from "./shaders";
import { shared } from "./shared-uniforms";

const VORONOI = /* glsl */ `
// Cellular noise returning (distance to the nearest border, cell id hash).
vec2 voronoiBorder(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  vec2 mg, mr;
  float md = 8.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(n + g);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++)
  for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 o = hash22(n + g);
    vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return vec2(md, hash21(n + mg));
}
`;

/**
 * Scorched battlefield ground. Cracks glow with the aura colour, the crater
 * fractures into tilted slabs during the transformation, and the shockwave
 * ring rolls across it. It fades away entirely in the cosmic void.
 */
export function Ground({ segments, lowEnd = false }: { segments: number; lowEnd?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const materialParams = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      defines: noiseDefines(lowEnd),
      transparent: true,
      uniforms: {
        ...shared,
        uGround: { value: 1 },
        uCrack: { value: 0 },
        uFracture: { value: 0 },
        uBurst: { value: 0 },
        uAura: { value: 0 },
        uLift: { value: 0 },
      },
      vertexShader: /* glsl */ `
          ${NOISE}
          uniform float uFracture;
          uniform float uLift;
          varying vec3 vWorld;
          varying float vSlab;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            float r = length(w.xz);
            float R = 1.4 + uFracture * 6.0;
            // the character keeps a small plateau of rock under its feet
            float crater = -0.5 * uFracture * smoothstep(0.45, 1.1, r) * (1.0 - smoothstep(R * 0.7, R, r));
            crater += 0.22 * uFracture * exp(-pow((r - R) * 1.1, 2.0));
            // broken slabs: each cell of a coarse grid tilts by its own amount
            vec2 cell = floor(w.xz * 0.75 + snoise(w.xz * 0.2) * 0.6);
            float id = hash21(cell);
            float zone = uFracture * smoothstep(0.5, 1.2, r) * (1.0 - smoothstep(R * 0.6, R * 1.9, r));
            float slab = (id - 0.35) * 0.55 * zone;
            slab += (hash21(cell + 7.0) - 0.5) * (w.x - (cell.x + 0.5) / 0.75) * 0.25 * zone;
            w.y += crater + slab;
            vSlab = zone * id;
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
      fragmentShader: /* glsl */ `
          ${SHARED}
          ${NOISE}
          ${VORONOI}
          uniform float uGround, uCrack, uFracture, uBurst, uAura;
          varying vec3 vWorld;
          varying float vSlab;
          void main() {
            vec2 p = vWorld.xz;
            float r = length(p);
            float n = fbm(p * 0.45);
            float n2 = fbm(p * 2.8 + 11.0);
            vec3 rock = mix(vec3(0.030, 0.032, 0.040), vec3(0.085, 0.080, 0.078), n) * (0.65 + n2 * 0.6);

            vec2 warp = vec2(fbm(p * 0.3 + 4.0), fbm(p * 0.3 - 7.0)) - 0.5;
            vec2 v = voronoiBorder(p * 0.85 + warp * 1.6);
            float edge = v.x;
            rock *= mix(0.35, 1.0, smoothstep(0.0, 0.06, edge));

            // light from the aura, the lightning and the dim storm
            float auraLight = uAura * 2.2 / (1.0 + r * r * 0.18);
            vec3 col = rock * (0.32 + auraLight * uAuraColor * 2.6 + uStrike * 1.1 * vec3(0.7, 0.8, 1.0));

            // glowing fissures spreading out from the character
            float reach = 1.5 + uCrack * 6.0 + uFracture * 7.0;
            float mask = (1.0 - smoothstep(reach * 0.55, reach, r)) * uCrack;
            mask *= smoothstep(0.3, 0.55, fbm(p * 0.32 + 3.0) + 0.25 * (1.0 - r / max(reach, 0.001)));
            float line = smoothstep(0.07 + uFracture * 0.04, 0.0, edge) * mask * pow(1.0 - r / max(reach, 0.001), 1.4);
            float pulse = 0.75 + 0.25 * sin(uTime * 3.0 - r * 1.5);
            col += uAuraColor * line * (2.4 + uFracture * 3.0) * pulse;
            col += uAuraColor * vSlab * 0.15 * uAura;

            // shockwave rolling outward
            float ringR = uBurst * 30.0;
            float ring = exp(-pow((r - ringR) * 1.2, 2.0)) * (1.0 - uBurst) * step(0.001, uBurst);
            col += ring * mix(vec3(1.0, 0.75, 0.35), uAuraColor, 0.3) * 4.0;

            float dist = length(vWorld - cameraPosition);
            col = mix(col, uFogColor, 1.0 - exp(-dist * 0.065));
            col *= uExposure;
            float alpha = uGround * (1.0 - smoothstep(38.0, 62.0, r));
            gl_FragColor = vec4(col, alpha);
            ${OUTPUT}
          }
        `,
    }),
    [lowEnd],
  );
  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame(() => {
    const s = director.shot;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uGround.value = s.ground;
    u.uCrack.value = s.crack;
    u.uFracture.value = s.fracture;
    u.uBurst.value = s.burst;
    u.uAura.value = s.aura;
    if (mesh.current) mesh.current.visible = s.ground > 0.002;
  });

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} frustumCulled={false}>
      <planeGeometry args={[130, 130, segments, segments]} />
      <shaderMaterial ref={material} args={[materialParams]} />
    </mesh>
  );
}
