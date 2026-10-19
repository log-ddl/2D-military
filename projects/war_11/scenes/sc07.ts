import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import { drawBgSkyGrid, drawHeli, drawSwashplateMechanism, lw } from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const rotA = mainRotorAngleAt(t);

    // Camera:
    // - 170.86 -> 190.68s: Khung rộng vừa thấy bảng 3 Cơ cấu lái buồng lái bên trái (x=-310) và Trực thăng phản hồi bên phải (x=210)
    // - 190.68 -> 207.08s: Tiến cận vào cụm Cơ khí Đầu Rotor & Đĩa nghiêng (Swashplate) ở (x=0, y=-10, z=1.78)
    const isSwashPhase = t >= CUE.ch3_blade_change_angle - 0.15;
    const cam: K.Cam = isSwashPhase
      ? K.track(
          t,
          [
            [CUE.ch3_blade_change_angle - 0.15, { x: 0, y: -35, z: 1.48 }],
            [CUE.ch3_increasing_bite, { x: 0, y: -42, z: 1.56 }],
            [CUE.ch3_plate_under_head, { x: 0, y: -25, z: 1.62 }],
            [CUE.ch3_rotor_head_hub + 0.5, { x: 0, y: -38, z: 1.54 }],
            [207.08, { x: 0, y: -38, z: 1.54 }],
          ],
          A.eio,
        )
      : { x: -30, y: 0, z: 1.42 };

    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    drawBgSkyGrid(c, -1800, -1200, 3600, 2400, 110);

    if (!isSwashPhase) {
      // =========================================================================
      // PHA A (170.86 - 190.53s): 3 CƠ CẤU LÁI CỦA PHI CÔNG -> PHẢN ỨNG TRỰC THĂNG
      // =========================================================================
      const activeCtrl =
        t < CUE.ch3_stick_cyclic - 0.2
          ? 1 // Collective lever (176.98 - 182.0)
          : t < CUE.ch3_pedals_tail - 0.2
            ? 2 // Cyclic stick (182.22 - 187.5)
            : 3; // Pedals (187.76 - 190.5)

      const collWave = activeCtrl === 1 ? Math.sin((t - 176.8) * 2.4) : 0.2;
      const cycWave = activeCtrl === 2 ? Math.sin((t - 182.2) * 2.4) : 0;
      const pedWave = activeCtrl === 3 ? Math.sin((t - 187.7) * 3.0) : 0;

      // --- 1. Hộp Mặt cắt Buồng lái & 3 Cần điều khiển (bên trái x = -325) ---
      const cx = -325, cy = 10;
      A.rrect(c, cx - 195, cy - 195, 390, 390, 16, P.paper, P.ink, lo);

      // Ghế phi công
      A.poly(c, [[cx - 95, cy - 65], [cx - 72, cy - 65], [cx - 72, cy + 75], [cx + 25, cy + 75], [cx + 25, cy + 98], [cx - 95, cy + 98]], P.dark, P.ink, lo);

      // (1) Cần Bước Chung (Collective Lever) ở bên cạnh ghế
      const collHighlighted = activeCtrl === 1 && t >= CUE.ch3_one_lever_collective - 0.4;
      c.save();
      c.translate(cx - 58, cy + 72);
      c.rotate(-0.45 - collWave * 0.35);
      A.capsule(c, [0, 0], [88, 0], 12, collHighlighted ? P.amber : P.slate, P.ink, lo);
      A.rrect(c, 74, -9, 26, 18, 4, collHighlighted ? P.amber : P.dark, P.ink, li);
      c.restore();
      if (collHighlighted) {
        // Mũi tên gập lên/xuống của cần Collective
        A.line(c, [[cx + 12, cy - 10], [cx + 12, cy + 55]], P.amber, lw(c, 3.5));
        A.poly(c, [[cx + 12, cy - 22], [cx + 4, cy - 8], [cx + 20, cy - 8]], P.amber, null, 0);
        A.poly(c, [[cx + 12, cy + 67], [cx + 4, cy + 53], [cx + 20, cy + 53]], P.amber, null, 0);
      }

      // (2) Cần Lái Chu Kỳ (Cyclic Stick) ở phía trước ghế
      const cycHighlighted = activeCtrl === 2;
      c.save();
      c.translate(cx + 48, cy + 96);
      c.rotate(cycWave * 0.34);
      A.capsule(c, [0, 0], [0, -118], 11, cycHighlighted ? P.amber : P.slate, P.ink, lo);
      A.rrect(c, -10, -136, 22, 26, 5, cycHighlighted ? P.amber : P.dark, P.ink, li);
      c.restore();
      if (cycHighlighted) {
        A.line(c, [[cx + 12, cy - 52], [cx + 84, cy - 52]], P.amber, lw(c, 3.5));
        A.poly(c, [[cx + 96, cy - 52], [cx + 80, cy - 60], [cx + 80, cy - 44]], P.amber, null, 0);
        A.poly(c, [[cx, cy - 52], [cx + 16, cy - 60], [cx + 16, cy - 44]], P.amber, null, 0);
      }

      // (3) Bàn đạp Đuôi (Pedals) ở phía trước mũi chân (cx + 135, cy + 75)
      const pedHighlighted = activeCtrl === 3;
      for (const side of [-1, 1] as const) {
        const px = cx + 135 + side * pedWave * 16;
        const py = cy + 62 + side * 22;
        A.line(c, [[px, py], [px, cy + 115]], P.ink, li);
        A.rrect(c, px - 10, py - 18, 20, 32, 4, pedHighlighted ? P.amber : P.slate, P.ink, lo);
      }

      // 3 Huy hiệu số thứ tự điều khiển ở đỉnh hộp trái
      for (let i = 1; i <= 3; i++) {
        const bx = cx - 110 + (i - 1) * 110;
        const by = cy - 145;
        const isAct = (t >= 176.5 && activeCtrl === i) || (t < 176.5 && t >= 173.0);
        A.circle(c, bx, by, 20, isAct ? P.amber : P.bg2, P.ink, lo);
        // Chấm tròn biểu thị số 1, 2, 3
        for (let d = 0; d < i; d++) {
          const dx = (d - (i - 1) / 2) * 9;
          A.circle(c, bx + dx, by, 3, P.ink, null, 0);
        }
      }

      // Đường truyền cơ khí nối từ hộp buồng lái sang trực thăng bên phải
      A.line(c, [[cx + 195, cy], [15, cy]], P.amber, lw(c, 4), [12, 8]);

      // --- 2. Trực thăng bên phải phản ứng trực tiếp theo Cần lái (x = 245) ---
      const hx = 245 + cycWave * 85;
      const hy = 10 - collWave * 75;
      c.save();
      c.translate(hx, hy);

      if (activeCtrl === 3) {
        // Khi đạp Pedals (187.76 - 190.68s): Hiển thị góc TOP-DOWN để thấy rõ cánh quạt đuôi đổi lực đẩy làm XOAY MŨI (turns the nose)!
        c.rotate(pedWave * 0.42);
        drawHeli(c, { view: 'top', scale: 0.92, rotorAngle: rotA });
        // Mũi tên lực đẩy ở cánh quạt đuôi và vòng xoay mũi
        const pushDir = pedWave >= 0 ? -1 : 1;
        A.capsule(c, [-250, -18], [-250, -18 + pushDir * 72], 8, P.amber, P.ink, li);
        A.poly(c, [[-250, -18 + pushDir * 90], [-262, -18 + pushDir * 68], [-238, -18 + pushDir * 68]], P.amber, P.ink, li);
      } else {
        // Khi kéo Collective (lên/xuống) hoặc đẩy Cyclic (nghiêng đĩa tiến/lùi): Hiển thị góc SIDE
        c.rotate(cycWave * 0.14);
        drawHeli(c, {
          view: 'side',
          scale: 0.98,
          rotorAngle: rotA,
          discTilt: cycWave * 1.15,
          collectivePitch: 0.45 + collWave * 0.35,
          showGearboxCutaway: true,
          powerFlow: 0.8,
        });

        // Mũi tên chỉ hướng Climb/Sink (Collective) hoặc Forward/Back (Cyclic)
        if (collHighlighted) {
          const dirY = collWave >= 0 ? -1 : 1;
          A.capsule(c, [14, dirY * 95], [14, dirY * 165], 10, P.amber, P.ink, li);
          A.poly(c, [[14, dirY * 185], [-2, dirY * 160], [30, dirY * 160]], P.amber, P.ink, lo);
        }
        if (cycHighlighted) {
          const dirX = cycWave >= 0 ? 1 : -1;
          A.capsule(c, [dirX * 180, -20], [dirX * 255, -20], 10, P.amber, P.ink, li);
          A.poly(c, [[dirX * 278, -20], [dirX * 250, -34], [dirX * 250, -6]], P.amber, P.ink, lo);
        }
      }
      c.restore();

      K.end(c);
      return;
    }

    // =========================================================================
    // PHA B (190.53 - 207.08s): CẬN CẢNH CƠ KHÍ ĐĨA NGHIÊNG (SWASHPLATE) & ĐẦU ROTOR
    // =========================================================================
    // Cho đĩa nghiêng nghiêng cố định (cyclicTilt = 0.72) để khi trục quay, lá cánh bên trái và bên phải
    // tự động đổi góc tấn ngược nhau trong mỗi vòng quay!
    const swashRot = (t - 190.5) * 2.8;
    c.save();
    c.translate(0, 15);
    c.scale(1.22, 1.22);
    drawSwashplateMechanism(c, {
      rotorAngle: swashRot,
      collective: 0.15 + Math.sin(t * 1.5) * 0.12,
      cyclicTilt: 0.75,
      highlightPlate: t >= CUE.ch3_plate_under_head - 0.3,
    });

    // Nhấn trực quan 2 bên:
    // - Bên trái (-x, nơi đĩa nghiêng dâng cao): thanh pitch link đẩy gốc cánh mở góc tấn lớn ("increasing its bite when it is on one side")
    const biteP = A.sm(t, CUE.ch3_increasing_bite - 0.3, CUE.ch3_increasing_bite + 0.5);
    if (biteP > 0.01) {
      A.withA(c, biteP, () => {
        A.rrect(c, -235, -218, 135, 62, 8, 'rgba(245, 158, 11, 0.20)', P.amber, lw(c, 3.5));
        // Mũi tên lực nâng lớn ở bên tăng góc cắn khí
        A.capsule(c, [-168, -225], [-168, -268], 8, P.amber, P.ink, li);
        A.poly(c, [[-168, -284], [-180, -262], [-156, -262]], P.amber, P.ink, li);
      });
    }

    // - Bên phải (+x, nơi đĩa nghiêng hạ thấp): thanh pitch link kéo gốc cánh giảm góc tấn ("and reducing it on the other")
    const redP = A.sm(t, CUE.ch3_reducing_other - 0.3, CUE.ch3_reducing_other + 0.5);
    if (redP > 0.01) {
      A.withA(c, redP, () => {
        A.rrect(c, 100, -218, 135, 62, 8, 'rgba(56, 189, 248, 0.20)', P.sky, lw(c, 3.5));
        A.capsule(c, [168, -225], [168, -242], 6, P.sky, P.ink, li);
      });
    }

    // - Vòng chỉ thị Đĩa Nghiêng dưới đầu rotor ("a plate under the rotor head does this with every revolution")
    const plateP = A.win(t, CUE.ch3_plate_under_head - 0.3, CUE.ch3_busiest_mechanism + 1.5, 0.3, 0.4);
    if (plateP > 0.01) {
      A.withA(c, plateP, () => {
        A.ellipse(c, 0, 8, 148, 52, 0.21, null, P.amber, lw(c, 4));
      });
    }
    c.restore();

    K.end(c);
  }
}
