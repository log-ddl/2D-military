import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, bump } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { Explosion, MuzzleBlast, DustTrail, Trail } from '@skill/military/3d/fx';
import { pipe } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { JapaneseFighter } from '../parts/JapaneseFighter';
import {
  FactoryComplex,
  OilRefineryCluster,
  TokyoRowhouseBlock,
  PowerLineSpan,
} from '../parts/JapanTargetBlocks';
import { BombANM64 } from '../parts/Ordnance3D';

// ---------- Địa hình khu công nghiệp lọc dầu & hành lang điện cao thế Yokohama (mặt bằng y = 0.0 m chuẩn xác) ----------
const refineryTerrain = heightField({
  seed: 310,
  amp: 5.0,
  scale: 145,
  flats: [
    [160, 0, 180, 0.0],
    [400, 0, 300, 0.0],
    [600, 0, 220, 0.0],
  ],
  add: (_x, z) => {
    const az = Math.abs(z);
    return az < 98 ? 0 : Math.min(30, ((az - 98) / 160) ** 1.5 * 24);
  },
});

const avoidRefineryZone = (x: number, z: number) => {
  if (x > 210 && x < 660 && Math.abs(z) < 64) return true;
  if (Math.abs(z) < 36) return true;
  return false;
};

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

/**
 * Tính chính xác vị trí đầu nòng & vector hướng bắn của cặp súng máy .50 cal M2 Browning
 * trên tháp pháo lưng Bendix trong hệ toạ độ local của B25Mitchell.
 * Khi turretYaw = 0 -> nòng hướng +X; khi turretYaw ≈ Math.PI ± 0.22 -> nòng xoay ra đuôi -X, ngóc lên +Y theo turretPitch.
 */
function getBendixMuzzleLocal(turretYaw: number, turretPitch: number, side: -1 | 1): { pos: V3; dir: V3 } {
  const zg = side * 0.12;
  const cp = Math.cos(turretPitch);
  const sp = Math.sin(turretPitch);
  const xYaw = 0.12 + 0.86 * cp;
  const yYaw = 0.25 + 0.86 * sp;
  const cy = Math.cos(turretYaw);
  const sy = Math.sin(turretYaw);
  const pos: V3 = [
    -0.60 + xYaw * cy + zg * sy,
    3.39 + yYaw,
    -xYaw * sy + zg * cy,
  ];
  const dir: V3 = [cp * cy, sp, -cp * sy];
  return { pos, dir };
}

function b25LocalToWorld(local: V3, b25Pos: V3, roll: number, pitch: number, isDir = false): V3 {
  const v = new THREE.Vector3(...local);
  v.applyEuler(new THREE.Euler(roll, 0, pitch, 'XYZ'));
  if (!isDir) {
    v.x += b25Pos[0];
    v.y += b25Pos[1];
    v.z += b25Pos[2];
  }
  return [v.x, v.y, v.z];
}

// ---------- Chớp lửa cruciform sắc nét đầu nòng đại liên .50 cal M2 Browning (không gây mù ống kính) ----------
const Twin50CyclicFlash: React.FC<{
  pos: V3;
  dir: V3;
  intensity: number;
}> = ({ pos, dir, intensity }) => {
  const q = useMemo(() => {
    const d = new THREE.Vector3(...dir).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
  }, [dir[0], dir[1], dir[2]]);

  if (intensity <= 0.02) return null;
  const s = 0.16 + intensity * 0.11;
  return (
    <group position={pos} quaternion={q}>
      <pointLight color="#ffcf6e" intensity={24 * intensity} distance={5} decay={2} />
      <mesh position={[s * 0.85, 0, 0]} scale={[s * 1.9, s * 0.22, s * 0.22]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#fff8cc" transparent opacity={0.95 * intensity} toneMapped={false} />
      </mesh>
      {[0, 1].map((k) => (
        <mesh
          key={k}
          position={[s * 0.18, 0, 0]}
          rotation={[(k * Math.PI) / 2, 0, 0]}
          scale={[s * 0.32, s * 0.78, s * 0.1]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#ff9226" transparent opacity={0.85 * intensity} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Bộ sứ cách điện treo & dây dẫn kép 66kV chuẩn công nghiệp Nhật 1942 khớp đúng nhịp PowerLineSpan ----------
const HighVoltageHardware: React.FC<{ span?: number }> = ({ span = 76 }) => {
  const ceramicMat = useMemo(() => plain('#cfd6dc', 0.35, 0.25), []);
  const conductorMat = useMemo(() => plain('#1e2328', 0.55, 0.55), []);

  const { auxCables, insulators } = useMemo(() => {
    const cables: THREE.BufferGeometry[] = [];
    const ins: V3[] = [];
    // Đáy thấp nhất giữ nguyên y = 20.2 - 5.4 = 14.8 m
    for (const [armY, armX, sag] of [
      [24.5, -2.8, 7.8],
      [24.5, 2.8, 7.8],
      [20.2, -3.6, 5.4],
      [20.2, 3.6, 5.4],
    ] as const) {
      ins.push([armX, armY + 0.16, -span / 2], [armX, armY + 0.16, span / 2]);
      const pts: V3[] = [];
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        const z = -span / 2 + span * u;
        const y = armY - sag * 4 * u * (1 - u);
        pts.push([armX + 0.18, y + 0.04, z]);
      }
      cables.push(pipe(pts, 0.072, 28));
    }
    const shieldPts: V3[] = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const z = -span / 2 + span * u;
      shieldPts.push([0, 27.0 - 4.2 * 4 * u * (1 - u), z]);
    }
    cables.push(pipe(shieldPts, 0.052, 24));
    return { auxCables: cables, insulators: ins };
  }, [span]);

  return (
    <group>
      {auxCables.map((g, idx) => (
        <mesh key={`hv-aux-${idx}`} geometry={g} material={conductorMat} />
      ))}
      {insulators.map((p, idx) => (
        <group key={`ins-${idx}`} position={p}>
          {[0, 1, 2, 3].map((d) => (
            <mesh key={d} position={[0, -d * 0.12, 0]} material={ceramicMat}>
              <cylinderGeometry args={[0.16, 0.11, 0.07, 12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

const C03S10: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const REFINERY_X = 376;
  const POWERLINE_X = 495;

  // ---------- 1. Quỹ đạo chiếc B-25 #11 "Hari Kari-er" ----------
  const getB25X = (sec: number): number => {
    if (sec <= CUE.c03_s10_blast_shockwave) return (sec - 577.84) * 27.4;
    return (
      (CUE.c03_s10_blast_shockwave - 577.84) * 27.4 +
      (sec - CUE.c03_s10_blast_shockwave) * 16.8
    );
  };

  const b25X = getB25X(t);

  // Độ cao Y: 42 m (không chiến tháp lưng) -> 19.5 m (cắt bom lọc dầu) -> nảy giật sóng nổ 591.72 s -> ép sát đất 6.2 m luồn dây điện!
  const descendToBomb = prog(t, 587.2, 590.4);
  const diveUnderWires = prog(t, 592.3, 595.4);
  const shockElapsed = Math.max(0, t - CUE.c03_s10_blast_shockwave);
  const shockEnvelope =
    t >= CUE.c03_s10_blast_shockwave && shockElapsed < 2.3
      ? Math.exp(-shockElapsed * 2.0) * Math.sin(Math.min(Math.PI, shockElapsed * 4.8))
      : 0;
  const shockTurbulence =
    t >= CUE.c03_s10_blast_shockwave && shockElapsed < 2.6
      ? Math.exp(-shockElapsed * 1.6) * Math.sin(shockElapsed * 16.5)
      : 0;

  const baseAlt = lerp(lerp(42.0, 19.6, descendToBomb), 6.2, diveUnderWires);
  const climbAfterWires = prog(t, 598.7, 599.5) * 0.4;
  const b25Y = baseAlt + shockEnvelope * 2.9 + shockTurbulence * 0.45 + climbAfterWires;
  const b25Z = Math.sin((t - 577.84) * 0.65) * (1 - diveUnderWires) * 0.7;

  const b25Pitch =
    -0.05 * bump(t, 587.6, 3.0) +
    shockEnvelope * 0.135 +
    shockTurbulence * 0.045 -
    0.105 * bump(t, 592.35, 2.8);
  const b25Roll =
    Math.sin((t - 577.84) * 0.9) * 0.035 * (1 - diveUnderWires) +
    shockTurbulence * 0.165;
  const b25Pos: V3 = [b25X, b25Y, b25Z];

  const bombBayOpen =
    t < 591.85 ? prog(t, 588.6, 589.5) : 1 - prog(t, 592.0, 593.6);

  // ---------- 2. Nhịp 1 (577.84–589.25 s): Tháp lưng Bendix thật của Melvin Gardner bắn hạ 2 tiêm kích Nhật ----------
  const isBeat2 = t >= 589.25;

  // Tiêm kích A (phải màn hình / -Z, trúng đạn ở 583.90 s -> bùng lửa dữ dội, nghiêng cánh cắm đầu lao xuống kéo vệt khói đen)
  const faApproach = prog(t, 577.6, 583.9);
  const faPlunge = prog(t, 583.9, 589.1);
  const faDamage = prog(t, 583.65, 584.3) * 0.94;
  const faRel: V3 = [
    lerp(-25.0, -17.8, faApproach) - faPlunge * 13.5,
    lerp(12.2, 9.5, faApproach) - (faPlunge * 5.5 + faPlunge * faPlunge * 11.5),
    lerp(-5.4, -3.4, faApproach) - faPlunge * 4.2,
  ];
  const faWorld: V3 = [b25Pos[0] + faRel[0], b25Pos[1] + faRel[1], b25Pos[2] + faRel[2]];
  const faRoll = lerp(0.24, 0.08, faApproach) - faPlunge * 1.45;
  const faPitch = lerp(-0.12, -0.05, faApproach) - faPlunge * 0.85;
  const faYaw = -0.14 + faPlunge * 0.28;

  // Tiêm kích B (trái màn hình / +Z, trúng đạn ở 584.90 s -> bùng lửa khói đen cắm đầu rơi xuống ở 586.33..588.5 s)
  const fbApproach = prog(t, 577.6, 584.9);
  const fbPlunge = prog(t, 584.9, 589.3);
  const fbDamage = prog(t, 584.65, 585.3) * 0.94;
  const fbRel: V3 = [
    lerp(-28.0, -18.2, fbApproach) - fbPlunge * 12.5,
    lerp(13.2, 9.8, fbApproach) - (fbPlunge * 4.8 + fbPlunge * fbPlunge * 11.0),
    lerp(5.8, 3.6, fbApproach) + fbPlunge * 4.0,
  ];
  const fbWorld: V3 = [b25Pos[0] + fbRel[0], b25Pos[1] + fbRel[1], b25Pos[2] + fbRel[2]];
  const fbRoll = lerp(-0.26, -0.1, fbApproach) + fbPlunge * 1.48;
  const fbPitch = lerp(-0.14, -0.05, fbApproach) - fbPlunge * 0.82;
  const fbYaw = 0.15 - fbPlunge * 0.26;

  // 2 tiêm kích còn lại (#C, #D) hoảng sợ ngoặt gấp tách đội tháo chạy
  const peelOff = prog(t, 585.6, 589.2);
  const fcWorld: V3 = [
    b25Pos[0] - 31 - peelOff * 18,
    b25Pos[1] + 14.5 + peelOff * 10,
    b25Pos[2] - 10.2 - peelOff * 13,
  ];
  const fdWorld: V3 = [
    b25Pos[0] - 34 - peelOff * 16,
    b25Pos[1] + 15.6 + peelOff * 11,
    b25Pos[2] + 10.8 + peelOff * 14,
  ];

  // Tháp lưng Bendix xoay nòng .50 cal thật về phía đuôi (turretYaw ≈ Math.PI ± 0.20, turretPitch ≈ 0.38..0.48)
  const switchTargetP = prog(t, 584.45, 585.15);
  const aimTargetRel = lerpV3(
    [faRel[0] + 1.8, faRel[1] + 1.5, faRel[2]],
    [fbRel[0] + 1.8, fbRel[1] + 1.5, fbRel[2]],
    switchTargetP,
  );
  const aimDx = Math.min(-4, aimTargetRel[0] - -0.60);
  const aimDy = Math.max(2.5, aimTargetRel[1] - 3.64);
  const aimDz = aimTargetRel[2];

  const lockInP = prog(t, 577.7, CUE.c03_s10_gardner_upper_turret + 0.3);
  const rawYaw = Math.PI + Math.atan2(aimDz, -aimDx);
  const rawPitch = Math.min(0.50, Math.max(0.38, Math.atan2(aimDy, Math.hypot(aimDx, aimDz))));

  const turretYaw = isBeat2 ? Math.PI + 0.08 : lerp(Math.PI - 0.30, rawYaw, lockInP);
  const turretPitch = isBeat2 ? 0.34 : lerp(0.38, rawPitch, lockInP);

  const muzzleL = getBendixMuzzleLocal(turretYaw, turretPitch, -1);
  const muzzleR = getBendixMuzzleLocal(turretYaw, turretPitch, 1);
  const muzzleWorldL = b25LocalToWorld(muzzleL.pos, b25Pos, b25Roll, b25Pitch, false);
  const muzzleWorldR = b25LocalToWorld(muzzleR.pos, b25Pos, b25Roll, b25Pitch, false);
  const muzzleDirWorld = b25LocalToWorld(muzzleL.dir, b25Pos, b25Roll, b25Pitch, true);

  // Chớp lửa liên thanh 15 Hz tại 2 đầu nòng .50 cal suốt từ 583.44 -> 586.75 s
  const isFiring50 = t >= CUE.c03_s10_hammers_50cal && t <= 586.75;
  const cyclicL = isFiring50 ? Math.max(0, Math.sin((t - CUE.c03_s10_hammers_50cal) * 92)) : 0;
  const cyclicR = isFiring50 ? Math.max(0, Math.sin((t - CUE.c03_s10_hammers_50cal) * 92 + 2.4)) : 0;

  // Điểm nhấn <MuzzleBlast size={0.07}> ngay nhịp khai hỏa đầu tiên (không che camera ở các giây sau)
  const muzzleSmokePulses = useMemo(() => [583.44], []);

  // Dòng tia đạn lửa .50 cal incendiary sắc nét (lệch góc ~20° so với trục camera)
  const tracerBolts = useMemo(
    () => Array.from({ length: 24 }, (_, k) => 583.44 + k * 0.14),
    [],
  );

  const fighterASmokePath = (sec: number): V3 => {
    const bx = getB25X(sec);
    const desc = prog(sec, 587.2, 590.4);
    const by = lerp(42.0, 19.6, desc);
    const bz = Math.sin((sec - 577.84) * 0.65) * 0.7;
    const app = prog(sec, 577.6, 583.9);
    const plg = prog(sec, 583.9, 589.1);
    return [
      bx + lerp(-25.0, -17.8, app) - plg * 13.5 + 1.2,
      by + lerp(12.2, 9.5, app) - (plg * 5.5 + plg * plg * 11.5) + 1.4,
      bz + lerp(-5.4, -3.4, app) - plg * 4.2,
    ];
  };

  const fighterBSmokePath = (sec: number): V3 => {
    const bx = getB25X(sec);
    const desc = prog(sec, 587.2, 590.4);
    const by = lerp(42.0, 19.6, desc);
    const bz = Math.sin((sec - 577.84) * 0.65) * 0.7;
    const app = prog(sec, 577.6, 584.9);
    const plg = prog(sec, 584.9, 589.3);
    return [
      bx + lerp(-28.0, -18.2, app) - plg * 12.5 + 1.2,
      by + lerp(13.2, 9.8, app) - (plg * 4.8 + plg * plg * 11.0) + 1.4,
      bz + lerp(5.8, 3.6, app) + plg * 4.0,
    ];
  };

  // ---------- 3. Nhịp 2 (589.25–598.98 s): Ném bom cụm lọc dầu Yokohama & bay luồn dưới dây điện cao thế ----------
  const refineryDamage = prog(t, CUE.c03_s10_blast_shockwave, CUE.c03_s10_blast_shockwave + 0.45) * 0.92;

  const droppedBombs = useMemo(
    () => [
      { releaseAt: 589.45, hitAt: 591.72, hitPos: [REFINERY_X - 4, 3.5, -3] as V3, zOff: -0.24 },
      { releaseAt: 589.75, hitAt: 591.78, hitPos: [REFINERY_X + 2, 3.5, 4] as V3, zOff: 0.24 },
      { releaseAt: 590.05, hitAt: 591.85, hitPos: [REFINERY_X - 8, 3.5, 6] as V3, zOff: -0.18 },
    ],
    [],
  );

  const lowWashDustPath = (sec: number): V3 => [getB25X(sec) - 4.5, 0.15, 0];

  // ---------- 4. Điều khiển Camera qua 2 nhịp ----------
  let camPos: V3;
  let camLook: V3;
  let camFov: number;
  let camRoll = 0;

  if (!isBeat2) {
    // Nhịp 1: Đặt sát sau-trên vai vòm tháp lưng [+2.42, 4.02, +1.36] nhìn xuyên qua vòm kính Bendix & 2 nòng .50 cal!
    // Ở vị trí này vòm tháp pháo Bendix + cặp súng máy .50 cal hiện cực rõ ở tiền cảnh dưới-trái, còn 4 tiêm kích Nhật ở bầu trời trên!
    const fireShake = isFiring50 ? Math.sin(t * 68) * 0.024 : 0;
    const plungeTilt = prog(t, CUE.c03_s10_two_fighters_plunge - 0.2, 589.1);
    const localCamPos: V3 = [
      lerp(2.42, 2.28, plungeTilt),
      lerp(4.02, 4.14, plungeTilt) + fireShake,
      lerp(1.36, 1.24, switchTargetP) + fireShake * 0.5,
    ];
    const localCamLook: V3 = [
      -18.0,
      lerp(7.5, 4.2, plungeTilt),
      lerp(-1.1, 0.4, switchTargetP),
    ];
    camPos = b25LocalToWorld(localCamPos, b25Pos, b25Roll, b25Pitch, false);
    camLook = b25LocalToWorld(localCamLook, b25Pos, b25Roll, b25Pitch, false);
    camFov = 46;
    camRoll = b25Roll * 0.5;
  } else if (t < 595.15) {
    // Nhịp 2A (589.25–595.15 s): Camera tầm thấp công nghiệp thu trọn CẢ chiếc B-25 đang cắt bom (590.43 s)
    // LẪN quả cầu lửa lọc dầu Yokohama bên trái VÀ chiếc B-25 chao đảo bổ nhào sát đất bên phải (594.53 s)!
    const dropP = prog(t, 589.25, CUE.c03_s10_blast_shockwave);
    const blastP = prog(t, CUE.c03_s10_blast_shockwave, 595.15);
    const blastShake = shockTurbulence * 0.36;
    camPos =
      t < CUE.c03_s10_blast_shockwave
        ? [lerp(354, 378, dropP), 7.5, lerp(54, 56, dropP)]
        : [lerp(378, 405, blastP), lerp(7.5, 8.2, blastP) + blastShake, lerp(56, 63, blastP)];
    camLook =
      t < CUE.c03_s10_blast_shockwave
        ? [lerp(350, 374, dropP), 13.6, 0]
        : [lerp(376, 404, blastP), lerp(12.8, 10.8, blastP), 0];
    camFov = lerp(48, 50, blastP);
    camRoll = shockTurbulence * 0.028;
  } else {
    // Nhịp 2B (595.15–598.98 s): Góc máy 3/4 trực diện tầm thấp (y ≈ 5.1 m) phía trước hàng cột điện cao thế:
    // Thu trọn CẢ 2 tháp điện thép 27 m hai bên, hàng dây cáp võng y = 14.8 m vắt ngang bầu trời,
    // chiếc B-25 ở y = 6.2 m lao thẳng luồn dưới gầm dây cáp, và cột khói lửa lọc dầu Yokohama rực cháy phía xa!
    const wireRunP = prog(t, 595.15, 598.98);
    camPos = [
      lerp(552, 543, wireRunP),
      lerp(5.5, 5.0, wireRunP),
      lerp(9.5, 7.4, wireRunP),
    ];
    camLook = [
      lerp(484, 495, wireRunP),
      lerp(9.6, 10.1, wireRunP),
      0,
    ];
    camFov = 52;
    camRoll = -0.012;
  }

  return (
    <Stage
      {...STAGE_PRESETS.tokyoFire}
      width={W}
      height={H}
      shadowArea={68}
      shadowCenter={[b25Pos[0], 10, b25Pos[2]]}
    >
      <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

      <Terrain
        h={refineryTerrain}
        size={1320}
        seg={230}
        center={[340, 0]}
        colors={TERRAIN_PALETTE.tokyoUrban}
        grainRepeat={46}
      />
      <Scatter
        kind="pine"
        count={260}
        area={[-120, -240, 820, 240]}
        h={refineryTerrain}
        seed={61}
        scale={[1.1, 1.8]}
        avoid={avoidRefineryZone}
      />
      <Scatter
        kind="broadleaf"
        count={170}
        area={[-120, -210, 820, 210]}
        h={refineryTerrain}
        seed={67}
        scale={[1.0, 1.65]}
        avoid={avoidRefineryZone}
      />
      <Scatter
        kind="bush"
        count={160}
        area={[-80, -180, 800, 180]}
        h={refineryTerrain}
        seed={71}
        scale={[0.85, 1.4]}
        avoid={avoidRefineryZone}
      />

      {/* Tuyến đường bê tông/đất nén khu công nghiệp Yokohama */}
      <mesh position={[430, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={plain('#5e5a52', 0.94)} receiveShadow>
        <planeGeometry args={[460, 15]} />
      </mesh>

      {/* Cụm kho bồn lọc dầu chính Yokohama tại x = 376 m */}
      <group position={[REFINERY_X, 0, 0]}>
        <OilRefineryCluster damage={refineryDamage} />
        <group position={[-34, 0, -18]} rotation={[0, Math.PI * 0.5, 0]} scale={0.78}>
          <OilRefineryCluster damage={refineryDamage * 0.85} />
        </group>
      </group>

      {/* Các dãy nhà máy & phố thợ xung quanh */}
      <group position={[265, 0, -68]} rotation={[0, 0.12, 0]}>
        <FactoryComplex variant={1} damage={0.25} />
      </group>
      <group position={[355, 0, -76]} rotation={[0, -0.08, 0]}>
        <FactoryComplex variant={0} damage={refineryDamage * 0.6} />
      </group>
      <group position={[436, 0, -72]} rotation={[0, 0.22, 0]}>
        <TokyoRowhouseBlock variant={1} burning={t > 592.5} />
      </group>
      <group position={[440, 0, 76]} rotation={[0, -0.18, 0]}>
        <FactoryComplex variant={1} damage={0.15} />
      </group>
      <group position={[210, 0, 68]} rotation={[0, 0.3, 0]}>
        <TokyoRowhouseBlock variant={0} />
      </group>

      {/* Nhịp đường dây điện cao thế Yokohama tại x = 498 m (span = 76 m, đáy dây cáp võng y = 14.8 m > đỉnh đuôi B-25 11.2 m!) */}
      <group position={[POWERLINE_X, 0, 0]}>
        <PowerLineSpan span={76} />
        <HighVoltageHardware span={76} />
      </group>
      <group position={[POWERLINE_X + 135, 0, -108]} rotation={[0, 0.35, 0]}>
        <PowerLineSpan span={76} />
      </group>

      {/* Chiếc B-25B #11 "Hari Kari-er" */}
      <group position={b25Pos} rotation={[b25Roll, 0, b25Pitch]}>
        <B25Mitchell
          gear={0}
          propFast={true}
          propSpin={t * 45}
          bombBay={bombBayOpen}
          broomsticks={true}
          turretYaw={turretYaw}
          turretPitch={turretPitch}
          seed={11}
        />
      </group>

      {/* Vệt bụi đất cuộn lên dưới luồng gió cánh quạt khi B-25 bay sát đất y = 6.2 m luồn dưới dây điện */}
      <DustTrail
        t={t}
        from={595.1}
        to={599.2}
        path={lowWashDustPath}
        rate={14}
        size={2.5}
        color="#9d907a"
        life={2.2}
      />

      {/* ==================== NHỊP 1: THÁP LƯNG BENDIX BẮN CHÁY 2 TIÊM KÍCH NHẬT ==================== */}
      {!isBeat2 && (
        <>
          <group position={faWorld} rotation={[faRoll, faYaw, faPitch]}>
            <JapaneseFighter
              scheme="green"
              gear={0}
              propFast={true}
              propSpin={t * 48}
              damage={faDamage}
              seed={41}
            />
            {faDamage > 0.3 && (
              <group position={[1.4, 1.85, 0]}>
                <mesh position={[0.4, 0, 0]} scale={[1.8, 1.0, 1.0]}>
                  <dodecahedronGeometry args={[0.72, 1]} />
                  <meshBasicMaterial color="#fff09a" transparent opacity={0.95} toneMapped={false} />
                </mesh>
                <mesh position={[-0.9, 0.32, -0.15]} rotation={[0, 0, -0.22]} scale={[2.9, 1.15, 1.15]}>
                  <dodecahedronGeometry args={[0.88, 1]} />
                  <meshBasicMaterial color="#ff6e14" transparent opacity={0.88} toneMapped={false} />
                </mesh>
                <mesh position={[-2.3, 0.65, -0.25]} rotation={[0, 0, -0.28]} scale={[2.6, 0.95, 0.95]}>
                  <dodecahedronGeometry args={[0.68, 1]} />
                  <meshBasicMaterial color="#ff3d08" transparent opacity={0.76} toneMapped={false} />
                </mesh>
              </group>
            )}
          </group>

          <group position={fbWorld} rotation={[fbRoll, fbYaw, fbPitch]}>
            <JapaneseFighter
              scheme="grey"
              gear={0}
              propFast={true}
              propSpin={t * 47}
              damage={fbDamage}
              seed={42}
            />
            {fbDamage > 0.3 && (
              <group position={[1.4, 1.85, 0]}>
                <mesh position={[0.4, 0, 0]} scale={[1.85, 1.05, 1.05]}>
                  <dodecahedronGeometry args={[0.76, 1]} />
                  <meshBasicMaterial color="#fff2a2" transparent opacity={0.95} toneMapped={false} />
                </mesh>
                <mesh position={[-0.95, 0.35, 0.16]} rotation={[0, 0, -0.24]} scale={[3.0, 1.2, 1.2]}>
                  <dodecahedronGeometry args={[0.92, 1]} />
                  <meshBasicMaterial color="#ff7418" transparent opacity={0.9} toneMapped={false} />
                </mesh>
                <mesh position={[-2.4, 0.7, 0.28]} rotation={[0, 0, -0.3]} scale={[2.7, 1.0, 1.0]}>
                  <dodecahedronGeometry args={[0.72, 1]} />
                  <meshBasicMaterial color="#ff420a" transparent opacity={0.78} toneMapped={false} />
                </mesh>
              </group>
            )}
          </group>

          <group position={fcWorld} rotation={[-0.48, -0.25, 0.22]}>
            <JapaneseFighter scheme="green" gear={0} propFast={true} propSpin={t * 46} seed={43} />
          </group>
          <group position={fdWorld} rotation={[0.52, 0.28, 0.24]}>
            <JapaneseFighter scheme="grey" gear={0} propFast={true} propSpin={t * 46} seed={44} />
          </group>

          {/* Chớp lửa đầu nòng liên thanh sắc nét + MuzzleBlast khói mỏng đúng tỉ lệ .50 cal tại 2 nòng đã xoay */}
          <Twin50CyclicFlash pos={muzzleWorldL} dir={muzzleDirWorld} intensity={cyclicL} />
          <Twin50CyclicFlash pos={muzzleWorldR} dir={muzzleDirWorld} intensity={cyclicR} />
          {muzzleSmokePulses.map((bt, idx) => (
            <React.Fragment key={`mb50-${idx}`}>
              <MuzzleBlast t={t} at={bt} pos={muzzleWorldL} dir={muzzleDirWorld} size={0.07} seed={10 + idx} />
              <MuzzleBlast t={t} at={bt + 0.04} pos={muzzleWorldR} dir={muzzleDirWorld} size={0.07} seed={30 + idx} />
            </React.Fragment>
          ))}

          {/* Tia đạn lửa .50 cal incendiary sắc gọn, lệch góc rõ nét với trục camera, găm thẳng vào 2 tiêm kích Nhật */}
          {tracerBolts.map((bt, idx) => {
            const dt = t - bt;
            if (dt < 0 || dt > 0.2) return null;
            const targetWorld = bt < 584.55 ? faWorld : fbWorld;
            const hitCenter: V3 = [targetWorld[0] + 1.6, targetWorld[1] + 1.65, targetWorld[2]];
            const p0 = Math.max(0.11, (dt - 0.065) / 0.135);
            const p1 = Math.min(1, dt / 0.135);
            if (p1 - p0 < 0.04) return null;

            const sL0 = lerpV3(muzzleWorldL, [hitCenter[0], hitCenter[1] + 0.12, hitCenter[2] - 0.18], p0);
            const sL1 = lerpV3(muzzleWorldL, [hitCenter[0], hitCenter[1] + 0.12, hitCenter[2] - 0.18], p1);
            const sR0 = lerpV3(muzzleWorldR, [hitCenter[0], hitCenter[1] - 0.1, hitCenter[2] + 0.18], p0);
            const sR1 = lerpV3(muzzleWorldR, [hitCenter[0], hitCenter[1] - 0.1, hitCenter[2] + 0.18], p1);

            return (
              <React.Fragment key={`tr50-${idx}`}>
                <Trail
                  points={[sL0, lerpV3(sL0, sL1, 0.5), sL1]}
                  upto={1}
                  color="#fff099"
                  width={0.036}
                  opacity={0.96}
                  glow={true}
                />
                <Trail
                  points={[sR0, lerpV3(sR0, sR1, 0.5), sR1]}
                  upto={1}
                  color="#ff7e24"
                  width={0.03}
                  opacity={0.94}
                  glow={true}
                />
              </React.Fragment>
            );
          })}

          {/* Chớp nổ khi đạn cháy .50 cal găm nổ động cơ & bình xăng 2 tiêm kích Nhật */}
          <Explosion
            t={t}
            at={583.9}
            pos={[faWorld[0] + 1.6, faWorld[1] + 1.6, faWorld[2]]}
            size={2.5}
            seed={41}
            smokeLife={3.8}
            smoke="#151311"
          />
          <Explosion
            t={t}
            at={584.9}
            pos={[fbWorld[0] + 1.6, fbWorld[1] + 1.6, fbWorld[2]]}
            size={2.8}
            seed={42}
            smokeLife={3.8}
            smoke="#151311"
          />

          {/* 2 dải khói dầu đen đặc kéo dài theo quỹ đạo cắm đầu rơi xuống của 2 chiếc tiêm kích Nhật */}
          <DustTrail
            t={t}
            from={583.9}
            to={589.25}
            path={fighterASmokePath}
            rate={22}
            size={3.2}
            color="#151311"
            life={4.8}
          />
          <DustTrail
            t={t}
            from={584.9}
            to={589.25}
            path={fighterBSmokePath}
            rate={22}
            size={3.4}
            color="#141210"
            life={4.8}
          />
        </>
      )}

      {/* ==================== NHỊP 2: CẮT BOM NỔ TUNG KHO LỌC DẦU & SÓNG XUNG KÍCH ==================== */}
      {droppedBombs.map((bm, i) => {
        if (t < bm.releaseAt || t > bm.hitAt) return null;
        const u = (t - bm.releaseAt) / (bm.hitAt - bm.releaseAt);
        const startX = getB25X(bm.releaseAt) + 1.2;
        const startY = lerp(42.0, 19.6, prog(bm.releaseAt, 587.2, 590.4)) + 1.3;
        const bx = lerp(startX, bm.hitPos[0], u);
        const by = lerp(startY, bm.hitPos[1], u * u);
        const bz = lerp(bm.zOff, bm.hitPos[2], u);
        const pitchDown = lerp(-0.15, -1.18, u);
        return (
          <group key={`ref-bomb-${i}`} position={[bx, by, bz]} rotation={[0, 0, pitchDown]} scale={1.35}>
            <BombANM64 medal={false} seed={20 + i} />
          </group>
        );
      })}

      {/* Chuỗi nổ bồn chứa dầu khổng lồ size=22 tại 591.72 s tập trung gọn trên cụm bồn REFINERY_X (không tràn mù sang B-25) */}
      <Explosion
        t={t}
        at={CUE.c03_s10_blast_shockwave}
        pos={[REFINERY_X - 4, 1.5, -2]}
        size={22}
        seed={11}
        smokeLife={9.5}
        smoke="#181513"
      />
      <Explosion
        t={t}
        at={CUE.c03_s10_blast_shockwave + 1.15}
        pos={[REFINERY_X - 10, 2.0, 5]}
        size={16.5}
        seed={17}
        smokeLife={8.5}
        smoke="#161412"
      />
      <Explosion
        t={t}
        at={CUE.c03_s10_blast_shockwave + 2.45}
        pos={[REFINERY_X - 2, 2.4, -5]}
        size={15.5}
        seed={29}
        smokeLife={8.0}
        smoke="#171412"
      />

      {t >= CUE.c03_s10_blast_shockwave && (
        <group position={[REFINERY_X - 2, 0, 0]}>
          <pointLight color="#ff7a22" intensity={340} distance={200} decay={1.5} position={[0, 16, 0]} />
          <mesh position={[-4, 6.2, -3]} scale={[1.6, 1.25, 1.5]}>
            <icosahedronGeometry args={[7.2, 2]} />
            <meshBasicMaterial color="#ff771c" transparent opacity={0.84} toneMapped={false} />
          </mesh>
          <mesh position={[4, 5.4, 5]} scale={[1.4, 1.15, 1.4]}>
            <icosahedronGeometry args={[5.8, 2]} />
            <meshBasicMaterial color="#ffbe44" transparent opacity={0.78} toneMapped={false} />
          </mesh>

          {shockElapsed < 0.85 && (
            <mesh
              position={[0, 4 + shockElapsed * 18, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={1 + shockElapsed * 44}
            >
              <torusGeometry args={[1.0, 0.055, 10, 48]} />
              <meshBasicMaterial
                color="#ffe5b4"
                transparent
                opacity={0.55 * (1 - shockElapsed / 0.85)}
                toneMapped={false}
              />
            </mesh>
          )}
        </group>
      )}
    </Stage>
  );
};

export default C03S10;
