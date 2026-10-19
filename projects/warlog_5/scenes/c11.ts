// Chương 11 (406 – 471.8): cảm biến là não, pháo là cơ; cuộc đấu thật là cảm biến và tốc độ rời chỗ. Quay lại tổ pháo.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as M from './shared/map';
import { P } from './shared/palette';
import * as X from './_art';

export const T11 = { fireFinal: 467.0, landFinal: 470.6, duelFire: 441.0, duelLand: 445.3, misFire: 433.6, misBoom: 435.0 };
const TX = 2000;
const EL = 1.0;

function crown(c: CanvasRenderingContext2D, x: number, y: number, s = 1, a = 1) {
  A.withA(c, a, () => {
    c.save(); c.translate(x, y); c.scale(s, s);
    A.poly(c, [[-50, 0], [-60, -60], [-25, -30], [0, -76], [25, -30], [60, -60], [50, 0]], '#f5c542', P.ink, 5);
    A.circle(c, 0, -76, 8, P.enemy, P.ink, 3);
    c.restore();
  });
}
function radio(c: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  X.soldier(c, x, y, 1.1 * s, 1, 'ally', 0.2);
  A.rrect(c, x - 34 * s, y - 80 * s, 24 * s, 40 * s, 4, P.dark, P.ink, 3);
  A.line(c, [[x - 22 * s, y - 80 * s], [x - 22 * s, y - 130 * s]], P.dark, 4);
}
function brain(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  A.circle(c, -30, -10, 52, '#f7b7c4', P.ink, 5); A.circle(c, 30, -10, 52, '#f7b7c4', P.ink, 5); A.circle(c, 0, 30, 46, '#f7b7c4', P.ink, 5);
  A.line(c, [[0, -60], [0, 20]], P.ink, 4);
  c.beginPath(); c.moveTo(-60, -10); c.quadraticCurveTo(-30, -30, -10, 0); c.strokeStyle = P.ink; c.lineWidth = 4; c.stroke();
  c.beginPath(); c.moveTo(60, -10); c.quadraticCurveTo(30, 10, 10, -20); c.stroke();
  c.restore();
}

export default class S11 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 414.7) this.king(c, t);
    else if (t < 421.6) this.sharp(c, t);
    else if (t < 429.5) this.brainMuscle(c, t);
    else if (t < 436.5) this.mis(c, t);
    else if (t < 453.8) this.duel(c, t);
    else this.ending(c, t);
    for (const at of [414.7, 421.6, 429.5, 436.5, 453.8]) X.dip(c, t, at, 0.1);
  }

  // 406.4–414.7: vua chiến trường — ẩn và di chuyển; thành viên quan trọng nhất ở xa pháo
  private king(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 700, y: -250, z: 0.85 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const away = A.ei(t, 410.0, 411.0);
    const gx = 0 + away * (-0);
    // pháo + lưới nguỵ trang rồi chuyển chỗ
    const netK = A.sm(t, 407.8, 408.8) * (1 - A.sm(t, 409.4, 409.9));
    const mv = A.eio(t, 409.8, 411.2);
    X.spGun(c, { x: gx - 20 * mv, elev: 0.5, track: mv * 40 });
    if (netK > 0) X.net(c, 20, 520, 230, netK);
    // vương miện trên pháo → sang người quan sát
    const cp = A.eio(t, 413.0, 414.5);
    const cx = A.lerp(30, 1450, cp), cy = A.lerp(-300, -270, cp) - 30 * Math.sin(cp * Math.PI);
    crown(c, cx, cy, 1.0, A.sm(t, 406.5, 407.0));
    // quan sát viên ở xa
    const o = A.back(t, 411.3, 412.0);
    if (o > 0) radio(c, 1450, 0, Math.min(1, o));
    // khoảng cách giữa pháo và quan sát viên
    const dd = A.sm(t, 412.0, 413.0);
    if (dd > 0) A.line(c, [[200, 70], [200 + 1150 * dd, 70]], P.ink, A.px(c, 5), [14, 10]);
    K.end(c);
  }

  // 414.7–421.6: quan sát viên, người điều drone, tổ radar — mũi nhọn
  private sharp(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: -200, z: 0.95 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const a = A.back(t, 415.0, 415.6), b = A.back(t, 416.8, 417.4), r = A.back(t, 418.2, 418.8);
    if (a > 0) radio(c, -640, 0, Math.min(1, a) * 1.1);
    if (b > 0) {
      const k = Math.min(1, b);
      A.rrect(c, -150, 0, 240, 90, 6, '#b8a97a', P.ink, 3);
      A.rrect(c, -130, -24, 200, 40, 4, '#e6dcc0', P.ink, 3);
      X.soldier(c, -30, 10, 0.9 * k, 1, 'ally', 0.1);
      c.save(); c.translate(0, 0); X.drone(c, 100 + 30 * Math.sin(t * 2), -270 + 10 * Math.sin(t * 3), 1.4 * k, t, 0.1); c.restore();
      A.rrect(c, 20, -86, 40, 22, 4, P.dark, P.ink, 3);
    }
    if (r > 0) X.radar(c, { x: 640, s: 0.8 * Math.min(1, r), spin: t * 2.5 });
    K.end(c);
    // mũi nhọn: một mũi tên lớn từ cả ba về phía mục tiêu
    const sp = A.sm(t, 420.0, 421.2);
    if (sp > 0) {
      U.arrow(c, [-560, 840], [1500, 840], { p: sp, color: P.sky, w: 28, head: 110 });
    }
  }

  // 421.7–429.5: pháo là cơ, mọi thứ chỉ chỗ là não; tiền dồn vào thứ không bắn
  private brainMuscle(c: CanvasRenderingContext2D, t: number) {
    const a = A.back(t, 421.8, 422.4), b = A.back(t, 423.0, 423.6);
    c.save(); c.translate(500, 480);
    if (a > 0) { c.scale(Math.min(1, a), Math.min(1, a)); X.spGun(c, { x: -150, y: 150, s: 0.9, elev: 0.3 }); X.weightIcon(c, 0, -240, 1.4); }
    c.restore();
    if (b > 0) {
      brain(c, 1380, 440, 1.8 * Math.min(1, b));
      // cảm biến quanh não
      const kinds = ['radar', 'fdc'] as const;
      A.withA(c, A.sm(t, 424.0, 424.6), () => {
        X.eye(c, 1180, 700, 50, 0); X.radar(c, { x: 1380, y: 760, s: 0.5, spin: t * 2 }); X.drone(c, 1600, 700, 1.4, t, 0.1);
        void kinds;
      });
    }
    // tiền
    const m = A.sm(t, 425.5, 428.8);
    if (m > 0) {
      for (let i = 0; i < 2; i++) X.coin(c, 330 + i * 80, 930, 0.8);
      const n = Math.round(10 * m);
      for (let i = 0; i < n; i++) X.coin(c, 1130 + (i % 5) * 90, 960 - Math.floor(i / 5) * 76, 0.9);
    }
  }

  // 429.5–436.5: tưởng pháo đấu pháo, cái to hơn thắng
  private mis(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: -240, z: 0.85 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const a = A.back(t, 429.7, 430.3);
    if (a > 0) {
      const big = X.spGun(c, { x: -700, s: 1.1 * Math.min(1, a), elev: 0.3, len: 1.4, recoil: A.bump(t, T11.misFire, 0.8) * 0.8 });
      const small = X.spGun(c, { x: 750, s: 0.6 * Math.min(1, a), dir: -1, elev: 0.3, tint: P.enemy });
      if (t >= T11.misFire) {
        F.muzzleFlash(c, big.x, big.y, big.ang, A.ph(t, T11.misFire, T11.misFire + 0.3), 1.5);
        const s0: A.Pt = [big.x, big.y], s1: A.Pt = [small.x - 40, -80];
        X.flight(c, s0, s1, 70, A.ph(t, T11.misFire + 0.05, T11.misBoom), { s: 1.0, w: A.px(c, 5) });
        if (t >= T11.misBoom) F.explosion(c, 750, -90, 150, A.ph(t, T11.misBoom, T11.misBoom + 0.7), 4);
      }
    }
    K.end(c);
    // hiện X: "sai" sau 436
    const xk = A.sm(t, 436.0, 436.5);
    if (xk > 0) U.xMark(c, 960, 480, 220, xk, P.enemy, 28);
  }

  // 436.5–453.8: bản đồ tay đôi — ai tìm thấy trước và rời đi trước
  private duel(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 1000, y: 430, z: 0.82 };
    K.begin(c, cam);
    M.mapBg(c, cam, { color: '#ece6cf' });
    M.forest(c, 900, 160, 100, 2); M.forest(c, 1100, 720, 100, 5);
    const GA: A.Pt = [350, 420], GB: A.Pt = [1700, 420], RA: A.Pt = [500, 650], RB: A.Pt = [1550, 190];
    // rời đi
    const leave = A.eio(t, 450.4, 453.0);
    const gaPos: A.Pt = [GA[0], GA[1] + (t > 450.4 ? 210 * leave : 0)];
    // pháo ta (trái) và pháo địch (phải)
    if (t < 450.4 || true) X.top(c, 'sp', gaPos[0], gaPos[1], 0, 2.2, 'ally');
    X.top(c, 'sp', GB[0], GB[1], Math.PI, 2.2, 'foe');
    X.top(c, 'radar', RA[0], RA[1], 0, 1.8, 'ally');
    X.top(c, 'radar', RB[0], RB[1], Math.PI, 1.8, 'foe');
    // 440.4–: bên ta bắn → radar địch thấy → địch trả lời
    const sh = (a: A.Pt, b: A.Pt, t0: number, t1: number, col: string) => {
      const p = A.ph(t, t0, t1);
      if (p <= 0) return;
      A.line(c, [a, [A.lerp(a[0], b[0], p), A.lerp(a[1], b[1], p)]], col, A.px(c, 5), [14, 10]);
      if (p < 1) A.circle(c, A.lerp(a[0], b[0], p), A.lerp(a[1], b[1], p), 10, col, P.ink, 2);
    };
    if (t >= T11.duelFire) {
      F.muzzleFlash(c, GA[0] + 230, GA[1], 0, A.ph(t, T11.duelFire, T11.duelFire + 0.3), 1.0);
      sh(GA, [GB[0] - 120, GB[1]], T11.duelFire, T11.duelFire + 4.0, P.amber);
    }
    // radar địch phát hiện: quạt + dò ngược
    const fan = A.win(t, 441.8, 446.0, 0.3, 0.4);
    if (fan > 0) A.withA(c, fan, () => M.fan(c, RB[0], RB[1], 1400, Math.PI * 0.82, Math.PI * 1.1, 1, P.sky));
    const back = A.sm(t, 443.0, 444.2);
    if (back > 0) A.withA(c, back * (1 - A.sm(t, 448, 449)), () => { A.line(c, [[GB[0] - 160, GB[1]], [A.lerp(GB[0] - 160, GA[0] + 100, back), GA[1]]], P.enemy, A.px(c, 6), [12, 10]); });
    // pháo địch trả lời (từ 444.6) nhưng ta đã đi
    const rf = 444.6, rl = 452.6;
    if (t >= rf) {
      F.muzzleFlash(c, GB[0] - 230, GB[1], Math.PI, A.ph(t, rf, rf + 0.3), 1.0);
      sh(GB, GA, rf, rl, P.enemy);
    }
    const mark = A.sm(t, 444.2, 444.9);
    if (mark > 0 && t < 453) U.crosshair(c, GA[0], GA[1], 80, P.enemy, mark, t * 0.6);
    if (t >= rl) F.explosion(c, GA[0], GA[1], 130, A.ph(t, rl, rl + 0.8), 4);
    K.end(c);
    // bóp méo tay "quy tắc sách": cuốn sổ gạch chéo
    const bk = A.win(t, 444.9, 447.5, 0.2, 0.3);
    if (bk > 0) A.withA(c, bk, () => {
      A.rrect(c, 800, 700, 320, 230, 16, '#fffdf2', P.ink, 6);
      for (let i = 0; i < 4; i++) A.line(c, [[840, 750 + i * 40], [1080, 750 + i * 40]], '#cbd5e1', 5);
      A.line(c, [[800, 930], [1120, 700]], P.enemy, 12);
    });
    // cỡ nòng bị mờ đi: 155
    const cal = A.win(t, 447.6, 451.8, 0.3, 0.5);
    if (cal > 0) A.withA(c, cal * 0.7, () => X.bigNum(c, '155', 960, 160, 1, 120, P.ink2));
    // đồng hồ bay của đạn
    const sw = A.win(t, 440.6, 446.0, 0.3, 0.4);
    if (sw > 0) A.withA(c, sw, () => X.stopwatch(c, 1740, 170, 90, A.ph(t, T11.duelFire, rl) * 0.9, P.enemy));
  }

  // 453.9–471.8: quay lại tổ pháo không thấy mục tiêu
  private ending(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 1000, y: -380, z: 0.7 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    X.ridge(c, 1000, 800, 250);
    X.trench(c, TX, 1.0, 3);
    const away = A.ei(t, 467.6, 469.6);
    const gx = -900 * away;
    const rc = A.bump(t, T11.fireFinal, 0.9) * 0.9;
    const m = X.spGun(c, { x: gx, elev: EL, recoil: rc, track: gx * 0.4 });
    X.soldier(c, -150 + gx, 0, 1.0, 1, 'ally');
    const a = X.spMuzzleP(EL), b: A.Pt = [TX, -30];
    if (t >= T11.fireFinal) {
      F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, T11.fireFinal, T11.fireFinal + 0.3), 1.6);
      if (t < T11.fireFinal + 2) F.smoke(c, m.x, m.y, t - T11.fireFinal, 1.2, 5, '#6b7280', 30);
    }
    const h = X.arcH(a, b, EL);
    // đạn bay trọn vòng cung
    X.flight(c, a, b, h, A.ph(t, T11.fireFinal + 0.05, T11.landFinal - 0.1), { s: 0.95, w: A.px(c, 5) });
    if (t >= T11.landFinal - 0.1) F.explosion(c, TX, -30, 150, A.ph(t, T11.landFinal - 0.1, T11.landFinal + 0.7), 4);
    if (t >= 467.6 && t < 469.8) F.dust(c, gx + 160, 0, (t * 2.2) % 1, 1.4);
    // địch trả lời: rơi vào hố bắn đã trống
    if (t >= 468.3) {
      const ea: A.Pt = [TX + 60, -50], eb: A.Pt = [80, -8];
      F.muzzleFlash(c, ea[0], ea[1], Math.PI + 0.6, A.ph(t, 468.3, 468.6), 1.2);
      X.flight(c, ea, eb, 720, A.ph(t, 468.35, 471.35), { s: 0.95, trail: P.enemy, w: A.px(c, 5) });
      if (t >= 471.35) F.explosion(c, eb[0], -20, 130, A.ph(t, 471.35, 472.1), 4);
    }
    // hố bắn đã trống: dấu vết xích
    K.end(c);
    // chuỗi: nòng dài, cung dốc, radar, quan sát viên, máy tính — sáng dần
    const items = [456.9, 458.0, 459.0, 460.9, 462.5];
    const ys = 110;
    items.forEach((t0, i) => {
      const k = A.back(t, t0, t0 + 0.45);
      if (k <= 0) return;
      const x = 360 + i * 300;
      c.save(); c.translate(x, ys); c.scale(Math.min(1, k), Math.min(1, k));
      A.circle(c, 0, 0, 62, '#fffdf2', P.amber, 6);
      if (i === 0) A.rrect(c, -40, -8, 80, 16, 8, P.dark, P.ink, 3);
      if (i === 1) { c.beginPath(); c.moveTo(-36, 24); c.quadraticCurveTo(0, -48, 36, 24); c.strokeStyle = P.amber; c.lineWidth = 7; c.stroke(); }
      if (i === 2) X.top(c, 'radar', -4, 0, 0, 0.7, 'ally');
      if (i === 3) { X.soldier(c, 0, 36, 0.65, 1, 'ally', 0.2); }
      if (i === 4) { A.rrect(c, -28, -26, 56, 52, 6, P.dark, P.ink, 3); A.rrect(c, -20, -18, 40, 14, 2, P.sky, null, 0); }
      c.restore();
    });
    // khoảng cách giữa pháo và mục tiêu: thanh nối, đóng lại
    const gp = A.sm(t, 463.9, 465.8);
    if (gp > 0) {
      const s0 = K.toScreen(cam, 0, -30), s1 = K.toScreen(cam, TX, -30);
      A.line(c, [[s0[0], 300], [A.lerp(s0[0], s1[0], gp), 300]], P.amber, 10);
      U.arrow(c, [s0[0], 300], [A.lerp(s0[0], s1[0], gp), 300], { color: P.amber, w: 10, head: 36 });
    }
    // một phút đạn bay
    const sw = A.win(t, 466.6, 471.5, 0.3, 0.3);
    if (sw > 0) A.withA(c, sw, () => X.stopwatch(c, 1740, 330, 90, A.ph(t, T11.fireFinal, T11.landFinal) * 0.95, P.enemy));
  }
}
