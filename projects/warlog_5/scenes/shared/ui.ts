// kit/ui.ts — lớp chữ và chỉ dẫn trên màn hình: callout, nhãn, mũi tên, thanh, vòng, khung ngắm bộ phận.
// Vẽ trong toạ độ MÀN HÌNH (sau camera.end). Đặt đúng đối tượng bằng camera.toScreen.
// Luật dùng: mặc định không có chữ; nhãn chỉ khi hình không phân biệt được, tối đa 2 cùng lúc (RULES §1).
import { C, type Pt, clamp01, lerp, withA, line, poly, rrect, circle } from './art';

const FONT = "'Archivo', 'SF Pro Display', -apple-system, sans-serif";

function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 800, align: CanvasTextAlign = 'center') {
  c.font = `${weight} ${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
}

/** Nhãn chữ trơn. */
export function label(c: CanvasRenderingContext2D, s: string, x: number, y: number, size = 34, color: string = C.ink, a = 1, align: CanvasTextAlign = 'center') {
  withA(c, a, () => text(c, s, x, y, size, color, 800, align));
}

/**
 * Callout: thẻ chữ có đường dẫn tới điểm `to` (đầu dây có chấm).
 * p 0..1 điều khiển xuất hiện: dây vẽ ra trước, thẻ bật sau.
 */
export function callout(c: CanvasRenderingContext2D, s: string, x: number, y: number, opt: { to?: Pt; p?: number; color?: string; size?: number; badge?: string } = {}) {
  const p = opt.p ?? 1;
  if (p <= 0) return;
  const color = opt.color ?? C.ink, size = opt.size ?? 36;
  if (opt.to) {
    const q = clamp01(p * 2);
    const ex = lerp(opt.to[0], x, q), ey = lerp(opt.to[1], y, q);
    line(c, [opt.to, [ex, ey]], color, 3);
    circle(c, opt.to[0], opt.to[1], 7, color, '#fff', 2.5);
  }
  const k = clamp01(p * 2 - 1);
  if (k <= 0) return;
  withA(c, k, () => {
    c.font = `800 ${size}px ${FONT}`;
    const tw = c.measureText(s).width;
    c.font = `800 ${size * 0.6}px ${FONT}`;
    const bw = opt.badge ? c.measureText(opt.badge).width + 22 : 0;
    const padX = 26, h = size + 30, w = tw + bw + padX * 2 + (opt.badge ? 10 : 0);
    const sc = 0.85 + 0.15 * k;
    c.save(); c.translate(x, y); c.scale(sc, sc);
    rrect(c, -w / 2, -h / 2, w, h, 14, '#ffffff', color, 3.5);
    let tx = 0;
    if (opt.badge) {
      rrect(c, -w / 2 + 10, -h / 2 + 10, bw, h - 20, 8, color, null, 0);
      text(c, opt.badge, -w / 2 + 10 + bw / 2, 1, size * 0.6, '#fff');
      tx = (bw + 10) / 2;
    }
    text(c, s, tx, 2, size, C.ink);
    c.restore();
  });
}

/** Con số lớn đếm lên tới `value` theo p (vd. "125 mm", "3 km"). */
export function counter(c: CanvasRenderingContext2D, value: number, x: number, y: number, p: number, opt: { unit?: string; size?: number; color?: string; decimals?: number } = {}) {
  if (p <= 0) return;
  const v = value * (1 - Math.pow(1 - clamp01(p), 3));
  const s = v.toFixed(opt.decimals ?? 0) + (opt.unit ? ' ' + opt.unit : '');
  withA(c, clamp01(p * 4), () => text(c, s, x, y, opt.size ?? 72, opt.color ?? C.ink, 900));
}

/** Mũi tên thẳng, p 0..1 để vẽ dần. */
export function arrow(c: CanvasRenderingContext2D, a: Pt, b: Pt, opt: { p?: number; color?: string; w?: number; head?: number } = {}) {
  const p = opt.p ?? 1;
  if (p <= 0) return;
  const color = opt.color ?? C.ink, w = opt.w ?? 6, head = opt.head ?? w * 4;
  const x2 = lerp(a[0], b[0], p), y2 = lerp(a[1], b[1], p);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  line(c, [a, [x2 - Math.cos(ang) * head * 0.6, y2 - Math.sin(ang) * head * 0.6]], color, w);
  poly(c, [[x2, y2], [x2 - Math.cos(ang - 0.45) * head, y2 - Math.sin(ang - 0.45) * head], [x2 - Math.cos(ang + 0.45) * head, y2 - Math.sin(ang + 0.45) * head]], color, null, 0);
}

/** Mũi tên cong theo đường gấp khúc pts, vẽ dần theo p. */
export function pathArrow(c: CanvasRenderingContext2D, pts: Pt[], opt: { p?: number; color?: string; w?: number; head?: number; dash?: number[] } = {}) {
  const p = opt.p ?? 1;
  if (p <= 0 || pts.length < 2) return;
  const color = opt.color ?? C.ink, w = opt.w ?? 6, head = opt.head ?? w * 4;
  const seg: number[] = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); seg.push(d); L += d; }
  let rem = L * clamp01(p);
  const out: Pt[] = [pts[0]!];
  let ang = 0;
  for (let i = 1; i < pts.length && rem > 0; i++) {
    const d = seg[i - 1]!, a = pts[i - 1]!, b = pts[i]!;
    ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (rem >= d) { out.push(b); rem -= d; }
    else { out.push([lerp(a[0], b[0], rem / d), lerp(a[1], b[1], rem / d)]); rem = 0; }
  }
  const tip = out[out.length - 1]!;
  const body = out.slice(0, -1).concat([[tip[0] - Math.cos(ang) * head * 0.6, tip[1] - Math.sin(ang) * head * 0.6]]);
  line(c, body, color, w, opt.dash);
  poly(c, [tip, [tip[0] - Math.cos(ang - 0.45) * head, tip[1] - Math.sin(ang - 0.45) * head], [tip[0] - Math.cos(ang + 0.45) * head, tip[1] - Math.sin(ang + 0.45) * head]], color, null, 0);
}

/** Đường đứt chạy (đường ngắm, đường liên lạc). off tăng theo thời gian để "chảy". */
export function dashed(c: CanvasRenderingContext2D, a: Pt, b: Pt, color: string = C.inkLight, w = 3, off = 0) {
  c.save();
  c.lineDashOffset = -off;
  line(c, [a, b], color, w, [w * 4, w * 3]);
  c.restore();
}

/** Thanh tiến độ/đo lường, p 0..1. */
export function bar(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number, color: string, a = 1) {
  withA(c, a, () => {
    rrect(c, x, y, w, h, h / 2, '#fff', C.ink, 3);
    if (p > 0.01) rrect(c, x + 3, y + 3, Math.max(h - 6, (w - 6) * clamp01(p)), h - 6, (h - 6) / 2, color, null, 0);
  });
}

/** Vòng lan (ping) để kéo mắt vào một điểm, p 0..1. */
export function ring(c: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, color: string = C.red, w = 5) {
  if (p <= 0 || p >= 1) return;
  withA(c, 1 - p, () => circle(c, x, y, r * (0.2 + 0.8 * p), null, color, w));
}

/** Vòng tròn khoanh đối tượng, vẽ dần theo p (như bút khoanh). */
export function circleMark(c: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, color: string = C.red, w = 6) {
  if (p <= 0) return;
  c.beginPath();
  c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01(p) * 1.04);
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.stroke();
}

/**
 * Khung ngắm 4 góc quanh bộ phận được nêu tên (dùng cùng zoom vào bộ phận).
 * p 0..1: góc bay từ ngoài vào khít hộp.
 */
export function focus(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number, color: string = C.ink, lw = 5) {
  if (p <= 0) return;
  const e = 1 - Math.pow(1 - clamp01(p), 3);
  const g = (1 - e) * 60, L = Math.min(w, h) * 0.28;
  withA(c, clamp01(p * 3), () => {
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const cx = x + w / 2 + sx * (w / 2 + g), cy = y + h / 2 + sy * (h / 2 + g);
      line(c, [[cx, cy - sy * L], [cx, cy], [cx - sx * L, cy]], color, lw);
    }
  });
}

/** Dấu X (bị diệt/không được). */
export function xMark(c: CanvasRenderingContext2D, x: number, y: number, r: number, p = 1, color: string = C.red, w = 8) {
  if (p <= 0) return;
  const a = clamp01(p * 2), b = clamp01(p * 2 - 1);
  line(c, [[x - r, y - r], [x - r + 2 * r * a, y - r + 2 * r * a]], color, w);
  if (b > 0) line(c, [[x + r, y - r], [x + r - 2 * r * b, y - r + 2 * r * b]], color, w);
}

/** Tâm ngắm. */
export function crosshair(c: CanvasRenderingContext2D, x: number, y: number, r = 40, color: string = C.red, a = 1, rot = 0) {
  withA(c, a, () => {
    c.save(); c.translate(x, y); c.rotate(rot);
    circle(c, 0, 0, r, null, color, 4);
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      line(c, [[Math.cos(ang) * r * 0.5, Math.sin(ang) * r * 0.5], [Math.cos(ang) * r * 1.35, Math.sin(ang) * r * 1.35]], color, 4);
    }
    c.restore();
  });
}
