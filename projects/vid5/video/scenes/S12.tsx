import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain, type TerrainColors } from '@lib/3d/terrain';
import { MuzzleBlast, Trail } from '@lib/3d/fx';
import { extrude, lathe, rbox } from '@lib/3d/geom';
import { plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { P, STAGE_GULF_NOON, TERRAIN_PACIFIC_ISLAND } from '../local/palette';
import { AMRAAM, F15_STA1_POS, F15_STA9_POS, F15EX, F35A } from '../local/models';

// ---------------- Mặt biển xanh ngọc Vịnh Mexico & Đảo chắn bờ xa ngoài khơi Eglin ----------------
const GULF_SEA_COLORS: TerrainColors = {
  low: '#0a3a66',
  high: '#166b96',
  rock: '#2489b5',
  dry: '#4db5d6',
};

const gulfSeaH = heightField({
  seed: 120,
  amp: 0.65,
  scale: 28,
  oct: 4,
  add: (x, z) =>
    0.45 * Math.sin(x * 0.11 + z * 0.16) +
    0.24 * Math.sin(x * 0.24 - z * 0.21) +
    0.14 * Math.cos(z * 0.34),
});

// Vài hòn đảo chắn bờ (barrier islands) kiểu bờ biển Eglin / Santa Rosa nhô lên ở đường chân trời hai phía
const ISLAND_SPOTS: [number, number, number, number][] = [
  [-140, -390, 125, 22],
  [210, -430, 145, 26],
  [-95, 405, 130, 21],
  [245, 425, 155, 25],
];

const gulfIslandsH = heightField({
  seed: 124,
  amp: 2.2,
  scale: 68,
  oct: 4,
  add: (x, z) => {
    let h = -8.5;
    for (const [ix, iz, rad, peak] of ISLAND_SPOTS) {
      const d = Math.hypot((x - ix) * 0.72, z - iz);
      if (d < rad * 1.45) {
        const u = Math.max(0, 1 - d / (rad * 1.35));
        h = Math.max(h, -5.5 + (peak + 5.5) * (u * u * (3 - 2 * u)));
      }
    }
    return h;
  },
});

const avoidWaterForPines = (x: number, z: number) => gulfIslandsH(x, z) < 3.2;
const avoidWaterForBushes = (x: number, z: number) => gulfIslandsH(x, z) < 1.4;

// ---------------- Mô hình AIM-9X Sidewinder 3D (dùng khi rời bệ Station 9 lúc 316.00s) ----------------
const SidewinderMissile3D: React.FC<{ flame?: number }> = ({ flame = 0 }) => {
  const f = Math.max(0, Math.min(1, flame));
  const geos = useMemo(() => {
    const body = lathe(
      [
        [0.058, -1.51],
        [0.064, -1.46],
        [0.064, 1.36],
        [0.056, 1.46],
        [0.035, 1.5],
        [0.004, 1.51],
      ],
      20,
    );
    const canard = extrude(
      [
        [0.86, 0.06],
        [1.14, 0.06],
        [0.98, 0.21],
        [0.86, 0.21],
      ],
      0.012,
      0.002,
    );
    const aftFin = extrude(
      [
        [-1.49, 0.06],
        [-1.12, 0.06],
        [-1.18, 0.21],
        [-1.49, 0.21],
      ],
      0.012,
      0.002,
    );
    return { body, canard, aftFin };
  }, []);

  return (
    <group>
      <mesh geometry={geos.body} material={plain('#d5dfe9', 0.38, 0.3)} castShadow />
      <mesh position={[1.47, 0, 0]} material={plain('#16202b', 0.08, 0.7)}>
        <sphereGeometry args={[0.056, 16, 12]} />
      </mesh>
      <mesh position={[0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(P.amber, 0.4, 0.2)}>
        <cylinderGeometry args={[0.066, 0.066, 0.065, 16]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[Math.PI / 4 + (k * Math.PI) / 2, 0, 0]}>
          <mesh geometry={geos.canard} material={plain('#3c4a5a', 0.4, 0.6)} castShadow />
          <mesh geometry={geos.aftFin} material={plain('#3c4a5a', 0.4, 0.6)} castShadow />
        </group>
      ))}
      {f > 0.01 && (
        <group position={[-1.52, 0, 0]}>
          <pointLight position={[-0.25, 0, 0]} color="#ffab47" intensity={11 * f} distance={6} decay={1.7} />
          <mesh position={[-0.45 * f, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.068, 0.9 * f, 16]} />
            <meshBasicMaterial color="#fff9df" transparent opacity={0.95} toneMapped={false} />
          </mesh>
          <mesh position={[-0.88 * f, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.115, 1.75 * f, 16]} />
            <meshBasicMaterial color={P.flame} transparent opacity={0.62} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Giá treo mấu đầu cánh rỗng (giữ nguyên trên cánh trong pha 312.90s..319.15s khi tên lửa vừa rời bệ)
const OuterWingPylonsPair: React.FC = () => {
  const pylonGeo = useMemo(
    () =>
      extrude(
        [
          [-3.95, 2.07],
          [-2.15, 2.07],
          [-2.35, 2.34],
          [-3.82, 2.34],
        ],
        0.11,
        0.016,
      ),
    [],
  );
  const railGeo = useMemo(() => rbox(2.86, 0.085, 0.11, 0.015), []);
  const matPyl = plain('#a6bacf', 0.5, 0.28);
  const matRail = plain(P.f15Light, 0.46, 0.38);
  return (
    <>
      <mesh position={[0, 0, -5.85]} geometry={pylonGeo} material={matPyl} castShadow />
      <mesh position={[-2.75, 2.035, -5.85]} geometry={railGeo} material={matRail} castShadow />
      <mesh position={[0, 0, 5.85]} geometry={pylonGeo} material={matPyl} castShadow />
      <mesh position={[-2.75, 2.035, 5.85]} geometry={railGeo} material={matRail} castShadow />
    </>
  );
};

// ---------------- Quỹ đạo máy bay & hai quả đạn phóng thật trên Vịnh Mexico ----------------
const V_JET = 34.0;
const BASE_ALT = 74.0;
const jetXAt = (tau: number) => (tau - 315.5) * V_JET;

const amraamLaunchPos = (dt: number): V3 => {
  const x0 = jetXAt(CUE.s12_fireSta1) + F15_STA1_POS[0];
  return [
    x0 + V_JET * dt + 19.5 * dt + 14.0 * dt * dt,
    BASE_ALT + F15_STA1_POS[1] - 0.12 * Math.min(1, dt * 5) + 0.28 * dt,
    F15_STA1_POS[2] - 0.72 * dt,
  ];
};

const sidewinderLaunchPos = (dt: number): V3 => {
  const x0 = jetXAt(CUE.s12_fireSta9) + F15_STA9_POS[0];
  return [
    x0 + V_JET * dt + 6.8 * dt + 1.65 * dt * dt,
    BASE_ALT + F15_STA9_POS[1] - 0.1 * Math.min(1, dt * 5) + 0.32 * dt,
    F15_STA9_POS[2] + 0.55 * dt,
  ];
};

const sampleMissileTrail = (
  posFn: (u: number) => V3,
  maxAge: number,
  dt: number,
  tailOffset: number,
): V3[] => {
  const steps = 28;
  const pts: V3[] = [];
  const u0 = Math.max(0, dt - maxAge);
  for (let i = 0; i <= steps; i++) {
    const u = u0 + (i / steps) * (dt - u0);
    const p = posFn(u);
    pts.push([p[0] - tailOffset, p[1] - (dt - u) * 0.55, p[2]]);
  }
  return pts;
};

const S12: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const pCompare = prog(t, 319.1, 321.5);
  const jetX = jetXAt(t);
  const jetY = BASE_ALT + Math.sin(t * 1.5) * 0.16 * pCompare;
  const jetZ = lerp(0, -1.35, pCompare);
  const jetRoll = lerp(0, -0.22, pCompare);
  const jetPitch = lerp(0, 0.032, pCompare);

  // Trong cửa sổ phóng đạn (312.90..319.10s), tách riêng mấu đầu cánh để thấy rõ thanh ray rỗng sau khi đạn rời bệ;
  // từ 319.10s bật lại full 12 quả tên lửa dưới bụng & đầu cánh cho pha đối chiếu với F-35A!
  const inFiringWindow = t >= CUE.s12_fireSta1 && t < 319.1;
  const showBuiltInWingTips = !inFiringWindow;

  const dt1 = t - CUE.s12_fireSta1;
  const dt2 = t - CUE.s12_fireSta9;
  const m1Active = dt1 >= 0 && dt1 < 2.55;
  const m2Active = dt2 >= 0 && dt2 < 2.95;
  const m1Fade = 1 - prog(dt1, 1.85, 2.55);
  const m2Fade = 1 - prog(dt2, 2.35, 2.95);

  const m1Pos = m1Active ? amraamLaunchPos(dt1) : null;
  const m2Pos = m2Active ? sidewinderLaunchPos(dt2) : null;
  const m1Trail =
    m1Active && dt1 > 0.03 ? sampleMissileTrail(amraamLaunchPos, 0.34, dt1, 1.85) : null;
  const m2Trail =
    m2Active && dt2 > 0.03 ? sampleMissileTrail(sidewinderLaunchPos, 0.36, dt2, 1.55) : null;

  // ---------------- Đạo diễn Camera 3D: Cận góc chéo trên-trước-trái ~38° Sta 1 -> Lướt qua vòm kính sang góc đuổi cánh phải Sta 9 -> Bụng 3/4 12 đạn vs F-35A ----------------
  const pPushSta1 = prog(t, 304.0, 310.2);
  const pSweepCanopy = prog(t, 314.65, 315.85);

  // Góc chéo trên-trước-trái ~38° nhìn xuống cánh trái & mấu Station 1 nổi rõ trên nền biển xanh thẫm
  const offSta1: V3 = [
    lerp(19.0, 15.6, pPushSta1),
    lerp(6.4, 5.5, pPushSta1),
    lerp(-17.8, -14.8, pPushSta1),
  ];
  const lookSta1: V3 = [3.6, 1.6, -3.5];

  // Lướt vọt qua vòm kính sang góc trên-sau-phải 3/4 đuổi theo mấu Station 9 đón quả AIM-9X lao vọt về phía trước
  const offSta9: V3 = [-11.6, 5.3, 11.8];
  const lookSta9: V3 = [7.4, 1.85, 3.8];

  const canopyArcLift = Math.sin(pSweepCanopy * Math.PI) * 3.1;
  const offFire: V3 = [
    lerp(offSta1[0], offSta9[0], pSweepCanopy) - Math.sin(pSweepCanopy * Math.PI) * 2.4,
    lerp(offSta1[1], offSta9[1], pSweepCanopy) + canopyArcLift,
    lerp(offSta1[2], offSta9[2], pSweepCanopy),
  ];
  const lookFire: V3 = [
    lerp(lookSta1[0], lookSta9[0], pSweepCanopy),
    lerp(lookSta1[1], lookSta9[1], pSweepCanopy) + canopyArcLift * 0.25,
    lerp(lookSta1[2], lookSta9[2], pSweepCanopy),
  ];

  // Góc bụng 3/4 trước-phải từ 319.5s: khoe trọn 12 quả đạn của F-15EX bay vượt lên trước F-35A ở hậu cảnh
  const offBelly: V3 = [
    lerp(16.2, 17.8, prog(t, 321.5, 327.8)),
    -5.1,
    14.6,
  ];
  const lookBelly: V3 = [-3.4, -1.1, 2.5];

  const camPos: V3 = [
    jetX + lerp(offFire[0], offBelly[0], pCompare),
    jetY + lerp(offFire[1], offBelly[1], pCompare),
    lerp(offFire[2], offBelly[2], pCompare),
  ];
  const camLook: V3 = [
    jetX + lerp(lookFire[0], lookBelly[0], pCompare),
    jetY + lerp(lookFire[1], lookBelly[1], pCompare),
    lerp(lookFire[2], lookBelly[2], pCompare),
  ];

  // Vị trí F-35A bay thấp hơn ở hậu cảnh bên phải-sau (mở khoang đạn bụng bayOpen=0.7 chỉ có 4 quả)
  const f35Lag = lerp(12.2, 17.0, prog(t, 320.0, 327.8));
  const f35Pos: V3 = [jetX - f35Lag, jetY - 6.0, 10.8];

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_GULF_NOON}
        shadowCenter={[jetX, jetY, 0]}
        shadowArea={26}
      >
        <Cam pos={camPos} look={camLook} fov={lerp(40, 43, pCompare)} />

        {/* Ánh nắng phản xạ từ mặt biển xanh ngọc Vịnh Mexico hắt sáng rõ toàn bộ 12 quả tên lửa dưới bụng cánh */}
        <directionalLight position={[18, -34, 24]} color="#d4f4ff" intensity={1.38} />

        {/* Mặt biển Vịnh Mexico gợn sóng xanh lam-ngọc liền mạch (không cắt lớp phẳng) */}
        <Terrain
          h={gulfSeaH}
          size={2300}
          seg={256}
          center={[0, 0]}
          colors={GULF_SEA_COLORS}
          grainRepeat={110}
        />

        {/* Chuỗi đảo chắn bờ xa tít ở đường chân trời ngoài khơi căn cứ Eglin */}
        <Terrain
          h={gulfIslandsH}
          size={2300}
          seg={200}
          center={[0, 0]}
          colors={TERRAIN_PACIFIC_ISLAND}
          grainRepeat={44}
        />
        <Scatter
          kind="pine"
          count={140}
          area={[-360, -560, 460, 560]}
          h={gulfIslandsH}
          seed={1201}
          scale={[0.85, 1.45]}
          avoid={avoidWaterForPines}
        />
        <Scatter
          kind="bush"
          count={160}
          area={[-380, -560, 480, 560]}
          h={gulfIslandsH}
          seed={1202}
          scale={[0.8, 1.4]}
          avoid={avoidWaterForBushes}
        />

        {/* Chủ thể chính: F-15EX Eagle II của Không đoàn thử nghiệm 96 (Eglin AFB) mang tải chuẩn 12 tên lửa */}
        <group position={[jetX, jetY, jetZ]} rotation={[jetRoll, 0, jetPitch]}>
          <F15EX
            gear={0}
            afterburner={lerp(0.45, 0.58, pCompare)}
            wingTipMissiles={showBuiltInWingTips}
            fullLoad
          />

          {/* Giữ thanh ray mấu 1 & 9 trên cánh trong lúc đạn vừa rời bệ; đạn AIM-9X chờ ở Sta 9 tới đúng 316.00s */}
          {inFiringWindow && (
            <>
              <OuterWingPylonsPair />
              {t < CUE.s12_fireSta9 && (
                <group position={F15_STA9_POS}>
                  <SidewinderMissile3D flame={0} />
                </group>
              )}
            </>
          )}
        </group>

        {/* Phát bắn #1 (312.90s): Tên lửa AIM-120 AMRAAM rời mấu đầu cánh trái Station 1 */}
        <MuzzleBlast
          t={t}
          at={CUE.s12_fireSta1}
          pos={[
            jetXAt(CUE.s12_fireSta1) + V_JET * Math.min(Math.max(0, dt1), 0.45) + F15_STA1_POS[0] - 1.5,
            jetY + F15_STA1_POS[1] - 0.04,
            F15_STA1_POS[2],
          ]}
          dir={[-1, -0.04, -0.08]}
          size={0.95}
          seed={121}
        />
        {m1Pos && (
          <group position={m1Pos}>
            <AMRAAM flame={1} />
          </group>
        )}
        {m1Trail && (
          <>
            <Trail points={m1Trail} color="#ffe8a6" width={0.085} opacity={0.92 * m1Fade} glow />
            <Trail points={m1Trail} color="#dce8f4" width={0.16} opacity={0.34 * m1Fade} glow={false} />
          </>
        )}

        {/* Phát bắn #2 (316.00s): Tên lửa AIM-9X Sidewinder rời mấu đầu cánh phải Station 9 */}
        <MuzzleBlast
          t={t}
          at={CUE.s12_fireSta9}
          pos={[
            jetXAt(CUE.s12_fireSta9) + V_JET * Math.min(Math.max(0, dt2), 0.3) + F15_STA9_POS[0] - 1.35,
            jetY + F15_STA9_POS[1] - 0.04,
            F15_STA9_POS[2],
          ]}
          dir={[-1, -0.04, 0.08]}
          size={0.9}
          seed={129}
        />
        {m2Pos && (
          <group position={m2Pos}>
            <SidewinderMissile3D flame={1} />
          </group>
        )}
        {m2Trail && (
          <>
            <Trail points={m2Trail} color="#ffe8a6" width={0.075} opacity={0.92 * m2Fade} glow />
            <Trail points={m2Trail} color="#dce8f4" width={0.15} opacity={0.34 * m2Fade} glow={false} />
          </>
        )}

        {/* Chiếc F-35A bay thấp hơn ở hậu cảnh mở khoang bụng (chỉ mang 4 quả bên trong so với 12 quả của F-15EX) */}
        {t >= 318.5 && (
          <group position={f35Pos} rotation={[-0.17, 0, 0.02]}>
            <F35A gear={0} bayOpen={0.7} afterburner={0.36} />
          </group>
        )}
      </Stage>

      <Label
        t={t}
        text="AIM-120 · STA 1"
        x={960}
        y={915}
        from={CUE.s12_fireSta1}
        until={315.4}
        bg={P.cyan}
        fg={P.ink}
      />
      <Label
        t={t}
        text="12 MISSILES"
        x={960}
        y={915}
        from={CUE.s12_load12}
        until={327.5}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S12;
