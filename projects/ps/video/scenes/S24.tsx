// S24 (436.98 – 449.03s, 3D — STAGE_DAWN):
// Cú cẩu máy (Crane Pull-Back) điện ảnh khép lại bộ phim trên trận địa S-400 Triumf lúc bình minh:
// - 437.0 – 440.5s: Góc trung-cận nhìn qua miệng 4 ống phóng đứng mở toác ám khói đen rỗng không (loadedCount=0) của xe S-400 tiền cảnh.
// - 440.5 – 442.8s: Hai quả tên lửa chiến thuật hạng nặng lao vút cực nhanh từ bầu trời xuống kéo Trail cam rực,
//   phát nổ chấn động (@441.4s, size=6.5) tại khu vực xe thứ hai / đài hậu cần phía sau khi xe S-400 tiền cảnh đứng câm lặng không còn đạn.
// - 443.0 – 449.03s: Cam cẩu cao và kéo lùi êm ái mở đại cảnh khẩu đội S-400 in bóng 4 ống phóng đứng giữa khói trận địa và ráng vàng bình minh.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { Explosion, Trail, softDot } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL3D, STAGE_DAWN, TERRAIN_STEPPE } from '../local/palette';
import { Kinzhal, S400Launcher } from '../local/models';

// Địa hình thảo nguyên rừng thông bình minh Đông Âu với chân trời thoáng thấp để 4 ống S-400 cao 8.4m in bóng lên bầu trời bình minh
const H_S24 = heightField({
  seed: 2409,
  amp: 2.3,
  scale: 135,
  flats: [
    [0, 0, 15.5, 0.0],          // Bãi đỗ phẳng xe S-400 tiền cảnh (y = 0.00 m chuẩn xác)
    [17.5, -5.2, 18.0, 0.35],   // Bãi đỗ phẳng xe S-400 thứ hai & trạm hậu cần bên sườn phải (y = 0.35 m)
  ],
  add: (x, z) => {
    const farRidge = 3.2 * Math.exp(-(((z + 150) / 48) ** 2));
    const eastKnoll = 4.2 * Math.exp(-(((x - 95) / 42) ** 2)) * Math.exp(-(((z + 65) / 75) ** 2));
    return farRidge + eastKnoll;
  },
});

const avoidBattery = (x: number, z: number) =>
  Math.hypot(x, z) < 17.0 ||
  Math.hypot(x - 17.5, z + 5.2) < 19.5 ||
  (x > -30 && x < 5 && z > -3 && z < 26); // Giữ thoáng hành lang cẩu máy kéo lùi

const X_AXIS = new THREE.Vector3(1, 0, 0);
const dirQuat = (d: V3) => {
  const v = new THREE.Vector3(d[0], d[1], d[2]);
  if (v.lengthSq() < 1e-8) return new THREE.Quaternion();
  return new THREE.Quaternion().setFromUnitVectors(X_AXIS, v.normalize());
};

const r01 = (i: number, k: number) => {
  const v = Math.sin(i * 23.417 + k * 83.197 + 24.71) * 43758.5453;
  return v - Math.floor(v);
};

// Toạ độ tâm 4 miệng ống phóng đứng (elev = 90°, y = 8.40 m) của xe S-400 tiền cảnh tại [0, 0, 0], rotation Y = 0.32 rad
const HERO_YAW = 0.32;
const HERO_TUBE_MOUTHS: V3[] = (() => {
  const c = Math.cos(HERO_YAW);
  const s = Math.sin(HERO_YAW);
  const localSlots: [number, number][] = [
    [-7.14, -0.51],
    [-7.14, 0.51],
    [-6.18, -0.51],
    [-6.18, 0.51],
  ];
  return localSlots.map(([lx, lz]): V3 => [lx * c + lz * s, 8.42, -lx * s + lz * c]);
})();

/** Khói tàn mỏng toả nhẹ quanh 4 miệng ống phóng S-400 đã vỡ nắp rỗng không (giữ mảnh để thấy rõ lòng ống đen). */
const EmptyTubeSmoke: React.FC<{ t: number; mouths: V3[]; baseSeed?: number }> = ({ t, mouths, baseSeed = 0 }) => {
  const tex = useMemo(() => softDot(), []);
  const items: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const m = mouths[i % mouths.length];
    const cycle = ((t - 435.0) * 0.34 + r01(i + baseSeed, 1)) % 1;
    const pos: V3 = [
      m[0] + 0.25 + cycle * 0.95 + (r01(i + baseSeed, 2) - 0.5) * 0.4,
      m[1] + 0.18 + cycle * 1.85,
      m[2] + (r01(i + baseSeed, 3) - 0.5) * 0.45 - cycle * 0.25,
    ];
    const sz = 0.55 + cycle * 1.25;
    const op = Math.sin(cycle * Math.PI) * 0.22;
    if (op <= 0.004) continue;
    items.push(
      <sprite key={i} position={pos} scale={[sz, sz, sz]}>
        <spriteMaterial map={tex} color="#cfd6dc" transparent opacity={op} depthWrite={false} />
      </sprite>,
    );
  }
  return <>{items}</>;
};

/** Cụm công-ten-nơ trạm nguồn / chỉ huy hậu cần đặt cạnh xe S-400 số 2 (nơi bị tên lửa hạng nặng đánh trúng). */
const SupportDepot: React.FC<{ position: V3; rotationY?: number }> = ({ position, rotationY = 0 }) => {
  const shelterMat = useMemo(
    () =>
      paint({
        color: PAL3D.s400Base,
        camo: [PAL3D.s400Camo1, PAL3D.s400Camo2],
        camoScale: 1.3,
        wear: 0.26,
        dirt: 0.24,
        roughness: 0.65,
        metalness: 0.25,
        repeat: 1,
        seed: 91,
      }),
    [],
  );
  const darkMat = useMemo(() => plain(PAL3D.darkSteel, 0.55, 0.5), []);
  const crateMat = useMemo(() => plain('#4e5d42', 0.68, 0.22), []);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Shelter hậu cần / nguồn điện quân sự */}
      <mesh position={[0, 1.25, 0]} geometry={rbox(5.4, 2.3, 2.45, 0.06)} material={shelterMat} castShadow receiveShadow />
      <mesh position={[0, 0.1, 0]} geometry={rbox(5.6, 0.2, 2.55, 0.03)} material={darkMat} castShadow />
      <mesh position={[1.4, 2.52, 0]} geometry={rbox(1.4, 0.24, 1.5, 0.03)} material={darkMat} castShadow />
      {/* Kiện hòm đạn dự phòng đã mở rỗng đặt bên cạnh */}
      <mesh position={[-3.8, 0.42, 0.6]} geometry={rbox(1.9, 0.84, 0.95, 0.03)} material={crateMat} castShadow receiveShadow />
      <mesh position={[-3.7, 0.42, -0.65]} geometry={rbox(1.9, 0.84, 0.95, 0.03)} material={crateMat} castShadow receiveShadow />
    </group>
  );
};

type HeavyMissileStrike = {
  start: V3;
  end: V3;
  t0: number;
  hitAt: number;
  blastSize: number;
};

// 2 quả tên lửa chiến thuật hạng nặng lao cực nhanh chéo bầu trời xuống cụm hậu cần / xe S-400 số 2 bên sườn phải
const HEAVY_STRIKES: HeavyMissileStrike[] = [
  {
    start: [-8.0, 56.0, -32.0],
    end: [21.8, 0.35, -3.6],
    t0: 440.52,
    hitAt: CUE.s24_heavy_strike, // 441.40s
    blastSize: 6.8,
  },
  {
    start: [0.5, 60.0, -38.0],
    end: [25.6, 0.35, -7.2],
    t0: 440.78,
    hitAt: 441.72,
    blastSize: 5.0,
  },
];

const S24: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const strikePaths = useMemo(
    () =>
      HEAVY_STRIKES.map((st) => {
        const pts: V3[] = Array.from({ length: 36 }, (_, i) => {
          const u = i / 35;
          return [
            lerp(st.start[0], st.end[0], u),
            lerp(st.start[1], st.end[1], u),
            lerp(st.start[2], st.end[2], u),
          ];
        });
        const dir: V3 = [
          st.end[0] - st.start[0],
          st.end[1] - st.start[1],
          st.end[2] - st.start[2],
        ];
        return { ...st, pts, quat: dirQuat(dir) };
      }),
    [],
  );

  // ---------------- Cú Cẩu Máy Kéo Lùi (Crane Pull-Back) 3 nhịp mượt mà ----------------
  // Nhịp 1 (436.8 – 439.6s): Trung-cận nhìn thẳng qua 4 miệng ống phóng mở toác đen khói của xe S-400 tiền cảnh (y=8.4m)
  // Nhịp 2 (439.6 – 442.8s): Mở khung trung-rộng thấy trọn trận địa đúng lúc 2 tên lửa nặng dội nổ bên sườn phải @441.4s
  // Nhịp 3 (442.8 – 449.03s): Kéo lùi đại cảnh góc thấp-trung tôn 4 ống phóng đứng cao 8.4m in bóng lên bầu trời bình minh
  const pDriftClose = prog(t, 436.75, 439.6, Easing.out(Easing.quad));
  const pToStrike = prog(t, 439.4, 441.25, Easing.bezier(0.38, 0.0, 0.2, 1.0));
  const pCraneOutro = prog(t, 442.65, 448.95, Easing.bezier(0.32, 0.0, 0.16, 1.0));

  const posClose: V3 = [
    lerp(-10.2, -11.6, pDriftClose),
    lerp(11.15, 10.45, pDriftClose),
    lerp(5.15, 6.85, pDriftClose),
  ];
  const lookClose: V3 = [
    lerp(-5.15, -3.6, pDriftClose),
    lerp(7.72, 7.05, pDriftClose),
    lerp(1.05, -0.45, pDriftClose),
  ];

  const posStrike: V3 = [-17.2, 6.25, 14.6];
  const lookStrike: V3 = [4.6, 4.75, -5.2];

  const posOutro: V3 = [-24.6, 5.15, 20.6];
  const lookOutro: V3 = [4.4, 5.85, -5.6];

  const midPos: V3 = [
    lerp(posClose[0], posStrike[0], pToStrike),
    lerp(posClose[1], posStrike[1], pToStrike),
    lerp(posClose[2], posStrike[2], pToStrike),
  ];
  const midLook: V3 = [
    lerp(lookClose[0], lookStrike[0], pToStrike),
    lerp(lookClose[1], lookStrike[1], pToStrike),
    lerp(lookClose[2], lookStrike[2], pToStrike),
  ];

  // Rung chấn địa chấn khi tên lửa hạng nặng phát nổ phía sau trận địa (@441.4s)
  const dtShock = t - CUE.s24_heavy_strike;
  const shockAmp = dtShock >= 0 && dtShock < 1.25 ? 0.18 * Math.exp(-dtShock * 3.1) : 0;
  const sx = Math.sin(t * 44.0) * shockAmp;
  const sy = Math.cos(t * 51.0) * shockAmp * 0.85;

  const camPos: V3 = [
    lerp(midPos[0], posOutro[0], pCraneOutro) + sx,
    lerp(midPos[1], posOutro[1], pCraneOutro) + sy,
    lerp(midPos[2], posOutro[2], pCraneOutro),
  ];
  const camLook: V3 = [
    lerp(midLook[0], lookOutro[0], pCraneOutro),
    lerp(midLook[1], lookOutro[1], pCraneOutro),
    lerp(midLook[2], lookOutro[2], pCraneOutro),
  ];
  const fov = lerp(lerp(40, 45, pToStrike), 44, pCraneOutro);

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: '#0e1d2e' }}>
      <Stage {...STAGE_DAWN} shadowArea={56} shadowCenter={[7, 0, -3]}>
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Địa hình thảo nguyên rừng thông bình minh */}
        <Terrain h={H_S24} size={520} seg={220} center={[12, -28]} colors={TERRAIN_STEPPE} />
        <Scatter
          kind="pine"
          count={165}
          area={[-135, -185, 165, 85]}
          h={H_S24}
          seed={241}
          scale={[0.85, 1.5]}
          avoid={avoidBattery}
          tint="#9ab09d"
        />
        <Scatter
          kind="bush"
          count={120}
          area={[-75, -105, 95, 55]}
          h={H_S24}
          seed={242}
          scale={[0.65, 1.25]}
          avoid={avoidBattery}
          tint="#8fa488"
        />
        <Scatter
          kind="rock"
          count={52}
          area={[-70, -95, 85, 45]}
          h={H_S24}
          seed={243}
          scale={[0.45, 1.0]}
          avoid={avoidBattery}
        />

        {/* 1. XE S-400 TIỀN CẢNH: dựng thẳng 4 ống phóng 7.5 m, cả 4 nắp đã bung vỡ đen khói rỗng không (loadedCount = 0) */}
        <S400Launcher
          position={[0, 0, 0]}
          rotation={[0, HERO_YAW, 0]}
          elev={90}
          loadedCount={0}
        />
        <EmptyTubeSmoke t={t} mouths={HERO_TUBE_MOUTHS} baseSeed={10} />

        {/* 2. XE S-400 THỨ HAI & TRẠM HẬU CẦN BÊN SƯỜN PHẢI (tách biệt hẳn khỏi 4 ống xe tiền cảnh & nhãn giữa màn hình) */}
        <S400Launcher
          position={[14.5, 0.35, -6.2]}
          rotation={[0, 0.18, 0]}
          elev={90}
          loadedCount={0}
        />
        <EmptyTubeSmoke
          t={t}
          mouths={[
            [7.95, 8.77, -5.0],
            [8.85, 8.77, -5.2],
          ]}
          baseSeed={40}
        />
        <SupportDepot position={[21.8, 0.35, -3.6]} rotationY={-0.28} />

        {/* 3. LOẠT TÊN LỬA CHIẾN THUẬT HẠNG NẶNG LAO VÚT XUỐNG & PHÁT NỔ CHẤN ĐỘNG (@441.4s) */}
        {strikePaths.map((st, idx) => {
          const dur = st.hitAt - st.t0;
          const u = (t - st.t0) / dur;
          const dtAfter = t - st.hitAt;
          const trailFade = dtAfter > 0 ? Math.max(0, 1 - dtAfter / 1.65) : 1;

          return (
            <React.Fragment key={idx}>
              {u > 0.01 && trailFade > 0.02 && (
                <>
                  <Trail
                    points={st.pts}
                    upto={Math.min(1, u)}
                    color="#ff9d2e"
                    width={0.30}
                    opacity={0.82 * trailFade}
                  />
                  <Trail
                    points={st.pts}
                    upto={Math.min(1, u)}
                    color="#fff2c2"
                    width={0.11}
                    opacity={0.95 * trailFade}
                  />
                </>
              )}
              {u > 0 && u <= 1.0 && (
                <group
                  position={[
                    lerp(st.start[0], st.end[0], u),
                    lerp(st.start[1], st.end[1], u),
                    lerp(st.start[2], st.end[2], u),
                  ]}
                  quaternion={st.quat}
                >
                  <Kinzhal plume={0.9} heatGlow={0.85} scale={0.96} />
                </group>
              )}
              <Explosion
                t={t}
                at={st.hitAt}
                pos={st.end}
                size={st.blastSize}
                smokeLife={9.5}
                seed={2410 + idx}
              />
            </React.Fragment>
          );
        })}
      </Stage>

      {/* Nhãn kết phim */}
      <Label
        t={t}
        text="S-400 TRIUMF"
        x={960}
        y={155}
        from={445.2}
        until={448.6}
      />
    </div>
  );
};

export default S24;
