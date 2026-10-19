// Chương 1 (0 – 47.96): hook. Ống thép chứa người ngủ → biển ép → lỗ nhỏ → không ai biết ở đâu → bốn đòi hỏi → chuỗi.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain, icon } from './_c';

const DEPTH = 900;          // y của trục tàu (300 m ở 3 đơn vị / m)
const SIDE_CAM: [number, K.Cam][] = [
  [0, { x: -4, y: DEPTH - 4, z: 3.3 }], [5.2, { x: 8, y: DEPTH - 4, z: 3.5 }],
  [7.9, { x: 0, y: 520, z: 0.78 }], [8.9, { x: 0, y: 520, z: 0.78 }],
  [10.3, { x: 140, y: 800, z: 4.2 }], [12.2, { x: 140, y: 800, z: 4.5 }],
];

export default class S01 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 12.2) this.sideA(c, t);
    else if (t < 17.1) this.endView(c, t);
    else if (t < 26.64) this.topMap(c, t);
    else this.sideE(c, t);
    if (t >= 12.2 && t < 12.4) S.cutDip(c, t, 12.2, 0.12);
    S.cutDip(c, t, 17.1, 0.12); S.cutDip(c, t, 26.64, 0.14);
    chain(c, t, { intro: [40.5, 45.4, 47.7] });
  }

  private sideA(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(t, SIDE_CAM, A.eio);
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1500 });
    S.drawSubSide(c, t, { x: 0, y: DEPTH, s: 1, cut: 1, plant: 'nuclear', plantRun: 0.5, breath: t * 1.7, trimF: 0.4, trimA: 0.4 });
    // áp lực biển ép vào mọi phía
    const pa = A.sm(t, 7.0, 7.6) * (1 - A.sm(t, 11.6, 12.1));
    if (pa > 0) {
      const g = 24 + 26 * Math.abs(Math.sin(t * 2.4));
      const pts: A.Pt[] = [];
      for (let x = -240; x <= 240; x += 60) { pts.push([x, DEPTH - 58 - 14]); pts.push([x, DEPTH + 58 + 14]); }
      pts.push([-318, DEPTH]); pts.push([318, DEPTH]);
      for (const [x, y] of pts) {
        const dirx = x === -318 ? 1 : x === 318 ? -1 : 0;
        const diry = dirx ? 0 : (y < DEPTH ? 1 : -1);
        S.arrowW(c, [x - dirx * g * 2.4, y - diry * g * 2.4], [x, y], pa, P.sky, 5, 18 / cam.z);
      }
    }
    // một "ngón tay" trên vỏ: miếng nhỏ chịu sức nặng của một người lớn
    const px = 140, py = DEPTH - 58;
    if (t > 8.9) {
      const k = A.back(t, 9.4, 10.4);
      A.rrect(c, px - 12, py - 4, 24, 8, 2, P.amber, P.ink, A.px(c, 2.5));
      c.save(); c.translate(px, py - 4); c.scale(k, k); S.person(c, 0, 0, 105, P.dark); c.restore();
      const aw = A.sm(t, 10.4, 10.9);
      for (const dx of [-26, 0, 26]) S.arrowW(c, [px + dx, py - 62 + 30 * (1 - aw)], [px + dx, py - 8], aw, P.sky, 4, 10);
    }
    K.end(c);
    const sub = A.sm(t, 5.2, 6.4);
    S.ruler(c, cam, 0, 3, { x: 64, a: sub * (1 - A.sm(t, 8.8, 9.4)), step: 10 });
  }

  private endView(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#b7d4e5');
    const cx = 960, cy = 460, r = 300, hx = cx + r, hy = cy;
    // trong thân: giường, người ngủ nhìn từ đầu
    A.circle(c, cx, cy, r, '#f6fafc', null, 0);
    // nước tràn vào
    const lvl = A.sm(t, 13.6, 17.0) * 0.32;
    if (lvl > 0) {
      c.save(); c.beginPath(); c.arc(cx, cy, r - 6, 0, Math.PI * 2); c.clip();
      c.fillStyle = 'rgba(56,189,248,0.75)'; c.fillRect(cx - r, cy + r - 2 * r * lvl, 2 * r, 2 * r * lvl);
      c.restore();
    }
    for (let tier = 0; tier < 3; tier++) {
      const y = cy - 110 + tier * 105;
      A.rrect(c, cx - 200, y + 20, 400, 10, 4, '#cbd5e1', P.ink2, 2.5);
      for (let i = 0; i < 4; i++) {
        const x = cx - 150 + i * 100;
        const k = 1 + 0.06 * Math.sin(t * 1.7 + i + tier);
        A.rrect(c, x - 34, y - 12 * k + 6, 68, 24 * k, 12, i % 2 ? P.sand : P.light, P.ink, 2.5);
        A.circle(c, x - 20, y - 14 * k + 6, 11, P.skin, P.ink, 2.5);
      }
    }
    A.circle(c, cx, cy, r, null, P.ink, 22);
    A.circle(c, cx, cy, r - 18, null, P.ink2, 3);
    // đồng xu đặt đúng chỗ thủng, rồi bật ra
    const hole = t >= 13.0;
    if (hole) A.circle(c, hx, hy, 17, '#b7d4e5', null, 0);
    if (t >= 12.2 && t < 14.4) {
      const coinO = A.ph(t, 13.0, 14.0);
      const cxx = hole ? hx + 240 * coinO : hx;
      const cyy = hole ? hy + 320 * coinO * coinO : hy - 150 * (1 - A.eo(t, 12.2, 12.9));
      A.circle(c, cxx, cyy, 17, '#fbbf24', P.ink, 3);
    }
    // tia nước
    if (t >= 13.0) {
      const v = 900, front = hx - v * (t - 13.0);
      const x1 = Math.max(front, cx - r + 20);
      const wid = 16;
      c.save();
      c.beginPath(); c.moveTo(hx, hy - wid / 2); c.lineTo(x1, hy - wid * 0.9); c.lineTo(x1, hy + wid * 0.9); c.lineTo(hx, hy + wid / 2); c.closePath();
      A.fs(c, '#38bdf8', null, 0); c.restore();
      for (let i = 0; i < 7; i++) {
        const ph = ((t * 3.2 + i * 0.14) % 1);
        const sx = hx - (hx - x1) * ph;
        A.line(c, [[sx, hy - 4 + (i % 3 - 1) * 5], [Math.min(hx, sx + 90), hy - 4 + (i % 3 - 1) * 5]], '#e0f4fd', 3);
      }
      // bọt văng vào giường khi tia chạm vách
      if (front < cx - r + 40) A.withA(c, A.sm(t, 13.0 + 0.6, 14.2), () => { for (let i = 0; i < 8; i++) A.circle(c, cx - r + 40 + i * 6, hy + (i - 4) * 14, 6, '#e0f4fd', P.sky, 2); });
    }
    // đường đua: xe đua thua tia nước
    const ty = 960;
    A.rrect(c, 0, ty + 14, A.W, 14, 2, '#64748b', null, 0);
    for (let i = 0; i < 16; i++) A.rrect(c, i * 130 + ((t * 40) % 130), ty + 19, 60, 4, 1, '#f8fafc', null, 0);
    if (t >= 12.6) {
      const p = A.eo(t, 12.6, 13.0);
      const carX = t < 13.0 ? hx + 40 + (1 - p) * 500 : hx + 40 - 520 * (t - 13.0);
      drawCar(c, carX, ty + 10, 1.5);
      // vạch xuất phát
      A.withA(c, A.sm(t, 12.8, 13.1), () => A.line(c, [[hx, ty - 60], [hx, ty + 34]], P.ink2, 3, [8, 6]));
    }
    // tia nước dẫn mắt xuống đường đua
    if (t >= 13.0 && t < 15.5) {
      const x1 = Math.max(hx - 900 * (t - 13.0), cx - r + 20);
      A.withA(c, A.sm(t, 13.0, 13.4) * (1 - A.sm(t, 15.0, 15.5)), () => A.line(c, [[x1, hy + 30], [x1, ty - 70]], P.sky, 4, [10, 8]));
    }
  }

  private topMap(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#cde3ee');
    for (let x = 0; x <= A.W; x += 120) A.line(c, [[x, 0], [x, A.H]], 'rgba(60,110,140,0.14)', 2);
    for (let y = 0; y <= A.H; y += 120) A.line(c, [[0, y], [A.W, y]], 'rgba(60,110,140,0.14)', 2);
    const sx = 940 + (t - 17.1) * 14, sy = 560;
    // tìm kiếm: hai tàu mặt nước và một máy bay quét qua, không thấy gì
    S.waves(c, 340, 250, t, { R: 380, n: 3, per: 2.4, color: P.slate, w: 3, a: A.sm(t, 18.6, 19.4) });
    S.waves(c, 1560, 830, t, { R: 380, n: 3, per: 2.4, color: P.slate, w: 3, a: A.sm(t, 19.0, 19.8), t0: 0.4 });
    drawShip(c, 340, 250, 1, P.slate);
    drawShip(c, 1560, 830, -1, P.slate);
    const px = -100 + (t - 17.1) * 230, py = 140 + (t - 17.1) * 70;
    drawPlane(c, px, py, 0.3, P.slate);
    // vùng máy bay quét
    A.withA(c, 0.18, () => { c.beginPath(); c.moveTo(px, py); c.lineTo(px + 360, py + 280); c.lineTo(px + 150, py + 380); c.closePath(); c.fillStyle = P.slate; c.fill(); });
    // con tàu: hiện rồi mờ dần
    const a = 1 - A.sm(t, 19.2, 21.6);
    S.drawSubTop(c, t, { x: sx, y: sy, s: 0.24, alpha: a });
    U.ring(c, sx, sy, 150, (t - 17.2) / 1.4 % 1, P.enemy, 5);
    if (t < 19.0) U.ring(c, sx, sy, 100, ((t - 17.2) / 1.4 + 0.5) % 1, P.enemy, 4);
    // vùng "có thể ở đâu" nở dần
    if (t >= 21.8) {
      const r = 36 + 310 * A.eio(t, 21.8, 26.4);
      const ox = 940 + (21.5 - 17.1) * 14 + (t - 21.5) * 6;
      A.withA(c, A.sm(t, 21.8, 22.6), () => {
        A.circle(c, ox, sy, r, 'rgba(30,41,59,0.07)', P.ink2, 4);
        c.setLineDash([16, 12]); A.circle(c, ox, sy, r * 1.0, null, P.ink, 4); c.setLineDash([]);
      });
    }
  }

  private sideE(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: DEPTH, z: 1.12 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1500 });
    const ph = A.ph(t, 27.0, 30.0);
    const dy = 90 * Math.sin(Math.PI * ph), pit = 0.1 * Math.cos(Math.PI * ph) * (ph > 0 && ph < 1 ? 1 : 0);
    const hl = t >= 30.4 && t < 32.7 ? ['crew'] : t >= 32.8 && t < 34.6 ? ['plant', 'air'] : [];
    const dive = t > 27 && t < 30 ? (ph < 0.5 ? 0.15 + ph : 1 - ph) : 0;
    const fade = 1 - A.sm(t, 38.3, 40.0);
    S.drawSubSide(c, t, {
      x: 0, y: DEPTH + dy, s: 1, cut: 1, pitch: pit, alpha: fade, hl,
      plant: 'diesel', plantRun: t > 32.8 ? 1 : 0, breath: t * 1.7, fillF: dive, fillA: dive, trimF: 0.4, trimA: 0.4, glow: P.amber,
    });
    if (t > 34.6) {
      S.waves(c, 0, DEPTH, t, { R: 520, n: 4, per: 1.8, color: P.ink2, w: 3.5, a: A.sm(t, 34.6, 35.4) * fade, t0: 34.6 });
    }
    if (t > 32.8 && t < 34.6) {
      // diesel hút khí: mũi tên khí đi vào trong thân kín (bị chặn)
      const w = A.sm(t, 32.8, 33.4);
      for (let i = 0; i < 3; i++) {
        const y = DEPTH - 150 + i * 6;
        S.arrowW(c, [-120 - i * 12, y - 70], [-150, y + 10], w, P.sky, 4, 12);
      }
    }
    K.end(c);
    // bốn đòi hỏi
    const cards: [S.Pt, 'dive' | 'lungs' | 'engine' | 'sound', number][] = [
      [[330, 250], 'dive', 26.9], [[1590, 250], 'lungs', 30.5], [[330, 810], 'engine', 32.9], [[1590, 810], 'sound', 34.6],
    ];
    for (const [[x, y], k, t0] of cards) {
      const p = A.back(t, t0, t0 + 0.5) * (1 - A.sm(t, 38.3, 39.4));
      if (p <= 0.001) continue;
      const mx = A.lerp(x, 960, A.eio(t, 38.3, 39.4)), my = A.lerp(y, 540, A.eio(t, 38.3, 39.4));
      icon(c, k, mx, my, 78 * Math.min(1, p), P.ink, '#ffffff', P.ink);
    }
  }
}

function drawCar(c: CanvasRenderingContext2D, x: number, gy: number, k = 1) {
  c.save(); c.translate(x, gy); c.scale(k, k);
  A.poly(c, [[-90, -20], [-84, -34], [-20, -40], [4, -62], [34, -62], [52, -40], [90, -34], [94, -20], [88, -4], [-86, -4]], P.enemy, P.ink, 4);
  A.poly(c, [[-6, -58], [10, -58], [26, -42], [-12, -42]], P.glass, P.ink, 3);
  A.rrect(c, -100, -62, 14, 30, 2, P.ink, null, 0);
  for (const wx of [-56, 56]) { A.circle(c, wx, -6, 20, P.dark, P.ink, 4); A.circle(c, wx, -6, 7, P.light, null, 0); }
  c.restore();
}
function drawShip(c: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, col: string) {
  c.save(); c.translate(x, y); c.scale(dir, 1);
  A.poly(c, [[-70, -20], [40, -20], [80, 0], [40, 20], [-70, 20]], col, P.ink, 4);
  A.rrect(c, -30, -12, 36, 24, 4, P.paper, P.ink, 3);
  c.restore();
}
function drawPlane(c: CanvasRenderingContext2D, x: number, y: number, rot: number, col: string) {
  c.save(); c.translate(x, y); c.rotate(rot);
  A.poly(c, [[-14, -64], [4, -64], [20, 0], [4, 64], [-14, 64], [-6, 0]], col, P.ink, 3);
  A.rrect(c, -48, -10, 110, 20, 10, col, P.ink, 3);
  A.poly(c, [[-48, -2], [-64, -26], [-52, -26], [-36, -2]], col, P.ink, 3);
  c.restore();
}
