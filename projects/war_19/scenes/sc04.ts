// scenes/sc04.ts — Chương 2, Shot 2.1 (73.10 – 116.10s)
// Góc FRONT (Chính diện mặt cắt ngang thân & cánh đặt cạnh nhau):
// Đối chiếu cánh dưới bụng của máy bay chở khách (hút đá dăm & mảnh đạn pháo trên đường băng đất)
// với cánh bắt ngang trên nóc của vận tải cơ quân sự (nâng 4 động cơ lên cao cách xa mặt đất).
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawB747,
  drawC17,
  drawExplosion,
  drawGroundSide,
  lw,
} from './_assets';

const camFocusCivil: K.Cam = { x: -210, y: -145, z: 1.58 };
const camBothCompare: K.Cam = { x: 0, y: -140, z: 1.32 };
const camEngineHeight: K.Cam = { x: 20, y: -125, z: 1.36 };

const camTrack: [number, K.Cam][] = [
  [73.10, camBothCompare],
  [79.20, camFocusCivil],
  [86.50, camFocusCivil],
  [89.50, camBothCompare],
  [102.50, camEngineHeight],
  [116.10, camEngineHeight],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam = K.track(t, camTrack, A.eio);
    cam = K.withShake(cam, t, [[CUE.ch2_fod_boom, 14, 0.5]]);

    A.clear(c, P.bg);
    K.begin(c, cam);

    const inW = lw(c, LINE.inner);

    // Nền đường băng đất nện có sỏi đá & mảnh đạn pháo từ cuối Chương 1
    drawGroundSide(c, cam, 'dirt', 0);

    const leftX = -335;
    const rightX = 335;

    // 1. Bên trái: Máy bay dân sự (Boeing 747 Front Cross-Section) — hiện ngay từ frame đầu của shot
    drawB747(c, leftX, 0, {
      view: 'front',
      scale: 0.78,
    });

    // Nhấn hộp cánh chiếm bụng dưới & càng đáp thu vào gốc cánh (79.72–87.08s)
    const bellyWingHi = A.win(t, CUE.ch2_under_belly, CUE.ch2_mil_start, 0.4, 0.4);
    A.withA(c, bellyWingHi, () => {
      A.rrect(c, leftX - 54, -108, 108, 42, 4, P.amber, P.ink, inW);
      // Mũi tên càng đáp gập vào gốc cánh
      A.line(c, [[leftX - 55, -24], [leftX - 115, -82]], P.sky, lw(c, 3.5), [8, 5]);
      A.line(c, [[leftX + 55, -24], [leftX + 115, -82]], P.sky, lw(c, 3.5), [8, 5]);
    });

    // 2. Bên phải: Vận tải cơ quân sự (C-17 Front Cross-Section) — hiện ngay từ frame đầu của shot
    const hiWing = A.win(t, CUE.ch2_mil_start, 102.5, 0.4, 0.5);
    const hiTail = A.win(t, 73.1, 79.5, 0.2, 0.5);

    drawC17(c, rightX, 0, {
      view: 'front',
      scale: 0.80,
      hiWing,
      hiTail,
    });

    // 3. Bài toán mặt đất #1 (103.06–116.10s): Độ cao 4 động cơ & Hút sỏi đá / mảnh đạn (FOD)
    const engCompareAlpha = A.sm(t, CUE.ch2_high_engines, CUE.ch2_high_engines + 0.7);
    A.withA(c, engCompareAlpha, () => {
      // Thước đo khoảng sáng gầm động cơ bên C-17 (cao thoáng trên mặt đất)
      const exMil = rightX - 152;
      A.line(c, [[exMil, -86], [exMil, -2]], P.sky, lw(c, 4), [8, 6]);
      A.line(c, [[exMil - 16, -86], [exMil + 16, -86]], P.sky, lw(c, 4));
      A.line(c, [[exMil - 16, -2], [exMil + 16, -2]], P.sky, lw(c, 4));

      // Thước đo khoảng sáng gầm động cơ bên 747 (sát mặt đất)
      const exCiv = leftX + 136;
      A.line(c, [[exCiv, -26], [exCiv, -2]], P.enemy, lw(c, 4));
      A.line(c, [[exCiv - 14, -26], [exCiv + 14, -26]], P.enemy, lw(c, 4));
    });

    // Luồng hút sỏi đá, cát và mảnh đạn pháo trên đường băng đất (109.98–116.10s)
    const debrisPhase = A.ph(t, CUE.ch2_vacuum_gravel - 0.5, 115.8);
    if (debrisPhase > 0) {
      // (a) Bên máy bay dân sự: động cơ thấp tạo phễu lốc xoáy hút thẳng đá dăm & mảnh đạn đỏ vào động cơ!
      const civEngX = leftX + 136, civEngY = -44;
      for (let i = 0; i < 9; i++) {
        const p = ((t * 1.4 + i * 0.13) % 1);
        const sx0 = civEngX - 55 + (i - 4) * 18;
        const px = A.lerp(sx0, civEngX, p);
        const py = A.lerp(4, civEngY, p * p);
        const isShrapnel = i % 3 === 0;
        A.circle(c, px, py, isShrapnel ? 5.5 : 4, isShrapnel ? P.enemy : P.oliveDark, P.ink, inW * 0.7);
      }
      // Chớp nổ hỏng động cơ dân sự khi hút mảnh đạn lúc 112.40s
      const boomP = A.ph(t, CUE.ch2_fod_boom, CUE.ch2_fod_boom + 0.9);
      drawExplosion(c, civEngX, civEngY, boomP, 44);
      if (t >= CUE.ch2_fod_boom) {
        // Vệt khói đen bốc lên từ động cơ hỏng
        A.withA(c, 0.75, () => {
          A.circle(c, civEngX + 8, civEngY - 18, 16, P.dark, P.ink, inW);
        });
      }

      // (b) Bên vận tải cơ quân sự C-17: sỏi đá chỉ bay là là sát mặt đất, 4 động cơ treo cao ở y = -108 hoàn toàn thoát!
      for (let i = 0; i < 8; i++) {
        const p = ((t * 1.1 + i * 0.15) % 1);
        const gx = rightX - 280 + p * 560;
        const gy = -6 - Math.sin(p * Math.PI) * 14;
        A.circle(c, gx, gy, 4.5, i % 2 === 0 ? P.oliveDark : P.enemy, P.ink, inW * 0.7);
      }
      // Vòng bảo vệ xanh quanh 4 động cơ treo cao của C-17
      for (const ex of [-254, -152, 152, 254]) {
        const ey = Math.abs(ex) > 200 ? -100 : -108;
        A.circle(c, rightX + ex, ey, 28, null, P.sky, lw(c, 3));
      }
    }

    K.end(c);
  }
}
