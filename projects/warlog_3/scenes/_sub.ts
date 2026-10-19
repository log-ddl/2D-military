// Vật vẽ dùng chung cho cả phim: tàu ngầm (ngang / trên / mặt cắt ngang thân), biển, thang độ sâu, ngư lôi, người ngủ.
// Toạ độ cục bộ của tàu: dài 600 (−300 … +300), mũi hướng +x, nửa cao ngoài 58, thân chịu áp nửa cao 36.
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';

export type Pt = A.Pt;
export const WATER = '#38bdf8';
export const WATER_D = '#0ea5e9';

// ───────────────────────── biển ─────────────────────────
/** Nền biển: trời phía trên mặt nước (y = surf), nước đậm dần xuống. Vẽ TRONG camera. */
export function sea(c: CanvasRenderingContext2D, cam: K.Cam, surf: number, t: number, o: { deep?: number; wave?: number; top?: string; bot?: string } = {}) {
  const v = K.view(cam, 80);
  const deep = o.deep ?? 1400;
  if (surf > v.y0) { c.fillStyle = P.bg; c.fillRect(v.x0, v.y0, v.x1 - v.x0, surf - v.y0 + 1); }
  const g = c.createLinearGradient(0, surf, 0, surf + deep);
  g.addColorStop(0, o.top ?? '#e3f2fa');
  g.addColorStop(1, o.bot ?? '#9cc3da');
  c.fillStyle = g;
  c.fillRect(v.x0, Math.max(surf, v.y0), v.x1 - v.x0, v.y1 - Math.max(surf, v.y0));
  if (surf > v.y0 - 20 && surf < v.y1 + 20) {
    const a = o.wave ?? 5;
    c.beginPath();
    for (let x = v.x0; x <= v.x1 + 30; x += 30) {
      const y = surf + Math.sin(x * 0.018 + t * 1.3) * a + Math.sin(x * 0.047 - t * 0.9) * a * 0.5;
      x === v.x0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.strokeStyle = WATER; c.lineWidth = A.px(c, 4); c.lineJoin = 'round'; c.stroke();
  }
}

/** Thang độ sâu ở mép màn hình (sau K.end). kpm = đơn vị thế giới / mét. */
export function ruler(c: CanvasRenderingContext2D, cam: K.Cam, surf: number, kpm: number, o: { x?: number; step?: number; a?: number; color?: string } = {}) {
  const x = o.x ?? 64, a = o.a ?? 1, col = o.color ?? P.ink2;
  c.save();
  c.globalAlpha *= a;
  const [, y0] = K.toScreen(cam, 0, surf);
  const pxPerM = kpm * cam.z;
  let step = o.step ?? 10;
  while (step * pxPerM < 9) step *= 5;
  const top = Math.max(0, Math.floor(-y0 / pxPerM / step) * step), bot = (A.H - y0) / pxPerM;
  c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, Math.max(0, y0)); c.lineTo(x, A.H); c.stroke();
  for (let d = top; d <= bot; d += step) {
    const y = y0 + d * pxPerM;
    if (y < 0 || y > A.H) continue;
    const big = d % (step * 10) === 0, mid = d % (step * 5) === 0;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (big ? 34 : mid ? 22 : 12), y); c.stroke();
  }
  c.restore();
}

// ───────────────────────── tàu NGANG ─────────────────────────
export interface SubSide {
  x: number; y: number; s?: number; pitch?: number;     // pitch > 0: mũi chúi xuống
  cut?: number;                                         // 0 vỏ kín … 1 mặt cắt
  fillF?: number; fillA?: number;                       // ballast chính mũi / đuôi 0..1 (0 = khí, 1 = nước)
  trimF?: number; trimA?: number; comp?: number;        // bồn cân bằng 0..1
  batt?: number;                                        // ắc quy 0..1
  prop?: number;                                        // pha chân vịt (rad)
  planeF?: number; planeA?: number;                     // góc cánh mũi (tháp) / cánh đuôi
  hl?: string[];                                        // bộ phận được nhấn; còn lại mờ
  glow?: string;                                        // màu nhấn riêng
  breath?: number;                                      // pha thở người ngủ
  plant?: 'diesel' | 'nuclear' | 'aip' | 'none';
  plantRun?: number;                                    // 0..1 máy đang chạy
  mast?: number;                                        // 0..1 trục ống thở / kính tiềm vọng nhô lên
  tube?: number;                                        // 0..1 nắp ống phóng mở
  torp?: number;                                        // số ngư lôi còn trong giá (0..2)
  alpha?: number;
  tilesA?: number;                                      // 0..1 ngói cao su
}

function outer(c: CanvasRenderingContext2D) {
  c.beginPath();
  c.moveTo(-300, 0);
  c.bezierCurveTo(-288, -20, -250, -54, -190, -58);
  c.lineTo(190, -58);
  c.bezierCurveTo(255, -58, 300, -32, 300, 0);
  c.bezierCurveTo(300, 32, 255, 58, 190, 58);
  c.lineTo(-190, 58);
  c.bezierCurveTo(-250, 54, -288, 20, -300, 0);
  c.closePath();
}
function inner(c: CanvasRenderingContext2D) {
  c.beginPath();
  c.moveTo(-224, 0);
  c.bezierCurveTo(-218, -22, -205, -36, -176, -36);
  c.lineTo(184, -36);
  c.bezierCurveTo(222, -36, 240, -20, 240, 0);
  c.bezierCurveTo(240, 20, 222, 36, 184, 36);
  c.lineTo(-176, 36);
  c.bezierCurveTo(-205, 36, -218, 22, -224, 0);
  c.closePath();
}

export const SUB_BOX = { x: -308, y: -108, w: 616, h: 166 };

export function torpedo(c: CanvasRenderingContext2D, x: number, y: number, ang = 0, s = 1, col = P.light) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.beginPath();
  c.moveTo(-26, -5.5); c.lineTo(20, -5.5);
  c.bezierCurveTo(30, -5.5, 33, -2, 33, 0); c.bezierCurveTo(33, 2, 30, 5.5, 20, 5.5);
  c.lineTo(-26, 5.5); c.closePath();
  A.fs(c, col, P.ink, A.px(c, 2.5));
  A.line(c, [[-26, -5.5], [-30, -9], [-30, 9], [-26, 5.5]], P.ink, A.px(c, 2.5));
  c.restore();
}

export function sleeper(c: CanvasRenderingContext2D, x: number, y: number, ph: number, tone = 0) {
  const k = 1 + 0.12 * Math.sin(ph);
  c.save(); c.translate(x, y);
  c.beginPath();
  c.roundRect(-5, -3.2 * k, 12, 6.4 * k, 3);
  A.fs(c, tone % 2 ? P.sand : P.light, P.ink, A.px(c, 1.5));
  A.circle(c, -7.5, 0, 3.1, P.skin, P.ink, A.px(c, 1.5));
  c.restore();
}

function waterRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number, t: number, seed = 0) {
  A.rrect(c, x, y, w, h, 3, '#ffffff', null, 0);
  if (level > 0.005) {
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    const top = y + h * (1 - level);
    c.fillStyle = 'rgba(56,189,248,0.75)';
    c.fillRect(x, top + Math.sin(t * 3 + seed) * 1.2, w, h);
    c.restore();
  } else if (level <= 0.005) {
    // khí: vài bọt nhỏ
    for (let i = 0; i < 2; i++) A.circle(c, x + w * (0.25 + 0.5 * i), y + h * 0.5, 1.2, null, '#c3d4e0', A.px(c, 1));
  }
  A.rrect(c, x, y, w, h, 3, null, P.ink2, A.px(c, 2));
}

export function drawSubSide(c: CanvasRenderingContext2D, t: number, o: SubSide) {
  const s = o.s ?? 1, cut = o.cut ?? 0, al = o.alpha ?? 1;
  const hl = o.hl ?? [];
  const part = (n: string) => (hl.length === 0 || hl.includes(n) ? 1 : 0.25);
  const on = (n: string) => hl.includes(n);
  const lw = (n: number) => A.px(c, n);
  c.save();
  c.globalAlpha *= al;
  c.translate(o.x, o.y); c.rotate(o.pitch ?? 0); c.scale(s, s);

  // — ngoài thân: chân vịt, cánh đuôi, bánh lái (sau thân)
  const ph = o.prop ?? 0;
  for (let k = 0; k < 3; k++) {
    const len = 30 * Math.sin(ph + k * 2.094);
    A.capsule(c, [-306, 0], [-306 - 4, len], 7, P.slate, P.ink, lw(2));
  }
  A.circle(c, -304, 0, 4, P.dark, P.ink, lw(2));
  A.poly(c, [[-292, -12], [-262, -64], [-226, -64], [-226, -50]], P.oliveDark, P.ink, lw(3));

  // — tháp
  c.save();
  c.beginPath();
  c.moveTo(-14, -52); c.lineTo(-4, -96); c.quadraticCurveTo(0, -104, 12, -104); c.lineTo(52, -104);
  c.quadraticCurveTo(66, -104, 70, -92); c.lineTo(80, -52); c.closePath();
  A.fs(c, P.oliveLight, P.ink, lw(3.5));
  if (cut > 0.3) {
    A.line(c, [[26, -104], [26, -140 - (o.mast ?? 0) * 0]], P.dark, lw(5));
    A.circle(c, 26, -140, 5, P.dark, P.ink, lw(2));
  }
  c.restore();

  // — thân ngoài
  c.save();
  outer(c);
  const g = c.createLinearGradient(0, -58, 0, 58);
  g.addColorStop(0, P.oliveLight); g.addColorStop(0.55, P.olive); g.addColorStop(1, P.oliveDark);
  c.fillStyle = g; c.fill();

  if (cut > 0.001) {
    c.clip();
    c.globalAlpha *= cut;
    c.fillStyle = '#ecf3f7'; c.fillRect(-310, -62, 620, 124);
    // bồn ballast chính (giữa vỏ ngoài và thân chịu áp)
    const pa = part('ballast');
    c.globalAlpha = cut * pa;
    const fF = o.fillF ?? 0, fA = o.fillA ?? 0;
    waterRect(c, 8, -58, 196, 22, fF, t, 0.3); waterRect(c, 8, 36, 196, 22, fF, t, 1.1);
    waterRect(c, -212, -58, 196, 22, fA, t, 2.3); waterRect(c, -212, 36, 196, 22, fA, t, 3.1);
    // bồn ở mũi / đuôi tự do ngập (nước biển)
    c.fillStyle = 'rgba(56,189,248,0.22)';
    c.fillRect(244, -58, 60, 116); c.fillRect(-306, -58, 74, 116);
    c.globalAlpha = cut;
    // thân chịu áp
    inner(c);
    A.fs(c, '#ffffff', P.ink2, lw(2.5));
    c.save(); inner(c); c.clip();
    // vách
    for (const bx of [-90, 92, 158]) A.line(c, [[bx, -36], [bx, 36]], P.ink2, lw(2));
    A.line(c, [[-224, 8], [240, 8]], '#c8d3dc', lw(1.5));
    // khoang người: 3 tầng giường
    {
      const pc = cut * part('crew');
      c.globalAlpha = pc;
      for (let tier = 0; tier < 3; tier++) {
        for (let i = 0; i < 10; i++) {
          const bx = -76 + i * 17, by = -27 + tier * 13;
          A.rrect(c, bx - 7, by - 5, 16, 11, 2, '#f1f5f8', P.ink2, lw(1.2));
          sleeper(c, bx + 2, by, (o.breath ?? 0) + i * 0.7 + tier, i + tier);
        }
      }
    }
    // khối thở (khí/CO2)
    {
      c.globalAlpha = cut * part('life');
      A.rrect(c, -82, 12, 36, 20, 3, '#ffffff', on('life') ? (o.glow ?? P.amber) : P.ink2, lw(on('life') ? 3 : 2));
      A.circle(c, -72, 22, 5, '#bfe7f8', P.ink2, lw(1.5)); A.circle(c, -58, 22, 5, '#e2d3c0', P.ink2, lw(1.5));
    }
    // bồn cân bằng (trim) và bồn bù (comp)
    {
      c.globalAlpha = cut * part('trim');
      waterRect(c, 118, 14, 36, 18, o.trimF ?? 0.5, t, 4); waterRect(c, -206, 14, 36, 18, o.trimA ?? 0.5, t, 5);
      c.globalAlpha = cut * part('comp');
      waterRect(c, -38, 14, 52, 18, o.comp ?? 0.0, t, 6);
    }
    // ắc quy
    {
      c.globalAlpha = cut * part('batt');
      const b = o.batt ?? 1;
      for (let i = 0; i < 6; i++) {
        const lit = b > (i / 6) + 0.01;
        A.rrect(c, -4 + i * 15, 14, 12, 18, 2, lit ? '#bbf7d0' : '#e2e8f0', on('batt') ? (o.glow ?? P.amber) : P.ink2, lw(on('batt') ? 2.5 : 1.5));
      }
    }
    // khí nén
    {
      c.globalAlpha = cut * part('air');
      for (let i = 0; i < 3; i++) A.rrect(c, -214 + i * 14, -33, 10, 24, 4, '#dbeafe', on('air') ? (o.glow ?? P.amber) : P.ink2, lw(on('air') ? 2.5 : 1.5));
    }
    // máy / lò
    {
      c.globalAlpha = cut * part('plant');
      const run = o.plantRun ?? 0, kind = o.plant ?? 'nuclear';
      const col = on('plant') ? (o.glow ?? P.amber) : P.ink;
      if (kind === 'nuclear') {
        A.circle(c, -150, -5, 20, '#fde68a', col, lw(2.5));
        A.circle(c, -150, -5, 9, `rgba(245,158,11,${0.35 + 0.45 * run})`, null, 0);
        A.rrect(c, -122, -16, 34, 22, 3, '#e2e8f0', col, lw(2));
      } else if (kind === 'diesel') {
        A.rrect(c, -190, -22, 62, 36, 4, '#e2e8f0', col, lw(2.5));
        for (let i = 0; i < 3; i++) A.rrect(c, -183 + i * 18, -30 - 4 * Math.max(0, Math.sin(t * 14 + i * 2)) * run, 12, 9, 2, P.slate, col, lw(1.5));
        A.rrect(c, -122, -10, 24, 24, 3, '#fde68a', col, lw(2));
      } else if (kind === 'aip') {
        A.rrect(c, -190, -22, 62, 36, 4, '#e2e8f0', col, lw(2.5));
        A.rrect(c, -122, -20, 26, 32, 4, '#bbf7d0', col, lw(2));
      }
      A.line(c, [[-96, -1], [-224, -1]], P.dark, lw(5));
    }
    // điều khiển + kính tiềm vọng
    {
      c.globalAlpha = cut * part('ctrl');
      A.rrect(c, 104, -4, 16, 12, 2, '#cbd5e1', P.ink2, lw(1.5)); A.rrect(c, 132, -4, 16, 12, 2, '#cbd5e1', P.ink2, lw(1.5));
      A.line(c, [[26, -36], [26, 8]], P.dark, lw(4));
    }
    // ống phóng + ngư lôi
    {
      c.globalAlpha = cut * part('torp');
      const n = o.torp ?? 2;
      for (let i = 0; i < 2; i++) {
        const ty = -14 + i * 22;
        A.line(c, [[164, ty - 8], [240, ty - 8]], P.ink2, lw(1.5)); A.line(c, [[164, ty + 8], [240, ty + 8]], P.ink2, lw(1.5));
        if (i < n) torpedo(c, 200, ty, 0, 1.5, on('torp') ? '#fde68a' : P.light);
      }
    }
    c.restore();
    // vòm sonar ở mũi
    {
      c.globalAlpha = cut * part('sonar');
      const sc = on('sonar') ? (o.glow ?? P.amber) : P.ink2;
      for (let i = 0; i < 3; i++) A.circle(c, 262, 0, 10 + i * 9, null, sc, lw(on('sonar') ? 3 : 1.8));
      A.circle(c, 262, 0, 4, sc, null, 0);
    }
    c.globalAlpha = cut;
    inner(c);
    A.fs(c, null, P.ink2, lw(3));
    // ngói cao su (viền dày)
  } else {
    // vỏ kín: vài đường nét đặt đúng
    A.line(c, [[-170, 52], [170, 52]], P.oliveDark, lw(2));
  }
  c.restore();

  // — viền ngoài
  outer(c); A.fs(c, null, P.ink, lw(4));
  if ((o.tilesA ?? 0) > 0) {
    c.save(); outer(c); c.clip();
    c.globalAlpha *= o.tilesA!;
    for (let i = -14; i < 14; i++) for (let j = -3; j < 3; j++) A.rrect(c, i * 22 + (j % 2) * 11, j * 20, 20, 18, 3, 'rgba(30,41,59,0.55)', '#0f172a', lw(1.2));
    c.restore();
    outer(c); A.fs(c, null, P.ink, lw(4));
  }

  // — cánh đuôi (trên thân), cánh mũi trên tháp
  {
    const a = o.planeA ?? 0, f = o.planeF ?? 0;
    c.save(); c.translate(-258, 0); c.rotate(-a);
    A.capsule(c, [-48, 0], [4, 0], 7, on('planes') ? (o.glow ?? P.amber) : P.oliveDark, P.ink, lw(2.5));
    c.restore();
    c.save(); c.translate(46, -80); c.rotate(-f);
    A.capsule(c, [-24, 0], [24, 0], 7, on('planes') ? (o.glow ?? P.amber) : P.oliveDark, P.ink, lw(2.5));
    c.restore();
  }
  c.restore();
}

// ───────────────────────── tàu TRÊN ─────────────────────────
export interface SubTop {
  x: number; y: number; s?: number; rot?: number; rudder?: number; prop?: number;
  color?: string; alpha?: number; tow?: number; towPhase?: number; dim?: boolean;
}
export function drawSubTop(c: CanvasRenderingContext2D, t: number, o: SubTop) {
  const s = o.s ?? 1, lw = (n: number) => A.px(c, n);
  c.save();
  c.globalAlpha *= o.alpha ?? 1;
  c.translate(o.x, o.y); c.rotate(o.rot ?? 0); c.scale(s, s);
  const col = o.color ?? P.olive, ln = o.color && o.color === P.enemy ? '#4b1d17' : P.ink;
  // dây kéo
  if ((o.tow ?? 0) > 0) {
    const L = o.tow!;
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([-300 - L * u, Math.sin(u * 5 + (o.towPhase ?? 0)) * 6 * u]); }
    A.line(c, pts, P.ink2, lw(2.5));
    for (let i = 3; i <= 12; i += 1.5) { const p = pts[Math.floor(i)]!; A.circle(c, p[0], p[1], 4.5, '#fde68a', P.ink, lw(1.5)); }
  }
  // chân vịt + bánh lái
  A.circle(c, -306, 0, 5, P.dark, ln, lw(2));
  c.save(); c.translate(-298, 0); c.rotate(-(o.rudder ?? 0));
  A.capsule(c, [0, 0], [-34, 0], 7, P.oliveDark, ln, lw(2.5));
  c.restore();
  // cánh đuôi
  A.poly(c, [[-250, -58], [-228, -56], [-232, -36], [-262, -36]], P.oliveDark, ln, lw(3));
  A.poly(c, [[-250, 58], [-228, 56], [-232, 36], [-262, 36]], P.oliveDark, ln, lw(3));
  // thân
  c.beginPath();
  c.moveTo(-300, 0);
  c.bezierCurveTo(-285, -16, -250, -40, -190, -42);
  c.lineTo(190, -42);
  c.bezierCurveTo(255, -42, 300, -24, 300, 0);
  c.bezierCurveTo(300, 24, 255, 42, 190, 42);
  c.lineTo(-190, 42);
  c.bezierCurveTo(-250, 40, -285, 16, -300, 0);
  c.closePath();
  const g = c.createLinearGradient(0, -42, 0, 42);
  g.addColorStop(0, o.color === P.enemy ? P.enemyLight : P.oliveLight); g.addColorStop(1, col);
  A.fs(c, g, ln, lw(4));
  // tháp + cánh mũi
  A.poly(c, [[36, -52], [46, -52], [46, 52], [36, 52]], P.oliveDark, ln, lw(2.5));
  A.rrect(c, -14, -16, 100, 32, 14, o.color === P.enemy ? P.enemyLight : P.oliveLight, ln, lw(3));
  c.restore();
}

// ───────────────────────── MẶT CẮT NGANG THÂN ─────────────────────────
export function drawHullRing(c: CanvasRenderingContext2D, x: number, y: number, r: number, o: { squash?: number; frames?: boolean; people?: boolean; a?: number } = {}) {
  const sq = o.squash ?? 0;
  c.save(); c.translate(x, y); c.globalAlpha *= o.a ?? 1;
  c.scale(1 + sq * 0.25, 1 - sq * 0.35);
  A.circle(c, 0, 0, r, '#f6fafc', null, 0);
  A.circle(c, 0, 0, r, null, P.ink, A.px(c, 4) + r * 0.09);
  A.circle(c, 0, 0, r * 0.93, null, P.ink2, A.px(c, 3));
  if (o.frames) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      A.line(c, [[Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93], [Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84]], P.ink2, A.px(c, 3));
    }
    A.circle(c, 0, 0, r * 0.84, null, P.ink2, A.px(c, 2));
  }
  c.restore();
}

// ───────────────────────── bọt, mũi tên, ký hiệu ─────────────────────────
export function bubbles(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, n = 8, seed = 1, a = 1, col = '#ffffff') {
  if (a <= 0.01) return;
  for (let i = 0; i < n; i++) {
    const sp = 0.25 + A.rnd(seed + i) * 0.5;
    const ph = (t * sp + A.rnd(seed + i * 3)) % 1;
    const bx = x + (A.rnd(seed + i * 7) - 0.5) * w + Math.sin(t * 3 + i) * 3;
    const by = y - ph * h;
    A.withA(c, a * (1 - ph) * Math.min(1, ph * 6), () => A.circle(c, bx, by, 2.5 + A.rnd(seed + i * 5) * 3, col, P.sky, A.px(c, 1.5)));
  }
}

export function arrowW(c: CanvasRenderingContext2D, a: Pt, b: Pt, p = 1, color: string = P.ink, w = 5, head = 0) {
  if (p <= 0) return;
  const lw = A.px(c, w), hd = head || lw * 4.2;
  const x2 = A.lerp(a[0], b[0], p), y2 = A.lerp(a[1], b[1], p);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  A.line(c, [a, [x2 - Math.cos(ang) * hd * 0.6, y2 - Math.sin(ang) * hd * 0.6]], color, lw);
  A.poly(c, [[x2, y2], [x2 - Math.cos(ang - 0.45) * hd, y2 - Math.sin(ang - 0.45) * hd], [x2 - Math.cos(ang + 0.45) * hd, y2 - Math.sin(ang + 0.45) * hd]], color, null, 0);
}

/** Vòng sóng âm đồng tâm lan ra từ (x,y): n vòng, chu kỳ per giây, đến bán kính R. */
export function waves(c: CanvasRenderingContext2D, x: number, y: number, t: number, o: { R?: number; n?: number; per?: number; color?: string; w?: number; a?: number; t0?: number } = {}) {
  const R = o.R ?? 140, n = o.n ?? 3, per = o.per ?? 1.6, a = o.a ?? 1, t0 = o.t0 ?? 0;
  if (t < t0) return;
  for (let i = 0; i < n; i++) {
    const ph = (((t - t0) / per) + i / n) % 1;
    A.withA(c, a * (1 - ph) * 0.9, () => A.circle(c, x, y, R * (0.1 + 0.9 * ph), null, o.color ?? P.ink2, A.px(c, o.w ?? 3)));
  }
}

/** Người đứng đơn giản (nét thẳng) cao ~h. */
export function person(c: CanvasRenderingContext2D, x: number, y: number, h: number, col = P.dark) {
  const lw = Math.max(1.5, h * 0.06);
  A.circle(c, x, y - h * 0.9, h * 0.1, P.skin, P.ink, lw * 0.8);
  A.capsule(c, [x, y - h * 0.78], [x, y - h * 0.4], h * 0.2, col, P.ink, lw * 0.8);
  A.line(c, [[x, y - h * 0.4], [x - h * 0.1, y]], P.ink, lw * 1.4);
  A.line(c, [[x, y - h * 0.4], [x + h * 0.1, y]], P.ink, lw * 1.4);
  A.line(c, [[x - h * 0.22, y - h * 0.55], [x, y - h * 0.7], [x + h * 0.22, y - h * 0.55]], P.ink, lw);
}

/** Chớp mờ nhẹ tại mốc cắt (hai nửa quanh at). */
export function cutDip(c: CanvasRenderingContext2D, t: number, at: number, w = 0.16, color: string = P.bg) {
  const f = Math.max(0, 1 - Math.abs(t - at) / w);
  if (f <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = f * 0.9; c.fillStyle = color; c.fillRect(0, 0, A.W, A.H);
  c.restore();
}

/** Mũi tên áp lực ép vào quanh tàu NGANG (toạ độ thế giới), p 0..1 là mức áp; zoom để giữ cỡ đầu mũi tên. */
export function pressureArrows(c: CanvasRenderingContext2D, x: number, y: number, p: number, t: number, zoom = 1, s = 1) {
  if (p <= 0.01) return;
  const g = (20 + 40 * p) * (0.75 + 0.25 * Math.sin(t * 3.2)), head = 14 / zoom;
  const pts: [number, number, number, number][] = [];
  for (let px = -240; px <= 240; px += 60) { pts.push([px, -64, 0, 1]); pts.push([px, 64, 0, -1]); }
  pts.push([-312, 0, 1, 0]); pts.push([312, 0, -1, 0]);
  for (const [px, py, dx, dy] of pts) {
    const ex = x + px * s, ey = y + py * s;
    arrowW(c, [ex - dx * g * 2.2 * s, ey - dy * g * 2.2 * s], [ex - dx * 6 * s, ey - dy * 6 * s], Math.min(1, p * 3), WATER_D, 5, head);
  }
}

/** Hạt chạy dọc đường gấp khúc (dòng chảy năng lượng/khí/nước). */
export function flow(c: CanvasRenderingContext2D, pts: Pt[], t: number, o: { col?: string; n?: number; spd?: number; r?: number; a?: number; line?: boolean } = {}) {
  const a = o.a ?? 1, n = o.n ?? 6, spd = o.spd ?? 0.5, r = o.r ?? 6;
  if (a <= 0.01) return;
  const seg: number[] = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); seg.push(d); tot += d; }
  A.withA(c, a, () => {
    if (o.line !== false) A.line(c, pts, 'rgba(71,85,105,0.35)', A.px(c, 5));
    for (let i = 0; i < n; i++) {
      let d = (((t * spd + i / n) % 1) + 1) % 1 * tot;
      for (let k = 0; k < seg.length; k++) {
        if (d <= seg[k]!) { const f = d / seg[k]!; A.circle(c, A.lerp(pts[k]![0], pts[k + 1]![0], f), A.lerp(pts[k]![1], pts[k + 1]![1], f), r, o.col ?? P.amber, P.ink, A.px(c, 1.5)); break; }
        d -= seg[k]!;
      }
    }
  });
}
