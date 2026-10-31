// Tàu sân bay hạm đội Hải quân Đế quốc Nhật (IJN Kido Butai — kiểu Kaga / Akagi tại Midway 06/1942)
// Hệ trục chuẩn 1:1 (1 đơn vị = 1 mét): Mũi +X, Đỉnh +Y, Mạn phải (Starboard) +Z, Mực nước y = 0.
// Dài 250.0 m (x: -125..+125), rộng sàn đáp 31.0 m (z: -15.5..+15.5), mặt sàn gỗ tếch y = +17.5 m, đáy tàu y = -8.5 m.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrudeTop, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT } from '../design/palette';

export type IJNCarrierProps = {
  /** Mức độ trúng bom bổ nhào ở Midway (0..1, mặc định 0 = nguyên vẹn) */
  damage?: number;
  seed?: number;
};

/** Bán rộng thân tàu tại mực nước và boong chính theo toạ độ dọc x (-123..+124 m) */
function hullBeamAt(x: number, yNorm: number): number {
  const len = 247;
  const u = (x + 122.5) / len;
  if (u <= 0 || u >= 1) return 0.05;

  let wWater = 14.8;
  if (x > 42) {
    const t = Math.min(1, (x - 42) / 76);
    wWater = 14.8 * Math.pow(Math.cos(t * Math.PI * 0.5), 0.78);
  } else if (x < -48) {
    const t = Math.min(1, (-48 - x) / 74.5);
    wWater = 14.8 * Math.pow(Math.cos(t * Math.PI * 0.5), 0.65);
  }

  const bowFlare = x > 55 ? Math.pow((x - 55) / 69, 1.5) * Math.max(0, yNorm - 0.42) * 7.8 : 0;
  const sternFlare = x < -75 ? Math.pow((-75 - x) / 48, 1.3) * Math.max(0, yNorm - 0.45) * 2.4 : 0;

  let verticalFactor = 1.0;
  if (yNorm < 0.14) {
    verticalFactor = 0.38 + 0.62 * Math.sin((yNorm / 0.14) * Math.PI * 0.5);
  } else if (yNorm < 0.55) {
    const bulge = Math.sin(((yNorm - 0.14) / 0.41) * Math.PI) * 0.06;
    verticalFactor = 1.0 + bulge;
  } else {
    const midTumble = x > -55 && x < 55 ? (yNorm - 0.55) * 0.11 : 0;
    verticalFactor = 1.0 - midTumble;
  }

  return Math.max(0.08, wWater * verticalFactor + bowFlare + sternFlare);
}

/** Dựng lưới vỏ tàu 3D liền khối có mũi clipper nghiêng loe & đuôi tuần dương (pháp tuyến hướng ra ngoài) */
function buildHullBand(y0: number, y1: number, stepsX = 38, stepsY = 6, capBottom = false, capTop = false): THREE.BufferGeometry {
  const Y_MIN = -8.5;
  const Y_MAX = 10.4;

  const bowXAtY = (y: number) => {
    if (y < -6.2) return 114.5 + ((y + 8.5) / 2.3) * 3.2;
    if (y < 0) return 117.7 - Math.sin((-y / 6.2) * Math.PI) * 1.4;
    return 117.7 + Math.pow(y / 10.8, 1.15) * 6.8;
  };
  const sternXAtY = (y: number) => {
    if (y < -2.5) return -117.5 + ((y + 8.5) / 6.0) * 1.5;
    return -116.0 - Math.min(1, (y + 2.5) / 9.5) * 6.8;
  };
  const mapY = (uX: number, vY: number) => {
    const yBase = y0 + (y1 - y0) * vY;
    if (yBase <= 0.6) return yBase;
    const bowLift = uX > 0.72 ? Math.pow((uX - 0.72) / 0.28, 1.8) * 1.25 * (yBase / Y_MAX) : 0;
    const sternDrop = uX < 0.18 ? Math.pow((0.18 - uX) / 0.18, 1.5) * 1.1 * (yBase / Y_MAX) : 0;
    return yBase + bowLift - sternDrop;
  };

  const ringPts: { side: number; vY: number }[] = [];
  if (capBottom) ringPts.push({ side: 0, vY: 0 });
  for (let j = 0; j <= stepsY; j++) ringPts.push({ side: 1, vY: j / stepsY });
  if (capTop) ringPts.push({ side: 0, vY: 1 });
  for (let j = stepsY; j >= 0; j--) ringPts.push({ side: -1, vY: j / stepsY });
  if (capBottom) ringPts.push({ side: 0, vY: 0 });

  const R = ringPts.length;
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= stepsX; i++) {
    const uX = i / stepsX;
    for (let r = 0; r < R; r++) {
      const { side, vY } = ringPts[r];
      const y = mapY(uX, vY);
      const xMin = sternXAtY(y);
      const xMax = bowXAtY(y);
      const x = xMin + (xMax - xMin) * uX;
      const yNorm = Math.max(0, Math.min(1, (y - Y_MIN) / (Y_MAX - Y_MIN)));

      const endTaper = Math.sin(Math.pow(uX, 0.85) * Math.PI);
      const rawHalfW = hullBeamAt(x, yNorm) * Math.min(1, endTaper * 3.2);
      const z = side === 0 ? 0 : side * (i === 0 || i === stepsX ? 0.02 : rawHalfW);

      pos.push(x, y, z);
      uvs.push(x * 0.08, (y + Math.abs(z) * 0.5) * 0.08);
    }
  }

  for (let i = 0; i < stepsX; i++) {
    for (let r = 0; r < R - 1; r++) {
      if (!capTop && r === stepsY) continue;
      const a = i * R + r;
      const b = (i + 1) * R + r;
      const c = (i + 1) * R + (r + 1);
      const d = i * R + (r + 1);
      idx.push(a, b, c, a, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const FUNNEL_SPINE: [number, number, number][] = [
  [6.6, 13.8, 12.0],
  [5.8, 13.7, 16.0],
  [4.1, 13.1, 19.3],
  [1.6, 11.6, 21.3],
  [-1.5, 9.2, 21.9],
  [-4.8, 6.4, 21.2],
];

/** Dựng ống khói lớn bên mạn phải (+Z) uốn cong chúc xuống mặt biển đặc trưng của Akagi / Kaga */
function buildDownwardFunnel(s0 = 0, s1 = 1, segS = 24, segR = 28, inflate = 0): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(FUNNEL_SPINE.map((p) => new THREE.Vector3(...p)));
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= segS; i++) {
    const s = s0 + (s1 - s0) * (i / segS);
    const center = curve.getPoint(s);
    const tang = curve.getTangent(s).normalize();
    const refX = new THREE.Vector3(1, 0, 0);
    const binorm = new THREE.Vector3().crossVectors(tang, refX).normalize();
    const norm = new THREE.Vector3().crossVectors(binorm, tang).normalize();

    const halfAlong = 5.0 - s * 1.05 + inflate;
    const halfAcross = 2.55 - s * 0.25 + inflate;

    for (let j = 0; j <= segR; j++) {
      const ang = (j / segR) * Math.PI * 2;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const px = Math.sign(ca) * Math.pow(Math.abs(ca), 0.78) * halfAlong;
      const py = Math.sign(sa) * Math.pow(Math.abs(sa), 0.85) * halfAcross;
      const v = center.clone().addScaledVector(norm, px).addScaledVector(binorm, py);
      pos.push(v.x, v.y, v.z);
      uvs.push(s * 2.2, (j / segR) * 2.0);
    }
  }

  const ringLen = segR + 1;
  for (let i = 0; i < segS; i++) {
    for (let j = 0; j < segR; j++) {
      const a = i * ringLen + j;
      const b = (i + 1) * ringLen + j;
      const c = (i + 1) * ringLen + (j + 1);
      const d = i * ringLen + (j + 1);
      idx.push(a, c, b, a, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Khung nền vuông trắng khoét lỗ tròn chính giữa (rHole) để ôm khít Hinomaru mà tuyệt đối không z-fighting */
function buildHollowSquareFrame(halfSide: number, rHole: number, height: number): THREE.BufferGeometry {
  const outer = new THREE.Shape([
    new THREE.Vector2(-halfSide, -halfSide),
    new THREE.Vector2(halfSide, -halfSide),
    new THREE.Vector2(halfSide, halfSide),
    new THREE.Vector2(-halfSide, halfSide),
  ]);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rHole, 0, Math.PI * 2, true);
  outer.holes.push(hole);

  const g = new THREE.ExtrudeGeometry(outer, { depth: height, bevelEnabled: false, curveSegments: 48 });
  g.rotateX(Math.PI / 2);
  g.translate(0, height, 0);
  g.computeVertexNormals();
  return g;
}

/** Biên dạng mặt bằng sàn đáp dài đúng 250.0 m (-125..+125), rộng đúng 31.0 m (-15.5..+15.5) */
const FLIGHT_DECK_PLAN: P2[] = [
  [-125.0, -8.8],
  [-112.0, -12.4],
  [-94.0, -14.6],
  [-72.0, -15.5],
  [66.0, -15.5],
  [86.0, -14.3],
  [106.0, -11.4],
  [125.0, -7.0],
  [125.0, 7.0],
  [106.0, 11.4],
  [86.0, 14.3],
  [66.0, 15.5],
  [-72.0, 15.5],
  [-94.0, 14.6],
  [-112.0, 12.4],
  [-125.0, 8.8],
];

function deckHalfWidthAt(x: number): number {
  if (x >= 66) {
    if (x <= 86) return 15.5 - ((x - 66) / 20) * 1.2;
    if (x <= 106) return 14.3 - ((x - 86) / 20) * 2.9;
    return 11.4 - ((Math.min(125, x) - 106) / 19) * 4.4;
  }
  if (x <= -72) {
    if (x >= -94) return 15.5 - ((-72 - x) / 22) * 0.9;
    if (x >= -112) return 14.6 - ((-94 - x) / 18) * 2.2;
    return 12.4 - ((-112 - Math.max(-125, x)) / 13) * 3.6;
  }
  return 15.5;
}

/** Khung giàn trụ thép chữ A + giằng chữ X đỡ phần sàn đáp nhô ra ở mũi và đuôi */
const DeckSupportTrestle: React.FC<{
  x: number;
  yBase: number;
  yTop: number;
  zFoot: number;
  zHead: number;
  mat: THREE.Material;
}> = ({ x, yBase, yTop, zFoot, zHead, mat }) => {
  const struts = useMemo(() => {
    const ym = (yBase + yTop) * 0.5;
    const zm = (zFoot + zHead) * 0.5;
    return {
      legP: pipe([[x - 1.2, yBase, -zFoot], [x, yTop, -zHead]], 0.36, 8),
      legPAft: pipe([[x + 1.2, yBase, -zFoot], [x, yTop, -zHead]], 0.36, 8),
      legS: pipe([[x - 1.2, yBase, zFoot], [x, yTop, zHead]], 0.36, 8),
      legSAft: pipe([[x + 1.2, yBase, zFoot], [x, yTop, zHead]], 0.36, 8),
      x1: pipe([[x, yBase + 0.4, -zFoot * 0.96], [x, yTop - 0.3, zHead * 0.92]], 0.22, 8),
      x2: pipe([[x, yBase + 0.4, zFoot * 0.96], [x, yTop - 0.3, -zHead * 0.92]], 0.22, 8),
      tieMid: pipe([[x, ym, -zm], [x, ym, zm]], 0.25, 8),
    };
  }, [x, yBase, yTop, zFoot, zHead]);

  return (
    <group>
      <mesh geometry={struts.legP} material={mat} castShadow />
      <mesh geometry={struts.legPAft} material={mat} castShadow />
      <mesh geometry={struts.legS} material={mat} castShadow />
      <mesh geometry={struts.legSAft} material={mat} castShadow />
      <mesh geometry={struts.x1} material={mat} castShadow />
      <mesh geometry={struts.x2} material={mat} castShadow />
      <mesh geometry={struts.tieMid} material={mat} castShadow />
      <mesh position={[x, yTop + 0.22, 0]} geometry={rbox(1.5, 0.7, zHead * 2.15, 0.08)} material={mat} castShadow />
    </group>
  );
};

/** Bệ pháo phòng không hạng nặng 12.7 cm/40 Type 89 nòng đôi hai bên mạn */
const Type89TwinMount: React.FC<{
  pos: [number, number, number];
  side: 1 | -1;
  hullMat: THREE.Material;
  gunMat: THREE.Material;
}> = ({ pos, side, hullMat, gunMat }) => {
  const barrelG = useMemo(() => lathe([[0.12, 0], [0.11, 2.2], [0.08, 4.9], [0.095, 5.1]], 14), []);
  const yaw = side > 0 ? -Math.PI * 0.38 : Math.PI * 0.38;
  return (
    <group position={pos}>
      <mesh position={[0, -1.65, -side * 0.9]} rotation={[side * 0.34, 0, 0]} material={hullMat} castShadow>
        <cylinderGeometry args={[2.3, 1.15, 3.3, 16]} />
      </mesh>
      <mesh position={[0, 0.35, 0]} material={hullMat} castShadow receiveShadow>
        <cylinderGeometry args={[2.55, 2.4, 1.05, 20]} />
      </mesh>
      <group position={[0, 0.95, 0]} rotation={[0, yaw, 0]}>
        <mesh position={[-0.2, 0.45, 0]} geometry={rbox(2.1, 1.15, 1.85, 0.18)} material={hullMat} castShadow />
        <group position={[0.55, 0.62, 0]} rotation={[0, 0, 0.46]}>
          <mesh position={[0, 0, -0.42]} geometry={barrelG} material={gunMat} castShadow />
          <mesh position={[0, 0, 0.42]} geometry={barrelG} material={gunMat} castShadow />
        </group>
      </group>
    </group>
  );
};

/** Ụ pháo phòng không tầm thấp 3 nòng 25 mm Type 96 dọc rìa sàn tàu */
const Type96TripleGallery: React.FC<{
  pos: [number, number, number];
  side: 1 | -1;
  hullMat: THREE.Material;
  gunMat: THREE.Material;
}> = ({ pos, side, hullMat, gunMat }) => (
  <group position={pos}>
    <mesh position={[0, -0.85, -side * 0.65]} rotation={[side * 0.38, 0, 0]} material={hullMat} castShadow>
      <cylinderGeometry args={[1.65, 0.75, 1.8, 12]} />
    </mesh>
    <mesh position={[0, 0.25, 0]} material={hullMat} castShadow>
      <cylinderGeometry args={[1.75, 1.65, 0.85, 16]} />
    </mesh>
    <group position={[0, 0.65, 0]} rotation={[0, side > 0 ? -Math.PI * 0.45 : Math.PI * 0.45, 0.52]}>
      <mesh geometry={rbox(0.85, 0.5, 0.75, 0.08)} material={gunMat} castShadow />
      {[-0.22, 0, 0.22].map((dz, k) => (
        <mesh key={k} position={[1.1, 0.12, dz]} rotation={[0, 0, -Math.PI / 2]} material={gunMat}>
          <cylinderGeometry args={[0.04, 0.05, 1.9, 8]} />
        </mesh>
      ))}
    </group>
  </group>
);

/** Hố bom bổ nhào toác sàn gỗ rực lửa hangar bên dưới (khi damage > 0 tại Midway) */
const BombCraterInferno: React.FC<{
  pos: [number, number, number];
  radius: number;
  intensity: number;
  seedOff: number;
}> = ({ pos, radius, intensity, seedOff }) => {
  const charMat = plain('#141312', 0.95, 0.05);
  const burntWoodMat = plain('#2a1d14', 0.9, 0.05);
  const bentSteelMat = plain('#2c3034', 0.65, 0.55);
  const outerFireMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff4808', toneMapped: false }), []);
  const midFireMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff9624', toneMapped: false }), []);
  const coreFireMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff1bd', toneMapped: false }), []);

  const shards = useMemo(() => {
    const count = 14;
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + ((seedOff * 17 + i * 7) % 5) * 0.08;
      const tilt = 0.45 + ((i * 13 + seedOff) % 7) * 0.11;
      const len = radius * (0.42 + ((i * 5) % 4) * 0.12);
      const isSteel = i % 3 === 0;
      return { a, tilt, len, isSteel };
    });
  }, [radius, seedOff]);

  const r = radius * (0.55 + 0.45 * intensity);
  return (
    <group position={pos}>
      <mesh position={[0, 0.09, 0]} material={charMat}>
        <cylinderGeometry args={[r * 1.48, r * 1.55, 0.14, 24]} />
      </mesh>
      <mesh position={[0, -0.5, 0]} material={charMat}>
        <cylinderGeometry args={[r * 0.96, r * 0.78, 1.35, 20]} />
      </mesh>
      <mesh position={[0, -0.1, 0]} material={outerFireMat}>
        <cylinderGeometry args={[r * 0.88, r * 0.72, 0.7, 20]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} scale={[1, 0.45 + intensity * 0.35, 1]} material={midFireMat}>
        <dodecahedronGeometry args={[r * 0.64, 1]} />
      </mesh>
      <mesh position={[0.12 * r, 0.32, -0.08 * r]} scale={[1, 0.55 + intensity * 0.3, 1]} material={coreFireMat}>
        <dodecahedronGeometry args={[r * 0.38, 1]} />
      </mesh>
      {shards.map((s, idx) => (
        <group key={idx} rotation={[0, -s.a, 0]}>
          <mesh
            position={[r * 0.86, 0.3 + Math.sin(s.tilt) * s.len * 0.4, 0]}
            rotation={[0, 0, s.tilt]}
            geometry={rbox(s.len, s.isSteel ? 0.24 : 0.14, s.isSteel ? 0.52 : 0.85, 0.03)}
            material={s.isSteel ? bentSteelMat : burntWoodMat}
            castShadow
          />
        </group>
      ))}
    </group>
  );
};

export const IJNCarrier: React.FC<IJNCarrierProps> = ({ damage = 0, seed = 42 }) => {
  const dmg = Math.max(0, Math.min(1, damage));

  // Sơn xám hải quân Kure Arsenal (matte lead-grey chuẩn IJN để đọc rõ khối dưới bóng sàn bay) & gỗ tếch ấm
  const mats = useMemo(() => {
    const hullGrey = paint({
      color: '#6b757b',
      camo: [PAINT.ijnGrey, '#78838a'],
      camoScale: 1.5,
      wear: 0.18 + dmg * 0.2,
      dirt: 0.14 + dmg * 0.22,
      roughness: 0.68,
      metalness: 0.14,
      repeat: 0.38,
      seed,
    });
    const hangarGrey = paint({
      color: '#677177',
      camo: [PAINT.ijnGrey, '#747f86'],
      camoScale: 1.6,
      wear: 0.16 + dmg * 0.22,
      dirt: 0.12 + dmg * 0.22,
      roughness: 0.7,
      metalness: 0.14,
      repeat: 0.38,
      seed: seed + 11,
    });
    const funnelGrey = paint({
      color: '#737d84',
      camo: ['#646e74', '#818c94'],
      camoScale: 1.8,
      wear: 0.22,
      dirt: 0.15,
      roughness: 0.66,
      metalness: 0.16,
      repeat: 0.42,
      seed: seed + 17,
    });
    const deckTeak = paint({
      color: PAINT.ijnDeckWood,
      camo: ['#8c6b45', '#b08c62'],
      camoScale: 3.2,
      wear: 0.14 + dmg * 0.2,
      dirt: 0.14 + dmg * 0.25,
      roughness: 0.78,
      metalness: 0.03,
      repeat: 0.45,
      seed: seed + 23,
    });
    return {
      hullGrey,
      hangarGrey,
      funnelGrey,
      deckTeak,
      antiFouling: plain(PAINT.antiFoulingRed, 0.76, 0.12),
      bootBlack: plain('#202428', 0.74, 0.16),
      steelStruct: plain('#4e565c', 0.58, 0.32),
      gunMetal: plain('#343a40', 0.48, 0.55),
      funnelBlack: plain('#1c1e22', 0.82, 0.18),
      sootInner: plain('#0b0c0e', 0.95, 0.05),
      stripeWhite: plain(PAINT.deckStripeWhite, 0.68, 0.03),
      hinomaruRed: plain(PAINT.hinomaruRed, 0.64, 0.05),
      canvasDodger: plain('#e7e1d2', 0.86, 0.02),
      bridgeGlass: plain(PAINT.cockpitGlass, 0.18, 0.75),
      brassProp: plain('#b69244', 0.36, 0.78),
      fireVent: new THREE.MeshBasicMaterial({ color: '#ff6a14', toneMapped: false }),
    };
  }, [dmg, seed]);

  const geos = useMemo(() => {
    const lowerHull = buildHullBand(-8.5, -0.35, 36, 5, true, false);
    const bootBand = buildHullBand(-0.35, 0.55, 36, 2, false, false);
    const upperHull = buildHullBand(0.55, 10.2, 38, 6, false, true);

    const hangarPlan: P2[] = [
      [-88.0, -11.6],
      [-72.0, -12.8],
      [62.0, -12.8],
      [83.0, -10.8],
      [83.0, 10.8],
      [62.0, 12.8],
      [-72.0, 12.8],
      [-88.0, 11.6],
    ];
    const hangarBox = extrudeTop(hangarPlan, 7.25, 0.14);

    // Kết cấu dầm thép dưới sàn bay (y=+16.85..+17.28) và mặt sàn gỗ tếch dày (y=+17.28..+17.50)
    const deckUnderSteel = extrudeTop(FLIGHT_DECK_PLAN, 0.43, 0.06);
    const deckWoodTop = extrudeTop(FLIGHT_DECK_PLAN, 0.22, 0.03);

    // Khung nền trắng rỗng ruột ôm sát vòng tròn Hinomaru Ø 15 m (không chồng mặt tam giác -> sạch 100% z-fighting!)
    const hinomaruWhiteFrame = buildHollowSquareFrame(8.9, 7.46, 0.12);

    // Ống khói lớn bên mạn phải (+Z) uốn cong hướng xuống mặt biển + các đai gân ôm chuẩn biên dạng cong
    const funnelBody = buildDownwardFunnel(0.0, 0.76, 22, 28, 0);
    const funnelCap = buildDownwardFunnel(0.75, 1.0, 10, 28, 0.02);
    const funnelRing1 = buildDownwardFunnel(0.22, 0.26, 3, 28, 0.18);
    const funnelRing2 = buildDownwardFunnel(0.46, 0.5, 3, 28, 0.18);
    const funnelRing3 = buildDownwardFunnel(0.72, 0.76, 3, 28, 0.18);

    const auxPipe = pipe(
      [
        [1.8, 13.5, 12.4],
        [0.8, 13.2, 18.0],
        [-1.4, 11.4, 20.1],
        [-4.4, 8.8, 20.4],
        [-6.8, 6.4, 19.8],
      ],
      0.62,
      20,
    );

    // Tháp đảo chỉ huy nhỏ gọn kiểu Nhật
    const islandBasePlan: P2[] = [
      [-8.5, -1.75],
      [5.8, -1.75],
      [8.2, -1.15],
      [9.0, 0.0],
      [8.2, 1.15],
      [5.8, 1.75],
      [-8.5, 1.75],
      [-9.3, 0.0],
    ];
    const islandTier1 = extrudeTop(islandBasePlan, 2.9, 0.08);
    const islandTier2Plan: P2[] = islandBasePlan.map(([x, z]) => [x * 0.78 + 0.5, z * 0.92]);
    const islandTier2 = extrudeTop(islandTier2Plan, 2.6, 0.08);
    const islandTier3Plan: P2[] = islandBasePlan.map(([x, z]) => [x * 0.54 + 0.8, z * 0.78]);
    const islandTier3 = extrudeTop(islandTier3Plan, 2.0, 0.06);

    const mastMain = pipe([[31.5, 23.0, 16.6], [30.8, 35.4, 16.6]], 0.26, 8);
    const mastLegP = pipe([[33.6, 23.0, 15.3], [30.9, 32.2, 16.5]], 0.17, 8);
    const mastLegS = pipe([[33.6, 23.0, 17.9], [30.9, 32.2, 16.7]], 0.17, 8);

    const chainP = pipe([[94, 10.6, -2.2], [104, 10.85, -3.1], [113.5, 11.1, -3.8]], 0.22, 12);
    const chainS = pipe([[94, 10.6, 2.2], [104, 10.85, 3.1], [113.5, 11.1, 3.8]], 0.22, 12);

    return {
      lowerHull,
      bootBand,
      upperHull,
      hangarBox,
      deckUnderSteel,
      deckWoodTop,
      hinomaruWhiteFrame,
      funnelBody,
      funnelCap,
      funnelRing1,
      funnelRing2,
      funnelRing3,
      auxPipe,
      islandTier1,
      islandTier2,
      islandTier3,
      mastMain,
      mastLegP,
      mastLegS,
      chainP,
      chainS,
    };
  }, []);

  const edgeStripeSegments = useMemo(() => {
    const xs = [-122, -112, -94, -72, 66, 86, 106, 123];
    const segs: { cx: number; cz: number; len: number; ang: number }[] = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const z0 = deckHalfWidthAt(x0) - 1.25;
      const z1 = deckHalfWidthAt(x1) - 1.25;
      const dx = x1 - x0;
      const dz = z1 - z0;
      segs.push({
        cx: (x0 + x1) * 0.5,
        cz: (z0 + z1) * 0.5,
        len: Math.hypot(dx, dz),
        ang: Math.atan2(dz, dx),
      });
    }
    return segs;
  }, []);

  return (
    <group>
      {/* ================= 1. THÂN TÀU DƯỚI NƯỚC (y = -8.5..0) & TRÊN MỰC NƯỚC ================= */}
      <mesh geometry={geos.lowerHull} material={mats.antiFouling} receiveShadow />
      <mesh geometry={geos.bootBand} material={mats.bootBlack} receiveShadow />
      <mesh geometry={geos.upperHull} material={mats.hullGrey} castShadow receiveShadow />

      {/* Vây giảm lắc, bánh lái đôi & 4 trục chân vịt ở đuôi dưới nước */}
      {([-1, 1] as const).map((side) => (
        <group key={`under-${side}`}>
          <mesh
            position={[-4, -6.2, side * 12.6]}
            rotation={[side * 0.58, 0, 0]}
            geometry={rbox(112, 0.28, 1.35, 0.05)}
            material={mats.antiFouling}
          />
          <mesh
            position={[-115.5, -4.6, side * 3.2]}
            geometry={rbox(5.4, 5.8, 0.65, 0.14)}
            material={mats.antiFouling}
          />
          {[
            { x: -102, z: side * 8.4 },
            { x: -110.5, z: side * 4.9 },
          ].map((p, k) => (
            <group key={k} position={[p.x, -5.4, p.z]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.steelStruct}>
                <cylinderGeometry args={[0.32, 0.36, 13, 10]} />
              </mesh>
              <mesh position={[-6.7, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.brassProp}>
                <coneGeometry args={[1.65, 0.85, 4]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Boong mũi hở (forecastle): xích neo, tời neo, mỏ neo mũi */}
      <mesh geometry={geos.chainP} material={mats.gunMetal} castShadow />
      <mesh geometry={geos.chainS} material={mats.gunMetal} castShadow />
      {[-3.2, 3.2].map((z, i) => (
        <mesh key={`cap-${i}`} position={[99.5, 11.15, z]} material={mats.steelStruct} castShadow>
          <cylinderGeometry args={[0.95, 1.15, 1.1, 14]} />
        </mesh>
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`anchor-${side}`}
          position={[115.2, 7.6, side * 4.35]}
          rotation={[side * 0.25, side * 0.35, -0.35]}
          geometry={rbox(2.4, 2.8, 0.55, 0.12)}
          material={mats.gunMetal}
          castShadow
        />
      ))}

      {/* Tháp pháo tuần dương 20 cm casemate thấp hai bên mạn đuôi */}
      {([-1, 1] as const).map((side) =>
        [-74, -89].map((xPos) => (
          <group key={`case-${side}-${xPos}`} position={[xPos, 6.8, side * 12.1]}>
            <mesh material={mats.hullGrey} castShadow>
              <cylinderGeometry args={[1.8, 1.9, 2.1, 14]} />
            </mesh>
            <mesh
              position={[-2.6, 0.2, side * 0.85]}
              rotation={[0, side * 0.26, Math.PI / 2]}
              material={mats.gunMetal}
              castShadow
            >
              <cylinderGeometry args={[0.16, 0.22, 5.4, 10]} />
            </mesh>
          </group>
        )),
      )}

      {/* ================= 2. NHÀ CHỨA MÁY BAY 2 TẦNG KHÉP KÍN & HÀNH LANG MẠN ================= */}
      <mesh position={[0, 9.6, 0]} geometry={geos.hangarBox} material={mats.hangarGrey} castShadow receiveShadow />

      {([-1, 1] as const).map((side) => (
        <group key={`hside-${side}`}>
          <mesh
            position={[-2, 13.1, side * 13.25]}
            geometry={rbox(148, 0.42, 1.1, 0.06)}
            material={mats.hullGrey}
            castShadow
          />
          <mesh
            position={[-4, 15.65, side * 13.15]}
            geometry={rbox(156, 0.38, 0.95, 0.06)}
            material={mats.steelStruct}
            castShadow
          />
          {[-62, -40, -18, 22, 44, 64].map((xv) => (
            <mesh
              key={xv}
              position={[xv, 11.6, side * 13.05]}
              geometry={rbox(7.5, 2.1, 0.9, 0.1)}
              material={mats.hullGrey}
              castShadow
            />
          ))}
          {[-58, -74].map((xb) => (
            <mesh
              key={xb}
              position={[xb, 11.1, side * 13.45]}
              geometry={rbox(10.5, 1.7, 2.5, 0.65)}
              material={mats.canvasDodger}
              castShadow
            />
          ))}
          {dmg > 0.18 &&
            [-42, 4, 46].map((xf, idx) =>
              dmg > idx * 0.28 ? (
                <mesh
                  key={`ventfire-${xf}`}
                  position={[xf, 13.8, side * 12.94]}
                  geometry={rbox(6.5 + dmg * 4, 2.2, 0.45, 0.08)}
                  material={mats.fireVent}
                />
              ) : null,
            )}
        </group>
      ))}

      {/* ================= 3. GIÀN TRỤ THÉP ĐỠ MŨI & ĐUÔI SÀN ĐÁP ================= */}
      <DeckSupportTrestle x={95} yBase={10.4} yTop={16.7} zFoot={7.6} zHead={11.8} mat={mats.steelStruct} />
      <DeckSupportTrestle x={111.5} yBase={10.8} yTop={16.7} zFoot={5.2} zHead={9.2} mat={mats.steelStruct} />
      <DeckSupportTrestle x={-97} yBase={9.1} yTop={16.7} zFoot={8.2} zHead={12.8} mat={mats.steelStruct} />
      <DeckSupportTrestle x={-113} yBase={8.8} yTop={16.7} zFoot={6.0} zHead={10.2} mat={mats.steelStruct} />

      {/* ================= 4. SÀN ĐÁP GỖ TẾCH (y = +17.50 m) & VÒNG TRÒN HINOMARU Ø 15 m ================= */}
      <mesh position={[0, 16.85, 0]} geometry={geos.deckUnderSteel} material={mats.steelStruct} castShadow receiveShadow />
      <mesh position={[0, 17.28, 0]} geometry={geos.deckWoodTop} material={mats.deckTeak} castShadow receiveShadow />

      {/* 3 thang nâng máy bay: dùng 4 thanh viền khung thép bao quanh gỗ sàn (không đè mặt phẳng -> không z-fighting) */}
      {[
        { x: 52, len: 12.2, wid: 13.4 },
        { x: 2, len: 13.0, wid: 12.0 },
        { x: -58, len: 12.6, wid: 11.6 },
      ].map((el, i) => (
        <group key={`elev-${i}`} position={[el.x, 17.55, 0]}>
          <mesh position={[el.len * 0.5, 0, 0]} geometry={rbox(0.36, 0.11, el.wid + 0.36, 0.02)} material={mats.steelStruct} />
          <mesh position={[-el.len * 0.5, 0, 0]} geometry={rbox(0.36, 0.11, el.wid + 0.36, 0.02)} material={mats.steelStruct} />
          <mesh position={[0, 0, el.wid * 0.5]} geometry={rbox(el.len, 0.11, 0.36, 0.02)} material={mats.steelStruct} />
          <mesh position={[0, 0, -el.wid * 0.5]} geometry={rbox(el.len, 0.11, 0.36, 0.02)} material={mats.steelStruct} />
        </group>
      ))}

      {/* Đường kẻ vạch trắng dọc hai biên sàn đáp & đường tâm đứt đoạn (nhô 0.11 m rõ nét ở mọi cự ly) */}
      {edgeStripeSegments.map((seg, i) => (
        <React.Fragment key={`edge-${i}`}>
          <mesh
            position={[seg.cx, 17.555, seg.cz]}
            rotation={[0, -seg.ang, 0]}
            geometry={rbox(seg.len, 0.11, 0.58, 0.01)}
            material={mats.stripeWhite}
          />
          <mesh
            position={[seg.cx, 17.555, -seg.cz]}
            rotation={[0, seg.ang, 0]}
            geometry={rbox(seg.len, 0.11, 0.58, 0.01)}
            material={mats.stripeWhite}
          />
        </React.Fragment>
      ))}
      {Array.from({ length: 17 }, (_, i) => -105 + i * 10.2).map((xc) => (
        <mesh
          key={`cl-${xc}`}
          position={[xc, 17.555, 0]}
          geometry={rbox(5.6, 0.11, 0.38, 0.01)}
          material={mats.stripeWhite}
        />
      ))}

      {/* Vạch căn hạ cánh trắng-đỏ phần đuôi, ký hiệu katakana & 8 dây cáp hãm đà */}
      <mesh position={[-108, 17.56, 0]} geometry={rbox(1.15, 0.12, 16.5, 0.01)} material={mats.stripeWhite} />
      <mesh position={[-111.5, 17.56, 0]} geometry={rbox(0.9, 0.12, 14.5, 0.01)} material={mats.hinomaruRed} />
      <mesh position={[-117.5, 17.56, 0]} geometry={rbox(0.9, 0.12, 8.2, 0.01)} material={mats.stripeWhite} />
      <mesh
        position={[-119.8, 17.56, 1.4]}
        rotation={[0, 0.35, 0]}
        geometry={rbox(4.6, 0.12, 0.9, 0.01)}
        material={mats.stripeWhite}
      />
      {Array.from({ length: 8 }, (_, i) => -92 + i * 9.5).map((xw) => (
        <mesh key={`wire-${xw}`} position={[xw, 17.61, 0]} geometry={rbox(0.16, 0.08, 24.5, 0.02)} material={mats.gunMetal} />
      ))}

      {/* VÒNG TRÒN MẶT TRỜI ĐỎ HINOMARU KHỔNG LỒ (ĐƯỜNG KÍNH 15.0 m TRÊN KHUNG NỀN TRẮNG TẠI x = +82 m) */}
      <group position={[82.0, 17.5, 0]}>
        {/* Khung vuông trắng khoét rỗng lòng tròn r=7.46 m -> tuyệt đối không chồng mặt với đĩa đỏ */}
        <mesh geometry={geos.hinomaruWhiteFrame} material={mats.stripeWhite} />
        {/* Đĩa Mặt trời đỏ Hinomaru đúng đường kính 15.0 m (bán kính 7.50 m) */}
        <mesh position={[0, 0.075, 0]} material={mats.hinomaruRed}>
          <cylinderGeometry args={[7.5, 7.5, 0.15, 64]} />
        </mesh>
      </group>

      {/* Dấu chữ T trắng báo hướng gió ở sát mũi sàn bay */}
      <mesh position={[116.5, 17.56, 0]} geometry={rbox(5.4, 0.12, 0.9, 0.01)} material={mats.stripeWhite} />
      <mesh position={[119.0, 17.56, 0]} geometry={rbox(0.95, 0.12, 5.2, 0.01)} material={mats.stripeWhite} />

      {/* ================= 5. ỐNG KHÓI LỚN MẠN PHẢI (+Z) UỐN CONG CHÚC XUỐNG MẶT BIỂN ================= */}
      <group>
        {/* Hộp cổ góp khói lò hơi nhô từ vách hangar mạn phải nối mượt vào gốc ống khói */}
        <mesh position={[6.2, 13.7, 14.2]} geometry={rbox(10.8, 5.2, 4.2, 0.45)} material={mats.funnelGrey} castShadow />
        {/* Thân ống khói cong xuống mặt biển + chụp miệng đen + 3 đai gân ôm chuẩn biên dạng cong */}
        <mesh geometry={geos.funnelBody} material={mats.funnelGrey} castShadow receiveShadow />
        <mesh geometry={geos.funnelCap} material={mats.funnelBlack} castShadow />
        <mesh geometry={geos.funnelRing1} material={mats.steelStruct} castShadow />
        <mesh geometry={geos.funnelRing2} material={mats.steelStruct} castShadow />
        <mesh geometry={geos.funnelRing3} material={mats.steelStruct} castShadow />
        <mesh geometry={geos.auxPipe} material={mats.steelStruct} castShadow />

        {/* Hốc miệng ống khói đen sâu chúc xuống mặt nước */}
        <mesh position={[-4.85, 6.32, 21.18]} rotation={[0.25, 0.08, 0.74]} material={mats.sootInner}>
          <cylinderGeometry args={[2.15, 2.15, 0.9, 24]} />
        </mesh>

        {/* Sàn kiểm tra trên lưng khuỷu ống khói & đôi chân chống thép đỡ dưới bụng ống khói */}
        <mesh position={[3.8, 15.65, 18.2]} geometry={rbox(9.2, 0.25, 4.2, 0.08)} material={mats.steelStruct} castShadow />
        <mesh
          position={[0.6, 9.4, 16.8]}
          rotation={[-0.76, 0, 0]}
          geometry={rbox(1.3, 8.0, 0.6, 0.08)}
          material={mats.steelStruct}
          castShadow
        />
        <mesh
          position={[4.4, 10.0, 16.2]}
          rotation={[-0.7, 0, 0]}
          geometry={rbox(1.2, 7.2, 0.6, 0.08)}
          material={mats.steelStruct}
          castShadow
        />
      </group>

      {/* ================= 6. THÁP ĐẢO CHỈ HUY NHỎ GỌN ĐẶC TRƯNG NHẬT BẢN (MẠN PHẢI +Z) ================= */}
      <group>
        <mesh
          position={[36.0, 14.2, 15.5]}
          rotation={[0.36, 0, 0]}
          geometry={rbox(18.0, 6.8, 4.5, 0.35)}
          material={mats.hullGrey}
          castShadow
        />
        <mesh position={[36.0, 17.45, 16.65]} geometry={geos.islandTier1} material={mats.hullGrey} castShadow receiveShadow />
        <mesh position={[35.5, 18.95, 14.86]} geometry={rbox(6.6, 1.55, 0.14, 0.03)} material={mats.bootBlack} />

        <mesh position={[36.0, 20.35, 16.65]} geometry={geos.islandTier2} material={mats.hullGrey} castShadow />
        <mesh position={[37.2, 22.0, 16.65]} geometry={rbox(10.0, 0.85, 3.35, 0.25)} material={mats.bridgeGlass} />
        {/* Cuộn đệm bạt trắng chống mảnh đạn (hammock mantlets) bọc quanh đài chỉ huy tàu sân bay Nhật */}
        <mesh position={[36.4, 20.8, 14.82]} geometry={rbox(12.6, 0.95, 0.52, 0.24)} material={mats.canvasDodger} castShadow />
        <mesh position={[36.4, 20.8, 18.48]} geometry={rbox(12.6, 0.95, 0.52, 0.24)} material={mats.canvasDodger} castShadow />
        <mesh position={[42.9, 20.8, 16.65]} geometry={rbox(0.58, 0.95, 3.3, 0.24)} material={mats.canvasDodger} castShadow />

        <mesh position={[36.0, 22.95, 16.65]} geometry={geos.islandTier3} material={mats.hullGrey} castShadow />
        <mesh position={[37.8, 25.4, 16.65]} material={mats.hullGrey} castShadow>
          <cylinderGeometry args={[1.2, 1.35, 1.25, 16]} />
        </mesh>
        <mesh position={[37.8, 26.15, 16.65]} geometry={rbox(1.15, 0.58, 3.2, 0.16)} material={mats.steelStruct} castShadow />
        <mesh position={[33.6, 25.35, 16.65]} material={mats.steelStruct} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 1.05, 14]} />
        </mesh>

        {/* Cột buồm 3 chân tripod, xà ngang tín hiệu và cờ Hải quân Đế quốc Nhật */}
        <mesh geometry={geos.mastMain} material={mats.steelStruct} castShadow />
        <mesh geometry={geos.mastLegP} material={mats.steelStruct} castShadow />
        <mesh geometry={geos.mastLegS} material={mats.steelStruct} castShadow />
        <mesh position={[31.1, 29.8, 16.6]} geometry={rbox(0.24, 0.24, 7.8, 0.06)} material={mats.steelStruct} />
        <mesh position={[30.9, 33.4, 16.6]} geometry={rbox(0.2, 0.2, 5.4, 0.05)} material={mats.steelStruct} />
        <group position={[29.3, 31.0, 16.6]}>
          <mesh geometry={rbox(2.5, 1.6, 0.07, 0.01)} material={mats.stripeWhite} />
          <mesh position={[0.25, 0, 0]} geometry={rbox(0.88, 0.88, 0.1, 0.4)} material={mats.hinomaruRed} />
        </group>
      </group>

      {/* ================= 7. BỆ PHÁO PHÒNG KHÔNG HAI BÊN MẠN & CỘT ĂNG-TEN GẬP NGANG ================= */}
      {[58, -36, -68].map((xp) => (
        <React.Fragment key={`t89-${xp}`}>
          <Type89TwinMount
            pos={[xp, 14.3, deckHalfWidthAt(xp) + 1.85]}
            side={1}
            hullMat={mats.hullGrey}
            gunMat={mats.gunMetal}
          />
          <Type89TwinMount
            pos={[xp, 14.3, -(deckHalfWidthAt(xp) + 1.85)]}
            side={-1}
            hullMat={mats.hullGrey}
            gunMat={mats.gunMetal}
          />
        </React.Fragment>
      ))}

      {[75, 18, -18, -50, -83].map((xp) => (
        <React.Fragment key={`t96-${xp}`}>
          <Type96TripleGallery
            pos={[xp, 15.85, deckHalfWidthAt(xp) + 1.35]}
            side={1}
            hullMat={mats.hullGrey}
            gunMat={mats.gunMetal}
          />
          <Type96TripleGallery
            pos={[xp, 15.85, -(deckHalfWidthAt(xp) + 1.35)]}
            side={-1}
            hullMat={mats.hullGrey}
            gunMat={mats.gunMetal}
          />
        </React.Fragment>
      ))}

      {[89, 46, -28, -76].map((xm) => {
        const zEdge = deckHalfWidthAt(xm) + 0.3;
        return (
          <React.Fragment key={`ant-${xm}`}>
            <mesh position={[xm, 16.95, zEdge + 3.8]} rotation={[Math.PI / 2 - 0.1, 0, 0]} material={mats.steelStruct}>
              <cylinderGeometry args={[0.08, 0.18, 7.8, 8]} />
            </mesh>
            <mesh position={[xm, 16.95, -(zEdge + 3.8)]} rotation={[-Math.PI / 2 + 0.1, 0, 0]} material={mats.steelStruct}>
              <cylinderGeometry args={[0.08, 0.18, 7.8, 8]} />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* ================= 8. HỐ BOM TOÁC SÀN GỖ RỰC LỬA HANGAR TẠI MIDWAY (damage > 0) ================= */}
      {dmg > 0.05 && <BombCraterInferno pos={[3.5, 17.52, 1.1]} radius={8.6} intensity={dmg} seedOff={seed + 1} />}
      {dmg > 0.2 && (
        <BombCraterInferno
          pos={[-45.0, 17.52, -1.9]}
          radius={9.4}
          intensity={Math.min(1, (dmg - 0.15) * 1.18)}
          seedOff={seed + 2}
        />
      )}
      {dmg > 0.42 && (
        <BombCraterInferno
          pos={[46.5, 17.52, -1.4]}
          radius={7.8}
          intensity={Math.min(1, (dmg - 0.35) * 1.5)}
          seedOff={seed + 3}
        />
      )}
    </group>
  );
};

export const preview = turntable(() => <IJNCarrier damage={0} />, { size: 252, center: [0, 14, 0] });

export default IJNCarrier;
