// Chương 7 (224.5 – 289.8): hai tầng làm việc. NGANG mặt cắt (hầm + thang máy) → TRÊN (áo màu) → NGANG (muối, mòn, thời tiết).
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const T_TOP = 243.6, T_SEA = 257.8, T_WIDE = 273.4;
const HS = 0.6;                         // cỡ phản lực trong hầm
const HJ = S.JET_H * HS;
const HX: number[] = [-350, -285, -220, -60, 10, 80, 150, 320];
const JERSEY = { fuel: '#a855f7', weapon: '#ef4444', cat: '#22c55e', wire: '#facc15' };

function wrench(c: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  A.line(c, [[-12, 0], [12, 0]], P.ink, A.px(c, 4));
  A.circle(c, 14, 0, 6, null, P.ink, A.px(c, 3.5));
  A.circle(c, -14, 0, 4, P.ink, null, 0);
  c.restore();
}

export default class C07 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < T_TOP) this.floors(c, t);
    else if (t < T_SEA) this.jerseys(c, t);
    else this.sea(c, t);
    S.cutDip(c, t, T_TOP, 0.14); S.cutDip(c, t, T_SEA, 0.14);
    chain(c, t);
  }

  // ───── NGANG mặt cắt: hầm dưới, boong trên, thang máy ở mạn tàu
  private floors(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = K.track(t, [
      [224.5, { x: 190, y: 40, z: 1.9 }], [227.0, { x: 60, y: 20, z: 1.5 }], [243.6, { x: 0, y: 15, z: 1.45 }],
    ], A.eio);
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 30 });
    // thang máy mũi (x=250): từ hầm lên sàn lúc 225.6–229, rồi hạ xuống; thang đuôi (x=-150): hạ rồi lên
    const e2 = t < 225.6 ? 1 : t < 229 ? 1 - A.eio(t, 225.6, 229) : t < 231.6 ? 0 : 1 - (1 - A.eio(t, 231.6, 234.4));
    const e1 = t < 229.5 ? 0 : t < 232.5 ? A.eio(t, 229.5, 232.5) : t < 235.6 ? 1 : 1 - A.eio(t, 235.6, 238.6);
    S.carrierSide(c, t, { x: 0, y: 0, cut: 1, hangar: 1, elev: [e1, e2], noIsland: true });
    // băng tầng: dưới = xanh, trên = hổ phách (từ 234.7)
    const bp = A.sm(t, 234.7, 235.7) * (1 - A.sm(t, 242.6, 243.4));
    if (bp > 0) {
      c.save(); c.globalAlpha *= bp * 0.28;
      c.fillStyle = '#3b82f6'; c.fillRect(-472, 12, 972, 54);
      c.fillStyle = P.amber; c.fillRect(-472, -70, 972, 70);
      c.restore();
    }
    // máy bay trong hầm
    HX.forEach((x, i) => S.jetSide(c, x, 64 - HJ - 2, HS, { gear: 1, a: 1, hero: i === 3 }));
    // máy bay trên thang mũi / thang đuôi
    const y2 = A.lerp(2, 54, e2) - HJ;
    if (t < 232.2) S.jetSide(c, 250, y2, HS * 1.0, { gear: 1 });
    if (t > 229 && t < 232.0) {
      // chiếc đó lăn tiếp ra mũi
      const u = A.sm(t, 229.4, 231.8);
      S.jetSide(c, A.lerp(250, 380, u), -HJ, HS, { gear: 1, a: 1 - 0 });
    }
    if (t >= 232.0) S.jetSide(c, 380, -HJ, HS, { gear: 1 });
    const y1 = A.lerp(2, 54, e1) - HJ;
    if (t > 229.5 && t < 238.8) S.jetSide(c, -150, y1, HS, { gear: 1, hero: true });
    // người: hầm = thợ máy; boong = tổ trưởng chuyển máy bay
    const mp = A.sm(t, 236.4, 237.2);
    if (mp > 0) {
      for (const [x, k] of [[-300, 0], [-120, 1], [30, 2], [190, 0]] as const) {
        S.person(c, x, 63, 34, k === 1 ? '#a855f7' : k === 2 ? '#ef4444' : P.sky, mp);
      }
      c.save(); c.globalAlpha *= mp;
      wrench(c, -272, 40, 1.3, Math.sin(t * 5) * 0.6);
      // vòi nhiên liệu: giọt rơi
      for (let i = 0; i < 3; i++) A.circle(c, -96 + i * 3, 36 + ((t * 40 + i * 9) % 18), 2.8, P.amber, null, 0);
      // bom
      A.capsule(c, [48, 38], [70, 38], 7, P.enemyLight, P.ink, A.px(c, 2.2));
      c.restore();
    }
    const dp = A.sm(t, 240.4, 241.2);
    if (dp > 0) {
      for (const x of [-60, 70, 230]) S.person(c, x, -4, 36, P.oliveLight, dp);
    }
    S.carrierIsland(c, t, { x: 0, y: 0 });
    K.end(c);
  }

  // ───── TRÊN: áo màu theo việc
  private jerseys(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(t, [[T_TOP, { x: 15, y: 0, z: 1.55 }], [246.6, { x: 70, y: -10, z: 2.0 }], [T_SEA, { x: 70, y: -10, z: 2.0 }]], A.eio);
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 60);
    S.carrierTop(c, t, { x: 0, y: 0, angled: 1 });
    // máy bay đậu hai bên đường phóng
    const parkY = [-1, -1, 1, 1, -1, 1];
    [250, 320, 280, 370, 430, 440].forEach((x, i) => S.jetTop(c, x, parkY[i]! * 44, 0.8, { fold: 1 }));
    // nhóm người: màu áo theo việc
    const appear = (a: number) => A.back(t, a, a + 0.5);
    const grp: { x: number; y: number; col: string; a: number }[] = [
      { x: 290, y: -18, col: JERSEY.fuel, a: 247.6 },
      { x: 320, y: -18, col: JERSEY.fuel, a: 247.8 },
      { x: 348, y: 20, col: JERSEY.weapon, a: 250.0 },
      { x: 378, y: 22, col: JERSEY.weapon, a: 250.2 },
      { x: 220, y: 0, col: JERSEY.cat, a: 251.4 },
      { x: 242, y: 0, col: JERSEY.cat, a: 251.6 },
      { x: -300, y: 42, col: JERSEY.wire, a: 252.8 },
      { x: -262, y: 30, col: JERSEY.wire, a: 253.0 },
    ];
    grp.forEach((g, i) => {
      const p = appear(g.a);
      if (p <= 0) return;
      S.personTop(c, g.x + Math.sin(t * 1.5 + i) * 3, g.y + Math.cos(t * 1.2 + i) * 2, 10.5 * Math.min(1, p), g.col);
    });
    // chùm nhấn quanh nhóm đang được nói
    const spot = (x: number, y: number, a: number, b: number, col: string) => {
      const p = A.win(t, a, b, 0.3, 0.3);
      if (p > 0) A.circle(c, x, y, 30 + 6 * Math.sin(t * 4), null, col, A.px(c, 4 * p));
    };
    spot(305, -18, 247.4, 249.4, JERSEY.fuel);
    spot(363, 21, 249.8, 251.2, JERSEY.weapon);
    spot(231, 0, 251.2, 252.6, JERSEY.cat);
    spot(-281, 36, 252.6, 254.4, JERSEY.wire);
    // đường tầm nhìn 100 m
    const lp = A.sm(t, 249.4, 250.4) * (1 - A.sm(t, 254.0, 254.4));
    if (lp > 0) A.line(c, [[-330, 120], [-330 + 640 * lp, 120]], P.ink2, A.px(c, 3), [10, 8]);
    K.end(c);
    const [lx, ly] = K.toScreen(cam, -10, 120);
    S.tag(c, '100 m', lx, ly - 40, A.win(t, 249.6, 254.0, 0.25, 0.3), { size: 40 });
  }

  // ───── NGANG: muối, mòn, thời tiết, và thứ tàu mang lên boong
  private sea(c: CanvasRenderingContext2D, t: number) {
    const closeA = t < 267.2, wide = t >= T_WIDE;
    const cam = K.track(t, [
      [T_SEA, { x: 380, y: -40, z: 2.9 }], [267.0, { x: 380, y: -40, z: 2.9 }],
      [268.8, { x: -300, y: -10, z: 3.2 }], [273.0, { x: -300, y: -10, z: 3.2 }],
      [276.4, { x: 220, y: -80, z: 0.85 }], [284.0, { x: 220, y: -80, z: 0.85 }],
      [287.4, { x: 10, y: -30, z: 1.45 }], [289.8, { x: 10, y: -30, z: 1.45 }],
    ], A.eio);
    const rough = A.sm(t, 275.0, 277.6) * (1 - A.sm(t, 284.2, 285.4));
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 50, wave: 4 + 14 * rough });
    const pit = S.swell(t, 0.05 * rough, 3.4);
    c.save(); c.rotate(pit);
    S.carrierSide(c, t, { x: 0, y: 0, noIsland: true });
    // vật đậu trên boong
    if (t < 267.2) S.jetSide(c, 380, -S.JET_H * 1.2, 1.2, { gear: 1, hero: true });
    c.restore();
    // sóng tạt qua mũi (T_SEA → 267)
    if (closeA) {
      for (let i = 0; i < 16; i++) {
        const ph = ((t * 0.8 + i * 0.113) % 1);
        const x = 500 + ph * 90 - 60 * (i % 4) * 0.2, y = -10 - Math.sin(ph * Math.PI) * (50 + (i % 5) * 18);
        A.circle(c, x, y + 30, 3.2, 'rgba(255,255,255,0.95)', P.sky, A.px(c, 1.5));
      }
    }
    // tinh thể muối bám vào khớp
    const sp = A.sm(t, 260.0, 262.0);
    if (sp > 0 && closeA) {
      for (let i = 0; i < 9; i++) {
        const r = A.rnd(i + 9);
        A.rrect(c, 376 + (r - 0.5) * 40, -38 + A.rnd(i + 4) * 20, 4, 4, 1, '#ffffff', P.ink2, A.px(c, 1));
      }
    }
    // mòn boong: vệt xước chồng lên rồi tấm vá
    if (t >= 267.2 && t < T_WIDE) {
      const scr = A.sm(t, 268.4, 272.0);
      for (let i = 0; i < 14; i++) {
        const x = -420 + A.rnd(i + 31) * 360;
        if (i / 14 > scr) continue;
        A.line(c, [[x, 4 + A.rnd(i) * 4], [x + 10 + A.rnd(i + 8) * 18, 6 + A.rnd(i + 5) * 4]], '#e2e8f0', A.px(c, 2));
      }
      const pp = A.sm(t, 272.8, 273.4);
      if (pp > 0) A.rrect(c, -330, -2, 90, 13, 2, P.olive, P.ink, A.px(c, 2));
      // phản lực lăn trên boong
      const wx = A.lerp(-420, 40, (t - 267.2) / 6.2);
      S.jetSide(c, wx, -S.JET_H * 1.2, 1.2, { gear: 1, hero: true });
    }
    // thời tiết: phản lực hạ cánh bị huỷ rồi rẽ đi
    if (wide) {
      const tt = t - 276.8;
      if (tt > 0 && tt < 8) {
        let x: number, y: number, ang: number, flame = 0;
        const slope = 0.1;
        if (tt < 2.8) { x = -1000 + tt * 250; y = -24 - (-212 - x) * slope; ang = -0.1; }
        else {
          const k = tt - 2.8;
          x = -300 + 300 * k + 80 * k * k; y = -32.8 - 90 * k - 30 * k * k; ang = -0.3; flame = 0.9;
        }
        S.jetSide(c, x, y, 1.2, { ang, gear: tt < 3.8 ? 1 : 0, hook: tt < 3.8 ? 1 : 0, flame, hero: true });
      }
      // hai chỗ đi: bãi bay dự bị bên phải, và máy bay tiếp dầu
      const dp = A.sm(t, 281.4, 283.0);
      if (dp > 0) {
        c.save(); c.globalAlpha *= dp;
        A.rrect(c, 1000, 90, 360, 12, 3, '#94a3b8', P.ink, A.px(c, 3));
        A.line(c, [[1010, 96], [1350, 96]], '#ffffff', A.px(c, 2), [20, 14]);
        S.jetSide(c, 760, -250, 0.9, { kind: 'tanker', a: 1 });
        c.restore();
      }
    }
    if (t > 284.6) {
      const kinds: S.Kind[] = ['jet', 'radar', 'heli', 'tanker', 'ew'];
      kinds.forEach((k, i) => {
        const p = A.back(t, 284.8 + i * 0.7, 285.4 + i * 0.7);
        if (p <= 0) return;
        S.jetSide(c, -330 + i * 200, -S.JET_H * 1.1 * (k === 'heli' ? 0.8 : 1) * Math.min(1, p) - 0, 1.1, { kind: k, gear: 1, hero: k === 'jet', rotor: t * 8, a: Math.min(1, p) });
      });
    }
    S.carrierIsland(c, t, { x: 0, y: 0, pitch: pit });
    K.end(c);

    // rửa / kiểm / sửa (261.6–267.2) – biểu tượng cạnh chiếc máy bay
    const ip = A.win(t, 261.8, 267.0, 0.4, 0.4);
    if (ip > 0) {
      c.save(); c.globalAlpha *= ip;
      const bx = 520, by = 330;
      // rửa
      for (let i = 0; i < 6; i++) A.line(c, [[bx - 140 + i * 8, by - 60], [bx - 120 + i * 8, by - 20 + ((t * 80 + i * 17) % 40)]], WIND, 4);
      A.circle(c, bx, by, 38, '#ffffff', P.ink, 4);
      wrench(c, bx, by, 1.2, Math.sin(t * 4) * 0.5);
      A.circle(c, bx + 140, by, 38, '#ffffff', P.ink, 4);
      A.circle(c, bx + 140, by - 4, 12, null, P.ink, 4); A.line(c, [[bx + 149, by + 5], [bx + 162, by + 18]], P.ink, 5);
      // so với trên bờ: hai thanh
      A.rrect(c, bx - 140, by + 80, 440, 28, 14, '#ffffff', P.ink, 3);
      A.rrect(c, bx - 138, by + 82, 436, 24, 12, P.amber, null, 0);
      A.rrect(c, bx - 140, by + 124, 440, 28, 14, '#ffffff', P.ink, 3);
      A.rrect(c, bx - 138, by + 126, 150, 24, 12, P.sand, null, 0);
      c.restore();
    }
  }
}

const WIND = '#7dd3fc';
