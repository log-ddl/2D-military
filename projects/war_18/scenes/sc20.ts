// scenes/sc20.ts — Chương 4 (352.10 – 377.36s): Hoán đổi hộp Pod sang tên lửa đạn đạo chiến thuật ATACMS
// tầm 300 km, và nghịch lý tiến hóa: vũ khí sinh ra vì quá vụng về không bắn trúng nổi 1 tòa nhà,
// kết thúc lại trở thành công cụ bắn trúng 1 căn phòng cụ thể từ cự ly 80 km.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvCutaway,
  drawEnvTop,
  drawPod,
  drawHimars,
  drawRocket,
  drawTargetSet,
  drawExplosion,
  drawCallout,
} from './_assets';

const SWITCH_IRONY_T = 367.8;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_IRONY_T) {
      // ── NHỊP 1 (352.10 – 367.80s): HỘP POD 6×227 MM HOÁN ĐỔI SANG HỘP ATACMS TẦM BẮN 300 KM ──
      const cam: K.Cam = { x: 0, y: 0, z: 1.24 };
      K.begin(c, cam);
      drawEnvCutaway(c, cam, 120);

      const lw = A.px(c, LINE.outer);
      const lwIn = A.px(c, LINE.inner);

      // Tầng trên (y = -115): Bên trái là Pod 6×227mm, Bên phải là Pod 1×ATACMS nhìn ngoài giống hệt nhưng
      // mở mặt cắt lộ 1 quả tên lửa đạn đạo chiến thuật khổng lồ bên trong!
      c.save();
      c.translate(-340, -115);
      c.scale(1.65, 1.65);
      drawPod(c, { view: 'front', variant: '6x227', rocketsLeft: 6 });
      c.restore();

      const swapP = A.sm(t, 357.2, 359.2);
      c.save();
      c.translate(160, -115);
      c.scale(1.75, 1.75);
      if (swapP < 0.5) {
        drawPod(c, { view: 'side', variant: '1xAtacms' });
      } else {
        drawPod(c, { view: 'cutaway', variant: '1xAtacms', rocketsLeft: 1, highlight: true });
      }
      c.restore();

      c.save();
      c.translate(455, -115);
      c.scale(1.65, 1.65);
      drawPod(c, { view: 'front', variant: '1xAtacms', rocketsLeft: 1 });
      c.restore();

      // Tầng dưới (y = 240): Đường cong đạn đạo chiến thuật của ATACMS vươn xa tới mốc 300 km (361.8 – 367.6s)
      A.line(c, [[-640, 260], [640, 260]], P.ink, lw);
      c.save();
      c.translate(-540, 260);
      c.scale(0.55, 0.55);
      drawHimars(c, { view: 'side', elevateDeg: 38, podVariant: '1xAtacms' });
      c.restore();

      // Vạch mốc 70 km (GMLRS) và 300 km (ATACMS)
      A.circle(c, -210, 260, 8, P.slate, P.ink, lwIn);
      A.circle(c, 540, 260, 14, P.enemy, P.ink, lw);

      const arcP = A.sm(t, 361.8, 366.4);
      if (arcP > 0) {
        c.save();
        c.strokeStyle = P.amber;
        c.lineWidth = lw * 1.3;
        c.beginPath();
        c.moveTo(-510, 210);
        const steps = 28;
        const maxS = Math.ceil(steps * arcP);
        for (let s = 1; s <= maxS; s++) {
          const u = (s / steps) * arcP;
          const ax = A.lerp(-510, 540, u);
          const ay = A.lerp(210, 260, u) - Math.sin(u * Math.PI) * 235;
          c.lineTo(ax, ay);
        }
        c.stroke();
        c.restore();

        if (arcP >= 0.98) {
          drawExplosion(c, 540, 255, A.clamp01((t - 366.3) / 1.1), 78, 10);
        }
      }

      K.end(c);

      const cAtacms = A.win(t, 358.2, 367.5, 0.35, 0.3);
      if (cAtacms > 0.01) {
        const ptA = K.toScreen(cam, 160, -195);
        drawCallout(c, ptA, [0, -55], '1 × ATACMS · 300 km RANGE', cAtacms, P.amber);
      }
      return;
    }

    // ── NHỊP 2 (367.80 – 377.36s): TOP ĐỐI CHIẾU NGHỊCH LÝ LỊCH SỬ — BẮN TRƯỢT TÒA NHÀ VS BẮN TRÚNG 1 CĂN PHÒNG TỪ 80 KM ──
    const camTop: K.Cam = { x: 0, y: 0, z: 1.18 };
    K.begin(c, camTop);
    drawEnvTop(c, camTop, { gridStep: 180 });

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    A.line(c, [[0, -480], [0, 480]], P.ink, lw * 1.2);

    // NỬA TRÁI (368.1 – 373.0s): "Too clumsy to hit a single building" — Tòa nhà ở (-340, 0), đạn rơi trượt xung quanh
    c.save();
    c.translate(-340, 0);
    c.scale(1.65, 1.65);
    drawTargetSet(c, 'room_building', 0);
    c.restore();

    const missPoints: A.Pt[] = [
      [-550, -180],
      [-150, -165],
      [-520, 175],
      [-135, 160],
      [-340, -220],
      [-340, 215],
    ];
    for (let i = 0; i < missPoints.length; i++) {
      const mt = 368.6 + i * 0.45;
      if (t < mt) continue;
      const [mx, my] = missPoints[i]!;
      A.circle(c, mx, my, 20, P.dark, P.ink, lwIn);
      const bp = (t - mt) / 0.8;
      if (bp > 0 && bp < 1) {
        drawExplosion(c, mx, my, bp, 52, 6);
      }
    }

    // NỬA PHẢI (372.8 – 377.36s): "Hit a specific room from 80 km away" — Tòa nhà ở (340, 0),
    // 1 quả đạn dẫn đường lao từ góc dưới-trái xuyên trúng chính xác căn phòng góc phải-trên!
    const roomHitT = 375.4;
    c.save();
    c.translate(340, 0);
    c.scale(1.95, 1.95);
    drawTargetSet(c, 'room_building', t >= roomHitT ? 1 : 0);
    c.restore();

    // Tâm của căn phòng góc phải-trên trong tòa nhà bên phải
    const rxTarget = 340 + 50 * 1.95;
    const ryTarget = 0 - 27 * 1.95;
    A.circle(c, rxTarget, ryTarget, 42, null, P.sky, lw);

    const flightP = A.sm(t, 373.0, roomHitT);
    if (flightP > 0) {
      const x0 = 60, y0 = 320;
      const cx = A.lerp(x0, rxTarget, flightP);
      const cy = A.lerp(y0, ryTarget, flightP);
      A.line(c, [[x0, y0], [cx, cy]], P.sky, lw * 1.3);
      if (flightP < 1) {
        c.save();
        c.translate(cx, cy);
        c.rotate(Math.atan2(ryTarget - y0, rxTarget - x0));
        c.scale(0.75, 0.75);
        drawRocket(c, { variant: '227mm', view: 'top', thrust: 1 });
        c.restore();
      } else {
        drawExplosion(c, rxTarget, ryTarget, A.clamp01((t - roomHitT) / 1.1), 68, 8);
      }
    }

    K.end(c);

    const cRoom = A.win(t, 373.2, 377.2, 0.35, 0.25);
    if (cRoom > 0.01) {
      const ptRoom = K.toScreen(camTop, rxTarget, ryTarget - 45);
      drawCallout(c, ptRoom, [0, -65], '80 km → 1 SPECIFIC ROOM', cRoom, P.sky);
    }
  }
}
