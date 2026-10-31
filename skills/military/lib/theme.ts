// Bảng màu mặc định và font của skill quân sự. Mỗi video tự thiết kế màu riêng trong src/design/, có thể bắt đầu từ D.
// - Vật thể / Phương tiện: tông xanh dương sáng nổi bật, tương phản cao (camo1, camo2, blue, fuel, red).
// - Bối cảnh / Nền: trời xanh ban ngày skyColors, đất cát hemp, cỏ grass, biển/bản đồ sea/bg.
import { loadFont } from '@remotion/google-fonts/SpaceGrotesk';
import { mix } from '@core/time';

export const { fontFamily: FONT } = loadFont('normal', { weights: ['500', '700'], subsets: ['latin'] });

export const D = {
  // Viền & Bề mặt sáng
  ink: '#1e1b26',
  paper: '#fff8ec',
  foam: '#e9fbff',
  belly: '#eef6fc',

  // Bối cảnh & Địa hình (Biển, Bản đồ, Cỏ, Đất cát, Đá)
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

  // Vật thể / Phương tiện
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

/** Màu trời theo giờ: 0..0.15 trưa xanh trong, 0.5 hoàng hôn, 1 đêm. */
export function skyColors(h: number): [string, string, string] {
  const k: [string, string, string][] = [
    ['#3d8fd6', '#79bde8', '#cfeaf6'],
    ['#3b4f9a', '#c46a7e', '#ffbf7a'],
    ['#0c1838', '#24325e', '#4a4f7c'],
  ];
  const i = h < 0.5 ? 0 : 1, p = Math.max(0, Math.min(1, (h - i * 0.5) / 0.5));
  return [0, 1, 2].map((j) => mix(k[i][j], k[i + 1][j], p)) as [string, string, string];
}
