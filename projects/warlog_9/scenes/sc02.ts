import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

/** C1: giới hạn máy > giới hạn người; câu hỏi; hệ thống và cái giá. 15.12–42.1 */
export default class Sc02 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    if (t < 24.6) this.bars(c, t); else this.jet(c, t);
  }

  bars(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, P.paper);
    K.begin(c, { x: 0, y: 0, z: 1 });
    const base = 300, k = 52;
    const gP = 9 * A.eo(t, 15.3, 18.0), gJ = 12.5 * A.eo(t, 15.3, 19.0);
    // thang
    for (let g = 0; g <= 13; g++) {
      const y = base - g * k;
      A.line(c, [[-460, y], [-430, y]], P.ink2, S.L(c, 2));
      if (g % 3 === 0) S.label(c, `${g}`, -490, y, 28, P.ink2);
    }
    A.line(c, [[-445, base], [-445, base - 13 * k]], P.ink2, S.L(c, 2));
    // cột phi công
    const warn = A.sm(t, 19.8, 20.4);
    A.rrect(c, -330, base - gP * k, 200, gP * k, 10, A.lerpColor(P.olive, S.BLOOD, warn), P.ink, S.L(c, 3));
    // cột máy bay: phần trên vạch 9 bị bỏ phí khi người là giới hạn
    const jx = 130, dim = A.sm(t, 21.0, 23.5);
    A.rrect(c, jx, base - gJ * k, 200, gJ * k, 10, P.oliveLight, P.ink, S.L(c, 3));
    if (gJ > 9) A.withA(c, dim, () => {
      A.rrect(c, jx, base - gJ * k, 200, (gJ - 9) * k, 10, P.light, P.ink, S.L(c, 3));
      for (let i = 0; i < 8; i++) A.line(c, [[jx + i * 30, base - 9 * k], [jx + i * 30 + 40, base - gJ * k]].map(([x, y]) => [Math.min(x, jx + 200), y]) as [number, number][], P.ink2, S.L(c, 1.5));
    });
    // vạch giới hạn người
    const ln = A.sm(t, 17.4, 18.2);
    A.withA(c, ln, () => {
      A.line(c, [[-420, base - 9 * k], [420, base - 9 * k]], S.BLOOD, S.L(c, 4), [18, 12]);
      S.label(c, '9G', 470, base - 9 * k, 40, S.BLOOD);
    });
    // nhận dạng dưới cột
    S.pilotSide(c, -235, 470, 0.5, {});
    S.jetSide(c, 230, 430, 0.55, 0, {});
    K.end(c);
  }

  jet(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(t, [[24.6, { x: 0, y: 30, z: 1.05 }], [31.5, { x: 0, y: 30, z: 1.0 }], [34, { x: 0, y: 70, z: 0.92 }]], A.eio);
    S.skyBg(c, cam, t, -260);
    K.begin(c, cam);
    const glows: string[] = [];
    const g = (k: string, a: number) => { if (t > a && t < a + 0.9) glows.push(k); };
    g('engine', 32.1); g('wing', 32.5); g('radar', 32.9); g('elev', 33.3);
    const sink = 20 * A.sm(t, 38.4, 39.0);
    const stores = t > 33.5 ? 2 : 0;
    S.jetSide(c, -20, -40 + sink + Math.sin(t * 1.3) * 4, 2.4, 0, { t, ab: 0.15 + 0.4 * A.sm(t, 39.2, 39.8), glow: glows, stores, pilot: true });
    // đối thủ ở xa: câu hỏi "thắng một trận"
    const ea = A.sm(t, 26.8, 27.6) * (1 - A.sm(t, 31.0, 31.8));
    A.withA(c, ea, () => S.jetSideL(c, 760 - (t - 26) * 18, -340, 0.5, 0, { side: S.ENEMY }));
    // kéo ngược nhau: hai mũi tên đối nghịch
    A.withA(c, A.win(t, 29.6, 31.6), () => {
      S.arrow(c, -40, 230, -340, 230, 30, P.sky);
      S.arrow(c, 40, 230, 340, 230, 30, P.amber);
    });
    // bốn cái giá
    const ks = ['weight', 'heat', 'cost', 'eye'] as const, at = [38.4, 39.2, 40.0, 40.9];
    ks.forEach((k, i) => {
      const p = A.back(t, at[i]!, at[i]! + 0.35);
      if (p <= 0) return;
      const x = -390 + i * 260, y = 360;
      A.circle(c, x, y, 62 * p, P.paper, P.ink, S.L(c, 3));
      S.iconCost(c, k, x, y + 4, 0.95 * p, S.COST_COL[k]);
    });
    K.end(c);
  }
}
