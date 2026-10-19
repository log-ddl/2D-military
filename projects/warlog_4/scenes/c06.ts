// Chương 6 (188.8 – 224.5): lò phản ứng giải chuyện máy chạy mãi, đẻ ra chuyện nhiên liệu và bom cho máy bay. NGANG mặt cắt thân.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const LAUNCH = [212.6, 215.2, 217.8];
const SJ = 1.2, JY = S.JET_H * SJ;

export default class C06 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam = K.track(t, [
      [188.8, { x: -140, y: 80, z: 2.0 }], [203.0, { x: -140, y: 80, z: 2.0 }],
      [206.4, { x: 190, y: 40, z: 1.9 }], [224.5, { x: 190, y: 40, z: 1.9 }],
    ], A.eio);
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 160, wave: 5 });
    // mức nhiên liệu / bom: đầy → cạn nhanh khi máy bay cất cánh
    const burn = (tt: number) => LAUNCH.reduce((s, L) => s + A.sm(tt, L, L + 2.4) * 0.22, 0) + A.sm(tt, 210.5, 219) * 0.2;
    const show = A.sm(t, 205.0, 207.0);
    const fuel = 1 - burn(t), bombs = 1 - burn(t) * 0.9;
    const lift = A.eio(t, 219.6, 222.4);
    const elev: number[] = [0, 1 - lift];
    S.carrierSide(c, t, {
      x: 0, y: 0, cut: A.sm(t, 188.8, 189.8), noIsland: true,
      reactor: 0.65 + 0.3 * Math.sin(t * 2.2), shaft: t * 9,
      mags: show > 0 ? [Math.max(0.05, fuel) * show, Math.max(0.05, bombs) * show] : undefined,
      elev: t > 219 ? elev : undefined, hangar: t > 219 ? A.sm(t, 218.6, 219.4) : 0,
    });
    // dòng năng lượng: lò → tua-bin → trục
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.9 + i / 5) % 1);
      A.circle(c, A.lerp(-26, -154, u), 111, 4, P.amber, null, 0);
      A.circle(c, A.lerp(-200, -440, u), 114, 4, P.amber, null, 0);
    }
    // bọt nước sau chân vịt
    for (let i = 0; i < 6; i++) {
      const u = ((t * 1.4 + i / 6) % 1);
      A.circle(c, -452 - u * 120, 114 + Math.sin(u * 9 + i) * 8, 4 + u * 3, 'rgba(255,255,255,0.8)', null, 0);
    }
    // máy bay cất cánh ở mũi
    for (const L of LAUNCH) {
      const u = (t - L) / 1.9;
      if (u < -0.2 || u > 3) continue;
      const x0 = 200;
      const d = A.clamp01(u);
      let x = x0 + 270 * d * d, y = -JY, ang = 0;
      if (u > 1) { const k = u - 1; x = 470 + 340 * k; y = -JY - 90 * k - 20 * k * k; ang = -0.25; }
      S.jetSide(c, x, y, SJ, { ang, gear: u > 1.4 ? 0 : 1, flame: u > 0 ? 0.9 : 0, a: A.sm(u, -0.2, 0) * (1 - A.sm(u, 2.2, 3)) });
    }
    // chiếc đậu chờ ở đầu máy phóng
    if (t > 209 && t < 224.5) {
      const waiting = LAUNCH.every(L => t < L - 0.2) || LAUNCH.some(L => t > L + 1 && t < L + 1.9);
      S.jetSide(c, 200, -JY, SJ, { gear: 1, a: 0.0 * (waiting ? 1 : 0) });
    }
    S.carrierIsland(c, t, { x: 0, y: 0 });
    // bom và thùng lên thang máy
    if (t > 219.6) {
      const y = A.lerp(54, 2, lift);
      A.capsule(c, [210, y - 7], [240, y - 7], 8, P.enemyLight, P.ink, A.px(c, 2.5));
      A.capsule(c, [262, y - 7], [292, y - 7], 8, P.amber, P.ink, A.px(c, 2.5));
    }
    K.end(c);

    // — bồn nhiên liệu cạn vs lò: hiện lúc nói "không có bồn nhiên liệu để cạn"
    const pa = A.win(t, 193.6, 199.0, 0.5, 0.6);
    if (pa > 0) {
      c.save(); c.globalAlpha *= pa;
      const x = 170, y = 230;
      A.rrect(c, x - 60, y - 70, 120, 140, 14, '#ffffff', P.ink, 5);
      const lv = 1 - A.sm(t, 194.0, 198.0) * 0.95;
      c.save(); c.beginPath(); c.roundRect(x - 56, y - 66, 112, 132, 11); c.clip();
      c.fillStyle = 'rgba(245,158,11,0.8)'; c.fillRect(x - 56, y + 66 - 132 * lv, 112, 132 * lv + 2);
      c.restore();
      // thùng nhiên liệu của tàu thường: cạn
      const ex = x + 190;
      A.circle(c, ex, y, 50, A.lerpColor('#ffffff', '#fde68a', 0.4), P.ink, 5);
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 - Math.PI / 2;
        c.beginPath(); c.arc(ex, y, 30, a - 0.5, a + 0.5); c.strokeStyle = P.amber; c.lineWidth = 11; c.stroke();
      }
      A.circle(c, ex, y, 9, P.amber, null, 0);
      c.restore();
    }
    // — đổi hướng liên tục: bản đồ nhỏ
    const ma = A.win(t, 199.0, 203.7, 0.5, 0.5);
    if (ma > 0) {
      c.save(); c.globalAlpha *= ma;
      const x = 1640, y = 260;
      A.rrect(c, x - 170, y - 130, 340, 260, 18, '#cfe5f0', P.ink, 4);
      const path: A.Pt[] = [[-130, 80], [-60, 50], [20, 80], [70, -10], [0, -60], [-70, -20], [-10, 20], [60, 70], [130, 30], [150, -50]];
      const prog = A.sm(t, 199.4, 203.2);
      S.dashPath(c, path.map(([a, b]) => [x + a, y + b] as A.Pt), prog, P.ink, 4, [999, 1]);
      const n = Math.floor(prog * (path.length - 1));
      const [ax, ay] = path[Math.min(n, path.length - 1)]!;
      A.circle(c, x + ax, y + ay, 12, P.olive, P.ink, 3);
      c.restore();
    }
    chain(c, t);
  }
}
