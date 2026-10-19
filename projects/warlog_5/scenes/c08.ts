// Chương 8 (308.1 – 340.3): chính xác từng nhờ số lượng; đạn dẫn GPS đổi điều đó, giá cao, bị nhiễu; giữ cả hai.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as M from './shared/map';
import { P } from './shared/palette';
import * as X from './_art';

export const T8 = { barrage0: 310.2, guidedBoom: 324.6 };
const N = 60;
const imp = (i: number): A.Pt => {
  const a = A.rnd(i + 5) * Math.PI * 2, r = 60 + 380 * Math.sqrt(A.rnd(i * 3 + 1));
  return [960 + Math.cos(a) * r * 1.4, 520 + Math.sin(a) * r * 0.8];
};
export const BARRAGE_BOOMS = Array.from({ length: N }, (_, i) => T8.barrage0 + i * 0.065).filter((_, i) => i % 4 === 0);

export default class S08 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 317.65) this.volume(c, t);
    else if (t < 323.3) this.guided(c, t);
    else if (t < 329.2) this.bulls(c, t);
    else if (t < 335.0) this.price(c, t);
    else this.both(c, t);
    for (const at of [317.65, 323.3, 329.2, 335.0]) X.dip(c, t, at, 0.1);
  }

  // 308.1–317.65: rải thật nhiều để vài phát gần
  private volume(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    M.mapBg(c, cam, { color: '#ece6cf', grid: 120 });
    M.forest(c, 380, 240, 110, 3); M.forest(c, 1550, 800, 120, 8); M.forest(c, 1600, 220, 90, 5);
    // mục tiêu nhỏ giữa khung
    const ta = A.back(t, 308.3, 308.9);
    X.top(c, 'towed', 960, 520, Math.PI, 1.0 * Math.min(1, ta), 'foe');
    M.unit(c, 960, 520, 'art', 'foe', 70, { a: 0 });
    // trải đạn
    for (let i = 0; i < N; i++) {
      const tf = T8.barrage0 + i * 0.065;
      if (t < tf) continue;
      const [x, y] = imp(i);
      F.explosion(c, x, y, 46, A.ph(t, tf, tf + 0.45), 3);
      A.withA(c, A.sm(t, tf + 0.3, tf + 0.7), () => { A.circle(c, x, y, 22, '#8a7f60', P.ink, 3); A.circle(c, x, y, 9, '#4a4430', null, 0); });
    }
    K.end(c);
    // chồng đạn tiêu thụ — chiều thế kỷ 20
    const st = A.sm(t, 314.2, 317.0);
    if (st > 0) {
      const rows = Math.round(10 * st);
      for (let r = 0; r < rows; r++) for (let k = 0; k < 8; k++) X.shell(c, 150 + k * 52, 990 - r * 22, -Math.PI / 2, 0.45);
    }
    X.bigNum(c, '20th', 1560, 120, A.win(t, 314.7, 317.5, 0.2, 0.4), 120);
  }

  // 317.65–323.3: đạn dẫn: GPS ở mũi, cánh lái nhỏ
  private guided(c: CanvasRenderingContext2D, t: number) {
    const sat = A.back(t, 318.9, 319.5);
    // vệ tinh
    if (sat > 0) {
      c.save(); c.translate(1480, 190); c.scale(Math.min(1, sat), Math.min(1, sat));
      A.rrect(c, -34, -22, 68, 44, 8, P.light, P.ink, 4);
      A.rrect(c, -150, -16, 100, 32, 4, P.sky, P.ink, 4); A.rrect(c, 50, -16, 100, 32, 4, P.sky, P.ink, 4);
      c.restore();
    }
    // quả đạn cắt lớp, lớn
    c.save(); c.translate(900, 600); c.scale(3.6, 3.6);
    A.rrect(c, -130, -34, 190, 68, 10, P.oliveLight, P.ink, 3);
    A.poly(c, [[60, -34], [140, 0], [60, 34]], P.sky, P.ink, 3);
    A.rrect(c, -110, -22, 90, 44, 6, '#f59e0b', P.ink, 2);       // thuốc nổ
    A.rrect(c, 66, -9, 34, 18, 3, P.dark, P.ink, 2);             // máy thu GPS
    const fin = 0.45 * Math.sin((t - 321.4) * 3.0) * A.sm(t, 321.4, 322.0);
    c.save(); c.translate(52, -34); c.rotate(-0.6 + fin); A.rrect(c, -4, -30, 10, 30, 2, P.dark, P.ink, 2); c.restore();
    c.save(); c.translate(52, 34); c.rotate(0.6 - fin); A.rrect(c, -4, 0, 10, 30, 2, P.dark, P.ink, 2); c.restore();
    c.restore();
    // tín hiệu vệ tinh → mũi
    const sg = A.ph(t, 319.5, 320.4);
    if (sg > 0) {
      const a: A.Pt = [1450, 230], b: A.Pt = [1230, 560];
      A.line(c, [a, [A.lerp(a[0], b[0], sg), A.lerp(a[1], b[1], sg)]], P.sky, 6, [16, 12]);
      for (let i = 0; i < 3; i++) U.ring(c, b[0], b[1], 60 + i * 30, ((t * 1.2 + i * 0.3) % 1), P.sky, 4);
    }
    // mũi tên bẻ cánh lái
    const ar = A.sm(t, 321.5, 322.0);
    U.arrow(c, [1180, 420], [1180, 340], { p: ar, color: P.ink, w: 9, head: 30 });
  }

  // 323.3–329.2: rơi cách điểm chỉ vài mét; một thay cho hàng chục
  private bulls(c: CanvasRenderingContext2D, t: number) {
    const cx = 960, cy = 540;
    for (let i = 4; i >= 1; i--) A.circle(c, cx, cy, i * 90, i % 2 ? '#fff' : '#f1e9d0', P.ink, 3);
    A.circle(c, cx, cy, 10, P.enemy, null, 0);
    // phát dẫn: ngay giữa
    const gp = A.ph(t, 323.5, T8.guidedBoom);
    if (gp > 0 && gp < 1) { const y = A.lerp(-60, cy - 6, A.ei(t, 323.5, T8.guidedBoom)); X.shell(c, cx + 12, y, Math.PI / 2, 1.3, 'guided'); }
    if (t >= T8.guidedBoom) {
      F.explosion(c, cx + 12, cy - 6, 80, A.ph(t, T8.guidedBoom, T8.guidedBoom + 0.7), 4);
      A.circle(c, cx + 12, cy - 6, 14, P.dark, P.ink, 3);
    }
    // hàng chục phát thường: tản xa
    for (let i = 0; i < 36; i++) {
      const a = A.sm(t, 326.0 + i * 0.05, 326.3 + i * 0.05);
      if (a <= 0) continue;
      const an = A.rnd(i + 31) * Math.PI * 2, r = 60 + 280 * Math.sqrt(A.rnd(i * 5 + 2));
      A.withA(c, a * (1 - A.sm(t, 328.2, 328.9)), () => A.circle(c, cx + Math.cos(an) * r * 1.35, cy + Math.sin(an) * r * 0.8, 15, P.amber, P.ink, 3));
    }
  }

  // 329.2–335.0: đắt gấp nhiều lần; nhiễu làm mù
  private price(c: CanvasRenderingContext2D, t: number) {
    if (t < 333.4) {
      X.shell(c, 560, 300, -Math.PI / 2, 1.5);
      X.shell(c, 1360, 300, -Math.PI / 2, 1.5, 'guided');
      const a = A.sm(t, 329.8, 330.5), n = Math.round(9 * A.sm(t, 330.2, 332.8));
      if (a > 0) X.coin(c, 560, 800, 1.2);
      for (let i = 0; i < n; i++) X.coin(c, 1260 + (i % 3) * 90, 820 - Math.floor(i / 3) * 70, 1.0);
    } else {
      // nhiễu: tháp phát, tín hiệu bị cắt, đạn lạc hướng
      const jx = 480, jy = 760;
      A.rrect(c, jx - 40, jy - 40, 80, 80, 8, P.dark, P.ink, 4);
      A.line(c, [[jx, jy - 40], [jx, jy - 200]], P.dark, 8);
      for (let i = 0; i < 3; i++) U.ring(c, jx, jy - 200, 70 + i * 40, ((t * 1.4 + i * 0.3) % 1), P.enemy, 5);
      const p = A.ph(t, 333.4, 335.0);
      const x = A.lerp(300, 1500, p), y = 300 + 80 * Math.sin(p * 7) * p + 240 * p * p;
      // đường đi đúng (nét đứt) và đường lạc
      A.line(c, [[300, 300], [1500, 300]], 'rgba(30,41,59,0.35)', 5, [14, 10]);
      X.shell(c, x, y, Math.atan2(240 * 2 * p + 40, 1200 / 1.6), 1.2, 'guided');
      this.satX(c, 1480, 190, A.sm(t, 333.5, 334.1));
    }
  }

  private satX(c: CanvasRenderingContext2D, x: number, y: number, k: number) {
    A.rrect(c, x - 34, y - 22, 68, 44, 8, P.light, P.ink, 4);
    A.rrect(c, x - 150, y - 16, 100, 32, 4, P.sky, P.ink, 4); A.rrect(c, x + 50, y - 16, 100, 32, 4, P.sky, P.ink, 4);
    U.xMark(c, x - 200, y + 120, 54, k, P.enemy, 12);
  }

  // 335.0–340.3: giữ cả hai: rẻ cho số lượng, đắt cho mục tiêu quan trọng
  private both(c: CanvasRenderingContext2D, t: number) {
    A.rrect(c, 120, 520, 680, 420, 20, 'rgba(255,255,255,0.7)', P.ink, 5);
    for (let r = 0; r < 6; r++) for (let k = 0; k < 10; k++) X.shell(c, 190 + k * 60, 590 + r * 52, -Math.PI / 2, 0.6);
    A.rrect(c, 1160, 700, 380, 240, 20, 'rgba(255,255,255,0.7)', P.ink, 5);
    for (let k = 0; k < 4; k++) X.shell(c, 1230 + k * 90, 820, -Math.PI / 2, 0.9, 'guided');
    // đích: diện rộng vs điểm quan trọng
    const a1 = A.sm(t, 336.0, 336.8), a2 = A.sm(t, 338.0, 338.8);
    A.withA(c, a1, () => { A.circle(c, 460, 280, 200, 'rgba(180,73,60,0.12)', P.enemy, 4); for (let i = 0; i < 14; i++) { const an = A.rnd(i + 2) * 6.28, r = 150 * Math.sqrt(A.rnd(i + 8)); A.circle(c, 460 + Math.cos(an) * r, 280 + Math.sin(an) * r, 12, P.amber, P.ink, 3); } });
    U.arrow(c, [460, 500], [460, 420], { p: a1, color: P.ink, w: 9, head: 30 });
    A.withA(c, a2, () => { X.top(c, 'radar', 1350, 400, 0, 1.8, 'foe'); U.crosshair(c, 1350, 400, 90, P.enemy, 1, t * 0.5); });
    U.arrow(c, [1350, 680], [1350, 520], { p: a2, color: P.ink, w: 9, head: 30 });
    void K; void M;
  }
}
