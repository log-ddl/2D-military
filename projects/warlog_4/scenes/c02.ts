// Chương 2 (52.8 – 87.4): sàn ngắn → máy phóng. NGANG mặt cắt dưới sàn: piston hơi, rồi nam châm.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const SJ = 1.2, JY = S.JET_H * SJ;
const X0 = 200, X1 = 470;                  // tâm phản lực: điểm đầu / cuối hành trình
const NOSE = 26 * SJ;                      // càng mũi lệch về phía trước tâm
const L1 = 74.4, L1E = 76.6;               // phóng bằng hơi
const L2 = 83.3, L2E = 85.4;               // phóng bằng nam châm
const EM0 = 81.8;                          // chuyển sang nam châm

function launchX(t: number, a: number, b: number) {
  const u = A.clamp01((t - a) / (b - a));
  return X0 + (X1 - X0) * u * u;
}

export default class C02 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam = K.track(t, [
      [52.8, { x: 20, y: 20, z: 1.3 }],
      [58.4, { x: 20, y: 20, z: 1.3 }],
      [59.6, { x: 330, y: 10, z: 0.95 }],
      [63.0, { x: 330, y: 10, z: 0.95 }],
      [65.6, { x: 330, y: 22, z: 2.15 }],
      [76.0, { x: 340, y: 22, z: 2.15 }],
      [79.0, { x: 420, y: 10, z: 1.6 }],
      [81.6, { x: 330, y: 22, z: 2.15 }],
      [87.4, { x: 340, y: 22, z: 2.15 }],
    ], A.eio);
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 90 });
    const cut = A.sm(t, 63.6, 65.4) * (1 - A.sm(t, 87.0, 87.4) * 0);
    S.carrierSide(c, t, { x: 0, y: 0, cut, noIsland: true });
    if (t < 63.7) this.tooShort(c, t);
    else this.catapult(c, t, cut);
    S.carrierIsland(c, t, { x: 0, y: 0 });
    K.end(c);
    this.hud(c, t, cam);
    S.cutDip(c, t, 63.7, 0.0001);
    chain(c, t);
  }

  // ───── 52.8–63.7: sàn quá ngắn
  private tooShort(c: CanvasRenderingContext2D, t: number) {
    // thước sàn
    const bp = A.sm(t, 54.0, 55.2);
    if (bp > 0) {
      const y = -150;
      const x1 = -470 + 970 * bp;
      A.line(c, [[-470, y], [x1, y]], P.ink, A.px(c, 5));
      A.line(c, [[-470, y - 12], [-470, y + 12]], P.ink, A.px(c, 5));
      A.line(c, [[x1, y - 12], [x1, y + 12]], P.ink, A.px(c, 5));
    }
    // đường băng cần có: kéo dài sàn bằng nét đứt, một phản lực bóng chạy hết
    const ep = A.sm(t, 58.6, 60.8);
    if (ep > 0) {
      const ex = 500 + 900 * ep;
      A.line(c, [[500, 6], [ex, 6]], P.ink2, A.px(c, 9), [26, 16]);
      A.line(c, [[500, 20], [ex, 20]], 'rgba(71,85,105,0.5)', A.px(c, 3));
      const gx = X0 + (1380 - X0) * A.eio(t, 60.6, 62.8);
      const ga = A.sm(t, 60.4, 60.9) * (1 - A.sm(t, 62.9, 63.6));
      S.jetSide(c, gx, -JY, SJ, { gear: 1, flame: 1, a: 0.5 * ga });
    }
    // phản lực thật: đứng ở đầu đường phóng
    S.jetSide(c, X0, -JY, SJ, { gear: 1, hero: true, flame: 0.0 });
    // dấu "không cho thử": mốc cuối sàn
    const mp = A.sm(t, 61.8, 62.4);
    if (mp > 0) A.line(c, [[500, -60], [500, 30]], P.enemy, A.px(c, 7 * mp));
  }

  // ───── 63.7–87.4: máy phóng
  private catapult(c: CanvasRenderingContext2D, t: number, cut: number) {
    const steamOn = 1 - A.sm(t, EM0, EM0 + 0.8);
    const emOn = A.sm(t, EM0, EM0 + 0.8);
    // vị trí
    let xj = X0;
    if (t >= L1 && t < EM0) xj = launchX(t, L1, L1E);
    if (t >= EM0 - 1.0 && t < EM0) xj = X0;
    if (t >= L2) xj = launchX(t, L2, L2E);
    // sau khi bay khỏi sàn
    let jy = -JY, ang = 0, gear = 1, vis = 1, flame = 0;
    const leave = (t >= L1E && t < EM0 - 0.8) ? t - L1E : (t >= L2E ? t - L2E : -1);
    if (leave >= 0) {
      xj = X1 + 290 * leave;
      jy = -JY - 30 * leave - 18 * leave * leave;
      ang = -0.22 * A.sm(leave, 0, 0.6);
      gear = 1 - A.sm(leave, 0.4, 1.1);
    }
    if (t >= L1E + 3.5 && t < EM0 - 0.8) vis = 0;           // bay đi, ra khỏi khung
    const reset = A.sm(t, EM0 - 0.6, EM0 + 0.3);            // phản lực nhân vật quay lại đầu đường phóng
    if (t >= EM0 - 0.8 && t < L2) { xj = X0; vis = reset; }
    if (t >= L2E + 3.5) vis = 0;
    flame = t >= L1 && t < L1E + 1.2 ? 0.9 : t >= L2 && t < L2E + 1.0 ? 0.35 : 0;
    const towing = leave < 0 && vis > 0;

    // vị trí con thoi/piston
    const sx = (t >= L1 && t < EM0) ? launchX(t, L1, L1E) + NOSE : (t >= L2 ? launchX(t, L2, L2E) + NOSE : X0 + NOSE);
    let px = sx;
    // hồi về sau khi phóng
    if (t >= L1E && t < EM0) px = A.lerp(X1 + NOSE, X0 + NOSE, A.sm(t, L1E + 1.0, EM0 - 0.4));
    if (t >= L2E) px = A.lerp(X1 + NOSE, X0 + NOSE, A.sm(t, L2E + 0.8, L2E + 1.9));
    const pxc = A.clamp(px, X0 + NOSE, X1 + NOSE);

    // ống / dãy cuộn
    const cy0 = 20, ch = 24;
    if (steamOn > 0) {
      c.save(); c.globalAlpha *= steamOn;
      // bình hơi
      A.rrect(c, 20, 14, 120, 44, 8, '#ffffff', P.ink, A.px(c, 3.5));
      const prs = t >= 73.4 && t < L1E ? 1 - A.sm(t, L1 + 0.6, L1E) * 0.7 : 0.9;
      const nSteam = 6;
      for (let i = 0; i < nSteam; i++) {
        const bx = 36 + (i % 3) * 36, by = 30 + Math.floor(i / 3) * 18 + Math.sin(t * 2 + i) * 2;
        A.circle(c, bx + 18, by, 5 + prs * 3, 'rgba(245,158,11,0.55)', null, 0);
      }
      A.line(c, [[140, 36], [X0 + NOSE - 10, 36]], P.ink2, A.px(c, 7));
      // thân ống
      A.rrect(c, X0 + NOSE - 12, cy0, X1 - X0 + 40, ch, 4, '#f1f5f9', P.ink, A.px(c, 3.5));
      // hơi đẩy sau piston
      if (pxc > X0 + NOSE - 6) {
        c.save(); c.beginPath(); c.rect(X0 + NOSE - 10, cy0 + 2, pxc - (X0 + NOSE - 10) - 6, ch - 4); c.clip();
        const on = A.sm(t, 73.4, 73.9) * (1 - A.sm(t, L1E, L1E + 0.4)) + 0.0;
        c.fillStyle = `rgba(245,158,11,${0.18 + 0.5 * on})`; c.fillRect(X0 + NOSE - 10, cy0, 400, ch);
        for (let i = 0; i < 9; i++) {
          const r = A.rnd(i + 11), bx = X0 + NOSE - 6 + r * Math.max(10, pxc - X0 - NOSE), by = cy0 + 5 + A.rnd(i + 3) * (ch - 10);
          A.circle(c, bx + Math.sin(t * 6 + i) * 3, by, 2.4, 'rgba(255,255,255,0.9)', null, 0);
        }
        c.restore();
      }
      // piston
      A.rrect(c, pxc - 7, cy0 + 1, 14, ch - 2, 3, P.slate, P.ink, A.px(c, 3));
      // van mở: mũi tên áp
      const ap = A.sm(t, 73.4, 73.9) * (1 - A.sm(t, L1 + 0.3, L1 + 0.7));
      if (ap > 0) S.arrowW(c, [146, 36], [X0 + NOSE - 14, 36], ap, P.amber, 8, 22);
      c.restore();
    }
    if (emOn > 0) {
      c.save(); c.globalAlpha *= emOn;
      // dãy cuộn dọc đường phóng
      const n = 14, w = (X1 - X0 + 40) / n;
      for (let i = 0; i < n; i++) {
        const x = X0 + NOSE - 12 + i * w;
        const dist = x + w / 2 - pxc;
        const act = (t >= L2 && t < L2E + 0.4) ? A.clamp01(1 - Math.abs(dist - 28) / 70) : (t < L2 ? 0.0 : 0);
        const idle = 0.15 + 0.1 * Math.sin(t * 3 + i);
        const col = A.lerpColor('#dbeafe', '#fbbf24', Math.max(act, 0));
        A.rrect(c, x + 1, cy0, w - 2, ch, 3, col, P.ink, A.px(c, 2.5));
        void idle;
      }
      // dây điện + nguồn
      A.rrect(c, 20, 14, 100, 44, 8, '#ffffff', P.ink, A.px(c, 3.5));
      A.circle(c, 70, 36, 14, null, P.sky, A.px(c, 4));
      A.poly(c, [[66, 26], [76, 36], [68, 36], [74, 46]], P.amber, null, 0);
      A.line(c, [[120, 36], [X0 + NOSE - 12, 36]], P.sky, A.px(c, 5));
      A.rrect(c, pxc - 9, cy0 + 1, 18, ch - 2, 3, P.slate, P.ink, A.px(c, 3));
      c.restore();
    }
    // con thoi chui qua rãnh lên tới càng mũi
    const sh = A.rrect;
    sh(c, pxc - 4, -8, 8, 36, 2, P.dark, P.ink, A.px(c, 2.5));
    A.line(c, [[pxc, -7], [pxc - 8, -9]], P.ink, A.px(c, 3));
    // rãnh trên sàn
    A.line(c, [[X0 + NOSE - 12, 5], [X1 + NOSE + 20, 5]], P.light, A.px(c, 3));

    // vạch hành trình 100 m
    const dp = A.sm(t, 79.6, 80.8) * (1 - A.sm(t, EM0 - 0.4, EM0 + 0.2));
    if (dp > 0) {
      const y = 70;
      A.line(c, [[X0, y], [X0 + (X1 - X0) * dp, y]], P.amber, A.px(c, 5));
      A.line(c, [[X0, y - 10], [X0, y + 10]], P.amber, A.px(c, 5));
      A.line(c, [[X0 + (X1 - X0) * dp, y - 10], [X0 + (X1 - X0) * dp, y + 10]], P.amber, A.px(c, 5));
    }
    // phản lực
    if (vis > 0) S.jetSide(c, xj, jy, SJ, { ang, gear, hero: true, flame, a: vis });
    void towing; void cut;
  }

  private hud(c: CanvasRenderingContext2D, t: number, cam: K.Cam) {
    if (t < L1 - 0.6) return;
    // đồng hồ tốc độ (lúc phóng)
    const u1 = A.clamp01((t - L1) / (L1E - L1)), u2 = A.clamp01((t - L2) / (L2E - L2));
    const v = t < EM0 ? Math.sqrt(u1) : Math.sqrt(u2);
    const hold = t < EM0 ? (t > L1E ? 1 : v) : (t > L2E ? 1 : v);
    const a = A.sm(t, L1 - 0.6, L1) * (1 - A.sm(t, 79.4, 80.4)) + A.sm(t, L2 - 0.5, L2) * (1 - A.sm(t, 86.2, 87.0));
    if (a > 0) {
      c.save(); c.globalAlpha *= A.clamp01(a);
      S.bar(c, 90, 110, 440, 36, hold, P.amber, 5);
      c.restore();
    }
    S.tag(c, '30 t', 1180, 250, A.win(t, 73.9, 76.0, 0.2, 0.3), { size: 40 });
    S.tag(c, '250 km/h', 1180, 250, A.win(t, 76.3, 80.0, 0.2, 0.3), { size: 40 });
    const [mx, my] = K.toScreen(cam, (X0 + X1) / 2, 70);
    S.tag(c, '100 m', mx, my + 52, A.win(t, 80.0, 81.7, 0.2, 0.3), { size: 40 });
  }
}
