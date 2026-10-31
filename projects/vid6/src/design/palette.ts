// Thiết kế mỹ thuật riêng của vid6 ("Scorched Alloy & Thermal Amber"):
// Bảng màu 2D bản vẽ kỹ thuật / bản đồ chiến thuật và màu vật liệu phương tiện 3D.
// Chỉ chứa màu sắc (chữ bắt buộc dùng <Label> từ @skill/military/label).

export const PAL = {
  // Nền bản vẽ kỹ thuật & bản đồ chiến thuật 2D (Tactical Slate & Desert Ochre)
  bg: '#0e1722',
  bgDeep: '#080e16',
  panel: '#152334',
  panelHi: '#1e324a',
  grid: '#27425e',
  gridBright: '#3b648c',

  // Nền bản đồ sa mạc Bão táp Sa mạc 1991
  mapSand: '#cbb389',
  mapSandDark: '#a3895f',
  mapSandLight: '#e3cfa9',
  mapContour: '#6e5838',

  // Viền mực & bề mặt giấy nhãn
  ink: '#12161f',
  cream: '#f6edd9',
  white: '#eef5fc',
  muted: '#859bb2',

  // Phối màu 3 tông M1A2 Abrams (CARC Desert Tan & Titanium Steel)
  hullLight: '#e4cea6',
  hullMid: '#c4ab7d',
  hullDark: '#8c744c',
  steelLight: '#d0dbe6',
  steelMid: '#8d9eae',
  steelDark: '#4d5d6e',

  // Phối màu NATO Woodland (cho cảnh Đông Âu / Ukraine / Chiến tranh Lạnh)
  woodLight: '#6b7e54',
  woodMid: '#4c5c3b',
  woodDark: '#2f3925',
  woodBrown: '#594535',

  // Phối màu phe đối phương (T-72 Iraqi Sand-Olive & FPV Threat)
  enemyLight: '#9ea07d',
  enemyMid: '#767859',
  enemyDark: '#4a4c36',

  // Điểm nhấn Quang học Nhiệt / Laser / Uranium / Hoả lực
  amber: '#ffaa2b',
  amberHot: '#ffe787',
  cyan: '#29e3d4',
  cyanSoft: '#7cf2e8',
  crimson: '#ff4242',
  crimsonDeep: '#9e1c20',
  duPurple: '#9d7bff',
  propellant: '#ebd8b5',
} as const;

/** Bảng tham số màu sơn 3D chuẩn cho paint() để đồng bộ sắc độ xuyên suốt 4 chương. */
export const PAINT_PRESETS = {
  abramsDesert: {
    color: '#c9b186',
    camo: ['#bfa375', '#d6c098'],
    camoScale: 1.3,
    wear: 0.24,
    dirt: 0.34,
    roughness: 0.66,
    metalness: 0.28,
    repeat: 0.42,
  },
  abramsWoodland: {
    color: '#4c5b3c',
    camo: ['#5c4738', '#2a2e28'],
    camoScale: 1.15,
    wear: 0.28,
    dirt: 0.42,
    roughness: 0.68,
    metalness: 0.26,
    repeat: 0.42,
  },
  t72Iraqi: {
    color: '#8f8968',
    camo: ['#706c50', '#a99e78'],
    camoScale: 1.2,
    wear: 0.35,
    dirt: 0.45,
    roughness: 0.7,
    metalness: 0.3,
    repeat: 0.42,
  },
  m1e3Prototype: {
    color: '#6b7565',
    camo: ['#555e50', '#838d7b'],
    camoScale: 1.4,
    wear: 0.14,
    dirt: 0.18,
    roughness: 0.54,
    metalness: 0.38,
    repeat: 0.42,
  },
} as const;
