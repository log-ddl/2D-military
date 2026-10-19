import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import {
  drawBgSkyGrid,
  drawAsymmetricRotorTop,
  drawAirfoilCutaway,
  drawHeli,
  drawFixedWingPlane,
  lw,
} from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const rotA = mainRotorAngleAt(t);

    // Chia 2 pha góc nhìn theo nội dung:
    // - Pha A (143.46 -> 159.95s): Góc TOP-DOWN + 2 khung Mặt cắt cánh lớn giải thích Sóng xung kích (cánh tiến) & Thất tốc (cánh lùi)
    // - Pha B (159.95 -> 170.86s): Góc FRONT (Chính diện) thấy trực thăng bị nghiêng mất cân bằng giữa 2 nửa đĩa rotor, bị máy bay chở khách vùng vượt qua
    if (t < CUE.ch2_past_speed_unbalanced) {
      const camTrack: [number, K.Cam][] = [
        [143.46, { x: 14, y: 0, z: 1.54 }],
        [149.20, { x: 115, y: 0, z: 1.44 }],
        [159.95, { x: 115, y: 0, z: 1.44 }],
      ];
      const cam = K.track(t, camTrack, A.eio);

      K.begin(c, cam);
      const lo = lw(c, LINE.outer);
      const li = lw(c, LINE.inner);

      const speedFactor = 1 + A.sm(t, CUE.ch2_aircraft_speeds_up - 0.3, CUE.ch2_blade_forward_sound + 1.0) * 1.4;
      const scrollX = -((t * 240 * speedFactor) % 120);
      drawBgSkyGrid(c, -1800 + scrollX, -1200, 3600, 2400, 120);

      const sonicP = A.sm(t, CUE.ch2_blade_forward_sound - 0.2, CUE.ch2_airflow_violent_drag);
      const stallP = A.sm(t, CUE.ch2_blade_backward_stall - 0.3, CUE.ch2_blade_backward_stall + 1.2);

      // Đĩa rotor TOP-DOWN
      drawAsymmetricRotorTop(c, {
        rotorAngle: rotA,
        advHighlight: 1,
        retHighlight: 1,
        sonicShock: sonicP,
        rootStall: stallP,
        showHeroBlade: true,
        forwardWindPhase: t * speedFactor,
      });

      // Khung 1 (Trên-Phải): Mặt cắt Cánh Tiến (Sóng xung kích Mach + Mũi tên Lực cản Drag tăng vọt)
      if (sonicP > 0.01) {
        A.withA(c, sonicP, () => {
          const bx = 395, by = -155;
          A.line(c, [[60, -238], [bx - 125, by]], P.amber, li, [8, 6]);
          A.rrect(c, bx - 125, by - 88, 250, 176, 12, P.paper, P.amber, lo);
          c.save();
          c.translate(bx, by + 10);
          drawAirfoilCutaway(c, { aoaRad: 0.14, mode: 'transonic', flowPhase: t * 2.4, scale: 0.58 });
          // Mũi tên Lực cản (Drag rises sharply) kéo ngược về sau (-x) màu đỏ gạch
          const dragP = A.sm(t, CUE.ch2_airflow_violent_drag - 0.2, CUE.ch2_airflow_violent_drag + 1.2);
          if (dragP > 0.01) {
            const dLen = 95 * dragP;
            A.capsule(c, [-20, -48], [-20 - dLen, -48], 8, P.enemy, P.ink, li);
            A.poly(c, [[-20 - dLen - 18, -48], [-20 - dLen, -60], [-20 - dLen, -36]], P.enemy, P.ink, li);
          }
          c.restore();
        });
      }

      // Khung 2 (Dưới-Phải): Mặt cắt Cánh Lùi (Dòng khí tách rời thành xoáy Stall + Mất lực nâng)
      if (stallP > 0.01) {
        A.withA(c, stallP, () => {
          const bx = 395, by = 155;
          A.line(c, [[40, 145], [bx - 125, by]], P.sky, li, [8, 6]);
          A.rrect(c, bx - 125, by - 88, 250, 176, 12, P.paper, P.sky, lo);
          c.save();
          c.translate(bx, by + 15);
          drawAirfoilCutaway(c, { aoaRad: 0.38, mode: 'stall', flowPhase: t * 0.4, scale: 0.58 });
          // Mũi tên lực nâng bị đứt sụp xuống
          A.line(c, [[0, -18], [0, -68]], P.slate, li, [6, 6]);
          A.line(c, [[-12, -52], [12, -32]], P.enemy, lw(c, 3.5));
          A.line(c, [[12, -52], [-12, -32]], P.enemy, lw(c, 3.5));
          c.restore();
        });
      }

      K.end(c);
      return;
    }

    // Pha B (159.95 -> 170.86s): Góc Chính diện (FRONT VIEW) thấy trực thăng mất cân bằng ngang + đối chiếu máy bay chở khách
    const cam: K.Cam = { x: 0, y: -20, z: 1.52 };
    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    drawBgSkyGrid(c, -1600, -1000, 3200, 2000, 110);

    // Máy bay chở khách vùng (regional airliner) lướt vọt qua tầng trên ở tốc độ cao (163.5 - 168.5s)
    const airlinerP = A.win(t, 163.4, 168.8, 0.4, 0.5);
    if (airlinerP > 0.01) {
      const prog = A.ph(t, 163.4, 168.8);
      const ax = A.lerp(-580, 580, prog);
      A.withA(c, airlinerP, () => {
        A.line(c, [[-580, -215], [ax - 130, -215]], P.sky, lw(c, 3.5), [16, 10]);
        c.save();
        c.translate(ax, -215);
        drawFixedWingPlane(c, 'side', 0.9, t * 24);
        c.restore();
      });
    }

    // Trực thăng nhìn chính diện (FRONT VIEW):
    // Nửa trái màn hình (x < 0) là Cánh Tiến (lực nâng vọt cao), nửa phải màn hình (x > 0) là Cánh Lùi (thất tốc sụp lực nâng)
    // -> cả máy bay bị lật nghiêng sang phải!
    const rollAngle = 0.24 + Math.sin(t * 6.5) * 0.06;
    c.save();
    c.translate(0, 75);
    c.rotate(rollAngle);
    c.scale(1.38, 1.38);

    drawHeli(c, {
      view: 'front',
      rotorAngle: rotA,
      discTilt: 0.45,
    });

    // Mũi tên Lực nâng lệch hẳn nhau ở hai bên đĩa rotor:
    // Bên trái (Cánh tiến): Mũi tên lực nâng cao vọt màu amber
    A.capsule(c, [-155, -98], [-155, -195], 10, P.amber, P.ink, li);
    A.poly(c, [[-155, -215], [-170, -188], [-140, -188]], P.amber, P.ink, lo);

    // Bên phải (Cánh lùi thất tốc): Mũi tên sụp xuống màu enemy/sky
    A.capsule(c, [155, -98], [155, -42], 10, P.enemy, P.ink, li);
    A.poly(c, [[155, -22], [140, -48], [170, -48]], P.enemy, P.ink, lo);

    // Ở câu kết "It is not engine power that stops them, it is the blades" (167.68 - 170.86s):
    // Hai bầu động cơ sáng ổn định, còn 2 cánh quạt nháy viền đỏ/amber nhấn mạnh giới hạn nằm ở cánh!
    const bladeLimP = A.sm(t, CUE.ch2_not_engine_power - 0.2, CUE.ch2_it_is_blades);
    if (bladeLimP > 0.01) {
      A.withA(c, bladeLimP, () => {
        A.rrect(c, -245, -122, 490, 32, 8, 'rgba(245, 158, 11, 0.28)', P.enemy, lw(c, 4));
      });
    }

    c.restore();
    K.end(c);
  }
}
