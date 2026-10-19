// sc10.ts (307.30 – 328.18s): Vì sao tốc độ 1.500 L/phút vẫn thắng về độ linh hoạt (TOP view) —
// (1) Tanker lớn tiếp 2 tiêm kích cùng lúc ở 2 đầu cánh,
// (2) Trực thăng cắm cần dài an toàn ngoài vòng cánh quạt,
// (3) Tiêm kích hạm đeo pod dưới bụng (buddy store) tiếp dầu cho đồng đội cách xa 1.000 km.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawModernTanker,
  drawStrikeFighter,
  drawHelicopter,
  drawCarrierFighter,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_state';

/** Vẽ ống mềm & rổ phễu nhìn từ trên xuống (TOP view) kèm hạt nhiên liệu chảy */
function drawTopHose(
  c: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number,
  flow = 1
) {
  const lo = lwO(c);
  const li = lwI(c);
  const pts: A.Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    pts.push([
      A.lerp(x0, x1, u),
      A.lerp(y0, y1, u) + Math.sin(u * Math.PI * 2 + t * 3) * 3.5,
    ]);
  }
  A.line(c, pts, P.ink, lo * 2.1);
  A.line(c, pts, P.dark, lo * 1.1);
  // Rổ phễu (drogue) ở đầu ống (x1, y1)
  A.poly(
    c,
    [
      [x1 + 4, y1 - 4],
      [x1 - 18, y1 - 14],
      [x1 - 18, y1 + 14],
      [x1 + 4, y1 + 4],
    ],
    P.paper,
    P.ink,
    li
  );
  A.rrect(c, x1 - 22, y1 - 15, 5, 30, 2, P.amber, P.ink, li);

  if (flow > 0.01) {
    for (let i = 0; i < 6; i++) {
      const u = ((i / 6 + t * 1.3) % 1 + 1) % 1;
      if (u <= flow) {
        const idx = Math.min(16, Math.floor(u * 16));
        const [px, py] = pts[idx]!;
        A.circle(c, px, py, 3.8, P.amber, P.ink, li * 0.5);
      }
    }
  }
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(
      t,
      [
        [307.3, { x: -20, y: 0, z: 1.08 }],
        [318.5, { x: -30, y: 0, z: 1.08 }],
        // Hạ nhẹ xuống đón trực thăng cắm vào ống ở 319.2..321.5s
        [319.8, { x: -40, y: 90, z: 1.04 }],
        [321.4, { x: -40, y: 90, z: 1.04 }],
        // Mở rộng khung hình sang phải thấy toàn cảnh Tanker lớn và cặp tiêm kích hạm tự tiếp dầu đồng đội cách 1.000 km
        [323.2, { x: 400, y: 0, z: 0.88 }],
        [328.18, { x: 400, y: 0, z: 0.88 }],
      ],
      A.eio
    );

    A.clear(c, P.bg2);
    K.begin(c, cam);

    const lo = lwO(c);
    const li = lwI(c);

    // Lưới tọa độ mặt biển nhìn từ trên xuống
    const v = K.view(cam, 120);
    c.strokeStyle = 'rgba(71, 85, 105, 0.11)';
    c.lineWidth = A.px(c, 1.5);
    const step = 150;
    const shift = ((t * 210) % step + step) % step;
    c.beginPath();
    for (let x = Math.floor(v.x0 / step) * step - shift; x <= v.x1; x += step) {
      c.moveTo(x, v.y0);
      c.lineTo(x, v.y1);
    }
    for (let y = Math.floor(v.y0 / step) * step; y <= v.y1; y += step) {
      c.moveTo(v.x0, y);
      c.lineTo(v.x1, y);
    }
    c.stroke();

    // ── 1. Cụm bên trái (x = 120): Tanker lớn treo 2 pod đầu cánh tiếp đồng thời 2 tiêm kích ──
    const tx = 120;
    const ty = 0;

    // Ống mềm đầu cánh trên (y = -215) và đầu cánh dưới (y = +215)
    const dualP = A.eio(t, 307.3, 309.5);
    const topHoseEnd: A.Pt = [A.lerp(tx - 105, -195, dualP), -215];
    const botHoseEnd: A.Pt = [A.lerp(tx - 105, -195, dualP), 215];

    drawTopHose(c, tx - 95, -215, topHoseEnd[0], topHoseEnd[1], t, 1);
    drawTopHose(c, tx - 95, 215, botHoseEnd[0], botHoseEnd[1], t, 1);

    // Vẽ Tanker lớn
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, 'top', { scale: 1.22, wingPods: true, hasBoom: false });
    c.restore();

    // Vẽ 2 tiêm kích nhận dầu cùng lúc ở 2 bên cánh
    const fillF = A.lerp(0.35, 0.92, A.ph(t, 314.0, 321.0));
    for (const sy of [-1, 1] as const) {
      // Ở nhịp 319.0s, tiêm kích cánh dưới nhường chỗ cho Trực thăng bay vào cắm ống an toàn
      const isHeloSlot = sy === 1 && t >= CUE.helicopters_plug_safely - 0.5;
      if (!isHeloSlot) {
        c.save();
        c.translate(-288, sy * 226);
        drawStrikeFighter(c, 'top', {
          scale: 1.15,
          hasReceptacle: false,
          probeExtended: 1,
          fuelLevel: fillF,
          afterburner: 0.4,
        });
        c.restore();
      }
    }

    // ── 2. Nhịp Trực thăng (318.8 – 328.18s): Cắm cần probe dài vào ống mềm cánh dưới, cánh quạt cách xa an toàn ──
    const heloP = A.sm(t, CUE.helicopters_plug_safely - 0.5, CUE.helicopters_plug_safely + 0.6);
    if (heloP > 0.01) {
      A.withA(c, heloP, () => {
        const hx = A.lerp(-400, -336, heloP);
        const hy = 204;
        c.save();
        c.translate(hx, hy);
        drawHelicopter(c, 'top', {
          scale: 1.18,
          rotorPhase: t * 14,
          probeExtended: 1,
          rotorWarn: false,
        });
        c.restore();
      });
    }

    // Đường nối khoảng cách 1.000 km từ Tanker lớn tới cặp tiêm kích hạm phía xa (321.5 – 328.18s)
    const distP = A.sm(t, CUE.carrier_belly_pod - 0.3, 323.5);
    if (distP > 0.01) {
      A.withA(c, distP, () => {
        A.line(c, [[335, 0], [600, 0]], P.sky, lo, [A.px(c, 12), A.px(c, 10)]);
      });
    }

    // ── 3. Cụm bên phải (x = 740..1070): Tiêm kích hạm đeo Buddy Pod dưới bụng tiếp dầu cho đồng đội ──
    if (distP > 0.01) {
      A.withA(c, distP, () => {
        const leadX = 1070;
        const wingX = 740;
        const buddyFlow = A.sm(t, 323.0, 324.5);

        // Ống mềm xả từ pod dưới bụng chiếc dẫn đầu (leadX - 45) tới mũi chiếc đồng đội (wingX + 88)
        drawTopHose(c, leadX - 45, -12, wingX + 88, -12, t, buddyFlow);

        // Chiếc Carrier Fighter dẫn đầu mang Buddy Pod màu vàng dưới bụng
        c.save();
        c.translate(leadX, 0);
        drawCarrierFighter(c, 'top', {
          scale: 1.25,
          buddyPod: true,
          probeExtended: 0,
        });
        c.restore();

        // Chiếc Carrier Fighter đồng đội (Wingman) cắm probe vào rổ phễu nhận xăng
        const wingFuel = A.lerp(0.25, 0.85, A.ph(t, 323.5, 328.0));
        c.save();
        c.translate(wingX, 0);
        drawCarrierFighter(c, 'top', {
          scale: 1.25,
          buddyPod: false,
          probeExtended: 1,
        });
        // Thanh xăng trên lưng Wingman đang đầy lên
        A.rrect(c, -48, -7, 46, 14, 4, P.white, P.ink, li);
        A.rrect(c, -45, -4, 40 * wingFuel, 8, 2, P.amber, null, 0);
        c.restore();
      });
    }

    K.end(c);

    // ── Callout số liệu tối giản (tối đa 1 cùng lúc) ──
    const p1500 = A.win(t, CUE.flow_1500_liters - 0.2, 313.2, 0.25, 0.25);
    if (p1500 > 0.01) {
      const [sx, sy] = K.toScreen(cam, -170, -215);
      UI.callout(c, '1,500 L/MIN', sx, sy + 95, { to: [sx, sy], p: p1500, color: P.amber });
    }

    const p1000km = A.win(t, CUE.refuel_wingman_1000km + 1.8, 328.1, 0.25, 0.2);
    if (p1000km > 0.01) {
      const [sx, sy] = K.toScreen(cam, 468, 0);
      UI.callout(c, '1,000 KM', sx, sy - 85, { to: [sx, sy], p: p1000km, color: P.sky });
    }
  }
}
