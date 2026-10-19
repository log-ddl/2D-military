// scenes/sc13.ts — Chương 3 (194.60 – 212.06s): Cách trị độ lắc mà không có máy tính dẫn đường:
// - Nhịp 1 (194.60 – 206.80s, CUTAWAY + REAR_AXIS): Cắt rãnh xoắn nông (spiral grooves) trong ống phóng
//   để tạo chuyển động xoay ban đầu, và lắp 4 cánh đuôi lò xo (spring-loaded fins) bật mở ngay khi đuôi đạn rời ống.
// - Nhịp 2 (206.80 – 212.06s, TOP): Dù vậy, loạt đạn vẫn chỉ gom được trong một hình bầu dục rộng hàng trăm mét.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvCutaway,
  drawEnvTop,
  drawGrad,
  drawRocket,
  drawExplosion,
  drawCallout,
} from './_assets';

const SWITCH_OVAL_T = 206.8;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_OVAL_T) {
      // ── NHỊP 1 (194.60 – 206.80s): CUTAWAY RÃNH XOẮN NÔNG (TRÁI) + REAR_AXIS BUNG CÁNH ĐUÔI LÒ XO (PHẢI) ──
      const cam: K.Cam = { x: 0, y: 0, z: 1.24 };
      K.begin(c, cam);
      drawEnvCutaway(c, cam, 120);

      const lw = A.px(c, LINE.outer);

      // Bên trái (x = -210, y = 0): Mặt cắt ống phóng có rãnh xoắn nông + tên lửa trượt ra và bật mở cánh đuôi
      const exitP = A.sm(t, 200.2, 204.2);
      const finOpen = A.eo(t, 202.2, 203.2);
      const spinPhase = (t - 194.6) * 3.2;

      c.save();
      c.translate(-280, 0);
      c.scale(1.12, 1.12);
      drawGrad(c, {
        view: 'cutaway',
        highlight: t < 201.5 ? 'grooves' : null,
      });

      c.save();
      c.translate(A.lerp(-45, 145, exitP), 0);
      drawRocket(c, {
        variant: '122mm',
        view: 'cutaway',
        fuelLeft: 0.85,
        thrust: 0.9,
        finOpen,
        spinPhase,
        highlight: t >= 201.2 ? 'fins' : null,
      });
      c.restore();
      c.restore();

      // Bên phải (x = 420, y = 0): Khung nhìn dọc đầu trục đuôi (REAR_AXIS) cho thấy rõ chuyển động xoay
      // quanh trục và 4 cánh đuôi cong bật mở ngay khoảnh khắc đuôi đạn thoát khỏi miệng ống!
      A.rrect(c, 220, -210, 400, 420, 12, P.paper, P.ink, lw);
      c.save();
      c.translate(420, 0);
      c.scale(1.95, 1.95);
      drawRocket(c, {
        variant: '122mm',
        view: 'rear_axis',
        finOpen,
        thrust: 0.9,
        spinPhase,
        highlight: 'fins',
      });
      c.restore();

      K.end(c);

      const cGroove = A.win(t, 195.2, 201.5, 0.35, 0.35);
      if (cGroove > 0.01) {
        const ptG = K.toScreen(cam, -220, -45);
        drawCallout(c, ptG, [0, -110], 'SPIRAL GROOVES → SPIN', cGroove, P.amber);
      }

      const cFins = A.win(t, 201.6, 206.5, 0.35, 0.3);
      if (cFins > 0.01) {
        const ptF = K.toScreen(cam, 420, -165);
        drawCallout(c, ptF, [0, -85], 'SPRING-LOADED FINS SNAP OPEN', cFins, P.amber);
      }
      return;
    }

    // ── NHỊP 2 (206.80 – 212.06s): GÓC TOP — VÙNG TẢN MÁT HÌNH BẦU DỤC RỘNG HÀNG TRĂM MÉT ──
    const camTop: K.Cam = { x: 0, y: 0, z: 1.18 };
    K.begin(c, camTop);
    drawEnvTop(c, camTop, { gridStep: 180 });

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Vùng elip tản mát lớn (Broad Oval hundreds of meters wide)
    c.save();
    c.setLineDash([14, 10]);
    A.ellipse(c, 0, 0, 520, 260, 0, P.enemyLight, P.enemy, lw * 1.2);
    c.setLineDash([]);
    c.restore();

    // 28 quả đạn trong loạt bắn rơi rải khắp hình bầu dục
    for (let i = 0; i < 28; i++) {
      const tHit = 207.2 + i * 0.14;
      if (t < tHit) continue;
      const ang = i * 2.39996;
      const rNorm = Math.sqrt((i + 0.5) / 28) * 0.88;
      const ix = Math.cos(ang) * 520 * rNorm;
      const iy = Math.sin(ang) * 260 * rNorm;

      A.circle(c, ix, iy, 18, P.dark, P.ink, lwIn);
      const bp = (t - tHit) / 0.85;
      if (bp > 0 && bp < 1) {
        drawExplosion(c, ix, iy, bp, 58, 6);
      }
    }

    K.end(c);

    const cOval = A.win(t, 207.3, 211.9, 0.35, 0.25);
    if (cOval > 0.01) {
      const ptOval = K.toScreen(camTop, 0, -260);
      drawCallout(c, ptOval, [0, -65], 'BROAD OVAL (100s OF METERS)', cOval, P.enemy);
    }
  }
}
