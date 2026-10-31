import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { Explosion, MuzzleBlast, softDot, Trail, ballistic, ballisticPoints } from '@skill/military/3d/fx';
import { extrudeTop, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_STORM } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';

// ---------------- Bố cục toạ độ không gian 3D (mét thật 1:1) ----------------
// Xe M1A1 mắc lầy ở hố bùn sẫm tiền cảnh bên phải; xe M1A2 đồng đội trên gò cát khô phía xa bên trái (~42.7 m).
const MUD_X = 1.6;
const MUD_Z = -1.6;
const MUD_TANK_Y = -0.96; // Lún nghiêng sâu dưới mặt bùn ướt (-0.63 m)
const MUD_YAW = -0.46;
const MUD_HULL_PITCH = -0.08;
const MUD_HULL_ROLL = 0.07;
const MUD_TURRET_YAW = 0.14;
const MUD_GUN_PITCH = -0.04;

const RIDGE_X = -36.8;
const RIDGE_Z = -20.2;
const RIDGE_Y = 3.65; // Khoảng cách ngang giữa 2 xe = hypot(38.4, 18.6) = 42.67 m (đúng chuẩn 42–48 m)
const RIDGE_HULL_YAW = -0.16;

// Địa hình: lòng trũng bùn sẫm tự nhiên ở tiền cảnh phải + gò cát khô phía xa bên trái
const DESERT_MUD_HEIGHT = heightField({
  seed: 9103,
  amp: 2.1,
  scale: 88,
  flats: [[RIDGE_X, RIDGE_Z, 6.8, RIDGE_Y]],
  add: (x, z) => {
    const dMud = Math.hypot((x - MUD_X) * 0.82, (z - MUD_Z) * 1.06);
    const pit = -1.22 * Math.exp(-((dMud / 7.6) ** 2));
    const rutRim = 0.36 * Math.exp(-(((dMud - 8.1) / 2.4) ** 2));

    const dRidge = Math.hypot((x - RIDGE_X) / 24, (z - RIDGE_Z) / 19);
    const leftRidge = 3.55 * Math.exp(-(dRidge ** 2));

    const farDunes = 2.8 * Math.exp(-(((z + 68) / 24) ** 2)) * (0.6 + 0.4 * Math.sin(x * 0.045));
    return pit + rutRim + leftRidge + farDunes;
  },
});

const AVOID_TANKS_AND_CAM = (x: number, z: number) => {
  // Tránh lòng hố bùn, gò xe đồng đội và giữ thoáng sạch toàn bộ tiền cảnh sát ống kính camera
  if (Math.hypot(x - MUD_X, z - MUD_Z) < 11.2) return true;
  if (Math.hypot(x - RIDGE_X, z - RIDGE_Z) < 9.5) return true;
  if (z > 0.5 && Math.abs(x + 3.0) < 18) return true;
  // Giữ hành lang đường bắn 120mm thoáng sạch
  const tProj = ((x - RIDGE_X) * (MUD_X - RIDGE_X) + (z - RIDGE_Z) * (MUD_Z - RIDGE_Z)) / (44.5 * 44.5);
  if (tProj > 0.04 && tProj < 0.96) {
    const px = RIDGE_X + tProj * (MUD_X - RIDGE_X);
    const pz = RIDGE_Z + tProj * (MUD_Z - RIDGE_Z);
    if (Math.hypot(x - px, z - pz) < 4.0) return true;
  }
  return false;
};

// Biên dạng vũng bùn nhão bất đối xứng hữu cơ (24 đỉnh mượt, tránh hình đĩa tròn cứng)
const MUD_POOL_PTS: P2[] = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  const r = 6.4 + 1.15 * Math.sin(a * 3 + 0.7) + 0.65 * Math.cos(a * 5 - 0.4);
  return [Math.cos(a) * r * 1.12, Math.sin(a) * r * 0.76];
});

/** Chuyển toạ độ cục bộ trên tháp pháo chiếc M1A1 mắc bùn sang toạ độ thế giới chính xác 100% */
function stuckTurretLocalToWorld(localPt: V3): V3 {
  const v = new THREE.Vector3(...localPt);
  v.applyEuler(new THREE.Euler(0, MUD_TURRET_YAW, 0));
  v.add(new THREE.Vector3(0.08, 1.35, 0));
  v.sub(new THREE.Vector3(0, 0.65, 0));
  v.applyEuler(new THREE.Euler(MUD_HULL_ROLL, 0, MUD_HULL_PITCH));
  v.add(new THREE.Vector3(0, 0.65, 0));
  v.applyEuler(new THREE.Euler(0, MUD_YAW, 0));
  v.add(new THREE.Vector3(MUD_X, MUD_TANK_Y, MUD_Z));
  return [v.x, v.y, v.z];
}

/** Tính vị trí đầu nòng M256 và vector hướng bắn của chiếc Abrams đồng đội trên gò cát */
function friendlyMuzzleWorld(turretYaw: number, gunPitch: number, recoil: number): { pos: V3; dir: V3 } {
  const tip = new THREE.Vector3(5.28 - recoil * 0.3, 0, 0);
  const base = new THREE.Vector3(1.0, 0, 0);
  const toWorld = (p: THREE.Vector3): V3 => {
    const v = p.clone();
    v.applyEuler(new THREE.Euler(0, 0, gunPitch));
    v.add(new THREE.Vector3(0.36, 0.5, 0));
    v.applyEuler(new THREE.Euler(0, turretYaw, 0));
    v.add(new THREE.Vector3(0.08, 1.35, 0));
    v.applyEuler(new THREE.Euler(0, RIDGE_HULL_YAW, 0));
    v.add(new THREE.Vector3(RIDGE_X, RIDGE_Y, RIDGE_Z));
    return [v.x, v.y, v.z];
  };
  const pTip = toWorld(tip);
  const pBase = toWorld(base);
  const d = new THREE.Vector3(pTip[0] - pBase[0], pTip[1] - pBase[1], pTip[2] - pBase[2]).normalize();
  return { pos: pTip, dir: [d.x, d.y, d.z] };
}

const THERMITE_HATCH_POS = stuckTurretLocalToWorld([-0.2, 1.18, -0.58]);
const BUSTLE_IMPACT_POS = stuckTurretLocalToWorld([-2.12, 0.68, -1.26]);
const BLOWOUT_VENT_POS = stuckTurretLocalToWorld([-1.92, 1.14, 0.0]);

const TARGET_AIM = (() => {
  const turretOriginWorld = new THREE.Vector3(0.08, 1.85, 0)
    .applyEuler(new THREE.Euler(0, RIDGE_HULL_YAW, 0))
    .add(new THREE.Vector3(RIDGE_X, RIDGE_Y, RIDGE_Z));
  const dx = BUSTLE_IMPACT_POS[0] - turretOriginWorld.x;
  const dy = BUSTLE_IMPACT_POS[1] - turretOriginWorld.y;
  const dz = BUSTLE_IMPACT_POS[2] - turretOriginWorld.z;
  const worldYaw = Math.atan2(-dz, dx);
  const turretYaw = worldYaw - RIDGE_HULL_YAW;
  const horiz = Math.hypot(dx, dz);
  const gunPitch = Math.atan2(dy, horiz);
  return { turretYaw, gunPitch };
})();

/** Chùm tia lửa nhiệt nhôm (Thermite) trắng-cam sôi sục trên cửa nóc tháp pháo (458.74..468.9s) */
const ThermiteSparks: React.FC<{ t: number; pos: V3 }> = ({ t, pos }) => {
  const dt = t - CUE.c03_s10_thermite;
  if (dt < 0 || t > CUE.c03_s10_blowout_vent + 0.4) return null;
  const env = prog(t, CUE.c03_s10_thermite, CUE.c03_s10_thermite + 0.3) * (1 - prog(t, 468.5, 469.3));
  const flicker = 0.78 + 0.22 * Math.sin(dt * 34) * Math.cos(dt * 19);
  const smokeMat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false, color: '#e8dccb', opacity: 0.55 }),
    [],
  );

  return (
    <group position={pos}>
      <pointLight
        color="#ffae42"
        intensity={68 * env * flicker}
        distance={12}
        decay={1.6}
        position={[0, 0.35, 0]}
      />
      <mesh position={[0, 0.09, 0]} scale={[0.3 * env, 0.22 * env * flicker, 0.3 * env]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff9df" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.18, 0]} scale={[0.48 * env * flicker, 0.38 * env, 0.48 * env * flicker]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ff7b1c" transparent opacity={0.76 * env} toneMapped={false} />
      </mesh>

      {Array.from({ length: 32 }, (_, i) => {
        const period = 0.52 + rnd(i * 3 + 1) * 0.45;
        const phase = ((dt + rnd(i * 7 + 2) * period) % period) / period;
        const ang = rnd(i * 11 + 3) * Math.PI * 2;
        const spread = 0.55 + rnd(i * 13 + 4) * 1.5;
        const upVel = 2.2 + rnd(i * 17 + 5) * 2.6;
        const sx = Math.cos(ang) * spread * phase;
        const sz = Math.sin(ang) * spread * phase;
        const sy = upVel * phase - 3.6 * phase * phase;
        if (sy < -0.15) return null;
        const hot = phase < 0.35 ? '#fffbe6' : phase < 0.7 ? '#ffb338' : '#ff5518';
        return (
          <mesh key={i} position={[sx, 0.1 + sy, sz]} rotation={[phase * 8, i, phase * 5]}>
            <boxGeometry args={[0.05, 0.11, 0.05]} />
            <meshBasicMaterial color={hot} transparent opacity={(1 - phase * 0.82) * env} toneMapped={false} />
          </mesh>
        );
      })}

      {Array.from({ length: 7 }, (_, ki) => {
        const cycle = 2.1;
        const age = (dt + (ki / 7) * cycle) % cycle;
        if (dt < (ki / 7) * 0.4) return null;
        const p = age / cycle;
        const s = 0.45 + p * 1.5;
        return (
          <sprite
            key={`ts_${ki}`}
            material={smokeMat}
            position={[Math.sin(ki * 2.1) * 0.18 + p * 0.35, 0.28 + p * 2.5, Math.cos(ki * 1.7) * 0.18]}
            scale={[s, s, s]}
          />
        );
      })}
    </group>
  );
};

/**
 * Cột lửa núi lửa hữu cơ 100% bằng hạt thể tích (không dùng hình trụ cứng cylinderGeometry!)
 * phun thẳng đứng lên bầu trời hoàng hôn qua 2 nắp Blowout Panels đã bật mở (469.06..473.10s).
 */
const BlowoutSkywardColumn: React.FC<{ t: number; pos: V3 }> = ({ t, pos }) => {
  const dt = t - CUE.c03_s10_blowout_vent;
  if (dt < 0) return null;

  // Bật vọt nhanh để ngay từ 469.10s đã thấy rõ luồng lửa phụt thẳng đứng khỏi miệng blowout
  const rise = prog(t, CUE.c03_s10_blowout_vent - 0.02, CUE.c03_s10_blowout_vent + 0.16);
  const fullHeight = prog(t, CUE.c03_s10_blowout_vent, CUE.c03_s10_blowout_vent + 0.45);
  const sustain = lerp(1.0, 0.82, prog(t, 471.0, 473.1));
  const pulse = 0.88 + 0.12 * Math.sin(dt * 24);
  const colH = (3.8 * rise + 4.8 * fullHeight) * sustain;

  const whiteCoreMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: '#fff5c8',
        opacity: 0.92,
      }),
    [],
  );
  const hotAmberMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: '#ff9429',
        opacity: 0.82,
      }),
    [],
  );
  const deepFlameMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: '#ff5114',
        opacity: 0.68,
      }),
    [],
  );
  const darkSmokeMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
        color: '#3b322b',
        opacity: 0.68,
      }),
    [],
  );

  return (
    <group position={pos}>
      <pointLight
        color="#ff9d3b"
        intensity={250 * rise * sustain * pulse}
        distance={34}
        decay={1.45}
        position={[0, 2.8, 0]}
      />

      {/* Lõi trắng-vàng cường độ cao ngay miệng khoang đạn 36 viên giữa 2 nắp blowout mở dựng đứng */}
      {Array.from({ length: 14 }, (_, ci) => {
        const frac = ci / 13;
        const y = 0.12 + frac * colH * 0.56;
        const turbX = Math.sin(dt * 16 + ci * 1.9) * (0.08 + frac * 0.22);
        const turbZ = Math.cos(dt * 14 + ci * 2.3) * (0.14 + frac * 0.25);
        const w = (1.35 - frac * 0.58) * rise * (0.9 + 0.15 * Math.sin(dt * 22 + ci));
        return (
          <sprite
            key={`core_${ci}`}
            material={whiteCoreMat}
            position={[turbX, y, turbZ]}
            scale={[w, w * 1.45, w]}
          />
        );
      })}

      {/* Thân cột lửa hổ phách cuộn xoáy tự nhiên bốc thẳng đứng lên bầu trời hoàng hôn */}
      {Array.from({ length: 28 }, (_, i) => {
        const phase = (dt * 1.25 + i / 28) % 1;
        const y = 0.2 + phase * colH;
        const swirlA = dt * 5.5 + i * 2.1;
        const rad = (0.16 + phase * 0.62) * (0.55 + 0.45 * rnd(i * 7 + 1));
        const wx = Math.cos(swirlA) * rad;
        const wz = Math.sin(swirlA) * rad;
        // Mở rộng nhẹ ở giữa rồi vuốt nhọn mềm mại như lưỡi lửa thật ở đỉnh
        const profile = Math.sin(Math.min(1, phase * 1.08) * Math.PI * 0.88) * 0.85 + (1 - phase) * 0.72;
        const s = (1.15 + 1.45 * profile) * rise;
        const mat = phase < 0.32 ? whiteCoreMat : phase < 0.72 ? hotAmberMat : deepFlameMat;
        return (
          <sprite
            key={`fl_${i}`}
            material={mat}
            position={[wx, y, wz]}
            scale={[s * 0.92, s * 1.48, s * 0.92]}
          />
        );
      })}

      {/* Vòm khói dầu thuốc phóng đen-nâu cuộn nở phía trên đỉnh ngọn lửa */}
      {Array.from({ length: 14 }, (_, si) => {
        const age = dt - si * 0.11;
        if (age <= 0) return null;
        const loop = (age * 0.44) % 1;
        const y = colH * 0.76 + loop * 6.4;
        const s = 2.0 + loop * 3.6;
        return (
          <sprite
            key={`bs_${si}`}
            material={darkSmokeMat}
            position={[
              Math.sin(si * 2.4 + dt * 1.4) * (0.45 + loop * 1.4) + loop * 0.75,
              y,
              Math.cos(si * 1.9 + dt * 1.1) * (0.45 + loop * 1.2),
            ]}
            scale={[s, s, s]}
          />
        );
      })}

      {/* Tia lửa thuốc phóng bắn vọt thẳng đứng lên trời */}
      {Array.from({ length: 26 }, (_, ei) => {
        const period = 0.8 + rnd(ei * 5 + 9) * 0.65;
        const p = ((dt + rnd(ei * 7 + 3) * period) % period) / period;
        const y = p * (colH + 3.4);
        const r = (0.22 + p * 1.35) * (0.45 + rnd(ei * 11));
        const a = rnd(ei * 13) * Math.PI * 2 + dt * 1.5;
        return (
          <mesh key={`em_${ei}`} position={[Math.cos(a) * r, 0.3 + y, Math.sin(a) * r]}>
            <boxGeometry args={[0.065, 0.15, 0.065]} />
            <meshBasicMaterial
              color={p < 0.48 ? '#fff4b8' : '#ff6e1a'}
              transparent
              opacity={(1 - p) * rise}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const C03S10: React.FC = () => {
  const t = useT();

  // ---------------- Vật liệu vũng bùn ướt hữu cơ & bờ đất bánh xích cày lún ----------------
  const wetMudWaterMat = useMemo(() => plain('#2e2318', 0.17, 0.11), []);
  const churnedMudMat = useMemo(
    () =>
      paint({
        color: '#4a3928',
        camo: ['#322619', '#614d36'],
        camoScale: 1.5,
        wear: 0.35,
        dirt: 0.92,
        roughness: 0.38,
        metalness: 0.08,
        repeat: 0.5,
        seed: 91,
      }),
    [],
  );
  const mudPoolGeo = useMemo(() => extrudeTop(MUD_POOL_PTS, 0.06), []);
  const mudRutGeo = useMemo(() => rbox(8.8, 0.36, 0.95, 0.16), []);

  // ---------------- Diễn biến cơ khí 2 xe Abrams ----------------
  const pAim = prog(t, CUE.c03_s10_another_abrams - 0.55, CUE.c03_s10_friendly_shoot - 0.18);
  const friendlyTurretYaw = lerp(TARGET_AIM.turretYaw + 0.42, TARGET_AIM.turretYaw, pAim);
  const friendlyGunPitch = lerp(0.03, TARGET_AIM.gunPitch, pAim);

  const friendlyRecoil =
    t < CUE.c03_s10_friendly_shoot
      ? 0
      : Math.max(0, 1 - (t - CUE.c03_s10_friendly_shoot) / 0.44) ** 1.7;

  const muzzleState = useMemo(
    () => friendlyMuzzleWorld(friendlyTurretYaw, friendlyGunPitch, friendlyRecoil),
    [friendlyTurretYaw, friendlyGunPitch, friendlyRecoil],
  );

  const shotStartPos = useMemo(
    () => friendlyMuzzleWorld(TARGET_AIM.turretYaw, TARGET_AIM.gunPitch, 0).pos,
    [],
  );
  const shotPoints = useMemo(
    () => ballisticPoints(shotStartPos, BUSTLE_IMPACT_POS, 0.22, 64),
    [shotStartPos],
  );

  const SHOT_FLIGHT = 0.22;
  const IMPACT_AT = CUE.c03_s10_friendly_shoot + SHOT_FLIGHT;
  const shotFlyP = prog(t, CUE.c03_s10_friendly_shoot, IMPACT_AT, (x) => x);
  const trailFade = 1 - prog(t, CUE.c03_s10_friendly_shoot + 1.4, CUE.c03_s10_friendly_shoot + 2.9);
  const projectilePos = ballistic(shotFlyP, shotStartPos, BUSTLE_IMPACT_POS, 0.22);

  const cookoffGlow = prog(t, CUE.c03_s10_cookoff - 0.25, CUE.c03_s10_cookoff + 0.7);
  const blowoutOpen = prog(t, CUE.c03_s10_blowout_vent - 0.04, CUE.c03_s10_blowout_vent + 0.12);

  // ---------------- Ngôn ngữ Camera 3D ----------------
  // Bao quát trọn vẹn 100% cả 2 xe Abrams (từ đuôi xe đồng đội bên trái tới đầu nòng xe mắc lầy bên phải),
  // nâng nhẹ lấy trọn cột lửa blowout thẳng đứng rồi dừng hoàn toàn tĩnh lặng ở cuối cảnh để giao cho C04S01.
  const pCamWide = prog(t, 459.4, 463.0);
  const pCamVent = prog(t, CUE.c03_s10_cookoff, 470.5);

  const camX = lerp(lerp(-1.8, -2.5, pCamWide), -2.6, pCamVent);
  const camY = lerp(lerp(2.55, 2.75, pCamWide), 2.9, pCamVent);
  const camZ = lerp(lerp(23.2, 24.8, pCamWide), 25.6, pCamVent);

  const lookX = lerp(lerp(-7.6, -8.8, pCamWide), -8.5, pCamVent);
  const lookY = lerp(lerp(2.4, 2.8, pCamWide), 3.85, pCamVent);
  const lookZ = lerp(-8.2, -9.0, pCamWide);

  const camKick =
    0.11 * bump(t, CUE.c03_s10_friendly_shoot, 0.28) +
    0.16 * bump(t, IMPACT_AT, 0.34) +
    0.2 * bump(t, CUE.c03_s10_blowout_vent, 0.45);

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_DESERT_STORM.stage}
        shadowArea={54}
        shadowCenter={[-14, 1, -8]}
      >
        <Cam
          pos={[camX, camY + camKick * 0.45, camZ]}
          look={[lookX, lookY + camKick, lookZ]}
          fov={45}
        />

        {/* Địa hình sa mạc hoàng hôn 1991 */}
        <Terrain
          h={DESERT_MUD_HEIGHT}
          size={440}
          seg={256}
          center={[-16, -12]}
          colors={LOOK_DESERT_STORM.terrain}
          grainRepeat={44}
        />

        {/* Mặt bùn nhão sẫm màu ẩm ướt biên dạng hữu cơ & gờ bùn bánh xích cày lún */}
        <group position={[MUD_X, -0.66, MUD_Z]} rotation={[0, MUD_YAW, 0]}>
          <mesh geometry={mudPoolGeo} material={wetMudWaterMat} receiveShadow />
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[-0.5, 0.06, side * 2.05]}
              rotation={[0.04 * side, 0.03 * side, -0.03]}
              geometry={mudRutGeo}
              material={churnedMudMat}
              castShadow
              receiveShadow
            />
          ))}
        </group>

        {/* Đá tảng & bụi cỏ khô cháy nắng sa mạc (tránh toàn bộ tiền cảnh sát ống kính) */}
        <Scatter
          kind="rock"
          count={72}
          area={[-85, -85, 55, 18]}
          h={DESERT_MUD_HEIGHT}
          seed={310}
          scale={[0.45, 1.2]}
          avoid={AVOID_TANKS_AND_CAM}
          tint="#9c8363"
        />
        <Scatter
          kind="bush"
          count={38}
          area={[-85, -85, 55, 0]}
          h={DESERT_MUD_HEIGHT}
          seed={319}
          scale={[0.35, 0.72]}
          avoid={AVOID_TANKS_AND_CAM}
          tint="#d19a5e"
        />

        {/* ==================== 1. XE M1A1 MẮC LẦY Ở TIỀN CẢNH BÊN PHẢI ==================== */}
        <M1A2Abrams
          variant="m1a1_mud"
          camo="desert"
          position={[MUD_X, MUD_TANK_Y, MUD_Z]}
          rotation={[0, MUD_YAW, 0]}
          hullPitch={MUD_HULL_PITCH}
          hullRoll={MUD_HULL_ROLL}
          turretYaw={MUD_TURRET_YAW}
          gunPitch={MUD_GUN_PITCH}
          blowoutOpen={blowoutOpen}
          exhaustHeat={0.12}
        />

        {/* Tia lửa nhiệt nhôm (Thermite) sôi sục từ cửa nóc tháp pháo lúc 458.74s */}
        <ThermiteSparks t={t} pos={THERMITE_HATCH_POS} />

        {/* Vết đạn 120mm xuyên đỏ rực trên sườn khoang đạn đuôi & ánh lửa cook-off âm ỉ bên trong */}
        {t >= IMPACT_AT && (
          <group position={BUSTLE_IMPACT_POS}>
            <mesh>
              <sphereGeometry args={[0.14 + 0.05 * cookoffGlow, 12, 10]} />
              <meshBasicMaterial
                color={cookoffGlow > 0.3 ? '#fff0a8' : '#ff7a24'}
                toneMapped={false}
              />
            </mesh>
            <pointLight
              color="#ff6e1f"
              intensity={18 + 95 * cookoffGlow * (0.8 + 0.2 * Math.sin(t * 28))}
              distance={8}
              decay={1.7}
            />
          </group>
        )}

        {/* Ánh lửa rò rỉ dưới khe nắp blowout ngay khoảnh khắc đạn kích nổ bên trong (467.54..469.06s) */}
        {cookoffGlow > 0.01 && blowoutOpen < 0.95 && (
          <group position={BLOWOUT_VENT_POS}>
            <pointLight
              color="#ff7a1c"
              intensity={85 * cookoffGlow * (0.75 + 0.25 * Math.sin(t * 36))}
              distance={9}
              decay={1.6}
              position={[0, 0.35, 0]}
            />
            <mesh scale={[0.85 * cookoffGlow, 0.12, 1.35 * cookoffGlow]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ff9e36" transparent opacity={0.75 * cookoffGlow} toneMapped={false} />
            </mesh>
          </group>
        )}

        {/* ==================== 2. XE M1A2 ĐỒNG ĐỘI TRÊN GÒ ĐẤT KHÔ PHÍA XA BÊN TRÁI (~44.5 m) ==================== */}
        <M1A2Abrams
          variant="m1a2"
          camo="desert"
          position={[RIDGE_X, RIDGE_Y, RIDGE_Z]}
          rotation={[0, RIDGE_HULL_YAW, 0]}
          turretYaw={friendlyTurretYaw}
          gunPitch={friendlyGunPitch}
          recoil={friendlyRecoil}
          citvYaw={-0.25}
          exhaustHeat={0.45}
        />

        {/* Chớp lửa đầu nòng M256 120mm trên gò cát lúc 461.24s */}
        <MuzzleBlast
          t={t}
          at={CUE.c03_s10_friendly_shoot}
          pos={muzzleState.pos}
          dir={muzzleState.dir}
          size={1.95}
          seed={12}
        />

        {/* Vệt đạn 120mm <Trail> rạch ngang bầu trời hoàng hôn (góc lệch trục camera ~43° > 35°) */}
        {t >= CUE.c03_s10_friendly_shoot && trailFade > 0.005 && (
          <>
            <Trail
              points={shotPoints}
              upto={shotFlyP}
              color="#ff9f2e"
              width={0.14}
              opacity={0.5 * trailFade}
              glow
            />
            <Trail
              points={shotPoints}
              upto={shotFlyP}
              color="#fff0a6"
              width={0.058}
              opacity={0.95 * trailFade}
              glow
            />
            {t <= IMPACT_AT && (
              <group position={projectilePos}>
                <mesh>
                  <sphereGeometry args={[0.16, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
                <pointLight color="#ffd166" intensity={85} distance={12} decay={1.5} />
              </group>
            )}
          </>
        )}

        {/* Vụ nổ xuyên giáp vào khoang đạn đuôi xe mắc bùn */}
        <Explosion
          t={t}
          at={IMPACT_AT}
          pos={BUSTLE_IMPACT_POS}
          size={1.8}
          seed={41}
          smokeLife={5.0}
          smoke="#5c5248"
        />

        {/* ==================== 3. NẮP BLOWOUT XẢ CỘT LỬA THẲNG ĐỨNG LÊN TRỜI — THÂN THÉP NGUYÊN VẸN ==================== */}
        {/* <Explosion> kích thước vừa phải đặt nhích lên trên nắp blowout để tạo mảnh văng & cột khói mà không nuốt mất hình dáng tháp pháo nguyên vẹn */}
        <Explosion
          t={t}
          at={CUE.c03_s10_blowout_vent}
          pos={[BLOWOUT_VENT_POS[0], BLOWOUT_VENT_POS[1] + 0.85, BLOWOUT_VENT_POS[2]]}
          size={1.55}
          seed={88}
          smokeLife={6.5}
          smoke="#4a4037"
        />
        <BlowoutSkywardColumn t={t} pos={BLOWOUT_VENT_POS} />
      </Stage>

      {/* Nhãn <Label> duy nhất của cảnh: neo thông số pháo M256 120mm ở góc trên bên trái thoáng sạch */}
      <Label
        t={t}
        text="M256 120mm"
        x={380}
        y={142}
        from={CUE.c03_s10_120mm}
        until={465.4}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C03S10;
