import * as A from './shared/art';
import * as K from './shared/camera';

export const BG = '#f4f8fb';
/** Cú cắt đổi góc nhìn: nhúng nhanh vào màu nền quanh mốc `at`. */
export function dip(c: CanvasRenderingContext2D, t: number, at: number, d = 0.2) {
  const p = A.clamp01(1 - Math.abs(t - at) / d);
  if (p > 0) K.fade(c, p, BG);
}
/** Camera NGANG: mặt đất y=0 nằm ở hàng màn hình gy. */
export function sideCam(x: number, z: number, gy = 800): K.Cam {
  return { x, y: (540 - gy) / z, z };
}
/** Hàng xe xếp ngang dùng ở chương 1, 2 và 9 (thứ tự trong chuỗi nhân quả). */
export const LINE = { truck: 110, apc: 300, ifv: 470, tank: 700, arv: 930, bridge: 1150 } as const;
export type LineKey = keyof typeof LINE;
export const LINE_ORDER: LineKey[] = ['truck', 'apc', 'ifv', 'tank', 'arv', 'bridge'];

export type Pt = [number, number];
/** Vị trí + hướng tại quãng đường d trên đường gấp khúc. */
export function along(pts: Pt[], d: number): { x: number; y: number; ang: number } {
  let rem = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (rem <= L || i === pts.length - 1) {
      const u = Math.min(1, rem / L);
      return { x: A.lerp(a[0], b[0], u), y: A.lerp(a[1], b[1], u), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    rem -= L;
  }
  return { x: pts[0]![0], y: pts[0]![1], ang: 0 };
}
export function pathLen(pts: Pt[]) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); return L; }
/** Vẽ trong hệ toạ độ xoay quanh (x, y). */
export function at(c: CanvasRenderingContext2D, x: number, y: number, ang: number, fn: () => void) {
  c.save(); c.translate(x, y); c.rotate(ang); fn(); c.restore();
}
/** Đường cong parabol từ a → b, đỉnh cao h (dương = lên). */
export function arcPts(a: Pt, b: Pt, h: number, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) { const u = i / n; out.push([A.lerp(a[0], b[0], u), A.lerp(a[1], b[1], u) - 4 * h * u * (1 - u)]); }
  return out;
}

/** Vòng nhấn tĩnh (không phải ping): p = độ hiện 0..1, vẽ trong toạ độ hiện tại. */
export function halo(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, p: number, color = '#f59e0b', w = 6) {
  if (p <= 0.01) return;
  A.withA(c, A.clamp01(p), () => {
    c.strokeStyle = color; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke();
  });
}
