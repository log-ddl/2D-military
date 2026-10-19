import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import {
  drawBgAirfield,
  drawHeli,
  drawAirfoilCutaway,
  drawSycamoreSeed,
  lw,
} from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const groundY = 235;

    // Quỹ đạo Tự quay (Autorotation) của trực thăng:
    // - 232.94 -> 239.40s: Bay bằng ở trên cao (x = -260 -> -150, y = -165)
    // - 239.40 -> 250.20s: Động cơ hỏng -> hạ cần Collective -> lượn hạ độ cao có kiểm soát xuống (x = -150 -> 85, y = -165 -> 95)
    // - 250.20 -> 255.00s: Sát đất kéo cần Collective lên + ngửa mũi (flare) đệm khí -> chạm đất êm tại (x = 165, y = 153 = groundY - 82)
    // - 255.00 -> 259.96s: Đậu an toàn trên đường băng
    let hx = -150;
    let hy = -165;
    let pitchRad = 0;
    let collLever = 0.55; // 0 = hạ sát sàn, 1 = kéo cao tối đa

    if (t < CUE.ch3_engine_fails) {
      hx = A.lerp(-280, -150, A.ph(t, 232.94, CUE.ch3_engine_fails));
      hy = -165 + Math.sin(t * 2.5) * 4;
      collLever = 0.6;
    } else if (t < CUE.ch3_last_moment_raises) {
      const descP = A.ph(t, CUE.ch3_engine_fails, CUE.ch3_last_moment_raises);
      hx = A.lerp(-150, 80, descP);
      hy = A.lerp(-165, 88, A.eio(descP, 0, 1));
      pitchRad = 0.08 * A.sm(t, CUE.ch3_engine_fails, CUE.ch3_engine_fails + 1.2);
      // Phi công dập cần Collective xuống thấp ("drops the lever")
      collLever = A.lerp(0.6, 0.08, A.eio(t, CUE.ch3_drops_lever - 0.2, CUE.ch3_drops_lever + 0.8));
    } else {
      const landP = A.eio(t, CUE.ch3_last_moment_raises, CUE.ch3_stored_spin_cushion + 1.8);
      hx = A.lerp(80, 165, landP);
      hy = A.lerp(88, groundY - 82, landP);
      // Ngửa mũi đệm hạ cánh (flare) rồi cân bằng khi chạm bánh
      pitchRad = -0.20 * A.bump(t, CUE.ch3_last_moment_raises, 4.2);
      // Phi công kéo vọt cần Collective lên ("raises the lever")
      collLever = A.lerp(0.08, 0.92, A.eio(t, CUE.ch3_last_moment_raises, CUE.ch3_stored_spin_cushion));
    }

    // Camera bám theo trực thăng từ trên không xuống tới mặt đất
    const cam: K.Cam = {
      x: hx + 25,
      y: A.clamp(hy + 10, -95, 65),
      z: 1.36,
    };

    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    drawBgAirfield(c, groundY, -1800, 1800);

    // Đường quỹ đạo hạ độ cao có kiểm soát (nét đứt)
    if (t >= CUE.ch3_engine_fails) {
      A.line(c, [[-150, -165], [80, 88], [165, groundY - 82]], P.slate, li, [12, 8]);
    }

    // --- 1. Luồng không khí thổi ngược từ DƯỚI LÊN qua đĩa rotor giữ cánh tự quay (241.2 - 250.5s) ---
    const upAirP = A.win(t, CUE.ch3_air_rushing_upward - 0.4, CUE.ch3_last_moment_raises + 0.6, 0.4, 0.5);
    if (upAirP > 0.01) {
      A.withA(c, upAirP, () => {
        const shift = (t * 220) % 70;
        for (const dx of [-170, -105, -40, 40, 105, 170]) {
          const botY = hy + 95 - shift * 0.4;
          const topY = hy - 145 - shift * 0.4;
          A.line(c, [[hx + dx, botY], [hx + dx, topY]], P.sky, lw(c, 3.5));
          A.poly(c, [[hx + dx, topY - 16], [hx + dx - 9, topY], [hx + dx + 9, topY]], P.sky, null, 0);
        }
      });
    }

    // --- 2. Đệm khí đẩy mạnh xuống đất ở giây cuối khi kéo cần Collective ("stored spin to cushion the landing") ---
    const cushionP = A.win(t, CUE.ch3_last_moment_raises + 0.3, 256.5, 0.3, 0.8);
    if (cushionP > 0.01) {
      A.withA(c, cushionP, () => {
        // Vòm đệm khí phản lực dưới bụng trực thăng trên mặt đường băng
        A.ellipse(c, hx + 10, groundY - 6, 225, 28, 0, 'rgba(245, 158, 11, 0.25)', P.amber, lw(c, 3.5));
        for (const side of [-1, 1]) {
          const rx = hx + 14 + side * 85;
          A.capsule(c, [rx, hy + 25], [rx, hy - 125], 9, P.amber, P.ink, li);
          A.poly(c, [[rx, hy - 145], [rx - 14, hy - 120], [rx + 14, hy - 120]], P.amber, P.ink, lo);
        }
      });
    }

    // --- 3. Vẽ Trực thăng chủ đạo ---
    const engineFailed = t >= CUE.ch3_engine_fails;
    c.save();
    c.translate(hx, hy);
    c.rotate(pitchRad);
    drawHeli(c, {
      view: 'side',
      rotorAngle: mainRotorAngleAt(t) * 1.15,
      collectivePitch: collLever,
      showGearboxCutaway: true,
      powerFlow: engineFailed ? 0 : 1,
    });

    // Khói xám và dấu tắt động cơ khi hỏng máy (238.74s+)
    if (engineFailed) {
      A.rrect(c, -52, -55, 42, 18, 4, P.enemy, P.ink, li);
      for (let k = 0; k < 4; k++) {
        const age = ((t - CUE.ch3_engine_fails) * 2.2 + k * 0.4) % 1.6;
        A.withA(c, Math.max(0, 0.55 - age * 0.32), () => {
          A.circle(c, -65 - age * 55, -52 - age * 28, 9 + age * 14, P.slate, P.ink2, li);
        });
      }
    }
    c.restore();

    // --- 4. Hộp Cần Collective bên trái (tách hoàn toàn khỏi đuôi trực thăng) ---
    if (t >= CUE.ch3_engine_fails - 0.3) {
      const lx = cam.x - 455;
      const ly = cam.y - 20;
      A.rrect(c, lx - 92, ly - 95, 184, 190, 12, P.paper, P.ink, lo);
      // Khung ghế nhỏ
      A.poly(c, [[lx - 55, ly - 35], [lx - 38, ly - 35], [lx - 38, ly + 45], [lx + 22, ly + 45], [lx + 22, ly + 60], [lx - 55, ly + 60]], P.dark, P.ink, li);
      // Cần Collective xoay theo collLever
      c.save();
      c.translate(lx - 28, ly + 42);
      c.rotate(-0.12 - collLever * 0.72);
      A.capsule(c, [0, 0], [82, 0], 11, P.amber, P.ink, lo);
      A.rrect(c, 68, -8, 22, 16, 4, P.dark, P.ink, li);
      c.restore();
      // Mũi tên chỉ chiều thao tác cần của phi công
      const isDropping = t >= CUE.ch3_drops_lever - 0.3 && t < CUE.ch3_last_moment_raises - 0.3;
      const arrowDir = isDropping ? 1 : -1;
      const arrowCol = isDropping ? P.sky : P.amber;
      A.capsule(c, [lx + 46, ly - arrowDir * 35], [lx + 46, ly + arrowDir * 35], 7, arrowCol, P.ink, li);
      A.poly(c, [[lx + 46, ly + arrowDir * 52], [lx + 34, ly + arrowDir * 32], [lx + 58, ly + arrowDir * 32]], arrowCol, P.ink, li);
    }

    // --- 5. Hộp đối chiếu Hạt Chò (Sycamore seed) & Mặt cắt cánh tự quay bên phải (242.0 - 252.0s) ---
    const seedShow = A.win(t, CUE.ch3_air_rushing_upward + 0.4, CUE.ch3_stored_spin_cushion, 0.4, 0.5);
    if (seedShow > 0.01) {
      A.withA(c, seedShow, () => {
        const rx = cam.x + 375;
        const ry = cam.y - 10;
        A.rrect(c, rx - 115, ry - 145, 230, 290, 12, P.paper, P.sky, lo);

        // Nửa trên hộp: Mặt cắt cánh nhận luồng khí từ dưới thổi lên
        c.save();
        c.translate(rx, ry - 62);
        drawAirfoilCutaway(c, { aoaRad: 0.05, mode: 'autorotate', flowPhase: t * 1.5, scale: 0.48 });
        c.restore();

        // Nửa dưới hộp: Hạt chò (Sycamore seed) tự quay khi rơi trong luồng khí hướng lên
        if (t >= CUE.ch3_sycamore_seed - 0.6) {
          A.line(c, [[rx - 90, ry + 12], [rx + 90, ry + 12]], P.light, li, [8, 6]);
          c.save();
          c.translate(rx, ry + 78);
          drawSycamoreSeed(c, t * 7.5, 1.05);
          c.restore();
        }
      });
    }

    K.end(c);
  }
}
