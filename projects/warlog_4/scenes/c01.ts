// Chương 1 (0 – 52.8): đáp xuống là để bay lên. Phi cơ bám NGANG → thang so sánh 2.5 km vs 300 m → bản đồ → sàn TRÊN.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const SJ = 1.2;                 // cỡ phản lực trong cảnh NGANG
const TD = 5.4;                 // bánh chạm sàn
const CATCH = TD + 0.06;        // móc ăn dây 3
const REPLAY0 = 10.7, RCATCH = 12.2, RSTOP = 16.1;
const MISS0 = 16.14, TD2 = 17.3, LIFT = 20.3;
const HOOK_X = (xj: number) => xj - 66 * SJ;
const WIRE3 = S.WIRES_X[2]!;

export const LOOP = S.makePath([[200, -17], [420, -14], [560, -14], [720, -50], [820, -160], [700, -290], [300, -310], [-300, -310], [-800, -300], [-1180, -180], [-1200, 40], [-1060, 150], [-760, 110], [-450, 40], [-150, -14], [-100, -18]], 3);

interface JS { x: number; y: number; ang: number; flame: number; hook: number; gear: number; vis: number }

function pass1(t: number): JS {
  const hook = A.sm(t, 1.5, 3.0), gear = 1;
  let x: number, y = -JET_Y, ang = 0, flame = 0;
  if (t < TD) {
    x = -212 + 215 * (t - TD);
    y = -JET_Y - 0.075 * (-212 - x);
    ang = -0.1 * (1 - A.sm(t, TD - 0.5, TD));
  } else if (t < CATCH) {
    x = -212 + 215 * (t - TD);
  } else {
    const u = A.clamp01((t - CATCH) / 2.0);
    x = -199 + 180 * (1 - (1 - u) * (1 - u));
  }
  flame = A.sm(t, TD + 0.1, TD + 0.7) * (1 - A.sm(t, 10.3, 10.7));
  return { x, y, ang, flame, hook, gear, vis: 1 };
}
const JET_Y = S.JET_H * SJ;

function replay(t: number): JS {
  let x: number, y = -JET_Y;
  if (t < RCATCH) {
    x = -199 - 107 * (RCATCH - t);
    y = -JET_Y - 24 * (1 - A.sm(t, REPLAY0 + 0.2, RCATCH - 0.15));
  } else {
    const u = A.clamp01((t - RCATCH) / (RSTOP - RCATCH));
    x = -199 + 180 * (1 - (1 - u) * (1 - u));
  }
  return { x, y, ang: 0, flame: 0.75 * (1 - A.sm(t, 15.3, 16.0)), hook: 1, gear: 1, vis: 1 };
}

function pass2(t: number): JS {
  let x: number, y = -JET_Y, ang = 0, gear = 1;
  if (t < TD2) {
    x = -212 + 215 * (t - TD2);
    y = -JET_Y - 0.075 * (-212 - x);
    ang = -0.1 * (1 - A.sm(t, TD2 - 0.4, TD2));
  } else if (t < LIFT) {
    x = -212 + (470 + 212) * ((t - TD2) / (LIFT - TD2)) * 1.0;
  } else {
    const k = t - LIFT;
    x = 470 + 250 * k;
    y = -JET_Y - 60 * k - 26 * k * k;
    ang = -0.28 * A.sm(t, LIFT, LIFT + 0.6);
    gear = 1 - A.sm(t, LIFT + 0.5, LIFT + 1.2);
  }
  return { x, y, ang, flame: A.sm(t, TD2 + 0.05, TD2 + 0.5), hook: 0.35, gear, vis: 1 };
}

function camA(t: number): K.Cam {
  const j = t < REPLAY0 ? pass1(t) : t < MISS0 ? replay(t) : pass2(t);
  if (t < 5.4) return { x: j.x + 260, y: -70, z: 1.85 };
  return K.track(t, [
    [5.4, { x: -212 + 260, y: -70, z: 1.85 }],
    [7.0, { x: -40, y: -60, z: 1.55 }],
    [10.4, { x: -40, y: -60, z: 1.55 }],
    [11.6, { x: -300, y: -34, z: 3.3 }],
    [RCATCH, { x: -250, y: -32, z: 3.3 }],
    [14.8, { x: -70, y: -32, z: 3.1 }],
    [15.8, { x: -70, y: -30, z: 3.0 }],
    [16.6, { x: -40, y: -60, z: 1.6 }],
    [TD2, { x: -40, y: -60, z: 1.6 }],
    [LIFT, { x: 140, y: -70, z: 1.5 }],
    [25.4, { x: 380, y: -190, z: 0.95 }],
  ], A.eio);
}

export default class C01 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 25.4) this.shotA(c, t);
    else if (t < 36.7) this.shotB(c, t);
    else if (t < 41.8) this.shotMap(c, t);
    else this.shotLoop(c, t);
    for (const at of [REPLAY0, MISS0, 25.4, 36.7]) S.cutDip(c, t, at, 0.12);
    chain(c, t);
  }

  // ───── NGANG bám phi cơ
  private shotA(c: CanvasRenderingContext2D, t: number) {
    const cam = camA(t);
    const j = t < REPLAY0 ? pass1(t) : t < MISS0 ? replay(t) : pass2(t);
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 90 });
    S.carrierSide(c, t, { x: 0, y: 0, cut: 0, noIsland: true });
    // dây hãm
    const catchT = t < REPLAY0 ? CATCH : t < MISS0 ? RCATCH : 1e9;
    const hx = HOOK_X(j.x);
    const caught = t >= catchT && t < MISS0;
    S.WIRES_X.forEach((wx, i) => {
      const hit = i === 2 && caught;
      const hot = i === 2 && t > 7.5 && t < MISS0 && !hit;
      if (hit) {
        const pull = hx - wx;
        S.wireSide(c, wx, pull, P.amber, 0);
      } else S.wireSide(c, wx, 0, hot ? P.amber : '#e2e8f0');
    });
    // đường "bay đi lần nữa": hiện từ lúc voice nói
    const gp = A.sm(t, 8.4, 10.3) * (1 - A.sm(t, 10.6, 10.7));
    if (gp > 0) {
      const pts: A.Pt[] = [[-212, -JET_Y], [100, -JET_Y], [470, -JET_Y], [560, -JET_Y - 30], [700, -JET_Y - 120]];
      S.dashPath(c, pts, gp, P.amber, 6, [18, 12]);
    }
    if (j.vis > 0) S.jetSide(c, j.x, j.y, SJ, { ang: j.ang, hook: j.hook, gear: j.gear, flame: j.flame, hero: true });
    // tia lửa nhỏ khi móc quẹt sàn
    S.carrierIsland(c, t, { x: 0, y: 0 });
    K.end(c);
    // chỉ báo
    const th = A.sm(t, TD + 0.1, TD + 0.7) * (1 - A.sm(t, 10.3, 10.7));
    if (th > 0) this.throttle(c, 1740, 330, th, A.sm(t, TD + 0.2, TD + 0.6));
    if (t >= RCATCH && t < MISS0) this.timer(c, t);
    const [sx, sy] = K.toScreen(cam, j.x, j.y);
    if (t < 6.5) {
      S.tag(c, '20 t', sx - 110, sy - 120, A.win(t, 2.2, 4.4));
      S.tag(c, '240 km/h', sx + 150, sy - 150, A.win(t, 4.7, 7.2));
    }
  }

  private throttle(c: CanvasRenderingContext2D, x: number, y: number, a: number, p: number) {
    c.save(); c.globalAlpha *= a;
    A.rrect(c, x - 80, y - 160, 160, 330, 26, 'rgba(255,255,255,0.9)', P.ink, 4);
    A.rrect(c, x - 9, y - 120, 18, 240, 9, '#e2e8f0', P.ink, 3);
    for (let i = 0; i <= 4; i++) A.line(c, [[x + 16, y + 120 - i * 60], [x + 36, y + 120 - i * 60]], P.ink2, 3);
    const ly = y + 120 - 240 * p;
    A.rrect(c, x - 26, ly - 14, 52, 28, 10, P.amber, P.ink, 4);
    A.rrect(c, x - 9, y + 120 - 240 * p, 18, 240 * p, 9, 'rgba(245,158,11,0.55)', null, 0);
    c.restore();
  }

  private timer(c: CanvasRenderingContext2D, t: number) {
    const u = A.clamp01((t - RCATCH) / (RSTOP - RCATCH));
    const x = 190, y = 190;
    A.circle(c, x, y, 70, '#ffffff', P.ink, 5);
    A.line(c, [[x, y - 70], [x, y - 82]], P.ink, 6);
    c.save(); c.beginPath(); c.moveTo(x, y); c.arc(x, y, 58, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2); c.closePath();
    c.fillStyle = P.amber; c.fill(); c.restore();
    A.circle(c, x, y, 70, null, P.ink, 5);
    S.tag(c, `${(2 * u).toFixed(1)} s`, x + 190, y, 1, { size: 40 });
  }

  // ───── NGANG so thang: 2–3 km bê tông vs 300 m boong
  private shotB(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 1 };
    K.begin(c, cam);
    S.sea(c, cam, 112, t, { drift: -t * 22, wave: 2.4 });
    // đường băng
    const rp = A.eo(t, 25.9, 28.8);
    const L = 1640 * rp;
    A.rrect(c, -830, -118, 1660, 76, 0, P.sand, null, 0);
    A.rrect(c, -830, -118, L, 18, 3, '#cbd5e1', P.ink, 3);
    if (rp > 0.02) {
      A.line(c, [[-820, -109], [-820 + L - 14, -109]], '#ffffff', 3, [34, 26]);
      for (let x = -830; x <= -830 + L + 1; x += 325) A.line(c, [[x, -100], [x, -80]], P.ink2, 3);
    }
    // đất đứng yên: các vạch neo
    for (let x = -830; x < 830; x += 70) A.line(c, [[x, -80], [x - 22, -42]], 'rgba(30,41,59,0.28)', 3);
    A.line(c, [[-830, -42], [830, -42]], P.ink, 4);
    // tàu 300 m
    const cx = -720 + 130 * Math.max(0, t - 30.5);
    const ap = A.sm(t, 31.0, 31.9);
    if (ap > 0) {
      c.save(); c.globalAlpha *= ap;
      const pit = S.swell(t, 0.07, 4.2);
      const bob = Math.sin(t * 1.5) * 3;
      S.carrierSide(c, t, { x: cx, y: 92 + bob, s: 0.2, pitch: pit, island: 1 });
      // vệt nước phía sau
      const wk = A.sm(t, 33.5, 36);
      A.line(c, [[cx - 100, 112], [cx - 100 - 160 * wk, 112]], '#ffffff', 5);
      // thước 300 m
      const dp = A.sm(t, 33.4, 34.4);
      if (dp > 0) {
        const y = 150;
        A.line(c, [[cx - 94, y], [cx - 94 + 194 * dp, y]], P.ink, 4);
        A.line(c, [[cx - 94, y - 9], [cx - 94, y + 9]], P.ink, 4);
        A.line(c, [[cx - 94 + 194 * dp, y - 9], [cx - 94 + 194 * dp, y + 9]], P.ink, 4);
      }
      c.restore();
    }
    K.end(c);
    S.tag(c, '300 m', 960 + cx, 540 + 205, A.win(t, 34.2, 37.0), { size: 40 });
    if (t > 36.2) S.tag(c, '30 kn', 960 + cx + 160, 540 + 105, A.win(t, 36.2, 36.7, 0.2, 0.01), { size: 40 });
  }

  // ───── TRÊN: bản đồ biển, sân bay xa 1000 km
  private shipX(t: number) { return 640 + 12 * (t - 36.7); }
  private shotMap(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 1 };
    const sx = this.shipX(t);
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 40);
    this.land(c);
    // đường nét đứt từ sân bay tới tàu
    const dp = A.sm(t, 38.8, 40.6);
    const x0 = -720, x1 = sx - 90;
    A.line(c, [[x0, 40], [x0 + (x1 - x0) * dp, 40]], P.ink, A.px(c, 4), [18, 12]);
    if (dp > 0.99) {
      A.line(c, [[x0, 28], [x0, 52]], P.ink, A.px(c, 4));
      A.line(c, [[x1, 28], [x1, 52]], P.ink, A.px(c, 4));
    }
    S.arrowW(c, [sx + 80, 40], [sx + 200, 40], A.sm(t, 37.2, 38.0), P.amber, 7, 26);
    A.line(c, [[sx - 80, 40 + 14], [sx - 80 - 150 * A.sm(t, 37.4, 39), 40 + 14]], '#ffffff', 8);
    S.carrierTop(c, t, { x: sx, y: 40, s: 0.14, angled: 1 });
    K.end(c);
    S.tag(c, '30 kn', 960 + sx + 140, 540 - 5, A.win(t, 38.0, 41.6), { size: 40 });
    S.tag(c, '1000 km', 960 + (x0 + x1) / 2, 540 - 22, A.win(t, 40.0, 41.8, 0.4, 0.001), { size: 44 });
  }

  private land(c: CanvasRenderingContext2D) {
    A.poly(c, [[-990, -560], [-760, -560], [-790, -380], [-740, -230], [-800, -90], [-760, 40], [-820, 190], [-770, 330], [-810, 560], [-990, 560]], P.sand, P.ink, A.px(c, 4));
    A.rrect(c, -950, 20, 170, 40, 4, '#64748b', P.ink, A.px(c, 3));
    A.line(c, [[-940, 40], [-790, 40]], '#ffffff', A.px(c, 3), [20, 14]);
  }

  // ───── TRÊN: zoom vào boong, chu trình cất/hạ cánh quanh tàu
  private shotLoop(c: CanvasRenderingContext2D, t: number) {
    const SC = 0.14;
    const sx = this.shipX(t);
    const cam = K.track(t, [
      [41.8, { x: 0, y: 0, z: 1 }],
      [46.8, { x: this.shipX(46.8) + 30 * SC, y: 40 - 70 * SC, z: 5.5 }],
      [52.8, { x: this.shipX(52.8) + 30 * SC, y: 40 - 70 * SC, z: 5.5 }],
    ], A.eio);
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 40);
    const fa = 1 - A.sm(t, 42.0, 44.0);
    if (fa > 0) {
      c.save(); c.globalAlpha *= fa;
      this.land(c);
      A.line(c, [[-720, 40], [sx - 90, 40]], P.ink, A.px(c, 4), [18, 12]);
      c.restore();
    }
    c.save(); c.translate(sx, 40); c.scale(SC, SC); c.translate(0, 0);
    S.carrierTop(c, t, { x: 0, y: 0, angled: 1 });
    // máy bay đậu ở mạn phải phía mũi
    for (const [px, py] of [[250, 40], [300, 40], [350, 40], [400, 36]] as const) S.jetTop(c, px, py, 0.8, { fold: 1 });
    // vòng cất/hạ cánh
    const n = 6, spd = 0.085;
    const on = A.sm(t, 43.6, 45.4);
    for (let i = 0; i < n; i++) {
      const u = (((t - 43) * spd + i / n) % 1 + 1) % 1;
      const [px, py, ang] = LOOP.at(u);
      const a = Math.min(A.sm(u, 0.0, 0.03), 1 - A.sm(u, 0.965, 1)) * on;
      if (a <= 0) continue;
      const land = u > 0.68;
      S.jetTop(c, px, py, 1.15, { ang, a, flame: u < 0.14 ? 1 : 0 });
      void land;
    }
    c.restore();
    K.end(c);
  }
}
