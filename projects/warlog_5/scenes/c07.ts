// Chương 7 (281.8 – 308.1): bắn đồng loạt — góc cao bắn trước, góc thấp bắn sau, cùng chạm đất một lúc.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as X from './_art';

const TX = 1900;
const LAND = 298.2;
// [góc nòng, thời gian bay, độ cao đỉnh phụ, mốc bắn]
export const SH: { el: number; dur: number; fire: number }[] = [
  { el: 1.08, dur: 7.0, fire: LAND - 7.0 }, { el: 1.0, dur: 5.6, fire: LAND - 5.6 }, { el: 0.7, dur: 4.2, fire: LAND - 4.2 }, { el: 0.4, dur: 3.0, fire: LAND - 3.0 },
];
export const T7 = { quad: 300.4, boomEq: 306.5 };
const CAM: K.Cam = { x: 950, y: -430, z: 0.62 };
const COL = ['#b4493c', P.amber, P.sky, P.olive];

export default class S07 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 299.3) this.one(c, t);
    else if (t < 301.25) this.four(c, t);
    else this.equal(c, t);
    X.dip(c, t, 299.3, 0.1); X.dip(c, t, 301.25, 0.1);
  }

  private one(c: CanvasRenderingContext2D, t: number) {
    K.begin(c, CAM);
    X.sideGround(c, CAM);
    X.trench(c, TX + 30, 1.0, 3);
    // góc nòng theo mốc bắn
    const ks: A.Pt[] = [[281.8, 0.5]];
    for (const s of SH) { ks.push([s.fire - 0.6, ks[ks.length - 1]![1]], [s.fire - 0.1, s.el]); }
    ks.push([LAND + 1, SH[3]!.el], [299.3, 0.5]);
    ks.sort((a, b) => a[0] - b[0]);
    const el = A.keys(t, ks);
    const rec = SH.reduce((m, s) => Math.max(m, A.bump(t, s.fire, 0.8)), 0) * 0.85;
    const m = X.spGun(c, { x: 0, elev: el, recoil: rec });
    // cung dự kiến (nét đứt mờ) hiện ở 285–289
    const land: A.Pt = [TX, -8];
    SH.forEach((s, i) => {
      const a = X.spMuzzleP(s.el);
      const h = X.arcH(a, land, s.el);
      const pre = A.sm(t, 285.0 + i * 0.7, 285.7 + i * 0.7);
      if (pre > 0 && t < SH[0]!.fire) A.line(c, X.arcPts(a, land, h, pre, 50), COL[i]!, A.px(c, 4), [14, 10]);
      // phát thật
      const p = A.ph(t, s.fire + 0.05, LAND);
      if (p > 0) { A.line(c, X.arcPts(a, land, h, A.clamp01(p), 50), COL[i]!, A.px(c, 5), [18, 12]); if (p < 1) { const [x, y, an] = X.arcAt(a, land, h, p); X.shell(c, x, y, an, 0.9); } }
      if (t >= s.fire) { F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, s.fire, s.fire + 0.25), 1.3); }
    });
    if (t >= SH[0]!.fire && t < SH[0]!.fire + 1.0) F.smoke(c, m.x, m.y, t - SH[0]!.fire, 1.0, 4, '#6b7280', 30);
    // vị trí chạm: cùng một điểm
    const mk = A.sm(t, 284.9, 285.4);
    if (mk > 0) U.crosshair(c, TX, -10, 60 * mk, P.enemy, mk * (t < LAND ? 1 : 0), t);
    if (t >= LAND) {
      for (let i = 0; i < 4; i++) F.explosion(c, TX + (i - 1.5) * 38, -30, 120, A.ph(t, LAND + i * 0.04, LAND + 0.8), 4);
      F.debris(c, TX, -30, t - LAND, 1.3, 14, 8, 0);
    }
    K.end(c);
    // thang thời gian: 4 thanh bay, cùng đích
    const bars = A.sm(t, 289.0, 290.0) * (t < 299 ? 1 : 0);
    if (bars > 0) A.withA(c, bars, () => {
      const xEnd = 1700, k = 100, y0 = 840;
      SH.forEach((s, i) => {
        const y = y0 + i * 46;
        A.rrect(c, xEnd - s.dur * k, y - 14, s.dur * k, 28, 14, COL[i]!, P.ink, 4);
      });
      const px = A.lerp(xEnd - 7.0 * k, xEnd, A.ph(t, SH[0]!.fire, LAND));
      if (t >= SH[0]!.fire) A.line(c, [[px, y0 - 34], [px, y0 + 3 * 46 + 30]], P.ink, 6);
      A.line(c, [[xEnd, y0 - 34], [xEnd, y0 + 3 * 46 + 30]], P.enemy, 6, [10, 8]);
    });
  }

  // 299.4–301.2: nhiều pháo cũng làm được
  private four(c: CanvasRenderingContext2D, t: number) {
    K.begin(c, CAM);
    X.sideGround(c, CAM);
    X.trench(c, TX + 30, 1.0, 3);
    const land: A.Pt = [TX, -8];
    for (let i = 0; i < 4; i++) {
      const a = A.back(t, 299.4 + i * 0.12, 299.9 + i * 0.12);
      if (a <= 0) continue;
      const gx = -560 + i * 240;
      const el = SH[i]!.el;
      const rc = A.bump(t, T7.quad, 0.7) * 0.85;
      const g = X.spGun(c, { x: gx, elev: el, s: 0.45 * Math.min(1, a), recoil: rc });
      if (t >= T7.quad) {
        F.muzzleFlash(c, g.x, g.y, g.ang, A.ph(t, T7.quad, T7.quad + 0.25), 0.9);
        const st: A.Pt = [g.x, g.y];
        X.flight(c, st, land, X.arcH(st, land, el), A.ph(t, T7.quad + 0.05, T7.quad + 4), { s: 0.8, w: A.px(c, 4), trail: COL[i]! });
      }
    }
    K.end(c);
  }

  // 301.3–308.1: một khẩu bốn phát = bốn khẩu cùng chỗ
  private equal(c: CanvasRenderingContext2D, t: number) {
    const boom = T7.boomEq;
    const panel = (cx: number, guns: number) => {
      c.save(); c.translate(cx, 0);
      A.rrect(c, -420, 160, 840, 760, 28, 'rgba(255,255,255,0.7)', P.ink, 6);
      A.line(c, [[-380, 760], [380, 760]], P.ink, 5);
      const s = 0.55;
      for (let i = 0; i < guns; i++) {
        const gx = guns === 1 ? -240 : -340 + i * 120;
        const gy = guns === 1 ? 760 : 760 - 0;
        X.spGun(c, { x: gx, y: gy, s: guns === 1 ? 0.7 : 0.4, elev: SH[i % 4]!.el });
        void s;
      }
      // đích
      c.save(); c.translate(240, 760); X.trench(c, 0, 0.8, 3); c.restore();
      const e = A.ph(t, boom, boom + 0.9);
      F.explosion(c, 240, 700, 170, e, 5);
      c.restore();
    };
    panel(480, 1); panel(1440, 4);
    U.arrow(c, [900, 540], [1020, 540], { color: P.ink, w: 14, head: 0 });
    A.line(c, [[900, 510], [1020, 510]], P.ink, 14); A.line(c, [[900, 570], [1020, 570]], P.ink, 14);
    // bốn phát trong dưới một phút
    const sw = A.win(t, 301.4, 305.2, 0.3, 0.4);
    if (sw > 0) A.withA(c, sw, () => {
      X.stopwatch(c, 480, 270, 80, A.ph(t, 301.4, 305.0) * 0.8, P.olive);
      for (let i = 0; i < 4; i++) { const a = A.back(t, 302.0 + i * 0.7, 302.4 + i * 0.7); if (a > 0) X.shell(c, 640 + i * 70, 270, -Math.PI / 2, Math.min(1, a) * 0.8); }
    });
  }
}
