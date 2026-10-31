import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets, Wheel } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT } from '../design/palette';

export type B25Props = {
  propSpin?: number;
  propFast?: boolean;
  gear?: number;
  bombBay?: number;
  turretYaw?: number;
  turretPitch?: number;
  lowerTurret?: boolean;
  broomsticks?: boolean;
  brokenNose?: boolean;
  flakDamage?: boolean;
  chained?: boolean;
  navLights?: boolean;
  seed?: number;
};

type V3 = [number, number, number];

// ---------- Helpers nội suy & tạo lưới 3D mượt có UV theo đơn vị mét (1 m = 1 UV) ----------

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth01 = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

const sgnPow = (v: number, exp: number) => Math.sign(v) * Math.pow(Math.abs(v), exp);

/**
 * Tạo BufferGeometry loft qua mảng mặt cắt `rings[i][j] = [x, y, z]`.
 * Yêu cầu thứ tự `i` và `j` sao cho `(rings[i][j+1] - rings[i][j]) x (rings[i+1][j] - rings[i][j])` hướng ra ngoài.
 * UV tính theo mét thật dọc hai hướng để khớp chuẩn `paint({ repeat: 0.38 })`.
 */
function buildLoftGeometry(
  rings: V3[][],
  opts: {
    closedRing?: boolean;
    capStart?: boolean;
    capEnd?: boolean;
    skipQuad?: (i: number, j: number, center: V3) => boolean;
  } = {},
): THREE.BufferGeometry {
  const { closedRing = false, capStart = false, capEnd = false, skipQuad } = opts;
  const M = rings.length;
  const K = rings[0].length;
  const ringCols = closedRing ? K + 1 : K;

  const uGrid: number[][] = Array.from({ length: M }, () => new Array(ringCols).fill(0));
  const vGrid: number[][] = Array.from({ length: M }, () => new Array(ringCols).fill(0));

  for (let i = 0; i < M; i++) {
    let accV = 0;
    for (let j = 0; j < ringCols; j++) {
      if (j > 0) {
        const p0 = rings[i][(j - 1) % K];
        const p1 = rings[i][j % K];
        accV += Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      }
      vGrid[i][j] = accV;
      if (i > 0) {
        const pPrev = rings[i - 1][j % K];
        const pCur = rings[i][j % K];
        uGrid[i][j] = uGrid[i - 1][j] + Math.hypot(pCur[0] - pPrev[0], pCur[1] - pPrev[1], pCur[2] - pPrev[2]);
      }
    }
  }

  const pos: number[] = [];
  const uv: number[] = [];

  const pushTri = (a: V3, b: V3, c: V3, ua: [number, number], ub: [number, number], uc: [number, number]) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  };

  const segCount = closedRing ? K : K - 1;
  for (let i = 0; i < M - 1; i++) {
    for (let j = 0; j < segCount; j++) {
      const j1 = (j + 1) % K;
      const p00 = rings[i][j];
      const p01 = rings[i][j1];
      const p10 = rings[i + 1][j];
      const p11 = rings[i + 1][j1];

      if (skipQuad) {
        const cx = (p00[0] + p01[0] + p10[0] + p11[0]) * 0.25;
        const cy = (p00[1] + p01[1] + p10[1] + p11[1]) * 0.25;
        const cz = (p00[2] + p01[2] + p10[2] + p11[2]) * 0.25;
        if (skipQuad(i, j, [cx, cy, cz])) continue;
      }

      const uv00: [number, number] = [uGrid[i][j], vGrid[i][j]];
      const uv01: [number, number] = [uGrid[i][j + 1], vGrid[i][j + 1]];
      const uv10: [number, number] = [uGrid[i + 1][j], vGrid[i + 1][j]];
      const uv11: [number, number] = [uGrid[i + 1][j + 1], vGrid[i + 1][j + 1]];

      pushTri(p00, p01, p10, uv00, uv01, uv10);
      pushTri(p01, p11, p10, uv01, uv11, uv10);
    }
  }

  const addCap = (ringIdx: number, reverse: boolean) => {
    const ring = rings[ringIdx];
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let j = 0; j < K; j++) {
      cx += ring[j][0];
      cy += ring[j][1];
      cz += ring[j][2];
    }
    const center: V3 = [cx / K, cy / K, cz / K];
    for (let j = 0; j < segCount; j++) {
      const a = ring[j];
      const b = ring[(j + 1) % K];
      if (reverse) {
        pushTri(center, b, a, [0, 0], [b[2] - center[2], b[1] - center[1]], [a[2] - center[2], a[1] - center[1]]);
      } else {
        pushTri(center, a, b, [0, 0], [a[2] - center[2], a[1] - center[1]], [b[2] - center[2], b[1] - center[1]]);
      }
    }
  };

  if (capStart) addCap(0, true);
  if (capEnd) addCap(M - 1, false);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// ---------- Định nghĩa hình học chuẩn 1:1 North American B-25B Mitchell (16.13 m × 20.60 m × 4.98 m) ----------

type FuseSec = { x: number; yBot: number; yTop: number; rz: number; pow: number };

// Mặt cắt thân kim loại từ đuôi x = -7.05 m tới vách mũi bombardier x = +6.52 m
const FUSE_CONTROL: FuseSec[] = [
  { x: -7.05, yBot: 2.66, yTop: 3.20, rz: 0.28, pow: 2.0 },
  { x: -6.30, yBot: 2.46, yTop: 3.23, rz: 0.37, pow: 2.1 },
  { x: -5.30, yBot: 2.18, yTop: 3.27, rz: 0.48, pow: 2.25 },
  { x: -4.20, yBot: 1.87, yTop: 3.31, rz: 0.60, pow: 2.4 },
  { x: -3.00, yBot: 1.56, yTop: 3.36, rz: 0.71, pow: 2.55 },
  { x: -1.85, yBot: 1.35, yTop: 3.39, rz: 0.79, pow: 2.7 },
  { x: -0.90, yBot: 1.29, yTop: 3.41, rz: 0.82, pow: 2.8 },
  { x: 0.05, yBot: 1.28, yTop: 3.43, rz: 0.83, pow: 2.85 },
  { x: 1.45, yBot: 1.28, yTop: 3.44, rz: 0.83, pow: 2.9 },
  { x: 2.85, yBot: 1.28, yTop: 3.44, rz: 0.83, pow: 2.85 },
  { x: 3.35, yBot: 1.29, yTop: 3.45, rz: 0.82, pow: 2.8 },
  { x: 4.10, yBot: 1.31, yTop: 3.52, rz: 0.81, pow: 2.7 },
  { x: 4.72, yBot: 1.34, yTop: 3.55, rz: 0.78, pow: 2.6 },
  { x: 5.35, yBot: 1.38, yTop: 2.96, rz: 0.75, pow: 2.45 },
  { x: 5.95, yBot: 1.46, yTop: 2.90, rz: 0.69, pow: 2.35 },
  { x: 6.52, yBot: 1.56, yTop: 2.84, rz: 0.62, pow: 2.25 },
];

function evalFuseSec(x: number): FuseSec {
  if (x <= FUSE_CONTROL[0].x) return FUSE_CONTROL[0];
  const last = FUSE_CONTROL[FUSE_CONTROL.length - 1];
  if (x >= last.x) return last;
  for (let i = 0; i < FUSE_CONTROL.length - 1; i++) {
    const a = FUSE_CONTROL[i];
    const b = FUSE_CONTROL[i + 1];
    if (x >= a.x && x <= b.x) {
      const raw = (x - a.x) / (b.x - a.x);
      // Giữ bậc kính chắn gió sắc nét ở 4.72..5.35, còn lại mượt
      const t = a.x >= 4.7 && b.x <= 5.36 ? lerp(raw, smooth01(raw), 0.35) : smooth01(raw);
      return {
        x,
        yBot: lerp(a.yBot, b.yBot, t),
        yTop: lerp(a.yTop, b.yTop, t),
        rz: lerp(a.rz, b.rz, t),
        pow: lerp(a.pow, b.pow, t),
      };
    }
  }
  return last;
}

/** Điểm trên chu vi thân theo góc theta (0 = đỉnh +Y, pi/2 = mạn phải +Z, pi = bụng -Y, 3pi/2 = mạn trái -Z) */
function evalFusePoint(x: number, theta: number): V3 {
  const s = evalFuseSec(x);
  const yc = (s.yBot + s.yTop) * 0.5;
  const ry = (s.yTop - s.yBot) * 0.5;
  const exp = 2 / s.pow;
  const y = yc + ry * sgnPow(Math.cos(theta), exp);
  const z = s.rz * sgnPow(Math.sin(theta), exp);
  return [x, y, z];
}

/** Bán bề rộng Z của thân tại (x, y) để dán phù hiệu ngôi sao ôm sát mặt cong không z-fighting */
function evalFuseSurfaceZ(x: number, y: number): number {
  const s = evalFuseSec(x);
  const yc = (s.yBot + s.yTop) * 0.5;
  const ry = Math.max(0.05, (s.yTop - s.yBot) * 0.5);
  const yn = Math.max(-0.98, Math.min(0.98, (y - yc) / ry));
  const cosPow = Math.pow(Math.abs(yn), s.pow);
  const sinAbs = Math.pow(Math.max(0, 1 - cosPow), 1 / s.pow);
  return s.rz * sinAbs;
}

// Góc chia ranh giới sơn Olive Drab / Neutral Gray (~34% chiều cao thân), bệ cửa sổ buồng lái, và cửa khoang bom
const TH_SILL = 0.35 * Math.PI;
const TH_DEMARC = 0.56 * Math.PI;
const TH_BOMB_HINGE = 0.79 * Math.PI;

function sampleArcRing(x: number, th0: number, th1: number, steps: number): V3[] {
  const pts: V3[] = [];
  for (let k = 0; k <= steps; k++) {
    pts.push(evalFusePoint(x, lerp(th0, th1, k / steps)));
  }
  return pts;
}

function denseX(x0: number, x1: number, steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, i) => lerp(x0, x1, i / steps));
}

// ---------- Định nghĩa cánh Hải Âu (Gull-Wing) đặc trưng của B-25B (sải 20.60 m) ----------

type WingSec = { zAbs: number; xLE: number; xTE: number; y: number; thick: number };

const WING_CONTROL: WingSec[] = [
  { zAbs: 0.55, xLE: 3.18, xTE: -0.18, y: 2.45, thick: 0.54 },
  { zAbs: 0.83, xLE: 3.15, xTE: -0.15, y: 2.47, thick: 0.52 }, // Gốc cánh sát thân
  { zAbs: 1.95, xLE: 3.04, xTE: -0.10, y: 2.64, thick: 0.485 }, // Đoạn cánh trong nâng dihedral rõ nét
  { zAbs: 3.05, xLE: 2.92, xTE: -0.04, y: 2.80, thick: 0.45 }, // Đỉnh khuỷu gull-wing tại vỏ động cơ!
  { zAbs: 4.85, xLE: 2.65, xTE: 0.07, y: 2.71, thick: 0.38 }, // Đoạn ngoài cụp nhẹ anhedral ~2.4°
  { zAbs: 6.85, xLE: 2.34, xTE: 0.20, y: 2.60, thick: 0.30 },
  { zAbs: 8.85, xLE: 2.02, xTE: 0.34, y: 2.50, thick: 0.22 },
  { zAbs: 9.75, xLE: 1.86, xTE: 0.42, y: 2.46, thick: 0.175 },
  { zAbs: 10.06, xLE: 1.72, xTE: 0.55, y: 2.448, thick: 0.13 },
  { zAbs: 10.22, xLE: 1.54, xTE: 0.72, y: 2.442, thick: 0.08 },
  { zAbs: 10.30, xLE: 1.32, xTE: 0.94, y: 2.438, thick: 0.032 }, // Đầu mút cánh z = ±10.30 m
];

function evalWingSec(zAbs: number): WingSec {
  const c = Math.max(WING_CONTROL[0].zAbs, Math.min(10.3, zAbs));
  for (let i = 0; i < WING_CONTROL.length - 1; i++) {
    const a = WING_CONTROL[i];
    const b = WING_CONTROL[i + 1];
    if (c >= a.zAbs && c <= b.zAbs) {
      const t = (c - a.zAbs) / (b.zAbs - a.zAbs);
      return {
        zAbs: c,
        xLE: lerp(a.xLE, b.xLE, t),
        xTE: lerp(a.xTE, b.xTE, t),
        y: lerp(a.y, b.y, t),
        thick: lerp(a.thick, b.thick, t),
      };
    }
  }
  return WING_CONTROL[WING_CONTROL.length - 1];
}

/** Biên dạng airfoil NACA cambered: s=0 tại mép trước (LE), s=1 tại mép sau (TE) */
function airfoilHalfThick(s: number): number {
  const cs = clamp01(s);
  return (
    5 *
    (0.2969 * Math.sqrt(cs) - 0.126 * cs - 0.3516 * cs * cs + 0.2843 * cs * cs * cs - 0.1015 * Math.pow(cs, 4))
  );
}

function airfoilCamber(s: number): number {
  const cs = clamp01(s);
  return 0.022 * Math.sin(Math.PI * Math.pow(cs, 0.82));
}

function evalWingSurfaceY(x: number, z: number, face: 'top' | 'bottom'): number {
  const sec = evalWingSec(Math.abs(z));
  const chord = Math.max(0.1, sec.xLE - sec.xTE);
  const s = clamp01((sec.xLE - x) / chord);
  const yt = airfoilHalfThick(s) * sec.thick;
  const yc = airfoilCamber(s) * chord;
  return sec.y + yc + (face === 'top' ? yt : -yt * 0.82);
}

/** Tạo ring mặt trên cánh (LE -> Top -> TE) và mặt dưới cánh (TE -> Bottom -> LE) theo đúng pháp tuyến ngoài khi z tăng */
function buildAirfoilRings(
  zList: number[],
  evalSec: (z: number) => { xLE: number; xTE: number; y: number; thick: number },
  face: 'top' | 'bottom',
  samples = 16,
): V3[][] {
  return zList.map((z) => {
    const sec = evalSec(z);
    const chord = sec.xLE - sec.xTE;
    const ring: V3[] = [];
    for (let k = 0; k <= samples; k++) {
      // Dùng phân bố cosine để mũi airfoil tròn mượt nhiều điểm
      const u = k / samples;
      const s = face === 'top' ? 0.5 * (1 - Math.cos(u * Math.PI)) : 0.5 * (1 + Math.cos(u * Math.PI));
      const x = sec.xLE - s * chord;
      const yt = airfoilHalfThick(s) * sec.thick;
      const yc = airfoilCamber(s) * chord;
      const y = sec.y + yc + (face === 'top' ? yt : -yt * 0.82);
      ring.push([x, y, z]);
    }
    return ring;
  });
}

// ---------- Vỏ Nacelle động cơ Wright R-2600 (tại z = ±3.05 m) ----------

type NacSec = { x: number; yBot: number; yTop: number; rz: number; pow: number };

const NAC_CONTROL: NacSec[] = [
  { x: -1.08, yBot: 2.32, yTop: 2.54, rz: 0.05, pow: 2.0 },
  { x: -0.68, yBot: 1.82, yTop: 2.75, rz: 0.40, pow: 2.1 },
  { x: -0.15, yBot: 1.48, yTop: 2.88, rz: 0.63, pow: 2.25 },
  { x: 0.55, yBot: 1.46, yTop: 3.00, rz: 0.68, pow: 2.3 },
  { x: 1.55, yBot: 1.46, yTop: 3.12, rz: 0.70, pow: 2.25 },
  { x: 2.55, yBot: 1.64, yTop: 3.24, rz: 0.71, pow: 2.1 },
  { x: 3.38, yBot: 1.91, yTop: 3.33, rz: 0.71, pow: 2.0 }, // Nối khít vỏ cowling tròn r = 0.71 m, yc = 2.62 m
];

function evalNacSec(x: number): NacSec {
  if (x <= NAC_CONTROL[0].x) return NAC_CONTROL[0];
  const last = NAC_CONTROL[NAC_CONTROL.length - 1];
  if (x >= last.x) return last;
  for (let i = 0; i < NAC_CONTROL.length - 1; i++) {
    const a = NAC_CONTROL[i];
    const b = NAC_CONTROL[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = smooth01((x - a.x) / (b.x - a.x));
      return {
        x,
        yBot: lerp(a.yBot, b.yBot, t),
        yTop: lerp(a.yTop, b.yTop, t),
        rz: lerp(a.rz, b.rz, t),
        pow: lerp(a.pow, b.pow, t),
      };
    }
  }
  return last;
}

function evalNacPoint(x: number, theta: number, zCenter: number): V3 {
  const s = evalNacSec(x);
  const yc = (s.yBot + s.yTop) * 0.5;
  const ry = (s.yTop - s.yBot) * 0.5;
  const exp = 2 / s.pow;
  return [x, yc + ry * sgnPow(Math.cos(theta), exp), zCenter + s.rz * sgnPow(Math.sin(theta), exp)];
}

// ---------- Tạo phù hiệu Ngôi sao trắng nền tròn xanh USAAF 1942 ôm sát bề mặt cong ----------

function buildConformalRoundel(
  radius: number,
  starPointDir: 'plusX' | 'plusY',
  projectDisc: (u: number, v: number) => V3,
  projectStar: (u: number, v: number) => V3,
  flipWinding = false,
): { disc: THREE.BufferGeometry; star: THREE.BufferGeometry } {
  // Đĩa tròn chia 3 vòng đồng tâm × 48 cung để ôm mượt mặt cong thân/cánh
  const radialSteps = 3;
  const angSteps = 48;
  const discPos: number[] = [];

  const emitTri = (arr: number[], a: V3, b: V3, c: V3) => {
    if (flipWinding) {
      arr.push(a[0], a[1], a[2], c[0], c[1], c[2], b[0], b[1], b[2]);
    } else {
      arr.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    }
  };

  for (let ir = 0; ir < radialSteps; ir++) {
    const r0 = (ir / radialSteps) * radius;
    const r1 = ((ir + 1) / radialSteps) * radius;
    for (let ia = 0; ia < angSteps; ia++) {
      const a0 = (ia / angSteps) * Math.PI * 2;
      const a1 = ((ia + 1) / angSteps) * Math.PI * 2;
      const p00 = projectDisc(Math.cos(a0) * r0, Math.sin(a0) * r0);
      const p10 = projectDisc(Math.cos(a0) * r1, Math.sin(a0) * r1);
      const p11 = projectDisc(Math.cos(a1) * r1, Math.sin(a1) * r1);
      const p01 = projectDisc(Math.cos(a1) * r0, Math.sin(a1) * r0);
      if (ir === 0) {
        emitTri(discPos, p00, p10, p11);
      } else {
        emitTri(discPos, p00, p10, p11);
        emitTri(discPos, p00, p11, p01);
      }
    }
  }

  // Ngôi sao 5 cánh trắng (chia nhỏ mỗi cánh để ôm sát mặt cong)
  const starPos: number[] = [];
  const rOuter = radius * 0.96;
  const rInner = rOuter * 0.382;
  const baseRot = starPointDir === 'plusX' ? 0 : Math.PI / 2;
  const center = projectStar(0, 0);

  for (let k = 0; k < 5; k++) {
    const aTip = baseRot + (k * 2 * Math.PI) / 5;
    const aLeft = aTip + Math.PI / 5;
    const aRight = aTip - Math.PI / 5;

    const tipUV: [number, number] = [Math.cos(aTip) * rOuter, Math.sin(aTip) * rOuter];
    const leftUV: [number, number] = [Math.cos(aLeft) * rInner, Math.sin(aLeft) * rInner];
    const rightUV: [number, number] = [Math.cos(aRight) * rInner, Math.sin(aRight) * rInner];
    const midTipL: [number, number] = [(tipUV[0] + leftUV[0]) * 0.5, (tipUV[1] + leftUV[1]) * 0.5];
    const midTipR: [number, number] = [(tipUV[0] + rightUV[0]) * 0.5, (tipUV[1] + rightUV[1]) * 0.5];
    const midCore: [number, number] = [tipUV[0] * 0.45, tipUV[1] * 0.45];

    const pTip = projectStar(tipUV[0], tipUV[1]);
    const pLeft = projectStar(leftUV[0], leftUV[1]);
    const pRight = projectStar(rightUV[0], rightUV[1]);
    const pMidL = projectStar(midTipL[0], midTipL[1]);
    const pMidR = projectStar(midTipR[0], midTipR[1]);
    const pCore = projectStar(midCore[0], midCore[1]);

    // Nửa phải cánh sao (right -> tip)
    emitTri(starPos, center, pRight, pCore);
    emitTri(starPos, pRight, pMidR, pCore);
    emitTri(starPos, pMidR, pTip, pCore);
    // Nửa trái cánh sao (tip -> left)
    emitTri(starPos, pCore, pTip, pMidL);
    emitTri(starPos, pCore, pMidL, pLeft);
    emitTri(starPos, center, pCore, pLeft);
  }

  const disc = new THREE.BufferGeometry();
  disc.setAttribute('position', new THREE.Float32BufferAttribute(discPos, 3));
  disc.computeVertexNormals();

  const star = new THREE.BufferGeometry();
  star.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  star.computeVertexNormals();

  return { disc, star };
}

// ---------- Khởi tạo & cache toàn bộ Geometry tĩnh cấp module ----------

const STATIC_GEO = (() => {
  // 1. Thân kim loại Olive Drab (phần trên) chia 3 đoạn quanh buồng lái
  const xsAft = denseX(-7.05, 3.35, 26);
  const xsCockpit = denseX(3.35, 5.35, 10);
  const xsFwd = denseX(5.35, 6.52, 6);

  const fuseUpperAft = buildLoftGeometry([
    ...xsAft.map((x) => sampleArcRing(x, -TH_DEMARC, TH_DEMARC, 28)),
  ]);
  const fuseUpperFwd = buildLoftGeometry([
    ...xsFwd.map((x) => sampleArcRing(x, -TH_DEMARC, TH_DEMARC, 28)),
  ]);
  // Thành bên buồng lái sơn Olive Drab (từ đường phân màu lên bệ cửa kính)
  const fuseCockpitSideR = buildLoftGeometry(
    xsCockpit.map((x) => sampleArcRing(x, TH_SILL, TH_DEMARC, 10)),
  );
  const fuseCockpitSideL = buildLoftGeometry(
    xsCockpit.map((x) => sampleArcRing(x, 2 * Math.PI - TH_DEMARC, 2 * Math.PI - TH_SILL, 10)),
  );

  // 2. Bụng thân kim loại Neutral Gray (trừ ô khoang bom x = 0.05..2.85 và ô bánh mũi x = 4.68..5.92)
  const xsBellyAft = denseX(-7.05, 0.05, 18);
  const xsBombBay = denseX(0.05, 2.85, 10);
  const xsBellyMid = denseX(2.85, 4.68, 8);
  const xsNoseBay = denseX(4.68, 5.92, 6);
  const xsBellyNose = denseX(5.92, 6.52, 4);

  const fuseBellyAft = buildLoftGeometry(
    xsBellyAft.map((x) => sampleArcRing(x, TH_DEMARC, 2 * Math.PI - TH_DEMARC, 18)),
  );
  const fuseBellyBombSideR = buildLoftGeometry(
    xsBombBay.map((x) => sampleArcRing(x, TH_DEMARC, TH_BOMB_HINGE, 5)),
  );
  const fuseBellyBombSideL = buildLoftGeometry(
    xsBombBay.map((x) => sampleArcRing(x, 2 * Math.PI - TH_BOMB_HINGE, 2 * Math.PI - TH_DEMARC, 5)),
  );
  const fuseBellyMid = buildLoftGeometry(
    xsBellyMid.map((x) => sampleArcRing(x, TH_DEMARC, 2 * Math.PI - TH_DEMARC, 18)),
  );
  const TH_NOSE_HINGE = 0.87 * Math.PI;
  const fuseBellyNoseSideR = buildLoftGeometry(
    xsNoseBay.map((x) => sampleArcRing(x, TH_DEMARC, TH_NOSE_HINGE, 6)),
  );
  const fuseBellyNoseSideL = buildLoftGeometry(
    xsNoseBay.map((x) => sampleArcRing(x, 2 * Math.PI - TH_NOSE_HINGE, 2 * Math.PI - TH_DEMARC, 6)),
  );
  const fuseBellyNoseFwd = buildLoftGeometry(
    xsBellyNose.map((x) => sampleArcRing(x, TH_DEMARC, 2 * Math.PI - TH_DEMARC, 18)),
  );

  // 2 cánh cửa khoang bom cong (gốc toạ độ đặt đúng tại trục bản lề để xoay mở mượt)
  const hingeSampleR = evalFusePoint(1.45, TH_BOMB_HINGE);
  const bombHingeY = hingeSampleR[1];
  const bombHingeZ = hingeSampleR[2];

  const makeBombDoor = (isStarboard: boolean) => {
    const thA = isStarboard ? TH_BOMB_HINGE : Math.PI;
    const thB = isStarboard ? Math.PI : 2 * Math.PI - TH_BOMB_HINGE;
    const zH = isStarboard ? bombHingeZ : -bombHingeZ;
    const outerRings: V3[][] = xsBombBay.map((x) =>
      sampleArcRing(x, thA, thB, 9).map(([px, py, pz]) => [px, py - bombHingeY, pz - zH]),
    );
    // Mặt lót bên trong cửa dày 0.035 m (đảo thứ tự điểm để pháp tuyến hướng vào trong khoang)
    const innerRings: V3[][] = xsBombBay.map((x) =>
      sampleArcRing(x, thB, thA, 9).map(([px, py, pz]) => [px, py - bombHingeY + 0.035, (pz - zH) * 0.96]),
    );
    return {
      outer: buildLoftGeometry(outerRings),
      inner: buildLoftGeometry(innerRings),
    };
  };
  const bombDoorR = makeBombDoor(true);
  const bombDoorL = makeBombDoor(false);

  // 3. Buồng lái bậc thang kính (Cockpit Greenhouse Canopy)
  const cockpitGlass = buildLoftGeometry(
    xsCockpit.map((x) => sampleArcRing(x, -TH_SILL, TH_SILL, 18)),
  );

  // 4. Mũi kính Plexiglass Bombardier (x = +6.52 m tới chóp +8.20 m, 22 trạm cong mượt)
  const noseSteps = 22;
  const noseRings: V3[][] = [];
  for (let i = 0; i <= noseSteps; i++) {
    const u = i / noseSteps;
    // Phân bố mịn hơn ở chóp mũi
    const s = Math.sin((u * Math.PI) / 2);
    const x = lerp(6.52, 8.20, s);
    const prof = Math.pow(Math.max(0.0008, 1 - s * s), 0.54);
    const yc = lerp(2.20, 2.15, s * s);
    const ry = 0.64 * prof;
    const rz = 0.62 * prof;
    const pow = lerp(2.25, 2.0, s);
    const exp = 2 / pow;
    const ring: V3[] = [];
    const K = 32;
    for (let j = 0; j < K; j++) {
      const th = (j / K) * Math.PI * 2;
      ring.push([x, yc + ry * sgnPow(Math.cos(th), exp), rz * sgnPow(Math.sin(th), exp)]);
    }
    noseRings.push(ring);
  }

  const noseGlassIntact = buildLoftGeometry(noseRings, {
    closedRing: true,
    skipQuad: (_i, _j, c) => c[0] < 7.05 && c[1] < 1.80, // Phần cằm dưới bọc kim loại
  });

  // Biến thể vỡ mũi kính chiếc #16 Bat Out of Hell (lỗ thủng nham nhở Ø ~0.36 m ở chóp trên-trái)
  const holeCenter: V3 = [7.96, 2.38, -0.13];
  const noseGlassBroken = buildLoftGeometry(noseRings, {
    closedRing: true,
    skipQuad: (i, j, c) => {
      if (c[0] < 7.05 && c[1] < 1.80) return true;
      const d = Math.hypot((c[0] - holeCenter[0]) * 1.15, c[1] - holeCenter[1], c[2] - holeCenter[2]);
      const jag = 0.038 * Math.sin(j * 3.7 + i * 2.3);
      return d < 0.185 + jag;
    },
  });

  const noseChinMetal = buildLoftGeometry(noseRings.slice(0, 10), {
    closedRing: true,
    skipQuad: (_i, _j, c) => !(c[0] < 7.08 && c[1] < 1.82),
  });

  // 5. Chóp kính đuôi xạ thủ quan sát (x = -7.93 m tới -7.05 m, 16 trạm mượt)
  const tailSteps = 16;
  const tailRings: V3[][] = [];
  for (let i = 0; i <= tailSteps; i++) {
    const u = i / tailSteps; // u=0 tại chóp đuôi -7.93, u=1 tại -7.05
    const x = lerp(-7.93, -7.05, u);
    const prof = Math.pow(Math.max(0.015, u), 0.62);
    const yc = lerp(2.94, 2.93, u);
    const ry = lerp(0.07, 0.27, prof);
    const rz = lerp(0.07, 0.28, prof);
    const ring: V3[] = [];
    const K = 24;
    for (let j = 0; j < K; j++) {
      const th = (j / K) * Math.PI * 2;
      ring.push([x, yc + ry * Math.cos(th), rz * Math.sin(th)]);
    }
    tailRings.push(ring);
  }
  const tailGlassCone = buildLoftGeometry(tailRings, { closedRing: true, capStart: true });

  // 6. Cánh Hải Âu (Gull-Wing) trái & phải (tách mặt trên Olive Drab & mặt dưới Neutral Gray)
  const zOffsets = [
    0.58, 0.83, 1.35, 1.95, 2.55, 3.05, 3.65, 4.5, 5.65, 6.85, 8.0, 9.0, 9.75, 9.95, 10.12, 10.24, 10.3,
  ];
  const zStarboard = zOffsets; // Tăng dần +0.58 -> +10.30
  const zPort = [...zOffsets].reverse().map((z) => -z); // Tăng dần -10.30 -> -0.58

  const evalWingSigned = (z: number) => evalWingSec(Math.abs(z));
  const wingTopR = buildLoftGeometry(buildAirfoilRings(zStarboard, evalWingSigned, 'top', 18), { capEnd: true });
  const wingBotR = buildLoftGeometry(buildAirfoilRings(zStarboard, evalWingSigned, 'bottom', 18));
  const wingTopL = buildLoftGeometry(buildAirfoilRings(zPort, evalWingSigned, 'top', 18), { capStart: true });
  const wingBotL = buildLoftGeometry(buildAirfoilRings(zPort, evalWingSigned, 'bottom', 18));

  // 7. Vỏ Nacelle động cơ trái & phải (z = ±3.05 m, khoét hốc bánh đáp chính x = 0.35..2.05)
  const xsNac = denseX(-1.08, 3.38, 20);
  const TH_NAC_SPLIT = 0.52 * Math.PI;
  const TH_NAC_BAY = 0.80 * Math.PI;

  const makeNacelle = (zCenter: number) => {
    const upper = buildLoftGeometry(
      xsNac.map((x) => {
        const pts: V3[] = [];
        for (let k = 0; k <= 20; k++) {
          pts.push(evalNacPoint(x, lerp(-TH_NAC_SPLIT, TH_NAC_SPLIT, k / 20), zCenter));
        }
        return pts;
      }),
    );
    const lower = buildLoftGeometry(
      xsNac.map((x) => {
        const pts: V3[] = [];
        for (let k = 0; k <= 16; k++) {
          pts.push(evalNacPoint(x, lerp(TH_NAC_SPLIT, 2 * Math.PI - TH_NAC_SPLIT, k / 16), zCenter));
        }
        return pts;
      }),
      {
        skipQuad: (_i, _j, c) => c[0] > 0.32 && c[0] < 2.08 && Math.abs(c[2] - zCenter) < 0.45 && c[1] < 1.65,
      },
    );
    // Cặp cửa càng chính dưới bụng nacelle
    const xsDoor = denseX(0.34, 2.06, 6);
    const hOut = evalNacPoint(1.2, TH_NAC_BAY, zCenter);
    const hIn = evalNacPoint(1.2, 2 * Math.PI - TH_NAC_BAY, zCenter);
    const doorOut = buildLoftGeometry(
      xsDoor.map((x) => {
        const pts: V3[] = [];
        for (let k = 0; k <= 6; k++) {
          const [px, py, pz] = evalNacPoint(x, lerp(TH_NAC_BAY, Math.PI, k / 6), zCenter);
          pts.push([px, py - hOut[1], pz - hOut[2]]);
        }
        return pts;
      }),
    );
    const doorIn = buildLoftGeometry(
      xsDoor.map((x) => {
        const pts: V3[] = [];
        for (let k = 0; k <= 6; k++) {
          const [px, py, pz] = evalNacPoint(x, lerp(Math.PI, 2 * Math.PI - TH_NAC_BAY, k / 6), zCenter);
          pts.push([px, py - hIn[1], pz - hIn[2]]);
        }
        return pts;
      }),
    );
    return { upper, lower, doorOut, doorIn, hOut, hIn };
  };

  const nacR = makeNacelle(3.05);
  const nacL = makeNacelle(-3.05);

  // 8. Vỏ Cowling tròn tiện Lathe 2 tông màu Olive Drab / Neutral Gray (≥ 20 điểm mượt) cho động cơ Wright R-2600 Cyclone
  const cowlingProfile: P2[] = [
    [0.45, 4.64],
    [0.49, 4.645],
    [0.55, 4.63],
    [0.61, 4.59],
    [0.655, 4.53],
    [0.685, 4.45],
    [0.703, 4.35],
    [0.714, 4.22],
    [0.720, 4.06],
    [0.722, 3.90],
    [0.720, 3.74],
    [0.716, 3.58],
    [0.712, 3.44],
    [0.736, 3.35], // Mép loe khe tản nhiệt cowl flaps
    [0.705, 3.35],
    [0.680, 3.48],
    [0.660, 4.25],
    [0.540, 4.55],
    [0.450, 4.64],
  ];
  const makeCowlingArc = (phiStart: number, phiLen: number, seg: number) => {
    const g = new THREE.LatheGeometry(
      cowlingProfile.map(([r, ax]) => new THREE.Vector2(Math.max(r, 0.0001), ax)),
      seg,
      phiStart,
      phiLen,
    );
    g.rotateZ(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  };
  const cowlingUpperGeo = makeCowlingArc(0.98 * Math.PI, 1.04 * Math.PI, 24);
  const cowlingLowerGeo = makeCowlingArc(0.02 * Math.PI, 0.96 * Math.PI, 20);

  // Chóp Spinner trục cánh quạt
  const spinnerGeo = lathe(
    [
      [0.19, 4.68],
      [0.185, 4.78],
      [0.16, 4.90],
      [0.115, 5.01],
      [0.055, 5.09],
      [0.005, 5.13],
    ],
    28,
  );

  // Lá cánh quạt Hamilton Standard (gốc dọc +Y từ r = 0.16..1.71 đen, chóp 1.71..1.92 vàng)
  const bladeMainPts: P2[] = [
    [-0.055, 0.16],
    [-0.105, 0.45],
    [-0.135, 0.85],
    [-0.130, 1.28],
    [-0.108, 1.71],
    [0.102, 1.71],
    [0.122, 1.28],
    [0.118, 0.85],
    [0.088, 0.45],
    [0.052, 0.16],
  ];
  const bladeTipPts: P2[] = [
    [-0.108, 1.71],
    [-0.086, 1.84],
    [-0.045, 1.905],
    [0.0, 1.925],
    [0.045, 1.905],
    [0.082, 1.84],
    [0.102, 1.71],
  ];
  const propBladeBodyGeo = extrude(bladeMainPts, 0.032, 0.008);
  const propBladeTipGeo = extrude(bladeTipPts, 0.028, 0.006);

  // 9. Đuôi kép chữ H (Twin H-Tail): cánh ngang sải 6.80 m (z = -3.40..+3.40) + 2 cánh đứng bầu dục cao y = 4.98 m
  const zTailList = denseX(-3.4, 3.4, 20);
  const evalStabSec = (z: number) => {
    const az = Math.abs(z);
    const t = az / 3.4;
    return {
      xLE: lerp(-4.58, -4.86, t),
      xTE: -5.96, // Khe bản lề bánh lái độ cao tách nét ở x = -5.96 m!
      y: lerp(3.13, 3.23, t),
      thick: lerp(0.23, 0.165, t),
    };
  };
  const evalElevSec = (z: number) => {
    const az = Math.abs(z);
    const t = az / 3.4;
    return {
      xLE: -5.98,
      xTE: lerp(-6.78, -6.68, t),
      y: lerp(3.13, 3.23, t),
      thick: lerp(0.15, 0.11, t),
    };
  };

  const hStabTop = buildLoftGeometry(buildAirfoilRings(zTailList, evalStabSec, 'top', 14));
  const hStabBot = buildLoftGeometry(buildAirfoilRings(zTailList, evalStabSec, 'bottom', 14));
  const hElevTop = buildLoftGeometry(buildAirfoilRings(zTailList, evalElevSec, 'top', 10));
  const hElevBot = buildLoftGeometry(buildAirfoilRings(zTailList, evalElevSec, 'bottom', 10));

  // Cánh đứng bầu dục thon chuẩn B-25B Mitchell (Vertical Fin & Rudder tách nét, y = 2.12 m -> đỉnh cao nhất y = 4.98 m!)
  const yFinSteps = 28;
  const finFrontRings: V3[][] = [];
  const finRudderRings: V3[][] = [];

  for (let i = 0; i <= yFinSteps; i++) {
    const u = i / yFinSteps;
    const s = 0.5 * (1 - Math.cos(u * Math.PI));
    const y = lerp(2.12, 4.98, s);
    // Biên dạng đuôi B-25B: mép trước vát xuôi về sau, đỉnh tròn mượt tại 4.98 m, mép sau bánh lái thẳng đứng sắc nét
    const env = Math.pow(Math.max(0.002, Math.sin(s * Math.PI)), 0.48);
    // Mép trước quét nghiêng về sau khi lên cao; mép sau bánh lái giữ gần thẳng ở x ≈ -6.68 m
    const xLEProfile = lerp(-5.05, -5.62, Math.pow(s, 1.15)) + 0.16 * Math.sin(s * Math.PI);
    const xTEProfile = -6.70 + 0.14 * Math.pow(Math.abs(s - 0.46) * 2, 2.2);
    const midX = (xLEProfile + xTEProfile) * 0.5;
    const xLE = lerp(midX + 0.05, xLEProfile, env);
    const xTE = lerp(midX - 0.05, xTEProfile, env);

    // Đường bản lề bánh lái hướng (có sừng cân bằng khí động nhô về trước ở y > 4.46 m)
    const hornOffset = y > 4.46 ? smooth01((y - 4.46) / 0.34) * 0.28 : 0;
    const xHinge = Math.max(xTE + 0.07, Math.min(xLE - 0.07, -5.94 + hornOffset));
    const maxThick = 0.16 * env + 0.012;

    const makeSymAirfoil = (xA: number, xB: number, fullLE: number, fullTE: number, K = 22): V3[] => {
      const fullChord = Math.max(0.08, fullLE - fullTE);
      const pts: V3[] = [];
      // Khi loft theo trục +Y (từ đáy 2.12 lên đỉnh 4.98), vòng điểm đi LE -> -Z -> TE -> +Z -> LE để pháp tuyến dJ × dI hướng ra ngoài!
      for (let k = 0; k < K; k++) {
        const ang = (k / K) * Math.PI * 2;
        const frac = 0.5 * (1 - Math.cos(ang)); // 0..1..0
        const x = lerp(xA, xB, frac);
        const sGlobal = clamp01((fullLE - x) / fullChord);
        const hz = airfoilHalfThick(sGlobal) * maxThick * (ang <= Math.PI ? -1 : 1);
        pts.push([x, y, hz]);
      }
      return pts;
    };

    finFrontRings.push(makeSymAirfoil(xLE, xHinge + 0.010, xLE, xTE, 22));
    finRudderRings.push(makeSymAirfoil(xHinge - 0.010, xTE, xLE, xTE, 20));
  }

  const vFinGeo = buildLoftGeometry(finFrontRings, { closedRing: true, capStart: true, capEnd: true });
  const vRudderGeo = buildLoftGeometry(finRudderRings, { closedRing: true, capStart: true, capEnd: true });

  // 10. Vòm kính tháp pháo lưng Bendix (lathe quanh trục đứng +Y)
  const bendixDomePts: P2[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * (Math.PI * 0.5);
    const r = Math.cos(a) * 0.49;
    const h = Math.sin(a) * 0.47;
    bendixDomePts.push([Math.max(0.002, r), h]);
  }
  const bendixDomeGeo = lathe(bendixDomePts, 32).clone();
  bendixDomeGeo.rotateZ(Math.PI / 2); // Chuyển trục tiện từ +X sang +Y

  // 11. Quả bom phá 500-lb AN-M64 trong khoang bom
  const bombBodyGeo = lathe(
    [
      [0.01, -0.58],
      [0.07, -0.46],
      [0.13, -0.28],
      [0.172, -0.06],
      [0.178, 0.16],
      [0.172, 0.34],
      [0.135, 0.48],
      [0.075, 0.57],
      [0.02, 0.62],
    ],
    24,
  );
  const bombBandGeo = lathe(
    [
      [0.156, 0.38],
      [0.140, 0.46],
    ],
    24,
  );

  // 12. 4 Phù hiệu Ngôi sao trắng nền tròn xanh USAAF 1942 ôm khít mặt cánh & thân sau
  // Mặt trên cánh trái (Port: z < 0)
  const roundelWingPort = buildConformalRoundel(
    0.72,
    'plusX',
    (dx, dz) => {
      const x = 1.28 + dx;
      const z = -6.85 + dz;
      return [x, evalWingSurfaceY(x, z, 'top') + 0.011, z];
    },
    (dx, dz) => {
      const x = 1.28 + dx;
      const z = -6.85 + dz;
      return [x, evalWingSurfaceY(x, z, 'top') + 0.017, z];
    },
    true,
  );

  // Mặt dưới cánh phải (Starboard: z > 0)
  const roundelWingStbd = buildConformalRoundel(
    0.72,
    'plusX',
    (dx, dz) => {
      const x = 1.28 + dx;
      const z = 6.85 + dz;
      return [x, evalWingSurfaceY(x, z, 'bottom') - 0.011, z];
    },
    (dx, dz) => {
      const x = 1.28 + dx;
      const z = 6.85 + dz;
      return [x, evalWingSurfaceY(x, z, 'bottom') - 0.017, z];
    },
    false,
  );

  // Thân sau mạn phải (+Z)
  const roundelFuseStbd = buildConformalRoundel(
    0.50,
    'plusY',
    (dx, dy) => {
      const x = -2.85 + dx;
      const y = 2.52 + dy;
      return [x, y, evalFuseSurfaceZ(x, y) + 0.011];
    },
    (dx, dy) => {
      const x = -2.85 + dx;
      const y = 2.52 + dy;
      return [x, y, evalFuseSurfaceZ(x, y) + 0.017];
    },
    false,
  );

  // Thân sau mạn trái (-Z)
  const roundelFusePort = buildConformalRoundel(
    0.50,
    'plusY',
    (dx, dy) => {
      const x = -2.85 + dx;
      const y = 2.52 + dy;
      return [x, y, -(evalFuseSurfaceZ(x, y) + 0.011)];
    },
    (dx, dy) => {
      const x = -2.85 + dx;
      const y = 2.52 + dy;
      return [x, y, -(evalFuseSurfaceZ(x, y) + 0.017)];
    },
    true,
  );

  // 13. Khung nan kính mũi, khung buồng lái & dây ăng-ten radio (pipe)
  const canopyFramePipes: THREE.BufferGeometry[] = [];
  // Nan dọc & nan vòng buồng lái
  for (const th of [-TH_SILL, -0.17 * Math.PI, 0, 0.17 * Math.PI, TH_SILL]) {
    canopyFramePipes.push(pipe(xsCockpit.map((x) => evalFusePoint(x, th)), 0.022, 20));
  }
  for (const xRib of [3.36, 4.04, 4.72, 5.34]) {
    canopyFramePipes.push(pipe(sampleArcRing(xRib, -TH_SILL, TH_SILL, 16), 0.022, 20));
  }

  // Nan lồng kính mũi Bombardier (thanh mảnh tinh xảo)
  const noseFramePipes: THREE.BufferGeometry[] = [];
  for (const idx of [0, 7, 13, 18]) {
    const ring = noseRings[idx];
    noseFramePipes.push(pipe([...ring, ring[0]], idx === 0 ? 0.017 : 0.011, 28));
  }
  for (const j of [0, 4, 8, 12, 20, 24, 28]) {
    const linePts: V3[] = [];
    for (let i = 0; i <= 19; i++) linePts.push(noseRings[i][j]);
    noseFramePipes.push(pipe(linePts, 0.010, 18));
  }

  // Nan kính chóp đuôi
  const tailFramePipes: THREE.BufferGeometry[] = [
    pipe([...tailRings[15], tailRings[15][0]], 0.015, 20),
    pipe([...tailRings[7], tailRings[7][0]], 0.012, 20),
    pipe([tailRings[1][0], tailRings[8][0], tailRings[15][0]], 0.011, 10),
    pipe([tailRings[1][6], tailRings[8][6], tailRings[15][6]], 0.011, 10),
    pipe([tailRings[1][18], tailRings[8][18], tailRings[15][18]], 0.011, 10),
  ];

  // Dây ăng-ten chữ V mảnh nối từ cột radio lưng buồng lái tới đỉnh 2 cánh đuôi đứng
  const antennaWireR = pipe(
    [
      [3.12, 4.02, 0],
      [-1.2, 4.42, 1.68],
      [-5.56, 4.84, 3.36],
    ],
    0.0065,
    16,
  );
  const antennaWireL = pipe(
    [
      [3.12, 4.02, 0],
      [-1.2, 4.42, -1.68],
      [-5.56, 4.84, -3.36],
    ],
    0.0065,
    16,
  );

  // Đinh tán dọc lưng thân & cổ động cơ
  const rivetPts: V3[] = [];
  for (let x = -6.4; x <= 3.2; x += 0.45) {
    const pTop = evalFusePoint(x, 0.14 * Math.PI);
    rivetPts.push([pTop[0], pTop[1] + 0.004, pTop[2]]);
    rivetPts.push([pTop[0], pTop[1] + 0.004, -pTop[2]]);
  }

  return {
    fuseUpperAft,
    fuseUpperFwd,
    fuseCockpitSideR,
    fuseCockpitSideL,
    fuseBellyAft,
    fuseBellyBombSideR,
    fuseBellyBombSideL,
    fuseBellyMid,
    fuseBellyNoseSideR,
    fuseBellyNoseSideL,
    fuseBellyNoseFwd,
    bombHingeY,
    bombHingeZ,
    bombDoorR,
    bombDoorL,
    cockpitGlass,
    noseGlassIntact,
    noseGlassBroken,
    noseChinMetal,
    holeCenter,
    tailGlassCone,
    wingTopR,
    wingBotR,
    wingTopL,
    wingBotL,
    nacR,
    nacL,
    cowlingUpperGeo,
    cowlingLowerGeo,
    spinnerGeo,
    propBladeBodyGeo,
    propBladeTipGeo,
    hStabTop,
    hStabBot,
    hElevTop,
    hElevBot,
    vFinGeo,
    vRudderGeo,
    bendixDomeGeo,
    bombBodyGeo,
    bombBandGeo,
    roundelWingPort,
    roundelWingStbd,
    roundelFuseStbd,
    roundelFusePort,
    canopyFramePipes,
    noseFramePipes,
    tailFramePipes,
    antennaWireR,
    antennaWireL,
    rivetPts,
  };
})();

// ---------- Cụm phụ trợ Động cơ Radial Wright R-2600 + Cánh quạt 3 lá ----------

const RadialEngineUnit: React.FC<{
  side: 1 | -1;
  propSpin: number;
  propFast: boolean;
  oliveCowlingMat: THREE.Material;
  oliveLoftMat: THREE.Material;
  bellyLoftMat: THREE.Material;
}> = ({ side, propSpin, propFast, oliveCowlingMat, oliveLoftMat, bellyLoftMat }) => {
  const zC = side * 3.05;
  const nac = side === 1 ? STATIC_GEO.nacR : STATIC_GEO.nacL;

  const darkEngineMat = plain('#232629', 0.65, 0.55);
  const cylFinMat = plain('#3c4146', 0.5, 0.65);
  const exhaustMat = plain('#4b362b', 0.72, 0.45);
  const spinnerMat = plain('#3d462b', 0.42, 0.45);
  const propBlackMat = plain(PAINT.propBlack, 0.52, 0.25);
  const propYellowMat = plain(PAINT.propTipYellow, 0.45, 0.15);
  const sootMat = plain('#1c1c1b', 0.92, 0.05, { transparent: true, opacity: 0.42 });

  const propDiscMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PAINT.propBlack,
        roughness: 0.5,
        transparent: true,
        opacity: 0.17,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  const propTipRingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PAINT.propTipYellow,
        roughness: 0.45,
        transparent: true,
        opacity: 0.11,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  return (
    <group>
      {/* Thân sau Nacelle động cơ */}
      <mesh geometry={nac.upper} material={oliveLoftMat} castShadow receiveShadow />
      <mesh geometry={nac.lower} material={bellyLoftMat} castShadow receiveShadow />

      {/* Hốc tối bên trong khoang bánh đáp chính */}
      <mesh position={[1.2, 1.92, zC]} material={plain('#2b3322', 0.85, 0.2)}>
        <boxGeometry args={[1.76, 0.72, 0.92]} />
      </mesh>

      {/* Vệt khói muội ống xả dọc sườn nacelle */}
      <mesh position={[2.25, 2.58, zC + side * 0.708]} rotation={[0, side * 0.03, 0]} material={sootMat}>
        <boxGeometry args={[2.0, 0.26, 0.012]} />
      </mesh>

      {/* Cụm đầu động cơ Wright R-2600 đặt tại y = 2.62, z = ±3.05 */}
      <group position={[0, 2.62, zC]}>
        {/* Vỏ Cowling tiện tròn 2 tông màu Olive Drab trên / Neutral Gray dưới */}
        <mesh geometry={STATIC_GEO.cowlingUpperGeo} material={oliveCowlingMat} castShadow receiveShadow />
        <mesh geometry={STATIC_GEO.cowlingLowerGeo} material={bellyLoftMat} castShadow receiveShadow />

        {/* Hốc hút gió bộ chế hoà khí (Carburetor Ram-Air Scoop) đặc trưng trên đỉnh cowling */}
        <mesh position={[3.98, 0.74, 0]} geometry={rbox(1.06, 0.19, 0.26, 0.05)} material={oliveCowlingMat} castShadow />
        <mesh position={[4.51, 0.73, 0]} material={plain('#16181a', 0.9, 0.2)}>
          <boxGeometry args={[0.04, 0.12, 0.19]} />
        </mesh>

        {/* 16 lá khe tản nhiệt (Cowl Cooling Gills) xòe quanh đuôi cowling */}
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <group key={`gill-${i}`} position={[3.36, Math.cos(a) * 0.725, Math.sin(a) * 0.725]} rotation={[-a, 0, 0]}>
              <mesh rotation={[0, 0, -0.14]} material={i >= 5 && i <= 11 ? bellyLoftMat : oliveCowlingMat}>
                <boxGeometry args={[0.16, 0.018, 0.22]} />
              </mesh>
            </group>
          );
        })}

        {/* Vòng 14 ống xả ngắn (Individual Stub Exhaust Stacks) quanh chu vi cowling */}
        {Array.from({ length: 14 }, (_, i) => {
          const a = ((i + 0.5) / 14) * Math.PI * 2;
          return (
            <group key={`exh-${i}`} position={[3.56, Math.cos(a) * 0.715, Math.sin(a) * 0.715]} rotation={[-a, 0, 0]}>
              <mesh rotation={[0, 0, -1.15]} material={exhaustMat} castShadow>
                <cylinderGeometry args={[0.034, 0.038, 0.16, 10]} />
              </mesh>
            </group>
          );
        })}

        {/* Lõi máy Radial 14 xi-lanh 2 hàng (Wright R-2600 Twin Cyclone) bên trong miệng cowling */}
        <mesh position={[4.18, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkEngineMat}>
          <cylinderGeometry args={[0.25, 0.28, 0.62, 20]} />
        </mesh>
        <mesh position={[4.48, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={plain('#545b61', 0.45, 0.65)}>
          <sphereGeometry args={[0.23, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => {
          const row = i % 2;
          const a = (i / 14) * Math.PI * 2;
          const xRow = row === 0 ? 4.32 : 4.12;
          return (
            <group key={`cyl-${i}`} position={[xRow, 0, 0]} rotation={[a, 0, 0]}>
              <mesh position={[0, 0.38, 0]} material={cylFinMat}>
                <cylinderGeometry args={[0.088, 0.078, 0.28, 12]} />
              </mesh>
              <mesh position={[0.06, 0.34, 0.03]} rotation={[0, 0, -0.18]} material={plain('#aeb6bd', 0.3, 0.8)}>
                <cylinderGeometry args={[0.011, 0.011, 0.28, 6]} />
              </mesh>
            </group>
          );
        })}

        {/* Cụm chóp Spinner & Cánh quạt 3 lá quay theo propSpin */}
        <group rotation={[propSpin * side, 0, 0]}>
          <mesh geometry={STATIC_GEO.spinnerGeo} material={spinnerMat} castShadow />
          <mesh position={[4.76, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#747c82', 0.35, 0.75)}>
            <cylinderGeometry args={[0.14, 0.14, 0.18, 18]} />
          </mesh>

          {Array.from({ length: 3 }, (_, b) => {
            const ang = (b * 2 * Math.PI) / 3;
            return (
              <group key={`blade-${b}`} position={[4.83, 0, 0]} rotation={[ang, 0, 0]}>
                <group rotation={[0, 0.38 * side, 0]}>
                  {!propFast && (
                    <>
                      <mesh geometry={STATIC_GEO.propBladeBodyGeo} material={propBlackMat} castShadow />
                      <mesh geometry={STATIC_GEO.propBladeTipGeo} material={propYellowMat} castShadow />
                    </>
                  )}
                  {propFast && (
                    <mesh geometry={STATIC_GEO.propBladeBodyGeo} material={propDiscMat} scale={[0.55, 1, 0.6]} />
                  )}
                </group>
              </group>
            );
          })}
        </group>

        {/* Đĩa mờ tốc độ cao + vành vàng đầu cánh mảnh tinh tế khi propFast = true */}
        {propFast && (
          <group position={[4.83, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={propDiscMat}>
              <ringGeometry args={[0.2, 1.835, 48]} />
            </mesh>
            <mesh material={propTipRingMat}>
              <ringGeometry args={[1.835, 1.925, 48]} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};

// ---------- Component chính: North American B-25B Mitchell ----------

export const B25Mitchell: React.FC<B25Props> = ({
  propSpin = 0,
  propFast = false,
  gear = 1,
  bombBay = 0,
  turretYaw = 0,
  turretPitch = 0.1,
  lowerTurret = false,
  broomsticks = true,
  brokenNose = false,
  flakDamage = false,
  chained = false,
  navLights = false,
  seed = 18,
}) => {
  const gVal = clamp01(gear);
  const bVal = clamp01(bombBay);

  // Vật liệu sơn chuẩn USAAF 1942 (repeat: 0.38 cho lưới mét thật, repeat: 1.25 cho cowling lathe 0..1)
  const oliveMat = useMemo(
    () =>
      paint({
        color: PAINT.usaafOlive,
        camo: [...PAINT.usaafOliveCamo],
        repeat: 0.38,
        wear: 0.24,
        dirt: 0.22,
        roughness: 0.63,
        metalness: 0.32,
        seed,
      }),
    [seed],
  );

  const oliveCowlingMat = useMemo(
    () =>
      paint({
        color: PAINT.usaafOlive,
        camo: [...PAINT.usaafOliveCamo],
        repeat: 1.25,
        wear: 0.26,
        dirt: 0.24,
        roughness: 0.6,
        metalness: 0.35,
        seed: seed + 3,
      }),
    [seed],
  );

  const oliveCtrlMat = useMemo(
    () =>
      paint({
        color: '#4c5735',
        camo: ['#434d2e', '#5b6740'],
        repeat: 0.38,
        wear: 0.18,
        dirt: 0.2,
        roughness: 0.68,
        metalness: 0.26,
        seed: seed + 7,
      }),
    [seed],
  );

  const bellyMat = useMemo(
    () =>
      paint({
        color: PAINT.usaafBelly,
        camo: ['#82898e', '#979ea3'],
        repeat: 0.38,
        wear: 0.18,
        dirt: 0.24,
        roughness: 0.64,
        metalness: 0.28,
        seed: seed + 11,
      }),
    [seed],
  );

  const glassMat = useMemo(
    () =>
      plain(PAINT.cockpitGlass, 0.15, 0.2, {
        transparent: true,
        opacity: 0.58,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const insigniaBlueMat = useMemo(
    () =>
      plain('#1b355e', 0.52, 0.18, {
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [],
  );

  const insigniaWhiteMat = useMemo(
    () =>
      plain('#eef2f5', 0.48, 0.12, {
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );

  const chromateGreenMat = plain('#5d703d', 0.72, 0.25);
  const frameOliveMat = plain('#454f30', 0.62, 0.32);
  const gunMetalMat = plain('#23272b', 0.42, 0.72);
  const chromeOleoMat = plain('#dce2e6', 0.18, 0.88);
  const strutGreyMat = plain('#7d858a', 0.5, 0.45);
  const broomWoodMat = plain('#18191b', 0.94, 0.04); // Cán chổi gỗ sơn đen mờ giả nòng .50 cal

  // Góc mở cửa khoang bom & góc gập bộ càng 3 bánh
  const bombDoorAngle = bVal * (Math.PI * 0.51);
  const mainRetractRot = -(1 - gVal) * 1.64; // Gập về sau vào bụng nacelle
  const noseRetractRot = -(1 - gVal) * 1.67; // Gập về sau vào hốc mũi
  const gearDoorOpen = smooth01(gVal * 1.35) * (Math.PI * 0.48);

  return (
    <group>
      {/* ==================== 1. THÂN CHÍNH & NỘI THẤT BUỒNG LÁI / MŨI KÍNH ==================== */}
      <mesh geometry={STATIC_GEO.fuseUpperAft} material={oliveMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseUpperFwd} material={oliveMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseCockpitSideR} material={oliveMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseCockpitSideL} material={oliveMat} castShadow receiveShadow />

      {/* Mảng sơn đen mờ chống chói trước kính buồng lái */}
      <mesh position={[5.92, 2.91, 0]} rotation={[0, 0, -0.09]} material={plain('#2b2f25', 0.88, 0.12)}>
        <boxGeometry args={[1.1, 0.04, 0.74]} />
      </mesh>

      {/* Bụng thân Neutral Gray */}
      <mesh geometry={STATIC_GEO.fuseBellyAft} material={bellyMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseBellyBombSideR} material={bellyMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseBellyBombSideL} material={bellyMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseBellyMid} material={bellyMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseBellyNoseSideR} material={bellyMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseBellyNoseSideL} material={bellyMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.fuseBellyNoseFwd} material={bellyMat} castShadow receiveShadow />

      {/* Cửa sổ quan sát hông thân sau (Waist Windows) */}
      {([-1, 1] as const).map((s) => (
        <group key={`waist-win-${s}`} position={[-2.05, 2.66, s * 0.755]} rotation={[0, s * 0.055, 0]}>
          <mesh material={frameOliveMat}>
            <boxGeometry args={[0.48, 0.30, 0.03]} />
          </mesh>
          <mesh position={[0, 0, s * 0.008]} material={glassMat}>
            <boxGeometry args={[0.40, 0.22, 0.025]} />
          </mesh>
        </group>
      ))}

      {/* Cựa chống quệt đuôi khi cất cánh trên tàu sân bay (Tail Bumper Skid) */}
      <mesh position={[-5.35, 2.16, 0]} rotation={[0, 0, 0.36]} material={strutGreyMat}>
        <boxGeometry args={[0.32, 0.06, 0.06]} />
      </mesh>

      {/* Đinh tán thân */}
      <Rivets points={STATIC_GEO.rivetPts} r={0.014} color="#4c5636" />

      {/* --- Nội thất Buồng lái Phi công (nhìn xuyên qua kính bậc thang) --- */}
      <group>
        {/* Sàn & vách sau buồng lái */}
        <mesh position={[4.35, 2.28, 0]} material={chromateGreenMat}>
          <boxGeometry args={[1.95, 0.06, 1.38]} />
        </mesh>
        <mesh position={[3.37, 2.88, 0]} material={chromateGreenMat}>
          <boxGeometry args={[0.06, 1.15, 1.38]} />
        </mesh>
        {/* Bảng đồng hồ & mũ che chống lóa */}
        <mesh position={[5.02, 2.74, 0]} material={plain('#1e2224', 0.75, 0.3)}>
          <boxGeometry args={[0.24, 0.42, 1.22]} />
        </mesh>
        {/* Bệ cần ga trung tâm (2 tay ga đỏ cho 2 máy Wright) */}
        <mesh position={[4.66, 2.52, 0]} material={plain('#2d3328', 0.7, 0.35)}>
          <boxGeometry args={[0.42, 0.42, 0.18]} />
        </mesh>
        {([-0.035, 0.035] as const).map((zo, idx) => (
          <mesh key={`thr-${idx}`} position={[4.68, 2.78, zo]} rotation={[0, 0, -0.3]} material={plain('#b83228', 0.5, 0.2)}>
            <cylinderGeometry args={[0.014, 0.01, 0.14, 8]} />
          </mesh>
        ))}
        {/* 2 ghế bọc giáp lưng cao của Doolittle & Cole + 2 vô lăng chữ U */}
        {([-0.34, 0.34] as const).map((zp, idx) => (
          <group key={`seat-${idx}`} position={[4.28, 2.34, zp]}>
            <mesh position={[0, 0.2, 0]} material={chromateGreenMat}>
              <boxGeometry args={[0.38, 0.08, 0.4]} />
            </mesh>
            <mesh position={[-0.17, 0.54, 0]} rotation={[0, 0, 0.1]} material={chromateGreenMat}>
              <boxGeometry args={[0.06, 0.66, 0.42]} />
            </mesh>
            <mesh position={[0.38, 0.32, 0]} rotation={[0, 0, -0.14]} material={gunMetalMat}>
              <cylinderGeometry args={[0.02, 0.022, 0.55, 10]} />
            </mesh>
            <mesh position={[0.44, 0.58, 0]} rotation={[0, Math.PI / 2, 0]} material={plain('#1b1d1f', 0.5, 0.4)}>
              <torusGeometry args={[0.11, 0.016, 8, 16, Math.PI * 1.15]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Kính Buồng lái bậc thang & khung kim loại */}
      <mesh geometry={STATIC_GEO.cockpitGlass} material={glassMat} />
      {STATIC_GEO.canopyFramePipes.map((g, idx) => (
        <mesh key={`cframe-${idx}`} geometry={g} material={frameOliveMat} castShadow />
      ))}

      {/* --- Mũi kính Plexiglass Bombardier + Thước ngắm nhôm 20 xu Mark Twain + Súng mũi .30 cal --- */}
      <group>
        <mesh geometry={STATIC_GEO.noseChinMetal} material={bellyMat} castShadow />
        <mesh
          geometry={brokenNose ? STATIC_GEO.noseGlassBroken : STATIC_GEO.noseGlassIntact}
          material={glassMat}
        />
        {STATIC_GEO.noseFramePipes.map((g, idx) => (
          <mesh key={`nframe-${idx}`} geometry={g} material={frameOliveMat} />
        ))}

        {/* Khung cửa ngắm bom phẳng đặc trưng ở chóp dưới mũi B-25B */}
        <mesh position={[7.98, 2.02, 0]} rotation={[0, Math.PI / 2, 0.35]} material={frameOliveMat}>
          <torusGeometry args={[0.21, 0.016, 8, 20]} />
        </mesh>

        {/* Sàn khoang mũi Bombardier, thước ngắm nhôm 20 xu "Mark Twain" & súng máy .30 cal */}
        <mesh position={[7.22, 1.76, 0]} material={chromateGreenMat}>
          <boxGeometry args={[1.28, 0.05, 0.72]} />
        </mesh>
        {/* Thước ngắm nhôm Mark Twain của Capt. Ross Greening */}
        <group position={[7.74, 1.98, -0.06]}>
          <mesh material={plain(PAINT.aluminumScrap, 0.3, 0.8)}>
            <boxGeometry args={[0.24, 0.16, 0.02]} />
          </mesh>
          <mesh position={[0.08, 0.1, 0]} rotation={[0, 0, -0.45]} material={plain(PAINT.aluminumScrap, 0.3, 0.8)}>
            <boxGeometry args={[0.22, 0.025, 0.025]} />
          </mesh>
        </group>
        {/* Súng máy mũi .30 cal Browning */}
        <group position={[7.72, 2.15, 0.05]}>
          <mesh material={gunMetalMat}>
            <boxGeometry args={[0.34, 0.09, 0.07]} />
          </mesh>
          <mesh position={[0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={gunMetalMat}>
            <cylinderGeometry args={[0.018, 0.016, 0.42, 10]} />
          </mesh>
        </group>

        {/* Chi tiết lỗ vỡ nham nhở Ø ~0.35 m trên chiếc #16 Bat Out of Hell (brokenNose = true) */}
        {brokenNose && (
          <group position={STATIC_GEO.holeCenter}>
            {Array.from({ length: 9 }, (_, k) => {
              const a = (k / 9) * Math.PI * 2;
              return (
                <mesh
                  key={`shard-${k}`}
                  position={[Math.sin(a * 2) * 0.03, Math.cos(a) * 0.17, Math.sin(a) * 0.17]}
                  rotation={[a, 0.35 * ((k % 3) - 1), a * 0.7]}
                  material={plain('#c9e4f2', 0.18, 0.1, { transparent: true, opacity: 0.78, side: THREE.DoubleSide })}
                >
                  <coneGeometry args={[0.045, 0.11, 3]} />
                </mesh>
              );
            })}
            {/* Nan khung gãy cong & vết rạn nứt kính */}
            <mesh position={[-0.03, 0.08, -0.04]} rotation={[0.4, -0.5, 0.8]} material={frameOliveMat}>
              <cylinderGeometry args={[0.014, 0.014, 0.24, 8]} />
            </mesh>
            {Array.from({ length: 5 }, (_, k) => {
              const a = k * 1.25 + 0.3;
              return (
                <mesh
                  key={`crack-${k}`}
                  position={[-0.06, Math.cos(a) * 0.24, Math.sin(a) * 0.24]}
                  rotation={[a, 0.2, 0.15]}
                  material={plain('#e8f6ff', 0.2, 0.1)}
                >
                  <boxGeometry args={[0.16, 0.008, 0.008]} />
                </mesh>
              );
            })}
          </group>
        )}
      </group>

      {/* ==================== 2. KHOANG BOM GIỮA THÂN & 4 QUẢ BOM 500-LB (bombBay = 0..1) ==================== */}
      <group>
        {/* Vòm trần & 2 vách ngăn khoang bom (luôn kín ánh sáng và hiện rõ khi mở cửa) */}
        <mesh position={[1.45, 2.22, 0]} material={chromateGreenMat}>
          <boxGeometry args={[2.82, 0.06, 1.18]} />
        </mesh>
        <mesh position={[1.45, 1.82, 0.57]} material={chromateGreenMat}>
          <boxGeometry args={[2.82, 0.82, 0.04]} />
        </mesh>
        <mesh position={[1.45, 1.82, -0.57]} material={chromateGreenMat}>
          <boxGeometry args={[2.82, 0.82, 0.04]} />
        </mesh>
        <mesh position={[2.84, 1.82, 0]} material={chromateGreenMat}>
          <boxGeometry args={[0.06, 0.85, 1.18]} />
        </mesh>
        <mesh position={[0.06, 1.82, 0]} material={chromateGreenMat}>
          <boxGeometry args={[0.06, 0.85, 1.18]} />
        </mesh>
        {/* Dầm giá treo bom trung tâm */}
        <mesh position={[1.45, 2.02, 0]} material={plain('#46542e', 0.65, 0.4)}>
          <boxGeometry args={[2.74, 0.34, 0.12]} />
        </mesh>

        {/* 4 quả bom phá 500-lb AN-M64 sơn Olive vành vàng (xếp 2 tầng so le rõ nét khi cửa mở) */}
        {(
          [
            [2.12, 1.54, 0.24],
            [2.12, 1.80, -0.24],
            [0.78, 1.80, 0.24],
            [0.78, 1.54, -0.24],
          ] as V3[]
        ).map(([bx, by, bz], idx) => (
          <group key={`bomb-${idx}`} position={[bx, by, bz]}>
            <mesh geometry={STATIC_GEO.bombBodyGeo} material={plain(PAINT.bombOlive, 0.62, 0.28)} castShadow />
            <mesh geometry={STATIC_GEO.bombBandGeo} material={plain(PAINT.bombYellowBand, 0.5, 0.15)} />
            {/* Cánh đuôi hộp vuông AN-M64 */}
            <mesh position={[-0.56, 0, 0]} material={plain(PAINT.bombOlive, 0.65, 0.3)}>
              <boxGeometry args={[0.20, 0.28, 0.02]} />
            </mesh>
            <mesh position={[-0.56, 0, 0]} material={plain(PAINT.bombOlive, 0.65, 0.3)}>
              <boxGeometry args={[0.20, 0.02, 0.28]} />
            </mesh>
            <mesh position={[-0.56, 0, 0]} material={plain(PAINT.bombOlive, 0.65, 0.3)}>
              <boxGeometry args={[0.18, 0.27, 0.27]} />
            </mesh>
          </group>
        ))}

        {/* Cửa khoang bom mạn phải (+Z) xoay mở xuống & ra ngoài */}
        <group position={[0, STATIC_GEO.bombHingeY, STATIC_GEO.bombHingeZ]} rotation={[-bombDoorAngle, 0, 0]}>
          <mesh geometry={STATIC_GEO.bombDoorR.outer} material={bellyMat} castShadow receiveShadow />
          <mesh geometry={STATIC_GEO.bombDoorR.inner} material={chromateGreenMat} />
        </group>

        {/* Cửa khoang bom mạn trái (-Z) xoay mở xuống & ra ngoài */}
        <group position={[0, STATIC_GEO.bombHingeY, -STATIC_GEO.bombHingeZ]} rotation={[bombDoorAngle, 0, 0]}>
          <mesh geometry={STATIC_GEO.bombDoorL.outer} material={bellyMat} castShadow receiveShadow />
          <mesh geometry={STATIC_GEO.bombDoorL.inner} material={chromateGreenMat} />
        </group>
      </group>

      {/* ==================== 3. CÁNH HẢI ÂU (GULL-WING 20.60 M) & 2 ĐỘNG CƠ WRIGHT R-2600 ==================== */}
      <mesh geometry={STATIC_GEO.wingTopR} material={oliveMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.wingBotR} material={bellyMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.wingTopL} material={oliveMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.wingBotL} material={bellyMat} castShadow receiveShadow />

      {/* Khe hút gió két làm mát dầu (Oil Cooler Intakes) trên mép trước đoạn cánh trong */}
      {([-1.92, 1.92] as const).map((zo, idx) => (
        <group key={`oil-intake-${idx}`} position={[3.01, 2.63, zo]} rotation={[Math.sign(zo) * 0.1, 0, 0]}>
          <mesh geometry={rbox(0.24, 0.18, 0.56, 0.04)} material={oliveMat} castShadow />
          <mesh position={[0.11, 0, 0]} material={plain('#17191a', 0.9, 0.2)}>
            <boxGeometry args={[0.04, 0.10, 0.44]} />
          </mesh>
        </group>
      ))}

      {/* Đường khe tách nét bánh lái liệng (Ailerons) trên đoạn cánh ngoài */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={`aileron-seam-${s}`}
          position={[0.74, 2.54, s * 7.55]}
          rotation={[s * -0.038, s * 0.082, 0]}
          material={plain('#262c1b', 0.85, 0.2)}
        >
          <boxGeometry args={[0.025, 0.15, 4.1]} />
        </mesh>
      ))}

      {/* Ống Pitot đo tốc độ ở đầu cánh trái */}
      <mesh position={[1.98, 2.45, -9.85]} rotation={[0, 0, Math.PI / 2]} material={strutGreyMat}>
        <cylinderGeometry args={[0.012, 0.016, 0.56, 8]} />
      </mesh>

      {/* Hai cụm động cơ Wright R-2600 tại z = ±3.05 m */}
      <RadialEngineUnit
        side={1}
        propSpin={propSpin}
        propFast={propFast}
        oliveCowlingMat={oliveCowlingMat}
        oliveLoftMat={oliveMat}
        bellyLoftMat={bellyMat}
      />
      <RadialEngineUnit
        side={-1}
        propSpin={propSpin}
        propFast={propFast}
        oliveCowlingMat={oliveCowlingMat}
        oliveLoftMat={oliveMat}
        bellyLoftMat={bellyMat}
      />

      {/* ==================== 4. ĐUÔI KÉP CHỮ H (TWIN H-TAIL, CAO ĐỈNH 4.98 M) ==================== */}
      <mesh geometry={STATIC_GEO.hStabTop} material={oliveMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.hStabBot} material={bellyMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.hElevTop} material={oliveCtrlMat} castShadow receiveShadow />
      <mesh geometry={STATIC_GEO.hElevBot} material={bellyMat} castShadow receiveShadow />

      {/* Hai cánh đuôi đứng bầu dục lớn ở z = ±3.40 m (tách nét Fin & Rudder) */}
      {([-3.4, 3.4] as const).map((zt, idx) => (
        <group key={`vtail-${idx}`} position={[0, 0, zt]}>
          <mesh geometry={STATIC_GEO.vFinGeo} material={oliveMat} castShadow receiveShadow />
          <mesh geometry={STATIC_GEO.vRudderGeo} material={oliveCtrlMat} castShadow receiveShadow />
          {/* Tab chỉnh cân bằng bánh lái hướng */}
          <mesh position={[-6.63, 3.38, 0]} material={plain('#3e472b', 0.7, 0.25)}>
            <boxGeometry args={[0.12, 0.62, 0.042]} />
          </mesh>
        </group>
      ))}

      {/* ==================== 5. THÁP PHÁO LƯNG BENDIX, THÁP BỤNG & 2 CÁN CHỔI ĐUÔI ==================== */}
      {/* Tháp pháo lưng Bendix tại x = -0.60 m */}
      <group position={[-0.60, 3.39, 0]}>
        {/* Đế vành kim loại gắn vào sống lưng */}
        <mesh material={oliveCowlingMat} castShadow>
          <cylinderGeometry args={[0.52, 0.56, 0.14, 32]} />
        </mesh>
        {/* Tháp xoay theo turretYaw */}
        <group rotation={[0, turretYaw, 0]}>
          <mesh position={[0, 0.05, 0]} material={frameOliveMat}>
            <cylinderGeometry args={[0.50, 0.51, 0.08, 32]} />
          </mesh>
          <mesh position={[0, 0.06, 0]} geometry={STATIC_GEO.bendixDomeGeo} material={glassMat} />
          {/* Khung vòm thép bảo vệ khe súng */}
          {([-0.12, 0.12] as const).map((zo, idx) => (
            <mesh key={`dome-rib-${idx}`} position={[0, 0.08, zo]} material={frameOliveMat}>
              <torusGeometry args={[0.475, 0.015, 8, 24, Math.PI]} />
            </mesh>
          ))}
          {/* Cặp súng máy hạng nặng .50 cal M2 Browning nâng hạ theo turretPitch */}
          <group position={[0.12, 0.25, 0]} rotation={[0, 0, turretPitch]}>
            <mesh position={[-0.1, 0, 0]} material={gunMetalMat}>
              <boxGeometry args={[0.34, 0.13, 0.34]} />
            </mesh>
            {([-0.12, 0.12] as const).map((zg, idx) => (
              <group key={`bendix-gun-${idx}`} position={[0.1, 0, zg]}>
                {/* Áo tản nhiệt đục lỗ .50 cal */}
                <mesh position={[0.20, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#2f3438', 0.5, 0.65)} castShadow>
                  <cylinderGeometry args={[0.032, 0.032, 0.36, 12]} />
                </mesh>
                {/* Nòng thép dài */}
                <mesh position={[0.50, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={gunMetalMat} castShadow>
                  <cylinderGeometry args={[0.017, 0.015, 0.52, 10]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>

      {/* Tháp pháo bụng Bendix: mặc định lowerTurret=false là tấm ốp phẳng cải hoán Doolittle */}
      <group position={[-1.25, 1.30, 0]}>
        {!lowerTurret ? (
          <mesh material={bellyMat}>
            <cylinderGeometry args={[0.44, 0.44, 0.05, 28]} />
          </mesh>
        ) : (
          <group position={[0, -0.22, 0]}>
            <mesh material={bellyMat} castShadow>
              <cylinderGeometry args={[0.36, 0.33, 0.42, 24]} />
            </mesh>
            <mesh position={[0, -0.21, 0]} rotation={[Math.PI, 0, 0]} material={bellyMat}>
              <sphereGeometry args={[0.33, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
            </mesh>
            {([-0.09, 0.09] as const).map((zg, idx) => (
              <mesh key={`vgun-${idx}`} position={[-0.44, -0.06, zg]} rotation={[0, 0, Math.PI / 2]} material={gunMetalMat}>
                <cylinderGeometry args={[0.016, 0.018, 0.56, 10]} />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* Chóp đuôi kính Plexiglass (tới đúng x = -7.93 m) & 2 cán chổi sơn đen (broomsticks = true) */}
      <group>
        <mesh geometry={STATIC_GEO.tailGlassCone} material={glassMat} />
        {STATIC_GEO.tailFramePipes.map((g, idx) => (
          <mesh key={`tframe-${idx}`} geometry={g} material={frameOliveMat} />
        ))}
        {/* Bọc vải bạt cổ súng ở chóp đuôi */}
        <mesh position={[-7.89, 2.94, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#3b4030', 0.88, 0.08)}>
          <cylinderGeometry args={[0.085, 0.11, 0.10, 16]} />
        </mesh>

        {broomsticks && (
          <group position={[-7.68, 2.94, 0]} rotation={[0, 0, -0.06]}>
            {/* Giá gỗ kẹp 2 cán chổi bên trong chóp kính */}
            <mesh position={[0.10, 0, 0]} material={plain('#5e4934', 0.85, 0.05)}>
              <boxGeometry args={[0.08, 0.08, 0.28]} />
            </mesh>
            {([-0.085, 0.085] as const).map((zb, idx) => (
              <group key={`broom-${idx}`} position={[-0.36, 0, zb]}>
                {/* Thanh cán chổi gỗ sơn đen mờ thò ra sau giả súng đôi .50 cal */}
                <mesh rotation={[0, 0, Math.PI / 2]} material={broomWoodMat} castShadow>
                  <cylinderGeometry args={[0.019, 0.022, 0.82, 12]} />
                </mesh>
                {/* Khấc tiện đầu cán chổi */}
                <mesh position={[-0.39, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={broomWoodMat}>
                  <cylinderGeometry args={[0.024, 0.022, 0.05, 12]} />
                </mesh>
              </group>
            ))}
          </group>
        )}
      </group>

      {/* ==================== 6. BỘ CÀNG ĐÁP 3 BÁNH (gear = 0..1, bánh chạm đúng y = 0.000 m!) ==================== */}
      {/* Càng mũi (Nose Gear tại x = +5.68, z = 0, r = 0.39 m) */}
      <group>
        {/* Hốc bánh mũi & 2 cánh cửa càng mũi */}
        <mesh position={[5.30, 1.66, 0]} material={chromateGreenMat}>
          <boxGeometry args={[1.24, 0.52, 0.52]} />
        </mesh>
        <group position={[5.30, 1.41, 0.24]} rotation={[-gearDoorOpen, 0, 0]}>
          <mesh position={[0, -0.12, 0]} material={bellyMat} castShadow>
            <boxGeometry args={[1.22, 0.24, 0.03]} />
          </mesh>
        </group>
        <group position={[5.30, 1.41, -0.24]} rotation={[gearDoorOpen, 0, 0]}>
          <mesh position={[0, -0.12, 0]} material={bellyMat} castShadow>
            <boxGeometry args={[1.22, 0.24, 0.03]} />
          </mesh>
        </group>

        {/* Trụ càng mũi gập về sau */}
        <group position={[5.68, 1.62, 0]} rotation={[0, 0, noseRetractRot]}>
          <mesh position={[0, -0.36, 0]} material={strutGreyMat} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.72, 14]} />
          </mesh>
          <mesh position={[0, -0.82, 0]} material={chromeOleoMat} castShadow>
            <cylinderGeometry args={[0.038, 0.038, 0.42, 14]} />
          </mesh>
          {/* Thanh giằng chéo & càng kẹp lệch 1 bên đặc trưng của B-25 */}
          <mesh position={[-0.22, -0.34, 0]} rotation={[0, 0, -0.58]} material={strutGreyMat}>
            <cylinderGeometry args={[0.025, 0.025, 0.72, 10]} />
          </mesh>
          <mesh position={[0, -1.04, 0.14]} material={strutGreyMat} castShadow>
            <boxGeometry args={[0.10, 0.42, 0.05]} />
          </mesh>
          <mesh position={[0, -0.84, 0.07]} material={strutGreyMat}>
            <boxGeometry args={[0.10, 0.06, 0.18]} />
          </mesh>
          {/* Tâm bánh mũi ở y = 1.62 - 1.23 = 0.39 m -> đáy lốp r = 0.39 m chạm đúng y = 0! */}
          <Wheel r={0.39} width={0.25} spin={propSpin * 0.25} tire="#252729" rim="#7e878c" bolts={6} position={[0, -1.23, 0]} />
        </group>
      </group>

      {/* Hai càng đáp chính (Main Gear tại x = +1.24, z = ±2.95 m — cách nhau đúng 5.90 m theo trục Z!) */}
      {([-1, 1] as const).map((s) => {
        const zWheel = s * 2.95;
        const nac = s === 1 ? STATIC_GEO.nacR : STATIC_GEO.nacL;
        return (
          <group key={`mgear-${s}`}>
            {/* Cặp cửa càng chính dưới bụng nacelle */}
            <group position={[0, nac.hOut[1], nac.hOut[2]]} rotation={[-s * gearDoorOpen, 0, 0]}>
              <mesh geometry={nac.doorOut} material={bellyMat} castShadow />
            </group>
            <group position={[0, nac.hIn[1], nac.hIn[2]]} rotation={[s * gearDoorOpen, 0, 0]}>
              <mesh geometry={nac.doorIn} material={bellyMat} castShadow />
            </group>

            {/* Cụm trụ càng chính chữ U đối xứng chuẩn B-25 thu về sau vào trong vỏ động cơ */}
            <group position={[1.24, 2.00, zWheel]} rotation={[0, 0, mainRetractRot]}>
              {/* Ống giảm chấn chính ở giữa & ty thủy lực mạ crôm */}
              <mesh position={[0, -0.34, 0]} material={strutGreyMat} castShadow>
                <cylinderGeometry args={[0.078, 0.070, 0.68, 16]} />
              </mesh>
              <mesh position={[0, -0.68, 0]} material={chromeOleoMat} castShadow>
                <cylinderGeometry args={[0.056, 0.056, 0.34, 16]} />
              </mesh>
              {/* Chạc chữ U ôm hai bên bánh chính 47-inch */}
              <mesh position={[0, -0.82, 0]} material={strutGreyMat} castShadow>
                <boxGeometry args={[0.13, 0.09, 0.54]} />
              </mesh>
              {([-0.23, 0.23] as const).map((zf, fi) => (
                <mesh key={`fork-${fi}`} position={[0, -1.12, zf]} material={strutGreyMat} castShadow>
                  <boxGeometry args={[0.11, 0.64, 0.055]} />
                </mesh>
              ))}
              {/* Khung giằng chữ A đôi chống lực cản */}
              {([-0.18, 0.18] as const).map((zd, di) => (
                <mesh key={`drag-${di}`} position={[-0.32, -0.42, zd]} rotation={[0, 0, -0.64]} material={strutGreyMat} castShadow>
                  <cylinderGeometry args={[0.032, 0.032, 0.98, 10]} />
                </mesh>
              ))}
              {/* Kéo chống xoay (Torque Scissors) */}
              <mesh position={[0.11, -0.58, 0]} rotation={[0, 0, 0.52]} material={strutGreyMat}>
                <boxGeometry args={[0.20, 0.034, 0.05]} />
              </mesh>
              <mesh position={[0.11, -0.71, 0]} rotation={[0, 0, -0.52]} material={strutGreyMat}>
                <boxGeometry args={[0.20, 0.034, 0.05]} />
              </mesh>
              {/* Trục ngang xuyên tâm bánh chính tại z = ±2.95 m */}
              <mesh position={[0, -1.41, 0]} rotation={[Math.PI / 2, 0, 0]} material={strutGreyMat} castShadow>
                <cylinderGeometry args={[0.054, 0.054, 0.52, 14]} />
              </mesh>
              {/* Tâm bánh chính ở y = 2.00 - 1.41 = 0.59 m -> đáy lốp r = 0.59 m chạm đúng y = 0! */}
              <Wheel
                r={0.59}
                width={0.38}
                spin={propSpin * 0.18}
                tire="#242628"
                rim="#7c8488"
                bolts={10}
                position={[0, -1.41, 0]}
              />
            </group>
          </group>
        );
      })}

      {/* ==================== 7. PHÙ HIỆU NGÔI SAO USAAF 1942 & ĂNG-TEN DÂY ==================== */}
      <mesh geometry={STATIC_GEO.roundelWingPort.disc} material={insigniaBlueMat} />
      <mesh geometry={STATIC_GEO.roundelWingPort.star} material={insigniaWhiteMat} />
      <mesh geometry={STATIC_GEO.roundelWingStbd.disc} material={insigniaBlueMat} />
      <mesh geometry={STATIC_GEO.roundelWingStbd.star} material={insigniaWhiteMat} />
      <mesh geometry={STATIC_GEO.roundelFuseStbd.disc} material={insigniaBlueMat} />
      <mesh geometry={STATIC_GEO.roundelFuseStbd.star} material={insigniaWhiteMat} />
      <mesh geometry={STATIC_GEO.roundelFusePort.disc} material={insigniaBlueMat} />
      <mesh geometry={STATIC_GEO.roundelFusePort.star} material={insigniaWhiteMat} />

      {/* Cột ăng-ten radio, bầu D/F Loop khí động & dây cáp chữ V */}
      <mesh position={[3.14, 3.74, 0]} rotation={[0, 0, -0.14]} material={frameOliveMat} castShadow>
        <boxGeometry args={[0.08, 0.62, 0.03]} />
      </mesh>
      <mesh position={[1.55, 3.51, 0]} scale={[1.8, 0.75, 0.75]} material={oliveCowlingMat} castShadow>
        <sphereGeometry args={[0.11, 16, 12]} />
      </mesh>
      <mesh geometry={STATIC_GEO.antennaWireR} material={plain('#2b2f33', 0.4, 0.7)} />
      <mesh geometry={STATIC_GEO.antennaWireL} material={plain('#2b2f33', 0.4, 0.7)} />

      {/* ==================== 8. VẾT THỦNG MẢNH PHÁO PHÒNG KHÔNG 8-INCH (flakDamage = true, chiếc #10 Joyce) ==================== */}
      {flakDamage && (
        <group>
          {/* Vết toác cháy sém lớn bên mạn phải thân sau + mảnh xuyên qua mạn trái */}
          {([1, -1] as const).map((s) => {
            const xHit = s === 1 ? -2.35 : -2.55;
            const yHit = s === 1 ? 2.48 : 2.62;
            const zSurf = evalFuseSurfaceZ(xHit, yHit);
            const scaleDmg = s === 1 ? 1 : 0.68;
            return (
              <group key={`flak-${s}`} position={[xHit, yHit, s * (zSurf + 0.008)]} scale={scaleDmg}>
                {/* Vết ám khói đen cháy sém */}
                <mesh rotation={[Math.PI / 2, 0, 0]} material={plain('#161514', 0.95, 0.05)}>
                  <cylinderGeometry args={[0.42, 0.42, 0.012, 18]} />
                </mesh>
                {/* Hốc tối & khung sườn lộ bên trong */}
                <mesh position={[0, 0, s * 0.006]} rotation={[Math.PI / 2, 0, 0]} material={plain('#0b0c0a', 0.95, 0.1)}>
                  <cylinderGeometry args={[0.20, 0.20, 0.015, 10]} />
                </mesh>
                <mesh position={[0.02, 0, s * 0.01]} rotation={[0, 0, 0.25]} material={chromateGreenMat}>
                  <boxGeometry args={[0.035, 0.36, 0.02]} />
                </mesh>
                {/* Các mảnh vỏ nhôm duralumin cong toác ra ngoài */}
                {Array.from({ length: 8 }, (_, k) => {
                  const a = (k / 8) * Math.PI * 2;
                  return (
                    <mesh
                      key={`petal-${k}`}
                      position={[Math.cos(a) * 0.21, Math.sin(a) * 0.21, s * 0.04]}
                      rotation={[Math.sin(a) * 0.5 * s, -Math.cos(a) * 0.5 * s, a]}
                      material={plain(PAINT.aluminumScrap, 0.34, 0.78)}
                    >
                      <coneGeometry args={[0.06, 0.13, 3]} />
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>
      )}

      {/* ==================== 9. XÍCH CHẰNG & CHÈN BÁNH TRÊN SÀN TÀU HORNET (chained = true) ==================== */}
      {chained && gVal > 0.7 && (
        <group>
          {/* Chèn bánh gỗ sơn vàng Hải quân cho 2 bánh chính & bánh mũi */}
          {(
            [
              [1.24, 2.95, 0.56],
              [1.24, -2.95, 0.56],
              [5.68, 0, 0.38],
            ] as V3[]
          ).map(([wx, wz, off], idx) => (
            <group key={`chock-${idx}`}>
              <mesh position={[wx + off, 0.10, wz]} geometry={rbox(0.22, 0.20, 0.48, 0.03)} material={plain(PAINT.deckStripeYellow, 0.75, 0.1)} castShadow />
              <mesh position={[wx - off, 0.10, wz]} geometry={rbox(0.22, 0.20, 0.48, 0.03)} material={plain(PAINT.deckStripeYellow, 0.75, 0.1)} castShadow />
            </group>
          ))}

          {/* Xích thép chằng chéo từ trục càng & móc cánh xuống khuyên sàn tàu tại y = 0 */}
          {(
            [
              [[1.24, 0.85, 2.95], [2.15, 0.02, 3.65]],
              [[1.24, 0.85, 2.95], [0.25, 0.02, 3.65]],
              [[1.24, 0.85, -2.95], [2.15, 0.02, -3.65]],
              [[1.24, 0.85, -2.95], [0.25, 0.02, -3.65]],
              [[5.68, 0.72, 0], [6.45, 0.02, 0.62]],
              [[5.68, 0.72, 0], [6.45, 0.02, -0.62]],
            ] as [V3, V3][]
          ).map(([pA, pB], idx) => (
            <group key={`chain-${idx}`}>
              <mesh geometry={pipe([pA, pB], 0.022, 8)} material={plain('#2d333a', 0.5, 0.78)} castShadow />
              <mesh position={pB} material={plain('#38414a', 0.55, 0.7)}>
                <cylinderGeometry args={[0.07, 0.08, 0.04, 12]} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ==================== 10. ĐÈN HÀNH TRÌNH ĐẦU CÁNH & ÁNH SÁNG BUỒNG LÁI (navLights = true) ==================== */}
      {/* Chụp kính đèn đầu cánh luôn hiện, bật phát sáng rực khi navLights = true */}
      <mesh
        position={[1.34, 2.46, -10.29]}
        material={
          navLights
            ? plain('#ff3224', 0.2, 0.1, { emissive: new THREE.Color('#ff2214'), emissiveIntensity: 2.8 })
            : plain('#8c221c', 0.3, 0.15)
        }
      >
        <sphereGeometry args={[0.055, 12, 10]} />
      </mesh>
      <mesh
        position={[1.34, 2.46, 10.29]}
        material={
          navLights
            ? plain('#28ff64', 0.2, 0.1, { emissive: new THREE.Color('#18ee52'), emissiveIntensity: 2.8 })
            : plain('#1d6e34', 0.3, 0.15)
        }
      >
        <sphereGeometry args={[0.055, 12, 10]} />
      </mesh>

      {navLights && (
        <group>
          {/* Đèn trắng đuôi trên 2 cánh đứng */}
          {([-3.4, 3.4] as const).map((zt, idx) => (
            <mesh
              key={`tail-light-${idx}`}
              position={[-6.86, 3.42, zt]}
              material={plain('#fff8e6', 0.2, 0.1, { emissive: new THREE.Color('#ffefc4'), emissiveIntensity: 2.2 })}
            >
              <sphereGeometry args={[0.04, 10, 8]} />
            </mesh>
          ))}
          {/* Ánh sáng bảng đồng hồ ấm hổ phách-lục trong buồng lái & mũi kính */}
          <pointLight position={[4.75, 2.95, 0]} color="#ffb95e" intensity={1.8} distance={2.8} decay={2} />
          <pointLight position={[7.45, 2.15, 0]} color="#ffd28a" intensity={1.1} distance={2.2} decay={2} />
        </group>
      )}
    </group>
  );
};

export const preview = turntable(() => <B25Mitchell gear={1} bombBay={0.35} propSpin={0.4} />, {
  size: 21,
  center: [0, 2.4, 0],
});
