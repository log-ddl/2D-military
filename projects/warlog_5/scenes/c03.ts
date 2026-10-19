// Chương 3 (116.7 – 165.4): lựu pháo = chọn cung bắn; tốc độ bắn bị nòng nóng chặn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as X from './_art';

export const FIRES = [120.1, 130.6, 133.7, 145.6, 146.3, 147.0, 147.7, 148.4, 149.1];
const KM = 48;
const cam: K.Cam = { x: 900, y: -320, z: 0.72 };

export default class S03 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 142.8) this.arcs(c, t);
    else if (t < 151.6) this.burst(c, t);
    else if (t < 156.4) this.chart(c, t);
    else if (t < 159.45) this.loader(c, t);
    else this.timeline(c, t);
    for (const at of [142.8, 151.6, 156.4, 159.45]) X.dip(c, t, at, 0.1);
  }

  private arcs(c: CanvasRenderingContext2D, t: number) {
    K.begin(c, cam);
    X.sideGround(c, cam);
    // đồi mọc lên từ 129.9
    const rg = A.eio(t, 129.4, 130.1);
    if (rg > 0) X.ridge(c, 880, 520, 300 * rg);
    // góc nòng theo thời gian
    const el = A.keys(t, [
      [116.7, 0.12], [118.2, 1.1], [119.7, 0.12], [124.2, 0.12], [125.0, 0.25], [125.8, 0.6], [126.6, 0.9], [127.4, 1.2], [128.0, 1.0],
      [130.0, 1.1], [130.4, 1.1], [133.2, 1.1], [133.55, 0.75], [135.5, 0.75], [136.0, 0.4], [140, 0.4],
    ]);
    // bóng các góc đã đi qua (127–128)
    if (t > 124.6 && t < 128.6) for (const e of [0.25, 0.6, 0.9, 1.2]) {
      const a = A.sm(t, 124.6 + (e - 0.25) * 3.0, 125 + (e - 0.25) * 3.0) * (1 - A.sm(t, 127.9, 128.6));
      if (a > 0.02) X.spGun(c, { x: 0, elev: e, alpha: 0.22 * a });
    }
    const rec = [120.1, 130.6, 133.7].reduce((m, tf) => Math.max(m, A.bump(t, tf, 0.9)), 0) * 0.85;
    const m = X.spGun(c, { x: 0, elev: el, recoil: rec });
    const from: A.Pt = [m.x, m.y];
    const land = (km: number): A.Pt => [km * KM, -6];
    // phát 1: cung phẳng bay xa
    const f1 = land(42);
    const h1 = X.arcH(X.spMuzzleP(0.12), f1, 0.12);
    if (t >= 120.1 && t < 124.6) {
      X.flight(c, X.spMuzzleP(0.12), f1, h1, A.ph(t, 120.15, 122.8), { s: 1.0, w: A.px(c, 5) });
      F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, 120.1, 120.4), 1.5);
      if (t > 122.8) F.dust(c, f1[0], 0, A.ph(t, 122.8, 123.6), 1.6);
    }
    // túi thuốc đẩy: bỏ bớt / thêm vào
    if (t > 127.8 && t < 130.2) {
      const base = (i: number) => [-300 - (i % 2) * 90, -30 - Math.floor(i / 2) * 36] as A.Pt;
      for (let i = 0; i < 4; i++) {
        const [bx, by] = base(i);
        const away = i >= 2 ? A.sm(t, 128.2, 128.7) * (1 - A.sm(t, 129.0, 129.5)) : 0;
        X.bag(c, bx, by - away * 130, 1.4, 1 - away * 0.3);
      }
    }
    // phát 2: góc cao, thuốc ít → sau đồi
    const e2 = 1.1, a2 = X.spMuzzleP(e2), L2 = land(27);
    if (t >= 130.6 && t < 135.0) {
      X.flight(c, a2, L2, X.arcH(a2, L2, e2), A.ph(t, 130.65, 133.2), { s: 1.0, w: A.px(c, 5) });
      F.muzzleFlash(c, a2[0], a2[1], -e2, A.ph(t, 130.6, 130.85), 0.9);
      if (t > 133.2) F.explosion(c, L2[0], -20, 70, A.ph(t, 133.2, 133.9), 4);
    }
    // phát 3: thuốc nhiều → xa
    const e3 = 0.75, a3 = X.spMuzzleP(e3), L3 = land(44);
    if (t >= 133.7 && t < 136.0) {
      X.flight(c, a3, L3, X.arcH(a3, L3, e3), A.ph(t, 133.75, 135.7), { s: 1.0, w: A.px(c, 5) });
      F.muzzleFlash(c, a3[0], a3[1], -e3, A.ph(t, 133.7, 134.0), 1.7);
      if (t > 135.7) F.explosion(c, L3[0], -20, 110, A.ph(t, 135.7, 136.4), 4);
    }
    // họ cung: nhiều lựa chọn
    if (t >= 136.1) {
      const set: [number, number, number][] = [[1.25, 14, 136.1], [1.0, 24, 136.7], [0.8, 32, 137.3], [0.55, 40, 137.9], [0.25, 46, 138.5]];
      for (const [e, km, t0] of set) {
        const a = X.spMuzzleP(e), b = land(km);
        const p = A.sm(t, t0, t0 + 0.7);
        if (p > 0) A.line(c, X.arcPts(a, b, X.arcH(a, b, e), p, 40), P.amber, A.px(c, 5), [16, 12]);
        if (p >= 1) A.circle(c, b[0], -4, A.px(c, 9), P.amber, P.ink, A.px(c, 2));
      }
    }
    K.end(c);
    // đồi: tiêu điểm "sau đồi"
    void U;
  }

  private burst(c: CanvasRenderingContext2D, t: number) {
    const cm: K.Cam = { x: 420, y: -230, z: 1.0 };
    K.begin(c, cm);
    X.sideGround(c, cm);
    const el = 0.7;
    const rc = FIRES.slice(3).reduce((m, tf) => Math.max(m, A.bump(t, tf, 0.5)), 0) * 0.8;
    const hot = A.sm(t, 145.6, 151.4);
    const m = X.spGun(c, { x: 0, elev: el, recoil: rc });
    // nòng nóng dần: phủ màu lên nòng
    if (hot > 0.01) {
      c.save(); c.globalAlpha = 0.85 * hot;
      const px = 62, py = -140, ex = 62 + Math.cos(el) * (340 - rc * 34 + 6) , ey = -140 - Math.sin(el) * (340 - rc * 34 + 6);
      A.capsule(c, [px, py], [ex, ey], 13, A.lerpColor('#f59e0b', '#dc2626', hot), null, 0);
      c.restore();
    }
    for (let i = 3; i < FIRES.length; i++) {
      const tf = FIRES[i]!;
      if (t >= tf) {
        F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, tf, tf + 0.25), 1.2);
        if (t < tf + 1.2) F.smoke(c, m.x, m.y, t - tf, 0.8, 3, '#6b7280', 40);
      }
    }
    K.end(c);
    // đếm đạn trong phút đầu
    const n = FIRES.slice(3).filter((tf) => t >= tf).length;
    for (let i = 0; i < 6; i++) {
      const a = A.back(t, FIRES[3 + i]!, FIRES[3 + i]! + 0.3);
      if (i < n) X.shell(c, 1430 + (i % 3) * 120, 220 + Math.floor(i / 3) * 110, -Math.PI / 2, 1.2 * Math.min(1, a));
    }
    // nhiệt kế
    if (t > 149.7) {
      const a = A.sm(t, 149.7, 150.2);
      A.withA(c, a, () => {
        A.rrect(c, 1700, 520, 54, 360, 27, '#ffffff', P.ink, 5);
        const h = 300 * hot;
        A.rrect(c, 1710, 870 - h - 14, 34, Math.max(20, h + 14), 17, A.lerpColor('#f59e0b', '#dc2626', hot), null, 0);
        A.circle(c, 1727, 888, 46, A.lerpColor('#f59e0b', '#dc2626', hot), P.ink, 5);
      });
    }
  }

  // 151.6–156.4: tốc độ duy trì trong một giờ chỉ là phần nhỏ của loạt đầu
  private chart(c: CanvasRenderingContext2D, t: number) {
    const x0 = 300, y0 = 880, w = 1320, h = 640;
    A.line(c, [[x0, y0 - h], [x0, y0], [x0 + w, y0]], P.ink, 7);
    const p = A.sm(t, 152.0, 155.0);
    // đường tốc độ: cao rồi tụt rồi đi ngang
    const pts: A.Pt[] = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60 * p;
      const v = 0.14 + 0.86 * Math.exp(-u * 9);
      pts.push([x0 + u * w, y0 - v * h]);
    }
    if (p > 0.01) A.line(c, pts, P.enemy, 12);
    const ba = A.sm(t, 154.0, 155.2);
    if (ba > 0) {
      const sx = x0 + w * 0.0, sy = y0 - h;
      // so cột: loạt đầu vs duy trì
      A.rrect(c, 1380, y0 - h * ba, 80, h * ba, 8, P.amber, P.ink, 5);
      A.rrect(c, 1500, y0 - h * 0.14 * ba, 80, h * 0.14 * ba, 8, P.olive, P.ink, 5);
      void sx; void sy;
    }
  }

  // 156.4–159.45: nạp tự động giúp người, không giúp thép
  private loader(c: CanvasRenderingContext2D, t: number) {
    const cm: K.Cam = { x: 380, y: -190, z: 1.0 };
    K.begin(c, cm);
    X.sideGround(c, cm);
    const el = 0.35;
    X.spGun(c, { x: 0, elev: el });
    // nòng đỏ rực
    const ex = 62 + Math.cos(el) * 336, ey = -140 - Math.sin(el) * 336;
    A.capsule(c, [62, -140], [ex, ey], 13, '#dc2626', null, 0);
    // cánh tay nạp tự động ở sau tháp: đẩy đạn vào
    const q = A.ph((t - 156.4) % 1.2, 0, 1.2);
    const push = Math.sin(q * Math.PI);
    A.rrect(c, -170, -150, 70, 22, 6, P.slate, P.ink, 3);
    X.shell(c, -240 + 120 * push, -140, -el, 0.8);
    X.soldier(c, -330, 0, 1.0, 1, 'ally');
    K.end(c);
    // dấu "nhẹ cho người" / "thép vẫn nóng"
    const a = A.sm(t, 157.4, 158.0);
    if (a > 0) {
      U.circleMark(c, 380, 560, 70, a, P.olive, 8);
      A.withA(c, a, () => A.line(c, [[338, 560], [366, 590], [424, 520]], P.olive, 10));
      U.circleMark(c, 1250, 360, 80, A.sm(t, 158.2, 158.9), P.enemy, 8);
    }
  }

  // 159.45–165.4: phút đầu dữ dội, buổi chiều chậm
  private timeline(c: CanvasRenderingContext2D, t: number) {
    const x0 = 200, x1 = 1720, y = 560;
    A.line(c, [[x0, y], [x1, y]], P.ink, 8);
    const p = A.sm(t, 159.6, 164.0);
    // dải đầu rất đặc, sau thưa
    const n = 70;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const pos = u < 0.5 ? (u / 0.5) * 0.08 : 0.08 + ((u - 0.5) / 0.5) * 0.92;
      if (pos > p) continue;
      const px = x0 + pos * (x1 - x0);
      const hh = 120 - (pos > 0.08 ? 70 : 0);
      A.line(c, [[px, y], [px, y - hh]], pos < 0.08 ? P.enemy : P.olive, 9);
    }
    // đánh dấu phút đầu
    const a = A.sm(t, 159.6, 160.3);
    if (a > 0) A.rrect(c, x0 - 16, y - 120, (x1 - x0) * 0.08 + 32, 150, 12, 'rgba(180,73,60,0.15)', P.enemy, 5);
    // đồng hồ + mặt trời chiều
    X.stopwatch(c, 960, 260, 110, A.ph(t, 160.5, 164.6) * 0.9, P.olive);
    // mặt trời
    const sx = A.lerp(1300, 1720, A.ph(t, 160.8, 164.6));
    A.circle(c, sx, 240 - 80 * Math.sin(A.ph(t, 160.8, 164.6) * Math.PI), 40, '#fbbf24', P.ink, 5);
  }
}
