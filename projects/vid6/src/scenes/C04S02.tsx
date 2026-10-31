import React, { useMemo } from 'react';
import * as THREE from 'three';
import { lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { DustTrail } from '@skill/military/3d/fx';
import { extrude, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { fbm, paint, plain } from '@skill/military/3d/materials';
import { Track, Wheel } from '@skill/military/3d/parts';
import { CUE } from '../cues';
import { PAINT_PRESETS, PAL } from '../design/palette';
import { LOOK_DESERT_GLARE } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { PowerpackChassis3D } from '../parts/PowerpackChassis3D';

const smoothStep = (a: number, b: number, x: number) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// Khu thử nghiệm áp suất nền cát mềm ở hạ lưu lòng suối cạn
const ABRAMS_LANE_Z = 5.0; // Tâm dải xích phải (+Z) của M1A2Abrams chạy dọc z = 5.0 + 1.51 = 6.51 m
const SEDAN_POS_X = 44.65;
const SEDAN_POS_Z = 8.58; // Đặt song song bên cạnh dải xích T-158 với khoảng cát thoáng ~0.62 m
const SEDAN_YAW = -0.22; // Xoay nhẹ ~12.5° để thấy rõ cả đầu xe sedan gia đình lẫn mâm 5 chấu & lốp hẹp lún sâu!

// ---------- Địa hình bậc thềm lòng suối cạn sâu đúng 0.90 m (3 ft) + hố cát mềm lún bánh sedan tự nhiên ----------
const LEDGE_DROP_H = 0.9; // 3 feet = 0.914 m
const LEDGE_X0 = 5.38;
const LEDGE_X1 = 5.95;

const wadiAdd = (x: number, z: number) => {
  // 1. Bậc thềm đá 3 ft: từ x <= 5.38 cao +0.90 m rơi thẳng xuống lòng suối cạn y = 0.00 m tại x >= 5.95
  const stepDown = 1 - smoothStep(LEDGE_X0, LEDGE_X1, x);
  const baseStep = LEDGE_DROP_H * stepDown;

  // 2. Đụn cát mềm đùn tự nhiên ôm quanh bánh trước xe sedan đang bị sa lầy tại (SEDAN_POS_X, SEDAN_POS_Z)
  const cY = Math.cos(SEDAN_YAW);
  const sY = Math.sin(SEDAN_YAW);
  const fwX = SEDAN_POS_X + 1.32 * cY - 0.78 * sY;
  const fwZ = SEDAN_POS_Z - 1.32 * sY - 0.78 * cY;
  const dFront = Math.hypot(x - fwX, z - fwZ);
  const bermFront = 0.095 * Math.exp(-(((dFront - 0.37) / 0.21) ** 2)) - 0.06 * Math.exp(-((dFront / 0.24) ** 2));

  // 3. Hai bờ vách suối cạn & đồi cát sa mạc bao quanh hành lang thử nghiệm rộng thoáng (z trong [-5.0 .. +14.5] phẳng chuẩn)
  const bankLeft = smoothStep(-5.0, -17.0, z);
  const bankRight = smoothStep(14.5, 27.5, z);
  const bankMask = Math.max(bankLeft, bankRight);
  const dune = (fbm(x / 48 + 14, z / 48 + 21, 53, 3) - 0.32) * 8.5 + Math.sin(x * 0.05 + z * 0.04) * 1.8;

  return baseStep + bermFront + bankMask * Math.max(0.4, dune + 2.6);
};

const WADI_H = heightField({
  seed: 402,
  amp: 0.008,
  scale: 42,
  oct: 3,
  add: wadiAdd,
});

const avoidWadiCorridor = (x: number, z: number) => z > -5.5 && z < 15.0 && x > -28 && x < 72;

// ---------- Quỹ đạo tất định của xe cắt bổ hệ treo (lao qua bậc đá 3 ft chạm đất đúng 507.02s) ----------
type DropSample = {
  x: number;
  groupY: number;
  wheelDrop: number;
  hullPitch: number;
  travel: number;
};

const T2_MIN = 499.7;
const T2_MAX = 521.6;
const DT2 = 1 / 120;

const DROP_TABLE: DropSample[] = (() => {
  const n = Math.ceil((T2_MAX - T2_MIN) / DT2) + 1;
  const arr: DropSample[] = new Array(n);
  let x = -15.55;
  let travel = 0;

  for (let i = 0; i < n; i++) {
    const t = T2_MIN + i * DT2;
    const accel = smoothStep(505.15, 506.45, t);
    const slowAfter = smoothStep(507.25, 509.1, t);
    const stopInAct2 = 1 - smoothStep(509.2, 510.6, t);
    const v = lerp(3.1, 6.38, accel) * (1 - 0.65 * slowAfter) * stopInAct2;

    const tLaunch = 506.56;
    const tLand = CUE.c04_s02_drop; // 507.02s

    let baseGroundY = LEDGE_DROP_H;
    let wheelDrop = 0;
    let hullPitch = 0;

    if (t < tLaunch) {
      baseGroundY = LEDGE_DROP_H;
      const ripple = Math.sin(t * 8.6) * 0.3 + Math.sin(t * 14.2) * 0.16;
      wheelDrop = ripple * smoothStep(500.4, 501.2, t);
      hullPitch = 0.007 * Math.sin(t * 3.6);
    } else if (t < tLand) {
      const pAir = (t - tLaunch) / (tLand - tLaunch);
      baseGroundY = lerp(LEDGE_DROP_H, 0.0, pAir * pAir);
      wheelDrop = 1.15 * Math.sin(pAir * Math.PI);
      hullPitch = -0.072 * Math.sin(pAir * Math.PI * 0.85);
    } else {
      const dt = t - tLand;
      baseGroundY = 0.0;
      const env = Math.exp(-dt * 1.85);
      const springWave = -1.38 * env * Math.sin(Math.min(Math.PI * 2.6, dt * 5.2 + 0.25));
      wheelDrop = Math.max(-1.38, Math.min(0.82, springWave));
      hullPitch = -0.056 * env * Math.sin(dt * 4.9 + 0.25);
    }

    const dropM = Math.max(-0.14, Math.min(0.16, wheelDrop * 0.1));
    let groupY = baseGroundY + dropM;

    if (t >= tLaunch && t < tLand) {
      const rearWheelX = x - 1.78;
      const minSafeY = WADI_H(rearWheelX, 0) + dropM;
      groupY = Math.max(groupY, minSafeY * (1 - smoothStep(LEDGE_X0, LEDGE_X1 + 0.35, rearWheelX)));
    }

    arr[i] = { x, groupY, wheelDrop, hullPitch, travel };
    x += v * DT2;
    travel += v * DT2;
  }
  return arr;
})();

const sampleDrop = (t: number): DropSample => {
  const f = Math.max(0, Math.min(DROP_TABLE.length - 1.001, (t - T2_MIN) / DT2));
  const i = Math.floor(f);
  const p = f - i;
  const a = DROP_TABLE[i];
  const b = DROP_TABLE[i + 1];
  return {
    x: lerp(a.x, b.x, p),
    groupY: lerp(a.groupY, b.groupY, p),
    wheelDrop: lerp(a.wheelDrop, b.wheelDrop, p),
    hullPitch: lerp(a.hullPitch, b.hullPitch, p),
    travel: lerp(a.travel, b.travel, p),
  };
};

// ---------- Hàm dựng khối đa diện giáp hàn sắc cạnh đồng bộ 1:1 với M1A2Abrams.tsx ----------
function buildLoftedArmor(rings: V3[][]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const nPts = rings[0].length;

  const pushTri = (a: V3, b: V3, c: V3) => {
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2];
    const vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    const nx = Math.abs(uy * vz - uz * vy);
    const ny = Math.abs(uz * vx - ux * vz);
    const nz = Math.abs(ux * vy - uy * vx);
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      if (ny >= nx && ny >= nz) uvs.push(p[0], p[2]);
      else if (nz >= nx) uvs.push(p[0], p[1]);
      else uvs.push(p[2], p[1]);
    }
  };

  for (let r = 0; r < rings.length - 1; r++) {
    const cur = rings[r];
    const nxt = rings[r + 1];
    for (let i = 0; i < nPts; i++) {
      const j = (i + 1) % nPts;
      pushTri(cur[i], nxt[j], cur[j]);
      pushTri(cur[i], nxt[i], nxt[j]);
    }
  }

  const centroid = (ring: V3[]): V3 => {
    let sx = 0,
      sy = 0,
      sz = 0;
    for (const p of ring) {
      sx += p[0];
      sy += p[1];
      sz += p[2];
    }
    return [sx / ring.length, sy / ring.length, sz / ring.length];
  };

  const bot = rings[0];
  const botC = centroid(bot);
  for (let i = 0; i < nPts; i++) pushTri(botC, bot[i], bot[(i + 1) % nPts]);

  const top = rings[rings.length - 1];
  const topC = centroid(top);
  for (let i = 0; i < nPts; i++) pushTri(topC, top[(i + 1) % nPts], top[i]);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

// Khối thân trên Glacis chuẩn M1A2 Abrams (cắt vén nhẹ gờ sponson sườn phải z = +0.72 ở khoảng giữa để rọi nắng xuống đủ 14 thanh xoắn!)
const CUTAWAY_UPPER_HULL_RINGS: V3[][] = [
  [
    [3.84, 1.08, 0.0],
    [3.82, 1.08, 1.56],
    [2.58, 1.13, 1.62],
    [2.32, 1.14, 0.72],
    [-1.92, 1.14, 0.72],
    [-2.18, 1.13, 1.64],
    [-4.02, 1.1, 1.64],
    [-4.02, 1.1, -1.68],
    [-1.6, 1.13, -1.72],
    [1.76, 1.13, -1.72],
    [3.82, 1.08, -1.58],
  ],
  [
    [1.7, 1.36, 0.0],
    [1.74, 1.35, 1.48],
    [2.42, 1.24, 1.48],
    [2.18, 1.35, 0.74],
    [-1.85, 1.36, 0.74],
    [-2.08, 1.41, 1.58],
    [-3.96, 1.38, 1.58],
    [-3.96, 1.38, -1.6],
    [-1.58, 1.42, -1.64],
    [0.8, 1.36, -1.64],
    [1.74, 1.35, -1.52],
  ],
];

// Vỏ tháp pháo đa diện Chobham NGUYÊN KHỐI 1:1 của M1A2Abrams (sơn cát CARC uy nghi, không cắt hộp xám!)
const FULL_TURRET_SHELL_RINGS: V3[][] = [
  [
    [1.08, 0.05, 0.0],
    [1.08, 0.05, 0.31],
    [1.5, 0.08, 0.34],
    [1.14, 0.08, 1.42],
    [0.2, 0.04, 1.56],
    [-0.94, 0.05, 1.5],
    [-1.36, 0.13, 1.33],
    [-2.62, 0.15, 1.25],
    [-2.62, 0.15, -1.23],
    [-1.36, 0.13, -1.3],
    [-0.94, 0.05, -1.46],
    [0.18, 0.04, -1.51],
    [1.12, 0.08, -1.38],
    [1.47, 0.08, -0.34],
    [1.08, 0.05, -0.31],
  ],
  [
    [1.16, 0.22, 0.0],
    [1.16, 0.22, 0.31],
    [1.98, 0.24, 0.34],
    [1.5, 0.24, 1.5],
    [0.22, 0.2, 1.63],
    [-0.92, 0.2, 1.56],
    [-1.34, 0.22, 1.36],
    [-2.86, 0.3, 1.29],
    [-2.86, 0.3, -1.27],
    [-1.34, 0.22, -1.34],
    [-0.92, 0.2, -1.51],
    [0.2, 0.2, -1.57],
    [1.47, 0.24, -1.46],
    [1.94, 0.24, -0.34],
    [1.16, 0.22, -0.31],
  ],
  [
    [1.02, 1.055, 0.0],
    [1.02, 1.055, 0.31],
    [1.34, 1.055, 0.34],
    [0.95, 1.055, 1.41],
    [0.18, 1.055, 1.53],
    [-0.92, 1.055, 1.47],
    [-1.32, 1.055, 1.31],
    [-2.73, 1.045, 1.24],
    [-2.73, 1.045, -1.22],
    [-1.32, 1.055, -1.29],
    [-0.92, 1.055, -1.43],
    [0.16, 1.055, -1.48],
    [0.93, 1.055, -1.37],
    [1.31, 1.055, -0.34],
    [1.02, 1.055, -0.31],
  ],
  [
    [0.99, 1.09, 0.0],
    [0.99, 1.09, 0.3],
    [1.3, 1.09, 0.33],
    [0.92, 1.09, 1.37],
    [0.18, 1.09, 1.49],
    [-0.92, 1.09, 1.43],
    [-1.32, 1.09, 1.27],
    [-2.69, 1.08, 1.2],
    [-2.69, 1.08, -1.18],
    [-1.32, 1.09, -1.25],
    [-0.92, 1.09, -1.39],
    [0.16, 1.09, -1.44],
    [0.9, 1.09, -1.33],
    [1.27, 1.09, -0.33],
    [0.99, 1.09, -0.3],
  ],
];

const MANTLET_PTS: P2[] = [
  [0.45, -0.26],
  [1.16, -0.24],
  [1.38, -0.1],
  [0.98, 0.38],
  [0.45, 0.38],
];

const M256_BARREL_PROFILE: P2[] = [
  [0.132, 0.0],
  [0.132, 1.32],
  [0.116, 1.36],
  [0.113, 1.92],
  [0.121, 1.93],
  [0.121, 1.98],
  [0.098, 1.99],
  [0.096, 2.48],
  [0.092, 3.35],
  [0.089, 4.14],
  [0.096, 4.15],
  [0.096, 4.2],
  [0.086, 4.21],
  [0.083, 5.14],
  [0.095, 5.15],
  [0.095, 5.275],
  [0.062, 5.28],
  [0.06, 5.02],
  [0.001, 5.02],
];

const BORE_EVAC_PROFILE: P2[] = [
  [0.068, 2.45],
  [0.088, 2.49],
  [0.134, 2.6],
  [0.139, 2.66],
  [0.139, 3.16],
  [0.131, 3.23],
  [0.084, 3.33],
  [0.066, 3.37],
];

const SIDE_RAIL_R_TOP: V3[] = [
  [0.34, 0.9, 1.56],
  [0.24, 0.9, 1.7],
  [-1.12, 0.9, 1.62],
  [-1.24, 0.9, 1.4],
];
const SIDE_RAIL_R_BOT: V3[] = [
  [0.34, 0.44, 1.6],
  [0.24, 0.44, 1.72],
  [-1.12, 0.44, 1.64],
  [-1.24, 0.44, 1.42],
];
const BUSTLE_RACK_TOP: V3[] = [
  [-2.74, 0.95, 1.22],
  [-3.36, 0.95, 1.12],
  [-3.36, 0.95, -1.1],
  [-2.74, 0.95, -1.2],
];
const BUSTLE_RACK_BOT: V3[] = [
  [-2.82, 0.46, 1.24],
  [-3.32, 0.46, 1.1],
  [-3.32, 0.46, -1.08],
  [-2.82, 0.46, -1.22],
];

// ---------- Vật liệu & Geometry tĩnh cấp module ----------
const matCarcHull = () =>
  paint({
    ...PAINT_PRESETS.abramsDesert,
    camo: [...PAINT_PRESETS.abramsDesert.camo],
    repeat: 0.42,
    seed: 7,
  });
const matCarcTurret = () =>
  paint({
    ...PAINT_PRESETS.abramsDesert,
    camo: [...PAINT_PRESETS.abramsDesert.camo],
    dirt: PAINT_PRESETS.abramsDesert.dirt * 0.72,
    repeat: 0.42,
    seed: 11,
  });
const matCutRed = () => plain('#c43b29', 0.46, 0.35);
const matGunSteel = () => plain('#282c30', 0.44, 0.68);
const matDarkMetal = () => plain('#22262b', 0.62, 0.48);
const matOpticGlass = () => plain('#1a2a38', 0.15, 0.8);
const matCanvasStow = () => plain('#a9936d', 0.88, 0.04);
const matSandstone = () =>
  paint({
    color: '#947b5c',
    camo: ['#786146', '#b19773'],
    camoScale: 1.4,
    wear: 0.28,
    dirt: 0.48,
    roughness: 0.93,
    metalness: 0.04,
    repeat: 0.45,
    seed: 61,
  });
const matSedanBody = () =>
  paint({
    color: '#5c83aa',
    camo: ['#52779c', '#6a92ba'],
    camoScale: 2.4,
    wear: 0.06,
    dirt: 0.2,
    roughness: 0.24,
    metalness: 0.62,
    repeat: 0.45,
    seed: 83,
  });
const matSedanGlass = () => plain('#1d3042', 0.12, 0.85);
const matAlloyRim = () => plain('#e2ebf5', 0.18, 0.88);
const matBrakeDisc = () => plain('#9aa6b2', 0.32, 0.82);
const matCaliperRed = () => plain('#c4352b', 0.4, 0.35);
const matDarkChassis = () => plain('#1e232a', 0.68, 0.42);
const matChrome = () => plain('#e8eff7', 0.14, 0.92);
const matShallowPrint = () => plain('#ad9164', 0.96, 0.02);
const matPadRidge = () => plain('#cfb484', 0.95, 0.02);

// Thân xe sedan gia đình 4 cửa nguyên chiếc (dài 4.46 m)
const FULL_SEDAN_BODY_GEO = extrude(
  [
    [-2.18, 0.24],
    [-1.72, 0.22],
    [-1.62, 0.5],
    [-1.34, 0.64],
    [-1.06, 0.5],
    [-0.96, 0.21],
    [0.88, 0.21],
    [0.98, 0.5],
    [1.32, 0.66],
    [1.64, 0.5],
    [1.74, 0.22],
    [2.16, 0.24],
    [2.24, 0.44],
    [2.14, 0.68],
    [1.95, 0.78],
    [1.08, 0.88],
    [0.38, 1.34],
    [-0.86, 1.35],
    [-1.56, 0.94],
    [-2.12, 0.88],
    [-2.22, 0.56],
  ],
  1.74,
  0.045
);

const FULL_SEDAN_CABIN_GLASS_GEO = extrude(
  [
    [-1.48, 0.94],
    [-0.84, 1.31],
    [0.34, 1.3],
    [0.98, 0.89],
  ],
  1.52,
  0.015
);

const SEDAN_COIL_SPRING_GEO = (() => {
  const pts: [number, number, number][] = [];
  const turns = 5.5;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const a = p * turns * Math.PI * 2;
    pts.push([Math.cos(a) * 0.056, 0.16 + p * 0.25, Math.sin(a) * 0.056]);
  }
  return pipe(pts, 0.011, 64);
})();

const SEDAN_BRAKE_ROTOR_GEO = (() => {
  const g = lathe(
    [
      [0.05, -0.014],
      [0.15, -0.014],
      [0.15, 0.014],
      [0.05, 0.014],
    ],
    28
  ).clone();
  g.rotateY(Math.PI / 2);
  return g;
})();

/**
 * Thân trên Glacis & Tháp pháo Chobham NGUYÊN KHỐI 1:1 của M1A2 Abrams (màu cát CARC uy nghi, đủ GPS, CITV, CROWS, giỏ sườn, ống khói M250)
 * được tháo toàn bộ váy chắn xích & vén cửa sổ cắt bổ dưới gờ sponson (y < 1.14 m) để phô diễn sáng rõ 14 thanh thép xoắn & 14 bánh đôi!
 */
const AuthenticAbramsUpperOnSuspension: React.FC<{ hullPitch: number }> = ({ hullPitch }) => {
  const upperHullGeo = useMemo(() => buildLoftedArmor(CUTAWAY_UPPER_HULL_RINGS), []);
  const turretShellGeo = useMemo(() => buildLoftedArmor(FULL_TURRET_SHELL_RINGS), []);
  const mantletGeo = useMemo(() => extrude(MANTLET_PTS, 0.58, 0.025), []);
  const barrelGeo = useMemo(() => lathe(M256_BARREL_PROFILE, 36), []);
  const boreEvacGeo = useMemo(() => lathe(BORE_EVAC_PROFILE, 32), []);
  const sideRailRTopGeo = useMemo(() => pipe(SIDE_RAIL_R_TOP, 0.016, 20), []);
  const sideRailRBotGeo = useMemo(() => pipe(SIDE_RAIL_R_BOT, 0.016, 20), []);
  const rackTopGeo = useMemo(() => pipe(BUSTLE_RACK_TOP, 0.02, 24), []);
  const rackBotGeo = useMemo(() => pipe(BUSTLE_RACK_BOT, 0.02, 24), []);

  return (
    <group position={[0, 0.65, 0]} rotation={[0, 0, hullPitch]}>
      <group position={[0, -0.61, 0]}>
        {/* Đèn rọi gầm ấm đặt thoáng ngoài cửa cắt bổ giúp 14 thanh thép xoắn sáng ánh kim tự nhiên mà không tạo đốm chói dưới bụng thân */}
        <pointLight color="#fff3dc" intensity={3.2} distance={5.6} decay={1.35} position={[1.15, 0.72, 1.95]} />
        <pointLight color="#fff3dc" intensity={3.0} distance={5.6} decay={1.35} position={[-0.95, 0.72, 1.95]} />

        {/* Thân trên Glacis chuẩn M1A2 + đường viền đỏ mảnh đánh dấu cửa sổ cắt bổ mở gầm hệ treo */}
        <mesh geometry={upperHullGeo} material={matCarcHull()} castShadow receiveShadow />
        <mesh position={[0.2, 1.14, 0.73]} material={matCutRed()}>
          <boxGeometry args={[4.24, 0.024, 0.024]} />
        </mesh>

        {/* Đèn pha mũi xe & móc kéo trước chuẩn Abrams */}
        {([-1, 1] as const).map((side) => (
          <group key={side}>
            <group position={[3.62, 1.18, side * 1.46]}>
              <mesh geometry={rbox(0.18, 0.14, 0.22, 0.015)} material={matDarkMetal()} castShadow />
              <mesh position={[0.075, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matOpticGlass()}>
                <cylinderGeometry args={[0.05, 0.05, 0.03, 14]} />
              </mesh>
            </group>
            <mesh position={[3.8, 0.98, side * 0.84]} rotation={[0, 0, -0.32]} geometry={rbox(0.22, 0.08, 0.11, 0.02)} material={matGunSteel()} />
          </group>
        ))}

        {/* 2 trụ kết cấu ở đầu & cuối khung gầm (nằm ngoài dãy 14 thanh xoắn x = -1.78..+2.32) */}
        {[2.88, -2.42].map((px, i) => (
          <mesh key={i} position={[px, 0.82, -0.15]} geometry={rbox(0.34, 0.62, 1.55, 0.015)} material={matCarcHull()} castShadow />
        ))}

        {/* Tháp pháo đa diện Chobham NGUYÊN KHỐI màu cát CARC + đầy đủ chi tiết nhận diện M1A2 Abrams */}
        <group position={[0.08, 1.36, 0]}>
          <mesh position={[-0.04, 0.05, 0]} material={matDarkMetal()} castShadow>
            <cylinderGeometry args={[1.24, 1.26, 0.12, 32]} />
          </mesh>
          <mesh geometry={turretShellGeo} material={matCarcTurret()} castShadow receiveShadow />

          {/* Pháo chính 120mm M256 ổn định con quay hồi chuyển (-hullPitch) giữ nòng phẳng đầm qua cú rơi 3 ft! */}
          <group position={[0.36, 0.5, 0]} rotation={[0, 0, -hullPitch]}>
            <mesh geometry={mantletGeo} material={matCarcTurret()} castShadow receiveShadow />
            <mesh geometry={barrelGeo} material={matCarcTurret()} castShadow receiveShadow />
            <mesh position={[0, 0.032, 0]} geometry={boreEvacGeo} material={matCarcTurret()} castShadow />
            {[1.955, 2.52, 3.29, 4.175, 5.145].map((bx, bi) => (
              <mesh key={bi} position={[bx, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matGunSteel()}>
                <cylinderGeometry
                  args={[
                    bi === 1 || bi === 2 ? 0.141 : bi === 0 ? 0.123 : 0.098,
                    bi === 1 || bi === 2 ? 0.141 : bi === 0 ? 0.123 : 0.098,
                    0.045,
                    24,
                  ]}
                />
              </mesh>
            ))}
            <group position={[5.2, 0.09, 0]}>
              <mesh position={[0, 0.048, 0]} geometry={rbox(0.052, 0.096, 0.034, 0.006)} material={matGunSteel()} />
              <mesh position={[-0.008, 0.105, 0]} geometry={rbox(0.072, 0.054, 0.046, 0.008)} material={matCarcTurret()} />
            </group>
          </group>

          {/* Hộp quang học GPS ("doghouse"), CITV, vòm trưởng xe + trạm CROWS .50 cal */}
          <group position={[0.84, 1.09, 0.72]}>
            <mesh position={[0, 0.15, 0]} geometry={rbox(0.58, 0.3, 0.45, 0.025)} material={matCarcTurret()} castShadow />
            <mesh position={[0.288, 0.155, -0.03]} geometry={rbox(0.02, 0.17, 0.26, 0.003)} material={matOpticGlass()} />
          </group>
          <group position={[0.58, 1.09, -0.66]}>
            <mesh position={[0, 0.16, 0]} material={matCarcTurret()} castShadow>
              <cylinderGeometry args={[0.19, 0.22, 0.32, 20]} />
            </mesh>
          </group>
          <group position={[-0.16, 1.09, 0.7]}>
            <mesh position={[0, 0.07, 0]} material={matCarcTurret()} castShadow>
              <cylinderGeometry args={[0.36, 0.39, 0.14, 20]} />
            </mesh>
            <mesh position={[0.28, 0.36, 0.06]} geometry={rbox(0.54, 0.16, 0.14, 0.012)} material={matGunSteel()} castShadow />
            <mesh position={[0.88, 0.38, 0.06]} rotation={[0, 0, Math.PI / 2]} material={matGunSteel()}>
              <cylinderGeometry args={[0.018, 0.022, 0.74, 10]} />
            </mesh>
          </group>

          {/* Khung giỏ lan can ống thép bên sườn phải (+Z), tấm CIP, ống phóng đạn khói M250 & giỏ đồ đuôi */}
          <mesh geometry={sideRailRTopGeo} material={matDarkMetal()} castShadow />
          <mesh geometry={sideRailRBotGeo} material={matDarkMetal()} castShadow />
          {[0.22, -0.45, -1.1].map((px, pi) => (
            <mesh key={pi} position={[px, 0.67, 1.66 - pi * 0.03]} geometry={rbox(0.028, 0.47, 0.028, 0.005)} material={matDarkMetal()} />
          ))}
          <mesh position={[-0.32, 0.67, 1.66]} rotation={[0, -0.055, 0]} geometry={rbox(0.68, 0.42, 0.026, 0.006)} material={matCarcTurret()} castShadow />
          <mesh position={[-0.88, 0.65, 1.58]} geometry={rbox(0.28, 0.4, 0.15, 0.016)} material={matCanvasStow()} castShadow />
          <mesh position={[-2.02, 0.68, 1.33]} geometry={rbox(1.06, 0.44, 0.11, 0.015)} material={matCarcTurret()} castShadow />
          <group position={[0.76, 0.6, 1.54]}>
            <mesh geometry={rbox(0.22, 0.15, 0.09, 0.012)} material={matDarkMetal()} />
            {[-0.06, 0.0, 0.06].map((dz, si) => (
              <mesh key={si} position={[0.14, 0.04, dz]} rotation={[0, -0.32, 0.25]} material={matCarcTurret()}>
                <cylinderGeometry args={[0.035, 0.038, 0.22, 10]} />
              </mesh>
            ))}
          </group>

          <mesh geometry={rackTopGeo} material={matDarkMetal()} castShadow />
          <mesh geometry={rackBotGeo} material={matDarkMetal()} castShadow />
          <mesh position={[-3.06, 0.63, 0.45]} geometry={rbox(0.36, 0.28, 0.78, 0.03)} material={matCanvasStow()} castShadow />
        </group>
      </group>
    </group>
  );
};

/** Xe sedan gia đình 4 cửa (~32–35 PSI) có bánh lốp bản hẹp 205mm lún ngập sâu 15.5 cm vào cát mềm sa mạc! */
const CivilianSedanBoggedInSand: React.FC<{ x: number; z: number; yaw: number; sandY: number }> = ({
  x,
  z,
  yaw,
  sandY,
}) => {
  const wheelR = 0.33;
  const frontSink = 0.155;
  const rearSink = 0.115;
  const frontWheelY = sandY + wheelR - frontSink;
  const rearWheelY = sandY + wheelR - rearSink;

  return (
    <group position={[x, 0, z]} rotation={[0.018, yaw, -0.035]}>
      <group position={[0, frontWheelY - 0.29, 0]}>
        <mesh geometry={FULL_SEDAN_BODY_GEO} material={matSedanBody()} castShadow receiveShadow />
        <mesh position={[0, 0.02, 0]} geometry={FULL_SEDAN_CABIN_GLASS_GEO} material={matSedanGlass()} />
        <mesh position={[1.32, 0.42, 0]} geometry={rbox(0.84, 0.42, 1.56, 0.02)} material={matDarkChassis()} />
        <mesh position={[-1.34, 0.42, 0]} geometry={rbox(0.82, 0.42, 1.56, 0.02)} material={matDarkChassis()} />

        <mesh position={[2.22, 0.48, 0]} geometry={rbox(0.05, 0.18, 0.92, 0.01)} material={matDarkChassis()} />
        {[-0.05, 0.0, 0.05].map((gy, k) => (
          <mesh key={k} position={[2.245, 0.48 + gy, 0]} geometry={rbox(0.02, 0.016, 0.86, 0.004)} material={matChrome()} />
        ))}
        <mesh position={[2.21, 0.28, 0]} geometry={rbox(0.06, 0.08, 1.58, 0.015)} material={matDarkChassis()} />
        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[2.17, 0.58, s * 0.62]}
            rotation={[0, s * 0.18, -0.16]}
            geometry={rbox(0.1, 0.12, 0.3, 0.018)}
            material={plain('#f5fbff', 0.1, 0.2, {
              emissive: new THREE.Color('#fff2cc'),
              emissiveIntensity: 0.55,
            })}
          />
        ))}
      </group>

      {[
        { wx: 1.32, wy: frontWheelY, steer: 0.12 },
        { wx: -1.34, wy: rearWheelY, steer: 0.0 },
      ].map((axle, ai) =>
        ([-1, 1] as const).map((side) => (
          <group key={`${ai}_${side}`} position={[axle.wx, axle.wy, side * 0.78]} rotation={[0, axle.steer, 0]}>
            <Wheel r={wheelR} width={0.205} spin={0.4} tire="#1b1d21" rim="#dce6f0" bolts={5} />
            <group position={[0, 0, side * 0.092]} rotation={[0, 0, -0.4]}>
              {Array.from({ length: 5 }, (_, i) => {
                const a = (i / 5) * Math.PI * 2;
                return (
                  <mesh
                    key={i}
                    position={[Math.cos(a) * 0.105, Math.sin(a) * 0.105, 0]}
                    rotation={[0, 0, a]}
                    material={matAlloyRim()}
                  >
                    <boxGeometry args={[0.185, 0.034, 0.02]} />
                  </mesh>
                );
              })}
            </group>
            <mesh position={[0, 0, -side * 0.02]} geometry={SEDAN_BRAKE_ROTOR_GEO} material={matBrakeDisc()} />
            <mesh position={[-0.11, 0.08, -side * 0.025]} rotation={[0, 0, 0.55]} geometry={rbox(0.07, 0.11, 0.06, 0.01)} material={matCaliperRed()} />
            {ai === 0 && (
              <group position={[0, 0.02, -side * 0.12]}>
                <mesh position={[0, 0.22, 0]} material={matDarkChassis()}>
                  <cylinderGeometry args={[0.024, 0.028, 0.46, 12]} />
                </mesh>
                <mesh geometry={SEDAN_COIL_SPRING_GEO} material={plain('#e3b42b', 0.35, 0.4)} />
              </group>
            )}
          </group>
        ))
      )}
    </group>
  );
};

const C04S02: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();
  const tc = Math.max(499.8, Math.min(521.4, t));

  // ---------- Nửa đầu (500.10..508.85s): Tháp pháo & thân trên Abrams thật gắn trên hệ treo 14 bánh đôi + 14 thanh xoắn ----------
  const dropKin = sampleDrop(tc);

  // ---------- Nửa sau (508.85..521.20s): M1A2Abrams xích T-158 rộng 25 inch (15.4 PSI) đối chiếu xe sedan gia đình lún cát ----------
  const sandLaneProgress = prog(tc, 508.5, 521.1, (u) => u);
  const abramsX = lerp(33.2, 42.55, sandLaneProgress);
  const abramsTravel = (abramsX - 33.2) + 3.5;
  const abramsGroundY = 0.0;
  const trackCenterZ = ABRAMS_LANE_Z + 1.51; // z = 6.51 m

  const psiOverlay = prog(tc, CUE.c04_s02_psi - 0.45, CUE.c04_s02_psi + 0.4);

  // ---------- Ngôn ngữ Camera ----------
  const mixV3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

  const shelfY = LEDGE_DROP_H;
  // Nhịp A1 (Khung 1 @ 500.40s): Góc thấp sát mặt đất (y_above_ground = 0.38 m) ôm trọn cả tháp pháo M1A2 Abrams CARC lẫn đủ 14 bánh chịu nặng đôi!
  const posA1: V3 = [dropKin.x + 2.85, shelfY + 0.38, 5.25];
  const lookA1: V3 = [dropKin.x + 0.15, shelfY + 0.92, 0.0];

  // Nhịp A2 (Khung 2 @ 504.47s): Nghiêng nhìn qua cửa cắt bổ dưới gờ sponson đếm rõ toàn bộ 14 thanh thép xoắn sáng loáng dưới khối tháp pháo Abrams!
  const posA2: V3 = [dropKin.x + 2.35, shelfY + 1.02, 3.18];
  const lookA2: V3 = [dropKin.x + 0.2, shelfY + 0.56, -0.05];

  // Nhịp A3 (Khung 3 @ 508.53s): Sát lòng suối cạn (y = 0.40 m) thấy trọn cả xe tăng Abrams cắt bổ gầm, bậc đá 3 ft phía sau & bụi chấn động!
  const trackDropX = Math.max(8.0, dropKin.x);
  const posA3: V3 = [trackDropX + 5.15, 0.4, 5.1];
  const lookA3: V3 = [trackDropX - 0.75, 0.96, -0.1];

  const pA12 = prog(tc, 502.2, 503.45);
  const pA23 = prog(tc, 505.25, 506.25);
  const posAct1 = mixV3(mixV3(posA1, posA2, pA12), posA3, pA23);
  const lookAct1 = mixV3(mixV3(lookA1, lookA2, pA12), lookA3, pA23);

  // Nhịp B1 (Khung 4 @ 512.60s): Góc 3/4 sát mặt cát (y = 0.35 m) đặc tả dải xích T-158 rộng 25 inch
  const posB1: V3 = [abramsX + 5.05, 0.35, trackCenterZ + 0.52];
  const lookB1: V3 = [abramsX + 2.85, 0.34, trackCenterZ - 0.14];

  // Nhịp B2 (Khung 5 @ 516.67s): Sát mặt cát (y = 0.33 m) soi bản xích T-158 ép phẳng chỉ 15.4 PSI
  const posB2: V3 = [abramsX + 4.85, 0.33, trackCenterZ + 0.16];
  const lookB2: V3 = [abramsX + 2.75, 0.24, trackCenterZ - 0.06];

  // Nhịp B3 (Khung 6 @ 517.6..521.2s): Lùi rộng thêm ~42% để CẢ xe sedan lún cát bên trái LẪN toàn bộ thân & 2 dải xích M1A2Abrams bên phải nằm gọn gàng trong khung hình, bầu trời trên thoáng sạch!
  const posB3: V3 = [abramsX + 11.45, 0.58, 6.46];
  const lookB3: V3 = [abramsX + 3.15, 1.18, 6.46];

  const pB12 = prog(tc, 514.4, 515.6);
  const pB23 = prog(tc, 517.35, 519.1);
  const posAct2 = mixV3(mixV3(posB1, posB2, pB12), posB3, pB23);
  const lookAct2 = mixV3(mixV3(lookB1, lookB2, pB12), lookB3, pB23);

  const pAct1To2 = prog(tc, 508.85, 510.55);
  const camPos = mixV3(posAct1, posAct2, pAct1To2);
  const camLook = mixV3(lookAct1, lookAct2, pAct1To2);
  const camFov = lerp(42, lerp(36, 40, pB23), pAct1To2);

  const shadowFocusX = lerp(dropKin.x, abramsX + 3.0, pAct1To2);
  const shadowFocusZ = lerp(0, 6.5, pAct1To2);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: '#11161d' }}>
      <Stage
        {...LOOK_DESERT_GLARE.stage}
        width={W}
        height={H}
        shadowArea={20}
        shadowCenter={[shadowFocusX, 0, shadowFocusZ]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình bậc thềm lòng suối cạn sâu 0.90 m (3 ft) & hố cát mềm tự nhiên */}
        <Terrain
          h={WADI_H}
          size={300}
          seg={360}
          center={[20, 4]}
          colors={LOOK_DESERT_GLARE.terrain}
          grainRepeat={54}
        />
        <Scatter
          kind="rock"
          count={150}
          area={[-32, -58, 96, 72]}
          h={WADI_H}
          seed={52}
          scale={[0.5, 1.55]}
          avoid={avoidWadiCorridor}
          tint={LOOK_DESERT_GLARE.scatterTint}
        />
        <Scatter
          kind="bush"
          count={95}
          area={[-32, -52, 96, 66]}
          h={WADI_H}
          seed={89}
          scale={[0.45, 1.1]}
          avoid={avoidWadiCorridor}
          tint="#baa676"
        />

        {/* Kết cấu vỉa đá sa thạch bậc thềm 3 ft (cao đúng 0.90 m tại x = 5.42 m) */}
        {[-3.4, -1.7, 0.0, 1.7, 3.4, 5.1].map((rz, idx) => (
          <group key={idx} position={[5.4 + (idx % 2) * 0.07, 0, rz]}>
            <mesh position={[0, 0.45, 0]} geometry={rbox(0.68, 0.9, 1.74, 0.06)} material={matSandstone()} castShadow receiveShadow />
            <mesh position={[0.26, 0.18, 0.14]} geometry={rbox(0.46, 0.36, 1.28, 0.05)} material={matSandstone()} castShadow receiveShadow />
          </group>
        ))}

        {/* ==================== NỬA ĐẦU: THÂN TRÊN & THÁP PHÁO ABRAMS THẬT + HỆ TREO 14 BÁNH ĐÔI & 14 THANH XOẮN ==================== */}
        <group position={[dropKin.x, dropKin.groupY, 0]}>
          <PowerpackChassis3D
            mode="suspensionOnly"
            wheelDrop={dropKin.wheelDrop}
            leftTravel={dropKin.travel}
            rightTravel={dropKin.travel}
          />
          <Track
            xFront={3.18}
            xRear={-3.08}
            rFront={0.455}
            rRear={0.475}
            width={0.56}
            link={0.165}
            travel={dropKin.travel}
            color="#2c2e2b"
            position={[0, 0.0, -1.345]}
          />
          <AuthenticAbramsUpperOnSuspension hullPitch={dropKin.hullPitch} />
        </group>

        {/* Bụi cát sa mạc dưới bánh chịu nặng & cụm bụi bung lên từ lòng suối cạn đúng lúc đáp bậc 3 ft (507.02s) */}
        <DustTrail
          t={tc}
          from={499.7}
          to={506.5}
          rate={8}
          size={1.5}
          life={2.1}
          color="#d8c196"
          path={(tb) => {
            const s = sampleDrop(tb);
            return [s.x - 2.3, LEDGE_DROP_H + 0.04, 1.35];
          }}
        />
        <DustTrail
          t={tc}
          from={CUE.c04_s02_drop - 0.03}
          to={509.4}
          rate={11}
          size={1.65}
          life={1.9}
          color="#e2cb9f"
          path={(tb) => {
            const s = sampleDrop(tb);
            return [s.x + 0.8, 0.04, 1.55];
          }}
        />
        <DustTrail
          t={tc}
          from={CUE.c04_s02_drop}
          to={509.4}
          rate={11}
          size={1.8}
          life={2.0}
          color="#d5bc8f"
          path={(tb) => {
            const s = sampleDrop(tb);
            return [s.x - 1.7, 0.04, 1.5];
          }}
        />

        {/* ==================== NỬA SAU: M1A2 ABRAMS XÍCH T-158 RỘNG 25 INCH (15.4 PSI) VS XE SEDAN GIA ĐÌNH LÚN CÁT ==================== */}
        <M1A2Abrams
          variant="m1a2"
          camo="desert"
          travel={abramsTravel}
          turretYaw={-0.04}
          gunPitch={0.01}
          position={[abramsX, abramsGroundY, ABRAMS_LANE_Z]}
        />

        {/* Vệt hằn 2 dải xích T-158 rộng 0.635 m (25 inch) ép phẳng cực nông trên mặt cát mềm */}
        {([ABRAMS_LANE_Z + 1.51, ABRAMS_LANE_Z - 1.51] as const).map((tz, ti) => (
          <group key={ti} position={[abramsX - 1.2, abramsGroundY + 0.006, tz]}>
            <mesh geometry={rbox(8.8, 0.014, 0.65, 0.005)} material={matShallowPrint()} receiveShadow />
            {Array.from({ length: 24 }, (_, i) => (
              <mesh
                key={i}
                position={[-4.0 + i * 0.34, 0.008, 0]}
                geometry={rbox(0.14, 0.007, 0.61, 0.002)}
                material={matPadRidge()}
              />
            ))}
          </group>
        ))}

        {/* Đế chỉ thị phân bố tải trọng phẳng 15.4 PSI dưới cả 2 mũi xích T-158 rộng 25 inch */}
        {psiOverlay > 0.01 &&
          ([ABRAMS_LANE_Z + 1.51, ABRAMS_LANE_Z - 1.51] as const).map((tz, ti) => (
            <group key={ti} position={[abramsX + 2.85, abramsGroundY + 0.018, tz]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.65, 0.68]} />
                <meshBasicMaterial color={PAL.amber} transparent opacity={0.28 * psiOverlay} toneMapped={false} />
              </mesh>
              {([-0.34, 0.34] as const).map((zEdge, k) => (
                <mesh key={k} position={[0, 0.006, zEdge]}>
                  <boxGeometry args={[1.65, 0.014, 0.022]} />
                  <meshBasicMaterial color={PAL.amberHot} transparent opacity={0.9 * psiOverlay} toneMapped={false} />
                </mesh>
              ))}
              <mesh position={[0.84, 0.008, 0]}>
                <boxGeometry args={[0.024, 0.016, 0.72]} />
                <meshBasicMaterial color={PAL.cyan} transparent opacity={0.92 * psiOverlay} toneMapped={false} />
              </mesh>
            </group>
          ))}

        {/* Xe sedan gia đình 4 cửa (~32–35 PSI) có bánh lốp bản hẹp 205mm lún ngập sâu 15.5 cm vào đụn cát mềm ngay bên cạnh! */}
        <CivilianSedanBoggedInSand x={SEDAN_POS_X} z={SEDAN_POS_Z} yaw={SEDAN_YAW} sandY={0.0} />
      </Stage>

      {/* Tối đa 1 <Label> trên màn hình tại một thời điểm — đặt trên vùng nền trời thoáng sạch góc trên-trái, tuyệt đối không đè lên giáp tháp, dải xích hay nòng pháo! */}
      <Label
        t={t}
        text="T-158"
        x={W * 0.145}
        y={H * 0.105}
        from={CUE.c04_s02_t158}
        until={513.8}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="15.4 PSI"
        x={W * 0.145}
        y={H * 0.105}
        from={CUE.c04_s02_psi}
        until={520.95}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C04S02;
