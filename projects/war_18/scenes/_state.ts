// scenes/_state.ts — Trạng thái tất định theo thời gian t cho các vật xuyên cảnh/chương.

import * as A from './shared/art';
import { CUE } from './_cue';

export interface TrenchSoldierState {
  id: number;
  x: number;
  y: number;
  pose: 'stand' | 'run' | 'prone' | 'fallen';
  dir: 1 | -1;
}

// Trạng thái 9 người lính đối phương trong cụm mặt cắt chiến hào (sc01 -> sc02, 0.00 - 26.80s)
// Mặt đất tại groundY = 220; miệng chiến hào từ x = 260 đến x = 520, đáy hào ở y = 320.
export function trenchSoldiersAt(t: number): TrenchSoldierState[] {
  const gy = 220;
  const trenchFloorY = 320;
  // 6 lính đầu (id 0..5) đứng lộ bên trái (x từ -520 đến 60), trúng mảnh đạn trong 10s đầu (2/3 thương vong)
  const hitTimes = [1.4, 3.2, 5.1, 6.8, 8.3, 9.8];
  const baseXs = [-500, -400, -300, -190, -85, 25];
  const out: TrenchSoldierState[] = [];

  for (let i = 0; i < 6; i++) {
    const ht = hitTimes[i]!;
    const bx = baseXs[i]!;
    const runDist = A.clamp01((Math.min(t, ht) - 0.3) / ht) * 35;
    out.push({
      id: i,
      x: bx + runDist,
      y: gy,
      pose: t >= ht ? 'fallen' : t > 0.4 ? 'run' : 'stand',
      dir: 1,
    });
  }

  // 3 lính còn lại (id 6..8, tức 1/3 sống sót) kịp chạy tới chiến hào và nhảy xuống đáy hào lúc ~10.5 - 12.0s
  const survivorsInitX = [110, 165, 215];
  const survivorsTrenchX = [315, 390, 465];
  for (let j = 0; j < 3; j++) {
    const tDiveStart = 9.6 + j * 0.55;
    const tDiveEnd = tDiveStart + 1.4;
    const pRun = A.sm(t, 0.5, tDiveStart);
    const pDive = A.sm(t, tDiveStart, tDiveEnd);
    const x = A.lerp(survivorsInitX[j]!, survivorsTrenchX[j]!, Math.max(pRun * 0.65, pDive));
    const y = A.lerp(gy, trenchFloorY, pDive);
    out.push({
      id: 6 + j,
      x,
      y,
      pose: t >= tDiveEnd ? 'prone' : 'run',
      dir: 1,
    });
  }

  return out;
}

export function ch1TenSecProgress(t: number): number {
  return A.clamp01((t - CUE.ch1_start) / 11.62);
}
