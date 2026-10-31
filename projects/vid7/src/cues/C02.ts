// Mốc sự kiện từng từ của Chương C02 (124.26–368.08 s) — lấy chính xác từ plan/chapters/C02.voice.md
export const CUE = {
  // C02S01 (124.26–156.98 s) — 2D Hải đồ chiến lược "Bẫy vật lý" sau Trân Châu Cảng
  c02_s01_start: 124.26, // "To see why launching this far out..."
  c02_s01_suicide: 127.6, // "...borders on suicide,"
  c02_s01_trap: 129.06, // "...physics trap America faced"
  c02_s01_pearl: 130.88, // "...Pearl Harbor."
  c02_s01_tokyo: 134.06, // "...needed to hit Tokyo..."
  c02_s01_us_250: 140.68, // "...strike targets 250 miles away,"
  c02_s01_jp_coast: 142.94, // "while Japan guarded its coast..."
  c02_s01_jp_600: 146.38, // "...sink ships 600 miles out to sea."
  c02_s01_launch_outside: 150.9, // "...launch long-range army bombers outside Japan's reach"
  c02_s01_china: 155.82, // "...friendly airfields in China,"

  // C02S02 (156.98–186.38 s) — 3D B-25B không đuôi móc & sải cánh cứng 67 ft 7 in tràn bàn nâng thang máy Hornet
  c02_s02_start: 156.98,
  c02_s02_landing: 157.54, // "...landing a heavy bomber back onto a short carrier deck"
  c02_s02_no_tailhook: 160.88, // "without a tailhook was physically impossible."
  c02_s02_one_way: 164.46, // "It had to be a one-way trip."
  c02_s02_enter_b25: 165.7, // "Enter the North American B-25B Mitchell."
  c02_s02_sixteen_insane: 171.04, // "...putting 16 on a carrier looked insane."
  c02_s02_wingspan: 174.3, // "With a rigid wingspan of 67 feet 7 inches,"
  c02_s02_no_fold: 177.88, // "...couldn't fold its wings,"
  c02_s02_elevator: 179.94, // "couldn't fit down the Hornet's elevators,"
  c02_s02_runway_1500: 182.62, // "...needed 1,500 feet of concrete runway to lift off."

  // C02S03 (186.38–205.64 s) — 3D 16 chiếc nhồi chật sàn tàu, 467 ft sàn thép ướt trước vực 60 ft & Tiến sĩ MIT Doolittle
  c02_s03_start: 186.38,
  c02_s03_jammed: 186.64, // "Jammed onto the Hornet,"
  c02_s03_deck_467: 190.04, // "...just 467 feet of wet steel deck"
  c02_s03_drop_60: 193.56, // "before a 60-foot drop into the Pacific."
  c02_s03_doolittle: 197.56, // "Solving that equation took Jimmy Doolittle,"
  c02_s03_mit: 202.5, // "...doctorates in aeronautical engineering from MIT."

  // C02S04 (205.64–228.04 s) — 3D Sân bay bí mật Florida: Tháo tháp pháo bụng, giáp, Norden & lắp thước ngắm 20 xu Mark Twain
  c02_s04_start: 205.64,
  c02_s04_florida: 206.88, // "At a secret Florida strip,"
  c02_s04_stripped: 208.86, // "...stripped every spare pound of metal off the B-25."
  c02_s04_lower_turret: 213.82, // "Out came the heavy lower gun turret,"
  c02_s04_radios_armor: 215.54, // "...long-range radios, and steel armor."
  c02_s04_norden_out: 219.38, // "Out came the top-secret Norden bombsite,"
  c02_s04_sight_replace: 221.86, // "replaced by a simple aiming sight..."
  c02_s04_20_cents: 224.2, // "...from 20 cents' worth of scrap aluminum,"
  c02_s04_mark_twain: 227.12, // "dubbed the Mark Twain."

  // C02S05 (228.04–241.18 s) — 3D Sân bay Florida: Cú lừa 2 cán chổi sơn đen ở chóp kính đuôi
  c02_s05_start: 228.04,
  c02_s05_undefended_tail: 229.1, // "And to guard the undefended tail without adding weight,"
  c02_s05_bluff: 232.36, // "Greening added a brilliant bluff."
  c02_s05_broomsticks: 233.44, // "Two wooden broomsticks, painted flat black,"
  c02_s05_poked_plexiglass: 236.62, // "and poked through the rear plexiglass"
  c02_s05_twin_50cal: 239.06, // "...to look like twin .50 caliber machine guns."

  // C02S06 (241.18–269.60 s) — 2D Mặt cắt Blueprint nhiên liệu B-25B: 646 → 1,141 gal & dự trữ âm
  c02_s06_start: 241.18,
  c02_s06_gasoline: 243.68, // "Every pound saved went straight into gasoline."
  c02_s06_fuel_646: 247.58, // "...from 646 gallons"
  c02_s06_fuel_1141: 249.54, // "to 1,141 gallons,"
  c02_s06_bladder_160: 253.42, // "...160-gallon rubber bladder above the bomb bay,"
  c02_s06_crawlway_tank: 257.32, // "stuffing a flexible tank into the crawlway,"
  c02_s06_ten_cans: 259.78, // "and stacking 10 5-gallon gas cans inside the fuselage..."
  c02_s06_early_200: 266.0, // "...launching 200 miles early"
  c02_s06_below_zero: 268.74, // "pushed their fuel reserve below zero."

  // C02S07 (269.60–291.28 s) — 3D 08:20 sáng trên Hornet: Bánh trái đè vạch trắng, cánh phải cách đảo thép < 6 ft
  c02_s07_start: 269.6,
  c02_s07_820am: 270.84, // "At 8.20am,"
  c02_s07_plane_one: 273.78, // "Doolittle sits at the controls of plane number one."
  c02_s07_never_launched: 276.96, // "No B-25 has ever launched from a carrier before."
  c02_s07_white_stripe: 279.32, // "Keeping his left tires glued to a painted white stripe"
  c02_s07_island_tower: 283.12, // "clears the Hornet's steel island tower"
  c02_s07_six_feet: 284.48, // "...by less than 6 feet."
  c02_s07_veer_explode: 287.34, // "Veer right by a yard, and 31,000 pounds of gas and bombs explode on deck."

  // C02S08 (291.28–315.78 s) — 3D Góc mũi tàu nhìn ngược: Gió bão 45 mph, cờ caro quất xuống, nhả phanh tăng hết ga 1,700 hp
  c02_s08_start: 291.28,
  c02_s08_aero_edge: 293.02, // "Doolittle has just one aerodynamic edge."
  c02_s08_steaming_gale: 295.2, // "With the Hornet steaming full speed into a gale,"
  c02_s08_wind_45mph: 297.5, // "over 45 miles per hour of wind is already rushing across his wings..."
  c02_s08_bow_officer: 304.24, // "At the bow, the launch officer times the rise of the hull"
  c02_s08_checkered_flag: 306.48, // "...with a checkered flag"
  c02_s08_whips_down: 307.72, // "and whips it down."
  c02_s08_releases_brakes: 309.46, // "Doolittle releases the brakes"
  c02_s08_firewalls_1700: 310.76, // "and firewalls his twin 1,700-horsepower right cyclone engines."

  // C02S09 (315.78–330.86 s) — 3D Cú chạy đà dọc vạch trắng: Cánh phải cắt cầu chỉ huy, mũi tàu chồm sóng, Doolittle nhấc bổng
  c02_s09_start: 315.78,
  c02_s09_hurtling: 316.16, // "Hurtling down the white stripe,"
  c02_s09_wingtip_bridge: 318.48, // "his right wingtip slices past the steel bridge,"
  c02_s09_bow_heaves: 322.16, // "and just as the Hornet's bow heaves upward on a wave,"
  c02_s09_lifts_clear: 323.86, // "Doolittle lifts clear into the sky with feet to spare."
  c02_s09_fifteen_follow: 327.76, // "Fifteen overloaded bombers follow him into the spray."

  // C02S10 (330.86–354.86 s) — 3D Sự cố sàn tàu chiếc #16 Bat Out of Hell: Gió xoáy cánh quạt, tai nạn cánh quạt & lỗ vỡ 1 foot xuyên mũi kính
  c02_s10_start: 330.86,
  c02_s10_plane_16: 332.88, // "Last in line is plane number 16,"
  c02_s10_bat_out_of_hell: 333.8, // "Bat Out of Hell,"
  c02_s10_billy_farrow: 336.4, // "piloted by First Lieutenant Billy Farrow."
  c02_s10_prop_wash: 339.88, // "...fierce prop wash rocks his bomber across the slick deck,"
  c02_s10_deckhand_slips: 343.84, // "and a navy deckhand slips into a spinning propeller,"
  c02_s10_deshazer_spots: 350.38, // "Bombardier Corporal Jacob de Schaeser spots"
  c02_s10_foot_wide_hole: 351.36, // "a jagged foot-wide hole smashed straight through their plexiglass nose."

  // C02S11 (354.86–368.08 s) — 3D Cú lao sinh tử của Farrow: Tụt thấp dưới mũi Hornet rồi gồng mình ngóc lên bầu trời bão
  c02_s11_start: 354.86,
  c02_s11_shoving_overboard: 358.04, // "...shoving his plane overboard."
  c02_s11_drag_fuel: 361.22, // "...hole will add drag and burn extra fuel,"
  c02_s11_jams_throttles: 363.98, // "Farrow still jams the throttles forward,"
  c02_s11_dips_below_bow: 365.66, // "dips below the bow,"
  c02_s11_claws_sky: 366.88, // "and claws into the sky."
  c02_end: 368.08,
} as const;
