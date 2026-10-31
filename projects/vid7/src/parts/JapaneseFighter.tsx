// Tiêm kích đánh chặn Nhật Bản A6M2 Zero / Ki-43 Hayabusa (1942) — tỷ lệ thật 1:1 (mũi +X, đỉnh +Y, cánh phải +Z).
// Kích thước chuẩn: dài 9.06 m (x: -4.40..+4.66), sải cánh 12.00 m (z: -6.00..+6.00), cao 3.05 m (bánh chạm y=0 khi gear=1).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { turntable } from '@skill/military/3d/turntable';
import { extrude, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets, Wheel } from '@skill/military/3d/parts';
import { PAINT } from '../design/palette';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type JapaneseFighterProps = {
  scheme?: 'grey' | 'green';
  propSpin?: number;
  propFast?: boolean;
  gear?: number;
  damage?: number;
  seed?: number;
};

// Trục dọc thân (thrust line) ở y = 1.54 m để khi gear = 1 bánh chính chạm đúng y = 0.00 m và đỉnh đuôi đứng đạt đúng y = 3.05 m.
const FUSE_Y = 1.54;
const FUSE_SCALE_Y = 1.08;
const FUSE_SCALE_Z = 0.96;
const DIHEDRAL_RAD = (5.5 * Math.PI) / 180;

// Biên dạng bán kính thân (30 trạm mượt dọc trục X từ chóp đuôi x=-4.36 tới vách động cơ x=+3.14).
const FUSE_STATIONS: P2[] = [
  [0.012, -4.36],
  [0.045, -4.24],
  [0.082, -4.06],
  [0.122, -3.84],
  [0.165, -3.58],
  [0.208, -3.30],
  [0.252, -3.00],
  [0.295, -2.68],
  [0.338, -2.35],
  [0.379, -2.02],
  [0.417, -1.68],
  [0.452, -1.34],
  [0.483, -1.00],
  [0.511, -0.66],
  [0.535, -0.32],
  [0.555, 0.02],
  [0.571, 0.36],
  [0.582, 0.70],
  [0.589, 1.04],
  [0.593, 1.38],
  [0.594, 1.72],
  [0.591, 2.04],
  [0.586, 2.34],
  [0.580, 2.62],
  [0.573, 2.86],
  [0.567, 3.04],
  [0.562, 3.12],
  [0.480, 3.14],
  [0.220, 3.15],
  [0.005, 3.15],
];

/** Nội suy bán kính cơ sở của thân theo x để dán phù hiệu Hinomaru ôm sát mặt cong. */
function fuseBaseRadius(x: number): number {
  if (x <= FUSE_STATIONS[0][1]) return FUSE_STATIONS[0][0];
  for (let i = 0; i < FUSE_STATIONS.length - 1; i++) {
    const [r0, x0] = FUSE_STATIONS[i];
    const [r1, x1] = FUSE_STATIONS[i + 1];
    if (x <= x1) {
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return r0 + (r1 - r0) * t;
    }
  }
  return 0.56;
}

/**
 * Tiện nửa trên hoặc nửa dưới dọc +X.
 * Đường phân cách sơn hạ xuống góc wrapDrop (0.38 rad ~ 22° dưới đường tâm thân, ngang đúng gốc cánh y ≈ 1.32 m)
 * giống hệt thực tế sơn ngụy trang xanh rêu / bụng xám của tiêm kích Nhật A6M2 & Ki-43.
 */
function halfLatheX(
  profile: P2[],
  seg: number,
  half: 'top' | 'bottom',
  scaleY = 1,
  scaleZ = 1,
  wrapDrop = 0.38,
): THREE.BufferGeometry {
  const phiStart = half === 'bottom' ? wrapDrop : Math.PI - wrapDrop;
  const phiLength = half === 'bottom' ? Math.PI - wrapDrop * 2 : Math.PI + wrapDrop * 2;
  const g = new THREE.LatheGeometry(
    profile.map(([r, x]) => new THREE.Vector2(Math.max(r, 0.0005), x)),
    seg,
    phiStart,
    phiLength,
  );
  g.rotateZ(-Math.PI / 2);
  if (scaleY !== 1 || scaleZ !== 1) {
    g.scale(1, scaleY, scaleZ);
    g.computeVertexNormals();
  }
  return g;
}

// ---------- Hình học khí động cánh chính (sải đúng 12.00 m: z = -6.00..+6.00, dihedral 5.5°) ----------
function wingPlanform(absZ: number): { xLE: number; xTE: number; thick: number; yMid: number } {
  const z = clamp(absZ, 0.36, 6.0);
  let xLE: number;
  let xTE: number;
  let thick: number;

  if (z <= 5.42) {
    const t = clamp((z - 0.45) / (5.42 - 0.45), 0, 1);
    // Cánh A6M2 thuôn đều, thêm bầu fillet nhẹ sát gốc cánh
    const fillet = z < 0.95 ? Math.pow((0.95 - z) / 0.59, 2) * 0.28 : 0;
    xLE = 2.48 + (1.84 - 2.48) * t;
    xTE = 0.18 + (0.68 - 0.18) * t - fillet;
    thick = 0.29 + (0.105 - 0.29) * t;
  } else {
    // Đầu mút cánh bo elip mượt từ z = 5.42 tới đúng z = 6.00 m
    const s = clamp((z - 5.42) / (6.0 - 5.42), 0, 1);
    const ell = Math.sqrt(Math.max(0, 1 - s * s));
    const xCenter = 1.29 + 0.05 * s;
    const halfChord = 0.58 * ell;
    xLE = xCenter + halfChord;
    xTE = xCenter - halfChord;
    thick = 0.105 * ell;
  }

  const yMid = 1.12 + Math.max(0, z - 0.52) * Math.tan(DIHEDRAL_RAD);
  return { xLE, xTE, thick, yMid };
}

/** Biên dạng NACA có độ khum nhẹ (u = 0 ở mép trước LE, u = 1 ở mép sau TE). */
function airfoilOffset(u: number): { camber: number; halfT: number } {
  const uc = clamp(u, 0, 1);
  const camber = 0.11 * Math.sin(Math.PI * Math.pow(uc, 0.85));
  const halfT =
    0.5 *
    (1.4845 * Math.sqrt(uc) - 0.63 * uc - 1.758 * uc * uc + 1.4215 * Math.pow(uc, 3) - 0.518 * Math.pow(uc, 4));
  return { camber, halfT: Math.max(0, halfT) };
}

/** Tính chính xác cao độ mặt trên / mặt dưới cánh tại (x, absZ) để dán Hinomaru không bao giờ lún hay hở. */
function wingSurfaceY(x: number, absZ: number, face: 'top' | 'bottom'): number {
  const { xLE, xTE, thick, yMid } = wingPlanform(absZ);
  const chord = Math.max(0.04, xLE - xTE);
  const u = clamp((xLE - x) / chord, 0, 1);
  const { camber, halfT } = airfoilOffset(u);
  return yMid + thick * (camber + (face === 'top' ? halfT : -halfT));
}

function buildMainWingSurface(side: 1 | -1, face: 'top' | 'bottom'): THREE.BufferGeometry {
  // 24 trạm theo sải cánh (tập trung dày ở fillet gốc và đầu mút bo tròn z=5.42..6.00)
  const zStations = [
    0.36, 0.52, 0.72, 0.95, 1.35, 1.85, 2.4, 2.95, 3.5, 4.05, 4.55, 5.0, 5.3, 5.42,
    5.52, 5.62, 5.71, 5.79, 5.86, 5.91, 5.95, 5.98, 5.995, 6.0,
  ];
  const nSpan = zStations.length - 1;
  const nChord = 18;

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= nSpan; i++) {
    const az = zStations[i];
    const { xLE, xTE, thick, yMid } = wingPlanform(az);
    for (let j = 0; j <= nChord; j++) {
      const theta = (j / nChord) * Math.PI;
      const u = 0.5 * (1 - Math.cos(theta));
      const x = xLE - (xLE - xTE) * u;
      const { camber, halfT } = airfoilOffset(u);
      const y = yMid + thick * (camber + (face === 'top' ? halfT : -halfT));
      const z = side * az;
      pos.push(x, y, z);
      // UV theo mét thực để đồng bộ repeat với extrude
      uvs.push(x, z);
    }
  }

  const row = nChord + 1;
  const flip = (side === 1 && face === 'top') || (side === -1 && face === 'bottom');
  for (let i = 0; i < nSpan; i++) {
    for (let j = 0; j < nChord; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + (j + 1);
      const d = i * row + (j + 1);
      if (flip) {
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

// ---------- Đuôi ngang (sải 4.56 m: z = -2.28..+2.28, đặt tại y = 1.58 m) ----------
function hTailPlanform(absZ: number): { xLE: number; xTE: number; thick: number } {
  const z = clamp(absZ, 0.14, 2.28);
  if (z <= 1.98) {
    const t = (z - 0.14) / (1.98 - 0.14);
    return {
      xLE: -2.92 + (-3.28 - -2.92) * t,
      xTE: -4.16 + (-4.04 - -4.16) * t,
      thick: 0.12 + (0.055 - 0.12) * t,
    };
  }
  const s = clamp((z - 1.98) / (2.28 - 1.98), 0, 1);
  const ell = Math.sqrt(Math.max(0, 1 - s * s));
  const xc = -3.66 - 0.03 * s;
  const hc = 0.38 * ell;
  return { xLE: xc + hc, xTE: xc - hc, thick: 0.055 * ell };
}

function buildHTailSurface(side: 1 | -1, face: 'top' | 'bottom'): THREE.BufferGeometry {
  const zStations = [0.14, 0.45, 0.85, 1.25, 1.65, 1.98, 2.08, 2.16, 2.22, 2.26, 2.28];
  const nSpan = zStations.length - 1;
  const nChord = 14;
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= nSpan; i++) {
    const az = zStations[i];
    const { xLE, xTE, thick } = hTailPlanform(az);
    for (let j = 0; j <= nChord; j++) {
      const u = 0.5 * (1 - Math.cos((j / nChord) * Math.PI));
      const x = xLE - (xLE - xTE) * u;
      const halfT =
        0.5 *
        (1.4845 * Math.sqrt(u) - 0.63 * u - 1.758 * u * u + 1.4215 * Math.pow(u, 3) - 0.518 * Math.pow(u, 4));
      const y = 1.58 + thick * (face === 'top' ? halfT : -halfT);
      const z = side * az;
      pos.push(x, y, z);
      uvs.push(x, z);
    }
  }

  const row = nChord + 1;
  const flip = (side === 1 && face === 'top') || (side === -1 && face === 'bottom');
  for (let i = 0; i < nSpan; i++) {
    for (let j = 0; j < nChord; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + (j + 1);
      const d = i * row + (j + 1);
      if (flip) idx.push(a, d, b, b, d, c);
      else idx.push(a, b, d, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------- Đuôi đứng + bánh lái hướng A6M2 (đỉnh đúng y = 3.05 m, mép sau tới đúng x = -4.40 m) ----------
function vTailPlanform(y: number): { xLE: number; xTE: number; thick: number } {
  const yc = clamp(y, 1.58, 3.05);
  if (yc <= 2.84) {
    const t = (yc - 1.58) / (2.84 - 1.58);
    // Gờ fillet lưng gọn thanh thoát kiểu Mitsubishi A6M2, mép sau bánh lái hướng bầu tròn tới đúng x = -4.40 m
    const dorsalFillet = yc < 1.84 ? Math.pow((1.84 - yc) / 0.26, 2) * 0.25 : 0;
    const xLE = -2.96 + (-3.56 - -2.96) * t + dorsalFillet;
    const rudderBelly = Math.sin(Math.PI * clamp((yc - 1.58) / 1.34, 0, 1)) * 0.13;
    const xTE = -4.27 - rudderBelly + 0.11 * t * t;
    const thick = 0.13 + (0.062 - 0.13) * t;
    return { xLE, xTE, thick };
  }
  const s = clamp((yc - 2.84) / (3.05 - 2.84), 0, 1);
  const ell = Math.sqrt(Math.max(0, 1 - s * s));
  const xc = -3.86 - 0.02 * s;
  const hc = 0.30 * ell;
  return { xLE: xc + hc, xTE: xc - hc, thick: 0.062 * ell };
}

function buildVTailGeometry(): THREE.BufferGeometry {
  const yStations = [1.58, 1.68, 1.8, 1.94, 2.12, 2.32, 2.52, 2.7, 2.82, 2.9, 2.96, 3.01, 3.04, 3.05];
  const nSpan = yStations.length - 1;
  const nChord = 14;
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (const side of [1, -1] as const) {
    const base = pos.length / 3;
    for (let i = 0; i <= nSpan; i++) {
      const y = yStations[i];
      const { xLE, xTE, thick } = vTailPlanform(y);
      for (let j = 0; j <= nChord; j++) {
        const u = 0.5 * (1 - Math.cos((j / nChord) * Math.PI));
        const x = xLE - (xLE - xTE) * u;
        const halfT =
          0.5 *
          (1.4845 * Math.sqrt(u) - 0.63 * u - 1.758 * u * u + 1.4215 * Math.pow(u, 3) - 0.518 * Math.pow(u, 4));
        const z = side * thick * halfT;
        pos.push(x, y, z);
        uvs.push(x, y);
      }
    }
    const row = nChord + 1;
    for (let i = 0; i < nSpan; i++) {
      for (let j = 0; j < nChord; j++) {
        const a = base + i * row + j;
        const b = base + (i + 1) * row + j;
        const c = base + (i + 1) * row + (j + 1);
        const d = base + i * row + (j + 1);
        // i tăng theo +Y, j tăng theo -X => (+Y) x (-X) = +Z (pháp tuyến hướng sang phải +Z)
        if (side === 1) idx.push(a, b, d, b, c, d);
        else idx.push(a, d, b, b, d, c);
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

// ---------- Vòm kính buồng lái giọt nước nhiều khung nan (Greenhouse Canopy) ----------
function canopyProfile(x: number): { yBase: number; height: number; halfWidth: number } {
  // Trải dài từ x = +0.42 (đuôi vòm kính) tới x = +2.56 (chân kính chắn gió trước)
  const t = clamp((x - 0.42) / (2.56 - 0.42), 0, 1);
  const yBase = 2.02 + 0.08 * Math.sin(Math.PI * Math.pow(t, 0.75));
  let height: number;
  if (x >= 2.05) {
    // Kính chắn gió nghiêng khí động từ x=2.56 lên x=2.05
    const s = (2.56 - x) / (2.56 - 2.05);
    height = 0.42 * Math.pow(clamp(s, 0, 1), 0.78);
  } else if (x >= 1.45) {
    // Đỉnh khoang lái
    const s = (x - 1.45) / (2.05 - 1.45);
    height = 0.39 + 0.035 * Math.sin(Math.PI * s);
  } else {
    // Phần kính sau vuốt thuôn giọt nước về sống lưng
    const s = (x - 0.42) / (1.45 - 0.42);
    height = 0.39 * Math.pow(clamp(s, 0, 1), 0.72);
  }
  const widthFactor = x >= 2.05
    ? 0.42 + 0.58 * Math.pow((2.56 - x) / 0.51, 0.65)
    : 0.32 + 0.68 * Math.pow(clamp((x - 0.42) / 1.25, 0, 1), 0.55);
  return { yBase, height, halfWidth: 0.355 * Math.min(1, widthFactor) };
}

function buildCanopyGlass(): THREE.BufferGeometry {
  const nX = 22;
  const nA = 16;
  const pos: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= nX; i++) {
    const x = 0.42 + (i / nX) * (2.56 - 0.42);
    const { yBase, height, halfWidth } = canopyProfile(x);
    for (let j = 0; j <= nA; j++) {
      // alpha từ -PI/2 (-Z trái) qua 0 (đỉnh +Y) tới +PI/2 (+Z phải)
      const alpha = -Math.PI / 2 + (j / nA) * Math.PI;
      const y = yBase + Math.cos(alpha) * height;
      const z = Math.sin(alpha) * halfWidth;
      pos.push(x, y, z);
    }
  }

  const row = nA + 1;
  for (let i = 0; i < nX; i++) {
    for (let j = 0; j < nA; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + (j + 1);
      const d = i * row + (j + 1);
      // i tăng theo +X, j tăng từ -Z sang +Z => (+X) x (+Z) = -Y, nên đảo chiều để pháp tuyến hướng ra ngoài (+Y)
      idx.push(a, d, b, b, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------- Phù hiệu Hinomaru (vành trắng + đĩa đỏ KHÔNG chồng mặt, ôm sát bề mặt cong ±0.013 m) ----------
function buildConformedAnnulus(
  rInner: number,
  rOuter: number,
  seg: number,
  mapPoint: (u: number, v: number) => [number, number, number],
  flipWinding: boolean,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];

  if (rInner <= 0.0001) {
    // Đĩa tròn đặc có thêm vòng trung gian để bám sát độ cong mặt cánh / mặt thân
    const rMid = rOuter * 0.55;
    const c = mapPoint(0, 0);
    pos.push(c[0], c[1], c[2]);
    for (let ring = 0; ring < 2; ring++) {
      const rad = ring === 0 ? rMid : rOuter;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const p = mapPoint(Math.cos(a) * rad, Math.sin(a) * rad);
        pos.push(p[0], p[1], p[2]);
      }
    }
    for (let i = 0; i < seg; i++) {
      const a = 1 + i;
      const b = 1 + i + 1;
      if (flipWinding) idx.push(0, b, a);
      else idx.push(0, a, b);
    }
    const ring2 = 1 + (seg + 1);
    for (let i = 0; i < seg; i++) {
      const a = 1 + i;
      const b = 1 + i + 1;
      const c2 = ring2 + i + 1;
      const d = ring2 + i;
      if (flipWinding) idx.push(a, b, d, b, c2, d);
      else idx.push(a, d, b, b, d, c2);
    }
  } else {
    // Vành khuyên viền trắng tách rời hoàn toàn khỏi đĩa đỏ (không chồng polygon -> không bao giờ z-fighting từ xa)
    for (let ring = 0; ring < 2; ring++) {
      const rad = ring === 0 ? rInner : rOuter;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const p = mapPoint(Math.cos(a) * rad, Math.sin(a) * rad);
        pos.push(p[0], p[1], p[2]);
      }
    }
    const ring2 = seg + 1;
    for (let i = 0; i < seg; i++) {
      const a = i;
      const b = i + 1;
      const c2 = ring2 + i + 1;
      const d = ring2 + i;
      if (flipWinding) idx.push(a, b, d, b, c2, d);
      else idx.push(a, d, b, b, d, c2);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export const JapaneseFighter: React.FC<JapaneseFighterProps> = ({
  scheme = 'grey',
  propSpin = 0,
  propFast = false,
  gear = 0,
  damage = 0,
  seed = 7,
}) => {
  const gearP = clamp(gear, 0, 1);
  const dmg = clamp(damage, 0, 1);

  // ---------- Vật liệu ----------
  const mats = useMemo(() => {
    const isGreen = scheme === 'green';
    const upperMat = paint({
      color: isGreen ? PAINT.ijaGreen : PAINT.ijaGreyGreen,
      camo: isGreen ? ['#354835', '#4c6149'] : ['#838e80', '#99a495'],
      repeat: 0.42,
      wear: 0.26,
      dirt: 0.18,
      roughness: 0.52,
      metalness: 0.16,
      seed,
    });
    const lowerMat = paint({
      color: PAINT.ijaGreyGreen,
      camo: ['#828d7f', '#9aa496'],
      repeat: 0.42,
      wear: 0.2,
      dirt: 0.22,
      roughness: 0.54,
      metalness: 0.16,
      seed: seed + 11,
    });
    const cowlMat = paint({
      color: '#19212c',
      camo: ['#121821', '#232e3d'],
      repeat: 0.8,
      wear: 0.28,
      dirt: 0.18,
      roughness: 0.36,
      metalness: 0.48,
      seed: seed + 23,
    });
    const spinnerMat = plain('#b9c1c6', 0.28, 0.78);
    const propBladeMat = plain('#2c2421', 0.42, 0.45);
    const hinomaruMat = plain(PAINT.hinomaruRed, 0.44, 0.08);
    const whiteBorderMat = plain('#eef0ea', 0.48, 0.06);
    const glassMat = plain(PAINT.cockpitGlass, 0.14, 0.15, { transparent: true, opacity: 0.5 });
    const interiorMat = plain('#3c4637', 0.75, 0.2);
    const engineMetal = plain('#2a2e33', 0.48, 0.68);
    const gunMetal = plain('#1f2326', 0.36, 0.75);
    const exhaustMat = plain('#543a2c', 0.78, 0.35);
    const oleoChrome = plain('#d4dbe0', 0.18, 0.88);
    const scorchMat = plain('#141312', 0.94, 0.05);
    const emberMat = new THREE.MeshStandardMaterial({
      color: '#ff6418',
      emissive: '#ff4d0a',
      emissiveIntensity: 2.4,
      roughness: 0.4,
    });
    const blurDiscMat = new THREE.MeshStandardMaterial({
      color: '#35393d',
      transparent: true,
      opacity: 0.24,
      roughness: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const blurRingMat = new THREE.MeshStandardMaterial({
      color: PAINT.hinomaruRed,
      transparent: true,
      opacity: 0.32,
      roughness: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return {
      upperMat,
      lowerMat,
      cowlMat,
      spinnerMat,
      propBladeMat,
      hinomaruMat,
      whiteBorderMat,
      glassMat,
      interiorMat,
      engineMetal,
      gunMetal,
      exhaustMat,
      oleoChrome,
      scorchMat,
      emberMat,
      blurDiscMat,
      blurRingMat,
    };
  }, [scheme, seed]);

  // ---------- Hình học chính (cache qua useMemo) ----------
  const geos = useMemo(() => {
    const fuseTop = halfLatheX(FUSE_STATIONS, 36, 'top', FUSE_SCALE_Y, FUSE_SCALE_Z);
    const fuseBot = halfLatheX(FUSE_STATIONS, 36, 'bottom', FUSE_SCALE_Y, FUSE_SCALE_Z);

    // Vỏ động cơ radial Nakajima Sakae 12 (x = +3.08..+4.28 m)
    const cowlProfile: P2[] = [
      [0.608, 3.08],
      [0.600, 3.20],
      [0.594, 3.23],
      [0.606, 3.36],
      [0.616, 3.54],
      [0.618, 3.72],
      [0.610, 3.88],
      [0.590, 4.01],
      [0.558, 4.11],
      [0.512, 4.19],
      [0.456, 4.245],
      [0.398, 4.275],
      [0.352, 4.28],
      [0.332, 4.25],
      [0.325, 3.92],
      [0.120, 3.92],
    ];
    const cowling = lathe(cowlProfile, 36);

    // Hốc hút gió bộ chế hoà khí trên đỉnh vỏ động cơ (x = +3.38..+4.10)
    const scoop = extrude(
      [
        [3.35, 0.56],
        [4.08, 0.53],
        [4.12, 0.63],
        [4.04, 0.69],
        [3.68, 0.695],
        [3.34, 0.63],
      ],
      0.19,
      0.03,
    );

    // Chóp spinner khí động (x = +4.25..+4.66 -> mũi máy bay dừng đúng tại x = +4.66 m)
    const spinnerPts: P2[] = Array.from({ length: 18 }, (_, i) => {
      const t = i / 17;
      const x = 4.25 + t * 0.41;
      const r = 0.235 * Math.pow(Math.max(0, 1 - Math.pow(t, 1.48)), 0.64) + 0.004;
      return [r, x];
    });
    const spinner = lathe(spinnerPts, 32);

    // Lá cánh quạt Sumitomo 3 lá (dài 1.38 m tính từ trục, đầu mút tròn, xoắn góc đón gió)
    const blade = extrude(
      [
        [0.08, -0.045],
        [0.32, -0.075],
        [0.72, -0.105],
        [1.10, -0.095],
        [1.31, -0.068],
        [1.39, -0.025],
        [1.41, 0.015],
        [1.36, 0.062],
        [1.12, 0.092],
        [0.70, 0.095],
        [0.30, 0.065],
        [0.08, 0.042],
      ],
      0.026,
      0.008,
    );

    // Cánh chính trái/phải chia mặt trên & mặt dưới
    const wingRT = buildMainWingSurface(1, 'top');
    const wingRB = buildMainWingSurface(1, 'bottom');
    const wingLT = buildMainWingSurface(-1, 'top');
    const wingLB = buildMainWingSurface(-1, 'bottom');

    // Đuôi ngang & đuôi đứng
    const hTailRT = buildHTailSurface(1, 'top');
    const hTailRB = buildHTailSurface(1, 'bottom');
    const hTailLT = buildHTailSurface(-1, 'top');
    const hTailLB = buildHTailSurface(-1, 'bottom');
    const vTail = buildVTailGeometry();

    // Kính buồng lái & các nan khung buồng lái greenhouse
    const canopyGlass = buildCanopyGlass();
    const hoopXs = [0.76, 1.08, 1.42, 1.74, 2.05, 2.32];
    const canopyHoops = hoopXs.map((hx) => {
      const { yBase, height, halfWidth } = canopyProfile(hx);
      const pts: [number, number, number][] = Array.from({ length: 15 }, (_, k) => {
        const a = -Math.PI / 2 + (k / 14) * Math.PI;
        return [hx, yBase + Math.cos(a) * (height + 0.008), Math.sin(a) * (halfWidth + 0.008)];
      });
      return pipe(pts, 0.012, 24);
    });
    const spineFrame = pipe(
      Array.from({ length: 14 }, (_, k) => {
        const x = 0.45 + (k / 13) * (2.05 - 0.45);
        const { yBase, height } = canopyProfile(x);
        return [x, yBase + height + 0.009, 0] as [number, number, number];
      }),
      0.012,
      24,
    );
    const sideRails = ([-1, 1] as const).flatMap((side) =>
      [0.0, 0.48].map((aNorm) => {
        const alpha = side * (Math.PI / 2 - aNorm);
        return pipe(
          Array.from({ length: 16 }, (_, k) => {
            const x = 0.46 + (k / 15) * (2.52 - 0.46);
            const { yBase, height, halfWidth } = canopyProfile(x);
            return [
              x,
              yBase + Math.cos(alpha) * (height + 0.008),
              Math.sin(alpha) * (halfWidth + 0.008),
            ] as [number, number, number];
          }),
          0.011,
          24,
        );
      }),
    );

    // Thùng dầu phụ giọt nước dưới bụng (x = +0.62..+2.42 m)
    const dropTankPts: P2[] = Array.from({ length: 24 }, (_, i) => {
      const t = i / 23;
      const x = -0.9 + t * 1.8;
      // Giọt nước bầu phía trước (+X), vuốt nhọn phía sau (-X)
      const r = 0.215 * Math.sin(Math.PI * Math.pow(t, 0.62)) * (0.86 + 0.24 * t) + 0.003;
      return [r, x];
    });
    const dropTank = lathe(dropTankPts, 28);

    // ---------- Phù hiệu Hinomaru trên/dưới 2 cánh (z = ±3.42 m, x = +1.37 m, R = 0.66 m) ----------
    const wXc = 1.37;
    const wZc = 3.42;
    const wROut = 0.66;
    const wRRed = 0.60;

    const makeWingDecal = (side: 1 | -1, face: 'top' | 'bottom', rIn: number, rOut: number) =>
      buildConformedAnnulus(
        rIn,
        rOut,
        36,
        (dx, dz) => {
          const x = wXc + dx;
          const absZ = wZc + dz;
          const ySurf = wingSurfaceY(x, absZ, face);
          const offset = face === 'top' ? 0.013 : -0.013;
          return [x, ySurf + offset, side * absZ];
        },
        face === 'top' ? side === 1 : side === -1,
      );

    const wingHino = ([-1, 1] as const).flatMap((side) =>
      (['top', 'bottom'] as const).map((face) => ({
        key: `w${side}${face}`,
        red: makeWingDecal(side, face, 0, wRRed),
        white: makeWingDecal(side, face, wRRed, wROut),
      })),
    );

    // ---------- Phù hiệu Hinomaru hai bên thân sau (x = -1.24 m, y = 1.56 m, R = 0.37 m) ----------
    const fXc = -1.24;
    const fYc = FUSE_Y + 0.02;
    const fROut = 0.38;
    const fRRed = 0.34;

    const makeFuseDecal = (side: 1 | -1, rIn: number, rOut: number) =>
      buildConformedAnnulus(
        rIn,
        rOut,
        32,
        (dx, dy) => {
          const x = fXc + dx;
          const y = fYc + dy;
          const rBase = fuseBaseRadius(x);
          const ry = rBase * FUSE_SCALE_Y;
          const rz = rBase * FUSE_SCALE_Z;
          const normY = clamp((y - FUSE_Y) / Math.max(0.05, ry), -0.96, 0.96);
          const zSurf = rz * Math.sqrt(Math.max(0.04, 1 - normY * normY));
          return [x, y, side * (zSurf + 0.013)];
        },
        side === -1,
      );

    const fuseHino = ([-1, 1] as const).map((side) => ({
      key: `f${side}`,
      red: makeFuseDecal(side, 0, fRRed),
      white: makeFuseDecal(side, fRRed, fROut),
    }));

    // Đai trắng chỉ huy quanh thân sau (x = -2.42..-2.18) ôm sát mặt thân +0.009 m
    const tailBandPts: P2[] = [
      [fuseBaseRadius(-2.42) + 0.009, -2.42],
      [fuseBaseRadius(-2.18) + 0.009, -2.18],
    ];
    const tailBand = lathe(tailBandPts, 36).clone();
    tailBand.scale(1, FUSE_SCALE_Y, FUSE_SCALE_Z);

    // Dây ăng-ten mảnh từ đỉnh cột radio tới đầu mút đuôi đứng
    const antennaWire = pipe(
      [
        [1.14, 2.93, 0],
        [-1.3, 2.97, 0],
        [-3.74, 3.01, 0],
      ],
      0.0055,
      16,
    );

    // Đinh tán dọc nắp động cơ & khớp gốc cánh
    const rivetPts: [number, number, number][] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      rivetPts.push([
        3.11,
        FUSE_Y + Math.sin(a) * 0.565 * FUSE_SCALE_Y,
        Math.cos(a) * 0.565 * FUSE_SCALE_Z,
      ]);
    }

    return {
      fuseTop,
      fuseBot,
      cowling,
      scoop,
      spinner,
      blade,
      wingRT,
      wingRB,
      wingLT,
      wingLB,
      hTailRT,
      hTailRB,
      hTailLT,
      hTailLB,
      vTail,
      canopyGlass,
      canopyHoops,
      spineFrame,
      sideRails,
      dropTank,
      wingHino,
      fuseHino,
      tailBand,
      antennaWire,
      rivetPts,
    };
  }, []);

  // Góc gập càng đáp chính vào bụng cánh (gear=1 -> 0 rad thẳng đứng, bánh chạm đúng y=0; gear=0 -> gập vào trong 89°)
  const gearFoldRad = (1 - gearP) * (Math.PI * 0.495);

  return (
    <group>
      {/* 1. Thân khí động 2 nửa trên/dưới mượt 30 trạm */}
      <group position={[0, FUSE_Y, 0]}>
        <mesh geometry={geos.fuseTop} material={mats.upperMat} castShadow receiveShadow />
        <mesh geometry={geos.fuseBot} material={mats.lowerMat} castShadow receiveShadow />
      </group>
      <mesh position={[0, FUSE_Y, 0]} geometry={geos.tailBand} material={mats.whiteBorderMat} />
      <Rivets points={geos.rivetPts} r={0.012} color="#6f786c" />

      {/* 2. Vỏ động cơ radial Nakajima Sakae đen ánh xanh + cụm 14 xi-lanh & ống xả */}
      <group position={[0, FUSE_Y, 0]}>
        <mesh geometry={geos.cowling} material={mats.cowlMat} castShadow receiveShadow />
        <mesh geometry={geos.scoop} material={mats.cowlMat} castShadow />

        {/* Hộp trục khuỷu + 7 xi-lanh hàng trước nhìn thấy qua cửa hút mũi */}
        <mesh position={[3.98, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.engineMetal}>
          <cylinderGeometry args={[0.15, 0.17, 0.24, 18]} />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2 + 0.22;
          return (
            <group key={i} position={[4.02, 0, 0]} rotation={[a, 0, 0]}>
              <mesh position={[0, 0.24, 0]} material={mats.engineMetal}>
                <cylinderGeometry args={[0.058, 0.052, 0.18, 12]} />
              </mesh>
              <mesh position={[0.04, 0.2, 0.02]} material={mats.oleoChrome}>
                <cylinderGeometry args={[0.008, 0.008, 0.16, 6]} />
              </mesh>
            </group>
          );
        })}

        {/* 2 nòng súng máy đồng bộ Type 97 7.7mm trên lưng nắp động cơ */}
        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[3.62, 0.545, s * 0.17]}
            rotation={[0, 0, Math.PI / 2]}
            material={mats.gunMetal}
          >
            <cylinderGeometry args={[0.017, 0.017, 0.42, 10]} />
          </mesh>
        ))}

        {/* Ống xả kép nhô ra ở khe lá gió đuôi cowling */}
        {([-1, 1] as const).flatMap((s) =>
          [-0.14, -0.26].map((yy, k) => (
            <mesh
              key={`${s}_${k}`}
              position={[3.08, yy, s * 0.555]}
              rotation={[0, -s * 0.28, Math.PI / 2]}
              material={mats.exhaustMat}
            >
              <cylinderGeometry args={[0.028, 0.032, 0.22, 10]} />
            </mesh>
          )),
        )}
      </group>

      {/* 3. Chóp Spinner & Cánh quạt 3 lá (x = +4.25..+4.66 m) */}
      <group position={[0, FUSE_Y, 0]} rotation={[propSpin, 0, 0]}>
        <mesh geometry={geos.spinner} material={mats.spinnerMat} castShadow />
        {[0, 1, 2].map((i) => {
          const ang = (i * Math.PI * 2) / 3;
          return (
            <group key={i} position={[4.38, 0, 0]} rotation={[ang, 0, 0]}>
              {/* Xoay lá cánh quạt dựng dọc theo bán kính và nghiêng góc pitch 22° */}
              <group rotation={[0.38, 0, Math.PI / 2]}>
                {!propFast && (
                  <>
                    <mesh geometry={geos.blade} material={mats.propBladeMat} castShadow />
                    {/* Vạch cảnh báo đỏ đầu cánh quạt chuẩn Hải quân Nhật */}
                    <mesh position={[1.22, 0, 0]} material={mats.hinomaruMat}>
                      <boxGeometry args={[0.08, 0.145, 0.03]} />
                    </mesh>
                  </>
                )}
              </group>
            </group>
          );
        })}
        {propFast && (
          <group position={[4.38, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={mats.blurDiscMat}>
              <circleGeometry args={[1.41, 40]} />
            </mesh>
            <mesh position={[0, 0, 0.003]} material={mats.blurRingMat}>
              <ringGeometry args={[1.17, 1.27, 40]} />
            </mesh>
          </group>
        )}
      </group>

      {/* 4. Khoang lái, phi công Nhật & nắp kính giọt nước nhiều khung nan */}
      <group>
        {/* Sàn tối khoang lái, tựa đầu bọc giáp, máy ngắm quang học Type 98 & phi công */}
        <mesh position={[1.62, 2.02, 0]} geometry={rbox(1.22, 0.12, 0.56, 0.03)} material={mats.interiorMat} />
        <mesh position={[1.32, 2.22, 0]} geometry={rbox(0.08, 0.28, 0.26, 0.03)} material={mats.interiorMat} />
        <mesh position={[2.12, 2.18, 0]} geometry={rbox(0.14, 0.1, 0.07, 0.015)} material={mats.gunMetal} />
        {/* Phi công (thân áo bay nâu + mũ bay da) */}
        <mesh position={[1.56, 2.13, 0]} geometry={rbox(0.28, 0.26, 0.3, 0.08)} material={plain('#4c3828', 0.85)} />
        <mesh position={[1.58, 2.31, 0]} material={plain('#3b291c', 0.75)}>
          <sphereGeometry args={[0.105, 14, 12]} />
        </mesh>
        <mesh position={[1.66, 2.32, 0]} geometry={rbox(0.06, 0.045, 0.15, 0.015)} material={plain('#8ca6b5', 0.2, 0.5)} />

        {/* Vòm kính & hệ nan khung sơn đồng màu thân trên */}
        <mesh geometry={geos.canopyGlass} material={mats.glassMat} />
        <mesh geometry={geos.spineFrame} material={mats.upperMat} />
        {geos.canopyHoops.map((hg, idx) => (
          <mesh key={idx} geometry={hg} material={mats.upperMat} />
        ))}
        {geos.sideRails.map((rg, idx) => (
          <mesh key={idx} geometry={rg} material={mats.upperMat} />
        ))}

        {/* Cột ăng-ten vô tuyến nghiêng về trước + dây ăng-ten kéo tới đỉnh đuôi đứng */}
        <mesh
          position={[1.17, 2.68, 0]}
          rotation={[0, 0, -0.14]}
          geometry={rbox(0.035, 0.54, 0.018, 0.008)}
          material={mats.upperMat}
          castShadow
        />
        <mesh geometry={geos.antennaWire} material={mats.gunMetal} />
      </group>

      {/* 5. Cánh chính thấp dihedral 5.5° (sải cánh đúng 12.00 m) + pháo 20mm Type 99 + ống Pitot + đèn hiệu */}
      <mesh geometry={geos.wingRT} material={mats.upperMat} castShadow receiveShadow />
      <mesh geometry={geos.wingRB} material={mats.lowerMat} castShadow receiveShadow />
      <mesh geometry={geos.wingLT} material={mats.upperMat} castShadow receiveShadow />
      <mesh geometry={geos.wingLB} material={mats.lowerMat} castShadow receiveShadow />

      {([-1, 1] as const).map((s) => {
        const yCannon = 1.12 + (2.05 - 0.52) * Math.tan(DIHEDRAL_RAD) + 0.02;
        const yTip = 1.12 + (5.96 - 0.52) * Math.tan(DIHEDRAL_RAD);
        return (
          <group key={s}>
            {/* Pháo cánh 20mm Type 99 */}
            <mesh
              position={[2.42, yCannon, s * 2.05]}
              rotation={[0, 0, Math.PI / 2]}
              material={mats.gunMetal}
              castShadow
            >
              <cylinderGeometry args={[0.022, 0.026, 0.44, 10]} />
            </mesh>
            {/* Đèn vị trí đầu cánh (trái đỏ, phải xanh lục) */}
            <mesh
              position={[1.38, yTip, s * 5.97]}
              material={plain(s === -1 ? '#e0352b' : '#28b88a', 0.25, 0.1)}
            >
              <sphereGeometry args={[0.032, 10, 8]} />
            </mesh>
          </group>
        );
      })}
      {/* Ống đo tốc độ Pitot ở cánh trái */}
      <mesh
        position={[2.22, 1.12 + (4.35 - 0.52) * Math.tan(DIHEDRAL_RAD), -4.35]}
        rotation={[0, 0, Math.PI / 2]}
        material={mats.oleoChrome}
      >
        <cylinderGeometry args={[0.011, 0.015, 0.58, 8]} />
      </mesh>

      {/* 6. Đuôi ngang & đuôi đứng thanh thoát (cao đúng 3.05 m, mép bánh lái tới đúng x = -4.40 m) */}
      <mesh geometry={geos.hTailRT} material={mats.upperMat} castShadow receiveShadow />
      <mesh geometry={geos.hTailRB} material={mats.lowerMat} castShadow receiveShadow />
      <mesh geometry={geos.hTailLT} material={mats.upperMat} castShadow receiveShadow />
      <mesh geometry={geos.hTailLB} material={mats.lowerMat} castShadow receiveShadow />
      <mesh geometry={geos.vTail} material={mats.upperMat} castShadow receiveShadow />

      {/* 7. Thùng dầu phụ giọt nước dưới bụng (x = +0.62..+2.42) */}
      <group position={[1.52, 0.81, 0]}>
        <mesh geometry={geos.dropTank} material={mats.lowerMat} castShadow receiveShadow />
        {[-0.28, 0.34].map((dx, k) => (
          <group key={k} position={[dx, 0.21, 0]}>
            <mesh rotation={[0.42, 0, 0]} position={[0, 0, 0.09]} geometry={rbox(0.05, 0.18, 0.025, 0.008)} material={mats.gunMetal} />
            <mesh rotation={[-0.42, 0, 0]} position={[0, 0, -0.09]} geometry={rbox(0.05, 0.18, 0.025, 0.008)} material={mats.gunMetal} />
          </group>
        ))}
      </group>

      {/* 8. Càng đáp chính co duỗi theo gear (0..1) — khi gear=1 bánh xe r=0.30 chạm đúng y = 0.00 m */}
      {([-1, 1] as const).map((s) => (
        <group
          key={s}
          position={[1.78, 1.12, s * 1.48]}
          rotation={[s * gearFoldRad, 0, 0]}
        >
          {/* Ống giảm chấn chính + ty thủy lực mạ crôm */}
          <mesh position={[0, -0.32, 0]} material={mats.gunMetal} castShadow>
            <cylinderGeometry args={[0.042, 0.038, 0.56, 12]} />
          </mesh>
          <mesh position={[0, -0.64, 0]} material={mats.oleoChrome} castShadow>
            <cylinderGeometry args={[0.028, 0.028, 0.38, 12]} />
          </mesh>
          {/* Kéo chống xoay (torque link) */}
          <mesh position={[-0.06, -0.56, 0]} rotation={[0, 0, 0.45]} geometry={rbox(0.025, 0.16, 0.03, 0.006)} material={mats.gunMetal} />
          <mesh position={[-0.06, -0.67, 0]} rotation={[0, 0, -0.45]} geometry={rbox(0.025, 0.16, 0.03, 0.006)} material={mats.gunMetal} />
          {/* Tấm nắp che càng gắn sát mặt ngoài chân càng */}
          <mesh
            position={[0.01, -0.42, s * 0.072]}
            geometry={rbox(0.32, 0.78, 0.022, 0.01)}
            material={mats.lowerMat}
            castShadow
          />
          {/* Bánh xe chính r = 0.30 m tại tâm y_local = -0.82 => chạm đúng y = 1.12 - 0.82 - 0.30 = 0.00 m */}
          <Wheel
            r={0.30}
            width={0.17}
            tire="#232425"
            rim="#49504b"
            bolts={6}
            position={[0, -0.82, -s * 0.05]}
          />
        </group>
      ))}

      {/* Bánh đuôi nhỏ & móc hãm đà tàu sân bay dưới chóp đuôi */}
      <group position={[-3.76, 1.42 - gearP * 0.26, 0]}>
        <mesh position={[0, 0.12, 0]} rotation={[0, 0, -0.28]} material={mats.gunMetal}>
          <cylinderGeometry args={[0.018, 0.018, 0.26, 8]} />
        </mesh>
        {gearP > 0.08 && (
          <Wheel r={0.095} width={0.065} tire="#232425" rim="#525852" bolts={4} position={[-0.04, 0, 0]} />
        )}
      </group>
      <mesh position={[-3.52, 1.38, 0]} rotation={[0, 0, 0.12]} geometry={rbox(0.62, 0.024, 0.024, 0.008)} material={mats.gunMetal} />

      {/* 9. Phù hiệu Hinomaru đỏ viền trắng mỏng (4 trên/dưới cánh + 2 bên thân sau, không z-fighting) */}
      {geos.wingHino.map((h) => (
        <group key={h.key}>
          <mesh geometry={h.white} material={mats.whiteBorderMat} />
          <mesh geometry={h.red} material={mats.hinomaruMat} />
        </group>
      ))}
      {geos.fuseHino.map((h) => (
        <group key={h.key}>
          <mesh geometry={h.white} material={mats.whiteBorderMat} />
          <mesh geometry={h.red} material={mats.hinomaruMat} />
        </group>
      ))}

      {/* 10. Trạng thái trúng đạn .50 cal cháy xém quanh động cơ & gốc cánh (damage = 0..1 ở Yokohama) */}
      {dmg > 0.02 && (
        <group>
          {/* Vệt khói dầu cháy đen kéo dọc hai bên cowling về gốc cánh */}
          {([-1, 1] as const).map((s) => (
            <group key={s}>
              <mesh
                position={[2.45, FUSE_Y - 0.06, s * 0.56]}
                rotation={[0, -s * 0.04, -0.05]}
                scale={[0.55 + dmg * 0.65, 0.5 + dmg * 0.5, 1]}
                geometry={rbox(1.65, 0.42, 0.03, 0.015)}
                material={mats.scorchMat}
              />
              <mesh
                position={[1.75, 1.32, s * 1.15]}
                rotation={[s * DIHEDRAL_RAD, 0.14 * s, 0]}
                scale={[0.5 + dmg * 0.6, 1, 0.5 + dmg * 0.6]}
                geometry={rbox(0.95, 0.03, 0.68, 0.015)}
                material={mats.scorchMat}
              />
            </group>
          ))}
          {/* Lửa than hồng âm ỉ trong khe lá gió động cơ & gốc cánh trái khi trúng đạn nặng */}
          {dmg > 0.3 && (
            <>
              <mesh position={[3.14, FUSE_Y + 0.08, -0.48]} material={mats.emberMat}>
                <sphereGeometry args={[0.11 + dmg * 0.09, 10, 8]} />
              </mesh>
              <mesh position={[3.18, FUSE_Y - 0.16, 0.46]} material={mats.emberMat}>
                <sphereGeometry args={[0.09 + dmg * 0.07, 10, 8]} />
              </mesh>
              <mesh position={[2.02, 1.28, -1.05]} material={mats.emberMat}>
                <sphereGeometry args={[0.08 + dmg * 0.08, 10, 8]} />
              </mesh>
            </>
          )}
        </group>
      )}
    </group>
  );
};

export const preview = turntable(
  () => <JapaneseFighter scheme="green" gear={1} propSpin={0.5} />,
  { size: 12.2, center: [0, 1.5, 0] },
);

export default JapaneseFighter;
