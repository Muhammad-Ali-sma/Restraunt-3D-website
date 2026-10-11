"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { NOISE, OUTPUT, SHARED } from "./shaders";
import { shared } from "./shared-uniforms";

/**
 * The final surge's tunnel of light: an open cylinder around the camera path
 * whose inner wall is covered in streaks racing towards the viewer.
 */
export function LightTunnel() {
  const mesh = useRef<THREE.Mesh>(null);
  const materialParams = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { ...shared, uTunnel: { value: 0 }, uSpeed: { value: 0 }, uTravel: { value: 0 } },
      vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
      fragmentShader: /* glsl */ `
          ${SHARED}
          ${NOISE}
          uniform float uTunnel, uSpeed, uTravel;
          varying vec2 vUv;
          void main() {
            float lanes = 110.0;
            float lane = floor(vUv.x * lanes);
            float h = hash11(lane * 1.37);
            float across = abs(fract(vUv.x * lanes) - 0.5);
            float line = smoothstep(0.42, 0.0, across);
            // uv.y = 1 is the camera end: streaks travel towards it, head first
            float s = fract(vUv.y * (3.0 + h * 5.0) - uTravel * (0.6 + h * 1.4) + h * 10.0);
            float streak = smoothstep(1.0, 0.97, s) * pow(s, 3.0);
            float on = step(0.35, h);
            vec3 tint = h > 0.8 ? vec3(2.4, 1.7, 0.6) : (h > 0.55 ? vec3(1.4, 1.8, 3.0) : vec3(2.2));
            vec3 col = tint * line * streak * on;
            col += uAuraColor * 0.08 * (0.6 + 0.4 * fbm(vec2(vUv.x * 8.0, vUv.y * 4.0 + uTravel)));
            float ends = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
            gl_FragColor = vec4(col * ends * uTunnel * (0.6 + uSpeed) * uExposure, 1.0);
            ${OUTPUT}
          }
        `,
    }),
    [],
  );
  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame((_, dt) => {
    const s = director.shot;
    const m = mesh.current;
    if (!m) return;
    m.visible = s.tunnel > 0.005;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTunnel.value = s.tunnel;
    u.uSpeed.value = s.speed;
    u.uTravel.value += Math.min(dt, 0.1) * (0.15 + s.speed * 2.2);
  });

  return (
    <mesh
      ref={mesh}
      rotation-x={Math.PI / 2}
      position={[0, 1.4, -30]}
      frustumCulled={false}
      visible={false}
      renderOrder={1}
    >
      <cylinderGeometry args={[4.2, 4.2, 100, 96, 1, true]} />
      <shaderMaterial ref={material} args={[materialParams]} />
    </mesh>
  );
}
