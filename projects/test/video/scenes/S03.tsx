import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { ballistic, DustTrail, MuzzleBlast, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { STAGE_DUSK, STEPPE_COLORS } from '../local/palette';
import { MBT } from '../local/models/MBT';
import { FPVDrone } from '../local/models/FPVDrone';
import { TopAttackMissile } from '../local/models/TopAttackMissile';

// Bãi phẳng dọc lòng đường đáy thung lũng (z = 0) để xe tăng MBT lăn bánh êm, không lún xích
const ROAD_FLATS: [number, number, number, number][] = Array.from(
  { length: 21 },
  (_, i): [number, number, number, number] => [-80 + i * 8, 0, 8.5, 0],
);

// Địa hình thung lũng thảo nguyên: lòng đường phẳng ở giữa, sườn đồi Bắc vừa tầm để lộ chân trời hoàng hôn ấm phía trên
const H_VALLEY = heightField({
  seed: 37,
  amp: 2.2,
  scale: 76,
  flats: ROAD_FLATS,
  add: (x, z) => {
    const valleyFloor = Math.exp(-((z / 9.0) ** 2));
    // Sườn đồi phía Bắc (z < -6): tạo gờ đồi cao ~13-15m ở z ≈ -42 rồi thoải dần để lộ dải trời hoàng hôn phía trên
    const northRidge =
      z < -5
        ? 13.8 * Math.exp(-(((z + 42) / 25) ** 2)) +
          4.2 * (1 - Math.exp(-(((z + 5) / 16) ** 2))) +
          1.9 * Math.sin(x * 0.055 + 0.6)
        : 0;
    // Sườn đồi phía Nam (chỉ dốc lên phía sau lưng camera z > 17 để không chắn góc dưới-phải ống kính)
    const southRidge =
      z > 16
        ? 14.5 * (1 - Math.exp(-(((z - 16) / 22) ** 2))) +
          1.6 * Math.cos(x * 0.045)
        : 0;
    return (northRidge + southRidge) * (1 - valleyFloor);
  },
});

// Vị trí ổ phục kích đạn chống tăng vác vai ngay trên triền đồi bên trái trong khung hình
const AMBUSH_X = 1.5;
const AMBUSH_Z = -20.5;
const AMBUSH_Y = H_VALLEY(AMBUSH_X, AMBUSH_Z) + 1.15;
const AMBUSH_POS: V3 = [AMBUSH_X, AMBUSH_Y, AMBUSH_Z];

const avoidValleyRoadAndCam = (x: number, z: number) => {
  if (Math.abs(z) < 10.5) return true;
  // Giữ thoáng hành lang trước ống kính ở sườn Nam
  if (z > 10.5 && z < 28 && x > -32 && x < 28) return true;
  // Chừa khoảnh thoáng nhỏ quanh hỏa điểm phục kích để chớp lửa không bị cây thông che
  if (Math.hypot(x - AMBUSH_X, z - AMBUSH_Z) < 4.8) return true;
  return false;
};

/** Tính góc Euler [x, y, z] để trục +X của mô hình hướng theo vector `dir`, kèm góc nghiêng cánh `roll` (rad). */
function orientPlusX(dir: V3, roll = 0): V3 {
  const xAxis = new THREE.Vector3(...dir).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  if (Math.abs(xAxis.dot(worldUp)) > 0.99) worldUp.set(0, 0, 1);
  const zAxis = new THREE.Vector3().crossVectors(xAxis, worldUp).normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  if (Math.abs(roll) > 1e-4) {
    const q = new THREE.Quaternion().setFromAxisAngle(xAxis, roll);
    yAxis.applyQuaternion(q);
    zAxis.applyQuaternion(q);
  }
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  const e = new THREE.Euler().setFromRotationMatrix(m, 'XYZ');
  return [e.x, e.y, e.z];
}

const S03: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ==================== 1. XE TĂNG MBT HÀNH QUÂN DƯỚI LÒNG THUNG LŨNG ====================
  const tankSpeed = 2.25;
  const tankXAt = (time: number) => -5.5 + (time - 10.6) * tankSpeed;
  const tankX = tankXAt(t);
  const travel = (t - 7.5) * tankSpeed;

  // Tháp pháo xoay cảnh giới tầm thấp nhưng hoàn toàn phơi bày mặt nóc rộng lớn dưới tầm nhìn từ trên cao
  const turretYaw = 0.25 * Math.sin((t - 10.4) * 0.68) - 0.12;
  const citvYaw = (t - 10.0) * 1.5;
  const gunElev = 0.04 + 0.025 * Math.sin(t * 0.9);

  // ==================== 2. CAMERA POV CAO TỪ SƯỜN ĐỒI / SAU VAI FPV DRONE ====================
  const pEstablish = prog(t, 10.4, 16.5);
  const pDroneCam = prog(t, 16.6, 18.3);

  const camPos: V3 = [
    tankX - lerp(15.2, 13.4, pEstablish) - lerp(0, 1.4, pDroneCam),
    lerp(13.2, 12.0, pEstablish) + lerp(0, 0.5, pDroneCam),
    lerp(22.0, 19.6, pEstablish) + lerp(0, 0.9, pDroneCam),
  ];

  // Nâng nhẹ điểm nhìn để mở dải trời hoàng hôn trên đỉnh đồi Bắc, đồng thời dịch tâm phải khi drone vào tiền cảnh
  const camLook: V3 = [
    tankX + lerp(1.2, 1.8, pEstablish) + lerp(0, 3.3, pDroneCam),
    lerp(3.2, 3.0, pEstablish) + lerp(0, 0.3, pDroneCam),
    lerp(-3.5, -2.8, pEstablish) + lerp(0, 2.6, pDroneCam),
  ];
  const camFov = 38;
  const camRoll = lerp(0, -0.025, pDroneCam);

  // Hệ trục trực chuẩn của Camera để neo FPVDrone chuẩn xác ở tiền cảnh (~1.62 m trước ống kính)
  const camBasis = useMemo(() => {
    const upInit = new THREE.Vector3(Math.sin(camRoll), Math.cos(camRoll), 0);
    const F = new THREE.Vector3(
      camLook[0] - camPos[0],
      camLook[1] - camPos[1],
      camLook[2] - camPos[2],
    ).normalize();
    const R = new THREE.Vector3().crossVectors(F, upInit).normalize();
    const U = new THREE.Vector3().crossVectors(R, F).normalize();
    return { F, R, U };
  }, [
    camPos[0],
    camPos[1],
    camPos[2],
    camLook[0],
    camLook[1],
    camLook[2],
    camRoll,
  ]);

  // ==================== 3. ĐẠN CHỐNG TĂNG VÁC VAI PHỤC KÍCH TỪ GỜ ĐỒI TRÁI (15.06s) ====================
  const lockAlpha = prog(t, CUE.s03_defeat, CUE.s03_defeat + 0.65);
  const atgmLaunched = t >= CUE.s03_atgm_threat;
  const pAtgmFast = prog(t, CUE.s03_atgm_threat, 16.95);
  const pAtgmSlow = prog(t, 16.95, 21.3);
  const atgmProg = 0.56 * pAtgmFast + 0.33 * pAtgmSlow;

  const tankRoofPos: V3 = [tankX + 0.15, 2.52, 0];
  const launchDir: V3 = [
    tankRoofPos[0] - AMBUSH_POS[0],
    tankRoofPos[1] - AMBUSH_POS[1] + 3.2,
    tankRoofPos[2] - AMBUSH_POS[2],
  ];

  const atgmTrailPts = useMemo(() => {
    const N = 44;
    return Array.from({ length: N }, (_, i) =>
      ballistic(i / (N - 1), AMBUSH_POS, tankRoofPos, 3.4),
    );
  }, [tankRoofPos[0], tankRoofPos[1], tankRoofPos[2]]);

  const missilePos = ballistic(atgmProg, AMBUSH_POS, tankRoofPos, 3.4);
  const missileNext = ballistic(
    Math.min(1, atgmProg + 0.025),
    AMBUSH_POS,
    tankRoofPos,
    3.4,
  );
  const missileRot = orientPlusX([
    missileNext[0] - missilePos[0],
    missileNext[1] - missilePos[1],
    missileNext[2] - missilePos[2],
  ]);

  // ==================== 4. FPV DRONE GIÁ VÀI TRĂM ĐÔ LƯỚT SÁT TIỀN CẢNH (16.98s) ====================
  const droneVisible = t >= CUE.s03_drone_enter - 0.16;
  const pDroneIn = prog(t, CUE.s03_drone_enter - 0.1, CUE.s03_drone_enter + 0.88);
  const pDroneDive = prog(t, CUE.s03_paradox - 0.2, 21.1);

  const hoverX = 0.018 * Math.sin(t * 3.8) + 0.008 * Math.cos(t * 7.1);
  const hoverY = 0.015 * Math.cos(t * 4.4) + 0.007 * Math.sin(t * 6.3);
  const dDist = lerp(1.18, 1.62, pDroneIn) + lerp(0, 0.16, pDroneDive);
  const dRight = lerp(1.38, 0.39, pDroneIn) - lerp(0, 0.05, pDroneDive) + hoverX;
  const dUp = lerp(0.74, 0.16, pDroneIn) - lerp(0, 0.03, pDroneDive) + hoverY;

  const dronePosVec = useMemo(() => {
    return new THREE.Vector3(...camPos)
      .addScaledVector(camBasis.F, dDist)
      .addScaledVector(camBasis.R, dRight)
      .addScaledVector(camBasis.U, dUp);
  }, [camPos[0], camPos[1], camPos[2], camBasis, dDist, dRight, dUp]);

  const dronePos: V3 = [dronePosVec.x, dronePosVec.y, dronePosVec.z];

  // Đèn bù sáng tầm ngắn (distance=3.4m) hắt nhẹ từ dưới-trước lên bụng FPVDrone để thấy rõ quả đạn PG-7V & vòng đồng kích nổ
  const droneFillLightPos = useMemo((): V3 => {
    const p = dronePosVec
      .clone()
      .addScaledVector(camBasis.F, -0.55)
      .addScaledVector(camBasis.R, -0.45)
      .addScaledVector(camBasis.U, -0.42);
    return [p.x, p.y, p.z];
  }, [dronePosVec, camBasis]);

  // Hướng mũi đạn PG-7V khóa thẳng về phía nóc MBT ở góc 3/4 rõ biên dạng
  const droneAimVec = useMemo(() => {
    const toTank = new THREE.Vector3(
      tankRoofPos[0] - dronePosVec.x,
      tankRoofPos[1] - dronePosVec.y,
      tankRoofPos[2] - dronePosVec.z,
    ).normalize();
    return toTank
      .clone()
      .addScaledVector(camBasis.R, -0.46)
      .addScaledVector(camBasis.U, -0.18)
      .normalize();
  }, [
    tankRoofPos[0],
    tankRoofPos[1],
    tankRoofPos[2],
    dronePosVec,
    camBasis,
  ]);

  const droneBank =
    lerp(-0.38, -0.07, pDroneIn) -
    0.05 * pDroneDive +
    0.03 * Math.sin(t * 4.1);
  const droneRot = orientPlusX(
    [droneAimVec.x, droneAimVec.y, droneAimVec.z],
    droneBank,
  );

  return (
    <AbsoluteFill>
      <Stage {...STAGE_DUSK} shadowArea={45} shadowCenter={[tankX, 0, 0]}>
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Địa hình thung lũng thảo nguyên hoàng hôn */}
        <Terrain h={H_VALLEY} colors={STEPPE_COLORS} size={420} seg={240} />
        <Scatter
          kind="pine"
          count={195}
          area={[-135, -135, 145, 120]}
          h={H_VALLEY}
          seed={31}
          scale={[0.85, 1.45]}
          avoid={avoidValleyRoadAndCam}
          tint="#c9be9c"
        />
        <Scatter
          kind="bush"
          count={250}
          area={[-120, -110, 130, 100]}
          h={H_VALLEY}
          seed={53}
          scale={[0.8, 1.45]}
          avoid={avoidValleyRoadAndCam}
          tint="#b8ab7e"
        />
        <Scatter
          kind="rock"
          count={145}
          area={[-125, -115, 135, 105]}
          h={H_VALLEY}
          seed={71}
          scale={[0.7, 1.65]}
          avoid={avoidValleyRoadAndCam}
          tint="#a99f91"
        />

        {/* Cụm bụi rậm & đá ngụy trang tại hỏa điểm phục kích đạn chống tăng vác vai trên gờ đồi bên trái */}
        <Scatter
          kind="bush"
          count={8}
          area={[AMBUSH_X - 2.8, AMBUSH_Z - 2.6, AMBUSH_X + 2.8, AMBUSH_Z + 2.6]}
          h={H_VALLEY}
          seed={99}
          scale={[1.05, 1.55]}
          tint="#989163"
        />

        {/* Xe tăng chủ lực 60 tấn chạy dọc lòng đường thung lũng, phơi bày toàn bộ mặt nóc */}
        <group position={[tankX, 0, 0]}>
          <MBT
            travel={travel}
            turretYaw={turretYaw}
            gunElev={gunElev}
            citvYaw={citvYaw}
            aps={false}
          />

          {/* Vòng khóa mục tiêu chiến thuật phát sáng đỏ trên mặt nóc tháp pháo mỏng */}
          {lockAlpha > 0.01 && (
            <group position={[0.15, 2.55, 0]} rotation={[0, t * 0.65, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.55, 1.74, 48]} />
                <meshBasicMaterial
                  color="#ff493b"
                  transparent
                  opacity={0.85 * lockAlpha}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.63, 32]} />
                <meshBasicMaterial
                  color="#ff9d7a"
                  transparent
                  opacity={0.75 * lockAlpha}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
              {[0, 1, 2, 3].map((k) => {
                const ang = (k * Math.PI) / 2;
                return (
                  <mesh
                    key={k}
                    position={[Math.cos(ang) * 1.92, 0.02, Math.sin(ang) * 1.92]}
                    rotation={[-Math.PI / 2, 0, -ang]}
                  >
                    <planeGeometry args={[0.65, 0.16]} />
                    <meshBasicMaterial
                      color="#ff493b"
                      transparent
                      opacity={0.9 * lockAlpha}
                      side={THREE.DoubleSide}
                      toneMapped={false}
                    />
                  </mesh>
                );
              })}
            </group>
          )}
        </group>

        {/* Bụi cuốn vàng ấm sau hai dải xích xe tăng */}
        <DustTrail
          t={t}
          from={7.5}
          to={21.6}
          path={(bt) => [tankXAt(bt) - 3.6, 0, -1.48]}
          rate={9}
          size={1.95}
          color="#cdb78e"
          life={3.0}
        />
        <DustTrail
          t={t}
          from={7.5}
          to={21.6}
          path={(bt) => [tankXAt(bt) - 3.6, 0, 1.48]}
          rate={9}
          size={1.95}
          color="#cdb78e"
          life={3.0}
        />

        {/* Mối đe dọa 1 (15.06s): Chớp khói phóng & đạn chống tăng vác vai lao vút xuống từ gờ đồi bên trái */}
        <MuzzleBlast
          t={t}
          at={CUE.s03_atgm_threat}
          pos={AMBUSH_POS}
          dir={launchDir}
          size={2.35}
          seed={14}
        />
        {atgmLaunched && (
          <>
            {/* Đường ngắm đạn đạo khóa thẳng vào vòng đỏ trên nóc tháp pháo */}
            <Trail
              points={atgmTrailPts}
              upto={1}
              color="#ff493b"
              width={0.04}
              opacity={0.34}
              glow
            />
            {/* Vệt lửa động cơ rực sáng của quả đạn chống tăng vác vai */}
            <Trail
              points={atgmTrailPts}
              upto={atgmProg}
              color="#ff6a2b"
              width={0.16}
              opacity={0.94}
              glow
            />
            <Trail
              points={atgmTrailPts}
              upto={atgmProg}
              color="#ffe29a"
              width={0.06}
              opacity={0.96}
              glow
            />
            <group position={missilePos} rotation={missileRot} scale={1.32}>
              <TopAttackMissile
                finDeploy={prog(t, CUE.s03_atgm_threat, CUE.s03_atgm_threat + 0.25)}
                thrust={1}
              />
            </group>
          </>
        )}

        {/* Mối đe dọa 2 (16.98s): FPV Drone mang đạn nổ lõm PG-7V lướt sát tiền cảnh, khống chế MBT bên dưới */}
        {droneVisible && (
          <>
            <pointLight
              position={droneFillLightPos}
              color="#ffe6c4"
              intensity={3.4}
              distance={3.5}
              decay={1.8}
            />
            <group position={dronePos} rotation={droneRot}>
              <FPVDrone rotorSpin={t * 48} cameraPitch={-0.32} />
            </group>
          </>
        )}
      </Stage>

      {/* Nhãn giá thành duy nhất cạnh chiếc FPVDrone */}
      <Label
        t={t}
        text="~$500"
        x={1465}
        y={175}
        from={CUE.s03_cost_hundreds}
        until={20.75}
        bg="#ff493b"
        fg="#ffffff"
      />
    </AbsoluteFill>
  );
};

export default S03;
