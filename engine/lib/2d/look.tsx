// Chất liệu và máy quay cho cảnh 2D: defs bóng đổ / phát sáng / hạt giấy, camera 2D, lớp hạt phủ.
// Đặt <Defs2D /> một lần trong <svg> của cảnh rồi dùng filter="url(#sh)" / "url(#glow)".
import React from 'react';
import { AbsoluteFill } from 'remotion';

/** Bộ filter dùng chung: sh (bóng đổ mềm), shHard (bóng cứng kiểu cắt giấy), glow, grain (hạt giấy). */
export const Defs2D: React.FC<{ shadow?: string }> = ({ shadow = 'rgba(20,25,35,0.35)' }) => (
  <defs>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor={shadow} />
    </filter>
    <filter id="shHard" x="-10%" y="-10%" width="130%" height="140%">
      <feDropShadow dx="8" dy="10" stdDeviation="0" floodColor={shadow} />
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
      <feColorMatrix in="n" type="saturate" values="0" result="g" />
      <feComponentTransfer in="g"><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
    </filter>
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="t" />
      <feDisplacementMap in="SourceGraphic" in2="t" scale="6" />
    </filter>
  </defs>
);

/** Lớp hạt phủ toàn khung (giảm cảm giác vector phẳng). Đặt cuối cảnh. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.5 }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity, mixBlendMode: 'overlay' }}>
    <defs>
      <filter id="grainOverlay" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
        <feColorMatrix in="n" type="saturate" values="0" result="g" />
        <feComponentTransfer in="g"><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
      </filter>
    </defs>
    <rect width={1920} height={1080} filter="url(#grainOverlay)" />
  </svg>
);

/**
 * Camera 2D: đưa điểm thế giới (x, y) vào tâm khung, phóng `zoom`, xoay `rot` độ, cộng rung `shake` [dx, dy].
 * Mọi thứ con vẽ theo toạ độ thế giới (có thể lớn hơn 1920x1080).
 */
export const Cam2D: React.FC<{ x: number; y: number; zoom?: number; rot?: number; shake?: readonly [number, number]; children: React.ReactNode; bg?: string }> = ({
  x, y, zoom = 1, rot = 0, shake = [0, 0], children, bg,
}) => (
  <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${960 + shake[0]}px, ${540 + shake[1]}px) rotate(${rot}deg) scale(${zoom}) translate(${-x}px, ${-y}px)` }}>
      {children}
    </div>
  </AbsoluteFill>
);
