// Thiết kế mỹ thuật riêng cho dự án `gem` (Thảm kịch Tháp 22 / Tower 22, sa mạc đá sỏi Rukban, 05:30 sáng 28/01/2024).
// Thống nhất tuyệt đối bảng màu, chất liệu, ánh sáng 3D và ngôn ngữ hồ sơ giải mật / bàn điều khiển FAAD 2D.
import type { StageProps, V3 } from '@lib/3d/stage';
import type { TerrainColors } from '@lib/3d/terrain';

export const PAL2D = {
  // Nền hồ sơ giải mật & màn hình phòng không đêm rạng sáng
  bgNight: '#0c192b',
  bgSlate: '#142842',
  bgConsole: '#091422',
  panel: '#183150',
  panelHi: '#21426b',
  grid: '#2d5580',
  gridSoft: '#1e3c5c',

  // Giấy hồ sơ AR 15-6 & Viền mực kỹ thuật
  ink: '#0d1623',
  paper: '#f6eddd',
  paperDim: '#d8ccb8',
  chalk: '#e8f3fc',
  muted: '#8da8c4',

  // Sa mạc đá sỏi bazan Rukban (mặt cắt địa hình & bản đồ đồng mức)
  sandHi: '#d4b78c',
  sandMid: '#b59467',
  sandLo: '#7e6340',
  basalt: '#4b5563',
  basaltDark: '#2c3440',

  // Phe Mỹ / Phòng không / ScanEagle / LIDS / B-1B (Lam thép sáng 3 tông)
  usHi: '#93d8ff',
  usMid: '#3ea9f5',
  usLo: '#1c5d94',
  ewTeal: '#26e6d0',
  ewTealLo: '#127a73',

  // Mối đe dọa / Shahed / Sóng quá áp / Đóng dấu từ chối (Đỏ cam & Hổ phách 3 tông)
  threatHi: '#ff967d',
  threatMid: '#ff5238',
  threatLo: '#992212',
  amberHi: '#ffe98a',
  amberMid: '#ffb02e',
  amberLo: '#a3620a',

  // Kết cấu bê tông T-Wall, rọ HESCO & vỏ tôn container CHU
  concreteHi: '#dde6ef',
  concreteMid: '#aebdca',
  concreteLo: '#6e7f91',
  hescoHi: '#cbb68e',
  hescoLo: '#8c7753',
} as const;

export const PAL3D = {
  // Màu sơn khí tài đồng bộ 1:1 với 2D
  shahedBody: '#d9d4c7',
  shahedCamo: ['#c7c0b0', '#e5e1d6'] as string[],
  shahedTrim: '#3a3f47',
  shahedWarhead: '#596069',

  usUavBody: '#8fa6bc',
  usUavCamo: ['#768fa6', '#a8bed1'] as string[],
  usBlueAccent: '#3898df',
  craneYellow: '#c9973e',
  craneSteel: '#515e6b',

  chuWall: '#d6CFC2',
  chuRoof: '#aeb6bf',
  chuFrame: '#6a7480',
  concrete: '#9aa0a6',
  concreteCamo: ['#8a9096', '#abaeb2'] as string[],
  hescoSand: '#b89f76',
  hescoMesh: '#4b5249',

  lidsTan: '#c7b28e',
  lidsCamo: ['#b09973', '#d6c4a3'] as string[],
  kurfsPanel: '#425161',
  coyoteBody: '#cdd6df',
  coyoteAccent: '#d94b34',

  b1bGunship: '#46505c',
  b1bCamo: ['#3b444f', '#55616f'] as string[],
  b1bRadome: '#2a3038',

  sodiumLamp: '#ffb156',
  alarmRed: '#ff3b30',
} as const;

/** Giờ xanh trước bình minh (05:30 sáng tại Rukban) — rõ khối 3D, lạnh sắc nét, tôn đèn pha vàng & lửa nổ. */
export const STAGE_PREDAWN: Omit<StageProps, 'children'> = {
  sky: ['#0e1e36', '#2b4c70', '#526070'],
  sun: [-40, 28, 34] as V3,
  sunColor: '#c9e2ff',
  sunIntensity: 2.35,
  ambient: 0.45,
  env: 0.48,
  exposure: 1.14,
  fog: [115, 460],
  post: { bloom: 0.68, bloomThreshold: 0.78, ao: 2.0, aoRadius: 2.4, vignette: 0.48 },
};

/** Ban ngày nắng khô cao nguyên đá sỏi Rukban (S04, S18). */
export const STAGE_RUKBAN_DAY: Omit<StageProps, 'children'> = {
  sky: ['#2666a8', '#84b6dd', '#d9c9b2'],
  sun: [46, 54, 28] as V3,
  sunColor: '#fff1d9',
  sunIntensity: 2.7,
  ambient: 0.28,
  env: 0.42,
  exposure: 1.04,
  fog: [140, 560],
  post: { bloom: 0.52, bloomThreshold: 0.84, ao: 2.1, aoRadius: 2.5, vignette: 0.38 },
};

/** Hoàng hôn tầng bình lưu cho đòn trả đũa B-1B Lancer ngày 02/02/2024 (S19). */
export const STAGE_DUSK_STRIKE: Omit<StageProps, 'children'> = {
  sky: ['#0f1833', '#7a3d55', '#eb9f59'],
  sun: [-62, 15, -28] as V3,
  sunColor: '#ffb773',
  sunIntensity: 2.5,
  ambient: 0.35,
  env: 0.52,
  exposure: 1.12,
  fog: [180, 820],
  post: { bloom: 0.78, bloomThreshold: 0.72, ao: 1.8, aoRadius: 2.5, vignette: 0.45 },
};

/** Màu địa hình sa mạc đá sỏi bazan Rukban lúc rạng sáng lạnh. */
export const TERRAIN_PREDAWN: TerrainColors = {
  low: '#4d5766',
  high: '#6f7782',
  rock: '#39414d',
  dry: '#7d786d',
};

/** Màu địa hình sa mạc đá sỏi bazan Rukban ban ngày nắng khô. */
export const TERRAIN_RUKBAN_DAY: TerrainColors = {
  low: '#8e7a5e',
  high: '#bfa785',
  rock: '#5c5349',
  dry: '#d4c0a0',
};
