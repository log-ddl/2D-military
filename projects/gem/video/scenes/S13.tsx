// S13 (237.06 – 266.14s, thuần 3D): 30–45 giây trước vụ nổ — Pha thu hồi bắt sống nghẹt thở
// UAV trinh sát không bánh xe ScanEagle lao mấu móc đầu cánh phải vào sợi cáp thẳng đứng
// trên cần cẩu SkyHookCrane cao 15 m, hút cạn sự chú ý kíp trực vào "tầm nhìn đường hầm".
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { Label, useT } from '@kit/motion';
import { lerp, prog } from '@kit/theme';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { CUE } from '../cues';
import { PAL2D, PAL3D, STAGE_PREDAWN, TERRAIN_PREDAWN } from '../local/palette';
import {
  ChuContainer,
  ConcreteBunker,
  HescoWall,
  NightHawkMast,
  SCANEAGLE_RIGHT_HOOK_OFFSET,
  ScanEagle,
  SKYHOOK_CATCH_POINT,
  SkyHookCrane,
  TWall,
  getSkyHookCablePoint,
} from '../local/models';

// Địa hình bãi sỏi thu hồi UAV & khu nhà trực BDOC tại Tháp 22 (Rukban) — khởi tạo 1 lần ở cấp module
const H_RECOVERY = heightField({
  seed: 131,
  amp: 3.8,
  scale: 98,
  oct: 5,
  flats: [
    [0, 0, 32, 0], // Bãi sỏi phẳng đặt cần cẩu SkyHookCrane
    [6, -24, 24, 0], // Khu nhà trực BDOC & dãy CHU phía Nam bãi cẩu
    [-85, 0, 36, -0.2], // Hành lang tiếp cận thấp phía Tây
    [-180, 0, 42, -0.4],
  ],
  add: (x, z) => {
    // Gờ đồi đá bazan bao quanh xa phía Bắc (+Z), Nam (-Z xa) và Đông (+X) tạo đường chân trời rõ khối ở mọi góc máy
    const northRidge = 11.5 * Math.exp(-(((z - 78) / 32) ** 2));
    const southFarRidge = 9.0 * Math.exp(-(((z + 95) / 36) ** 2));
    const eastRidge = 7.5 * Math.exp(-(((x - 105) / 40) ** 2));
    return northRidge + southFarRidge + eastRidge;
  },
});

const avoidPadAndCorridor = (x: number, z: number) => {
  if (Math.hypot(x, z) < 30) return true;
  if (Math.hypot(x - 6, z + 24) < 23) return true;
  if (x > -240 && x < 24 && Math.abs(z) < 12) return true;
  return false;
};

/** Tính góc đung đưa gió đêm `cableSway` (rad) liên tục qua thời điểm bắt cáp `CUE.s13_catch`. */
const evalCableSway = (t: number): number => {
  const wind = 0.092 * Math.sin(t * 1.32 + 0.45) + 0.034 * Math.sin(t * 2.35 - 0.75);
  const tau = t - CUE.s13_catch;
  if (tau <= 0) return wind;
  const dampWind = 0.42 + 0.58 * Math.exp(-tau * 1.4);
  const impactLateral = -0.072 * Math.sin(tau * 3.7) * Math.exp(-tau * 1.05);
  return wind * dampWind + impactLateral;
};

/** Tính độ kéo căng cáp chữ V `caughtTension` ngay khi đầu cánh ScanEagle khóa chặt vào dây tại `256.80s`. */
const evalCaughtTension = (t: number): number => {
  const tau = t - CUE.s13_catch;
  if (tau <= 0) return 0;
  return 1.34 * Math.sin(tau * 5.7) * Math.exp(-tau * 1.3) + 0.29 * (1 - Math.exp(-tau * 4.4));
};

/** Cột đèn pha natri dã chiến soi bãi thu hồi SkyHook. */
const FloodlightTripod: React.FC<{ pos: V3; yaw?: number }> = ({ pos, yaw = 0 }) => {
  const poleMat = useMemo(() => plain('#39424d', 0.55, 0.55), []);
  const lampMat = useMemo(
    () =>
      plain('#ffe7bd', 0.15, 0.1, {
        emissive: new THREE.Color(PAL3D.sodiumLamp),
        emissiveIntensity: 3.1,
      }),
    [],
  );
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.85, 0]} material={poleMat} castShadow>
        <cylinderGeometry args={[0.038, 0.052, 3.7, 10]} />
      </mesh>
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.34, 0.42, Math.sin(a) * 0.34]}
          rotation={[Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55]}
          material={poleMat}
          castShadow
        >
          <cylinderGeometry args={[0.024, 0.028, 1.02, 8]} />
        </mesh>
      ))}
      <group position={[0, 3.72, 0]} rotation={[0, 0, 0.22]}>
        <mesh geometry={rbox(0.22, 0.28, 0.44, 0.02)} material={poleMat} castShadow />
        <mesh position={[0.115, 0, 0]} geometry={rbox(0.02, 0.22, 0.38, 0.005)} material={lampMat} />
      </group>
    </group>
  );
};

/** Khung cửa sổ quan sát tối của phòng trực BDOC (dùng cho Nhịp 4: góc nhìn "tầm nhìn đường hầm" 259.4–266.1s). */
const BdocObservationWindow: React.FC = () => {
  const wallMat = useMemo(
    () =>
      paint({
        color: '#161d26',
        camo: ['#10151c', '#1e2733'],
        camoScale: 2.5,
        wear: 0.15,
        dirt: 0.22,
        roughness: 0.88,
        metalness: 0.2,
        repeat: 0.6,
        seed: 91,
      }),
    [],
  );
  const frameMat = useMemo(() => plain('#0c1118', 0.7, 0.4), []);
  const screenBlueMat = useMemo(
    () =>
      plain('#194670', 0.18, 0.1, {
        emissive: new THREE.Color('#3498f0'),
        emissiveIntensity: 1.75,
      }),
    [],
  );
  const ledAmberMat = useMemo(
    () =>
      plain('#ffb02e', 0.2, 0.1, {
        emissive: new THREE.Color('#ff8c1a'),
        emissiveIntensity: 2.0,
      }),
    [],
  );

  // Đặt tại [5.05, 0, -20.5]: ô cửa mở y = 1.62..3.86 m và x_local = -1.32..+1.22 m
  // để từ camera [5.2, 2.24, -22.3..-23.2] thấy trọn đỉnh cẩu 15 m lẫn bánh xe cẩu và ScanEagle bên trong khung cửa tối!
  return (
    <group position={[5.05, 0, -20.5]}>
      {/* Mảng tường trên (y > 3.86), tường dưới (y < 1.62), hai đố tường bên tạo khuôn đường hầm */}
      <mesh position={[0, 4.55, 0]} geometry={rbox(6.4, 1.38, 0.26, 0.02)} material={wallMat} />
      <mesh position={[0, 0.81, 0]} geometry={rbox(6.4, 1.62, 0.26, 0.02)} material={wallMat} />
      <mesh position={[-2.26, 2.74, 0]} geometry={rbox(1.88, 2.28, 0.26, 0.02)} material={wallMat} />
      <mesh position={[2.21, 2.74, 0]} geometry={rbox(1.98, 2.28, 0.26, 0.02)} material={wallMat} />

      {/* Trần & hai vách tối kéo lùi về sau lưng máy quay */}
      <mesh position={[0, 5.15, -1.8]} geometry={rbox(6.4, 0.22, 3.8, 0.02)} material={frameMat} />
      <mesh position={[-3.05, 2.55, -1.8]} geometry={rbox(0.24, 5.1, 3.8, 0.02)} material={frameMat} />
      <mesh position={[3.05, 2.55, -1.8]} geometry={rbox(0.24, 5.1, 3.8, 0.02)} material={frameMat} />

      {/* Khung thép viền cửa sổ quan sát */}
      <mesh position={[-0.05, 3.88, 0.11]} geometry={rbox(2.68, 0.09, 0.16, 0.01)} material={frameMat} />
      <mesh position={[-0.05, 1.60, 0.11]} geometry={rbox(2.74, 0.1, 0.22, 0.01)} material={frameMat} />
      <mesh position={[-1.34, 2.74, 0.11]} geometry={rbox(0.09, 2.34, 0.16, 0.01)} material={frameMat} />
      <mesh position={[1.24, 2.74, 0.11]} geometry={rbox(0.09, 2.34, 0.16, 0.01)} material={frameMat} />

      {/* Mặt bàn trực & hai màn hình chiến thuật xanh lam hắt sáng mờ dưới bậu cửa */}
      <mesh position={[0, 1.54, -0.42]} geometry={rbox(3.4, 0.08, 0.88, 0.015)} material={frameMat} />
      <group position={[-0.78, 1.72, -0.44]} rotation={[-0.18, 0.22, 0]}>
        <mesh geometry={rbox(0.46, 0.28, 0.04, 0.008)} material={frameMat} />
        <mesh position={[0, 0, -0.022]} geometry={rbox(0.4, 0.22, 0.01, 0.003)} material={screenBlueMat} />
      </group>
      <group position={[0.74, 1.71, -0.46]} rotation={[-0.18, -0.22, 0]}>
        <mesh geometry={rbox(0.42, 0.26, 0.04, 0.008)} material={frameMat} />
        <mesh position={[0, 0, -0.022]} geometry={rbox(0.36, 0.2, 0.01, 0.003)} material={screenBlueMat} />
      </group>
      <mesh position={[0.08, 1.6, -0.38]} geometry={rbox(0.05, 0.025, 0.05, 0.005)} material={ledAmberMat} />
    </group>
  );
};

const S13: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ==================== 1. ĐỘNG HỌC CÁP SKYHOOK & PHA BẮT SỐNG ĐẦU CÁNH SCANEAGLE ====================
  const TC = CUE.s13_catch; // 256.80s
  const cableSway = evalCableSway(t);
  const caughtTension = evalCaughtTension(t);

  // Điểm cáp thực tại thời điểm hiện tại & tại đúng khoảnh khắc chạm cáp TC (boomYaw = 0, cẩu đặt ở [0,0,0])
  const cableCatchNow = getSkyHookCablePoint(SKYHOOK_CATCH_POINT[1], cableSway, caughtTension, 0);
  const cableCatchAtTC = getSkyHookCablePoint(SKYHOOK_CATCH_POINT[1], evalCableSway(TC), 0, 0);

  const rem = Math.max(0, TC - t);
  const tau = Math.max(0, t - TC);

  // Tọa độ thế giới của chính họng móc khóa đầu cánh phải `SCANEAGLE_RIGHT_HOOK_OFFSET`:
  // - Trước 256.80s: lao dọc hành lang +X với tốc độ 12.6 m/s, hội tụ C^1 vào đúng `cableCatchAtTC` khi rem -> 0.
  // - Từ 256.80s trở đi: khóa cứng 100% vào `cableCatchNow` trên sợi dây đang kéo cong chữ V & đung đưa!
  const approachSpeed = 12.6;
  const hookWorld: V3 =
    t >= TC
      ? cableCatchNow
      : [
          cableCatchAtTC[0] - approachSpeed * rem,
          cableCatchAtTC[1] + 1.15 * prog(rem, 1.5, 18.0) + 0.1 * Math.sin(t * 2.15) * Math.min(1, rem / 1.1),
          cableCatchAtTC[2] + (0.42 * Math.sin(t * 1.15) - 0.18) * Math.min(1, rem / 1.4),
        ];

  // Nghiêng nhẹ thân ở đoạn 243.4–247.0s để phô rõ bụng trơn không càng đáp trước ống kính
  const showBellyBank = 0.21 * prog(t, 243.1, 244.3) * (1 - prog(t, 246.4, 247.4));

  const yawY =
    t <= TC
      ? 0.04 * Math.sin(t * 1.28) * Math.min(1, rem / 1.1)
      : -0.94 * (1 - Math.exp(-tau * 3.0)) - 0.44 * Math.sin(tau * 3.45) * Math.exp(-tau * 0.92);

  const rollX =
    t <= TC
      ? showBellyBank + 0.095 * Math.sin(t * 2.05 + 0.5) * Math.min(1, rem / 0.85)
      : -0.58 * (1 - Math.exp(-tau * 2.6)) - 0.23 * Math.sin(tau * 4.1) * Math.exp(-tau * 1.05);

  const pitchZ =
    t <= TC
      ? -0.025 * prog(rem, 1.4, 12.0) + 0.016 * Math.cos(t * 1.75) * Math.min(1, rem / 0.9)
      : -0.21 * (1 - Math.exp(-tau * 2.4)) + 0.13 * Math.sin(tau * 4.9) * Math.exp(-tau * 1.25);

  // Suy ngược tọa độ tâm `uavPos` từ `hookWorld` và `uavQuat` để mấu móc `SCANEAGLE_RIGHT_HOOK_OFFSET` trùng khít dây 100%
  const uavQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rollX, yawY, pitchZ, 'YXZ'));
  const hookVec = new THREE.Vector3(...SCANEAGLE_RIGHT_HOOK_OFFSET).applyQuaternion(uavQuat);
  const uavPos: V3 = [hookWorld[0] - hookVec.x, hookWorld[1] - hookVec.y, hookWorld[2] - hookVec.z];

  // Cánh quạt đẩy đuôi quay tít khi bay, ngắt động cơ giảm tốc mượt đến dừng hẳn ngay sau khi bắt cáp 256.80s
  const propOmega = 44;
  const propSpin =
    t <= TC
      ? (t - 236.5) * propOmega
      : (TC - 236.5) * propOmega + (propOmega / 2.75) * (1 - Math.exp(-tau * 2.75));

  // Cầu quang-hồng ngoại EO/IR ở mũi quét nhẹ rồi đứng yên sau khi thu hồi
  const turretYaw =
    t <= TC ? 0.28 * Math.sin(t * 1.45) : 0.28 * Math.sin(TC * 1.45) * Math.exp(-tau * 1.8);

  // ==================== 2. NGÔN NGỮ CAMERA 4 NHỊP (KHỚP LỜI THOẠI & MỐC CUE) ====================
  let camPos: V3;
  let camLook: V3;
  let camFov = 40;

  if (t < 247.4) {
    // Nhịp 1 (237.06 – 247.40s): Bay bám ngang-thấp thấy cả bụng trơn KHÔNG BÁNH XE của ScanEagle
    // lẫn đường chân trời đồi đá sỏi Rukban phía dưới (tránh ngước thẳng lên vùng trời trống)
    const pBelly = prog(t, 242.8, 246.6);
    const ox = lerp(2.25, -0.42, pBelly);
    const oy = lerp(-0.12, -0.34, pBelly) + 0.04 * Math.sin(t * 1.6);
    const oz = lerp(-2.15, -1.52, pBelly);
    camPos = [uavPos[0] + ox, uavPos[1] + oy, uavPos[2] + oz];
    camLook = [
      uavPos[0] + lerp(0.18, 0.08, pBelly),
      uavPos[1] + lerp(-0.28, -0.14, pBelly),
      uavPos[2] + lerp(0.55, 0.28, pBelly),
    ];
    camFov = lerp(40, 36, pBelly);
  } else if (t < 253.65) {
    // Nhịp 2 (247.40 – 253.65s): Mở rộng thấy trọn cần cẩu SkyHookCrane cao 15 m (có khoảng thở trên đỉnh 15 m)
    const pCrane = prog(t, 247.4, 253.65);
    camPos = [lerp(15.2, 12.8, pCrane), lerp(3.6, 6.2, pCrane), lerp(16.6, 13.8, pCrane)];
    camLook = [lerp(1.5, 2.5, pCrane), lerp(7.2, 7.8, pCrane), 0];
    camFov = lerp(46, 43, pCrane);
  } else if (t < 259.4) {
    // Nhịp 3 (253.65 – 259.40s):
    // - 253.65 -> 255.8s: Bay bám sát sau lưng-cánh ScanEagle nhìn thẳng qua mấu móc đầu cánh về phía dây cáp SkyHook sáng rực phía trước!
    // - 255.3 -> 259.4s: Vượt mượt lên góc chéo cận cảnh đón khoảnh khắc đầu cánh phải phập đúng dây cáp lúc 256.80s & quăng chữ V!
    const pToCatch = prog(t, 255.15, 256.62);
    const pAfter = prog(t, 256.8, 259.4);
    const jolt = tau > 0 && tau < 0.75 ? Math.sin(tau * 28) * Math.exp(-tau * 5.2) * 0.085 : 0;

    // Vị trí bám sát đuôi lệch ngoài cánh trái (-Z = -3.85 < -3.11 nên không bao giờ cắt vào cánh)
    const chasePos: V3 = [uavPos[0] - 2.85, uavPos[1] + 0.52, uavPos[2] - 2.15];
    const chaseLook: V3 = [uavPos[0] + 6.4, uavPos[1] - 0.24, 0.22];

    // Vị trí cận cảnh chéo phía trước đón cú bắt cáp tại [3.6, 9.5, 0]
    const catchPos: V3 = [7.15 + pAfter * 1.05, 9.82 - pAfter * 0.34 + jolt, -4.45 - pAfter * 0.8];
    const catchLook: V3 = [
      lerp(3.72, 4.35, pAfter),
      lerp(9.42, 8.95, pAfter) + jolt * 0.6,
      lerp(-0.32, -0.45, pAfter),
    ];

    camPos = [
      lerp(chasePos[0], catchPos[0], pToCatch),
      lerp(chasePos[1], catchPos[1], pToCatch),
      lerp(chasePos[2], catchPos[2], pToCatch),
    ];
    camLook = [
      lerp(chaseLook[0], catchLook[0], pToCatch),
      lerp(chaseLook[1], catchLook[1], pToCatch),
      lerp(chaseLook[2], catchLook[2], pToCatch),
    ];
    camFov = lerp(42, 37, pToCatch);
  } else {
    // Nhịp 4 (259.40 – 266.14s): Lùi vào trong khung cửa sổ tối của phòng trực BDOC nhìn trọn cẩu SkyHook 15 m ("tầm nhìn đường hầm")
    const pTunnel = prog(t, 259.4, 266.14);
    camPos = [lerp(5.02, 5.0, pTunnel), lerp(2.26, 2.3, pTunnel), lerp(-22.15, -23.1, pTunnel)];
    camLook = [lerp(2.45, 2.75, pTunnel), lerp(7.35, 7.65, pTunnel), 0];
    camFov = lerp(45, 36.5, pTunnel);
  }

  // Tăng độ tối viền vignette mượt ở Nhịp 4 ("tầm nhìn đường hầm")
  const tunnelVig = lerp(0.48, 0.88, prog(t, 259.45, 264.8));
  const stagePost = useMemo(
    () => ({
      ...(STAGE_PREDAWN.post || {}),
      vignette: tunnelVig,
    }),
    [tunnelVig],
  );

  // Bãi đáp sỏi đầm chặt quanh cẩu SkyHook
  const gravelPadMat = useMemo(
    () =>
      paint({
        color: '#5a626e',
        camo: ['#4d5560', '#69707a'],
        camoScale: 3.2,
        wear: 0.25,
        dirt: 0.35,
        roughness: 0.96,
        metalness: 0.04,
        repeat: 0.38,
        seed: 73,
      }),
    [],
  );

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PREDAWN}
        post={stagePost}
        shadowArea={34}
        shadowCenter={[2, 4, -4]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình sa mạc đá sỏi bazan Rukban & thảm đá bụi tự nhiên */}
        <Terrain h={H_RECOVERY} size={520} seg={220} center={[-30, 0]} colors={TERRAIN_PREDAWN} grainRepeat={46} />
        <Scatter
          kind="rock"
          count={230}
          area={[-240, -140, 140, 130]}
          h={H_RECOVERY}
          seed={13}
          scale={[0.45, 1.35]}
          avoid={avoidPadAndCorridor}
          tint="#6b727d"
        />
        <Scatter
          kind="bush"
          count={52}
          area={[-220, -120, 120, 110]}
          h={H_RECOVERY}
          seed={29}
          scale={[0.5, 1.05]}
          avoid={avoidPadAndCorridor}
          tint="#69685c"
        />

        {/* Bãi sỏi đầm kỹ thuật dưới chân cần cẩu SkyHook */}
        <mesh position={[-0.4, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={gravelPadMat} receiveShadow>
          <circleGeometry args={[12.5, 40]} />
        </mesh>

        {/* Cần cẩu thu hồi SkyHookCrane cao 15.0 m bật đèn pha rực sáng giữa trời đêm */}
        <SkyHookCrane
          cableSway={cableSway}
          boomYaw={0}
          spotlight
          caughtTension={caughtTension}
        />

        {/* Hai chân đèn pha dã chiến & nguồn sáng vàng natri tôn rõ sợi cáp thu hồi + thân ScanEagle */}
        <FloodlightTripod pos={[7.8, 0, 6.4]} yaw={2.42} />
        <FloodlightTripod pos={[-6.8, 0, -6.2]} yaw={-0.68} />
        <pointLight position={[5.4, 9.8, -2.6]} color={PAL3D.sodiumLamp} intensity={28} distance={30} decay={1.45} />
        <pointLight position={[7.4, 4.2, 5.8]} color={PAL3D.sodiumLamp} intensity={16} distance={24} decay={1.55} />

        {/* Ánh trăng/bầu trời phản xạ nhẹ dưới bụng ScanEagle ở Nhịp 1 để thấy rõ bụng trơn không càng đáp */}
        {t < 248.0 && (
          <pointLight
            position={[uavPos[0] + 0.4, uavPos[1] - 2.1, uavPos[2] - 1.0]}
            color="#b4d5f5"
            intensity={4.8}
            distance={9.5}
            decay={1.4}
          />
        )}

        {/* UAV trinh sát ScanEagle — mấu móc đầu cánh phải khớp chính xác 100% vào sợi cáp tại 256.80s */}
        <group position={uavPos} quaternion={uavQuat}>
          <ScanEagle propSpin={propSpin} turretYaw={turretYaw} />
        </group>

        {/* Vành đai công sự HESCO, tường T-Wall, trụ NightHawk bất động & dãy nhà ngủ CHU sáng đèn ấm phía xa */}
        <group position={[-11.5, 0, 15.5]} rotation={[0, 0.14, 0]}>
          <HescoWall cells={5} seed={41} />
        </group>
        <group position={[1.5, 0, 16.8]} rotation={[0, -0.08, 0]}>
          <HescoWall cells={5} seed={47} />
        </group>
        <group position={[15.2, 0, 13.6]} rotation={[0, -0.52, 0]}>
          <HescoWall cells={4} seed={53} />
        </group>

        {/* Cụm nhà trực BDOC (dựng khung cửa sổ quan sát ở Nhịp 4 để đóng khung cẩu SkyHook sáng rực giữa đêm) */}
        {t >= 259.35 && <BdocObservationWindow />}

        {/* Khu doanh trại phía sau lưng bãi cẩu: tường T-Wall, hầm trú ẩn, trụ NightHawk & dãy CHU đèn vàng ấm */}
        <group position={[-10.5, 0, -18.5]} rotation={[0, 0.04, 0]}>
          <HescoWall cells={4} seed={61} />
        </group>
        <group position={[14.8, 0, -17.5]} rotation={[0, -0.22, 0]}>
          <TWall count={4} seed={67} />
        </group>
        <group position={[-16.5, 0, -23.5]} rotation={[0, 0.35, 0]}>
          <ChuContainer warmLight seed={71} />
        </group>
        <group position={[-8.2, 0, -26.2]} rotation={[0, 0.05, 0]}>
          <ChuContainer warmLight seed={79} />
        </group>
        <group position={[14.2, 0, -25.4]} rotation={[0, -0.1, 0]}>
          <ChuContainer warmLight seed={83} />
        </group>
        <group position={[-2.2, 0, -24.0]} rotation={[0, 0.1, 0]}>
          <ConcreteBunker seed={89} />
        </group>
        {/* Trụ camera nhiệt NightHawk đứng im chĩa về hướng Đông–Bắc (yaw = -0.55), còi báo động tắt */}
        <group position={[18.5, 0, -11.2]}>
          <NightHawkMast yaw={-0.55} pitch={-0.04} strobe={0} />
        </group>
      </Stage>

      {/* Tối đa 1 nhãn <Label> tại mọi thời điểm, khớp đúng mốc voice */}
      <Label
        t={t}
        text="SCANEAGLE"
        x={960}
        y={920}
        from={CUE.s13_scaneagle}
        until={244.2}
        size={48}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="SKYHOOK · 15 M"
        x={440}
        y={900}
        from={CUE.s13_skyhook}
        until={253.5}
        size={48}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S13;
