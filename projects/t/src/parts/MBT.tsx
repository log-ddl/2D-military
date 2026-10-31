// Mô hình 3D Xe tăng chủ lực hiện đại thế hệ 3+ (lai M1A2 SEP v3 / Leopard 2A7A1) — tỉ lệ thật 1:1 mét.
// Quy ước trục: Mũi xe hướng +X, đỉnh +Y, sườn phải +Z, mặt dưới dải xích chạm đất tại y = 0.
// Kích thước: Thân dài ~7.90 m (-4.05 .. +3.85), rộng ~3.70 m (-1.85 .. +1.85), cao nóc tháp ~2.46 m,
// tổng dài cả pháo 120mm L/55 ~9.85 m (-4.05 .. +5.80).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mix } from '@core/time';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets, Track, Wheel } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';

// Đồng bộ chính xác bảng mã màu THEME của dự án `t` (src/design/index.ts)
const THEME = {
  armorBase: '#4c5642',
  armorCamo1: '#353d30',
  armorCamo2: '#6e6850',
  armorDark: '#262b24',
  steelRaw: '#8b95a1',
  steelDark: '#39414a',
  rubber: '#1f2124',
  armorStrong: '#38b6ff',
  armorWeak: '#ff4d2e',
  apsCyan: '#00e5ff',
} as const;

export type MBTProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  turretYaw?: number;      // góc xoay tháp pháo quanh Y (rad), mặc định 0
  gunPitch?: number;       // góc nâng nòng pháo (rad, dương = nâng lên), mặc định 0.03
  recoil?: number;         // độ giật lùi nòng pháo (m, 0..0.45), mặc định 0
  travel?: number;         // quãng đường xe lăn bánh (m) cho Track & Wheel
  highlightZone?: 'none' | 'front' | 'weak' | 'both'; // tô sáng vùng giáp giải phẫu
  explodeAmt?: number;     // 0..1 tách lớp vỏ giáp lơ lửng (cho cảnh Exploded-View S06)
  charred?: number;        // 0..1 mức cháy xém hư hỏng
  aps?: boolean;           // gắn 4 mặt radar AESA + 2 bệ phóng APS trên tháp pháo
  apsYaw?: number;         // góc xoay bệ phóng APS (rad)
};

// -------------------- BIÊN DẠNG HÌNH HỌC TỈ LỆ THẬT (1 ĐƠN VỊ = 1 MÉT) --------------------

// Thân giữa (hull tub), chừa hốc trước cho khối giáp composite mũi (~0.85 m) và hốc trên cho nắp động cơ mỏng (0.035 m)
const HULL_CORE_PTS: P2[] = [
  [-3.30, 0.46],
  [-3.70, 0.56],
  [-3.96, 0.74],
  [-4.03, 0.92],
  [-4.03, 1.36],
  [-3.95, 1.48],
  [-3.88, 1.48],
  [-3.86, 1.455],
  [-1.60, 1.455],
  [-1.56, 1.49],
  [-1.50, 1.49],
  [-1.38, 1.43],
  [1.68, 1.43],
  [1.82, 1.35],
  [2.94, 0.87],
  [2.64, 0.46],
];

// Khối giáp composite mũi xe (Glacis) dày ~0.82–0.89 m theo phương ngang, ≥22 điểm vát mượt kiểu M1A2 / Leopard 2A7
const FRONT_GLACIS_PTS: P2[] = [
  [1.66, 1.435],
  [1.92, 1.398],
  [2.18, 1.354],
  [2.44, 1.306],
  [2.70, 1.254],
  [2.96, 1.198],
  [3.20, 1.144],
  [3.40, 1.094],
  [3.56, 1.050],
  [3.68, 1.010],
  [3.76, 0.974],
  [3.805, 0.942],
  [3.832, 0.908],
  [3.842, 0.874],
  [3.834, 0.840],
  [3.808, 0.806],
  [3.755, 0.766],
  [3.66, 0.718],
  [3.50, 0.658],
  [3.26, 0.584],
  [2.96, 0.506],
  [2.64, 0.462],
  [2.94, 0.872],
  [1.82, 1.352],
];

// Hốc sườn trên dải xích (Upper Hull Sponson) kèm chắn bùn trước/sau, đáy cao y=0.87 không chạm xích
const SPONSON_PTS: P2[] = [
  [-4.02, 1.02],
  [-4.02, 1.36],
  [-3.92, 1.47],
  [-1.52, 1.47],
  [-1.38, 1.42],
  [1.68, 1.42],
  [2.35, 1.30],
  [3.02, 1.16],
  [3.52, 1.05],
  [3.74, 0.97],
  [3.84, 0.88],
  [3.82, 0.77],
  [3.66, 0.84],
  [3.48, 0.88],
  [-3.52, 0.88],
  [-3.74, 0.84],
  [-3.90, 0.78],
];

// Váy giáp sườn (Armored Side Skirt): phần trước dày bảo vệ khoang lái, phần sau vát cao lộ bánh chủ động răng
const SIDE_SKIRT_PTS: P2[] = [
  [-3.82, 0.84],
  [-3.82, 1.02],
  [3.54, 1.02],
  [3.72, 0.94],
  [3.62, 0.62],
  [3.35, 0.48],
  [0.85, 0.48],
  [0.68, 0.55],
  [-2.78, 0.55],
  [-3.06, 0.76],
];

// Mặt bằng thân chính tháp pháo + khoang đạn bustle dài phía sau (22 điểm đối xứng Z)
const TURRET_UPPER_PLAN: P2[] = [
  [0.92, -0.42],
  [0.78, -0.82],
  [0.62, -1.24],
  [0.48, -1.48],
  [0.10, -1.50],
  [-0.55, -1.48],
  [-1.22, -1.43],
  [-1.88, -1.35],
  [-2.36, -1.24],
  [-2.54, -1.02],
  [-2.58, -0.54],
  [-2.58, 0.54],
  [-2.54, 1.02],
  [-2.36, 1.24],
  [-1.88, 1.35],
  [-1.22, 1.43],
  [-0.55, 1.48],
  [0.10, 1.50],
  [0.48, 1.48],
  [0.62, 1.24],
  [0.78, 0.82],
  [0.92, 0.42],
];

// Chân đế khoang chiến đấu tháp pháo (ôm cổ tháp, chừa gầm khoang đạn sau cao hơn nắp động cơ)
const TURRET_BASE_PLAN: P2[] = [
  [0.90, -0.44],
  [0.62, -1.26],
  [0.44, -1.46],
  [-0.48, -1.46],
  [-0.96, -1.32],
  [-1.08, -0.92],
  [-1.08, 0.92],
  [-0.96, 1.32],
  [-0.48, 1.46],
  [0.44, 1.46],
  [0.62, 1.26],
  [0.90, 0.44],
];

// Tấm giáp nóc tháp pháo mỏng (~0.04 m) khớp khít mép sau hai má giáp nêm trước
const TURRET_ROOF_PLAN: P2[] = [
  [0.93, -0.42],
  [0.72, -0.94],
  [0.49, -1.46],
  [-0.55, -1.45],
  [-1.22, -1.40],
  [-1.88, -1.32],
  [-2.34, -1.21],
  [-2.50, -0.98],
  [-2.54, -0.52],
  [-2.54, 0.52],
  [-2.50, 0.98],
  [-2.34, 1.21],
  [-1.88, 1.32],
  [-1.22, 1.40],
  [-0.55, 1.45],
  [0.49, 1.46],
  [0.72, 0.94],
  [0.93, 0.42],
];

// Mặt cắt 20 điểm chuẩn của khối nêm giáp composite má trước tháp pháo (u=0 vách sau -> u=1 đỉnh nêm, y=0.08..0.895)
const CHEEK_SECTION_20: P2[] = [
  [0.00, 0.085],
  [0.15, 0.098],
  [0.30, 0.142],
  [0.45, 0.202],
  [0.59, 0.268],
  [0.72, 0.336],
  [0.83, 0.398],
  [0.915, 0.450],
  [0.972, 0.488],
  [1.000, 0.515],
  [0.994, 0.542],
  [0.955, 0.574],
  [0.880, 0.618],
  [0.775, 0.670],
  [0.650, 0.726],
  [0.510, 0.782],
  [0.365, 0.830],
  [0.225, 0.866],
  [0.100, 0.888],
  [0.000, 0.895],
];

/**
 * Dựng khối giáp nêm mũi tên 3D nguyên khối (Lofted Arrowhead Composite Cheek, 20 điểm mượt)
 * ăn khớp tuyệt đối với vách sườn tháp pháo (ngoài) và hốc khiên pháo (trong), UV chuẩn 1 m = 1 UV.
 */
const buildArrowheadCheek = (side: 1 | -1): THREE.BufferGeometry => {
  const STATIONS = [0, 0.34, 0.68, 1];
  const nProf = CHEEK_SECTION_20.length;
  const ringPt = (t: number, u: number, y: number): [number, number, number] => {
    const xRear = 0.92 + (0.48 - 0.92) * t;
    const bow = Math.sin(t * Math.PI) * 0.04;
    const xFront = 2.12 + (1.46 - 2.12) * t + bow;
    const zRear = 0.42 + (1.48 - 0.42) * t;
    const zFront = 0.45 + (1.37 - 0.45) * t;
    const x = xRear + (xFront - xRear) * u;
    const z = (zRear + (zFront - zRear) * u) * side;
    return [x, y, z];
  };

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  const pushVert = (p: [number, number, number], uv: [number, number]) => {
    const vi = pos.length / 3;
    pos.push(p[0], p[1], p[2]);
    uvs.push(uv[0], uv[1]);
    return vi;
  };
  const pushTri = (a: number, b: number, c: number) => {
    if (side === 1) idx.push(a, b, c);
    else idx.push(a, c, b);
  };

  // 1) Dải vỏ nêm uốn mượt qua 20 điểm biên dạng (tách đỉnh vách sau để cạnh sau phẳng sắc nét)
  const grid: number[][] = [];
  for (let si = 0; si < STATIONS.length; si++) {
    const t = STATIONS[si];
    const row: number[] = [];
    for (let pi = 0; pi < nProf; pi++) {
      const [u, y] = CHEEK_SECTION_20[pi];
      const p = ringPt(t, u, y);
      row.push(pushVert(p, [p[0], Math.abs(p[2]) + p[1] * 0.55]));
    }
    grid.push(row);
  }
  for (let si = 0; si < STATIONS.length - 1; si++) {
    for (let pi = 0; pi < nProf - 1; pi++) {
      const a = grid[si][pi];
      const b = grid[si][pi + 1];
      const c = grid[si + 1][pi + 1];
      const d = grid[si + 1][pi];
      pushTri(a, b, c);
      pushTri(a, c, d);
    }
  }

  // 2) Vách cắt phẳng phía sau (lộ độ dày composite ~0.85–1.15 m khi explodeAmt > 0)
  for (let si = 0; si < STATIONS.length - 1; si++) {
    const t0 = STATIONS[si];
    const t1 = STATIONS[si + 1];
    const p00 = ringPt(t0, CHEEK_SECTION_20[nProf - 1][0], CHEEK_SECTION_20[nProf - 1][1]);
    const p01 = ringPt(t0, CHEEK_SECTION_20[0][0], CHEEK_SECTION_20[0][1]);
    const p11 = ringPt(t1, CHEEK_SECTION_20[0][0], CHEEK_SECTION_20[0][1]);
    const p10 = ringPt(t1, CHEEK_SECTION_20[nProf - 1][0], CHEEK_SECTION_20[nProf - 1][1]);
    const a = pushVert(p00, [Math.abs(p00[2]), p00[1]]);
    const b = pushVert(p01, [Math.abs(p01[2]), p01[1]]);
    const c = pushVert(p11, [Math.abs(p11[2]), p11[1]]);
    const d = pushVert(p10, [Math.abs(p10[2]), p10[1]]);
    pushTri(a, b, c);
    pushTri(a, c, d);
  }

  // 3) Hai mặt nắp sườn trong (t=0) và sườn ngoài (t=1) phẳng sắc cạnh
  for (const [t, outward] of [
    [0, false],
    [1, true],
  ] as const) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    const ringPts = CHEEK_SECTION_20.map(([u, y]) => {
      const p = ringPt(t, u, y);
      cx += p[0];
      cy += p[1];
      cz += p[2];
      return p;
    });
    cx /= nProf;
    cy /= nProf;
    cz /= nProf;
    const cVi = pushVert([cx, cy, cz], [cx, cy]);
    const rVis = ringPts.map((p) => pushVert(p, [p[0], p[1]]));
    for (let pi = 0; pi < nProf; pi++) {
      const ni = (pi + 1) % nProf;
      if (outward) pushTri(cVi, rVis[pi], rVis[ni]);
      else pushTri(cVi, rVis[ni], rVis[pi]);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// Biên dạng tiện tròn nòng pháo 120mm L/55 (dọc +X từ x=0.22 tới mũi x=4.43)
const GUN_BARREL_PROFILE: P2[] = [
  [0.132, 0.20],
  [0.132, 0.58],
  [0.118, 0.62],
  [0.112, 1.28],
  [0.102, 1.32],
  [0.098, 2.16],
  [0.092, 2.98],
  [0.088, 3.62],
  [0.083, 4.26],
  [0.095, 4.30],
  [0.095, 4.43],
  [0.061, 4.43],
  [0.061, 3.92],
];

// Bầu hút khói (Bore Evacuator) đặt lệch tâm +Y nhẹ đúng chuẩn pháo 120mm NATO
const BORE_EVAC_PROFILE: P2[] = [
  [0.096, 2.12],
  [0.144, 2.24],
  [0.148, 2.30],
  [0.148, 2.84],
  [0.142, 2.90],
  [0.092, 3.02],
];

const ROAD_WHEEL_X = [-2.43, -1.63, -0.83, -0.03, 0.77, 1.57, 2.37] as const;
const RETURN_ROLLER_X = [-1.95, -0.15, 1.65] as const;
const ERA_TILE_X = [0.95, 1.48, 2.01, 2.54, 3.07] as const;

// Khung giỏ để đồ sau tháp pháo (pipe)
const BUSTLE_RAIL_TOP: [number, number, number][] = [
  [-2.52, 0.84, -1.16],
  [-3.04, 0.84, -1.04],
  [-3.08, 0.84, 0.0],
  [-3.04, 0.84, 1.04],
  [-2.52, 0.84, 1.16],
];
const BUSTLE_RAIL_MID: [number, number, number][] = [
  [-2.52, 0.54, -1.16],
  [-3.04, 0.54, -1.04],
  [-3.08, 0.54, 0.0],
  [-3.04, 0.54, 1.04],
  [-2.52, 0.54, 1.16],
];
const BUSTLE_RAIL_BOT: [number, number, number][] = [
  [-2.50, 0.24, -1.14],
  [-3.00, 0.24, -1.00],
  [-3.04, 0.24, 0.0],
  [-3.00, 0.24, 1.00],
  [-2.50, 0.24, 1.14],
];

const ANTENNA_LEFT_PTS: [number, number, number][] = [
  [-2.55, 0.90, -1.04],
  [-2.62, 1.66, -1.07],
  [-2.72, 2.46, -1.10],
];
const ANTENNA_RIGHT_PTS: [number, number, number][] = [
  [-2.55, 0.90, 1.04],
  [-2.62, 1.66, 1.07],
  [-2.72, 2.46, 1.10],
];

// Cache vật liệu tô sáng giải phẫu giáp (có vân sơn + phát sáng emissive rõ dưới Bloom)
const zoneMatCache = new Map<string, THREE.MeshStandardMaterial>();
const getZonePaint = (kind: 'front' | 'weak', repeat: number) => {
  const key = `${kind}_${repeat}`;
  if (!zoneMatCache.has(key)) {
    const base =
      kind === 'front'
        ? paint({
            color: '#2589d4',
            camo: [THEME.armorStrong, '#185b91'],
            repeat,
            wear: 0.16,
            dirt: 0.08,
            roughness: 0.36,
            metalness: 0.52,
            seed: 29,
          }).clone()
        : paint({
            color: '#d9381e',
            camo: [THEME.armorWeak, '#9e210e'],
            repeat,
            wear: 0.14,
            dirt: 0.06,
            roughness: 0.38,
            metalness: 0.36,
            seed: 41,
          }).clone();
    base.emissive = new THREE.Color(kind === 'front' ? THEME.armorStrong : THEME.armorWeak);
    base.emissiveIntensity = kind === 'front' ? 0.38 : 0.52;
    zoneMatCache.set(key, base);
  }
  return zoneMatCache.get(key)!;
};

export const MBT: React.FC<MBTProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  turretYaw = 0,
  gunPitch = 0.03,
  recoil = 0,
  travel = 0,
  highlightZone = 'none',
  explodeAmt = 0,
  charred = 0,
  aps = false,
  apsYaw = 0,
}) => {
  const ch = Math.round(Math.max(0, Math.min(1, charred)) * 25) / 25;
  const ex = Math.max(0, Math.min(1, explodeAmt));
  const clampedRecoil = Math.max(0, Math.min(0.45, recoil));
  const hiFront = highlightZone === 'front' || highlightZone === 'both';
  const hiWeak = highlightZone === 'weak' || highlightZone === 'both';

  // Bảng màu NATO Olive-Slate & Steppe Khaki cân bằng sáng-tối rõ khối; pha sang xám than đen nhám cao khi charred > 0
  const baseHex = mix(mix(THEME.armorBase, '#626f54', 0.42), '#1a1917', ch * 0.92);
  const camo1Hex = mix('#3a4333', '#0f0f0e', ch * 0.95);
  const camo2Hex = mix('#7c7458', '#2d241f', ch * 0.88);
  const darkHex = mix(THEME.armorDark, '#0d0d0c', ch * 0.92);
  const tireHex = mix(THEME.rubber, '#121212', ch * 0.9);
  const rimHex = mix('#5b664e', '#201e1c', ch * 0.9);
  const trackHex = mix('#333531', '#1a1816', ch * 0.85);

  // Vật liệu sơn UV mét thật (repeat 0.38 cho extrude/extrudeTop/loft) & UV 0..1 (cho rbox/lathe)
  const hullMatLarge = paint({
    color: baseHex,
    camo: [camo1Hex, camo2Hex],
    camoScale: 1,
    repeat: 0.38,
    wear: 0.30 * (1 - ch * 0.5),
    dirt: 0.24 + ch * 0.50,
    roughness: 0.58 + ch * 0.35,
    metalness: 0.35 * (1 - ch * 0.65),
    seed: 17,
  });
  const hullMatMed = paint({
    color: baseHex,
    camo: [camo1Hex, camo2Hex],
    camoScale: 1,
    repeat: 0.85,
    wear: 0.28 * (1 - ch * 0.5),
    dirt: 0.22 + ch * 0.50,
    roughness: 0.58 + ch * 0.35,
    metalness: 0.35 * (1 - ch * 0.65),
    seed: 17,
  });
  const hullMatSmall = paint({
    color: baseHex,
    camo: [camo1Hex, camo2Hex],
    camoScale: 1,
    repeat: 1.55,
    wear: 0.28 * (1 - ch * 0.5),
    dirt: 0.22 + ch * 0.50,
    roughness: 0.58 + ch * 0.35,
    metalness: 0.35 * (1 - ch * 0.65),
    seed: 17,
  });

  const frontMatLarge = hiFront ? getZonePaint('front', 0.38) : hullMatLarge;
  const frontMatSmall = hiFront ? getZonePaint('front', 1.55) : hullMatSmall;
  const weakMatLarge = hiWeak ? getZonePaint('weak', 0.38) : hullMatLarge;
  const weakMatSmall = hiWeak ? getZonePaint('weak', 1.25) : hullMatMed;

  const frontCutMat = hiFront
    ? plain(THEME.armorStrong, 0.28, 0.55, { emissive: THEME.armorStrong, emissiveIntensity: 0.62 })
    : plain('#5a6672', 0.45, 0.65);
  const weakEdgeMat = hiWeak
    ? plain(THEME.armorWeak, 0.26, 0.35, { emissive: THEME.armorWeak, emissiveIntensity: 0.78 })
    : plain(darkHex, 0.7, 0.35);

  const darkSteelMat = plain(mix(THEME.steelDark, '#151618', ch * 0.85), 0.50 + ch * 0.36, 0.58 * (1 - ch * 0.5));
  const rawSteelMat = plain(mix(THEME.steelRaw, '#323436', ch * 0.85), 0.38 + ch * 0.4, 0.72 * (1 - ch * 0.5));
  const grilleMat = plain('#151817', 0.90, 0.22);
  const rubberMat = plain(tireHex, 0.92, 0.06);
  const boreBlackMat = plain('#040507', 1.0, 0.0);
  const opticGreenMat = plain('#14c97e', 0.10, 0.88, { emissive: '#095937', emissiveIntensity: 0.42 * (1 - ch * 0.7) });
  const opticAmberMat = plain('#f5a618', 0.12, 0.85, { emissive: '#8c5200', emissiveIntensity: 0.40 * (1 - ch * 0.7) });
  const periscopeMat = plain('#152733', 0.16, 0.78);
  const brassAmmoMat = plain('#d4a23a', 0.3, 0.78);
  const apsRadomeMat = plain('#1b2633', 0.42, 0.48);
  const apsCyanMat = plain(THEME.apsCyan, 0.2, 0.4, { emissive: THEME.apsCyan, emissiveIntensity: 0.92 });

  // Geometry chính (đã được cache)
  const geos = useMemo(
    () => ({
      hullCore: extrude(HULL_CORE_PTS, 2.20, 0.022),
      frontGlacis: extrude(FRONT_GLACIS_PTS, 2.18, 0.022),
      sponson: extrude(SPONSON_PTS, 0.72, 0.018),
      sideSkirt: extrude(SIDE_SKIRT_PTS, 0.055, 0.012),
      engineDeckPlate: rbox(2.22, 0.035, 2.12, 0.008),
      eraTile: rbox(0.50, 0.33, 0.075, 0.014),
      turretBase: extrudeTop(TURRET_BASE_PLAN, 0.20, 0.02),
      turretUpper: extrudeTop(TURRET_UPPER_PLAN, 0.73, 0.026),
      turretRoof: extrudeTop(TURRET_ROOF_PLAN, 0.04, 0.006),
      cheekLoftR: buildArrowheadCheek(1),
      cheekLoftL: buildArrowheadCheek(-1),
      gunBarrel: lathe(GUN_BARREL_PROFILE, 36),
      boreEvac: lathe(BORE_EVAC_PROFILE, 32),
      bustleTop: pipe(BUSTLE_RAIL_TOP, 0.022, 36),
      bustleMid: pipe(BUSTLE_RAIL_MID, 0.020, 36),
      bustleBot: pipe(BUSTLE_RAIL_BOT, 0.020, 36),
      antennaL: pipe(ANTENNA_LEFT_PTS, 0.013, 18),
      antennaR: pipe(ANTENNA_RIGHT_PTS, 0.013, 18),
    }),
    [],
  );

  // Đinh tán dọc váy giáp sườn & nẹp chắn bùn hai bên
  const hullRivetPts = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (const s of [-1, 1]) {
      for (let x = -3.65; x <= 3.45; x += 0.34) {
        pts.push([x, 0.99, s * 1.855]);
      }
      for (const tx of ERA_TILE_X) {
        pts.push([tx - 0.21, 0.90, s * 1.885], [tx + 0.21, 0.90, s * 1.885]);
        pts.push([tx - 0.21, 0.64, s * 1.885], [tx + 0.21, 0.64, s * 1.885]);
      }
      for (let x = -2.65; x <= 0.65; x += 0.55) {
        pts.push([x, 0.60, s * 1.855]);
      }
    }
    return pts;
  }, []);

  const wheelSpin = travel / 0.34;
  const sprocketSpin = travel / 0.38;
  const idlerSpin = travel / 0.36;

  // Độ dịch chuyển giải phẫu giáp khi explodeAmt > 0
  const frontSlideX = ex * 1.1;
  const weakLiftY = ex * 1.25;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ==================== 1. HỆ TRUYỀN ĐỘNG, BÁNH XE & DẢI XÍCH (y=0) ==================== */}
      {([-1, 1] as const).map((side) => {
        const zTrack = side * 1.48;
        return (
          <group key={`drive_${side}`}>
            {/* Dải xích đặt ở y = 0.035 để mặt dưới mắt xích (dày 0.07 m) tiếp xúc đúng mặt đất y = 0.000 */}
            <Track
              xFront={3.15}
              xRear={-3.25}
              rFront={0.36}
              rRear={0.38}
              width={0.62}
              travel={travel}
              color={trackHex}
              position={[0, 0.035, zTrack]}
            />

            {/* 7 cặp bánh chịu nặng + tay đòn thanh xoắn */}
            {ROAD_WHEEL_X.map((wx, idx) => (
              <React.Fragment key={`rw_${side}_${idx}`}>
                <group position={[wx, 0.385, zTrack]} scale={[1, 1, side]}>
                  <Wheel r={0.34} width={0.5} spin={wheelSpin} tire={tireHex} rim={rimHex} />
                </group>
                {/* Tay đòn treo thanh xoắn nối vào gầm thân */}
                <mesh
                  position={[wx + 0.14, 0.44, side * 1.16]}
                  rotation={[0, 0, -0.38]}
                  geometry={rbox(0.36, 0.09, 0.12, 0.02)}
                  material={darkSteelMat}
                  castShadow
                />
              </React.Fragment>
            ))}

            {/* 3 con lăn đỡ nhánh xích trên */}
            {RETURN_ROLLER_X.map((rx, idx) => (
              <mesh
                key={`rr_${side}_${idx}`}
                position={[rx, 0.67, zTrack]}
                rotation={[Math.PI / 2, 0, 0]}
                material={darkSteelMat}
                castShadow
              >
                <cylinderGeometry args={[0.105, 0.105, 0.44, 18]} />
              </mesh>
            ))}

            {/* Bánh dẫn hướng trước (Front Idler) + cụm tăng xích */}
            <group position={[3.15, 0.395, zTrack]} scale={[1, 1, side]}>
              <Wheel r={0.315} width={0.48} spin={idlerSpin} tire={darkHex} rim={rimHex} bolts={10} />
            </group>
            <mesh
              position={[2.92, 0.48, side * 1.16]}
              rotation={[0, 0, -0.32]}
              geometry={rbox(0.42, 0.12, 0.14, 0.02)}
              material={darkSteelMat}
            />

            {/* Bánh chủ động răng sau (Rear Drive Sprocket) */}
            <group position={[-3.25, 0.415, zTrack]} rotation={[0, 0, -sprocketSpin]}>
              {/* Hộp giảm tốc hành tinh nhô ra ngoài */}
              <mesh rotation={[Math.PI / 2, 0, 0]} material={hullMatSmall} castShadow>
                <cylinderGeometry args={[0.25, 0.27, 0.54, 24]} />
              </mesh>
              <mesh position={[0, 0, side * 0.27]} rotation={[Math.PI / 2, 0, 0]} material={darkSteelMat} castShadow>
                <cylinderGeometry args={[0.15, 0.19, 0.10, 20]} />
              </mesh>
              {/* 2 vành đĩa răng ăn khớp xích */}
              {[-0.21, 0.21].map((dz, di) => (
                <group key={di} position={[0, 0, dz]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]} material={darkSteelMat} castShadow>
                    <cylinderGeometry args={[0.325, 0.325, 0.055, 24]} />
                  </mesh>
                  {Array.from({ length: 11 }, (_, ti) => {
                    const a = (ti / 11) * Math.PI * 2;
                    return (
                      <mesh
                        key={ti}
                        position={[Math.cos(a) * 0.345, Math.sin(a) * 0.345, 0]}
                        rotation={[0, 0, a]}
                        geometry={rbox(0.085, 0.052, 0.048, 0.01)}
                        material={rawSteelMat}
                      />
                    );
                  })}
                </group>
              ))}
            </group>
          </group>
        );
      })}

      {/* ==================== 2. THÂN XE CHÍNH, HỐC SƯỜN & VÁY GIÁP ERA ==================== */}
      <mesh geometry={geos.hullCore} material={hullMatLarge} castShadow receiveShadow />

      {/* Vách ngăn cấu trúc nghiêng phía trước (nằm gọn dưới mũi glacis y<=1.32, chỉ lộ ra khi giáp trước trượt tách explodeAmt > 0) */}
      {ex > 0.005 && (
        <mesh
          position={[2.35, 1.08, 0]}
          rotation={[0, 0, -0.405]}
          geometry={rbox(1.14, 0.06, 2.12, 0.008)}
          material={darkSteelMat}
        />
      )}

      {/* Khoang máy V12 bên dưới (hạ thấp ở y=1.33 nằm gọn dưới nắp động cơ, chỉ lộ rõ khi nắp 35 mm bay lên +Y) */}
      {ex > 0.005 && (
        <group position={[-2.74, 1.36, 0]}>
          <mesh geometry={rbox(2.14, 0.08, 2.02, 0.01)} material={grilleMat} />
          {[-0.54, 0.54].map((zf, fi) => (
            <group key={fi} position={[0.38, 0.045, zf]}>
              <mesh material={darkSteelMat}>
                <cylinderGeometry args={[0.45, 0.45, 0.03, 24]} />
              </mesh>
              <mesh position={[0, 0.012, 0]} material={grilleMat}>
                <cylinderGeometry args={[0.39, 0.39, 0.025, 24]} />
              </mesh>
              {Array.from({ length: 8 }, (_, bi) => (
                <mesh
                  key={bi}
                  position={[0, 0.024, 0]}
                  rotation={[0, (bi / 8) * Math.PI * 2, 0]}
                  geometry={rbox(0.36, 0.01, 0.055, 0.003)}
                  material={rawSteelMat}
                />
              ))}
            </group>
          ))}
          {/* Khối lốc động cơ & ống nạp tăng áp V12 */}
          <mesh position={[-0.56, 0.045, 0]} geometry={rbox(0.84, 0.07, 1.16, 0.018)} material={darkSteelMat} />
          <mesh position={[-0.56, 0.08, -0.32]} rotation={[0, 0, Math.PI / 2]} material={rawSteelMat}>
            <cylinderGeometry args={[0.042, 0.042, 0.78, 14]} />
          </mesh>
          <mesh position={[-0.56, 0.08, 0.32]} rotation={[0, 0, Math.PI / 2]} material={rawSteelMat}>
            <cylinderGeometry args={[0.042, 0.042, 0.78, 14]} />
          </mesh>
        </group>
      )}

      {/* Hai hốc sườn trên xích + váy giáp phân khối + gạch giáp phản ứng nổ ERA */}
      {([-1, 1] as const).map((side) => (
        <group key={`sponson_${side}`}>
          <mesh position={[0, 0, side * 1.46]} geometry={geos.sponson} material={hullMatLarge} castShadow receiveShadow />
          <mesh position={[0, 0, side * 1.825]} geometry={geos.sideSkirt} material={hullMatLarge} castShadow receiveShadow />

          {/* Các khe chia tấm váy giáp sườn */}
          {[-2.80, -2.05, -1.30, -0.55, 0.20, 0.85].map((sx, si) => (
            <mesh
              key={si}
              position={[sx, 0.78, side * 1.855]}
              geometry={rbox(0.018, 0.44, 0.016, 0.004)}
              material={darkSteelMat}
            />
          ))}

          {/* 5 khối gạch giáp phản ứng nổ ERA dọc sườn trước */}
          {ERA_TILE_X.map((tx, ti) => (
            <mesh
              key={ti}
              position={[tx, 0.77, side * 1.86]}
              rotation={[-side * 0.06, 0, 0]}
              geometry={geos.eraTile}
              material={hullMatSmall}
              castShadow
            />
          ))}

          {/* Tấm chắn bùn cao su đầu chắn bùn trước */}
          <mesh
            position={[3.81, 0.72, side * 1.48]}
            rotation={[0, 0, -0.22]}
            geometry={rbox(0.035, 0.22, 0.64, 0.008)}
            material={rubberMat}
            castShadow
          />

          {/* Cụm đèn pha bọc khung thép bảo vệ phía trước chắn bùn */}
          <group position={[3.54, 1.11, side * 1.46]}>
            <mesh geometry={rbox(0.20, 0.14, 0.28, 0.02)} material={darkSteelMat} castShadow />
            <mesh position={[0.098, 0, -0.05]} rotation={[0, 0, Math.PI / 2]} material={opticAmberMat}>
              <cylinderGeometry args={[0.042, 0.042, 0.02, 16]} />
            </mesh>
            <mesh position={[0.098, 0, 0.06]} rotation={[0, 0, Math.PI / 2]} material={rawSteelMat}>
              <cylinderGeometry args={[0.032, 0.032, 0.02, 14]} />
            </mesh>
          </group>

          {/* Nắp hộp đồ nghề phẳng dọc sườn khoang động cơ sau */}
          <mesh
            position={[-2.58, 1.485, side * 1.46]}
            geometry={rbox(1.36, 0.05, 0.58, 0.012)}
            material={hullMatMed}
            castShadow
          />
        </group>
      ))}

      <Rivets points={hullRivetPts} r={0.016} color={mix('#6d785f', '#252422', ch * 0.85)} />

      {/* Chi tiết đuôi xe: vỉ ống xả động cơ, đèn hậu chiến thuật, hộp APU, móc kéo sau */}
      <group position={[-4.04, 1.08, 0]}>
        {[-0.58, 0.58].map((ze, ei) => (
          <group key={ei} position={[-0.03, 0.04, ze]}>
            <mesh geometry={rbox(0.12, 0.30, 0.68, 0.02)} material={darkSteelMat} castShadow />
            <mesh position={[-0.045, 0, 0]} geometry={rbox(0.05, 0.22, 0.58, 0.01)} material={grilleMat} />
          </group>
        ))}
        {/* Cặp móc kéo hạng nặng phía sau */}
        {[-0.88, 0.88].map((zt, ti) => (
          <mesh key={ti} position={[-0.05, -0.24, zt]} geometry={rbox(0.18, 0.11, 0.10, 0.025)} material={darkSteelMat} />
        ))}
        {/* Đèn hậu đỏ */}
        {[-1.46, 1.46].map((zl, li) => (
          <mesh
            key={li}
            position={[0.01, 0.16, zl]}
            geometry={rbox(0.06, 0.08, 0.16, 0.015)}
            material={plain('#9e1f18', 0.35, 0.2, { emissive: '#660f0a', emissiveIntensity: 0.4 })}
          />
        ))}
      </group>

      {/* ==================== 3. KHỐI GIÁP COMPOSITE MŨI XE (FRONT ZONE + EXPLODE +X) ==================== */}
      <group position={[frontSlideX, 0, 0]}>
        <mesh geometry={geos.frontGlacis} material={frontMatLarge} castShadow receiveShadow />

        {/* Các tấm lõi gốm-thép NERA nghiêng ở mặt cắt sau khối giáp mũi (~850 mm RHA, chỉ vẽ khi tách lớp explodeAmt > 0) */}
        {ex > 0.005 && (
          <group position={[2.42, 1.11, 0]} rotation={[0, 0, -0.405]}>
            <mesh geometry={rbox(1.12, 0.045, 2.12, 0.006)} material={frontCutMat} />
            {[0.09, 0.18, 0.27].map((dy, li) => (
              <mesh
                key={li}
                position={[dy * 0.35, dy, 0]}
                geometry={rbox(1.02 - li * 0.12, 0.032, 2.10, 0.005)}
                material={li % 2 === 0 ? darkSteelMat : frontCutMat}
              />
            ))}
          </group>
        )}

        {/* Nắp lái xe & 3 kính tiềm vọng góc rộng trước mũi */}
        <group position={[1.96, 1.425, 0.04]}>
          <mesh geometry={rbox(0.46, 0.055, 0.56, 0.02)} material={frontMatSmall} castShadow />
          {[-0.17, 0, 0.17].map((zp, pi) => (
            <group key={pi} position={[0.16, 0.048, zp]} rotation={[0, -zp * 0.6, 0]}>
              <mesh geometry={rbox(0.11, 0.075, 0.11, 0.01)} material={darkSteelMat} />
              <mesh position={[0.048, 0.005, 0]} geometry={rbox(0.022, 0.042, 0.085, 0.004)} material={periscopeMat} />
            </group>
          ))}
        </group>

        {/* Dải 6 mắt xích dự phòng gia cố trước mũi dưới + móc kéo đôi hạng nặng */}
        <group position={[3.66, 0.72, 0]} rotation={[0, 0, 0.44]}>
          {[-0.55, -0.33, -0.11, 0.11, 0.33, 0.55].map((zs, si) => (
            <mesh key={si} position={[0, 0, zs]} geometry={rbox(0.055, 0.16, 0.19, 0.01)} material={darkSteelMat} castShadow />
          ))}
        </group>
        {[-0.84, 0.84].map((zt, ti) => (
          <group key={ti} position={[3.78, 0.82, zt]}>
            <mesh geometry={rbox(0.22, 0.11, 0.11, 0.025)} material={darkSteelMat} castShadow />
            <mesh position={[0.08, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={rawSteelMat}>
              <cylinderGeometry args={[0.032, 0.032, 0.15, 12]} />
            </mesh>
          </group>
        ))}
        <mesh position={[3.42, 1.095, 0]} geometry={rbox(0.045, 0.04, 1.96, 0.008)} material={frontMatSmall} />
      </group>

      {/* ==================== 4. NẮP KHOANG ĐỘNG CƠ MỎNG ~35 MM (WEAK ZONE + EXPLODE +Y) ==================== */}
      <group position={[-2.74, 1.475 + weakLiftY, 0]}>
        <mesh geometry={geos.engineDeckPlate} material={weakMatSmall} castShadow receiveShadow />
        {/* Viền mép mỏng 35 mm tô nổi sắc cam-đỏ khi highlightZone='weak'|'both' */}
        {hiWeak && <mesh position={[0, -0.002, 0]} geometry={rbox(2.24, 0.032, 2.14, 0.006)} material={weakEdgeMat} />}

        {/* Vòng quạt tản nhiệt tròn trung tâm kiểu Leopard 2 + 2 cụm vỉ lưới nạp gió hai bên */}
        <group position={[-0.22, 0.018, 0]}>
          <mesh material={weakMatSmall}>
            <cylinderGeometry args={[0.50, 0.52, 0.016, 28]} />
          </mesh>
          <mesh position={[0, 0.006, 0]} material={grilleMat}>
            <cylinderGeometry args={[0.43, 0.43, 0.014, 28]} />
          </mesh>
          {Array.from({ length: 8 }, (_, ri) => (
            <mesh
              key={ri}
              position={[0, 0.012, 0]}
              rotation={[0, (ri / 8) * Math.PI, 0]}
              geometry={rbox(0.84, 0.008, 0.022, 0.002)}
              material={hiWeak ? weakEdgeMat : darkSteelMat}
            />
          ))}
        </group>

        {[-0.64, 0.64].map((zg, gi) => (
          <group key={gi} position={[0.56, 0.018, zg]}>
            <mesh geometry={rbox(0.76, 0.014, 0.66, 0.005)} material={grilleMat} />
            {Array.from({ length: 6 }, (_, si) => (
              <mesh
                key={si}
                position={[-0.30 + si * 0.12, 0.007, 0]}
                geometry={rbox(0.024, 0.008, 0.60, 0.002)}
                material={hiWeak ? weakEdgeMat : darkSteelMat}
              />
            ))}
          </group>
        ))}

        {[-0.64, 0.64].map((zg, gi) => (
          <mesh key={`rg_${gi}`} position={[-0.84, 0.018, zg]} geometry={rbox(0.34, 0.014, 0.64, 0.005)} material={grilleMat} />
        ))}
        {/* Tay nắm nhấc nắp động cơ */}
        {[-0.88, 0.88].map((zh, hi) => (
          <mesh key={hi} position={[-0.98, 0.028, zh]} geometry={rbox(0.14, 0.024, 0.038, 0.006)} material={rawSteelMat} />
        ))}
      </group>

      {/* ==================== 5. THÁP PHÁO XOAY (TURRET + PHÁO 120MM L/55 + APS) ==================== */}
      <group position={[0.15, 1.44, 0]} rotation={[0, turretYaw, 0]}>
        {/* Vành ổ bi cổ tháp pháo */}
        <mesh position={[0, 0.06, 0]} material={darkSteelMat}>
          <cylinderGeometry args={[1.08, 1.10, 0.12, 36]} />
        </mesh>

        {/* Đế khoang chiến đấu & thân chính khoang đạn bustle */}
        <mesh position={[0, 0.02, 0]} geometry={geos.turretBase} material={hullMatLarge} castShadow receiveShadow />
        <mesh position={[0, 0.16, 0]} geometry={geos.turretUpper} material={hullMatLarge} castShadow receiveShadow />

        {/* Hốc nội thất khoang chiến đấu & đạn 120mm trong bustle (chỉ lộ ra khi tấm nóc 40 mm bay lên +Y) */}
        {ex > 0.005 && (
          <group position={[0, 0.85, 0]}>
            <mesh position={[-0.78, 0, 0]} geometry={rbox(3.06, 0.03, 2.26, 0.01)} material={grilleMat} />
            {/* Khóa nòng pháo bên trong tháp */}
            <mesh position={[0.25, -0.02, 0]} geometry={rbox(0.95, 0.10, 0.46, 0.02)} material={darkSteelMat} />
            {/* Dàn đạn pháo 120mm xếp ngang trong hầm đạn bustle sau */}
            {[-0.56, 0.56].map((za, sideIdx) =>
              Array.from({ length: 6 }, (_, ri) => (
                <group key={`ammo_${sideIdx}_${ri}`} position={[-1.34 - ri * 0.18, 0.02, za]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]} material={brassAmmoMat}>
                    <cylinderGeometry args={[0.052, 0.052, 0.70, 14]} />
                  </mesh>
                  <mesh position={[0, 0, sideIdx === 0 ? 0.38 : -0.38]} rotation={[Math.PI / 2, 0, 0]} material={darkSteelMat}>
                    <cylinderGeometry args={[0.022, 0.050, 0.15, 12]} />
                  </mesh>
                </group>
              )),
            )}
          </group>
        )}

        {/* Hộp đồ sườn tháp pháo có gân dập + 2 cụm × 4 ống phóng đạn khói ngụy trang */}
        {([-1, 1] as const).map((side) => (
          <group key={`t_side_${side}`}>
            <mesh
              position={[-0.86, 0.54, side * 1.50]}
              geometry={rbox(1.44, 0.48, 0.15, 0.02)}
              material={hullMatMed}
              castShadow
            />
            {[-1.32, -0.86, -0.40].map((rx, ri) => (
              <mesh
                key={ri}
                position={[rx, 0.54, side * 1.58]}
                geometry={rbox(0.032, 0.40, 0.022, 0.005)}
                material={darkSteelMat}
              />
            ))}
            {/* Cụm 4 ống phóng đạn khói xoè quạt */}
            <group position={[0.16, 0.56, side * 1.53]} rotation={[0, side * 0.26, 0]}>
              <mesh geometry={rbox(0.14, 0.16, 0.14, 0.015)} material={darkSteelMat} />
              {[0, 1, 2, 3].map((gi) => (
                <group
                  key={gi}
                  position={[0.06, -0.06 + (gi % 2) * 0.11, side * (-0.04 + Math.floor(gi / 2) * 0.09)]}
                  rotation={[0, side * (gi - 1.5) * 0.14, 0.34 + (gi % 2) * 0.12]}
                >
                  <mesh rotation={[0, 0, -Math.PI / 2]} material={hullMatSmall} castShadow>
                    <cylinderGeometry args={[0.038, 0.038, 0.26, 12]} />
                  </mesh>
                  <mesh position={[0.132, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={rubberMat}>
                    <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>
        ))}

        {/* Giỏ khung ống thép để đồ phía sau tháp pháo (pipe) + can nhiên liệu phụ */}
        <group>
          <mesh geometry={geos.bustleTop} material={darkSteelMat} castShadow />
          <mesh geometry={geos.bustleMid} material={darkSteelMat} castShadow />
          <mesh geometry={geos.bustleBot} material={darkSteelMat} castShadow />
          {[-1.02, -0.52, 0, 0.52, 1.02].map((zs, si) => (
            <mesh
              key={si}
              position={[Math.abs(zs) > 0.9 ? -3.01 : -3.05, 0.54, zs]}
              geometry={rbox(0.035, 0.62, 0.035, 0.008)}
              material={darkSteelMat}
            />
          ))}
          {/* Hộp đạn & can dự trữ trong giỏ sau tháp */}
          <mesh position={[-2.80, 0.46, -0.54]} geometry={rbox(0.36, 0.38, 0.48, 0.03)} material={hullMatMed} castShadow />
          <mesh position={[-2.80, 0.44, 0.52]} geometry={rbox(0.34, 0.34, 0.52, 0.03)} material={darkSteelMat} castShadow />
        </group>

        {/* Cảm biến khí tượng gió ngang + 2 cần ăng-ten mảnh gắn mép sau bustle */}
        <group position={[-2.55, 1.05, 0.18]}>
          <mesh material={darkSteelMat}>
            <cylinderGeometry args={[0.022, 0.028, 0.38, 10]} />
          </mesh>
          <mesh position={[0, 0.21, 0]} material={rawSteelMat}>
            <cylinderGeometry args={[0.055, 0.055, 0.06, 12]} />
          </mesh>
        </group>
        {([-1, 1] as const).map((side) => (
          <mesh key={`ant_base_${side}`} position={[-2.55, 0.90, side * 1.04]} material={rubberMat}>
            <cylinderGeometry args={[0.042, 0.052, 0.14, 12]} />
          </mesh>
        ))}
        <mesh geometry={geos.antennaL} material={darkSteelMat} />
        <mesh geometry={geos.antennaR} material={darkSteelMat} />

        {/* -------- HAI MÁ GIÁP NÊM COMPOSITE TRƯỚC THÁP PHÁO (FRONT ZONE + EXPLODE +X) -------- */}
        <group position={[frontSlideX, 0, 0]}>
          <mesh geometry={geos.cheekLoftR} material={frontMatLarge} castShadow receiveShadow />
          <mesh geometry={geos.cheekLoftL} material={frontMatLarge} castShadow receiveShadow />

          {/* Mặt cắt nhiều lớp composite NERA dày ~0.85 m ở mặt sau hai má (chỉ vẽ khi tách vỏ explodeAmt > 0) */}
          {ex > 0.005 &&
            ([-1, 1] as const).map((side) => (
              <group key={`cheek_cut_${side}`} position={[0.72, 0.49, side * 0.94]} rotation={[0, -side * 0.39, 0]}>
                <mesh geometry={rbox(0.06, 0.76, 1.04, 0.008)} material={frontCutMat} />
                <mesh position={[0.14, 0, 0]} geometry={rbox(0.04, 0.72, 1.00, 0.008)} material={darkSteelMat} />
                <mesh position={[0.26, 0, 0]} geometry={rbox(0.05, 0.68, 0.96, 0.008)} material={frontCutMat} />
              </group>
            ))}
        </group>

        {/* -------- HỆ THỐNG PHÁO CHÍNH 120MM L/55 (GUN PITCH & RECOIL) -------- */}
        <group position={[1.22, 0.50, 0]} rotation={[0, 0, gunPitch]}>
          {/* Khiên pháo trung tâm (Gun Mantlet) + súng máy đồng trục 7.62mm */}
          <group position={[frontSlideX * 0.55, 0, 0]}>
            <mesh position={[0.06, 0, 0]} geometry={rbox(0.76, 0.58, 0.78, 0.045)} material={frontMatSmall} castShadow />
            <mesh position={[0.42, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={rubberMat}>
              <cylinderGeometry args={[0.16, 0.22, 0.22, 24]} />
            </mesh>
            {/* Lỗ & đầu nòng súng máy đồng trục 7.62mm */}
            <mesh position={[0.48, 0.04, -0.25]} rotation={[0, 0, -Math.PI / 2]} material={darkSteelMat}>
              <cylinderGeometry args={[0.018, 0.022, 0.28, 10]} />
            </mesh>
          </group>

          {/* Nòng pháo 120mm L/55 giật lùi dọc trục theo -recoil */}
          <group position={[-clampedRecoil, 0, 0]}>
            <mesh geometry={geos.gunBarrel} material={hullMatSmall} castShadow receiveShadow />
            {/* Bầu hút khói (Bore Evacuator) lệch tâm +Y 0.022 m */}
            <mesh position={[0, 0.022, 0]} geometry={geos.boreEvac} material={hullMatSmall} castShadow />

            {/* Các đai kẹp ốp cách nhiệt dọc thân nòng */}
            {[0.95, 1.56, 2.13, 3.03, 3.64, 4.18].map((bx, bi) => (
              <mesh key={bi} position={[bx, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={darkSteelMat}>
                <cylinderGeometry
                  args={[bx < 1.6 ? 0.116 : 0.094, bx < 1.6 ? 0.116 : 0.094, 0.045, 24]}
                />
              </mesh>
            ))}

            {/* Cảm biến hiệu chuẩn đầu nòng MRS (Muzzle Reference System) */}
            <group position={[4.36, 0.118, 0]}>
              <mesh geometry={rbox(0.09, 0.075, 0.048, 0.008)} material={darkSteelMat} castShadow />
              <mesh position={[-0.046, 0.01, 0]} geometry={rbox(0.01, 0.04, 0.032, 0.002)} material={opticAmberMat} />
            </group>

            {/* Lõi lỗ nòng 120mm đen sâu tuyệt đối */}
            <mesh position={[4.18, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={boreBlackMat}>
              <cylinderGeometry args={[0.06, 0.06, 0.49, 24]} />
            </mesh>
          </group>
        </group>

        {/* -------- TẤM GIÁP NÓC THÁP PHÁO MỎNG ~40 MM & TẤM XẢ ÁP (WEAK ZONE + EXPLODE +Y) -------- */}
        <group position={[0, 0.89 + weakLiftY, 0]}>
          <mesh geometry={geos.turretRoof} material={weakMatLarge} castShadow receiveShadow />

          {/* Tấm xả áp khoang đạn phía sau (Blowout Panels) có rãnh xé & bản lề */}
          {[-0.56, 0.56].map((zb, bi) => (
            <group key={bi} position={[-1.78, 0.046, zb]}>
              <mesh geometry={rbox(1.16, 0.018, 0.88, 0.006)} material={weakMatSmall} castShadow />
              <mesh position={[0, 0.011, 0]} geometry={rbox(1.10, 0.006, 0.025, 0.002)} material={weakEdgeMat} />
              {[-0.36, 0.36].map((xb, xi) => (
                <mesh
                  key={xi}
                  position={[xb, 0.011, zb > 0 ? 0.42 : -0.42]}
                  geometry={rbox(0.10, 0.014, 0.06, 0.003)}
                  material={darkSteelMat}
                />
              ))}
            </group>
          ))}

          {/* Hộp kính ngắm chính của pháo thủ (GPS Doghouse) mái vát che nắng + thấu kính phản quang âm sâu */}
          <group position={[0.48, 0.135, 0.72]}>
            <mesh geometry={rbox(0.52, 0.21, 0.38, 0.022)} material={hullMatSmall} castShadow />
            <mesh position={[0.05, 0.105, 0]} geometry={rbox(0.58, 0.028, 0.40, 0.008)} material={hullMatSmall} />
            <mesh position={[0.235, -0.005, 0]} geometry={rbox(0.07, 0.15, 0.31, 0.008)} material={grilleMat} />
            <mesh position={[0.262, -0.005, -0.055]} geometry={rbox(0.015, 0.095, 0.115, 0.003)} material={opticGreenMat} />
            <mesh position={[0.262, -0.005, 0.085]} geometry={rbox(0.015, 0.080, 0.078, 0.003)} material={opticAmberMat} />
          </group>

          {/* Kính ngắm toàn cảnh độc lập của trưởng xe (CITV) xoay trên nóc trái */}
          <group position={[0.06, 0.17, -0.58]} rotation={[0, 0.34, 0]}>
            <mesh position={[0, -0.07, 0]} material={hullMatSmall} castShadow>
              <cylinderGeometry args={[0.19, 0.23, 0.13, 24]} />
            </mesh>
            <mesh position={[0, 0.055, 0]} material={hullMatSmall} castShadow>
              <cylinderGeometry args={[0.17, 0.18, 0.20, 24]} />
            </mesh>
            <mesh position={[0.02, 0.16, 0]} material={hullMatSmall}>
              <cylinderGeometry args={[0.14, 0.175, 0.04, 24]} />
            </mesh>
            <mesh position={[0.13, 0.06, 0]} geometry={rbox(0.11, 0.125, 0.20, 0.012)} material={grilleMat} />
            <mesh position={[0.182, 0.06, -0.04]} geometry={rbox(0.014, 0.082, 0.082, 0.003)} material={opticGreenMat} />
            <mesh position={[0.182, 0.06, 0.055]} geometry={rbox(0.014, 0.068, 0.058, 0.003)} material={opticAmberMat} />
          </group>

          {/* Tháp chỉ huy trưởng xe (phải) + vòng 6 kính tiềm vọng + đại liên 12.7mm trên giá xoay */}
          <group position={[-0.36, 0.07, 0.58]}>
            <mesh material={hullMatSmall} castShadow>
              <cylinderGeometry args={[0.38, 0.41, 0.09, 24]} />
            </mesh>
            <mesh position={[0, 0.055, 0]} material={darkSteelMat}>
              <cylinderGeometry args={[0.31, 0.31, 0.035, 24]} />
            </mesh>
            {Array.from({ length: 6 }, (_, pi) => {
              const a = (pi / 6) * Math.PI * 2;
              return (
                <group key={pi} position={[Math.cos(a) * 0.34, 0.065, Math.sin(a) * 0.34]} rotation={[0, -a, 0]}>
                  <mesh geometry={rbox(0.08, 0.065, 0.09, 0.008)} material={darkSteelMat} />
                  <mesh position={[0.038, 0.004, 0]} geometry={rbox(0.015, 0.038, 0.07, 0.002)} material={periscopeMat} />
                </group>
              );
            })}
            {/* Súng máy phòng không 12.7mm M2HB trên giá tháp chỉ huy */}
            <group position={[0.26, 0.22, 0.06]} rotation={[0, 0.06, 0.05]}>
              <mesh position={[-0.14, -0.10, 0]} geometry={rbox(0.08, 0.18, 0.08, 0.01)} material={darkSteelMat} />
              <mesh geometry={rbox(0.46, 0.11, 0.09, 0.012)} material={darkSteelMat} castShadow />
              <mesh position={[0.04, -0.04, 0.12]} geometry={rbox(0.22, 0.16, 0.12, 0.015)} material={hullMatSmall} />
              <mesh position={[0.42, 0.015, 0]} rotation={[0, 0, -Math.PI / 2]} material={darkSteelMat}>
                <cylinderGeometry args={[0.026, 0.03, 0.38, 12]} />
              </mesh>
              <mesh position={[0.82, 0.015, 0]} rotation={[0, 0, -Math.PI / 2]} material={rawSteelMat}>
                <cylinderGeometry args={[0.014, 0.016, 0.56, 10]} />
              </mesh>
            </group>
          </group>

          {/* Nắp nạp đạn viên (trái) + kính tiềm vọng */}
          <group position={[-0.58, 0.06, -0.58]}>
            <mesh material={hullMatSmall} castShadow>
              <cylinderGeometry args={[0.33, 0.35, 0.07, 22]} />
            </mesh>
            <mesh position={[0.31, 0.055, 0]} geometry={rbox(0.09, 0.065, 0.11, 0.008)} material={darkSteelMat} />
            <mesh position={[0.352, 0.058, 0]} geometry={rbox(0.015, 0.038, 0.085, 0.002)} material={periscopeMat} />
          </group>
        </group>

        {/* -------- HỆ THỐNG PHÒNG VỆ CHỦ ĐỘNG APS (4 RADAR AESA + 2 BỆ PHÓNG ĐÔI) -------- */}
        {aps && (
          <group>
            {/* 4 tấm radar mảng pha quét điện tử AESA ở 4 góc tháp pháo (phủ trọn 360°) */}
            {(
              [
                { pos: [0.42, 0.68, -1.52], yaw: -0.68 },
                { pos: [0.42, 0.68, 1.52], yaw: 0.68 },
                { pos: [-2.26, 0.64, -1.30], yaw: -2.42 },
                { pos: [-2.26, 0.64, 1.30], yaw: 2.42 },
              ] as const
            ).map((rad, ri) => (
              <group key={`aesa_${ri}`} position={[rad.pos[0], rad.pos[1], rad.pos[2]]} rotation={[0, rad.yaw, -0.18]}>
                <mesh position={[-0.06, 0, 0]} geometry={rbox(0.14, 0.24, 0.34, 0.02)} material={hullMatSmall} castShadow />
                <mesh position={[0.02, 0, 0]} geometry={rbox(0.055, 0.28, 0.40, 0.018)} material={apsCyanMat} />
                <mesh position={[0.036, 0, 0]} geometry={rbox(0.035, 0.245, 0.365, 0.012)} material={apsRadomeMat} />
              </group>
            ))}

            {/* 2 cụm bệ phóng đạn đánh chặn 2 nòng gắn giá sườn vai tháp pháo (kiểu Trophy HV) xoay theo apsYaw */}
            {([-1, 1] as const).map((side) => (
              <group key={`aps_pod_${side}`} position={[-0.78, 0.88, side * 1.52]}>
                {/* Giá đỡ sườn & tấm giáp chắn hộp nạp đạn ngoài */}
                <mesh position={[0, -0.08, -side * 0.06]} geometry={rbox(0.46, 0.14, 0.28, 0.02)} material={darkSteelMat} castShadow />
                <mesh
                  position={[0, 0.12, side * 0.20]}
                  geometry={rbox(0.54, 0.36, 0.06, 0.015)}
                  material={hullMatSmall}
                  castShadow
                />
                {/* Khối bệ phóng 2 nòng xoay nhanh theo apsYaw */}
                <group position={[0, 0.14, 0]} rotation={[0, apsYaw, 0.18]}>
                  <mesh geometry={rbox(0.36, 0.24, 0.34, 0.03)} material={hullMatSmall} castShadow />
                  <mesh position={[0.04, 0.125, 0]} geometry={rbox(0.24, 0.018, 0.28, 0.005)} material={apsCyanMat} />
                  {[-0.095, 0.095].map((zb, bi) => (
                    <group key={bi} position={[0.14, 0.02, zb]}>
                      <mesh rotation={[0, 0, -Math.PI / 2]} material={darkSteelMat} castShadow>
                        <cylinderGeometry args={[0.068, 0.072, 0.46, 18]} />
                      </mesh>
                      <mesh position={[0.232, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={apsCyanMat}>
                        <cylinderGeometry args={[0.070, 0.070, 0.016, 18]} />
                      </mesh>
                      <mesh position={[0.22, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={boreBlackMat}>
                        <cylinderGeometry args={[0.056, 0.056, 0.05, 16]} />
                      </mesh>
                    </group>
                  ))}
                </group>
              </group>
            ))}
          </group>
        )}
      </group>
    </group>
  );
};

export const preview = turntable(MBT, { size: 10, center: [0.3, 1.25, 0] });
export default MBT;
