// Bảng màu & Hàm toán thời gian dùng chung:
// - Vật thể / Phương tiện: tông xanh dương sáng nổi bật, tương phản cao (camo1, camo2, blue, fuel, red).
// - Bối cảnh / Nền: sáng sủa và linh hoạt theo không gian (trời xanh ban ngày skyColors, đất cát sáng hemp, cỏ xanh grass, biển/bản đồ xanh lam vừa phải sea/bg).
import { loadFont } from '@remotion/google-fonts/SpaceGrotesk';
import { interpolate, Easing } from 'remotion';

export const { fontFamily: FONT } = loadFont('normal', { weights: ['500', '700'], subsets: ['latin'] });

export const D = {
  // Viền & Bề mặt sáng
  ink: '#1e1b26',
  paper: '#fff8ec',
  foam: '#e9fbff',
  belly: '#eef6fc',

  // Bối cảnh & Địa hình sáng sủa, linh hoạt (Biển, Bản đồ, Cỏ, Đất cát, Đá)
  bg: '#164873',
  bgDeep: '#0b2742',
  panel: '#12395e',
  grid: '#6fc3e0',
  sea: '#2f7fa8',
  seaDeep: '#1d5a80',
  seaLight: '#6fc3e0',
  grass: '#7cab5a',
  grassDark: '#557f3c',
  rock: '#6b5348',
  hemp: '#dcc59a',
  hempDark: '#b49a6d',

  // Vật thể / Phương tiện: Xanh dương sáng nổi bật, tương phản cao
  camo1: '#4aa8ee',
  camo2: '#82c8ff',
  grey: '#dcebf7',
  greyDark: '#8eb5d6',

  // Điểm nhấn Năng lượng / Hỏa lực / Cảnh báo
  fuel: '#ffae2b',
  fuelHot: '#ffe885',
  red: '#ff4747',
  blue: '#38b6ff',
  teal: '#24e5d3',
};

export const FPS = 30;
export const W = 1920, H = 1080, SAFE = 96;

/** Tiến độ 0..1 giữa a và b (giây), có easing. */
export const prog = (t: number, a: number, b: number, ease: (x: number) => number = Easing.bezier(0.45, 0, 0.2, 1)) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const rnd = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Pha hai màu hex. */
export function mix(a: string, b: number | string, p?: number): string {
  const bhStr = typeof b === 'string' ? b : '#000000';
  const q = Math.max(0, Math.min(1, p ?? 0.5));
  const ah = parseInt(a.slice(1), 16), bh = parseInt(bhStr.slice(1), 16);
  const ch = (s: number) => Math.round(lerp((ah >> s) & 255, (bh >> s) & 255, q));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

/** Màu trời linh hoạt theo giờ: 0..0.15 trưa xanh dương sáng trong, 0.5 hoàng hôn, 1 đêm. */
export function skyColors(h: number): [string, string, string] {
  const k: [string, string, string][] = [
    ['#3d8fd6', '#79bde8', '#cfeaf6'],
    ['#3b4f9a', '#c46a7e', '#ffbf7a'],
    ['#0c1838', '#24325e', '#4a4f7c'],
  ];
  const i = h < 0.5 ? 0 : 1, p = Math.max(0, Math.min(1, (h - i * 0.5) / 0.5));
  return [0, 1, 2].map((j) => mix(k[i][j], k[i + 1][j], p)) as [string, string, string];
}

/** Nhô lên rồi xuống trong d giây từ a (0 ngoài khoảng). */
export const bump = (t: number, a: number, d: number) => { const p = (t - a) / d; return p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI); };
/** Radian → độ: dùng cho SVG rotate. */
export const deg = (r: number) => (r * 180) / Math.PI;
