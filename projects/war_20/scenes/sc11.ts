// sc11.ts (328.18 – 366.30s): Hệ thống ngầm #1 — Tĩnh điện ma sát không khí,
// Chốt ngoắc nối đất (Electrical Grounding Bond) cân bằng điện tích trước khi mở van xăng,
// và bơm khí Nitơ (N2) phủ kín khoang bình xăng đẩy Oxy ra ngoài.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawSkySideBg,
  drawModernTanker,
  drawStrikeFighter,
  drawFlyingBoom,
  drawCouplingCutaway,
  lwO,
  lwI,
} from './_assets';
import { SIDE_PAIR, CUE } from './_state';

/** Vẽ ký hiệu hạt điện tích (+ hoặc -) tích tụ quanh vỏ kim loại máy bay */
function drawStaticCharges(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sign: '+' | '-',
  alpha: number,
  t: number
) {
  if (alpha <= 0.01) return;
  const li = lwI(c);
  const col = sign === '+' ? P.enemy : P.sky;
  const offsets: [number, number][] = [
    [-125, -28],
    [-45, -34],
    [35, -30],
    [105, -18],
    [-85, 28],
    [15, 32],
    [85, 22],
  ];
  A.withA(c, alpha, () => {
    offsets.forEach(([ox, oy], i) => {
      const jx = ox + Math.sin(t * 6 + i * 1.3) * 3;
      const jy = oy + Math.cos(t * 5.4 + i * 1.7) * 3;
      const x = cx + jx;
      const y = cy + jy;
      A.circle(c, x, y, 9.5, P.white, col, li * 1.1);
      A.line(c, [[x - 4.5, y], [x + 4.5, y]], col, li * 1.2);
      if (sign === '+') {
        A.line(c, [[x, y - 4.5], [x, y + 4.5]], col, li * 1.2);
      }
    });
  });
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam = K.track(
      t,
      [
        [328.18, { x: 25, y: -35, z: 1.12 }],
        [339.5, { x: 25, y: -35, z: 1.12 }],
        // Mở góc sang phải-dưới để thấy trọn cả 2 máy bay cắt lớp lẫn bảng phóng lớn Khớp nối ở góc phải dưới (341.0 – 358.8s)
        [341.2, { x: 125, y: 5, z: 1.14 }],
        [358.2, { x: 125, y: 5, z: 1.14 }],
        // Trả về toàn cảnh mặt cắt 2 máy bay thấy rõ lớp khí Nitơ (N2) trong 6 khoang bình xăng (359.5 – 366.30s)
        [359.6, { x: 25, y: -35, z: 1.14 }],
        [366.3, { x: 25, y: -35, z: 1.14 }],
      ],
      A.eio
    );

    cam = K.withShake(cam, t, [
      [CUE.single_spark_blow, 12, 0.45],
      [CUE.mechanical_latches_bond + 1.2, 6, 0.25],
    ]);

    A.clear(c, P.bg);
    K.begin(c, cam);
    drawSkySideBg(c, cam, t, { speed: 220, highAltBand: true });

    const lo = lwO(c);
    const li = lwI(c);
    const [tx, ty] = SIDE_PAIR.tanker; // [210, -145]
    const fx = -160;
    const fy = 75;

    // Tiến độ bơm khí Nitơ (N2) đẩy oxy ra khỏi bình xăng (359.5 – 366.30s)
    const n2P = A.eio(t, CUE.tanks_nitrogen_gas - 0.3, CUE.not_enough_oxygen + 0.5);
    const flowOn = A.eio(t, CUE.valve_crack_open - 0.2, CUE.valve_crack_open + 1.2);

    // 1. Vẽ Modern Tanker ở chế độ mặt cắt CUTAWAY
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, 'cutaway', {
      scale: 1.25,
      tanks: {
        wing: A.lerp(0.82, 0.72, flowOn),
        center: A.lerp(0.84, 0.75, flowOn),
        tail: A.lerp(0.78, 0.70, flowOn),
      },
      valvesOpen: [true, true, true],
      nitrogen: n2P,
      cgShift: 0,
    });
    c.restore();

    // 2. Vẽ Cần cứng Flying Boom nối giữa 2 máy bay
    const bx0 = tx - 210;
    const by0 = ty + 16;
    const bx1 = fx - 16;
    const by1 = fy - 24;
    drawFlyingBoom(c, bx0, by0, bx1, by1, {
      extension: 0.72,
      locked: t >= CUE.mechanical_latches_bond,
      flow: flowOn,
      flowPhase: t,
    });

    // Dây tiếp địa xanh da trời chạy dọc cần cứng khi đã cân bằng điện tích (351.0 – 366.30s)
    const bondLineP = A.eio(t, CUE.mechanical_latches_bond + 0.8, CUE.equalizing_charge + 0.6);
    if (bondLineP > 0.01) {
      A.withA(c, bondLineP, () => {
        A.line(
          c,
          [
            [bx0, by0 - 8],
            [A.lerp(bx0, bx1, bondLineP), A.lerp(by0 - 8, by1 - 8, bondLineP)],
          ],
          P.sky,
          lo * 1.1
        );
      });
    }

    // 3. Vẽ Strike Fighter ở chế độ mặt cắt CUTAWAY
    c.save();
    c.translate(fx, fy);
    drawStrikeFighter(c, 'cutaway', {
      scale: 1.28,
      hasReceptacle: true,
      tanks: {
        fwd: A.lerp(0.32, 0.45, flowOn),
        mid: A.lerp(0.35, 0.48, flowOn),
        aft: A.lerp(0.32, 0.45, flowOn),
      },
      valvesOpen: [true, true, true],
      nitrogen: n2P,
      cgShift: 0,
    });
    c.restore();

    // 4. Các hạt điện tích ma sát không khí (+ trên Tanker, - trên Fighter) trước khi cân bằng điện tích (336.0 – 355.2s)
    const chargeAlpha =
      A.sm(t, 336.0, CUE.static_electricity_skins) *
      (1 - A.sm(t, CUE.equalizing_charge - 0.5, CUE.equalizing_charge + 0.8));
    drawStaticCharges(c, tx, ty, '+', chargeAlpha, t);
    drawStaticCharges(c, fx, fy, '-', chargeAlpha, t);

    // 5. Khung phóng lớn mặt cắt Khớp nối Nozzle–Receptacle ở khoảng trống góc phải dưới (342.0 – 359.3s)
    const closeWin = A.win(t, 342.0, 359.3, 0.6, 0.5);
    if (closeWin > 0.01) {
      A.withA(c, closeWin, () => {
        const cx = 310;
        const cy = 125;
        // Đường gióng kỹ thuật từ ổ nhận (bx1, by1) sang cạnh trái bảng phóng lớn
        A.line(c, [[bx1, by1], [cx - 285, cy - 25]], P.ink, li, [A.px(c, 6), A.px(c, 5)]);
        A.rrect(c, cx - 285, cy - 88, 570, 176, 18, P.white, P.ink, lo * 1.2);

        const gapP = 1 - A.eio(t, 342.5, 348.8);
        const sparkP = A.win(t, CUE.single_spark_blow - 0.5, 348.6, 0.2, 0.25);
        const latchP = A.eio(t, CUE.mechanical_latches_bond - 0.2, CUE.mechanical_latches_bond + 1.5);
        const bondP = A.eio(t, CUE.mechanical_latches_bond + 1.0, CUE.equalizing_charge + 0.4);
        const valveP = A.eio(t, CUE.valve_crack_open - 0.3, CUE.valve_crack_open + 0.8);

        drawCouplingCutaway(c, cx, cy, {
          gap: gapP * 34,
          staticSpark: sparkP,
          latchesLocked: latchP,
          bonded: bondP,
          valveOpen: valveP,
          fuelFlow: flowOn,
          t,
        });

        // Tia lửa cảnh báo nguy cơ nổ khi chưa nối đất (346.2s)
        const pSpark = A.ph(t, CUE.single_spark_blow - 0.1, CUE.single_spark_blow + 0.65);
        if (pSpark > 0 && pSpark < 1) {
          FX.sparks(c, cx, cy, pSpark, 1.3, 0, Math.PI * 2, 8);
        }
      });
    }

    K.end(c);

    // ── Callout số liệu / ký hiệu hóa học tối giản (tối đa 1 cùng lúc) ──
    const pN2 = A.win(t, CUE.tanks_nitrogen_gas + 0.2, 365.8, 0.25, 0.25);
    if (pN2 > 0.01) {
      const [sx, sy] = K.toScreen(cam, tx - 6, ty - 28);
      UI.callout(c, 'N2', sx - 135, sy - 75, { to: [sx, sy], p: pN2, color: P.sky });
    }
  }
}
