// Giới thiệu NHÂN VẬT khi lời đọc nhắc tên một người. Bốn kiểu, chọn theo vai của người đó trong câu chuyện (đừng dùng một kiểu cho cả phim):
// - <PersonCutout>: cắt giấy — người tách nền, viền trắng như cắt từ báo, dán lên bản đồ kèm mẩu giấy xé ghi tên. Nhân vật chính, xuất hiện nhiều lần.
// - <PersonNews>:   thời sự — dải tên chạy ngang dưới khung kèm ô ảnh. Nhân vật phụ, nhắc nhanh, không dừng nhịp.
// - <PersonDossier>: hồ sơ — thẻ hồ sơ mật có ảnh kẹp ghim, các dòng gõ máy chữ, dấu đỏ. Khi lời đọc kể lý lịch / chức vụ / thành tích.
// - <PersonTitle>:  phim tài liệu — chân dung chiếm nửa khung, tên cỡ lớn. Lần đầu ra mắt nhân vật trung tâm, hoặc lúc nói về số phận của họ.
// Tất cả là lớp HTML theo màn hình 1920x1080, đặt NGOÀI <Cam2D>. Chữ đúng ngôn ngữ voice.
import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { loadFont as loadMono } from '@remotion/google-fonts/IBMPlexMono';
import { loadFont as loadTitle } from '@remotion/google-fonts/SairaExtraCondensed';
import { lerp, prog, useSpring } from '@core/time';
import { FONT, M } from './theme';
import type { Grade } from './photo';

const SUB = { subsets: ['latin', 'vietnamese'] as ('latin' | 'vietnamese')[] };
const MONO = loadMono('normal', { weights: ['400', '600'], ...SUB }).fontFamily;
const TITLE = loadTitle('normal', { weights: ['600', '700'], ...SUB }).fontFamily;

const GRADE: Record<Grade, string> = {
  none: '',
  mono: 'grayscale(1) contrast(1.12)',
  warm: 'grayscale(1) sepia(0.42) contrast(1.08)',
  cold: 'grayscale(0.85) contrast(1.1) hue-rotate(185deg) saturate(1.3)',
};
const outOf = (t: number, until?: number, d = 0.35) => (until === undefined ? 1 : 1 - prog(t, until - d, until));
/** Mép giấy xé: đa giác răng cưa tất định theo seed. */
const torn = (seed: number, n = 22, depth = 3.2) => {
  const r = (i: number) => { const x = Math.sin((i + seed * 13.7) * 127.1) * 43758.5453; return x - Math.floor(x); };
  const top = Array.from({ length: n + 1 }, (_, i) => `${((i / n) * 100).toFixed(1)}% ${(r(i) * depth).toFixed(1)}%`);
  const bot = Array.from({ length: n + 1 }, (_, i) => `${(100 - (i / n) * 100).toFixed(1)}% ${(100 - r(i + 50) * depth * 1.6).toFixed(1)}%`);
  return `polygon(${[...top, ...bot].join(', ')})`;
};

type Base = { t: number; from: number; until?: number; name: string; role?: string };

/**
 * Cắt giấy. `src` PHẢI là ảnh đã tách nền (img.py cutout → PNG trong suốt). `x` = tâm ngang, chân ảnh chạm `bottom` (mặc định mép dưới khung);
 * `h` = chiều cao hình người. Người bật lên từ dưới, mẩu giấy xé ghi tên dán chéo lên ngực. `flip` để nhân vật nhìn vào giữa khung.
 */
export const PersonCutout: React.FC<Base & { src: string; x?: number; h?: number; bottom?: number; aspect?: number; tilt?: number; flip?: boolean; grade?: Grade; accent?: string; tagSide?: 'left' | 'right'; note?: string }> = ({
  t, from, until, name, role, src, x = 400, h = 820, bottom = 1080, aspect = 0.7, tilt = -3, flip, grade = 'mono', accent = M.amber, tagSide = 'right', note,
}) => {
  const s = useSpring(t, from, 13, 170);
  const s2 = useSpring(t, from + 0.28, 12, 190);
  const out = outOf(t, until);
  if (t < from || out <= 0.004) return null;
  const w = h * aspect, e = Math.max(4, Math.round(h * 0.008));
  const sticker = `drop-shadow(${e}px 0 0 #fbf7ee) drop-shadow(-${e}px 0 0 #fbf7ee) drop-shadow(0 ${e}px 0 #fbf7ee) drop-shadow(0 -${e}px 0 #fbf7ee) drop-shadow(0 22px 26px rgba(0,0,0,0.55))`;
  const sway = Math.sin((t - from) * 0.9) * 0.5;
  const tagW = Math.max(360, name.length * 30 + 90);
  const tagX = tagSide === 'right' ? x + w * 0.08 : x - w * 0.08 - tagW;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: out }}>
      <div style={{ position: 'absolute', left: x - w / 2, top: bottom - h, width: w, height: h, transformOrigin: '50% 100%', transform: `translateY(${(1 - Math.min(1, s)) * h * 0.45 + (1 - out) * 60}px) rotate(${tilt + sway}deg)`, opacity: Math.min(1, s * 2.2) }}>
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%', filter: `${GRADE[grade]} ${sticker}`, transform: flip ? 'scaleX(-1)' : undefined }} />
      </div>
      <div style={{ position: 'absolute', left: tagX, top: bottom - h * 0.36, width: tagW, transformOrigin: tagSide === 'right' ? '0% 50%' : '100% 50%', transform: `rotate(${tagSide === 'right' ? -4 : 3.5}deg) scale(${0.55 + 0.45 * Math.min(1.08, s2)})`, opacity: Math.min(1, s2 * 2.4), filter: 'drop-shadow(0 12px 16px rgba(0,0,0,0.5))' }}>
        <div style={{ background: M.paper, clipPath: torn(name.length), padding: '22px 34px 26px', fontFamily: FONT, color: M.paperInk }}>
          {note && <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 17, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b2a22', marginBottom: 4 }}>{note}</div>}
          <div style={{ fontWeight: 700, fontSize: 50, letterSpacing: '-0.025em', lineHeight: 1.02 }}>{name}</div>
          {role && <div style={{ fontWeight: 500, fontSize: 24, opacity: 0.74, marginTop: 6, lineHeight: 1.15 }}>{role}</div>}
        </div>
        <div style={{ position: 'absolute', left: 30, bottom: 12, width: 110 * Math.min(1, s2), height: 7, background: accent, transform: 'rotate(-1.2deg)' }} />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Thời sự: dải tên ở góc dưới (lower third). Ô ảnh vuông bên trái, băng màu mang tên chạy ra, băng tối mang chức vụ chạy ra sau. `chip` = nhãn nhỏ phía trên
 * (vd "TƯ LỆNH MẶT TRẬN", "1968"). Không che vùng giữa khung nên dùng được khi bản đồ đang diễn biến.
 */
export const PersonNews: React.FC<Base & { src: string; x?: number; y?: number; chip?: string; focus?: [number, number]; grade?: Grade; accent?: string; width?: number }> = ({
  t, from, until, name, role, src, x = 110, y = 800, chip, focus = [50, 28], grade = 'mono', accent = M.red, width,
}) => {
  const out = outOf(t, until, 0.3);
  if (t < from || out <= 0.004) return null;
  const a = prog(t, from, from + 0.32), b = prog(t, from + 0.14, from + 0.52), c = prog(t, from + 0.3, from + 0.68);
  const box = 168, barW = width ?? Math.max(520, name.length * 31 + 90);
  const wipe = (p: number) => `inset(0 ${(100 - p * 100).toFixed(1)}% 0 0)`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: out, fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: x, top: y, transform: `translateX(${(1 - out) * -40}px)` }}>
        {chip && <div style={{ position: 'absolute', left: box + 14, top: -34, background: '#0b1016', color: M.ink, fontWeight: 700, fontSize: 17, letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '5px 14px', opacity: c, transform: `translateY(${(1 - c) * 8}px)` }}>{chip}</div>}
        <div style={{ position: 'absolute', left: 0, top: 0, width: box, height: box, overflow: 'hidden', background: '#111', clipPath: `inset(${(100 - a * 100).toFixed(1)}% 0 0 0)`, boxShadow: '0 14px 30px rgba(0,0,0,0.5)' }}>
          <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0]}% ${focus[1]}%`, filter: GRADE[grade] || undefined, transform: `scale(${lerp(1.12, 1.02, a)})` }} />
        </div>
        <div style={{ position: 'absolute', left: box, top: 0, width: 8, height: box * a, background: M.ink }} />
        <div style={{ position: 'absolute', left: box + 8, top: 14, width: barW, height: 84, background: accent, clipPath: wipe(b), display: 'flex', alignItems: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.4)' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 46, letterSpacing: '-0.015em', textTransform: 'uppercase', padding: '0 28px', whiteSpace: 'nowrap', transform: `translateX(${(1 - b) * -24}px)` }}>{name}</span>
        </div>
        {role && (
          <div style={{ position: 'absolute', left: box + 8, top: 98, minWidth: barW * 0.7, width: 'max-content', height: 52, background: 'rgba(8,13,20,0.92)', clipPath: wipe(c), display: 'flex', alignItems: 'center' }}>
            <span style={{ color: M.ink, fontWeight: 500, fontSize: 25, padding: '0 28px', whiteSpace: 'nowrap', opacity: 0.92 }}>{role}</span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Hồ sơ: thẻ bìa hồ sơ, ảnh kẹp ghim góc trên, các dòng `fields` gõ máy chữ lần lượt (mỗi dòng [nhãn, nội dung], tối đa 5), dấu đỏ `stamp` đóng xuống sau cùng.
 * `fieldAt` = giây bắt đầu gõ từng dòng (để khớp lúc lời đọc nói tới chi tiết đó); bỏ trống thì gõ nối nhau.
 */
export const PersonDossier: React.FC<Base & { src: string; x?: number; y?: number; fields?: [string, string][]; fieldAt?: number[]; stamp?: string; focus?: [number, number]; grade?: Grade; tilt?: number }> = ({
  t, from, until, name, role, src, x = 1370, y = 540, fields = [], fieldAt, stamp, focus = [50, 25], grade = 'warm', tilt = 2.2,
}) => {
  const s = useSpring(t, from, 15, 150);
  const out = outOf(t, until);
  const starts = fields.map((_, i) => fieldAt?.[i] ?? from + 0.7 + i * 0.75);
  const lastAt = starts.length ? starts[starts.length - 1] + 0.9 : from + 0.9;
  const st = useSpring(t, lastAt, 9, 260);
  if (t < from || out <= 0.004) return null;
  const W = 800, H = 430, ph = 270;
  const typed = (text: string, at: number, cps = 26) => text.slice(0, Math.max(0, Math.floor((t - at) * cps)));
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: out }}>
      <div style={{ position: 'absolute', left: x - W / 2, top: y - H / 2, width: W, height: H, transform: `rotate(${tilt}deg) translateY(${(1 - Math.min(1, s)) * 40}px) scale(${0.94 + 0.06 * Math.min(1, s)})`, opacity: Math.min(1, s * 2), filter: 'drop-shadow(0 22px 34px rgba(0,0,0,0.55))' }}>
        <div style={{ position: 'absolute', left: 0, top: -30, width: 250, height: 44, background: '#c9b27a', borderRadius: '10px 10px 0 0', fontFamily: MONO, fontWeight: 600, fontSize: 16, letterSpacing: '0.16em', color: '#4a3d1f', padding: '8px 18px', boxSizing: 'border-box' }}>{role ? role.toUpperCase().slice(0, 20) : 'FILE'}</div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #d9c48c 0%, #cdb67c 100%)', borderRadius: '0 8px 8px 8px' }} />
        <div style={{ position: 'absolute', left: 22, top: 20, right: 22, bottom: 20, background: '#f3ecd8', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
          <div style={{ position: 'absolute', left: 26, top: 34, width: 214, height: ph, background: '#fff', padding: 8, boxSizing: 'border-box', transform: 'rotate(-2.5deg)', boxShadow: '0 6px 14px rgba(0,0,0,0.35)' }}>
            <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#222' }}>
              <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0]}% ${focus[1]}%`, filter: GRADE[grade] || undefined }} />
            </div>
            <div style={{ position: 'absolute', left: 78, top: -20, width: 22, height: 58, border: '4px solid #8d949c', borderRadius: 12, boxSizing: 'border-box' }} />
          </div>
          <div style={{ position: 'absolute', left: 276, top: 30, right: 26, fontFamily: MONO, color: '#1d232b' }}>
            <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 62, lineHeight: 0.95, letterSpacing: '0.01em', textTransform: 'uppercase' }}>{typed(name, from + 0.25, 30)}</div>
            <div style={{ height: 3, background: '#1d232b', margin: '14px 0 16px', width: `${prog(t, from + 0.3, from + 0.8) * 100}%` }} />
            {fields.slice(0, 5).map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', gap: 14, fontSize: 24, lineHeight: 1.6, opacity: t >= starts[i] ? 1 : 0 }}>
                <span style={{ width: 118, flexShrink: 0, fontWeight: 600, opacity: 0.55, textTransform: 'uppercase', fontSize: 16, paddingTop: 5, letterSpacing: '0.08em' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{typed(v, starts[i])}</span>
              </div>
            ))}
          </div>
          {stamp && t >= lastAt && (
            <div style={{ position: 'absolute', right: 34, bottom: 30, transform: `rotate(-11deg) scale(${2.2 - 1.2 * Math.min(1, st)})`, opacity: Math.min(0.85, st * 1.4), border: '5px solid #a8261c', color: '#a8261c', fontFamily: TITLE, fontWeight: 700, fontSize: 44, letterSpacing: '0.1em', padding: '2px 20px', textTransform: 'uppercase', mixBlendMode: 'multiply' }}>{stamp}</div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Phim tài liệu: phủ kín khung. Chân dung chiếm một nửa (`side`), nửa kia nền tối với tên cỡ lớn, vạch nhấn, chức vụ và `years`. Máy đẩy rất chậm vào mặt.
 * `src` dùng ảnh gốc (có nền) hoặc ảnh đã tách nền đều được. Cảnh giữ 3–6 s.
 */
export const PersonTitle: React.FC<Base & { src: string; until: number; side?: 'left' | 'right'; years?: string; focus?: [number, number]; grade?: Grade; accent?: string; kicker?: string }> = ({
  t, from, until, name, role, src, side = 'left', years, focus = [50, 22], grade = 'mono', accent = M.amber, kicker,
}) => {
  if (t < from - 0.2 || t > until + 0.2) return null;
  const vis = prog(t, from, from + 0.45) * (1 - prog(t, until - 0.4, until));
  const p = prog(t, from, until, (v) => v);
  const a = prog(t, from + 0.35, from + 0.9), b = prog(t, from + 0.6, from + 1.15);
  const left = side === 'left';
  const words = name.split(' ');
  const size = Math.min(170, Math.max(96, 1500 / Math.max(...words.map((w) => w.length), 6)));
  return (
    <AbsoluteFill style={{ opacity: vis, background: '#070b10', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, [left ? 'left' : 'right']: 0, width: 1000, overflow: 'hidden' }}>
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0]}% ${focus[1]}%`, filter: GRADE[grade] || undefined, transform: `scale(${lerp(1.03, 1.12, p)})`, transformOrigin: `${focus[0]}% ${focus[1]}%` }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${left ? 90 : 270}deg, rgba(7,11,16,0) 45%, rgba(7,11,16,0.75) 80%, #070b10 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,11,16,0) 60%, rgba(7,11,16,0.7) 100%)' }} />
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, [left ? 'right' : 'left']: 110, width: 800, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: left ? 'flex-start' : 'flex-end', textAlign: left ? 'left' : 'right', color: M.ink }}>
        {kicker && <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 22, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent, opacity: a, marginBottom: 18 }}>{kicker}</div>}
        <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: size, lineHeight: 0.92, textTransform: 'uppercase', letterSpacing: '0.005em' }}>
          {words.map((w, i) => {
            const q = prog(t, from + 0.35 + i * 0.12, from + 0.85 + i * 0.12);
            return <div key={i} style={{ overflow: 'hidden' }}><div style={{ transform: `translateY(${(1 - q) * 100}%)` }}>{w}</div></div>;
          })}
        </div>
        <div style={{ width: 150 * b, height: 6, background: accent, margin: '30px 0 24px' }} />
        {role && <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 34, opacity: b * 0.9, letterSpacing: '-0.01em', lineHeight: 1.2, maxWidth: 720 }}>{role}</div>}
        {years && <div style={{ fontFamily: MONO, fontWeight: 400, fontSize: 24, opacity: b * 0.6, marginTop: 12, letterSpacing: '0.08em' }}>{years}</div>}
      </div>
    </AbsoluteFill>
  );
};
