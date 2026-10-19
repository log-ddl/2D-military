import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly, ellipse } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { smoke, tracer, muzzleFlash } from './shared/fx';

// Chương 9 (353.3–385.3): phép tính chi phí. NGANG, hai thanh chi tiêu; ba giải pháp rẻ.
const GY = 880;
const HITS = [356.6, 358.8, 361.0, 363.2, 365.4];

function costBars(c: CanvasRenderingContext2D, def: number, atk: number, a = 1) {
  withA(c, a, () => {
    rrect(c, 560, 28, 1330, 190, 22, 'rgba(255,255,255,0.9)', P.ink, 4);
    // hàng phòng thủ
    circle(c, 620, 86, 26, P.olive, P.ink, 4);
    rrect(c, 680, 62, 1160, 48, 12, '#f3f6f8', P.ink, 3);
    rrect(c, 683, 65, Math.max(30, 1154 * Math.min(1, def)), 42, 10, P.amber, null, 0);
    // hàng tấn công
    circle(c, 620, 160, 26, P.enemy, P.ink, 4);
    rrect(c, 680, 136, 1160, 48, 12, '#f3f6f8', P.ink, 3);
    rrect(c, 683, 139, Math.max(14, 1154 * Math.min(1, atk)), 42, 10, P.amber, null, 0);
  });
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    D.skyFill(c, cam, GY);
    D.groundFill(c, cam, GY);
    if (t < 367.9) this.exchange(c, t);
    else this.cheap(c, t);
    K.end(c);
  }

  private exchange(c: CanvasRenderingContext2D, t: number) {
    const lx = 330;
    D.launcherSide(c, lx, GY, 1.6, { elev: 0.7, loaded: Math.max(0, 2 - Math.floor(t - 355) * 0) });
    // nơi phóng mục tiêu rẻ (phía tấn công)
    const rx = 1760;
    rrect(c, rx - 70, GY - 46, 140, 46, 8, '#b4493c', P.ink, 4);
    poly(c, [[rx - 50, GY - 46], [rx + 40, GY - 100], [rx + 56, GY - 90], [rx - 10, GY - 46]], '#7f2e26', P.ink, 4);
    let def = 0, atk = 0;
    HITS.forEach((h, i) => {
      const l0 = h - 1.5;
      const dx = A.lerp(rx - 30, 1020 - (i % 2) * 90, A.ph(t, h - 3.6, h)), dy = A.lerp(GY - 110, 420 + (i % 3) * 60, A.eo(t, h - 3.6, h - 2.4));
      if (t > h - 3.6 && t < h) D.droneSide(c, dx, dy, 1.6, { dir: -1 });
      else if (t >= h && t < h + 1.2) { const f = A.ph(t, h, h + 1.2); D.droneSide(c, dx - f * 60, dy + f * f * 300, 1.6, { dir: -1, a: 1 - f }); smoke(c, dx - f * 60, dy + f * f * 300, f * 1.4, 0.9, 5); }
      if (t > l0) W.intercept(c, t, [lx + 190, GY - 280], [dx, dy], l0, h, { L: 130, boom: 90, bend: 120 });
      // chi tiêu tích luỹ
      def += 0.17 * A.eo(t, h - 1.0, h - 0.2);
      atk += 0.012 * A.eo(t, h - 3.6, h - 3.0);
    });
    costBars(c, def, atk, A.eo(t, 353.8, 354.8));
    // cuối: cán cân nghiêng (365.8–367.7)
    const sc = A.eo(t, 366.2, 367.2);
    if (sc > 0) withA(c, sc, () => {
      const bx = 1060, by = 560, tilt = 0.24 * A.sm(t, 366.6, 367.6);
      line(c, [[bx, by + 120], [bx, by - 20]], P.ink, 8);
      c.save(); c.translate(bx, by - 20); c.rotate(tilt);
      line(c, [[-220, 0], [220, 0]], P.ink, 8); circle(c, 0, 0, 12, P.amber, P.ink, 3);
      c.save(); c.translate(-220, 0); c.rotate(-tilt); line(c, [[0, 0], [0, 40]], P.ink, 4); D.droneSide(c, 0, 90, 1.5, { dir: -1 }); c.restore();
      c.save(); c.translate(220, 0); c.rotate(-tilt); line(c, [[0, 0], [0, 40]], P.ink, 4); D.missile(c, 0, 110, -Math.PI / 2, 200, {}); c.restore();
      c.restore();
    });
  }

  private cheap(c: CanvasRenderingContext2D, t: number) {
    const gx = 330, jx = 960, lx = 1560;
    // ── pháo: ngàn viên nhỏ rẻ ────────────────────────────────────
    D.gunSide(c, gx, GY, 1.5, { elev: 0.62, recoil: (t > 369.2 && t < 372.2) ? 5 * Math.abs(Math.sin(t * 38)) : 0 });
    const gt: A.Pt = [A.lerp(1080, 760, A.ph(t, 368.2, 372.3)), 400];
    const gHit = 372.3;
    if (t > 368.2 && t < gHit) D.droneSide(c, gt[0], gt[1], 1.5, { dir: -1 });
    else if (t >= gHit && t < gHit + 1.2) { const f = A.ph(t, gHit, gHit + 1.2); D.droneSide(c, gt[0], gt[1] + f * f * 300, 1.5, { dir: -1, a: 1 - f }); smoke(c, gt[0], gt[1] + f * f * 300, f * 1.4, 0.9, 5); D.bang(c, gt[0], gt[1], 80, A.ph(t, gHit, gHit + 0.6)); }
    if (t > 369.2 && t < gHit) {
      const mz: A.Pt = [gx + 140, GY - 220];
      for (let i = 0; i < 16; i++) {
        const p = (((t * 6 + i / 16)) % 1);
        tracer(c, mz, gt, p, 0.12, '#f59e0b', 5);
      }
      muzzleFlash(c, mz[0], mz[1], -0.6, (t * 11) % 1, 0.8);
    }
    // ── nhiễu: gần như không tốn gì ─────────────────────────────────
    D.radarSide(c, jx, GY, 1.1, { ph: 0, a: 1 });
    // thay đĩa radar bằng ăng-ten nhiễu: sóng đỏ gai
    const jt = A.ph(t, 374.8, 377.2);
    const jd: A.Pt = [A.lerp(1380, 1020, jt) + (t > 375.6 ? 50 * Math.sin((t - 375.6) * 9) * (1 - A.sm(t, 376.6, 377.2)) : 0), 360 + (t > 375.6 ? 36 * Math.cos((t - 375.6) * 7) : 0)];
    if (t > 374.7) {
      const fall = A.ph(t, 376.8, 378.2);
      if (fall <= 0) {
        D.droneSide(c, jd[0], jd[1], 1.5, { dir: -1 });
        // sóng nhiễu
        if (t > 375.0) {
          const ang = Math.atan2(jd[1] - (GY - 250), jd[0] - jx);
          for (let i = 0; i < 4; i++) {
            const p = (((t * 0.8 + i / 4) % 1));
            withA(c, 1 - p, () => {
              c.beginPath(); c.moveTo(jx + 20, GY - 250);
              const L = 380 * p + 90;
              for (let k = 1; k <= 8; k++) c.lineTo(jx + 20 + Math.cos(ang) * L * k / 8 + Math.sin(ang) * (k % 2 ? 14 : -14), GY - 250 + Math.sin(ang) * L * k / 8 - Math.cos(ang) * (k % 2 ? 14 : -14));
              c.strokeStyle = P.enemy; c.lineWidth = 4; c.stroke();
            });
          }
        }
      } else if (fall < 1) { D.droneSide(c, jd[0] - fall * 80, jd[1] + fall * fall * 440, 1.5, { dir: -1, a: 1 - fall * 0.5, pitch: fall * 1.6 }); }
      if (t >= 378.2 && t < 378.9) D.bang(c, jd[0] - 80, GY - 10, 60, A.ph(t, 378.2, 378.9));
    }
    // ── laser: chi phí gần bằng điện ─────────────────────────────────
    D.radarSide(c, lx, GY, 0.0001, {});
    rrect(c, lx - 90, GY - 56, 180, 56, 10, P.dark, P.ink, 4);
    circle(c, lx - 40, GY - 20, 20, P.light, P.ink, 3); circle(c, lx + 40, GY - 20, 20, P.light, P.ink, 3);
    circle(c, lx, GY - 90, 44, P.slate, P.ink, 4);
    circle(c, lx - 10, GY - 96, 26, '#fecaca', P.ink, 3);
    const ld: A.Pt = [A.lerp(1900, 1250, A.ph(t, 377.4, 380.2)), 350];
    const lHit = 380.4;
    if (t > 377.4) {
      if (t < lHit) {
        D.droneSide(c, ld[0], ld[1], 1.5, { dir: -1 });
        if (t > 378.4) {
          const on = A.sm(t, 378.4, 378.8);
          withA(c, on, () => { line(c, [[lx - 20, GY - 100], ld], '#ef4444', 7); line(c, [[lx - 20, GY - 100], ld], '#fff', 2.5); circle(c, ld[0], ld[1], 14 + 6 * Math.sin(t * 40), '#fde68a', null, 0); });
        }
      } else {
        const f = A.ph(t, lHit, lHit + 1.4);
        if (f < 1) { D.droneSide(c, ld[0] - f * 60, ld[1] + f * f * 420, 1.5, { dir: -1, a: 1 - f, pitch: f }); smoke(c, ld[0] - f * 60, ld[1] + f * f * 420, f * 1.5, 1.1, 5); }
      }
    }
    // ── giới hạn tầm / thời tiết (380.7–385) ──────────────────────
    const lim = A.eo(t, 380.8, 381.8);
    if (lim > 0) {
      // mây lướt qua chùm laser
      const cx = A.lerp(2200, 1330, A.eo(t, 381.4, 383.2));
      withA(c, lim, () => {
        for (const [ox, oy, r] of [[0, 0, 70], [70, 20, 60], [-70, 22, 56], [30, -40, 56]] as const) circle(c, cx + ox, 360 + oy, r, '#e2e8f0', P.ink, 4);
        // vòng tầm ngắn quanh từng thiết bị
        for (const x of [gx, jx, lx]) {
          c.beginPath(); c.ellipse(x, GY, 250, 330 * 0.62, 0, Math.PI, 0); c.strokeStyle = P.olive; c.lineWidth = 5; c.setLineDash([16, 12]); c.stroke(); c.setLineDash([]);
        }
      });
      // thanh chi phí so với tên lửa
      withA(c, lim, () => {
        rrect(c, 640, 28, 1260, 230, 22, 'rgba(255,255,255,0.94)', P.ink, 4);
        const rows: [number, number][] = [[0.92, 0], [0.07, 1], [0.04, 2], [0.03, 3]];
        rows.forEach(([v, k], i) => {
          const y = 58 + i * 50;
          if (k === 0) D.missile(c, 700, y + 14, 0, 70, {});
          if (k === 1) { c.save(); c.translate(700, y + 22); c.scale(0.28, 0.28); D.gunSide(c, 0, 0, 1, { elev: 0.5 }); c.restore(); }
          if (k === 2) { c.save(); c.translate(700, y + 24); c.scale(0.2, 0.2); D.radarSide(c, 0, 0, 1, {}); c.restore(); }
          if (k === 3) { circle(c, 700, y + 14, 16, P.slate, P.ink, 3); line(c, [[716, y + 14], [740, y + 6]], '#ef4444', 4); }
          rrect(c, 780, y, 1070, 32, 8, '#f3f6f8', P.ink, 3);
          rrect(c, 783, y + 3, Math.max(14, 1064 * v * A.eo(t, 382.0 + i * 0.25, 383.2 + i * 0.25)), 26, 6, P.amber, null, 0);
        });
      });
      // chùm laser bị mây chắn
      const blk = A.sm(t, 382.8, 383.6);
      withA(c, lim * 0.9, () => {
        const end: A.Pt = [A.lerp(1260, cx, 0), 380];
        line(c, [[lx - 20, GY - 100], [lx - 20 + (cx - lx + 20) * 0.9, A.lerp(GY - 100, 470, 1)]], '#ef4444', 5, blk > 0.5 ? [10, 12] : undefined);
      });
    }
  }
}
