// Bàn xoay kiểm mô hình: 4 góc (3/4 trước, ngang, 3/4 sau, chéo cao) trên nền xám có lưới 1 m + bóng tiếp xúc gầm.
// Trong src/parts/<Tên>.tsx: export const preview = turntable(<Tên>, { size: 10 });  kiểm bằng core/tools/check.py <id> --part <Tên>
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Preview } from '@core/preview';
import { Stage, Cam, ContactShadow, type V3 } from './stage';

const VIEWS: [number, number][] = [[35, 0.32], [90, 0.12], [215, 0.3], [320, 0.85]];

export const Turntable: React.FC<{ C: React.FC; size: number; center?: V3; view: number }> = ({ C, size, center, view }) => {
  const [deg, up] = VIEWS[view % 4];
  const a = (deg * Math.PI) / 180, d = size * 1.38, c = center ?? [0, size * 0.15, 0];
  return (
    <AbsoluteFill>
      <Stage sky={['#909ba8', '#c8cfd6', '#b8bec4']} fog={null} shadowArea={size * 0.9} sun={[22, 36, 16]}>
        <Cam pos={[c[0] + Math.cos(a) * d, c[1] + d * up + 0.5, c[2] + Math.sin(a) * d]} look={c} fov={33} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ isGround: true }}>
          <planeGeometry args={[size * 6, size * 6]} />
          <meshStandardMaterial color="#b8bcbf" roughness={0.88} />
        </mesh>
        <gridHelper args={[size * 6, Math.round(size * 6), '#8d9297', '#a6aaae']} position={[0, 0.004, 0]} userData={{ isGround: true }} />
        <ContactShadow center={[c[0], 0, c[2]]} size={size * 1.7} reach={Math.max(2.5, size * 0.35)} opacity={0.55} />
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
