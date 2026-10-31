// Địa hình theo bản đồ độ cao + rải cây/đá/bụi. Mỗi video tự thiết kế địa hình của mình qua hàm độ cao
// (đồi, thung lũng, đường, bãi phẳng cho phương tiện) — heightField() chỉ là điểm khởi đầu có thể cộng thêm.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { fbm, grain } from './materials';
import { mat4, merge } from './geom';

export type HeightFn = (x: number, z: number) => number;

/**
 * Hàm độ cao nền: fBm biên độ `amp` (m), bước sóng `scale` (m). `flats` = các bãi phẳng tròn [x, z, bán kính, độ cao]
 * nơi đặt phương tiện / công trình (mép chuyển mượt). `add` = hàm cộng thêm (đồi, sống núi, lòng đường…) do cảnh tự viết.
 */
export const heightField = (o: { seed?: number; amp?: number; scale?: number; oct?: number; flats?: [number, number, number, number][]; add?: HeightFn }): HeightFn => {
  const { seed = 1, amp = 6, scale = 120, oct = 5, flats = [], add } = o;
  return (x, z) => {
    let h = (fbm(x / scale + 50, z / scale + 50, seed, oct) - 0.5) * 2 * amp;
    if (add) h += add(x, z);
    for (const [fx, fz, r, fh] of flats) {
      const d = Math.hypot(x - fx, z - fz);
      const w = d < r ? 1 : d > r * 1.8 ? 0 : 1 - (d - r) / (r * 0.8);
      const s = w * w * (3 - 2 * w);
      h = h * (1 - s) + fh * s;
    }
    return h;
  };
};

/** Sống đồi chạy theo trục Z tại x0 (cao h, nửa rộng w) — ví dụ một hàm `add`. */
export const ridgeX = (x0: number, h: number, w: number): HeightFn => (x) => h * Math.exp(-(((x - x0) / w) ** 2));

export type TerrainColors = { low: string; high: string; rock: string; dry?: string };

/**
 * Lưới địa hình `size` x `size` (m) tâm (cx, cz), màu theo độ cao + độ dốc + vệt khô, có hạt chi tiết và nhận bóng.
 * Hàm `h` nên tạo ở cấp module hoặc useMemo để không dựng lại lưới mỗi khung.
 */
export const Terrain: React.FC<{ h: HeightFn; size?: number; seg?: number; center?: [number, number]; colors?: TerrainColors; grainRepeat?: number }> = ({
  h, size = 400, seg = 256, center = [0, 0], colors = { low: '#6f9a4a', high: '#9bb46a', rock: '#8a7f6e', dry: '#b9a777' }, grainRepeat = 40,
}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(center[0], 0, center[1]);
    const p = g.attributes.position as THREE.BufferAttribute;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < p.count; i++) { const y = h(p.getX(i), p.getZ(i)); p.setY(i, y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    g.computeVertexNormals();
    const n = g.attributes.normal as THREE.BufferAttribute;
    const cl = new THREE.Color(colors.low), ch = new THREE.Color(colors.high), cr = new THREE.Color(colors.rock), cd = new THREE.Color(colors.dry ?? colors.high);
    const col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), t = (p.getY(i) - lo) / Math.max(1e-3, hi - lo);
      c.copy(cl).lerp(ch, t);
      const dry = fbm(x / 40, z / 40, 77, 3);
      if (dry > 0.58) c.lerp(cd, Math.min(1, (dry - 0.58) * 5));
      const slope = 1 - n.getY(i);
      if (slope > 0.12) c.lerp(cr, Math.min(1, (slope - 0.12) * 4));
      c.multiplyScalar(0.9 + 0.2 * fbm(x / 7, z / 7, 5, 2));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [h, size, seg, center[0], center[1], colors.low, colors.high, colors.rock, colors.dry]);
  const mat = useMemo(() => {
    const t = grain(11, 6).clone();
    t.needsUpdate = true;
    t.repeat.set(grainRepeat, grainRepeat);
    return new THREE.MeshStandardMaterial({ vertexColors: true, map: t, roughness: 0.97 });
  }, [grainRepeat]);
  return <mesh geometry={geo} material={mat} receiveShadow />;
};

// ---------- cây, đá, bụi (low-poly tự sinh, mỗi cá thể khác cỡ/xoay/màu) ----------
const jitter = (g: THREE.BufferGeometry, amt: number, seed: number) => {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = (fbm(x * 3 + seed, y * 3, z * 3 + seed, 2) - 0.5) * 2 * amt;
    p.setXYZ(i, x * (1 + k), y * (1 + k * 0.5), z * (1 + k));
  }
  g.computeVertexNormals();
  return g;
};
const tint = (g: THREE.BufferGeometry, color: string) => {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};
const KINDS: Record<string, () => THREE.BufferGeometry> = {
  pine: () => merge([
    tint(new THREE.CylinderGeometry(0.12, 0.2, 2.2, 6).applyMatrix4(mat4([0, 1.1, 0])), '#5a4632'),
    tint(jitter(new THREE.ConeGeometry(1.6, 3.2, 7).applyMatrix4(mat4([0, 3.0, 0])), 0.12, 1), '#3f6b3a'),
    tint(jitter(new THREE.ConeGeometry(1.25, 2.6, 7).applyMatrix4(mat4([0, 4.4, 0])), 0.12, 2), '#46773f'),
    tint(jitter(new THREE.ConeGeometry(0.85, 2.0, 7).applyMatrix4(mat4([0, 5.7, 0])), 0.12, 3), '#4f8446'),
  ]),
  broadleaf: () => merge([
    tint(new THREE.CylinderGeometry(0.15, 0.25, 2.4, 6).applyMatrix4(mat4([0, 1.2, 0])), '#5f4a35'),
    tint(jitter(new THREE.IcosahedronGeometry(1.8, 1).applyMatrix4(mat4([0, 3.4, 0])), 0.2, 4), '#5c8a3e'),
    tint(jitter(new THREE.IcosahedronGeometry(1.3, 1).applyMatrix4(mat4([0.9, 2.9, 0.5])), 0.2, 5), '#68964a'),
    tint(jitter(new THREE.IcosahedronGeometry(1.2, 1).applyMatrix4(mat4([-0.8, 3.0, -0.4])), 0.2, 6), '#557f39'),
  ]),
  bush: () => merge([
    tint(jitter(new THREE.IcosahedronGeometry(0.8, 1).applyMatrix4(mat4([0, 0.5, 0], [0, 0, 0], [1.3, 0.8, 1.1])), 0.25, 7), '#5d8740'),
    tint(jitter(new THREE.IcosahedronGeometry(0.6, 1).applyMatrix4(mat4([0.6, 0.4, 0.3])), 0.25, 8), '#6a9549'),
  ]),
  rock: () => tint(jitter(new THREE.DodecahedronGeometry(1, 1).applyMatrix4(mat4([0, 0.3, 0], [0, 0, 0], [1.3, 0.75, 1])), 0.3, 9), '#8d867b'),
};

/**
 * Rải `count` cá thể loại `kind` trong vùng [x0, z0, x1, z1] bám mặt đất `h`. `avoid(x,z)` = true thì bỏ (đường, bãi đỗ).
 * Tất định theo `seed`. `scale` = [min, max] tỉ lệ. `tint` nhân màu gốc (vd. '#d8b070' cho mùa thu, '#9fb0a0' cho sương lạnh).
 */
export const Scatter: React.FC<{ kind: 'pine' | 'broadleaf' | 'bush' | 'rock'; count: number; area: [number, number, number, number]; h: HeightFn; seed?: number; scale?: [number, number]; avoid?: (x: number, z: number) => boolean; tint?: string }> = ({
  kind, count, area, h, seed = 1, scale = [0.7, 1.3], avoid, tint = '#ffffff',
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => KINDS[kind](), [kind]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, color: tint }), [tint]);
  const items = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const r = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233 + seed * 37.719) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; out.length < count && i < count * 6; i++) {
      const x = area[0] + (area[2] - area[0]) * r(i, 1), z = area[1] + (area[3] - area[1]) * r(i, 2);
      if (avoid?.(x, z)) continue;
      const s = scale[0] + (scale[1] - scale[0]) * r(i, 3);
      out.push(mat4([x, h(x, z) - 0.1, z], [0, r(i, 4) * Math.PI * 2, 0], [s * (0.9 + 0.2 * r(i, 5)), s, s * (0.9 + 0.2 * r(i, 6))]));
    }
    return out;
  }, [count, area[0], area[1], area[2], area[3], h, seed, scale[0], scale[1], avoid]);
  useLayoutEffect(() => {
    items.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow receiveShadow />;
};
