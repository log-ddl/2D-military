// Mốc sự kiện chương C01 (0.00–183.90 s) — lấy đúng giây từng từ trong plan/chapters/C01.voice.md.
// Mọi khoá bắt buộc bắt đầu bằng `c01_`.

export const CUE = {
  // C01S01 (0.00–23.86 s) — Hook 3D: M1A2 73.6 tấn phóng 40 mph, 4 lính xóc nảy & hạ T-72 cách 2.5 dặm không chạm phanh
  c01_s01_start: 0.0, // Picture@0.00
  c01_s01_tons: 0.3, // 73@0.30 .6@0.94 tons@1.70
  c01_s01_f150: 3.58, // 30@3.58 Ford@3.94 F@4.34 -150@4.60
  c01_s01_tearing: 6.24, // tearing@6.24 across@6.46 open@6.88 desert@7.20
  c01_s01_40mph: 7.78, // 40@7.78 miles@8.16 per@8.40 hour.@8.64
  c01_s01_inside_cut: 9.32, // Inside,@9.32 four@10.22 soldiers@10.54
  c01_s01_tossed: 11.18, // tossed@11.18 around@11.46 a@11.76 cramped@11.94 steel@12.32 box.@12.64
  c01_s01_ridge_cut: 13.4, // cắt máy cứng sang góc tele sườn đồi xa ngay trước Two@13.64
  c01_s01_two_half_miles: 13.64, // Two@13.64 and@14.00 a@14.14 half@14.18 miles@14.34 away,@14.62
  c01_s01_t72_peeks: 15.98, // peeks@15.98 over@16.34 a@16.54 ridge.@16.68
  c01_s01_shot_streak: 17.64, // Three@17.64 seconds@17.80 later,@18.10
  c01_s01_t72_explode: 18.9, // vanishes@18.90
  c01_s01_sparks: 20.3, // molten@20.30 sparks.@20.64
  c01_s01_no_brakes: 21.62, // The@21.62 Abrams@21.98 never@22.38 even@22.68 touch@22.96 the@23.26 brakes.@23.46

  // C01S02 (23.86–39.60 s) — 3D: Quỹ đạo 3/4 ngoại thất khối thép M1A2 → nâng máy vào cửa sập nóc tháp ($15M)
  c01_s02_start: 23.86, // From@23.86 the@24.86 outside,@24.98
  c01_s02_m1a2: 26.24, // M1A2@26.24 Abrams@26.98
  c01_s02_brute_force: 27.94, // pure@27.94 brute@28.34 force,@28.72
  c01_s02_slab_cannon: 29.72, // massive@29.72 slab@30.14 of@30.46 metal@30.68 with@30.92 a@31.12 cannon@31.22
  c01_s02_climb_hatch: 32.4, // Climb@32.40 through@32.82 the@32.96 hatch,@33.10
  c01_s02_15m: 35.46, // $15@35.46 million@35.94 machine@36.38
  c01_s02_common_sense: 37.78, // common@37.78 sense@38.10

  // C01S03 (39.60–58.10 s) — 2D #1: Bản vẽ kỹ thuật X-quang ngang (AbramsSide2D xray) soi 4 nghịch lý bên trong
  c01_s03_start: 39.6,
  c01_s03_driver_flat: 40.38, // driver@40.38 lies@40.72 flat@41.06
  c01_s03_handlebars: 42.16, // motorcycle@42.16 handlebars.@42.74
  c01_s03_gunner_mirror: 44.12, // gunner@44.12 aims@44.50
  c01_s03_mirror_beam: 44.96, // mirror@44.96 instead@45.24 of@45.66 a@45.82 barrel.@45.92
  c01_s03_casing_burn: 46.98, // shell@46.98 casings@47.22 burn@47.64
  c01_s03_thin_air: 48.32, // thin@48.32 air.@48.58
  c01_s03_36_rounds: 49.52, // three@49.52 dozen@49.82 high@50.16 -explosive@50.46 rounds@51.02
  c01_s03_behind_heads: 51.58, // inches@51.58 behind@51.98 the@52.36 crew's@52.52 heads.@52.84
  c01_s03_blow_up: 54.4, // blow@54.40 up@54.60 at@54.74 once,@54.86
  c01_s03_drive_alive: 56.9, // drive@56.90 away@57.18 alive.@57.42

  // C01S04 (58.10–80.64 s) — 3D: Bắn tỉa trên ổ gà, pháo gắn cứng làm tâm ngắm nhảy loạn vs quán tính 5 tấn thép
  c01_s04_start: 58.1,
  c01_s04_impossible: 59.36, // impossible@59.36 trick.@60.00
  c01_s04_sniping: 60.68, // Sniping@60.68 a@61.22 moving@61.42 target@61.68
  c01_s04_two_miles: 62.36, // two@62.36 miles@62.64 away@62.96
  c01_s04_rough_ground: 64.32, // rough@64.32 ground.@64.62
  c01_s04_bolt_rigid: 65.48, // Bolt@65.48 a@65.84 cannon@66.02 rigidly@66.30
  c01_s04_bump_jump: 68.14, // bump@68.14 sends@68.46 your@68.70 crosshairs@68.88 jumping@69.38
  c01_s04_five_tons: 72.02, // five@72.02 tons@72.44 of@72.74 gun@72.98 steel@73.20
  c01_s04_inertia: 75.56, // losing@75.56 fight@75.88 against@76.30 inertia.@76.62
  c01_s04_flip_problem: 78.92, // flip@78.92 the@79.30 problem@79.46 upside@79.80 down.@80.22

  // C01S05 (80.64–95.30 s) — 3D LOOK_INTERIOR_BAY: Cắt bổ hộp GPS, con quay hồi chuyển 2 trục nghiêng gương bù chấn động
  c01_s05_start: 80.64, // Instead@80.64
  c01_s05_tiny_mirror: 83.9, // stabilized@83.90 a@84.34 tiny@84.72 mirror.@85.10
  c01_s05_gps_inside: 85.8, // Inside@85.80 the@86.46 gunner's@86.64 primary@86.96 sight,@87.36
  c01_s05_dual_gyro: 88.06, // dual@88.06 -axis@88.22 gyroscopes@88.60
  c01_s05_pitch_roll: 90.04, // pitch@90.04 and@90.36 roll@90.50
  c01_s05_counter_tilt: 92.68, // tilting@92.68 that@93.02 featherweight@93.20 mirror@93.66

  // C01S06 (95.30–107.60 s) — 3D LOOK_DESERT_GLARE: 147,000 lb thép sập hào rãnh bên dưới tầm ngắm nhiệt tĩnh xuyên khói bụi
  c01_s06_start: 95.3,
  c01_s06_147k_lbs: 95.9, // 147@95.90 ,000@97.08 pounds@97.72
  c01_s06_slam_ditch: 98.52, // slams@98.52 through@99.10 ditches@99.30 underneath,@99.68
  c01_s06_thermal_still: 101.08, // thermal@101.08 view@101.38 floats@101.66 dead@102.04 still,@102.36
  c01_s06_target_lock: 103.32, // locked@103.32 onto@103.46 targets@103.70
  c01_s06_smoke_dust: 105.16, // darkness,@105.16 smoke,@105.94 or@106.44 blowing@106.60 dust.@106.90

  // C01S07 (107.60–129.00 s) — 3D LOOK_DESERT_GLARE: Trưởng xe + kính tiềm vọng nhiệt 360° CITV & quy trình Hunter-Killer
  c01_s07_start: 107.6,
  c01_s07_commander: 110.2, // tank@110.20 commander@110.42
  c01_s07_360_scan: 111.6, // 360@111.60 -degree@112.38 thermal@112.76 periscope,@113.10
  c01_s07_citv: 114.14, // CITV.@114.14
  c01_s07_hunter_killer: 117.84, // Hunter@117.84 Killer.@118.20
  c01_s07_line_tank1: 119.56, // gunner@119.56 lines@119.82 up@120.10 tank@120.26 one,@120.50
  c01_s07_hunt_tank2: 121.26, // commander@121.26 already@121.66 hunts@122.20 tank@122.58 two.@122.84
  c01_s07_fire_tank1: 124.9, // fires,@124.90
  c01_s07_button_tap: 125.86, // button@125.86 tap@126.14
  c01_s07_whip_tank2: 126.44, // whips@126.44 the@126.80 gunner's@126.92 sight@127.30

  // C01S08 (129.00–139.00 s) — 3D LOOK_INTERIOR_BAY: Pháo thủ bóp tay cầm đôi Cadillacs bắn tia laser đo xa
  c01_s08_start: 129.0,
  c01_s08_blink: 130.36, // blink@130.36 before@130.64 the@130.96 gun@131.12 roars.@131.32
  c01_s08_grip_handles: 132.4, // Gripping@132.40 dual@132.82 handles@133.08
  c01_s08_cadillacs: 134.34, // Cadillacs,@134.34
  c01_s08_laser_fire: 135.72, // bounces@135.72 a@136.08 laser@136.28
  c01_s08_laser_return: 137.16, // hull@137.16
  c01_s08_yardage: 137.68, // exact@137.68 yardage.@138.12

  // C01S09 (139.00–155.60 s) — 2D #2: Sơ đồ máy tính đường đạn & cảm biến đầu nòng MRS đo độ võng nhiệt mặt trời
  c01_s09_start: 139.0,
  c01_s09_computer: 140.32, // computer@140.32 factors@140.64
  c01_s09_crosswind: 141.26, // crosswind,@141.26
  c01_s09_pressure: 142.06, // air@142.06 pressure,@142.30
  c01_s09_ammo_temp: 142.94, // ammo@142.94 temperature,@143.22
  c01_s09_track_tilt: 144.1, // track@144.10 tilt.@144.44
  c01_s09_barrel_tip: 146.0, // tiny@146.00 mirror@146.36 on@146.74 the@146.98 barrel@147.08 tip,@147.38
  c01_s09_mrs: 148.12, // muzzle@148.12 reference@148.42 sensor,@148.82
  c01_s09_hot_sun: 149.84, // hot@149.84 desert@150.14 sun@150.42
  c01_s09_top_expand: 152.02, // expands@152.02 the@152.52 top@152.82 metal@153.08
  c01_s09_barrel_droop: 153.8, // bend@153.80 the@154.04 barrel@154.20 slightly@154.46 downward.@154.96

  // C01S10 (155.60–183.90 s) — 3D LOOK_DESERT_GLARE: Sập hố bom trễ nòng, servo kéo pháo M256 120mm khép cổng Coincidence Firing
  c01_s10_start: 155.6,
  c01_s10_pull_trigger: 156.76, // pulls@156.76 the@157.04 trigger.@157.20
  c01_s10_wildest_secret: 158.84, // wildest@158.84 secret.@159.42
  c01_s10_hit_crater: 161.2, // hit@161.20 a@161.40 crater@161.50
  c01_s10_barrel_lags: 162.2, // barrel@162.20 lags@162.44
  c01_s10_refuses_fire: 165.32, // gun@165.32 refuses@165.54 to@166.10 fire.@166.34
  c01_s10_holds_pulse: 167.72, // holds@167.72 the@168.10 pulse@168.26
  c01_s10_servos_muscle: 168.9, // electrohydraulic@168.90 servos@169.88 muscle@170.36
  c01_s10_m256_align: 172.12, // M256@172.12 smoothbore@173.30 cannon@173.88 into@174.22 line.@174.54
  c01_s10_barrel_crosses: 177.26, // barrel@177.26 crosses@177.48 the@177.90 calculated@178.12 path,@178.58
  c01_s10_coincidence_gate: 180.02, // coincidence@180.02 firing,@180.46
  c01_s10_circuit_closes: 181.58, // circuit@181.58 closes@181.86
  c01_s10_auto_fire: 182.62, // fires@182.62 automatically.@183.02
  c01_end: 183.9,
} as const;
