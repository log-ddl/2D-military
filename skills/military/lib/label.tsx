// Nhãn chữ ngắn (số hoặc tên voice đọc). Bật lò xo ở `from`, thu lại ở `until` (giây tuyệt đối).
import React from 'react';
import { useSpring } from '@core/time';
import { D, FONT } from './theme';

export const Label: React.FC<{ t: number; text: string; x: number; y: number; from: number; until?: number; size?: number; bg?: string; fg?: string; font?: string }> = ({ t, text, x, y, from, until, size = 56, bg = D.paper, fg = D.ink, font = FONT }) => {
  const s = useSpring(t, from, 11);
  const out = until === undefined ? 1 : 1 - useSpring(t, until, 200);
  if (t < from || out <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, translate: '-50% -50%', scale: `${s * out}`, rotate: `${(1 - s) * -8}deg`, opacity: Math.min(1, s * 2) * out,
      background: bg, color: fg, fontFamily: font, fontWeight: 700, fontSize: size, lineHeight: 1, padding: `${size * 0.22}px ${size * 0.42}px`, borderRadius: size, boxShadow: '6px 10px 0 rgba(40,20,40,0.22)', whiteSpace: 'nowrap' }}>
      {text}
    </div>
  );
};
