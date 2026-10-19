// kit/map.ts — bản đồ chiến thuật nhìn từ trên: nền, lưới, địa hình đơn giản, ký hiệu đơn vị,
// mũi tiến công, tuyến mặt trận, vùng, góc quạt. Vẽ BÊN TRONG camera.begin/end.
// Quy ước: KM = 100 đơn vị thế giới. Nét dùng px(c, n) để giữ độ dày theo pixel màn hình.
import { C, type Pt, clamp01, lerp, rnd, px, withA, line, poly, circle, path, fs, ellipse } from './art';
import { type Cam, view } from './camera';

export const KM = 100;

/** Nền bản đồ + lưới 1 km. Gọi sau camera.begin. */
export function mapBg(c: CanvasRenderingContext2D, k: Cam, opt: { color?: string; grid?: number; gridColor?: string } = {}) {
  const v = view(k, 50);
  c.fillStyle = opt.color ?? '#ece6cf';
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const g = opt.grid ?? KM;
  if (g <= 0) return;
  c.strokeStyle = opt.gridColor ?? 'rgba(120,100,60,0.14)';
  c.lineWidth = px(c, 1.5);
  c.beginPath();
  for (let x = Math.floor(v.x0 / g) * g; x < v.x1; x += g) { c.moveTo(x, v.y0); c.lineTo(x, v.y1); }
  for (let y = Math.floor(v.y0 / g) * g; y < v.y1; y += g) { c.moveTo(v.x0, y); c.lineTo(v.x1, y); }
  c.stroke();
}

// ── Địa hình ──────────────────────────────────────────────────────
function smoothPath(c: CanvasRenderingContext2D, pts: Pt[]) {
  c.beginPath();
  c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i]![0] + pts[i + 1]![0]) / 2, my = (pts[i]![1] + pts[i + 1]![1]) / 2;
    c.quadraticCurveTo(pts[i]![0], pts[i]![1], mx, my);
  }
  const l = pts[pts.length - 1]!;
  c.lineTo(l[0], l[1]);
}

export function river(c: CanvasRenderingContext2D, pts: Pt[], w = 30) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  smoothPath(c, pts); c.strokeStyle = '#7fb3cf'; c.lineWidth = w + px(c, 4); c.stroke();
  smoothPath(c, pts); c.strokeStyle = '#b9dcec'; c.lineWidth = w; c.stroke();
}

export function road(c: CanvasRenderingContext2D, pts: Pt[], w = 14) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  smoothPath(c, pts); c.strokeStyle = '#8f8670'; c.lineWidth = w + px(c, 3); c.stroke();
  smoothPath(c, pts); c.strokeStyle = '#f8f4e6'; c.lineWidth = w; c.stroke();
}

/** Mảng rừng tròn méo quanh (x, y), bán kính r. */
export function forest(c: CanvasRenderingContext2D, x: number, y: number, r: number, seed = 1) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(seed + i);
    const d = r * 0.55 * rnd(seed + i * 3);
    circle(c, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.45 + 0.25 * rnd(seed + i * 5)), '#c3d19c', null, 0);
  }
  circle(c, x, y, r * 0.55, '#b3c48a', null, 0);
}

/** Cụm nhà (thị trấn) nhìn từ trên. */
export function town(c: CanvasRenderingContext2D, x: number, y: number, r: number, seed = 1) {
  for (let i = 0; i < 12; i++) {
    const a = rnd(seed + i) * Math.PI * 2, d = r * Math.sqrt(rnd(seed + i * 7));
    const s = r * (0.12 + 0.08 * rnd(seed + i * 3));
    c.save(); c.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); c.rotate(rnd(seed + i * 11) * 0.5);
    c.beginPath(); c.rect(-s, -s * 0.7, s * 2, s * 1.4); fs(c, '#d6cbb0', C.inkLight, px(c, 1.5));
    c.restore();
  }
}

/** Đồi: các đường đồng mức lồng nhau. */
export function hill(c: CanvasRenderingContext2D, x: number, y: number, r: number, n = 4, seed = 1) {
  for (let i = 0; i < n; i++) {
    const k = 1 - i / n;
    ellipse(c, x + (rnd(seed + i) - 0.5) * r * 0.1, y, r * k, r * k * 0.7, 0.3, i === n - 1 ? 'rgba(160,130,80,0.18)' : null, 'rgba(140,110,60,0.45)', px(c, 2));
  }
}

// ── Ký hiệu chiến thuật ───────────────────────────────────────────
export type UnitKind = 'inf' | 'armor' | 'mech' | 'art' | 'recon' | 'hq' | 'air' | 'ad';

/**
 * Ký hiệu đơn vị kiểu NATO đơn giản: ta = chữ nhật xanh, địch = hình thoi đỏ.
 * s = cạnh ngang (đơn vị thế giới). dead 0..1 gạch chéo.
 */
export function unit(c: CanvasRenderingContext2D, x: number, y: number, kind: UnitKind, side: 'ally' | 'foe', s = 60, opt: { a?: number; dead?: number } = {}) {
  withA(c, opt.a ?? 1, () => {
    const lw = px(c, 3), col = side === 'ally' ? '#9cc3f0' : '#f2a7a0', w = s, h = s * 0.66;
    c.save(); c.translate(x, y);
    if (side === 'ally') { c.beginPath(); c.rect(-w / 2, -h / 2, w, h); }
    else path(c, [[0, -h * 0.8], [w * 0.55, 0], [0, h * 0.8], [-w * 0.55, 0]]);
    fs(c, col, C.ink, lw);
    const iw = side === 'ally' ? w / 2 : w * 0.3, ih = side === 'ally' ? h / 2 : h * 0.42;
    const ink = (pts: Pt[]) => line(c, pts, C.ink, lw);
    if (kind === 'inf' || kind === 'mech') { ink([[-iw, -ih], [iw, ih]]); ink([[iw, -ih], [-iw, ih]]); }
    if (kind === 'armor' || kind === 'mech') ellipse(c, 0, 0, iw * 0.7, ih * 0.55, 0, null, C.ink, lw);
    if (kind === 'art') circle(c, 0, 0, ih * 0.35, C.ink, null, 0);
    if (kind === 'recon') ink([[-iw, ih], [iw, -ih]]);
    if (kind === 'hq') { ink([[-iw, ih], [-iw, -ih * 1.9]]); }
    if (kind === 'air') { ink([[-iw * 0.7, -ih * 0.4], [iw * 0.7, ih * 0.4]]); ink([[-iw * 0.7, ih * 0.4], [iw * 0.7, -ih * 0.4]]); ink([[-iw * 0.7, -ih * 0.4], [-iw * 0.7, ih * 0.4]]); ink([[iw * 0.7, -ih * 0.4], [iw * 0.7, ih * 0.4]]); }
    if (kind === 'ad') { c.beginPath(); c.arc(0, ih * 0.6, iw * 0.7, Math.PI, 0); fs(c, null, C.ink, lw); }
    const d = opt.dead ?? 0;
    if (d > 0) { line(c, [[-w * 0.7, -h * 0.9], [lerp(-w * 0.7, w * 0.7, clamp01(d * 2)), lerp(-h * 0.9, h * 0.9, clamp01(d * 2))]], C.red, px(c, 7)); if (d > 0.5) line(c, [[w * 0.7, -h * 0.9], [lerp(w * 0.7, -w * 0.7, clamp01(d * 2 - 1)), lerp(-h * 0.9, h * 0.9, clamp01(d * 2 - 1))]], C.red, px(c, 7)); }
    c.restore();
  });
}

function resample(pts: Pt[], p: number, n = 48): Pt[] {
  const seg: number[] = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); seg.push(d); L += d; }
  const out: Pt[] = [];
  for (let j = 0; j <= n; j++) {
    let s = (j / n) * L * clamp01(p), i = 0;
    while (i < seg.length - 1 && s > seg[i]!) { s -= seg[i]!; i++; }
    const a = pts[i]!, b = pts[i + 1]!, t = seg[i]! ? clamp01(s / seg[i]!) : 0;
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
  }
  return out;
}

/**
 * Mũi tiến công: dải dày thuôn có đầu mũi tên, mọc dần theo p dọc đường pts.
 * w = bề rộng thân (thế giới).
 */
export function advance(c: CanvasRenderingContext2D, pts: Pt[], p: number, opt: { color?: string; w?: number; a?: number } = {}) {
  if (p <= 0.01 || pts.length < 2) return;
  const color = opt.color ?? C.red, w = opt.w ?? 50;
  const q = resample(pts, p);
  const left: Pt[] = [], right: Pt[] = [];
  const head = w * 1.4;
  let tipAng = 0;
  for (let i = 0; i < q.length; i++) {
    const a = q[Math.max(0, i - 1)]!, b = q[Math.min(q.length - 1, i + 1)]!;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    tipAng = ang;
    const hw = (w / 2) * (0.75 + 0.25 * (i / (q.length - 1)));
    left.push([q[i]![0] + Math.cos(ang - Math.PI / 2) * hw, q[i]![1] + Math.sin(ang - Math.PI / 2) * hw]);
    right.push([q[i]![0] + Math.cos(ang + Math.PI / 2) * hw, q[i]![1] + Math.sin(ang + Math.PI / 2) * hw]);
  }
  const tip = q[q.length - 1]!;
  const hx = tip[0] + Math.cos(tipAng) * head, hy = tip[1] + Math.sin(tipAng) * head;
  const wing = w * 1.05;
  const shape: Pt[] = [
    ...left,
    [tip[0] + Math.cos(tipAng - Math.PI / 2) * wing, tip[1] + Math.sin(tipAng - Math.PI / 2) * wing],
    [hx, hy],
    [tip[0] + Math.cos(tipAng + Math.PI / 2) * wing, tip[1] + Math.sin(tipAng + Math.PI / 2) * wing],
    ...right.reverse(),
  ];
  withA(c, opt.a ?? 0.85, () => poly(c, shape, color, C.ink, px(c, 3)));
}

/** Tuyến mặt trận: đường có răng tam giác, răng hướng về phía `side` (1 trái, -1 phải theo chiều vẽ). */
export function front(c: CanvasRenderingContext2D, pts: Pt[], p = 1, opt: { color?: string; side?: 1 | -1; tooth?: number } = {}) {
  if (p <= 0) return;
  const color = opt.color ?? C.red, side = opt.side ?? 1, t = opt.tooth ?? 22;
  const q = resample(pts, p, 64);
  line(c, q, color, px(c, 5));
  let acc = 0;
  for (let i = 1; i < q.length; i++) {
    const a = q[i - 1]!, b = q[i]!;
    acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc < t * 2.2) continue;
    acc = 0;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = dy * side, ny = -dx * side;
    poly(c, [[b[0] - dx * t * 0.6, b[1] - dy * t * 0.6], [b[0] + nx * t, b[1] + ny * t], [b[0] + dx * t * 0.6, b[1] + dy * t * 0.6]], color, null, 0);
  }
}

/** Vùng (khu vực kiểm soát, bãi mìn...): đa giác tô nhạt + viền đứt. */
export function zone(c: CanvasRenderingContext2D, pts: Pt[], color: string = C.red, a = 1, dash = true) {
  withA(c, a, () => {
    path(c, pts);
    c.fillStyle = color; c.globalAlpha *= 0.16; c.fill(); c.globalAlpha /= 0.16;
    if (dash) c.setLineDash([px(c, 14), px(c, 10)]);
    fs(c, null, color, px(c, 3.5));
    c.setLineDash([]);
  });
}

/**
 * Góc quạt (tầm bắn, tầm quan sát, vùng phủ radar): tâm (x, y), bán kính r,
 * từ góc a0 tới a1 (radian). p 0..1 quét ra dần.
 */
export function fan(c: CanvasRenderingContext2D, x: number, y: number, r: number, a0: number, a1: number, p = 1, color: string = C.blue) {
  if (p <= 0) return;
  const e = lerp(a0, a1, clamp01(p));
  c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, a0, e); c.closePath();
  c.fillStyle = color; c.globalAlpha *= 0.18; c.fill(); c.globalAlpha /= 0.18;
  fs(c, null, color, px(c, 3));
}

/** Tuyến hành quân: đường đứt + chấm chạy theo p. */
export function route(c: CanvasRenderingContext2D, pts: Pt[], p: number, color: string = C.ink) {
  const all = resample(pts, 1, 64);
  line(c, all, color, px(c, 3), [px(c, 12), px(c, 10)]);
  if (p > 0 && p < 1) { const q = resample(pts, p, 64); const e = q[q.length - 1]!; circle(c, e[0], e[1], px(c, 10), color, '#fff', px(c, 3)); }
}

// ── Phụ kiện màn hình (gọi sau camera.end) ────────────────────────
/** Thước tỉ lệ ở toạ độ màn hình. */
export function scaleBar(c: CanvasRenderingContext2D, k: Cam, km: number, x: number, y: number) {
  const L = km * KM * k.z;
  line(c, [[x, y], [x + L, y]], C.ink, 5);
  line(c, [[x, y - 10], [x, y + 10]], C.ink, 4);
  line(c, [[x + L, y - 10], [x + L, y + 10]], C.ink, 4);
  c.font = "800 26px 'Archivo', sans-serif"; c.fillStyle = C.ink; c.textAlign = 'center';
  c.fillText(`${km} km`, x + L / 2, y - 16); c.textAlign = 'left';
}

/** Mũi tên chỉ Bắc ở toạ độ màn hình. */
export function north(c: CanvasRenderingContext2D, x: number, y: number, s = 40, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  poly(c, [[0, -s], [s * 0.45, s * 0.5], [0, s * 0.2], [-s * 0.45, s * 0.5]], C.ink, C.ink, 2);
  c.font = `800 ${s * 0.6}px 'Archivo', sans-serif`; c.fillStyle = C.ink; c.textAlign = 'center';
  c.fillText('B', 0, -s * 1.25); c.textAlign = 'left';
  c.restore();
}
