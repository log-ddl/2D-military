// C01S10 (56.32–70.10 s): Góc 10 — Heroic 3/4 Elevated Tactical Orbit Around APS-Equipped MBT
// (Radar 360° Dome Sweep → High-Angle ATGM Threat Lock → Hard-Kill Mid-Air Intercept Explosion).
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { handheld, useSize } from '@core/frame';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { DustTrail, Explosion, MuzzleBlast, softDot, Trail } from '@skill/military/3d/fx';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { CUE } from '../cues';
import { HUDLabel, STAGE_BATTLE, TERRAIN_STEPPE, THEME } from '../design';
import { APSRadarPod } from '../parts/APSRadarPod';
import { ATGM } from '../parts/ATGM';
import { MBT } from '../parts/MBT';

// -------------------- ĐỊA HÌNH THẢO NGUYÊN HOÀNG HÔN HÙNG TRÁNG (CẤP MODULE) --------------------
const TANK_SPEED = 2.8;
const getTankX = (t: number) => (t - CUE.c01_aps_intercept) * TANK_SPEED;

const STEPPE_BATTLE_H = heightField({
  seed: 107,
  amp: 6.2,
  scale: 125,
  add: (x, z) => {
    const roadMask = 1 - Math.exp(-((z / 11.5) ** 4));
    const northRidge = 14.5 * Math.exp(-(((z + 82) / 38) ** 2)) * (0.75 + 0.25 * Math.cos(x * 0.035));
    const southKnoll = 5.5 * Math.exp(-(((z - 68) / 32) ** 2)) * (0.7 + 0.3 * Math.sin(x * 0.045));
    return (northRidge + southKnoll) * roadMask;
  },
  flats: [
    [-28, 0, 14, 0],
    [-14, 0, 14, 0],
    [0, 0, 15, 0],
    [14, 0, 14, 0],
  ],
});

const AVOID_ROAD_CORRIDOR = (x: number, z: number) => Math.abs(z) < 10.5 && x > -46 && x < 28;

// -------------------- TOẠ ĐỘ VẬT LÝ QUỸ ĐẠO ĐỘT KÍCH NÓC & ĐÁNH CHẶN TRÊN KHÔNG --------------------
// Đường bay thẳng từ góc cao phía sau/sườn [-18, 16.8, -10] xuyên qua điểm đón đầu [-6.5, 8.2, -3.5]
// nối thẳng tới đúng nóc tháp pháo [0.9, 2.6, 0.7], nằm trọn vẹn trong khung hình 16:9!
const P_ATGM_START: V3 = [-18.0, 16.8, -10.0];
const P_INTERCEPT: V3 = [-6.5, 8.2, -3.5];
const POD_SCALE = 0.72;
const DOME_WORLD_RADIUS = 13.5;
const LEFT_POD_LOCAL: V3 = [-0.86, 2.38, -1.12];
const RIGHT_POD_LOCAL: V3 = [-0.86, 2.38, 1.12];
const ATGM_SCALE = 1.75;

const ATGM_VEL: V3 = [
  P_INTERCEPT[0] - P_ATGM_START[0],
  P_INTERCEPT[1] - P_ATGM_START[1],
  P_INTERCEPT[2] - P_ATGM_START[2],
];
const ATGM_VEL_LEN = Math.hypot(ATGM_VEL[0], ATGM_VEL[1], ATGM_VEL[2]);
const ATGM_DIR: V3 = [ATGM_VEL[0] / ATGM_VEL_LEN, ATGM_VEL[1] / ATGM_VEL_LEN, ATGM_VEL[2] / ATGM_VEL_LEN];
const ATGM_YAW = Math.atan2(-ATGM_VEL[2], ATGM_VEL[0]);
const ATGM_PITCH = Math.atan2(ATGM_VEL[1], Math.hypot(ATGM_VEL[0], ATGM_VEL[2]));

const ATGM_TRAIL_PTS: V3[] = Array.from({ length: 48 }, (_, i) => {
  const u = i / 47;
  const tailOffset = 0.56 * ATGM_SCALE;
  return [
    lerp(P_ATGM_START[0], P_INTERCEPT[0], u) - ATGM_DIR[0] * tailOffset,
    lerp(P_ATGM_START[1], P_INTERCEPT[1], u) - ATGM_DIR[1] * tailOffset,
    lerp(P_ATGM_START[2], P_INTERCEPT[2], u) - ATGM_DIR[2] * tailOffset,
  ];
});

// Vị trí miệng ống phóng APS bên sườn trái đúng khoảnh khắc khai hỏa CUE.c01_aps_fire (66.30 s)
const TANK_X_AT_FIRE = getTankX(CUE.c01_aps_fire);
const POD_GIMBAL_AT_FIRE: V3 = [
  TANK_X_AT_FIRE + LEFT_POD_LOCAL[0],
  LEFT_POD_LOCAL[1] + 0.43,
  LEFT_POD_LOCAL[2],
];
const RAW_FIRE_VEC: V3 = [
  P_INTERCEPT[0] - POD_GIMBAL_AT_FIRE[0],
  P_INTERCEPT[1] - POD_GIMBAL_AT_FIRE[1],
  P_INTERCEPT[2] - POD_GIMBAL_AT_FIRE[2],
];
const RAW_FIRE_LEN = Math.hypot(RAW_FIRE_VEC[0], RAW_FIRE_VEC[1], RAW_FIRE_VEC[2]);
const INTERCEPT_DIR: V3 = [
  RAW_FIRE_VEC[0] / RAW_FIRE_LEN,
  RAW_FIRE_VEC[1] / RAW_FIRE_LEN,
  RAW_FIRE_VEC[2] / RAW_FIRE_LEN,
];
const LAUNCH_MUZZLE_POS: V3 = [
  POD_GIMBAL_AT_FIRE[0] + INTERCEPT_DIR[0] * 0.32,
  POD_GIMBAL_AT_FIRE[1] + INTERCEPT_DIR[1] * 0.32,
  POD_GIMBAL_AT_FIRE[2] + INTERCEPT_DIR[2] * 0.32,
];

const INTERCEPTOR_TRAIL_PTS: V3[] = Array.from({ length: 36 }, (_, i) => {
  const u = i / 35;
  return [
    lerp(LAUNCH_MUZZLE_POS[0], P_INTERCEPT[0], u),
    lerp(LAUNCH_MUZZLE_POS[1], P_INTERCEPT[1], u),
    lerp(LAUNCH_MUZZLE_POS[2], P_INTERCEPT[2], u),
  ];
});

// Mảnh vỡ cháy sáng & vệt khói mảnh xác tên lửa rơi parabol sau cú nổ đánh chặn trên không
const INTERCEPT_EMBERS = Array.from({ length: 34 }, (_, i) => ({
  az: rnd(i * 19 + 7) * Math.PI * 2,
  el: (rnd(i * 23 + 11) - 0.25) * 1.25,
  speed: 2.8 + 5.8 * rnd(i * 31 + 5),
  size: 0.09 + 0.14 * rnd(i * 41 + 13),
  cyan: i % 3 === 0,
}));

const WRECKAGE_STREAMS = [
  { vx: 2.2, vy: 1.8, vz: 1.1, col: '#ff7a29' },
  { vx: -2.4, vy: 2.3, vz: -1.3, col: '#ffb74d' },
  { vx: 0.8, vy: 2.8, vz: -1.9, col: '#ff5722' },
] as const;

// -------------------- KHUNG KHÓA MỤC TIÊU 3D ĐỎ + TIA LASER BẮT DÍNH TÊN LỬA --------------------
const ThreatLockOverlay3D: React.FC<{
  t: number;
  radarOrigin: V3;
  targetPos: V3;
}> = ({ t, radarOrigin, targetPos }) => {
  const pulse = 0.75 + 0.25 * Math.sin((t - CUE.c01_threat_lock) * 18);
  const lockScale = lerp(1.85, 1.0, prog(t, CUE.c01_threat_lock, CUE.c01_threat_lock + 0.28, Easing.out(Easing.cubic)));

  const dx = targetPos[0] - radarOrigin[0];
  const dy = targetPos[1] - radarOrigin[1];
  const dz = targetPos[2] - radarOrigin[2];
  const len = Math.max(0.1, Math.hypot(dx, dy, dz));
  const mid: V3 = [radarOrigin[0] + dx * 0.5, radarOrigin[1] + dy * 0.5, radarOrigin[2] + dz * 0.5];
  const beamQuat = useMemo(() => new THREE.Quaternion(), []);
  beamQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));

  return (
    <group>
      {/* Tia laser khóa mục tiêu mảnh sắc nét từ radar AESA bắt dính quả ATGM */}
      <group position={mid} quaternion={beamQuat}>
        <mesh>
          <cylinderGeometry args={[0.026, 0.026, len, 8]} />
          <meshBasicMaterial color={THEME.threatRed} transparent opacity={0.86 * pulse} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.075, 0.055, len, 8]} />
          <meshBasicMaterial color="#ff5e3a" transparent opacity={0.26 * pulse} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>

      {/* Khung hình thoi đỏ 3D xoay khóa cứng quanh thân quả tên lửa ATGM */}
      <group position={targetPos} scale={lockScale}>
        <mesh rotation={[0, 0.42, Math.PI / 4 + (t - CUE.c01_threat_lock) * 1.1]}>
          <ringGeometry args={[1.26, 1.46, 4]} />
          <meshBasicMaterial
            color={THEME.threatRed}
            transparent
            opacity={0.96}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 4 - (t - CUE.c01_threat_lock) * 0.85]}>
          <ringGeometry args={[1.05, 1.2, 4]} />
          <meshBasicMaterial
            color={THEME.threatRed}
            transparent
            opacity={0.68 * pulse}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[(t - CUE.c01_threat_lock) * 1.3, (t - CUE.c01_threat_lock) * 1.7, 0]} scale={1.32}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ff6b57" wireframe transparent opacity={0.58 * pulse} toneMapped={false} depthWrite={false} />
        </mesh>
        <pointLight color={THEME.threatRed} intensity={5.5 * pulse} distance={7} decay={1.5} />
      </group>

      {/* Tâm điểm hẹn đón đầu (Predicted Intercept Reticle) nhấp nháy cyan tại [-6.5, 8.2, -3.5] */}
      <group position={P_INTERCEPT}>
        <mesh rotation={[0, 0.42, (t - CUE.c01_threat_lock) * -2.2]}>
          <ringGeometry args={[0.58, 0.72, 24]} />
          <meshBasicMaterial
            color={THEME.apsCyan}
            transparent
            opacity={0.78 * pulse}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};

// -------------------- SÓNG XUNG KÍCH LAM-VÀNG & ĐÁM MÂY MẢNH VỠ ĐÁNH CHẶN TRÊN KHÔNG --------------------
const HardKillShockwaveBurst: React.FC<{ t: number }> = ({ t }) => {
  const puffTex = useMemo(() => softDot(), []);
  const dt = t - CUE.c01_aps_intercept;
  if (dt < 0 || dt > 3.6) return null;

  const ringExpand = prog(t, CUE.c01_aps_intercept, CUE.c01_aps_intercept + 0.95, Easing.out(Easing.cubic));
  const ringFade = Math.max(0, 1 - dt / 1.15);
  const afterglowFade = Math.max(0, 1 - dt / 3.3);

  return (
    <group position={P_INTERCEPT}>
      {/* Vòng sóng xung kích đánh chặn lam-vàng nổ tung giữa không trung */}
      {ringFade > 0.01 && (
        <>
          <mesh rotation={[-Math.PI * 0.34, 0.25, 0]} scale={0.9 + ringExpand * 6.8}>
            <ringGeometry args={[0.88, 1.0, 48]} />
            <meshBasicMaterial
              color={THEME.apsCyan}
              transparent
              opacity={0.92 * ringFade}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI * 0.2, 0.38, 0]} scale={0.7 + ringExpand * 5.5}>
            <ringGeometry args={[0.86, 1.0, 48]} />
            <meshBasicMaterial
              color={THEME.amberGold}
              transparent
              opacity={0.85 * ringFade}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* Quầng khói đen-hổ phách & tàn lửa nóng đỏ lơ lửng ngay tại tâm nổ trên không [-6.5, 8.2, -3.5] suốt tới cuối cảnh */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + 0.4;
        const r = (0.35 + (i % 4) * 0.65) * (0.55 + Math.min(1.5, dt * 0.48));
        const y = ((i % 4) - 1.6) * 0.52 + Math.min(1.4, dt * 0.32);
        const sz = 2.2 + (i % 3) * 0.9 + dt * 0.55;
        const isEmberCore = i < 5 && dt < 3.1;
        const col = isEmberCore ? (dt < 1.2 ? '#ffb347' : '#e06324') : '#2e2926';
        const op = (isEmberCore ? 0.55 : 0.68) * afterglowFade;
        return (
          <sprite key={`air_${i}`} position={[Math.cos(a) * r, y, Math.sin(a) * r]} scale={[sz, sz, sz]}>
            <spriteMaterial
              map={puffTex}
              color={col}
              transparent
              opacity={op}
              toneMapped={!isEmberCore}
              depthWrite={false}
            />
          </sprite>
        );
      })}

      {/* 3 mảnh xác động cơ tên lửa cháy âm ỉ rơi tự do để lại vệt khói mảnh trên bầu trời */}
      {WRECKAGE_STREAMS.map((ws, wi) =>
        Array.from({ length: 8 }, (_, si) => {
          const sampleT = Math.max(0, dt - si * 0.14);
          const x = ws.vx * sampleT;
          const z = ws.vz * sampleT;
          const y = ws.vy * sampleT - 3.6 * sampleT * sampleT;
          if (P_INTERCEPT[1] + y < 0.8) return null;
          const isHead = si === 0;
          const sz = isHead ? 0.48 : 0.72 + si * 0.16;
          return (
            <sprite key={`ws_${wi}_${si}`} position={[x, y, z]} scale={[sz, sz, sz]}>
              <spriteMaterial
                map={puffTex}
                color={isHead ? ws.col : '#4d4540'}
                transparent
                opacity={(isHead ? 0.88 : 0.34 * (1 - si / 8)) * afterglowFade}
                toneMapped={!isHead}
                depthWrite={false}
              />
            </sprite>
          );
        }),
      )}

      {/* Mảnh văng tungsten & tàn lửa rực sáng */}
      {INTERCEPT_EMBERS.map((eb, idx) => {
        const vx = Math.cos(eb.el) * Math.cos(eb.az) * eb.speed;
        const vz = Math.cos(eb.el) * Math.sin(eb.az) * eb.speed;
        const vy = Math.sin(eb.el) * eb.speed + 1.5;
        const x = vx * dt;
        const z = vz * dt;
        const y = vy * dt - 4.2 * dt * dt;
        if (P_INTERCEPT[1] + y < 0.35) return null;
        const fade = Math.max(0, 1 - dt / 3.2);
        return (
          <mesh
            key={idx}
            position={[x, y, z]}
            rotation={[dt * 7 + idx, dt * 5, idx]}
            scale={[eb.size, eb.size * (eb.cyan ? 2.5 : 1.5), eb.size]}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={eb.cyan ? THEME.apsCyan : idx % 2 === 0 ? '#ffd166' : '#ff5e2b'}
              transparent
              opacity={fade}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// -------------------- COMPONENT CHÍNH C01S10 --------------------
const C01S10: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  const travel = (t - CUE.c01_survive_aps) * TANK_SPEED;
  const tankX = getTankX(t);
  const hullBob = Math.sin((t - CUE.c01_survive_aps) * 5.2) * 0.014;

  // Nhịp 1 (CUE.c01_aps_mount = 60.34 s): 2 tổ hợp APSRadarPod sáng đèn trạng thái & xoay gimbal kiểm tra sẵn sàng
  const mountActive = t >= CUE.c01_aps_mount;
  const mountSweepEnv = bump(t, CUE.c01_aps_mount, 1.55);
  const checkYaw = Math.sin((t - CUE.c01_aps_mount) * 4.2) * 0.52 * mountSweepEnv;
  const checkPitch = 0.24 + 0.28 * mountSweepEnv;

  // Nhịp 2 (CUE.c01_radar_sweep = 61.96 s): Vòm sóng radar quét 360° lam ngọc
  const scanPhase = t >= CUE.c01_radar_sweep ? (t - CUE.c01_radar_sweep) * 0.9 : 0;

  // Nhịp 3 (CUE.c01_threat_lock = 63.68 s → CUE.c01_aps_intercept = 67.18 s): Tên lửa đột kích nóc ATGM lao vào vòm radar & bị khóa đỏ
  const atgmEnterStart = CUE.c01_radar_360 + 0.38;
  const atgmVisible = t >= atgmEnterStart && t < CUE.c01_aps_intercept;
  const atgmFlightP = prog(t, atgmEnterStart, CUE.c01_aps_intercept, (x) => x);
  const atgmPos: V3 = [
    lerp(P_ATGM_START[0], P_INTERCEPT[0], atgmFlightP),
    lerp(P_ATGM_START[1], P_INTERCEPT[1], atgmFlightP),
    lerp(P_ATGM_START[2], P_INTERCEPT[2], atgmFlightP),
  ];
  const threatLocked = t >= CUE.c01_threat_lock && t < CUE.c01_aps_intercept;

  const leftPodWorld: V3 = [tankX + LEFT_POD_LOCAL[0], LEFT_POD_LOCAL[1], LEFT_POD_LOCAL[2]];
  const leftPodRotY = Math.PI / 2;

  const threatDx = atgmPos[0] - leftPodWorld[0];
  const threatDz = atgmPos[2] - leftPodWorld[2];
  const alertAngleLocal = threatLocked ? Math.atan2(-threatDz, threatDx) - leftPodRotY : undefined;

  const aimDx = P_INTERCEPT[0] - leftPodWorld[0];
  const aimDy = P_INTERCEPT[1] - (leftPodWorld[1] + 0.43);
  const aimDz = P_INTERCEPT[2] - leftPodWorld[2];
  const targetLocalYaw = Math.atan2(-aimDz, aimDx) - leftPodRotY;
  const targetLocalPitch = Math.atan2(aimDy, Math.hypot(aimDx, aimDz));

  const lockAimBlend = prog(t, CUE.c01_threat_lock, CUE.c01_threat_lock + 0.36, Easing.out(Easing.cubic));
  const postInterceptRelax = prog(t, CUE.c01_aps_intercept + 0.45, CUE.c01_aps_intercept + 1.6);
  const leftPodYaw = lerp(lerp(checkYaw, targetLocalYaw, lockAimBlend), 0.15, postInterceptRelax);
  const leftPodPitch = lerp(lerp(checkPitch, targetLocalPitch, lockAimBlend), 0.28, postInterceptRelax);

  const rightPodYaw = -checkYaw * 0.9;
  const rightPodPitch = checkPitch;

  // Nhịp 4 (CUE.c01_aps_fire = 66.30 s → CUE.c01_aps_intercept = 67.18 s): Khai hỏa đạn đánh chặn bay tới điểm hẹn [-6.5, 8.2, -3.5]
  const interceptorInFlight = t >= CUE.c01_aps_fire && t < CUE.c01_aps_intercept;
  const interceptShotP = prog(t, CUE.c01_aps_fire, CUE.c01_aps_intercept, (x) => x);
  const scaledDistNow = (interceptShotP * RAW_FIRE_LEN) / POD_SCALE;
  const podFireProgress = interceptorInFlight ? (-5 + Math.sqrt(25 + 28 * scaledDistNow)) / 14 : 0;

  const interceptorTrailOpacity =
    t < CUE.c01_aps_fire
      ? 0
      : t < CUE.c01_aps_intercept
        ? 0.96
        : Math.max(0, 0.85 * (1 - (t - CUE.c01_aps_intercept) / 1.5));

  const atgmTrailOpacity =
    t < atgmEnterStart
      ? 0
      : t < CUE.c01_aps_intercept
        ? 0.9
        : Math.max(0, 0.72 * (1 - (t - CUE.c01_aps_intercept) / 1.6));

  // -------------------- QUỸ ĐẠO CAMERA CHIẾN THUẬT 3/4 TRÊN CAO ÔM TRỌN VÒM RADAR & ĐIỂM NỔ TRÊN KHÔNG --------------------
  const earlyOrbit = prog(t, CUE.c01_survive_aps, CUE.c01_radar_sweep, Easing.inOut(Easing.sin));
  const expandToDome = prog(t, CUE.c01_radar_sweep - 0.15, CUE.c01_threat_lock + 0.35, Easing.inOut(Easing.cubic));
  const victoryFollow = prog(t, CUE.c01_aps_intercept, CUE.c01_end, Easing.inOut(Easing.sin));

  const orbitAz = lerp(lerp(0.56, 1.16, earlyOrbit), lerp(1.08, 0.96, victoryFollow), expandToDome);
  const orbitDist = lerp(lerp(10.8, 12.0, earlyOrbit), lerp(25.4, 26.2, victoryFollow), expandToDome);
  const camHeight = lerp(lerp(4.5, 5.2, earlyOrbit), lerp(7.4, 7.1, victoryFollow), expandToDome);

  const anchorX = lerp(tankX + 0.6, lerp(tankX - 3.2, tankX * 0.45 - 1.8, victoryFollow), expandToDome);
  const anchorY = lerp(1.75, lerp(6.1, 5.7, victoryFollow), expandToDome);
  const anchorZ = lerp(0.0, lerp(-2.2, -1.7, victoryFollow), expandToDome);

  const interceptShakeAmt =
    bump(t, CUE.c01_aps_fire, 0.25) * 0.04 +
    (t >= CUE.c01_aps_intercept ? Math.exp(-(t - CUE.c01_aps_intercept) * 2.6) * 0.24 : 0);
  const [sx, sy] = handheld(t * 14, interceptShakeAmt, 'c01s10_aps');

  const camPos: V3 = [
    tankX * (1 - expandToDome * 0.28) + Math.cos(orbitAz) * orbitDist + sx,
    camHeight + sy,
    Math.sin(orbitAz) * orbitDist,
  ];
  const camLook: V3 = [anchorX + sx * 0.3, anchorY + sy * 0.3, anchorZ];
  const camFov = lerp(42, 48, expandToDome);

  const leftTrackDustPath = (tb: number): V3 => [getTankX(tb) - 3.65, 0.08, -1.48];
  const rightTrackDustPath = (tb: number): V3 => [getTankX(tb) - 3.65, 0.08, 1.48];

  return (
    <AbsoluteFill>
      <Stage {...STAGE_BATTLE} width={W} height={H} shadowArea={34} shadowCenter={[tankX, 0, 0]}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        <Terrain h={STEPPE_BATTLE_H} size={420} seg={240} colors={TERRAIN_STEPPE} />
        <Scatter
          kind="pine"
          count={72}
          area={[-170, -180, 170, -22]}
          h={STEPPE_BATTLE_H}
          seed={23}
          scale={[0.85, 1.55]}
          tint="#a2987e"
        />
        <Scatter
          kind="broadleaf"
          count={28}
          area={[-150, 26, 150, 150]}
          h={STEPPE_BATTLE_H}
          seed={41}
          scale={[0.8, 1.35]}
          tint="#9c8d6e"
        />
        <Scatter
          kind="bush"
          count={110}
          area={[-120, -110, 120, 110]}
          h={STEPPE_BATTLE_H}
          seed={67}
          scale={[0.65, 1.3]}
          avoid={AVOID_ROAD_CORRIDOR}
          tint="#918764"
        />
        <Scatter
          kind="rock"
          count={64}
          area={[-110, -95, 110, 95]}
          h={STEPPE_BATTLE_H}
          seed={89}
          scale={[0.5, 1.25]}
          avoid={AVOID_ROAD_CORRIDOR}
          tint="#7d766d"
        />

        <DustTrail
          t={t}
          from={CUE.c01_survive_aps - 1.2}
          to={CUE.c01_end}
          path={leftTrackDustPath}
          rate={6}
          size={1.65}
          life={2.6}
        />
        <DustTrail
          t={t}
          from={CUE.c01_survive_aps - 1.2}
          to={CUE.c01_end}
          path={rightTrackDustPath}
          rate={6}
          size={1.65}
          life={2.6}
        />

        {/* ==================== XE TĂNG CHỦ LỰC NGUYÊN VẸN GẮN HỆ THỐNG PHÒNG VỆ CHỦ ĐỘNG APS ==================== */}
        <group position={[tankX, hullBob, 0]}>
          <MBT
            aps
            apsYaw={leftPodYaw * 0.6}
            travel={travel}
            turretYaw={0.04}
            gunPitch={0.035}
          />

          {/* Tổ hợp APSRadarPod sườn trái (-Z): vẽ vòm sóng radar 360° (bán kính 13.5 m) & khai hỏa đạn đánh chặn */}
          <APSRadarPod
            position={LEFT_POD_LOCAL}
            rotation={[0, leftPodRotY, 0]}
            scale={POD_SCALE}
            yaw={leftPodYaw}
            pitch={leftPodPitch}
            fireProgress={podFireProgress}
            scanPhase={scanPhase}
            scanRadius={DOME_WORLD_RADIUS / POD_SCALE}
            alertAngle={alertAngleLocal}
          />

          {/* Tổ hợp APSRadarPod sườn phải (+Z, phía camera) */}
          <APSRadarPod
            position={RIGHT_POD_LOCAL}
            rotation={[0, -Math.PI / 2, 0]}
            scale={POD_SCALE}
            yaw={rightPodYaw}
            pitch={rightPodPitch}
            fireProgress={0}
          />

          {mountActive && (
            <>
              <pointLight
                position={[LEFT_POD_LOCAL[0], LEFT_POD_LOCAL[1] + 0.45, LEFT_POD_LOCAL[2] - 0.35]}
                color={THEME.apsCyan}
                intensity={2.6 + mountSweepEnv * 4.5}
                distance={4.2}
                decay={1.6}
              />
              <pointLight
                position={[RIGHT_POD_LOCAL[0], RIGHT_POD_LOCAL[1] + 0.45, RIGHT_POD_LOCAL[2] + 0.35]}
                color={THEME.apsCyan}
                intensity={2.6 + mountSweepEnv * 4.5}
                distance={4.2}
                decay={1.6}
              />
            </>
          )}
        </group>

        {/* ==================== TÊN LỬA ĐỘT KÍCH NÓC ATGM LAO TỚI & BỊ KHÓA ĐỎ ==================== */}
        {atgmVisible && (
          <ATGM
            position={atgmPos}
            rotation={[0, ATGM_YAW, ATGM_PITCH]}
            mode="missile"
            finsOpen={1}
            thrust={1}
            scale={ATGM_SCALE}
          />
        )}
        {atgmTrailOpacity > 0.01 && (
          <Trail
            points={ATGM_TRAIL_PTS}
            upto={atgmFlightP}
            color="#ff5e2b"
            width={0.15}
            opacity={atgmTrailOpacity}
            glow
          />
        )}

        {threatLocked && (
          <ThreatLockOverlay3D
            t={t}
            radarOrigin={[leftPodWorld[0], leftPodWorld[1] + 0.35, leftPodWorld[2]]}
            targetPos={atgmPos}
          />
        )}

        {/* ==================== PHÓNG ĐẠN ĐÁNH CHẶN APS (66.30 S) & NỔ TUNG GIỮA KHÔNG TRUNG (67.18 S) ==================== */}
        {/* MuzzleBlast gọn sắc ngay miệng ống phóng trên tháp pháo để không tràn khói lên điểm hẹn trên không */}
        <MuzzleBlast
          t={t}
          at={CUE.c01_aps_fire}
          pos={LAUNCH_MUZZLE_POS}
          dir={INTERCEPT_DIR}
          size={0.55}
          seed={11}
        />

        {interceptorTrailOpacity > 0.01 && (
          <Trail
            points={INTERCEPTOR_TRAIL_PTS}
            upto={t >= CUE.c01_aps_intercept ? 1 : interceptShotP}
            color={THEME.apsCyan}
            width={0.13}
            opacity={interceptorTrailOpacity}
            glow
          />
        )}

        {/* Cầu lửa nổ tung quả tên lửa trên không đúng CUE.c01_aps_intercept (67.18 s) */}
        <Explosion
          t={t}
          at={CUE.c01_aps_intercept}
          pos={P_INTERCEPT}
          size={4.6}
          seed={14}
          smokeLife={5.6}
          smoke="#3a3430"
        />
        <HardKillShockwaveBurst t={t} />
      </Stage>

      <HUDLabel
        t={t}
        from={CUE.c01_radar_360}
        until={CUE.c01_aps_fire + 0.3}
        text="RADAR 360° · APS"
        sub="PHÁT HIỆN TRONG VÀI PHẦN NGHÌN GIÂY"
        accent={THEME.apsCyan}
        x={W * 0.25}
        y={SAFE * 2.1}
      />
    </AbsoluteFill>
  );
};

export default C01S10;
