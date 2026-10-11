"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { mulberry32 } from "@/lib/random";
import { OUTPUT, SHARED } from "./shaders";
import { shared } from "./shared-uniforms";

const TRAILS = 7;

/**
 * Ultra Instinct's light trails: comets sweeping on tilted orbits around the
 * character. Each tube's UV runs along its length, so the comet head and tail
 * are pure shader work.
 */
export function LightTrails() {
  const group = useRef<THREE.Group>(null);

  const geometries = useMemo(() => {
    const r = mulberry32(8);
    return Array.from({ length: TRAILS }, (_, i) => {
      const rx = 1.6 + r() * 3.4;
      const rz = 1.2 + r() * 2.6;
      const tilt = (r() - 0.5) * 1.1;
      const y = 0.6 + r() * 1.8;
      const pts = Array.from({ length: 64 }, (_, k) => {
        const a = (k / 64) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(a) * rx,
          y + Math.sin(a) * rz * Math.sin(tilt),
          Math.sin(a) * rz * Math.cos(tilt),
        );
      });
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const g = new THREE.TubeGeometry(curve, 240, 0.008 + (i % 3) * 0.006, 6, true);
      const offsets = new Float32Array(g.attributes.position.count).fill(r());
      const speeds = new Float32Array(g.attributes.position.count).fill((0.08 + r() * 0.14) * (i % 2 ? 1 : -1));
      g.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 1));
      g.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
      return g;
    });
  }, []);

  const materialParams = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...shared, uTrails: { value: 0 } },
      vertexShader: /* glsl */ `
          attribute float aOffset;
          attribute float aSpeed;
          varying float vAlong;
          varying float vOffset;
          varying float vSpeed;
          void main() {
            vAlong = uv.x;
            vOffset = aOffset;
            vSpeed = aSpeed;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
      fragmentShader: /* glsl */ `
          ${SHARED}
          uniform float uTrails;
          varying float vAlong;
          varying float vOffset;
          varying float vSpeed;
          void main() {
            float head = fract(vOffset + uTime * vSpeed);
            float behind = vSpeed > 0.0 ? fract(head - vAlong) : fract(vAlong - head);
            float comet = pow(1.0 - behind, 7.0);
            vec3 col = mix(vec3(0.55, 0.62, 1.4), vec3(2.6, 2.7, 3.2), pow(1.0 - behind, 30.0));
            gl_FragColor = vec4(col * comet * uTrails * uExposure, 1.0);
            ${OUTPUT}
          }
        `,
    }),
    [],
  );
  const material = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  useFrame(() => {
    const s = director.shot;
    const g = group.current;
    if (!g) return;
    g.visible = s.trails > 0.005;
    g.position.y = s.cosmic * 0.3;
    if (material.current) material.current.uniforms.uTrails.value = s.trails;
  });

  return (
    <group ref={group} visible={false}>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} frustumCulled={false} renderOrder={5}>
          <shaderMaterial ref={i === 0 ? material : undefined} args={[materialParams]} />
        </mesh>
      ))}
    </group>
  );
}
