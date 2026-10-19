import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C6: tên lửa tầm nhiệt, pháo; bậc thang vũ khí và khe hở. 268.4–292.1 */
export default class Sc14 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 278.6) this.side(c, t); else this.ladder(c, t);
  }

  side(c: C2, t: number) {
    const cam = { x: 0, y: -60, z: 0.92 };
    S.skyBg(c, cam, t, -700);
    K.begin(c, cam);
    const ey = -60 - 300 * A.eio(t, 273.7, 275.4), ep = -0.45 * A.win(t, 273.6, 275.8, 0.5, 0.8);
    const ex = 430;
    const tailX = ex - 222 * Math.cos(ep), tailY = ey - 222 * Math.sin(ep);
    // nhiệt từ động cơ địch
    for (let i = 0; i < 3; i++) {
      const p = ((t * 1.2) + i / 3) % 1;
      S.ring(c, tailX, tailY, 30 + p * 110, P.amber, 3, undefined, (1 - p) * 0.7);
    }
    const fp = -0.28 * A.win(t, 275.4, 278.4, 0.6, 0.6);
    const fx = -560, fy = 120 - 120 * A.eio(t, 275.4, 276.6);
    // tên lửa tầm nhiệt: bám nhiệt, mục tiêu bẻ lên → trượt
    const LA = 272.3;
    if (t > LA) {
      const mx = fx + 100 + 560 * (t - LA);
      const tyAt = (u: number) => { const yy = -60 - 300 * A.eio(u, 273.7, 275.4); return yy; };
      const my = A.lerp(fy + 40, tyAt(Math.min(t, 274.0)), A.sm(t, LA, 273.9));
      const ma = A.sm(t, LA, LA + 0.1) * (1 - A.sm(t, 275.0, 275.6));
      A.withA(c, ma, () => {
        A.line(c, [[fx + 100, fy + 40], [mx, my]], P.light, S.L(c, 6));
        S.cone(c, mx, my, 0, 0.3, 420, P.amber, 0.25 * (t < 274.2 ? 1 : 0.3));
        S.missileSide(c, mx, my, 0.75, 0, { flame: 1, t });
      });
    }
    // loạt pháo
    const G0 = 276.4, G1 = 277.3;
    if (t > G0 && t < G1 + 0.3) {
      const ca = Math.cos(fp), sa = Math.sin(fp);
      const nx = fx + 215 * ca, ny = fy + 215 * sa;
      const tx = ex - 40, ty = ey;
      for (let i = 0; i < 7; i++) {
        const p = ((t - G0) * 3 + i / 7) % 1;
        if (t > G1 && p < 0.5) continue;
        const x = A.lerp(nx, tx, p), y = A.lerp(ny, ty, p);
        A.line(c, [[x, y], [x + 40, y + (ty - ny) / (tx - nx) * 40]], P.amber, S.L(c, 6));
      }
      S.ring(c, tx, ty, 40 + 20 * Math.sin(t * 40), P.amber, 5);
    }
    const hit = A.sm(t, 277.0, 277.5);
    if (hit > 0) for (let i = 0; i < 5; i++) {
      const p = ((t - 277) * 0.8 + i / 5) % 1;
      S.puff(c, ex - 120 - p * 500, ey - 10 - p * 30, 20 + p * 40, (1 - p) * 0.7 * hit);
    }
    S.jetSide(c, ex, ey, 1.0, ep, { side: S.ENEMY, t, ab: 0.4 });
    S.jetSide(c, fx, fy, 1.0, fp, { t, ab: 0.4, stores: t < LA ? 2 : 1, pilot: true });
    K.end(c);
  }

  ladder(c: C2, t: number) {
    const cam = K.track(t, [[278.6, { x: 0, y: 0, z: 0.85 }], [292.1, { x: 40, y: 0, z: 0.88 }]]);
    S.mapBg(c, cam, 100);
    K.begin(c, cam);
    const fx = -620, fy = 0;
    const bands: [number, number, number, number, string][] = [
      [1350, 0.42, 280.6, 0, P.sky], [820, 0.6, 281.1, 1, P.amber], [330, 0.22, 281.5, 2, P.enemyLight],
    ];
    const choose = A.sm(t, 289.8, 290.6);
    bands.forEach(([R, half, at, i, col]) => {
      const a = A.sm(t, at, at + 0.4);
      const dim = i === 1 ? 1 : 1 - 0.6 * choose;
      S.cone(c, fx, fy, 0, half, R, col, 0.18 * a * dim + (i === 1 ? 0.15 * choose : 0));
      A.withA(c, a * dim, () => { c.beginPath(); c.arc(fx, fy, R, -half, half); A.fs(c, null, col, S.L(c, i === 1 ? 4 + 3 * choose : 4)); });
    });
    // tầm xa: mục tiêu kịp quay đầu chạy, tên lửa hụt hơi
    const L0 = 283.9;
    const e1A = A.sm(t, 283.2, 283.6) * (1 - A.sm(t, 286.6, 287.2));
    if (e1A > 0) {
      const turn = A.eio(t, 284.4, 285.4);
      const h = A.lerp(Math.PI, 0.1, turn);
      const ex = 640 + (t < 284.4 ? -(t - 283.2) * 90 : -108 + (t - 284.4) * 260 * turn), ey = -200;
      A.withA(c, e1A, () => S.jetTop(c, ex, ey, h, 0.3, { side: S.ENEMY, t }));
      if (t > L0) {
        const p = A.ph(t, L0, 286.4);
        const mx = fx + 60 + p * 1250, my = A.lerp(0, -170, p);
        A.withA(c, e1A * (1 - A.sm(t, 285.9, 286.5)), () => {
          A.line(c, [[fx + 60, 0], [mx, my]], P.ink2, S.L(c, 2), [8, 8]);
          S.missileSide(c, mx, my, 0.3, Math.atan2(-170, 1250), { flame: p < 0.5 ? 1 : 0, t });
        });
      }
    }
    // tầm gần: cắt ngang quá nhanh, khó đưa vào nón hẹp
    const e2A = A.win(t, 285.9, 288.4, 0.3, 0.4);
    if (e2A > 0) {
      const ex = fx + 220, ey = A.lerp(-420, 420, A.ph(t, 285.9, 288.4));
      A.withA(c, e2A, () => {
        S.jetTop(c, ex, ey, Math.PI / 2, 0.3, { side: S.ENEMY, t });
        S.trail(c, (u) => [fx + 220, A.lerp(-420, 420, A.ph(u, 285.9, 288.4)), 0], 285.9, t, P.enemyLight, 2, [6, 6]);
      });
    }
    // chọn phần trận đánh: mục tiêu nằm trong vùng giữa
    const e3A = A.sm(t, 288.6, 289.2);
    if (e3A > 0) A.withA(c, e3A, () => S.jetTop(c, fx + 640 - (t - 288.6) * 30, 120, Math.PI, 0.3, { side: S.ENEMY, t }));
    S.jetTop(c, fx, fy, 0, 0.32, { t, ab: 0.2 });
    K.end(c);
  }
}
