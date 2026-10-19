import * as A from './shared/art';
import { CUE } from './_cue';

export interface Ch1State {
  // Vị trí và trạng thái của quả tên lửa hành trình (SIDE ở sc01, TOP ở sc02)
  missileX: number;
  missileY: number;
  missileAngle: number;
  finDeflect: number;
  gpsState: 'ok' | 'jammed' | 'spoofed' | 'active';
  cutawayAlpha: number;
  jammerPower: number; // 0..1
  hissShow: number;    // 0..1
  patternLock: number; // 0..1
}

export function ch1StateAt(t: number): Ch1State {
  // Trong sc01 (0..26.86s), tên lửa bay ngang, sau khi bị hộp cơm gây nhiễu (18.48s+) thì lệch góc bay
  const driftP = A.sm(t, CUE.c1_stops_knowing - 1.2, CUE.c1_question);
  const missileX = A.lerp(-180, 140, A.ph(t, 0, CUE.c1_question));
  const missileY = A.lerp(40, -55, driftP);
  const missileAngle = A.lerp(0, -0.22, driftP);
  const finDeflect = A.lerp(0, 1, A.sm(t, CUE.c1_no_bang, CUE.c1_stops_knowing));

  const jammerPower = A.sm(t, CUE.c1_send_noise - 0.4, CUE.c1_drown_km + 0.6);
  const gpsState: Ch1State['gpsState'] = jammerPower > 0.45 ? 'jammed' : 'ok';
  const cutawayAlpha = A.sm(t, CUE.c1_receiver_pick - 0.5, CUE.c1_receiver_pick + 0.6);
  const hissShow = A.sm(t, CUE.c1_reaches_ground - 0.3, CUE.c1_weaker_hiss);
  const patternLock =
    A.sm(t, CUE.c1_receiver_pick, CUE.c1_pattern_look) *
    (1 - A.sm(t, CUE.c1_send_noise, CUE.c1_drown_km));

  return {
    missileX,
    missileY,
    missileAngle,
    finDeflect,
    gpsState,
    cutawayAlpha,
    jammerPower,
    hissShow,
    patternLock,
  };
}

// Tọa độ các nút cố định trên bản đồ chiến thuật TOP (dùng chung cuối Ch.1 -> đầu Ch.2)
export const TOP_MAP_NODES = {
  hq: [-540, 180] as A.Pt,
  listener: [-480, -190] as A.Pt,
  strikeJetStart: [-520, -40] as A.Pt,
  samSite: [520, 60] as A.Pt,
  searchRadar: [480, -220] as A.Pt,
  enemyRadio: [260, 220] as A.Pt,
  targetDepot: [560, -180] as A.Pt,
};

// Vị trí tiêm kích và đài SAM góc SIDE dùng chung cho sc04, sc05, sc06 -> đầu Ch.3 (sc07)
export const SIDE_AIR_NODES = {
  jetBase: [-360, -60] as A.Pt,
  samBase: [560, 320] as A.Pt,
};
