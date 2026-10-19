// sc01.ts (0.00 – 17.42s): Chiến dịch Falkland 1982 — 21 quả bom, khoảng cách 6.000 km
// và chiếc Avro Vulcan cạn sạch nhiên liệu giữa Đại Tây Dương nếu đi một mình.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import { drawOceanMapBg, drawVulcan, lwO, lwI } from './_assets';
import { ATLANTIC, atlanticPt, atlanticCamCh1, CUE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = atlanticCamCh1(t);
    A.clear(c, P.bg);

    K.begin(c, cam);
    drawOceanMapBg(c, cam, 'atlantic', t);

    const lo = lwO(c);
    const li = lwI(c);

    // 1. Nhịp mở đầu (0.00 – 6.60s): Chiếc Vulcan lướt qua đường băng Falkland, thả chuỗi 21 quả bom nổ dọc đường băng
    const openAlpha = 1 - A.sm(t, 6.2, 7.2);
    if (openAlpha > 0.01) {
      A.withA(c, openAlpha, () => {
        // 21 vụ nổ nhỏ chạy dọc đường băng Port Stanley (từ x=495..565, y=334)
        for (let i = 0; i < 21; i++) {
          const tHit = 1.4 + i * 0.14;
          const pExp = A.ph(t, tHit, tHit + 0.75);
          const bx = 492 + i * 3.6;
          const by = 334 + ((i % 2) - 0.5) * 3;
          if (t >= tHit) {
            A.circle(c, bx, by, 2.8, P.dark, P.ink, li * 0.5);
          }
          if (pExp > 0 && pExp < 1) {
            FX.explosion(c, bx, by, 14, pExp, li);
          }
        }
        // Bóng chiếc Vulcan lướt qua đường băng trong giây đầu
        const vx = A.lerp(420, 610, A.ph(t, 0.0, 5.8));
        const vy = A.lerp(310, 355, A.ph(t, 0.0, 5.8));
        c.save();
        c.translate(vx, vy);
        c.rotate(0.22);
        drawVulcan(c, 'top', { scale: 0.55, bombBayOpen: true });
        c.restore();
      });
    }

    // 2. Đường nối khoảng cách 6.000 km từ căn cứ đảo núi lửa Ascension (-480,-340) tới Falkland (480,340)
    const routeP = A.eio(t, CUE.british_airbase, CUE.km_6000 + 0.8);
    if (routeP > 0.01) {
      const [ax, ay] = ATLANTIC.ascension;
      const [fx, fy] = ATLANTIC.falkland;
      const rx = A.lerp(ax, fx, routeP);
      const ry = A.lerp(ay, fy, routeP);

      // Vòng mốc căn cứ Ascension và mục tiêu Falkland
      A.circle(c, ax, ay, 24, null, P.sky, lo);
      A.circle(c, fx, fy, 24 * A.sm(t, 5.5, 6.5), null, P.enemy, lo);

      // Tuyến đường đứt 6.000 km xuyên Đại Tây Dương
      A.line(c, [[ax, ay], [rx, ry]], P.ink2, lo, [A.px(c, 14), A.px(c, 10)]);
    }

    // 3. Nhịp chiếc Vulcan đi một mình (11.86 – 17.42s): Xuất phát từ Ascension, thanh xăng cạn sạch ở giữa biển (u = 0.46),
    // rồi thu hồi giả định về lại căn cứ Ascension ở 16.6..17.38s để nối mượt sang sc02 (17.42s)
    if (t >= CUE.avro_vulcan - 1.6) {
      const soloP = A.eio(t, CUE.avro_vulcan - 1.2, 16.0);
      const resetP = A.eio(t, 16.5, 17.38);
      const u = soloP * 0.46 * (1 - resetP);
      const [vx, vy, ang] = atlanticPt(u, 0);
      const fuel = A.lerp(Math.max(0, 1 - soloP * 1.15), 1.0, resetP);

      // Vòng bán kính tối đa khi không tiếp dầu (chặn đứng giữa biển)
      const failShow = A.win(t, CUE.nowhere_near_fuel - 0.3, 17.1, 0.5, 0.4);
      if (failShow > 0.01) {
        const [endX, endY] = atlanticPt(0.46, 0);
        A.withA(c, failShow, () => {
          A.line(c, [ATLANTIC.ascension, [vx, vy]], P.amber, lo);
          A.line(c, [[endX, endY], ATLANTIC.falkland], P.enemy, lo, [A.px(c, 10), A.px(c, 10)]);
          A.circle(c, endX, endY, 32, 'rgba(180, 73, 60, 0.16)', P.enemy, lo);
        });
      }

      c.save();
      c.translate(vx, vy);
      c.rotate(ang);
      drawVulcan(c, 'top', { scale: A.lerp(0.95, 0.72, resetP), fuelLevel: fuel });
      c.restore();

      // Dấu X đỏ báo cạn sạch xăng ở cuối nhịp (15.3 – 16.9s)
      const xAlpha = A.win(t, CUE.nowhere_near_fuel + 0.2, 16.95, 0.3, 0.3);
      if (xAlpha > 0.01) {
        const [ex, ey] = atlanticPt(0.46, 0);
        const [sx, sy] = K.toScreen(cam, ex + 55, ey - 45);
        K.end(c);
        UI.xMark(c, sx, sy, 26, xAlpha, P.enemy, 7);
        K.begin(c, cam);
      }
    }

    K.end(c);

    // ── Callout tối giản (tối đa 1 cùng lúc, đúng mốc số liệu voice) ──
    const p21 = A.win(t, CUE.drop_21_bombs - 0.1, 5.7, 0.25, 0.25);
    if (p21 > 0.01) {
      const [sx, sy] = K.toScreen(cam, 525, 334);
      UI.callout(c, '21 BOMBS', sx - 120, sy - 95, { to: [sx, sy], p: p21, color: P.enemy });
    }

    const p6000 = A.win(t, CUE.km_6000 - 0.1, 16.9, 0.3, 0.3);
    if (p6000 > 0.01) {
      const [sx, sy] = K.toScreen(cam, 40, -40);
      UI.callout(c, '6,000 KM', sx + 140, sy - 70, { to: [sx, sy], p: p6000, color: P.ink });
    }
  }
}
