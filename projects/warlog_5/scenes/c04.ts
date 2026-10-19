// Chương 4 (165.4 – 190.6): cối — bỏ tầm để đổi lấy: nhẹ, đi cùng bộ binh, rơi sau đồi.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as X from './_art';

export const T4 = { fire1: 168.9, land1: 172.0, f2a: 177.6, f2b: 178.4, l2a: 179.7, l2b: 180.5, f3: 180.9, l3: 183.2, f4: 184.0, l4: 184.75 };
const ANG = 1.25;

// miệng cối ở (x, 0) với s: dùng lại công thức trong mortar()
function mouth(x: number, s: number, a = ANG): A.Pt { return [x + s * Math.cos(a) * 138, -s * (10 + Math.sin(a) * 138)]; }

export default class S04 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 172.65) this.steep(c, t);
    else if (t < 180.5) this.carry(c, t);
    else if (t < 185.6) this.behind(c, t);
    else this.trade(c, t);
    for (const at of [172.65, 180.5, 185.6]) X.dip(c, t, at, 0.1);
  }

  private steep(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 300, y: -300, z: 0.85 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const ghost = 1 - A.sm(t, 166.4, 167.4);
    if (ghost > 0.02) X.spGun(c, { x: -520, elev: 0.5, alpha: 0.3 * ghost });
    const s = 1.5;
    const rc = A.bump(t, T4.fire1, 0.4) * 0.8;
    const m = X.mortar(c, { x: 0, s, ang: ANG, recoil: rc });
    const mo = mouth(0, s);
    // bỏ đạn vào ống
    const dp = A.ph(t, 168.2, 168.85);
    if (t > 167.8 && t < 168.88) {
      const ax = Math.cos(ANG), ay = -Math.sin(ANG);
      const d0 = 190, d1 = 40;
      const d = A.lerp(d0, d1, A.ei(t, 168.2, 168.85));
      X.shell(c, mo[0] + ax * d - ax * 0, mo[1] + ay * d, Math.atan2(ay, ax) + Math.PI, 0.8);
      void dp;
    }
    if (t >= T4.fire1) {
      F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, T4.fire1, T4.fire1 + 0.3), 1.1);
      F.smoke(c, m.x, m.y, t - T4.fire1, 0.9, 5, '#6b7280', 30);
    }
    const L: A.Pt = [760, -6];
    const a: A.Pt = [m.x, m.y];
    const h = X.arcH(a, L, ANG);
    X.flight(c, a, L, h, A.ph(t, T4.fire1 + 0.05, T4.land1), { s: 0.95, w: A.px(c, 5) });
    X.trench(c, L[0] + 60, 0.9, 2);
    if (t >= T4.land1) F.explosion(c, L[0], -24, 90, A.ph(t, T4.land1, T4.land1 + 0.7), 4);
    // đoạn rơi gần thẳng đứng
    const ea = A.win(t, 170.4, 172.2, 0.2, 0.3);
    if (ea > 0) A.withA(c, ea, () => U.arrow(c, [L[0] - 30, -480], [L[0] - 20, -110], { color: P.sky, w: 9, head: 34 }));
    K.end(c);
  }

  private carry(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 250, y: -240, z: 0.95 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const mv = A.eio(t, 172.7, 176.3);
    const asm = A.sm(t, 176.4, 177.0);
    const x0 = -560 + 560 * mv;
    // bộ binh đi theo hàng
    const walking = t < 176.4;
    const w = walking ? t * 6.5 : undefined;
    for (let i = 0; i < 5; i++) {
      const sx = x0 - i * 120;
      const lift = walking ? 1 : 0;
      X.soldier(c, sx, 0, 1.05, 1, 'ally', 0.15, w === undefined ? undefined : w + i);
      // ba người đầu mang bộ phận cối
      if (i === 0 && lift) A.capsule(c, [sx - 20, -84], [sx + 120, -112], 14, P.dark, P.ink, 3);
      if (i === 1 && lift) A.ellipse(c, sx - 8, -86, 34, 20, 0.3, P.dark, P.ink, 3);
      if (i === 2 && lift) { A.line(c, [[sx - 10, -88], [sx + 70, -60]], P.slate, 7); A.line(c, [[sx - 10, -88], [sx + 40, -52]], P.slate, 7); }
    }
    // cối lắp xong
    const mx = x0 + 180;
    if (asm > 0) {
      const rc = Math.max(A.bump(t, T4.f2a, 0.5), A.bump(t, T4.f2b, 0.5)) * 0.8;
      const m = X.mortar(c, { x: mx, s: 1.2, ang: 1.15, recoil: rc, alpha: asm });
      for (const tf of [T4.f2a, T4.f2b]) {
        if (t >= tf) {
          F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, tf, tf + 0.3), 1.0);
          F.smoke(c, m.x, m.y, t - tf, 0.7, 4, '#6b7280', 25);
        }
      }
      const tg: A.Pt = [mx + 820, -6];
      const a: A.Pt = [m.x, m.y];
      X.flight(c, a, tg, X.arcH(a, tg, 1.15), A.ph(t, T4.f2a + 0.05, T4.l2a), { s: 0.95, w: A.px(c, 5) });
      X.flight(c, a, [tg[0] + 60, -6], X.arcH(a, [tg[0] + 60, -6], 1.15), A.ph(t, T4.f2b + 0.05, T4.l2b), { s: 0.95, w: A.px(c, 5) });
      if (t >= T4.l2a) F.explosion(c, tg[0], -24, 90, A.ph(t, T4.l2a, T4.l2a + 0.7), 4);
      if (t >= T4.l2b) F.explosion(c, tg[0] + 60, -24, 80, A.ph(t, T4.l2b, T4.l2b + 0.6), 4);
    }
    X.trench(c, 1100, 1, 3);
    K.end(c);
  }

  private behind(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 520, y: -230, z: 0.9 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    X.ridge(c, 480, 460, 260);
    X.trench(c, 960, 1, 3);
    const m = X.mortar(c, { x: 0, s: 1.3, ang: ANG, recoil: A.bump(t, T4.f3, 0.5) * 0.8 });
    X.soldier(c, -90, 0, 1.0, 1, 'ally');
    if (t >= T4.f3) { F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, T4.f3, T4.f3 + 0.3), 1.0); F.smoke(c, m.x, m.y, t - T4.f3, 0.7, 4, '#6b7280', 25); }
    const L: A.Pt = [900, -8];
    X.flight(c, [m.x, m.y], L, X.arcH([m.x, m.y], L, ANG), A.ph(t, T4.f3 + 0.05, T4.l3), { s: 0.95, w: A.px(c, 5) });
    if (t >= T4.l3) F.explosion(c, L[0], -24, 90, A.ph(t, T4.l3, T4.l3 + 0.7), 4);
    // pháo đạn đạo thẳng: chạm sườn đồi
    const ga = A.sm(t, 183.7, 184.1);
    if (ga > 0) {
      const g = X.spGun(c, { x: -380, s: 0.6, elev: 0.1, recoil: A.bump(t, T4.f4, 0.5) * 0.8, alpha: ga });
      if (t >= T4.f4) F.muzzleFlash(c, g.x, g.y, g.ang, A.ph(t, T4.f4, T4.f4 + 0.25), 1.0);
      const imp: A.Pt = [290, -110];
      const a: A.Pt = [g.x, g.y];
      X.flight(c, a, imp, X.arcH(a, imp, 0.1), A.ph(t, T4.f4 + 0.05, T4.l4), { s: 0.95, w: A.px(c, 5) });
      if (t >= T4.l4) { F.sparks(c, imp[0], imp[1], A.ph(t, T4.l4, T4.l4 + 0.5), 1.2, Math.PI, Math.PI, 5); F.dust(c, imp[0] + 20, imp[1] + 100, A.ph(t, T4.l4, T4.l4 + 0.9), 1.2); }
      if (t > T4.l4 + 0.2) U.xMark(c, 540, -330, 50, A.sm(t, T4.l4 + 0.2, T4.l4 + 0.7), P.enemy, 12);
    }
    K.end(c);
  }

  private trade(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 800, y: -200, z: 0.74 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const g = A.back(t, 185.8, 186.4);
    if (g > 0) X.spGun(c, { x: -330, s: 0.8 * Math.min(1, g), elev: 0.45 });
    // thanh tầm: pháo xa; cối ngắn
    const b1 = A.eo(t, 186.2, 187.2);
    const b2 = A.eo(t, 187.0, 187.7);
    A.rrect(c, -330, 60, 2000 * b1, 22, 11, P.amber, P.ink, A.px(c, 4));
    A.rrect(c, 1450, 100, 380 * b2, 22, 11, P.olive, P.ink, A.px(c, 4));
    // bộ binh + cối ở tuyến đầu
    const gi = A.back(t, 186.0, 186.7);
    const cheer = A.bump(t, 188.3, 1.6);
    if (gi > 0) {
      X.mortar(c, { x: 1450, s: 1.0 * Math.min(1, gi), ang: 1.2 });
      for (let i = 0; i < 4; i++) X.soldier(c, 1580 + i * 70, -Math.abs(Math.sin((t * 3 + i))) * 18 * cheer, 0.95 * Math.min(1, gi), -1, 'ally', 0, undefined);
    }
    X.trench(c, 2100, 0.9, 2);
    K.end(c);
    // dấu hiệu chấp nhận
    const a = A.sm(t, 188.4, 188.9);
    if (a > 0) {
      const p = K.toScreen(cam, 1640, -190);
      A.withA(c, a, () => A.line(c, [[p[0] - 32, p[1]], [p[0] - 8, p[1] + 28], [p[0] + 40, p[1] - 30]], P.olive, 12));
    }
  }
}
