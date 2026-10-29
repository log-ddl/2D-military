// Mô hình 3D bệ phóng tên lửa phòng không Patriot M903 (4 cụm quad-pack = 16 ống PAC-3) trên sơ-mi rơ-moóc M860.
// Quy ước trục: đầu rơ-moóc (máy phát điện + chốt kéo + hướng phóng chính khi azimuth = 0) hướng +X, trên +Y, ngang Z.
// Kích thước thật 1:1 (m): dài 10.90 m (x: -5.45 .. +5.45), rộng khung 2.90 m, cao ~5.40 m ở góc nâng 38°, mặt lốp & đế chân chống chạm đúng y = 0.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, mat4, merge, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

export type PatriotLauncherProps = {
  azimuth?: number;       // rad, mặc định 0
  elev?: number;          // độ, mặc định 38
  loadedCount?: number;   // 0..16, mặc định 16
  wheelSpin?: number;     // rad, mặc định 0
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

// ---------------- Hằng số hình học & khớp động học (đơn vị: mét thật) ----------------
const TT_X = -1.16;          // Tâm mâm xoay dọc trục rơ-moóc (khoảng x = -1.2)
const TT_Y = 1.25;           // Cao độ mặt mâm xoay
const HINGE_LX = -0.46;      // Tâm bản lề nâng giàn so với tâm mâm xoay (X cục bộ)
const HINGE_LY = 0.34;       // Tâm bản lề nâng giàn so với mặt mâm xoay (Y cục bộ)

const CYL_BASE_LX = 0.66;    // Khớp dưới xi-lanh nâng trên mâm xoay
const CYL_BASE_LY = 0.16;
const CYL_TOP_CX = 2.24;     // Khớp trên xi-lanh nâng dưới yên đỡ đáy giàn M903
const CYL_TOP_CY = -0.09;
const CYL_Z = 0.62;          // Khoảng cách ngang của 2 xi-lanh nâng

const TUBE_X_REAR = -0.92;   // Đuôi ống phóng trong hệ toạ độ giàn nâng
const TUBE_X_FRONT = 4.48;   // Miệng ống phóng (tổng chiều dài đúng 5.40 m)
const TUBE_LEN = TUBE_X_FRONT - TUBE_X_REAR; // 5.40 m

// Toạ độ tâm 16 ống phóng PAC-3 chia thành 4 cụm quad-pack (2×2 cụm × 2×2 ống).
// Thứ tự slot 0..15 từ hàng trên xuống hàng dưới, từ phải (+Z) sang trái (-Z) để slot 0 nằm góc trên thoáng nhất.
const QUAD_ROW_CY = [1.52, 1.12, 0.58, 0.18] as const;
const QUAD_COL_CZ = [0.74, 0.34, -0.34, -0.74] as const;

const TUBE_SLOTS: readonly [number, number][] = QUAD_ROW_CY.flatMap((cy) =>
  QUAD_COL_CZ.map((cz): [number, number] => [cy, cz]),
);

/** Tính toạ độ 3D tâm miệng ống phóng thứ `slot` (0..15) trong không gian cục bộ của PatriotLauncher. */
export function patriotMuzzlePos(elevDeg = 38, azimuthRad = 0, slot = 0): [number, number, number] {
  const idx = ((Math.floor(slot) % 16) + 16) % 16;
  const [tubeCy, tubeCz] = TUBE_SLOTS[idx];
  const el = (elevDeg * Math.PI) / 180;
  const cEl = Math.cos(el);
  const sEl = Math.sin(el);

  // Đưa điểm miệng ống từ hệ giàn nâng sang hệ mâm xoay
  const px = HINGE_LX + TUBE_X_FRONT * cEl - tubeCy * sEl;
  const py = HINGE_LY + TUBE_X_FRONT * sEl + tubeCy * cEl;
  const pz = tubeCz;

  // Xoay quanh trục +Y theo azimuthRad (chuẩn Three.js Euler Y)
  const cAz = Math.cos(azimuthRad);
  const sAz = Math.sin(azimuthRad);
  return [
    TT_X + px * cAz + pz * sAz,
    TT_Y + py,
    -px * sAz + pz * cAz,
  ];
}

// ---------------- Vật liệu sơn quân sự & cơ khí (cache) ----------------
const getMats = () => ({
  // Mảng extrude lớn: repeat = 0.42 (ExtrudeGeometry tính 1 m = 1 UV)
  chassisEx: paint({
    color: '#586747',
    camo: [PAL3D.usCamo1, PAL3D.usCamo2],
    camoScale: 0.95,
    wear: 0.30,
    dirt: 0.22,
    roughness: 0.62,
    metalness: 0.32,
    repeat: 0.42,
    seed: 11,
  }),
  bodyEx: paint({
    color: '#637350',
    camo: [PAL3D.usCamo1, '#827e60'],
    camoScale: 0.95,
    wear: 0.25,
    dirt: 0.16,
    roughness: 0.58,
    metalness: 0.30,
    repeat: 0.42,
    seed: 23,
  }),
  // Hộp vát rbox / khối tiện lathe có UV chuẩn hoá 0..1 -> repeat = 1
  bodyBox: paint({
    color: PAL3D.usBase,
    camo: [PAL3D.usCamo1, PAL3D.usCamo2],
    camoScale: 1.05,
    wear: 0.26,
    dirt: 0.18,
    roughness: 0.60,
    metalness: 0.32,
    repeat: 1,
    seed: 29,
  }),
  canister: paint({
    color: '#6d7e58',
    camo: ['#556343', '#848164'],
    camoScale: 1.15,
    wear: 0.20,
    dirt: 0.12,
    roughness: 0.55,
    metalness: 0.32,
    repeat: 1,
    seed: 37,
  }),
  cageFrame: paint({
    color: '#4c5a3d',
    camo: ['#3c4730', '#6c6950'],
    camoScale: 1.0,
    wear: 0.30,
    dirt: 0.18,
    roughness: 0.60,
    metalness: 0.38,
    repeat: 1,
    seed: 43,
  }),
  quadCollar: plain('#768562', 0.52, 0.36),
  capOlive: plain('#7d8c65', 0.56, 0.22),
  capRib: plain('#424e35', 0.50, 0.36),
  chrome: plain(PAL3D.steel, 0.3, 0.8),
  steel: plain('#9aa4ae', 0.40, 0.72),
  darkSteel: plain(PAL3D.darkSteel, 0.50, 0.58),
  rubber: plain(PAL3D.tire, 0.90, 0.05),
  brass: plain(PAL3D.brass, 0.40, 0.68),
  boreDark: plain('#171a1f', 0.96, 0.06, { side: THREE.DoubleSide }),
  boreDeep: plain('#0a0c10', 0.98, 0.02),
  soot: plain('#1b1e23', 0.92, 0.12, { side: THREE.DoubleSide }),
  sootBezel: plain('#24282e', 0.88, 0.15),
  tailRed: plain('#c42b2b', 0.36, 0.18),
  amber: plain('#e29622', 0.36, 0.20),
});

// ---------------- Biên dạng hình học tĩnh (tính 1 lần ở cấp module) ----------------

// Biên dạng nhìn ngang dầm chính chữ I của sơ-mi rơ-moóc M860 (hạ bụng giữa + bậc cổ ngỗng +X + vòm bogie sau)
const IBEAM_WEB_PTS: P2[] = [
  [-5.38, 0.80],
  [-2.76, 0.80],
  [-2.44, 0.44],
  [1.46, 0.44],
  [1.98, 1.04],
  [4.82, 1.04],
  [5.38, 1.14],
  [5.38, 1.36],
  [1.90, 1.36],
  [1.44, 0.76],
  [-2.46, 0.76],
  [-2.80, 1.09],
  [-5.38, 1.09],
];

// Biên dạng dầm biên ngoài sườn rơ-moóc (z = ±1.41) chạy liền từ khoang hạ bụng vát lên hết bậc cổ ngỗng +X
const SIDE_SILL_PTS: P2[] = [
  [-2.74, 0.54],
  [1.52, 0.54],
  [2.02, 1.04],
  [4.80, 1.04],
  [5.36, 1.15],
  [5.36, 1.38],
  [1.92, 1.38],
  [1.46, 0.77],
  [-2.74, 0.77],
];

// Biên dạng vè chắn bùn vát trên cụm 2 trục bánh đôi phía sau (x = -3.4, -4.6; bánh cao tới y = 1.08)
const FENDER_PTS: P2[] = [
  [-5.34, 0.68],
  [-5.10, 1.09],
  [-2.92, 1.09],
  [-2.70, 0.70],
  [-2.70, 0.84],
  [-2.88, 1.15],
  [-5.14, 1.15],
  [-5.34, 0.82],
];

// Tấm dốc chắn lửa gắn trên sàn rơ-moóc phía trước vòm bánh sau để hất luồng lửa tên lửa lên cao
const DECK_BLAST_RAMP_PTS: P2[] = [
  [-2.78, 0.76],
  [-2.24, 0.76],
  [-2.68, 1.13],
  [-2.78, 1.13],
];

// Mặt bằng sàn cổ ngỗng phía trước (+X, vát góc ở mũi kéo)
const GOOSENECK_DECK_PTS: P2[] = [
  [1.90, -1.43],
  [4.82, -1.43],
  [5.36, -1.06],
  [5.36, 1.06],
  [4.82, 1.43],
  [1.90, 1.43],
];

// Biên dạng hộp máy phát điện diesel quân sự vát góc trên cổ ngỗng
const GEN_HOUSING_PTS: P2[] = [
  [2.40, 1.38],
  [4.58, 1.38],
  [4.58, 2.12],
  [4.34, 2.36],
  [2.64, 2.36],
  [2.40, 2.14],
];

// Biên dạng càng hộp đôi vươn chân chống thuỷ lực ra ngoài (z = ±1.65)
const OUTRIGGER_ARM_PTS: P2[] = [
  [0.0, 0.62],
  [0.56, 0.74],
  [0.56, 1.18],
  [0.0, 1.12],
];

// Biên dạng gờ đỡ bản lề trên mâm xoay
const TT_CHEEK_PTS: P2[] = [
  [-0.72, 0.08],
  [0.88, 0.08],
  [0.82, 0.25],
  [-0.28, 0.48],
  [-0.68, 0.48],
];

// Biên dạng tấm hướng lửa đuôi gắn gọn sau cụm bệ M903 (không chạm sàn rơ-moóc ở mọi góc nâng)
const BLAST_DEFLECTOR_PTS: P2[] = [
  [-1.08, -0.10],
  [-0.76, -0.02],
  [-0.76, 0.05],
  [-1.05, -0.03],
];

// Đĩa đế tròn chân chống chạm đất đúng y = 0 (xoay đứng +90° quanh Z: axial 0 -> y = 0.000)
const FOOT_PAD_GEO = lathe([
  [0.001, 0.0],
  [0.30, 0.0],
  [0.30, 0.045],
  [0.22, 0.076],
  [0.11, 0.102],
  [0.001, 0.102],
], 28);

// Vỏ xi-lanh đứng của chân chống
const JACK_BARREL_GEO = lathe([
  [0.001, 0.56],
  [0.122, 0.56],
  [0.122, 0.63],
  [0.108, 0.63],
  [0.108, 1.35],
  [0.124, 1.35],
  [0.124, 1.42],
  [0.001, 1.42],
], 24);

// Ty xi-lanh mạ crôm chân chống
const JACK_ROD_GEO = lathe([
  [0.092, 0.092],
  [0.072, 0.135],
  [0.072, 0.58],
  [0.001, 0.58],
], 22);

// Bình nhiên liệu diesel hình trụ nằm dọc +X
const FUEL_TANK_GEO = lathe([
  [0.001, 0.0],
  [0.21, 0.03],
  [0.26, 0.09],
  [0.26, 1.18],
  [0.21, 1.24],
  [0.001, 1.27],
], 28);

// Bình tích áp khí nén phanh hơi dưới gầm rơ-moóc
const AIR_TANK_GEO = lathe([
  [0.001, 0.0],
  [0.13, 0.04],
  [0.145, 0.08],
  [0.145, 0.74],
  [0.13, 0.78],
  [0.001, 0.82],
], 20);

// Vỏ bọc cách nhiệt ống xả đứng
const MUFFLER_GEO = lathe([
  [0.05, 0.0],
  [0.098, 0.04],
  [0.098, 0.58],
  [0.055, 0.62],
], 20);

// Mâm xoay & đế mâm xoay (dùng xoay đứng quanh Z)
const PEDESTAL_GEO = lathe([
  [0.98, 0.76],
  [0.98, 0.84],
  [0.91, 0.86],
  [0.91, 1.16],
  [0.96, 1.18],
  [0.96, 1.25],
  [0.001, 1.25],
], 36);

const TURNTABLE_DISC_GEO = lathe([
  [0.001, 0.0],
  [0.90, 0.0],
  [0.90, 0.10],
  [0.86, 0.125],
  [0.001, 0.125],
], 36);

// Nòng lòng ống rỗng & vành miệng tròn bắt bu-lông của từng ống phóng (dọc +X)
const BORE_SLEEVE_GEO = lathe([
  [0.146, TUBE_X_FRONT - 0.96],
  [0.146, TUBE_X_FRONT - 0.004],
], 28);

const MUZZLE_BOLT_RING_GEO = lathe([
  [0.146, TUBE_X_FRONT - 0.022],
  [0.146, TUBE_X_FRONT + 0.006],
  [0.176, TUBE_X_FRONT + 0.006],
  [0.176, TUBE_X_FRONT - 0.022],
], 28);

const SOOT_COLLAR_GEO = lathe([
  [0.143, TUBE_X_FRONT - 0.035],
  [0.143, TUBE_X_FRONT + 0.014],
  [0.180, TUBE_X_FRONT + 0.014],
  [0.180, TUBE_X_FRONT - 0.018],
  [0.143, TUBE_X_FRONT - 0.035],
], 28);

const AFT_NOZZLE_RING_GEO = lathe([
  [0.11, TUBE_X_REAR - 0.04],
  [0.165, TUBE_X_REAR - 0.04],
  [0.178, TUBE_X_REAR + 0.01],
  [0.11, TUBE_X_REAR + 0.01],
], 24);

// Gộp thân tĩnh của 16 ống phóng dài 5.40 m (4.44 m sau đặc + 0.96 m đầu khoét lỗ tròn thật r = 0.146)
const SIXTEEN_TUBES_BODY_GEO = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const rearLen = TUBE_LEN - 0.96;
  const rearCenterX = TUBE_X_REAR + rearLen / 2;
  const frontLen = 0.96;
  const frontCenterX = TUBE_X_FRONT - frontLen / 2;

  const rearBox = rbox(rearLen, 0.376, 0.376, 0.022);
  const topBotWall = rbox(frontLen, 0.044, 0.376, 0.01);
  const sideWall = rbox(frontLen, 0.292, 0.044, 0.01);
  const cornerFillet = rbox(frontLen, 0.052, 0.052, 0.008);
  const muzzleFlangeTop = rbox(0.052, 0.036, 0.390, 0.008);
  const muzzleFlangeSide = rbox(0.052, 0.320, 0.036, 0.008);

  for (const [cy, cz] of TUBE_SLOTS) {
    parts.push(rearBox.clone().applyMatrix4(mat4([rearCenterX, cy, cz])));
    parts.push(topBotWall.clone().applyMatrix4(mat4([frontCenterX, cy + 0.166, cz])));
    parts.push(topBotWall.clone().applyMatrix4(mat4([frontCenterX, cy - 0.166, cz])));
    parts.push(sideWall.clone().applyMatrix4(mat4([frontCenterX, cy, cz + 0.166])));
    parts.push(sideWall.clone().applyMatrix4(mat4([frontCenterX, cy, cz - 0.166])));
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(cornerFillet.clone().applyMatrix4(mat4([frontCenterX, cy + sy * 0.132, cz + sz * 0.132], [Math.PI / 4, 0, 0])));
      }
    }
    parts.push(muzzleFlangeTop.clone().applyMatrix4(mat4([TUBE_X_FRONT - 0.026, cy + 0.176, cz])));
    parts.push(muzzleFlangeTop.clone().applyMatrix4(mat4([TUBE_X_FRONT - 0.026, cy - 0.176, cz])));
    parts.push(muzzleFlangeSide.clone().applyMatrix4(mat4([TUBE_X_FRONT - 0.026, cy, cz + 0.176])));
    parts.push(muzzleFlangeSide.clone().applyMatrix4(mat4([TUBE_X_FRONT - 0.026, cy, cz - 0.176])));
  }
  return merge(parts);
})();

// Vành khung đầu & đuôi tách biệt rõ 4 mô-đun quad-pack (2×2 cụm)
const QUAD_PACK_COLLARS_GEO = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const clusterCenters: [number, number][] = [
    [1.32, 0.54],
    [1.32, -0.54],
    [0.38, 0.54],
    [0.38, -0.54],
  ];
  const hCollar = rbox(0.11, 0.048, 0.88, 0.01);
  const vCollar = rbox(0.11, 0.88, 0.048, 0.01);
  for (const [qy, qz] of clusterCenters) {
    for (const cx of [TUBE_X_REAR + 0.055, TUBE_X_FRONT - 0.055]) {
      parts.push(hCollar.clone().applyMatrix4(mat4([cx, qy + 0.422, qz])));
      parts.push(hCollar.clone().applyMatrix4(mat4([cx, qy - 0.422, qz])));
      parts.push(vCollar.clone().applyMatrix4(mat4([cx, qy, qz + 0.422])));
      parts.push(vCollar.clone().applyMatrix4(mat4([cx, qy, qz - 0.422])));
    }
  }
  return merge(parts);
})();

// Gộp khung gân tăng cứng ngang dọc & lồng giằng chéo cho bệ M903
const QUAD_PACK_RIBS_GEO = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const clusterCenters: [number, number][] = [
    [1.32, 0.54],
    [1.32, -0.54],
    [0.38, 0.54],
    [0.38, -0.54],
  ];

  const ribXs = [-0.84, -0.10, 0.66, 1.42, 2.18, 2.94, 3.70, 4.38];
  const hBar = rbox(0.075, 0.036, 0.86, 0.008);
  const vBar = rbox(0.075, 0.86, 0.036, 0.008);
  const longStrut = rbox(TUBE_LEN - 0.06, 0.038, 0.038, 0.008);
  const midX = (TUBE_X_REAR + TUBE_X_FRONT) / 2;

  for (const [qy, qz] of clusterCenters) {
    for (const rx of ribXs) {
      parts.push(hBar.clone().applyMatrix4(mat4([rx, qy + 0.416, qz])));
      parts.push(hBar.clone().applyMatrix4(mat4([rx, qy - 0.416, qz])));
      parts.push(vBar.clone().applyMatrix4(mat4([rx, qy, qz + 0.416])));
      parts.push(vBar.clone().applyMatrix4(mat4([rx, qy, qz - 0.416])));
    }
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(longStrut.clone().applyMatrix4(mat4([midX, qy + sy * 0.410, qz + sz * 0.410])));
      }
    }
  }

  // Khung lồng ngoài cùng của bệ M903
  const outerSideBeam = rbox(TUBE_LEN - 0.10, 0.085, 0.075, 0.015);
  for (const sz of [-1.02, 1.02]) {
    parts.push(outerSideBeam.clone().applyMatrix4(mat4([midX, 1.77, sz])));
    parts.push(outerSideBeam.clone().applyMatrix4(mat4([midX, 0.85, sz])));
    parts.push(outerSideBeam.clone().applyMatrix4(mat4([midX, -0.04, sz])));
  }

  // Sống chữ thập trung tâm ngăn rõ 4 cụm quad-pack (lùi nhẹ 0.08 m so với mặt miệng ống để tạo khe âm đổ bóng rõ 2×2 cụm)
  parts.push(rbox(TUBE_LEN - 0.20, 1.74, 0.09, 0.015).clone().applyMatrix4(mat4([midX - 0.03, 0.85, 0])));
  parts.push(rbox(TUBE_LEN - 0.20, 0.085, 2.06, 0.015).clone().applyMatrix4(mat4([midX - 0.03, 0.85, 0])));

  // 7 cột khung đứng hai bên hông lồng giàn M903 + dầm ngang nóc
  const sidePost = rbox(0.085, 1.85, 0.072, 0.012);
  const topTie = rbox(0.085, 0.062, 2.10, 0.012);
  const postXs = [-0.82, 0.04, 0.90, 1.76, 2.62, 3.48, 4.34];
  for (const px of postXs) {
    parts.push(sidePost.clone().applyMatrix4(mat4([px, 0.86, 1.02])));
    parts.push(sidePost.clone().applyMatrix4(mat4([px, 0.86, -1.02])));
    parts.push(topTie.clone().applyMatrix4(mat4([px, 1.79, 0])));
  }

  // Thanh giằng chéo chữ W bên hông khung giàn M903
  const diagBrace = rbox(0.96, 0.046, 0.046, 0.008);
  for (let i = 0; i < postXs.length - 1; i++) {
    const mx = (postXs[i] + postXs[i + 1]) / 2;
    const ang = (i % 2 === 0 ? 1 : -1) * 0.45;
    for (const sz of [-1.02, 1.02]) {
      parts.push(diagBrace.clone().applyMatrix4(mat4([mx, 1.32, sz], [0, 0, ang])));
      parts.push(diagBrace.clone().applyMatrix4(mat4([mx, 0.40, sz], [0, 0, -ang])));
    }
  }

  // Hai dầm chính dưới đáy giàn + yên ngang chữ H chịu lực tại điểm kích xi-lanh nâng (CYL_TOP_CX)
  parts.push(rbox(5.05, 0.11, 0.15, 0.02).clone().applyMatrix4(mat4([1.68, -0.06, 0.62])));
  parts.push(rbox(5.05, 0.11, 0.15, 0.02).clone().applyMatrix4(mat4([1.68, -0.06, -0.62])));
  parts.push(rbox(0.36, 0.12, 1.56, 0.02).clone().applyMatrix4(mat4([CYL_TOP_CX, -0.06, 0])));

  return merge(parts);
})();

// Cánh tam giác mở bung ở miệng ống phóng khi đạn đã khai hoả: chân bản lề chạy tiếp tuyến theo Z, mũi nhọn chìa ra +X
const BLOWN_PETAL_GEO = extrudeTop([
  [0.0, -0.112],
  [0.115, -0.018],
  [0.115, 0.018],
  [0.0, 0.112],
], 0.012, 0.002);

// ---------------- Các cụm chi tiết con ----------------

/** Một chân chống thuỷ lực góc rơ-moóc vươn ra z = ±1.65, ty mạ thép sáng và đĩa đế tròn chạm đúng y = 0. */
const OutriggerLeg: React.FC<{ x: number; side: 1 | -1 }> = ({ x, side }) => {
  const mats = getMats();
  const zLeg = side * 1.65;
  return (
    <group>
      {/* Trụ hộp ngàm gắn cứng vào sườn khung rơ-moóc */}
      <mesh geometry={rbox(0.34, 0.56, 0.24, 0.02)} material={mats.bodyBox} position={[x, 0.88, side * 1.30]} castShadow />
      {/* Càng hộp vát vươn từ khung rơ-moóc (z = ±1.12) ra tâm xi-lanh (z = ±1.65) */}
      <mesh
        geometry={extrude(OUTRIGGER_ARM_PTS, 0.26, 0.018)}
        material={mats.chassisEx}
        position={[x, 0, side * 1.11]}
        rotation={[0, -side * (Math.PI / 2), 0]}
        castShadow
        receiveShadow
      />
      {/* Vạch cảnh báo an toàn vàng-ổm trên càng chân chống */}
      <mesh geometry={rbox(0.02, 0.08, 0.26, 0.003)} material={mats.amber} position={[x + 0.135, 0.96, side * 1.42]} />
      {/* Thanh giằng khoá chéo từ dưới gầm ra cổ xi-lanh */}
      <mesh
        geometry={pipe([
          [x + 0.12, 0.64, side * 1.22],
          [x + 0.04, 0.72, side * 1.58],
        ], 0.022, 12)}
        material={mats.steel}
        castShadow
      />
      {/* Chốt bản lề xoay càng */}
      <mesh position={[x, 0.90, side * 1.20]} material={mats.steel} castShadow>
        <cylinderGeometry args={[0.048, 0.048, 0.54, 14]} />
      </mesh>
      {/* Vỏ xi-lanh thuỷ lực đứng */}
      <mesh
        geometry={JACK_BARREL_GEO}
        material={mats.bodyBox}
        position={[x, 0, zLeg]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      />
      {/* Ống dẫn dầu thuỷ lực */}
      <mesh
        geometry={pipe([
          [x - 0.06, 1.06, side * 1.26],
          [x - 0.08, 1.34, side * 1.45],
          [x, 1.40, zLeg],
        ], 0.016, 18)}
        material={mats.darkSteel}
      />
      {/* Ty xi-lanh mạ thép sáng (plain(PAL3D.steel, 0.3, 0.8)) */}
      <mesh
        geometry={JACK_ROD_GEO}
        material={mats.chrome}
        position={[x, 0, zLeg]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      />
      {/* Đĩa đế tròn đặt sát mặt sàn y = 0.000 */}
      <mesh
        geometry={FOOT_PAD_GEO}
        material={mats.darkSteel}
        position={[x, 0, zLeg]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      />
      {/* 4 gân tăng cứng hướng tâm trên mặt đĩa đế */}
      {[0, 1, 2, 3].map((k) => (
        <mesh
          key={k}
          geometry={rbox(0.50, 0.036, 0.030, 0.005)}
          material={mats.steel}
          position={[x, 0.056, zLeg]}
          rotation={[0, (k * Math.PI) / 4, 0]}
          castShadow
        />
      ))}
    </group>
  );
};

/** Cụm cửa chớp tản nhiệt (khung viền thép + hốc tối + các lá chớp nghiêng). */
const LouverPanel: React.FC<{
  w: number;
  h: number;
  slats?: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ w, h, slats = 7, position, rotation = [0, 0, 0] }) => {
  const mats = getMats();
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={rbox(w + 0.05, h + 0.05, 0.022, 0.006)} material={mats.cageFrame} />
      <mesh geometry={rbox(w, h, 0.03, 0.006)} material={mats.boreDark} position={[0, 0, 0.004]} />
      {Array.from({ length: slats }, (_, i) => {
        const y = -h * 0.40 + (i / Math.max(1, slats - 1)) * (h * 0.80);
        return (
          <mesh
            key={i}
            geometry={rbox(w * 0.93, (h / slats) * 0.56, 0.036, 0.004)}
            material={mats.darkSteel}
            position={[0, y, 0.015]}
            rotation={[0.42, 0, 0]}
          />
        );
      })}
    </group>
  );
};

/** Xi-lanh thuỷ lực nâng giàn tự co giãn nối chính xác từ mâm xoay lên đáy giàn theo mọi góc `elev`. */
const ElevationCylinder: React.FC<{ elevRad: number; zSide: number }> = ({ elevRad, zSide }) => {
  const mats = getMats();
  const bx = HINGE_LX + CYL_TOP_CX * Math.cos(elevRad) - CYL_TOP_CY * Math.sin(elevRad);
  const by = HINGE_LY + CYL_TOP_CX * Math.sin(elevRad) + CYL_TOP_CY * Math.cos(elevRad);
  const dx = bx - CYL_BASE_LX;
  const dy = by - CYL_BASE_LY;
  const len = Math.max(0.45, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx);
  const barrelLen = Math.min(0.96, len * 0.63);

  const barrelGeo = useMemo(
    () =>
      lathe([
        [0.001, 0.03],
        [0.104, 0.03],
        [0.104, barrelLen - 0.06],
        [0.122, barrelLen - 0.06],
        [0.122, barrelLen],
        [0.066, barrelLen],
      ], 22),
    [barrelLen],
  );
  const rodGeo = useMemo(
    () =>
      lathe([
        [0.060, Math.max(0.08, barrelLen - 0.25)],
        [0.060, len - 0.035],
        [0.082, len - 0.035],
        [0.082, len + 0.025],
        [0.001, len + 0.025],
      ], 20),
    [barrelLen, len],
  );

  return (
    <group position={[CYL_BASE_LX, CYL_BASE_LY, zSide]} rotation={[0, 0, ang]}>
      {/* Gối đỡ tai dưới trên mâm xoay */}
      <mesh geometry={rbox(0.22, 0.20, 0.22, 0.02)} material={mats.cageFrame} position={[-0.02, -0.04, 0]} castShadow />
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.steel} castShadow>
        <cylinderGeometry args={[0.074, 0.074, 0.25, 16]} />
      </mesh>
      {/* Vỏ xi-lanh sơn quân sự + cổ đồng gạt bụi + ống dẫn thuỷ lực dọc thân */}
      <mesh geometry={barrelGeo} material={mats.bodyBox} castShadow />
      <mesh position={[barrelLen + 0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
        <cylinderGeometry args={[0.072, 0.072, 0.028, 18]} />
      </mesh>
      <mesh
        geometry={pipe([
          [0.08, 0.11, 0],
          [0.14, 0.13, 0],
          [barrelLen - 0.10, 0.13, 0],
          [barrelLen - 0.06, 0.10, 0],
        ], 0.012, 16)}
        material={mats.steel}
      />
      {/* Ty thuỷ lực mạ thép sáng nối thẳng tới chốt tai trên */}
      <mesh geometry={rodGeo} material={mats.chrome} castShadow />
      {/* Chốt tai trên bắt vào yên chữ H dưới đáy giàn */}
      <mesh position={[len, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.steel} castShadow>
        <cylinderGeometry args={[0.072, 0.072, 0.22, 16]} />
      </mesh>
    </group>
  );
};

// ---------------- Component chính: PatriotLauncher ----------------

export const PatriotLauncher: React.FC<PatriotLauncherProps> = ({
  azimuth = 0,
  elev = 38,
  loadedCount = 16,
  wheelSpin = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: PatriotLauncherProps = {}) => {
  const mats = getMats();
  const elevRad = (elev * Math.PI) / 180;
  const clampedLoaded = Math.max(0, Math.min(16, Math.floor(loadedCount)));

  const chassisRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let x = -2.55; x <= 1.40; x += 0.24) {
      pts.push([x, 0.74, 1.452], [x, 0.74, -1.452], [x, 0.58, 1.452], [x, 0.58, -1.452]);
    }
    for (let x = 2.05; x <= 4.75; x += 0.26) {
      pts.push([x, 1.34, 1.452], [x, 1.34, -1.452], [x, 1.10, 1.452], [x, 1.10, -1.452]);
    }
    for (let x = 2.52; x <= 4.46; x += 0.28) {
      pts.push([x, 1.46, -1.255], [x, 2.10, -1.255]);
    }
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([TT_X + Math.cos(a) * 0.94, 1.256, Math.sin(a) * 0.94]);
    }
    return pts;
  }, []);

  const launcherRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let x = -0.78; x <= 4.30; x += 0.34) {
      pts.push([x, 1.78, 1.06], [x, 1.78, -1.06], [x, 0.85, 1.06], [x, 0.85, -1.06], [x, -0.03, 1.06], [x, -0.03, -1.06]);
    }
    return pts;
  }, []);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ==================== 1. KHUNG SƠ-MI RƠ-MOÓC M860 (10.90 m × 2.90 m) ==================== */}

      {/* Hai dầm dọc chính chữ I chạy suốt chiều dài rơ-moóc */}
      {([-0.56, 0.56] as const).map((zBeam) => (
        <group key={zBeam} position={[0, 0, zBeam]}>
          <mesh geometry={extrude(IBEAM_WEB_PTS, 0.08, 0.01)} material={mats.chassisEx} castShadow receiveShadow />
          <mesh geometry={rbox(3.96, 0.048, 0.25, 0.008)} material={mats.cageFrame} position={[-0.48, 0.45, 0]} castShadow />
          <mesh geometry={rbox(3.96, 0.048, 0.25, 0.008)} material={mats.cageFrame} position={[-0.48, 0.75, 0]} castShadow />
          <mesh geometry={rbox(3.40, 0.048, 0.25, 0.008)} material={mats.cageFrame} position={[3.65, 1.05, 0]} castShadow />
        </group>
      ))}

      {/* Hai dầm biên sườn ngoài dày khoẻ tạo phom bậc cổ ngỗng M860 chắc nịch khi nhìn ngang */}
      {([-1.41, 1.41] as const).map((zSill) => (
        <mesh
          key={zSill}
          geometry={extrude(SIDE_SILL_PTS, 0.08, 0.012)}
          material={mats.chassisEx}
          position={[0, 0, zSill]}
          castShadow
          receiveShadow
        />
      ))}

      {/* Sàn khoang hạ bụng trung tâm (rộng khung 2.90 m: z = -1.45 .. +1.45) */}
      <mesh
        geometry={extrudeTop([
          [-2.76, -1.45],
          [1.68, -1.45],
          [1.68, 1.45],
          [-2.76, 1.45],
        ], 0.14, 0.015)}
        material={mats.chassisEx}
        position={[0, 0.63, 0]}
        castShadow
        receiveShadow
      />

      {/* Tấm dốc thép hướng luồng lửa tên lửa ở cuối khoang hạ bụng trước cụm trục bánh sau */}
      <mesh
        geometry={extrude(DECK_BLAST_RAMP_PTS, 1.42, 0.012)}
        material={mats.darkSteel}
        castShadow
        receiveShadow
      />

      {/* Dầm ngang chịu lực dưới khoang hạ bụng, thùng đồ cơ khí & bình khí nén phanh hơi */}
      {[-2.42, -1.80, -0.58, 0.48, 1.32].map((cx) => (
        <mesh key={cx} geometry={rbox(0.14, 0.18, 2.86, 0.015)} material={mats.cageFrame} position={[cx, 0.56, 0]} castShadow />
      ))}
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh geometry={rbox(0.88, 0.34, 0.42, 0.02)} material={mats.bodyBox} position={[0.48, 0.49, s * 1.15]} castShadow />
          <mesh geometry={rbox(0.78, 0.24, 0.025, 0.005)} material={mats.darkSteel} position={[0.48, 0.49, s * 1.37]} />
          <mesh geometry={rbox(0.12, 0.04, 0.03, 0.004)} material={mats.steel} position={[0.48, 0.51, s * 1.385]} />
        </group>
      ))}
      {/* Cặp bình tích áp khí nén phanh dưới gầm */}
      <mesh geometry={AIR_TANK_GEO} material={mats.darkSteel} position={[-2.25, 0.52, 0.88]} castShadow />
      <mesh geometry={AIR_TANK_GEO} material={mats.darkSteel} position={[-2.25, 0.52, -0.88]} castShadow />

      {/* Sàn bậc cổ ngỗng phía trước (+X: x = 1.90 .. 5.36, cao y = 1.24 .. 1.38) */}
      <mesh
        geometry={extrudeTop(GOOSENECK_DECK_PTS, 0.14, 0.016)}
        material={mats.chassisEx}
        position={[0, 1.24, 0]}
        castShadow
        receiveShadow
      />
      {/* Vách nghiêng chuyển bậc cổ ngỗng có bậc gân chống trượt */}
      <mesh
        geometry={rbox(0.68, 0.15, 2.86, 0.016)}
        material={mats.bodyBox}
        position={[1.72, 1.00, 0]}
        rotation={[0, 0, 0.86]}
        castShadow
      />

      {/* Mâm chốt kéo sơ-mi (kingpin) + chân chống phụ gập dưới cổ ngỗng + cản mũi đúng x = +5.45 m */}
      <mesh geometry={rbox(1.10, 0.08, 1.48, 0.015)} material={mats.darkSteel} position={[4.66, 1.01, 0]} castShadow />
      <mesh position={[4.72, 0.89, 0]} material={mats.steel} castShadow>
        <cylinderGeometry args={[0.058, 0.068, 0.22, 16]} />
      </mesh>
      {/* Chân đỡ phụ (dolly landing gear) gập ngang gọn sát gầm cổ ngỗng khi đã hạ 4 chân chống chính */}
      {([-0.92, 0.92] as const).map((zl) => (
        <group key={zl} position={[2.65, 1.00, zl]} rotation={[0, 0, 1.48]}>
          <mesh geometry={rbox(0.13, 0.62, 0.13, 0.015)} material={mats.darkSteel} castShadow />
          <mesh geometry={rbox(0.24, 0.05, 0.22, 0.01)} material={mats.steel} position={[0, -0.31, 0]} />
        </group>
      ))}
      <mesh geometry={rbox(0.12, 0.10, 1.76, 0.015)} material={mats.darkSteel} position={[2.38, 1.02, 0]} />
      {/* Lốp dự phòng treo ngang dưới gầm cổ ngỗng */}
      <group position={[3.55, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <Wheel r={0.48} width={0.30} tire={PAL3D.tire} rim="#566446" bolts={8} />
      </group>

      {/* Dầm cản mũi rơ-moóc đúng mốc x = +5.45 m + đầu nối hơi phanh đỏ/vàng */}
      <mesh geometry={rbox(0.18, 0.24, 2.12, 0.02)} material={mats.bodyBox} position={[5.36, 1.26, 0]} castShadow />
      <mesh geometry={rbox(0.08, 0.14, 0.38, 0.015)} material={mats.darkSteel} position={[5.41, 1.26, 0]} castShadow />
      <mesh position={[5.41, 1.31, 0.38]} rotation={[0, 0, Math.PI / 2]} material={mats.tailRed}>
        <cylinderGeometry args={[0.038, 0.038, 0.08, 12]} />
      </mesh>
      <mesh position={[5.41, 1.31, -0.38]} rotation={[0, 0, Math.PI / 2]} material={mats.amber}>
        <cylinderGeometry args={[0.038, 0.038, 0.08, 12]} />
      </mesh>

      {/* Cụm sàn sau & vè chắn bùn vát trên 2 trục bánh đôi + cản đuôi đúng mốc x = -5.45 m */}
      <mesh geometry={rbox(2.68, 0.16, 1.42, 0.018)} material={mats.bodyBox} position={[-4.06, 1.03, 0]} castShadow receiveShadow />
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh
            geometry={extrude(FENDER_PTS, 0.74, 0.014)}
            material={mats.chassisEx}
            position={[0, 0, s * 1.08]}
            castShadow
            receiveShadow
          />
          <mesh geometry={rbox(0.025, 0.44, 0.68, 0.005)} material={mats.rubber} position={[-5.33, 0.48, s * 1.08]} castShadow />
          {/* Đèn phản quang sườn vè bánh */}
          <mesh geometry={rbox(0.10, 0.04, 0.015, 0.003)} material={mats.amber} position={[-3.05, 1.11, s * 1.455]} />
          <mesh geometry={rbox(0.10, 0.04, 0.015, 0.003)} material={mats.tailRed} position={[-4.95, 1.11, s * 1.455]} />
        </group>
      ))}
      {/* Cản sau rơ-moóc tại x = -5.45 m kèm cụm đèn hậu quân sự & móc kéo sau */}
      <mesh geometry={rbox(0.20, 0.26, 2.90, 0.02)} material={mats.bodyBox} position={[-5.35, 0.94, 0]} castShadow />
      <mesh geometry={rbox(0.12, 0.14, 0.26, 0.02)} material={mats.darkSteel} position={[-5.41, 0.92, 0]} />
      {([-1.16, 1.16] as const).map((zt) => (
        <group key={zt} position={[-5.44, 0.94, zt]}>
          <mesh geometry={rbox(0.04, 0.13, 0.30, 0.008)} material={mats.darkSteel} />
          <mesh geometry={rbox(0.03, 0.075, 0.11, 0.006)} material={mats.tailRed} position={[-0.014, 0, 0.065]} />
          <mesh geometry={rbox(0.03, 0.075, 0.09, 0.006)} material={mats.amber} position={[-0.014, 0, -0.075]} />
        </group>
      ))}

      {/* ==================== 2. HAI TRỤC BÁNH ĐÔI PHÍA SAU (x = -3.4, -4.6; r = 0.54 chạm y = 0) ==================== */}
      {([-3.4, -4.6] as const).map((ax) => (
        <group key={ax}>
          <mesh position={[ax, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.darkSteel} castShadow>
            <cylinderGeometry args={[0.078, 0.078, 2.52, 16]} />
          </mesh>
          <mesh geometry={rbox(0.26, 0.25, 0.30, 0.04)} material={mats.darkSteel} position={[ax, 0.54, 0]} />
          {/* Bánh đôi bên phải (+Z) */}
          <Wheel r={0.54} width={0.34} spin={wheelSpin} tire={PAL3D.tire} rim="#627250" bolts={10} position={[ax, 0.54, 0.88]} />
          <Wheel r={0.54} width={0.34} spin={wheelSpin} tire={PAL3D.tire} rim="#627250" bolts={10} position={[ax, 0.54, 1.25]} />
          {/* Bánh đôi bên trái (-Z, xoay 180° quanh Y để mặt la-zăng & ốc hướng ra ngoài) */}
          <group position={[ax, 0.54, -0.88]} rotation={[0, Math.PI, 0]}>
            <Wheel r={0.54} width={0.34} spin={-wheelSpin} tire={PAL3D.tire} rim="#627250" bolts={10} />
          </group>
          <group position={[ax, 0.54, -1.25]} rotation={[0, Math.PI, 0]}>
            <Wheel r={0.54} width={0.34} spin={-wheelSpin} tire={PAL3D.tire} rim="#627250" bolts={10} />
          </group>
        </group>
      ))}
      {/* Cụm nhíp & dầm cân bằng bogie giữa 2 trục bánh */}
      {([-0.58, 0.58] as const).map((zs) => (
        <group key={zs} position={[-4.0, 0.66, zs]}>
          <mesh geometry={rbox(1.44, 0.15, 0.14, 0.02)} material={mats.darkSteel} castShadow />
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.steel}>
            <cylinderGeometry args={[0.088, 0.088, 0.19, 16]} />
          </mesh>
        </group>
      ))}

      {/* ==================== 3. BỐN CHÂN CHỐNG THUỶ LỰC GÓC RƠ-MOÓC (z = ±1.65, đế chạm y = 0) ==================== */}
      <OutriggerLeg x={1.64} side={1} />
      <OutriggerLeg x={1.64} side={-1} />
      <OutriggerLeg x={-5.10} side={1} />
      <OutriggerLeg x={-5.10} side={-1} />

      {/* ==================== 4. CỤM MÁY PHÁT ĐIỆN DIESEL, BÌNH NHIÊN LIỆU & LAN CAN CỔ NGỖNG ==================== */}
      <mesh
        geometry={extrude(GEN_HOUSING_PTS, 1.56, 0.025)}
        material={mats.bodyEx}
        position={[0, 0, -0.46]}
        castShadow
        receiveShadow
      />
      <LouverPanel w={0.78} h={0.54} slats={8} position={[3.04, 1.82, -1.245]} rotation={[0, Math.PI, 0]} />
      <LouverPanel w={0.78} h={0.54} slats={8} position={[3.96, 1.82, -1.245]} rotation={[0, Math.PI, 0]} />
      <LouverPanel w={1.12} h={0.52} slats={7} position={[4.585, 1.80, -0.46]} rotation={[0, Math.PI / 2, 0]} />
      <LouverPanel w={0.98} h={0.74} slats={8} position={[3.48, 2.365, -0.46]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* Cửa khoang bảo dưỡng bên phải máy phát */}
      <mesh geometry={rbox(1.58, 0.64, 0.03, 0.008)} material={mats.cageFrame} position={[3.50, 1.78, 0.325]} />
      <mesh geometry={rbox(0.14, 0.05, 0.04, 0.006)} material={mats.brass} position={[3.10, 1.80, 0.34]} />
      <mesh geometry={rbox(0.14, 0.05, 0.04, 0.006)} material={mats.brass} position={[3.92, 1.80, 0.34]} />

      {/* Ống xả đứng có bọc lưới cách nhiệt & nắp chụp cong */}
      <mesh
        geometry={MUFFLER_GEO}
        material={mats.darkSteel}
        position={[4.26, 2.26, -1.04]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      />
      <mesh
        geometry={pipe([
          [4.26, 2.16, -1.04],
          [4.26, 2.90, -1.04],
          [4.35, 3.02, -1.08],
        ], 0.044, 20)}
        material={mats.steel}
        castShadow
      />

      {/* Bình nhiên liệu diesel hình trụ + đai thép sáng giữ + nắp đồng trên sườn phải cổ ngỗng */}
      <mesh
        geometry={FUEL_TANK_GEO}
        material={mats.cageFrame}
        position={[2.22, 1.66, 0.86]}
        castShadow
        receiveShadow
      />
      {([2.52, 3.18] as const).map((fx) => (
        <group key={fx} position={[fx, 1.66, 0.86]}>
          <mesh rotation={[0, Math.PI / 2, 0]} material={mats.steel} castShadow>
            <cylinderGeometry args={[0.272, 0.272, 0.048, 24]} />
          </mesh>
          <mesh geometry={rbox(0.12, 0.14, 0.48, 0.01)} material={mats.darkSteel} position={[0, -0.22, 0]} />
        </group>
      ))}
      <mesh position={[2.86, 1.94, 0.86]} material={mats.brass} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 14]} />
      </mesh>

      {/* Tủ điều khiển điện tử & phân phối nguồn (DLT / Power Distribution Box) phía trước bình dầu */}
      <mesh geometry={rbox(0.94, 0.74, 0.68, 0.025)} material={mats.bodyBox} position={[4.18, 1.75, 0.86]} castShadow receiveShadow />
      <mesh geometry={rbox(0.68, 0.46, 0.03, 0.006)} material={mats.darkSteel} position={[4.18, 1.77, 1.205]} />
      <mesh geometry={rbox(0.24, 0.13, 0.035, 0.005)} material={mats.brass} position={[4.36, 1.89, 1.21]} />
      {/* Ống cáp nguồn bọc giáp dẫn từ máy phát/tủ điện về mâm xoay */}
      <mesh
        geometry={pipe([
          [3.72, 1.48, 0.64],
          [2.10, 1.42, 0.56],
          [1.45, 0.82, 0.48],
          [-0.22, 0.82, 0.42],
        ], 0.034, 32)}
        material={mats.darkSteel}
        castShadow
      />

      {/* Lan can / tay vịn ống thép (pipe) quanh sàn cổ ngỗng + thang leo bên sườn */}
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh
            geometry={pipe([
              [2.02, 1.38, s * 1.36],
              [2.02, 2.14, s * 1.36],
              [4.78, 2.14, s * 1.36],
              [5.18, 2.04, s * 1.00],
              [5.18, 1.38, s * 1.00],
            ], 0.024, 36)}
            material={mats.quadCollar}
            castShadow
          />
          <mesh
            geometry={pipe([
              [2.02, 1.76, s * 1.36],
              [4.78, 1.76, s * 1.36],
              [5.18, 1.70, s * 1.00],
            ], 0.018, 24)}
            material={mats.quadCollar}
          />
          {[2.95, 3.88, 4.78].map((px) => (
            <mesh key={px} position={[px, 1.76, s * 1.36]} material={mats.quadCollar} castShadow>
              <cylinderGeometry args={[0.021, 0.021, 0.76, 10]} />
            </mesh>
          ))}
        </group>
      ))}
      {[0.80, 1.03, 1.26].map((ly) => (
        <mesh key={ly} geometry={rbox(0.34, 0.030, 0.13, 0.005)} material={mats.steel} position={[2.04, ly, 1.45]} />
      ))}

      {/* Đinh tán khung rơ-moóc, vỏ máy phát & cổ đế mâm xoay */}
      <Rivets points={chassisRivets} r={0.017} color="#82926c" />

      {/* ==================== 5. ĐẾ MÂM XOAY & MÂM XOAY TRÒN (x = -1.16, y = 1.25) ==================== */}
      <mesh
        geometry={PEDESTAL_GEO}
        material={mats.bodyBox}
        position={[TT_X, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      />
      <mesh position={[TT_X, 1.21, 0]} material={mats.darkSteel} castShadow>
        <cylinderGeometry args={[0.945, 0.945, 0.075, 40]} />
      </mesh>

      {/* Khối xoay theo góc phương vị `azimuth` quanh trục Y */}
      <group position={[TT_X, TT_Y, 0]} rotation={[0, azimuth, 0]}>
        <mesh
          geometry={TURNTABLE_DISC_GEO}
          material={mats.bodyBox}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
          receiveShadow
        />
        {([-0.74, 0.74] as const).map((zc) => (
          <mesh
            key={zc}
            geometry={extrude(TT_CHEEK_PTS, 0.12, 0.015)}
            material={mats.bodyEx}
            position={[0, 0, zc]}
            castShadow
            receiveShadow
          />
        ))}
        {/* Dầm hộp ngang liên kết hai má bệ trên mâm xoay + mô-tơ quay phương vị & tang cuốn cáp */}
        <mesh geometry={rbox(0.98, 0.17, 1.38, 0.02)} material={mats.bodyBox} position={[0.10, 0.14, 0]} castShadow />
        <mesh geometry={rbox(0.56, 0.34, 0.38, 0.025)} material={mats.cageFrame} position={[-0.04, 0.25, 0.95]} castShadow />
        <mesh position={[0.12, 0.36, 0.95]} material={mats.steel} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.25, 18]} />
        </mesh>
        <mesh position={[-0.10, 0.29, -0.95]} rotation={[Math.PI / 2, 0, 0]} material={mats.darkSteel} castShadow>
          <cylinderGeometry args={[0.21, 0.21, 0.19, 22]} />
        </mesh>

        {/* Trục chốt bản lề chính nâng giàn tại (HINGE_LX, HINGE_LY) */}
        <mesh position={[HINGE_LX, HINGE_LY, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.steel} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 1.70, 20]} />
        </mesh>

        {/* Hai xi-lanh thuỷ lực nâng giàn nối liền từ mâm xoay lên đáy giàn theo đúng `elev` */}
        <ElevationCylinder elevRad={elevRad} zSide={CYL_Z} />
        <ElevationCylinder elevRad={elevRad} zSide={-CYL_Z} />

        {/* ==================== 6. KHUNG GIÀN PHÓNG M903 (4 CỤM QUAD-PACK = 16 ỐNG DÀI 5.40 m) ==================== */}
        <group position={[HINGE_LX, HINGE_LY, 0]} rotation={[0, 0, elevRad]}>
          {/* Tai bản lề dưới đáy giàn ôm khớp (0, 0) & tai bắt đỉnh xi-lanh nâng tại (CYL_TOP_CX, CYL_TOP_CY) */}
          {([-0.74, 0.74] as const).map((zh) => (
            <mesh key={zh} geometry={rbox(0.34, 0.28, 0.11, 0.02)} material={mats.cageFrame} position={[0, 0.02, zh]} castShadow />
          ))}
          {([-CYL_Z, CYL_Z] as const).map((zc) => (
            <mesh key={zc} geometry={rbox(0.30, 0.22, 0.18, 0.02)} material={mats.cageFrame} position={[CYL_TOP_CX, CYL_TOP_CY + 0.02, zc]} castShadow />
          ))}

          {/* Thân 16 ống phóng dài 5.40 m (gộp tĩnh) */}
          <mesh geometry={SIXTEEN_TUBES_BODY_GEO} material={mats.canister} castShadow receiveShadow />

          {/* Vành mô-đun đầu & đuôi tách khối rõ 4 cụm quad-pack (2×2 cụm) */}
          <mesh geometry={QUAD_PACK_COLLARS_GEO} material={mats.quadCollar} castShadow receiveShadow />

          {/* Khung lồng + gân tăng cứng ngang dọc 4 cụm quad-pack */}
          <mesh geometry={QUAD_PACK_RIBS_GEO} material={mats.cageFrame} castShadow receiveShadow />

          {/* Hộp cáp điện tử liên kết đạn hai bên hông giàn + ống dẫn cáp bọc thép */}
          {([-1, 1] as const).map((s) => (
            <group key={s}>
              <mesh geometry={rbox(1.20, 0.26, 0.16, 0.02)} material={mats.bodyBox} position={[1.28, 0.85, s * 1.12]} castShadow />
              <mesh geometry={rbox(0.74, 0.22, 0.14, 0.018)} material={mats.bodyBox} position={[3.02, 0.85, s * 1.11]} castShadow />
              <mesh geometry={rbox(0.20, 0.11, 0.02, 0.004)} material={mats.brass} position={[1.28, 0.88, s * 1.20]} />
              <mesh
                geometry={pipe([
                  [-0.76, 0.85, s * 1.08],
                  [0.68, 0.85, s * 1.11],
                  [2.65, 0.85, s * 1.11],
                  [3.42, 0.85, s * 1.09],
                ], 0.024, 24)}
                material={mats.darkSteel}
              />
              {/* 2 tai móc cẩu nạp đạn trên đỉnh mỗi bên cụm giàn */}
              {([-0.38, 3.84] as const).map((lx) => (
                <mesh key={lx} geometry={rbox(0.18, 0.13, 0.055, 0.015)} material={mats.steel} position={[lx, 1.86, s * 0.96]} castShadow />
              ))}
            </group>
          ))}

          {/* Tấm chắn / hướng lửa đuôi dưới đáy sau giàn M903 */}
          <mesh
            geometry={extrude(BLAST_DEFLECTOR_PTS, 2.08, 0.012)}
            material={mats.darkSteel}
            castShadow
            receiveShadow
          />

          {/* Đinh tán dọc lồng khung giàn M903 */}
          <Rivets points={launcherRivets} r={0.016} color="#869670" />

          {/* Chi tiết riêng từng ống trong 16 ống: cổ thoát lửa đuôi + đóng/mở nắp trước theo `loadedCount` */}
          {TUBE_SLOTS.map(([cy, cz], idx) => {
            const isLoaded = idx < clampedLoaded;
            return (
              <group key={idx} position={[0, cy, cz]}>
                {/* Vành cổ thoát khí thuốc phóng phía đuôi ống */}
                <mesh geometry={AFT_NOZZLE_RING_GEO} material={mats.darkSteel} castShadow />
                <mesh position={[TUBE_X_REAR - 0.015, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.boreDark}>
                  <cylinderGeometry args={[0.116, 0.116, 0.03, 18]} />
                </mesh>

                {/* Lòng ống lót tròn tối sâu (#171a1f) luôn nằm sẵn bên trong 0.96 m đầu ống */}
                <mesh geometry={BORE_SLEEVE_GEO} material={mats.boreDark} />
                <mesh position={[TUBE_X_FRONT - 0.955, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.boreDeep}>
                  <cylinderGeometry args={[0.147, 0.147, 0.02, 20]} />
                </mesh>

                {isLoaded ? (
                  /* ỐNG CÒN ĐẠN (idx < loadedCount): vành tròn bắt bu-lông + nắp chắn trước màu ô-liu có gân chéo chữ X kín */
                  <group>
                    <mesh geometry={MUZZLE_BOLT_RING_GEO} material={mats.cageFrame} castShadow />
                    <group position={[TUBE_X_FRONT - 0.010, 0, 0]}>
                      <mesh geometry={rbox(0.024, 0.304, 0.304, 0.014)} material={mats.capOlive} castShadow receiveShadow />
                      {/* Gân chéo chữ X + gân chữ thập trên mặt nắp */}
                      <mesh geometry={rbox(0.018, 0.38, 0.026, 0.005)} material={mats.capRib} position={[0.011, 0, 0]} rotation={[Math.PI / 4, 0, 0]} />
                      <mesh geometry={rbox(0.018, 0.38, 0.026, 0.005)} material={mats.capRib} position={[0.011, 0, 0]} rotation={[-Math.PI / 4, 0, 0]} />
                      <mesh geometry={rbox(0.014, 0.29, 0.018, 0.004)} material={mats.capRib} position={[0.009, 0, 0]} />
                      <mesh geometry={rbox(0.014, 0.018, 0.29, 0.004)} material={mats.capRib} position={[0.009, 0, 0]} />
                      <mesh position={[0.016, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.darkSteel}>
                        <cylinderGeometry args={[0.036, 0.040, 0.018, 14]} />
                      </mesh>
                      <mesh geometry={rbox(0.008, 0.028, 0.068, 0.002)} material={mats.brass} position={[0.014, 0.110, 0.080]} />
                    </group>
                  </group>
                ) : (
                  /* ỐNG ĐÃ BẮN RỖNG (idx >= loadedCount): mở tung nắp lộ lòng ống tối sâu #171a1f, vành ám khói đen & 4 cánh rách bung */
                  <group>
                    <mesh geometry={rbox(0.012, 0.036, 0.36, 0.004)} material={mats.sootBezel} position={[TUBE_X_FRONT + 0.002, 0.162, 0]} />
                    <mesh geometry={rbox(0.012, 0.036, 0.36, 0.004)} material={mats.sootBezel} position={[TUBE_X_FRONT + 0.002, -0.162, 0]} />
                    <mesh geometry={rbox(0.012, 0.29, 0.036, 0.004)} material={mats.sootBezel} position={[TUBE_X_FRONT + 0.002, 0, 0.162]} />
                    <mesh geometry={rbox(0.012, 0.29, 0.036, 0.004)} material={mats.sootBezel} position={[TUBE_X_FRONT + 0.002, 0, -0.162]} />

                    {/* Vành miệng tròn ám khói đen cháy sém */}
                    <mesh geometry={SOOT_COLLAR_GEO} material={mats.soot} />

                    {/* 4 ray dẫn hướng kim loại chạy sâu bên trong lòng ống rỗng */}
                    {[0, 1, 2, 3].map((rk) => {
                      const ra = (rk * Math.PI) / 2 + Math.PI / 4;
                      return (
                        <mesh
                          key={rk}
                          geometry={rbox(0.88, 0.016, 0.016, 0.003)}
                          material={mats.darkSteel}
                          position={[TUBE_X_FRONT - 0.46, Math.cos(ra) * 0.138, Math.sin(ra) * 0.138]}
                          rotation={[ra, 0, 0]}
                        />
                      );
                    })}

                    {/* 4 cánh nắp tam giác rách bung ra ngoài (+0.38 rad hướng tâm ra ngoài) quanh chu vi miệng ống */}
                    {[0, 1, 2, 3].map((pk) => {
                      const pa = (pk * Math.PI) / 2;
                      return (
                        <group key={pk} position={[TUBE_X_FRONT + 0.006, 0, 0]} rotation={[pa, 0, 0]}>
                          <mesh
                            geometry={BLOWN_PETAL_GEO}
                            material={mats.soot}
                            position={[0, 0.146, 0]}
                            rotation={[0, 0, 0.38]}
                            castShadow
                          />
                        </group>
                      );
                    })}
                  </group>
                )}
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
};

export const MODELS: ModelSet = {
  PatriotLauncher: { C: PatriotLauncher as React.FC, size: 11, center: [0, 2.2, 0] },
};
