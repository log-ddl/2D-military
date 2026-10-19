import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { xMark, arrow } from './shared/ui';
import { smoke } from './shared/fx';

// Chương 2 (37.4–79.8): vì sao nhiều tầng + tầng dài. NGANG.
const GY = 900;
const CX = 300;                         // tâm các vòm
const RX = { long: 1550, mid: 900, short: 420 };
const RY = { long: 700, mid: 400, short: 190 };
const house = (c: CanvasRenderingContext2D, t: number) => {
  D.house(c, 110, GY, 1.2); D.house(c, 240, GY, 1.0);
};

function target(c: CanvasRenderingContext2D, t: number, pos: A.Pt, hit: number, dir: 1 | -1, draw: (x: number, y: number, a: number, rot: number) => void) {
  const f = A.ph(t, hit, hit + 1.5);
  if (f <= 0) { draw(pos[0], pos[1], 1, 0); return; }
  if (f >= 1) return;
  const x = pos[0] + dir * f * 160, y = pos[1] + f * f * 520;
  draw(x, y, 1 - f * f, f * 1.6 * dir);
  smoke(c, x, y, f * 1.5, 1.1, 5);
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const push = A.sm(t, 46.6, 49.0) - A.sm(t, 63.2, 65.0) + A.sm(t, 68.0, 69.4) - A.sm(t, 73.2, 74.4);
    const cam: K.Cam = { x: A.lerp(960, 1050, push), y: A.lerp(540, 560, push), z: A.lerp(1, 1.15, push) };
    K.begin(c, cam);
    D.skyFill(c, cam, GY);
    D.groundFill(c, cam, GY);
    house(c, t);

    // ── vòm ───────────────────────────────────────────────────────
    const focusLong = A.sm(t, 46.6, 48.0);
    const dimOther = 1 - 0.72 * focusLong + 0.72 * A.sm(t, 77.6, 79.6);
    const pIn = A.eo(t, 39.6, 41.4), pMid = A.eo(t, 41.4, 43.2), pOut = A.eo(t, 43.2, 45.0);
    // lớp ngoài
    if (t > 37.4) {
      const a1 = t < 39.6 ? 1 : 1;
      // một mình ở đầu chương: dùng vòm cỡ "mid" cho một tên lửa
      if (t < 39.6) {
        const sp = A.eo(t, 37.5, 38.2);
        D.dome(c, CX, GY, RY.mid, P.olive, 0.14, sp, 5, RX.mid);
      } else {
        const outA = 1;
        D.dome(c, CX, GY, RY.long, P.olive, 0.07, pOut, 5, RX.long);
        D.dome(c, CX, GY, RY.mid, P.olive, 0.10 * dimOther, pMid, 5, RX.mid);
        D.dome(c, CX, GY, RY.short, P.olive, 0.16 * dimOther, pIn, 5, RX.short);
      }
    }
    // thiết bị
    const bigX = 1060, medX = 730, gunX = 430;
    if (t < 39.6) {
      D.launcherSide(c, 560, GY, 1.5, { elev: 0.6 });
    } else {
      D.launcherSide(c, bigX, GY, 1.25, { big: true, elev: 0.5 });
      withA(c, 1, () => D.launcherSide(c, medX, GY, 1.1, { elev: 0.7, a: A.clamp01(pMid * 3) * (0.35 + 0.65 * dimOther) }));
      D.gunSide(c, gunX, GY, 1.0, { elev: 0.9, a: A.clamp01(pIn * 3) * (0.35 + 0.65 * dimOther) });
    }

    // ── 37.7–39.4: một tên lửa không giỏi mọi thứ: máy bay lướt qua, tên lửa chệch
    if (t < 39.6) {
      const tx = A.lerp(1900, 160, A.ph(t, 37.4, 39.6));
      D.jetSide(c, tx, 690, 1.1, { dir: -1 });
      const l0 = 38.0, l1 = 39.1;
      W.intercept(c, t, [560 + 150, GY - 230], [tx - 260, 560], l0, l1, { L: 100, boom: 0, bend: 160 });
      if (t > l1) { const q = A.ph(t, l1, l1 + 0.8); D.missile(c, A.lerp(tx - 260, tx - 420, q), A.lerp(560, 320, q), -2.2, 100, { a: 1 - q }); }
    }

    // ── 39.6–46: ba kẻ tấn công, mỗi tầng bắt một ──────────────────
    if (t >= 39.6 && t < 47) {
      const mk = (y0: number, t0: number, x0: number, x1: number) => (tt: number): A.Pt => [A.lerp(x0, x1, A.ph(tt, t0, t0 + 6.0)), y0];
      const A_ = mk(260, 40.2, 2100, 700), B_ = mk(640, 41.3, 2100, 700), C_ = mk(790, 42.4, 2100, 560);
      const kills: [typeof A_, number, number, A.Pt, number][] = [
        [A_, 43.4, 44.6, [bigX + 90, GY - 250], 80],
        [B_, 44.0, 45.5, [medX + 70, GY - 170], 72],
        [C_, 45.0, 46.3, [gunX + 100, GY - 150], 64],
      ];
      for (const [fn, l0, hit, from, L] of kills) {
        const pos = fn(hit);
        target(c, t, fn(t), hit, -1, (x, y, a, r) => withA(c, a, () => { c.save(); c.translate(x, y); c.rotate(r); D.jetSide(c, 0, 0, 0.95, { dir: -1 }); c.restore(); }));
        if (t > l0) W.intercept(c, t, from, pos, l0, hit, { L, boom: 70, bend: 80 });
      }
    }

    // ── 46.8–63.5: tầng dài: oanh tạc cơ + đạn đạo ───────────────────
    if (t >= 46.8 && t < 64) {
      // tia đo 100 km
      const rk = A.eo(t, 52.0, 53.6);
      if (rk > 0 && t < 58) withA(c, rk * (1 - A.sm(t, 57, 58)), () => {
        const ex = bigX + (CX + RX.long - bigX) * rk, ry = GY + 38;
        line(c, [[bigX, ry], [ex, ry]], P.ink, 6);
        line(c, [[ex, ry - 16], [ex, ry + 16]], P.ink, 6);
        line(c, [[bigX, ry - 16], [bigX, ry + 16]], P.ink, 6);
      });
      // oanh tạc cơ: bay vào 53–59.6, bị bắn trước khi thả bom
      const bomb = (tt: number): A.Pt => [A.lerp(2050, 1280, A.ph(tt, 50.0, 59.6)), 300];
      const hitB = 59.5;
      const open = A.sm(t, 57.4, 58.4) * (t < hitB ? 1 : 0);
      target(c, t, bomb(t), hitB, -1, (x, y, a, r) => withA(c, a, () => {
        c.save(); c.translate(x, y); c.rotate(r);
        D.bomberSide(c, 0, 0, 1.0, { dir: -1 });
        if (open > 0) { rrect(c, -34, 24, 70 * open, 12, 3, P.ink, P.ink, 2); rrect(c, -10, 30 + 8 * open, 18, 24, 5, P.dark, P.ink, 2.5); }
        c.restore();
      }));
      if (t > 54.4) W.intercept(c, t, [bigX + 140, GY - 240], bomb(hitB), 54.4, hitB, { L: 130, boom: 120, bend: 100 });
      // đạn đạo từ trên rơi xuống
      const bal = (tt: number): A.Pt => [A.lerp(1650, 1250, A.ph(tt, 60.6, 63.0)), A.lerp(-80, 520, A.ph(tt, 60.6, 63.0))];
      const hitD = 62.9;
      if (t > 60.4 && t < hitD) {
        const [x, y] = bal(t);
        const ang = Math.atan2(520 + 80, 1250 - 1650);
        D.missile(c, x, y, ang, 110, { flame: 0.3, side: 'atk', a: 1 });
        for (let i = 1; i < 9; i++) { const [qx, qy] = bal(t - i * 0.07); withA(c, 1 - i / 9, () => circle(c, qx, qy, 8 * (1 - i / 12), '#f3a79e', null, 0)); }
      }
      if (t > 61.6) W.intercept(c, t, [bigX + 140, GY - 240], bal(hitD), 61.5, hitD, { L: 130, boom: 110, bend: 160 });
    }

    // ── 63.7–68.2: lớn, đắt, chậm, không đủ ──────────────────────
    if (t >= 63.6 && t < 68.4) {
      // xe di chuyển chậm: vạch bánh và mũi tên dài
      const sl = A.ph(t, 64.4, 67.6);
      arrow(c, [bigX + 300, GY + 40], [bigX + 300 - 90 * A.sm(sl, 0, 1), GY + 40], { color: P.slate, w: 6 });
      // quá nhiều kẻ tới: năm máy bay xếp hàng ở bên phải
      for (let i = 0; i < 5; i++) {
        const a = A.eo(t, 66.4 + i * 0.1, 67.2 + i * 0.1);
        const xx = A.lerp(2100, 1000 + (i % 3) * 220, a), yy = 280 + i * 100;
        D.jetSide(c, xx, yy, 0.85, { dir: -1 });
      }
    }

    // ── 68.4–73.4: băng đạn có hạn + giá = một căn nhà ─────────────
    if (t >= 68.2 && t < 74.2) {
      const q = A.eo(t, 69.0, 70.0);
      // cái cân: trái = nhà, phải = tên lửa; nghiêng về phía tên lửa
      const bx = 1560, by = 520;
      withA(c, q * (1 - A.sm(t, 73.4, 74.2)), () => {
        line(c, [[bx, by + 130], [bx, by - 30]], P.ink, 8);
        const tilt = A.sm(t, 71.0, 72.2) * 0.22;
        c.save(); c.translate(bx, by - 30); c.rotate(tilt);
        line(c, [[-230, 0], [230, 0]], P.ink, 8);
        circle(c, 0, 0, 12, P.amber, P.ink, 3);
        c.save(); c.translate(-230, 0); c.rotate(-tilt);
        line(c, [[0, 0], [0, 40]], P.ink, 4);
        D.house(c, 0, 125, 1.3);
        c.restore();
        c.save(); c.translate(230, 0); c.rotate(-tilt);
        line(c, [[0, 0], [0, 40]], P.ink, 4);
        D.missile(c, 0, 100, -Math.PI / 2, 200, {});
        c.restore();
        c.restore();
      });
      // số ống còn đạn: đã vẽ bằng launcherSide big loaded
    }

    // ── 73.8–79.8: mục tiêu rẻ không đáng một quả ──────────────────
    if (t >= 73.8) {
      const dpos = (tt: number): A.Pt => [A.lerp(1980, -80, A.ph(tt, 73.8, 79.8)), 560];
      const [dx, dy] = dpos(t);
      D.droneSide(c, dx, dy, 1.4, { dir: -1 });
      // khoá rồi thả
      const lk = A.eo(t, 75.4, 76.4) * (1 - A.sm(t, 77.0, 77.6));
      if (lk > 0) {
        W.bracket(c, dx, dy, 56, P.sky, lk);
        const [sx, sy] = [bigX + 200, GY - 200];
        withA(c, lk, () => line(c, [[sx, sy], [dx, dy]], P.sky, 4, [12, 10]));
      }
      const xm = A.eo(t, 76.6, 77.4);
      if (xm > 0) xMark(c, bigX + 230, GY - 230, 36, xm, P.enemy, 9);
    }
    K.end(c);
    if (t > 52.8 && t < 57.5) { const [sx, sy] = K.toScreen(cam, (bigX + CX + RX.long) / 2, GY + 38); D.tag(c, '100+ km', sx, sy + 60, A.eo(t, 53.0, 53.8) * (1 - A.sm(t, 56.8, 57.4))); }
  }
}
