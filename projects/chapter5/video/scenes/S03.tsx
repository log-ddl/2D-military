// S03 — Nòng dài vs tầm bắn (2D). Bản vẽ mặt cắt kỹ thuật nhìn ngang trên giấy kem.
// Thế giới: 220 px/m. Khoá nòng tại (1000, 1060), mặt đất y = 1400. Thước tầm, thẻ nâng cấp, cân: lớp màn hình.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { prog, lerp, bump } from '@kit/theme';
import { useT, handheld, Label, useSpring } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { Muzzle2D, Puff2D, Blast2D } from '@lib/2d/fx';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';

const C = {
  paper: '#efe6d2', paperD: '#e2d6bb', ink: '#2a2a26', olive: '#5f6b3a', oliveL: '#7d8a52', oliveD: '#3f4a2a',
  ochre: '#b98a4a', ochreL: '#d4ad6e', orange: '#e8772e', red: '#d94a3a', steel: '#b3ae9c', steelD: '#8a8574',
  bore: '#3a3833', copper: '#b8683a', expl: '#e2c35a', card: '#f7f0e1', soil: '#cdb88e', field: '#c9b27a',
};
const BX = 1000, AY = 1060, GROUND = 340; // khoá nòng (thế giới), mặt đất theo toạ độ cục bộ của pháo
const BRAKE = 130, SB0 = 200, SLEN = 176, SR = 16;
const G = 900; // gia tốc rơi hình ảnh (px/s²)
const FALL = Math.sqrt((2 * GROUND) / G);

// ── Hai phát bắn so sánh: nòng ngắn / nòng dài ─────────────────────────────
const L_SHORT = 1100, L_LONG = 1700;
const SHOTS = [
  { ign: 51.6, exit: 52.8, L: L_SHORT, show: 50.0, size: 34, seed: 3 },
  { ign: 55.68, exit: CUE.s03_faster, L: L_LONG, show: 54.9, size: 58, seed: 7 },
].map((s) => {
  const D = s.L + BRAKE - SB0;
  const v = (2 * D) / (s.exit - s.ign);
  return { ...s, D, v, mx: s.L + BRAKE, range: v * FALL };
});

// ── Camera: khoá [t, x, y, zoom] ────────────────────────────────────────────
const KEYS: [number, number, number, number][] = [
  [50.7, 1330, 1060, 1.45],
  [51.55, 1380, 1060, 1.42],
  [52.75, 1850, 1080, 0.85],
  [53.7, 2500, 1080, 0.55],
  [54.4, 1950, 1090, 0.85],
  [55.6, 1960, 1080, 0.86],
  [56.5, 2250, 1100, 0.72],
  [57.6, 3700, 1000, 0.36],
  [59.9, 3550, 1000, 0.38],
  [60.9, 1340, 880, 1.12],
  [62.9, 1340, 890, 1.22],
  [64.1, 1330, 1130, 0.58],
  [66.6, 1340, 1120, 0.61],
  [69.5, 1330, 1120, 0.63],
  [70.5, 2930, 1030, 1.15],
  [73.0, 2960, 1035, 1.22],
  [74.0, 1750, 1060, 0.48],
  [84.4, 1780, 1060, 0.49],
  [88.4, 1830, 1050, 0.5],
];
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const camAt = (t: number) => {
  if (t <= KEYS[0][0]) return KEYS[0];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i], b = KEYS[i + 1];
    if (t < b[0]) {
      const p = ease((t - a[0]) / (b[0] - a[0]));
      return [t, lerp(a[1], b[1], p), lerp(a[2], b[2], p), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), p))] as const;
    }
  }
  return KEYS[KEYS.length - 1];
};

// ── Hình học nòng (toạ độ cục bộ: gốc = mặt khoá nòng trên trục) ────────────
const barrelPath = (L: number) => `M0 -36 L260 -36 L${L} -27 L${L} 27 L260 36 L0 36 Z`;
const borePath = (L: number) => `M0 -21 L190 -21 L215 -17 L${L + BRAKE} -17 L${L + BRAKE} 17 L215 17 L190 21 L0 21 Z`;

const Patterns: React.FC = () => (
  <defs>
    <pattern id="s3grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="#c9b994" strokeWidth="1" opacity="0.45" />
    </pattern>
    <pattern id="s3gridB" width="200" height="200" patternUnits="userSpaceOnUse">
      <path d="M200 0 L0 0 0 200" fill="none" stroke="#b9a67c" strokeWidth="1.6" opacity="0.5" />
    </pattern>
    <pattern id="s3hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="9" height="9" fill={C.steel} />
      <line x1="0" y1="0" x2="0" y2="9" stroke={C.ink} strokeWidth="1.6" opacity="0.55" />
    </pattern>
    <pattern id="s3hatchB" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <rect width="7" height="7" fill={C.steelD} />
      <line x1="0" y1="0" x2="0" y2="7" stroke={C.ink} strokeWidth="1.4" opacity="0.6" />
    </pattern>
    <pattern id="s3hatchO" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill={C.oliveL} />
      <line x1="0" y1="0" x2="0" y2="8" stroke={C.oliveD} strokeWidth="1.6" />
    </pattern>
    <pattern id="s3dots" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill={C.expl} />
      <circle cx="2" cy="2" r="1.1" fill="#a8862e" />
      <circle cx="6" cy="6" r="0.9" fill="#a8862e" />
    </pattern>
    <pattern id="s3earth" width="34" height="22" patternUnits="userSpaceOnUse">
      <rect width="34" height="22" fill={C.soil} />
      <path d="M4 16 L10 8 M10 16 L16 8 M16 16 L22 8" stroke="#a48b5c" strokeWidth="1.6" />
    </pattern>
    <linearGradient id="s3barrel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#9aa56a" />
      <stop offset="0.3" stopColor="#6f7c45" />
      <stop offset="0.7" stopColor="#56613a" />
      <stop offset="1" stopColor="#353f24" />
    </linearGradient>
    <linearGradient id="s3body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#7d8a52" />
      <stop offset="0.55" stopColor="#5f6b3a" />
      <stop offset="1" stopColor="#3f4a2a" />
    </linearGradient>
    <linearGradient id="s3boreG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#24221f" />
      <stop offset="0.5" stopColor="#57534a" />
      <stop offset="1" stopColor="#24221f" />
    </linearGradient>
    <linearGradient id="s3charge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#e0bd80" />
      <stop offset="0.5" stopColor={C.ochre} />
      <stop offset="1" stopColor="#8a6430" />
    </linearGradient>
    <linearGradient id="s3shell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#95a066" />
      <stop offset="0.45" stopColor="#66733f" />
      <stop offset="1" stopColor="#3a4426" />
    </linearGradient>
  </defs>
);

// ── Đạn (gốc = đáy đạn, mũi theo +x) ───────────────────────────────────────
const Shell: React.FC<{ len: number; r: number; cut?: boolean; sw?: number; motor?: 'rocket' | 'bleed'; t?: number }> = ({ len: l, r, cut, sw = 2, motor, t = 0 }) => {
  const out = `M0 ${-r * 0.88} L${l * 0.07} ${-r} L${l * 0.58} ${-r} C${l * 0.8} ${-r} ${l * 0.93} ${-r * 0.45} ${l} 0 C${l * 0.93} ${r * 0.45} ${l * 0.8} ${r} ${l * 0.58} ${r} L${l * 0.07} ${r} L0 ${r * 0.88} Z`;
  const x0 = motor === 'rocket' ? l * 0.36 : motor === 'bleed' ? l * 0.2 : l * 0.1;
  const cav = `M${x0} ${-r * 0.66} L${l * 0.56} ${-r * 0.66} C${l * 0.72} ${-r * 0.64} ${l * 0.79} ${-r * 0.34} ${l * 0.83} 0 C${l * 0.79} ${r * 0.34} ${l * 0.72} ${r * 0.64} ${l * 0.56} ${r * 0.66} L${x0} ${r * 0.66} Z`;
  return (
    <g>
      <path d={out} fill={cut ? 'url(#s3hatchO)' : 'url(#s3shell)'} stroke={C.ink} strokeWidth={sw} strokeLinejoin="round" />
      {cut && <path d={cav} fill="url(#s3dots)" stroke={C.ink} strokeWidth={sw * 0.7} />}
      {motor === 'rocket' && cut && (
        <g>
          <rect x={l * 0.05} y={-r * 0.66} width={l * 0.28} height={r * 1.32} fill="#9c5a32" stroke={C.ink} strokeWidth={sw * 0.7} />
          <rect x={l * 0.05} y={-r * 0.18} width={l * 0.28} height={r * 0.36} fill="#3a2a22" />
          {[0.1, 0.17, 0.24].map((k) => <line key={k} x1={l * k} y1={-r * 0.66} x2={l * k} y2={r * 0.66} stroke="#6b3a20" strokeWidth={sw * 0.6} />)}
        </g>
      )}
      {motor === 'bleed' && cut && (
        <g>
          <rect x={l * 0.03} y={-r * 0.6} width={l * 0.14} height={r * 1.2} fill="#8f8a78" stroke={C.ink} strokeWidth={sw * 0.7} />
          <rect x={l * 0.03} y={-r * 0.22} width={l * 0.14} height={r * 0.44} fill={C.orange} opacity={0.75 + 0.25 * Math.sin(t * 30)} />
        </g>
      )}
      <rect x={l * 0.12} y={-r * 1.06} width={l * 0.05} height={r * 2.12} fill={C.copper} stroke={C.ink} strokeWidth={sw * 0.6} />
      <path d={`M${l * 0.86} ${-r * 0.38} L${l * 0.97} ${-r * 0.11} L${l} 0 L${l * 0.97} ${r * 0.11} L${l * 0.86} ${r * 0.38} Z`} fill="#a89c70" stroke={C.ink} strokeWidth={sw * 0.7} />
      {!cut && <line x1={l * 0.07} y1={-r * 0.55} x2={l * 0.58} y2={-r * 0.55} stroke="#c3cb92" strokeWidth={sw} opacity={0.6} />}
    </g>
  );
};

const Charges: React.FC<{ x1: number }> = ({ x1 }) => (
  <g>
    {[0, 1].map((i) => {
      const a = 6 + i * ((x1 - 8) / 2), w = (x1 - 8) / 2 - 4;
      return (
        <g key={i}>
          <rect x={a} y={-19} width={w} height={38} rx={6} fill="url(#s3charge)" stroke={C.ink} strokeWidth={2} />
          <line x1={a + 6} y1={0} x2={a + w - 6} y2={0} stroke="#6e4c22" strokeWidth={2} strokeDasharray="6 5" />
          <line x1={a + 4} y1={-12} x2={a + w - 4} y2={-12} stroke="#f0d7a2" strokeWidth={2} opacity={0.7} />
        </g>
      );
    })}
  </g>
);

// Khí cháy trong nòng (đã clip theo lòng nòng)
const Gas: React.FC<{ t: number; ign: number; xb: number; a: number }> = ({ t, ign, xb, a }) => {
  if (a <= 0.01 || xb < 4) return null;
  const age = t - ign;
  return (
    <g opacity={a}>
      <defs>
        <linearGradient id={`s3gas${Math.round(ign * 10)}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={xb} y2={0}>
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.45" stopColor="#ffc04a" />
          <stop offset="1" stopColor={C.orange} />
        </linearGradient>
      </defs>
      <rect x={0} y={-24} width={xb} height={48} fill={`url(#s3gas${Math.round(ign * 10)})`} />
      {Array.from({ length: 16 }, (_, i) => {
        const f = ((i / 16 + age * 0.45) % 1);
        const yy = Math.sin(i * 2.3 + age * 9) * 9;
        return <circle key={i} cx={xb * f} cy={yy} r={9 + (i % 3) * 4} fill={i % 2 ? '#ffd98a' : '#f0923c'} opacity={0.55} />;
      })}
    </g>
  );
};

// ── Khẩu pháo kéo 155 mm nhìn ngang (gốc = khoá nòng) ──────────────────────
const Wheel: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill="#2f2e2a" stroke={C.ink} strokeWidth={3} />
    {Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2;
      return <line key={i} x1={Math.cos(a) * (r - 2)} y1={Math.sin(a) * (r - 2)} x2={Math.cos(a) * (r - 14)} y2={Math.sin(a) * (r - 14)} stroke="#4a4842" strokeWidth={5} />;
    })}
    <circle r={r * 0.62} fill="#46443d" />
    <circle r={r * 0.56} fill="url(#s3body)" stroke={C.ink} strokeWidth={2.5} />
    <circle r={r * 0.3} fill={C.oliveD} stroke={C.ink} strokeWidth={2} />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return <circle key={i} cx={Math.cos(a) * r * 0.42} cy={Math.sin(a) * r * 0.42} r={4} fill={C.ink} />;
    })}
    <circle r={8} fill="#9aa56a" stroke={C.ink} strokeWidth={2} />
  </g>
);

const Carriage: React.FC<{ t: number }> = ({ t }) => {
  const pad = 14 * prog(t, 67.8, 68.4); // tấm đế hạ xuống khi triển khai
  return (
    <g strokeLinejoin="round">
      {/* càng kéo + chân càng */}
      <path d="M70 140 L-10 112 L-1140 296 L-1170 330 L-1120 336 L40 214 Z" fill="url(#s3body)" stroke={C.ink} strokeWidth={3} />
      <line x1={-20} y1={128} x2={-1120} y2={306} stroke="#9aa56a" strokeWidth={3} opacity={0.7} />
      {[-300, -600, -900].map((x) => <circle key={x} cx={x} cy={170 + (-x) * 0.13} r={5} fill={C.ink} />)}
      <path d="M-1185 286 L-1120 286 L-1132 382 L-1170 382 Z" fill={C.oliveD} stroke={C.ink} strokeWidth={3} />
      {/* bệ dưới */}
      <path d="M-80 108 L470 98 L505 150 L445 236 L120 246 L-40 204 Z" fill="url(#s3body)" stroke={C.ink} strokeWidth={3} />
      <path d="M-40 204 L120 246 L445 236 L470 200 L100 214 Z" fill={C.oliveD} opacity={0.7} />
      {/* chân đế bắn phía trước */}
      <rect x={455} y={210 + pad} width={52} height={110} fill={C.oliveD} stroke={C.ink} strokeWidth={3} />
      <rect x={410} y={318 + pad} width={150} height={20} rx={4} fill="#4a5530" stroke={C.ink} strokeWidth={3} />
      {/* bệ trên / yên */}
      <path d="M-30 96 L30 28 L340 28 L400 96 Z" fill="#6b7842" stroke={C.ink} strokeWidth={3} />
      <circle cx={150} cy={44} r={24} fill={C.oliveD} stroke={C.ink} strokeWidth={3} />
      <circle cx={150} cy={44} r={8} fill="#9aa56a" />
      {/* tay quay */}
      <g transform="translate(380 160)">
        <circle r={26} fill="none" stroke={C.ink} strokeWidth={4} />
        {[0, 60, 120].map((a) => <line key={a} x1={-26} y1={0} x2={26} y2={0} transform={`rotate(${a})`} stroke={C.ink} strokeWidth={2.5} />)}
      </g>
      {/* hộp ngắm */}
      <rect x={40} y={-150} width={130} height={62} rx={6} fill="#6b7842" stroke={C.ink} strokeWidth={3} />
      <rect x={168} y={-136} width={60} height={20} fill={C.oliveD} stroke={C.ink} strokeWidth={2.5} />
      <circle cx={232} cy={-126} r={9} fill="#2f6f6a" stroke={C.ink} strokeWidth={2} />
      <line x1={100} y1={-88} x2={100} y2={-50} stroke={C.ink} strokeWidth={6} />
      {/* bánh */}
      <Wheel x={280} y={220} r={120} />
    </g>
  );
};

const Cradle: React.FC = () => (
  <g strokeLinejoin="round">
    <rect x={20} y={-84} width={700} height={30} rx={12} fill="url(#s3body)" stroke={C.ink} strokeWidth={3} />
    <rect x={700} y={-78} width={60} height={18} fill="#9a9a8c" stroke={C.ink} strokeWidth={2} />
    <rect x={20} y={52} width={680} height={28} rx={12} fill="url(#s3body)" stroke={C.ink} strokeWidth={3} />
    <rect x={-30} y={-48} width={790} height={96} rx={10} fill="#56613a" stroke={C.ink} strokeWidth={3} />
    {[120, 380, 640].map((x) => <rect key={x} x={x} y={-48} width={18} height={96} fill={C.oliveD} opacity={0.8} />)}
  </g>
);

const BarrelExt: React.FC<{ L: number }> = ({ L }) => {
  const fx = L * 0.58;
  return (
    <g strokeLinejoin="round">
      <rect x={-120} y={-50} width={124} height={100} rx={8} fill="url(#s3body)" stroke={C.ink} strokeWidth={3} />
      <path d="M-120 -20 L-150 -40 L-160 -30 L-128 -6" fill={C.oliveD} stroke={C.ink} strokeWidth={2.5} />
      <path d={barrelPath(L)} fill="url(#s3barrel)" stroke={C.ink} strokeWidth={3} />
      <line x1={8} y1={-24} x2={L - 10} y2={-17} stroke="#c3cb92" strokeWidth={3} opacity={0.5} />
      <rect x={fx} y={-38} width={150} height={76} rx={14} fill="url(#s3barrel)" stroke={C.ink} strokeWidth={3} />
      <rect x={L} y={-42} width={BRAKE} height={84} rx={8} fill="url(#s3body)" stroke={C.ink} strokeWidth={3} />
      {[25, 75].map((o) => <rect key={o} x={L + o} y={-30} width={30} height={60} rx={4} fill="#1f1e1b" />)}
    </g>
  );
};

const BarrelCut: React.FC<{ L: number }> = ({ L }) => {
  const rif: number[] = [];
  for (let x = 218; x < L + BRAKE - 8; x += 15) rif.push(x);
  return (
    <g strokeLinejoin="round">
      <defs>
        <clipPath id="s3boreClip"><path d={borePath(L)} /></clipPath>
      </defs>
      {/* khối khoá nòng (cắt) */}
      <rect x={-120} y={-50} width={124} height={100} rx={8} fill="url(#s3hatch)" stroke={C.ink} strokeWidth={3} />
      <rect x={-84} y={-24} width={84} height={48} fill="url(#s3hatchB)" stroke={C.ink} strokeWidth={2.5} />
      <path d={`M-84 -24 ${Array.from({ length: 12 }, (_, i) => `L${-84 + i * 7 + 3.5} ${i % 2 ? -24 : -29}`).join(' ')} L0 -24`} fill="none" stroke={C.ink} strokeWidth={1.6} />
      <path d={`M-84 24 ${Array.from({ length: 12 }, (_, i) => `L${-84 + i * 7 + 3.5} ${i % 2 ? 24 : 29}`).join(' ')} L0 24`} fill="none" stroke={C.ink} strokeWidth={1.6} />
      <rect x={-140} y={-10} width={22} height={20} fill={C.oliveD} stroke={C.ink} strokeWidth={2} />
      <rect x={-6} y={-21} width={8} height={42} fill="#7a4a2e" />
      {/* lòng nòng tối + rãnh xoắn */}
      <path d={borePath(L)} fill="url(#s3boreG)" />
      <g clipPath="url(#s3boreClip)">
        {rif.map((x) => <line key={x} x1={x} y1={17} x2={x + 12} y2={-17} stroke="#8c8778" strokeWidth={2} opacity={0.55} />)}
      </g>
      {/* thành nòng (cắt) */}
      <path d={`${barrelPath(L)} ${borePath(L)}`} fillRule="evenodd" fill="url(#s3hatch)" stroke={C.ink} strokeWidth={3} />
      <rect x={L * 0.58} y={-38} width={150} height={21} fill="url(#s3hatchB)" stroke={C.ink} strokeWidth={2.5} />
      <rect x={L * 0.58} y={17} width={150} height={21} fill="url(#s3hatchB)" stroke={C.ink} strokeWidth={2.5} />
      {/* hãm giật đầu nòng (cắt): thành bị cửa xả cắt ngang */}
      {[[0, 25], [55, 20], [105, 25]].map(([o, w]) => (
        <g key={o}>
          <rect x={L + o} y={-42} width={w} height={25} fill="url(#s3hatchB)" stroke={C.ink} strokeWidth={2.5} />
          <rect x={L + o} y={17} width={w} height={25} fill="url(#s3hatchB)" stroke={C.ink} strokeWidth={2.5} />
        </g>
      ))}
      {[25, 75].map((o) => <rect key={o} x={L + o} y={-17} width={30} height={34} fill="#2a2825" />)}
    </g>
  );
};

const Branch: React.FC<{ x: number; y: number; rot: number; s: number; seed: number; drop: number }> = ({ x, y, rot, s, seed, drop }) => {
  if (drop <= 0) return null;
  const yy = y - (1 - drop) * 500;
  const tones = [C.olive, C.oliveL, C.oliveD, '#6f7f3c'];
  return (
    <g transform={`translate(${x} ${yy}) rotate(${rot + (1 - drop) * 25}) scale(${s})`} opacity={Math.min(1, drop * 2)}>
      <path d="M-170 10 Q -40 -6 170 -34" stroke="#5a4630" strokeWidth={9} fill="none" strokeLinecap="round" />
      {[-110, -20, 70].map((tx, i) => <path key={i} d={`M${tx} ${2 - i * 8} q 30 -40 70 -60`} stroke="#5a4630" strokeWidth={5} fill="none" />)}
      {Array.from({ length: 22 }, (_, i) => {
        const f = i / 21, lx = -160 + f * 320 + Math.sin(i * 7.1 + seed) * 18, ly = 6 - f * 40 + Math.cos(i * 3.3 + seed) * 26;
        return <ellipse key={i} cx={lx} cy={ly} rx={30} ry={12} transform={`rotate(${(i * 47 + seed * 13) % 180 - 90} ${lx} ${ly})`} fill={tones[(i + seed) % 4]} stroke={C.ink} strokeWidth={1.6} />;
      })}
    </g>
  );
};

// ── Lớp màn hình: thước tầm, thẻ nâng cấp, cân ─────────────────────────────
const RX0 = 230, PXKM = 36.2;
const kmX = (km: number) => RX0 + km * PXKM;

const Card: React.FC<{ cx: number; cy: number; s: number; children: React.ReactNode }> = ({ cx, cy, s, children }) => {
  if (s <= 0.001) return null;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`} opacity={Math.min(1, s * 1.5)}>
      <rect x={-190} y={-100} width={380} height={200} rx={14} fill={C.card} stroke={C.ink} strokeWidth={3} filter="url(#sh)" />
      <rect x={-178} y={-88} width={356} height={176} rx={8} fill="none" stroke="#c9b994" strokeWidth={1.5} strokeDasharray="6 5" />
      {children}
    </g>
  );
};

const Kettlebell: React.FC = () => (
  <g>
    <path d="M-22 -44 Q -24 -70 0 -70 Q 24 -70 22 -44" fill="none" stroke={C.ink} strokeWidth={9} />
    <circle cx={0} cy={-22} r={30} fill="#45433c" stroke={C.ink} strokeWidth={3} />
    <circle cx={-10} cy={-32} r={8} fill="#6d6a60" />
  </g>
);
const Coins: React.FC = () => (
  <g>
    {[0, 1, 2, 3].map((i) => (
      <g key={i} transform={`translate(${(i % 2) * 3} ${-10 - i * 11})`}>
        <ellipse cx={0} cy={4} rx={30} ry={9} fill="#9a7a2a" stroke={C.ink} strokeWidth={2} />
        <ellipse cx={0} cy={0} rx={30} ry={9} fill="#d9b44a" stroke={C.ink} strokeWidth={2} />
      </g>
    ))}
  </g>
);
const WornTube: React.FC = () => (
  <g transform="translate(0 -24)">
    <rect x={-38} y={-20} width={76} height={40} rx={4} fill="url(#s3hatch)" stroke={C.ink} strokeWidth={3} />
    <path d="M-38 -8 Q -20 -13 0 -6 Q 20 -14 38 -9 L38 9 Q 18 14 0 7 Q -20 13 -38 8 Z" fill="#3a3833" />
    <path d="M-30 -7 L-22 -2 M-6 -5 L2 3 M14 -8 L20 0" stroke={C.red} strokeWidth={2.5} />
  </g>
);

const S03: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const [, cx, cy, zoom] = camAt(t);
  const sh = handheld(t, 5, 's03cam');
  const toScr = (wx: number, wy: number) => [960 + (wx - cx) * zoom + sh[0], 540 + (wy - cy) * zoom + sh[1]] as const;

  // nòng: ngắn → dài (s03_gas) → dài hơn nữa (nâng cấp)
  const L = L_SHORT + (L_LONG - L_SHORT) * prog(t, 54.6, 55.4) + 350 * prog(t, 77.8, 78.6);
  const cut = 1 - prog(t, CUE.s03_bigger, CUE.s03_bigger + 0.8);
  const sink = 26 * prog(t, 64.3, 65.9);

  // đạn nặng (s03_heavier)
  const heavyIn = prog(t, CUE.s03_heavier, CUE.s03_heavier + 0.35);
  const heavyGrow = prog(t, 60.8, 61.8);
  const callout = prog(t, CUE.s03_heavier, CUE.s03_heavier + 0.45) * (1 - prog(t, 62.9, 63.3));

  // springs (gọi cố định số lần)
  const sp155 = useSpring(t, CUE.s03_155, 12);
  const c1 = useSpring(t, 77.8, 11), c2 = useSpring(t, 78.82, 11), c3 = useSpring(t, 81.06, 11);
  const bal = useSpring(t, CUE.s03_costs, 13);
  const w0 = useSpring(t, 85.2, 9, 120), w1 = useSpring(t, 86.3, 9, 120), w2 = useSpring(t, 86.82, 9, 120), w3 = useSpring(t, 87.32, 9, 120);
  const jump40 = useSpring(t, CUE.s03_40, 12, 140);

  // các phát bắn
  const shotState = SHOTS.map((s) => {
    const inB = t >= s.ign && t < s.exit;
    const tau = Math.max(0, Math.min(1, (t - s.ign) / (s.exit - s.ign)));
    const xbBore = SB0 + s.D * tau * tau;
    const dt = t - s.exit;
    const flying = dt >= 0 && dt < FALL;
    const fx = s.mx + s.v * Math.max(0, dt), fy = 0.5 * G * Math.max(0, dt) ** 2;
    return { ...s, inB, xbBore, dt, flying, fx, fy, visible: t >= s.show && t < s.exit };
  });

  const trajFade = 1 - prog(t, 61.5, 62.5);
  const trajPath = (s: (typeof shotState)[number]) => {
    const tEnd = Math.min(FALL, Math.max(0, s.dt));
    const n = 30, pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const d = (tEnd * i) / n;
      pts.push(`${(BX + s.mx + s.v * d).toFixed(1)} ${(AY + 0.5 * G * d * d).toFixed(1)}`);
    }
    return 'M' + pts.join(' L');
  };

  // thước tầm
  const ruler = prog(t, 73.6, 74.3);
  const km = 20 * prog(t, CUE.s03_range20, CUE.s03_range20 + 0.4) + 10 * prog(t, CUE.s03_range30, CUE.s03_range30 + 0.35) + 10 * jump40;
  const cardsOut = 1 - prog(t, 84.2, 84.6);
  const pulse = 1 + 0.06 * bump(t, CUE.s03_40, 0.5);

  // cân: lệch trái khi đặt "km", lệch phải khi ba quả cân rơi xuống
  const beam = bal > 0 ? -9 * w0 + 9.5 * (w1 + w2 + w3) : 0;
  const PV = [1310, 150] as const, ARM = 240;
  const rad = (beam * Math.PI) / 180;
  const hangL = [PV[0] - ARM * Math.cos(rad), PV[1] - ARM * Math.sin(rad)] as const;
  const hangR = [PV[0] + ARM * Math.cos(rad), PV[1] + ARM * Math.sin(rad)] as const;
  const fall = (land: number, panY: number) => {
    const p = Math.min(1, Math.max(0, (t - (land - 0.32)) / 0.32));
    return t < land - 0.32 ? null : panY - (1 - p * p) * 380 - 6 * bump(t, land, 0.25);
  };

  const lab155 = toScr(BX + L + BRAKE + 290, AY - 135);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Cam2D x={cx} y={cy} zoom={zoom} shake={sh} bg={C.paper}>
        <svg width={10000} height={4400} viewBox="-2000 -1000 10000 4400" style={{ position: 'absolute', left: -2000, top: -1000 }}>
          <Defs2D shadow="rgba(60,45,20,0.35)" />
          <Patterns />
          {/* giấy kỹ thuật */}
          <rect x={-2000} y={-1000} width={10000} height={4400} fill={C.paper} />
          <rect x={-2000} y={-1000} width={10000} height={4400} fill="url(#s3grid)" />
          <rect x={-2000} y={-1000} width={10000} height={4400} fill="url(#s3gridB)" />
          {/* đồi xa nét chì, chiều sâu */}
          <path d={skyline('s3far', -2000, 8000, 1400, 420, 1400)} fill="#e6dabf" />
          <path d={skyline('s3mid', -2000, 8000, 1400, 220, 900)} fill="#ddcfae" opacity={0.85} />
          {/* đường tâm trục nòng (gạch chấm) */}
          <line x1={-600} y1={AY} x2={7500} y2={AY} stroke={C.red} strokeWidth={2} strokeDasharray="40 10 6 10" opacity={0.35 * cut} />

          {/* bóng đổ dài trên mặt ruộng (golden hour) */}
          <path d={`M${BX - 1150} 1404 L${BX + L + BRAKE} 1404 L${BX + L + BRAKE + 1100} 1438 L${BX - 700} 1438 Z`} fill="#3b2f1c" opacity={0.12 + 0.22 * prog(t, CUE.s03_hide, CUE.s03_hide + 0.6) + 0.06 * (1 - cut)} />

          {/* pháo */}
          <g transform={`translate(${BX} ${AY + sink})`} filter="url(#sh)">
            <Carriage t={t} />
            <Cradle />
            {cut < 1 && <g opacity={1 - cut}><BarrelExt L={L} /></g>}
            {cut > 0 && (
              <g opacity={cut}>
                <BarrelCut L={L} />
                <g clipPath="url(#s3boreClip)">
                  {shotState.map((s) => {
                    const ga = s.inB ? 1 : t >= s.exit ? 1 - prog(t, s.exit, s.exit + 0.9) : 0;
                    const xb = s.inB ? s.xbBore : L + BRAKE;
                    return t >= s.ign ? <Gas key={s.ign} t={t} ign={s.ign} xb={xb} a={ga} /> : null;
                  })}
                </g>
                {/* liều phóng */}
                {t < SHOTS[0].ign && <Charges x1={SB0 - 4} />}
                {t >= 54.9 && t < SHOTS[1].ign && <g opacity={prog(t, 54.9, 55.2)}><Charges x1={SB0 - 4} /></g>}
                {heavyIn > 0 && <g opacity={heavyIn}><Charges x1={SB0 - 4} /></g>}
                {/* đạn trong nòng */}
                {shotState.map((s) => s.visible && (
                  <g key={s.ign} transform={`translate(${s.inB ? s.xbBore : SB0} 0)`} opacity={s.ign > 54 ? prog(t, 54.9, 55.2) : 1}>
                    <Shell len={SLEN} r={SR} cut sw={1.8} />
                  </g>
                ))}
                {heavyIn > 0 && (
                  <g transform={`translate(${SB0} 0)`} opacity={heavyIn}>
                    <Shell len={SLEN * (1 + 0.35 * heavyGrow)} r={SR} cut sw={1.8} />
                  </g>
                )}
                {/* chớp mồi lửa */}
                {SHOTS.map((s) => <circle key={s.ign} cx={10} cy={0} r={46} fill="#fff1b8" opacity={0.9 * bump(t, s.ign - 0.02, 0.25)} />)}
              </g>
            )}
            {/* bùn trồi quanh bánh khi lún */}
            <path d={`M140 ${GROUND - sink} q 30 ${-14 * sink / 26} 60 0 M360 ${GROUND - sink} q 30 ${-14 * sink / 26} 60 0`} fill="#8a6a3c" stroke={C.ink} strokeWidth={2} opacity={sink > 1 ? 1 : 0} />
          </g>

          {/* nhánh cây ngụy trang: không che hết */}
          {[
            [700, 1150, -8, 1.0, 1, 0], [1180, 1080, 6, 1.1, 2, 0.15], [380, 1240, -18, 0.9, 3, 0.3], [1500, 1150, 12, 0.85, 4, 0.42], [-200, 1300, -14, 0.8, 5, 0.55],
          ].map(([x, y, r, s, sd, d]) => (
            <Branch key={sd} x={x} y={y + sink} rot={r} s={s} seed={sd} drop={prog(t, CUE.s03_hide + d, CUE.s03_hide + d + 0.5)} />
          ))}

          {/* mặt đất: ruộng + mặt cắt đất */}
          <rect x={-2000} y={1400} width={10000} height={40} fill={C.field} />
          <path d={`M${BX - 1150} 1404 L${BX + L + BRAKE} 1404 L${BX + L + BRAKE + 1100} 1438 L${BX - 700} 1438 Z`} fill="#3b2f1c" opacity={0.1 + 0.25 * prog(t, CUE.s03_hide, CUE.s03_hide + 0.6)} />
          <rect x={-2000} y={1440} width={10000} height={2000} fill="url(#s3earth)" />
          <line x1={-2000} y1={1400} x2={8000} y2={1400} stroke={C.ink} strokeWidth={3} />
          <line x1={-2000} y1={1440} x2={8000} y2={1440} stroke={C.ink} strokeWidth={2} opacity={0.6} />
          {[1520, 1640].map((y, i) => <path key={y} d={skyline(`s3st${i}`, -2000, 8000, y, 30, 500, y + 3)} fill="none" stroke="#a48b5c" strokeWidth={3} opacity={0.6} />)}
          {/* bùn lầy dưới pháo */}
          <ellipse cx={BX + 280} cy={1420} rx={260 * prog(t, 64.3, 65.5)} ry={18} fill="#8a6a3c" opacity={0.7} />

          {/* bụi khi lún, khi đóng chân càng */}
          {[0, 1, 2, 3].map((i) => (
            <Puff2D key={i} seed={20 + i} x={BX + 140 + i * 90 + (t - 64.4) * 30} y={1385 - (t - 64.4) * 25} r={40 + i * 8 + (t - 64.4) * 20} color="#cdbb94" opacity={0.75 * bump(t, 64.4 + i * 0.15, 1.8)} />
          ))}
          {[0, 1].map((i) => (
            <Puff2D key={i} seed={40 + i} x={BX - 1150 + i * 60} y={1380 - (t - 68.0) * 30} r={36 + (t - 68.0) * 30} color="#cdbb94" opacity={0.7 * bump(t, 68.0 + i * 0.12, 1.4)} />
          ))}

          {/* đạn bay, quỹ đạo cam, vệt tốc độ */}
          {shotState.map((s) => (
            <g key={s.ign}>
              {s.dt > 0 && <path d={trajPath(s)} fill="none" stroke={C.orange} strokeWidth={s.ign > 54 ? 7 : 5} strokeDasharray="22 14" opacity={trajFade * (s.ign > 54 ? 1 : 0.55)} strokeLinecap="round" />}
              {s.flying && (
                <g transform={`translate(${BX + s.fx} ${AY + s.fy}) rotate(${(Math.atan2(G * s.dt, s.v) * 180) / Math.PI})`}>
                  {[-12, -4, 5, 13].map((o, i) => (
                    <line key={o} x1={-s.v * (0.07 + 0.03 * (i % 2))} y1={o} x2={-8} y2={o} stroke={i % 2 ? C.ink : C.orange} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
                  ))}
                  <Shell len={SLEN} r={SR} sw={2} />
                </g>
              )}
              <Muzzle2D t={t} at={s.exit} x={BX + s.mx + 10} y={AY} angle={0} size={s.size} seed={s.seed} />
              <Blast2D t={t} at={s.exit + FALL} x={BX + s.mx + s.range} y={1400} size={s.ign > 54 ? 60 : 44} seed={s.seed + 10} life={3.5} />
              {t > s.exit + FALL && (
                <g opacity={trajFade}>
                  <ellipse cx={BX + s.mx + s.range} cy={1408} rx={70} ry={12} fill="#5a4630" opacity={0.6} />
                  <path d={`M${BX + s.mx + s.range} 1360 l0 -70`} stroke={C.ink} strokeWidth={3} strokeDasharray="8 6" />
                </g>
              )}
            </g>
          ))}

          {/* chi tiết đạn nặng (callout) */}
          {callout > 0.001 && (
            <g opacity={callout}>
              <circle cx={BX + SB0 + 110} cy={AY} r={150} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="16 10" />
              <line x1={BX + SB0 + 110} y1={AY - 150} x2={BX + SB0 + 110} y2={890} stroke={C.ink} strokeWidth={3} />
              <g transform={`translate(${BX + 330} 760) scale(${0.85 + 0.15 * callout})`}>
                <rect x={-320} y={-130} width={640} height={260} rx={16} fill={C.card} stroke={C.ink} strokeWidth={3.5} filter="url(#sh)" />
                <rect x={-306} y={-116} width={612} height={232} rx={10} fill="none" stroke="#c9b994" strokeWidth={2} strokeDasharray="8 6" />
                <g transform="translate(-282 0)">
                  <Shell len={SLEN * 2.15 * (1 + 0.35 * heavyGrow)} r={SR * 2.6 * (1 + 0.14 * heavyGrow)} cut sw={3} />
                </g>
                {/* mũi tên trọng lượng tăng */}
                <g transform={`translate(240 ${70 + 14 * heavyGrow})`} opacity={heavyGrow}>
                  <path d="M0 -40 L0 10 M-16 -6 L0 12 L16 -6" stroke={C.red} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>
            </g>
          )}

          {/* 155 mm: hình chiếu mặt đầu nòng (tỉ lệ 3:1) */}
          {(() => {
            const a = prog(t, CUE.s03_155 - 0.2, CUE.s03_155 + 0.4) * (1 - prog(t, 73.2, 73.7));
            if (a <= 0.001) return null;
            const ex = BX + L + BRAKE + 290;
            return (
              <g opacity={a}>
                {[-1, 1].map((k) => <line key={k} x1={BX + L + BRAKE + 8} y1={AY + k * 17} x2={ex - 60} y2={AY + k * 51} stroke={C.ink} strokeWidth={2} strokeDasharray="10 8" />)}
                <circle cx={ex} cy={AY} r={84} fill="url(#s3hatch)" stroke={C.ink} strokeWidth={3.5} filter="url(#sh)" />
                <circle cx={ex} cy={AY} r={51} fill="#2a2825" stroke={C.ink} strokeWidth={3} />
                {Array.from({ length: 24 }, (_, i) => {
                  const q = (i / 24) * Math.PI * 2 + t * 0.3;
                  return <rect key={i} x={ex + Math.cos(q) * 49 - 3} y={AY + Math.sin(q) * 49 - 3} width={6} height={6} fill={C.steel} transform={`rotate(${(q * 180) / Math.PI} ${ex + Math.cos(q) * 49} ${AY + Math.sin(q) * 49})`} />;
                })}
                <line x1={ex} y1={AY - 51} x2={ex} y2={AY + 51} stroke={C.orange} strokeWidth={4} {...{ strokeDasharray: '102 102', strokeDashoffset: 102 * (1 - sp155) }} />
                <path d={`M${ex - 9} ${AY - 39} L${ex} ${AY - 51} L${ex + 9} ${AY - 39} M${ex - 9} ${AY + 39} L${ex} ${AY + 51} L${ex + 9} ${AY + 39}`} stroke={C.orange} strokeWidth={4} fill="none" opacity={sp155} />
                <line x1={ex - 110} y1={AY} x2={ex + 110} y2={AY} stroke={C.red} strokeWidth={2} strokeDasharray="30 8 5 8" opacity={0.6} />
              </g>
            );
          })()}
        </svg>
      </Cam2D>

      {/* lớp màn hình */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Defs2D shadow="rgba(60,45,20,0.35)" />
        <Patterns />
        {ruler > 0 && (
          <g transform={`translate(0 ${(1 - ruler) * 240})`}>
            <rect x={150} y={905} width={1620} height={110} rx={10} fill={C.card} stroke={C.ink} strokeWidth={3} filter="url(#sh)" />
            {Array.from({ length: 41 }, (_, i) => (
              <line key={i} x1={kmX(i)} y1={905} x2={kmX(i)} y2={905 + (i % 10 === 0 ? 34 : i % 5 === 0 ? 22 : 12)} stroke={C.ink} strokeWidth={i % 10 === 0 ? 3 : 1.6} />
            ))}
            <rect x={RX0} y={958} width={40 * PXKM} height={32} rx={6} fill="#e3d7bd" stroke={C.ink} strokeWidth={2} />
            {km > 0.05 && (
              <g>
                <rect x={RX0} y={958} width={km * PXKM} height={32} rx={6} fill={C.orange} stroke={C.ink} strokeWidth={2.5} />
                <rect x={RX0 + 4} y={962} width={Math.max(0, km * PXKM - 8)} height={8} rx={3} fill="#f6a865" />
                <path d={`M${RX0} 950 Q ${RX0 + (km * PXKM) / 2} ${950 - 20 - km * 1.6} ${kmX(km)} 950`} fill="none" stroke={C.orange} strokeWidth={4} strokeDasharray="14 9" />
                <circle cx={kmX(km)} cy={974} r={9 + 6 * bump(t, CUE.s03_40, 0.5)} fill="#fff1b8" stroke={C.ink} strokeWidth={2} />
              </g>
            )}
            {/* biểu tượng pháo nhỏ ở vạch 0 */}
            <g transform={`translate(${RX0 - 10} 952)`}>
              <path d="M-50 0 L-10 -10 L40 -22 L42 -16 L-4 -2 L0 6 Z" fill={C.olive} stroke={C.ink} strokeWidth={2} />
              <circle cx={-14} cy={6} r={9} fill={C.ink} />
            </g>
          </g>
        )}

        {/* ba nâng cấp tầm bắn */}
        {cardsOut > 0 && (
          <g opacity={cardsOut}>
            <Card cx={600} cy={215} s={c1 * pulse}>
              <g transform="translate(-150 10)">
                <rect x={-10} y={-20} width={26} height={40} rx={4} fill="url(#s3body)" stroke={C.ink} strokeWidth={2.5} />
                <path d="M16 -14 L170 -11 L170 11 L16 14 Z" fill="url(#s3barrel)" stroke={C.ink} strokeWidth={2.5} />
                <path d={`M170 -11 L${170 + 90 * prog(t, 77.8, 78.4)} -10 L${170 + 90 * prog(t, 77.8, 78.4)} 10 L170 11 Z`} fill={C.orange} stroke={C.ink} strokeWidth={2.5} />
                <rect x={170 + 90 * prog(t, 77.8, 78.4)} y={-17} width={40} height={34} rx={4} fill="url(#s3body)" stroke={C.ink} strokeWidth={2.5} />
                <path d={`M180 36 L${180 + 70 * prog(t, 77.8, 78.4)} 36`} stroke={C.orange} strokeWidth={5} strokeLinecap="round" />
                <path d={`M${170 + 70 * prog(t, 77.8, 78.4)} 26 L${186 + 70 * prog(t, 77.8, 78.4)} 36 L${170 + 70 * prog(t, 77.8, 78.4)} 46`} stroke={C.orange} strokeWidth={5} fill="none" strokeLinecap="round" />
              </g>
            </Card>
            <Card cx={1020} cy={215} s={c2 * pulse}>
              <g transform="translate(-90 0)">
                {[0, 1, 2].map((i) => (
                  <ellipse key={i} cx={-30 - i * 22 - 8 * Math.sin(t * 25 + i)} cy={0} rx={34 - i * 7} ry={12 - i * 2.5} fill={i === 0 ? '#fff1b8' : i === 1 ? '#ffc04a' : C.orange} opacity={0.9} />
                ))}
                <path d="M0 -14 L-14 -20 L-14 20 L0 14 Z" fill="#45433c" stroke={C.ink} strokeWidth={2} />
                <Shell len={250} r={36} cut sw={2.5} motor="rocket" t={t} />
              </g>
            </Card>
            <Card cx={1440} cy={215} s={c3 * pulse}>
              <g transform="translate(-90 0)">
                {[0, 1, 2, 3].map((i) => {
                  const f = ((t * 1.6 + i / 4) % 1);
                  return <Puff2D key={i} seed={60 + i} x={-14 - f * 70} y={Math.sin(i * 2) * 6} r={10 + f * 16} color="#b9b2a2" opacity={(1 - f) * 0.9} />;
                })}
                <Shell len={250} r={36} cut sw={2.5} motor="bleed" t={t} />
              </g>
            </Card>
          </g>
        )}

        {/* cán cân chi phí */}
        {bal > 0.001 && (
          <g transform={`translate(${PV[0]} ${PV[1] + 300}) scale(${bal}) translate(${-PV[0]} ${-PV[1] - 300})`} opacity={Math.min(1, bal * 1.5)}>
            <path d={`M${PV[0] - 70} 470 L${PV[0] + 70} 470 L${PV[0] + 46} 446 L${PV[0] - 46} 446 Z`} fill={C.oliveD} stroke={C.ink} strokeWidth={3} filter="url(#sh)" />
            <rect x={PV[0] - 9} y={PV[1]} width={18} height={300} fill="url(#s3body)" stroke={C.ink} strokeWidth={3} />
            <path d={`M${PV[0] - 20} ${PV[1] - 26} L${PV[0] + 20} ${PV[1] - 26} L${PV[0]} ${PV[1] + 4} Z`} fill={C.ochre} stroke={C.ink} strokeWidth={2.5} />
            <line x1={hangL[0]} y1={hangL[1]} x2={hangR[0]} y2={hangR[1]} stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
            <line x1={hangL[0]} y1={hangL[1]} x2={hangR[0]} y2={hangR[1]} stroke={C.ochreL} strokeWidth={7} strokeLinecap="round" />
            <circle cx={PV[0]} cy={PV[1]} r={11} fill={C.ochre} stroke={C.ink} strokeWidth={3} />
            {[hangL, hangR].map((h, i) => {
              const py = h[1] + 130;
              return (
                <g key={i}>
                  <path d={`M${h[0]} ${h[1]} L${h[0] - 74} ${py} M${h[0]} ${h[1]} L${h[0] + 74} ${py}`} stroke={C.ink} strokeWidth={2.5} />
                  {i === 0 && (() => {
                    const y = fall(85.2, py);
                    return y === null ? null : (
                      <g transform={`translate(${h[0]} ${y})`}>
                        <rect x={-52} y={-30} width={104} height={28} rx={5} fill={C.orange} stroke={C.ink} strokeWidth={2.5} />
                        {[-36, -18, 0, 18, 36].map((x) => <line key={x} x1={x} y1={-30} x2={x} y2={-18} stroke={C.ink} strokeWidth={2} />)}
                      </g>
                    );
                  })()}
                  {i === 1 && [
                    { land: 86.3, dx: -44, el: <Kettlebell /> },
                    { land: 86.82, dx: 0, el: <Coins /> },
                    { land: 87.32, dx: 46, el: <WornTube /> },
                  ].map((w) => {
                    const y = fall(w.land, py);
                    return y === null ? null : <g key={w.land} transform={`translate(${h[0] + w.dx} ${y})`}>{w.el}</g>;
                  })}
                  <path d={`M${h[0] - 86} ${py} Q ${h[0]} ${py + 42} ${h[0] + 86} ${py} Z`} fill="url(#s3body)" stroke={C.ink} strokeWidth={3} filter="url(#sh)" />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* nhãn (tối đa một cái mỗi lúc) */}
      <Label t={t} text="155 mm" x={lab155[0]} y={lab155[1]} from={CUE.s03_155} until={73.2} size={52} bg={C.card} fg={C.ink} />
      <Label t={t} text="20–30 km" x={kmX(25)} y={820} from={CUE.s03_range30} until={83.6} size={50} bg={C.card} fg={C.ink} />
      <Label t={t} text="40 km" x={kmX(40) - 40} y={820} from={CUE.s03_40} size={50} bg={C.orange} fg="#fff8ec" />
      <Grain opacity={0.45} />
    </AbsoluteFill>
  );
};

export default S03;
