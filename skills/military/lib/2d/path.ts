// Hình học đường cho SVG: quỹ đạo, đường cong mượt qua điểm, vẽ dần theo tiến độ.
export type Pt = [number, number];

/** Điểm trên quỹ đạo parabol từ (x0,y0) tới (x1,y1), đỉnh cao `apex` px trên đường nối; s = 0..1. Trục y SVG hướng xuống. */
export const arcAt = (x0: number, y0: number, x1: number, y1: number, apex: number, s: number): Pt => [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s - apex * 4 * s * (1 - s)];

/** Đường quỹ đạo vẽ tới tiến độ p (0..1). */
export const arcPath = (x0: number, y0: number, x1: number, y1: number, apex: number, p = 1, n = 64) => {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) pts.push(arcAt(x0, y0, x1, y1, apex, (i / n) * p));
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
};

/** Góc tiếp tuyến (độ) của quỹ đạo tại s — để xoay viên đạn theo hướng bay. */
export const arcAngle = (x0: number, y0: number, x1: number, y1: number, apex: number, s: number) => {
  const [ax, ay] = arcAt(x0, y0, x1, y1, apex, Math.max(0, s - 0.01));
  const [bx, by] = arcAt(x0, y0, x1, y1, apex, Math.min(1, s + 0.01));
  return (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
};

/** Đường cong mượt (Catmull-Rom → Bézier) đi qua các điểm; `closed` để khép kín. */
export const smoothPath = (pts: Pt[], closed = false, k = 0.5) => {
  if (pts.length < 2) return '';
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) * k) / 3, p1[1] + ((p2[1] - p0[1]) * k) / 3];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) * k) / 3, p2[1] - ((p3[1] - p1[1]) * k) / 3];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return closed ? d + ' Z' : d;
};

/** Thuộc tính vẽ dần một đường có độ dài `len` tới tiến độ p: spread vào <path {...drawOn(len, p)} />. */
export const drawOn = (len: number, p: number) => ({ strokeDasharray: `${len} ${len}`, strokeDashoffset: len * (1 - Math.max(0, Math.min(1, p))) });
