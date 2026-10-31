// Mốc sự kiện theo từng từ của Chương C02 (183.90–298.80 s) — lấy trực tiếp từ plan/chapters/C02.voice.md
export const CUE = {
  // C02S01 (183.90–198.40 s): Khoang khoá nòng M256, vỏ thuốc phóng tự cháy & đế kim loại cỡ gạt tàn
  c02_s01_inside_turret: 184.18, // Inside@184.18
  c02_s01_no_brass: 185.46, // no@185.46 giant@185.66 brass@186.06 casing@186.38
  c02_s01_no_clatter: 187.16, // clatters@187.16
  c02_s01_shell_120mm: 189.3, // 120mm@189.30
  c02_s01_rigid_propellant: 192.78, // propellant@192.78
  c02_s01_burn_start: 193.58, // burns@193.58
  c02_s01_burn_chamber: 194.8, // chamber,@194.80
  c02_s01_breech_drop: 195.12, // dropping@195.12
  c02_s01_ashtray_puck: 196.3, // ashtray@196.30
  c02_s01_puck_rest: 197.74, // puck.@197.74

  // C02S02 (198.40–218.10 s): Đạn xuyên động năng 56-lb M829A4 & lõi mũi lao Uranium nghèo đặc gấp 1.7 lần chì
  c02_s02_muzzle_scream: 198.78, // screams@198.78
  c02_s02_heavy_armor: 201.6, // heavy@201.60
  c02_s02_56lb: 203.18, // 56@203.18
  c02_s02_m829a4: 204.02, // M829A4,@204.02
  c02_s02_gulf_war: 207.02, // Gulf@207.02
  c02_s02_silver_bullet: 208.18, // silver@208.18
  c02_s02_hidden_inside: 209.42, // Hidden@209.42
  c02_s02_finned_dart: 211.14, // finned@211.14
  c02_s02_broomstick: 212.72, // broomstick,@212.72
  c02_s02_depleted_uranium: 214.2, // depleted@214.20
  c02_s02_denser_1_7x: 215.8, // 1@215.80 .7@216.10
  c02_s02_than_lead: 217.78, // lead.@217.78

  // C02S03 (218.10–231.20 s): Khai hoả 5,400 ft/s (Mach 5) & bung tách 3 cánh sabot ngoài trường bắn
  c02_s03_muzzle_fire: 218.1, // Leaving@218.10
  c02_s03_fps_5400: 219.74, // 5@219.74 ,400@220.16
  c02_s03_mach5: 222.58, // Mach@222.58
  c02_s03_mile_per_sec: 224.14, // mile@224.14
  c02_s03_three_petals: 225.9, // three@225.90
  c02_s03_sabot: 226.66, // sabot@226.66
  c02_s03_sabot_peel: 227.46, // peel@227.46
  c02_s03_solid_dart: 228.96, // solid@228.96
  c02_s03_zero_explosives: 230.0, // zero@230.00

  // C02S04 (231.20–243.60 s): Sơ đồ 2D mặt cắt vi mô — Tungsten chùn hình nấm vs DU trượt tinh thể tự mài sắc
  c02_s04_kills_kinetic: 231.6, // kills@231.60
  c02_s04_kinetic_force: 232.54, // kinetic@232.54
  c02_s04_tungsten_dart: 234.28, // tungsten@234.28
  c02_s04_mushroom_blunt: 235.0, // mushroom@235.00
  c02_s04_tungsten_impact: 236.2, // impact,@236.20
  c02_s04_du_dart: 237.06, // depleted@237.06
  c02_s04_crystal_shears: 237.82, // shears@237.82
  c02_s04_crystal_planes: 239.34, // crystal@239.34
  c02_s04_self_sharpen: 240.62, // sharpening@240.62
  c02_s04_chisel_edge: 241.64, // chisel@241.64
  c02_s04_carves_steel: 242.32, // carves@242.32

  // C02S05 (243.60–254.20 s): Mũi lao DU xuyên sườn T-72 & bụi pyrophoric bùng cháy thành bão lửa 3,000°F
  c02_s05_uranium_dust: 244.48, // uranium@244.48
  c02_s05_pyrophoric: 245.44, // pyrophoric,@245.44
  c02_s05_pierce_cabin: 247.18, // pierces@247.18
  c02_s05_superheated_shavings: 248.88, // superheated@248.88
  c02_s05_firestorm_ignite: 249.84, // ignite@249.84
  c02_s05_temp_3000f: 251.96, // 3@251.96 ,000@252.22
  c02_s05_firestorm_peak: 253.16, // firestorm.@253.16

  // C02S06 (254.20–283.76 s): Đạn ghém M1028 1,100 bi tungsten & đạn thông minh M1147 AMP 3 chế độ nổ
  c02_s06_ammo_smart: 256.42, // smart.@256.42
  c02_s06_four_rounds: 258.3, // four@258.30
  c02_s06_m1028_canister: 260.28, // M@260.28 -1028@260.56
  c02_s06_giant_shotgun: 263.98, // shotgun@263.98
  c02_s06_canister_blast: 264.52, // blasting@264.52
  c02_s06_balls_1100: 264.98, // 1@264.98 ,100@265.44
  c02_s06_range_500yd: 267.5, // 500@267.50
  c02_s06_today_amp: 268.9, // Today,@268.90
  c02_s06_base_rings: 270.02, // rings@270.02
  c02_s06_m1147_amp: 271.08, // M@271.08 -1147@271.34
  c02_s06_talk_breech_pins: 273.86, // talk@273.86
  c02_s06_amp_launch: 276.0, // launch,@276.00
  c02_s06_mode_contact: 278.04, // explode@278.04
  c02_s06_mode_delay: 279.24, // delay@279.24
  c02_s06_bunker_burst: 280.28, // bunker@280.28
  c02_s06_mode_airburst: 281.46, // airburst@281.46
  c02_s06_missile_teams: 283.12, // missile@283.12

  // C02S07 (283.76–298.80 s): Cặp súng máy 7.62mm M240 (11,400 viên) & trạm CROWS .50 cal Ma Deuce (900 viên)
  c02_s07_backup_guns: 283.76, // Back@283.76
  c02_s07_rounds_11400: 285.1, // 11@285.10 ,400@285.46
  c02_s07_two_762mm: 287.14, // two@287.14
  c02_s07_m240_fire: 288.84, // M240@288.84
  c02_s07_rounds_900: 291.0, // 900@291.00
  c02_s07_cal_50_fire: 292.22, // .50@292.22
  c02_s07_ma_deuce: 293.24, // MA@293.24
  c02_s07_under_armour: 294.56, // Under@294.56
  c02_s07_crows_station: 295.64, // Crow's@295.64
  c02_s07_nothing_survives: 297.3, // nothing@297.30
} as const;
