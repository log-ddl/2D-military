// Mốc sự kiện (giây toàn phim) cho Chương C03 (298.80–473.10 s)
// Khớp chính xác từng từ trong plan/chapters/C03.voice.md. Mọi khoá bắt đầu bằng c03_.

export const CUE = {
  // C03S01 (298.80–312.32 s) — Bí ẩn lính nạp đạn 19 tuổi bê đạn 56 lb bằng tay giữa dàn máy tính
  c03_s01_mystery: 300.54, // mystery.@300.54
  c03_s01_computers: 302.36, // computers@302.36
  c03_s01_smart_shells: 303.10, // smart@303.10
  c03_s01_soldier: 305.88, // 19@305.88
  c03_s01_56lb: 307.42, // 56@307.42
  c03_s01_by_hand: 308.84, // hand@308.84
  c03_s01_autoloaders: 310.82, // autoloaders@310.82
  c03_s01_50yrs: 311.32, // 50@311.32

  // C03S02 (312.32–328.20 s) — T-72 trúng đạn kích nổ vòng đạn carousel dưới chân, bay tháp pháo 15 tấn 100 ft
  c03_s02_t72: 313.56, // T@313.56 (-72)
  c03_s02_hit: 315.58, // hit,@315.58
  c03_s02_carousel: 317.52, // carousel@317.52
  c03_s02_two_dozen: 318.94, // two@318.94 (dozen shells)
  c03_s02_boots: 321.00, // boots.@321.00
  c03_s02_spark: 322.14, // spark@322.14
  c03_s02_pressure_cooker: 324.00, // pressure@324.00
  c03_s02_toss: 324.94, // tossing@324.94
  c03_s02_15ton: 325.44, // 15@325.44 (-ton turret)
  c03_s02_100ft: 326.46, // 100@326.46 (feet)

  // C03S03 (328.20–344.10 s) — Triết lý cứu tổ lái: 36/42 viên đạn cô lập ở đuôi bustle sau cửa chống nổ trượt
  c03_s03_opposite: 329.80, // opposite@329.80
  c03_s03_save_crew: 330.66, // Save@330.66
  c03_s03_42_rounds: 334.24, // 42@334.24
  c03_s03_36_isolated: 335.70, // 36@335.70
  c03_s03_bustle: 338.26, // bustle@338.26
  c03_s03_blast_doors: 339.36, // sliding@339.36 (blast doors)
  c03_s03_hull_empty: 342.12, // six@342.12 (hull slots empty)

  // C03S04 (344.10–368.60 s) — Công tắc đầu gối (knee switch), cửa đóng dưới 2s, nạp 4s hô "UP!"
  c03_s04_left_basket: 345.04, // left@345.04
  c03_s04_bump_pad: 347.10, // bumps@347.10
  c03_s04_knee_switch: 349.10, // knee@349.10 (switch)
  c03_s04_door_open: 350.12, // snapping@350.12
  c03_s04_rip_shell: 352.64, // rips@352.64
  c03_s04_spin: 353.76, // spins,@353.76
  c03_s04_drop_knee: 354.44, // drops@354.44
  c03_s04_door_slam: 356.24, // slams@356.24 (shut)
  c03_s04_two_sec: 357.32, // two@357.32 (seconds)
  c03_s04_ram_home: 358.46, // rams@358.46
  c03_s04_up: 360.22, // UP!@360.22
  c03_s04_four_sec: 362.96, // four@362.96 (seconds flat)
  c03_s04_beat_auto: 364.30, // beating@364.30

  // C03S05 (368.60–385.60 s) — Đạn xuyên khoang đuôi kích nổ 36 viên, 2 nắp blowout xả núi lửa lên trời, xe vẫn lăn bánh
  c03_s05_pierce_hit: 369.96, // hit@369.96
  c03_s05_ignite_36: 372.04, // ignites@372.04
  c03_s05_door_shut: 375.24, // shut,@375.24
  c03_s05_blowout_open: 376.56, // blows@376.56 (open)
  c03_s05_roof_panels: 377.58, // roof@377.58 (panels)
  c03_s05_volcano: 379.68, // volcano@379.68
  c03_s05_four_soldiers: 382.24, // four@382.24 (soldiers)
  c03_s05_keep_rolling: 384.80, // keep@384.80 (rolling)

  // C03S06 (385.60–410.00 s) — Mặt cắt 2D giáp phức hợp Chobham + lưới DU nghiền vụn luồng đồng lõm 25,000 ft/s
  c03_s06_front_punch: 385.92, // Punching@385.92
  c03_s06_solid_steel: 389.08, // Solid@389.08 (steel)
  c03_s06_120_tons: 392.94, // 120@392.94 (tons)
  c03_s06_angled_cheeks: 396.34, // angled@396.34 (cheeks)
  c03_s06_chobham: 397.98, // Chobham@397.98
  c03_s06_ceramics: 399.42, // ceramics,@399.42
  c03_s06_elastic: 400.04, // elastic@400.04
  c03_s06_heavy_alloys: 401.30, // heavy@401.30 (alloys)
  c03_s06_air_gaps: 402.34, // air@402.34 (gaps)
  c03_s06_du_mesh: 403.16, // depleted@403.16 (uranium mesh)
  c03_s06_shatter_jet: 404.66, // shattering@404.66
  c03_s06_25000_fps: 405.28, // 25@405.28 (,000-foot-per-second)
  c03_s06_cabin_safe: 409.42, // cabin.@409.42

  // C03S07 (410.00–424.00 s) — M1A2 SEPv3: 4 radar phẳng Trophy APS 360° bắn chùm mảnh xé xác RPG giữa không trung
  c03_s07_sepv3: 410.72, // M1A2@410.72 (SEP-V3)
  c03_s07_trophy_radars: 413.82, // Trophy@413.82 (radars)
  c03_s07_guard_360: 414.92, // 360@414.92 (degrees)
  c03_s07_rpg_streak: 417.76, // RPG@417.76
  c03_s07_launcher_whip: 420.36, // whip@420.36 (around)
  c03_s07_blast_pellets: 421.18, // blast@421.18 (metal pellets)
  c03_s07_shred_midair: 422.42, // shred@422.42

  // C03S08 (424.00–436.50 s) — Cảm biến quang học bắt tia lửa nhiên liệu 3 ms, xả khí dập lửa Halon dưới 150 ms
  c03_s08_fuel_flash: 425.94, // fuel@425.94 (flash)
  c03_s08_optical_spot: 427.00, // optical@427.00 (sensors)
  c03_s08_3ms: 428.84, // three@428.84 (milliseconds)
  c03_s08_flood_gas: 430.04, // Flooding@430.04
  c03_s08_150ms: 432.74, // 150@432.74 (milliseconds)
  c03_s08_before_blister: 435.52, // blister@435.52

  // C03S09 (436.50–454.40 s) — Bản đồ 2D Operation Desert Storm 1991: >1,800 xe Abrams, 0 xe bị hoả lực Iraq tiêu diệt
  c03_s09_pentagon: 436.74, // Pentagon@436.74
  c03_s09_gao_report: 440.86, // Government@440.86 (Accountability Office)
  c03_s09_desert_storm: 442.48, // Operation@442.48 (Desert Storm)
  c03_s09_1800_abrams: 445.00, // 1@445.00 (,800 Abrams)
  c03_s09_year_1991: 447.74, // 1991,@447.74
  c03_s09_zero_destroyed: 449.06, // zero@449.06 (were destroyed)
  c03_s09_zero_crew_died: 451.86, // one@451.86 (not one crewman died)

  // C03S10 (454.40–473.10 s) — M1A1 mắc lầy chịu đạn 120mm đồng đội tiêu huỷ: nắp blowout xả lửa, thân thép không vỡ
  c03_s10_m1a1_mud: 455.48, // M1A1@455.48
  c03_s10_thermite: 458.74, // thermite@458.74
  c03_s10_another_abrams: 460.24, // another@460.24 (Abrams)
  c03_s10_friendly_shoot: 461.24, // shoot@461.24
  c03_s10_120mm: 461.86, // 120@461.86 (-millimeter rounds)
  c03_s10_cookoff: 467.54, // cooked@467.54 (off its ammo)
  c03_s10_blowout_vent: 469.06, // blowout@469.06 (panels vented)
  c03_s10_hull_intact: 471.64, // hull@471.64 (refused to shatter)
} as const;
