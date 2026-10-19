// sc08.ts (233.56 – 252.56s): Ba điểm yếu chí mạng của Cần cứng (Flying Boom) —
// (1) chỉ tiếp được 1 máy bay/lần, (2) nguy hiểm khi vung gần cánh quạt trực thăng,
// (3) không thể gắn cần cứng 15m lên máy bay nhỏ trên tàu sân bay.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawSkySideBg,
  drawModernTanker,
  drawStrikeFighter,
  drawHelicopter,
  drawCarrierFighter,
  drawFlyingBoom,
  lwO,
} from './_assets';
import { SIDE_PAIR, CUE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Khớp liền mạch tại 233.56s với camera cuối sc07 ({ x: 0, y: 0, z: 1.05 })
    const cam = K.track(
      t,
      [
        [233.56, { x: 0, y: 0, z: 1.05 }],
        [241.0, { x: -40, y: 20, z: 1.02 }],
        [243.0, { x: 10, y: 5, z: 1.12 }],
        [246.5, { x: 10, y: 5, z: 1.12 }],
        // Lia sang chiếc tiêm kích hạm nhỏ ở nhịp 3 (246.86 – 252.56s)
        [248.2, { x: 520, y: 15, z: 1.24 }],
        [252.56, { x: 520, y: 15, z: 1.24 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);
    drawSkySideBg(c, cam, t, { speed: 200, highAltBand: true });

    const lo = lwO(c);
    const [tx, ty] = SIDE_PAIR.tanker; // [210, -145]
    const [fx, fy] = SIDE_PAIR.receiverDocked; // [-175, 110]

    // 1. Vẽ Tanker chủ đạo
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, 'side', { scale: 1.25, hasBoom: true });
    c.restore();

    const bx0 = tx - 185;
    const by0 = ty + 34;

    // ── Giới hạn 1 (233.56 – 241.45s): Chỉ có 1 cần đuôi nên chỉ tiếp được 1 máy bay/lần ──
    const lim1Alpha = 1 - A.sm(t, 241.2, 242.2);
    if (lim1Alpha > 0.01) {
      A.withA(c, lim1Alpha, () => {
        drawFlyingBoom(c, bx0, by0, fx - 18, fy - 24, {
          extension: 0.9,
          wingPitch: 0.1,
          flow: 1,
          flowPhase: t * 1.5,
          locked: true,
        });
        c.save();
        c.translate(fx, fy);
        drawStrikeFighter(c, 'side', {
          scale: 1.28,
          hasReceptacle: true,
          bombsCount: 2,
          fuelLevel: 0.85,
        });
        c.restore();

        // Máy bay thứ 2 đang cạn xăng (0.18) phải xếp hàng chờ phía sau vì không có cần thứ 2
        const waitP = A.sm(t, CUE.only_one_tail_boom - 0.5, CUE.one_aircraft_at_a_time);
        if (waitP > 0.01) {
          const wx = A.lerp(-520, -430, waitP);
          const wy = 210;
          A.withA(c, waitP, () => {
            c.save();
            c.translate(wx, wy);
            drawStrikeFighter(c, 'side', {
              scale: 1.15,
              hasReceptacle: true,
              fuelLevel: 0.18,
            });
            c.restore();
            // Vạch chắn đỏ không có chỗ cắm thứ 2
            A.line(c, [[-295, 145], [-295, 255]], P.enemy, lo * 1.4, [A.px(c, 10), A.px(c, 8)]);
          });
        }
      });
    }

    // ── Giới hạn 2 (241.45 – 247.2s): Thanh kim loại cứng quá nguy hiểm khi vung gần cánh quạt trực thăng ──
    const lim2Alpha = A.win(t, 241.4, 247.6, 0.5, 0.5);
    if (lim2Alpha > 0.01) {
      A.withA(c, lim2Alpha, () => {
        const hx = -95;
        const hy = 95;
        // Cần cứng vung chao đảo sát đĩa cánh quạt đang quay của trực thăng
        const swing = Math.sin(t * 7.5) * 24;
        drawFlyingBoom(c, bx0, by0, hx - 12, hy - 34 + swing, {
          extension: 0.65,
          wingPitch: Math.sin(t * 8) * 0.8,
          locked: false,
        });

        c.save();
        c.translate(hx, hy);
        drawHelicopter(c, 'side', {
          scale: 1.32,
          rotorPhase: t * 14,
          probeExtended: 0.8,
          rotorWarn: true,
        });
        c.restore();

        // Vòng va chạm nguy hiểm ngay tại đĩa cánh quạt trực thăng
        A.circle(c, hx - 12, hy - 36, 36, 'rgba(180, 73, 60, 0.25)', P.enemy, lo);
      });
    }

    // ── Giới hạn 3 (246.86 – 252.56s): Không thể gắn cần cứng 15m lên tiêm kích hạm nhỏ ──
    const lim3Alpha = A.sm(t, 246.8, 247.8);
    if (lim3Alpha > 0.01) {
      A.withA(c, lim3Alpha, () => {
        const cx = 620;
        const cy = 10;
        c.save();
        c.translate(cx, cy);
        drawCarrierFighter(c, 'side', {
          scale: 1.38,
          buddyPod: false,
          probeExtended: 0,
        });
        c.restore();

        // Ướm thử chiếc cần cứng dài 15m vào đuôi chiếc tiêm kích hạm nhỏ -> dài thượt, nặng chúi đuôi!
        const boltP = A.eio(t, CUE.carrier_based_aircraft - 2.6, CUE.carrier_based_aircraft - 1.2);
        if (boltP > 0.01) {
          const cbx0 = cx - 98;
          const cby0 = cy + 14;
          const cbx1 = cbx0 - 245 * boltP;
          const cby1 = cby0 + 78 * boltP;
          drawFlyingBoom(c, cbx0, cby0, cbx1, cby1, {
            extension: 0.85,
            wingPitch: 0,
            locked: false,
          });
          // Đường gióng kích thước 15m quá khổ so với thân tiêm kích hạm
          A.line(c, [[cbx1, cby1 + 28], [cbx0, cby0 + 28]], P.enemy, lo, [A.px(c, 8), A.px(c, 6)]);
        }
      });
    }

    K.end(c);

    // Dấu X xác nhận cho từng giới hạn sau khi hình đã cho thấy nguyên nhân vật lý
    const x1 = A.win(t, CUE.one_aircraft_at_a_time - 0.2, 241.4, 0.25, 0.25);
    if (x1 > 0.01) {
      const [sx, sy] = K.toScreen(cam, -350, 195);
      UI.xMark(c, sx, sy, 28, x1, P.enemy, 8);
    }

    const x2 = A.win(t, CUE.spinning_rotor_helicopter - 0.3, 247.1, 0.25, 0.25);
    if (x2 > 0.01) {
      const [sx, sy] = K.toScreen(cam, -105, 55);
      UI.xMark(c, sx, sy, 32, x2, P.enemy, 8);
    }

    const x3 = A.sm(t, CUE.carrier_based_aircraft - 0.6, CUE.carrier_based_aircraft + 0.1);
    if (x3 > 0.01) {
      const [sx, sy] = K.toScreen(cam, 395, 65);
      UI.xMark(c, sx, sy, 32, x3, P.enemy, 8);
    }

    // Callout số liệu "15 M" khi ướm cần cứng lên tiêm kích hạm nhỏ (249.1 – 252.3s)
    const p15 = A.win(t, 249.1, 252.3, 0.25, 0.25);
    if (p15 > 0.01) {
      const [sx, sy] = K.toScreen(cam, 410, 52);
      UI.callout(c, '15 M', sx - 110, sy + 80, { to: [sx, sy], p: p15, color: P.enemy });
    }
  }
}
