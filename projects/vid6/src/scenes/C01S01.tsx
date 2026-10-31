import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { DustTrail, Explosion, Trail, ballisticPoints } from '@skill/military/3d/fx';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { plain } from '@skill/military/3d/materials';
import { rbox } from '@skill/military/3d/geom';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_GLARE, LOOK_INTERIOR_BAY } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { EnemyT72 } from '../parts/EnemyT72';
import { TurretInterior3D } from '../parts/TurretInterior3D';

// ==================== ĐỊA HÌNH NHỊP 1A: HÀNH LANG SA MẠC TỐC ĐỘ 40 MPH ====================
const H_RUN = heightField({
  seed: 11,
  amp: 2.5,
  scale: 100,
  add: (x, z) => {
    const absZ = Math.abs(z);
    const laneWeight = absZ < 6.5 ? 1 : absZ > 15 ? 0 : 1 - (absZ - 6.5) / 8.5;
    const washBumps = 0.19 * Math.sin(x * 0.28) + 0.12 * Math.cos(x * 0.53 + 0.7);
    const farDunes =
      z < -12
        ? 6.4 * Math.exp(-(((z + 42) / 21) ** 2)) * (0.75 + 0.35 * Math.sin(x * 0.048))
        : z > 13
          ? 2.4 * Math.exp(-(((z - 27) / 13) ** 2))
          : 0;
    return washBumps * laneWeight + farDunes * (1 - laneWeight * 0.85);
  },
});

const AVOID_RUN_LANE = (x: number, z: number) => Math.abs(z) < 7.2 || x < -35 || x > 210;

// ==================== ĐỊA HÌNH NHỊP 1B: THUNG LŨNG & SỐNG ĐỒI TELE NÉN XA ====================
const H_RIDGE = heightField({
  seed: 29,
  amp: 1.45,
  scale: 110,
  flats: [
    [-18, 3.8, 18, 0.12],
    [4, 3.8, 22, 0.12],
    [26, 3.8, 18, 0.14],
  ],
  add: (x, z) => {
    const midSwell = 1.45 * Math.exp(-(((z + 13) / 7.5) ** 2)) * (0.8 + 0.25 * Math.cos(x * 0.09));
    const mainRidge = 5.7 * Math.exp(-(((z + 38) / 10.5) ** 2)) + 0.35 * Math.sin(x * 0.11);
    const backRange = 16.5 * Math.exp(-(((z + 132) / 30) ** 2)) * (0.82 + 0.28 * Math.sin(x * 0.035 + 1.2));
    return midSwell + mainRidge + backRange;
  },
});

// Tránh rải đá chắn ngay trước ống kính camera (z > 14, |x| < 14), trên đường Abrams chạy (z ∈ [-1.5, 9.5]) và quanh T-72
const AVOID_RIDGE = (x: number, z: number) =>
  (z > -1.5 && z < 9.5) ||
  (z > 14 && Math.abs(x) < 15) ||
  (Math.abs(x - 6.2) < 9.5 && Math.abs(z + 38) < 8.5);

const SPEED_40MPH = 17.88; // 40 mph = 17.88 m/s chuẩn vật lý 1:1
const tankRunX = (sec: number) => -6 + sec * SPEED_40MPH;
// Lịch chạy tiền cảnh để M1A2 lao vào từ 21.4s và đúng 22.8–23.6s nằm trọn khung tiền cảnh hùng dũng không chạm phanh
const fgPassX = (sec: number) => (sec - 22.92) * 16.8;

const RANGE_STAKES = Array.from({ length: 16 }, (_, i) => -12 + i * 13);

// Quỹ đạo đạn động năng APFSDS bắn xiên chéo từ thấp-trái tiền cảnh lên đỉnh sống đồi (>42° lệch trục camera)
const T72_REST_X = 6.2;
const T72_REST_Z = -37.2;
const T72_REST_Y = H_RIDGE(T72_REST_X, T72_REST_Z);
const SHOT_START: V3 = [-31.0, 1.35, 13.5];
const SHOT_END: V3 = [T72_REST_X - 0.15, T72_REST_Y + 1.48, T72_REST_Z + 0.25];
const SHOT_POINTS = ballisticPoints(SHOT_START, SHOT_END, 0.24, 72);
const SHOT_HALO_POINTS = ballisticPoints(SHOT_START, SHOT_END, 0.24, 48);

/** Mưa tia lửa kim loại nóng chảy (molten sparks) văng toả đạn đạo khi T-72 nổ tung */
const MoltenSparksShower: React.FC<{ t: number; at: number; origin: V3 }> = ({ t, at, origin }) => {
  const dt = t - at;
  const sparkCoreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffe787',
        toneMapped: false,
      }),
    [],
  );
  const sparkHotMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ff7b1c',
        toneMapped: false,
      }),
    [],
  );

  if (dt < 0 || dt > 5.0) return null;

  return (
    <group position={origin}>
      {Array.from({ length: 48 }, (_, i) => {
        const delay = rnd(i * 3 + 1) * 0.34;
        const age = dt - delay;
        if (age <= 0 || age > 3.8) return null;
        const az = rnd(i * 5 + 2) * Math.PI * 2;
        const elev = 0.42 + rnd(i * 7 + 3) * 0.98;
        const speed = 9.5 + rnd(i * 11 + 4) * 17.5;
        const vx = Math.cos(az) * Math.cos(elev) * speed;
        const vz = Math.sin(az) * Math.cos(elev) * speed;
        const vy0 = Math.sin(elev) * speed;
        const px = vx * age;
        const py = vy0 * age - 4.9 * age * age;
        const pz = vz * age;
        if (py < -2.5) return null;

        const vy = vy0 - 9.8 * age;
        const dir = new THREE.Vector3(vx, vy, vz).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const fade = Math.max(0.18, 1 - age / 3.8);
        const len = (0.38 + rnd(i * 13 + 5) * 0.58) * fade;
        const rad = 0.042 + rnd(i * 17 + 6) * 0.036;

        return (
          <mesh
            key={i}
            position={[px, py, pz]}
            quaternion={quat}
            material={i % 2 === 0 ? sparkCoreMat : sparkHotMat}
          >
            <cylinderGeometry args={[rad * 0.4, rad, len, 6]} />
          </mesh>
        );
      })}
    </group>
  );
};

const C01S01: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const isInsideBeat = t >= CUE.c01_s01_inside_cut && t < CUE.c01_s01_ridge_cut;
  const isRidgeBeat = t >= CUE.c01_s01_ridge_cut;

  const stakePostMat = useMemo(() => plain('#4e473d', 0.72, 0.45), []);
  const stakeBandMat = useMemo(() => plain('#e08e26', 0.45, 0.2), []);
  const interiorDeckMat = useMemo(() => plain('#1b2430', 0.65, 0.55), []);
  const interiorRingMat = useMemo(() => plain('#2e3d4f', 0.45, 0.72), []);

  // ==================== TÍNH TOÁN NHỊP 1A (0.00–9.32 s): BÁM SÁT XÍCH T-158 Ở 40 MPH ====================
  const runX = tankRunX(t);
  const runY = H_RUN(runX, 0);
  const runSlope = Math.atan2(H_RUN(runX + 2.6, 0) - H_RUN(runX - 2.6, 0), 5.2);
  const runJoltPitch = Math.sin(t * 7.8) * 0.024 + Math.sin(t * 14.3) * 0.013;
  const runJoltRoll = Math.sin(t * 6.1 + 0.9) * 0.022 + Math.cos(t * 11.7) * 0.011;

  // Camera quét liên tục từ góc 3/4 thấp đầu mũi sang bám ngang sườn xích T-158 đang nghiền cát ở 40 mph
  const p1A = prog(t, 0, CUE.c01_s01_inside_cut);
  const cam1AXOffset = lerp(7.2, 2.35, p1A);
  const cam1AZ = lerp(4.35, 3.65, p1A);
  const cam1APos: V3 = [
    runX + cam1AXOffset,
    Math.max(
      H_RUN(runX + cam1AXOffset, cam1AZ) + 0.56,
      runY + lerp(1.05, 0.72, p1A) + Math.sin(t * 21) * 0.03,
    ),
    cam1AZ,
  ];
  const cam1ALook: V3 = [
    runX + lerp(0.55, -0.35, p1A),
    runY + lerp(1.38, 1.18, p1A) + Math.cos(t * 18) * 0.02,
    -0.15,
  ];
  const cam1ARoll = 0.022 + Math.sin(t * 13.5) * 0.01;

  // ==================== TÍNH TOÁN NHỊP 1A-2 (9.32–13.40 s): 3 LÍNH THÁP PHÁO XÓC NẢY TRONG HỘP THÉP ====================
  const pInside = prog(t, CUE.c01_s01_inside_cut, CUE.c01_s01_ridge_cut);
  const tossAmp = 0.85 + 0.45 * bump(t, CUE.c01_s01_tossed - 0.2, 1.8);
  const slamBump = bump(t, CUE.c01_s01_tossed, 0.52) - 0.65 * bump(t, CUE.c01_s01_tossed + 0.65, 0.48);
  const boxPitch = (Math.sin(t * 9.8) * 0.062 + Math.sin(t * 17.4) * 0.035 + slamBump * 0.09) * tossAmp;
  const boxRoll = (Math.cos(t * 8.4) * 0.072 + Math.sin(t * 15.1) * 0.036) * tossAmp;
  const boxHeaveY = (Math.sin(t * 11.6) * 0.07 + Math.abs(slamBump) * 0.115) * tossAmp;
  const cadillacJolt = Math.sin(t * 7.6) * 0.3;

  // Đặt góc máy từ sườn phải-sau cửa cắt bổ (x = 0.52 -> 0.12) để thấy trọn cả 3 người lính (Pháo thủ, Trưởng xe, Nạp đạn) không bị má Chobham che!
  const camInsidePos: V3 = [
    lerp(0.56, 0.14, pInside) + Math.sin(t * 19.2) * 0.038,
    lerp(1.78, 1.62, pInside) + Math.cos(t * 22.5) * 0.042,
    lerp(2.98, 2.66, pInside),
  ];
  const camInsideLook: V3 = [
    lerp(-0.08, -0.22, pInside),
    1.04 + boxHeaveY * 0.45,
    -0.14,
  ];
  const camInsideRoll = boxRoll * 0.45 + Math.sin(t * 16.4) * 0.016;

  // ==================== TÍNH TOÁN NHỊP 1B (13.40–23.86 s): TELE SỐNG ĐỒI & ABRAMS VỌT TIỀN CẢNH ====================
  const peekP = prog(t, CUE.c01_s01_ridge_cut - 0.1, CUE.c01_s01_t72_peeks + 0.75);
  const t72X = lerp(9.4, T72_REST_X, peekP);
  const t72Z = lerp(-40.6, T72_REST_Z, peekP);
  const t72Y = H_RIDGE(t72X, t72Z) - lerp(0.45, 0.02, peekP);
  const t72Travel = peekP * 5.4;

  const shotFlyP = prog(t, CUE.c01_s01_shot_streak, CUE.c01_s01_t72_explode, (x) => Math.pow(x, 0.86));
  const showShotTrail = t >= CUE.c01_s01_shot_streak && t <= CUE.c01_s01_t72_explode + 0.42;
  const shotFade =
    t <= CUE.c01_s01_t72_explode
      ? 0.96
      : Math.max(0, 0.96 * (1 - (t - CUE.c01_s01_t72_explode) / 0.42));

  const hitP = prog(t, CUE.c01_s01_t72_explode, CUE.c01_s01_t72_explode + 0.4);
  const popArc = bump(t, CUE.c01_s01_t72_explode, 1.35) * 3.1 + prog(t, CUE.c01_s01_t72_explode, 20.2) * 0.52;
  const popRot: [number, number, number] = [0.26 * hitP, 0.42 * hitP, -0.32 * hitP];

  // M1A2 Abrams lao vút qua tiền cảnh z = 3.8 ở nguyên tốc độ cao không chạm phanh (21.0 -> 23.86 s)
  const showFgAbrams = t >= 20.8;
  const fgX = fgPassX(t);
  const fgZ = 3.8;
  const fgY = H_RIDGE(fgX, fgZ);
  const fgPitch = Math.sin(t * 8.4) * 0.022 + Math.cos(t * 14.1) * 0.012;
  const fgRoll = Math.sin(t * 6.5) * 0.017;

  // Camera tele nén chặt sống đồi (13.4 -> 20.6s), sau đó mở góc & lia nhẹ đón trọn chiếc Abrams lao vút tiền cảnh (20.6 -> 23.86s)
  const pTeleDrift = prog(t, CUE.c01_s01_ridge_cut, 20.6);
  const pFgReveal = prog(t, 20.6, 23.75);
  const blastShake =
    (t >= CUE.c01_s01_t72_explode ? Math.exp(-(t - CUE.c01_s01_t72_explode) * 3.2) : 0) * 0.22;
  const passRumble = bump(t, 21.8, 2.2) * 0.05;

  const cam1BPos: V3 = [
    lerp(-1.6, -0.5, pTeleDrift) + lerp(0, -0.4, pFgReveal) + Math.sin(t * 34) * (blastShake + passRumble),
    lerp(2.55, 2.38, pTeleDrift) + lerp(0, -0.22, pFgReveal) + Math.cos(t * 29) * (blastShake + passRumble),
    lerp(26.5, 25.5, pTeleDrift),
  ];
  const cam1BLook: V3 = [
    lerp(7.2, T72_REST_X, pTeleDrift) + lerp(0, 2.1, pFgReveal),
    lerp(6.0, T72_REST_Y + 1.55, pTeleDrift) + lerp(0, -3.75, pFgReveal),
    T72_REST_Z + lerp(0, 31.0, pFgReveal),
  ];
  const cam1BFov = lerp(25, 23.5, pTeleDrift) + lerp(0, 14.5, pFgReveal);

  const activeStage = isInsideBeat ? LOOK_INTERIOR_BAY.stage : LOOK_DESERT_GLARE.stage;
  const shadowCenter: V3 = isInsideBeat
    ? [0.0, 1.0, 0]
    : !isRidgeBeat
      ? [runX, runY + 1.0, 0]
      : pFgReveal > 0.35
        ? [fgX, fgY + 1.0, fgZ]
        : [T72_REST_X, T72_REST_Y + 1.0, T72_REST_Z];
  const shadowArea = isInsideBeat ? 9 : !isRidgeBeat ? 24 : 34;

  const camPos = isInsideBeat ? camInsidePos : !isRidgeBeat ? cam1APos : cam1BPos;
  const camLook = isInsideBeat ? camInsideLook : !isRidgeBeat ? cam1ALook : cam1BLook;
  const camFov = isInsideBeat ? 39 : !isRidgeBeat ? 42 : cam1BFov;
  const camRoll = isInsideBeat ? camInsideRoll : !isRidgeBeat ? cam1ARoll : passRumble * 0.45;

  const dartHeadIdx = Math.min(
    SHOT_POINTS.length - 1,
    Math.max(0, Math.floor(shotFlyP * (SHOT_POINTS.length - 1))),
  );
  const dartHeadPos = SHOT_POINTS[dartHeadIdx];

  return (
    <AbsoluteFill>
      <Stage
        {...activeStage}
        width={W}
        height={H}
        shadowCenter={shadowCenter}
        shadowArea={shadowArea}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* ==================== NHỊP 1A: GÓC THẤP BÁM XÍCH M1A2 LAO 40 MPH ==================== */}
        {!isInsideBeat && !isRidgeBeat && (
          <group>
            <Terrain
              h={H_RUN}
              size={520}
              seg={220}
              center={[80, 0]}
              colors={LOOK_DESERT_GLARE.terrain}
              grainRepeat={48}
            />
            <Scatter
              kind="rock"
              count={170}
              area={[-30, -90, 210, 65]}
              h={H_RUN}
              seed={14}
              scale={[0.55, 2.0]}
              avoid={AVOID_RUN_LANE}
              tint={LOOK_DESERT_GLARE.scatterTint}
            />
            <Scatter
              kind="rock"
              count={85}
              area={[-30, -75, 210, 55]}
              h={H_RUN}
              seed={27}
              scale={[0.3, 0.85]}
              avoid={AVOID_RUN_LANE}
              tint="#b59e76"
            />

            {/* Hàng cọc mốc trường bắn sa mạc lướt vèo qua ống kính thấp */}
            {RANGE_STAKES.map((sx, idx) => {
              const zSide = idx % 2 === 0 ? -4.3 : 5.4;
              const sy = H_RUN(sx, zSide);
              return (
                <group key={idx} position={[sx, sy, zSide]}>
                  <mesh position={[0, 0.58, 0]} geometry={rbox(0.12, 1.2, 0.12, 0.015)} material={stakePostMat} castShadow />
                  <mesh position={[0, 0.96, 0]} geometry={rbox(0.14, 0.24, 0.14, 0.01)} material={stakeBandMat} />
                </group>
              );
            })}

            <M1A2Abrams
              position={[runX, runY, 0]}
              variant="m1a2"
              camo="desert"
              travel={(t + 2.5) * SPEED_40MPH}
              hullPitch={runSlope + runJoltPitch}
              hullRoll={runJoltRoll}
              turretYaw={-0.08}
              gunPitch={0.025}
              citvYaw={t * 0.7}
              exhaustHeat={0.72}
            />

            <DustTrail
              t={t}
              from={-2.4}
              to={9.5}
              rate={15}
              size={2.85}
              life={2.5}
              color="#d7c197"
              path={(bt) => {
                const bx = tankRunX(bt) - 3.6;
                return [bx, H_RUN(bx, 1.55), 1.55];
              }}
            />
            <DustTrail
              t={t}
              from={-2.4}
              to={9.5}
              rate={15}
              size={2.9}
              life={2.6}
              color="#cdb58a"
              path={(bt) => {
                const bx = tankRunX(bt) - 3.6;
                return [bx, H_RUN(bx, -1.55), -1.55];
              }}
            />
            <DustTrail
              t={t}
              from={-1.2}
              to={9.5}
              rate={12}
              size={1.25}
              life={0.95}
              color="#e3cfa8"
              path={(bt) => {
                const bx = tankRunX(bt) + 1.8;
                return [bx, H_RUN(bx, 1.68), 1.68];
              }}
            />
          </group>
        )}

        {/* ==================== NHỊP 1A-2: KHOANG THÉP CHẬT HẸP RUNG LẮC DỮ DỘI ==================== */}
        {isInsideBeat && (
          <group>
            <mesh position={[0, -0.02, 0]} material={interiorDeckMat} receiveShadow>
              <cylinderGeometry args={[3.4, 3.6, 0.14, 48]} />
            </mesh>
            <mesh position={[0.06, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={interiorRingMat}>
              <ringGeometry args={[1.15, 1.55, 48]} />
            </mesh>

            <pointLight color="#ffaa2b" intensity={4.5} distance={4.2} decay={1.5} position={[0.85, 1.24, 0.92]} />
            <pointLight color="#cce6ff" intensity={2.8} distance={5.5} decay={1.4} position={[-0.35, 2.35, 0.7]} />

            <group position={[0, boxHeaveY, 0]} rotation={[boxRoll, 0, boxPitch]}>
              <TurretInterior3D
                showCrew={true}
                blastDoorOpen={0}
                loaderPhase={0.42 + Math.sin(t * 4.5) * 0.08}
                cadillacTurn={cadillacJolt}
                gunPitch={0.02}
                mirrorTilt={[-boxPitch, -boxRoll]}
              />
            </group>
          </group>
        )}

        {/* ==================== NHỊP 1B: TELE SỐNG ĐỒI 2.5 DẶM, ĐẠN GĂM NỔ TUNG T-72 & ABRAMS VỌT QUA ==================== */}
        {isRidgeBeat && (
          <group>
            <Terrain
              h={H_RIDGE}
              size={540}
              seg={240}
              center={[0, -25]}
              colors={LOOK_DESERT_GLARE.terrain}
              grainRepeat={52}
            />
            <Scatter
              kind="rock"
              count={175}
              area={[-85, -110, 85, 22]}
              h={H_RIDGE}
              seed={41}
              scale={[0.6, 1.95]}
              avoid={AVOID_RIDGE}
              tint={LOOK_DESERT_GLARE.scatterTint}
            />
            <Scatter
              kind="rock"
              count={90}
              area={[-75, -90, 75, 18]}
              h={H_RIDGE}
              seed={59}
              scale={[0.35, 0.9]}
              avoid={AVOID_RIDGE}
              tint="#b59d74"
            />

            <EnemyT72
              position={[t72X, t72Y, t72Z]}
              rotation={[0, -2.22, 0.04]}
              turretYaw={0.28}
              gunPitch={-0.045}
              travel={t72Travel}
              damaged={hitP}
              turretPopHeight={popArc}
              turretPopRot={popRot}
            />

            <DustTrail
              t={t}
              from={CUE.c01_s01_ridge_cut}
              to={CUE.c01_s01_t72_peeks + 0.8}
              rate={7}
              size={1.6}
              life={2.0}
              color="#cbb68c"
              path={(bt) => {
                const bp = prog(bt, CUE.c01_s01_ridge_cut - 0.1, CUE.c01_s01_t72_peeks + 0.75);
                const px = lerp(9.4, T72_REST_X, bp) + 1.8;
                const pz = lerp(-40.6, T72_REST_Z, bp) - 1.5;
                return [px, H_RIDGE(px, pz), pz];
              }}
            />

            {showShotTrail && (
              <group>
                <Trail
                  points={SHOT_HALO_POINTS}
                  upto={shotFlyP}
                  color={PAL.amber}
                  width={0.38}
                  opacity={shotFade * 0.36}
                  glow
                />
                <Trail
                  points={SHOT_POINTS}
                  upto={shotFlyP}
                  color={PAL.amberHot}
                  width={0.17}
                  opacity={shotFade}
                  glow
                />
                {t < CUE.c01_s01_t72_explode && (
                  <group position={dartHeadPos}>
                    <pointLight color="#ffe787" intensity={28} distance={16} decay={1.5} />
                    <mesh>
                      <sphereGeometry args={[0.26, 12, 10]} />
                      <meshBasicMaterial color="#ffffff" toneMapped={false} />
                    </mesh>
                  </group>
                )}
              </group>
            )}

            <Explosion
              t={t}
              at={CUE.c01_s01_t72_explode}
              pos={[T72_REST_X, T72_REST_Y + 1.25, T72_REST_Z]}
              size={5.8}
              smokeLife={6.5}
              seed={7}
              smoke="#4f473f"
            />
            <Explosion
              t={t}
              at={CUE.c01_s01_sparks - 0.55}
              pos={[T72_REST_X - 0.4, T72_REST_Y + 2.1, T72_REST_Z + 0.3]}
              size={3.7}
              smokeLife={5.5}
              seed={19}
              smoke="#3f3832"
            />
            <MoltenSparksShower
              t={t}
              at={CUE.c01_s01_t72_explode}
              origin={[T72_REST_X, T72_REST_Y + 1.5, T72_REST_Z]}
            />

            {/* M1A2 Abrams lao vút ngang tiền cảnh từ trái sang phải, bánh xích cuộn bão cát không hề chạm phanh! */}
            {showFgAbrams && (
              <group>
                <M1A2Abrams
                  position={[fgX, fgY, fgZ]}
                  variant="m1a2"
                  camo="desert"
                  travel={t * SPEED_40MPH}
                  hullPitch={fgPitch}
                  hullRoll={fgRoll}
                  turretYaw={0.92}
                  gunPitch={0.05}
                  citvYaw={1.05}
                  exhaustHeat={0.82}
                />
                <DustTrail
                  t={t}
                  from={20.8}
                  to={24.4}
                  rate={16}
                  size={2.5}
                  life={2.4}
                  color="#d7c196"
                  path={(bt) => {
                    const bx = fgPassX(bt) - 3.6;
                    return [bx, H_RIDGE(bx, fgZ + 1.55), fgZ + 1.55];
                  }}
                />
                <DustTrail
                  t={t}
                  from={20.8}
                  to={24.4}
                  rate={16}
                  size={2.6}
                  life={2.4}
                  color="#ccb488"
                  path={(bt) => {
                    const bx = fgPassX(bt) - 3.6;
                    return [bx, H_RIDGE(bx, fgZ - 1.55), fgZ - 1.55];
                  }}
                />
              </group>
            )}
          </group>
        )}
      </Stage>

      <Label
        t={t}
        text="73.6 TONS · 40 MPH"
        x={370}
        y={930}
        from={CUE.c01_s01_tons}
        until={8.8}
        size={50}
        bg={PAL.amber}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="2.5 MILES"
        x={1630}
        y={145}
        from={CUE.c01_s01_two_half_miles}
        until={17.2}
        size={50}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C01S01;
