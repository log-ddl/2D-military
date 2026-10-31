// Bàn xoay kiểm mô hình: 4 góc (3/4 trước, ngang, 3/4 sau, chéo cao) trên nền xám có lưới 1 m.
// Trong src/parts/<Tên>.tsx: export const preview = turntable(<Tên>, { size: 10 });  kiểm bằng core/tools/check.py <id> --part <Tên>
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Preview } from '@core/preview';
import { Stage, Cam, type V3 } from './stage';

const VIEWS: [number, number][] = [[35, 0.32], [90, 0.12], [215, 0.3], [320, 0.85]];

export const Turntable: React.FC<{ C: React.FC; size: number; center?: V3; view: number }> = ({ C, size, center, view }) => {
  const [deg, up] = VIEWS[view % 4];
  const a = (deg * Math.PI) / 180, d = size * 1.35, c = center ?? [0, size * 0.15, 0];
  return (
    <AbsoluteFill>
      <Stage sky={['#9aa4ae', '#c9cfd4', '#b9bec2']} fog={null} shadowArea={size} sun={[20, 35, 15]}>
        <Cam pos={[c[0] + Math.cos(a) * d, c[1] + d * up + 0.5, c[2] + Math.sin(a) * d]} look={c} fov={35} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[size * 6, size * 6]} />
          <meshStandardMaterial color="#b4b8ba" roughness={0.9} />
        </mesh>
        <gridHelper args={[size * 6, Math.round(size * 6), '#8d9194', '#a3a7aa']} position={[0, 0.005, 0]} />
        <C />
      </Stage>
    </AbsoluteFill>
  );
};

/** Preview 4 góc cho một mô hình 3D. `size` = chiều dài lớn nhất (m). */
export const turntable = (C: React.FC, o: { size: number; center?: V3 }): Preview => {
  const P: React.FC<{ view: number }> = ({ view }) => <Turntable C={C} size={o.size} center={o.center} view={view} />;
  return { views: 4, C: P };
};
