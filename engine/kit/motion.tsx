// Chuyển động dùng chung: thời gian tuyệt đối, rung máy quay, nhãn chữ bật lò xo, lớp SVG toàn khung.
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';
import { D, FONT } from './theme';

/** Giây tuyệt đối của video (cảnh nhận t0 từ VideoTimeline). */
export const useT = (t0: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return t0 + frame / fps;
};

/** Rung máy quay cầm tay (px). */
export const handheld = (t: number, amp = 3, seed = 'cam') => [noise2D(seed, t * 0.6, 0) * amp, noise2D(seed, 0, t * 0.6) * amp] as const;

/** Lò xo theo giây tuyệt đối: 0 trước `at`, tới 1 có vượt đích. */
export const useSpring = (t: number, at: number, damping = 10, stiffness = 160) => {
  const { fps } = useVideoConfig();
  return spring({ frame: Math.round((t - at) * fps), fps, config: { damping, stiffness } });
};

/** Lớp SVG phủ toàn khung (dùng cho HUD và hình; không dùng svg kích thước 0). */
export const Layer: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', ...style }}>{children}</svg>
);

/** Nhãn chữ ngắn (số hoặc tên voice đọc). Bật lò xo ở `from`, thu lại ở `until` (giây tuyệt đối). */
export const Label: React.FC<{ t: number; text: string; x: number; y: number; from: number; until?: number; size?: number; bg?: string; fg?: string }> = ({ t, text, x, y, from, until, size = 56, bg = D.paper, fg = D.ink }) => {
  const s = useSpring(t, from, 11);
  const out = until === undefined ? 1 : 1 - useSpring(t, until, 200);
  if (t < from || out <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, translate: '-50% -50%', scale: `${s * out}`, rotate: `${(1 - s) * -8}deg`, opacity: Math.min(1, s * 2) * out,
      background: bg, color: fg, fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1, padding: `${size * 0.22}px ${size * 0.42}px`, borderRadius: size, boxShadow: '6px 10px 0 rgba(40,20,40,0.22)', whiteSpace: 'nowrap' }}>
      {text}
    </div>
  );
};
