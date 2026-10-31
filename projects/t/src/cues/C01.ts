// Mốc voice (giây tuyệt đối) của chương C01, lấy trực tiếp từ plan/chapters/C01.voice.md.
// Mọi khoá bắt đầu bằng c01_. Cảnh import { CUE } from '../cues'.
export const CUE = {
  // C01S01 (0.00–4.22): Mở màn xe tăng 60 tấn / 10 triệu USD
  c01_open: 0.0,
  c01_weight_60t: 1.72,
  c01_cost_10m: 3.12,

  // C01S02 (4.22–10.86): Giáp trước 800mm RHA chặn đứng đạn bắn thẳng
  c01_front_armor: 4.22,
  c01_rha_800: 5.84,
  c01_block_hold: 7.88,
  c01_apfsds_in: 8.3,
  c01_apfsds_hit: 9.24,

  // C01S03 (10.86–16.36): Phục kích đạn chống tăng vác vai từ sườn đồi
  c01_but_modern: 10.86,
  c01_knockout: 14.06,
  c01_atgm_launch: 15.06,

  // C01S04 (16.36–21.28): FPV drone giá vài trăm USD & câu hỏi nghịch lý
  c01_fpv_enter: 16.36,
  c01_fpv_dive: 16.98,
  c01_cost_500: 18.38,
  c01_paradox: 20.16,

  // C01S05 (21.28–28.26): Quy luật phân bổ trọng lượng — khối thép 800mm bọc kín 6 mặt
  c01_weight_law: 21.28,
  c01_engine_limit: 23.96,
  c01_box_clamp: 25.54,
  c01_box_800_all: 26.26,
  c01_box_sealed: 27.04,

  // C01S06 (28.26–36.18): Dồn giáp ra mặt trước, nóc tháp pháo & khoang động cơ mỏng vài chục mm
  c01_redistribute: 28.26,
  c01_shift_front: 30.64,
  c01_thin_roof: 32.6,
  c01_thin_deck: 33.46,
  c01_thin_mm: 34.74,

  // C01S07 (36.18–45.10): Bỏ qua khiên trước, tên lửa đột kích nóc vọt lên 150m bổ nhào thẳng đứng
  c01_exploit_weak: 36.18,
  c01_bypass_front: 38.62,
  c01_top_missile: 40.68,
  c01_climb_start: 41.56,
  c01_apex_150m: 42.38,
  c01_vertical_dive: 43.36,

  // C01S08 (45.10–51.54): Chạm nóc xe, đầu đạn nổ lõm kích hoạt, sóng nổ ép phễu đồng thành luồng kim loại
  c01_roof_approach: 45.1,
  c01_roof_contact: 46.02,
  c01_heat_trigger: 47.18,
  c01_cone_collapse: 48.42,
  c01_copper_jet: 50.3,

  // C01S09 (51.54–56.32): Vận tốc 8 km/s xuyên thủng thép mỏng, kích nổ hầm đạn bên dưới
  c01_jet_interior: 51.54,
  c01_speed_8kms: 52.1,
  c01_pierce_roof: 53.48,
  c01_ammo_cookoff: 54.7,

  // C01S10 (56.32–70.10): Hệ thống phòng vệ chủ động APS, radar 360° & đạn đánh chặn trên không
  c01_survive_aps: 56.32,
  c01_aps_mount: 60.34,
  c01_radar_sweep: 61.96,
  c01_radar_360: 62.58,
  c01_threat_lock: 63.68,
  c01_aps_fire: 66.3,
  c01_aps_intercept: 67.18,
  c01_end: 70.1,
} as const;
