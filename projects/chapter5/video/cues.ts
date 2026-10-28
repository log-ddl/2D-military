// Mốc voice (giây) từ plan/voice_map.md. Một nguồn duy nhất cho cảnh và âm thanh.
// sNN_end = mốc cắt cuối cảnh NN. Đợt thử: sự kiện chi tiết cho S01, S03, S09, S13.
export const CUE = {
  start: 0,

  // S01 Hook (3D) 0 → 26.20
  s01_crew: 0.0,         // "The crew that fires a modern howitzer"
  s01_neverSees: 1.82,   // "almost never sees what it hits"
  s01_fire: 3.7,         // "A shell leaves the barrel" — phát bắn
  s01_800: 5.86,         // "800 meters a second"
  s01_climb: 7.58,       // "climbs several kilometers into the air"
  s01_minute: 9.58,      // "takes the better part of a minute"
  s01_cannotSee: 11.08,  // "a target the gunners cannot see"
  s01_lands: 16.14,      // "By the time it lands" — nổ
  s01_drive: 17.5,       // "packed up and driven away"
  s01_strange: 20.46,
  s01_samePic: 22.24,    // "never in the same picture"
  s01_end: 26.2,

  s02_end: 50.9,

  // S03 Nòng dài vs tầm (2D) 50.90 → 87.96
  s03_weightRange: 50.9, // "weight against range"
  s03_gas: 54.2,         // "A longer barrel keeps the expanding gas"
  s03_faster: 56.56,     // "pushing the shell for longer, so it leaves faster"
  s03_heavier: 60.36,    // "A heavier shell carries more explosive"
  s03_bigger: 63.14,     // "Both make a gun bigger"
  s03_hide: 66.76,       // "harder to hide, slower to set up"
  s03_155: 69.7,         // "155-millimeter"
  s03_range20: 75.64,
  s03_range30: 76.2,
  s03_ext: 76.7,         // "longer barrel, rocket-assisted shell, gas generator in its base"
  s03_40: 83.92,
  s03_costs: 84.58,      // "costs weight, money, and barrel life"
  s03_end: 87.96,

  s04_end: 116.46,
  s05_end: 143.1,
  s06_end: 165.48,
  s07_end: 190.48,
  s08_end: 210.62,

  // S09 Radar phản pháo & shoot-and-scoot (3D) 210.62 → 232.70
  s09_enemy: 210.62,     // "what the enemy has"
  s09_radar: 213.24,     // "Radars that can see a shell in flight"
  s09_trace: 215.24,     // "trace its arc back, compute where the gun is"
  s09_counter: 217.9,    // "counter-battery fire can be on its way"
  s09_scoot: 221.02,     // "shoot and scoot"
  s09_move: 225.18,      // "moves into a firing position"
  s09_fires: 227.3,      // "fires a few rounds"
  s09_leaves: 228.6,     // "leaves before the answer arrives"
  s09_impact: 230.24,    // phản pháo rơi xuống chỗ trống
  s09_end: 232.7,

  s10_end: 253.76,
  s11_end: 281.76,
  s12_end: 308.14,

  // S13 Độ tản vs đạn dẫn đường (2D) 308.14 → 340.56
  s13_volume: 308.14,    // "Accuracy used to come from volume"
  s13_belt: 310.1,       // "fired a whole belt of shells"
  s13_20th: 314.8,       // "20th century wars"
  s13_guided: 317.74,    // "Guided shells change that"
  s13_gps: 320.12,       // "GPS receiver in its nose and small fins"
  s13_meters: 323.26,    // "within a few meters"
  s13_single: 325.84,    // "a single round can do the job" — nổ trúng tâm
  s13_price: 329.2,      // "The price is high"
  s13_jammer: 333.5,     // "a jammer can blind it"
  s13_both: 334.98,      // "armies mostly keep both"
  s13_end: 340.56,

  s14_end: 372.66,
  s15_end: 403.22,
  s16_end: 429.72,
  s17_end: 453.64,
  end: 471.8,
} as const;
