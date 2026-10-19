// Nền cho warlog_1: NGANG (đường chân trời, đồi, mặt đất) và TRÊN (bản đồ phẳng).
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';

export const GROUND = '#dde6d3';   // đất olive nhạt
export const ROAD = '#cfd6de';
export const MUD = '#b9a77f';

/** NGANG: mặt đất y>0, trời phía trên. `scroll` = đã lăn bao nhiêu đơn vị (đường/đồi trôi). */
export function sideGround(c: CanvasRenderingContext2D, cam: K.Cam, opt: { scroll?: number; roadA?: number; road?: boolean; hills?: boolean; mud?: [number, number][]; gap?: [number, number] } = {}) {
  const v = K.view(cam, 60);
  const sc = opt.scroll ?? 0;
  // đồi xa (parallax 0.25)
  if (opt.hills !== false) {
    for (const [k, col, amp, f] of [[0.18, '#e5ecec', 70, 0.0021], [0.4, '#dfe8e0', 46, 0.0034]] as const) {
      c.beginPath(); c.moveTo(v.x0, 0);
      for (let x = v.x0; x <= v.x1; x += 40) {
        const wx = x + (cam.x - x) * 0 - sc * k;
        const h = amp * (0.55 + 0.45 * Math.sin(wx * f * 6.28 * 0.3 + 1.7) * Math.cos(wx * f * 6.28 * 0.11));
        c.lineTo(x, -h * (k < 0.3 ? 1.35 : 0.8));
      }
      c.lineTo(v.x1, 0); c.closePath(); c.fillStyle = col; c.fill();
    }
  }
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 700 - sc * 0.12 - cam.x * 0.2) % 2800 + 2800) % 2800 - 1100 + cam.x * 0.2;
    const cy = -230 - (i % 2) * 70 - i * 18;
    A.ellipse(c, cx, cy, 120 + i * 18, 14, 0, '#ffffff', null, 0);
    A.ellipse(c, cx + 50, cy - 10, 70, 12, 0, '#ffffff', null, 0);
  }
  // đất
  c.fillStyle = GROUND; c.fillRect(v.x0, 0, v.x1 - v.x0, v.y1 + 80);
  c.fillStyle = '#d3dcc7'; c.fillRect(v.x0, 0, v.x1 - v.x0, 5);
  if (opt.road !== false) {
    c.save(); c.globalAlpha = opt.roadA ?? 1;
    c.fillStyle = ROAD; c.fillRect(v.x0, 0, v.x1 - v.x0, 22);
    c.strokeStyle = '#f3f6f9'; c.lineWidth = A.px(c, 3); c.setLineDash([46, 40]);
    c.lineDashOffset = sc; // trôi về trái khi xe sang phải
    c.beginPath(); c.moveTo(v.x0, 12); c.lineTo(v.x1, 12); c.stroke(); c.setLineDash([]);
    c.restore();
  }
  for (const [mx0, mx1] of opt.mud ?? []) {
    c.fillStyle = MUD; c.beginPath(); c.moveTo(mx0, 0); c.lineTo(mx0 + 20, 26); c.lineTo(mx1 - 20, 26); c.lineTo(mx1, 0); c.closePath(); c.fill();
  }
  c.strokeStyle = P.ink; c.lineWidth = A.px(c, 3);
  c.beginPath(); c.moveTo(v.x0, 0); c.lineTo(v.x1, 0); c.stroke();
}

/** NGANG: khe (sông/hào) cắt ngang đất từ x0 tới x1, sâu d. */
export function sideGap(c: CanvasRenderingContext2D, x0: number, x1: number, d = 70, water = true) {
  c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + 14, d); c.lineTo(x1 - 14, d); c.lineTo(x1, 0); c.closePath();
  c.fillStyle = water ? '#bfe3f4' : '#c9c3a8'; c.fill();
  c.strokeStyle = P.ink; c.lineWidth = A.px(c, 3); c.stroke();
  if (water) {
    c.strokeStyle = '#7fc4e3'; c.lineWidth = A.px(c, 2);
    for (let i = 0; i < 3; i++) { const y = 14 + i * 18; c.beginPath(); c.moveTo(x0 + 24 + i * 6, y); c.lineTo(x1 - 24 - i * 6, y); c.stroke(); }
  }
}

/** TRÊN: nền phẳng + lưới nhẹ + vài mảng đất. */
export function topGround(c: CanvasRenderingContext2D, cam: K.Cam, opt: { grid?: number; patches?: boolean } = {}) {
  const v = K.view(cam, 80);
  c.fillStyle = '#e4ebde'; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const g = opt.grid ?? 200;
  c.strokeStyle = 'rgba(70,110,90,0.10)'; c.lineWidth = A.px(c, 1.5);
  c.beginPath();
  for (let x = Math.floor(v.x0 / g) * g; x <= v.x1; x += g) { c.moveTo(x, v.y0); c.lineTo(x, v.y1); }
  for (let y = Math.floor(v.y0 / g) * g; y <= v.y1; y += g) { c.moveTo(v.x0, y); c.lineTo(v.x1, y); }
  c.stroke();
  if (opt.patches) {
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(v.x0 / 300) * 300 + (i % 9) * 300 + A.rnd(i) * 160;
      const y = Math.floor(v.y0 / 300) * 300 + Math.floor(i / 9) * 330 + A.rnd(i + 40) * 160;
      A.ellipse(c, x, y, 70 + A.rnd(i + 8) * 80, 40 + A.rnd(i + 3) * 40, A.rnd(i + 9), '#dce6d1', null, 0);
    }
  }
}
/** TRÊN: đường (polyline), viền + vạch giữa. */
export function topRoad(c: CanvasRenderingContext2D, pts: A.Pt[], w = 64) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  A.line(c, pts, '#b3bcc6', w + 6); A.line(c, pts, '#d6dce3', w);
  A.line(c, pts, '#f6f8fa', 3, [26, 24]);
}
export function topRiver(c: CanvasRenderingContext2D, pts: A.Pt[], w = 90) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  A.line(c, pts, '#8fc7e3', w + 10); A.line(c, pts, '#bfe3f4', w);
}
export function trees(c: CanvasRenderingContext2D, x: number, y: number, n: number, r: number, seed = 1) {
  for (let i = 0; i < n; i++) {
    const a = A.rnd(seed + i) * 6.28, d = A.rnd(seed + i * 3) * r;
    A.circle(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 15 + A.rnd(seed + i * 7) * 12, '#c3d3ae', null, 0);
  }
}
/** TRÊN: vùng nguy hiểm (nét đứt đỏ + tô nhạt). */
export function dangerZone(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a = 1) {
  A.withA(c, a, () => {
    c.fillStyle = 'rgba(180,73,60,0.12)'; c.fillRect(x, y, w, h);
    c.strokeStyle = P.enemy; c.lineWidth = A.px(c, 3); c.setLineDash([16, 12]); c.strokeRect(x, y, w, h); c.setLineDash([]);
  });
}
