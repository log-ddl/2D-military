// C04S10 (796.80–809.04 s) — THUẦN 3D (STAGE_PRESETS.midwayDay): Đại cảnh kết phim hào hùng tại Midway
// Mở từ góc chéo cao (y = 95 m) lướt qua vòng tròn đỏ Hinomaru toác lửa trên sàn gỗ chiếc IJNCarrier đầu tiên,
// rồi kéo lùi nâng cao ngoạn mục (y -> 265 m) thu trọn đội hình kim cương 4 tàu sân bay Kido Butai (Akagi, Kaga, Soryu, Hiryu)
// đồng loạt bốc cháy ngùn ngụt, nghiêng 8°->16° chìm dần giữa vòng bọt sóng trắng, chân trời Đông Bắc là hạm đội Mỹ chiến thắng.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { deg, lerp, prog, rnd, useT } from '@core/time';
import { Explosion, softDot } from '@skill/military/3d/fx';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { OCEAN_PALETTE, P2D, STAGE_PRESETS } from '../design/palette';
import { IJNCarrier } from '../parts/IJNCarrier';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';
import { USSHornet } from '../parts/USSHornet';
import { USSNashville } from '../parts/USSNashville';

// ---------------- Cấu hình đội hình kim cương 4 tàu sân bay Kido Butai (dài 250 m mỗi chiếc) ----------------
type CarrierSpec = {
  name: string;
  x: number;
  z: number;
  yaw: number; // rad quanh +Y (xoay chéo tự nhiên khi mất lái để cả 4 chiếc đều phô trọn thân dài 250 m!)
  rollDeg0: number; // góc nghiêng ban đầu (8°..9.5°)
  rollDeg1: number; // góc nghiêng khi chìm sâu (14.8°..16.5°)
  pitch0: number; // rad chúi mũi / chúi đuôi
  pitch1: number;
  sink0: number; // độ lún mớn nước đầu cảnh (m)
  sink1: number; // độ lún mớn nước cuối cảnh (m)
  bowFire?: boolean; // lửa cháy xém mép vòng tròn đỏ Hinomaru ở chiếc dẫn đầu
  blasts: { at: number; lx: number; lz: number; size: number; seed: number; life: number }[];
};

const KIDO_BUTAI: CarrierSpec[] = [
  {
    // 1. IJN Akagi — Tiền cảnh trung tâm (mở cảnh sát sàn gỗ & vòng tròn đỏ Hinomaru Ø 15 m tại local x = +82 m)
    name: 'Akagi',
    x: -95,
    z: 182,
    yaw: 0.16,
    rollDeg0: 8.2,
    rollDeg1: 15.8,
    pitch0: -0.018,
    pitch1: -0.044,
    sink0: 0.7,
    sink1: 7.2,
    bowFire: true,
    blasts: [
      { at: 793.2, lx: 3.5, lz: 1.2, size: 10.5, seed: 11, life: 17 },
      { at: 795.0, lx: -45.5, lz: -2.0, size: 11.2, seed: 12, life: 16 },
      { at: 796.25, lx: 47.0, lz: -1.6, size: 8.8, seed: 13, life: 15 },
      { at: 797.55, lx: -20.0, lz: 2.2, size: 9.6, seed: 14, life: 14 },
      { at: CUE.c04_s10_ambush_midway + 0.1, lx: 4.5, lz: 0.8, size: 10.8, seed: 15, life: 12 },
      { at: 803.55, lx: -44.0, lz: 1.4, size: 10.2, seed: 16, life: 10 },
      { at: CUE.c04_s10_turning_tide, lx: 45.5, lz: -1.0, size: 9.8, seed: 17, life: 8 },
      { at: 808.1, lx: 2.0, lz: -1.2, size: 9.5, seed: 18, life: 6 },
    ],
  },
  {
    // 2. IJN Kaga — Cánh trái đội hình kim cương (nghiêng mạnh sang mạn trái phơi trọn mặt sàn gỗ rực lửa)
    name: 'Kaga',
    x: -275,
    z: -95,
    yaw: -0.22,
    rollDeg0: -9.2,
    rollDeg1: -16.4,
    pitch0: 0.016,
    pitch1: 0.042,
    sink0: 1.1,
    sink1: 8.0,
    blasts: [
      { at: 792.7, lx: -43.0, lz: -1.5, size: 11.5, seed: 21, life: 18 },
      { at: 794.9, lx: 6.0, lz: 1.4, size: 10.8, seed: 22, life: 16 },
      { at: CUE.c04_s10_japanese_fleet, lx: 46.5, lz: -1.2, size: 10.4, seed: 23, life: 14 },
      { at: 801.35, lx: -46.0, lz: 1.8, size: 11.2, seed: 24, life: 11 },
      { at: 804.1, lx: 4.0, lz: -0.6, size: 10.6, seed: 25, life: 9 },
      { at: 806.15, lx: 47.0, lz: 0.9, size: 10.2, seed: 26, life: 7 },
      { at: 808.35, lx: -42.0, lz: -1.0, size: 9.8, seed: 27, life: 6 },
    ],
  },
  {
    // 3. IJN Soryu — Cánh phải đội hình kim cương (xoay góc -0.34 rad chéo ngang để lộ trọn chiều dài 250 m & Hinomaru!)
    name: 'Soryu',
    x: 255,
    z: 108,
    yaw: -0.34,
    rollDeg0: 8.6,
    rollDeg1: 15.6,
    pitch0: -0.022,
    pitch1: -0.05,
    sink0: 0.9,
    sink1: 7.6,
    blasts: [
      { at: 793.4, lx: 5.0, lz: 0.5, size: 11.0, seed: 31, life: 17 },
      { at: 795.5, lx: 47.5, lz: -1.6, size: 10.4, seed: 32, life: 16 },
      { at: 799.15, lx: -45.0, lz: -1.8, size: 11.0, seed: 33, life: 13 },
      { at: CUE.c04_s10_four_carriers_bottom, lx: 4.0, lz: 1.2, size: 11.4, seed: 34, life: 10 },
      { at: CUE.c04_s10_single_day + 0.15, lx: -43.5, lz: 1.1, size: 10.5, seed: 35, life: 8 },
      { at: 807.55, lx: 45.0, lz: -0.8, size: 10.0, seed: 36, life: 6 },
    ],
  },
  {
    // 4. IJN Hiryu — Đỉnh xa đội hình kim cương phía Bắc - Đông Bắc
    name: 'Hiryu',
    x: 55,
    z: -215,
    yaw: 0.06,
    rollDeg0: -8.0,
    rollDeg1: -14.8,
    pitch0: -0.015,
    pitch1: -0.038,
    sink0: 0.6,
    sink1: 6.4,
    blasts: [
      { at: 792.9, lx: 45.0, lz: -1.0, size: 11.2, seed: 41, life: 18 },
      { at: 795.3, lx: -44.0, lz: 1.4, size: 11.2, seed: 42, life: 16 },
      { at: CUE.c04_s10_ambush_midway - 0.15, lx: 3.0, lz: 0.6, size: 11.5, seed: 43, life: 12 },
      { at: 803.85, lx: 46.5, lz: -1.4, size: 11.0, seed: 44, life: 9 },
      { at: 806.05, lx: -41.0, lz: -1.2, size: 10.6, seed: 45, life: 7 },
      { at: 808.25, lx: 4.5, lz: 0.8, size: 10.2, seed: 46, life: 6 },
    ],
  },
];

/** Chuyển điểm cục bộ trên sàn đáp tàu sân bay sang toạ độ thế giới để cột khói <Explosion> bốc thẳng đứng */
function carrierLocalToWorld(
  shipX: number,
  shipY: number,
  shipZ: number,
  yaw: number,
  rollRad: number,
  pitchRad: number,
  lx: number,
  ly: number,
  lz: number,
): V3 {
  const v = new THREE.Vector3(lx, ly, lz);
  v.applyEuler(new THREE.Euler(rollRad, 0, pitchRad, 'XYZ'));
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return [shipX + v.x, shipY + v.y, shipZ + v.z];
}

/**
 * Vòng bọt sóng trắng mềm mại bám đúng độ cao mặt sóng động waveY(wx, wz, t) quanh thân tàu 250 m đang nghiêng chìm.
 * Dùng lưới phẳng nằm ngang uốn theo mặt sóng kết hợp texture tròn mờ softDot() nên hoà quyện 100%, không bị cắt cạnh đa giác!
 */
const WaveFoamWake: React.FC<{
  cx: number;
  cz: number;
  yaw: number;
  sinkProg: number;
  t: number;
  seed: number;
}> = ({ cx, cz, yaw, sinkProg, t, seed }) => {
  const foamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: softDot(),
        color: OCEAN_PALETTE.midwayNoon.foam,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
      }),
    [],
  );

  // 40 cụm bọt sóng rải ôm sát biên mớn nước elip của tàu sân bay (rx ~ 124 m, rz ~ 17.5 m)
  const samples = useMemo(() => {
    const N = 40;
    return Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2;
      const jitter = (rnd(seed * 31 + i) - 0.5) * 3.2;
      const lx = Math.cos(a) * (123 + jitter * 1.4);
      const lz = Math.sin(a) * (17.8 + jitter * 0.8);
      const radius = 12.5 + rnd(seed * 17 + i) * 7.5;
      return { lx, lz, radius, phase: rnd(seed * 11 + i) * Math.PI * 2 };
    });
  }, [seed]);

  const ca = Math.cos(yaw);
  const sa = Math.sin(yaw);
  const expand = 1 + sinkProg * 0.14;

  return (
    <group>
      {samples.map((s, idx) => {
        const lx = s.lx * expand;
        const lz = s.lz * (1 + sinkProg * 0.22);
        const wx = cx + lx * ca + lz * sa;
        const wz = cz - lx * sa + lz * ca;
        const wy = waveY(wx, wz, t, 1.2) + 0.32;
        const pulse = 0.88 + 0.16 * Math.sin(t * 2.4 + s.phase);
        const r = s.radius * (1 + sinkProg * 0.28) * pulse;
        return (
          <mesh
            key={idx}
            position={[wx, wy, wz]}
            rotation={[-Math.PI / 2, 0, s.phase]}
            scale={[r * 1.35, r * 0.9, 1]}
            material={foamMat}
          >
            <planeGeometry args={[1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Ngọn lửa bùng cháy nhiều tầng tại hố bom sàn gỗ (kích hoạt post.bloom = 0.78 rực sáng xuyên khói tới cuối cảnh 809.04 s) */
const DeckFireInferno: React.FC<{ t: number; seed: number; scale?: number; withLight?: boolean }> = ({
  t,
  seed,
  scale = 1,
  withLight = false,
}) => {
  const f1 = 0.88 + 0.18 * Math.sin(t * 9.2 + seed * 3.1);
  const f2 = 0.9 + 0.16 * Math.cos(t * 12.6 + seed * 1.7);
  return (
    <group scale={scale}>
      {withLight && <pointLight color="#ff8c2b" intensity={240 * f1} distance={95} decay={1.6} position={[0, 7, 0]} />}
      {/* Quầng lửa đỏ cam sát mặt sàn gỗ */}
      <mesh position={[0, 1.5, 0]} scale={[1.35 * f1, 0.85, 1.2 * f2]}>
        <dodecahedronGeometry args={[5.4, 1]} />
        <meshBasicMaterial color="#ff4e0c" transparent opacity={0.82} toneMapped={false} />
      </mesh>
      {/* Lưỡi lửa cam-vàng vươn cao lên không trung */}
      <mesh position={[0.4, 4.2 * f2, -0.3]} scale={[0.92 * f2, 1.65 * f1, 0.92]}>
        <coneGeometry args={[4.4, 8.5, 9]} />
        <meshBasicMaterial color="#ffa624" transparent opacity={0.88} toneMapped={false} />
      </mesh>
      <mesh position={[-1.1, 3.4 * f1, 0.9]} rotation={[0.12, 0.4, -0.15]} scale={[0.75, 1.35 * f2, 0.75]}>
        <coneGeometry args={[3.4, 7.2, 8]} />
        <meshBasicMaterial color="#ff7315" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* Lõi nhiệt trắng-vàng rực rỡ */}
      <mesh position={[0.1, 2.2, 0]} scale={[1, 1.25 * f1, 1]}>
        <dodecahedronGeometry args={[2.5, 1]} />
        <meshBasicMaterial color="#fff5c4" toneMapped={false} />
      </mesh>
    </group>
  );
};

const C04S10: React.FC = () => {
  const t = useT();

  // ---------------- Tiến độ nghiêng chìm của 4 tàu sân bay Kido Butai (801.94 -> 808.80 s) ----------------
  const pSink = prog(t, 801.94, 808.8);

  // ---------------- Cú máy mở sát Hinomaru bốc lửa -> kéo lùi đại cảnh 265 m thu trọn 4 IJNCarrier ----------------
  const pOpenGlide = prog(t, 796.6, 798.35);
  const pEpicPull = prog(t, 798.05, 803.1);
  const pFinaleDrift = prog(t, 803.1, 809.04);

  const openPos: V3 = [
    lerp(-64, -84, pOpenGlide),
    lerp(95, 106, pOpenGlide),
    lerp(264, 282, pOpenGlide),
  ];
  const openLook: V3 = [
    lerp(-18, -28, pOpenGlide),
    lerp(17.5, 18.5, pOpenGlide),
    lerp(168, 160, pOpenGlide),
  ];

  const widePos: V3 = [
    lerp(-382, -406, pFinaleDrift),
    lerp(245, 265, pFinaleDrift),
    lerp(508, 535, pFinaleDrift),
  ];
  const wideLook: V3 = [
    lerp(32, 38, pFinaleDrift),
    lerp(33, 36, pFinaleDrift),
    lerp(-54, -62, pFinaleDrift),
  ];

  const camPos: V3 = [
    lerp(openPos[0], widePos[0], pEpicPull),
    lerp(openPos[1], widePos[1], pEpicPull),
    lerp(openPos[2], widePos[2], pEpicPull),
  ];
  const camLook: V3 = [
    lerp(openLook[0], wideLook[0], pEpicPull),
    lerp(openLook[1], wideLook[1], pEpicPull),
    lerp(openLook[2], wideLook[2], pEpicPull),
  ];
  const camFov = lerp(44, 50, pEpicPull);

  // Mặt biển nền chân trời xa đồng bộ màu sương chân trời để không bao giờ lộ mép vuông của lưới 1800 m
  const horizonSeaMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: OCEAN_PALETTE.midwayNoon.deep,
        roughness: 0.3,
        metalness: 0.14,
      }),
    [],
  );

  const carrierStates = KIDO_BUTAI.map((cv) => {
    const wavePose = shipPose(cv.x, cv.z, 250, 31, t, 1.2, cv.yaw);
    const sinkDepth = lerp(cv.sink0, cv.sink1, pSink);
    const rollRad = (lerp(cv.rollDeg0, cv.rollDeg1, pSink) * Math.PI) / 180 + wavePose.roll * 0.5;
    const pitchRad = lerp(cv.pitch0, cv.pitch1, pSink) + wavePose.pitch * 0.5;
    const shipY = wavePose.y - sinkDepth;
    return { cv, shipY, rollRad, pitchRad };
  });

  // Lực lượng Đặc nhiệm Mỹ chiến thắng thấp thoáng rõ biên dạng ở đường chân trời Đông Bắc (~1040–1160 m)
  const usFleet = [
    { kind: 'hornet' as const, hull: '8' as const, x: 505, z: -420, yaw: -0.46 },
    { kind: 'hornet' as const, hull: '6' as const, x: 285, z: -505, yaw: -0.4 },
    { kind: 'nashville' as const, hull: '8' as const, x: 410, z: -365, yaw: -0.44 },
  ];

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.midwayDay}
        fog={[540, 1760]}
        fogColor="#8fc2e8"
        shadowArea={480}
        shadowCenter={[-10, 0, -10]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Mặt biển nền xa + Đại dương động Midway xanh thẳm rực nắng (size = 1800 m, dịch tâm đón hướng nhìn Đông Bắc) */}
        <mesh position={[80, -1.25, -280]} rotation={[-Math.PI / 2, 0, 0]} material={horizonSeaMat}>
          <planeGeometry args={[6400, 6400]} />
        </mesh>
        <OceanSurface t={t} palette="midwayNoon" swell={1.2} size={1800} seg={172} center={[80, -280]} />

        {/* ================= ĐỘI HÌNH KIM CƯƠNG 4 TÀU SÂN BAY NHẬT KIDO BUTAI BỐC CHÁY CHÌM ================= */}
        {carrierStates.map(({ cv, shipY, rollRad, pitchRad }, idx) => (
          <React.Fragment key={cv.name}>
            {/* Vòng sóng bọt trắng bám sát mặt sóng động quanh mớn nước thân tàu đang nghiêng chìm */}
            <WaveFoamWake cx={cv.x} cz={cv.z} yaw={cv.yaw} sinkProg={pSink} t={t} seed={idx + 1} />

            {/* Thân tàu sân bay Nhật (dùng chung damage={0.85} và seed={7} để hit cache texture tức thời!) */}
            <group position={[cv.x, shipY, cv.z]} rotation={[0, cv.yaw, 0]}>
              <group rotation={[rollRad, 0, pitchRad]}>
                <IJNCarrier damage={0.85} seed={7} />

                {/* Ngọn lửa bùng cháy nhiều tầng trên 3 hố bom sàn gỗ tếch */}
                <group position={[3.5, 17.6, 1.1]}>
                  <DeckFireInferno t={t} seed={idx * 7 + 1} scale={1.25} withLight={true} />
                </group>
                <group position={[-45.0, 17.6, -1.9]}>
                  <DeckFireInferno t={t} seed={idx * 7 + 2} scale={1.32} />
                </group>
                <group position={[46.5, 17.6, -1.4]}>
                  <DeckFireInferno t={t} seed={idx * 7 + 3} scale={1.12} />
                </group>

                {/* Lửa toác cháy xém rìa vòng tròn đỏ Hinomaru ở mũi chiếc dẫn đầu (giữ nguyên đĩa Mặt trời đỏ Ø 15 m nổi bật!) */}
                {cv.bowFire && (
                  <group position={[71.5, 17.62, -4.6]}>
                    <DeckFireInferno t={t} seed={99} scale={0.78} />
                  </group>
                )}
              </group>
            </group>

            {/* Hàng loạt quả cầu lửa và cột khói đen <Explosion> phụt cao rực rỡ từ sàn đáp */}
            {cv.blasts.map((b, bIdx) => {
              const worldPos = carrierLocalToWorld(cv.x, shipY, cv.z, cv.yaw, rollRad, pitchRad, b.lx, 17.8, b.lz);
              return (
                <Explosion
                  key={`${cv.name}-exp-${bIdx}`}
                  t={t}
                  at={b.at}
                  pos={worldPos}
                  size={b.size}
                  seed={b.seed}
                  smokeLife={b.life}
                  smoke="#242220"
                />
              );
            })}
          </React.Fragment>
        ))}

        {/* ================= HẠM ĐỘI MỸ CHIẾN THẮNG Ở CHÂN TRỜI ĐÔNG BẮC (CV-8, CV-6 & CL-43) ================= */}
        {usFleet.map((ship, idx) => {
          const len = ship.kind === 'hornet' ? 251.4 : 185.4;
          const beam = ship.kind === 'hornet' ? 35 : 18.8;
          const pose = shipPose(ship.x, ship.z, len, beam, t, 1.2, ship.yaw);
          return (
            <group key={`us-${idx}`} position={[ship.x, pose.y, ship.z]} rotation={[0, ship.yaw, 0]}>
              <group rotation={[pose.roll, 0, pose.pitch]}>
                {ship.kind === 'hornet' ? (
                  <USSHornet hullNumber={ship.hull} showLaunchLines={false} flagWave={deg(t * 2.5)} />
                ) : (
                  <USSNashville turretYaw={0.35} gunElev={0.14} />
                )}
              </group>
            </group>
          );
        })}
      </Stage>

      {/* NHÃN KẾT PHIM HÀO HÙNG TRONG VÙNG TRỜI AN TOÀN GÓC TRÊN TRÁI (802.30–808.00 s) */}
      <Label
        t={t}
        text="MIDWAY · 4 CARRIERS SUNK"
        x={470}
        y={132}
        from={CUE.c04_s10_four_carriers_bottom}
        until={808.0}
        size={50}
        bg={P2D.paper}
        fg={P2D.ink}
      />
    </AbsoluteFill>
  );
};

export default C04S10;
