// Rockwell B-1B Lancer ("The Bone") — tỉ lệ 1:1 mét thật, mũi +X, đỉnh +Y, mặt phẳng đối xứng Z=0.
// Gốc tọa độ cục bộ [0, 0, 0] của <B1BLancer /> đặt tại tâm trục dọc thân máy bay:
//   - Chiều dài thân: 44.50 m (x từ -22.25 m nón radar đuôi ALQ-161 tới +22.25 m chóp mũi radome).
//   - Sải cánh biến hình (wingSweep 0..1): 41.80 m (z = ±20.90 m ở 15°) → 24.10 m (z = ±12.05 m ở 67.5°).
//   - Chiều cao toàn phần khi hạ càng (gear = 1): 10.40 m (đáy 10 bánh xe ở y = -3.10 m, đỉnh đuôi chữ thập y = +7.30 m).
//   - Trên bàn xoay MODELS.B1BLancer bọc ở y = +3.10 m (B1B_GROUND_Y) để toàn bộ bánh đáp chạm chuẩn mặt sàn y = 0.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

export type B1BLancerProps = {
  /** Độ cụp cánh biến hình: 0 = xòe 15° (sải 41.80 m), 1 = cụp siêu thanh 67.5° (sải 24.10 m). */
  wingSweep?: number;
  /** Luồng lửa đốt sau 4 động cơ GE F101: 0..1. */
  afterburner?: number;
  /** Càng đáp: 1 = hạ chạm đất (y = -3.10 m), 0 = thu kín vào bụng khi bay. */
  gear?: number;
  /** Độ mở cửa khoang vũ khí dưới bụng (2 khoang xoay CSRL trước & sau): 0..1. */
  bayOpen?: number;
};

/** Độ cao nâng trục thân để bánh xe khi gear=1 chạm đúng mặt đất y = 0. */
export const B1B_GROUND_Y = 3.1;
/** Tọa độ tâm khoang vũ khí trước & sau (hệ tọa độ cục bộ B1BLancer) phục vụ cảnh thả đạn S19. */
export const B1B_FWD_BAY_POS: [number, number, number] = [6.8, -1.05, 0];
export const B1B_AFT_BAY_POS: [number, number, number] = [-7.3, -1.05, 0];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth5 = (t: number) => {
  const u = clamp01(t);
  return u * u * u * (10 - 15 * u + 6 * u * u);
};

// ---------------- THÔNG SỐ MẶT CẮT THÂN CỔ THIÊN NGA & BLENDED WING-GLOVE ----------------
type BodyStation = {
  x: number;
  wCore: number;
  wGlove: number;
  yTop: number;
  yBot: number;
  yChine: number;
  tGlove: number;
};

// 36 trạm dọc từ đuôi (-22.25 m) tới chóp mũi radome (+22.25 m):
// Khắc họa rõ đường cong chữ S cổ thiên nga (mũi chúi mượt y = -0.76 m, vòm buồng lái, eo cổ +10.2 m, lưng gồ cơ bắp +1.65 m trên hộp cánh).
const BODY_STATIONS: BodyStation[] = [
  { x: -22.25, wCore: 0.03, wGlove: 0.0, yTop: 0.31, yBot: 0.25, yChine: 0.28, tGlove: 0.03 },
  { x: -21.95, wCore: 0.25, wGlove: 0.0, yTop: 0.48, yBot: 0.08, yChine: 0.28, tGlove: 0.12 },
  { x: -21.35, wCore: 0.49, wGlove: 0.0, yTop: 0.67, yBot: -0.09, yChine: 0.27, tGlove: 0.18 },
  { x: -20.60, wCore: 0.72, wGlove: 0.0, yTop: 0.84, yBot: -0.25, yChine: 0.25, tGlove: 0.22 },
  { x: -19.20, wCore: 0.98, wGlove: 0.08, yTop: 1.03, yBot: -0.47, yChine: 0.22, tGlove: 0.24 },
  { x: -17.40, wCore: 1.20, wGlove: 0.16, yTop: 1.20, yBot: -0.68, yChine: 0.19, tGlove: 0.25 },
  { x: -15.20, wCore: 1.38, wGlove: 0.22, yTop: 1.34, yBot: -0.86, yChine: 0.16, tGlove: 0.27 },
  { x: -13.00, wCore: 1.50, wGlove: 0.30, yTop: 1.44, yBot: -1.00, yChine: 0.15, tGlove: 0.29 },
  { x: -11.00, wCore: 1.56, wGlove: 0.76, yTop: 1.51, yBot: -1.08, yChine: 0.16, tGlove: 0.33 },
  { x: -9.20, wCore: 1.60, wGlove: 1.48, yTop: 1.56, yBot: -1.12, yChine: 0.17, tGlove: 0.37 },
  { x: -7.40, wCore: 1.62, wGlove: 2.24, yTop: 1.60, yBot: -1.12, yChine: 0.18, tGlove: 0.41 },
  { x: -5.40, wCore: 1.64, wGlove: 2.94, yTop: 1.63, yBot: -1.12, yChine: 0.19, tGlove: 0.44 },
  { x: -3.40, wCore: 1.65, wGlove: 3.55, yTop: 1.65, yBot: -1.12, yChine: 0.20, tGlove: 0.47 },
  { x: -1.60, wCore: 1.65, wGlove: 4.04, yTop: 1.66, yBot: -1.12, yChine: 0.21, tGlove: 0.49 },
  { x: 0.00, wCore: 1.65, wGlove: 4.36, yTop: 1.65, yBot: -1.12, yChine: 0.21, tGlove: 0.51 },
  { x: 1.40, wCore: 1.65, wGlove: 4.58, yTop: 1.63, yBot: -1.12, yChine: 0.21, tGlove: 0.52 },
  { x: 2.45, wCore: 1.64, wGlove: 4.60, yTop: 1.60, yBot: -1.12, yChine: 0.21, tGlove: 0.51 },
  { x: 3.45, wCore: 1.62, wGlove: 4.44, yTop: 1.56, yBot: -1.12, yChine: 0.20, tGlove: 0.47 },
  { x: 4.45, wCore: 1.60, wGlove: 3.72, yTop: 1.51, yBot: -1.12, yChine: 0.18, tGlove: 0.40 },
  { x: 5.65, wCore: 1.58, wGlove: 2.45, yTop: 1.45, yBot: -1.12, yChine: 0.15, tGlove: 0.32 },
  { x: 7.00, wCore: 1.55, wGlove: 1.32, yTop: 1.39, yBot: -1.12, yChine: 0.11, tGlove: 0.24 },
  { x: 8.50, wCore: 1.53, wGlove: 0.56, yTop: 1.34, yBot: -1.11, yChine: 0.07, tGlove: 0.19 },
  { x: 10.10, wCore: 1.50, wGlove: 0.16, yTop: 1.31, yBot: -1.09, yChine: 0.03, tGlove: 0.16 },
  { x: 11.60, wCore: 1.49, wGlove: 0.04, yTop: 1.33, yBot: -1.05, yChine: 0.0, tGlove: 0.15 },
  { x: 13.00, wCore: 1.50, wGlove: 0.0, yTop: 1.37, yBot: -1.01, yChine: -0.02, tGlove: 0.15 },
  { x: 14.30, wCore: 1.48, wGlove: 0.0, yTop: 1.35, yBot: -0.97, yChine: -0.04, tGlove: 0.15 },
  { x: 15.40, wCore: 1.42, wGlove: 0.0, yTop: 1.18, yBot: -0.94, yChine: -0.09, tGlove: 0.14 },
  { x: 16.50, wCore: 1.32, wGlove: 0.0, yTop: 0.92, yBot: -0.91, yChine: -0.16, tGlove: 0.14 },
  { x: 17.55, wCore: 1.17, wGlove: 0.0, yTop: 0.65, yBot: -0.89, yChine: -0.24, tGlove: 0.13 },
  { x: 18.55, wCore: 0.99, wGlove: 0.0, yTop: 0.39, yBot: -0.87, yChine: -0.32, tGlove: 0.12 },
  { x: 19.45, wCore: 0.80, wGlove: 0.0, yTop: 0.15, yBot: -0.85, yChine: -0.40, tGlove: 0.10 },
  { x: 20.25, wCore: 0.60, wGlove: 0.0, yTop: -0.08, yBot: -0.83, yChine: -0.49, tGlove: 0.08 },
  { x: 20.95, wCore: 0.41, wGlove: 0.0, yTop: -0.29, yBot: -0.81, yChine: -0.57, tGlove: 0.06 },
  { x: 21.55, wCore: 0.23, wGlove: 0.0, yTop: -0.49, yBot: -0.79, yChine: -0.65, tGlove: 0.04 },
  { x: 21.98, wCore: 0.09, wGlove: 0.0, yTop: -0.65, yBot: -0.78, yChine: -0.72, tGlove: 0.02 },
  { x: 22.25, wCore: 0.015, wGlove: 0.0, yTop: -0.75, yBot: -0.77, yChine: -0.76, tGlove: 0.01 },
];

const TANH_K = Math.tanh(1.42);

/** Tính điểm mặt cắt (y, z) tại trạm `st` và góc `theta` (0 = sống lưng, pi/2 = mép phải +Z, pi = bụng). */
function evalBodyPoint(st: BodyStation, theta: number, indentBay = true): [number, number] {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const W = st.wCore + st.wGlove;
  const z = W * s;
  const r = Math.abs(s);

  const yFuse =
    c >= 0
      ? st.yChine + (st.yTop - st.yChine) * c
      : st.yChine + (st.yChine - st.yBot) * (Math.tanh(1.42 * c) / TANH_K);

  const yGlove = st.yChine + c * st.tGlove;

  const fCore = st.wCore / Math.max(0.05, W);
  const gloveWeight = smooth5(st.wGlove / 0.55);
  const blend = gloveWeight * smooth5((r - fCore * 0.45) / Math.max(0.18, fCore * 1.45));
  let y = yFuse * (1 - blend) + yGlove * blend;

  // Hốc lõm 2 khoang vũ khí xoay CSRL dưới bụng (trước: +4.2..+9.4; sau: -9.9..-4.7)
  if (indentBay && c < -0.25 && Math.abs(z) < 0.94) {
    const inFwd = smooth5((st.x - 4.18) / 0.35) * smooth5((9.42 - st.x) / 0.35);
    const inAft = smooth5((st.x - -9.92) / 0.35) * smooth5((-4.68 - st.x) / 0.35);
    const bayMask = Math.max(inFwd, inAft) * (1 - smooth5((Math.abs(z) - 0.78) / 0.16)) * smooth5((-c - 0.25) / 0.35);
    if (bayMask > 0) {
      y = y * (1 - bayMask) + -0.32 * bayMask;
    }
  }
  return [y, z];
}

function sampleStationAtX(x: number): BodyStation {
  if (x <= BODY_STATIONS[0].x) return BODY_STATIONS[0];
  const last = BODY_STATIONS[BODY_STATIONS.length - 1];
  if (x >= last.x) return last;
  for (let i = 0; i < BODY_STATIONS.length - 1; i++) {
    const a = BODY_STATIONS[i];
    const b = BODY_STATIONS[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / Math.max(1e-5, b.x - a.x);
      const u = t * t * (3 - 2 * t);
      return {
        x,
        wCore: a.wCore + (b.wCore - a.wCore) * u,
        wGlove: a.wGlove + (b.wGlove - a.wGlove) * u,
        yTop: a.yTop + (b.yTop - a.yTop) * u,
        yBot: a.yBot + (b.yBot - a.yBot) * u,
        yChine: a.yChine + (b.yChine - a.yChine) * u,
        tGlove: a.tGlove + (b.tGlove - a.tGlove) * u,
      };
    }
  }
  return last;
}

/** Dựng lưới loft thân liền cánh với UV tỉ lệ mét thật (1 m = 1 UV, đồng bộ hoàn toàn với extrude). */
function buildBodySegmentGeo(xMin: number, xMax: number, segX = 56, segTheta = 68): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= segX; i++) {
    const x = xMin + ((xMax - xMin) * i) / segX;
    const st = sampleStationAtX(x);
    let arc = 0;
    let prevY = 0;
    let prevZ = 0;
    for (let j = 0; j <= segTheta; j++) {
      const theta = (j / segTheta) * Math.PI * 2;
      const [y, z] = evalBodyPoint(st, theta, true);
      if (j > 0) {
        arc += Math.hypot(y - prevY, z - prevZ);
      }
      prevY = y;
      prevZ = z;
      pos.push(x, y, z);
      uvs.push(x, arc);
    }
  }

  const stride = segTheta + 1;
  for (let i = 0; i < segX; i++) {
    for (let j = 0; j < segTheta; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      idx.push(a, d, b, b, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Dựng patch ôm sát mặt cong kép của thân máy bay (dùng cho kính buồng lái, khung kính, vạch tiếp dầu, cửa thoát hiểm). */
function buildBodyPatchGeo(
  x0: number,
  x1: number,
  th0Top: number,
  th1Top: number,
  th0Bot: number,
  th1Bot: number,
  offset = 0.018,
  nx = 10,
  nt = 8,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= nx; i++) {
    const u = i / nx;
    const x = x0 + (x1 - x0) * u;
    const st = sampleStationAtX(x);
    const tA = th0Top + (th1Top - th0Top) * u;
    const tB = th0Bot + (th1Bot - th0Bot) * u;
    for (let j = 0; j <= nt; j++) {
      const v = j / nt;
      const th = tA + (tB - tA) * v;
      const [y, z] = evalBodyPoint(st, th, false);
      const ny = y - st.yChine;
      const nz = z;
      const nl = Math.max(1e-4, Math.hypot(ny, nz));
      pos.push(x + offset * 0.2, y + (ny / nl) * offset, z + (nz / nl) * offset);
      uvs.push(u, v);
    }
  }

  const stride = nt + 1;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nt; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      if (th0Bot >= th0Top) {
        idx.push(a, d, b, b, d, c);
      } else {
        idx.push(a, b, d, b, c, d);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------- CÁNH CHÍNH BIẾN HÌNH (3D SUPERCRITICAL AIRFOIL LOFT) ----------------
const WING_PIVOT_X = 2.45;
const WING_PIVOT_Y = 0.21;
const WING_PIVOT_Z = 4.73;
const TAN15 = Math.tan((15 * Math.PI) / 180);
const SWEEP_DELTA_RAD = ((67.5 - 15.0) * Math.PI) / 180; // 52.5°

type WingPartMode = 'full' | 'leadingEdge' | 'sealPlate';

function buildSweptWingGeo(side: 1 | -1, mode: WingPartMode = 'full'): THREE.BufferGeometry {
  const allStations: { dz: number; dxLE: number; chord: number; thick: number; dy: number }[] = [
    { dz: -1.15, dxLE: 1.25, chord: 3.95, thick: 0.44, dy: 0.0 },
    { dz: 0.0, dxLE: 1.15, chord: 3.92, thick: 0.45, dy: 0.0 },
    { dz: 1.45, dxLE: 1.15 - 1.45 * TAN15, chord: 3.75, thick: 0.43, dy: 0.0 },
    { dz: 3.0, dxLE: 1.15 - 3.0 * TAN15, chord: 3.52, thick: 0.39, dy: -0.008 },
    { dz: 6.5, dxLE: 1.15 - 6.5 * TAN15, chord: 3.02, thick: 0.30, dy: -0.03 },
    { dz: 9.8, dxLE: 1.15 - 9.8 * TAN15, chord: 2.58, thick: 0.24, dy: -0.05 },
    { dz: 13.0, dxLE: 1.15 - 13.0 * TAN15, chord: 2.18, thick: 0.19, dy: -0.07 },
    { dz: 15.4, dxLE: 1.15 - 15.4 * TAN15, chord: 1.88, thick: 0.15, dy: -0.09 },
    { dz: 16.17, dxLE: 1.15 - 16.17 * TAN15, chord: 1.62, thick: 0.11, dy: -0.10 },
  ];

  // Tấm đệm trượt teflon/titanium ở gốc cánh trong (seal rub-plate) chỉ trải từ dz = 0.0 tới dz = 3.0
  const stations = mode === 'sealPlate' ? allStations.slice(1, 4) : allStations;
  const segA = mode === 'full' ? 36 : 16;
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i < stations.length; i++) {
    const st = stations[i];
    const z = side * st.dz;
    for (let j = 0; j <= segA; j++) {
      let alpha: number;
      if (mode === 'leadingEdge') {
        alpha = Math.PI * 0.74 + (j / segA) * (Math.PI * 0.52);
      } else if (mode === 'sealPlate') {
        // Mặt lưng trên của gốc cánh (từ 18% tới 88% dây cung)
        alpha = Math.PI * 0.16 + (j / segA) * (Math.PI * 0.66);
      } else {
        alpha = (j / segA) * Math.PI * 2;
      }
      const xi = 0.5 * (1 + Math.cos(alpha));
      const dx = st.dxLE - st.chord * xi + (mode === 'leadingEdge' ? 0.009 : 0);
      const sa = Math.sin(alpha);
      const camber = 0.025 * st.chord * Math.sin(Math.PI * xi);
      const halfT = st.thick * 0.5 * (mode !== 'full' ? 1.035 : 1.0);
      const yProfile =
        sa >= 0
          ? camber + halfT * sa * (1 - 0.26 * xi)
          : camber + halfT * 0.76 * sa * (1 - 0.30 * xi);
      const y = st.dy + yProfile + (mode === 'sealPlate' ? 0.008 : 0);
      pos.push(dx, y, z);
      uvs.push(dx, st.dz);
    }
  }

  const stride = segA + 1;
  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < segA; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      if (side === 1) {
        idx.push(a, b, d, b, c, d);
      } else {
        idx.push(a, d, b, b, d, c);
      }
    }
  }

  if (mode === 'full') {
    const tipIdx = stations.length - 1;
    const tipSt = stations[tipIdx];
    const centerVert = pos.length / 3;
    pos.push(tipSt.dxLE - tipSt.chord * 0.48, tipSt.dy, side * tipSt.dz);
    uvs.push(tipSt.dxLE - tipSt.chord * 0.48, tipSt.dz);
    const base = tipIdx * stride;
    for (let j = 0; j < segA; j++) {
      if (side === 1) {
        idx.push(centerVert, base + j + 1, base + j);
      } else {
        idx.push(centerVert, base + j, base + j + 1);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------- VỎ ĐỘNG CƠ KÉP DƯỚI CÁNH (DUAL-ENGINE F101 NACELLE LOFT) ----------------
function buildDualNacelleGeo(): THREE.BufferGeometry {
  const nx = 30;
  const nt = 48;
  const xAft = -10.05;
  const xFwdMid = 0.22;
  const halfW = 1.21;
  const halfH = 0.72;

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= nx; i++) {
    const u = i / nx;
    const wScale = 1 - 0.07 * Math.pow(1 - u, 3) - 0.03 * Math.pow(u, 4);
    const hScale = 1 - 0.11 * Math.pow(1 - u, 3) - 0.02 * Math.pow(u, 4);
    let arc = 0;
    let py = 0;
    let pz = 0;

    for (let j = 0; j <= nt; j++) {
      const th = (j / nt) * Math.PI * 2;
      const s = Math.sin(th);
      const c = Math.cos(th);
      const signS = s >= 0 ? 1 : -1;
      const signC = c >= 0 ? 1 : -1;
      const z = signS * halfW * wScale * Math.pow(Math.abs(s), 0.62);
      const waist = 1 - 0.12 * Math.exp(-(s * s) / 0.08) * (0.35 + 0.65 * (1 - u));
      const y = signC * halfH * hScale * Math.pow(Math.abs(c), 0.68) * waist;

      const xLip = xFwdMid + 0.42 * (y / halfH) - 0.14 * Math.abs(s);
      const x = xAft + (xLip - xAft) * u;

      if (j > 0) arc += Math.hypot(y - py, z - pz);
      py = y;
      pz = z;
      pos.push(x, y, z);
      uvs.push(x, arc);
    }
  }

  const stride = nt + 1;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nt; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      idx.push(a, d, b, b, d, c);
    }
  }

  const aftCenter = pos.length / 3;
  pos.push(xAft, 0, 0);
  uvs.push(xAft, 0);
  for (let j = 0; j < nt; j++) {
    idx.push(aftCenter, j, j + 1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------- GEOMETRIES TĨNH KHỞI TẠO MỘT LẦN Ở CẤP MODULE ----------------
const MAIN_BODY_GEO = buildBodySegmentGeo(-20.85, 17.55, 64, 68);
const NOSE_RADOME_GEO = buildBodySegmentGeo(17.55, 22.25, 26, 56);
const TAIL_RADOME_GEO = buildBodySegmentGeo(-22.25, -20.85, 14, 48);
// Đai kim loại mảnh phân giới chóp Radome mũi tại x = +17.55 m
const RADOME_COLLAR_GEO = buildBodyPatchGeo(17.47, 17.58, -Math.PI, -Math.PI, Math.PI, Math.PI, 0.009, 3, 40);

// 4 ô kính chính buồng lái + 2 ô kính nóc (eyebrow skylights) ôm khít mũi cổ thiên nga
const WIN_FRONT_R = buildBodyPatchGeo(14.55, 16.34, 0.05, 0.045, 0.37, 0.30, 0.025);
const WIN_FRONT_L = buildBodyPatchGeo(14.55, 16.34, -0.05, -0.045, -0.37, -0.30, 0.025);
const WIN_SIDE_R = buildBodyPatchGeo(13.22, 14.92, 0.26, 0.39, 0.65, 0.56, 0.025);
const WIN_SIDE_L = buildBodyPatchGeo(13.22, 14.92, -0.26, -0.39, -0.65, -0.56, 0.025);
const WIN_BROW_R = buildBodyPatchGeo(13.52, 14.50, 0.055, 0.055, 0.20, 0.20, 0.025, 6, 5);
const WIN_BROW_L = buildBodyPatchGeo(13.52, 14.50, -0.055, -0.055, -0.20, -0.20, 0.025, 6, 5);

// Viền khung mảnh kim loại sáng vừa quanh cụm kính buồng lái để nổi rõ 4 ô kính trên nền sơn xám đậm
const WIN_FRAME_R = buildBodyPatchGeo(13.10, 16.48, 0.0, 0.0, 0.69, 0.34, 0.013, 12, 8);
const WIN_FRAME_L = buildBodyPatchGeo(13.10, 16.48, 0.0, 0.0, -0.69, -0.34, 0.013, 12, 8);

// Vạch dẫn đường tiếp dầu trên không hình xương cá (USAF aerial refueling alignment spine markings)
const REFUEL_DOOR_GEO = buildBodyPatchGeo(16.95, 17.95, -0.14, -0.15, 0.14, 0.15, 0.012, 5, 6);
const REFUEL_STRIPE_GEO = buildBodyPatchGeo(16.42, 18.45, -0.032, -0.038, 0.032, 0.038, 0.015, 8, 4);
const REFUEL_BAR1_GEO = buildBodyPatchGeo(16.65, 16.76, -0.22, -0.22, 0.22, 0.22, 0.015, 2, 8);
const REFUEL_BAR2_GEO = buildBodyPatchGeo(18.22, 18.33, -0.19, -0.19, 0.19, 0.19, 0.015, 2, 8);

// Viền 2 nắp cửa thoát hiểm nóc khoang phi hành đoàn 4 người phía sau buồng lái
const HATCH_AFT_R = buildBodyPatchGeo(11.65, 12.92, 0.06, 0.06, 0.36, 0.36, 0.009, 6, 6);
const HATCH_AFT_L = buildBodyPatchGeo(11.65, 12.92, -0.06, -0.06, -0.36, -0.36, 0.009, 6, 6);

const WING_R_GEO = buildSweptWingGeo(1, 'full');
const WING_L_GEO = buildSweptWingGeo(-1, 'full');
const WING_LE_R_GEO = buildSweptWingGeo(1, 'leadingEdge');
const WING_LE_L_GEO = buildSweptWingGeo(-1, 'leadingEdge');
const WING_SEAL_R_GEO = buildSweptWingGeo(1, 'sealPlate');
const WING_SEAL_L_GEO = buildSweptWingGeo(-1, 'sealPlate');

const NACELLE_GEO = buildDualNacelleGeo();

// Cánh mũi chống rung SMCS (foreplanes / canards) hai bên mũi trước buồng lái + mép trước RAM
const SMCS_PTS_R: P2[] = [
  [0.74, 0.0],
  [-0.20, 1.12],
  [-0.66, 1.10],
  [-0.74, 0.0],
];
const SMCS_PTS_L: P2[] = SMCS_PTS_R.map(([x, z]) => [x, -z]);
const SMCS_R_GEO = extrudeTop(SMCS_PTS_R, 0.065, 0.018);
const SMCS_L_GEO = extrudeTop(SMCS_PTS_L, 0.065, 0.018);
const SMCS_LE_R_GEO = extrudeTop(
  [
    [0.76, 0.0],
    [-0.19, 1.13],
    [-0.33, 1.12],
    [0.52, 0.0],
  ],
  0.07,
  0.012,
);
const SMCS_LE_L_GEO = extrudeTop(
  [
    [0.76, 0.0],
    [-0.19, -1.13],
    [-0.33, -1.12],
    [0.52, 0.0],
  ],
  0.07,
  0.012,
);

// Ăng-ten vây lưng khí động vát chéo mảnh (thay cho khối hộp thô)
const BLADE_ANTENNA_GEO = extrude(
  [
    [0.34, 0.0],
    [-0.08, 0.21],
    [-0.34, 0.21],
    [-0.24, 0.0],
  ],
  0.036,
  0.008,
);

// Đuôi đứng cao vút quét 50° + sống lưng dẫn hướng (dorsal fin fillet) đạt đỉnh y = +7.30 m
const VTAIL_MAIN_PTS: P2[] = [
  [-8.6, 1.48],
  [-12.4, 1.78],
  [-13.45, 2.04],
  [-19.15, 7.22],
  [-21.55, 7.22],
  [-20.62, 4.75],
  [-19.25, 1.95],
  [-18.65, 0.98],
  [-13.2, 1.32],
];
const VTAIL_LE_PTS: P2[] = [
  [-12.75, 1.84],
  [-13.45, 2.05],
  [-19.15, 7.23],
  [-19.64, 7.23],
  [-13.95, 2.03],
];
// Dải nhận diện chiến thuật low-vis ở đỉnh đuôi đứng (USAF Dyess/Ellsworth tail stripe)
const VTAIL_BAND_PTS: P2[] = [
  [-18.42, 6.56],
  [-18.88, 6.96],
  [-21.40, 6.96],
  [-21.24, 6.56],
];
const VTAIL_GEO = extrude(VTAIL_MAIN_PTS, 0.36, 0.07);
const VTAIL_LE_GEO = extrude(VTAIL_LE_PTS, 0.38, 0.04);
const VTAIL_BAND_GEO = extrude(VTAIL_BAND_PTS, 0.385, 0.01);

// Đạn fairing khớp xoay đuôi ngang chữ thập hạ đúng chuẩn B-1B tại gốc đuôi đứng (y = +1.64 m)
const TAIL_BULLET_GEO = lathe(
  [
    [0.01, -21.55],
    [0.19, -20.85],
    [0.33, -19.4],
    [0.36, -17.1],
    [0.29, -15.3],
    [0.14, -14.35],
    [0.01, -13.95],
  ],
  28,
);
const FIN_CAP_GEO = lathe(
  [
    [0.01, -22.05],
    [0.11, -21.65],
    [0.16, -20.4],
    [0.13, -19.2],
    [0.01, -18.85],
  ],
  24,
);

// Đuôi ngang chữ thập quét mạnh 55° đặt tại y = +1.64 m (sải đuôi ngang ~13.7 m, z = ±6.85 m)
const HTAIL_PTS_R: P2[] = [
  [1.85, 0.18],
  [-3.05, 6.84],
  [-4.68, 6.66],
  [-2.12, 0.18],
];
const HTAIL_PTS_L: P2[] = HTAIL_PTS_R.map(([x, z]) => [x, -z]);
const HTAIL_R_GEO = extrudeTop(HTAIL_PTS_R, 0.19, 0.045);
const HTAIL_L_GEO = extrudeTop(HTAIL_PTS_L, 0.19, 0.045);

const HTAIL_LE_R_GEO = extrudeTop(
  [
    [1.88, 0.18],
    [-3.04, 6.85],
    [-3.40, 6.81],
    [1.42, 0.18],
  ],
  0.20,
  0.03,
);
const HTAIL_LE_L_GEO = extrudeTop(
  [
    [1.88, -0.18],
    [-3.04, -6.85],
    [-3.40, -6.81],
    [1.42, -0.18],
  ],
  0.20,
  0.03,
);

// Gờ khí động ECM hai bên hông nón đuôi (aft fuselage side-chine fairings)
const AFT_CHINE_R_GEO = extrudeTop(
  [
    [-13.8, 1.32],
    [-16.2, 1.50],
    [-19.8, 1.04],
    [-21.2, 0.48],
    [-21.2, 0.18],
    [-13.8, 0.95],
  ],
  0.22,
  0.05,
);
const AFT_CHINE_L_GEO = extrudeTop(
  [
    [-13.8, -1.32],
    [-16.2, -1.50],
    [-19.8, -1.04],
    [-21.2, -0.48],
    [-21.2, -0.18],
    [-13.8, -0.95],
  ],
  0.22,
  0.05,
);

const FLAP_CANOE_GEO = lathe(
  [
    [0.01, -1.15],
    [0.09, -0.8],
    [0.11, 0.1],
    [0.07, 0.75],
    [0.01, 1.05],
  ],
  16,
);

// ---------------- HỌNG PHỤT ĐỘNG CƠ GE F101 & LUỒNG ĐỐT SAU ----------------
const NOZZLE_SHROUD_GEO = lathe(
  [
    [0.57, -10.55],
    [0.59, -10.00],
    [0.55, -10.65],
    [0.49, -11.35],
    [0.43, -11.35],
    [0.46, -10.50],
    [0.46, -9.95],
  ],
  32,
);
const NOZZLE_PETAL_GEO = rbox(0.78, 0.045, 0.17, 0.015);
const TURBINE_FACE_GEO = lathe(
  [
    [0.01, -9.75],
    [0.15, -9.92],
    [0.44, -9.98],
  ],
  24,
);

const AB_CORE_GEO = lathe(
  [
    [0.02, -4.9],
    [0.18, -3.2],
    [0.31, -1.4],
    [0.37, -0.22],
    [0.34, 0.0],
  ],
  24,
);
const AB_OUTER_GEO = lathe(
  [
    [0.03, -6.5],
    [0.27, -4.3],
    [0.46, -1.9],
    [0.50, -0.42],
    [0.43, 0.0],
  ],
  24,
);
const AB_HALO_GEO = lathe(
  [
    [0.05, -7.3],
    [0.36, -4.7],
    [0.56, -2.0],
    [0.55, -0.38],
    [0.46, 0.0],
  ],
  20,
);
const AB_DIAMOND_GEO = lathe(
  [
    [0.01, -0.32],
    [0.22, -0.16],
    [0.25, 0.0],
    [0.20, 0.15],
    [0.01, 0.28],
  ],
  18,
);

// Cửa khoang vũ khí cong ôm bụng & đạn dẫn đường JASSM/JDAM trên giá xoay CSRL
const BAY_LEN = 5.16;
const BAY_DOOR_R_GEO = extrude(
  [
    [-BAY_LEN / 2, 0.0],
    [BAY_LEN / 2, 0.0],
    [BAY_LEN / 2, 0.08],
    [-BAY_LEN / 2, 0.08],
  ],
  0.94,
  0.015,
);
const MUNITION_BODY_GEO = lathe(
  [
    [0.01, -1.95],
    [0.14, -1.75],
    [0.17, -0.8],
    [0.17, 1.15],
    [0.11, 1.65],
    [0.01, 1.98],
  ],
  18,
);

const NACELLE_RIVETS: [number, number, number][] = Array.from({ length: 20 }, (_, i) => [
  -9.3 + i * 0.48,
  -0.39,
  0,
]);

// ---------------- CÁC COMPONENT CON ----------------

const EngineNozzleAndPlume: React.FC<{ zOffset: number; afterburner: number }> = ({ zOffset, afterburner }) => {
  const ab = clamp01(afterburner);
  const dilate = 1 + ab * 0.1;

  const darkTi = plain('#232830', 0.34, 0.82);
  const petalMat = plain('#3a424d', 0.38, 0.76);
  const collarMat = plain('#596573', 0.36, 0.72);
  const glowRingMat = useMemo(
    () =>
      plain('#2b1508', 0.45, 0.3, {
        emissive: new THREE.Color('#ff6e14'),
        emissiveIntensity: 0.3 + ab * 2.6,
      }),
    [ab],
  );

  return (
    <group position={[0, 0, zOffset]}>
      {/* Vỏ ngoài họng phụt biến thiên F101 + đai titan sáng ở gốc họng */}
      <mesh geometry={NOZZLE_SHROUD_GEO} material={darkTi} scale={[1, dilate, dilate]} castShadow receiveShadow />
      <mesh position={[-10.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={collarMat}>
        <cylinderGeometry args={[0.585 * dilate, 0.585 * dilate, 0.16, 28]} />
      </mesh>
      <mesh geometry={TURBINE_FACE_GEO} material={glowRingMat} />

      {/* 16 lá cánh turkey-feather xếp chồng vòng quanh miệng phụt */}
      {Array.from({ length: 16 }, (_, k) => {
        const ang = (k / 16) * Math.PI * 2;
        const r = 0.515 * dilate;
        return (
          <group key={k} position={[-10.98, Math.cos(ang) * r, Math.sin(ang) * r]} rotation={[ang, 0, 0]}>
            <mesh geometry={NOZZLE_PETAL_GEO} material={petalMat} rotation={[0, 0, 0.11 - ab * 0.07]} castShadow />
          </group>
        );
      })}

      {/* Luồng lửa đốt sau nhiều lớp Additive rực lửa cam-vàng + lõi plasma lam trắng + đĩa Mach diamonds */}
      {ab > 0.01 && (
        <group position={[-11.3, 0, 0]} scale={[0.48 + ab * 0.85, 0.78 + ab * 0.24, 0.78 + ab * 0.24]}>
          <mesh geometry={AB_HALO_GEO}>
            <meshBasicMaterial
              color="#e64200"
              transparent
              opacity={0.34 * ab}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh geometry={AB_OUTER_GEO}>
            <meshBasicMaterial
              color="#ff881a"
              transparent
              opacity={0.62 * ab}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh geometry={AB_CORE_GEO}>
            <meshBasicMaterial
              color="#b8eeff"
              transparent
              opacity={0.85 * Math.min(1, ab * 1.25)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {[0.62, 1.5, 2.48, 3.55, 4.65].map((d, idx) => (
            <mesh
              key={idx}
              geometry={AB_DIAMOND_GEO}
              position={[-d, 0, 0]}
              scale={[1 - idx * 0.13, 1 - idx * 0.15, 1 - idx * 0.15]}
            >
              <meshBasicMaterial
                color={idx < 2 ? '#fff9e6' : '#ffb84d'}
                transparent
                opacity={(0.88 - idx * 0.14) * ab}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

const DualEnginePod: React.FC<{
  side: 1 | -1;
  bodyPaint: THREE.Material;
  radomeMat: THREE.Material;
  trimMat: THREE.Material;
  afterburner: number;
}> = ({ side, bodyPaint, radomeMat, trimMat, afterburner }) => {
  const ab = clamp01(afterburner);
  const darkIntake = plain('#0e1217', 0.68, 0.22);
  const vaneMat = plain('#333c47', 0.42, 0.65);

  return (
    <group position={[0, -1.12, side * 3.32]}>
      {/* Thân vỏ động cơ đôi loft mượt */}
      <mesh geometry={NACELLE_GEO} material={bodyPaint} castShadow receiveShadow />

      {/* Pylon / cổ góp gió biên nối liền lên mặt dưới wing-glove */}
      <mesh position={[-4.65, 0.82, -side * 0.12]} material={bodyPaint} castShadow receiveShadow>
        <boxGeometry args={[9.5, 0.56, 2.05]} />
      </mesh>

      {/* Viền môi cửa hút khí vát chéo 28° + dải mép kim loại mảnh + vách ngăn splitter wedge */}
      <mesh position={[0.26, 0.0, 0]} rotation={[0, 0, -0.48]} material={radomeMat} castShadow>
        <boxGeometry args={[0.34, 1.44, 2.38]} />
      </mesh>
      <mesh position={[0.36, 0.0, 0]} rotation={[0, 0, -0.48]} material={trimMat}>
        <boxGeometry args={[0.06, 1.45, 2.4]} />
      </mesh>
      {[-0.58, 0.58].map((dz, idx) => (
        <group key={idx} position={[0.31, -0.01, dz]}>
          <mesh rotation={[0, 0, -0.48]} material={darkIntake}>
            <boxGeometry args={[0.42, 1.18, 0.96]} />
          </mesh>
          {[-0.28, 0, 0.28].map((vy, vi) => (
            <mesh key={vi} position={[0.08, vy, 0]} rotation={[0.32 * (vi - 1), 0, -0.48]} material={vaneMat}>
              <boxGeometry args={[0.36, 0.04, 0.9]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0.46, 0.02, 0]} rotation={[0, 0, -0.48]} material={radomeMat} castShadow>
        <boxGeometry args={[0.68, 1.34, 0.11]} />
      </mesh>

      <Rivets points={NACELLE_RIVETS} r={0.016} color="#687686" />

      {/* 2 họng phụt F101 trên mỗi pod (tổng cộng 4 họng phụt toàn máy bay) */}
      <EngineNozzleAndPlume zOffset={-0.6} afterburner={ab} />
      <EngineNozzleAndPlume zOffset={0.6} afterburner={ab} />

      {ab > 0.05 && (
        <pointLight position={[-12.3, -0.1, 0]} color="#ff8024" intensity={2.5 * ab} distance={14} decay={2} />
      )}
    </group>
  );
};

const WeaponsBay: React.FC<{
  xCenter: number;
  bayOpen: number;
  bodyPaint: THREE.Material;
}> = ({ xCenter, bayOpen, bodyPaint }) => {
  const open = clamp01(bayOpen);
  const doorAng = open * 1.32;
  const bayInteriorMat = plain('#1c222a', 0.72, 0.35);
  const launcherMat = plain('#737e8a', 0.45, 0.6);
  const bombMat = plain('#54606c', 0.48, 0.38);
  const bandMat = plain('#e0a128', 0.5, 0.2);

  return (
    <group position={[xCenter, 0, 0]}>
      {open > 0.01 && (
        <group position={[0, -0.66, 0]}>
          <mesh position={[BAY_LEN / 2 - 0.06, 0.1, 0]} material={bayInteriorMat}>
            <boxGeometry args={[0.12, 0.78, 1.82]} />
          </mesh>
          <mesh position={[-BAY_LEN / 2 + 0.06, 0.1, 0]} material={bayInteriorMat}>
            <boxGeometry args={[0.12, 0.78, 1.82]} />
          </mesh>
          <mesh position={[0, 0.44, 0]} material={bayInteriorMat}>
            <boxGeometry args={[BAY_LEN, 0.1, 1.84]} />
          </mesh>

          <mesh rotation={[0, 0, Math.PI / 2]} material={launcherMat} castShadow>
            <cylinderGeometry args={[0.22, 0.22, BAY_LEN * 0.88, 16]} />
          </mesh>
          {[0, 1, 2, 3].map((k) => {
            const a = (k / 4) * Math.PI * 2 + 0.4;
            return (
              <group key={k} position={[0, Math.cos(a) * 0.44, Math.sin(a) * 0.44]}>
                <mesh geometry={MUNITION_BODY_GEO} material={bombMat} castShadow />
                <mesh position={[0.75, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={bandMat}>
                  <cylinderGeometry args={[0.173, 0.173, 0.14, 16]} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      <group position={[0, -1.05, 0.94]} rotation={[doorAng, 0, 0]}>
        <mesh geometry={BAY_DOOR_R_GEO} position={[0, -0.07, -0.47]} material={bodyPaint} castShadow receiveShadow />
      </group>
      <group position={[0, -1.05, -0.94]} rotation={[-doorAng, 0, 0]}>
        <mesh geometry={BAY_DOOR_R_GEO} position={[0, -0.07, 0.47]} material={bodyPaint} castShadow receiveShadow />
      </group>
    </group>
  );
};

const LandingGearSystem: React.FC<{ gear: number; bodyPaint: THREE.Material }> = ({ gear, bodyPaint }) => {
  const g = clamp01(gear);
  const strutSteel = plain('#b5bec7', 0.34, 0.72);
  const chromeOleo = plain('#e6eef5', 0.14, 0.92);
  const darkWell = plain('#161b22', 0.8, 0.2);
  const lampMat = plain('#fff8e2', 0.15, 0.1, {
    emissive: new THREE.Color('#ffe5a8'),
    emissiveIntensity: g > 0.6 ? 2.0 : 0,
  });

  const noseBraceGeo = useMemo(
    () =>
      pipe(
        [
          [0.95, 0.05, 0],
          [0.45, -0.48, 0],
          [0.04, -0.92, 0],
        ],
        0.045,
        16,
      ),
    [],
  );

  const mainBraceGeo = useMemo(
    () =>
      pipe(
        [
          [0.88, 0.0, 0],
          [0.42, -0.52, 0],
          [0.04, -0.98, 0],
        ],
        0.06,
        16,
      ),
    [],
  );

  if (g <= 0.015) return null;

  // Khi g = 1:
  //   - Càng mũi tại [13.35, -0.94, 0], trục bánh ở dy = -1.72 => y_axle = -2.66; bán kính r = 0.44 => đáy y = -3.10 m!
  //   - Càng chính tại [-2.95, -0.85, ±1.54], trục bogie ở dy = -1.69 => y_axle = -2.54; bán kính r = 0.56 => đáy y = -3.10 m!
  const noseFold = (1 - g) * 1.48;
  const mainFold = (1 - g) * 1.45;
  const doorOpen = Math.min(1, g * 1.5);

  return (
    <group>
      {/* ---------------- CÀNG ĐÁP MŨI (2 BÁNH ĐÔI, x = +13.35 m) ---------------- */}
      <group position={[13.35, -0.94, 0]}>
        <mesh position={[0.45, 0.02, 0]} material={darkWell}>
          <boxGeometry args={[2.1, 0.16, 0.78]} />
        </mesh>
        {([1, -1] as const).map((s) => (
          <group key={s} position={[0.45, -0.05, s * 0.4]} rotation={[s * doorOpen * 1.38, 0, 0]}>
            <mesh position={[0, -0.02, -s * 0.2]} material={bodyPaint} castShadow>
              <boxGeometry args={[2.08, 0.05, 0.4]} />
            </mesh>
          </group>
        ))}

        <group rotation={[0, 0, noseFold]} scale={[1, 0.35 + 0.65 * g, 1]}>
          <mesh position={[0, -0.55, 0]} material={strutSteel} castShadow>
            <cylinderGeometry args={[0.105, 0.095, 1.1, 18]} />
          </mesh>
          <mesh position={[0, -1.32, 0]} material={chromeOleo} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.7, 16]} />
          </mesh>
          <mesh geometry={noseBraceGeo} material={strutSteel} castShadow />

          {[-0.14, 0.14].map((lz, li) => (
            <mesh key={li} position={[0.13, -0.76, lz]} rotation={[0, 0, Math.PI / 2]} material={lampMat}>
              <cylinderGeometry args={[0.07, 0.08, 0.08, 14]} />
            </mesh>
          ))}

          <mesh position={[0, -1.66, 0]} material={strutSteel} castShadow>
            <boxGeometry args={[0.18, 0.14, 0.56]} />
          </mesh>
          <Wheel r={0.44} width={0.23} tire="#222528" rim="#d3dae2" bolts={8} position={[0, -1.72, 0.24]} />
          <Wheel r={0.44} width={0.23} tire="#222528" rim="#d3dae2" bolts={8} position={[0, -1.72, -0.24]} />
        </group>
      </group>

      {/* ---------------- 2 CÀNG ĐÁP CHÍNH (MỖI BÊN 4 BÁNH BOGIE ĐÔI, x = -2.95 m, z = ±1.54 m) ---------------- */}
      {([1, -1] as const).map((side) => (
        <group key={side} position={[-2.95, -0.85, side * 1.54]}>
          <mesh position={[0.25, -0.02, 0]} material={darkWell}>
            <boxGeometry args={[2.55, 0.18, 1.08]} />
          </mesh>
          <group position={[0.25, -0.1, -side * 0.54]} rotation={[-side * doorOpen * 1.35, 0, 0]}>
            <mesh position={[0, -0.02, side * 0.27]} material={bodyPaint} castShadow>
              <boxGeometry args={[2.52, 0.06, 0.54]} />
            </mesh>
          </group>

          <group rotation={[-side * (1 - g) * 0.18, 0, mainFold]} scale={[1, 0.35 + 0.65 * g, 1]}>
            <mesh position={[0, -0.58, 0]} material={strutSteel} castShadow>
              <cylinderGeometry args={[0.15, 0.135, 1.16, 20]} />
            </mesh>
            <mesh position={[0, -1.32, 0]} material={chromeOleo} castShadow>
              <cylinderGeometry args={[0.11, 0.11, 0.68, 18]} />
            </mesh>
            <mesh geometry={mainBraceGeo} material={strutSteel} castShadow />

            <mesh position={[-0.14, -1.16, 0]} rotation={[0, 0, 0.45]} material={strutSteel}>
              <boxGeometry args={[0.28, 0.05, 0.1]} />
            </mesh>
            <mesh position={[-0.14, -1.36, 0]} rotation={[0, 0, -0.45]} material={strutSteel}>
              <boxGeometry args={[0.28, 0.05, 0.1]} />
            </mesh>

            {/* Dầm cân bằng tandem bogie beam ở dy = -1.69 (y = -2.54 m) */}
            <group position={[0, -1.69, 0]} rotation={[0, 0, -mainFold * 0.65]}>
              <mesh geometry={rbox(1.54, 0.18, 0.24, 0.04)} material={strutSteel} castShadow />
              {[-0.67, 0.67].map((bx) =>
                [-0.31, 0.31].map((bz) => (
                  <Wheel
                    key={`${bx}_${bz}`}
                    r={0.56}
                    width={0.33}
                    tire="#202326"
                    rim="#bfc8d1"
                    bolts={10}
                    position={[bx, 0, bz]}
                  />
                )),
              )}
            </group>
          </group>
        </group>
      ))}
    </group>
  );
};

// ---------------- COMPONENT CHÍNH B1BLancer ----------------
export const B1BLancer: React.FC<B1BLancerProps> = ({
  wingSweep = 0.35,
  afterburner = 0.7,
  gear = 0,
  bayOpen = 0,
}) => {
  const sw = clamp01(wingSweep);
  const ab = clamp01(afterburner);
  const gr = clamp01(gear);
  const bo = clamp01(bayOpen);

  // Vật liệu sơn xám chiến lược USAF Gunship Grey chuẩn yêu cầu
  const gunshipPaint = useMemo(
    () =>
      paint({
        color: PAL3D.b1bGunship,
        camo: PAL3D.b1bCamo,
        repeat: 0.35,
        wear: 0.18,
        dirt: 0.18,
        roughness: 0.58,
        metalness: 0.32,
      }),
    [],
  );

  // Vật liệu chóp mũi Radome & dải hấp thụ radar RAM mép trước tối màu
  const radomeMat = useMemo(() => plain(PAL3D.b1bRadome, 0.46, 0.14), []);
  // Khung viền titan/sealant xám trung tính quanh kính buồng lái, đai radome & tấm trượt khớp cánh low-vis
  const trimSlateMat = useMemo(() => plain('#566370', 0.44, 0.42), []);
  const wingSealMat = useMemo(() => plain('#3d4652', 0.5, 0.36), []);
  // Vạch tiêu chuẩn USAF low-vis ghost grey (vạch tiếp dầu mũi, dải mã hiệu đuôi đứng)
  const lowVisMarkMat = useMemo(() => plain('#768594', 0.54, 0.22), []);
  // Kính buồng lái 4 ô phủ ánh kim vàng-đồng chống chớp nhiệt đặc trưng B-1B Lancer
  const canopyGlass = useMemo(
    () =>
      plain('#4a3c24', 0.11, 0.85, {
        emissive: new THREE.Color('#33250e'),
        emissiveIntensity: 0.28,
      }),
    [],
  );
  const pitotMetal = useMemo(() => plain('#bcc6d0', 0.22, 0.88), []);

  // Góc xoay cụp cánh đối xứng quanh chốt trục Y tại (±4.73 m): 0 rad (15°) -> 52.5° (67.5°)
  const sweepAngle = sw * SWEEP_DELTA_RAD;

  return (
    <group>
      {/* 1. THÂN LIỀN CÁNH CỔ THIÊN NGA (SWAN-NECK BLENDED WING-BODY) + RADOME MŨI & ĐUÔI */}
      <mesh geometry={MAIN_BODY_GEO} material={gunshipPaint} castShadow receiveShadow />
      <mesh geometry={NOSE_RADOME_GEO} material={radomeMat} castShadow receiveShadow />
      <mesh geometry={TAIL_RADOME_GEO} material={radomeMat} castShadow receiveShadow />
      <mesh geometry={RADOME_COLLAR_GEO} material={trimSlateMat} />

      {/* Ống pitot mũi & cặp cảm biến dữ liệu không khí hai bên mũi */}
      <mesh position={[22.18, -0.76, 0]} rotation={[0, 0, -Math.PI / 2]} material={pitotMetal}>
        <coneGeometry args={[0.025, 0.34, 12]} />
      </mesh>
      {([1, -1] as const).map((s) => (
        <mesh key={s} position={[18.8, -0.34, s * 0.94]} rotation={[s * 0.28, 0, -0.35]} material={pitotMetal}>
          <boxGeometry args={[0.26, 0.03, 0.11]} />
        </mesh>
      ))}

      {/* Cửa & vạch dẫn đường tiếp dầu trên không hình chữ H/xương cá đặc trưng trước mũi B-1B */}
      <mesh geometry={REFUEL_DOOR_GEO} material={radomeMat} />
      <mesh geometry={REFUEL_STRIPE_GEO} material={lowVisMarkMat} />
      <mesh geometry={REFUEL_BAR1_GEO} material={lowVisMarkMat} />
      <mesh geometry={REFUEL_BAR2_GEO} material={lowVisMarkMat} />

      {/* 2. BUỒNG LÁI 4 Ô KÍNH TỐI ÁNH KIM VÀNG-ĐỒNG + 2 KÍNH NÓC + VIỀN KHUNG SẮC NÉT */}
      <mesh geometry={WIN_FRAME_R} material={trimSlateMat} />
      <mesh geometry={WIN_FRAME_L} material={trimSlateMat} />
      <mesh geometry={WIN_FRONT_R} material={canopyGlass} />
      <mesh geometry={WIN_FRONT_L} material={canopyGlass} />
      <mesh geometry={WIN_SIDE_R} material={canopyGlass} />
      <mesh geometry={WIN_SIDE_L} material={canopyGlass} />
      <mesh geometry={WIN_BROW_R} material={canopyGlass} />
      <mesh geometry={WIN_BROW_L} material={canopyGlass} />
      <mesh geometry={HATCH_AFT_R} material={trimSlateMat} />
      <mesh geometry={HATCH_AFT_L} material={trimSlateMat} />

      {/* 2 cánh mũi nhỏ chống rung nhiễu động tầng thấp (SMCS Foreplanes / Canards) */}
      <group position={[16.68, -0.22, 1.2]} rotation={[-0.1, 0, -0.05]}>
        <mesh geometry={SMCS_R_GEO} material={gunshipPaint} castShadow receiveShadow />
        <mesh geometry={SMCS_LE_R_GEO} material={radomeMat} />
      </group>
      <group position={[16.68, -0.22, -1.2]} rotation={[0.1, 0, -0.05]}>
        <mesh geometry={SMCS_L_GEO} material={gunshipPaint} castShadow receiveShadow />
        <mesh geometry={SMCS_LE_L_GEO} material={radomeMat} />
      </group>

      {/* Ăng-ten vây lưng khí động vát chéo mảnh trên sống lưng */}
      <mesh geometry={BLADE_ANTENNA_GEO} position={[8.2, 1.33, 0]} material={lowVisMarkMat} castShadow />
      <mesh geometry={BLADE_ANTENNA_GEO} position={[-3.4, 1.63, 0]} material={lowVisMarkMat} castShadow />

      {/* 3. CẶP CÁNH CHÍNH CỤP XÒE BIẾN HÌNH (VARIABLE-SWEEP WINGS) LỒNG TRONG WING-GLOVE */}
      <group position={[WING_PIVOT_X, WING_PIVOT_Y, WING_PIVOT_Z]} rotation={[0, -sweepAngle, 0]}>
        <mesh geometry={WING_R_GEO} material={gunshipPaint} castShadow receiveShadow />
        <mesh geometry={WING_LE_R_GEO} material={radomeMat} castShadow />
        <mesh geometry={WING_SEAL_R_GEO} material={wingSealMat} receiveShadow />
        {[3.6, 7.4, 11.2].map((fz, fi) => (
          <mesh
            key={fi}
            geometry={FLAP_CANOE_GEO}
            position={[-1.45 - fz * TAN15, -0.16 - fz * 0.005, fz]}
            scale={[1 - fi * 0.16, 1 - fi * 0.16, 1 - fi * 0.16]}
            material={gunshipPaint}
            castShadow
          />
        ))}
        <mesh position={[1.15 - 16.17 * TAN15 - 0.25, -0.1, 16.16]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshBasicMaterial color="#35ff7a" toneMapped={false} />
        </mesh>
      </group>

      <group position={[WING_PIVOT_X, WING_PIVOT_Y, -WING_PIVOT_Z]} rotation={[0, sweepAngle, 0]}>
        <mesh geometry={WING_L_GEO} material={gunshipPaint} castShadow receiveShadow />
        <mesh geometry={WING_LE_L_GEO} material={radomeMat} castShadow />
        <mesh geometry={WING_SEAL_L_GEO} material={wingSealMat} receiveShadow />
        {[3.6, 7.4, 11.2].map((fz, fi) => (
          <mesh
            key={fi}
            geometry={FLAP_CANOE_GEO}
            position={[-1.45 - fz * TAN15, -0.16 - fz * 0.005, -fz]}
            scale={[1 - fi * 0.16, 1 - fi * 0.16, 1 - fi * 0.16]}
            material={gunshipPaint}
            castShadow
          />
        ))}
        <mesh position={[1.15 - 16.17 * TAN15 - 0.25, -0.1, -16.16]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshBasicMaterial color="#ff3b30" toneMapped={false} />
        </mesh>
      </group>

      {/* 4. HAI CỤM ĐỘNG CƠ ĐÔI GE F101 DƯỚI GỐC CÁNH SAU (4 CỬA HÚT + 4 HỌNG PHỤT + ĐỐT SAU) */}
      <DualEnginePod
        side={1}
        bodyPaint={gunshipPaint}
        radomeMat={radomeMat}
        trimMat={trimSlateMat}
        afterburner={ab}
      />
      <DualEnginePod
        side={-1}
        bodyPaint={gunshipPaint}
        radomeMat={radomeMat}
        trimMat={trimSlateMat}
        afterburner={ab}
      />

      {/* 5. ĐUÔI ĐỨNG CAO VÚT & ĐUÔI NGANG CHỮ THẬP QUÉT MẠNH (CRUCIFORM SWEPT TAIL, ĐỈNH y = +7.30 m) */}
      <mesh geometry={VTAIL_GEO} material={gunshipPaint} castShadow receiveShadow />
      <mesh geometry={VTAIL_LE_GEO} material={radomeMat} castShadow />
      <mesh geometry={VTAIL_BAND_GEO} material={lowVisMarkMat} />
      <mesh geometry={AFT_CHINE_R_GEO} position={[0, 0.22, 0]} material={gunshipPaint} castShadow receiveShadow />
      <mesh geometry={AFT_CHINE_L_GEO} position={[0, 0.22, 0]} material={gunshipPaint} castShadow receiveShadow />

      {/* Con thoi fairing khớp xoay đuôi ngang chữ thập tại gốc đuôi đứng chuẩn B-1B (y = +1.64 m) */}
      <group position={[0, 1.64, 0]}>
        <mesh geometry={TAIL_BULLET_GEO} material={gunshipPaint} castShadow receiveShadow />
        <mesh position={[-14.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={radomeMat}>
          <coneGeometry args={[0.15, 0.42, 18]} />
        </mesh>
        <group position={[-16.85, -0.08, 0]} rotation={[-0.04, 0, 0]}>
          <mesh geometry={HTAIL_R_GEO} material={gunshipPaint} castShadow receiveShadow />
          <mesh geometry={HTAIL_LE_R_GEO} material={radomeMat} castShadow />
        </group>
        <group position={[-16.85, -0.08, 0]} rotation={[0.04, 0, 0]}>
          <mesh geometry={HTAIL_L_GEO} material={gunshipPaint} castShadow receiveShadow />
          <mesh geometry={HTAIL_LE_L_GEO} material={radomeMat} castShadow />
        </group>
      </group>

      {/* Búp ăng-ten VHF/ECM trên đỉnh cao nhất của đuôi đứng (đỉnh cao tổng cộng +7.30 m, từ đất là 10.40 m) */}
      <group position={[0, 7.16, 0]}>
        <mesh geometry={FIN_CAP_GEO} material={radomeMat} castShadow />
        <mesh position={[-22.06, 0.04, 0]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshBasicMaterial color="#fff3d6" toneMapped={false} />
        </mesh>
      </group>

      {/* 6. HAI KHOANG VŨ KHÍ XOAY CSRL DƯỚI BỤNG (MỞ THEO bayOpen 0..1) */}
      <WeaponsBay xCenter={6.8} bayOpen={bo} bodyPaint={gunshipPaint} />
      <WeaponsBay xCenter={-7.3} bayOpen={bo} bodyPaint={gunshipPaint} />

      {/* 7. HỆ THỐNG CÀNG ĐÁP THU MỞ 10 BÁNH (gear 0..1, bánh chạm chuẩn y = -3.10 m khi gear = 1) */}
      <LandingGearSystem gear={gr} bodyPaint={gunshipPaint} />
    </group>
  );
};

// Component bàn xoay: nâng trục thân lên y = +3.10 m để toàn bộ 10 bánh xe chạm đúng mặt sàn y = 0,
// wingSweep = 0.35 (góc quét cơ động uy lực), afterburner = 0.7, gear = 1.
const B1BLancerTurntable: React.FC = () => (
  <group position={[0, B1B_GROUND_Y, 0]}>
    <B1BLancer wingSweep={0.35} afterburner={0.7} gear={1} bayOpen={0} />
  </group>
);

export const MODELS: ModelSet = {
  B1BLancer: {
    C: B1BLancerTurntable,
    size: 44,
    center: [0, 4.3, 0],
  },
};
