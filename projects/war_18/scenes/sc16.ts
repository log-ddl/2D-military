// scenes/sc16.ts — Chương 4 (259.38 – 286.20s): Thiết kế phương Tây giải quyết "bẫy nạp đạn":
// - Nhịp 1 (259.38 – 269.80s, góc SIDE): Giới thiệu M270 MLRS bánh xích (mang 2 pod) và M142 HIMARS bánh lốp (mang 1 pod).
// - Nhịp 2 (269.80 – 286.20s, góc CUTAWAY + FRONT): Thay vì ống cố định phải đút tay, các bệ phóng này mang
//   hộp phóng chữ nhật kín (sealed rectangular pod) bằng nhôm & sợi thủy tinh chứa 6 quả đạn 227mm đóng sẵn
//   và đấu dây từ nhà máy — vừa là thùng vận chuyển vừa là cụm ống phóng.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawEnvCutaway,
  drawM270,
  drawHimars,
  drawPod,
  drawCallout,
} from './_assets';

const GROUND_Y = 230;
const SWITCH_POD_T = 269.8;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_POD_T) {
      // ── NHỊP 1 (259.38 – 269.80s): SIDE — M270 MLRS (BÁNH XÍCH) & M142 HIMARS (BÁNH LỐP) ──
      const cam: K.Cam = K.track(
        t,
        [
          [259.38, { x: -240, y: 120, z: 1.55 }],
          [265.2, { x: -20, y: 115, z: 1.38 }],
          [269.8, { x: 10, y: 115, z: 1.38 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-580, 580] });

      // Bên trái (x = -270): Xe bánh xích M270 MLRS
      c.save();
      c.translate(-270, GROUND_Y);
      drawM270(c, { view: 'side', elevateDeg: 20 });
      c.restore();

      // Bên phải (x = 240): Xe bánh lốp M142 HIMARS (hiện lúc 265.0s)
      const himarsAlpha = A.sm(t, 264.8, 266.0);
      A.withA(c, himarsAlpha, () => {
        c.save();
        c.translate(240, GROUND_Y);
        drawHimars(c, { view: 'side', elevateDeg: 20 });
        c.restore();
      });

      K.end(c);

      const cM270 = A.win(t, 261.2, 269.5, 0.35, 0.3);
      if (cM270 > 0.01) {
        const ptM = K.toScreen(cam, -320, GROUND_Y - 155);
        drawCallout(c, ptM, [0, -85], 'M270 MLRS (TRACKED)', cM270, P.amber);
      }

      const cHimars = A.win(t, 265.6, 269.5, 0.35, 0.3);
      if (cHimars > 0.01) {
        const ptH = K.toScreen(cam, 190, GROUND_Y - 155);
        drawCallout(c, ptH, [0, -85], 'M142 HIMARS (WHEELED)', cHimars, P.sky);
      }
      return;
    }

    // ── NHỊP 2 (269.80 – 286.20s): CUTAWAY (TRÁI) + FRONT (PHẢI) CỦA HỘP PHÓNG KÍN 6 QUẢ 227 MM ──
    const cam: K.Cam = { x: 0, y: 0, z: 1.28 };
    K.begin(c, cam);
    drawEnvCutaway(c, cam, 120);

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Bên trái (x = -195, y = 0): Hộp Pod phóng lớn chuyển từ vỏ kín (SIDE) sang mặt cắt (CUTAWAY)
    // để lộ 6 quả đạn 227mm đóng gói và đấu dây sẵn từ nhà máy
    const openCutaway = A.sm(t, 276.8, 278.2);
    c.save();
    c.translate(-195, 0);
    c.scale(2.25, 2.25);
    if (openCutaway < 0.99) {
      A.withA(c, 1 - openCutaway, () => {
        drawPod(c, { view: 'side', variant: '6x227' });
      });
    }
    if (openCutaway > 0.01) {
      A.withA(c, openCutaway, () => {
        drawPod(c, { view: 'cutaway', variant: '6x227', rocketsLeft: 6 });
        // Dây cáp điện đấu sẵn ở đáy các ống phóng (packed and wired at the factory)
        for (const ry of [-22, 0, 22]) {
          A.circle(c, -88, ry, 3, P.amber, P.ink, lwIn * 0.5);
        }
      });
    }
    c.restore();

    // Bên phải (x = 325, y = 0): Mặt trước (FRONT) của hộp Pod chữ nhật với 6 ống 227mm xếp 2×3
    A.rrect(c, 155, -230, 340, 460, 12, P.paper, P.ink, lw);
    c.save();
    c.translate(325, 0);
    c.scale(2.35, 2.35);
    drawPod(c, { view: 'front', variant: '6x227', rocketsLeft: 6 });
    c.restore();

    K.end(c);

    const cPod = A.win(t, 271.0, 277.2, 0.35, 0.35);
    if (cPod > 0.01) {
      const ptP = K.toScreen(cam, -195, -95);
      drawCallout(c, ptP, [0, -85], 'SEALED POD (ALUMINUM + FIBERGLASS)', cPod, P.amber);
    }

    const c227 = A.win(t, 277.6, 285.9, 0.35, 0.3);
    if (c227 > 0.01) {
      const ptF = K.toScreen(cam, 325, -180);
      drawCallout(c, ptF, [0, -75], '6 × 227 mm (CRATE + TUBES)', c227, P.amber);
    }
  }
}
