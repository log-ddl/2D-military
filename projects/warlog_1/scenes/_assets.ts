// Mọi vật của warlog_1. Quy ước: gốc = tâm đáy (NGANG) hoặc tâm thân (TRÊN), xe quay sang +x.
// 1 m ≈ 22 đơn vị: xe tải 176, APC 108, IFV 150, xe tăng 205, ARV 185, bridge layer 200.
// Mỗi vật có hàm NGANG (side) và TRÊN (top) giữ cùng dấu nhận dạng và cùng tỷ lệ.
import * as A from './shared/art';
import { P } from './shared/palette';

type Pt = A.Pt;
export type SideName = 'ally' | 'foe' | 'civil';
export interface VO {
  a?: number;          // alpha
  ph?: number;         // pha bánh/xích (px đã lăn)
  flip?: boolean;      // quay sang -x
  side?: SideName;
  cut?: number;        // 0..1: mặt cắt, lộ bên trong
  lift?: number;       // nâng thân (rung/nhún)
}

const COL = {
  ally: { b: P.olive, d: P.oliveDark, l: P.oliveLight },
  foe: { b: P.enemy, d: '#7f2e26', l: P.enemyLight },
  civil: { b: '#9db4cc', d: '#6a86a4', l: '#d4e0ec' },
};
const lwf = (c: CanvasRenderingContext2D, n: number) => A.px(c, n);
const INK = P.ink;

function frame(c: CanvasRenderingContext2D, x: number, y: number, s: number, o: VO, fn: () => void) {
  A.withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y - (o.lift ?? 0) * 0);
    c.scale((o.flip ? -1 : 1) * s, s);
    fn();
    c.restore();
  });
}
const P_ = (c: CanvasRenderingContext2D, pts: Pt[], fill: string | null, w = 3) => A.poly(c, pts, fill, INK, lwf(c, w));
const R_ = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string | null, lw = 3) =>
  A.rrect(c, x, y, w, h, r, fill, INK, lwf(c, lw));
const C_ = (c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | null, lw = 3) =>
  A.circle(c, x, y, r, fill, INK, lwf(c, lw));
const L_ = (c: CanvasRenderingContext2D, pts: Pt[], color = INK, w = 3) => A.line(c, pts, color, lwf(c, w));

// ── bộ phận chung ────────────────────────────────────────────────────
function wheel(c: CanvasRenderingContext2D, x: number, y: number, r: number, ph: number) {
  C_(c, x, y, r, P.dark, 3);
  C_(c, x, y, r * 0.52, P.light, 2);
  const a = ph / r;
  c.save(); c.translate(x, y); c.rotate(a);
  for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); L_(c, [[0, 0], [r * 0.5, 0]], INK, 2); }
  c.restore();
}
/** Xích bên hông: khối bo tròn + bánh đường + mắt xích chạy. */
function trackSide(c: CanvasRenderingContext2D, x0: number, x1: number, h: number, n: number, ph: number) {
  R_(c, x0, -h, x1 - x0, h, h / 2, P.dark, 3);
  c.save();
  c.setLineDash([7, 7]); c.lineDashOffset = -ph; c.strokeStyle = P.light; c.lineWidth = lwf(c, 2);
  c.beginPath(); c.moveTo(x0 + h / 2, -h + 2.5); c.lineTo(x1 - h / 2, -h + 2.5); c.moveTo(x0 + h / 2, -2.5); c.lineTo(x1 - h / 2, -2.5); c.stroke();
  c.restore();
  const r = h * 0.34;
  for (let i = 0; i < n; i++) {
    const x = x0 + h / 2 + ((x1 - x0 - h) * i) / (n - 1);
    C_(c, x, -h / 2, r, P.slate, 2);
    C_(c, x, -h / 2, r * 0.35, P.light, 1.5);
  }
}
export function bust(c: CanvasRenderingContext2D, x: number, y: number, s: number, body: string, helmet = P.oliveDark) {
  // thân + đầu + mũ, nhìn ngang, gốc ở vai
  c.save(); c.translate(x, y); c.scale(s, s);
  A.rrect(c, -9, -4, 18, 22, 6, body, INK, lwf(c, 2));
  A.circle(c, 0, -11, 7, P.skin, INK, lwf(c, 2));
  c.beginPath(); c.arc(0, -13, 7.8, Math.PI, 0); c.closePath(); c.fillStyle = helmet; c.fill(); c.strokeStyle = INK; c.lineWidth = lwf(c, 2); c.stroke();
  c.restore();
}

// ── XE TẢI ───────────────────────────────────────────────────────────
export interface TruckO extends VO { load?: 'tarp' | 'open' | 'tanker' | 'none'; driver?: boolean; mud?: number; }
export function truck(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: TruckO = {}) {
  const k = COL[o.side ?? 'ally'];
  const civil = o.side === 'civil';
  frame(c, x, y, s, o, () => {
    const up = civil ? 0 : 3; // gầm cao hơn một chút
    c.translate(0, -(o.lift ?? 0));
    // gầm + bánh
    R_(c, -90, -36 - up, 182, 11, 3, P.dark, 3);
    const ph = o.ph ?? 0, sink = (o.mud ?? 0) * 11;
    c.save(); c.translate(0, sink);
    for (const wx of [-64, -28, 58]) wheel(c, wx, civil ? -14 : -15, civil ? 13 : 15, ph);
    c.restore();
    // thùng
    const bx0 = -90, bx1 = 28, by0 = -38 - up;
    const ld = o.load ?? 'tarp';
    if (ld === 'tanker') {
      A.ellipse(c, (bx0 + bx1) / 2, by0 - 20, 60, 24, 0, k.b, INK, lwf(c, 3));
      c.save(); c.beginPath(); c.ellipse((bx0 + bx1) / 2, by0 - 20, 60, 24, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = P.amber; c.fillRect(-20, by0 - 50, 14, 60); c.restore();
      A.ellipse(c, (bx0 + bx1) / 2, by0 - 20, 60, 24, 0, null, INK, lwf(c, 3));
    } else if (ld === 'open') {
      R_(c, bx0, by0 - 32, bx1 - bx0, 32, 3, P.paper, 3);
      c.save(); c.globalAlpha *= 0.9; c.fillStyle = k.l; c.fillRect(bx0 + 2, by0 - 14, bx1 - bx0 - 4, 12); c.restore();
    } else if (ld === 'tarp') {
      c.beginPath(); c.moveTo(bx0, by0); c.lineTo(bx0, by0 - 30); c.quadraticCurveTo(bx0 + 8, by0 - 38, bx0 + 24, by0 - 38);
      c.lineTo(bx1 - 20, by0 - 38); c.quadraticCurveTo(bx1, by0 - 38, bx1, by0 - 28); c.lineTo(bx1, by0); c.closePath();
      A.fs(c, civil ? '#e8eef4' : P.sand, INK, lwf(c, 3));
      for (let i = 1; i < 5; i++) L_(c, [[bx0 + i * 23.5, by0 - 36], [bx0 + i * 23.5, by0 - 2]], civil ? '#8aa0b6' : '#9c8c5c', 2);
    }
    // buồng lái
    P_(c, [[34, -36 - up], [34, -74 - up], [64, -76 - up], [84, -54 - up], [92, -50 - up], [92, -36 - up]], k.b, 3);
    P_(c, [[40, -70 - up], [60, -72 - up], [76, -55 - up], [40, -55 - up]], P.glass, 2.5);
    if (o.driver) bust(c, 54, -54 - up, 0.8, P.oliveDark);
    L_(c, [[44, -50 - up], [44, -38 - up]], INK, 2);
    C_(c, 88, -43 - up, 3.6, P.amber, 2);
    if (!civil) { // vá ngụy trang + thùng nhiên liệu bên sườn
      A.ellipse(c, 40, -46 - up, 5, 3, 0, k.d, null, 0);
      A.ellipse(c, 80, -62 - up, 6, 3, 0.3, k.d, null, 0);
    }
  });
}
export function truckTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: TruckO = {}) {
  const k = COL[o.side ?? 'ally'];
  frame(c, x, y, s, o, () => {
    for (const wx of [-64, -28, 58]) { R_(c, wx - 14, -29, 28, 7, 2, P.dark, 2.5); R_(c, wx - 14, 22, 28, 7, 2, P.dark, 2.5); }
    R_(c, -90, -24, 122, 48, 4, o.load === 'tanker' ? k.b : P.sand, 3);
    if (o.load === 'tanker') { R_(c, -86, -16, 114, 32, 14, k.b, 2.5); L_(c, [[-20, -16], [-20, 16]], P.amber, 6); }
    else for (let i = 1; i < 5; i++) L_(c, [[-90 + i * 24.4, -24], [-90 + i * 24.4, 24]], '#9c8c5c', 2);
    R_(c, 34, -24, 58, 48, 8, k.b, 3);
    P_(c, [[70, -19], [84, -14], [84, 14], [70, 19]], P.glass, 2.5);
  });
}

// ── APC (M113) ───────────────────────────────────────────────────────
export interface CarryO extends VO { riders?: number; ramp?: number; lamp?: number; spacing?: number; }
export function apc(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: CarryO = {}) {
  const k = COL[o.side ?? 'ally'];
  const cut = o.cut ?? 0;
  frame(c, x, y, s, o, () => {
    c.translate(0, -(o.lift ?? 0));
    trackSide(c, -54, 54, 24, 5, o.ph ?? 0);
    // thân: tô mờ khi mặt cắt để lộ bên trong
    const hull: Pt[] = [[-56, -24], [-56, -54], [30, -54], [54, -38], [54, -24]];
    A.path(c, hull); c.save(); c.globalAlpha *= 1 - cut * 0.9; c.fillStyle = k.b; c.fill(); c.restore();
    if (cut > 0.02) {
      A.withA(c, cut, () => {
        c.save(); A.path(c, hull); c.clip();
        c.fillStyle = '#eef2f6'; c.fillRect(-60, -60, 120, 40);
        // ghế dọc hai bên + lính
        const n = o.riders ?? 5, sp = o.spacing ?? 15;
        for (let i = 0; i < n; i++) bust(c, -44 + i * sp, -37, 0.62, k.b, k.d);
        L_(c, [[-50, -26], [14, -26]], P.dark, 4);
        bust(c, 36, -42, 0.62, k.d, k.d); // lái
        c.restore();
      });
    }
    P_(c, hull, null, 3.5);
    // cửa sau mở xuống thành dốc
    c.save(); c.translate(-56, -24); c.rotate(-(o.ramp ?? 0) * Math.PI / 2);
    R_(c, -4, -27, 8, 27, 2, k.d, 2.5);
    c.restore();
    L_(c, [[14, -54], [14, -24]], INK, 1.8);
    if (o.lamp) { A.withA(c, A.clamp01(o.lamp), () => { R_(c, 4, -73, 22, 11, 3, P.amber, 2.5); L_(c, [[10, -67.5], [20, -67.5]], INK, 1.6); }); }
    // nắp + súng 12,7
    R_(c, -2, -62, 20, 9, 3, k.l, 2.5);
    A.capsule(c, [8, -58], [34, -58], 3.5, P.dark, INK, lwf(c, 1.5));
  });
}
export function apcTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: CarryO = {}) {
  const k = COL[o.side ?? 'ally'];
  frame(c, x, y, s, o, () => {
    R_(c, -54, -30, 108, 12, 5, P.dark, 2.5); R_(c, -54, 18, 108, 12, 5, P.dark, 2.5);
    P_(c, [[-56, -22], [32, -22], [54, -12], [54, 12], [32, 22], [-56, 22]], k.b, 3);
    R_(c, -52, -16, 30, 32, 3, k.l, 2); // ngăn lính (nóc)
    L_(c, [[-22, -16], [-22, 16]], INK, 1.8);
    C_(c, 6, 0, 8, k.d, 2.5);
    L_(c, [[6, 0], [30, 0]], P.dark, 3.5);
    if ((o.cut ?? 0) > 0.02) {
      A.withA(c, o.cut ?? 0, () => {
        R_(c, -54, -18, 36, 36, 3, '#eef2f6', 2);
        const n = o.riders ?? 6;
        for (let i = 0; i < n; i++) soldierTop(c, -48 + (i >> 1) * 11, i % 2 ? 9 : -9, 0.8, { ang: 0 });
      });
    }
    if (o.ramp) { c.save(); c.translate(-56, 0); c.rotate(0); A.withA(c, A.clamp01(o.ramp * 2), () => R_(c, -26 * o.ramp, -16, 26 * o.ramp, 32, 2, k.d, 2.5)); c.restore(); }
  });
}

// ── IFV (Bradley) ────────────────────────────────────────────────────
export interface IfvO extends CarryO { fire?: number; ammo?: number; }
export function ifv(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: IfvO = {}) {
  const k = COL[o.side ?? 'ally'];
  const cut = o.cut ?? 0;
  frame(c, x, y, s, o, () => {
    c.translate(0, -(o.lift ?? 0));
    trackSide(c, -68, 62, 26, 6, o.ph ?? 0);
    const hull: Pt[] = [[-70, -26], [-70, -58], [36, -58], [68, -42], [68, -26]];
    const tur: Pt[] = [[-18, -58], [-12, -86], [30, -88], [42, -72], [42, -58]];
    for (const sh of [hull, tur]) {
      A.path(c, sh); c.save(); c.globalAlpha *= 1 - cut * 0.9; c.fillStyle = k.b; c.fill(); c.restore();
    }
    if (cut > 0.02) {
      A.withA(c, cut, () => {
        c.save(); A.path(c, hull); c.clip();
        c.fillStyle = '#eef2f6'; c.fillRect(-72, -62, 144, 40);
        const n = o.riders ?? 6;
        for (let i = 0; i < n; i++) bust(c, -56 + i * 14, -40, 0.6, k.b, k.d);
        // đạn pháo: ăn chỗ của lính
        const am = o.ammo ?? 0;
        for (let i = 0; i < 3; i++) A.withA(c, am, () => R_(c, -58 + i * 16, -52, 12, 22, 2, P.amber, 2));
        bust(c, 52, -44, 0.6, k.d, k.d);
        c.restore();
        c.save(); A.path(c, tur); c.clip();
        c.fillStyle = '#eef2f6'; c.fillRect(-20, -90, 66, 36);
        bust(c, 2, -66, 0.55, k.d, k.d); bust(c, 22, -66, 0.55, k.d, k.d);
        c.restore();
      });
    }
    P_(c, hull, null, 3.5);
    P_(c, tur, null, 3.5);
    L_(c, [[-8, -58], [-8, -26]], INK, 1.8);
    // pháo 25 mm + tên lửa
    const rec = (o.fire ?? 0) * 6;
    A.capsule(c, [40 - rec, -76], [92 - rec, -76], 5, P.dark, INK, lwf(c, 1.8));
    R_(c, -22, -102, 26, 18, 3, k.l, 2.5);
    L_(c, [[-18, -98], [0, -98]], INK, 2); L_(c, [[-18, -92], [0, -92]], INK, 2);
  });
}
export function ifvTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: IfvO = {}) {
  const k = COL[o.side ?? 'ally'];
  frame(c, x, y, s, o, () => {
    R_(c, -68, -35, 130, 13, 5, P.dark, 2.5); R_(c, -68, 22, 130, 13, 5, P.dark, 2.5);
    P_(c, [[-70, -26], [36, -26], [68, -14], [68, 14], [36, 26], [-70, 26]], k.b, 3);
    R_(c, -66, -20, 44, 40, 3, k.l, 2); L_(c, [[-44, -20], [-44, 20]], INK, 1.8);
    R_(c, -12, -16, 48, 32, 8, k.l, 3);
    C_(c, 8, 0, 9, k.d, 2.5);
    A.capsule(c, [34, 0], [90, 0], 5, P.dark, INK, lwf(c, 1.8));
    R_(c, -10, -23, 18, 8, 2, k.d, 2); // tên lửa
  });
}

// ── XE TĂNG ──────────────────────────────────────────────────────────
export interface TankO extends VO { recoil?: number; barrel?: number; tilt?: number; }
export function tank(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: TankO = {}) {
  const k = COL[o.side ?? 'ally'];
  const cut = o.cut ?? 0;
  frame(c, x, y, s, o, () => {
    c.translate(0, -(o.lift ?? 0));
    trackSide(c, -82, 76, 30, 7, o.ph ?? 0);
    const hull: Pt[] = [[-80, -30], [-82, -50], [52, -52], [86, -34], [78, -30]];
    const tur: Pt[] = [[-36, -52], [-28, -78], [18, -80], [40, -64], [42, -52]];
    for (const sh of [hull, tur]) { A.path(c, sh); c.save(); c.globalAlpha *= 1 - cut * 0.9; c.fillStyle = sh === hull ? k.b : k.l; c.fill(); c.restore(); }
    if (cut > 0.02) {
      A.withA(c, cut, () => {
        c.save(); A.path(c, hull); c.clip(); c.fillStyle = '#eef2f6'; c.fillRect(-90, -56, 190, 30);
        R_(c, -76, -48, 46, 20, 3, P.amber, 2); // động cơ + nhiên liệu
        R_(c, -24, -46, 40, 18, 3, P.sand, 2);
        c.restore();
      });
    }
    P_(c, hull, null, 3.5);
    P_(c, tur, null, 3.5);
    // nòng
    const rec = (o.recoil ?? 0) * 9;
    const aim = -(o.barrel ?? 0);
    c.save(); c.translate(36, -68); c.rotate(aim);
    A.capsule(c, [-rec, 0], [92 - rec, 0], 7, P.dark, INK, lwf(c, 2));
    R_(c, 40 - rec, -6, 16, 12, 3, P.slate, 2);
    c.restore();
    R_(c, -14, -88, 20, 9, 3, k.d, 2.5);
    L_(c, [[-20, -86], [-8, -96]], P.dark, 3);
    L_(c, [[-10, -52], [-10, -30]], INK, 1.8);
  });
}
export function tankMuzzle(x: number, y: number, s = 1, o: TankO = {}): Pt {
  const f = o.flip ? -1 : 1, a = -(o.barrel ?? 0);
  const lx = 36 + Math.cos(a) * (92 - (o.recoil ?? 0) * 9), ly = -68 + Math.sin(a) * (92 - (o.recoil ?? 0) * 9);
  return [x + f * s * lx, y + s * ly];
}
export function tankTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: TankO = {}) {
  const k = COL[o.side ?? 'ally'];
  frame(c, x, y, s, o, () => {
    R_(c, -82, -39, 160, 17, 6, P.dark, 2.5); R_(c, -82, 22, 160, 17, 6, P.dark, 2.5);
    c.save(); c.setLineDash([6, 6]); c.lineDashOffset = -(o.ph ?? 0); c.strokeStyle = P.light; c.lineWidth = lwf(c, 2);
    c.beginPath(); c.moveTo(-76, -30.5); c.lineTo(72, -30.5); c.moveTo(-76, 30.5); c.lineTo(72, 30.5); c.stroke(); c.restore();
    P_(c, [[-82, -24], [48, -24], [86, -12], [86, 12], [48, 24], [-82, 24]], k.b, 3);
    R_(c, -20, -22, 62, 44, 10, k.l, 3);
    C_(c, 6, -6, 7, k.d, 2.2);
    A.capsule(c, [40, 0], [130 - (o.recoil ?? 0) * 9, 0], 7, P.dark, INK, lwf(c, 2));
    R_(c, -78, -16, 30, 32, 3, k.d, 2); // hộp động cơ
  });
}

// ── ARV (M88) ────────────────────────────────────────────────────────
export interface ArvO extends VO { boom?: number; spade?: number; hook?: number; }
export function arv(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: ArvO = {}) {
  const k = COL[o.side ?? 'ally'];
  frame(c, x, y, s, o, () => {
    c.translate(0, -(o.lift ?? 0));
    const sp = o.spade ?? 0;
    // lưỡi neo phía sau
    c.save(); c.translate(-86, -30); c.rotate(-0.0);
    P_(c, [[0, 0], [-12, 6 + sp * 28], [-3, 12 + sp * 28], [8, 2]], k.d, 3);
    c.restore();
    trackSide(c, -84, 80, 28, 6, o.ph ?? 0);
    P_(c, [[-86, -28], [-86, -54], [60, -54], [84, -36], [84, -28]], k.b, 3.5);
    P_(c, [[-64, -54], [-62, -82], [32, -84], [48, -54]], k.l, 3.5);
    L_(c, [[-20, -54], [-20, -28]], INK, 1.8);
    // cần cẩu
    const b = o.boom ?? 0;                          // 0 hạ nằm ngang trước, 1 nâng
    const ang = -0.12 - b * 0.9;
    c.save(); c.translate(-20, -84); c.rotate(ang);
    A.capsule(c, [0, -4], [112, -4], 6, P.slate, INK, lwf(c, 2));
    A.capsule(c, [0, 6], [112, 6], 6, P.slate, INK, lwf(c, 2));
    for (let i = 0; i < 5; i++) L_(c, [[i * 24, -4], [i * 24 + 12, 6]], INK, 2);
    C_(c, 112, 1, 5, P.amber, 2.2);
    c.restore();
    // tời phía sau
    C_(c, -52, -66, 9, P.dark, 2.5); L_(c, [[-58, -72], [-46, -60]], P.amber, 2.5);
    R_(c, -10, -92, 20, 9, 3, k.d, 2.5);
  });
}
/** Điểm móc của ARV trong toạ độ thế giới. */
export function arvHook(x: number, y: number, s = 1, o: ArvO = {}): Pt {
  const f = o.flip ? -1 : 1, ang = -0.12 - (o.boom ?? 0) * 0.9;
  const lx = -20 + Math.cos(ang) * 112 - Math.sin(ang) * 1, ly = -84 + Math.sin(ang) * 112 + Math.cos(ang) * 1;
  return [x + f * s * lx, y + s * ly];
}
export function arvTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: ArvO = {}) {
  const k = COL[o.side ?? 'ally'];
  frame(c, x, y, s, o, () => {
    R_(c, -84, -38, 164, 16, 6, P.dark, 2.5); R_(c, -84, 22, 164, 16, 6, P.dark, 2.5);
    P_(c, [[-86, -24], [50, -24], [84, -12], [84, 12], [50, 24], [-86, 24]], k.b, 3);
    R_(c, -64, -18, 98, 36, 5, k.l, 3);
    A.capsule(c, [-10, -6], [100, -6], 7, P.slate, INK, lwf(c, 2));
    A.capsule(c, [-10, 6], [100, 6], 7, P.slate, INK, lwf(c, 2));
    R_(c, -102 - (o.spade ?? 0) * 0, -26, 16, 52, 3, k.d, 2.5); // lưỡi neo
  });
}

// ── XE CẦU (bridge layer) ────────────────────────────────────────────
export interface BridgeO extends VO { u?: number; }
export function bridgeLayer(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: BridgeO = {}) {
  const k = COL[o.side ?? 'ally'];
  const u = o.u ?? 0;
  frame(c, x, y, s, o, () => {
    c.translate(0, -(o.lift ?? 0));
    trackSide(c, -82, 76, 30, 7, o.ph ?? 0);
    P_(c, [[-80, -30], [-82, -50], [52, -52], [86, -34], [78, -30]], k.b, 3.5);
    R_(c, 20, -72, 38, 22, 4, k.l, 3); // buồng lái
    P_(c, [[28, -68], [50, -68], [54, -56], [28, -56]], P.glass, 2);
    // nhịp cầu: nửa sau cố định, nửa trước bung quanh bản lề
    R_(c, -74, -62, 124, 10, 2, P.light, 3);
    c.save(); c.translate(50, -62); c.rotate(Math.PI + Math.PI * u);
    R_(c, 0, -0, 124, 10, 2, P.light, 3);
    for (let i = 1; i < 6; i++) L_(c, [[i * 20.6, 1], [i * 20.6, 9]], INK, 1.6);
    c.restore();
    for (let i = 1; i < 6; i++) L_(c, [[-74 + i * 20.6, -61], [-74 + i * 20.6, -53]], INK, 1.6);
    C_(c, 50, -57, 5, P.amber, 2.2);
  });
}
export function bridgeLayerTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: BridgeO = {}) {
  const k = COL[o.side ?? 'ally'];
  const u = o.u ?? 0;
  frame(c, x, y, s, o, () => {
    R_(c, -82, -39, 160, 16, 6, P.dark, 2.5); R_(c, -82, 23, 160, 16, 6, P.dark, 2.5);
    P_(c, [[-82, -24], [48, -24], [86, -12], [86, 12], [48, 24], [-82, 24]], k.b, 3);
    R_(c, 30 - u * 0, -20, 34, 40, 4, k.l, 2.5);
    const len = 124 + 124 * u;
    R_(c, -74, -20, len, 40, 2, P.light, 3);
    L_(c, [[-74, 0], [-74 + len, 0]], INK, 1.5);
  });
}
/** Nhịp cầu đã bắc (NGANG): từ x0 tới x1, mặt trên ở y. */
export function bridgeDeck(c: CanvasRenderingContext2D, x0: number, x1: number, y: number, p = 1, thick = 10) {
  const x = x0, w = (x1 - x0) * p;
  A.rrect(c, x, y, w, thick, 2, P.light, INK, lwf(c, 3));
  for (let i = 1; i * 20 < w; i++) L_(c, [[x + i * 20, y + 1], [x + i * 20, y + thick - 1]], INK, 1.6);
}

// ── MRAP ─────────────────────────────────────────────────────────────
export function mrap(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: VO = {}) {
  const k = COL[o.side ?? 'ally'];
  frame(c, x, y, s, o, () => {
    c.translate(0, -(o.lift ?? 0));
    for (const wx of [-42, 42]) wheel(c, wx, -17, 17, o.ph ?? 0);
    P_(c, [[-70, -34], [-70, -86], [18, -90], [50, -66], [72, -56], [72, -34]], k.b, 3.5);
    P_(c, [[-48, -34], [0, -14], [48, -34]], k.d, 3); // đáy chữ V
    P_(c, [[22, -80], [42, -64], [22, -64]], P.glass, 2.5);
    R_(c, -50, -78, 30, 16, 3, P.glass, 2.5);
    L_(c, [[0, -88], [0, -36]], INK, 1.8);
  });
}
/** Mặt cắt nhìn chính diện của MRAP: v = 0 đáy phẳng, 1 đáy chữ V. */
export function mrapFront(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: VO & { v?: number } = {}) {
  const k = COL[o.side ?? 'ally'];
  const v = o.v ?? 1;
  frame(c, x, y, s, o, () => {
    c.translate(0, -(o.lift ?? 0));
    const fl = -36 + v * 0;            // sàn cách đất
    R_(c, -58, -34, 16, 34, 4, P.dark, 3); R_(c, 42, -34, 16, 34, 4, P.dark, 3);
    const keel = fl + 28 * v;          // đáy chữ V: hạ ở giữa
    const body: Pt[] = [[-46, -40 + 4], [-48, -118], [-34, -128], [34, -128], [48, -118], [46, -40 + 4], [0, keel]];
    const flat: Pt[] = [[-46, -36], [-48, -118], [-34, -128], [34, -128], [48, -118], [46, -36]];
    P_(c, v < 0.5 ? flat : body, k.b, 3.5);
    c.save(); A.path(c, v < 0.5 ? flat : body); c.clip();
    c.fillStyle = '#eef2f6'; c.fillRect(-40, -120, 80, 78);
    c.restore();
    P_(c, v < 0.5 ? flat : body, null, 3.5);
    bust(c, -18, -84, 0.62, k.d, k.d); bust(c, 18, -84, 0.62, k.d, k.d);
    L_(c, [[-34, -52], [34, -52]], P.dark, 4);
    R_(c, -34, -126, 68, 14, 3, P.glass, 2.5);
  });
}

// ── NGƯỜI (NGANG dùng R.rig; TRÊN vẽ ở đây) ────────────────────────
export function soldierTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: VO & { ang?: number; prone?: boolean } = {}) {
  const k = COL[o.side ?? 'ally'];
  A.withA(c, o.a ?? 1, () => {
    c.save(); c.translate(x, y); c.rotate(o.ang ?? 0); c.scale(s, s);
    if (o.prone) { A.ellipse(c, 0, 0, 9, 6, 0, k.b, INK, lwf(c, 2)); }
    A.ellipse(c, 0, 0, 5, 9, 0, k.b, INK, lwf(c, 2));
    A.circle(c, 1, 0, 5.4, k.d, INK, lwf(c, 2));
    L_(c, [[2, 5], [20, 5]], P.dark, 3);
    c.restore();
  });
}

// ── VẬT NHỎ ─────────────────────────────────────────────────────────
export type CrateKind = 'shell' | 'drum' | 'ration' | 'water' | 'parts';
/** Hàng hoá, gốc ở tâm đáy; cỡ ~ 28 đơn vị. */
export function cargo(c: CanvasRenderingContext2D, x: number, y: number, kind: CrateKind, s = 1, a = 1) {
  A.withA(c, a, () => {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (kind === 'drum') {
      R_(c, -11, -30, 22, 30, 4, P.amber, 2.5);
      L_(c, [[-11, -21], [11, -21]], INK, 2); L_(c, [[-11, -10], [11, -10]], INK, 2);
    } else if (kind === 'shell') {
      R_(c, -14, -6, 28, 6, 1, P.sand, 2);
      for (let i = 0; i < 3; i++) {
        R_(c, -12 + i * 9, -30, 7, 24, 3, '#d6a642', 2);
        A.poly(c, [[-12 + i * 9, -30], [-8.5 + i * 9, -37], [-5 + i * 9, -30]], P.ink2, INK, lwf(c, 1.6));
      }
    } else if (kind === 'ration') {
      R_(c, -15, -22, 30, 22, 2, P.sand, 2.5);
      L_(c, [[-15, -13], [15, -13]], '#9c8c5c', 2); L_(c, [[0, -22], [0, -13]], '#9c8c5c', 2);
    } else if (kind === 'water') {
      R_(c, -11, -28, 22, 28, 4, P.sky, 2.5); R_(c, -5, -34, 10, 7, 2, P.sky, 2);
      L_(c, [[-5, -16], [5, -16]], INK, 2);
    } else if (kind === 'parts') {
      C_(c, 0, -17, 14, P.slate, 2.5);
      c.save(); c.translate(0, -17);
      for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); R_(c, 12, -4, 8, 8, 1, P.slate, 2); }
      c.restore();
      C_(c, 0, -17, 5, P.light, 2);
    }
    c.restore();
  });
}
/** Vết nứt/lỗi: tia chớp đỏ. */
export function flaw(c: CanvasRenderingContext2D, x: number, y: number, s: number, p: number) {
  if (p <= 0.01) return;
  A.withA(c, A.clamp01(p * 2), () => {
    c.save(); c.translate(x, y); c.scale(s * (0.6 + 0.4 * A.eo(p, 0, 1)), s * (0.6 + 0.4 * A.eo(p, 0, 1)));
    A.poly(c, [[4, -26], [-10, 2], [-1, 2], [-8, 26], [12, -6], [2, -6]], P.enemy, INK, lwf(c, 2.5));
    c.restore();
  });
}
/** Chồng đồng xu = giá. */
export function coins(c: CanvasRenderingContext2D, x: number, y: number, n: number, s = 1, a = 1) {
  A.withA(c, a, () => {
    for (let i = 0; i < n; i++) A.ellipse(c, x, y - i * 6 * s, 13 * s, 5 * s, 0, P.amber, INK, lwf(c, 2));
  });
}
/** Mắt xích. */
export function chainLink(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string = P.ink2) {
  c.save(); c.translate(x, y); c.rotate(rot);
  A.rrect(c, -r * 1.4, -r * 0.7, r * 2.8, r * 1.4, r * 0.7, null, color, lwf(c, 4));
  c.restore();
}
/** Đạn pháo bay (đầu nhọn quay theo góc). */
export function shellHead(c: CanvasRenderingContext2D, x: number, y: number, ang: number) {
  c.save(); c.translate(x, y); c.rotate(ang);
  A.poly(c, [[-9, -3.5], [4, -3.5], [11, 0], [4, 3.5], [-9, 3.5]], '#f2c14e', INK, lwf(c, 1.8));
  c.restore();
}
export const COLORS = COL;
