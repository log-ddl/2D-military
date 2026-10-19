// scenes/sc15.ts — Chương 6, Cảnh 15 (397.08 - 427.84s): Máy bay lai Tilt-Rotor (V-22 Osprey) & Sự đánh đổi
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
  drawBgAirfield,
  drawTiltRotor,
  drawHeli,
} from './_assets';

export default class extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const rotorA = mainRotorAngleAt(t);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Chuyển động của Tilt-rotor qua 3 giai đoạn:
    // 1) 397.08 - 405.44: Bầu động cơ dựng đứng 90 độ, cất cánh thẳng đứng như trực thăng
    // 2) 405.44 - 412.60: Xoay bầu động cơ về 0 độ ngang, bay vọt nhanh & xa như máy bay cánh bằng
    // 3) 412.60 - 427.84: Dựng lại 90 độ treo thấp, hiện mặt cắt cơ khí phức tạp & luồng gió thổi bay đất đá (debris)
    const takeoffP = A.eio(t, CUE.ch6_point_up_takeoff - 0.8, CUE.ch6_point_up_takeoff + 1.6);
    const tiltFwdP = A.eio(t, CUE.ch6_tilt_forward - 0.2, CUE.ch6_tilt_forward + 1.8);
    const tiltBackP = A.eio(t, CUE.ch6_complex_maintain - 0.4, CUE.ch6_complex_maintain + 1.4);

    const nacelleDeg = 90 * (1 - tiltFwdP * (1 - tiltBackP));
    const dashFwd = A.eio(t, CUE.ch6_flies_like_plane - 0.6, CUE.ch6_faster_farther + 1.5) * (1 - tiltBackP);

    const trX = A.lerp(-140, 120, dashFwd) - tiltBackP * 85;
    const trY = A.lerp(144, -42, takeoffP) + tiltBackP * 68 + Math.sin(t * 3.0) * 3 * takeoffP;

    K.begin(c, { x: 0, y: 15, z: 1.12 });

    drawBgSkyGrid(c);
    const groundY = 220;
    drawBgAirfield(c, groundY);

    // =========================================================================
    // 1. VẼ MÁY BAY LAI TILT-ROTOR CHỦ ĐẠO & CUNG XOAY GÓC NACELLE (90° -> 0°)
    // =========================================================================
    // Mũi tên lực nâng thẳng đứng khi cất cánh (401.5 - 405.4s)
    const upLiftA = A.win(t, CUE.ch6_tilt_rotor, CUE.ch6_tilt_forward + 0.2, 0.5, 0.4);
    if (upLiftA > 0.01) {
      A.withA(c, upLiftA, () => {
        for (const dx of [-95, 120]) {
          drawArrow(c, [trX + dx, trY + 55], [trX + dx, trY - 125], P.amber, lw(c, 3.2), 11);
        }
      });
    }

    // Vệt tốc độ cao và mũi tên đẩy ngang khi bầu động cơ xoay về 0 độ (406.0 - 412.5s)
    const planeModeA = A.win(t, CUE.ch6_tilt_forward + 0.5, CUE.ch6_complex_maintain, 0.5, 0.5);
    if (planeModeA > 0.01) {
      A.withA(c, planeModeA, () => {
        for (const dy of [-65, -15, 35]) {
          A.line(c, [[trX - 380, trY + dy], [trX - 210, trY + dy]], P.sky, lw(c, 3.2), [22, 14]);
        }
        drawArrow(c, [trX + 185, trY - 32], [trX + 315, trY - 32], P.amber, lw(c, 3.8), 13);
      });
    }

    // Vẽ chiếc Tilt-rotor
    c.save();
    c.translate(trX, trY);
    drawTiltRotor(c, nacelleDeg, rotorA * 1.35, 1.32);

    // Cung tròn chỉ góc xoay của bầu động cơ Nacelle ngay trên đầu mút cánh (tâm tại x=16, y=-42)
    const showArcA = A.win(t, CUE.ch6_point_up_takeoff - 0.5, CUE.ch6_complex_maintain + 1.0, 0.4, 0.5);
    if (showArcA > 0.01) {
      A.withA(c, showArcA, () => {
        drawArc(c, 16, -42, 92, -Math.PI / 2, 0, P.amber, lw(c, 3), [8, 6]);
        // Chấm đánh dấu góc hiện tại trên cung
        const rad = -(nacelleDeg * Math.PI) / 180;
        A.circle(c, 16 + Math.cos(rad) * 92, -42 + Math.sin(rad) * 92, 7, P.amber, P.ink, li);
      });
    }
    c.restore();

    // =========================================================================
    // 2. THƯỚC ĐỐI CHIẾU TỐC ĐỘ & TẦM BAY XA HƠN TRỰC THĂNG (409.4 - 413.2s)
    // =========================================================================
    const rangeBarA = A.win(t, CUE.ch6_faster_farther - 0.5, CUE.ch6_complex_maintain + 0.4, 0.4, 0.4);
    if (rangeBarA > 0.01) {
      const rangeP = A.eio(t, CUE.ch6_faster_farther - 0.3, CUE.ch6_faster_farther + 1.6);
      A.withA(c, rangeBarA, () => {
        const bx = -320;
        const by = 115;
        A.rrect(c, bx - 40, by - 48, 680, 108, 12, P.paper, P.ink, lo);

        // Thanh trên: Tilt-rotor vọt nhanh và đi xa gấp đôi (P.amber)
        drawArrow(c, [bx, by - 16], [bx + A.lerp(80, 560, rangeP), by - 16], P.amber, lw(c, 5), 13);

        // Thanh dưới: Trực thăng truyền thống chậm & ngắn hơn (P.olive)
        drawArrow(c, [bx, by + 28], [bx + A.lerp(60, 235, rangeP), by + 28], P.olive, lw(c, 4), 11);
        c.save();
        c.translate(bx + A.lerp(60, 235, rangeP) + 48, by + 26);
        drawHeli(c, { view: 'side', scale: 0.24, rotorAngle: rotorA });
        c.restore();
      });
    }

    // =========================================================================
    // 3. MẶT TRÁI CỦA SỰ ĐÁNH ĐỔI: CƠ KHÍ PHỨC TẠP & GIÓ LỐC THỔI ĐẤT ĐÁ (413.0 - 427.84s)
    // =========================================================================
    const complexP = A.eio(t, CUE.ch6_complex_maintain - 0.3, CUE.ch6_complex_maintain + 0.9);
    if (complexP > 0.01) {
      const cx = 315;
      const cy = -75;
      A.withA(c, complexP, () => {
        // Đường gióng từ khớp xoay bầu động cơ ra bảng mặt cắt cơ khí phức tạp
        A.line(c, [[trX + 20, trY - 42], [cx - 165, cy + 10]], P.amber, li, [7, 5]);
        A.rrect(c, cx - 165, cy - 105, 330, 210, 14, P.paper, P.ink, lo);

        // Tổ hợp 3 bánh răng truyền động chéo góc + xi lanh thủy lực xoay bầu động cơ (More complex)
        const gears: [number, number, number, number, string][] = [
          [cx - 85, cy - 22, 28, 1, P.amber],
          [cx - 34, cy - 22, 22, -1.3, P.slate],
          [cx - 58, cy + 24, 24, 1.1, P.oliveLight],
        ];
        for (const [gx, gy, gr, dir, col] of gears) {
          c.save();
          c.translate(gx, gy);
          c.rotate(rotorA * dir);
          A.circle(c, 0, 0, gr, col, P.ink, lo);
          for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI) / 4;
            A.rrect(c, Math.cos(a) * (gr - 2) - 4, Math.sin(a) * (gr - 2) - 4, 8, 8, 1, col, P.ink, li);
          }
          A.circle(c, 0, 0, 8, P.paper, P.ink, li);
          c.restore();
        }

        // Quả tạ nặng & Cột chi phí cao bên phải bảng ("heavier to maintain and costlier")
        const wx = cx + 68;
        const wy = cy - 22;
        A.poly(c, [[wx - 26, wy - 18], [wx + 26, wy - 18], [wx + 36, wy + 24], [wx - 36, wy + 24]], P.dark, P.ink, lo);
        drawArc(c, wx, wy - 18, 12, Math.PI, 0, P.ink, lo);

        // 4 thanh chi phí đỏ cam xếp chồng bên dưới
        for (let k = 0; k < 4; k++) {
          A.rrect(c, cx - 125 + k * 66, cy + 62, 54, 18, 4, k >= 2 ? P.enemy : P.amber, P.ink, li);
        }
      });
    }

    // Luồng gió cực mạnh từ 2 cánh quạt khổng lồ thổi tung đất đá và mảnh vỡ ("blow dust and debris about" @ 418.16s)
    const debrisP = A.eio(t, CUE.ch6_blow_dust_debris - 0.5, CUE.ch6_blow_dust_debris + 1.0);
    if (debrisP > 0.01) {
      A.withA(c, debrisP, () => {
        // Cột gió cực mạnh đập thẳng xuống mặt sân bay
        for (const dx of [-65, 0, 65]) {
          drawArrow(c, [trX + dx, trY + 55], [trX + dx * 1.8, groundY - 6], P.enemy, lw(c, 3.6), 12);
        }

        // Đá sỏi, mảnh vỡ (debris) và bụi cát bị thổi văng tung tóe sang hai bên
        for (let i = 0; i < 14; i++) {
          const side = i % 2 === 0 ? 1 : -1;
          const cyc = ((t * 1.35 + i * 0.19) % 1);
          const dist = A.lerp(45, 340, cyc) * side;
          const height = Math.sin(cyc * Math.PI) * (45 + (i % 4) * 22);
          const rx = trX + dist;
          const ry = groundY - 8 - height;

          c.save();
          c.translate(rx, ry);
          c.rotate(t * 6 * side + i);
          if (i % 3 === 0) {
            // Mảnh vỡ góc cạnh (debris)
            A.poly(c, [[-9, -6], [8, -8], [11, 5], [-6, 8]], P.slate, P.ink, li);
          } else {
            // Đám bụi cát xoáy
            A.circle(c, 0, 0, 14 * (1 - cyc * 0.4), P.sand, P.amber, li);
          }
          c.restore();
        }
      });
    }

    K.end(c);
  }
}
