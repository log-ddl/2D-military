// Địa hình 2D tự sinh: đường chân trời đồi núi (nhìn ngang) và đường đồng mức (bản đồ nhìn từ trên).
import { noise2D } from '@remotion/noise';
import { smoothPath, type Pt } from './path';

/** Height 0..1 theo fBm từ @remotion/noise (tất định theo seed). */
export const height2 = (seed: string, x: number, y: number, oct = 4) => {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2D(seed + i, x * f, y * f); n += a; a *= 0.5; f *= 2; }
  return 0.5 + 0.5 * (s / n);
};

/**
 * Dải đồi nhìn ngang: path khép kín từ x0 tới x1, chân ở `base` (y), nhô cao tối đa `amp` px, bước sóng `wave` px.
 * Vẽ nhiều lớp (xa nhạt, gần đậm, dịch theo camera chậm hơn) để có chiều sâu.
 */
export const skyline = (seed: string, x0: number, x1: number, base: number, amp: number, wave = 600, bottom = 2000) => {
  const pts: Pt[] = [];
  for (let x = x0; x <= x1; x += wave / 12) pts.push([x, base - amp * height2(seed, x / wave, 0, 3)]);
  return smoothPath(pts) + ` L${x1} ${bottom} L${x0} ${bottom} Z`;
};

/**
 * Đường đồng mức cho bản đồ w×h: marching squares trên lưới `cell` px, `levels` mức đều nhau.
 * Trả mảng { level, d } (path SVG gồm các đoạn thẳng nhỏ). Nên tính một lần ở cấp module hoặc useMemo.
 */
export const contours = (seed: string, w: number, h: number, levels = 9, cell = 16, scale = 520) => {
  const nx = Math.ceil(w / cell) + 1, ny = Math.ceil(h / cell) + 1;
  const v = (i: number, j: number) => height2(seed, (i * cell) / scale, (j * cell) / scale);
  const grid = Array.from({ length: ny }, (_, j) => Array.from({ length: nx }, (_, i) => v(i, j)));
  const out: { level: number; d: string }[] = [];
  for (let l = 1; l <= levels; l++) {
    const th = 0.2 + (0.6 * l) / (levels + 1);
    let d = '';
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], e = grid[j + 1][i];
      const x = i * cell, y = j * cell;
      const lerp = (p: number, q: number) => (th - p) / (q - p);
      const pts: Pt[] = [];
      if ((a < th) !== (b < th)) pts.push([x + cell * lerp(a, b), y]);
      if ((b < th) !== (c < th)) pts.push([x + cell, y + cell * lerp(b, c)]);
      if ((e < th) !== (c < th)) pts.push([x + cell * lerp(e, c), y + cell]);
      if ((a < th) !== (e < th)) pts.push([x, y + cell * lerp(a, e)]);
      for (let k = 0; k + 1 < pts.length; k += 2) d += `M${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}L${pts[k + 1][0].toFixed(1)} ${pts[k + 1][1].toFixed(1)}`;
    }
    out.push({ level: l, d });
  }
  return out;
};
