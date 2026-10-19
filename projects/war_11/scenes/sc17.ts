// scenes/sc17.ts — Chương 6, Cảnh 17 (452.40 - 473.68s): Khép vòng tròn — Lá cánh Bất đối xứng & Cuộc tranh luận chiến thắng Vật lý
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
  drawAsymmetricRotorTop,
  drawHeli,
} from './_assets';

export default class extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const rotorA = mainRotorAngleAt(t);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Giai đoạn 1 (452.40 - 458.20s): Trở lại góc TOP-DOWN Đĩa Rotor Bất Đối Xứng của Cảnh 1
    // Giai đoạn 2 (458.20 - 473.68s): Góc SIDE CUTAWAY thắp sáng 4 kỳ công cơ khí & bay vút lên chiến thắng vật lý
    const toSideP = A.eio(t, CUE.ch6_part_tail_rotor - 0.8, CUE.ch6_part_tail_rotor + 0.3);

    K.begin(c, { x: 0, y: 0, z: 1.12 });
    drawBgSkyGrid(c);

    // =========================================================================
    // 1. GIAI ĐOẠN 1 (452.40 - 458.20s): TOP-DOWN ĐĨA CÁNH BẤT ĐỐI XỨNG (CALLBACK SC01)
    // =========================================================================
    if (toSideP < 0.99) {
      const topAlpha = 1 - toSideP;
      const advP = A.eio(t, CUE.ch6_fast_one_side - 0.5, CUE.ch6_fast_one_side + 0.7);
      const retP = A.eio(t, CUE.ch6_not_at_all_other - 0.6, CUE.ch6_not_at_all_other + 0.6);

      A.withA(c, topAlpha, () => {
        c.save();
        c.scale(1.32, 1.32);
        drawAsymmetricRotorTop(c, {
          rotorAngle: rotorA,
          advHighlight: advP,
          sonicShock: advP,
          retHighlight: retP,
          rootStall: retP,
          showHeroBlade: true,
          forwardWindPhase: t * 0.85,
        });
        c.restore();

        // Mũi tên đối lập vận tốc giữa Nửa trên (Cánh tiến cực nhanh) và Nửa dưới (Gốc cánh lùi gần bằng 0)
        if (advP > 0.1) {
          drawArrow(c, [-140, -255], [165, -255], P.amber, lw(c, 4.2), 13);
        }
        if (retP > 0.1) {
          drawArrow(c, [55, 115], [-25, 115], P.sky, lw(c, 3.5), 10);
        }
      });
    }

    // =========================================================================
    // 2. GIAI ĐOẠN 2 (458.20 - 473.68s): SIDE CUTAWAY TỔNG HỢP 4 KỲ CÔNG & BAY LÊN
    // =========================================================================
    if (toSideP > 0.01) {
      const winFlightP = A.eio(t, CUE.ch6_argument_winning - 0.3, CUE.ch6_end - 0.4);
      const groundY = 245;

      A.withA(c, toSideP, () => {
        drawBgMountainValley(c, groundY, false);

        const heliX = A.lerp(0, 95, winFlightP);
        const heliY = A.lerp(28, -42, winFlightP) + Math.sin(t * 2.8) * 3.5;
        const heliScale = 1.38;

        const pTail = A.eio(t, CUE.ch6_part_tail_rotor - 0.25, CUE.ch6_part_tail_rotor + 0.45);
        const pPlate = A.eio(t, CUE.ch6_part_plate_head - 0.25, CUE.ch6_part_plate_head + 0.45);
        const pSeat = A.eio(t, CUE.ch6_part_armored_seat - 0.25, CUE.ch6_part_armored_seat + 0.45);
        const pGear = A.eio(t, CUE.ch6_part_dry_gearbox - 0.25, CUE.ch6_part_dry_gearbox + 0.45);

        // Khi bước vào câu kết "an argument with it that the engineers keep winning, one flight at a time",
        // lớp vỏ ngoài khép dần lại nhưng vẫn giữ ánh sáng công suất rực rỡ
        const isCutaway = t < CUE.ch6_argument_winning + 1.2;

        c.save();
        c.translate(heliX, heliY);
        c.rotate(-winFlightP * 0.06);
        drawHeli(c, {
          view: isCutaway ? 'cutaway' : 'side',
          scale: heliScale,
          rotorAngle: rotorA,
          collectivePitch: 0.58,
          showGearboxCutaway: true,
          powerFlow: 1,
          highlightMaint: pPlate > 0.2,
          combatHits: {
            seatArmor: pSeat > 0.2,
            dryGearbox: pGear > 0.2,
          },
        });
        c.restore();

        // ---------------------------------------------------------------------
        // 4 VÒNG SÁNG CHỈ ĐIỂM & HỘP CƠ KHÍ ĐỒNG BỘ TỪNG TỪ (458.84 - 468.5s)
        // ---------------------------------------------------------------------
        const calloutFade = 1 - A.eio(t, CUE.ch6_argument_winning - 0.2, CUE.ch6_argument_winning + 1.2);
        if (calloutFade > 0.01) {
          A.withA(c, calloutFade, () => {
            // (1) THE TAIL ROTOR (@458.84s) — Góc dưới trái (x = -395, y = 120)
            if (pTail > 0.01) {
              const tx = heliX - 274 * heliScale;
              const ty = heliY - 72 * heliScale;
              const bx = -395;
              const by = 120;
              A.withA(c, pTail, () => {
                A.circle(c, tx, ty, 44, null, P.amber, lw(c, 3.5));
                A.line(c, [[tx, ty + 44], [bx, by - 68]], P.amber, li, [7, 5]);
                A.rrect(c, bx - 125, by - 68, 250, 136, 12, P.paper, P.ink, lo);
                // Cận cảnh cụm cánh quạt đuôi chống mô-men xoắn
                A.poly(c, [[bx - 75, by + 35], [bx - 25, by - 18], [bx - 4, by - 18], [bx - 35, by + 35]], P.olive, P.ink, lo);
                c.save();
                c.translate(bx - 16, by - 10);
                c.rotate(rotorA * 3.2);
                for (let k = 0; k < 4; k++) {
                  c.save();
                  c.rotate((k * Math.PI) / 2);
                  A.rrect(c, 4, -4, 34, 8, 2, P.amber, P.ink, li);
                  c.restore();
                }
                A.circle(c, 0, 0, 7, P.dark, P.ink, li);
                c.restore();
                drawArrow(c, [bx + 32, by + 28], [bx + 32, by - 36], P.amber, lw(c, 3.5), 11);
                drawArrow(c, [bx + 68, by - 36], [bx + 68, by + 28], P.sky, lw(c, 3.0), 10);
              });
            }


            // (2) THE PLATE UNDER THE HEAD / SWASHPLATE (@459.66s) — Góc trên phải (x = 395, y = -130)
            if (pPlate > 0.01) {
              const px = heliX + 14 * heliScale;
              const py = heliY - 82 * heliScale;
              const bx = 395;
              const by = -130;
              A.withA(c, pPlate, () => {
                A.circle(c, px, py, 38, null, P.amber, lw(c, 3.5));
                A.line(c, [[px + 34, py - 12], [bx - 125, by + 20]], P.amber, li, [7, 5]);
                A.rrect(c, bx - 125, by - 68, 250, 136, 12, P.paper, P.ink, lo);
                // Sơ đồ thu nhỏ đĩa nghiêng (Swashplate) + 2 thanh kéo Pitch links
                const tilt = Math.sin(t * 4) * 0.22;
                A.rrect(c, bx - 8, by - 52, 16, 98, 3, P.slate, P.ink, li);
                c.save();
                c.translate(bx, by);
                c.rotate(tilt);
                A.rrect(c, -68, -10, 136, 20, 6, P.amber, P.ink, lo);
                drawArrow(c, [-52, -12], [-52, -46], P.amber, lw(c, 2.8), 8);
                drawArrow(c, [52, 12], [52, 46], P.sky, lw(c, 2.8), 8);
                c.restore();
              });
            }

            // (3) THE ARMORED SEAT (@460.82s) — Góc dưới phải (x = 395, y = 120)
            if (pSeat > 0.01) {
              const sx = heliX + 84 * heliScale;
              const sy = heliY + 4 * heliScale;
              const bx = 395;
              const by = 120;
              A.withA(c, pSeat, () => {
                A.circle(c, sx, sy, 42, null, P.amber, lw(c, 3.5));
                A.line(c, [[sx + 38, sy + 12], [bx - 125, by - 15]], P.amber, li, [7, 5]);
                A.rrect(c, bx - 125, by - 68, 250, 136, 12, P.paper, P.ink, lo);
                // Ghế bọc giáp vàng hổ phách + lò xo giảm chấn
                A.poly(
                  c,
                  [
                    [bx - 36, by - 44],
                    [bx - 20, by - 44],
                    [bx - 20, by + 12],
                    [bx + 36, by + 12],
                    [bx + 36, by + 26],
                    [bx - 36, by + 26],
                  ],
                  P.amber,
                  P.ink,
                  lo
                );
                A.rrect(c, bx - 16, by + 26, 10, 26, 2, P.slate, P.ink, li);
                A.rrect(c, bx + 14, by + 26, 10, 26, 2, P.slate, P.ink, li);
              });
            }

            // (4) THE GEARBOX THAT RUNS DRY (@461.76s) — Góc trên trái (x = -395, y = -130)
            if (pGear > 0.01) {
              const gx = heliX + 14 * heliScale;
              const gy = heliY - 46 * heliScale;
              const bx = -395;
              const by = -130;
              A.withA(c, pGear, () => {
                A.circle(c, gx, gy, 36, null, P.amber, lw(c, 3.5));
                A.line(c, [[gx - 32, gy - 10], [bx + 125, by + 20]], P.amber, li, [7, 5]);
                A.rrect(c, bx - 125, by - 68, 250, 136, 12, P.paper, P.ink, lo);
                // 2 bánh răng ăn khớp chạy khô + đồng hồ 30 phút
                for (const [dx, dir] of [[-52, 1], [-4, -1]] as const) {
                  c.save();
                  c.translate(bx + dx, by);
                  c.rotate(dir * rotorA * 1.4);
                  A.circle(c, 0, 0, 22, P.amber, P.ink, lo);
                  A.circle(c, 0, 0, 7, P.paper, P.ink, li);
                  c.restore();
                }
                A.circle(c, bx + 64, by, 32, P.bg, P.ink, lo);
                c.beginPath();
                c.moveTo(bx + 64, by);
                c.arc(bx + 64, by, 26, -Math.PI / 2, Math.PI / 2);
                c.closePath();
                c.fillStyle = P.amber;
                c.fill();
                c.strokeStyle = P.ink;
                c.lineWidth = li;
                c.stroke();
              });
            }
          });
        }

        // ---------------------------------------------------------------------
        // 3. CUỘC TRANH LUẬN VỚI VẬT LÝ: LỰC NÂNG KỸ THUẬT CHIẾN THẮNG LỰC CẢN (467.5 - 473.68s)
        // ---------------------------------------------------------------------
        const physP = A.eio(t, CUE.ch6_not_gift_physics - 0.3, CUE.ch6_argument_winning + 1.0);
        if (physP > 0.01) {
          A.withA(c, physP, () => {
            // Mũi tên trọng lực & lực cản vật lý màu đỏ kéo xuống (bị áp đảo dần)
            for (const dx of [-120, 145]) {
              drawArrow(
                c,
                [heliX + dx, heliY + 75],
                [heliX + dx, heliY + 145],
                P.enemy,
                lw(c, 3),
                10
              );
            }
            // Mũi tên lực nâng & kiểm soát kỹ thuật màu vàng hổ phách vươn mạnh lên bầu trời
            for (const dx of [-135, 18, 165]) {
              drawArrow(
                c,
                [heliX + dx, heliY - 25],
                [heliX + dx, heliY - 165 - winFlightP * 35],
                P.amber,
                lw(c, 4.5),
                14
              );
            }
          });
        }
      });
    }

    K.end(c);
  }
}
