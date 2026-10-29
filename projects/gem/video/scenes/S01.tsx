import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { DustTrail, Explosion, Trail } from '@lib/3d/fx';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { PAL2D, PAL3D, STAGE_PREDAWN, TERRAIN_PREDAWN } from '../local/palette';
import {
  ChuContainer,
  ConcreteBunker,
  HescoWall,
  NightHawkMast,
  SHAHED_CENTER_Y,
  Shahed136,
  TWall,
} from '../local/models';

// Địa hình cao nguyên đá sỏi bazan Rukban (cực đông bắc Jordan): bãi phẳng rộng cho doanh trại Tháp 22 + gờ đồi xa
const H_RUKBAN = heightField({
  seed: 2801,
  amp: 4.8,
  scale: 105,
  oct: 5,
  flats: [[0, 0, 32, 0]],
  add: (x, z) => {
    const northRidge = 14.0 * Math.exp(-(((z + 80) / 34) ** 2)) * (0.7 + 0.3 * Math.cos(x * 0.03));
    const westMesa = 10.5 * Math.exp(-(((x + 86) / 38) ** 2)) * (0.65 + 0.35 * Math.sin(z * 0.035));
    const eastEscarpment = 8.6 * Math.exp(-(((x - 94) / 42) ** 2));
    return northRidge + westMesa + eastEscarpment;
  },
});

const avoidCompound = (x: number, z: number) => Math.abs(x) < 23 && Math.abs(z) < 18;

// Quỹ đạo bổ nhào xiên ~38° của Shahed-136 từ bầu trời đêm xuống thẳng khe hành lang giữa 2 dãy nhà ngủ CHU
const DIVE_START: V3 = [-27.5, 22.8, 6.2];
const DIVE_END: V3 = [0.0, 1.05, -0.35];
const DIVE_DX = DIVE_END[0] - DIVE_START[0];
const DIVE_DY = DIVE_END[1] - DIVE_START[1];
const DIVE_DZ = DIVE_END[2] - DIVE_START[2];
const DIVE_HORIZ = Math.hypot(DIVE_DX, DIVE_DZ);
const DIVE_LEN = Math.hypot(DIVE_HORIZ, DIVE_DY);
const DIVE_YAW = Math.atan2(-DIVE_DZ, DIVE_DX);
const DIVE_PITCH = -Math.atan2(-DIVE_DY, DIVE_HORIZ); // ~ -37.6° (-0.656 rad)

const DIVE_DIR: V3 = [DIVE_DX / DIVE_LEN, DIVE_DY / DIVE_LEN, DIVE_DZ / DIVE_LEN];

const diveProgressAt = (timeSec: number) =>
  prog(timeSec, CUE.s01_dive, CUE.s01_impact, Easing.bezier(0.22, 0.06, 0.72, 0.98));

const diveAt = (p: number): V3 => [
  lerp(DIVE_START[0], DIVE_END[0], p),
  lerp(DIVE_START[1], DIVE_END[1], p),
  lerp(DIVE_START[2], DIVE_END[2], p),
];

const diveTailAtTime = (timeSec: number): V3 => {
  const pos = diveAt(diveProgressAt(timeSec));
  return [
    pos[0] - DIVE_DIR[0] * 1.68,
    pos[1] - DIVE_DIR[1] * 1.68,
    pos[2] - DIVE_DIR[2] * 1.68,
  ];
};

// Đường khói đám cháy âm ỉ bốc lên liên tục từ khu nhà ngủ CHU bị xé toạc sau vụ nổ 16.40s
const firePlumePath = (timeSec: number): V3 => [
  0.15 + 0.35 * Math.sin(timeSec * 1.7),
  1.35,
  -0.45 + 0.28 * Math.cos(timeSec * 1.3),
];

/** Cột đèn pha natri vàng ấm quanh hàng rào doanh trại Tháp 22 lúc 05:30 sáng. */
const SodiumFloodPole: React.FC<{ pos: V3; yaw?: number; intensity?: number; flicker?: number }> = ({
  pos,
  yaw = 0,
  intensity = 24,
  flicker = 1,
}) => {
  const poleMat = useMemo(() => plain('#515c68', 0.52, 0.45), []);
  const hoodMat = useMemo(() => plain('#2a313a', 0.48, 0.38), []);
  const padMat = useMemo(() => plain(PAL3D.concrete, 0.88, 0.06), []);
  const lampMat = useMemo(
    () =>
      plain('#ffe0a3', 0.18, 0.05, {
        emissive: new THREE.Color(PAL3D.sodiumLamp),
        emissiveIntensity: 3.2,
      }),
    []
  );

  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh geometry={rbox(0.46, 0.24, 0.46, 0.02)} position={[0, 0.12, 0]} material={padMat} castShadow receiveShadow />
      <mesh position={[0, 2.85, 0]} material={poleMat} castShadow>
        <cylinderGeometry args={[0.055, 0.085, 5.3, 12]} />
      </mesh>
      <mesh
        geometry={rbox(0.75, 0.06, 0.06, 0.01)}
        position={[0.32, 5.42, 0]}
        rotation={[0, 0, 0.14]}
        material={poleMat}
        castShadow
      />
      {([-0.18, 0.18] as const).map((oz) => (
        <group key={oz} position={[0.64, 5.4, oz]} rotation={[0, 0, -0.58]}>
          <mesh geometry={rbox(0.24, 0.14, 0.28, 0.02)} material={hoodMat} castShadow />
          <mesh geometry={rbox(0.18, 0.04, 0.22, 0.008)} position={[0.02, -0.065, 0]} material={lampMat} />
        </group>
      ))}
      <pointLight
        position={[0.85, 5.1, 0]}
        color={PAL3D.sodiumLamp}
        intensity={intensity * flicker}
        distance={26}
        decay={1.6}
      />
    </group>
  );
};

const S01: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Nền sỏi đầm doanh trại đồng điệu tự nhiên với đá bazan Rukban (không tạo viền thảm đen gắt)
  const gravelPadMat = useMemo(
    () =>
      paint({
        color: '#5a6370',
        camo: ['#4f5764', '#67707d'],
        camoScale: 5,
        repeat: 0.25,
        dirt: 0.32,
        wear: 0.14,
        roughness: 0.96,
        metalness: 0.03,
        seed: 101,
      }),
    []
  );
  const trackMat = useMemo(
    () =>
      paint({
        color: '#4b5360',
        camo: ['#424a56', '#565f6c'],
        camoScale: 4,
        repeat: 0.35,
        dirt: 0.38,
        wear: 0.1,
        roughness: 0.96,
        metalness: 0.03,
        seed: 109,
      }),
    []
  );
  const scorchMat = useMemo(() => plain('#151619', 0.96, 0.04), []);

  // Tiến độ lao xuống của Shahed-136 (12.80s -> 16.40s)
  const diveRaw = diveProgressAt(t);
  const isDiving = t >= CUE.s01_dive && t < CUE.s01_impact;
  const dronePos = diveAt(diveRaw);

  // Vệt lửa đuôi ngắn gọn kiểu sao chổi ngay sau cánh quạt đẩy (kết hợp DustTrail khói mềm tự tan, không kéo cọc dài cứng)
  const shortWakePts = useMemo<V3[]>(() => {
    const pHead = Math.min(1, diveRaw);
    const pTail = Math.max(0, pHead - 0.17);
    if (pHead - pTail < 0.008) return [];
    return Array.from({ length: 14 }, (_, i) => {
      const p = lerp(pTail, pHead, i / 13);
      const pos = diveAt(p);
      return [
        pos[0] - DIVE_DIR[0] * 1.66,
        pos[1] - DIVE_DIR[1] * 1.66,
        pos[2] - DIVE_DIR[2] * 1.66,
      ];
    });
  }, [diveRaw]);

  // Mức độ xé toạc vách thép mỏng của 2 nhà ngủ CHU sát tâm nổ sau 16.40s (lượng tử hoá nhẹ để tận dụng cache paint())
  const chuDamageRaw = prog(t, CUE.s01_impact, CUE.s01_impact + 0.35, Easing.out(Easing.cubic));
  const chuDamage = Math.round(chuDamageRaw * 4) / 4;
  const afterImpact = Math.max(0, t - CUE.s01_impact);
  const hasImpacted = t >= CUE.s01_impact;

  // Đèn doanh trại chập chờn nhẹ ngay khoảnh khắc xung kích quét qua
  const lampFlicker =
    hasImpacted && afterImpact < 1.4
      ? 0.45 + 0.55 * Math.abs(Math.sin(afterImpact * 26))
      : 1;

  // Chuyển động máy quay 3 giai đoạn mượt mà
  const pGlide = prog(t, 0, CUE.s01_dive, Easing.bezier(0.32, 0.0, 0.25, 1));
  const pDiveTrack = prog(t, CUE.s01_dive, CUE.s01_impact, Easing.inOut(Easing.quad));
  const pRecoil = prog(t, CUE.s01_impact, 24.8, Easing.out(Easing.cubic));

  let camX = lerp(26.5, 15.8, pGlide);
  let camY = lerp(17.6, 6.2, pGlide);
  let camZ = lerp(25.2, 17.0, pGlide);

  let lookX = lerp(-0.8, -1.5, pGlide);
  let lookY = lerp(1.3, 2.1, pGlide);
  let lookZ = lerp(-1.8, -0.5, pGlide);

  if (t >= CUE.s01_dive) {
    const trackUp = Math.sin(pDiveTrack * Math.PI);
    camX = lerp(15.8, 14.5, pDiveTrack);
    camY = lerp(6.2, 5.3, pDiveTrack);
    camZ = lerp(17.0, 15.6, pDiveTrack);

    lookX = lerp(-1.5, 0.0, pDiveTrack) - 3.5 * trackUp;
    lookY = lerp(2.1, 1.45, pDiveTrack) + 3.3 * trackUp;
    lookZ = lerp(-0.5, -0.35, pDiveTrack) + 0.75 * trackUp;
  }

  if (hasImpacted) {
    camX = lerp(14.5, 18.8, pRecoil);
    camY = lerp(5.3, 7.8, pRecoil);
    camZ = lerp(15.6, 19.8, pRecoil);

    lookX = lerp(0.0, -0.3, pRecoil);
    lookY = lerp(1.45, 2.2, pRecoil);
    lookZ = lerp(-0.35, -0.7, pRecoil);
  }

  // Rung chấn động vật lý khi khối thuốc nổ kích hoạt lúc 16.40s
  const shakeEnv = hasImpacted ? Math.exp(-afterImpact * 3.1) : 0;
  const shakeX = shakeEnv * 0.46 * Math.sin(afterImpact * 37);
  const shakeY = shakeEnv * 0.38 * Math.cos(afterImpact * 43);
  const shakeRoll = shakeEnv * 0.022 * Math.sin(afterImpact * 31);

  const fov = lerp(42, 39.5, pGlide) + (hasImpacted ? lerp(1.8, 0, prog(t, CUE.s01_impact, CUE.s01_impact + 1.2)) : 0);

  // Ánh lửa cháy bập bùng bên trong khe CHU bị xé toạc suốt phần kết cảnh (16.4 -> 24.8s)
  const flickerWave = 0.78 + 0.22 * Math.sin(afterImpact * 14.5) + 0.12 * Math.cos(afterImpact * 23.1);
  const fireGlow = hasImpacted ? 26 * flickerWave * lerp(1.35, 0.82, prog(t, CUE.s01_impact, 24.8)) : 0;

  return (
    <AbsoluteFill>
      <Stage {...STAGE_PREDAWN} shadowArea={34} shadowCenter={[0, 1.4, -1.2]}>
        <Cam
          pos={[camX + shakeX, camY + shakeY, camZ + shakeX * 0.5]}
          look={[lookX + shakeX * 0.35, lookY + shakeY * 0.45, lookZ]}
          fov={fov}
          roll={shakeRoll}
        />

        {/* Địa hình sa mạc đá sỏi bazan Rukban & thảm đá bụi lạnh trước bình minh */}
        <Terrain h={H_RUKBAN} size={440} seg={144} colors={TERRAIN_PREDAWN} grainRepeat={48} />
        <Scatter
          kind="rock"
          count={195}
          area={[-155, -155, 155, 155]}
          h={H_RUKBAN}
          seed={17}
          scale={[0.45, 1.55]}
          avoid={avoidCompound}
          tint="#8a96a6"
        />
        <Scatter
          kind="bush"
          count={72}
          area={[-135, -135, 135, 135]}
          h={H_RUKBAN}
          seed={29}
          scale={[0.35, 0.85]}
          avoid={avoidCompound}
          tint="#73808e"
        />

        {/* Sân sỏi đầm gọn trong vành đai công sự & trục đường cấp phối dẫn ra sa mạc */}
        <mesh geometry={rbox(35.5, 0.045, 22.0, 0.6)} position={[-0.4, 0.004, -3.5]} material={gravelPadMat} receiveShadow />
        <mesh geometry={rbox(29.5, 0.055, 4.2, 0.2)} position={[-1.0, 0.012, 0]} material={trackMat} receiveShadow />
        <mesh geometry={rbox(4.8, 0.05, 38, 0.2)} position={[13.4, 0.01, 8.5]} material={trackMat} receiveShadow />

        {/* Hố & vệt cháy xém dưới mặt đất hành lang sau cú đâm 16.40s */}
        {hasImpacted && (
          <mesh position={[0.0, 0.045, -0.3]} rotation={[-Math.PI / 2, 0, 0]} material={scorchMat} receiveShadow>
            <circleGeometry args={[3.6 * Math.max(0.25, chuDamageRaw), 28]} />
          </mesh>
        )}

        {/* DÃY CHU 1 (Dãy CC — phía Bắc hành lang, z = -2.75 m) */}
        <group position={[-12.4, 0, -2.75]}>
          <ChuContainer warmLight />
        </group>
        <group position={[-5.5, 0, -2.75]}>
          <ChuContainer warmLight />
        </group>
        {/* Chiếc CHU trung tâm dãy CC trúng nổ trực diện xé toạc vách thép mỏng */}
        <group position={[1.4, 0, -2.75]}>
          <ChuContainer warmLight damaged={chuDamage} />
        </group>
        <group position={[8.3, 0, -2.75]}>
          <ChuContainer warmLight />
        </group>

        {/* DÃY CHU 2 (Dãy Z — phía Nam hành lang, z = +2.75 m, quay mặt vào khe hành lang hẹp) */}
        <group position={[-8.3, 0, 2.75]} rotation={[0, Math.PI, 0]}>
          <ChuContainer warmLight />
        </group>
        <group position={[-1.4, 0, 2.75]} rotation={[0, Math.PI, 0]}>
          <ChuContainer warmLight damaged={chuDamage} />
        </group>
        <group position={[5.5, 0, 2.75]} rotation={[0, Math.PI, 0]}>
          <ChuContainer warmLight />
        </group>

        {/* Dãy CHU 3 phía hậu cảnh (z = -10.2 m) */}
        {([-10.5, -3.5, 3.5, 10.5] as const).map((cx) => (
          <group key={cx} position={[cx, 0, -10.2]}>
            <ChuContainer warmLight />
          </group>
        ))}

        {/* Hệ thống tường bê tông chống mảnh chữ T (T-Wall cao 3.66 m) bao bọc khu nhà ngủ */}
        <group position={[-1.8, 0, -5.45]}>
          <TWall count={20} />
        </group>
        <group position={[-16.4, 0, -1.2]} rotation={[0, Math.PI / 2, 0]}>
          <TWall count={11} />
        </group>
        <group position={[-8.8, 0, 5.55]}>
          <TWall count={11} />
        </group>
        <group position={[-1.8, 0, -13.1]}>
          <TWall count={20} />
        </group>

        {/* Dãy rọ đất công sự HESCO nối liền mạch ở các góc cổng & sườn doanh trại */}
        <group position={[7.4, 0, 5.75]}>
          <HescoWall cells={5} />
        </group>
        <group position={[16.4, 0, -4.8]} rotation={[0, Math.PI / 2, 0]}>
          <HescoWall cells={9} />
        </group>
        <group position={[-16.4, 0, 7.8]} rotation={[0, Math.PI / 2, 0]}>
          <HescoWall cells={4} />
        </group>

        {/* Hầm bê tông trú ẩn chữ U nằm im lìm không kịp báo động */}
        <group position={[12.8, 0, -7.2]} rotation={[0, -Math.PI / 2, 0]}>
          <ConcreteBunker strobe={0} />
        </group>

        {/* Trụ tháp camera ảnh nhiệt NightHawk & cụm 4 loa còi báo động tắt lịm (strobe = 0) */}
        <group position={[11.2, 0, 5.4]}>
          <NightHawkMast yaw={-0.88} pitch={0.04} strobe={0} />
        </group>

        {/* Hệ thống cột đèn pha vàng natri chiếu sáng tĩnh lặng lúc 05:30 sáng */}
        <SodiumFloodPole pos={[-14.6, 0, -4.6]} yaw={-0.35} intensity={25} flicker={lampFlicker} />
        <SodiumFloodPole pos={[10.8, 0, -4.6]} yaw={-2.65} intensity={26} flicker={lampFlicker} />
        <SodiumFloodPole pos={[-14.2, 0, 4.8]} yaw={0.45} intensity={23} flicker={lampFlicker} />
        <SodiumFloodPole pos={[9.6, 0, 3.8]} yaw={2.45} intensity={23} flicker={lampFlicker} />

        {/* Chiếc Shahed-136 lao xiên ~38° từ bầu trời đêm xuống thẳng khu nhà ngủ (12.80s -> 16.40s) */}
        {isDiving && (
          <group position={dronePos} rotation={[0, DIVE_YAW, 0]}>
            <group position={[0, -SHAHED_CENTER_Y, 0]}>
              <Shahed136
                propSpin={t * 54}
                pitch={DIVE_PITCH}
                bank={0.07 * Math.sin((t - CUE.s01_dive) * 4.2)}
              />
            </group>
            <pointLight position={[-1.7, 0, 0]} color="#ff9d42" intensity={10} distance={9} decay={1.8} />
          </group>
        )}

        {/* Khói xả động cơ mềm tự tan theo gió + tia nhiệt ngắn sát đuôi cánh quạt khi lao xuống */}
        <DustTrail
          t={t}
          from={CUE.s01_dive}
          to={CUE.s01_impact}
          path={diveTailAtTime}
          rate={22}
          size={0.58}
          color="#94a3b8"
          life={1.05}
        />
        {isDiving && shortWakePts.length >= 2 && (
          <Trail points={shortWakePts} upto={1} color="#ffc478" width={0.048} opacity={0.82} glow />
        )}

        {/* Vụ nổ dữ dội đúng 16.40s giữa hai dãy CHU */}
        <Explosion
          t={t}
          at={CUE.s01_impact}
          pos={[0.0, 0.45, -0.35]}
          size={5.2}
          seed={28}
          smokeLife={8.8}
          smoke="#3a3633"
        />
        <Explosion
          t={t}
          at={CUE.s01_impact + 0.16}
          pos={[0.75, 0.65, 0.45]}
          size={3.4}
          seed={74}
          smokeLife={8.6}
          smoke="#2f2c2a"
        />

        {/* Lửa cháy bập bùng & cột khói đen bốc lên liên tục từ vách thép CHU bị xé toạc tới cuối cảnh */}
        <DustTrail
          t={t}
          from={CUE.s01_impact + 0.45}
          to={25.0}
          path={firePlumePath}
          rate={7}
          size={2.35}
          color="#322f2d"
          life={4.6}
        />
        {hasImpacted && (
          <group position={[0.05, 0.85, -0.55]}>
            <pointLight position={[0, 0.75, 0.25]} color="#ff6a1f" intensity={fireGlow} distance={24} decay={1.45} />
            {/* Quầng lửa cháy âm ỉ bên trong khung sườn container bị xé toạc */}
            <mesh position={[-0.1, 0.45, -0.35]} scale={[0.85 * flickerWave, 0.7 + 0.25 * flickerWave, 0.65]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshBasicMaterial color="#ff7b29" transparent opacity={0.72} toneMapped={false} />
            </mesh>
            <mesh position={[0.35, 0.32, 0.85]} scale={[0.55, 0.5 * flickerWave, 0.5]}>
              <icosahedronGeometry args={[1, 1]} />
              <meshBasicMaterial color="#ffc45c" transparent opacity={0.68} toneMapped={false} />
            </mesh>
          </group>
        )}
      </Stage>

      {/* Nhãn chữ rõ nét (tối đa 1 nhãn tại mọi thời điểm) */}
      <Label
        t={t}
        text="05:30 · 28/01/2024"
        x={380}
        y={134}
        from={CUE.s01_date}
        until={5.0}
        size={54}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="350 BINH SĨ"
        x={320}
        y={134}
        from={CUE.s01_troops}
        until={9.2}
        size={56}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S01;
