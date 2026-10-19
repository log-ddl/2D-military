// scenes/_state.ts — Trạng thái tất định xuyên các chương của war_14
import * as A from './shared/art';
import { CUE } from './_cue';
import type { ViewAngle } from './_assets';

export interface FilmState {
  // Máy bay tàng hình kim cương chính (F-117)
  stealthX: number;
  stealthY: number;
  stealthScale: number;
  stealthView: ViewAngle;
  stealthDir: 1 | -1;
  stealthRot: number;
  fanPhase: number;
  // Đài radar đối phương chính
  radarX: number;
  radarY: number;
  radarDishAngle: number;
}

/**
 * Hàm trả về trạng thái gốc của các vật xuyên phim tại thời điểm t (giây toàn phim),
 * bảo đảm điểm cuối chương N khớp trạng thái đầu chương N+1.
 */
export function stateAt(t: number): FilmState {
  const fanPhase = t * 5.2;

  // Cuối Chương 1 (t ≈ 80.64): F-117 ở (-120, -80), radar ở (560, 260)
  // Đầu Chương 2 (t = 80.64): Chuyển sang góc nhìn từ trên xuống ('top') tại tâm khung
  if (t < CUE.ch2_start) {
    return {
      stealthX: -120,
      stealthY: -80 + Math.sin(t * 1.4) * 6,
      stealthScale: 1.35,
      stealthView: 'side',
      stealthDir: 1,
      stealthRot: 0,
      fanPhase,
      radarX: 560,
      radarY: 260,
      radarDishAngle: -0.42,
    };
  }

  if (t < CUE.ch3_start) {
    return {
      stealthX: 0,
      stealthY: -30,
      stealthScale: 1.45,
      stealthView: t < CUE.weapons_inside ? 'top' : 'cutaway',
      stealthDir: 1,
      stealthRot: 0,
      fanPhase,
      radarX: 560,
      radarY: 260,
      radarDishAngle: -0.45,
    };
  }

  if (t < CUE.ch4_start) {
    return {
      stealthX: -140,
      stealthY: -90,
      stealthScale: 1.35,
      stealthView: 'side',
      stealthDir: 1,
      stealthRot: 0,
      fanPhase,
      radarX: 540,
      radarY: 260,
      radarDishAngle: -0.48,
    };
  }

  if (t < CUE.ch5_start) {
    return {
      stealthX: A.lerp(-420, 420, A.ph(t, CUE.ch4_start, CUE.ch4_end)),
      stealthY: -80,
      stealthScale: 1.15,
      stealthView: t < CUE.falls_to_third ? 'side' : 'top',
      stealthDir: 1,
      stealthRot: 0,
      fanPhase,
      radarX: 520,
      radarY: 260,
      radarDishAngle: -0.45,
    };
  }

  return {
    stealthX: -80,
    stealthY: -70 + Math.sin(t * 1.5) * 6,
    stealthScale: 1.4,
    stealthView: 'side',
    stealthDir: 1,
    stealthRot: 0,
    fanPhase,
    radarX: 560,
    radarY: 260,
    radarDishAngle: -0.45,
  };
}
