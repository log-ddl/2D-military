// scenes/sc18.ts — Chương 4 (302.60 – 335.00s): Điện tử đảo ngược bài toán độ chính xác.
// - Nhịp 1 (302.60 – 318.36s, CUTAWAY 2 tầng): Tên lửa rộng hơn đạn pháo rất nhiều và tăng tốc êm ái
//   thay vì bị búa bổ bởi một vụ nổ dữ dội trong khóa nòng -> dễ dàng đặt vi mạch điện tử nhạy cảm vào mũi.
// - Nhịp 2 (318.36 – 335.00s, CUTAWAY cận chóp mũi đạn 227mm GMLRS): Khối dẫn đường quán tính (IMU) kết hợp
//   bộ thu định vị vệ tinh (GPS) và 4 cánh lái nhỏ (canards) ở chóp mũi.

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

const SWITCH_NOSE_T = 318.36;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_NOSE_T) {
      // ── NHỊP 1 (302.60 – 318.36s): ĐẠN PHÁO BỊ NỔ BÚA BỔ TRONG KHÓA NÒNG VS TÊN LỬA RỘNG & TĂNG TỐC ÊM ──
      const cam: K.Cam = { x: 0, y: 0, z: 1.25 };
      K.begin(c, cam);
      drawEnvCutaway(c, cam, 120);

      const lw = A.px(c, LINE.outer);
      const lwIn = A.px(c, LINE.inner);

      A.line(c, [[-820, 0], [820, 0]], P.ink, lw);

      // Tầng trên (y = -175): Đạn pháo nòng hẹp bị cú nổ dữ dội trong khóa nòng giáng búa bổ (15,000+ G)
      const shockWave = A.win(t, 312.5, 317.8, 0.2, 0.5);
      c.save();
      c.translate(-120, -175);
      c.scale(1.05, 1.05);
      drawHowitzer(c, {
        view: 'cutaway',
        chamberPressure: shockWave > 0.1 ? 0.95 : 0.4,
        shellProg: A.lerp(0.05, 0.35, A.sm(t, 312.8, 315.5)),
        highlight: 'breech',
      });
      c.restore();

      // Vòng xung chấn đỏ búa bổ vào mũi đạn pháo
      if (shockWave > 0.05) {
        A.withA(c, shockWave, () => {
          for (const r of [32, 54, 76]) {
            A.circle(c, -125, -175, r, null, P.enemy, lw);
          }
        });
      }

      // Tầng dưới (y = 165): Tên lửa 227mm rộng rãi và tăng tốc êm ái dọc ống phóng
      const gentleSlide = A.sm(t, 309.0, 317.5) * 180;
      c.save();
      c.translate(-120, 165);
      c.scale(1.38, 1.38);
      drawGrad(c, { view: 'cutaway' });
      c.save();
      c.translate(gentleSlide, 0);
      drawRocket(c, {
        variant: '227mm',
        view: 'cutaway',
        fuelLeft: 0.85,
        thrust: 0.75,
        finOpen: 0.2,
        highlight: 'guidance',
      });
      c.restore();
      c.restore();

      // Mũi tên tăng tốc êm màu sky phía trước tên lửa
      drawArrow(c, [180 + gentleSlide, 165], [295 + gentleSlide, 165], P.sky, lw * 1.2, 14);

      K.end(c);

      const cShock = A.win(t, 312.0, 318.1, 0.3, 0.3);
      if (cShock > 0.01) {
        const ptB = K.toScreen(cam, -120, -245);
        drawCallout(c, ptB, [0, -55], 'VIOLENT BREECH EXPLOSION', cShock, P.enemy);
      }

      const cGentle = A.win(t, 308.6, 318.1, 0.35, 0.3);
      if (cGentle > 0.01) {
        const ptR = K.toScreen(cam, 40, 235);
        drawCallout(c, ptR, [0, 75], 'WIDER BODY · GENTLE THRUST', cGentle, P.sky);
      }
      return;
    }

    // ── NHỊP 2 (318.36 – 335.00s): CUTAWAY PHÓNG LỚN MŨI ĐẠN 227 MM GMLRS (IMU + GPS + 4 CANARDS) ──
    const cam: K.Cam = K.track(
      t,
      [
        [318.36, { x: 40, y: 0, z: 1.55 }],
        [321.0, { x: 95, y: -15, z: 1.95 }],
        [335.0, { x: 95, y: -15, z: 1.95 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    drawEnvCutaway(c, cam, 100);

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Góc bẻ cánh lái canard ở chóp mũi khi nhận tín hiệu vệ tinh (từ 326.5s)
    const canardDeg = t < 326.2 ? 0 : Math.sin((t - 326.2) * 3.2) * 22;
    const hlPart: 'guidance' | 'canards' = t < 326.5 ? 'guidance' : 'canards';

    // Vẽ quả đạn 227mm GMLRS ở tỷ lệ lớn để đọc rõ từng khoang trong mũi đạn
    c.save();
    c.translate(0, 35);
    c.scale(2.15, 2.15);
    drawRocket(c, {
      variant: '227mm',
      view: 'cutaway',
      fuelLeft: 0.72,
      thrust: 0.85,
      finOpen: 1,
      canardDeg,
      warheadType: 'gmlrs',
      highlight: hlPart,
    });
    c.restore();

    // Biểu tượng Vệ tinh định vị (Satellite Navigation) ở góc trên-phải phát sóng xuống bộ thu GPS ở mũi đạn (từ 324.2s)
    const satAlpha = A.sm(t, 324.0, 325.2);
    A.withA(c, satAlpha, () => {
      const sx = 250, sy = -195;
      c.save();
      c.translate(sx, sy);
      c.rotate(0.35);
      // Hai cánh pin mặt trời + thân vệ tinh
      A.rrect(c, -62, -10, 42, 20, 2, P.sky, P.ink, lw);
      A.rrect(c, 20, -10, 42, 20, 2, P.sky, P.ink, lw);
      A.rrect(c, -16, -16, 32, 32, 4, P.slate, P.ink, lw);
      c.restore();

      // Các vòng sóng tín hiệu vệ tinh truyền thẳng vào khoang thu GPS ở mũi đạn (x = 188, y = 35)
      A.line(c, [[sx - 10, sy + 24], [188, 22]], P.sky, lwIn, [8, 6]);
      for (const r of [24, 42, 60]) {
        c.beginPath();
        c.arc(sx - 6, sy + 18, r, 1.4, 2.5);
        c.strokeStyle = P.sky;
        c.lineWidth = lwIn;
        c.stroke();
      }
    });

    K.end(c);

    // Callout 1: Khối quán tính IMU + Thu vệ tinh GPS
    const cImu = A.win(t, 320.5, 334.6, 0.35, 0.3);
    if (cImu > 0.01) {
      const ptImu = K.toScreen(cam, 155, 58);
      drawCallout(c, ptImu, [-60, 125], 'IMU + SATELLITE GPS', cImu, P.sky);
    }

    // Callout 2: 4 cánh lái nhỏ ở mũi (4 Steering Canards)
    const cCanard = A.win(t, 326.5, 334.6, 0.35, 0.3);
    if (cCanard > 0.01) {
      const ptCan = K.toScreen(cam, 205, 8);
      drawCallout(c, ptCan, [85, -110], '4 STEERING CANARDS', cCanard, P.amber);
    }
  }
}
