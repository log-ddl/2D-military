// scenes/_state.ts — Trạng thái liên tục của các vật xuyên phim (xe tăng, đạn, kíp lái, góc máy ranh giới)
// để bảo đảm tính nhất quán giữa các scene và các chương.
import * as A from './shared/art';
import { CUE } from './_cue';

export interface MainTankState {
  x: number;
  y: number;
  s: number;
  dir: 1 | -1;
  gunPitch: number;
  turretYaw: number;
  wheelPhase: number;
  hasERA: boolean;
  hasCage: boolean;
}

/** Trạng thái cơ bản của chiếc xe tăng nhân vật chính tại thời điểm t toàn phim */
export function mainTankAt(t: number): MainTankState {
  const hasERA = t >= CUE.ch2_reactive_armor;
  const hasCage = t >= CUE.ch5_cages_nets && t < CUE.ch5_return_box;
  return {
    x: 0,
    y: 160,
    s: 1.85,
    dir: 1,
    gunPitch: A.bump(t, CUE.ch1_computer, 6) * 0.08,
    turretYaw: 0,
    wheelPhase: t * 4.5,
    hasERA,
    hasCage,
  };
}
