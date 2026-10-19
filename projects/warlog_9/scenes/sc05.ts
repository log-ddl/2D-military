import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C3: ổn định vs mất ổn định. 76.1–98.0 */
export default class Sc05 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 82.2) this.single(c, t); else this.rows(c, t);
  }

  single(c: C2, t: number) {
    const cam = { x: 0, y: 0, z: 1 };
    S.skyBg(c, cam, t, -350);
    K.begin(c, cam);
    const elev = -0.4 * A.sm(t, 77.0, 77.4);
    const pitch = -0.22 * A.sm(t, 77.6, 81.5);
    S.jetSide(c, 0, 0, 2.1, pitch, { t, ab: 0.3, elev, pilot: true, glow: t > 77 ? ['elev'] : [] });
    // đường mũi mong muốn vs thực tế
    A.withA(c, A.sm(t, 77.0, 77.5), () => {
      const R = 560;
      A.line(c, [[0, 0], [Math.cos(-0.55) * R, Math.sin(-0.55) * R]], P.sky, S.L(c, 4), [14, 12]);
      A.line(c, [[0, 0], [Math.cos(pitch) * R, Math.sin(pitch) * R]], P.ink2, S.L(c, 3));
    });
    K.end(c);
  }

  rows(c: C2, t: number) {
    const cam = { x: 0, y: 0, z: 1 };
    A.clear(c, P.bg);
    K.begin(c, cam);
    const topY = -250, botY = 270;
    A.line(c, [[-900, 10], [900, 10]], P.light, S.L(c, 2));
    // --- hàng trên: cổ điển ổn định
    const ta = A.sm(t, 82.2, 82.8) * (1 - 0.55 * A.sm(t, 90.9, 91.6));
    let pTop = 0;
    if (t > 84.4) pTop += -0.32 * Math.exp(-(t - 84.4) * 0.9) * Math.sin((t - 84.4) * 3.6);
    pTop += -0.22 * A.sm(t, 88.9, 91.2);
    const elevTop = -0.4 * A.win(t, 88.5, 91.5, 0.2, 0.4);
    A.withA(c, ta, () => {
      this.bowl(c, -620, topY + 40, true, -pTop * 220);
      S.jetSide(c, 160, topY, 1.35, pTop, { t, ab: 0.2, elev: elevTop, side: { body: '#8f9a74', light: '#bfc6a3', dark: '#66704f' } });
      // gió giật
      A.withA(c, A.win(t, 83.6, 84.8, 0.2, 0.3), () => S.arrow(c, 400, topY + 240, 430, topY + 70, 30, P.sky));
    });
    // --- hàng dưới: hiện đại mất ổn định
    const ba = A.sm(t, 90.9, 91.5);
    let pBot = 0;
    pBot += 0.035 * Math.sin(t * 7) * A.sm(t, 93.9, 95.0);
    if (t > 96.6) pBot += -0.03 * (Math.exp((t - 96.6) * 2.8) - 1);
    pBot = Math.max(pBot, -Math.PI * 1.3);
    A.withA(c, ba, () => {
      this.bowl(c, -620, botY + 40, false, -Math.max(-1.6, pBot) * 220);
      S.jetSide(c, 160, botY, 1.35, pBot, { t, ab: 0.3 });
      A.withA(c, A.win(t, 96.3, 97.4, 0.1, 0.3), () => S.arrow(c, 390, botY + 170, 400, botY + 60, 18, P.sky));
    });
    K.end(c);
  }

  /** bát (ổn định) hoặc đồi (mất ổn định), bi lệch dx */
  bowl(c: C2, x: number, y: number, stable: boolean, dx: number) {
    const lw = S.L(c, 4);
    c.beginPath();
    if (stable) { c.moveTo(x - 170, y - 90); c.quadraticCurveTo(x, y + 90, x + 170, y - 90); }
    else { c.moveTo(x - 170, y + 60); c.quadraticCurveTo(x, y - 120, x + 170, y + 60); }
    A.fs(c, null, P.ink, lw);
    const bx = A.clamp(dx, -150, 150);
    const k = bx / 170;
    const by = stable ? y - 90 + 90 * (1 - k * k) * 1.0 - 90 * 0 : y + 60 - 90 * (1 - k * k);
    A.circle(c, x + bx, by - 26 + (stable ? 0 : 0), 24, P.amber, P.ink, S.L(c, 3));
  }
}
