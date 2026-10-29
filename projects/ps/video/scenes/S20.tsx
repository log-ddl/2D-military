import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { lerp, prog } from '@kit/theme';
import { useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { MuzzleBlast, Trail, ballisticPoints, softDot } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL3D, STAGE_DAWN, TERRAIN_STEPPE } from '../local/palette';
import {
  Kh101,
  PAC3,
  PatriotLauncher,
  PatriotRadar,
  Shahed136,
  patriotMuzzlePos,
} from '../local/models';

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Lòng thung lũng uốn lượn nhẹ hình chữ S dẫn thẳng về ngọn đồi trận địa Patriot phía xa (x ≈ 73..86 m)
const valleyZ = (x: number) => Math.sin(x * 0.03) * 9.5;

// Đài AN/MPQ-65 bên cánh trái đồi (z = -9.0) xoay +0.28 rad hướng chéo thẳng vào tâm lòng thung lũng (+Z)
const RADAR_POS: V3 = [73, 15.6, -9.0];
const RADAR_YAW = Math.PI + 0.28;

// Hai bệ phóng M903 bên cánh phải đồi (z = +8.2, +19.5) xoay hướng nòng xuống tâm lòng thung lũng
const LAUNCHER1_POS: V3 = [78, 15.2, 8.2];
const LAUNCHER1_YAW = Math.PI - 0.16;
const LAUNCHER1_ELEV = 26;

const LAUNCHER2_POS: V3 = [86, 15.5, 19.5];
const LAUNCHER2_YAW = Math.PI - 0.2;

const VALLEY_TERRAIN_H = heightField({
  seed: 20,
  amp: 3.2,
  scale: 76,
  oct: 4,
  flats: [
    [RADAR_POS[0], RADAR_POS[2], 9.2, RADAR_POS[1]],
    [LAUNCHER1_POS[0], LAUNCHER1_POS[2], 9.2, LAUNCHER1_POS[1]],
    [LAUNCHER2_POS[0], LAUNCHER2_POS[2], 8.5, LAUNCHER2_POS[1]],
  ],
  add: (x, z) => {
    const vz = valleyZ(x);
    const dz = z - vz;
    // Hai triền đồi thông hai bên nâng cao 24..30 m ôm lấy lòng thung lũng thấp ở giữa (x < 50)
    const valleyFade = 1 - prog(x, 42, 70, (u) => u);
    const walls = 25.0 * (1 - Math.exp(-((dz / 24) ** 2))) * valleyFade;

    // Ngọn đồi chiến thuật đặt khẩu đội Patriot nổi cao rõ rệt ở cuối tầm nhìn thung lũng (x = 50..105)
    const hillRise = prog(x, 42, 70, (u) => u * u * (3 - 2 * u));
    const hillBack = 1 - 0.35 * prog(x, 96, 138, (u) => u);
    const patriotHill = 15.0 * hillRise * hillBack * Math.exp(-((z / 52) ** 2));

    return walls + patriotHill - 1.2 * valleyFade * Math.exp(-((dz / 13) ** 2));
  },
});

const avoidValleyCorridorAndPads = (x: number, z: number) => {
  if (Math.abs(z - valleyZ(x)) < 14.0 && x < 66) return true;
  if (x > 48 && x < 98 && Math.abs(z) < 25) return true;
  if (Math.hypot(x - RADAR_POS[0], z - RADAR_POS[2]) < 15) return true;
  if (Math.hypot(x - LAUNCHER1_POS[0], z - LAUNCHER1_POS[2]) < 15) return true;
  if (Math.hypot(x - LAUNCHER2_POS[0], z - LAUNCHER2_POS[2]) < 13) return true;
  return false;
};

const avoidRocksFloor = (x: number, z: number) => {
  if (Math.abs(z - valleyZ(x)) < 8.0 && x < 58) return true;
  if (Math.hypot(x - RADAR_POS[0], z - RADAR_POS[2]) < 12) return true;
  if (Math.hypot(x - LAUNCHER1_POS[0], z - LAUNCHER1_POS[2]) < 12) return true;
  return false;
};

/** Xoay mô hình có mũi +X bám đúng theo vector vận tốc `dir` kèm góc nghiêng cánh `bankRad`. */
function orientAlongVelocity(dir: THREE.Vector3, bankRad = 0): V3 {
  const forward = dir.clone().normalize();
  const qAlign = new THREE.Quaternion().setFromUnitVectors(X_AXIS, forward);
  if (Math.abs(bankRad) > 1e-4) {
    const qBank = new THREE.Quaternion().setFromAxisAngle(X_AXIS, bankRad);
    qAlign.multiply(qBank);
  }
  const e = new THREE.Euler().setFromQuaternion(qAlign);
  return [e.x, e.y, e.z];
}

// Quỹ đạo Camera bay lướt thấp dọc lòng thung lũng từ x = -33 tới x = +26 (tốc độ ~2.90 m/s)
const camXAt = (t: number) => lerp(-33.0, 26.0, prog(t, 362.8, 383.35, (x) => x));

// Đội hình 9 chiếc UAV Shahed-136 bay nối đuôi phía TRƯỚC ống kính camera (cự ly 7.8 m .. 38 m trước mũi camera!)
// Độ cao 10.6..12.3 m tạo tầng bay trung tâm rõ nét để cặp Kh-101 luồn thấp hơn hẳn bên dưới (8.85..9.15 m)
const SHAHED_SPECS = [
  { x0: -25.2, dz: -1.3, alt: 10.7, speed: 3.1, phase: 0.3 },  // Chiếc cận cảnh nhất (~7.8 m trước camera)
  { x0: -21.4, dz: 2.4, alt: 11.4, speed: 3.12, phase: 1.5 },  // Chiếc thứ 2 (~11.6 m trước camera)
  { x0: -17.6, dz: -2.7, alt: 10.6, speed: 3.11, phase: 2.7 },
  { x0: -13.8, dz: 0.8, alt: 12.0, speed: 3.13, phase: 3.8 },
  { x0: -9.8, dz: 3.6, alt: 11.0, speed: 3.12, phase: 5.0 },
  { x0: -5.8, dz: -1.6, alt: 12.3, speed: 3.14, phase: 1.1 },
  { x0: -1.6, dz: 2.1, alt: 10.8, speed: 3.11, phase: 2.2 },
  { x0: 2.6, dz: -2.8, alt: 11.6, speed: 3.13, phase: 3.4 },
  { x0: 7.0, dz: 0.5, alt: 11.2, speed: 3.12, phase: 4.6 },    // Chiếc dẫn đầu tiến thẳng vào chùm sóng radar
] as const;

function shahedPosAt(idx: number, t: number): THREE.Vector3 {
  const s = SHAHED_SPECS[idx];
  const dt = t - 363.0;
  const x = s.x0 + dt * s.speed;
  const weave = Math.sin(t * 0.9 + s.phase) * 0.95;
  const bob = Math.cos(t * 1.3 + s.phase) * 0.25;
  const hillLift = 2.6 * prog(x, 46, 70, (u) => u * u);
  return new THREE.Vector3(x, s.alt + bob + hillLift, valleyZ(x) + s.dz + weave);
}

// Cặp tên lửa hành trình tàng hình Kh-101 bay ở độ cao THẤP HƠN HẲN BẦY SHAHED (y ≈ 8.85..9.15 m vs 10.6..12.3 m),
// từ phía sau lao vút vượt qua mặt camera đúng mốc CUE.s20_cruise_lure (377.88s) với tốc độ 6.1 m/s!
const KH101_SPECS = [
  { passTime: CUE.s20_cruise_lure - 0.3, dz: -1.0, alt: 8.85, speed: 6.15 },
  { passTime: CUE.s20_cruise_lure + 0.05, dz: 1.55, alt: 9.15, speed: 5.95 },
] as const;

function kh101PosAt(idx: number, t: number): THREE.Vector3 {
  const k = KH101_SPECS[idx];
  const passX = camXAt(k.passTime) + 3.4;
  const x = passX + (t - k.passTime) * k.speed;
  const z = valleyZ(x) + k.dz;
  const hillFollow = 3.2 * prog(x, 42, 66, (u) => u * u);
  return new THREE.Vector3(x, k.alt + hillFollow, z);
}

/** Tính toạ độ thế giới & hướng nòng của ống phóng thứ `slot` trên PatriotLauncher #1. */
function worldLauncherMuzzle(slot: number): { pos: V3; dir: V3 } {
  const localPos = new THREE.Vector3(...patriotMuzzlePos(LAUNCHER1_ELEV, 0, slot));
  localPos.applyAxisAngle(Y_AXIS, LAUNCHER1_YAW).add(new THREE.Vector3(...LAUNCHER1_POS));

  const elRad = (LAUNCHER1_ELEV * Math.PI) / 180;
  const localDir = new THREE.Vector3(Math.cos(elRad), Math.sin(elRad), 0);
  localDir.applyAxisAngle(Y_AXIS, LAUNCHER1_YAW).normalize();

  return {
    pos: [localPos.x, localPos.y, localPos.z],
    dir: [localDir.x, localDir.y, localDir.z],
  };
}

/** Dải sương mù bình minh đáy thung lũng & chùm sóng radar xanh lơ chiếu thẳng vào đội hình UAV. */
const ValleyMistAndRadarSweep: React.FC<{
  t: number;
  radarExposed: boolean;
  beamYaw: number;
  beamPitch: number;
}> = ({ t, radarExposed, beamYaw, beamPitch }) => {
  const mistMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#cddce6',
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      }),
    [],
  );

  const beamOrigin = useMemo(() => {
    const local = new THREE.Vector3(0.98 + 2.36, 3.07, 0);
    local.applyAxisAngle(Y_AXIS, RADAR_YAW).add(new THREE.Vector3(...RADAR_POS));
    return local;
  }, []);

  const longConeGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(3.6, 1.05, 44, 36, 1, true);
    g.rotateZ(-Math.PI / 2);
    g.translate(22, 0, 0);
    return g;
  }, []);

  const revealP = prog(t, CUE.s20_radar_expose, CUE.s20_radar_expose + 0.45, Easing.out(Easing.cubic));

  return (
    <>
      {[-22, -4, 14, 30, 44].map((mx, i) => (
        <sprite
          key={i}
          material={mistMat}
          position={[mx, 2.5 + (i % 2) * 0.7, valleyZ(mx) + (i % 2 === 0 ? 7.2 : -7.2)]}
          scale={[24, 6.0, 1]}
        />
      ))}

      {radarExposed && (
        <group position={[beamOrigin.x, beamOrigin.y, beamOrigin.z]} rotation={[0, RADAR_YAW + beamYaw, 0]}>
          <group rotation={[0, 0, beamPitch]}>
            <pointLight color={PAL3D.cyanBeam} intensity={55 * revealP} distance={32} decay={1.6} position={[2.2, 0, 0]} />
            <mesh geometry={longConeGeo}>
              <meshBasicMaterial
                color={PAL3D.cyanBeam}
                transparent
                opacity={0.095 * revealP}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh geometry={longConeGeo} scale={[1, 0.36, 0.36]}>
              <meshBasicMaterial
                color="#b8f8ff"
                transparent
                opacity={0.17 * revealP}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {[0, 1, 2, 3].map((k) => {
              const waveU = (t * 1.45 + k / 4) % 1;
              const wx = 1.5 + waveU * 41;
              const wr = lerp(1.08, 3.45, waveU);
              return (
                <mesh key={k} position={[wx, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <ringGeometry args={[wr * 0.88, wr, 40]} />
                  <meshBasicMaterial
                    color={PAL3D.cyanBeam}
                    transparent
                    opacity={0.34 * (1 - waveU * 0.85) * revealP}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              );
            })}
          </group>
        </group>
      )}
    </>
  );
};

const S20: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Đài radar AN/MPQ-65 trên đỉnh đồi bật phát sóng lộ diện lúc CUE.s20_radar_expose (376.12s)
  const radarExposed = t >= CUE.s20_radar_expose;
  const radarGlow = radarExposed
    ? lerp(0.35, 1.45, prog(t, CUE.s20_radar_expose, CUE.s20_radar_expose + 0.4))
    : 0.14;
  const beamYaw = radarExposed ? 0.06 + Math.sin((t - CUE.s20_radar_expose) * 2.1) * 0.14 : 0;
  const beamPitch = -0.14 + (radarExposed ? Math.cos((t - CUE.s20_radar_expose) * 1.6) * 0.025 : 0);

  // Khẩu đội Patriot trúng bẫy nhử: khai hoả liên tiếp 2 quả PAC-3 lúc 380.60s và 381.15s
  const tFire1 = CUE.s20_patriot_fire_bait; // 380.60s
  const tFire2 = CUE.s20_patriot_fire_bait + 0.55; // 381.15s
  const loadedCount = t >= tFire2 ? 14 : t >= tFire1 ? 15 : 16;

  const muzzle1 = useMemo(() => worldLauncherMuzzle(0), []);
  const muzzle2 = useMemo(() => worldLauncherMuzzle(5), []);

  // Hai quả PAC-3 phóng vòng cung từ đỉnh đồi (x = 78) bổ xuống đón đầu cặp Kh-101 ở giữa thung lũng (x ≈ 50..53 m)
  const pac1Arc = useMemo(
    () => ballisticPoints(muzzle1.pos, [52.5, 10.4, valleyZ(52.5) - 0.9], 7.4, 48),
    [muzzle1.pos],
  );
  const pac2Arc = useMemo(
    () => ballisticPoints(muzzle2.pos, [49.5, 10.8, valleyZ(49.5) + 1.5], 8.0, 48),
    [muzzle2.pos],
  );

  const pac1P = prog(t, tFire1, 383.45, Easing.out(Easing.quad));
  const pac2P = prog(t, tFire2, 383.8, Easing.out(Easing.quad));

  const getArcPose = (pts: V3[], p: number): { pos: V3; rot: V3 } => {
    const fIdx = Math.min(pts.length - 1.001, Math.max(0, p * (pts.length - 1)));
    const i0 = Math.floor(fIdx);
    const i1 = Math.min(pts.length - 1, i0 + 1);
    const frac = fIdx - i0;
    const pos: V3 = [
      lerp(pts[i0][0], pts[i1][0], frac),
      lerp(pts[i0][1], pts[i1][1], frac),
      lerp(pts[i0][2], pts[i1][2], frac),
    ];
    const dir = new THREE.Vector3(
      pts[i1][0] - pts[i0][0],
      pts[i1][1] - pts[i0][1],
      pts[i1][2] - pts[i0][2],
    );
    if (dir.lengthSq() < 1e-6) dir.set(-1, 0.3, 0);
    return { pos, rot: orientAlongVelocity(dir) };
  };

  // Camera bay bám thấp sát sườn trái đội hình 9 chiếc Shahed-136 hướng thẳng về đồi Patriot:
  // Giữ góc nhìn gần ngang (lookY ≈ 10.9..11.5 m) để thấy ĐỒNG THỜI cả:
  // (1) Đội hình 9 chiếc Shahed-136 (y ≈ 10.6..12.3 m),
  // (2) Cặp Kh-101 vượt mặt thấp hơn hẳn bên dưới (y ≈ 8.85..9.15 m), VÀ
  // (3) Đài Radar + 2 bệ phóng Patriot trên đỉnh đồi phía trước (y = 15.2..19.5 m)!
  const camX = camXAt(t);
  const pEngage = prog(t, 374.5, 378.0, Easing.inOut(Easing.cubic));
  const camY = lerp(10.8, 11.25, pEngage);
  const camZ = valleyZ(camX) - lerp(3.3, 2.5, pEngage);

  const midSwarm = shahedPosAt(3, t);
  const lookX = lerp(midSwarm.x + 14, 70.0, pEngage);
  const lookY = lerp(10.9, 11.55, pEngage);
  const lookZ = lerp(valleyZ(midSwarm.x + 8) + 0.4, 1.2, pEngage);
  const fov = lerp(43, 41, pEngage);

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_DAWN}
        shadowArea={58}
        shadowCenter={[Math.min(62, camX + 26), 10, 0]}
      >
        <Cam pos={[camX, camY, camZ]} look={[lookX, lookY, lookZ]} fov={fov} />

        {/* Địa hình thung lũng uốn lượn & hai triền đồi thông bình minh */}
        <Terrain
          h={VALLEY_TERRAIN_H}
          size={460}
          seg={220}
          center={[22, 0]}
          colors={TERRAIN_STEPPE}
          grainRepeat={44}
        />
        <Scatter
          kind="pine"
          count={360}
          area={[-105, -92, 135, 92]}
          h={VALLEY_TERRAIN_H}
          seed={20}
          scale={[0.85, 1.45]}
          avoid={avoidValleyCorridorAndPads}
          tint="#9ab09b"
        />
        <Scatter
          kind="bush"
          count={150}
          area={[-90, -65, 118, 65]}
          h={VALLEY_TERRAIN_H}
          seed={21}
          scale={[0.7, 1.25]}
          avoid={avoidValleyCorridorAndPads}
          tint="#8ca185"
        />
        <Scatter
          kind="rock"
          count={85}
          area={[-85, -55, 115, 55]}
          h={VALLEY_TERRAIN_H}
          seed={22}
          scale={[0.6, 1.35]}
          avoid={avoidRocksFloor}
        />

        <ValleyMistAndRadarSweep
          t={t}
          radarExposed={radarExposed}
          beamYaw={beamYaw}
          beamPitch={beamPitch}
        />

        {/* Khẩu đội Patriot trên đỉnh đồi phía xa: 1 đài Radar AN/MPQ-65 + 2 bệ phóng M903 */}
        <PatriotRadar
          position={RADAR_POS}
          rotation={[0, RADAR_YAW, 0]}
          activeGlow={radarGlow}
          showBeam={false}
          beamAngle={[beamYaw, beamPitch]}
        />
        <PatriotLauncher
          position={LAUNCHER1_POS}
          rotation={[0, LAUNCHER1_YAW, 0]}
          elev={LAUNCHER1_ELEV}
          loadedCount={loadedCount}
        />
        <PatriotLauncher
          position={LAUNCHER2_POS}
          rotation={[0, LAUNCHER2_YAW, 0]}
          elev={34}
          loadedCount={16}
        />

        {/* Đội hình 9 chiếc UAV giá rẻ Shahed-136 cánh tam giác quay tít chân vịt luồn lách suốt lòng thung lũng */}
        {SHAHED_SPECS.map((_, idx) => {
          const p0 = shahedPosAt(idx, t);
          const p1 = shahedPosAt(idx, t + 0.05);
          const vel = p1.clone().sub(p0);
          const bank = Math.cos(t * 0.9 + SHAHED_SPECS[idx].phase) * -0.18;
          return (
            <Shahed136
              key={`sh_${idx}`}
              position={[p0.x, p0.y, p0.z]}
              rotation={orientAlongVelocity(vel, bank)}
              propSpin={t * 48 + idx * 1.9}
            />
          );
        })}

        {/* Cặp tên lửa hành trình tàng hình Kh-101 từ phía sau lao vút qua mặt camera ở độ cao thấp hơn cả bầy Shahed */}
        {t >= CUE.s20_cruise_lure - 0.8 &&
          KH101_SPECS.map((spec, idx) => {
            const p0 = kh101PosAt(idx, t);
            const p1 = kh101PosAt(idx, t + 0.04);
            const vel = p1.clone().sub(p0);
            const bank = idx === 0 ? 0.1 : -0.11;

            const trailPts: V3[] = Array.from({ length: 16 }, (__, k) => {
              const tk = lerp(Math.max(CUE.s20_cruise_lure - 0.8, t - 2.4), t, k / 15);
              const pk = kh101PosAt(idx, tk);
              return [pk.x - 3.2, pk.y - 0.45, pk.z];
            });

            return (
              <React.Fragment key={`kh_${idx}`}>
                {t > spec.passTime - 0.35 && (
                  <Trail points={trailPts} upto={1} color="#ffd59e" width={0.1} opacity={0.5} glow />
                )}
                <Kh101
                  position={[p0.x, p0.y, p0.z]}
                  rotation={orientAlongVelocity(vel, bank)}
                  plume={0.85}
                  wingDeploy={1}
                />
              </React.Fragment>
            );
          })}

        {/* Bệ phóng Patriot trên đồi xa bị nhử khai hoả liên tiếp 2 quả PAC-3 lúc 380.60s & 381.15s */}
        <MuzzleBlast t={t} at={tFire1} pos={muzzle1.pos} dir={muzzle1.dir} size={2.6} seed={201} />
        <MuzzleBlast t={t} at={tFire2} pos={muzzle2.pos} dir={muzzle2.dir} size={2.6} seed={202} />

        {t >= tFire1 && (
          <>
            <Trail points={pac1Arc} upto={pac1P} color="#ffe0a3" width={0.19} opacity={0.9} glow />
            {(() => {
              const pose = getArcPose(pac1Arc, pac1P);
              return <PAC3 position={pose.pos} rotation={pose.rot} plume={1.15} />;
            })()}
          </>
        )}

        {t >= tFire2 && (
          <>
            <Trail points={pac2Arc} upto={pac2P} color="#ffe0a3" width={0.19} opacity={0.9} glow />
            {(() => {
              const pose = getArcPose(pac2Arc, pac2P);
              return <PAC3 position={pose.pos} rotation={pose.rot} plume={1.15} />;
            })()}
          </>
        )}
      </Stage>
    </AbsoluteFill>
  );
};

export default S20;
