// scenes/sc10.ts — Chương 4, Cảnh 10 (259.96 - 284.32s): Độ cao & Nhiệt độ (High & Hot vs Sea Level)
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
} from './_assets';

export default class extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const rotorA = mainRotorAngleAt(t);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Nối mượt từ cuối sc09 (cam x=190, y=65, z=1.36) ra toàn cảnh so sánh Mực nước biển (trái) vs Thung lũng núi cao nóng (phải)
    const introP = A.eio(t, CUE.ch4_start, CUE.ch4_start + 2.2);
    const hotFocusP = A.eio(t, CUE.ch4_mountain_valley, CUE.ch4_mountain_valley + 2.0);
    const tempPlanP = A.eio(t, CUE.ch4_load_vs_temp - 0.6, CUE.ch4_load_vs_temp + 1.0);

    const camX = A.lerp(190, -15, introP) + hotFocusP * 65 * (1 - tempPlanP * 0.7);
    const camY = A.lerp(65, 8, introP);
    const camZ = A.lerp(1.36, 1.06, introP) + hotFocusP * 0.05;

    K.begin(c, { x: camX, y: camY, z: camZ });

    drawBgSkyGrid(c);
    const groundY = 230;
    drawBgMountainValley(c, groundY, false);

    const splitReveal = A.eio(t, CUE.ch4_dense_air - 0.8, CUE.ch4_dense_air + 1.0);

    // =========================================================================
    // 1. NỬA TRÁI (x = -340): MỰC NƯỚC BIỂN — KHÔNG KHÍ ĐẶC, NÂNG FULL TẢI DỄ DÀNG
    // =========================================================================
    const seaX = A.lerp(165, -340, introP);
    const seaLiftP = A.eio(t, CUE.ch4_dense_air - 0.5, CUE.ch4_dense_air + 1.8);
    const seaHeliY = A.lerp(153, -68, seaLiftP) + Math.sin(t * 2.5) * 3 * seaLiftP;

    // Mặt nước biển & nền bờ biển bên trái
    A.withA(c, splitReveal, () => {
      A.rrect(c, -920, groundY, 830, 56, 0, P.skyLight, P.sky, lo);
      // Sóng nước biển
      for (let wx = -800; wx <= -180; wx += 110) {
        const waveX = wx + Math.sin(t * 2 + wx) * 8;
        drawArc(c, waveX, groundY + 24, 24, 0.15 * Math.PI, 0.85 * Math.PI, P.sky, li);
      }

      // Khối phân tử không khí ĐẶC (Dense air) — các hạt màu xanh sky xếp dày đặc
      A.rrect(c, seaX - 205, -215, 410, 360, 14, 'rgba(219, 234, 254, 0.36)', P.sky, li);
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          const mx = seaX - 170 + col * 48 + Math.sin(t * 2.2 + row) * 3;
          const my = -185 + row * 56 + Math.cos(t * 2.0 + col) * 3;
          A.circle(c, mx, my, 5.5, P.sky, P.ink, lw(c, 1.2));
        }
      }

      // Mũi tên lực nâng mạnh hướng lên dưới đĩa cánh
      if (seaLiftP > 0.2) {
        for (const dx of [-85, 0, 85]) {
          drawArrow(c, [seaX + dx, seaHeliY + 45], [seaX + dx, seaHeliY - 35], P.amber, lw(c, 3.2), 11);
        }
      }
    });

    // Trực thăng ở mực nước biển mang 100% tải nặng (Full Load)
    c.save();
    c.translate(seaX, seaHeliY);
    drawHeli(c, {
      view: 'side',
      scale: 0.94,
      rotorAngle: rotorA,
      collectivePitch: 0.55,
      slingLoad: A.sm(t, CUE.ch4_full_load_sea - 1.5, CUE.ch4_full_load_sea - 0.2),
      loadFrac: 1.0,
    });
    c.restore();

    // =========================================================================
    // 2. NỬA PHẢI (x = 305): THUNG LŨNG NÚI CAO & NÓNG (AFGHANISTAN HIGH & HOT)
    // =========================================================================
    const hotReveal = A.eio(t, CUE.ch4_thinner - 0.5, CUE.ch4_thinner + 1.0);
    if (hotReveal > 0.01) {
      const hotX = 305;
      const plateauY = 105; // Thềm thung lũng núi cao hơn hẳn mực nước biển (groundY=230)

      A.withA(c, hotReveal, () => {
        // Khối núi đá cao nâng nền thung lũng lên y = 105
        A.poly(c, [
          [20, groundY],
          [85, plateauY],
          [690, plateauY],
          [780, groundY],
        ], '#d6cbb5', P.ink, lo);
        // Vân đá địa chất
        A.line(c, [[110, plateauY + 42], [660, plateauY + 42]], P.ink2, li, [18, 12]);
        A.line(c, [[75, plateauY + 84], [710, plateauY + 84]], P.ink2, li, [24, 16]);

        // Thước đo chênh lệch độ cao giữa Mực nước biển và Thung lũng núi cao
        A.line(c, [[52, groundY], [52, plateauY]], P.amber, lw(c, 2.5), [8, 6]);
        drawArrow(c, [52, groundY - 10], [52, plateauY + 6], P.amber, lw(c, 2.8), 10);


        // Mặt trời gay gắt trên đỉnh núi + Sóng nhiệt bốc lên
        const sunX = hotX + 185;
        const sunY = -215;
        A.circle(c, sunX, sunY, 34, P.amber, P.enemy, lo);
        for (let i = 0; i < 8; i++) {
          const a = t * 0.6 + (i * Math.PI) / 4;
          A.line(
            c,
            [[sunX + Math.cos(a) * 42, sunY + Math.sin(a) * 42], [sunX + Math.cos(a) * 58, sunY + Math.sin(a) * 58]],
            P.enemy,
            lw(c, 2.6)
          );
        }

        // Khung không khí LOÃNG & NÓNG (Thinner, Hot & High) — rất ít hạt phân tử, giãn xa nhau
        A.rrect(c, hotX - 210, -215, 420, 300, 14, 'rgba(254, 243, 199, 0.32)', P.enemy, li);
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4; col++) {
            const mx = hotX - 150 + col * 100 + Math.sin(t * 3.5 + row * 2) * 8;
            const my = -170 + row * 95 - ((t * 18 + col * 20) % 40) * 0.4;
            A.circle(c, mx, my, 4.5, P.enemyLight, P.enemy, lw(c, 1.2));
          }
        }

        // Trực thăng trên núi cao: cố nâng NỬA TẢI (half load) nhưng bị tụt xuống không treo nổi
        const failHoverP = A.eio(t, CUE.ch4_unable_hover - 0.3, CUE.ch4_unable_hover + 2.2);
        const shudder = failHoverP > 0.1 ? Math.sin(t * 28) * 3.5 * failHoverP : 0;
        const hotHeliY = A.lerp(-78, -8, failHoverP) + shudder;

        // Nửa kiện hàng bị bỏ lại dưới đất vì không thể mang hết
        const halfDropP = A.sm(t, CUE.ch4_half_load - 0.3, CUE.ch4_half_load + 0.8);
        if (halfDropP > 0.01) {
          A.withA(c, halfDropP, () => {
            A.rrect(c, hotX + 125, plateauY - 42, 64, 42, 5, P.sand, P.ink, lo);
            A.line(c, [[hotX + 135, plateauY - 34], [hotX + 179, plateauY - 8]], P.enemy, lw(c, 3));
            A.line(c, [[hotX + 179, plateauY - 34], [hotX + 135, plateauY - 8]], P.enemy, lw(c, 3));
          });
        }

        // Mũi tên cảnh báo sụt lực nâng (màu đỏ hướng xuống)
        if (failHoverP > 0.15) {
          for (const dx of [-95, 95]) {
            drawArrow(c, [hotX + dx, hotHeliY - 25], [hotX + dx, hotHeliY + 48], P.enemy, lw(c, 3.2), 11);
          }
          // Vòng cảnh báo quá tải quanh đĩa cánh
          A.ellipse(c, hotX + 12, hotHeliY - 92, 220, 18, 0, null, P.enemy, lw(c, 2.4));
        }

        c.save();
        c.translate(hotX, hotHeliY);
        drawHeli(c, {
          view: 'side',
          scale: 0.9,
          rotorAngle: rotorA * 0.92,
          collectivePitch: 0.85,
          slingLoad: A.sm(t, CUE.ch4_full_load_sea - 1.0, CUE.ch4_full_load_sea + 0.2),
          loadFrac: A.lerp(1.0, 0.45, halfDropP),
        });
        c.restore();
      });
    }

    // =========================================================================
    // 3. THƯỚC CÂN BẰNG NHIỆT ĐỘ TRONG NGÀY vs TẢI TRỌNG (280.6 - 284.32s)
    // =========================================================================
    if (tempPlanP > 0.01) {
      A.withA(c, tempPlanP, () => {
        const bx = -20;
        const by = -95;
        A.rrect(c, bx - 125, by - 115, 250, 225, 14, P.paper, P.ink, lo);

        // Nhiệt kế bên trái bảng (mực thủy ngân dâng cao đỏ rực)
        const tx = bx - 62;
        const ty = by + 55;
        const mercH = A.lerp(35, 118, A.eio(t, CUE.ch4_load_vs_temp, CUE.ch4_load_vs_temp + 1.8));
        A.rrect(c, tx - 11, ty - 135, 22, 135, 11, P.bg2, P.ink, lo);
        A.rrect(c, tx - 7, ty - mercH, 14, mercH, 6, P.enemy, null, 0);
        A.circle(c, tx, ty + 6, 19, P.enemy, P.ink, lo);

        // Cột kiện hàng cho phép bên phải bảng (nhiệt độ tăng -> số kiện hàng giảm từ 4 xuống 2)
        const cx = bx + 42;
        const dropCrateP = A.eio(t, CUE.ch4_load_vs_temp + 0.2, CUE.ch4_load_vs_temp + 1.8);
        for (let i = 0; i < 4; i++) {
          const cy = ty - 12 - i * 34;
          const isRemoved = i >= 2;
          const alpha = isRemoved ? 1 - dropCrateP * 0.78 : 1;
          A.withA(c, alpha, () => {
            A.rrect(
              c,
              cx - 34,
              cy - 26,
              68,
              26,
              4,
              isRemoved && dropCrateP > 0.4 ? P.enemyLight : P.sand,
              isRemoved && dropCrateP > 0.4 ? P.enemy : P.ink,
              li
            );
          });
        }

        // Mũi tên nghịch đảo giữa Nhiệt độ tăng và Tải trọng giảm
        drawArrow(c, [tx + 26, ty - 25], [tx + 26, ty - 115], P.enemy, lw(c, 2.8), 9);
        drawArrow(c, [cx - 52, ty - 115], [cx - 52, ty - 25], P.amber, lw(c, 2.8), 9);
      });
    }

    K.end(c);
  }
}

