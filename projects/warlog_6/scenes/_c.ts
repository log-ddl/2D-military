// Helper chung cho các chương warlog_6 (không phải scene).
import * as A from './shared/art';
import * as K from './shared/camera';
import { C, type Pt, withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import { SKY } from './_ad';

/** Nền bản đồ trên xuống: giấy sáng + lưới 100 đơn vị rất nhạt. */
export function topBg(c: CanvasRenderingContext2D, k: K.Cam, color = '#f1ede0') {
  const v = K.view(k, 60);
  c.fillStyle = color;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const g = 120;
  c.strokeStyle = 'rgba(120,100,60,0.10)';
  c.lineWidth = 2 / k.z;
  c.beginPath();
  for (let x = Math.floor(v.x0 / g) * g; x < v.x1; x += g) { c.moveTo(x, v.y0); c.lineTo(x, v.y1); }
  for (let y = Math.floor(v.y0 / g) * g; y < v.y1; y += g) { c.moveTo(v.x0, y); c.lineTo(v.x1, y); }
  c.stroke();
}

/** Vòng tầm: p vẽ dần (0..1), fill nhạt. */
export function rangeRing(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, p = 1, o: { a?: number; fill?: number; lw?: number; dash?: boolean } = {}) {
  if (p <= 0) return;
  const lw = o.lw ?? 5;
  withA(c, o.a ?? 1, () => {
    if ((o.fill ?? 0.1) > 0) {
      c.beginPath(); c.arc(x, y, r * Math.min(1, p), 0, Math.PI * 2);
      c.save(); c.globalAlpha *= o.fill ?? 0.1; c.fillStyle = color; c.fill(); c.restore();
    }
    c.beginPath();
    c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p));
    c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round';
    if (o.dash !== false) c.setLineDash([lw * 3, lw * 2.2]);
    c.stroke(); c.setLineDash([]);
  });
}

/** Điểm trên đường gấp khúc theo p. */
export function along(pts: Pt[], p: number): [number, number, number] {
  const seg: number[] = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); seg.push(d); L += d; }
  let s = A.clamp01(p) * L, i = 0;
  while (i < seg.length - 1 && s > seg[i]!) { s -= seg[i]!; i++; }
  const a = pts[i]!, b = pts[i + 1]!, u = seg[i]! ? s / seg[i]! : 0;
  return [A.lerp(a[0], b[0], u), A.lerp(a[1], b[1], u), Math.atan2(b[1] - a[1], b[0] - a[0])];
}

/** Xung tín hiệu chạy dọc một liên kết. */
export function pulse(c: CanvasRenderingContext2D, a: Pt, b: Pt, t: number, speed = 0.8, phase = 0, color: string = P.amber, r = 8) {
  const p = (((t * speed + phase) % 1) + 1) % 1;
  circle(c, A.lerp(a[0], b[0], p), A.lerp(a[1], b[1], p), r, color, P.ink, 2.5);
}

/** Dấu hiệu "hộp mục tiêu" (radar khoá): khung vuông bốn góc quanh (x,y). */
export function bracket(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string = P.sky, p = 1, lw = 5) {
  if (p <= 0) return;
  const g = (1 - A.eo(p, 0, 1)) * 40;
  withA(c, A.clamp01(p * 3), () => {
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const cx = x + sx * (r + g), cy = y + sy * (r + g), L = r * 0.55;
      line(c, [[cx, cy - sy * L], [cx, cy], [cx - sx * L, cy]], color, lw);
    }
  });
}

/** Đường quay trần cho aircraft: chấm đã qua. */
export function breadcrumb(c: CanvasRenderingContext2D, pos: (t: number) => Pt, t0: number, t1: number, n = 10, color: string = P.ink2, r = 5) {
  for (let i = 0; i < n; i++) {
    const tt = A.lerp(t0, t1, i / (n - 1));
    const [x, y] = pos(tt);
    circle(c, x, y, r, color, null, 0);
  }
}

/** Đường chấm chảy (đường liên lạc). */
export function link(c: CanvasRenderingContext2D, a: Pt, b: Pt, color: string = P.amber, w = 4, a0 = 1, t = 0) {
  withA(c, a0, () => {
    c.save(); c.lineDashOffset = -t * 40;
    line(c, [a, b], color, w, [w * 2.6, w * 2]);
    c.restore();
  });
}

/** Nút chỉ huy (trung tâm mạng): ô vuông có tia. */
export function hub(c: CanvasRenderingContext2D, x: number, y: number, s = 1, a = 1, color: string = P.amber) {
  withA(c, a, () => {
    c.save(); c.translate(x, y); c.scale(s, s);
    rrect(c, -34, -34, 68, 68, 14, '#fff', P.ink, 4);
    circle(c, 0, 0, 12, color, P.ink, 3);
    for (let i = 0; i < 6; i++) {
      const g = (i / 6) * Math.PI * 2;
      line(c, [[Math.cos(g) * 18, Math.sin(g) * 18], [Math.cos(g) * 26, Math.sin(g) * 26]], P.ink, 3.5);
    }
    c.restore();
  });
}

export const clamp01 = A.clamp01;
export { SKY, C, poly };

// ── Đánh chặn (ngang/trên): tên lửa bay a→b trong [t0,t1], nổ ở b ───
import * as D from './_ad';
export function intercept(c: CanvasRenderingContext2D, t: number, a: Pt, b: Pt, t0: number, t1: number, o: { L?: number; boom?: number; bend?: number; trailLen?: number; color?: string } = {}) {
  if (t < t0 || t > t1 + 0.9) return;
  const L = o.L ?? 70, bend = o.bend ?? 0;
  if (t <= t1) {
    const p = A.eio(t, t0, t1) * 0.35 + A.ph(t, t0, t1) * 0.65;
    const at = (q: number): Pt => [A.lerp(a[0], b[0], q), A.lerp(a[1], b[1], q) - 4 * bend * q * (1 - q)];
    const [x, y] = at(p), [x2, y2] = at(Math.min(1, p + 0.02));
    const tr = A.clamp01(p - 0.5);
    const n = 14;
    for (let i = 1; i <= n; i++) {
      const q = Math.max(0, p - (i / n) * (p - tr + 0.0001) * 1.0);
      const [qx, qy] = at(q);
      withA(c, (1 - i / n) * 0.7, () => circle(c, qx, qy, 9 * (1 - 0.5 * i / n), '#cbd5e1', null, 0));
    }
    D.missile(c, x, y, Math.atan2(y2 - y, x2 - x), L, { flame: 1, color: o.color });
  } else {
    D.bang(c, b[0], b[1], o.boom ?? 70, A.ph(t, t1, t1 + 0.8));
  }
}

/** Mục tiêu bị trúng: rơi + khói sau tHit. Trả về true nếu còn nên vẽ máy bay nguyên. */
export function fallOf(t: number, tHit: number) {
  return { alive: t < tHit, f: A.ph(t, tHit, tHit + 1.6) };
}
