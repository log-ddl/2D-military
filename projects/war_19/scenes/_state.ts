// scenes/_state.ts — Trạng thái tất định theo thời gian toàn phim t cho các vật xuyên cảnh.
import * as A from './shared/art';
import { CUE } from './_cue';

export interface Ch1State {
  // Shot 1.1 & 1.2 (sc01: 0.00 -> 33.24)
  containersAlpha: number;
  tankX: number;
  tankY: number;
  tankPitch: number;
  tankHiFootprint: number;
  floorCrush: number;
  isDirtStrip: number;
  dim5mAlpha: number;
  scissorAlpha: number;
  scissorCross: number;
}

export function ch1StateAt(t: number): Ch1State {
  // Thùng nhôm 100T hiện ngay từ khung 0.00s (Hook hoạt động ngay từ frame đầu) tới 9.12s rồi nhường chỗ cho xe tăng
  const containersAlpha = 1 - A.sm(t, CUE.ch1_drive_in - 0.4, CUE.ch1_drive_in + 0.5);

  // Trước 18.18s: xe tăng ở độ cao sàn khoang (-158) chạy từ trái vào giữa khoang rồi làm sập sàn
  // Sau 18.18s: chuyển sang đường băng dã chiến, xe tăng đứng dưới mặt đất (y = 0) nhìn sàn khoang cao 5m
  const toGround = A.sm(t, CUE.ch1_airstrip_shift, CUE.ch1_airstrip_shift + 1.1);
  const crush = A.sm(t, CUE.ch1_crush_floor, CUE.ch1_crush_snap + 0.6) * (1 - toGround);

  const tankXInCabin = A.lerp(-420, -20, A.eio(t, CUE.ch1_drive_in, CUE.ch1_crush_floor));
  const tankXGround = A.lerp(-480, -340, A.eo(t, CUE.ch1_airstrip_shift + 0.4, CUE.ch1_deck_5m));
  const tankX = A.lerp(tankXInCabin, tankXGround, toGround);

  const tankYInCabin = -158 + crush * 36;
  const tankY = A.lerp(tankYInCabin, 0, toGround);
  const tankPitch = crush * 0.16 * (1 - toGround);

  const tankHiFootprint = A.win(t, CUE.ch1_tank_60t, CUE.ch1_airstrip_shift, 0.4, 0.4);
  const dim5mAlpha = A.win(t, CUE.ch1_deck_5m, 33.1, 0.4, 0.3);
  const scissorAlpha = A.win(t, CUE.ch1_scissor_lift, 33.1, 0.4, 0.3);
  const scissorCross = A.sm(t, CUE.ch1_scissor_cross, CUE.ch1_scissor_cross + 0.6);

  return {
    containersAlpha,
    tankX,
    tankY,
    tankPitch,
    tankHiFootprint,
    floorCrush: crush,
    isDirtStrip: toGround,
    dim5mAlpha,
    scissorAlpha,
    scissorCross,
  };
}

export interface Ch2State {
  rampOpen: number;
  tankX: number;
  tankY: number;
  tankPitch: number;
}

export function ch2StateAt(t: number): Ch2State {
  const rampOpen = A.eio(t, CUE.ch2_ramp_open, CUE.ch2_ramp_open + 3.2);
  // Xe tăng đứng ở đường băng bên trái đuôi (-520, 0), rồi leo qua cầu dẫn (-395..-255) lên sàn khoang (-58)
  const climbP = A.eio(t, CUE.ch2_drive_ferry - 0.5, 142.4);
  const tankX = A.lerp(-510, -25, climbP);
  // Khi x đi qua đoạn cầu dẫn (-395..-255), y nâng từ 0 lên -58 và xe nghiêng nhẹ theo dốc cầu
  const onRamp = A.clamp01((tankX - (-410)) / 155);
  const tankY = A.lerp(0, -58, A.sm(onRamp, 0, 1));
  const inRampZone = tankX > -425 && tankX < -235 ? 1 : 0;
  const tankPitch = inRampZone ? -0.21 * Math.sin(onRamp * Math.PI) : 0;

  return { rampOpen, tankX, tankY, tankPitch };
}

export interface Ch3State {
  rollerFlip: number;
  palletSlide: number;
  seatUnfold: number;
  troopsSeated: number;
  c5Visor: number;
  c5Kneel: number;
  winchPull: number;
}

export function ch3StateAt(t: number): Ch3State {
  const rollerFlip = A.eio(t, CUE.ch3_flip_rollers - 0.3, CUE.ch3_flip_rollers + 1.6);
  const palletSlide = A.eio(t, CUE.ch3_flip_rollers + 1.2, 194.2);
  const seatUnfold = A.eio(t, 199.5, 205.5);
  const troopsSeated = A.eio(t, CUE.ch3_paratroopers - 0.3, 210.2);
  const c5Visor = A.eio(t, CUE.ch3_c5_visor + 1.2, 223.0);
  const c5Kneel = A.eio(t, CUE.ch3_c5_kneel - 0.4, 225.8);
  const winchPull = A.eio(t, CUE.ch3_dark_strip + 0.5, 244.8);

  return {
    rollerFlip,
    palletSlide,
    seatUnfold,
    troopsSeated,
    c5Visor,
    c5Kneel,
    winchPull,
  };
}

export interface Ch4State {
  civSink: number;
  podRoll: number;
  steepDrop: number;
  flapDeflect: number;
  touchdown: number;
  reverseBrake: number;
}

export function ch4StateAt(t: number): Ch4State {
  const civSink = A.eio(t, CUE.ch4_mil_mud_clay + 1.2, CUE.ch4_punch_crust + 1.5);
  const podRoll = A.ph(t, CUE.ch4_punch_crust, CUE.ch4_aero_violence);
  const steepDrop = A.eio(t, CUE.ch4_steep_elevator, 303.5);
  const flapDeflect = A.eio(t, CUE.ch4_blown_flaps, CUE.ch4_blown_flaps + 2.2);
  const touchdown = A.sm(t, CUE.ch4_smash_runway, CUE.ch4_smash_runway + 0.6);
  const reverseBrake = A.sm(t, CUE.ch4_spoilers_rev, CUE.ch4_spoilers_rev + 1.2);

  return {
    civSink,
    podRoll,
    steepDrop,
    flapDeflect,
    touchdown,
    reverseBrake,
  };
}

export interface Ch5State {
  c5Flight: number;
  c130Flight: number;
  c17Bridge: number;
  dorsalOpen: number;
  fuelTransfer: number;
  shipProgress: number;
  hiWing: number;
  hiCheeks: number;
  hiFloor: number;
  hiFlaps: number;
  hiRamp: number;
}

export function ch5StateAt(t: number): Ch5State {
  return {
    c5Flight: A.eio(t, CUE.ch5_strategic_c5, 389.5),
    c130Flight: A.eio(t, CUE.ch5_tactical_c130, 398.2),
    c17Bridge: A.eio(t, CUE.ch5_bridge_c17, 403.2),
    dorsalOpen: A.eio(t, CUE.ch5_bladder_tanks - 0.3, CUE.ch5_bladder_tanks + 0.8),
    fuelTransfer: A.ph(t, CUE.ch5_bladder_tanks + 0.5, CUE.ch5_fly_home),
    shipProgress: A.ph(t, CUE.ch5_cargo_ship - 0.5, CUE.ch5_fuel_fraction + 1.5),
    hiWing: A.sm(t, CUE.ch5_hi_wing - 0.15, CUE.ch5_hi_wing + 0.35),
    hiCheeks: A.sm(t, CUE.ch5_hi_cheeks - 0.15, CUE.ch5_hi_cheeks + 0.35),
    hiFloor: A.sm(t, CUE.ch5_hi_floor - 0.15, CUE.ch5_hi_floor + 0.35),
    hiFlaps: A.sm(t, CUE.ch5_hi_flaps - 0.15, CUE.ch5_hi_flaps + 0.35),
    hiRamp: A.sm(t, CUE.ch5_hi_ramp - 0.15, CUE.ch5_hi_ramp + 0.35),
  };
}

