// Mốc sự kiện tuyệt đối theo giây voice (bám sát plan/transcript.json).
export const CUE = {
  // S01 (0.00 - 4.05): Xe tăng chủ lực 60 tấn, 10 triệu USD
  s01_start: 0.0,
  s01_weight_60t: 1.72,
  s01_cost_10m: 3.12,

  // S02 (4.05 - 10.60): Giáp trước tương đương 800mm RHA chặn đạn bắn thẳng
  s02_front_armor: 4.22,
  s02_800mm: 5.84,
  s02_shot_fire: 7.45,
  s02_shot_block: 7.88,

  // S03 (10.60 - 21.00): Nghịch lý đạn chống tăng vác vai & FPV drone vài trăm USD
  s03_battlefield: 10.86,
  s03_defeat: 14.06,
  s03_atgm_threat: 15.06,
  s03_drone_enter: 16.98,
  s03_cost_hundreds: 18.38,
  s03_paradox: 19.38,

  // S04 (21.00 - 35.95): Quy luật phân bổ trọng lượng & tử huyệt giáp mỏng nóc/đuôi
  s04_weight_law: 22.22,
  s04_engine_strain: 23.96,
  s04_all_800mm: 26.26,
  s04_shift_front: 30.64,
  s04_thin_roof: 32.60,
  s04_thin_engine: 33.46,
  s04_few_tens_mm: 34.74,

  // S05 (35.95 - 45.20): Tên lửa đột kích nóc vọt cao 150m rồi bổ nhào thẳng đứng
  s05_weak_spot: 37.54,
  s05_skip_front: 39.04,
  s05_missile_launch: 40.68,
  s05_apex_150m: 42.38,
  s05_vertical_dive: 43.36,

  // S06 (45.20 - 56.14): Đầu đạn nổ lõm ép phễu đồng thành luồng 8 km/s kích nổ hầm đạn
  s06_roof_contact: 45.86,
  s06_shaped_detonate: 47.18,
  s06_copper_collapse: 48.76,
  s06_jet_form: 50.30,
  s06_speed_8kms: 52.10,
  s06_pierce_roof: 53.48,
  s06_ammo_cookoff: 54.86,

  // S07 (56.14 - 70.10): Phòng vệ chủ động APS, radar 360 độ & đánh chặn nổ tung trên không
  s07_survive: 56.32,
  s07_aps_equip: 60.34,
  s07_radar_360: 62.22,
  s07_radar_360_num: 62.58,
  s07_threat_detect: 63.68,
  s07_intercept_fire: 66.30,
  s07_midair_blast: 67.18,
} as const;
