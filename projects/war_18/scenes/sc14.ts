// scenes/sc14.ts — Chương 3 (212.06 – 231.60s): Thiết kế làm vũ khí diện rộng (Area Weapons).
// - Nhịp 1 (212.06 – 218.60s, góc SIDE): Đặt cạnh nhau cùng thang đo chiếc BM-21 Grad (40 ống 122mm)
//   và siêu pháo phản lực BM-30 Smerch (12 ống 300mm khổng lồ).
// - Nhịp 2 (218.60 – 225.20s, góc CUTAWAY): Mở mặt cắt khoang đầu đạn chứa vòng mảnh cắt sẵn,
//   mìn chống tăng rải, đạn con (sub-munitions) và nhiệt áp (FAE).
// - Nhịp 3 (225.20 – 231.60s, góc TOP): Phủ kín cả một khu tập kết, sân bay và kho tiếp vận trong một cơn bão đạn.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawEnvCutaway,
  drawEnvTop,
  drawGrad,
  drawSmerch,
  drawRocket,
  drawTargetSet,
  drawExplosion,
  drawCallout,
} from './_assets';

const GROUND_Y = 230;
const T_WARHEAD = 218.6;
const T_AIRFIELD = 225.2;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < T_WARHEAD) {
      // ── NHỊP 1 (212.06 – 218.60s): SIDE ĐỐI CHIẾU BM-21 GRAD (40 ỐNG) VS BM-30 SMERCH (300 MM) ──
      const cam: K.Cam = K.track(
        t,
        [
          [212.06, { x: -20, y: 115, z: 1.38 }],
          [218.6, { x: 10, y: 115, z: 1.34 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-620, 620] });

      // Bên trái (x = -310): BM-21 Grad 122mm (40 ống)
      c.save();
      c.translate(-310, GROUND_Y);
      drawGrad(c, { view: 'side', elevateDeg: 24, jacksDown: 1, shuttersDown: 1, highlight: 'tubes' });
      c.restore();

      // Bên phải (x = 240): BM-30 Smerch 300mm khổng lồ (hiện vào lúc 214.2s)
      const smerchAlpha = A.sm(t, 214.0, 215.2);
      A.withA(c, smerchAlpha, () => {
        c.save();
        c.translate(240, GROUND_Y);
        drawSmerch(c, { elevateDeg: 24 });
        c.restore();
      });

      K.end(c);

      const cGrad = A.win(t, 212.4, 218.3, 0.3, 0.3);
      if (cGrad > 0.01) {
        const ptG = K.toScreen(cam, -380, GROUND_Y - 145);
        drawCallout(c, ptG, [0, -85], '40-TUBE GRAD (122 mm)', cGrad, P.amber);
      }

      const cSmerch = A.win(t, 214.6, 218.3, 0.3, 0.3);
      if (cSmerch > 0.01) {
        const ptS = K.toScreen(cam, 150, GROUND_Y - 165);
        drawCallout(c, ptS, [0, -90], '300 mm SMERCH', cSmerch, P.amber);
      }
      return;
    }

    if (t < T_AIRFIELD) {
      // ── NHỊP 2 (218.60 – 225.20s): CUTAWAY 3 CẤU HÌNH ĐẦU ĐẠN DIỆN RỘNG ──
      const cam: K.Cam = { x: 0, y: 0, z: 1.25 };
      K.begin(c, cam);
      drawEnvCutaway(c, cam, 120);

      const warheads: { y: number; type: 'frag_rings' | 'mines' | 'fae'; appear: number }[] = [
        { y: -210, type: 'frag_rings', appear: A.sm(t, 218.7, 219.6) },
        { y: 0, type: 'mines', appear: A.sm(t, 220.4, 221.4) },
        { y: 210, type: 'fae', appear: A.sm(t, 222.4, 223.4) },
      ];

      for (const w of warheads) {
        A.withA(c, w.appear, () => {
          c.save();
          c.translate(0, w.y);
          c.scale(1.65, 1.65);
          drawRocket(c, {
            variant: '300mm',
            view: 'cutaway',
            fuelLeft: 0.6,
            thrust: 0.3,
            finOpen: 1,
            warheadType: w.type,
            highlight: 'warhead',
          });
          c.restore();
        });
      }

      K.end(c);
      return;
    }

    // ── NHỊP 3 (225.20 – 231.60s): TOP — PHỦ KÍN KHU TẬP KẾT, SÂN BAY & KHO TIẾP VẬN ──
    const baseCam: K.Cam = { x: 0, y: 0, z: 1.12 };
    const stormHits: [number, number, number?][] = Array.from({ length: 18 }, (_, i) => [
      226.0 + i * 0.24,
      6,
      0.28,
    ]);
    const cam = K.withShake(baseCam, t, stormHits);

    K.begin(c, cam);
    drawEnvTop(c, cam, { gridStep: 180 });

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Đường băng sân bay đối phương ở giữa + Khu kho tiếp vận ở hai bên
    A.rrect(c, -580, -65, 1160, 130, 8, P.slate, P.ink, lw);
    A.line(c, [[-530, 0], [530, 0]], P.white, lw, [26, 20]);

    for (const [dx, dy] of [[-360, -230], [280, -230], [-360, 210], [280, 210]] as A.Pt[]) {
      c.save();
      c.translate(dx, dy);
      c.scale(1.35, 1.35);
      drawTargetSet(c, 'depot_top');
      c.restore();
    }

    // Cơn bão đạn con & mảnh nổ rải phủ kín toàn bộ sân bay và kho tiếp vận (225.8 – 231.4s)
    for (let i = 0; i < 28; i++) {
      const tHit = 225.8 + i * 0.17;
      if (t < tHit) continue;
      const col = i % 7;
      const row = Math.floor(i / 7);
      const ix = -480 + col * 160 + (A.rnd(i * 7 + 1) - 0.5) * 55;
      const iy = -240 + row * 160 + (A.rnd(i * 13 + 3) - 0.5) * 55;

      A.circle(c, ix, iy, 22, P.dark, P.ink, lwIn);
      const bp = (t - tHit) / 0.9;
      if (bp > 0 && bp < 1) {
        drawExplosion(c, ix, iy, bp, 72, 8);
      }
    }

    K.end(c);
  }
}
