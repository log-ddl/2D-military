// Mô hình 3D tiêm kích đánh chặn hạng nặng mang phóng tên lửa siêu vượt âm MiG-31K Foxhound.
// Quy ước trục 1:1 mét thật: mũi hướng +X (dài 22.62 m: -11.31..+11.31), đỉnh +Y (cao 6.15 m), sải cánh theo Z (13.46 m: -6.73..+6.73).
import React from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL2D, PAL3D } from '../palette';

/** Toạ độ tâm treo tên lửa Kinzhal dưới giá phóng trung tâm AKU dưới bụng MiG-31K. */
export const MIG31_PYLON_OFFSET: [number, number, number] = [0.4, -1.25, 0];

export type MiG31KProps = {
  /** Độ mở luồng lửa đốt sau đôi D-30F6 (0..1, mặc định 0.6). */
  afterburner?: number;
  /** Hạ càng đáp (mặc định false khi bay tầng bình lưu). */
  gearDown?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

type SuperStation = {
  x: number;
  yc: number;
  ry: number;
  rz: number;
  /** Bậc superellipse: 2 = tròn/elip, >3.5 = hộp chữ nhật bo góc. */
  p: number;
};

/** Dựng khối thân chuyển tiết diện mượt từ mũi tròn/oval sang thân hộp vuông vức đặc trưng của MiG-31. */
const buildSuperLoft = (stations: SuperStation[], seg = 36, uvScale = 0.38): THREE.BufferGeometry => {
  const rows = stations.length;
  const cols = seg + 1;
  const pos = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const idx: number[] = [];

  for (let i = 0; i < rows; i++) {
    const st = stations[i];
    const exp = 2 / st.p;
    for (let j = 0; j < cols; j++) {
      const th = (j / seg) * Math.PI * 2;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const y = st.yc + st.ry * Math.sign(c) * Math.pow(Math.abs(c), exp);
      const z = st.rz * Math.sign(s) * Math.pow(Math.abs(s), exp);
      const k = i * cols + j;
      pos[k * 3] = st.x;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z;
      uvs[k * 2] = st.x * uvScale;
      uvs[k * 2 + 1] = (j / seg) * 2 * Math.PI * ((st.ry + st.rz) * 0.5) * uvScale;
    }
  }

  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = (i + 1) * cols + j;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// ---------------- HÌNH HỌC TĨNH CACHE CẤP MODULE ----------------

// 1. Mũi chóp radar Ogive dài sắc nét (24 trạm mượt, x: +6.55 .. +10.48, hơi chúi mũi săn mồi)
const RADOME_STATIONS: SuperStation[] = Array.from({ length: 24 }, (_, i) => {
  const u = i / 23;
  const x = 6.55 + u * 3.93;
  const r = 0.72 * Math.pow(1 - Math.pow(u, 1.48), 0.72) + 0.014 * (1 - u);
  const yc = -0.03 - 0.13 * Math.pow(u, 1.35);
  return { x, yc, ry: Math.max(0.018, r), rz: Math.max(0.018, r * 0.98), p: 2.0 };
});
const GEO_RADOME = buildSuperLoft(RADOME_STATIONS, 36, 0.45);

// Ống Pitot mũi (x: +10.44 .. +11.31 -> chạm đúng mốc +11.31 m)
const GEO_PITOT = lathe(
  [
    [0.042, 0.0],
    [0.032, 0.18],
    [0.022, 0.45],
    [0.013, 0.72],
    [0.004, 0.87],
  ],
  18
);

// 2. Lõi thân trước & thân trung tâm (x: -8.90 .. +6.55), khớp khít tại x = +6.55 với Radome
const FUSELAGE_CORE_STATIONS: SuperStation[] = [
  { x: -8.9, yc: 0.02, ry: 0.52, rz: 0.78, p: 3.2 },
  { x: -7.5, yc: 0.01, ry: 0.64, rz: 0.92, p: 3.8 },
  { x: -5.2, yc: 0.0, ry: 0.72, rz: 0.98, p: 4.2 },
  { x: -2.0, yc: 0.0, ry: 0.73, rz: 0.98, p: 4.4 },
  { x: 1.2, yc: 0.01, ry: 0.74, rz: 0.96, p: 4.2 },
  { x: 2.8, yc: 0.02, ry: 0.78, rz: 0.94, p: 3.8 },
  { x: 4.0, yc: 0.03, ry: 0.8, rz: 0.88, p: 3.1 },
  { x: 5.0, yc: 0.02, ry: 0.78, rz: 0.81, p: 2.5 },
  { x: 5.85, yc: 0.0, ry: 0.75, rz: 0.76, p: 2.15 },
  { x: 6.55, yc: -0.03, ry: 0.72, rz: 0.72, p: 2.0 },
];
const GEO_FUSELAGE_CORE = buildSuperLoft(FUSELAGE_CORE_STATIONS, 36, 0.38);

// Mảng ốp bụng phẳng dưới thân (sơn màu bụng sáng migBelly)
const GEO_BELLY_PAN = extrude(
  [
    [-7.8, -0.52],
    [-6.2, -0.71],
    [2.8, -0.72],
    [5.2, -0.66],
    [6.35, -0.52],
    [6.1, -0.36],
    [-7.4, -0.36],
  ],
  1.74,
  0.05
);

// 3. Buồng lái đôi Tandem & Sống lưng dài (Dorsal Spine) chạy suốt từ sau WSO tới đuôi
const GEO_DORSAL_SPINE = extrude(
  [
    [-9.45, 0.42],
    [-8.7, 0.64],
    [-5.5, 0.86],
    [-1.5, 1.02],
    [2.1, 1.18],
    [3.78, 1.27],
    [3.78, 0.58],
    [-9.1, 0.36],
  ],
  0.88,
  0.14
);

const CANOPY_GLASS_PTS: P2[] = [
  [2.25, 0.66],
  [2.25, 1.21],
  [2.65, 1.25],
  [3.15, 1.28],
  [3.65, 1.31],
  [4.05, 1.33],
  [4.42, 1.33],
  [4.75, 1.31],
  [5.05, 1.26],
  [5.35, 1.18],
  [5.65, 1.06],
  [5.92, 0.93],
  [6.16, 0.79],
  [6.32, 0.67],
  [6.1, 0.6],
  [2.35, 0.6],
];
const GEO_CANOPY_GLASS = extrude(CANOPY_GLASS_PTS, 0.78, 0.12);

const GEO_WSO_ROOF = extrude(
  [
    [2.12, 1.12],
    [2.35, 1.23],
    [3.58, 1.32],
    [3.64, 1.16],
    [2.22, 1.05],
  ],
  0.81,
  0.07
);

const GEO_CANOPY_FRAME_1 = extrude(
  [
    [5.02, 0.65],
    [4.96, 1.29],
    [5.1, 1.27],
    [5.16, 0.65],
  ],
  0.81,
  0.02
);
const GEO_CANOPY_FRAME_2 = extrude(
  [
    [3.66, 0.65],
    [3.66, 1.34],
    [3.88, 1.33],
    [3.88, 0.65],
  ],
  0.82,
  0.025
);

// 4. Hai cửa hút khí hộp chữ nhật khổng lồ vát chéo hai bên hông (Boxy Wedge Side Intakes)
const GEO_INTAKE_TRUNK = extrude(
  [
    [-7.1, -0.58],
    [-5.4, -0.71],
    [2.28, -0.71],
    [2.28, 0.62],
    [-5.0, 0.58],
    [-7.1, 0.45],
  ],
  0.88,
  0.06
);

// Tấm vách ngoài của miệng hút khí vát chéo 45° (x trên +4.65 -> x dưới +3.10)
const GEO_INTAKE_OUTER_WALL = extrude(
  [
    [2.2, -0.71],
    [3.1, -0.71],
    [4.65, 0.62],
    [2.2, 0.62],
  ],
  0.075,
  0.012
);

// Gờ môi kim loại sáng dọc cạnh chéo cửa hút khí (intake anti-ice leading lip)
const GEO_INTAKE_CHEEK_LIP = extrude(
  [
    [3.04, -0.71],
    [3.14, -0.71],
    [4.69, 0.62],
    [4.58, 0.62],
  ],
  0.085,
  0.008
);

// Phù hiệu tam giác cảnh báo nguy hiểm đỏ-trắng bên cạnh miệng hút khí Nga
const GEO_INTAKE_WARN = extrude(
  [
    [2.65, -0.15],
    [3.32, 0.04],
    [2.85, 0.25],
  ],
  0.016,
  0.002
);

// Tấm tách lớp biên (Splitter Plate) nằm cách hông thân một khe tối rõ rệt, vươn tới x = +5.02
const GEO_SPLITTER_PLATE = extrude(
  [
    [2.15, -0.68],
    [3.36, -0.68],
    [5.02, 0.63],
    [2.15, 0.63],
  ],
  0.055,
  0.008
);

// Tấm nóc cửa hút khí & ramp điều chỉnh sóng xung kích siêu âm
const GEO_INTAKE_TOP_RAMP = extrude(
  [
    [2.2, 0.34],
    [3.35, 0.46],
    [4.65, 0.62],
    [4.52, 0.64],
    [2.2, 0.62],
  ],
  0.86,
  0.012
);

// Môi dưới cửa hút khí
const GEO_INTAKE_BOTTOM_LIP = extrude(
  [
    [2.2, -0.71],
    [3.14, -0.71],
    [3.08, -0.62],
    [2.2, -0.6],
  ],
  0.86,
  0.012
);

// Khối hốc tối sâu bên trong miệng hút khí
const GEO_INTAKE_CAVITY = extrude(
  [
    [1.95, -0.63],
    [2.88, -0.63],
    [3.92, 0.48],
    [1.95, 0.48],
  ],
  0.78,
  0.01
);

// 5. Hai bầu ống động cơ song song D-30F6 phía đuôi & Loa phụt đại bác
const GEO_ENGINE_TUNNEL = lathe(
  [
    [0.64, -9.22],
    [0.71, -8.5],
    [0.73, -6.8],
    [0.71, -5.2],
    [0.62, -3.8],
  ],
  32
);

const GEO_NOZZLE_OUTER = lathe(
  [
    [0.63, -10.86],
    [0.67, -10.35],
    [0.72, -9.7],
    [0.7, -9.18],
  ],
  28
);

const GEO_NOZZLE_INNER = lathe(
  [
    [0.02, -9.45],
    [0.54, -9.5],
    [0.58, -10.85],
    [0.63, -10.86],
  ],
  24
);

const GEO_NOZZLE_PETAL = rbox(1.62, 0.045, 0.14, 0.012);

const GEO_TAIL_STINGER = lathe(
  [
    [0.03, -9.85],
    [0.14, -9.35],
    [0.24, -8.6],
  ],
  18
);

// 6. Cánh chính đặt cao (High-mounted Swept Wing, góc xuôi 40.5°, sải 13.46 m -> z tới ±6.73)
const WING_RIGHT_PTS: P2[] = [
  [2.72, 1.74],
  [1.82, 1.98],
  [0.98, 2.28],
  [-2.86, 6.73],
  [-4.18, 6.73],
  [-3.96, 4.35],
  [-4.28, 1.74],
];
const GEO_WING_RIGHT = extrudeTop(WING_RIGHT_PTS, 0.14, 0.028);

const WING_LEFT_PTS: P2[] = WING_RIGHT_PTS.map(([x, z]): P2 => [x, -z]).reverse();
const GEO_WING_LEFT = extrudeTop(WING_LEFT_PTS, 0.14, 0.028);

const GEO_WING_FENCE = extrude(
  [
    [-2.4, 0.0],
    [0.05, 0.0],
    [-0.18, 0.14],
    [-2.25, 0.1],
  ],
  0.03,
  0.004
);

const GEO_UNDERWING_PYLON = extrude(
  [
    [-2.85, -0.34],
    [-0.35, -0.34],
    [0.12, 0.02],
    [-2.55, 0.02],
  ],
  0.14,
  0.018
);

// 7. Hai cánh đuôi ngang toàn động (Stabilators)
const STAB_RIGHT_PTS: P2[] = [
  [-6.65, 1.38],
  [-9.58, 4.34],
  [-10.66, 4.34],
  [-9.88, 1.38],
];
const GEO_STAB_RIGHT = extrudeTop(STAB_RIGHT_PTS, 0.095, 0.018);

const STAB_LEFT_PTS: P2[] = STAB_RIGHT_PTS.map(([x, z]): P2 => [x, -z]).reverse();
const GEO_STAB_LEFT = extrudeTop(STAB_LEFT_PTS, 0.095, 0.018);

// 8. Hai cánh đuôi đứng lớn nghiêng nhẹ ra ngoài (Canted Twin Vertical Tails)
const GEO_VTAIL_FIN = extrude(
  [
    [-10.38, 0.0],
    [-6.15, 0.0],
    [-9.48, 3.24],
    [-10.86, 3.24],
  ],
  0.11,
  0.02
);

const GEO_VTAIL_STRAKE = extrude(
  [
    [-6.5, 0.0],
    [-4.55, 0.0],
    [-6.15, 0.42],
  ],
  0.1,
  0.016
);

const GEO_VTAIL_CAP = extrude(
  [
    [-10.88, 3.04],
    [-9.28, 3.04],
    [-9.48, 3.28],
    [-10.88, 3.28],
  ],
  0.115,
  0.015
);

const makeStarPts = (rOut: number, rIn: number): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
};
const GEO_STAR_BORDER = extrude(makeStarPts(0.37, 0.148), 0.014, 0.001);
const GEO_STAR_RED = extrude(makeStarPts(0.32, 0.128), 0.018, 0.001);

// 9. Hai vây bụng lớn dưới đuôi (Twin Ventral Fins)
const GEO_VENTRAL_FIN = extrude(
  [
    [-9.75, 0.0],
    [-6.15, 0.0],
    [-7.15, -0.84],
    [-9.45, -0.84],
  ],
  0.08,
  0.014
);

// 10. Giá phóng trung tâm hạng nặng AKU dưới bụng cho tên lửa Kinzhal
// Đáy trung tâm tại y = -0.79 khớp đúng lưng Kinzhal (r=0.46 tại MIG31_PYLON_OFFSET [0.4, -1.25, 0]);
// hai má yếm ốp hai bên (z = ±0.28) vươn xuống y = -0.90 ôm tiếp tuyến vỏ trụ Kinzhal mà không xuyên đạn!
const GEO_AKU_PYLON = extrude(
  [
    [-2.55, -0.79],
    [2.85, -0.79],
    [3.38, -0.64],
    [-2.1, -0.64],
  ],
  0.34,
  0.025
);

const GEO_AKU_CHEEK = extrude(
  [
    [-2.25, -0.89],
    [2.55, -0.89],
    [2.95, -0.74],
    [-1.95, -0.74],
  ],
  0.06,
  0.01
);

const GEO_AKU_SADDLE = extrude(
  [
    [-0.26, -0.91],
    [0.26, -0.91],
    [0.22, -0.75],
    [-0.22, -0.75],
  ],
  0.58,
  0.012
);

// Luồng lửa đốt sau (Afterburner Plumes)
const GEO_AB_OUTER = lathe(
  [
    [0.03, -4.2],
    [0.28, -2.8],
    [0.52, -1.2],
    [0.58, -0.25],
    [0.54, 0.0],
  ],
  20
);
const GEO_AB_CORE = lathe(
  [
    [0.015, -2.9],
    [0.18, -1.6],
    [0.36, -0.5],
    [0.4, 0.0],
  ],
  18
);
const GEO_SHOCK_DIAMOND = lathe(
  [
    [0.02, -0.22],
    [0.24, 0.0],
    [0.02, 0.22],
  ],
  16
);

const RIVET_PTS: [number, number, number][] = [];
for (let i = 0; i < 14; i++) {
  const x = -5.4 + i * 0.56;
  RIVET_PTS.push([x, 0.61, 1.9], [x, 0.61, -1.9], [x, -0.68, 1.9], [x, -0.68, -1.9]);
}

// ---------------- VẬT LIỆU CACHE (SÁNG RÕ TÔNG XÁM XANH VKS CHUẨN MIG-31K) ----------------
const MAT_BODY = paint({
  color: '#8292a1',
  wear: 0.09,
  dirt: 0.06,
  roughness: 0.5,
  metalness: 0.16,
  repeat: 0.38,
  seed: 31,
});

const MAT_BELLY = paint({
  color: '#9ba8b5',
  wear: 0.08,
  dirt: 0.07,
  roughness: 0.54,
  metalness: 0.15,
  repeat: 0.38,
  seed: 33,
});

const MAT_TITANIUM = paint({
  color: '#55606d',
  wear: 0.26,
  dirt: 0.18,
  roughness: 0.42,
  metalness: 0.56,
  repeat: 0.5,
  seed: 39,
});

const MAT_RADOME = plain(PAL3D.migRadome, 0.46, 0.14);
const MAT_DARK_STEEL = plain(PAL3D.darkSteel, 0.38, 0.68);
const MAT_STEEL = plain(PAL3D.steel, 0.32, 0.72);
const MAT_LIP_ALLOY = plain('#b6c1cc', 0.36, 0.52);
const MAT_CAVITY = plain('#090d12', 0.96, 0.06);
const MAT_GLASS = plain('#23415e', 0.14, 0.24);
const MAT_BRASS = plain(PAL3D.brass, 0.35, 0.7);
const MAT_STAR_RED = plain(PAL2D.red, 0.48, 0.12);
const MAT_STAR_WHITE = plain('#f1f5f9', 0.52, 0.08);

export const MiG31K: React.FC<MiG31KProps> = ({
  afterburner = 0.6,
  gearDown = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: MiG31KProps = {}) => {
  const ab = Math.max(0, Math.min(1, afterburner));

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Radome mũi Ogive & ống Pitot sắc nhọn */}
      <mesh geometry={GEO_RADOME} material={MAT_RADOME} castShadow receiveShadow />
      <mesh
        geometry={GEO_PITOT}
        material={MAT_STEEL}
        position={[10.44, -0.16, 0]}
        rotation={[0, 0, -0.025]}
        castShadow
      />
      {/* Đai kim loại sáng tại khớp nối khoang radar Zaslon-M */}
      <mesh position={[6.55, -0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_LIP_ALLOY} castShadow>
        <cylinderGeometry args={[0.726, 0.726, 0.07, 36]} />
      </mesh>
      {/* Dải chống sét mảnh dọc chóp radome */}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`strip-${side}`}
          position={[8.1, -0.09, side * 0.52]}
          rotation={[0, side * 0.16, -0.04]}
          material={MAT_LIP_ALLOY}
        >
          <boxGeometry args={[2.5, 0.018, 0.02]} />
        </mesh>
      ))}
      {/* Khối cảm biến tìm kiếm hồng ngoại 8TK IRST dưới mũi trước */}
      <mesh position={[6.15, -0.71, 0]} material={MAT_DARK_STEEL} castShadow>
        <boxGeometry args={[0.62, 0.18, 0.28]} />
      </mesh>
      <mesh position={[6.46, -0.72, 0]} material={MAT_GLASS}>
        <sphereGeometry args={[0.11, 16, 12]} />
      </mesh>

      {/* 2. Lõi thân trước, thân giữa, bụng dưới & sống lưng Dorsal Spine */}
      <mesh geometry={GEO_FUSELAGE_CORE} material={MAT_BODY} castShadow receiveShadow />
      <mesh geometry={GEO_BELLY_PAN} material={MAT_BELLY} castShadow receiveShadow />
      <mesh geometry={GEO_DORSAL_SPINE} material={MAT_BODY} castShadow receiveShadow />
      <mesh geometry={GEO_TAIL_STINGER} material={MAT_RADOME} position={[0, 0.38, 0]} castShadow />

      {/* 3. Buồng lái đôi Tandem (phi công + WSO) */}
      <mesh geometry={GEO_CANOPY_GLASS} material={MAT_GLASS} castShadow />
      <mesh geometry={GEO_WSO_ROOF} material={MAT_BODY} castShadow receiveShadow />
      <mesh geometry={GEO_CANOPY_FRAME_1} material={MAT_BELLY} castShadow />
      <mesh geometry={GEO_CANOPY_FRAME_2} material={MAT_BELLY} castShadow />
      {/* Đầu ghế phóng K-36DM bên trong khoang trước */}
      <mesh position={[4.3, 1.05, 0]} material={MAT_DARK_STEEL}>
        <boxGeometry args={[0.26, 0.36, 0.32]} />
      </mesh>
      {/* Ăng-ten cánh dao trên sống lưng & dưới cằm */}
      <mesh position={[0.85, 1.24, 0]} rotation={[0, 0, -0.35]} material={MAT_BELLY} castShadow>
        <boxGeometry args={[0.38, 0.28, 0.03]} />
      </mesh>
      <mesh position={[5.35, -0.82, 0]} rotation={[0, 0, 0.35]} material={MAT_BELLY} castShadow>
        <boxGeometry args={[0.3, 0.22, 0.025]} />
      </mesh>

      {/* 4. Hai cửa hút khí hộp chữ nhật khổng lồ vát chéo hai bên hông + Splitter Plate */}
      {([-1, 1] as const).map((side) => (
        <group key={`intake-${side}`}>
          {/* Thân hộp dẫn khí chạy dọc hai bên sườn */}
          <mesh
            geometry={GEO_INTAKE_TRUNK}
            material={MAT_BODY}
            position={[0, 0, side * 1.48]}
            castShadow
            receiveShadow
          />
          {/* Tấm tách lớp biên (Splitter Plate) cách hông thân một khe tối sâu */}
          <mesh
            geometry={GEO_SPLITTER_PLATE}
            material={MAT_BELLY}
            position={[0, 0, side * 1.07]}
            castShadow
            receiveShadow
          />
          {/* Các thanh chống tách lớp biên giữa thân và tấm splitter */}
          {[2.8, 3.5, 4.15].map((sx) => (
            <mesh key={sx} position={[sx, 0.02, side * 1.0]} material={MAT_CAVITY}>
              <boxGeometry args={[0.24, 0.76, 0.14]} />
            </mesh>
          ))}
          {/* Thành ngoài vát chéo 45° + gờ hợp kim sáng ở mép hút khí */}
          <mesh
            geometry={GEO_INTAKE_OUTER_WALL}
            material={MAT_BODY}
            position={[0, 0, side * 1.89]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={GEO_INTAKE_CHEEK_LIP}
            material={MAT_LIP_ALLOY}
            position={[0, 0, side * 1.89]}
            castShadow
          />
          {/* Tam giác đỏ cảnh báo nguy hiểm miệng hút khí đặc trưng máy bay phản lực Nga */}
          <mesh
            geometry={GEO_INTAKE_WARN}
            material={MAT_STAR_RED}
            position={[0, 0, side * 1.932]}
          />
          {/* Nóc ramp điều dòng siêu âm & môi dưới cửa hút khí */}
          <mesh
            geometry={GEO_INTAKE_TOP_RAMP}
            material={MAT_LIP_ALLOY}
            position={[0, 0, side * 1.49]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={GEO_INTAKE_BOTTOM_LIP}
            material={MAT_LIP_ALLOY}
            position={[0, 0, side * 1.49]}
            castShadow
            receiveShadow
          />
          {/* Hốc hút tối sâu bên trong miệng hút */}
          <mesh geometry={GEO_INTAKE_CAVITY} material={MAT_CAVITY} position={[0, 0, side * 1.49]} />
          {/* Tầng cánh quạt nén thấp thoáng sâu trong cổ họng hút khí */}
          <mesh position={[1.96, -0.05, side * 1.49]} rotation={[0, 0, Math.PI / 2]} material={MAT_DARK_STEEL}>
            <cylinderGeometry args={[0.42, 0.42, 0.08, 20]} />
          </mesh>
        </group>
      ))}

      {/* 5. Hai bầu ống động cơ song song D-30F6 phía đuôi & Loa phụt đại bác */}
      {([-1, 1] as const).map((side) => {
        const ez = side * 0.78;
        return (
          <group key={`eng-${side}`} position={[0, -0.02, ez]}>
            <mesh geometry={GEO_ENGINE_TUNNEL} material={MAT_TITANIUM} castShadow receiveShadow />
            <mesh geometry={GEO_NOZZLE_OUTER} material={MAT_DARK_STEEL} castShadow receiveShadow />
            <mesh geometry={GEO_NOZZLE_INNER} material={MAT_CAVITY} />

            {/* 16 thanh cánh điều tiết kim loại đen quanh loa phụt D-30F6 */}
            {Array.from({ length: 16 }, (_, k) => {
              const ang = (k / 16) * Math.PI * 2;
              const r = 0.695;
              return (
                <mesh
                  key={k}
                  geometry={GEO_NOZZLE_PETAL}
                  material={MAT_DARK_STEEL}
                  position={[-10.02, Math.cos(ang) * r, Math.sin(ang) * r]}
                  rotation={[ang, 0, side * 0.03]}
                  castShadow
                />
              );
            })}

            {/* Vòng giữ lửa đốt sau sâu trong họng phụt */}
            <mesh
              position={[-9.55, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              material={plain('#2b1a12', 0.6, 0.3, {
                emissive: new THREE.Color(PAL3D.flame),
                emissiveIntensity: ab > 0 ? 0.5 + ab * 1.6 : 0.05,
              })}
            >
              <torusGeometry args={[0.38, 0.045, 10, 24]} />
            </mesh>

            {/* Luồng lửa đốt sau đôi */}
            {ab > 0.01 && (
              <group position={[-10.76, 0, 0]} scale={[0.55 + ab * 0.85, 0.82 + ab * 0.22, 0.82 + ab * 0.22]}>
                <mesh
                  geometry={GEO_AB_OUTER}
                  material={plain(PAL3D.flame, 0.3, 0, {
                    emissive: new THREE.Color(PAL3D.flame),
                    emissiveIntensity: 2.0 * ab,
                    transparent: true,
                    opacity: 0.42 * ab,
                    depthWrite: false,
                  })}
                />
                <mesh
                  geometry={GEO_AB_OUTER}
                  scale={[0.78, 0.78, 0.78]}
                  material={plain('#66c7ff', 0.2, 0, {
                    emissive: new THREE.Color('#4db8ff'),
                    emissiveIntensity: 1.9 * ab,
                    transparent: true,
                    opacity: 0.36 * ab,
                    depthWrite: false,
                  })}
                />
                <mesh
                  geometry={GEO_AB_CORE}
                  material={plain(PAL3D.flameCore, 0.1, 0, {
                    emissive: new THREE.Color(PAL3D.flameCore),
                    emissiveIntensity: 2.8 * ab,
                    transparent: true,
                    opacity: 0.86 * ab,
                    depthWrite: false,
                  })}
                />
                {[0.55, 1.25, 1.95, 2.65].map((dx, idx) => (
                  <mesh
                    key={idx}
                    geometry={GEO_SHOCK_DIAMOND}
                    position={[-dx, 0, 0]}
                    scale={[1 - idx * 0.16, 1 - idx * 0.18, 1 - idx * 0.18]}
                    material={plain('#fff8dc', 0.1, 0, {
                      emissive: new THREE.Color('#ffe6a3'),
                      emissiveIntensity: 3.0 * ab,
                      transparent: true,
                      opacity: (0.78 - idx * 0.14) * ab,
                      depthWrite: false,
                    })}
                  />
                ))}
              </group>
            )}
          </group>
        );
      })}

      {/* 6. Cánh chính đặt cao (High-mounted Swept Wing 40°, chúc nhẹ -2°) + 4 mấu giá treo dưới cánh */}
      <group position={[0, 0.48, 0]}>
        <group rotation={[-0.032, 0, 0]}>
          <mesh geometry={GEO_WING_RIGHT} material={MAT_BODY} castShadow receiveShadow />
          <mesh geometry={GEO_WING_FENCE} material={MAT_BELLY} position={[-0.35, 0.13, 3.45]} castShadow />
          <mesh geometry={GEO_UNDERWING_PYLON} material={MAT_BELLY} position={[-0.75, -0.02, 3.05]} castShadow />
          <mesh geometry={GEO_UNDERWING_PYLON} material={MAT_BELLY} position={[-1.75, -0.02, 4.55]} castShadow />
          {/* Ngôi sao đỏ trên mặt trên cánh phải */}
          <group position={[-2.6, 0.145, 5.1]} rotation={[-Math.PI / 2, 0, -0.22]}>
            <mesh geometry={GEO_STAR_BORDER} material={MAT_STAR_WHITE} />
            <mesh geometry={GEO_STAR_RED} material={MAT_STAR_RED} />
          </group>
          <mesh position={[-3.52, 0.07, 6.72]} material={MAT_RADOME} castShadow>
            <boxGeometry args={[1.42, 0.08, 0.07]} />
          </mesh>
          <mesh
            position={[-2.86, 0.07, 6.74]}
            material={plain(PAL2D.green, 0.2, 0, { emissive: new THREE.Color(PAL2D.green), emissiveIntensity: 1.4 })}
          >
            <sphereGeometry args={[0.04, 10, 8]} />
          </mesh>
        </group>

        <group rotation={[0.032, 0, 0]}>
          <mesh geometry={GEO_WING_LEFT} material={MAT_BODY} castShadow receiveShadow />
          <mesh geometry={GEO_WING_FENCE} material={MAT_BELLY} position={[-0.35, 0.13, -3.45]} castShadow />
          <mesh geometry={GEO_UNDERWING_PYLON} material={MAT_BELLY} position={[-0.75, -0.02, -3.05]} castShadow />
          <mesh geometry={GEO_UNDERWING_PYLON} material={MAT_BELLY} position={[-1.75, -0.02, -4.55]} castShadow />
          {/* Ngôi sao đỏ trên mặt trên cánh trái */}
          <group position={[-2.6, 0.145, -5.1]} rotation={[-Math.PI / 2, 0, 0.22]}>
            <mesh geometry={GEO_STAR_BORDER} material={MAT_STAR_WHITE} />
            <mesh geometry={GEO_STAR_RED} material={MAT_STAR_RED} />
          </group>
          <mesh position={[-3.52, 0.07, -6.72]} material={MAT_RADOME} castShadow>
            <boxGeometry args={[1.42, 0.08, 0.07]} />
          </mesh>
          <mesh
            position={[-2.86, 0.07, -6.74]}
            material={plain(PAL2D.red, 0.2, 0, { emissive: new THREE.Color(PAL2D.red), emissiveIntensity: 1.4 })}
          >
            <sphereGeometry args={[0.04, 10, 8]} />
          </mesh>
        </group>
      </group>

      {/* 7. Hai cánh đuôi ngang toàn động (Stabilators) đặt thấp */}
      <group position={[0, -0.18, 0]}>
        <mesh geometry={GEO_STAB_RIGHT} material={MAT_BODY} rotation={[-0.075, 0, 0]} castShadow receiveShadow />
        <mesh geometry={GEO_STAB_LEFT} material={MAT_BODY} rotation={[0.075, 0, 0]} castShadow receiveShadow />
      </group>

      {/* 8. Hai cánh đuôi đứng lớn nghiêng nhẹ ra ngoài (Canted Twin Vertical Tails) */}
      {([-1, 1] as const).map((side) => (
        <group
          key={`vtail-${side}`}
          position={[0, 0.56, side * 1.28]}
          rotation={[side * 0.165, 0, 0]}
        >
          <mesh geometry={GEO_VTAIL_FIN} material={MAT_BODY} castShadow receiveShadow />
          <mesh geometry={GEO_VTAIL_STRAKE} material={MAT_BODY} castShadow receiveShadow />
          <mesh geometry={GEO_VTAIL_CAP} material={MAT_RADOME} castShadow />
          {/* Que phóng tĩnh điện nhô ra đúng mốc đuôi x = -11.31 */}
          <mesh position={[-11.08, 3.22, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_STEEL}>
            <cylinderGeometry args={[0.012, 0.018, 0.46, 8]} />
          </mesh>
          {/* Phù hiệu Ngôi sao đỏ VKS gắn cả mặt ngoài và mặt trong cánh đuôi đứng */}
          {([-1, 1] as const).map((face) => (
            <group key={face} position={[-8.85, 1.85, face * 0.056]}>
              <mesh geometry={GEO_STAR_BORDER} material={MAT_STAR_WHITE} />
              <mesh geometry={GEO_STAR_RED} material={MAT_STAR_RED} />
            </group>
          ))}
        </group>
      ))}

      {/* 9. Hai vây bụng lớn dưới đuôi (Twin Ventral Fins) */}
      {([-1, 1] as const).map((side) => (
        <group
          key={`ventral-${side}`}
          position={[0, -0.58, side * 1.18]}
          rotation={[-side * 0.21, 0, 0]}
        >
          <mesh geometry={GEO_VENTRAL_FIN} material={MAT_BELLY} castShadow receiveShadow />
        </group>
      ))}

      {/* 10. Giá phóng trung tâm hạng nặng AKU dưới bụng thân (khớp khít MIG31_PYLON_OFFSET = [0.4, -1.25, 0]) */}
      <group>
        <mesh geometry={GEO_AKU_PYLON} material={MAT_DARK_STEEL} castShadow receiveShadow />
        {([-1, 1] as const).map((side) => (
          <mesh
            key={`aku-cheek-${side}`}
            geometry={GEO_AKU_CHEEK}
            material={MAT_BELLY}
            position={[0, 0, side * 0.27]}
            castShadow
          />
        ))}
        <mesh geometry={GEO_AKU_SADDLE} material={MAT_STEEL} position={[1.65, 0, 0]} castShadow />
        <mesh geometry={GEO_AKU_SADDLE} material={MAT_STEEL} position={[-0.75, 0, 0]} castShadow />
        <mesh position={[0.45, -0.78, 0]} material={MAT_BRASS} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.14, 16]} />
        </mesh>
        <mesh
          geometry={pipe(
            [
              [1.2, -0.7, 0.18],
              [0.7, -0.76, 0.18],
              [0.35, -0.78, 0.12],
            ],
            0.022,
            18
          )}
          material={MAT_STEEL}
        />
      </group>

      {/* 11. Càng đáp thu/thả theo gearDown */}
      {gearDown && (
        <group>
          <mesh position={[4.75, -1.35, 0]} rotation={[0, 0, 0.08]} material={MAT_STEEL} castShadow>
            <cylinderGeometry args={[0.075, 0.065, 1.45, 16]} />
          </mesh>
          <Wheel r={0.34} width={0.14} tire={PAL3D.tire} rim={PAL3D.steel} position={[4.68, -2.06, 0.13]} />
          <Wheel r={0.34} width={0.14} tire={PAL3D.tire} rim={PAL3D.steel} position={[4.68, -2.06, -0.13]} />
          <mesh position={[4.75, -0.86, 0.26]} material={MAT_BELLY} castShadow>
            <boxGeometry args={[1.15, 0.34, 0.04]} />
          </mesh>

          {([-1, 1] as const).map((side) => (
            <group key={`gear-${side}`} position={[-1.55, 0, side * 1.52]}>
              <mesh position={[0, -1.28, 0]} material={MAT_STEEL} castShadow>
                <cylinderGeometry args={[0.095, 0.085, 1.38, 16]} />
              </mesh>
              <mesh position={[0, -1.9, 0]} material={MAT_DARK_STEEL} castShadow>
                <boxGeometry args={[1.05, 0.12, 0.18]} />
              </mesh>
              <Wheel r={0.47} width={0.22} tire={PAL3D.tire} rim={PAL3D.steel} position={[0.42, -1.93, side * 0.12]} />
              <Wheel r={0.47} width={0.22} tire={PAL3D.tire} rim={PAL3D.steel} position={[-0.42, -1.93, -side * 0.08]} />
              <mesh position={[0, -0.95, side * 0.36]} rotation={[side * 0.18, 0, 0]} material={MAT_BELLY} castShadow>
                <boxGeometry args={[1.55, 0.58, 0.045]} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Hàng đinh tán chi tiết trên thành hộp hút khí */}
      <Rivets points={RIVET_PTS} r={0.016} color="#5d6a78" />
    </group>
  );
};

export const MODELS: ModelSet = {
  MiG31K: { C: () => <MiG31K position={[0, 2.5, 0]} />, size: 22.8, center: [0, 2.5, 0] },
};
