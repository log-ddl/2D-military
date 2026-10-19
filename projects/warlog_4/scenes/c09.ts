// Chương 9 (328.9 – 357.6): bản rẻ hơn mất gì. NGANG, ba làn so sánh: máy phóng / ski-jump / cất cánh thẳng đứng.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const YD = [-300, 20, 330];                 // mặt boong của ba làn
const XB = [330, 90, -200];                 // mũi tàu từng làn
const LEN = [1240, 920, 560];               // độ dài sàn vẽ
const L1 = 330.6, L2 = 337.6, L3 = 347.8;   // giây phóng từng làn

// thông số tải: [bom, nhiên liệu, tầm]
const LOAD = [[3, 1.0, 1.0], [2, 0.7, 0.65], [1, 0.5, 0.4]] as const;

function laneShip(c: CanvasRenderingContext2D, xb: number, yd: number, len: number, a: number) {
  c.save(); c.globalAlpha *= a;
  A.poly(c, [[xb - len, yd], [xb, yd], [xb - 18, yd + 56], [xb - len + 40, yd + 56]], P.olive, P.ink, A.px(c, 3.5));
  A.rrect(c, xb - len, yd - 2, len, 12, 3, P.dark, P.ink, A.px(c, 2.5));
  A.poly(c, [[xb - len * 0.55, yd], [xb - len * 0.55 + 6, yd - 38], [xb - len * 0.55 + 60, yd - 38], [xb - len * 0.55 + 70, yd]], P.oliveDark, P.ink, A.px(c, 2.5));
  c.restore();
}

function payload(c: CanvasRenderingContext2D, x: number, y: number, bombs: number, fuel: number, a: number, ghost = 3) {
  c.save(); c.globalAlpha *= a;
  for (let i = 0; i < 3; i++) {
    const on = i < bombs;
    c.globalAlpha = a * (on ? 1 : (i < ghost ? 0.18 : 0));
    A.capsule(c, [x + i * 40, y + 8], [x + i * 40, y - 24], 9, P.enemyLight, P.ink, A.px(c, 2.5));
  }
  c.globalAlpha = a;
  A.rrect(c, x - 14, y + 26, 130, 18, 9, '#ffffff', P.ink, A.px(c, 3));
  A.rrect(c, x - 12, y + 28, 126 * fuel, 14, 7, P.amber, null, 0);
  c.restore();
}

export default class C09 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam: K.Cam = { x: 0, y: 40, z: 0.98 };
    K.begin(c, cam);
    // biển chung
    const v = K.view(cam, 40);
    c.fillStyle = P.bg; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const lane = [1, A.sm(t, 331.8, 332.6), A.sm(t, 333.6, 334.4)];
    for (let k = 0; k < 3; k++) {
      const yd = YD[k]!;
      // nền biển mỗi làn
      c.save(); c.globalAlpha *= lane[k]!;
      c.fillStyle = 'rgba(56,189,248,0.18)'; c.fillRect(-980, yd + 40, 1960, 140);
      A.line(c, [[-980, yd + 56], [980, yd + 56]], WATER, A.px(c, 3));
      c.restore();
      laneShip(c, XB[k]!, yd, LEN[k]!, lane[k]!);
    }
    // làn 2: dốc ski-jump cong ở mũi
    if (lane[1]! > 0) {
      c.save(); c.globalAlpha *= lane[1]!;
      const xb = XB[1]!, yd = YD[1]!;
      c.beginPath(); c.moveTo(xb - 200, yd); c.bezierCurveTo(xb - 80, yd, xb - 30, yd - 6, xb + 40, yd - 62);
      c.lineTo(xb + 40, yd - 40); c.bezierCurveTo(xb - 10, yd + 10, xb - 70, yd + 12, xb - 200, yd + 12); c.closePath();
      A.fs(c, P.dark, P.ink, A.px(c, 3));
      c.restore();
    }
    // làn 1: rãnh máy phóng
    if (lane[0]! > 0) A.line(c, [[XB[0]! - 560, YD[0]! + 14], [XB[0]! - 40, YD[0]! + 14]], P.amber, A.px(c, 4));
    // phản lực
    this.lane1(c, t); this.lane2(c, t); this.lane3(c, t);
    // mũi tên tầm bay (độ dài = tầm)
    const arrow = (k: number, frac: number) => {
      if (frac <= 0.01) return;
      const x0 = XB[k]! + 30, y = YD[k]! - 150;
      S.arrowW(c, [x0, y], [x0 + 640 * frac, y], 1, P.sky, 8, 30);
      A.line(c, [[x0, y - 12], [x0, y + 12]], P.sky, A.px(c, 5));
    };
    arrow(0, A.sm(t, 332.0, 333.4));
    arrow(1, A.sm(t, 339.2, 340.2) * (1 - 0.35 * A.sm(t, 343.4, 345.0)));
    arrow(2, A.sm(t, 349.8, 350.6) * (1 - 0.6 * A.sm(t, 351.8, 353.2)));
    K.end(c);

    // tải: bom + nhiên liệu cạnh từng làn (toạ độ màn hình)
    const base = (k: number) => 540 + (YD[k]! - 40) * 0.98;
    const fall1 = A.sm(t, 341.6, 343.2), fall2 = A.sm(t, 350.0, 352.0);
    payload(c, 90, base(0) - 60, 3, 1.0, lane[0]!);
    payload(c, 90, base(1) - 60, A.lerp(3, 2, fall1), A.lerp(1, 0.7, fall1), lane[1]!);
    payload(c, 90, base(2) - 60, A.lerp(3, 1, fall2), A.lerp(1, 0.5, fall2), lane[2]!);
    chain(c, t);
  }

  private lane1(c: CanvasRenderingContext2D, t: number) {
    const yd = YD[0]!, J = S.JET_H * 1.5;
    if (t < 328.9) return;
    const u = (t - L1) / 1.8;
    let x = XB[0]! - 560, y = yd - J, ang = 0, gear = 1;
    if (u > 0) { const d = Math.min(1, u); x = XB[0]! - 560 + 520 * d * d; }
    if (u > 1) { const k = u - 1; x = XB[0]! - 40 + 330 * k; y = yd - J - 70 * k - 18 * k * k; ang = -0.22; gear = 1 - A.sm(k, 0.3, 0.9); }
    if (x > 1000) return;
    S.jetSide(c, x, y, 1.5, { ang, gear, flame: u > 0 ? 0.9 : 0, hero: true, a: A.sm(t, 328.9, 329.4) });
  }

  private lane2(c: CanvasRenderingContext2D, t: number) {
    const yd = YD[1]!, J = S.JET_H * 1.5;
    if (t < 334.6) return;
    const xs = XB[1]! - 640;
    const u = (t - L2) / 2.6;
    let x = xs, y = yd - J, ang = 0, gear = 1;
    if (u > 0) { x = xs + 640 * A.clamp01(u) * A.clamp01(u) * 1.0; }
    if (u > 0.9) {
      const k = u - 0.9;
      // lên dốc: vòng cung bay vọt lên
      x = XB[1]! - 40 + 310 * k; y = yd - J - 40 * Math.min(1, k * 3) - 150 * k + 90 * k * k; ang = -0.35 * (1 - A.sm(k, 0.6, 1.1)); gear = 1 - A.sm(k, 0.3, 0.8);
    } else if (u > 0.55) {
      const q = (u - 0.55) / 0.35;
      y = yd - J - 20 * q * q; ang = -0.2 * q;
    }
    if (x > 1100) return;
    S.jetSide(c, x, y, 1.5, { ang, gear, flame: u > 0 ? 0.9 : 0, hero: true, a: A.sm(t, 334.6, 335.2) });
  }

  private lane3(c: CanvasRenderingContext2D, t: number) {
    const yd = YD[2]!, J = S.JET_H * 1.5;
    if (t < 336.0) return;
    const xs = XB[2]! - 180;
    const u = (t - L3) / 3.2;
    let x = xs, y = yd - J, ang = 0, gear = 1, noz = 0;
    if (u > 0) {
      noz = A.sm(u, 0, 0.1) * (1 - A.sm(u, 0.7, 0.9));
      const up = A.sm(u, 0.05, 0.6);
      y = yd - J - 140 * up;
      x = xs + (u > 0.55 ? 520 * ((u - 0.55) * (u - 0.55)) : 0);
      ang = -0.12 * A.sm(u, 0.6, 0.9);
      gear = 1 - A.sm(u, 0.35, 0.55);
    }
    if (x > 1100) return;
    // cột phụt xuống khi bốc lên
    if (u > 0.02 && u < 0.7) {
      for (let i = 0; i < 5; i++) A.line(c, [[x + 4 + i * 2, y + 24], [x + 4 + i * 2 + Math.sin(t * 30 + i) * 4, y + 60 + 30 * ((t * 3 + i * 0.3) % 1)]], 'rgba(245,158,11,0.8)', A.px(c, 5));
    }
    S.jetSide(c, x, y, 1.5, { kind: 'vtol', nozzle: noz, ang, gear, hero: true, a: A.sm(t, 336.0, 336.6) });
  }
}

const WATER = '#38bdf8';
