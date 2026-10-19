// Vật vẽ dùng chung cho cả phim: pháo, đạn, cối, xe, radar, drone, địa hình, ký hiệu nhìn từ trên.
// Quy ước: nhìn ngang, mặt đất y = 0, phía trên y âm, vật quay sang phải (dir = 1). Đơn vị ≈ px ở z = 1.
// Nhìn từ trên: hướng bắn mặc định sang phải.
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';

export const GROUND = '#e6e1cb';
export const GROUND_DK = '#cfc8a8';
export const SKY_TOP = '#f4f8fb';

export type Muzzle = { x: number; y: number; ang: number };

// ── Nền ───────────────────────────────────────────────────────────
/** Mặt đất nhìn ngang, trải hết khung; vạch nhỏ ghim theo thế giới để camera trôi vẫn đọc được. */
export function sideGround(c: CanvasRenderingContext2D, cam: K.Cam, y = 0, color = GROUND) {
  const v = K.view(cam, 60);
  c.fillStyle = color;
  c.fillRect(v.x0, y, v.x1 - v.x0, Math.max(0, v.y1 - y));
  c.beginPath(); c.moveTo(v.x0, y); c.lineTo(v.x1, y);
  c.strokeStyle = P.ink; c.lineWidth = A.px(c, 4); c.stroke();
  const step = 170;
  c.strokeStyle = GROUND_DK; c.lineWidth = A.px(c, 3); c.lineCap = 'round';
  c.beginPath();
  for (let i = Math.floor(v.x0 / step); i * step < v.x1; i++) {
    for (let k = 0; k < 3; k++) {
      const gx = i * step + A.rnd(i * 7 + k) * step, gy = y + 26 + k * 46 + A.rnd(i * 3 + k) * 20;
      if (gy > v.y1) continue;
      c.moveTo(gx, gy); c.lineTo(gx + 26 + A.rnd(i + k) * 30, gy);
    }
  }
  c.stroke();
}

/** Đồi/sườn núi: nổi lên từ mặt đất y = 0, tâm x, rộng w, cao h. */
export function ridge(c: CanvasRenderingContext2D, x: number, w: number, h: number, fill = '#d5dbb9') {
  const pts: A.Pt[] = [[x - w / 2, 0]];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const u = i / n, hh = h * Math.pow(Math.sin(Math.PI * u), 1.3);
    pts.push([x - w / 2 + u * w, -hh]);
  }
  pts.push([x + w / 2, 0]);
  A.poly(c, pts, fill, P.ink, A.px(c, 4));
}

/** Mặt cắt hố/chiến hào có lính địch ló đầu: trọng tâm là "mục tiêu không nhìn thấy". */
export function trench(c: CanvasRenderingContext2D, x: number, s = 1, n = 3, lie = 0) {
  c.save(); c.translate(x, 0); c.scale(s, s);
  for (let i = 0; i < n; i++) {
    const sx = -60 + i * 60;
    if (lie < 1) {
      // lính địch đứng sau tường hào
      const so = lieAlpha(lie);
      A.withA(c, so, () => soldier(c, sx, 6, 0.75, -1, 'foe'));
    }
  }
  A.rrect(c, -110, -30, 220, 34, 6, '#bfb48a', P.ink, 3);
  A.rrect(c, -110, 4, 220, 40, 0, GROUND_DK, null, 0);
  c.restore();
}
const lieAlpha = (l: number) => 1 - l;

export function soldier(c: CanvasRenderingContext2D, x: number, y: number, s = 1, dir: 1 | -1 = 1, skin: 'ally' | 'foe' | 'civil' = 'ally', aim = 0, walk?: number) {
  // vẽ người bằng hình khối đơn giản (không kéo rig của kit để giữ nét thống nhất)
  const body = skin === 'foe' ? P.enemy : P.olive, limb = skin === 'foe' ? '#7f2e26' : P.oliveDark;
  c.save(); c.translate(x, y); c.scale(dir * s, s);
  const sw = walk === undefined ? 0 : Math.sin(walk) * 12;
  A.line(c, [[0, -34], [-sw, 0]], limb, 8);
  A.line(c, [[0, -34], [sw, 0]], limb, 8);
  A.rrect(c, -12, -78, 24, 48, 9, body, P.ink, 3);
  A.circle(c, 0, -91, 11, P.skin, P.ink, 3);
  c.beginPath(); c.arc(0, -93, 12, Math.PI, 0); c.closePath();
  c.fillStyle = limb; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 3; c.stroke();
  c.save(); c.translate(0, -62); c.rotate(-aim);
  A.line(c, [[0, 0], [14, 0]], limb, 7);
  c.restore();
  c.restore();
}

// ── Pháo kéo ──────────────────────────────────────────────────────
export interface GunO {
  x: number; y?: number; s?: number; dir?: 1 | -1;
  elev?: number;      // góc nòng (rad)
  recoil?: number;    // 0..1 nòng lùi
  len?: number;       // hệ số chiều dài nòng (1 = bình thường)
  deploy?: number;    // 1 = càng chống đất, 0 = gập lên (đang kéo)
  alpha?: number;
  wheel?: number;     // góc quay bánh
  tint?: string;
}
function dirPt(o: GunO, lx: number, ly: number): [number, number] {
  const s = o.s ?? 1, d = o.dir ?? 1;
  return [o.x + d * s * lx, (o.y ?? 0) + s * ly];
}
export function towedGun(c: CanvasRenderingContext2D, o: GunO): Muzzle {
  const s = o.s ?? 1, d = o.dir ?? 1, el = o.elev ?? 0.3, len = (o.len ?? 1) * 300, dep = o.deploy ?? 1, rc = (o.recoil ?? 0) * 34;
  const body = o.tint ?? P.olive;
  A.withA(c, o.alpha ?? 1, () => {
    c.save(); c.translate(o.x, o.y ?? 0); c.scale(d * s, s);
    // càng
    const tx = A.lerp(-120, -225, dep), ty = A.lerp(-72, -3, dep);
    A.line(c, [[-34, -56], [tx, ty]], P.dark, 15);
    if (dep > 0.5) A.poly(c, [[tx - 10, ty - 16], [tx + 16, ty - 16], [tx + 8, ty + 4], [tx - 18, ty + 4]], P.slate, P.ink, 3);
    // nòng + giá nòng
    c.save(); c.translate(32, -96); c.rotate(-el);
    A.capsule(c, [-44 - rc, 0], [len - rc, 0], 15, P.dark, P.ink, 3);
    A.rrect(c, len - rc - 4, -13, 34, 26, 5, P.slate, P.ink, 3);
    A.rrect(c, -24, -17, 118, 34, 9, P.slate, P.ink, 3);
    c.restore();
    // thân xe + bánh + khiên
    A.rrect(c, -56, -74, 118, 36, 9, body, P.ink, 3);
    A.poly(c, [[42, -140], [60, -140], [66, -64], [42, -64]], P.oliveDark, P.ink, 3);
    c.save(); c.translate(-8, -36); c.rotate(o.wheel ?? 0);
    A.circle(c, 0, 0, 36, P.dark, P.ink, 4); A.circle(c, 0, 0, 15, P.light, P.ink, 3);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; A.line(c, [[0, 0], [Math.cos(a) * 30, Math.sin(a) * 30]], P.slate, 4); }
    c.restore();
    c.restore();
  });
  const tip = len - rc + 30;
  const [mx, my] = dirPt(o, 32 + Math.cos(el) * tip, -96 - Math.sin(el) * tip);
  return { x: mx, y: my, ang: d > 0 ? -el : Math.PI + el };
}

// ── Pháo tự hành ─────────────────────────────────────────────────
export interface SpO extends GunO { wheels?: boolean; track?: number; }
export function spGun(c: CanvasRenderingContext2D, o: SpO): Muzzle {
  const s = o.s ?? 1, d = o.dir ?? 1, el = o.elev ?? 0.3, len = (o.len ?? 1) * 340, rc = (o.recoil ?? 0) * 34;
  const body = o.tint ?? P.olive;
  A.withA(c, o.alpha ?? 1, () => {
    c.save(); c.translate(o.x, o.y ?? 0); c.scale(d * s, s);
    // nòng sau tháp pháo
    c.save(); c.translate(62, -140); c.rotate(-el);
    A.capsule(c, [-30 - rc, 0], [len - rc, 0], 17, P.dark, P.ink, 3);
    A.rrect(c, len - rc - 4, -14, 36, 28, 5, P.slate, P.ink, 3);
    c.restore();
    if (o.wheels) {
      A.poly(c, [[-170, -64], [180, -64], [168, -112], [-165, -112]], body, P.ink, 4);
      for (const wx of [-120, -42, 42, 120]) {
        c.save(); c.translate(wx, -36); c.rotate((o.track ?? 0) * 0.03);
        A.circle(c, 0, 0, 36, P.dark, P.ink, 4); A.circle(c, 0, 0, 14, P.light, P.ink, 3);
        A.line(c, [[0, 0], [0, -26]], P.slate, 4);
        c.restore();
      }
    } else {
      A.poly(c, [[-170, -52], [182, -52], [158, -112], [-160, -112]], body, P.ink, 4);
      A.rrect(c, -184, -58, 368, 58, 29, P.dark, P.ink, 4);
      for (let i = 0; i < 6; i++) {
        const wx = -144 + i * 57.6;
        c.save(); c.translate(wx, -29); c.rotate((o.track ?? 0) * 0.04);
        A.circle(c, 0, 0, 19, P.slate, P.ink, 2.5); A.line(c, [[0, 0], [0, -14]], P.light, 3);
        c.restore();
      }
    }
    // tháp pháo
    A.poly(c, [[-90, -112], [112, -112], [96, -176], [-60, -176]], P.oliveLight, P.ink, 4);
    A.circle(c, -20, -184, 13, P.dark, P.ink, 3);
    c.restore();
  });
  const tip = len - rc + 32;
  const [mx, my] = dirPt(o, 62 + Math.cos(el) * tip, -140 - Math.sin(el) * tip);
  return { x: mx, y: my, ang: d > 0 ? -el : Math.PI + el };
}

// ── Cối ───────────────────────────────────────────────────────────
export function mortar(c: CanvasRenderingContext2D, o: { x: number; y?: number; s?: number; dir?: 1 | -1; ang?: number; recoil?: number; alpha?: number }): Muzzle {
  const s = o.s ?? 1, d = o.dir ?? 1, a = o.ang ?? 1.25, L = 130, rc = (o.recoil ?? 0) * 10;
  A.withA(c, o.alpha ?? 1, () => {
    c.save(); c.translate(o.x, o.y ?? 0); c.scale(d * s, s);
    A.ellipse(c, 0, -6, 38, 9, 0, P.dark, P.ink, 3);
    // chân chống
    const bx = Math.cos(a) * L * 0.7, by = -10 - Math.sin(a) * L * 0.7;
    A.line(c, [[bx, by], [bx + 54, -2]], P.slate, 7);
    A.line(c, [[bx, by], [bx + 8, -2]], P.slate, 7);
    c.save(); c.translate(0, -10); c.rotate(-a);
    A.capsule(c, [-rc, 0], [L - rc, 0], 17, P.dark, P.ink, 3);
    A.rrect(c, L - rc - 6, -11, 14, 22, 3, P.slate, P.ink, 2.5);
    c.restore();
    c.restore();
  });
  const [mx, my] = dirPt({ x: o.x, y: o.y, s, dir: d }, Math.cos(a) * (L + 8 - rc), -10 - Math.sin(a) * (L + 8 - rc));
  return { x: mx, y: my, ang: d > 0 ? -a : Math.PI + a };
}

// ── Đạn pháo ──────────────────────────────────────────────────────
/** Đạn pháo nhìn ngang, dài ~ 90 * s, hướng +x xoay ang. kind: 'plain' | 'guided' | 'rocket'. */
export function shell(c: CanvasRenderingContext2D, x: number, y: number, ang: number, s = 1, kind: 'plain' | 'guided' | 'rocket' = 'plain', col: string = P.oliveLight) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  A.rrect(c, -40, -11, 62, 22, 5, col, P.ink, 3);
  A.poly(c, [[20, -11], [58, 0], [20, 11]], kind === 'guided' ? P.sky : P.enemy, P.ink, 3);
  A.rrect(c, -26, -13, 9, 26, 2, '#d1a23c', P.ink, 2);
  if (kind === 'guided') {
    // cánh lái nhỏ ở mũi
    A.poly(c, [[34, -10], [28, -22], [40, -10]], P.dark, P.ink, 2);
    A.poly(c, [[34, 10], [28, 22], [40, 10]], P.dark, P.ink, 2);
  }
  if (kind === 'rocket') A.poly(c, [[-40, -9], [-62, -14], [-62, 14], [-40, 9]], P.slate, P.ink, 2);
  c.restore();
}

// ── Xe tải ───────────────────────────────────────────────────────
export function truck(c: CanvasRenderingContext2D, o: { x: number; y?: number; s?: number; dir?: 1 | -1; load?: number; wheel?: number; alpha?: number }) {
  const s = o.s ?? 1, d = o.dir ?? 1, load = o.load ?? 1;
  A.withA(c, o.alpha ?? 1, () => {
    c.save(); c.translate(o.x, o.y ?? 0); c.scale(d * s, s);
    A.rrect(c, -150, -108, 210, 62, 6, P.sand, P.ink, 3);       // thùng
    // hòm đạn
    const n = Math.round(6 * load);
    for (let i = 0; i < n; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      A.rrect(c, -142 + col * 64, -134, 56, 26, 3, P.oliveDark, P.ink, 2.5);
    }
    A.poly(c, [[66, -108], [118, -108], [150, -70], [150, -44], [66, -44]], P.olive, P.ink, 3);
    A.poly(c, [[78, -100], [114, -100], [134, -74], [78, -74]], P.glass, P.ink, 2);
    A.rrect(c, -160, -52, 320, 16, 4, P.dark, P.ink, 3);
    for (const wx of [-100, -30, 100]) {
      c.save(); c.translate(wx, -30); c.rotate(o.wheel ?? 0);
      A.circle(c, 0, 0, 31, P.dark, P.ink, 4); A.circle(c, 0, 0, 12, P.light, P.ink, 3);
      A.line(c, [[0, 0], [0, -22]], P.slate, 3);
      c.restore();
    }
    c.restore();
  });
}

// ── Radar, drone, trạm chỉ huy ───────────────────────────────────
export function radar(c: CanvasRenderingContext2D, o: { x: number; y?: number; s?: number; dir?: 1 | -1; spin?: number; col?: string }) {
  const s = o.s ?? 1, d = o.dir ?? 1;
  c.save(); c.translate(o.x, o.y ?? 0); c.scale(d * s, s);
  A.rrect(c, -90, -86, 180, 56, 8, o.col ?? P.slate, P.ink, 3);
  for (const wx of [-56, 56]) { A.circle(c, wx, -26, 24, P.dark, P.ink, 3.5); A.circle(c, wx, -26, 9, P.light, P.ink, 2.5); }
  A.line(c, [[0, -86], [0, -150]], P.dark, 10);
  // tấm ăng ten quay: bề rộng co giãn theo cos
  const w = 90 * (0.25 + 0.75 * Math.abs(Math.cos(o.spin ?? 0)));
  A.rrect(c, -w / 2, -214, w, 66, 6, P.sky, P.ink, 3.5);
  c.restore();
}

export function drone(c: CanvasRenderingContext2D, x: number, y: number, s = 1, t = 0, tilt = 0.1) {
  c.save(); c.translate(x, y); c.rotate(tilt); c.scale(s, s);
  A.rrect(c, -30, -10, 60, 20, 8, P.dark, P.ink, 3);
  A.circle(c, 22, 10, 7, P.sky, P.ink, 2);
  A.line(c, [[-30, -10], [-48, -22]], P.slate, 5); A.line(c, [[30, -10], [48, -22]], P.slate, 5);
  const w = 24 + 14 * Math.sin(t * 60);
  A.line(c, [[-48 - w, -24], [-48 + w, -24]], P.ink2, 4);
  A.line(c, [[48 - w, -24], [48 + w, -24]], P.ink2, 4);
  c.restore();
}

/** Xe trạm chỉ huy hỏa lực: hộp xe, ăng ten, màn hình lộ ra. */
export function fdcVan(c: CanvasRenderingContext2D, o: { x: number; y?: number; s?: number; dir?: 1 | -1; alpha?: number }) {
  const s = o.s ?? 1, d = o.dir ?? 1;
  A.withA(c, o.alpha ?? 1, () => {
    c.save(); c.translate(o.x, o.y ?? 0); c.scale(d * s, s);
    A.rrect(c, -130, -150, 220, 112, 10, P.light, P.ink, 3.5);
    A.poly(c, [[90, -134], [136, -134], [160, -88], [160, -40], [90, -40]], P.olive, P.ink, 3);
    A.poly(c, [[100, -126], [128, -126], [146, -90], [100, -90]], P.glass, P.ink, 2);
    A.rrect(c, -100, -128, 120, 70, 6, '#1e293b', P.ink, 2.5);
    A.line(c, [[-30, -150], [-30, -230]], P.dark, 6); A.line(c, [[-70, -230], [10, -230]], P.dark, 6);
    A.rrect(c, -170, -46, 340, 14, 4, P.dark, P.ink, 3);
    for (const wx of [-90, 0, 100]) { A.circle(c, wx, -30, 30, P.dark, P.ink, 4); A.circle(c, wx, -30, 11, P.light, P.ink, 3); }
    c.restore();
  });
}

// ── Ký hiệu nhìn từ trên (bản đồ) ───────────────────────────────
export type TopKind = 'towed' | 'sp' | 'mortar' | 'truck' | 'radar' | 'fdc';
/** Biểu tượng vật nhìn từ trên. rot = hướng nòng/đầu xe (rad, 0 = sang phải). s ≈ chiều dài / 100. */
export function top(c: CanvasRenderingContext2D, kind: TopKind, x: number, y: number, rot = 0, s = 1, side: 'ally' | 'foe' = 'ally', a = 1) {
  const col = side === 'ally' ? P.olive : P.enemy;
  const colD = side === 'ally' ? P.oliveDark : '#7f2e26';
  A.withA(c, a, () => {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    switch (kind) {
      case 'towed':
        A.line(c, [[0, 0], [70, 0]], P.dark, 9);
        A.line(c, [[-8, 0], [-52, -22]], P.dark, 7); A.line(c, [[-8, 0], [-52, 22]], P.dark, 7);
        A.rrect(c, -14, -26, 28, 52, 6, col, P.ink, 3);
        A.rrect(c, -22, -34, 44, 10, 3, P.dark, P.ink, 2); A.rrect(c, -22, 24, 44, 10, 3, P.dark, P.ink, 2);
        break;
      case 'sp':
        A.rrect(c, -50, -28, 100, 56, 10, col, P.ink, 3.5);
        A.rrect(c, -50, -36, 100, 12, 5, P.dark, P.ink, 2.5); A.rrect(c, -50, 24, 100, 12, 5, P.dark, P.ink, 2.5);
        A.rrect(c, -30, -20, 52, 40, 8, colD, P.ink, 3);
        A.line(c, [[10, 0], [120, 0]], P.dark, 9);
        break;
      case 'mortar':
        A.circle(c, 0, 0, 14, P.dark, P.ink, 3);
        A.line(c, [[0, 0], [34, 0]], P.dark, 8);
        break;
      case 'truck':
        A.rrect(c, -58, -22, 90, 44, 5, P.sand, P.ink, 3);
        A.rrect(c, 34, -22, 34, 44, 6, col, P.ink, 3);
        break;
      case 'radar':
        A.rrect(c, -40, -26, 80, 52, 7, P.slate, P.ink, 3);
        A.rrect(c, 40, -34, 12, 68, 4, P.sky, P.ink, 3);
        break;
      case 'fdc':
        A.rrect(c, -50, -28, 100, 56, 8, P.light, P.ink, 3);
        A.circle(c, 0, 0, 14, P.dark, null, 0);
        break;
    }
    c.restore();
  });
}

/** Cung đạn parabol nhìn ngang từ a tới b, đỉnh cao h. Trả danh sách điểm. */
export function arcPts(a: A.Pt, b: A.Pt, h: number, upto = 1, n = 48): A.Pt[] {
  const out: A.Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const p = (i / n) * upto;
    out.push([A.lerp(a[0], b[0], p), A.lerp(a[1], b[1], p) - 4 * h * p * (1 - p)]);
  }
  return out;
}
export function arcAt(a: A.Pt, b: A.Pt, h: number, p: number): [number, number, number] {
  const x = A.lerp(a[0], b[0], p), y = A.lerp(a[1], b[1], p) - 4 * h * p * (1 - p);
  const dy = b[1] - a[1] - 4 * h * (1 - 2 * p), dx = b[0] - a[0];
  return [x, y, Math.atan2(dy, dx)];
}

/** Đạn bay trên cung có vệt đứt; trả vị trí. p < 0 = chưa bắn. */
export function flight(c: CanvasRenderingContext2D, a: A.Pt, b: A.Pt, h: number, p: number, o: { kind?: 'plain' | 'guided' | 'rocket'; s?: number; trail?: string; w?: number; head?: boolean } = {}) {
  if (p <= 0) return;
  const q = A.clamp01(p);
  const w = o.w ?? A.px(c, 4);
  A.line(c, arcPts(a, b, h, q), o.trail ?? P.amber, w, [w * 3, w * 2.5]);
  if (p < 1 && o.head !== false) { const [x, y, ang] = arcAt(a, b, h, q); shell(c, x, y, ang, o.s ?? 0.6, o.kind ?? 'plain'); }
}

/** Hiện số lớn ở màn hình (số voice đọc ra). */
export function bigNum(c: CanvasRenderingContext2D, s: string, x: number, y: number, a = 1, size = 96, col: string = P.ink) {
  A.withA(c, a, () => {
    c.font = `900 ${size}px 'Archivo', sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = size * 0.16; c.strokeStyle = '#ffffff'; c.strokeText(s, x, y);
    c.fillStyle = col; c.fillText(s, x, y);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  });
}
/** Hình nền cho lúc cắt: nháy xuống nền trong dt giây quanh at (che chỗ nối). */
export function dip(c: CanvasRenderingContext2D, t: number, at: number, dt = 0.12) {
  const f = Math.max(0, 1 - Math.abs(t - at) / dt);
  if (f <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = f; c.fillStyle = A.C.bg; c.fillRect(0, 0, A.W, A.H);
  c.restore();
}

/** Cân hai đĩa. tilt > 0: đĩa phải thấp xuống. L/R vẽ vật đặt lên mặt đĩa (gốc ở mặt đĩa). */
export function balance(c: CanvasRenderingContext2D, x: number, y: number, tilt: number, L: (c: CanvasRenderingContext2D) => void, R: (c: CanvasRenderingContext2D) => void, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  A.poly(c, [[-70, 230], [70, 230], [0, 0]], P.slate, P.ink, 4);
  c.rotate(tilt);
  const half = 380;
  for (const sd of [-1, 1] as const) {
    const px = sd * half;
    A.line(c, [[px, 0], [px - 70, 180]], P.ink2, 4); A.line(c, [[px, 0], [px + 70, 180]], P.ink2, 4);
    c.save(); c.translate(px, 0); c.rotate(-tilt);
    c.beginPath(); c.moveTo(-90, 180); c.lineTo(90, 180); c.quadraticCurveTo(70, 215, 0, 215); c.quadraticCurveTo(-70, 215, -90, 180); c.closePath();
    A.fs(c, P.light, P.ink, 4);
    c.save(); c.translate(0, 178); (sd < 0 ? L : R)(c); c.restore();
    c.restore();
  }
  A.rrect(c, -half - 20, -14, half * 2 + 40, 28, 14, P.dark, P.ink, 4);
  A.circle(c, 0, 0, 18, P.amber, P.ink, 4);
  c.restore();
}

// ── Biểu tượng nhỏ ───────────────────────────────────────────────
/** Quả cân (trọng lượng). */
export function weightIcon(c: CanvasRenderingContext2D, x: number, y: number, s = 1, col: string = P.dark) {
  c.save(); c.translate(x, y); c.scale(s, s);
  A.poly(c, [[-46, 40], [46, 40], [30, -22], [-30, -22]], col, P.ink, 4);
  c.beginPath(); c.arc(0, -26, 18, Math.PI, 0); A.fs(c, null, P.ink, 8);
  c.restore();
}
/** Đồng tiền (chi phí). */
export function coin(c: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  A.circle(c, 0, 0, 40, '#f5c542', P.ink, 5);
  A.circle(c, 0, 0, 26, null, P.ink, 3);
  A.line(c, [[0, -14], [0, 14]], P.ink, 5);
  c.restore();
}
/** Ống nòng nhỏ có vạch tuổi thọ. life 0..1. */
export function barrelLife(c: CanvasRenderingContext2D, x: number, y: number, s = 1, life = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  A.rrect(c, -64, -14, 128, 28, 14, P.dark, P.ink, 4);
  A.rrect(c, -64, 30, 128, 18, 9, '#ffffff', P.ink, 3.5);
  if (life > 0.02) A.rrect(c, -60, 34, 120 * life, 10, 5, A.lerpColor('#dc2626', '#7d8b5a', life), null, 0);
  c.restore();
}
/** Đồng hồ bấm giờ; p 0..1 là tiến độ quét. */
export function stopwatch(c: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, col: string = P.amber) {
  A.circle(c, x, y, r, '#ffffff', P.ink, 6);
  c.beginPath(); c.moveTo(x, y); c.arc(x, y, r * 0.84, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.closePath();
  c.fillStyle = col; c.fill();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; A.line(c, [[x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8], [x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95]], P.ink, 4); }
  const an = -Math.PI / 2 + p * Math.PI * 2;
  A.line(c, [[x, y], [x + Math.cos(an) * r * 0.78, y + Math.sin(an) * r * 0.78]], P.ink, 6);
  A.circle(c, x, y, r * 0.09, P.ink, null, 0);
}
/** Mắt gạch chéo / mắt thường. slash 0..1. */
export function eye(c: CanvasRenderingContext2D, x: number, y: number, r: number, slash = 0, col: string = P.sky) {
  c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(0, -r * 0.9, r, 0); c.quadraticCurveTo(0, r * 0.9, -r, 0); c.closePath();
  A.fs(c, '#ffffff', P.ink, 6);
  A.circle(c, 0, 0, r * 0.32, col, P.ink, 4);
  if (slash > 0) A.line(c, [[-r * 0.9, r * 0.9], [-r * 0.9 + 1.8 * r * slash, r * 0.9 - 1.8 * r * slash]], P.enemy, 10);
  c.restore();
}
/** Lưới nguỵ trang phủ lên vật cao h, rộng w quanh x (nhìn ngang). cover 0..1 mức phủ. */
export function net(c: CanvasRenderingContext2D, x: number, w: number, h: number, cover = 1) {
  if (cover <= 0) return;
  const hh = h * cover;
  c.save();
  const pts: A.Pt[] = [[x - w / 2, 0]];
  for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([x - w / 2 + u * w, -hh * Math.pow(Math.sin(Math.PI * u), 0.55)]); }
  pts.push([x + w / 2, 0]);
  A.poly(c, pts, 'rgba(110,125,80,0.88)', P.ink, 4);
  c.clip();
  for (let k = -6; k < 20; k++) A.line(c, [[x - w / 2 + k * 30, 0], [x - w / 2 + k * 30 + hh, -hh]], 'rgba(60,75,40,0.6)', 4);
  c.restore();
}

/** Miệng nòng pháo tự hành (không vẽ), để tính cung đạn. */
export function spMuzzle(x: number, el: number, len = 1, s = 1, y = 0): { x: number; y: number } {
  const L = len * 340 + 32;
  return { x: x + s * (62 + Math.cos(el) * L), y: y + s * (-140 - Math.sin(el) * L) };
}
/** Độ cao đỉnh cung để tiếp tuyến đầu trùng góc nòng el. */
export function arcH(a: A.Pt, b: A.Pt, el: number): number {
  return (Math.tan(el) * (b[0] - a[0]) + (b[1] - a[1])) / 4;
}
/** Túi thuốc đẩy (bag charge). */
export function bag(c: CanvasRenderingContext2D, x: number, y: number, s = 1, a = 1) {
  A.withA(c, a, () => {
    c.save(); c.translate(x, y); c.scale(s, s);
    A.rrect(c, -42, -16, 84, 32, 14, P.sand, P.ink, 3.5);
    A.line(c, [[-14, -16], [-14, 16]], P.ink2, 3); A.line(c, [[14, -16], [14, 16]], P.ink2, 3);
    c.restore();
  });
}

/** Miệng nòng (mảng [x, y]) của pháo tự hành đặt ở x = 0, y = 0 với góc el. */
export function spMuzzleP(el: number, len = 1): A.Pt {
  const m = spMuzzle(0, el, len, 1, 0);
  return [m.x, m.y];
}
