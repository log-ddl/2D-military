// No. 23 Nitto Maru (第二十三日東丸) — Tàu đánh cá Nhật 70 tấn cải hoán tàu tuần tiễu vũ trang (18/04/1942)
// Quy ước hệ trục 1:1 mét thật: Dài 30.0 m (x: -15.0..+15.0), rộng 5.8 m (z: -2.9..+2.9),
// mớn nước y = 0, đáy chìm y = -2.8 m, boong giữa +2.4 m, mũi vểnh cao chắn sóng bão +4.2 m.
// Điểm nhận diện: sơn xám IJN bạc màu gió muối, số "23" trắng hai bên mũi, buồng lái cửa kính vuông sáng ấm
// (wheelhouseGlow), ống khói nhỏ sau buồng lái, pháo/súng mũi, 2 cột ăng-ten vô tuyến cao ~11 m nối dây pipe,
// cờ Hải quân Đế quốc Nhật phía lái, và biến thể vỡ cháy / nứt tan theo damage (0..1).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT } from '../design/palette';

export type NittoMaruProps = {
  /** Mức độ trúng đạn 6-inch: 0 nguyên vẹn; >0.3 vỡ vỏ cháy đen & gãy cột; >0.7 thân nứt đôi mảnh văng */
  damage?: number;
  /** Bật ánh sáng đèn ấm trong buồng lái & phòng điện đài khi thủy thủ Nhật lao vào phát tin về Tokyo */
  wheelhouseGlow?: boolean;
};

const L = 30.0;
const HALF_L = 15.0;
const HALF_BEAM = 2.9; // rộng 5.8 m
const DRAFT = -2.8;
const SPLIT_U = 0.56; // vị trí vết nứt gãy đôi thân tàu (x ≈ +1.8 m) khi damage > 0.7

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth01 = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Độ cao mép boong chính (sheer line) của tàu đánh cá viễn dương Bắc Thái Bình Dương */
function trawlerSheerY(u: number): number {
  // Đuôi +2.92 m -> boong làm việc giữa tàu +2.40 m -> vểnh cao vọt lên +4.22 m ở mũi chắn sóng 30 ft
  const sternRise = 0.52 * Math.pow(clamp((0.32 - u) / 0.32, 0, 1), 1.65);
  const bowRise = 1.82 * Math.pow(clamp((u - 0.44) / 0.56, 0, 1), 1.62);
  return 2.4 + sternRise + bowRise;
}

/** Độ cao đỉnh be chắn sóng thép (bulwark rail) bao quanh boong */
function bulwarkTopY(u: number): number {
  const sheer = trawlerSheerY(u);
  const h = lerp(0.48, 0.3, smooth01((u - 0.68) / 0.32));
  return sheer + h;
}

/** Biên dạng sống mũi vát cao (raked trawler stem) */
function xStemAtY(y: number): number {
  if (y >= 0) {
    const t = clamp(y / 4.52, 0, 1);
    return lerp(13.45, HALF_L, Math.pow(t, 0.85));
  }
  const t = clamp(-y / 2.8, 0, 1);
  return lerp(13.45, 11.4, Math.pow(t, 1.65));
}

/** Biên dạng đuôi bầu tàu đánh cá Nhật (counter/cruiser trawler stern) */
function xSternAtY(y: number): number {
  if (y >= 0.15) {
    const t = clamp((y - 0.15) / 3.25, 0, 1);
    return lerp(-14.35, -HALF_L, Math.pow(t, 0.78));
  }
  const t = clamp((0.15 - y) / 2.95, 0, 1);
  return lerp(-14.35, -12.6, Math.pow(t, 1.25));
}

/** Nửa chiều rộng thân tàu z >= 0 theo vị trí dọc u (0..1) và độ cao y (-2.8..bulwark) */
function trawlerHalfBeam(u: number, y: number): number {
  if (u >= 0.9995) return 0;

  let wlPlan = 1.0;
  if (u > 0.52) {
    const tb = (u - 0.52) / 0.48;
    wlPlan = Math.pow(Math.max(0, 1 - Math.pow(tb, 1.58)), 0.9);
  } else if (u < 0.28) {
    const ts = (0.28 - u) / 0.28;
    wlPlan = Math.pow(Math.max(0, 1 - 0.72 * Math.pow(ts, 1.8)), 0.85);
  }

  const topY = bulwarkTopY(u);
  if (y >= 0) {
    const ty = clamp(y / Math.max(topY, 0.1), 0, 1);
    const bowFactor = smooth01((u - 0.52) / 0.45);
    const flare = bowFactor * Math.pow(ty, 0.85) * 0.72 * (1 - Math.pow(u, 6));
    const sternFlare = smooth01((0.22 - u) / 0.22) * Math.pow(ty, 0.9) * 0.22;
    const baseZ = HALF_BEAM * wlPlan + flare + sternFlare;
    const tipFade = u > 0.955 ? Math.cos(((u - 0.955) / 0.045) * (Math.PI * 0.5)) : 1;
    return Math.max(0, baseZ * tipFade);
  }

  const d = clamp(-y / 2.8, 0, 1);
  const bowPinch = smooth01((u - 0.58) / 0.42);
  const sternSkeg = smooth01((0.22 - u) / 0.22);
  const midFull = clamp(1 - 0.65 * bowPinch - 0.75 * sternSkeg, 0, 1);
  const bilgeCurve = Math.pow(Math.max(0, 1 - Math.pow(d, lerp(1.55, 2.7, midFull))), 0.62);
  const keelThick = 0.07 * (1 - bowPinch * 0.6);
  return Math.max(keelThick * (1 - u * 0.2), HALF_BEAM * wlPlan * bilgeCurve * (1 - 0.68 * sternSkeg * d));
}

/** Dựng dải vỏ tàu trong đoạn [u0, u1] */
function buildTrawlerBand(
  u0: number,
  u1: number,
  nu: number,
  ns: number,
  yLowFn: (u: number) => number,
  yHighFn: (u: number) => number,
  closeBottom = false,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const UV_SCALE = 1 / 3.6;
  const rows = ns + 1 + (closeBottom ? 1 : 0);

  for (let side = 0; side < 2; side++) {
    const sign = side === 0 ? 1 : -1;
    const baseVertex = pos.length / 3;

    for (let i = 0; i <= nu; i++) {
      const u = lerp(u0, u1, i / nu);
      const yLow = yLowFn(u);
      const yHigh = yHighFn(u);

      if (closeBottom) {
        const xKeel = lerp(xSternAtY(yLow), xStemAtY(yLow), u);
        pos.push(xKeel, yLow, 0);
        uv.push(xKeel * UV_SCALE, (yLow - 1.2) * UV_SCALE);
      }

      for (let j = 0; j <= ns; j++) {
        const s = j / ns;
        const y = lerp(yLow, yHigh, s);
        const x = lerp(xSternAtY(y), xStemAtY(y), u);
        const z = trawlerHalfBeam(u, y) * sign;
        pos.push(x, y, z);
        uv.push(x * UV_SCALE, (y + Math.abs(z) * 0.5) * UV_SCALE);
      }
    }

    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < rows - 1; j++) {
        const p00 = baseVertex + i * rows + j;
        const p10 = baseVertex + (i + 1) * rows + j;
        const p01 = baseVertex + i * rows + (j + 1);
        const p11 = baseVertex + (i + 1) * rows + (j + 1);
        if (sign > 0) {
          idx.push(p00, p10, p11, p00, p11, p01);
        } else {
          idx.push(p00, p11, p10, p00, p01, p11);
        }
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Dựng mặt boong gỗ lượn theo sheer line */
function buildTrawlerDeckGeo(u0: number, u1: number, nu: number, nz: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const UV_SCALE = 1 / 2.8;
  const cols = nz + 1;

  for (let i = 0; i <= nu; i++) {
    const u = lerp(u0, u1, i / nu);
    const forecastleLift = 0.24 * smooth01((u - 0.71) / 0.06);
    const yDeck = trawlerSheerY(u) + forecastleLift;
    const x = lerp(xSternAtY(yDeck), xStemAtY(yDeck), u);
    const b = Math.max(0, trawlerHalfBeam(u, yDeck) - 0.04);
    for (let k = 0; k <= nz; k++) {
      const f = (k / nz) * 2 - 1;
      const camber = 0.09 * (1 - f * f) * (b / HALF_BEAM);
      pos.push(x, yDeck + camber, f * b);
      uv.push(x * UV_SCALE, f * b * UV_SCALE);
    }
  }

  for (let i = 0; i < nu; i++) {
    for (let k = 0; k < nz; k++) {
      const p00 = i * cols + k;
      const p10 = (i + 1) * cols + k;
      const p01 = i * cols + (k + 1);
      const p11 = (i + 1) * cols + (k + 1);
      idx.push(p00, p01, p11, p00, p11, p10);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Dựng vách đuôi tròn khép kín tại u = 0 */
function buildSternCapGeo(yMin: number, yMax: number, ny = 8, nz = 8): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cols = nz + 1;

  for (let j = 0; j <= ny; j++) {
    const y = lerp(yMin, yMax, j / ny);
    const x = xSternAtY(y);
    const b = trawlerHalfBeam(0, y);
    for (let k = 0; k <= nz; k++) {
      const f = (k / nz) * 2 - 1;
      const curveAft = -0.32 * (1 - f * f) * (b / HALF_BEAM);
      pos.push(x + curveAft, y, f * b);
      uv.push(f * b * 0.25, y * 0.25);
    }
  }

  for (let j = 0; j < ny; j++) {
    for (let k = 0; k < nz; k++) {
      const p00 = j * cols + k;
      const p01 = j * cols + (k + 1);
      const p10 = (j + 1) * cols + k;
      const p11 = (j + 1) * cols + (k + 1);
      idx.push(p00, p01, p11, p00, p11, p10);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Chữ số sơn trắng "23" kiểu stencil Hải quân Đế quốc Nhật 1942 (vát cạnh chéo chuẩn quân sự, đọc thuận cả 2 mạn) */
const HullNumber23: React.FC<{ mat: THREE.Material }> = ({ mat }) => {
  const { geo2, geo3 } = useMemo(() => {
    // Biên dạng chữ số "2" vát góc hải quân (cao 0.96 m, rộng 0.64 m)
    const p2: P2[] = [
      [-0.31, 0.28],
      [-0.17, 0.47],
      [0.18, 0.47],
      [0.32, 0.32],
      [0.32, 0.1],
      [-0.12, -0.31],
      [0.32, -0.31],
      [0.32, -0.47],
      [-0.32, -0.47],
      [-0.32, -0.3],
      [0.14, 0.13],
      [0.14, 0.27],
      [0.08, 0.32],
      [-0.1, 0.32],
      [-0.16, 0.22],
    ];
    // Biên dạng chữ số "3" vát góc hải quân (cao 0.96 m, rộng 0.64 m)
    const p3: P2[] = [
      [-0.3, 0.31],
      [-0.17, 0.47],
      [0.18, 0.47],
      [0.31, 0.33],
      [0.31, 0.11],
      [0.2, 0.01],
      [0.32, -0.11],
      [0.32, -0.33],
      [0.18, -0.47],
      [-0.18, -0.47],
      [-0.31, -0.32],
      [-0.16, -0.25],
      [-0.1, -0.32],
      [0.1, -0.32],
      [0.15, -0.26],
      [0.15, -0.13],
      [0.09, -0.07],
      [-0.08, -0.07],
      [-0.08, 0.08],
      [0.08, 0.08],
      [0.14, 0.14],
      [0.14, 0.26],
      [0.09, 0.32],
      [-0.1, 0.32],
      [-0.16, 0.24],
    ];
    return {
      geo2: extrude(p2, 0.04, 0.005),
      geo3: extrude(p3, 0.04, 0.005),
    };
  }, []);

  return (
    <group>
      <mesh position={[-0.44, 0, 0]} geometry={geo2} material={mat} />
      <mesh position={[0.44, 0, 0]} geometry={geo3} material={mat} />
    </group>
  );
};

/** Quân kỳ Hải quân Đế quốc Nhật (Húc Nhật Kỳ 16 tia đỏ trên nền vải trắng ngà) tung bay phía lái */
const IJNEnsignFlag: React.FC<{ clothMat: THREE.Material; redMat: THREE.Material }> = ({ clothMat, redMat }) => {
  const sunX = -0.68;
  const rays = useMemo(() => {
    const arr: { ang: number; len: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const dx = Math.cos(ang) > 0 ? 0.62 : 1.05;
      const dy = 0.54;
      const len = Math.min(dx / Math.max(Math.abs(Math.cos(ang)), 0.15), dy / Math.max(Math.abs(Math.sin(ang)), 0.15));
      arr.push({ ang, len: clamp(len, 0.42, 1.02) });
    }
    return arr;
  }, []);

  return (
    <group rotation={[0.04, 0.14, 0]}>
      <mesh position={[-0.92, 0, 0]} geometry={rbox(1.84, 1.16, 0.032, 0.008)} material={clothMat} castShadow />
      <mesh position={[sunX, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={redMat}>
        <cylinderGeometry args={[0.26, 0.26, 0.042, 20]} />
      </mesh>
      {rays.map((r, idx) => (
        <group key={idx} position={[sunX, 0, 0]} rotation={[0, 0, r.ang]}>
          <mesh position={[r.len * 0.52, 0, 0]} geometry={rbox(r.len * 0.92, 0.068, 0.038, 0.005)} material={redMat} />
        </group>
      ))}
    </group>
  );
};

/** Khẩu pháo / súng máy hạng nặng hải quân Nhật trên bệ mũi tàu */
const BowDeckGun: React.FC<{
  position: [number, number, number];
  steelMat: THREE.Material;
  darkMat: THREE.Material;
}> = ({ position, steelMat, darkMat }) => {
  const barrelGeo = useMemo(
    () =>
      lathe(
        [
          [0.095, 0],
          [0.09, 0.45],
          [0.068, 0.95],
          [0.052, 1.72],
          [0.072, 1.84],
          [0.035, 1.84],
        ],
        16,
      ),
    [],
  );

  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} material={steelMat} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.16, 18]} />
      </mesh>
      <mesh position={[0, 0.56, 0]} material={steelMat} castShadow>
        <cylinderGeometry args={[0.2, 0.36, 0.85, 14]} />
      </mesh>
      <group position={[0.16, 1.06, 0]} rotation={[0, 0, 0.22]}>
        <mesh geometry={rbox(0.08, 0.88, 1.02, 0.02)} material={steelMat} castShadow />
      </group>
      <group position={[0, 1.05, 0]} rotation={[0, 0, 0.12]}>
        <mesh position={[-0.12, 0, 0]} geometry={rbox(0.62, 0.28, 0.26, 0.04)} material={darkMat} castShadow />
        <mesh position={[-0.08, 0.24, 0.06]} geometry={rbox(0.28, 0.24, 0.22, 0.03)} material={steelMat} />
        <mesh position={[-0.56, -0.04, -0.14]} geometry={rbox(0.38, 0.12, 0.06, 0.02)} material={darkMat} />
        <mesh position={[-0.56, -0.04, 0.14]} geometry={rbox(0.38, 0.12, 0.06, 0.02)} material={darkMat} />
        <mesh position={[0.14, 0.02, 0]} geometry={barrelGeo} material={darkMat} castShadow />
      </group>
    </group>
  );
};

// Danh sách mảnh văng tất định khi tàu bị 938 viên đạn 6-inch bắn tan (damage > 0.7)
const SHRAPNEL_SPECS: {
  base: [number, number, number];
  vel: [number, number, number];
  spin: [number, number, number];
  size: [number, number, number];
  wood?: boolean;
}[] = Array.from({ length: 26 }, (_, i) => {
  const s1 = Math.sin(i * 17.3 + 1.1);
  const s2 = Math.cos(i * 29.7 + 2.4);
  const s3 = Math.sin(i * 43.1 + 0.7);
  return {
    base: [lerp(-7.5, 8.5, (i % 9) / 8) + s1 * 0.8, 2.3 + Math.abs(s2) * 2.2, s3 * 2.1],
    vel: [s1 * 6.5, 3.2 + Math.abs(s2) * 7.4, (s3 >= 0 ? 1 : -1) * (2.4 + Math.abs(s3) * 6.8)],
    spin: [s2 * 3.4, s1 * 2.8, s3 * 3.9],
    size: [0.65 + Math.abs(s1) * 1.45, 0.1 + Math.abs(s2) * 0.16, 0.42 + Math.abs(s3) * 0.95],
    wood: i % 3 === 1,
  };
});

export const NittoMaru: React.FC<NittoMaruProps> = ({
  damage = 0,
  wheelhouseGlow = false,
}) => {
  const d = clamp(damage, 0, 1);
  const isDamaged = d > 0.3;
  const dMid = clamp((d - 0.3) / 0.7, 0, 1);
  const isShattered = d > 0.7;
  const dBreak = clamp((d - 0.7) / 0.3, 0, 1);

  // Vật liệu sắt/gỗ sơn xám đậm IJN bạc màu gió muối & rỉ sét (wear: 0.4, dirt: 0.45, sơn mờ biển khơi)
  const mats = useMemo(
    () => ({
      ijnHull: paint({
        color: PAINT.ijnGrey,
        camo: ['#4d565b', '#717b80'],
        camoScale: 1.45,
        wear: 0.4,
        dirt: 0.45,
        roughness: 0.74,
        metalness: 0.16,
        repeat: 0.38,
        seed: 23,
      }),
      underwaterRed: paint({
        color: PAINT.antiFoulingRed,
        camo: ['#581f1c', '#7a332d'],
        camoScale: 1.5,
        wear: 0.32,
        dirt: 0.44,
        roughness: 0.78,
        metalness: 0.12,
        repeat: 0.38,
        seed: 25,
      }),
      bootBlack: plain('#1a1e22', 0.8, 0.1),
      deckWood: paint({
        color: PAINT.ijnDeckWood,
        camo: ['#826341', '#ad8b62'],
        camoScale: 2.2,
        wear: 0.35,
        dirt: 0.44,
        roughness: 0.86,
        metalness: 0.04,
        repeat: 0.45,
        seed: 24,
      }),
      cabinTimber: paint({
        color: '#5b656b',
        camo: ['#4c555a', '#6e787e'],
        camoScale: 1.8,
        wear: 0.38,
        dirt: 0.38,
        roughness: 0.74,
        metalness: 0.16,
        repeat: 0.42,
        seed: 26,
      }),
      woodTrim: paint({
        color: '#6b4f36',
        wear: 0.28,
        dirt: 0.36,
        roughness: 0.82,
        metalness: 0.05,
        repeat: 0.6,
        seed: 27,
      }),
      mastSpar: paint({
        color: '#646c70',
        wear: 0.35,
        dirt: 0.34,
        roughness: 0.7,
        metalness: 0.2,
        repeat: 0.5,
        seed: 28,
      }),
      darkSteel: plain('#282f36', 0.48, 0.5),
      sootBlack: plain('#16181b', 0.9, 0.12),
      stencilWhite: paint({
        color: '#edf2f5',
        wear: 0.22,
        dirt: 0.22,
        roughness: 0.75,
        metalness: 0.05,
        repeat: 1,
        seed: 29,
      }),
      porcelainWhite: plain('#e6eaec', 0.3, 0.08),
      glassCold: plain('#1d2e3a', 0.16, 0.3),
      glassWarm: plain('#ffc864', 0.2, 0.0, {
        emissive: new THREE.Color('#ff9826'),
        emissiveIntensity: 2.55,
      }),
      cabinCoreWarm: plain('#ffe4a3', 0.3, 0.0, {
        emissive: new THREE.Color('#ffab36'),
        emissiveIntensity: 3.15,
      }),
      cabinCoreDark: plain('#111920', 0.9, 0.05),
      flagCloth: plain('#efeae0', 0.82, 0.02),
      flagRed: plain(PAINT.hinomaruRed, 0.76, 0.04),
      navPortRed: plain('#c9322b', 0.35, 0.1),
      navStbdGreen: plain('#2b8c56', 0.35, 0.1),
      bronzeProp: plain('#98763b', 0.4, 0.74),
      rustStreak: plain('#683824', 0.88, 0.1),
      charBlack: plain('#161514', 0.94, 0.08),
      emberHot: plain('#ff7b1c', 0.3, 0.0, {
        emissive: new THREE.Color('#ff5900'),
        emissiveIntensity: 2.8,
      }),
    }),
    [],
  );

  const geos = useMemo(() => {
    // 1. Thân tàu nguyên khối
    const fullUnder = buildTrawlerBand(0, 1, 54, 10, () => DRAFT, () => 0.14, true);
    const fullBoot = buildTrawlerBand(0, 1, 54, 2, () => 0.14, () => 0.34, false);
    const fullFreeboard = buildTrawlerBand(0, 1, 54, 10, () => 0.34, bulwarkTopY, false);
    const fullDeck = buildTrawlerDeckGeo(0, 1, 54, 10);

    // 2. Thân tàu nứt gãy đôi tại SPLIT_U
    const aftUnder = buildTrawlerBand(0, SPLIT_U, 30, 10, () => DRAFT, () => 0.14, true);
    const aftBoot = buildTrawlerBand(0, SPLIT_U, 30, 2, () => 0.14, () => 0.34, false);
    const aftFreeboard = buildTrawlerBand(0, SPLIT_U, 30, 10, () => 0.34, bulwarkTopY, false);
    const aftDeck = buildTrawlerDeckGeo(0, SPLIT_U, 30, 10);

    const bowUnder = buildTrawlerBand(SPLIT_U, 1, 26, 10, () => DRAFT, () => 0.14, true);
    const bowBoot = buildTrawlerBand(SPLIT_U, 1, 26, 2, () => 0.14, () => 0.34, false);
    const bowFreeboard = buildTrawlerBand(SPLIT_U, 1, 26, 10, () => 0.34, bulwarkTopY, false);
    const bowDeck = buildTrawlerDeckGeo(SPLIT_U, 1, 26, 10);

    const sternUpper = buildSternCapGeo(0.34, bulwarkTopY(0), 6, 8);
    const sternBoot = buildSternCapGeo(0.14, 0.34, 2, 6);
    const sternUnder = buildSternCapGeo(-0.85, 0.14, 3, 6);

    // Gờ giảm chấn chạy dọc mạn tàu (rubbing strake / fender wale) & tay vịn đỉnh be chắn sóng (cap rail)
    const rubPtsStbd: [number, number, number][] = [];
    const rubPtsPort: [number, number, number][] = [];
    const railPtsStbd: [number, number, number][] = [];
    const railPtsPort: [number, number, number][] = [];
    for (let i = 0; i <= 28; i++) {
      const u = lerp(0.02, 0.985, i / 28);
      const yr = trawlerSheerY(u) - 0.08;
      const xr = lerp(xSternAtY(yr), xStemAtY(yr), u);
      const zr = trawlerHalfBeam(u, yr) + 0.025;
      rubPtsStbd.push([xr, yr, zr]);
      rubPtsPort.push([xr, yr, -zr]);

      const yt = bulwarkTopY(u);
      const xt = lerp(xSternAtY(yt), xStemAtY(yt), u);
      const zt = trawlerHalfBeam(u, yt);
      railPtsStbd.push([xt, yt, zt]);
      railPtsPort.push([xt, yt, -zt]);
    }
    const rubStrakeStbd = pipe(rubPtsStbd, 0.055, 40);
    const rubStrakePort = pipe(rubPtsPort, 0.055, 40);
    const capRailStbd = pipe(railPtsStbd, 0.045, 40);
    const capRailPort = pipe(railPtsPort, 0.045, 40);

    // 3. Tọa độ & góc nghiêng loe của mũi tàu để ốp số "23" và mỏ neo mũi khớp khít 100% lên mặt vỏ
    const sampleBowSurface = (uSample: number, ySample: number, offsetOut = 0.02) => {
      const xS = lerp(xSternAtY(ySample), xStemAtY(ySample), uSample);
      const zS = trawlerHalfBeam(uSample, ySample) + offsetOut;
      const uA = uSample - 0.03;
      const uB = uSample + 0.03;
      const xA = lerp(xSternAtY(ySample), xStemAtY(ySample), uA);
      const xB = lerp(xSternAtY(ySample), xStemAtY(ySample), uB);
      const zA = trawlerHalfBeam(uA, ySample);
      const zB = trawlerHalfBeam(uB, ySample);
      const yaw = Math.atan2(zA - zB, xB - xA);
      const zLow = trawlerHalfBeam(uSample, ySample - 0.35);
      const zHigh = trawlerHalfBeam(uSample, ySample + 0.35);
      const flare = Math.atan2(zHigh - zLow, 0.7);
      return { x: xS, y: ySample, z: zS, yaw, flare };
    };

    const numPose = sampleBowSurface(0.842, 2.96, 0.022);
    const anchorPose = sampleBowSurface(0.928, 3.48, 0.03);
    const rustPose = sampleBowSurface(0.928, 2.82, 0.015);

    // 4. Hệ dây ăng-ten vô tuyến dài nối giữa Cột trước (x=+5.6, y=13.05) và Cột sau (x=-10.4, y=12.75)
    const aerialPort = pipe(
      [
        [5.6, 13.02, -1.36],
        [-2.4, 12.42, -1.33],
        [-10.4, 12.72, -1.3],
      ],
      0.034,
      24,
    );
    const aerialStbd = pipe(
      [
        [5.6, 13.02, 1.36],
        [-2.4, 12.42, 1.33],
        [-10.4, 12.72, 1.3],
      ],
      0.034,
      24,
    );
    const aerialCenter = pipe(
      [
        [5.6, 13.55, 0],
        [-2.4, 13.05, 0],
        [-10.4, 13.28, 0],
      ],
      0.028,
      24,
    );
    const feederPort = pipe(
      [
        [-2.1, 12.43, -1.33],
        [-2.05, 9.4, -0.78],
        [-1.95, 6.72, -0.52],
      ],
      0.028,
      14,
    );
    const feederStbd = pipe(
      [
        [-2.1, 12.43, 1.33],
        [-2.05, 9.4, 0.78],
        [-1.95, 6.72, 0.52],
      ],
      0.028,
      14,
    );

    const brokenWire1 = pipe(
      [
        [-10.1, 11.4, -1.1],
        [-7.2, 7.6, -1.45],
        [-4.8, 4.9, -1.2],
      ],
      0.03,
      14,
    );
    const brokenWire2 = pipe(
      [
        [5.2, 9.8, 1.15],
        [2.6, 6.9, 1.4],
        [0.4, 4.7, 0.95],
      ],
      0.03,
      14,
    );

    const foreStay = pipe(
      [
        [5.6, 12.9, 0],
        [14.55, 4.48, 0],
      ],
      0.03,
      10,
    );
    const foreShroudPort = pipe(
      [
        [5.6, 12.2, -0.1],
        [5.2, 3.32, -2.52],
      ],
      0.028,
      8,
    );
    const foreShroudStbd = pipe(
      [
        [5.6, 12.2, 0.1],
        [5.2, 3.32, 2.52],
      ],
      0.028,
      8,
    );
    const aftShroudPort = pipe(
      [
        [-10.4, 12.0, -0.1],
        [-10.6, 3.12, -2.32],
      ],
      0.028,
      8,
    );
    const aftShroudStbd = pipe(
      [
        [-10.4, 12.0, 0.1],
        [-10.6, 3.12, 2.32],
      ],
      0.028,
      8,
    );
    const aftBackstay = pipe(
      [
        [-10.4, 12.7, 0],
        [-14.3, 3.35, 0],
      ],
      0.028,
      8,
    );

    const sampanPlan: P2[] = [
      [-2.15, 0],
      [-1.55, 0.62],
      [0.1, 0.72],
      [1.65, 0.55],
      [2.25, 0],
      [1.65, -0.55],
      [0.1, -0.72],
      [-1.55, -0.62],
    ];
    const sampan = extrudeTop(sampanPlan, 0.62, 0.04);

    const portholes: [number, number, number][] = [];
    for (const px of [11.4, 9.5, 7.7, -7.8, -9.6, -11.4]) {
      const u = (px + HALF_L) / L;
      const py = trawlerSheerY(u) - 0.58;
      const pz = trawlerHalfBeam(u, py);
      if (pz > 0.7) {
        portholes.push([px, py, pz + 0.02], [px, py, -pz - 0.02]);
      }
    }

    return {
      fullUnder,
      fullBoot,
      fullFreeboard,
      fullDeck,
      aftUnder,
      aftBoot,
      aftFreeboard,
      aftDeck,
      bowUnder,
      bowBoot,
      bowFreeboard,
      bowDeck,
      sternUpper,
      sternBoot,
      sternUnder,
      rubStrakeStbd,
      rubStrakePort,
      capRailStbd,
      capRailPort,
      numPose,
      anchorPose,
      rustPose,
      aerialPort,
      aerialStbd,
      aerialCenter,
      feederPort,
      feederStbd,
      brokenWire1,
      brokenWire2,
      foreStay,
      foreShroudPort,
      foreShroudStbd,
      aftShroudPort,
      aftShroudStbd,
      aftBackstay,
      sampan,
      portholes,
    };
  }, []);

  const glassMat = wheelhouseGlow ? mats.glassWarm : mats.glassCold;
  const cabinCoreMat = wheelhouseGlow ? mats.cabinCoreWarm : mats.cabinCoreDark;

  const bowBreakPos: [number, number, number] = isShattered
    ? [1.8 + dBreak * 2.1, -dBreak * 0.65, dBreak * 0.85]
    : [1.8, 0, 0];
  const bowBreakRot: [number, number, number] = isShattered
    ? [dBreak * 0.34, -dBreak * 0.16, -dBreak * 0.32]
    : [0, 0, 0];

  const aftBreakPos: [number, number, number] = isShattered
    ? [1.8 - dBreak * 1.85, -dBreak * 0.78, -dBreak * 0.72]
    : [1.8, 0, 0];
  const aftBreakRot: [number, number, number] = isShattered
    ? [-dBreak * 0.38, dBreak * 0.14, dBreak * 0.28]
    : [0, 0, 0];

  return (
    <group>
      {/* ==================== 1. VỎ TÀU NGUYÊN KHỐI (damage <= 0.7) ==================== */}
      {!isShattered && (
        <group>
          <mesh geometry={geos.fullUnder} material={mats.underwaterRed} receiveShadow />
          <mesh geometry={geos.fullBoot} material={mats.bootBlack} receiveShadow />
          <mesh geometry={geos.fullFreeboard} material={mats.ijnHull} castShadow receiveShadow />
          <mesh geometry={geos.fullDeck} material={mats.deckWood} receiveShadow />
          {/* Gờ giảm chấn chạy dọc mạn tàu (rubbing strake) & tay vịn gỗ/thép đỉnh be chắn sóng */}
          <mesh geometry={geos.rubStrakeStbd} material={mats.darkSteel} castShadow />
          <mesh geometry={geos.rubStrakePort} material={mats.darkSteel} castShadow />
          <mesh geometry={geos.capRailStbd} material={mats.woodTrim} />
          <mesh geometry={geos.capRailPort} material={mats.woodTrim} />
          <Rivets points={geos.portholes} r={0.11} color="#1f2529" />
        </group>
      )}

      {/* ==================== 2. NỬA THÂN TRƯỚC (MŨI CAO + SỐ "23" + PHÁO MŨI + CỘT ĂNG-TEN TRƯỚC) ==================== */}
      <group position={bowBreakPos} rotation={bowBreakRot}>
        <group position={[-1.8, 0, 0]}>
          {isShattered && (
            <>
              <mesh geometry={geos.bowUnder} material={mats.underwaterRed} receiveShadow />
              <mesh geometry={geos.bowBoot} material={mats.bootBlack} receiveShadow />
              <mesh geometry={geos.bowFreeboard} material={mats.ijnHull} castShadow receiveShadow />
              <mesh geometry={geos.bowDeck} material={mats.deckWood} receiveShadow />
              <mesh position={[1.85, 1.05, 0]} geometry={rbox(0.55, 3.8, 5.1, 0.08)} material={mats.charBlack} />
              <mesh position={[1.7, 1.45, 0.3]} geometry={rbox(0.45, 1.7, 2.8, 0.06)} material={mats.emberHot} />
            </>
          )}

          {/* Số hiệu "23" sơn trắng hai bên mũi tàu (ốp sát vỏ loe, đọc thuận cả 2 mạn!) */}
          <group position={[geos.numPose.x, geos.numPose.y, geos.numPose.z]} rotation={[0, geos.numPose.yaw, 0]}>
            <group rotation={[geos.numPose.flare, 0, 0]}>
              <HullNumber23 mat={mats.stencilWhite} />
            </group>
          </group>
          <group
            position={[geos.numPose.x, geos.numPose.y, -geos.numPose.z]}
            rotation={[0, Math.PI - geos.numPose.yaw, 0]}
          >
            <group rotation={[geos.numPose.flare, 0, 0]}>
              <HullNumber23 mat={mats.stencilWhite} />
            </group>
          </group>

          {/* Mỏ neo sắt & vệt rỉ sét lỗ neo ốp sát khít biên dạng mũi (không lơ lửng!) */}
          <group position={[geos.anchorPose.x, geos.anchorPose.y, geos.anchorPose.z]} rotation={[0, geos.anchorPose.yaw, 0]}>
            <group rotation={[geos.anchorPose.flare, 0, -0.45]}>
              <mesh geometry={rbox(0.72, 0.18, 0.16, 0.04)} material={mats.darkSteel} castShadow />
              <mesh position={[-0.28, 0, 0]} geometry={rbox(0.22, 0.54, 0.16, 0.04)} material={mats.darkSteel} />
            </group>
          </group>
          <group
            position={[geos.anchorPose.x, geos.anchorPose.y, -geos.anchorPose.z]}
            rotation={[0, Math.PI - geos.anchorPose.yaw, 0]}
          >
            <group rotation={[geos.anchorPose.flare, 0, 0.45]}>
              <mesh geometry={rbox(0.72, 0.18, 0.16, 0.04)} material={mats.darkSteel} castShadow />
              <mesh position={[0.28, 0, 0]} geometry={rbox(0.22, 0.54, 0.16, 0.04)} material={mats.darkSteel} />
            </group>
          </group>

          <group position={[geos.rustPose.x, geos.rustPose.y, geos.rustPose.z]} rotation={[0, geos.rustPose.yaw, 0]}>
            <group rotation={[geos.rustPose.flare, 0, 0]}>
              <mesh geometry={rbox(0.22, 1.15, 0.025, 0.008)} material={mats.rustStreak} />
            </group>
          </group>
          <group
            position={[geos.rustPose.x, geos.rustPose.y, -geos.rustPose.z]}
            rotation={[0, Math.PI - geos.rustPose.yaw, 0]}
          >
            <group rotation={[geos.rustPose.flare, 0, 0]}>
              <mesh geometry={rbox(0.22, 1.15, 0.025, 0.008)} material={mats.rustStreak} />
            </group>
          </group>

          {/* Lỗ thoát nước sóng tràn trên be chắn sóng giữa tàu (freeing ports / scuppers) */}
          {([-1, 1] as const).map((s) =>
            [3.6, 5.4, 7.1].map((sx) => {
              const su = (sx + HALF_L) / L;
              const sy = trawlerSheerY(su) + 0.18;
              const sz = trawlerHalfBeam(su, sy) + 0.012;
              return (
                <mesh
                  key={`${s}_${sx}`}
                  position={[sx, sy, s * sz]}
                  rotation={[0, -s * 0.12, 0]}
                  geometry={rbox(0.68, 0.16, 0.04, 0.01)}
                  material={mats.sootBlack}
                />
              );
            }),
          )}

          {/* Tời neo mũi, cọc mũi & Nắp hầm cá/đạn bằng gỗ trên boong trước */}
          <mesh position={[12.25, 3.88, 0]} geometry={rbox(0.85, 0.55, 1.35, 0.06)} material={mats.darkSteel} castShadow />
          <mesh position={[14.72, 4.78, 0]} material={mats.darkSteel}>
            <cylinderGeometry args={[0.04, 0.05, 1.15, 8]} />
          </mesh>
          <mesh position={[3.55, 2.66, 0]} geometry={rbox(2.5, 0.36, 2.25, 0.05)} material={mats.woodTrim} castShadow />
          <mesh position={[3.55, 2.86, 0]} geometry={rbox(2.36, 0.08, 2.12, 0.02)} material={mats.cabinTimber} />

          {/* Khẩu pháo / súng máy tuần tiễu trên bệ mũi (x = +9.6 m) */}
          <BowDeckGun position={[9.6, 3.45, 0]} steelMat={mats.cabinTimber} darkMat={mats.darkSteel} />

          {/* CỘT ĂNG-TEN VÔ TUYẾN PHÍA TRƯỚC CAO ~11M (x = +5.6 m, chân y = 2.65 -> đỉnh y = 13.75 m) */}
          <group position={[5.6, 2.65, 0]}>
            <mesh position={[0, 2.5, 0]} material={mats.mastSpar} castShadow>
              <cylinderGeometry args={[0.13, 0.19, 5.0, 12]} />
            </mesh>
            <group position={[-0.15, 1.1, 0]} rotation={[0, 0.12, 0.85]}>
              <mesh position={[0, 2.3, 0]} material={mats.woodTrim} castShadow>
                <cylinderGeometry args={[0.07, 0.1, 4.6, 10]} />
              </mesh>
            </group>

            <group
              position={[0, 5.0, 0]}
              rotation={isDamaged ? [0.48 * dMid, 0.2 * dMid, -0.58 * dMid] : [0, 0, 0]}
            >
              <mesh position={[0, 3.05, 0]} material={mats.mastSpar} castShadow>
                <cylinderGeometry args={[0.07, 0.13, 6.1, 12]} />
              </mesh>
              <mesh position={[0.24, 2.15, 0]} material={mats.cabinTimber} castShadow>
                <cylinderGeometry args={[0.42, 0.36, 0.82, 12]} />
              </mesh>
              <mesh position={[0, 5.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.mastSpar} castShadow>
                <cylinderGeometry args={[0.06, 0.06, 3.0, 10]} />
              </mesh>
              {([-1.36, 0, 1.36] as const).map((iz) => (
                <mesh key={iz} position={[-0.08, 5.38, iz]} material={mats.porcelainWhite}>
                  <sphereGeometry args={[0.085, 8, 6]} />
                </mesh>
              ))}
              <mesh position={[0.16, 4.6, 0]} geometry={rbox(0.22, 0.32, 0.22, 0.04)} material={glassMat} />
            </group>
          </group>

          {!isDamaged && (
            <>
              <mesh geometry={geos.foreStay} material={mats.darkSteel} />
              <mesh geometry={geos.foreShroudPort} material={mats.darkSteel} />
              <mesh geometry={geos.foreShroudStbd} material={mats.darkSteel} />
            </>
          )}

          {isDamaged && (
            <group position={[7.4, 2.85, 2.18]} rotation={[0.18, -0.24, 0]}>
              <mesh geometry={rbox(2.35, 1.35, 0.32, 0.05)} material={mats.charBlack} />
              <mesh position={[0.1, 0.05, 0.08]} geometry={rbox(1.15, 0.62, 0.28, 0.04)} material={mats.emberHot} />
              <mesh
                position={[-0.55, 0.48, 0.25]}
                rotation={[0.4, 0.3, -0.5]}
                geometry={rbox(0.85, 0.35, 0.07, 0.01)}
                material={mats.ijnHull}
              />
            </group>
          )}
        </group>
      </group>

      {/* ==================== 3. NỬA THÂN SAU (BUỒNG LÁI CỬA KÍNH VUÔNG SÁNG ẤM + ỐNG KHÓI + CỘT SAU + CỜ IJN) ==================== */}
      <group position={aftBreakPos} rotation={aftBreakRot}>
        <group position={[-1.8, 0, 0]}>
          {isShattered && (
            <>
              <mesh geometry={geos.aftUnder} material={mats.underwaterRed} receiveShadow />
              <mesh geometry={geos.aftBoot} material={mats.bootBlack} receiveShadow />
              <mesh geometry={geos.aftFreeboard} material={mats.ijnHull} castShadow receiveShadow />
              <mesh geometry={geos.aftDeck} material={mats.deckWood} receiveShadow />
              <mesh position={[1.65, 0.95, 0]} geometry={rbox(0.55, 3.7, 5.2, 0.08)} material={mats.charBlack} />
              <mesh position={[1.82, 1.3, -0.25]} geometry={rbox(0.42, 1.65, 2.9, 0.06)} material={mats.emberHot} />
            </>
          )}

          {/* Vách khép kín đuôi tàu, chân vịt đồng 3 cánh & bánh lái đơn */}
          <mesh geometry={geos.sternUpper} material={mats.ijnHull} castShadow receiveShadow />
          <mesh geometry={geos.sternBoot} material={mats.bootBlack} />
          <mesh geometry={geos.sternUnder} material={mats.underwaterRed} />
          <group position={[-13.45, -1.75, 0]}>
            <mesh position={[0.85, 0.1, 0]} rotation={[0, 0, -Math.PI / 2 + 0.06]} material={mats.darkSteel}>
              <cylinderGeometry args={[0.11, 0.13, 1.9, 10]} />
            </mesh>
            <mesh material={mats.bronzeProp}>
              <cylinderGeometry args={[0.2, 0.16, 0.38, 12]} />
            </mesh>
            {[0, 1, 2].map((b) => (
              <mesh
                key={b}
                rotation={[(b * Math.PI * 2) / 3, 0.34, 0]}
                geometry={rbox(0.06, 1.25, 0.32, 0.02)}
                material={mats.bronzeProp}
              />
            ))}
          </group>
          <mesh position={[-14.15, -1.55, 0]} geometry={rbox(0.95, 1.75, 0.14, 0.03)} material={mats.underwaterRed} />

          {/* KHỐI NHÀ BOONG DƯỚI — PHÒNG ĐIỆN ĐÀI VÔ TUYẾN & BUỒNG MÁY (x = -6.6..+1.0 m) */}
          <group position={[-2.8, 2.42, 0]}>
            <mesh position={[0, 1.04, 0]} geometry={rbox(7.6, 2.08, 3.45, 0.08)} material={mats.cabinTimber} castShadow receiveShadow />
            <mesh position={[-1.45, 2.1, 0]} geometry={rbox(4.65, 0.08, 3.6, 0.02)} material={mats.woodTrim} receiveShadow />

            {([-1, 1] as const).map((s) => (
              <React.Fragment key={s}>
                {[0.85, -0.35].map((wx) => (
                  <group key={wx} position={[wx, 1.25, s * 1.73]}>
                    <mesh geometry={rbox(0.62, 0.58, 0.06, 0.01)} material={mats.woodTrim} />
                    <mesh position={[0, 0, s * 0.015]} geometry={rbox(0.48, 0.46, 0.05, 0.01)} material={glassMat} />
                  </group>
                ))}
                <mesh position={[-1.75, 0.92, s * 1.73]} geometry={rbox(0.78, 1.65, 0.07, 0.02)} material={mats.ijnHull} />
                <mesh position={[2.25, 1.1, s * 1.76]} material={mats.stencilWhite}>
                  <torusGeometry args={[0.34, 0.095, 10, 18]} />
                </mesh>
                {/* Cầu thang thép dốc từ boong lên buồng lái */}
                <group position={[-2.9, 1.05, s * 1.86]} rotation={[0, 0, -0.58]}>
                  <mesh geometry={rbox(0.28, 2.35, 0.18, 0.02)} material={mats.woodTrim} />
                </group>
              </React.Fragment>
            ))}
          </group>

          {/* BUỒNG LÁI (WHEELHOUSE) GỖ/THÉP CÓ HÀNG CỬA SỔ KÍNH VUÔNG SÁNG ẤM BÊN TRONG */}
          <group position={[-0.25, 4.48, 0]}>
            <mesh position={[0, 0.54, 0]} geometry={rbox(3.3, 1.08, 3.16, 0.06)} material={mats.cabinTimber} castShadow receiveShadow />
            <mesh position={[0, 1.08, 0]} geometry={rbox(3.38, 0.1, 3.24, 0.02)} material={mats.woodTrim} />

            {/* Hộp đèn hành trình Đỏ (mạn trái -Z) & Xanh lục (mạn phải +Z) gắn hai hông buồng lái */}
            <mesh position={[1.15, 0.85, -1.66]} geometry={rbox(0.36, 0.28, 0.18, 0.03)} material={mats.navPortRed} />
            <mesh position={[1.15, 0.85, 1.66]} geometry={rbox(0.36, 0.28, 0.18, 0.03)} material={mats.navStbdGreen} />

            {/* Khoang nội thất phát sáng ấm + bóng vô-lăng & bàn điện đài bên trong */}
            <mesh position={[0, 1.52, 0]} geometry={rbox(2.86, 0.8, 2.74, 0.04)} material={cabinCoreMat} />
            <mesh position={[0.85, 1.38, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.darkSteel}>
              <torusGeometry args={[0.28, 0.035, 8, 14]} />
            </mesh>

            {/* Hệ đố gỗ chia HÀNG 5 CỬA SỔ KÍNH VUÔNG mặt trước và 5 CỬA SỔ KÍNH VUÔNG hai bên mạn */}
            {([-1.56, -0.94, -0.31, 0.31, 0.94, 1.56] as const).map((cz) => (
              <mesh key={`fp${cz}`} position={[1.58, 1.54, cz]} geometry={rbox(0.14, 0.88, 0.11, 0.01)} material={mats.woodTrim} />
            ))}
            {([-1.58, -0.95, -0.32, 0.32, 0.95, 1.58] as const).map((cx) =>
              ([-1.51, 1.51] as const).map((cz) => (
                <mesh
                  key={`sp${cx}_${cz}`}
                  position={[cx, 1.54, cz]}
                  geometry={rbox(0.11, 0.88, 0.14, 0.01)}
                  material={mats.woodTrim}
                />
              )),
            )}
            <mesh position={[-1.58, 1.54, 0]} geometry={rbox(0.14, 0.88, 3.16, 0.02)} material={mats.cabinTimber} castShadow />

            {/* Hàng 5 ô cửa sổ kính VUÔNG (0.50 x 0.56 m) mặt trước buồng lái */}
            {([-1.25, -0.625, 0, 0.625, 1.25] as const).map((wz) => (
              <mesh key={`fw${wz}`} position={[1.59, 1.54, wz]} geometry={rbox(0.08, 0.56, 0.5, 0.01)} material={glassMat} />
            ))}
            {/* Hàng 5 ô cửa sổ kính VUÔNG (0.50 x 0.56 m) mỗi bên mạn buồng lái */}
            {([-1, 1] as const).map((s) =>
              ([-1.26, -0.63, 0, 0.63, 1.26] as const).map((wx) => (
                <mesh
                  key={`sw${s}_${wx}`}
                  position={[wx, 1.54, s * 1.52]}
                  geometry={rbox(0.5, 0.56, 0.08, 0.01)}
                  material={glassMat}
                />
              )),
            )}

            {/* Mái buồng lái nhô mí chắn mưa bão, sứ cách điện, vòng ăng-ten định hướng vô tuyến (DF loop) & đèn pha */}
            <mesh position={[0.12, 2.04, 0]} geometry={rbox(3.72, 0.16, 3.48, 0.04)} material={mats.woodTrim} castShadow />
            <mesh position={[0.08, 2.14, 0]} geometry={rbox(3.52, 0.08, 3.3, 0.03)} material={mats.cabinTimber} />
            {([-0.52, 0.52] as const).map((iz) => (
              <mesh key={iz} position={[-1.55, 2.26, iz]} material={mats.porcelainWhite}>
                <cylinderGeometry args={[0.065, 0.095, 0.24, 10]} />
              </mesh>
            ))}
            {/* Vòng ăng-ten định vị vô tuyến tròn (Radio Direction-Finder Loop) đặc trưng của tàu trinh sát Nhật */}
            <group position={[-0.25, 2.58, 0]}>
              <mesh position={[0, -0.22, 0]} material={mats.darkSteel}>
                <cylinderGeometry args={[0.04, 0.06, 0.44, 8]} />
              </mesh>
              <mesh rotation={[0, 0.45, 0]} material={mats.darkSteel}>
                <torusGeometry args={[0.32, 0.032, 8, 18]} />
              </mesh>
            </group>
            {/* Đèn pha tuần tiễu trên nóc buồng lái */}
            <group position={[1.15, 2.48, 0]}>
              <mesh position={[0, -0.18, 0]} material={mats.darkSteel}>
                <cylinderGeometry args={[0.07, 0.11, 0.36, 10]} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.darkSteel} castShadow>
                <cylinderGeometry args={[0.22, 0.22, 0.38, 14]} />
              </mesh>
              <mesh position={[0.19, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={glassMat}>
                <cylinderGeometry args={[0.19, 0.19, 0.03, 14]} />
              </mesh>
            </group>
          </group>

          {/* ỐNG KHÓI NHỎ SAU BUỒNG LÁI (x = -4.15 m, cao từ y = 4.5 lên y = 8.45 m) */}
          <group
            position={[-4.15, 4.5, 0]}
            rotation={isDamaged ? [0.22 * dMid, 0, 0.1 + 0.35 * dMid] : [0, 0, 0.09]}
          >
            <mesh position={[0, 1.55, 0]} material={mats.ijnHull} castShadow>
              <cylinderGeometry args={[0.42, 0.46, 3.1, 18]} />
            </mesh>
            <mesh position={[0, 2.68, 0]} material={mats.stencilWhite}>
              <cylinderGeometry args={[0.432, 0.436, 0.32, 18]} />
            </mesh>
            <mesh position={[0, 3.45, 0]} material={mats.sootBlack} castShadow>
              <cylinderGeometry args={[0.42, 0.425, 0.95, 18]} />
            </mesh>
            <mesh position={[0.47, 1.9, 0]} material={mats.darkSteel}>
              <cylinderGeometry args={[0.045, 0.045, 2.7, 8]} />
            </mesh>
          </group>

          {/* Xuồng gỗ cứu sinh nhỏ (sampan) & phuy dầu dự trữ trên boong sau */}
          <group position={[-7.85, 2.58, 1.18]} rotation={[0, 0.05, 0]}>
            <mesh geometry={geos.sampan} material={mats.woodTrim} castShadow />
            <mesh position={[0, 0.6, 0]} geometry={rbox(3.2, 0.07, 1.1, 0.02)} material={mats.cabinTimber} />
          </group>
          {[-8.2, -9.05].map((dx) => (
            <mesh key={dx} position={[dx, 2.9, -1.55]} material={mats.darkSteel} castShadow>
              <cylinderGeometry args={[0.3, 0.3, 0.88, 12]} />
            </mesh>
          ))}

          {/* CỘT ĂNG-TEN VÔ TUYẾN PHÍA SAU CAO ~11M (x = -10.4 m, chân y = 2.6 -> đỉnh y = 13.45 m) */}
          <group
            position={[-10.4, 2.6, 0]}
            rotation={isDamaged ? [-0.26 * dMid, -0.1 * dMid, 0.32 * dMid] : [0, 0, 0.03]}
          >
            <mesh position={[0, 5.42, 0]} material={mats.mastSpar} castShadow>
              <cylinderGeometry args={[0.065, 0.17, 10.85, 12]} />
            </mesh>
            <mesh position={[0, 10.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.mastSpar} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 2.85, 10]} />
            </mesh>
            {([-1.3, 0, 1.3] as const).map((iz) => (
              <mesh key={iz} position={[0.08, 10.12, iz]} material={mats.porcelainWhite}>
                <sphereGeometry args={[0.08, 8, 6]} />
              </mesh>
            ))}
          </group>

          {!isDamaged && (
            <>
              <mesh geometry={geos.aftShroudPort} material={mats.darkSteel} />
              <mesh geometry={geos.aftShroudStbd} material={mats.darkSteel} />
              <mesh geometry={geos.aftBackstay} material={mats.darkSteel} />
            </>
          )}

          {/* LÁ CỜ HẢI QUÂN ĐẾ QUỐC NHẬT (HÚC NHẬT KỲ) PHÍA LÁI (x = -14.45 m) */}
          <group position={[-14.45, 2.95, 0]}>
            <mesh position={[-0.25, 1.5, 0]} rotation={[0, 0, 0.18]} material={mats.mastSpar} castShadow>
              <cylinderGeometry args={[0.038, 0.055, 3.1, 8]} />
            </mesh>
            <group position={[-0.44, 2.38, 0]}>
              <IJNEnsignFlag clothMat={mats.flagCloth} redMat={mats.flagRed} />
            </group>
          </group>

          {isDamaged && (
            <>
              <group position={[-2.4, 3.85, -1.78]} rotation={[-0.12, 0.08, 0]}>
                <mesh geometry={rbox(2.6, 1.45, 0.28, 0.05)} material={mats.charBlack} />
                <mesh position={[-0.15, -0.08, -0.06]} geometry={rbox(1.3, 0.65, 0.25, 0.04)} material={mats.emberHot} />
              </group>
              <group position={[-7.2, 1.95, 2.48]} rotation={[0.1, 0.14, 0]}>
                <mesh geometry={rbox(2.8, 1.3, 0.3, 0.05)} material={mats.charBlack} />
                <mesh position={[0.2, 0.1, 0.08]} geometry={rbox(1.1, 0.55, 0.26, 0.03)} material={mats.emberHot} />
              </group>
              <mesh geometry={geos.brokenWire1} material={mats.darkSteel} />
              <mesh geometry={geos.brokenWire2} material={mats.darkSteel} />
            </>
          )}
        </group>
      </group>

      {/* ==================== 4. DÂY ĂNG-TEN VÔ TUYẾN PIPE CĂNG CAO KHI CHƯA GÃY CỘT ==================== */}
      {!isDamaged && (
        <group>
          <mesh geometry={geos.aerialPort} material={mats.darkSteel} />
          <mesh geometry={geos.aerialStbd} material={mats.darkSteel} />
          <mesh geometry={geos.aerialCenter} material={mats.darkSteel} />
          <mesh geometry={geos.feederPort} material={mats.darkSteel} />
          <mesh geometry={geos.feederStbd} material={mats.darkSteel} />
        </group>
      )}

      {/* ==================== 5. MẢNH VỎ THÉP & VÁN GỖ VĂNG TUNG TÓE KHI BỊ BẮN TAN (damage > 0.7) ==================== */}
      {isShattered && (
        <group>
          {SHRAPNEL_SPECS.map((sp, idx) => (
            <mesh
              key={idx}
              position={[
                sp.base[0] + sp.vel[0] * dBreak,
                sp.base[1] + sp.vel[1] * dBreak - 2.4 * dBreak * dBreak,
                sp.base[2] + sp.vel[2] * dBreak,
              ]}
              rotation={[sp.spin[0] * dBreak, sp.spin[1] * dBreak, sp.spin[2] * dBreak]}
              geometry={rbox(sp.size[0], sp.size[1], sp.size[2], 0.02)}
              material={idx % 5 === 0 ? mats.charBlack : sp.wood ? mats.deckWood : mats.ijnHull}
              castShadow
            />
          ))}
        </group>
      )}
    </group>
  );
};

export default NittoMaru;

export const preview = turntable(() => <NittoMaru wheelhouseGlow />, {
  size: 31,
  center: [0, 4.2, 0],
});
