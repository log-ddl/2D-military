// Dải mắt xích dùng chung: 9 mắt xích của chuỗi giải pháp, sáng dần theo chương.
import * as A from './shared/art';
import { P } from './shared/palette';
import { arrowW } from './_ship';

// mốc đầu mỗi chương (giây): mắt xích i sáng từ CH[i]
export const CH = [52.8, 87.4, 134.4, 168.7, 188.8, 224.5, 289.8, 328.9, 357.6];
export const END = 479.922;
/** Chuỗi hiện giữa khung từ INTRO[0], bắt đầu thu xuống INTRO[1], nằm đáy từ INTRO[2]. */
export const INTRO: [number, number, number] = [48.8, 54.2, 55.6];

export type IconKind = 'cat' | 'wire' | 'angle' | 'wind' | 'reactor' | 'lift' | 'wing' | 'ski' | 'escort';
export const CHAIN: IconKind[] = ['cat', 'wire', 'angle', 'wind', 'reactor', 'lift', 'wing', 'ski', 'escort'];

/** Biểu tượng tròn bán kính r, tâm (x,y). */
export function icon(c: CanvasRenderingContext2D, k: IconKind, x: number, y: number, r: number, col: string = P.ink, bg = '#ffffff', rim: string = P.ink) {
  c.save(); c.translate(x, y);
  const u = r / 40; c.scale(u, u);
  A.circle(c, 0, 0, 40, bg, rim, 4);
  const L = (pts: A.Pt[], w = 4) => A.line(c, pts, col, w);
  switch (k) {
    case 'cat':
      L([[-26, 10], [26, 10]], 5); A.rrect(c, 6, 3, 14, 14, 3, col, null, 0);
      arrowW(c, [-20, -8], [24, -8], 1, col, 5, 14);
      break;
    case 'wire':
      L([[-26, 0], [26, 0]], 3); L([[-26, 10], [26, 10]], 3); L([[-26, -10], [26, -10]], 3);
      A.circle(c, 0, 0, 7, col, null, 0);
      break;
    case 'angle':
      A.poly(c, [[-28, 16], [26, 10], [26, -2], [-28, 4]], null, col, 4);
      A.poly(c, [[-28, 4], [22, -22], [30, -12], [-20, 14]], col, null, 0);
      break;
    case 'wind':
      for (const yy of [-14, 0, 14]) {
        c.beginPath(); c.moveTo(24, yy); c.bezierCurveTo(8, yy - 8, -4, yy + 8, -24, yy);
        c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round'; c.stroke();
      }
      break;
    case 'reactor':
      A.circle(c, 0, 0, 7, col, null, 0);
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 - Math.PI / 2;
        c.beginPath(); c.arc(0, 0, 21, a - 0.5, a + 0.5); c.strokeStyle = col; c.lineWidth = 8; c.lineCap = 'butt'; c.stroke();
      }
      break;
    case 'lift':
      A.rrect(c, -22, -22, 44, 44, 4, null, col, 4);
      arrowW(c, [-8, 10], [-8, -14], 1, col, 5, 12); arrowW(c, [10, -10], [10, 14], 1, col, 5, 12);
      break;
    case 'wing':
      for (const [dx, dy] of [[0, -12], [-14, 8], [14, 8]] as const) {
        A.poly(c, [[dx, dy - 10], [dx + 10, dy + 8], [dx, dy + 3], [dx - 10, dy + 8]], col, null, 0);
      }
      break;
    case 'ski':
      c.beginPath(); c.moveTo(-28, 14); c.lineTo(4, 14); c.bezierCurveTo(16, 14, 22, 6, 28, -10);
      c.strokeStyle = col; c.lineWidth = 6; c.lineCap = 'round'; c.stroke();
      break;
    case 'escort':
      A.circle(c, 0, 0, 7, col, null, 0);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; A.circle(c, Math.cos(a) * 21, Math.sin(a) * 21, 4.5, col, null, 0); }
      break;
  }
  c.restore();
}

/**
 * Dải mắt xích. Lên giữa khung (intro) rồi thu về đáy. allLit: sáng đủ. pos 0..1 kéo dải về giữa (cảnh kết).
 */
export function chain(c: CanvasRenderingContext2D, t: number, o: { a?: number; allLit?: number; mid?: number; pulse?: [number, number][] } = {}) {
  const a = o.a ?? 1;
  const [t0, t1, t2] = INTRO;
  if (t < t0) return;
  const p = A.eio(t, t1, t2);
  const mid = o.mid ?? 0;
  const sc = A.lerp(1.55, 1, p) * (1 + 0.55 * mid), cy = A.lerp(A.H / 2, A.H - 50, p) - (A.H - 50 - A.H / 2) * mid * 0;
  const cyy = A.lerp(cy, A.H / 2 + 60, mid);
  let lit = -1;
  for (let i = 0; i < CH.length; i++) if (t >= CH[i]!) lit = i;
  const all = o.allLit ?? 0;
  const step = 104 * sc, x0 = A.W / 2 - (CHAIN.length - 1) * step / 2;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha *= a;
  const veil = 0.82 * A.sm(t, t0 - 1.2, t0) * (1 - p);
  if (veil > 0) { c.save(); c.globalAlpha *= veil; c.fillStyle = P.bg; c.fillRect(0, 0, A.W, A.H); c.restore(); }
  if (p > 0.6 || mid > 0) {
    const q = Math.max((p - 0.6) / 0.4, mid);
    c.save(); c.globalAlpha *= q * (1 - 0.0);
    A.rrect(c, x0 - 62 * sc, cyy - 46 * sc, (CHAIN.length - 1) * step + 124 * sc, 92 * sc, 46 * sc, 'rgba(255,255,255,0.82)', null, 0);
    c.restore();
  }
  for (let i = 0; i < CHAIN.length - 1; i++) {
    const ap = A.sm(t, t0 + i * 0.4 + 0.25, t0 + i * 0.4 + 0.55);
    if (ap <= 0) continue;
    const xa = x0 + i * step + 40 * sc * 0.9, xb = x0 + (i + 1) * step - 40 * sc * 0.9;
    const done = i < lit || all > 0.5;
    A.line(c, [[xa, cyy], [xa + (xb - xa) * ap, cyy]], done ? P.olive : P.ink2, 5 * Math.sqrt(sc));
  }
  for (let i = 0; i < CHAIN.length; i++) {
    const ap = A.back(t, t0 + i * 0.4, t0 + i * 0.4 + 0.4);
    if (ap <= 0) continue;
    let isLit = i === lit && all < 0.5;
    const done = i < lit || all > 0.5;
    let pu = 0;
    for (const [pi, pt] of o.pulse ?? []) if (pi === i) pu = Math.max(pu, A.bump(t, pt, 1.1));
    if (pu > 0.05) isLit = true;
    const rr = 34 * sc * Math.min(1, ap) * (isLit ? 1.18 + 0.25 * pu : 1);
    const col = isLit ? P.amber : done ? P.oliveDark : P.ink2;
    icon(c, CHAIN[i]!, x0 + i * step, cyy, rr, col, isLit ? '#fff7e0' : '#ffffff', isLit ? P.amber : done ? P.olive : P.ink2);
  }
  // xung chạy dọc chuỗi: mỗi mắt xích giải một vấn đề rồi giao vấn đề kế
  if (t > t0 + 3.6 && t < t1 + 0.5) {
    const per = 2.8, u = (((t - t0 - 3.6) / per) % 1) * (CHAIN.length - 1);
    A.circle(c, x0 + u * step, cyy, 9 * sc, P.amber, P.ink, 2);
  }
  c.restore();
}
