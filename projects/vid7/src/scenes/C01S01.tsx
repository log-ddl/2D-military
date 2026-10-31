// C01S01 (0.00–24.32 s, 3D): Đại cảnh chéo cao 3/4 trước mũi phải USS Hornet (CV-8) bổ sóng bão 30 ft
// → hạ thấp sát mặt sàn gỗ ướt đẫm lướt qua chèn bánh vàng, xích thép & xe bom AN-M64, mở trọn 16 chiếc B-25B.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Label } from '@skill/military/label';
import { lathe, pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { softDot } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS } from '../design/palette';
import { USSHornet, HORNET_DECK_Y } from '../parts/USSHornet';
import { B25Mitchell } from '../parts/B25Mitchell';
import { USSNashville } from '../parts/USSNashville';
import { BombANM64 } from '../parts/Ordnance3D';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';

/** Đổi toạ độ cục bộ gắn với tàu sang hệ toạ độ thế giới (world space) cho <Cam>. */
function shipToWorld(
  local: V3,
  pose: { y: number; pitch: number; roll: number },
  heading = 0,
  shipXZ: [number, number] = [0, 0],
): V3 {
  const v = new THREE.Vector3(local[0], local[1], local[2]);
  v.applyEuler(new THREE.Euler(pose.roll, heading, pose.pitch, 'XYZ'));
  return [v.x + shipXZ[0], v.y + pose.y, v.z + shipXZ[1]];
}

type DeckBomberPlacement = {
  id: number;
  pos: V3;
  rotY: number;
  seed: number;
};

/** Công thức chuẩn C01.md: 16 chiếc B-25B xếp trên sàn đáp USS Hornet (y = HORNET_DECK_Y = 18.3 m) không chạm đảo hay đè cánh. */
const DECK_B25_LAYOUT: DeckBomberPlacement[] = [
  { id: 1, pos: [16.0, HORNET_DECK_Y, -1.1], rotY: 0, seed: 18 },
  ...Array.from({ length: 15 }, (_, idx) => {
    const k = idx + 1;
    const isOdd = k % 2 === 1;
    return {
      id: k + 1,
      pos: [1.0 - (k - 1) * 8.5, HORNET_DECK_Y, isOdd ? -6.2 : 5.8] as V3,
      rotY: isOdd ? 0.14 : -0.14,
      seed: 18,
    };
  }),
];

/** Xe đẩy / giá nạp bom Hải quân Mỹ Mk 2 chở 3 quả bom phá 500-lb AN-M64 trên sàn đáp. */
const NavyBombCart: React.FC<{
  position: V3;
  rotY?: number;
  seed?: number;
}> = ({ position, rotY = 0, seed = 21 }) => {
  const mats = useMemo(
    () => ({
      frameYellow: paint({
        color: PAINT.deckStripeYellow,
        camo: ['#c49628', '#f0c34a'],
        wear: 0.28,
        dirt: 0.24,
        roughness: 0.62,
        metalness: 0.22,
        seed,
      }),
      darkSteel: plain('#232930', 0.52, 0.64),
      rubber: plain('#1d1f21', 0.85, 0.08),
      cradleWood: paint({
        color: '#6e5539',
        wear: 0.24,
        dirt: 0.3,
        roughness: 0.82,
        metalness: 0.05,
        seed: seed + 3,
      }),
      chainSteel: plain('#323942', 0.45, 0.78),
    }),
    [seed],
  );

  const geos = useMemo(
    () => ({
      towBar: pipe(
        [
          [0.92, 0.28, -0.22],
          [1.56, 0.24, -0.05],
          [1.72, 0.24, 0],
          [1.56, 0.24, 0.05],
          [0.92, 0.28, 0.22],
        ],
        0.024,
        18,
      ),
      towEye: new THREE.TorusGeometry(0.065, 0.018, 8, 18),
      tieChainA: pipe(
        [
          [0.45, 0.34, -0.68],
          [0.62, 0.02, -0.95],
        ],
        0.016,
        8,
      ),
      tieChainB: pipe(
        [
          [-0.45, 0.34, 0.68],
          [-0.64, 0.02, 0.96],
        ],
        0.016,
        8,
      ),
    }),
    [],
  );

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Khung sườn thép sơn vàng Hải quân */}
      <mesh position={[0, 0.29, -0.62]} geometry={rbox(1.88, 0.085, 0.09, 0.015)} material={mats.frameYellow} castShadow />
      <mesh position={[0, 0.29, 0.62]} geometry={rbox(1.88, 0.085, 0.09, 0.015)} material={mats.frameYellow} castShadow />
      {[-0.74, 0, 0.74].map((cx) => (
        <mesh key={cx} position={[cx, 0.27, 0]} geometry={rbox(0.09, 0.075, 1.32, 0.015)} material={mats.darkSteel} castShadow />
      ))}

      {/* 4 bánh cao su đặc + chèn gỗ nhỏ giữ xe trên sàn nghiêng */}
      {(
        [
          [-0.68, -0.68],
          [-0.68, 0.68],
          [0.68, -0.68],
          [0.68, 0.68],
        ] as [number, number][]
      ).map(([wx, wz], idx) => (
        <group key={idx} position={[wx, 0.16, wz]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.rubber} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.11, 18]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.frameYellow}>
            <cylinderGeometry args={[0.085, 0.085, 0.12, 14]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.88, 0.055, -0.68]} geometry={rbox(0.14, 0.11, 0.24, 0.02)} material={mats.frameYellow} />
      <mesh position={[-0.88, 0.055, 0.68]} geometry={rbox(0.14, 0.11, 0.24, 0.02)} material={mats.frameYellow} />

      {/* Gối gỗ đỡ bom & càng kéo */}
      {[-0.44, 0.44].map((cx) => (
        <mesh key={`cr-${cx}`} position={[cx, 0.36, 0]} geometry={rbox(0.14, 0.11, 1.24, 0.02)} material={mats.cradleWood} castShadow />
      ))}
      <mesh geometry={geos.towBar} material={mats.frameYellow} castShadow />
      <mesh position={[1.78, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geos.towEye} material={mats.darkSteel} />

      {/* Xích neo xe bom xuống sàn tàu */}
      <mesh geometry={geos.tieChainA} material={mats.chainSteel} />
      <mesh geometry={geos.tieChainB} material={mats.chainSteel} />

      {/* 3 quả bom phá 500-lb AN-M64 xếp trên giá (2 dưới, 1 chồng giữa) */}
      <group position={[0.02, 0.56, -0.37]}>
        <BombANM64 seed={17} />
      </group>
      <group position={[0.02, 0.56, 0.37]}>
        <BombANM64 seed={17} />
      </group>
      <group position={[-0.02, 0.85, 0]}>
        <BombANM64 seed={17} />
      </group>
    </group>
  );
};

/** Thuỷ thủ quân giới Hải quân Mỹ (áo đỏ nạp bom / vàng chỉ huy sàn, áo phao kapok, mũ sắt) kiểm tra xích và giá bom. */
const DeckOrdnanceCrewman: React.FC<{
  position: V3;
  rotY?: number;
  crouch?: number;
  jerseyVariant?: 'red' | 'yellow';
  t: number;
  seed?: number;
}> = ({ position, rotY = 0, crouch = 0, jerseyVariant = 'red', t, seed = 1 }) => {
  const mats = useMemo(
    () => ({
      jersey: paint({
        color: jerseyVariant === 'red' ? '#932622' : '#b38524',
        camo: jerseyVariant === 'red' ? ['#781d1a', '#ad332e'] : ['#946c1a', '#caa038'],
        wear: 0.26,
        dirt: 0.24,
        roughness: 0.78,
        metalness: 0.05,
        seed: jerseyVariant === 'red' ? 41 : 42,
      }),
      dungaree: paint({
        color: '#253548',
        camo: ['#1d2a3a', '#31445b'],
        wear: 0.24,
        dirt: 0.26,
        roughness: 0.82,
        metalness: 0.05,
        seed: 43,
      }),
      vest: plain('#414f5e', 0.76, 0.08),
      strap: plain('#8c7f65', 0.8, 0.05),
      helmet: plain('#374554', 0.46, 0.32),
      skin: plain('#cfa27e', 0.66, 0.04),
      gloves: plain('#2b2623', 0.78, 0.08),
      boots: plain('#191b1e', 0.78, 0.12),
    }),
    [jerseyVariant],
  );

  const helmetGeo = useMemo(
    () =>
      lathe(
        [
          [0.142, -0.008],
          [0.135, 0.036],
          [0.116, 0.088],
          [0.074, 0.128],
          [0.01, 0.142],
        ],
        18,
      ),
    [],
  );

  const sway = Math.sin(t * 2.2 + seed * 1.9) * 0.045;
  const hipY = 0.88 - crouch * 0.22;

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Hai chân chống rộng giữ thăng bằng trên sàn tàu lắc */}
      {([-0.145, 0.145] as const).map((lz, idx) => (
        <group key={idx} position={[idx === 0 ? -0.05 : 0.06, 0, lz]}>
          <mesh position={[0.03, 0.058, 0]} geometry={rbox(0.25, 0.115, 0.11, 0.03)} material={mats.boots} castShadow />
          <mesh
            position={[0, hipY * 0.52, 0]}
            rotation={[lz * 0.22, 0, (idx === 0 ? 0.08 : -0.1) + crouch * 0.18]}
            material={mats.dungaree}
            castShadow
          >
            <cylinderGeometry args={[0.084, 0.074, hipY, 12]} />
          </mesh>
        </group>
      ))}

      {/* Thân trên cúi ngược gió về phía +X + áo giáp phao kapok có dây đai */}
      <group position={[0, hipY, 0]} rotation={[sway, 0, -0.24 - crouch * 0.38]}>
        <mesh position={[0, 0.27, 0]} geometry={rbox(0.25, 0.52, 0.37, 0.07)} material={mats.jersey} castShadow />
        <mesh position={[0.01, 0.29, 0]} geometry={rbox(0.285, 0.4, 0.405, 0.075)} material={mats.vest} castShadow />
        {/* Đệm cổ áo phao kapok & dây buộc ngang ngực */}
        <mesh position={[-0.01, 0.51, 0]} geometry={rbox(0.22, 0.075, 0.34, 0.035)} material={mats.vest} />
        <mesh position={[0.148, 0.28, 0]} geometry={rbox(0.018, 0.035, 0.38, 0.008)} material={mats.strap} />

        {/* Hai cánh tay nối khớp vai → khuỷu → bàn tay vươn về phía trước (+X) ghì kiểm tra dây xích / giá bom */}
        {([-1, 1] as const).map((s) => (
          <group
            key={s}
            position={[0.04, 0.44, s * 0.21]}
            rotation={[s * 0.08, -s * 0.18, 0.78 + crouch * 0.22]}
          >
            {/* Bắp tay trên (hướng -Y xoay dương quanh Z để đưa về phía trước +X) */}
            <mesh position={[0, -0.135, 0]} material={mats.jersey} castShadow>
              <cylinderGeometry args={[0.054, 0.047, 0.28, 10]} />
            </mesh>
            {/* Khớp khuỷu tay gập tự nhiên tới bàn tay đeo găng bảo hộ */}
            <group position={[0, -0.265, 0]} rotation={[-s * 0.16, 0, 0.48]}>
              <mesh position={[0, -0.115, 0]} material={mats.jersey} castShadow>
                <cylinderGeometry args={[0.046, 0.039, 0.24, 10]} />
              </mesh>
              <mesh position={[0.01, -0.245, 0]} geometry={rbox(0.082, 0.062, 0.07, 0.02)} material={mats.gloves} castShadow />
            </group>
          </group>
        ))}

        {/* Cổ, đầu & mũ sắt Hải quân Mk 1 */}
        <group position={[0.04, 0.62, 0]} rotation={[0, 0, 0.18]}>
          <mesh material={mats.skin} castShadow>
            <sphereGeometry args={[0.102, 14, 12]} />
          </mesh>
          <mesh position={[-0.005, 0.02, 0]} rotation={[0, 0, Math.PI / 2 + 0.08]} geometry={helmetGeo} material={mats.helmet} castShadow />
        </group>
      </group>
    </group>
  );
};

/** Bọt sóng vỡ trắng xoá & bụi nước tung cao hai bên mũi clipper bow khi USS Hornet bổ xuống hõm sóng 30 ft. */
const BowStormSpray: React.FC<{ t: number; pitch: number }> = ({ t, pitch }) => {
  const tex = useMemo(() => softDot(), []);
  // Cường độ bọt mũi tăng vọt khi mũi tàu chúi xuống sóng và quanh mốc Pitching@6.70..9.2
  const slamBoost =
    0.58 +
    0.42 * Math.max(0, Math.sin(t * 1.45 + 5.4)) +
    0.45 * Math.sin(prog(t, 6.2, 9.6) * Math.PI);

  const plumes = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        side: i % 2 === 0 ? 1 : -1,
        u: (i >> 1) / 17,
        seed1: rnd(i * 7 + 3),
        seed2: rnd(i * 13 + 11),
        seed3: rnd(i * 19 + 29),
      })),
    [],
  );

  return (
    <group>
      {plumes.map((pl, idx) => {
        const cycle = (t * (0.72 + pl.seed1 * 0.45) + pl.seed2 * 3.0) % 1;
        const x = lerp(119.5, 82.0, pl.u) - cycle * 11.5;
        const hullSpread = lerp(1.8, 14.5, Math.pow(pl.u, 0.72));
        const z = pl.side * (hullSpread + cycle * (4.5 + pl.seed3 * 6.5));
        const baseWave = waveY(x, z, t, 4.2);
        const arc = Math.sin(cycle * Math.PI);
        const peakH = (5.5 + (1 - pl.u) * 9.5 + pl.seed1 * 3.5) * slamBoost;
        const y = baseWave + 0.8 + arc * peakH - pitch * 18 * (1 - pl.u);
        const size = (4.8 + pl.u * 6.5 + cycle * 6.2) * (0.85 + 0.25 * slamBoost);
        const opacity = Math.min(0.76, (1 - cycle * 0.82) * (0.34 + 0.34 * arc) * slamBoost);
        return (
          <sprite key={idx} position={[x, y, z]} scale={[size * 1.25, size * 0.95, 1]}>
            <spriteMaterial
              map={tex}
              color={cycle < 0.35 ? '#eef7fc' : '#c7dae6'}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </sprite>
        );
      })}
    </group>
  );
};

/** Màn mưa bão xiên ngang quanh camera (giữ khoảng cách an toàn >= 11.5 m khỏi ống kính để không tạo vệt trắng to). */
const StormRainVeil: React.FC<{ center: V3; t: number }> = ({ center, t }) => {
  const rainMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c9dce8',
        transparent: true,
        opacity: 0.17,
        depthWrite: false,
      }),
    [],
  );

  const drops = useMemo(
    () =>
      Array.from({ length: 76 }, (_, i) => {
        const radius = 14.0 + rnd(i * 3 + 1) * 24.0;
        const angle = rnd(i * 3 + 2) * Math.PI * 2;
        return {
          ox: Math.cos(angle) * radius,
          oy: (rnd(i * 3 + 3) - 0.5) * 22,
          oz: Math.sin(angle) * radius,
          len: 1.05 + rnd(i * 5 + 7) * 1.15,
          phase: rnd(i * 11 + 5),
        };
      }),
    [],
  );

  return (
    <group position={center}>
      {drops.map((d, idx) => {
        const fall = ((t * 2.8 + d.phase) % 1) - 0.5;
        const x = d.ox - fall * 3.6;
        const y = d.oy - fall * 20;
        const z = d.oz - fall * 1.1;
        return (
          <mesh key={idx} position={[x, y, z]} rotation={[0.16, 0, -0.58]} material={rainMat}>
            <boxGeometry args={[0.013, d.len, 0.013]} />
          </mesh>
        );
      })}
    </group>
  );
};

const C01S01: React.FC = () => {
  const t = useT();

  // Tư thế nhấp nhô trên sóng bão 30 ft (swell = 4.2 m) cho USS Hornet và 2 tàu hộ tống Task Force 16 ở cự ly đội hình xa trong sương mù
  const hornetPose = shipPose(0, 0, 251.4, 35.0, t, 4.2, 0);
  const nashPos: [number, number] = [26, -196];
  const nashPose = shipPose(nashPos[0], nashPos[1], 185.4, 18.8, t, 4.2, 0.03);
  const entPos: [number, number] = [-248, 218];
  const entPose = shipPose(entPos[0], entPos[1], 251.4, 35.0, t, 4.2, -0.02);

  // ---------------- Quỹ đạo Camera 3 nhịp khớp từng mốc voice ----------------
  // Nhịp 1 (0.00–11.10 s): Đại cảnh chéo cao 3/4 trước mũi phải USS Hornet bổ sóng bão 30 ft
  const pAerial = prog(t, 0.0, 11.4);
  const aerialPosRaw: V3 = [
    lerp(168, 106, pAerial),
    lerp(43.5, 25.5, pAerial),
    lerp(82, 38, pAerial),
  ];
  // Bảo vệ tuyệt đối không bao giờ để sóng cắt camera
  const aerialSafeY = Math.max(aerialPosRaw[1], waveY(aerialPosRaw[0], aerialPosRaw[2], t, 4.2) + 3.5);
  const aerialPos: V3 = [aerialPosRaw[0], aerialSafeY, aerialPosRaw[2]];
  const aerialLook: V3 = [
    lerp(18, 34, pAerial),
    lerp(16.2, 18.8, pAerial),
    lerp(-4, -1, pAerial),
  ];

  // Nhịp 2 (11.62–15.68 s): Hạ sát mặt sàn gỗ ướt (y_local = 19.35 m = sàn + 1.05 m) lướt qua chèn bánh vàng & xích thép chiếc #1
  // Nhịp 3 (15.68–24.32 s): Nâng cao & mở rộng dọc mép trái phô bày trọn vẹn 16 chiếc B-25B + xe bom AN-M64 cạnh chiếc #1
  const pDeckLow = prog(t, 11.8, 15.68);
  const pDeckReveal = prog(t, 15.68, 20.4);
  const pBombFocus = prog(t, 20.4, 24.32);

  const deckLocalPos: V3 = [
    lerp(lerp(29.2, 22.8, pDeckLow), lerp(40.5, 31.8, pBombFocus), pDeckReveal),
    lerp(lerp(19.35, 19.48, pDeckLow), lerp(25.8, 23.4, pBombFocus), pDeckReveal),
    lerp(lerp(-7.2, -8.4, pDeckLow), lerp(-13.8, -11.4, pBombFocus), pDeckReveal),
  ];
  const deckLocalLook: V3 = [
    lerp(lerp(17.8, 14.5, pDeckLow), lerp(-38.0, -24.0, pBombFocus), pDeckReveal),
    lerp(lerp(19.05, 19.25, pDeckLow), lerp(19.8, 19.45, pBombFocus), pDeckReveal),
    lerp(lerp(-2.5, -2.2, pDeckLow), lerp(-0.4, -1.2, pBombFocus), pDeckReveal),
  ];

  const deckWorldPos = shipToWorld(deckLocalPos, hornetPose);
  const deckWorldLook = shipToWorld(deckLocalLook, hornetPose);

  // Hoà chuyển mượt từ đại cảnh thế giới vào hệ quy chiếu mặt sàn tàu đúng tại CUE.c01_s01_chained (11.62 s)
  const pToDeck = prog(t, 10.55, 12.35);
  const camPos: V3 = [
    lerp(aerialPos[0], deckWorldPos[0], pToDeck),
    lerp(aerialPos[1], deckWorldPos[1], pToDeck),
    lerp(aerialPos[2], deckWorldPos[2], pToDeck),
  ];
  const camLook: V3 = [
    lerp(aerialLook[0], deckWorldLook[0], pToDeck),
    lerp(aerialLook[1], deckWorldLook[1], pToDeck),
    lerp(aerialLook[2], deckWorldLook[2], pToDeck),
  ];
  const camFov = lerp(44, lerp(41, 45, pDeckReveal), pToDeck);
  const camRoll = lerp(0.018 * Math.sin(t * 1.15), hornetPose.roll * 0.45, pToDeck);

  // Vùng bóng đổ động ôm khít mũi tàu ở đại cảnh và sắc nét quanh sàn B-25 ở cận cảnh
  const shadowArea = lerp(96, 68, pToDeck);
  const shadowCenter: V3 = [lerp(36, 2, pToDeck), 18, 0];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage {...STAGE_PRESETS.stormDawn} shadowArea={shadowArea} shadowCenter={shadowCenter}>
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Đại dương Tây Thái Bình Dương bão sóng 30 ft */}
        <OceanSurface t={t} swell={4.2} size={1150} seg={132} center={[15, -10]} palette="stormPacific" />

        {/* Bọt nước trắng xoá nổ tung quanh mũi USS Hornet khi bổ sóng */}
        <BowStormSpray t={t} pitch={hornetPose.pitch} />

        {/* Mưa bão tạt ngang quanh vùng ống kính */}
        <StormRainVeil center={camPos} t={t} />

        {/* Tàu chính: USS Hornet (CV-8) cùng toàn bộ 16 chiếc B-25B, xe bom AN-M64 & thuỷ thủ trên cùng nhóm shipPose */}
        <group position={[0, hornetPose.y, 0]} rotation={[hornetPose.roll, 0, hornetPose.pitch]}>
          <USSHornet hullNumber="8" showLaunchLines flagWave={t * 5.2} aaYaw={0.18} />

          {/* Đội hình 16 oanh tạc cơ hạng trung USAAF B-25B Mitchell xích chặt trên sàn gỗ ướt */}
          {DECK_B25_LAYOUT.map((b) => (
            <group key={b.id} position={b.pos} rotation={[0, b.rotY, 0]}>
              <B25Mitchell
                gear={1}
                chained
                broomsticks
                lowerTurret={false}
                bombBay={b.id === 1 ? 0.58 : 0}
                propSpin={b.id * 0.68 + Math.sin(t * 0.85 + b.id * 1.3) * 0.035}
                turretYaw={b.id % 3 === 0 ? 0.22 : -0.15}
                seed={b.seed}
              />
            </group>
          ))}

          {/* 2 xe nạp bom phá 500-lb AN-M64 đặt cạnh bụng chiếc B-25 #1 ("loaded with high explosives") */}
          <NavyBombCart position={[20.1, HORNET_DECK_Y, -5.25]} rotY={0.26} seed={31} />
          <NavyBombCart position={[14.4, HORNET_DECK_Y, -7.1]} rotY={-0.18} seed={31} />

          {/* Thuỷ thủ quân giới kiểm tra dây xích chằng bánh & giá bom */}
          <DeckOrdnanceCrewman
            position={[21.45, HORNET_DECK_Y, -3.55]}
            rotY={2.35}
            crouch={0.42}
            jerseyVariant="red"
            t={t}
            seed={1}
          />
          <DeckOrdnanceCrewman
            position={[18.85, HORNET_DECK_Y, -6.28]}
            rotY={-0.75}
            crouch={0.25}
            jerseyVariant="red"
            t={t}
            seed={2}
          />
          <DeckOrdnanceCrewman
            position={[11.2, HORNET_DECK_Y, -3.8]}
            rotY={-0.65}
            crouch={0.16}
            jerseyVariant="yellow"
            t={t}
            seed={3}
          />
        </group>

        {/* Tàu tuần dương hạng nhẹ hộ tống USS Nashville (CL-43) thấp thoáng bên phải màn sương bão */}
        <group
          position={[nashPos[0], nashPose.y, nashPos[1]]}
          rotation={[nashPose.roll, 0.03, nashPose.pitch]}
        >
          <USSNashville turretYaw={-0.16} gunElev={0.1} recoil={0} />
        </group>

        {/* Tàu sân bay hộ tống USS Enterprise (CV-6) thấp thoáng phía sau trái trong sương muối */}
        <group
          position={[entPos[0], entPose.y, entPos[1]]}
          rotation={[entPose.roll, -0.02, entPose.pitch]}
        >
          <USSHornet hullNumber="6" showLaunchLines={false} flagWave={t * 4.8} aaYaw={-0.12} />
        </group>
      </Stage>

      {/* Duy nhất 1 nhãn thời gian mở màn theo đúng quy chuẩn Label */}
      <Label
        t={t}
        text="07:38 AM · APR 18, 1942"
        x={445}
        y={162}
        from={CUE.c01_s01_time}
        until={6.18}
      />
    </div>
  );
};

export default C01S01;
