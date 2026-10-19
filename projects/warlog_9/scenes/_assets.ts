// Vật dùng chung của warlog_9. Mọi hàm vẽ theo toạ độ cục bộ, không gọi camera.
import * as A from './shared/art';
import { P } from './shared/palette';

type C2 = CanvasRenderingContext2D;
type Pt = [number, number];
export const L = (c: C2, n = 3) => A.px(c, n);

export interface Side { body: string; light: string; dark: string }
export const FRIEND: Side = { body: P.olive, light: P.oliveLight, dark: P.oliveDark };
export const ENEMY: Side = { body: P.enemy, light: P.enemyLight, dark: '#8a3329' };
export const BLOOD = '#a3201c';

const mir = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x, -y] as Pt);

// ---------------------------------------------------------------- nền
export function skyBg(c: C2, cam: { x: number; y: number; z: number }, t = 0, drift = 0) {
  A.clear(c, P.bg);
  // mây giản lược trôi chậm (toạ độ thế giới, lặp)
  const v = { x0: cam.x - 960 / cam.z - 400, x1: cam.x + 960 / cam.z + 400, y0: cam.y - 540 / cam.z - 200, y1: cam.y + 540 / cam.z + 200 };
  const cell = 900;
  for (let gx = Math.floor(v.x0 / cell); gx <= Math.ceil(v.x1 / cell); gx++) {
    for (let gy = Math.floor(v.y0 / cell); gy <= Math.ceil(v.y1 / cell); gy++) {
      const r = A.rnd(gx * 73.1 + gy * 19.7);
      const x = gx * cell + r * cell + drift * t;
      const y = gy * cell + A.rnd(gx * 3.3 + gy * 51.2) * cell;
      cloud(c, x, y, 0.8 + A.rnd(gx + gy * 7) * 0.8);
    }
  }
}
export function cloud(c: C2, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const lw = L(c, 3);
  c.fillStyle = P.white;
  c.beginPath();
  c.ellipse(0, 0, 110, 34, 0, 0, Math.PI * 2);
  c.ellipse(-50, -20, 50, 34, 0, 0, Math.PI * 2);
  c.ellipse(30, -30, 60, 42, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
export function mapBg(c: C2, cam: { x: number; y: number; z: number }, step = 200, col: string = P.bg2) {
  A.clear(c, col);
  const v = { x0: cam.x - 960 / cam.z, x1: cam.x + 960 / cam.z, y0: cam.y - 540 / cam.z, y1: cam.y + 540 / cam.z };
  let s = step;
  while (s * cam.z < 60) s *= 5;
  c.strokeStyle = '#d5dee6'; c.lineWidth = L(c, 1.5);
  c.beginPath();
  for (let x = Math.floor(v.x0 / s) * s; x <= v.x1; x += s) { c.moveTo(x, v.y0); c.lineTo(x, v.y1); }
  for (let y = Math.floor(v.y0 / s) * s; y <= v.y1; y += s) { c.moveTo(v.x0, y); c.lineTo(v.x1, y); }
  c.stroke();
}

// ---------------------------------------------------------------- tiêm kích NGANG (mũi sang phải, dài ~430)
export interface JetSideOpt {
  side?: Side; ab?: number; t?: number; stores?: number; tanks?: number; fuel?: number;
  canopy?: number; hideCanopy?: boolean; elev?: number; gear?: boolean; glow?: string[]; pilot?: boolean;
}
export function jetSide(c: C2, x: number, y: number, s: number, rot: number, o: JetSideOpt = {}) {
  const sd = o.side ?? FRIEND, t = o.t ?? 0, lw = () => L(c, 3);
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  // lửa xả
  const ab = o.ab ?? 0;
  if (ab > 0.01) {
    const fl = 1 + 0.07 * Math.sin(t * 47) + 0.04 * Math.sin(t * 91);
    const Lf = (40 + ab * 190) * fl;
    A.withA(c, Math.min(1, ab * 2), () => {
      A.poly(c, [[-222, -13], [-222 - Lf, 0], [-222, 13]], P.amber, null);
      A.poly(c, [[-222, -7], [-222 - Lf * 0.55, 0], [-222, 7]], '#fde68a', null);
      // vòng sóng chấn
      for (let i = 1; i <= 3; i++) A.ellipse(c, -222 - Lf * 0.2 * i, 0, 4, 7 - i, 0, '#fff7d6', null);
    });
  }
  const g = o.glow ?? [];
  const hl = (k: string, base: string) => (g.includes(k) ? P.amber : base);
  // cánh xa
  A.poly(c, [[10, 2], [-120, 4], [-150, 10], [-20, 8]], sd.dark, P.ink, lw());
  // đuôi ngang xa
  A.poly(c, [[-150, 2], [-205, 0], [-215, 6], [-160, 8]], sd.dark, P.ink, lw());
  // thân
  const body: Pt[] = [[215, 2], [170, -8], [110, -20], [40, -26], [-120, -26], [-185, -22], [-204, -14], [-204, 14], [-150, 18], [60, 18], [140, 12]];
  A.poly(c, body, sd.body, P.ink, lw());
  // lưng sáng
  A.poly(c, [[110, -20], [40, -26], [-120, -26], [-185, -22], [-190, -14], [-120, -16], [40, -16]], sd.light, null);
  A.path(c, body); A.fs(c, null, P.ink, lw());
  // mũi radar
  A.poly(c, [[215, 2], [170, -8], [160, -6], [160, 10], [140, 12]], hl('radar', P.light), P.ink, lw());
  // khoang nhiên liệu (mặt cắt)
  if (o.fuel !== undefined) {
    const lvl = A.clamp01(o.fuel);
    const tank = (x0: number, w: number, y0: number, h: number) => {
      A.rrect(c, x0, y0, w, h, 4, P.paper, P.ink, L(c, 2));
      A.rrect(c, x0, y0 + h * (1 - lvl), w, h * lvl, 3, P.amber, null);
      A.rrect(c, x0, y0, w, h, 4, null, P.ink, L(c, 2));
    };
    tank(-110, 90, -20, 32); tank(-5, 50, -20, 32);
  }
  // đuôi đứng
  A.poly(c, [[-112, -26], [-168, -104], [-196, -104], [-196, -24]], sd.body, P.ink, lw());
  A.line(c, [[-180, -86], [-196, -86]], P.ink, L(c, 2));
  // cửa hút gió
  A.poly(c, [[70, -2], [30, -4], [30, 16], [80, 16]], P.dark, P.ink, lw());
  // buồng lái
  if (!o.hideCanopy) {
    const cp = o.canopy ?? 0;
    c.save(); c.translate(0, -cp * 120); c.rotate(-cp * 0.6);
    A.path(c, [[138, -16], [118, -34], [80, -44], [50, -40], [40, -26], [110, -20]]);
    A.fs(c, P.glass, P.ink, lw());
    A.line(c, [[78, -42], [74, -22]], P.ink, L(c, 2));
    c.restore();
  }
  if (o.pilot) {
    A.circle(c, 82, -38, 10, P.oliveLight, P.ink, L(c, 2));
    A.rrect(c, 84, -42, 9, 6, 2, P.dark, null);
  }
  // cánh gần
  A.poly(c, [[30, 6], [-110, 10], [-150, 18], [-40, 16]], hl('wing', sd.body), P.ink, lw());
  // đuôi ngang gần (cánh lái độ cao xoay quanh -165,8)
  c.save(); c.translate(-165, 8); c.rotate(o.elev ?? 0);
  A.poly(c, [[15, -4], [-45, -2], [-55, 6], [10, 6]], hl('elev', sd.body), P.ink, lw());
  c.restore();
  // ống xả
  A.poly(c, [[-204, -14], [-224, -12], [-224, 12], [-204, 14]], hl('engine', P.slate), P.ink, lw());
  // vũ khí treo
  const ns = o.stores ?? 0;
  for (let i = 0; i < ns; i++) {
    const mx = -10 - i * 34, my = 30 + (i % 2) * 6;
    A.line(c, [[mx, 18], [mx, my - 4]], P.ink, L(c, 2));
    missileSide(c, mx, my, 0.42, 0, {});
  }
  if (o.tanks && o.tanks > 0) {
    A.withA(c, o.tanks, () => {
      A.line(c, [[-40, 18], [-40, 30]], P.ink, L(c, 2));
      A.ellipse(c, -40, 40, 70, 12, 0, P.sand, P.ink, lw());
    });
  }
  if (o.gear) {
    for (const gx of [120, -70]) { A.line(c, [[gx, 16], [gx, 40]], P.ink, L(c, 3)); A.circle(c, gx, 46, 9, P.dark, P.ink, L(c, 2)); }
  }
  c.restore();
}

// ---------------------------------------------------------------- tiêm kích TRÊN XUỐNG (mũi theo +x, dài ~430)
export interface JetTopOpt { side?: Side; twin?: boolean; ab?: number; t?: number; stores?: number; tanks?: number; deadEng?: number; big?: boolean; head?: number; glow?: boolean }
export function jetTop(c: C2, x: number, y: number, rot: number, s: number, o: JetTopOpt = {}) {
  const sd = o.side ?? FRIEND, t = o.t ?? 0;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const lw = L(c, 3);
  const ab = o.ab ?? 0;
  const engs = o.twin ? [-12, 12] : [0];
  if (ab > 0.01) {
    engs.forEach((ey, i) => {
      if (o.deadEng && i === 0) return;
      const Lf = (40 + ab * 150) * (1 + 0.07 * Math.sin(t * 43 + i));
      A.poly(c, [[-214, ey - 9], [-214 - Lf, ey], [-214, ey + 9]], P.amber, null);
    });
  }
  const wing: Pt[] = [[60, 18], [-90, 150], [-140, 150], [-150, 24]];
  A.poly(c, wing, sd.body, P.ink, lw); A.poly(c, mir(wing), sd.body, P.ink, lw);
  const stab: Pt[] = [[-150, 16], [-200, 80], [-222, 80], [-214, 16]];
  A.poly(c, stab, sd.dark, P.ink, lw); A.poly(c, mir(stab), sd.dark, P.ink, lw);
  // vũ khí dưới cánh
  const ns = o.stores ?? 0;
  for (let i = 0; i < ns; i++) {
    const sy = (i % 2 ? -1 : 1) * (60 + Math.floor(i / 2) * 32);
    missileSide(c, -60, sy, 0.38, 0, {});
  }
  if (o.tanks && o.tanks > 0) A.withA(c, o.tanks, () => { A.ellipse(c, -50, 0, 70, 14, 0, P.sand, P.ink, lw); });
  const w = o.twin ? 34 : 24;
  const body: Pt[] = [[215, 0], [170, -12], [100, -w], [-200, -w], [-214, -w + 4], [-214, w - 4], [-200, w], [100, w], [170, 12]];
  A.poly(c, body, sd.light, P.ink, lw);
  A.poly(c, [[215, 0], [170, -12], [160, -13], [160, 13], [170, 12]], P.light, P.ink, lw);
  A.poly(c, [[-120, -6], [-205, -4], [-205, 4], [-120, 6]], sd.dark, P.ink, L(c, 2));
  engs.forEach((ey, i) => {
    A.rrect(c, -222, ey - 10, 14, 20, 4, o.deadEng && i === 0 ? P.dark : P.slate, P.ink, L(c, 2));
  });
  A.ellipse(c, 105, 0, 38, 12, 0, P.glass, P.ink, lw);
  if (o.head !== undefined) {
    A.circle(c, 98, 0, 9, P.oliveLight, P.ink, L(c, 2));
    A.line(c, [[98, 0], [98 + Math.cos(o.head) * 14, Math.sin(o.head) * 14]], P.dark, L(c, 4));
  }
  c.restore();
}

// ---------------------------------------------------------------- tiêm kích CHÍNH DIỆN
export function jetFront(c: C2, x: number, y: number, s: number, o: { side?: Side; stores?: number; bay?: number; bayOpen?: number } = {}) {
  const sd = o.side ?? FRIEND;
  c.save(); c.translate(x, y); c.scale(s, s);
  const lw = L(c, 3);
  // cánh
  A.poly(c, [[-30, 6], [-240, 22], [-240, 30], [-30, 22]], sd.body, P.ink, lw);
  A.poly(c, [[30, 6], [240, 22], [240, 30], [30, 22]], sd.body, P.ink, lw);
  // vũ khí treo ngoài
  const ns = o.stores ?? 0;
  const posX = [70, 120, 170, 215];
  for (let i = 0; i < ns; i++) {
    const side = i % 2 ? -1 : 1, px = side * posX[Math.floor(i / 2) % 4]!;
    const big = Math.floor(i / 2) === 0;
    A.line(c, [[px, 22], [px, 40]], P.ink, L(c, 2));
    if (big) { A.circle(c, px, 56, 18, P.sand, P.ink, lw); }
    else {
      A.circle(c, px, 50, 9, P.paper, P.ink, lw);
      A.line(c, [[px - 16, 50], [px + 16, 50]], P.ink, L(c, 2)); A.line(c, [[px, 34], [px, 66]], P.ink, L(c, 2));
    }
  }
  // đuôi đứng
  A.poly(c, [[-6, -30], [-4, -120], [4, -120], [6, -30]], sd.body, P.ink, lw);
  // đuôi ngang
  A.poly(c, [[-20, 0], [-110, 8], [-110, 14], [-20, 10]], sd.dark, P.ink, lw);
  A.poly(c, [[20, 0], [110, 8], [110, 14], [20, 10]], sd.dark, P.ink, lw);
  // thân
  A.ellipse(c, 0, 0, 40, 36, 0, sd.light, P.ink, lw);
  // hút gió hai bên
  A.rrect(c, -62, -8, 24, 32, 6, P.dark, P.ink, lw);
  A.rrect(c, 38, -8, 24, 32, 6, P.dark, P.ink, lw);
  // khoang trong
  const nb = o.bay ?? 0, op = o.bayOpen ?? 0;
  if (nb > 0) {
    A.rrect(c, -30, 26, 60, 18 + op * 16, 4, P.dark, P.ink, L(c, 2));
    for (let i = 0; i < nb; i++) {
      const bx = -18 + i * (36 / Math.max(1, nb - 1));
      A.circle(c, bx, 34 + op * 14, 7, P.paper, P.ink, L(c, 2));
    }
    // cửa khoang mở
    A.line(c, [[-30, 26], [-30 - op * 6, 26 + op * 30]], P.ink, L(c, 3));
    A.line(c, [[30, 26], [30 + op * 6, 26 + op * 30]], P.ink, L(c, 3));
  }
  // mũi + buồng lái
  A.circle(c, 0, 4, 16, P.light, P.ink, lw);
  A.ellipse(c, 0, -30, 18, 14, 0, P.glass, P.ink, lw);
  c.restore();
}

// ---------------------------------------------------------------- tên lửa (dài 200, mũi +x)
export interface MisOpt { flame?: number; cut?: number; hl?: number; t?: number; seeker?: number }
export function missileSide(c: C2, x: number, y: number, s: number, rot: number, o: MisOpt) {
  const t = o.t ?? 0;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const lw = L(c, 3);
  const fl = o.flame ?? 0;
  if (fl > 0.01) {
    const Lf = (60 + 60 * Math.sin(t * 50) * 0.1) * fl;
    A.poly(c, [[-100, -9], [-100 - Lf * 2.2, 0], [-100, 9]], P.amber, null);
    A.poly(c, [[-100, -5], [-100 - Lf, 0], [-100, 5]], '#fde68a', null);
  }
  const fin = (x0: number, h: number, w: number): Pt[] => [[x0, -10], [x0 - w * 0.4, -10 - h], [x0 - w, -10 - h], [x0 - w, -10]];
  A.poly(c, fin(-70, 22, 30), P.light, P.ink, lw); A.poly(c, mir(fin(-70, 22, 30)), P.light, P.ink, lw);
  A.poly(c, fin(20, 14, 26), P.light, P.ink, lw); A.poly(c, mir(fin(20, 14, 26)), P.light, P.ink, lw);
  const body: Pt[] = [[100, 0], [80, -9], [60, -11], [-100, -11], [-100, 11], [60, 11], [80, 9]];
  A.poly(c, body, P.paper, P.ink, lw);
  const cut = o.cut ?? 0;
  if (cut > 0) {
    // khoang: đầu dò, dẫn đường, đầu nổ, động cơ
    const H = o.hl ?? -1;
    const sec = [[60, 40, P.sky], [20, 40, '#94a3b8'], [-20, 40, P.enemyLight], [-100, 80, P.sand]] as const;
    A.withA(c, cut, () => {
      sec.forEach(([x1, w, col], i) => {
        A.rrect(c, x1 - w + 2, -8, w - 4, 16, 2, H === i || H < 0 ? col : P.light, P.ink, L(c, 1.5));
      });
      // đầu dò: đĩa anten
      const sk = o.seeker ?? 0;
      c.save(); c.translate(76, 0); c.rotate(Math.sin(sk) * 0.5);
      A.line(c, [[0, -7], [0, 7]], P.ink, L(c, 2.5)); c.restore();
    });
  }
  A.poly(c, [[100, 0], [80, -9], [70, -10], [70, 10], [80, 9]], P.slate, P.ink, lw);
  A.path(c, body); A.fs(c, null, P.ink, lw);
  c.restore();
}

// ---------------------------------------------------------------- phi công NGANG (ngồi, nhìn sang phải). gốc = mông
export function pilotSide(c: C2, x: number, y: number, s: number, o: { drain?: number; head?: number; arm?: number; seat?: boolean } = {}) {
  const dr = A.clamp01(o.drain ?? 0);
  c.save(); c.translate(x, y); c.scale(s, s);
  const lw = L(c, 3);
  if (o.seat !== false) {
    A.poly(c, [[-60, 20], [-40, -190], [-14, -190], [-24, 0], [80, 0], [80, 22]], P.dark, P.ink, lw);
  }
  // chân
  A.capsule(c, [0, -10], [90, -20], 34, P.olive, P.ink, lw);
  A.capsule(c, [90, -20], [120, 70], 30, P.olive, P.ink, lw);
  A.rrect(c, 104, 64, 46, 20, 6, P.dark, P.ink, lw);
  // thân
  A.capsule(c, [-10, -10], [-22, -120], 54, P.olive, P.ink, lw);
  // tay cầm cần lái
  const arm = o.arm ?? 0;
  A.capsule(c, [-14, -110], [30, -60], 20, P.oliveDark, P.ink, lw);
  A.capsule(c, [30, -60], [80, -54], 18, P.oliveDark, P.ink, lw);
  A.line(c, [[90, -50], [90 + arm * 10, -10]], P.ink, L(c, 5));
  A.circle(c, 88 + arm * 3, -54, 9, P.skin, P.ink, L(c, 2));
  // đầu
  c.save(); c.translate(-20, -150); c.rotate(o.head ?? 0);
  A.circle(c, 0, 0, 34, P.oliveLight, P.ink, lw);
  A.path(c, [[10, -14], [36, -10], [38, 14], [14, 16]]); A.fs(c, P.dark, P.ink, lw);
  c.restore();
  // hệ máu: đầu → tim → chân
  const head = A.lerpColor(BLOOD, '#d7d0cf', dr), legs = A.lerpColor(BLOOD, '#5c0c0a', dr);
  A.withA(c, 0.95, () => {
    A.line(c, [[-20, -150], [-18, -80]], head, L(c, 6 * (1 - dr * 0.75)));
    A.circle(c, -18, -80, 9, BLOOD, P.ink, L(c, 1.5));
    A.line(c, [[-18, -80], [-6, -16], [86, -22], [114, 60]], legs, L(c, 6 + dr * 6));
  });
  c.restore();
}

// ---------------------------------------------------------------- ghế phóng NGANG
export function seatSide(c: C2, x: number, y: number, s: number, rot: number, o: { flame?: number; t?: number; chute?: number; pilot?: boolean } = {}) {
  const t = o.t ?? 0;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const lw = L(c, 3);
  const ch = o.chute ?? 0;
  if (ch > 0) {
    const R = 40 + ch * 160, up = -120 - ch * 220;
    for (const dx of [-1, 1]) A.line(c, [[0, -150], [dx * R * 0.9, up + 20]], P.ink2, L(c, 1.5));
    c.beginPath(); c.ellipse(0, up, R, R * 0.55, 0, Math.PI, 0); c.closePath();
    A.fs(c, P.amber, P.ink, lw);
    for (const dx of [-0.5, 0, 0.5]) A.line(c, [[dx * R, up], [dx * R * 0.9, up - R * 0.5 * Math.sqrt(1 - dx * dx)]], P.ink, L(c, 1.5));
  }
  const fl = o.flame ?? 0;
  if (fl > 0.01) {
    const Lf = 120 * fl * (1 + 0.1 * Math.sin(t * 60));
    A.poly(c, [[-30, 24], [0, 24 + Lf], [10, 24]], P.amber, null);
    A.poly(c, [[-20, 24], [-6, 24 + Lf * 0.5], [2, 24]], '#fde68a', null);
  }
  if (o.pilot !== false && ch <= 0) pilotSide(c, 0, 0, 1, { seat: true });
  else if (ch > 0) pilotSide(c, 0, 0, 1, { seat: false });
  c.restore();
}

// ---------------------------------------------------------------- tanker NGANG/TRÊN, AWACS TRÊN
export function tankerSide(c: C2, x: number, y: number, s: number, o: { hose?: number; t?: number } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const lw = L(c, 3);
  A.poly(c, [[40, 10], [-160, 20], [-200, 30], [-20, 26]], P.slate, P.ink, lw);
  A.poly(c, [[340, 10], [300, -30], [200, -42], [-300, -42], [-380, -30], [-400, -10], [-400, 12], [-300, 30], [260, 30]], P.light, P.ink, lw);
  A.poly(c, [[-260, -42], [-350, -150], [-390, -150], [-380, -40]], P.light, P.ink, lw);
  A.poly(c, [[300, -24], [270, -36], [240, -36], [250, -22]], P.glass, P.ink, lw);
  for (let i = 0; i < 9; i++) A.circle(c, 180 - i * 50, -20, 5, P.glass, P.ink, L(c, 1.5));
  A.poly(c, [[60, 14], [-120, 24], [-170, 36], [-30, 30]], P.slate, P.ink, lw);
  A.rrect(c, -40, 30, 80, 24, 10, P.slate, P.ink, lw);
  const hs = o.hose ?? 0;
  if (hs > 0) {
    const ex = -380 - 420 * hs, ey = 30 + 160 * hs + Math.sin((o.t ?? 0) * 2) * 4;
    c.beginPath(); c.moveTo(-390, 10); c.quadraticCurveTo(-380 - 220 * hs, 30 + 140 * hs, ex, ey);
    A.fs(c, null, P.ink, L(c, 3));
    // phễu
    A.poly(c, [[ex, ey - 4], [ex - 34, ey - 18], [ex - 34, ey + 18], [ex, ey + 4]], P.paper, P.ink, lw);
  }
  c.restore();
}
export function tankerTop(c: C2, x: number, y: number, rot: number, s: number, awacs = false, t = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const lw = L(c, 3);
  const wing: Pt[] = [[60, 20], [-80, 320], [-130, 320], [-60, 20]];
  A.poly(c, wing, P.light, P.ink, lw); A.poly(c, mir(wing), P.light, P.ink, lw);
  const st: Pt[] = [[-300, 10], [-360, 120], [-390, 120], [-370, 10]];
  A.poly(c, st, P.light, P.ink, lw); A.poly(c, mir(st), P.light, P.ink, lw);
  for (const ey of [-120, -220, 120, 220]) A.rrect(c, -10, ey - 12, 70, 24, 10, P.slate, P.ink, lw);
  A.rrect(c, -400, -34, 740, 68, 34, P.paper, P.ink, lw);
  if (awacs) {
    A.ellipse(c, -160, 0, 110, 110, 0, P.dark, P.ink, lw);
    c.save(); c.translate(-160, 0); c.rotate(t * 1.2);
    A.line(c, [[-100, 0], [100, 0]], P.sky, L(c, 4)); c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- biểu tượng giá
export function iconCost(c: C2, kind: 'weight' | 'heat' | 'cost' | 'eye', x: number, y: number, s: number, col: string = P.ink) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const lw = L(c, 3);
  if (kind === 'weight') {
    c.beginPath(); c.arc(0, -26, 14, Math.PI, 0); A.fs(c, null, col, lw * 1.4);
    A.poly(c, [[-30, -18], [30, -18], [40, 30], [-40, 30]], col, P.ink, lw);
  } else if (kind === 'heat') {
    c.beginPath(); c.moveTo(0, -40);
    c.bezierCurveTo(30, -10, 34, 10, 26, 22); c.bezierCurveTo(16, 38, -16, 38, -26, 22);
    c.bezierCurveTo(-34, 6, -20, -6, -10, -16); c.bezierCurveTo(-6, -4, 0, -2, 4, -6); c.bezierCurveTo(6, -18, 2, -30, 0, -40);
    A.fs(c, col, P.ink, lw);
  } else if (kind === 'cost') {
    A.circle(c, 0, 0, 34, col, P.ink, lw);
    A.circle(c, 0, 0, 24, null, P.paper, lw);
    A.rrect(c, -5, -14, 10, 28, 3, P.paper, null);
  } else {
    c.beginPath(); c.moveTo(-40, 0); c.quadraticCurveTo(0, -36, 40, 0); c.quadraticCurveTo(0, 36, -40, 0);
    A.fs(c, P.paper, col, lw * 1.3);
    A.circle(c, 0, 0, 13, col, null);
  }
  c.restore();
}
export const COST_COL: Record<string, string> = { weight: P.dark, heat: P.amber, cost: '#c9a227', eye: P.enemy };

// ---------------------------------------------------------------- hiệu ứng
export function boom(c: C2, x: number, y: number, r: number, p: number, seed = 1) {
  if (p <= 0 || p >= 1) return;
  const e = A.eo(p, 0, 0.35), f = 1 - A.sm(p, 0.4, 1);
  A.withA(c, f, () => {
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + seed, d = r * 0.55 * e;
      A.circle(c, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.5 * (0.6 + A.rnd(seed + i) * 0.5) * (0.4 + e), '#94a3b8', null);
    }
    A.circle(c, x, y, r * e, P.amber, P.ink, L(c, 2));
    A.circle(c, x, y, r * 0.55 * e * (1 - p), '#fde68a', null);
  });
}
export function puff(c: C2, x: number, y: number, r: number, a: number) {
  A.withA(c, a, () => A.circle(c, x, y, r, '#cbd5e1', null));
}
/** đường cong tham số đều: [x,y,heading] */
export type Track = (t: number) => [number, number, number];
export function trail(c: C2, tr: Track, t0: number, t1: number, col: string, w: number, dash?: number[]) {
  if (t1 <= t0) return;
  const pts: Pt[] = [];
  const n = Math.max(2, Math.ceil((t1 - t0) * 30));
  for (let i = 0; i <= n; i++) { const p = tr(t0 + (t1 - t0) * i / n); pts.push([p[0], p[1]]); }
  A.line(c, pts, col, L(c, w), dash);
}
export function cone(c: C2, x: number, y: number, dir: number, half: number, R: number, col: string, a: number) {
  A.withA(c, a, () => {
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, R, dir - half, dir + half); c.closePath();
    c.fillStyle = col; c.fill();
  });
}
export function ring(c: C2, x: number, y: number, R: number, col: string, w = 3, dash?: number[], a = 1) {
  A.withA(c, a, () => {
    c.beginPath(); c.arc(x, y, Math.max(0, R), 0, Math.PI * 2);
    if (dash) c.setLineDash(dash.map((d) => L(c, d)));
    A.fs(c, null, col, L(c, w)); c.setLineDash([]);
  });
}
export function label(c: C2, txt: string, x: number, y: number, size = 44, col: string = P.ink, align: CanvasTextAlign = 'center') {
  c.save();
  c.font = `700 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`;
  c.textAlign = align; c.textBaseline = 'middle';
  c.lineWidth = size * 0.18; c.strokeStyle = P.bg; c.lineJoin = 'round'; c.strokeText(txt, x, y);
  c.fillStyle = col; c.fillText(txt, x, y);
  c.restore();
}
/** Tiêm kích NGANG quay mặt sang TRÁI (lật gương). */
export function jetSideL(c: C2, x: number, y: number, s: number, rot: number, o: JetSideOpt = {}) {
  c.save(); c.translate(x, y); c.scale(-1, 1); jetSide(c, 0, 0, s, -rot, o); c.restore();
}
/** Mũi tên dày (thế giới). */
export function arrow(c: C2, x0: number, y0: number, x1: number, y1: number, w: number, col: string) {
  const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 2) return;
  const hl = Math.min(len * 0.45, w * 2.2);
  c.save(); c.translate(x0, y0); c.rotate(a);
  A.poly(c, [[0, -w / 2], [len - hl, -w / 2], [len - hl, -w * 1.1], [len, 0], [len - hl, w * 1.1], [len - hl, w / 2], [0, w / 2]], col, P.ink, L(c, 2.5));
  c.restore();
}
/** Người đứng NGANG (kỹ thuật viên), gốc = chân. */
export function person(c: C2, x: number, y: number, s: number, col: string = P.slate, armUp = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const lw = L(c, 3);
  A.capsule(c, [-6, 0], [-4, -60], 14, P.dark, P.ink, lw);
  A.capsule(c, [6, 0], [4, -60], 14, P.dark, P.ink, lw);
  A.capsule(c, [0, -62], [0, -120], 30, col, P.ink, lw);
  A.capsule(c, [4, -112], [26 + armUp * 4, -84 - armUp * 46], 11, col, P.ink, lw);
  A.circle(c, 0, -142, 15, P.skin, P.ink, lw);
  A.path(c, [[-16, -146], [-14, -160], [14, -160], [18, -146]]); A.fs(c, col, P.ink, lw);
  c.restore();
}
/** tần suất tạo trục: angle normalize */
export const angLerp = (a: number, b: number, p: number) => {
  let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * p;
};
