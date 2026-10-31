// Mốc sự kiện theo từng từ cho Chương C01 (0.00–124.26 s) — lấy trực tiếp từ plan/chapters/C01.voice.md
export const CUE = {
  // C01S01 (0.00–24.32 s): Đại cảnh 3/4 mũi USS Hornet chồm sóng 30 ft → hạ thấp lia sát sàn gỗ ướt đẫm & 16 B-25B xích chặt
  c01_s01_time: 0.32, // "7.38 a.m."
  c01_s01_storm: 4.6, // "storm-tossed"
  c01_s01_pitching: 6.7, // "Pitching"
  c01_s01_swells: 7.46, // "30-foot swells"
  c01_s01_hornet: 9.88, // "USS Hornet"
  c01_s01_chained: 11.62, // "chained"
  c01_s01_deck: 12.56, // "flight deck"
  c01_s01_sixteen: 15.68, // "16"
  c01_s01_b25: 17.94, // "B-25 Mitchell"
  c01_s01_explosives: 21.18, // "high explosives"
  c01_s01_tokyo: 23.88, // "Tokyo"

  // C01S02 (24.32–38.68 s): Đài chỉ huy đảo Hornet (Doolittle) → cận cảnh trinh sát viên khựng lại bên ống nhòm phát hiện tàu lạ 20.000 yards
  c01_s02_doolittle: 26.64, // "Jimmy Doolittle"
  c01_s02_ten_hours: 28.28, // "10 hours"
  c01_s02_spray: 31.84, // "spray"
  c01_s02_lookout: 32.74, // "lookout"
  c01_s02_freezes: 33.02, // "freezes"
  c01_s02_binoculars: 34.0, // "binoculars"
  c01_s02_vessel: 34.84, // "Surface vessel ahead!"
  c01_s02_yards: 36.32, // "20,000 yards!"
  c01_s02_starboard: 37.64, // "Turn to starboard!"

  // C01S03 (38.68–48.98 s): Góc cực thấp từ hõm sóng bão ngước nhìn tàu tuần tiễu Nhật No. 23 Nitto Maru (70 tấn) cách 11 dặm
  c01_s03_bobbing: 38.88, // "Bobbing"
  c01_s03_eleven_miles: 39.36, // "11 miles"
  c01_s03_num23: 41.9, // "23."
  c01_s03_nitto: 43.14, // "Nito Maru"
  c01_s03_picket: 44.52, // "70-ton Japanese picket boat"
  c01_s03_spot: 47.66, // "spot American warships"

  // C01S04 (48.98–57.44 s): Tuần dương hạm USS Nashville tách đội hình xoay 5 tháp pháo 6-inch khai hỏa rền vang
  c01_s04_immediately: 48.98, // "Immediately,"
  c01_s04_nashville: 51.28, // "USS Nashville"
  c01_s04_breaks: 52.36, // "breaks formation"
  c01_s04_opens_fire: 53.58, // "opens fire"
  c01_s04_six_inch: 54.94, // "6-inch guns"
  c01_s04_thundering: 55.78, // "thundering"

  // C01S05 (57.44–68.56 s): Góc cận xuyên cửa kính sáng ấm buồng lái Nitto Maru rung lắc dữ dội khi thủy thủ lao tới điện đài báo động Tokyo
  c01_s05_wheelhouse: 58.4, // "rocking wheelhouse"
  c01_s05_minutes: 61.14, // "minutes to live"
  c01_s05_lunges: 62.58, // "lunges"
  c01_s05_radio: 63.32, // "radio"
  c01_s05_send_alert: 63.9, // "Send the alert!"
  c01_s05_carriers_sighted: 65.2, // "Enemy carriers sighted!"
  c01_s05_warn_hq: 66.72, // "Warn headquarters immediately!"

  // C01S06 (68.56–92.48 s): Mưa đạn 938 viên 6-inch bắn nổ tung Nitto Maru → cắt trong cảnh sang phòng nghe lén vô tuyến / đài chỉ huy Halsey
  c01_s06_disappearing: 69.0, // "Disappearing"
  c01_s06_hard_hit: 72.3, // "maddeningly hard to hit"
  c01_s06_rounds_938: 75.8, // "938 rounds"
  c01_s06_blow_apart: 79.26, // "blow the Nito Maru apart"
  c01_s06_bridge_cut: 80.92, // điểm cắt trong khoảng ngắt 0.6s sang phòng vô tuyến / đài chỉ huy USS Hornet
  c01_s06_interceptors: 82.46, // "Navy radio interceptors"
  c01_s06_tokyo_msg: 85.04, // "Tokyo got the message"
  c01_s06_hornet_bridge: 87.52, // "Hornets' bridge"
  c01_s06_halsey: 89.72, // "Bull Halsey"
  c01_s06_brutal_choice: 91.38, // "brutal choice"

  // C01S07 (92.48–115.38 s): Cảnh thuần 2D duy nhất — Hải đồ chiến lược Thái Bình Dương & lựa chọn sinh tử của Đô đốc Halsey
  c01_s07_handful: 93.98, // "handful of carriers"
  c01_s07_closer_200: 96.92, // "200 miles closer"
  c01_s07_alerted_japan: 98.82, // "alerted Japan"
  c01_s07_enterprise: 102.26, // "USS Enterprise"
  c01_s07_ambush: 104.28, // "ambush"
  c01_s07_overboard: 105.68, // "shove 16 army bombers overboard"
  c01_s07_launch_now: 109.66, // "launches right now"
  c01_s07_early_10h: 111.22, // "10 hours early"
  c01_s07_farther_200: 112.28, // "200 miles farther out"
  c01_s07_fuel_math: 114.24, // "fuel math allows"

  // C01S08 (115.38–124.26 s): Góc thấp kịch tính trên sàn tàu USS Hornet gió quật — loa phóng thanh "Army pilots! Man your planes!" & quay cánh quạt B-25
  c01_s08_neither_hesitates: 115.62, // "Neither man hesitates"
  c01_s08_loudspeakers: 118.36, // "loudspeakers blares"
  c01_s08_eighty_men: 120.48, // "80 men's fates"
  c01_s08_army_pilots: 122.02, // "Army pilots!"
  c01_s08_man_planes: 123.4, // "Man your planes!"
} as const;
