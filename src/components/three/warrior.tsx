"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ASSET_PATHS, type AssetManifest } from "@/lib/assets";
import { director } from "@/lib/director";
import { FIGURE_GROUND_Y, FIGURE_SIZE } from "@/lib/goku-figure";
import { NOISE, OUTPUT, SHARED } from "./shaders";
import { shared } from "./shared-uniforms";
import { buildIllustratedFigure, buildImageFigure, type FigureTextures } from "./warrior-textures";

/** World units per figure unit: skull-to-sole (1020 units) stands 2.25 tall. */
const K = 2.25 / 1020;
export const FIGURE_W = FIGURE_SIZE.width * K;
export const FIGURE_H = FIGURE_SIZE.height * K;
/** Height of the figure plane's centre above the ground. */
const CENTER_Y = (FIGURE_GROUND_Y - FIGURE_SIZE.height / 2) * K;
/** The aura plane sits higher than the figure so flames have room above the head. */
const AURA_LIFT = FIGURE_H * 0.16;

const FIGURE_FRAG = /* glsl */ `
  ${SHARED}
  ${NOISE}
  uniform sampler2D uFig;
  uniform sampler2D uSsjTex;
  uniform sampler2D uUltraTex;
  uniform sampler2D uGlow;
  uniform sampler2D uEmissive;
  uniform float uSsj, uUltra, uAura, uSil, uHasEmissive;
  varying vec2 vUv;

  void main() {
    vec4 g = texture2D(uGlow, vUv);
    // The golden form regrows from the scalp upwards, behind a bright front.
    float hy = clamp((vUv.y - 0.6) / 0.3, 0.0, 1.0);
    float wobble = snoise(vec2(vUv.x * 16.0, uTime * 0.6)) * 0.06;
    float front = uSsj * 1.25;
    float grown = smoothstep(hy + wobble - 0.04, hy + wobble + 0.04, front);
    float frontLine = exp(-pow((hy + wobble - front) * 16.0, 2.0)) * step(0.01, uSsj) * step(uSsj, 0.99);

    vec4 c = mix(texture2D(uFig, vUv), texture2D(uSsjTex, vUv), grown);
    c = mix(c, texture2D(uUltraTex, vUv), uUltra);
    float alpha = c.a;
    if (alpha < 0.01) discard;

    // Grade the drawing into the shot: dim and cool in the storm, lit by the aura.
    float light = 0.22 + uSil * 0.46 + uAura * 0.22;
    vec3 col = c.rgb * light;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma) * vec3(0.78, 0.88, 1.15), col, clamp(0.4 + uSil * 0.35 + uAura * 0.45, 0.0, 1.0));
    col += uAuraColor * uAura * 0.05;

    // Rim light from the aura (and the lightning) along the silhouette.
    float tight = mix(g.r, g.g, uSsj);
    float rim = clamp((alpha - tight) * 2.6, 0.0, 1.0);
    col += (uAuraColor * (0.25 + uAura * 3.0) * uSil + vec3(0.55, 0.65, 1.0) * uStrike * 1.4) * rim * 0.8;

    // Golden and silver hair glow from within.
    vec2 e = uHasEmissive > 0.5 ? texture2D(uEmissive, vUv).rg : vec2(0.0);
    float goldHair = e.r * grown * (1.0 - uUltra);
    col = mix(col, col * vec3(1.0, 0.74, 0.3), goldHair * 0.5);
    col += vec3(1.0, 0.6, 0.08) * goldHair * (0.06 + uAura * 0.16);
    col += vec3(0.75, 0.82, 1.0) * e.g * uUltra * (0.1 + uAura * 0.35);
    col += vec3(1.0, 0.9, 0.6) * frontLine * (uHasEmissive > 0.5 ? e.r : alpha) * 4.0;

    col *= uExposure;
    gl_FragColor = vec4(col, alpha);
    ${OUTPUT}
  }
`;

const AURA_FRAG = /* glsl */ `
  ${SHARED}
  ${NOISE}
  uniform sampler2D uGlow;
  uniform float uSsj, uUltra, uAura, uGather;
  varying vec2 vFig;

  float mask(vec2 uv) {
    vec4 g = texture2D(uGlow, uv);
    return mix(g.b, g.a, uSsj);
  }

  void main() {
    vec2 uv = vFig;
    float calm = uUltra * (1.0 - uSsj);
    float t = uTime * mix(1.0, 0.42, calm);
    float n1 = fbm(vec2(uv.x * 6.0, uv.y * 3.2 - t * 1.5));
    float n2 = snoise(vec2(uv.x * 15.0, uv.y * 6.0 - t * 3.1)) * 0.5 + 0.5;
    float lift = (0.03 + n2 * 0.085) * (0.5 + uAura) * (1.0 - calm * 0.45);
    vec2 d = vec2((n1 - 0.5) * mix(0.07, 0.03, calm), -lift);

    float m = mask(uv + d);
    m = max(m, mask(uv + d * 2.1) * 0.85);
    m = max(m, mask(uv + d * 3.4) * 0.62);
    m = max(m, mask(uv + d * 4.8) * 0.4);

    float outer = smoothstep(0.1, 0.5, m * (0.5 + n1 * 0.95));
    float inner = smoothstep(0.42, 0.85, m * (0.78 + n2 * 0.45));
    float wisps = smoothstep(0.55, 0.9, n2) * smoothstep(0.05, 0.3, m);

    vec3 edgeCol = mix(uAuraColor, vec3(0.45, 0.4, 1.0), calm * 0.6);
    float golden = uSsj * (1.0 - calm);
    vec3 col = edgeCol * outer * mix(1.4, 1.15, golden);
    col += mix(uAuraColor, mix(vec3(1.0), vec3(1.0, 0.78, 0.35), golden), mix(0.65, 0.3, golden)) * inner * mix(2.1, 1.05, golden);
    col += mix(uAuraColor, vec3(1.0), 0.5) * wisps * calm * 1.6;

    // a soft bloom of light around the body that lights the air
    float halo = exp(-length((uv - vec2(0.5, 0.56)) * vec2(1.8, 1.0)) * 3.2);
    col += uAuraColor * halo * (0.25 + uGather * 0.25);

    col *= uAura * uExposure * mix(1.0, 0.62, golden);
    gl_FragColor = vec4(col, 1.0);
    ${OUTPUT}
  }
`;

type Props = {
  assets: AssetManifest;
  textureSize: number;
  /** False when a 3D model stands in for the figure: only the aura (and its light) render. */
  showFigure?: boolean;
  /** Called once the textures are on the GPU-bound materials. */
  onReady?: () => void;
};

/**
 * The character: a camera-facing figure (the drawn Goku, or supplied artwork)
 * graded by the scene and rim-lit by its own aura, with the flame aura behind.
 */
export function Warrior({ assets, textureSize, showFigure = true, onReady }: Props) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const [textures, setTextures] = useState<FigureTextures | null>(null);
  const useImages = assets.characterBase && showFigure;

  useEffect(() => {
    let cancelled = false;
    let built: FigureTextures | null = null;
    const done = (t: FigureTextures) => {
      if (cancelled) return t.dispose();
      built = t;
      setTextures(t);
    };
    if (useImages) {
      buildImageFigure(textureSize, {
        base: ASSET_PATHS.characterBase,
        superSaiyan: assets.characterSuperSaiyan ? ASSET_PATHS.characterSuperSaiyan : undefined,
        ultra: assets.characterUltraInstinct ? ASSET_PATHS.characterUltraInstinct : undefined,
      })
        .then(done)
        .catch(() => !cancelled && done(buildIllustratedFigure(textureSize)));
    } else {
      done(buildIllustratedFigure(textureSize));
    }
    return () => {
      cancelled = true;
      built?.dispose();
    };
  }, [useImages, assets.characterSuperSaiyan, assets.characterUltraInstinct, textureSize]);

  useEffect(() => {
    if (textures) onReady?.();
  }, [textures, onReady]);

  useFrame(({ camera }) => {
    const s = director.shot;
    const g = group.current;
    if (!g) return;
    // Cylindrical billboard: always faces the camera, stays upright.
    g.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    // Hover a little once powered up, and float freely in the void.
    const t = shared.uTime.value;
    g.position.y = s.gold * 0.12 + s.cosmic * 0.3 + Math.sin(t * 1.3) * 0.03 * (s.gold + s.cosmic);
    if (light.current) {
      light.current.color.copy(shared.uAuraColor.value);
      light.current.intensity = s.aura * 26 * s.exposure + 0.4;
    }
  });

  return (
    <group ref={group}>
      {textures ? <FigureMeshes textures={textures} showFigure={showFigure} /> : null}
      <pointLight ref={light} position={[0, 1.4, 0.6]} distance={18} decay={2} intensity={0} />
    </group>
  );
}

function FigureMeshes({ textures, showFigure }: { textures: FigureTextures; showFigure: boolean }) {
  const figure = useRef<THREE.ShaderMaterial>(null);
  const aura = useRef<THREE.ShaderMaterial>(null);

  const figureParams = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      transparent: true,
      depthWrite: false,
      uniforms: {
        ...shared,
        uFig: { value: textures.base },
        uSsjTex: { value: textures.superSaiyan ?? textures.base },
        uUltraTex: { value: textures.ultra ?? textures.base },
        uGlow: { value: textures.glow },
        uEmissive: { value: textures.emissive ?? null },
        uHasEmissive: { value: textures.emissive ? 1 : 0 },
        uSsj: { value: 0 },
        uUltra: { value: 0 },
        uAura: { value: 0 },
        uSil: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: FIGURE_FRAG,
    }),
    [textures],
  );

  const auraParams = useMemo<THREE.ShaderMaterialParameters>(
    () => ({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        ...shared,
        uGlow: { value: textures.glow },
        uSsj: { value: 0 },
        uUltra: { value: 0 },
        uAura: { value: 0 },
        uGather: { value: 0 },
        uSize: { value: new THREE.Vector2(FIGURE_W, FIGURE_H) },
        uOffset: { value: new THREE.Vector2(0, AURA_LIFT) },
      },
      vertexShader: /* glsl */ `
        uniform vec2 uSize;
        uniform vec2 uOffset;
        varying vec2 vFig;
        void main() {
          // the aura plane is larger than the figure and raised; map back to figure UVs
          vFig = (position.xy + uOffset) / uSize + 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: AURA_FRAG,
    }),
    [textures],
  );

  useFrame(() => {
    const s = director.shot;
    const f = figure.current?.uniforms;
    if (f) {
      f.uSsj.value = s.ssj;
      f.uUltra.value = s.ultra;
      f.uAura.value = s.aura;
      f.uSil.value = s.silhouette;
    }
    const a = aura.current?.uniforms;
    if (a) {
      a.uSsj.value = s.ssj;
      a.uUltra.value = s.ultra;
      a.uAura.value = s.aura;
      a.uGather.value = s.gather;
    }
  });

  return (
    <>
      <mesh position={[0, CENTER_Y + AURA_LIFT, -0.04]} renderOrder={2}>
        <planeGeometry args={[FIGURE_W * 1.7, FIGURE_H * 1.45]} />
        <shaderMaterial ref={aura} args={[auraParams]} />
      </mesh>
      {showFigure ? (
        <mesh position={[0, CENTER_Y, 0]} renderOrder={3}>
          <planeGeometry args={[FIGURE_W, FIGURE_H]} />
          <shaderMaterial ref={figure} args={[figureParams]} />
        </mesh>
      ) : null}
    </>
  );
}
