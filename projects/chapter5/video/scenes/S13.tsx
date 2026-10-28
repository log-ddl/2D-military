// S13 — Độ tản vs đạn dẫn đường (2D). 308.14 → 340.56.
// Từ trên xuống: ụ pháo trên đồng thu → hàng chục hố đạn rải rộng → đống vỏ đạn (nhìn nghiêng) → khung chèn mặt cắt
// đạn dẫn đường (GPS + cánh lái) → một viên lượn chỉnh hướng, vòng sai số co lại, trúng tâm → chồng xu giá đạn →
// trạm phá sóng làm đạn lệch → hai giá đạn: nhiều đạn thường / ít đạn dẫn đường.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Easing } from 'remotion';
import { prog, lerp, rnd, mix } from '@kit/theme';
import { useT, useSpring, handheld, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { Blast2D, Puff2D } from '@lib/2d/fx';
import { smoothPath, drawOn, type Pt } from '@lib/2d/path';
import { contours } from '@lib/2d/terrain';
import { CUE } from '../cues';

// ── Bảng màu 2D (SHOT_PLAN) ─────────────────────────────────────────────
const P = {
  paper: '#efe6d2', ink: '#2a2a26', olive: '#5f6b3a', oliveDk: '#3f4a2a', oliveLt: '#7d8a4f',
  ochre: '#b98a4a', orange: '#e8772e', teal: '#2fb3a8', red: '#d94a3a',
  brass: '#d4a845', brassDk: '#8a6424', brassLt: '#f0d27a', steel: '#8b8c86', steelDk: '#55564f',
};
const SH = [16, 7] as const; // bóng đổ nắng chiều từ phía tây → đổ về đông

// ── Thế giới nhìn từ trên xuống ───────────────────────────────────────────
const WW = 3200, WH = 2200;
const C: Pt = [1600, 1100]; // ụ pháo mục tiêu
const ease3 = Easing.bezier(0.45, 0, 0.2, 1);

// Lưới ruộng lệch ngẫu nhiên tất định
const GX = [-300, 520, 1180, 1980, 2640, 3500];
const GY = [-300, 620, 1380, 1920, 2500];
const gv = (i: number, j: number): Pt => {
  const inner = i > 0 && i < GX.length - 1 && j > 0 && j < GY.length - 1;
  return [GX[i] + (inner ? (rnd(i * 7 + j * 13) - 0.5) * 160 : 0), GY[j] + (inner ? (rnd(i * 11 + j * 5 + 3) - 0.5) * 140 : 0)];
};
const FIELD_COLS = ['#d3b474', '#a07546', '#8f9a58', '#c29a5c', '#b8a066', '#7e8a4c', '#d9bf82', '#9c7a4c'];
const PARCELS = (() => {
  const out: { pts: Pt[]; col: string; ang: number; gap: number; id: number }[] = [];
  let id = 0;
  for (let j = 0; j < GY.length - 1; j++) for (let i = 0; i < GX.length - 1; i++) {
    const pts = [gv(i, j), gv(i + 1, j), gv(i + 1, j + 1), gv(i, j + 1)];
    const k = Math.floor(rnd(i * 31 + j * 17 + 1) * FIELD_COLS.length);
    out.push({ pts, col: FIELD_COLS[k], ang: Math.round((rnd(i * 3 + j * 29) - 0.5) * 70), gap: 14 + Math.round(rnd(i + j * 9) * 14), id: id++ });
  }
  return out;
})();
// Bờ cây chạy dọc vài cạnh ruộng
const HEDGE_EDGES: [Pt, Pt][] = [
  [gv(2, 0), gv(2, 1)], [gv(2, 1), gv(2, 2)], [gv(1, 1), gv(2, 1)], [gv(3, 2), gv(4, 2)], [gv(3, 1), gv(3, 2)],
  [gv(0, 2), gv(1, 2)], [gv(4, 0), gv(4, 1)], [gv(1, 2), gv(1, 3)], [gv(3, 3), gv(3, 2)],
];
const BLOBS = (() => {
  const b: { x: number; y: number; r: number; s: number }[] = [];
  HEDGE_EDGES.forEach(([a, z], e) => {
    const len = Math.hypot(z[0] - a[0], z[1] - a[1]);
    const n = Math.floor(len / 30);
    for (let k = 0; k <= n; k++) {
      if (rnd(e * 100 + k) < 0.12) continue;
      const p = k / n;
      b.push({ x: lerp(a[0], z[0], p) + (rnd(e * 50 + k * 3) - 0.5) * 22, y: lerp(a[1], z[1], p) + (rnd(e * 70 + k * 5) - 0.5) * 22, r: 14 + rnd(e * 9 + k * 7) * 16, s: e * 100 + k });
    }
  });
  // hai cánh rừng nhỏ
  ([[2780, 380, 360], [380, 1950, 330], [2900, 1900, 240]] as const).forEach(([cx, cy, rad], w) => {
    for (let k = 0; k < 90; k++) {
      const a = rnd(w * 300 + k) * Math.PI * 2, d = Math.sqrt(rnd(w * 300 + k + 0.5)) * rad;
      b.push({ x: cx + Math.cos(a) * d * 1.3, y: cy + Math.sin(a) * d * 0.8, r: 18 + rnd(w * 40 + k * 3) * 20, s: w * 1000 + k });
    }
  });
  return b.sort((p, q) => p.y - q.y);
})();
const ROAD: Pt[] = [[-200, 1760], [500, 1600], [1000, 1480], [1500, 1520], [2050, 1420], [2600, 1240], [3400, 1290]];
const TRACK: Pt[] = [[1600, 1180], [1640, 1300], [1720, 1420], [1760, 1470]];
const CONT = contours('s13field', WW, WH, 7, 24, 700);

// ── Loạt đạn rải (s13_belt) ───────────────────────────────────────────────
const NEAR = [7, 19, 28];
const BELT = Array.from({ length: 38 }, (_, i) => {
  const u1 = Math.max(0.03, rnd(i * 3 + 1.7)), u2 = rnd(i * 3 + 2.3);
  let r = Math.min(640, 250 * Math.sqrt(-2 * Math.log(u1)) + 60);
  if (NEAR.includes(i)) r = 55 + rnd(i) * 45;
  const a = u2 * Math.PI * 2;
  return { x: C[0] + Math.cos(a) * r * 1.3, y: C[1] + Math.sin(a) * r * 0.78, at: 310.3 + i * 0.094 + (rnd(i + 0.4) - 0.5) * 0.05, r: 15 + rnd(i * 5) * 8, seed: i + 3 };
});

// ── Hình vẽ ──────────────────────────────────────────────────────────────
const ptsStr = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(' ');

const FieldArt: React.FC = React.memo(() => (
  <g>
    <rect x={-400} y={-400} width={WW + 800} height={WH + 800} fill="#c4a066" />
    <defs>
      {PARCELS.map((p) => (
        <clipPath key={p.id} id={`s13pc${p.id}`}><polygon points={ptsStr(p.pts)} /></clipPath>
      ))}
    </defs>
    {PARCELS.map((p) => {
      const cx = p.pts.reduce((s, q) => s + q[0], 0) / 4, cy = p.pts.reduce((s, q) => s + q[1], 0) / 4;
      return (
        <g key={p.id}>
          <polygon points={ptsStr(p.pts)} fill={p.col} stroke={mix(p.col, '#3a2e1e', 0.35)} strokeWidth={6} />
          <g clipPath={`url(#s13pc${p.id})`} transform={`rotate(${p.ang} ${cx} ${cy})`}>
            {Array.from({ length: 90 }, (_, k) => (
              <line key={k} x1={cx - 1400} x2={cx + 1400} y1={cy - 1260 + k * p.gap * 2} y2={cy - 1260 + k * p.gap * 2} stroke={mix(p.col, '#2a2016', 0.3)} strokeWidth={p.gap * 0.55} opacity={0.35} />
            ))}
          </g>
        </g>
      );
    })}
    {/* đường đồng mức mờ */}
    {CONT.map((c) => <path key={c.level} d={c.d} stroke={P.ink} strokeWidth={2} opacity={0.07} fill="none" />)}
    {/* đường đất + vết bánh */}
    <path d={smoothPath(ROAD)} stroke="#7a5f3a" strokeWidth={50} fill="none" opacity={0.5} transform={`translate(${SH[0] * 0.3} ${SH[1] * 0.3})`} />
    <path d={smoothPath(ROAD)} stroke="#dcc595" strokeWidth={40} fill="none" />
    <path d={smoothPath(ROAD)} stroke="#b59a68" strokeWidth={22} fill="none" strokeDasharray="60 18" opacity={0.6} />
    <path d={smoothPath(ROAD)} stroke="#e9d6aa" strokeWidth={6} fill="none" opacity={0.8} />
    <path d={smoothPath(TRACK)} stroke="#cbb07c" strokeWidth={18} fill="none" opacity={0.9} />
    {/* nông trại */}
    {([[640, 420, 150, 80, 12], [560, 540, 90, 70, -8], [2350, 1720, 120, 70, 20]] as const).map(([x, y, w, h, r], k) => (
      <g key={k} transform={`rotate(${r} ${x} ${y})`}>
        <rect x={x - w / 2 + SH[0] * 1.4} y={y - h / 2 + SH[1] * 1.4} width={w} height={h} fill="#3b3226" opacity={0.45} />
        <rect x={x - w / 2} y={y - h / 2} width={w} height={h / 2} fill="#9c4f36" stroke={P.ink} strokeWidth={3} />
        <rect x={x - w / 2} y={y} width={w} height={h / 2} fill="#7a3a28" stroke={P.ink} strokeWidth={3} />
      </g>
    ))}
    {/* cây: bóng dài trước, tán sau */}
    {BLOBS.map((b, k) => <circle key={`s${k}`} cx={b.x + SH[0] * 1.6} cy={b.y + SH[1] * 1.6} r={b.r * 1.05} fill="#2e2a1c" opacity={0.42} />)}
    {BLOBS.map((b, k) => (
      <g key={`b${k}`}>
        <circle cx={b.x} cy={b.y} r={b.r} fill={rnd(b.s) > 0.5 ? '#4a5a2c' : '#55602f'} stroke="#2d351c" strokeWidth={2} />
        <circle cx={b.x - b.r * 0.3} cy={b.y - b.r * 0.3} r={b.r * 0.5} fill="#8a9147" opacity={0.6} />
      </g>
    ))}
  </g>
));

/** Ụ pháo mục tiêu nhìn từ trên: bờ bao tải cát, pháo dã chiến, lưới ngụy trang, hào. */
const Emplacement: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    {/* hào giao thông zigzag */}
    <path d="M70 40 L140 90 L120 150 L190 210 L170 280" stroke="#4a3a28" strokeWidth={22} fill="none" strokeLinejoin="round" />
    <path d="M70 40 L140 90 L120 150 L190 210 L170 280" stroke="#2b2219" strokeWidth={10} fill="none" strokeLinejoin="round" />
    <path d="M-80 -30 L-150 -70 L-200 -40" stroke="#4a3a28" strokeWidth={20} fill="none" />
    <path d="M-80 -30 L-150 -70 L-200 -40" stroke="#2b2219" strokeWidth={9} fill="none" />
    {/* hố đạn dự trữ */}
    <rect x={-215} y={-70} width={44} height={36} fill="#5a4630" stroke={P.ink} strokeWidth={3} />
    {[0, 1, 2].map((k) => <rect key={k} x={-210 + k * 13} y={-64} width={9} height={24} rx={4} fill={P.olive} />)}
    {/* bóng bờ */}
    <circle cx={SH[0]} cy={SH[1]} r={102} fill="#2a2016" opacity={0.4} />
    {/* nền hố */}
    <circle r={96} fill="#8a6a42" stroke={P.ink} strokeWidth={4} />
    <circle r={74} fill="#6e5334" />
    {/* bao cát */}
    {Array.from({ length: 26 }, (_, k) => {
      const a = (k / 26) * 360;
      if (a > 95 && a < 125) return null; // lối vào
      return (
        <g key={k} transform={`rotate(${a}) translate(86 0)`}>
          <rect x={-10} y={-13} width={20} height={26} rx={7} fill={k % 2 ? '#c9b68a' : '#b9a57a'} stroke="#5a4a30" strokeWidth={2} />
        </g>
      );
    })}
    {/* pháo dã chiến nhìn trên: càng chữ V, thân, nòng hướng tây bắc */}
    <g transform="rotate(-160)">
      <path d="M-10 -8 L-80 -40 M-10 8 L-80 40" stroke={P.oliveDk} strokeWidth={10} strokeLinecap="round" />
      <rect x={-22} y={-26} width={44} height={52} rx={6} fill={P.olive} stroke={P.ink} strokeWidth={3} />
      <rect x={-14} y={-38} width={22} height={12} rx={4} fill="#2b2b26" />
      <rect x={-14} y={26} width={22} height={12} rx={4} fill="#2b2b26" />
      <rect x={10} y={-6} width={98} height={12} rx={4} fill={P.oliveDk} stroke={P.ink} strokeWidth={2.5} />
      <rect x={100} y={-9} width={16} height={18} rx={3} fill={P.ink} />
      <rect x={-12} y={-16} width={30} height={10} fill={P.oliveLt} opacity={0.7} />
    </g>
    {/* lưới ngụy trang một nửa */}
    <path d="M-60 -90 L60 -95 L98 -20 L40 30 L-40 10 Z" fill="#5f6b3a" opacity={0.55} />
    <path d="M-60 -90 L60 -95 L98 -20 L40 30 L-40 10 Z" fill="none" stroke="#3a4424" strokeWidth={2} strokeDasharray="6 8" />
    {Array.from({ length: 12 }, (_, k) => <circle key={k} cx={-50 + rnd(k + 40) * 140} cy={-85 + rnd(k + 60) * 100} r={6 + rnd(k) * 6} fill={k % 2 ? '#7d8a4f' : '#4a5a2c'} opacity={0.75} />)}
  </g>
);

const Crater: React.FC<{ x: number; y: number; r: number; seed: number; o?: number }> = ({ x, y, r, seed, o = 1 }) => {
  if (o <= 0.01) return null;
  const ej: Pt[] = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2, d = r * (1.7 + rnd(seed * 13 + k) * 0.9);
    return [x + Math.cos(a) * d, y + Math.sin(a) * d];
  });
  return (
    <g opacity={o}>
      <path d={smoothPath(ej, true)} fill="#8f7550" opacity={0.75} />
      {Array.from({ length: 8 }, (_, k) => {
        const a = rnd(seed * 7 + k) * Math.PI * 2, d = r * (2.2 + rnd(seed + k * 3) * 1.4);
        return <line key={k} x1={x + Math.cos(a) * r} y1={y + Math.sin(a) * r} x2={x + Math.cos(a) * d} y2={y + Math.sin(a) * d} stroke="#5a4630" strokeWidth={r * 0.18} strokeLinecap="round" opacity={0.6} />;
      })}
      <circle cx={x} cy={y} r={r * 1.15} fill="#c9ad7c" />
      <circle cx={x} cy={y} r={r} fill="#3b2f24" />
      <circle cx={x + r * 0.25} cy={y + r * 0.15} r={r * 0.62} fill="#241c15" />
      <path d={`M${x - r * 0.9} ${y + r * 0.4} A ${r} ${r} 0 0 0 ${x + r * 0.4} ${y + r * 0.92}`} stroke="#6e5638" strokeWidth={r * 0.2} fill="none" />
    </g>
  );
};

/** Nổ nhìn từ trên: chớp, quả lửa, vòng sóng xung kích, khói trôi theo gió, mảnh văng. */
const TopBlast: React.FC<{ t: number; at: number; x: number; y: number; size: number; seed: number; life?: number }> = ({ t, at, x, y, size, seed, life = 3.2 }) => {
  const dt = t - at;
  if (dt < 0 || dt > life) return null;
  const e = (v: number) => 1 - (1 - Math.min(1, Math.max(0, v))) ** 3;
  return (
    <g>
      {Array.from({ length: 7 }, (_, k) => {
        const a = rnd(seed * 9 + k) * Math.PI * 2, d = size * (0.3 + e(dt / 1.8) * (1.0 + rnd(seed + k) * 0.8));
        return <Puff2D key={k} seed={seed * 10 + k} x={x + Math.cos(a) * d + dt * 30} y={y + Math.sin(a) * d * 0.8 - dt * 8} r={size * (0.45 + e(dt / 2) * 0.7)} color={k < 3 && dt < 0.5 ? '#4b4038' : '#9a9184'} opacity={0.85 * (1 - dt / life)} />;
      })}
      {dt < 0.6 && <circle cx={x} cy={y} r={size * (1 + dt * 9)} fill="none" stroke="#fff4d0" strokeWidth={size * 0.12} opacity={0.75 * (1 - dt / 0.6)} />}
      {dt < 0.5 && (
        <g opacity={1 - dt / 0.5}>
          <circle cx={x} cy={y} r={size * (0.7 + e(dt / 0.3) * 0.6)} fill="#ff7a1f" />
          <circle cx={x} cy={y} r={size * (0.45 + e(dt / 0.3) * 0.4)} fill="#ffc04a" />
          <circle cx={x} cy={y} r={size * (0.22 + e(dt / 0.3) * 0.2)} fill="#fff4c2" />
        </g>
      )}
      {dt < 0.9 && Array.from({ length: 12 }, (_, k) => {
        const a = (k / 12) * Math.PI * 2 + rnd(seed + k * 2), v = size * (5 + rnd(seed * 3 + k) * 5);
        return <circle key={`d${k}`} cx={x + Math.cos(a) * v * e(dt / 0.9)} cy={y + Math.sin(a) * v * e(dt / 0.9)} r={size * 0.08} fill="#3a2e22" opacity={1 - dt / 0.9} />;
      })}
      {dt < 0.18 && <circle cx={x} cy={y} r={size * 3.2} fill="#fff6d6" opacity={0.7 * (1 - dt / 0.18)} />}
    </g>
  );
};

/** Vệt đạn rơi xuống (nhìn trên): đạn bay từ phía tây, bóng hội tụ về điểm nổ. */
const Incoming: React.FC<{ t: number; at: number; x: number; y: number; dur?: number }> = ({ t, at, x, y, dur = 0.35 }) => {
  const p = (t - (at - dur)) / dur;
  if (p < 0 || p >= 1) return null;
  const hx = x - (1 - p) * 260, hy = y - (1 - p) * 90;
  return (
    <g>
      <ellipse cx={hx + (1 - p) * 90} cy={hy + (1 - p) * 60} rx={10} ry={5} fill="#2a2016" opacity={0.35 * p} />
      <line x1={hx - 70} y1={hy - 24} x2={hx} y2={hy} stroke={P.orange} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
      <circle cx={hx} cy={hy} r={6} fill="#fff1c8" />
    </g>
  );
};

// ── Đạn nhìn ngang (dọc +x, gốc ở đáy, mũi ở x = L) ─────────────────────────
const Shell: React.FC<{ L: number; guided?: boolean; canard?: number; cut?: number; glow?: number; jam?: number; uid: string }> = ({ L, guided = false, canard = 0, cut = 0, glow = 0, jam = 0, uid }) => {
  const r = L * 0.095;
  const body = `M0 ${-0.82 * r} L${0.07 * L} ${-r} L${0.6 * L} ${-r} Q${0.79 * L} ${-r} ${0.86 * L} ${-0.44 * r} L${0.975 * L} ${-0.2 * r} Q${L} ${-0.12 * r} ${L} 0 Q${L} ${0.12 * r} ${0.975 * L} ${0.2 * r} L${0.86 * L} ${0.44 * r} Q${0.79 * L} ${r} ${0.6 * L} ${r} L${0.07 * L} ${r} L0 ${0.82 * r} Z`;
  const kitCol = jam > 0 ? mix(P.teal, P.red, jam) : P.teal;
  return (
    <g>
      <defs>
        <linearGradient id={`s13g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.oliveDk} />
          <stop offset="0.25" stopColor={P.oliveLt} />
          <stop offset="0.55" stopColor={P.olive} />
          <stop offset="1" stopColor="#2f3720" />
        </linearGradient>
        <clipPath id={`s13c${uid}`}><path d={body} /></clipPath>
        <pattern id={`s13h${uid}`} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={12} height={12} fill="#d8b46a" />
          <line x1={0} y1={0} x2={0} y2={12} stroke="#9a7838" strokeWidth={4} />
        </pattern>
      </defs>
      <path d={body} fill={`url(#s13g${uid})`} stroke={P.ink} strokeWidth={Math.max(2, L * 0.006)} />
      <g clipPath={`url(#s13c${uid})`}>
        {/* đai dẫn đồng, vạch sơn HE */}
        <rect x={0.1 * L} y={-r} width={0.035 * L} height={2 * r} fill="#b8673a" />
        <rect x={0.1 * L} y={-r} width={0.035 * L} height={0.5 * r} fill="#e09a63" opacity={0.6} />
        <rect x={0.5 * L} y={-r} width={0.025 * L} height={2 * r} fill="#d9c04a" />
        {/* ngòi / bộ dẫn đường ở mũi */}
        <rect x={0.84 * L} y={-r} width={0.2 * L} height={2 * r} fill={guided ? '#3a3d38' : P.steel} />
        {guided && <rect x={0.86 * L} y={-r} width={0.018 * L} height={2 * r} fill={kitCol} />}
        {!guided && <rect x={0.84 * L} y={-r} width={0.2 * L} height={0.6 * r} fill="#b9bab3" opacity={0.6} />}
        {/* mặt cắt */}
        {cut > 0 && (
          <g opacity={cut}>
            <rect x={0.07 * L} y={-r} width={0.79 * L} height={r} fill="#4a4f3e" />
            <path d={`M${0.075 * L} ${-0.8 * r} L${0.6 * L} ${-0.8 * r} Q${0.76 * L} ${-0.8 * r} ${0.82 * L} ${-0.36 * r} L${0.82 * L} 0 L${0.075 * L} 0 Z`} fill={`url(#s13h${uid})`} stroke={P.ink} strokeWidth={2} />
            <rect x={0.84 * L} y={-r} width={0.17 * L} height={r} fill="#24261f" />
            {guided && (
              <g>
                <rect x={0.86 * L} y={-0.36 * r} width={0.075 * L} height={0.3 * r} fill={kitCol} stroke={P.ink} strokeWidth={1.5} />
                {[0, 1, 2].map((k) => <rect key={k} x={(0.866 + k * 0.022) * L} y={-0.3 * r} width={0.014 * L} height={0.12 * r} fill="#16302d" />)}
                <rect x={0.94 * L} y={-0.26 * r} width={0.03 * L} height={0.2 * r} fill="#c9a645" stroke={P.ink} strokeWidth={1.2} />
              </g>
            )}
            <line x1={0.07 * L} y1={0} x2={L} y2={0} stroke={P.ink} strokeWidth={2} strokeDasharray="10 6" />
          </g>
        )}
        <rect x={0} y={-0.78 * r} width={L} height={0.22 * r} fill="#fff" opacity={0.16} />
      </g>
      {guided && (
        <g>
          {/* ăng-ten GPS ở chóp */}
          <rect x={0.985 * L} y={-0.07 * r} width={0.04 * L} height={0.14 * r} rx={2} fill={kitCol} stroke={P.ink} strokeWidth={1.5} />
          {glow > 0 && <circle cx={1.02 * L} cy={0} r={0.25 * r + glow * 0.2 * r} fill={kitCol} opacity={0.35 * glow} filter="url(#glow)" />}
          {/* cánh lái canard: bật ra khi canard → 1 */}
          {[-1, 1].map((s) => (
            <path key={s} d={`M${0.875 * L} ${s * 0.36 * r} L${0.93 * L} ${s * 0.3 * r} L${0.925 * L} ${s * (0.3 + 0.75 * canard) * r} L${0.89 * L} ${s * (0.36 + 0.75 * canard) * r} Z`} fill="#454a40" stroke={P.ink} strokeWidth={2} />
          ))}
        </g>
      )}
    </g>
  );
};

const Coin: React.FC<{ x: number; y: number; rx?: number; th?: number }> = ({ x, y, rx = 74, th = 13 }) => (
  <g>
    <path d={`M${x - rx} ${y} L${x - rx} ${y + th} A ${rx} ${rx * 0.26} 0 0 0 ${x + rx} ${y + th} L${x + rx} ${y} Z`} fill="#a87a22" stroke={P.ink} strokeWidth={2} />
    <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.26} fill="#ecc659" stroke={P.ink} strokeWidth={2} />
    <ellipse cx={x} cy={y} rx={rx * 0.66} ry={rx * 0.17} fill="none" stroke="#b98c2c" strokeWidth={2.5} />
  </g>
);

// Lớp phủ trượt (đẩy vào từ phải, đẩy ra trái)
const slideX = (t: number, a: number, b: number, d = 0.35) => 1920 * (1 - prog(t, a, a + d, ease3)) - 1920 * prog(t, b - d, b, ease3);
const Panel: React.FC<{ t: number; a: number; b: number; children: React.ReactNode }> = ({ t, a, b, children }) => {
  if (t < a || t > b) return null;
  const x = slideX(t, a, b);
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px)`, boxShadow: '-30px 0 40px rgba(0,0,0,0.35)' }}>{children}</AbsoluteFill>
  );
};

// ── Cảnh ─────────────────────────────────────────────────────────────────
const T = {
  pileIn: 314.6, pileOut: 317.75,
  inset: 317.6, insetOut: 323.15,
  fly: 323.3,
  priceIn: 329.1, priceOut: 333.5,
  jamA: 333.15, jamHit: 334.72,
  racks: 334.95,
};

const S13: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ── camera nhìn trên ──
  let cx = C[0], cy = C[1], zoom = 1.35;
  if (t < T.inset) {
    const pull = prog(t, CUE.s13_belt, 313.7, ease3);
    zoom = lerp(lerp(1.35, 1.45, prog(t, t0, CUE.s13_belt)), 0.72, pull);
    cx = C[0] + lerp(-30, 60, pull); cy = C[1] + lerp(-10, 20, pull);
  } else if (t < T.fly) {
    zoom = 0.9;
  } else if (t < T.jamA) {
    const pin = prog(t, T.fly, CUE.s13_single, Easing.bezier(0.4, 0, 0.6, 1));
    zoom = lerp(0.8, 1.5, pin) + prog(t, CUE.s13_single, 327.3) * 0.3 - prog(t, 327.7, 328.6, ease3) * 1.05;
    cx = lerp(1250, C[0], pin); cy = lerp(950, C[1], pin);
  } else {
    zoom = lerp(1.15, 0.95, prog(t, T.jamA, 334.5)); cx = 1560; cy = 1200;
  }
  const kick = Math.max(0, 1 - (t - CUE.s13_single) / 1.3);
  const hh = handheld(t, 4, 's13');
  const shk = t >= CUE.s13_single ? handheld(t * 9, 34 * kick * kick, 's13k') : [0, 0];
  const beltShake = BELT.reduce((s, b) => s + Math.max(0, 1 - (t - b.at) / 0.25) * (t >= b.at ? 1 : 0), 0);
  const bs = handheld(t * 7, 5 * Math.min(1.5, beltShake), 's13b');
  const shake = [hh[0] + shk[0] + bs[0], hh[1] + shk[1] + bs[1]] as const;

  // ── trạng thái các hố ──
  const beltO = t < T.inset ? 1 : 1 - prog(t, 322.5, 323.0);
  const ghostO = prog(t, 327.9, 328.5) * (t < T.priceIn + 0.4 ? 1 : 0);
  const showSingleCrater = t >= CUE.s13_single;

  // vòng sai số
  let ringR = 0, ringRatio = 0.62, ringCol = P.orange, ringO = 0;
  if (t < T.inset) { ringR = lerp(90, 640, prog(t, CUE.s13_belt, 313.9, ease3)); ringO = prog(t, 310.0, 310.5); }
  else if (t >= T.fly && t < T.priceIn + 0.4) {
    const p = prog(t, CUE.s13_meters, 325.5, ease3);
    ringR = lerp(640, 34, p); ringRatio = lerp(0.62, 1, p); ringO = prog(t, T.fly, 323.6) * (1 - prog(t, 326.6, 327.2) * 0.6);
    if (p >= 1) ringCol = P.teal;
  } else if (t >= T.jamA) {
    const j = prog(t, 333.9, 334.7, ease3);
    ringR = lerp(40, 360, j); ringRatio = lerp(1, 0.75, j); ringCol = mix(P.teal, P.red, Math.min(1, j * 2)); ringO = 1;
  }

  // đường bay đạn dẫn đường (nhìn trên) — lượn chỉnh rồi khóa vào tâm
  const flyS = prog(t, T.fly, CUE.s13_single, (x) => x * 0.55 + 0.45 * x * x);
  const flyAt = (s: number): Pt => [lerp(250, C[0], s), lerp(640, C[1], s) + 150 * Math.sin(s * Math.PI * 2.4) * (1 - s) ** 1.4];
  const flyPts = Array.from({ length: 61 }, (_, k) => flyAt((k / 60) * flyS));
  // đường bay khi bị phá sóng
  const jamS = prog(t, T.jamA + 0.1, T.jamHit, (x) => x);
  const jj = prog(t, 333.9, T.jamHit);
  const MISS: Pt = [1330, 1620];
  const jamAt = (s: number, tt: number): Pt => {
    const j = Math.max(0, Math.min(1, (s - 0.55) / 0.45));
    const bx = lerp(820, C[0], s), by = lerp(820, C[1], s);
    return [lerp(bx, lerp(bx, MISS[0], s), j * j) + Math.sin(s * 40 + tt) * 30 * j, lerp(by, lerp(by, MISS[1], s), j * j) + Math.cos(s * 33) * 50 * j];
  };
  const jamPts = Array.from({ length: 61 }, (_, k) => jamAt((k / 60) * jamS, 0));
  const jamEnd = jamAt(jamS, 0);
  const missPt = jamAt(1, 0);

  const showTop = t < T.pileOut || (t >= T.inset - 0.2 && t < T.priceOut) || t >= T.jamA;

  // ── khung chèn ──
  const insetS = useSpring(t, T.inset, 13, 120);
  const insetOut = prog(t, T.insetOut - 0.3, T.insetOut, ease3);
  const shellIn = prog(t, CUE.s13_guided, 318.6, ease3);
  const cut = prog(t, 319.3, 319.9);
  const gpsGlow = t >= CUE.s13_gps ? 0.6 + 0.4 * Math.sin((t - CUE.s13_gps) * 8) : 0;
  const can = useSpring(t, 322.26, 9, 180);

  // ── giá đạn ──
  const pIn = useSpring(t, T.priceIn + 0.25, 12, 140);
  const coinsG = Math.floor(lerp(0, 32, prog(t, 330.6, 333.0, Easing.bezier(0.3, 0, 0.7, 1))));
  const coinsO = Math.floor(lerp(0, 3, prog(t, 329.6, 330.2)));

  // ── giá đạn cất trữ ──
  const rackCamX = t < 338.0 ? lerp(960, 700, prog(t, 336.8, 337.8, ease3)) : t < 339.5 ? lerp(700, 1520, prog(t, 338.0, 338.9, ease3)) : lerp(1520, 960, prog(t, 339.5, 340.4, ease3));
  const rackZoom = t < 338.0 ? lerp(0.98, 1.18, prog(t, 336.8, 337.8, ease3)) : t < 339.5 ? lerp(1.18, 1.3, prog(t, 338.0, 338.9, ease3)) : lerp(1.3, 1.0, prog(t, 339.5, 340.4, ease3));

  return (
    <AbsoluteFill style={{ background: P.paper }}>
      {showTop && (
        <Cam2D x={cx} y={cy} zoom={zoom} shake={shake} bg="#c4a066">
          <svg width={WW} height={WH} style={{ overflow: 'visible' }}>
            <Defs2D />
            <FieldArt />
            {/* hố đạn loạt rải + bóng mờ "hàng chục viên trước kia" */}
            {BELT.map((b, i) => <Crater key={i} x={b.x} y={b.y} r={b.r} seed={b.seed} o={t >= b.at ? beltO * (1 - (t >= T.inset ? 0.35 : 0)) : 0} />)}
            {ghostO > 0 && BELT.map((b, i) => (
              <g key={`g${i}`} opacity={ghostO * 0.8}>
                <circle cx={b.x} cy={b.y} r={b.r * 1.3} fill={P.ink} opacity={0.12} />
                <circle cx={b.x} cy={b.y} r={b.r * 1.3} fill="none" stroke={P.ink} strokeWidth={4} strokeDasharray="7 6" />
              </g>
            ))}
            <Emplacement x={C[0]} y={C[1]} />
            {showSingleCrater && <Crater x={C[0] + 6} y={C[1] - 4} r={36} seed={99} />}
            {t >= T.jamHit && <Crater x={missPt[0]} y={missPt[1]} r={22} seed={77} />}
            {/* vòng sai số */}
            {ringO > 0 && (
              <g opacity={ringO}>
                <ellipse cx={C[0]} cy={C[1]} rx={ringR} ry={ringR * ringRatio} fill={ringCol} opacity={0.08} />
                <ellipse cx={C[0]} cy={C[1]} rx={ringR} ry={ringR * ringRatio} fill="none" stroke={ringCol} strokeWidth={6} strokeDasharray="22 14" />
                <circle cx={C[0]} cy={C[1]} r={7} fill={ringCol} />
              </g>
            )}
            {/* loạt đạn rơi */}
            {t < T.pileOut && BELT.map((b, i) => (
              <g key={`f${i}`}>
                <Incoming t={t} at={b.at} x={b.x} y={b.y} />
                <TopBlast t={t} at={b.at} x={b.x} y={b.y} size={22 + b.r * 0.6} seed={b.seed} life={2.6} />
              </g>
            ))}
            {/* đạn dẫn đường lượn chỉnh */}
            {t >= T.fly && t < CUE.s13_single + 0.05 && (() => {
              const [hx, hy] = flyAt(flyS); const [px, py] = flyAt(Math.max(0, flyS - 0.01));
              const ang = (Math.atan2(hy - py, hx - px) * 180) / Math.PI;
              const sh = 1 - flyS;
              return (
                <g>
                  <path d={'M' + flyPts.map((q) => q.join(' ')).join(' L')} stroke={P.orange} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.9} />
                  <ellipse cx={hx + sh * 160} cy={hy + sh * 70} rx={22} ry={8} fill="#2a2016" opacity={0.35} transform={`rotate(${ang} ${hx + sh * 160} ${hy + sh * 70})`} />
                  <g transform={`translate(${hx - 40} ${hy}) rotate(${ang} 40 0)`} filter="url(#sh)"><Shell L={80} guided canard={1} glow={0.8} uid="fly" /></g>
                </g>
              );
            })()}
            {t >= CUE.s13_single - 0.01 && t < T.priceIn + 0.4 && (
              <g>
                <TopBlast t={t} at={CUE.s13_single} x={C[0]} y={C[1]} size={80} seed={51} life={4} />
                <Blast2D t={t} at={CUE.s13_single} x={C[0]} y={C[1] + 30} size={50} seed={52} air life={3.5} />
              </g>
            )}
            {/* trạm phá sóng + đạn chao lệch */}
            {t >= T.jamA && (
              <g>
                <g transform="translate(2150 1420) rotate(-20)">
                  <rect x={-70 + SH[0]} y={-30 + SH[1]} width={150} height={64} rx={8} fill="#2a2016" opacity={0.4} />
                  <rect x={-70} y={-30} width={110} height={60} rx={6} fill={P.olive} stroke={P.ink} strokeWidth={4} />
                  <rect x={40} y={-26} width={38} height={52} rx={6} fill={P.oliveDk} stroke={P.ink} strokeWidth={4} />
                  <rect x={58} y={-20} width={12} height={40} fill="#9fb3b0" opacity={0.7} />
                  {[-40, -10, 18].map((k) => <line key={k} x1={k} y1={-30} x2={k} y2={30} stroke={P.oliveDk} strokeWidth={3} />)}
                  <circle cx={-30} cy={0} r={16} fill="#3a3d38" stroke={P.ink} strokeWidth={3} />
                  <circle cx={-30} cy={0} r={6} fill={P.red} />
                </g>
                {Array.from({ length: 6 }, (_, k) => {
                  const ph = ((t - 333.7) * 1.4 - k / 6);
                  if (t < 333.7 || ph < 0) return null;
                  const f = ph % 1;
                  return <circle key={k} cx={2150 - 28} cy={1430} r={30 + f * 900} fill="none" stroke={P.red} strokeWidth={10 - f * 6} opacity={(1 - f) * 0.8} strokeDasharray={k % 2 ? '30 18' : undefined} />;
                })}
                {t < T.jamHit && (() => {
                  const [px, py] = jamAt(Math.max(0, jamS - 0.01), 0);
                  const ang = (Math.atan2(jamEnd[1] - py, jamEnd[0] - px) * 180) / Math.PI + Math.sin(t * 30) * 25 * jj;
                  return (
                    <g>
                      <path d={'M' + jamPts.map((q) => q.join(' ')).join(' L')} stroke={P.orange} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.9} />
                      <g transform={`translate(${jamEnd[0] - 55} ${jamEnd[1]}) rotate(${ang} 55 0)`}><Shell L={110} guided canard={1} jam={jj} glow={1 - jj} uid="jam" /></g>
                    </g>
                  );
                })()}
                <TopBlast t={t} at={T.jamHit} x={missPt[0]} y={missPt[1]} size={40} seed={61} />
              </g>
            )}
          </svg>
        </Cam2D>
      )}

      {/* ── khung chèn: mặt cắt đạn dẫn đường ── */}
      {t >= T.inset && t < T.insetOut && (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: '#1d1a14', opacity: 0.5 * insetS * (1 - insetOut) }} />
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            <Defs2D />
            <g transform={`translate(960 545) scale(${(0.6 + 0.4 * insetS) * (1 - insetOut * 0.3)}) translate(-960 -545)`} opacity={Math.min(1, insetS * 1.5) * (1 - insetOut)}>
              <rect x={230} y={220} width={1460} height={650} rx={18} fill={P.paper} stroke={P.ink} strokeWidth={5} filter="url(#sh)" />
              {Array.from({ length: 28 }, (_, k) => <line key={`v${k}`} x1={260 + k * 52} y1={236} x2={260 + k * 52} y2={854} stroke="#cdbf9f" strokeWidth={k % 5 ? 1 : 2} />)}
              {Array.from({ length: 12 }, (_, k) => <line key={`h${k}`} x1={246} y1={250 + k * 52} x2={1674} y2={250 + k * 52} stroke="#cdbf9f" strokeWidth={k % 5 ? 1 : 2} />)}
              {/* vệ tinh + tín hiệu */}
              <g transform="translate(1560 320) rotate(-20)">
                <rect x={-58} y={-12} width={40} height={24} fill="#3f6f9a" stroke={P.ink} strokeWidth={2.5} />
                <rect x={18} y={-12} width={40} height={24} fill="#3f6f9a" stroke={P.ink} strokeWidth={2.5} />
                <rect x={-18} y={-18} width={36} height={36} rx={4} fill="#c9a645" stroke={P.ink} strokeWidth={3} />
                <line x1={0} y1={18} x2={0} y2={32} stroke={P.ink} strokeWidth={3} />
              </g>
              {t >= CUE.s13_gps && [0, 1, 2].map((k) => {
                const f = ((t - CUE.s13_gps) * 1.2 + k / 3) % 1;
                return <path key={k} d={`M${1560 - f * 80} ${350 + f * 170} q 40 -10 60 -40`} stroke={P.teal} strokeWidth={6} fill="none" opacity={1 - f} strokeLinecap="round" />;
              })}
              {t >= CUE.s13_gps && <line x1={1550} y1={350} x2={lerp(1550, 1458, prog(t, CUE.s13_gps, CUE.s13_gps + 0.4))} y2={lerp(350, 575, prog(t, CUE.s13_gps, CUE.s13_gps + 0.4))} stroke={P.teal} strokeWidth={4} strokeDasharray="12 10" />}
              {/* đạn */}
              <g transform={`translate(${lerp(-500, 0, shellIn)} 0)`}>
                <ellipse cx={890} cy={720} rx={560} ry={22} fill="#2a2016" opacity={0.18} />
                <g transform="translate(400 575)"><Shell L={1060} guided canard={can} cut={cut} glow={gpsGlow} uid="ins" /></g>
                {/* đường dẫn chú thích tới ngòi GPS */}
                {t >= CUE.s13_gps && (
                  <path d="M1355 545 L1300 400" stroke={P.teal} strokeWidth={4} fill="none" {...drawOn(170, prog(t, CUE.s13_gps, CUE.s13_gps + 0.3))} />
                )}
                {/* mũi tên vận động cánh lái */}
                {can > 0.05 && [-1, 1].map((s) => (
                  <path key={s} d={`M${1360} ${575 + s * 40} q 30 ${s * 40} 0 ${s * 90}`} stroke={P.orange} strokeWidth={5} fill="none" opacity={Math.min(1, can)} markerEnd="" />
                ))}
              </g>
            </g>
          </svg>
          <Label t={t} text="GPS" x={1300} y={370} from={CUE.s13_gps} until={T.insetOut - 0.35} size={54} bg={P.teal} fg="#fff" />
        </AbsoluteFill>
      )}

      {/* ── đống vỏ đạn thế kỷ 20 (nhìn nghiêng) ── */}
      <Panel t={t} a={T.pileIn} b={T.pileOut}>
        <Cam2D x={960} y={lerp(640, 470, prog(t, T.pileIn, 317.2, ease3))} zoom={lerp(1.12, 0.96, prog(t, T.pileIn, 317.2, ease3))} shake={hh} bg={P.paper}>
          <svg width={1920} height={1080} style={{ overflow: 'visible' }}>
            <Defs2D />
            <defs>
              <linearGradient id="s13sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e9cf9c" /><stop offset="1" stopColor="#f3e6c8" /></linearGradient>
              <radialGradient id="s13cas" cx="0.38" cy="0.35" r="0.7"><stop offset="0" stopColor={P.brassLt} /><stop offset="0.55" stopColor={P.brass} /><stop offset="1" stopColor={P.brassDk} /></radialGradient>
            </defs>
            <rect x={-300} y={-400} width={2520} height={1400} fill="url(#s13sky)" />
            <path d="M-300 820 Q 200 700 600 790 T 1400 760 T 2300 800 L2300 1400 L-300 1400 Z" fill="#b9a675" opacity={0.6} />
            {/* đống xa */}
            {([[260, 860, 260, 0.35], [1640, 870, 300, 0.4], [1880, 880, 180, 0.3]] as const).map(([x, y, w, o], k) => (
              <path key={k} d={`M${x - w} ${y} Q ${x} ${y - w * 1.1} ${x + w} ${y} Z`} fill={mix(P.brass, '#e9cf9c', 0.45)} opacity={o + 0.3} stroke={mix(P.brassDk, '#e9cf9c', 0.3)} strokeWidth={3} />
            ))}
            <rect x={-300} y={880} width={2520} height={500} fill="#a58a5c" />
            <rect x={-300} y={880} width={2520} height={12} fill="#7a6440" />
            {/* chân đống: vỏ nằm ngang lăn lóc */}
            {Array.from({ length: 9 }, (_, k) => {
              const x = 420 + k * 140 + rnd(k + 5) * 40, y = 905 + rnd(k) * 40;
              return (
                <g key={`l${k}`} transform={`rotate(${(rnd(k * 3) - 0.5) * 30} ${x} ${y})`}>
                  <rect x={x - 60} y={y - 16} width={120} height={32} rx={6} fill="url(#s13cas)" stroke={P.ink} strokeWidth={2.5} />
                  <rect x={x + 52} y={y - 19} width={10} height={38} rx={3} fill={P.brassDk} stroke={P.ink} strokeWidth={2} />
                </g>
              );
            })}
            {/* kim tự tháp đáy vỏ đạn (nhìn từ đầu) */}
            {Array.from({ length: 15 }, (_, row) => {
              const n = 22 - row, rad = 26, y = 862 - row * 44.5;
              const appear = prog(t, T.pileIn + 0.15 + row * 0.07, T.pileIn + 0.35 + row * 0.07);
              if (appear <= 0) return null;
              return (
                <g key={row} transform={`translate(0 ${(1 - appear) * -120})`} opacity={appear}>
                  {Array.from({ length: n }, (_, k) => {
                    const x = 960 - ((n - 1) * 52) / 2 + k * 52 + (row % 2 ? 0 : 0);
                    const sh = rnd(row * 40 + k);
                    return (
                      <g key={k}>
                        <circle cx={x} cy={y} r={rad} fill="url(#s13cas)" stroke={P.ink} strokeWidth={2.5} />
                        <circle cx={x} cy={y} r={rad * 0.8} fill="none" stroke={P.brassDk} strokeWidth={2} />
                        <circle cx={x} cy={y} r={rad * 0.22} fill={sh > 0.3 ? '#9a6d2a' : '#5a4020'} stroke={P.ink} strokeWidth={1.5} />
                        {sh > 0.75 && <circle cx={x} cy={y} r={rad} fill="#5a4020" opacity={0.25} />}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            {/* người lính để so tỉ lệ */}
            <g transform="translate(1590 880)" fill={P.ink} opacity={0.85}>
              <circle cx={0} cy={-162} r={14} />
              <path d="M-16 -146 L16 -146 L20 -70 L12 0 L2 0 L0 -60 L-2 0 L-12 0 L-20 -70 Z" />
              <path d="M-16 -140 L-30 -90 M16 -140 L30 -92" stroke={P.ink} strokeWidth={9} strokeLinecap="round" />
              <path d="M-20 -170 Q 0 -186 20 -170 L 22 -164 L -22 -164 Z" />
            </g>
          </svg>
        </Cam2D>
        <Label t={t} text="20th century" x={960} y={120} from={CUE.s13_20th} until={T.pileOut - 0.4} size={60} bg={P.paper} fg={P.ink} />
      </Panel>

      {/* ── giá tiền: chồng xu ── */}
      <Panel t={t} a={T.priceIn} b={T.priceOut}>
        <Cam2D x={lerp(1000, 1020, prog(t, 330.6, 333.0, ease3))} y={lerp(730, 610, prog(t, 330.6, 333.0, ease3))} zoom={lerp(1.32, 1.12, prog(t, 330.6, 333.0, ease3))} shake={hh} bg={P.paper}>
          <svg width={1920} height={1080} style={{ overflow: 'visible' }}>
            <Defs2D />
            <rect x={-200} y={-200} width={2320} height={1500} fill={P.paper} />
            {Array.from({ length: 44 }, (_, k) => <line key={`v${k}`} x1={-200 + k * 54} y1={-200} x2={-200 + k * 54} y2={1300} stroke="#ddd0b2" strokeWidth={k % 5 ? 1 : 2} />)}
            {Array.from({ length: 28 }, (_, k) => <line key={`h${k}`} x1={-200} y1={-200 + k * 54} x2={2120} y2={-200 + k * 54} stroke="#ddd0b2" strokeWidth={k % 5 ? 1 : 2} />)}
            <rect x={-200} y={900} width={2320} height={400} fill="#cdbb92" />
            <line x1={-200} y1={900} x2={2120} y2={900} stroke={P.ink} strokeWidth={4} />
            {/* đạn thường + chồng xu thấp */}
            <g transform={`translate(0 ${(1 - pIn) * 80})`} opacity={Math.min(1, pIn * 1.5)}>
              <ellipse cx={540} cy={902} rx={90} ry={16} fill="#2a2016" opacity={0.25} />
              <g transform="translate(540 900) rotate(-90)" filter="url(#sh)"><Shell L={420} uid="po" /></g>
              {Array.from({ length: coinsO }, (_, k) => <Coin key={k} x={760} y={885 - k * 13} />)}
              <ellipse cx={760} cy={902} rx={84} ry={14} fill="#2a2016" opacity={0.2} />
            </g>
            {/* đạn dẫn đường + chồng xu cao vọt */}
            <g transform={`translate(0 ${(1 - pIn) * 80})`} opacity={Math.min(1, pIn * 1.5)}>
              <ellipse cx={1180} cy={902} rx={90} ry={16} fill="#2a2016" opacity={0.25} />
              <g transform="translate(1180 900) rotate(-90)" filter="url(#sh)"><Shell L={420} guided canard={1} glow={0.5} uid="pg" /></g>
              <ellipse cx={1420} cy={902} rx={84} ry={14} fill="#2a2016" opacity={0.2} />
              {Array.from({ length: coinsG }, (_, k) => <Coin key={k} x={1420 + Math.sin(k * 1.7) * 3} y={885 - k * 13} />)}
              {/* thước đo bên cạnh */}
              <line x1={1540} y1={900} x2={1540} y2={900 - coinsG * 13} stroke={P.orange} strokeWidth={6} />
              {Array.from({ length: Math.floor(coinsG / 3) }, (_, k) => <line key={k} x1={1530} y1={900 - (k + 1) * 39} x2={1552} y2={900 - (k + 1) * 39} stroke={P.orange} strokeWidth={4} />)}
              <line x1={860} y1={900 - coinsO * 13} x2={860} y2={900} stroke={P.orange} strokeWidth={6} />
            </g>
          </svg>
        </Cam2D>
      </Panel>

      {/* ── hai giá đạn ── */}
      <Panel t={t} a={T.racks} b={999}>
        <Cam2D x={rackCamX} y={540} zoom={rackZoom} shake={hh} bg="#d9cba8">
          <svg width={1920} height={1080} style={{ overflow: 'visible' }}>
            <Defs2D />
            <rect x={-300} y={-300} width={2520} height={1700} fill="#d9cba8" />
            {Array.from({ length: 30 }, (_, k) => <rect key={k} x={-300 + k * 86} y={-300} width={84} height={1240} fill={k % 2 ? '#cdbd96' : '#d4c49e'} />)}
            {Array.from({ length: 30 }, (_, k) => <line key={`n${k}`} x1={-300 + k * 86} y1={-300} x2={-300 + k * 86} y2={940} stroke="#a8966c" strokeWidth={3} />)}
            <rect x={-300} y={940} width={2520} height={500} fill="#8f7f5e" />
            <line x1={-300} y1={940} x2={2220} y2={940} stroke={P.ink} strokeWidth={5} />
            {/* giá đạn thường */}
            <g filter="url(#sh)">
              {[150, 1130].map((x) => <rect key={x} x={x} y={150} width={22} height={795} fill={P.steelDk} stroke={P.ink} strokeWidth={3} />)}
              {[0, 1, 2, 3].map((s) => <rect key={s} x={150} y={360 + s * 190} width={1002} height={18} fill={P.steel} stroke={P.ink} strokeWidth={3} />)}
            </g>
            {[0, 1, 2, 3].map((s) => Array.from({ length: 10 }, (_, k) => {
              const at = 335.3 + (3 - s) * 0.3 + k * 0.025;
              const sp = prog(t, at, at + 0.18);
              if (sp <= 0) return null;
              const x = 222 + k * 94, y = 360 + s * 190;
              return (
                <g key={`${s}-${k}`} transform={`translate(${x} ${y - (1 - sp) * 40}) rotate(-90)`} opacity={sp}>
                  <Shell L={168} uid={`r${s}${k}`} />
                </g>
              );
            }))}
            {/* giá đạn dẫn đường */}
            <g filter="url(#sh)">
              {[1340, 1770].map((x) => <rect key={x} x={x} y={300} width={22} height={645} fill={P.steelDk} stroke={P.ink} strokeWidth={3} />)}
              {[0, 1].map((s) => <rect key={s} x={1340} y={560 + s * 220} width={452} height={18} fill={P.steel} stroke={P.ink} strokeWidth={3} />)}
              <rect x={1340} y={300} width={452} height={18} fill={P.steel} stroke={P.ink} strokeWidth={3} />
            </g>
            {/* thùng khóa có vạch teal */}
            <g>
              <rect x={1430} y={672} width={270} height={108} rx={6} fill={P.oliveDk} stroke={P.ink} strokeWidth={3} />
              <rect x={1430} y={700} width={270} height={14} fill={P.teal} opacity={0.85} />
              <rect x={1548} y={730} width={34} height={26} rx={4} fill="#c9a645" stroke={P.ink} strokeWidth={2} />
            </g>
            {[0, 1, 2].map((k) => {
              const at = 338.3 + k * 0.12;
              const sp = prog(t, at, at + 0.25);
              if (sp <= 0) return null;
              const x = 1440 + k * 125;
              return (
                <g key={k} transform={`translate(${x} ${560 - (1 - sp) * 50}) rotate(-90)`} opacity={sp}>
                  <Shell L={190} guided canard={1} glow={0.6 + 0.4 * Math.sin(t * 5 + k)} uid={`rg${k}`} />
                </g>
              );
            })}
            {t >= 338.3 && <rect x={1400} y={340} width={340} height={230} rx={20} fill={P.teal} opacity={0.08 * prog(t, 338.3, 338.8)} />}
          </svg>
        </Cam2D>
      </Panel>

      <Grain opacity={0.45} />
    </AbsoluteFill>
  );
};

export default S13;
