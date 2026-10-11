"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { NOISE, OUTPUT, SHARED } from "./shaders";
import { shared } from "./shared-uniforms";

const WHITE = new THREE.Color(1, 1, 1);

function shellParams(side: THREE.Side): THREE.ShaderMaterialParameters {
  return {
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
    uniforms: {
      ...shared,
      uStrength: { value: 0 },
      uInterior: { value: 0 },
      uTint: { value: new THREE.Color(1, 0.8, 0.45) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - w.xyz);
        vPos = position;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${SHARED}
      ${NOISE}
      uniform float uStrength, uInterior;
      uniform vec3 uTint;
      varying vec3 vNormalW;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vView))), 2.5);
        float n = fbm3(vPos * 2.5 + uTime * 0.6);
        vec3 col = uTint * (fres * (1.2 + n * 1.6) + uInterior * (0.6 + n * 0.4));
        gl_FragColor = vec4(col * uStrength * uExposure, 1.0);
        ${OUTPUT}
      }
    `,
  };
}

/**
 * The transformation's air-burst (a dome of light rolling outward) and the
 * finale's energy wave, which grows until the camera is inside it.
 */
export function Shockwave() {
  const burst = useRef<THREE.Mesh>(null);
  const wave = useRef<THREE.Group>(null);
  const burstMat = useRef<THREE.ShaderMaterial>(null);
  const outerMat = useRef<THREE.ShaderMaterial>(null);
  const innerMat = useRef<THREE.ShaderMaterial>(null);
  const params = useMemo(
    () => ({
      burst: shellParams(THREE.FrontSide),
      outer: shellParams(THREE.FrontSide),
      inner: shellParams(THREE.BackSide),
    }),
    [],
  );

  useFrame(() => {
    const s = director.shot;
    const b = burst.current;
    if (b && burstMat.current) {
      b.visible = s.burst > 0.001 && s.burst < 0.999;
      const r = 0.6 + s.burst * 24;
      b.scale.set(r, r * 0.38, r);
      burstMat.current.uniforms.uStrength.value = Math.pow(1 - s.burst, 1.6) * 1.4;
    }
    const w = wave.current;
    if (w && outerMat.current && innerMat.current) {
      w.visible = s.wave > 0.001;
      w.scale.setScalar(0.2 + s.wave * s.wave * 16);
      const outer = outerMat.current.uniforms;
      const inner = innerMat.current.uniforms;
      outer.uTint.value.copy(shared.uAuraColor.value).lerp(WHITE, 0.6);
      outer.uStrength.value = 1.5 + s.wave * 2;
      inner.uTint.value.copy(outer.uTint.value);
      inner.uInterior.value = s.wave * 2;
      inner.uStrength.value = s.wave * 2.5;
    }
  });

  return (
    <>
      <mesh ref={burst} renderOrder={6} visible={false}>
        <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <shaderMaterial ref={burstMat} args={[params.burst]} />
      </mesh>
      <group ref={wave} position={[0, 1.35, 0]} visible={false}>
        <mesh renderOrder={6}>
          <sphereGeometry args={[1, 48, 32]} />
          <shaderMaterial ref={innerMat} args={[params.inner]} />
        </mesh>
        <mesh renderOrder={7}>
          <sphereGeometry args={[1, 48, 32]} />
          <shaderMaterial ref={outerMat} args={[params.outer]} />
        </mesh>
      </group>
    </>
  );
}
