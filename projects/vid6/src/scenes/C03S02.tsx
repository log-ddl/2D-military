import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { useSize } from '@core/frame';
import { bump, lerp, prog, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { DustTrail, Explosion, Trail, softDot } from '@skill/military/3d/fx';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_STORM } from '../design/stage';
import { EnemyT72 } from '../parts/EnemyT72';

// ---------- Địa hình chiến trường sa mạc hoàng hôn 1991 (cấp module, không tính lại mỗi khung) ----------
const DESERT_H = heightField({
  seed: 302,
  amp: 4.6,
  scale: 96,
  oct: 5,
  flats: [[0, 0, 14, 0]],
  add: (x, z) => {
    const berm = 1.65 * Math.exp(-(((z + 17) / 7.5) ** 2)) * Math.exp(-(((x - 2) / 26) ** 2));
    const farDuneL = 10.5 * Math.exp(-(((z + 92) / 36) ** 2)) * Math.exp(-(((x + 52) / 70) ** 2));
    const farDuneR = 12.0 * Math.exp(-(((z + 118) / 44) ** 2)) * Math.exp(-(((x - 56) / 78) ** 2));
    const sideRipple = 0.34 * Math.sin(x * 0.16 + z * 0.09);
    return berm + farDuneL + farDuneR + sideRipple;
  },
});

const avoidTankPad = (x: number, z: number) => Math.hypot(x, z) < 13.5;

// Quỹ đạo đạn xuyên động năng APFSDS bắn ngang hông T-72 (~88° lệch trục camera -> không bao giờ suy biến)
const APFSDS_START: V3 = [-28, 2.02, 13.2];
const APFSDS_END: V3 = [0.24, 1.04, 1.68];
const APFSDS_POINTS: V3[] = Array.from({ length: 40 }, (_, i) => {
  const u = i / 39;
  return [
    lerp(APFSDS_START[0], APFSDS_END[0], u),
    lerp(APFSDS_START[1], APFSDS_END[1], u),
    lerp(APFSDS_START[2], APFSDS_END[2], u),
  ];
});

// Quỹ đạo tia lửa chạy xoáy 1.4 vòng ngay trên mặt khay đạn tròn Carousel (y = 1.02..1.18 m để nổi rõ trên 22 viên đạn)
const SPARK_RING_POINTS: V3[] = Array.from({ length: 76 }, (_, i) => {
  const u = i / 75;
  const ang = -0.5 + u * Math.PI * 2 * 1.4;
  const r = 0.61 + 0.04 * Math.sin(u * Math.PI * 6);
  return [0.18 + Math.cos(ang) * r, 1.01 + u * 0.18, Math.sin(ang) * r];
});

// Cột khói dầu mềm tự nhiên bằng sprite mờ phía chân trời xa Bão táp Sa mạc 1991
const OIL_PLUMES: [number, number, number][] = [
  [-95, -175, 1.0],
  [84, -188, 1.15],
];

const DistantHorizonSmoke: React.FC<{ t: number }> = ({ t }) => {
  const smokeMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: new THREE.Color('#3b322c'),
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    [],
  );
  const glowMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: new THREE.Color('#ff8428'),
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    [],
  );

  return (
    <group>
      {OIL_PLUMES.map(([ox, oz, sc], idx) => {
        const oy = DESERT_H(ox, oz);
        const pulse = 1 + 0.14 * Math.sin(t * 6.5 + idx * 2.3);
        return (
          <group key={idx} position={[ox, oy, oz]}>
            <sprite material={glowMat} position={[0, 1.8, 0]} scale={[7.5 * sc * pulse, 5.5 * sc * pulse, 1]} />
            {Array.from({ length: 9 }, (_, k) => {
              const s = (8 + k * 3.8) * sc;
              return (
                <sprite
                  key={k}
                  material={smokeMat}
                  position={[k * 2.4 + Math.sin(t * 0.4 + k) * 0.8, 4.5 + k * 5.2, 0]}
                  scale={[s, s * 0.9, 1]}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

/** Cụm khói lửa cột thẳng đứng có gió tạt nhẹ sang bên để không che khuất vòm tháp pháo 15 tấn đang lộn trên đỉnh 28 m. */
const TurretTossFireColumn: React.FC<{ t: number; at: number; turretY: number }> = ({ t, at, turretY }) => {
  const dt = t - at;
  const fireMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: new THREE.Color('#ff9329'),
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    [],
  );
  const wispMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: new THREE.Color('#52483f'),
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
    [],
  );

  if (dt <= 0) return null;

  return (
    <group>
      {/* Lửa bốc lên liên tục từ miệng giếng thân xe T-72 đang cháy dưới đất */}
      <pointLight position={[0.18, 2.3, 0]} color="#ff7e1f" intensity={28} distance={15} decay={1.5} />
      <sprite material={fireMat} position={[0.18, 2.2, 0]} scale={[3.4, 4.6 + Math.sin(t * 21) * 0.5, 1]} />

      {/* Đèn hắt lửa từ dưới lên chiếu rõ biên dạng vòm tháp đúc 15 tấn & pháo 125mm đang xoay lộn trên không trung */}
      <pointLight
        position={[0.6, Math.max(3, turretY - 2.4), 1.8]}
        color="#ffae42"
        intensity={58}
        distance={18}
        decay={1.35}
      />

      {/* Các cụm khói mỏng bay lệch chiều gió (+X) dọc đường bay để dẫn mắt từ thân xe cháy lên tháp pháo mà không che tháp */}
      {Array.from({ length: 10 }, (_, i) => {
        const frac = (i + 1) / 12;
        const py = lerp(2.5, Math.max(3.5, turretY - 3.6), frac);
        const windDrift = frac * 2.6 + Math.sin(i * 2.1 + t * 1.4) * 0.45;
        const sz = lerp(3.4, 2.1, frac);
        return (
          <sprite
            key={i}
            material={i < 3 ? fireMat : wispMat}
            position={[0.18 + windDrift, py, -frac * 0.8]}
            scale={[sz, sz * 1.15, 1]}
          />
        );
      })}
    </group>
  );
};

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

const C03S02: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // T-72 đang cơ động chậm trên cát rồi khựng lại khi trúng đạn ngang hông lúc 315.58s
  const rollStopP = prog(t, 312.1, CUE.c03_s02_hit, Easing.out(Easing.quad));
  const hitRecoil = bump(t, CUE.c03_s02_hit, 0.42);
  const travel = lerp(0, 4.2, rollStopP);

  // Vệt đạn xuyên ngang hông lúc CUE.c03_s02_hit (315.58s)
  const shotFlyP = prog(t, CUE.c03_s02_hit - 0.22, CUE.c03_s02_hit, Easing.linear);
  const shotFade = 1 - prog(t, CUE.c03_s02_hit + 0.14, CUE.c03_s02_hit + 0.72);

  // Giai đoạn 1 mở hé giải phẫu (316.85 -> 324.94): nhấc tách nhẹ tháp pháo ~0.88 m để lộ trọn mâm đạn tròn 24 viên dưới chân
  // Giữ mức nền 0.042 m trước khi tách để showCarousel={true} vẫn giữ vỏ tháp đúc đặc rắn chắc ở khung đầu
  const cutawayLiftP = prog(t, CUE.c03_s02_carousel - 0.65, CUE.c03_s02_carousel + 0.55, Easing.out(Easing.cubic));

  // Giai đoạn 2 tia lửa chạy vòng quanh mâm đạn như nồi áp suất (322.14 -> 324.94)
  const sparkRingP = prog(t, CUE.c03_s02_spark, CUE.c03_s02_toss - 0.06, Easing.inOut(Easing.quad));
  const damaged =
    t < CUE.c03_s02_hit
      ? 0
      : t < CUE.c03_s02_spark
        ? 0.06
        : lerp(0.06, 1.0, prog(t, CUE.c03_s02_spark, CUE.c03_s02_toss + 0.3));

  // Giai đoạn 3 nổ tung cổ tháp (324.94 -> 328.20): hất tung vòm tháp đúc 15 tấn vọt lên 28 m (~100 ft)
  const tossRaw = prog(t, CUE.c03_s02_toss, 328.05, Easing.linear);
  const tossBallistic = 1 - Math.pow(1 - tossRaw, 2.15);

  const turretPopHeight =
    t < CUE.c03_s02_toss
      ? lerp(0.042, 0.88, cutawayLiftP)
      : lerp(0.88, 28.0, tossBallistic);

  const turretPopRot: [number, number, number] =
    t < CUE.c03_s02_toss
      ? [-0.1 * cutawayLiftP, 0.04 * cutawayLiftP, 0.07 * cutawayLiftP]
      : [
          -0.1 + tossRaw * 0.72,
          0.04 + tossRaw * 3.15,
          0.07 - tossRaw * 2.55,
        ];

  // ---------- Ngôn ngữ Camera <Cam> 4 nhịp ----------
  // Nhịp 1 (312.12 -> 316.70): Trung cảnh sườn phải-trước bám T-72 giữa sa mạc hoàng hôn & cú đạn xuyên ngang hông sắc gọn
  // Nhịp 2 (316.70 -> 321.80): Ép cận góc chéo ~31° thấy trọn cả vòm tháp nhấc tách giải phẫu lẫn toàn bộ 22 viên đạn trong mâm tròn dưới chân
  // Nhịp 3 (321.80 -> 324.85): Lia siết quanh miệng giếng khi tia lửa chạy vòng quanh mâm đạn như nồi áp suất
  // Nhịp 4 (324.85 -> 328.20): Lùi rộng hạ thấp và ngửa theo cột lửa lên trời hoàng hôn — thấy trọn thân xe cháy dưới đất & tháp pháo 15 tấn xoay lộn rõ nét ở độ cao 28 m (100 ft)
  const pApproach = prog(t, 312.32, CUE.c03_s02_hit + 0.85);
  const pCutaway = prog(t, CUE.c03_s02_carousel - 0.75, CUE.c03_s02_two_dozen + 0.4, Easing.inOut(Easing.cubic));
  const pOrbitCarousel = prog(t, CUE.c03_s02_two_dozen + 0.4, CUE.c03_s02_toss - 0.12, Easing.inOut(Easing.quad));
  const pSkyTilt = prog(t, CUE.c03_s02_toss - 0.08, 328.0, Easing.out(Easing.cubic));

  const pos0: V3 = [5.4, 2.25, 10.4];
  const pos1: V3 = [3.8, 2.05, 8.2];
  const pos2: V3 = [2.95, 3.62, 3.92]; // khoảng cách vừa đẹp thấy trọn cả vòm tháp nhấc lên lẫn khay đạn tròn bên dưới
  const pos3: V3 = [1.85, 3.68, 4.18]; // lia quanh khay đạn khi tia lửa chạy vòng
  const pos4: V3 = [10.4, 2.55, 27.2]; // thu trọn y = -0.8m (bánh xích & cát) tới y = +36m (tháp pháo bay ở y = 29.5m)

  const look0: V3 = [0.25, 1.32, 0];
  const look1: V3 = [0.18, 1.28, 0.15];
  const look2: V3 = [0.18, 1.26, 0];
  const look3: V3 = [0.18, 1.28, 0];
  const look4: V3 = [0.35, 13.8, 0];

  let camPos = lerpV3(pos0, pos1, pApproach);
  let camLook = lerpV3(look0, look1, pApproach);
  if (pCutaway > 0) {
    camPos = lerpV3(camPos, pos2, pCutaway);
    camLook = lerpV3(camLook, look2, pCutaway);
  }
  if (pOrbitCarousel > 0) {
    camPos = lerpV3(camPos, pos3, pOrbitCarousel);
    camLook = lerpV3(camLook, look3, pOrbitCarousel);
  }
  if (pSkyTilt > 0) {
    camPos = lerpV3(camPos, pos4, pSkyTilt);
    camLook = lerpV3(camLook, look4, pSkyTilt);
  }

  const shakeAmt = hitRecoil * 0.08 + bump(t, CUE.c03_s02_toss, 0.65) * 0.2;
  const finalCamPos: V3 = [
    camPos[0] + Math.sin(t * 43) * shakeAmt,
    camPos[1] + Math.cos(t * 37) * shakeAmt,
    camPos[2],
  ];

  const fov = lerp(40, 43, pCutaway) + pSkyTilt * 13;

  const sparkIdx = Math.min(SPARK_RING_POINTS.length - 1, Math.floor(sparkRingP * (SPARK_RING_POINTS.length - 1)));
  const sparkHeadPos = SPARK_RING_POINTS[sparkIdx];
  const cutawayGlow = cutawayLiftP * (1 - prog(t, CUE.c03_s02_toss + 0.15, CUE.c03_s02_toss + 0.8));

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_DESERT_STORM.stage}
        width={W}
        height={H}
        shadowArea={34}
        shadowCenter={[0, 2, 0]}
      >
        <Cam pos={finalCamPos} look={camLook} fov={fov} />

        {/* Địa hình sa mạc hoàng hôn Bão táp Sa mạc 1991 */}
        <Terrain h={DESERT_H} size={520} seg={220} colors={LOOK_DESERT_STORM.terrain} />
        <Scatter
          kind="rock"
          count={88}
          area={[-125, -145, 125, 95]}
          h={DESERT_H}
          seed={31}
          scale={[0.45, 1.35]}
          avoid={avoidTankPad}
          tint={LOOK_DESERT_STORM.scatterTint}
        />
        <Scatter
          kind="bush"
          count={46}
          area={[-115, -125, 115, 85]}
          h={DESERT_H}
          seed={57}
          scale={[0.38, 0.85]}
          avoid={avoidTankPad}
          tint="#8c7b5c"
        />

        <DistantHorizonSmoke t={t} />

        {/* Bụi xích nhẹ trước khi T-72 trúng đạn */}
        <DustTrail
          t={t}
          from={312.0}
          to={CUE.c03_s02_hit}
          path={(bt) => [-3.1 + prog(bt, 312.1, CUE.c03_s02_hit) * 0.4, 0.1, 0]}
          rate={6}
          size={1.7}
          color="#c5a67c"
          life={2.4}
        />

        {/* Xe tăng T-72 đối phương */}
        <group rotation={[hitRecoil * 0.026, 0.16, -hitRecoil * 0.02]}>
          <EnemyT72
            showCarousel={true}
            travel={travel}
            turretYaw={0.24}
            gunPitch={0.04}
            turretPopHeight={turretPopHeight}
            turretPopRot={turretPopRot}
            damaged={damaged}
          />

          {/* Ánh lửa cam đỏ giải phẫu chiếu rõ toàn bộ 22 viên đạn xếp hướng tâm trong khay tròn dưới chân */}
          {cutawayGlow > 0.01 && (
            <group position={[0.18, 1.24, 0]}>
              <pointLight
                color={sparkRingP > 0.02 ? '#ff8b26' : '#ff5518'}
                intensity={12 * cutawayGlow + sparkRingP * 48}
                distance={6.0}
                decay={1.5}
              />
              {/* Đèn phụ cao chiếu rõ các vỏ liều phóng cam & đế đồng ở vành ngoài khay đạn */}
              <pointLight
                position={[0.35, 0.55, 0.45]}
                color="#ffb45c"
                intensity={10 * cutawayGlow}
                distance={4.5}
                decay={1.6}
              />
              <mesh position={[0, -0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.85, 0.91, 48]} />
                <meshBasicMaterial
                  color={sparkRingP > 0.05 ? '#ffbe55' : '#ff5a24'}
                  transparent
                  opacity={0.72 * cutawayGlow}
                  toneMapped={false}
                />
              </mesh>
            </group>
          )}

          {/* Lỗ đạn xuyên động năng nhỏ gọn sắc nét đúng cỡ thanh xuyên trên diềm hông phải */}
          {t >= CUE.c03_s02_hit && (
            <group position={[0.24, 1.04, 1.805]}>
              <mesh>
                <circleGeometry args={[0.085, 18]} />
                <meshBasicMaterial color="#141110" />
              </mesh>
              <mesh position={[0, 0, 0.004]}>
                <ringGeometry args={[0.028, 0.055, 18]} />
                <meshBasicMaterial color="#ff5e14" toneMapped={false} />
              </mesh>
              <mesh position={[0, 0, 0.008]}>
                <circleGeometry args={[0.028, 16]} />
                <meshBasicMaterial color="#fff1b8" toneMapped={false} />
              </mesh>
            </group>
          )}

          {/* Tia lửa chạy vòng kích nổ liên hoàn ngay trên mặt khay đạn tròn (CUE.c03_s02_spark -> pressure_cooker) */}
          {sparkRingP > 0.005 && t < CUE.c03_s02_toss + 0.15 && (
            <group>
              <Trail
                points={SPARK_RING_POINTS}
                upto={sparkRingP}
                color="#ff9924"
                width={0.052}
                opacity={0.95}
                glow
              />
              <Trail
                points={SPARK_RING_POINTS}
                upto={sparkRingP}
                color="#fff8d6"
                width={0.024}
                opacity={1}
                glow
              />
              <mesh position={sparkHeadPos}>
                <sphereGeometry args={[0.085 + sparkRingP * 0.055, 14, 12]} />
                <meshBasicMaterial color="#fffbe0" toneMapped={false} />
              </mesh>
              {Array.from({ length: 22 }, (_, i) => {
                const trigger = i / 22;
                if (sparkRingP < trigger) return null;
                const ang = -0.5 + trigger * Math.PI * 2;
                const pulse = Math.min(1, (sparkRingP - trigger) * 5);
                return (
                  <mesh
                    key={i}
                    position={[0.18 + Math.cos(ang) * 0.62, 0.98, Math.sin(ang) * 0.62]}
                    scale={0.6 + pulse * 0.65}
                  >
                    <sphereGeometry args={[0.068, 10, 8]} />
                    <meshBasicMaterial color="#ff7b1f" transparent opacity={0.88} toneMapped={false} />
                  </mesh>
                );
              })}
            </group>
          )}

          {/* Cột lửa & khói dẫn hướng chiều cao vụ nổ mà vẫn giữ vòm tháp pháo 15 tấn ở độ cao 28 m sắc nét 100% */}
          <TurretTossFireColumn t={t} at={CUE.c03_s02_toss} turretY={1.5 + turretPopHeight} />
        </group>

        {/* Vệt đạn xuyên động năng APFSDS bắn ngang hông lúc 315.58s */}
        {t >= CUE.c03_s02_hit - 0.24 && shotFade > 0.01 && (
          <>
            <Trail
              points={APFSDS_POINTS}
              upto={shotFlyP}
              color="#ff9924"
              width={0.085}
              opacity={0.8 * shotFade}
              glow
            />
            <Trail
              points={APFSDS_POINTS}
              upto={shotFlyP}
              color="#fff5cc"
              width={0.036}
              opacity={0.98 * shotFade}
              glow
            />
          </>
        )}

        {/* Chớp xuyên giáp động năng gọn đanh lúc 315.58s (không che khuất thân xe T-72) */}
        <Explosion
          t={t}
          at={CUE.c03_s02_hit}
          pos={[0.25, 1.05, 1.78]}
          size={0.62}
          seed={5}
          smokeLife={3.2}
          smoke="#5c5248"
        />

        {/* Đại cảnh nổ tung cổ tháp pháo lúc 324.94s (cột khói cao tới ~18m để tháp pháo ở 28m nổi rõ trên bầu trời hoàng hôn!) */}
        <Explosion
          t={t}
          at={CUE.c03_s02_toss}
          pos={[0.18, 1.55, 0]}
          size={3.1}
          seed={11}
          smokeLife={5.8}
          smoke="#3d352e"
        />
        <Explosion
          t={t}
          at={CUE.c03_s02_toss + 0.16}
          pos={[1.1, 5.2, -0.6]}
          size={2.35}
          seed={17}
          smokeLife={5.2}
          smoke="#473e36"
        />
      </Stage>

      <Label
        t={t}
        text="T-72"
        from={CUE.c03_s02_t72}
        until={316.7}
        x={W * 0.22}
        y={H * 0.2}
        bg={PAL.cream}
        fg={PAL.ink}
      />

      <Label
        t={t}
        text="100 FT"
        from={CUE.c03_s02_100ft}
        until={328.0}
        x={W * 0.76}
        y={H * 0.24}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C03S02;
