// Chương 10 · 400.84–431.50 · Hậu cần không phải phần phụ: cái đuôi quyết định mũi nhọn đi đâu, nhanh cỡ nào, bao lâu.
// 400.8–408.5 TOP đội hình: mũi nhọn sáng, đuôi xám (hiểu lầm) · 408.5–414 vòng "tầm với" của đuôi giữ mũi nhọn ·
// 414–419.5 TOP kế hoạch đẹp ngoài tầm với · 419.8–424 SIDE xe tăng chờ xe nhiên liệu theo kịp · 424.1–431.5 TOP kho lớn = mục tiêu lớn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as U from './shared/ui';
import * as S from './_assets';
import * as Cm from './_common';
import { P } from './shared/palette';

const INK = S.INK;
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

export default class C10 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    if (t < 419.7) this.top(c, t);
    else if (t < 424.1) this.speed(c, t);
    else this.depot(c, t);
  }

  private top(c: Ctx, t: number) {
    const cam: K.Cam = K.track(t, [[400.84, { x: 700, y: 0, z: 0.78 }], [414.0, { x: 700, y: 0, z: 0.78 }], [419.7, { x: 900, y: 0, z: 0.68 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 300);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 260, 'rgba(0,0,0,0)');
    M.forest(c, 100, 340, 210, 3); M.forest(c, 800, -330, 220, 6); M.hill(c, 1500, 330, 240, 4, 2); M.forest(c, 1900, -320, 200, 8);
    S.roadLine(c, [[-500, 0], [1500, 0]], 46);
    // đuôi: nhà máy → kho → xe tải; mũi nhọn: xe tăng ở bên phải
    const dull = 1 - A.sm(t, 408.4, 410.0); // 1 = xám/nhỏ (bị hiểu là phụ), 0 = có trọng lượng
    // đuôi
    const tailCol = A.lerpColor(P.oliveDark, '#b6bdc6', dull);
    S.depotTop(c, -400, 0, 1.5, { a: 0.6 + 0.4 * (1 - dull), tone: dull > 0.5 ? '#c8ced6' : P.olive });
    for (let i = 0; i < 8; i++) {
      const x = -230 + i * 140 + ((t * 40) % 140);
      S.truckTop(c, x, 0, 1.1 - dull * 0.2, { load: 1, body: tailCol, a: 0.55 + 0.45 * (1 - dull) });
    }
    // mũi nhọn: ba xe tăng
    const fx = 1300;
    const tooth = 1;
    S.tankTop(c, fx, -110, 0.85, { aim: 0, a: tooth });
    S.tankTop(c, fx + 120, 0, 0.85, { aim: 0, a: tooth });
    S.tankTop(c, fx, 110, 0.85, { aim: 0, a: tooth });
    // 408.5–414: vòng tầm với quanh đuôi — mũi nhọn không đi xa hơn được; vòng tăng khi đuôi dài
    if (t > 408.4) {
      const k = A.eo(t, 408.5, 410.5);
      const R = A.lerp(900, 1180, A.sm(t, 412.0, 414.0));
      A.withA(c, k, () => {
        c.save(); c.setLineDash([22, 16]); A.circle(c, -380, 0, R, 'rgba(125,139,90,0.10)', P.olive, A.px(c, 7)); c.restore();
      });
      // sợi dây: đuôi nối mũi nhọn (co giãn)
      const reach = -380 + R;
      A.withA(c, k, () => A.line(c, [[-250, 0], [fx - 90, 0]], P.amber, A.px(c, 6), [4, 10]));
      void reach;
    }
    // 414–419.5: kế hoạch (mũi tên đậm) tới mục tiêu ngoài vòng; dừng ở rìa
    if (t > 414.0) {
      const k = A.eio(t, 414.2, 416.8);
      const goal: Pt = [2200, 0];
      A.withA(c, A.sm(t, 414.0, 414.8), () => {
        M.advance(c, [[fx + 160, 0], [goal[0] - 60, 0]], k, { color: '#b4493c', w: 54 });
        A.circle(c, goal[0], goal[1], 70, null, P.enemy, A.px(c, 8));
        A.line(c, [[goal[0] - 40, -40], [goal[0] + 40, 40]], P.enemy, A.px(c, 8));
        A.line(c, [[goal[0] + 40, -40], [goal[0] - 40, 40]], P.enemy, A.px(c, 8));
      });
      // đích nằm ngoài vòng: viền đứt vòng tầm với và dấu chặn ở rìa
      const R = 1180, edge = -380 + R;
      if (t > 416.6) {
        A.withA(c, A.sm(t, 416.6, 417.4), () => {
          A.line(c, [[edge, -200], [edge, 200]], P.amber, A.px(c, 10));
          U.xMark; // dấu X ở lớp màn hình bên dưới
        });
      }
    }
    K.end(c);
    if (t > 417.0) {
      const [sx, sy] = K.toScreen(cam, -380 + 1180, 0);
      U.xMark(c, sx, sy, 46, A.eo(t, 417.0, 417.8), P.enemy, 12);
    }
  }

  // tốc độ = xe nhiên liệu theo kịp tới đâu
  private speed(c: Ctx, t: number) {
    const GY = 740;
    const cam: K.Cam = { x: 1000, y: 600, z: 1.1 };
    K.begin(c, cam);
    const v = K.view(cam, 300);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.5, '#dde7ee', 260, 5);
    S.sideGround(c, v.x0, v.x1, GY, { depth: 800 });
    // tiến độ: xe tăng chạy nhanh rồi hết nhiên liệu chờ xe bồn; quãng chờ 421.5–423
    const tankX = A.keys(t, [[419.7, 600], [421.0, 1000], [421.8, 1100], [423.0, 1100], [424.1, 1250]]);
    const fuelX = A.keys(t, [[419.7, 150], [421.0, 340], [423.0, 780], [424.1, 980]]);
    S.tankSide(c, tankX, GY, 1.3, { ph: tankX / 22 });
    S.truckSide(c, fuelX, GY, 1.0, { tank: 0.9, ph: fuelX / 24 });
    // dây nhiên liệu giữa hai xe: căng ra khi cách xa
    A.line(c, [[fuelX + 110, GY - 70], [tankX - 150, GY - 60]], P.amber, A.px(c, 6), [4, 10]);
    // đồng hồ nhiên liệu của xe tăng
    const f = A.keys(t, [[419.7, 0.7], [421.4, 0.12], [423.0, 0.1], [424.1, 0.8]]);
    const gx = tankX, gy = GY - 360;
    A.rrect(c, gx - 60, gy, 120, 24, 8, '#fff', INK, A.px(c, 3.4));
    c.fillStyle = f < 0.2 ? P.enemy : P.amber; c.fillRect(gx - 54, gy + 4, 108 * f, 16);
    K.end(c);
  }

  // kho càng lớn càng thành mục tiêu lớn
  private depot(c: Ctx, t: number) {
    const cam: K.Cam = { x: 700, y: 0, z: 0.85 };
    K.begin(c, cam);
    const v = K.view(cam, 300);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 260, 'rgba(0,0,0,0)');
    M.forest(c, 100, 340, 210, 5); M.forest(c, 1100, -320, 210, 9); M.hill(c, 1300, 330, 230, 4, 7);
    S.roadLine(c, [[-500, 0], [900, 0]], 44);
    // kho phình dần: thêm kiện, thêm mái (424.4–428.8)
    const g = A.sm(t, 424.4, 428.8);
    const s = A.lerp(1.4, 2.8, g);
    S.depotTop(c, 400, 0, s, { fill: 1 });
    // "an toàn hơn": khiên (424–428) → bị nhìn thấy (428.9–431.5): quạt quan sát địch + tâm ngắm lớn theo kho
    const shield = A.win(t, 425.0, 428.9, 0.5, 0.3);
    A.withA(c, shield * 0.9, () => A.circle(c, 400, 0, 230 * s / 1.4 * 0.75, 'rgba(125,139,90,0.12)', P.olive, A.px(c, 6)));
    const e = A.eo(t, 428.9, 429.8);
    if (e > 0) {
      const ex = 1800, ey = -200;
      M.unit(c, ex, ey, 'recon', 'foe', 230 * e, { a: e });
      const ang = Math.atan2(0 - ey, 400 - ex);
      M.fan(c, ex, ey, 1500, ang - 0.14, ang + 0.14, e, '#dc2626');
    }
    K.end(c);
    if (e > 0) {
      const [sx, sy] = K.toScreen(cam, 400, 0);
      U.crosshair(c, sx, sy, 120 * (s / 1.4) * 0.8, P.enemy, A.eo(t, 429.6, 430.4), t * 0.6);
    }
  }
}
