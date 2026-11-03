// Hệ chữ tối giản chuẩn phim tài liệu (mặc định KHÔNG dùng chữ; khi thật sự cần mới hiện 1 con số / định danh ngắn):
// - <Label>: chữ nổi trực tiếp không khung hộp (frameless), sạch và thoáng trên khung hình.
// - <Callout>: chấm nhỏ + đường gióng mảnh 1.25px gấp khúc 45°, chữ đặt gọn ngay trên thanh ngang như bản vẽ kỹ thuật.
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

/** Đường gióng mảnh 1.25px gấp khúc 45° + chữ không khung nằm gọn trên thanh ngang (chuẩn bản vẽ kỹ thuật / phim tài liệu). */
export const Callout: React.FC<CalloutProps> = ({
  t, text, sub, at, to, from, until, size = 26, fg = '#f4f7fb', lineColor, accent, font = FONT,
}) => {
  const s = useSpring(t, from, 18);
  const out = until === undefined ? 1 : 1 - useSpring(t, until, 180);
  const p = Math.max(0, Math.min(1, s)) * Math.max(0, out);
  if (t < from || out <= 0.002) return null;

  const [ax, ay] = at, [lx, ly] = to;
  const dir = lx >= ax ? 1 : -1;
  const diag = Math.min(Math.abs(lx - ax) * 0.65, Math.abs(ly - ay));
  const ex = ax + dir * diag;
  const ey = ly;
  const shelfEnd = lx + dir * Math.max(70, text.length * size * 0.56);

  const len1 = Math.hypot(ex - ax, ey - ay);
  const len2 = Math.abs(shelfEnd - ex);
  const total = Math.max(1, len1 + len2);
  const stroke = lineColor ?? accent ?? fg;
  const darkInk = isDarkColor(fg);
  const shadow = darkInk
    ? '0 1px 8px rgba(255,255,255,0.4)'
    : '0 2px 12px rgba(0,0,0,0.68), 0 1px 2px rgba(0,0,0,0.55)';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: out }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <circle cx={ax} cy={ay} r={3.4 * Math.min(1, s * 1.4)} fill={stroke} opacity={0.92} />
        <polyline
          points={`${ax},${ay} ${ex},${ey} ${shelfEnd},${ey}`}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.68}
          strokeWidth={1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={total}
          strokeDashoffset={total * (1 - p)}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: dir > 0 ? ex + 6 : shelfEnd,
          top: ey - 7,
          transform: 'translate(0, -100%)',
          opacity: Math.max(0, (p - 0.3) / 0.7),
          color: fg,
          fontFamily: font,
          fontWeight: 600,
          fontSize: size,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.015em',
          lineHeight: 1.05,
          textShadow: shadow,
          whiteSpace: 'nowrap',
        }}
      >
        <div>{text}</div>
        {sub && (
          <div style={{ fontSize: Math.round(size * 0.6), fontWeight: 400, opacity: 0.75, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};
