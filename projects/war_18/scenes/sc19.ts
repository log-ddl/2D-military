// scenes/sc19.ts — Chương 4 (335.00 – 352.10s): GMLRS thay đổi hoàn toàn vai trò của pháo phản lực.
// - Nhịp 1 (335.00 – 345.80s, góc TOP bản đồ có thang cự ly): Thay vì phải bắn 12 quả không điều khiển
//   để hy vọng trúng 1 mục tiêu ở 40 km, 1 quả đạn dẫn đường từ HIMARS bay vượt 70 km trúng thẳng mục tiêu.
// - Nhịp 2 (345.80 – 352.10s, góc SIDE chia 3 ô mục tiêu): Đặt đầu đạn 90 kg cách vài mét vào đúng
//   1 trụ cầu (bridge pier), 1 xe radar (radar van), hoặc 1 hầm đạn (ammunition bunker).

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvTop,
  drawGrad,
  drawHimars,
  drawRocket,
  drawTargetSet,
  drawExplosion,
  drawCallout,
} from './_assets';

const SWITCH_TARGETS_T = 345.8;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_TARGETS_T) {
      // ── NHỊP 1 (335.00 – 345.80s): TOP BẢN ĐỒ SO SÁNH 12 QUẢ (40 KM) VS 1 QUẢ GMLRS (> 70 KM) ──
      const cam: K.Cam = { x: 0, y: 0, z: 1.15 };
      K.begin(c, cam);
      drawEnvTop(c, cam, { gridStep: 170 });

      const lw = A.px(c, LINE.outer);
      const lwIn = A.px(c, LINE.inner);

      // Hai vạch mốc cự ly: 40 km (x = 40) và 70 km (x = 580)
      A.line(c, [[40, -420], [40, 420]], P.slate, lwIn, [10, 8]);
      A.line(c, [[580, -420], [580, 420]], P.sky, lw, [12, 8]);

      // Hàng trên (y = -175): Bệ phóng cổ điển bắn 12 quả đạn không điều khiển tới mốc 40 km (tản mát quanh mục tiêu)
      c.save();
      c.translate(-620, -175);
      c.scale(0.85, 0.85);
      drawGrad(c, { view: 'top' });
      c.restore();

      A.circle(c, 40, -175, 16, P.enemy, P.ink, lw);
      const unguidedP = A.sm(t, 335.5, 339.8);
      for (let i = 0; i < 12; i++) {
        const up = A.clamp01((unguidedP * 12 - i) / 2.0);
        if (up <= 0) continue;
        const ang = i * 2.1 + 0.3;
        const rad = 28 + (i % 3) * 32;
        const tx = 40 + Math.cos(ang) * rad;
        const ty = -175 + Math.sin(ang) * rad * 0.72;
        const curX = A.lerp(-520, tx, up);
        const curY = A.lerp(-175, ty, up);
        A.line(c, [[-520, -175], [curX, curY]], P.amber, lwIn, [6, 5]);
        if (up >= 0.98) {
          A.circle(c, tx, ty, 10, P.amber, P.ink, lwIn);
        }
      }

      // Hàng dưới (y = 165): M142 HIMARS bắn duy nhất 1 quả GMLRS vượt mốc 70 km cắm trúng tâm mục tiêu!
      c.save();
      c.translate(-620, 165);
      c.scale(0.88, 0.88);
      drawHimars(c, { view: 'top' });
      c.restore();

      A.circle(c, 580, 165, 22, null, P.sky, lw);
      A.circle(c, 580, 165, 12, P.enemy, P.ink, lw);

      const gmlrsP = A.sm(t, 340.6, 344.2);
      if (gmlrsP > 0) {
        const gx = A.lerp(-510, 580, gmlrsP);
        A.line(c, [[-510, 165], [gx, 165]], P.sky, lw * 1.3);
        if (gmlrsP < 1) {
          c.save();
          c.translate(gx, 165);
          c.scale(0.65, 0.65);
          drawRocket(c, { variant: '227mm', view: 'top', thrust: 1 });
          c.restore();
        } else {
          drawExplosion(c, 580, 165, A.clamp01((t - 344.2) / 1.1), 65, 8);
        }
      }

      K.end(c);

      const c40 = A.win(t, 335.6, 345.5, 0.35, 0.3);
      if (c40 > 0.01) {
        const pt40 = K.toScreen(cam, 40, -255);
        drawCallout(c, pt40, [0, -55], '12 UNGUIDED · 40 km', c40, P.amber);
      }

      const c70 = A.win(t, 340.8, 345.5, 0.35, 0.3);
      if (c70 > 0.01) {
        const pt70 = K.toScreen(cam, 580, 140);
        drawCallout(c, pt70, [-60, -85], '1 GUIDED · > 70 km', c70, P.sky);
      }
      return;
    }

    // ── NHỊP 2 (345.80 – 352.10s): 3 Ô MỤC TIÊU ĐIỂM (TRỤ CẦU, XE RADAR, HẦM ĐẠN) BỊ ĐẦU ĐẠN 90 KG ĐÁNH TRÚNG ──
    const cam: K.Cam = { x: 0, y: 0, z: 1.18 };
    const hits: [number, number, number?][] = [
      [348.2, 8, 0.35],
      [349.6, 8, 0.35],
      [351.0, 8, 0.35],
    ];
    const sCam = K.withShake(cam, t, hits);

    K.begin(c, sCam);
    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    const panels: { x: number; kind: 'bridge_pier' | 'radar_van' | 'bunker'; hitT: number }[] = [
      { x: -490, kind: 'bridge_pier', hitT: 348.2 },
      { x: 0, kind: 'radar_van', hitT: 349.6 },
      { x: 490, kind: 'bunker', hitT: 351.0 },
    ];

    for (const p of panels) {
      A.rrect(c, p.x - 215, -240, 430, 480, 12, P.paper, P.ink, lw);
      // Mặt đất/nước trong từng ô
      A.rrect(c, p.x - 213, 90, 426, 148, 6, p.kind === 'bridge_pier' ? P.glass : P.bg2, null, 0);
      A.line(c, [[p.x - 213, 90], [p.x + 213, 90]], P.ink, lw);

      c.save();
      c.translate(p.x, 90);
      c.scale(1.65, 1.65);
      drawTargetSet(c, p.kind, t >= p.hitT ? 1 : 0);
      c.restore();

      // Vòng tâm ngắm chính xác vài mét
      A.circle(c, p.x, 45, 36, null, P.sky, lwIn);

      // Quả đạn GMLRS 90kg bổ nhào từ trên cao xuống đúng tâm mục tiêu
      const fp = (t - (p.hitT - 0.55)) / 0.55;
      if (fp > 0 && fp < 1) {
        const rx = A.lerp(p.x - 80, p.x, fp);
        const ry = A.lerp(-190, 45, fp);
        A.line(c, [[p.x - 80, -190], [rx, ry]], P.sky, lwIn * 1.5);
        c.save();
        c.translate(rx, ry);
        c.rotate(1.22);
        c.scale(0.68, 0.68);
        drawRocket(c, { variant: '227mm', view: 'side', thrust: 0.4 });
        c.restore();
      }

      const bp = (t - p.hitT) / 1.0;
      if (bp > 0 && bp < 1) {
        drawExplosion(c, p.x, 45, bp, 92, 10);
      }
    }

    K.end(c);

    const c90 = A.win(t, 346.2, 351.8, 0.35, 0.3);
    if (c90 > 0.01) {
      const ptMid = K.toScreen(cam, 0, -240);
      drawCallout(c, ptMid, [0, -55], '90 kg WARHEAD · METER ACCURACY', c90, P.amber);
    }
  }
}
