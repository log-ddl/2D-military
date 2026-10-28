// Thiết kế mỹ thuật riêng của dự án `test`:
// "Amber Steppe Dusk & Armory Cutaway" — Hoàng hôn thảo nguyên hổ phách (3D) & Bản vẽ xưởng thiết kế giáp / X-quang nổ lõm (2D).
import type { StageProps } from '@lib/3d/stage';
import type { TerrainColors } from '@lib/3d/terrain';

export const P2D = {
  // 1. Nền đá phiến xưởng thử đạn đạo & X-quang (dùng cho S02, S06)
  slateBg: '#0e1621',
  slateDeep: '#090f17',
  slatePanel: '#162334',
  slateGrid: '#24384f',
  slateRule: '#4e6b8a',
  slateText: '#e6effa',
  slateMuted: '#89a4c2',

  // 2. Nền giấy hồ sơ kỹ sư phân bổ trọng lượng (dùng cho S04 — tương phản sáng với S02/S06)
  paperBg: '#efe7d6',
  paperWarm: '#e2d6be',
  paperPanel: '#f8f3e8',
  paperGrid: '#cbbda3',
  paperInk: '#18212b',
  paperMuted: '#5b6570',

  // 3. Thép & Giáp nhiều tầng sáng-tối
  steelHi: '#56728f',
  steelMid: '#374c63',
  steelLo: '#223040',
  steelDark: '#131c26',
  stroke: '#0b1017',
  ceramicHi: '#7d9ec0',
  ceramicLo: '#4a6682',

  // 4. Ngữ nghĩa chiến thuật & vật lý nổ
  armorSafe: '#38a8ff',
  armorSafeHi: '#88d2ff',
  weakRed: '#ff493b',
  weakGlow: '#ff8e75',
  explosive: '#e6be4c',
  explosiveDark: '#b38922',
  copper: '#d97b42',
  copperHi: '#f7ac72',
  copperDark: '#8c451c',
  jetCore: '#fff8d6',
  jetMid: '#ffa82b',
  jetOuter: '#ff4f19',
  radar: '#2be8d8',
  radarDim: '#157a73',
} as const;

/** Cấu hình ánh sáng 3D thực địa hoàng hôn thảo nguyên (S01, S03, S05). */
export const STAGE_DUSK: Omit<StageProps, 'children'> = {
  sky: ['#2b4c73', '#8ca3b5', '#dfbd93'],
  sun: [55, 24, 32],
  sunColor: '#ffd7a1',
  sunIntensity: 3.0,
  fog: [115, 460],
  fogColor: '#c8bba5',
  env: 0.42,
  ambient: 0.22,
  exposure: 1.05,
  post: { bloom: 0.55, bloomThreshold: 0.82, ao: 2.1, vignette: 0.42 },
};

/** Cấu hình ánh sáng 3D chạng vạng xanh thép cho cảnh kết APS Radar 360° (S07). */
export const STAGE_TWILIGHT: Omit<StageProps, 'children'> = {
  sky: ['#142642', '#466380', '#b58b67'],
  sun: [-45, 16, 35],
  sunColor: '#ffbc7a',
  sunIntensity: 2.5,
  fog: [95, 390],
  fogColor: '#56697d',
  env: 0.45,
  ambient: 0.24,
  exposure: 1.08,
  post: { bloom: 0.85, bloomThreshold: 0.72, ao: 2.0, vignette: 0.48 },
};

/** Bảng màu đất cỏ thảo nguyên khô đồng nhất cho Terrain 3D. */
export const STEPPE_COLORS: TerrainColors = {
  low: '#5c6847',
  high: '#918961',
  rock: '#635d56',
  dry: '#b89f6d',
};

/**
 * Biên dạng chuẩn nhìn ngang (đơn vị mét, mũi +X, mặt đất y=0) của xe tăng MBT trong dự án này.
 * Giúp các cảnh 2D (S02, S04, S06) vẽ mặt cắt đồng nhất tỉ lệ thật với mô hình 3D `MBT`.
 */
export const MBT_SPEC = {
  hullLen: 7.9,
  totalLen: 9.6,
  turretRoofY: 2.42,
  hullRoofY: 1.54,
  hullPts: [
    [-3.85, 0.54],
    [-3.95, 1.48],
    [-3.78, 1.65],
    [-1.55, 1.66],
    [-1.42, 1.54],
    [2.15, 1.48],
    [3.95, 0.96],
    [3.12, 0.45],
    [-3.05, 0.44],
  ] as [number, number][],
  turretPts: [
    [-2.35, 1.62],
    [-2.42, 2.34],
    [-0.55, 2.42],
    [0.95, 2.40],
    [1.88, 1.98],
    [1.42, 1.56],
  ] as [number, number][],
  wheelXs: [-2.55, -1.72, -0.89, -0.06, 0.77, 1.60, 2.43],
} as const;
