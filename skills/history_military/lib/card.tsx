// Thẻ thông tin nền giấy kaki: đầu thẻ, chân thẻ, cột số liệu, biểu đồ thanh, donut, timeline, bảng chia đôi, hộp kích thước.
// Luật: mỗi mục hiện ĐÚNG lúc lời đọc nói tới nó (`at` = mốc từ trong voice_map), một con số được tô vàng (`hi`), thẻ đứng yên sau khi dựng xong.
import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { useT } from '@core/time';
import { useShot } from './shot';
import { C, ease, MONO, SANS, STENCIL, TITLE } from './theme';

/** Nền giấy kaki có hạt. `bg` = ảnh nền mờ (asset('…')) hoà vào giấy, ghi chú thích ảnh ở <CardFooter left>. */
export const Paper: React.FC<{ bg?: string; children?: React.ReactNode }> = ({ bg, children }) => (
  <AbsoluteFill style={{ backgroundColor: C.paper }}>
    {bg ? <Img src={bg} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) contrast(1.1)', mixBlendMode: 'multiply', opacity: 0.2 }} /> : null}
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.2, mixBlendMode: 'multiply' }}>
      <filter id="hmPaperGrain"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={4} seed={7} />
        <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.32  0 0 0 0 0.2  0 0 0 1.1 -0.25" /></filter>
      <rect width="100%" height="100%" filter="url(#hmPaperGrain)" />
    </svg>
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(255,250,220,0.16) 0%, rgba(90,75,30,0.2) 100%)' }} />
    {children}
  </AbsoluteFill>
);

/** Đầu thẻ: chip đen + ngày, tiêu đề chữ hoa hẹp, đường kẻ chạy từ trái sang (đoạn đầu đậm). */
export const CardHeader: React.FC<{ chip: string; date?: string; title: string; at?: number; x?: number; y?: number; width?: number; size?: number }> = ({
  chip, date, title, at, x = 139, y = 66, width = 1642, size = 62,
}) => {
  const t = useT();
  const shot = useShot();
  const a0 = at ?? shot.from;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: ease(t, a0, 0.35) }}>
        <div style={{ background: C.ink, color: C.paper, fontFamily: STENCIL, fontWeight: 600, fontSize: 22, letterSpacing: '0.12em', padding: '3px 9px 2px' }}>{chip}</div>
        {date ? <div style={{ fontFamily: MONO, fontSize: 18, color: C.inkSoft, letterSpacing: '0.04em' }}>{date}</div> : null}
      </div>
      <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: size, color: C.ink, marginTop: 14, lineHeight: 1.05, letterSpacing: '0.02em', textTransform: 'uppercase', opacity: ease(t, a0 + 0.1, 0.4) }}>{title}</div>
      <div style={{ position: 'relative', height: 6, marginTop: 34 }}>
        <div style={{ position: 'absolute', left: 0, top: 2, height: 2, width: `${ease(t, a0 + 0.15, 0.7) * 100}%`, background: C.ink, opacity: 0.8 }} />
        <div style={{ position: 'absolute', left: 0, top: 0, height: 6, width: 86 * ease(t, a0 + 0.1, 0.35), background: C.ink }} />
      </div>
    </div>
  );
};

/** Chân thẻ: dấu đỏ + tên kênh, chú thích ảnh nền (trái), nguồn số liệu (phải, BẮT BUỘC). */
export const CardFooter: React.FC<{ source: string; left?: string; brand?: string; at?: number; x?: number; width?: number }> = ({ source, left, brand = '', at, x = 139, width = 1642 }) => {
  const t = useT();
  const shot = useShot();
  const a0 = at ?? shot.from;
  return (
    <div style={{ position: 'absolute', left: x, width, bottom: 40, display: 'flex', alignItems: 'center', gap: 16, opacity: ease(t, a0 + 0.2, 0.5),
      borderTop: '1px solid rgba(27,25,19,0.16)', paddingTop: 14, fontFamily: SANS, fontSize: 17, color: C.inkSoft }}>
      {brand ? <><div style={{ width: 22, height: 22, borderRadius: 11, background: C.red }} />
        <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 18, letterSpacing: '0.2em', color: C.ink }}>{brand}</div></> : null}
      <div style={{ marginLeft: brand ? 10 : 0 }}>{left}</div>
      <div style={{ marginLeft: 'auto' }}>{source}</div>
    </div>
  );
};

export type Stat = { at: number; n: string; label: string; hi?: boolean };
/** 2–4 cột số liệu, mỗi cột hiện ở `at` (mốc từ đọc con số đó). Đúng MỘT cột `hi`. */
export const StatColumns: React.FC<{ stats: Stat[]; x?: number; width?: number; top?: number }> = ({ stats, x = 139, width = 1642, top = 376 }) => {
  const t = useT();
  const w = width / Math.max(stats.length, 2);
  // con số không bao giờ tràn sang cột bên: co cỡ chữ theo số ký tự dài nhất và bề ngang cột
  const longest = Math.max(...stats.map((c) => c.n.length));
  const size = Math.round(Math.min(132, (w - 90) / (longest * 0.47)));
  return (
    <>
      {stats.map((c, i) => { const a = ease(t, c.at, 0.4); return (
        <React.Fragment key={i}>
          <div style={{ position: 'absolute', left: x + i * w, top, width: i === 0 ? 2 : 1, height: 492 * ease(t, c.at - 0.25, 0.5), background: C.ink, opacity: i === 0 ? 0.85 : 0.3 }} />
          <div style={{ position: 'absolute', left: x + i * w + 40, top: top + 172, opacity: a, transform: `translateY(${(1 - a) * 10}px)` }}>
            <span style={{ fontFamily: TITLE, fontWeight: 700, fontSize: size, lineHeight: 1, color: C.ink, padding: '4px 10px 0', marginLeft: -10, whiteSpace: 'nowrap',
              background: c.hi ? `linear-gradient(90deg, ${C.yellow} ${ease(t, c.at + 0.25, 0.35) * 100}%, transparent 0)` : 'none' }}>{c.n}</span>
            <div style={{ fontFamily: MONO, fontSize: 27, color: C.ink, opacity: 0.82, marginTop: 26, whiteSpace: 'pre-line', lineHeight: 1.4, maxWidth: w - 70 }}>{c.label}</div>
          </div>
        </React.Fragment>); })}
    </>
  );
};

export type Bar = { at: number; label: string; value: number; text?: string; hi?: boolean };
/** Biểu đồ thanh ngang: mỗi thanh mọc ra ở `at`. `max` = giá trị ứng với hết chiều rộng. */
export const BarChart: React.FC<{ bars: Bar[]; max?: number; x?: number; top?: number; width?: number }> = ({ bars, max, x = 139, top = 400, width = 1300 }) => {
  const t = useT();
  const m = max ?? Math.max(...bars.map((b) => b.value));
  const first = Math.min(...bars.map((b) => b.at));
  return (
    <>
      <div style={{ position: 'absolute', left: x + 190, top: top - 30, width: 2, height: (bars.length * 104 + 40) * ease(t, first - 0.3, 0.5), background: C.ink, opacity: 0.8 }} />
      {bars.map((b, i) => { const p = ease(t, b.at, 0.7); return (
        <div key={i} style={{ position: 'absolute', left: x, top: top + i * 104, height: 64, display: 'flex', alignItems: 'center', opacity: ease(t, b.at, 0.3) }}>
          <div style={{ width: 170, textAlign: 'right', fontFamily: TITLE, fontWeight: 700, fontSize: 34, color: C.ink, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{b.label}</div>
          <div style={{ marginLeft: 22, height: 64, width: (width - 200) * (b.value / m) * p, background: b.hi ? C.yellow : C.ink }} />
          <div style={{ marginLeft: 18, fontFamily: TITLE, fontWeight: 700, fontSize: 40, color: C.ink, opacity: ease(t, b.at + 0.45, 0.3) }}>{b.text ?? b.value}</div>
        </div>); })}
    </>
  );
};

export type Slice = { at: number; label: string; value: number; sub?: string; tone?: 'ink' | 'mid' | 'light' | 'hi' };
/** Donut: tổng ở giữa, từng phần quét ra ở `at` kèm dòng chú giải bên phải. */
export const Donut: React.FC<{ total: string; unit?: string; slices: Slice[]; cx?: number; cy?: number; r?: number }> = ({ total, unit, slices, cx = 520, cy = 600, r = 190 }) => {
  const t = useT();
  const sum = slices.reduce((n, s) => n + s.value, 0);
  const R = r - 38, LEN = 2 * Math.PI * R;
  const TONE = { ink: C.ink, mid: '#6b6348', light: '#a59a70', hi: C.yellow };
  let acc = 0;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(27,25,19,0.14)" strokeWidth={76} />
        {slices.map((s, i) => { const f = s.value / sum, off = acc; acc += f; const p = ease(t, s.at, 0.8);
          return <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={TONE[s.tone ?? (['mid', 'light', 'ink'] as const)[i % 3]]} strokeWidth={76}
            strokeDasharray={`${LEN * f * p} ${LEN}`} strokeDashoffset={-LEN * off} transform={`rotate(-90 ${cx} ${cy})`} />; })}
      </svg>
      <div style={{ position: 'absolute', left: cx - 200, width: 400, top: cy - 50, textAlign: 'center' }}>
        <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 72, color: C.ink, lineHeight: 1 }}>{total}</div>
        {unit ? <div style={{ fontFamily: MONO, fontSize: 22, color: C.inkSoft, marginTop: 6 }}>{unit}</div> : null}
      </div>
      {slices.map((s, i) => (
        <div key={i} style={{ position: 'absolute', left: cx + r + 150, top: cy - (slices.length * 104) / 2 + i * 104, width: 760, display: 'flex', alignItems: 'center', gap: 20, opacity: ease(t, s.at, 0.4) }}>
          <div style={{ width: 22, height: 22, background: TONE[s.tone ?? (['mid', 'light', 'ink'] as const)[i % 3]] }} />
          <div><div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 38, color: C.ink, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
            {s.sub ? <div style={{ fontFamily: MONO, fontSize: 20, color: C.inkSoft }}>{s.sub}</div> : null}</div>
          <div style={{ marginLeft: 'auto', fontFamily: TITLE, fontWeight: 700, fontSize: 44, color: C.ink }}>{`${((100 * s.value) / sum).toFixed(1).replace('.', ',')}%`}</div>
        </div>))}
    </>
  );
};

export type Mark = { at: number; pos: number; year: string; label: string; hi?: boolean; photo?: string };
/** Timeline ngang: `pos` 0..1 dọc trục; mỗi mốc hiện ở `at`; `photo` = asset('…') đặt phía trên mốc (ảnh kiểu polaroid). */
export const TimelineCard: React.FC<{ marks: Mark[]; x?: number; y?: number; width?: number }> = ({ marks, x = 200, y = 820, width = 1520 }) => {
  const t = useT();
  const first = Math.min(...marks.map((m) => m.at));
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: y, height: 3, width: width * ease(t, first - 0.4, 0.9), background: C.ink }} />
      {marks.map((m, i) => { const a = ease(t, m.at, 0.4), px = x + width * m.pos; return (
        <React.Fragment key={i}>
          <div style={{ position: 'absolute', left: px - 9, top: y - 8, width: 18, height: 18, borderRadius: 9, background: m.hi ? C.yellow : C.ink, border: `3px solid ${C.ink}`, transform: `scale(${a})` }} />
          <div style={{ position: 'absolute', left: px - 200, width: 400, top: y + 26, textAlign: 'center', opacity: a }}>
            <span style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 30, color: C.ink, background: m.hi ? C.yellow : 'none', padding: '0 8px' }}>{m.year}</span>
            <div style={{ fontFamily: MONO, fontSize: 20, color: C.inkSoft, marginTop: 6, textTransform: 'uppercase' }}>{m.label}</div>
          </div>
          {m.photo ? <div style={{ position: 'absolute', left: px - 120, top: y - 330, width: 240, height: 290, padding: 10, background: '#e9e2c6', boxShadow: '0 6px 18px rgba(0,0,0,0.3)', opacity: a,
            transform: `rotate(${i % 2 ? 2 : -2.5}deg) translateY(${(1 - a) * 14}px)` }}><Img src={m.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div> : null}
        </React.Fragment>); })}
    </>
  );
};

/** Chia đôi: `left` (ảnh / footage, kèm nhãn và nguồn riêng) + bảng giấy kaki trượt vào từ phải chứa `children`. `split` = px mép chia. */
export const SplitPanel: React.FC<{ left: React.ReactNode; children: React.ReactNode; split?: number }> = ({ left, children, split = 1100 }) => {
  const t = useT();
  const { from } = useShot();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: split + 2, height: 1080, overflow: 'hidden' }}>{left}</div>
      <div style={{ position: 'absolute', left: split + (1 - ease(t, from, 0.55)) * (1920 - split), top: 0, width: 1920 - split, height: 1080, overflow: 'hidden', borderLeft: `3px solid ${C.ink}` }}>
        <Paper>{children}</Paper>
      </div>
    </AbsoluteFill>
  );
};

/** Tiêu đề nhỏ của bảng phải trong <SplitPanel>. */
export const PanelHead: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => {
  const t = useT();
  const { from } = useShot();
  return (
    <div style={{ position: 'absolute', left: 88, top: 100, right: 60 }}>
      <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 21, letterSpacing: '0.2em', color: C.inkSoft, textTransform: 'uppercase' }}>{kicker}</div>
      <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 50, color: C.ink, marginTop: 10, letterSpacing: '0.02em' }}>{title}</div>
      <div style={{ height: 2, background: C.ink, marginTop: 16, width: `${ease(t, from + 0.3, 0.7) * 100}%` }} />
    </div>
  );
};

/** Hộp tối minh hoạ một tiết diện / kích thước thật, hai thước đo hiện lần lượt (`wAt`, `hAt`). Tỉ lệ hộp = tỉ lệ thật. */
export const DimensionBox: React.FC<{ w: string; h: string; wAt: number; hAt: number; ratio: number; x?: number; y?: number; height?: number; hi?: 'w' | 'h' }> = ({
  w, h, wAt, hAt, ratio, x = 206, y = 380, height = 522, hi = 'h',
}) => {
  const t = useT();
  const { from } = useShot();
  const bw = height * ratio, a1 = ease(t, wAt, 0.4), a2 = ease(t, hAt, 0.4);
  const tag = (on: boolean): React.CSSProperties => ({ fontFamily: TITLE, fontWeight: 700, fontSize: 34, color: C.ink, background: on ? C.yellow : 'none', padding: '2px 10px' });
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: y, width: bw, height: height * ease(t, from + 0.7, 0.7), background: '#231f18', borderRadius: 16 }} />
      <div style={{ position: 'absolute', left: x + bw + 34, top: y, height, width: 2, background: C.ink, opacity: a2, transform: `scaleY(${a2})`, transformOrigin: 'top' }} />
      <div style={{ position: 'absolute', left: x + bw + 52, top: y + height / 2 - 22, opacity: a2, ...tag(hi === 'h') }}>{h}</div>
      <div style={{ position: 'absolute', left: x, top: y + height + 34, width: bw, height: 2, background: C.ink, opacity: a1, transform: `scaleX(${a1})`, transformOrigin: 'left' }} />
      <div style={{ position: 'absolute', left: x - 60, width: bw + 120, top: y + height + 46, textAlign: 'center', opacity: a1 }}><span style={tag(hi === 'w')}>{w}</span></div>
    </>
  );
};
