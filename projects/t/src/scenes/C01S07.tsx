// C01S07 (36.18–45.10 s): Đại cảnh thảo nguyên cắt ngang quỹ đạo đột kích nóc chữ J ngược 150 m → chúc thẳng đứng 90° xuống nóc MBT.
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { MuzzleBlast, Trail } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { HUDLabel, STAGE_BATTLE, TERRAIN_STEPPE, THEME } from '../design';
import { MBT } from '../parts/MBT';
import { ATGM } from '../parts/ATGM';

const LAUNCH_X = -25.4;
const TANK_X = 24.0;
const TARGET_ROOF_X = 24.18;
const APEX_Y = 34.0;
const APEX_X = 15.6;

// Địa hình thảo nguyên rộng lớn: gò phục kích trái (x = -25.4, cao 2.2 m), thung lũng mở tầm nhìn hoàng hôn ở giữa, bãi phẳng đặt MBT phải (x = 24, cao 0 m)
const STEPPE_H = heightField({
  seed: 73,
  amp: 3.4,
  scale: 125,
  flats: [
    [TANK_X, 0, 11.5, 0.0],
    [-26.0, 0, 7.2, 2.2],
  ],
  add: (x, z) => {
    const leftKnoll = 2.2 * Math.exp(-(((x + 28.0) / 15) ** 2 + (z / 22) ** 2));
    const shallowBasin = -0.8 * Math.exp(-(((x - 1.0) / 18) ** 2 + (z / 28) ** 2));
    // Hai triền đồi xa hai bên tạo thung lũng mở ra chân trời hoàng hôn ấm ở giữa
    const farFlankHills =
      z < -38
        ? (8.5 + 4.5 * Math.sin(x * 0.035 + 1.1)) *
          Math.exp(-(((z + 115) / 48) ** 2)) *
          (0.42 + 0.58 * Math.min(1, (Math.abs(x - 4) / 52) ** 1.4))
        : 0;
    return leftKnoll + shallowBasin + farFlankHills;
  },
});

const avoidSightCorridor = (x: number, z: number) =>
  (Math.abs(z) < 12.5 && x > -35 && x < 37) ||
  Math.hypot(x - TANK_X, z) < 11.0 ||
  Math.hypot(x + 26.0, z) < 7.0;

const avoidCenterHorizon = (x: number, z: number) =>
  avoidSightCorridor(x, z) || (z < -30 && Math.abs(x - 6) < 28);

// Quỹ đạo chữ J ngược đột kích nóc: phóng từ gò trái (-24.7, 2.88, 0) -> vọt dốc gắt lên đỉnh vòm (15.6, 34.0, 0) -> uốn gắt bổ nhào ~90° xuống nóc MBT
const TOP_ATTACK_WAYPOINTS: V3[] = [
  [-24.7, 2.88, 0],
  [-18.5, 7.0, 0],
  [-7.2, 18.4, 0],
  [4.4, 29.3, 0],
  [APEX_X, APEX_Y, 0],
  [21.6, 31.0, 0],
  [23.76, 21.6, 0],
  [24.13, 12.0, 0],
  [TARGET_ROOF_X, 5.05, 0], // Đầu vệt khói dừng ở y = 5.05 để đuôi đạn khớp khít và mũi đạn (scale 2.35) cách mặt nóc ~10 cm tại t = 45.10 s
];

const TOP_ATTACK_CURVE = new THREE.CatmullRomCurve3(
  TOP_ATTACK_WAYPOINTS.map((p) => new THREE.Vector3(...p)),
  false,
  'centripetal',
  0.35,
);

const ARC_SAMPLES = 240;
const ARC_POINTS: V3[] = Array.from({ length: ARC_SAMPLES }, (_, i) => {
  const p = TOP_ATTACK_CURVE.getPointAt(i / (ARC_SAMPLES - 1));
  return [p.x, p.y, p.z];
});

// Đường đạn bắn thẳng thấp là là mặt đất lao vào tấm khiên giáp trước 800 mm (bị chặn/từ chối)
const DIRECT_START: V3 = [-24.5, 2.82, 0.35];
const DIRECT_END: V3 = [20.25, 1.58, 0.35];
const DIRECT_POINTS: V3[] = Array.from({ length: 48 }, (_, i) => {
  const u = i / 47;
  return [
    lerp(DIRECT_START[0], DIRECT_END[0], u),
    lerp(DIRECT_START[1], DIRECT_END[1], u) + Math.sin(u * Math.PI) * 0.22,
    lerp(DIRECT_START[2], DIRECT_END[2], u),
  ];
});

const MAT_SANDBAG = plain('#7d7055', 0.92, 0.04);
const MAT_BERM_ROCK = plain('#59534b', 0.88, 0.08);
const GEO_CROSS_BAR = rbox(2.05, 0.26, 0.14, 0.04);
const GEO_SHIELD_PLATE = rbox(0.16, 2.2, 3.15, 0.04);

const C01S07: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  // ---------------- 1. NHỊP DIỄN HOẠT THEO MỐC VOICE CUE ----------------
  // Nhấn nhấp nháy tử huyệt nóc mỏng từ từ khoá "tử huyệt" (37.76 s)
  const weakBeaconIn = prog(t, CUE.c01_exploit_weak + 1.35, CUE.c01_exploit_weak + 1.95);
  const weakPulse = 0.68 + 0.32 * Math.sin((t - CUE.c01_exploit_weak) * 6.5);

  // Nửa đầu bật highlightZone="both" (thấy rõ khiên trước xanh dày & nóc/sau đỏ mỏng); khi lên đỉnh & bổ nhào nhấn đỏ tử huyệt nóc
  const highlightZone: 'both' | 'weak' = t < CUE.c01_apex_150m ? 'both' : 'weak';

  // Đường bắn thẳng bị từ chối lúc "thay vì lao thẳng vào tấm khiên dày nhất" (38.62 -> tắt hẳn lúc tên lửa vọt lên 42.3 s)
  const directDraw = prog(t, CUE.c01_bypass_front, CUE.c01_bypass_front + 0.7, Easing.out(Easing.cubic));
  const directBlocked = prog(t, CUE.c01_bypass_front + 0.64, CUE.c01_bypass_front + 0.92);
  const directFade = 1 - prog(t, CUE.c01_climb_start, CUE.c01_apex_150m + 0.15);
  const shieldFlash = bump(t, CUE.c01_bypass_front + 0.66, 1.45);

  // Tiến độ bay u (0..1) của tên lửa ATGM trên đường cong chữ J ngược khớp từng mốc CUE:
  // - 40.68..41.56: phóng mềm rời ống (u: 0 -> 0.105)
  // - 41.56..42.50: kích hoạt động cơ vọt dốc gắt lên đỉnh vòm 150m (u: 0.105 -> 0.51)
  // - 42.50..43.36: uốn gắt qua đỉnh vòm chữ J chúc mũi 90° xuống (u: 0.51 -> 0.69)
  // - 43.36..45.10: bổ nhào thẳng đứng tốc độ cao xuống sát nóc tháp pháo (u: 0.69 -> 1.00; ở 44.63 s đạt u ≈ 0.89 ngay trên nóc tăng!)
  const uSoft = prog(t, CUE.c01_top_missile, CUE.c01_climb_start, Easing.out(Easing.quad));
  const uClimb = prog(t, CUE.c01_climb_start, CUE.c01_apex_150m + 0.14, Easing.inOut(Easing.quad));
  const uTurn = prog(t, CUE.c01_apex_150m + 0.14, CUE.c01_vertical_dive, Easing.inOut(Easing.sin));
  const uDive = prog(
    t,
    CUE.c01_vertical_dive,
    CUE.c01_roof_approach,
    Easing.bezier(0.32, 0.08, 0.68, 1.0),
  );

  let missileU = 0;
  if (t >= CUE.c01_top_missile) {
    if (t < CUE.c01_climb_start) {
      missileU = lerp(0.0, 0.105, uSoft);
    } else if (t < CUE.c01_apex_150m + 0.14) {
      missileU = lerp(0.105, 0.51, uClimb);
    } else if (t < CUE.c01_vertical_dive) {
      missileU = lerp(0.51, 0.69, uTurn);
    } else {
      missileU = lerp(0.69, 1.0, uDive);
    }
  }

  const missileActive = t >= CUE.c01_top_missile;
  const finsOpen = prog(t, CUE.c01_top_missile + 0.06, CUE.c01_top_missile + 0.42);
  const mainMotorOn = t >= CUE.c01_climb_start;
  const thrust = !missileActive ? 0 : mainMotorOn ? 1.0 : 0.35;
  const missileScale = 2.35;
  const tailOffset = 0.55 * missileScale; // Đặt đuôi loa phụt khớp đúng đầu mút <Trail>

  const { missilePos, ignitionPos } = useMemo(() => {
    const ign = TOP_ATTACK_CURVE.getPointAt(0.105);
    return {
      missilePos: new THREE.Vector3(),
      ignitionPos: [ign.x, ign.y, ign.z] as V3,
    };
  }, []);

  const clampedU = Math.max(0, Math.min(1, missileU));
  const trailTip = TOP_ATTACK_CURVE.getPointAt(clampedU);
  const tangent = TOP_ATTACK_CURVE.getTangentAt(clampedU).normalize();
  missilePos.copy(trailTip).addScaledVector(tangent, tailOffset);
  const pitchRad = Math.atan2(tangent.y, tangent.x);

  // Cột thước đo độ cao 150 m dựng dần theo đà vọt lên đỉnh vòm, mờ tắt gọn khi máy chúc vào pha bổ nhào cận cảnh
  const altRulerGrow = prog(t, CUE.c01_climb_start, CUE.c01_apex_150m, Easing.out(Easing.cubic));
  const altRulerFade = 1 - prog(t, CUE.c01_vertical_dive + 0.15, CUE.c01_vertical_dive + 1.05);

  // ---------------- 2. CHUYỂN ĐỘNG CAMERA ĐẠI CẢNH → TRỌN VÒM 150M → CHÚC THẲNG ĐỨNG ----------------
  // Pha 1 (36.18 -> 40.68): Đại cảnh cắt ngang tầm rộng thấy trọn gò phóng trái & MBT phải
  const pPan = prog(t, CUE.c01_exploit_weak, CUE.c01_top_missile, Easing.inOut(Easing.sin));
  // Pha 2 (40.68 -> 43.36): Nâng máy mở trọn bầu trời sao cho thấy CẢ đỉnh vòm y=34.0 (dư khoảng trời phía trên) LẪN chiếc MBT y=0 bên dưới!
  const pClimbCam = prog(t, CUE.c01_top_missile, CUE.c01_vertical_dive, Easing.inOut(Easing.cubic));
  // Pha 3 (43.36 -> 45.10): Vọt lên vị trí cao bên cạnh đỉnh vòm chúc thẳng ống kính xuống lưng quả tên lửa đang bổ nhào vuông góc vào nóc MBT!
  const pDiveCam = prog(t, CUE.c01_vertical_dive, CUE.c01_roof_approach, Easing.inOut(Easing.cubic));

  const camBaseX = lerp(-0.5, 1.5, pPan);
  const camBaseY = lerp(10.6, 11.4, pPan);
  const camBaseZ = lerp(47.0, 48.5, pPan);
  const lookBaseX = lerp(-0.5, 1.2, pPan);
  const lookBaseY = lerp(4.2, 4.8, pPan);

  // Tại đỉnh vòm (42.4..43.36 s): Cam ở [7.5, 21.5, 54.0] nhìn [5.5, 18.2, 0] với fov=46 => phủ dọc y = [-4.2 .. +40.6 m] (thấy trọn đỉnh 34 m + MBT!)
  const camApexX = lerp(camBaseX, 7.5, pClimbCam);
  const camApexY = lerp(camBaseY, 21.5, pClimbCam);
  const camApexZ = lerp(camBaseZ, 54.0, pClimbCam);
  const lookApexX = lerp(lookBaseX, 5.5, pClimbCam);
  const lookApexY = lerp(lookBaseY, 18.2, pClimbCam);

  // Khi bổ nhào (43.36 -> 45.10 s): máy vòng cao qua đỉnh vòm ([18, 36, 22] -> [17.8, 19.5, 14.5]) chúc xuống [23.8, 5.5, 0]
  // Tại t=44.63 s: thấy trọn quả tên lửa đang lao thẳng đứng ở y ≈ 7.5 m + vệt khói vàng rực kéo từ trên cao + tấm nóc đỏ MBT ngay dưới mũi đạn!
  const diveArcLift = Math.sin(pDiveCam * Math.PI) * 9.5;
  const camPos: V3 = [
    lerp(camApexX, 17.8, pDiveCam),
    lerp(camApexY, 19.5, pDiveCam) + diveArcLift,
    lerp(camApexZ, 14.5, pDiveCam),
  ];
  const camLook: V3 = [
    lerp(lookApexX, TARGET_ROOF_X - 0.3, pDiveCam),
    lerp(lookApexY, 5.4, pDiveCam),
    0,
  ];
  const camFov = lerp(lerp(42, 46.5, pClimbCam), 45, pDiveCam);

  // Nét đứt dẫn hướng quỹ đạo dự kiến trên bầu trời
  const guideFade =
    prog(t, CUE.c01_top_missile, CUE.c01_climb_start + 0.25) *
    (1 - 0.65 * prog(t, CUE.c01_vertical_dive + 0.3, CUE.c01_roof_approach));

  return (
    <AbsoluteFill>
      <Stage
        width={W}
        height={H}
        {...STAGE_BATTLE}
        shadowArea={46}
        shadowCenter={[2, 2, 0]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* 1. ĐỊA HÌNH THẢO NGUYÊN ĐỒI RỘNG LỚN & THẢM THỰC VẬT TỰ NHIÊN */}
        <Terrain h={STEPPE_H} size={520} seg={220} colors={TERRAIN_STEPPE} />
        <Scatter
          kind="rock"
          count={72}
          area={[-135, -115, 135, 80]}
          h={STEPPE_H}
          seed={19}
          scale={[0.55, 1.45]}
          avoid={avoidSightCorridor}
          tint="#b4aa9a"
        />
        <Scatter
          kind="bush"
          count={115}
          area={[-145, -125, 145, 85]}
          h={STEPPE_H}
          seed={31}
          scale={[0.65, 1.35]}
          avoid={avoidSightCorridor}
          tint="#9f9167"
        />
        <Scatter
          kind="broadleaf"
          count={38}
          area={[-165, -155, 165, -36]}
          h={STEPPE_H}
          seed={53}
          scale={[0.85, 1.45]}
          avoid={avoidCenterHorizon}
          tint="#8c835e"
        />
        <Scatter
          kind="pine"
          count={34}
          area={[-175, -160, 175, -42]}
          h={STEPPE_H}
          seed={47}
          scale={[0.9, 1.55]}
          avoid={avoidCenterHorizon}
          tint="#6d7863"
        />

        {/* 2. CÔNG SỰ PHỤC KÍCH TRÊN GÒ ĐỒI TRÁI (x = -25.4, y = 2.2) & ỐNG PHÓNG ATGM */}
        <group position={[LAUNCH_X, 2.2, 0]}>
          {[-0.55, 0, 0.55].map((zb, i) => (
            <mesh
              key={i}
              position={[0.55, 0.24, zb]}
              rotation={[0, (i - 1) * 0.18, 0]}
              geometry={rbox(0.55, 0.34, 0.62, 0.1)}
              material={MAT_SANDBAG}
              castShadow
              receiveShadow
            />
          ))}
          <mesh
            position={[-0.45, 0.2, 0.85]}
            rotation={[0.1, 0.4, 0]}
            geometry={rbox(0.9, 0.48, 0.75, 0.18)}
            material={MAT_BERM_ROCK}
            castShadow
            receiveShadow
          />
          <ATGM
            mode={t < CUE.c01_top_missile ? 'loaded' : 'launcher'}
            position={[0.15, 0.62, 0]}
            rotation={[0, 0, 0.56]}
            scale={1.75}
          />
        </group>

        {/* Khói phụt liều phóng mềm rời ống tại 40.68 s & liều hành trình kích hoạt vọt lên tại 41.56 s */}
        <MuzzleBlast
          t={t}
          at={CUE.c01_top_missile}
          pos={[-24.7, 2.88, 0]}
          dir={[0.84, 0.54, 0]}
          size={1.25}
          seed={5}
        />
        <MuzzleBlast
          t={t}
          at={CUE.c01_climb_start}
          pos={ignitionPos}
          dir={[-0.74, -0.67, 0]}
          size={1.85}
          seed={9}
        />

        {/* 3. XE TĂNG CHỦ LỰC MBT BÊN PHẢI CHIẾN TRƯỜNG (x = 24, z = 0, mũi hướng -X sang trái) */}
        <MBT
          position={[TANK_X, 0, 0]}
          rotation={[0, Math.PI, 0]}
          turretYaw={0.03}
          gunPitch={0.04}
          highlightZone={highlightZone}
        />

        {/* Vòng tâm khóa tử huyệt đỏ trên nóc tháp pháo mỏng 30–40 mm */}
        {weakBeaconIn > 0.01 && (
          <group position={[TARGET_ROOF_X, 2.52, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, (t - CUE.c01_exploit_weak) * 0.9]}>
              <ringGeometry args={[1.05, 1.26, 36]} />
              <meshBasicMaterial
                color={THEME.armorWeak}
                transparent
                opacity={0.82 * weakBeaconIn * weakPulse}
                side={THREE.DoubleSide}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.36, 0.52, 28]} />
              <meshBasicMaterial
                color={THEME.amberGold}
                transparent
                opacity={0.88 * weakBeaconIn}
                side={THREE.DoubleSide}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          </group>
        )}

        {/* 4. ĐƯỜNG ĐẠN BẮN THẲNG THẤP LÀ LÀ MẶT ĐẤT LAO VÀO KHIÊN TRƯỚC → BỊ CHẶN & TẮT HẲN KHI ĐẠN VỌT LÊN */}
        {directDraw > 0.005 && directFade > 0.01 && (
          <group>
            <Trail
              points={DIRECT_POINTS}
              upto={directDraw}
              color={directBlocked > 0.5 ? '#9e5450' : THEME.threatRed}
              width={0.14}
              opacity={0.84 * directFade}
              glow={directBlocked < 0.6}
            />

            {shieldFlash > 0.01 && (
              <mesh
                position={[20.1, 1.62, 0]}
                rotation={[0, 0, -0.36]}
                geometry={GEO_SHIELD_PLATE}
              >
                <meshBasicMaterial
                  color={THEME.armorStrong}
                  transparent
                  opacity={0.58 * shieldFlash}
                  toneMapped={false}
                  depthWrite={false}
                />
              </mesh>
            )}

            {directBlocked > 0.02 && (
              <group
                position={[19.55, 1.85, 0.85]}
                scale={0.82 + 0.24 * directBlocked}
              >
                <mesh rotation={[0, 0, Math.PI / 4]} geometry={GEO_CROSS_BAR}>
                  <meshBasicMaterial
                    color={THEME.threatRed}
                    transparent
                    opacity={0.94 * directBlocked * directFade}
                    toneMapped={false}
                  />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 4]} geometry={GEO_CROSS_BAR}>
                  <meshBasicMaterial
                    color={THEME.threatRed}
                    transparent
                    opacity={0.94 * directBlocked * directFade}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            )}
          </group>
        )}

        {/* 5. CỘT VẠCH THƯỚC ĐỘ CAO 150 M BÊN CẠNH ĐỈNH VÒM & NÉT ĐỨT DẪN HƯỚNG QUỸ ĐẠO */}
        {guideFade > 0.01 &&
          Array.from({ length: 34 }, (_, i) => {
            const uMid = (i + 0.5) / 34;
            if (uMid <= clampedU + 0.02) return null;
            const pt = TOP_ATTACK_CURVE.getPointAt(uMid);
            const tg = TOP_ATTACK_CURVE.getTangentAt(uMid);
            const ang = Math.atan2(tg.y, tg.x);
            return (
              <mesh key={i} position={[pt.x, pt.y, -0.15]} rotation={[0, 0, ang]}>
                <boxGeometry args={[0.72, 0.09, 0.09]} />
                <meshBasicMaterial
                  color={THEME.amberGold}
                  transparent
                  opacity={0.34 * guideFade}
                  toneMapped={false}
                  depthWrite={false}
                />
              </mesh>
            );
          })}

        {altRulerGrow > 0.01 && (
          <group position={[APEX_X, 0, -1.6]}>
            <mesh position={[0, (APEX_Y * altRulerGrow) / 2, 0]}>
              <boxGeometry args={[0.1, Math.max(0.1, APEX_Y * altRulerGrow), 0.1]} />
              <meshBasicMaterial
                color={THEME.amberGold}
                transparent
                opacity={0.62 * altRulerFade}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>

            {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac, idx) => {
              if (altRulerGrow < frac - 0.03) return null;
              const isTop = idx === 4;
              const yTick = APEX_Y * frac;
              return (
                <mesh key={idx} position={[isTop ? 1.8 : 0, yTick, 0]}>
                  <boxGeometry args={[isTop ? 11.2 : 1.9, isTop ? 0.16 : 0.09, 0.09]} />
                  <meshBasicMaterial
                    color={isTop ? THEME.amberGold : '#ffe08a'}
                    transparent
                    opacity={(isTop ? 0.9 : 0.52) * altRulerFade}
                    toneMapped={false}
                    depthWrite={false}
                  />
                </mesh>
              );
            })}
          </group>
        )}

        {/* 6. QUẢ ĐẠN TÊN LỬA ATGM & VỆT KHÓI LỬA ĐỘT KÍCH NÓC CHỮ J NGƯỢC */}
        {missileActive && (
          <>
            <Trail
              points={ARC_POINTS}
              upto={clampedU}
              color="#ffae38"
              width={0.23}
              opacity={0.94}
              glow
            />
            <Trail
              points={ARC_POINTS}
              upto={clampedU}
              color="#ffe294"
              width={0.11}
              opacity={0.98}
              glow
            />
            <group
              position={[missilePos.x, missilePos.y, missilePos.z]}
              rotation={[0, 0, pitchRad]}
            >
              <ATGM
                mode="missile"
                finsOpen={finsOpen}
                thrust={thrust}
                scale={missileScale}
                rotation={[(t - CUE.c01_top_missile) * 2.4, 0, 0]}
              />
            </group>
          </>
        )}
      </Stage>

      {/* HUD số liệu chiến thuật đúng mốc 150m@42.38 */}
      <HUDLabel
        t={t}
        from={CUE.c01_apex_150m}
        until={CUE.c01_roof_approach - 0.2}
        text="ĐỘ CAO 150 M"
        sub="VỌT LÊN ĐỈNH VÒM · BỔ NHÀO 90°"
        accent={THEME.amberGold}
        x={W * 0.26}
        y={SAFE * 2.2}
      />
    </AbsoluteFill>
  );
};

export default C01S07;
