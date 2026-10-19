// scenes/sc12.ts — Chương 3 (175.60 – 194.60s): Tại sao tên lửa đang tăng tốc lại tự lái lệch vào gió (Weathercocking),
// cộng thêm khối lượng giảm từng mili-giây và nhiệt độ thuốc phóng làm điểm rơi tản mát.
// - Nhịp 1 (175.60 – 186.60s, góc TOP nhìn thẳng xuống mặt phẳng đường bay): Gió ngang đẩy cánh đuôi sang bên
//   làm mũi tên lửa chúc ngược vào hướng gió trong khi động cơ ở đuôi vẫn đang phụt đẩy -> tự lái chệch đường ngắm!
// - Nhịp 2 (186.60 – 194.60s, góc CUTAWAY + SIDE): Nhiên liệu cháy cạn làm đạn nhẹ dần từng mili-giây &
//   chênh lệch nhỏ về nhiệt độ thuốc phóng tạo ra các quỹ đạo rơi lệch xa nhau.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvTop,
  drawEnvCutaway,
  drawRocket,
  drawArrow,
  drawCallout,
} from './_assets';

const SWITCH_FUEL_T = 186.6;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_FUEL_T) {
      // ── NHỊP 1 (175.60 – 186.60s): GÓC TOP — GIÓ NGANG ĐẨY ĐUÔI LÀM MŨI CHÚC VÀO GIÓ (WEATHERCOCKING) ──
      const cam: K.Cam = { x: 0, y: 20, z: 1.28 };
      K.begin(c, cam);
      drawEnvTop(c, cam, { gridStep: 160 });

      const lw = A.px(c, LINE.outer);
      const lwIn = A.px(c, LINE.inner);

      // Đường ngắm chuẩn ban đầu (Intended Course) nằm ngang ở y = -90
      A.line(c, [[-580, -90], [580, -90]], P.slate, lw, [14, 10]);

      // Các mũi tên gió ngang (Crosswind) thổi từ dưới lên trên (y = 260 -> y = -40) đập vào cánh đuôi
      const windAlpha = A.sm(t, 175.8, 177.0);
      A.withA(c, windAlpha, () => {
        for (const wx of [-320, -140, 40, 220]) {
          const shift = ((t * 95) % 120) - 60;
          drawArrow(c, [wx, 250 - shift * 0.5], [wx, 10 - shift * 0.5], P.sky, lw, 14);
        }
      });

      // Diễn biến khí động học của quả tên lửa:
      // 175.6 – 178.5s: Bay dọc đường ngắm chuẩn; gió ngang đẩy phần cánh đuôi lên trên (-y)
      // 178.5 – 182.5s: Đuôi bị đẩy lên trên làm mũi xoay chúc xuống dưới (+y, ngược vào hướng gió!)
      // 182.5 – 186.6s: Vì động cơ vẫn đang phụt đẩy mạnh, tên lửa tự lái lao chệch hẳn xuống dưới (y = +165)
      const prog = A.sm(t, 176.0, 185.8);
      const tiltIntoWind = A.sm(t, 178.2, 181.8) * 0.42; // Xoay mũi chúc xuống vào hướng gió
      const driftDown = A.ei(t, 179.5, 185.8) * 255;

      const rx = A.lerp(-420, 360, prog);
      const ry = -90 + driftDown;

      // Vẽ đường quỹ đạo thực tế bị lệch khỏi đường ngắm chuẩn
      c.save();
      c.strokeStyle = P.amber;
      c.lineWidth = lw * 1.2;
      c.beginPath();
      c.moveTo(-420, -90);
      const steps = 24;
      for (let s = 1; s <= steps; s++) {
        const u = (s / steps) * prog;
        const ts = A.lerp(176.0, 185.8, u);
        const sx = A.lerp(-420, 360, u);
        const sy = -90 + A.ei(ts, 179.5, 185.8) * 255;
        c.lineTo(sx, sy);
      }
      c.stroke();
      c.restore();

      // Vẽ quả tên lửa lớn để thấy rõ lực gió đẩy đuôi và mũi chúc vào gió
      c.save();
      c.translate(rx, ry);
      c.rotate(tiltIntoWind);
      c.scale(1.55, 1.55);
      drawRocket(c, {
        variant: '122mm',
        view: 'top',
        thrust: 1.0,
        finOpen: 1,
        highlight: t < 181.0 ? 'fins' : 'motor',
      });
      // Mũi tên chỉ lực gió đẩy ngang vào cánh đuôi (làm đuôi dạt lên trên)
      if (t >= 177.2 && t <= 183.5) {
        drawArrow(c, [-95, 58], [-95, 18], P.sky, lwIn * 1.3, 9);
      }
      c.restore();

      K.end(c);

      const cWind = A.win(t, 176.4, 186.2, 0.35, 0.3);
      if (cWind > 0.01) {
        const ptTail = K.toScreen(cam, rx - 110, ry);
        drawCallout(c, ptTail, [-80, -125], 'TAIL BLOWN → NOSE INTO WIND', cWind, P.sky);
      }
      return;
    }

    // ── NHỊP 2 (186.60 – 194.60s): CUTAWAY NHIÊN LIỆU CHÁY VƠI TỪNG MILI-GIÂY & 3 QUỸ ĐẠO RƠI LỆCH NHAU ──
    const cam: K.Cam = { x: 0, y: 0, z: 1.25 };
    K.begin(c, cam);
    drawEnvCutaway(c, cam, 120);

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Nửa trên (y = -135): Mặt cắt lớn quả tên lửa với khối nhiên liệu rắn cháy cạn dần làm giảm trọng lượng
    const burnP = A.ph(t, 186.8, 193.8);
    const fuelLeft = A.lerp(0.95, 0.08, burnP);

    c.save();
    c.translate(0, -135);
    c.scale(1.85, 1.85);
    drawRocket(c, {
      variant: '122mm',
      view: 'cutaway',
      fuelLeft,
      thrust: fuelLeft > 0.12 ? 1.0 : 0.2,
      finOpen: 1,
      highlight: 'motor',
    });
    c.restore();

    // Nửa dưới (y = 240): Mặt đất & 3 quỹ đạo rơi lệch xa nhau chỉ vì chênh lệch nhỏ về nhiệt độ thuốc phóng
    A.line(c, [[-680, 240], [680, 240]], P.ink, lw);
    const arcP = A.sm(t, 189.2, 194.0);
    const landingXs = [180, 350, 520];
    const arcColors = [P.sky, P.olive, P.amber];

    for (let i = 0; i < 3; i++) {
      const lx = landingXs[i]!;
      const col = arcColors[i]!;
      c.save();
      c.strokeStyle = col;
      c.lineWidth = lw;
      if (i !== 1) c.setLineDash([10, 7]);
      c.beginPath();
      c.moveTo(-540, 235);
      const steps = 20;
      const maxS = Math.ceil(steps * arcP);
      for (let s = 1; s <= maxS; s++) {
        const u = (s / steps) * arcP;
        const ax = A.lerp(-540, lx, u);
        const ay = 235 - Math.sin(u * Math.PI) * (175 + i * 32);
        c.lineTo(ax, ay);
      }
      c.stroke();
      c.setLineDash([]);
      c.restore();

      if (arcP > 0.92) {
        A.circle(c, lx, 240, 12, col, P.ink, lwIn);
      }
    }

    K.end(c);

    const cLight = A.win(t, 187.0, 194.3, 0.35, 0.3);
    if (cLight > 0.01) {
      const ptMotor = K.toScreen(cam, -40, -135);
      drawCallout(c, ptMotor, [0, -110], 'FUEL BURNS → MASS & TEMP SHIFT', cLight, P.amber);
    }
  }
}
