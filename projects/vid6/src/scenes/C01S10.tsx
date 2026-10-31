import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { useT, prog, lerp, bump, mix } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { MuzzleBlast, DustTrail, Trail } from '@skill/military/3d/fx';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_GLARE } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';

// ---------------- Địa hình sa mạc chiều nắng gắt & hố bom sâu rộng tại CRATER_X = 95.8 m ----------------
const CRATER_X = 95.8;
const CRATER_Z = 0.0;
const CRATER_R = 8.4;

const DESERT_CRATER_H = heightField({
  seed: 31,
  amp: 1.25,
  scale: 105,
  add: (x, z) => {
    // Mở thoáng hoàn toàn mặt tiền phía camera (+Z: z = 2.4..9.0) để không có gờ cát nào chắn trước ống kính!
    const camClearZone = Math.exp(-(((z - 4.8) / 3.2) ** 2));
    const corridor = Math.exp(-((z / 12) ** 2));
    const ripples = Math.sin(x * 0.22) * 0.09 * corridor * (1 - camClearZone * 0.75);

    // Đụn cát xa ở hậu cảnh bên trái (-Z < -9) tạo chiều sâu sa mạc mà không lấn vào tiền cảnh (+Z)
    const farDunes = z < -6 ? (1 - corridor) * (2.8 * Math.sin(x * 0.045 + z * 0.03) + 2.0) : (1 - corridor) * 0.8;

    // Hố bom sâu với sườn dốc dài để toàn bộ dải xích Abrams nằm khít trên triền dốc chúc mũi xuống lòng hố!
    const d = Math.hypot(x - CRATER_X, (z - CRATER_Z) * 1.05);
    const bowl = -1.32 * Math.exp(-((d / 5.4) ** 2));
    const rimMask = z > 1.8 ? Math.max(0, 1 - (z - 1.8) / 1.8) : 1;
    const rim = 0.28 * rimMask * Math.exp(-(((d - CRATER_R * 0.86) / 1.8) ** 2));

    return ripples + farDunes + bowl + rim - camClearZone * 0.22;
  },
});

const avoidTrackAndCam = (x: number, z: number) => z > -7.5 && z < 11.5 && x > -10 && x < 150;

/**
 * Quãng đường xe chạy dọc +X (m) mượt C1:
 * - 155.60..161.10 s: lao nhanh 13.6 m/s trên sa mạc (từ x = 10.2 -> 85.0 m, ngay miệng dốc hố bom).
 * - 161.10..162.10 s: sập mũi xuống triền dốc hố bom (x = 85.0 -> 91.85 m) và chuyển mượt sang bullet-time (0.11 m/s).
 * - 162.10..182.55 s: trôi bullet-time dọc đúng triền dốc xuống của hố bom (x = 91.85 -> 94.10 m, mũi xe luôn chúi sâu ~ -9°!).
 * - 182.55..183.90 s: khai hoả xong vọt mạnh qua đáy hố bom.
 */
function tankXAt(time: number): number {
  const t0 = 155.6;
  const tDec0 = 161.1;
  const tDec1 = 162.1;
  const tAcc0 = 182.55;
  const vFast = 13.6;
  const vSlow = 0.11;
  const vOut = 7.6;
  const x0 = 10.2;

  if (time <= tDec0) return x0 + (time - t0) * vFast;

  const xAtDec0 = x0 + (tDec0 - t0) * vFast;
  const durDec = tDec1 - tDec0;
  if (time <= tDec1) {
    const u = (time - tDec0) / durDec;
    return xAtDec0 + durDec * (vFast * u + (vSlow - vFast) * (u * u * u - 0.5 * u * u * u * u));
  }

  const xAtDec1 = xAtDec0 + durDec * 0.5 * (vFast + vSlow);
  if (time <= tAcc0) {
    return xAtDec1 + (time - tDec1) * vSlow;
  }

  const xAtAcc0 = xAtDec1 + (tAcc0 - tDec1) * vSlow;
  const durAcc = 0.65;
  const dt = time - tAcc0;
  if (dt <= durAcc) {
    const u = dt / durAcc;
    return xAtAcc0 + durAcc * (vSlow * u + (vOut - vSlow) * (u * u * u - 0.5 * u * u * u * u));
  }
  const xAtAcc1 = xAtAcc0 + durAcc * 0.5 * (vSlow + vOut);
  return xAtAcc1 + (dt - durAcc) * vOut;
}

/** Dựng thanh tia vector 3D tương phản cao ngoài nắng sa mạc (vòng chia vạch tối + lõi sáng rực + hào quang). */
const Beam3D: React.FC<{
  from: V3;
  to: V3;
  coreColor: string;
  glowColor: string;
  coreR?: number;
  glowR?: number;
  opacity?: number;
  ticks?: number;
}> = ({ from, to, coreColor, glowColor, coreR = 0.03, glowR = 0.085, opacity = 1, ticks = 0 }) => {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const diff = b.clone().sub(a);
  const len = diff.length();
  if (len < 0.02 || opacity <= 0.005) return null;

  const mid = a.clone().addScaledVector(diff, 0.5);
  const dir = diff.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  return (
    <group position={[mid.x, mid.y, mid.z]} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[glowR, glowR, len, 14]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.35 * opacity} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[coreR, coreR, len, 12]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.98 * opacity} toneMapped={false} />
      </mesh>
      {ticks > 0 &&
        Array.from({ length: ticks }, (_, i) => {
          const yOff = -len * 0.4 + (len * 0.8 * i) / Math.max(1, ticks - 1);
          return (
            <mesh key={i} position={[0, yOff, 0]}>
              <cylinderGeometry args={[coreR * 1.48, coreR * 1.48, 0.045, 12]} />
              <meshBasicMaterial color="#0e1722" transparent opacity={0.88 * opacity} />
            </mesh>
          );
        })}
    </group>
  );
};

const C01S10: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // ---------------- 1. Động học thân xe Abrams tiếp xúc chuẩn xác trên triền dốc hố bom (không lún & không hở xích!) ----------------
  const tx = tankXAt(t);
  const hFront = DESERT_CRATER_H(tx + 2.6, 0.9);
  const hRear = DESERT_CRATER_H(tx - 2.6, 0.9);
  const terrainSlopePitch = Math.atan2(hFront - hRear, 5.2);

  const craterSlam = prog(t, CUE.c01_s10_hit_crater - 0.12, CUE.c01_s10_hit_crater + 0.65);
  const craterRecover = prog(t, 182.55, 183.85);
  const slamDip = craterSlam * (1 - craterRecover * 0.65);

  const hullPitch = terrainSlopePitch + (1 - craterSlam) * Math.sin(t * 6.5) * 0.008;
  const hullRoll = slamDip * -0.016 + (1 - craterSlam) * Math.cos(t * 5.1) * 0.006;

  // Giải chính xác tiếp tuyến đáy dải xích theo tâm quay [0, 0.65, 0] của M1A2Abrams để mọi bánh tỳ khít mặt cát
  const trackSamples = [-2.5, -1.25, 0, 1.25, 2.5].map(
    (lx) =>
      DESERT_CRATER_H(tx + lx, 1.35) -
      0.65 * (1 - Math.cos(hullPitch)) -
      lx * Math.sin(hullPitch) -
      1.35 * Math.sin(hullRoll),
  );
  const tankY = Math.max(...trackSamples) - 0.032;

  // ---------------- 2. Góc nâng pháo M256 (`gunPitch`), độ trễ quán tính & cổng Coincidence Firing ----------------
  const targetWorldElev = 0.026;
  const exactGunPitchNeeded = targetWorldElev - hullPitch;

  const lagIn = prog(t, CUE.c01_s10_hit_crater - 0.08, CUE.c01_s10_barrel_lags + 0.35);
  const servoMuscle = prog(t, CUE.c01_s10_servos_muscle - 0.15, CUE.c01_s10_circuit_closes);
  // Độ trễ góc lớn (-0.155 rad ~ -8.9°) để mắt thấy rõ khoảng tách chữ V giữa tia chuẩn Cyan và trục nòng Đỏ-Cam!
  const lagAngleRad = -0.155 * lagIn * (1 - servoMuscle);
  const gunPitch = exactGunPitchNeeded + lagAngleRad;

  // Giật nòng đanh gọn đúng giây tự động khai hoả 182.62 s (c01_s10_auto_fire)
  const dtFire = t - CUE.c01_s10_auto_fire;
  const recoil =
    dtFire < 0
      ? 0
      : dtFire < 0.065
        ? dtFire / 0.065
        : Math.max(0, Math.exp(-(dtFire - 0.065) * 3.0));

  // ---------------- 3. Tính toạ độ thế giới chính xác 100% của hộp gương GPS, gốc pháo & miệng nòng M256 ----------------
  const kinematics = useMemo(() => {
    const hullEuler = new THREE.Euler(hullRoll, 0, hullPitch, 'XYZ');
    const pivot = new THREE.Vector3(0, 0.65, 0);
    const rootPos = new THREE.Vector3(tx, tankY, 0);

    const hullToWorld = (lx: number, ly: number, lz: number): THREE.Vector3 =>
      new THREE.Vector3(lx, ly, lz).sub(pivot).applyEuler(hullEuler).add(pivot).add(rootPos);

    const gpsWorld = hullToWorld(1.21, 2.595, 0.74);
    const trunnionWorld = hullToWorld(0.44, 1.85, 0);

    const gunDirHull = new THREE.Vector3(Math.cos(gunPitch), Math.sin(gunPitch), 0);
    const gunDirWorld = gunDirHull.clone().applyEuler(hullEuler).normalize();

    const mantletPulseWorld = trunnionWorld.clone().addScaledVector(gunDirWorld, 1.15);
    const muzzleLen = 5.28 - recoil * 0.3;
    const muzzleWorld = trunnionWorld.clone().addScaledVector(gunDirWorld, muzzleLen);

    // Hướng đường đạn tính toán ổn định từ gương con quay (giữ thẳng tắp bất chấp hullPitch!)
    const calcDirWorld = new THREE.Vector3(Math.cos(targetWorldElev), Math.sin(targetWorldElev), 0).normalize();

    // Đặt cổng bắn trùng phùng Coincidence Firing cách trunnion 7.15 m (~1.87 m ngay trước miệng nòng để trọn vẹn trong khung cận!)
    const gateDistFromTrunnion = 7.15;
    const gateCenter = trunnionWorld.clone().addScaledVector(calcDirWorld, gateDistFromTrunnion);
    const barrelAtGate = trunnionWorld.clone().addScaledVector(gunDirWorld, gateDistFromTrunnion);

    return {
      gpsWorld,
      trunnionWorld,
      mantletPulseWorld,
      muzzleWorld,
      gunDirWorld,
      calcDirWorld,
      gateCenter,
      barrelAtGate,
    };
  }, [tx, tankY, hullPitch, hullRoll, gunPitch, recoil]);

  // ---------------- 4. Trạng thái mạch điện, 2 vector không gian & cổng Coincidence Firing ----------------
  const triggerPulled = prog(t, CUE.c01_s10_pull_trigger - 0.08, CUE.c01_s10_pull_trigger + 0.35);
  const vectorsVisible = prog(t, CUE.c01_s10_hit_crater - 0.1, CUE.c01_s10_hit_crater + 0.45);
  const vectorsFadeOut = t > CUE.c01_s10_auto_fire + 0.35 ? 1 - prog(t, CUE.c01_s10_auto_fire + 0.35, 183.75) : 1;
  const hudAlpha = vectorsVisible * vectorsFadeOut;

  const isRefusing = t >= CUE.c01_s10_barrel_lags && t < CUE.c01_s10_servos_muscle;
  const circuitClosed = prog(t, CUE.c01_s10_circuit_closes - 0.08, CUE.c01_s10_circuit_closes + 0.18);
  const circuitFlash = bump(t, CUE.c01_s10_circuit_closes - 0.04, 0.85);
  const pulseSurge = prog(t, CUE.c01_s10_circuit_closes, CUE.c01_s10_auto_fire);

  const barrelVecColor =
    circuitClosed > 0.45
      ? PAL.amberHot
      : mix(PAL.crimson, PAL.amber, prog(t, CUE.c01_s10_servos_muscle, CUE.c01_s10_barrel_crosses + 0.6));

  const gateColor = circuitClosed > 0.35 ? PAL.amberHot : isRefusing ? PAL.crimson : PAL.cyan;

  // Quỹ đạo đạn động năng lao vút qua cổng ngay lúc 182.62 s
  const shotFlightP = prog(t, CUE.c01_s10_auto_fire, CUE.c01_s10_auto_fire + 0.28);
  const shotTrailPts = useMemo<V3[]>(() => {
    const p0 = kinematics.muzzleWorld;
    const d = kinematics.calcDirWorld;
    return Array.from({ length: 16 }, (_, i) => {
      const dist = (i / 15) * 90;
      return [p0.x + d.x * dist, p0.y + d.y * dist, p0.z + d.z * dist];
    });
  }, [kinematics.muzzleWorld, kinematics.calcDirWorld]);

  // ---------------- 5. Ngôn ngữ Camera 3/4 trước-sườn cận pháo M256 120mm (ôm trọn cả tháp pháo, đầu nòng & cổng bắn!) ----------------
  const pCamCrater = prog(t, 160.2, 162.1);
  const pCamServo = prog(t, 168.4, 171.2);
  const pCamClimax = prog(t, 175.2, 178.4);

  const hitShake = bump(t, CUE.c01_s10_hit_crater, 0.65) * 0.15;
  const fireShake = bump(t, CUE.c01_s10_auto_fire, 0.6) * 0.25;
  const shakeY = Math.sin(t * 44) * (hitShake + fireShake);
  const shakeZ = Math.cos(t * 37) * (hitShake + fireShake) * 0.7;

  let offX = lerp(9.6, 11.2, pCamCrater);
  let offY = lerp(2.25, 2.48, pCamCrater);
  let offZ = lerp(4.9, 5.75, pCamCrater);

  offX = lerp(offX, 10.8, pCamServo);
  offY = lerp(offY, 2.34, pCamServo);
  offZ = lerp(offZ, 5.3, pCamServo);

  offX = lerp(offX, 10.45, pCamClimax);
  offY = lerp(offY, 2.24, pCamClimax);
  offZ = lerp(offZ, 4.95, pCamClimax);

  let lkX = lerp(2.7, 5.15, pCamCrater);
  let lkY = lerp(1.62, 1.58, pCamCrater);

  lkX = lerp(lkX, 5.55, pCamServo);
  lkY = lerp(lkY, 1.72, pCamServo);

  // Giữ tâm nhìn ở x = tx + 5.95 để vừa thấy cận má tháp pháo/GPS/nòng M256 bên trái vừa thấy TRỌN VẸN vòng cổng Coincidence Firing bên phải!
  lkX = lerp(lkX, 5.95, pCamClimax);
  lkY = lerp(lkY, 1.84, pCamClimax);

  const camGround = DESERT_CRATER_H(tx + offX, offZ);
  const camPos: V3 = [tx + offX, Math.max(camGround + 1.15, tankY + offY) + shakeY, offZ + shakeZ];
  const camLook: V3 = [tx + lkX, tankY + lkY + shakeY * 0.35, -0.05];
  const camFov = lerp(35, 34, pCamClimax);

  // Tách bạch đúng 2 VECTOR CHÍNH bắt đầu từ sau miệng nòng (không xuyên chồng lên thân ống pháo!):
  // 1) Vector Gương Ổn Định CYAN: Tia mảnh dẫn từ cửa kính GPS hội tụ vào tâm Cổng + trục chuẩn Cyan xuyên qua cổng.
  // 2) Vector Trục Nòng M256 ĐỎ-CAM: Phóng từ miệng nòng M256 cắt dần từ dưới lên đúng tâm Cổng Coincidence Firing!
  const calcPathStart: V3 = [
    kinematics.trunnionWorld.x + kinematics.calcDirWorld.x * 5.38,
    kinematics.trunnionWorld.y + kinematics.calcDirWorld.y * 5.38,
    0,
  ];
  const calcPathEnd: V3 = [
    kinematics.trunnionWorld.x + kinematics.calcDirWorld.x * 10.2,
    kinematics.trunnionWorld.y + kinematics.calcDirWorld.y * 10.2,
    0,
  ];
  const barrelVecEnd: V3 = [
    kinematics.trunnionWorld.x + kinematics.gunDirWorld.x * 10.2,
    kinematics.trunnionWorld.y + kinematics.gunDirWorld.y * 10.2,
    0,
  ];
  const gateTopRim: V3 = [
    kinematics.gateCenter.x,
    kinematics.gateCenter.y + 0.42,
    0.04,
  ];

  const pulsePos = kinematics.mantletPulseWorld.clone().lerp(kinematics.muzzleWorld, pulseSurge);

  const gateQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), kinematics.calcDirWorld),
    [kinematics.calcDirWorld],
  );

  const muzzleQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), kinematics.gunDirWorld),
    [kinematics.gunDirWorld],
  );

  return (
    <AbsoluteFill>
      <Stage {...LOOK_DESERT_GLARE.stage} shadowArea={26} shadowCenter={[tx + 3.8, tankY + 1.2, 0]}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình sa mạc có đụn cát xa & hố bom sâu sắc nét */}
        <Terrain
          h={DESERT_CRATER_H}
          size={460}
          seg={256}
          center={[75, 0]}
          colors={LOOK_DESERT_GLARE.terrain}
          grainRepeat={52}
        />
        <Scatter
          kind="rock"
          count={85}
          area={[-20, -95, 210, 95]}
          h={DESERT_CRATER_H}
          seed={14}
          scale={[0.45, 1.35]}
          avoid={avoidTrackAndCam}
          tint={LOOK_DESERT_GLARE.scatterTint}
        />
        <Scatter
          kind="bush"
          count={55}
          area={[-20, -90, 200, 90]}
          h={DESERT_CRATER_H}
          seed={29}
          scale={[0.5, 1.1]}
          avoid={avoidTrackAndCam}
          tint="#b8a478"
        />

        {/* Vệt đất cháy sẫm dưới đáy hố bom để thấy cực rõ lòng hố lõm sâu dưới mũi xe */}
        <mesh
          position={[CRATER_X, DESERT_CRATER_H(CRATER_X, CRATER_Z) + 0.03, CRATER_Z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[3.5, 32]} />
          <meshStandardMaterial color="#5e4b36" roughness={0.98} transparent opacity={0.72} />
        </mesh>

        {/* Xe tăng chủ lực M1A2 Abrams lao trên sa mạc & sập hố bom */}
        <M1A2Abrams
          variant="m1a2"
          camo="desert"
          position={[tx, tankY, 0]}
          travel={tx}
          hullPitch={hullPitch}
          hullRoll={hullRoll}
          turretYaw={0}
          gunPitch={gunPitch}
          recoil={recoil}
          citvYaw={0.18}
          exhaustHeat={0.45}
        />

        {/* Bụi xích cuốn phía sau khi xe lao 40 mph tới hố bom */}
        <DustTrail
          t={t}
          from={155.2}
          to={162.2}
          path={(bt) => {
            const bx = tankXAt(bt) - 3.3;
            return [bx, DESERT_CRATER_H(bx, 1.5), 1.5];
          }}
          rate={10}
          size={2.2}
          color="#d5c09a"
          life={2.6}
        />
        <DustTrail
          t={t}
          from={155.2}
          to={162.2}
          path={(bt) => {
            const bx = tankXAt(bt) - 3.3;
            return [bx, DESERT_CRATER_H(bx, -1.5), -1.5];
          }}
          rate={10}
          size={2.2}
          color="#d5c09a"
          life={2.6}
        />

        {/* Bụi cát bung dưới bánh trước khi sập hố bom (161.20 s) */}
        {t >= CUE.c01_s10_hit_crater && t <= 165.0 && (
          <DustTrail
            t={t}
            from={CUE.c01_s10_hit_crater}
            to={161.95}
            path={(bt) => {
              const bx = tankXAt(bt) + 2.8;
              return [bx, DESERT_CRATER_H(bx, -0.4), -0.4];
            }}
            rate={14}
            size={2.1}
            color="#dec8a0"
            life={2.6}
          />
        )}

        {/* ==================== XUNG CÒ GIỮ CHỜ (HELD PULSE) & LỰC GỒNG SERVO THUỶ LỰC ==================== */}
        {triggerPulled > 0.01 && t < CUE.c01_s10_auto_fire + 0.08 && (
          <group>
            <group position={[pulsePos.x, pulsePos.y, pulsePos.z]}>
              <mesh>
                <sphereGeometry args={[0.14 + Math.sin(t * 14) * 0.025, 16, 16]} />
                <meshBasicMaterial color={PAL.amberHot} transparent opacity={0.92 * triggerPulled} toneMapped={false} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.25 + Math.sin(t * 10) * 0.03, 0.026, 12, 28]} />
                <meshBasicMaterial color={PAL.amber} transparent opacity={0.88 * triggerPulled} toneMapped={false} />
              </mesh>
              <pointLight color={PAL.amber} intensity={8 * triggerPulled} distance={3.5} decay={1.8} />
            </group>

            <Beam3D
              from={[kinematics.trunnionWorld.x, kinematics.trunnionWorld.y, 0]}
              to={[pulsePos.x, pulsePos.y, pulsePos.z]}
              coreColor={PAL.amberHot}
              glowColor={PAL.amber}
              coreR={0.036}
              glowR={0.11}
              opacity={0.78 * triggerPulled}
            />
          </group>
        )}

        {/* Mũi tên lực nâng Servo thuỷ lực điện ở gốc pháo M256 (168.90 -> 182.50 s) */}
        {t >= CUE.c01_s10_servos_muscle - 0.1 && t <= CUE.c01_s10_auto_fire && (
          <group position={[kinematics.trunnionWorld.x + 1.55, kinematics.trunnionWorld.y - 0.05, 0.44]}>
            {[0, 1, 2].map((ci) => {
              const liftOffset = ((t * 1.8 + ci * 0.33) % 1) * 0.44;
              return (
                <mesh key={ci} position={[0, -0.18 + liftOffset, 0]}>
                  <coneGeometry args={[0.095, 0.17, 4]} />
                  <meshBasicMaterial
                    color={PAL.amberHot}
                    transparent
                    opacity={0.9 * (1 - liftOffset / 0.46) * hudAlpha}
                    toneMapped={false}
                  />
                </mesh>
              );
            })}
          </group>
        )}

        {/* ==================== 2 VECTOR KHÔNG GIAN 3D & CỔNG BẮN COINCIDENCE FIRING ==================== */}
        {hudAlpha > 0.01 && (
          <group>
            {/* Tia dẫn chiếu mảnh từ gương ổn định trong hộp GPS xuống vành trên cổng Coincidence Firing */}
            <Beam3D
              from={[kinematics.gpsWorld.x, kinematics.gpsWorld.y, kinematics.gpsWorld.z]}
              to={gateTopRim}
              coreColor="#c8ffff"
              glowColor={PAL.cyan}
              coreR={0.016}
              glowR={0.05}
              opacity={0.82 * hudAlpha}
              ticks={4}
            />

            {/* VECTOR 1 (GƯƠNG ỔN ĐỊNH CYAN): Đường chuẩn tính toán khoá thẳng tắp xuyên tâm cổng Coincidence Firing */}
            <Beam3D
              from={calcPathStart}
              to={calcPathEnd}
              coreColor="#e0ffff"
              glowColor={PAL.cyan}
              coreR={0.034}
              glowR={0.105}
              opacity={hudAlpha}
              ticks={5}
            />

            {/* VECTOR 2 (TRỤC NÒNG PHÁO ĐỎ-CAM): Bị trễ chúc xuống dưới khi sập hố rồi được servo nâng cắt khít vào tâm cổng */}
            <Beam3D
              from={[kinematics.muzzleWorld.x, kinematics.muzzleWorld.y, kinematics.muzzleWorld.z]}
              to={barrelVecEnd}
              coreColor={circuitClosed > 0.5 ? '#ffffff' : barrelVecColor}
              glowColor={barrelVecColor}
              coreR={0.036}
              glowR={0.11}
              opacity={hudAlpha}
              ticks={5}
            />

            {/* Thanh đo khoảng cách góc lệch thẳng đứng giữa tâm cổng chuẩn Cyan và trục nòng thực tế */}
            {Math.abs(kinematics.gateCenter.y - kinematics.barrelAtGate.y) > 0.03 && (
              <Beam3D
                from={[kinematics.gateCenter.x, kinematics.gateCenter.y, 0]}
                to={[kinematics.barrelAtGate.x, kinematics.barrelAtGate.y, 0]}
                coreColor={PAL.crimson}
                glowColor={PAL.crimson}
                coreR={0.018}
                glowR={0.055}
                opacity={0.88 * hudAlpha}
              />
            )}

            {/* Vòng Pipper đầu trục nòng thực tế di chuyển từ dưới tiến lên tâm cổng bắn */}
            <group
              position={[kinematics.barrelAtGate.x, kinematics.barrelAtGate.y, kinematics.barrelAtGate.z]}
              quaternion={gateQuat}
            >
              <mesh>
                <torusGeometry args={[0.185, 0.025, 12, 32]} />
                <meshBasicMaterial color="#0e1722" transparent opacity={0.92 * hudAlpha} />
              </mesh>
              <mesh>
                <torusGeometry args={[0.16, 0.022, 12, 32]} />
                <meshBasicMaterial color={barrelVecColor} transparent opacity={hudAlpha} toneMapped={false} />
              </mesh>
            </group>

            {/* CỔNG VÒNG TRÒN COINCIDENCE FIRING */}
            <group
              position={[kinematics.gateCenter.x, kinematics.gateCenter.y, kinematics.gateCenter.z]}
              quaternion={gateQuat}
            >
              <mesh>
                <torusGeometry args={[0.45, 0.038, 14, 48]} />
                <meshBasicMaterial color="#0d1620" transparent opacity={0.9 * hudAlpha} />
              </mesh>
              <mesh scale={1 + circuitFlash * 0.28}>
                <torusGeometry args={[0.42, 0.034, 14, 48]} />
                <meshBasicMaterial color={gateColor} transparent opacity={hudAlpha} toneMapped={false} />
              </mesh>

              {[0, 1, 2, 3].map((gi) => {
                const a = (gi * Math.PI) / 2 + Math.PI / 4;
                const rTooth = lerp(0.49, 0.31, circuitClosed);
                return (
                  <mesh key={gi} position={[Math.cos(a) * rTooth, Math.sin(a) * rTooth, 0]} rotation={[0, 0, a]}>
                    <boxGeometry args={[0.15, 0.05, 0.05]} />
                    <meshBasicMaterial color={gateColor} transparent opacity={hudAlpha} toneMapped={false} />
                  </mesh>
                );
              })}

              {/* Chữ X khoá đỏ cảnh báo trong cổng khi nòng pháo còn trễ ("the gun refuses to fire") */}
              {isRefusing && (
                <group>
                  <mesh rotation={[0, 0, Math.PI / 4]}>
                    <boxGeometry args={[0.56, 0.054, 0.03]} />
                    <meshBasicMaterial color={PAL.crimson} transparent opacity={0.95 * hudAlpha} toneMapped={false} />
                  </mesh>
                  <mesh rotation={[0, 0, -Math.PI / 4]}>
                    <boxGeometry args={[0.56, 0.054, 0.03]} />
                    <meshBasicMaterial color={PAL.crimson} transparent opacity={0.95 * hudAlpha} toneMapped={false} />
                  </mesh>
                </group>
              )}

              {/* Chớp đóng mạch điện tử trắng-hổ phách tại c01_s10_circuit_closes (181.58 s) */}
              {circuitFlash > 0.01 && (
                <group>
                  <mesh scale={0.45 + (1 - circuitFlash) * 1.15}>
                    <ringGeometry args={[0.38, 0.48, 40]} />
                    <meshBasicMaterial
                      color="#ffffff"
                      transparent
                      opacity={circuitFlash}
                      side={THREE.DoubleSide}
                      toneMapped={false}
                    />
                  </mesh>
                  <pointLight color={PAL.amberHot} intensity={28 * circuitFlash} distance={6} decay={1.5} />
                </group>
              )}
            </group>
          </group>
        )}

        {/* ==================== TỰ ĐỘNG KHAI HOẢ <MuzzleBlast> & CHỚP LỬA ĐẦU NÒNG (182.62 s) ==================== */}
        <MuzzleBlast
          t={t}
          at={CUE.c01_s10_auto_fire}
          pos={[kinematics.muzzleWorld.x, kinematics.muzzleWorld.y, kinematics.muzzleWorld.z]}
          dir={[kinematics.gunDirWorld.x, kinematics.gunDirWorld.y, kinematics.gunDirWorld.z]}
          size={2.35}
          seed={10}
        />

        {/* Vệt đạn động năng APFSDS, chớp nòng, khói thuốc súng cuộn hữu cơ & tàn lửa văng khỏi miệng pháo M256 */}
        {dtFire >= 0 && (
          <group>
            <Trail
              points={shotTrailPts}
              upto={shotFlightP}
              color="#fff0ad"
              width={0.15}
              opacity={Math.max(0, 1 - dtFire / 1.45)}
              glow
            />

            {dtFire < 1.32 && (
              <group
                position={[kinematics.muzzleWorld.x, kinematics.muzzleWorld.y, kinematics.muzzleWorld.z]}
                quaternion={muzzleQuat}
              >
                {/* Nhân nhiệt đỏ-vàng nóng rực ngay miệng nòng pháo sau phát bắn */}
                <mesh position={[0.06, 0, 0]}>
                  <sphereGeometry args={[0.13, 14, 12]} />
                  <meshBasicMaterial
                    color={dtFire < 0.25 ? '#ffffff' : PAL.amberHot}
                    transparent
                    opacity={Math.max(0, 0.95 * (1 - dtFire / 1.28))}
                    toneMapped={false}
                  />
                </mesh>

                {/* Vòng sóng xung kích gọn và đanh chỉ loé trong 0.36 s đầu */}
                {dtFire < 0.36 && (
                  <mesh position={[0.55 + dtFire * 2.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.25 + dtFire * 1.4, 0.04, 12, 32]} />
                    <meshBasicMaterial
                      color={PAL.amberHot}
                      transparent
                      opacity={Math.max(0, 0.85 * (1 - dtFire / 0.36))}
                      toneMapped={false}
                    />
                  </mesh>
                )}

                {/* Các cụm khói thuốc phóng hữu cơ trôi dạt tự nhiên dọc hướng bắn (thay cho hình cầu kéo dãn) */}
                {Array.from({ length: 7 }, (_, pi) => {
                  const driftX = 0.45 + pi * 0.48 + dtFire * (1.35 + pi * 0.32);
                  const driftY = dtFire * (0.14 + pi * 0.055) + Math.sin(pi * 1.9) * 0.14;
                  const driftZ = Math.cos(pi * 2.3) * 0.18;
                  const puffR = 0.22 + pi * 0.045 + dtFire * 0.18;
                  const isHot = dtFire < 0.32 && pi < 3;
                  return (
                    <mesh key={`puff_${pi}`} position={[driftX, driftY, driftZ]}>
                      <sphereGeometry args={[puffR, 14, 12]} />
                      <meshStandardMaterial
                        color={isHot ? '#ffb85c' : '#dfd2bc'}
                        emissive={isHot ? '#ff7b1c' : '#3a2c1c'}
                        emissiveIntensity={isHot ? 1.8 : 0.18}
                        roughness={0.95}
                        transparent
                        opacity={Math.max(0, (0.34 - pi * 0.028) * (1 - dtFire / 1.32))}
                        depthWrite={false}
                      />
                    </mesh>
                  );
                })}

                <pointLight
                  color="#ff9d2e"
                  intensity={110 * Math.max(0, 1 - dtFire / 0.85) + 18 * Math.max(0, 1 - dtFire / 1.3)}
                  distance={16}
                  decay={1.5}
                />

                {/* Chùm tàn lửa thuốc phóng văng ra từ miệng pháo M256 */}
                {Array.from({ length: 20 }, (_, si) => {
                  const ang = (si / 20) * Math.PI * 2 + si * 0.4;
                  const spd = 3.8 + (si % 6) * 1.7;
                  const sx = spd * dtFire * (0.78 + 0.22 * Math.cos(ang));
                  const sy = Math.sin(ang) * 1.45 * dtFire - 1.9 * dtFire * dtFire;
                  const sz = Math.cos(ang) * 1.65 * dtFire;
                  return (
                    <mesh key={si} position={[sx, sy, sz]}>
                      <sphereGeometry args={[0.048, 8, 8]} />
                      <meshBasicMaterial
                        color={si % 2 === 0 ? PAL.amberHot : '#ff621c'}
                        transparent
                        opacity={Math.max(0, 1 - dtFire / 1.28)}
                        toneMapped={false}
                      />
                    </mesh>
                  );
                })}
              </group>
            )}

            {/* Bụi sóng xung kích là là dưới mặt cát (giữ thấp và gọn ở z = -1.2 để không che mờ thân xe!) */}
            <DustTrail
              t={t}
              from={CUE.c01_s10_auto_fire}
              to={CUE.c01_s10_auto_fire + 0.35}
              path={() => [
                kinematics.muzzleWorld.x + 1.5,
                DESERT_CRATER_H(kinematics.muzzleWorld.x + 1.5, -1.2),
                -1.2,
              ]}
              rate={14}
              size={1.7}
              color="#dfc99f"
              life={1.9}
            />
          </group>
        )}
      </Stage>

      {/* Tối đa 1 <Label> xuất hiện tại một thời điểm */}
      <Label
        t={t}
        text="M256 120mm"
        x={W * 0.21}
        y={H * 0.85}
        from={170.98}
        until={175.0}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="COINCIDENCE FIRING"
        x={W * 0.26}
        y={H * 0.85}
        from={CUE.c01_s10_coincidence_gate}
        until={183.72}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C01S10;
