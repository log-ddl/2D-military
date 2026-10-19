import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { xMark, bar } from './shared/ui';
import { smoke } from './shared/fx';

// Chương 5 (160.65–213): tên lửa vai đảo logic (TRÊN XUỐNG) → ba cách dẫn (NGANG, ba dải).
const SOLD: A.Pt[] = [[820, 330], [1020, 470], [880, 640], [1180, 700], [1300, 380], [700, 520], [1120, 250]];
const CITY: A.Pt = [170, 560];

function pathPt(pts: A.Pt[], p: number): [number, number, number] { return W.along(pts, p); }

// ── dải hướng dẫn (toạ độ cục bộ 1280×360, mặt đất y=300) ───────────
function band(c: CanvasRenderingContext2D, i: 0 | 1 | 2, t: number, a = 1) {
  rrect(c, 0, 0, 1280, 360, 22, '#f2f7fb', P.ink, 4);
  c.save();
  c.beginPath(); c.roundRect(0, 0, 1280, 360, 22); c.clip();
  c.fillStyle = D.GROUND; c.fillRect(0, 300, 1280, 60);
  line(c, [[0, 300], [1280, 300]], P.ink, 4);
  const rdX = 120, lnX = 340, rdTop: A.Pt = [rdX + 8, 300 - 215];
  if (i === 0) {
    const jx = A.lerp(1220, 760, A.ph(t, 189.2, 196.6)), jy = 120;
    const hit = 196.6, l0 = 191.0;
    const alive = t < hit;
    D.radarSide(c, rdX, 300, 0.85, { ph: t * 2.2 });
    D.launcherSide(c, lnX, 300, 0.95, { elev: 0.55, loaded: t > l0 ? 1 : 2 });
    if (alive) {
      D.jetSide(c, jx, jy, 0.78, { dir: -1 });
      line(c, [rdTop, [jx, jy]], P.sky, 5);
      const mk = A.eo(t, l0, l0 + 0.6);
      W.intercept(c, t, [lnX + 110, 215], [A.lerp(1220, 760, A.ph(hit, 189.2, 196.6)), jy], l0, hit, { L: 60, boom: 56, bend: 70 });
      // liên kết lệnh radar → tên lửa
      if (t > l0 + 0.2) {
        const p = A.ph(t, l0, hit), tgt: A.Pt = [A.lerp(1220, 760, A.ph(hit, 189.2, 196.6)), jy];
        const mx = A.lerp(lnX + 110, tgt[0], A.eio(t, l0, hit) * 0.35 + p * 0.65), my = A.lerp(215, tgt[1], A.eio(t, l0, hit) * 0.35 + p * 0.65) - 4 * 70 * p * (1 - p);
        W.link(c, rdTop, [mx, my], P.amber, 5, 1, t);
      }
    } else {
      W.intercept(c, t, [0, 0], [A.lerp(1220, 760, A.ph(hit, 189.2, 196.6)), jy], hit - 1, hit, { boom: 56 });
      const f = A.ph(t, hit, hit + 1.4);
      if (f < 1) { D.jetSide(c, 760 - f * 70, jy + f * f * 300, 0.78, { dir: -1, a: 1 - f, pitch: f }); smoke(c, 760 - f * 70, jy + f * f * 300, f * 1.4, 0.8, 5); }
    }
  } else if (i === 1) {
    const aX = A.lerp(1220, 820, A.ph(t, 198.0, 203.2)), aY = 110;
    const bX = A.lerp(1280, 900, A.ph(t, 200.6, 206.0)), bY = 190;
    D.radarSide(c, rdX, 300, 0.85, { ph: t * 2.2 });
    const turn = A.sm(t, 199.6, 200.4);
    D.launcherSide(c, lnX, 300, 0.95, { elev: 0.55 });
    const aAlive = t < 203.2;
    if (aAlive) {
      D.jetSide(c, aX, aY, 0.78, { dir: -1 });
      withA(c, 1 - turn, () => line(c, [rdTop, [aX, aY]], P.sky, 5));
      const l0 = 198.6;
      const tgt: A.Pt = [A.lerp(1220, 820, A.ph(203.2, 198.0, 203.2)), aY];
      W.intercept(c, t, [lnX + 110, 215], tgt, l0, 203.2, { L: 60, boom: 56, bend: 70 });
      // tên lửa tự dẫn: sóng nhỏ phía trước mũi (sau khi radar rời đi)
      if (t > 199.4 && t < 203.2) {
        const p = A.ph(t, l0, 203.2), q = A.eio(t, l0, 203.2) * 0.35 + p * 0.65;
        const mx = A.lerp(lnX + 110, tgt[0], q), my = A.lerp(215, tgt[1], q) - 4 * 70 * q * (1 - q);
        const ang = Math.atan2(tgt[1] - my, tgt[0] - mx);
        D.waves(c, mx, my, ang - 0.35, ang + 0.35, 90, t, 3, P.sky, 3.5);
      } else if (t > l0 && t < 199.6) {
        const p = A.ph(t, l0, 203.2), q = A.eio(t, l0, 203.2) * 0.35 + p * 0.65;
        const mx = A.lerp(lnX + 110, tgt[0], q), my = A.lerp(215, tgt[1], q) - 4 * 70 * q * (1 - q);
        W.link(c, rdTop, [mx, my], P.amber, 4, 1 - turn, t);
      }
    } else {
      W.intercept(c, t, [0, 0], [A.lerp(1220, 820, A.ph(203.2, 198.0, 203.2)), aY], 202.2, 203.2, { boom: 56 });
      const f = A.ph(t, 203.2, 204.6);
      if (f < 1) { D.jetSide(c, 820 - f * 70, aY + f * f * 300, 0.78, { dir: -1, a: 1 - f, pitch: f }); smoke(c, 820 - f * 70, aY + f * f * 300, f * 1.4, 0.8, 5); }
    }
    // mục tiêu thứ hai: radar quay sang
    if (t > 200.4 && t < 206.2) {
      D.jetSide(c, bX, bY, 0.78, { dir: -1 });
      withA(c, turn, () => line(c, [rdTop, [bX, bY]], P.sky, 5));
    }
  } else {
    const jx = A.lerp(1230, 820, A.ph(t, 204.3, 206.9)), jy = 130;
    const l0 = 204.8, hit = 206.9;
    D.launcherSide(c, lnX, 300, 0.95, { elev: 0.6 });
    D.radarSide(c, rdX, 300, 0.85, { a: 0.28 });
    xMark(c, rdX, 200, 46, A.eo(t, 204.6, 205.4), P.enemy, 9);
    const tgt: A.Pt = [A.lerp(1230, 820, A.ph(hit, 204.3, 206.9)), jy];
    if (t < hit) {
      // bóng nhiệt sau động cơ
      const g = c.createRadialGradient(jx + 70, jy, 0, jx + 70, jy, 90);
      g.addColorStop(0, 'rgba(249,115,22,0.7)'); g.addColorStop(1, 'rgba(249,115,22,0)');
      c.fillStyle = g; c.beginPath(); c.arc(jx + 70, jy, 90, 0, Math.PI * 2); c.fill();
      D.jetSide(c, jx, jy, 0.78, { dir: -1, flame: true });
      for (let k = 0; k < 3; k++) {
        const o = ((t * 1.4 + k / 3) % 1);
        withA(c, 1 - o, () => line(c, [[jx + 110 + o * 60, jy - 22 + k * 22], [jx + 140 + o * 60, jy - 22 + k * 22]], '#f59e0b', 4));
      }
      W.intercept(c, t, [lnX + 110, 215], tgt, l0, hit, { L: 60, boom: 56, bend: 90 });
    } else {
      W.intercept(c, t, [0, 0], tgt, hit - 1, hit, { boom: 56 });
      const f = A.ph(t, hit, hit + 1.4);
      if (f < 1) { D.jetSide(c, tgt[0] - f * 70, jy + f * f * 300, 0.78, { dir: -1, a: 1 - f, pitch: f }); smoke(c, tgt[0] - f * 70, jy + f * f * 300, f * 1.4, 0.8, 5); }
    }
  }
  c.restore();
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 186.95) { this.map(c, t); return; }
    // ── dải hướng dẫn ──
    c.fillStyle = '#f4f8fb'; c.fillRect(0, 0, 1920, 1080);
    const sp = A.sm(t, 197.0, 198.6);       // dải 1 thu lên
    const s0 = A.lerp(1.5, 1.0, sp);
    const x0 = 0, y0 = A.lerp(270, 30, sp);
    const a1 = A.eo(t, 186.95, 187.6);
    withA(c, a1, () => { c.save(); c.translate(x0, y0); c.scale(s0, s0); band(c, 0, t); c.restore(); });
    const b2 = A.eo(t, 197.8, 198.6);
    if (b2 > 0) withA(c, b2, () => { c.save(); c.translate(0, 370 + (1 - b2) * 80); band(c, 1, t); c.restore(); });
    const b3 = A.eo(t, 204.0, 204.8);
    if (b3 > 0) withA(c, b3, () => { c.save(); c.translate(0, 710 + (1 - b3) * 80); band(c, 2, t); c.restore(); });
    // cột đếm số mục tiêu + chi phí (207–212.5)
    const q = A.eo(t, 207.0, 208.0);
    if (q > 0) withA(c, q, () => {
      const col = [P.sky, P.amber];
      for (let r = 0; r < 2; r++) {
        const y = 30 + r * 340;
        rrect(c, 1330, y, 540, 300, 22, '#fff', P.ink, 4);
        // số mục tiêu cùng lúc
        const n = r === 0 ? 1 : 3;
        for (let k = 0; k < n; k++) D.jetSide(c, 1440 + k * 130, y + 90, 0.5, { dir: -1 });
        // chi phí
        bar(c, 1380, y + 190, 440, 44, r === 0 ? 0.35 * A.eo(t, 208.6, 210.0) : 0.92 * A.eo(t, 210.0, 211.6), P.amber);
      }
    });
    // chữ số 1 / 3 không cần: biểu tượng đủ
  }

  private map(c: CanvasRenderingContext2D, t: number) {
    const zz = A.lerp(1.55, 1, A.sm(t, 173.4, 176.0));
    const cam: K.Cam = { x: A.lerp(960, 960, 0), y: A.lerp(535, 540, A.sm(t, 173.4, 176)), z: zz };
    K.begin(c, cam);
    W.topBg(c, cam);
    // thành phố (hình khối từ trên)
    const showCity = t > 174.4;
    if (showCity) withA(c, A.sm(t, 174.4, 175.4), () => {
      for (let i = 0; i < 6; i++) rrect(c, CITY[0] - 70 + (i % 3) * 60, CITY[1] - 60 + Math.floor(i / 3) * 70, 48, 54, 6, '#f1e6c8', P.ink, 3.5);
    });

    // ── 160.7–174.5: một người, một ống ─────────────────────────────
    if (t < 174.6) {
      const f = 1 - A.sm(t, 173.4, 174.6);
      withA(c, f, () => {
        // hào + người
        rrect(c, 790, 480, 340, 110, 34, '#6b5d3e', P.ink, 4);
        rrect(c, 806, 494, 308, 82, 26, '#8d7c55', null, 0);
        D.soldierTop(c, 960, 535, -0.5, 2.6);
      });
      // so sánh giá: máy bay vs ống
      const bc = A.eo(t, 164.0, 165.2) * (1 - A.sm(t, 167.0, 167.8));
      if (bc > 0) withA(c, bc, () => {
        rrect(c, 470, 240, 980, 600, 28, '#fff', P.ink, 4);
        D.planeTop(c, 700, 520, -Math.PI / 2, 2.2, { side: 'atk' });
        D.soldierTop(c, 1220, 560, -Math.PI / 2, 3.0);
        // thanh giá
        const h1 = 400, h2 = 40;
        rrect(c, 820, 800 - h1 * A.eo(t, 164.4, 165.8), 110, h1 * A.eo(t, 164.4, 165.8), 10, P.amber, P.ink, 4);
        rrect(c, 1010, 800 - h2 * A.eo(t, 164.9, 165.8), 110, h2 * A.eo(t, 164.9, 165.8), 10, P.amber, P.ink, 4);
      });
      // không cần radar: radar bị gạch
      const nr = A.eo(t, 167.8, 168.8) * (1 - A.sm(t, 169.5, 170.2));
      if (nr > 0) withA(c, nr, () => {
        D.radarTop(c, 700, 520, 2.6, { ph: 0.6 });
        xMark(c, 700, 520, 100, A.eo(t, 168.4, 169.0), P.enemy, 14);
      });
      // tầm vài km + tìm nhiệt
      const rg = A.eo(t, 169.7, 171.0);
      if (rg > 0) {
        W.rangeRing(c, 960, 535, 220, P.olive, rg, { fill: 0.1 });
        const jx = A.lerp(1900, 560, A.ph(t, 170.0, 174.0)), jy = 330 + 40 * Math.sin(t);
        const hitT = 172.8;
        if (t < hitT) {
          const g = c.createRadialGradient(jx + 80, jy, 0, jx + 80, jy, 120);
          g.addColorStop(0, 'rgba(249,115,22,0.75)'); g.addColorStop(1, 'rgba(249,115,22,0)');
          c.fillStyle = g; c.beginPath(); c.arc(jx + 80, jy, 120, 0, Math.PI * 2); c.fill();
          D.planeTop(c, jx, jy, Math.PI, 2.3, { side: 'atk' });
        } else {
          const f = A.ph(t, hitT, hitT + 1.1);
          if (f < 1) D.bang(c, jx, jy, 120, f);
        }
        if (t > 171.9) W.intercept(c, t, [1040, 505], [jx, jy], 171.9, hitT, { L: 90, boom: 0, bend: -80 });
      }
    }

    // ── 174.6–186.9: cả không quân đổi tuyến ──────────────────────────
    if (t > 174.4) {
      const a = A.sm(t, 174.4, 175.6);
      SOLD.forEach((s, i) => {
        const e = A.eo(t, 174.6 + i * 0.12, 175.4 + i * 0.12);
        if (e <= 0) return;
        W.rangeRing(c, s[0], s[1], 130 * e, P.olive, 1, { fill: 0.12, lw: 4 });
        D.soldierTop(c, s[0], s[1], -0.6 + i, 1.6, { a: e });
      });
      const straight: A.Pt[] = [[2000, 560], CITY];
      const detA: A.Pt[] = [[2000, 560], [1560, 210], [900, 70], [380, 300], CITY];
      const detB: A.Pt[] = [[2000, 560], [1560, 900], [900, 1010], [380, 820], CITY];
      // tuyến thẳng: đứt xám, rồi bị gạch
      const sA = A.sm(t, 176.0, 177.0);
      withA(c, sA * (0.9 - 0.55 * A.sm(t, 180.2, 181.4)), () => line(c, straight, P.slate, 6, [22, 16]));
      const xx = A.eo(t, 180.2, 181.4);
      if (xx > 0) xMark(c, 1000, 560, 70, xx, P.enemy, 14);
      // đường vòng
      const rA = A.eo(t, 180.8, 183.6);
      withA(c, A.sm(t, 180.6, 181.6), () => {
        W.link(c, [0, 0], [0, 0], P.enemy, 1, 0, 0);
        const seg = (pts: A.Pt[], p: number) => { const n = 60; const q: A.Pt[] = []; for (let i = 0; i <= n; i++) { const r = W.along(pts, (i / n) * p); q.push([r[0], r[1]]); } line(c, q, P.enemy, 7); };
        seg(detA, rA); seg(detB, rA);
      });
      // máy bay: đầu đi thẳng rồi quay vòng ở 177.4–180.4
      const planes = [
        { path: detA, off: 0 }, { path: detB, off: 0.12 }, { path: detA, off: 0.26 }, { path: detB, off: 0.38 },
      ];
      planes.forEach((pl, i) => {
        const t0 = 177.0 + pl.off * 5.0, p0 = A.ph(t, t0, t0 + 9);
        if (t < 177.0) return;
        // đầu đi thẳng đến mép vòng, sau đó bẻ theo đường vòng
        const [x, y, ang] = W.along(pl.path, A.eio(t, t0, t0 + 9));
        D.planeTop(c, x, y, ang + Math.PI, 1.6, { side: 'atk', kind: i % 2 ? 'heli' : 'jet' });
      });
    }
    K.end(c);
  }
}
