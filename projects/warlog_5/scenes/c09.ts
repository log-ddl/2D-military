// Chương 9 (340.3 – 368.5): đạn cũng là một lựa chọn — ngòi nổ và loại đạn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as X from './_art';

export const T9 = { impact: 343.3, delay: 344.6, delayBoom: 345.2, air: 346.9, airBoom: 347.5, smoke: 351.7, flare: 353.5, bomb: 355.1, adv: 366.0 };
const COLS = [-560, 0, 560];

function pit(c: CanvasRenderingContext2D, x: number, soldiers = true, w = 260) {
  // mặt cắt đất đã đào hố
  A.rrect(c, x - w / 2, 0, w, 160, 0, '#b8a97a', P.ink, 3);
  A.rrect(c, x - w / 2 + 20, -8, w - 40, 130, 6, '#e6dcc0', P.ink, 3);
  if (soldiers) { X.soldier(c, x - 36, 112, 0.7, -1, 'foe'); X.soldier(c, x + 36, 112, 0.7, -1, 'foe'); }
  A.rrect(c, x - w / 2 - 20, -26, 60, 28, 6, '#bfb48a', P.ink, 3);
  A.rrect(c, x + w / 2 - 40, -26, 60, 28, 6, '#bfb48a', P.ink, 3);
}

export default class S09 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 351.0) this.fuses(c, t);
    else if (t < 356.7) this.kinds(c, t);
    else if (t < 359.2) this.row(c, t);
    else if (t < 363.4) this.crew(c, t);
    else this.use(c, t);
    for (const at of [351.0, 356.7, 359.2, 363.4]) X.dip(c, t, at, 0.1);
  }

  private fuses(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: -50, z: 1.0 };
    K.begin(c, cam);
    X.sideGround(c, cam, 0, '#cfc59b');
    for (const x of COLS) pit(c, x);
    // ba đạn rơi gần thẳng đứng
    const drop = (x: number, t0: number, t1: number, yEnd: number, ang = Math.PI / 2) => {
      const p = A.ph(t, t0, t1);
      if (p > 0 && p < 1) X.shell(c, x, A.lerp(-760, yEnd, A.ei(t, t0, t1)), ang, 1.0);
    };
    drop(COLS[0]!, T9.impact - 0.8, T9.impact, -30);
    // chạm: nổ ngay trên mặt đất
    F.explosion(c, COLS[0]!, -20, 120, A.ph(t, T9.impact, T9.impact + 0.7), 4);
    // chậm: xuyên đất rồi nổ
    drop(COLS[1]!, T9.delay - 0.8, T9.delay, -30);
    if (t >= T9.delay && t < T9.delayBoom) {
      const y = A.lerp(-30, 90, A.ph(t, T9.delay, T9.delayBoom));
      X.shell(c, COLS[1]!, y, Math.PI / 2, 1.0);
    }
    F.explosion(c, COLS[1]!, 90, 150, A.ph(t, T9.delayBoom, T9.delayBoom + 0.7), 4);
    // nổ trên không: mảnh rơi xuống hào
    drop(COLS[2]!, T9.air - 0.9, T9.air, -330);
    if (t >= T9.airBoom - 0.6 && t < T9.airBoom) {
      const y = A.lerp(-330, -280, A.ph(t, T9.air, T9.airBoom));
      X.shell(c, COLS[2]!, y, Math.PI / 2, 1.0);
    }
    if (t >= T9.airBoom) {
      F.explosion(c, COLS[2]!, -300, 80, A.ph(t, T9.airBoom, T9.airBoom + 0.5), 4);
      const fp = A.ph(t, T9.airBoom, T9.airBoom + 1.2);
      for (let i = 0; i < 18; i++) {
        const an = Math.PI * (0.2 + 0.6 * (i / 17));
        const r = A.eo(fp, 0, 1) * 430;
        const x0 = COLS[2]!, y0 = -300;
        const xx = x0 + Math.cos(an) * r * 0.9, yy = y0 + Math.sin(an) * r;
        A.withA(c, 1 - A.sm(fp, 0.7, 1.0), () => A.line(c, [[xx, yy], [xx - Math.cos(an) * 26, yy - Math.sin(an) * 26]], P.dark, A.px(c, 4)));
      }
    }
    K.end(c);
  }

  private kinds(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: -260, z: 0.9 };
    // trời tối khi pháo sáng
    const night = A.win(t, T9.flare - 0.2, T9.bomb - 0.1, 0.4, 0.5) * 0.55;
    K.begin(c, cam);
    X.sideGround(c, cam, 0, '#cfc59b');
    const cols = [-560, 40, 600];
    cols.forEach((x) => pit(c, x));
    // khói: đạn rơi, bốc màn khói che hào
    const drop = (x: number, t0: number, t1: number, yEnd: number) => { const p = A.ph(t, t0, t1); if (p > 0 && p < 1) X.shell(c, x, A.lerp(-760, yEnd, A.ei(t, t0, t1)), Math.PI / 2, 1.0); };
    drop(cols[0]!, T9.smoke - 0.8, T9.smoke, -30);
    if (t >= T9.smoke) {
      const k = A.ph(t, T9.smoke, T9.smoke + 2.2);
      for (let i = 0; i < 11; i++) {
        const dx = (i - 5) * 46, h = 80 + 160 * A.eo(k, 0, 1) * (0.6 + 0.4 * Math.sin(i * 1.7));
        A.circle(c, cols[0]! + dx, -h * 0.6, 54 + 18 * Math.sin(i), 'rgba(220,224,230,0.95)', 'rgba(100,116,139,0.6)', 3);
      }
    }
    // pháo sáng: nổ cao, dù, ánh sáng
    if (t >= T9.flare - 0.8) {
      const p = A.ph(t, T9.flare, T9.flare + 1.6);
      if (t < T9.flare) X.shell(c, cols[1]!, A.lerp(-760, -620, A.ph(t, T9.flare - 0.8, T9.flare)), Math.PI / 2, 1.0);
      else {
        const y = A.lerp(-620, -240, A.eo(p, 0, 1));
        A.circle(c, cols[1]!, y, 120 * (0.6 + 0.4 * Math.sin(t * 20)), 'rgba(253,230,138,0.35)', null, 0);
        A.circle(c, cols[1]!, y, 38, '#fff7d6', P.amber, 4);
        c.beginPath(); c.arc(cols[1]!, y - 60, 70, Math.PI, 0); c.closePath(); A.fs(c, '#fff', P.ink, 4);
        for (const dx of [-70, 0, 70]) A.line(c, [[cols[1]! + dx, y - 60], [cols[1]!, y - 6]], P.ink, 2.5);
      }
    }
    // bom con: đạn nổ ở cao, thả nhiều quả nhỏ
    drop(cols[2]!, T9.bomb - 0.9, T9.bomb, -400);
    if (t >= T9.bomb) {
      const p = A.ph(t, T9.bomb, T9.bomb + 1.3);
      for (let i = 0; i < 9; i++) {
        const dx = (i - 4) * 46 * A.eo(p, 0, 0.5), y = A.lerp(-400, -20, A.ei(p, 0.15, 1));
        A.circle(c, cols[2]! + dx, y, 12, P.dark, P.ink, 3);
        if (p > 0.95) F.explosion(c, cols[2]! + dx, -20, 40, A.ph(t, T9.bomb + 1.25, T9.bomb + 1.7), 3);
      }
    }
    K.end(c);
    if (night > 0.01) { c.save(); c.globalAlpha = night; c.fillStyle = '#0b1530'; c.fillRect(0, 0, A.W, A.H); c.restore(); }
  }

  // 356.7–359.2: mỗi loại là một câu trả lời cho một mục tiêu
  private row(c: CanvasRenderingContext2D, t: number) {
    const noses = [P.enemy, '#f59e0b', '#3b82f6', '#94a3b8', '#facc15', '#7c3aed'];
    noses.forEach((col, i) => {
      const a = A.back(t, 356.8 + i * 0.28, 357.3 + i * 0.28);
      if (a <= 0) return;
      const x = 260 + i * 280;
      c.save(); c.translate(x, 540); c.scale(Math.min(1, a) * 2.0, Math.min(1, a) * 2.0); c.rotate(-Math.PI / 2);
      A.rrect(c, -40, -11, 62, 22, 5, P.oliveLight, P.ink, 3);
      A.poly(c, [[20, -11], [58, 0], [20, 11]], col, P.ink, 3);
      A.rrect(c, -26, -13, 9, 26, 2, '#d1a23c', P.ink, 2);
      c.restore();
    });
  }

  // 359.3–363.4: chọn ngòi và liều trong vài giây nạp
  private crew(c: CanvasRenderingContext2D, t: number) {
    c.save(); c.translate(560, 540); c.rotate(-Math.PI / 2); c.scale(3.2, 3.2);
    A.rrect(c, -40, -11, 62, 22, 5, P.oliveLight, P.ink, 3);
    A.poly(c, [[20, -11], [58, 0], [20, 11]], P.enemy, P.ink, 3);
    A.rrect(c, -26, -13, 9, 26, 2, '#d1a23c', P.ink, 2);
    c.restore();
    // mặt số ngòi quay
    const a = A.keys(t, [[359.4, 0], [360.4, 1.2], [361.0, 1.2], [362.0, 3.4], [363.0, 3.4]]);
    c.save(); c.translate(560, 270); A.circle(c, 0, 0, 68, '#fff', P.ink, 6);
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; A.line(c, [[Math.cos(an) * 48, Math.sin(an) * 48], [Math.cos(an) * 60, Math.sin(an) * 60]], P.ink, 4); }
    A.line(c, [[0, 0], [Math.cos(a - 1.57) * 46, Math.sin(a - 1.57) * 46]], P.amber, 8);
    c.restore();
    // liều thuốc: số túi thay đổi
    const n = Math.round(A.keys(t, [[359.4, 3], [361.2, 3], [361.9, 2], [362.6, 2], [363.0, 4]]));
    for (let i = 0; i < n; i++) X.bag(c, 1180, 800 - i * 56, 1.6);
    X.stopwatch(c, 1500, 330, 120, A.ph(t, 359.4, 363.3) * 0.18, P.olive);
  }

  // 363.4–368.5: khói để tiến lên; mảnh để trừng trị hào
  private use(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 620, y: -220, z: 0.85 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const tx = 1300;
    pit(c, tx);
    // màn khói
    const k = A.sm(t, 363.7, 365.0);
    for (let i = 0; i < 9; i++) {
      const h = 120 + 150 * k * (0.7 + 0.3 * Math.sin(i * 2));
      A.circle(c, 560 + (i % 3) * 30, -h * (0.35 + 0.15 * (i % 4)) - (i * 10) % 60, 60 + 14 * Math.sin(i), 'rgba(220,224,230,0.96)', 'rgba(100,116,139,0.55)', 3);
    }
    // bộ binh tiến dưới màn khói
    const mv = A.eio(t, 364.2, 367.8);
    for (let i = 0; i < 4; i++) X.soldier(c, 40 + mv * 700 - i * 90, 0, 1.0, 1, 'ally', 0.1, t * 6 + i);
    // mảnh trên hào
    if (t >= T9.adv) {
      const p = A.ph(t, T9.adv, T9.adv + 1.2);
      F.explosion(c, tx, -300, 80, A.ph(t, T9.adv, T9.adv + 0.5), 4);
      for (let i = 0; i < 18; i++) {
        const an = Math.PI * (0.2 + 0.6 * (i / 17)), r = A.eo(p, 0, 1) * 430;
        const xx = tx + Math.cos(an) * r * 0.9, yy = -300 + Math.sin(an) * r;
        A.withA(c, 1 - A.sm(p, 0.7, 1.0), () => A.line(c, [[xx, yy], [xx - Math.cos(an) * 26, yy - Math.sin(an) * 26]], P.dark, A.px(c, 4)));
      }
    }
    K.end(c);
    void U; void F;
  }
}
