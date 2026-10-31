import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { turntable } from '@skill/military/3d/turntable';

export type FpvDrone3DProps = {
  rotorSpin?: number;
  pitch?: number;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

// Khung thân trung tâm carbon fiber (mặt bằng X-Z)
const BODY_PLATE_PTS: P2[] = [
  [0.114, -0.016],
  [0.114, 0.016],
  [0.076, 0.034],
  [-0.074, 0.034],
  [-0.106, 0.021],
  [-0.106, -0.021],
  [-0.074, -0.034],
  [0.076, -0.034],
];

const TOP_PLATE_PTS: P2[] = [
  [0.096, -0.015],
  [0.096, 0.015],
  [0.064, 0.028],
  [-0.072, 0.028],
  [-0.100, 0.017],
  [-0.100, -0.017],
  [-0.072, -0.028],
  [0.064, -0.028],
];

// Một tay đòn chuẩn dọc trục +X (dài tới tâm mô-tơ L = hypot(0.145, 0.150) = 0.20863 m), đối xứng tuyệt đối không tự cắt
const ARM_LEN = Math.hypot(0.145, 0.150);
function makeCanonicalArmPts(): P2[] {
  const padR = 0.0215;
  const pts: P2[] = [
    [0.014, 0.017],
    [0.065, 0.014],
    [ARM_LEN - 0.024, 0.011],
  ];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * 0.58 - (i / 14) * Math.PI * 1.16;
    pts.push([ARM_LEN + Math.cos(a) * padR, Math.sin(a) * padR]);
  }
  pts.push(
    [ARM_LEN - 0.024, -0.011],
    [0.065, -0.014],
    [0.014, -0.017],
  );
  return pts;
}

// Má gắn camera FPV cắt CNC ở mũi khung (mặt cắt X-Y)
const CAM_PLATE_SIDE: P2[] = [
  [0.088, -0.014],
  [0.124, -0.011],
  [0.128, 0.015],
  [0.114, 0.023],
  [0.088, 0.019],
];

// Lá cánh quạt 10-inch khí động học (gốc -> mút R = 0.125 m)
const BLADE_PTS: P2[] = [
  [0.008, -0.0048],
  [0.024, -0.0102],
  [0.052, -0.0132],
  [0.084, -0.0116],
  [0.110, -0.0076],
  [0.124, -0.0032],
  [0.126, 0.0016],
  [0.114, 0.0072],
  [0.086, 0.0102],
  [0.050, 0.0104],
  [0.022, 0.0072],
  [0.008, 0.0038],
];

// Biên dạng đầu đạn lõm chống tăng PG-7VL (tổng dài ~0.52 m từ x = -0.250 tới +0.270, bầu lớn d = 0.093 m -> r = 0.0465 m)
const PG7VL_BODY_PROFILE: P2[] = [
  [0.001, -0.228],
  [0.0205, -0.228],
  [0.0205, -0.098],
  [0.0222, -0.082],
  [0.0265, -0.062],
  [0.0320, -0.040],
  [0.0378, -0.016],
  [0.0428, 0.008],
  [0.0458, 0.026],
  [0.0465, 0.036],
  [0.0465, 0.052],
  [0.0446, 0.056],
  [0.0465, 0.060],
  [0.0465, 0.078],
  [0.0450, 0.095],
  [0.0418, 0.116],
  [0.0372, 0.140],
  [0.0318, 0.165],
  [0.0258, 0.190],
  [0.0202, 0.213],
  [0.0158, 0.232],
  [0.001, 0.232],
];

const PG7VL_NOSE_FUZE_PROFILE: P2[] = [
  [0.001, 0.231],
  [0.0162, 0.231],
  [0.0162, 0.242],
  [0.0138, 0.246],
  [0.0138, 0.258],
  [0.0108, 0.262],
  [0.0102, 0.270],
  [0.001, 0.270],
];

const PG7VL_TAIL_COLLAR_PROFILE: P2[] = [
  [0.001, -0.250],
  [0.0178, -0.250],
  [0.0198, -0.246],
  [0.0198, -0.239],
  [0.0224, -0.236],
  [0.0224, -0.227],
  [0.001, -0.227],
];

// Vạch sơn vàng ký hiệu thuốc nổ mạnh quanh bụng bầu 93mm
const PG7VL_BAND_PROFILE: P2[] = [
  [0.0466, 0.036],
  [0.0469, 0.037],
  [0.0469, 0.046],
  [0.0466, 0.047],
];

// Chuông mô-tơ không chổi than 3115 (hở chân để lộ cuộn dây đồng bên trong)
const MOTOR_BELL_PROFILE: P2[] = [
  [0.0178, 0.0055],
  [0.0184, 0.0065],
  [0.0184, 0.0132],
  [0.0160, 0.0152],
  [0.0058, 0.0156],
  [0.0032, 0.0158],
  [0.0032, 0.0242],
  [0.0005, 0.0242],
];

// Đầu nấm tròn ăng-ten VTX Lollipop
const VTX_HEAD_PROFILE: P2[] = [
  [0.0038, 0.000],
  [0.0078, 0.004],
  [0.0136, 0.009],
  [0.0156, 0.015],
  [0.0148, 0.021],
  [0.0108, 0.0255],
  [0.0048, 0.0278],
  [0.0005, 0.0285],
];

// Gối đỡ chữ V in 3D kẹp đầu đạn dưới bụng khung
const CRADLE_PTS: P2[] = [
  [-0.032, 0.000],
  [0.032, 0.000],
  [0.036, -0.028],
  [0.024, -0.028],
  [0.016, -0.014],
  [-0.016, -0.014],
  [-0.024, -0.028],
  [-0.036, -0.028],
];

const MOTORS: { x: number; z: number; dir: 1 | -1; phase: number }[] = [
  { x: 0.145, z: -0.150, dir: 1, phase: 0.25 },
  { x: 0.145, z: 0.150, dir: -1, phase: 1.2 },
  { x: -0.145, z: -0.150, dir: -1, phase: 0.75 },
  { x: -0.145, z: 0.150, dir: 1, phase: 1.9 },
];

export const FpvDrone3D: React.FC<FpvDrone3DProps> = ({
  rotorSpin = 0,
  pitch = 0,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const geos = useMemo(() => {
    const bottomPlate = extrudeTop(BODY_PLATE_PTS, 0.0045, 0.0008);
    const topPlate = extrudeTop(TOP_PLATE_PTS, 0.0038, 0.0007);
    const canonicalArm = extrudeTop(makeCanonicalArmPts(), 0.0062, 0.0009);
    const camSidePlate = extrude(CAM_PLATE_SIDE, 0.0026, 0.0004);
    const blade = extrudeTop(BLADE_PTS, 0.0018, 0.0003);

    const motorBell = lathe(MOTOR_BELL_PROFILE, 28).clone();
    motorBell.rotateZ(Math.PI / 2);

    const vtxHead = lathe(VTX_HEAD_PROFILE, 24).clone();
    vtxHead.rotateZ(Math.PI / 2);

    const warheadBody = lathe(PG7VL_BODY_PROFILE, 36);
    const warheadNose = lathe(PG7VL_NOSE_FUZE_PROFILE, 24);
    const warheadTail = lathe(PG7VL_TAIL_COLLAR_PROFILE, 24);
    const warheadBand = lathe(PG7VL_BAND_PROFILE, 36);

    const cradle = extrude(CRADLE_PTS, 0.018, 0.0015).clone();
    cradle.rotateY(Math.PI / 2);

    const vtxStem = pipe(
      [
        [-0.088, 0.019, 0],
        [-0.125, 0.044, 0],
        [-0.156, 0.085, 0],
        [-0.176, 0.128, 0],
      ],
      0.0035,
      24,
    );

    const wireRed = pipe(
      [
        [-0.084, 0.042, 0.016],
        [-0.106, 0.036, 0.024],
        [-0.102, 0.016, 0.022],
        [-0.052, 0.002, 0.016],
      ],
      0.0028,
      20,
    );
    const wireBlack = pipe(
      [
        [-0.084, 0.042, 0.008],
        [-0.108, 0.033, 0.014],
        [-0.104, 0.014, 0.012],
        [-0.052, 0.002, 0.008],
      ],
      0.0028,
      20,
    );

    // Vòng dây đồng kích nổ tự chế đặc trưng chiến trường Ukraine ở mũi đầu đạn (y = -0.068)
    const wy = -0.068;
    const copperProbePts: [number, number, number][] = [
      [0.268, wy, 0],
      [0.315, wy, 0],
      [0.354, wy, 0],
    ];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      copperProbePts.push([0.356, wy + Math.sin(a) * 0.011, Math.cos(a) * 0.011]);
    }
    const copperInnerProbe = pipe(copperProbePts, 0.0022, 40);

    const copperOuterPts: [number, number, number][] = [
      [0.244, wy + 0.004, 0.016],
      [0.292, wy + 0.010, 0.028],
      [0.336, wy + 0.002, 0.035],
    ];
    const turns = 1.9;
    const steps = 48;
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const a = f * Math.PI * 2 * turns;
      const rx = 0.336 + f * 0.026;
      const rad = 0.0355 - f * 0.0025;
      copperOuterPts.push([rx, wy + Math.sin(a) * rad, Math.cos(a) * rad]);
    }
    const copperOuterLoop = pipe(copperOuterPts, 0.0025, 64);

    const copperLeftStrut = pipe(
      [
        [0.244, wy - 0.004, -0.016],
        [0.294, wy - 0.008, -0.028],
        [0.344, wy - 0.002, -0.0345],
      ],
      0.0022,
      16,
    );

    const detWireFront = pipe(
      [
        [0.242, wy + 0.015, 0.006],
        [0.165, wy + 0.034, 0.012],
        [0.068, wy + 0.050, 0.015],
        [0.022, -0.004, 0.012],
      ],
      0.0017,
      24,
    );
    const detWireRear = pipe(
      [
        [-0.238, wy + 0.020, -0.005],
        [-0.145, wy + 0.024, -0.010],
        [-0.068, wy + 0.036, -0.012],
        [-0.025, -0.004, -0.010],
      ],
      0.0017,
      24,
    );

    return {
      bottomPlate,
      topPlate,
      canonicalArm,
      camSidePlate,
      blade,
      motorBell,
      vtxHead,
      vtxStem,
      warheadBody,
      warheadNose,
      warheadTail,
      warheadBand,
      cradle,
      wireRed,
      wireBlack,
      copperInnerProbe,
      copperOuterLoop,
      copperLeftStrut,
      detWireFront,
      detWireRear,
    };
  }, []);

  const matCarbon = plain('#23272e', 0.45, 0.4);
  const matCarbonDark = plain('#171a1f', 0.52, 0.35);
  const matMotorBlack = plain('#191d23', 0.34, 0.72);
  const matCopperCoil = plain('#d47a34', 0.28, 0.88);
  const matCopperWire = plain('#eb893f', 0.2, 0.9);
  const matAluminum = plain('#c2cbd4', 0.28, 0.85);
  const matSteelClamp = plain('#9ea8b2', 0.34, 0.8);
  const matStandoff = plain('#c23028', 0.36, 0.72);
  const matBlade = plain('#343e4a', 0.26, 0.28);
  const matBlurDisc = plain('#3a4552', 0.4, 0.1, {
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const matBlurRing = plain('#475361', 0.4, 0.1, {
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const matLipoBlue = plain('#1c64bd', 0.36, 0.12);
  const matLipoCap = plain('#16191e', 0.66, 0.08);
  const matStrapOrange = plain('#ee6a1e', 0.6, 0.05);
  const matYellowXt60 = plain('#eab824', 0.4, 0.06);
  const matRedWire = plain('#d62e2e', 0.52, 0.05);
  const matBlueTape = plain('#1d58ad', 0.5, 0.06);
  const matVtxCap = plain('#c73828', 0.38, 0.15);
  const matPcb = plain('#1c3f30', 0.48, 0.3);
  const matLens = plain('#16607d', 0.08, 0.94);
  const matOrdnanceYellow = plain('#d9ab34', 0.5, 0.16);
  const matPg7Olive = paint({
    color: '#5a6a44',
    camo: ['#4b5937', '#6c7c53'],
    camoScale: 1.5,
    wear: 0.2,
    dirt: 0.22,
    roughness: 0.54,
    metalness: 0.26,
    repeat: 1,
    seed: 11,
  });

  const wy = -0.068;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group rotation={[0, 0, pitch]}>
        {/* ==================== 1. KHUNG SỢI CARBON CHỮ X 4 TAY ĐÒN ==================== */}
        <mesh geometry={geos.bottomPlate} position={[0, -0.015, 0]} material={matCarbon} castShadow receiveShadow />
        <mesh geometry={geos.topPlate} position={[0, 0.017, 0]} material={matCarbon} castShadow receiveShadow />
        <mesh position={[0, -0.005, 0]} geometry={rbox(0.088, 0.0032, 0.064, 0.001)} material={matCarbonDark} castShadow />

        {/* 4 tay đòn carbon chữ X xoay chuẩn theo góc phương vị từng mô-tơ + bó dây pha & chân đệm TPU */}
        {MOTORS.map((m, idx) => {
          const armYaw = Math.atan2(-m.z, m.x);
          return (
            <group key={idx} rotation={[0, armYaw, 0]}>
              <mesh geometry={geos.canonicalArm} position={[0, -0.0112, 0]} material={matCarbon} castShadow receiveShadow />
              {/* Dây pha mô-tơ chạy dọc lưng tay đòn + 2 đai rút đen cố định */}
              <mesh position={[0.105, -0.0042, 0]} geometry={rbox(0.135, 0.0024, 0.0075, 0.0008)} material={matLipoCap} />
              <mesh position={[0.082, -0.008, 0]} geometry={rbox(0.006, 0.0095, 0.029, 0.0012)} material={matLipoCap} />
              <mesh position={[0.145, -0.008, 0]} geometry={rbox(0.006, 0.0095, 0.025, 0.0012)} material={matLipoCap} />
              {/* Đệm chống va đập TPU dưới chân mô-tơ */}
              <mesh position={[ARM_LEN, -0.014, 0]} material={matCarbonDark}>
                <cylinderGeometry args={[0.016, 0.013, 0.007, 16]} />
              </mesh>
            </group>
          );
        })}

        {/* 8 trụ nhôm anod đỏ nối 2 tầng bản mạch khung */}
        {[
          [-0.086, -0.022],
          [-0.086, 0.022],
          [-0.032, -0.024],
          [-0.032, 0.024],
          [0.032, -0.024],
          [0.032, 0.024],
          [0.082, -0.015],
          [0.082, 0.015],
        ].map(([sx, sz], i) => (
          <mesh key={i} position={[sx, 0.003, sz]} material={matStandoff} castShadow>
            <cylinderGeometry args={[0.0028, 0.0028, 0.030, 10]} />
          </mesh>
        ))}

        {/* Stack điện tử ESC 4-in-1 + Flight Controller + tụ lọc nguồn + VTX tản nhiệt nhôm */}
        <mesh position={[0, -0.005, 0]} geometry={rbox(0.044, 0.0032, 0.044, 0.001)} material={matPcb} />
        <mesh position={[0, 0.005, 0]} geometry={rbox(0.038, 0.003, 0.038, 0.001)} material={matPcb} />
        <mesh position={[0, 0.0076, 0]} geometry={rbox(0.014, 0.0025, 0.014, 0.0005)} material={matCarbonDark} />
        <mesh position={[-0.033, -0.002, 0]} rotation={[Math.PI / 2, 0, 0]} material={matCarbonDark}>
          <cylinderGeometry args={[0.0055, 0.0055, 0.018, 14]} />
        </mesh>
        <mesh position={[-0.068, 0.003, 0]} geometry={rbox(0.032, 0.009, 0.030, 0.0015)} material={matSteelClamp} />

        {/* ==================== 2. 4 MÔ-TƠ KHÔNG CHỔI THAN & CÁNH QUẠT 3 LÁ ==================== */}
        {MOTORS.map((m, idx) => {
          const spinAngle = m.dir * rotorSpin + m.phase;
          return (
            <group key={idx} position={[m.x, -0.005, m.z]}>
              {/* Đế bắt mô-tơ & cuộn dây đồng stator sáng ánh kim bên dưới chuông */}
              <mesh position={[0, 0.0015, 0]} material={matMotorBlack} castShadow>
                <cylinderGeometry args={[0.0165, 0.018, 0.003, 20]} />
              </mesh>
              <mesh position={[0, 0.007, 0]} material={matCopperCoil}>
                <cylinderGeometry args={[0.0156, 0.0156, 0.0095, 22]} />
              </mesh>

              {/* Chuông mô-tơ đen viền nhôm tiện CNC + ốc khoá M5 + 3 lá cánh quạt xoay theo rotorSpin */}
              <group rotation={[0, spinAngle, 0]}>
                <mesh geometry={geos.motorBell} material={matMotorBlack} castShadow />
                <mesh position={[0, 0.0148, 0]} material={matAluminum}>
                  <cylinderGeometry args={[0.0168, 0.0178, 0.0014, 24]} />
                </mesh>
                <mesh position={[0, 0.0225, 0]} material={matAluminum}>
                  <cylinderGeometry args={[0.0044, 0.0056, 0.0064, 6]} />
                </mesh>
                <mesh position={[0, 0.0172, 0]} material={matBlade} castShadow>
                  <cylinderGeometry args={[0.0108, 0.0108, 0.0055, 18]} />
                </mesh>
                {[0, 1, 2].map((b) => (
                  <group key={b} position={[0, 0.0168, 0]} rotation={[0, (b * Math.PI * 2) / 3, 0]}>
                    <mesh
                      geometry={geos.blade}
                      rotation={[m.dir * 0.25, 0, 0]}
                      material={matBlade}
                      castShadow
                    />
                    <mesh
                      position={[0.118, 0.0012, 0]}
                      rotation={[m.dir * 0.25, 0, 0]}
                      geometry={rbox(0.011, 0.002, 0.0085, 0.0004)}
                      material={matYellowXt60}
                    />
                  </group>
                ))}
              </group>

              {/* Đĩa mờ chuyển động mỏng khi quay nhanh */}
              <mesh position={[0, 0.0176, 0]} material={matBlurDisc}>
                <cylinderGeometry args={[0.125, 0.125, 0.0008, 40]} />
              </mesh>
              <mesh position={[0, 0.0182, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matBlurRing}>
                <ringGeometry args={[0.1175, 0.1255, 48]} />
              </mesh>
            </group>
          );
        })}

        {/* ==================== 3. PIN LIPO + ĐAI CAM + CAMERA FPV + ĂNG-TEN NẤM ==================== */}
        <group position={[-0.014, 0.043, 0]}>
          <mesh geometry={rbox(0.136, 0.044, 0.054, 0.005)} material={matLipoBlue} castShadow receiveShadow />
          <mesh position={[-0.058, 0, 0]} geometry={rbox(0.024, 0.045, 0.0555, 0.005)} material={matLipoCap} castShadow />
          <mesh position={[0.058, 0, 0]} geometry={rbox(0.024, 0.045, 0.0555, 0.005)} material={matLipoCap} castShadow />
          <mesh geometry={rbox(0.072, 0.022, 0.055, 0.001)} material={plain('#e8f0f7', 0.5, 0.05)} />
          <mesh position={[0, -0.007, 0]} geometry={rbox(0.072, 0.005, 0.0554, 0.0005)} material={matYellowXt60} />
        </group>

        {/* 2 dây đai Velcro cam buộc chặt pin LiPo trên lưng khung */}
        {[-0.042, 0.016].map((sx, i) => (
          <group key={i} position={[sx, 0.040, 0]}>
            <mesh geometry={rbox(0.016, 0.053, 0.059, 0.004)} material={matStrapOrange} castShadow />
            <mesh position={[0, 0.027, 0]} geometry={rbox(0.019, 0.004, 0.024, 0.001)} material={matAluminum} />
          </group>
        ))}

        {/* Giắc XT60 vàng & dây nguồn đỏ/đen */}
        <mesh position={[-0.088, 0.040, 0.012]} geometry={rbox(0.018, 0.010, 0.016, 0.002)} material={matYellowXt60} />
        <mesh geometry={geos.wireRed} material={matRedWire} />
        <mesh geometry={geos.wireBlack} material={matLipoCap} />

        {/* Ăng-ten phát video VTX nấm tròn ở đuôi + ăng-ten thu ELRS chữ T */}
        <mesh geometry={geos.vtxStem} material={matCarbonDark} castShadow />
        <group position={[-0.176, 0.127, 0]} rotation={[0, 0, 0.36]}>
          <mesh geometry={geos.vtxHead} material={matVtxCap} castShadow />
          <mesh position={[0, 0.013, 0]} material={matCarbonDark}>
            <cylinderGeometry args={[0.016, 0.016, 0.0036, 24]} />
          </mesh>
        </group>
        <mesh position={[-0.106, -0.014, 0]} rotation={[Math.PI / 2, 0, 0]} material={matCarbonDark}>
          <cylinderGeometry args={[0.0018, 0.0018, 0.136, 10]} />
        </mesh>
        {[-0.068, 0.068].map((sz, i) => (
          <mesh key={i} position={[-0.106, -0.014, sz]} rotation={[Math.PI / 2, 0, 0]} material={matYellowXt60}>
            <cylinderGeometry args={[0.0025, 0.0025, 0.013, 10]} />
          </mesh>
        ))}

        {/* Cụm camera FPV ở mũi khung nghiêng góc bay tấn công */}
        <group>
          {[-0.014, 0.014].map((sz, i) => (
            <mesh key={i} geometry={geos.camSidePlate} position={[0, 0, sz]} material={matCarbon} castShadow />
          ))}
          {/* Thanh giằng bảo vệ ống kính nhôm anod đỏ */}
          <mesh position={[0.124, 0.016, 0]} rotation={[Math.PI / 2, 0, 0]} material={matStandoff}>
            <cylinderGeometry args={[0.0022, 0.0022, 0.030, 10]} />
          </mesh>
          <group position={[0.106, 0.004, 0]} rotation={[0, 0, 0.26]}>
            <mesh geometry={rbox(0.022, 0.021, 0.021, 0.0025)} material={matMotorBlack} castShadow />
            <mesh position={[0.013, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matAluminum}>
              <cylinderGeometry args={[0.0094, 0.0098, 0.004, 20]} />
            </mesh>
            <mesh position={[0.0175, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matMotorBlack}>
              <cylinderGeometry args={[0.0086, 0.0092, 0.010, 20]} />
            </mesh>
            <mesh position={[0.0228, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matLens}>
              <sphereGeometry args={[0.0076, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            </mesh>
          </group>
        </group>

        {/* ==================== 4. ĐẦU ĐẠN LÕM PG-7VL (RPG) & VÒNG DÂY ĐỒNG KÍCH NỔ ==================== */}
        <group position={[0, wy, 0]}>
          <mesh geometry={geos.warheadBody} material={matPg7Olive} castShadow receiveShadow />
          <mesh geometry={geos.warheadBand} material={matOrdnanceYellow} />
          <mesh geometry={geos.warheadNose} material={matAluminum} castShadow />
          <mesh geometry={geos.warheadTail} material={matSteelClamp} castShadow />

          {/* Các gân gá cánh ổn định kim loại ở cổ đuôi PG-7VL */}
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((fa, i) => (
            <mesh
              key={i}
              position={[-0.238, Math.sin(fa) * 0.0225, Math.cos(fa) * 0.0225]}
              rotation={[fa, 0, 0]}
              geometry={rbox(0.018, 0.0025, 0.006, 0.0005)}
              material={matAluminum}
            />
          ))}

          {/* Băng keo điện đen cố định đầu cực kích nổ & băng keo xanh dã chiến trên bầu đạn */}
          <mesh position={[0.242, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matLipoCap}>
            <cylinderGeometry args={[0.0155, 0.0185, 0.016, 22]} />
          </mesh>
          <mesh position={[0.068, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matBlueTape}>
            <cylinderGeometry args={[0.0472, 0.0472, 0.016, 32]} />
          </mesh>
        </group>

        {/* Gối đỡ chữ V & cặp đai thép cổ dê + dây đai nhựa ôm khít đầu đạn vào bụng khung */}
        <mesh geometry={geos.cradle} position={[0.046, -0.016, 0]} material={matCarbonDark} />
        <mesh geometry={geos.cradle} position={[-0.064, -0.016, 0]} scale={[1, 0.72, 0.72]} material={matCarbonDark} />

        <group position={[0.046, wy, 0]}>
          <mesh rotation={[0, 0, -Math.PI / 2]} material={matSteelClamp} castShadow>
            <cylinderGeometry args={[0.048, 0.048, 0.013, 32, 1, true]} />
          </mesh>
          {[-0.036, 0.036].map((sz, i) => (
            <mesh key={i} position={[0, 0.032, sz]} geometry={rbox(0.013, 0.044, 0.003, 0.0005)} material={matSteelClamp} />
          ))}
          <mesh position={[0, -0.049, 0.012]} geometry={rbox(0.014, 0.009, 0.016, 0.0015)} material={matAluminum} />
        </group>

        <group position={[-0.064, wy, 0]}>
          <mesh rotation={[0, 0, -Math.PI / 2]} material={matSteelClamp} castShadow>
            <cylinderGeometry args={[0.0285, 0.0285, 0.012, 26, 1, true]} />
          </mesh>
          {[-0.023, 0.023].map((sz, i) => (
            <mesh key={i} position={[0, 0.032, sz]} geometry={rbox(0.012, 0.046, 0.003, 0.0005)} material={matSteelClamp} />
          ))}
        </group>
        {/* Đai nhựa nylon đen khoá phần ống đuôi đạn ôm thẳng lên tấm khung carbon sau (x = -0.092) */}
        <mesh position={[-0.092, -0.043, 0]} geometry={rbox(0.013, 0.058, 0.044, 0.003)} material={matLipoCap} />

        {/* Vòng dây đồng kích nổ chạm chập tự chế nhô ra trước mũi đầu đạn */}
        <mesh geometry={geos.copperInnerProbe} material={matCopperWire} castShadow />
        <mesh geometry={geos.copperOuterLoop} material={matCopperWire} castShadow />
        <mesh geometry={geos.copperLeftStrut} material={matCopperWire} castShadow />
        <mesh geometry={geos.detWireFront} material={matRedWire} />
        <mesh geometry={geos.detWireRear} material={matBlueTape} />
      </group>
    </group>
  );
};

export default FpvDrone3D;

const FpvDroneTurntableModel: React.FC = () => (
  <FpvDrone3D position={[0, 0.25, 0]} rotorSpin={0.55} />
);

export const preview = turntable(FpvDroneTurntableModel, {
  size: 0.95,
  center: [0, 0.25, 0],
});
