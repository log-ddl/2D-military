// sc14.ts (458.70 – 482.273s): Kết phim — Tái hiện chuỗi 11 chiếc Victor nâng cánh Vulcan vượt Đại Tây Dương 1982 (TOP)
// và đại cảnh góc ngang (SIDE) điểm danh đồng bộ 5 cơ chế kỹ thuật giúp sức mạnh không quân xóa sổ khoảng cách địa lý.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import {
  drawOceanMapBg,
  drawSkySideBg,
  drawVulcan,
  drawVictor,
  drawModernTanker,
  drawStrikeFighter,
  drawCarrierFighter,
  drawFlyingBoom,
  drawHoseAndDrogue,
  lwO,
  lwI,
} from './_assets';
import { ATLANTIC, CUE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const isAtlanticRecap = t < 465.8;

    if (isAtlanticRecap) {
      // ── PHẦN A (458.70 – 465.8s): Góc TOP — 11 chiếc Victor xếp chuỗi tiếp sức đưa chiếc Vulcan vượt Đại Tây Dương ──
      const cam = K.track(
        t,
        [
          [458.7, { x: -30, y: -10, z: 0.88 }],
          [465.8, { x: 40, y: 30, z: 0.94 }],
        ],
        A.eio
      );

      A.clear(c, P.bg2);
      K.begin(c, cam);
      drawOceanMapBg(c, cam, 'atlantic', t);

      const lo = lwO(c);
      const li = lwI(c);
      const [ax, ay] = ATLANTIC.ascension; // [-480, -340]
      const [fx, fy] = ATLANTIC.falkland;  // [480, 340]
      const routeAng = Math.atan2(fy - ay, fx - ax);

      // Đường cầu hàng không màu vàng hổ phách nối liền 12.600 km từ Ascension tới Falkland
      A.line(c, [[ax, ay], [fx, fy]], P.amber, lo * 1.3, [A.px(c, 12), A.px(c, 8)]);

      // Vẽ 11 chiếc Victor xếp dọc hai bên đường bay truyền xăng tiếp sức
      for (let i = 0; i < 11; i++) {
        const u = 0.08 + (i / 10) * 0.74;
        const side = i % 2 === 0 ? -1 : 1;
        const bx = A.lerp(ax, fx, u) + side * 68;
        const by = A.lerp(ay, fy, u) - side * 48;
        const appear = A.eio(t, 458.8 + i * 0.22, 459.6 + i * 0.22);

        if (appear > 0.01) {
          A.withA(c, appear, () => {
            // Tia truyền nhiên liệu từ mỗi chiếc Victor vào trục đường bay chính
            A.line(
              c,
              [
                [bx, by],
                [A.lerp(ax, fx, u), A.lerp(ay, fy, u)],
              ],
              P.amber,
              li
            );
            c.save();
            c.translate(bx, by);
            c.rotate(routeAng);
            drawVictor(c, 'top', { scale: 0.56 * appear, hoseOut: 0.7 });
            c.restore();
          });
        }
      }

      // Chiếc Vulcan cánh tam giác bay dọc trục chính tiến về quần đảo Falkland
      const vProg = A.eio(t, 458.7, 465.6);
      const vx = A.lerp(ax + 120, fx - 110, vProg);
      const vy = A.lerp(ay + 85, fy - 78, vProg);

      c.save();
      c.translate(vx, vy);
      c.rotate(routeAng);
      drawVulcan(c, 'top', { scale: 0.92, fuelLevel: 0.95 });
      c.restore();

      K.end(c);
    } else {
      // ── PHẦN B (465.8 – 482.273s): Đại cảnh góc SIDE — Điểm danh 5 cơ chế kỹ thuật xóa sổ địa lý ──
      const cam = K.track(
        t,
        [
          [465.8, { x: 25, y: -25, z: 1.02 }],
          [474.2, { x: 25, y: -25, z: 1.02 }],
          // Kéo rộng khung hình ở đoạn kết (474.8 – 482.273s) đón thêm Vulcan & CarrierFighter bay đội hình
          [476.5, { x: -35, y: -30, z: 0.88 }],
          [482.273, { x: -35, y: -30, z: 0.88 }],
        ],
        A.eio
      );

      A.clear(c, P.bg);
      K.begin(c, cam);
      drawSkySideBg(c, cam, t, { speed: 240, highAltBand: true });

      const lo = lwO(c);
      const li = lwI(c);

      // Các mốc kích hoạt tuần tự 5 cơ chế theo đúng lời thoại tổng kết:
      // (1) half_empty_takeoff_recap @ 468.06s
      // (2) winged_boom_recap        @ 469.50s
      // (3) trailing_basket_recap    @ 470.54s
      // (4) static_wire_recap        @ 471.68s
      // (5) balancing_pumps_recap    @ 473.06s
      const p1Takeoff = A.sm(t, CUE.half_empty_takeoff_recap - 0.3, CUE.half_empty_takeoff_recap + 0.4);
      const p2Boom = A.sm(t, CUE.winged_boom_recap - 0.3, CUE.winged_boom_recap + 0.4);
      const p3Basket = A.eio(t, CUE.trailing_basket_recap - 0.3, CUE.trailing_basket_recap + 0.8);
      const p4Wire = A.sm(t, CUE.static_wire_recap - 0.2, CUE.static_wire_recap + 0.4);
      const p5Balance = A.sm(t, CUE.balancing_pumps_recap - 0.2, CUE.balancing_pumps_recap + 0.5);
      const pEraseGeo = A.eio(t, CUE.erase_geography - 0.2, CUE.tanker_decides_reach + 1.0);

      // Đường vươn tầm chiến lược vàng hổ phách chạy xuyên chân trời ở đoạn kết ("erase geography")
      if (pEraseGeo > 0.01) {
        A.withA(c, pEraseGeo * 0.55, () => {
          for (const yLine of [-235, 195]) {
            A.line(
              c,
              [
                [-950, yLine],
                [950, yLine],
              ],
              P.amber,
              lo * 1.2,
              [A.px(c, 16), A.px(c, 10)]
            );
          }
        });
      }

      const tx = 310;
      const ty = -140;
      const fx = -265;
      const fy = 85;

      // Khi cơ chế #5 (balancing_pumps_recap @ 473.06s) kích hoạt, mở lớp vỏ cutaway để thấy 3 bình xăng cân bằng + CG
      const mode: 'side' | 'cutaway' = p5Balance > 0.5 ? 'cutaway' : 'side';
      const fillProgress = A.lerp(0.5, 0.92, A.ph(t, 469.5, 478.0));

      // 1. Vẽ Modern Tanker dẫn đầu ở bên phải-trên (tx = 310, ty = -140)
      c.save();
      c.translate(tx, ty);
      drawModernTanker(c, mode, {
        scale: 1.25,
        wingPods: true,
        hasBoom: true,
        tanks: { wing: 0.78, center: 0.80, tail: 0.76 },
        valvesOpen: [true, true, true],
        nitrogen: 1,
        cgShift: 0,
      });
      c.restore();

      // 2. Cơ chế #2: Cần cứng có cánh chữ V (Winged Boom @ 469.50s) nối từ đuôi Tanker xuống lưng StrikeFighter
      const bx0 = tx - 210;
      const by0 = ty + 16;
      const bx1 = fx - 16;
      const by1 = fy - 24;

      if (p2Boom > 0.01) {
        const ext = A.lerp(0.25, 0.74, p2Boom);
        drawFlyingBoom(
          c,
          bx0,
          by0,
          A.lerp(bx0 - 60, bx1, p2Boom),
          A.lerp(by0 + 35, by1, p2Boom),
          {
            extension: ext,
            locked: p2Boom > 0.9,
            flow: p2Boom > 0.9 ? 1 : 0,
            flowPhase: t,
          }
        );
      }

      // 3. Cơ chế #4: Dây tiếp địa tĩnh điện màu xanh da trời (Static Ground Wire @ 471.68s)
      if (p4Wire > 0.01) {
        A.withA(c, p4Wire, () => {
          A.line(c, [[bx0, by0 - 9], [bx1, by1 - 9]], P.sky, lo * 1.3);
          A.circle(c, bx0, by0 - 9, 6, P.sky, P.ink, li);
          A.circle(c, bx1, by1 - 9, 6, P.sky, P.ink, li);
        });
      }

      // 4. Cơ chế #3: Ống mềm và rổ phễu (Trailing Basket @ 470.54s) xả ngược về phía sau từ pod cánh tiếp cho CarrierFighter
      if (p3Basket > 0.01) {
        const hx0 = tx - 22; // 288
        const hy0 = ty + 34; // -106
        const hx1 = A.lerp(hx0 - 30, 122, p3Basket);
        const hy1 = A.lerp(hy0 + 15, 25, p3Basket);
        drawHoseAndDrogue(c, hx0, hy0, hx1, hy1, {
          flow: p3Basket > 0.85 ? 1 : 0,
          flowPhase: t,
          basketScale: 0.95,
        });

        // Chiếc CarrierFighter của Hải quân bay ở làn giữa (x = 4, y = 29) cắm đầu Probe vào rổ phễu tại (122, 25)
        A.withA(c, p3Basket, () => {
          c.save();
          c.translate(4, 29);
          drawCarrierFighter(c, 'side', {
            scale: 1.12,
            probeExtended: 1,
          });
          c.restore();
        });
      }

      // 5. Cơ chế #1 & #5: StrikeFighter mang vũ khí nặng + bình xăng từ 1/2 đầy dần lên & cân bằng 3 khoang
      c.save();
      c.translate(fx, fy);
      drawStrikeFighter(c, mode, {
        scale: 1.25,
        hasReceptacle: true,
        bombsCount: p1Takeoff > 0.1 ? 3 : 2,
        fuelLevel: fillProgress,
        tanks: { fwd: fillProgress, mid: fillProgress, aft: fillProgress },
        valvesOpen: [true, true, true],
        nitrogen: 1,
        cgShift: 0,
        afterburner: 0.45 + 0.35 * pEraseGeo,
      });
      c.restore();

      // Vòng nhấn sáng ngắn gọn tại đúng vị trí từng bộ phận khi giọng đọc điểm tên (không dùng chữ)
      const b1 = A.bump(t, CUE.half_empty_takeoff_recap - 0.1, 1.3);
      if (b1 > 0.01) {
        A.circle(c, fx - 12, fy + 4, 48, 'rgba(245, 158, 11, 0.18)', P.amber, lo * b1);
      }
      const b2 = A.bump(t, CUE.winged_boom_recap - 0.1, 1.3);
      if (b2 > 0.01) {
        A.circle(c, (bx0 + bx1) / 2, (by0 + by1) / 2, 46, 'rgba(245, 158, 11, 0.18)', P.amber, lo * b2);
      }
      const b3 = A.bump(t, CUE.trailing_basket_recap - 0.1, 1.3);
      if (b3 > 0.01) {
        A.circle(c, 138, 25, 44, 'rgba(245, 158, 11, 0.18)', P.amber, lo * b3);
      }
      const b4 = A.bump(t, CUE.static_wire_recap - 0.1, 1.3);
      if (b4 > 0.01) {
        A.circle(c, bx1, by1 - 8, 42, 'rgba(56, 189, 248, 0.22)', P.sky, lo * b4);
      }
      const b5 = A.bump(t, CUE.balancing_pumps_recap - 0.1, 1.5);
      if (b5 > 0.01) {
        A.circle(c, tx - 6, ty - 2, 54, 'rgba(56, 189, 248, 0.20)', P.sky, lo * b5);
      }

      // 6. Ở đoạn kết (474.8 – 482.273s), chiếc oanh tạc cơ Vulcan lịch sử bay hộ tống bên cánh trái tạo đại cảnh khép lại phim
      if (pEraseGeo > 0.01) {
        A.withA(c, pEraseGeo, () => {
          const vx = A.lerp(-660, -535, pEraseGeo);
          const vy = -125;
          c.save();
          c.translate(vx, vy);
          drawVulcan(c, 'side', { scale: 1.05, fuelLevel: 0.95 });
          c.restore();
        });
      }

      K.end(c);
    }
  }
}
