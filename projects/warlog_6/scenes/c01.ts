import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { xMark, arrow } from './shared/ui';

// Chương 1 (0–37.4): hook. Trên xuống. Radar thấy 400 km, tên lửa chỉ 100 km; mạng là cuộc đối thoại; câu hỏi nhanh/thấp/mọi hướng.
const B: A.Pt = [700, 600];            // radar
const LCH: A.Pt = [590, 735];          // bệ phóng
const R_RADAR = 560, R_MIS = 140;      // 400 km : 100 km
const S0: A.Pt = [1960, -40];           // điểm xuất phát máy bay
const DX = B[0] - S0[0], DY = B[1] - S0[1];
const sPos = (t: number) => A.keysLin(t, [[0, 0.30], [3.9, 0.60], [9, 0.72], [26, 0.93], [40, 1.0]]);
const planePos = (t: number): A.Pt => { const s = sPos(t); return [S0[0] + DX * s, S0[1] + DY * s]; };
const planeAng = Math.atan2(DY, DX);

const NODES: { p: A.Pt; k: 'radar' | 'big' | 'med' | 'gun' | 'sol' | 'awacs' }[] = [
  { p: [180, 250], k: 'radar' }, { p: [420, 80], k: 'med' }, { p: [1240, 60], k: 'big' },
  { p: [1620, 420], k: 'radar' }, { p: [1500, 880], k: 'med' }, { p: [1100, 1000], k: 'gun' },
  { p: [160, 880], k: 'sol' }, { p: [980, 330], k: 'awacs' }, { p: [330, 600], k: 'med' }, { p: [1380, 640], k: 'gun' },
];
const HUB: A.Pt = [880, 560];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const zoom = A.sm(t, 18.2, 21.5) - A.sm(t, 25.8, 27.3);
    const cam: K.Cam = { x: A.lerp(960, 900, zoom), y: A.lerp(540, 520, zoom), z: A.lerp(1, 0.64, zoom) };
    K.begin(c, cam);
    W.topBg(c, cam);

    // ── cụm giữa: radar + bệ phóng ───────────────────────────────
    const ring1 = A.eo(t, 2.2, 3.9);
    const quest = t >= 26.4;
    if (!quest) {
      // vòng radar 400 km
      W.rangeRing(c, B[0], B[1], R_RADAR, P.sky, ring1, { a: 0.95, fill: 0.07 });
      // quét
      if (t > 0.2) {
        const sw = t * 2.4;
        withA(c, 0.5 * A.clamp01(t / 1), () => {
          c.beginPath(); c.moveTo(B[0], B[1]); c.arc(B[0], B[1], R_RADAR * Math.max(0.35, ring1), sw - 0.5, sw); c.closePath();
          c.fillStyle = P.sky; c.globalAlpha *= 0.28; c.fill();
        });
      }
      // vòng tên lửa 100 km (hiện sau khi nói "unable")
      const r2 = A.eo(t, 8.4, 9.2);
      W.rangeRing(c, LCH[0], LCH[1], R_MIS, P.olive, r2, { fill: 0.16 });
      D.radarTop(c, B[0], B[1], 2.0, { ph: t * 2.4 });
      D.launcherTop(c, LCH[0], LCH[1], -0.35, 2.0);
      // vạch khoảng cách 400 km
      const tg = A.eo(t, 3.7, 4.6);
      if (tg > 0 && t < 12) {
        const ang = -Math.PI / 2 + 0.9;
        const e: A.Pt = [B[0] + Math.cos(ang) * R_RADAR, B[1] + Math.sin(ang) * R_RADAR];
        withA(c, tg * (1 - A.sm(t, 10.5, 11.3)), () => line(c, [B, e], P.sky, 4, [14, 10]));
      }
    }

    // ── máy bay chính ────────────────────────────────────────────
    if (!quest) {
      const [px, py] = planePos(t);
      if (t > 5.0 && t < 26) W.breadcrumb(c, planePos, Math.max(0, t - 2.6), t, 7);
      const net = A.sm(t, 18.2, 20.0);
      D.planeTop(c, px, py, planeAng, 2.0, { side: 'atk' });
      if (t > 2.4 && t < 12) {
        const lock = A.eo(t, 5.4, 6.4);
        W.bracket(c, px, py, 96, P.sky, lock);
      }
      if (t > 6.6 && t < 12) {
        // "identify": ô thù địch
        const k = A.eo(t, 6.8, 7.6);
        withA(c, k, () => {
          c.save(); c.translate(px, py - 130);
          poly(c, [[0, -34], [40, 0], [0, 34], [-40, 0]], '#f2a7a0', P.ink, 5);
          c.restore();
        });
        // "know where": vector vận tốc
        arrow(c, [px, py], [px + Math.cos(planeAng) * 130, py + Math.sin(planeAng) * 130], { p: A.eo(t, 7.6, 8.4), color: P.sky, w: 6 });
      }
      // tên lửa bắn không tới (tại 9.0)
      if (t > 9.0 && t < 11.2) {
        const p = A.ph(t, 9.0, 10.0);
        const dir = Math.atan2(py - LCH[1], px - LCH[0]);
        const dst = 160;
        const mx = LCH[0] + Math.cos(dir) * dst * A.eo(p, 0, 1), my = LCH[1] + Math.sin(dir) * dst * A.eo(p, 0, 1);
        const fall = A.ei(t, 10.0, 11.0);
        if (t < 10.0) {
          D.missile(c, mx, my, dir, 100, { flame: 1 });
          W.rangeRing(c, mx, my, 1, P.ink, 0);
        } else {
          D.missile(c, mx, my + fall * 60, dir + fall * 1.2, 100, { a: 1 - fall });
        }
        // vạch trượt khoảng cách: đoạn đứt từ vòng nhỏ tới máy bay + dấu X
        const gap = A.eo(t, 10.0, 10.8);
        if (gap > 0) {
          const ex = LCH[0] + Math.cos(dir) * R_MIS, ey = LCH[1] + Math.sin(dir) * R_MIS;
          withA(c, gap, () => line(c, [[ex, ey], [px, py]], P.enemy, 4, [10, 10]));
          xMark(c, ex, ey, 20, gap, P.enemy, 7);
        }
      }
      // ── mạng: 18.2–26.0 ──────────────────────────────────────
      if (t > 18.0) {
        const dead = A.sm(t, 23.3, 23.9);
        const failIdx = 7; // awacs gần đường bay
        NODES.forEach((n, i) => {
          const a = A.eo(t, 18.4 + i * 0.12, 19.0 + i * 0.12);
          if (a <= 0) return;
          const isDead = i === failIdx;
          const al = isDead ? a * (1 - 0.65 * dead) : a;
          W.link(c, n.p, HUB, isDead && dead > 0.5 ? P.slate : P.amber, 4, al * (isDead ? 1 - dead : 1), t);
          if (!(isDead && dead > 0.5)) W.pulse(c, n.p, HUB, t, 0.6, i * 0.17);
          const kind = n.k;
          if (kind === 'radar') D.radarTop(c, n.p[0], n.p[1], 1.7, { ph: t * 2 + i, a: al });
          if (kind === 'big') D.launcherTop(c, n.p[0], n.p[1], 0.4, 1.7, { big: true, a: al });
          if (kind === 'med') D.launcherTop(c, n.p[0], n.p[1], -0.8 + i, 1.7, { a: al });
          if (kind === 'gun') D.gunTop(c, n.p[0], n.p[1], 0.5, 1.5, { a: al });
          if (kind === 'sol') D.soldierTop(c, n.p[0], n.p[1], -0.7, 2.4, { a: al });
          if (kind === 'awacs') D.planeTop(c, n.p[0], n.p[1], 0.2, 1.5, { kind: 'awacs', side: 'def', a: al });
          if (isDead && dead > 0) xMark(c, n.p[0], n.p[1], 60, A.sm(t, 23.6, 24.4), P.enemy, 12);
        });
        // liên kết B <-> hub
        W.link(c, B, HUB, P.amber, 4, A.sm(t, 18.2, 19.4), t);
        W.link(c, LCH, HUB, P.amber, 4, A.sm(t, 18.2, 19.4), t);
        W.pulse(c, B, HUB, t, 0.5, 0.2);
        W.hub(c, HUB[0], HUB[1], 1.7, A.sm(t, 18.2, 19.4));
      }
      // ring lines for the big ring remains; draw defender icons already done above
    }

    // ── câu hỏi: nhanh, thấp, mọi hướng ──────────────────────────
    if (quest) {
      const C0: A.Pt = [960, 520];
      const small = A.eo(t, 26.6, 27.4);
      W.rangeRing(c, C0[0], C0[1], 230, P.olive, small, { fill: 0.14 });
      D.launcherTop(c, C0[0], C0[1], -0.6, 2.4);
      // nhanh
      const f = A.ph(t, 27.9, 28.9);
      if (f > 0 && f < 1) {
        const x = A.lerp(2200, -300, A.ei(f, 0, 1) * 0.5 + f * 0.5), y = 250;
        for (let i = 0; i < 4; i++) line(c, [[x + 120 + i * 90, y - 24 + i * 16], [x + 330 + i * 90, y - 24 + i * 16]], P.ink2, 4);
        D.planeTop(c, x, y, Math.PI, 2.6, { side: 'atk' });
      }
      // thấp: khung nhìn ngang ở góc dưới phải
      const ins = A.eo(t, 29.0, 29.8) * (1 - A.sm(t, 30.9, 31.5));
      if (ins > 0) {
        c.save();
        c.translate(1180, 680 + (1 - ins) * 500);
        rrect(c, 0, 0, 640, 360, 20, '#eef5fa', P.ink, 5);
        c.beginPath(); c.roundRect(0, 0, 640, 360, 20); c.clip();
        c.fillStyle = D.GROUND; c.fillRect(0, 280, 640, 90);
        line(c, [[0, 280], [640, 280]], P.ink, 5);
        const xx = A.lerp(740, -120, A.ph(t, 29.4, 31.2));
        D.jetSide(c, xx, 238, 0.85, { dir: -1 });
        arrow(c, [580, 280], [580, 226], { color: P.enemy, w: 7, head: 18 });
        arrow(c, [580, 226], [580, 280], { color: P.enemy, w: 7, head: 18 });
        c.restore();
      }
      // mọi hướng
      const dirs: A.Pt[] = [[-1, -0.2], [-0.6, 0.9], [0.1, 1], [0.9, 0.6], [1, -0.4], [0.5, -1]];
      const ap = A.ph(t, 31.3, 34.2);
      dirs.forEach((d, i) => {
        const len = Math.hypot(d[0], d[1]);
        const ux = d[0] / len, uy = d[1] / len;
        const s0 = 1000, sEnd = 330;
        const pr = A.ph(ap, i * 0.05, 0.75 + i * 0.05);
        const r = A.lerp(s0, sEnd, A.sm(pr, 0, 1));
        const x = C0[0] + ux * r, y = C0[1] + uy * r;
        withA(c, A.clamp01(pr * 5), () => D.planeTop(c, x, y, Math.atan2(-uy, -ux), 2.2, { side: 'atk' }));
      });
      // một vòng tên lửa chỉ phủ đoạn nhỏ -> lộ ra
      if (t > 34.7) {
        const big = A.eo(t, 34.8, 36.4);
        W.rangeRing(c, C0[0], C0[1], A.lerp(230, 880, big), P.slate, 1, { fill: 0.05, a: 0.9 });
        xMark(c, C0[0], C0[1], 110, A.eo(t, 36.2, 37.2), P.enemy, 16);
      }
    }
    K.end(c);

    // ── nhãn ───────────────────────────────────────────────────────
    if (!quest && t > 3.5 && t < 11.5) {
      const ang = -Math.PI / 2 + 0.9;
      const [sx, sy] = K.toScreen(cam, B[0] + Math.cos(ang) * R_RADAR * 0.5, B[1] + Math.sin(ang) * R_RADAR * 0.5);
      D.tag(c, '400 km', sx + 90, sy - 10, A.eo(t, 3.8, 4.4) * (1 - A.sm(t, 10.5, 11.3)));
    }
  }
}
