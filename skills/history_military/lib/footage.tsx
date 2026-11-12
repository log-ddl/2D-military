// Footage và ảnh tư liệu: một bộ chỉnh màu thống nhất cho cả phim (giảm bão hoà, ngả xanh rêu, mềm nét, vignette), đẩy máy rất chậm.
import React, { useContext } from 'react';
import { AbsoluteFill, Img, Sequence, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { noise2D } from '@remotion/noise';
import { lerp, prog, SceneStart, useT } from '@core/time';
import { useShot } from './shot';

/**
 * Cú đẩy máy "có người cầm": tiến độ vào chậm – ra chậm (không đều tăm tắp), cộng trôi rất nhẹ theo nhiễu (px) và thở phóng ±0,3%.
 * `seed` khác nhau cho mỗi shot để không shot nào trôi giống shot nào.
 */
export const drift = (t: number, a: number, b: number, seed: number, amp = 5) => {
  const p = prog(t, a, b, (x) => x * x * (3 - 2 * x) * 0.7 + x * 0.3);
  return { p, x: noise2D('hx' + seed, t * 0.22, 0) * amp, y: noise2D('hy' + seed, 0, t * 0.19) * amp * 0.7, breathe: 1 + noise2D('hb' + seed, t * 0.13, 1) * 0.003 };
};

/** Rung cửa phim (gate weave) của máy chiếu 16mm: vài phần mười px, nhảy theo từng khung. Áp cho phim cũ. */
const weave = (frameT: number, seed: number) => `translate(${(noise2D('wx' + seed, frameT * 9, 0) * 0.9).toFixed(2)}px, ${(noise2D('wy' + seed, 0, frameT * 11) * 1.3).toFixed(2)}px)`;

export type Grade = 'archive' | 'color' | 'none';
const FILTER: Record<Grade, string> = {
  archive: 'sepia(0.35) saturate(0.6) contrast(1.04) brightness(1.0) blur(0.6px)', // phim 16mm cũ, ngả xanh rêu
  color: 'saturate(0.82) contrast(1.04)',                                          // ảnh màu chất lượng tốt, giữ gần nguyên
  none: 'none',
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <>
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 72% 78% at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.4) 88%, rgba(0,0,0,0.8) 100%)', opacity: strength }} />
    <AbsoluteFill style={{ boxShadow: 'inset 0 0 70px 18px rgba(0,0,0,0.8)', borderRadius: 26, opacity: strength }} />
  </>
);

const Tint: React.FC<{ grade: Grade }> = ({ grade }) => grade !== 'archive' ? null : (
  <>
    <AbsoluteFill style={{ backgroundColor: '#5c7a56', mixBlendMode: 'soft-light', opacity: 0.6 }} />
    <AbsoluteFill style={{ backgroundColor: '#16241c', mixBlendMode: 'lighten', opacity: 0.7 }} />
  </>
);

/**
 * Đoạn phim phủ khung, chạy từ giây `in` của file. Đặt trong <Shot>: mặc định phủ trọn shot; `at`/`until` để chia shot thành vài đoạn.
 * `src` = asset('aNNN') (viết thẳng asset('…') trong cảnh để build quét được). `zoom` = [đầu, cuối], đẩy vào chậm; `y` = % neo dọc khi cắt 4:3 → 16:9.
 * `rate` < 1 làm chậm (đoạn nguồn ngắn hơn shot); kiểm `in + (until - at) * rate ≤ độ dài file`.
 */
export const Clip: React.FC<{ src: string; in: number; at?: number; until?: number; zoom?: [number, number]; y?: number; grade?: Grade; rate?: number; vignette?: number }> = ({
  src, in: start, at, until, zoom = [1.05, 1.11], y = 50, grade = 'archive', rate = 1, vignette = 1,
}) => {
  const { fps } = useVideoConfig();
  const sceneStart = useContext(SceneStart);
  const shot = useShot();
  const t = useT();
  const a = at ?? shot.from, b = until ?? shot.to;
  if (t < a || t >= b) return null;
  const d = drift(t, a, b, a);
  const s = lerp(zoom[0], zoom[1], d.p) * d.breathe;
  return (
    <Sequence from={Math.round((a - sceneStart) * fps)} durationInFrames={Math.max(1, Math.round((b - a) * fps))} layout="none">
      <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
        <Video src={src} trimBefore={Math.round(start * fps)} playbackRate={rate} muted objectFit="cover"
          style={{ width: '100%', height: '100%', objectPosition: `50% ${y}%`, transform: `translate(${d.x}px, ${d.y}px) ${grade === 'archive' ? weave(t, a) : ''} scale(${s})`, filter: FILTER[grade] }} />
        <Tint grade={grade} />
        <Vignette strength={vignette} />
      </AbsoluteFill>
    </Sequence>
  );
};

/**
 * Ảnh tĩnh phủ khung. `focus` = [x%, y%] điểm neo; `zoom` = [đầu, cuối] suốt khoảng at→until (mặc định trọn shot).
 * `blend="multiply"` cho ảnh quét giấy trắng đặt trên nền kem.
 */
export const Photo: React.FC<{ src: string; focus?: [number, number]; zoom?: [number, number]; at?: number; until?: number; grade?: Grade; vignette?: number; blend?: 'multiply'; style?: React.CSSProperties }> = ({
  src, focus = [50, 50], zoom = [1.0, 1.06], at, until, grade = 'color', vignette = 0, blend, style,
}) => {
  const shot = useShot();
  const t = useT();
  const d = drift(t, at ?? shot.from, until ?? shot.to, shot.from + 3, 4);
  const s = lerp(zoom[0], zoom[1], d.p) * d.breathe * 1.012;
  return (
    <>
      <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0]}% ${focus[1]}%`,
        transform: `translate(${d.x}px, ${d.y}px) scale(${s})`, transformOrigin: `${focus[0]}% ${focus[1]}%`, filter: blend ? 'sepia(0.3) contrast(1.08)' : FILTER[grade], mixBlendMode: blend, ...style }} />
      {blend ? null : <Tint grade={grade} />}
      {vignette ? <Vignette strength={vignette} /> : null}
    </>
  );
};

/** Đẩy thẳng vào một điểm của ảnh cho tới khi khung tối hẳn (kết đoạn mở đầu, dẫn vào thẻ tên phim). */
export const PushToBlack: React.FC<{ src: string; focus: [number, number]; zoom?: [number, number]; blackFrom?: number }> = ({ src, focus, zoom = [1.15, 4.2], blackFrom = 0.6 }) => {
  const shot = useShot();
  const t = useT();
  const p = prog(t, shot.from, shot.to, (x) => x * x);
  return (
    <>
      <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0]}% ${focus[1]}%`,
        transform: `scale(${lerp(zoom[0], zoom[1], p)})`, transformOrigin: `${focus[0]}% ${focus[1]}%`, filter: `saturate(${lerp(0.8, 0.5, p)}) brightness(${lerp(0.8, 0.3, p)})` }} />
      <Vignette />
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: prog(t, lerp(shot.from, shot.to, blackFrom), shot.to) }} />
    </>
  );
};

/**
 * Lớp phim phủ lên TOÀN BỘ khung (footage lẫn thẻ, chữ, bản đồ) để mọi thứ nằm chung một "cuộn phim": hạt đổi theo từng khung,
 * xước dọc thỉnh thoảng, nhấp nháy sáng rất nhẹ, mép tối. <Shot> tự gắn; `amount` 0 = tắt, 1 = mặc định, phim cũ nặng có thể 1.3.
 */
export const FilmLook: React.FC<{ amount?: number }> = ({ amount = 1 }) => {
  const t = useT();
  const { fps } = useVideoConfig();
  const f = Math.round(t * fps);
  if (amount <= 0) return null;
  const flick = 1 + noise2D('flick', f * 0.7, 0) * 0.018 * amount;
  const sx = ((noise2D('scr', Math.floor(f / 9), 0) + 1) / 2) * 1920;
  const scratch = noise2D('scrOn', Math.floor(f / 9), 3) > 0.45;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.34 * amount }}>
        <filter id={`hmGrain${f % 8}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 997} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#hmGrain${f % 8})`} />
      </svg>
      {scratch ? <div style={{ position: 'absolute', left: sx, top: 0, width: 1.5, height: '100%', background: 'rgba(255,255,255,0.10)' }} /> : null}
      <AbsoluteFill style={{ backgroundColor: flick > 1 ? '#fff' : '#000', opacity: Math.abs(flick - 1) }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 85% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.28) 100%)' }} />
    </AbsoluteFill>
  );
};
