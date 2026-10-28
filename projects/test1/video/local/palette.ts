// Thiết kế mỹ thuật riêng cho dự án test1 (MQ-9 Reaper — High-Desert Golden Dawn)
import type { StageProps } from '@lib/3d/stage';
import type { TerrainColors } from '@lib/3d/terrain';

/** Bảng màu 2D chiến thuật: Tầng bình lưu chàm lạnh - Bình minh hổ phách - Sa mạc đá đỏ */
export const P = {
  // Bầu trời & Nền bảng kỹ thuật
  stratTop: '#0b1829',
  stratMid: '#183252',
  stratLow: '#31597d',
  dawnHorizon: '#d99a64',
  dawnGlow: '#f6cb92',

  boardBg: '#0f1d2e',
  boardPanel: '#162940',
  boardCard: '#1c3450',
  gridMajor: '#355c82',
  gridMinor: '#213c59',

  // Địa hình sa mạc cao nguyên 2D (nhiều lớp chiều sâu)
  sandLight: '#dfc096',
  sandMid: '#c49868',
  mesaOchre: '#9c6c44',
  canyonDark: '#68432a',
  canyonDeep: '#3d2517',

  // Thân vỏ UAV & Khí tài (đổ khối 3 tông + nét mực)
  ink: '#131821',
  uavHighlight: '#e3e8ef',
  uavLight: '#c5ced9',
  uavMid: '#94a0b0',
  uavDark: '#5e6a7a',
  uavShadow: '#3c4552',
  opticGlass: '#163b39',

  oliveLight: '#7b8662',
  oliveMid: '#5a6346',
  oliveDark: '#3c432e',
  missileBody: '#2d333d',
  missileLight: '#4b5463',

  // Điểm nhấn cảm biến, đường truyền & hỏa lực
  laser: '#28f0b4',
  laserSoft: '#169c76',
  flirHot: '#ff6b35',
  flirWarm: '#ffaa44',
  gold: '#ffb638',
  danger: '#ff3b4e',
  paper: '#f7f1e3',
  mutedText: '#9db5cc',
} as const;

/** Preset ánh sáng 3D: Tuần tra tầng bình lưu bình minh sớm (10-15 km) */
export const STAGE_HIGH_DAWN: Omit<StageProps, 'children'> = {
  sky: ['#152e50', '#7096b3', '#e8b780'],
  sun: [58, 22, 28],
  sunColor: '#ffd9a6',
  sunIntensity: 3.05,
  ambient: 0.25,
  env: 0.44,
  exposure: 1.06,
  fog: [190, 860],
  fogColor: '#cca987',
  post: { bloom: 0.55, bloomThreshold: 0.82, ao: 2.0, aoRadius: 2.4, vignette: 0.42 },
};

/** Preset ánh sáng 3D: Tác chiến hẻm núi sa mạc nắng xiên buổi sớm */
export const STAGE_CANYON_STRIKE: Omit<StageProps, 'children'> = {
  sky: ['#244c74', '#8eb0c6', '#eccb9c'],
  sun: [48, 28, -26],
  sunColor: '#ffe3ba',
  sunIntensity: 2.95,
  ambient: 0.26,
  env: 0.4,
  exposure: 1.05,
  fog: [130, 640],
  fogColor: '#d4ba98',
  post: { bloom: 0.6, bloomThreshold: 0.8, ao: 2.2, aoRadius: 2.5, vignette: 0.44 },
};

/** Bảng màu lưới địa hình 3D cao nguyên sa mạc đá đỏ */
export const DESERT_TERRAIN: TerrainColors = {
  low: '#8e6d4e',
  high: '#caa476',
  rock: '#634735',
  dry: '#e2c499',
};
