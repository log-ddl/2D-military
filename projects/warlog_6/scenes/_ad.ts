// Vật dùng xuyên phim warlog_6: phòng không. Mỗi vật có góc NGANG (…Side) và góc TRÊN XUỐNG (…Top).
// Quy ước: phe phòng thủ = olive, phía tấn công = đỏ gạch, radar/tia dò = xanh trời, tên lửa phóng = ink + lửa hổ phách.
// Hướng mặc định: dir = 1 quay sang phải. Gốc vẽ: Side = điểm chạm đất giữa thân; Top = tâm vật.
import * as A from './shared/art';
import { C, type Pt, withA, poly, line, circle, rrect, ellipse, capsule } from './shared/art';
import { P } from './shared/palette';

export const DEF = { body: P.olive, dark: P.oliveDark, light: P.oliveLight };
export const ATK = { body: P.enemy, dark: '#7f2e26', light: P.enemyLight };
export const SKY = P.sky;
export const GROUND = '#e3dcc2';
export const GROUND2 = '#d3caa6';

type Side = 'def' | 'atk';
const col = (s: Side) => (s === 'def' ? DEF : ATK);

function flip(c: CanvasRenderingContext2D, x: number, y: number, s: number, dir: 1 | -1, fn: () => void) {
  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);
  fn();
  c.restore();
}

// ── Bánh xe ─────────────────────────────────────────────────────────
function wheel(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  circle(c, x, y, r, P.dark, P.ink, 3);
  circle(c, x, y, r * 0.4, P.light, P.ink, 2);
}

// ── Radar (ngang): xe + cột + đĩa quay ──────────────────────────────
export function radarSide(c: CanvasRenderingContext2D, x: number, gy: number, s = 1, o: { ph?: number; dir?: 1 | -1; a?: number } = {}) {
  withA(c, o.a ?? 1, () => flip(c, x, gy, s, o.dir ?? 1, () => {
    const ph = o.ph ?? 0;
    rrect(c, -120, -62, 190, 40, 8, DEF.body, P.ink, 4);
    poly(c, [[70, -62], [112, -62], [126, -40], [126, -22], [70, -22]], DEF.light, P.ink, 4);
    poly(c, [[84, -58], [106, -58], [116, -42], [84, -42]], P.glass, P.ink, 2.5);
    wheel(c, -88, -20, 20); wheel(c, -34, -20, 20); wheel(c, 18, -20, 20); wheel(c, 94, -20, 20);
    rrect(c, -50, -90, 60, 30, 5, DEF.dark, P.ink, 3);
    // cột + đĩa
    line(c, [[-10, -90], [-10, -150]], P.ink, 9);
    line(c, [[-10, -90], [-10, -150]], P.light, 4);
    const w = 8 + 34 * Math.abs(Math.cos(ph));
    ellipse(c, -10, -190, w, 52, 0, SKY, P.ink, 4);
    ellipse(c, -10, -190, w * 0.45, 28, 0, '#bfe7fb', null, 0);
    line(c, [[-10, -190], [-10 + (Math.cos(ph) >= 0 ? 24 : -24), -190]], P.ink, 4);
  }));
}

// ── Bệ phóng (ngang) ────────────────────────────────────────────────
// big: bệ lớn tầm xa (4 ống to); không big: xe tầm trung (2 ống). loaded: số ống còn tên lửa.
export function launcherSide(c: CanvasRenderingContext2D, x: number, gy: number, s = 1, o: { big?: boolean; elev?: number; loaded?: number; dir?: 1 | -1; a?: number } = {}) {
  const big = o.big ?? false, n = big ? 4 : 2, loaded = o.loaded ?? n;
  withA(c, o.a ?? 1, () => flip(c, x, gy, s, o.dir ?? 1, () => {
    const L = big ? 270 : 200;
    rrect(c, -L / 2, -58, L, 38, 8, DEF.body, P.ink, 4);
    poly(c, [[L / 2 - 52, -58], [L / 2 - 8, -58], [L / 2 + 10, -34], [L / 2 + 10, -20], [L / 2 - 52, -20]], DEF.light, P.ink, 4);
    poly(c, [[L / 2 - 38, -54], [L / 2 - 14, -54], [L / 2 - 2, -38], [L / 2 - 38, -38]], P.glass, P.ink, 2.5);
    const nw = big ? 4 : 3;
    for (let i = 0; i < nw; i++) wheel(c, -L / 2 + 34 + i * ((L - 120) / (nw - 1)), -19, 19);
    // giá phóng quay quanh trục
    const el = -(o.elev ?? 0.35);
    c.save();
    c.translate(-L / 2 + 54, -66);
    rrect(c, -12, -2, 24, 12, 3, DEF.dark, P.ink, 3);
    c.rotate(el);
    const tl = big ? 205 : 150, tw = big ? 28 : 20;
    for (let i = 0; i < n; i++) {
      const oy = -i * (tw + 4) - 12;
      rrect(c, -10, oy - tw / 2, tl, tw, tw / 2.4, i < loaded ? DEF.light : '#e2e8f0', P.ink, 3.5);
      if (i < loaded) poly(c, [[tl - 4, oy - tw * 0.3], [tl + 20, oy], [tl - 4, oy + tw * 0.3]], P.ink, P.ink, 2);
    }
    c.restore();
  }));
}

// ── Xe pháo phòng không (ngang) ─────────────────────────────────────
export function gunSide(c: CanvasRenderingContext2D, x: number, gy: number, s = 1, o: { elev?: number; dir?: 1 | -1; a?: number; recoil?: number } = {}) {
  withA(c, o.a ?? 1, () => flip(c, x, gy, s, o.dir ?? 1, () => {
    rrect(c, -112, -30, 224, 30, 12, DEF.dark, P.ink, 4);
    for (let i = 0; i < 5; i++) circle(c, -80 + i * 40, -14, 13, DEF.body, P.ink, 3);
    poly(c, [[-98, -30], [98, -30], [74, -66], [-72, -66]], DEF.body, P.ink, 4);
    rrect(c, -40, -104, 92, 40, 10, DEF.light, P.ink, 4);
    // radar nhỏ trên tháp
    line(c, [[-20, -104], [-20, -124]], P.ink, 4);
    ellipse(c, -20, -134, 8, 18, 0, SKY, P.ink, 3);
    c.save();
    c.translate(14, -86);
    c.rotate(-(o.elev ?? 0.6));
    const r = o.recoil ?? 0;
    capsule(c, [10 - r, -8], [120 - r, -8], 9, P.steelDark, P.ink, 2.5);
    capsule(c, [10 - r, 8], [120 - r, 8], 9, P.steelDark, P.ink, 2.5);
    c.restore();
  }));
}

// ── Lính vác tên lửa vai (ngang) ────────────────────────────────────
export function manpadSide(c: CanvasRenderingContext2D, x: number, gy: number, s = 1, o: { aim?: number; dir?: 1 | -1; a?: number } = {}) {
  withA(c, o.a ?? 1, () => flip(c, x, gy, s, o.dir ?? 1, () => {
    const aim = o.aim ?? 0.8;
    line(c, [[0, -34], [-7, 0]], DEF.dark, 8);
    line(c, [[0, -34], [9, 0]], DEF.dark, 8);
    rrect(c, -12, -78, 24, 48, 9, DEF.body, P.ink, 3);
    circle(c, 0, -91, 11, P.skin, P.ink, 3);
    c.beginPath(); c.arc(0, -93, 12, Math.PI, 0); c.closePath(); c.fillStyle = DEF.dark; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 3; c.stroke();
    c.save();
    c.translate(2, -66);
    c.rotate(-aim);
    capsule(c, [-34, -7], [48, -9], 11, DEF.light, P.ink, 3);
    poly(c, [[48, -17], [66, -9], [48, -1]], P.enemy, P.ink, 2.5);
    line(c, [[0, 3], [14, -3]], DEF.dark, 7);
    c.restore();
  }));
}

// ── Máy bay ngang ───────────────────────────────────────────────────
export function jetSide(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: { side?: Side; dir?: 1 | -1; pitch?: number; a?: number; flame?: boolean } = {}) {
  const k = col(o.side ?? 'atk');
  withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y);
    c.rotate((o.pitch ?? 0) * (o.dir ?? 1));
    c.scale((o.dir ?? 1) * s, s);
    poly(c, [[-80, -8], [-96, -44], [-72, -44], [-44, -8]], k.dark, P.ink, 3.5); // đuôi đứng
    poly(c, [[-70, 4], [-108, 6], [-60, -4]], k.dark, P.ink, 3); // đuôi ngang
    poly(c, [[-84, -10], [10, -16], [78, -4], [112, 6], [60, 14], [-70, 12]], k.body, P.ink, 4); // thân
    poly(c, [[24, -15], [50, -9], [70, -3], [30, -4]], P.glass, P.ink, 2.5); // buồng lái
    poly(c, [[-20, 6], [-56, 34], [-34, 34], [14, 8]], k.light, P.ink, 3.5); // cánh
    poly(c, [[-10, 3], [-34, 20], [-18, 20], [12, 4]], k.dark, null, 0);
    if (o.flame) poly(c, [[-84, -2], [-130, 3], [-84, 8]], '#fbbf24', P.ink, 2.5);
    c.restore();
  });
}

export function bomberSide(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: { side?: Side; dir?: 1 | -1; a?: number } = {}) {
  const k = col(o.side ?? 'atk');
  withA(c, o.a ?? 1, () => flip(c, x, y, s, o.dir ?? 1, () => {
    poly(c, [[-150, -6], [-176, -62], [-142, -62], [-96, -6]], k.dark, P.ink, 3.5);
    poly(c, [[-140, 4], [-196, 8], [-124, -2]], k.dark, P.ink, 3);
    poly(c, [[-150, -12], [60, -18], [128, -4], [150, 10], [80, 22], [-130, 18]], k.body, P.ink, 4);
    poly(c, [[70, -16], [104, -9], [124, -3], [80, -4]], P.glass, P.ink, 2.5);
    poly(c, [[-30, 12], [-90, 56], [-48, 56], [30, 16]], k.light, P.ink, 3.5);
    rrect(c, -28, 34, 36, 14, 6, k.dark, P.ink, 3);
    rrect(c, -62, 40, 36, 14, 6, k.dark, P.ink, 3);
  }));
}

export function awacsSide(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: { dir?: 1 | -1; ph?: number; a?: number } = {}) {
  withA(c, o.a ?? 1, () => flip(c, x, y, s, o.dir ?? 1, () => {
    poly(c, [[-160, -8], [-186, -64], [-150, -64], [-104, -8]], DEF.dark, P.ink, 3.5);
    poly(c, [[-150, 4], [-204, 10], [-134, -2]], DEF.dark, P.ink, 3);
    poly(c, [[-160, -16], [40, -24], [136, -10], [160, 8], [80, 24], [-140, 20]], '#eef2f6', P.ink, 4);
    poly(c, [[100, -18], [128, -10], [144, -2], [104, -4]], P.glass, P.ink, 2.5);
    poly(c, [[-30, 14], [-96, 60], [-52, 60], [30, 18]], DEF.light, P.ink, 3.5);
    rrect(c, -18, 40, 38, 14, 6, DEF.dark, P.ink, 3);
    // đĩa quay trên lưng
    line(c, [[-30, -22], [-34, -52]], P.ink, 6);
    line(c, [[40, -26], [36, -52]], P.ink, 6);
    const w = 60 + 10 * Math.cos(o.ph ?? 0);
    ellipse(c, 0, -62, w, 15, 0, SKY, P.ink, 4);
    ellipse(c, 0, -66, w * 0.7, 6, 0, '#bfe7fb', null, 0);
  }));
}

export function u2Side(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: { dir?: 1 | -1; pitch?: number; a?: number } = {}) {
  withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y);
    c.rotate((o.pitch ?? 0) * (o.dir ?? 1));
    c.scale((o.dir ?? 1) * s, s);
    poly(c, [[-120, -4], [-132, -40], [-108, -40], [-86, -4]], '#334155', P.ink, 3);
    poly(c, [[-124, 4], [-168, 4], [-100, -2]], '#334155', P.ink, 3);
    poly(c, [[-124, -6], [20, -10], [96, -3], [130, 4], [64, 10], [-110, 8]], '#475569', P.ink, 4);
    poly(c, [[34, -9], [60, -5], [74, -2], [40, -3]], P.glass, P.ink, 2.5);
    poly(c, [[-30, 4], [-76, 12], [-104, 14], [-40, 8]], '#64748b', P.ink, 3);
    c.restore();
  });
}

export function droneSide(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: { dir?: 1 | -1; a?: number; side?: Side } = {}) {
  const k = col(o.side ?? 'atk');
  withA(c, o.a ?? 1, () => flip(c, x, y, s, o.dir ?? 1, () => {
    poly(c, [[-40, -4], [-52, -22], [-36, -22], [-22, -4]], k.dark, P.ink, 3);
    poly(c, [[-48, -3], [26, -8], [52, 0], [24, 7], [-48, 5]], k.body, P.ink, 3.5);
    poly(c, [[-6, 4], [-26, 18], [-12, 18], [10, 5]], k.light, P.ink, 3);
    line(c, [[-50, 1], [-62, 1]], P.ink, 3);
    circle(c, -66, 1, 8, null, P.ink, 2.5);
  }));
}

export function heliSide(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: { dir?: 1 | -1; ph?: number; a?: number; side?: Side } = {}) {
  const k = col(o.side ?? 'atk');
  withA(c, o.a ?? 1, () => flip(c, x, y, s, o.dir ?? 1, () => {
    line(c, [[-30, -4], [-110, -14]], k.dark, 10);
    poly(c, [[-118, -34], [-104, -34], [-96, -8], [-112, -8]], k.dark, P.ink, 3);
    ellipse(c, 0, 0, 52, 30, 0, k.body, P.ink, 4);
    poly(c, [[16, -20], [48, -4], [20, -2]], P.glass, P.ink, 2.5);
    line(c, [[-30, 36], [30, 36]], P.ink, 4);
    line(c, [[-14, 24], [-18, 36]], P.ink, 4);
    line(c, [[14, 24], [18, 36]], P.ink, 4);
    line(c, [[0, -30], [0, -42]], P.ink, 5);
    const w = 80 * Math.abs(Math.cos(o.ph ?? 0)) + 14;
    line(c, [[-w, -42], [w, -42]], P.ink, 5);
  }));
}

// ── Tên lửa ─────────────────────────────────────────────────────────
// ang: hướng bay (rad, 0 = sang phải, y xuống dương). L: chiều dài thế giới.
export function missile(c: CanvasRenderingContext2D, x: number, y: number, ang: number, L = 60, o: { flame?: number; color?: string; a?: number; side?: Side } = {}) {
  const k = o.color ?? '#e2e8f0';
  withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    const h = L * 0.14;
    const f = o.flame ?? 0;
    if (f > 0) {
      const fl = L * 0.55 * f;
      poly(c, [[-L * 0.5, -h * 0.6], [-L * 0.5 - fl, 0], [-L * 0.5, h * 0.6]], '#fbbf24', P.ink, 2.5);
      poly(c, [[-L * 0.5, -h * 0.3], [-L * 0.5 - fl * 0.55, 0], [-L * 0.5, h * 0.3]], '#fff7d6', null, 0);
    }
    poly(c, [[-L * 0.5, -h], [-L * 0.62, -h * 2.2], [-L * 0.34, -h]], P.dark, P.ink, 2.5);
    poly(c, [[-L * 0.5, h], [-L * 0.62, h * 2.2], [-L * 0.34, h]], P.dark, P.ink, 2.5);
    poly(c, [[-L * 0.5, -h], [L * 0.28, -h], [L * 0.5, 0], [L * 0.28, h], [-L * 0.5, h]], k, P.ink, 3);
    poly(c, [[L * 0.28, -h], [L * 0.5, 0], [L * 0.28, h]], (o.side ?? 'def') === 'atk' ? P.enemy : P.dark, P.ink, 3);
    c.restore();
  });
}

// ── Máy bay nhìn từ trên xuống ──────────────────────────────────────
export function planeTop(c: CanvasRenderingContext2D, x: number, y: number, ang: number, s = 1, o: { side?: Side; a?: number; kind?: 'jet' | 'bomber' | 'drone' | 'heli' | 'awacs' } = {}) {
  const k = col(o.side ?? 'atk');
  withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.scale(s, s);
    const kind = o.kind ?? 'jet';
    if (kind === 'drone') {
      poly(c, [[-18, -34], [-6, -4], [-6, 4], [-18, 34], [-24, 34], [-14, 0], [-24, -34]], k.light, P.ink, 3);
      poly(c, [[-26, 0], [-14, -6], [22, -4], [34, 0], [22, 4], [-14, 6]], k.body, P.ink, 3);
    } else if (kind === 'bomber') {
      poly(c, [[-10, -92], [8, -92], [6, -8], [-30, -8]], k.light, P.ink, 3.5);
      poly(c, [[-10, 92], [8, 92], [6, 8], [-30, 8]], k.light, P.ink, 3.5);
      poly(c, [[-62, -22], [-40, -22], [-30, -4], [-30, 4], [-40, 22], [-62, 22]], k.dark, P.ink, 3);
      poly(c, [[-60, 0], [-30, -10], [40, -8], [76, 0], [40, 8], [-30, 10]], k.body, P.ink, 4);
    } else if (kind === 'heli') {
      line(c, [[-64, 0], [-10, 0]], k.dark, 8);
      ellipse(c, 6, 0, 34, 20, 0, k.body, P.ink, 4);
      line(c, [[-70, -14], [-58, 14]], P.ink, 4);
      line(c, [[6, -56], [6, 56]], P.ink, 4);
      line(c, [[-50, 6], [62, -6]], P.ink, 3);
    } else if (kind === 'awacs') {
      poly(c, [[-4, -100], [18, -100], [8, -6], [-44, -6]], '#eef2f6', P.ink, 3.5);
      poly(c, [[-4, 100], [18, 100], [8, 6], [-44, 6]], '#eef2f6', P.ink, 3.5);
      poly(c, [[-70, -26], [-46, -26], [-38, 0], [-46, 26], [-70, 26]], '#eef2f6', P.ink, 3);
      poly(c, [[-84, 0], [-38, -9], [56, -7], [88, 0], [56, 7], [-38, 9]], '#eef2f6', P.ink, 4);
      circle(c, -2, 0, 28, SKY, P.ink, 4);
    } else {
      poly(c, [[-34, -50], [-18, -50], [8, -6], [-14, -4]], k.light, P.ink, 3.5);
      poly(c, [[-34, 50], [-18, 50], [8, 6], [-14, 4]], k.light, P.ink, 3.5);
      poly(c, [[-48, -16], [-32, -16], [-18, -3], [-18, 3], [-32, 16], [-48, 16]], k.dark, P.ink, 3);
      poly(c, [[-52, 0], [-30, -8], [30, -6], [66, 0], [30, 6], [-30, 8]], k.body, P.ink, 4);
      ellipse(c, 24, 0, 11, 4, 0, P.glass, P.ink, 2);
    }
    c.restore();
  });
}

// ── Radar nhìn từ trên (đĩa quay + vành) ────────────────────────────
export function radarTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, o: { ph?: number; a?: number } = {}) {
  withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    rrect(c, -32, -26, 64, 52, 10, DEF.body, P.ink, 4);
    rrect(c, -22, -16, 24, 32, 5, DEF.dark, P.ink, 2.5);
    c.rotate(o.ph ?? 0);
    capsule(c, [0, -40], [0, 40], 10, SKY, P.ink, 3);
    circle(c, 0, 0, 8, DEF.light, P.ink, 3);
    c.restore();
  });
}

export function launcherTop(c: CanvasRenderingContext2D, x: number, y: number, ang: number, s = 1, o: { big?: boolean; a?: number; loaded?: number; fire?: number } = {}) {
  const big = o.big ?? false, n = big ? 4 : 2, loaded = o.loaded ?? n;
  withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.scale(s, s);
    const L = big ? 118 : 86, W = big ? 40 : 32;
    rrect(c, -L / 2, -W / 2, L, W, 8, DEF.body, P.ink, 4);
    rrect(c, L / 2 - 26, -W / 2 + 4, 22, W - 8, 5, DEF.light, P.ink, 2.5);
    for (let i = 0; i < n; i++) {
      const yy = -W * 0.38 + (i + 0.5) * ((W * 0.76) / n);
      capsule(c, [-L / 2 + 8, yy], [L / 2 - 36, yy], (W * 0.62) / n, i < loaded ? '#e2e8f0' : DEF.dark, P.ink, 2.5);
    }
    c.restore();
  });
}

export function gunTop(c: CanvasRenderingContext2D, x: number, y: number, ang: number, s = 1, o: { a?: number; turret?: number } = {}) {
  withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.scale(s, s);
    rrect(c, -50, -24, 100, 48, 10, DEF.dark, P.ink, 4);
    rrect(c, -44, -18, 88, 36, 8, DEF.body, P.ink, 3);
    c.rotate((o.turret ?? 0) - ang * 0 );
    rrect(c, -20, -17, 40, 34, 8, DEF.light, P.ink, 3);
    capsule(c, [14, -7], [58, -7], 7, P.steelDark, P.ink, 2);
    capsule(c, [14, 7], [58, 7], 7, P.steelDark, P.ink, 2);
    c.restore();
  });
}

export function soldierTop(c: CanvasRenderingContext2D, x: number, y: number, ang: number, s = 1, o: { a?: number; tube?: boolean } = {}) {
  withA(c, o.a ?? 1, () => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.scale(s, s);
    if (o.tube !== false) {
      capsule(c, [-18, 4], [40, 4], 9, DEF.light, P.ink, 2.5);
      poly(c, [[40, -3], [54, 4], [40, 11]], P.enemy, P.ink, 2);
    }
    ellipse(c, 0, 0, 10, 15, 0, DEF.body, P.ink, 3);
    circle(c, 4, 0, 8, DEF.dark, P.ink, 2.5);
    c.restore();
  });
}

// ── Nhà (đơn vị giá: "đắt hơn một căn nhà") ─────────────────────────
export function house(c: CanvasRenderingContext2D, x: number, gy: number, s = 1, a = 1) {
  withA(c, a, () => flip(c, x, gy, s, 1, () => {
    rrect(c, -44, -64, 88, 64, 3, '#f1e6c8', P.ink, 3.5);
    poly(c, [[-56, -62], [0, -108], [56, -62]], P.enemyLight, P.ink, 3.5);
    rrect(c, -10, -36, 22, 36, 3, P.sand, P.ink, 2.5);
    rrect(c, -36, -50, 18, 18, 2, P.glass, P.ink, 2.5);
    rrect(c, 18, -50, 18, 18, 2, P.glass, P.ink, 2.5);
  }));
}

// ── Hiệu ứng ────────────────────────────────────────────────────────
/** Sóng radar toả ra dạng cung (ngang/trên): các vòng lan ra theo thời gian. */
export function waves(c: CanvasRenderingContext2D, x: number, y: number, a0: number, a1: number, rMax: number, t: number, n = 4, color = SKY, lw = 4) {
  for (let i = 0; i < n; i++) {
    const p = (((t * 0.55 + i / n) % 1) + 1) % 1;
    withA(c, (1 - p) * 0.9, () => {
      c.beginPath();
      c.arc(x, y, rMax * (0.08 + 0.92 * p), a0, a1);
      c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.stroke();
    });
  }
}

/** Vùng nhìn/bắn nửa trong suốt: hình quạt hoặc nửa đĩa. */
export function dome(c: CanvasRenderingContext2D, x: number, gy: number, r: number, color: string, a = 0.18, p = 1, lw = 4, rx?: number) {
  if (p <= 0) return;
  const rr = r * p, ww = (rx ?? r) * p;
  c.save();
  c.beginPath();
  c.ellipse(x, gy, ww, rr, 0, Math.PI, 0);
  c.closePath();
  c.globalAlpha *= a; c.fillStyle = color; c.fill();
  c.restore();
  withA(c, 0.95, () => {
    c.beginPath();
    c.ellipse(x, gy, ww, rr, 0, Math.PI, 0);
    c.strokeStyle = color; c.lineWidth = lw; c.setLineDash([lw * 3.2, lw * 2.2]); c.lineCap = 'round'; c.stroke(); c.setLineDash([]);
  });
}

/** Vết khói/hơi sau một vật chuyển động: pos(t) trả vị trí; vẽ chuỗi chấm mờ dần. */
export function trail(c: CanvasRenderingContext2D, pos: (t: number) => Pt, t: number, len = 1.0, n = 14, color = '#94a3b8', r = 7) {
  for (let i = 1; i <= n; i++) {
    const tt = t - (i / n) * len;
    const [px, py] = pos(tt);
    withA(c, (1 - i / n) * 0.75, () => circle(c, px, py, r * (1 - 0.5 * (i / n)), color, null, 0));
  }
}

/** Nền đất ngang (phủ cả viewport theo camera) + vài vệt mặt đất. */
export function groundFill(c: CanvasRenderingContext2D, k: { x: number; z: number }, gy: number, bottom = 3000) {
  const hw = A.W / k.z / 2 + 120;
  c.fillStyle = GROUND;
  c.fillRect(k.x - hw, gy, hw * 2, bottom);
  c.fillStyle = GROUND2;
  c.fillRect(k.x - hw, gy, hw * 2, 8 / Math.max(k.z, 0.3));
  line(c, [[k.x - hw, gy], [k.x + hw, gy]], P.ink, 4 / Math.max(k.z, 0.5));
}

/** Bầu trời nền dạng dải theo độ cao (nhạt dần lên trên). */
export function skyFill(c: CanvasRenderingContext2D, k: { x: number; y: number; z: number }, gy: number) {
  const hw = A.W / k.z / 2 + 120, hh = A.H / k.z / 2 + 120;
  const g = c.createLinearGradient(0, k.y - hh, 0, gy);
  g.addColorStop(0, '#e6f0f8');
  g.addColorStop(1, '#f6fafc');
  c.fillStyle = g;
  c.fillRect(k.x - hw, k.y - hh, hw * 2, gy - (k.y - hh));
}

/** Chớp nổ gọn, dùng chung (p = tiến độ 0..1). */
export function bang(c: CanvasRenderingContext2D, x: number, y: number, r: number, p: number) {
  if (p <= 0 || p >= 1) return;
  const e = 1 - Math.pow(1 - p, 3);
  withA(c, 1 - p * p, () => {
    circle(c, x, y, r * e * 1.05, '#f97316', P.ink, 4);
    circle(c, x, y, r * e * 0.7, '#fbbf24', null, 0);
    circle(c, x, y, r * e * 0.36, '#fff7d6', null, 0);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const r0 = r * e * 1.05, r1 = r * (0.8 + 0.7 * e + (i % 3) * 0.12);
      line(c, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], P.ink, 3.5);
    }
  });
  withA(c, 0.7 * (1 - p), () => circle(c, x, y, r * 1.8 * e, null, P.ink, 3));
}

/** Chữ số/nhãn dùng chung: nền thẻ trắng, chữ đậm. Toạ độ màn hình. */
export function tag(c: CanvasRenderingContext2D, s: string, x: number, y: number, p = 1, color = P.ink, size = 44) {
  if (p <= 0) return;
  withA(c, A.clamp01(p * 3), () => {
    c.save();
    c.translate(x, y + (1 - A.eo(p, 0, 1)) * 14);
    c.font = `900 ${size}px 'Archivo', 'SF Pro Display', -apple-system, sans-serif`;
    const w = c.measureText(s).width + 44, h = size + 28;
    rrect(c, -w / 2, -h / 2, w, h, 16, '#fff', color, 4);
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(s, 0, 3);
    c.restore();
  });
}
