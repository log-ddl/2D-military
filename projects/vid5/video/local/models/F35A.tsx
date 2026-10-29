// Mô hình 3D tỉ lệ thật 1:1 — Lockheed Martin F-35A Lightning II (USAF Conventional Takeoff & Landing)
// Kích thước thật: dài 15.67 m (x: -7.83 .. +7.84), sải cánh 10.70 m (z: -5.35 .. +5.35), cao 4.38 m (y: 0 .. 4.38 khi gear = 1).
// Quy ước trục: mũi +X, đỉnh +Y, cánh phải +Z / cánh trái -Z, mặt bánh xe chạm y = 0 khi gear = 1.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { P } from '../palette';

export type F35AProps = {
  /** Hạ/thu càng đáp 3 điểm: 1 = hạ chạm đất y=0 (mặc định), 0 = thu phẳng vào khoang. */
  gear?: number;
  /** Góc lăn bánh xe (rad). */
  wheelSpin?: number;
  /** Đóng/mở 4 cửa khoang vũ khí giấu trong bụng: 0 = đóng phẳng tàng hình (mặc định), 1 = mở 85° lộ AIM-120 & JDAM. */
  bayOpen?: number;
  /** Cường độ buồng đốt hậu động cơ đơn Pratt & Whitney F135-PW-100: 0..1 (mặc định 0). */
  afterburner?: number;
  /** Bật cấu hình "Beast Mode" mất tàng hình với 4 giá treo bom/đạn ngoại cỡ dưới hai cánh (mặc định false). */
  externalStores?: boolean;
};

/** Tâm luồng phụt động cơ đơn F135-PW-100 (dùng gắn Trail / hiệu ứng nhiệt ở các cảnh bay). */
export const F35_NOZZLE_POS: [number, number, number] = [-7.65, 1.70, 0];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type V3 = [number, number, number];

/**
 * Dựng lưới loft mượt qua dãy mặt cắt 3D `rings[i][j]` với UV theo đơn vị mét thật (1 m = 1 UV, đồng bộ 100% với extrude/extrudeTop).
 * Khi `closed = true`, nối khép điểm cuối về điểm đầu mỗi mặt cắt. `flip = true` đảo chiều tam giác khi đối xứng gương qua mặt phẳng Z=0.
 */
function buildLoft(
  rings: V3[][],
  opts: { closed?: boolean; flip?: boolean; capStart?: boolean; capEnd?: boolean; planarUV?: 'xz' | 'xy' } = {},
): THREE.BufferGeometry {
  const { closed = false, flip = false, capStart = false, capEnd = false, planarUV } = opts;
  const M = rings.length;
  const K = rings[0].length;
  const cols = closed ? K + 1 : K;

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i < M; i++) {
    let vAcc = 0;
    for (let j = 0; j < cols; j++) {
      const p = rings[i][j % K];
      if (j > 0) {
        const prev = rings[i][(j - 1) % K];
        vAcc += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
      }
      pos.push(p[0], p[1], p[2]);
      if (planarUV === 'xz') uvs.push(p[0], p[2]);
      else if (planarUV === 'xy') uvs.push(p[0], p[1]);
      else uvs.push(p[0], vAcc);
    }
  }

  for (let i = 0; i < M - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const v00 = i * cols + j;
      const v10 = (i + 1) * cols + j;
      const v11 = (i + 1) * cols + (j + 1);
      const v01 = i * cols + (j + 1);
      if (!flip) {
        idx.push(v00, v10, v11, v00, v11, v01);
      } else {
        idx.push(v00, v11, v10, v00, v01, v11);
      }
    }
  }

  const addCap = (ringIdx: number, reverse: boolean) => {
    const ring = rings[ringIdx];
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < K; j++) {
      cx += ring[j][0];
      cy += ring[j][1];
      cz += ring[j][2];
    }
    cx /= K; cy /= K; cz /= K;
    const cVert = pos.length / 3;
    pos.push(cx, cy, cz);
    uvs.push(cx, cz);
    const base = ringIdx * cols;
    for (let j = 0; j < K; j++) {
      const a = base + j;
      const b = base + ((j + 1) % K);
      const rev = flip ? !reverse : reverse;
      if (!rev) idx.push(cVert, b, a);
      else idx.push(cVert, a, b);
    }
  };

  if (closed && capStart) addCap(0, false);
  if (closed && capEnd) addCap(M - 1, true);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const mirrorRingsZ = (rings: V3[][]): V3[][] =>
  rings.map((r) => r.map(([x, y, z]) => [x, y, -z]));

// ============================================================================
// HÌNH HỌC KHUNG THÂN TÀNG HÌNH F-35A (TỈ LỆ CHUẨN BLUEPRINT 1:1)
// ============================================================================

type CenterStation = {
  x: number;
  yTop: number;
  yChine: number;
  zChine: number;
  yBot: number;
  zBot: number;
  /** 0 = vát mặt kim cương sắc (mũi/thân trước), 1 = tròn đều (ống bọc động cơ F135 ở đuôi). */
  round: number;
};

// Dãy trạm dọc thân trung tâm từ chóp mũi kim cương (+7.84 m) tới cổ loa phụt F135 (-7.02 m)
// Khoang vũ khí bụng nằm từ x = +2.12 m tới x = -1.82 m (dài 3.94 m, chứa vừa chuẩn đạn 12 ft = 3.66 m)
const UPPER_STATIONS: CenterStation[] = [
  { x: 7.84, yTop: 1.545, yChine: 1.54, zChine: 0.008, yBot: 1.535, zBot: 0.005, round: 0.08 },
  { x: 7.62, yTop: 1.62, yChine: 1.548, zChine: 0.14, yBot: 1.47, zBot: 0.08, round: 0.12 },
  { x: 7.26, yTop: 1.73, yChine: 1.56, zChine: 0.33, yBot: 1.39, zBot: 0.20, round: 0.16 },
  { x: 6.78, yTop: 1.86, yChine: 1.58, zChine: 0.53, yBot: 1.30, zBot: 0.34, round: 0.20 },
  { x: 6.20, yTop: 1.98, yChine: 1.60, zChine: 0.72, yBot: 1.22, zBot: 0.48, round: 0.24 },
  { x: 5.55, yTop: 2.07, yChine: 1.62, zChine: 0.86, yBot: 1.16, zBot: 0.59, round: 0.28 },
  { x: 4.85, yTop: 2.12, yChine: 1.64, zChine: 0.94, yBot: 1.12, zBot: 0.67, round: 0.32 },
  { x: 4.10, yTop: 2.16, yChine: 1.66, zChine: 0.96, yBot: 1.09, zBot: 0.72, round: 0.36 },
  { x: 3.35, yTop: 2.24, yChine: 1.68, zChine: 0.98, yBot: 1.08, zBot: 0.75, round: 0.42 },
  { x: 2.65, yTop: 2.38, yChine: 1.69, zChine: 1.05, yBot: 1.08, zBot: 0.79, round: 0.48 },
  { x: 2.12, yTop: 2.48, yChine: 1.69, zChine: 1.14, yBot: 1.08, zBot: 0.84, round: 0.54 }, // Vách trước khoang vũ khí
  { x: 1.25, yTop: 2.51, yChine: 1.68, zChine: 1.20, yBot: 1.08, zBot: 0.86, round: 0.58 },
  { x: 0.10, yTop: 2.49, yChine: 1.68, zChine: 1.20, yBot: 1.08, zBot: 0.86, round: 0.62 },
  { x: -1.05, yTop: 2.46, yChine: 1.68, zChine: 1.18, yBot: 1.08, zBot: 0.85, round: 0.66 },
  { x: -1.82, yTop: 2.44, yChine: 1.68, zChine: 1.14, yBot: 1.08, zBot: 0.82, round: 0.70 }, // Vách sau khoang vũ khí
  { x: -2.95, yTop: 2.40, yChine: 1.69, zChine: 1.03, yBot: 1.08, zBot: 0.74, round: 0.78 },
  { x: -4.15, yTop: 2.37, yChine: 1.70, zChine: 0.89, yBot: 1.08, zBot: 0.62, round: 0.86 },
  { x: -5.35, yTop: 2.35, yChine: 1.70, zChine: 0.75, yBot: 1.08, zBot: 0.48, round: 0.94 },
  { x: -6.30, yTop: 2.34, yChine: 1.70, zChine: 0.67, yBot: 1.06, zBot: 0.34, round: 0.99 },
  { x: -7.02, yTop: 2.33, yChine: 1.70, zChine: 0.635, yBot: 1.07, zBot: 0.24, round: 1.0 },
];

function makeUpperArc(s: CenterStation): V3[] {
  const N = 16;
  const pts: V3[] = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const ang = (1 - u) * Math.PI;
    const cz = Math.cos(ang);
    const sy = Math.sin(ang);
    const facetY = Math.pow(sy, lerp(1.36, 1.0, s.round));
    pts.push([s.x, s.yChine + (s.yTop - s.yChine) * facetY, cz * s.zChine]);
  }
  return pts;
}

function makeLowerArc(s: CenterStation): V3[] {
  const N = 16;
  const pts: V3[] = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const ang = u * Math.PI;
    const cz = Math.cos(ang);
    const sy = Math.sin(ang);
    if (s.round > 0.85) {
      const facetY = Math.pow(sy, lerp(0.76, 1.0, (s.round - 0.85) / 0.15));
      pts.push([s.x, s.yChine - (s.yChine - s.yBot) * facetY, cz * s.zChine]);
    } else {
      const absC = Math.abs(cz);
      const sgn = Math.sign(cz);
      let z: number;
      let y: number;
      if (absC > 0.55) {
        const t = (1 - absC) / 0.45;
        z = sgn * lerp(s.zChine, s.zBot, Math.pow(t, 0.92));
        y = lerp(s.yChine, s.yBot, Math.pow(t, 0.88));
      } else {
        const t = absC / 0.55;
        z = sgn * s.zBot * t;
        y = s.yBot - (1 - t * t) * 0.01 * (1 - s.round);
      }
      pts.push([s.x, y, z]);
    }
  }
  return pts;
}

const FUSE_UPPER_GEO = buildLoft(UPPER_STATIONS.map(makeUpperArc));
const FUSE_FWD_LOWER_GEO = buildLoft(UPPER_STATIONS.filter((s) => s.x >= 2.11).map(makeLowerArc));
const FUSE_AFT_LOWER_GEO = buildLoft(UPPER_STATIONS.filter((s) => s.x <= -1.81).map(makeLowerArc));

// Hai bầu cửa hút khí DSI (ngay dưới ghế phi công x = +3.45 m!) -> Vai thân Blended-Wing-Body -> Cặp phao đuôi Tailboom
type NacelleStation = {
  xTopIn: number;
  xChine: number;
  xBotOut: number;
  xBotIn: number;
  yTopIn: number;
  zTopIn: number;
  yCrown: number;
  zCrown: number;
  yChine: number;
  zChine: number;
  yBotOut: number;
  zBotOut: number;
  yBotIn: number;
  zBotIn: number;
};

const NACELLE_STATIONS: NacelleStation[] = [
  // Mép miệng hút khí DSI quét tiến ra góc vai nhọn x = +3.46, z = 1.56 (chuẩn tỉ lệ thật F-35A ngay dưới buồng lái!)
  {
    xTopIn: 3.04, xChine: 3.46, xBotOut: 2.76, xBotIn: 2.74,
    yTopIn: 2.05, zTopIn: 0.93,
    yCrown: 1.94, zCrown: 1.26,
    yChine: 1.68, zChine: 1.56,
    yBotOut: 1.11, zBotOut: 1.44,
    yBotIn: 1.09, zBotIn: 0.94,
  },
  // Sau miệng hút DSI, chuyển mượt sang gờ LEX và vai thân rộng
  {
    xTopIn: 2.52, xChine: 2.58, xBotOut: 2.44, xBotIn: 2.44,
    yTopIn: 2.21, zTopIn: 0.94,
    yCrown: 2.09, zCrown: 1.36,
    yChine: 1.68, zChine: 1.68,
    yBotOut: 1.09, zBotOut: 1.52,
    yBotIn: 1.08, zBotIn: 1.16,
  },
  // Vách trước khoang vũ khí (x = +2.12): chân trong z = 1.22 giữ mở hoàn toàn hốc khoang đạn!
  {
    xTopIn: 2.12, xChine: 2.12, xBotOut: 2.12, xBotIn: 2.12,
    yTopIn: 2.30, zTopIn: 0.94,
    yCrown: 2.16, zCrown: 1.42,
    yChine: 1.67, zChine: 1.75,
    yBotOut: 1.08, zBotOut: 1.56,
    yBotIn: 1.08, zBotIn: 1.22,
  },
  {
    xTopIn: 0.85, xChine: 0.85, xBotOut: 0.85, xBotIn: 0.85,
    yTopIn: 2.34, zTopIn: 0.96,
    yCrown: 2.18, zCrown: 1.45,
    yChine: 1.66, zChine: 1.78,
    yBotOut: 1.08, zBotOut: 1.58,
    yBotIn: 1.08, zBotIn: 1.22,
  },
  {
    xTopIn: -0.60, xChine: -0.60, xBotOut: -0.60, xBotIn: -0.60,
    yTopIn: 2.32, zTopIn: 0.96,
    yCrown: 2.17, zCrown: 1.44,
    yChine: 1.66, zChine: 1.78,
    yBotOut: 1.08, zBotOut: 1.58,
    yBotIn: 1.08, zBotIn: 1.22,
  },
  // Vách sau khoang vũ khí (x = -1.82)
  {
    xTopIn: -1.82, xChine: -1.82, xBotOut: -1.82, xBotIn: -1.82,
    yTopIn: 2.28, zTopIn: 0.92,
    yCrown: 2.15, zCrown: 1.42,
    yChine: 1.66, zChine: 1.74,
    yBotOut: 1.08, zBotOut: 1.54,
    yBotIn: 1.08, zBotIn: 1.20,
  },
  // Thân sau thon dần thành 2 phao đuôi (tailbooms) hai bên bầu động cơ F135
  {
    xTopIn: -3.20, xChine: -3.20, xBotOut: -3.20, xBotIn: -3.20,
    yTopIn: 2.22, zTopIn: 0.85,
    yCrown: 2.14, zCrown: 1.34,
    yChine: 1.67, zChine: 1.66,
    yBotOut: 1.13, zBotOut: 1.45,
    yBotIn: 1.11, zBotIn: 0.86,
  },
  {
    xTopIn: -4.65, xChine: -4.65, xBotOut: -4.65, xBotIn: -4.65,
    yTopIn: 2.14, zTopIn: 0.76,
    yCrown: 2.12, zCrown: 1.24,
    yChine: 1.67, zChine: 1.58,
    yBotOut: 1.21, zBotOut: 1.36,
    yBotIn: 1.19, zBotIn: 0.76,
  },
  {
    xTopIn: -6.10, xChine: -6.10, xBotOut: -6.10, xBotIn: -6.10,
    yTopIn: 2.04, zTopIn: 0.68,
    yCrown: 2.04, zCrown: 1.13,
    yChine: 1.68, zChine: 1.49,
    yBotOut: 1.33, zBotOut: 1.26,
    yBotIn: 1.31, zBotIn: 0.68,
  },
  {
    xTopIn: -7.10, xChine: -7.10, xBotOut: -7.10, xBotIn: -7.10,
    yTopIn: 1.89, zTopIn: 0.65,
    yCrown: 1.91, zCrown: 1.04,
    yChine: 1.68, zChine: 1.38,
    yBotOut: 1.47, zBotOut: 1.14,
    yBotIn: 1.45, zBotIn: 0.65,
  },
  {
    xTopIn: -7.56, xChine: -7.62, xBotOut: -7.56, xBotIn: -7.54,
    yTopIn: 1.74, zTopIn: 0.74,
    yCrown: 1.76, zCrown: 0.96,
    yChine: 1.68, zChine: 1.22,
    yBotOut: 1.60, zBotOut: 1.00,
    yBotIn: 1.61, zBotIn: 0.74,
  },
];

function makeNacelleRing(s: NacelleStation): V3[] {
  const xMidTop = lerp(s.xTopIn, s.xChine, 0.52);
  const xMidLow = lerp(s.xChine, s.xBotOut, 0.52);
  return [
    [s.xTopIn, s.yTopIn, s.zTopIn],
    [xMidTop, lerp(s.yTopIn, s.yCrown, 0.65), lerp(s.zTopIn, s.zCrown, 0.55)],
    [lerp(xMidTop, s.xChine, 0.55), s.yCrown, s.zCrown],
    [lerp(xMidTop, s.xChine, 0.85), lerp(s.yCrown, s.yChine, 0.55), lerp(s.zCrown, s.zChine, 0.68)],
    [s.xChine, s.yChine, s.zChine],
    [xMidLow, lerp(s.yChine, s.yBotOut, 0.55), lerp(s.zChine, s.zBotOut, 0.45)],
    [s.xBotOut, s.yBotOut, s.zBotOut],
    [lerp(s.xBotOut, s.xBotIn, 0.5), lerp(s.yBotOut, s.yBotIn, 0.5), lerp(s.zBotOut, s.zBotIn, 0.5)],
    [s.xBotIn, s.yBotIn, s.zBotIn],
    [lerp(s.xBotIn, s.xTopIn, 0.5), Math.max(1.64, lerp(s.yBotIn, s.yTopIn, 0.55)), Math.max(s.zBotIn, s.zTopIn)],
  ];
}

const NACELLE_RINGS_R = NACELLE_STATIONS.map(makeNacelleRing);
const NACELLE_R_GEO = buildLoft(NACELLE_RINGS_R, { closed: true, capEnd: true });
const NACELLE_L_GEO = buildLoft(mirrorRingsZ(NACELLE_RINGS_R), { closed: true, flip: true, capEnd: true });

// Hốc tối ống hút khí chữ S (DSI Throat Tunnel) từ x=+3.42 thụt sâu vào x=+2.15
const DSI_THROAT_RINGS_R: V3[][] = [
  [
    [3.02, 2.01, 0.95],
    [3.24, 1.90, 1.24],
    [3.42, 1.68, 1.51],
    [3.06, 1.36, 1.46],
    [2.75, 1.13, 1.38],
    [2.75, 1.12, 0.96],
    [2.88, 1.56, 0.95],
  ],
  [
    [2.18, 1.92, 0.72],
    [2.18, 1.86, 0.98],
    [2.18, 1.68, 1.20],
    [2.18, 1.42, 1.16],
    [2.18, 1.24, 1.04],
    [2.18, 1.24, 0.72],
    [2.18, 1.58, 0.70],
  ],
];
const DSI_TUNNEL_R_GEO = buildLoft(DSI_THROAT_RINGS_R, { closed: true, flip: true, capEnd: true });
const DSI_TUNNEL_L_GEO = buildLoft(mirrorRingsZ(DSI_THROAT_RINGS_R), { closed: true, flip: false, capEnd: true });

// Gờ nén khí bầu tròn DSI (Compression Bump) ốp sát hai bên má dưới buồng lái (x: +4.12 .. +2.52)
const DSI_BUMP_RINGS_R: V3[][] = [
  { x: 4.14, zPeak: 0.94, h: 0.14 },
  { x: 3.84, zPeak: 1.07, h: 0.28 },
  { x: 3.48, zPeak: 1.17, h: 0.37 },
  { x: 3.12, zPeak: 1.16, h: 0.36 },
  { x: 2.78, zPeak: 1.06, h: 0.27 },
  { x: 2.50, zPeak: 0.96, h: 0.16 },
].map(({ x, zPeak, h }) => {
  const pts: V3[] = [];
  const N = 12;
  for (let k = 0; k <= N; k++) {
    const a = -Math.PI / 2 + (k / N) * Math.PI;
    pts.push([x, 1.60 + Math.sin(a) * h, 0.89 + Math.cos(a) * (zPeak - 0.89)]);
  }
  return pts;
});
const DSI_BUMP_R_GEO = buildLoft(DSI_BUMP_RINGS_R, { flip: true });
const DSI_BUMP_L_GEO = buildLoft(mirrorRingsZ(DSI_BUMP_RINGS_R), { flip: false });

// Vòm kính giọt nước liền khối mạ vàng tàng hình (Seamless Teardrop Golden Canopy: x = +5.52 .. +1.95)
const CANOPY_STATIONS: { x: number; yBase: number; yPeak: number; w: number }[] = [
  { x: 5.52, yBase: 2.06, yPeak: 2.07, w: 0.04 },
  { x: 5.26, yBase: 2.08, yPeak: 2.23, w: 0.23 },
  { x: 4.94, yBase: 2.10, yPeak: 2.43, w: 0.37 },
  { x: 4.54, yBase: 2.12, yPeak: 2.61, w: 0.46 },
  { x: 4.10, yBase: 2.14, yPeak: 2.73, w: 0.50 },
  { x: 3.64, yBase: 2.18, yPeak: 2.75, w: 0.50 },
  { x: 3.16, yBase: 2.24, yPeak: 2.70, w: 0.46 },
  { x: 2.68, yBase: 2.34, yPeak: 2.62, w: 0.39 },
  { x: 2.28, yBase: 2.43, yPeak: 2.54, w: 0.30 },
  { x: 1.94, yBase: 2.48, yPeak: 2.50, w: 0.16 },
];
const CANOPY_GEO = buildLoft(
  CANOPY_STATIONS.map((s) => {
    const N = 20;
    const pts: V3[] = [];
    for (let k = 0; k <= N; k++) {
      const ang = (1 - k / N) * Math.PI;
      pts.push([s.x, s.yBase + Math.pow(Math.sin(ang), 0.9) * (s.yPeak - s.yBase), Math.cos(ang) * s.w]);
    }
    return pts;
  }),
);

// Cánh chính hình thang tàng hình chuẩn F-35A (sải cánh 10.70 m: z = ±1.62 .. ±5.35, mép trước quét lùi 34°, mép sau quét tiến 14.5°)
type WingStation = { z: number; xLE: number; xTE: number; y: number; t: number };
const WING_STATIONS: WingStation[] = [
  { z: 1.62, xLE: 2.22, xTE: -2.58, y: 1.66, t: 0.24 },
  { z: 2.30, xLE: 1.76, xTE: -2.40, y: 1.66, t: 0.195 },
  { z: 3.20, xLE: 1.15, xTE: -2.17, y: 1.66, t: 0.15 },
  { z: 4.15, xLE: 0.51, xTE: -1.92, y: 1.66, t: 0.105 },
  { z: 5.05, xLE: -0.10, xTE: -1.69, y: 1.66, t: 0.072 },
  { z: 5.35, xLE: -0.30, xTE: -1.61, y: 1.66, t: 0.054 },
];

/** Nội suy chính xác cao độ mặt lưng cánh tại toạ độ (x, |z|) để băng RAM ôm khít 100% bề mặt cong của cánh! */
function wingUpperYAt(x: number, absZ: number): number {
  const zClamped = Math.max(WING_STATIONS[0].z, Math.min(WING_STATIONS[WING_STATIONS.length - 1].z, absZ));
  let s0 = WING_STATIONS[0];
  let s1 = WING_STATIONS[WING_STATIONS.length - 1];
  for (let i = 0; i < WING_STATIONS.length - 1; i++) {
    if (zClamped >= WING_STATIONS[i].z && zClamped <= WING_STATIONS[i + 1].z) {
      s0 = WING_STATIONS[i];
      s1 = WING_STATIONS[i + 1];
      break;
    }
  }
  const f = s1.z > s0.z ? (zClamped - s0.z) / (s1.z - s0.z) : 0;
  const xLE = lerp(s0.xLE, s1.xLE, f);
  const xTE = lerp(s0.xTE, s1.xTE, f);
  const y0 = lerp(s0.y, s1.y, f);
  const t = lerp(s0.t, s1.t, f);
  const c = clamp01((xLE - x) / Math.max(0.01, xLE - xTE));
  const arch = Math.sin(Math.pow(c, 0.82) * Math.PI);
  return y0 + 0.54 * t * arch;
}

/** Sinh dải băng viền răng cưa RAM 3D ôm sát mặt cong khí động của cánh (không hở mép, không chìm dưới bụng cánh). */
function buildConformalWingTape(a: P2, b: P2, halfWidth: number, teeth: number, lift = 0.0045): THREE.BufferGeometry {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  const steps = teeth * 2;
  const rings: V3[][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = a[0] + dx * t;
    const pz = a[1] + dz * t;
    const w = i % 2 === 1 ? halfWidth * 1.48 : halfWidth * 0.68;
    const lx = px + nx * w, lz = pz + nz * w;
    const rx = px - nx * w, rz = pz - nz * w;
    rings.push([
      [lx, wingUpperYAt(lx, Math.abs(lz)) + lift, lz],
      [px, wingUpperYAt(px, Math.abs(pz)) + lift, pz],
      [rx, wingUpperYAt(rx, Math.abs(rz)) + lift, rz],
    ]);
  }
  return buildLoft(rings, { planarUV: 'xz' });
}

function makeWingRings(stations: WingStation[], upper: boolean): V3[][] {
  return stations.map((s) => {
    const N = 14;
    const pts: V3[] = [];
    for (let k = 0; k <= N; k++) {
      const c = upper ? 1 - k / N : k / N;
      const x = lerp(s.xLE, s.xTE, c);
      const arch = Math.sin(Math.pow(c, 0.82) * Math.PI);
      const dy = (upper ? 0.54 : -0.46) * s.t * arch;
      pts.push([x, s.y + dy, s.z]);
    }
    return pts;
  });
}

const WING_UPPER_R = makeWingRings(WING_STATIONS, true);
const WING_LOWER_R = makeWingRings(WING_STATIONS, false);
const WING_R_UPPER_GEO = buildLoft(WING_UPPER_R, { planarUV: 'xz' });
const WING_R_LOWER_GEO = buildLoft(WING_LOWER_R, { planarUV: 'xz' });
const WING_L_UPPER_GEO = buildLoft(mirrorRingsZ(WING_UPPER_R), { flip: true, planarUV: 'xz' });
const WING_L_LOWER_GEO = buildLoft(mirrorRingsZ(WING_LOWER_R), { flip: true, planarUV: 'xz' });

// Dải băng RAM răng cưa ôm khít 3D mặt lưng cánh chính
const WING_LE_TAPE_R = buildConformalWingTape([1.88, 1.80], [-0.42, 5.20], 0.072, 13);
const WING_LE_TAPE_L = buildConformalWingTape([1.88, -1.80], [-0.42, -5.20], 0.072, 13);
const WING_TE_TAPE_R = buildConformalWingTape([-2.26, 1.80], [-1.38, 5.20], 0.068, 12);
const WING_TE_TAPE_L = buildConformalWingTape([-2.26, -1.80], [-1.38, -5.20], 0.068, 12);
const WING_ROOT_TAPE_R = buildConformalWingTape([1.88, 1.78], [-2.26, 1.78], 0.072, 11);
const WING_ROOT_TAPE_L = buildConformalWingTape([1.88, -1.78], [-2.26, -1.78], 0.072, 11);
const WING_BOX_TAPE_R = buildConformalWingTape([0.92, 2.95], [-1.96, 2.95], 0.056, 9);
const WING_BOX_TAPE_L = buildConformalWingTape([0.92, -2.95], [-1.96, -2.95], 0.056, 9);
const WING_SPAN_TAPE_R = buildConformalWingTape([0.10, 1.80], [-0.82, 4.10], 0.054, 8);
const WING_SPAN_TAPE_L = buildConformalWingTape([0.10, -1.80], [-0.82, -4.10], 0.054, 8);

// U lồi pháo xoay 4 nòng 25mm GAU-22/A đặc trưng riêng của Không quân F-35A trên vai trái (z < 0, x: +2.05 .. -0.15)
const GUN_POD_RINGS_L: V3[][] = [
  { x: 2.08, w: 0.06, h: 0.02, zC: -1.16, yB: 2.28 },
  { x: 1.65, w: 0.17, h: 0.10, zC: -1.18, yB: 2.30 },
  { x: 1.05, w: 0.21, h: 0.13, zC: -1.20, yB: 2.31 },
  { x: 0.40, w: 0.19, h: 0.11, zC: -1.20, yB: 2.30 },
  { x: -0.18, w: 0.08, h: 0.02, zC: -1.18, yB: 2.28 },
].map(({ x, w, h, zC, yB }) => {
  const pts: V3[] = [];
  for (let k = 0; k <= 10; k++) {
    const ang = (1 - k / 10) * Math.PI;
    pts.push([x, yB + Math.sin(ang) * h, zC + Math.cos(ang) * w]);
  }
  return pts;
});
const GUN_BLISTER_L_GEO = buildLoft(GUN_POD_RINGS_L, { planarUV: 'xz' });

// ============================================================================
// CÁNH ĐUÔI NGANG, ĐUÔI ĐỨNG NGHIÊNG 25° QUÉT LÙI CHUẨN F-35A & EOTS (extrude / extrudeTop / lathe)
// ============================================================================

// Cánh đuôi ngang toàn động (Horizontal Stabilator — cùng góc quét mép trước 34° & mép sau 14.8°, mút sau chạm đúng x = -7.83 m!)
const STAB_PTS_R: P2[] = [
  [-4.65, 1.38],
  [-6.04, 3.43],
  [-7.28, 3.43],
  [-7.83, 1.35],
];
const STAB_PTS_L: P2[] = STAB_PTS_R.map(([x, z]) => [x, -z]);
const STAB_R_GEO = extrudeTop(STAB_PTS_R, 0.086, 0.032);
const STAB_L_GEO = extrudeTop(STAB_PTS_L, 0.086, 0.032);

function makeSawtoothStrip2D(a: P2, b: P2, halfWidth: number, teeth: number): P2[] {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  const leftSide: P2[] = [];
  const rightSide: P2[] = [];
  const steps = teeth * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = a[0] + dx * t;
    const pz = a[1] + dz * t;
    const w = i % 2 === 1 ? halfWidth * 1.45 : halfWidth * 0.68;
    leftSide.push([px + nx * w, pz + nz * w]);
    rightSide.unshift([px - nx * w, pz - nz * w]);
  }
  return [...leftSide, ...rightSide];
}

const STAB_TAPE_R = extrudeTop(makeSawtoothStrip2D([-4.94, 1.48], [-6.22, 3.32], 0.058, 8), 0.012, 0.002);
const STAB_TAPE_L = extrudeTop(makeSawtoothStrip2D([-4.94, -1.48], [-6.22, -3.32], 0.058, 8), 0.012, 0.002);

// Cánh đuôi đứng kép nghiêng ngoài 25°: CẢ mép trước (40°) LẪN mép sau (13°) đều quét lùi đúng dáng hình bình hành F-35A!
// Đặt gốc tại y = 2.09 m, đỉnh y_local = 2.526 m -> cao độ thật 2.09 + 2.526 * cos(25°) = 2.09 + 2.29 = 4.38 m chuẩn xác!
const VFIN_PTS: P2[] = [
  [-3.86, 0.0],
  [-5.98, 2.526],
  [-7.16, 2.45],
  [-6.66, 0.0],
];
const VFIN_GEO = extrude(VFIN_PTS, 0.102, 0.035);

// Hốc hút gió làm mát ở gốc trước mỗi cánh đuôi đứng
const VFIN_SCOOP_GEO = extrude(
  [
    [-3.38, 0.0],
    [-3.48, 0.21],
    [-4.02, 0.25],
    [-4.10, 0.0],
  ],
  0.145,
  0.024,
);

// Dải băng RAM viền mép trước & bản lề cánh lái hướng (Rudder) trên cánh đuôi đứng
const VFIN_TAPE_GEO = extrude(
  [
    [-3.98, 0.06],
    [-6.02, 2.48],
    [-6.16, 2.47],
    [-4.14, 0.06],
  ],
  0.109,
  0.004,
);
const VFIN_RUDDER_TAPE_GEO = extrude(
  [
    [-6.86, 2.43],
    [-7.02, 2.42],
    [-6.56, 0.07],
    [-6.40, 0.07],
  ],
  0.109,
  0.004,
);

// Cửa tiếp dầu trên không UARRSI hình thoi răng cưa trên sống lưng (đặc trưng riêng F-35A Không quân Mỹ!)
const REFUEL_DOOR_TAPE_GEO = extrudeTop(
  [
    [1.68, 0.0],
    [1.20, 0.24],
    [0.56, 0.24],
    [0.10, 0.0],
    [0.56, -0.24],
    [1.20, -0.24],
  ],
  0.016,
  0.003,
);
const REFUEL_INNER_GEO = extrudeTop(
  [
    [1.52, 0.0],
    [1.15, 0.16],
    [0.61, 0.16],
    [0.26, 0.0],
    [0.61, -0.16],
    [1.15, -0.16],
  ],
  0.018,
  0.002,
);

// Hai bầu cơ cấu chấp hành cánh tà (Flaperon Actuator Pods) dưới mỗi cánh chính
const FLAPERON_POD_GEO = lathe(
  [
    [0.001, -0.60],
    [0.052, -0.44],
    [0.068, -0.10],
    [0.060, 0.28],
    [0.001, 0.54],
  ],
  18,
);

// Lăng kính cảm biến quang-điện tử EOTS đa diện nhô rõ dưới cằm mũi (x: +5.25 .. +6.25 m, y: 0.99 .. 1.22 m)
const EOTS_HOUSING_GEO = extrude(
  [
    [6.26, 1.23],
    [5.90, 0.99],
    [5.34, 1.01],
    [5.18, 1.18],
  ],
  0.34,
  0.02,
);
const EOTS_WINDOW_FWD_GEO = extrude(
  [
    [6.18, 1.20],
    [5.91, 1.005],
    [5.81, 1.015],
    [6.06, 1.205],
  ],
  0.27,
  0.008,
);
const EOTS_WINDOW_SIDE_GEO = extrude(
  [
    [6.08, 1.18],
    [5.88, 1.015],
    [5.44, 1.03],
    [5.32, 1.15],
  ],
  0.354,
  0.006,
);

// ============================================================================
// LOA PHỤT ĐƠN F135-PW-100 CÁNH RĂNG CƯA TÀNG HÌNH & BUỒNG ĐỐT HẬU
// ============================================================================

const F135_PETAL_COUNT = 18;

const F135_OUTER_PETAL_GEO = extrudeTop(
  [
    [0.02, -0.108],
    [0.02, 0.108],
    [-0.46, 0.095],
    [-0.67, 0.0], // Mũi nhọn răng cưa chevron vươn ra x = -7.67 m
    [-0.46, -0.095],
  ],
  0.028,
  0.005,
);

const F135_INNER_PETAL_GEO = extrudeTop(
  [
    [0.0, -0.095],
    [0.0, 0.095],
    [-0.48, 0.082],
    [-0.62, 0.0],
    [-0.48, -0.082],
  ],
  0.022,
  0.004,
);

const F135_FWD_CHEVRON_GEO = extrudeTop(
  [
    [0.25, 0.0],
    [0.0, 0.112],
    [-0.04, 0.112],
    [-0.04, -0.112],
    [0.0, -0.112],
  ],
  0.024,
  0.004,
);

const F135_LINER_GEO = lathe(
  [
    [0.54, -7.45],
    [0.56, -7.00],
    [0.56, -6.05],
    [0.53, -6.05],
    [0.53, -7.45],
  ],
  36,
);
const F135_CONE_GEO = lathe(
  [
    [0.001, -6.58],
    [0.14, -6.32],
    [0.22, -6.05],
  ],
  24,
);
const F135_AB_OUTER_GEO = lathe(
  [
    [0.001, -3.5],
    [0.26, -2.5],
    [0.44, -1.2],
    [0.52, -0.25],
    [0.49, 0.0],
  ],
  28,
);
const F135_AB_CORE_GEO = lathe(
  [
    [0.001, -2.2],
    [0.17, -1.4],
    [0.30, -0.5],
    [0.34, 0.0],
  ],
  24,
);

// ============================================================================
// VŨ KHÍ TRONG KHOANG BỤNG (AIM-120C/D AMRAAM 3.66 m & BOM JDAM GBU-31 12 ft) + GIÁ TREO NGOÀI
// ============================================================================

const AMRAAM_BODY_GEO = lathe(
  [
    [0.09, -1.83],
    [0.089, -1.75],
    [0.089, 1.28],
    [0.072, 1.52],
    [0.040, 1.71],
    [0.002, 1.83],
  ],
  24,
);
const AMRAAM_RADOME_GEO = lathe(
  [
    [0.0895, 1.28],
    [0.0725, 1.52],
    [0.0405, 1.71],
    [0.002, 1.832],
  ],
  24,
);
const AMRAAM_MID_FIN_GEO = extrude(
  [
    [0.22, 0.08],
    [-0.08, 0.25],
    [-0.24, 0.25],
    [-0.28, 0.08],
  ],
  0.012,
  0.002,
);
const AMRAAM_TAIL_FIN_GEO = extrude(
  [
    [-1.44, 0.08],
    [-1.66, 0.26],
    [-1.81, 0.26],
    [-1.81, 0.08],
  ],
  0.012,
  0.002,
);

const JDAM_BODY_GEO = lathe(
  [
    [0.12, -1.80],
    [0.17, -1.35],
    [0.215, -0.85],
    [0.22, 0.55],
    [0.185, 1.05],
    [0.115, 1.48],
    [0.035, 1.74],
    [0.002, 1.80],
  ],
  28,
);
const JDAM_TAILKIT_GEO = lathe(
  [
    [0.124, -1.80],
    [0.175, -1.34],
    [0.218, -0.88],
    [0.002, -0.88],
  ],
  28,
);
const JDAM_NOSE_BAND_GEO = lathe(
  [
    [0.146, 1.32],
    [0.122, 1.45],
    [0.118, 1.45],
    [0.142, 1.32],
  ],
  24,
);
const JDAM_FIN_GEO = extrude(
  [
    [-1.18, 0.14],
    [-1.56, 0.34],
    [-1.79, 0.34],
    [-1.79, 0.12],
  ],
  0.016,
  0.003,
);

const WING_PYLON_GEO = extrude(
  [
    [0.85, 0.0],
    [0.52, -0.34],
    [-0.78, -0.34],
    [-0.96, 0.0],
  ],
  0.11,
  0.016,
);

// Đinh tán vi mô dọc gốc cánh, sườn lưng & cổ động cơ
const F35_RIVET_PTS: V3[] = (() => {
  const pts: V3[] = [];
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const x = lerp(1.75, -2.15, i / 13);
      pts.push([x, wingUpperYAt(x, 1.74) + 0.006, sgn * 1.74]);
    }
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      pts.push([lerp(5.15, 2.25, t), lerp(2.11, 2.40, t * t), sgn * lerp(0.32, 0.40, Math.sin(t * Math.PI))]);
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const y = 1.70 + Math.sin(a) * 0.652;
    const z = Math.cos(a) * 0.652;
    if (Math.abs(z) < 0.58 || y > 1.86 || y < 1.44) {
      pts.push([-6.68, y, z]);
    }
  }
  return pts;
})();

// ============================================================================
// SUB-COMPONENTS: TÊN LỬA AIM-120 AMRAAM & BOM CHÍNH XÁC 12 FT JDAM
// ============================================================================

const Aim120Store: React.FC = () => {
  const bodyMat = plain(P.ordWhite, 0.38, 0.25);
  const radomeMat = plain('#647282', 0.32, 0.22);
  const finMat = plain('#495666', 0.4, 0.55);
  return (
    <group>
      <mesh geometry={AMRAAM_BODY_GEO} material={bodyMat} castShadow />
      <mesh geometry={AMRAAM_RADOME_GEO} material={radomeMat} castShadow />
      <mesh position={[0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(P.amber, 0.4, 0.2)}>
        <cylinderGeometry args={[0.0905, 0.0905, 0.07, 20]} />
      </mesh>
      <mesh position={[-0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#6b442a', 0.45, 0.2)}>
        <cylinderGeometry args={[0.0905, 0.0905, 0.08, 20]} />
      </mesh>
      {[45, 135, 225, 315].map((deg) => (
        <group key={deg} rotation={[(deg * Math.PI) / 180, 0, 0]}>
          <mesh geometry={AMRAAM_MID_FIN_GEO} material={finMat} castShadow />
          <mesh geometry={AMRAAM_TAIL_FIN_GEO} material={finMat} castShadow />
        </group>
      ))}
    </group>
  );
};

const Jdam12FtStore: React.FC = () => {
  const warheadMat = plain('#485446', 0.58, 0.28);
  const tailMat = plain(P.ordMid, 0.44, 0.38);
  const strapMat = plain(P.ordDark, 0.45, 0.52);
  return (
    <group>
      <mesh geometry={JDAM_BODY_GEO} material={warheadMat} castShadow />
      <mesh geometry={JDAM_TAILKIT_GEO} material={tailMat} castShadow />
      <mesh geometry={JDAM_NOSE_BAND_GEO} material={plain(P.amber, 0.42, 0.2)} />
      <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={strapMat}>
        <cylinderGeometry args={[0.225, 0.225, 0.36, 24]} />
      </mesh>
      {[0, 90, 180, 270].map((deg) => (
        <group key={deg} rotation={[(deg * Math.PI) / 180, 0, 0]}>
          <mesh geometry={JDAM_FIN_GEO} material={strapMat} castShadow />
        </group>
      ))}
    </group>
  );
};

// ============================================================================
// COMPONENT CHÍNH: LOCKHEED MARTIN F-35A LIGHTNING II (1:1)
// ============================================================================

export const F35A: React.FC<F35AProps> = ({
  gear = 1,
  wheelSpin = 0,
  bayOpen = 0,
  afterburner = 0,
  externalStores = false,
}) => {
  const g = clamp01(gear);
  const bay = clamp01(bayOpen);
  const ab = clamp01(afterburner);

  // Vật liệu sơn tàng hình Have Glass V đúng thông số chuẩn thiết kế mỹ thuật vid5
  const skinMat = paint({
    color: P.f35Mid,
    camo: [P.f35Dark, P.f35Light],
    camoScale: 1.6,
    wear: 0.14,
    dirt: 0.16,
    roughness: 0.48,
    metalness: 0.42,
    repeat: 0.42,
    seed: 35,
  });

  const radomeMat = paint({
    color: P.f35Dark,
    camo: [P.f35Mid],
    camoScale: 2.1,
    wear: 0.08,
    dirt: 0.1,
    roughness: 0.42,
    metalness: 0.38,
    repeat: 0.46,
    seed: 39,
  });

  const ramTapeMat = plain(P.f35Tape, 0.42, 0.36);
  const darkMetalMat = plain('#1f252e', 0.38, 0.68);
  const intakeDarkMat = plain('#0a0d12', 0.9, 0.12);
  const canopyMat = plain(P.f35Canopy, 0.11, 0.56, { transparent: true, opacity: 0.78 });
  const eotsGlassMat = plain('#33b5e8', 0.06, 0.88, { emissive: '#d6942a', emissiveIntensity: 0.32 });
  const bayWhiteMat = plain('#dfe7f0', 0.44, 0.16);
  const bayFrameMat = plain('#b6c4d4', 0.42, 0.36);
  const strutWhiteMat = plain('#eaeff5', 0.34, 0.22);
  const chromeMat = plain('#d4dfe9', 0.14, 0.92);
  // Kim loại titan/Inconel nung nhiệt ánh đồng-xám cho cánh răng cưa loa phụt F135 nổi khối sắc nét
  const nozzleOuterMat = plain('#3d424d', 0.30, 0.84);
  const nozzleChevronMat = plain('#545b68', 0.28, 0.86);
  const nozzleInnerMat = plain('#20242c', 0.38, 0.76);

  const bayPipes = useMemo(
    () => [
      pipe([[-1.75, 1.56, -0.35], [0.15, 1.58, -0.32], [2.05, 1.56, -0.35]], 0.016, 16),
      pipe([[-1.75, 1.56, 0.35], [0.15, 1.58, 0.32], [2.05, 1.56, 0.35]], 0.016, 16),
    ],
    [],
  );

  const doorAng = bay * ((85 * Math.PI) / 180);
  const petalPitch = lerp(-0.085, 0.025, ab);

  return (
    <group>
      {/* ==================== 1. THÂN TÀNG HÌNH KIM CƯƠNG & DSI ==================== */}
      <mesh geometry={FUSE_UPPER_GEO} material={skinMat} castShadow receiveShadow />
      <mesh geometry={FUSE_FWD_LOWER_GEO} material={skinMat} castShadow receiveShadow />
      <mesh geometry={FUSE_AFT_LOWER_GEO} material={skinMat} castShadow receiveShadow />

      {/* Hai bầu hút khí DSI -> Vai thân Blended-Wing-Body -> Cặp phao đuôi Tailboom */}
      <mesh geometry={NACELLE_R_GEO} material={skinMat} castShadow receiveShadow />
      <mesh geometry={NACELLE_L_GEO} material={skinMat} castShadow receiveShadow />

      {/* Lòng ống hút khí chữ S tối sâu + Gờ nén khí bầu tròn DSI sát hai bên má dưới buồng lái */}
      <mesh geometry={DSI_TUNNEL_R_GEO} material={intakeDarkMat} />
      <mesh geometry={DSI_TUNNEL_L_GEO} material={intakeDarkMat} />
      <mesh geometry={DSI_BUMP_R_GEO} material={skinMat} castShadow receiveShadow />
      <mesh geometry={DSI_BUMP_L_GEO} material={skinMat} castShadow receiveShadow />

      {/* Chóp mũi Radome cảm biến radar AESA AN/APG-81 & 2 ống đo khí động thông minh hai bên mũi */}
      <mesh position={[7.74, 1.543, 0]} rotation={[0, 0, -Math.PI / 2]} material={radomeMat}>
        <coneGeometry args={[0.06, 0.24, 16]} />
      </mesh>
      {[-1, 1].map((sgn) => (
        <mesh
          key={`pitot-${sgn}`}
          position={[6.75, 1.58, sgn * 0.51]}
          rotation={[0, sgn * 0.15, -Math.PI / 2]}
          material={darkMetalMat}
        >
          <coneGeometry args={[0.014, 0.22, 8]} />
        </mesh>
      ))}

      {/* U pháo xoay 25mm GAU-22/A trên vai trái (đặc điểm riêng của F-35A) + khe cửa xả nòng răng cưa */}
      <mesh geometry={GUN_BLISTER_L_GEO} material={skinMat} castShadow />
      <mesh position={[1.84, 2.35, -1.17]} rotation={[0.06, 0, -0.16]} geometry={rbox(0.38, 0.018, 0.14, 0.005)} material={ramTapeMat} />
      <mesh position={[1.95, 2.355, -1.17]} rotation={[0, 0, -Math.PI / 2]} material={intakeDarkMat}>
        <cylinderGeometry args={[0.032, 0.032, 0.12, 12]} />
      </mesh>

      {/* Cụm lăng kính quang-điện tử EOTS đa diện nhô sắc nét dưới cằm mũi (x ≈ +5.75 m) */}
      <group>
        <mesh geometry={EOTS_HOUSING_GEO} material={darkMetalMat} castShadow />
        <mesh geometry={EOTS_WINDOW_FWD_GEO} material={eotsGlassMat} />
        <mesh geometry={EOTS_WINDOW_SIDE_GEO} material={eotsGlassMat} />
        {/* Khung nẹp kim loại chia ô mặt kính sapphire EOTS */}
        <mesh position={[5.98, 1.09, 0]} rotation={[0, 0, 0.62]} geometry={rbox(0.36, 0.02, 0.025, 0.004)} material={darkMetalMat} />
        <mesh position={[5.72, 1.18, 0]} rotation={[0, 0, -0.05]} geometry={rbox(1.08, 0.024, 0.42, 0.006)} material={ramTapeMat} />
      </group>

      {/* ==================== 2. BUỒNG LÁI HMDS & VÒM KÍNH MẠ VÀNG LIỀN KHỐI ==================== */}
      <group>
        {/* Hốc buồng lái tối bên trong */}
        <mesh position={[3.78, 2.14, 0]} geometry={rbox(3.05, 0.14, 0.80, 0.04)} material={plain('#12171f', 0.82, 0.18)} />
        {/* Bảng màn hình cảm ứng toàn cảnh Panoramic Cockpit Display 20x8 inch phát sáng cyan nhẹ */}
        <mesh position={[4.76, 2.27, 0]} rotation={[0, 0, -0.35]} geometry={rbox(0.08, 0.24, 0.56, 0.015)} material={darkMetalMat} />
        <mesh
          position={[4.71, 2.28, 0]}
          rotation={[0, 0, -0.35]}
          geometry={rbox(0.02, 0.19, 0.50, 0.005)}
          material={plain('#184860', 0.18, 0.3, { emissive: P.cyan, emissiveIntensity: 0.35 })}
        />
        {/* Vòm che chói bảng đồng hồ */}
        <mesh position={[4.96, 2.25, 0]} rotation={[0, 0, -0.22]} geometry={rbox(0.55, 0.10, 0.52, 0.03)} material={plain('#161b24', 0.75, 0.2)} />

        {/* Ghế phóng Martin-Baker US16E nghiêng 18° */}
        <group position={[3.64, 2.23, 0]} rotation={[0, 0, 0.30]}>
          <mesh position={[0, 0.18, 0]} geometry={rbox(0.14, 0.54, 0.42, 0.025)} material={plain('#1e242d', 0.6, 0.35)} />
          <mesh position={[0.14, -0.02, 0]} geometry={rbox(0.36, 0.12, 0.40, 0.025)} material={plain('#354037', 0.75, 0.1)} />
          {[-0.14, 0.14].map((zOff) => (
            <mesh key={zOff} position={[-0.02, 0.49, zOff]} geometry={rbox(0.12, 0.12, 0.05, 0.01)} material={darkMetalMat} />
          ))}
        </group>

        {/* Phi công mặc giáp bay & mũ bay sợi carbon Gen III HMDS */}
        <group position={[3.78, 2.29, 0]}>
          <mesh position={[0.04, 0.04, 0]} rotation={[0, 0, 0.22]} geometry={rbox(0.28, 0.30, 0.38, 0.08)} material={plain('#38443a', 0.78, 0.1)} />
          <mesh position={[0.02, 0.25, 0]} material={plain('#1c222b', 0.26, 0.52)}>
            <sphereGeometry args={[0.142, 20, 16]} />
          </mesh>
          <mesh position={[0.08, 0.26, 0]} rotation={[0, 0, -0.18]} material={plain('#1a526e', 0.08, 0.88)}>
            <sphereGeometry args={[0.126, 18, 14, -Math.PI * 0.45, Math.PI * 0.9, Math.PI * 0.2, Math.PI * 0.48]} />
          </mesh>
        </group>

        {/* Gọng gia cường mảnh nằm NGANG trong mặt phẳng Y–Z BÊN DƯỚI mặt kính trước (tuyệt đối không nhô ra ngoài vòm kính!) */}
        <mesh position={[4.52, 2.16, 0]} rotation={[0, Math.PI / 2, 0]} material={plain('#1e242d', 0.5, 0.5)}>
          <torusGeometry args={[0.37, 0.016, 8, 24, Math.PI]} />
        </mesh>

        {/* Vòm kính giọt nước mạ vàng đồng tàng hình liền khối mượt tuyệt đối */}
        <mesh geometry={CANOPY_GEO} material={canopyMat} castShadow />

        {/* Viền băng RAM răng cưa quanh mép chân vòm kính */}
        {[-1, 1].map((sgn) => (
          <mesh
            key={`canopy-sill-${sgn}`}
            position={[3.78, 2.22, sgn * 0.44]}
            rotation={[sgn * 0.22, sgn * -0.055, -0.115]}
            geometry={rbox(3.25, 0.034, 0.085, 0.008)}
            material={ramTapeMat}
          />
        ))}
      </group>

      {/* ==================== 3. CÁNH CHÍNH HÌNH THANG, ĐUÔI CHỮ V 25° & BĂNG RAM ==================== */}
      <mesh geometry={WING_R_UPPER_GEO} material={skinMat} castShadow receiveShadow />
      <mesh geometry={WING_R_LOWER_GEO} material={skinMat} castShadow receiveShadow />
      <mesh geometry={WING_L_UPPER_GEO} material={skinMat} castShadow receiveShadow />
      <mesh geometry={WING_L_LOWER_GEO} material={skinMat} castShadow receiveShadow />

      {/* Cặp bầu che cơ cấu lái cánh tà dưới mỗi cánh + đèn biên đầu cánh tàng hình */}
      {[-1, 1].map((sgn) => (
        <React.Fragment key={`flap-pods-${sgn}`}>
          <mesh position={[-1.92, 1.56, sgn * 2.48]} geometry={FLAPERON_POD_GEO} material={skinMat} castShadow />
          <mesh position={[-1.72, 1.58, sgn * 3.68]} scale={[0.82, 0.82, 0.82]} geometry={FLAPERON_POD_GEO} material={skinMat} castShadow />
          <mesh
            position={[-0.95, 1.66, sgn * 5.345]}
            geometry={rbox(0.55, 0.026, 0.03, 0.006)}
            material={plain(sgn < 0 ? P.red : P.green, 0.2, 0.2, {
              emissive: sgn < 0 ? P.red : P.green,
              emissiveIntensity: 0.55,
            })}
          />
        </React.Fragment>
      ))}

      {/* Cánh đuôi ngang toàn động (mút sau tại x = -7.83 m, hoàn tất chiều dài chuẩn 15.67 m) */}
      <mesh position={[0, 1.635, 0]} geometry={STAB_R_GEO} material={skinMat} castShadow receiveShadow />
      <mesh position={[0, 1.635, 0]} geometry={STAB_L_GEO} material={skinMat} castShadow receiveShadow />

      {/* Hai cánh đuôi đứng nghiêng ra ngoài chuẩn 25° (cả mép trước & mép sau quét lùi chuẩn F-35A, đỉnh chạm y = 4.38 m!) */}
      {[-1, 1].map((sgn) => (
        <group
          key={`vfin-${sgn}`}
          position={[0, 2.09, sgn * 1.08]}
          rotation={[sgn * ((25 * Math.PI) / 180), 0, 0]}
        >
          <mesh geometry={VFIN_GEO} material={skinMat} castShadow receiveShadow />
          <mesh geometry={VFIN_SCOOP_GEO} material={skinMat} castShadow />
          <mesh position={[-3.39, 0.10, 0]} geometry={rbox(0.05, 0.13, 0.10, 0.01)} material={intakeDarkMat} />
          <mesh geometry={VFIN_TAPE_GEO} material={ramTapeMat} />
          <mesh geometry={VFIN_RUDDER_TAPE_GEO} material={ramTapeMat} />
        </group>
      ))}

      {/* Bầu móc hãm đà khẩn cấp ôm gọn sát bụng sau */}
      <mesh position={[-4.55, 1.08, 0]} geometry={rbox(1.55, 0.06, 0.18, 0.02)} material={skinMat} />

      {/* Hệ thống dải băng viền tấm vỏ răng cưa RAM (P.f35Tape) ôm khít 3D mặt cánh, lưng và mũi */}
      <group>
        <mesh geometry={WING_LE_TAPE_R} material={ramTapeMat} />
        <mesh geometry={WING_LE_TAPE_L} material={ramTapeMat} />
        <mesh geometry={WING_TE_TAPE_R} material={ramTapeMat} />
        <mesh geometry={WING_TE_TAPE_L} material={ramTapeMat} />
        <mesh geometry={WING_ROOT_TAPE_R} material={ramTapeMat} />
        <mesh geometry={WING_ROOT_TAPE_L} material={ramTapeMat} />
        <mesh geometry={WING_BOX_TAPE_R} material={ramTapeMat} />
        <mesh geometry={WING_BOX_TAPE_L} material={ramTapeMat} />
        <mesh geometry={WING_SPAN_TAPE_R} material={ramTapeMat} />
        <mesh geometry={WING_SPAN_TAPE_L} material={ramTapeMat} />
        <mesh position={[0, 1.716, 0]} geometry={STAB_TAPE_R} material={ramTapeMat} />
        <mesh position={[0, 1.716, 0]} geometry={STAB_TAPE_L} material={ramTapeMat} />

        {/* Cửa tiếp dầu trên không hình thoi UARRSI trên sống lưng sau vòm kính */}
        <mesh position={[0, 2.496, 0]} geometry={REFUEL_DOOR_TAPE_GEO} material={ramTapeMat} />
        <mesh position={[0, 2.498, 0]} geometry={REFUEL_INNER_GEO} material={skinMat} />

        {/* Đường giáp mối răng cưa khoang radar mũi x = +6.20 & khoang điện tử lưng */}
        {[-1, 1].map((sgn) => (
          <React.Fragment key={`dorsal-tape-${sgn}`}>
            <mesh
              position={[6.20, 1.83, sgn * 0.36]}
              rotation={[sgn * 0.62, sgn * -0.22, -0.22]}
              geometry={rbox(0.085, 0.02, 0.60, 0.004)}
              material={ramTapeMat}
            />
            <mesh
              position={[-1.25, 2.42, sgn * 0.54]}
              rotation={[sgn * 0.25, 0, 0.02]}
              geometry={rbox(2.55, 0.018, 0.08, 0.004)}
              material={ramTapeMat}
            />
            <mesh
              position={[-3.75, 2.34, sgn * 0.48]}
              rotation={[sgn * 0.32, 0, 0.03]}
              geometry={rbox(1.75, 0.018, 0.08, 0.004)}
              material={ramTapeMat}
            />
          </React.Fragment>
        ))}
      </group>

      {/* ==================== 4. LOA PHỤT ĐƠN F135 CÁNH RĂNG CƯA & BUỒNG ĐỐT HẬU ==================== */}
      <group>
        {/* Ống lót gốm trong lòng động cơ, nón tuabin & vành giữ lửa */}
        <mesh position={[0, 1.70, 0]} geometry={F135_LINER_GEO} material={plain('#2c2723', 0.78, 0.24)} />
        <mesh position={[0, 1.70, 0]} geometry={F135_CONE_GEO} material={darkMetalMat} />
        {[0.24, 0.39].map((rRing, idx) => (
          <mesh key={idx} position={[-6.22 - idx * 0.12, 1.70, 0]} rotation={[0, Math.PI / 2, 0]} material={plain('#3d3630', 0.6, 0.45)}>
            <torusGeometry args={[rRing, 0.018, 8, 28]} />
          </mesh>
        ))}

        {/* 18 răng cưa kim loại khoá trước cổ loa phụt + 18 cánh hoa răng cưa ngoài + 18 cánh lót trong */}
        <group position={[-7.00, 1.70, 0]}>
          {Array.from({ length: F135_PETAL_COUNT }, (_, i) => {
            const ang = (i / F135_PETAL_COUNT) * Math.PI * 2;
            const angHalf = ((i + 0.5) / F135_PETAL_COUNT) * Math.PI * 2;
            return (
              <React.Fragment key={`petal-${i}`}>
                <group rotation={[ang, 0, 0]}>
                  <mesh position={[0, 0.638, 0]} rotation={[0, 0, -0.03]} geometry={F135_FWD_CHEVRON_GEO} material={nozzleChevronMat} castShadow />
                  <group position={[0, 0.635, 0]} rotation={[0, 0, petalPitch]}>
                    <mesh geometry={F135_OUTER_PETAL_GEO} material={nozzleOuterMat} castShadow />
                  </group>
                </group>
                <group rotation={[angHalf, 0, 0]}>
                  <group position={[0, 0.612, 0]} rotation={[0, 0, petalPitch]}>
                    <mesh geometry={F135_INNER_PETAL_GEO} material={nozzleInnerMat} />
                  </group>
                </group>
              </React.Fragment>
            );
          })}
        </group>

        {/* Luồng lửa buồng đốt hậu F135 nhiều lớp & vân kim cương siêu âm (điều khiển bởi afterburner 0..1) */}
        {ab > 0.005 && (
          <group position={[-7.18, 1.70, 0]}>
            <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(P.flame, 0.2, 0, { emissive: P.flame, emissiveIntensity: 2.6 * ab })}>
              <cylinderGeometry args={[0.50, 0.52, 0.95, 28, 1, true]} />
            </mesh>
            <mesh
              scale={[0.55 + ab * 0.95, 0.86 + ab * 0.22, 0.86 + ab * 0.22]}
              geometry={F135_AB_OUTER_GEO}
              material={plain(P.flame, 0.2, 0, {
                emissive: P.amber,
                emissiveIntensity: 2.4 * ab,
                transparent: true,
                opacity: 0.72 * ab,
              })}
            />
            <mesh
              scale={[0.5 + ab * 0.9, 0.8 + ab * 0.2, 0.8 + ab * 0.2]}
              geometry={F135_AB_CORE_GEO}
              material={plain(P.amberHot, 0.1, 0, {
                emissive: P.amberHot,
                emissiveIntensity: 3.2 * ab,
                transparent: true,
                opacity: 0.88 * ab,
              })}
            />
            {[0, 1, 2, 3, 4].map((k) => {
              const dist = -0.42 - k * (0.58 * (0.55 + 0.65 * ab));
              const rad = Math.max(0.08, (0.34 - k * 0.055) * (0.75 + 0.3 * ab));
              return (
                <mesh
                  key={`mach-${k}`}
                  position={[dist, 0, 0]}
                  scale={[1.8, 1, 1]}
                  material={plain('#fff5d6', 0.1, 0, {
                    emissive: P.amberHot,
                    emissiveIntensity: (3.0 - k * 0.4) * ab,
                    transparent: true,
                    opacity: Math.max(0.18, (0.82 - k * 0.14) * ab),
                  })}
                >
                  <octahedronGeometry args={[rad, 1]} />
                </mesh>
              );
            })}
          </group>
        )}
      </group>

      {/* ==================== 5. KHOANG VŨ KHÍ GIẤU TRONG BỤNG (x: -1.82 .. +2.12, bayOpen 0..1) ==================== */}
      {/* Dầm sống bụng trung tâm (Central Keel) ngăn giữa khoang đạn trái và khoang đạn phải */}
      <mesh position={[0.15, 1.36, 0]} geometry={rbox(3.98, 0.56, 0.44, 0.02)} material={skinMat} castShadow receiveShadow />
      <mesh position={[0.15, 1.078, 0]} geometry={rbox(3.96, 0.012, 0.10, 0.002)} material={ramTapeMat} />

      {/* Hốc khoang vũ khí trắng sáng + khung sườn + 2× AIM-120 AMRAAM + 2× Bom 12 ft JDAM */}
      <group>
        {[-1, 1].map((sgn) => (
          <group key={`bay-cavity-${sgn}`}>
            <mesh position={[0.15, 1.62, sgn * 0.72]} geometry={rbox(3.96, 0.04, 1.02, 0.005)} material={bayWhiteMat} />
            <mesh position={[2.11, 1.36, sgn * 0.72]} geometry={rbox(0.05, 0.54, 1.02, 0.005)} material={bayWhiteMat} />
            <mesh position={[-1.81, 1.36, sgn * 0.72]} geometry={rbox(0.05, 0.54, 1.02, 0.005)} material={bayWhiteMat} />
            <mesh position={[0.15, 1.37, sgn * 0.23]} geometry={rbox(3.94, 0.52, 0.03, 0.004)} material={bayWhiteMat} />
            <mesh position={[0.15, 1.37, sgn * 1.21]} geometry={rbox(3.94, 0.52, 0.03, 0.004)} material={bayWhiteMat} />

            {[-1.45, -0.92, -0.38, 0.15, 0.68, 1.22, 1.76].map((xRib) => (
              <React.Fragment key={`rib-${xRib}`}>
                <mesh position={[xRib, 1.59, sgn * 0.72]} geometry={rbox(0.045, 0.06, 0.98, 0.005)} material={bayFrameMat} />
                <mesh position={[xRib, 1.36, sgn * 1.19]} geometry={rbox(0.045, 0.48, 0.05, 0.005)} material={bayFrameMat} />
              </React.Fragment>
            ))}

            {/* Giá phóng tên lửa tay đòn LAU-147 + 1 quả AIM-120 AMRAAM (dài 3.66 m) hạ xuống khi mở cửa */}
            <group position={[0.16, 1.42 - bay * 0.24, sgn * 0.44]}>
              <mesh position={[0.7, 0.14, 0]} rotation={[0, 0, 0.35]} geometry={rbox(0.05, 0.26, 0.04, 0.005)} material={bayFrameMat} />
              <mesh position={[-0.7, 0.14, 0]} rotation={[0, 0, -0.35]} geometry={rbox(0.05, 0.26, 0.04, 0.005)} material={bayFrameMat} />
              <mesh position={[0, 0.09, 0]} geometry={rbox(2.35, 0.05, 0.06, 0.008)} material={darkMetalMat} />
              <Aim120Store />
            </group>

            {/* Giá bom trần BRU-67 + 1 quả bom dẫn đường chính xác cỡ 12 ft GBU-31 JDAM */}
            <group position={[0.14, 1.35 - bay * 0.07, sgn * 0.90]}>
              <mesh position={[0, 0.23, 0]} geometry={rbox(1.65, 0.08, 0.14, 0.01)} material={bayFrameMat} />
              <Jdam12FtStore />
            </group>
          </group>
        ))}

        {bayPipes.map((pg, idx) => (
          <mesh key={`bpipe-${idx}`} geometry={pg} material={chromeMat} />
        ))}
      </group>

      {/* 4 CÁNH CỬA KHOANG VŨ KHÍ BỤNG (khép phẳng lì có khe răng cưa RAM khi bayOpen=0, mở gập xuống 85° khi bayOpen=1) */}
      <group position={[0.15, 1.09, -1.22]} rotation={[doorAng, 0, 0]}>
        <mesh position={[0, 0, 0.25]} geometry={rbox(3.93, 0.028, 0.495, 0.006)} material={skinMat} castShadow receiveShadow />
        <mesh position={[0, 0.018, 0.25]} geometry={rbox(3.86, 0.016, 0.44, 0.004)} material={bayWhiteMat} />
        <mesh position={[0, -0.014, 0.47]} geometry={rbox(3.92, 0.008, 0.055, 0.002)} material={ramTapeMat} />
        <mesh position={[0, -0.014, 0.03]} geometry={rbox(3.92, 0.008, 0.045, 0.002)} material={ramTapeMat} />
      </group>
      <group position={[0.15, 1.09, -0.22]} rotation={[-doorAng, 0, 0]}>
        <mesh position={[0, 0, -0.25]} geometry={rbox(3.93, 0.028, 0.495, 0.006)} material={skinMat} castShadow receiveShadow />
        <mesh position={[0, 0.018, -0.25]} geometry={rbox(3.86, 0.016, 0.44, 0.004)} material={bayWhiteMat} />
        <mesh position={[0, -0.014, -0.47]} geometry={rbox(3.92, 0.008, 0.055, 0.002)} material={ramTapeMat} />
      </group>

      <group position={[0.15, 1.09, 0.22]} rotation={[doorAng, 0, 0]}>
        <mesh position={[0, 0, 0.25]} geometry={rbox(3.93, 0.028, 0.495, 0.006)} material={skinMat} castShadow receiveShadow />
        <mesh position={[0, 0.018, 0.25]} geometry={rbox(3.86, 0.016, 0.44, 0.004)} material={bayWhiteMat} />
        <mesh position={[0, -0.014, 0.47]} geometry={rbox(3.92, 0.008, 0.055, 0.002)} material={ramTapeMat} />
      </group>
      <group position={[0.15, 1.09, 1.22]} rotation={[-doorAng, 0, 0]}>
        <mesh position={[0, 0, -0.25]} geometry={rbox(3.93, 0.028, 0.495, 0.006)} material={skinMat} castShadow receiveShadow />
        <mesh position={[0, 0.018, -0.25]} geometry={rbox(3.86, 0.016, 0.44, 0.004)} material={bayWhiteMat} />
        <mesh position={[0, -0.014, -0.47]} geometry={rbox(3.92, 0.008, 0.055, 0.002)} material={ramTapeMat} />
        <mesh position={[0, -0.014, -0.03]} geometry={rbox(3.92, 0.008, 0.045, 0.002)} material={ramTapeMat} />
      </group>

      <mesh position={[2.13, 1.076, 0]} geometry={rbox(0.08, 0.01, 2.48, 0.002)} material={ramTapeMat} />
      <mesh position={[-1.83, 1.076, 0]} geometry={rbox(0.08, 0.01, 2.48, 0.002)} material={ramTapeMat} />

      {/* ==================== 6. CÀNG ĐÁP 3 ĐIỂM THU/HẠ (gear 0..1, bánh chạm đúng y=0 khi gear=1) ==================== */}
      {/* --- A. CÀNG MŨI (Nose Landing Gear tại x = +4.48 m, r = 0.32 m -> tâm bánh y = 0.32 m -> đáy chạm y = 0.000 m!) --- */}
      <group>
        <group position={[4.52, 1.11, 0.25]} rotation={[g * 1.48, 0, -0.03]}>
          <mesh position={[0, 0, -0.25]} geometry={rbox(1.32, 0.026, 0.50, 0.006)} material={skinMat} castShadow />
          <mesh position={[0, 0.016, -0.25]} geometry={rbox(1.24, 0.014, 0.44, 0.004)} material={bayWhiteMat} />
          <mesh position={[0, -0.013, -0.47]} geometry={rbox(1.30, 0.008, 0.05, 0.002)} material={ramTapeMat} />
        </group>

        {g > 0.02 && (
          <group position={[4.48, 1.22, 0]} rotation={[0, 0, (1 - g) * 1.56]}>
            <mesh position={[0, -0.34, 0]} material={strutWhiteMat} castShadow>
              <cylinderGeometry args={[0.068, 0.062, 0.58, 16]} />
            </mesh>
            <mesh position={[0, -0.68, 0]} material={chromeMat}>
              <cylinderGeometry args={[0.046, 0.046, 0.36, 16]} />
            </mesh>
            <mesh position={[-0.08, -0.58, 0]} rotation={[0, 0, 0.48]} geometry={rbox(0.035, 0.22, 0.08, 0.008)} material={strutWhiteMat} />
            <mesh position={[-0.08, -0.73, 0]} rotation={[0, 0, -0.48]} geometry={rbox(0.035, 0.22, 0.08, 0.008)} material={strutWhiteMat} />
            <mesh position={[0.24, -0.24, 0]} rotation={[0, 0, 0.68]} geometry={rbox(0.04, 0.62, 0.06, 0.008)} material={strutWhiteMat} />
            {[-0.075, 0.075].map((zL) => (
              <mesh
                key={zL}
                position={[0.075, -0.44, zL]}
                rotation={[0, 0, Math.PI / 2]}
                material={plain('#ffffff', 0.1, 0.2, { emissive: '#fff4d8', emissiveIntensity: 0.9 })}
              >
                <cylinderGeometry args={[0.034, 0.038, 0.04, 12]} />
              </mesh>
            ))}
            <mesh position={[0, -0.88, 0.14]} geometry={rbox(0.14, 0.18, 0.04, 0.012)} material={strutWhiteMat} />
            <mesh position={[0, -0.88, -0.14]} geometry={rbox(0.14, 0.18, 0.04, 0.012)} material={strutWhiteMat} />
            <Wheel r={0.32} width={0.21} spin={wheelSpin} tire="#1e2228" rim="#dfe6ef" bolts={8} position={[0, -0.90, 0]} />
          </group>
        )}
      </group>

      {/* --- B. CẶP CÀNG ĐÁP CHÍNH (Main Landing Gear tại x = -1.36 m, z = ±1.74 m, r = 0.45 m -> chạm đúng y = 0.000 m!) --- */}
      {[-1, 1].map((sgn) => (
        <group key={`mlg-${sgn}`}>
          {/* Cửa khoang càng chính ốp sát má nghiêng thân khi gear=0, mở vểnh ra ngoài phía trên lốp khi gear=1 (không vướng cửa khoang đạn!) */}
          <group position={[-1.36, 1.42, sgn * 1.68]} rotation={[sgn * lerp(-0.41, 0.34, g), 0, 0]}>
            <mesh position={[0, -0.18, 0]} geometry={rbox(1.28, 0.36, 0.026, 0.006)} material={skinMat} castShadow />
            <mesh position={[0, -0.18, -sgn * 0.015]} geometry={rbox(1.20, 0.31, 0.012, 0.004)} material={bayWhiteMat} />
            <mesh position={[0, -0.34, sgn * 0.013]} geometry={rbox(1.26, 0.042, 0.008, 0.002)} material={ramTapeMat} />
          </group>

          {g > 0.02 && (
            <group
              position={[-1.36, 1.30, sgn * 1.52]}
              rotation={[-sgn * (1 - g) * 0.55, 0, (1 - g) * 1.48]}
            >
              <mesh
                position={[0, -0.34, sgn * 0.09]}
                rotation={[sgn * 0.24, 0, 0]}
                material={strutWhiteMat}
                castShadow
              >
                <cylinderGeometry args={[0.082, 0.074, 0.64, 16]} />
              </mesh>
              <mesh
                position={[0, -0.66, sgn * 0.17]}
                rotation={[sgn * 0.24, 0, 0]}
                material={chromeMat}
              >
                <cylinderGeometry args={[0.056, 0.056, 0.38, 16]} />
              </mesh>
              <mesh
                position={[0, -0.36, -sgn * 0.06]}
                rotation={[-sgn * 0.58, 0, 0]}
                geometry={rbox(0.05, 0.64, 0.05, 0.008)}
                material={strutWhiteMat}
              />
              <mesh position={[0, -0.85, sgn * 0.16]} rotation={[Math.PI / 2, 0, 0]} material={darkMetalMat}>
                <cylinderGeometry args={[0.20, 0.20, 0.14, 20]} />
              </mesh>
              <Wheel
                r={0.45}
                width={0.28}
                spin={wheelSpin}
                tire="#1e2228"
                rim="#dfe6ef"
                bolts={10}
                position={[0, -0.85, sgn * 0.22]}
              />
            </group>
          )}
        </group>
      ))}

      {/* ==================== 7. TÙY CHỌN VŨ KHÍ TREO NGOÀI CÁNH ("BEAST MODE" MẤT TÀNG HÌNH) ==================== */}
      {externalStores && (
        <group>
          {[-1, 1].map((sgn) => (
            <React.Fragment key={`ext-${sgn}`}>
              <group position={[-0.38, 1.58, sgn * 2.55]}>
                <mesh geometry={WING_PYLON_GEO} material={skinMat} castShadow />
                <group position={[0.05, -0.52, 0]}>
                  <Jdam12FtStore />
                </group>
              </group>
              <group position={[-0.78, 1.61, sgn * 3.85]}>
                <mesh scale={[0.82, 0.78, 0.85]} geometry={WING_PYLON_GEO} material={skinMat} castShadow />
                <mesh position={[0.10, -0.30, 0]} geometry={rbox(2.15, 0.06, 0.08, 0.01)} material={skinMat} />
                <group position={[0.12, -0.42, 0]}>
                  <Aim120Store />
                </group>
              </group>
            </React.Fragment>
          ))}
        </group>
      )}

      {/* ==================== 8. ĐINH TÁN VI MÔ & ĂNG-TEN THỤ ĐỘNG ==================== */}
      <Rivets points={F35_RIVET_PTS} r={0.011} color="#6d7e94" />
    </group>
  );
};

export const MODELS: ModelSet = {
  F35A: { C: F35A, size: 16, center: [0, 2.0, 0] },
};
