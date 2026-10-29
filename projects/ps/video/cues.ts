// Mốc sự kiện voice (giây tuyệt đối) trích trực tiếp từ plan/voice_map.md.
// Nguồn chuẩn duy nhất cho toàn bộ 24 cảnh (S01..S24) và audio/sound.json + audio/music.json.
export const CUE = {
  start: 0.0,
  end: 449.03,

  // S01 (0.00 – 16.50, 3D): Mở đầu câu hỏi Patriot vs siêu vượt âm & PAC-2 nổ mảnh tiếp cận hụt mục tiêu
  s01_start: 0.0,
  s01_patriot: 0.48,
  s01_pac2_fire: 4.82,
  s01_pac2_label: 6.06,
  s01_prox_fuze: 7.66,
  s01_prox_blast: 11.35,
  s01_survive: 13.4,

  // S02 (16.50 – 29.00, 2D): Mỹ phát triển PAC-3 — chuyển từ nổ gần sang va chạm tiêu diệt trực diện thân-đối-thân
  s02_start: 16.5,
  s02_pac3_label: 18.96,
  s02_hit_to_kill: 19.94,
  s02_body_impact: 24.85,

  // S03 (29.00 – 42.05, 3D): Động cơ đẩy ngang ACM ở mũi PAC-3 hiệu chỉnh quỹ đạo tích tắc trước va chạm
  s03_start: 29.0,
  s03_precision: 29.2,
  s03_acm_1: 34.36,
  s03_acm_2: 36.8,
  s03_acm_3: 38.9,
  s03_hit: 41.25,

  // S04 (42.05 – 59.20, 2D): Bệ phóng chỉ có 16 đạn PAC-3 vs hàng chục tên lửa hành trình & bầy UAV Shahed-136
  s04_start: 42.05,
  s04_launcher_16: 46.34,
  s04_russia_salvo: 48.14,
  s04_cruise_wave: 51.94,
  s04_shahed_swarm: 55.34,

  // S05 (59.20 – 77.25, 3D): Thách thức Oreshnik đa đầu đạn (3 quả dội xuống) tiếp nối loạt Kinzhal
  s05_start: 59.2,
  s05_oreshnik_in: 63.36,
  s05_warheads_26: 66.52,
  s05_three_salvo: 68.4,
  s05_rain_impact: 70.8,
  s05_kinzhal_wave: 74.2,

  // S06 (77.25 – 95.85, 3D): Khẩu đội Patriot trong không gian 3D & ưu thế tuyệt đối khi đối đầu trực diện 1-1
  s06_start: 77.25,
  s06_grid_reveal: 79.88,
  s06_question: 82.5,
  s06_tech_strong: 86.72,
  s06_duel_fire: 90.2,
  s06_duel_kill: 93.1,

  // S07 (95.85 – 109.25, 2D): Mặt cắt chiến lược bão hòa đa tầng (UAV sát đất → hành trình thấp hơn → siêu vượt âm)
  s07_start: 95.85,
  s07_tier1_uav: 97.92,
  s07_tier2_cruise: 102.62,
  s07_tier3_hyper: 106.36,

  // S08 (109.25 – 127.30, 2D): Thực chất siêu vượt âm — Boeing X-51 Waverider & động cơ Scramjet cơ động trong khí quyển
  s08_start: 109.25,
  s08_kinzhal_myth: 109.96,
  s08_x51_reveal: 117.66,
  s08_scramjet: 119.42,
  s08_maneuver: 121.28,
  s08_not_kinzhal: 125.78,

  // S09 (127.30 – 142.80, 3D): Bản chất Iskander gắn dưới bụng tiêm kích MiG-31K, thả ở tầng cao tăng tốc Mach 10
  s09_start: 127.3,
  s09_iskander: 132.26,
  s09_mig31: 133.96,
  s09_drop: 135.45,
  s09_ignite: 136.35,
  s09_mach10: 141.8,

  // S10 (142.80 – 156.70, 2D): Điểm yếu nhiên liệu rắn — không chỉnh được lực đẩy, cháy hết bay quán tính, đâm vào khí quyển dày
  s10_start: 142.8,
  s10_solid_fuel: 143.3,
  s10_burnout: 148.28,
  s10_dive_dense: 151.2,
  s10_hit_atmo: 154.56,

  // S11 (156.70 – 173.30, 3D): Ma sát khí quyển ghìm chậm Kinzhal thành "phi tiêu 1 tấn" trước tầm bắn Patriot
  s11_start: 156.7,
  s11_drag_heat: 156.88,
  s11_slow_down: 160.4,
  s11_patriot_zone: 163.7,
  s11_one_ton_dart: 170.7,

  // S12 (173.30 – 200.80, 2D): Giải phẫu mặt cắt tên lửa Patriot (Mũi thạch anh → Đầu dò → Dẫn đường → Đầu đạn 90kg → IMU)
  s12_start: 173.3,
  s12_open_cutaway: 174.5,
  s12_radome: 176.9,
  s12_seeker: 180.16,
  s12_guidance_end: 182.9,
  s12_gps: 185.98,
  s12_mid_guidance: 188.6,
  s12_warhead_90kg: 192.0,
  s12_imu_gyro: 196.5,

  // S13 (200.80 – 225.70, 2D): Giải phẫu phần đuôi (Kích nổ → 40% thuốc phóng → Bơm/chấp hành → Cánh lái) & So sánh người thật
  s13_start: 200.8,
  s13_igniter: 200.92,
  s13_propellant_40: 203.9,
  s13_actuators: 207.68,
  s13_tail_fins: 211.36,
  s13_specs_stand: 214.8,
  s13_spec_317kg: 216.12,
  s13_spec_5m1: 217.92,
  s13_spec_254mm: 219.44,
  s13_human_scale: 221.02,

  // S14 (225.70 – 252.00, 3D): Oreshnik phóng thẳng đứng ra ngoài khí quyển, mở chóp tách 6 đầu đạn MIRV & đạn con Mach 10
  s14_start: 225.7,
  s14_oreshnik_intro: 227.44,
  s14_vertical_launch: 233.4,
  s14_shroud_open: 236.2,
  s14_release_6: 241.8,
  s14_count_6: 246.22,
  s14_submunitions_m10: 247.6,

  // S15 (252.00 – 278.10, 3D): Radar mảng pha AN/MPQ-65 hơn 5.000 phần tử quét điện tử & lệnh phóng PAC-3
  s15_start: 252.0,
  s15_an_mpq65: 260.42,
  s15_elements_5000: 264.44,
  s15_detect_kinzhal: 270.74,
  s15_pac3_launch: 276.6,

  // S16 (278.10 – 295.65, 2D): Hình học tốc độ siêu vượt âm — mảnh văng ngòi tiếp cận trượt sau đuôi vs radar chủ động PAC-3
  s16_start: 278.1,
  s16_old_prox_miss: 281.5,
  s16_hit_concept: 288.78,
  s16_active_radar: 292.84,

  // S17 (295.65 – 325.85, 3D): Đấu 1 chọi 1 — PAC-3 nổ động cơ đẩy ngang quanh mũi, đâm trực diện > Mach 10 làm bốc hơi Kinzhal
  s17_start: 295.65,
  s17_head_on: 297.4,
  s17_acm_burst1: 305.5,
  s17_acm_burst2: 308.2,
  s17_acm_snap: 310.6,
  s17_kinetic_vaporize: 315.4,
  s17_mach10_label: 318.72,
  s17_one_on_one_win: 322.2,

  // S18 (325.85 – 341.70, 2D): 1 quả PAC-3 bất lực trước đám mây 36 mũi xuyên động năng Oreshnik & Mở Phần 4
  s18_start: 325.85,
  s18_oreshnik_wall: 326.56,
  s18_cloud_36: 334.34,
  s18_part4_title: 340.08,

  // S19 (341.70 – 363.00, 2D): Toán học xác suất — 16 đạn chặn 16 mục tiêu, quả thứ 17 lọt lưới & hiệu ứng cấp số nhân Oreshnik
  s19_start: 341.7,
  s19_cap_16: 346.08,
  s19_fire_16: 348.8,
  s19_leaker_17: 354.76,
  s19_oreshnik_collapse: 357.74,

  // S20 (363.00 – 383.35, 3D): Tấn công bão hòa lớp 1 & 2 — UAV giá rẻ ép radar Patriot phát sóng lộ diện + tên lửa hành trình nhử đạn
  s20_start: 363.0,
  s20_saturation_shift: 365.5,
  s20_uav_bait: 372.02,
  s20_radar_expose: 376.12,
  s20_cruise_lure: 377.88,
  s20_patriot_fire_bait: 380.6,

  // S21 (383.35 – 397.00, 3D): Tấn công bão hòa lớp 3 — Đạn đạo hạng nặng & Oreshnik ập xuống khi 16 ống phóng Patriot đã trống rỗng
  s21_start: 383.35,
  s21_last_salvo1: 384.2,
  s21_last_salvo2: 385.6,
  s21_heavy_incoming: 387.78,
  s21_oreshnik_arrive: 391.82,
  s21_empty_tubes: 393.26,

  // S22 (397.00 – 419.10, 2D): Sản lượng 650 quả PAC-3/năm chia toàn cầu & kíp trắc thủ bất lực nhìn màn hình khi cạn sạch đạn
  s22_start: 397.0,
  s22_prod_650: 399.28,
  s22_split_allies: 402.02,
  s22_breach_impacts: 408.5,
  s22_helpless_crew: 412.68,

  // S23 (419.10 – 436.98, 2D): Quy luật hai chiều — S-300 / S-400 Nga cũng cạn cơ số đạn trước chiến thuật bầy UAV giá rẻ của Ukraine
  s23_start: 419.1,
  s23_both_sides: 419.4,
  s23_s300_s400: 422.62,
  s23_limited_tubes: 426.88,
  s23_ukraine_uav: 430.96,
  s23_drain_tubes: 434.0,

  // S24 (436.98 – 449.03, 3D): Khẩu đội S-400 trơ ống phóng rỗng trước loạt tên lửa hạng nặng lao tới & khung kết S-400
  s24_start: 436.98,
  s24_s400_defenseless: 437.36,
  s24_heavy_strike: 441.4,
  s24_outro_s400: 443.02,
} as const;
