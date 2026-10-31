// Cấu hình ánh sáng <Stage> và màu địa hình <Terrain> riêng cho từng bối cảnh / giờ trong ngày của vid6.
// Chỉ chứa cấu hình màu & ánh sáng (không chứa component chữ).
import type { StageProps, V3 } from '@skill/military/3d/stage';
import type { TerrainColors } from '@skill/military/3d/terrain';

export type LookPreset = {
  stage: Omit<StageProps, 'children'>;
  terrain: TerrainColors;
  scatterTint: string;
};

/** C01 & đầu C04: Nắng gắt sa mạc buổi chiều (15:30) — tương phản cao, bóng đổ sắc, chân trời cát bụi. */
export const LOOK_DESERT_GLARE: LookPreset = {
  stage: {
    sky: ['#2867a4', '#9bc3de', '#ead8bc'],
    sun: [55, 38, 28] as V3,
    sunColor: '#fff0d6',
    sunIntensity: 2.8,
    shadowArea: 42,
    fog: [150, 680],
    fogColor: '#decbb0',
    env: 0.38,
    ambient: 0.2,
    exposure: 1.02,
    post: { bloom: 0.55, bloomThreshold: 0.82, ao: 2.1, aoRadius: 2.4, vignette: 0.42 },
  },
  terrain: { low: '#bda072', high: '#d8bf93', rock: '#857058', dry: '#e7d4ae' },
  scatterTint: '#ccb88e',
};

/** C02: Trường bắn thử nghiệm đạn đạo giữa trưa (13:00) — trời xanh sâu, nắng đỉnh đầu cực nét cho vệt đạn Mach 5. */
export const LOOK_PROVING_NOON: LookPreset = {
  stage: {
    sky: ['#1d5794', '#7fb3d9', '#dfd0b6'],
    sun: [30, 68, 22] as V3,
    sunColor: '#fff5e4',
    sunIntensity: 2.95,
    shadowArea: 45,
    fog: [170, 740],
    fogColor: '#d8c5a8',
    env: 0.4,
    ambient: 0.22,
    exposure: 1.04,
    post: { bloom: 0.68, bloomThreshold: 0.78, ao: 2.0, aoRadius: 2.2, vignette: 0.38 },
  },
  terrain: { low: '#b38b60', high: '#cfa87c', rock: '#7a604b', dry: '#dfc196' },
  scatterTint: '#c7ae84',
};

/** C03: Hoàng hôn khói dầu Bão táp Sa mạc 1991 (16:45) — nắng hổ phách xiên thấp, sương khói chiến trường. */
export const LOOK_DESERT_STORM: LookPreset = {
  stage: {
    sky: ['#32476b', '#ba8354', '#e3b27b'],
    sun: [68, 22, -22] as V3,
    sunColor: '#ffd199',
    sunIntensity: 2.75,
    shadowArea: 48,
    fog: [115, 540],
    fogColor: '#cfa273',
    env: 0.34,
    ambient: 0.19,
    exposure: 1.0,
    post: { bloom: 0.72, bloomThreshold: 0.76, ao: 2.3, aoRadius: 2.6, vignette: 0.48 },
  },
  terrain: { low: '#a88c62', high: '#c7aa7e', rock: '#705d49', dry: '#d6ba8e' },
  scatterTint: '#bfa47c',
};

/** Khoang cơ khí / mặt cắt 3D bên trong tháp pháo & buồng động cơ: nền studio thép tối làm nổi chi tiết cơ khí & tia lửa. */
export const LOOK_INTERIOR_BAY: LookPreset = {
  stage: {
    sky: ['#162130', '#26384d', '#111923'],
    sun: [24, 42, 32] as V3,
    sunColor: '#fff2de',
    sunIntensity: 2.5,
    shadowArea: 14,
    fog: [60, 240],
    fogColor: '#1c2a3a',
    env: 0.48,
    ambient: 0.28,
    exposure: 1.06,
    post: { bloom: 0.65, bloomThreshold: 0.76, ao: 2.4, aoRadius: 1.6, vignette: 0.5 },
  },
  terrain: { low: '#2a333d', high: '#384452', rock: '#232a33', dry: '#313c47' },
  scatterTint: '#8b99a8',
};

/** C04 (đoạn cầu sập & FPV Drone ở Ukraine): Trời âm u xám lạnh thảo nguyên Đông Âu, đất đen ẩm & cỏ olive. */
export const LOOK_STEPPE_OVERCAST: LookPreset = {
  stage: {
    sky: ['#49596b', '#8b9aa6', '#b7c0c5'],
    sun: [28, 42, 18] as V3,
    sunColor: '#eef3f7',
    sunIntensity: 1.95,
    shadowArea: 40,
    fog: [100, 480],
    fogColor: '#9ba7b0',
    env: 0.36,
    ambient: 0.26,
    exposure: 0.98,
    post: { bloom: 0.58, bloomThreshold: 0.8, ao: 2.3, aoRadius: 2.5, vignette: 0.46 },
  },
  terrain: { low: '#4b583a', high: '#69764e', rock: '#595853', dry: '#7a7056' },
  scatterTint: '#95a389',
};

/** C04 (đoạn kết M1E3 & huyền thoại tiến hoá): Chạng vạng ánh cam-tím công nghệ cao, bóng đổ dài kịch tính. */
export const LOOK_DUSK_EVOLUTION: LookPreset = {
  stage: {
    sky: ['#1a2e54', '#a85d48', '#f0a668'],
    sun: [72, 16, 26] as V3,
    sunColor: '#ffbe78',
    sunIntensity: 2.85,
    shadowArea: 44,
    fog: [130, 580],
    fogColor: '#c47e5a',
    env: 0.4,
    ambient: 0.2,
    exposure: 1.04,
    post: { bloom: 0.75, bloomThreshold: 0.76, ao: 2.2, aoRadius: 2.4, vignette: 0.46 },
  },
  terrain: { low: '#8f7555', high: '#b5966f', rock: '#635142', dry: '#cca97e' },
  scatterTint: '#b89772',
};
