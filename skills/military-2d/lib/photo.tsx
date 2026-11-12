// Ảnh tư liệu thật trong cảnh military-2d (lớp HTML theo toạ độ MÀN HÌNH 1920x1080, đặt NGOÀI <Cam2D>):
// - <PhotoCard>: ảnh in có viền giấy, hơi nghiêng, có chú thích; `pin` = nối về một điểm trên bản đồ (dùng screenOf() để đổi điểm thế giới → màn hình).
// - <PhotoFull>: ảnh toàn khung đẩy máy chậm (Ken Burns), cho khoảnh khắc cần người xem nhìn thẳng vào tư liệu.
// Ảnh lấy bằng skills/military-2d/tools/img.py, gọi qua asset('aNNN').
import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { lerp, prog, useSpring } from '@core/time';
import { FONT, M } from './theme';

export type Grade = 'none' | 'mono' | 'warm' | 'cold';
/** Ép các ảnh nguồn khác nhau về cùng một tông: 'mono' đen trắng tương phản, 'warm' ngả nâu ảnh cũ, 'cold' ngả xanh hợp nền bản đồ tối. */
const GRADE: Record<Grade, string> = {
  none: 'none',
  mono: 'grayscale(1) contrast(1.12) brightness(0.96)',
  warm: 'grayscale(1) sepia(0.42) contrast(1.08) brightness(0.96)',
  cold: 'grayscale(0.85) contrast(1.1) brightness(0.92) hue-rotate(185deg) saturate(1.3)',
};

export type PhotoCardProps = {
  t: number;
  src: string;
  /** Tâm thẻ trên màn hình. */
  x: number;
  y: number;
  /** Kích thước ô ảnh (px màn hình); ảnh được cắt vừa ô (cover), `focus` = điểm giữ lại [x%, y%]. */
  w: number;
  h: number;
  from: number;
  until?: number;
  focus?: [number, number];
  /** Nghiêng thẻ (độ); mặc định theo vị trí để các thẻ không thẳng hàng cứng. 0 = thẳng. */
  tilt?: number;
  grade?: Grade;
  /** Chú thích ngắn dưới ảnh (ai / cái gì / ở đâu / năm), đúng ngôn ngữ voice. */
  caption?: string;
  /** Dòng nguồn nhỏ (tuỳ chọn; mặc định không hiện). */
  credit?: string;
  /** Điểm trên màn hình mà ảnh này minh hoạ: vẽ đường nối + chấm. */
  pin?: [number, number];
  accent?: string;
};

export const PhotoCard: React.FC<PhotoCardProps> = ({ t, src, x, y, w, h, from, until, focus = [50, 40], tilt, grade = 'mono', caption, credit, pin, accent = M.amber }) => {
  const s = useSpring(t, from, 16, 150);
  const out = until === undefined ? 1 : 1 - prog(t, until - 0.35, until);
  if (t < from || out <= 0.004) return null;
  const rot = tilt ?? ((Math.round(x + y) % 7) - 3) * 0.55;
  const pad = Math.max(8, Math.round(w * 0.022));
  const capH = caption ? Math.round(Math.max(30, w * 0.085)) : 0;
  const life = until === undefined ? 8 : until - from;
  const push = lerp(1.03, 1.1, prog(t, from, from + life, (v) => v));
  const cardW = w + pad * 2, cardH = h + pad * 2 + capH;
  const ps = pin ? prog(t, from + 0.15, from + 0.6) : 0;
  // đường nối đi từ mép thẻ gần điểm ghim nhất
  const ex = pin ? Math.max(x - cardW / 2, Math.min(x + cardW / 2, pin[0])) : 0;
  const ey = pin ? Math.max(y - cardH / 2, Math.min(y + cardH / 2, pin[1])) : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: out }}>
      {pin && (
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
          <line x1={pin[0]} y1={pin[1]} x2={lerp(pin[0], ex, ps)} y2={lerp(pin[1], ey, ps)} stroke="rgba(2,6,12,0.55)" strokeWidth={4} />
          <line x1={pin[0]} y1={pin[1]} x2={lerp(pin[0], ex, ps)} y2={lerp(pin[1], ey, ps)} stroke={accent} strokeWidth={1.8} />
          <circle cx={pin[0]} cy={pin[1]} r={9 * Math.min(1, s * 1.3)} fill="rgba(2,6,12,0.5)" stroke={accent} strokeWidth={2} />
          <circle cx={pin[0]} cy={pin[1]} r={3.4} fill={accent} />
        </svg>
      )}
      <div
        style={{
          position: 'absolute', left: x - cardW / 2, top: y - cardH / 2, width: cardW, height: cardH, background: M.paper, padding: pad, boxSizing: 'border-box',
          transform: `rotate(${rot}deg) scale(${0.9 + 0.1 * Math.min(1, s)}) translateY(${(1 - Math.min(1, s)) * 14}px)`, opacity: Math.min(1, s * 1.6),
          boxShadow: '0 18px 44px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ width: w, height: h, overflow: 'hidden', background: '#111' }}>
          <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0]}% ${focus[1]}%`, filter: GRADE[grade], transform: `scale(${push})`, transformOrigin: `${focus[0]}% ${focus[1]}%` }} />
        </div>
        {caption && (
          <div style={{ height: capH, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: FONT, color: M.paperInk, paddingTop: pad * 0.4 }}>
            <span style={{ fontWeight: 600, fontSize: Math.round(Math.max(17, w * 0.044)), letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{caption}</span>
            {credit && <span style={{ fontWeight: 500, fontSize: Math.round(Math.max(11, w * 0.026)), opacity: 0.55, whiteSpace: 'nowrap' }}>{credit}</span>}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export type PhotoFullProps = {
  t: number;
  src: string;
  from: number;
  until: number;
  /** Điểm máy nhìn [x%, y%] lúc đầu → lúc cuối (mặc định đứng yên ở giữa-trên). */
  focus?: [number, number];
  focusTo?: [number, number];
  /** Độ phóng đầu → cuối. Ảnh nhỏ (< 1600 px ngang) đừng vượt 1.15. */
  zoom?: [number, number];
  grade?: Grade;
  /** 'cover' lấp đầy khung (cắt mép) | 'contain' giữ trọn ảnh trên nền chính ảnh đó làm mờ (ảnh dọc, ảnh chân dung, trang tài liệu). */
  fit?: 'cover' | 'contain';
  caption?: string;
  credit?: string;
  /** Làm tối ảnh 0..1 khi cần chữ / ảnh ghim đè lên. */
  dim?: number;
};

export const PhotoFull: React.FC<PhotoFullProps> = ({ t, src, from, until, focus = [50, 42], focusTo, zoom = [1.04, 1.14], grade = 'mono', fit = 'cover', caption, credit, dim = 0 }) => {
  if (t < from - 0.5 || t > until + 0.5) return null;
  const p = prog(t, from, until, (v) => v);
  const vis = prog(t, from - 0.01, from + 0.5) * (1 - prog(t, until - 0.4, until));
  const z = lerp(zoom[0], zoom[1], p);
  const fx = lerp(focus[0], (focusTo ?? focus)[0], p), fy = lerp(focus[1], (focusTo ?? focus)[1], p);
  const cap = caption ? prog(t, from + 0.5, from + 1.0) : 0;
  return (
    <AbsoluteFill style={{ background: '#05080c', opacity: vis, overflow: 'hidden' }}>
      {fit === 'contain' && <Img src={src} style={{ position: 'absolute', inset: -60, width: 'calc(100% + 120px)', height: 'calc(100% + 120px)', objectFit: 'cover', filter: `${GRADE[grade] === 'none' ? '' : GRADE[grade]} blur(34px) brightness(0.42)` }} />}
      <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, objectPosition: `${fx}% ${fy}%`, filter: GRADE[grade], transform: `scale(${z})`, transformOrigin: `${fx}% ${fy}%` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 85% 90% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)' }} />
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(4,8,14,${dim})` }} />}
      {caption && (
        <div style={{ position: 'absolute', left: 96, bottom: 84, opacity: cap, transform: `translateY(${(1 - cap) * 10}px)`, fontFamily: FONT, color: M.ink, textShadow: '0 2px 18px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.7)' }}>
          <div style={{ width: 54, height: 3, background: M.amber, marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: 34, letterSpacing: '-0.015em' }}>{caption}</div>
          {credit && <div style={{ fontWeight: 500, fontSize: 17, opacity: 0.6, marginTop: 5 }}>{credit}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};
