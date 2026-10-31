import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { DustTrail, Trail } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_GLARE } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { EnemyT72 } from '../parts/EnemyT72';

// ---------------- Hằng số chuyển động & địa hình ổ gà sa mạc ----------------
const SPEED = 13.8; // m/s (~40 mph qua địa hình ổ gà sa mạc)
const tankXAt = (s: number) => (s - 58.0) * SPEED;
const enemyXAt = (s: number) => tankXAt(s) + 18.0 - (s - 58.0) * 1.05;
const ENEMY_Z = -74.0;

// Các gờ cát & ổ gà bước sóng khớp chiều dài xích (w = 4.6..5.4 m) để bánh xích lướt trọn trên mặt cát không bị lún giữa thân
const BUMP_EVENTS: { t: number; amp: number; w: number; zSkew: number }[] = [
  { t: 59.4, amp: 0.36, w: 4.8, zSkew: 0.12 },
  { t: 61.3, amp: -0.34, w: 4.6, zSkew: -0.14 },
  { t: 63.1, amp: 0.42, w: 5.0, zSkew: 0.15 },
  { t: 64.5, amp: 0.46, w: 4.8, zSkew: -0.18 },
  { t: 66.25, amp: 0.48, w: 4.7, zSkew: 0.2 },
  { t: 67.2, amp: -0.38, w: 4.6, zSkew: -0.18 },
  // Cú dằn ổ gà chính đúng mốc CUE.c01_s04_bump_jump (68.14 s) hất tâm ngắm vọt lên bầu trời!
  { t: 68.18, amp: 0.66, w: 4.8, zSkew: 0.26 },
  { t: 68.85, amp: -0.48, w: 4.5, zSkew: -0.22 },
  { t: 69.44, amp: 0.6, w: 4.7, zSkew: 0.24 },
  { t: 70.2, amp: 0.52, w: 4.8, zSkew: 0.2 },
  { t: 71.85, amp: -0.38, w: 4.9, zSkew: -0.15 },
  { t: 73.35, amp: 0.46, w: 4.8, zSkew: 0.18 },
  { t: 74.95, amp: -0.42, w: 4.7, zSkew: -0.18 },
  { t: 76.15, amp: 0.44, w: 4.9, zSkew: 0.16 },
];

const H_DESERT = heightField({
  seed: 41,
  amp: 1.55,
  scale: 98,
  oct: 4,
  add: (x, z) => {
    let h = 0;
    // Hành lang ổ gà & gờ cát gợn sóng dọc đường cơ động của M1A2 (z ~ 0)
    const trackMask = Math.exp(-((z / 16) ** 2));
    if (trackMask > 0.01) {
      const washboard =
        Math.sin(x * 0.34 + z * 0.26) * 0.2 +
        Math.sin(x * 0.68 - z * 0.36) * 0.11 +
        Math.cos(x * 0.21 + 1.2) * 0.18;
      let potholes = 0;
      for (const b of BUMP_EVENTS) {
        const bx = tankXAt(b.t) + 2.0;
        const dx = x - bx + z * b.zSkew;
        if (Math.abs(dx) < b.w * 3.0) {
          potholes += b.amp * Math.exp(-((dx / b.w) ** 2)) * (1 + z * b.zSkew * 0.42);
        }
      }
      h += (washboard + potholes) * trackMask;
    }

    // Đụn cát tiền cảnh (+Z) và trung cảnh (-Z) tạo lớp chiều sâu sa mạc
    h += Math.exp(-(((z - 34) / 16) ** 2)) * (1.75 + 0.5 * Math.sin(x * 0.08));
    h += Math.exp(-(((z + 34) / 14) ** 2)) * (0.85 + 0.35 * Math.cos(x * 0.11));

    // Sống đồi sa mạc phía xa nơi T-72 cơ động ngang (z = -74 m)
    h += Math.exp(-(((z - ENEMY_Z) / 20) ** 2)) * (3.9 + 0.45 * Math.sin(x * 0.05));

    // Dãy đụn cát lớn chân trời xa
    h += Math.exp(-(((z + 168) / 46) ** 2)) * (13.5 + 3.2 * Math.sin(x * 0.025 + 0.7));
    return h;
  },
});

const avoidTracks = (x: number, z: number) =>
  Math.abs(z) < 4.8 || Math.abs(z - ENEMY_Z) < 5.5 || (z > 0 && z < 15 && x > -20 && x < 350);

/** Tính trạng thái động học tất định của M1A2 Abrams tại giây s (đảm bảo xích bám sát gờ cát không bao giờ lún bụng). */
function sampleAbramsPose(s: number) {
  const x = tankXAt(s);
  const z = 0;
  const yF = 0.5 * (H_DESERT(x + 2.75, 1.51) + H_DESERT(x + 2.75, -1.51));
  const yMidF = 0.5 * (H_DESERT(x + 1.35, 1.51) + H_DESERT(x + 1.35, -1.51));
  const yMid = 0.5 * (H_DESERT(x, 1.51) + H_DESERT(x, -1.51));
  const yMidR = 0.5 * (H_DESERT(x - 1.35, 1.51) + H_DESERT(x - 1.35, -1.51));
  const yR = 0.5 * (H_DESERT(x - 2.75, 1.51) + H_DESERT(x - 2.75, -1.51));

  const yRgt = H_DESERT(x, z + 1.51);
  const yLft = H_DESERT(x, z - 1.51);

  // Nâng nhẹ theo bao lồi mặt cát dưới 7 cặp bánh chịu nặng để bụng xích không bao giờ cắt chìm vào đỉnh gờ cát
  const yChord = (yF + yR) * 0.5;
  const crestClearance = Math.max(
    0,
    yMid - yChord,
    (yMidF - lerp(yR, yF, 0.75)) * 0.85,
    (yMidR - lerp(yR, yF, 0.25)) * 0.85,
  );
  const y = yChord + crestClearance * 0.88 - 0.015;

  const terrainPitch = Math.atan2(yF - yR, 5.5);
  const terrainRoll = Math.atan2(yRgt - yLft, 3.02);

  // Xung dằn thanh xoắn trên ổ gà: khống chế biên độ chuẩn để tâm ngắm đỏ vọt cao lên bầu trời mà vẫn nằm trọn trong khung hình
  const jumpKick =
    bump(s, CUE.c01_s04_bump_jump - 0.04, 0.56) * 0.068 -
    bump(s, CUE.c01_s04_bump_jump + 0.52, 0.48) * 0.052 +
    bump(s, 69.34, 0.54) * 0.064 -
    bump(s, 69.88, 0.36) * 0.042 +
    bump(s, 70.16, 0.52) * 0.056 +
    bump(s, 66.85, 0.62) * 0.052;

  const hullPitch =
    terrainPitch * 0.28 +
    Math.sin(s * 6.8) * 0.015 +
    Math.sin(s * 13.4 + 0.9) * 0.008 +
    jumpKick * 0.62;

  const hullRoll =
    terrainRoll * 0.28 +
    Math.sin(s * 5.9 + 1.1) * 0.017 +
    Math.cos(s * 11.7) * 0.009 +
    jumpKick * 0.72;

  // Hướng tháp pháo: Beat 1 gióng về phía T-72 ở sống đồi xa; từ 71.1 s xoay mượt về phía trước để soi cận gốc pháo 5 tấn & hộp GPS
  const ex = enemyXAt(s);
  const targetYaw = Math.atan2(-ENEMY_Z, ex - (x + 0.08));
  const slewToFront = prog(s, 71.0, 75.0, Easing.inOut(Easing.cubic));
  const turretYaw = lerp(targetYaw, 0.05, slewToFront);

  // Góc tầm pháo:
  // - Trước 71.3 s ("Bolt a cannon rigidly to a hull"): khoá cứng theo thân xe (góc nâng cố định 0.025)
  // - Từ 71.4..77.5 s ("five tons of gun steel... losing fight against inertia"): khối pháo 5 tấn rùng giật trễ nhịp nặng nề vì quán tính
  const inertiaBlend = prog(s, 71.4, 72.4) * (1 - prog(s, 77.5, 78.6));
  const inertiaLag =
    (-terrainPitch * 0.58 + Math.sin(s * 9.8) * 0.032 + Math.sin(s * 17.6) * 0.015) * inertiaBlend;
  const gunPitch = lerp(0.025, 0.016, slewToFront) + inertiaLag;

  return {
    pos: [x, y, z] as V3,
    rot: [terrainRoll, 0, terrainPitch] as V3,
    hullPitch,
    hullRoll,
    turretYaw,
    gunPitch,
  };
}

/** Ma trận chuyển đổi từ hệ quy chiếu tháp pháo M1A2 ra toạ độ thế giới. */
function turretMatrixWorld(pose: ReturnType<typeof sampleAbramsPose>): THREE.Matrix4 {
  const mRoot = new THREE.Matrix4().compose(
    new THREE.Vector3(...pose.pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.rot[0], pose.rot[1], pose.rot[2], 'XYZ')),
    new THREE.Vector3(1, 1, 1),
  );
  const mHullPivot = new THREE.Matrix4().makeTranslation(0, 0.65, 0);
  const mHullRot = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(pose.hullRoll, 0, pose.hullPitch, 'XYZ'),
  );
  const mHullUnpivot = new THREE.Matrix4().makeTranslation(0, -0.65, 0);
  const mTurret = new THREE.Matrix4().compose(
    new THREE.Vector3(0.08, 1.35, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pose.turretYaw, 0, 'XYZ')),
    new THREE.Vector3(1, 1, 1),
  );
  return mRoot.multiply(mHullPivot).multiply(mHullRot).multiply(mHullUnpivot).multiply(mTurret);
}

function turretPointWorld(pose: ReturnType<typeof sampleAbramsPose>, localPt: V3): V3 {
  const v = new THREE.Vector3(...localPt).applyMatrix4(turretMatrixWorld(pose));
  return [v.x, v.y, v.z];
}

function barrelPointWorld(pose: ReturnType<typeof sampleAbramsPose>, localPt: V3): V3 {
  const mGun = new THREE.Matrix4().compose(
    new THREE.Vector3(0.36, 0.5, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, pose.gunPitch, 'XYZ')),
    new THREE.Vector3(1, 1, 1),
  );
  const v = new THREE.Vector3(...localPt).applyMatrix4(turretMatrixWorld(pose).multiply(mGun));
  return [v.x, v.y, v.z];
}

const C01S04: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  const pose = sampleAbramsPose(t);
  const travel = (t - 55.0) * SPEED;

  // Xe tăng địch T-72 di chuyển ngang trên sống đồi sa mạc phía xa (> 2 dặm phối cảnh)
  const ex = enemyXAt(t);
  const eyF = H_DESERT(ex + 2.4, ENEMY_Z);
  const eyR = H_DESERT(ex - 2.4, ENEMY_Z);
  const ey = (eyF + eyR) * 0.5 - 0.02;
  const ePitch = Math.atan2(eyF - eyR, 4.8);
  const enemyTravel = (t - 55.0) * (SPEED - 1.05);

  // Minh hoạ pháo gắn cứng ("Bolt a cannon rigidly to a hull... crosshairs jumping across the sky")
  const rigidIn = prog(t, CUE.c01_s04_bolt_rigid - 0.15, CUE.c01_s04_bolt_rigid + 0.45);
  const rigidOut = 1 - prog(t, 71.05, 71.75);
  const rigidAlpha = rigidIn * rigidOut;

  // Khung thoi định vị mục tiêu di động ở xa (bật từ "Sniping a moving target over two miles away")
  const targetMarkerAlpha =
    prog(t, CUE.c01_s04_sniping, CUE.c01_s04_sniping + 0.6) * (1 - prog(t, 71.0, 71.7));

  // Điểm nhấn quán tính 5 tấn thép tại gốc nòng & khiên pháo ("five tons of gun steel... inertia")
  const inertiaGlow =
    prog(t, CUE.c01_s04_five_tons - 0.2, CUE.c01_s04_five_tons + 0.5) * (1 - prog(t, 77.1, 78.0));

  // Tia sáng quang học cyan trên hộp ngắm GPS khi lật ngược bài toán ("flip the problem upside down")
  const gpsHighlight = prog(t, CUE.c01_s04_flip_problem - 0.35, CUE.c01_s04_flip_problem + 0.55);

  // Vệt nhảy góc đứng của tâm ngắm đỏ trên bầu trời (bù tịnh tiến ngang theo xe để thấy rõ biên độ hất tung lên trời!)
  const crosshairJumpPts = useMemo(() => {
    if (rigidAlpha <= 0.01) return null;
    const steps = 28;
    const span = 0.95;
    const pts: V3[] = [];
    for (let i = 0; i < steps; i++) {
      const ts = Math.max(CUE.c01_s04_bolt_rigid - 0.1, t - span + (span * i) / (steps - 1));
      const pHist = barrelPointWorld(sampleAbramsPose(ts), [74.0, 0, 0]);
      const dxShift = pose.pos[0] - tankXAt(ts);
      pts.push([pHist[0] + dxShift, pHist[1], pHist[2]]);
    }
    return pts;
  }, [t, rigidAlpha, pose.pos]);

  // Bụi cát tung lên từ cả bánh trước-giữa (khi dằn ổ gà) lẫn đuôi 2 dải xích Abrams + sau T-72
  const abramsDustFrontR = useMemo(
    () => (s: number): V3 => {
      const px = tankXAt(s) + 0.9;
      return [px, H_DESERT(px, 1.72) + 0.08, 1.72];
    },
    [],
  );
  const abramsDustRearR = useMemo(
    () => (s: number): V3 => {
      const px = tankXAt(s) - 3.3;
      return [px, H_DESERT(px, 1.55) + 0.1, 1.55];
    },
    [],
  );
  const abramsDustRearL = useMemo(
    () => (s: number): V3 => {
      const px = tankXAt(s) - 3.1;
      return [px, H_DESERT(px, -1.55) + 0.1, -1.55];
    },
    [],
  );
  const enemyDust = useMemo(
    () => (s: number): V3 => {
      const px = enemyXAt(s) - 3.4;
      return [px, H_DESERT(px, ENEMY_Z) + 0.12, ENEMY_Z];
    },
    [],
  );

  // ---------------- Ngôn ngữ Camera 3 nhịp liền mạch ----------------
  const [tx, ty, tz] = pose.pos;

  // Nhịp 1 (58.10–71.10 s): 3/4 sườn-trước chạy song song bên phải M1A2, thu trọn cả xe, tia trục nòng nhảy lên trời & T-72 phía xa
  const drift1 = prog(t, 58.1, 71.1, Easing.inOut(Easing.sin));
  const cam1Pos: V3 = [tx + lerp(6.35, 5.85, drift1), ty + lerp(2.85, 2.65, drift1), tz + lerp(10.6, 9.85, drift1)];
  const cam1Look: V3 = [tx + lerp(-0.55, -0.35, drift1), ty + lerp(2.45, 2.75, drift1), tz - 15.8];

  // Nhịp 2 (71.10–77.50 s): Ép cận vào gốc nòng, bầu hút khói & cụm máng khiên pháo M256 nặng 5 tấn đang rùng giật vì quán tính
  const drift2 = prog(t, 72.0, 77.4, Easing.inOut(Easing.sin));
  const cam2Pos: V3 = [tx + lerp(4.35, 3.85, drift2), ty + lerp(2.3, 2.2, drift2), tz + lerp(3.75, 3.25, drift2)];
  const cam2Look: V3 = [tx + lerp(1.92, 1.68, drift2), ty + 1.85, tz + 0.05];

  // Nhịp 3 (77.50–80.64 s): Lượn máy hướng thẳng lên chính giữa hộp kính ngắm GPS trên nóc phải tháp pháo (bám toạ độ thế giới thật của hộp GPS!)
  const gpsWorldCenter = turretPointWorld(pose, [0.94, 1.23, 0.68]);
  const cam3Pos: V3 = [gpsWorldCenter[0] + 1.72, gpsWorldCenter[1] + 0.28, gpsWorldCenter[2] + 1.48];
  const cam3Look: V3 = [gpsWorldCenter[0] - 0.04, gpsWorldCenter[1] - 0.03, gpsWorldCenter[2] - 0.06];

  const pToGunRoot = prog(t, 71.05, 73.15, Easing.inOut(Easing.cubic));
  const pToGpsBox = prog(t, 77.45, 80.05, Easing.inOut(Easing.cubic));

  const midPos: V3 = [
    lerp(cam1Pos[0], cam2Pos[0], pToGunRoot),
    lerp(cam1Pos[1], cam2Pos[1], pToGunRoot),
    lerp(cam1Pos[2], cam2Pos[2], pToGunRoot),
  ];
  const midLook: V3 = [
    lerp(cam1Look[0], cam2Look[0], pToGunRoot),
    lerp(cam1Look[1], cam2Look[1], pToGunRoot),
    lerp(cam1Look[2], cam2Look[2], pToGunRoot),
  ];

  const camVib = (1 - pToGpsBox * 0.85) * 0.032;
  const camPos: V3 = [
    lerp(midPos[0], cam3Pos[0], pToGpsBox),
    lerp(midPos[1], cam3Pos[1], pToGpsBox) + Math.sin(t * 14.2) * camVib,
    lerp(midPos[2], cam3Pos[2], pToGpsBox) + Math.cos(t * 11.3) * camVib * 0.7,
  ];
  const camLook: V3 = [
    lerp(midLook[0], cam3Look[0], pToGpsBox),
    lerp(midLook[1], cam3Look[1], pToGpsBox),
    lerp(midLook[2], cam3Look[2], pToGpsBox),
  ];
  const camFov = lerp(lerp(36, 32, pToGunRoot), 30, pToGpsBox);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: '#11161d' }}>
      <Stage
        {...LOOK_DESERT_GLARE.stage}
        shadowCenter={[tx + 4, ty + 1.2, -6]}
        shadowArea={40}
        width={W}
        height={H}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình sa mạc ổ gà gợn sóng & đá/bụi khô màu cát cháy nắng */}
        <Terrain h={H_DESERT} size={640} seg={340} center={[165, -45]} colors={LOOK_DESERT_GLARE.terrain} grainRepeat={48} />
        <Scatter
          kind="rock"
          count={260}
          area={[-35, -135, 365, 55]}
          h={H_DESERT}
          seed={19}
          scale={[0.45, 1.35]}
          avoid={avoidTracks}
          tint={LOOK_DESERT_GLARE.scatterTint}
        />
        <Scatter
          kind="bush"
          count={70}
          area={[-35, -125, 365, 45]}
          h={H_DESERT}
          seed={37}
          scale={[0.32, 0.68]}
          avoid={avoidTracks}
          tint="#b99c6b"
        />

        {/* Chủ thể chính: M1A2 Abrams lao 40 mph qua chuỗi ổ gà sa mạc */}
        <M1A2Abrams
          variant="m1a2"
          camo="desert"
          position={pose.pos}
          rotation={pose.rot}
          travel={travel}
          hullPitch={pose.hullPitch}
          hullRoll={pose.hullRoll}
          turretYaw={pose.turretYaw}
          gunPitch={pose.gunPitch}
          citvYaw={0.18}
          exhaustHeat={0.35}
        />

        {/* Bụi cát cuộn dày ngay dưới bánh chịu nặng & phía sau hai dải xích T-158 */}
        <DustTrail t={t} from={55.0} to={81.5} path={abramsDustFrontR} rate={14} size={1.65} color="#decba4" life={1.5} />
        <DustTrail t={t} from={55.0} to={81.5} path={abramsDustRearR} rate={14} size={2.65} color="#d6c29b" life={2.8} />
        <DustTrail t={t} from={55.0} to={81.5} path={abramsDustRearL} rate={12} size={2.45} color="#cdb890" life={2.7} />

        {/* Mục tiêu di động ở xa (>2 dặm): Enemy T-72 cơ động trên sống đồi chân trời */}
        <EnemyT72
          position={[ex, ey, ENEMY_Z]}
          rotation={[0, 0, ePitch]}
          turretYaw={-1.35}
          gunPitch={-0.02}
          travel={enemyTravel}
        />
        <DustTrail t={t} from={55.0} to={81.5} path={enemyDust} rate={8} size={2.7} color="#d8c5a0" life={3.1} />

        {/* Khung thoi định vị mục tiêu di động ở sống đồi xa (Sniping a moving target over two miles away) */}
        {targetMarkerAlpha > 0.01 && (
          <group position={[ex, ey + 2.75, ENEMY_Z]} rotation={[0, 0.25, Math.PI / 4]}>
            <mesh>
              <torusGeometry args={[2.25, 0.11, 8, 4]} />
              <meshBasicMaterial color={PAL.amber} transparent opacity={0.9 * targetMarkerAlpha} toneMapped={false} />
            </mesh>
          </group>
        )}

        {/* Vệt nhảy góc đứng trên bầu trời của vòng tâm ngắm đỏ khi pháo gắn cứng vào thân xe */}
        {crosshairJumpPts && (
          <Trail
            points={crosshairJumpPts}
            upto={1}
            color={PAL.crimson}
            width={0.14}
            opacity={0.62 * rigidAlpha}
            glow
          />
        )}

        {/* Hệ quy chiếu gắn cứng 1:1 theo trục pháo M256: Đai khoá cứng + Tia laser trục nòng + Tâm ngắm đỏ & Điểm nhấn GPS */}
        <group position={pose.pos} rotation={pose.rot}>
          <group position={[0, 0.65, 0]} rotation={[pose.hullRoll, 0, pose.hullPitch]}>
            <group position={[0, -0.65, 0]}>
              <group position={[0.08, 1.35, 0]} rotation={[0, pose.turretYaw, 0]}>
                {/* Điểm nhấn tinh tế trên cửa kính hộp ngắm GPS ở cuối cảnh ("flip the problem upside down") */}
                {gpsHighlight > 0.01 && (
                  <group position={[0.84, 1.09, 0.72]}>
                    <mesh position={[0.296, 0.155, -0.05]}>
                      <boxGeometry args={[0.008, 0.165, 0.185]} />
                      <meshBasicMaterial
                        color={PAL.cyan}
                        transparent
                        opacity={0.72 * gpsHighlight}
                        toneMapped={false}
                      />
                    </mesh>
                    {/* Vòng chuẩn trực quang học mảnh ngay trước cửa kính hộp GPS dẫn sang cảnh cắt bổ C01S05 */}
                    <mesh position={[0.34, 0.155, 0.015]} rotation={[0, Math.PI / 2, t * 1.2]}>
                      <torusGeometry args={[0.22, 0.006, 10, 40]} />
                      <meshBasicMaterial
                        color={PAL.cyan}
                        transparent
                        opacity={0.88 * gpsHighlight}
                        toneMapped={false}
                      />
                    </mesh>
                    {/* Tia chuẩn ngắn loé nhẹ từ cửa sổ GPS báo hiệu giải pháp gương ổn định */}
                    <mesh position={[0.68, 0.155, -0.04]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.008, 0.008, 0.76, 10]} />
                      <meshBasicMaterial
                        color={PAL.cyanSoft}
                        transparent
                        opacity={0.68 * gpsHighlight}
                        toneMapped={false}
                      />
                    </mesh>
                  </group>
                )}

                {/* Trục nòng pháo M256 (trunnion tại [0.36, 0.50, 0], miệng nòng tại x = +5.28) */}
                <group position={[0.36, 0.5, 0]} rotation={[0, 0, pose.gunPitch]}>
                  {/* Minh hoạ "Bolt a cannon rigidly to a hull": Đai khoá cứng đỏ tại cổ pháo + Chùm tia & Tâm ngắm nhảy loạn */}
                  {rigidAlpha > 0.01 && (
                    <group>
                      {[1.26, 1.96].map((rx, idx) => (
                        <mesh key={idx} position={[rx, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                          <torusGeometry args={[idx === 0 ? 0.215 : 0.155, 0.018, 12, 32]} />
                          <meshBasicMaterial
                            color={PAL.crimson}
                            transparent
                            opacity={0.92 * rigidAlpha}
                            toneMapped={false}
                          />
                        </mesh>
                      ))}

                      {/* Lõi tia trục nòng đỏ rực gắn chết theo đầu nòng (x = 5.28 -> 74.0 m) */}
                      <mesh position={[39.64, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.045, 0.028, 68.72, 12]} />
                        <meshBasicMaterial
                          color={PAL.crimson}
                          transparent
                          opacity={0.96 * rigidAlpha}
                          toneMapped={false}
                        />
                      </mesh>
                      {/* Quầng halo mờ bao quanh tia trục nòng */}
                      <mesh position={[39.64, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.145, 0.085, 68.72, 12]} />
                        <meshBasicMaterial
                          color={PAL.crimson}
                          transparent
                          opacity={0.25 * rigidAlpha}
                          toneMapped={false}
                        />
                      </mesh>

                      {/* Vòng tâm ngắm không gian 3D (Crosshairs) gắn cứng ở cự ly 74 m — bị hất tung lên trời theo mỗi ổ gà */}
                      <group position={[74.0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <mesh>
                          <torusGeometry args={[2.8, 0.125, 12, 48]} />
                          <meshBasicMaterial
                            color={PAL.crimson}
                            transparent
                            opacity={0.96 * rigidAlpha}
                            toneMapped={false}
                          />
                        </mesh>
                        <mesh>
                          <torusGeometry args={[1.18, 0.085, 10, 36]} />
                          <meshBasicMaterial
                            color="#ff8585"
                            transparent
                            opacity={0.92 * rigidAlpha}
                            toneMapped={false}
                          />
                        </mesh>
                        <mesh>
                          <sphereGeometry args={[0.24, 12, 12]} />
                          <meshBasicMaterial
                            color="#ffd6d6"
                            transparent
                            opacity={0.96 * rigidAlpha}
                            toneMapped={false}
                          />
                        </mesh>
                        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, k) => (
                          <mesh
                            key={k}
                            position={[Math.cos(ang) * 2.3, Math.sin(ang) * 2.3, 0]}
                            rotation={[0, 0, ang]}
                          >
                            <boxGeometry args={[1.7, 0.14, 0.08]} />
                            <meshBasicMaterial
                              color={PAL.crimson}
                              transparent
                              opacity={0.96 * rigidAlpha}
                              toneMapped={false}
                            />
                          </mesh>
                        ))}
                      </group>
                    </group>
                  )}

                  {/* Vòng ứng suất quán tính hổ phách quanh gốc pháo 5 tấn khi ép cận (72.02–77.2 s) */}
                  {inertiaGlow > 0.01 && (
                    <group>
                      {[1.25, 1.96, 2.54].map((bx, i) => (
                        <mesh key={i} position={[bx, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                          <torusGeometry args={[i === 2 ? 0.165 : 0.195 - i * 0.035, 0.013, 12, 32]} />
                          <meshBasicMaterial
                            color={PAL.amber}
                            transparent
                            opacity={0.68 * inertiaGlow * (0.75 + 0.25 * Math.sin(t * 14 + i))}
                            toneMapped={false}
                          />
                        </mesh>
                      ))}
                    </group>
                  )}
                </group>
              </group>
            </group>
          </group>
        </group>
      </Stage>

      {/* Đúng 1 nhãn chữ neo thông số khối lượng thép pháo 5 tấn */}
      <Label
        t={t}
        text="5 TONS"
        from={CUE.c01_s04_five_tons}
        until={76.8}
        x={SAFE + 190}
        y={H - SAFE - 82}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C01S04;
