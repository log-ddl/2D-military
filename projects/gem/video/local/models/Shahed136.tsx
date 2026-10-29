// Mô hình 3D tỉ lệ 1:1 (mét) UAV cảm tử cánh tam giác cụt HESA Shahed-136 (Geran-2).
// Quy ước trục: mũi hướng +X (x từ -1.75 m tới +1.75 m = 3.50 m), đỉnh +Y, sải cánh Z (-1.25 m tới +1.25 m = 2.50 m).
// Tâm xoay gốc đặt tại [0, SHAHED_CENTER_Y, 0] = [0, 0.55, 0] (pitch xoay quanh Z, bank xoay quanh X quanh tâm thân này).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

export type Shahed136Props = {
  /** Góc quay cánh quạt đẩy 2 lá quanh trục X (rad). */
  propSpin?: number;
  /** Góc chúc/ngóc mũi quanh trục Z tại tâm thân [0, 0.55, 0] (rad; âm = chúi mũi xuống). */
  pitch?: number;
  /** Góc nghiêng cánh quanh trục dọc thân X tại tâm thân [0, 0.55, 0] (rad). */
  bank?: number;
};

/** Độ cao tâm thân chuẩn (m) tính từ mặt tham chiếu y = 0 để vây đầu cánh dưới & cánh quạt không chạm sàn. */
export const SHAHED_CENTER_Y = 0.55;
/** Toạ độ cục bộ tâm trục cánh quạt đẩy đuôi (khi pitch = 0, bank = 0). */
export const SHAHED_PROP_POS: [number, number, number] = [-1.668, SHAHED_CENTER_Y + 0.028, 0];

const Y_FUSE = 0.028;
const Y_WING = -0.044;
const R_FUSE = 0.176;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// -------------------- Biên dạng mặt bằng cánh tam giác cụt liền gốc thân (LERX + Cropped Delta) --------------------

/** Toạ độ X mép trước cánh theo khoảng cách ngang u = |z| (m), u ∈ [0.08, 1.236]. */
const wingLE = (u: number): number => {
  if (u <= 0.155) return 0.96 - (u - 0.08) * 0.42;
  if (u < 0.42) {
    // Đường cong chine LERX vuốt mượt từ hông thân sau khớp đầu đạn ra mép trước cánh quét 58.2°
    const t = (u - 0.155) / (0.42 - 0.155);
    const h00 = 2 * t * t * t - 3 * t * t + 1;
    const h10 = t * t * t - 2 * t * t + t;
    const h01 = -2 * t * t * t + 3 * t * t;
    const h11 = t * t * t - t * t;
    const m0 = -2.42 * (0.42 - 0.155);
    const m1 = -1.618 * (0.42 - 0.155);
    return h00 * 0.928 + h10 * m0 + h01 * 0.23 + h11 * m1;
  }
  // Cánh delta chính quét ~58.3° tới đầu mút cánh cụt (u = 1.236 -> x = -1.09)
  return 0.23 - (u - 0.42) * 1.618;
};

/**
 * Toạ độ X mép sau toàn phần (chưa cắt khe cánh tà elevon) theo u = |z|.
 * Mép sau Shahed-136 thẳng góc 90° với trục dọc thân (x = -1.482), có hốc khoét đuôi ôm cụm động cơ MD-550.
 */
const wingTEFull = (u: number): number => {
  if (u < 0.29) {
    const s = smoothstep(0.11, 0.29, u);
    return -1.365 - 0.117 * s;
  }
  return -1.482;
};

/** Đường xà sau thẳng song song mép sau tại vùng khoét cánh tà elevon u ∈ [0.33, 1.13]. */
const X_ELEVON_SPAR = -1.284;

/** Phân bố bề dày khí động NACA + vuốt liền thân monocoque (blended wing-body fillet) tại (c ∈ [0,1], u = |z|, x). */
const wingSection = (c: number, u: number, x: number): { yUp: number; yLo: number } => {
  const cc = clamp(c, 0, 1);
  // Phân bố dày cánh khí động NACA chuẩn (dày nhất ở ~30% dây cung, mép sau vát sắc mỏng ~3mm)
  const naca =
    5 *
    (0.2969 * Math.sqrt(cc) -
      0.126 * cc -
      0.3516 * cc * cc +
      0.2843 * cc * cc * cc -
      0.0995 * cc * cc * cc * cc);

  // Hệ số thuôn đuôi để dải fillet không phình vượt bầu thân thuôn phía động cơ (x < -0.95)
  const aftTaper = smoothstep(-1.46, -0.92, x);
  // Đường cong fillet bậc 2 ôm mượt vào thành trụ thân trên và vòm bụng dưới (xoá hẳn rãnh gãy góc)
  const rRaw = 1 - smoothstep(0.105, 0.48, u);
  const rootFillet = rRaw * rRaw * (0.42 + 0.58 * aftTaper);
  const spanTaper = 1 - 0.56 * smoothstep(0.32, 1.236, u);

  const chordBell = Math.sin(Math.PI * clamp(0.06 + 0.88 * cc, 0, 1));
  const halfT = Math.max(0.0018, naca * (0.034 * spanTaper + 0.032 * rootFillet));

  // Camber dương nhẹ trên cánh + fillet vuốt mượt lên lưng thân và ôm tròn xuống bụng thân
  const airfoilCamber = 0.011 * Math.sin(Math.PI * Math.pow(cc, 0.82)) * spanTaper;
  const yBaseUp = Y_WING + airfoilCamber + halfT * 1.14;
  const yBaseLo = Y_WING + airfoilCamber - halfT * 0.84;

  const yUp = yBaseUp + 0.092 * rootFillet * (0.35 + 0.65 * chordBell);
  const yLo = yBaseLo - 0.056 * rootFillet * (0.30 + 0.70 * chordBell);

  return { yUp, yLo };
};

/**
 * Dựng một dải sườn cánh khí động khép kín (watertight manifold) theo danh sách trạm z tăng dần.
 * UV đặt đúng theo đơn vị mét thật (u = x, v = z -> 1 m = 1 UV) đồng bộ tuyệt đối với extrudeTop.
 */
const buildWingSpanSegment = (zStations: number[], cLimitFn: (u: number) => number): THREE.BufferGeometry => {
  const M = 36;
  const N = zStations.length - 1;
  const ringLen = M + 1;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= N; i++) {
    const z = zStations[i];
    const u = Math.abs(z);
    const xL = wingLE(u);
    const xT = wingTEFull(u);
    const chord = xL - xT;
    const cMax = cLimitFn(u);

    for (let j = 0; j <= M; j++) {
      const phi = (j / M) * Math.PI * 2;
      const rawC = 0.5 * (1 + Math.cos(phi));
      const c = rawC * cMax;
      const x = xL - c * chord;
      const { yUp, yLo } = wingSection(c, u, x);

      let y: number;
      if (j < M / 2) {
        y = yUp;
      } else if (j === M / 2) {
        y = 0.5 * (yUp + yLo);
      } else {
        y = yLo;
      }

      positions.push(x, y, z);
      uvs.push(x, z);
    }
  }

  for (let i = 0; i < N; i++) {
    const rowA = i * ringLen;
    const rowB = (i + 1) * ringLen;
    for (let j = 0; j < M; j++) {
      const a = rowA + j;
      const b = rowB + j;
      const c = rowA + j + 1;
      const d = rowB + j + 1;
      indices.push(a, b, d, a, d, c);
    }
    const aT = rowA + M;
    const bT = rowB + M;
    const cT = rowA;
    const dT = rowB;
    indices.push(aT, bT, dT, aT, dT, cT);
  }

  const half = M / 2;
  for (let k = 0; k < half - 1; k++) {
    const u0 = k;
    const u1 = k + 1;
    const l0 = M - k;
    const l1 = M - (k + 1);
    indices.push(u0, u1, l1, u0, l1, l0);

    const off = N * ringLen;
    indices.push(off + u0, off + l0, off + l1, off + u0, off + l1, off + u1);
  }
  {
    const k = half - 1;
    indices.push(k, half, M - k);
    const off = N * ringLen;
    indices.push(off + k, off + (M - k), off + half);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
};

const linspace = (a: number, b: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/** Toàn bộ cánh delta cụt liền dải gốc thân (trái + phải, khoét sẵn 2 hốc cánh tà elevon thẳng đều). */
const buildBlendedDeltaWingGeo = (): THREE.BufferGeometry => {
  const cFull = () => 1.0;
  const cSpar = (u: number) => {
    const xL = wingLE(u);
    const xT = wingTEFull(u);
    return (xL - X_ELEVON_SPAR) / (xL - xT);
  };

  const parts = [
    buildWingSpanSegment(linspace(0.08, 0.33, 16), cFull),
    buildWingSpanSegment(linspace(0.33, 1.13, 16), cSpar),
    buildWingSpanSegment(linspace(1.13, 1.236, 5), cFull),
    buildWingSpanSegment(linspace(-1.236, -1.13, 5), cFull),
    buildWingSpanSegment(linspace(-1.13, -0.33, 16), cSpar),
    buildWingSpanSegment(linspace(-0.33, -0.08, 16), cFull),
  ];

  const posAll: number[] = [];
  const normAll: number[] = [];
  const uvAll: number[] = [];
  for (const p of parts) {
    const g = p.toNonIndexed();
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      posAll.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normAll.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      uvAll.push(uv.getX(i), uv.getY(i));
    }
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(posAll, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normAll, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvAll, 2));
  return merged;
};

/** Chuẩn hoá UV thân tròn xoay lathe để ăn khớp liền mạch mật độ vân sơn repeat=0.4 với cánh delta. */
const buildMainFuselageGeo = (): THREE.BufferGeometry => {
  const profile: P2[] = [
    [0.02, -1.468],
    [0.112, -1.465],
    [0.122, -1.41],
    [0.136, -1.33],
    [0.149, -1.24],
    [0.160, -1.14],
    [0.168, -1.03],
    [0.173, -0.92],
    [0.176, -0.80],
    // Rãnh khớp khoang nhiên liệu & khoang điện tử
    [0.176, -0.425],
    [0.1735, -0.42],
    [0.176, -0.415],
    [0.176, 0.205],
    [0.1735, 0.21],
    [0.176, 0.215],
    [0.176, 0.78],
    [0.1745, 0.86],
    [0.1715, 0.92],
    [0.1695, 0.944],
    [0.02, 0.944],
  ];
  const g = lathe(profile, 48).clone();
  const uv = g.getAttribute('uv');
  const pos = g.getAttribute('position');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * 2.5, pos.getX(i));
  }
  uv.needsUpdate = true;
  return g;
};

/** Chóp mũi đầu đạn Tangent Ogive mượt 28 điểm dọc +X (x = +0.964 -> +1.640). */
const buildWarheadOgiveProfile = (): P2[] => {
  const x0 = 0.964;
  const x1 = 1.640;
  const L = x1 - x0;
  const R0 = 0.169;
  const Rtip = 0.017;
  const dr = R0 - Rtip;
  const rho = (dr * dr + L * L) / (2 * dr);
  const pts: P2[] = [[0.01, x0]];
  const SAMPLES = 26;
  for (let i = 0; i <= SAMPLES; i++) {
    const s = 1 - Math.cos(((i / SAMPLES) * Math.PI) / 2);
    const dx = s * L;
    const r = Rtip + (Math.sqrt(Math.max(0, rho * rho - dx * dx)) - (rho - dr));
    pts.push([Math.max(0.005, r), x0 + dx]);
  }
  pts.push([0.003, x1 + 0.003]);
  return pts;
};

/** Biên dạng xi-lanh tản nhiệt 7 lá của động cơ piston đối đỉnh 4 xi-lanh MD-550. */
const buildFinnedCylinderGeo = (): THREE.BufferGeometry => {
  const prof: P2[] = [[0.01, 0]];
  prof.push([0.036, 0], [0.036, 0.016]);
  for (let k = 0; k < 7; k++) {
    const yBase = 0.018 + k * 0.013;
    prof.push(
      [0.033, yBase],
      [0.058, yBase + 0.002],
      [0.058, yBase + 0.0068],
      [0.033, yBase + 0.0088],
    );
  }
  prof.push([0.039, 0.114], [0.01, 0.114]);
  const g = lathe(prof, 28).clone();
  g.rotateY(-Math.PI / 2);
  return g;
};

/**
 * Dựng khúc lá cánh quạt đẩy gỗ/composite xoắn bước khí động cho đoạn bán kính chuẩn hoá [tStart, tEnd].
 * Dùng chung cho thân lá tối màu [0, 0.88] và đầu mút sơn vạch cảnh báo [0.88, 1.0] khớp khít 100%.
 */
const buildPropBladeSliceGeo = (
  dir: 1 | -1,
  tStart: number,
  tEnd: number,
  NR: number,
  capEnd: boolean,
): THREE.BufferGeometry => {
  const NC = 12;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= NR; i++) {
    const t = tStart + ((tEnd - tStart) * i) / NR;
    const r = (0.044 + t * (0.338 - 0.044)) * dir;
    const chord =
      t < 0.16
        ? 0.028 + (t / 0.16) * 0.036
        : 0.066 * Math.sin(Math.PI * (0.18 + 0.77 * ((t - 0.16) / 0.84))) + 0.012;
    const thick = 0.016 * (1 - 0.72 * t);
    const twist = (0.48 - 0.25 * t) * dir;
    const cosA = Math.cos(twist);
    const sinA = Math.sin(twist);

    for (let j = 0; j <= NC; j++) {
      const phi = (j / NC) * Math.PI * 2;
      const u = 0.5 * Math.cos(phi);
      const v = 0.5 * Math.sin(phi) * (1 - 0.35 * Math.cos(phi));
      const localZ = u * chord;
      const localX = v * thick;
      const x = localX * cosA - localZ * sinA;
      const z = localX * sinA + localZ * cosA;
      positions.push(x, r, z);
    }
  }

  const ring = NC + 1;
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NC; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = i * ring + j + 1;
      const d = (i + 1) * ring + j + 1;
      if (dir > 0) {
        indices.push(a, c, d, a, d, b);
      } else {
        indices.push(a, b, d, a, d, c);
      }
    }
  }

  if (capEnd) {
    const tipOff = NR * ring;
    for (let k = 1; k < NC - 1; k++) {
      if (dir > 0) indices.push(tipOff, tipOff + k, tipOff + k + 1);
      else indices.push(tipOff, tipOff + k + 1, tipOff + k);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
};

// Biên dạng vây ổn định đứng đầu mút cánh (nhô cả lên trên +0.268 và xuống dưới -0.248 mặt cánh đúng đặc trưng Shahed-136)
const WINGTIP_FIN_PTS: P2[] = [
  [-1.01, -0.044],
  [-1.28, 0.266],
  [-1.525, 0.252],
  [-1.545, -0.044],
  [-1.505, -0.248],
  [-1.235, -0.236],
];

// Biên dạng mặt cắt cánh tà elevon (khe hở đều 1.4 cm suốt chiều dài xà sau)
const ELEVON_AIRFOIL_PTS: P2[] = [
  [0.0, 0.001],
  [-0.008, 0.011],
  [-0.024, 0.013],
  [-0.085, 0.009],
  [-0.183, 0.002],
  [-0.183, -0.002],
  [-0.085, -0.007],
  [-0.024, -0.010],
  [-0.008, -0.009],
];

// Biên dạng mấu gắn tên lửa đẩy xuất phát & guốc trượt bệ phóng dưới bụng
const VENTRAL_LUG_PTS: P2[] = [
  [-0.56, -0.135],
  [-0.64, -0.242],
  [-0.86, -0.242],
  [-0.98, -0.138],
];

// Đế vát khí động của cụm ăng-ten chống nhiễu CRPA 4 phần tử trên lưng
const CRPA_HOUSING_PTS: P2[] = [
  [-0.105, -0.068],
  [-0.068, -0.105],
  [0.068, -0.105],
  [0.105, -0.068],
  [0.105, 0.068],
  [0.068, 0.105],
  [-0.068, 0.105],
  [-0.105, 0.068],
];

// Nắp khoang điện tử dẫn đường INS/GNSS ôm gọn sống lưng thân trước
const AVIONICS_HATCH_PTS: P2[] = [
  [0.24, -0.062],
  [0.72, -0.058],
  [0.76, -0.036],
  [0.76, 0.036],
  [0.72, 0.058],
  [0.24, 0.062],
];

// Hằng điểm đinh tán Rivets dọc thân, vòng khớp đầu đạn, nắp điện tử và mút cánh
const RIVET_POINTS: [number, number, number][] = (() => {
  const pts: [number, number, number][] = [];
  // Vòng 18 bu-lông quanh đai khớp nối đầu đạn (x = +0.934)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const y = Y_FUSE + Math.sin(a) * (R_FUSE - 0.003);
    const z = Math.cos(a) * (R_FUSE - 0.003);
    if (y > -0.11) pts.push([0.934, y, z]);
  }
  // Vòng đinh tán vách đuôi động cơ (x = -1.43)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push([-1.43, Y_FUSE + Math.sin(a) * 0.118, Math.cos(a) * 0.118]);
  }
  // Hai hàng chốt khoá nhanh Dzus dọc nắp khoang điện tử lưng thân (x = +0.26 .. +0.72)
  for (let i = 0; i < 7; i++) {
    const x = 0.27 + i * 0.074;
    pts.push([x, Y_FUSE + R_FUSE + 0.003, -0.050]);
    pts.push([x, Y_FUSE + R_FUSE + 0.003, 0.050]);
  }
  // Hàng đinh tán dọc đường dải gốc cánh trên
  for (let i = 0; i < 9; i++) {
    const x = -1.16 + i * 0.20;
    const z = 0.25 + (1 - (i / 8) * 0.25) * 0.04;
    const xL = wingLE(z);
    const xT = wingTEFull(z);
    const c = clamp((xL - x) / (xL - xT), 0.08, 0.92);
    const { yUp } = wingSection(c, z, x);
    pts.push([x, yUp + 0.0015, z]);
    pts.push([x, yUp + 0.0015, -z]);
  }
  // Hàng 5 bu-lông chìm bắt vây đứng hai đầu cánh (z = ±1.251)
  for (let i = 0; i < 5; i++) {
    const x = -1.11 - i * 0.09;
    pts.push([x, Y_WING, 1.252]);
    pts.push([x, Y_WING, -1.252]);
  }
  return pts;
})();

export const Shahed136: React.FC<Shahed136Props> = ({ propSpin = 0.4, pitch = 0, bank = 0 }) => {
  const geos = useMemo(() => {
    const wing = buildBlendedDeltaWingGeo();
    const fuselage = buildMainFuselageGeo();
    const warhead = lathe(buildWarheadOgiveProfile(), 48);
    // Đai khớp cơ khí nối thân và đầu đạn (có rãnh âm đen sắc nét)
    const warheadCollar = lathe(
      [
        [0.168, 0.941],
        [0.1715, 0.944],
        [0.1715, 0.952],
        [0.1645, 0.954],
        [0.1645, 0.961],
        [0.170, 0.964],
      ],
      44,
    );
    // Ống đo áp suất không khí pitot kim loại nhô trước chóp mũi tới đúng x = +1.750 m
    const pitot = lathe(
      [
        [0.017, 1.638],
        [0.013, 1.662],
        [0.0135, 1.668],
        [0.0075, 1.673],
        [0.0068, 1.724],
        [0.0042, 1.730],
        [0.0038, 1.750],
        [0.0005, 1.750],
      ],
      22,
    );
    const spinner = lathe(
      [
        [0.002, -1.750],
        [0.014, -1.741],
        [0.026, -1.726],
        [0.037, -1.708],
        [0.046, -1.688],
        [0.053, -1.666],
        [0.057, -1.646],
        [0.058, -1.633],
        [0.01, -1.633],
      ],
      32,
    );
    const fin = extrude(WINGTIP_FIN_PTS, 0.030, 0.006);
    const elevon = extrude(ELEVON_AIRFOIL_PTS, 0.774, 0.004);
    const ventralLug = extrude(VENTRAL_LUG_PTS, 0.056, 0.008);
    const crpaHousing = extrudeTop(CRPA_HOUSING_PTS, 0.016, 0.005);
    const avionicsHatch = extrudeTop(AVIONICS_HATCH_PTS, 0.012, 0.004);
    const cylBarrel = buildFinnedCylinderGeo();

    // Cánh quạt đẩy 2 lá chia thân lá tối màu + mút cảnh báo vàng đồng nhất bề mặt xoắn
    const bladePos = buildPropBladeSliceGeo(1, 0, 0.87, 13, false);
    const bladePosTip = buildPropBladeSliceGeo(1, 0.87, 1.0, 4, true);
    const bladeNeg = buildPropBladeSliceGeo(-1, 0, 0.87, 13, false);
    const bladeNegTip = buildPropBladeSliceGeo(-1, 0.87, 1.0, 4, true);

    // 2 ống xả cong ngắn động cơ MD-550 đối xứng trái/phải
    const exhaustR = pipe(
      [
        [-1.545, Y_FUSE - 0.024, 0.132],
        [-1.578, Y_FUSE - 0.072, 0.168],
        [-1.622, Y_FUSE - 0.108, 0.186],
        [-1.664, Y_FUSE - 0.120, 0.190],
      ],
      0.0145,
      20,
    );
    const exhaustL = pipe(
      [
        [-1.545, Y_FUSE - 0.024, -0.132],
        [-1.578, Y_FUSE - 0.072, -0.168],
        [-1.622, Y_FUSE - 0.108, -0.186],
        [-1.664, Y_FUSE - 0.120, -0.190],
      ],
      0.0145,
      20,
    );

    // Dây cao áp đánh lửa nối tới 4 đầu bugi xi-lanh
    const ignWires = [
      pipe(
        [
          [-1.51, Y_FUSE + 0.045, 0.04],
          [-1.505, Y_FUSE + 0.056, 0.14],
          [-1.522, Y_FUSE + 0.018, 0.214],
        ],
        0.004,
        12,
      ),
      pipe(
        [
          [-1.58, Y_FUSE + 0.045, 0.04],
          [-1.585, Y_FUSE + 0.056, 0.14],
          [-1.595, Y_FUSE + 0.018, 0.214],
        ],
        0.004,
        12,
      ),
      pipe(
        [
          [-1.51, Y_FUSE + 0.045, -0.04],
          [-1.505, Y_FUSE + 0.056, -0.14],
          [-1.535, Y_FUSE + 0.018, -0.214],
        ],
        0.004,
        12,
      ),
      pipe(
        [
          [-1.58, Y_FUSE + 0.045, -0.04],
          [-1.585, Y_FUSE + 0.056, -0.14],
          [-1.608, Y_FUSE + 0.018, -0.214],
        ],
        0.004,
        12,
      ),
    ];

    return {
      wing,
      fuselage,
      warhead,
      warheadCollar,
      pitot,
      spinner,
      fin,
      elevon,
      ventralLug,
      crpaHousing,
      avionicsHatch,
      cylBarrel,
      bladePos,
      bladePosTip,
      bladeNeg,
      bladeNegTip,
      exhaustR,
      exhaustL,
      ignWires,
    };
  }, []);

  // Vật liệu chuẩn theo bảng màu PAL3D của dự án gem
  const bodyMat = paint({
    color: PAL3D.shahedBody,
    camo: PAL3D.shahedCamo,
    repeat: 0.4,
    wear: 0.2,
    dirt: 0.22,
    roughness: 0.68,
    metalness: 0.18,
    seed: 136,
  });
  const warheadMat = plain(PAL3D.shahedWarhead, 0.46, 0.26);
  const trimMat = plain(PAL3D.shahedTrim, 0.48, 0.36);
  const darkSeamMat = plain('#1d2127', 0.65, 0.25);
  const pitotMat = plain('#c2ccd6', 0.22, 0.88);
  const cylFinMat = plain('#3a414b', 0.46, 0.56);
  const cylHeadMat = plain('#68727d', 0.38, 0.68);
  const crankcaseMat = plain('#545d68', 0.42, 0.64);
  const exhaustMat = plain('#58483e', 0.40, 0.70);
  const propMat = plain('#23262c', 0.48, 0.16);
  const propTipMat = plain('#cfb974', 0.50, 0.08);
  const crpaPatchMat = plain('#e6decb', 0.38, 0.12);
  const brassPinMat = plain('#c8a654', 0.28, 0.84);

  // Cánh tà elevon liên động nhẹ theo góc pitch & bank, giữ khe hở đều rõ nét
  const elevonDeflR = clamp(-pitch * 0.28 + bank * 0.22 - 0.03, -0.32, 0.32);
  const elevonDeflL = clamp(-pitch * 0.28 - bank * 0.22 - 0.03, -0.32, 0.32);

  // 4 xi-lanh đối đỉnh động cơ boxer MD-550 (lệch dọc nhẹ giữa 2 bờ trái/phải đúng trục khuỷu thật)
  const cylinders: { x: number; side: 1 | -1 }[] = [
    { x: -1.522, side: 1 },
    { x: -1.595, side: 1 },
    { x: -1.535, side: -1 },
    { x: -1.608, side: -1 },
  ];

  return (
    <group position={[0, SHAHED_CENTER_Y, 0]}>
      <group rotation={[0, 0, pitch]}>
        <group rotation={[bank, 0, 0]}>
          {/* 1. Cánh tam giác cụt (cropped delta) liền dải gốc thân khí động (blended wing-body root fairing) */}
          <mesh geometry={geos.wing} material={bodyMat} castShadow receiveShadow />

          {/* 2. Thân trụ thuôn dài + chóp mũi đầu đạn ogive sơn tách tông + đai khớp đầu đạn + ống pitot mũi +X */}
          <group position={[0, Y_FUSE, 0]}>
            <mesh geometry={geos.fuselage} material={bodyMat} castShadow receiveShadow />
            <mesh geometry={geos.warheadCollar} material={darkSeamMat} castShadow />
            <mesh geometry={geos.warhead} material={warheadMat} castShadow receiveShadow />
            <mesh geometry={geos.pitot} material={pitotMat} castShadow />
            {/* Đai kẹp gốc ống pitot & cổng chốt ngòi nổ đầu đạn */}
            <mesh position={[1.646, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={trimMat}>
              <cylinderGeometry args={[0.0175, 0.0185, 0.014, 20]} />
            </mesh>
            <mesh position={[1.015, 0.114, 0.122]} rotation={[0.6, 0, 0]} material={plain('#bf3e2b', 0.45, 0.25)}>
              <cylinderGeometry args={[0.011, 0.011, 0.008, 12]} />
            </mesh>
          </group>

          {/* 3. Hai cánh tà elevon tách khe thẳng đều phía mép sau cánh + bản lề & u che servo dưới bụng cánh */}
          {([1, -1] as const).map((side) => (
            <React.Fragment key={side}>
              <group
                position={[-1.298, Y_WING + 0.001, side * 0.73]}
                rotation={[0, 0, side > 0 ? elevonDeflR : elevonDeflL]}
              >
                <mesh geometry={geos.elevon} material={bodyMat} castShadow receiveShadow />
              </group>
              {([0.48, 0.98] as const).map((zu) => (
                <mesh
                  key={zu}
                  position={[-1.291, Y_WING + 0.001, side * zu]}
                  geometry={rbox(0.028, 0.012, 0.016, 0.003)}
                  material={trimMat}
                />
              ))}
              <mesh
                position={[-1.20, Y_WING - 0.022, side * 0.68]}
                rotation={[0, 0, -0.06]}
                geometry={rbox(0.125, 0.024, 0.030, 0.009)}
                material={trimMat}
                castShadow
              />
            </React.Fragment>
          ))}

          {/* 4. Hai vây ổn định đứng ở hai đầu mút cánh (z = ±1.25 m) nhô cả lên trên và xuống dưới mặt cánh */}
          {([1, -1] as const).map((side) => (
            <group key={side} position={[0, 0, side * 1.235]}>
              <mesh geometry={geos.fin} material={bodyMat} castShadow receiveShadow />
              {/* Gờ nẹp kết cấu sơn đồng màu thân kèm chỉ gioăng mảnh giữ dáng hông thanh thoát */}
              <mesh
                position={[-1.29, Y_WING, side * 0.013]}
                geometry={rbox(0.41, 0.022, 0.007, 0.003)}
                material={bodyMat}
                castShadow
              />
              <mesh
                position={[-1.29, Y_WING - 0.012, side * 0.014]}
                geometry={rbox(0.40, 0.004, 0.006, 0.001)}
                material={trimMat}
              />
              {/* Que xả tĩnh điện mảnh phía chóp sau vây đứng */}
              <mesh position={[-1.555, 0.235, 0]} rotation={[0, 0, Math.PI / 2]} material={darkSeamMat}>
                <cylinderGeometry args={[0.002, 0.0015, 0.06, 6]} />
              </mesh>
            </group>
          ))}

          {/* 5. Chi tiết lưng thân: nắp khoang điện tử phẳng mượt + cụm 4 mảnh ăng-ten chống nhiễu CRPA vuông nhỏ */}
          <group position={[0, Y_FUSE + R_FUSE - 0.010, 0]}>
            <mesh geometry={geos.avionicsHatch} material={bodyMat} castShadow receiveShadow />
            <mesh position={[0.495, 0.004, 0]} geometry={rbox(0.51, 0.005, 0.122, 0.002)} material={darkSeamMat} />
          </group>

          {/* Cụm ăng-ten chống nhiễu CRPA 4 phần tử gốm vuông 2x2 đặt trong đế vát khí động đồng màu thân */}
          <group position={[-0.14, Y_FUSE + R_FUSE - 0.010, 0]}>
            <mesh geometry={geos.crpaHousing} material={bodyMat} castShadow receiveShadow />
            <mesh position={[0, 0.011, 0]} geometry={rbox(0.148, 0.010, 0.148, 0.006)} material={trimMat} />
            {([-0.039, 0.039] as const).map((dx) =>
              ([-0.039, 0.039] as const).map((dz) => (
                <group key={`${dx}_${dz}`} position={[dx, 0.019, dz]}>
                  <mesh geometry={rbox(0.052, 0.009, 0.052, 0.003)} material={crpaPatchMat} castShadow />
                  <mesh position={[0, 0.006, 0]} material={brassPinMat}>
                    <cylinderGeometry args={[0.0045, 0.0045, 0.003, 10]} />
                  </mesh>
                </group>
              )),
            )}
          </group>

          {/* Nắp tiếp nhiên liệu âm trên lưng sau và ăng-ten lá nhỏ */}
          <mesh position={[-0.58, Y_FUSE + R_FUSE - 0.001, 0]} material={trimMat}>
            <cylinderGeometry args={[0.030, 0.030, 0.007, 20]} />
          </mesh>
          <mesh
            position={[-0.78, Y_FUSE + R_FUSE + 0.020, 0]}
            rotation={[0, 0, -0.34]}
            geometry={rbox(0.060, 0.048, 0.007, 0.003)}
            material={trimMat}
          />

          {/* 6. Bụng thân: mấu gắn tên lửa đẩy RATO & 2 guốc trượt đường ray bệ phóng */}
          <mesh geometry={geos.ventralLug} material={trimMat} castShadow />
          <mesh position={[-0.75, -0.228, 0]} rotation={[Math.PI / 2, 0, 0]} material={pitotMat}>
            <cylinderGeometry args={[0.010, 0.010, 0.072, 12]} />
          </mesh>
          {([0.38, -0.26] as const).map((xl) => (
            <group key={xl} position={[xl, Y_FUSE - R_FUSE - 0.012, 0]}>
              <mesh geometry={rbox(0.11, 0.022, 0.044, 0.005)} material={trimMat} castShadow />
              <mesh position={[0, -0.014, 0]} geometry={rbox(0.09, 0.010, 0.068, 0.003)} material={crankcaseMat} />
            </group>
          ))}

          {/* Hàng đinh tán cơ khí dọc thân, khớp đầu đạn, lưng điện tử & đầu cánh */}
          <Rivets points={RIVET_POINTS} r={0.0046} color="#4b525c" />

          {/* 7. Cụm động cơ piston 4 xi-lanh đối đỉnh MD-550 phía đuôi (x ≈ -1.62) */}
          <group>
            <mesh position={[-1.466, Y_FUSE, 0]} rotation={[0, 0, Math.PI / 2]} material={trimMat} castShadow>
              <cylinderGeometry args={[0.112, 0.112, 0.014, 28]} />
            </mesh>
            {/* Lốc máy nhôm đúc trung tâm + bộ chế hoà khí & bầu lọc gió phía trên */}
            <mesh
              position={[-1.560, Y_FUSE, 0]}
              geometry={rbox(0.165, 0.118, 0.138, 0.018)}
              material={crankcaseMat}
              castShadow
            />
            <mesh
              position={[-1.525, Y_FUSE + 0.075, 0]}
              geometry={rbox(0.088, 0.042, 0.076, 0.010)}
              material={trimMat}
              castShadow
            />
            <mesh position={[-1.500, Y_FUSE + 0.104, 0]} rotation={[0, 0, Math.PI / 2]} material={cylFinMat}>
              <cylinderGeometry args={[0.024, 0.028, 0.055, 16]} />
            </mesh>

            {/* 4 đầu xi-lanh tản nhiệt đen xám đối đỉnh + nắp quy-lát nhôm sáng + bugi sứ */}
            {cylinders.map(({ x, side }, idx) => (
              <group key={idx} position={[x, Y_FUSE, side * 0.068]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
                <mesh geometry={geos.cylBarrel} material={cylFinMat} castShadow />
                <mesh
                  position={[0, 0, 0.122]}
                  geometry={rbox(0.084, 0.084, 0.026, 0.007)}
                  material={cylHeadMat}
                  castShadow
                />
                <mesh position={[0, 0.016, 0.143]} rotation={[Math.PI / 2, 0, 0]} material={crpaPatchMat}>
                  <cylinderGeometry args={[0.0075, 0.0075, 0.024, 10]} />
                </mesh>
              </group>
            ))}

            {/* Dây cao áp đánh lửa + 2 ống xả cong ngắn kèm lòng ống đen */}
            {geos.ignWires.map((wg, idx) => (
              <mesh key={idx} geometry={wg} material={darkSeamMat} />
            ))}
            <mesh geometry={geos.exhaustR} material={exhaustMat} castShadow />
            <mesh geometry={geos.exhaustL} material={exhaustMat} castShadow />
            {([1, -1] as const).map((s) => (
              <mesh
                key={s}
                position={[-1.665, Y_FUSE - 0.120, s * 0.190]}
                rotation={[0, 0, Math.PI / 2 - 0.25]}
                material={darkSeamMat}
              >
                <cylinderGeometry args={[0.010, 0.010, 0.006, 12]} />
              </mesh>
            ))}
          </group>

          {/* 8. Bầu chụp trục (spinner) & Cánh quạt đẩy 2 lá quay quanh trục X theo propSpin */}
          <group position={[0, Y_FUSE, 0]} rotation={[propSpin, 0, 0]}>
            <mesh geometry={geos.spinner} material={trimMat} castShadow />
            <mesh position={[-1.668, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={cylHeadMat}>
              <cylinderGeometry args={[0.050, 0.050, 0.024, 24]} />
            </mesh>
            <group position={[-1.668, 0, 0]}>
              <mesh geometry={geos.bladePos} material={propMat} castShadow />
              <mesh geometry={geos.bladePosTip} material={propTipMat} castShadow />
              <mesh geometry={geos.bladeNeg} material={propMat} castShadow />
              <mesh geometry={geos.bladeNegTip} material={propTipMat} castShadow />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export const MODELS: ModelSet = {
  Shahed136: { C: () => <Shahed136 propSpin={0.45} />, size: 3.8, center: [0, 0.55, 0] },
};
