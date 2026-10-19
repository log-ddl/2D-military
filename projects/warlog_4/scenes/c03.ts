// Chương 3 (87.4 – 134.4): dừng lại. TRÊN (4 dây) → NGANG mặt cắt (dây + giảm chấn) → NGANG đường lượn, đèn, LSO, đêm.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const SJ = 1.2, JY = S.JET_H * SJ;
const WX = S.WIRES_X[2]!;                        // dây 3 (NGANG)
const T_TOP2 = 92.6, T_SIDE = 97.4, T_APP = 108.3, T_NIGHT = 124.5;
const CATCH_B = 100.6;                           // móc ăn dây trong cảnh mặt cắt
const TD_N = 133.3;                              // chạm sàn lúc đêm

// TOP: toạ độ dọc sàn thẳng (k = 0)
const topWireX = (i: number) => -450 + 830 * (0.18 + i * 0.045);

export default class C03 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < T_SIDE) this.top(c, t);
    else if (t < T_APP) this.cut(c, t);
    else this.approach(c, t);
    S.cutDip(c, t, T_TOP2, 0.12); S.cutDip(c, t, T_SIDE, 0.12); S.cutDip(c, t, T_APP, 0.12);
    chain(c, t);
  }

  // ───── TRÊN: không có dây → trôi hết sàn; rồi 4 dây, nhắm dây thứ ba
  private top(c: CanvasRenderingContext2D, t: number) {
    const second = t >= T_TOP2;
    const cam = second
      ? K.track(t, [[T_TOP2, { x: 15, y: 0, z: 1.55 }], [94.6, { x: -220, y: 0, z: 3.0 }], [T_SIDE, { x: -190, y: 0, z: 3.0 }]], A.eio)
      : { x: 15, y: 0, z: 1.55 };
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 70);
    const nW = second ? Math.min(4, Math.floor((t - 93.0) / 0.4) + 1) : 0;
    S.carrierTop(c, t, { x: 0, y: 0, angled: 0, wires: Math.max(0, nW), hl: 'wire' });
    if (!second) {
      // chạm sàn, không có gì giữ → trôi hết sàn
      const x = t < 88.4 ? -430 + 215 * (t - 88.4) : -430 + 215 * (t - 88.4);
      const dp = A.sm(t, 90.2, 92.2);
      S.dashPath(c, [[-430, 0], [500, 0], [700, 0], [900, 0]], dp, P.amber, 6, [20, 14]);
      if (t > 91.0) {
        const ep = A.sm(t, 91.0, 91.8);
        A.line(c, [[500, -70], [500, 70]], P.enemy, A.px(c, 8 * ep));
      }
      S.jetTop(c, x, 0, 1.0, { hero: true, flame: t > 88.6 ? 0.8 : 0 });
    } else {
      // nhắm dây ba
      const rp = A.sm(t, 94.6, 95.2) * (1 - A.sm(t, 96.3, 96.6));
      if (rp > 0) A.circle(c, topWireX(2), 0, 34 * (1.3 - 0.3 * rp), null, P.amber, A.px(c, 6 * rp));
      const TD = 96.1, CA = TD + 0.09;
      let x: number;
      if (t < CA) x = -185 + 215 * (t - TD);
      else x = -166 + 180 * (1 - Math.pow(1 - A.clamp01((t - CA) / 2.0), 2));
      // chữ V của dây bị kéo
      if (t >= CA) {
        const hx = x - 60, wx = topWireX(2);
        A.line(c, [[wx, -21], [hx, 0], [wx, 21]], P.amber, A.px(c, 6));
      }
      S.jetTop(c, x, 0, 1.0, { hero: true, flame: 0.7 });
    }
    K.end(c);
  }

  // ───── NGANG mặt cắt: dây + giảm chấn thuỷ lực dưới sàn
  private cut(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: -170, y: 52, z: 2.35 };
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 60 });
    S.carrierSide(c, t, { x: 0, y: 0, cut: 1, noIsland: true });
    // vị trí phản lực
    let xj: number, yj = -JY;
    if (t < CATCH_B) {
      xj = -199 - 150 * (CATCH_B - t);
      yj = -JY - 22 * (1 - A.sm(t, 98.3, 99.9));
    } else {
      const u = A.clamp01((t - CATCH_B) / 2.8);
      xj = -199 + 180 * (1 - (1 - u) * (1 - u));
    }
    const u = A.clamp01((t - CATCH_B) / 2.8), ue = 1 - (1 - u) * (1 - u);
    const hx = xj - 66 * SJ;
    const caught = t >= CATCH_B;
    // 4 dây
    S.WIRES_X.forEach((wx, i) => {
      const hit = i === 2 && caught;
      if (hit) S.wireSide(c, wx, Math.max(2, hx - wx), P.amber, 0);
      else S.wireSide(c, wx, 0, i === 2 && t > 98.0 ? P.amber : '#e2e8f0');
    });
    // sơ đồ giảm chấn dưới sàn (mặt cắt minh hoạ)
    const rodL = 196, travel = 150;
    const tip = WX - travel + travel * ue;            // đầu thanh: tiến về phía ròng rọc
    const pxp = tip + rodL;
    const glow = A.clamp01(ue * 1.2);
    // khung "dưới sàn"
    A.rrect(c, -245, 56, 285, 30, 4, '#ffffff', P.ink, A.px(c, 3.5));
    // buồng dầu bị nén
    c.save(); c.beginPath(); c.rect(pxp + 4, 58, 40 - pxp - 4, 26); c.clip();
    c.fillStyle = A.lerpColor('#fde68a', '#f97316', glow); c.fillRect(pxp, 56, 300, 30); c.restore();
    // thanh piston + piston
    A.line(c, [[tip, 71], [pxp, 71]], P.dark, A.px(c, 7));
    A.rrect(c, pxp - 6, 58, 12, 26, 3, P.slate, P.ink, A.px(c, 3));
    // lỗ tiết lưu bên phải
    A.line(c, [[40, 62], [40, 80]], P.ink, A.px(c, 5));
    if (t > CATCH_B + 0.2 && t < CATCH_B + 3.2) for (let i = 0; i < 3; i++) A.line(c, [[44, 71 + (i - 1) * 5], [58 + 6 * Math.sin(t * 20 + i), 71 + (i - 1) * 10]], '#f97316', A.px(c, 3));
    // dây cáp: từ dây trên sàn đi xuống qua ròng rọc, vòng ra đầu thanh
    A.line(c, [[WX, 0], [WX, 71], [tip, 71]], caught ? P.amber : P.ink2, A.px(c, 4));
    A.circle(c, WX, 71, 8, '#ffffff', P.ink, A.px(c, 3));
    A.circle(c, WX, 6, 7, '#ffffff', P.ink, A.px(c, 3));
    // hơi nóng sau khi hấp thụ năng lượng
    const hp = A.sm(t, CATCH_B + 1.2, CATCH_B + 3) * (1 - A.sm(t, 108.0, 108.3));
    if (hp > 0) {
      for (let i = 0; i < 4; i++) {
        const bx = -120 + i * 36, ph = (t * 0.9 + i * 0.27) % 1;
        c.beginPath(); c.moveTo(bx, 50);
        c.bezierCurveTo(bx - 6, 40 - ph * 20, bx + 6, 30 - ph * 20, bx, 20 - ph * 24);
        c.strokeStyle = `rgba(249,115,22,${0.6 * hp * (1 - ph)})`; c.lineWidth = A.px(c, 4); c.stroke();
      }
    }
    // phản lực
    S.jetSide(c, xj, yj, SJ, { gear: 1, hook: 1, hero: true, flame: caught ? 0.55 * (1 - A.sm(t, 103.2, 104)) : 0.2 });
    S.carrierIsland(c, t, { x: 0, y: 0 });
    // thước 100 m
    const bp = A.sm(t, 105.4, 106.4) * (1 - A.sm(t, 107.9, 108.3));
    if (bp > 0) {
      const y = 112, x0 = WX, x1 = WX + (hx - WX) * 1;
      A.line(c, [[x0, y], [x0 + (x1 - x0) * bp, y]], P.amber, A.px(c, 5));
      A.line(c, [[x0, y - 10], [x0, y + 10]], P.amber, A.px(c, 5));
      A.line(c, [[x0 + (x1 - x0) * bp, y - 10], [x0 + (x1 - x0) * bp, y + 10]], P.amber, A.px(c, 5));
    }
    K.end(c);
    const [bx, by] = K.toScreen(cam, (WX + hx) / 2, 112);
    S.tag(c, '100 m', bx, by + 56, A.win(t, 106.4, 108.2, 0.2, 0.15), { size: 40 });
  }

  // ───── NGANG: đường lượn, thấu kính, LSO, đêm
  private approach(c: CanvasRenderingContext2D, t: number) {
    const night = A.sm(t, T_NIGHT, T_NIGHT + 2.2);
    const u = A.clamp01((t - T_APP) / (TD_N - T_APP));
    const slope = 0.1;
    // lệch cao so với đường lượn chuẩn: cao → hạ → đúng
    const dev = 44 * (1 - A.sm(t, 113.6, 117.4)) * A.sm(t, 108.3, 109.0) + 7 * Math.sin(t * 1.3) * A.sm(t, 117.4, 118.4) * (1 - A.sm(t, 128, 131));
    const xj = -1100 + (-212 + 1100) * u;
    const yj = -JY - (-212 - xj) * slope - dev * (1 - A.sm(t, 131, 133.2));
    const ang = -0.12 * (1 - A.sm(t, 132.8, 133.3));
    const cam: K.Cam = t < 113
      ? K.track(t, [[T_APP, { x: xj + 220, y: -70, z: 1.7 }], [113.0, { x: -430, y: -55, z: 1.8 }]], A.eio)
      : { x: -430, y: -55, z: 1.8 };
    K.begin(c, cam);
    S.sea(c, cam, S.WL, t, { drift: -t * 50, night });
    // đường lượn chuẩn cố định theo trái đất
    const gp = A.sm(t, 109.6, 111.6);
    S.dashPath(c, [[-1250, (-212 + 1250) * -slope], [-212, 0]], gp, P.sky, 4, [14, 12]);
    // tàu nhấp nhô
    const amp = 0.022 * A.sm(t, 118.0, 119.2) * (1 - A.sm(t, 126.5, 129.5));
    const pit = amp * Math.sin((t - 118) * 1.15);
    c.save(); c.rotate(pit);
    S.carrierSide(c, t, { x: 0, y: 0, noIsland: true });
    S.WIRES_X.forEach((wx, i) => S.wireSide(c, wx, 0, i === 2 ? P.amber : '#e2e8f0'));
    // thấu kính + LSO
    const lensX = -150;
    A.rrect(c, lensX - 9, -44, 18, 44, 3, P.dark, P.ink, A.px(c, 2.5));
    A.circle(c, lensX, -30, 5, P.amber, null, 0);
    A.line(c, [[lensX - 7, -20], [lensX + 7, -20]], '#22c55e', A.px(c, 3));
    S.person(c, -90, -4, 46, P.sand);
    c.restore();
    // ăng-ten vô tuyến LSO → phản lực
    const lp = A.win(t, 115.6, 118.4, 0.2, 0.3);
    if (lp > 0) S.rings(c, -96, -40 + pit * 90, t, { R: 360, n: 3, per: 1.5, color: P.amber, w: 3, a: lp, sweep: [Math.PI - 0.55, Math.PI + 0.55] });
    S.jetSide(c, xj, yj, SJ, { ang, gear: 1, hook: 1, hero: true });
    // đường nằm ngang (thái độ) khi nói về mũi hơi cao
    const ap = A.win(t, 109.2, 112.8, 0.5, 0.5);
    if (ap > 0) {
      c.save(); c.globalAlpha *= ap;
      A.line(c, [[xj - 130, yj], [xj + 140, yj]], P.ink2, A.px(c, 3), [10, 10]);
      c.translate(xj, yj); c.rotate(ang);
      A.line(c, [[-110, 0], [150, 0]], P.amber, A.px(c, 4));
      c.restore();
    }
    S.carrierIsland(c, t, { x: 0, y: 0, alpha: 1, radar: undefined });
    K.end(c);

    // đêm: phủ tối rồi vẽ đèn
    if (night > 0) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = night * 0.8; c.fillStyle = S.NIGHT; c.fillRect(0, 0, A.W, A.H);
      c.restore();
      K.begin(c, cam);
      c.save(); c.rotate(pit); c.globalAlpha *= night;
      for (let x = -460; x <= 500; x += 40) A.circle(c, x, -4, 4, '#fff7c2', null, 0);
      A.circle(c, lensX, -30, 7, P.amber, null, 0);
      for (let i = 0; i < 4; i++) A.circle(c, S.WIRES_X[i]!, 4, 3, '#22c55e', null, 0);
      A.rrect(c, 60, -80, 58, 16, 3, '#fff7c2', null, 0);
      c.restore();
      c.save(); c.globalAlpha = night;
      A.circle(c, xj + 4, yj - 4, 3, '#ef4444', null, 0);
      A.circle(c, xj - 36, yj - 14, 3, '#ffffff', null, 0);
      c.restore();
      K.end(c);
    }

    // chỉ báo của phi công: bóng và vạch chuẩn
    const pa = A.win(t, 113.4, 124.4, 0.4, 0.5);
    if (pa > 0) {
      c.save(); c.globalAlpha *= pa;
      const x = 1640, y = 250;
      A.rrect(c, x - 120, y - 140, 240, 280, 24, '#0f1b2d', P.ink, 4);
      // vạch chuẩn xanh
      A.line(c, [[x - 80, y], [x + 80, y]], '#22c55e', 8);
      A.circle(c, x - 96, y, 7, '#22c55e', null, 0); A.circle(c, x + 96, y, 7, '#22c55e', null, 0);
      // bóng
      const by = y - dev * 2.0;
      A.circle(c, x, by, 20, P.amber, '#fff7c2', 4);
      c.restore();
    }
    // nhà đỗ xe
    const cp = A.win(t, 130.4, 134.4, 0.5, 0.01);
    if (cp > 0) this.carPark(c, 1560, 260, cp);
  }

  private carPark(c: CanvasRenderingContext2D, x: number, y: number, a: number) {
    c.save(); c.globalAlpha *= a;
    A.rrect(c, x - 150, y - 90, 300, 180, 14, '#e2e8f0', '#94a3b8', 4);
    for (let i = 0; i < 5; i++) A.line(c, [[x - 130 + i * 52, y - 80], [x - 130 + i * 52, y - 20]], '#ffffff', 3);
    for (let i = 0; i < 5; i++) A.line(c, [[x - 130 + i * 52, y + 20], [x - 130 + i * 52, y + 80]], '#ffffff', 3);
    const cols = [P.enemyLight, P.sky, P.sand, P.oliveLight];
    for (let i = 0; i < 4; i++) A.rrect(c, x - 122 + i * 52, y - 70 + (i % 2) * 6, 34, 46, 6, cols[i]!, P.ink, 3);
    for (let i = 1; i < 4; i++) A.rrect(c, x - 122 + i * 52, y + 28, 34, 46, 6, cols[(i + 2) % 4]!, P.ink, 3);
    c.restore();
  }
}
