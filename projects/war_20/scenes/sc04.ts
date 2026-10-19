// sc04.ts (75.50 – 112.24s): Vật lý cất cánh & độ cao — đầy bom + đầy xăng khiến máy bay quá nặng
// không ngóc lên nổi; giải pháp: giữ nguyên bom nhưng chỉ đổ 1/2 bình xăng để leo lên tầng khí loãng 8–9 km rồi nạp đầy.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawAltitudeWorldBg,
  drawModernTanker,
  drawStrikeFighter,
  drawFlyingBoom,
  lwO,
} from './_assets';
import { CUE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Hai giai đoạn trên cùng thế giới độ cao:
    // Giai đoạn 1 (75.50 – 95.72s): Thử cất cánh từ boong tàu sân bay với ĐẦY BOM (4 quả) + ĐẦY XĂNG (100%) -> chúc xuống biển
    // Giai đoạn 2 (95.88 – 112.24s): Giữ nguyên 4 quả bom + RÚT XĂNG CÒN 1/2 (50%) -> vọt nhẹ lên độ cao 8–9 km (y = -640) gặp Tanker bơm đầy 100%

    const isWorkaround = t >= CUE.clever_workaround - 0.3;

    // Quỹ đạo tiêm kích
    let fx = -240;
    let fy = -68;
    let pitch = 0;
    let gear = 1;
    let fuel = 1.0;

    if (!isWorkaround) {
      // Lăn chạy đà trên boong tàu sân bay (-380 -> 180), rời mép boong bị nặng chúi mũi xuống
      const rollP = A.eio(t, 82.5, 92.5);
      fx = A.lerp(-380, 260, rollP);
      const dropP = A.ei(t, 89.2, 95.2);
      fy = A.lerp(-68, -14, dropP);
      pitch = A.lerp(0, 14, dropP); // chúi mũi xuống (+deg theo chiều kim đồng hồ)
      gear = 1 - A.sm(t, 89.5, 91.0);
      fuel = 1.0;
    } else {
      // Giải pháp: rút bình xăng từ 1.0 xuống 0.5 ngay trên boong, rồi phóng vọt lên độ cao 8–9 km (y = -620)
      const drainP = A.sm(t, CUE.clever_workaround, CUE.fuel_half_empty + 0.4);
      const launchP = A.eio(t, 100.2, 106.8);
      const topUpP = A.sm(t, CUE.top_to_brim - 0.3, 111.8);

      fx = A.lerp(-360, 140, launchP);
      fy = A.lerp(-68, -605, Math.pow(launchP, 1.35));
      pitch = A.bump(t, 100.6, 5.2) * -26; // ngóc mũi vọt mạnh lên (-deg)
      gear = 1 - A.sm(t, 100.8, 102.0);
      fuel = A.lerp(A.lerp(1.0, 0.5, drainP), 1.0, topUpP);
    }

    // Camera theo sát máy bay ở mặt đất/boong tàu rồi nâng lên độ cao 8–9 km
    const cam = K.track(
      t,
      [
        [75.5, { x: -240, y: -110, z: 1.38 }],
        [85.0, { x: -160, y: -110, z: 1.28 }],
        [94.5, { x: 40, y: -85, z: 1.22 }],
        [95.8, { x: -280, y: -110, z: 1.38 }],
        [100.5, { x: -260, y: -120, z: 1.32 }],
        [106.5, { x: 260, y: -650, z: 1.24 }],
        [112.24, { x: 280, y: -650, z: 1.24 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    drawAltitudeWorldBg(c, cam, t, { showCarrier: true });
    const lo = lwO(c);

    // 1. Đường quỹ đạo thất bại màu đỏ (khi mang đầy bom + đầy xăng)
    if (t >= 88.5) {
      const failLineP = A.sm(t, 88.5, 95.0);
      A.withA(c, isWorkaround ? 0.35 : 0.9, () => {
        A.line(
          c,
          [
            [-120, -68],
            [60, -62],
            [180, -34],
            [A.lerp(180, 310, failLineP), A.lerp(-34, -8, failLineP)],
          ],
          P.enemy,
          lo,
          [A.px(c, 12), A.px(c, 8)]
        );
      });
    }

    // 2. Đường quỹ đạo thành công màu xanh da trời (khi mang đầy bom + 1/2 xăng)
    if (isWorkaround && t >= 100.3) {
      const lp = A.eio(t, 100.2, 106.8);
      const pts: A.Pt[] = [];
      for (let i = 0; i <= 24; i++) {
        const u = (i / 24) * lp;
        pts.push([A.lerp(-360, 140, u), A.lerp(-68, -605, Math.pow(u, 1.35))]);
      }
      A.line(c, pts, P.sky, lo, [A.px(c, 12), A.px(c, 8)]);
    }

    // 3. Modern Tanker chờ sẵn ở tầng bình lưu 8–9 km (x = 460, y = -735)
    const tx = 460;
    const ty = -735;
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, 'side', { scale: 1.15, hasBoom: true, directorLights: 'steady' });
    c.restore();

    // Cần cứng nối từ Tanker xuống Strike Fighter khi lên tới độ cao (107.2 – 112.24s)
    const dockP = A.sm(t, CUE.sidle_up_tanker - 0.8, CUE.top_to_brim - 0.2);
    const bx0 = tx - 165;
    const by0 = ty + 30;
    const bx1 = A.lerp(bx0 - 85, fx - 14, dockP);
    const by1 = A.lerp(by0 + 45, fy - 24, dockP);
    drawFlyingBoom(c, bx0, by0, bx1, by1, {
      extension: 0.35 + 0.45 * dockP,
      wingPitch: 0.2,
      flow: A.sm(t, CUE.top_to_brim - 0.3, CUE.top_to_brim + 0.5),
      flowPhase: t,
      locked: dockP > 0.9,
    });

    // 4. Vẽ Strike Fighter với 4 quả bom nặng luôn gắn dưới cánh và thanh xăng trong thân
    c.save();
    c.translate(fx, fy);
    drawStrikeFighter(c, 'side', {
      scale: 1.25,
      bombsCount: 4,
      fuelLevel: fuel,
      gearDown: gear,
      pitchDeg: pitch,
      hasReceptacle: true,
      afterburner: isWorkaround ? A.win(t, 100.2, 106.8, 0.2, 0.4) : A.win(t, 85.0, 94.5, 0.3, 0.4),
    });
    c.restore();

    K.end(c);

    // 5. Mũi tên trọng lực kéo ghì máy bay xuống khi đầy bom + đầy xăng vs lực nâng nhẹ khi 1/2 xăng
    if (!isWorkaround && t >= CUE.heaviest_sluggish - 0.3) {
      const wp = A.win(t, CUE.heaviest_sluggish - 0.3, 95.5, 0.3, 0.3);
      const [sx, sy] = K.toScreen(cam, fx, fy + 28);
      UI.arrow(c, [sx, sy], [sx, sy + 115], { p: wp, color: P.enemy, w: 8 });
      if (t >= CUE.too_heavy_climb - 0.2) {
        const xp = A.sm(t, CUE.too_heavy_climb - 0.2, CUE.too_heavy_climb + 0.5);
        const [ex, ey] = K.toScreen(cam, 280, -18);
        UI.xMark(c, ex, ey, 28, xp, P.enemy, 8);
      }
    }

    // ── Callout tối giản (tối đa 1 cùng lúc) ──
    const pHalf = A.win(t, CUE.fuel_half_empty - 0.4, 102.6, 0.25, 0.25);
    if (pHalf > 0.01) {
      const [sx, sy] = K.toScreen(cam, fx - 20, fy - 12);
      UI.callout(c, '1/2 FUEL', sx - 135, sy - 95, { to: [sx, sy], p: pHalf, color: P.amber });
    }

    const pAlt = A.win(t, CUE.alt_8_9_km - 0.2, 108.0, 0.25, 0.25);
    if (pAlt > 0.01) {
      const [sx, sy] = K.toScreen(cam, fx + 50, -520);
      UI.callout(c, '8–9 KM', sx - 140, sy - 70, { to: [sx, sy], p: pAlt, color: P.sky });
    }
  }
}
