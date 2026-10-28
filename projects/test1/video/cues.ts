// Mốc sự kiện chuẩn (giây voice tuyệt đối) từ plan/voice_map.md — nguồn duy nhất cho cả cảnh và âm thanh.
export const CUE = {
  start: 0,
  end: 114.69,

  // S01 (0.00 - 10.88): Mở màn & So sánh tỉ lệ MQ-1 Predator -> MQ-9 Reaper
  s01_reaper_enter: 0.38,      // "MQ-9 Reaper"
  s01_general_atomics: 3.90,   // "General Atomics chế tạo"
  s01_predator_compare: 6.30,  // "MQ-1 Predator" xuất hiện bay song song
  s01_overtake: 8.18,          // "vượt trội cùng khả năng yểm trợ..." Reaper vọt lên

  // S02 (10.88 - 22.25): Sơ đồ Tổ hợp tác chiến C4ISR & Buồng lái GCS
  s02_system_open: 11.98,      // "Reaper không chỉ là chiếc phi cơ đơn lẻ..."
  s02_uav_node: 16.08,         // "Máy bay mang khí tài"
  s02_gcs_link: 17.34,         // "trạm điều khiển mặt đất"
  s02_sat_link: 18.36,         // "kết nối vệ tinh"
  s02_crew_zoom: 19.28,        // "kíp lái gồm sĩ quan chỉ huy..."
  s02_tech_officer: 21.02,     // "cùng kỹ thuật viên vũ khí"

  // S03 (22.25 - 29.85): Bản vẽ kỹ thuật Top-Down Blueprint & Kích thước thật
  s03_blueprint_in: 22.42,     // "Chiếc UAV sở hữu..."
  s03_span: 24.18,             // "20,12 mét" (thước đo sải cánh)
  s03_length: 26.02,           // "11 mét" (thước đo chiều dài)
  s03_mtow: 27.98,             // "4.763 kg" (trọng lượng cất cánh tối đa)

  // S04 (29.85 - 43.10): Động cơ đẩy Honeywell TPE331 & Trần bay 15.000 m / 27 giờ
  s04_engine_focus: 31.78,     // "Honeywell TPE331"
  s04_speed_surge: 34.94,      // "482 km/h"
  s04_ceiling_pullback: 37.52, // "15.000 mét"
  s04_radius_3000km: 39.46,    // "3.000 km"
  s04_endurance: 42.22,        // "27 giờ"

  // S05 (43.10 - 51.82): Mặt cắt giải phẫu cầu quang điện tử MTS-B & Radar mũi
  s05_eye_intro: 43.28,        // "Mắt thần của Reaper..."
  s05_mtsb_open: 45.80,        // "MTS-B" mở vỏ cắt kỹ thuật
  s05_flir: 47.06,             // "camera hồng ngoại"
  s05_daynight: 48.14,         // "cảm biến ngày đêm"
  s05_laser: 49.10,            // "laser đo xa, chiếu xạ mục tiêu"
  s05_radar: 51.00,            // "radar trinh sát"

  // S06 (51.82 - 61.22): POV Cằm MTS-B chiếu Laser 24/7 khoá Công sự kiên cố & Bom Laser đánh trúng
  s06_track_lock: 54.04,       // "chỉ thị mục tiêu chuẩn xác"
  s06_24_7: 55.14,             // "24 trên 7"
  s06_bunker_focus: 56.50,     // "công sự kiên cố"
  s06_laser_weapon: 58.38,     // "vũ khí dẫn đường laser" (bom lao vào khung)
  s06_laser_bomb_hit: 59.95,   // Bom laser chạm nổ mục tiêu cạnh công sự

  // S07 (61.22 - 70.70): Dolly dưới cánh quét 4x AGM-114 Hellfire & 2x GBU-12 Paveway II
  s07_pylon_sweep: 61.46,      // "Về hỏa lực..."
  s07_hellfire_focus: 63.32,   // "4 tên lửa AGM-114 Hellfire"
  s07_gbu12_focus: 66.06,      // "2 bom dẫn đường laser GBU-12 Paveway II"
  s07_gbu12_drop: 68.82,       // "nặng 227 kg" (thả tách 1 quả GBU-12)

  // S08 (70.70 - 80.68): Hellfire diệt tăng 8 km vs Biến thể 6 lưỡi kiếm động năng R-9X Ninja Bomb
  s08_hellfire_launch: 70.94,  // "Hellfire là vũ khí diệt tăng..."
  s08_tank_hit: 72.40,         // Đánh nổ xe tăng
  s08_range_8km: 73.20,        // "8 km"
  s08_r9x_reveal: 74.94,       // "Ninja Bomb R-9X"
  s08_blades_open: 76.56,      // "6 lưỡi kiếm động năng" bung xoè 60 độ
  s08_kinetic_strike: 78.76,   // "hạ sát mục tiêu mà không gây thiệt hại phụ cận"

  // S09 (80.68 - 96.70): Biểu đồ Tầm bắn Vũ khí Mở rộng (Griffin, GBU-38 JDAM 28 km, GBU-39 SDB)
  s09_griffin: 83.76,          // "AGM-176 Griffin" phóng
  s09_griffin_hit: 85.80,      // "liều nổ nhẹ" chạm nổ gọn
  s09_gbu38: 87.02,            // "GBU-38" xuất hiện & thả
  s09_gps_wave: 89.10,         // "GPS quán tính JDAM"
  s09_range_28km: 91.64,       // "28 km" chạm mốc tầm xa
  s09_gbu39_intro: 94.76,      // "GBU-39 SDB"

  // S10 (96.70 - 104.60): GBU-39 SDB bung cánh Diamondback lướt 110 km diệt Kho tàng & Xe cơ động
  s10_wing_deploy: 97.32,      // "cánh mở rộng Diamondback" bung xoè
  s10_glide_110km: 100.20,     // "lướt tới 110 km"
  s10_dive_start: 101.34,      // "thả từ độ cao lớn, tấn công chính xác..."
  s10_impact: 103.10,          // Đánh nổ kho tàng & xe cơ động

  // S11 (104.60 - 114.69): Đại cảnh kết Orbit ngược nắng bình minh trên thung lũng
  s11_orbit_start: 104.60,     // "Thời gian bám trụ dài..."
  s11_hero_pullback: 109.02,   // "MQ-9 Reaper thành át chủ bài..."
  s11_finale: 112.88,          // "tiêu diệt các mục tiêu giá trị cao"
} as const;
