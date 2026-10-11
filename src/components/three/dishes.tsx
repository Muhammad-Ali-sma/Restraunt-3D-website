"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mulberry32 } from "@/lib/random";
import type { DishKind } from "@/lib/content";
import { fishBump, fishTexture, makiCapTexture, noriTexture, slateTextures, tamagoTexture } from "./textures";

/*
 * Every dish is modelled procedurally: no .glb downloads, tiny bundle, and the
 * geometry is shared (module-level cache) between the hero and the menu.
 */

const geoCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g as T;
}

const matCache = new Map<string, THREE.Material>();
function mat<T extends THREE.Material>(key: string, make: () => T): T {
  let m = matCache.get(key);
  if (!m) {
    m = make();
    matCache.set(key, m);
  }
  return m as T;
}

// ---------------------------------------------------------------- rice

const RICE = { rx: 0.52, ry: 0.24, rz: 0.27 };
/** Highest point of the rice bed (the bed is lifted so its widest part sits on the plate). */
const RICE_TOP = RICE.ry * 1.62;

function riceMaterial() {
  return mat(
    "rice",
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f3efe4",
        roughness: 0.48,
        sheen: 0.6,
        sheenColor: new THREE.Color("#ffffff"),
        sheenRoughness: 0.5,
      }),
  );
}

/** A hand-pressed rice bed: a soft core plus ~300 individually placed grains. */
export function RiceBed({ seed = 1, count = 380 }: { seed?: number; count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const grain = geo("grain", () => new THREE.CapsuleGeometry(0.018, 0.046, 2, 6));
  const core = geo("rice-core", () => new THREE.SphereGeometry(1, 28, 18));

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = mulberry32(seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    let i = 0;
    while (i < count) {
      // uniform direction on a sphere, mapped onto the rice ellipsoid
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const k = Math.sqrt(1 - u * u);
      const dir = new THREE.Vector3(k * Math.cos(th), u, k * Math.sin(th));
      // skip the bottom (hidden by the plate) and the crown (hidden under the topping)
      if (dir.y < -0.35 || dir.y > 0.7) continue;
      const depth = 0.93 + r() * 0.06;
      p.set(dir.x * RICE.rx * depth, dir.y * RICE.ry * depth, dir.z * RICE.rz * depth);
      e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
      q.setFromEuler(e);
      const sc = 0.85 + r() * 0.35;
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      i++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [seed, count]);

  return (
    <group position={[0, RICE.ry * 0.62, 0]}>
      <mesh geometry={core} material={riceMaterial()} scale={[RICE.rx * 0.96, RICE.ry * 0.9, RICE.rz * 0.96]} />
      <instancedMesh ref={ref} args={[grain, riceMaterial(), count]} />
    </group>
  );
}

// ---------------------------------------------------------------- toppings

type Fish = Exclude<DishKind, "tamago" | "maki">;

/**
 * A hand-cut slice: a finely subdivided box whose cross-section is pinched
 * into a lens (thin at the edges), then draped over the rice and tapered.
 */
function fishSlice(len: number, thick: number, width: number, droop: number, taper: number) {
  const g = new THREE.BoxGeometry(len, thick, width, 40, 1, 14);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const nx = v.x / (len / 2);
    const nz = v.z / (width / 2);
    const edge = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(nz), 6))) * (1 - Math.pow(Math.abs(nx), 6) * 0.5);
    v.y *= Math.max(edge, 0.3);
    v.y -= droop * nx * nx;
    v.z *= 1 - taper * nx * nx;
    v.y += 0.02 * Math.sin(nx * 2.4) * nz; // subtle twist, feels hand-cut
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function fishMaterial(kind: Fish) {
  return mat(`fish-${kind}`, () => {
    const lacquer = kind === "akami";
    return new THREE.MeshPhysicalMaterial({
      map: fishTexture(kind),
      bumpMap: fishBump(kind),
      bumpScale: 1.2,
      roughness: lacquer ? 0.22 : 0.36,
      clearcoat: lacquer ? 1 : 0.75,
      clearcoatRoughness: lacquer ? 0.08 : 0.2,
      sheen: 0.35,
      sheenColor: new THREE.Color(kind === "akami" ? "#ff8a8a" : "#ffd9cc"),
      sheenRoughness: 0.4,
    });
  });
}

export function FishSlice({ kind }: { kind: Fish }) {
  const g = geo("slab-fish", () => fishSlice(1.42, 0.12, 0.66, 0.2, 0.22));
  return <mesh geometry={g} material={fishMaterial(kind)} position={[0, RICE_TOP + 0.015, 0]} />;
}

function Tamago() {
  const block = geo("slab-tamago", () => new RoundedBoxGeometry(1.3, 0.24, 0.6, 4, 0.05));
  const band = geo("nori-band", () => {
    const shape = new THREE.Shape();
    const hw = 0.34;
    const bottom = 0.0;
    const top = 0.64;
    const r = 0.12;
    shape.moveTo(-hw + r, bottom);
    shape.lineTo(hw - r, bottom);
    shape.quadraticCurveTo(hw, bottom, hw, bottom + r);
    shape.lineTo(hw, top - r);
    shape.quadraticCurveTo(hw, top, hw - r, top);
    shape.lineTo(-hw + r, top);
    shape.quadraticCurveTo(-hw, top, -hw, top - r);
    shape.lineTo(-hw, bottom + r);
    shape.quadraticCurveTo(-hw, bottom, -hw + r, bottom);
    const hole = new THREE.Path();
    const t = 0.012;
    hole.moveTo(-hw + t + r, bottom + t);
    hole.lineTo(hw - t - r, bottom + t);
    hole.quadraticCurveTo(hw - t, bottom + t, hw - t, bottom + t + r);
    hole.lineTo(hw - t, top - t - r);
    hole.quadraticCurveTo(hw - t, top - t, hw - t - r, top - t);
    hole.lineTo(-hw + t + r, top - t);
    hole.quadraticCurveTo(-hw + t, top - t, -hw + t, top - t - r);
    hole.lineTo(-hw + t, bottom + t + r);
    hole.quadraticCurveTo(-hw + t, bottom + t, -hw + t + r, bottom + t);
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -0.1);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const tamagoMat = mat(
    "tamago",
    () =>
      new THREE.MeshPhysicalMaterial({
        map: tamagoTexture(),
        roughness: 0.55,
        sheen: 0.4,
        sheenColor: new THREE.Color("#fff1c2"),
      }),
  );
  return (
    <>
      <mesh geometry={block} material={tamagoMat} position={[0, RICE_TOP + 0.1, 0]} />
      <mesh geometry={band} material={noriMaterial()} position={[0, -0.005, 0]} />
    </>
  );
}

function noriMaterial() {
  return mat(
    "nori",
    () =>
      new THREE.MeshStandardMaterial({
        map: noriTexture(),
        roughness: 0.62,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
  );
}

export function Nigiri({ kind, seed = 1 }: { kind: Fish | "tamago"; seed?: number }) {
  return (
    <group>
      <RiceBed seed={seed} />
      {kind === "tamago" ? <Tamago /> : <FishSlice kind={kind} />}
    </group>
  );
}

export function MakiPiece() {
  const side = geo("maki-side", () => new THREE.CylinderGeometry(0.3, 0.3, 0.42, 40, 1, true));
  const cap = geo("maki-cap", () => new THREE.CircleGeometry(0.296, 40));
  const capMat = mat(
    "maki-cap",
    () =>
      new THREE.MeshPhysicalMaterial({
        map: makiCapTexture(),
        roughness: 0.5,
        sheen: 0.5,
        sheenColor: new THREE.Color("#ffffff"),
      }),
  );
  return (
    <group position={[0, 0.21, 0]}>
      <mesh geometry={side} material={noriMaterial()} />
      <mesh geometry={cap} material={capMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} />
    </group>
  );
}

/** The dish as presented in the course menu (2 nigiri, or 3 maki). */
export function DishModel({ kind }: { kind: DishKind }) {
  if (kind === "maki") {
    return (
      <group>
        <group position={[-0.68, 0, 0.08]} rotation={[0, 0.4, 0]}>
          <MakiPiece />
        </group>
        <group position={[0, 0, -0.06]} rotation={[0, 1.2, 0]}>
          <MakiPiece />
        </group>
        <group position={[0.68, 0, 0.08]} rotation={[0, 2.1, 0]}>
          <MakiPiece />
        </group>
      </group>
    );
  }
  return (
    <group>
      <group rotation={[0, 0.55, 0]}>
        <group position={[-0.14, 0, 0.4]}>
          <Nigiri kind={kind} seed={3} />
        </group>
        <group position={[0.14, 0, -0.4]}>
          <Nigiri kind={kind} seed={9} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- tableware

export function SlateBoard({ size = [4.4, 0.14, 1.9] as [number, number, number] }) {
  const g = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 4, 0.05), [size]);
  const m = mat("slate", () => {
    const { map, rough } = slateTextures();
    return new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.85, metalness: 0.1 });
  });
  return <mesh geometry={g} material={m} position={[0, -size[1] / 2, 0]} />;
}

export function Plate() {
  const g = geo("plate", () => {
    const pts = [
      [0, 0.0],
      [1.3, 0.0],
      [1.45, 0.03],
      [1.62, 0.1],
      [1.66, 0.13],
      [1.6, 0.13],
      [1.45, 0.07],
      [1.3, 0.05],
      [0, 0.05],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 72);
  });
  const m = mat(
    "plate",
    () =>
      new THREE.MeshPhysicalMaterial({ color: "#16171a", roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
  );
  return <mesh geometry={g} material={m} position={[0, -0.05, 0]} />;
}

export function Gari() {
  const petal = geo("gari", () => {
    const g = new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 1.1, 0, Math.PI / 2.4);
    g.scale(1, 0.25, 0.7);
    return g;
  });
  const m = mat(
    "gari",
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f2b7a6",
        roughness: 0.3,
        transmission: 0,
        sheen: 1,
        sheenColor: new THREE.Color("#ffe3da"),
        clearcoat: 0.6,
        side: THREE.DoubleSide,
      }),
  );
  const r = mulberry32(77);
  const petals = Array.from({ length: 6 }, (_, i) => ({
    p: [(r() - 0.5) * 0.14, 0.02 + i * 0.025, (r() - 0.5) * 0.12] as [number, number, number],
    rot: [r() * 0.4, r() * Math.PI * 2, r() * 0.3] as [number, number, number],
  }));
  return (
    <group>
      {petals.map((pp, i) => (
        <mesh key={i} geometry={petal} material={m} position={pp.p} rotation={pp.rot} />
      ))}
    </group>
  );
}

export function Wasabi() {
  const g = geo("wasabi", () => {
    const g = new THREE.IcosahedronGeometry(0.13, 4);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 40) * Math.sin(v.y * 35) * Math.sin(v.z * 45) * 0.012;
      v.multiplyScalar(1 + n / 0.13);
      v.y = v.y < 0 ? v.y * 0.2 : v.y * 0.75;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
  const m = mat("wasabi", () => new THREE.MeshStandardMaterial({ color: "#93b24a", roughness: 0.8 }));
  return <mesh geometry={g} material={m} position={[0, 0.02, 0]} />;
}

export function SoyDish() {
  const g = geo("soy", () => {
    const pts = [
      [0, 0],
      [0.22, 0],
      [0.3, 0.02],
      [0.36, 0.08],
      [0.38, 0.1],
      [0.35, 0.1],
      [0.3, 0.06],
      [0.2, 0.035],
      [0, 0.035],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 48);
  });
  const liquid = geo("soy-liquid", () => new THREE.CircleGeometry(0.305, 40));
  const ceramic = mat(
    "ceramic",
    () => new THREE.MeshPhysicalMaterial({ color: "#e9e2d2", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
  );
  const soy = mat(
    "soy-liquid",
    () => new THREE.MeshPhysicalMaterial({ color: "#1d0b04", roughness: 0.04, clearcoat: 1 }),
  );
  return (
    <group>
      <mesh geometry={g} material={ceramic} />
      <mesh geometry={liquid} material={soy} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} />
    </group>
  );
}

export function Chopsticks() {
  const stick = geo("stick", () => {
    const g = new THREE.CylinderGeometry(0.014, 0.03, 2.3, 10);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const tip = geo("stick-band", () => {
    const g = new THREE.CylinderGeometry(0.031, 0.031, 0.08, 12);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const rest = geo("rest", () => new THREE.CapsuleGeometry(0.05, 0.22, 4, 12).rotateZ(Math.PI / 2));
  const lacquer = mat(
    "lacquer",
    () => new THREE.MeshPhysicalMaterial({ color: "#120c0a", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
  );
  const gold = mat("gold", () => new THREE.MeshStandardMaterial({ color: "#c9a35b", roughness: 0.25, metalness: 1 }));
  const restMat = mat(
    "rest",
    () => new THREE.MeshPhysicalMaterial({ color: "#a33b2a", roughness: 0.3, clearcoat: 0.8 }),
  );
  return (
    <group>
      <mesh geometry={rest} material={restMat} position={[0.82, 0.05, 0]} rotation={[0, Math.PI / 2, 0]} />
      {[-0.045, 0.045].map((z, i) => (
        <group key={z} position={[0, 0.115 - i * 0.004, z]} rotation={[0, i * 0.03, -0.045]}>
          <mesh geometry={stick} material={lacquer} />
          <mesh geometry={tip} material={gold} position={[0.86, 0, 0]} />
        </group>
      ))}
    </group>
  );
}

export function Yunomi() {
  const g = geo("yunomi", () => {
    const pts = [
      [0, 0],
      [0.26, 0],
      [0.28, 0.02],
      [0.3, 0.5],
      [0.31, 0.62],
      [0.29, 0.62],
      [0.27, 0.52],
      [0.25, 0.06],
      [0, 0.06],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 48);
  });
  const tea = geo("tea", () => new THREE.CircleGeometry(0.272, 40));
  const glaze = mat(
    "yunomi",
    () =>
      new THREE.MeshPhysicalMaterial({ color: "#2b3a33", roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  );
  const teaMat = mat("tea", () => new THREE.MeshPhysicalMaterial({ color: "#6b7a2a", roughness: 0.05, clearcoat: 1 }));
  return (
    <group>
      <mesh geometry={g} material={glaze} />
      <mesh geometry={tea} material={teaMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]} />
    </group>
  );
}
