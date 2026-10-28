// Vũ khí 3D tỉ lệ thật treo dưới cánh MQ-9 / MQ-1 và dùng khi phóng/thả trong cảnh:
// - AGM-114 Hellfire (dài 1.63 m, đường kính 0.178 m) + giá phóng đôi M299
// - GBU-12 Paveway II (dài 3.27 m, đường kính 0.273 m, nặng 227 kg)
import React, { useMemo } from 'react';
import { extrude, lathe, pipe, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';

/** Tên lửa diệt tăng dẫn đường bán chủ động laser AGM-114 Hellfire (tâm giữa thân, mũi +X, dài 1.63 m). */
export const AGM114Hellfire: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const bodyGeo = useMemo(
    () =>
      lathe(
        [
          [0.001, -0.81],
          [0.068, -0.81],
          [0.088, -0.75],
          [0.089, 0.56],
          [0.082, 0.68],
          [0.056, 0.76],
          [0.001, 0.76],
        ],
        28,
      ),
    [],
  );
  const seekerGeo = useMemo(
    () =>
      lathe(
        [
          [0.001, 0.73],
          [0.056, 0.75],
          [0.044, 0.80],
          [0.001, 0.82],
        ],
        24,
      ),
    [],
  );
  const bandGeo = useMemo(
    () =>
      lathe(
        [
          [0.0905, 0.32],
          [0.0905, 0.38],
        ],
        28,
      ),
    [],
  );
  const rearFin = useMemo(
    () =>
      extrude(
        [
          [-0.79, 0.082],
          [-0.44, 0.082],
          [-0.52, 0.165],
          [-0.78, 0.165],
        ],
        0.012,
        0.002,
      ),
    [],
  );
  const frontStrake = useMemo(
    () =>
      extrude(
        [
          [0.18, 0.084],
          [0.48, 0.084],
          [0.42, 0.115],
          [0.16, 0.115],
        ],
        0.01,
        0.002,
      ),
    [],
  );

  const bodyMat = paint({ color: '#272c34', camo: ['#1f232a', '#343b45'], wear: 0.2, dirt: 0.12, roughness: 0.48, metalness: 0.45, seed: 21 });
  const seekerMat = plain('#184844', 0.08, 0.85);
  const bandMat = plain('#eab338', 0.45, 0.2);
  const finMat = plain('#363c46', 0.5, 0.55);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={bodyGeo} material={bodyMat} castShadow receiveShadow />
      <mesh geometry={seekerGeo} material={seekerMat} />
      <mesh geometry={bandGeo} material={bandMat} />
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[((k * 90 + 45) * Math.PI) / 180, 0, 0]}>
          <mesh geometry={rearFin} material={finMat} castShadow />
          <mesh geometry={frontStrake} material={finMat} />
        </group>
      ))}
    </group>
  );
};

/** Giá phóng đôi M299 treo 2 quả AGM-114 Hellfire dưới một mấu cánh MQ-9. */
export const DualHellfireRack: React.FC<{
  position?: [number, number, number];
  count?: 0 | 1 | 2;
}> = ({ position = [0, 0, 0], count = 2 }) => {
  const beamMat = paint({ color: '#5c6673', camo: ['#4b535e'], wear: 0.25, dirt: 0.2, metalness: 0.45, seed: 22 });
  const darkMetal = plain('#2a2e35', 0.45, 0.65);
  const cableGeo = useMemo(
    () =>
      pipe(
        [
          [0.25, 0.02, 0],
          [0.1, -0.04, 0.12],
          [-0.1, -0.04, 0.14],
        ],
        0.012,
        16,
      ),
    [],
  );
  return (
    <group position={position}>
      {/* Thanh dầm trung tâm & ngàm kẹp đôi */}
      <mesh geometry={rbox(1.15, 0.09, 0.14, 0.02)} material={beamMat} castShadow />
      <mesh geometry={rbox(0.86, 0.06, 0.46, 0.015)} position={[-0.04, -0.06, 0]} material={darkMetal} castShadow />
      <mesh geometry={cableGeo} material={darkMetal} />
      {count >= 1 && <AGM114Hellfire position={[0.04, -0.17, -0.17]} />}
      {count >= 2 && <AGM114Hellfire position={[0.04, -0.17, 0.17]} />}
    </group>
  );
};

/** Bom dẫn đường laser GBU-12 Paveway II (dài 3.27 m, đường kính 0.273 m, mũi +X). */
export const GBU12Paveway: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const warheadGeo = useMemo(
    () =>
      lathe(
        [
          [0.001, -1.62],
          [0.088, -1.62],
          [0.095, -1.08],
          [0.136, -0.78],
          [0.138, 0.48],
          [0.105, 0.88],
          [0.068, 1.12],
          [0.068, 1.46],
          [0.048, 1.58],
          [0.001, 1.63],
        ],
        30,
      ),
    [],
  );
  const collarGeo = useMemo(
    () =>
      lathe(
        [
          [0.072, 1.05],
          [0.084, 1.15],
          [0.084, 1.35],
          [0.068, 1.44],
        ],
        26,
      ),
    [],
  );
  const yellowBandGeo = useMemo(
    () =>
      lathe(
        [
          [0.132, 0.56],
          [0.125, 0.65],
        ],
        28,
      ),
    [],
  );
  const tailFin = useMemo(
    () =>
      extrude(
        [
          [-1.6, 0.086],
          [-1.08, 0.092],
          [-1.22, 0.34],
          [-1.58, 0.34],
        ],
        0.014,
        0.003,
      ),
    [],
  );
  const canardFin = useMemo(
    () =>
      extrude(
        [
          [1.08, 0.078],
          [1.36, 0.078],
          [1.31, 0.22],
          [1.14, 0.21],
        ],
        0.012,
        0.002,
      ),
    [],
  );

  const oliveMat = paint({ color: '#535c43', camo: ['#464f38', '#636d51'], wear: 0.22, dirt: 0.24, roughness: 0.68, metalness: 0.28, seed: 31 });
  const guideMat = paint({ color: '#788078', camo: ['#636b64'], wear: 0.25, dirt: 0.15, roughness: 0.55, metalness: 0.42, seed: 32 });
  const yellowMat = plain('#eab338', 0.48, 0.15);
  const glassMat = plain('#1fe0a8', 0.1, 0.9);
  const lugMat = plain('#3a3f45', 0.4, 0.7);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={warheadGeo} material={oliveMat} castShadow receiveShadow />
      <mesh geometry={collarGeo} material={guideMat} castShadow />
      <mesh geometry={yellowBandGeo} material={yellowMat} />
      {/* Đầu kính laser linh hoạt ở chóp mũi */}
      <mesh position={[1.62, 0, 0]} material={glassMat}>
        <sphereGeometry args={[0.044, 16, 12]} />
      </mesh>
      {/* Móc treo thân bom */}
      <mesh position={[-0.08, 0.15, 0]} geometry={rbox(0.08, 0.05, 0.04, 0.01)} material={lugMat} />
      <mesh position={[0.28, 0.15, 0]} geometry={rbox(0.08, 0.05, 0.04, 0.01)} material={lugMat} />
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[((k * 90 + 45) * Math.PI) / 180, 0, 0]}>
          <mesh geometry={tailFin} material={guideMat} castShadow />
          <mesh geometry={canardFin} material={guideMat} castShadow />
        </group>
      ))}
    </group>
  );
};
