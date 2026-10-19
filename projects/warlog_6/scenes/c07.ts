import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly, ellipse, capsule } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { xMark, arrow, ring } from './shared/ui';
import { smoke } from './shared/fx';

// Chương 7 (238.55–297.6): mạng chỉ huy + nhận diện địch/ta. TRÊN XUỐNG.
const HUB: A.Pt = [960, 540];
const SHIP: A.Pt = [250, 260], BATT: A.Pt = [1560, 250], PLAT: A.Pt = [960, 920];

function ship(c: CanvasRenderingContext2D, x: number, y: number, s = 1, a = 1) {
  withA(c, a, () => {
    c.save(); c.translate(x, y); c.rotate(0.3); c.scale(s, s);
    poly(c, [[-150, -34], [90, -34], [160, 0], [90, 34], [-150, 34]], '#8c97a6', P.ink, 4.5);
    rrect(c, -40, -20, 90, 40, 8, '#cfd6df', P.ink, 3.5);
    rrect(c, -110, -16, 50, 32, 6, '#cfd6df', P.ink, 3);
    line(c, [[10, -20], [10, -48]], P.ink, 4); line(c, [[-10, -48], [30, -48]], P.ink, 4);
    c.restore();
  });
}
function scope(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, blips: { p: A.Pt; col: string; a?: number; kind?: 'dot' | 'diamond' | 'missile' }[]) {
  circle(c, x, y, r, '#0f1d2b', P.ink, 6);
  for (const k of [0.33, 0.66, 1]) circle(c, x, y, r * k, null, 'rgba(120,200,150,0.35)', 2);
  line(c, [[x - r, y], [x + r, y]], 'rgba(120,200,150,0.35)', 2);
  line(c, [[x, y - r], [x, y + r]], 'rgba(120,200,150,0.35)', 2);
  c.save(); c.beginPath(); c.arc(x, y, r - 3, 0, Math.PI * 2); c.clip();
  const sw = t * 2.2;
  c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, sw - 0.6, sw); c.closePath(); c.fillStyle = 'rgba(120,255,170,0.30)'; c.fill();
  for (const b of blips) {
    withA(c, b.a ?? 1, () => {
      if (b.kind === 'diamond') poly(c, [[b.p[0], b.p[1] - 22], [b.p[0] + 22, b.p[1]], [b.p[0], b.p[1] + 22], [b.p[0] - 22, b.p[1]]], '#f2a7a0', '#fff', 3);
      else if (b.kind === 'missile') { c.save(); c.translate(b.p[0], b.p[1]); capsule(c, [-26, 0], [20, 0], 10, '#e8f0e8', '#fff', 2); poly(c, [[20, -9], [36, 0], [20, 9]], '#f2a7a0', '#fff', 2); c.restore(); }
      else circle(c, b.p[0], b.p[1], 14, b.col, '#fff', 3);
    });
  }
  c.restore();
}
const ndlink = (c: CanvasRenderingContext2D, a: A.Pt, b: A.Pt, t: number, p = 1, col: string = P.amber, w = 4) => W.link(c, a, b, col, w, p, t);

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    W.topBg(c, cam);
    if (t < 261.6) this.net(c, t);
    else if (t < 264.0) this.broken(c, t);
    else if (t < 270.2) this.assign(c, t);
    else if (t < 292.7) this.ident(c, t);
    else this.spread(c, t);
    K.end(c);
    if (t > 281.8 && t < 285.6) D.tag(c, '2003', 1560, 960, A.eo(t, 281.9, 282.7) * (1 - A.sm(t, 284.8, 285.4)));
  }

  // 238.55–261.6: ba nhóm không thể gọi nhau → mạng → bức tranh chung → hai bệ cùng bắn một mục tiêu
  private net(c: CanvasRenderingContext2D, t: number) {
    const clusters = t < 256.4;
    if (clusters) {
      const fo = 1 - A.sm(t, 255.4, 256.4);
      // biển cho tàu
      withA(c, fo, () => { c.beginPath(); c.ellipse(250, 220, 330, 230, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(150,190,215,0.45)'; c.fill(); });
      ship(c, SHIP[0], SHIP[1], 1.5, fo);
      D.radarTop(c, BATT[0] - 90, BATT[1] + 10, 2.0, { ph: t * 2.4, a: fo });
      D.launcherTop(c, BATT[0] + 60, BATT[1] - 30, -0.4, 2.0, { a: fo });
      D.launcherTop(c, BATT[0] + 40, BATT[1] + 90, 0.2, 2.0, { a: fo });
      for (let i = 0; i < 5; i++) D.soldierTop(c, PLAT[0] - 160 + i * 80, PLAT[1] + (i % 2) * 36 - 18, -1.6 + 0.1 * i, 1.9, { a: fo, tube: i == 2 });
      // tiếng hô không tới: các cung mờ dần
      const shout = (from: A.Pt, to: A.Pt, ph: number) => {
        const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
        for (let i = 0; i < 3; i++) {
          const p = (((t * 0.5 + ph + i / 3) % 1) + 1) % 1;
          const r = 90 + 560 * p;
          withA(c, (1 - p) * 0.9 * fo * A.eo(t, 239.0, 240.0), () => { c.beginPath(); c.arc(from[0], from[1], r, ang - 0.28, ang + 0.28); c.strokeStyle = P.ink2; c.lineWidth = 5; c.lineCap = 'round'; c.stroke(); });
        }
      };
      shout(SHIP, BATT, 0.0); shout(BATT, PLAT, 0.33); shout(PLAT, SHIP, 0.66);
    }
    // mạng: liên kết mảnh tới hub
    const hubA = A.eo(t, 246.8, 247.8);
    const nodes: A.Pt[] = clusters ? [SHIP, BATT, PLAT] : [];
    nodes.forEach((n, i) => ndlink(c, n, HUB, t, hubA * (clusters ? 1 - A.sm(t, 255.4, 256.4) : 1), P.amber, 3.5));
    if (clusters && hubA > 0) nodes.forEach((n, i) => W.pulse(c, n, HUB, t, 0.5, i / 3, P.amber, 8));
    W.hub(c, HUB[0], HUB[1], 1.8, hubA);
    // 251.4–256: cảm biến khắp vùng → một bức tranh
    const sens: A.Pt[] = [[160, 660], [1780, 640], [1020, 90], [600, 470], [1340, 470]];
    const sa = A.eo(t, 251.2, 252.6);
    if (sa > 0) sens.forEach((s, i) => {
      const e = A.eo(t, 251.2 + i * 0.25, 252.0 + i * 0.25);
      D.radarTop(c, s[0], s[1], 1.7, { ph: t * 2.4 + i, a: e });
      ndlink(c, s, HUB, t, e * (1 - A.sm(t, 258.4, 259.2) * 0), P.sky, 4);
      if (e > 0.9) W.pulse(c, s, HUB, t, 0.7, i * 0.2, P.sky, 8);
    });
    const pic = A.eo(t, 253.4, 254.6) * (1 - A.sm(t, 256.0, 256.8));
    if (pic > 0) withA(c, pic, () => {
      rrect(c, 700, 640, 520, 300, 22, '#0f1d2b', P.ink, 5);
      for (let i = 0; i < 6; i++) circle(c, 770 + (i * 83) % 400, 700 + (i * 61) % 190, 11, i % 3 ? '#f2a7a0' : '#9cc3f0', '#fff', 2);
    });
    // 256.8–261: hai bệ cùng bắn một máy bay, kẻ khác lọt
    if (t > 256.5) this.fight(c, t, 256.8, false);
    // cảm biến vẫn nối khi chiến đấu (trắng dần ở cuối)
  }

  // shared engagement scene; assigned = hệ thống giao việc (3 kẻ, 3 bệ)
  private fight(c: CanvasRenderingContext2D, t: number, t0: number, assigned: boolean) {
    const B: A.Pt[] = [[520, 780], [960, 660], [1400, 780]];
    const city: A.Pt = [960, 960];
    const fade = A.eo(t, t0 - 0.4, t0 + 0.4);
    withA(c, fade, () => {
      for (let i = 0; i < 4; i++) rrect(c, city[0] - 90 + (i % 2) * 100, city[1] - 50 + Math.floor(i / 2) * 60, 80, 48, 6, '#f1e6c8', P.ink, 3.5);
      B.forEach((b, i) => D.launcherTop(c, b[0], b[1], -Math.PI / 2 + (i - 1) * 0.3, 2.0));
    });
    // ba kẻ tấn công từ trên xuống
    const tg: { s: A.Pt; e: A.Pt; hit: number }[] = assigned
      ? [{ s: [520, -80], e: [560, 330], hit: t0 + 3.3 }, { s: [960, -120], e: [960, 340], hit: t0 + 3.6 }, { s: [1420, -80], e: [1380, 330], hit: t0 + 3.9 }]
      : [{ s: [520, -80], e: [560, 330], hit: t0 + 2.4 }, { s: [960, -120], e: [960, 960], hit: 999 }, { s: [1420, -80], e: [1380, 380], hit: t0 + 3.2 }];
    // bên nào bắn cái nào
    const pairs = assigned ? [[0, 0], [1, 1], [2, 2]] : [[0, 0], [1, 0], [2, 2]];
    tg.forEach((g, i) => {
      const dur = g.hit < 900 ? g.hit - t0 : 6.0;
      const p = A.ph(t, t0 - 0.6, t0 + (g.hit < 900 ? g.hit - t0 : 5.0));
      const pos: A.Pt = [A.lerp(g.s[0], g.e[0], p), A.lerp(g.s[1], g.e[1], p)];
      const ang = Math.PI / 2 + (g.e[0] - g.s[0]) / 1000;
      if (t < g.hit) D.planeTop(c, pos[0], pos[1], ang, 1.8, { side: 'atk', a: fade });
      else { const f = A.ph(t, g.hit, g.hit + 1.0); if (f < 1) { D.planeTop(c, pos[0], pos[1] + f * 40, ang + f * 3, 1.8, { side: 'atk', a: 1 - f }); D.bang(c, pos[0], pos[1], 70, f); } }
    });
    // đường giao việc
    pairs.forEach(([b, k], i) => {
      const g = tg[k]!;
      const l0 = g.hit < 900 ? g.hit - 1.5 : t0 + 1.0;
      if (t > l0 - 0.6 && t < g.hit + 0.6) {
        withA(c, A.sm(t, l0 - 0.6, l0 - 0.2), () => {
          const p = A.ph(t, t0 - 0.6, t0 + (g.hit < 900 ? g.hit - t0 : 5.0));
          const pos: A.Pt = [A.lerp(g.s[0], g.e[0], p), A.lerp(g.s[1], g.e[1], p)];
          line(c, [B[b]!, pos], assigned ? [P.sky, P.amber, '#8b5cf6'][i]! : P.amber, 4, [12, 10]);
        });
      }
      if (g.hit < 900 && t > l0) {
        const gp = A.ph(g.hit, t0 - 0.6, t0 + (g.hit - t0));
        const tgt: A.Pt = [A.lerp(g.s[0], g.e[0], gp), A.lerp(g.s[1], g.e[1], gp)];
        W.intercept(c, t, [B[b]![0], B[b]![1] - 40], tgt, l0, g.hit, { L: 80, boom: 0, bend: 0 });
      }
    });
    // kẻ lọt xuống thành phố
    if (!assigned) {
      const p = A.ph(t, t0 + 2.8, t0 + 4.4);
      if (p > 0.98) D.bang(c, city[0], city[1] - 20, 130, A.ph(t, t0 + 4.4, t0 + 5.2));
    }
  }

  // 261.5–264: mất mạng: hub xám, đường đứt, bệ phóng đứng riêng
  private broken(c: CanvasRenderingContext2D, t: number) {
    const B: A.Pt[] = [[520, 780], [960, 660], [1400, 780]];
    const k = A.eo(t, 261.6, 262.4);
    W.hub(c, HUB[0], HUB[1], 1.8, 1 - 0.6 * k, k > 0.5 ? P.slate : P.amber);
    B.forEach((b, i) => { D.launcherTop(c, b[0], b[1], -Math.PI / 2 + (i - 1) * 0.3, 2.0); line(c, [b, HUB], P.slate, 4, [10, 14]); xMark(c, (b[0] + HUB[0]) / 2, (b[1] + HUB[1]) / 2, 22, k, P.enemy, 7); });
  }

  // 264.2–270.2: mạng giao việc, mỗi bệ một mục tiêu
  private assign(c: CanvasRenderingContext2D, t: number) {
    const B: A.Pt[] = [[520, 780], [960, 660], [1400, 780]];
    const a = A.eo(t, 264.0, 264.8);
    B.forEach((b) => ndlink(c, b, HUB, t, a, P.amber, 4));
    W.hub(c, HUB[0], HUB[1], 1.8, 1);
    if (a > 0.9) B.forEach((b, i) => W.pulse(c, b, HUB, t, 0.7, i / 3, P.amber, 8));
    this.fight(c, t, 264.6, true);
  }

  // 270.3–292.6: bóng radar không có cờ → transponder → 2003
  private ident(c: CanvasRenderingContext2D, t: number) {
    // bên trái: màn radar
    const SC: A.Pt = [520, 540];
    const hostile = t > 273.4;
    const friend: A.Pt = [A.lerp(1320, 1180, A.sm(t, 270.3, 280)), 340];
    const foe: A.Pt = [A.lerp(1400, 1220, A.sm(t, 270.3, 280)), 760];
    const inScope = (w: A.Pt): A.Pt => [SC[0] + (w[0] - 1200) * 0.5 - 100, SC[1] + (w[1] - 540) * 0.6];
    const sA = A.eo(t, 270.4, 271.4) * (1 - A.sm(t, 281.4, 282.0));
    if (t < 282.0) {
      withA(c, sA, () => {
        scope(c, SC[0], SC[1], 300, t, [{ p: inScope(friend), col: '#c8d6e0' }, { p: inScope(foe), col: '#c8d6e0' }]);
      });
      // thế giới thật: hai máy bay giống nhau, cờ (màu) lộ ra ở 275
      const rv = A.eo(t, 274.0, 275.2);
      const jetCol = (side: 'def' | 'atk') => side;
      withA(c, sA, () => {
        D.planeTop(c, friend[0], friend[1], Math.PI, 2.2, { side: rv > 0.5 ? 'def' : 'atk', a: 1 });
        D.planeTop(c, foe[0], foe[1], Math.PI, 2.2, { side: 'atk', a: 1 });
        // cờ/viền lộ ra
        if (rv > 0) {
          circle(c, friend[0], friend[1], 70, null, P.olive, 7);
          circle(c, foe[0], foe[1], 70, null, P.enemy, 7);
        }
        // máy bay "lạ": trước khi lộ, cả hai xám
        if (rv < 0.5) { D.planeTop(c, friend[0], friend[1], Math.PI, 2.2, { side: 'atk', a: 0 }); }
      });
      // thách thức mã (276.6–281.7)
      const ch = A.ph(t, 277.0, 279.2);
      if (ch > 0 && ch < 1.0) {
        const from = SC;
        ring(c, from[0], from[1], 560 * ch, 0.0, P.sky, 5);
        withA(c, 1 - ch, () => { c.beginPath(); c.arc(from[0], from[1], 330 + (friend[0] - 520) * ch * 0.9, -0.4, 0.4); c.strokeStyle = P.sky; c.lineWidth = 6; c.stroke(); });
        // lời đáp từ bạn
        const rp = A.ph(t, 279.3, 281.3);
        if (rp > 0) {
          const x = A.lerp(friend[0], SC[0] + 330, rp);
          circle(c, x, friend[1] + (SC[1] - friend[1]) * rp * 0.8, 10, P.amber, P.ink, 3);
          if (rp > 0.5) xMark(c, (friend[0] + SC[0]) / 2 + 100, (friend[1] + SC[1]) / 2, 40, A.eo(t, 280.2, 280.8), P.enemy, 9);
        }
      }
      return;
    }
    // 282–292.6: 2003: hai máy bay bạn bị coi là tên lửa
    const PAT: A.Pt = [330, 760];
    D.launcherTop(c, PAT[0], PAT[1], -0.5, 2.4);
    D.radarTop(c, PAT[0] + 20, PAT[1] - 150, 2.0, { ph: t * 2.4 });
    const fr: { s: A.Pt; e: A.Pt; hit: number }[] = [
      { s: [900, 100], e: [1500, 360], hit: 287.0 }, { s: [800, 40], e: [1450, 150], hit: 288.8 },
    ];
    fr.forEach((f, i) => {
      const p = A.ph(t, 282.0, f.hit);
      const pos: A.Pt = [A.lerp(f.s[0], f.e[0], p), A.lerp(f.s[1], f.e[1], p)];
      const ang = Math.atan2(f.e[1] - f.s[1], f.e[0] - f.s[0]);
      if (t < f.hit) {
        D.planeTop(c, pos[0], pos[1], ang, 2.0, { side: 'def', kind: i ? 'jet' : 'bomber' });
        // bị đánh dấu thù địch + biểu tượng tên lửa
        const mk = A.eo(t, 284.0 + i * 0.4, 285.0 + i * 0.4);
        withA(c, mk, () => {
          poly(c, [[pos[0], pos[1] - 110], [pos[0] + 36, pos[1] - 76], [pos[0], pos[1] - 42], [pos[0] - 36, pos[1] - 76]], '#f2a7a0', P.ink, 5);
        });
        const ms = A.eo(t, 289.9, 290.6) * 0;
      } else {
        const ff = A.ph(t, f.hit, f.hit + 1.2);
        if (ff < 1) { D.planeTop(c, pos[0], pos[1] + ff * 60, ang + ff * 3, 2.0, { side: 'def', a: 1 - ff }); D.bang(c, pos[0], pos[1], 90, ff); }
      }
      const l0 = f.hit - 1.5;
      if (t > l0) W.intercept(c, t, [PAT[0] + 70, PAT[1] - 60], [A.lerp(f.s[0], f.e[0], A.ph(f.hit, 282.0, f.hit)), A.lerp(f.s[1], f.e[1], A.ph(f.hit, 282.0, f.hit))], l0, f.hit, { L: 90, boom: 0, bend: 0 });
    });
    // "tưởng là tên lửa": bóng tên lửa mờ phủ lên máy bay (289.9–292.6)
    const ms = A.eo(t, 289.9, 290.8);
    if (ms > 0) {
      fr.forEach((f, i) => {
        const p = 1.0;
        const pos: A.Pt = [A.lerp(f.s[0], f.e[0], A.ph(f.hit - 0.0, 282.0, f.hit)), A.lerp(f.s[1], f.e[1], A.ph(f.hit, 282.0, f.hit))];
        const ang = Math.atan2(f.e[1] - f.s[1], f.e[0] - f.s[0]);
        withA(c, ms * 0.9, () => { D.planeTop(c, pos[0], pos[1], ang, 2.0, { side: 'def', kind: i ? 'jet' : 'bomber', a: 0.45 }); D.missile(c, pos[0], pos[1], ang, 150, { side: 'atk', a: 1 }); });
      });
    }
  }

  // 292.7–297.6: lỗi lan theo mạng
  private spread(c: CanvasRenderingContext2D, t: number) {
    const nodes: A.Pt[] = [[260, 180], [1660, 160], [180, 560], [1740, 580], [460, 920], [1500, 930], [900, 140], [1000, 950]];
    const kinds = ['radar', 'big', 'med', 'radar', 'gun', 'med', 'awacs', 'big'] as const;
    const k0 = A.eo(t, 292.7, 293.4);
    nodes.forEach((n, i) => {
      const d = Math.hypot(n[0] - nodes[2]![0], n[1] - nodes[2]![1]);
      const inf = A.sm(t, 293.4 + d / 1500 * 3.2, 293.9 + d / 1500 * 3.2);
      ndlink(c, n, HUB, t, k0, inf > 0.5 ? P.enemy : P.amber, 4);
      const kind = kinds[i]!;
      c.save();
      if (kind === 'radar') D.radarTop(c, n[0], n[1], 1.9, { ph: t * 2 + i });
      if (kind === 'big') D.launcherTop(c, n[0], n[1], 0.4, 1.9, { big: true });
      if (kind === 'med') D.launcherTop(c, n[0], n[1], -0.8 + i, 1.9);
      if (kind === 'gun') D.gunTop(c, n[0], n[1], 0.5, 1.7);
      if (kind === 'awacs') D.planeTop(c, n[0], n[1], 0.2, 1.7, { kind: 'awacs', side: 'def' });
      c.restore();
      if (inf > 0) circle(c, n[0], n[1], 66, null, P.enemy, 7 * inf);
    });
    // lan toả từ bệ số 2 ở bên trái giữa
    const o = nodes[2]!;
    ring(c, o[0], o[1], 1500 * A.eo(t, 293.3, 296.4), 0, P.enemy, 6);
    withA(c, 1 - A.ph(t, 293.3, 296.4), () => circle(c, o[0], o[1], 1500 * A.eo(t, 293.3, 296.4), null, P.enemy, 6));
    W.hub(c, HUB[0], HUB[1], 1.8, 1, A.sm(t, 294.4, 295.2) > 0.5 ? P.enemy : P.amber);
  }
}
