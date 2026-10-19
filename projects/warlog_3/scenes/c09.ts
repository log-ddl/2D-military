// Chương 9 (408.6 – 438.8): mục đích. Ngư lôi, tên lửa, rồi "không ai biết ở đâu".
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import * as F from './shared/fx';
import { chain } from './_c';

const CUTS = [414.2, 419.5, 423.0];

export default class S09 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 414.2) this.torpedoes(c, t);
    else if (t < 419.5) this.missiles(c, t);
    else if (t < 423.0) this.ballistic(c, t);
    else this.map(c, t);
    for (const at of CUTS) S.cutDip(c, t, at, 0.12);
    chain(c, t);
  }

  private torpedoes(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 160, y: 300, z: 0.78 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    const ship: A.Pt = [620, 0], en: A.Pt = [640, 430], us: A.Pt = [-240, 330];
    const hit1 = t >= 413.8, hit2 = t >= 414.14;
    // tàu mặt nước
    if (!hit1 || t < 414.2) {
      c.save(); c.translate(ship[0], ship[1]);
      A.poly(c, [[-140, -34], [120, -34], [170, -60], [140, 6], [-130, 6]], P.slate, P.ink, A.px(c, 4));
      A.rrect(c, -30, -76, 90, 42, 4, P.paper, P.ink, A.px(c, 3));
      c.restore();
    }
    c.save(); c.translate(en[0], en[1]); c.scale(-1, 1); c.translate(-en[0], -en[1]);
    S.drawSubSide(c, t, { x: en[0], y: en[1], s: 0.55, cut: 0, alpha: 1 });
    c.restore();
    S.drawSubSide(c, t, { x: us[0], y: us[1], s: 0.8, cut: 0.75, hl: ['torp'], glow: P.amber, torp: t < 412.5 ? 2 : t < 412.9 ? 1 : 0, prop: t * 2, breath: t });
    // hai ngư lôi
    for (const [t0, to] of [[412.5, [ship[0] - 20, ship[1] + 20] as A.Pt], [412.9, [en[0] - 20, en[1]] as A.Pt]] as const) {
      const from: A.Pt = [us[0] + 260 * 0.8, us[1] - 11 * 0.8 + (t0 > 412.7 ? 17 : 0)];
      const p = A.ph(t, t0, t0 + 1.3);
      if (p > 0 && p < 1) {
        const x = A.lerp(from[0], to[0], p), y = A.lerp(from[1], to[1], p);
        const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
        S.torpedo(c, x, y, ang, 1.4);
        for (let i = 0; i < 7; i++) A.circle(c, x - Math.cos(ang) * (30 + i * 16), y - Math.sin(ang) * (30 + i * 16), 3 + i * 0.4, '#fff', P.sky, A.px(c, 1.5));
      }
    }
    F.explosion(c, ship[0] - 20, ship[1] + 10, 130, A.ph(t, 413.8, 414.5), A.px(c, 3));
    F.explosion(c, en[0], en[1], 150, A.ph(t, 414.12, 414.9), A.px(c, 3));
    K.end(c);
  }

  private missiles(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 120, y: 80, z: 1.0 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    const us: A.Pt = [0, 150];
    S.drawSubSide(c, t, { x: us[0], y: us[1], s: 1, cut: 1, hl: ['torp'], glow: P.amber, torp: t < 417.2 ? 2 : 1, prop: 0, breath: t });
    // tên lửa phóng từ ống mũi
    const p1 = A.ph(t, 417.2, 419.4);
    if (p1 > 0) {
      const from: A.Pt = [us[0] + 300, us[1] - 10], top: A.Pt = [us[0] + 560, -10], end: A.Pt = [us[0] + 1400, -420];
      const q = A.eio(p1, 0, 0.4);
      let x: number, y: number, ang: number;
      if (p1 < 0.4) { x = A.lerp(from[0], top[0], q); y = A.lerp(from[1], top[1], q); ang = -0.8; }
      else { const r = (p1 - 0.4) / 0.6; x = A.lerp(top[0], end[0], r); y = A.lerp(top[1], end[1], r * r); ang = Math.atan2(end[1] - top[1], end[0] - top[0]); }
      c.save(); c.translate(x, y); c.rotate(ang);
      A.rrect(c, -34, -7, 68, 14, 7, P.light, P.ink, A.px(c, 3)); A.poly(c, [[-12, 0], [-30, -20], [-6, -7]], P.slate, P.ink, A.px(c, 2));
      c.restore();
      F.smoke(c, x - Math.cos(ang) * 30, y - Math.sin(ang) * 30, 0.6, 0.5, 3, '#cbd5e1', 10);
    }
    // ô phóng đứng trên tháp phía sau
    const h = A.sm(t, 416.8, 417.4);
    A.rrect(c, -150, us[1] - 62, 70, 10, 3, P.dark, P.ink, A.px(c, 2));
    const p2 = A.ph(t, 418.0, 419.4);
    if (p2 > 0) {
      const y = us[1] - 70 - 520 * p2 * p2;
      c.save(); c.translate(-115, y);
      A.rrect(c, -7, -32, 14, 64, 7, P.light, P.ink, A.px(c, 3));
      c.restore();
      F.smoke(c, -115, y + 40, 0.5, 0.5, 3, '#cbd5e1', 6);
    }
    void h;
    K.end(c);
  }

  private ballistic(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 560, z: 1.0 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    // tàu sâu, im
    S.drawSubSide(c, t, { x: 0, y: 760, s: 0.6, cut: 0, prop: t * 0.5, alpha: 1 });
    // tên lửa đạn đạo nằm trong thân (hình mờ)
    const g = A.sm(t, 420.5, 421.3);
    A.withA(c, g, () => {
      for (const x of [-40, 50, 140]) { A.rrect(c, x - 14, 700, 28, 100, 14, 'rgba(255,255,255,0.85)', P.ink, A.px(c, 3)); }
    });
    S.drawSubSide(c, t, { x: 0, y: 760, s: 0.6, cut: 0.0 });
    K.end(c);
    // vòng "không ai biết" bắt đầu nở
    const r = A.sm(t, 421.8, 423.0);
    A.withA(c, r, () => { c.setLineDash([16, 12]); A.circle(c, 960, 560, 80 + 320 * r, null, P.ink, 5); c.setLineDash([]); });
  }

  private map(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#cde3ee');
    for (let x = 0; x <= A.W; x += 120) A.line(c, [[x, 0], [x, A.H]], 'rgba(60,110,140,0.14)', 2);
    for (let y = 0; y <= A.H; y += 120) A.line(c, [[0, y], [A.W, y]], 'rgba(60,110,140,0.14)', 2);
    const r = 330 + 110 * A.sm(t, 423, 438);
    c.fillStyle = 'rgba(30,41,59,0.07)'; c.beginPath(); c.arc(960, 520, r, 0, Math.PI * 2); c.fill();
    c.setLineDash([16, 12]); A.circle(c, 960, 520, r, null, P.ink, 5); c.setLineDash([]);
    // những kẻ tìm kiếm quét qua mà không thấy
    const ships: [number, number][] = [[260, 220], [1700, 300], [300, 860], [1640, 820]];
    for (const [x, y] of ships) {
      S.waves(c, x, y, t, { R: 340, n: 3, per: 2.4, color: P.slate, w: 3, a: 0.9 });
      c.save(); c.translate(x, y); A.poly(c, [[-50, -14], [30, -14], [60, 0], [30, 14], [-50, 14]], P.slate, P.ink, 3); c.restore();
    }
    // lịch tuần tra: mỗi ô một ngày, không có gì xảy ra
    const k = Math.floor(A.sm(t, 429.7, 436.4) * 90);
    A.withA(c, A.sm(t, 429.7, 430.4), () => {
      for (let i = 0; i < 90; i++) {
        const cx = 360 + (i % 30) * 40, cy = 850 + Math.floor(i / 30) * 18;
        A.rrect(c, cx, cy - 6, 32, 12, 3, i < k ? P.olive : '#fff', P.ink2, 2);
      }
    });
    void K; void U;
  }
}
