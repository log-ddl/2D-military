import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C4: một radar bật, cả đội cùng bức tranh; buồng lái cũ vs hợp nhất dữ liệu. 168.4–202.2 */
const YS = [-9000, -3000, 3000, 9000];
const LEAD = 1;
const FX = (t: number) => -16000 + 170 * (t - 168.4);
const EN: [number, number][] = [[17000, -6000], [20000, 5000]];

export default class Sc09 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 178.5) this.formation(c, t);
    else this.screens(c, t);
  }

  formation(c: C2, t: number) {
    const cam = K.track(t, [[168.4, { x: -3500, y: 0, z: 0.036 }], [178.5, { x: -2500, y: 0, z: 0.04 }]]);
    S.mapBg(c, cam, 1000);
    K.begin(c, cam);
    const ic = 0.2 / cam.z;
    const x = FX(t);
    const lx = x, ly = YS[LEAD]!;
    // radar của chiếc dẫn đầu
    const dir = 0.25 * Math.sin((t - 168) * 1.5);
    S.cone(c, lx, ly, dir, 0.5, 40000, P.sky, 0.13 * A.sm(t, 169.8, 170.6));
    // liên kết dữ liệu
    const link = A.sm(t, 172.4, 173.0);
    YS.forEach((y, i) => {
      if (i === LEAD) return;
      A.withA(c, link, () => {
        A.line(c, [[lx, ly], [x, y]], P.sky, S.L(c, 3), [10, 10]);
        for (let k = 0; k < 3; k++) {
          const p = ((t - 172.4) * 0.9 + k / 3) % 1;
          A.circle(c, A.lerp(lx, x, p), A.lerp(ly, y, p), 220, P.sky, null);
        }
      });
    });
    // địch
    const seen = A.sm(t, 171.0, 171.6);
    EN.forEach(([ex, ey]) => {
      A.withA(c, 0.35 + 0.65 * seen, () => S.jetTop(c, ex - 120 * (t - 168.4), ey, Math.PI, ic, { side: S.ENEMY }));
    });
    // bức tranh chung trên từng chiếc
    YS.forEach((y, i) => {
      const p = A.back(t, 173.0 + i * 0.18, 173.4 + i * 0.18);
      if (p <= 0) return;
      const w = 4200 * p, h = 2500 * p, cx = x - 4200, cy = y;
      A.rrect(c, cx - w / 2, cy - h / 2, w, h, 300, P.dark, P.ink, S.L(c, 2.5));
      EN.forEach(([ex, ey]) => {
        const sx = cx + ((ex - x) / 40000) * w * 0.8 - w * 0.2, sy = cy + (ey / 14000) * h * 0.4;
        A.circle(c, sx, sy, 300 * p, P.enemy, null);
      });
      A.circle(c, cx - w * 0.35, cy, 260 * p, P.oliveLight, null);
    });
    YS.forEach((y) => S.jetTop(c, x, y, 0, ic, { t }));
    K.end(c);
  }

  screens(c: C2, t: number) {
    A.clear(c, '#dfe5ea');
    K.begin(c, { x: 0, y: 0, z: 1 });
    // bảng táp-lô
    A.rrect(c, -900, 300, 1800, 400, 30, P.dark, P.ink, S.L(c, 4));
    if (t < 184.6) {
      // màn hình radar cũ: chỉ chấm sáng
      this.scope(c, 0, 0, 300, t);
      K.end(c);
      return;
    }
    const merge = A.eio(t, 187.4, 188.8);
    const bigA = A.sm(t, 188.2, 188.9);
    const subs: { x: number; y: number; at: number; kind: number }[] = [
      { x: -560, y: -170, at: 184.5, kind: 0 }, { x: -190, y: 170, at: 185.3, kind: 1 },
      { x: 190, y: -170, at: 186.1, kind: 2 }, { x: 560, y: 170, at: 186.9, kind: 3 },
    ];
    subs.forEach((s) => {
      const p = 1.3 * A.back(t, s.at, s.at + 0.35);
      if (p <= 0 || merge >= 1) return;
      const x = A.lerp(s.x, 0, merge), y = A.lerp(s.y, -60, merge), sc = p * (1 - 0.7 * merge);
      A.withA(c, 1 - merge * 0.9, () => this.mini(c, x, y, sc, s.kind, t));
    });
    if (bigA > 0) A.withA(c, bigA, () => this.fused(c, t));
    K.end(c);
  }

  scope(c: C2, x: number, y: number, r: number, t: number) {
    A.circle(c, x, y, r + 30, P.ink, null);
    A.circle(c, x, y, r, '#0f2a1f', P.ink2, S.L(c, 3));
    for (const k of [0.33, 0.66]) S.ring(c, x, y, r * k, '#2f6b4f', 2);
    const a = t * 2.2;
    S.cone(c, x, y, a - 0.25, 0.25, r, '#3fae74', 0.35);
    A.line(c, [[x, y], [x + Math.cos(a) * r, y + Math.sin(a) * r]], '#7ee0a8', S.L(c, 3));
    for (const [bx, by] of [[0.4, -0.3], [0.55, 0.2], [-0.3, -0.5]] as [number, number][]) {
      const ang = Math.atan2(by, bx);
      const since = ((a - ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      A.circle(c, x + bx * r, y + by * r, 9, '#7ee0a8', null);
      A.withA(c, Math.max(0, 1 - since / 3), () => A.circle(c, x + bx * r, y + by * r, 16, '#bff5d5', null));
    }
  }

  mini(c: C2, x: number, y: number, s: number, kind: number, t: number) {
    c.save(); c.translate(x, y); c.scale(s, s);
    A.rrect(c, -160, -120, 320, 240, 16, '#13212f', P.ink, S.L(c, 4));
    if (kind === 0) { // radar
      for (let i = 0; i < 5; i++) A.circle(c, -100 + A.rnd(i) * 200, -80 + A.rnd(i + 9) * 160, 7, P.sky, null);
      A.line(c, [[0, 100], [Math.cos(-1.2 + Math.sin(t) * 0.6) * 180, 100 + Math.sin(-1.2 + Math.sin(t) * 0.6) * 180]], P.sky, S.L(c, 2));
    } else if (kind === 1) { // hồng ngoại
      A.circle(c, 20, -10, 50, '#7c2d12', null); A.circle(c, 20, -10, 26, P.amber, null); A.circle(c, 20, -10, 10, '#fde68a', null);
    } else if (kind === 2) { // vô tuyến
      const pts: [number, number][] = [];
      for (let i = 0; i <= 40; i++) pts.push([-140 + i * 7, Math.sin(i * 0.9 + t * 6) * 40 * Math.sin(i * 0.2)]);
      A.line(c, pts, '#7ee0a8', S.L(c, 3));
    } else { // cảnh báo radar
      S.ring(c, 0, 0, 90, P.light, 2);
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; A.line(c, [[0, 0], [Math.cos(a) * 85, Math.sin(a) * 85]], P.enemy, S.L(c, 4)); }
    }
    c.restore();
  }

  fused(c: C2, t: number) {
    const W = 1100, H = 660, x0 = -W / 2, y0 = -60 - H / 2;
    A.rrect(c, x0 - 20, y0 - 20, W + 40, H + 40, 24, P.ink, null);
    A.rrect(c, x0, y0, W, H, 14, '#13212f', P.ink2, S.L(c, 3));
    // lưới bản đồ
    for (let i = 1; i < 6; i++) A.line(c, [[x0 + i * W / 6, y0], [x0 + i * W / 6, y0 + H]], '#20344a', S.L(c, 1.5));
    for (let i = 1; i < 4; i++) A.line(c, [[x0, y0 + i * H / 4], [x0 + W, y0 + i * H / 4]], '#20344a', S.L(c, 1.5));
    // lũ dữ liệu → lọc
    const flood = A.sm(t, 198.6, 199.2) * (1 - A.sm(t, 200.0, 201.2));
    if (flood > 0) A.withA(c, flood, () => {
      for (let i = 0; i < 140; i++) A.circle(c, x0 + 30 + A.rnd(i * 1.7) * (W - 60), y0 + 30 + A.rnd(i * 5.3) * (H - 60), 6, '#64748b', null);
    });
    // ta
    const fx = x0 + W / 2, fy = y0 + H - 90;
    A.poly(c, [[fx, fy - 26], [fx + 20, fy + 18], [fx - 20, fy + 18]], P.oliveLight, P.ink, S.L(c, 2));
    // mục tiêu được gắn nhãn & theo dõi
    const tags = A.sm(t, 189.4, 190.4), tracks = A.sm(t, 190.6, 191.4);
    const tg: [number, number][] = [[-260, -180], [80, -230], [330, -90]];
    tg.forEach(([dx, dy], i) => {
      const x = fx + dx, y = y0 + H / 2 + dy + 40 + Math.sin(t * 0.5 + i) * 6;
      A.withA(c, tracks, () => A.line(c, [[x, y], [x - 30, y + 70]], P.enemyLight, S.L(c, 2), [6, 6]));
      A.poly(c, [[x, y + 22], [x + 20, y - 14], [x - 20, y - 14]], P.enemy, P.ink, S.L(c, 2));
      A.withA(c, tags, () => {
        A.line(c, [[x + 14, y - 14], [x + 44, y - 44]], P.enemyLight, S.L(c, 2));
        A.rrect(c, x + 44, y - 64, 70, 30, 6, null, P.enemyLight, S.L(c, 2));
        A.line(c, [[x + 54, y - 49], [x + 102, y - 49]], P.enemyLight, S.L(c, 3));
      });
    });
  }
}
