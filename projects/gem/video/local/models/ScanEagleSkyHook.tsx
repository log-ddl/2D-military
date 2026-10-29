// Mô hình 3D tỉ lệ thật 1:1 (mét) cho dự án `gem`:
// 1. `ScanEagle`: UAV trinh sát Boeing Insitu ScanEagle (dài 1.71 m, sải cánh quét 3.11 m, cao ~0.42 m, bụng trơn không càng đáp,
//    cầu quang-điện tử EO/IR mũi, cánh quạt đẩy 2 lá đuôi, winglet + mấu móc khóa SkyHook ở hai đầu mút cánh).
// 2. `SkyHookCrane`: Hệ thống xe rơ-moóc cần cẩu thu hồi SkyHook cao 15.0 m (4 bánh xe + 4 chân chống thủy lực rộng 3.8 m chạm đất y=0,
//    cần cẩu ống lồng khung giàn vươn tới đỉnh [3.6, 15.0, 0], thả cáp thu hồi thẳng đứng kèm cụm giảm chấn bungee & đối trọng).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { V3 } from '@lib/3d/stage';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

// ==================== HẰNG TỌA ĐỘ KHỚP CẢNH (1:1 MÉT THẬT) ====================

/** Tọa độ cục bộ của họng móc khóa SkyHook đầu cánh phải (+Z) và trái (-Z) so với tâm gốc [0,0,0] của `ScanEagle`. */
export const SCANEAGLE_RIGHT_HOOK_OFFSET: V3 = [-0.42, 0.098, 1.555];
export const SCANEAGLE_LEFT_HOOK_OFFSET: V3 = [-0.42, 0.098, -1.555];

/** Đỉnh treo dây cáp thu hồi trên cần cẩu `SkyHookCrane` (khi `boomYaw = 0`). */
export const SKYHOOK_APEX: V3 = [3.6, 15.0, 0];
/** Điểm đầu cánh `ScanEagle` lao vào bắt cáp trên dây thu hồi (khi `boomYaw = 0, cableSway = 0`). */
export const SKYHOOK_CATCH_POINT: V3 = [3.6, 9.5, 0];

// Bí danh đồng bộ với bảng tài sản trong SHOT_PLAN.md
export const SKYHOOK_CABLE_TOP: V3 = SKYHOOK_APEX;
export const SKYHOOK_CATCH_POS: V3 = SKYHOOK_CATCH_POINT;

const TURNTABLE_PIVOT_X = -2.2;
const CABLE_LOCAL_X = SKYHOOK_APEX[0] - TURNTABLE_PIVOT_X; // 5.8 m
const CABLE_TOP_Y = SKYHOOK_APEX[1]; // 15.0 m
const CABLE_BOT_Y = 1.42; // Đầu dưới cụm đối trọng treo cách mặt đất ~1.4 m

/** Tính vị trí thực của điểm trên dây cáp SkyHook ở độ cao `y` theo độ đung đưa gió `cableSway`, lực giật bắt cáp `caughtTension` và góc quay cần `boomYaw`. */
export const getSkyHookCablePoint = (
  y: number,
  cableSway = 0,
  caughtTension = 0,
  boomYaw = 0,
): V3 => {
  const span = CABLE_TOP_Y - CABLE_BOT_Y;
  const s = Math.max(0, Math.min(1, (CABLE_TOP_Y - y) / span));
  const catchS = (CABLE_TOP_Y - SKYHOOK_CATCH_POINT[1]) / span;

  // Đung đưa tự nhiên theo gió quanh đỉnh treo [CABLE_LOCAL_X, 15.0, 0]
  const swayZ = Math.sin(cableSway) * 5.2 * (0.65 * s + 0.35 * s * s);
  const swayX = (1 - Math.cos(cableSway)) * 1.8 * s;

  // Khi ScanEagle mắc đầu cánh vào y = 9.5 m, dây bị kéo căng vồng về phía trước (+X) thành hình chữ V đàn hồi
  const tentProfile =
    s <= catchS
      ? s / Math.max(0.001, catchS)
      : Math.max(0, 1 - ((s - catchS) / Math.max(0.001, 1 - catchS)) * 0.82);
  const pullX = caughtTension * 1.15 * tentProfile;
  const pullY = -Math.abs(caughtTension) * 0.22 * s;

  const lx = CABLE_LOCAL_X + swayX + pullX;
  const ly = y + pullY;
  const lz = swayZ;

  const cy = Math.cos(boomYaw);
  const sy = Math.sin(boomYaw);
  return [TURNTABLE_PIVOT_X + lx * cy + lz * sy, ly, -lx * sy + lz * cy];
};

// ==================== 1. BOEING INSITU SCANEAGLE UAV ====================

export type ScanEagleProps = {
  propSpin?: number;
  turretYaw?: number;
  bank?: number;
  pitch?: number;
};

// Biên dạng thân trụ thon khí động học (x từ -0.715 tới +0.70; cộng chóp quạt -0.85 & cầu EO/IR +0.86 = đúng 1.71 m)
const FUSELAGE_PROFILE: P2[] = [
  [0.002, -0.715],
  [0.044, -0.708],
  [0.064, -0.676],
  [0.08, -0.625],
  [0.092, -0.555],
  [0.099, -0.46],
  [0.103, -0.34],
  [0.104, -0.16],
  [0.104, 0.06],
  [0.104, 0.28],
  [0.103, 0.44],
  [0.1, 0.55],
  [0.096, 0.625],
  [0.093, 0.675],
  [0.088, 0.698],
  [0.065, 0.708],
  [0.002, 0.712],
];

// Chóp spinner cánh quạt đẩy đuôi (x từ -0.850 tới -0.708)
const SPINNER_PROFILE: P2[] = [
  [0.001, -0.85],
  [0.015, -0.832],
  [0.028, -0.802],
  [0.039, -0.762],
  [0.045, -0.725],
  [0.045, -0.708],
  [0.001, -0.708],
];

// Gờ lưng hòa nhập gốc cánh cao vào thân trụ (nhìn ngang X-Y)
const DORSAL_SADDLE_PTS: P2[] = [
  [-0.5, 0.048],
  [-0.38, 0.092],
  [-0.18, 0.116],
  [0.1, 0.12],
  [0.28, 0.112],
  [0.41, 0.086],
  [0.48, 0.048],
];

// Mũ cổ khớp gimbal giữ cầu quang-điện tử EO/IR liền lạc với thân trụ (không bị phình củ hành)
const NOSE_YOKE_PTS: P2[] = [
  [0.62, -0.055],
  [0.63, 0.092],
  [0.71, 0.092],
  [0.775, 0.082],
  [0.815, 0.052],
  [0.79, 0.025],
  [0.72, 0.02],
  [0.68, -0.055],
];

// Mặt bằng nửa cánh phải quét về sau ~23.5° (X-Z, z từ 0.075 tới 1.524)
const RIGHT_WING_PTS: P2[] = [
  [0.315, 0.075],
  [0.248, 0.14],
  [-0.042, 0.78],
  [-0.378, 1.524],
  [-0.585, 1.524],
  [-0.495, 1.24],
  [-0.315, 0.78],
  [-0.145, 0.16],
  [-0.205, 0.075],
];
const LEFT_WING_PTS: P2[] = RIGHT_WING_PTS.map(([x, z]) => [x, -z]);

// Sống gân dày khí động trên lưng cánh (tạo tiết diện cánh lồi airfoil thật)
const RIGHT_CAMBER_PTS: P2[] = [
  [0.205, 0.09],
  [-0.085, 0.76],
  [-0.415, 1.49],
  [-0.505, 1.49],
  [-0.225, 0.76],
  [-0.045, 0.09],
];
const LEFT_CAMBER_PTS: P2[] = RIGHT_CAMBER_PTS.map(([x, z]) => [x, -z]);

// Vạch sơn nhận diện xanh Mỹ (PAL3D.usBlueAccent) + viền sáng trên cánh
const RIGHT_STRIPE_PTS: P2[] = [
  [-0.088, 0.88],
  [-0.196, 1.12],
  [-0.415, 1.12],
  [-0.345, 0.88],
];
const LEFT_STRIPE_PTS: P2[] = RIGHT_STRIPE_PTS.map(([x, z]) => [x, -z]);

const RIGHT_SUBSTRIPE_PTS: P2[] = [
  [-0.215, 1.16],
  [-0.248, 1.235],
  [-0.455, 1.235],
  [-0.428, 1.16],
];
const LEFT_SUBSTRIPE_PTS: P2[] = RIGHT_SUBSTRIPE_PTS.map(([x, z]) => [x, -z]);

// Cánh liệng / elevon mép sau ngoài cánh
const RIGHT_ELEVON_PTS: P2[] = [
  [-0.275, 0.76],
  [-0.525, 1.46],
  [-0.576, 1.46],
  [-0.322, 0.76],
];
const LEFT_ELEVON_PTS: P2[] = RIGHT_ELEVON_PTS.map(([x, z]) => [x, -z]);

// Vây đứng winglet ở mút cánh (nhìn ngang X-Y; gốc ôm khít thân mút cánh, tổng chiều cao UAV ~0.42 m)
const WINGLET_PTS: P2[] = [
  [-0.376, -0.012],
  [-0.384, 0.024],
  [-0.518, 0.214],
  [-0.65, 0.214],
  [-0.606, 0.004],
  [-0.572, -0.032],
  [-0.42, -0.032],
];

const WINGLET_STRIPE_PTS: P2[] = [
  [-0.452, 0.095],
  [-0.506, 0.185],
  [-0.62, 0.185],
  [-0.59, 0.095],
];

// Mấu ngoàm móc khóa SkyHook (wingtip capture hook) vươn sắc nét ở mép ngoài đầu cánh (z = ±1.52..±1.595)
// Miệng chữ V mở về phía trước-trong để đón dây cáp trượt dọc mép cánh quét vào đúng họng khóa [-0.42, 0.098, ±1.555]
const makeHookJawPts = (side: 1 | -1): P2[] => [
  [-0.355, side * 1.516],
  [-0.315, side * 1.548],
  [-0.345, side * 1.592],
  [-0.515, side * 1.595],
  [-0.542, side * 1.552],
  [-0.468, side * 1.546],
  [-0.422, side * 1.568], // Đáy họng khóa cáp đúng z ≈ ±1.555..1.565
  [-0.378, side * 1.542],
  [-0.405, side * 1.516],
];

// Lá cánh quạt đẩy 2 lá (X-Y)
const PROP_BLADE_PTS: P2[] = [
  [0.022, -0.011],
  [0.065, -0.022],
  [0.135, -0.02],
  [0.195, -0.012],
  [0.206, 0.0],
  [0.192, 0.013],
  [0.125, 0.018],
  [0.055, 0.015],
  [0.022, 0.009],
];

export const ScanEagle: React.FC<ScanEagleProps> = ({
  propSpin = 0,
  turretYaw = 0,
  bank = 0,
  pitch = 0,
}) => {
  // Sơn composite xám lam Hải quân/Thủy quân lục chiến Mỹ sạch, mịn (tránh loang rằn ri quá đậm làm chìm vạch xanh Mỹ)
  const bodyMat = useMemo(
    () =>
      paint({
        color: PAL3D.usUavBody,
        camo: ['#889fb5', '#9cb2c6'],
        camoScale: 1.3,
        wear: 0.12,
        dirt: 0.06,
        roughness: 0.48,
        metalness: 0.22,
        repeat: 0.8,
        seed: 31,
      }),
    [],
  );

  // Vật liệu cánh extrudeTop (1 m = 1 UV -> repeat: 0.45 theo chuẩn SKILL.md)
  const wingMat = useMemo(
    () =>
      paint({
        color: PAL3D.usUavBody,
        camo: ['#879eb4', '#9eb4c8'],
        camoScale: 1.15,
        wear: 0.12,
        dirt: 0.06,
        roughness: 0.5,
        metalness: 0.22,
        repeat: 0.45,
        seed: 37,
      }),
    [],
  );

  const blueMat = useMemo(() => plain(PAL3D.usBlueAccent, 0.38, 0.2), []);
  const lightInsigniaMat = useMemo(() => plain('#dceaf7', 0.42, 0.12), []);
  const darkMetal = useMemo(() => plain('#28313c', 0.44, 0.58), []);
  const steelMat = useMemo(() => plain('#d4dfe9', 0.26, 0.82), []);
  const latchOrange = useMemo(() => plain('#ff5733', 0.34, 0.18), []);
  const lensGlass = useMemo(() => plain('#050d17', 0.05, 0.94), []);
  const lensCoat = useMemo(() => plain('#2278b8', 0.12, 0.86), []);
  const carbonMat = useMemo(() => plain('#1e232b', 0.44, 0.34), []);
  const tipYellow = useMemo(() => plain('#f5c84c', 0.38, 0.15), []);

  const geos = useMemo(() => {
    const fuselage = lathe(FUSELAGE_PROFILE, 36);
    const spinner = lathe(SPINNER_PROFILE, 28);
    const saddle = extrude(DORSAL_SADDLE_PTS, 0.152, 0.022);
    const noseYoke = extrude(NOSE_YOKE_PTS, 0.148, 0.016);

    const rightWing = extrudeTop(RIGHT_WING_PTS, 0.032, 0.011);
    const leftWing = extrudeTop(LEFT_WING_PTS, 0.032, 0.011);
    const rightCamber = extrudeTop(RIGHT_CAMBER_PTS, 0.011, 0.004);
    const leftCamber = extrudeTop(LEFT_CAMBER_PTS, 0.011, 0.004);

    const rightStripe = extrudeTop(RIGHT_STRIPE_PTS, 0.035, 0.002);
    const leftStripe = extrudeTop(LEFT_STRIPE_PTS, 0.035, 0.002);
    const rightSubStripe = extrudeTop(RIGHT_SUBSTRIPE_PTS, 0.035, 0.002);
    const leftSubStripe = extrudeTop(LEFT_SUBSTRIPE_PTS, 0.035, 0.002);
    const rightElevon = extrudeTop(RIGHT_ELEVON_PTS, 0.024, 0.004);
    const leftElevon = extrudeTop(LEFT_ELEVON_PTS, 0.024, 0.004);

    const winglet = extrude(WINGLET_PTS, 0.02, 0.004);
    const wingletStripe = extrude(WINGLET_STRIPE_PTS, 0.023, 0.002);

    const rightHook = extrudeTop(makeHookJawPts(1), 0.02, 0.003);
    const leftHook = extrudeTop(makeHookJawPts(-1), 0.02, 0.003);

    const blade = extrude(PROP_BLADE_PTS, 0.007, 0.002);
    const pitot = pipe(
      [
        [0.61, 0.088, -0.045],
        [0.72, 0.09, -0.045],
        [0.82, 0.09, -0.045],
      ],
      0.0042,
      12,
    );

    return {
      fuselage,
      spinner,
      saddle,
      noseYoke,
      rightWing,
      leftWing,
      rightCamber,
      leftCamber,
      rightStripe,
      leftStripe,
      rightSubStripe,
      leftSubStripe,
      rightElevon,
      leftElevon,
      winglet,
      wingletStripe,
      rightHook,
      leftHook,
      blade,
      pitot,
    };
  }, []);

  const wingDihedral = 0.025; // Góc V cánh ~1.43° -> tại mút z = 1.524 tâm cánh nâng lên y ≈ 0.098 m

  return (
    <group rotation={[0, 0, pitch]}>
      <group rotation={[bank, 0, 0]}>
        {/* Thân trụ khí động học — bụng dưới trơn hoàn toàn KHÔNG có càng/bánh đáp */}
        <mesh geometry={geos.fuselage} material={bodyMat} castShadow receiveShadow />
        <mesh geometry={geos.saddle} material={wingMat} castShadow receiveShadow />
        <mesh geometry={geos.noseYoke} material={bodyMat} castShadow receiveShadow />

        {/* Đai khớp khoang tải trọng & mảng sơn chống lóa trước mũi */}
        <mesh position={[0.52, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkMetal}>
          <cylinderGeometry args={[0.1025, 0.1025, 0.014, 32]} />
        </mesh>
        <mesh position={[-0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkMetal}>
          <cylinderGeometry args={[0.1038, 0.1038, 0.012, 32]} />
        </mesh>
        <mesh position={[0.57, 0.096, 0]} rotation={[0, 0, -0.08]} geometry={rbox(0.18, 0.012, 0.072, 0.004)} material={darkMetal} />

        {/* Rãnh ngàm máy phóng khí nén chìm phẳng dưới bụng (bụng trơn tuyệt đối không bánh xe) */}
        <mesh position={[0.04, -0.101, 0]} geometry={rbox(0.44, 0.008, 0.038, 0.002)} material={darkMetal} />

        {/* Vòm ăng-ten GPS/Datalink trên lưng, ăng-ten UHF mảnh & ống đo tốc độ Pitot */}
        <mesh position={[0.2, 0.126, 0]} scale={[1.35, 0.52, 1]} material={lightInsigniaMat} castShadow>
          <sphereGeometry args={[0.035, 18, 12]} />
        </mesh>
        <mesh position={[-0.16, 0.132, 0]} rotation={[0, 0, -0.22]} geometry={rbox(0.02, 0.058, 0.005, 0.002)} material={darkMetal} />
        <mesh geometry={geos.pitot} material={steelMat} />

        {/* Bầu động cơ đốt trong 2 kỳ 3W-28i ở đuôi + cửa hút gió NACA & ống xả nhỏ */}
        <mesh position={[-0.58, -0.07, 0]} geometry={rbox(0.125, 0.064, 0.104, 0.016)} material={darkMetal} castShadow />
        {[-0.608, -0.588, -0.568, -0.548].map((fx) => (
          <mesh key={fx} position={[fx, -0.101, 0]} geometry={rbox(0.006, 0.016, 0.084, 0.001)} material={steelMat} />
        ))}
        <mesh position={[-0.45, 0.096, 0]} rotation={[0, 0, -0.12]} geometry={rbox(0.105, 0.026, 0.062, 0.008)} material={darkMetal} />
        <mesh position={[-0.638, -0.084, 0.052]} rotation={[0.35, 0.2, 1.35]} material={darkMetal}>
          <cylinderGeometry args={[0.01, 0.012, 0.06, 10]} />
        </mesh>

        {/* Cụm tháp cầu quang-điện tử EO/IR xoay ở mũi (tâm x = +0.768, bán kính 0.092 -> mũi kính đạt đúng +0.860 m) */}
        <group position={[0.768, -0.006, 0]} rotation={[0, turretYaw, 0]}>
          {/* Ngàm càng gimbal hai bên giữ cầu xoay */}
          {([-0.086, 0.086] as const).map((zg) => (
            <mesh key={zg} position={[-0.018, 0.012, zg]} geometry={rbox(0.068, 0.042, 0.014, 0.005)} material={darkMetal} />
          ))}
          {/* Vỏ cầu EO/IR */}
          <mesh material={plain('#5b6a7a', 0.4, 0.38)} castShadow>
            <sphereGeometry args={[0.092, 28, 22]} />
          </mesh>
          {/* Cụm thấu kính quang học đen bóng nhìn chéo nhẹ xuống đất */}
          <group rotation={[0, 0, -0.14]}>
            <mesh position={[0.066, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={darkMetal}>
              <cylinderGeometry args={[0.062, 0.068, 0.036, 24]} />
            </mesh>
            {/* Thấu kính hồng ngoại lớn có viền tráng phủ xanh lam */}
            <mesh position={[0.085, -0.005, -0.012]} rotation={[0, 0, -Math.PI / 2]} material={lensCoat}>
              <cylinderGeometry args={[0.035, 0.035, 0.007, 22]} />
            </mesh>
            <mesh position={[0.077, -0.005, -0.012]} scale={[0.45, 1, 1]} material={lensGlass}>
              <sphereGeometry args={[0.031, 20, 16]} />
            </mesh>
            {/* Thấu kính EO ban ngày & cửa sổ đo xa laser */}
            <mesh position={[0.085, 0.02, 0.026]} rotation={[0, 0, -Math.PI / 2]} material={lensGlass}>
              <cylinderGeometry args={[0.017, 0.017, 0.008, 16]} />
            </mesh>
            <mesh position={[0.085, -0.02, 0.028]} rotation={[0, 0, -Math.PI / 2]} material={plain('#164a63', 0.08, 0.9)}>
              <cylinderGeometry args={[0.011, 0.011, 0.008, 14]} />
            </mesh>
          </group>
        </group>

        {/* Cánh quét phải (+Z) kèm vạch kép nhận diện xanh Mỹ & cánh liệng elevon */}
        <group position={[0, 0.044, 0]} rotation={[-wingDihedral, 0, 0]}>
          <mesh geometry={geos.rightWing} material={wingMat} castShadow receiveShadow />
          <mesh position={[0, 0.027, 0]} geometry={geos.rightCamber} material={wingMat} castShadow />
          <mesh position={[0, -0.0015, 0]} geometry={geos.rightStripe} material={blueMat} />
          <mesh position={[0, -0.0015, 0]} geometry={geos.rightSubStripe} material={lightInsigniaMat} />
          <mesh position={[0, 0.004, 0]} geometry={geos.rightElevon} material={darkMetal} />
        </group>

        {/* Cánh quét trái (-Z) */}
        <group position={[0, 0.044, 0]} rotation={[wingDihedral, 0, 0]}>
          <mesh geometry={geos.leftWing} material={wingMat} castShadow receiveShadow />
          <mesh position={[0, 0.027, 0]} geometry={geos.leftCamber} material={wingMat} castShadow />
          <mesh position={[0, -0.0015, 0]} geometry={geos.leftStripe} material={blueMat} />
          <mesh position={[0, -0.0015, 0]} geometry={geos.leftSubStripe} material={lightInsigniaMat} />
          <mesh position={[0, 0.004, 0]} geometry={geos.leftElevon} material={darkMetal} />
        </group>

        {/* Cụm Winglet + Ngoàm móc khóa SkyHook ở đúng hai đầu mút cánh (khớp phẳng y = 0.098 m, z = ±1.555 m) */}
        {([1, -1] as const).map((side) => (
          <React.Fragment key={side}>
            {/* Vây đứng winglet gắn liền lạc tại cao độ mút cánh y = 0.098 m */}
            <group position={[0, 0.098, side * 1.522]}>
              <mesh geometry={geos.winglet} material={wingMat} castShadow receiveShadow />
              <mesh geometry={geos.wingletStripe} material={blueMat} />
              {/* Đèn định vị đầu cánh (phải xanh lá, trái đỏ) */}
              <mesh
                position={[-0.382, 0.008, side * 0.012]}
                material={plain(side === 1 ? '#29e079' : '#ff4538', 0.25, 0.1, {
                  emissive: new THREE.Color(side === 1 ? '#189e52' : '#bd261c'),
                  emissiveIntensity: 0.75,
                })}
              >
                <sphereGeometry args={[0.011, 10, 8]} />
              </mesh>
            </group>

            {/* Pod gia cường mút cánh ôm khít mép ngoài cánh (không tạo bậc hở dưới bụng cánh) */}
            <mesh
              position={[-0.472, 0.098, side * 1.528]}
              rotation={[0, 0, Math.PI / 2]}
              material={darkMetal}
              castShadow
            >
              <cylinderGeometry args={[0.016, 0.019, 0.23, 14]} />
            </mesh>
            {/* Ngoàm thép chữ V bắt cáp SkyHook (tâm họng khóa đúng tại [-0.42, 0.098, ±1.555]) */}
            <mesh
              position={[0, 0.088, 0]}
              geometry={side === 1 ? geos.rightHook : geos.leftHook}
              material={steelMat}
              castShadow
            />
            {/* Lưỡi gà khóa cáp lò xo một chiều màu cam nổi bật ngay miệng ngoàm */}
            <mesh
              position={[-0.395, 0.099, side * 1.564]}
              rotation={[0, side * 0.48, 0]}
              geometry={rbox(0.062, 0.015, 0.013, 0.003)}
              material={latchOrange}
            />
          </React.Fragment>
        ))}

        {/* Hàng đinh tán mảnh trên đai khớp thân */}
        <Rivets
          r={0.0042}
          color="#4d5a68"
          points={[
            [0.52, 0.074, 0.072],
            [0.52, 0.074, -0.072],
            [0.52, 0.015, 0.102],
            [0.52, 0.015, -0.102],
            [-0.36, 0.074, 0.072],
            [-0.36, 0.074, -0.072],
          ]}
        />

        {/* Cụm cánh quạt đẩy 2 lá ở đuôi (-X tới -0.85 m) xoay theo propSpin */}
        <group>
          <mesh geometry={geos.spinner} material={darkMetal} castShadow />
          <group position={[-0.742, 0, 0]} rotation={[propSpin, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={steelMat}>
              <cylinderGeometry args={[0.026, 0.026, 0.032, 16]} />
            </mesh>
            {[0, Math.PI].map((ang) => (
              <group key={ang} rotation={[ang, 0, 0]}>
                <group rotation={[0, 0.36, Math.PI / 2]}>
                  <mesh geometry={geos.blade} material={carbonMat} castShadow />
                  <mesh position={[0.188, 0, 0]} geometry={rbox(0.028, 0.022, 0.009, 0.002)} material={tipYellow} />
                </group>
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};

// ==================== 2. HỆ THỐNG CẦN CẨU THU HỒI SKYHOOK 15 MÉT ====================

export type SkyHookCraneProps = {
  cableSway?: number;
  boomYaw?: number;
  spotlight?: boolean;
  caughtTension?: number;
};

/** Tạo hình nón luồng sáng đèn pha tắt dần mượt về 0 ở đầu xa (vertex colors + AdditiveBlending -> tuyệt đối không bị ngấn cạnh cắt). */
const makeSoftBeamGeo = (rNear: number, rFar: number, length: number, seg = 24) => {
  const g = new THREE.CylinderGeometry(rNear, rFar, length, seg, 1, true);
  g.translate(0, -length / 2, 0); // Đỉnh đèn tại y=0, chiếu dọc -Y
  const pos = g.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const cWarm = new THREE.Color('#ffc270');
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i); // 0 -> -length
    const t = Math.max(0, Math.min(1, 1 + py / length)); // 1 ở mặt đèn -> 0 ở đáy xa
    const fade = t * t * 0.22;
    cols[i * 3] = cWarm.r * fade;
    cols[i * 3 + 1] = cWarm.g * fade;
    cols[i * 3 + 2] = cWarm.b * fade;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
};

/** Thanh giằng / xi-lanh nối chính xác giữa hai điểm 3D `a` và `b`. */
const StrutBetween: React.FC<{
  a: V3;
  b: V3;
  r: number;
  material: THREE.Material;
  castShadow?: boolean;
}> = ({ a, b, r, material, castShadow = true }) => {
  const { mid, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const l = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    const m = va.add(vb).multiplyScalar(0.5);
    return { mid: [m.x, m.y, m.z] as V3, quat: q, len: l };
  }, [a, b]);

  return (
    <mesh position={mid} quaternion={quat} material={material} castShadow={castShadow}>
      <cylinderGeometry args={[r, r, len, 14]} />
    </mesh>
  );
};

// Biên dạng chắn bùn đôi trên rơ-moóc quân sự (X-Y)
const FENDER_PTS: P2[] = [
  [-3.18, 0.56],
  [-2.96, 0.88],
  [-1.34, 0.88],
  [-1.12, 0.56],
  [-1.22, 0.53],
  [-1.39, 0.81],
  [-2.91, 0.81],
  [-3.08, 0.53],
];

// Biên dạng má thép bệ xoay cẩu (X-Y cục bộ quanh trục xoay x = -2.2)
const PEDESTAL_CHEEK_PTS: P2[] = [
  [-0.58, 0.84],
  [-0.42, 1.52],
  [0.18, 1.44],
  [0.62, 1.12],
  [0.66, 0.84],
];

// Biên dạng đầu mỏ cẩu (gooseneck pulley head) đưa ròng rọc ra đúng [5.80, 15.00, 0] cục bộ ([3.60, 15.00, 0] thế giới)
const GOOSENECK_HEAD_PTS: P2[] = [
  [-0.12, -0.22],
  [0.02, 0.25],
  [0.54, 0.23],
  [0.62, -0.02],
  [0.44, -0.18],
];

export const SkyHookCrane: React.FC<SkyHookCraneProps> = ({
  cableSway = 0,
  boomYaw = 0,
  spotlight = false,
  caughtTension = 0,
}) => {
  const yellowPaint = useMemo(
    () =>
      paint({
        color: PAL3D.craneYellow,
        camo: ['#b88632', '#d9ab55'],
        camoScale: 1.5,
        wear: 0.24,
        dirt: 0.25,
        roughness: 0.55,
        metalness: 0.34,
        repeat: 0.48,
        seed: 51,
      }),
    [],
  );

  const steelPaint = useMemo(
    () =>
      paint({
        color: PAL3D.craneSteel,
        camo: ['#45515e', '#627180'],
        camoScale: 1.7,
        wear: 0.26,
        dirt: 0.28,
        roughness: 0.58,
        metalness: 0.46,
        repeat: 0.48,
        seed: 57,
      }),
    [],
  );

  const tanCabinetPaint = useMemo(
    () =>
      paint({
        color: PAL3D.lidsTan,
        camo: PAL3D.lidsCamo,
        camoScale: 1.5,
        wear: 0.18,
        dirt: 0.22,
        roughness: 0.6,
        metalness: 0.26,
        repeat: 0.65,
        seed: 63,
      }),
    [],
  );

  const darkIron = useMemo(() => plain('#252b33', 0.54, 0.62), []);
  const chromeMat = useMemo(() => plain('#dce5ee', 0.15, 0.92), []);
  const hazardOrange = useMemo(() => plain('#ed582e', 0.4, 0.18), []);
  const ropeMainMat = useMemo(() => plain('#f4e2a4', 0.62, 0.08), []);
  const bungeeCordMat = useMemo(() => plain('#eb9d2f', 0.5, 0.12), []);
  const lampGlassMat = useMemo(
    () =>
      plain(
        spotlight ? '#ffebc4' : '#7f8b96',
        0.14,
        0.2,
        spotlight
          ? {
              emissive: new THREE.Color('#ffbe6b'),
              emissiveIntensity: 3.4,
            }
          : {},
      ),
    [spotlight],
  );
  const beaconMat = useMemo(
    () =>
      plain('#ff3b30', 0.2, 0.1, {
        emissive: new THREE.Color('#ff2a1f'),
        emissiveIntensity: 2.2,
      }),
    [],
  );
  const softBeamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const staticGeos = useMemo(() => {
    const fender = extrude(FENDER_PTS, 0.34, 0.015);
    const cheek = extrude(PEDESTAL_CHEEK_PTS, 0.065, 0.01);
    const headPlate = extrude(GOOSENECK_HEAD_PTS, 0.048, 0.008);
    const drawbarLeft = pipe(
      [
        [0.18, 0.62, -0.54],
        [0.78, 0.56, -0.22],
        [1.24, 0.54, -0.04],
      ],
      0.048,
      14,
    );
    const drawbarRight = pipe(
      [
        [0.18, 0.62, 0.54],
        [0.78, 0.56, 0.22],
        [1.24, 0.54, 0.04],
      ],
      0.048,
      14,
    );
    const mainBeamCone = makeSoftBeamGeo(0.12, 1.35, 5.2, 24);
    const upperBeamCone = makeSoftBeamGeo(0.09, 0.95, 3.6, 20);
    return { fender, cheek, headPlate, drawbarLeft, drawbarRight, mainBeamCone, upperBeamCone };
  }, []);

  // Thông số hình học cần chính: khớp bản lề cục bộ [0, 1.15, 0] -> đỉnh cần [5.36, 15.04, 0]
  // Ròng rọc đầu mỏ cẩu vươn ra đúng cục bộ [5.80, 15.00, 0] => thế giới [3.60, 15.00, 0] = SKYHOOK_APEX
  const boomHinge: V3 = [0, 1.15, 0];
  const boomTipLocal: V3 = [5.36, 15.04, 0];
  const boomDx = boomTipLocal[0] - boomHinge[0];
  const boomDy = boomTipLocal[1] - boomHinge[1];
  const boomTiltFromY = Math.atan2(boomDx, boomDy); // ~0.3683 rad (~21.1°, tổng chiều dài cần ~14.90 m)

  // Tọa độ tai gắn xi-lanh nâng cần đôi (tính chính xác trong hệ tọa độ bàn xoay)
  const sinT = Math.sin(boomTiltFromY);
  const cosT = Math.cos(boomTiltFromY);
  const lugDist = 3.85;
  const lugOffsetPerp = -0.26;
  const boomLugX = boomHinge[0] + lugDist * sinT + lugOffsetPerp * cosT;
  const boomLugY = boomHinge[1] + lugDist * cosT - lugOffsetPerp * sinT;
  const rodMidX = 0.54 + (boomLugX - 0.54) * 0.54;
  const rodMidY = 0.98 + (boomLugY - 0.98) * 0.54;

  // Dây cáp tời chạy dọc lưng cần từ tang trống lên ròng rọc đỉnh
  const winchWireGeo = useMemo(
    () =>
      pipe(
        [
          [-0.22, 1.32, 0],
          [1.62, 6.2, 0],
          [3.52, 11.05, 0],
          [5.28, 15.2, 0],
          [5.8, 15.15, 0],
        ],
        0.018,
        24,
      ),
    [],
  );

  // Dựng đường cong dây cáp thu hồi thẳng đứng (từ y=15.0 xuống y=1.42) theo cableSway & caughtTension
  const cableData = useMemo(() => {
    const ptAt = (y: number): V3 => {
      const world = getSkyHookCablePoint(y, cableSway, caughtTension, 0);
      return [world[0] - TURNTABLE_PIVOT_X, world[1], world[2]];
    };

    const bungeeTop = ptAt(15.0);
    const bungeeBot = ptAt(12.6);

    // 3 sợi dây bungee đàn hồi ở đầu trên (y = 15.0 -> 12.60)
    const bungeeOffsets: [number, number][] = [
      [0, 0.06],
      [0.052, -0.03],
      [-0.052, -0.03],
    ];
    const bungeeGeos = bungeeOffsets.map(([ox, oz]) =>
      pipe(
        [0, 0.25, 0.5, 0.75, 1].map((u) => {
          const y = 15.0 - u * (15.0 - 12.6);
          const p = ptAt(y);
          const pinch = Math.sin(u * Math.PI);
          return [p[0] + ox * (0.45 + 0.55 * pinch), p[1], p[2] + oz * (0.45 + 0.55 * pinch)] as V3;
        }),
        0.023,
        18,
      ),
    );

    // Sợi dây cáp thu hồi chính rõ nét (bán kính 0.038 m)
    const ropeSamples: V3[] = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const y = 12.6 - (i / steps) * (12.6 - 2.05);
      ropeSamples.push(ptAt(y));
    }
    const mainRopeGeo = pipe(ropeSamples, 0.038, 36);

    // Dây chằng đàn hồi dưới nối đối trọng (y = 1.42) xuống đĩa neo mặt đất [5.8, 0.04, 0]
    const weightMid = ptAt(1.7);
    const weightBot = ptAt(1.38);
    const lowerTetherGeo = pipe(
      [weightBot, [5.8 + (weightBot[0] - 5.8) * 0.45, 0.7, weightBot[2] * 0.45], [5.8, 0.05, 0]],
      0.022,
      14,
    );

    // Các phao cữ dẫn hướng màu cam phản quang dọc cáp (khung rõ vùng bắt cáp SKYHOOK_CATCH_POINT y = 9.5 m mà để trống sạch đúng điểm 9.5 m)
    const markerYs = [11.75, 10.55, 8.45, 6.3, 4.1];
    const markers = markerYs.map((my) => ptAt(my));
    const spreaderPlates = [14.74, 13.68, 12.62].map((py) => ptAt(py));

    return {
      bungeeTop,
      bungeeBot,
      bungeeGeos,
      mainRopeGeo,
      lowerTetherGeo,
      weightMid,
      markers,
      spreaderPlates,
    };
  }, [cableSway, caughtTension]);

  // 4 bánh xe rơ-moóc: r = 0.38 m đặt ở y = 0.38 -> điểm thấp nhất chạm đúng mặt đất y = 0.000 m
  const wheelR = 0.38;
  const wheelPositions: V3[] = [
    [-2.68, wheelR, 0.96],
    [-2.68, wheelR, -0.96],
    [-1.62, wheelR, 0.96],
    [-1.62, wheelR, -0.96],
  ];

  // 4 chân chống thủy lực mở rộng đúng 3.80 m (tâm bàn đế z = ±1.72, bàn đế rộng 0.36 m -> phủ bì 3.80 m, mặt dưới y = 0.000 m)
  const outriggerConfigs: { x: number; zSide: 1 | -1 }[] = [
    { x: -0.36, zSide: 1 },
    { x: -0.36, zSide: -1 },
    { x: -3.62, zSide: 1 },
    { x: -3.62, zSide: -1 },
  ];

  return (
    <group>
      {/* ==================== KHUNG XE RƠ-MOÓC DÃ CHIẾN & 4 CHÂN CHỐNG (CHẠM ĐÚNG Y = 0) ==================== */}
      <group>
        {/* Hai dầm dọc chịu lực chữ I & mặt sàn thép rơ-moóc */}
        {([-0.66, 0.66] as const).map((zf) => (
          <mesh key={zf} position={[-1.82, 0.6, zf]} geometry={rbox(4.12, 0.2, 0.14, 0.015)} material={steelPaint} castShadow receiveShadow />
        ))}
        <mesh position={[-1.82, 0.71, 0]} geometry={rbox(4.06, 0.06, 1.58, 0.015)} material={steelPaint} castShadow receiveShadow />

        {/* Giá đỡ chữ A gác cần hành quân ở mũi sàn rơ-moóc (chi tiết đặc trưng xe cẩu dã chiến) */}
        <StrutBetween a={[0.08, 0.74, -0.46]} b={[0.08, 1.62, -0.22]} r={0.032} material={steelPaint} />
        <StrutBetween a={[0.08, 0.74, 0.46]} b={[0.08, 1.62, 0.22]} r={0.032} material={steelPaint} />
        <mesh position={[0.08, 1.62, 0]} geometry={rbox(0.14, 0.07, 0.56, 0.01)} material={darkIron} castShadow />

        {/* Cản sau + cụm đèn hậu quân sự */}
        <mesh position={[-3.88, 0.58, 0]} geometry={rbox(0.12, 0.22, 1.78, 0.02)} material={darkIron} castShadow />
        {([-0.74, 0.74] as const).map((zl) => (
          <mesh key={zl} position={[-3.95, 0.59, zl]} geometry={rbox(0.03, 0.08, 0.16, 0.01)} material={hazardOrange} />
        ))}

        {/* Chắn bùn đôi hai bên hông rơ-moóc */}
        {([-0.96, 0.96] as const).map((zf) => (
          <mesh key={zf} position={[0, 0, zf]} geometry={staticGeos.fender} material={steelPaint} castShadow receiveShadow />
        ))}

        {/* 4 bánh xe rơ-moóc dã chiến + nêm chèn bánh chạm chuẩn mặt đất y = 0 */}
        {wheelPositions.map((pos, idx) => (
          <React.Fragment key={idx}>
            <group position={pos} rotation={[0, pos[2] < 0 ? Math.PI : 0, 0]}>
              <Wheel r={wheelR} width={0.25} tire="#222528" rim={PAL3D.craneSteel} bolts={8} />
            </group>
            {/* Con chèn bánh xe quân sự đặt sát mặt đất y = 0 */}
            <mesh
              position={[pos[0] + (idx < 2 ? -0.34 : 0.34), 0.045, pos[2]]}
              geometry={rbox(0.14, 0.09, 0.22, 0.01)}
              material={yellowPaint}
              castShadow
            />
          </React.Fragment>
        ))}

        {/* Càng kéo chữ A phía trước (+X) + vòng móc kéo lunette + chân kích mũi chạm đất y = 0 */}
        <mesh geometry={staticGeos.drawbarLeft} material={steelPaint} castShadow />
        <mesh geometry={staticGeos.drawbarRight} material={steelPaint} castShadow />
        <mesh position={[1.32, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkIron} castShadow>
          <torusGeometry args={[0.095, 0.028, 12, 24]} />
        </mesh>
        <mesh position={[0.78, 0.31, 0]} material={darkIron} castShadow>
          <cylinderGeometry args={[0.036, 0.036, 0.54, 12]} />
        </mesh>
        <mesh position={[0.78, 0.02, 0]} geometry={rbox(0.22, 0.04, 0.22, 0.008)} material={darkIron} receiveShadow />

        {/* 4 Chân chống thủy lực mở rộng 3.80 m bám mặt đất y = 0 kèm thanh chống chéo chịu lực */}
        {outriggerConfigs.map(({ x, zSide }, idx) => {
          const zPad = zSide * 1.72;
          return (
            <group key={idx}>
              <mesh
                position={[x, 0.6, zSide * 1.22]}
                geometry={rbox(0.24, 0.18, 1.04, 0.015)}
                material={yellowPaint}
                castShadow
                receiveShadow
              />
              {/* Thanh giằng chéo từ khung rơ-moóc xuống cổ xi-lanh chân chống */}
              <StrutBetween a={[x, 0.52, zSide * 0.78]} b={[x, 0.34, zSide * 1.66]} r={0.028} material={steelPaint} />
              <mesh
                position={[x, 0.61, zSide * 1.44]}
                geometry={rbox(0.25, 0.09, 0.22, 0.006)}
                material={hazardOrange}
              />
              <mesh position={[x, 0.52, zPad]} material={yellowPaint} castShadow>
                <cylinderGeometry args={[0.09, 0.09, 0.54, 18]} />
              </mesh>
              <mesh position={[x, 0.16, zPad]} material={chromeMat} castShadow>
                <cylinderGeometry args={[0.058, 0.058, 0.24, 16]} />
              </mesh>
              {/* Bàn đế thép chịu tải 0.36 x 0.06 x 0.36 m (tâm y = 0.03 -> đáy đúng y = 0.000) */}
              <mesh
                position={[x, 0.03, zPad]}
                geometry={rbox(0.36, 0.06, 0.36, 0.01)}
                material={darkIron}
                castShadow
                receiveShadow
              />
            </group>
          );
        })}

        {/* Cụm trạm nguồn thủy lực Diesel & tủ điều khiển thu hồi trên sàn trước rơ-moóc */}
        <group position={[-0.68, 0.74, 0]}>
          <mesh position={[0, 0.36, 0]} geometry={rbox(1.16, 0.72, 1.24, 0.03)} material={tanCabinetPaint} castShadow receiveShadow />
          <mesh position={[0.585, 0.38, 0]} geometry={rbox(0.02, 0.48, 0.86, 0.005)} material={darkIron} />
          <mesh position={[0, 0.42, 0.625]} geometry={rbox(0.68, 0.44, 0.02, 0.005)} material={darkIron} />
          <mesh position={[-0.28, 0.44, -0.625]} geometry={rbox(0.38, 0.32, 0.03, 0.006)} material={plain('#1a2836', 0.4, 0.3)} />
          <mesh
            position={[-0.36, 0.52, -0.645]}
            material={plain('#32e875', 0.2, 0.1, { emissive: new THREE.Color('#20b858'), emissiveIntensity: 1.4 })}
          >
            <sphereGeometry args={[0.018, 10, 8]} />
          </mesh>
          <mesh position={[0.38, 0.88, -0.44]} material={darkIron} castShadow>
            <cylinderGeometry args={[0.042, 0.048, 0.42, 14]} />
          </mesh>
        </group>
      </group>

      {/* ==================== BÀN XOAY CẨU + CẦN ỐNG LỒNG/GIÀN 15M + DÂY CÁP SKYHOOK ==================== */}
      <group position={[TURNTABLE_PIVOT_X, 0, 0]} rotation={[0, boomYaw, 0]}>
        {/* Vành mâm xoay thủy lực */}
        <mesh position={[0, 0.8, 0]} material={darkIron} castShadow>
          <cylinderGeometry args={[0.64, 0.68, 0.14, 28]} />
        </mesh>

        {/* Bệ tháp xoay + hai má thép giữ gốc cần + khối đối trọng sau */}
        <mesh position={[-0.08, 0.92, 0]} geometry={rbox(1.44, 0.12, 1.06, 0.02)} material={steelPaint} castShadow />
        {([-0.3, 0.3] as const).map((zc) => (
          <mesh key={zc} position={[0, 0, zc]} geometry={staticGeos.cheek} material={yellowPaint} castShadow />
        ))}
        <mesh position={[-0.88, 1.2, 0]} geometry={rbox(0.58, 0.56, 1.2, 0.03)} material={yellowPaint} castShadow receiveShadow />
        <mesh position={[-1.18, 1.2, 0]} geometry={rbox(0.04, 0.22, 1.14, 0.008)} material={hazardOrange} />

        {/* Tang cuốn cáp thu hồi (winch drum) */}
        <group position={[-0.36, 1.16, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={darkIron} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.46, 20]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={plain('#8c96a3', 0.45, 0.7)}>
            <cylinderGeometry args={[0.165, 0.165, 0.4, 20]} />
          </mesh>
        </group>

        {/* Cặp xi-lanh thủy lực nâng cần đôi nối từ bàn xoay [0.54, 0.98, ±0.28] lên thân đốt cần 1 */}
        {([-0.28, 0.28] as const).map((zr) => (
          <React.Fragment key={zr}>
            <StrutBetween a={[0.54, 0.98, zr]} b={[rodMidX, rodMidY, zr]} r={0.088} material={yellowPaint} />
            <StrutBetween a={[rodMidX, rodMidY, zr]} b={[boomLugX, boomLugY, zr]} r={0.058} material={chromeMat} />
          </React.Fragment>
        ))}

        {/* CẦN CẨU ỐNG LỒNG 4 ĐỐT ĐỒNG BỘ MÀU VÀNG CÔNG BINH + KHUNG GIÀN GIA CƯỜNG VƯƠN TỚI 15.0 M */}
        <group position={boomHinge} rotation={[0, 0, -boomTiltFromY]}>
          {/* Đốt 1 (gốc cần: 0.0 -> 4.35 m) */}
          <mesh position={[0, 2.16, 0]} geometry={rbox(0.46, 4.36, 0.46, 0.028)} material={yellowPaint} castShadow receiveShadow />
          <mesh position={[0, 4.3, 0]} geometry={rbox(0.53, 0.2, 0.53, 0.015)} material={darkIron} castShadow />

          {/* Đốt 2 (4.2 -> 8.25 m) */}
          <mesh position={[0, 6.22, 0]} geometry={rbox(0.38, 4.1, 0.38, 0.022)} material={yellowPaint} castShadow receiveShadow />
          <mesh position={[0, 8.2, 0]} geometry={rbox(0.44, 0.18, 0.44, 0.012)} material={darkIron} castShadow />

          {/* Đốt 3 (8.1 -> 11.75 m — sơn đồng bộ vàng cát quân sự + đai thép cổ ống lồng để liền mạch thân cần) */}
          <mesh position={[0, 9.92, 0]} geometry={rbox(0.3, 3.7, 0.3, 0.018)} material={yellowPaint} castShadow receiveShadow />
          <mesh position={[0, 10.0, 0]} geometry={rbox(0.315, 0.32, 0.315, 0.01)} material={steelPaint} />
          <mesh position={[0, 11.7, 0]} geometry={rbox(0.36, 0.16, 0.36, 0.012)} material={darkIron} castShadow />

          {/* Đốt 4 (11.6 -> 14.90 m) kèm vạch cảnh báo hàng không cam-trắng ở ngọn 15 m */}
          <mesh position={[0, 13.25, 0]} geometry={rbox(0.23, 3.3, 0.23, 0.015)} material={yellowPaint} castShadow receiveShadow />
          <mesh position={[0, 13.95, 0]} geometry={rbox(0.242, 0.34, 0.242, 0.008)} material={hazardOrange} />
          <mesh position={[0, 14.32, 0]} geometry={rbox(0.242, 0.32, 0.242, 0.008)} material={plain('#eef3f8', 0.45, 0.1)} />
          <mesh position={[0, 14.68, 0]} geometry={rbox(0.246, 0.34, 0.246, 0.008)} material={hazardOrange} />

          {/* Khung giàn không gian (lattice side trusses) dọc hai bên sườn đốt 1 & đốt 2 + thanh căng lưng A-frame */}
          {([-0.36, 0.36] as const).map((zt) => (
            <React.Fragment key={zt}>
              <StrutBetween a={[0.26, 0.35, zt]} b={[0.26, 8.05, zt]} r={0.026} material={steelPaint} />
              {[0.4, 1.65, 2.9, 4.15, 5.4, 6.65].map((sy, k) => (
                <React.Fragment key={sy}>
                  <StrutBetween a={[0.16, sy, zt * 0.62]} b={[0.26, sy + 0.62, zt]} r={0.018} material={steelPaint} />
                  <StrutBetween a={[0.26, sy + 0.62, zt]} b={[0.16, sy + 1.25, zt * 0.62]} r={0.018} material={steelPaint} />
                  {k % 2 === 0 && (
                    <StrutBetween a={[-0.16, sy + 0.62, zt * 0.62]} b={[0.26, sy + 0.62, zt]} r={0.016} material={darkIron} />
                  )}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
          {/* Thanh giằng chống võng lưng cần (backstay tension rods) */}
          <StrutBetween a={[-0.22, 0.8, 0]} b={[-0.62, 4.3, 0]} r={0.024} material={steelPaint} />
          <StrutBetween a={[-0.62, 4.3, 0]} b={[-0.18, 4.3, 0]} r={0.028} material={darkIron} />
          <StrutBetween a={[-0.62, 4.3, 0]} b={[-0.2, 11.65, 0]} r={0.018} material={steelPaint} />

          {/* Cụm 2 đèn pha công suất lớn gắn trên khung cần hướng chéo về vùng bắt cáp SkyHook (luồng sáng tắt mượt không cạnh cắt) */}
          <group position={[0.26, 3.35, 0]}>
            <mesh geometry={rbox(0.1, 0.1, 1.12, 0.012)} material={darkIron} castShadow />
            {([-0.5, 0.5] as const).map((zl) => (
              <group key={zl} position={[0.09, 0.04, zl]} rotation={[0, 0, 0.36]}>
                <mesh geometry={rbox(0.2, 0.22, 0.28, 0.02)} material={darkIron} castShadow />
                <mesh position={[0.105, 0, 0]} geometry={rbox(0.02, 0.18, 0.23, 0.005)} material={lampGlassMat} />
                {spotlight && (
                  <mesh
                    position={[0.12, 0, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                    geometry={staticGeos.mainBeamCone}
                    material={softBeamMat}
                  />
                )}
              </group>
            ))}
          </group>

          {/* Đèn pha phụ tầng cao soi trực tiếp cụm giảm chấn bungee & điểm bắt cáp y = 9.5 m */}
          <group position={[0.2, 9.4, 0.24]} rotation={[0, -0.1, -0.22]}>
            <mesh geometry={rbox(0.16, 0.18, 0.22, 0.018)} material={darkIron} castShadow />
            <mesh position={[0.085, 0, 0]} geometry={rbox(0.02, 0.14, 0.18, 0.004)} material={lampGlassMat} />
            {spotlight && (
              <mesh
                position={[0.1, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
                geometry={staticGeos.upperBeamCone}
                material={softBeamMat}
              />
            )}
          </group>
        </group>

        {/* ĐẦU MỎ CẨU (GOOSENECK SHEAVE HEAD) ĐẶT ĐÚNG RÒNG RỌC TẠI [5.80, 15.00, 0] (THẾ GIỚI [3.60, 15.00, 0]) */}
        <group position={boomTipLocal}>
          {([-0.13, 0.13] as const).map((zh) => (
            <mesh key={zh} position={[0, 0, zh]} geometry={staticGeos.headPlate} material={darkIron} castShadow />
          ))}
          <mesh position={[0.04, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={yellowPaint} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.18, 20]} />
          </mesh>
          <mesh
            position={[CABLE_LOCAL_X - boomTipLocal[0], CABLE_TOP_Y - boomTipLocal[1] + 0.12, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={hazardOrange}
            castShadow
          >
            <cylinderGeometry args={[0.17, 0.17, 0.18, 22]} />
          </mesh>
          <mesh position={[CABLE_LOCAL_X - boomTipLocal[0], CABLE_TOP_Y - boomTipLocal[1], 0]} material={chromeMat}>
            <sphereGeometry args={[0.085, 14, 12]} />
          </mesh>

          {/* Cột cảm biến gió anemometer & đèn chớp đỏ cảnh báo độ cao hàng không trên đỉnh */}
          <mesh position={[0.02, 0.3, 0]} material={darkIron}>
            <cylinderGeometry args={[0.018, 0.022, 0.28, 10]} />
          </mesh>
          <mesh position={[0.02, 0.46, 0]} material={beaconMat}>
            <sphereGeometry args={[0.065, 14, 12]} />
          </mesh>
        </group>

        {/* Dây cáp thép từ tang tời chạy dọc lưng cần lên đỉnh ròng rọc */}
        <mesh geometry={winchWireGeo} material={plain('#9aa5b1', 0.4, 0.75)} />

        {/* ==================== CỤM DÂY CÁP THU HỒI THẲNG ĐỨNG + GIẢM CHẤN BUNGEE + ĐỐI TRỌNG ==================== */}
        <group>
          {/* Cụm 3 dây giảm chấn đàn hồi Bungee ở đầu trên (y = 15.0 -> 12.60 m) */}
          {cableData.bungeeGeos.map((bg, idx) => (
            <mesh key={idx} geometry={bg} material={bungeeCordMat} castShadow />
          ))}
          {cableData.spreaderPlates.map((sp, idx) => (
            <mesh key={idx} position={sp} material={idx === 1 ? hazardOrange : darkIron} castShadow>
              <cylinderGeometry args={[0.11, 0.11, 0.058, 16]} />
            </mesh>
          ))}
          <StrutBetween a={cableData.bungeeTop} b={cableData.bungeeBot} r={0.034} material={darkIron} />

          {/* Sợi dây cáp thu hồi chính (bán kính 0.038 m rõ nét từ y = 12.60 xuống y = 2.05 m) */}
          <mesh geometry={cableData.mainRopeGeo} material={ropeMainMat} castShadow />

          {/* Các ống phao dẫn hướng màu cam-trắng nổi bật trên dây (khung rõ vùng bắt cáp SKYHOOK_CATCH_POINT y = 9.5 m) */}
          {cableData.markers.map((mp, idx) => (
            <group key={idx} position={mp}>
              <mesh material={hazardOrange} castShadow>
                <cylinderGeometry args={[0.068, 0.068, 0.25, 16]} />
              </mesh>
              <mesh material={plain('#fff4d6', 0.35, 0.1)}>
                <cylinderGeometry args={[0.071, 0.071, 0.065, 16]} />
              </mesh>
            </group>
          ))}

          {/* Cụm đối trọng giữ căng dây ở chân dưới (y ≈ 1.4 -> 2.05 m) */}
          <group position={cableData.weightMid}>
            <mesh material={darkIron} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 0.64, 20]} />
            </mesh>
            <mesh position={[0, 0.13, 0]} material={yellowPaint}>
              <cylinderGeometry args={[0.165, 0.165, 0.14, 20]} />
            </mesh>
            <mesh position={[0, -0.13, 0]} material={hazardOrange}>
              <cylinderGeometry args={[0.165, 0.165, 0.12, 20]} />
            </mesh>
          </group>

          {/* Dây neo đàn hồi nối từ đáy đối trọng xuống đĩa neo mặt đất [5.8, 0, 0] (y = 0) */}
          <mesh geometry={cableData.lowerTetherGeo} material={darkIron} />
          <mesh position={[CABLE_LOCAL_X, 0.025, 0]} material={darkIron} receiveShadow castShadow>
            <cylinderGeometry args={[0.28, 0.32, 0.05, 20]} />
          </mesh>
          <mesh position={[CABLE_LOCAL_X, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} material={hazardOrange}>
            <torusGeometry args={[0.068, 0.018, 10, 18]} />
          </mesh>
        </group>

        {/* Nguồn sáng thật khi bật spotlight chiếu sáng dây thu hồi & thân cẩu trong cảnh đêm */}
        {spotlight && (
          <>
            <pointLight position={[3.9, 9.2, 0.7]} color={PAL3D.sodiumLamp} intensity={4.8} distance={18} decay={1.6} />
            <pointLight position={[1.4, 3.6, 0.8]} color={PAL3D.sodiumLamp} intensity={3.4} distance={12} decay={1.7} />
          </>
        )}
      </group>
    </group>
  );
};

// ==================== BÀN XOAY KIỂM TRA 4 GÓC ====================

export const MODELS: ModelSet = {
  ScanEagle: {
    C: () => (
      <group position={[0, 0.65, 0]}>
        <ScanEagle propSpin={0.6} turretYaw={0.35} />
      </group>
    ),
    size: 3.3,
    center: [0, 0.65, 0],
  },
  SkyHookCrane: {
    C: () => <SkyHookCrane cableSway={0.04} spotlight />,
    size: 20.4,
    center: [0.9, 7.65, 0],
  },
};
