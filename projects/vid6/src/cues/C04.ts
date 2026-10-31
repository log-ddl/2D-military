// Mốc sự kiện theo từng từ của Chương C04 (473.10–668.71 s) — trích chính xác từ plan/chapters/C04.voice.md.
// Mọi khoá bắt buộc bắt đầu bằng tiền tố `c04_`.

export const CUE = {
  // C04S01 (473.10–500.10 s): Buồng lái nằm ngửa mũi xe, ghi-đông T-bar & hộp số Allison xoay pivot 73.6 tấn
  c04_s01_sprint: 476.62,   // sprint@476.62
  c04_s01_nose: 479.98,     // nose,@479.98
  c04_s01_reclines: 483.34, // reclines@483.34
  c04_s01_tbar: 487.06,     // T@487.06 (-bar handlebars)
  c04_s01_twist: 488.80,    // Twist@488.80 (throttleTwist)
  c04_s01_steer: 491.02,    // Push@491.02 (left or right)
  c04_s01_allison: 492.58,  // Allison@492.58 (transmission)
  c04_s01_pivot: 497.16,    // pivot@497.16 (73.6 tons in place)

  // C04S02 (500.10–521.20 s): 14 bánh đôi + thanh xoắn nuốt cú rơi 3 ft & xích T-158 rộng 25 inch 15.4 PSI
  c04_s02_wheels: 501.20,   // 14@501.20 (dual road wheels)
  c04_s02_torsion: 503.56,  // torsion@503.56 (bars across the floor)
  c04_s02_drop: 507.02,     // three@507.02 (-foot drops)
  c04_s02_t158: 510.90,     // T@510.90 (-158 tracks)
  c04_s02_psi: 515.42,      // 15@515.42 (.4 pounds per square inch)
  c04_s02_sedan: 519.96,    // sedan's@519.96 (tires)

  // C04S03 (521.20–556.24 s): Tuabin khí Honeywell AGT1500 1,500 HP "Whispering Death" & lọc khí xung phản lực
  c04_s03_agt1500: 522.84,  // Honeywell@522.84 (AGT-1500 gas turbine)
  c04_s03_jet: 527.90,      // jet@527.90 (helicopter jet engine)
  c04_s03_weight: 529.36,   // 2@529.36 (,500 pounds)
  c04_s03_hp: 533.92,       // 1@533.92 (,500 horsepower)
  c04_s03_whisper: 542.62,  // Whispering@542.62 (Death)
  c04_s03_jp8: 544.72,      // JP@544.72 (-8 jet fuel)
  c04_s03_pulsejet: 550.70, // blast@550.70 (compressed air backward)

  // C04S04 (556.24–569.50 s): Cái giá khắc nghiệt — vỉ đuôi phả khí xả 930°F thiêu rát bộ binh & phát sáng nhiệt
  c04_s04_bill: 559.94,     // brutal@559.94 (bill)
  c04_s04_exhaust: 562.50,  // 930@562.50 (-degree Fahrenheit exhaust)
  c04_s04_scorch: 565.82,   // scorch@565.82 (friendly infantry)
  c04_s04_thermal: 567.98,  // glow@567.98 (on thermal sites)

  // C04S05 (569.50–581.54 s): [2D] Sơ đồ tiêu hao nhiên liệu: 60 gal/hr băng đồng, ~2 gal/mile từ bình 505 gal, 10 gal/hr nổ cầm chừng
  c04_s05_burn: 570.52,     // fuel@570.52 (burn)
  c04_s05_60gal: 573.60,    // 60@573.60 (gallons an hour)
  c04_s05_2gpm: 576.14,     // 2@576.14 (gallons per mile)
  c04_s05_505gal: 577.54,   // 505@577.54 (-gallon tanks)
  c04_s05_idle: 579.62,     // 10@579.62 (gallons an hour just idling)

  // C04S06 (581.54–603.16 s): M1A2 SEPv3 có APU chạy gác im lặng nhưng nặng 73.6 tấn làm nứt cầu quê khi FPV drone $500 xuất hiện
  c04_s06_apu: 583.94,      // auxiliary@583.94 (power unit)
  c04_s06_sepv3: 585.46,    // SEPV@585.46 (-3)
  c04_s06_weight: 594.30,   // 73@594.30 (.6 tons)
  c04_s06_crack: 596.52,    // cracking@596.52 (rural bridges)
  c04_s06_drones: 600.20,   // $500@600.20 (kamikaze drones)

  // C04S07 (603.16–610.20 s): [2D] Hình chiếu bằng phân bố độ dày giáp: má trước Uranium dày vs nóc tháp & sàn động cơ mỏng
  c04_s07_front: 606.04,    // stacked@606.04 (its uranium armor up front)
  c04_s07_roof: 608.58,     // roof@608.58 (and engine deck thin)

  // C04S08 (610.20–618.10 s): Cú bổ nhào FPV Drone ở Ukraine vòng qua má giáp trước đánh nổ nóc mỏng M1A1
  c04_s08_ukraine: 611.10,  // M1A1s@611.10 (learned in Ukraine)
  c04_s08_dive: 614.14,     // diving@614.14 (onto the roof)
  c04_s08_impact: 616.86,   // cheeks@616.86 (bypasses invincible frontal cheeks completely -> nổ nóc)

  // C04S09 (618.10–645.90 s): Huỷ SEPv4, ra mắt nguyên mẫu M1E3 Abrams 2026 (~60 tấn, hybrid, khoang 3 người ở mũi, tháp tự động RWS săn drone)
  c04_s09_cancel: 623.28,   // cancel@623.28 (the heavier SEPV-4)
  c04_s09_m1e3: 627.92,     // M1E3@627.92 (Abrams)
  c04_s09_2026: 632.06,     // 2026,@632.06 (prototype testing)
  c04_s09_60tons: 635.80,   // 60@635.80 (tons)
  c04_s09_hybrid: 637.42,   // hybrid@637.42 (electric drive)
  c04_s09_capsule: 640.60,  // armored@640.60 (hull capsule)
  c04_s09_turret: 642.10,   // unmanned,@642.10 (auto-loading turret)
  c04_s09_rws: 644.18,      // defeat@644.18 (drones from day one)

  // C04S10 (645.90–662.00 s): Tôn vinh 4 thập kỷ bẻ cong vật lý — gương ổn định 40 mph, công tắc đầu gối xả nổ & tuabin trên 73 tấn thép DU
  c04_s10_abrams: 647.96,   // M1A2@647.96 (Abrams)
  c04_s10_mirrors: 653.08,  // mirrors@653.08 (at 40 miles per hour)
  c04_s10_knee: 656.68,     // knee@656.68 (switches)
  c04_s10_turbine: 658.64,  // turbine@658.64 (to 73 tons of uranium-laced steel)

  // C04S11 (662.00–668.71 s): Đại cảnh kết phim — M1A2 & M1E3 sóng đôi vượt sườn đồi chạng vạng, RWS quét lên bầu trời cao
  c04_s11_survival: 663.30, // survival@663.30
  c04_s11_evolve: 665.88,   // evolve@665.88 (faster)
  c04_s11_above: 668.04,    // above.@668.04 (threats hunting it from above)
} as const;
