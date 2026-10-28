// S01 — Hook (3D) 0 → 26.20: pháo bắn, đạn bay qua cánh đồng chiều muộn, nổ sau bờ cây, pháo đã rời đi.
// Thế giới: pháo tại gốc, thân xe dọc trục Z (mũi xe → -Z), tháp quay sang +X bắn về mục tiêu cách ~770 m phía đông.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { prog, lerp } from '@kit/theme';
import { useT, Label, handheld } from '@kit/motion';
import { Stage, Cam, V3 } from '@lib/3d/stage';
import { heightField, Scatter, HeightFn } from '@lib/3d/terrain';
import { Explosion, MuzzleBlast, DustTrail, Trail, ballistic, ballisticPoints, softDot } from '@lib/3d/fx';
import { rbox } from '@lib/3d/geom';
import { plain, paint, fbm, grain } from '@lib/3d/materials';
import { SPH, Shell155, muzzleOf } from '../local/models';
import { CUE } from '../cues';

// ---------------- địa hình ----------------
const sstep = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const bank = (d: number, h: number, w: number) => h * Math.exp(-((d / w) ** 2));
const roadX = (z: number) => -34 + 14 * Math.sin(z / 130);
const addShape: HeightFn = (x, z) => {
  let h = 0;
  // bờ đất chia ruộng
  h += bank(x + 130, 0.9, 4) + bank(x - 190, 0.8, 4) + bank(x - 500, 0.9, 4);
  h += bank(z + 330, 0.9, 4) * sstep(-400, -350, x) + bank(z - 230, 0.8, 4) * sstep(-300, -250, x);
  // bờ cây (đê đất cao hơn)
  h += bank(x - 335, 1.6, 7) + bank(x - 722, 2.2, 9);
  // đường đất lõm
  h -= 0.35 * Math.exp(-(((x - roadX(z)) / 3) ** 2));
  // đồi xa quanh rìa
  const ridge = fbm(x / 220, z / 220, 9, 3);
  h += sstep(1000, 1500, x) * (30 + 40 * ridge) + sstep(-450, -900, x) * (20 + 35 * ridge) + sstep(750, 1200, Math.abs(z - 0)) * (15 + 30 * ridge);
  return h;
};
const hBase = heightField({ seed: 5, amp: 2.2, scale: 260, add: addShape });
const T_X = 770, T_Z = 1;
const hT = hBase(T_X, T_Z);
const H = heightField({ seed: 5, amp: 2.2, scale: 260, add: addShape, flats: [[0, -55, 70, 0], [T_X, T_Z, 16, hT]] });

// Mặt đất chia thửa: ruộng rạ vàng, đất cày nâu, lúa mì đông xanh thẫm; bờ dốc xanh, đồi xa xanh sẫm.
const XB = [-130, 190, 335, 500, 722], ZB = [-330, 230];
const FIELD = ['#b0954f', '#7d5c39', '#5c6a33', '#c9ab66', '#96793f', '#6f7a3e'];
const band = (v: number, bs: number[]) => bs.filter((b) => v > b).length;
const fieldColor = (x: number, z: number) => {
  const ix = band(x, XB), iz = band(z, ZB);
  if (ix === 1 && iz === 1) return FIELD[0];
  const k = Math.floor(Math.abs(Math.sin(ix * 12.9898 + iz * 78.233) * 43758.5453)) % FIELD.length;
  return FIELD[k];
};
const FieldTerrain: React.FC<{ size: number; seg: number; center: [number, number] }> = ({ size, seg, center }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(center[0], 0, center[1]);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const n = g.attributes.normal as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3), c = new THREE.Color(), green = new THREE.Color('#4f5d2e'), hill = new THREE.Color('#58663a'), road = new THREE.Color('#8e7a5a');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      c.set(fieldColor(x, z));
      c.multiplyScalar(0.88 + 0.24 * fbm(x / 35, z / 35, 4, 3));
      const slope = 1 - n.getY(i);
      if (slope > 0.015) c.lerp(green, Math.min(1, (slope - 0.015) * 14));
      const far = Math.max(sstep(950, 1250, x), sstep(-420, -700, x), sstep(720, 1000, Math.abs(z)));
      if (far > 0) c.lerp(hill, far * (0.6 + 0.4 * fbm(x / 60, z / 60, 8, 2)));
      if (Math.abs(x - roadX(z)) < 4) c.lerp(road, 0.8);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [size, seg, center[0], center[1]]);
  const mat = useMemo(() => {
    const t = grain(11, 6).clone();
    t.needsUpdate = true;
    t.repeat.set(size / 9, size / 9);
    return new THREE.MeshStandardMaterial({ vertexColors: true, map: t, roughness: 0.97 });
  }, [size]);
  return <mesh geometry={geo} material={mat} receiveShadow />;
};

// ---------------- pháo & quỹ đạo ----------------
const PSI = Math.PI / 2; // thân xe quay: mũi → -Z
const ELEV_FIRE = 0.85;
const toWorld = (p: V3): V3 => [p[2], p[1], -p[0]]; // xoay quanh Y góc PSI
const MUZ = toWorld(muzzleOf(ELEV_FIRE, -PSI));
const IMPACT: V3 = [T_X, hT, T_Z];
const APEX = (Math.tan(ELEV_FIRE) * (IMPACT[0] - MUZ[0]) - (IMPACT[1] - MUZ[1])) / 4;
const FLY = CUE.s01_lands - CUE.s01_fire;
const TRAJ = ballisticPoints(MUZ, IMPACT, APEX, 260);
const TRAJ_FAR = TRAJ.slice(25);
const shellP = (t: number) => Math.max(0, Math.min(1, (t - CUE.s01_fire) / FLY));
const shellPos = (t: number) => ballistic(shellP(t), MUZ, IMPACT, APEX);
const shellDir = (t: number): V3 => {
  const p = shellP(t);
  const v = new THREE.Vector3(IMPACT[0] - MUZ[0], IMPACT[1] - MUZ[1] + APEX * 4 * (1 - 2 * p), IMPACT[2] - MUZ[2]).normalize();
  return [v.x, v.y, v.z];
};

const DRIVE0 = 13.8;
const drive = (t: number) => {
  const s = t - DRIVE0, v = 8.5, a = 1.6;
  if (s <= 0) return 0;
  return s < a ? (v * s * s) / (2 * a) : v * (s - a / 2);
};
const elevAt = (t: number) => {
  if (t < 12) return lerp(0.1, ELEV_FIRE, prog(t, 0.15, 3.2, Easing.inOut(Easing.cubic)));
  return lerp(ELEV_FIRE, 0.04, prog(t, 12.2, 13.6));
};
const yawAt = (t: number) => lerp(-PSI, 0, prog(t, 12.0, 13.7));
const recoilAt = (t: number) => {
  const d = t - CUE.s01_fire;
  if (d < 0) return 0;
  if (d < 0.06) return d / 0.06;
  return 1 - Easing.inOut(Easing.cubic)(Math.min(1, (d - 0.06) / 1.0));
};

// ---------------- vật liệu ----------------
const strawMat = plain('#c8a65c', 0.95);
const strawEnd = plain('#a8853f', 1);
const bagMat = paint({ color: '#9b8a5e', camo: [], wear: 0, dirt: 0.5, roughness: 0.95, metalness: 0, seed: 41, repeat: 2 });
const logMat = plain('#5b4632', 0.95);
const netMat = new THREE.MeshStandardMaterial({ color: '#5a6236', roughness: 1, side: THREE.DoubleSide });
const crateMat = paint({ color: '#5f6b3a', camo: [], wear: 0.2, dirt: 0.3, metalness: 0.1, seed: 43, repeat: 1 });
const markMat = new THREE.MeshStandardMaterial({ color: '#4a3a28', roughness: 1, transparent: true, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
const bareMat = new THREE.MeshStandardMaterial({ color: '#6e5a3c', roughness: 1, transparent: true, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -1 });
const craterMat = new THREE.MeshStandardMaterial({ color: '#2d2620', roughness: 1, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });

// ---------------- rạ (gốc lúa) quanh vị trí pháo ----------------
const Stubble: React.FC = () => {
  const mesh = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.035, 0.17, 4).translate(0, 0.07, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
    const mats: THREE.Matrix4[] = [], cols: THREE.Color[] = [];
    const ca = new THREE.Color('#bf9f5a'), cb = new THREE.Color('#87703c'), cc = new THREE.Color('#d2b46e');
    const r = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    let i = 0;
    for (let x = -26; x <= 26; x += 0.5) for (let z = -60; z <= 22; z += 0.38) {
      i++;
      const px = x + (r(i, 1) - 0.5) * 0.18, pz = z + (r(i, 2) - 0.5) * 0.2;
      if (Math.abs(px) < 1.75 && pz > -3.3 && pz < 3.3) continue; // dưới thân xe
      if (pz < -3 && (Math.abs(px - 1.3) < 0.35 || Math.abs(px + 1.3) < 0.35)) continue; // lối xích
      if (r(i, 3) < 0.12) continue;
      const s = 0.6 + r(i, 4) * 0.6;
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(px, H(px, pz), pz), new THREE.Quaternion().setFromEuler(new THREE.Euler((r(i, 5) - 0.5) * 0.5, 0, (r(i, 6) - 0.5) * 0.5)), new THREE.Vector3(s, s * (0.7 + r(i, 7) * 0.6), s)));
      const n = fbm(px / 9, pz / 9, 3, 2);
      cols.push(ca.clone().lerp(cb, Math.min(1, Math.max(0, (n - 0.35) * 2))).lerp(cc, r(i, 8) * 0.3));
    }
    const m = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((mm, k) => { m.setMatrixAt(k, mm); m.setColorAt(k, cols[k]); });
    m.instanceMatrix.needsUpdate = true;
    m.receiveShadow = true;
    m.castShadow = true;
    return m;
  }, []);
  return <primitive object={mesh} />;
};

const BALES: [number, number, number][] = [[-14, -18, 0.3], [-11, -21, 1.2], [18, -9, 2.1], [22, -30, 0.7], [-20, 12, 1.9], [9, 16, 0.4], [40, -60, 1.1], [-45, -40, 2.6], [60, 20, 0.2], [110, -90, 1.4], [150, 60, 0.9], [-80, 70, 2.2], [260, -150, 0.5], [420, 90, 1.6], [600, -60, 2.9], [560, 140, 0.4]];
const HayBale: React.FC<{ p: [number, number, number] }> = ({ p }) => (
  <group position={[p[0], H(p[0], p[1]) + 0.72, p[1]]} rotation={[Math.PI / 2, 0, p[2]]}>
    <mesh material={strawMat} castShadow receiveShadow><cylinderGeometry args={[0.75, 0.75, 1.2, 20]} /></mesh>
    <mesh material={strawEnd} position={[0, 0.605, 0]}><cylinderGeometry args={[0.7, 0.7, 0.02, 20]} /></mesh>
    <mesh material={strawEnd} position={[0, -0.605, 0]}><cylinderGeometry args={[0.7, 0.7, 0.02, 20]} /></mesh>
  </group>
);

// vệt xích: hai dải bám đất, hiện dần theo quãng xe chạy
const TrackMarks: React.FC<{ d: number }> = ({ d }) => {
  const geo = useMemo(() => {
    const pos: number[] = [];
    for (let z = 3; z > -170; z -= 1) {
      for (const cx of [-1.3, 1.3]) {
        const a = cx - 0.27, b = cx + 0.27, z1 = z - 1;
        const y0 = H(cx, z) + 0.03, y1 = H(cx, z1) + 0.03;
        pos.push(a, y0, z, b, y0, z, a, y1, z1, b, y0, z, b, y1, z1, a, y1, z1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  geo.setDrawRange(0, Math.min(173, Math.ceil(5.8 + d)) * 12);
  return <mesh geometry={geo} material={markMat} receiveShadow />;
};

// ---------------- vị trí địch: hố cát + hầm gỗ + lưới ngụy trang ----------------
const Bag: React.FC<{ p: V3; ry: number; rz?: number }> = ({ p, ry, rz = 0 }) => (
  <mesh geometry={rbox(0.6, 0.26, 0.36, 0.11)} material={bagMat} position={p} rotation={[0, ry, rz]} castShadow receiveShadow />
);
const netGeo = (() => {
  const g = new THREE.PlaneGeometry(7, 6, 14, 12);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const tent = Math.max(0, 1 - Math.max(Math.abs(x) / 3.5, Math.abs(z) / 3));
    p.setY(i, 0.3 + 1.6 * Math.pow(tent, 0.6) + (fbm(x * 0.8, z * 0.8, 6, 2) - 0.5) * 0.3);
  }
  g.computeVertexNormals();
  return g;
})();
const Emplacement: React.FC<{ hit: boolean }> = ({ hit }) => {
  const bags: React.ReactNode[] = [];
  if (!hit) {
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + layer * 0.17;
      if (Math.cos(a) > 0.82) continue; // lối ra phía đông
      bags.push(<Bag key={`${layer}-${i}`} p={[Math.cos(a) * 2.2, 0.13 + layer * 0.25, Math.sin(a) * 2.2]} ry={-a + Math.PI / 2} />);
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const a = i * 2.3, d = 3.5 + (i % 3) * 1.6;
      bags.push(<Bag key={`h${i}`} p={[Math.cos(a) * d, 0.1, Math.sin(a) * d]} ry={a * 1.7} rz={(i % 2) * 0.4} />);
    }
  }
  return (
    <group position={[T_X + 2, hT, T_Z + 3]}>
      {bags}
      {!hit && (
        <>
          {/* súng máy trên chân */}
          <group position={[-2.0, 0.85, 0]} rotation={[0, Math.PI, 0.05]}>
            <mesh material={plain('#2b2d27', 0.6, 0.5)} position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 1.3, 8]} /></mesh>
            <mesh geometry={rbox(0.5, 0.16, 0.14, 0.02)} material={plain('#2b2d27', 0.6, 0.5)} />
          </group>
          {/* lưới ngụy trang */}
          <mesh geometry={netGeo} material={netMat} position={[0.4, 0, 0]} castShadow receiveShadow />
          {/* hầm nắp gỗ */}
          <group position={[4.2, 0, -3.4]}>
            {[-1, 1].map((s) => <mesh key={s} geometry={rbox(3.2, 0.7, 0.5, 0.15)} material={bagMat} position={[0, 0.35, s * 1.2]} castShadow receiveShadow />)}
            {Array.from({ length: 9 }, (_, i) => (
              <mesh key={i} material={logMat} position={[-1.4 + i * 0.34, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.16, 3.2, 8]} /></mesh>
            ))}
          </group>
          {/* hòm đạn */}
          <mesh geometry={rbox(0.8, 0.4, 0.45, 0.04)} material={crateMat} position={[0.8, 0.2, 0.9]} rotation={[0, 0.4, 0]} castShadow />
          <mesh geometry={rbox(0.8, 0.4, 0.45, 0.04)} material={crateMat} position={[1.0, 0.6, 0.8]} rotation={[0, 0.2, 0]} castShadow />
        </>
      )}
      {hit && <mesh material={craterMat} rotation={[-Math.PI / 2, 0, 0]} position={[-2, 0.05, -2]}><circleGeometry args={[4.2, 28]} /></mesh>}
    </group>
  );
};

// ---------------- khói (sprite tất định) ----------------
const Puff: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot: number }> = ({ pos, size, color, opacity, rot }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }), []);
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  if (opacity <= 0.004) return null;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};
const r1 = (i: number, k: number, s: number) => { const v = Math.sin(i * 12.9898 + k * 78.233 + s * 37.719) * 43758.5453; return v - Math.floor(v); };
const Smoke: React.FC<{ t: number; from: number; to: number; at: V3; rate: number; life: number; size: number; grow: number; rise: number; drift: V3; spread: number; color: string; fade: string; opacity: number; seed: number }> = (o) => {
  const items: React.ReactNode[] = [];
  const a0 = Math.max(o.from, o.t - o.life), a1 = Math.min(o.to, o.t);
  for (let k = Math.ceil(a0 * o.rate); k <= Math.floor(a1 * o.rate); k++) {
    const age = o.t - k / o.rate;
    if (age < 0) continue;
    const q = age / o.life;
    const c = new THREE.Color(o.color).lerp(new THREE.Color(o.fade), Math.min(1, q * 1.4));
    const rise = o.rise * age * (1 - 0.35 * q);
    items.push(
      <Puff key={k} pos={[o.at[0] + (r1(k, 1, o.seed) - 0.5) * o.spread + o.drift[0] * age, o.at[1] + rise + o.drift[1] * age, o.at[2] + (r1(k, 2, o.seed) - 0.5) * o.spread + o.drift[2] * age]}
        size={o.size * (0.7 + 0.5 * r1(k, 3, o.seed)) * (1 + o.grow * age)} color={`#${c.getHexString()}`} opacity={o.opacity * Math.min(1, age / 0.4) * (1 - q) ** 1.3} rot={k * 1.3} />,
    );
  }
  return <>{items}</>;
};

// đạn bay: phóng to cho thấy rõ, chấm lửa đuôi
const FlyingShell: React.FC<{ pos: V3; dir: V3; scale: number; glow: number }> = ({ pos, dir, scale, glow }) => {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(...dir));
  return (
    <group position={pos} quaternion={q}>
      <group position={[-0.4 * scale, 0, 0]}><Shell155 scale={scale} /></group>
      {glow > 0 && (
        <mesh position={[-0.42 * scale, 0, 0]} scale={[0.14 * scale * glow * 1.6, 0.09 * scale * glow, 0.09 * scale * glow]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshBasicMaterial color="#ffc46b" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// ---------------- cảnh ----------------
const SKY: [string, string, string] = ['#4f7fb5', '#f0c890', '#d8b48a'];
const SUN: V3 = [-60, 22, 30];
const avoidGun = (x: number, z: number) => Math.abs(x) < 14 && z > -175 && z < 14;
const avoidRoad = (x: number, z: number) => Math.abs(x - roadX(z)) < 5;
const avoidTarget = (x: number, z: number) => Math.hypot(x - T_X, z - T_Z) < 12;

const T_B = CUE.s01_fire + 0.62;     // 4.32 cắt sang bám đạn
const T_C1 = CUE.s01_cannotSee;      // 11.08 nhìn từ chỗ pháo: mục tiêu khuất sau bờ cây
const T_C2 = 13.6;                   // tại vị trí địch
const T_D = CUE.s01_lands + 1.22;    // 17.36 về chỗ pháo: đã đi
const T_E = CUE.s01_strange;         // 20.46 crane lên cao

const S01: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const shot = t < T_B ? 'A' : t < T_C1 ? 'B' : t < T_C2 ? 'C1' : t < T_D ? 'C2' : t < T_E ? 'D' : 'E';

  const d = drive(t);
  const elev = elevAt(t), yaw = yawAt(t), recoil = recoilAt(t);
  const fd = t - CUE.s01_fire;
  const rock = fd > 0 ? 0.03 * Math.exp(-fd * 3) * Math.sin(fd * 14) : 0;

  const S = shellPos(t), V = shellDir(t);
  const flying = t >= CUE.s01_fire + 0.05 && t < CUE.s01_lands;

  // ---------- camera ----------
  let pos: V3 = [0, 0, 0], look: V3 = [0, 0, 0], fov = 40;
  let fog: [number, number] = [150, 700], shC: V3 = [0, 1, 0], shA = 16;
  let shellScale = 5, trailW = 0.3, trailOp = 0.75;
  const [hx, hy] = handheld(t, 1, 's01');
  if (shot === 'A') {
    const p = prog(t, 0, 3.6, Easing.inOut(Easing.sin));
    pos = [lerp(-8.5, -6.2, p), lerp(0.9, 1.25, p), lerp(7.5, -5.5, p)];
    look = [lerp(0.5, 3.0, p), lerp(1.7, 4.6, p), lerp(1.5, 0.2, p)];
    fov = 42;
    const k = fd > 0 ? Math.exp(-fd * 6) * 0.18 : 0;
    pos = [pos[0] + hx * 0.03 + Math.sin(fd * 60) * k, pos[1] + hy * 0.03 + Math.cos(fd * 47) * k, pos[2]];
    shC = [0, 1, 0]; shA = 14;
  } else if (shot === 'B') {
    const f = new THREE.Vector3(...V), side = new THREE.Vector3(0, 0, 1);
    const k = prog(t, 6.6, 10.2, Easing.inOut(Easing.cubic));
    // B1: bên cạnh, hơi phía trước, nhìn ngược về mặt đất · B2: phía sau-trên, nhìn tới cánh đồng phía trước
    const c1 = new THREE.Vector3(...S).addScaledVector(f, 5).addScaledVector(side, 9).add(new THREE.Vector3(0, -1.5, 0));
    const l1 = new THREE.Vector3(...S).addScaledVector(f, -1.5).add(new THREE.Vector3(0, -2.5, 0));
    const c2 = new THREE.Vector3(...S).addScaledVector(f, -38).addScaledVector(side, 26).add(new THREE.Vector3(0, 16, 0));
    const l2 = new THREE.Vector3(...S).addScaledVector(f, 40).add(new THREE.Vector3(0, -45, 0));
    const c = c1.lerp(c2, k), l = l1.lerp(l2, k);
    pos = [c.x + hx * 0.15, c.y + hy * 0.15, c.z];
    look = [l.x, l.y, l.z];
    fov = lerp(48, 50, k);
    fog = [lerp(200, 300, k), lerp(1300, 1800, k)];
    shellScale = lerp(4, 9, k);
    trailW = lerp(0.12, 0.45, k);
    shC = [S[0] + 40, 0, 0]; shA = 160;
  } else if (shot === 'C1') {
    const p = prog(t, T_C1, T_C2, Easing.linear);
    pos = [lerp(-9, -9.5, p), lerp(3.4, 3.6, p), lerp(6.5, 7.5, p)];
    look = [lerp(420, 440, p), lerp(95, 85, p), lerp(-4, -2, p)];
    fov = 50;
    fog = [260, 1500];
    shellScale = 22; trailW = 1.1; trailOp = 0.85;
    shC = [0, 1, 0]; shA = 18;
  } else if (shot === 'C2') {
    const p = prog(t, T_C2, T_D, Easing.inOut(Easing.sin));
    pos = [lerp(T_X + 24, T_X + 17, p), hT + lerp(2.4, 2.0, p), lerp(T_Z + 22, T_Z + 16, p)];
    look = [T_X + 1, hT + lerp(2.6, 3.4, p), T_Z + 2];
    fov = 44;
    fog = [150, 900];
    shellScale = 6; trailW = 0.35; trailOp = 0.55;
    const k = t > CUE.s01_lands ? Math.exp(-(t - CUE.s01_lands) * 3) * 0.5 : 0;
    const ft = t - CUE.s01_lands;
    pos = [pos[0] + hx * 0.04 + Math.sin(ft * 55) * k, pos[1] + hy * 0.04 + Math.cos(ft * 43) * k, pos[2]];
    shC = [T_X, hT, T_Z]; shA = 22;
  } else if (shot === 'D') {
    const p = prog(t, T_D, T_E, Easing.inOut(Easing.sin));
    pos = [lerp(4.5, 3.6, p), lerp(1.3, 1.6, p), lerp(9.5, 6.5, p)];
    look = [lerp(-0.5, 0, p), lerp(1.8, 2.2, p), -d * 0.8 - 8];
    fov = 34;
    fog = [150, 750];
    shC = [0, 1, -25]; shA = 40;
  } else {
    const pv = prog(t, T_E, 24.2, Easing.inOut(Easing.cubic));
    const ph = prog(t, T_E + 0.4, 25.0, Easing.inOut(Easing.cubic));
    const drift = prog(t, 24.0, 26.2, Easing.linear);
    pos = [lerp(3.6, 385, ph), lerp(1.6, 640 + drift * 25, pv), lerp(6.5, 560, ph)];
    look = [lerp(0, 385, ph), lerp(2.2, 0, ph), lerp(-30, -45, ph)];
    fov = lerp(42, 34, ph);
    fog = [lerp(150, 700, pv), lerp(750, 2600, pv)];
    shC = [lerp(0, 385, ph), 0, -30]; shA = lerp(40, 520, ph);
    trailW = 1.8; trailOp = 0.55 * prog(t, CUE.s01_samePic - 0.6, CUE.s01_samePic + 0.8);
  }

  const showNear = shot === 'A' || shot === 'C1' || shot === 'D' || (shot === 'E' && t < T_E + 1.2) || (shot === 'B' && t < 6.5);

  return (
    <>
      <Stage sky={SKY} sun={SUN} sunColor="#ffd49a" sunIntensity={3.0} exposure={1.05} fog={fog} shadowArea={shA} shadowCenter={shC}
        env={0.3} ambient={0.22} post={{ bloom: 0.55, bloomThreshold: 0.85, vignette: 0.5 }}>
        <Cam pos={pos} look={look} fov={fov} />
        <FieldTerrain size={2800} seg={460} center={[400, -100]} />
        {showNear && <Stubble />}
        {BALES.map((b, i) => <HayBale key={i} p={b} />)}

        {/* bờ cây & rừng */}
        <Scatter tint="#d6b77a" kind="broadleaf" count={260} area={[328, -800, 342, 800]} h={H} seed={11} scale={[1.5, 2.3]} avoid={avoidRoad} />
        <Scatter tint="#d6b77a" kind="broadleaf" count={320} area={[713, -800, 731, 800]} h={H} seed={12} scale={[1.7, 2.7]} avoid={avoidTarget} />
        <Scatter tint="#d6b77a" kind="pine" count={120} area={[716, -800, 728, 800]} h={H} seed={13} scale={[1.8, 2.6]} avoid={avoidTarget} />
        <Scatter tint="#d6b77a" kind="bush" count={240} area={[-300, -334, 700, -326]} h={H} seed={14} scale={[1.6, 2.6]} avoid={avoidGun} />
        <Scatter tint="#d6b77a" kind="bush" count={60} area={[-320, 226, 320, 234]} h={H} seed={15} scale={[1.4, 2.2]} avoid={avoidRoad} />
        <Scatter tint="#d6b77a" kind="broadleaf" count={40} area={[-48, -500, -20, 400]} h={H} seed={16} scale={[1.3, 2.0]} avoid={avoidRoad} />
        <Scatter tint="#d6b77a" kind="pine" count={420} area={[980, -1300, 1750, 1200]} h={H} seed={17} scale={[2.0, 3.0]} />
        <Scatter tint="#d6b77a" kind="broadleaf" count={360} area={[-950, -1300, -330, 1200]} h={H} seed={18} scale={[1.8, 2.6]} />
        <Scatter tint="#d6b77a" kind="bush" count={50} area={[-70, -160, 70, 60]} h={H} seed={19} scale={[0.8, 1.4]} avoid={(x, z) => avoidGun(x, z) || avoidRoad(x, z)} />
        <Scatter tint="#d6b77a" kind="bush" count={30} area={[740, -40, 820, 60]} h={H} seed={20} scale={[1.0, 1.8]} avoid={avoidTarget} />

        {/* pháo */}
        <mesh material={bareMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><planeGeometry args={[3.6, 6.8]} /></mesh>
        <TrackMarks d={d} />
        <group position={[0, 0, -d]} rotation={[0, PSI, rock]}>
          <SPH elev={elev} yaw={yaw} recoil={recoil} travel={d} hatch={t > 12 ? 1 : 0} />
        </group>
        <MuzzleBlast t={t} at={CUE.s01_fire} pos={MUZ} dir={[Math.cos(ELEV_FIRE), Math.sin(ELEV_FIRE), 0]} size={2.4} />
        <Smoke t={t} from={CUE.s01_fire} to={CUE.s01_fire + 0.5} at={[MUZ[0] - 1, 1.2, MUZ[2]]} rate={24} life={6} size={3.2} grow={0.9} rise={0.25} drift={[-0.3, 0, 1.2]} spread={9} color="#c9bda8" fade="#d8cbb4" opacity={0.6} seed={3} />
        <Smoke t={t} from={CUE.s01_fire} to={CUE.s01_fire + 1.2} at={[MUZ[0] + 2, MUZ[1], MUZ[2]]} rate={8} life={11} size={3.5} grow={0.5} rise={0.6} drift={[0.2, 0, 1.0]} spread={5} color="#cfc4b0" fade="#e2d2b4" opacity={0.24} seed={5} />
        <DustTrail t={t} from={DRIVE0 + 0.3} to={26.2} path={(tt) => [0, 0, -drive(tt) + 3.2]} rate={5} size={1.7} life={4} color="#c8b089" />

        {/* đạn */}
        {flying && shot !== 'A' && <FlyingShell pos={S} dir={V} scale={shellScale} glow={shot === 'C1' ? 1.5 : 1} />}
        {(flying && shot !== 'A') && <Trail points={shot === 'C1' ? TRAJ_FAR : TRAJ} upto={shot === 'C1' ? (shellP(t) * 259 - 25) / 234 : shellP(t)} width={trailW} opacity={trailOp} color="#ffa04a" />}
        {shot === 'E' && trailOp > 0.01 && <Trail points={TRAJ} upto={1} width={trailW} opacity={trailOp} color="#ff9a3c" />}

        {/* mục tiêu */}
        <Emplacement hit={t >= CUE.s01_lands + 0.05} />
        <Explosion t={t} at={CUE.s01_lands} pos={IMPACT} size={5.5} smokeLife={10.5} seed={7} />
        <Smoke t={t} from={CUE.s01_lands + 0.3} to={26.2} at={[IMPACT[0], IMPACT[1] + 3, IMPACT[2]]} rate={5} life={9.5} size={12} grow={0.7} rise={7.5} drift={[0.6, 0, 2.4]} spread={8} color="#3f3832" fade="#7e766b" opacity={0.88} seed={9} />
      </Stage>
      <Label t={t} text="800 m/s" x={1380} y={560} from={CUE.s01_800} until={CUE.s01_climb - 0.2} />
    </>
  );
};

export default S01;
