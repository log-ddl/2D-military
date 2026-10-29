import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, ridgeX, Scatter, Terrain } from '@lib/3d/terrain';
import { Explosion, MuzzleBlast, Trail } from '@lib/3d/fx';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { PAL2D, PAL3D, STAGE_RUKBAN_DAY, TERRAIN_RUKBAN_DAY } from '../local/palette';
import {
  ChuContainer,
  ConcreteBunker,
  CoyoteBlock2,
  getCoyoteLaunchDir,
  getCoyoteMuzzlePos,
  HescoWall,
  KurfsRadarUnit,
  NightHawkMast,
  SHAHED_CENTER_Y,
  Shahed136,
  TWall,
} from '../local/models';

// Địa hình sa mạc Rukban ban ngày nắng khô: sân doanh trại phẳng y = 0 & gờ công sự vành đai LIDS cao y = 1.35 m
const LIDS_POS: V3 = [18.0, 1.35, -5.0];
const YAW_FIRE = -0.2;
const ELEV_FIRE = 0.48;
const INTERCEPT_POS: V3 = [76.0, 23.0, 8.5];
const SHAHED_START_S18: V3 = [192.0, 33.5, 31.0];

const H_S18 = heightField({
  seed: 181,
  amp: 5.2,
  scale: 125,
  flats: [
    [-2, -6, 22, 0],
    [LIDS_POS[0], LIDS_POS[2], 5.6, LIDS_POS[1]],
  ],
  add: (x, z) =>
    ridgeX(175, 19, 62)(x, z) +
    ridgeX(-120, 12, 48)(x, z) +
    9.0 * Math.exp(-(((z + 130) / 48) ** 2)),
});

const avoidBase = (x: number, z: number) =>
  (x > -24 && x < 28 && z > -24 && z < 14);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

const evalCubicBezier = (p0: V3, p1: V3, p2: V3, p3: V3, u: number): V3 => {
  const m = 1 - u;
  const m2 = m * m;
  const m3 = m2 * m;
  const u2 = u * u;
  const u3 = u2 * u;
  return [
    m3 * p0[0] + 3 * m2 * u * p1[0] + 3 * m * u2 * p2[0] + u3 * p3[0],
    m3 * p0[1] + 3 * m2 * u * p1[1] + 3 * m * u2 * p2[1] + u3 * p3[1],
    m3 * p0[2] + 3 * m2 * u * p1[2] + 3 * m * u2 * p2[2] + u3 * p3[2],
  ];
};

const evalCubicTangent = (p0: V3, p1: V3, p2: V3, p3: V3, u: number): V3 => {
  const m = 1 - u;
  const dx =
    3 * m * m * (p1[0] - p0[0]) +
    6 * m * u * (p2[0] - p1[0]) +
    3 * u * u * (p3[0] - p2[0]);
  const dy =
    3 * m * m * (p1[1] - p0[1]) +
    6 * m * u * (p2[1] - p1[1]) +
    3 * u * u * (p3[1] - p2[1]);
  const dz =
    3 * m * m * (p1[2] - p0[2]) +
    6 * m * u * (p2[2] - p1[2]) +
    3 * u * u * (p3[2] - p2[2]);
  const len = Math.max(1e-5, Math.hypot(dx, dy, dz));
  return [dx / len, dy / len, dz / len];
};

const SOLDIER_UNIFORM_MAT = paint({
  color: '#b8a382',
  camo: ['#9c8767', '#cdb998', '#7d6e56'],
  camoScale: 4,
  repeat: 1.5,
  wear: 0.1,
  dirt: 0.2,
  roughness: 0.85,
  metalness: 0.05,
  seed: 185,
});
const SOLDIER_VEST_MAT = plain('#8c7858', 0.78, 0.08);
const SOLDIER_HELMET_MAT = plain('#7a6c55', 0.68, 0.12);
const SOLDIER_SKIN_MAT = plain('#c89d7c', 0.72, 0.02);
const SOLDIER_BOOT_MAT = plain('#4a3f33', 0.85, 0.06);
const BERM_PAD_MAT = paint({
  color: '#a89272',
  camo: ['#947f60', '#bca685'],
  camoScale: 3,
  repeat: 2.2,
  dirt: 0.3,
  wear: 0.15,
  roughness: 0.94,
  metalness: 0.04,
  seed: 189,
});

/** Mô hình người lính Mỹ đội mũ chống đạn & áo giáp chạy nhanh từ cửa nhà CHU vào hầm bê tông trú ẩn. */
const RunningSoldier: React.FC<{ pos: V3; heading: number; stridePhase: number }> = ({
  pos,
  heading,
  stridePhase,
}) => {
  const legSwing = Math.sin(stridePhase) * 0.68;
  const armSwing = -Math.sin(stridePhase) * 0.58;
  const bob = Math.abs(Math.cos(stridePhase)) * 0.07;

  return (
    <group position={[pos[0], pos[1] + bob, pos[2]]} rotation={[0, heading, 0]}>
      {/* Thân người hơi đổ về trước khi chạy nước rút (+X là hướng chạy) */}
      <group position={[0, 0.92, 0]} rotation={[0, 0, -0.22]}>
        {/* Thân áo & áo giáp chống mảnh */}
        <mesh geometry={rbox(0.26, 0.52, 0.36, 0.04)} material={SOLDIER_UNIFORM_MAT} castShadow />
        <mesh geometry={rbox(0.3, 0.4, 0.38, 0.04)} position={[0, 0.03, 0]} material={SOLDIER_VEST_MAT} castShadow />
        {/* Đầu & mũ Kevlar ACH */}
        <group position={[0.03, 0.39, 0]}>
          <mesh material={SOLDIER_SKIN_MAT} castShadow>
            <sphereGeometry args={[0.105, 14, 12]} />
          </mesh>
          <mesh position={[-0.01, 0.035, 0]} scale={[1.08, 0.88, 1.05]} material={SOLDIER_HELMET_MAT} castShadow>
            <sphereGeometry args={[0.125, 16, 12]} />
          </mesh>
        </group>
        {/* Hai tay đánh theo nhịp chạy */}
        <group position={[0, 0.19, 0.22]} rotation={[0, 0, armSwing]}>
          <mesh geometry={rbox(0.11, 0.46, 0.11, 0.03)} position={[0, -0.19, 0]} material={SOLDIER_UNIFORM_MAT} castShadow />
        </group>
        <group position={[0, 0.19, -0.22]} rotation={[0, 0, -armSwing]}>
          <mesh geometry={rbox(0.11, 0.46, 0.11, 0.03)} position={[0, -0.19, 0]} material={SOLDIER_UNIFORM_MAT} castShadow />
        </group>
      </group>
      {/* Hai chân sải bước chạy */}
      <group position={[0, 0.72, 0.1]} rotation={[0, 0, legSwing]}>
        <mesh geometry={rbox(0.14, 0.66, 0.14, 0.03)} position={[0, -0.32, 0]} material={SOLDIER_UNIFORM_MAT} castShadow />
        <mesh geometry={rbox(0.22, 0.12, 0.15, 0.03)} position={[0.04, -0.66, 0]} material={SOLDIER_BOOT_MAT} castShadow />
      </group>
      <group position={[0, 0.72, -0.1]} rotation={[0, 0, -legSwing]}>
        <mesh geometry={rbox(0.14, 0.66, 0.14, 0.03)} position={[0, -0.32, 0]} material={SOLDIER_UNIFORM_MAT} castShadow />
        <mesh geometry={rbox(0.22, 0.12, 0.15, 0.03)} position={[0.04, -0.66, 0]} material={SOLDIER_BOOT_MAT} castShadow />
      </group>
    </group>
  );
};

// Lộ trình 7 quân nhân chạy dồn dập từ cửa hai nhà CHU vào đúng cửa hầm bê tông trú ẩn
const BUNKER_RUNNERS: { start: V3; end: V3; tStart: number; tEnd: number; phase0: number }[] = [
  { start: [0.3, 0, -10.4], end: [-0.8, 0, -6.1], tStart: 359.3, tEnd: 361.4, phase0: 0.2 },
  { start: [-0.6, 0, -10.6], end: [-1.1, 0, -5.9], tStart: 359.8, tEnd: 362.1, phase0: 1.7 },
  { start: [-3.8, 0, -10.5], end: [-1.2, 0, -5.8], tStart: 360.1, tEnd: 362.8, phase0: 3.1 },
  { start: [0.6, 0, -10.7], end: [-0.9, 0, -6.0], tStart: 360.5, tEnd: 363.1, phase0: 0.9 },
  { start: [-2.2, 0, -10.8], end: [-0.7, 0, -6.05], tStart: 360.7, tEnd: 363.4, phase0: 4.2 },
  { start: [-5.6, 0, -10.6], end: [-1.0, 0, -5.85], tStart: 360.9, tEnd: 363.6, phase0: 2.4 },
  { start: [1.1, 0, -10.8], end: [-0.6, 0, -6.15], tStart: 361.2, tEnd: 363.7, phase0: 5.1 },
];

// 7 mảnh cánh tam giác & thân UAV cảm tử cháy đen lảo đảo rơi chậm do lực cản không khí sau cú đánh chặn ở 371.20s
const WRECKAGE_SHARDS: { vx: number; vy: number; vz: number; sx: number; sy: number; sz: number }[] = [
  { vx: -3.4, vy: 1.4, vz: 1.8, sx: 1.25, sy: 0.09, sz: 0.78 },
  { vx: 2.6, vy: 1.9, vz: -2.1, sx: 1.05, sy: 0.12, sz: 0.64 },
  { vx: -1.6, vy: 0.5, vz: -1.4, sx: 1.18, sy: 0.24, sz: 0.34 },
  { vx: 3.2, vy: 1.1, vz: 2.2, sx: 0.82, sy: 0.1, sz: 0.58 },
  { vx: -0.9, vy: 2.2, vz: 0.8, sx: 0.68, sy: 0.14, sz: 0.46 },
  { vx: 1.5, vy: 0.2, vz: -0.9, sx: 0.92, sy: 0.11, sz: 0.52 },
  { vx: -2.5, vy: -0.4, vz: 0.7, sx: 0.76, sy: 0.12, sz: 0.44 },
];
const WRECK_CHAR_MAT = plain('#282522', 0.86, 0.2);
const WRECK_SMOKE_MAT = plain('#6e665c', 0.96, 0.0, { transparent: true, opacity: 0.44 });

const S18: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ==================== NHỊP 1 (354.4 - 363.6s): XOAY NIGHTHAWK 180° & BÁO ĐỘNG HẦM TRÚ ẨN ====================
  // Xoay ngoắt đầu gimbal EO/IR 180° từ hướng Bắc (-X, yaw = PI) sang hướng Nam (+X, yaw = 0) lúc 357.36s
  const turnCamP = prog(t, CUE.s18_turn_cam - 0.22, CUE.s18_turn_cam + 1.05);
  const nightHawkYaw = lerp(Math.PI, 0, turnCamP);
  const nightHawkPitch = lerp(-0.04, 0.08, turnCamP);

  // Đèn chớp còi báo động đỏ rực trên cả tháp NightHawk lẫn cửa hầm bê tông ConcreteBunker
  const alarmOn = t >= CUE.s18_turn_cam + 0.45;
  const strobePulse = alarmOn
    ? 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin((t - CUE.s18_turn_cam) * 18.5), 2)
    : 0;

  // ==================== NHỊP 2 (363.8 - 373.8s): TỔ HỢP KURFS/LIDS PHÓNG COYOTE BLOCK II ====================
  const lidsSlewP = prog(t, 364.0, 365.8);
  const launcherYaw = lerp(0.18, YAW_FIRE, lidsSlewP);
  const launcherElev = lerp(0.38, ELEV_FIRE, lidsSlewP);
  // Nắp ống phóng số 1 mở sẵn rõ nét trước lúc khai hỏa CUE.s18_lids_fire (367.92s)
  const tubeOpen = prog(t, 364.6, 365.85);

  // Tọa độ miệng ống phóng số 1 và vector hướng bắn lấy trực tiếp từ helper chuẩn của MlidsCoyote.tsx
  const { muzzleWorld, launchDir, bezierPts, trailPoints } = useMemo(() => {
    const localMuzzle = getCoyoteMuzzlePos(YAW_FIRE, ELEV_FIRE);
    const mw: V3 = [
      LIDS_POS[0] + localMuzzle[0],
      LIDS_POS[1] + localMuzzle[1],
      LIDS_POS[2] + localMuzzle[2],
    ];
    const dir = getCoyoteLaunchDir(YAW_FIRE, ELEV_FIRE);
    const p0: V3 = mw;
    // Điểm điều khiển P1 nằm thẳng trên vector nòng phóng để đạn rời đúng trục miệng ống phóng
    const p1: V3 = [
      p0[0] + dir[0] * 21.0,
      p0[1] + dir[1] * 21.0,
      p0[2] + dir[2] * 21.0,
    ];
    const p2: V3 = [54.0, 22.8, 3.8];
    const p3: V3 = INTERCEPT_POS;
    const N = 128;
    const pts: V3[] = Array.from({ length: N }, (_, i) =>
      evalCubicBezier(p0, p1, p2, p3, i / (N - 1)),
    );
    return {
      muzzleWorld: mw,
      launchDir: dir,
      bezierPts: { p0, p1, p2, p3 },
      trailPoints: pts,
    };
  }, []);

  // Tiến độ bay của đạn phản lực Coyote Block II (367.92s -> 371.20s)
  const isCoyoteFlying = t >= CUE.s18_lids_fire && t < CUE.s18_intercept;
  const flightP = prog(t, CUE.s18_lids_fire, CUE.s18_intercept, (x) => Math.pow(x, 1.08));

  const coyoteCurvePos = evalCubicBezier(
    bezierPts.p0,
    bezierPts.p1,
    bezierPts.p2,
    bezierPts.p3,
    flightP,
  );
  const coyoteTangent = evalCubicTangent(
    bezierPts.p0,
    bezierPts.p1,
    bezierPts.p2,
    bezierPts.p3,
    flightP,
  );

  // Offset nhẹ lúc s=0 (+0.68m dọc trục phóng) để đuôi ống phụt (-0.725m) khớp khít tại miệng ống phóng
  const emergeShift = 0.68 * (1 - clamp01(flightP * 5));
  const coyotePos: V3 = [
    coyoteCurvePos[0] + launchDir[0] * emergeShift,
    coyoteCurvePos[1] + launchDir[1] * emergeShift,
    coyoteCurvePos[2] + launchDir[2] * emergeShift,
  ];
  const coyoteQuat = useMemo(() => new THREE.Quaternion(), []);
  coyoteQuat.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(...coyoteTangent).normalize(),
  );

  // Bung 4 cánh nâng chữ X ngay khi vừa thoát khỏi miệng ống phóng
  const finDeploy = prog(t, CUE.s18_lids_fire + 0.05, CUE.s18_lids_fire + 0.34);

  // Quỹ đạo Shahed-136 bay từ xa vào, bị tiêu diệt và ẩn hoàn toàn từ CUE.s18_intercept (371.20s)
  const showShahed = t >= 363.6 && t < CUE.s18_intercept;
  const shahedP = prog(t, 363.6, CUE.s18_intercept, (x) => x);
  const shahedPos = lerpV3(SHAHED_START_S18, INTERCEPT_POS, shahedP);
  const shahedAngles = useMemo(() => {
    const dx = INTERCEPT_POS[0] - SHAHED_START_S18[0];
    const dy = INTERCEPT_POS[1] - SHAHED_START_S18[1];
    const dz = INTERCEPT_POS[2] - SHAHED_START_S18[2];
    const len = Math.hypot(dx, dy, dz);
    return {
      yaw: Math.atan2(-(dz / len), dx / len),
      pitch: Math.asin(dy / len),
    };
  }, []);

  // Vệt khói sáng <Trail> lưu lại rõ nét dẫn vào điểm nổ rồi tan nhẹ dần sau đánh chặn
  const trailUpto = t < CUE.s18_lids_fire ? 0 : t >= CUE.s18_intercept ? 1 : flightP;
  const trailOpacity =
    t < CUE.s18_intercept ? 0.94 : lerp(0.94, 0.34, prog(t, CUE.s18_intercept, 373.8));

  // ==================== ĐƯỜNG MÁY QUAY 4 NHỊP (BÁM XIÊN BÊN HÔNG QUỸ ĐẠO, KHÔNG TRÙNG TRỤC TRAIL) ====================
  // Nhịp 1 (354.4..358.9s): Cận tiền cảnh đầu camera NightHawk xoay 180° sang hướng Nam + đèn còi chớp đỏ
  // Nhịp 2 (358.9..363.5s): Hạ & mở khung sang cửa hầm bê tông ConcreteBunker cạnh dãy CHU khi lính nhào vào hầm
  // Nhịp 3 (363.5..367.8s): Lia mượt sang gờ công sự vành đai nơi đặt tổ hợp KurfsRadarUnit (nhìn xiên từ bờ +Z)
  // Nhịp 4 (367.92..373.8s): Bám xiên bên hông quả đạn Coyote Block II (lệch ngang +Z ~12-16m) khóa trọn cả đạn, Trail cong & mục tiêu Shahed!
  const c1 = prog(t, 354.4, 358.9);
  const c2 = prog(t, 358.9, 363.0);
  const c3 = prog(t, 363.0, 364.95);
  const c3Push = prog(t, 364.95, 367.8);
  const cLaunch = prog(t, CUE.s18_lids_fire - 0.1, CUE.s18_lids_fire + 0.65);
  const cAfter = prog(t, CUE.s18_intercept, 373.8);

  let camPos: V3 = lerpV3([5.1, 5.45, 3.6], [5.5, 5.15, 2.7], c1);
  let camLook: V3 = lerpV3([-0.15, 5.45, -0.35], [-0.25, 5.25, -0.55], c1);

  camPos = lerpV3(camPos, [6.4, 3.35, -1.1], c2);
  camLook = lerpV3(camLook, [-1.6, 1.55, -7.1], c2);

  const lidsViewPos: V3 = lerpV3([14.55, 3.28, 3.05], [15.1, 3.18, 2.55], c3Push);
  const lidsViewLook: V3 = lerpV3([18.0, 2.55, -5.0], [18.15, 2.6, -5.0], c3Push);
  camPos = lerpV3(camPos, lidsViewPos, c3);
  camLook = lerpV3(camLook, lidsViewLook, c3);

  if (cLaunch > 0) {
    // Vị trí bám hông xiên (+Z lệch ra 11..16m, thấp hơn nhẹ để tôn nền trời sa mạc & đường cong Trail)
    const activeTarget = t < CUE.s18_intercept ? coyotePos : INTERCEPT_POS;
    const chasePos: V3 = [
      activeTarget[0] - lerp(7.5, 16.5, flightP),
      activeTarget[1] - lerp(1.2, 3.2, flightP),
      activeTarget[2] + lerp(9.8, 15.5, flightP),
    ];
    // Tâm nhìn đón nhẹ trước mũi đạn hướng về chiếc Shahed-136 để thấy rõ cả đạn Coyote, Trail lẫn mục tiêu
    const chaseLook: V3 = lerpV3(activeTarget, INTERCEPT_POS, 0.24);

    const postPos: V3 = [
      INTERCEPT_POS[0] - 25.5,
      INTERCEPT_POS[1] - 2.0,
      INTERCEPT_POS[2] + 22.5,
    ];
    const postLook: V3 = [
      INTERCEPT_POS[0] - 1.2,
      INTERCEPT_POS[1] + 0.6 * cAfter,
      INTERCEPT_POS[2],
    ];

    const trackPos = lerpV3(chasePos, postPos, cAfter);
    const trackLook = lerpV3(chaseLook, postLook, cAfter);

    camPos = lerpV3(camPos, trackPos, cLaunch);
    camLook = lerpV3(camLook, trackLook, cLaunch);
  }

  const dtIntercept = t - CUE.s18_intercept;
  const shockShake =
    dtIntercept > 0 && dtIntercept < 1.1 ? Math.exp(-dtIntercept * 3.5) * 0.16 : 0;
  const finalCamPos: V3 = [
    camPos[0] + Math.sin(t * 43) * shockShake,
    camPos[1] + Math.cos(t * 51) * shockShake,
    camPos[2],
  ];
  const fov = lerp(42, 39, cLaunch);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_RUKBAN_DAY} shadowArea={44} shadowCenter={[10, 2, -4]}>
        <Cam pos={finalCamPos} look={camLook} fov={fov} />

        {/* Địa hình sa mạc Rukban ban ngày nắng sắc nét */}
        <Terrain h={H_S18} size={560} seg={192} colors={TERRAIN_RUKBAN_DAY} grainRepeat={48} />
        <Scatter
          kind="rock"
          count={200}
          area={[-160, -160, 220, 150]}
          h={H_S18}
          seed={182}
          scale={[0.35, 1.25]}
          avoid={avoidBase}
          tint="#b39e80"
        />
        <Scatter
          kind="bush"
          count={65}
          area={[-140, -140, 200, 130]}
          h={H_S18}
          seed={183}
          scale={[0.4, 0.85]}
          avoid={avoidBase}
          tint="#9c8f6b"
        />

        {/* ==================== KHU NHÀ NGỦ CHU, THÁP NIGHTHAWK & HẦM BÊ TÔNG TRÚ ẨN ==================== */}
        <group position={[0, 0, 0]}>
          <NightHawkMast yaw={nightHawkYaw} pitch={nightHawkPitch} strobe={strobePulse} />
        </group>

        {/* Hầm bê tông chữ U đặt ngay cạnh dãy nhà ngủ CHU kèm đèn chớp báo động đỏ trên cửa hầm */}
        <group position={[-2.2, 0, -5.6]} rotation={[0, 0.34, 0]}>
          <ConcreteBunker strobe={strobePulse} />
        </group>

        {/* Ánh chớp đỏ báo động hắt lên khung thép tháp & vòm cửa hầm bê tông */}
        {strobePulse > 0.05 && (
          <>
            <pointLight
              position={[0.4, 4.5, 0.3]}
              color={PAL3D.alarmRed}
              intensity={22 * strobePulse}
              distance={9}
              decay={1.6}
            />
            <pointLight
              position={[-0.7, 2.1, -6.1]}
              color={PAL3D.alarmRed}
              intensity={24 * strobePulse}
              distance={8}
              decay={1.6}
            />
          </>
        )}

        {/* Dãy nhà ngủ ChuContainer đặt sát hầm bê tông trú ẩn */}
        <group position={[-1.4, 0, -12.0]}>
          <ChuContainer />
        </group>
        <group position={[-8.4, 0, -12.0]}>
          <ChuContainer />
        </group>
        <group position={[-5.0, 0, -15.2]}>
          <TWall count={12} />
        </group>
        <group position={[5.6, 0, -13.5]} rotation={[0, Math.PI / 2, 0]}>
          <HescoWall cells={5} />
        </group>

        {/* Các quân nhân nhanh chóng nhào từ cửa phòng ngủ CHU vào hầm bê tông khi báo động đỏ bật */}
        {BUNKER_RUNNERS.map((r, idx) => {
          if (t < r.tStart || t >= r.tEnd) return null;
          const rp = prog(t, r.tStart, r.tEnd, (x) => x);
          const pos = lerpV3(r.start, r.end, rp);
          const heading = Math.atan2(-(r.end[2] - r.start[2]), r.end[0] - r.start[0]);
          return (
            <RunningSoldier
              key={`runner_${idx}`}
              pos={pos}
              heading={heading}
              stridePhase={(t - r.tStart) * 17 + r.phase0}
            />
          );
        })}

        {/* ==================== GỜ CÔNG SỰ VÀNH ĐAI & TỔ HỢP PHÒNG KHÔNG LIDS / KURFS ==================== */}
        <mesh
          geometry={rbox(5.6, 0.14, 4.8, 0.04)}
          position={[LIDS_POS[0], LIDS_POS[1] - 0.05, LIDS_POS[2]]}
          material={BERM_PAD_MAT}
          receiveShadow
        />
        {/* Công sự rọ đất HESCO che sườn sau & sườn Bắc của bệ LIDS (không che góc máy nhìn xiên từ +Z) */}
        <group position={[LIDS_POS[0] - 0.3, LIDS_POS[1], LIDS_POS[2] - 2.9]}>
          <HescoWall cells={4} />
        </group>
        <group
          position={[LIDS_POS[0] - 3.1, LIDS_POS[1], LIDS_POS[2] - 0.6]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <HescoWall cells={3} />
        </group>

        <group position={LIDS_POS}>
          <KurfsRadarUnit
            launcherYaw={launcherYaw}
            launcherElev={launcherElev}
            radarActive={1}
            tubeOpen={tubeOpen}
          />
        </group>

        {/* Lửa & khói đầu ống phóng tại đúng tọa độ getCoyoteMuzzlePos(YAW_FIRE, ELEV_FIRE) */}
        <MuzzleBlast
          t={t}
          at={CUE.s18_lids_fire}
          pos={muzzleWorld}
          dir={launchDir}
          size={1.6}
          seed={18}
        />

        {/* Vệt khói sáng phản lực cong vút lên bầu trời sa mạc */}
        {trailUpto > 0.002 && (
          <Trail
            points={trailPoints}
            upto={trailUpto}
            color="#ffd27a"
            width={0.14}
            opacity={trailOpacity}
            glow
          />
        )}

        {/* Quả đạn đánh chặn phản lực Coyote Block II bung 4 cánh chữ X & bật luồng lửa đuôi */}
        {isCoyoteFlying && (
          <group position={coyotePos} quaternion={coyoteQuat}>
            <CoyoteBlock2
              finDeploy={finDeploy}
              flame={1}
              roll={(t - CUE.s18_lids_fire) * 2.4}
            />
          </group>
        )}

        {/* Mục tiêu UAV cảm tử Shahed-136 ở cự ly xa trên cao (ẩn hoàn toàn sau 371.20s) */}
        {showShahed && (
          <group position={shahedPos} rotation={[0, shahedAngles.yaw, 0]}>
            <group position={[0, -SHAHED_CENTER_Y, 0]}>
              <Shahed136 propSpin={t * 48} pitch={shahedAngles.pitch} bank={-0.06} />
            </group>
          </group>
        )}

        {/* Cú nổ đánh chặn trên không tiêu diệt gọn Shahed-136 lúc CUE.s18_intercept (371.20s) */}
        <Explosion
          t={t}
          at={CUE.s18_intercept}
          pos={INTERCEPT_POS}
          size={3.1}
          seed={28}
          smokeLife={4.6}
          smoke="#726a60"
        />

        {/* Mảnh xác cánh & thân UAV cảm tử cháy đen lảo đảo rơi chậm do lực cản không khí kèm vệt khói (371.20 - 373.80s) */}
        {dtIntercept > 0.08 && (
          <group position={INTERCEPT_POS}>
            {WRECKAGE_SHARDS.map((w, wi) => {
              const drag = (1 - Math.exp(-0.85 * dtIntercept)) / 0.85;
              const px = w.vx * drag;
              const py = w.vy * drag - 2.35 * dtIntercept;
              const pz = w.vz * drag;
              return (
                <React.Fragment key={`wrk_${wi}`}>
                  <group
                    position={[px, py, pz]}
                    rotation={[dtIntercept * (3.6 + wi * 0.7), dtIntercept * 4.8, dtIntercept * 2.9]}
                  >
                    <mesh geometry={rbox(w.sx, w.sy, w.sz, 0.02)} material={WRECK_CHAR_MAT} castShadow />
                  </group>
                  {/* 2 cụm khói mảnh lơ lửng phía trên mảnh vỡ đang rơi */}
                  {wi < 4 && (
                    <>
                      <mesh position={[px * 0.82, py * 0.8 + 0.55, pz * 0.82]} material={WRECK_SMOKE_MAT}>
                        <dodecahedronGeometry args={[0.38, 1]} />
                      </mesh>
                      <mesh position={[px * 0.62, py * 0.58 + 1.05, pz * 0.62]} material={WRECK_SMOKE_MAT}>
                        <dodecahedronGeometry args={[0.52, 1]} />
                      </mesh>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </group>
        )}
      </Stage>

      {/* Tối đa 1 <Label> trên màn hình tại mọi thời điểm */}
      <Label
        t={t}
        text="-60 GIÂY"
        x={240}
        y={128}
        from={CUE.s18_minus60}
        until={358.65}
        size={56}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="LIDS · COYOTE II"
        x={320}
        y={128}
        from={CUE.s18_lids_intro}
        until={369.8}
        size={52}
        bg={PAL2D.usLo}
        fg={PAL2D.paper}
      />
    </AbsoluteFill>
  );
};

export default S18;
