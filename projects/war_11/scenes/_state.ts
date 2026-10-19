// scenes/_state.ts — Trạng thái tất định xuyên suốt phim theo thời gian toàn phim t.
import * as A from './shared/art';

/** Góc quay rotor chính liên tục theo thời gian toàn phim t (đảm bảo nối cảnh không bao giờ nhảy pha). */
export function mainRotorAngleAt(t: number): number {
  // Tốc độ góc dương (+da) để ở góc TOP-DOWN nửa trên (y < 0) tiến về phía mũi (+x)
  return t * 6.2;
}

/** Trạng thái trực thăng chủ đạo ở cuối mỗi cảnh để cảnh kế tiếp nối mượt. */
export interface HeroHeliState {
  x: number;
  y: number;
  pitchRad: number;
  rotorAngle: number;
}

export function ch1HeliStateAt(t: number): HeroHeliState {
  const rotorAngle = mainRotorAngleAt(t);
  // Trong sc02 (30.52 - 53.18):
  // - 30.52 -> 44.76: đậu tại bãi hẹp x = -380, y = 138 (trên mặt đất groundY = 220)
  // - 44.76 -> 46.80: cất cánh thẳng đứng lên y = -40
  // - 46.80 -> 48.40: đứng treo (hover) tại x = -380, y = -40
  // - 48.40 -> 51.40: lao nhanh sang phải tới x = 120 rồi ngửa mũi phanh đứng
  if (t < 44.76) {
    return { x: -380, y: 138, pitchRad: 0, rotorAngle };
  }
  if (t < 48.40) {
    const liftP = A.eio(t, 44.76, 46.70);
    const hoverBob = Math.sin((t - 46.7) * 3.2) * 3 * A.sm(t, 46.7, 47.2);
    return { x: -380, y: A.lerp(138, -40, liftP) + hoverBob, pitchRad: 0, rotorAngle };
  }
  if (t <= 53.18) {
    const dashP = A.eo(t, 48.40, 50.85);
    const x = A.lerp(-380, 120, dashP);
    // Chúc mũi khi tăng tốc (48.4-49.5), ngửa mũi phanh (49.6-51.0), rồi cân bằng (51.0-52.0)
    const flare =
      t < 49.5
        ? A.sm(t, 48.4, 49.2) * 0.14
        : -A.bump(t, 49.5, 1.65) * 0.24;
    return { x, y: -40, pitchRad: flare, rotorAngle };
  }
  // Sang sc03 (53.18 - 83.64): nối mượt từ vị trí cuối sc02 (x=120, y=-40) về tâm khung (x=0, y=45)
  const settleP = A.eio(t, 53.18, 54.60);
  const liftReaction = A.eio(t, 71.8, 74.8) * -28;
  return {
    x: A.lerp(120, 0, settleP),
    y: A.lerp(-40, 45, settleP) + liftReaction + Math.sin(t * 2.6) * 3 * settleP,
    pitchRad: 0,
    rotorAngle,
  };
}
