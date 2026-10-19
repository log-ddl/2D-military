// Chương 6 (253.8 – 281.8): phần vô hình — quan sát → tính → bắn → chỉnh. Bản đồ nhìn từ trên.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as M from './shared/map';
import { P } from './shared/palette';
import * as X from './_art';

export const T6 = { f1: 271.5, l1: 272.6, f2: 274.2, l2: 275.3 };
const CAM: K.Cam = { x: 1500, y: 400, z: 0.58 };
const GUN: A.Pt = [330, 250], FDC: A.Pt = [760, 420], OBS: A.Pt = [2250, 420], DRONE: A.Pt = [2450, 200], RAD: A.Pt = [1900, 700], TGT: A.Pt = [2750, 380];

const pulse = (c: CanvasRenderingContext2D, a: A.Pt, b: A.Pt, t: number, t0: number, t1: number, col = P.sky) => {
  const p = A.ph(t, t0, t1);
  if (p <= 0) return;
  A.line(c, [a, b], col, A.px(c, 4), [14, 12]);
  if (p < 1) for (let i = 0; i < 3; i++) { const q = A.clamp01(p - i * 0.08); A.circle(c, A.lerp(a[0], b[0], q), A.lerp(a[1], b[1], q), 11 - i * 2, col, P.ink, 2); }
};

export default class S06 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    K.begin(c, CAM);
    M.mapBg(c, CAM, { color: '#ece6cf' });
    M.forest(c, 560, 600, 120, 3); M.forest(c, 1100, 250, 90, 11); M.forest(c, 1250, 640, 110, 4); M.forest(c, 2050, 650, 100, 2); M.forest(c, 2500, 640, 90, 7);
    M.town(c, TGT[0], TGT[1], 120, 4);
    const tgtHit = t >= T6.l2;
    M.unit(c, TGT[0], TGT[1], 'inf', 'foe', 90, { dead: tgtHit ? A.sm(t, T6.l2, T6.l2 + 0.6) : 0 });
    X.top(c, 'sp', GUN[0], GUN[1], 0, 2.0, 'ally');
    X.top(c, 'fdc', FDC[0], FDC[1], 0, 2.0, 'ally');
    // quan sát: người, drone, radar
    const o = A.back(t, 254.3, 254.8), d = A.back(t, 255.2, 255.7), r = A.back(t, 256.0, 256.5);
    if (o > 0) { A.circle(c, OBS[0], OBS[1], 34 * Math.min(1, o), P.sky, P.ink, 4); M.fan(c, OBS[0], OBS[1], 560, -0.22, 0.22, A.sm(t, 254.6, 255.4), P.sky); }
    if (d > 0) { c.save(); c.translate(DRONE[0], DRONE[1]); c.scale(1.7 * Math.min(1, d), 1.7 * Math.min(1, d)); X.drone(c, 0, 0, 1, t, 0); c.restore(); }
    if (r > 0) X.top(c, 'radar', RAD[0], RAD[1], 0, 1.6 * Math.min(1, r), 'ally');
    // dò thấy mục tiêu: vòng
    U.ring(c, TGT[0], TGT[1], 170, (t * 1.2) % 1, P.sky, A.px(c, 4));
    if (t > 254.8 && t < 258.5) U.crosshair(c, TGT[0], TGT[1], 80, P.sky, A.sm(t, 254.8, 255.6) * (1 - A.sm(t, 257.5, 258.5)), t);
    // tọa độ về trung tâm hỏa lực
    pulse(c, OBS, FDC, t, 257.3, 259.2);
    pulse(c, DRONE, FDC, t, 257.5, 259.5);
    pulse(c, RAD, FDC, t, 257.7, 259.6);
    // góc/thuốc/hướng → pháo
    const k = A.sm(t, 260.7, 261.5);
    if (k > 0 && t < 264.0) A.withA(c, k * (1 - A.sm(t, 263.4, 264.0)), () => {
      const bx = FDC[0], by = FDC[1] - 230;
      // góc
      c.save(); c.translate(bx - 160, by); c.beginPath(); c.moveTo(-40, 30); c.lineTo(60, 30); c.arc(-40, 30, 100, 0, -0.9, true); c.closePath(); A.fs(c, '#fff', P.ink, A.px(c, 4)); c.restore();
      // thuốc
      X.bag(c, bx, by, 1.5);
      // hướng
      U.arrow(c, [bx + 110, by + 30], [bx + 230, by - 30], { color: P.ink, w: 10, head: 36 });
    });
    pulse(c, FDC, GUN, t, 262.6, 264.0);
    // các biến: gió, nhiệt, mòn nòng, thuốc ấm
    const ring = [264.3, 265.4, 266.5, 268.0];
    const spots: A.Pt[] = [[FDC[0] - 260, FDC[1] - 190], [FDC[0] + 260, FDC[1] - 190], [FDC[0] - 260, FDC[1] + 240], [FDC[0] + 260, FDC[1] + 240]];
    const vis = A.win(t, 264.2, 271.0, 0.3, 0.5);
    if (vis > 0) {
      spots.forEach((p, i) => {
        const a = A.back(t, ring[i]!, ring[i]! + 0.45);
        if (a <= 0) return;
        A.withA(c, vis, () => {
          c.save(); c.translate(p[0], p[1]); c.scale(Math.min(1, a) * 1.5, Math.min(1, a) * 1.5);
          A.circle(c, 0, 0, 52, '#fff', P.ink, 4);
          if (i === 0) { for (let k2 = 0; k2 < 3; k2++) { c.beginPath(); c.moveTo(-30, -14 + k2 * 14); c.quadraticCurveTo(0, -24 + k2 * 14 + Math.sin(t * 4 + k2) * 4, 30, -14 + k2 * 14); A.fs(c, null, P.sky, 5); } }
          if (i === 1) { A.rrect(c, -8, -34, 16, 52, 8, '#fff', P.ink, 3); A.circle(c, 0, 24, 14, P.enemy, P.ink, 3); A.line(c, [[0, 24], [0, -18]], P.enemy, 6); }
          if (i === 2) X.barrelLife(c, 0, 0, 0.5, 0.45);
          if (i === 3) { X.bag(c, 0, 4, 0.7); A.circle(c, 22, -22, 11, P.enemy, P.ink, 3); }
          c.restore();
        });
        A.line(c, [FDC, p], 'rgba(30,41,59,0.4)', A.px(c, 3), [8, 8]);
      });
    }
    // phát 1: hụt; chỉnh; phát 2: trúng
    const sh = (tf: number, tl: number, to: A.Pt) => {
      const p = A.ph(t, tf, tl);
      if (p <= 0) return;
      A.line(c, [GUN, [A.lerp(GUN[0], to[0], p), A.lerp(GUN[1], to[1], p)]], P.amber, A.px(c, 5), [14, 10]);
      if (p < 1) A.circle(c, A.lerp(GUN[0], to[0], p), A.lerp(GUN[1], to[1], p), 10, P.amber, P.ink, 2);
    };
    const miss: A.Pt = [TGT[0] - 330, TGT[1] + 170];
    sh(T6.f1, T6.l1 + 0.6, miss);
    if (t >= T6.f1) F.muzzleFlash(c, GUN[0] + 100, GUN[1], 0, A.ph(t, T6.f1, T6.f1 + 0.25), 1.0);
    if (t >= T6.l1 + 0.6) { F.explosion(c, miss[0], miss[1], 70, A.ph(t, T6.l1 + 0.6, T6.l1 + 1.3), 3); }
    // chỉnh: quan sát viên báo "lệch bao nhiêu"
    const cr = A.sm(t, 273.0, 273.4) ;
    if (cr > 0 && t < 274.4) {
      U.arrow(c, [miss[0] + 30, miss[1] - 10], [TGT[0] - 90, TGT[1] + 10], { p: cr, color: P.sky, w: 8, head: 30 });
      pulse(c, OBS, FDC, t, 273.2, 274.0);
    }
    sh(T6.f2, T6.l2, TGT);
    if (t >= T6.f2) F.muzzleFlash(c, GUN[0] + 100, GUN[1], 0, A.ph(t, T6.f2, T6.f2 + 0.25), 1.0);
    if (t >= T6.l2) { F.explosion(c, TGT[0], TGT[1], 120, A.ph(t, T6.l2, T6.l2 + 0.8), 4); }
    K.end(c);
    // vòng lặp 4 mắt xích
    const lp = A.sm(t, 275.7, 276.3);
    if (lp > 0) {
      A.withA(c, lp, () => {
        A.circle(c, 960, 540, 330, 'rgba(255,255,255,0.92)', P.ink, 6);
        const cx = 960, cy = 540, R = 230;
        const nodes = [276.2, 277.4, 278.6, 279.8];
        for (let i = 0; i < 4; i++) {
          const an = -Math.PI / 2 + i * Math.PI / 2;
          const x = cx + Math.cos(an) * R, y = cy + Math.sin(an) * R;
          const lit = t >= nodes[i]!;
          const nx = cx + Math.cos(an + Math.PI / 2) * R, ny = cy + Math.sin(an + Math.PI / 2) * R;
          U.arrow(c, [x + (nx - x) * 0.3, y + (ny - y) * 0.3], [x + (nx - x) * 0.7, y + (ny - y) * 0.7], { color: lit ? P.amber : P.ink2, w: 7, head: 26 });
          c.save(); c.translate(x, y);
          A.circle(c, 0, 0, 62, lit ? '#fff7e0' : '#fff', lit ? P.amber : P.ink2, 6);
          if (i === 0) X.eye(c, 0, 0, 34, 0);
          if (i === 1) { A.rrect(c, -26, -30, 52, 60, 6, P.dark, P.ink, 3); for (let g = 0; g < 3; g++) A.rrect(c, -18 + g * 14, -8, 10, 10, 2, P.light, null, 0); A.rrect(c, -18, -24, 36, 10, 2, P.sky, null, 0); }
          if (i === 2) X.top(c, 'sp', -4, 0, 0, 0.55, 'ally');
          if (i === 3) { U.arrow(c, [-24, 20], [24, -16], { color: P.sky, w: 9, head: 24 }); }
          c.restore();
        }
        // xung chạy vòng, nhanh dần
        if (t > 280.0) {
          const sp = 0.5 + (t - 280.0) * 0.5;
          const an = -Math.PI / 2 + (t - 280) * sp * Math.PI * 2;
          A.circle(c, cx + Math.cos(an) * R * 1.0, cy + Math.sin(an) * R, 18, P.amber, P.ink, 3);
        }
        if (t > 280.2) X.stopwatch(c, cx, cy, 70, ((t - 280.2) * 0.9) % 1, P.amber);
      });
    }
    X.dip(c, t, 275.7, 0.08);
  }
}
