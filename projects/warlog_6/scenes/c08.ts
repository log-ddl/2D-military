import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { rig } from './shared/rig';
import { xMark } from './shared/ui';
import { smoke } from './shared/fx';

// Chương 8 (297.65–353.25): hệ thống tự lộ (NGANG) + U-2 1960. NGANG; đoạn cuối là dải ô so sánh.
const GY = 900;
const JET: A.Pt = [1500, 300];

function eject(c: CanvasRenderingContext2D, x: number, y: number, a = 1) {
  withA(c, a, () => {
    c.beginPath(); c.arc(x, y - 80, 60, Math.PI, 0); c.closePath(); c.fillStyle = '#f8fafc'; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 4; c.stroke();
    line(c, [[x - 60, y - 80], [x, y]], P.ink, 3); line(c, [[x + 60, y - 80], [x, y]], P.ink, 3); line(c, [[x, y - 80], [x, y]], P.ink, 3);
    rig(c, { x, y: y + 80, s: 0.8, skin: 'civil', weapon: null });
  });
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t >= 344.0) { this.strip(c, t); return; }
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    D.skyFill(c, cam, GY);
    D.groundFill(c, cam, GY);
    if (t < 325.4) this.emit(c, t);
    else this.u2(c, t);
    K.end(c);
    if (t > 326.6 && t < 330.4) D.tag(c, '1960', 960, 160, A.eo(t, 327.0, 327.8) * (1 - A.sm(t, 329.6, 330.2)));
  }

  private beam(c: CanvasRenderingContext2D, from: A.Pt, to: A.Pt, t: number, a = 1) {
    const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
    D.waves(c, from[0], from[1], ang - 0.2, ang + 0.2, Math.hypot(to[0] - from[0], to[1] - from[1]), t, 5, P.sky, 5);
    withA(c, 0.16 * a, () => { c.beginPath(); c.moveTo(from[0], from[1]); c.arc(from[0], from[1], Math.hypot(to[0] - from[0], to[1] - from[1]) + 60, ang - 0.2, ang + 0.2); c.closePath(); c.fillStyle = P.sky; c.fill(); });
  }

  private emit(c: CanvasRenderingContext2D, t: number) {
    const rd = (x: number, ph: number, a = 1) => D.radarSide(c, x, GY, 1.4, { ph, a });
    const top = (x: number): A.Pt => [x + 14, GY - 340];
    const jetOn = t > 299.3 && t < 324;
    const jx = A.lerp(2100, JET[0], A.eo(t, 299.2, 300.8));
    if (jetOn) D.jetSide(c, jx, JET[1], 1.1, { dir: -1 });
    // ── run 1: bật suốt → bị bắt → tên lửa đi theo chùm
    if (t < 308.4) {
      const dead = t > 307.4;
      const rx = 300;
      if (!dead) { rd(rx, t * 2.4); this.beam(c, top(rx), [jx, JET[1]], t); }
      else { const f = A.ph(t, 307.4, 308.4); rd(rx, 0, 1 - f); smoke(c, rx, GY - 120, (t - 307.4), 1.8, 7); }
      // nghe thấy: đường phương vị từ máy bay
      const hr = A.eo(t, 300.6, 301.6);
      if (hr > 0 && !dead) withA(c, hr, () => { line(c, [[jx, JET[1] + 30], top(rx)], P.enemy, 4, [10, 8]); D.waves(c, jx, JET[1], Math.PI - 0.5, Math.PI + 0.5, 140, t * 0.8, 3, P.enemy, 4); });
      if (t > 305.2) W.intercept(c, t, [jx - 60, JET[1] + 10], top(rx), 305.2, 307.4, { L: 90, boom: 100, bend: 0, color: '#f3a79e' });
    }
    // ── run 2: bật ngắn rồi chạy (308.4–313.4)
    if (t >= 308.4 && t < 313.5) {
      const cyc = (t - 308.6);
      const onWin = (k: number) => A.ph(t, 308.8 + 1.5 * k, 309.4 + 1.5 * k) > 0 && A.ph(t, 308.8 + 1.5 * k, 309.4 + 1.5 * k) < 1;
      const rxk = (k: number) => 300 + 150 * k;
      let k = 0;
      for (let i = 0; i < 3; i++) if (t >= 308.8 + 1.5 * i) k = i;
      const mv = A.sm(t, 308.8 + 1.5 * k + 0.7, 308.8 + 1.5 * k + 1.4);
      const rx = (k < 2 || mv > 0) ? A.lerp(rxk(k), rxk(Math.min(k + 1, 3)), k < 3 ? mv : 0) : rxk(k);
      // vị trí cũ mờ dần
      for (let i = 0; i < k; i++) rd(rxk(i), 0, 0.22);
      rd(rx, t * 2.4);
      const on = onWin(k);
      if (on) this.beam(c, top(rx), [jx, JET[1]], t);
      if (on) withA(c, 1, () => circle(c, rx + 14, GY - 340, 16, P.sky, null, 0));
      // tên lửa theo vị trí đã nghe cuối cùng
      if (t > 310.7) W.intercept(c, t, [jx - 60, JET[1] + 10], top(rxk(1)), 310.7, 312.7, { L: 90, boom: 100, bend: 0, color: '#f3a79e' });
    }
    // ── run 3: mồi (313.5–318.6)
    if (t >= 313.5 && t < 318.7) {
      const rx = 300;
      D.radarSide(c, rx, GY, 1.4, { ph: 0, a: 0.7 });
      const dx = 880;
      const q = A.eo(t, 313.8, 314.6);
      // máy phát rẻ tiền: hộp + cột nhỏ
      withA(c, q, () => {
        rrect(c, dx - 40, GY - 44, 80, 44, 6, P.sand, P.ink, 4);
        line(c, [[dx, GY - 44], [dx, GY - 130]], P.ink, 6);
        circle(c, dx, GY - 136, 10, P.amber, P.ink, 3);
      });
      if (t < 317.7) D.waves(c, dx, GY - 136, -0.9, -0.15, 700, t, 4, P.amber, 5);
      if (t < 317.7 && t > 314.6) { line(c, [[jx, JET[1] + 30], [dx, GY - 136]], P.enemy, 4, [10, 8]); }
      if (t > 316.0) W.intercept(c, t, [jx - 60, JET[1] + 10], [dx, GY - 120], 316.0, 317.7, { L: 90, boom: 100, bend: 0, color: '#f3a79e' });
      if (t > 317.7) { const f = A.ph(t, 317.7, 318.7); smoke(c, dx, GY - 40, t - 317.7, 1.2, 5); }
    }
    // ── run 4: bật cả ngày thì bị bắn; nhấp nháy thì sống (318.7–325.3)
    if (t >= 318.7 && t < 325.4) {
      const rx = 300;
      const day = A.ph(t, 318.9, 321.5);
      if (t < 321.6) {
        rd(rx, t * 2.4);
        this.beam(c, top(rx), [jx, JET[1]], t);
        // đồng hồ ngày chạy ở góc
        withA(c, A.eo(t, 318.9, 319.6), () => {
          circle(c, 1700, 160, 96, '#fff', P.ink, 6);
          c.beginPath(); c.moveTo(1700, 160); c.arc(1700, 160, 88, -Math.PI / 2, -Math.PI / 2 + day * Math.PI * 2); c.closePath(); c.fillStyle = P.amber; c.fill();
          circle(c, 1700, 160, 96, null, P.ink, 6);
        });
        if (t > 319.4) W.intercept(c, t, [jx - 60, JET[1] + 10], top(rx), 319.4, 321.6, { L: 90, boom: 100, bend: 0, color: '#f3a79e' });
      } else if (t < 323.2) {
        const f = A.ph(t, 321.6, 322.8);
        rd(rx, 0, 1 - f);
        smoke(c, rx, GY - 120, t - 321.6, 1.8, 7);
      } else {
        // nhấp nháy: bật 0.5 s, tắt 1 s, đổi chỗ
        const cyc = ((t - 323.2) / 1.5);
        const k = Math.floor(cyc), fr = cyc - k;
        const rxx = 520 + 130 * k;
        rd(rxx, t * 2.4);
        if (fr < 0.35) this.beam(c, top(rxx), [jx, JET[1]], t);
        W.link(c, [0, 0], [0, 0], P.amber, 1, 0, 0);
      }
    }
  }

  private u2(c: CanvasRenderingContext2D, t: number) {
    // pháo/ tên lửa bên dưới không với tới
    const bats: A.Pt[] = [[260, GY], [720, GY], [1220, GY], [1700, GY]];
    const ux = A.lerp(2200, -200, A.ph(t, 327.8, 335.2));
    const uy = 170;
    const hit = 340.2;
    // tên lửa cũ: bay lên, tắt máy, rơi (không tới)
    const downed = t > hit;
    if (t < 335.2) {
      bats.forEach((b, i) => {
        D.launcherSide(c, b[0], GY, 0.9, { elev: 1.1 });
        const t0 = 329.2 + i * 1.3, p = A.ph(t, t0, t0 + 3.0);
        if (p > 0 && p < 1) {
          const x = b[0] + 40 + p * 80, y = GY - 180 - 330 * Math.sin(p * Math.PI * 0.5) + 340 * p * p * p;
          D.missile(c, x, y, Math.atan2(-330 * Math.cos(p * Math.PI * 0.5) * 0.5 + 1020 * p * p, 80), 80, { flame: p < 0.5 ? 1 : 0 });
        }
      });
    }
    if (!downed && t < 336) {
      D.u2Side(c, ux, uy, 1.2, { dir: -1 });
      // vạch giới hạn: tầm với tới đỉnh thấp hơn U-2
      withA(c, 0.6, () => line(c, [[0, 560], [1920, 560]], P.enemy, 3, [12, 10]));
    }
    // ── tên lửa mới: nổ gần ───────────────────────────────────────
    const nb: A.Pt = [1460, GY];
    const ux2 = A.lerp(2200, -200, A.ph(340.2, 327.8, 335.2 + 5.0));
    if (t >= 334.6) {
      D.launcherSide(c, nb[0], GY, 1.2, { elev: 1.2 });
      D.radarSide(c, 1080, GY, 1.1, { ph: t * 2.2 });
      const upx = A.keysLin(t, [[335.0, 2250], [340.2, 1230], [350, -200]]);
      // U-2 tiếp tục bay thêm cho tới 340.2
      if (t >= 335.2 && t < hit) D.u2Side(c, upx, uy, 1.2, { dir: -1 });
      const l0 = 337.7;
      const tgt: A.Pt = [1230, uy + 10];
      if (t > l0) W.intercept(c, t, [nb[0] + 50, GY - 220], tgt, l0, hit, { L: 100, boom: 0, bend: -40 });
      // vòng gần (ngòi nổ gần)
      const pr = A.eo(t, hit - 0.7, hit);
      if (pr > 0 && t < hit + 0.2) circle(c, tgt[0], tgt[1], 140 * pr, null, P.amber, 5);
      if (t >= hit) {
        D.bang(c, tgt[0], tgt[1], 120, A.ph(t, hit, hit + 0.8));
        const f = A.ph(t, hit, hit + 3.0);
        D.u2Side(c, tgt[0] - f * 160, tgt[1] + f * f * 640, 1.2, { dir: -1, pitch: f * 1.1, a: 1 - A.sm(f, 0.7, 1) });
        smoke(c, tgt[0] - f * 160, tgt[1] + f * f * 640, f * 2.6, 1.6, 6);
        // phi công nhảy dù
        const pj = A.ph(t, 341.7, 346);
        if (t > 341.4 && t < 344) eject(c, tgt[0] - 100 + pj * 60, A.lerp(tgt[1] + 40, GY - 130, pj));
      }
    }
  }

  // 344–353.25: một dải nhiều năm bị dẫn trước, rồi một buổi chiều
  private strip(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#eef3f7'; c.fillRect(0, 0, 1920, 1080);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const e = A.eo(t, 344.2 + i * 0.7, 344.9 + i * 0.7);
      if (e <= 0) continue;
      const x = 130 + i * 290, y = 160;
      const last = i === n - 1;
      withA(c, e, () => {
        rrect(c, x, y, 250, 760, 22, last ? '#fff7ec' : '#fff', last ? P.amber : P.ink, last ? 7 : 4);
        c.save(); c.beginPath(); c.roundRect(x, y, 250, 760, 22); c.clip();
        c.fillStyle = D.GROUND; c.fillRect(x, y + 650, 250, 110);
        D.u2Side(c, x + 125, y + 130, 0.78, { dir: -1 });
        const pr = last ? A.eo(t, 350.6, 351.8) : 1;
        const hp = last ? A.eo(t, 350.4, 351.8) : 0.58;
        const ry = last ? 650 - 560 * hp : 650 - 330;
        D.missile(c, x + 125, y + ry, -Math.PI / 2, 90, { flame: last && pr < 1 ? 1 : 0.0 });
        if (!last) withA(c, 0.8, () => line(c, [[x + 90, y + 320], [x + 160, y + 320]], P.enemy, 5, [8, 6]));
        if (last && hp > 0.98) D.bang(c, x + 125, y + 150, 100, A.ph(t, 351.8, 352.8));
        c.restore();
      });
    }
  }
}
