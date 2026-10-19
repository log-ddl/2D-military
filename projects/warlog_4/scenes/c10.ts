// Chương 10 (357.6 – 389.4): nhóm hộ tống, các lớp giữa kẻ tấn công và sàn tàu. TRÊN bản đồ.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const lerp2 = (a: A.Pt, b: A.Pt, p: number): A.Pt => [A.lerp(a[0], b[0], p), A.lerp(a[1], b[1], p)];

// hộ tống: [x, y, loại]
const ESC: [number, number, 'cr' | 'ds'][] = [
  [-320, -190, 'cr'], [300, 210, 'cr'],
  [-640, 270, 'ds'], [-520, -400, 'ds'], [640, -300, 'ds'], [700, 320, 'ds'],
];
const FRIEND_SUB: A.Pt[] = [[-930, -40], [930, 90]];

// hướng phía kẻ tấn công: từ phải
const MISS: { from: A.Pt; to: A.Pt; hit: A.Pt; t0: number }[] = [
  { from: [1550, -330], to: [-100, -20], hit: [1060, -240], t0: 372.0 },
  { from: [1560, -120], to: [-100, 0], hit: [1010, -90], t0: 372.6 },
  { from: [1580, 120], to: [-100, 10], hit: [1000, 150], t0: 373.2 },
  { from: [1540, 330], to: [-100, 20], hit: [1090, 300], t0: 373.8 },
];

function warship(c: CanvasRenderingContext2D, x: number, y: number, kind: 'cr' | 'ds', a: number, col: string = P.oliveLight, rot = 0) {
  const L = kind === 'cr' ? 190 : 150, W = kind === 'cr' ? 40 : 30;
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= a;
  A.poly(c, [[-L / 2, -W / 2], [L / 2 - 16, -W / 2], [L / 2, 0], [L / 2 - 16, W / 2], [-L / 2, W / 2]], col, P.ink, A.px(c, 3));
  A.rrect(c, -12, -W / 4, 44, W / 2, 3, P.oliveDark, null, 0);
  c.restore();
}

export default class C10 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam: K.Cam = { x: 120, y: 0, z: 0.62 };
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 14);
    // 357.6–360: mục tiêu quý nhất: tâm ngắm
    const ca = A.sm(t, 357.8, 358.6);
    S.carrierTop(c, t, { x: 0, y: 0, s: 0.7, angled: 1 });
    if (ca > 0 && t < 366) {
      c.save(); c.globalAlpha *= ca * (1 - A.sm(t, 364.6, 366));
      const r = 270 - 50 * A.sm(t, 358.0, 359.4);
      A.circle(c, 0, 0, r, null, P.enemy, A.px(c, 6));
      A.line(c, [[-r - 60, 0], [-r + 50, 0]], P.enemy, A.px(c, 6)); A.line(c, [[r + 60, 0], [r - 50, 0]], P.enemy, A.px(c, 6));
      A.line(c, [[0, -r - 60], [0, -r + 50]], P.enemy, A.px(c, 6)); A.line(c, [[0, r + 60], [0, r - 50]], P.enemy, A.px(c, 6));
      c.restore();
    }
    // 360–364: hộ tống xuất hiện
    ESC.forEach(([x, y, k], i) => {
      const p = A.back(t, 360.4 + i * 0.45, 361.0 + i * 0.45);
      if (p <= 0.01) return;
      warship(c, x, y, k, Math.min(1, p));
    });
    FRIEND_SUB.forEach(([x, y], i) => {
      const p = A.sm(t, 363.0 + i * 0.4, 364.0 + i * 0.4);
      if (p <= 0) return;
      c.save(); c.globalAlpha *= p;
      c.beginPath(); c.ellipse(x, y, 100, 20, 0, 0, Math.PI * 2); A.fs(c, 'rgba(125,139,90,0.3)', P.olive, A.px(c, 3));
      c.restore();
    });
    // 366–371: các lớp (ba vòng)
    const ring = (r: number, a0: number, col: string, w: number) => {
      const p = A.sm(t, a0, a0 + 0.9);
      if (p <= 0) return;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2 * p);
      c.strokeStyle = col; c.lineWidth = A.px(c, w); c.setLineDash([26 / A.scaleOf(c), 16 / A.scaleOf(c)]); c.stroke(); c.setLineDash([]);
    };
    ring(950, 366.4, P.ink2, 5); ring(660, 367.8, P.ink2, 5);
    const inner = A.sm(t, 383.6, 384.4);
    ring(420, 369.4, A.lerpColor(P.ink2, P.amber, inner), 5 + 4 * inner);

    // 371–377: tên lửa và máy bay đối phương, bị theo dõi rồi bị đánh chặn
    MISS.forEach((m, i) => {
      const u = A.clamp01((t - m.t0) / 3.2);
      if (u <= 0) return;
      // chặn ở điểm hit (u_hit) bằng tên lửa hộ tống
      const dHit = Math.hypot(m.hit[0] - m.from[0], m.hit[1] - m.from[1]) / Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1]);
      const killed = u >= dHit - 0.0;
      const pos = lerp2(m.from, m.to, Math.min(u, dHit));
      if (!killed || t < m.t0 + 3.2 * dHit + 0.02) {
        const isAir = i === 0 || i === 3;
        if (isAir) S.jetTop(c, pos[0], pos[1], 2.6, { ang: Math.PI, col: P.enemyLight });
        else A.capsule(c, [pos[0] - 26, pos[1]], [pos[0] + 26, pos[1]], 11, P.enemy, P.ink, A.px(c, 3));
        // theo dõi: vòng khoá
        if (u > 0.05) A.circle(c, pos[0], pos[1], 50 + 5 * Math.sin(t * 6 + i), null, P.enemy, A.px(c, 3.5));
      }
      // tên lửa đánh chặn từ tàu hộ tống gần nhất
      const esc = ESC.filter(e => e[0] > 400).reduce((b, e) => Math.hypot(e[0] - m.hit[0], e[1] - m.hit[1]) < Math.hypot(b[0] - m.hit[0], b[1] - m.hit[1]) ? e : b);
      const tf = m.t0 + 3.2 * dHit - 0.9;
      const fp = A.clamp01((t - tf) / 0.9);
      if (fp > 0 && fp < 1) {
        const [mx, my] = lerp2([esc[0], esc[1]], m.hit, fp);
        A.line(c, [lerp2([esc[0], esc[1]], m.hit, Math.max(0, fp - 0.3)), [mx, my]], P.amber, A.px(c, 8));
        A.circle(c, mx, my, 12, P.amber, P.ink, A.px(c, 2.5));
      }
      const te = m.t0 + 3.2 * dHit;
      if (t >= te && t < te + 1.0) F.explosion(c, m.hit[0], m.hit[1], 110, (t - te) / 1.0, A.px(c, 3));
    });
    // 377–382: tàu ngầm đối phương bị săn bởi trực thăng và hộ tống
    this.sub(c, t);
    // 382–389: lớp cuối: hệ thống tự vệ của chính tàu
    this.last(c, t);
    K.end(c);
    chain(c, t);
  }

  private sub(c: CanvasRenderingContext2D, t: number) {
    if (t < 376.8 || t > 385) return;
    const p = A.eio(t, 377.0, 381.6);
    const [x, y] = lerp2([-1500, 120], [-770, 200], p);
    const dead = A.sm(t, 381.8, 382.4);
    c.save(); c.globalAlpha *= (1 - A.sm(t, 383.6, 385.0));
    c.beginPath(); c.ellipse(x, y, 110, 22, 0, 0, Math.PI * 2); A.fs(c, 'rgba(180,73,60,0.4)', P.enemy, A.px(c, 3));
    // trực thăng bay ra, thả sonar
    const hp = A.eio(t, 378.0, 380.2);
    const [hx, hy] = lerp2([-100, 40], [x + 100, y - 90], hp);
    if (t > 379.8) S.rings(c, x, y, t, { R: 250, n: 3, per: 1.1, color: P.sky, w: 5 });
    S.jetTop(c, hx, hy, 2.6, { kind: 'heli', rotor: t * 5 });
    // tàu hộ tống nhắm tới
    const [ex, ey] = ESC[2]!;
    if (t > 380.4 && t < 381.8) {
      const fp = A.sm(t, 380.4, 381.8);
      A.line(c, [[ex, ey], lerp2([ex, ey], [x, y], fp)], P.amber, A.px(c, 5), [18, 10]);
    }
    if (dead > 0) {
      S.crossX(c, x, y, 60 * dead, P.enemy, 9);
      if (t < 383.0) F.shock(c, x, y, 200 * (t - 381.8) / 1.0, A.clamp01((t - 381.8) / 1.0), A.px(c, 3), P.ink2);
    }
    c.restore();
  }

  private last(c: CanvasRenderingContext2D, t: number) {
    if (t < 383.4 || t > 389.4) return;
    // một mối đe doạ lọt qua tới vòng trong; hệ thống của tàu bắn hạ
    const p = A.sm(t, 383.6, 385.6);
    const [x, y] = lerp2([1100, -240], [440, -90], p);
    if (t < 385.6) A.capsule(c, [x - 26, y], [x + 26, y], 11, P.enemy, P.ink, A.px(c, 3));
    // đạn tự vệ của tàu
    const fp = A.clamp01((t - 385.2) / 0.7);
    if (fp > 0 && fp < 1) {
      const [mx, my] = lerp2([60, -10], [440, -90], fp);
      A.line(c, [lerp2([60, -10], [440, -90], Math.max(0, fp - 0.3)), [mx, my]], P.amber, A.px(c, 8));
    }
    if (t >= 385.7 && t < 386.8) F.explosion(c, 440, -90, 90, (t - 385.7) / 1.1, A.px(c, 3));
    // vòng trong sáng lên (lớp cuối)
  }
}
