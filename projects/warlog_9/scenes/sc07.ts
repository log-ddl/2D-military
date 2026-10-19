import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C4: xưa vài trăm mét bằng súng → nay radar hàng chục km, tên lửa tự dẫn. 112–144 */
const F = (t: number): [number, number] => [-26000 + 300 * (t - 121.3), 3000];
const E = (t: number): [number, number] => [24000 - 300 * (t - 121.3), -2500];
const LA = 130.1, HIT = 134.6;
function M(t: number): [number, number, number] {
  const p = A.ph(t, LA, HIT);
  const [x0, y0] = F(LA), [x1, y1] = E(HIT);
  const x = A.lerp(x0, x1, p), y = A.lerp(y0, y1, p) - Math.sin(p * Math.PI) * 4000;
  const q = Math.min(1, p + 0.01);
  const x2 = A.lerp(x0, x1, q), y2 = A.lerp(y0, y1, q) - Math.sin(q * Math.PI) * 4000;
  return [x, y, Math.atan2(y2 - y, x2 - x)];
}

export default class Sc07 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 121.3) this.dogfight(c, t); else this.bvr(c, t);
  }

  dogfight(c: C2, t: number) {
    const cam = K.track(t, [[112, { x: 0, y: 0, z: 1.15 }], [121.3, { x: 0, y: 0, z: 0.95 }]]);
    S.mapBg(c, cam, 100, '#e6ece0');
    K.begin(c, cam);
    const R = 270, w = 0.75;
    const pos = (u: number, off: number): [number, number, number] => { const a = u * w + off; return [R * Math.cos(a), R * Math.sin(a), a + Math.PI / 2]; };
    const tr = (off: number): S.Track => (u) => pos(u, off);
    S.trail(c, tr(0), t - 2.5, t, P.light, 5);
    S.trail(c, tr(0.9), t - 2.5, t, P.light, 5);
    const [fx, fy, fh] = pos(t, 0), [ex, ey, eh] = pos(t, 0.9);
    // loạt đạn súng
    for (const t0 of [117.6, 119.6]) {
      const p = A.ph(t, t0, t0 + 0.7);
      if (p > 0 && p < 1) {
        for (let i = 0; i < 6; i++) {
          const d = 70 + ((p * 4 + i / 6) % 1) * 260;
          const ang = fh + 0.25;
          A.line(c, [[fx + Math.cos(ang) * d, fy + Math.sin(ang) * d], [fx + Math.cos(ang) * (d + 24), fy + Math.sin(ang) * (d + 24)]], P.amber, S.L(c, 5));
        }
      }
    }
    S.jetTop(c, ex, ey, eh, 0.42, { side: S.ENEMY, t, ab: 0.3 });
    S.jetTop(c, fx, fy, fh, 0.42, { t, ab: 0.3 });
    K.end(c);
  }

  bvr(c: C2, t: number) {
    const [fx0] = F(t);
    const cam = K.track(t, [
      [121.3, { x: 0, y: 0, z: 0.032 }], [138.6, { x: 0, y: 0, z: 0.032 }],
      [142.5, { x: fx0 + 6000, y: 2000, z: 0.07 }],
    ], A.eio);
    S.mapBg(c, cam, 1000);
    K.begin(c, cam);
    const ic = 0.22 / cam.z;
    const [fx, fy] = F(t), [ex, ey] = E(t);
    // tầm mắt nhìn (rất nhỏ)
    const eyeA = A.sm(t, 122.2, 123.2) * (0.5 + 0.5 * A.win(t, 135.0, 138.4, 0.4, 0.6));
    S.ring(c, fx, fy, 3000, P.ink2, 3, [8, 8], eyeA);
    if (t < HIT + 0.2) S.ring(c, ex, ey, 3000, P.ink2, 3, [8, 8], eyeA);
    A.withA(c, eyeA, () => {
      S.iconCost(c, 'eye', fx, fy - 4600, 0.7 / cam.z, P.ink2);
      if (t < HIT) S.iconCost(c, 'eye', ex, ey - 4600, 0.7 / cam.z, P.ink2);
    });
    // radar quét → khoá
    const ra = A.sm(t, 125.0, 125.6);
    const lockP = A.sm(t, 127.6, 128.4);
    const toE = Math.atan2(ey - fy, ex - fx);
    const dir = A.lerp(0.42 * Math.sin((t - 125) * 2.4), toE, lockP);
    const half = A.lerp(0.42, 0.12, lockP);
    S.cone(c, fx, fy, dir, half, 48000, P.sky, 0.14 * ra);
    A.withA(c, ra * 0.7, () => {
      c.beginPath(); c.arc(fx, fy, 48000, dir - half, dir + half); A.fs(c, null, P.sky, S.L(c, 2));
    });
    // dấu khoá mục tiêu
    if (t > 127.8 && t < HIT) {
      const pr = 1 + 0.15 * Math.sin(t * 8);
      A.withA(c, A.sm(t, 127.8, 128.2), () => {
        c.save(); c.translate(ex, ey); c.rotate(Math.PI / 4);
        A.rrect(c, -1700 * pr, -1700 * pr, 3400 * pr, 3400 * pr, 200, null, P.sky, S.L(c, 4));
        c.restore();
      });
    }
    // tên lửa + liên kết dữ liệu + đầu dò riêng
    if (t > LA) {
      const [mx, my, mh] = M(t);
      S.trail(c, (u) => M(u), LA, Math.min(t, HIT), P.ink2, 2.5);
      if (t < 131.9) A.line(c, [[fx, fy], [mx, my]], P.sky, S.L(c, 3), [10, 10]);
      if (t < HIT) {
        const sk = A.sm(t, 131.8, 132.4);
        S.cone(c, mx, my, mh, 0.35, 12000, P.sky, 0.3 * sk);
        S.missileSide(c, mx, my, ic * 0.6, mh, { flame: t < 133 ? 1 : 0.2, t });
      }
    }
    if (t < HIT + 0.05) S.jetTop(c, ex, ey, Math.PI, ic, { side: S.ENEMY, t });
    S.boom(c, E(HIT)[0], E(HIT)[1], 3200, A.ph(t, HIT, HIT + 1.4));
    S.jetTop(c, fx, fy, 0, ic, { t, ab: 0.2 });
    K.end(c);
  }
}
