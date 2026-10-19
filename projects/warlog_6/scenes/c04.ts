import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { rig } from './shared/rig';
import { xMark } from './shared/ui';
import { smoke, tracer, muzzleFlash } from './shared/fx';

// Chương 4 (128–160.5): tầng ngắn trên mặt đất cong; nâng radar lên; đánh cảm biến trước. NGANG, giữ camera cuối c03.
const GY = 860, XR = 330, KMAX = 0.00022;
const gY = (x: number) => GY + KMAX * (x - XR) * (x - XR);
const slope = (x: number) => Math.atan(2 * KMAX * (x - XR));
const cam: K.Cam = { x: 800, y: 770, z: 0.95 };

function onGround(c: CanvasRenderingContext2D, x: number, fn: () => void) {
  c.save(); c.translate(x, gY(x)); c.rotate(slope(x)); fn(); c.restore();
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const k = K;
    K.begin(c, cam);
    D.skyFill(c, cam, 3000);
    const v = K.view(cam, 200);
    c.beginPath(); c.moveTo(v.x0, v.y1 + 600);
    for (let x = v.x0; x <= v.x1; x += 40) c.lineTo(x, gY(x));
    c.lineTo(v.x1, v.y1 + 600); c.closePath(); c.fillStyle = D.GROUND; c.fill();
    c.beginPath();
    for (let x = v.x0; x <= v.x1; x += 40) (x === v.x0 ? c.moveTo(x, gY(x)) : c.lineTo(x, gY(x)));
    c.strokeStyle = P.ink; c.lineWidth = 5; c.stroke();

    const ry = gY(XR) - 245 + 15;   // độ cao anten ground radar
    // radar mặt đất (cuối c03)
    onGround(c, XR, () => D.radarSide(c, 0, 0, 1.15, { ph: t * 2.2 }));
    // đường nhìn ngang radar mặt đất
    const beamA = 1 - A.sm(t, 150.6, 151.2) * 0 ;
    line(c, [[XR + 20, ry], [XR + 2300, ry]], P.sky, 5, [20, 12]);

    // ── tầng ngắn: xe pháo + lính vác tên lửa (128–137.7) ──────────
    const gunX = 620 - 20 * A.sm(t, 128, 137), solX = 340;
    onGround(c, gunX, () => D.gunSide(c, 0, 0, 1.0, { elev: 0.25 + 0.4 * A.sm(t, 130.6, 132.0), recoil: 4 * Math.abs(Math.sin(t * 40)) * (t > 131.6 && t < 133.6 ? 1 : 0) }));
    onGround(c, 760 - 10 * A.sm(t, 128, 137), () => rig(c, { x: 0, y: 0, s: 1.35, dir: 1, skin: 'ally', weapon: 'rifle', walk: A.keysLin(t, [[128, 0], [137, 20]]) }));
    onGround(c, solX + 560, () => D.manpadSide(c, 0, 0, 1.45, { aim: 0.3 + 0.55 * A.sm(t, 134.0, 134.8) }));

    // máy bay thấp #1: bám đất, bị pháo bắn
    const jx = (tt: number) => A.lerp(1500, 1010, A.ph(tt, 128.2, 133.5));
    const jy = (tt: number) => gY(jx(tt)) - 52;
    const hit1 = 133.5;
    if (t < hit1 + 1.4) {
      const f = A.ph(t, hit1, hit1 + 1.3);
      if (f <= 0) D.jetSide(c, jx(t), jy(t), 1.1, { dir: -1 });
      else { D.jetSide(c, jx(hit1) - f * 80, jy(hit1) + f * f * 160, 0.9, { dir: -1, a: 1 - f, pitch: f }); smoke(c, jx(hit1) - f * 80, jy(hit1), f * 1.5, 1, 5); }
    }
    // đạn pháo: vệt vàng từ nòng
    if (t > 131.7 && t < 133.5) {
      const mx = gunX + 110, my = gY(gunX) - 165;
      for (let i = 0; i < 6; i++) {
        const p = ((t * 7 + i / 6) % 1);
        const tx = jx(t), ty = jy(t);
        tracer(c, [mx, my], [tx, ty], p, 0.15, '#f59e0b', 6);
      }
      muzzleFlash(c, mx, my, -0.5, (t * 9) % 1, 0.8);
    }
    if (t >= hit1 && t < hit1 + 0.7) D.bang(c, jx(hit1), jy(hit1), 70, A.ph(t, hit1, hit1 + 0.7));

    // trực thăng thấp #2: bị tên lửa vai
    const hx = (tt: number) => A.lerp(1500, 1150, A.ph(tt, 133.4, 136.3));
    const hy = (tt: number) => gY(hx(tt)) - 70;
    const hit2 = 136.4;
    if (t > 133.4 && t < hit2 + 1.4) {
      const f = A.ph(t, hit2, hit2 + 1.3);
      if (f <= 0) D.heliSide(c, hx(t), hy(t), 1.3, { dir: -1, ph: t * 30 });
      else if (f < 1) { D.heliSide(c, hx(hit2), hy(hit2) + f * f * 140, 1.1, { dir: -1, ph: t * 30, a: 1 - f }); smoke(c, hx(hit2), hy(hit2), f * 1.5, 1.2, 5); }
    }
    if (t > 135.1) W.intercept(c, t, [solX + 560 + 80, gY(solX + 560) - 110], [hx(hit2), hy(hit2)], 135.1, hit2, { L: 60, boom: 70, bend: 20 });

    // ── nâng radar lên: AWACS (137.7–150.7) ────────────────────────
    if (t > 137.2) {
      const aw = A.lerp(1500, 930, A.eo(t, 137.4, 140.2));
      const awA = 1 - A.sm(t, 154.7, 155.5) ;
      const dying = t > 154.6;
      const fall = A.ph(t, 154.6, 157.4);
      const ax = aw - fall * 150, ay = 380 + fall * fall * 720;
      if (!dying || fall < 1) {
        // nhìn xuống kẻ thấp bay xa
        const lowX = A.keysLin(t, [[137, 1560], [160.5, 1250]]);
        const lowY = gY(lowX) - 40;
        if (t < 154.6) {
          const lock = A.sm(t, 141.2, 142.4);
          // sóng đi từ AWACS xuống
          withA(c, lock, () => {
            const ang0 = Math.atan2(lowY - 420, lowX - ax);
            D.waves(c, ax, 420, ang0 - 0.2, ang0 + 0.2, 800, t, 4, P.sky, 4);
            line(c, [[ax - 20, 500], [lowX, lowY]], P.sky, 5, [14, 10]);
          });
          D.jetSide(c, lowX, lowY, 1.1, { dir: -1 });
          W.bracket(c, lowX, lowY, 70, P.sky, lock);
        }
        D.awacsSide(c, ax, ay, 1.0, { dir: -1, ph: t * 2.2 });
      }
      // báo ground radar nhận từ AWACS: liên kết xuống radar mặt đất
      if (t > 142.6 && t < 154.6) {
        W.link(c, [ax - 40, 450], [XR + 20, ry + 20], P.amber, 4, A.sm(t, 142.6, 143.6), t);
        W.pulse(c, [ax - 40, 450], [XR + 20, ry + 20], t, 0.5, 0, P.amber, 8);
      }
      // địch săn cảm biến: hai tiêm kích bay lên đánh AWACS
      if (t > 150.6) {
        for (let i = 0; i < 2; i++) {
          const jt = A.lerp(1700, ax + 330 + i * 130, A.eio(t, 150.8 + i * 0.3, 154.0));
          const jy2 = 300 + i * 120;
          if (t < 157.5) D.jetSide(c, jt - (t > 154.8 ? A.sm(t, 154.8, 157.5) * 900 : 0), jy2, 1.0, { dir: -1, flame: true });
        }
        // tên lửa địch
        if (t > 152.6 && t < 154.6) {
          const p = A.ph(t, 152.6, 154.6);
          const sx = ax + 330, sy = 300;
          const mx = A.lerp(sx, ax, p), my = A.lerp(sy, ay - 20, p);
          D.missile(c, mx, my, Math.atan2(ay - 20 - sy, ax - sx), 110, { flame: 1, side: 'atk' });
        }
        if (t >= 154.6 && t < 155.4) D.bang(c, ax, ay - 20, 130, A.ph(t, 154.6, 155.4));
      }
    }

    // ── radar mù, phải đoán (từ 156) ─────────────────────────────────
    if (t > 156.2) {
      const q = A.eo(t, 156.4, 157.4);
      // vùng mù lại hiện
      withA(c, q * 0.34, () => {
        c.beginPath(); c.moveTo(XR + 30, ry);
        for (let x = XR + 30; x <= XR + 2300; x += 40) c.lineTo(x, gY(x));
        c.lineTo(XR + 2300, ry); c.closePath();
        c.fillStyle = '#94a3b8'; c.fill();
      });
      // vài kẻ thấp lẻn vào, chỉ thấy bóng
      for (let i = 0; i < 3; i++) {
        const lx = A.lerp(1500 + i * 120, 920 + i * 110, A.ph(t, 156.6 + i * 0.2, 160.2));
        D.jetSide(c, lx, gY(lx) - 40, 0.95, { dir: -1, a: 0.6 });
      }
    }
    K.end(c);
    if (t > 156.4) { const q = A.eo(t, 156.6, 157.4); const [qx, qy] = K.toScreen(cam, 1050, 640); D.tag(c, '?', qx, qy, q, P.slate, 90); }
  }
}
