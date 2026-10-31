// Thiết kế mỹ thuật riêng cho vid7 — Cuộc không kích Doolittle (18/04/1942): "Iron & Salt, Fire & Monsoon"
// Chỉ chứa bảng màu và cấu hình ánh sáng 3D theo giờ/bối cảnh (chữ dùng <Label> từ @skill/military/label).
import type { StageProps } from '@skill/military/3d/stage';
import type { TerrainColors } from '@skill/military/3d/terrain';

export type LightingPreset = Pick<
  StageProps,
  'sky' | 'sun' | 'sunColor' | 'sunIntensity' | 'fog' | 'fogColor' | 'env' | 'ambient' | 'exposure' | 'post'
>;

/** Bảng màu sơn khí tài 3D — thống nhất toàn phim */
export const PAINT = {
  // USAAF B-25B Mitchell (Olive Drab 41 thân trên + Neutral Gray 43 bụng)
  usaafOlive: '#545f3b',
  usaafOliveCamo: ['#485232', '#647047'],
  usaafBelly: '#8d9499',
  cockpitGlass: '#8bb4c9',
  propBlack: '#222426',
  propTipYellow: '#f2c138',

  // US Navy Measure 12/21 (USS Hornet CV-8, USS Enterprise CV-6, USS Nashville CL-43)
  navyHull: '#394b5e',
  navyHullCamo: ['#2c3c4d', '#4c6075'],
  navySuper: '#5d6f82',
  navyDeckStain: '#353d47', // sàn gỗ sơn xanh xám chống trượt của Yorktown-class 1942
  deckStripeWhite: '#eef2f5',
  deckStripeYellow: '#e5b53b',
  antiFoulingRed: '#6e2824',

  // Nhật Bản (Nitto Maru, Tiêm kích IJA/IJN, Pháo phòng không Type 88, Tàu sân bay IJN)
  ijnGrey: '#5a6368',
  ijnDeckWood: '#9b7952',
  ijaGreen: '#3b4d3b',
  ijaGreyGreen: '#8e998b',
  hinomaruRed: '#c82823',
  flakGunGrey: '#4e544b',

  // Quân giới & Đạo cụ
  bombOlive: '#4f5836',
  bombYellowBand: '#eab938',
  thermiteHot: '#fff3c4',
  thermiteCore: '#ff7b1c',
  aluminumScrap: '#c4ccd2',
  gasCanSteel: '#5f6949',
} as const;

/** Bảng màu địa hình 3D theo vùng địa lý */
export const TERRAIN_PALETTE: Record<'florida' | 'japanCoast' | 'tokyoUrban' | 'chinaMountains', TerrainColors> = {
  florida: { low: '#678a47', high: '#89a65c', rock: '#9c927d', dry: '#cbb98f' },
  japanCoast: { low: '#4c753d', high: '#749652', rock: '#6d6962', dry: '#a69876' },
  tokyoUrban: { low: '#596153', high: '#73786b', rock: '#5f5c58', dry: '#878073' },
  chinaMountains: { low: '#2a3b2c', high: '#3f5241', rock: '#3b3f45', dry: '#4a473e' },
};

/** Màu đại dương 3D theo vùng & thời tiết */
export const OCEAN_PALETTE = {
  stormPacific: { deep: '#132a3d', mid: '#21455e', crest: '#4f768c', foam: '#d7e6ee' },
  japanShore: { deep: '#164569', mid: '#266894', crest: '#4c94bd', foam: '#e6f5fc' },
  eastChinaDusk: { deep: '#17273f', mid: '#31445e', crest: '#70656d', foam: '#d9c4b0' },
  chinaSurfNight: { deep: '#091321', mid: '#14263b', crest: '#2f4963', foam: '#9cb3c9' },
  midwayNoon: { deep: '#103e73', mid: '#1f64a6', crest: '#4792cf', foam: '#ebf7ff' },
} as const;

/** 7 cấu hình ánh sáng & bầu trời <Stage> xuyên suốt 4 chương */
export const STAGE_PRESETS: Record<
  'stormDawn' | 'floridaSun' | 'tokyoNoon' | 'tokyoFire' | 'chinaDusk' | 'monsoonNight' | 'midwayDay',
  LightingPreset
> = {
  // C01 (07:38 bão khơi) & C02 (08:20 cất cánh trong gió bão trên USS Hornet)
  stormDawn: {
    sky: ['#1d2e42', '#52697e', '#2a3c4d'],
    sun: [58, 24, -32],
    sunColor: '#dde7f2',
    sunIntensity: 2.2,
    fog: [95, 480],
    fogColor: '#4e6478',
    env: 0.42,
    ambient: 0.3,
    exposure: 1.04,
    post: { bloom: 0.55, bloomThreshold: 0.8, ao: 2.2, aoRadius: 2.5, vignette: 0.48 },
  },
  // C02 (sân bay bí mật Eglin, Florida — nắng sáng rõ để thấy chi tiết tháo giáp / lắp bàng quang xăng)
  floridaSun: {
    sky: ['#2b79bf', '#85c0e6', '#ded6c3'],
    sun: [42, 66, 28],
    sunColor: '#fff2d6',
    sunIntensity: 2.75,
    fog: [220, 900],
    env: 0.38,
    ambient: 0.22,
    exposure: 1.03,
    post: { bloom: 0.5, bloomThreshold: 0.84, ao: 2.1, aoRadius: 2.2, vignette: 0.38 },
  },
  // C03 (12:00 trưa nắng trong khi lướt sóng 50 ft vào bờ biển & ngoại ô Tokyo yên ắng)
  tokyoNoon: {
    sky: ['#2c75c2', '#89c0e8', '#d7e7f2'],
    sun: [24, 78, 34],
    sunColor: '#fff6e4',
    sunIntensity: 2.85,
    fog: [210, 880],
    env: 0.38,
    ambient: 0.22,
    exposure: 1.02,
    post: { bloom: 0.52, bloomThreshold: 0.83, ao: 2.2, aoRadius: 2.4, vignette: 0.4 },
  },
  // C03 (ném bom cháy 4.000°F, khói flak đen & không chiến trên Tokyo - Yokohama - Nagoya)
  tokyoFire: {
    sky: ['#2b3d54', '#7d7368', '#4a3a30'],
    sun: [34, 62, 26],
    sunColor: '#ffd9a8',
    sunIntensity: 2.55,
    fog: [115, 540],
    fogColor: '#756b61',
    env: 0.36,
    ambient: 0.24,
    exposure: 1.04,
    post: { bloom: 0.85, bloomThreshold: 0.72, ao: 2.3, aoRadius: 2.5, vignette: 0.5 },
  },
  // C04 (chiều muộn trên biển Hoa Đông — cạn xăng & đón luồng gió xuôi trước mặt trận bão)
  chinaDusk: {
    sky: ['#1b2c4d', '#6d5b6a', '#c97e55'],
    sun: [-64, 17, 24],
    sunColor: '#ffae70',
    sunIntensity: 2.05,
    fog: [130, 580],
    fogColor: '#695866',
    env: 0.34,
    ambient: 0.25,
    exposure: 1.04,
    post: { bloom: 0.62, bloomThreshold: 0.78, ao: 2.1, aoRadius: 2.5, vignette: 0.48 },
  },
  // C04 (đêm mưa mù trên dãy núi Trung Hoa & nhảy dù — tối nhưng đủ ánh trăng/chớp để rõ biên dạng)
  monsoonNight: {
    sky: ['#091221', '#1a2b45', '#0d1626'],
    sun: [32, 46, -34],
    sunColor: '#8eb4e3',
    sunIntensity: 1.35,
    fog: [55, 290],
    fogColor: '#16253b',
    env: 0.28,
    ambient: 0.28,
    exposure: 1.08,
    post: { bloom: 0.75, bloomThreshold: 0.7, ao: 2.0, aoRadius: 2.4, vignette: 0.55 },
  },
  // C04 (cao trào chiến lược kết phim — đại dương Midway rực lửa)
  midwayDay: {
    sky: ['#1d63b3', '#73b3e2', '#cae3f5'],
    sun: [46, 58, 28],
    sunColor: '#fff2da',
    sunIntensity: 2.85,
    fog: [180, 860],
    env: 0.4,
    ambient: 0.22,
    exposure: 1.03,
    post: { bloom: 0.78, bloomThreshold: 0.74, ao: 2.2, aoRadius: 2.5, vignette: 0.44 },
  },
};

/** Bảng màu 2D — Hải đồ tác chiến Thái Bình Dương & Bản vẽ kỹ thuật mặt cắt USAAF 1942 */
export const P2D = {
  // Nền hải đồ & bản vẽ kỹ thuật
  seaDeep: '#0d263d',
  seaMid: '#153a59',
  seaShallow: '#21547d',
  seaGrid: '#3b7aa6',
  blueprintBg: '#102436',
  blueprintPanel: '#17334c',
  blueprintGrid: '#3d82ab',

  // Đất liền & giấy bản đồ cổ điển
  land: '#d5c39e',
  landHigh: '#e4d5b5',
  landShadow: '#ab9770',
  contour: '#8c7853',
  paper: '#f6eedc',
  ink: '#171920',
  inkMuted: '#46505c',

  // Phe Mỹ (USAAF / USN) — Xanh lam sáng & Olive sáng
  usMain: '#38b6ff',
  usLight: '#8ad4ff',
  usDark: '#1c6ea3',
  oliveLight: '#7b8c52',
  oliveMid: '#5c6b3b',
  oliveDark: '#3d4726',

  // Phe Nhật (IJN / IJA) — Đỏ thẫm Imperial Crimson
  jpMain: '#e3423b',
  jpLight: '#ff7d75',
  jpDark: '#8f1f1b',

  // Điểm nhấn nhiên liệu / hoả lực / cảnh báo
  fuelAmber: '#ffae2b',
  fuelBright: '#ffe680',
  dangerRed: '#ff4545',
  safeTeal: '#28dec8',
} as const;
