// scenes/sc05.ts — Chương 1 (46.74 – 68.08s): Đặt câu hỏi trung tâm của toàn phim.
// - Nhịp 1 (46.74 – 58.55s, góc SIDE): So với đạn pháo nòng nhỏ gọn, tên lửa đắt, cồng kềnh và để lại
//   vệt khói trắng trên bầu trời chỉ thẳng ngược về vị trí xe phóng cho đối phương phát hiện.
// - Nhịp 2 (58.55 – 68.08s, góc TOP): Tại sao mọi quân đội vẫn giữ pháo phản lực cạnh pháo nòng,
//   và làm sao vũ khí từng chỉ biết rải thảm cả ô lưới lại biến thành súng bắn tỉa tầm xa?

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawEnvTop,
  drawHowitzer,
  drawGrad,
  drawHimars,
  drawShell,
  drawRocket,
  drawTargetSet,
  drawExplosion,
  drawArrow,
} from './_assets';

const GROUND_Y = 235;
const SWITCH_T = 58.55;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_T) {
      const cam: K.Cam = K.track(
        t,
        [
          [46.74, { x: -360, y: 65, z: 1.48 }],
          [51.4, { x: -340, y: 65, z: 1.45 }],
          [54.2, { x: -20, y: 65, z: 1.18 }],
          [58.55, { x: 0, y: 65, z: 1.18 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-720, -180] });

      const lw = A.px(c, LINE.outer);
      const lwIn = A.px(c, LINE.inner);

      c.save();
      c.translate(-560, GROUND_Y);
      c.scale(1.02, 1.02);
      drawGrad(c, { view: 'side', elevateDeg: 25, jacksDown: 1, shuttersDown: 1 });
      c.restore();

      c.save();
      c.translate(-260, GROUND_Y);
      c.scale(0.86, 0.86);
      drawHowitzer(c, { view: 'side', elevateDeg: 18 });
      c.restore();

      // Khung phóng to đối chiếu trực tiếp: Viên đạn pháo gọn vs Quả tên lửa dài cồng kềnh (46.8 – 54.5s)
      const cmpAlpha = A.win(t, 46.8, 54.6, 0.35, 0.4);
      A.withA(c, cmpAlpha, () => {
        A.rrect(c, -610, -255, 520, 195, 10, P.paper, P.ink, lw);
        drawShell(c, { x: -480, y: -200, scale: 1.2 });
        c.save();
        c.translate(-340, -118);
        c.scale(1.5, 1.5);
        drawRocket(c, { variant: '122mm', view: 'side', finOpen: 1 });
        c.restore();
      });

      // Đài radar/quan sát địch bên phải (x = 560)
      c.save();
      c.translate(560, GROUND_Y);
      c.scale(1.15, 1.15);
      drawTargetSet(c, 'radar_van');
      c.restore();

      const launchP = A.sm(t, 52.6, 55.8);
      if (launchP > 0) {
        const p0: A.Pt = [-500, GROUND_Y - 125];
        const pCtrl: A.Pt = [-20, GROUND_Y - 430];
        const pEnd: A.Pt = [340, GROUND_Y - 230];

        c.save();
        c.strokeStyle = P.white;
        c.lineWidth = A.px(c, 24);
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(p0[0], p0[1]);
        const steps = 24;
        const maxStep = Math.ceil(steps * launchP);
        for (let s = 1; s <= maxStep; s++) {
          const u = Math.min(launchP, s / steps);
          const qx = (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * pCtrl[0] + u * u * pEnd[0];
          const qy = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * pCtrl[1] + u * u * pEnd[1];
          c.lineTo(qx, qy);
        }
        c.stroke();
        c.strokeStyle = P.slate;
        c.lineWidth = lwIn;
        c.setLineDash([8, 6]);
        c.stroke();
        c.setLineDash([]);
        c.restore();

        const u = launchP;
        const rx = (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * pCtrl[0] + u * u * pEnd[0];
        const ry = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * pCtrl[1] + u * u * pEnd[1];
        const dx = 2 * (1 - u) * (pCtrl[0] - p0[0]) + 2 * u * (pEnd[0] - pCtrl[0]);
        const dy = 2 * (1 - u) * (pCtrl[1] - p0[1]) + 2 * u * (pEnd[1] - pCtrl[1]);
        c.save();
        c.translate(rx, ry);
        c.rotate(Math.atan2(dy, dx));
        c.scale(0.82, 0.82);
        drawRocket(c, { variant: '122mm', view: 'side', thrust: u < 0.95 ? 1 : 0.3, finOpen: 1 });
        c.restore();

        const traceBackP = A.sm(t, 55.4, 57.6);
        if (traceBackP > 0) {
          const tx = A.lerp(200, p0[0] + 20, traceBackP);
          const ty = A.lerp(GROUND_Y - 235, p0[1] - 10, traceBackP);
          A.line(c, [[560, GROUND_Y - 72], [200, GROUND_Y - 235]], P.enemy, lw, [10, 8]);
          drawArrow(c, [200, GROUND_Y - 235], [tx, ty], P.enemy, lw * 1.35, 18);
          if (traceBackP > 0.85) {
            A.circle(c, -560, GROUND_Y - 70, 105, null, P.enemy, lw * 1.25);
          }
        }
      }

      K.end(c);
      return;
    }

    // ── NHỊP 2 (58.55 – 68.08s): GÓC TOP — RẢI THẢM CẢ Ô LƯỚI VS BẮN TỈA TẦM XA CHÍNH XÁC ──
    const camTop: K.Cam = { x: 0, y: 0, z: 1.15 };
    K.begin(c, camTop);

    drawEnvTop(c, camTop, { gridStep: 180 });
    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    A.line(c, [[0, -480], [0, 480]], P.ink, lw * 1.2);

    c.save();
    c.translate(-660, -130);
    c.scale(0.88, 0.88);
    drawHowitzer(c, { view: 'top' });
    c.restore();

    c.save();
    c.translate(-660, 130);
    c.scale(0.92, 0.92);
    drawGrad(c, { view: 'top' });
    c.restore();

    const gridBox = { x: -410, y: -190, w: 340, h: 340 };
    A.rrect(c, gridBox.x, gridBox.y, gridBox.w, gridBox.h, 6, P.enemyLight, P.enemy, lw);
    const areaP = A.sm(t, 59.0, 63.2);
    for (let i = 0; i < 16; i++) {
      const appear = A.clamp01((areaP * 16 - i) / 1.5);
      if (appear <= 0) continue;
      const gx = gridBox.x + 42 + (i % 4) * 85 + (A.rnd(i + 2) - 0.5) * 28;
      const gy = gridBox.y + 42 + Math.floor(i / 4) * 85 + (A.rnd(i + 9) - 0.5) * 28;
      A.circle(c, gx, gy, 26 * appear, P.amber, P.ink, lwIn);
    }

    const sniperShow = A.sm(t, 62.6, 63.6);
    A.withA(c, sniperShow, () => {
      c.save();
      c.translate(175, 250);
      c.rotate(-0.62);
      c.scale(0.92, 0.92);
      drawHimars(c, { view: 'top' });
      c.restore();

      const tx = 630, ty = -195;
      c.save();
      c.translate(tx, ty);
      c.scale(1.15, 1.15);
      drawTargetSet(c, 'room_building', t > 66.4 ? 1 : 0);
      c.restore();
      const px = tx + 57, py = ty - 31;
      A.circle(c, px, py, 38, null, P.sky, lw);
      A.line(c, [[px - 52, py], [px + 52, py]], P.sky, lwIn);
      A.line(c, [[px, py - 52], [px, py + 52]], P.sky, lwIn);

      const sFlight = A.sm(t, 63.7, 66.4);
      if (sFlight > 0) {
        const sx0 = 215, sy0 = 220;
        const curX = A.lerp(sx0, px, sFlight);
        const curY = A.lerp(sy0, py, sFlight);
        A.line(c, [[sx0, sy0], [curX, curY]], P.sky, lw * 1.15);
        if (sFlight < 1) {
          c.save();
          c.translate(curX, curY);
          c.rotate(Math.atan2(py - sy0, px - sx0));
          c.scale(0.62, 0.62);
          drawRocket(c, { variant: '227mm', view: 'top', thrust: 1 });
          c.restore();
        }
      }
      const hitBlast = (t - 66.4) / 1.1;
      if (hitBlast > 0 && hitBlast < 1) {
        drawExplosion(c, px, py, hitBlast, 62, 8);
      }
    });

    K.end(c);
  }
}
