"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "@/lib/director";
import { mulberry32 } from "@/lib/random";
import { shared } from "./shared-uniforms";

type Rock = {
  x: number;
  z: number;
  scale: THREE.Vector3;
  rise: number;
  spin: THREE.Vector3;
  phase: number;
  delay: number;
};

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();

/** Angular boulder: a low-poly icosahedron with seeded, flat-shaded displacement. */
function rockGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const r = mulberry32(3);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const offsets = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, 0.72 + r() * 0.5);
    v.multiplyScalar(offsets.get(key)!);
    pos.setXYZ(i, v.x, v.y * 0.8, v.z);
  }
  g.computeVertexNormals();
  return g.toNonIndexed();
}

/**
 * Debris that lifts off the battlefield as the power builds, hangs in the
 * void for Ultra Instinct, and streams past the camera in the final surge.
 */
export function FloatingRocks({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => rockGeometry(), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#6b6a72", roughness: 0.9, metalness: 0.05, flatShading: true }),
    [],
  );

  const rocks = useMemo<Rock[]>(() => {
    const r = mulberry32(17);
    return Array.from({ length: count }, (_, i) => {
      const near = i < count * 0.6;
      const radius = near ? 1.6 + r() * 6 : 8 + r() * 16;
      // Mostly beside and behind the character, never in the camera's path.
      const angle = Math.PI * (1 + r()) + (r() < 0.3 ? (r() - 0.5) * 1.6 : 0);
      const size = near ? 0.05 + r() * 0.2 : 0.2 + r() * 0.65;
      let x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - (near ? 0 : 3);
      if (z > 1.5 && Math.abs(x) < 3.5) x = Math.sign(x || 1) * (3.5 + r() * 3);
      return {
        x,
        z,
        scale: new THREE.Vector3(size * (0.8 + r() * 0.5), size * (0.6 + r() * 0.6), size * (0.8 + r() * 0.5)),
        rise: near ? 0.5 + r() * 3.2 : 1.5 + r() * 7,
        spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.2),
        phase: r() * Math.PI * 2,
        delay: r() * 0.5,
      };
    });
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const inst = mesh.current;
    if (!inst) return;
    const s = director.shot;
    const t = shared.uTime.value;
    inst.visible = s.lift > 0.001 || s.ground > 0.01;
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      const lift = THREE.MathUtils.clamp((s.lift - rock.delay * 0.4) / (1 - rock.delay * 0.4), 0, 1);
      const eased = lift * lift * (3 - 2 * lift);
      const bob = Math.sin(t * 0.8 + rock.phase) * 0.12 * eased;
      // In the surge everything streams towards (and past) the camera.
      const rush = s.speed > 0 ? ((t * (6 + rock.rise) * s.speed + rock.phase * 5) % 50) * s.speed : 0;
      p.set(rock.x, rock.scale.y * 0.4 + eased * rock.rise + bob, rock.z + rush);
      const spin = eased * t * 0.4;
      e.set(rock.phase + rock.spin.x * spin, rock.phase * 2 + rock.spin.y * spin, rock.spin.z * spin);
      q.setFromEuler(e);
      m.compose(p, q, rock.scale);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} castShadow={false} />;
}
