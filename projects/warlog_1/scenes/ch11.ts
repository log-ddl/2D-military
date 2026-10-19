// Chương 11 (432.3–456.3): MRAP: thân chữ V đẩy sóng nổ đi.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import { P } from './shared/palette';
import * as W from './_world';
import * as V from './_assets';
import { sideCam, dip } from './_common';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    if (t < 441.8) {
      // NGANG: xe thường ven đường, bom ven đường
      const cam = sideCam(300, 2.2, 820);
      K.begin(c, cam);
      W.sideGround(c, cam, { scroll: 0, road: true });
      const x = A.lerp(-100, 340, A.eio(t, 432.4, 438.8));
      const boom = A.ph(t, 438.9, 439.7);
      if (boom < 0.5 || true) V.truck(c, x + (boom > 0 ? boom * 0 : 0), -boom * 40, 1, { ph: x * 1.2, a: 1 });
      if (boom > 0) { F.explosion(c, 340, 4, 100, boom); F.shock(c, 340, 4, 220, boom, 4); }
      K.end(c);
      if (t > 439.8) { const cam2 = sideCam(300, 2.2, 820); void cam2; V.mrap(c, 960, 700, 2, {}); }
    } else {
      // CHÍNH DIỆN, mặt cắt: đáy phẳng vs chữ V
      const cam: K.Cam = { x: 0, y: -80, z: 3.4 };
      K.begin(c, cam);
      c.fillStyle = W.GROUND; c.fillRect(-1000, 0, 2000, 400);
      c.strokeStyle = P.ink; c.lineWidth = A.px(c, 3); c.beginPath(); c.moveTo(-1000, 0); c.lineTo(1000, 0); c.stroke();
      const flat = t < 447.0;
      V.mrapFront(c, -110, 0, 1, { v: 0, a: 1 }); V.mrapFront(c, 110, 0, 1, { v: 1 });
      const p = A.ph(t, 442.8, 444.3);
      if (p > 0) for (const x of [-110, 110]) { F.explosion(c, x, 6, 60, p); F.shock(c, x, 6, 120 + 30 * p, p, 3); }
      // sóng thoát chéo ở xe chữ V
      if (p > 0 && p < 1) for (let i = -1; i <= 1; i += 2) A.line(c, [[110, 20], [110 + i * 120 * p, -30 * p]], P.amber, A.px(c, 4));
      // xe đáy phẳng bị hất lên
      void flat;
      K.end(c);
    }
    dip(c, t, 441.8, 0.18);
    dip(c, t, 432.26, 0.2);
  }
}
