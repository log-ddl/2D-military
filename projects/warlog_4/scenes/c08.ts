// Chương 8 (289.8 – 328.9): phi đội, mỗi loại bù một lỗ. TRÊN bản đồ vòng tầm.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const SS = 0.62;                         // cỡ tàu trên bản đồ
const FOE: A.Pt = [900, -40];            // tàu đối phương (đánh xa)
const RADAR_AT: A.Pt = [-520, -300];     // máy bay radar bay cao
const SITE: A.Pt = [820, -360];          // trạm radar đối phương
const SUB: A.Pt = [-470, 300];
const PILOT: A.Pt = [330, 320];
const CONTACTS: A.Pt[] = [[-900, 160], [-780, -430], [-640, 360], [-300, -560]];

const lerp2 = (a: A.Pt, b: A.Pt, p: number): A.Pt => [A.lerp(a[0], b[0], p), A.lerp(a[1], b[1], p)];

function dish(c: CanvasRenderingContext2D, x: number, y: number, ang: number, col: string, r = 18) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); A.fs(c, null, col, A.px(c, 5));
  A.line(c, [[0, -r], [0, r]], col, A.px(c, 4));
  c.restore();
}

export default class C08 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam: K.Cam = { x: 90, y: -10, z: 0.88 };
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 18);
    S.carrierTop(c, t, { x: 0, y: 0, s: SS, angled: 1 });
    // tầm nhìn của tàu (đường chân trời): vòng nhỏ
    const hp = A.sm(t, 297.8, 298.8);
    if (hp > 0) A.circle(c, 0, 0, 300 * hp, null, P.ink2, A.px(c, 4));
    this.strike(c, t);
    this.radar(c, t);
    this.heli(c, t);
    this.ew(c, t);
    this.tanker(c, t);
    this.summary(c, t);
    this.mix(c, t);
    K.end(c);
    chain(c, t);
  }

  // 289.8 – 295: năm loại cùng xuất hiện trên sàn
  private mix(c: CanvasRenderingContext2D, t: number) {
    if (t > 297) return;
    const kinds: S.Kind[] = ['jet', 'radar', 'heli', 'ew', 'tanker'];
    kinds.forEach((k, i) => {
      const p = A.back(t, 290.2 + i * 0.5, 290.8 + i * 0.5) * (1 - A.sm(t, 294.4 + i * 0.6, 295.2 + i * 0.6));
      if (p <= 0.01) return;
      const x = -290 + i * 150, y = -150;
      const sc = Math.min(1, p);
      A.circle(c, x, y, 64 * sc, '#ffffff', P.ink, A.px(c, 4));
      S.jetTop(c, x, y, 1.1 * sc, { kind: k, rotor: t * 5 });
    });
  }

  // 294.5 – 303: bắn và ném bom
  private strike(c: CanvasRenderingContext2D, t: number) {
    const fa = A.sm(t, 293.8, 294.6);
    if (fa > 0) {
      c.save(); c.translate(FOE[0], FOE[1]); c.globalAlpha *= fa;
      A.poly(c, [[-60, -14], [50, -14], [76, 0], [50, 14], [-60, 14]], P.enemyLight, P.ink, A.px(c, 3));
      A.rrect(c, -10, -8, 30, 16, 3, P.enemy, P.ink, A.px(c, 2.5));
      c.restore();
    }
    const t0 = 295.0, t1 = 299.6;
    for (let i = 0; i < 2; i++) {
      const u = A.clamp01((t - t0 - i * 0.35) / (t1 - t0));
      if (u <= 0) continue;
      const e = A.eio(u, 0, 1);
      const [x, y] = lerp2([60, -20 + i * 40], [FOE[0] - 130, FOE[1] - 30 + i * 60], e);
      const back = u >= 1 ? A.sm(t, 302.0, 303.6) : 0;
      const [bx, by] = lerp2([x, y], [60, -20 + i * 40], back);
      S.jetTop(c, bx, by, 1.15, { flame: u < 1 ? 0.7 : 0, ang: back > 0 ? Math.PI : 0 });
      if (t > 298.0 && t < 299.6) {
        const p = A.sm(t, 298.0, 299.6);
        const [rx, ry] = lerp2([x + 30, y], FOE, p);
        A.capsule(c, [rx - 10, ry], [rx + 10, ry], 5, P.enemyLight, P.ink, A.px(c, 2));
      }
    }
    if (t >= 299.6 && t < 301.2) F.explosion(c, FOE[0], FOE[1], 80, (t - 299.6) / 1.1, A.px(c, 3));
    if (t >= 300.0 && t < 303.0) F.smoke(c, FOE[0], FOE[1], (t - 300.0) * 1.6, 0.9);
  }

  // 297.5 – 305: máy bay radar bay cao, vòng nhìn rộng gấp nhiều lần
  private radar(c: CanvasRenderingContext2D, t: number) {
    if (t < 297.4) return;
    const p = A.eio(t, 297.8, 301.4);
    const [x, y] = lerp2([40, -10], RADAR_AT, p);
    const rp = A.sm(t, 299.6, 302.4) * (1 - A.sm(t, 322.8, 323.6) * 0);
    if (rp > 0) {
      c.save();
      c.beginPath(); c.arc(x, y, 820 * rp, 0, Math.PI * 2);
      c.fillStyle = 'rgba(245,158,11,0.10)'; c.fill();
      c.strokeStyle = P.amber; c.lineWidth = A.px(c, 5);
      c.setLineDash([22 / A.scaleOf(c), 14 / A.scaleOf(c)]); c.stroke(); c.setLineDash([]);
      const a = t * 2.4;
      A.line(c, [[x, y], [x + Math.cos(a) * 820 * rp, y + Math.sin(a) * 820 * rp]], 'rgba(245,158,11,0.7)', A.px(c, 4));
      c.restore();
    }
    if (rp > 0.9) {
      CONTACTS.forEach(([cx, cy], i) => {
        const lit = A.sm(t, 301.0 + i * 0.5, 302.0 + i * 0.5);
        A.circle(c, cx, cy, 16, lit > 0.5 ? P.enemy : P.enemyLight, P.ink, A.px(c, 3));
        if (lit > 0.5) A.circle(c, cx, cy, 30 + 6 * Math.sin(t * 5 + i), null, P.enemy, A.px(c, 3));
      });
    }
    S.jetTop(c, x, y, 1.6, { kind: 'radar', rotor: t * 3.5 });
  }

  // 305.6 – 309: trực thăng: săn tàu ngầm, cứu phi công
  private heli(c: CanvasRenderingContext2D, t: number) {
    if (t < 305.2 || t > 323.2) return;
    const a = A.sm(t, 305.2, 306.0), b = A.sm(t, 322.0, 323.0);
    c.save(); c.globalAlpha *= a * (1 - b);
    c.beginPath(); c.ellipse(SUB[0], SUB[1], 70, 18, 0.2, 0, Math.PI * 2);
    A.fs(c, 'rgba(180,73,60,0.35)', P.enemy, A.px(c, 3));
    A.rrect(c, SUB[0] - 6, SUB[1] - 18, 22, 10, 3, P.enemy, null, 0);
    A.circle(c, PILOT[0], PILOT[1], 11, P.amber, P.ink, A.px(c, 3));
    A.circle(c, PILOT[0], PILOT[1], 24 + 6 * Math.sin(t * 4), null, P.amber, A.px(c, 3));
    c.restore();
    const p1 = A.eio(t, 305.4, 307.0), p2 = A.eio(t, 308.0, 309.2);
    let h: A.Pt = lerp2([-40, 40], [SUB[0] + 60, SUB[1] - 70], p1);
    if (t > 308.0) h = lerp2([SUB[0] + 60, SUB[1] - 70], [PILOT[0] - 40, PILOT[1] - 60], p2);
    c.save(); c.globalAlpha *= 1 - b;
    if (t > 306.8 && t < 308.2) S.rings(c, SUB[0], SUB[1], t, { R: 130, n: 3, per: 1.1, color: P.sky, w: 4 });
    S.jetTop(c, h[0], h[1], 1.4, { kind: 'heli', rotor: t * 4 });
    c.restore();
  }

  // 309.4 – 312.5: tác chiến điện tử làm mù radar đối phương
  private ew(c: CanvasRenderingContext2D, t: number) {
    if (t < 309.0 || t > 313.4) return;
    const a = A.sm(t, 309.0, 309.8) * (1 - A.sm(t, 312.8, 313.4));
    c.save(); c.globalAlpha *= a;
    const jam = A.sm(t, 310.6, 311.4);
    dish(c, SITE[0], SITE[1], t * 1.2, P.enemy, 24);
    S.rings(c, SITE[0], SITE[1], t, { R: 190, n: 3, per: 1.4, color: jam > 0.5 ? 'rgba(180,73,60,0.35)' : P.enemy, w: 4 });
    const p = A.eio(t, 309.2, 310.8);
    const [x, y] = lerp2([60, 0], [SITE[0] - 340, SITE[1] + 160], p);
    if (jam > 0) {
      const pts: A.Pt[] = [];
      for (let i = 0; i <= 18; i++) {
        const u = i / 18;
        pts.push([A.lerp(x + 24, SITE[0] - 18, u * jam), A.lerp(y, SITE[1], u * jam) + Math.sin(u * 30 + t * 20) * 14]);
      }
      A.line(c, pts, P.amber, A.px(c, 5));
      S.crossX(c, SITE[0], SITE[1], 34 * jam);
    }
    S.jetTop(c, x, y, 1.5, { kind: 'ew' });
    c.restore();
  }

  // 312.8 – 319.9: tiếp dầu từ chính boong tàu
  private tanker(c: CanvasRenderingContext2D, t: number) {
    if (t < 312.6 || t > 322) return;
    const a = A.sm(t, 312.6, 313.4) * (1 - A.sm(t, 320.6, 321.6));
    c.save(); c.globalAlpha *= a;
    const x = 420 + 40 * Math.sin(t * 0.7), y = 190;
    const hp = A.sm(t, 314.4, 315.6);
    S.jetTop(c, x, y, 1.5, { kind: 'tanker' });
    S.jetTop(c, x + 120, y + 70, 1.5, { hero: true });
    if (hp > 0) A.line(c, [[x - 40, y + 16], [x + 60 * hp + 10, y + 70 * hp + 8]], P.sand, A.px(c, 5));
    const fp = A.sm(t, 315.6, 318.4);
    A.rrect(c, x + 60, y + 118, 120, 14, 7, '#ffffff', P.ink, A.px(c, 3));
    A.rrect(c, x + 62, y + 120, 116 * fp, 10, 5, P.amber, null, 0);
    // thân tàu dài hơn: nét đứt (rẻ hơn là đóng tàu dài hơn)
    const gp = A.sm(t, 317.8, 319.0);
    if (gp > 0) A.rrect(c, 220, -22, 340 * gp, 44, 0, 'rgba(100,116,139,0.10)', P.ink2, A.px(c, 3));
    c.restore();
  }

  // 323.9 – 328.9: thấy xa, đánh xa, sống sót
  private summary(c: CanvasRenderingContext2D, t: number) {
    if (t < 323.4) return;
    const see = A.win(t, 323.9, 326.0, 0.3, 0.001), hit = A.win(t, 325.0, 327.6, 0.3, 0.001), live = A.win(t, 326.4, 328.9, 0.3, 0.001);
    if (see > 0) A.circle(c, 0, 0, 780, null, P.amber, A.px(c, 6 * see));
    if (hit > 0) S.arrowW(c, [60, -20], [FOE[0] - 90, FOE[1]], hit, P.enemy, 10, 40);
    if (live > 0) {
      c.beginPath(); c.arc(0, 0, 260, 0, Math.PI * 2);
      c.strokeStyle = P.olive; c.lineWidth = A.px(c, 9 * live); c.stroke();
    }
  }
}
