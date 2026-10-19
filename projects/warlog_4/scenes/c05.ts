// Chương 5 (168.7 – 188.8): tàu quay ngược gió. TRÊN (quay mũi, luồng khí qua sàn) → NGANG (tốc độ không khí cộng vào).
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain, icon } from './_c';

const T_TURN0 = 173.0, T_TURN1 = 177.2, T_SIDE = 180.2;
const WIND = '#7dd3fc';

export default class C05 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < T_SIDE) this.top(c, t); else this.side(c, t);
    S.cutDip(c, t, T_SIDE, 0.14);
    chain(c, t);
  }

  private streaks(c: CanvasRenderingContext2D, t: number, a = 1, speed = 520) {
    // gió thổi từ phải sang trái, vạch dài
    c.save(); c.globalAlpha *= a;
    for (let i = 0; i < 26; i++) {
      const r = A.rnd(i * 7 + 3);
      const y = -520 + A.rnd(i * 11 + 1) * 1040;
      const len = 120 + r * 160;
      const x = ((A.rnd(i * 5 + 2) * 2400 - speed * t * (0.8 + r * 0.4)) % 2400 + 2400) % 2400 - 1200;
      A.line(c, [[x, y], [x + len, y]], WIND, A.px(c, 5));
    }
    c.restore();
  }

  private top(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 15, y: 0, z: 1.05 };
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 20);
    const rot = A.lerp(0.95, 0, A.eio(t, T_TURN0, T_TURN1));
    const turning = t > T_TURN0 - 0.4 && t < T_TURN1;
    // gió
    this.streaks(c, t, A.sm(t, 168.9, 170.0));
    // vệt nước phía sau (dài khi chạy hết tốc lực)
    const sp = A.sm(t, T_TURN0, T_TURN0 + 2.5);
    const wl = 150 + 260 * sp;
    const hx = Math.cos(rot), hy = Math.sin(rot);
    const bx = -470 * hx, by = -470 * hy;
    A.line(c, [[bx, by], [bx - hx * wl, by - hy * wl]], '#ffffff', A.px(c, 18));
    S.carrierTop(c, t, { x: 0, y: 0, rot, angled: 1 });
    // luồng khí qua sàn (trong toạ độ tàu): dày lên khi thẳng ngược gió
    const air = A.sm(t, T_TURN1 - 0.6, T_TURN1 + 0.6) * A.sm(t, 176.6, 177.4);
    if (air > 0) {
      c.save(); c.rotate(rot);
      for (let i = 0; i < 9; i++) {
        const y = -48 + i * 12;
        const x0 = 540 - ((t * 700 + i * 130) % 1200);
        A.line(c, [[x0, y], [x0 + 150, y]], WIND, A.px(c, 4));
      }
      c.restore();
    }
    // mũi tên tốc độ tàu (hổ phách) sau khi đã thẳng
    const ap = A.sm(t, 177.0, 177.8);
    S.arrowW(c, [540, 0], [540 + 150, 0], ap, P.amber, 10, 34);
    K.end(c);
    const [tx, ty] = K.toScreen(cam, 540 + 75, 0);
    S.tag(c, '30 kn', tx, ty - 60, A.win(t, 176.9, 180.0, 0.2, 0.4), { size: 44 });
    void turning;
  }

  private side(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 40, y: -10, z: 1.4 };
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 120 });
    S.carrierSide(c, t, { x: 0, y: 0, noIsland: true });
    // phản lực chờ trên máy phóng + phản lực đang hạ cánh
    S.jetSide(c, 210, -S.JET_H * 1.2, 1.2, { gear: 1, hero: true });
    const lt = ((t - T_SIDE) * 0.9) % 1;
    const lx = A.lerp(-950, -300, lt), ly = -S.JET_H * 1.2 - (-300 - lx) * 0.09;
    S.jetSide(c, lx, ly, 1.2, { gear: 1, hook: 1, ang: -0.1, a: A.sm(lt, 0, 0.1) });
    S.carrierIsland(c, t, { x: 0, y: 0 });
    // luồng khí chảy qua sàn (từ mũi về đuôi)
    const ap = A.sm(t, 180.6, 181.6);
    for (let i = 0; i < 12; i++) {
      const y = -150 + i * 12 + (i % 3) * 4;
      const x = 560 - ((t * 780 + i * 170) % 1600);
      c.save(); c.globalAlpha *= ap;
      A.line(c, [[x, y], [x + 130, y]], WIND, A.px(c, 4));
      c.restore();
    }
    K.end(c);

    // hai thanh so sánh: đứng yên vs ngược gió. Cất cánh và hạ cánh.
    const x = 120, w = 540;
    // CẤT CÁNH
    const p1 = A.sm(t, 181.0, 181.8), p2 = A.sm(t, 182.4, 183.4);
    if (p1 > 0) {
      c.save(); c.globalAlpha *= p1;
      icon(c, 'cat', x - 54, 178, 34);
      A.rrect(c, x, 160, w, 36, 18, '#ffffff', P.ink, 3.5);
      A.rrect(c, x + 2, 162, (w - 4), 32, 16, P.amber, null, 0);
      A.line(c, [[x + w * 0.96, 148], [x + w * 0.96, 208]], P.enemy, 6);
      c.restore();
    }
    if (p2 > 0) {
      c.save(); c.globalAlpha *= p2;
      icon(c, 'cat', x - 54, 262, 34);
      A.rrect(c, x, 244, w, 36, 18, '#ffffff', P.ink, 3.5);
      const blue = w * 0.28 * p2;
      c.save(); c.beginPath(); c.roundRect(x + 2, 246, w - 4, 32, 16); c.clip();
      c.fillStyle = WIND; c.fillRect(x + 2, 246, blue, 32);
      c.fillStyle = P.amber; c.fillRect(x + 2 + blue, 246, (w - 4) * 0.96 - blue, 32);
      c.restore();
      A.line(c, [[x + w * 0.96, 232], [x + w * 0.96, 292]], P.enemy, 6);
      c.restore();
    }
    // HẠ CÁNH
    const q1 = A.sm(t, 184.4, 185.2), q2 = A.sm(t, 185.8, 186.8);
    if (q1 > 0) {
      c.save(); c.globalAlpha *= q1;
      icon(c, 'wire', x - 54, 420, 34);
      A.rrect(c, x, 402, w, 36, 18, '#ffffff', P.ink, 3.5);
      A.rrect(c, x + 2, 404, w - 4, 32, 16, P.enemyLight, null, 0);
      c.restore();
    }
    if (q2 > 0) {
      c.save(); c.globalAlpha *= q2;
      icon(c, 'wire', x - 54, 504, 34);
      A.rrect(c, x, 486, w, 36, 18, '#ffffff', P.ink, 3.5);
      const keep = (w - 4) * 0.72;
      c.save(); c.beginPath(); c.roundRect(x + 2, 488, w - 4, 32, 16); c.clip();
      c.fillStyle = P.enemyLight; c.fillRect(x + 2, 488, keep, 32);
      c.fillStyle = WIND; c.fillRect(x + 2 + keep, 488, (w - 4) - keep, 32);
      c.restore();
      c.restore();
    }
  }
}
