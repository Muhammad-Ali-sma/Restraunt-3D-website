"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { NOISE, noiseDefines, OUTPUT, SHARED } from "./shaders";
import { shared } from "./shared-uniforms";

/**
 * The sky dome: a storm-lit battlefield sky, a golden haze for the
 * transformation, and a star field with silver-blue nebulae for Ultra
 * Instinct, all blended in one shader by the director values.
 */
export function Sky({
  lowEnd = false,
  backdrops = {},
}: {
  lowEnd?: boolean;
  /** Optional painted panoramas (paths under /public) blended over the procedural skies. */
  backdrops?: { battlefield?: string; cosmic?: string };
}) {
  const materialParams = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      defines: noiseDefines(lowEnd),
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        ...shared,
        uStorm: { value: 1 },
        uDark: { value: 0 },
        uGold: { value: 0 },
        uCosmic: { value: 0 },
        uUltra: { value: 0 },
        uStrikeX: { value: 0 },
        uOrbit: { value: 0 },
        uBattle: { value: null },
        uHasBattle: { value: 0 },
        uSpace: { value: null },
        uHasSpace: { value: 0 },
      },
      vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position.z = gl_Position.w; // always at the far plane
          }
        `,
      fragmentShader: /* glsl */ `
          ${SHARED}
          ${NOISE}
          uniform float uStorm, uDark, uGold, uCosmic, uUltra, uStrikeX, uOrbit;
          uniform sampler2D uBattle;
          uniform sampler2D uSpace;
          uniform float uHasBattle, uHasSpace;
          varying vec3 vDir;

          // Wraps a panorama around the dome: centre of the image straight ahead,
          // horizon at 42% from the bottom of the image.
          vec2 panorama(vec3 d) {
            return vec2(atan(d.x, -d.z) / 6.28318 + 0.5, clamp(d.y * 1.35 + 0.42, 0.0, 1.0));
          }

          vec3 stars(vec3 d) {
            vec3 col = vec3(0.0);
            for (int i = 0; i < 3; i++) {
              float scale = 140.0 + float(i) * 110.0;
              vec2 uv = vec2(atan(d.z, d.x) * 1.6, d.y * 2.0) * scale / 6.2831;
              vec2 cell = floor(uv);
              vec2 f = fract(uv) - 0.5;
              float h = hash21(cell + float(i) * 31.7);
              vec2 o = hash22(cell) - 0.5;
              float star = smoothstep(0.08, 0.0, length(f - o * 0.6)) * step(0.86, h);
              float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
              col += star * tw * mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.95, 0.85), h) * (2.6 - float(i) * 0.6);
            }
            return col;
          }

          void main() {
            vec3 d = normalize(vDir);
            float up = d.y;
            float t = uTime;

            // ── storm sky ──
            vec2 cuv = d.xz / (max(up, 0.0) + 0.28) * 1.4;
            float clouds = fbm(cuv * 0.9 + vec2(t * 0.012, t * 0.004));
            float detail = fbm(cuv * 2.6 - vec2(t * 0.02, 0.0));
            float c = smoothstep(0.35, 0.85, clouds * 0.75 + detail * 0.35);
            vec3 stormTop = vec3(0.010, 0.013, 0.022);
            vec3 stormHorizon = vec3(0.050, 0.062, 0.090);
            vec3 storm = mix(stormHorizon, stormTop, smoothstep(-0.05, 0.5, up));
            storm += c * vec3(0.040, 0.050, 0.072) * smoothstep(-0.1, 0.4, up) * (0.6 + detail * 0.6);
            // lightning lights the clouds from inside, around the strike
            float near = exp(-pow((d.x - uStrikeX * 0.7) * 2.4, 2.0)) * smoothstep(-0.05, 0.3, up);
            storm += uStrike * (0.1 + c * 0.85) * near * vec3(0.55, 0.65, 1.0);
            storm += uStrike * 0.025 * vec3(0.6, 0.7, 1.0);
            // a low band of battlefield glow on the horizon
            storm += vec3(0.10, 0.08, 0.07) * exp(-abs(up - 0.02) * 18.0) * 0.6;
            if (uHasBattle > 0.5) {
              vec3 painted = texture2D(uBattle, panorama(d)).rgb;
              storm = mix(storm, painted * (0.55 + uStrike * 0.8 * near), 0.85);
            }
            storm *= 1.0 - uDark * 0.75;

            // ── golden haze ──
            float behind = smoothstep(0.2, -0.9, d.z);
            vec3 gold = mix(vec3(0.10, 0.045, 0.012), vec3(0.55, 0.30, 0.06), exp(-abs(up - 0.05) * 5.0) * (0.4 + behind * 0.6));
            gold += c * vec3(0.18, 0.09, 0.02) * smoothstep(0.0, 0.5, up);

            // ── cosmic void ──
            vec3 cd = d;
            float a = uOrbit * 0.5;
            cd.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * cd.xz;
            float neb = fbm3(cd * 2.2 + vec3(0.0, t * 0.01, 0.0));
            float neb2 = fbm3(cd * 4.5 - vec3(t * 0.008));
            vec3 cosmic = vec3(0.008, 0.010, 0.030);
            cosmic += smoothstep(0.45, 0.9, neb) * mix(vec3(0.12, 0.14, 0.42), vec3(0.30, 0.16, 0.48), neb2) * 0.55;
            cosmic += smoothstep(0.62, 0.95, neb2) * vec3(0.55, 0.65, 1.0) * 0.12;
            float band = exp(-pow(cd.y + cd.x * 0.35, 2.0) * 14.0);
            cosmic += band * vec3(0.10, 0.12, 0.22) * (0.5 + neb);
            cosmic += stars(cd) * (0.5 + band);
            if (uHasSpace > 0.5) cosmic = mix(cosmic, texture2D(uSpace, panorama(cd)).rgb + stars(cd) * 0.3, 0.85);

            vec3 col = storm * uStorm + vec3(0.012, 0.014, 0.022) * (1.0 - uStorm);
            col = mix(col, gold, uGold * (1.0 - uCosmic));
            col = mix(col, cosmic, uCosmic);
            // the horizon dissolves into the same haze the ground fades into
            float haze = exp(-abs(up + 0.01) * 16.0) * (1.0 - uCosmic) * (1.0 - uGold * 0.75);
            col = mix(col, uFogColor * 1.15, haze * 0.85);
            col *= uExposure;
            gl_FragColor = vec4(col, 1.0);
            ${OUTPUT}
          }
        `,
    }),
    [lowEnd],
  );
  const material = useRef<THREE.ShaderMaterial>(null);

  // Painted backdrops load in the background; the frame loop picks them up.
  const painted = useRef<{ battle?: THREE.Texture; space?: THREE.Texture }>({});
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const store = painted.current;
    let cancelled = false;
    const load = (src: string | undefined, key: "battle" | "space") => {
      if (!src) return;
      loader.load(src, (tex) => {
        if (cancelled) return tex.dispose();
        tex.colorSpace = THREE.SRGBColorSpace;
        store[key] = tex;
      });
    };
    load(backdrops.battlefield, "battle");
    load(backdrops.cosmic, "space");
    return () => {
      cancelled = true;
      store.battle?.dispose();
      store.space?.dispose();
      store.battle = store.space = undefined;
    };
  }, [backdrops.battlefield, backdrops.cosmic]);

  useFrame(() => {
    const s = director.shot;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uStorm.value = s.storm;
    u.uDark.value = s.darkness;
    u.uGold.value = s.gold;
    u.uCosmic.value = s.cosmic;
    u.uUltra.value = s.ultra;
    u.uStrikeX.value = director.strikeX;
    u.uOrbit.value = s.orbit;
    const { battle, space } = painted.current;
    u.uBattle.value = battle ?? null;
    u.uHasBattle.value = battle ? 1 : 0;
    u.uSpace.value = space ?? null;
    u.uHasSpace.value = space ? 1 : 0;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[90, 48, 24]} />
      <shaderMaterial ref={material} args={[materialParams]} />
    </mesh>
  );
}
