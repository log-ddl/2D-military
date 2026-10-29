// Mốc giây tuyệt đối từ voice_map.md — dùng chung cho video/scenes/* và khớp 1:1 với audio/sound.json + audio/music.json.
export const CUE = {
  // S01 (0.00 - 28.00): Runway showdown F-35A vs F-15EX
  s01_f35Name: 1.42,
  s01_f15Name: 4.96,
  s01_question: 9.90,
  s01_f35Bay: 15.10,
  s01_f15Reveal: 21.12,
  s01_y1972: 26.62,

  // S02 (28.00 - 42.15): Radar cross-section 100-200 sq ft semi-truck
  s02_openWind: 29.50,
  s02_radarSweep: 34.54,
  s02_rcsSpike: 37.22,
  s02_truckGhost: 39.50,

  // S03 (42.15 - 75.76): Pentagon flyaway price & 120 -> 267 fleet doubling
  s03_guessCost: 42.36,
  s03_f35Price: 48.82,
  s03_lot7: 54.72,
  s03_f15Price: 59.38,
  s03_fleet120: 66.34,
  s03_fleet267: 73.94,

  // S04 (75.76 - 96.76): Peel off the gray skin X-Ray anatomy
  s04_over100m: 77.06,
  s04_peelStart: 81.80,
  s04_supercomp: 85.50,
  s04_forcefield: 87.50,
  s04_wingtip: 89.24,
  s04_firepower: 91.52,

  // S05 (96.76 - 127.00): Nov 2, 2007 Missouri 18,000 ft 7.8G F-15C midair breakup
  s05_missouri: 101.96,
  s05_bankTurn: 109.00,
  s05_gLoad: 112.72,
  s05_crackSnap: 115.00,
  s05_breakApart: 118.00,
  s05_eject: 122.20,

  // S06 (127.00 - 150.16): Forensic longeron fatigue crack & 4,000-8,000 hr redline
  s06_longeronZoom: 129.50,
  s06_thinWall: 133.50,
  s06_snap: 138.20,
  s06_grounded: 140.40,
  s06_hoursRedline: 147.08,

  // S07 (150.16 - 177.14): Saudi & Qatar $5B St. Louis F-15SA / F-15QA funding lineage
  s07_saudiQatar: 156.42,
  s07_fundFlow: 158.32,
  s07_exportModels: 163.68,
  s07_usafInherit: 169.40,
  s07_paidFor: 174.22,

  // S08 (177.14 - 206.98): 3D determinant assembly & 20,000-hour airframe into 2060s
  s08_skeletonReveal: 180.34,
  s08_cncRibs: 185.20,
  s08_lockJoin: 191.50,
  s08_f35Hours: 198.50,
  s08_f15Hours: 202.28,
  s08_y2060s: 205.98,

  // S09 (206.98 - 236.00): 1983 Israeli F-15D single-wing 260-knot landing
  s09_liftingBody: 211.00,
  s09_wingLost: 218.00,
  s09_afterburner: 225.00,
  s09_touchdown: 229.52,
  s09_stopBarrier: 233.94,

  // S10 (236.00 - 285.15): Stations 1 & 9 wingtip aeroelastic flutter trap
  s10_dormantUnlock: 242.50,
  s10_sta19Spot: 255.38,
  s10_flutterStart: 264.60,
  s10_cablesLag: 274.00,
  s10_sealed50yr: 281.44,

  // S11 (285.15 - 303.62): Quad-redundant digital fly-by-wire kills flutter
  s11_fbwSwitch: 286.24,
  s11_quadVote: 292.00,
  s11_flutterKill: 298.80,

  // S12 (303.62 - 327.80): Eglin Gulf of Mexico live test firing Stations 1 & 9
  s12_eglinGulf: 306.78,
  s12_fireSta1: 312.90,
  s12_fireSta9: 316.00,
  s12_load12: 323.94,
  s12_vsF35Triple: 325.72,

  // S13 (327.80 - 364.75): 23 stations / 22 missiles + Vulcan vs 12-ft stealth bay prison
  s13_stations23: 328.82,
  s13_amber22: 336.22,
  s13_vulcanBurst: 341.00,
  s13_centerBelly: 349.40,
  s13_bayPrison: 358.58,
  s13_stealthBreak: 361.50,

  // S14 (364.75 - 400.25): 29,500-lb payload, 22-ft 7,000-lb hypersonic & 81,000-lb MTOW
  s14_recordPayload: 366.56,
  s14_centerlineMount: 373.00,
  s14_centerline22ft: 377.26,
  s14_noFitStealth: 384.86,
  s14_fuelFill: 391.84,
  s14_mtow81k: 398.54,

  // S15 (400.25 - 440.10): Twin GE F110-GE-129 58,000+ lb thrust & 90° Viking takeoff
  s15_tailpipes: 406.20,
  s15_abIgnite: 413.50,
  s15_thrust58k: 418.90,
  s15_twRatio: 422.00,
  s15_vikingPull: 433.00,
  s15_alt30k: 437.98,

  // S16 (440.10 - 458.50): 45,000 ft Mach 2.5 outpacing F-35A (1.6) & F-22 (2.25)
  s16_mach25: 443.76,
  s16_f35Mach16: 449.42,
  s16_f22Mach225: 452.16,
  s16_vsMach4: 457.38,

  // S17 (458.50 - 490.75): 50,000 ft reusable first-stage rocket slingshot & 150-mile radar spot
  s17_boosterDrop: 461.50,
  s17_slingshot: 467.20,
  s17_whipTurn: 474.50,
  s17_radarSpot150: 482.38,

  // S18 (490.75 - 534.60): AN/APG-82(V)1 AESA -> ADCP II 87B IPS -> EPAWSS suite
  s18_blindThem: 492.00,
  s18_apg82: 498.02,
  s18_multiBeam: 504.20,
  s18_fiberOptic: 512.80,
  s18_adcp87b: 517.78,
  s18_epawssDome: 528.84,

  // S19 (534.60 - 567.65): Co-site RF frequency windows & phantom targets vs unbroken lock
  s19_selfBlind: 538.84,
  s19_freqSlice: 548.50,
  s19_epawssBlast: 555.52,
  s19_phantomFlood: 559.22,
  s19_unbrokenLock: 564.26,

  // S20 (567.65 - 583.45): 12 AN/ALE-47 dispensers (360 chaff & flares) & canopy crane
  s20_flareStart: 569.80,
  s20_flareSalvo: 573.34,
  s20_canopyCrane: 579.00,

  // S21 (583.45 - 628.88): 10x19" HD touchscreen, JHMCS II, empty back seat & OMS apps
  s21_ladScreen: 585.36,
  s21_hudSeat: 590.32,
  s21_jhmcsLock: 594.56,
  s21_emptyBackseat: 600.30,
  s21_portland142: 611.24,
  s21_whyEmpty: 618.78,
  s21_omsApps: 623.64,

  // S22 (628.88 - 649.10): Pacific Kadena 36 F-15EX & forward F-35A stealth penetration
  s22_pacificMap: 630.02,
  s22_kadenaPin: 634.02,
  s22_f35SlipIn: 641.70,
  s22_passiveSpot: 645.80,

  // S23 (649.10 - 677.60): 60 miles back WSO standoff salvo & Loyal Wingman CCA quarterback
  s23_f15Prowl: 649.50,
  s23_datalink: 656.00,
  s23_salvoLaunch: 661.00,
  s23_ccaForward: 668.62,
  s23_droneDrawFire: 673.50,

  // S24 (677.60 - 722.45): 104-0 record & Vulnerability #1: missing CFTs vs draggy drop tanks
  s24_record104: 679.98,
  s24_threeVuln: 684.60,
  s24_cftShow: 692.00,
  s24_cft1500gal: 695.00,
  s24_cftStrip: 705.50,
  s24_dropTankPenalty: 714.00,

  // S25 (722.45 - 736.45): Vulnerability #2: GAO Lot 1B misdrilled windscreen & 2025 strike
  s25_misdrill: 726.06,
  s25_lot1b: 728.52,
  s25_strikeDelay: 733.16,

  // S26 (736.45 - 758.45): Vulnerability #3: AESA + IIR + Home-on-Jam SAM close ambush
  s26_samLaunch: 741.50,
  s26_homeOnJam: 746.50,
  s26_ambushClose: 751.44,
  s26_ambushBlast: 755.00,

  // S27 (758.45 - 771.60): Scalpel vs Sledgehammer — stealth unlocks the door
  s27_scalpel: 763.60,
  s27_sledgehammer: 766.20,
  s27_unlockDoor: 769.00,

  // S28 (771.60 - 788.04): Mach 2.5 sledgehammer finale tears the building down
  s28_thunderIn: 773.92,
  s28_wingtips87b: 778.34,
  s28_furyRelease: 781.20,
  s28_buildingDown: 784.20,
} as const;
