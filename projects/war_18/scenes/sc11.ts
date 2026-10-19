// scenes/sc11.ts — Chương 3 (157.50 – 175.60s): Đánh đổi ống phóng hở lấy độ chính xác.
// Góc nhìn SIDE chia 2 tầng đối chiếu trực tiếp:
// - Tầng trên (162.3 – 169.1s): Đạn pháo nòng cháy hết thuốc trước khi rời đầu nòng -> vọt ra ở vận tốc cực đại và xoay tít.
// - Tầng dưới (169.3 – 175.6s): Tên lửa bò ra khỏi ống chậm hơn và tiếp tục đốt nhiên liệu suốt nhiều giây khi leo lên trời.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvCutaway,
  drawHowitzer,
  drawGrad,
  drawShell,
  drawRocket,
  drawCallout,
} from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam: K.Cam = K.track(
      t,
      [
        [157.5, { x: 0, y: 0, z: 1.25 }],
        [175.6, { x: 35, y: 0, z: 1.22 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    drawEnvCutaway(c, cam, 120);

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Đường phân đôi 2 tầng đối chiếu
    A.line(c, [[-820, 0], [820, 0]], P.ink, lw);

    // ── TẦNG TRÊN (y = -175): PHÁO NÒNG — THUỐC CHÁY HẾT TRONG NÒNG, RỜI ĐẦU NÒNG Ở TỐC ĐỘ TỐI ĐA & XOAY NHANH ──
    c.save();
    c.translate(-360, -175);
    c.scale(0.85, 0.85);
    const inBarrel = t < 163.8;
    drawHowitzer(c, {
      view: 'cutaway',
      chamberPressure: A.win(t, 162.2, 163.8, 0.15, 0.35),
      shellProg: inBarrel ? A.eo(t, 162.2, 163.8) : -1,
      recoil: A.win(t, 162.3, 164.6, 0.15, 1.0) * 0.5,
    });
    c.restore();

    // Khi viên đạn pháo vừa rời miệng nòng (t >= 163.8s): vọt cực nhanh, không còn lửa đẩy, xoay nhanh ổn định
    if (t >= 163.8) {
      const pShell = A.eo(t, 163.8, 168.5);
      const sx = A.lerp(-50, 520, pShell);
      // Vạch tốc độ cao phía sau đạn pháo
      A.line(c, [[-60, -175], [sx - 55, -175]], P.sky, lw, [12, 8]);
      drawShell(c, { x: sx, y: -175, scale: 1.25, showSpin: true });
    }

    // ── TẦNG DƯỚI (y = 175): TÊN LỬA — RỜI ỐNG CHẬM VÀ TIẾP TỤC ĐỐT NHIÊN LIỆU NHIỀU GIÂY KHI ĐANG BAY ──
    c.save();
    c.translate(-420, 195);
    c.rotate(-0.18);
    c.scale(0.95, 0.95);
    drawGrad(c, { view: 'cutaway' });
    c.restore();

    // Quả tên lửa rời ống chậm rãi từ 169.0s nhưng động cơ vẫn tiếp tục phụt lửa suốt quãng đường leo lên
    const pRocket = t < 169.0 ? 0.08 : A.sm(t, 169.0, 175.4);
    const rx = A.lerp(-420, 390, pRocket);
    const ry = A.lerp(195, 65, pRocket);

    if (t >= 169.0) {
      A.line(c, [[-420, 195], [rx - 90, ry + 16]], P.white, lwIn * 6.5);
      A.line(c, [[-420, 195], [rx - 90, ry + 16]], P.amber, lwIn * 2.0, [10, 6]);
    }

    c.save();
    c.translate(rx, ry);
    c.rotate(-0.18);
    c.scale(1.18, 1.18);
    drawRocket(c, {
      variant: '122mm',
      view: 'cutaway',
      fuelLeft: A.lerp(0.95, 0.35, pRocket),
      thrust: t >= 168.8 ? 1.0 : 0.3,
      finOpen: pRocket > 0.22 ? 1 : 0.1,
      highlight: 'motor',
    });
    c.restore();

    K.end(c);

    // Callout tầng trên: Đạn pháo rời nòng ở vận tốc tối đa & xoay nhanh
    const cShell = A.win(t, 164.0, 169.2, 0.35, 0.35);
    if (cShell > 0.01) {
      const ptS = K.toScreen(cam, 320, -175);
      drawCallout(c, ptS, [0, -90], 'TOP SPEED · FAST SPIN', cShell, P.sky);
    }

    // Callout tầng dưới: Tên lửa rời ống chậm & tiếp tục đốt nhiên liệu khi leo lên
    const cRocket = A.win(t, 169.6, 175.3, 0.35, 0.3);
    if (cRocket > 0.01) {
      const ptR = K.toScreen(cam, 120, 120);
      drawCallout(c, ptR, [0, 105], 'SLOW EXIT · KEEPS BURNING', cRocket, P.amber);
    }
  }
}
