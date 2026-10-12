"use client";

import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode, type BloomEffect, type ChromaticAberrationEffect } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";

/**
 * Bloom for every HDR emitter (aura, hair, sparks, lightning), chromatic
 * aberration that spikes on impacts, and ACES tone mapping. Only mounted on
 * capable devices; everything still glows without it, just less softly.
 */
export function Effects({ multisampling }: { multisampling: number }) {
  const bloom = useRef<BloomEffect>(null);
  const aberration = useRef<ChromaticAberrationEffect>(null);
  const offset = useMemo(() => new THREE.Vector2(0.0005, 0.0003), []);

  useFrame(() => {
    const s = director.shot;
    if (bloom.current) bloom.current.intensity = (0.8 + s.aura * 0.25 + s.wave) * s.bloom;
    if (aberration.current) {
      const k = 0.00045 + s.aberration * 0.0055;
      aberration.current.offset.set(k, k * 0.55);
    }
  });

  return (
    <EffectComposer multisampling={multisampling}>
      <Bloom ref={bloom} mipmapBlur intensity={0.8} luminanceThreshold={0.9} luminanceSmoothing={0.2} radius={0.62} />
      <ChromaticAberration ref={aberration} offset={offset} radialModulation modulationOffset={0.3} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
