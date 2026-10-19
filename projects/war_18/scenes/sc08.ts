// scenes/sc08.ts — Chương 2 (102.36 – 124.48s): Tên lửa lộn ngược nguyên lý kỹ thuật đó.
// Góc nhìn CUTAWAY đối chiếu trực tiếp: thay vì để thuốc phóng trong súng, tên lửa mang động cơ
// nhiên liệu rắn trong thân và phụt khí nóng qua loa phụt ra đuôi ống phóng để hở cả 2 đầu ->
// gần như không có sức giật lên xe (0 RECOIL) và ống phóng không cần là bình chịu áp suất thép đúc.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvCutaway,
  drawHowitzer,
  drawGrad,
  drawRocket,
  drawArrow,
  drawCallout,
} from './_assets';

export function sc08CameraAt(t: number): K.Cam {
  return K.track(
    t,
    [
      [102.36, { x: 0, y: -25, z: 1.48 }],
      [114.0, { x: 0, y: 35, z: 1.62 }],
      [124.48, { x: 0, y: 65, z: 1.72 }],
    ],
    A.eio
  );
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam = sc08CameraAt(t);
    K.begin(c, cam);

    drawEnvCutaway(c, cam, 120);
    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Tầng trên (y = -155): Mặt cắt buồng đốt pháo nòng (mờ dần sau 114s khi tập trung hẳn vào ống phóng hở)
    const topAlpha = 1 - A.sm(t, 114.2, 116.5);
    A.withA(c, topAlpha, () => {
      c.save();
      c.translate(-20, -155);
      c.scale(0.95, 0.95);
      drawHowitzer(c, {
        view: 'cutaway',
        chamberPressure: 0.65,
        shellProg: 0.12,
        recoil: 0.45,
        highlight: 'breech',
      });
      c.restore();
    });

    // Tầng chính (y = 65): Mặt cắt ống phóng hở hai đầu + Quả tên lửa mang động cơ nhiên liệu rắn bên trong
    const hlRocket: 'motor' | 'nozzle' | null =
      t < 110.0 ? 'motor' : t < 114.5 ? 'nozzle' : null;
    const hlTube: 'tubes' | null = t >= 114.2 ? 'tubes' : null;

    // Quả tên lửa đốt nhiên liệu rắn tại chỗ (104.5 – 115.5s) để người xem nhìn rõ luồng khí thoát qua loa phụt,
    // sau đó trượt nhẹ dọc ống dẫn hướng (115.5 – 122.0s) rồi về vị trí chuẩn bị tại 124.48s để nối khớp với sc09!
    const thrust = A.sm(t, 105.0, 106.5) * A.lerp(1.0, 0.8, A.sm(t, 122.5, 124.48));
    const fuelLeft = A.lerp(1.0, 0.78, A.ph(t, 105.5, 124.48));
    const slideX = A.lerp(-35, 75, A.sm(t, 115.8, 120.5)) * (1 - A.sm(t, 122.0, 124.3));

    c.save();
    c.translate(0, 65);
    c.scale(1.42, 1.42);

    // Ống phóng hở hai đầu (Open Launch Tube)
    drawGrad(c, { view: 'cutaway', highlight: hlTube });

    // Quả tên lửa bên trong ống
    c.save();
    c.translate(slideX, 0);
    drawRocket(c, {
      variant: '122mm',
      view: 'cutaway',
      fuelLeft,
      thrust,
      finOpen: 0.1,
      highlight: hlRocket,
    });
    c.restore();

    // Mũi tên dòng khí phụt thoát tự do ra ngoài đuôi ống hở (110.0 – 124.4s)
    if (t >= 109.8) {
      const exhaustAlpha = A.sm(t, 109.8, 111.0);
      A.withA(c, exhaustAlpha, () => {
        drawArrow(c, [-135 + slideX, -12], [-275, -18], P.amber, lwIn * 1.2, 10);
        drawArrow(c, [-135 + slideX, 12], [-275, 18], P.amber, lwIn * 1.2, 10);
        // Mũi tên lực đẩy tên lửa tiến về phía trước
        drawArrow(c, [slideX + 120, 0], [slideX + 195, 0], P.sky, lw, 12);
      });
    }

    c.restore();

    K.end(c);

    // Callout 1: Động cơ nhiên liệu rắn & loa phụt nằm ngay trong thân đạn
    const cMotor = A.win(t, 105.4, 113.8, 0.35, 0.35);
    if (cMotor > 0.01) {
      const ptMotor = K.toScreen(cam, -30, 65);
      drawCallout(c, ptMotor, [0, 115], 'SOLID FUEL MOTOR + NOZZLE', cMotor, P.amber);
    }

    // Callout 2: Đuôi ống để hở -> Không có sức giật lên xe (0 RECOIL)
    const cOpen = A.win(t, 114.4, 124.1, 0.35, 0.35);
    if (cOpen > 0.01) {
      const ptRear = K.toScreen(cam, -310, 65);
      drawCallout(c, ptRear, [-20, -110], 'OPEN REAR · 0 RECOIL', cOpen, P.sky);
    }
  }
}
