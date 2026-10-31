// Thiết bị bay không người lái FPV cảm tử chiến thuật cỡ 10-inch mang đầu đạn chống tăng PG-7VL 93 mm
// (tỉ lệ thật 1:1 mét, sải chéo motor ~0.56 m, mũi hướng +X, đỉnh +Y, phải +Z).
import React from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { turntable } from '@skill/military/3d/turntable';

export type FPVDroneProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  spin?: number;    // góc quay 4 cánh quạt (rad)
  armed?: boolean;  // gắn đầu đạn PG-7VL dưới bụng (mặc định true)
};

// ---------------- VẬT LIỆU DÙNG CHUNG (CACHE) ----------------
const MAT_CARBON = paint({
  color: '#2a303a',
  camo: ['#1d2128', '#38404d'],
  camoScale: 12,
  wear: 0.16,
  dirt: 0.08,
  roughness: 0.36,
  metalness: 0.34,
  repeat: 2.8,
  seed: 41,
});

const MAT_CARBON_SLOT = plain('#111317', 0.6, 0.2);
const MAT_STANDOFF_RED = plain('#cf202a', 0.25, 0.84);
const MAT_STANDOFF_BLK = plain('#1e232a', 0.32, 0.78);
const MAT_STEEL_BOLT = plain('#c8d0d8', 0.22, 0.9);
const MAT_MOTOR_BELL = plain('#333a44', 0.26, 0.86);
const MAT_COPPER_COIL = plain('#d9772b', 0.28, 0.88);
const MAT_PROP_BLADE = plain('#232932', 0.38, 0.16);
const MAT_PROP_BLUR = new THREE.MeshStandardMaterial({
  color: '#9aa6b2',
  roughness: 0.4,
  metalness: 0.1,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const MAT_LIPO_BLUE = plain('#1b3f73', 0.38, 0.18);
const MAT_LIPO_BLACK = plain('#171a1f', 0.65, 0.1);
const MAT_LABEL_SPEC = plain('#d8dee6', 0.45, 0.05);
const MAT_STRAP = plain('#171917', 0.88, 0.05);
const MAT_XT60 = plain('#f5b800', 0.34, 0.08);
const MAT_WIRE_RED = plain('#d12424', 0.46, 0.08);
const MAT_WIRE_BLK = plain('#18191c', 0.52, 0.08);
const MAT_PCB_DARK = plain('#153325', 0.46, 0.3);
const MAT_LED_GREEN = new THREE.MeshStandardMaterial({
  color: '#22ff88',
  emissive: '#18e070',
  emissiveIntensity: 0.9,
  roughness: 0.2,
});
const MAT_CAM_LENS = new THREE.MeshStandardMaterial({
  color: '#10325a',
  emissive: '#092242',
  emissiveIntensity: 0.35,
  roughness: 0.05,
  metalness: 0.65,
});
const MAT_ANTENNA_CAP = plain('#ab1d25', 0.32, 0.18);

// Vật liệu đầu đạn chống tăng PG-7VL (93 mm HEAT)
const MAT_PG7_OLIVE = paint({
  color: '#596b42',
  camo: ['#4a5a36', '#687b4e'],
  camoScale: 2.1,
  wear: 0.22,
  dirt: 0.18,
  roughness: 0.5,
  metalness: 0.24,
  repeat: 1,
  seed: 53,
});
const MAT_PG7_BAND_Y = plain('#eab01e', 0.4, 0.14);
const MAT_PG7_FUZE_AL = plain('#cdd5dd', 0.22, 0.9);
const MAT_PG7_TAIL_AL = plain('#8e97a0', 0.32, 0.82);
const MAT_CLAMP_STEEL = plain('#b0bac4', 0.26, 0.88);

// ---------------- TOẠ ĐỘ MOTOR KHUNG 10-INCH (SẢI CHÉO ~0.56 M) ----------------
const MX = 0.205;
const MZ = 0.19;

const MOTORS: { x: number; z: number; dir: 1 | -1; phase: number }[] = [
  { x: MX, z: -MZ, dir: -1, phase: 0.2 },   // Trước-Trái (CW)
  { x: MX, z: MZ, dir: 1, phase: 1.1 },     // Trước-Phải (CCW)
  { x: -MX, z: -MZ, dir: 1, phase: 2.0 },   // Sau-Trái (CCW)
  { x: -MX, z: MZ, dir: -1, phase: 0.65 },  // Sau-Phải (CW)
];

// ---------------- HÌNH HỌC KHUNG CARBON CHỮ X ----------------
// Tấm đáy carbon trung tâm + gân giằng góc tay đòn (extrudeTop: X-Z, dày 4.5 mm)
const GEO_BOTTOM_PLATE = extrudeTop(
  [
    [-0.130, -0.028],
    [-0.098, -0.054],
    [-0.036, -0.042],
    [0.040, -0.042],
    [0.100, -0.054],
    [0.134, -0.025],
    [0.134, 0.025],
    [0.100, 0.054],
    [0.040, 0.042],
    [-0.036, 0.042],
    [-0.098, 0.054],
    [-0.130, 0.028],
  ],
  0.0045,
  0.0008,
);

// Tấm giằng chéo chữ X kẹp giữ gốc 4 tay đòn
const GEO_X_BRACE = extrudeTop(
  [
    [-0.088, -0.072],
    [-0.024, -0.032],
    [0.028, -0.032],
    [0.090, -0.072],
    [0.098, -0.058],
    [0.046, -0.012],
    [0.046, 0.012],
    [0.098, 0.058],
    [0.090, 0.072],
    [0.028, 0.032],
    [-0.024, 0.032],
    [-0.088, 0.072],
    [-0.096, 0.058],
    [-0.044, 0.012],
    [-0.044, -0.012],
    [-0.096, -0.058],
  ],
  0.0032,
  0.0006,
);

// Tấm lưng carbon trên (extrudeTop: X-Z, dày 3.5 mm)
const GEO_TOP_PLATE = extrudeTop(
  [
    [-0.124, -0.025],
    [-0.084, -0.036],
    [0.090, -0.036],
    [0.136, -0.022],
    [0.136, 0.022],
    [0.090, 0.036],
    [-0.084, 0.036],
    [-0.124, 0.025],
  ],
  0.0035,
  0.0007,
);

// Tay đòn carbon đơn (dọc +X cục bộ, đầu tròn bắt motor, bản to chắc chắn chuẩn FPV 10-inch)
const ARM_LEN = Math.hypot(MX - 0.02, MZ - 0.018);
const GEO_CARBON_ARM = (() => {
  const pts: P2[] = [
    [-0.012, -0.0175],
    [ARM_LEN - 0.024, -0.0135],
  ];
  for (let i = -5; i <= 5; i++) {
    const a = (i / 5) * (Math.PI * 0.64);
    pts.push([ARM_LEN + Math.cos(a) * 0.024, Math.sin(a) * 0.024]);
  }
  pts.push([ARM_LEN - 0.024, 0.0135]);
  pts.push([-0.012, 0.0175]);
  return extrudeTop(pts, 0.0065, 0.001);
})();

// Hai má bảo vệ camera FPV ở mũi +X
const GEO_CAM_CAGE_SIDE = extrude(
  [
    [0.104, 0.004],
    [0.144, 0.004],
    [0.148, 0.025],
    [0.136, 0.0355],
    [0.104, 0.0355],
  ],
  0.0032,
  0.0005,
);

// ---------------- HÌNH HỌC MOTOR & CÁNH QUẠT 10-INCH (BÁN KÍNH 0.127 M) ----------------
const GEO_MOTOR_BASE = lathe(
  [
    [0.004, 0.0],
    [0.0185, 0.0],
    [0.0185, 0.003],
    [0.013, 0.004],
  ],
  28,
);

const GEO_MOTOR_BELL = lathe(
  [
    [0.0188, 0.0045],
    [0.020, 0.0055],
    [0.020, 0.016],
    [0.017, 0.018],
    [0.005, 0.018],
  ],
  32,
);

// Lá cánh quạt 10-inch cong khí động (dọc +X cục bộ từ 0.008 .. 0.127 m)
const makePropBlade = (mirror: 1 | -1) =>
  extrudeTop(
    [
      [0.008, -0.0065 * mirror],
      [0.038, -0.014 * mirror],
      [0.082, -0.013 * mirror],
      [0.114, -0.0085 * mirror],
      [0.127, -0.002 * mirror],
      [0.125, 0.0045 * mirror],
      [0.092, 0.009 * mirror],
      [0.042, 0.0095 * mirror],
      [0.008, 0.0055 * mirror],
    ],
    0.0022,
    0.0004,
  );

const GEO_BLADE_CCW = makePropBlade(1);
const GEO_BLADE_CW = makePropBlade(-1);

// ---------------- HÌNH HỌC CAMERA, DÂY NGUỒN XT60 & ĂNG-TEN ----------------
const GEO_CAM_BARREL = lathe(
  [
    [0.001, 0.0],
    [0.0102, 0.0],
    [0.0102, 0.008],
    [0.0118, 0.009],
    [0.0118, 0.016],
    [0.0092, 0.0165],
  ],
  28,
);

const GEO_CAM_GLASS = lathe(
  [
    [0.0092, 0.0155],
    [0.007, 0.0178],
    [0.0035, 0.019],
    [0.0002, 0.0194],
  ],
  24,
);

const GEO_WIRE_POS = pipe(
  [
    [-0.025, 0.022, -0.016],
    [-0.068, 0.035, -0.038],
    [-0.086, 0.056, -0.036],
    [-0.073, 0.064, -0.025],
  ],
  0.0034,
  24,
);

const GEO_WIRE_NEG = pipe(
  [
    [-0.032, 0.020, -0.016],
    [-0.076, 0.032, -0.041],
    [-0.093, 0.053, -0.038],
    [-0.079, 0.061, -0.025],
  ],
  0.0034,
  24,
);

const GEO_VTX_STALK = pipe(
  [
    [-0.112, 0.022, 0],
    [-0.146, 0.048, 0],
    [-0.184, 0.094, 0],
  ],
  0.0032,
  20,
);

const GEO_LOLLIPOP_HEAD = lathe(
  [
    [0.0035, -0.014],
    [0.013, -0.008],
    [0.014, 0.006],
    [0.0105, 0.013],
    [0.0002, 0.015],
  ],
  24,
);

const GEO_RX_ARM_L = pipe(
  [
    [-0.122, 0.012, 0],
    [-0.142, 0.014, -0.044],
    [-0.158, 0.018, -0.092],
  ],
  0.0022,
  16,
);

const GEO_RX_ARM_R = pipe(
  [
    [-0.122, 0.012, 0],
    [-0.142, 0.014, 0.044],
    [-0.158, 0.018, 0.092],
  ],
  0.0022,
  16,
);

// ---------------- HÌNH HỌC ĐẦU ĐẠN CHỐNG TĂNG PG-7VL (DÀI ~0.52 M, BẦU CÔN Ø 0.093 M) ----------------
// Tiện mượt 30 điểm dọc trục +X từ cổ nối (-0.220) tới chóp bầu côn (+0.218)
const GEO_PG7VL_BODY = (() => {
  const pts: P2[] = [
    [0.0205, -0.194],
    [0.0205, -0.148],
    [0.0228, -0.142],
    [0.0228, -0.118],
  ];
  // Bầu côn sau nở từ r = 0.0228 lên r = 0.0465 (Ø 93 mm)
  for (let i = 1; i <= 8; i++) {
    const u = i / 8;
    const x = -0.118 + u * 0.092;
    const r = 0.0228 + (0.0465 - 0.0228) * Math.pow(u, 0.92);
    pts.push([r, x]);
  }
  // Đai trụ giữa Ø 93 mm
  pts.push([0.0465, 0.032]);
  // Bầu côn khí động trước thuôn mượt 15 điểm từ r = 0.0465 về cổ ngòi r = 0.0155 tại x = +0.218
  for (let i = 1; i <= 15; i++) {
    const u = i / 15;
    const x = 0.032 + u * 0.186;
    const curve = 1 - Math.pow(u, 1.08);
    const r = 0.0155 + (0.0465 - 0.0155) * curve;
    pts.push([r, x]);
  }
  pts.push([0.0002, 0.218]);
  return lathe(pts, 48);
})();

// Cổ ren nhôm đuôi đạn PIM-7 (-0.220 .. -0.194) có hốc rỗng gắn kíp điện
const GEO_PG7_TAIL_COLLAR = lathe(
  [
    [0.013, -0.205],
    [0.013, -0.220],
    [0.0205, -0.220],
    [0.0212, -0.212],
    [0.0212, -0.196],
    [0.0205, -0.194],
  ],
  36,
);

// Vạch đai vàng & đen nhận diện đạn nổ lõm trên bụng PG-7VL
const GEO_PG7_BAND_Y = lathe(
  [
    [0.0465, 0.002],
    [0.0472, 0.003],
    [0.0472, 0.023],
    [0.0465, 0.024],
  ],
  48,
);

const GEO_PG7_BAND_BLK = lathe(
  [
    [0.0465, -0.019],
    [0.0471, -0.018],
    [0.0471, -0.009],
    [0.0465, -0.008],
  ],
  48,
);

// Ngòi nổ áp điện VP-7M bằng nhôm bạc nhô ra phía mũi +X (x: +0.218 .. +0.300 -> tổng dài đạn 0.520 m)
const GEO_PG7_FUZE = lathe(
  [
    [0.0155, 0.218],
    [0.0168, 0.222],
    [0.0168, 0.232],
    [0.0152, 0.246],
    [0.0116, 0.254],
    [0.0110, 0.282],
    [0.0128, 0.285],
    [0.0128, 0.298],
    [0.0098, 0.300],
    [0.0002, 0.300],
  ],
  36,
);

// Đai thép bản rộng siết tròn quanh bầu đạn PG-7VL
const makeSteelClampRing = (r: number) =>
  lathe(
    [
      [r, -0.0085],
      [r + 0.0025, -0.008],
      [r + 0.0025, 0.008],
      [r, 0.0085],
    ],
    44,
  );

const GEO_CLAMP_FRONT = makeSteelClampRing(0.0467);
const GEO_CLAMP_REAR = makeSteelClampRing(0.0324);

// Dây kích nổ nối từ đuôi ngòi PG-7VL lên mạch FC
const GEO_DET_WIRE = pipe(
  [
    [-0.198, -0.048, 0.008],
    [-0.145, -0.022, 0.022],
    [-0.048, 0.008, 0.018],
  ],
  0.0022,
  18,
);

export const FPVDrone: React.FC<FPVDroneProps> = ({
  position,
  rotation,
  scale = 1,
  spin = 0,
  armed = true,
}) => {
  const showBlur = Math.abs(spin) > 0.001;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Tấm carbon đáy, tấm giằng chéo chữ X & tấm carbon lưng */}
      <mesh position={[0, -0.0045, 0]} geometry={GEO_BOTTOM_PLATE} material={MAT_CARBON} castShadow receiveShadow />
      <mesh position={[0, 0.0005, 0]} geometry={GEO_X_BRACE} material={MAT_CARBON} castShadow />
      <mesh position={[0, 0.032, 0]} geometry={GEO_TOP_PLATE} material={MAT_CARBON} castShadow receiveShadow />

      {/* 4 tay đòn carbon chữ X vát cạnh + rãnh khoét CNC + ốc bắt motor */}
      {MOTORS.map((m, idx) => {
        const sx = Math.sign(m.x);
        const sz = Math.sign(m.z);
        const rootX = sx * 0.02;
        const rootZ = sz * 0.018;
        const yaw = Math.atan2(-(m.z - rootZ), m.x - rootX);
        return (
          <group key={`arm-${idx}`} position={[rootX, -0.0065, rootZ]} rotation={[0, yaw, 0]}>
            <mesh geometry={GEO_CARBON_ARM} material={MAT_CARBON} castShadow receiveShadow />
            {/* 2 rãnh khoét giảm trọng lượng CNC dọc tay đòn */}
            <mesh position={[ARM_LEN * 0.34, 0.0067, 0]} geometry={rbox(ARM_LEN * 0.24, 0.0012, 0.0085, 0.0004)} material={MAT_CARBON_SLOT} />
            <mesh position={[ARM_LEN * 0.66, 0.0067, 0]} geometry={rbox(ARM_LEN * 0.22, 0.0012, 0.0075, 0.0004)} material={MAT_CARBON_SLOT} />
            {/* 2 đai dây rút đen cố định dây pha motor */}
            <mesh position={[ARM_LEN * 0.22, 0.0035, 0]} geometry={rbox(0.006, 0.0085, 0.031, 0.0012)} material={MAT_STRAP} />
            <mesh position={[ARM_LEN * 0.50, 0.0035, 0]} geometry={rbox(0.006, 0.0085, 0.029, 0.0012)} material={MAT_STRAP} />
            {/* 4 đầu ốc thép M3 quanh đế motor */}
            {[0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].map((ba, bi) => (
              <mesh
                key={`mb-${bi}`}
                position={[ARM_LEN + Math.cos(ba) * 0.015, 0.007, Math.sin(ba) * 0.015]}
                material={MAT_STEEL_BOLT}
              >
                <cylinderGeometry args={[0.002, 0.002, 0.0018, 8]} />
              </mesh>
            ))}
            {/* Chân đáp cao su dưới đầu tay đòn */}
            <mesh position={[ARM_LEN - 0.012, -0.008, 0]} material={MAT_LIPO_BLACK} castShadow>
              <cylinderGeometry args={[0.009, 0.007, 0.016, 14]} />
            </mesh>
          </group>
        );
      })}

      {/* 8 trụ nhôm CNC đỏ/đen nối tấm trên và tấm dưới + ốc thép M3 */}
      {[
        [0.124, -0.017, true],
        [0.124, 0.017, true],
        [0.068, -0.029, false],
        [0.068, 0.029, false],
        [-0.066, -0.029, false],
        [-0.066, 0.029, false],
        [-0.115, -0.019, true],
        [-0.115, 0.019, true],
      ].map(([x, z, isRed], i) => (
        <group key={`st-${i}`} position={[x as number, 0.016, z as number]}>
          <mesh material={isRed ? MAT_STANDOFF_RED : MAT_STANDOFF_BLK} castShadow>
            <cylinderGeometry args={[0.0034, 0.0034, 0.032, 12]} />
          </mesh>
          <mesh position={[0, 0.0205, 0]} material={MAT_STEEL_BOLT}>
            <cylinderGeometry args={[0.0029, 0.0029, 0.0022, 10]} />
          </mesh>
        </group>
      ))}

      {/* Cụm mạch điện tử FC / 4-in-1 ESC ở trung tâm + đèn LED trạng thái + tụ lọc nguồn */}
      <group position={[-0.004, 0, 0]}>
        <mesh position={[0, 0.009, 0]} geometry={rbox(0.048, 0.0035, 0.048, 0.001)} material={MAT_PCB_DARK} castShadow />
        <mesh position={[0, 0.020, 0]} geometry={rbox(0.040, 0.003, 0.040, 0.001)} material={MAT_MOTOR_BELL} castShadow />
        <mesh position={[0.012, 0.0225, 0.014]} material={MAT_LED_GREEN}>
          <sphereGeometry args={[0.002, 8, 6]} />
        </mesh>
        {/* 4 trụ cao su giảm chấn đỏ của tháp mạch */}
        {[
          [-0.017, -0.017],
          [-0.017, 0.017],
          [0.017, -0.017],
          [0.017, 0.017],
        ].map(([gx, gz], gi) => (
          <mesh key={`gum-${gi}`} position={[gx, 0.013, gz]} material={MAT_STANDOFF_RED}>
            <cylinderGeometry args={[0.0025, 0.0025, 0.022, 10]} />
          </mesh>
        ))}
        {/* Khối VTX tản nhiệt nhôm phía sau */}
        <mesh position={[-0.072, 0.013, 0]} geometry={rbox(0.038, 0.010, 0.034, 0.0015)} material={MAT_STEEL_BOLT} castShadow />
        {/* Tụ điện Low-ESR nằm ngang sau ESC */}
        <group position={[-0.038, 0.011, -0.014]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={MAT_LIPO_BLACK}>
            <cylinderGeometry args={[0.0064, 0.0064, 0.018, 18]} />
          </mesh>
          <mesh position={[0, 0.0092, 0]} material={MAT_STEEL_BOLT}>
            <cylinderGeometry args={[0.006, 0.006, 0.0008, 18]} />
          </mesh>
        </group>
      </group>

      {/* Khối pin LiPo 6S bọc xanh/đen buộc 2 dây đai trên lưng + giắc XT60 vàng */}
      <group position={[-0.010, 0.058, 0]}>
        <mesh geometry={rbox(0.142, 0.045, 0.052, 0.006)} material={MAT_LIPO_BLUE} castShadow receiveShadow />
        <mesh position={[0.061, 0, 0]} geometry={rbox(0.024, 0.046, 0.053, 0.005)} material={MAT_LIPO_BLACK} castShadow />
        <mesh position={[-0.061, 0, 0]} geometry={rbox(0.024, 0.046, 0.053, 0.005)} material={MAT_LIPO_BLACK} castShadow />
        {/* Nhãn thông số kỹ thuật mảnh gọn trên sườn pin */}
        <mesh position={[-0.008, 0.004, 0.0265]} geometry={rbox(0.046, 0.014, 0.001, 0.0004)} material={MAT_LABEL_SPEC} />
        <mesh position={[-0.008, 0.004, -0.0265]} geometry={rbox(0.046, 0.014, 0.001, 0.0004)} material={MAT_LABEL_SPEC} />
        <mesh position={[-0.025, 0.004, 0.0268]} geometry={rbox(0.011, 0.014, 0.001, 0.0003)} material={MAT_XT60} />
        <mesh position={[-0.025, 0.004, -0.0268]} geometry={rbox(0.011, 0.014, 0.001, 0.0003)} material={MAT_XT60} />
      </group>
      {/* 2 dây đai Kevlar + khoá kim loại siết pin xuống tấm lưng */}
      {[-0.048, 0.028].map((sx, i) => (
        <group key={`strap-${i}`} position={[sx, 0.056, 0]}>
          <mesh geometry={rbox(0.018, 0.054, 0.056, 0.004)} material={MAT_STRAP} castShadow />
          <mesh position={[0, 0.028, 0]} geometry={rbox(0.022, 0.004, 0.026, 0.001)} material={MAT_STEEL_BOLT} />
        </group>
      ))}
      {/* Dây nguồn silicon đỏ/đen & giắc XT60 vàng nổi bật */}
      <mesh geometry={GEO_WIRE_POS} material={MAT_WIRE_RED} castShadow />
      <mesh geometry={GEO_WIRE_NEG} material={MAT_WIRE_BLK} castShadow />
      <mesh
        position={[-0.077, 0.062, -0.026]}
        rotation={[0.2, 0.35, 0]}
        geometry={rbox(0.024, 0.012, 0.017, 0.002)}
        material={MAT_XT60}
        castShadow
      />

      {/* Camera FPV gắn khung bảo vệ nghiêng hướng lên phía mũi +X */}
      <mesh position={[0, 0, -0.0165]} geometry={GEO_CAM_CAGE_SIDE} material={MAT_CARBON} castShadow />
      <mesh position={[0, 0, 0.0165]} geometry={GEO_CAM_CAGE_SIDE} material={MAT_CARBON} castShadow />
      <group position={[0.125, 0.0195, 0]} rotation={[0, 0, 0.38]}>
        <mesh geometry={rbox(0.022, 0.022, 0.022, 0.003)} material={MAT_LIPO_BLACK} castShadow />
        <mesh position={[0.008, 0, 0]} geometry={GEO_CAM_BARREL} material={MAT_MOTOR_BELL} castShadow />
        <mesh position={[0.018, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_STEEL_BOLT}>
          <torusGeometry args={[0.0102, 0.0013, 8, 24]} />
        </mesh>
        <mesh position={[0.008, 0, 0]} geometry={GEO_CAM_GLASS} material={MAT_CAM_LENS} />
      </group>

      {/* Đuôi: ăng-ten video lollipop 5.8GHz & ăng-ten thu chữ V */}
      <mesh geometry={GEO_VTX_STALK} material={MAT_LIPO_BLACK} castShadow />
      <group position={[-0.186, 0.096, 0]} rotation={[0, 0, 2.32]}>
        <mesh geometry={GEO_LOLLIPOP_HEAD} material={MAT_ANTENNA_CAP} castShadow />
      </group>
      <mesh geometry={GEO_RX_ARM_L} material={MAT_LIPO_BLACK} />
      <mesh geometry={GEO_RX_ARM_R} material={MAT_LIPO_BLACK} />
      <mesh position={[-0.158, 0.018, -0.092]} material={MAT_XT60}>
        <sphereGeometry args={[0.0035, 10, 8]} />
      </mesh>
      <mesh position={[-0.158, 0.018, 0.092]} material={MAT_XT60}>
        <sphereGeometry args={[0.0035, 10, 8]} />
      </mesh>

      {/* 4 cụm motor không chổi than (chuông kim loại + lõi dây đồng) & cánh quạt 3 lá 10-inch */}
      {MOTORS.map((m, idx) => {
        const isCCW = m.dir > 0;
        const angle = m.dir * spin + m.phase;
        return (
          <group key={`mot-${idx}`} position={[m.x, 0.0, m.z]}>
            <group rotation={[0, 0, Math.PI / 2]}>
              <mesh geometry={GEO_MOTOR_BASE} material={MAT_STANDOFF_BLK} castShadow />
              <mesh geometry={GEO_MOTOR_BELL} material={MAT_MOTOR_BELL} castShadow />
            </group>
            <mesh position={[0, 0.0095, 0]} material={MAT_COPPER_COIL}>
              <cylinderGeometry args={[0.016, 0.016, 0.0095, 24]} />
            </mesh>

            {/* Cánh quạt 3 lá xoay ngược chiều chéo nhau */}
            <group position={[0, 0.019, 0]} rotation={[0, angle, 0]}>
              <mesh material={MAT_MOTOR_BELL} castShadow>
                <cylinderGeometry args={[0.0108, 0.0112, 0.007, 20]} />
              </mesh>
              <mesh position={[0, 0.0055, 0]} material={MAT_STEEL_BOLT}>
                <cylinderGeometry args={[0.0044, 0.0054, 0.005, 6]} />
              </mesh>
              {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((ba, bi) => (
                <group key={`bl-${bi}`} rotation={[0, ba, 0]}>
                  <group rotation={[isCCW ? -0.25 : 0.25, 0, 0]}>
                    <mesh
                      geometry={isCCW ? GEO_BLADE_CCW : GEO_BLADE_CW}
                      material={MAT_PROP_BLADE}
                      castShadow
                    />
                  </group>
                </group>
              ))}
            </group>

            {/* Đĩa mờ chuyển động nhẹ khi spin !== 0 */}
            {showBlur && (
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT_PROP_BLUR}>
                <ringGeometry args={[0.016, 0.127, 40]} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Đầu đạn chống tăng PG-7VL 93 mm treo dưới bụng bằng 2 đai thép siết chặt (khi armed !== false) */}
      {armed && (
        <group>
          <group position={[0.015, -0.056, 0]}>
            <mesh geometry={GEO_PG7VL_BODY} material={MAT_PG7_OLIVE} castShadow receiveShadow />
            <mesh geometry={GEO_PG7_TAIL_COLLAR} material={MAT_PG7_TAIL_AL} castShadow />
            <mesh geometry={GEO_PG7_BAND_Y} material={MAT_PG7_BAND_Y} castShadow />
            <mesh geometry={GEO_PG7_BAND_BLK} material={MAT_LIPO_BLACK} />
            <mesh geometry={GEO_PG7_FUZE} material={MAT_PG7_FUZE_AL} castShadow />
            {/* Vòng tiếp điểm đồng trên chóp ngòi áp điện VP-7M */}
            <mesh position={[0.285, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_COPPER_COIL}>
              <cylinderGeometry args={[0.013, 0.013, 0.004, 24]} />
            </mesh>

            {/* Đai thép siết trước (quanh bầu Ø 93 mm) + gối đỡ gắn lên khung carbon */}
            <group position={[0.012, 0, 0]}>
              <mesh geometry={GEO_CLAMP_FRONT} material={MAT_CLAMP_STEEL} castShadow />
              <mesh position={[0, 0.044, 0]} geometry={rbox(0.024, 0.018, 0.056, 0.003)} material={MAT_LIPO_BLACK} castShadow />
              <mesh position={[0, 0.051, 0.024]} geometry={rbox(0.018, 0.012, 0.009, 0.0015)} material={MAT_CLAMP_STEEL} />
              <mesh position={[0, 0.051, -0.024]} geometry={rbox(0.018, 0.012, 0.009, 0.0015)} material={MAT_CLAMP_STEEL} />
              <mesh position={[0, 0.026, 0.045]} geometry={rbox(0.017, 0.013, 0.013, 0.002)} material={MAT_STEEL_BOLT} />
            </group>

            {/* Đai thép siết sau (quanh côn đuôi) + gối chữ V gắn lên khung carbon */}
            <group position={[-0.082, 0, 0]}>
              <mesh geometry={GEO_CLAMP_REAR} material={MAT_CLAMP_STEEL} castShadow />
              <mesh position={[0, 0.038, 0]} geometry={rbox(0.024, 0.030, 0.048, 0.003)} material={MAT_LIPO_BLACK} castShadow />
              <mesh position={[0, 0.022, 0.033]} geometry={rbox(0.016, 0.012, 0.012, 0.002)} material={MAT_STEEL_BOLT} />
            </group>
          </group>

          {/* Dây kích nổ điện từ cổ đuôi PIM-7 của PG-7VL nối lên mạch điều khiển */}
          <mesh geometry={GEO_DET_WIRE} material={MAT_WIRE_RED} />
        </group>
      )}
    </group>
  );
};

const FPVDronePreview: React.FC = () => <FPVDrone position={[0, 0.3, 0]} armed />;

export const preview = turntable(FPVDronePreview, { size: 1.05, center: [0, 0.28, 0] });
