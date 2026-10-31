// C01S04 (48.98–57.44 s, 3D stormDawn, transition: cut):
// Cú cắt thẳng hành động mạn phải (+Z): tuần dương hạm hạng nhẹ USS Nashville (185.4 m) rẽ sóng trắng xoá
// tách khỏi đội hình hộ tống USS Hornet (CUE.c01_s04_nashville 51.28 s, <Label text="USS NASHVILLE · 6-INCH" />),
// cả 5 tháp pháo 3 nòng 6-inch (15 nòng) xoay đồng loạt sang mạn phải +Z (turretYaw âm: -0.18 -> -0.94 rad).
// Đúng CUE.c01_s04_opens_fire (53.58 s), 3 tháp mũi khạc lửa <MuzzleBlast> + giật recoil + ánh chớp cam hắt sáng tháp pháo;
// đúng CUE.c01_s04_thundering (55.78 s), 2 tháp sau cùng loạt bắn bồi toàn mạn rền vang kèm khói thuốc súng tạt ngang cột 3 chân.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { MuzzleBlast, softDot } from '@skill/military/3d/fx';
import { lathe } from '@skill/military/3d/geom';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS } from '../design/palette';
import { USSNashville } from '../parts/USSNashville';
import { USSHornet } from '../parts/USSHornet';
import { OceanSurface, waveY, shipPose } from '../parts/OceanSurface';

const SWELL = 4.2;

type TurretSpec = {
  id: number;
  x: number;
  y: number;
  barbetteH: number;
  isAft: boolean;
};

// Tọa độ chính xác 100% khớp với Triple6InchTurret trong src/parts/USSNashville.tsx
const TURRETS: readonly TurretSpec[] = [
  { id: 1, x: 66.5, y: 8.42, barbetteH: 0.88, isAft: false },
  { id: 2, x: 51.8, y: 7.98, barbetteH: 3.96, isAft: false },
  { id: 3, x: 35.8, y: 7.66, barbetteH: 1.18, isAft: false },
  { id: 4, x: -44.5, y: 7.16, barbetteH: 3.58, isAft: true },
  { id: 5, x: -59.5, y: 7.08, barbetteH: 0.88, isAft: true },
];

type SalvoEvent = {
  turretIdx: number; // 0..4 tương ứng T1..T5
  at: number;
  mainSize: number;
};

// Loạt 1 (CUE.c01_s04_opens_fire = 53.58 s): 3 tháp pháo mũi khai hỏa dồn dập (ripple salvo chuẩn hải pháo 6-inch/47)
// Loạt 2 (CUE.c01_s04_thundering = 55.78 s): 2 tháp pháo lái gầm vang + loạt đại bác cấp tập liên hồi toàn mạn
const SALVO_SCHEDULE: readonly SalvoEvent[] = [
  { turretIdx: 0, at: CUE.c01_s04_opens_fire, mainSize: 3.4 },
  { turretIdx: 1, at: CUE.c01_s04_opens_fire + 0.16, mainSize: 3.5 },
  { turretIdx: 2, at: CUE.c01_s04_opens_fire + 0.33, mainSize: 3.5 },

  { turretIdx: 3, at: CUE.c01_s04_thundering, mainSize: 3.6 },
  { turretIdx: 4, at: CUE.c01_s04_thundering + 0.16, mainSize: 3.6 },
  { turretIdx: 0, at: CUE.c01_s04_thundering + 0.48, mainSize: 3.3 },
  { turretIdx: 2, at: CUE.c01_s04_thundering + 0.86, mainSize: 3.3 },
  { turretIdx: 4, at: CUE.c01_s04_thundering + 1.21, mainSize: 3.5 },
  { turretIdx: 1, at: CUE.c01_s04_thundering + 1.26, mainSize: 3.5 },
];

/** Tính chính xác vị trí đầu nòng & hướng bắn của từng nòng pháo 6-inch trong hệ tọa độ cục bộ USSNashville */
function getBarrelMuzzle(
  spec: TurretSpec,
  barrelZ: number,
  turretYaw: number,
  gunElev: number,
  recoil: number,
): { pos: V3; dir: V3 } {
  const yaw = spec.isAft ? Math.PI - turretYaw : turretYaw;
  const lx = 6.35 - recoil * 0.68;
  const ce = Math.cos(gunElev);
  const se = Math.sin(gunElev);
  const hx = 2.72 + lx * ce;
  const hy = 1.18 + lx * se;
  const hz = barrelZ;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);

  return {
    pos: [spec.x + hx * cy + hz * sy, spec.y + spec.barbetteH + hy, -hx * sy + hz * cy],
    dir: [ce * cy, se, -ce * sy],
  };
}

/** Luồng lửa khạc định hướng tiện lathe (hình thoi nhọn dọc trục nòng) giúp tia lửa cam rực không bị khói xám che khuất */
const NavalBarrelFlameJet: React.FC<{
  t: number;
  at: number;
  pos: V3;
  dir: V3;
  length: number;
}> = ({ t, at, pos, dir, length }) => {
  const dt = t - at;
  const { outerGeo, coreGeo } = useMemo(
    () => ({
      outerGeo: lathe(
        [
          [0.08, 0.0],
          [0.52, 0.16],
          [0.64, 0.34],
          [0.42, 0.64],
          [0.16, 0.88],
          [0.01, 1.0],
        ],
        14,
      ),
      coreGeo: lathe(
        [
          [0.05, 0.0],
          [0.28, 0.14],
          [0.32, 0.32],
          [0.15, 0.62],
          [0.01, 0.78],
        ],
        12,
      ),
    }),
    [],
  );

  if (dt < 0 || dt > 0.17) return null;
  const life = 1 - dt / 0.17;
  const grow = 0.55 + 0.45 * Math.sin(Math.min(1, dt / 0.06) * Math.PI * 0.5);
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);

  return (
    <group position={pos} quaternion={q}>
      <mesh
        geometry={outerGeo}
        scale={[length * grow, length * 0.24 * grow, length * 0.24 * grow]}
        renderOrder={12}
      >
        <meshBasicMaterial
          color="#ff6e14"
          transparent
          opacity={0.92 * life}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        geometry={coreGeo}
        scale={[length * 0.82 * grow, length * 0.16 * grow, length * 0.16 * grow]}
        renderOrder={13}
      >
        <meshBasicMaterial
          color="#fff4c4"
          transparent
          opacity={0.96 * life}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

/** Khói thuốc súng xám trắng bị gió bão tạt vắt ngược từ đầu nòng qua thượng tầng & cột tàu 3 chân */
const GaleCorditeSmoke: React.FC<{
  t: number;
  turretYaw: number;
  gunElev: number;
}> = ({ t, turretYaw, gunElev }) => {
  const puffs = useMemo(() => {
    const mats: THREE.SpriteMaterial[] = [];
    for (let i = 0; i < 64; i++) {
      mats.push(
        new THREE.SpriteMaterial({
          map: softDot(),
          color: i % 3 === 0 ? '#dad4c8' : '#9aa6b0',
          transparent: true,
          depthWrite: false,
        }),
      );
    }
    return mats;
  }, []);

  const nodes: React.ReactNode[] = [];
  let matCursor = 0;

  for (let sIdx = 0; sIdx < SALVO_SCHEDULE.length; sIdx++) {
    const ev = SALVO_SCHEDULE[sIdx];
    const dt = t - ev.at;
    if (dt <= 0.08 || dt > 3.5) continue;

    const spec = TURRETS[ev.turretIdx];
    const muz = getBarrelMuzzle(spec, 0, turretYaw, gunElev, 0);

    for (let k = 0; k < 5; k++) {
      const born = 0.06 + k * 0.07;
      const age = dt - born;
      if (age <= 0 || age > 3.3) continue;

      const mat = puffs[matCursor % puffs.length];
      matCursor++;

      const h1 = Math.sin(sIdx * 19.7 + k * 31.3) * 0.5;
      const h2 = Math.cos(sIdx * 23.1 + k * 17.9) * 0.5;
      const blastPush = Math.min(1, age / 0.32) * 7.5;
      const px = muz.pos[0] + muz.dir[0] * blastPush - age * (15.5 + k * 1.5) + h1 * 2.8;
      const py = muz.pos[1] + muz.dir[1] * blastPush + age * (2.8 + Math.abs(h2) * 1.6);
      const pz = muz.pos[2] + muz.dir[2] * blastPush - age * (4.8 + k * 0.6) + h2 * 3.0;

      const scale = 3.6 + age * 5.2 + Math.abs(h1) * 2.0;
      const fade = Math.min(1, age / 0.22) * Math.max(0, 1 - age / 3.3);
      mat.opacity = 0.28 * fade;
      mat.rotation = sIdx * 1.1 + k * 0.8 + age * 0.35;

      nodes.push(<sprite key={`${sIdx}_${k}`} material={mat} position={[px, py, pz]} scale={[scale, scale * 0.82, scale]} />);
    }
  }

  return <>{nodes}</>;
};

/** Sương bọt nước mềm (soft sprite) rẽ sóng ở sống mũi clipper & luồng chân vịt — hoàn toàn không có viền khối cứng */
const CruiserSeaSpray: React.FC<{ t: number; shipX: number; shipZ: number; shipHeading: number }> = ({
  t,
  shipX,
  shipZ,
  shipHeading,
}) => {
  const mats = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const m = new THREE.SpriteMaterial({
          map: softDot(),
          color: i < 8 ? '#edf6fb' : '#c9dce7',
          transparent: true,
          depthWrite: false,
        });
        return m;
      }),
    [],
  );

  const ca = Math.cos(shipHeading);
  const sa = -Math.sin(shipHeading);
  const toWorld = (lx: number, lz: number): [number, number] => [
    shipX + lx * ca - lz * sa,
    shipZ + lx * sa + lz * ca,
  ];

  const points: { lx: number; lz: number; size: number; op: number; lift: number }[] = [
    // Sương nước bắn tung ở mũi clipper rẽ sóng (+84..+93 m)
    { lx: 92.2, lz: 1.4, size: 7.5, op: 0.42, lift: 1.5 },
    { lx: 90.0, lz: 3.4, size: 8.6, op: 0.38, lift: 1.3 },
    { lx: 86.5, lz: 5.5, size: 9.2, op: 0.34, lift: 0.9 },
    { lx: 90.0, lz: -3.2, size: 8.0, op: 0.34, lift: 1.2 },
    { lx: 81.0, lz: 7.8, size: 9.8, op: 0.26, lift: 0.45 },
    { lx: 71.0, lz: 9.6, size: 10.5, op: 0.22, lift: 0.3 },
    // Dải bọt mờ mềm chạy dọc mạn phải & luồng đuôi chân vịt
    { lx: 52.0, lz: 10.8, size: 11.0, op: 0.18, lift: 0.2 },
    { lx: 26.0, lz: 11.4, size: 11.5, op: 0.16, lift: 0.2 },
    { lx: -4.0, lz: 11.6, size: 12.0, op: 0.16, lift: 0.2 },
    { lx: -36.0, lz: 11.2, size: 12.0, op: 0.16, lift: 0.2 },
    { lx: -68.0, lz: 9.8, size: 11.5, op: 0.18, lift: 0.2 },
    { lx: -94.0, lz: 2.5, size: 14.5, op: 0.28, lift: 0.35 },
    { lx: -108.0, lz: -0.5, size: 16.5, op: 0.24, lift: 0.25 },
    { lx: -124.0, lz: -2.8, size: 19.0, op: 0.18, lift: 0.2 },
  ];

  const bowSurge = 0.78 + 0.28 * Math.sin(t * 2.5 + 0.35);

  return (
    <group>
      {points.map((pt, idx) => {
        const [wx, wz] = toWorld(pt.lx, pt.lz);
        const wy = waveY(wx, wz, t, SWELL) + pt.lift * (idx < 4 ? bowSurge : 1);
        const pulse = 0.88 + 0.18 * Math.sin(t * 3.0 + idx * 1.23);
        const mat = mats[idx];
        mat.opacity = pt.op * pulse * (idx < 4 ? bowSurge : 1);
        mat.rotation = idx * 0.7 + t * 0.18;
        const s = pt.size * pulse;
        return <sprite key={idx} material={mat} position={[wx, wy, wz]} scale={[s, s * 0.52, s]} />;
      })}
    </group>
  );
};

const C01S04: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // USS Nashville tăng tốc rẽ sóng tách khỏi đội hình sang mạn phải (+Z)
  const pScene = prog(t, 48.78, 57.64);
  const pBreak = prog(t, 48.98, 54.2);
  const shipX = lerp(-42, 68, pScene);
  const shipZ = lerp(0, 15.5, pBreak);
  const shipHeading = lerp(-0.02, -0.11, pBreak);

  const pose = shipPose(shipX, shipZ, 185.4, 18.8, t, SWELL, shipHeading);
  const broadsideHeel =
    Math.max(0, 1 - Math.abs(t - (CUE.c01_s04_opens_fire + 0.18)) / 0.45) * -0.028 +
    Math.max(0, 1 - Math.abs(t - (CUE.c01_s04_thundering + 0.18)) / 0.5) * -0.036;
  const shipRoll = pose.roll - 0.04 * pBreak + broadsideHeel;
  const shipPitch = pose.pitch;

  // Cả 5 tháp pháo 3 nòng 6-inch xoay đồng loạt sang mạn phải +Z (turretYaw âm -> cả 15 nòng trước & sau đều chĩa rõ ra +Z!)
  const pAim = prog(t, 49.05, CUE.c01_s04_opens_fire - 0.22);
  const turretYaw = lerp(-0.18, -0.94, pAim);
  const gunElev = lerp(0.07, 0.15, pAim);

  // Xung giật nòng pháo (recoil 0..1) & cường độ ánh chớp đại bác cục bộ trên tháp pháo
  let recoil = 0;
  let flashBoost = 0;
  let activeFlashX = 48;
  for (const ev of SALVO_SCHEDULE) {
    const dt = t - ev.at;
    if (dt >= 0 && dt < 0.52) {
      const kick = dt < 0.055 ? dt / 0.055 : Math.pow(1 - (dt - 0.055) / 0.465, 1.6);
      if (kick > recoil) recoil = kick;
    }
    if (dt >= 0 && dt < 0.22) {
      const fl = Math.pow(1 - dt / 0.22, 1.5);
      flashBoost += fl;
      if (fl > 0.22) activeFlashX = TURRETS[ev.turretIdx].x;
    }
  }

  // Tàu sân bay chủ lực USS Hornet (CV-8) ở hậu cảnh sương mù mạn trái sau lưng khi Nashville tách khỏi đội hình
  const hornetX = -114 + (t - 52.0) * 6.5;
  const hornetZ = -172;
  const hornetPose = shipPose(hornetX, hornetZ, 251.4, 35.0, t, SWELL, 0.03);

  // ---------------- Quỹ đạo Camera hành động 3 nhịp bên mạn phải (+Z) ----------------
  // Nhịp 1 (48.98 -> 53.2 s): Khung rộng chéo mũi phải thấy trọn sống mũi clipper của Nashville rẽ sóng tách khỏi Hornet
  // Nhịp 2 (53.2 -> 54.8 s): Ép gần uy lực vào 3 tháp pháo mũi (9 nòng 6-inch) khạc lửa đỏ rực tại opens fire @ 53.58 s
  // Nhịp 3 (54.8 -> 57.44 s): Nâng cao & mở rộng sang ngang mạn phải thu trọn cả 5 tháp pháo (T1..T5) gầm rền thundering @ 55.78 s
  const pToFwdSalvo = prog(t, 49.35, CUE.c01_s04_opens_fire - 0.1);
  const pToBroadside = prog(t, CUE.c01_s04_six_inch - 0.25, CUE.c01_s04_thundering + 0.45);

  const relCamX = lerp(lerp(92, 66, pToFwdSalvo), 2, pToBroadside);
  const relCamY = lerp(lerp(14.8, 11.6, pToFwdSalvo), 16.6, pToBroadside);
  const relCamZ = lerp(lerp(102, 58, pToFwdSalvo), 108, pToBroadside);

  const relLookX = lerp(lerp(30, 46, pToFwdSalvo), 5, pToBroadside);
  const relLookY = lerp(lerp(11.4, 12.1, pToFwdSalvo), 12.4, pToBroadside);
  const relLookZ = lerp(lerp(0, 4.2, pToFwdSalvo), 2.5, pToBroadside);

  // Rung chấn máy quay dứt khoát khi đại bác 6-inch khai hỏa
  const shakeAmp = Math.min(1.1, flashBoost) * 0.38;
  const shakeY = Math.sin(t * 47.0) * shakeAmp;
  const shakeZ = Math.cos(t * 39.0) * shakeAmp * 0.55;

  const camX = shipX + relCamX;
  const camZ = shipZ + relCamZ + shakeZ;
  const desiredY = relCamY + shakeY;

  const lookX = shipX + relLookX;
  const lookY = pose.y * 0.5 + relLookY + shakeY * 0.45;
  const lookZ = shipZ + relLookZ;

  // Luôn kẹp camY >= waveY(camX, camZ, t, swell) + 1.68 m và kiểm tra sóng trước ống kính 3.5 m
  const dx = lookX - camX;
  const dz = lookZ - camZ;
  const dLen = Math.max(0.001, Math.hypot(dx, dz));
  const safeWaveY = Math.max(
    waveY(camX, camZ, t, SWELL) + 1.68,
    waveY(camX + (dx / dLen) * 3.5, camZ + (dz / dLen) * 3.5, t, SWELL) + 1.25,
  );
  const camY = Math.max(desiredY, safeWaveY);

  const camPos: V3 = [camX, camY, camZ];
  const camLook: V3 = [lookX, lookY, lookZ];
  const camFov = lerp(lerp(43.5, 40.5, pToFwdSalvo), 44.5, pToBroadside);
  const camRoll = Math.sin(t * 1.45 + 0.9) * 0.018 + shakeAmp * 0.024 * Math.sin(t * 33.0);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>
      <Stage
        {...STAGE_PRESETS.stormDawn}
        width={W}
        height={H}
        shadowArea={115}
        shadowCenter={[shipX, 10, shipZ]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Ánh sáng phản xạ từ bọt sóng & mây bão phía mạn phải (+Z) tôn rõ khối thép 5 tháp pháo & 15 nòng 6-inch */}
        <directionalLight position={[shipX + 45, 22, shipZ + 85]} color="#a7bfd4" intensity={0.85} />

        {/* Mặt biển động bão khơi Tây Thái Bình Dương */}
        <OceanSurface
          t={t}
          swell={SWELL}
          size={1200}
          seg={176}
          center={[shipX - 10, shipZ - 20]}
          palette="stormPacific"
        />

        {/* Bụi bọt sóng mềm ở sống mũi clipper & vệt rẽ nước tách đội hình */}
        <CruiserSeaSpray t={t} shipX={shipX} shipZ={shipZ} shipHeading={shipHeading} />

        {/* Hậu cảnh sương mù mạn trái: Tàu sân bay USS Hornet (CV-8) mà Nashville vừa tách khỏi đội hình */}
        <group
          position={[hornetX, hornetPose.y, hornetZ]}
          rotation={[hornetPose.roll, 0.03, hornetPose.pitch]}
        >
          <USSHornet hullNumber="8" showLaunchLines={true} flagWave={t * 5.0} />
        </group>

        {/* Chủ thể chính: Tuần dương hạm hạng nhẹ USS Nashville (CL-43) xoay 15 nòng 6-inch sang mạn phải +Z khai hỏa */}
        <group
          position={[shipX, pose.y, shipZ]}
          rotation={[shipRoll, shipHeading, shipPitch]}
        >
          <USSNashville turretYaw={turretYaw} gunElev={gunElev} recoil={recoil} />

          {/* Lửa đầu nòng <MuzzleBlast> tại cụm nòng tháp pháo + 3 tia lửa định hướng chính xác ở cả 3 nòng 6-inch */}
          {SALVO_SCHEDULE.map((ev, idx) => {
            const spec = TURRETS[ev.turretIdx];
            const centerMuz = getBarrelMuzzle(spec, 0, turretYaw, gunElev, recoil);
            const leftMuz = getBarrelMuzzle(spec, -1.38, turretYaw, gunElev, recoil);
            const rightMuz = getBarrelMuzzle(spec, 1.38, turretYaw, gunElev, recoil);
            return (
              <React.Fragment key={idx}>
                <MuzzleBlast
                  t={t}
                  at={ev.at}
                  pos={centerMuz.pos}
                  dir={centerMuz.dir}
                  size={ev.mainSize}
                  seed={10 + idx * 3}
                />

                <NavalBarrelFlameJet t={t} at={ev.at} pos={centerMuz.pos} dir={centerMuz.dir} length={10.2} />
                <NavalBarrelFlameJet t={t} at={ev.at + 0.015} pos={leftMuz.pos} dir={leftMuz.dir} length={8.6} />
                <NavalBarrelFlameJet t={t} at={ev.at + 0.022} pos={rightMuz.pos} dir={rightMuz.dir} length={8.6} />
              </React.Fragment>
            );
          })}

          {/* Khói thuốc súng xám trắng bị gió bão tạt vắt ngang thượng tầng & cột tàu 3 chân */}
          <GaleCorditeSmoke t={t} turretYaw={turretYaw} gunElev={gunElev} />

          {/* Ánh chớp đại bác cam rực chiếu loang mặt sóng bão & hắt sáng khối thép tháp pháo */}
          {flashBoost > 0.01 && (
            <>
              <pointLight
                color="#ff6d18"
                intensity={520 * Math.min(1.5, flashBoost)}
                distance={105}
                decay={1.65}
                position={[activeFlashX, 13.6, 15]}
              />
              <pointLight
                color="#ff9d3b"
                intensity={280 * Math.min(1.5, flashBoost)}
                distance={85}
                decay={1.75}
                position={[activeFlashX - 8, 19.5, 9]}
              />
            </>
          )}
        </group>
      </Stage>

      {/* Nhãn định danh duy nhất của cảnh: bật tại CUE.c01_s04_nashville (51.28 s) tới 57.10 s */}
      <Label
        t={t}
        text="USS NASHVILLE · 6-INCH"
        x={370}
        y={132}
        from={CUE.c01_s04_nashville}
        until={57.1}
      />
    </div>
  );
};

export default C01S04;
