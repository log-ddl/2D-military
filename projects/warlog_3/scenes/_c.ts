// Phần dùng chung giữa các chương: biểu tượng, dải mắt xích, mốc chương.
import * as A from './shared/art';
import * as U from './shared/ui';
import { P } from './shared/palette';

// mốc đầu chương (giây) — mắt xích i sáng từ CH[i]
export const CH = [47.96, 82.7, 151.9, 178.1, 270.2, 300.0, 367.9, 408.6];
export const END = 479.007;

export type IconKind = 'hull' | 'tank' | 'plane' | 'engine' | 'air' | 'quiet' | 'sonar' | 'weapon' | 'dive' | 'lungs' | 'sound';

/** Biểu tượng tròn bán kính r, tâm (x,y). */
export function icon(c: CanvasRenderingContext2D, k: IconKind, x: number, y: number, r: number, col: string = P.ink, bg: string = '#ffffff', rim: string = P.ink) {
  c.save(); c.translate(x, y);
  const u = r / 40; c.scale(u, u);
  const lw = 4;
  A.circle(c, 0, 0, 40, bg, rim, 4);
  const L = (pts: A.Pt[], w = lw) => A.line(c, pts, col, w);
  switch (k) {
    case 'hull':
      A.circle(c, 0, 0, 22, null, col, 6);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; L([[Math.cos(a) * 14, Math.sin(a) * 14], [Math.cos(a) * 22, Math.sin(a) * 22]], 3); }
      break;
    case 'tank':
      A.rrect(c, -18, -22, 36, 44, 5, null, col, 5);
      c.fillStyle = WATERC; c.fillRect(-15, 0, 30, 19);
      L([[-18, -22], [18, -22]], 6);
      break;
    case 'plane':
      c.save(); c.rotate(-0.4); A.capsule(c, [-22, 0], [22, 0], 8, col, col, 2); c.restore();
      U.arrow(c, [0, 24], [0, -4], { color: col, w: 5, head: 14 });
      break;
    case 'engine':
      A.circle(c, 0, 0, 13, null, col, 5);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; A.rrect(c, Math.cos(a) * 19 - 4, Math.sin(a) * 19 - 4, 8, 8, 2, col, null, 0); }
      break;
    case 'air':
      A.circle(c, -8, 6, 9, null, col, 4); A.circle(c, 9, -6, 6, null, col, 4); A.circle(c, 10, 14, 4, null, col, 4);
      break;
    case 'lungs':
      A.circle(c, -9, 4, 10, null, col, 5); A.circle(c, 9, 4, 10, null, col, 5); L([[0, -20], [0, 4]]);
      break;
    case 'quiet':
      for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(-14, 0, 8 * i, -0.9, 0.9); c.strokeStyle = col; c.lineWidth = 4; c.stroke(); }
      L([[-26, 24], [26, -24]], 6);
      break;
    case 'sound':
      A.circle(c, -16, 0, 5, col, null, 0);
      for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(-16, 0, 9 * i, -0.9, 0.9); c.strokeStyle = col; c.lineWidth = 4; c.stroke(); }
      break;
    case 'sonar':
      A.circle(c, 0, 12, 4, col, null, 0);
      for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(0, 12, 9 * i, -Math.PI * 0.85, -Math.PI * 0.15); c.strokeStyle = col; c.lineWidth = 4; c.stroke(); }
      break;
    case 'weapon':
      A.rrect(c, -24, -6, 44, 12, 6, col, null, 0); A.poly(c, [[-24, 0], [-32, -10], [-32, 10]], col, null, 0);
      break;
    case 'dive':
      U.arrow(c, [-10, -18], [-10, 18], { color: col, w: 5, head: 13 }); U.arrow(c, [12, 18], [12, -18], { color: col, w: 5, head: 13 });
      break;
  }
  c.restore();
}
const WATERC = 'rgba(56,189,248,0.8)';

export const CHAIN: IconKind[] = ['hull', 'tank', 'plane', 'engine', 'air', 'quiet', 'sonar', 'weapon'];

/**
 * Dải mắt xích. Lên dần ở giữa khung (intro) rồi thu về đáy.
 * intro: [bắt đầu hiện, bắt đầu thu về, xong]; sau xong luôn ở đáy.
 */
export function chain(c: CanvasRenderingContext2D, t: number, o: { intro?: [number, number, number]; a?: number; allLit?: boolean } = {}) {
  const a = o.a ?? 1;
  const [t0, t1, t2] = o.intro ?? [0, 0, 0];
  if (t < t0) return;
  const p = o.intro ? A.eio(t, t1, t2) : 1;
  const sc = A.lerp(1.9, 1, p), cy = A.lerp(A.H / 2, A.H - 52, p);
  let lit = -1;
  for (let i = 0; i < CH.length; i++) if (t >= CH[i]!) lit = i;
  if (o.allLit) lit = 99;
  const step = 112 * sc, x0 = A.W / 2 - (CHAIN.length - 1) * step / 2;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha *= a;
  if (p > 0.6) {
    const q = (p - 0.6) / 0.4;
    c.globalAlpha *= q;
    A.rrect(c, x0 - 66, cy - 46, (CHAIN.length - 1) * step + 132, 92, 46, 'rgba(255,255,255,0.78)', null, 0);
    c.globalAlpha /= Math.max(q, 0.0001);
  }
  // dây nối
  for (let i = 0; i < CHAIN.length - 1; i++) {
    const appear = o.intro ? A.sm(t, t0 + i * 0.45 + 0.25, t0 + i * 0.45 + 0.6) : 1;
    if (appear <= 0) continue;
    const xa = x0 + i * step + 40 * sc, xb = x0 + (i + 1) * step - 40 * sc;
    const done = i < lit;
    A.line(c, [[xa, cy], [xa + (xb - xa) * appear, cy]], done ? P.olive : P.ink2, 5 * Math.sqrt(sc));
  }
  for (let i = 0; i < CHAIN.length; i++) {
    const appear = o.intro ? A.back(t, t0 + i * 0.45, t0 + i * 0.45 + 0.4) : 1;
    if (appear <= 0) continue;
    const isLit = i === lit, done = i < lit;
    const rr = 36 * sc * Math.min(1, appear) * (isLit ? 1.18 : 1);
    const col = isLit ? P.amber : done ? P.oliveDark : P.ink2;
    icon(c, CHAIN[i]!, x0 + i * step, cy, rr, col, isLit ? '#fff7e0' : '#ffffff', isLit ? P.amber : done ? P.olive : P.ink2);
  }
  // xung chạy dọc chuỗi (giải → đẻ vấn đề mới)
  if (o.intro && t > t0 + 3.4 && t < t1 + 0.5) {
    const per = 2.6, u = (((t - t0 - 3.4) / per) % 1) * (CHAIN.length - 1);
    A.circle(c, x0 + u * step, cy, 9 * sc, P.amber, P.ink, 2);
  }
  c.restore();
}
