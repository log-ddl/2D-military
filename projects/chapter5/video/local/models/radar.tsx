// Xe radar phản pháo 6×6: dài 8 m, mặt radar mảng pha 2.4 × 1.8 m trên mâm xoay ở sau thùng.
// Mũi +X. `yaw` = góc xoay mâm radar (rad, 0 = nhìn về +X), `glow` 0..1 = mặt radar phát sáng teal khi đang bám mục tiêu.
import React from 'react';
import { extrude, rbox, pipe } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Wheel } from '@lib/3d/parts';
import { OLIVE } from './sph';

const body = paint({ ...OLIVE, seed: 31 });
const box = paint({ ...OLIVE, seed: 37, camoScale: 0.8 });
const dark = plain('#2b2d27', 0.8, 0.3);
const glass = plain('#24343e', 0.1, 0.7);
const CAB: [number, number][] = [[2.15, 1.1], [2.15, 2.75], [3.25, 2.75], [3.75, 2.05], [3.95, 1.95], [3.95, 1.1]];
const AXLES = [3.05, -0.75, -2.15];

export const RadarTruck: React.FC<{ yaw?: number; glow?: number; travel?: number }> = ({ yaw = 0, glow = 0, travel = 0 }) => (
  <group>
    {/* Khung gầm */}
    <mesh geometry={rbox(7.6, 0.28, 1.0, 0.04)} position={[0.3, 0.98, 0]} material={dark} castShadow />
    {/* Ca-bin */}
    <mesh geometry={extrude(CAB, 2.45, 0.08)} material={body} castShadow receiveShadow />
    <mesh geometry={rbox(0.84, 0.03, 2.1, 0.01)} position={[3.52, 2.42, 0]} rotation={[0, 0, -0.951]} material={glass} />
    {[-1, 1].map((s) => (
      <group key={s}>
        <mesh geometry={rbox(0.7, 0.55, 0.02, 0.01)} position={[2.75, 2.3, s * 1.235]} material={glass} />
        <mesh geometry={rbox(0.1, 0.25, 0.12, 0.02)} position={[3.6, 2.35, s * 1.32]} material={dark} />
        <mesh position={[3.97, 1.45, s * 0.85]} rotation={[0, 0, Math.PI / 2]} material={plain('#e8e2c8', 0.2, 0.1, { emissive: '#3a3420' })}>
          <cylinderGeometry args={[0.11, 0.11, 0.06, 14]} />
        </mesh>
      </group>
    ))}
    <mesh geometry={rbox(0.25, 0.5, 2.3, 0.04)} position={[4.0, 1.05, 0]} material={dark} castShadow />
    {/* Thùng thiết bị + máy phát */}
    <mesh geometry={rbox(2.6, 1.5, 2.4, 0.06)} position={[0.55, 1.9, 0]} material={box} castShadow receiveShadow />
    <mesh geometry={rbox(1.0, 0.8, 1.2, 0.05)} position={[-1.2, 1.5, -0.55]} material={box} castShadow />
    <mesh geometry={pipe([[-0.7, 2.65, 1.1], [-0.7, 3.3, 1.1]], 0.05)} material={dark} />
    {/* Chắn bùn + bánh */}
    {AXLES.map((x) => [-1, 1].map((s) => (
      <group key={`${x}${s}`}>
        <Wheel r={0.55} width={0.42} spin={travel / 0.55} position={[x, 0.55, s * 1.02]} rim="#4c5432" bolts={10} />
        <mesh geometry={rbox(1.25, 0.05, 0.5, 0.02)} position={[x, 1.18, s * 1.02]} material={body} castShadow />
      </group>
    )))}
    {/* Mâm xoay + mặt radar */}
    <group position={[-1.75, 1.25, 0.35]} rotation={[0, yaw, 0]}>
      <mesh material={dark} castShadow><cylinderGeometry args={[0.55, 0.65, 0.35, 24]} /></mesh>
      <mesh geometry={pipe([[0, 0.15, 0], [0.25, 1.2, 0]], 0.09)} material={dark} castShadow />
      <group position={[0.35, 1.55, 0]} rotation={[0, 0, -0.32]}>
        <mesh geometry={rbox(0.22, 1.8, 2.4, 0.05)} material={box} castShadow />
        <mesh position={[0.115, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.2, 1.6]} />
          <meshStandardMaterial color="#2f3a33" emissive="#2fb3a8" emissiveIntensity={glow * 2.2} roughness={0.5} />
        </mesh>
        {/* lưới phần tử mảng pha */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`h${i}`} geometry={rbox(0.01, 0.02, 2.2, 0.005)} position={[0.12, -0.64 + i * 0.32, 0]} material={dark} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={`v${i}`} geometry={rbox(0.01, 1.6, 0.02, 0.005)} position={[0.12, 0, -0.96 + i * 0.32]} material={dark} />
        ))}
      </group>
    </group>
  </group>
);
