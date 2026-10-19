import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C9: phim ảnh (đấu vòng) vs thực tế (mạng). 426.0–451.9 */
const F = (t: number): [number, number] => [-7000 + 200 * (t - 433), 1500];
const E = (t: number): [number, number] => [13000 - 220 * (t - 433), -1800];
const LA = 440.9, HIT = 443.4;
const AW: [number, number] = [-17000, -3500], WM: [number, number] = [-10500, 6500], GR: [number, number] = [-16000, 7200];

export default class Sc20 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 433.1) this.film(c, t); else this.network(c, t);
  }

  film(c: C2, t: number) {
    const cam = { x: 0, y: 0, z: 1.05 };
    S.mapBg(c, cam, 100, '#ece6da');
    K.begin(c, cam);
    const R = 230, w = 1.0;
    const pos = (u: number, off: number): [number, number, number] => { const a = u * w + off; return [R * Math.cos(a), R * Math.sin(a), a + Math.PI / 2]; };
    S.trail(c, (u) => pos(u, 0), t - 2.4, t, P.light, 5);
    S.trail(c, (u) => pos(u, Math.PI), t - 2.4, t, P.light, 5);
    const [ax, ay, ah] = pos(t, 0), [bx, by, bh] = pos(t, Math.PI);
    S.jetTop(c, ax, ay, ah, 0.42, { t, ab: 0.4 });
    S.jetTop(c, bx, by, bh, 0.42, { side: S.ENEMY, t, ab: 0.4 });
    K.end(c);
    // khung phim: viền đen trên dưới
    K.bars(c, A.sm(t, 428.4, 429.0) * (1 - A.sm(t, 432.6, 433.1)), 120);
  }

  network(c: C2, t: number) {
    const cam = K.track(t, [[433.1, { x: -2000, y: 1000, z: 0.034 }], [444, { x: -2000, y: 1000, z: 0.034 }], [451.9, { x: -6000, y: 1500, z: 0.042 }]], A.eio);
    S.mapBg(c, cam, 1000);
    K.begin(c, cam);
    const ic = 0.2 / cam.z;
    const [fx, fy] = F(t), [ex, ey] = E(t);
    // AWACS: radar lớn
    const aw = A.sm(t, 433.3, 433.9);
    A.withA(c, aw, () => S.ring(c, AW[0], AW[1], 34000, P.sky, 3, [20, 16], 0.8));
    S.tankerTop(c, AW[0], AW[1], 0, 0.32 / cam.z * 0.25, true, t);
    // đồng đội và radar mặt đất
    S.jetTop(c, WM[0] + 200 * (t - 433), WM[1], 0, ic, { t });
    const gra = A.sm(t, 433.6, 434.2);
    A.withA(c, gra, () => {
      A.rrect(c, GR[0] - 600, GR[1] - 300, 1200, 600, 120, P.slate, P.ink, S.L(c, 3));
      c.save(); c.translate(GR[0], GR[1] - 500); c.rotate(Math.sin(t) * 0.5);
      c.beginPath(); c.ellipse(0, 0, 700, 300, 0, Math.PI, 0); A.fs(c, P.light, P.ink, S.L(c, 3)); c.restore();
    });
    // liên kết dữ liệu về F
    const link = A.sm(t, 434.4, 435.2);
    const pulse = 1 + 0.6 * A.win(t, 449.6, 451.9, 0.3, 0.2) * (0.5 + 0.5 * Math.sin(t * 10));
    const srcs: [number, number][] = [AW, [WM[0] + 200 * (t - 433), WM[1]], [GR[0], GR[1] - 500]];
    srcs.forEach(([sx, sy]) => {
      A.withA(c, link, () => {
        A.line(c, [[sx, sy], [fx, fy]], P.sky, S.L(c, 3 * pulse), [12, 12]);
        for (let k = 0; k < 3; k++) { const p = ((t - 434) * 0.8 + k / 3) % 1; A.circle(c, A.lerp(sx, fx, p), A.lerp(sy, fy, p), 260 * pulse, P.sky, null); }
      });
    });
    // AWACS thấy địch trước, báo cho F; radar riêng của F ngắn
    const told = A.sm(t, 438.0, 438.6);
    A.withA(c, told, () => A.line(c, [AW, [ex, ey]], P.sky, S.L(c, 2), [6, 10]));
    A.withA(c, A.sm(t, 439.5, 440.0), () => S.ring(c, fx, fy, 9000, P.ink2, 3, [10, 10]));
    if (t < HIT && told > 0) A.withA(c, told, () => { c.save(); c.translate(ex, ey); c.rotate(Math.PI / 4); A.rrect(c, -1300, -1300, 2600, 2600, 150, null, P.sky, S.L(c, 4)); c.restore(); });
    // bắn trước, không cần quay
    if (t > LA) {
      const p = A.ph(t, LA, HIT);
      const [x0, y0] = F(LA), [x1, y1] = E(HIT);
      const mx = A.lerp(x0, x1, p), my = A.lerp(y0, y1, p) - Math.sin(p * Math.PI) * 2500;
      S.trail(c, (u) => { const q = A.ph(u, LA, HIT); return [A.lerp(x0, x1, q), A.lerp(y0, y1, q) - Math.sin(q * Math.PI) * 2500, 0]; }, LA, Math.min(t, HIT), P.ink2, 2.5);
      if (t < HIT) S.missileSide(c, mx, my, ic * 0.55, Math.atan2(y1 - y0, x1 - x0) - Math.cos(p * Math.PI) * 0.4, { flame: 1, t });
    }
    if (t < HIT + 0.05) S.jetTop(c, ex, ey, Math.PI, ic, { side: S.ENEMY, t });
    S.boom(c, E(HIT)[0], E(HIT)[1], 2400, A.ph(t, HIT, HIT + 1.4));
    S.trail(c, (u) => [F(u)[0], F(u)[1], 0], 433.1, t, P.oliveLight, 3);
    S.jetTop(c, fx, fy, 0, ic, { t });
    // không phải động cơ hay cánh
    const nw = A.win(t, 447.8, 449.8, 0.3, 0.4);
    if (nw > 0) A.withA(c, nw, () => {
      S.iconCost(c, 'heat', fx - 1800, fy - 3200, 0.9 / cam.z, P.amber);
      A.line(c, [[fx - 2800, fy - 4200], [fx - 800, fy - 2200]], P.ink, S.L(c, 5));
    });
    K.end(c);
  }
}
