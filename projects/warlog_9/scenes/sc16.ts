import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C7: một hay hai động cơ. 319.5–345.2 */
export default class Sc16 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 329.8) this.compare(c, t, false);
    else if (t < 339.0) this.sea(c, t);
    else this.compare(c, t, true);
  }

  compare(c: C2, t: number, end: boolean) {
    const cam = { x: 0, y: 40, z: 0.92 };
    S.mapBg(c, cam, 100);
    K.begin(c, cam);
    const lx = -470, rx = 470;
    const extra = end ? 1 : 0;
    // nhiều chiếc một động cơ
    const pos: [number, number][] = [[lx, 0], [lx - 230, -230], [lx - 230, 230], [lx - 460, 0]];
    pos.forEach(([x, y], i) => {
      const a = i === 0 ? A.sm(t, 319.6, 320.2) : Math.max(extra, A.back(t, 328.6 + i * 0.2, 329.0 + i * 0.2));
      if (a > 0) A.withA(c, Math.min(1, a), () => S.jetTop(c, x + 120, y, 0, 0.5 * Math.min(1.1, a), { t }));
    });
    const twins: [number, number][] = [[rx, -130], [rx, 200]];
    twins.forEach(([x, y], i) => {
      const a = i === 0 ? A.sm(t, 320.4, 321.0) : Math.max(extra, A.back(t, 329.1, 329.5));
      if (a > 0) A.withA(c, Math.min(1, a), () => S.jetTop(c, x + 60, y, 0, 0.72 * Math.min(1.1, a), { t, twin: true }));
    });
    if (!end) {
      // nhẹ hơn, rẻ hơn
      const w = A.back(t, 325.2, 325.6), co = A.back(t, 325.8, 326.2);
      if (w > 0) S.iconCost(c, 'weight', lx + 40, 300, 0.55 * w, P.dark);
      if (co > 0) S.iconCost(c, 'cost', lx + 170, 300, 0.55 * co, S.COST_COL.cost!);
      if (w > 0) S.iconCost(c, 'weight', rx + 0, 420, 0.9 * w, P.dark);
      if (co > 0) S.iconCost(c, 'cost', rx + 150, 420, 0.9 * co, S.COST_COL.cost!);
    } else {
      // đếm máy bay vs đếm người
      const pa = A.win(t, 342.0, 345.2, 0.3, 0.1);
      pos.forEach(([x, y]) => { const p = (t * 1.3) % 1; S.ring(c, x + 120, y, 80 + p * 60, P.amber, 3, undefined, pa * (1 - p)); });
      const pb = A.sm(t, 343.4, 343.9);
      if (pb > 0) {
        const hx = rx + 60 + 105 * 0.72, hy = -130;
        S.ring(c, hx, hy, 40 + 10 * Math.sin(t * 6), P.amber, 5, undefined, pb);
        S.ring(c, hx, 200, 40 + 10 * Math.sin(t * 6), P.amber, 5, undefined, pb);
      }
    }
    K.end(c);
  }

  sea(c: C2, t: number) {
    const cam = K.track(t, [[329.8, { x: 300, y: 0, z: 0.55 }], [339, { x: 0, y: 0, z: 0.6 }]]);
    A.clear(c, '#cfe2ea');
    K.begin(c, cam);
    // bờ biển và căn cứ
    A.poly(c, [[-3000, -2000], [-1100, -2000], [-1000, -900], [-1180, -300], [-1050, 300], [-1200, 900], [-1100, 2000], [-3000, 2000]], '#dfe6d3', P.ink2, S.L(c, 3));
    A.rrect(c, -1500, -20, 260, 40, 8, P.slate, P.ink, S.L(c, 3));
    // sóng
    for (let i = 0; i < 30; i++) {
      const x = -900 + A.rnd(i) * 3200, y = -900 + A.rnd(i + 7) * 1800;
      A.line(c, [[x, y], [x + 30, y - 10], [x + 60, y]], '#a9c9d6', S.L(c, 2));
    }
    // máy bay hai động cơ: một động cơ tắt, vẫn quay về
    const turn = A.eio(t, 332.6, 334.0);
    const h = A.lerp(0, Math.PI, turn);
    let x = 0, y = 120;
    const dt = 1 / 15;
    for (let u = 329.8; u < t; u += dt) {
      const d = Math.min(dt, t - u), hh = A.lerp(0, Math.PI, A.eio(u, 332.6, 334.0));
      x += Math.cos(hh) * 480 * d; y += Math.sin(hh) * 160 * d;
    }
    const dead = t > 332.2 ? 1 : 0;
    if (dead) for (let i = 0; i < 6; i++) {
      const p = ((t - 332.2) * 0.7 + i / 6) % 1;
      S.puff(c, x - Math.cos(h) * (120 + p * 300), y - Math.sin(h) * (120 + p * 300) - 14, 18 + p * 30, (1 - p) * 0.6);
    }
    if (t > 332.2) S.boom(c, x - Math.cos(h) * 100, y - 14, 60, A.ph(t, 332.2, 333.0));
    const radar = A.sm(t, 337.1, 337.6);
    S.cone(c, x, y, h, 0.5, 1200, P.sky, 0.15 * radar);
    S.jetTop(c, x, y, h, 0.6, { t, twin: true, ab: 0.4, deadEng: dead, stores: t > 338.1 ? 6 : 0 });
    K.end(c);
  }
}
