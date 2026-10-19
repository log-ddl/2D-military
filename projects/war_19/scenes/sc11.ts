// scenes/sc11.ts — Chương 4, Shot 4.3 (324.60 – 331.60s)
// Góc TOP-DOWN đường băng hẹp: C-17 dùng lực đẩy ngược (reverse thrust) tự lùi lại
// và xoay mũi 180 độ (three-point turnaround) trên đường băng dã chiến hẹp chỉ nhỉnh hơn sải cánh.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { drawC17, lw } from './_assets';

const camTurn: K.Cam = { x: 0, y: 0, z: 1.15 };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg2);
    K.begin(c, camTurn);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    // 1. Dải đường băng dã chiến hẹp (bề rộng 560px — chỉ vừa nhỉnh hơn sải cánh C-17!)
    A.rrect(c, -820, -280, 1640, 560, 8, P.sand, P.ink, outW);
    A.line(c, [[-820, -280], [820, -280]], P.enemy, lw(c, 5), [16, 10]);
    A.line(c, [[-820, 280], [820, 280]], P.enemy, lw(c, 5), [16, 10]);
    for (let rx = -720; rx <= 720; rx += 140) {
      A.rrect(c, rx, -6, 72, 12, 2, P.paper, null, 0);
    }

    // 2. Quỹ đạo lùi và quay đầu 3 đỏ (3-point turnaround) từ 324.60s đến 331.60s:
    // - Pha 1 (324.6–327.6s): Từ (160, 0, rot=0) dùng lực đẩy ngược lùi chéo về (-120, -85, rot=1.05)
    // - Pha 2 (327.6–331.4s): Tiến nhẹ và xoay nốt sang hướng ngược lại (-40, 0, rot=PI)
    const pBack = A.eio(t, 324.6, 328.0);
    const pTurn = A.eio(t, 328.0, 331.3);

    const cx = t < 328.0
      ? A.lerp(160, -110, pBack)
      : A.lerp(-110, -20, pTurn);
    const cy = t < 328.0
      ? A.lerp(0, -75, Math.sin(pBack * Math.PI))
      : A.lerp(0, 45, Math.sin(pTurn * Math.PI));
    const rot = t < 328.0
      ? A.lerp(0, 1.35, pBack)
      : A.lerp(1.35, Math.PI, pTurn);

    // Đường vệt bánh xe chấm đứt lưu lại quỹ đạo lùi & quay đầu trên đường băng
    A.line(c, [[160, 0], [-110, -65], [-20, 0]], P.amber, lw(c, 4), [12, 8]);

    // Vẽ C-17 nhìn từ trên xuống đang phụt ngược động cơ để lùi & xoay
    c.save();
    c.translate(cx, cy);
    c.rotate(rot);
    drawC17(c, 0, 0, {
      view: 'top',
      scale: 0.76,
    });
    // Luồng phụt đảo chiều hướng về phía trước mũi khi đang lùi
    if (t < 328.4) {
      for (const ey of [-195, -110, 110, 195]) {
        A.line(c, [[45, ey], [135, ey]], P.amber, lw(c, 4), [10, 6]);
      }
    }
    c.restore();

    // Thước gióng hai đầu mút cánh sát sạt mép đường băng hẹp ("barely wider than its own wingspan")
    const spanAlpha = A.sm(t, 328.2, 329.2);
    A.withA(c, spanAlpha, () => {
      A.line(c, [[-340, -276], [-340, 276]], P.sky, lw(c, 4), [8, 6]);
      A.poly(c, [[-340, -278], [-348, -260], [-332, -260]], P.sky, P.ink, inW);
      A.poly(c, [[-340, 278], [-348, 260], [-332, 260]], P.sky, P.ink, inW);
    });

    K.end(c);
  }
}
