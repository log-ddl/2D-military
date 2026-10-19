import * as A from './shared/art';
import { CUE } from './_cue';

// Trạng thái dùng chung xuyên các cảnh (tất định theo t giây toàn phim)
export interface WorldState {
  t: number;
  halePos: A.Pt;
  haleScale: number;
  haleWingStretch: number;
  quadPos: A.Pt;
  rotorPhase: number;
}

export function worldAt(t: number): WorldState {
  const rotorPhase = t * 28;
  // Cuối Chương 1 (t = 46..47), chiếc drone ở tâm kéo dài cánh thành HALE tại (0, -20)
  const haleWingStretch = t < CUE.ch1_stayingPower ? 1 : A.lerp(0.65, 1.0, A.sm(t, CUE.ch1_stayingPower, CUE.ch1_end));
  return {
    t,
    halePos: [0, -20],
    haleScale: 1.35,
    haleWingStretch,
    quadPos: [420, 230],
    rotorPhase,
  };
}
