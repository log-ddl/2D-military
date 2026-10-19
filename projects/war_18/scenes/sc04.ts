// scenes/sc04.ts — Chương 1 (38.78 – 46.74s): Góc nhìn TOP trên ô vuông 1 km² rừng.
// Loạt tên lửa Katyusha từ sc03 rơi phủ kín toàn bộ 1 km² rừng chỉ trong vài giây,
// biến rừng thành mảnh vụn trước khi bộ binh đối phương bên dưới kịp chạy vào chiến hào.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvTop,
  drawTrench,
  drawSoldier,
  drawRocket,
  drawExplosion,
  drawCallout,
} from './_assets';

const FOREST_BOX = { x: -380, y: -340, w: 760, h: 680 };

// 24 điểm nổ rải khắp ô vuông 1 km² rừng trong khoảng 39.6s – 45.4s
export const FOREST_IMPACTS: [number, number, number][] = Array.from({ length: 24 }, (_, i) => {
  const row = Math.floor(i / 6);
  const col = i % 6;
  const tHit = 39.65 + i * 0.22;
  const ix = FOREST_BOX.x + 75 + col * 122 + (A.rnd(i * 11 + 3) - 0.5) * 48;
  const iy = FOREST_BOX.y + 75 + row * 172 + (A.rnd(i * 17 + 7) - 0.5) * 48;
  return [tHit, ix, iy];
});

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const baseCam: K.Cam = K.track(
      t,
      [
        [38.78, { x: 0, y: 0, z: 1.18 }],
        [46.74, { x: 20, y: 0, z: 1.12 }],
      ],
      A.eio
    );
    const hits: [number, number, number?][] = FOREST_IMPACTS.map(([t0]) => [t0, 7, 0.3]);
    const cam = K.withShake(baseCam, t, hits);

    K.begin(c, cam);

    // Bản đồ TOP có ô vuông 1 km² rừng ở chính giữa
    drawEnvTop(c, cam, { gridStep: 190, forestBox: FOREST_BOX });

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Khung viền đánh dấu diện tích 1 km × 1 km
    A.rrect(c, FOREST_BOX.x, FOREST_BOX.y, FOREST_BOX.w, FOREST_BOX.h, 8, null, P.amber, lw * 1.1);

    // Đường chiến hào chữ Z ở rìa phải khu rừng (nơi lính chưa kịp chạy tới)
    drawTrench(c, FOREST_BOX.x + FOREST_BOX.w - 65, -120, 140, 80, 'top');
    drawTrench(c, FOREST_BOX.x + FOREST_BOX.w - 65, 130, 140, 80, 'top');

    // 14 người lính đối phương đang đứng lộ giữa khu rừng, cố chạy về phía hào bên phải nhưng bị loạt đạn trùm lên trước
    for (let s = 0; s < 14; s++) {
      const r = Math.floor(s / 4);
      const col = s % 4;
      const sx0 = -250 + col * 135 + (A.rnd(s * 5 + 1) - 0.5) * 35;
      const sy0 = -210 + r * 140 + (A.rnd(s * 9 + 2) - 0.5) * 35;
      const hitT = 39.9 + s * 0.32;
      const runP = A.clamp01((Math.min(t, hitT) - 38.78) / 2.2);
      const sx = sx0 + runP * 32;
      c.save();
      c.translate(sx, sy0);
      drawSoldier(c, {
        view: 'top',
        faction: 'enemy',
        pose: t >= hitT ? 'fallen' : 'run',
      });
      c.restore();
    }

    // Các quả đạn Katyusha lao từ góc trái vào ô 1 km² và nổ đồng loạt, văng mảnh gỗ khắp khu rừng
    for (let i = 0; i < FOREST_IMPACTS.length; i++) {
      const [tHit, ix, iy] = FOREST_IMPACTS[i]!;
      const flightP = (t - (tHit - 0.55)) / 0.55;
      if (flightP > 0 && flightP < 1) {
        const rx = A.lerp(ix - 360, ix, flightP);
        const ry = A.lerp(iy + 160, iy, flightP);
        A.line(c, [[rx - 55, ry + 24], [rx, ry]], P.white, lwIn * 2.5);
        c.save();
        c.translate(rx, ry);
        c.rotate(-0.42);
        c.scale(0.42, 0.42);
        drawRocket(c, { variant: '122mm', view: 'top', thrust: 0.6 });
        c.restore();
      }

      if (t >= tHit) {
        // Hố nổ + thân cây gãy đổ hình tia quanh mỗi tâm nổ
        A.circle(c, ix, iy, 28, P.dark, P.ink, lwIn);
        for (let k = 0; k < 4; k++) {
          const ang = k * 1.57 + (i % 3) * 0.4;
          A.line(
            c,
            [
              [ix + Math.cos(ang) * 14, iy + Math.sin(ang) * 14],
              [ix + Math.cos(ang) * 34, iy + Math.sin(ang) * 34],
            ],
            P.sand,
            lwIn * 1.4
          );
        }
      }

      const blastP = (t - tHit) / 0.95;
      if (blastP > 0 && blastP < 1) {
        drawExplosion(c, ix, iy, blastP, 74, 8);
      }
    }

    K.end(c);

    // Callout "1 km²" neo vào khung vuông khu rừng
    const callAlpha = A.win(t, 39.2, 46.2, 0.4, 0.4);
    if (callAlpha > 0.01) {
      const ptCorner = K.toScreen(baseCam, FOREST_BOX.x + FOREST_BOX.w, FOREST_BOX.y);
      drawCallout(c, ptCorner, [85, 35], '1 km²', callAlpha, P.amber);
    }
  }
}
