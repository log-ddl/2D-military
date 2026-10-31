import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain, type HeightFn } from '@skill/military/3d/terrain';
import { paint, plain } from '@skill/military/3d/materials';
import { DustTrail, Explosion, softDot, Trail } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { LOOK_STEPPE_OVERCAST } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { FpvDrone3D } from '../parts/FpvDrone3D';

const smooth01 = (a: number, b: number, v: number) => {
  const x = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// Đường đất bùn thảo nguyên Ukraine chạy dọc trục X (thẳng tuyệt đối trong đoạn x = -18..+18 nơi xe chạy)
const roadCenterZ = (x: number) => Math.sin(x * 0.018) * 2.4 * smooth01(16.0, 52.0, Math.abs(x));

const BASE_UKRAINE_STEPPE = heightField({ seed: 408, amp: 2.35, scale: 88 });

const UKRAINE_MUD_H: HeightFn = (x, z) => {
  const dz = z - roadCenterZ(x);
  const absDz = Math.abs(dz);

  // Thảo nguyên nhấp nhô hai bên đường
  const farField = smooth01(4.2, 16.5, absDz);
  const steppeY = BASE_UKRAINE_STEPPE(x, z) * farField;

  // Bờ đất nhô nhẹ hai mép rãnh đường bùn (|dz| ~ 3.0..4.8 m)
  const vergeBerm = Math.exp(-(((absDz - 3.6) / 1.1) ** 2)) * 0.28;

  // Hai rãnh vệt bánh xe / vệt xích lún sâu dọc lòng đường đất tại z = ±1.51 m
  const rutL = Math.exp(-(((dz + 1.51) / 0.46) ** 2));
  const rutR = Math.exp(-(((dz - 1.51) / 0.46) ** 2));
  const rutDepth = (rutL + rutR) * 0.075 * (1 - smooth01(28, 65, Math.abs(x)));

  return steppeY + vergeBerm - rutDepth;
};

const AVOID_ROAD_BUSH = (x: number, z: number) => {
  const absDz = Math.abs(z - roadCenterZ(x));
  if (absDz < 4.5) return true; // chừa thoáng toàn bộ lòng đường đất bùn & bờ vệt xích
  return false;
};

const AVOID_ROAD_ROCK = (x: number, z: number) => {
  const absDz = Math.abs(z - roadCenterZ(x));
  if (absDz < 3.6) return true;
  return false;
};

// Toạ độ xe tăng M1A1 theo thời gian t: bò qua bùn rồi khựng chậm lại sau cú nổ nóc ở 616.86s
const getTankX = (t: number): number => {
  const speed = 2.45;
  const xAtImpact = -10.8 + (CUE.c04_s08_impact - 610.0) * speed; // ~ +6.007 m
  if (t <= CUE.c04_s08_impact) {
    return -10.8 + (t - 610.0) * speed;
  }
  const dt = t - CUE.c04_s08_impact;
  return xAtImpact + speed * ((1 - Math.exp(-dt * 2.1)) / 2.1);
};

// Điểm chạm nổ chính giữa nóc mỏng tháp pháo M1A1 đúng giây CUE.c04_s08_impact (616.86s)
// (Má giáp trước dày nằm ở x_world ~ 7.08..8.07 m; drone vòng qua má trước đánh thẳng vào tâm nóc tại x ~ 5.66 m, y = 2.46 m)
const IMPACT_X = getTankX(CUE.c04_s08_impact) - 0.35;
const IMPACT_POS: V3 = [IMPACT_X, 2.46, 0.0];

// Đường bay 3D tất định của FPV Drone: lượn rình mồi ở độ cao ~25-27 m rồi chúi mũi bổ nhào thẳng đứng từ 614.14s tới 616.86s
const cubicBez = (p0: V3, p1: V3, p2: V3, p3: V3, u: number): V3 => {
  const o = 1 - u;
  const b0 = o * o * o;
  const b1 = 3 * o * o * u;
  const b2 = 3 * o * u * u;
  const b3 = u * u * u;
  return [
    b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
    b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
    b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2],
  ];
};

const LOITER_START: V3 = [14.4, 26.8, 8.8];
const DIVE_START: V3 = [11.6, 24.8, 6.2];
// P1 & P2 uốn vồng qua phía trên mũi pháo & cặp má giáp trước dày (x ~ 7.6 m) rồi lao dốc ~80° thẳng xuống tâm nóc mỏng [5.66, 2.46, 0]
const DIVE_CTRL1: V3 = [10.2, 21.6, 4.3];
const DIVE_CTRL2: V3 = [6.32, 9.6, 0.72];

const getDronePos = (tau: number): V3 => {
  if (tau <= CUE.c04_s08_dive) {
    const s = prog(tau, 609.9, CUE.c04_s08_dive, Easing.inOut(Easing.sin));
    const hoverWave = Math.sin((tau - 610.0) * 2.1) * 0.18;
    return [
      lerp(LOITER_START[0], DIVE_START[0], s),
      lerp(LOITER_START[1], DIVE_START[1], s) + hoverWave * (1 - s),
      lerp(LOITER_START[2], DIVE_START[2], s),
    ];
  }
  const u = prog(tau, CUE.c04_s08_dive, CUE.c04_s08_impact, Easing.bezier(0.32, 0.0, 0.88, 0.96));
  return cubicBez(DIVE_START, DIVE_CTRL1, DIVE_CTRL2, IMPACT_POS, u);
};

const SoftSmokeSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({
  pos,
  size,
  color,
  opacity,
  rot = 0,
}) => {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  if (opacity <= 0.004) return null;
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

/** Dựng dải mặt băng bám sát đường cong roadCenterZ(x) và độ cao địa hình UKRAINE_MUD_H kéo dài 340 m tới tận sương mù chân trời. */
function buildRoadStripGeo(zOffset: number, halfWidth: number, yLift: number, xMin = -170, xMax = 170, steps = 110): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const cz = roadCenterZ(x) + zOffset;
    const zL = cz - halfWidth;
    const zR = cz + halfWidth;
    const yL = UKRAINE_MUD_H(x, zL) + yLift;
    const yR = UKRAINE_MUD_H(x, zR) + yLift;
    pos.push(x, yL, zL, x, yR, zR);
    uvs.push(x * 0.25, 0, x * 0.25, halfWidth * 0.5);
    if (i < steps) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Mặt đường đất đen chernozem lầy lội kéo dài tận chân trời + hai dải vệt bánh xe / xích xe tăng bóng nước bùn. */
const MuddySteppeRoad: React.FC = () => {
  const shoulderMat = useMemo(
    () =>
      paint({
        color: '#4c4c38',
        camo: ['#3f3a2e', '#5b5d42'],
        camoScale: 1.8,
        wear: 0.22,
        dirt: 0.65,
        roughness: 0.92,
        metalness: 0.04,
        repeat: 0.45,
        seed: 81,
      }),
    [],
  );

  const mudRoadMat = useMemo(
    () =>
      paint({
        color: '#3f382e',
        camo: ['#2f2a22', '#52493b'],
        camoScale: 2.0,
        wear: 0.25,
        dirt: 0.72,
        roughness: 0.86,
        metalness: 0.08,
        repeat: 0.5,
        seed: 83,
      }),
    [],
  );

  const wetRutMat = useMemo(() => plain('#29251f', 0.24, 0.38), []);

  const puddleMat = useMemo(
    () =>
      plain('#4a565d', 0.14, 0.72, {
        transparent: true,
        opacity: 0.8,
      }),
    [],
  );

  const geos = useMemo(
    () => ({
      shoulder: buildRoadStripGeo(0, 3.35, 0.012),
      mainMud: buildRoadStripGeo(0, 2.38, 0.022),
      rutL: buildRoadStripGeo(-1.51, 0.38, 0.03),
      rutR: buildRoadStripGeo(1.51, 0.38, 0.03),
    }),
    [],
  );

  return (
    <group>
      {/* Dải cỏ bùn ven đường chuyển mượt vào thảo nguyên + lòng đường đất đen dài 340 m không đứt mép */}
      <mesh geometry={geos.shoulder} material={shoulderMat} receiveShadow />
      <mesh geometry={geos.mainMud} material={mudRoadMat} receiveShadow />
      <mesh geometry={geos.rutL} material={wetRutMat} receiveShadow />
      <mesh geometry={geos.rutR} material={wetRutMat} receiveShadow />

      {/* Các vũng nước bùn đọng phản chiếu bầu trời xám lạnh dọc rãnh xích */}
      {[
        { x: -24.0, z: 1.48, w: 3.6, d: 0.5 },
        { x: -12.5, z: -1.5, w: 3.4, d: 0.52 },
        { x: -5.2, z: 1.48, w: 4.1, d: 0.56 },
        { x: 1.4, z: -1.52, w: 3.8, d: 0.54 },
        { x: 8.6, z: 1.5, w: 3.6, d: 0.52 },
        { x: 14.2, z: -1.46, w: 2.9, d: 0.48 },
      ].map((pd, pi) => {
        const pz = roadCenterZ(pd.x) + pd.z;
        const py = UKRAINE_MUD_H(pd.x, pz) + 0.034;
        return (
          <mesh key={pi} position={[pd.x, py, pz]} rotation={[-Math.PI / 2, 0, 0]} material={puddleMat}>
            <planeGeometry args={[pd.w, pd.d]} />
          </mesh>
        );
      })}
    </group>
  );
};

const C04S08: React.FC = () => {
  const t = useT();

  // ---------------- 1. XE TĂNG M1A1 ABRAMS LẦM LŨI BÒ TRÊN BÙN UKRAINE ----------------
  const tankX = getTankX(t);
  const travel = tankX - -10.8;
  const hitJolt = bump(t, CUE.c04_s08_impact, 0.54);
  const mudRock = Math.sin(t * 2.7) * 0.008 * (1 - prog(t, CUE.c04_s08_impact, CUE.c04_s08_impact + 0.5));
  const hullPitch = mudRock - hitJolt * 0.042;
  const hullRoll = Math.cos(t * 2.1) * 0.007 + hitJolt * 0.028;
  const turretYaw = -0.05 + Math.sin(t * 0.35) * 0.025;

  // ---------------- 2. QUỸ ĐẠO & GÓC CHÚI MŨI CỦA FPV DRONE CẢM TỬ PG-7VL ----------------
  const isBeforeImpact = t < CUE.c04_s08_impact;
  const clampedDroneT = Math.min(t, CUE.c04_s08_impact - 0.001);
  const dronePos = getDronePos(clampedDroneT);

  // Vector tiếp tuyến vận tốc của drone để xoay hướng mũi & góc chúc sâu (pitch)
  const pPrev = getDronePos(Math.max(609.9, clampedDroneT - 0.03));
  const pNext = getDronePos(Math.min(CUE.c04_s08_impact, clampedDroneT + 0.03));
  const vx = pNext[0] - pPrev[0];
  const vy = pNext[1] - pPrev[1];
  const vz = pNext[2] - pPrev[2];

  // Khi đang lượn cao trước 614.14s, mũi drone hướng xuống xe tăng M1A1; từ 614.14s bám chặt vector bổ nhào thẳng đứng
  const diveBlend = prog(t, CUE.c04_s08_dive - 0.25, CUE.c04_s08_dive + 0.35, Easing.inOut(Easing.cubic));
  const toTankX = tankX + 0.3 - dronePos[0];
  const toTankY = 2.4 - dronePos[1];
  const toTankZ = 0.0 - dronePos[2];

  const aimX = lerp(toTankX, vx * 25, diveBlend);
  const aimY = lerp(toTankY * 0.55, vy * 25, diveBlend);
  const aimZ = lerp(toTankZ, vz * 25, diveBlend);

  const aimHoriz = Math.max(0.01, Math.hypot(aimX, aimZ));
  const droneYaw = Math.atan2(-aimZ, aimX);
  // pitch < 0 = chúi mũi xuống trong hệ trục của FpvDrone3D
  const rawDivePitch = Math.atan2(aimY, aimHoriz);
  const dronePitch = lerp(-0.34, Math.max(-1.28, rawDivePitch - 0.08), diveBlend);
  const droneBank = lerp(0.18, 0.28, diveBlend) * (1 - prog(t, 616.3, 616.85) * 0.4);

  // Vệt khí động học mảnh <Trail> của cặp mút cánh sau quadcopter trong cú bổ nhào (camera lệch trục ~25° nên vệt mở rộng sắc nét)
  const diveTrailPts = useMemo(() => {
    const N = 56;
    const ptsL: V3[] = [];
    const ptsR: V3[] = [];
    for (let i = 0; i < N; i++) {
      const tau = lerp(CUE.c04_s08_dive - 0.25, CUE.c04_s08_impact, i / (N - 1));
      const c = getDronePos(tau);
      ptsL.push([c[0] + 0.11, c[1] + 0.03, c[2] - 0.15]);
      ptsR.push([c[0] - 0.11, c[1] + 0.03, c[2] + 0.15]);
    }
    return { ptsL, ptsR };
  }, []);
  const trailUpto = prog(t, CUE.c04_s08_dive - 0.25, CUE.c04_s08_impact, (x) => x);
  const trailFade = 1 - prog(t, CUE.c04_s08_impact, CUE.c04_s08_impact + 0.5);

  // ---------------- 3. CAMERA POV GÓC CAO BÁM SAU LƯNG FPV (LỆCH TRỤC TRAIL ~25°) & TÁCH RA ĐÓN VỤ NỔ ----------------
  const sightVec = useMemo(() => new THREE.Vector3(), []);
  const rightVec = useMemo(() => new THREE.Vector3(), []);
  const perpUpVec = useMemo(() => new THREE.Vector3(), []);

  // Hướng nhìn từ drone xuống xe tăng bên dưới
  const roofNow: V3 = [tankX - 0.2, 2.35, 0.0];
  sightVec.set(roofNow[0] - dronePos[0], roofNow[1] - dronePos[1], roofNow[2] - dronePos[2]).normalize();
  rightVec.crossVectors(sightVec, new THREE.Vector3(0, 1, 0)).normalize();
  perpUpVec.crossVectors(rightVec, sightVec).normalize();

  // Đặt camera lùi sau lưng drone 1.38 m và dịch lệch ngang +0.44 m, nâng cao +0.30 m:
  // -> góc lệch so với trục bay / <Trail> đạt ~25.5° (không bao giờ suy biến thành vạch thẳng!),
  // đồng thời đặt FPV Drone sắc nét ở góc trên-trái tiền cảnh còn chiếc M1A1 nằm trọn ở tâm-dưới khung hình!
  const backDist = 1.38;
  const sideShift = 0.44;
  const upShift = 0.30;

  const chasePos: V3 = [
    dronePos[0] - sightVec.x * backDist + rightVec.x * sideShift + perpUpVec.x * upShift,
    dronePos[1] - sightVec.y * backDist + rightVec.y * sideShift + perpUpVec.y * upShift,
    dronePos[2] - sightVec.z * backDist + rightVec.z * sideShift + perpUpVec.z * upShift,
  ];

  const chaseLook: V3 = [
    dronePos[0] + sightVec.x * 5.6 + rightVec.x * 0.06,
    dronePos[1] + sightVec.y * 5.6 + perpUpVec.y * 0.04,
    dronePos[2] + sightVec.z * 5.6 + rightVec.z * 0.06,
  ];

  // Trong 0.8s cuối cú bổ nhào, camera hãm lại mượt mà ở độ cao ~9.2 m để thu trọn khoảnh khắc drone vòng qua má giáp trước và nổ tung nóc tháp!
  const peelP = prog(t, 615.9, CUE.c04_s08_impact, Easing.inOut(Easing.cubic));
  const postP = prog(t, CUE.c04_s08_impact, 618.1, Easing.out(Easing.quad));

  const perchPos: V3 = [11.8 + postP * 1.6, 9.2 + postP * 1.4, 7.1 + postP * 1.0];
  const perchLook: V3 = [tankX - 0.1, 2.55 + postP * 0.95, 0.0];

  const blastShake = bump(t, CUE.c04_s08_impact, 0.48) * 0.22;
  const camPos: V3 = [
    lerp(chasePos[0], perchPos[0], peelP) + Math.sin(t * 48) * blastShake,
    Math.max(2.0, lerp(chasePos[1], perchPos[1], peelP) + Math.cos(t * 53) * blastShake),
    lerp(chasePos[2], perchPos[2], peelP),
  ];
  const camLook: V3 = [
    lerp(chaseLook[0], perchLook[0], peelP),
    lerp(chaseLook[1], perchLook[1], peelP) - Math.sin(t * 44) * blastShake * 0.6,
    lerp(chaseLook[2], perchLook[2], peelP),
  ];

  // Góc nghiêng roll kịch tính theo cánh quadcopter khi bổ nhào
  const diveRoll = lerp(0.11 + Math.sin(t * 1.2) * 0.03, 0.26, diveBlend);
  const camRoll = lerp(diveRoll, 0.05, peelP * 0.75 + postP * 0.25) + Math.sin(t * 38) * blastShake * 0.18;

  // Hiệu ứng vết thủng nóng đỏ & cột khói dầu đen đặc bám trên nóc tháp M1A1 sau khi trúng PG-7VL
  const dtImpact = t - CUE.c04_s08_impact;
  const breachCenter: V3 = [tankX - 0.35, 2.46, 0.0];

  const moltenCraterMat = useMemo(
    () =>
      plain('#ff6418', 0.35, 0.1, {
        emissive: '#ff5210',
        emissiveIntensity: 3.4,
      }),
    [],
  );
  const scorchMat = useMemo(() => plain('#151413', 0.95, 0.05), []);

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_STEPPE_OVERCAST.stage}
        shadowArea={36}
        shadowCenter={[tankX + 1.5, 1.5, 1.0]}
      >
        <Cam pos={camPos} look={camLook} fov={48} roll={camRoll} />
        {/* Ánh sáng bầu trời tán xạ lạnh tôn rõ các mảng giáp Chobham, bùn lầy & chi tiết FPV Drone */}
        <directionalLight position={[-14, 26, 22]} intensity={1.08} color="#e2ebf2" />

        {/* Địa hình thảo nguyên Đông Âu / Ukraine + đường đất đen lầy lội + bụi cây khô & đá */}
        <Terrain
          h={UKRAINE_MUD_H}
          size={440}
          seg={240}
          center={[0, 0]}
          colors={LOOK_STEPPE_OVERCAST.terrain}
          grainRepeat={46}
        />
        <MuddySteppeRoad />

        <Scatter
          kind="bush"
          count={260}
          area={[-120, -110, 120, 110]}
          h={UKRAINE_MUD_H}
          seed={4081}
          scale={[0.5, 1.15]}
          avoid={AVOID_ROAD_BUSH}
          tint="#7f8266"
        />
        <Scatter
          kind="rock"
          count={110}
          area={[-95, -80, 95, 80]}
          h={UKRAINE_MUD_H}
          seed={4082}
          scale={[0.3, 0.78]}
          avoid={AVOID_ROAD_ROCK}
          tint="#6d6c65"
        />
        <Scatter
          kind="broadleaf"
          count={55}
          area={[-130, -125, 130, -24]}
          h={UKRAINE_MUD_H}
          seed={4083}
          scale={[0.8, 1.35]}
          avoid={AVOID_ROAD_BUSH}
          tint="#737b63"
        />

        {/* M1A1 Abrams lấm bùn chiến trường Ukraine (variant="m1a1_mud" camo="woodland") */}
        <M1A2Abrams
          variant="m1a1_mud"
          camo="woodland"
          position={[tankX, 0, 0]}
          turretYaw={turretYaw}
          gunPitch={0.03}
          travel={travel}
          hullPitch={hullPitch}
          hullRoll={hullRoll}
          exhaustHeat={0.25}
        />

        {/* Bụi bùn bắn nhẹ dưới hai dải xích sau khi xe bò trên đường lầy */}
        <DustTrail
          t={t}
          from={609.8}
          to={617.0}
          path={(tau) => [getTankX(tau) - 3.6, 0.12, -1.51]}
          rate={6}
          size={1.25}
          color="#5f5646"
          life={2.1}
        />
        <DustTrail
          t={t}
          from={609.8}
          to={617.0}
          path={(tau) => [getTankX(tau) - 3.6, 0.12, 1.51]}
          rate={6}
          size={1.25}
          color="#5f5646"
          life={2.1}
        />

        {/* FPV Drone cảm tử mang đầu đạn lõm PG-7VL (biến mất ngay tức khắc khi chạm nóc tháp ở 616.86s) */}
        {isBeforeImpact && (
          <FpvDrone3D
            position={dronePos}
            rotation={[droneBank, droneYaw, 0]}
            pitch={dronePitch}
            rotorSpin={t * 92}
            scale={1.15}
          />
        )}

        {/* Hai dải vệt xoáy cánh mảnh của FPV Drone (góc nhìn camera lệch ~25° không bị suy biến, mảnh tự nhiên không thô) */}
        {trailUpto > 0.03 && trailFade > 0.01 && (
          <>
            <Trail
              points={diveTrailPts.ptsL}
              upto={trailUpto}
              color="#ffd482"
              width={0.007}
              opacity={0.46 * trailFade}
              glow={true}
            />
            <Trail
              points={diveTrailPts.ptsR}
              upto={trailUpto}
              color="#dce6ee"
              width={0.007}
              opacity={0.38 * trailFade}
              glow={false}
            />
          </>
        )}

        {/* Vụ nổ đầu đạn lõm PG-7VL + quầng lửa bùng thứ cấp đúng kích cỡ nóc tháp pháo M1A1 (lộ rõ hai má giáp trước nguyên vẹn) */}
        <Explosion
          t={t}
          at={CUE.c04_s08_impact}
          pos={breachCenter}
          size={1.75}
          seed={4089}
          smoke="#24201e"
          smokeLife={6.5}
        />
        <Explosion
          t={t}
          at={CUE.c04_s08_impact + 0.34}
          pos={[breachCenter[0] - 0.12, breachCenter[1] + 0.15, 0.05]}
          size={1.15}
          seed={4095}
          smoke="#1f1c1a"
          smokeLife={6.0}
        />

        {/* Dấu cháy đen, quầng lửa phun từ lỗ xuyên trên tấm nóc mỏng & cột khói đen bốc cao (vẫn lộ rõ hai má giáp trước nguyên vẹn!) */}
        {dtImpact >= 0 && (
          <group position={breachCenter}>
            <pointLight
              color="#ff8c2e"
              intensity={Math.max(8, 52 * (1 - Math.min(1, dtImpact / 1.4)))}
              distance={14}
              decay={1.5}
              position={[0.4, 1.4, 0.3]}
            />
            <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} material={scorchMat}>
              <circleGeometry args={[0.92, 24]} />
            </mesh>
            <mesh
              position={[0, 0.026, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={Math.max(0.45, 1 - dtImpact * 0.18)}
              material={moltenCraterMat}
            >
              <circleGeometry args={[0.34, 20]} />
            </mesh>

            {/* Ngọn lửa thứ cấp bốc ra từ lỗ thủng nóc tháp pháo */}
            {dtImpact < 1.35 && (
              <SoftSmokeSprite
                pos={[0, 0.65 + Math.sin(dtImpact * 18) * 0.12, 0]}
                size={1.65 + Math.sin(dtImpact * 23) * 0.25}
                color="#ff9a2e"
                opacity={0.78 * (1 - dtImpact / 1.35)}
                rot={dtImpact * 2.5}
              />
            )}

            {/* Cột khói dầu đen kịt bốc cao thẳng đứng từ vết thủng nóc tháp pháo */}
            {Array.from({ length: 14 }, (_, si) => {
              const born = (si / 14) * 0.55;
              const age = dtImpact - born;
              if (age <= 0) return null;
              const rise = age * (3.1 + rnd(si * 13 + 1) * 1.3);
              const driftX = (rnd(si * 13 + 2) - 0.5) * 0.65 - age * 0.35;
              const driftZ = (rnd(si * 13 + 3) - 0.5) * 0.65 - age * 0.2;
              const sz = 1.05 + age * (1.25 + rnd(si * 13 + 4) * 0.45);
              const op = Math.min(1, age * 6) * Math.max(0, 0.82 - age * 0.16);
              return (
                <SoftSmokeSprite
                  key={si}
                  pos={[driftX, 0.65 + rise, driftZ]}
                  size={sz}
                  color={si % 3 === 0 ? '#1b1918' : '#2d2927'}
                  opacity={op}
                  rot={si * 1.7 + age * 0.4}
                />
              );
            })}
          </group>
        )}
      </Stage>
    </AbsoluteFill>
  );
};

export default C04S08;
