// Mô hình 3D tỉ lệ thật 1:1 (mét) của Bom liệng đường kính nhỏ GBU-39 SDB tích hợp bộ cánh mở rộng Diamondback:
// - Chiều dài: 1.80 m (x từ -0.90 tới +0.90), đường kính thân 0.19 m, sải cánh kép hình thoi Diamondback mở rộng: 1.61 m (z = ±0.805 m).
// - Bộ phận chuyển động: `deploy` (0 = xếp gọn dọc sống lưng khi treo dưới cánh; 1 = bung mở hoàn chỉnh khung cánh kép hình thoi Diamondback + 4 cánh lái đuôi).
import React, { useMemo } from 'react';
import { extrude, lathe, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets } from '@lib/3d/parts';
import { airfoilWing } from './aero';

export type GBU39Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Tiến độ bung cánh Diamondback & cánh đuôi (0..1) */
  deploy?: number;
};

export const GBU39SDB: React.FC<GBU39Props> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  deploy = 1,
}) => {
  const d = Math.max(0, Math.min(1, deploy));

  // Thân bom xuyên thép GBU-39 (mũi nhọn ogive + thân trụ vát cạnh)
  const noseCore = useMemo(
    () =>
      lathe(
        [
          [0.001, -0.9],
          [0.072, -0.88],
          [0.094, -0.72],
          [0.096, 0.42],
          [0.084, 0.62],
          [0.052, 0.78],
          [0.018, 0.88],
          [0.001, 0.91],
        ],
        28,
      ),
    [],
  );

  // Thân hộp vát chine khí động dưới bụng
  const chineBody = useMemo(() => rbox(1.18, 0.15, 0.185, 0.045), []);

  // Sống lưng mang cơ cấu bản lề cánh Diamondback
  const dorsalSpine = useMemo(
    () =>
      extrude(
        [
          [-0.68, 0.07],
          [0.54, 0.07],
          [0.46, 0.145],
          [-0.62, 0.145],
        ],
        0.13,
        0.02,
      ),
    [],
  );

  // Cánh trước quét xuôi (từ bản lề x=+0.42 quét lùi ra mút z=±0.78 tại x=-0.06)
  const fwdWingR = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.15,
        rootX: 0,
        tipChord: 0.1,
        tipX: -0.48,
        span: 0.78,
        thickness: 0.09,
        camber: 0.02,
        dihedralY: -0.02,
        side: 1,
        segSpan: 8,
        segProfile: 20,
      }),
    [],
  );
  const fwdWingL = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.15,
        rootX: 0,
        tipChord: 0.1,
        tipX: -0.48,
        span: 0.78,
        thickness: 0.09,
        camber: 0.02,
        dihedralY: -0.02,
        side: -1,
        segSpan: 8,
        segProfile: 20,
      }),
    [],
  );

  // Cánh sau quét ngược (từ bản lề đuôi x=-0.56 quét tiến ra nối khít vào mút cánh trước tại z=±0.78, dx=+0.50 -> tạo hình thoi Diamondback!)
  const aftWingR = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.13,
        rootX: 0,
        tipChord: 0.095,
        tipX: 0.5,
        span: 0.78,
        thickness: 0.085,
        camber: 0.018,
        dihedralY: 0.02,
        side: 1,
        segSpan: 8,
        segProfile: 20,
      }),
    [],
  );
  const aftWingL = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.13,
        rootX: 0,
        tipChord: 0.095,
        tipX: 0.5,
        span: 0.78,
        thickness: 0.085,
        camber: 0.018,
        dihedralY: 0.02,
        side: -1,
        segSpan: 8,
        segProfile: 20,
      }),
    [],
  );

  // 4 Cánh lái đuôi bung mở chữ X
  const tailFin = useMemo(
    () =>
      extrude(
        [
          [-0.14, 0],
          [0.04, 0],
          [-0.02, 0.2],
          [-0.15, 0.19],
        ],
        0.01,
        0.002,
      ),
    [],
  );

  const rivetPts = useMemo<[number, number, number][]>(
    () =>
      Array.from({ length: 8 }, (_, i) => [-0.52 + i * 0.14, 0.148, (i % 2 === 0 ? 1 : -1) * 0.04] as [number, number, number]),
    [],
  );

  const warheadMat = paint({
    color: '#5a634a',
    camo: ['#4d553f', '#6b7559'],
    wear: 0.2,
    dirt: 0.18,
    roughness: 0.62,
    metalness: 0.32,
    seed: 41,
  });
  const wingKitMat = paint({
    color: '#9ea7b2',
    camo: ['#919aa6', '#acb5c0'],
    wear: 0.16,
    dirt: 0.08,
    roughness: 0.45,
    metalness: 0.52,
    repeat: 0.5,
    seed: 42,
  });
  const noseSteelMat = plain('#3a4048', 0.36, 0.78);
  const yellowBandMat = plain('#f0b429', 0.44, 0.18);

  // Góc xếp cánh: khi d=0 cánh trước quét ép sát về sau (~1.38 rad), cánh sau quét ép về trước (~1.38 rad)
  const foldFwd = (1 - d) * 1.36;
  const foldAft = (1 - d) * 1.36;
  const finOpen = 0.2 + 0.8 * d;

  return (
    <group position={position} rotation={rotation}>
      {/* Thân bom + mũi xuyên thép + đai vàng */}
      <mesh geometry={noseCore} material={warheadMat} castShadow receiveShadow />
      <mesh position={[-0.1, -0.01, 0]} geometry={chineBody} material={warheadMat} castShadow receiveShadow />
      <mesh position={[0.78, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={noseSteelMat}>
        <coneGeometry args={[0.054, 0.26, 24]} />
      </mesh>
      <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={yellowBandMat}>
        <cylinderGeometry args={[0.096, 0.097, 0.055, 26]} />
      </mesh>

      {/* Bệ sống lưng Diamondback */}
      <mesh geometry={dorsalSpine} material={wingKitMat} castShadow receiveShadow />
      <Rivets points={rivetPts} r={0.008} color="#3d434c" />

      {/* Cặp cánh trước Diamondback (xoay quanh chốt x = +0.42) */}
      <group position={[0.42, 0.135, 0.03]} rotation={[0, -foldFwd, 0]}>
        <mesh geometry={fwdWingR} material={wingKitMat} castShadow receiveShadow />
        {/* Thanh nối đầu mút hình thoi */}
        <mesh position={[-0.48, -0.01, 0.78]} geometry={rbox(0.14, 0.05, 0.025, 0.006)} material={noseSteelMat} />
      </group>
      <group position={[0.42, 0.135, -0.03]} rotation={[0, foldFwd, 0]}>
        <mesh geometry={fwdWingL} material={wingKitMat} castShadow receiveShadow />
        <mesh position={[-0.48, -0.01, -0.78]} geometry={rbox(0.14, 0.05, 0.025, 0.006)} material={noseSteelMat} />
      </group>

      {/* Cặp cánh sau Diamondback (xoay quanh chốt x = -0.56, nối khít tạo khung cánh thoi khép kín khi d=1) */}
      <group position={[-0.56, 0.115, 0.03]} rotation={[0, foldAft, 0]}>
        <mesh geometry={aftWingR} material={wingKitMat} castShadow receiveShadow />
      </group>
      <group position={[-0.56, 0.115, -0.03]} rotation={[0, -foldAft, 0]}>
        <mesh geometry={aftWingL} material={wingKitMat} castShadow receiveShadow />
      </group>

      {/* 4 Cánh lái đuôi chữ X */}
      {[0, 1, 2, 3].map((k) => (
        <group key={k} position={[-0.76, 0, 0]} rotation={[((k * 90 + 45) * Math.PI) / 180, 0, 0]}>
          <group position={[0, 0.075, 0]} scale={[1, finOpen, 1]}>
            <mesh geometry={tailFin} material={wingKitMat} castShadow />
          </group>
        </group>
      ))}
    </group>
  );
};
