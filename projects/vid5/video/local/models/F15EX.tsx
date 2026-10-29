// Mô hình 3D chủ lực Boeing F-15EX Eagle II tỉ lệ thật 1:1 (1 đơn vị = 1 mét).
// Chiều dài: 19.43 m (x: -9.72 .. +9.71), sải cánh: 13.05 m (z: -6.525 .. +6.525), cao: 5.63 m (y: 0 .. 5.63 khi gear=1).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { P } from '../palette';

export type F15EXProps = {
  gear?: number;
  wheelSpin?: number;
  canopyOpen?: number;
  afterburner?: number;
  aileron?: number;
  elevator?: number;
  rudder?: number;
  wingTipMissiles?: boolean;
  fullLoad?: boolean;
  cft?: boolean;
  dropTanks?: boolean;
  bellyOutsized?: boolean;
  backSeatOccupied?: boolean;
};

// Hằng tọa độ mấu treo, loa phụt & mồi bẫy để các cảnh Bước B spawn đạn / lửa / flare khớp tuyệt đối
export const F15_STA1_POS: [number, number, number] = [-2.55, 1.9, -5.85];
export const F15_STA9_POS: [number, number, number] = [-2.45, 1.92, 5.85];
export const F15_CENTERLINE_POS: [number, number, number] = [-0.8, 0.75, 0];
export const F15_NOZZLE_L: [number, number, number] = [-9.72, 1.95, -0.72];
export const F15_NOZZLE_R: [number, number, number] = [-9.72, 1.95, 0.72];
export const F15_FLARE_POS: [number, number, number] = [-7.6, 1.24, 0];

// ---------- Vật liệu chuẩn F-15EX Eagle II (USAF Mod Eagle Two-Tone Gunship Slate Gray) ----------
const matAirframe = () =>
  paint({
    color: '#a6bacf',
    camo: ['#bfd2e6', '#8ea4ba'],
    camoScale: 0.5,
    wear: 0.14,
    dirt: 0.14,
    roughness: 0.52,
    metalness: 0.26,
    repeat: 0.35,
    seed: 15,
  });

const matAirframeLathe = () =>
  paint({
    color: '#a6bacf',
    camo: ['#bfd2e6', '#8ea4ba'],
    camoScale: 0.5,
    wear: 0.14,
    dirt: 0.14,
    roughness: 0.52,
    metalness: 0.26,
    repeat: 0.85,
    seed: 15,
  });

const matBelly = () =>
  paint({
    color: '#b5c8dc',
    camo: ['#c8daec', '#9db2c7'],
    camoScale: 0.5,
    wear: 0.12,
    dirt: 0.16,
    roughness: 0.55,
    metalness: 0.24,
    repeat: 0.35,
    seed: 21,
  });

// ---------- Biên dạng khí động & Geometry tĩnh ----------
// Chóp mũi radome APG-82(V)1 dài 3.66 m (28 điểm von-Kármán tangent ogive mượt mà)
const RADOME_PTS: P2[] = Array.from({ length: 28 }, (_, i) => {
  const u = i / 27; // 0 tại gốc (x=0), 1 tại mũi (x=3.66)
  const x = u * 3.66;
  const r = u > 0.992 ? 0.002 : 0.57 * Math.pow(1 - Math.pow(u, 1.42), 0.66) + 0.008 * (1 - u);
  return [r, x];
});

// Thân dưới bầu tròn buồng lái (x: 1.20 .. 6.05) — chừa khoang buồng lái rỗng từ y > 2.12 m
const FWD_LOWER_PTS: P2[] = Array.from({ length: 20 }, (_, i) => {
  const u = i / 19;
  const x = 1.2 + u * 4.85;
  const swell = Math.sin(Math.min(1, (1 - u) * 1.35) * Math.PI * 0.5);
  const r = 0.57 + 0.14 * swell;
  return [r, x];
});

// Cổ côn trước kính chắn gió (x: 4.88 .. 6.06) nối khít tuyệt đối vào đáy radome
const FWD_COLLAR_PTS: P2[] = Array.from({ length: 14 }, (_, i) => {
  const u = i / 13;
  const x = 4.88 + u * 1.18;
  const r = 0.62 * (1 - u) + 0.57 * u;
  return [r, x];
});

// Vỏ sơn trước động cơ F110 (x: -7.42 .. -2.60)
const NACELLE_FWD_PTS: P2[] = Array.from({ length: 14 }, (_, i) => {
  const u = i / 13;
  const x = -7.42 + u * 4.82;
  const r = 0.615 + 0.055 * Math.sin(u * Math.PI * 0.85);
  return [r, x];
});

// Tấm chắn nhiệt Titanium trần đặc trưng đuôi F-15 (x: -8.76 .. -7.40)
const NACELLE_TI_PTS: P2[] = Array.from({ length: 10 }, (_, i) => {
  const u = i / 9;
  const x = -8.76 + u * 1.36;
  const r = 0.595 + 0.022 * u;
  return [r, x];
});

// U ăng-ten đỉnh cánh đuôi đứng AN/ALQ-250 EPAWSS (dài 2.08 m: x từ -9.32 tới -7.24, nhô rõ ra trước mép cánh đuôi!)
const EPAWSS_POD_PTS: P2[] = Array.from({ length: 20 }, (_, i) => {
  const u = i / 19;
  const x = -9.32 + u * 2.08;
  let r = 0.11;
  if (u < 0.14) r = 0.03 + 0.08 * Math.sin((u / 0.14) * (Math.PI / 2));
  else if (u > 0.78) r = 0.11 * Math.cos(((u - 0.78) / 0.22) * (Math.PI / 2) * 0.94);
  return [Math.max(0.006, r), x];
});

// Thùng dầu phụ 600-gal hình thoi dài đúng 6.00 m (24 điểm Sears-Haack)
const DROP_TANK_PTS: P2[] = Array.from({ length: 24 }, (_, i) => {
  const u = i / 23;
  const x = -3.0 + u * 6.0;
  const s = Math.sin(u * Math.PI);
  const r = 0.41 * Math.pow(s, 0.72);
  return [Math.max(0.004, r), x];
});

// Thùng dầu khí động ốp thân CFT (Conformal Fuel Tank, dài 7.35 m: x từ -5.45 tới +1.90)
const CFT_PTS: P2[] = Array.from({ length: 22 }, (_, i) => {
  const u = i / 21;
  const x = -5.45 + u * 7.35;
  let f = 1;
  if (u < 0.24) f = Math.pow(Math.sin((u / 0.24) * (Math.PI / 2)), 0.75);
  else if (u > 0.76) f = Math.pow(Math.cos(((u - 0.76) / 0.24) * (Math.PI / 2)), 0.7);
  return [Math.max(0.01, 0.52 * f), x];
});

// Mặt bên má buồng lái nối liền từ cửa hút khí tới đáy radome (x: 0.80 .. 6.05)
const CHEEK_SIDE_PTS: P2[] = [
  [0.8, 1.55],
  [5.25, 1.52],
  [6.04, 1.78],
  [6.04, 2.45],
  [4.88, 2.5],
  [1.25, 2.52],
  [0.8, 2.48],
];

// Sống lưng dorsal spine nối mượt từ bản lề sau vòm kính (x=1.35, y=2.66) vuốt xuống giữa hai vỏ động cơ (x=-6.90)
const SPINE_PTS: P2[] = [
  [-6.9, 2.3],
  [-4.4, 2.5],
  [-1.5, 2.61],
  [0.4, 2.66],
  [1.36, 2.62],
  [1.36, 2.3],
  [-6.9, 2.22],
];

// Khối thân nâng trung tâm (lifting-body center fuselage)
const CENTER_BODY_PTS: P2[] = [
  [-7.25, 1.34],
  [-5.2, 1.25],
  [1.85, 1.24],
  [2.56, 1.3],
  [2.68, 2.43],
  [-5.6, 2.45],
  [-7.45, 2.28],
];

// Đuôi boom hai bên (mang cánh đuôi đứng & cánh đuôi ngang, x: -9.56 .. -4.40)
const TAIL_BOOM_PTS: P2[] = [
  [-9.56, 1.72],
  [-9.2, 1.44],
  [-7.4, 1.34],
  [-4.4, 1.34],
  [-4.4, 2.42],
  [-8.95, 2.42],
  [-9.56, 2.02],
];

// Thành ngoài ống hút khí chữ nhật vát góc liền khối từ x=+3.46 về thân giữa
const INTAKE_WALL_PTS: P2[] = [
  [-2.2, 1.25],
  [2.56, 1.3],
  [3.46, 2.46],
  [-2.2, 2.46],
];

// Tấm tách lớp biên (splitter plate) bên trong cửa hút khí
const SPLITTER_PTS: P2[] = [
  [-1.6, 1.28],
  [2.64, 1.32],
  [3.56, 2.45],
  [-1.6, 2.45],
];

// Tấm ramp biến thiên phía trên cửa hút khí
const INTAKE_RAMP_PTS: P2[] = [
  [1.65, 2.15],
  [3.46, 2.44],
  [3.46, 2.48],
  [1.65, 2.48],
];

// Cánh đuôi đứng chuẩn tỉ lệ F-15EX: gốc rộng (-5.08..-8.90), đỉnh thon (-7.88..-9.04, dây cung đỉnh 1.16 m)
// để u ăng-ten AN/ALQ-250 EPAWSS nhô sắc nét ra phía trước đỉnh đuôi! Cao tới y=5.51 + EPAWSS r=0.11 -> 5.63 m.
const VTAIL_FIN_PTS: P2[] = [
  [-4.48, 2.38], // vây dorsal fillet nhỏ phía trước gốc đuôi
  [-5.12, 2.5],
  [-7.88, 5.5], // mũi đỉnh cánh đuôi đứng
  [-9.04, 5.5], // mép sau đỉnh cánh đuôi đứng
  [-8.99, 4.78],
  [-8.48, 4.78], // hốc bánh lái hướng rudder
  [-8.3, 2.66],
  [-8.88, 2.66],
  [-8.86, 2.38],
];

const RUDDER_PTS: P2[] = [
  [0, 2.68],
  [-0.56, 2.68],
  [-0.67, 4.76],
  [-0.17, 4.76],
];

// ---------- Ghế phóng ACES-5 & Phi hành đoàn ----------
const AcesSeat: React.FC<{ position: [number, number, number]; occupied: boolean }> = ({ position, occupied }) => (
  <group position={position} rotation={[0, 0, 0.25]}>
    {/* Khung tựa lưng & hộp dù đầu ghế ACES-5 */}
    <mesh position={[-0.08, 0.4, 0]} geometry={rbox(0.11, 0.74, 0.4, 0.02)} material={plain('#222933', 0.7, 0.35)} />
    <mesh position={[-0.09, 0.82, 0]} geometry={rbox(0.15, 0.2, 0.32, 0.025)} material={plain('#2d3744', 0.65, 0.3)} />
    {/* Hai ống cảm biến pitot ổn định đầu ghế ACES-5 */}
    <mesh position={[0.02, 0.9, -0.14]} geometry={rbox(0.13, 0.026, 0.026, 0.008)} material={plain('#637282', 0.5, 0.5)} />
    <mesh position={[0.02, 0.9, 0.14]} geometry={rbox(0.13, 0.026, 0.026, 0.008)} material={plain('#637282', 0.5, 0.5)} />
    {/* Đệm ngồi olive & vòng giật phóng ghế vàng */}
    <mesh position={[0.12, 0.08, 0]} geometry={rbox(0.4, 0.1, 0.38, 0.025)} material={plain('#46523c', 0.85, 0.05)} />
    <mesh position={[0.02, 0.38, 0]} geometry={rbox(0.06, 0.48, 0.34, 0.02)} material={plain('#4c5942', 0.85, 0.05)} />
    <mesh position={[0.32, 0.14, 0]} geometry={rbox(0.065, 0.045, 0.11, 0.015)} material={plain(P.amber, 0.4, 0.2)} />

    {occupied && (
      <group position={[0.08, 0.22, 0]}>
        {/* Thân áo bay & áo phao G-suit */}
        <mesh position={[0.02, 0.22, 0]} geometry={rbox(0.23, 0.42, 0.36, 0.065)} material={plain('#4b5844', 0.82, 0.08)} />
        <mesh position={[0.08, 0.26, 0]} geometry={rbox(0.17, 0.26, 0.3, 0.045)} material={plain('#394436', 0.8, 0.1)} />
        {/* Cánh tay nắm cần lái HOTAS */}
        <mesh position={[0.19, 0.19, -0.16]} rotation={[0, 0, -0.35]} geometry={rbox(0.26, 0.085, 0.085, 0.03)} material={plain('#4b5844', 0.82)} />
        <mesh position={[0.19, 0.19, 0.16]} rotation={[0, 0, -0.35]} geometry={rbox(0.26, 0.085, 0.085, 0.03)} material={plain('#4b5844', 0.82)} />
        {/* Mũ bay JHMCS II + kính che mặt tối bóng + mặt nạ dưỡng khí */}
        <mesh position={[0.02, 0.56, 0]} material={plain('#e0e8f0', 0.26, 0.22)}>
          <sphereGeometry args={[0.138, 20, 16]} />
        </mesh>
        <mesh position={[0.065, 0.57, 0]} rotation={[0, 0, -0.18]} material={plain('#101720', 0.08, 0.7)}>
          <sphereGeometry args={[0.126, 18, 14, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.18, Math.PI * 0.46]} />
        </mesh>
        <mesh position={[0.125, 0.5, 0]} geometry={rbox(0.085, 0.075, 0.085, 0.025)} material={plain('#2b333d', 0.7, 0.2)} />
      </group>
    )}
  </group>
);

// ---------- Tên lửa AIM-120C/D AMRAAM (dài 3.66 m, Ø 0.18 m) ----------
const Aim120Missile: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const bodyGeo = useMemo(
    () =>
      lathe(
        [
          [0.082, -1.83],
          [0.09, -1.78],
          [0.09, 1.18],
          [0.078, 1.38],
          [0.056, 1.56],
          [0.03, 1.72],
          [0.003, 1.83],
        ],
        20,
      ),
    [],
  );
  const noseGeo = useMemo(
    () =>
      lathe(
        [
          [0.09, 1.18],
          [0.078, 1.38],
          [0.056, 1.56],
          [0.03, 1.72],
          [0.003, 1.83],
        ],
        20,
      ),
    [],
  );
  const midFin = useMemo(
    () =>
      extrude(
        [
          [-0.22, 0.08],
          [0.24, 0.08],
          [-0.08, 0.29],
          [-0.22, 0.29],
        ],
        0.014,
        0.002,
      ),
    [],
  );
  const tailFin = useMemo(
    () =>
      extrude(
        [
          [-1.81, 0.08],
          [-1.44, 0.08],
          [-1.62, 0.3],
          [-1.81, 0.3],
        ],
        0.014,
        0.002,
      ),
    [],
  );

  return (
    <group position={position}>
      <mesh geometry={bodyGeo} material={plain(P.ordWhite, 0.4, 0.22)} castShadow />
      <mesh geometry={noseGeo} material={plain('#cfd8e3', 0.34, 0.16)} />
      {/* Vạch vàng đầu đạn & nâu tầng đẩy chuẩn USAF */}
      <mesh position={[0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(P.amber, 0.45, 0.2)}>
        <cylinderGeometry args={[0.0915, 0.0915, 0.08, 18]} />
      </mesh>
      <mesh position={[-0.85, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#6e4b3a', 0.5, 0.2)}>
        <cylinderGeometry args={[0.0915, 0.0915, 0.09, 18]} />
      </mesh>
      {/* 4 cánh giữa & 4 cánh đuôi xếp chữ X (45°) */}
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[Math.PI / 4 + (k * Math.PI) / 2, 0, 0]}>
          <mesh geometry={midFin} material={plain(P.ordDark, 0.45, 0.5)} castShadow />
          <mesh geometry={tailFin} material={plain(P.ordDark, 0.45, 0.5)} castShadow />
        </group>
      ))}
    </group>
  );
};

// ---------- Tên lửa AIM-9X Sidewinder (dài 3.02 m, Ø 0.13 m) ----------
const Aim9XMissile: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const bodyGeo = useMemo(
    () =>
      lathe(
        [
          [0.058, -1.51],
          [0.064, -1.46],
          [0.064, 1.36],
          [0.056, 1.46],
          [0.035, 1.5],
          [0.004, 1.51],
        ],
        18,
      ),
    [],
  );
  const canard = useMemo(
    () =>
      extrude(
        [
          [0.86, 0.06],
          [1.14, 0.06],
          [0.98, 0.21],
          [0.86, 0.21],
        ],
        0.012,
        0.002,
      ),
    [],
  );
  const aftFin = useMemo(
    () =>
      extrude(
        [
          [-1.49, 0.06],
          [-1.12, 0.06],
          [-1.18, 0.21],
          [-1.49, 0.21],
        ],
        0.012,
        0.002,
      ),
    [],
  );

  return (
    <group position={position}>
      <mesh geometry={bodyGeo} material={plain('#c7d2df', 0.44, 0.26)} castShadow />
      {/* Đầu dò ảnh nhiệt hồng ngoại kính tối bóng */}
      <mesh position={[1.47, 0, 0]} material={plain('#16202b', 0.08, 0.7)}>
        <sphereGeometry args={[0.056, 16, 12]} />
      </mesh>
      <mesh position={[0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(P.amber, 0.45, 0.2)}>
        <cylinderGeometry args={[0.0655, 0.0655, 0.06, 16]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[Math.PI / 4 + (k * Math.PI) / 2, 0, 0]}>
          <mesh geometry={canard} material={plain('#394656', 0.42, 0.55)} castShadow />
          <mesh geometry={aftFin} material={plain('#394656', 0.42, 0.55)} castShadow />
        </group>
      ))}
    </group>
  );
};

// ---------- Tên lửa Siêu vượt âm ngoại cỡ 22 ft (6.71 m, Ø 0.58 m) dưới mấu trung tâm Station 5 ----------
const OutsizedHypersonic: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const noseGeo = useMemo(
    () =>
      lathe(
        [
          [0.29, 0.65],
          [0.275, 1.15],
          [0.22, 1.85],
          [0.145, 2.55],
          [0.072, 3.05],
          [0.024, 3.3],
          [0.004, 3.355],
        ],
        28,
      ),
    [],
  );
  const boosterGeo = useMemo(
    () =>
      lathe(
        [
          [0.255, -3.355],
          [0.29, -3.22],
          [0.29, 0.66],
        ],
        28,
      ),
    [],
  );
  const finGeo = useMemo(
    () =>
      extrude(
        [
          [-3.3, 0.27],
          [-2.42, 0.27],
          [-2.85, 0.53],
          [-3.32, 0.53],
        ],
        0.026,
        0.004,
      ),
    [],
  );

  return (
    <group position={position}>
      <mesh geometry={boosterGeo} material={plain(P.ordWhite, 0.42, 0.25)} castShadow />
      <mesh geometry={noseGeo} material={plain('#1b2028', 0.36, 0.35)} castShadow />
      <mesh position={[0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#455261', 0.4, 0.6)}>
        <cylinderGeometry args={[0.294, 0.294, 0.14, 28]} />
      </mesh>
      <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(P.flame, 0.42, 0.18)}>
        <cylinderGeometry args={[0.293, 0.293, 0.22, 28]} />
      </mesh>
      <mesh position={[-1.95, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(P.amber, 0.42, 0.18)}>
        <cylinderGeometry args={[0.293, 0.293, 0.14, 28]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[Math.PI / 4 + (k * Math.PI) / 2, 0, 0]}>
          <mesh geometry={finGeo} material={plain('#2b3440', 0.45, 0.5)} castShadow />
        </group>
      ))}
    </group>
  );
};

// ---------- Loa phụt cánh hoa GE F110-GE-129 & Luồng lửa Afterburner vân kim cương ----------
const F110Nozzle: React.FC<{ z: number; afterburner: number }> = ({ z, afterburner }) => {
  const ab = Math.max(0, Math.min(1, afterburner));
  const collarGeo = useMemo(
    () =>
      lathe(
        [
          [0.575, -9.02],
          [0.605, -8.86],
          [0.605, -8.72],
        ],
        28,
      ),
    [],
  );
  const innerLinerGeo = useMemo(
    () =>
      lathe(
        [
          [0.48, -8.72],
          [0.44, -9.12],
          [0.46 + 0.04 * ab, -9.69],
        ],
        24,
      ),
    [ab],
  );
  const coreFlameGeo = useMemo(
    () =>
      lathe(
        [
          [0.37, -9.1],
          [0.42, -9.85],
          [0.33, -11.4],
          [0.16, -12.9],
          [0.01, -13.9],
        ],
        20,
      ),
    [],
  );
  const outerFlameGeo = useMemo(
    () =>
      lathe(
        [
          [0.44, -9.25],
          [0.52, -10.2],
          [0.42, -12.4],
          [0.22, -14.6],
          [0.01, -15.8],
        ],
        20,
      ),
    [],
  );
  const shockDiamondGeo = useMemo(
    () =>
      lathe(
        [
          [0.01, -0.26],
          [0.24, 0],
          [0.01, 0.26],
        ],
        16,
      ),
    [],
  );

  const petals = 16;
  const openTilt = -0.09 + ab * 0.11;

  return (
    <group position={[0, 1.95, z]}>
      {/* Cổ kim loại titan nối tấm chắn nhiệt với loa phụt */}
      <mesh geometry={collarGeo} material={plain('#4c5766', 0.34, 0.8)} castShadow />
      <mesh position={[-8.96, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#6e7b8b', 0.3, 0.85)}>
        <cylinderGeometry args={[0.588, 0.588, 0.07, 28]} />
      </mesh>
      {/* Lòng ống buồng đốt tối sâu + đĩa cánh tuabin & vòng giữ lửa */}
      <mesh
        geometry={innerLinerGeo}
        material={plain('#171a20', 0.72, 0.45, { side: THREE.DoubleSide })}
      />
      <mesh
        position={[-8.74, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={plain(ab > 0.02 ? '#ff6a1a' : '#242932', 0.5, 0.6, {
          emissive: new THREE.Color('#ff5510'),
          emissiveIntensity: ab * 2.4,
        })}
      >
        <cylinderGeometry args={[0.47, 0.47, 0.06, 24]} />
      </mesh>

      {/* 16 cánh hoa loa phụt GE F110-GE-129 kéo tới đúng x = -9.72 m */}
      {Array.from({ length: petals }, (_, i) => {
        const a = (i / petals) * Math.PI * 2;
        const isOuter = i % 2 === 0;
        return (
          <group key={i} rotation={[a, 0, 0]}>
            <group position={[-8.95, isOuter ? 0.568 : 0.55, 0]} rotation={[0, 0, openTilt]}>
              <mesh
                position={[-0.385, 0, 0]}
                geometry={rbox(0.77, 0.026, isOuter ? 0.21 : 0.18, 0.006)}
                material={plain(isOuter ? '#282e38' : '#3d4654', 0.33, 0.82)}
                castShadow
              />
              {isOuter && (
                <mesh
                  position={[-0.3, 0.02, 0]}
                  geometry={rbox(0.56, 0.022, 0.046, 0.005)}
                  material={plain('#637082', 0.3, 0.86)}
                />
              )}
            </group>
          </group>
        );
      })}

      {/* Luồng lửa buồng đốt hậu nhiều lớp + 6 vân kim cương siêu âm */}
      {ab > 0.01 && (
        <group position={[-9.2 * (1 - (0.55 + 0.45 * ab)), 0, 0]} scale={[0.55 + 0.45 * ab, 0.78 + 0.22 * ab, 0.78 + 0.22 * ab]}>
          <mesh
            geometry={coreFlameGeo}
            material={plain('#fff4c8', 0.15, 0, {
              emissive: new THREE.Color(P.amberHot),
              emissiveIntensity: 2.6 * ab,
              transparent: true,
              opacity: Math.min(0.92, 0.88 * ab),
              depthWrite: false,
            })}
          />
          <mesh
            geometry={outerFlameGeo}
            material={plain(P.flame, 0.2, 0, {
              emissive: new THREE.Color(P.flame),
              emissiveIntensity: 1.7 * ab,
              transparent: true,
              opacity: 0.46 * ab,
              depthWrite: false,
            })}
          />
          {[0, 1, 2, 3, 4, 5].map((k) => {
            const dx = -9.95 - k * 0.76;
            const s = Math.max(0.28, 1 - k * 0.13);
            return (
              <mesh
                key={k}
                position={[dx, 0, 0]}
                scale={[1.1 * s, s, s]}
                geometry={shockDiamondGeo}
                material={plain('#fff9e2', 0.1, 0, {
                  emissive: new THREE.Color('#ffd97d'),
                  emissiveIntensity: (2.8 - k * 0.28) * ab,
                  transparent: true,
                  opacity: Math.max(0.18, (0.82 - k * 0.1) * ab),
                  depthWrite: false,
                })}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};

// ============================================================================
// Mô hình chính F15EX Eagle II
// ============================================================================
export const F15EX: React.FC<F15EXProps> = ({
  gear = 1,
  wheelSpin = 0,
  canopyOpen = 0,
  afterburner = 0,
  aileron = 0,
  elevator = 0,
  rudder = 0,
  wingTipMissiles = true,
  fullLoad = true,
  cft = false,
  dropTanks = false,
  bellyOutsized = false,
  backSeatOccupied = true,
}) => {
  const g = Math.max(0, Math.min(1, gear));
  const cOpen = Math.max(0, Math.min(1, canopyOpen));

  const geos = useMemo(() => {
    const radome = lathe(RADOME_PTS, 36);
    const fwdLower = lathe(FWD_LOWER_PTS, 32);
    const fwdCollar = lathe(FWD_COLLAR_PTS, 32);
    const nacelleFwd = lathe(NACELLE_FWD_PTS, 32);
    const nacelleTi = lathe(NACELLE_TI_PTS, 32);
    const epawssPod = lathe(EPAWSS_POD_PTS, 24);
    const dropTank = lathe(DROP_TANK_PTS, 28);
    const cftBody = lathe(CFT_PTS, 26);

    const cheekSide = extrude(CHEEK_SIDE_PTS, 0.15, 0.03);
    const spine = extrude(SPINE_PTS, 0.96, 0.09);
    const centerBody = extrude(CENTER_BODY_PTS, 3.12, 0.1);
    const tailBoom = extrude(TAIL_BOOM_PTS, 0.42, 0.05);
    const intakeWall = extrude(INTAKE_WALL_PTS, 0.065, 0.015);
    const splitter = extrude(SPLITTER_PTS, 0.045, 0.01);
    const intakeRamp = extrude(INTAKE_RAMP_PTS, 0.78, 0.015);

    // Kính chắn gió trước: phiStart = Math.PI, phiLength = Math.PI để sau rotateZ(-PI/2) vòm cong HƯỚNG LÊN (+Y)!
    const windPts = Array.from({ length: 16 }, (_, i) => {
      const u = i / 15; // 0 tại x=4.84, 1 tại x=6.02
      const x = 4.84 + u * 1.18;
      const r = 0.56 * Math.pow(1 - u * 0.95, 0.62) + 0.02;
      return new THREE.Vector2(r, x);
    });
    const windscreenGlass = new THREE.LatheGeometry(windPts, 26, Math.PI, Math.PI);
    windscreenGlass.rotateZ(-Math.PI / 2);
    windscreenGlass.computeVertexNormals();

    // Vòm kính bọt nước hai chỗ ngồi (dài 3.60 m từ x=1.24..4.84, cong vồng +Y chuẩn giọt nước F-15E/EX)
    const bubblePts = Array.from({ length: 28 }, (_, i) => {
      const u = i / 27; // 0 tại bản lề sau x=1.24, 1 tại khung vòm trước x=4.84
      const x = 1.24 + u * 3.6;
      // u=1 khớp đúng r=0.58 của kính chắn gió tại x=4.84, đỉnh cao nhất quanh u=0.62 (r=0.67), vuốt mượt về 0.14 ở đuôi
      const frontMatch = Math.pow(Math.sin(u * Math.PI * 0.78 + 0.06 * Math.PI), 0.58);
      const r = 0.12 + 0.54 * frontMatch;
      return new THREE.Vector2(r, x);
    });
    const bubbleGlass = new THREE.LatheGeometry(bubblePts, 30, Math.PI, Math.PI);
    bubbleGlass.rotateZ(-Math.PI / 2);
    bubbleGlass.computeVertexNormals();

    // Khung gờ vòm kính hai bên (extrude) mở cùng khối kính theo canopyOpen
    const canopySideRail = extrude(
      [
        [1.22, 2.45],
        [4.84, 2.45],
        [4.84, 2.55],
        [1.22, 2.57],
      ],
      0.08,
      0.015,
    );
    // Nẹp sống giữa kính chắn gió trước
    const windscreenSpine = extrude(
      [
        [4.83, 3.08],
        [5.45, 2.86],
        [6.02, 2.48],
        [5.96, 2.45],
        [5.4, 2.82],
        [4.83, 3.04],
      ],
      0.045,
      0.006,
    );

    // Cánh chính bên phải (+Z): quét 45° chuẩn F-15, đầu cánh cắt vát ngược ở z=6.525 m
    const wingR = extrudeTop(
      [
        [2.78, 1.54],
        [2.22, 1.88],
        [2.15, 1.95],
        [-2.78, 6.525],
        [-4.34, 6.18],
        [-4.36, 5.75],
        [-3.78, 5.75],
        [-3.82, 3.82],
        [-3.84, 1.88],
        [-4.65, 1.88],
        [-4.72, 1.54],
      ],
      0.15,
      0.032,
    );
    const wingL = extrudeTop(
      [
        [2.78, -1.54],
        [2.22, -1.88],
        [2.15, -1.95],
        [-2.78, -6.525],
        [-4.34, -6.18],
        [-4.36, -5.75],
        [-3.78, -5.75],
        [-3.82, -3.82],
        [-3.84, -1.88],
        [-4.65, -1.88],
        [-4.72, -1.54],
      ],
      0.15,
      0.032,
    );

    // Gốc cánh dày nối mượt thân (bên phải khoét khe pháo xoay 20mm M61A1 Vulcan ở z ≈ +1.76 m)
    const gloveR = extrudeTop(
      [
        [2.85, 1.52],
        [2.52, 1.66],
        [2.28, 1.72],
        [2.28, 1.83],
        [2.44, 1.9],
        [0.45, 2.95],
        [-4.62, 2.85],
        [-4.7, 1.52],
      ],
      0.26,
      0.055,
    );
    const gloveL = extrudeTop(
      [
        [2.85, -1.52],
        [2.55, -1.85],
        [0.45, -2.95],
        [-4.62, -2.85],
        [-4.7, -1.52],
      ],
      0.26,
      0.055,
    );

    const flapR = extrudeTop(
      [
        [0, 1.9],
        [0.02, 3.79],
        [-0.72, 3.79],
        [-0.82, 1.9],
      ],
      0.11,
      0.02,
    );
    const flapL = extrudeTop(
      [
        [0, -1.9],
        [0.02, -3.79],
        [-0.72, -3.79],
        [-0.82, -1.9],
      ],
      0.11,
      0.02,
    );
    const aileronR = extrudeTop(
      [
        [0, 3.84],
        [0.02, 5.73],
        [-0.56, 5.73],
        [-0.71, 3.84],
      ],
      0.1,
      0.018,
    );
    const aileronL = extrudeTop(
      [
        [0, -3.84],
        [0.02, -5.73],
        [-0.56, -5.73],
        [-0.71, -3.84],
      ],
      0.1,
      0.018,
    );

    // Cánh đuôi ngang all-moving stabilator có mấu răng cưa dogtooth đặc trưng F-15 (xoay quanh x = -7.65)
    const stabR = extrudeTop(
      [
        [1.15, 1.62],
        [-0.08, 2.52],
        [0.14, 2.58],
        [-1.48, 4.3],
        [-2.04, 4.06],
        [-1.88, 1.62],
      ],
      0.1,
      0.022,
    );
    const stabL = extrudeTop(
      [
        [1.15, -1.62],
        [-0.08, -2.52],
        [0.14, -2.58],
        [-1.48, -4.3],
        [-2.04, -4.06],
        [-1.88, -1.62],
      ],
      0.1,
      0.022,
    );

    const vTail = extrude(VTAIL_FIN_PTS, 0.11, 0.022);
    const rudderGeo = extrude(RUDDER_PTS, 0.085, 0.016);

    const outerPylon = extrude(
      [
        [-3.95, 2.07],
        [-2.15, 2.07],
        [-2.35, 2.34],
        [-3.82, 2.34],
      ],
      0.11,
      0.016,
    );
    const inboardPylon = extrude(
      [
        [-3.45, 1.74],
        [-0.15, 1.74],
        [-0.65, 2.37],
        [-3.25, 2.37],
      ],
      0.18,
      0.022,
    );
    const centerPylon = extrude(
      [
        [-3.15, 1.03],
        [1.25, 1.03],
        [0.85, 1.28],
        [-2.95, 1.28],
      ],
      0.22,
      0.024,
    );

    const noseDragStrut = pipe(
      [
        [5.64, 1.38, 0],
        [5.01, 0.74, 0],
      ],
      0.036,
      12,
    );
    const mainBraceL = pipe(
      [
        [-1.45, 1.38, -0.82],
        [-1.51, 0.85, -1.32],
      ],
      0.042,
      12,
    );
    const mainBraceR = pipe(
      [
        [-1.45, 1.38, 0.82],
        [-1.51, 0.85, 1.32],
      ],
      0.042,
      12,
    );

    return {
      radome,
      fwdLower,
      fwdCollar,
      nacelleFwd,
      nacelleTi,
      epawssPod,
      dropTank,
      cftBody,
      cheekSide,
      spine,
      centerBody,
      tailBoom,
      intakeWall,
      splitter,
      intakeRamp,
      windscreenGlass,
      bubbleGlass,
      canopySideRail,
      windscreenSpine,
      wingR,
      wingL,
      gloveR,
      gloveL,
      flapR,
      flapL,
      aileronR,
      aileronL,
      stabR,
      stabL,
      vTail,
      rudderGeo,
      outerPylon,
      inboardPylon,
      centerPylon,
      noseDragStrut,
      mainBraceL,
      mainBraceR,
    };
  }, []);

  const rivetPoints = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 14; i++) {
      const x = 1.45 + i * 0.25;
      pts.push([x, 2.51, -0.5], [x, 2.51, 0.5]);
    }
    for (let i = 0; i < 12; i++) {
      const x = -4.2 + i * 0.34;
      pts.push([x, 2.48, -1.78], [x, 2.48, 1.78], [x, 2.46, -2.35], [x, 2.46, 2.35]);
    }
    for (let i = 0; i < 10; i++) {
      const x = -3.3 + i * 0.26;
      pts.push([x, 2.63, -0.36], [x, 2.63, 0.36]);
    }
    return pts;
  }, []);

  const airframeM = matAirframe();
  const airframeLatheM = matAirframeLathe();
  const bellyM = matBelly();
  // Khối kính bọt nước trong bóng màu P.f15Canopy / #62b8d9 độ nhám cực thấp để phản chiếu ánh trời mà vẫn rõ nội thất
  const canopyGlassM = plain('#62b8d9', 0.06, 0.22, {
    transparent: true,
    opacity: 0.43,
    side: THREE.DoubleSide,
  });

  // Vị trí 4 tên lửa AIM-120 bán ngầm dưới 4 góc hông thân: nằm phía trong càng chính (z = ±1.02 m) như F-15 thật,
  // hoặc dịch sang mấu dưới CFT (z = ±1.88 m) khi lắp CFT; khoảng cách dọc tách rõ 0.50 m không chạm nhau!
  const cornerZ = cft ? 1.88 : 1.02;
  const cornerY = cft ? 1.18 : 1.2;

  return (
    <group>
      {/* ==================== 1. MŨI RADOME & THÂN TRƯỚC BUỒNG LÁI ==================== */}
      <group position={[6.05, 1.91, 0]} rotation={[0, 0, -0.038]}>
        <mesh geometry={geos.radome} scale={[1, 1, 0.91]} material={plain(P.f15Radome, 0.42, 0.22)} castShadow receiveShadow />
        <mesh position={[0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.91]} material={plain('#364658', 0.38, 0.65)}>
          <cylinderGeometry args={[0.573, 0.573, 0.045, 32]} />
        </mesh>
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, idx) => (
          <mesh
            key={idx}
            position={[1.4, Math.cos(a) * 0.44, Math.sin(a) * 0.4]}
            rotation={[0, 0, -0.13 * Math.cos(a)]}
            geometry={rbox(1.5, 0.014, 0.014, 0.004)}
            material={plain('#2b3644', 0.4, 0.6)}
          />
        ))}
        <mesh position={[3.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#aebbc9', 0.3, 0.85)}>
          <cylinderGeometry args={[0.005, 0.012, 0.08, 10]} />
        </mesh>
      </group>

      {/* Cổ thân trước nối mượt đáy radome + bầu bụng dưới buồng lái */}
      <mesh position={[0, 1.91, 0]} scale={[1, 1, 0.91]} geometry={geos.fwdCollar} material={airframeLatheM} castShadow receiveShadow />
      <mesh position={[0, 1.72, 0]} scale={[1, 0.62, 0.93]} geometry={geos.fwdLower} material={bellyM} castShadow receiveShadow />

      {/* Hai má hông buồng lái (cheeks) + u cảm biến tác chiến điện tử EPAWSS dưới má */}
      <mesh position={[0, 0, -0.49]} rotation={[-0.08, 0, 0]} geometry={geos.cheekSide} material={airframeM} castShadow receiveShadow />
      <mesh position={[0, 0, 0.49]} rotation={[0.08, 0, 0]} geometry={geos.cheekSide} material={airframeM} castShadow receiveShadow />
      <mesh position={[4.55, 1.54, -0.56]} geometry={rbox(0.62, 0.11, 0.14, 0.045)} material={plain(P.f15Radome, 0.42, 0.25)} />
      <mesh position={[4.55, 1.54, 0.56]} geometry={rbox(0.62, 0.11, 0.14, 0.045)} material={plain(P.f15Radome, 0.42, 0.25)} />

      {/* ==================== 2. KHOANG BUỒNG LÁI ĐÔI & VÒM KÍNH BỌT NƯỚC ==================== */}
      <mesh position={[3.25, 2.02, 0]} geometry={rbox(3.95, 0.14, 0.9, 0.03)} material={plain('#151c24', 0.85, 0.1)} />
      <mesh position={[1.32, 2.4, 0]} geometry={rbox(0.16, 0.72, 0.9, 0.03)} material={plain('#1b232e', 0.8, 0.15)} />
      <mesh position={[5.05, 2.34, 0]} geometry={rbox(0.45, 0.52, 0.88, 0.04)} material={plain('#18202a', 0.8, 0.15)} />

      {/* Táp-lô trước + Màn hình cảm ứng lớn 10×19" phát sáng nhẹ + HUD kính xanh lục */}
      <mesh position={[4.76, 2.5, 0]} rotation={[0, 0, 0.34]} geometry={rbox(0.1, 0.32, 0.52, 0.02)} material={plain('#1c2430', 0.7, 0.3)} />
      <mesh
        position={[4.7, 2.51, 0]}
        rotation={[0, 0, 0.34]}
        geometry={rbox(0.03, 0.24, 0.42, 0.01)}
        material={plain('#0e2a38', 0.2, 0.1, {
          emissive: new THREE.Color(P.cyan),
          emissiveIntensity: 0.8,
        })}
      />
      <mesh
        position={[4.88, 2.76, 0]}
        rotation={[0, 0, -0.48]}
        geometry={rbox(0.016, 0.16, 0.17, 0.004)}
        material={plain(P.green, 0.08, 0.1, {
          emissive: new THREE.Color(P.green),
          emissiveIntensity: 0.65,
          transparent: true,
          opacity: 0.52,
        })}
      />

      {/* Táp-lô ghế sau WSO + Màn hình cảm ứng 10×19" thứ hai phát sáng nhẹ */}
      <mesh position={[3.2, 2.54, 0]} rotation={[0, 0, 0.32]} geometry={rbox(0.11, 0.34, 0.54, 0.02)} material={plain('#1c2430', 0.7, 0.3)} />
      <mesh
        position={[3.14, 2.55, 0]}
        rotation={[0, 0, 0.32]}
        geometry={rbox(0.03, 0.24, 0.42, 0.01)}
        material={plain('#132c3a', 0.2, 0.1, {
          emissive: new THREE.Color(P.cyanSoft),
          emissiveIntensity: 0.65,
        })}
      />

      {/* Ghế phóng ACES-5 trước (luôn có phi công) & ghế sau (ẩn/hiện WSO theo backSeatOccupied) */}
      <AcesSeat position={[3.9, 2.06, 0]} occupied={true} />
      <AcesSeat position={[2.26, 2.11, 0]} occupied={backSeatOccupied} />

      {/* Kính chắn gió cố định phía trước + cung vòm khung trước (xoay quanh trục Y để dựng đứng trong mặt Z–Y!) */}
      <mesh position={[0, 2.46, 0]} scale={[1, 1.12, 0.84]} geometry={geos.windscreenGlass} material={canopyGlassM} />
      <mesh geometry={geos.windscreenSpine} material={plain(P.f15Dark, 0.45, 0.45)} />
      <mesh position={[4.84, 2.46, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.84, 1.12, 1]} material={plain(P.f15Dark, 0.45, 0.45)}>
        <torusGeometry args={[0.56, 0.028, 10, 26, Math.PI]} />
      </mesh>

      {/* Vòm kính bọt nước hai chỗ ngồi mở lên quanh bản lề sau x = 1.24, y = 2.50 theo canopyOpen */}
      <group position={[1.24, 2.5, 0]} rotation={[0, 0, cOpen * 0.62]}>
        <group position={[-1.24, -2.5, 0]}>
          <mesh position={[0, 2.46, 0]} scale={[1, 1.18, 0.84]} geometry={geos.bubbleGlass} material={canopyGlassM} />
          {/* Hai thanh ray khung gờ đáy vòm kính trái & phải (extrude) */}
          <mesh position={[0, 0, -0.47]} geometry={geos.canopySideRail} material={airframeM} castShadow />
          <mesh position={[0, 0, 0.47]} geometry={geos.canopySideRail} material={airframeM} castShadow />
          {/* Khung cung vòm gia cường giữa hai ghế & đầu vòm mở */}
          <mesh position={[3.28, 2.46, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.84, 1.18, 1]} material={plain(P.f15Dark, 0.45, 0.45)}>
            <torusGeometry args={[0.65, 0.022, 10, 26, Math.PI]} />
          </mesh>
          <mesh position={[4.81, 2.46, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.84, 1.12, 1]} material={plain(P.f15Dark, 0.45, 0.45)}>
            <torusGeometry args={[0.555, 0.024, 10, 26, Math.PI]} />
          </mesh>
        </group>
      </group>
      {cOpen > 0.02 && (
        <mesh
          position={[2.08, 2.38 + cOpen * 0.32, 0]}
          rotation={[0, 0, 0.35 + cOpen * 0.6]}
          geometry={rbox(0.95, 0.04, 0.04, 0.01)}
          material={plain('#c9d4e0', 0.3, 0.85)}
        />
      )}

      {/* ==================== 3. THÂN NÂNG TRUNG TÂM, HAI CỬA HÚT KHÍ & VỎ ĐỘNG CƠ TITANIUM ==================== */}
      <mesh geometry={geos.spine} material={airframeM} castShadow receiveShadow />
      {/* Tấm phanh khí lưng (dorsal speedbrake) & ăng-ten UHF/TACAN */}
      <mesh position={[-1.85, 2.63, 0]} rotation={[0, 0, 0.025]} geometry={rbox(2.75, 0.04, 0.76, 0.015)} material={plain(P.f15Dark, 0.52, 0.42)} />
      <mesh position={[0.35, 2.75, 0]} geometry={rbox(0.34, 0.16, 0.024, 0.008)} material={plain(P.f15Light, 0.48, 0.3)} />
      <mesh position={[-4.55, 2.58, 0]} geometry={rbox(0.3, 0.13, 0.024, 0.008)} material={plain(P.f15Light, 0.48, 0.3)} />

      {/* Thân nâng rộng phẳng trung tâm */}
      <mesh geometry={geos.centerBody} material={airframeM} castShadow receiveShadow />

      {/* Hai vỏ động cơ đôi phía sau (z = ±0.72 m): phần sơn trước + tấm chắn nhiệt Titanium trần phía đuôi đặc trưng F-15! */}
      {[-0.72, 0.72].map((zn, idx) => (
        <group key={idx} position={[0, 1.95, zn]}>
          <mesh geometry={geos.nacelleFwd} material={airframeLatheM} castShadow receiveShadow />
          <mesh geometry={geos.nacelleTi} material={plain('#8594a6', 0.32, 0.76)} castShadow receiveShadow />
          {/* Vành gân gia cường chịu nhiệt trên vỏ Titanium */}
          <mesh position={[-8.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#6c7a8c', 0.34, 0.8)}>
            <cylinderGeometry args={[0.612, 0.612, 0.05, 28]} />
          </mesh>
        </group>
      ))}
      {/* Móc hãm đà (arrestor tailhook) giữa hai động cơ */}
      <mesh position={[-7.65, 1.38, 0]} rotation={[0, 0, -0.04]} geometry={rbox(2.2, 0.1, 0.12, 0.03)} material={plain('#2b3440', 0.5, 0.6)} />

      {/* Hai đuôi boom bên ngoài (z = ±1.52 m) kéo tới x = -9.56 m với chóp cảm biến RWR đuôi */}
      {[-1.52, 1.52].map((zb, idx) => (
        <group key={idx}>
          <mesh position={[0, 0, zb]} geometry={geos.tailBoom} material={airframeM} castShadow receiveShadow />
          <mesh position={[-9.52, 1.87, zb]} geometry={rbox(0.28, 0.22, 0.24, 0.08)} material={plain(P.f15Radome, 0.42, 0.25)} />
        </group>
      ))}

      {/* Hai cửa hút khí chữ nhật vát góc đặc trưng F-15 (z = ±1.18 m) */}
      {[-1, 1].map((side) => {
        const zMid = side * 1.18;
        return (
          <group key={side}>
            <mesh position={[0, 0, side * 1.56]} rotation={[side * -0.03, 0, 0]} geometry={geos.intakeWall} material={airframeM} castShadow receiveShadow />
            <mesh position={[0, 0, side * 0.79]} geometry={geos.splitter} material={airframeM} castShadow receiveShadow />
            {/* Viền mép môi kim loại sắc nét quanh miệng cửa hút khí */}
            <mesh position={[3.45, 2.455, zMid]} geometry={rbox(0.07, 0.045, 0.82, 0.01)} material={plain(P.f15Light, 0.4, 0.5)} />
            <mesh position={[2.56, 1.3, zMid]} geometry={rbox(0.07, 0.05, 0.8, 0.01)} material={plain(P.f15Light, 0.4, 0.5)} />
            {/* Hai thanh giằng khe tách lớp biên */}
            <mesh position={[2.45, 2.15, side * 0.71]} geometry={rbox(0.65, 0.06, 0.16, 0.01)} material={plain('#232c38', 0.7, 0.3)} />
            <mesh position={[2.25, 1.58, side * 0.71]} geometry={rbox(0.65, 0.06, 0.16, 0.01)} material={plain('#232c38', 0.7, 0.3)} />
            {/* Tấm ramp biến thiên phía trên nhô ra x = +3.46 m & bản đáy cửa hút */}
            <mesh position={[0, 0, zMid]} geometry={geos.intakeRamp} material={airframeM} castShadow />
            <mesh position={[1.96, 1.28, zMid]} geometry={rbox(1.24, 0.08, 0.8, 0.02)} material={bellyM} castShadow />
            {/* Hốc hút khí tối sâu bên trong + mặt tầng cánh quạt động cơ */}
            <mesh position={[1.95, 1.84, zMid]} geometry={rbox(0.95, 1.02, 0.72, 0.02)} material={plain('#070b10', 0.95, 0.1)} />
            <mesh position={[1.45, 1.84, zMid]} rotation={[0, 0, Math.PI / 2]} material={plain('#1b222c', 0.55, 0.65)}>
              <cylinderGeometry args={[0.35, 0.35, 0.05, 20]} />
            </mesh>
          </group>
        );
      })}

      {/* Khe pháo xoay 6 nòng 20mm M61A1 Vulcan ở gốc cánh phải (z = +1.77 m, x = +2.38 m) */}
      <group position={[2.32, 2.38, 1.77]}>
        <mesh geometry={rbox(0.58, 0.16, 0.18, 0.04)} material={plain('#12171f', 0.85, 0.25)} />
        <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#3c4654', 0.35, 0.82)}>
          <cylinderGeometry args={[0.048, 0.048, 0.36, 14]} />
        </mesh>
      </group>

      {/* ==================== 4. CÁNH CHÍNH DELTA QUÉT 45°, CÁNH ĐUÔI & U EPAWSS ==================== */}
      <mesh position={[0, 2.26, 0]} geometry={geos.gloveR} material={airframeM} castShadow receiveShadow />
      <mesh position={[0, 2.26, 0]} geometry={geos.gloveL} material={airframeM} castShadow receiveShadow />

      <group position={[0, 2.34, 0]}>
        <group rotation={[0.017, 0, 0]}>
          <mesh geometry={geos.wingR} material={airframeM} castShadow receiveShadow />
          <mesh position={[-3.82, 0.02, 0]} geometry={geos.flapR} material={airframeM} castShadow receiveShadow />
          <group position={[-3.8, 0.075, 0]} rotation={[0, 0, -aileron]}>
            <mesh position={[0, -0.05, 0]} geometry={geos.aileronR} material={airframeM} castShadow />
          </group>
          <mesh
            position={[-2.95, 0.075, 6.48]}
            geometry={rbox(0.24, 0.045, 0.06, 0.015)}
            material={plain(P.green, 0.2, 0.1, { emissive: new THREE.Color(P.green), emissiveIntensity: 0.85 })}
          />
        </group>

        <group rotation={[-0.017, 0, 0]}>
          <mesh geometry={geos.wingL} material={airframeM} castShadow receiveShadow />
          <mesh position={[-3.82, 0.02, 0]} geometry={geos.flapL} material={airframeM} castShadow receiveShadow />
          <group position={[-3.8, 0.075, 0]} rotation={[0, 0, aileron]}>
            <mesh position={[0, -0.05, 0]} geometry={geos.aileronL} material={airframeM} castShadow />
          </group>
          <mesh
            position={[-2.95, 0.075, -6.48]}
            geometry={rbox(0.24, 0.045, 0.06, 0.015)}
            material={plain(P.red, 0.2, 0.1, { emissive: new THREE.Color(P.red), emissiveIntensity: 0.85 })}
          />
        </group>
      </group>

      {/* Hai cánh đuôi ngang all-moving stabilator xoay qua elevator */}
      <group position={[-7.65, 1.94, 0]} rotation={[0, 0, elevator]}>
        <mesh position={[0, -0.05, 0]} geometry={geos.stabR} material={airframeM} castShadow receiveShadow />
        <mesh position={[0, -0.05, 0]} geometry={geos.stabL} material={airframeM} castShadow receiveShadow />
      </group>

      {/* Hai cánh đuôi đứng cao vút thẳng đứng (z = ±1.52 m) + rudder + U ăng-ten AN/ALQ-250 EPAWSS đỉnh y = 5.63 m */}
      {[-1.52, 1.52].map((zv, idx) => (
        <group key={idx} position={[0, 0, zv]}>
          <mesh geometry={geos.vTail} material={airframeM} castShadow receiveShadow />
          <group position={[-8.3, 0, 0]} rotation={[0, rudder, 0]}>
            <mesh geometry={geos.rudderGeo} material={airframeM} castShadow />
          </group>
          {/* U ăng-ten hình trụ thuôn AN/ALQ-250 EPAWSS nhô rõ khỏi đỉnh cánh đuôi đứng (tâm y = 5.52 + r 0.11 = đúng 5.63 m!) */}
          <mesh position={[0, 5.52, 0]} geometry={geos.epawssPod} material={plain(P.f15Light, 0.45, 0.35)} castShadow />
          <mesh position={[-7.32, 5.52, 0]} material={plain(P.f15Radome, 0.38, 0.22)}>
            <sphereGeometry args={[0.106, 16, 12]} />
          </mesh>
          <mesh position={[-9.28, 5.52, 0]} material={plain(P.f15Radome, 0.38, 0.22)}>
            <sphereGeometry args={[0.094, 16, 12]} />
          </mesh>
        </group>
      ))}

      {/* Cụm 12 hộp mồi bẫy nhiệt & nhiễu xạ AN/ALE-47 dưới bụng đuôi */}
      {[-1.44, -0.44, 0.44, 1.44].map((zf, idx) => (
        <group key={idx} position={[-7.58, 1.31, zf]}>
          <mesh geometry={rbox(0.76, 0.08, 0.24, 0.015)} material={plain('#2f3b4a', 0.55, 0.45)} />
          <mesh position={[-0.14, -0.036, 0]} geometry={rbox(0.22, 0.02, 0.18, 0.004)} material={plain('#6e5538', 0.5, 0.4)} />
          <mesh position={[0.14, -0.036, 0]} geometry={rbox(0.22, 0.02, 0.18, 0.004)} material={plain('#6e5538', 0.5, 0.4)} />
        </group>
      ))}

      <Rivets points={rivetPoints} r={0.014} color="#4a5f75" />

      {/* ==================== 5. CẶP LOA PHỤT GE F110-GE-129 & BUỒNG ĐỐT HẬU ==================== */}
      <F110Nozzle z={-0.72} afterburner={afterburner} />
      <F110Nozzle z={0.72} afterburner={afterburner} />

      {/* ==================== 6. CÀNG ĐÁP 3 ĐIỂM THU / HẠ (gear 0..1) ==================== */}
      <group position={[4.75, 1.34, 0.24]} rotation={[g * 1.52, 0, 0]}>
        <mesh position={[0, 0, -0.12]} geometry={rbox(1.25, 0.035, 0.24, 0.008)} material={bellyM} castShadow />
      </group>
      <group position={[4.75, 1.34, -0.24]} rotation={[-g * 1.52, 0, 0]}>
        <mesh position={[0, 0, 0.12]} geometry={rbox(1.25, 0.035, 0.24, 0.008)} material={bellyM} castShadow />
      </group>

      {/* Càng mũi: lốp r = 0.28 m đặt tại y = 0.28 m khi gear = 1 -> chạm đúng y = 0.000 m */}
      {g > 0.02 && (
        <group position={[5.15, 1.42, 0]} rotation={[0, 0, -1.66 * (1 - g)]}>
          <mesh position={[-0.12, -0.45, 0]} rotation={[0, 0, -0.16]} material={plain('#e6edf5', 0.36, 0.38)} castShadow>
            <cylinderGeometry args={[0.074, 0.065, 0.74, 16]} />
          </mesh>
          <mesh position={[-0.19, -0.92, 0]} rotation={[0, 0, -0.06]} material={plain('#cfd9e6', 0.2, 0.88)} castShadow>
            <cylinderGeometry args={[0.052, 0.052, 0.48, 16]} />
          </mesh>
          {/* Chạc ôm bánh mũi & kẹp chống xoắn (torque links) */}
          <mesh position={[-0.2, -1.14, 0.11]} geometry={rbox(0.14, 0.12, 0.04, 0.015)} material={plain('#e2eaf2', 0.38, 0.4)} />
          <mesh position={[-0.28, -0.82, 0]} rotation={[0, 0, 0.45]} geometry={rbox(0.22, 0.035, 0.06, 0.01)} material={plain('#dce5f0', 0.4, 0.45)} />
          <mesh position={[-0.28, -0.96, 0]} rotation={[0, 0, -0.45]} geometry={rbox(0.22, 0.035, 0.06, 0.01)} material={plain('#dce5f0', 0.4, 0.45)} />
          <mesh
            position={[-0.02, -0.56, 0]}
            geometry={rbox(0.08, 0.1, 0.12, 0.02)}
            material={plain('#fff8dc', 0.15, 0.2, { emissive: new THREE.Color('#ffe9a6'), emissiveIntensity: 0.75 })}
          />
          <mesh position={[-5.15, -1.42, 0]} geometry={geos.noseDragStrut} material={plain('#dce5f0', 0.4, 0.45)} />
          <Wheel r={0.28} width={0.18} spin={wheelSpin * (0.45 / 0.28)} tire="#202328" rim="#dfe7f0" bolts={8} position={[-0.2, -1.14, 0]} />
        </group>
      )}

      {[-1, 1].map((side) => (
        <group key={side}>
          <group position={[-1.45, 1.25, side * 0.92]} rotation={[-side * g * 1.45, 0, 0]}>
            <mesh position={[0, 0, side * 0.22]} geometry={rbox(1.55, 0.035, 0.44, 0.008)} material={bellyM} castShadow />
          </group>
        </group>
      ))}

      {/* Hai càng chính: lốp r = 0.45 m đặt tại y = 0.45 m khi gear = 1 -> chạm đúng y = 0.000 m */}
      {g > 0.02 && (
        <>
          <group position={[-1.45, 1.42, -1.18]} rotation={[0.22 * (1 - g), 0, -1.62 * (1 - g)]}>
            <mesh position={[-0.06, -0.44, -0.11]} rotation={[-0.2, 0, -0.09]} material={plain('#e6edf5', 0.36, 0.38)} castShadow>
              <cylinderGeometry args={[0.086, 0.074, 0.72, 18]} />
            </mesh>
            <mesh position={[-0.1, -0.82, -0.18]} rotation={[-0.14, 0, -0.05]} material={plain('#cfd9e6', 0.2, 0.88)} castShadow>
              <cylinderGeometry args={[0.062, 0.062, 0.38, 16]} />
            </mesh>
            <mesh position={[-0.2, -0.78, -0.17]} rotation={[0, 0, 0.4]} geometry={rbox(0.22, 0.04, 0.07, 0.01)} material={plain('#dce5f0', 0.4, 0.45)} />
            <mesh position={[1.45, -1.42, 1.18]} geometry={geos.mainBraceL} material={plain('#dce5f0', 0.4, 0.45)} />
            <Wheel r={0.45} width={0.28} spin={wheelSpin} tire="#1f2227" rim="#dfe7f0" bolts={10} position={[-0.1, -0.97, -0.2]} />
          </group>

          <group position={[-1.45, 1.42, 1.18]} rotation={[-0.22 * (1 - g), 0, -1.62 * (1 - g)]}>
            <mesh position={[-0.06, -0.44, 0.11]} rotation={[0.2, 0, -0.09]} material={plain('#e6edf5', 0.36, 0.38)} castShadow>
              <cylinderGeometry args={[0.086, 0.074, 0.72, 18]} />
            </mesh>
            <mesh position={[-0.1, -0.82, 0.18]} rotation={[0.14, 0, -0.05]} material={plain('#cfd9e6', 0.2, 0.88)} castShadow>
              <cylinderGeometry args={[0.062, 0.062, 0.38, 16]} />
            </mesh>
            <mesh position={[-0.2, -0.78, 0.17]} rotation={[0, 0, 0.4]} geometry={rbox(0.22, 0.04, 0.07, 0.01)} material={plain('#dce5f0', 0.4, 0.45)} />
            <mesh position={[1.45, -1.42, -1.18]} geometry={geos.mainBraceR} material={plain('#dce5f0', 0.4, 0.45)} />
            <Wheel r={0.45} width={0.28} spin={wheelSpin} tire="#1f2227" rim="#dfe7f0" bolts={10} position={[-0.1, -0.97, 0.2]} />
          </group>
        </>
      )}

      {/* ==================== 7. THÙNG DẦU CFT, DROP TANKS & VŨ KHÍ MODULE ==================== */}
      {cft &&
        [-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[0, 1.78, side * 1.66]}
              scale={[1, 0.98, 0.86]}
              geometry={geos.cftBody}
              material={airframeLatheM}
              castShadow
              receiveShadow
            />
            {[-3.6, -1.8, 0.0].map((xp, j) => (
              <mesh
                key={j}
                position={[xp, 1.34, side * 1.92]}
                geometry={rbox(0.72, 0.12, 0.11, 0.02)}
                material={plain(P.f15Dark, 0.5, 0.45)}
                castShadow
              />
            ))}
          </group>
        ))}

      {(fullLoad || dropTanks) &&
        [-3.08, 3.08].map((zp, idx) => (
          <group key={idx} position={[0, 0, zp]}>
            <mesh geometry={geos.inboardPylon} material={airframeM} castShadow />
          </group>
        ))}

      {/* Mấu sát đầu cánh Station 1 (trái, AIM-120) & Station 9 (phải, AIM-9X) */}
      {wingTipMissiles && (
        <>
          <mesh position={[0, 0, -5.85]} geometry={geos.outerPylon} material={airframeM} castShadow />
          <mesh position={[-2.75, 2.035, -5.85]} geometry={rbox(2.86, 0.085, 0.11, 0.015)} material={plain(P.f15Light, 0.48, 0.4)} castShadow />
          <Aim120Missile position={F15_STA1_POS} />

          <mesh position={[0, 0, 5.85]} geometry={geos.outerPylon} material={airframeM} castShadow />
          <mesh position={[-2.75, 2.035, 5.85]} geometry={rbox(2.86, 0.085, 0.11, 0.015)} material={plain(P.f15Light, 0.48, 0.4)} castShadow />
          <Aim9XMissile position={F15_STA9_POS} />
        </>
      )}

      {/* Đội hình fullLoad 12 tên lửa không đối không */}
      {fullLoad && (
        <>
          {/* 4 tên lửa AIM-120 gắn bán ngầm ở 4 góc dưới hông thân (tách dọc 0.50 m chuẩn xác, không chạm nhau!) */}
          <Aim120Missile position={[0.48, cornerY, -cornerZ]} />
          <Aim120Missile position={[0.48, cornerY, cornerZ]} />
          <Aim120Missile position={[-3.68, cornerY, -cornerZ]} />
          <Aim120Missile position={[-3.68, cornerY, cornerZ]} />

          {/* Giá treo đa đạn dưới cánh trong Station 2 (-3.08) & Station 8 (+3.08) */}
          {[-3.08, 3.08].map((zp, idx) => (
            <group key={idx}>
              <mesh position={[-1.72, 1.98, zp - 0.16]} geometry={rbox(2.88, 0.08, 0.11, 0.015)} material={plain(P.f15Light, 0.48, 0.4)} />
              <mesh position={[-1.72, 1.98, zp + 0.16]} geometry={rbox(2.88, 0.08, 0.11, 0.015)} material={plain(P.f15Light, 0.48, 0.4)} />
              <Aim120Missile position={[-1.58, 1.95, zp - 0.27]} />
              <Aim120Missile position={[-1.58, 1.95, zp + 0.27]} />

              {!dropTanks && (
                <>
                  <mesh position={[-1.72, 1.71, zp]} geometry={rbox(2.85, 0.075, 0.12, 0.015)} material={plain(P.f15Dark, 0.48, 0.45)} />
                  <Aim120Missile position={[-1.58, 1.6, zp]} />
                </>
              )}
            </group>
          ))}
        </>
      )}

      {/* 2 thùng dầu phụ hình thoi 600-gal dài 6.0 m dưới mấu cánh trong */}
      {dropTanks &&
        [-3.08, 3.08].map((zp, idx) => (
          <group key={idx} position={[-1.5, 1.34, zp]}>
            <mesh geometry={geos.dropTank} material={airframeLatheM} castShadow receiveShadow />
            <mesh position={[-2.58, 0.12, -0.22]} rotation={[0.55, 0, 0]} geometry={rbox(0.56, 0.024, 0.36, 0.006)} material={airframeM} />
            <mesh position={[-2.58, 0.12, 0.22]} rotation={[-0.55, 0, 0]} geometry={rbox(0.56, 0.024, 0.36, 0.006)} material={airframeM} />
          </group>
        ))}

      {/* Giá treo trung tâm dưới bụng Station 5 & Tên lửa siêu vượt âm ngoại cỡ 22 ft */}
      <mesh geometry={geos.centerPylon} material={bellyM} castShadow />
      {bellyOutsized && <OutsizedHypersonic position={F15_CENTERLINE_POS} />}
    </group>
  );
};

export const MODELS: ModelSet = {
  F15EX: { C: F15EX, size: 20, center: [0, 2.5, 0] },
};
