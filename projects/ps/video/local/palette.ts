// Thiết kế mỹ thuật riêng cho dự án PS: "Bình Minh Lạnh Trên Lưới Phòng Không" (Cold Steel Dawn & Tactical Slate Blueprint)
import type { StageProps } from '@lib/3d/stage';
import type { TerrainColors } from '@lib/3d/terrain';

/** Bảng màu 2D thống nhất: mặt cắt khí quyển bình minh lạnh + bàn vẽ kỹ thuật xanh đá + sa bàn đồng mức. */
export const PAL2D = {
  // Nền & lưới kỹ thuật
  bgNight: '#091626',
  bgDeep: '#0d2137',
  bgMid: '#163554',
  bgSky: '#2c5b87',
  bgHorizon: '#6fa0c7',
  grid: '#3d7da8',
  gridFine: '#21496b',

  // Nhãn & nét mực
  paper: '#f6efe2',
  ink: '#161c26',
  stroke: '#101722',
  muted: '#8da9c4',

  // Phương tiện Mỹ (Patriot, Radar, X-51): xanh ô-liu xám lạnh & trắng xám chiến thuật (3 tông sáng/trung/tối)
  usLight: '#7b8c66',
  usMid: '#5b6949',
  usDark: '#3d4731',
  pacLight: '#e5edf5',
  pacMid: '#c6d2de',
  pacDark: '#8a99a8',
  radome: '#eadcc3',

  // Phương tiện đối phương (MiG-31K, Kinzhal, Oreshnik, Shahed, Kh-101, S-400): xám than & xanh rêu chiến lược (3 tông)
  ruGreyLight: '#8e9ba8',
  ruGreyMid: '#687582',
  ruGreyDark: '#434d57',
  ruOliveLight: '#657558',
  ruOliveMid: '#48563e',
  ruOliveDark: '#2e3827',
  shahedLight: '#cfd5dc',
  shahedMid: '#a7b0ba',
  shahedDark: '#747d87',

  // Địa hình nhiều lớp 2D
  ridgeFar: '#274663',
  ridgeMid: '#1c354d',
  ridgeNear: '#132638',
  ground: '#263829',
  groundLine: '#4c6648',

  // Nhấn tín hiệu / năng lượng / cảnh báo
  cyan: '#2ce6d0',
  cyanSoft: '#5bc8f5',
  amber: '#ffaa2b',
  amberHot: '#ffe999',
  red: '#ff4d4d',
  redDeep: '#a6262e',
  green: '#4be07b',
} as const;

/** Bảng màu vật liệu 3D đồng bộ 1:1 với 2D. */
export const PAL3D = {
  // Hệ thống Mỹ (M903 Launcher, AN/MPQ-65 Radar)
  usBase: '#5b6949',
  usCamo1: '#424e35',
  usCamo2: '#7a775b',
  radarFace: '#899b94',
  radarFrame: '#4a5640',
  radarElem: '#38d6ff',

  // Đạn đánh chặn PAC-2 / PAC-3
  pacBody: '#cfd8e2',
  pacBand: '#465362',
  pacRadome: '#e6d8be',
  acmRing: '#28303a',

  // Hệ thống Nga (MiG-31K, Kinzhal, Oreshnik, Shahed-136, Kh-101, S-400)
  migBase: '#6d7a88',
  migCamo: '#535f6c',
  migBelly: '#8d9aa6',
  migRadome: '#353d47',
  kinzhalBody: '#4d5560',
  kinzhalBand: '#6c7682',
  kinzhalNose: '#cfd6de',
  oreshnikBase: '#3d4939',
  oreshnikCamo1: '#2c3529',
  oreshnikCamo2: '#58614e',
  rvCarbon: '#262b33',
  shahedBody: '#b8bec6',
  shahedWing: '#9ba3ad',
  kh101Body: '#7c8691',
  kh101Belly: '#59626c',
  s400Base: '#4a5d3f',
  s400Camo1: '#35442d',
  s400Camo2: '#7c7456',
  s400Tube: '#566849',

  // Chi tiết cơ khí & hiệu ứng
  tire: '#242628',
  steel: '#aeb8c2',
  darkSteel: '#343b44',
  glass: '#1f364d',
  brass: '#c9a259',
  flame: '#ff9d2e',
  flameCore: '#fff3c4',
  plasma: '#ff6b1a',
  cyanBeam: '#38e2ff',
} as const;

/** Địa hình thảo nguyên bình minh Đông Âu (sương sớm mát, cỏ ô-liu dịu, đá xám lạnh). */
export const TERRAIN_STEPPE: TerrainColors = {
  low: '#496340',
  high: '#7a8e5c',
  rock: '#646970',
  dry: '#9c8e6b',
};

type StagePreset = Omit<StageProps, 'children'>;

/** Sân khấu 3D mặt đất & phòng không tầm thấp: bình minh vàng lạnh ~06:45, bóng đổ dài sắc nét. */
export const STAGE_DAWN: StagePreset = {
  sky: ['#1d3e66', '#6fa0c7', '#d8e4ec'],
  sun: [55, 25, 32],
  sunColor: '#ffd9a8',
  sunIntensity: 2.85,
  shadowArea: 42,
  fog: [165, 760],
  env: 0.4,
  ambient: 0.22,
  exposure: 1.08,
  post: { bloom: 0.65, bloomThreshold: 0.8, ao: 2.0, aoRadius: 2.4, vignette: 0.42 },
};

/** Sân khấu 3D tầng bình lưu (~18–25 km): đỉnh trời xanh cô-ban thẫm, nắng gắt sắc cạnh cho tiêm kích & đạn đánh chặn. */
export const STAGE_STRATO: StagePreset = {
  sky: ['#091830', '#2e5f96', '#b8d4ea'],
  sun: [60, 36, 22],
  sunColor: '#fff1db',
  sunIntensity: 3.05,
  shadowArea: 28,
  fog: [260, 1100],
  env: 0.45,
  ambient: 0.24,
  exposure: 1.1,
  post: { bloom: 0.72, bloomThreshold: 0.78, ao: 1.8, aoRadius: 2.2, vignette: 0.44 },
};

/** Sân khấu 3D cận vũ trụ / tầng cao khí quyển (>80 km): bầu trời chàm đen với viền chân trời sáng xanh. */
export const STAGE_EXO: StagePreset = {
  sky: ['#050b18', '#173a69', '#6ea4d1'],
  sun: [50, 30, 26],
  sunColor: '#fff6e8',
  sunIntensity: 3.2,
  shadowArea: 26,
  fog: null,
  env: 0.48,
  ambient: 0.26,
  exposure: 1.12,
  post: { bloom: 0.8, bloomThreshold: 0.75, ao: 1.6, aoRadius: 2.0, vignette: 0.48 },
};
