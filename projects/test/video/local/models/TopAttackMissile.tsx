// Mô hình 3D riêng của dự án `test`: Tên lửa chống tăng đột kích nóc (kiểu FGM-148 Javelin).
// Dài 1.12 m, đường kính thân 0.128 m, đầu dò hồng ngoại vòm kính ở mũi, 8 cánh bung giữa thân & đuôi. Mũi hướng +X.
import React, { useMemo } from 'react';
import { extrude, lathe, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';

export type TopAttackMissileProps = {
  /** Độ bung 8 cánh nâng & cánh lái (0..1). */
  finDeploy?: number;
  /** Cường độ lửa đuôi động cơ (0..1). */
  thrust?: number;
};

const BODY_PROFILE: P2[] = [
  [0.042, -0.56],
  [0.052, -0.53],
  [0.048, -0.50],
  [0.064, -0.48],
  [0.064, 0.44],
  [0.060, 0.49],
  [0.046, 0.50],
];

const MID_WING: P2[] = [
  [-0.09, 0.0],
  [0.08, 0.0],
  [0.03, 0.18],
  [-0.08, 0.18],
];

const TAIL_FIN: P2[] = [
  [-0.065, 0.0],
  [0.055, 0.0],
  [0.015, 0.135],
  [-0.06, 0.135],
];

export const TopAttackMissile: React.FC<TopAttackMissileProps> = ({ finDeploy = 1, thrust = 0 }) => {
  const matBody = useMemo(
    () => paint({ color: '#394138', camo: ['#2b312a', '#51584d'], camoScale: 1.6, wear: 0.22, dirt: 0.16, roughness: 0.5, metalness: 0.38, seed: 43 }),
    [],
  );
  const matFin = plain('#262b27', 0.44, 0.55);
  const matCollar = plain('#7d858c', 0.32, 0.78);
  const matBand = plain('#e0a12b', 0.42, 0.2);
  const matSeeker = plain('#c4741d', 0.1, 0.88);
  const matNozzle = plain('#1d2022', 0.6, 0.65);

  const bodyGeo = useMemo(() => lathe(BODY_PROFILE, 28), []);
  const wingGeo = useMemo(() => extrude(MID_WING, 0.008, 0.0015), []);
  const tailGeo = useMemo(() => extrude(TAIL_FIN, 0.007, 0.0015), []);

  const fold = (1 - Math.max(0, Math.min(1, finDeploy))) * 1.35;

  return (
    <group>
      {/* Thân tên lửa */}
      <mesh geometry={bodyGeo} material={matBody} castShadow receiveShadow />

      {/* Đai vàng cảnh báo đầu đạn kép (tandem HEAT warhead bands) & khớp nối kim loại */}
      <mesh position={[0.28, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matBand}>
        <cylinderGeometry args={[0.0652, 0.0652, 0.038, 24]} />
      </mesh>
      <mesh position={[-0.18, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matBand}>
        <cylinderGeometry args={[0.0652, 0.0652, 0.026, 24]} />
      </mesh>
      <mesh position={[0.47, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matCollar}>
        <cylinderGeometry args={[0.062, 0.0645, 0.045, 24]} />
      </mesh>
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matCollar}>
        <cylinderGeometry args={[0.0648, 0.0648, 0.022, 24]} />
      </mesh>

      {/* Vòm kính đầu dò hồng ngoại ảnh nhiệt (IIR Seeker Dome) ở mũi */}
      <mesh position={[0.495, 0, 0]} scale={[1.15, 1, 1]} material={matSeeker}>
        <sphereGeometry args={[0.056, 20, 16]} />
      </mesh>

      {/* 4 cánh nâng chính giữa thân */}
      {[0, 1, 2, 3].map((i) => (
        <group key={`w-${i}`} position={[-0.03, 0, 0]} rotation={[(i * Math.PI) / 2 + Math.PI / 4, 0, 0]}>
          <group position={[0, 0.06, 0]} rotation={[0, 0, -fold]}>
            <mesh geometry={wingGeo} material={matFin} castShadow />
          </group>
        </group>
      ))}

      {/* 4 cánh lái đuôi */}
      {[0, 1, 2, 3].map((i) => (
        <group key={`t-${i}`} position={[-0.45, 0, 0]} rotation={[(i * Math.PI) / 2, 0, 0]}>
          <group position={[0, 0.058, 0]} rotation={[0, 0, -fold]}>
            <mesh geometry={tailGeo} material={matFin} castShadow />
          </group>
        </group>
      ))}

      {/* Vòi phụt động cơ & luồng lửa đẩy (khi thrust > 0) */}
      <mesh position={[-0.555, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matNozzle}>
        <cylinderGeometry args={[0.034, 0.046, 0.04, 20]} />
      </mesh>
      {thrust > 0.01 && (
        <group position={[-0.58, 0, 0]}>
          <mesh position={[-0.22 * thrust, 0, 0]} scale={[0.32 * thrust, 0.065 * thrust, 0.065 * thrust]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshBasicMaterial color="#fff3bd" transparent opacity={0.95} toneMapped={false} />
          </mesh>
          <mesh position={[-0.42 * thrust, 0, 0]} scale={[0.58 * thrust, 0.1 * thrust, 0.1 * thrust]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshBasicMaterial color="#ff7b1f" transparent opacity={0.65} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};
