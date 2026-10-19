// scenes/sc13.ts — Chương 5, Shot 5.1 (373.70 – 418.70s)
// Góc TOP-DOWN Bản đồ Hậu cần 2 Tầng & Nghịch lý "Tự uống dầu của chính mình":
// - Pha 1 (373.70–403.48s): Chia đội bay làm 2 tầng:
//   + Chiến lược (C-5 Galaxy) chở xe tăng từ Nhà máy vượt đại dương tới Căn cứ Hub hậu phương.
//   + Chiến thuật 4 cánh quạt (C-130 Hercules) chở hàng từ Hub vào đường băng đất ngắn sát tiền tuyến.
//   + Hạng trung (C-17) bắc cầu nối thẳng từ Nhà máy tới đường băng tiền tuyến.
// - Pha 2 (403.48–418.70s): Cận cảnh căn cứ xa không có bồn dầu — 6 chiếc C-17 mở lưng (openDorsal),
//   lộ rõ 3 chiếc nửa dưới chỉ chở toàn túi dầu mềm (bladder tanks) bơm cho 3 chiếc kia bay về.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch5StateAt } from './_state';
import {
  drawC5,
  drawC130,
  drawC17,
  drawTank,
  drawExplosion,
  drawCallout,
  lw,
} from './_assets';

const camMap: K.Cam = { x: 0, y: 0, z: 1.0 };
const camRemoteBase: K.Cam = { x: 0, y: 0, z: 1.12 };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = ch5StateAt(t);
    const inRemoteFuel = t >= CUE.ch5_fuel_appetite;
    const cam = inRemoteFuel ? camRemoteBase : camMap;

    A.clear(c, P.bg);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    // ── PHA 1 (373.70 – 403.48s): Bản đồ Hậu cần 2 Tầng (Strategic vs. Tactical vs. C-17 Bridge) ──
    if (!inRemoteFuel) {
      // 1. Vùng Nhà máy Hậu phương (Homeland Factory: x = -820..-430)
      A.rrect(c, -820, -340, 390, 680, 14, P.bg2, P.ink, outW);
      // Nhà xưởng mái răng cưa + sân tập kết xe tăng
      for (let fx = -770; fx <= -590; fx += 90) {
        A.rrect(c, fx, -290, 78, 110, 4, P.slate, P.ink, inW);
        A.line(c, [[fx + 10, -260], [fx + 68, -260]], P.paper, inW);
      }
      drawTank(c, -710, -95, { view: 'top', scale: 0.42 });
      drawTank(c, -710, -25, { view: 'top', scale: 0.42 });

      // 2. Đại dương ngăn cách (Ocean: x = -430..-110)
      A.rrect(c, -430, -340, 320, 680, 0, P.sky, P.ink, inW);
      A.withA(c, 0.35, () => {
        for (let wy = -260; wy <= 260; wy += 85) {
          A.line(c, [[-380, wy], [-160, wy]], P.white, lw(c, 3), [18, 14]);
        }
      });

      // 3. Căn cứ Hub Hậu phương lớn (Major Rear Hub Base: x = -110..310)
      A.rrect(c, -110, -340, 420, 680, 0, P.sand, P.ink, outW);
      // Đường băng bê tông dài 3.5 km của Rear Hub
      A.rrect(c, -75, -175, 340, 78, 6, P.light, P.ink, outW);
      A.line(c, [[-55, -136], [245, -136]], P.white, lw(c, 3), [16, 12]);
      // Kho bãi trung chuyển tại Hub
      A.rrect(c, -55, -55, 145, 58, 4, P.bg2, P.ink, inW);

      // 4. Vùng Chiến sự Tiền tuyến & Đường băng đất ngắn (Front-line Rough Strip: x = 310..820)
      A.rrect(c, 310, -340, 510, 680, 14, P.oliveLight, P.ink, outW);
      // Đường băng đất nện ngắn & gồ ghề (Short Rough Dirt Strip)
      A.rrect(c, 455, -155, 195, 56, 4, P.sand, P.ink, outW);
      A.line(c, [[455, -155], [650, -155]], P.enemy, inW, [8, 6]);
      A.line(c, [[455, -99], [650, -99]], P.enemy, inW, [8, 6]);
      // Chớp nổ giao tranh ở tiền tuyến bên phải (x = 735)
      const battlePulse = (t * 1.4) % 1;
      drawExplosion(c, 745, -135, battlePulse, 26);
      drawExplosion(c, 725, 45, (t * 1.4 + 0.5) % 1, 22);

      // ── Tầng 1: Vận tải cơ Chiến lược khổng lồ C-5 Galaxy (Nhà máy → Vượt Đại dương → Rear Hub) ──
      const c5P = st.c5Flight;
      const c5X = A.lerp(-585, 85, c5P);
      const c5Y = A.lerp(-136, -136, c5P) - Math.sin(c5P * Math.PI) * 55;
      // Đường bay chiến lược vượt đại dương
      A.line(c, [[-585, -136], [85, -136]], P.paper, lw(c, 4), [14, 8]);
      drawC5(c, c5X, c5Y, { view: 'top', scale: 0.44 });

      // Khi C-5 đáp tới Hub (t >= 388.5s), xe tăng được dỡ xuống sân Hub
      const hubTankAlpha = A.sm(t, 388.2, 389.5);
      A.withA(c, hubTankAlpha, () => {
        drawTank(c, 155, -35, { view: 'top', scale: 0.42 });
      });

      // ── Tầng 2: Vận tải cơ Chiến thuật 4 cánh quạt C-130 Hercules (Rear Hub → Đường băng đất ngắn) ──
      const c130Enter = A.sm(t, CUE.ch5_two_tiers, CUE.ch5_two_tiers + 0.8);
      A.withA(c, c130Enter, () => {
        const c130P = st.c130Flight;
        const hX = A.lerp(135, 545, c130P);
        const hY = A.lerp(-126, -126, c130P) - Math.sin(c130P * Math.PI) * 35;
        A.line(c, [[135, -126], [545, -126]], P.oliveDark, lw(c, 3.5), [10, 6]);
        drawC130(c, hX, hY, { view: 'top', scale: 0.44, propPhase: t });
      });

      // ── Cầu nối cả 2 thế giới: Vận tải cơ hạng trung C-17 bay thẳng từ Nhà máy tới Đường băng đất tiền tuyến ──
      const bridgeEnter = A.sm(t, CUE.ch5_bridge_c17 - 0.3, CUE.ch5_bridge_c17 + 0.5);
      A.withA(c, bridgeEnter, () => {
        const bP = st.c17Bridge;
        // Đường vòng cung màu vàng hổ phách nối thẳng từ Nhà máy (-585, 145) tới Tiền tuyến (545, 95)
        c.save();
        c.beginPath();
        c.moveTo(-585, 145);
        c.quadraticCurveTo(-20, 265, 545, 95);
        c.strokeStyle = P.amber;
        c.lineWidth = lw(c, 5.5);
        c.setLineDash([16, 8]);
        c.stroke();
        c.restore();

        // Vị trí C-17 trên đường cong Bezier bậc 2
        const u = 1 - bP;
        const bx = u * u * (-585) + 2 * u * bP * (-20) + bP * bP * 545;
        const by = u * u * 145 + 2 * u * bP * 265 + bP * bP * 95;
        drawC17(c, bx, by, { view: 'top', scale: 0.46, hiWing: 1, jetBlast: 0.9 });
      });
    }

    // ── PHA 2 (403.48 – 418.70s): Căn cứ xa không có bồn dầu & Đội bay 50% chở túi dầu (Bladder Tanks) ──
    if (inRemoteFuel) {
      // Nền sân bay dã chiến xa xôi (Remote Desert/Dirt Base)
      A.rrect(c, -820, -345, 1640, 690, 16, P.sand, P.ink, outW);
      // Bãi đỗ đất nện trung tâm
      A.rrect(c, -450, -295, 1140, 590, 12, P.bg2, P.ink, outW);

      // Bên trái (x = -635): Khu bồn chứa nhiên liệu trống rỗng bị gạch chéo đỏ (No Fuel Tanks)
      for (const ty of [-115, 0, 115]) {
        A.circle(c, -635, ty, 44, P.paper, P.slate, outW);
        A.circle(c, -635, ty, 28, P.bg, P.slate, inW);
      }
      const noFuelP = A.sm(t, CUE.ch5_remote_base - 0.5, CUE.ch5_remote_base + 0.8);
      A.withA(c, noFuelP, () => {
        A.line(c, [[-705, -185], [-565, 185]], P.enemy, lw(c, 7));
        A.line(c, [[-565, -185], [-705, 185]], P.enemy, lw(c, 7));
      });

      // Đội hình 6 chiếc C-17 đỗ thành 2 hàng (3 chiếc hàng trên chở Xe tăng, 3 chiếc hàng dưới chở Túi dầu Bladder)
      const slotXs = [-235, 115, 465];
      const enterFleet = A.eio(t, CUE.ch5_fuel_appetite, CUE.ch5_remote_base + 0.6);
      const flyHomeP = A.ei(t, CUE.ch5_fly_home - 0.2, CUE.ch5_end);

      slotXs.forEach((sx, idx) => {
        const delay = idx * 0.12;
        const arriveP = A.clamp01((enterFleet - delay) / (1 - delay * 0.5));
        const topX = A.lerp(sx - 180, sx, arriveP) + flyHomeP * 260;
        const botX = A.lerp(sx - 180, sx, arriveP);

        // Ống bơm nhiên liệu từ 3 máy bay chở túi dầu (hàng dưới y = 155) lên 3 máy bay chở hàng (hàng trên y = -155)
        if (st.fuelTransfer > 0.01 && flyHomeP < 0.25) {
          A.line(c, [[sx, 105], [sx, -105]], P.dark, lw(c, 8));
          A.line(c, [[sx, 105], [sx, -105]], P.amber, lw(c, 4), [12, 10], -t * 75);
          // Mũi tên dòng nhiên liệu bơm lên hàng trên
          const pulseY = A.lerp(85, -85, (t * 1.6 + idx * 0.3) % 1);
          A.poly(c, [[sx, pulseY - 12], [sx - 10, pulseY + 8], [sx + 10, pulseY + 8]], P.amber, P.ink, inW);
        }

        // Hàng trên (y = -155): 3 chiếc C-17 chở xe tăng chiến đấu, được tiếp dầu để bay về
        drawC17(c, topX, -155, {
          view: 'top',
          scale: 0.42,
          openDorsal: st.dorsalOpen,
          interiorLoad: 'tank',
          jetBlast: flyHomeP > 0.05 ? 1 : 0,
        });

        // Hàng dưới (y = +155): 3 chiếc C-17 chỉ chở toàn túi bồn dầu mềm (Bladder Tanks) màu vàng P.amber!
        drawC17(c, botX, 155, {
          view: 'top',
          scale: 0.42,
          openDorsal: st.dorsalOpen,
          interiorLoad: 'bladders',
        });
      });
    }

    K.end(c);

    // Callout tối thiểu: C-5 / C-130 / C-17 ở Pha 1 và 50% FUEL FLEET ở Pha 2
    const c5Label = A.win(t, CUE.ch5_strategic_c5 + 0.3, 389.8, 0.3, 0.3);
    drawCallout(c, cam, -250, -195, 0, -48, 'C-5 · STRATEGIC', c5Label, P.sky);

    const c130Label = A.win(t, CUE.ch5_tactical_c130 + 0.3, 398.4, 0.3, 0.3);
    drawCallout(c, cam, 340, -165, 0, -48, 'C-130 · TACTICAL', c130Label, P.olive);

    const c17Label = A.win(t, CUE.ch5_bridge_c17 + 0.2, 403.3, 0.25, 0.25);
    drawCallout(c, cam, -20, 215, 0, -48, 'C-17 · BRIDGES BOTH', c17Label, P.amber);

    const bladderLabel = A.win(t, CUE.ch5_bladder_tanks + 0.2, 418.5, 0.3, 0.3);
    drawCallout(c, cam, 115, 155, 0, -85, '50% FLEET = FUEL BLADDERS', bladderLabel, P.amber);
  }
}
