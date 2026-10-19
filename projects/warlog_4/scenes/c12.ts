// Chương 12 (433.4 – 479.9): thứ quan trọng là nhịp boong. TRÊN (chu trình) → NGANG (quay lại phi công, khung mở đầu) → hull quanh sàn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';
import { LOOP } from './c01';

const SJ = 1.2, JY = S.JET_H * SJ;
const T_SIDE = 457.0;
const TD = 462.5, CATCH = TD + 0.06;
const TAXI = S.makePath([[-100, -18], [-30, -14], [60, -14], [140, -16], [200, -17]], 1);
const CYC_LEN = LOOP.len;
const SPEED = 520;                 // tốc độ vẽ nhanh của chu trình (sơ đồ, không phải đo)

const JERSEY = ['#a855f7', '#ef4444', '#22c55e', '#facc15', '#38bdf8'];

export default class C12 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < T_SIDE) this.top(c, t); else this.side(c, t);
    S.cutDip(c, t, T_SIDE, 0.14);
    const mid = A.sm(t, 461.8, 462.8) * (1 - A.sm(t, 470.0, 471.0));
    const out = 1 - A.sm(t, 471.0, 472.0) * (1 - 0);
    chain(c, t, {
      allLit: 1, mid, a: t < 471.5 ? 1 : out,
      pulse: [[0, 464.1], [1, 464.9], [2, 465.7], [4, 466.8], [5, 467.5]],
    });
  }

  // vị trí một phản lực trong chu trình (toạ độ tàu) theo pha giây
  private cycle(sec: number): { x: number; y: number; ang: number; flame: number; gear: number; stop?: 'fuel' | 'arm'; a: number } {
    const flyT = CYC_LEN / SPEED, taxiT = 3.0;
    const tot = flyT + taxiT;
    const ph = ((sec % tot) + tot) % tot;
    if (ph < flyT) {
      const u = ph / flyT;
      const [x, y, ang] = LOOP.at(u);
      const a = Math.min(A.sm(u, 0, 0.02), 1);
      return { x, y, ang, flame: u < 0.14 ? 1 : 0, gear: u < 0.04 || u > 0.7 ? 1 : 0, a };
    }
    const k = (ph - flyT) / taxiT;
    const [x, y, ang] = TAXI.at(A.clamp01(k * 1.15));
    const stop = k > 0.25 && k < 0.5 ? 'fuel' : k > 0.5 && k < 0.8 ? 'arm' : undefined;
    return { x, y, ang, flame: 0, gear: 1, stop, a: 1 };
  }

  private top(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(t, [
      [433.4, { x: 15, y: 0, z: 1.5 }], [441.6, { x: 15, y: 0, z: 1.5 }],
      [443.4, { x: -170, y: -90, z: 0.92 }], [T_SIDE, { x: -170, y: -90, z: 0.92 }],
    ], A.eio);
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 50);
    S.carrierTop(c, t, { x: 0, y: 0, angled: 1, hl: t > 445.0 && t < 446.0 ? 'wire' : t > 445.0 && t < 445.5 ? 'cat' : undefined });
    // máy bay đậu: đếm số máy bay
    const row = (n: number, y: number, x0: number, dx: number, a0: number) => {
      for (let i = 0; i < n; i++) {
        const p = A.back(t, a0 + i * 0.22, a0 + i * 0.22 + 0.35) * (1 - A.sm(t, 441.2 + i * 0.05, 441.9 + i * 0.05));
        if (p > 0.01) S.jetTop(c, x0 + i * dx, y, 0.85 * Math.min(1, p), { fold: 1 });
      }
    };
    row(8, -40, -120, 78, 436.0);
    row(4, 44, 250, 70, 437.4);
    // chu trình: 4 phản lực chạy vòng
    const on = A.sm(t, 442.4, 443.4);
    if (on > 0) {
      const speedUp = 1 + 0.35 * A.sm(t, 449.0, 451.0);
      for (let i = 0; i < 4; i++) {
        const sec = (t - 442.4) * speedUp + i * 3.4;
        const j = this.cycle(sec);
        S.jetTop(c, j.x, j.y, 1.15, { ang: j.ang, flame: j.flame, a: j.a * on, hero: i === 0 });
        // trạm tiếp nhiên liệu / nạp vũ khí hiện khi dừng
        if (j.stop === 'fuel') this.icon(c, j.x, j.y + 26, 'fuel');
        if (j.stop === 'arm') this.icon(c, j.x, j.y + 26, 'arm');
      }
    }
    // người: áo màu dọc boong, nhịp đập
    const pp = A.sm(t, 453.0, 454.4);
    if (pp > 0) {
      for (let i = 0; i < 20; i++) {
        const x = -380 + A.rnd(i + 3) * 820, y = -34 + A.rnd(i * 4 + 1) * 70;
        const beat = A.bump(t, 453.4 + (i % 5) * 0.18 + Math.floor((t - 453.4) / 0.9) * 0.9, 0.5);
        S.personTop(c, x, y, 9 * pp * (1 + 0.2 * beat), JERSEY[i % 5]!);
      }
      // nhịp: vòng tròn đập từ tâm tàu mỗi 0.9 s
      for (let k = 0; k < 2; k++) {
        const ph = (((t - 453.4) / 0.9) + k * 0.5) % 1;
        A.circle(c, 0, 0, 120 + 520 * ph, null, `rgba(245,158,11,${0.55 * (1 - ph)})`, A.px(c, 5));
      }
    }
    // vạch đếm số chuyến bay (không có con số)
    K.end(c);
    const tick = Math.max(0, Math.floor((t - 444.0) / 3.4 * 4)) + 0;
    const ta = A.sm(t, 440.0, 441.0);
    if (ta > 0) {
      c.save(); c.globalAlpha *= ta;
      const n = Math.min(24, Math.floor(Math.max(0, t - 440.4) * 1.6) + tick);
      for (let i = 0; i < n; i++) {
        const g = Math.floor(i / 5), r = i % 5;
        const x = 120 + g * 70;
        if (r < 4) A.line(c, [[x + r * 12, 130], [x + r * 12, 176]], P.ink, 6);
        else A.line(c, [[x - 6, 168], [x + 52, 138]], P.ink, 6);
      }
      c.restore();
    }
  }

  private icon(c: CanvasRenderingContext2D, x: number, y: number, k: 'fuel' | 'arm') {
    A.circle(c, x, y, 16, '#ffffff', P.ink, A.px(c, 2.5));
    if (k === 'fuel') { c.beginPath(); c.moveTo(x, y - 9); c.bezierCurveTo(x + 8, y, x + 8, y + 8, x, y + 8); c.bezierCurveTo(x - 8, y + 8, x - 8, y, x, y - 9); c.fillStyle = '#a855f7'; c.fill(); }
    else A.capsule(c, [x - 7, y], [x + 7, y], 5, P.enemyLight, P.ink, A.px(c, 2));
  }

  // ───── NGANG: quay lại đúng khung mở đầu
  private side(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = t < TD
      ? { x: -212 + 215 * (t - TD) + 260, y: -70, z: 1.85 }
      : K.track(t, [
        [TD, { x: -212 + 260, y: -70, z: 1.85 }],
        [463.6, { x: -60, y: -60, z: 1.55 }], [471.8, { x: -60, y: -60, z: 1.55 }],
        [474.6, { x: 15, y: -20, z: 1.3 }], [479.9, { x: 15, y: -20, z: 1.3 }],
      ], A.eio);
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 90 });
    // thân mờ dần rồi bao lại quanh sàn
    const deckOnly = A.clamp01(1 - A.sm(t, 472.8, 474.4) + A.sm(t, 477.9, 479.3));
    S.carrierSide(c, t, { x: 0, y: 0, noIsland: true, deckOnly });
    S.WIRES_X.forEach((wx, i) => {
      const hit = i === 2 && ((t >= CATCH && t < 470) || (t >= 472.4 && t < 476));
      const jj = (t >= 470.4 ? this.jet2(t) : null) ?? this.jet1(t);
      const hx = jj.x - 66 * SJ;
      if (hit) S.wireSide(c, wx, Math.max(2, hx - wx), P.amber, 0);
      else S.wireSide(c, wx, 0, '#e2e8f0');
    });
    // rãnh máy phóng
    if (t > 472.4) A.line(c, [[200, 5], [490, 5]], P.amber, A.px(c, 4));
    // chiếc đầu tiên (phi công)
    const j = this.jet1(t);
    if (t < 470.4) S.jetSide(c, j.x, j.y, SJ, { ang: j.ang, gear: 1, hook: 1, flame: j.flame, hero: true });
    // chiếc sau một phút
    const j2 = this.jet2(t);
    if (j2) S.jetSide(c, j2.x, j2.y, SJ, { ang: j2.ang, gear: 1, hook: 1, flame: j2.flame });
    // cuối: một chiếc cất cánh bằng máy phóng, một chiếc hạ cánh
    if (t >= 474.4) {
      const u = (t - 474.8) / 1.7;
      if (u > -0.2 && u < 2.5) {
        const d = A.clamp01(u);
        let x = 200 + 270 * d * d, y = -JY, ang = 0, gear = 1;
        if (u > 1) { const k = u - 1; x = 470 + 330 * k; y = -JY - 70 * k - 20 * k * k; ang = -0.24; gear = 1 - A.sm(k, 0.3, 0.8); }
        S.jetSide(c, x, y, SJ, { ang, gear, flame: u > 0 ? 0.9 : 0, hero: true, a: A.sm(u, -0.2, 0) });
      }
      const tl = t - 475.4;
      if (tl > -1.6 && tl < 2.4) {
        let x: number, y: number, ang = 0;
        if (tl < 0) { x = -212 + 215 * tl; y = -JY - (-212 - x) * 0.075; ang = -0.1; }
        else { x = -199 + 180 * (1 - Math.pow(1 - A.clamp01(tl / 2.0), 2)); y = -JY; }
        S.jetSide(c, x, y, SJ, { ang, gear: 1, hook: 1, flame: 0.5, a: A.sm(tl, -1.6, -1.2) });
      }
    }
    S.carrierIsland(c, t, { x: 0, y: 0 });
    K.end(c);
    // cần ga ở mức tối đa + số: nhắc lại khung mở đầu
    const th = A.sm(t, 458.4, 459.2) * (1 - A.sm(t, 463.4, 464.0));
    if (th > 0) {
      c.save(); c.globalAlpha *= th;
      const x = 1740, y = 330;
      A.rrect(c, x - 80, y - 160, 160, 330, 26, 'rgba(255,255,255,0.9)', P.ink, 4);
      A.rrect(c, x - 9, y - 120, 18, 240, 9, '#e2e8f0', P.ink, 3);
      A.rrect(c, x - 9, y - 120, 18, 240, 9, 'rgba(245,158,11,0.55)', null, 0);
      A.rrect(c, x - 26, y - 134, 52, 28, 10, P.amber, P.ink, 4);
      c.restore();
    }
    S.tag(c, '240 km/h', 960 + 300, 190, A.win(t, 459.2, 462.2, 0.2, 0.4), { size: 46 });
  }

  private jet1(t: number) {
    // như chương 1: đáp, ăn dây ba
    let x: number, y = -JY, ang = 0;
    if (t < TD) { x = -212 + 215 * (t - TD); y = -JY - (-212 - x) * 0.075; ang = -0.1 * (1 - A.sm(t, TD - 0.5, TD)); }
    else if (t < CATCH) x = -212 + 215 * (t - TD);
    else x = -199 + 180 * (1 - Math.pow(1 - A.clamp01((t - CATCH) / 2.0), 2));
    return { x, y, ang, flame: A.sm(t, TD + 0.1, TD + 0.7) * (1 - A.sm(t, 465.0, 466.0)) };
  }

  // chiếc thứ hai hạ cánh "một phút sau" (472.0)
  private jet2(t: number) {
    if (t < 469.8 || t > 473.4) return null;
    const TD2 = 472.3;
    let x: number, y = -JY, ang = 0;
    if (t < TD2) { x = -212 + 215 * (t - TD2); y = -JY - (-212 - x) * 0.075; ang = -0.1 * (1 - A.sm(t, TD2 - 0.5, TD2)); }
    else x = -199 + 180 * (1 - Math.pow(1 - A.clamp01((t - TD2 - 0.06) / 1.0), 2));
    if (t > 473.0) return { x, y, ang, flame: 0, ...{} } as { x: number; y: number; ang: number; flame: number };
    return { x, y, ang, flame: 0.5 };
  }
}
