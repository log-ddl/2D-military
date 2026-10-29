import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { DustTrail, Trail } from '@lib/3d/fx';
import { rbox } from '@lib/3d/geom';
import { plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { P, STAGE_DESERT_NOON, TERRAIN_NEGEV } from '../local/palette';
import { F15Legacy } from '../local/models';

// ---------------- Địa hình hoang mạc Negev & đường băng sa mạc Ramon (y = 0) ----------------
const smooth01 = (v: number) => {
  const c = Math.max(0, Math.min(1, v));
  return c * c * (3 - 2 * c);
};

const runwayFlatWeight = (x: number, z: number) => {
  const wx =
    x < 30 ? 0 : x < 88 ? smooth01((x - 30) / 58) : x <= 360 ? 1 : x < 415 ? 1 - smooth01((x - 360) / 55) : 0;
  const az = Math.abs(z);
  const wz = az < 24 ? 1 : az < 64 ? 1 - smooth01((az - 24) / 40) : 0;
  return wx * wz;
};

const baseNegev = heightField({
  seed: 83,
  amp: 9.5,
  scale: 150,
  oct: 5,
  add: (x, z) => {
    const az = Math.abs(z);
    // Các dãy đồi đá vôi & bàn thạch (mesa) xa hai bên thung lũng Negev
    const mesa = az > 85 ? Math.min(34, ((az - 85) / 145) ** 1.35 * 24) : 0;
    const ridge =
      10 * Math.exp(-(((z - 230) / 85) ** 2)) +
      13 * Math.exp(-(((z + 250) / 95) ** 2)) +
      6 * Math.sin(x * 0.011 + 1.2) * Math.min(1, az / 120);
    // Thung lũng tiếp cận thấp dần phía trước đầu đường băng (x < 40) để máy bay bay thấp an toàn
    const approachDip = x < 40 ? -2.8 * smooth01((40 - x) / 95) * Math.exp(-((z / 90) ** 2)) : 0;
    return mesa + ridge + approachDip;
  },
});

const negevH = (x: number, z: number) => {
  const w = runwayFlatWeight(x, z);
  return baseNegev(x, z) * (1 - w);
};

const avoidRunway = (x: number, z: number) => {
  if (x > 35 && x < 395 && Math.abs(z) < 30) return true;
  if (x <= 35 && Math.abs(z) < 18) return true;
  return false;
};

// ---------------- Quỹ đạo vật lý liên tục C1 cho F-15D Israel 1983 ----------------
const V_APPROACH = 36.0; // m/s trong không gian cảnh
const X_TOUCH = 226.64; // điểm chạm bánh trên đường băng
const DT_BRAKE = CUE.s09_stopBarrier - CUE.s09_touchdown; // 4.42 s
const D_ROLLOUT = 0.5 * V_APPROACH * DT_BRAKE; // 79.56 m -> dừng ở x = 306.20 m (mũi 315.91 m, cách lưới 322.0 m đúng 6.1 m = 20 ft!)
const X_BARRIER = 322.0;
const RUNWAY_TOP_Y = 0.04;

const getJetKinematics = (t: number) => {
  let x: number;
  let distOnGround = 0;
  if (t <= CUE.s09_touchdown) {
    x = X_TOUCH + (t - CUE.s09_touchdown) * V_APPROACH;
  } else if (t < CUE.s09_stopBarrier) {
    const u = (t - CUE.s09_touchdown) / DT_BRAKE;
    const decel = 1 - (1 - u) * (1 - u);
    distOnGround = D_ROLLOUT * decel;
    x = X_TOUCH + distOnGround;
  } else {
    distOnGround = D_ROLLOUT;
    x = X_TOUCH + D_ROLLOUT;
  }

  // Góc chúc-ngóc (pitch > 0: ngóc mũi tạo lực nâng thân rộng; hạ mũi êm xuống 0 sau khi chạm bánh chính)
  const flightPitch = 0.088 + 0.01 * Math.sin(t * 1.9);
  const flareBoost = 0.018 * prog(t, 227.6, 229.4);
  const noseDown = prog(t, CUE.s09_touchdown + 0.12, 231.25);
  const pitch = (flightPitch + flareBoost) * (1 - noseDown);

  // Góc nghiêng cánh trái nhẹ khi bay 1 cánh để bù mô-men lật, cân bằng phẳng trước khi chạm đất
  const buffetRoll = Math.sin(t * 3.4) * 0.022 + Math.cos(t * 5.1) * 0.012;
  const levelOut = prog(t, 226.8, 229.35);
  const roll = (-0.115 + buffetRoll) * (1 - levelOut);

  // Độ cao Y: khi chạm đất (t >= 229.52), bù chính xác 1.35 * sin(pitch) để lốp chính chạm đúng mặt nhựa RUNWAY_TOP_Y, không bao giờ chìm bánh!
  const touchBaseY = RUNWAY_TOP_Y + 1.35 * Math.sin(Math.max(0, pitch));
  let y: number;
  if (t >= CUE.s09_touchdown) {
    y = touchBaseY;
  } else if (t < 224.2) {
    const pCruise = prog(t, 206.5, 224.2, Easing.linear);
    y = lerp(29.0, 16.5, pCruise) + Math.sin(t * 2.3) * 0.28;
  } else {
    // Hạ độ cao tiếp cận mượt C1 đáp xuống mặt đường băng đúng 229.52s
    const u = Math.max(0, Math.min(1, (t - 224.2) / (CUE.s09_touchdown - 224.2)));
    const flareCurve = (1 - u) * (1 - u) * (1 + 0.65 * u);
    y = touchBaseY + (16.5 - touchBaseY) * flareCurve;
  }

  return { x, y, pitch, roll, distOnGround };
};

// Đường bay của mỏm cánh phải cụt (local: x = -1.55, y = 2.35, z = +2.05) trong tọa độ thế giới
const stumpSmokePath = (tau: number): V3 => {
  const k = getJetKinematics(tau);
  const cP = Math.cos(k.pitch);
  const sP = Math.sin(k.pitch);
  const cR = Math.cos(k.roll);
  const sR = Math.sin(k.roll);
  const lx = -1.55;
  const ly = 2.35;
  const lz = 2.05;
  // Xoay Euler XYZ [roll, 0, pitch]
  const y1 = ly * cR - lz * sR;
  const z1 = ly * sR + lz * cR;
  const wx = k.x + lx * cP - y1 * sP;
  const wy = k.y + lx * sP + y1 * cP;
  const wz = z1;
  // DustTrail cộng sẵn +0.4 vào p[1], nên trừ 0.36 để vệt khói bám sát mép cánh gãy
  return [wx, wy - 0.36, wz];
};

const leftTireSmokePath = (tau: number): V3 => {
  const k = getJetKinematics(tau);
  return [k.x - 1.45, RUNWAY_TOP_Y - 0.26, -1.35];
};

const rightTireSmokePath = (tau: number): V3 => {
  const k = getJetKinematics(tau);
  return [k.x - 1.45, RUNWAY_TOP_Y - 0.26, 1.35];
};

// ---------------- Đường băng căn cứ không quân sa mạc & Lưới chắn khẩn cấp cuối đường băng ----------------
const DesertRunwayAndBarrier: React.FC<{ netBow: number }> = ({ netBow }) => {
  const geos = useMemo(() => {
    const gravel = rbox(264, 0.03, 32, 0.01);
    const asphalt = rbox(248, 0.04, 22, 0.01);
    const rubberZone = rbox(84, 0.042, 13.5, 0.005);
    const post = rbox(0.32, 2.75, 0.32, 0.04);
    const stripeThreshold = rbox(9.5, 0.01, 1.15, 0.002);
    const dashCenter = rbox(7.2, 0.01, 0.45, 0.002);
    const edgeLine = rbox(236, 0.01, 0.35, 0.002);
    const aimBlock = rbox(16, 0.01, 2.4, 0.002);
    return { gravel, asphalt, rubberZone, post, stripeThreshold, dashCenter, edgeLine, aimBlock };
  }, []);

  const matGravel = plain('#a78e6a', 0.95, 0.05);
  const matAsphalt = plain('#2c3037', 0.88, 0.08);
  const matRubber = plain('#1e2126', 0.92, 0.05);
  const matWhite = plain('#eceae2', 0.65, 0.08);
  const matYellow = plain('#eab63e', 0.6, 0.1);
  const matRed = plain('#e0343c', 0.5, 0.12, {
    emissive: new THREE.Color('#7a1118'),
    emissiveIntensity: 0.25,
  });
  const matSteel = plain('#505a66', 0.42, 0.72);

  return (
    <group>
      {/* Nền cấp phối sỏi sa mạc & mặt nhựa đường băng (đỉnh nhựa đúng y = 0.04 m) */}
      <mesh geometry={geos.gravel} position={[224, 0.01, 0]} material={matGravel} receiveShadow />
      <mesh geometry={geos.asphalt} position={[226, 0.02, 0]} material={matAsphalt} receiveShadow />
      <mesh geometry={geos.rubberZone} position={[220, 0.021, 0]} material={matRubber} receiveShadow />

      {/* Vạch ngưỡng đường băng (piano keys) & khối điểm ngắm hạ cánh */}
      {[-7.8, -5.6, -3.4, -1.3, 1.3, 3.4, 5.6, 7.8].map((z, i) => (
        <mesh key={`th-${i}`} geometry={geos.stripeThreshold} position={[114, 0.043, z]} material={matWhite} receiveShadow />
      ))}
      <mesh geometry={geos.aimBlock} position={[188, 0.043, -5.4]} material={matWhite} receiveShadow />
      <mesh geometry={geos.aimBlock} position={[188, 0.043, 5.4]} material={matWhite} receiveShadow />

      {/* Vạch tim đường băng đứt nét & hai vạch biên trắng */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={`cl-${i}`} geometry={geos.dashCenter} position={[130 + i * 14, 0.043, 0]} material={matWhite} receiveShadow />
      ))}
      <mesh geometry={geos.edgeLine} position={[224, 0.043, -10.1]} material={matWhite} receiveShadow />
      <mesh geometry={geos.edgeLine} position={[224, 0.043, 10.1]} material={matWhite} receiveShadow />

      {/* Vạch chữ V vàng khu vực bảo hiểm cuối đường băng (sau lưới chắn x > 323) */}
      {[326, 333, 340].map((cx, i) => (
        <group key={`ov-${i}`} position={[cx, 0.043, 0]}>
          <mesh geometry={rbox(5.5, 0.01, 0.45, 0.002)} position={[0, 0, -4.2]} rotation={[0, 0.58, 0]} material={matYellow} />
          <mesh geometry={rbox(5.5, 0.01, 0.45, 0.002)} position={[0, 0, 4.2]} rotation={[0, -0.58, 0]} material={matYellow} />
        </group>
      ))}

      {/* Cọc đèn biên đường băng */}
      {Array.from({ length: 12 }, (_, i) => {
        const lx = 116 + i * 19.5;
        return (
          <React.Fragment key={`lg-${i}`}>
            {([-11.3, 11.3] as const).map((lz) => (
              <group key={lz} position={[lx, 0.04, lz]}>
                <mesh position={[0, 0.18, 0]} material={matYellow}>
                  <cylinderGeometry args={[0.05, 0.07, 0.36, 8]} />
                </mesh>
                <mesh
                  position={[0, 0.4, 0]}
                  material={plain('#fff4c4', 0.2, 0.1, {
                    emissive: new THREE.Color('#ffda75'),
                    emissiveIntensity: 0.85,
                  })}
                >
                  <sphereGeometry args={[0.075, 10, 8]} />
                </mesh>
              </group>
            ))}
          </React.Fragment>
        );
      })}

      {/* LƯỚI CHẮN KHẨN CẤP CUỐI ĐƯỜNG BĂNG (RUNWAY ARRESTING BARRIER) TẠI x = 322.0 m */}
      <group position={[X_BARRIER, 0.04, 0]}>
        {/* Hai trụ tời thủy lực hai bên lề đường băng */}
        {([-11.8, 11.8] as const).map((bz) => (
          <group key={bz} position={[0, 0, bz]}>
            <mesh geometry={rbox(1.1, 0.36, 1.1, 0.04)} position={[0, 0.18, 0]} material={matSteel} castShadow />
            <mesh geometry={geos.post} position={[0, 1.45, 0]} material={matRed} castShadow />
            <mesh geometry={rbox(0.35, 0.55, 0.35, 0.03)} position={[0, 1.1, 0]} material={matWhite} />
            <mesh geometry={rbox(0.35, 0.55, 0.35, 0.03)} position={[0, 2.1, 0]} material={matWhite} />
            <mesh
              position={[0, 2.92, 0]}
              material={plain('#ffb020', 0.2, 0.1, {
                emissive: new THREE.Color('#ff8800'),
                emissiveIntensity: 1.2,
              })}
            >
              <sphereGeometry args={[0.14, 12, 10]} />
            </mesh>
          </group>
        ))}

        {/* Hệ cáp ngang & đai lưới nylon đỏ - trắng nổi bật căng ngang đường băng */}
        {[0.48, 1.05, 1.62, 2.22].map((hy, rIdx) => (
          <mesh key={`hb-${rIdx}`} position={[netBow * 0.4, hy, 0]} rotation={[Math.PI / 2, 0, 0]} material={rIdx === 0 || rIdx === 3 ? matRed : matWhite} castShadow>
            <cylinderGeometry args={[0.042, 0.042, 23.4, 12]} />
          </mesh>
        ))}

        {Array.from({ length: 23 }, (_, i) => {
          const vz = -11.0 + i * 1.0;
          const bow = netBow * Math.cos((vz / 11.8) * (Math.PI * 0.5));
          const isRed = i % 2 === 0;
          return (
            <group key={`vb-${i}`} position={[bow, 0, vz]}>
              <mesh geometry={rbox(0.06, 1.82, 0.22, 0.01)} position={[0, 1.35, 0]} material={isRed ? matRed : matWhite} castShadow />
              {/* Cờ cảnh báo đỏ-trắng dọc cáp trên */}
              <mesh geometry={rbox(0.05, 0.34, 0.44, 0.01)} position={[0, 2.24, 0]} material={isRed ? matWhite : matRed} />
            </group>
          );
        })}
      </group>
    </group>
  );
};

// ---------------- Dải dòng khí nâng (Lifting-Body Airflow) uốn qua thân giữa rộng phẳng ----------------
const LIFT_STREAMLINES: V3[][] = [-1.32, -0.78, -0.26, 0.26, 0.78, 1.32].map((zOff) => {
  const absZ = Math.abs(zOff);
  const hump = 1 - absZ * 0.14;
  return [
    [8.6, 1.55, zOff * 0.55],
    [5.8, 2.38 * hump + 0.32, zOff * 0.78],
    [2.8, 2.86 * hump + 0.25, zOff * 0.95],
    [-0.5, 2.76 * hump + 0.22, zOff * 1.04],
    [-3.8, 2.62 * hump + 0.18, zOff * 1.08],
    [-7.2, 2.36 * hump + 0.12, zOff * 1.1],
    [-11.2, 1.92, zOff * 1.14],
  ];
});

const LEFT_WING_STREAMS: V3[][] = [-2.85, -4.65].map((zWing) => [
  [3.4 + zWing * 0.55, 2.15, zWing],
  [0.2 + zWing * 0.45, 2.52, zWing],
  [-2.8 + zWing * 0.25, 2.48, zWing],
  [-6.4, 2.22, zWing * 1.03],
  [-10.2, 1.88, zWing * 1.06],
]);

const S09: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const kin = getJetKinematics(t);
  const gear = prog(t, 225.5, 228.5);
  const afterburner =
    t >= 224.8 ? lerp(0.35, 1.0, prog(t, 224.8, 226.0)) * (1 - prog(t, 230.2, 232.0)) : 0.3;

  // Khi đang bay bánh quay nhẹ hoặc đứng yên; vừa chạm đường băng 260 knot quay tít theo đúng quãng đường lăn / r (0.46 m)
  const wheelSpin = t >= CUE.s09_touchdown ? kin.distOnGround / 0.46 : 0;

  // Hiệu ứng dòng khí nâng Lifting-Body trên lưng thân rộng phẳng (210.4s -> 225.4s)
  const liftIn = prog(t, 210.3, 212.6);
  const liftOut = 1 - prog(t, 224.2, 225.6);
  const liftAlpha = liftIn * liftOut;

  // ---------------- Đạo diễn Camera 3D liên tục 3 pha ----------------
  // Pha A (206.8 - 216.8s): Góc trên-trước-phải 3/4 nhìn rõ thân rộng phẳng + dải dòng khí nâng cyan
  // Pha B (216.8 - 224.8s): Vòng sang góc trên-sau-phải 3/4 cận cảnh mỏm cánh phải cụt 2 feet bốc khói xám
  // Pha C (224.8 - 236.2s): Hạ thấp đón buồng đốt hậu & cú đáp 260 knot tung khói lốp, dừng sát trước lưới chắn đỏ-trắng
  const pToStump = prog(t, 215.6, 218.8);
  const pToTouch = prog(t, 224.8, 228.8);
  const pToBarrier = prog(t, 231.2, 234.0);

  const offA: V3 = [
    lerp(16.8, 10.2, prog(t, 206.9, 215.6)),
    lerp(7.2, 8.0, prog(t, 206.9, 215.6)),
    lerp(13.2, 14.5, prog(t, 206.9, 215.6)),
  ];
  const lookA: V3 = [0.85, 2.2, 0.15];

  const offB: V3 = [
    lerp(-12.4, -15.6, prog(t, 218.0, 224.8)),
    lerp(6.6, 5.6, prog(t, 218.0, 224.8)),
    lerp(12.6, 11.4, prog(t, 218.0, 224.8)),
  ];
  const lookB: V3 = [-0.35, 2.25, 0.3];

  const offC1: V3 = [12.5, 2.25, 12.6];
  const lookC1: V3 = [0.5, 1.45, 0.0];

  // Khi dừng trước lưới chắn (x_nose = 315.9, lưới x = 322.0), đặt máy bên phải phía sau lưới chắn nhìn ngược về mũi & mỏm cánh phải cụt
  const offC2: V3 = [20.4, 3.35, 12.4];
  const lookC2: V3 = [4.6, 1.65, 0.25];

  const mixV3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

  const camOffAB = mixV3(offA, offB, pToStump);
  const lookAB = mixV3(lookA, lookB, pToStump);

  const camOffC = mixV3(offC1, offC2, pToBarrier);
  const lookC = mixV3(lookC1, lookC2, pToBarrier);

  const camOff = mixV3(camOffAB, camOffC, pToTouch);
  const lookOff = mixV3(lookAB, lookC, pToTouch);

  // Rung nhẹ khi lốp đập xuống đường băng ở 260 knot
  const impactJolt =
    t >= CUE.s09_touchdown && t < CUE.s09_touchdown + 1.4
      ? Math.exp(-(t - CUE.s09_touchdown) * 3.2) * Math.sin((t - CUE.s09_touchdown) * 34) * 0.22
      : 0;

  const camPos: V3 = [
    kin.x + camOff[0],
    Math.max(0.85, kin.y + camOff[1] + impactJolt),
    camOff[2],
  ];
  const camLook: V3 = [kin.x + lookOff[0], kin.y + lookOff[1], lookOff[2]];

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_DESERT_NOON}
        shadowCenter={[kin.x, Math.max(0, kin.y * 0.35), 0]}
        shadowArea={36}
      >
        <Cam pos={camPos} look={camLook} fov={lerp(41, 38, pToBarrier)} />

        {/* Địa hình hoang mạc Negev & thảm đá/bụi khô ngoài đường băng */}
        <Terrain
          h={negevH}
          size={1650}
          seg={256}
          center={[-90, 0]}
          colors={TERRAIN_NEGEV}
          grainRepeat={55}
        />
        <Scatter
          kind="rock"
          count={260}
          area={[-720, -400, 520, 400]}
          h={negevH}
          seed={901}
          scale={[0.65, 2.15]}
          avoid={avoidRunway}
        />
        <Scatter
          kind="bush"
          count={230}
          area={[-720, -360, 500, 360]}
          h={negevH}
          seed={902}
          scale={[0.6, 1.35]}
          tint="#c8b07a"
          avoid={avoidRunway}
        />

        {/* Đường băng nhựa đường sa mạc & tấm lưới chắn đỏ-trắng căng ngang cuối đường băng */}
        <DesertRunwayAndBarrier netBow={0.08} />

        {/* Chiếc F-15D Israel năm 1983 mất toàn bộ cánh phải, chỉ còn mỏm gãy 2 feet */}
        <group position={[kin.x, kin.y, 0]} rotation={[kin.roll, 0, kin.pitch]}>
          <F15Legacy
            missingRightWing
            gear={gear}
            wheelSpin={wheelSpin}
            afterburner={afterburner}
          />

          {/* Các dải đường dòng khí nâng màu cyan sáng uốn qua thân giữa rộng phẳng (Lifting Body) */}
          {liftAlpha > 0.01 && (
            <group>
              {LIFT_STREAMLINES.map((pts, idx) => (
                <Trail
                  key={`lb-${idx}`}
                  points={pts}
                  upto={liftIn}
                  color={idx === 2 || idx === 3 ? P.cyan : P.cyanSoft}
                  width={idx === 2 || idx === 3 ? 0.062 : 0.046}
                  opacity={(idx === 2 || idx === 3 ? 0.86 : 0.68) * liftAlpha}
                  glow
                />
              ))}
              {LEFT_WING_STREAMS.map((pts, idx) => (
                <Trail
                  key={`lw-${idx}`}
                  points={pts}
                  upto={liftIn}
                  color={P.cyanSoft}
                  width={0.04}
                  opacity={0.52 * liftAlpha}
                  glow
                />
              ))}
            </group>
          )}
        </group>

        {/* Vệt khói xám nhẹ & sương nhiên liệu thoát ra từ mỏm cánh phải cụt nham nhở */}
        <DustTrail
          t={t}
          from={205.5}
          to={233.4}
          path={stumpSmokePath}
          rate={26}
          size={1.18}
          color="#7f8894"
          life={1.75}
        />

        {/* Khói cháy lốp & bụi đường băng sa mạc tung mù mịt khi chạm bánh ở tốc độ 260 knot */}
        <DustTrail
          t={t}
          from={CUE.s09_touchdown}
          to={CUE.s09_stopBarrier - 0.15}
          path={leftTireSmokePath}
          rate={22}
          size={1.75}
          color="#dfd8cc"
          life={2.3}
        />
        <DustTrail
          t={t}
          from={CUE.s09_touchdown}
          to={CUE.s09_stopBarrier - 0.15}
          path={rightTireSmokePath}
          rate={22}
          size={1.75}
          color="#dfd8cc"
          life={2.3}
        />
      </Stage>

      <Label
        t={t}
        text="260 KNOTS"
        x={960}
        y={915}
        from={CUE.s09_touchdown}
        until={233.5}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S09;
