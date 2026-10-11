"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { mulberry32 } from "@/lib/random";
import { OUTPUT } from "./shaders";
import { shared } from "./shared-uniforms";

const MAX_SEGMENTS = 160;
const SKY_COLOR = new THREE.Color(2.2, 2.5, 3.6);
const ARC_BLUE = new THREE.Color("#bfe4ff");
const ARC_GOLD = new THREE.Color("#fff3c4");

type Segment = [THREE.Vector3, THREE.Vector3, number];

/** Camera-facing quads written into a pre-allocated buffer each frame. */
class Ribbon {
  readonly geometry = new THREE.BufferGeometry();
  private positions = new Float32Array(MAX_SEGMENTS * 18);
  private fade = new Float32Array(MAX_SEGMENTS * 6);
  private count = 0;
  private dir = new THREE.Vector3();
  private view = new THREE.Vector3();
  private side = new THREE.Vector3();
  private v = new THREE.Vector3();

  constructor() {
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.geometry.setAttribute("aFade", new THREE.BufferAttribute(this.fade, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0, 0);
  }

  reset() {
    this.count = 0;
  }

  segment(p0: THREE.Vector3, p1: THREE.Vector3, width: number, intensity: number, camera: THREE.Vector3) {
    if (this.count >= MAX_SEGMENTS) return;
    this.dir.subVectors(p1, p0);
    this.view.subVectors(camera, p0);
    this.side.crossVectors(this.dir, this.view).normalize().multiplyScalar(width);
    const corners: [THREE.Vector3, number][] = [
      [p0, 1],
      [p1, 1],
      [p1, -1],
      [p0, 1],
      [p1, -1],
      [p0, -1],
    ];
    corners.forEach(([p, s], k) => {
      this.v.copy(p).addScaledVector(this.side, s);
      const i = this.count * 6 + k;
      this.positions[i * 3] = this.v.x;
      this.positions[i * 3 + 1] = this.v.y;
      this.positions[i * 3 + 2] = this.v.z;
      this.fade[i] = intensity;
    });
    this.count++;
  }

  commit() {
    this.geometry.setDrawRange(0, this.count * 6);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aFade.needsUpdate = true;
  }
}

function boltParams(): THREE.ShaderMaterialParameters {
  return {
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uExposure: shared.uExposure, uColor: { value: new THREE.Color(1, 1, 1) }, uIntensity: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aFade;
      varying float vFade;
      void main() { vFade = aFade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uExposure;
      varying float vFade;
      void main() {
        gl_FragColor = vec4(uColor * vFade * uIntensity * uExposure, 1.0);
        ${OUTPUT}
      }
    `,
  };
}

/** Midpoint-displaced jagged line. Returns its points; segments go into `out`. */
function bolt(
  rand: () => number,
  from: THREE.Vector3,
  to: THREE.Vector3,
  jag: number,
  depth: number,
  out: Segment[],
  weight = 1,
) {
  let pts = [from.clone(), to.clone()];
  for (let d = 0; d < depth; d++) {
    const next: THREE.Vector3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const mid = pts[i].clone().lerp(pts[i + 1], 0.5);
      const len = pts[i].distanceTo(pts[i + 1]);
      mid.x += (rand() - 0.5) * len * jag;
      mid.y += (rand() - 0.5) * len * jag * 0.4;
      mid.z += (rand() - 0.5) * len * jag * 0.5;
      next.push(mid, pts[i + 1]);
    }
    pts = next;
  }
  for (let i = 0; i < pts.length - 1; i++) out.push([pts[i], pts[i + 1], weight]);
  return pts;
}

type BoltUniforms = { uColor: { value: THREE.Color }; uIntensity: { value: number } };

/** A ribbon mesh plus its additive material; `onFrame` fills the ribbon every frame. */
function BoltMesh({
  renderOrder,
  onFrame,
}: {
  renderOrder: number;
  onFrame: (ribbon: Ribbon, uniforms: BoltUniforms, camera: THREE.Camera) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const ribbon = useRef<Ribbon | null>(null);
  const params = useMemo(() => boltParams(), []);

  useEffect(() => {
    const r = new Ribbon();
    ribbon.current = r;
    if (mesh.current) mesh.current.geometry = r.geometry;
    return () => {
      ribbon.current = null;
      r.geometry.dispose();
    };
  }, []);

  useFrame(({ camera }) => {
    if (ribbon.current && material.current)
      onFrame(ribbon.current, material.current.uniforms as unknown as BoltUniforms, camera);
  });

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={renderOrder}>
      <shaderMaterial ref={material} args={[params]} />
    </mesh>
  );
}

/** Forked bolts in the distant sky, rebuilt on every storm strike. */
export function SkyLightning() {
  const state = useRef<{ seed: number; segments: Segment[] }>({ seed: -1, segments: [] });

  const onFrame = (r: Ribbon, u: BoltUniforms, camera: THREE.Camera) => {
    const intensity = director.strike * director.shot.storm;
    const st = state.current;
    if (director.strikeSeed !== st.seed) {
      st.seed = director.strikeSeed;
      const rand = mulberry32(Math.floor(director.strikeSeed * 1000));
      const x = director.strikeX * 34;
      const top = new THREE.Vector3(x + (rand() - 0.5) * 6, 34, -48);
      const bottom = new THREE.Vector3(x + (rand() - 0.5) * 12, -0.5, -30 - rand() * 10);
      const out: Segment[] = [];
      const main = bolt(rand, top, bottom, 0.55, 5, out, 1);
      for (let f = 0; f < 3; f++) {
        const start = main[2 + Math.floor(rand() * (main.length / 2))];
        const end = start.clone().add(new THREE.Vector3((rand() - 0.5) * 16, -8 - rand() * 10, (rand() - 0.5) * 4));
        bolt(rand, start, end, 0.6, 4, out, 0.45);
      }
      st.segments = out;
    }
    r.reset();
    if (intensity > 0.01) for (const [p0, p1, w] of st.segments) r.segment(p0, p1, 0.09 * w + 0.03, w, camera.position);
    r.commit();
    u.uColor.value.copy(SKY_COLOR);
    u.uIntensity.value = intensity;
  };

  return <BoltMesh renderOrder={-5} onFrame={onFrame} />;
}

const a = new THREE.Vector3();
const b = new THREE.Vector3();

/** Arcs of electricity crawling around the figure, re-rolled every few frames. */
export function BodyArcs({ reducedMotion }: { reducedMotion: boolean }) {
  const state = useRef<{ next: number; seed: number; arcs: Segment[] }>({ next: 0, seed: 1, arcs: [] });

  const onFrame = (r: Ribbon, u: BoltUniforms, camera: THREE.Camera) => {
    const s = director.shot;
    const t = shared.uTime.value;
    const st = state.current;
    r.reset();
    if (s.arcs > 0.01) {
      // With reduced motion the arcs still appear, but change shape slowly.
      if (t > st.next) {
        st.next = t + (reducedMotion ? 0.9 : 0.06 + Math.random() * 0.08);
        const rand = mulberry32(st.seed++);
        const out: Segment[] = [];
        const n = Math.round(1 + s.arcs * 4);
        for (let i = 0; i < n; i++) {
          const side = rand() < 0.5 ? -1 : 1;
          const y0 = 0.3 + rand() * 2.4;
          const from = new THREE.Vector3(side * (0.25 + rand() * 0.45), y0, 0.08);
          const to = new THREE.Vector3(side * (0.15 + rand() * 0.75), y0 + (rand() - 0.3) * 0.9, 0.08);
          bolt(rand, from, to, 0.9, 3, out, 0.6 + rand() * 0.4);
        }
        st.arcs = out;
      }
      // Arcs live in the figure's plane, so they turn with its billboard.
      const yaw = Math.atan2(camera.position.x, camera.position.z);
      const lift = s.gold * 0.12 + s.cosmic * 0.3;
      for (const [p0, p1, w] of st.arcs) {
        a.copy(p0)
          .applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw)
          .setY(p0.y + lift);
        b.copy(p1)
          .applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw)
          .setY(p1.y + lift);
        r.segment(a, b, 0.0065, w, camera.position);
      }
    }
    r.commit();
    u.uColor.value
      .copy(ARC_BLUE)
      .lerp(ARC_GOLD, s.gold * 0.5)
      .multiplyScalar(3.2);
    u.uIntensity.value = s.arcs * (reducedMotion ? 0.8 : 0.6 + Math.random() * 0.4);
  };

  return <BoltMesh renderOrder={5} onFrame={onFrame} />;
}
