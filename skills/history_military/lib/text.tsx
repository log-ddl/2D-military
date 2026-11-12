// Chữ trên hình: dòng nguồn, băng trích dẫn, nhãn góc dưới, nhãn chương, thẻ tên phim, thẻ chuyển đoạn, thẻ trích dẫn gõ máy chữ.
// Chữ là TÓM TẮT câu đang đọc (con số, tên, trích dẫn), không phải phụ đề. Mỗi khung một điểm nhấn.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { lerp, prog, useT } from '@core/time';
import { useShot } from './shot';
import { C, ease, inOut, MONO, SANS, STENCIL, TITLE } from './theme';

/** Dòng ghi nguồn nhỏ góc dưới phải. Khuôn: `mô tả, thời gian · Nguồn/Ảnh: nơi giữ + mã`. <Shot credit="…"> tự gọi. */
export const Credit: React.FC<{ text: string; dark?: boolean; left?: number; right?: number }> = ({ text, dark, left, right = 64 }) => (
  <div style={{ position: 'absolute', bottom: 34, right: left === undefined ? right : undefined, left, fontFamily: SANS, fontSize: 17, letterSpacing: '0.01em',
    color: dark ? 'rgba(27,25,19,0.6)' : 'rgba(255,255,255,0.56)' }}>{text}</div>
);

/** Băng trích dẫn tối giữa khung, đè lên footage: câu trích NGẮN (≤ ~55 ký tự) + dòng nguồn. Câu dài dùng <QuoteCard>. */
export const QuoteBand: React.FC<{ text: string; sub: string; at?: number; until?: number; y?: number; size?: number }> = ({ text, sub, at, until, y = 500, size = 62 }) => {
  const t = useT();
  const shot = useShot();
  const a = at ?? shot.from + 0.4;
  const p = inOut(t, a, until);
  if (p <= 0) return null;
  const q = ease(t, a + 0.12, 0.5);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y - 124, height: 248, opacity: p, background: 'rgba(12,13,13,0.66)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 70 * q, height: 3, background: C.red, marginBottom: 26 }} />
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: size, color: C.white, opacity: q, transform: `translateY(${(1 - q) * 10}px)` }}>{text}</div>
      <div style={{ fontFamily: SANS, fontSize: 29, color: 'rgba(243,241,234,0.8)', marginTop: 14, opacity: ease(t, a + 0.35, 0.5) }}>{sub}</div>
    </div>
  );
};

/** Nhãn góc dưới trái: gạch đỏ + dòng chính (tên người / đơn vị: chữ hoa hẹp; `mono` cho con số, ngày) + dòng phụ. */
export const LowerLabel: React.FC<{ text: string; sub?: string; mono?: boolean; at?: number; until?: number; x?: number; bottom?: number }> = ({
  text, sub, mono, at, until, x = 66, bottom = 96,
}) => {
  const t = useT();
  const shot = useShot();
  const a = at ?? shot.from + 0.35;
  const p = inOut(t, a, until ?? shot.to + 1, 0.4, 0.25);
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: x, bottom, opacity: p, transform: `translateY(${(1 - ease(t, a, 0.5)) * 8}px)`, textShadow: '0 2px 14px rgba(0,0,0,0.75)' }}>
      <div style={{ width: 62 * ease(t, a, 0.5), height: 3, background: C.red, marginBottom: 14 }} />
      <div style={mono
        ? { fontFamily: MONO, fontSize: 30, color: C.white, letterSpacing: '0.04em' }
        : { fontFamily: TITLE, fontWeight: 700, fontSize: 58, color: C.white, letterSpacing: '0.012em', lineHeight: 1 }}>{text}</div>
      {sub ? <div style={{ fontFamily: SANS, fontSize: 28, color: 'rgba(243,241,234,0.86)', marginTop: 8 }}>{sub}</div> : null}
    </div>
  );
};

/** Nhãn chương góc trên trái, đè lên shot đầu chương ("CHƯƠNG I" / "ĐẤT"). Giữ 3–4 giây. */
export const ChapterMark: React.FC<{ index: string; title: string; at?: number; hold?: number }> = ({ index, title, at, hold = 3.6 }) => {
  const t = useT();
  const shot = useShot();
  const a = at ?? shot.from + 0.3;
  const p = inOut(t, a, a + hold);
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 66, top: 60, opacity: p, textShadow: '0 2px 14px rgba(0,0,0,0.75)' }}>
      <div style={{ fontFamily: STENCIL, fontWeight: 500, fontSize: 24, color: 'rgba(243,241,234,0.8)', letterSpacing: '0.16em' }}>{index}</div>
      <div style={{ width: 40 * ease(t, a, 0.5), height: 3, background: C.red, margin: '10px 0 8px' }} />
      <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 64, color: C.white, letterSpacing: '0.03em', lineHeight: 1 }}>{title}</div>
    </div>
  );
};

/** Thẻ tên phim nền đen, đặt sau cụm cao trào của đoạn mở đầu (khoảng chỉ có nhạc). Dùng làm cả nội dung của một <Shot>. */
export const TitleCard: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => {
  const t = useT();
  const { from, to } = useShot();
  const out = 1 - prog(t, to - 0.55, to);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, #17191a 0%, #0a0b0b 70%)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 124, color: C.white, letterSpacing: '0.035em', opacity: ease(t, from + 0.25, 0.9) * out,
        transform: `scale(${lerp(0.97, 1.0, prog(t, from, to, (x) => x))})` }}>{title}</div>
      <div style={{ width: 96 * ease(t, from + 0.75, 0.6), height: 3, background: C.red, margin: '26px 0 30px' }} />
      {sub ? <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 27, color: 'rgba(243,241,234,0.62)', letterSpacing: '0.3em', opacity: ease(t, from + 1.15, 0.8) * out }}>{sub}</div> : null}
    </AbsoluteFill>
  );
};

/** Thẻ chuyển đoạn: một dòng chữ mono giữa nền tối (ngắt mạch giữa hai ý lớn, 2–4 giây). */
export const Interstitial: React.FC<{ text: string }> = ({ text }) => {
  const t = useT();
  const { from, to } = useShot();
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, #2a1f12 0%, #0a0908 75%)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: MONO, fontSize: 40, color: 'rgba(243,241,234,0.9)', letterSpacing: '0.12em', opacity: inOut(t, from + 0.2, to, 0.5, 0.4) }}>{text}</div>
    </AbsoluteFill>
  );
};

/**
 * Thẻ trích dẫn DÀI nền đen, gõ kiểu máy đánh chữ theo nhịp đọc. `lines` = các dòng đã ngắt sẵn (≤ ~28 ký tự / dòng);
 * `from`/`to` của phần gõ = lúc lời đọc bắt đầu / kết thúc câu trích (mặc định trọn shot trừ 0.8 s cuối). `original` = nguyên văn tiếng Anh.
 */
export const QuoteCard: React.FC<{ head: string; source: string; lines: string[]; original?: string; typeFrom?: number; typeTo?: number }> = ({ head, source, lines, original, typeFrom, typeTo }) => {
  const t = useT();
  const shot = useShot();
  const a = typeFrom ?? shot.from + 0.7, b = typeTo ?? shot.to - 0.8;
  const total = lines.reduce((n, l) => n + l.length, 0);
  let left = Math.round(total * prog(t, a, b, (x) => x));
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, #2a2014 0%, #0a0908 78%)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 30, letterSpacing: '0.14em', color: 'rgba(243,241,234,0.7)', opacity: ease(t, shot.from + 0.1) }}>{head}</div>
      <div style={{ fontFamily: SANS, fontSize: 26, color: 'rgba(243,241,234,0.6)', marginTop: 8, opacity: ease(t, shot.from + 0.25) }}>{source}</div>
      <div style={{ width: 70 * ease(t, shot.from + 0.35, 0.5), height: 3, background: C.red, margin: '20px 0 28px' }} />
      <div style={{ minHeight: lines.length * 62, textAlign: 'left' }}>
        {lines.map((l, i) => { const n = Math.max(0, Math.min(l.length, left)); left -= l.length;
          return <div key={i} style={{ fontFamily: MONO, fontSize: 42, lineHeight: '62px', color: C.white, whiteSpace: 'pre' }}>{l.slice(0, n)}</div>; })}
      </div>
      {original ? <div style={{ fontFamily: MONO, fontSize: 21, color: 'rgba(243,241,234,0.42)', marginTop: 26, maxWidth: 1200, textAlign: 'center', opacity: ease(t, b - 0.2, 0.6) }}>{original}</div> : null}
    </AbsoluteFill>
  );
};
