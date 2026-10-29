// Tổ hợp phòng không tầm xa 8×8 SamBattery (kiểu S-400 / HQ-9 TELAR tỉ lệ 1:1)
// và hai vũ khí bay HypersonicMissile (22 ft / 6.71 m, 7.000 lb) + AMRAAM (AIM-120D 12 ft / 3.66 m).
// Hệ đơn vị: 1 đơn vị = 1 mét thật, mũi hướng +X, đỉnh hướng +Y; bánh xe và chân chống SamBattery chạm đúng y = 0.
import React, { useMemo } from 'react';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { P } from '../palette';

export type SamBatteryProps = {
  elev?: number;
  azim?: number;
  radarSpin?: number;
  wheelSpin?: number;
  openTubes?: number;
  /** Alias tương thích bảng SHOT_PLAN */
  hideTube?: number;
};

export type MissileProps = {
  flame?: number;
};

// ============================================================================
// VẬT LIỆU DÙNG CHUNG (cache tự động trong @lib/3d/materials)
// ============================================================================
// Thân xe & cabin dựng bằng extrude (1 m = 1 UV) -> repeat: 0.42 để mảng ngụy trang sắc nét, không bị vụn
const getSamHullPaint = () =>
  paint({
    color: P.samGreen,
    camo: [P.samDark, '#6e6a56'],
    camoScale: 1.3,
    wear: 0.25,
    dirt: 0.35,
    roughness: 0.68,
    metalness: 0.25,
    repeat: 0.42,
    seed: 400,
  });

// Ống phóng dựng bằng lathe (UV 0..1 trên chiều dài 7.20 m) -> đồng bộ mật độ vân camo 3 màu với thân xe
const getSamTubePaint = () =>
  paint({
    color: P.samGreen,
    camo: [P.samDark, '#6e6a56'],
    camoScale: 1.3,
    wear: 0.25,
    dirt: 0.32,
    roughness: 0.66,
    metalness: 0.26,
    repeat: 2.1,
    seed: 400,
  });

// Sơn olive-khaki phụ trợ cho khung gia cường, bệ radar, nắp ống (giữ độ tương phản rõ chi tiết dưới bóng đổ)
const getSamOliveTrim = () =>
  paint({
    color: '#5c694e',
    camo: [P.samGreen, '#726e58'],
    camoScale: 1.4,
    wear: 0.26,
    dirt: 0.28,
    roughness: 0.65,
    metalness: 0.28,
    repeat: 0.5,
    seed: 407,
  });

// ============================================================================
// 1. SAM BATTERY — Xe bệ phóng kiêm đài radar điều khiển hỏa lực 8×8 (13.40 × 3.10 × 4.20 m)
// ============================================================================
const AXLE_X = [4.68, 2.88, -2.42, -4.22] as const;
const WHEEL_R = 0.62;
const WHEEL_W = 0.44;
const WHEEL_Z = 1.31;

// Biên dạng nhìn ngang cabin bọc thép vát đầu hầm hố (x: +3.72 .. +6.66, y: 0.84 .. 2.92)
const CABIN_SIDE: P2[] = [
  [3.72, 1.38],
  [3.92, 1.38],
  [4.16, 1.54],
  [5.22, 1.54],
  [5.54, 1.2],
  [5.78, 0.86],
  [6.56, 0.86],
  [6.66, 1.12],
  [6.54, 1.66],
  [6.14, 1.82],
  [5.66, 2.74],
  [5.72, 2.8],
  [5.56, 2.92],
  [3.78, 2.92],
  [3.72, 2.78],
];

// Biên dạng khoang động cơ & máy phát điện sau cabin (x: +1.96 .. +3.66, y: 1.38 .. 2.74)
const ENGINE_BAY_SIDE: P2[] = [
  [1.96, 1.38],
  [2.14, 1.38],
  [2.36, 1.54],
  [3.42, 1.54],
  [3.66, 1.38],
  [3.66, 2.74],
  [3.42, 2.74],
  [2.16, 2.68],
  [1.96, 2.52],
];

// Khoang điều khiển điện tử C2 & máy phát phụ giữa thân (x: -1.55 .. +0.35, y: 1.28 .. 2.16)
const C2_SHELTER_SIDE: P2[] = [
  [-1.55, 1.28],
  [0.35, 1.28],
  [0.35, 2.14],
  [0.18, 2.24],
  [-1.36, 2.24],
  [-1.55, 2.08],
];

// Biên dạng vè chắn bùn cụm 2 cầu sau (x: -5.12 .. -1.54)
const REAR_FENDER_SIDE: P2[] = [
  [-5.12, 0.64],
  [-4.94, 1.4],
  [-1.72, 1.4],
  [-1.54, 0.66],
  [-1.68, 0.66],
  [-1.86, 1.28],
  [-4.8, 1.28],
  [-4.98, 0.64],
];

/** Tạo ống phóng tên lửa dài 7.20 m (x: -0.55 .. +6.65), bán kính thân 0.43 m + 10 gân gia cường ngang R=0.466 m */
const buildTubeGeo = (isOpen: boolean) => {
  const x0 = -0.55;
  const x1 = 6.65;
  const rBase = 0.43;
  const rRib = 0.466;
  const pts: P2[] = [
    [0.001, x0],
    [0.36, x0],
    [0.478, x0 + 0.04],
    [0.478, x0 + 0.2],
    [rBase, x0 + 0.22],
  ];
  const ribCenters = [0.25, 0.96, 1.67, 2.38, 3.09, 3.8, 4.51, 5.22, 5.93];
  for (const rc of ribCenters) {
    pts.push(
      [rBase, rc - 0.06],
      [rRib, rc - 0.044],
      [rRib, rc + 0.044],
      [rBase, rc + 0.06],
    );
  }
  // Vành đầu miệng ống phóng tại x1 = 6.65 (tổng chiều dài đúng 7.20 m)
  pts.push([rBase, x1 - 0.2], [0.474, x1 - 0.17], [0.474, x1]);
  if (isOpen) {
    pts.push([0.385, x1], [0.385, x1 - 0.62], [0.001, x1 - 0.62]);
  } else {
    pts.push([0.425, x1], [0.425, x1 - 0.02], [0.001, x1 - 0.02]);
  }
  return lathe(pts, 32);
};

// Chân chống thủy lực hạ chạm đúng mặt phẳng y = 0
const OutriggerJack: React.FC<{ x: number; side: 1 | -1 }> = ({ x, side }) => {
  const hullMat = getSamHullPaint();
  const trimMat = getSamOliveTrim();
  const chromeMat = plain('#dce5ef', 0.16, 0.92);
  const darkSteel = plain('#333a34', 0.56, 0.52);
  const hazardMat = plain('#cf9228', 0.45, 0.2);
  const zOut = side * 1.74;
  const zArm = side * 1.36;
  return (
    <group>
      {/* Dầm ngang vươn từ khung gầm ra z = ±1.74 */}
      <mesh position={[x, 0.94, zArm]} geometry={rbox(0.32, 0.22, 0.86, 0.03)} material={trimMat} castShadow receiveShadow />
      {/* Vạch vàng cảnh báo trên đầu dầm chân chống */}
      <mesh position={[x, 0.95, side * 1.62]} geometry={rbox(0.33, 0.08, 0.16, 0.01)} material={hazardMat} />
      {/* Thanh giằng chéo gia cường */}
      <mesh
        position={[x, 0.78, side * 1.42]}
        rotation={[side * 0.45, 0, 0]}
        geometry={rbox(0.18, 0.12, 0.58, 0.02)}
        material={darkSteel}
        castShadow
      />
      {/* Vỏ xi-lanh thủy lực đứng */}
      <mesh position={[x, 0.66, zOut]} material={hullMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.105, 0.105, 0.82, 20]} />
      </mesh>
      <mesh position={[x, 1.09, zOut]} material={darkSteel} castShadow>
        <cylinderGeometry args={[0.122, 0.122, 0.08, 20]} />
      </mesh>
      {/* Ty mạ crom hạ xuống bàn đạp */}
      <mesh position={[x, 0.19, zOut]} material={chromeMat} castShadow>
        <cylinderGeometry args={[0.064, 0.064, 0.26, 18]} />
      </mesh>
      {/* Khớp cầu + bàn đạp thép tiếp đất đúng tại y = 0.000 (tâm y = 0.035, dày 0.07) */}
      <mesh position={[x, 0.09, zOut]} material={darkSteel} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 0.07, 16]} />
      </mesh>
      <mesh position={[x, 0.035, zOut]} material={darkSteel} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.29, 0.07, 12]} />
      </mesh>
    </group>
  );
};

export const SamBattery: React.FC<SamBatteryProps> = ({
  elev = 0.95,
  azim = 0,
  radarSpin = 0,
  wheelSpin = 0,
  openTubes,
  hideTube,
}) => {
  const openedCount = Math.max(0, Math.min(4, Math.round(openTubes ?? hideTube ?? 0)));

  const hullMat = getSamHullPaint();
  const tubeMat = getSamTubePaint();
  const trimMat = getSamOliveTrim();
  const frameSteel = plain('#313832', 0.62, 0.46);
  const darkMetal = plain('#222824', 0.52, 0.58);
  const oliveAccent = plain('#6a7759', 0.55, 0.3);
  const sootBlack = plain('#111314', 0.95, 0.05);
  const scorchRim = plain('#232628', 0.88, 0.18);
  const chromeMat = plain('#e0e8f0', 0.15, 0.94);
  const armorGlass = plain('#274354', 0.11, 0.82);
  const radarFaceMat = plain('#2d3942', 0.4, 0.5);
  const radarElemMat = plain('#9aaab8', 0.32, 0.72);
  const headlightMat = plain('#f5f9ff', 0.15, 0.1, { emissive: '#ffe9b8', emissiveIntensity: 0.6 });
  const amberLampMat = plain(P.amber, 0.25, 0.1, { emissive: P.amber, emissiveIntensity: 0.4 });
  const tailLampMat = plain(P.redDark, 0.3, 0.1, { emissive: P.red, emissiveIntensity: 0.4 });
  const hazardStripeMat = plain('#d4962a', 0.42, 0.2);

  const geos = useMemo(() => {
    const cab = extrude(CABIN_SIDE, 2.98, 0.05);
    const eng = extrude(ENGINE_BAY_SIDE, 2.9, 0.04);
    const shelter = extrude(C2_SHELTER_SIDE, 2.76, 0.04);
    const rearFender = extrude(REAR_FENDER_SIDE, 0.54, 0.025);
    const closedTube = buildTubeGeo(false);
    const openTube = buildTubeGeo(true);
    const closedCap = lathe(
      [
        [0.001, 6.77],
        [0.14, 6.765],
        [0.32, 6.73],
        [0.435, 6.675],
        [0.45, 6.65],
        [0.001, 6.65],
      ],
      32,
    );
    const mirrorArmR = pipe(
      [
        [5.72, 2.58, 1.48],
        [5.84, 2.58, 1.65],
        [5.84, 2.02, 1.65],
        [5.72, 1.98, 1.48],
      ],
      0.018,
      20,
    );
    const mirrorArmL = pipe(
      [
        [5.72, 2.58, -1.48],
        [5.84, 2.58, -1.65],
        [5.84, 2.02, -1.65],
        [5.72, 1.98, -1.48],
      ],
      0.018,
      20,
    );
    const radarWaveguideR = pipe(
      [
        [-0.08, 0.12, 0.38],
        [-0.45, 0.28, 0.48],
        [-0.42, 0.62, 0.42],
        [0.05, 0.68, 0.38],
      ],
      0.032,
      20,
    );
    const radarWaveguideL = pipe(
      [
        [-0.08, 0.12, -0.38],
        [-0.45, 0.28, -0.48],
        [-0.42, 0.62, -0.42],
        [0.05, 0.68, -0.38],
      ],
      0.032,
      20,
    );
    const cradleCable = pipe(
      [
        [-0.3, 0.47, 0.96],
        [1.5, 0.47, 0.98],
        [3.8, 0.47, 0.98],
        [6.1, 0.47, 0.95],
      ],
      0.028,
      24,
    );
    return {
      cab,
      eng,
      shelter,
      rearFender,
      closedTube,
      openTube,
      closedCap,
      mirrorArmR,
      mirrorArmL,
      radarWaveguideR,
      radarWaveguideL,
      cradleCable,
    };
  }, []);

  // Đinh tán bọc thép trên cabin, khoang máy, khoang C2 và vè xe
  const rivetPoints = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        pts.push([3.85 + i * 0.21, 2.84, s * 1.495]);
        pts.push([3.85 + i * 0.21, 1.62, s * 1.495]);
      }
      for (let i = 0; i < 6; i++) {
        pts.push([2.08 + i * 0.28, 2.58, s * 1.455]);
        pts.push([2.08 + i * 0.28, 1.58, s * 1.455]);
      }
      for (let i = 0; i < 7; i++) {
        pts.push([-1.4 + i * 0.27, 2.08, s * 1.385]);
      }
    }
    for (let i = 0; i < 9; i++) {
      const z = -1.28 + i * 0.32;
      pts.push([5.62, 2.81, z]);
      pts.push([6.14, 1.81, z]);
    }
    return pts;
  }, []);

  // Động học xi-lanh thủy lực nâng cụm 4 ống phóng (tự khớp chính xác ở mọi góc elev)
  const trunX = -2.2;
  const trunY = 0.56;
  const cylBaseX = 0.36;
  const cylBaseY = 0.18;
  const lugU = 3.25;
  const lugV = -0.38;
  const lugX = trunX + lugU * Math.cos(elev) - lugV * Math.sin(elev);
  const lugY = trunY + lugU * Math.sin(elev) + lugV * Math.cos(elev);
  const cylDx = lugX - cylBaseX;
  const cylDy = lugY - cylBaseY;
  const cylLen = Math.hypot(cylDx, cylDy);
  const cylAng = Math.atan2(cylDy, cylDx);
  const barrelLen = Math.min(1.68, cylLen * 0.62);

  // 4 vị trí ống phóng 2×2 trong hệ quy chiếu giá nâng
  const tubeSlots: [number, number][] = [
    [0.94, 0.49],  // 0: trên - phải
    [0.94, -0.49], // 1: trên - trái
    [0.0, 0.49],   // 2: dưới - phải
    [0.0, -0.49],  // 3: dưới - trái
  ];

  // Góc nghiêng kính chắn gió cabin: từ (6.14, 1.82) lên (5.66, 2.74)
  const wsTilt = Math.atan2(0.48, 0.92);

  return (
    <group>
      {/* ==================== 1. KHUNG GẦM CHỊU LỰC 13.40 M (x: -6.70 .. +6.70) ==================== */}
      {[-0.54, 0.54].map((z) => (
        <mesh key={`rail-${z}`} position={[0, 0.96, z]} geometry={rbox(13.16, 0.34, 0.22, 0.03)} material={frameSteel} castShadow receiveShadow />
      ))}
      {/* Sàn kỹ thuật trung tâm & sau */}
      <mesh position={[-2.35, 1.2, 0]} geometry={rbox(8.56, 0.16, 2.34, 0.03)} material={hullMat} castShadow receiveShadow />
      {/* Cản sau bọc thép tại x = -6.56 .. -6.70 + máng hướng luồng phụt tên lửa */}
      <mesh position={[-6.56, 0.94, 0]} geometry={rbox(0.28, 0.38, 3.04, 0.04)} material={trimMat} castShadow receiveShadow />
      <mesh position={[-6.25, 1.12, 0]} rotation={[0, 0, 0.24]} geometry={rbox(0.75, 0.1, 2.3, 0.02)} material={frameSteel} castShadow receiveShadow />
      {/* Cụm đèn hậu & móc kéo sau */}
      {[-1.24, 1.24].map((z) => (
        <group key={`tail-${z}`} position={[-6.69, 0.94, z]}>
          <mesh geometry={rbox(0.05, 0.14, 0.34, 0.01)} material={darkMetal} />
          <mesh position={[-0.02, 0, 0]} geometry={rbox(0.03, 0.09, 0.24, 0.01)} material={tailLampMat} />
        </group>
      ))}
      {[-0.62, 0.62].map((z) => (
        <mesh key={`rhook-${z}`} position={[-6.68, 0.82, z]} geometry={rbox(0.14, 0.12, 0.1, 0.02)} material={hazardStripeMat} />
      ))}

      {/* ==================== 2. HỆ GẦM 4 CẦU 8×8 (8 bánh xe chạm đúng mặt phẳng y = 0) ==================== */}
      {AXLE_X.map((ax, i) => (
        <group key={`axle-${i}`}>
          <mesh position={[ax, WHEEL_R, 0]} rotation={[Math.PI / 2, 0, 0]} material={frameSteel} castShadow>
            <cylinderGeometry args={[0.115, 0.115, 2.42, 16]} />
          </mesh>
          <mesh position={[ax, WHEEL_R, 0]} material={darkMetal} castShadow>
            <sphereGeometry args={[0.23, 16, 12]} />
          </mesh>
          {[-0.86, 0.86].map((zs) => (
            <mesh key={`strut-${zs}`} position={[ax, 0.84, zs]} material={darkMetal}>
              <cylinderGeometry args={[0.075, 0.075, 0.42, 12]} />
            </mesh>
          ))}
          {/* Bánh phải (+Z) */}
          <Wheel r={WHEEL_R} width={WHEEL_W} spin={wheelSpin} tire="#242726" rim="#5d6c4e" bolts={10} position={[ax, WHEEL_R, WHEEL_Z]} />
          {/* Bánh trái (-Z, xoay 180° quanh Y để mặt bu-lông quay ra ngoài -Z và đảo chiều spin) */}
          <group position={[ax, WHEEL_R, -WHEEL_Z]} rotation={[0, Math.PI, 0]}>
            <Wheel r={WHEEL_R} width={WHEEL_W} spin={-wheelSpin} tire="#242726" rim="#5d6c4e" bolts={10} />
          </group>
        </group>
      ))}
      <mesh position={[0.2, 0.66, 0]} rotation={[0, 0, Math.PI / 2]} material={darkMetal}>
        <cylinderGeometry args={[0.065, 0.065, 9.2, 12]} />
      </mesh>

      {/* Vè chắn bùn cụm cầu sau (rộng đúng z = ±1.55 m -> tổng rộng thân xe 3.10 m) */}
      {[-1.28, 1.28].map((zf) => (
        <mesh key={`rfend-${zf}`} position={[0, 0, zf]} geometry={geos.rearFender} material={hullMat} castShadow receiveShadow />
      ))}
      {/* Vòm chắn bùn gọn sát bánh cầu 1 và cầu 2 */}
      {[4.68, 2.88].map((ax) =>
        [-1.33, 1.33].map((zf) => (
          <group key={`ffend-${ax}-${zf}`} position={[ax, 1.44, zf]}>
            <mesh geometry={rbox(1.18, 0.08, 0.44, 0.02)} material={trimMat} castShadow receiveShadow />
            <mesh position={[-0.65, -0.18, 0]} rotation={[0, 0, -0.62]} geometry={rbox(0.08, 0.42, 0.44, 0.02)} material={trimMat} castShadow />
            <mesh position={[0.65, -0.18, 0]} rotation={[0, 0, 0.62]} geometry={rbox(0.08, 0.42, 0.44, 0.02)} material={trimMat} castShadow />
          </group>
        )),
      )}

      {/* ==================== 3. 4 CHÂN CHỐNG THỦY LỰC HẠ CHẠM ĐẤT (y = 0) ==================== */}
      <OutriggerJack x={1.62} side={1} />
      <OutriggerJack x={1.62} side={-1} />
      <OutriggerJack x={-5.58} side={1} />
      <OutriggerJack x={-5.58} side={-1} />

      {/* ==================== 4. KHOANG ĐIỀU KHIỂN C2 GIỮA THÂN + THÙNG DẦU / HỘP PHỤ TÙNG ==================== */}
      <mesh geometry={geos.shelter} material={hullMat} castShadow receiveShadow />
      {/* Cửa sập kỹ thuật, thang leo & điều hòa bên sườn khoang C2 */}
      {[-1, 1].map((s) => (
        <group key={`c2-side-${s}`}>
          <mesh position={[-0.58, 1.74, s * 1.385]} geometry={rbox(0.72, 0.68, 0.04, 0.015)} material={trimMat} />
          <mesh position={[0.02, 1.78, s * 1.39]} geometry={rbox(0.42, 0.36, 0.05, 0.015)} material={frameSteel} />
          {/* Thùng nhiên liệu diesel hình hộp bo tròn có đai thép */}
          <mesh position={[0.42, 0.96, s * 1.25]} geometry={rbox(1.24, 0.52, 0.56, 0.12)} material={trimMat} castShadow receiveShadow />
          {[-0.36, 0.36].map((dx) => (
            <mesh key={`strap-${dx}`} position={[0.42 + dx, 0.96, s * 1.255]} geometry={rbox(0.045, 0.55, 0.58, 0.01)} material={darkMetal} />
          ))}
          {/* Hộp phụ tùng & ắc-quy bọc thép bên dưới sườn khoang C2 */}
          <mesh position={[-0.88, 0.96, s * 1.27]} geometry={rbox(1.16, 0.5, 0.52, 0.03)} material={trimMat} castShadow receiveShadow />
          <mesh position={[-0.88, 0.96, s * 1.535]} geometry={rbox(1.02, 0.36, 0.03, 0.01)} material={hullMat} />
        </group>
      ))}
      {/* Giá đỡ hành quân chữ U trên nóc khoang C2 (đỡ dàn ống phóng khi hạ thu gọn) */}
      <group position={[-1.12, 2.32, 0]}>
        <mesh geometry={rbox(0.24, 0.16, 1.98, 0.02)} material={frameSteel} castShadow />
        {[-0.92, 0, 0.92].map((zu) => (
          <mesh key={`upost-${zu}`} position={[0, 0.18, zu]} geometry={rbox(0.2, 0.28, 0.12, 0.02)} material={trimMat} />
        ))}
      </group>
      {/* Bình chữa cháy đỏ gắn sườn phải */}
      <mesh position={[-0.18, 1.02, 1.54]} material={plain(P.redDark, 0.4, 0.2)}>
        <cylinderGeometry args={[0.075, 0.075, 0.44, 14]} />
      </mesh>

      {/* ==================== 5. CABIN BỌC THÉP VÁT ĐẦU HẦM HỐ (x: +3.72 .. +6.70) ==================== */}
      <mesh geometry={geos.cab} material={hullMat} castShadow receiveShadow />

      {/* Cản trước hầm hố + tời kéo cáp thép + đèn pha có lưới bảo vệ (vươn đúng tới x = +6.70) */}
      <mesh position={[6.56, 0.84, 0]} geometry={rbox(0.28, 0.4, 3.08, 0.04)} material={trimMat} castShadow receiveShadow />
      <mesh position={[6.54, 0.96, 0]} geometry={rbox(0.32, 0.34, 0.88, 0.03)} material={frameSteel} castShadow />
      <mesh position={[6.62, 0.96, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkMetal}>
        <cylinderGeometry args={[0.11, 0.11, 0.56, 16]} />
      </mesh>
      {[-0.48, 0.48].map((z) => (
        <mesh key={`fhook-${z}`} position={[6.67, 0.78, z]} geometry={rbox(0.08, 0.13, 0.09, 0.02)} material={hazardStripeMat} />
      ))}
      {/* Lưới tản nhiệt mũi vát trước cabin */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`fgr-${i}`} position={[6.61 - i * 0.018, 1.24 + i * 0.072, 0]} rotation={[0, 0, 0.22]} geometry={rbox(0.04, 0.035, 1.58, 0.008)} material={darkMetal} />
      ))}
      {/* Cụm đèn pha đôi hai bên cản trước */}
      {[-1.16, 1.16].map((z) => (
        <group key={`hl-${z}`} position={[6.68, 0.9, z]}>
          <mesh geometry={rbox(0.05, 0.2, 0.48, 0.02)} material={darkMetal} />
          <mesh position={[0.026, 0, -0.07 * Math.sign(z)]} rotation={[0, Math.PI / 2, 0]} material={headlightMat}>
            <circleGeometry args={[0.07, 16]} />
          </mesh>
          <mesh position={[0.02, 0, 0.12 * Math.sign(z)]} geometry={rbox(0.02, 0.08, 0.1, 0.01)} material={amberLampMat} />
        </group>
      ))}

      {/* Kính chắn gió bọc thép chia 3 ô lớn có khung gia cường nổi rõ & cần gạt mưa (đẩy bù bevel 0.05 m của extrude) */}
      <group position={[5.955, 2.315, 0]} rotation={[0, 0, wsTilt]}>
        <mesh geometry={rbox(0.06, 0.94, 2.66, 0.02)} material={oliveAccent} castShadow />
        {/* Tấm mái che nắng bọc thép trên đỉnh kính */}
        <mesh position={[0.07, 0.46, 0]} rotation={[0, 0, -0.35]} geometry={rbox(0.14, 0.04, 2.7, 0.01)} material={trimMat} castShadow />
        {[-0.86, 0, 0.86].map((zw, idx) => (
          <group key={`wpane-${idx}`} position={[0.028, 0, zw]}>
            <mesh geometry={rbox(0.026, 0.76, 0.76, 0.01)} material={armorGlass} />
            <mesh position={[0.02, -0.08, 0.06]} rotation={[0.28, 0, 0]} geometry={rbox(0.016, 0.48, 0.022, 0.004)} material={darkMetal} />
          </group>
        ))}
      </group>

      {/* Cửa sổ bọc thép hai bên cabin, đường viền cửa, bậc lên xuống & gương chiếu hậu */}
      {[-1, 1].map((s) => (
        <group key={`cab-side-${s}`}>
          <mesh position={[5.15, 2.34, s * 1.495]} geometry={rbox(1.06, 0.66, 0.045, 0.02)} material={oliveAccent} />
          <mesh position={[5.18, 2.35, s * 1.51]} geometry={rbox(0.88, 0.5, 0.02, 0.01)} material={armorGlass} />
          <mesh position={[4.22, 2.38, s * 1.495]} geometry={rbox(0.52, 0.52, 0.045, 0.02)} material={oliveAccent} />
          <mesh position={[4.22, 2.38, s * 1.51]} geometry={rbox(0.36, 0.36, 0.02, 0.01)} material={armorGlass} />
          <mesh position={[4.68, 1.98, s * 1.498]} geometry={rbox(0.04, 0.12, 0.05, 0.01)} material={darkMetal} />
          <mesh position={[5.96, 0.74, s * 1.44]} geometry={rbox(0.32, 0.34, 0.14, 0.015)} material={frameSteel} />
          <mesh position={[5.84, 2.3, s * 1.66]} geometry={rbox(0.08, 0.42, 0.18, 0.02)} material={trimMat} castShadow />
        </group>
      ))}
      <mesh geometry={geos.mirrorArmR} material={darkMetal} castShadow />
      <mesh geometry={geos.mirrorArmL} material={darkMetal} castShadow />

      {/* Nóc cabin: cửa nóc tròn bọc thép, cụm lọc NBC/điều hòa, đèn hiệu và cần ăng-ten thông tin */}
      <group position={[4.62, 2.94, 0.64]}>
        <mesh material={oliveAccent} castShadow>
          <cylinderGeometry args={[0.38, 0.41, 0.08, 24]} />
        </mesh>
        <mesh position={[-0.06, 0.05, 0]} material={hullMat} castShadow>
          <cylinderGeometry args={[0.33, 0.33, 0.05, 24]} />
        </mesh>
      </group>
      <mesh position={[4.48, 2.99, -0.62]} geometry={rbox(1.06, 0.18, 0.88, 0.03)} material={trimMat} castShadow />
      <mesh position={[5.35, 3.01, 0]} material={amberLampMat}>
        <cylinderGeometry args={[0.06, 0.075, 0.12, 14]} />
      </mesh>
      <mesh position={[3.82, 3.56, -1.36]} material={darkMetal}>
        <cylinderGeometry args={[0.012, 0.024, 1.35, 8]} />
      </mesh>

      {/* ==================== 6. KHOANG ĐỘNG CƠ & TẢN NHIỆT SAU CABIN (x: +1.96 .. +3.66) ==================== */}
      <mesh geometry={geos.eng} material={hullMat} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <group key={`eng-vent-${s}`} position={[2.84, 2.12, s * 1.455]}>
          <mesh geometry={rbox(1.32, 0.82, 0.04, 0.015)} material={darkMetal} />
          {Array.from({ length: 7 }, (_, k) => (
            <mesh key={k} position={[0, -0.3 + k * 0.1, s * 0.016]} rotation={[s * 0.35, 0, 0]} geometry={rbox(1.22, 0.038, 0.04, 0.005)} material={oliveAccent} />
          ))}
        </group>
      ))}
      {[-0.68, 0.68].map((zf) => (
        <group key={`fan-${zf}`} position={[2.92, 2.75, zf]}>
          <mesh material={oliveAccent} castShadow>
            <cylinderGeometry args={[0.46, 0.49, 0.08, 24]} />
          </mesh>
          <mesh position={[0, 0.025, 0]} material={darkMetal}>
            <cylinderGeometry args={[0.39, 0.39, 0.05, 24]} />
          </mesh>
        </group>
      ))}
      {[-1.38, 1.38].map((ze) => (
        <group key={`exh-${ze}`} position={[3.69, 2.35, ze]}>
          <mesh material={frameSteel} castShadow>
            <cylinderGeometry args={[0.095, 0.095, 1.25, 16]} />
          </mesh>
          <mesh position={[0, 0.72, 0]} material={darkMetal}>
            <cylinderGeometry args={[0.055, 0.055, 0.34, 14]} />
          </mesh>
        </group>
      ))}

      <Rivets points={rivetPoints} r={0.019} color="#6b775b" />

      {/* ==================== 7. THÁP RADAR ĐIỀU KHIỂN HỎA LỰC MẢNG PHA (x = +1.16, đỉnh cao ~4.20 m) ==================== */}
      <group position={[1.16, 1.28, 0]}>
        {/* Bệ đỡ bọc thép & trụ nâng thủy lực */}
        <mesh position={[0, 0.36, 0]} geometry={rbox(1.28, 0.72, 1.76, 0.05)} material={trimMat} castShadow receiveShadow />
        <mesh position={[0, 1.06, 0]} material={hullMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.48, 0.58, 0.84, 12]} />
        </mesh>
        <mesh position={[0, 1.5, 0]} material={darkMetal} castShadow>
          <cylinderGeometry args={[0.53, 0.53, 0.12, 24]} />
        </mesh>

        {/* Đầu đài radar xoay quanh trục Y theo radarSpin */}
        <group position={[0, 1.56, 0]} rotation={[0, radarSpin, 0]}>
          {/* Khối hộp thu phát công suất cao (T/R & làm mát) hầm hố phía sau mảng ăng-ten */}
          <mesh position={[-0.24, 0.42, 0]} geometry={rbox(0.88, 0.74, 1.48, 0.05)} material={hullMat} castShadow receiveShadow />
          <mesh position={[-0.58, 0.42, 0]} geometry={rbox(0.32, 0.58, 1.18, 0.04)} material={trimMat} castShadow />
          {/* Cánh tản nhiệt hộp thu phát & đôi ống dẫn sóng */}
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={`trfin-${i}`} position={[-0.75, 0.42, -0.45 + i * 0.15]} geometry={rbox(0.06, 0.48, 0.03, 0.005)} material={frameSteel} />
          ))}
          <mesh geometry={geos.radarWaveguideR} material={frameSteel} />
          <mesh geometry={geos.radarWaveguideL} material={frameSteel} />

          {/* Mảng ăng-ten phẳng hình chữ nhật nghiêng 21° có chấn tử mảng pha + thanh IFF trên đỉnh */}
          <group position={[0.24, 0.64, 0]} rotation={[0, 0, 0.35]}>
            {/* Khung bọc thép mảng pha (rộng 2.46 m × cao 1.38 m) */}
            <mesh geometry={rbox(0.22, 1.38, 2.46, 0.04)} material={oliveAccent} castShadow receiveShadow />
            <mesh position={[0.098, 0, 0]} geometry={rbox(0.03, 1.2, 2.26, 0.01)} material={radarFaceMat} />
            {/* Các dãy chấn tử mảng pha ngang & dọc */}
            {Array.from({ length: 8 }, (_, r) => (
              <mesh key={`row-${r}`} position={[0.118, -0.5 + r * 0.143, 0]} geometry={rbox(0.014, 0.038, 2.14, 0.004)} material={radarElemMat} />
            ))}
            {Array.from({ length: 10 }, (_, c) => (
              <mesh key={`col-${c}`} position={[0.116, 0, -0.99 + c * 0.22]} geometry={rbox(0.01, 1.12, 0.022, 0.003)} material={darkMetal} />
            ))}
            {/* Thanh ăng-ten nhận diện IFF gắn trên đỉnh mảng pha (đạt đỉnh ~4.20 m) */}
            <mesh position={[0.02, 0.77, 0]} geometry={rbox(0.14, 0.14, 2.52, 0.02)} material={trimMat} castShadow />
            <mesh position={[0.09, 0.77, 0]} geometry={rbox(0.02, 0.085, 2.38, 0.008)} material={plain('#cfd8e0', 0.35, 0.4)} />
            {/* Ăng-ten dẫn bắn lệnh phụ bên hông mảng radar */}
            <mesh position={[0.08, 0.16, 1.32]} geometry={rbox(0.2, 0.26, 0.16, 0.02)} material={trimMat} />
          </group>
        </group>
      </group>

      {/* ==================== 8. MÂM XOAY PHÍA SAU (azim) & CỤM 4 ỐNG PHÓNG TÊN LỬA 2×2 (elev) ==================== */}
      <group position={[-3.85, 1.28, 0]} rotation={[0, azim, 0]}>
        {/* Vành mâm xoay tròn & bệ gá chịu lực */}
        <mesh position={[-0.35, 0.08, 0]} material={frameSteel} castShadow receiveShadow>
          <cylinderGeometry args={[1.36, 1.42, 0.16, 32]} />
        </mesh>
        <mesh position={[-0.55, 0.22, 0]} geometry={rbox(3.54, 0.18, 2.12, 0.04)} material={trimMat} castShadow receiveShadow />

        {/* Hai trụ bản lề chữ A phía sau đỡ trục quay elev tại (trunX = -2.20, trunY = 0.56) */}
        {[-0.86, 0.86].map((zt) => (
          <group key={`trun-${zt}`} position={[trunX, 0.36, zt]}>
            <mesh geometry={rbox(0.58, 0.44, 0.2, 0.03)} material={hullMat} castShadow receiveShadow />
            <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={oliveAccent}>
              <cylinderGeometry args={[0.135, 0.135, 0.24, 18]} />
            </mesh>
          </group>
        ))}
        <mesh position={[trunX, trunY, 0]} rotation={[Math.PI / 2, 0, 0]} material={frameSteel}>
          <cylinderGeometry args={[0.085, 0.085, 2.04, 18]} />
        </mesh>

        {/* Tủ điều khiển thủy lực & điện bên hông mâm xoay */}
        {[-1.14, 1.14].map((zc) => (
          <mesh key={`cheek-${zc}`} position={[-0.5, 0.42, zc]} geometry={rbox(1.75, 0.42, 0.28, 0.03)} material={hullMat} castShadow />
        ))}

        {/* Cặp xi-lanh thủy lực kép đẩy bên dưới dàn ống phóng (tự khớp động học theo elev) */}
        {[-0.56, 0.56].map((zc) => (
          <group key={`hyd-${zc}`}>
            <mesh position={[cylBaseX, cylBaseY, zc]} rotation={[Math.PI / 2, 0, 0]} material={darkMetal}>
              <cylinderGeometry args={[0.11, 0.11, 0.18, 16]} />
            </mesh>
            <group position={[cylBaseX, cylBaseY, zc]} rotation={[0, 0, cylAng]}>
              <mesh position={[barrelLen * 0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={oliveAccent} castShadow>
                <cylinderGeometry args={[0.098, 0.108, barrelLen, 18]} />
              </mesh>
              <mesh position={[barrelLen, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={darkMetal}>
                <cylinderGeometry args={[0.115, 0.115, 0.08, 18]} />
              </mesh>
              <mesh position={[cylLen * 0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={chromeMat} castShadow>
                <cylinderGeometry args={[0.06, 0.06, cylLen, 16]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* Cụm giá nâng + 4 ống phóng tên lửa hình trụ có gân gia cường ngang (dài 7.20 m, R = 0.43 m, xếp 2×2) */}
        <group position={[trunX, trunY, 0]} rotation={[0, 0, elev]}>
          <mesh position={[3.05, 0.47, 0]} geometry={rbox(6.4, 0.22, 0.24, 0.03)} material={trimMat} castShadow />
          <mesh position={[2.25, -0.26, 0]} geometry={rbox(4.8, 0.16, 1.32, 0.03)} material={frameSteel} castShadow />
          {[-0.56, 0.56].map((zc) => (
            <mesh key={`lug-${zc}`} position={[lugU, lugV, zc]} rotation={[Math.PI / 2, 0, 0]} material={darkMetal}>
              <cylinderGeometry args={[0.1, 0.1, 0.18, 16]} />
            </mesh>
          ))}
          {/* 3 khung đai kẹp chữ H màu olive sáng ôm chặt 4 ống phóng */}
          {[0.62, 3.1, 5.58].map((xc) => (
            <group key={`collar-${xc}`} position={[xc, 0.47, 0]}>
              <mesh geometry={rbox(0.24, 1.92, 0.16, 0.02)} material={oliveAccent} castShadow />
              <mesh geometry={rbox(0.24, 0.16, 1.96, 0.02)} material={oliveAccent} castShadow />
              <mesh position={[0, 0.96, 0]} geometry={rbox(0.2, 0.08, 1.76, 0.02)} material={trimMat} />
              <mesh position={[0, -0.96, 0]} geometry={rbox(0.2, 0.08, 1.76, 0.02)} material={trimMat} />
            </group>
          ))}
          <mesh geometry={geos.cradleCable} material={darkMetal} />

          {/* 4 ống phóng (mỗi ống dài đúng 7.20 m từ x = -0.55 tới x = +6.65, bán kính thân 0.43 m) */}
          {tubeSlots.map(([ty, tz], idx) => {
            const isOpen = idx < openedCount;
            return (
              <group key={`tube-${idx}`} position={[0, ty, tz]}>
                <mesh geometry={isOpen ? geos.openTube : geos.closedTube} material={tubeMat} castShadow receiveShadow />
                {/* Đáy ống phóng có nón thoát khí phía sau (x = -0.55) */}
                <mesh position={[-0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={oliveAccent} castShadow>
                  <cylinderGeometry args={[0.37, 0.42, 0.09, 24]} />
                </mesh>
                <mesh position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkMetal}>
                  <cylinderGeometry args={[0.24, 0.28, 0.05, 20]} />
                </mesh>
                {/* Vòng đai cảnh báo kỹ thuật gần miệng ống */}
                <mesh position={[6.36, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={hazardStripeMat}>
                  <cylinderGeometry args={[0.434, 0.434, 0.08, 28]} />
                </mesh>

                {isOpen ? (
                  /* Miệng ống đã phóng đạn: lòng ống đen ám khói + vành cháy xém + mảnh nắp vỡ/mở bung */
                  <group position={[6.65, 0, 0]}>
                    <mesh position={[-0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={sootBlack}>
                      <cylinderGeometry args={[0.382, 0.382, 0.62, 28, 1, true]} />
                    </mesh>
                    <mesh position={[-0.61, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={sootBlack}>
                      <circleGeometry args={[0.382, 24]} />
                    </mesh>
                    <mesh position={[-0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={scorchRim}>
                      <cylinderGeometry args={[0.476, 0.476, 0.14, 28, 1, true]} />
                    </mesh>
                    <group position={[-0.02, 0.46, 0]} rotation={[0, 0, 1.95]}>
                      <mesh position={[0, -0.34, 0]} rotation={[0, 0, Math.PI / 2]} material={scorchRim} castShadow>
                        <cylinderGeometry args={[0.38, 0.41, 0.04, 20]} />
                      </mesh>
                    </group>
                    {[0, 1, 2, 3].map((p) => (
                      <mesh
                        key={p}
                        position={[0.04, Math.cos(p * 1.57 + 0.6) * 0.4, Math.sin(p * 1.57 + 0.6) * 0.4]}
                        rotation={[p * 1.57, 0.45, 0.35]}
                        geometry={rbox(0.11, 0.02, 0.14, 0.004)}
                        material={scorchRim}
                      />
                    ))}
                  </group>
                ) : (
                  /* Nắp đậy kín đầu ống phóng có gân chữ thập phân mảnh & giắc rốn đạn */
                  <group>
                    <mesh geometry={geos.closedCap} material={oliveAccent} castShadow />
                    {[0, Math.PI / 2].map((ang, k) => (
                      <mesh key={k} position={[6.71, 0, 0]} rotation={[ang, 0, 0]} geometry={rbox(0.06, 0.82, 0.028, 0.006)} material={darkMetal} />
                    ))}
                    <mesh position={[6.77, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkMetal}>
                      <cylinderGeometry args={[0.065, 0.08, 0.04, 14]} />
                    </mesh>
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

// ============================================================================
// 2. HYPERSONIC MISSILE — Tên lửa siêu vượt âm ngoại cỡ 22 ft (6.71 m × Ø0.58 m, 7.000 lb)
// Tâm cục bộ [0, 0, 0], dọc trục +X từ loa phụt x = -3.35 tới mũi siêu vượt âm x = +3.36
// ============================================================================
export const HypersonicMissile: React.FC<MissileProps> = ({ flame = 0 }) => {
  const f = Math.max(0, Math.min(1, flame));

  // Vật liệu chịu nhiệt carbon-carbon đen xám có ánh kim nhẹ để nổi rõ gờ chine và mặt vát lưỡng nón
  const tpsCarbonMat = paint({
    color: '#282e38',
    camo: ['#222730', '#343c48'],
    camoScale: 2.2,
    wear: 0.14,
    dirt: 0.1,
    roughness: 0.36,
    metalness: 0.5,
    seed: 415,
  });
  const chineEdgeMat = plain('#3a4352', 0.3, 0.62);
  // Sơn xám sáng quân sự chuẩn hàng không vũ trụ (không loang camo rừng trên thân tầng đẩy tên lửa)
  const boosterMat = paint({
    color: P.ordWhite,
    camo: ['#dae3ee'],
    camoScale: 1.8,
    wear: 0.08,
    dirt: 0.08,
    roughness: 0.36,
    metalness: 0.32,
    seed: 420,
  });
  const aftSectionMat = paint({
    color: P.ordMid,
    camo: ['#93a7bd'],
    camoScale: 1.8,
    wear: 0.1,
    dirt: 0.08,
    roughness: 0.38,
    metalness: 0.42,
    seed: 422,
  });
  const finMat = plain(P.ordDark, 0.36, 0.62);
  const noseTipMat = plain('#15181e', 0.26, 0.72);
  const jointSteel = plain('#3c4654', 0.34, 0.78);
  const nozzleCarbon = plain('#1f2329', 0.44, 0.62);
  const blackBand = plain('#141922', 0.42, 0.22);
  const amberBand = plain(P.amber, 0.32, 0.18);

  const geos = useMemo(() => {
    // Đầu lượn siêu vượt âm lưỡng nón (x: +1.05 .. +3.36, 28 đoạn mượt)
    const glidePts: P2[] = [[0.001, 1.05]];
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = 1.05 + u * 2.31;
      const r =
        u < 0.48
          ? 0.29 * (1 - 0.35 * Math.pow(u / 0.48, 1.1))
          : 0.1885 * Math.pow(1 - (u - 0.48) / 0.52, 0.84) + 0.005 * (1 - u);
      glidePts.push([Math.max(0.004, r), x]);
    }
    const warhead = lathe(glidePts, 36);

    // Chóp mũi tungsten/carbon chịu nhiệt cực cao (x: +3.02 .. +3.36)
    const tipPts: P2[] = [
      [0.001, 3.02],
      [0.045, 3.02],
      [0.031, 3.14],
      [0.017, 3.26],
      [0.004, 3.36],
    ];
    const noseTip = lathe(tipPts, 32);

    // Gờ chine nâng khí động ngang hai bên đầu lượn siêu vượt âm (x: +1.05 .. +3.26)
    const chineOutline: P2[] = [
      [1.05, -0.355],
      [1.75, -0.295],
      [2.45, -0.185],
      [3.05, -0.068],
      [3.26, -0.012],
      [3.26, 0.012],
      [3.05, 0.068],
      [2.45, 0.185],
      [1.75, 0.295],
      [1.05, 0.355],
    ];
    const chine = extrudeTop(chineOutline, 0.038, 0.012);

    // Sống lưng khí động trên & dưới đầu lượn (dorsal & ventral facets)
    const dorsalSpine = extrude(
      [
        [1.06, 0.26],
        [1.95, 0.242],
        [2.85, 0.11],
        [3.12, 0.035],
        [1.06, 0.12],
      ],
      0.095,
      0.014,
    );

    // Thân chính tầng đẩy nhiên liệu rắn Ø0.58 m (R = 0.29 m, x: -2.18 .. +1.05)
    const boosterMain = lathe(
      [
        [0.001, -2.18],
        [0.29, -2.18],
        [0.29, 1.05],
        [0.001, 1.05],
      ],
      36,
    );

    // Khoang đuôi cơ cấu lái cánh (aft actuator skirt, x: -3.02 .. -2.18, sơn P.ordMid)
    const boosterAft = lathe(
      [
        [0.001, -3.02],
        [0.246, -3.02],
        [0.29, -2.9],
        [0.29, -2.18],
        [0.001, -2.18],
      ],
      36,
    );

    // Loa phụt rocket hội tụ - phân kỳ (x: -3.35 .. -3.00)
    const nozzle = lathe(
      [
        [0.001, -3.14],
        [0.145, -3.14],
        [0.228, -3.35],
        [0.246, -3.35],
        [0.195, -3.12],
        [0.246, -3.0],
        [0.001, -3.0],
      ],
      32,
    );

    // Cánh ổn định đuôi vát nhọn + mép trước vát kim loại
    const fin = extrude(
      [
        [-2.98, 0.27],
        [-2.08, 0.27],
        [-2.58, 0.585],
        [-2.98, 0.585],
      ],
      0.026,
      0.007,
    );

    return { warhead, noseTip, chine, dorsalSpine, boosterMain, boosterAft, nozzle, fin };
  }, []);

  return (
    <group>
      {/* 1. Đầu lượn siêu vượt âm phủ carbon chịu nhiệt + gờ chine ngang */}
      <mesh geometry={geos.warhead} material={tpsCarbonMat} castShadow receiveShadow />
      <mesh geometry={geos.noseTip} material={noseTipMat} castShadow />
      <mesh position={[0, -0.019, 0]} geometry={geos.chine} material={chineEdgeMat} castShadow receiveShadow />
      <mesh geometry={geos.dorsalSpine} material={tpsCarbonMat} castShadow />

      {/* Đai khớp tách tầng đẩy (x = +1.05) */}
      <mesh position={[1.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={jointSteel} castShadow>
        <cylinderGeometry args={[0.295, 0.295, 0.095, 36]} />
      </mesh>

      {/* 2. Thân tầng đẩy nhiên liệu rắn Ø0.58 m (P.ordWhite + khoang đuôi P.ordMid) */}
      <mesh geometry={geos.boosterMain} material={boosterMat} castShadow receiveShadow />
      <mesh geometry={geos.boosterAft} material={aftSectionMat} castShadow receiveShadow />

      {/* Đai nhận diện màu cam hổ phách P.amber + vạch đen kỹ thuật đo quang */}
      <mesh position={[0.72, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={amberBand}>
        <cylinderGeometry args={[0.293, 0.293, 0.22, 36]} />
      </mesh>
      {[0.59, 0.85, -0.14, -1.78, -2.02].map((xb, idx) => (
        <mesh key={`blk-${idx}`} position={[xb, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={blackBand}>
          <cylinderGeometry args={[0.2925, 0.2925, 0.045, 36]} />
        </mesh>
      ))}
      <mesh position={[-1.9, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={amberBand}>
        <cylinderGeometry args={[0.293, 0.293, 0.14, 36]} />
      </mesh>
      {[-1.02, -2.18].map((xj) => (
        <mesh key={`seam-${xj}`} position={[xj, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={jointSteel}>
          <cylinderGeometry args={[0.294, 0.294, 0.032, 36]} />
        </mesh>
      ))}

      {/* Hộp máng cáp lưng & cặp tai treo chuẩn tải nặng mấu bụng trung tâm F-15EX */}
      <mesh position={[-0.85, 0.292, 0]} geometry={rbox(3.64, 0.048, 0.095, 0.014)} material={plain(P.ordMid, 0.38, 0.48)} castShadow />
      {[-0.42, 0.36].map((xl) => (
        <mesh key={`lug-${xl}`} position={[xl, 0.33, 0]} geometry={rbox(0.14, 0.065, 0.07, 0.01)} material={jointSteel} castShadow />
      ))}

      {/* 3. 4 cánh ổn định đuôi chữ thập X-cruciform (45°) vát nhọn + bệ cơ cấu lái */}
      {[0, 1, 2, 3].map((i) => (
        <group key={`hfin-${i}`} rotation={[Math.PI / 4 + (i * Math.PI) / 2, 0, 0]}>
          <mesh geometry={geos.fin} material={finMat} castShadow receiveShadow />
          <mesh position={[-2.62, 0.285, 0]} geometry={rbox(0.64, 0.05, 0.068, 0.012)} material={jointSteel} />
        </group>
      ))}

      {/* 4. Loa phụt rocket đuôi */}
      <mesh geometry={geos.nozzle} material={nozzleCarbon} castShadow />

      {/* 5. Luồng lửa rocket siêu thanh sáng rực khi flame > 0 */}
      {f > 0.005 && (
        <group position={[-3.35, 0, 0]}>
          <pointLight position={[-0.5, 0, 0]} color="#ff9e3d" intensity={34 * f} distance={14} decay={1.6} />
          <mesh position={[-1.15 * f, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.21 * (0.55 + 0.45 * f), 2.3 * f, 20]} />
            <meshBasicMaterial color="#fff9de" transparent opacity={0.95 * Math.min(1, f * 1.4)} toneMapped={false} />
          </mesh>
          <mesh position={[-2.25 * f, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.36 * (0.5 + 0.5 * f), 4.5 * f, 20]} />
            <meshBasicMaterial color={P.flame} transparent opacity={0.62 * f} toneMapped={false} />
          </mesh>
          {[0.45, 1.05, 1.72, 2.45].map((d, k) => (
            <mesh key={`md-${k}`} position={[-d * f, 0, 0]} scale={[0.22 * f * (1 - k * 0.16), 0.13 * (1 - k * 0.18), 0.13 * (1 - k * 0.18)]}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color={P.amberHot} transparent opacity={0.85 * f * (1 - k * 0.18)} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

// ============================================================================
// 3. AMRAAM — Tên lửa không đối không tầm trung AIM-120D (12 ft / 3.66 m × Ø0.18 m)
// Tâm cục bộ [0, 0, 0], dọc trục +X từ x = -1.83 tới x = +1.83
// ============================================================================
export const AMRAAM: React.FC<MissileProps> = ({ flame = 0 }) => {
  const f = Math.max(0, Math.min(1, flame));

  const radomeMat = plain('#f1f5fa', 0.28, 0.08);
  const bodyMat = paint({
    color: '#d4dee8',
    camo: ['#c7d3e0'],
    camoScale: 1.8,
    wear: 0.07,
    dirt: 0.06,
    roughness: 0.34,
    metalness: 0.4,
    seed: 430,
  });
  const finTitanium = plain('#546272', 0.32, 0.76);
  const ringSteel = plain('#3e4956', 0.34, 0.78);
  const warheadYellow = plain('#f0b629', 0.34, 0.15);
  const motorBrown = plain('#7a4928', 0.42, 0.15);
  const nozzleDark = plain('#222730', 0.44, 0.65);

  const geos = useMemo(() => {
    // Đầu dò radar chủ động dạng tangent-ogive mượt (x: +1.18 .. +1.83, dài 0.65 m)
    const ogivePts: P2[] = [[0.001, 1.18]];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = 1.18 + u * 0.65;
      const r = 0.09 * Math.pow(1 - Math.pow(u, 1.65), 0.62);
      ogivePts.push([Math.max(0.003, r), x]);
    }
    const radome = lathe(ogivePts, 32);

    // Thân thép mảnh Ø0.18 m (R = 0.09 m, x: -1.73 .. +1.18)
    const body = lathe(
      [
        [0.001, -1.73],
        [0.078, -1.73],
        [0.09, -1.67],
        [0.09, 1.18],
        [0.001, 1.18],
      ],
      32,
    );

    // Loa phụt đuôi (x: -1.83 .. -1.73)
    const nozzle = lathe(
      [
        [0.001, -1.76],
        [0.052, -1.76],
        [0.074, -1.83],
        [0.081, -1.83],
        [0.078, -1.73],
        [0.001, -1.73],
      ],
      28,
    );

    // Cánh nâng giữa thân hình tam giác cụt (clipped-delta AIM-120C/D vừa khoang đạn F-35)
    const midWing = extrude(
      [
        [-0.2, 0.086],
        [0.26, 0.086],
        [-0.08, 0.238],
        [-0.2, 0.238],
      ],
      0.011,
      0.003,
    );

    // Cánh lái đuôi chữ thập hình tam giác cụt
    const tailFin = extrude(
      [
        [-1.77, 0.085],
        [-1.37, 0.085],
        [-1.62, 0.242],
        [-1.77, 0.242],
      ],
      0.011,
      0.003,
    );

    return { radome, body, nozzle, midWing, tailFin };
  }, []);

  return (
    <group>
      <mesh geometry={geos.radome} material={radomeMat} castShadow receiveShadow />
      <mesh position={[1.81, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={ringSteel}>
        <coneGeometry args={[0.013, 0.045, 16]} />
      </mesh>
      <mesh position={[1.18, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={ringSteel}>
        <cylinderGeometry args={[0.0915, 0.0915, 0.035, 32]} />
      </mesh>

      <mesh geometry={geos.body} material={bodyMat} castShadow receiveShadow />

      {/* Đai vàng (đầu đạn nổ phá mảnh thật) + đai nâu (động cơ rocket ít khói) */}
      <mesh position={[0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={warheadYellow}>
        <cylinderGeometry args={[0.0915, 0.0915, 0.085, 32]} />
      </mesh>
      <mesh position={[-0.66, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={motorBrown}>
        <cylinderGeometry args={[0.0915, 0.0915, 0.085, 32]} />
      </mesh>
      {[0.28, -1.32].map((xr) => (
        <mesh key={`aring-${xr}`} position={[xr, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={ringSteel}>
          <cylinderGeometry args={[0.0918, 0.0918, 0.022, 32]} />
        </mesh>
      ))}
      {[0.12, -0.95].map((xs) => (
        <mesh key={`shoe-${xs}`} position={[xs, 0.095, 0]} geometry={rbox(0.11, 0.022, 0.036, 0.005)} material={ringSteel} />
      ))}

      {/* 4 cánh nâng giữa thân + 4 cánh lái đuôi chữ thập X-cruciform */}
      {[0, 1, 2, 3].map((i) => (
        <group key={`afin-${i}`} rotation={[Math.PI / 4 + (i * Math.PI) / 2, 0, 0]}>
          <mesh geometry={geos.midWing} material={finTitanium} castShadow />
          <mesh geometry={geos.tailFin} material={finTitanium} castShadow />
          <mesh position={[-1.58, 0.09, 0]} geometry={rbox(0.12, 0.02, 0.026, 0.004)} material={ringSteel} />
        </group>
      ))}

      <mesh geometry={geos.nozzle} material={nozzleDark} castShadow />

      {f > 0.005 && (
        <group position={[-1.83, 0, 0]}>
          <pointLight position={[-0.25, 0, 0]} color="#ffab47" intensity={12 * f} distance={6} decay={1.7} />
          <mesh position={[-0.48 * f, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.072 * (0.55 + 0.45 * f), 0.96 * f, 16]} />
            <meshBasicMaterial color="#fff9df" transparent opacity={0.95 * Math.min(1, f * 1.4)} toneMapped={false} />
          </mesh>
          <mesh position={[-0.95 * f, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.125 * (0.5 + 0.5 * f), 1.9 * f, 16]} />
            <meshBasicMaterial color={P.flame} transparent opacity={0.6 * f} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ============================================================================
// 4. WRAPPER BÀN XOAY: HypersonicMissile (22 ft @ y = 1.05 m) + AMRAAM (12 ft @ z = 1.18 m, y = 0.88 m)
// Cao độ y = 0.88 m @ z = 1.18 m được tính toán hình học để AMRAAM thấy rõ trọn vẹn ở cả 4 góc chụp (không bị thân Ø0.58 m che ở góc 215° hay 90°).
// ============================================================================
const HypersonicDisplay: React.FC = () => {
  const standYellow = plain('#dfa528', 0.4, 0.35);
  const standSlate = plain('#3a4552', 0.48, 0.55);
  const padRubber = plain('#1f242b', 0.88, 0.1);

  return (
    <group>
      {/* Khung đế dầm thép kỹ thuật liên kết hai giá đỡ, chân chạm phẳng y = 0 */}
      <mesh position={[-0.35, 0.04, 0]} geometry={rbox(4.2, 0.08, 0.84, 0.02)} material={standSlate} castShadow receiveShadow />
      {[-1.75, 0.55].map((xf) => (
        <mesh key={`fbeam-${xf}`} position={[xf, 0.04, 0.64]} geometry={rbox(0.22, 0.08, 1.68, 0.02)} material={standSlate} castShadow receiveShadow />
      ))}

      {/* Trụ giá chính sơn vàng kỹ thuật đỡ HypersonicMissile ở đúng y = 1.05 m */}
      {[-1.75, 0.55].map((xs) => (
        <group key={`hsaddle-${xs}`} position={[xs, 0, 0]}>
          <mesh position={[0, 0.42, 0]} geometry={rbox(0.18, 0.72, 0.58, 0.02)} material={standYellow} castShadow receiveShadow />
          <mesh position={[0, 0.74, 0]} geometry={rbox(0.22, 0.1, 0.7, 0.02)} material={standYellow} castShadow />
          {[-0.24, 0.24].map((zp) => (
            <mesh key={zp} position={[0, 0.83, zp]} rotation={[zp > 0 ? -0.52 : 0.52, 0, 0]} geometry={rbox(0.2, 0.14, 0.16, 0.02)} material={padRubber} />
          ))}
        </group>
      ))}

      {/* Giá phụ song song ở z = 1.28 m đỡ AIM-120D AMRAAM (y = 0.79 m) để tách bạch hình chiếu ngang & 3/4 sau */}
      <mesh position={[-0.03, 0.035, 1.28]} geometry={rbox(2.36, 0.07, 0.38, 0.015)} material={standSlate} castShadow receiveShadow />
      {[-0.88, 0.82].map((xs) => (
        <group key={`asaddle-${xs}`} position={[xs, 0, 1.28]}>
          <mesh position={[0, 0.38, 0]} geometry={rbox(0.1, 0.64, 0.24, 0.015)} material={standYellow} castShadow receiveShadow />
          <mesh position={[0, 0.69, 0]} geometry={rbox(0.13, 0.05, 0.24, 0.01)} material={padRubber} />
        </group>
      ))}
      {/* Thanh giằng ngang liên kết chắc chắn giữa hai giá ở x = +0.55 */}
      <mesh position={[0.55, 0.42, 0.66]} geometry={rbox(0.1, 0.09, 1.16, 0.015)} material={standSlate} castShadow />

      {/* Vũ khí chính 22 ft (6.71 m) ở y = 1.05 m & vũ khí đối chiếu 12 ft (3.66 m) song song ở z = 1.28 m */}
      <group position={[0, 1.05, 0]}>
        <HypersonicMissile />
      </group>
      <group position={[0, 0.79, 1.28]}>
        <AMRAAM />
      </group>
    </group>
  );
};

export const MODELS: ModelSet = {
  SamBattery: { C: SamBattery, size: 14, center: [0, 2.6, 0] },
  HypersonicMissile: { C: HypersonicDisplay, size: 7, center: [0, 0.9, 0] },
};
