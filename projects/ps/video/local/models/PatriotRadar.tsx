// Đài radar mảng pha quét điện tử AN/MPQ-65 đặt trên sơ-mi rơ-moóc M860 (tỉ lệ mét thật 1:1).
// Quy ước trục: mặt mảng pha hướng +X (nghiêng ngửa 20° nhìn lên bầu trời +X/+Y), đỉnh +Y, ngang Z, mặt đất y = 0.
// Kích thước chuẩn: rơ-moóc dài 10.40 m (x: -5.20 .. +5.20), rộng thân 2.90 m, đỉnh khung radar cao 4.45 m.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

export type PatriotRadarProps = {
  azimuth?: number;                 // rad xoay bệ radar, mặc định 0
  activeGlow?: number;              // 0..1 độ sáng các phần tử mảng pha, mặc định 0.35
  showBeam?: boolean;               // hiện chùm tia quét điện tử, mặc định false
  beamAngle?: [number, number];     // [yawRad, pitchRad] góc lái tia điện tử, mặc định [0, 0.35]
  wheelSpin?: number;               // rad, mặc định 0
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

// ---------------- Hằng số hình học chuẩn 1:1 ----------------
const TILT_RAD = (20 * Math.PI) / 180; // mặt mảng pha nghiêng ngửa 20° về phía sau
const X_PIVOT = 0.98;                  // tâm bàn xoay phương vị trên sàn rơ-moóc M860
const LX_FACE = 2.40;                  // vị trí X cục bộ của tâm khung mặt phẳng radar (so với X_PIVOT)
const Y_FACE = 2.835;                  // độ cao tâm khung mặt phẳng radar (đỉnh đạt đúng ~4.45 m)
const LENS_FY = 0.23;                  // tâm thấu kính chính Ø 2.44 m dịch lên trên tâm bát giác
const LENS_R = 1.22;                   // bán kính thấu kính chính (Ø 2.44 m)

// Tâm phát chùm tia điện tử trong hệ toạ độ bàn xoay (trùng khít tâm thấu kính Ø 2.44 m)
const BEAM_ORIGIN_LX = LX_FACE + 0.048 * Math.cos(TILT_RAD) - LENS_FY * Math.sin(TILT_RAD);
const BEAM_ORIGIN_Y = Y_FACE + 0.048 * Math.sin(TILT_RAD) + LENS_FY * Math.cos(TILT_RAD);

const detHash = (a: number, b: number) => {
  const h = Math.sin(a * 127.1 + b * 311.7 + 65.3) * 43758.5453;
  return h - Math.floor(h);
};

// ---------------- Danh sách tất định >5.000 phần tử mảng pha đồng bộ 1:1 giữa Texture & 3D ----------------
type HexElem = { fy: number; fz: number; excite: number; shade: number };

const MAIN_LENS_ELEMENTS: HexElem[] = (() => {
  const list: HexElem[] = [];
  const pitch = 0.0321; // ~3.21 cm -> 5.060+ phần tử lục giác trong thấu kính Ø 2.44 m (R = 1.22 m)
  const rowStep = pitch * 0.8660254;
  const rLim = LENS_R - 0.026;
  const modSize = 0.16; // kích thước mô-đun gạch subarray 32 phần tử
  let row = 0;
  for (let fy = -rLim; fy <= rLim; fy += rowStep, row++) {
    const zOff = (row & 1) ? pitch * 0.5 : 0;
    let col = 0;
    for (let fz = -rLim + zOff; fz <= rLim; fz += pitch, col++) {
      const d = Math.hypot(fy, fz);
      if (d > rLim) continue;

      // Phân bố pha Fresnel lệch tâm của thấu kính mảng pha quang-vi-ba (space-fed phased array)
      const dfy = (fy + 0.14) / LENS_R;
      const dfz = (fz - 0.17) / LENS_R;
      const rNorm = Math.hypot(dfy, dfz);
      const fresnel = 0.5 + 0.5 * Math.cos(rNorm * rNorm * 25.0);
      const modFactor = 0.78 + 0.22 * detHash(Math.floor((fy + 2) / modSize), Math.floor((fz + 2) / modSize));
      const rnd = detHash(row, col);
      const radialTaper = 1.0 - 0.22 * Math.pow(d / LENS_R, 2.2);
      const excite = Math.max(0.1, Math.min(1, (0.30 + 0.54 * fresnel + 0.16 * rnd) * modFactor * radialTaper));

      list.push({ fy, fz, excite, shade: rnd });
    }
  }
  return list;
})();

// ---------------- Texture tổ ong >5.000 phần tử mảng pha (cache 1 lần ở cấp module) ----------------
type LensTexSet = {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
};

let cachedMainLensTex: LensTexSet | null = null;
const getMainLensTextures = (): LensTexSet => {
  if (cachedMainLensTex) return cachedMainLensTex;
  const N = 1024;
  const C = N / 2;

  const cvCol = document.createElement('canvas');
  const cvBump = document.createElement('canvas');
  const cvEm = document.createElement('canvas');
  cvCol.width = cvCol.height = N;
  cvBump.width = cvBump.height = N;
  cvEm.width = cvEm.height = N;

  const ctxC = cvCol.getContext('2d')!;
  const ctxB = cvBump.getContext('2d')!;
  const ctxE = cvEm.getContext('2d')!;

  ctxC.fillStyle = '#1d272f';
  ctxC.fillRect(0, 0, N, N);
  ctxB.fillStyle = '#444444';
  ctxB.fillRect(0, 0, N, N);
  ctxE.fillStyle = '#000000';
  ctxE.fillRect(0, 0, N, N);

  // Lưới rãnh chia mô-đun subarray đặc trưng của AN/MPQ-65
  const modStepPx = (0.16 / LENS_R) * C;
  ctxC.strokeStyle = '#121920';
  ctxC.lineWidth = 2.2;
  ctxB.strokeStyle = '#181818';
  ctxB.lineWidth = 2.4;
  for (let k = -8; k <= 8; k++) {
    const p = C + k * modStepPx;
    ctxC.beginPath(); ctxC.moveTo(p, 0); ctxC.lineTo(p, N); ctxC.stroke();
    ctxC.beginPath(); ctxC.moveTo(0, p); ctxC.lineTo(N, p); ctxC.stroke();
    ctxB.beginPath(); ctxB.moveTo(p, 0); ctxB.lineTo(p, N); ctxB.stroke();
    ctxB.beginPath(); ctxB.moveTo(0, p); ctxB.lineTo(N, p); ctxB.stroke();
  }

  const drawHex = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 6;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  // Ánh xạ chính xác 1:1 với CircleGeometry xoay [0, Math.PI / 2, 0] (local +X -> -fz, local +Y -> +fy)
  for (let i = 0; i < MAIN_LENS_ELEMENTS.length; i++) {
    const { fy, fz, excite, shade } = MAIN_LENS_ELEMENTS[i];
    const px = C - (fz / LENS_R) * C;
    const py = C - (fy / LENS_R) * C;

    const s = Math.round(86 + 28 * shade);
    ctxC.fillStyle = `rgb(${s - 12}, ${s + 3}, ${s + 7})`;
    drawHex(ctxC, px, py, 6.05);
    ctxC.fill();

    ctxB.fillStyle = '#dcdcdc';
    drawHex(ctxB, px, py, 6.05);
    ctxB.fill();

    ctxC.fillStyle = '#131b22';
    drawHex(ctxC, px, py, 4.15);
    ctxC.fill();

    ctxB.fillStyle = '#2a2a2a';
    drawHex(ctxB, px, py, 4.15);
    ctxB.fill();

    const cVal = Math.round(105 + 125 * excite);
    ctxC.fillStyle = `rgb(${Math.round(cVal * 0.48)}, ${Math.round(cVal * 0.88)}, ${cVal})`;
    ctxC.beginPath();
    ctxC.arc(px, py, 2.15, 0, Math.PI * 2);
    ctxC.fill();

    ctxB.fillStyle = '#ffffff';
    ctxB.beginPath();
    ctxB.arc(px, py, 2.0, 0, Math.PI * 2);
    ctxB.fill();

    const eVal = Math.round(55 + 200 * Math.pow(excite, 1.25));
    ctxE.fillStyle = `rgb(${Math.round(eVal * 0.22)}, ${Math.round(eVal * 0.86)}, ${eVal})`;
    ctxE.beginPath();
    ctxE.arc(px, py, 2.45, 0, Math.PI * 2);
    ctxE.fill();
  }

  // Vòng chuẩn trực đồng tâm mảnh trên thấu kính
  for (const rr of [168, 336, 496]) {
    ctxC.strokeStyle = 'rgba(18, 28, 35, 0.82)';
    ctxC.lineWidth = 2.6;
    ctxC.beginPath();
    ctxC.arc(C, C, rr, 0, Math.PI * 2);
    ctxC.stroke();
  }

  const mkTex = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  cachedMainLensTex = {
    map: mkTex(cvCol, true),
    bumpMap: mkTex(cvBump, false),
    emissiveMap: mkTex(cvEm, true),
  };
  return cachedMainLensTex;
};

// Texture cho các mảng ăng-ten phụ chữ nhật (IFF, TVM, Sidelobe Canceller)
let cachedSubArrayTex: { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } | null = null;
const getSubArrayTextures = () => {
  if (cachedSubArrayTex) return cachedSubArrayTex;
  const W = 512, H = 256;
  const cvC = document.createElement('canvas');
  const cvE = document.createElement('canvas');
  cvC.width = cvE.width = W;
  cvC.height = cvE.height = H;
  const cC = cvC.getContext('2d')!;
  const cE = cvE.getContext('2d')!;

  cC.fillStyle = '#202b32';
  cC.fillRect(0, 0, W, H);
  cE.fillStyle = '#000000';
  cE.fillRect(0, 0, W, H);

  const cols = 28, rows = 12;
  const cw = W / cols, ch = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 2.5, y = r * ch + 2.5;
      const w = cw - 5, h = ch - 5;
      const ex = 0.35 + 0.65 * detHash(r * 11, c * 17);
      cC.fillStyle = '#536564';
      cC.fillRect(x, y, w, h);
      cC.fillStyle = '#131c22';
      cC.fillRect(x + 1.8, y + 1.8, w - 3.6, h - 3.6);
      cC.fillStyle = '#6ec2db';
      cC.fillRect(x + 3.5, y + h * 0.34, w - 7, h * 0.32);

      const ev = Math.round(55 + 190 * ex);
      cE.fillStyle = `rgb(${Math.round(ev * 0.22)}, ${Math.round(ev * 0.86)}, ${ev})`;
      cE.fillRect(x + 3.5, y + h * 0.34, w - 7, h * 0.32);
    }
  }

  const map = new THREE.CanvasTexture(cvC);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const emissiveMap = new THREE.CanvasTexture(cvE);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = 8;

  cachedSubArrayTex = { map, emissiveMap };
  return cachedSubArrayTex;
};

// Alpha gradient suy giảm mượt cho chùm nón sóng điện tử
let cachedBeamAlpha: THREE.CanvasTexture | null = null;
const getBeamAlphaMap = () => {
  if (cachedBeamAlpha) return cachedBeamAlpha;
  const W = 64, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const s = 1 - y / (H - 1);
    const fadeNear = Math.min(1, s / 0.035);
    const fadeFar = Math.pow(Math.max(0, 1 - s), 2.15);
    const pulse = 0.88 + 0.12 * Math.cos(s * 38.0);
    const val = Math.round(255 * fadeNear * fadeFar * pulse);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  cachedBeamAlpha = t;
  return t;
};

// ---------------- Khung gân mô-đun Subarray & chốt chuẩn trực 3D trên thấu kính Ø 2.44 m (không gây Moiré, bắt nắng cận cảnh S15) ----------------
const SUBARRAY_BOSSES: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const step = 0.24;
  for (let fy = -1.08; fy <= 1.08; fy += step) {
    for (let fz = -1.08; fz <= 1.08; fz += step) {
      if (fy * fy + fz * fz <= 1.12 * 1.12) pts.push([fy, fz]);
    }
  }
  return pts;
})();

const PhasedLensSubarray3D: React.FC = () => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pinGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.008, 0.011, 0.012, 6);
    g.rotateZ(-Math.PI / 2);
    return g;
  }, []);
  const pinMat = useMemo(() => plain('#8ea4aa', 0.30, 0.78), []);
  const ribMat = useMemo(() => plain('#222e36', 0.45, 0.65), []);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < SUBARRAY_BOSSES.length; i++) {
      const [fy, fz] = SUBARRAY_BOSSES[i];
      o.position.set(0.035, fy, fz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);

  const ringRadii = [0.42, 0.82, 1.18];

  return (
    <group>
      <instancedMesh ref={ref} args={[pinGeo, pinMat, SUBARRAY_BOSSES.length]} />
      {ringRadii.map((rr) => (
        <mesh key={rr} position={[0.033, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={ribMat}>
          <ringGeometry args={[rr - 0.006, rr + 0.006, 64]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------- Một cụm chân chống thuỷ lực vươn góc chạm chuẩn y = 0 ----------------
const OutriggerLeg: React.FC<{
  anchor: [number, number];
  pad: [number, number];
  bodyMat: THREE.Material;
  darkMat: THREE.Material;
  steelMat: THREE.Material;
}> = ({ anchor, pad, bodyMat, darkMat, steelMat }) => {
  const [ax, az] = anchor;
  const [px, pz] = pad;
  const dx = px - ax;
  const dz = pz - az;
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx);
  const mx = (ax + px) * 0.5;
  const mz = (az + pz) * 0.5;

  // Đĩa chân chống tròn dày có cổ cầu chạm chuẩn mặt đất y = 0.000
  const padGeo = useMemo(() => {
    const g = lathe(
      [
        [0.001, 0.0],
        [0.26, 0.0],
        [0.26, 0.042],
        [0.20, 0.072],
        [0.105, 0.10],
        [0.095, 0.15],
        [0.001, 0.15],
      ],
      24
    ).clone();
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);

  const hoseGeo = useMemo(
    () =>
      pipe(
        [
          [ax, 0.96, az * 0.96],
          [mx, 1.12, mz],
          [px, 1.18, pz],
        ],
        0.016,
        18
      ),
    [ax, az, mx, mz, px, pz]
  );

  return (
    <group>
      {/* Dầm hộp vươn góc từ khung rơ-moóc ra trụ kích */}
      <mesh position={[mx, 0.90, mz]} rotation={[0, yaw, 0]} geometry={rbox(len + 0.12, 0.22, 0.21, 0.025)} material={bodyMat} castShadow receiveShadow />
      {/* Thanh giằng chéo chịu lực bên dưới */}
      <mesh position={[mx, 0.67, mz]} rotation={[0, yaw, -0.25]} geometry={rbox(len * 0.94, 0.10, 0.12, 0.018)} material={darkMat} castShadow />
      {/* Khớp bản lề tại góc rơ-moóc */}
      <mesh position={[ax, 0.89, az]} geometry={rbox(0.24, 0.34, 0.24, 0.025)} material={darkMat} castShadow />

      {/* Đĩa chân chống chạm đất đúng y = 0 */}
      <mesh position={[px, 0, pz]} geometry={padGeo} material={darkMat} castShadow receiveShadow />
      {/* Ty thuỷ lực mạ crôm */}
      <mesh position={[px, 0.29, pz]} material={steelMat} castShadow>
        <cylinderGeometry args={[0.068, 0.068, 0.34, 20]} />
      </mesh>
      {/* Vỏ xi-lanh kích thuỷ lực đứng */}
      <mesh position={[px, 0.87, pz]} material={bodyMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.118, 0.118, 0.86, 24]} />
      </mesh>
      {/* Đai kẹp & nắp đỉnh xi-lanh */}
      <mesh position={[px, 0.45, pz]} material={darkMat}>
        <cylinderGeometry args={[0.132, 0.132, 0.06, 20]} />
      </mesh>
      <mesh position={[px, 1.32, pz]} material={darkMat} castShadow>
        <cylinderGeometry args={[0.132, 0.125, 0.08, 20]} />
      </mesh>
      {/* Ống dẫn dầu thuỷ lực */}
      <mesh geometry={hoseGeo} material={plain('#1e2226', 0.75, 0.15)} />
    </group>
  );
};

// ---------------- Mảng ăng-ten phụ chữ nhật đóng khung (IFF / TVM / Sidelobe) ----------------
const SubArrayModule: React.FC<{
  pos: [number, number, number];
  w: number;
  h: number;
  bays?: number;
  frameMat: THREE.Material;
  faceMat: THREE.Material;
}> = ({ pos, w, h, bays = 1, frameMat, faceMat }) => (
  <group position={pos}>
    <mesh geometry={rbox(0.072, h + 0.068, w + 0.068, 0.016)} material={frameMat} castShadow receiveShadow />
    <mesh position={[0.038, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={faceMat}>
      <planeGeometry args={[w - 0.018, h - 0.018]} />
    </mesh>
    {bays > 1 &&
      Array.from({ length: bays - 1 }, (_, i) => {
        const zSep = -w / 2 + ((i + 1) / bays) * w;
        return <mesh key={i} position={[0.036, 0, zSep]} geometry={rbox(0.022, h + 0.02, 0.022, 0.004)} material={frameMat} />;
      })}
  </group>
);

// ---------------- Quạt tản nhiệt 7 cánh bên trong hốc điều hòa làm mát ECU ----------------
const CoolingFanAssembly: React.FC<{
  pos: [number, number, number];
  shroudMat: THREE.Material;
  darkMat: THREE.Material;
  bladeMat: THREE.Material;
}> = ({ pos, shroudMat, darkMat, bladeMat }) => (
  <group position={pos}>
    {/* Vành miệng gió tròn nhô trên nóc ECU */}
    <mesh material={shroudMat} castShadow receiveShadow>
      <cylinderGeometry args={[0.43, 0.46, 0.09, 28]} />
    </mesh>
    {/* Hốc tối hút gió bên trong */}
    <mesh position={[0, 0.012, 0]} material={darkMat}>
      <cylinderGeometry args={[0.38, 0.38, 0.072, 24]} />
    </mesh>
    {/* Cánh quạt hướng trục 7 lá nghiêng góc */}
    {Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      return (
        <group key={i} position={[0, 0.036, 0]} rotation={[0, a, 0]}>
          <mesh position={[0.19, 0, 0]} rotation={[0.38, 0, 0]} geometry={rbox(0.28, 0.012, 0.078, 0.004)} material={bladeMat} />
        </group>
      );
    })}
    {/* Bầu trục mô-tơ quạt & thanh chữ thập lưới bảo vệ */}
    <mesh position={[0, 0.045, 0]} material={bladeMat}>
      <cylinderGeometry args={[0.085, 0.095, 0.032, 16]} />
    </mesh>
    <mesh position={[0, 0.056, 0]} geometry={rbox(0.80, 0.014, 0.022, 0.004)} material={darkMat} />
    <mesh position={[0, 0.056, 0]} geometry={rbox(0.022, 0.014, 0.80, 0.004)} material={darkMat} />
  </group>
);

// ---------------- Component chính: Đài Radar AN/MPQ-65 trên sơ-mi rơ-moóc M860 ----------------
export const PatriotRadar: React.FC<PatriotRadarProps> = (props = {}) => {
  const {
    azimuth = 0,
    activeGlow = 0.35,
    showBeam = false,
    beamAngle = [0, 0.35],
    wheelSpin = 0,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
  } = props;

  const glow = Math.max(0, Math.min(1.5, activeGlow));

  // ---------- Vật liệu sơn quân sự CARC (matte non-metallic, rõ nét vân camo NATO repeat: 0.42) ----------
  const usBodyPaint = useMemo(
    () =>
      paint({
        color: PAL3D.usBase,
        camo: [PAL3D.usCamo2, PAL3D.usCamo1],
        camoScale: 1.05,
        wear: 0.25,
        dirt: 0.16,
        roughness: 0.72,
        metalness: 0.12,
        repeat: 0.42, // chuẩn cho extrude / extrudeTop (1 m = 1 UV)
        seed: 65,
      }),
    []
  );
  const usBoxPaint = useMemo(
    () =>
      paint({
        color: PAL3D.usBase,
        camo: [PAL3D.usCamo2, PAL3D.usCamo1],
        camoScale: 1.0,
        wear: 0.22,
        dirt: 0.15,
        roughness: 0.70,
        metalness: 0.12,
        repeat: 0.9, // chuẩn cho rbox (UV 0..1)
        seed: 68,
      }),
    []
  );
  const radarFramePaint = useMemo(
    () =>
      paint({
        color: PAL3D.radarFrame,
        camo: [PAL3D.usBase, PAL3D.usCamo2],
        camoScale: 1.15,
        wear: 0.22,
        dirt: 0.12,
        roughness: 0.66,
        metalness: 0.15,
        repeat: 0.42,
        seed: 73,
      }),
    []
  );
  const radarShieldPaint = useMemo(
    () =>
      paint({
        color: PAL3D.radarFace,
        camo: ['#7b8d86', '#95a69f'],
        camoScale: 1.4,
        wear: 0.12,
        dirt: 0.08,
        roughness: 0.58,
        metalness: 0.14,
        repeat: 0.44,
        seed: 81,
      }),
    []
  );
  const darkSteelMat = useMemo(() => plain(PAL3D.darkSteel, 0.50, 0.52), []);
  const steelMat = useMemo(() => plain(PAL3D.steel, 0.28, 0.84), []);
  const rubberMat = useMemo(() => plain(PAL3D.tire, 0.90, 0.05), []);
  const brassMat = useMemo(() => plain(PAL3D.brass, 0.36, 0.78), []);
  const grilleMat = useMemo(() => plain('#1b211a', 0.82, 0.30), []);

  // Vật liệu thấu kính mảng pha chính Ø 2.44 m (>5.000 phần tử) phát xạ theo activeGlow
  const mainLensMat = useMemo(() => {
    const tx = getMainLensTextures();
    return new THREE.MeshStandardMaterial({
      map: tx.map,
      bumpMap: tx.bumpMap,
      bumpScale: 0.028,
      emissive: new THREE.Color(PAL3D.radarElem),
      emissiveMap: tx.emissiveMap,
      emissiveIntensity: glow * 1.95,
      roughness: 0.38,
      metalness: 0.46,
    });
  }, [glow]);

  const subArrayMat = useMemo(() => {
    const tx = getSubArrayTextures();
    return new THREE.MeshStandardMaterial({
      map: tx.map,
      emissive: new THREE.Color(PAL3D.radarElem),
      emissiveMap: tx.emissiveMap,
      emissiveIntensity: glow * 1.25,
      roughness: 0.46,
      metalness: 0.46,
    });
  }, [glow]);

  // ---------- Hình học khung gầm sơ-mi rơ-moóc M860 (dài đúng 10.40 m: -5.20..+5.20, rộng 2.90 m) ----------
  const chassisSpineGeo = useMemo(() => {
    const pts: P2[] = [
      [-5.20, 1.18],
      [-5.20, 1.40],
      [-2.72, 1.40],
      [-2.38, 1.06],
      [5.20, 1.06],
      [5.20, 0.72],
      [4.65, 0.70],
      [3.76, 0.72],
      [3.50, 0.84],
      [1.22, 0.84],
      [0.96, 0.56],
      [-2.32, 0.56],
      [-2.74, 1.02],
      [-4.72, 1.04],
    ];
    return extrude(pts, 0.22, 0.025);
  }, []);

  const frontSideDeckGeo = useMemo(() => rbox(3.46, 0.12, 2.90, 0.02), []);
  const rearSideDeckGeo = useMemo(() => rbox(1.38, 0.12, 2.90, 0.02), []);
  const centerBridgeDeckGeo = useMemo(() => rbox(2.90, 0.12, 1.34, 0.02), []);
  const gooseneckDeckGeo = useMemo(() => rbox(2.48, 0.11, 2.72, 0.02), []);

  // Vè chắn bùn hình thang qua 2 trục bánh đôi (y_top = 1.135 m)
  const fenderGeo = useMemo(() => {
    const pts: P2[] = [
      [0.92, 0.94],
      [1.22, 1.135],
      [3.54, 1.135],
      [3.84, 0.94],
      [3.72, 0.88],
      [3.46, 1.075],
      [1.30, 1.075],
      [1.04, 0.88],
    ];
    return extrude(pts, 0.82, 0.018);
  }, []);

  // Khối máy phát điện chiến thuật 60 kW & cụm điều hòa làm mát (ECU/Chiller) trên cổ ngỗng
  const genBodyGeo = useMemo(() => {
    const pts: P2[] = [
      [-5.06, 1.40],
      [-5.06, 2.34],
      [-4.92, 2.48],
      [-4.02, 2.48],
      [-3.95, 2.38],
      [-3.95, 1.40],
    ];
    return extrude(pts, 2.38, 0.035);
  }, []);

  const ecuBodyGeo = useMemo(() => {
    const pts: P2[] = [
      [-3.88, 1.40],
      [-3.88, 2.48],
      [-3.78, 2.55],
      [-2.86, 2.55],
      [-2.78, 2.46],
      [-2.78, 1.40],
    ];
    return extrude(pts, 2.46, 0.035);
  }, []);

  const exhaustPipeGeo = useMemo(
    () =>
      pipe(
        [
          [-4.82, 2.25, -1.04],
          [-4.82, 2.72, -1.04],
          [-4.92, 2.86, -1.10],
        ],
        0.044,
        16
      ),
    []
  );

  // Khung ống bảo vệ (skid roll-bars) vuông cạnh gọn sắc quanh tổ máy phát điện trên cổ ngỗng
  const genGuardPipes = useMemo(
    () =>
      ([-1.21, 1.21] as const).map((z) =>
        pipe(
          [
            [-5.08, 1.40, z],
            [-5.08, 2.47, z],
            [-5.02, 2.52, z],
            [-4.50, 2.52, z],
            [-3.98, 2.52, z],
            [-3.93, 2.47, z],
            [-3.93, 1.40, z],
          ],
          0.02,
          28
        )
      ),
    []
  );

  const umbilicalPipes = useMemo(
    () => [
      pipe(
        [
          [-2.80, 1.68, 0.44],
          [-2.35, 1.30, 0.44],
          [-1.30, 1.16, 0.36],
          [0.20, 1.16, 0.28],
        ],
        0.048,
        24
      ),
      pipe(
        [
          [-2.80, 1.68, -0.44],
          [-2.35, 1.30, -0.44],
          [-1.30, 1.16, -0.36],
          [0.20, 1.16, -0.28],
        ],
        0.048,
        24
      ),
    ],
    []
  );

  // ---------- Hình học bệ xoay, shelter điện tử & mặt radar bát giác AN/MPQ-65 ----------
  const turntableRingGeo = useMemo(() => {
    const g = lathe(
      [
        [0.01, 0.0],
        [1.30, 0.0],
        [1.30, 0.14],
        [1.24, 0.17],
        [1.28, 0.20],
        [1.28, 0.28],
        [0.01, 0.28],
      ],
      48
    ).clone();
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);

  // Khối shelter điện tử chính chứa 2 đèn phát TWT, xử lý tín hiệu & nguồn cao áp
  const shelterBodyGeo = useMemo(() => {
    const pts: P2[] = [
      [-2.94, 1.36],
      [-2.94, 3.46],
      [-2.82, 3.58],
      [1.24, 3.58],
      [1.64, 3.22],
      [1.92, 1.36],
    ];
    return extrude(pts, 2.54, 0.04);
  }, []);

  // Khoang cổ dẫn sóng trên nóc trước shelter (nối liền với hộp plenum sau lưng radar)
  const upperPlenumNeckGeo = useMemo(() => {
    const pts: P2[] = [
      [0.45, 3.40],
      [0.58, 3.82],
      [1.76, 3.82],
      [2.05, 3.10],
      [1.45, 3.10],
    ];
    return extrude(pts, 1.62, 0.03);
  }, []);

  // Má giằng A-frame hai bên kết nối shelter với khung mặt phẳng radar nghiêng 20°
  const cheekGussetGeo = useMemo(() => {
    const pts: P2[] = [
      [1.22, 1.36],
      [1.18, 3.48],
      [1.96, 3.54],
      [2.82, 1.36],
    ];
    return extrude(pts, 0.18, 0.022);
  }, []);

  // Thang leo bảo dưỡng bằng pipe bên hông shelter + tay vịn lan can nóc
  const ladderRailsGeo = useMemo(
    () => [
      pipe(
        [
          [-2.58, 1.24, 1.33],
          [-2.58, 3.58, 1.33],
          [-2.58, 3.78, 1.24],
          [-2.58, 3.72, 1.10],
        ],
        0.022,
        24
      ),
      pipe(
        [
          [-2.16, 1.24, 1.33],
          [-2.16, 3.58, 1.33],
          [-2.16, 3.78, 1.24],
          [-2.16, 3.72, 1.10],
        ],
        0.022,
        24
      ),
    ],
    []
  );

  const roofHandrailsGeo = useMemo(
    () =>
      ([-1.18, 1.18] as const).map((z) =>
        pipe(
          [
            [-2.76, 3.58, z],
            [-2.76, 3.72, z],
            [-2.66, 3.74, z],
            [-1.20, 3.74, z],
            [0.26, 3.74, z],
            [0.36, 3.72, z],
            [0.36, 3.58, z],
          ],
          0.017,
          28
        )
      ),
    []
  );

  // Hộp dẫn sóng cao tần (waveguide conduits) nối từ shelter TWT vào bộ thu phóng sau lưng mảng pha
  const waveguidePipes = useMemo(
    () => [
      pipe(
        [
          [1.22, 3.46, 0.42],
          [1.68, 3.46, 0.34],
          [2.02, 3.12, 0.20],
        ],
        0.072,
        20
      ),
      pipe(
        [
          [1.22, 3.46, -0.42],
          [1.68, 3.46, -0.34],
          [2.02, 3.12, -0.20],
        ],
        0.072,
        20
      ),
      pipe(
        [
          [1.42, 2.34, 0.0],
          [1.88, 2.40, 0.0],
          [2.24, 2.68, 0.0],
        ],
        0.088,
        20
      ),
    ],
    []
  );

  // Khung mặt phẳng radar bát giác vát góc (~3.65 m × 3.44 m), dày 0.36 m cùng hộp lưng điều áp
  const octShieldGeo = useMemo(() => {
    const hw = 1.825; // rộng 3.65 m
    const hh = 1.72;  // cao 3.44 m dọc mặt nghiêng -> đỉnh đạt đúng ~4.45 m
    const ch = 0.68;
    const pts: P2[] = [
      [-hw + ch, -hh],
      [hw - ch, -hh],
      [hw, -hh + ch],
      [hw, hh - ch],
      [hw - ch, hh],
      [-hw + ch, hh],
      [-hw, hh - ch],
      [-hw, -hh + ch],
    ];
    const g = extrudeTop(pts, 0.32, 0.034).clone();
    g.rotateZ(-Math.PI / 2);
    g.rotateX(Math.PI / 2);
    g.translate(-0.32, 0, 0);
    return g;
  }, []);

  // Hộp vỏ bọc điều áp bát giác phía sau lưng khung mảng pha (chứa mạch lái dịch pha & ống gió làm mát)
  const octRearPlenumGeo = useMemo(() => {
    const hw = 1.48;
    const hh = 1.38;
    const ch = 0.54;
    const pts: P2[] = [
      [-hw + ch, -hh],
      [hw - ch, -hh],
      [hw, -hh + ch],
      [hw, hh - ch],
      [hw - ch, hh],
      [-hw + ch, hh],
      [-hw, hh - ch],
      [-hw, -hh + ch],
    ];
    const g = extrudeTop(pts, 0.24, 0.04).clone();
    g.rotateZ(-Math.PI / 2);
    g.rotateX(Math.PI / 2);
    g.translate(-0.54, 0, 0);
    return g;
  }, []);

  // Tấm mặt phẳng nền composite đặt âm trong gờ viền bát giác
  const octInnerPanelGeo = useMemo(() => {
    const hw = 1.71;
    const hh = 1.605;
    const ch = 0.62;
    const pts: P2[] = [
      [-hw + ch, -hh],
      [hw - ch, -hh],
      [hw, -hh + ch],
      [hw, hh - ch],
      [hw - ch, hh],
      [-hw + ch, hh],
      [-hw, hh - ch],
      [-hw, -hh + ch],
    ];
    const g = extrudeTop(pts, 0.05, 0.01).clone();
    g.rotateZ(-Math.PI / 2);
    g.rotateX(Math.PI / 2);
    g.translate(-0.02, 0, 0);
    return g;
  }, []);

  // Vòng viền kim loại tiện bậc bao quanh thấu kính mảng pha tròn chính Ø 2.44 m (R = 1.22 m)
  const mainBezelGeo = useMemo(
    () =>
      lathe(
        [
          [LENS_R - 0.012, 0.01],
          [LENS_R - 0.012, 0.072],
          [LENS_R + 0.026, 0.082],
          [LENS_R + 0.080, 0.076],
          [LENS_R + 0.102, 0.044],
          [LENS_R + 0.102, 0.0],
          [LENS_R - 0.012, 0.0],
        ],
        72
      ),
    []
  );

  // Hộp thu phát monopulse quang-vi-ba (space-fed feed horn housing) sau lưng mảng pha
  const rearFeedConeGeo = useMemo(
    () =>
      lathe(
        [
          [0.20, -1.05],
          [0.38, -0.88],
          [0.62, -0.52],
          [0.88, -0.15],
          [0.01, -0.15],
        ],
        32
      ),
    []
  );

  // ---------- Tọa độ đinh tán Rivets (cố định, tất định) ----------
  const faceRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    const nRing = 36;
    for (let i = 0; i < nRing; i++) {
      const a = (i / nRing) * Math.PI * 2;
      pts.push([0.08, LENS_FY + Math.cos(a) * (LENS_R + 0.058), Math.sin(a) * (LENS_R + 0.058)]);
    }
    const hw = 1.765, hh = 1.66, ch = 0.65;
    const verts: [number, number][] = [
      [-hh, -hw + ch],
      [-hh, hw - ch],
      [-hh + ch, hw],
      [hh - ch, hw],
      [hh, hw - ch],
      [hh, -hw + ch],
      [hh - ch, -hw],
      [-hh + ch, -hw],
    ];
    for (let e = 0; e < verts.length; e++) {
      const [y0, z0] = verts[e];
      const [y1, z1] = verts[(e + 1) % verts.length];
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const u = (s + 0.5) / steps;
        pts.push([0.032, y0 + (y1 - y0) * u, z0 + (z1 - z0) * u]);
      }
    }
    return pts;
  }, []);

  const shelterRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let x = -2.78; x <= 1.12; x += 0.34) {
      pts.push([x, 3.50, 1.275], [x, 3.50, -1.275], [x, 1.46, 1.275], [x, 1.46, -1.275]);
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([Math.cos(a) * 1.25, 1.23, Math.sin(a) * 1.25]);
    }
    return pts;
  }, []);

  // ---------- Hình học & vật liệu chùm nón sóng điện tử (showBeam) ----------
  const beamOuterGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(3.85, 0.88, 42, 40, 1, true);
    g.rotateZ(-Math.PI / 2);
    g.translate(21, 0, 0);
    return g;
  }, []);
  const beamMidGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(2.1, 0.52, 34, 32, 1, true);
    g.rotateZ(-Math.PI / 2);
    g.translate(17, 0, 0);
    return g;
  }, []);
  const beamCoreGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.68, 0.14, 44, 24, 1, true);
    g.rotateZ(-Math.PI / 2);
    g.translate(22, 0, 0);
    return g;
  }, []);

  const beamOuterMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PAL3D.cyanBeam,
        alphaMap: getBeamAlphaMap(),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    []
  );
  const beamMidMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PAL3D.cyanBeam,
        alphaMap: getBeamAlphaMap(),
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    []
  );
  const beamCoreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#b8f7ff',
        alphaMap: getBeamAlphaMap(),
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    []
  );

  const [beamYaw, beamPitch] = beamAngle;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ==================== 1. KHUNG GẦM SƠ-MI RƠ-MOÓC M860 ==================== */}
      {/* Hai dầm dọc chữ I chịu lực chính (có bậc cổ ngỗng) + gân sườn gia cường cổ ngỗng */}
      <mesh position={[0, 0, 0.58]} geometry={chassisSpineGeo} material={usBodyPaint} castShadow receiveShadow />
      <mesh position={[0, 0, -0.58]} geometry={chassisSpineGeo} material={usBodyPaint} castShadow receiveShadow />
      {[-4.55, -3.95, -3.35, -2.80].map((gx) => (
        <mesh key={`grib-${gx}`} position={[gx, 1.20, 0]} geometry={rbox(0.08, 0.30, 1.38, 0.01)} material={darkSteelMat} castShadow />
      ))}

      {/* Các mặt sàn thao tác rộng 2.90 m & gờ sườn biên có đèn phản quang */}
      <mesh position={[-3.96, 1.35, 0]} geometry={gooseneckDeckGeo} material={usBoxPaint} castShadow receiveShadow />
      <mesh position={[-0.73, 1.02, 0]} geometry={frontSideDeckGeo} material={usBoxPaint} castShadow receiveShadow />
      <mesh position={[2.38, 1.02, 0]} geometry={centerBridgeDeckGeo} material={usBoxPaint} castShadow receiveShadow />
      <mesh position={[4.51, 1.02, 0]} geometry={rearSideDeckGeo} material={usBoxPaint} castShadow receiveShadow />
      {([-1.445, 1.445] as const).map((z) => (
        <group key={`sill-${z}`}>
          <mesh position={[-0.73, 1.03, z]} geometry={rbox(3.44, 0.14, 0.04, 0.008)} material={darkSteelMat} />
          <mesh position={[4.51, 1.03, z]} geometry={rbox(1.36, 0.14, 0.04, 0.008)} material={darkSteelMat} />
          {/* Phản quang định vị thân rơ-moóc */}
          {[-2.1, -0.6, 0.7, 4.1, 4.95].map((mx, idx) => (
            <mesh
              key={mx}
              position={[mx, 1.03, z + (z > 0 ? 0.018 : -0.018)]}
              geometry={rbox(0.11, 0.045, 0.015, 0.004)}
              material={plain(idx === 4 ? '#b62424' : '#d68b1c', 0.35, 0.2)}
            />
          ))}
        </group>
      ))}

      {/* Đĩa chốt kéo mâm xoay (Kingpin), cụm đầu nối hơi phanh cổ ngỗng & chân đỗ gập gọn khi triển khai */}
      <mesh position={[-4.68, 1.03, 0]} material={darkSteelMat}>
        <cylinderGeometry args={[0.38, 0.38, 0.06, 24]} />
      </mesh>
      <mesh position={[-4.68, 0.94, 0]} material={steelMat}>
        <cylinderGeometry args={[0.055, 0.055, 0.14, 16]} />
      </mesh>
      <mesh position={[-5.18, 1.29, 0]} geometry={rbox(0.06, 0.22, 2.70, 0.015)} material={darkSteelMat} castShadow />
      {/* Chân đỗ hành quân đã thu gọn sát dưới bậc cổ ngỗng (tránh lơ lửng giữa không trung) */}
      {([-0.92, 0.92] as const).map((z) => (
        <group key={`lg-${z}`} position={[-2.62, 0.84, z]}>
          <mesh geometry={rbox(0.16, 0.38, 0.16, 0.015)} material={darkSteelMat} castShadow />
          <mesh position={[0, -0.20, 0]} geometry={rbox(0.24, 0.045, 0.22, 0.01)} material={darkSteelMat} />
        </group>
      ))}

      {/* Vè chắn bùn hình thang & tấm chắn bùn cao su 2 bên */}
      <mesh position={[0, 0, 1.04]} geometry={fenderGeo} material={usBodyPaint} castShadow receiveShadow />
      <mesh position={[0, 0, -1.04]} geometry={fenderGeo} material={usBodyPaint} castShadow receiveShadow />
      {([-1.04, 1.04] as const).map((z) => (
        <mesh key={`flap-${z}`} position={[3.84, 0.56, z]} geometry={rbox(0.03, 0.68, 0.74, 0.008)} material={rubberMat} castShadow />
      ))}

      {/* Hộp đồ nghề & tủ cáp gầm rơ-moóc */}
      {([-1.08, 1.08] as const).map((z) => (
        <group key={`box-${z}`}>
          <mesh position={[-1.42, 0.76, z]} geometry={rbox(1.18, 0.38, 0.56, 0.025)} material={usBoxPaint} castShadow />
          <mesh position={[-0.08, 0.76, z]} geometry={rbox(0.96, 0.38, 0.56, 0.025)} material={darkSteelMat} castShadow />
        </group>
      ))}

      {/* Cản sau (+5.20 m), cụm đèn hậu quân sự, móc kéo & 2 tang cuốn cáp tín hiệu */}
      <mesh position={[5.15, 0.85, 0]} geometry={rbox(0.11, 0.36, 2.88, 0.02)} material={usBoxPaint} castShadow />
      <mesh position={[5.20, 0.84, 0]} geometry={rbox(0.08, 0.14, 0.22, 0.02)} material={darkSteelMat} castShadow />
      {([-1.20, 1.20] as const).map((z) => (
        <group key={`tail-${z}`}>
          <mesh position={[5.19, 0.86, z]} geometry={rbox(0.05, 0.14, 0.34, 0.015)} material={darkSteelMat} />
          <mesh position={[5.21, 0.86, z + (z > 0 ? 0.07 : -0.07)]} geometry={rbox(0.03, 0.08, 0.10, 0.01)} material={plain('#ad2222', 0.35, 0.2)} />
          <mesh position={[5.21, 0.86, z - (z > 0 ? 0.07 : -0.07)]} geometry={rbox(0.03, 0.08, 0.09, 0.01)} material={plain('#d48618', 0.35, 0.2)} />
        </group>
      ))}
      {([-1.02, 1.02] as const).map((z) => (
        <group key={`reel-${z}`} position={[4.68, 1.32, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={darkSteelMat} castShadow>
            <cylinderGeometry args={[0.23, 0.23, 0.28, 20]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={rubberMat}>
            <cylinderGeometry args={[0.18, 0.18, 0.24, 18]} />
          </mesh>
          <mesh position={[0, -0.14, 0]} geometry={rbox(0.32, 0.24, 0.34, 0.02)} material={darkSteelMat} />
        </group>
      ))}

      {/* 2 trục bánh đôi (8 bánh r = 0.54, width = 0.34 chạm đúng y = 0) + cầu trục & dầm nhíp cân bằng */}
      {([1.70, 3.06] as const).map((ax) => (
        <group key={`axle-${ax}`}>
          <mesh position={[ax, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkSteelMat} castShadow>
            <cylinderGeometry args={[0.085, 0.085, 2.38, 16]} />
          </mesh>
          <Wheel r={0.54} width={0.34} spin={wheelSpin} tire={PAL3D.tire} rim="#536044" bolts={10} position={[ax, 0.54, 0.86]} />
          <Wheel r={0.54} width={0.34} spin={wheelSpin} tire={PAL3D.tire} rim="#536044" bolts={10} position={[ax, 0.54, 1.23]} />
          <group position={[ax, 0.54, -0.86]} rotation={[0, Math.PI, 0]}>
            <Wheel r={0.54} width={0.34} spin={-wheelSpin} tire={PAL3D.tire} rim="#536044" bolts={10} />
          </group>
          <group position={[ax, 0.54, -1.23]} rotation={[0, Math.PI, 0]}>
            <Wheel r={0.54} width={0.34} spin={-wheelSpin} tire={PAL3D.tire} rim="#536044" bolts={10} />
          </group>
        </group>
      ))}
      {([-0.64, 0.64] as const).map((z) => (
        <mesh key={`bogie-${z}`} position={[2.38, 0.62, z]} geometry={rbox(1.52, 0.16, 0.14, 0.02)} material={darkSteelMat} castShadow />
      ))}

      {/* 4 chân chống thuỷ lực vươn góc chạm chuẩn y = 0 (nằm gọn trong chiều dài 10.40 m) */}
      <OutriggerLeg anchor={[-2.30, 1.36]} pad={[-2.82, 1.76]} bodyMat={usBoxPaint} darkMat={darkSteelMat} steelMat={steelMat} />
      <OutriggerLeg anchor={[-2.30, -1.36]} pad={[-2.82, -1.76]} bodyMat={usBoxPaint} darkMat={darkSteelMat} steelMat={steelMat} />
      <OutriggerLeg anchor={[4.36, 1.36]} pad={[4.76, 1.76]} bodyMat={usBoxPaint} darkMat={darkSteelMat} steelMat={steelMat} />
      <OutriggerLeg anchor={[4.36, -1.36]} pad={[4.76, -1.76]} bodyMat={usBoxPaint} darkMat={darkSteelMat} steelMat={steelMat} />

      {/* ==================== 2. CỤM MÁY PHÁT ĐIỆN & ĐIỀU HÒA LÀM MÁT TRÊN CỔ NGỖNG ==================== */}
      {/* Máy phát điện 60 kW phía trước cổ ngỗng */}
      <mesh geometry={genBodyGeo} material={usBodyPaint} castShadow receiveShadow />
      {genGuardPipes.map((g, i) => (
        <mesh key={`gg-${i}`} geometry={g} material={darkSteelMat} castShadow />
      ))}
      {([-1.20, 1.20] as const).map((z) => (
        <group key={`gen-side-${z}`}>
          <mesh position={[-4.56, 1.94, z]} geometry={rbox(0.80, 0.66, 0.03, 0.008)} material={grilleMat} />
          <mesh position={[-4.12, 1.94, z]} geometry={rbox(0.24, 0.56, 0.035, 0.008)} material={darkSteelMat} />
          <mesh position={[-4.12, 2.02, z + (z > 0 ? 0.015 : -0.015)]} geometry={rbox(0.16, 0.18, 0.015, 0.004)} material={steelMat} />
        </group>
      ))}
      <mesh position={[-5.07, 1.92, 0]} geometry={rbox(0.03, 0.68, 1.56, 0.01)} material={grilleMat} />
      {/* Ống xả kèm lồng bảo vệ chống bỏng */}
      <mesh geometry={exhaustPipeGeo} material={darkSteelMat} castShadow />
      <mesh position={[-4.82, 2.54, -1.04]} material={steelMat} castShadow>
        <cylinderGeometry args={[0.068, 0.068, 0.34, 16]} />
      </mesh>
      <mesh position={[-4.92, 2.88, -1.10]} material={steelMat}>
        <cylinderGeometry args={[0.062, 0.055, 0.035, 14]} />
      </mesh>

      {/* Cụm điều hòa & làm mát chất lỏng ECU / Chiller phía sau cổ ngỗng (2 quạt cánh thật) */}
      <mesh geometry={ecuBodyGeo} material={usBodyPaint} castShadow receiveShadow />
      <CoolingFanAssembly pos={[-3.33, 2.56, -0.58]} shroudMat={usBoxPaint} darkMat={grilleMat} bladeMat={steelMat} />
      <CoolingFanAssembly pos={[-3.33, 2.56, 0.58]} shroudMat={usBoxPaint} darkMat={grilleMat} bladeMat={steelMat} />
      {([-1.24, 1.24] as const).map((z) => (
        <mesh key={`ecu-gr-${z}`} position={[-3.33, 1.96, z]} geometry={rbox(0.86, 0.74, 0.03, 0.008)} material={grilleMat} />
      ))}
      {umbilicalPipes.map((g, idx) => (
        <mesh key={`umb-${idx}`} geometry={g} material={rubberMat} castShadow />
      ))}

      {/* Đế vòng bi cố định của bàn xoay trên sàn rơ-moóc */}
      <mesh position={[X_PIVOT, 1.08, 0]} geometry={turntableRingGeo} material={darkSteelMat} castShadow receiveShadow />

      {/* ==================== 3. BỆ XOAY LỚN, SHELTER ĐIỆN TỬ & MẶT RADAR AN/MPQ-65 ==================== */}
      <group position={[X_PIVOT, 0, 0]} rotation={[0, azimuth, 0]}>
        {/* Dầm khung đế xoay */}
        <mesh position={[-0.18, 1.31, 0]} geometry={rbox(5.56, 0.12, 2.52, 0.025)} material={darkSteelMat} castShadow receiveShadow />

        {/* Khối Shelter điện tử vuông vức phía sau + cổ dẫn sóng trên nóc */}
        <mesh geometry={shelterBodyGeo} material={usBodyPaint} castShadow receiveShadow />
        <mesh geometry={upperPlenumNeckGeo} material={usBodyPaint} castShadow receiveShadow />

        {/* Cửa khoang thiết bị, gân tăng cứng & hốc tản nhiệt đèn phát TWT hai bên hông shelter */}
        {([-1, 1] as const).map((side) => (
          <group key={`sh-side-${side}`}>
            <mesh position={[-1.65, 2.38, side * 1.32]} geometry={rbox(1.38, 1.18, 0.14, 0.025)} material={usBoxPaint} castShadow />
            <mesh position={[-1.65, 2.38, side * 1.395]} geometry={rbox(1.16, 0.92, 0.02, 0.008)} material={grilleMat} />
            <mesh position={[-0.10, 2.36, side * 1.275]} geometry={rbox(1.12, 1.54, 0.03, 0.01)} material={darkSteelMat} />
            <mesh position={[-0.10, 2.36, side * 1.285]} geometry={rbox(1.04, 1.46, 0.02, 0.008)} material={usBoxPaint} />
            <mesh position={[0.30, 2.34, side * 1.305]} geometry={rbox(0.05, 0.18, 0.04, 0.008)} material={steelMat} />
            {[-2.66, -0.86, 0.68, 1.16].map((rx) => (
              <mesh key={`rib-${rx}`} position={[rx, 2.46, side * 1.28]} geometry={rbox(0.065, 2.00, 0.05, 0.01)} material={usBoxPaint} castShadow />
            ))}
          </group>
        ))}

        {/* Chi tiết mặt hậu shelter (-X): cửa thông gió, tủ đấu nối, bình cứu hoả */}
        <mesh position={[-2.96, 2.44, -0.46]} geometry={rbox(0.06, 1.12, 0.96, 0.015)} material={grilleMat} />
        <mesh position={[-2.97, 2.16, 0.62]} geometry={rbox(0.10, 0.78, 0.66, 0.02)} material={darkSteelMat} castShadow />
        <mesh position={[-3.00, 1.88, 1.08]} material={plain('#a6262e', 0.42, 0.28)} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.46, 16]} />
        </mesh>

        {/* Giá đỡ cao su trên nóc shelter + lan can bảo dưỡng bằng pipe */}
        {([-0.86, 0.86] as const).map((z) => (
          <group key={`cradle-${z}`}>
            <mesh position={[-2.35, 3.65, z]} geometry={rbox(0.36, 0.14, 0.28, 0.02)} material={darkSteelMat} castShadow />
            <mesh position={[-2.35, 3.73, z]} geometry={rbox(0.32, 0.05, 0.24, 0.01)} material={rubberMat} />
            <mesh position={[-0.65, 3.63, z]} geometry={rbox(0.32, 0.10, 0.26, 0.02)} material={darkSteelMat} />
          </group>
        ))}
        {roofHandrailsGeo.map((g, i) => (
          <mesh key={`rh-${i}`} geometry={g} material={darkSteelMat} castShadow />
        ))}

        {/* Thang leo bảo dưỡng bằng pipe bên hông shelter */}
        {ladderRailsGeo.map((g, i) => (
          <mesh key={`lrail-${i}`} geometry={g} material={darkSteelMat} castShadow />
        ))}
        {Array.from({ length: 8 }, (_, i) => {
          const ry = 1.48 + i * 0.28;
          return (
            <mesh key={`rung-${i}`} position={[-2.37, ry, 1.33]} rotation={[0, 0, Math.PI / 2]} material={steelMat} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.42, 10]} />
            </mesh>
          );
        })}

        {/* Hai má giằng A-frame & cặp xi-lanh thuỷ lực nâng giữ mặt radar ở góc nghiêng 20° */}
        <mesh position={[0, 0, 1.08]} geometry={cheekGussetGeo} material={usBodyPaint} castShadow receiveShadow />
        <mesh position={[0, 0, -1.08]} geometry={cheekGussetGeo} material={usBodyPaint} castShadow receiveShadow />
        {([-0.76, 0.76] as const).map((z) => (
          <group key={`elev-cyl-${z}`}>
            <mesh position={[1.64, 2.02, z]} rotation={[0, 0, -0.44]} material={darkSteelMat} castShadow>
              <cylinderGeometry args={[0.105, 0.105, 1.15, 20]} />
            </mesh>
            <mesh position={[1.96, 2.70, z]} rotation={[0, 0, -0.44]} material={steelMat} castShadow>
              <cylinderGeometry args={[0.068, 0.068, 1.05, 18]} />
            </mesh>
          </group>
        ))}

        {/* Hộp dẫn sóng cao tần (waveguide trunks) nối từ shelter ra sau lưng mặt mảng pha */}
        {waveguidePipes.map((g, i) => (
          <mesh key={`wg-${i}`} geometry={g} material={darkSteelMat} castShadow />
        ))}

        {/* Đinh tán Rivets quanh shelter & vòng bàn xoay */}
        <Rivets points={shelterRivets} r={0.017} color="#7d8c6e" />

        {/* ==================== 4. KHUNG MẶT PHẲNG RADAR BÁT GIÁC NGHIÊNG 20° ==================== */}
        <group position={[LX_FACE, Y_FACE, 0]} rotation={[0, 0, TILT_RAD]}>
          {/* Khung vỏ bát giác vát góc (~3.65 m × 3.44 m) & hộp điều áp phía sau lưng */}
          <mesh geometry={octShieldGeo} material={radarFramePaint} castShadow receiveShadow />
          <mesh geometry={octRearPlenumGeo} material={usBodyPaint} castShadow receiveShadow />
          {/* Tấm nền mặt mảng pha composite xám lục chiến thuật */}
          <mesh geometry={octInnerPanelGeo} material={radarShieldPaint} receiveShadow />

          {/* Các đường rãnh ghép tấm giáp mô-đun & khoá kẹp biên trên mặt phẳng bát giác */}
          {([-1.04, 1.04] as const).map((s) => (
            <group key={`seam-${s}`}>
              <mesh position={[0.028, 1.38, s * 0.88]} geometry={rbox(0.012, 0.42, 0.016, 0.003)} material={darkSteelMat} />
              <mesh position={[0.028, -1.06, s * 1.18]} geometry={rbox(0.012, 0.016, 0.82, 0.003)} material={darkSteelMat} />
              <mesh position={[0.028, 0.23, s * 1.52]} geometry={rbox(0.012, 0.016, 0.42, 0.003)} material={darkSteelMat} />
            </group>
          ))}

          {/* Gờ viền nhô chắn bảo vệ chu vi khung bát giác */}
          {([
            [0.03, 1.69, 0, 0.08, 0.065, 2.24],
            [0.03, -1.69, 0, 0.08, 0.065, 2.24],
            [0.03, 0, 1.795, 0.08, 2.06, 0.065],
            [0.03, 0, -1.795, 0.08, 2.06, 0.065],
          ] as const).map(([px, py, pz, sx, sy, sz], idx) => (
            <mesh key={`lip-${idx}`} position={[px, py, pz]} geometry={rbox(sx, sy, sz, 0.014)} material={radarFramePaint} castShadow />
          ))}

          {/* Khuyên cẩu thép trên đỉnh khung radar (đạt đỉnh cao tổng thể ~4.45 m) */}
          {([-0.92, 0.92] as const).map((fz) => (
            <mesh key={`lug-${fz}`} position={[-0.08, 1.735, fz]} geometry={rbox(0.14, 0.095, 0.06, 0.015)} material={darkSteelMat} castShadow />
          ))}

          {/* Gân xương chịu lực dạng ô cờ & hộp thu phát dẫn sóng phía sau lưng khung radar (-fx) */}
          {[-1.08, -0.34, 0.40, 1.12].map((fy) => (
            <mesh key={`brib-h-${fy}`} position={[-0.56, fy, 0]} geometry={rbox(0.08, 0.08, 2.42, 0.012)} material={darkSteelMat} castShadow />
          ))}
          {[-0.96, 0, 0.96].map((fz) => (
            <mesh key={`brib-v-${fz}`} position={[-0.56, 0.04, fz]} geometry={rbox(0.08, 2.48, 0.08, 0.012)} material={darkSteelMat} castShadow />
          ))}
          <mesh position={[-0.36, LENS_FY, 0]} geometry={rearFeedConeGeo} material={usBoxPaint} castShadow />
          <mesh position={[-1.44, LENS_FY, 0]} geometry={rbox(0.30, 0.46, 0.50, 0.03)} material={darkSteelMat} castShadow />

          {/* ---- THẤU KÍNH MẢNG PHA TRÒN CHÍNH Ø 2.44 m (> 5.000 PHẦN TỬ PHÁT THU) ---- */}
          <group position={[0.022, LENS_FY, 0]}>
            {/* Vòng viền kim loại tiện bậc bao ngoài R = 1.22..1.32 m */}
            <mesh geometry={mainBezelGeo} material={darkSteelMat} castShadow receiveShadow />
            {/* Mặt đĩa mảng pha tổ ong 5.060+ phần tử có bumpMap & emissiveMap */}
            <mesh position={[0.03, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mainLensMat} receiveShadow>
              <circleGeometry args={[LENS_R, 72]} />
            </mesh>
            {/* Gân mô-đun subarray & chốt chuẩn trực 3D nổi thực tế trên bề mặt thấu kính (0% Moiré) */}
            <PhasedLensSubarray3D />
            {/* 4 đầu dò hiệu chuẩn pha (calibration probes) đặt đối xứng chữ thập trên vành bezel */}
            {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((ang, idx) => (
              <mesh
                key={`cal-${idx}`}
                position={[0.086, Math.cos(ang) * (LENS_R + 0.032), Math.sin(ang) * (LENS_R + 0.032)]}
                geometry={rbox(0.055, 0.09, 0.09, 0.012)}
                material={brassMat}
                castShadow
              />
            ))}
          </group>

          {/* Cảm biến chuẩn trực quang học trên đỉnh thấu kính chính */}
          <mesh position={[0.05, 1.58, 0]} geometry={rbox(0.09, 0.10, 0.22, 0.015)} material={darkSteelMat} castShadow />

          {/* ---- CÁC MẢNG ĂNG-TEN PHỤ CHỮ NHẬT ĐẶC TRƯNG CỦA AN/MPQ-65 ---- */}
          {/* 1. Mảng hỏi đáp nhận diện địch-ta IFF Interrogator 4 khoang (dài ngang phía dưới bên trái) */}
          <SubArrayModule pos={[0.025, -1.36, -0.44]} w={1.38} h={0.28} bays={4} frameMat={darkSteelMat} faceMat={subArrayMat} />

          {/* 2. Mảng ăng-ten phụ dẫn đường tên lửa TVM (Track-Via-Missile) phía dưới bên phải */}
          <SubArrayModule pos={[0.025, -1.31, 0.79]} w={0.68} h={0.40} bays={2} frameMat={darkSteelMat} faceMat={subArrayMat} />

          {/* 3. Năm mảng ăng-ten bù búp sóng phụ (Sidelobe Canceller - SLC) ở các góc mặt bát giác */}
          <SubArrayModule pos={[0.022, 1.18, -1.18]} w={0.32} h={0.24} frameMat={darkSteelMat} faceMat={subArrayMat} />
          <SubArrayModule pos={[0.022, 1.18, 1.18]} w={0.32} h={0.24} frameMat={darkSteelMat} faceMat={subArrayMat} />
          <SubArrayModule pos={[0.022, -0.36, -1.48]} w={0.26} h={0.46} bays={2} frameMat={darkSteelMat} faceMat={subArrayMat} />
          <SubArrayModule pos={[0.022, -0.36, 1.48]} w={0.26} h={0.46} bays={2} frameMat={darkSteelMat} faceMat={subArrayMat} />
          <SubArrayModule pos={[0.022, -0.96, -1.32]} w={0.30} h={0.22} frameMat={darkSteelMat} faceMat={subArrayMat} />

          {/* Đinh tán Rivets sắc nét quanh mặt phẳng radar & vòng viền thấu kính chính */}
          <Rivets points={faceRivets} r={0.015} color="#b2bcb6" />
        </group>

        {/* ==================== 5. CHÙM NÓN SÓNG QUÉT ĐIỆN TỬ (TUỲ CHỌN showBeam) ==================== */}
        {showBeam && (
          <group position={[BEAM_ORIGIN_LX, BEAM_ORIGIN_Y, 0]} rotation={[0, beamYaw, 0]}>
            <group rotation={[0, 0, beamPitch]}>
              <mesh geometry={beamOuterGeo} material={beamOuterMat} />
              <mesh geometry={beamMidGeo} material={beamMidMat} />
              <mesh geometry={beamCoreGeo} material={beamCoreMat} />
              <mesh position={[0.18, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[0.85, 1.18, 48]} />
                <meshBasicMaterial
                  color={PAL3D.cyanBeam}
                  transparent
                  opacity={0.32}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
            </group>
          </group>
        )}
      </group>
    </group>
  );
};

export const MODELS: ModelSet = {
  PatriotRadar: { C: PatriotRadar as React.FC, size: 10.5, center: [0, 2.1, 0] },
};
export default PatriotRadar;
