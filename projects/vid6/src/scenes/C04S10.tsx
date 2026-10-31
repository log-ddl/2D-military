import React, { useMemo } from 'react';
import * as THREE from 'three';
import { lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { softDot } from '@skill/military/3d/fx';
import { extrude, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { PAINT_PRESETS, PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { PowerpackChassis3D } from '../parts/PowerpackChassis3D';
import { TurretInterior3D } from '../parts/TurretInterior3D';

const Z_CUTAWAY = 2.2;
const Z_FULL_TANK = -3.4;
const SPEED_40_MPH = 17.88; // 40 mph = 17.88 m/s

const STRIPE_PERIOD = 4.0;
const STRIPE_COUNT = 22;
const GANTRY_PERIOD = 10.0;
const GANTRY_COUNT = 10;

/**
 * Cầu nối cơ khí cắt bổ 1:1 giữa vành cổ thân dưới (PowerpackChassis3D) và vành ổ bi tháp pháo (TurretInterior3D tại y = 0.58 -> vành y = 1.43 m).
 * Chỉ dựng ở sườn trái (-Z) và hai đầu vách ngăn trước/sau để giữ mặt cắt bên phải (+Z) mở thoáng 100% cho camera.
 */
const HullTurretCollarBridge: React.FC = () => {
  const matHull = useMemo(
    () =>
      paint({
        ...PAINT_PRESETS.abramsDesert,
        camo: [...PAINT_PRESETS.abramsDesert.camo],
        seed: 17,
      }),
    [],
  );
  const matSteel = useMemo(() => plain('#4e5b68', 0.44, 0.72), []);
  const matCut = useMemo(() => plain('#c43b29', 0.48, 0.35), []);

  const leftSponsonGeo = useMemo(() => {
    const pts: P2[] = [
      [-1.36, 0.785],
      [1.72, 0.785],
      [1.72, 1.385],
      [-1.36, 1.385],
    ];
    return extrude(pts, 0.14, 0.012);
  }, []);

  return (
    <group>
      <mesh position={[0, 0, -1.03]} geometry={leftSponsonGeo} material={matHull} castShadow receiveShadow />
      <mesh position={[0.18, 1.05, -1.36]} geometry={rbox(4.65, 0.055, 0.62, 0.012)} material={matHull} castShadow receiveShadow />
      <mesh position={[0.18, 1.385, -1.16]} geometry={rbox(2.85, 0.05, 0.36, 0.01)} material={matHull} castShadow />

      <mesh position={[1.48, 1.315, -0.36]} geometry={rbox(0.46, 0.14, 1.28, 0.015)} material={matSteel} castShadow />
      <mesh position={[1.48, 1.315, 0.285]} geometry={rbox(0.45, 0.135, 0.02, 0.004)} material={matCut} />

      <mesh position={[-1.22, 1.17, -0.82]} geometry={rbox(0.32, 0.42, 0.44, 0.012)} material={matSteel} castShadow />
      <mesh position={[-1.22, 1.17, -0.595]} geometry={rbox(0.31, 0.41, 0.02, 0.004)} material={matCut} />

      <group position={[0.14, 1.385, 0]} rotation={[Math.PI / 2, 0, (115 * Math.PI) / 180]}>
        <mesh material={matSteel} castShadow>
          <torusGeometry args={[1.15, 0.044, 12, 32, (150 * Math.PI) / 180]} />
        </mesh>
      </group>
    </group>
  );
};

/** Đại sảnh cơ khí tối với hai làn đường băng thử nghiệm 40 mph chuyển động đồng tốc với xích xe */
const HighSpeedMechanicalBay: React.FC<{ travel: number }> = ({ travel }) => {
  const matFloor = useMemo(() => plain('#18202a', 0.68, 0.38), []);
  const matLane = useMemo(() => plain('#202b38', 0.58, 0.44), []);
  const matJoint = useMemo(() => plain('#344558', 0.48, 0.62), []);
  const matGantry = useMemo(() => plain('#16202b', 0.54, 0.68), []);
  const matAmberDash = useMemo(
    () =>
      plain('#ffaa2b', 0.25, 0.2, {
        emissive: new THREE.Color(PAL.amber),
        emissiveIntensity: 0.95,
      }),
    [],
  );
  const matCyanDash = useMemo(
    () =>
      plain('#29e3d4', 0.22, 0.3, {
        emissive: new THREE.Color(PAL.cyan),
        emissiveIntensity: 0.95,
      }),
    [],
  );
  const matBayLight = useMemo(
    () =>
      plain('#dceeff', 0.18, 0.2, {
        emissive: new THREE.Color('#9ec9f5'),
        emissiveIntensity: 1.45,
      }),
    [],
  );

  const stripeShift = ((travel % STRIPE_PERIOD) + STRIPE_PERIOD) % STRIPE_PERIOD;
  const gantryShift = ((travel % GANTRY_PERIOD) + GANTRY_PERIOD) % GANTRY_PERIOD;

  return (
    <group>
      <mesh position={[0, -0.004, -0.5]} rotation={[-Math.PI / 2, 0, 0]} material={matFloor} receiveShadow>
        <planeGeometry args={[120, 44]} />
      </mesh>

      {[Z_FULL_TANK, Z_CUTAWAY].map((zLane, idx) => (
        <mesh key={idx} position={[0, 0.001, zLane]} rotation={[-Math.PI / 2, 0, 0]} material={matLane} receiveShadow>
          <planeGeometry args={[100, 4.35]} />
        </mesh>
      ))}

      {Array.from({ length: STRIPE_COUNT }, (_, i) => {
        const x = (i - STRIPE_COUNT / 2) * STRIPE_PERIOD - stripeShift;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, 0.003, -0.6]} rotation={[-Math.PI / 2, 0, 0]} material={matJoint}>
              <planeGeometry args={[0.09, 22]} />
            </mesh>
            <mesh position={[0, 0.006, -0.6]} rotation={[-Math.PI / 2, 0, 0]} material={matAmberDash}>
              <planeGeometry args={[1.85, 0.16]} />
            </mesh>
            <mesh position={[0, 0.006, 4.48]} rotation={[-Math.PI / 2, 0, 0]} material={matCyanDash}>
              <planeGeometry args={[1.45, 0.11]} />
            </mesh>
            <mesh position={[0, 0.006, -5.68]} rotation={[-Math.PI / 2, 0, 0]} material={matAmberDash}>
              <planeGeometry args={[1.45, 0.11]} />
            </mesh>
          </group>
        );
      })}

      {Array.from({ length: GANTRY_COUNT }, (_, i) => {
        const gx = (i - GANTRY_COUNT / 2) * GANTRY_PERIOD - gantryShift;
        return (
          <group key={i} position={[gx, 0, 0]}>
            <mesh position={[0, 4.2, -10.4]} geometry={rbox(0.46, 8.4, 0.56, 0.03)} material={matGantry} />
            <mesh position={[0, 8.1, -2.5]} geometry={rbox(0.42, 0.45, 16.5, 0.03)} material={matGantry} />
            <mesh position={[0, 7.84, -3.4]} geometry={rbox(0.24, 0.05, 2.2, 0.01)} material={matBayLight} />
            <mesh position={[0, 7.84, 2.2]} geometry={rbox(0.24, 0.05, 2.2, 0.01)} material={matBayLight} />
          </group>
        );
      })}
    </group>
  );
};

/** Luồng hơi áp suất hổ phách thoát an toàn thẳng đứng lên trời khi 2 nắp blowout mở ở CUE.c04_s10_knee */
const SafeBlowoutVentGlow: React.FC<{ open: number; pos: V3 }> = ({ open, pos }) => {
  const spriteMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#ff9d2e',
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  if (open <= 0.02) return null;

  return (
    <group position={pos}>
      <pointLight position={[0, 0.55, 0]} color="#ff921c" intensity={open * 11} distance={3.8} decay={1.7} />
      {[0, 1, 2].map((i) => {
        const m = spriteMat.clone();
        m.opacity = open * (0.46 - i * 0.11);
        return (
          <sprite
            key={i}
            material={m}
            position={[-0.08 * i, 0.32 + i * 0.42 * open, (i - 1) * 0.26]}
            scale={[0.9 + i * 0.35, 1.15 + i * 0.45, 1]}
          />
        );
      })}
    </group>
  );
};

const C04S10: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const dt = Math.max(0, t - 645.5);
  const travel = dt * SPEED_40_MPH;

  // Rung động gầm xe khi lao 40 mph trên mặt đường thử — nổi bật rõ ở đoạn gương ổn định (651.2..655.0s)
  const mirrorFocus = prog(t, 651.2, 652.4) * (1 - 0.55 * prog(t, 654.5, 655.6));
  const bumpAmp = 0.45 + 0.55 * mirrorFocus;
  const roadWave = (Math.sin(dt * 11.4) * 0.6 + Math.sin(dt * 18.2) * 0.35) * bumpAmp;
  const rollWave = Math.cos(dt * 14.3) * 0.45 * bumpAmp;

  const vibPitch = roadWave * 0.017;
  const vibRoll = rollWave * 0.014;

  // Kỳ tích 1: Tấm gương nhỏ trong hộp GPS nghiêng bù ngược dao động 2 trục giữ tia ngắm cyan phẳng tuyệt đối ở 40 mph
  const mirrorTilt: [number, number] = [-vibPitch * 7.2, -vibRoll * 7.0];
  const mirrorBeamStrength = prog(t, 651.0, CUE.c04_s10_mirrors) * (1 - 0.65 * prog(t, 654.6, 655.8));

  // Kỳ tích 2: Công tắc đầu gối lính nạp đạn + cửa chống nổ trượt khép + 2 nắp blowout mở xả áp an toàn (CUE.c04_s10_knee @ 656.68)
  const kneeApproach = prog(t, 654.2, CUE.c04_s10_knee);
  const loaderPhase = lerp(0.18, 0.58, kneeApproach);
  const blastDoorOpen = lerp(0.65, 0.05, prog(t, 654.8, CUE.c04_s10_knee));
  const blowoutOpen =
    lerp(0, 0.85, prog(t, 654.9, CUE.c04_s10_knee + 0.25)) *
    (1 - 0.35 * prog(t, 658.4, 660.2));

  // Kỳ tích 3: Động cơ tuabin phản lực AGT1500 quay tít & rực lửa 930°F trong 73 tấn thép pha Uranium (CUE.c04_s10_turbine @ 658.64)
  const turbineSpin = dt * 36;
  const exhaustGlow = lerp(0.78, 0.88, prog(t, 657.2, CUE.c04_s10_turbine + 0.3));

  // Tia laser quang học cyan mảnh sắc gọn để thấy rõ mặt gương phẳng bên trong vòng gimbal
  const matLaserCore = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#b8fffa',
        transparent: true,
        opacity: 0.42 + mirrorBeamStrength * 0.52,
        toneMapped: false,
      }),
    [mirrorBeamStrength],
  );
  const matLaserHalo = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PAL.cyan,
        transparent: true,
        opacity: 0.14 + mirrorBeamStrength * 0.24,
        toneMapped: false,
      }),
    [mirrorBeamStrength],
  );

  // Quỹ đạo <Cam> trượt dọc sườn cắt bổ (+Z) khớp chuẩn 4 nhịp:
  // - Nhịp 0 (645.7..651.2): Đại cảnh song hành M1A2Abrams & tổ hợp cắt bổ 1:1 ở 40 mph (<Label "M1A2 ABRAMS">)
  // - Nhịp 1 (651.2..654.2): Cận cảnh hộp quang học GPS có gương ổn định 2 trục phản chiếu tia cyan phẳng (CUE.c04_s10_mirrors @ 653.08)
  // - Nhịp 2 (654.2..657.3): Soi xuyên đúng hành lang thoáng giữa pháo thủ & trưởng xe (tránh hoàn toàn khối khoá nòng!) thấy trọn công tắc đầu gối vàng-đen, cửa chống nổ & nắp blowout mở (CUE.c04_s10_knee @ 656.68)
  // - Nhịp 3 (657.3..662.0): Hạ thấp xuống tầm máy AGT1500 nhìn thẳng vào cánh nén titanium đang quay + buồng đốt + luồng xả 930°F (CUE.c04_s10_turbine @ 658.64) rồi kéo mở khung kết
  const pMirrors = prog(t, 651.1, 652.2);
  const pKnee = prog(t, 654.15, 655.2);
  const pTurbine = prog(t, 657.25, 658.35);
  const pWideOut = prog(t, 660.0, 661.9);

  const openDrift = prog(t, 645.7, 651.1);
  const basePosX = lerp(8.3, 6.1, openDrift);
  const basePosY = lerp(2.74, 2.46, openDrift);
  const basePosZ = lerp(7.7, 6.75, openDrift);

  const camX =
    basePosX +
    (2.54 - basePosX) * pMirrors +
    (0.86 - 2.54) * pKnee +
    (-0.95 - 0.86) * pTurbine +
    (-4.15 - -0.95) * pWideOut;

  const camY =
    basePosY +
    (2.5 - basePosY) * pMirrors +
    (2.56 - 2.5) * pKnee +
    (1.22 - 2.56) * pTurbine +
    (1.74 - 1.22) * pWideOut;

  const camZ =
    basePosZ +
    (4.65 - basePosZ) * pMirrors +
    (6.18 - 4.65) * pKnee +
    (5.38 - 6.18) * pTurbine +
    (5.85 - 5.38) * pWideOut;

  const baseLookX = lerp(0.1, 0.42, openDrift);
  const baseLookY = lerp(1.32, 1.42, openDrift);
  const baseLookZ = lerp(-0.35, 0.45, openDrift);

  const lookX =
    baseLookX +
    (1.15 - baseLookX) * pMirrors +
    (-0.88 - 1.15) * pKnee +
    (-2.35 - -0.88) * pTurbine +
    (-1.15 - -2.35) * pWideOut;

  const lookY =
    baseLookY +
    (2.22 - baseLookY) * pMirrors +
    (1.9 - 2.22) * pKnee +
    (0.88 - 1.9) * pTurbine +
    (1.24 - 0.88) * pWideOut;

  const lookZ =
    baseLookZ +
    (2.74 - baseLookZ) * pMirrors +
    (1.72 - 2.74) * pKnee +
    (2.05 - 1.72) * pTurbine +
    (0.55 - 2.05) * pWideOut;

  const camFov =
    39 +
    (34 - 39) * pMirrors +
    (40 - 34) * pKnee +
    (38 - 40) * pTurbine +
    (39 - 38) * pWideOut;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage {...LOOK_INTERIOR_BAY.stage} shadowArea={28} shadowCenter={[0, 1.0, -0.4]}>
        <Cam pos={[camX, camY, camZ]} look={[lookX, lookY, lookZ]} fov={camFov} />

        {/* Đại sảnh cơ khí tối & hai làn đường băng 40 mph */}
        <HighSpeedMechanicalBay travel={travel} />

        {/* LÀN BÊN TRÁI (z = -3.4): CHIẾC M1A2 ABRAMS HOÀN CHỈNH LAO SONG HÀNH Ở 40 MPH */}
        <M1A2Abrams
          variant="m1a2"
          camo="desert"
          travel={travel}
          hullPitch={vibPitch * 0.9}
          hullRoll={vibRoll * 0.85}
          gunPitch={-vibPitch * 0.9}
          citvYaw={Math.sin(dt * 0.8) * 0.25}
          exhaustHeat={0.78}
          position={[0, 0.002, Z_FULL_TANK]}
        />

        {/* LÀN BÊN PHẢI (z = +2.2): TỔ HỢP CẮT BỔ CƠ KHÍ 1:1 HOÀN CHỈNH (PowerpackChassis3D + TurretInterior3D khớp chuẩn vành tháp) */}
        <group position={[0, 0.002, Z_CUTAWAY]}>
          <PowerpackChassis3D
            mode="full"
            leftTravel={travel}
            rightTravel={travel}
            wheelDrop={roadWave * 0.58}
            steerAngle={Math.sin(dt * 1.4) * 0.06}
            throttleTwist={0.82}
            turbineSpin={turbineSpin}
            exhaustGlow={exhaustGlow}
          />

          <group position={[0, 0.65, 0]} rotation={[vibRoll, 0, vibPitch]}>
            <group position={[0, -0.65, 0]}>
              <HullTurretCollarBridge />
              <TurretInterior3D
                position={[0.08, 0.58, 0]}
                showCrew={true}
                mirrorTilt={mirrorTilt}
                gunPitch={-vibPitch}
                cadillacTurn={Math.sin(dt * 1.8) * 0.14}
                loaderPhase={loaderPhase}
                blastDoorOpen={blastDoorOpen}
                blowoutOpen={blowoutOpen}
              />
            </group>
          </group>

          {/* Ánh sáng điểm nhấn kỹ thuật dịu nét chiếu rõ gương GPS, công tắc đầu gối vàng-đen và cánh nén titanium AGT1500 */}
          <pointLight position={[1.4, 2.52, 1.25]} color="#9efcf2" intensity={4.2} distance={3.6} decay={1.6} />
          <pointLight position={[-0.1, 1.35, -0.55]} color="#ffeaad" intensity={4.6} distance={2.2} decay={1.5} />
          <pointLight position={[-1.72, 0.92, 0.95]} color="#d8ecff" intensity={4.5} distance={2.8} decay={1.5} />
          <pointLight position={[-2.35, 0.95, 1.35]} color="#ffb45e" intensity={6.5} distance={4.5} decay={1.5} />

          {/* Luồng xả áp an toàn hướng thẳng lên trời khi 2 nắp blowout mở ở CUE.c04_s10_knee */}
          <SafeBlowoutVentGlow open={blowoutOpen} pos={[-1.7, 2.42, 0]} />
        </group>

        {/* TIA QUANG HỌC CYAN MẢNH SẮC PHẢN CHIẾU TỪ GƯƠNG GPS GIỮ PHẲNG TUYỆT ĐỐI Ở 40 MPH */}
        <group position={[1.17, 2.31, Z_CUTAWAY + 0.68]}>
          <mesh position={[4.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matLaserCore}>
            <cylinderGeometry args={[0.0055, 0.0055, 9.2, 10]} />
          </mesh>
          <mesh
            position={[4.6, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={matLaserHalo}
            scale={[1 + mirrorBeamStrength * 0.55, 1, 1 + mirrorBeamStrength * 0.55]}
          >
            <cylinderGeometry args={[0.016, 0.016, 9.2, 12]} />
          </mesh>
          <mesh position={[-0.01, -0.21, 0]} material={matLaserCore}>
            <cylinderGeometry args={[0.005, 0.005, 0.42, 10]} />
          </mesh>
          <mesh position={[0, 0, 0]} material={matLaserCore}>
            <sphereGeometry args={[0.016 + mirrorBeamStrength * 0.008, 12, 12]} />
          </mesh>
        </group>
      </Stage>

      {/* Đúng 1 <Label> duy nhất ở đầu cảnh */}
      <Label
        t={t}
        text="M1A2 ABRAMS"
        x={W * 0.5}
        y={H * 0.14}
        from={CUE.c04_s10_abrams}
        until={651.5}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C04S10;
