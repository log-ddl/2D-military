// Vật vẽ dùng xuyên phim. Gốc (x, y) = điểm chạm đất giữa thân (máy bay: giữa thân). Hướng mặc định: sang PHẢI.
// Nét dày cố định theo pixel màn hình (px). Không Math.random.
import * as A from './shared/art';
import { P } from './shared/palette';

type Ctx = CanvasRenderingContext2D;
export const INK = P.ink;
const o = (c: Ctx) => A.px(c, 3.4); // nét ngoài
const n = (c: Ctx) => A.px(c, 2); // nét trong

/** Đặt hệ toạ độ cục bộ: (x,y), tỉ lệ s, hướng dir. */
export function at(c: Ctx, x: number, y: number, s: number, dir: 1 | -1, fn: () => void, a = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s * dir, s);
  if (a < 1) c.globalAlpha *= a;
  fn();
  c.restore();
}

// ── Hàng ──────────────────────────────────────────────────────────
export type CrateKind = 'cargo' | 'fuel' | 'ammo' | 'water' | 'part' | 'empty';
/** Kiện hàng: gốc ở giữa đáy, rộng 36, cao 32 (fuel/water cao 36). */
export function crate(c: Ctx, x: number, y: number, s = 1, kind: CrateKind = 'cargo', a = 1) {
  A.withA(c, a, () => {
    c.save(); c.translate(x, y); c.scale(s, s);
    const l = o(c);
    if (kind === 'fuel' || kind === 'water') {
      const col = kind === 'fuel' ? P.amber : P.sky;
      A.rrect(c, -17, -36, 34, 36, 7, col, INK, l);
      A.line(c, [[-17, -26], [17, -26]], INK, n(c));
      A.line(c, [[-17, -10], [17, -10]], INK, n(c));
      A.rrect(c, -5, -42, 10, 6, 2, P.dark, INK, n(c));
    } else if (kind === 'ammo') {
      A.rrect(c, -19, -30, 38, 30, 4, P.dark, INK, l);
      A.rrect(c, -19, -20, 38, 7, 0, '#eab308', null, 0);
      A.line(c, [[-19, -30], [19, -30]], INK, l);
    } else if (kind === 'part') {
      A.rrect(c, -17, -30, 34, 30, 4, P.sand, INK, l);
      A.circle(c, 0, -15, 8, P.light, INK, n(c));
      A.circle(c, 0, -15, 3, INK, null, 0);
    } else if (kind === 'empty') {
      A.rrect(c, -17, -30, 34, 30, 4, '#e5e9ee', P.slate, l);
      A.line(c, [[-17, -15], [17, -15]], P.slate, n(c), [4, 4]);
    } else {
      A.rrect(c, -18, -32, 36, 32, 4, P.sand, INK, l);
      A.rrect(c, -18, -21, 36, 8, 0, P.amber, null, 0);
      A.line(c, [[-18, -32], [18, -32]], INK, l);
    }
    c.restore();
  });
}

// ── Xe tải ────────────────────────────────────────────────────────
export interface TruckOpts {
  dir?: 1 | -1; ph?: number; load?: number; kind?: CrateKind; tank?: number; body?: string; a?: number; bob?: number;
}
/** Xe tải nhìn ngang (dài ~220, cao ~100). load = số kiện (0..4) hoặc tank = mức bình chứa 0..1 (xe bồn, hổ phách). */
export function truckSide(c: Ctx, x: number, y: number, s = 1, op: TruckOpts = {}) {
  const dir = op.dir ?? 1, body = op.body ?? P.olive, ph = op.ph ?? 0;
  const bob = (op.bob ?? 1) * Math.sin(ph * 2) * 1.2;
  at(c, x, y + bob, s, dir, () => {
    const l = o(c), li = n(c);
    // khung gầm
    A.rrect(c, -112, -44, 218, 14, 3, P.dark, INK, l);
    // thùng / bồn
    if (op.tank !== undefined) {
      A.rrect(c, -110, -92, 140, 48, 24, '#fff4d6', INK, l);
      c.save();
      c.beginPath(); c.roundRect(-110, -92, 140, 48, 24); c.clip();
      const lv = A.clamp01(op.tank);
      c.fillStyle = P.amber;
      c.fillRect(-112, -44 - 48 * lv, 144, 48 * lv + 2);
      c.restore();
      A.rrect(c, -110, -92, 140, 48, 24, null, INK, l);
      A.line(c, [[-60, -92], [-60, -44]], INK, li);
      A.line(c, [[-10, -92], [-10, -44]], INK, li);
    } else {
      A.rrect(c, -112, -56, 142, 14, 2, body, INK, l);
      const k = Math.round(A.clamp((op.load ?? 0) * 4, 0, 4));
      for (let i = 0; i < k; i++) crate(c, -92 + i * 38, -56, 1, op.kind ?? 'cargo');
    }
    // cabin
    A.poly(c, [[36, -44], [36, -100], [76, -100], [102, -68], [108, -44]], body, INK, l);
    A.poly(c, [[44, -92], [72, -92], [91, -70], [44, -70]], P.glass, INK, li);
    A.circle(c, 104, -54, 4, P.amber, INK, li);
    // bánh
    for (const wx of [-80, -42, 72]) wheel(c, wx, -20, 20, ph);
  }, op.a ?? 1);
}

export function wheel(c: Ctx, x: number, y: number, r: number, ph: number) {
  A.circle(c, x, y, r, P.dark, INK, o(c));
  A.circle(c, x, y, r * 0.5, P.light, INK, n(c));
  const a = ph * 2;
  A.line(c, [[x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45], [x - Math.cos(a) * r * 0.45, y - Math.sin(a) * r * 0.45]], INK, n(c));
}

/** Xe tải nhìn từ trên, hướng theo `ang` (rad, 0 = sang phải). Dài ~110, rộng ~48. */
export function truckTop(c: Ctx, x: number, y: number, s = 1, op: { ang?: number; load?: number; kind?: CrateKind; body?: string; a?: number; tank?: number } = {}) {
  A.withA(c, op.a ?? 1, () => {
    c.save(); c.translate(x, y); c.rotate(op.ang ?? 0); c.scale(s, s);
    const l = o(c), li = n(c), body = op.body ?? P.olive;
    // bánh
    for (const wx of [-38, -12, 36]) { A.rrect(c, wx - 9, -28, 18, 8, 2, P.dark, INK, li); A.rrect(c, wx - 9, 20, 18, 8, 2, P.dark, INK, li); }
    if (op.tank !== undefined) {
      A.rrect(c, -58, -20, 76, 40, 18, '#fff4d6', INK, l);
      c.save(); c.beginPath(); c.roundRect(-58, -20, 76, 40, 18); c.clip();
      c.fillStyle = P.amber; c.fillRect(-58, -20, 76 * A.clamp01(op.tank), 40); c.restore();
      A.rrect(c, -58, -20, 76, 40, 18, null, INK, l);
    } else {
      A.rrect(c, -58, -22, 76, 44, 4, body, INK, l);
      const k = op.load ?? 1;
      if (k > 0) {
        const cols = Math.ceil(3 * k);
        for (let i = 0; i < cols; i++) {
          const kind = op.kind ?? 'cargo';
          const col = kind === 'fuel' ? P.amber : kind === 'water' ? P.sky : kind === 'ammo' ? P.dark : kind === 'part' ? P.sand : kind === 'empty' ? '#e5e9ee' : P.sand;
          A.rrect(c, -52 + i * 22, -16, 18, 32, 3, col, INK, li);
        }
      }
    }
    A.rrect(c, 22, -21, 34, 42, 8, P.oliveLight, INK, l);
    A.rrect(c, 40, -16, 11, 32, 3, P.glass, INK, li);
    c.restore();
  });
}

// ── Tàu biển ──────────────────────────────────────────────────────
/** Tàu chở hàng nhìn ngang, dài ~580, mớn nước y=0. load 0..1 = số hàng trên boong. */
export function shipSide(c: Ctx, x: number, y: number, s = 1, op: { dir?: 1 | -1; load?: number; a?: number; bob?: number } = {}) {
  const dir = op.dir ?? 1;
  at(c, x, y + (op.bob ?? 0), s, dir, () => {
    const l = o(c), li = n(c);
    A.poly(c, [[-290, -74], [230, -74], [300, -100], [240, 4], [-262, 4], [-290, -34]], P.oliveDark, INK, l);
    A.line(c, [[-282, -52], [262, -52]], P.oliveLight, li);
    // cầu tàu + ống khói
    A.rrect(c, -258, -134, 92, 60, 6, P.paper, INK, l);
    A.rrect(c, -240, -172, 56, 38, 6, P.glass, INK, l);
    A.rrect(c, -222, -204, 22, 32, 3, P.amber, INK, li);
    const cols = [P.sand, P.amber, P.light, P.sky, P.sand, P.oliveLight, P.amber, P.light];
    const k = Math.round(A.clamp((op.load ?? 1) * 11, 0, 11));
    for (let i = 0; i < k; i++) {
      const bx = -140 + i * 34;
      A.rrect(c, bx, -112, 32, 38, 2, cols[i % cols.length]!, INK, li);
      if (i % 2 === 0) A.rrect(c, bx + 4, -148, 24, 36, 2, cols[(i + 3) % cols.length]!, INK, li);
    }
    // cần cẩu
    A.line(c, [[200, -74], [200, -170], [150, -120]], INK, l);
  });
}

export function shipTop(c: Ctx, x: number, y: number, s = 1, op: { ang?: number; a?: number; load?: number } = {}) {
  A.withA(c, op.a ?? 1, () => {
    c.save(); c.translate(x, y); c.rotate(op.ang ?? 0); c.scale(s, s);
    const l = o(c), li = n(c);
    A.poly(c, [[-270, -44], [190, -44], [300, 0], [190, 44], [-270, 44]], P.oliveDark, INK, l);
    A.rrect(c, -256, -34, 70, 68, 6, P.paper, INK, li);
    const k = Math.round((op.load ?? 1) * 5);
    for (let i = 0; i < k; i++) A.rrect(c, -160 + i * 66, -30, 56, 60, 3, [P.sand, P.amber, P.light, P.sky, P.sand][i % 5]!, INK, li);
    c.restore();
  });
}

// ── Tàu hỏa ───────────────────────────────────────────────────────
export function trainSide(c: Ctx, x: number, y: number, s = 1, op: { dir?: 1 | -1; wagons?: number; load?: number; ph?: number; a?: number } = {}) {
  const dir = op.dir ?? 1, wagons = op.wagons ?? 3, ph = op.ph ?? 0;
  at(c, x, y, s, dir, () => {
    const l = o(c), li = n(c);
    // đầu máy ở bên phải (hướng đi); toa nối phía trái
    A.rrect(c, 10, -82, 150, 60, 8, P.oliveDark, INK, l);
    A.rrect(c, 108, -112, 52, 36, 5, P.glass, INK, li);
    A.rrect(c, 28, -102, 22, 22, 3, P.dark, INK, li);
    A.rrect(c, 160, -60, 16, 38, 3, P.dark, INK, li);
    for (const wx of [34, 70, 110, 146]) wheel(c, wx, -14, 14, ph);
    for (let w = 0; w < wagons; w++) {
      const x0 = -(w + 1) * 150 + 6;
      A.rrect(c, x0, -70, 136, 48, 4, P.olive, INK, l);
      A.line(c, [[x0 + 45, -70], [x0 + 45, -22]], INK, li);
      A.line(c, [[x0 + 90, -70], [x0 + 90, -22]], INK, li);
      const k = Math.round(A.clamp((op.load ?? 1) * 3, 0, 3));
      for (let i = 0; i < k; i++) crate(c, x0 + 22 + i * 45, -70, 0.9, (['cargo', 'fuel', 'ammo'] as CrateKind[])[(w + i) % 3]);
      wheel(c, x0 + 22, -12, 12, ph); wheel(c, x0 + 114, -12, 12, ph);
      A.line(c, [[x0 + 136, -30], [x0 + 150, -30]], INK, l);
    }
  }, op.a ?? 1);
}

// ── Máy bay vận tải ───────────────────────────────────────────────
/** Máy bay vận tải cánh trên, nhìn ngang. Gốc: giữa thân. Dài ~360. */
export function planeSide(c: Ctx, x: number, y: number, s = 1, op: { dir?: 1 | -1; ph?: number; a?: number; tilt?: number } = {}) {
  const dir = op.dir ?? 1;
  at(c, x, y, s, dir, () => {
    c.rotate(op.tilt ?? 0);
    const l = o(c), li = n(c);
    // đuôi, thân, cánh trên, động cơ
    A.poly(c, [[-150, -28], [-196, -104], [-160, -104], [-100, -30]], P.oliveDark, INK, l);
    A.poly(c, [[-170, -2], [-215, -30], [-190, -34], [-130, -6]], P.oliveDark, INK, li);
    A.rrect(c, -190, -40, 380, 70, 34, P.olive, INK, l);
    A.poly(c, [[170, -34], [200, -10], [170, 8]], P.glass, INK, li);
    for (let i = 0; i < 6; i++) A.circle(c, -100 + i * 36, -14, 5, P.glass, INK, li);
    A.rrect(c, -60, -58, 150, 16, 7, P.oliveLight, INK, l);
    A.rrect(c, 8, -36, 60, 24, 11, P.dark, INK, li);
    const pp = Math.sin((op.ph ?? 0) * 40);
    c.save(); c.globalAlpha *= 0.55; A.ellipse(c, 74, -24, 5, 36 + 6 * pp, 0, '#94a3b8', null, 0); c.restore();
    // bánh
    A.line(c, [[-40, 28], [-40, 44]], INK, l); A.circle(c, -40, 48, 9, P.dark, INK, li);
  }, op.a ?? 1);
}

/** Máy bay nhìn từ trên, hướng theo ang. Dài ~360, sải cánh ~400. */
export function planeTop(c: Ctx, x: number, y: number, s = 1, op: { ang?: number; a?: number; ph?: number } = {}) {
  A.withA(c, op.a ?? 1, () => {
    c.save(); c.translate(x, y); c.rotate(op.ang ?? 0); c.scale(s, s);
    const l = o(c), li = n(c);
    A.poly(c, [[-20, -26], [-70, -200], [-40, -200], [60, -26]], P.oliveLight, INK, l);
    A.poly(c, [[-20, 26], [-70, 200], [-40, 200], [60, 26]], P.oliveLight, INK, l);
    A.poly(c, [[-170, -10], [-200, -70], [-170, -70], [-130, -10]], P.oliveLight, INK, li);
    A.poly(c, [[-170, 10], [-200, 70], [-170, 70], [-130, 10]], P.oliveLight, INK, li);
    A.rrect(c, -190, -26, 380, 52, 26, P.olive, INK, l);
    A.rrect(c, 130, -14, 36, 28, 8, P.glass, INK, li);
    for (const sy of [-96, 96]) { A.rrect(c, -10, sy - 14, 50, 28, 10, P.dark, INK, li); A.ellipse(c, 44, sy, 4, 30, 0, 'rgba(100,116,139,0.45)', null, 0); }
    c.restore();
  });
}

// ── Xe tăng ───────────────────────────────────────────────────────
export function tankSide(c: Ctx, x: number, y: number, s = 1, op: { dir?: 1 | -1; ph?: number; a?: number; aim?: number; track?: number; hatch?: boolean } = {}) {
  const dir = op.dir ?? 1, ph = op.ph ?? 0;
  at(c, x, y, s, dir, () => {
    const l = o(c), li = n(c);
    // xích
    A.rrect(c, -104, -36, 208, 38, 19, P.dark, INK, l);
    for (let i = 0; i < 6; i++) A.circle(c, -78 + i * 31, -17, 12, P.slate, INK, li);
    // vành ngoài chuyển động xích: vạch
    for (let i = 0; i < 10; i++) { const tx = -96 + ((i * 22 + ph * 20) % 220); A.line(c, [[tx, -36], [tx, -31]], INK, li); }
    // thân
    A.poly(c, [[-98, -36], [100, -36], [116, -52], [64, -66], [-90, -66]], P.olive, INK, l);
    // tháp pháo + nòng
    const ang = op.aim ?? 0;
    c.save(); c.translate(24, -78); c.rotate(-ang);
    A.capsule(c, [30, 0], [140, 0], 10, P.oliveDark, INK, li);
    c.restore();
    A.rrect(c, -34, -96, 90, 32, 14, P.oliveLight, INK, l);
    A.circle(c, 14, -104, 9, P.oliveDark, INK, li);
  }, op.a ?? 1);
}

export function tankTop(c: Ctx, x: number, y: number, s = 1, op: { ang?: number; a?: number; aim?: number; hatch?: boolean } = {}) {
  A.withA(c, op.a ?? 1, () => {
    c.save(); c.translate(x, y); c.rotate(op.ang ?? 0); c.scale(s, s);
    const l = o(c), li = n(c);
    A.rrect(c, -98, -52, 196, 22, 8, P.dark, INK, l);
    A.rrect(c, -98, 30, 196, 22, 8, P.dark, INK, l);
    A.rrect(c, -92, -34, 184, 68, 6, P.olive, INK, l);
    if (op.hatch) {
      A.rrect(c, -90, -28, 70, 56, 4, P.dark, INK, li); // khoang động cơ mở
      A.rrect(c, -82, -20, 26, 40, 3, P.amber, INK, li);
      A.rrect(c, -50, -20, 24, 40, 3, P.light, INK, li);
    } else {
      for (let i = 0; i < 4; i++) A.line(c, [[-84 + i * 16, -26], [-84 + i * 16, 26]], P.oliveDark, li);
    }
    c.save(); c.rotate(op.aim ?? 0);
    A.capsule(c, [20, 0], [150, 0], 10, P.oliveDark, INK, li);
    A.ellipse(c, 0, 0, 46, 36, 0, P.oliveLight, INK, l);
    A.circle(c, -8, 0, 11, P.oliveDark, INK, li);
    c.restore();
    c.restore();
  });
}

// ── Kho, nhà máy, bãi ─────────────────────────────────────────────
/** Kho nhìn từ trên: sân rào nét đứt, hai mái, chồng kiện. Rộng ~200, cao ~140. */
export function depotTop(c: Ctx, x: number, y: number, s = 1, op: { a?: number; fill?: number; dash?: boolean; ruin?: number; tone?: string } = {}) {
  A.withA(c, op.a ?? 1, () => {
    c.save(); c.translate(x, y); c.scale(s, s);
    const l = o(c), li = n(c);
    const tone = op.tone ?? P.olive;
    A.rrect(c, -104, -72, 208, 144, 8, 'rgba(255,255,255,0.65)', INK, li);
    if (op.dash) { c.setLineDash([10, 8]); A.rrect(c, -104, -72, 208, 144, 8, null, INK, li); c.setLineDash([]); }
    A.rrect(c, -86, -54, 78, 56, 4, tone, INK, l);
    A.rrect(c, 6, -54, 78, 56, 4, tone, INK, l);
    A.line(c, [[-47, -54], [-47, 2]], P.oliveDark, li);
    A.line(c, [[45, -54], [45, 2]], P.oliveDark, li);
    const f = A.clamp01(op.fill ?? 1);
    const kinds: CrateKind[] = ['fuel', 'ammo', 'cargo', 'water', 'ammo', 'fuel'];
    for (let i = 0; i < 6; i++) {
      if (i / 6 > f - 0.0001) break;
      const cx = -70 + i * 28, cy = 48;
      A.rrect(c, cx - 11, cy - 15, 22, 22, 3, [P.amber, P.dark, P.sand, P.sky, P.dark, P.amber][i]!, INK, li);
      void kinds;
    }
    c.restore();
  });
}

/** Kho/xưởng nhìn ngang. Rộng ~240. */
export function depotSide(c: Ctx, x: number, y: number, s = 1, op: { a?: number; tone?: string } = {}) {
  at(c, x, y, s, 1, () => {
    const l = o(c), li = n(c);
    A.rrect(c, -120, -90, 240, 90, 4, op.tone ?? P.olive, INK, l);
    A.poly(c, [[-130, -90], [0, -130], [130, -90]], P.oliveDark, INK, l);
    A.rrect(c, -40, -64, 80, 64, 3, P.dark, INK, li);
    A.line(c, [[0, -64], [0, 0]], INK, li);
    A.line(c, [[110, -130], [110, -168]], INK, l);
    A.poly(c, [[110, -168], [140, -158], [110, -148]], P.olive, INK, li);
    crate(c, -150, 0, 1, 'fuel'); crate(c, -176, 0, 1, 'ammo'); crate(c, 150, 0, 1, 'cargo'); crate(c, 150, -32, 1, 'water');
  }, op.a ?? 1);
}

export function factorySide(c: Ctx, x: number, y: number, s = 1, op: { a?: number; smoke?: number } = {}) {
  at(c, x, y, s, 1, () => {
    const l = o(c), li = n(c);
    A.rrect(c, -150, -96, 300, 96, 3, P.light, INK, l);
    for (let i = 0; i < 4; i++) A.poly(c, [[-150 + i * 75, -96], [-150 + i * 75, -140], [-150 + i * 75 + 75, -96]], P.slate, INK, l);
    for (let i = 0; i < 6; i++) A.rrect(c, -130 + i * 46, -70, 28, 22, 2, P.glass, INK, li);
    A.rrect(c, 90, -190, 28, 96, 3, P.slate, INK, l);
    const sm = op.smoke ?? 0;
    if (sm > 0) for (let i = 0; i < 4; i++) A.circle(c, 104 + i * 12 + sm * 10, -204 - i * 30 - (sm * 8) % 30, 12 + i * 5, 'rgba(100,116,139,0.35)', null, 0);
  }, op.a ?? 1);
}

/** Nhà máy nhìn từ trên (ký hiệu bản đồ). */
export function factoryTop(c: Ctx, x: number, y: number, s = 1, a = 1) {
  A.withA(c, a, () => {
    c.save(); c.translate(x, y); c.scale(s, s);
    const l = o(c);
    A.rrect(c, -80, -56, 160, 112, 6, P.light, INK, l);
    for (let i = 0; i < 4; i++) A.poly(c, [[-80 + i * 40, 56], [-80 + i * 40, 10], [-40 + i * 40, 56]], P.slate, INK, n(c));
    A.rrect(c, 40, -46, 20, 20, 3, P.dark, INK, n(c));
    c.restore();
  });
}

// ── Mặt đất nhìn ngang ────────────────────────────────────────────
/** Mặt đất ngang: tô nền dưới `gy`, vạch kẻ đường trôi theo offset. Gọi TRONG camera. */
export function sideGround(c: Ctx, x0: number, x1: number, gy: number, op: { depth?: number; road?: boolean; ticks?: boolean; col?: string } = {}) {
  const d = op.depth ?? 600;
  c.fillStyle = op.col ?? '#e3e9ee';
  c.fillRect(x0, gy, x1 - x0, d);
  A.line(c, [[x0, gy], [x1, gy]], INK, A.px(c, 4));
  if (op.road !== false) {
    const step = 120;
    c.strokeStyle = P.light; c.lineWidth = A.px(c, 5); c.lineCap = 'butt';
    c.beginPath();
    for (let x = Math.floor(x0 / step) * step; x < x1; x += step) { c.moveTo(x, gy + 38); c.lineTo(x + 56, gy + 38); }
    c.stroke();
  }
}

/** Đồi xa xếp lớp, ánh nhạt. fac = hệ số trôi (camera). */
export function hillsBack(c: Ctx, camX: number, gy: number, x0: number, x1: number, fac = 0.5, col = '#dbe6ec', h = 150, seed = 1) {
  c.save();
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x0, gy);
  const off = camX * (1 - fac);
  for (let x = x0; x <= x1; x += 40) {
    const u = (x - off) / 330;
    const y = gy - h * (0.5 + 0.28 * Math.sin(u + seed) + 0.22 * Math.sin(u * 2.3 + seed * 2));
    c.lineTo(x, y);
  }
  c.lineTo(x1, gy); c.closePath(); c.fill();
  c.restore();
}

// ── Chỉ báo ───────────────────────────────────────────────────────
/** Cột "đến nơi / đã đốt": h chiều cao tổng, burned 0..1 là phần đã đốt (hổ phách, ở trên). Gốc: đáy giữa. */
export function loadColumn(c: Ctx, x: number, y: number, w: number, h: number, burned: number, a = 1) {
  A.withA(c, a, () => {
    const b = A.clamp01(burned), l = o(c);
    const hb = h * b, hd = h - hb;
    c.fillStyle = P.olive; c.fillRect(x - w / 2, y - hd, w, hd);
    c.fillStyle = P.amber; c.fillRect(x - w / 2, y - h, w, hb);
    A.rrect(c, x - w / 2, y - h, w, h, 3, null, INK, l);
  });
}

/** Mặt trống/bóng nhấn: vòng tròn bán kính r viền ink (đánh dấu điểm cố định). */
export function pin(c: Ctx, x: number, y: number, r: number, col: string, a = 1) {
  A.withA(c, a, () => { A.circle(c, x, y, r, col, INK, o(c)); A.circle(c, x, y, r * 0.35, P.paper, null, 0); });
}

export const TOPBG = '#e9eedf';
export const SEABG = '#cfe3ee';

/** Nền bản đồ phẳng + lưới thưa, vẽ trong camera. */
export function topBg(c: Ctx, cam: { x: number; y: number; z: number }, grid = 200, col = TOPBG) {
  const hw = A.W / cam.z / 2 + 60, hh = A.H / cam.z / 2 + 60;
  const x0 = cam.x - hw, y0 = cam.y - hh, x1 = cam.x + hw, y1 = cam.y + hh;
  c.fillStyle = col; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.strokeStyle = 'rgba(70,110,140,0.10)'; c.lineWidth = A.px(c, 1.5);
  c.beginPath();
  for (let x = Math.floor(x0 / grid) * grid; x < x1; x += grid) { c.moveTo(x, y0); c.lineTo(x, y1); }
  for (let y = Math.floor(y0 / grid) * grid; y < y1; y += grid) { c.moveTo(x0, y); c.lineTo(x1, y); }
  c.stroke();
}

/** Đường kẻ trên bản đồ (lòng đường sáng, viền xám). pts trong thế giới. */
export function roadLine(c: Ctx, pts: [number, number][], w = 26, col = '#fbf8ec') {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.strokeStyle = '#8f8670'; c.lineWidth = w + A.px(c, 5); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
}
export function railLine(c: Ctx, pts: [number, number][], w = 10) {
  c.lineCap = 'butt'; c.lineJoin = 'round';
  c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.strokeStyle = INK; c.lineWidth = w; c.stroke();
  c.setLineDash([4, 12]); c.strokeStyle = '#f8fafc'; c.lineWidth = w - 4; c.stroke(); c.setLineDash([]);
}

/** Điểm trên đường gấp khúc theo p∈[0,1] (theo chiều dài). Trả [x, y, góc]. */
export function along(pts: [number, number][], p: number): [number, number, number] {
  let L = 0; const seg: number[] = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); seg.push(d); L += d; }
  let s = A.clamp01(p) * L, i = 0;
  while (i < seg.length - 1 && s > seg[i]!) { s -= seg[i]!; i++; }
  const a = pts[i]!, b = pts[i + 1]!, k = seg[i]! ? s / seg[i]! : 0;
  return [A.lerp(a[0], b[0], k), A.lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])];
}

/** Tàu hỏa nhìn từ trên, đầu máy ở bên phải (hướng ang). Dài ~ 150*(wagons+1). */
export function trainTop(c: Ctx, x: number, y: number, s = 1, op: { ang?: number; wagons?: number; a?: number; load?: number } = {}) {
  A.withA(c, op.a ?? 1, () => {
    c.save(); c.translate(x, y); c.rotate(op.ang ?? 0); c.scale(s, s);
    const l = o(c), li = n(c);
    A.rrect(c, 10, -26, 150, 52, 10, P.oliveDark, INK, l);
    A.rrect(c, 120, -18, 30, 36, 5, P.glass, INK, li);
    for (let w = 0; w < (op.wagons ?? 3); w++) {
      const x0 = -(w + 1) * 150 + 6;
      A.rrect(c, x0, -24, 136, 48, 4, P.olive, INK, l);
      const cols = [P.amber, P.dark, P.sand];
      if ((op.load ?? 1) > 0) for (let i = 0; i < 3; i++) A.rrect(c, x0 + 10 + i * 40, -16, 34, 32, 3, cols[(w + i) % 3]!, INK, li);
    }
    c.restore();
  });
}
