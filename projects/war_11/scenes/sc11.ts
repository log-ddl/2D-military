// scenes/sc11.ts — Chương 4, Cảnh 11 (284.32 - 308.46s): Bão bụi Brownout & Cát ăn mòn Tuabin
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import {
  lw,
  drawArrow,
  drawArc,
  drawBgSkyGrid,
  drawBgMountainValley,
  drawHeli,
  drawTurbineCutaway,
} from './_assets';

export default class extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const rotorA = mainRotorAngleAt(t);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Giai đoạn 1 (284.32 - 294.2): Trực thăng đáp xuống sa mạc khô -> luồng gió đập đất cuộn mây bụi mù Brownout
    // Giai đoạn 2 (294.2 - 308.46): Mở mặt cắt Động cơ Tuabin hút cát ăn mòn cánh nén vs Bộ lọc tách hạt (Particle Separator)
    const turbineFocusP = A.eio(t, CUE.ch4_engine_sand - 0.6, CUE.ch4_engine_sand + 1.2);
    const camX = A.lerp(-180, 65, turbineFocusP);
    const camY = A.lerp(42, 12, turbineFocusP);
    const camZ = A.lerp(1.26, 1.15, turbineFocusP);

    K.begin(c, { x: camX, y: camY, z: camZ });


    drawBgSkyGrid(c);
    const groundY = 230;
    drawBgMountainValley(c, groundY, true);

    // =========================================================================
    // 1. TRỰC THĂNG HẠ CÁNH TRÊN CÁT KHÔ & VÒNG XOÁY BỤI BROWNOUT (x = -230)
    // =========================================================================
    const heliX = -230;
    const descendP = A.eio(t, CUE.ch4_dust_another, CUE.ch4_brownout + 0.5);
    const heliY = A.lerp(-35, 118, descendP) + Math.sin(t * 3.8) * 2.5;

    // Luồng gió cánh quạt đập xuống mặt đất rồi cuộn ngược lên thành vòng xoáy bụi
    const dustP = A.eio(t, CUE.ch4_dry_ground - 0.5, CUE.ch4_blinding_cloud + 1.5);
    if (dustP > 0.01) {
      A.withA(c, dustP, () => {
        // Mũi tên gió đập xuống và cuộn vòng hai bên
        for (const side of [-1, 1]) {
          drawArrow(
            c,
            [heliX + side * 85, heliY - 55],
            [heliX + side * 125, groundY - 8],
            P.amber,
            lw(c, 2.8),
            10
          );
          // Vòng cung cuộn bụi ngược lên bao trùm buồng lái
          drawArc(
            c,
            heliX + side * 205,
            groundY - 72,
            78,
            side > 0 ? -Math.PI * 0.85 : -Math.PI * 0.15,
            side > 0 ? Math.PI * 0.65 : Math.PI * 1.15,
            P.amber,
            lw(c, 3),
            [12, 8]
          );
        }
      });
    }

    // Vẽ trực thăng đang hạ cánh
    c.save();
    c.translate(heliX, heliY);
    drawHeli(c, {
      view: 'side',
      scale: 0.96,
      rotorAngle: rotorA,
      collectivePitch: 0.62,
      showGearboxCutaway: turbineFocusP > 0.2,
    });
    c.restore();

    // Đám mây bụi mù Brownout dâng lên che khuất tầm nhìn phi công xuống mặt đất
    const cloudP = A.eio(t, CUE.ch4_blinding_cloud - 0.4, CUE.ch4_brownout + 0.8);
    if (cloudP > 0.01) {
      A.withA(c, cloudP * 0.88, () => {
        const puffs: [number, number, number][] = [
          [-430, groundY - 36, 58],
          [-345, groundY - 54, 72],
          [-250, groundY - 46, 68],
          [-145, groundY - 62, 78],
          [-55, groundY - 52, 74],
          [15, groundY - 38, 56],
          [-95, heliY + 18, 62],
          [-35, heliY + 8, 54],
        ];
        for (let i = 0; i < puffs.length; i++) {
          const [px, py, pr] = puffs[i]!;
          const dx = Math.sin(t * 2.6 + i * 1.3) * 12;
          const dy = Math.cos(t * 2.2 + i * 0.9) * 6;
          A.circle(c, px + dx, py + dy, pr * cloudP, '#dfd2b5', P.amber, li);
        }

        // Đường tầm nhìn của phi công (Line-of-sight) bị đám mây bụi cắt đứt bằng dấu X đỏ
        const eyeX = heliX + 108;
        const eyeY = heliY - 6;
        const targetX = heliX + 215;
        const targetY = groundY;
        A.line(c, [[eyeX, eyeY], [targetX, targetY]], P.enemy, lw(c, 3), [10, 7]);
        const midX = (eyeX + targetX) * 0.5;
        const midY = (eyeY + targetY) * 0.5;
        A.circle(c, midX, midY, 18, P.paper, P.enemy, lo);
        A.line(c, [[midX - 9, midY - 9], [midX + 9, midY + 9]], P.enemy, lw(c, 3.2));
        A.line(c, [[midX + 9, midY - 9], [midX - 9, midY + 9]], P.enemy, lw(c, 3.2));
      });
    }

    // =========================================================================
    // 2. MẶT CẮT PHÓNG ĐẠI ĐỘNG CƠ TUABIN & BỘ TÁCH HẠT CÁT (x = 305, y = -20)
    // =========================================================================
    if (turbineFocusP > 0.01) {
      const tx = 305;
      const ty = -20;

      const useSep = t >= CUE.ch4_filters_separators - 0.15;
      const sepP = A.eio(t, CUE.ch4_filters_separators - 0.15, CUE.ch4_filters_separators + 0.9);
      const rawDamage = A.eio(t, CUE.ch4_erodes_blades - 0.4, CUE.ch4_chokes_turbine + 0.8);
      const sandDamage = rawDamage * (1 - sepP * 0.78);

      A.withA(c, turbineFocusP, () => {
        // Đường dẫn phóng đại từ cửa hút khí trên lưng trực thăng sang khung mặt cắt Tuabin
        A.line(
          c,
          [[heliX + 42, heliY - 52], [tx - 265, ty - 135]],
          P.amber,
          li,
          [8, 6]
        );
        A.line(
          c,
          [[heliX + 42, heliY - 38], [tx - 265, ty + 145]],
          P.amber,
          li,
          [8, 6]
        );

        // Khung bảng mặt cắt kỹ thuật
        A.rrect(c, tx - 265, ty - 155, 545, 315, 16, P.paper, P.ink, lo);

        c.save();
        c.translate(tx, ty);
        drawTurbineCutaway(c, rotorA, sandDamage, useSep);

        // Luồng hạt cát bay vào cửa hút bên phải (+x = 250 -> vào trong)
        for (let i = 0; i < 18; i++) {
          const cycle = ((t * 1.45 + i * 0.17) % 1);
          const startX = 245;
          const startY = -55 + ((i * 29) % 110);

          if (!useSep) {
            // Chưa có bộ lọc: hạt cát lao thẳng qua các tầng cánh nén gây mài mòn đỏ rực
            const sx = A.lerp(startX, -175, cycle);
            const sy = startY * (1 - cycle * 0.35) + Math.sin(t * 12 + i) * 5;
            A.circle(c, sx, sy, 4.2, cycle > 0.35 ? P.enemy : P.amber, P.ink, lw(c, 1.1));
          } else {
            // Đã bật Bộ tách hạt (Particle Separator):
            // - Hạt cát nặng bị vách quán tính ở x=115 đẩy chệch xuống ống xả phụ (x=15, y=135)
            // - Luồng khí sạch (P.sky) đi tiếp vào cánh nén
            if (i % 2 === 0) {
              const sx = cycle < 0.45
                ? A.lerp(startX, 118, cycle / 0.45)
                : A.lerp(118, 12, (cycle - 0.45) / 0.55);
              const sy = cycle < 0.45
                ? A.lerp(startY, 28, cycle / 0.45)
                : A.lerp(28, 138, (cycle - 0.45) / 0.55);
              A.circle(c, sx, sy, 4.5, P.amber, P.ink, lw(c, 1.2));
            } else {
              const sx = A.lerp(startX, -165, cycle);
              const sy = (startY * 0.45) + Math.sin(t * 8 + i) * 3;
              A.circle(c, sx, sy, 3.6, P.sky, null, 0);
            }
          }
        }

        // Mũi tên chỉ luồng cát bị tống ra khỏi ống tách hạt bên dưới
        if (sepP > 0.1) {
          A.withA(c, sepP, () => {
            drawArrow(c, [95, 68], [22, 136], P.amber, lw(c, 3), 10);
          });
        }

        // Giai đoạn 3 (301.82 - 308.46): Cái giá của bộ lọc (hao công suất + tăng trọng lượng + vẫn phải tháo bảo dưỡng sớm)
        const costP = A.eio(t, CUE.ch4_cost_power - 0.3, CUE.ch4_cost_power + 1.2);
        if (costP > 0.01) {
          A.withA(c, costP, () => {
            // Thanh công suất phía trên động cơ bị sụt giảm một phần màu đỏ
            const barX = -185;
            const barY = -126;
            const barW = 240;
            A.rrect(c, barX, barY, barW, 20, 5, P.bg2, P.ink, li);
            A.rrect(c, barX, barY, barW * (1 - 0.24 * costP), 20, 5, P.amber, P.ink, li);
            A.rrect(c, barX + barW * (1 - 0.24 * costP), barY, barW * 0.24 * costP, 20, 3, P.enemy, P.ink, li);

            // Quả nặng biểu thị trọng lượng tăng thêm của cụm lọc
            A.poly(c, [[95, -134], [135, -134], [143, -102], [87, -102]], P.dark, P.ink, lo);
            drawArc(c, 115, -134, 10, Math.PI, 0, P.ink, li);
          });
        }

        // Biểu tượng vòng quay thay thế / vệ sinh động cơ sớm (306.8 - 308.46s)
        const cleanP = A.eio(t, CUE.ch4_cleaned_replaced - 0.8, CUE.ch4_cleaned_replaced + 0.5);
        if (cleanP > 0.01) {
          A.withA(c, cleanP, () => {
            drawArc(c, -35, 0, 82, -Math.PI * 0.75, Math.PI * 0.65, P.enemy, lw(c, 3.4), [10, 6]);
            drawArrow(c, [-92, 58], [-102, 36], P.enemy, lw(c, 3.4), 11);
          });
        }

        c.restore();
      });
    }

    K.end(c);
  }
}

