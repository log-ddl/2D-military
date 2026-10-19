// Chương 1 (0 – 50.9): khẩu pháo và người nó giết không bao giờ chung một khung. Câu hỏi + cán cân đánh đổi.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as X from './_art';

export const FIRE1 = 3.7, LAND1 = 17.25, FIRE2 = 22.4, LAND2 = 25.1;
const TX = 2000;              // mục tiêu
const EL = 1.0;               // góc nòng
const GUN: A.Pt = [0, 0];

function gunMuzzle(c: CanvasRenderingContext2D, o: { x: number; elev: number; recoil?: number; draw?: boolean }) {
  // chỉ để lấy điểm miệng nòng (vẽ thật ở chỗ khác)
  const s = 1, len = 340, rc = (o.recoil ?? 0) * 34, tip = len - rc + 32;
  return { x: o.x + 62 + Math.cos(o.elev) * tip * s, y: -140 - Math.sin(o.elev) * tip * s };
}
const M0 = gunMuzzle(null as never, { x: 0, elev: EL });
const H = (Math.tan(EL) * (TX - M0.x) + (-30 - M0.y)) / 4;      // đỉnh cung để tiếp tuyến đầu = nòng
const ARC_A: A.Pt = [M0.x, M0.y], ARC_B: A.Pt = [TX, -30];

const camA: [number, K.Cam][] = [
  [0, { x: -40, y: -210, z: 1.25 }], [3.5, { x: -40, y: -210, z: 1.25 }],
  [4.6, { x: 120, y: -300, z: 0.95 }], [6.6, { x: 450, y: -420, z: 0.8 }],
  [9.4, { x: 1000, y: -380, z: 0.7 }], [20.4, { x: 1000, y: -380, z: 0.7 }],
];
const camWide: K.Cam = { x: 1000, y: -380, z: 0.7 };

export default class S01 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 20.45) this.shot(c, t);
    else if (t < 26.2) this.cards(c, t);
    else if (t < 36.08) this.question(c, t);
    else if (t < 41.5) this.lineup(c, t);
    else this.trades(c, t);
    X.dip(c, t, 20.46); X.dip(c, t, 26.2); X.dip(c, t, 36.08); X.dip(c, t, 41.52);
  }

  // 0–20.4: một phát bắn, theo đạn cả cung
  private shot(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(t, camA, A.eio);
    const cs = K.withShake(cam, t, [[FIRE1, 10, 0.5], [LAND1, 6, 0.6]]);
    K.begin(c, cs);
    X.sideGround(c, cs);
    X.ridge(c, 1000, 800, 250);
    X.trench(c, TX, 1, 3);
    // tầm nhìn bị đồi chặn
    const sight = A.win(t, 11.0, 14.6, 0.4, 0.6);
    if (sight > 0) A.withA(c, sight, () => {
      A.line(c, [[330, -120], [TX - 140, -70]], P.sky, A.px(c, 4), [30, 20]);
      U.xMark(c, 1000, -96, 34, A.sm(t, 12.4, 13.0), P.enemy, A.px(c, 8));
    });
    // pháo: nạp rồi bắn rồi rời đi
    const away = A.ei(t, 17.7, 20.3);
    const gx = -820 * away * away;
    const elev = A.lerp(EL, 0.05, A.eio(t, 17.4, 18.4));
    const rc = A.bump(t, FIRE1, 0.9) * 0.9;
    const m = X.spGun(c, { x: gx, elev, recoil: rc, track: gx * 0.25 });
    // người nạp đạn
    if (t < 3.3) {
      const wk = A.ph(t, 0, 1.5);
      const sx = A.lerp(-540, -330, A.eo(t, 0, 1.5));
      X.soldier(c, sx, 0, 1, 1, 'ally', 0, wk < 1 ? t * 7 : undefined);
      const pc = A.eio(t, 1.5, 3.0);
      const bx = A.lerp(sx + 30, 62 - 120, pc), by = A.lerp(-70, -140 + Math.sin(EL) * 120 - 20, pc);
      const sa = A.lerp(0, -EL, pc);
      X.shell(c, bx, by, sa, 0.9);
    }
    // chớp nòng, khói, bụi
    if (t >= FIRE1) {
      F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, FIRE1, FIRE1 + 0.3), 1.6);
      F.smoke(c, m.x, m.y, t - FIRE1, 1.4, 6, '#6b7280', 40);
      F.dust(c, 120, 0, A.ph(t, FIRE1, FIRE1 + 0.9), 1.6);
    }
    // quả đạn
    const p = A.ph(t, FIRE1 + 0.05, LAND1);
    X.flight(c, ARC_A, ARC_B, H, p, { s: 0.95 / Math.max(0.6, cs.z) * 0.6 });
    if (t >= LAND1) {
      F.explosion(c, TX, -30, 150, A.ph(t, LAND1, LAND1 + 0.7), 4);
      F.debris(c, TX, -30, t - LAND1, 1.2, 14, 3, 0);
      F.smoke(c, TX, -10, t - LAND1, 1.6, 7, '#4b5563', 30);
    }
    if (t >= 17.7 && t < 20.4) F.dust(c, gx + 160, 0, A.ph(t, 17.7, 18.8), 1.3);
    K.end(c);
    // số: tốc độ, độ cao, đồng hồ
    X.bigNum(c, '800 m/s', 960, 150, A.win(t, 5.8, 7.5, 0.25, 0.4), 104);
    const hh = A.win(t, 7.6, 9.8, 0.3, 0.5);
    if (hh > 0) {
      const apex = K.toScreen(cs, 1000, -H - 240), foot = K.toScreen(cs, 1000, 0);
      A.withA(c, hh, () => {
        U.arrow(c, [foot[0], foot[1] - 4], [foot[0], apex[1] + 30], { p: A.eo(t, 7.6, 8.8), color: P.sky, w: 8, head: 34 });
      });
    }
    this.clock(c, t, 1740, 190);
    // mắt gạch chéo ở chỗ pháo: pháo không nhìn thấy
    const ee = A.win(t, 11.2, 14.6, 0.35, 0.5);
    if (ee > 0) A.withA(c, ee, () => this.eye(c, 420, 270, 70, A.sm(t, 12.2, 12.8)));
  }

  private clock(c: CanvasRenderingContext2D, t: number, x: number, y: number) {
    const a = A.win(t, 9.6, 17.6, 0.3, 0.5);
    if (a <= 0) return;
    A.withA(c, a, () => {
      A.circle(c, x, y, 82, '#ffffff', P.ink, 6);
      const p = A.ph(t, 9.7, LAND1) * 0.83;
      c.beginPath(); c.moveTo(x, y); c.arc(x, y, 70, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.closePath();
      c.fillStyle = P.amber; c.fill();
      for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; A.line(c, [[x + Math.cos(an) * 66, y + Math.sin(an) * 66], [x + Math.cos(an) * 80, y + Math.sin(an) * 80]], P.ink, 4); }
      const an = -Math.PI / 2 + p * Math.PI * 2;
      A.line(c, [[x, y], [x + Math.cos(an) * 64, y + Math.sin(an) * 64]], P.ink, 6);
    });
  }

  private eye(c: CanvasRenderingContext2D, x: number, y: number, r: number, slash: number) {
    c.save(); c.translate(x, y);
    c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(0, -r * 0.9, r, 0); c.quadraticCurveTo(0, r * 0.9, -r, 0); c.closePath();
    A.fs(c, '#ffffff', P.ink, 6);
    A.circle(c, 0, 0, r * 0.32, P.sky, P.ink, 4);
    if (slash > 0) A.line(c, [[-r * 0.9, r * 0.9], [-r * 0.9 + 1.8 * r * slash, r * 0.9 - 1.8 * r * slash]], P.enemy, 10);
    c.restore();
  }

  // 20.46–26.2: hai khung hình cách nhau
  private cards(c: CanvasRenderingContext2D, t: number) {
    const lt = t - 20.46;
    const e = A.back(t, 20.46, 21.1, 1.2);
    const L = { x: 90 - (1 - e) * 900, y: 190, w: 700, h: 700 }, R = { x: 1130 + (1 - e) * 900, y: 190, w: 700, h: 700 };
    const card = (r: typeof L, cam: K.Cam, fn: (cam: K.Cam) => void) => {
      c.save();
      c.beginPath(); c.roundRect(r.x, r.y, r.w, r.h, 30); c.clip();
      c.fillStyle = '#fbfdff'; c.fillRect(r.x, r.y, r.w, r.h);
      const k = { ...cam, sx: r.x + r.w / 2, sy: r.y + r.h / 2 };
      K.begin(c, k); X.sideGround(c, k); fn(k); K.end(c);
      c.restore();
      c.beginPath(); c.roundRect(r.x, r.y, r.w, r.h, 30); c.strokeStyle = P.ink; c.lineWidth = 8; c.stroke();
    };
    card(L, { x: 190, y: -230, z: 0.88 }, () => {
      const rc = A.bump(t, FIRE2, 0.9) * 0.9;
      const m = X.spGun(c, { x: 0, elev: EL, recoil: rc });
      X.soldier(c, -150, 0, 1, 1, 'ally');
      if (t >= FIRE2) {
        F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, FIRE2, FIRE2 + 0.3), 1.5);
        F.smoke(c, m.x, m.y, t - FIRE2, 1.3, 6, '#6b7280', 30);
      }
    });
    card(R, { x: TX, y: -120, z: 1.25 }, () => {
      X.trench(c, TX, 1.3, 3);
      if (t >= LAND2) {
        F.explosion(c, TX, -30, 150, A.ph(t, LAND2, LAND2 + 0.7), 4);
        F.smoke(c, TX, -10, t - LAND2, 1.6, 7, '#4b5563', 30);
      }
    });
    // đạn bay qua khoảng trống giữa hai khung, không thuộc khung nào
    const p = A.ph(t, FIRE2 + 0.1, LAND2);
    const a: A.Pt = [L.x + L.w - 90, L.y + 90], b: A.Pt = [R.x + 90, R.y + 90];
    A.withA(c, A.sm(t, 20.9, 21.4), () => A.line(c, [[L.x + L.w + 10, 540], [R.x - 10, 540]], "#94a3b8", 5, [18, 16]));
    X.flight(c, a, b, 190, p, { s: 0.7 });
  }

  // 26.2–36.08: câu hỏi — nhìn không thấy, 20–30 km, chỉ là một cục thép bay theo cung
  private question(c: CanvasRenderingContext2D, t: number) {
    const cam = camWide;
    K.begin(c, cam);
    X.sideGround(c, cam);
    X.ridge(c, 1000, 800, 250);
    X.trench(c, TX, 1, 3);
    X.spGun(c, { x: 0, elev: EL });
    X.soldier(c, -150, 0, 1, 1, 'ally');
    // thước khoảng cách dưới đất
    const rp = A.sm(t, 30.4, 31.3);
    if (rp > 0) {
      const y = 110, x1 = A.lerp(0, TX, rp);
      A.line(c, [[0, y], [x1, y]], P.ink, A.px(c, 6));
      A.line(c, [[0, y - 22], [0, y + 22]], P.ink, A.px(c, 6));
      A.line(c, [[x1, y - 22], [x1, y + 22]], P.ink, A.px(c, 6));
    }
    const fp = A.ph(t, 33.55, 35.9);
    if (fp > 0) X.flight(c, ARC_A, ARC_B, H, fp, { s: 1.4, w: A.px(c, 6) });
    K.end(c);
    const sh = A.win(t, 27.6, 30.4, 0.4, 0.5);
    if (sh > 0) A.withA(c, sh, () => {
      const s0 = K.toScreen(cam, 330, -120), s1 = K.toScreen(cam, TX - 140, -70), sx = K.toScreen(cam, 1000, -96);
      A.line(c, [s0, s1], P.sky, 5, [28, 18]);
      U.xMark(c, sx[0], sx[1], 22, A.sm(t, 28.2, 28.7), P.enemy, 8);
      this.eye(c, 290, 330, 56, A.sm(t, 27.8, 28.4));
    });
    // "20" "30"
    const s0 = K.toScreen(cam, 0, 110), s1 = K.toScreen(cam, TX, 110);
    X.bigNum(c, '20', A.lerp(s0[0], s1[0], 0.62), s0[1] + 80, A.win(t, 31.35, 33.4, 0.1, 0.4), 96);
    X.bigNum(c, '30', A.lerp(s0[0], s1[0], 0.92), s0[1] + 80, A.win(t, 31.8, 33.4, 0.1, 0.4), 96);
    X.bigNum(c, 'km', A.lerp(s0[0], s1[0], 0.5), s0[1] + 190, A.win(t, 31.4, 33.4, 0.1, 0.4), 56, P.ink2);
  }

  // 36.08–41.5: nhiều loại pháo, sao không mua cái to nhất
  private lineup(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: -220, z: 1 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const shift = A.eio(t, 39.4, 40.5);
    const dim = 1 - 0.7 * A.sm(t, 39.6, 40.4);
    const pop = (t0: number) => A.back(t, t0, t0 + 0.45);
    const ox = -330 * shift;
    A.withA(c, dim, () => {
      c.save(); c.translate(ox, 0);
      const p0 = pop(36.1), p1 = pop(36.55), p2 = pop(37.0), p3 = pop(37.45);
      if (p0 > 0) X.mortar(c, { x: -720, s: 1.2 * p0, ang: 1.2 });
      if (p1 > 0) X.towedGun(c, { x: -380, s: 0.85 * p1, elev: 0.35 });
      if (p2 > 0) X.spGun(c, { x: 80, s: 0.7 * p2, elev: 0.3 });
      if (p3 > 0) X.spGun(c, { x: 560, s: 0.7 * p3, elev: 0.25, wheels: true, len: 0.8 });
      c.restore();
    });
    const g = A.back(t, 39.45, 40.3);
    if (g > 0) {
      const gs = 1.35 * g;
      X.spGun(c, { x: A.lerp(1500, 520, A.eo(t, 39.45, 40.3)), s: gs, elev: 0.2, len: 1.55, tint: '#6d7a4d' });
    }
    K.end(c);
  }

  // 41.52–50.9: đánh đổi, và cái còn lại sau tranh cãi
  private trades(c: CanvasRenderingContext2D, t: number) {
    const tiltK: A.Pt[] = [[41.5, 0], [42.4, 0], [43.4, 0.2], [44.6, 0.2], [45.6, -0.2], [46.4, -0.2], [46.9, 0]];
    const tilt = A.keys(t, tiltK);
    const bal = 1 - A.sm(t, 46.3, 47.0);
    if (bal > 0.01) {
      c.save(); c.globalAlpha = bal;
      const sink = A.eio(t, 46.3, 47.0) * 160;
      X.balance(c, 960, 330 + sink, tilt,
        (g) => { X.towedGun(g, { x: 80, y: 0, s: 0.62, elev: 0.15, len: 1.0, deploy: 0.1 }); },
        (g) => { X.spGun(g, { x: 0, y: 0, s: 0.4, elev: 0.1, len: 0.5 }); }, 1.15);
      c.restore();
    }
    if (t >= 46.2) {
      const cam: K.Cam = { x: 0, y: -240, z: 1 };
      K.begin(c, cam);
      X.sideGround(c, cam);
      const ap = A.sm(t, 46.3, 47.0);
      // các thiết kế bị loại: mờ dần theo từng cái
      const ghosts: [number, () => void][] = [
        [47.5, () => X.spGun(c, { x: -700, y: -90, s: 0.5, elev: 0.5, len: 0.6, tint: '#aab', alpha: 0.35 })],
        [47.9, () => X.towedGun(c, { x: -300, y: -90, s: 0.5, elev: 0.2, len: 2.0, tint: '#aab', alpha: 0.35 })],
        [48.3, () => X.spGun(c, { x: 120, y: -90, s: 0.5, elev: 0.15, len: 1.9, wheels: true, tint: '#aab', alpha: 0.35 })],
        [48.7, () => X.towedGun(c, { x: 480, y: -90, s: 0.55, elev: 0.6, len: 0.6, tint: '#aab', alpha: 0.35 })],
        [49.1, () => X.mortar(c, { x: 760, y: -90, s: 1.2, ang: 0.7, alpha: 0.35 })],
        [49.5, () => X.spGun(c, { x: -500, y: -90, s: 0.45, elev: 0.9, len: 0.45, wheels: true, tint: '#aab', alpha: 0.35 })],
      ];
      for (const [tg, f] of ghosts) { const a = 1 - A.sm(t, tg, tg + 0.35); if (a > 0.01) A.withA(c, a * ap, f); }
      A.withA(c, ap, () => {
        X.mortar(c, { x: -560, s: 1.2, ang: 1.2 });
        X.towedGun(c, { x: -100, s: 0.9, elev: 0.35 });
        X.spGun(c, { x: 560, s: 0.75, elev: 0.3 });
      });
      K.end(c);
    }
  }
}
