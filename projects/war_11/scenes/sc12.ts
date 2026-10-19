// scenes/sc12.ts — Chương 4, Cảnh 12 (308.46 - 339.38s): Thiết kế Sống sót Chiến trường (4 cơ cấu chống đạn)
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import {
  lw,
  drawArrow,
  drawBgSkyGrid,
  drawBgMountainValley,
  drawHeli,
} from './_assets';

export default class extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const rotorA = mainRotorAngleAt(t);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Cuối cảnh (335.70 - 339.38): trực thăng nghiêng đĩa cánh bay về căn cứ ("keep flying home")
    const flyHomeP = A.ei(t, CUE.ch4_flying_home, CUE.ch4_end - 0.2);

    K.begin(c, { x: flyHomeP * 90, y: 12, z: 1.1 });

    drawBgSkyGrid(c);
    const groundY = 245;
    drawBgMountainValley(c, groundY, false);

    // Vị trí trực thăng trung tâm mở mặt cắt toàn phần (SIDE CUTAWAY)
    const heliX = flyHomeP * 260;
    const heliY = 18 + Math.sin(t * 3.1) * 4;
    const heliScale = 1.32;

    const hitSeat = t >= CUE.ch4_seats_absorb - 0.3;
    const hitTank = t >= CUE.ch4_fuel_self_sealing - 0.3;
    const hitGearbox = t >= CUE.ch4_main_gearbox - 0.3;
    const hitRotor = t >= CUE.ch4_rifle_hits_rotor - 0.5;

    // Ụ súng phòng không / lính bộ binh đối phương dưới mặt đất bắn lên
    for (const [gx, aimX] of [[-210, 18], [180, -14]] as const) {
      A.rrect(c, gx - 24, groundY - 14, 48, 14, 4, P.enemy, P.ink, lo);
      A.circle(c, gx, groundY - 22, 9, P.enemyLight, P.ink, li);
      A.line(c, [[gx, groundY - 22], [gx + aimX, groundY - 46]], P.ink, lw(c, 3.2));
    }

    // Đường đạn phòng không bắn lên từ mặt đất (khớp các mốc trúng đạn)
    const tracerTimes = [
      { t0: CUE.ch4_built_take_hit - 0.4, x0: 180, y0: groundY - 24, x1: heliX + 110, y1: heliY + 28 },
      { t0: CUE.ch4_fuel_self_sealing - 0.3, x0: -210, y0: groundY - 24, x1: heliX - 64, y1: heliY + 38 },
      { t0: CUE.ch4_main_gearbox + 1.2, x0: -210, y0: groundY - 24, x1: heliX + 18, y1: heliY - 48 },
      { t0: CUE.ch4_rifle_hits_rotor - 0.4, x0: 180, y0: groundY - 24, x1: heliX + 150, y1: heliY - 122 },
    ];
    for (const tr of tracerTimes) {
      const p = (t - tr.t0) / 0.55;
      if (p > 0 && p < 1.4) {
        const headP = A.clamp01(p);
        const tailP = A.clamp01(p - 0.35);
        const hx = A.lerp(tr.x0, tr.x1, headP);
        const hy = A.lerp(tr.y0, tr.y1, headP);
        const tx = A.lerp(tr.x0, tr.x1, tailP);
        const ty = A.lerp(tr.y0, tr.y1, tailP);
        A.line(c, [[tx, ty], [hx, hy]], P.enemy, lw(c, 3.5));
        if (p >= 0.85 && p <= 1.35) {
          A.circle(c, tr.x1, tr.y1, 14 * (p - 0.8), P.amber, P.enemy, li);
        }
      }
    }

    // Vẽ trực thăng chính mở mặt cắt Cutaway
    c.save();
    c.translate(heliX, heliY);
    c.rotate(flyHomeP * 0.09);
    drawHeli(c, {
      view: 'cutaway',
      scale: heliScale,
      rotorAngle: rotorA,
      discTilt: flyHomeP * 0.55,
      collectivePitch: 0.55,
      combatHits: {
        seatArmor: hitSeat,
        selfSealingTank: hitTank,
        dryGearbox: hitGearbox,
        rotorHit: hitRotor,
      },
    });
    c.restore();

    // =========================================================================
    // 1. Ô PHÓNG ĐẠI ĐÁY PHẢI (314.64s): GHẾ GIẢM CHẤN & GIÁP BẢO VỆ TỔ LÁI
    // =========================================================================
    const seatP = A.eio(t, CUE.ch4_seats_absorb - 0.3, CUE.ch4_seats_absorb + 0.7);
    if (seatP > 0.01) {
      const cx = 385;
      const cy = 128;
      A.withA(c, seatP * (1 - flyHomeP * 0.85), () => {
        // Đường gióng từ ghế phi công ra ô phóng đại
        A.line(c, [[heliX + 112, heliY + 18], [cx - 150, cy - 45]], P.amber, li, [7, 5]);
        A.rrect(c, cx - 150, cy - 90, 300, 180, 12, P.paper, P.ink, lo);

        c.save();
        c.translate(cx, cy);
        c.scale(1.16, 1.16);
        c.translate(-cx, -cy);

        // Chuyển động lò xo giảm chấn nén xuống rồi đàn hồi khi tiếp đất mạnh
        const stroke = A.bump(t, CUE.ch4_seats_absorb + 0.4, 1.8) * 22;
        const armorGlow = A.sm(t, CUE.ch4_armor_around - 0.3, CUE.ch4_armor_around + 0.5);

        // Sàn buồng lái và 2 trụ ống giảm chấn lò xo
        A.line(c, [[cx - 95, cy + 56], [cx + 95, cy + 56]], P.ink, lo);
        for (const sx of [cx - 28, cx + 18]) {
          A.rrect(c, sx - 6, cy + 12 + stroke, 12, 44 - stroke, 3, P.slate, P.ink, li);
          for (let k = 0; k < 4; k++) {
            const ky = cy + 16 + stroke + k * ((36 - stroke) / 4);
            A.line(c, [[sx - 11, ky], [sx + 11, ky + 4]], P.ink, li);
          }
        }

        // Khung ghế bọc giáp Kevlar/Ceramic dày màu amber quanh lưng & đáy ghế
        const sy = cy - 18 + stroke;
        A.poly(
          c,
          [
            [cx - 48, sy - 46],
            [cx - 32, sy - 46],
            [cx - 32, sy + 16],
            [cx + 38, sy + 16],
            [cx + 38, sy + 30],
            [cx - 48, sy + 30],
          ],
          armorGlow > 0.1 ? P.amber : P.oliveDark,
          P.ink,
          lo
        );
        // Phi công ngồi trong lòng giáp
        A.circle(c, cx - 4, sy - 28, 12, P.skin, P.ink, li);
        A.rrect(c, cx - 18, sy - 12, 28, 26, 5, P.olive, P.ink, li);

        // Mũi tên viên đạn bị tấm giáp chắn bật ngược ra
        if (armorGlow > 0.1) {
          drawArrow(c, [cx - 98, sy + 12], [cx - 52, sy - 2], P.enemy, lw(c, 2.8), 9);
          drawArrow(c, [cx - 52, sy - 2], [cx - 92, sy - 28], P.amber, lw(c, 2.5), 8);
        }
        c.restore();
      });
    }

    // =========================================================================
    // 2. Ô PHÓNG ĐẠI ĐÁY TRÁI (318.50s): BÌNH NHIÊN LIỆU CAO SU TỰ LIỀN (SELF-SEALING)
    // =========================================================================
    const tankP = A.eio(t, CUE.ch4_fuel_self_sealing - 0.3, CUE.ch4_fuel_self_sealing + 0.7);
    if (tankP > 0.01) {
      const cx = -385;
      const cy = 128;
      A.withA(c, tankP * (1 - flyHomeP * 0.85), () => {
        A.line(c, [[heliX - 64, heliY + 24], [cx + 150, cy - 45]], P.amber, li, [7, 5]);
        A.rrect(c, cx - 150, cy - 90, 300, 180, 12, P.paper, P.ink, lo);

        c.save();
        c.translate(cx, cy);
        c.scale(1.15, 1.15);
        c.translate(-cx, -cy);

        // Độ trương nở của lớp cao su tự liền ép khít lỗ đạn (320.2 - 321.8s)
        const sealP = A.eio(t, CUE.ch4_rubber_closes - 0.4, CUE.ch4_rubber_closes + 1.0);
        const gap = A.lerp(18, 0, sealP);

        // Lòng bình chứa nhiên liệu màu vàng amber phía trên
        A.rrect(c, cx - 95, cy - 64, 190, 76, 6, P.amberLight, P.ink, li);
        A.rrect(c, cx - 91, cy - 44, 182, 54, 4, P.amber, null, 0);

        // Lớp vỏ cao su tự liền (2 nửa trái/phải của đáy bình trương phồng lên bịt lỗ thủng)
        const swellH = 22 + sealP * 10;
        A.rrect(c, cx - 95, cy + 12, 95 - gap * 0.5, swellH, 6, P.dark, P.ink, lo);
        A.rrect(c, cx + gap * 0.5, cy + 12, 95 - gap * 0.5, swellH, 6, P.dark, P.ink, lo);

        // Hai mũi tên đối đầu chỉ 2 mép cao su ép chặt vào nhau
        if (sealP > 0.15) {
          drawArrow(c, [cx - 48, cy + 24], [cx - 8, cy + 24], P.amber, lw(c, 2.8), 9);
          drawArrow(c, [cx + 48, cy + 24], [cx + 8, cy + 24], P.amber, lw(c, 2.8), 9);
        } else {
          // Khi mới thủng (chưa khép kín): đường đạn xuyên qua
          drawArrow(c, [cx, cy + 68], [cx, cy - 28], P.enemy, lw(c, 2.8), 9);
        }
        c.restore();
      });
    }

    // =========================================================================
    // 3. Ô PHÓNG ĐẠI TRÊN TRÁI (322.68s): HỘP SỐ CHÍNH CHẠY KHÔ 30 PHÚT KHI CẠN DẦU
    // =========================================================================
    const gbP = A.eio(t, CUE.ch4_main_gearbox - 0.3, CUE.ch4_main_gearbox + 0.7);
    if (gbP > 0.01) {
      const cx = -385;
      const cy = -125;
      A.withA(c, gbP * (1 - flyHomeP * 0.85), () => {
        A.line(c, [[heliX + 14, heliY - 58], [cx + 150, cy + 35]], P.amber, li, [7, 5]);
        A.rrect(c, cx - 150, cy - 90, 300, 180, 12, P.paper, P.ink, lo);

        c.save();
        c.translate(cx, cy);
        c.scale(1.15, 1.15);
        c.translate(-cx, -cy);

        // Mức dầu bôi trơn rút cạn dần từ 326.8 -> 328.8s
        const drainP = A.eio(t, CUE.ch4_oil_ran_out - 0.8, CUE.ch4_oil_ran_out + 1.0);
        const runDryP = A.eio(t, CUE.ch4_keep_running - 0.5, CUE.ch4_keep_running + 2.2);

        // Vỏ hộp số mặt cắt
        const boxX = cx - 42;
        const boxY = cy + 2;
        A.rrect(c, boxX - 68, boxY - 56, 136, 108, 10, P.bg2, P.ink, lo);

        // Mức dầu bên trong rút xuống đáy
        const oilH = Math.max(0, (1 - drainP) * 68);
        if (oilH > 1) {
          A.rrect(c, boxX - 62, boxY + 48 - oilH, 124, oilH, 4, P.amber, null, 0);
        }
        // Giọt dầu chảy thoát ra lỗ thủng dưới đáy
        if (drainP > 0.05 && drainP < 0.95) {
          A.circle(c, boxX, boxY + 56 + drainP * 18, 4.5, P.amber, P.ink, lw(c, 1));
        }

        // 2 bánh răng thép hợp kim vẫn quay ăn khớp đều đặn dù đã cạn sạch dầu
        for (const [gx, dir] of [[boxX - 24, 1], [boxX + 24, -1]] as const) {
          c.save();
          c.translate(gx, boxY - 6);
          c.rotate(dir * rotorA * 1.4);
          const gearCol = drainP > 0.7 ? P.amber : P.slate;
          A.circle(c, 0, 0, 22, gearCol, P.ink, lo);
          for (let k = 0; k < 8; k++) {
            const ga = (k * Math.PI) / 4;
            A.rrect(c, Math.cos(ga) * 20 - 4, Math.sin(ga) * 20 - 4, 8, 8, 1, gearCol, P.ink, li);
          }
          A.circle(c, 0, 0, 7, P.paper, P.ink, li);
          c.restore();
        }

        // Đồng hồ 30 phút (nửa vòng tròn bên phải hộp số) xác nhận chạy khô bền bỉ
        const clkX = cx + 76;
        const clkY = cy + 2;
        A.circle(c, clkX, clkY, 38, P.bg, P.ink, lo);
        c.beginPath();
        c.moveTo(clkX, clkY);
        c.arc(clkX, clkY, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * runDryP);
        c.closePath();
        c.fillStyle = P.amber;
        c.fill();
        c.strokeStyle = P.ink;
        c.lineWidth = li;
        c.stroke();
        c.restore();
      });
    }

    // =========================================================================
    // 4. Ô PHÓNG ĐẠI TRÊN PHẢI (333.56s): CÁNH ROTOR CHỊU ĐẠN SÚNG TRƯỜNG & BAY VỀ
    // =========================================================================
    const bladeP = A.eio(t, CUE.ch4_rifle_hits_rotor - 0.5, CUE.ch4_rifle_hits_rotor + 0.6);
    if (bladeP > 0.01) {
      const cx = 385;
      const cy = -125;
      A.withA(c, bladeP * (1 - flyHomeP * 0.85), () => {
        A.line(c, [[heliX + 145, heliY - 112], [cx - 150, cy + 35]], P.amber, li, [7, 5]);
        A.rrect(c, cx - 150, cy - 90, 300, 180, 12, P.paper, P.ink, lo);

        c.save();
        c.translate(cx, cy);
        c.scale(1.16, 1.16);
        c.translate(-cx, -cy);

        // Thân lá cánh rotor bằng vật liệu tổng hợp có xà chính (D-spar) chịu lực màu amber ở mép trước
        A.rrect(c, cx - 108, cy - 28, 216, 56, 10, P.oliveLight, P.ink, lo);
        A.rrect(c, cx - 108, cy - 28, 216, 18, 6, P.amber, P.ink, li); // Xà chịu lực chính nguyên vẹn

        // 2 lỗ đạn súng trường xuyên qua phần lõi tổ ong phía sau nhưng không làm gãy xà cánh
        for (const hx of [cx - 35, cx + 38]) {
          A.circle(c, hx, cy + 8, 9, P.dark, P.enemy, lw(c, 2.5));
          drawArrow(c, [hx, cy + 52], [hx, cy - 48], P.enemy, lw(c, 2.2), 8);
        }
        c.restore();
      });
    }


    K.end(c);
  }
}

