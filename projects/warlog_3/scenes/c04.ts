// Chương 4 (151.9 – 178.1): lái. Cánh nghiêng trong dòng nước; bánh lái; chậm thì cánh mất tác dụng.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain } from './_c';

const yK: A.Pt[] = [[151.9, 420], [153, 420], [157, 330], [158.2, 330], [161.4, 420], [164.6, 420], [168.2, 240], [172, 240], [172.8, 240], [177, 300], [178.1, 300]];
const angK: A.Pt[] = [[151.9, 0], [153.2, 0], [154.6, 0.34], [156.6, 0.34], [157.4, 0], [158.2, -0.34], [160.4, -0.34], [161.2, 0], [164.6, 0], [165.4, 0.12], [168.0, 0.12], [168.6, 0.4], [172, 0.4], [172.6, 0], [178, 0]];

export default class S04 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t >= 161.4 && t < 164.6) this.top(c, t);
    else this.side(c, t);
    S.cutDip(c, t, 161.4, 0.12); S.cutDip(c, t, 164.6, 0.12);
    chain(c, t);
  }

  private side(c: CanvasRenderingContext2D, t: number) {
    const y = A.keys(t, yK), ang = A.keys(t, angK);
    const v = t < 161.4 ? 240 : t < 168.5 ? 560 : 110;
    const pitch = -0.2 * (A.keys(t, [[151.9, 0], [154.6, 1], [156.6, 1], [157.4, 0], [158.2, -1], [160.4, -1], [161.2, 0], [164.6, 0], [166, 1], [167.6, 1], [168.4, 0], [172.6, 0], [174, 0.0]]))
      + 0.1 * A.bump(t, 172.8, 4.4);
    const cam: K.Cam = { x: 0, y: y * 0.6 + 120, z: 1.35 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    // dòng nước chạy ngược về phía sau, dày và nhanh khi chạy nhanh
    const nStream = v > 400 ? 34 : v > 200 ? 22 : 9;
    for (let i = 0; i < nStream; i++) {
      const row = A.rnd(i + 5), yy = y - 170 + row * 340;
      const len = 40 + A.rnd(i + 9) * 60;
      const xx = ((A.rnd(i + 1) * 1400 - v * t) % 1400 + 1400) % 1400 - 700;
      A.line(c, [[xx, yy], [xx + len, yy]], 'rgba(56,150,200,0.55)', A.px(c, 3));
    }
    const trimF = t >= 172.8 ? A.keys(t, [[172.8, 0.5], [175, 0.2]]) : 0.5, trimA = t >= 172.8 ? A.keys(t, [[172.8, 0.5], [175, 0.85]]) : 0.5;
    S.drawSubSide(c, t, { x: 0, y, s: 1, cut: 0.35, pitch, planeF: -ang, planeA: -ang, prop: t * (v / 25), hl: t >= 172.8 ? ['trim'] : ['planes'], glow: P.amber, trimF, trimA, plant: 'nuclear', plantRun: 0.5 });
    // lực nâng trên cánh
    const lift = Math.abs(ang) * (v / 240) * 140;
    const dir = ang >= 0 ? -1 : 1;
    if (lift > 8) {
      for (const [lx, ly] of [[46, -80], [-258, 0]] as const) {
        S.arrowW(c, [lx, y + ly], [lx, y + ly + dir * Math.min(lift, 150)], 1, P.sky, 7, 22 / cam.z);
      }
    }
    // bơm nước giữa hai bồn cân bằng khi chậm
    if (t >= 172.8 && t < 176) {
      const p = A.sm(t, 172.8, 173.4) * (1 - A.sm(t, 175.2, 176));
      S.arrowW(c, [140, y + 26], [-190, y + 26], p, P.amber, 7, 20 / cam.z);
    }
    K.end(c);
    // máy bay làm hình so sánh (chỉ lúc nói "giống máy bay")
    const ap = A.sm(t, 152.4, 153.0) * (1 - A.sm(t, 157.6, 158.4));
    if (ap > 0) A.withA(c, ap, () => plane(c, 1560, 210, -ang * 0.8));
    // đồng hồ tốc độ
    const gp = A.sm(t, 164.0, 164.8);
    if (gp > 0) A.withA(c, gp, () => dial(c, 1700, 190, 85, v > 300 ? 0.88 : v > 150 ? 0.4 : 0.12 + 0.02 * Math.sin(t * 2), t >= 172.8 ? P.amber : P.ink));
  }

  private top(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#cde3ee');
    for (let x = 0; x <= A.W; x += 120) A.line(c, [[x, 0], [x, A.H]], 'rgba(60,110,140,0.14)', 2);
    for (let yy = 0; yy <= A.H; yy += 120) A.line(c, [[0, yy], [A.W, yy]], 'rgba(60,110,140,0.14)', 2);
    const th = (tt: number) => A.keys(tt, [[161.4, 0], [162.2, 0], [164.0, 0.8], [164.6, 0.8]]);
    let x = 380, yy = 520, wake: A.Pt[] = [];
    for (let tt = 160.0; tt <= t; tt += 0.05) {
      x += Math.cos(th(tt)) * 5.2; yy += Math.sin(th(tt)) * 5.2;
      if (tt >= 161.0) wake.push([x - Math.cos(th(tt)) * 190, yy - Math.sin(th(tt)) * 190]);
    }
    A.line(c, wake, '#ffffff', 10);
    const rud = A.keys(t, [[161.4, 0], [162.0, 0.5], [164.0, 0.5], [164.6, 0.2]]);
    S.drawSubTop(c, t, { x, y: yy, s: 0.6, rot: th(t), rudder: rud, prop: t });
    // dòng nước qua bánh lái → lực ngang
    const rx = x - Math.cos(th(t)) * 190, ry = yy - Math.sin(th(t)) * 190;
    S.arrowW(c, [rx, ry], [rx + Math.sin(th(t)) * -0 , ry - 110], A.sm(t, 162.0, 162.6), P.sky, 8, 24);
  }
}

function plane(c: CanvasRenderingContext2D, x: number, y: number, el: number) {
  c.save(); c.translate(x, y);
  A.rrect(c, -90, -14, 180, 28, 14, P.light, P.ink, 4);
  A.poly(c, [[-10, 0], [30, -70], [50, -70], [30, 0]], P.slate, P.ink, 3);
  A.poly(c, [[-84, -8], [-100, -44], [-80, -44], [-58, -8]], P.slate, P.ink, 3);
  c.save(); c.translate(-84, 0); c.rotate(el); A.capsule(c, [-36, 0], [0, 0], 7, P.dark, P.ink, 2.5); c.restore();
  c.restore();
}
function dial(c: CanvasRenderingContext2D, x: number, y: number, r: number, v: number, col: string) {
  c.save(); c.translate(x, y);
  A.circle(c, 0, 0, r, '#ffffff', P.ink, 5);
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.8 + 1.4 * i / 8); A.line(c, [[Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78], [Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92]], P.ink2, 3); }
  const a = Math.PI * (0.8 + 1.4 * v);
  A.line(c, [[0, 0], [Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7]], col, 7);
  A.circle(c, 0, 0, 8, col, null, 0);
  c.restore();
}
