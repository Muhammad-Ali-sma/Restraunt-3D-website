"use client";

import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/lib/random";
import { dotTexture } from "./textures";

/**
 * Drifting gold dust. All motion happens in the vertex shader, so the CPU
 * cost is a single uniform update per frame regardless of particle count.
 */
export function GoldDust({ count = 260, area = [7, 3.5, 4] as [number, number, number], size = 22 }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { positions, seeds } = useMemo(() => {
    const r = mulberry32(99);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (r() - 0.5) * area[0];
      positions[i * 3 + 1] = r() * area[1];
      positions[i * 3 + 2] = (r() - 0.5) * area[2];
      seeds[i] = r();
    }
    return { positions, seeds };
  }, [count, area]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uHeight: { value: area[1] },
      uMap: { value: dotTexture() },
      uColor: { value: new THREE.Color("#e8c37a") },
    }),
    [size, area],
  );

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={
          /* glsl */ `
          uniform float uTime;
          uniform float uSize;
          uniform float uHeight;
          attribute float aSeed;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            float t = uTime * (0.05 + aSeed * 0.08);
            p.y = mod(p.y + t, uHeight);
            p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.25;
            p.z += cos(uTime * 0.25 + aSeed * 30.0) * 0.2;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            float twinkle = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 50.0);
            vAlpha = twinkle * smoothstep(0.0, 0.4, p.y) * smoothstep(uHeight, uHeight * 0.6, p.y);
            gl_PointSize = uSize * (0.35 + aSeed * 0.65) / -mv.z;
          }
        `
        }
        fragmentShader={
          /* glsl */ `
          uniform sampler2D uMap;
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uColor * 1.6, a * 0.8);
          }
        `
        }
      />
    </points>
  );
}

/** Wisps of steam from the tea cup: a noise-driven shader on a camera-facing plane. */
export function Steam({ height = 1.4, width = 0.6 }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });
  return (
    <Billboard lockX lockZ position={[0, height / 2, 0]}>
      <mesh>
        <planeGeometry args={[width, height, 1, 1]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={
            /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `
          }
          fragmentShader={
            /* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
          }
          float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
          void main() {
            vec2 uv = vUv;
            float t = uTime * 0.35;
            uv.x += (fbm(vec2(uv.y * 2.0 - t, t * 0.5)) - 0.5) * 0.5 * uv.y;
            float n = fbm(vec2(uv.x * 3.0, uv.y * 2.2 - t * 1.6));
            float wisp = smoothstep(0.45, 0.85, n);
            float shape = smoothstep(0.5, 0.05, abs(uv.x - 0.5)) * smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.45, uv.y);
            float a = wisp * shape * 0.28;
            gl_FragColor = vec4(vec3(0.95, 0.93, 0.9), a);
          }
        `
          }
        />
      </mesh>
    </Billboard>
  );
}
