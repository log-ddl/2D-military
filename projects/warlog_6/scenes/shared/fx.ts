// kit/fx.ts — hiệu ứng chung: nổ, khói, lửa, bụi, mảnh văng, chớp nòng, đạn vạch, quỹ đạo.
// Tất cả tất định theo thời gian (p = tiến độ 0..1 hoặc age = giây từ lúc bắt đầu).
import { C, type Pt, clamp01, lerp, rnd, withA, circle, line, poly } from './art';

/** Quả nổ: p 0..1 trong suốt thời gian nổ, r = bán kính chính. */
export function explosion(c: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, lw = 3) {
  if (p <= 0 || p >= 1) return;
  const e = 1 - Math.pow(1 - p, 3);
  withA(c, 1 - p * p, () => {
    circle(c, x, y, r * e * 1.05, '#f97316', C.ink, lw);
    circle(c, x, y, r * e * 0.72, '#fbbf24', null, 0);
    circle(c, x, y, r * e * 0.38, '#fff7d6', null, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3;
      const r0 = r * e * 1.05, r1 = r * (0.7 + 0.8 * e + (i % 3) * 0.15);
      line(c, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], C.ink, lw);
    }
  });
  shock(c, x, y, r * 1.6, p, lw);
}

/** Vòng sóng xung kích lan ra. */
export function shock(c: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, lw = 3, color: string = C.ink) {
  if (p <= 0 || p >= 1) return;
  const e = 1 - Math.pow(1 - p, 3);
  withA(c, 0.8 * (1 - p), () => circle(c, x, y, r * e, null, color, lw));
}

/** Cột khói bốc lên; age = giây từ lúc cháy. */
export function smoke(c: CanvasRenderingContext2D, x: number, y: number, age: number, size = 1, count = 7, color = '#4a4f57', wind = 22) {
  if (age <= 0) return;
  for (let i = 0; i < count; i++) {
    const life = (age * 0.6 + i / count) % 1;
    const rise = life * 190 * size;
    const r = (16 + life * 38) * size;
    const a = (1 - life) * 0.65 * Math.min(1, age * 2);
    withA(c, a, () => circle(c, x + Math.sin(i * 2.3 + age) * 14 * size + life * wind * size, y - rise, r, color, null, 0));
  }
}

/** Lửa cháy lập loè tại chỗ; age giây. */
export function fire(c: CanvasRenderingContext2D, x: number, y: number, age: number, size = 1) {
  if (age <= 0) return;
  const grow = Math.min(1, age * 3);
  for (let i = 0; i < 6; i++) {
    const f = Math.sin(age * 13 + i * 1.7) * 0.5 + 0.5;
    const h = (40 + 30 * f) * size * grow, w = (18 + 8 * rnd(i)) * size * grow;
    const ox = (i - 2.5) * 10 * size;
    poly(c, [[x + ox - w / 2, y], [x + ox + Math.sin(age * 9 + i) * 6 * size, y - h], [x + ox + w / 2, y]], i % 2 ? '#f97316' : '#fbbf24', null, 0);
  }
}

/** Bụi tung ở mặt đất (xe chạy, đạn chạm đất). p 0..1. */
export function dust(c: CanvasRenderingContext2D, x: number, y: number, p: number, size = 1, color = '#cbbf9a') {
  if (p <= 0 || p >= 1) return;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const d = (20 + 70 * rnd(i + 3)) * size * (1 - Math.pow(1 - p, 2));
    withA(c, (1 - p) * 0.7, () => circle(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, (14 + 18 * p) * size * (0.6 + rnd(i) * 0.6), color, null, 0));
  }
}

/** Mảnh văng có trọng lực; age giây, seed để mỗi vụ nổ khác nhau. */
export function debris(c: CanvasRenderingContext2D, x: number, y: number, age: number, size = 1, n = 12, seed = 1, groundY = Infinity, color: string = C.steelDark) {
  if (age <= 0 || age > 2.5) return;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.1 + 0.8 * rnd(seed + i));
    const v = (300 + 500 * rnd(seed + i * 7)) * size;
    const px = x + Math.cos(a) * v * age;
    const py = Math.min(groundY, y + Math.sin(a) * v * age + 0.5 * 1400 * size * age * age);
    const s = (5 + 7 * rnd(seed + i * 3)) * size;
    c.save(); c.translate(px, py); c.rotate(age * (6 + i));
    withA(c, 1 - age / 2.5, () => poly(c, [[-s, -s * 0.6], [s, -s * 0.3], [s * 0.4, s * 0.7]], color, C.ink, 1.5));
    c.restore();
  }
}

/** Tia lửa toé (đạn chạm giáp). p 0..1. */
export function sparks(c: CanvasRenderingContext2D, x: number, y: number, p: number, size = 1, ang = 0, spread = Math.PI, seed = 1) {
  if (p <= 0 || p >= 1) return;
  for (let i = 0; i < 14; i++) {
    const a = ang + (rnd(seed + i) - 0.5) * spread;
    const d = (40 + 90 * rnd(seed + i * 5)) * size * p;
    const l = 18 * size * (1 - p);
    line(c, [[x + Math.cos(a) * d, y + Math.sin(a) * d], [x + Math.cos(a) * (d + l), y + Math.sin(a) * (d + l)]], i % 2 ? '#fbbf24' : '#fff7d6', 3 * size);
  }
}

/** Chớp nòng: (x, y) miệng nòng, ang hướng bắn. */
export function muzzleFlash(c: CanvasRenderingContext2D, x: number, y: number, ang: number, p: number, size = 1, lw = 3) {
  if (p <= 0 || p >= 1) return;
  withA(c, 1 - p, () => {
    c.save(); c.translate(x, y); c.rotate(ang);
    const L = (90 + 90 * p) * size;
    poly(c, [[0, 0], [L * 0.4, -26 * size], [L, 0], [L * 0.4, 26 * size]], '#fde68a', C.ink, lw);
    poly(c, [[0, 0], [L * 0.3, -12 * size], [L * 0.6, 0], [L * 0.3, 12 * size]], '#fff', null, 0);
    c.restore();
  });
}

/** Đạn vạch: vệt sáng ngắn trên đoạn a→b tại tiến độ p. */
export function tracer(c: CanvasRenderingContext2D, a: Pt, b: Pt, p: number, len = 0.1, color = '#f59e0b', w = 5) {
  if (p <= 0 || p >= 1 + len) return;
  const u = clamp01(p - len), v = clamp01(p);
  line(c, [[lerp(a[0], b[0], u), lerp(a[1], b[1], u)], [lerp(a[0], b[0], v), lerp(a[1], b[1], v)]], color, w);
}

/** Điểm trên quỹ đạo parabol a→b, đỉnh cao h (dương = lên). Trả [x, y, góc tiếp tuyến]. */
export function arcPos(a: Pt, b: Pt, p: number, h: number): [number, number, number] {
  const x = lerp(a[0], b[0], p), y = lerp(a[1], b[1], p) - 4 * h * p * (1 - p);
  const dx = b[0] - a[0], dy = b[1] - a[1] - 4 * h * (1 - 2 * p);
  return [x, y, Math.atan2(dy, dx)];
}

/**
 * Quỹ đạo cong có vệt: vẽ đường đi đã qua (đứt) + đầu đạn tại p.
 * head(c, x, y, ang) để project tự vẽ đầu đạn; mặc định chấm tròn.
 */
export function arcShot(c: CanvasRenderingContext2D, a: Pt, b: Pt, p: number, h: number, opt: { color?: string; w?: number; trail?: boolean; head?: (c: CanvasRenderingContext2D, x: number, y: number, ang: number) => void } = {}) {
  if (p <= 0) return;
  const q = clamp01(p), color = opt.color ?? C.ink, w = opt.w ?? 4;
  if (opt.trail !== false) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) { const [x, y] = arcPos(a, b, (i / 40) * q, h); pts.push([x, y]); }
    line(c, pts, color, w, [w * 3, w * 2.5]);
  }
  if (p < 1) {
    const [x, y, ang] = arcPos(a, b, q, h);
    if (opt.head) opt.head(c, x, y, ang);
    else circle(c, x, y, w * 2.2, color, null, 0);
  }
}

/** Đường bay thẳng có vệt (tên lửa, đạn). */
export function straightShot(c: CanvasRenderingContext2D, a: Pt, b: Pt, p: number, opt: { color?: string; w?: number; trail?: number; head?: (c: CanvasRenderingContext2D, x: number, y: number, ang: number) => void } = {}) {
  if (p <= 0 || p >= 1) return;
  const color = opt.color ?? C.red, w = opt.w ?? 5, tr = opt.trail ?? 0.35;
  const x = lerp(a[0], b[0], p), y = lerp(a[1], b[1], p);
  const u = Math.max(0, p - tr);
  withA(c, 0.5, () => line(c, [[lerp(a[0], b[0], u), lerp(a[1], b[1], u)], [x, y]], color, w));
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  if (opt.head) opt.head(c, x, y, ang);
  else circle(c, x, y, w * 1.6, color, C.ink, 2);
}
