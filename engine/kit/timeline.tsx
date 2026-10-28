// Ráp cảnh theo mốc voice. Video.tsx của mỗi dự án do tools/build.py sinh ra từ plan/scenes.json.
// Âm thanh lấy từ public dir riêng của dự án (projects/<id>/public): voice.mp3, music.wav, sfx.wav.
// Mỗi chuyển cảnh chồng T khung; cảnh k bắt đầu sớm T/2 và nhận t0 (giây tuyệt đối lúc
// cảnh bắt đầu hiển thị) nên mọi mốc trong cảnh viết theo giây voice, không phải khung cục bộ.
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { QualityProvider } from './quality';

export type SceneC = React.FC<{ t0: number }>;
export type VideoSpec = {
  id: string;
  /** Mốc cắt (giây), phần tử đầu 0, phần tử cuối = thời lượng. */
  cuts: number[];
  scenes: SceneC[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transitions?: TransitionPresentation<any>[];
  fps?: number;
  /** Mức nhạc / tiếng hiệu ứng so với voice. */
  music?: number;
  sfx?: number;
  /** Lớp phủ thêm trên toàn video (ví dụ light leak ở vài cú cắt). */
  overlay?: React.FC;
};

export const durationOf = (v: VideoSpec) => Math.round(v.cuts[v.cuts.length - 1] * (v.fps ?? 30));

export const VideoTimeline: React.FC<{ spec: VideoSpec; quality?: number }> = ({ spec, quality = 1 }) => {
  const fps = spec.fps ?? 30, T = 12, n = spec.scenes.length;
  return (
    <QualityProvider value={quality}>
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>
        {spec.scenes.map((Scene, k) => {
          const len = Math.round((spec.cuts[k + 1] - spec.cuts[k]) * fps) + (k === 0 || k === n - 1 ? T / 2 : T);
          return (
            <React.Fragment key={k}>
              {k > 0 && <TransitionSeries.Transition presentation={spec.transitions?.[k - 1] ?? fade()} timing={linearTiming({ durationInFrames: T })} />}
              <TransitionSeries.Sequence durationInFrames={len}><Scene t0={k === 0 ? 0 : spec.cuts[k] - T / 2 / fps} /></TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>
      {spec.overlay && <spec.overlay />}
      <Audio src={staticFile('voice.mp3')} />
      {spec.music !== 0 && <Audio src={staticFile('music.wav')} volume={spec.music ?? 0.45} />}
      {spec.sfx !== 0 && <Audio src={staticFile('sfx.wav')} volume={spec.sfx ?? 0.5} />}
    </AbsoluteFill>
    </QualityProvider>
  );
};

/** Khung giữ chỗ cho cảnh chưa dựng hoặc đang lỗi kiểu (build.py tự thay vào). */
export const placeholder = (name: string, note: string): SceneC => {
  const P: SceneC = () => (
    <AbsoluteFill style={{ background: '#2a2f3a', color: '#ffd166', fontFamily: 'monospace', fontSize: 64, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div>{name}</div>
      <div style={{ fontSize: 30, color: '#c9d1e0' }}>{note}</div>
    </AbsoluteFill>
  );
  P.displayName = `Placeholder_${name}`;
  return P;
};
