import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, bump, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { Explosion, MuzzleBlast } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { IncendiaryCluster, ThermiteBomblet } from '../parts/Ordnance3D';
import { FactoryComplex, TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';
import { Type88Flak } from '../parts/Type88Flak';

const RELEASE_Y = 206.0;
const FACTORY_X = 14.5;
const FACTORY_Z = -2.0;

const TOKYO_FIRE_H = heightField({
  seed: 306,
  amp: 2.6,
  scale: 175,
  flats: [
    [FACTORY_X, FACTORY_Z, 175, 0],
    [180, 0, 160, 0],
  ],
});

const avoidCityAndYards = (x: number, z: number) => {
  // Chừa sân nhà máy chính, các trận địa pháo phòng không Type 88 và dãy nhà phố gỗ
  if (x > -68 && x < 84 && z > -64 && z < 60) return true;
  if (Math.abs(z - 52) < 7.5 || Math.abs(z + 52) < 7.5) return true;
  // Chừa các ô đặt nhà ngoại ô dọc hành lang thoát
  if (x > 130 && x < 280 && Math.abs(z + 44) < 20) return true;
  if (x > 130 && x < 280 && Math.abs(z - 50) < 20) return true;
  // Hành lang lượn chữ S rộng ±12.8 m (sải cánh B-25 ±10.3 m) để sát ngọn cây hai bên mà không xuyên tán cây
  if (x > 85 && x < 265) {
    const tApprox = 495.15 + (x + 12) / 26.8;
    const wp = Math.max(0, Math.min(1, (tApprox - 497.3) / 5.0)) * Math.PI * 1.55;
    const zPath = -2.5 + Math.sin(wp) * 13.5;
    if (Math.abs(z - zPath) < 12.8) return true;
  }
  return false;
};

type RowBlockItem = { x: number; z: number; rot: number; variant: number; igniteAt: number };

const TARGET_ROWHOUSES: RowBlockItem[] = [
  { x: 54, z: -28, rot: 0, variant: 0, igniteAt: 488.95 },
  { x: 54, z: 24, rot: 0, variant: 1, igniteAt: 489.25 },
  { x: -32, z: 32, rot: 0, variant: 2, igniteAt: 489.1 },
  { x: -36, z: -30, rot: 0, variant: 0, igniteAt: 489.45 },
  { x: 14, z: -46, rot: 0, variant: 2, igniteAt: 489.05 },
  { x: -16, z: 46, rot: 0, variant: 1, igniteAt: 489.35 },
  { x: 96, z: -38, rot: 0, variant: 1, igniteAt: 490.2 },
  { x: 94, z: 42, rot: 0, variant: 2, igniteAt: 490.5 },
  { x: -78, z: 34, rot: Math.PI / 2, variant: 0, igniteAt: 999 },
  { x: -82, z: -36, rot: 0, variant: 1, igniteAt: 999 },
  // Khu nhà ngoại ô dọc hành lang bổ nhào thoát khỏi thành phố (x = 140..280 m)
  { x: 148, z: -44, rot: 0, variant: 0, igniteAt: 999 },
  { x: 152, z: 50, rot: 0, variant: 2, igniteAt: 999 },
  { x: 208, z: -44, rot: 0, variant: 1, igniteAt: 999 },
  { x: 214, z: 50, rot: 0, variant: 0, igniteAt: 999 },
  { x: 266, z: -42, rot: 0, variant: 2, igniteAt: 999 },
  { x: 272, z: 48, rot: 0, variant: 1, igniteAt: 999 },
];

type BombletSpec = {
  clusterIdx: number;
  coreHero: boolean;
  offX: number;
  offY: number;
  offZ: number;
  maxSpread: number;
  spinRate: V3;
  igniteDelay: number;
};

const FREE_BOMBLETS: BombletSpec[] = Array.from({ length: 72 }, (_, i) => {
  // 26 thanh bom cháy cận ống kính luôn bám trong vùng trung tâm 0.6..2.5 m suốt quá trình rơi tới 488.8 s!
  const coreHero = i < 26;
  const ang = i * 2.39996;
  const rNorm = coreHero ? 0.25 + (i / 26) * 0.75 : 0.35 + rnd(i * 7 + 3) * 0.95;
  return {
    clusterIdx: i % 4,
    coreHero,
    offX: Math.cos(ang) * rNorm * (coreHero ? 1.15 : 1.35) + (coreHero ? 0.35 : 0),
    offY: (rnd(i * 13 + 2) - 0.52) * (coreHero ? 1.65 : 3.8),
    offZ: Math.sin(ang) * rNorm * (coreHero ? 1.15 : 1.35),
    maxSpread: coreHero ? 1.55 + rnd(i * 17) * 0.85 : 4.5 + rnd(i * 19) * 9.5,
    spinRate: [
      (rnd(i * 23) - 0.5) * 3.2,
      (rnd(i * 29) - 0.5) * 2.8,
      (rnd(i * 31) - 0.5) * 2.4,
    ],
    igniteDelay: 0.12 + rnd(i * 37) * 1.15,
  };
});

type FlakBurstSpec = { at: number; pos: V3; size: number; seed: number };

const FLAK_BURSTS: FlakBurstSpec[] = [
  // Đợt 1 (495.0–497.2 s): Nở dày đặc trên bầu trời phía trên nhà máy & đón đầu đường bổ nhào của B-25
  { at: 495.02, pos: [12, 24, -2], size: 2.9, seed: 11 },
  { at: 495.22, pos: [22, 22, 6], size: 3.1, seed: 17 },
  { at: 495.46, pos: [34, 28, -6], size: 3.1, seed: 23 },
  { at: 495.74, pos: [17, 29, 5], size: 2.8, seed: 29 },
  { at: 496.05, pos: [40, 23, 2], size: 3.2, seed: 37 },
  { at: 496.32, pos: [26, 27, -9], size: 3.0, seed: 43 },
  { at: 496.58, pos: [20, 21, 9], size: 2.9, seed: 53 },
  { at: 496.65, pos: [35, 25, 3], size: 3.1, seed: 59 },
  // Đợt 2 (497.3–502.1 s): Nổ đuổi dọc hành lang bổ nhào tầm ngọn cây của chiếc B-25 Doolittle
  { at: 497.45, pos: [68, 25, -4], size: 3.2, seed: 61 },
  { at: 498.18, pos: [92, 22, 10], size: 3.3, seed: 71 },
  { at: 498.95, pos: [118, 24, -9], size: 3.4, seed: 79 },
  { at: 499.75, pos: [148, 21, 13], size: 3.3, seed: 89 },
  { at: 500.45, pos: [176, 23, -10], size: 3.4, seed: 97 },
  { at: 501.05, pos: [196, 21, 11], size: 3.3, seed: 103 },
  { at: 501.48, pos: [215, 24, -14], size: 3.5, seed: 109 },
  { at: 501.74, pos: [188, 19.5, -5], size: 3.1, seed: 113 },
  { at: 501.95, pos: [232, 22, 6], size: 3.4, seed: 127 },
];

/** Cụm cầu khói pháo phòng không 75mm đen đặc (#22201e / #2a2826) có chớp nổ cam mảnh đạn bên trong */
const FlakBlackCloud: React.FC<{ t: number; at: number; pos: V3; size: number; seed: number }> = ({
  t,
  at,
  pos,
  size,
  seed,
}) => {
  const dt = t - at;
  if (dt < 0 || dt > 11.0) return null;

  const expand = 1 - Math.pow(1 - Math.min(1, dt / 0.38), 3);
  const fade = dt < 7.0 ? 1 : Math.max(0, 1 - (dt - 7.0) / 4.0);
  const flash = Math.max(0, 1 - dt / 0.24);

  const puffs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2 + rnd(seed * 13 + k) * 0.65;
        const elev = (rnd(seed * 17 + k) - 0.45) * 1.05;
        const r = (0.3 + rnd(seed * 19 + k) * 0.52) * size;
        const rad = (0.44 + rnd(seed * 23 + k) * 0.34) * size;
        const shade = k % 3 === 0 ? '#1d1b1a' : k % 3 === 1 ? '#262422' : '#2e2b29';
        return {
          dir: [Math.cos(a) * r, elev * size * 0.6, Math.sin(a) * r] as V3,
          rad,
          shade,
        };
      }),
    [seed, size],
  );

  return (
    <group position={[pos[0] + dt * 0.35, pos[1] + dt * 0.22, pos[2]]}>
      {flash > 0 && (
        <>
          <pointLight color="#ff8e2b" intensity={32 * size * flash} distance={size * 10} decay={1.8} />
          <mesh scale={size * (0.42 + expand * 0.52)}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial color={dt < 0.09 ? '#fff2c2' : '#ff7d1e'} transparent opacity={flash * 0.95} toneMapped={false} />
          </mesh>
        </>
      )}
      {puffs.map((pf, idx) => (
        <mesh
          key={idx}
          position={[pf.dir[0] * expand, pf.dir[1] * expand, pf.dir[2] * expand]}
          scale={pf.rad * (0.45 + expand * 0.68) * (0.86 + 0.14 * fade)}
        >
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial
            color={pf.shade}
            roughness={0.97}
            metalness={0.02}
            transparent={fade < 0.98}
            opacity={0.94 * fade}
          />
        </mesh>
      ))}
    </group>
  );
};

/** Cột bão lửa magnesium-thermite 4.000°F rực sáng với cột khói đen bốc nghiêng về phía sau (-Z) không che mờ ống kính */
const ToweringFirePlume: React.FC<{
  t: number;
  at: number;
  pos: V3;
  height?: number;
  width?: number;
  seed?: number;
  withLight?: boolean;
}> = ({ t, at, pos, height = 15, width = 4.2, seed = 1, withLight = false }) => {
  const dt = t - at;
  if (dt < 0) return null;
  const grow = 1 - Math.pow(1 - Math.min(1, dt / 0.75), 3);
  const pulse = 0.9 + 0.13 * Math.sin(t * 10.2 + seed * 2.1) + 0.08 * Math.cos(t * 15.1 + seed);

  return (
    <group position={pos}>
      {withLight && (
        <pointLight
          position={[0, height * 0.42 * grow, 2]}
          color="#ff8124"
          intensity={68 * grow * pulse}
          distance={75}
          decay={1.55}
        />
      )}
      {/* Lõi trắng-vàng 4.000°F cực sáng kích hoạt bloom 0.85 */}
      <mesh position={[0, height * 0.14 * grow, 0]} scale={[width * 0.56 * grow, height * 0.3 * grow * pulse, width * 0.56 * grow]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={PAINT.thermiteHot} toneMapped={false} />
      </mesh>
      {/* Lưỡi lửa cam-vàng tầng giữa */}
      <mesh
        position={[Math.sin(t * 4.5 + seed) * 0.45, height * 0.36 * grow, Math.cos(t * 3.9 + seed) * 0.35]}
        scale={[width * 0.78 * grow, height * 0.52 * grow * pulse, width * 0.78 * grow]}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ff9828" transparent opacity={0.92} toneMapped={false} />
      </mesh>
      {/* Ngọn lửa đỏ-cam bốc vọt lên cao */}
      <mesh
        position={[Math.cos(t * 3.8 + seed) * 0.65, height * 0.6 * grow, -0.4 - Math.sin(t * 4.2 + seed) * 0.35]}
        scale={[width * 0.6 * grow, height * 0.48 * grow * pulse, width * 0.6 * grow]}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ff4a12" transparent opacity={0.82} toneMapped={false} />
      </mesh>
      {/* Khói đen cuồn cuộn bay chếch ra phía sau (-Z, +X) để phơi bày rõ mái răng cưa & ống khói nhà máy */}
      {[0, 1, 2, 3, 4].map((k) => {
        const cycle = ((dt * 0.45 + k * 0.2) % 1) * grow;
        const sy = height * (0.68 + cycle * 1.45);
        const sr = width * (0.6 + cycle * 0.85);
        const op = Math.sin(cycle * Math.PI) * 0.78;
        if (op <= 0.02) return null;
        return (
          <mesh
            key={k}
            position={[
              Math.sin(seed + k * 1.9) * width * 0.3 + cycle * 3.2,
              sy,
              -cycle * 4.5 + Math.cos(seed + k * 2.3) * width * 0.25,
            ]}
            scale={sr}
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#23201e" roughness={0.96} transparent opacity={op} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Quỹ đạo B-25 Doolittle bổ nhào xuyên dưới lưới flak đen xuống sát ngọn cây (y ≈ 13.4 m) & lượn chữ S thoát thân */
function evalEscapeB25Pos(time: number): V3 {
  const dt = Math.max(0, time - 495.15);
  const x = -12 + dt * 26.8;
  const pDive = prog(time, 495.25, 498.85);
  const y = lerp(33.5, 13.4, pDive) + Math.sin((time - 498.85) * 2.0) * 0.3 * prog(time, 498.85, 500.2);
  const wPhase = prog(time, 497.3, 502.3, (u) => u) * Math.PI * 1.55;
  const z = -2.5 + Math.sin(wPhase) * 13.5;
  return [x, y, z];
}

const C03S06: React.FC = () => {
  const t = useT();

  const groundMats = useMemo(
    () => ({
      yardConcrete: paint({
        color: '#757067',
        camo: ['#666159', '#847e74'],
        repeat: 4,
        wear: 0.26,
        dirt: 0.38,
        roughness: 0.9,
        metalness: 0.05,
        seed: 63,
      }),
      roadAsphalt: plain('#3f413f', 0.94, 0.04),
      shackleSteel: plain('#3c4247', 0.48, 0.68),
      flameStreak: new THREE.MeshBasicMaterial({
        color: '#ffb042',
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      }),
    }),
    [],
  );

  // ==================== 1. B-25 MỞ KHOANG BOM & 4 CHÙM INCENDIARY CLUSTER RƠI ĐỒNG TỐC ====================
  const highPlaneX = -11.5 + (t - CUE.c03_s06_bomb_release) * 24.0;
  const dtFall = Math.max(0, t - CUE.c03_s06_bomb_release);
  const pFall = Math.min(1, dtFall / (CUE.c03_s06_punch_roofs_ignite - CUE.c03_s06_bomb_release));
  const fallFrac = 0.24 * pFall + 0.76 * pFall * pFall;

  const clusterCenterX =
    t <= CUE.c03_s06_bomb_release
      ? highPlaneX + 1.45
      : -11.5 + 1.45 + (24.0 / 0.98) * (1 - Math.exp(-0.98 * dtFall));
  const clusterCenterY = t <= CUE.c03_s06_bomb_release ? RELEASE_Y + 1.18 : lerp(RELEASE_Y + 1.18, 9.2, fallFrac);
  const clusterPitch = -lerp(0, 1.38, prog(t, CUE.c03_s06_bomb_release, 479.3));

  const clusterOpen = prog(t, CUE.c03_s06_clusters_burst, 481.2);
  const pSpread = prog(t, CUE.c03_s06_bomb_release, 481.5);

  const clusterOffsets: V3[] = [
    [lerp(0.68, 0.96, pSpread), lerp(-0.04, 0.28, pSpread), lerp(0.25, 0.78, pSpread)],
    [lerp(0.68, 0.86, pSpread), lerp(0.07, -0.24, pSpread), lerp(-0.25, -0.82, pSpread)],
    [lerp(-0.68, -0.9, pSpread), lerp(0.07, 0.36, pSpread), lerp(0.25, 0.72, pSpread)],
    [lerp(-0.68, -0.98, pSpread), lerp(-0.04, -0.3, pSpread), lerp(-0.25, -0.76, pSpread)],
  ];

  const showFallingOrdnance = t < CUE.c03_s06_punch_roofs_ignite + 0.32;
  const dtBurst = Math.max(0, t - CUE.c03_s06_clusters_burst);
  // Nhóm coreHero bung nhanh ra cự ly 1.2–2.2 m trước ống kính rồi giữ đội hình mưa lửa dày đặc suốt đường rơi!
  const pCoreSpread = 1 - Math.exp(-dtBurst * 0.72);
  const pCarpetSpread = prog(t, CUE.c03_s06_clusters_burst, CUE.c03_s06_punch_roofs_ignite, (u) => 1 - Math.pow(1 - u, 1.75));
  const factoryDamage = prog(t, CUE.c03_s06_punch_roofs_ignite, 490.8) * 0.85;

  // ==================== 2. B-25 DOOLITTLE BỔ NHÀO SÁT NGỌN CÂY & NGHIÊNG CÁNH LƯỢN THOÁT ====================
  const showEscapeB25 = t >= 495.1;
  const escPos = evalEscapeB25Pos(t);
  const escPrev = evalEscapeB25Pos(t - 0.04);
  const escNext = evalEscapeB25Pos(t + 0.04);
  const vx = (escNext[0] - escPrev[0]) / 0.08;
  const vy = (escNext[1] - escPrev[1]) / 0.08;
  const vz = (escNext[2] - escPrev[2]) / 0.08;
  const escYaw = Math.atan2(-vz, Math.max(0.1, vx));
  const escPitch = Math.atan2(vy, Math.hypot(vx, vz));
  const escNext2 = evalEscapeB25Pos(t + 0.14);
  const vz2 = (escNext2[2] - escPos[2]) / 0.14;
  const escBank = Math.max(-0.54, Math.min(0.54, ((vz2 - vz) / 0.1) * 0.028));

  // ==================== 3. KHẨU ĐỘI PHÁO PHÒNG KHÔNG TYPE 88 75MM (ĐẶT TIỀN CẢNH PHẢI HƯỚNG NÒNG VỀ -Z/+X) ====================
  const flakBatteries = [
    // Khẩu đội #1 ở tiền cảnh phải [20.5, 0.08, 31.5]: tách hẳn sang phải để khói đầu nòng không che chiếc B-25 đang bổ nhào ở giữa trời!
    { pos: [20.5, 0.08, 31.5] as V3, baseYaw: 1.32, yawSweep: -0.58, elev: 0.96, shots: [494.35, 495.22, 496.65, 497.85, 499.2] },
    { pos: [32.0, 0.08, 24.5] as V3, baseYaw: 1.42, yawSweep: -0.62, elev: 1.02, shots: [494.8, 495.72, 496.56, 497.95, 499.5] },
    { pos: [-18.0, 0.08, -34.0] as V3, baseYaw: -0.78, yawSweep: 0.42, elev: 1.12, shots: [495.08, 496.15, 497.45, 498.8] },
  ];

  // ==================== 4. QUỸ ĐẠO CAMERA QUA 3 GIAI ĐOẠN ====================
  // Giai đoạn 1: Đặt ngay dưới họng khoang bom mở (z = +0.72, nằm giữa 2 cánh cửa khoang bom để thấy trọn cả 4 chùm bom!)
  // Sau khi cắt bom lúc 476.60 s -> vòng mượt lên vị trí rơi đồng tốc ở cự ly đúng ~3.20 m [-1.50, +2.38, +1.52]!
  const pSwingAbove = prog(t, CUE.c03_s06_bomb_release + 0.02, 479.1);
  const freefallShake = t > CUE.c03_s06_bomb_release && t < 488.8 ? 0.042 : 0;
  const jx = Math.sin(t * 21.3) * freefallShake;
  const jy = Math.cos(t * 18.7) * freefallShake;

  const dropCamPos: V3 = [
    clusterCenterX + lerp(-2.25, -1.5, pSwingAbove) + jx,
    clusterCenterY + lerp(-1.52, 2.38, pSwingAbove) + jy,
    lerp(0.72, 1.52, pSwingAbove),
  ];
  const dropCamLook: V3 = [
    clusterCenterX + lerp(0.52, 0.38, pSwingAbove),
    clusterCenterY + lerp(0.18, -1.65, pSwingAbove),
    lerp(-0.08, -0.22, pSwingAbove),
  ];

  // Giai đoạn 2: Hãm ở tầm trên mái xưởng (y = 32 m), rồi hạ xuống y = 9.4 m nhìn vượt qua tường nhà máy thấy trọn mái răng cưa cháy bên trái, 2 khẩu Type 88 khai hoả bên phải và B-25 bổ nhào giữa trời flak đen!
  const pBrakeRoof = prog(t, 487.3, 489.7);
  const pFlakTilt = prog(t, 493.65, 496.25);
  const roofCamPos: V3 = [
    lerp(-23.0, 2.0, pFlakTilt),
    lerp(32.0, 9.4, pFlakTilt),
    lerp(46.0, 55.0, pFlakTilt),
  ];
  const roofCamLook: V3 = [
    lerp(15.5, 20.5, pFlakTilt),
    lerp(10.5, 11.8, pFlakTilt),
    lerp(-2.0, 3.0, pFlakTilt),
  ];

  const act12Pos: V3 = [
    lerp(dropCamPos[0], roofCamPos[0], pBrakeRoof),
    lerp(dropCamPos[1], roofCamPos[1], pBrakeRoof),
    lerp(dropCamPos[2], roofCamPos[2], pBrakeRoof),
  ];
  const act12Look: V3 = [
    lerp(dropCamLook[0], roofCamLook[0], pBrakeRoof),
    lerp(dropCamLook[1], roofCamLook[1], pBrakeRoof),
    lerp(dropCamLook[2], roofCamLook[2], pBrakeRoof),
  ];

  // Giai đoạn 3: Bám cận tốc độ cao (cự ly ~19 m) theo cú bổ nhào sát ngọn cây & nghiêng cánh lượn thoát dưới mây flak đen
  const pChase = prog(t, 497.25, 499.95);
  const chaseCamPos: V3 = [escPos[0] - 16.8, escPos[1] + 3.6, escPos[2] + 9.4];
  const chaseCamLook: V3 = [escPos[0] + 5.5, escPos[1] + 0.6, escPos[2] - 2.0];

  const impactShake = bump(t, CUE.c03_s06_punch_roofs_ignite, 0.7) * 0.38;

  const camPos: V3 = [
    lerp(act12Pos[0], chaseCamPos[0], pChase),
    lerp(act12Pos[1], chaseCamPos[1], pChase) + Math.sin(t * 34) * impactShake,
    lerp(act12Pos[2], chaseCamPos[2], pChase) + Math.cos(t * 29) * impactShake,
  ];
  const camLook: V3 = [
    lerp(act12Look[0], chaseCamLook[0], pChase),
    lerp(act12Look[1], chaseCamLook[1], pChase),
    lerp(act12Look[2], chaseCamLook[2], pChase),
  ];
  const camFov = lerp(lerp(43, 45, pBrakeRoof), 42, pChase);
  const camRoll = lerp(0, escBank * 0.25, pChase);

  const shadowCenterX = lerp(FACTORY_X, escPos[0] - 4, pChase);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        {...STAGE_PRESETS.tokyoFire}
        shadowArea={102}
        shadowCenter={[shadowCenterX, 10, 0]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* ==================== ĐỊA HÌNH KHU CÔNG NGHIỆP BẮC TOKYO & RỪNG CÂY NGOẠI Ô ==================== */}
        <Terrain
          h={TOKYO_FIRE_H}
          size={1250}
          seg={175}
          center={[95, 0]}
          colors={TERRAIN_PALETTE.tokyoUrban}
          grainRepeat={48}
        />

        {/* Nền sân bê tông quân xưởng & mạng lưới đường phố */}
        <mesh position={[12, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} material={groundMats.yardConcrete} receiveShadow>
          <planeGeometry args={[144, 110]} />
        </mesh>
        {[-52, 52].map((rz, idx) => (
          <mesh key={`rdx-${idx}`} position={[105, 0.09, rz]} rotation={[-Math.PI / 2, 0, 0]} material={groundMats.roadAsphalt} receiveShadow>
            <planeGeometry args={[840, 9.5]} />
          </mesh>
        ))}
        {[-58, 76, 178, 252].map((rx, idx) => (
          <mesh key={`rdz-${idx}`} position={[rx, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={groundMats.roadAsphalt} receiveShadow>
            <planeGeometry args={[9.0, 340]} />
          </mesh>
        ))}

        {/* ==================== CỤM NHÀ XƯỞNG VŨ KHÍ & DÃY NHÀ GỖ BỐC CHÁY ==================== */}
        <group position={[FACTORY_X, 0, FACTORY_Z]} rotation={[0, 0.22, 0]}>
          <FactoryComplex variant={0} damage={factoryDamage} />
        </group>
        <group position={[-42, 0, -24]} rotation={[0, -0.52, 0]} scale={0.76}>
          <FactoryComplex variant={1} damage={factoryDamage * 0.85} />
        </group>
        {/* Phân xưởng xa phía chân trời hành lang thoát để tạo chiều sâu đô thị */}
        <group position={[285, 0, -18]} rotation={[0, 0.65, 0]} scale={0.82}>
          <FactoryComplex variant={1} damage={0} />
        </group>

        {TARGET_ROWHOUSES.map((rb, idx) => (
          <group key={`trb-${idx}`} position={[rb.x, 0, rb.z]} rotation={[0, rb.rot, 0]}>
            <TokyoRowhouseBlock variant={rb.variant} burning={t >= rb.igniteAt} />
          </group>
        ))}

        {/* Rừng cây thông & cây tán rộng cao 8–12 m để B-25 bổ nhào lướt sát ngọn cây (y = 13.0 m) */}
        <Scatter
          kind="pine"
          count={230}
          area={[-110, -165, 325, 165]}
          h={TOKYO_FIRE_H}
          seed={66}
          scale={[1.1, 1.65]}
          avoid={avoidCityAndYards}
        />
        <Scatter
          kind="broadleaf"
          count={165}
          area={[-95, -155, 320, 155]}
          h={TOKYO_FIRE_H}
          seed={79}
          scale={[1.0, 1.5]}
          avoid={avoidCityAndYards}
        />

        {/* ==================== CHIẾC B-25 #1 MỞ TOANG KHOANG BOM TRÊN CAO (475.66–484.5 s) ==================== */}
        {t < 485.0 && (
          <group position={[highPlaneX, RELEASE_Y, 0]}>
            <B25Mitchell gear={0} bombBay={1} propFast propSpin={t * 44} broomsticks seed={1} />
            <pointLight position={[1.45, 1.55, 0]} color="#ffdca8" intensity={3.2} distance={5.5} decay={2} />
            {[
              [2.13, 1.44, 0.25],
              [2.13, 1.52, -0.25],
              [0.77, 1.52, 0.25],
              [0.77, 1.44, -0.25],
            ].map(([sx, sy, sz], idx) => (
              <mesh key={`shk-${idx}`} position={[sx, sy, sz]} geometry={rbox(0.26, 0.22, 0.045, 0.008)} material={groundMats.shackleSteel} />
            ))}
          </group>
        )}

        {/* ==================== 4 CHÙM INCENDIARY CLUSTER RƠI & BUNG 512 THANH THERMITE 4.000°F ==================== */}
        {showFallingOrdnance && (
          <group position={[clusterCenterX, clusterCenterY, 0]}>
            {t >= CUE.c03_s06_clusters_burst && (
              <pointLight
                position={[0.3, -0.3, 0]}
                color="#ff8c2b"
                intensity={28 * prog(t, CUE.c03_s06_clusters_burst, 482.2)}
                distance={30}
                decay={1.7}
              />
            )}

            {/* 4 chùm bom cháy 500-lb AN-M17 bung 3 đai thép tại 479.74 s */}
            {clusterOffsets.map((off, idx) => {
              const emptyDrift = prog(t, 483.0, 488.2);
              const cx = off[0] - emptyDrift * (0.45 + idx * 0.2);
              const cy = off[1] + emptyDrift * 0.65;
              const cz = off[2] * (1 + emptyDrift * 0.9);
              return (
                <group
                  key={`cl-${idx}`}
                  position={[cx, cy, cz]}
                  rotation={[(idx - 1.5) * 0.12 * pSpread, (idx % 2 === 0 ? 1 : -1) * 0.08 * pSpread, clusterPitch]}
                >
                  <IncendiaryCluster open={clusterOpen} ignited={t >= CUE.c03_s06_clusters_burst + 0.18} />
                </group>
              );
            })}

            {clusterOffsets.map((off, idx) => (
              <Explosion
                key={`bflash-${idx}`}
                t={t}
                at={CUE.c03_s06_clusters_burst + idx * 0.05}
                pos={off}
                size={0.5}
                smokeLife={1.0}
                smoke="#6a6258"
                seed={20 + idx}
              />
            ))}

            {/* Đám mây 72 thanh bom cháy lục giác ThermiteBomblet rực sáng trắng-cam 4.000°F */}
            {t >= CUE.c03_s06_clusters_burst &&
              FREE_BOMBLETS.map((bm, i) => {
                const origin = clusterOffsets[bm.clusterIdx];
                const spreadP = bm.coreHero ? pCoreSpread : pCarpetSpread;
                const dist = spreadP * bm.maxSpread;
                const sway = bm.coreHero ? Math.sin(dtBurst * 2.2 + i) * 0.14 : 0;
                const bx = origin[0] + bm.offX * dist + sway;
                const by = origin[1] + bm.offY * (bm.coreHero ? pCoreSpread : pCarpetSpread) - (bm.coreHero ? 0.25 : 1.8 * pCarpetSpread);
                const bz = origin[2] + bm.offZ * dist;
                const isIgnited = t >= CUE.c03_s06_clusters_burst + bm.igniteDelay;

                return (
                  <group
                    key={`tb-${i}`}
                    position={[bx, by, bz]}
                    rotation={[
                      dtBurst * bm.spinRate[0] * 0.22,
                      dtBurst * bm.spinRate[1] * 0.2,
                      clusterPitch + Math.sin(dtBurst * 2.4 + i) * 0.15,
                    ]}
                  >
                    <ThermiteBomblet ignited={isIgnited} />
                    {isIgnited && (
                      <mesh position={[-0.25, 0, 0]} scale={[2.1, 0.36, 0.36]} material={groundMats.flameStreak}>
                        <octahedronGeometry args={[0.048, 0]} />
                      </mesh>
                    )}
                  </group>
                );
              })}
          </group>
        )}

        {/* ==================== BÃO LỬA XUYÊN THỦNG MÁI NHÀ XƯỞNG & NHÀ GỖ (488.82–502.30 s) ==================== */}
        {/* Dùng Explosion cỡ vừa (size 4.2–5.8, smokeLife ngắn 3.8 s) để chớp nổ & mảnh văng dữ dội mà không mù khói trắng che khuất kiến trúc! */}
        <Explosion t={t} at={CUE.c03_s06_punch_roofs_ignite} pos={[14.5, 8.8, -1.5]} size={5.8} smokeLife={3.8} smoke="#2b2623" seed={1} />
        <Explosion t={t} at={489.3} pos={[4, 8.2, 6]} size={4.8} smokeLife={3.6} smoke="#2e2925" seed={2} />
        <Explosion t={t} at={489.85} pos={[26, 8.5, -8]} size={5.2} smokeLife={3.6} smoke="#292522" seed={3} />
        <Explosion t={t} at={490.55} pos={[53, 4.8, -26]} size={4.5} smokeLife={3.5} smoke="#302b27" seed={4} />
        <Explosion t={t} at={491.35} pos={[15, 9.2, 4]} size={5.6} smokeLife={3.8} smoke="#282421" seed={5} />
        <Explosion t={t} at={493.2} pos={[-35, 7.5, -22]} size={4.8} smokeLife={3.6} smoke="#2d2825" seed={6} />
        <Explosion t={t} at={495.4} pos={[18, 9.0, -4]} size={5.0} smokeLife={3.6} smoke="#272320" seed={7} />

        {/* Các cột lửa magnesium-thermite 4.000°F rực rỡ cháy xuyên suốt trên các nhịp mái răng cưa & khu nhà gỗ */}
        <ToweringFirePlume t={t} at={488.84} pos={[14.5, 8.2, -1]} height={18.5} width={5.2} seed={11} withLight />
        <ToweringFirePlume t={t} at={489.15} pos={[4.5, 7.8, 6]} height={15.0} width={4.2} seed={19} />
        <ToweringFirePlume t={t} at={489.45} pos={[25.5, 8.0, -8]} height={16.0} width={4.5} seed={27} withLight />
        <ToweringFirePlume t={t} at={489.95} pos={[54, 4.6, -27]} height={11.5} width={3.6} seed={33} />
        <ToweringFirePlume t={t} at={490.25} pos={[53, 4.6, 23]} height={11.0} width={3.5} seed={41} />
        <ToweringFirePlume t={t} at={490.5} pos={[-34, 4.6, 31]} height={10.5} width={3.4} seed={45} />
        <ToweringFirePlume t={t} at={490.7} pos={[-40, 7.2, -23]} height={13.5} width={4.0} seed={49} />

        {/* ==================== KHẨU ĐỘI PHÁO TYPE 88 KHAI HOẢ & MÂY KHÓI FLAK ĐEN (494.3–502.3 s) ==================== */}
        {flakBatteries.map((bat, bIdx) => {
          const trackYaw = bat.baseYaw + prog(t, 495.5, 501.8) * bat.yawSweep;
          let recoil = 0;
          for (const sAt of bat.shots) {
            recoil = Math.max(recoil, bump(t, sAt, 0.36));
          }
          const L = 2.86 - recoil * 0.42;
          const mxLocal = -0.06 + L * Math.cos(bat.elev) - 0.095 * Math.sin(bat.elev);
          const myLocal = 1.48 + L * Math.sin(bat.elev) + 0.095 * Math.cos(bat.elev);
          const muzzlePos: V3 = [
            bat.pos[0] + mxLocal * Math.cos(trackYaw),
            bat.pos[1] + myLocal,
            bat.pos[2] - mxLocal * Math.sin(trackYaw),
          ];
          const muzzleDir: V3 = [
            Math.cos(bat.elev) * Math.cos(trackYaw),
            Math.sin(bat.elev),
            -Math.cos(bat.elev) * Math.sin(trackYaw),
          ];

          return (
            <React.Fragment key={`flak-bat-${bIdx}`}>
              <group position={bat.pos}>
                <Type88Flak yaw={trackYaw} elev={bat.elev} recoil={recoil} sandbags />
              </group>
              {bat.shots.map((sAt, sIdx) => (
                <MuzzleBlast
                  key={`mb-${bIdx}-${sIdx}`}
                  t={t}
                  at={sAt}
                  pos={muzzlePos}
                  dir={muzzleDir}
                  size={0.96}
                  seed={100 + bIdx * 10 + sIdx}
                />
              ))}
            </React.Fragment>
          );
        })}

        {/* Lưới cầu khói flak đen đặc (#2a2826) có chớp lửa mảnh đạn phủ kín bầu trời */}
        {FLAK_BURSTS.map((fb, idx) => (
          <FlakBlackCloud key={`fbc-${idx}`} t={t} at={fb.at} pos={fb.pos} size={fb.size} seed={fb.seed} />
        ))}

        {/* ==================== B-25 DOOLITTLE BỔ NHÀO SÁT NGỌN CÂY LƯỢN THOÁT KHỎI THÀNH PHỐ ==================== */}
        {showEscapeB25 && (
          <group position={escPos} rotation={[0, escYaw, 0]}>
            <group rotation={[0, 0, escPitch]}>
              <group rotation={[escBank, 0, 0]}>
                <B25Mitchell
                  gear={0}
                  bombBay={1 - prog(t, 495.4, 497.5)}
                  propFast
                  propSpin={t * 46}
                  broomsticks
                  seed={1}
                />
              </group>
            </group>
          </group>
        )}
      </Stage>

      <Label
        t={t}
        text="512 BOMBLETS · 4,000°F"
        x={960}
        y={165}
        from={CUE.c03_s06_burn_4000f}
        until={491.5}
      />
    </div>
  );
};

export default C03S06;
