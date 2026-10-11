"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ASSET_PATHS, MODEL_CONFIG } from "@/lib/assets";
import { director } from "@/lib/director";
import { shared } from "./shared-uniforms";

const GOLD = new THREE.Color("#ffcf3a");
const SILVER = new THREE.Color("#cdd6f2");

type Tinted = { material: THREE.MeshStandardMaterial; base: THREE.Color; baseEmissive: THREE.Color };

type Rig = {
  mixer: THREE.AnimationMixer;
  transform: THREE.AnimationAction | null;
  hair: Tinted[];
  offsetY: number;
  dispose: () => void;
};

const has = (name: string, needle: string) => name.toLowerCase().includes(needle.toLowerCase());

/**
 * A supplied GLB/GLTF character, loaded only when the file exists. Nothing
 * about the file is assumed:
 * - it is scaled to MODEL_CONFIG.height with its feet on the ground;
 * - a looping clip plays only if the file has one (matching `idleClip`, else the first);
 * - a clip matching `transformClip` is scrubbed by the transformation's progress;
 * - meshes/materials matching `hairMatch` shift colour with each form.
 * Meshopt-compressed files are supported. If loading fails, `onError` lets
 * the scene fall back to the procedural figure.
 */
export function WarriorModel({ onError }: { onError: () => void }) {
  const group = useRef<THREE.Group>(null);
  const rig = useRef<Rig | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/libs/meshopt_decoder.module.js"),
      ]);
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(ASSET_PATHS.model);
      if (cancelled || !group.current) return;
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const height = box.getSize(new THREE.Vector3()).y;
      const scale = height > 0 ? MODEL_CONFIG.height / height : 1;
      model.scale.setScalar(scale);
      model.rotation.y = MODEL_CONFIG.rotationY;

      const hair: Tinted[] = [];
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        list.forEach((m, i) => {
          if (!(m instanceof THREE.MeshStandardMaterial)) return;
          if (!has(mesh.name, MODEL_CONFIG.hairMatch) && !has(m.name, MODEL_CONFIG.hairMatch)) return;
          const own = m.clone();
          if (Array.isArray(mesh.material)) mesh.material[i] = own;
          else mesh.material = own;
          hair.push({ material: own, base: own.color.clone(), baseEmissive: own.emissive.clone() });
        });
      });

      const mixer = new THREE.AnimationMixer(model);
      const clips = gltf.animations;
      const transformClip = clips.find((c) => has(c.name, MODEL_CONFIG.transformClip)) ?? null;
      const idleClip = clips.find((c) => has(c.name, MODEL_CONFIG.idleClip)) ?? clips.find((c) => c !== transformClip);
      if (idleClip) mixer.clipAction(idleClip).play();
      const transform = transformClip ? mixer.clipAction(transformClip) : null;
      if (transform) {
        transform.play();
        transform.paused = true;
        transform.setEffectiveWeight(0);
      }

      group.current.add(model);
      rig.current = {
        mixer,
        transform,
        hair,
        offsetY: -box.min.y * scale,
        dispose: () => {
          mixer.stopAllAction();
          model.removeFromParent();
          model.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
          });
        },
      };
    })().catch((error) => {
      console.warn("[goku] character model failed to load, using the procedural figure instead.", error);
      if (!cancelled) onError();
    });
    return () => {
      cancelled = true;
      rig.current?.dispose();
      rig.current = null;
    };
  }, [onError]);

  useFrame(({ camera }, dt) => {
    const r = rig.current;
    const g = group.current;
    if (!r || !g) return;
    const s = director.shot;
    // Face the camera loosely, so real geometry shows a little of the orbit.
    g.rotation.y = Math.atan2(camera.position.x, camera.position.z) * 0.35;
    g.position.y = r.offsetY + s.gold * 0.12 + s.cosmic * 0.3;
    r.mixer.update(Math.min(dt, 0.1));
    if (r.transform) {
      r.transform.setEffectiveWeight(s.ssj > 0 && s.ssj < 1 ? 1 : 0);
      r.transform.time = s.ssj * r.transform.getClip().duration;
    }
    const glow = 1 + s.ssj * s.aura * 2 * shared.uExposure.value;
    r.hair.forEach(({ material, base, baseEmissive }) => {
      material.color
        .copy(base)
        .lerp(GOLD, s.ssj)
        .lerp(SILVER, s.ultra * (1 - s.ssj));
      material.emissive.copy(baseEmissive).lerp(GOLD, s.ssj * 0.8);
      material.emissiveIntensity = glow;
    });
  });

  return <group ref={group} />;
}
