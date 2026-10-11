"use client";

import { useCallback, useState } from "react";
import { ASSET_PATHS, type AssetManifest } from "@/lib/assets";
import { ANIMATION } from "@/lib/animation-config";
import type { QualitySettings } from "@/lib/quality";
import { CinematicCamera } from "./cinematic-camera";
import { EnergyParticles } from "./energy-particles";
import { FloatingRocks } from "./floating-rocks";
import { Ground } from "./ground";
import { LightTrails } from "./light-trails";
import { LightTunnel } from "./light-tunnel";
import { BodyArcs, SkyLightning } from "./lightning";
import { SceneLights } from "./scene-lights";
import { SharedUniforms } from "./shared-uniforms";
import { Shockwave } from "./shockwave";
import { Sky } from "./sky";
import { Smoke } from "./smoke";
import { Warrior } from "./warrior";
import { WarriorModel } from "./warrior-model";

type Props = {
  assets: AssetManifest;
  quality: QualitySettings;
  reducedMotion: boolean;
  onFigureReady: () => void;
};

/** Everything inside the canvas. Each layer reads the director on its own. */
export function GokuScene({ assets, quality, reducedMotion, onFigureReady }: Props) {
  const [modelFailed, setModelFailed] = useState(false);
  const onModelError = useCallback(() => setModelFailed(true), []);
  const useModel = assets.model && !modelFailed;

  return (
    <>
      <SharedUniforms />
      <CinematicCamera reducedMotion={reducedMotion} />
      <SceneLights />
      <Sky
        lowEnd={quality.tier === "low"}
        backdrops={{
          battlefield: assets.battlefield ? ASSET_PATHS.battlefield : undefined,
          cosmic: assets.cosmic ? ASSET_PATHS.cosmic : undefined,
        }}
      />
      <SkyLightning />
      <Ground segments={quality.tier === "low" ? 110 : 220} lowEnd={quality.tier === "low"} />
      <FloatingRocks count={quality.rocks} />
      {useModel ? <WarriorModel onError={onModelError} /> : null}
      {/* With a model, only the aura renders here, shaped by the drawn figure's silhouette. */}
      <Warrior assets={assets} textureSize={quality.figureTexture} showFigure={!useModel} onReady={onFigureReady} />
      <BodyArcs reducedMotion={reducedMotion} />
      <EnergyParticles count={Math.round(quality.particles * ANIMATION.intensity.particles)} />
      <LightTrails />
      <LightTunnel />
      <Shockwave />
      <Smoke layers={quality.smokeLayers} lowEnd={quality.tier === "low"} />
    </>
  );
}
