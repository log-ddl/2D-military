// scenes/_cue.ts — Bảng mốc thời gian toàn phim (giây) bám sát voice_map.md.
// Mỗi chương thêm các mốc từ khoá vào đây để scene và sound.json cùng tham chiếu.

export const CUE = {
  // ── Chương 1 (0.00 – 73.10s) ──────────────────────────────────────
  ch1_start: 0.0,
  ch1_b747_100t: 3.24,        // "more than 100 tons of cargo"
  ch1_tank_60t: 5.94,         // "and a modern main battle tank weighs around 60 tons"
  ch1_drive_in: 9.12,         // "Yet if you tried to drive that 60-ton tank into..."
  ch1_crush_floor: 14.76,     // "the tank would crush the floor beams..."
  ch1_crush_snap: 15.60,      // khoảnh khắc dầm sàn gãy sập
  ch1_airstrip_shift: 18.18,  // "Even if the floor held, you could never get the tank inside..."
  ch1_deck_5m: 23.44,         // "cargo deck of a civilian wide-body jet sits 5 meters up"
  ch1_scissor_lift: 27.94,    // "and waits for a hydraulic scissor lift truck"
  ch1_scissor_cross: 30.80,   // "only exists at peaceful international airports"

  ch1_diff_breed: 33.24,      // "That mismatch explains why every serious air force..."
  ch1_question: 41.76,        // "Here is the question this video answers."
  ch1_silhouette: 44.30,      // "Why does every military transport aircraft on Earth..."
  ch1_wings_roof: 49.66,      // "with wings bolted to the roof,"
  ch1_fat_belly: 51.60,       // "a fat belly scraping the concrete,"
  ch1_upswept_tail: 53.40,    // "and an upswept tail,"
  ch1_drag_fuel: 54.66,       // "even though that shape burns more fuel and flies slower..."

  ch1_not_sky: 58.68,         // "The answer is that a military airlifter is not designed..."
  ch1_20_min: 64.24,          // "Every part of its body is shaped around the 20 minutes..."
  ch1_spit_army: 69.62,       // "trying to swallow or spit out an army before someone shoots at it."
  ch1_shell_1: 70.60,         // Đạn pháo địch bắn gần đường băng #1
  ch1_shell_2: 71.50,         // Đạn pháo địch bắn gần đường băng #2
  ch1_shell_3: 72.30,         // Đạn pháo địch bắn gần đường băng #3
  ch1_end: 73.10,

  // ── Chương 2 (73.10 – 143.00s) ────────────────────────────────────
  ch2_start: 73.10,
  ch2_under_belly: 79.72,     // "Passenger jets mount their wings under the belly..."
  ch2_mil_start: 87.26,       // "A military transport such as the C-130 Hercules..."
  ch2_top_fuselage: 95.50,    // "bolts its wings straight across the top of the fuselage."
  ch2_two_problems: 100.30,   // "Doing that solves two ground problems at once."
  ch2_high_engines: 103.06,   // "First, hanging four huge jet engines... lifts them several meters clear"
  ch2_vacuum_gravel: 109.98,  // "where they are far less likely to vacuum up loose gravel, sand, and shell fragments"
  ch2_fod_boom: 112.40,       // Động cơ thấp dân sự hút mảnh đạn/đá dăm chớp nổ

  ch2_wing_box: 116.10,       // "Second, putting the structural wing box on the roof..."
  ch2_floor_1_5m: 120.24,     // "allowing the cargo floor to hang barely a meter and a half above the ground."
  ch2_t_tail: 124.04,         // "Combine that low belly with a tail fin lifted high into a T-shape,"
  ch2_ramp_open: 127.74,      // "and the entire rear end of the fuselage can swing open as a steel ramp"
  ch2_no_crane: 133.70,       // "A truck driver or a tank crew does not need a crane..."
  ch2_drive_ferry: 137.54,    // "They simply drive straight up the tail ramp into the fuselage..."
  ch2_end: 143.00,

  // ── Chương 3 (143.00 – 245.50s) ───────────────────────────────────
  ch3_start: 143.00,
  ch3_civil_100t: 150.84,     // "A commercial cargo plane carries its 100 tons spread evenly..."
  ch3_mil_60t_tracks: 156.60, // "A military transport has to take 60 tons concentrated onto the two short steel footprints..."
  ch3_mlrs_axles: 162.90,     // "or the four heavy axles of a rocket launcher."
  ch3_highway_bridge: 165.50, // "So the floor of a heavy lifter... is built like a highway bridge,"
  ch3_tiedown_rings: 172.24,  // "ribbed with thick alloy beams and studded with heavy tie-down rings"
  ch3_rollers_intro: 178.36,  // "Built into channels along that floor are rows of steel rollers..."
  ch3_smooth_side: 183.16,    // "Turn the smooth side up and you have a flat road..."
  ch3_flip_rollers: 188.48,   // "Flip the rollers up and two loadmasters can push a line of cargo pallets..."

  ch3_walls_comfort: 194.50,  // "Along the walls, comfort disappears altogether."
  ch3_red_seats: 201.52,      // "by unfolding rows of red nylon webbing seats..."
  ch3_paratroopers: 206.54,   // "Hundreds of paratroopers sit shoulder to shoulder..."
  ch3_chains_hope: 211.32,    // "in the center aisle, staring at the steel chains..."

  ch3_c5_visor: 216.80,       // "On the even larger C-5 Galaxy, the entire nose cone, cockpit and all hinges upward..."
  ch3_c5_kneel: 223.26,       // "while the landing gear kneels hydraulically to lower the deck,"
  ch3_c5_tunnel: 226.28,      // "turning the fuselage into a tunnel where columns of trucks can drive..."
  ch3_apu_winch: 230.94,      // "Every military airlifter also carries its own auxiliary gas turbine generator..."
  ch3_dark_strip: 237.96,     // "so it can power its own hydraulics, light its own cabin, and drag dead vehicles..."
  ch3_end: 245.50,

  // ── Chương 4 (245.50 – 373.70s) ───────────────────────────────────
  ch4_start: 245.50,
  ch4_airliner_concrete: 249.14, // "An airliner lands on smooth concrete several feet thick..."
  ch4_mil_mud_clay: 255.10,   // "A military transport has to land on thin tarmac, sun-baked clay..."
  ch4_punch_crust: 261.60,    // "To keep from punching through the crust... pack 12-28 wide,"
  ch4_bulging_pods: 270.20,   // "low-pressure tires into bulging pods along the sides..."
  ch4_caterpillar: 274.16,    // "spreading the weight across the ground like the feet of a caterpillar."

  ch4_aero_violence: 277.40,  // "Getting down onto a short front-line strip also takes aerodynamic violence."
  ch4_three_deg: 281.70,      // "A commercial jet glides down a gentle three-degree slope..."
  ch4_steep_elevator: 287.40, // "A C-17 approaching a threatened airfield can point its nose steeply downward..."
  ch4_manpads_reach: 293.56,  // "to spend as little time as possible inside the reach of shoulder-fired..."
  ch4_manpads_fire: 296.20,   // Xạ thủ MANPADS phóng tên lửa tầm nhiệt
  ch4_flares_spit: 298.02,    // "while sensors on its belly watch for missile launches and banks of dispensers spit walls of decoy flares."
  ch4_flare_burst1: 299.10,   // Loạt pháo sáng mồi bẫy #1
  ch4_flare_burst2: 300.30,   // Loạt pháo sáng mồi bẫy #2
  ch4_missile_spoof: 301.80,  // Tên lửa tầm nhiệt nổ lệch vào chùm pháo sáng
  ch4_blown_flaps: 303.74,    // "To keep the wings from stalling at low speed, the exhaust... blows directly against huge titanium flaps"
  ch4_smash_runway: 314.72,   // "The moment the wheels smash into the runway,"
  ch4_spoilers_rev: 317.00,   // "the pilot pops spoilers on the wings and throws all four engines into reverse thrust,"
  ch4_stop_200t: 321.76,      // "stopping a 200-ton aircraft in less than a kilometer,"

  ch4_back_up: 324.60,        // "and then uses that same reverse thrust to back the aircraft up"
  ch4_turn_around: 328.16,    // "and turn around on a strip barely wider than its own wingspan."

  ch4_no_runway: 331.60,      // "Sometimes there is no runway at all, or the ground is too hot to stop."
  ch4_hot_shell1: 333.10,     // Đạn pháo nổ dưới mặt đất nóng #1
  ch4_hot_shell2: 334.50,     // Đạn pháo nổ dưới mặt đất nóng #2
  ch4_drogue_chute: 342.24,   // "the crew releases a small drogue parachute out the back."
  ch4_yank_pallets: 346.88,   // "and the chute yanks a whole train of cargo pallets..."
  ch4_lapes_intro: 353.60,    // "In the most extreme version, developed during the Cold War..."
  ch4_lapes_skim: 359.32,     // "the transport skimmed just two or three meters above a flat field,"
  ch4_lapes_drag: 362.60,     // "without touching down while a gigantic parachute dragged an armored vehicle..."
  ch4_lapes_hit: 367.20,      // Xe thiết giáp chạm cỏ cày tung đám mây bụi
  ch4_end: 373.70,

  // ── Chương 5 (373.70 – 482.22s) ───────────────────────────────────
  ch5_start: 373.70,          // "Because no single aircraft can be both gigantic and tiny,"
  ch5_two_tiers: 377.84,      // "Air Forces split transport fleets into two tiers."
  ch5_strategic_c5: 380.60,   // "Strategic lifters like the C-5 Galaxy and AN-124 are long-range giants"
  ch5_haul_ocean: 385.42,     // "that haul outsized tanks and helicopters from factories across oceans to major rear bases."
  ch5_tactical_c130: 390.54,  // "Tactical transports like the four-propeller C-130 Hercules"
  ch5_rough_strips: 394.16,   // "take those loads from the rear hub and fly them into the short, rough strips near the fighting,"
  ch5_bridge_c17: 398.84,     // "while middleweights like the C-17 and A-400M bridge both worlds."
  ch5_fuel_appetite: 403.48,  // "Even then, airlift has a hilarious self-licking appetite for fuel."
  ch5_remote_base: 408.40,    // "Fly a fleet of transports into a remote base that has no fuel tanks of its own,"
  ch5_bladder_tanks: 412.74,  // "and half the cargo planes in the mission end up carrying nothing but bladder tanks of jet fuel"
  ch5_fly_home: 417.06,       // "so the other half can fly home."

  ch5_mistake: 418.70,        // "Which brings us to the mistake people make when they talk about military airlift."
  ch5_supply_war: 423.36,     // "Commentators often speak as if fleets of giant cargo planes can supply a major war..."
  ch5_worst_months: 429.22,   // "My own reading is that airlift is the worst way on earth to sustain an army over months,"
  ch5_save_48h: 434.30,       // "and the only way on earth to save one in 48 hours."
  ch5_cargo_ship: 437.70,     // "One medium cargo ship carries as much tonnage in a single voyage as hundreds of C-17 sorties,"
  ch5_fuel_fraction: 443.22,  // "at a tiny fraction of the fuel cost."
  ch5_fire_engines: 445.44,   // "Transport aircraft are not the supply trucks of a war, they are the fire engines,"
  ch5_enemy_shell1: 446.60,   // Xe tăng địch bắn pháo tiến công #1
  ch5_throw_brigade: 448.36,  // "built to throw a brigade, a battery of air defense missiles,"
  ch5_enemy_shell2: 449.80,   // Xe tăng địch bắn pháo #2
  ch5_friendly_fire: 451.00,  // Xe tăng ta vừa đổ bộ bắn trả
  ch5_sam_launch: 452.10,     // Khẩu đội SAM vừa đổ bộ phóng tên lửa phòng không
  ch5_sam_hit: 452.95,        // Tên lửa SAM nổ diệt mục tiêu trên không
  ch5_shells_night: 452.84,   // "or an emergency stock of shells across the world in a single night"
  ch5_hold_line: 456.06,      // "to hold the line until the ships arrive."

  ch5_return_60t: 457.90,     // "So return to that 60-ton tank sitting inside a cabin that looks like a flying warehouse."
  ch5_strange_line: 463.52,   // "Every strange line on a military transport,"
  ch5_hi_wing: 466.08,        // "the wing on the roof,"
  ch5_hi_cheeks: 467.35,      // "the podded wheels in the cheeks,"
  ch5_hi_floor: 468.90,       // "the bridge beam floor,"
  ch5_hi_flaps: 470.20,       // "the blown flaps,"
  ch5_hi_ramp: 471.15,        // "and the ramp in the tail,"
  ch5_sever_link: 472.40,     // "exists to sever the link between heavy cargo and a civilized airport."
  ch5_airliner_cities: 476.38,// "An airliner connects cities that are ready to receive it."
  ch5_brings_airport: 479.16, // "A military transport brings the airport with it."
  ch5_end: 482.22,
} as const;
