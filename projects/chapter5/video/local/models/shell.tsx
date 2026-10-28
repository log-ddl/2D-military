// Đạn nổ phá 155 mm: dài 0.8 m, Ø 155 mm, đai dẫn đồng, ngòi ở mũi. Dọc trục +X (đuôi ở x = 0).
import React from 'react';
import { lathe } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';

const body = paint({ color: '#5a6236', camo: [], wear: 0.1, dirt: 0.15, seed: 21, metalness: 0.4 });
const R = 0.0775;

export const Shell155: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <group scale={scale}>
    <mesh geometry={lathe([[0.001, 0], [R * 0.92, 0], [R * 0.97, 0.03], [R, 0.05], [R, 0.42], [R * 0.93, 0.52], [R * 0.72, 0.62], [R * 0.45, 0.69], [R * 0.36, 0.7]], 32)} material={body} castShadow />
    <mesh geometry={lathe([[R * 1.02, 0.07], [R * 1.02, 0.11]], 32)} material={plain('#b06a3a', 0.35, 0.8)} />
    <mesh geometry={lathe([[R * 1.005, 0.36], [R * 1.005, 0.39]], 32)} material={plain('#d9c23a', 0.6)} />
    <mesh geometry={lathe([[R * 0.36, 0.7], [R * 0.3, 0.75], [R * 0.15, 0.79], [0.001, 0.8]], 24)} material={plain('#8d8f86', 0.35, 0.8)} castShadow />
  </group>
);
