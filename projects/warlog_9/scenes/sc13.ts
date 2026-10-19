import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C5: vũ khí dưới cánh vs trong thân; thả bớt trước khi đánh. 244.4–268.4 */
export default class Sc13 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 261.3) this.front(c, t); else this.drop(c, t);
  }

  front(c: C2, t: number) {
    const cam = K.track(t, [[244.4, { x: 0, y: 0, z: 0.95 }], [255.6, { x: -260, y: 0, z: 1.05 }], [256.6, { x: 0, y: 0, z: 0.95 }], [258.0, { x: 220, y: 0, z: 1.05 }]], A.eio);
    S.skyBg(c, cam, t, -120);
    K.begin(c, cam);
    const lx = -470, rx = 470, y = -40, s = 1.45;
    // số vũ khí ngoài tăng dần
    const n = Math.floor(A.clamp((t - 247.0) / 0.4, 0, 8));
    const bay = A.eio(t, 256.3, 257.2);
    // sóng radar đến từ bên phải, phản xạ mạnh từ chiếc mang ngoài
    const wv = A.sm(t, 253.7, 254.2);
    if (wv > 0) {
      for (let i = 0; i < 5; i++) {
        const p = ((t - 253.7) * 0.8 + i / 5) % 1;
        A.withA(c, wv * (1 - p) * 0.8, () => {
          c.beginPath(); c.arc(lx, y + 40, 120 + p * 420, -0.9, 0.9); A.fs(c, null, P.enemy, S.L(c, 3));
        });
      }
    }
    S.jetFront(c, lx, y, s, { stores: n });
    S.jetFront(c, rx, y, s, { bay: 3, bayOpen: bay });
    // khoang chỉ chứa ít
    const few = A.win(t, 260.2, 261.3, 0.15, 0.2);
    if (few > 0) A.withA(c, few, () => S.ring(c, rx, y + 70 * s / 1.45 * 1.0 + 0, 90, P.amber, 5));
    // thanh tốc độ (lực cản)
    const barA = A.sm(t, 251.9, 252.4);
    A.withA(c, barA, () => {
      const lw = A.lerp(380, 210, A.eio(t, 252.2, 253.3));
      const rw = 380 * A.sm(t, 258.3, 258.8) + 0;
      A.rrect(c, lx - 190, 300, 380, 34, 17, P.paper, P.ink, S.L(c, 3));
      A.rrect(c, lx - 190, 300, lw, 34, 17, P.sky, P.ink, S.L(c, 3));
      A.withA(c, A.sm(t, 258.3, 258.8), () => {
        A.rrect(c, rx - 190, 300, 380, 34, 17, P.paper, P.ink, S.L(c, 3));
        A.rrect(c, rx - 190, 300, Math.max(34, rw), 34, 17, P.sky, P.ink, S.L(c, 3));
      });
      // mũi tên cản sau chiếc mang ngoài
      A.withA(c, A.sm(t, 252.2, 252.6), () => S.iconCost(c, 'weight', lx - 270, 317, 0.6, P.dark));
    });
    // dễ thấy / ẩn
    const eyeL = A.back(t, 254.4, 254.8);
    if (eyeL > 0) S.iconCost(c, 'eye', lx, y - 260, 1.3 * eyeL, P.enemy);
    const eyeR = A.sm(t, 259.0, 259.5);
    if (eyeR > 0) A.withA(c, eyeR, () => {
      S.iconCost(c, 'eye', rx, y - 260, 1.3, P.light);
      A.line(c, [[rx - 60, y - 310], [rx + 60, y - 210]], P.ink2, S.L(c, 5));
    });
    K.end(c);
  }

  drop(c: C2, t: number) {
    const lt = t - 261.3;
    const v = 600 + 260 * A.sm(t, 266.0, 268.0);
    const jx = 600 * lt + 260 * Math.max(0, t - 266.5) * 0.5, jy = 0;
    const cam = { x: jx + 120, y: 60, z: 0.9 };
    S.skyBg(c, cam, t, 0);
    K.begin(c, cam);
    const D = 265.7;
    const kept = t < D;
    // vật bị thả: rơi, xoay, tụt lại
    if (!kept) {
      const u = t - D;
      const fall = (x0: number, y0: number, seed: number, drawFn: (x: number, y: number, r: number) => void) => {
        const x = jx - (v - 600) * u + (600 * D - 600 * D) + x0 - 260 * u, y = jy + y0 + 0.5 * 900 * u * u;
        drawFn(x, y, u * (0.6 + seed * 0.3));
      };
      const s = 2.0;
      for (let i = 0; i < 4; i++) {
        const mx = (-10 - i * 34) * s, my = (30 + (i % 2) * 6) * s;
        fall(mx, my, i, (x, y, r) => S.missileSide(c, x, y, 0.42 * s, r, {}));
      }
      fall(-40 * s, 40 * s, 5, (x, y, r) => { c.save(); c.translate(x, y); c.rotate(r); A.ellipse(c, 0, 0, 70 * s, 12 * s, 0, P.sand, P.ink, S.L(c, 3)); c.restore(); });
    }
    S.jetSide(c, jx, jy, 2.0, 0, { t, ab: kept ? 0.35 : 0.35 + 0.4 * A.sm(t, 266.2, 266.8), stores: kept ? 4 : 0, tanks: kept ? 1 : 0, pilot: true });
    K.end(c);
  }
}
