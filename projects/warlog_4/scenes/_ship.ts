// Vật vẽ dùng chung cả phim: tàu sân bay (NGANG / TRÊN), phản lực (NGANG / TRÊN), biển, dây hãm, người, chỉ báo.
// Toạ độ cục bộ của tàu: dài −470 … +500, mũi hướng +x. NGANG: mặt sàn y=0, mặt nước y=WL, sống tàu y=KEEL.
// TRÊN: x dọc thân, y âm = mạn trái (phía sàn xiên), y dương = mạn phải (tháp chỉ huy).
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';

export type Pt = A.Pt;
export const WATER = '#38bdf8';
export const HERO = P.amber;
export const WL = 92, KEEL = 150;
export const JET_H = 20;                       // từ tâm thân phản lực tới đáy bánh xe (s = 1)
export const WIRES_X = [-350, -314, -278, -242]; // vị trí 4 dây hãm theo trục tàu
export const NIGHT = '#0f1b2d';

// ───────────────────────── biển ─────────────────────────
/** Nền biển NGANG: nước từ y=surf xuống. Vẽ trong camera. night: bóng tối. */
export function sea(c: CanvasRenderingContext2D, cam: K.Cam, surf: number, t: number, o: { wave?: number; night?: number; deep?: number; drift?: number } = {}) {
  const v = K.view(cam, 80);
  const night = o.night ?? 0, drift = o.drift ?? 0;
  c.fillStyle = A.lerpColor(P.bg, NIGHT, night);
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  if (surf > v.y1) return;
  const top = Math.max(surf, v.y0);
  const g = c.createLinearGradient(0, surf, 0, surf + (o.deep ?? 700));
  g.addColorStop(0, A.lerpColor('#d9eef9', '#1e3a52', night));
  g.addColorStop(1, A.lerpColor('#86b9d6', '#0c1a2a', night));
  c.fillStyle = g;
  c.fillRect(v.x0, top, v.x1 - v.x0, v.y1 - top);
  const a = o.wave ?? 4;
  c.beginPath();
  for (let x = v.x0; x <= v.x1 + 30; x += 30) {
    const y = surf + Math.sin((x + drift) * 0.018 + t * 1.3) * a + Math.sin((x + drift) * 0.047 - t * 0.9) * a * 0.5;
    x === v.x0 ? c.moveTo(x, y) : c.lineTo(x, y);
  }
  c.strokeStyle = A.lerpColor(WATER, '#4b7da3', night); c.lineWidth = A.px(c, 4); c.lineJoin = 'round'; c.stroke();
}

/** Nền biển TRÊN: lưới mờ + vạch sóng trôi theo `drift` (tàu chạy thì truyền −x tàu). */
export function seaTop(c: CanvasRenderingContext2D, cam: K.Cam, drift = 0, night = 0) {
  const v = K.view(cam, 80);
  c.fillStyle = A.lerpColor('#cfe5f0', '#12263a', night);
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const step = 160;
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = A.px(c, 3); c.lineCap = 'round';
  const x0 = Math.floor((v.x0 - drift) / step) * step, y0 = Math.floor(v.y0 / 110) * 110;
  c.beginPath();
  for (let x = x0; x < v.x1 - drift + step; x += step) {
    for (let y = y0; y < v.y1 + 110; y += 110) {
      const j = A.rnd(Math.floor(x / step) * 131 + Math.floor(y / 110) * 17 + 3);
      const xx = x + drift + j * 90, yy = y + A.rnd(Math.floor(x / step) * 7 + Math.floor(y / 110) * 29) * 70;
      c.moveTo(xx, yy); c.lineTo(xx + 34, yy);
    }
  }
  c.stroke();
}

// ───────────────────────── tàu NGANG ─────────────────────────
export interface ShipSide {
  x: number; y: number; s?: number; pitch?: number;
  cut?: number;               // 0 vỏ kín … 1 mặt cắt
  hangar?: number;            // 0..1 hầm chứa hiện
  reactor?: number;           // <0 ẩn; 0..1 độ sáng
  shaft?: number;             // pha trục/chân vịt (rad), undefined ẩn
  mags?: [number, number];    // mức nhiên liệu, mức bom (0..1), undefined ẩn
  elev?: number[];            // vị trí thang máy 0 (sàn) … 1 (hầm), undefined ẩn
  island?: number;            // 0..1 độ đậm
  radar?: number;             // pha ăng-ten
  alpha?: number;
  hull?: string;              // màu thân
  deckOnly?: number;          // 0..1: chỉ vẽ sàn, thân hiện dần (cho cảnh kết)
  noIsland?: boolean;         // không vẽ đảo (vẽ sau bằng carrierIsland)
}

function hullPath(c: CanvasRenderingContext2D) {
  c.beginPath();
  c.moveTo(-470, 0); c.lineTo(500, 0);
  c.bezierCurveTo(506, 46, 470, 120, 356, KEEL);
  c.lineTo(-360, KEEL);
  c.bezierCurveTo(-440, 140, -470, 90, -470, 0);
  c.closePath();
}

export function carrierSide(c: CanvasRenderingContext2D, t: number, o: ShipSide) {
  const s = o.s ?? 1, cut = o.cut ?? 0, al = o.alpha ?? 1;
  const hullCol = o.hull ?? P.olive;
  c.save(); c.translate(o.x, o.y); if (o.pitch) c.rotate(o.pitch); c.scale(s, s);
  c.globalAlpha *= al;
  const lw = A.px(c, 4), lw2 = A.px(c, 2.5);
  const body = o.deckOnly === undefined ? 1 : A.clamp01(o.deckOnly);
  // thân
  if (body > 0) {
    c.save(); c.globalAlpha *= body;
    hullPath(c);
    c.fillStyle = cut > 0 ? A.lerpColor(hullCol, '#f2f6f9', cut * 0.9) : hullCol; c.fill();
    c.save(); hullPath(c); c.clip();
    // vành thân tối dưới mặt nước
    c.fillStyle = 'rgba(30,41,59,0.16)'; c.fillRect(-480, WL, 1000, KEEL - WL + 4);
    inside(c, t, o, cut);
    c.restore();
    hullPath(c); c.strokeStyle = P.ink; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke();
    c.restore();
  }
  // sàn bay
  A.rrect(c, -476, -2, 984, 13, 3, P.dark, P.ink, lw2);
  // vạch tâm / khu hạ cánh
  A.line(c, [[-330, 4.5], [-200, 4.5]], '#ffffff', A.px(c, 2));
  c.restore();
  if (!o.noIsland) carrierIsland(c, t, o);
}

/** Đảo chỉ huy (vẽ sau phản lực: tàu nhìn từ mạn phải nên đảo che phản lực trên boong). */
export function carrierIsland(c: CanvasRenderingContext2D, t: number, o: ShipSide) {
  const s = o.s ?? 1, isl = o.island ?? 1;
  if (isl <= 0) return;
  c.save(); c.translate(o.x, o.y); if (o.pitch) c.rotate(o.pitch); c.scale(s, s);
  c.globalAlpha *= (o.alpha ?? 1) * isl;
  A.poly(c, [[20, 0], [28, -58], [56, -90], [124, -90], [136, -58], [150, 0]], P.oliveDark, P.ink, A.px(c, 2.5));
  A.rrect(c, 60, -80, 58, 16, 3, P.glass, P.ink, A.px(c, 2));
  A.line(c, [[90, -90], [90, -128]], P.ink, A.px(c, 3));
  const ra = Math.sin((o.radar ?? t * 2.2));
  A.line(c, [[90 - 22 * ra, -128], [90 + 22 * ra, -128]], P.ink, A.px(c, 4));
  c.restore();
}

function inside(c: CanvasRenderingContext2D, t: number, o: ShipSide, cut: number) {
  if (cut <= 0.01) return;
  c.save(); c.globalAlpha *= A.clamp01(cut * 1.4);
  const hg = o.hangar ?? 0;
  // hầm chứa (tầng sát sàn)
  if (hg > 0) {
    c.save(); c.globalAlpha *= hg;
    A.rrect(c, -392, 14, 726, 50, 4, '#f7fafc', P.ink2, A.px(c, 2.5));
    c.restore();
  }
  // thang máy: giếng + bệ
  if (o.elev) {
    const xs = [-150, 250];
    o.elev.forEach((p, i) => {
      const x = xs[i] ?? 0;
      A.rrect(c, x - 40, 11, 80, 53, 0, 'rgba(203,213,225,0.55)', P.ink2, A.px(c, 2));
      const y = A.lerp(2, 54, p);
      A.rrect(c, x - 40, y, 80, 9, 0, P.amber, P.ink, A.px(c, 3));
    });
  }
  // kho nhiên liệu / bom
  if (o.mags) {
    const [f, b] = o.mags;
    A.rrect(c, 90, 76, 120, 70, 5, '#ffffff', P.ink2, A.px(c, 2.5));
    c.save(); c.beginPath(); c.rect(90, 76, 120, 70); c.clip();
    c.fillStyle = 'rgba(245,158,11,0.75)'; c.fillRect(90, 146 - 70 * f, 120, 70 * f + 2);
    c.restore();
    A.rrect(c, 222, 76, 120, 70, 5, '#ffffff', P.ink2, A.px(c, 2.5));
    const n = Math.round(12 * b);
    for (let i = 0; i < 12; i++) {
      if (i >= n) break;
      const cx = 238 + (i % 4) * 28, cy = 94 + Math.floor(i / 4) * 22;
      A.capsule(c, [cx - 7, cy], [cx + 7, cy], 7, P.enemyLight, P.ink, A.px(c, 1.8));
    }
  }
  // lò phản ứng + tua-bin + trục
  if (o.reactor !== undefined && o.reactor >= 0) {
    const g = o.reactor;
    A.rrect(c, -86, 76, 120, 70, 6, '#ffffff', P.ink, A.px(c, 3));
    A.circle(c, -26, 111, 25, A.lerpColor('#e2e8f0', '#fbbf24', g), P.ink, A.px(c, 3));
    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI * 2 / 3) + t * 0.5 * g;
      A.line(c, [[-26 + Math.cos(a) * 8, 111 + Math.sin(a) * 8], [-26 + Math.cos(a) * 20, 111 + Math.sin(a) * 20]], P.ink, A.px(c, 3));
    }
    A.rrect(c, -200, 88, 92, 46, 6, '#ffffff', P.ink2, A.px(c, 2.5));   // tua-bin
    A.circle(c, -154, 111, 17, null, P.ink2, A.px(c, 3));
  }
  if (o.shaft !== undefined) {
    const sh = o.shaft;
    A.line(c, [[-200, 114], [-440, 114]], P.ink, A.px(c, 6));
    // chân vịt: hai cánh quay (nhìn ngang → độ cao dao động)
    const hh = 22 * Math.abs(Math.cos(sh));
    A.capsule(c, [-444, 114 - hh], [-444, 114 + hh], 7, P.light, P.ink, A.px(c, 2.5));
  }
  c.restore();
}

/** Chiều nghiêng nhẹ của boong theo sóng: dùng làm pitch. */
export const swell = (t: number, amp = 0.012, per = 5.5, ph = 0) => Math.sin(t * (Math.PI * 2 / per) + ph) * amp;

// ───────────────────────── tàu TRÊN ─────────────────────────
export interface ShipTop {
  x: number; y: number; s?: number; rot?: number;
  angled?: number;       // 0 sàn thẳng … 1 sàn xiên
  elev?: number[];       // trạng thái 3 thang máy 0..1 (sáng khi có)
  alpha?: number;
  hl?: string;           // nhấn: 'cat' | 'wire' | 'elev'
  deckCol?: string;
  wires?: number;        // số dây hãm hiện (0..4), mặc định 4
  parked?: boolean;
}

/** Điểm trên đường hạ cánh: u 0..1 từ đuôi tới mũi đường, side lệch ngang; k 0 thẳng … 1 xiên. */
export function angPt(u: number, side = 0, k = 1): Pt {
  const ax = -450, ay = A.lerp(0, 40, k), bx = A.lerp(380, 190, k), by = A.lerp(0, -80, k);
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  return [ax + dx * u - (dy / L) * side, ay + dy * u + (dx / L) * side];
}

export function carrierTop(c: CanvasRenderingContext2D, t: number, o: ShipTop) {
  const s = o.s ?? 1, k = o.angled ?? 1, al = o.alpha ?? 1;
  c.save(); c.translate(o.x, o.y); if (o.rot) c.rotate(o.rot); c.scale(s, s);
  c.globalAlpha *= al;
  const lw = A.px(c, 4), lw2 = A.px(c, 2.5);
  // thân (olive) – thấy ở mép
  c.beginPath();
  c.moveTo(-476, -58); c.lineTo(330, -62); c.bezierCurveTo(430, -58, 500, -26, 520, 0);
  c.bezierCurveTo(500, 26, 430, 58, 330, 62); c.lineTo(-476, 58); c.closePath();
  A.fs(c, P.olive, P.ink, lw);
  // sponson của sàn xiên (phần thò ra bên trái)
  if (k > 0.01) {
    c.save(); c.globalAlpha *= A.clamp01(k * 1.2);
    A.poly(c, [[-340, -58], [-120, -112], [200, -112], [220, -62]], P.dark, P.ink, lw2);
    c.restore();
  }
  // sàn bay
  c.beginPath();
  c.moveTo(-470, -50); c.lineTo(325, -54); c.bezierCurveTo(415, -50, 478, -22, 496, 0);
  c.bezierCurveTo(478, 22, 415, 50, 325, 54); c.lineTo(-470, 50); c.closePath();
  A.fs(c, o.deckCol ?? P.dark, P.ink, lw2);
  // đường hạ cánh (xiên hay thẳng)
  const w = 21;
  const lp: Pt[] = [angPt(0, -w, k), angPt(1, -w, k), angPt(1, w, k), angPt(0, w, k)];
  c.save(); c.globalAlpha *= 0.9;
  A.poly(c, lp, '#475569', null, 0);
  c.restore();
  A.line(c, [angPt(0, -w, k), angPt(1, -w, k)], '#ffffff', A.px(c, 2));
  A.line(c, [angPt(0, w, k), angPt(1, w, k)], '#ffffff', A.px(c, 2));
  A.line(c, [angPt(0, 0, k), angPt(1, 0, k)], '#ffffff', A.px(c, 2), [14, 12]);
  // 4 dây hãm
  const hw = o.hl === 'wire';
  for (let i = 0; i < (o.wires ?? 4); i++) {
    const u = 0.18 + i * 0.045;
    A.line(c, [angPt(u, -w, k), angPt(u, w, k)], hw && i === 2 ? HERO : '#f1f5f9', A.px(c, hw && i === 2 ? 6 : 4.5));
  }
  // máy phóng (hai rãnh ở mũi)
  const hc = o.hl === 'cat';
  A.line(c, [[180, -20], [470, -14]], hc ? HERO : '#94a3b8', A.px(c, hc ? 5 : 3), [18, 10]);
  A.line(c, [[180, 20], [470, 14]], hc ? HERO : '#94a3b8', A.px(c, hc ? 5 : 3), [18, 10]);
  // thang máy
  const el = o.elev ?? [0, 0, 0];
  const els: [number, number][] = [[-130, 62], [60, -66], [300, 56]];
  els.forEach(([ex, ey], i) => {
    const on = el[i] ?? 0;
    A.rrect(c, ex - 38, ey - 17, 76, 34, 3, on > 0.5 ? P.amber : '#cbd5e1', P.ink, A.px(c, 2.5));
  });
  // đảo chỉ huy (phía phải = y dương)
  A.rrect(c, 120, 30, 112, 30, 4, P.oliveDark, P.ink, lw2);
  A.circle(c, 160, 44, 7, null, P.ink, A.px(c, 2.5));
  c.restore();
}

// ───────────────────────── phản lực ─────────────────────────
export type Kind = 'jet' | 'radar' | 'heli' | 'tanker' | 'ew' | 'vtol';
export interface Jet {
  ang?: number;             // quay (rad), mũi lên < 0
  hook?: number;            // 0 gập … 1 thả
  gear?: number;            // 0..1
  flame?: number;           // 0..1
  hero?: boolean;
  kind?: Kind;
  rotor?: number;           // pha cánh quạt trực thăng / ăng-ten
  nozzle?: number;          // 0..1 ống phụt chúc xuống (vtol)
  a?: number;
  col?: string;
}

export function jetSide(c: CanvasRenderingContext2D, x: number, y: number, s: number, o: Jet = {}) {
  const kind = o.kind ?? 'jet';
  c.save(); c.translate(x, y); c.rotate(o.ang ?? 0); c.scale(s, s);
  c.globalAlpha *= o.a ?? 1;
  const lw = A.px(c, 2.6);
  const body = o.col ?? (kind === 'heli' ? P.oliveLight : P.light);
  if (kind === 'heli') {
    // thân giọt nước + đuôi dài + cánh quạt
    A.line(c, [[-12, -2], [-52, -8]], P.ink, A.px(c, 4));
    A.poly(c, [[-56, -8], [-60, -22], [-50, -10]], P.slate, P.ink, lw);
    c.beginPath(); c.ellipse(4, 0, 30, 15, 0, 0, Math.PI * 2); A.fs(c, body, P.ink, lw);
    c.beginPath(); c.ellipse(16, -3, 12, 8, 0, 0, Math.PI * 2); A.fs(c, P.glass, P.ink, A.px(c, 2));
    A.line(c, [[4, -15], [4, -22]], P.ink, A.px(c, 4));
    const r = 54 * Math.abs(Math.cos(o.rotor ?? 0)) + 6;
    A.line(c, [[4 - r, -23], [4 + r, -23]], P.ink, A.px(c, 4));
    A.line(c, [[-14, 16], [26, 16]], P.ink, A.px(c, 3));
    c.restore(); return;
  }
  const fl = o.flame ?? 0;
  if (fl > 0) {
    const L = 30 + 60 * fl;
    A.poly(c, [[-40, -3], [-40 - L, 0], [-40, 4]], '#fbbf24', null, 0);
    A.poly(c, [[-40, -1.5], [-40 - L * 0.55, 0], [-40, 2.5]], '#ffffff', null, 0);
  }
  // cột/hook
  const hk = o.hook ?? 0;
  if (hk > 0) {
    const hx = A.lerp(-34, -66, hk), hy = A.lerp(2, 20, hk);
    A.line(c, [[-36, 4], [hx, hy], [hx - 4 * hk, hy - 4 * hk]], P.ink, A.px(c, 3.2));
  }
  // càng
  const gr = o.gear ?? 0;
  if (gr > 0) {
    A.line(c, [[26, 4], [26, 4 + 10 * gr]], P.ink, A.px(c, 3));
    A.circle(c, 26, 4 + 12 * gr, 3.6, P.dark, P.ink, A.px(c, 1.8));
    A.line(c, [[-2, 4], [-2, 4 + 10 * gr]], P.ink, A.px(c, 3));
    A.circle(c, -2, 4 + 12 * gr, 3.6, P.dark, P.ink, A.px(c, 1.8));
  }
  // thân
  A.poly(c, [[-40, -4], [-12, -9], [12, -9], [30, -6], [44, 1], [30, 5], [-6, 6], [-40, 3]], body, P.ink, lw);
  // cánh đuôi đứng
  A.poly(c, [[-40, -4], [-33, -26], [-22, -26], [-14, -8]], P.slate, P.ink, lw);
  if (o.hero) A.poly(c, [[-38, -9], [-34, -22], [-26, -22], [-30, -9]], HERO, null, 0);
  // cánh (dạng bên)
  A.poly(c, [[-8, 0], [14, 1], [-18, 6]], P.slate, P.ink, A.px(c, 2));
  // buồng lái
  c.beginPath(); c.ellipse(14, -9, 10, 5, 0, 0, Math.PI * 2); A.fs(c, P.glass, P.ink, A.px(c, 2));
  if (kind === 'radar') {
    // đĩa radar trên lưng
    A.line(c, [[-4, -9], [-4, -20]], P.ink, A.px(c, 3.5));
    const rr = 26 * Math.abs(Math.cos(o.rotor ?? 0)) + 6;
    c.beginPath(); c.ellipse(-4, -22, rr, 4.5, 0, 0, Math.PI * 2); A.fs(c, P.oliveLight, P.ink, A.px(c, 2.5));
  } else if (kind === 'tanker') {
    A.rrect(c, -4, 6, 20, 7, 3, P.sand, P.ink, A.px(c, 2));
  } else if (kind === 'ew') {
    A.rrect(c, -4, 6, 22, 6, 3, P.dark, P.ink, A.px(c, 2));
    A.line(c, [[-30, -26], [-30, -34]], P.ink, A.px(c, 3));
  } else if (kind === 'vtol') {
    const nz = o.nozzle ?? 0;
    A.line(c, [[4, 4], [4 + 8 * nz, 4 + 12 * nz]], P.ink, A.px(c, 5));
  }
  c.restore();
}

export function jetTop(c: CanvasRenderingContext2D, x: number, y: number, s: number, o: Jet & { fold?: number } = {}) {
  const kind = o.kind ?? 'jet';
  c.save(); c.translate(x, y); c.rotate(o.ang ?? 0); c.scale(s, s);
  c.globalAlpha *= o.a ?? 1;
  const lw = A.px(c, 2.6);
  const body = o.col ?? (kind === 'heli' ? P.oliveLight : P.light);
  if (kind === 'heli') {
    A.line(c, [[-10, 0], [-52, 0]], P.ink, A.px(c, 4));
    A.line(c, [[-52, -8], [-52, 8]], P.ink, A.px(c, 3));
    c.beginPath(); c.ellipse(4, 0, 28, 13, 0, 0, Math.PI * 2); A.fs(c, body, P.ink, lw);
    const r = 56, a = (o.rotor ?? 0) * 4;
    c.save(); c.translate(4, 0); c.rotate(a);
    A.line(c, [[-r, 0], [r, 0]], 'rgba(30,41,59,0.7)', A.px(c, 4));
    A.line(c, [[0, -r], [0, r]], 'rgba(30,41,59,0.7)', A.px(c, 4));
    c.restore();
    c.restore(); return;
  }
  const fl = o.flame ?? 0;
  if (fl > 0) {
    const L = 24 + 40 * fl;
    A.poly(c, [[-40, -3], [-40 - L, 0], [-40, 3]], '#fbbf24', null, 0);
  }
  const fold = o.fold ?? 0, span = A.lerp(30, 8, fold);
  const wl: Pt[] = [[10, -4], [-14, -4 - span], [-24, -4 - span], [-18, -4]];
  const wr: Pt[] = wl.map(([a, b]) => [a, -b] as Pt);
  A.poly(c, wl, P.slate, P.ink, lw); A.poly(c, wr, P.slate, P.ink, lw);
  // cánh đuôi ngang
  A.poly(c, [[-34, -3], [-46, -14], [-50, -14], [-44, -3]], P.slate, P.ink, A.px(c, 2));
  A.poly(c, [[-34, 3], [-46, 14], [-50, 14], [-44, 3]], P.slate, P.ink, A.px(c, 2));
  A.poly(c, [[-40, -4], [-12, -7], [14, -7], [30, -4], [44, 0], [30, 4], [14, 7], [-12, 7], [-40, 4]], body, P.ink, lw);
  if (o.hero) A.poly(c, [[-40, -4], [-28, -5.5], [-28, 5.5], [-40, 4]], HERO, null, 0);
  c.beginPath(); c.ellipse(14, 0, 9, 3.6, 0, 0, Math.PI * 2); A.fs(c, P.glass, P.ink, A.px(c, 1.8));
  if (kind === 'radar') {
    c.beginPath(); c.arc(-2, 0, 18, 0, Math.PI * 2); A.fs(c, 'rgba(169,180,127,0.85)', P.ink, A.px(c, 2.5));
    const a = (o.rotor ?? 0);
    A.line(c, [[-2, 0], [-2 + Math.cos(a) * 18, Math.sin(a) * 18]], P.ink, A.px(c, 2.5));
  } else if (kind === 'ew') {
    A.rrect(c, -14, -26, 14, 6, 3, P.dark, P.ink, A.px(c, 2)); A.rrect(c, -14, 20, 14, 6, 3, P.dark, P.ink, A.px(c, 2));
  } else if (kind === 'tanker') {
    A.rrect(c, -10, 16, 14, 6, 3, P.sand, P.ink, A.px(c, 2));
  }
  c.restore();
}

// ───────────────────────── vật nhỏ ─────────────────────────
export function person(c: CanvasRenderingContext2D, x: number, y: number, h: number, col: string = P.dark, a = 1) {
  c.save(); c.translate(x, y); c.globalAlpha *= a;
  const u = h / 40;
  A.rrect(c, -7 * u, -26 * u, 14 * u, 22 * u, 6 * u, col, P.ink, A.px(c, 2));
  A.circle(c, 0, -32 * u, 6 * u, P.skin, P.ink, A.px(c, 2));
  A.line(c, [[-4 * u, -4 * u], [-4 * u, 5 * u]], P.ink, A.px(c, 3));
  A.line(c, [[4 * u, -4 * u], [4 * u, 5 * u]], P.ink, A.px(c, 3));
  c.restore();
}
/** Người nhìn từ trên (vai + đầu), cho bản đồ sàn. */
export function personTop(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  A.ellipse(c, x, y, r * 0.7, r * 1.15, 0, col, P.ink, A.px(c, 1.6));
  A.circle(c, x, y, r * 0.5, P.skin, P.ink, A.px(c, 1.4));
}

export function arrowW(c: CanvasRenderingContext2D, a: Pt, b: Pt, p = 1, color: string = P.ink, w = 5, head = 0) {
  if (p <= 0) return;
  const lw = A.px(c, w), hd = head || lw * 4.2;
  const x2 = A.lerp(a[0], b[0], p), y2 = A.lerp(a[1], b[1], p);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  A.line(c, [a, [x2 - Math.cos(ang) * hd * 0.6, y2 - Math.sin(ang) * hd * 0.6]], color, lw);
  A.poly(c, [[x2, y2], [x2 - Math.cos(ang - 0.45) * hd, y2 - Math.sin(ang - 0.45) * hd], [x2 - Math.cos(ang + 0.45) * hd, y2 - Math.sin(ang + 0.45) * hd]], color, null, 0);
}

/** Vòng sóng đồng tâm lan ra. */
export function rings(c: CanvasRenderingContext2D, x: number, y: number, t: number, o: { R?: number; n?: number; per?: number; color?: string; w?: number; a?: number; t0?: number; sweep?: [number, number] } = {}) {
  const R = o.R ?? 140, n = o.n ?? 3, per = o.per ?? 1.6, a = o.a ?? 1, t0 = o.t0 ?? 0;
  if (t < t0) return;
  for (let i = 0; i < n; i++) {
    const ph = (((t - t0) / per) + i / n) % 1;
    c.save(); c.globalAlpha *= a * (1 - ph) * 0.9;
    c.beginPath();
    if (o.sweep) c.arc(x, y, R * ph, o.sweep[0], o.sweep[1]); else c.arc(x, y, R * ph, 0, Math.PI * 2);
    c.strokeStyle = o.color ?? P.ink2; c.lineWidth = A.px(c, o.w ?? 3); c.stroke();
    c.restore();
  }
}

/** Thanh chỉ báo (đồng hồ tốc độ, nhiên liệu...). Vẽ trong toạ độ màn hình. */
export function bar(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, v: number, col: string = P.amber, ticks = 4, mark?: number) {
  A.rrect(c, x, y, w, h, h / 2, '#ffffff', P.ink, 3);
  c.save(); c.beginPath(); c.roundRect(x + 2, y + 2, Math.max(0, (w - 4) * A.clamp01(v)), h - 4, h / 2); c.fillStyle = col; c.fill(); c.restore();
  for (let i = 1; i < ticks; i++) A.line(c, [[x + w * i / ticks, y + h], [x + w * i / ticks, y + h + 8]], P.ink2, 2);
  if (mark !== undefined) A.line(c, [[x + w * mark, y - 7], [x + w * mark, y + h + 7]], P.enemy, 5);
}

/** Phủ mờ một nhịp ngắn tại điểm cắt (tránh nhảy hình). */
export function cutDip(c: CanvasRenderingContext2D, t: number, at: number, w = 0.14, color: string = P.bg) {
  const f = Math.max(0, 1 - Math.abs(t - at) / w);
  if (f <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = f * 0.92; c.fillStyle = color; c.fillRect(0, 0, A.W, A.H);
  c.restore();
}

/** Dây hãm trong cảnh NGANG: nằm ngang trên sàn; kéo ra dạng chữ V về phía mũi hook (pull > 0). */
export function wireSide(c: CanvasRenderingContext2D, x: number, pull = 0, col: string = '#e2e8f0', pullY = 0) {
  if (pull <= 0.5) {
    A.rrect(c, x - 4, -5, 8, 6, 3, col, P.ink, A.px(c, 1.8));
  } else {
    A.line(c, [[x, -1], [x + pull, -pullY - 1]], col, A.px(c, 3));
  }
}

/** Đường cong trơn qua các điểm, tham số theo chiều dài: at(u) trả [x, y, góc]. */
export function makePath(pts: Pt[], smooth = 3) {
  let q = pts;
  for (let k = 0; k < smooth; k++) {
    const n: Pt[] = [q[0]!];
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i]!, b = q[i + 1]!;
      n.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    n.push(q[q.length - 1]!);
    q = n;
  }
  const cum = [0];
  for (let i = 1; i < q.length; i++) cum.push(cum[i - 1]! + Math.hypot(q[i]![0] - q[i - 1]![0], q[i]![1] - q[i - 1]![1]));
  const len = cum[cum.length - 1]!;
  return {
    len, pts: q,
    at(u: number): [number, number, number] {
      const d = A.clamp01(u) * len;
      let i = 1;
      while (i < cum.length - 1 && cum[i]! < d) i++;
      const a = q[i - 1]!, b = q[i]!, seg = cum[i]! - cum[i - 1]! || 1;
      const f = (d - cum[i - 1]!) / seg;
      return [A.lerp(a[0], b[0], f), A.lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])];
    },
  };
}

/** Thẻ số ngắn (toạ độ MÀN HÌNH): con số voice đọc ra. */
export function tag(c: CanvasRenderingContext2D, s: string, x: number, y: number, p = 1, o: { size?: number; col?: string } = {}) {
  if (p <= 0) return;
  const size = o.size ?? 44;
  c.save(); c.globalAlpha *= A.clamp01(p);
  c.font = `800 ${size}px 'Archivo', 'SF Pro Display', -apple-system, sans-serif`;
  const w = c.measureText(s).width + 40, h = size * 1.5;
  A.rrect(c, x - w / 2, y - h / 2 + (1 - A.clamp01(p)) * 10, w, h, h / 2, '#ffffff', P.ink, 3.5);
  c.fillStyle = o.col ?? P.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(s, x, y + (1 - A.clamp01(p)) * 10 + 2);
  c.restore();
}

/** Đường nét đứt vẽ dần theo p (0..1 chiều dài), trong toạ độ thế giới. */
export function dashPath(c: CanvasRenderingContext2D, pts: Pt[], p: number, col: string = P.amber, w = 5, dash: number[] = [16, 12]) {
  if (p <= 0 || pts.length < 2) return;
  let tot = 0;
  for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  let rem = tot * A.clamp01(p);
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length && rem > 0; i++) {
    const a = pts[i - 1]!, b = pts[i]!, d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= rem) { out.push(b); rem -= d; } else { out.push([A.lerp(a[0], b[0], rem / d), A.lerp(a[1], b[1], rem / d)]); rem = 0; }
  }
  const sc = A.scaleOf(c);
  A.line(c, out, col, A.px(c, w), dash.map(d => d / sc));
}

/** Dấu X vẽ trong toạ độ thế giới. */
export function crossX(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string = P.enemy, w = 7) {
  A.line(c, [[x - r, y - r], [x + r, y + r]], col, A.px(c, w));
  A.line(c, [[x - r, y + r], [x + r, y - r]], col, A.px(c, w));
}
