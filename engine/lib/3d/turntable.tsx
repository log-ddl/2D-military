// Bàn xoay kiểm mô hình: 4 khung = 4 góc (3/4 trước, ngang, 3/4 sau, chéo cao) trên nền xám có lưới 1 m.
// Dự án khai video/local/models/index.ts: export const MODELS: ModelSet = { M109: { C: M109, size: 10 } }.
// Kiểm bằng: python3 tools/sheet.py <id> --model M109
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Stage, Cam, type V3 } from './stage';

export type ModelSet = Record<string, { C: React.FC; size: number; center?: V3 }>;

const VIEWS: [number, number][] = [[35, 0.32], [90, 0.12], [215, 0.3], [320, 0.85]];

export const Turntable: React.FC<{ models: ModelSet; name: string }> = ({ models, name }) => {
  const f = useCurrentFrame();
  const m = models[name];
  if (!m) return <AbsoluteFill style={{ background: '#222', color: '#fc6', fontSize: 60, alignItems: 'center', justifyContent: 'center' }}>Không có mô hình {name}</AbsoluteFill>;
  const [deg, up] = VIEWS[f % 4];
  const a = (deg * Math.PI) / 180, d = m.size * 1.35, c = m.center ?? [0, m.size * 0.15, 0];
  return (
    <AbsoluteFill>
      <Stage sky={['#9aa4ae', '#c9cfd4', '#b9bec2']} fog={null} shadowArea={m.size} sun={[20, 35, 15]}>
        <Cam pos={[c[0] + Math.cos(a) * d, c[1] + d * up + 0.5, c[2] + Math.sin(a) * d]} look={c} fov={35} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[m.size * 6, m.size * 6]} />
          <meshStandardMaterial color="#b4b8ba" roughness={0.9} />
        </mesh>
        <gridHelper args={[m.size * 6, Math.round(m.size * 6), '#8d9194', '#a3a7aa']} position={[0, 0.005, 0]} />
        <m.C />
      </Stage>
    </AbsoluteFill>
  );
};
