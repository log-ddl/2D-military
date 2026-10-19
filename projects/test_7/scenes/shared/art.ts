// kit/art.ts — bảng màu nền sáng, thời gian/easing, hình cơ bản.
// Không chứa chủ thể (xe, tàu, lính...). Chủ thể vẽ trong từng project.
export type Pt = [number, number];
export type Fill = string | CanvasGradient | CanvasPattern | null;

export const W = 1920;
export const H = 1080;

/** Bảng màu nền sáng. Màu nhấn chỉ dùng có chủ đích (ta/địch, nguy hiểm, chú ý). */
export const C = {
  bg: '#f4f8fb',
  bg2: '#e8eff4',
  paper: '#ffffff',
  ink: '#1e293b',
  inkLight: '#475569',
  inkDim: '#94a3b8',
  grid: 'rgba(70,110,140,0.10)',

  steel: '#64748b',
  steelDark: '#334155',
  steelLight: '#cbd5e1',

  ally: '#7d8b5a',
  allyD: '#56633d',
  foe: '#b4493c',
  foeD: '#7f2e26',
  skin: '#f1d3b0',

  blue: '#2563eb',
  cyan: '#06b6d4',
  green: '#16a34a',
  yellow: '#eab308',
  amber: '#d97706',
  orange: '#ea580c',
  red: '#dc2626',
  white: '#ffffff',
};

// ── Thời gian & easing ─────────────────────────────────────────────
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** Tiến độ tuyến tính 0..1 trong [a, b]. */
export const ph = (t: number, a: number, b: number) => (b === a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a)));
/** smoothstep */
export const sm = (t: number, a: number, b: number) => { const p = ph(t, a, b); return p * p * (3 - 2 * p); };
/** ease-out cubic */
export const eo = (t: number, a: number, b: number) => 1 - Math.pow(1 - ph(t, a, b), 3);
/** ease-in quad */
export const ei = (t: number, a: number, b: number) => { const p = ph(t, a, b); return p * p; };
/** ease-in-out cubic */
export const eio = (t: number, a: number, b: number) => { const p = ph(t, a, b); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
/** Vượt đích rồi về (ease-out back): đồ vật "bật" vào khung. */
export const back = (t: number, a: number, b: number, k = 1.7) => { const p = ph(t, a, b) - 1; return 1 + (k + 1) * p * p * p + k * p * p; };
/** Xung lên rồi xuống trong [a, a+d]. */
export const bump = (t: number, a: number, d: number) => { const p = (t - a) / d; return p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI); };
/** Hiện trong [a, b] có fade vào/ra. */
export const win = (t: number, a: number, b: number, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));
/** Nội suy theo keyframe [[t, v], ...], mượt giữa các key. */
export function keys(t: number, k: Pt[], smooth = true): number {
  if (t <= k[0]![0]) return k[0]![1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i]![0]) {
      const [t0, v0] = k[i - 1]!;
      const [t1, v1] = k[i]!;
      return lerp(v0, v1, smooth ? sm(t, t0, t1) : ph(t, t0, t1));
    }
  }
  return k[k.length - 1]![1];
}
export const keysLin = (t: number, k: Pt[]) => keys(t, k, false);

/** Số giả ngẫu nhiên ổn định theo seed (render từng frame nên không dùng Math.random). */
export function rnd(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.replace('#', ''), 16), bh = parseInt(b.replace('#', ''), 16);
  const ch = (s: number) => Math.round(lerp((ah >> s) & 255, (bh >> s) & 255, clamp01(t)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Độ phóng hiện tại của context (để giữ nét cố định theo pixel màn hình). */
export function scaleOf(c: CanvasRenderingContext2D) {
  const m = c.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}
/** n pixel màn hình đổi ra đơn vị của transform hiện tại. */
export const px = (c: CanvasRenderingContext2D, n: number) => n / scaleOf(c);

// ── Hình cơ bản ────────────────────────────────────────────────────
export function withA(c: CanvasRenderingContext2D, a: number, fn: () => void) {
  if (a <= 0.001) return;
  c.save();
  c.globalAlpha *= clamp01(a);
  fn();
  c.restore();
}

export function path(c: CanvasRenderingContext2D, pts: Pt[], close = true) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
}

export function fs(c: CanvasRenderingContext2D, fill: Fill, stroke: string | null, w = 3) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke && w > 0) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  }
}

export function poly(c: CanvasRenderingContext2D, pts: Pt[], fill: Fill, stroke: string | null = C.ink, w = 3) {
  path(c, pts);
  fs(c, fill, stroke, w);
}

export function line(c: CanvasRenderingContext2D, pts: Pt[], color = C.ink, w = 3, dash?: number[]) {
  path(c, pts, false);
  if (dash) c.setLineDash(dash);
  fs(c, null, color, w);
  c.setLineDash([]);
}

export function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: Fill, stroke: string | null = C.ink, lw = 3) {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
  fs(c, fill, stroke, lw);
}

export function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: Fill, stroke: string | null = C.ink, lw = 3) {
  c.beginPath();
  c.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  fs(c, fill, stroke, lw);
}

export function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: Fill, stroke: string | null = C.ink, lw = 3) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
  fs(c, fill, stroke, lw);
}

/** Đoạn dày đầu tròn có viền: dùng cho chi, ống, nòng. */
export function capsule(c: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, fill: string, stroke: string | null = C.ink, lw = 3) {
  c.lineCap = 'round';
  if (stroke && lw > 0) {
    c.strokeStyle = stroke; c.lineWidth = w + lw * 2;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  c.strokeStyle = fill; c.lineWidth = w;
  c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
}

/** Nền phẳng cả khung (màn hình). */
export function clear(c: CanvasRenderingContext2D, color: string = C.bg) {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = color;
  c.fillRect(0, 0, W, H);
  c.restore();
}
