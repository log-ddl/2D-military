// Thiết kế mỹ thuật riêng của vid5: "Aerospace Titanium & Strike Amber"
// Dùng chung cho toàn bộ cảnh 2D, cảnh 3D và mô hình trong video/local/.
import type { StageProps } from '@lib/3d/stage';
import type { TerrainColors } from '@lib/3d/terrain';

export const P = {
  // Viền & nền kỹ thuật hàng không 2D
  ink: '#101824',
  paper: '#f5efe4',
  bgDeep: '#091322',
  bgMid: '#0f213a',
  bgPanel: '#162e4f',
  bgCard: '#1b3860',
  grid: '#2a5282',
  gridBright: '#4782bd',
  text: '#eaf3fc',
  muted: '#8fb1d4',

  // Bầu trời & mặt đất/biển 2D
  skyTop: '#0b1d3a',
  skyMid: '#1e4f88',
  skyHor: '#7db5de',
  seaDeep: '#10375c',
  seaMid: '#1d5d8f',
  seaLight: '#4ea2cf',
  desert: '#cfa97e',
  desertDark: '#9e7850',

  // F-15EX Eagle II — Gunship / Anodized Titanium Slate (3 tông + điểm nhấn)
  f15Light: '#bdd6ec',
  f15Mid: '#7699ba',
  f15Dark: '#3d5a78',
  f15Belly: '#8eaec9',
  f15Radome: '#526e8a',
  f15Canopy: '#7fd4f5',

  // F-15C/D Legacy — Light Compass Ghost Gray
  legLight: '#d8e6f2',
  legMid: '#9cb2c7',
  legDark: '#5e758c',

  // F-35A Lightning II — Have Glass V RAM Stealth Charcoal + Golden Canopy
  f35Light: '#68778a',
  f35Mid: '#434e5e',
  f35Dark: '#262d38',
  f35Tape: '#8394ab',
  f35Canopy: '#dea845',

  // F-22 & CCA Loyal Wingman
  f22Light: '#8fa3b8',
  f22Mid: '#5b6f85',
  f22Dark: '#334252',

  // Vũ khí & Khí tài đối phương
  ordWhite: '#e4ecf5',
  ordMid: '#9fb2c7',
  ordDark: '#4c5d70',
  samGreen: '#516146',
  samDark: '#323c2c',

  // Tín hiệu / Năng lượng / Cảnh báo
  cyan: '#2ce6ff',
  cyanSoft: '#7befff',
  amber: '#ffae2b',
  amberHot: '#ffe98a',
  flame: '#ff6b1f',
  red: '#ff3b4e',
  redDark: '#9e1c2b',
  green: '#35e09c',
} as const;

type StagePreset = Omit<StageProps, 'children'>;

/** S01: Đường băng USAF bình minh ướt — trời thép lạnh, nắng sớm hổ phách thấp, bóng đổ dài sắc. */
export const STAGE_DAWN_TARMAC: StagePreset = {
  sky: ['#183459', '#5d84ab', '#d9a77e'],
  sun: [58, 17, 32],
  sunColor: '#ffd4a3',
  sunIntensity: 2.75,
  shadowArea: 38,
  fog: [160, 760],
  env: 0.42,
  ambient: 0.22,
  exposure: 1.04,
  post: { bloom: 0.65, bloomThreshold: 0.8, ao: 2.2, vignette: 0.44 },
};

/** S05, S15: Không chiến & cất cánh Viking ban ngày nắng sắc nét ở độ cao trung bình. */
export const STAGE_HIGH_ALT: StagePreset = {
  sky: ['#1d5aa3', '#6eb2e6', '#d8ecf7'],
  sun: [44, 58, 28],
  sunColor: '#fff4e2',
  sunIntensity: 2.8,
  shadowArea: 48,
  fog: [220, 980],
  env: 0.45,
  ambient: 0.2,
  exposure: 1.02,
  post: { bloom: 0.68, bloomThreshold: 0.8, ao: 2.0, vignette: 0.4 },
};

/** S09: Hoang mạc Negev Israel 1983 — nắng trưa gắt, chân trời cát ấm. */
export const STAGE_DESERT_NOON: StagePreset = {
  sky: ['#2a6db5', '#88bce0', '#e6cfa8'],
  sun: [35, 68, 24],
  sunColor: '#fff1d6',
  sunIntensity: 2.9,
  shadowArea: 55,
  fog: [200, 900],
  env: 0.42,
  ambient: 0.24,
  exposure: 1.03,
  post: { bloom: 0.65, bloomThreshold: 0.82, ao: 2.1, vignette: 0.38 },
};

/** S12: Vịnh Mexico (Eglin AFB) — trời biển nắng trong, sương biển xanh ngọc. */
export const STAGE_GULF_NOON: StagePreset = {
  sky: ['#1b63ad', '#6dc0e8', '#bfe9f2'],
  sun: [48, 62, 30],
  sunColor: '#fff6e6',
  sunIntensity: 2.85,
  shadowArea: 42,
  fog: [240, 1050],
  env: 0.48,
  ambient: 0.23,
  exposure: 1.02,
  post: { bloom: 0.72, bloomThreshold: 0.78, ao: 1.9, vignette: 0.38 },
};

/** S17: Tầng bình lưu 50.000 ft — đỉnh trời chàm cận không gian, nắng gắt tương phản cực đại. */
export const STAGE_STRATOSPHERE: StagePreset = {
  sky: ['#06132b', '#235696', '#9dc6e8'],
  sun: [40, 64, 18],
  sunColor: '#fff8ee',
  sunIntensity: 3.1,
  shadowArea: 45,
  fog: [320, 1300],
  env: 0.46,
  ambient: 0.16,
  exposure: 1.05,
  post: { bloom: 0.82, bloomThreshold: 0.76, ao: 1.8, vignette: 0.46 },
};

/** S20, S23, S26: Chiến trường chạng vạng Thái Bình Dương / thung lũng phục kích SAM. */
export const STAGE_CONTESTED_DUSK: StagePreset = {
  sky: ['#152547', '#6e4e6b', '#ea925e'],
  sun: [64, 18, -28],
  sunColor: '#ffb980',
  sunIntensity: 2.6,
  shadowArea: 65,
  fog: [180, 860],
  env: 0.38,
  ambient: 0.2,
  exposure: 1.04,
  post: { bloom: 0.88, bloomThreshold: 0.72, ao: 2.2, vignette: 0.48 },
};

/** S28: Bình minh bão lửa cao trào kết — nắng vàng cam rực rỡ tôn buồng đốt Mach 2.5 và vụ nổ. */
export const STAGE_FINALE_SUNRISE: StagePreset = {
  sky: ['#162e59', '#8c5a66', '#ffb469'],
  sun: [60, 22, 26],
  sunColor: '#ffd194',
  sunIntensity: 2.95,
  shadowArea: 70,
  fog: [200, 950],
  env: 0.46,
  ambient: 0.22,
  exposure: 1.06,
  post: { bloom: 0.9, bloomThreshold: 0.72, ao: 2.1, vignette: 0.45 },
};

export const TERRAIN_OZARK: TerrainColors = {
  low: '#4d6b3c',
  high: '#8f9c56',
  rock: '#6e665c',
  dry: '#b88f58',
};

export const TERRAIN_NEGEV: TerrainColors = {
  low: '#bfa074',
  high: '#d9be94',
  rock: '#8c7760',
  dry: '#e6cfa8',
};

export const TERRAIN_PACIFIC_ISLAND: TerrainColors = {
  low: '#3f6e44',
  high: '#6d9954',
  rock: '#69665f',
  dry: '#cbb88e',
};
