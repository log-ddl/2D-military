// Hệ chữ tối giản chuẩn phim tài liệu (mặc định KHÔNG dùng chữ; khi thật sự cần mới hiện 1 con số / định danh ngắn):
// - <Label>: chữ nổi trực tiếp không khung hộp (frameless), sạch và thoáng trên khung hình.
// - <Callout>: ô vuông tâm ngắm kép + 1 đường gióng mảnh nối thẳng vào hộp trắng chữ đen in hoa sắc nét.
import React from 'react';
import { useSpring } from '@core/time';
import { FONT } from './theme';

export type LabelProps = {
  t: number;
  text: string;
  sub?: string;
  x: number;
  y: number;
  from: number;
  until?: number;
  size?: number;
  /** Màu chữ (mặc định trắng ngà '#f4f7fb' nổi trên cảnh tối; truyền '#1e2631' cho nền sáng). */
  fg?: string;
  /** Mặc định không vẽ hộp nền (transparent); chỉ truyền màu khi thật sự cần tấm lót. */
  bg?: string;
  accent?: string;
  font?: string;
};

const isDarkColor = (hex: string) => {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return false;
  const v = parseInt(m[1], 16);
  const lum = (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  return lum < 0.45;
};

export const Label: React.FC<LabelProps> = ({
  t, text, sub, x, y, from, until, size = 34, fg = '#f4f7fb', bg, font = FONT,
}) => {
  const s = useSpring(t, from, 18);
  const out = until === undefined ? 1 : 1 - useSpring(t, until, 180);
  const p = Math.max(0, Math.min(1, s)) * Math.max(0, out);
  if (t < from || out <= 0.002) return null;

  const darkInk = isDarkColor(fg);
  const shadow = bg
    ? 'none'
    : darkInk
      ? '0 1px 10px rgba(255,255,255,0.45)'
      : '0 2px 16px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.55)';

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, calc(-50% + ${(1 - Math.min(1, s)) * 8}px))`,
        opacity: Math.min(1, s * 2) * out * (p > 0 ? 1 : 0),
        background: bg ?? 'transparent',
        color: fg,
        fontFamily: font,
        fontWeight: 600,
        fontSize: size,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        lineHeight: 1.08,
        padding: bg ? `${Math.round(size * 0.18)}px ${Math.round(size * 0.36)}px` : 0,
        borderRadius: bg ? 4 : 0,
        textShadow: shadow,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      <div>{text}</div>
      {sub && (
        <div style={{ fontSize: Math.round(size * 0.56), fontWeight: 400, opacity: 0.76, marginTop: 3, letterSpacing: '0.01em' }}>
          {sub}
        </div>
      )}
    </div>
  );
};

export type CalloutProps = {
  t: number;
  text: string;
  sub?: string;
  /** Toạ độ màn hình [x, y] (trên khung 1920x1080) của bộ phận cần trỏ tới. */
  at: [number, number];
  /** Toạ độ màn hình [x, y] đầu mút thanh gióng ngang nơi đặt chữ. */
  to: [number, number];
  from: number;
  until?: number;
  size?: number;
  /** Màu chữ & đường gióng (mặc định '#f4f7fb' cho nền tối; đặt '#1e2631' cho nền sáng). */
  fg?: string;
  bg?: string;
  /** Màu đường gióng mảnh (mặc định lấy theo `accent` hoặc `fg` với độ mờ 0.68). */
  lineColor?: string;
  accent?: string;
  font?: string;
};

/** Nhãn chỉ thị hiện đại: ô vuông tâm ngắm kép + 1 đường gióng mảnh nối thẳng vào hộp trắng chữ đen in hoa sắc nét. */
export const Callout: React.FC<CalloutProps> = ({
  t, text, at, to, from, until, size = 22, font = FONT,
}) => {
  const s = useSpring(t, from, 18);
  const out = until === undefined ? 1 : 1 - useSpring(t, until, 180);
  const p = Math.max(0, Math.min(1, s)) * Math.max(0, out);
  if (t < from || out <= 0.002) return null;

  const [ax, ay] = at;
  let [bx, by] = to;

  // Đảm bảo điểm đặt hộp chữ đủ khoảng cách tối thiểu và hướng ra vùng thoáng, không nằm đè sát điểm neo
  let dx = bx - ax;
  let dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (dist < 115) {
    const scale = 125 / Math.max(1, dist);
    dx *= scale;
    dy *= scale;
    bx = ax + dx;
    by = ay + dy;
  }
  bx = Math.max(160, Math.min(1760, bx));
  by = Math.max(105, Math.min(965, by));

  const dir = bx >= ax ? 1 : -1;
  const lineLen = Math.max(1, Math.hypot(bx - ax, by - ay));
  const boxScale = Math.min(1, Math.max(0, (s - 0.18) / 0.82));
  const outerSq = 13 * Math.min(1, s * 1.35);
  const innerSq = 5.6 * Math.min(1, s * 1.45);
  const fontSize = Math.min(22, Math.max(17, Math.round(size * 0.84)));

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: out }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {/* Đường gióng thẳng trực tiếp từ tâm ô vuông tới mép hộp chữ trắng */}
        <line
          x1={ax}
          y1={ay}
          x2={bx}
          y2={by}
          stroke="rgba(6, 10, 18, 0.45)"
          strokeWidth={3.0}
          strokeLinecap="round"
          strokeDasharray={lineLen}
          strokeDashoffset={lineLen * (1 - p)}
        />
        <line
          x1={ax}
          y1={ay}
          x2={bx}
          y2={by}
          stroke="rgba(255, 255, 255, 0.92)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray={lineLen}
          strokeDashoffset={lineLen * (1 - p)}
        />
        {/* Tâm ngắm ô vuông kép (khung vuông trắng mảnh bên ngoài + nhân vuông trắng đặc bên trong) */}
        <rect
          x={ax - outerSq / 2}
          y={ay - outerSq / 2}
          width={outerSq}
          height={outerSq}
          fill="rgba(8, 12, 18, 0.38)"
          stroke="#ffffff"
          strokeWidth={1.4}
        />
        <rect
          x={ax - innerSq / 2}
          y={ay - innerSq / 2}
          width={innerSq}
          height={innerSq}
          fill="#ffffff"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: bx,
          top: by,
          transform:
            dir > 0
              ? `translate(0, -68%) scaleX(${0.86 + 0.14 * boxScale})`
              : `translate(-100%, -68%) scaleX(${0.86 + 0.14 * boxScale})`,
          transformOrigin: dir > 0 ? 'left center' : 'right center',
          opacity: boxScale,
          background: '#ffffff',
          padding: '8px 26px',
          borderRadius: 1,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.36)',
          color: '#090b10',
          fontFamily: font,
          fontWeight: 800,
          fontSize,
          fontVariantNumeric: 'tabular-nums',
          textTransform: 'uppercase',
          letterSpacing: '0.045em',
          lineHeight: 1.05,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </div>
  );
};
