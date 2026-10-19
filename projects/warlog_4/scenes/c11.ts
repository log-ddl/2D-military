// Chương 11 (389.4 – 433.4): con tàu 5000 người, và chuỗi các con số nhỏ cẩn thận. NGANG mặt cắt → CẬN bộ chỉnh → toàn thân.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const SJ = 1.2, JY = S.JET_H * SJ;
// phòng ban: [x, y, loại]
const ROOMS: [number, number, string, number][] = [[-330, 62, 'bakery', 396.7], [-120, 62, 'hospital', 397.9], [100, 62, 'post', 399.1], [290, 62, 'news', 400.4]];

function dial(c: CanvasRenderingContext2D, x: number, y: number, r: number, v: number, col: string, a = 1) {
  c.save(); c.globalAlpha *= a;
  A.circle(c, x, y, r, '#ffffff', P.ink, A.px(c, 3.5));
  for (let i = 0; i <= 8; i++) {
    const an = Math.PI * (0.8 + 1.4 * i / 8);
    A.line(c, [[x + Math.cos(an) * r * 0.74, y + Math.sin(an) * r * 0.74], [x + Math.cos(an) * r * 0.9, y + Math.sin(an) * r * 0.9]], P.ink2, A.px(c, 2));
  }
  const an = Math.PI * (0.8 + 1.4 * v);
  A.line(c, [[x, y], [x + Math.cos(an) * r * 0.7, y + Math.sin(an) * r * 0.7]], col, A.px(c, 4.5));
  A.circle(c, x, y, r * 0.12, col, null, 0);
  c.restore();
}

function roomIcon(c: CanvasRenderingContext2D, k: string, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  A.rrect(c, -30, -24, 60, 48, 8, '#ffffff', P.ink, A.px(c, 3.5) / s);
  const w = 3 / s * 1.0;
  if (k === 'bakery') { c.beginPath(); c.ellipse(0, 2, 18, 10, 0, 0, Math.PI * 2); A.fs(c, P.sand, P.ink, w); A.line(c, [[-8, -3], [-3, 7]], P.ink, w); A.line(c, [[2, -4], [7, 7]], P.ink, w); }
  else if (k === 'hospital') { A.rrect(c, -4, -16, 8, 32, 2, P.enemy, null, 0); A.rrect(c, -16, -4, 32, 8, 2, P.enemy, null, 0); }
  else if (k === 'post') { A.rrect(c, -18, -11, 36, 22, 3, P.paper, P.ink, w); A.line(c, [[-18, -11], [0, 3], [18, -11]], P.ink, w); }
  else { A.rrect(c, -18, -10, 36, 24, 4, P.glass, P.ink, w); A.line(c, [[0, -10], [-8, -20]], P.ink, w); A.line(c, [[0, -10], [8, -20]], P.ink, w); }
  c.restore();
}

export default class C11 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam = K.track(t, [
      [389.4, { x: 15, y: 40, z: 1.7 }], [405.6, { x: 15, y: 40, z: 1.7 }],
      [407.6, { x: 330, y: 10, z: 2.3 }], [412.0, { x: 330, y: 10, z: 2.3 }],
      [413.6, { x: -150, y: 8, z: 2.2 }], [424.8, { x: -150, y: 8, z: 2.2 }],
      [427.6, { x: 15, y: 40, z: 1.5 }], [433.4, { x: 15, y: 40, z: 1.5 }],
    ], A.eio);
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 40 });
    S.carrierSide(c, t, { x: 0, y: 0, cut: A.sm(t, 389.4, 390.2), noIsland: true });
    this.crowd(c, t);
    // phòng ban
    for (const [x, y, k, t0] of ROOMS) {
      const p = A.back(t, t0 - 0.2, t0 + 0.4) * (1 - A.sm(t, 405.6, 406.4));
      if (p > 0.01) roomIcon(c, k, x, y, 1.0 * Math.min(1, p));
    }
    // chiếc máy bay "được gửi lên trời"
    const jp = A.sm(t, 401.2, 402.2) * (1 - A.sm(t, 406.0, 406.8));
    if (jp > 0) {
      for (let i = 0; i < 14; i++) {
        const u = ((t * 0.8 + i / 14) % 1);
        const sx = -380 + A.rnd(i + 5) * 700, sy = 30 + A.rnd(i + 9) * 100;
        const ex = 210, ey = -JY + 10;
        const e = A.sm(u, 0, 1);
        A.circle(c, A.lerp(sx, ex, e), A.lerp(sy, ey, e), 4, P.amber, null, 0);
      }
      S.jetSide(c, 210, -JY, SJ, { gear: 1, hero: true, ang: -0.45 * A.sm(t, 404.4, 405.8), a: jp });
    }
    // bộ chỉnh máy phóng và dây hãm
    const dp = A.sm(t, 408.4, 409.6);
    if (dp > 0 && t < 413.6) {
      const v = A.keys(t, [[408.4, 0.3], [411.2, 0.55], [413.0, 0.62]]);
      dial(c, 330, -62, 36, v, P.amber, dp);
      S.person(c, 380, -2, 40, P.sand, dp);
      S.jetSide(c, 250, -JY, SJ, { gear: 1, hero: true, a: dp });
      // dây điều áp xuống đường phóng
      A.line(c, [[330, -26], [330, 6]], P.ink2, A.px(c, 3), [6, 5]);
    }
    if (t >= 413.2 && t < 426.0) {
      const a = A.sm(t, 413.2, 413.9) * (1 - A.sm(t, 425.0, 426.0));
      const v = A.keys(t, [[413.4, 0.5], [414.6, 0.55], [418.0, 0.55], [418.6, 0.14], [420.8, 0.12], [421.6, 0.55], [421.9, 0.93], [424.2, 0.92]]);
      const col = v < 0.3 ? P.sky : v > 0.8 ? P.enemy : P.olive;
      dial(c, -190, -62, 40, v, col, a);
      S.person(c, -140, -2, 40, P.sand, a);
      A.line(c, [[-190, -22], [-190, 6]], P.ink2, A.px(c, 3), [6, 5]);
      S.WIRES_X.forEach((wx, i) => S.wireSide(c, wx, 0, i === 2 ? col : '#e2e8f0'));
    }
    // chuỗi các con số nhỏ chạy dọc tàu
    const np = A.sm(t, 426.4, 427.4);
    if (np > 0) {
      const xs = [-380, -250, -150, 20, 200, 330, 440];
      xs.forEach((x, i) => {
        const v = 0.5 + 0.3 * Math.sin(t * 2 + i * 1.3);
        const pulse = A.bump(t, 427.0 + i * 0.35, 0.8);
        dial(c, x, 20, 22 + 6 * pulse, v, pulse > 0.2 ? P.amber : P.ink2, np);
      });
    }
    // một chiếc máy bay nhỏ lên trời sau tất cả (cuối chương)
    const fl = t - 430.2;
    if (fl > 0) {
      const u = A.clamp01(fl / 1.4);
      const x = 200 + 270 * u * u + (fl > 1.4 ? 320 * (fl - 1.4) : 0);
      const y = -JY - (fl > 1.4 ? 60 * (fl - 1.4) + 15 * (fl - 1.4) * (fl - 1.4) : 0);
      S.jetSide(c, x, y, SJ, { gear: fl > 2.2 ? 0 : 1, flame: 0.9, hero: true, ang: fl > 1.4 ? -0.2 : 0 });
    }
    S.carrierIsland(c, t, { x: 0, y: 0 });
    K.end(c);
    this.inset(c, t);
    S.cutDip(c, t, 413.6, 0.12);
    chain(c, t);
  }

  // 5000 người: dấu chấm lấp đầy các tầng
  private crowd(c: CanvasRenderingContext2D, t: number) {
    const p = A.sm(t, 391.6, 397.2);
    const n = Math.floor(900 * p);
    const fade = 1 - A.sm(t, 406.4, 407.2);
    const amberShare = A.sm(t, 401.6, 403.4);
    c.save(); c.globalAlpha *= fade;
    for (let i = 0; i < n; i++) {
      const x = -430 + A.rnd(i * 3 + 1) * 790;
      const lvl = Math.floor(A.rnd(i * 7 + 4) * 4);
      const y = 22 + lvl * 28 + (A.rnd(i * 5 + 2) - 0.5) * 6;
      const amber = A.rnd(i * 11 + 3) < 0.6 * amberShare;
      A.circle(c, x, y, 3.3, amber ? P.amber : P.dark, null, 0);
    }
    c.restore();
  }

  // sơ đồ TRÊN: đặt dây quá mềm / quá cứng
  private inset(c: CanvasRenderingContext2D, t: number) {
    const a = A.win(t, 414.0, 425.4, 0.5, 0.6);
    if (a <= 0) return;
    c.save(); c.globalAlpha *= a;
    const X = 1360, Y = 120, W = 480, H = 300;
    A.rrect(c, X, Y, W, H, 20, '#e6f1f7', P.ink, 4);
    c.save(); c.beginPath(); c.roundRect(X, Y, W, H, 20); c.clip();
    // biển ở phía trên-phải của đường hạ cánh (mép sàn)
    c.fillStyle = '#9dd0ea'; c.beginPath(); c.moveTo(X + 360, Y); c.lineTo(X + W, Y); c.lineTo(X + W, Y + H); c.lineTo(X + 410, Y + H); c.closePath(); c.fill();
    c.translate(X + 30, Y + 220); c.rotate(-0.2);
    A.rrect(c, 0, -40, 380, 80, 4, P.dark, P.ink, 3);
    A.line(c, [[0, 0], [380, 0]], '#ffffff', 3, [14, 10]);
    // đầu sàn xiên tại x = 380 (mép)
    const wxs = [150, 190, 230, 270];
    const ph = t < 418.4 ? 0 : t < 421.7 ? 1 : 2;
    const tl = ph === 0 ? t - 414.2 : ph === 1 ? t - 418.4 : t - 421.7;
    const e = A.clamp01(tl / 2.6);
    let jx = -70 + 130 * A.clamp01(tl / 1.0);
    let broke = false;
    const wireCol = ph === 1 ? P.sky : ph === 2 ? P.enemy : P.olive;
    wxs.forEach((x, i) => {
      if (i !== 2) { A.line(c, [[x, -40], [x, 40]], '#e2e8f0', 4); return; }
      if (ph === 2 && tl > 1.0) {
        broke = true;
        A.line(c, [[x, -40], [x + 24, -22]], wireCol, 5); A.line(c, [[x, 40], [x + 20, 26]], wireCol, 5);
      } else {
        const hx = ph === 1 ? x + (jx - x + 60) * 0 : 0; void hx;
        A.line(c, [[x, -40], [Math.max(x, jx - 60), 0], [x, 40]], wireCol, 5);
      }
    });
    // chuyển động
    if (ph === 0) jx = A.lerp(60, 250, A.sm(tl, 0.6, 2.4)); // ăn dây, dừng đúng chỗ
    if (ph === 1) jx = A.lerp(60, 520, A.sm(tl, 0.6, 3.0)); // quá mềm: trôi ra khỏi mép
    if (ph === 2) jx = A.lerp(60, 330, A.sm(tl, 0.4, 1.2)) + (tl > 1.0 ? 0 : 0); // quá cứng: dây đứt
    if (ph === 2 && tl > 1.2) jx = 330 - 40 * A.sm(tl, 1.2, 1.7);
    S.jetTop(c, jx, 0, 1.0, { hero: true, a: ph === 1 ? 1 - A.sm(tl, 2.4, 3.0) : 1 });
    c.restore();
    // nước bắn khi rơi
    if (ph === 1 && tl > 2.2) {
      c.save(); c.translate(X + 30 + 380 * Math.cos(-0.2) + 40, Y + 220 - 380 * Math.sin(0.2) - 20);
      F.shock(c, 0, 0, 70 * A.clamp01((tl - 2.2) / 0.8), A.clamp01((tl - 2.2) / 0.8), 4, P.sky);
      c.restore();
    }
    void broke; void e;
    c.restore();
  }
}
