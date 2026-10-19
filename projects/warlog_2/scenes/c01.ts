// Chương 1 · 0–26.98 · Cái bẫy của xe tải đốt nhiên liệu nó chở.
// SIDE theo xe (0–14.3) → SIDE pan qua 5 xe, cột "đến nơi / đã đốt" (14.3–27).
// Hook: khung đầu đã có xe bồn đầy chạy ra đường, kim nhiên liệu tụt.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as S from './_assets';
import * as Cm from './_common';
import { P } from './shared/palette';

const GY = 640;          // mặt đất (thế giới)
const FAC = 0, CAMP = 4300;
const x1 = (t: number) => A.keys(t, [[0, 330], [1.9, 330], [5.9, 1500], [9.3, 2600], [13.9, 3500]]);
const x2 = (t: number) => A.keys(t, [[9.0, -700], [10.2, x1(10.2) - 330], [13.9, x1(13.9) - 330]]);
const tank1 = (t: number) => A.keys(t, [[1.9, 1], [9.2, 0.52], [10.4, 0.6], [12.6, 0.78], [13.9, 0.7]]);
const tank2 = (t: number) => A.keys(t, [[9.2, 1], [10.4, 0.92], [12.6, 0.62], [13.9, 0.52]]);
// ca B: năm xe dọc đường
const BX = [500, 1400, 2300, 3200, 4000];
const BURN = [0.08, 0.27, 0.48, 0.7, 0.9];

export default class C01 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const B = t >= 14.28;
    const cam = B ? this.camB(t) : this.camA(t);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.55, '#dde7ee', 190, 2);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.8, '#d3e0e8', 120, 5);
    S.sideGround(c, v.x0, v.x1, GY, { depth: 900 });
    // mốc km mỗi 500 đơn vị
    for (let x = 0; x <= CAMP; x += 500) { A.line(c, [[x, GY + 4], [x, GY + 26]], S.INK, A.px(c, 3)); }
    S.factorySide(c, FAC - 40, GY, 0.9, { smoke: t });
    Cm.camp(c, CAMP, GY, 1);
    if (!B) this.shotA(c, t, cam); else this.shotB(c, t, cam);
    K.end(c);
  }

  private camA(t: number): K.Cam {
    const hold: K.Cam = { x: 2150, y: GY - 150, z: 0.45 };
    const open: K.Cam = { x: 640, y: GY - 150, z: 1.7 };
    if (t < 6.0) return K.track(t, [[0, open], [1.7, open], [2.8, hold], [6.0, hold]], A.eio);
    const f = K.follow(t, (u) => [x1(u) - 120, GY - 120], 1.15, 0.5);
    const mid = K.mix(hold, f, A.eio(t, 6.0, 7.4));
    // 9.0–10.6: lùi nhẹ để thấy cả hai xe
    const wide = K.follow(t, (u) => [x1(u) - 360, GY - 130], 0.95, 0.5);
    return K.mix(mid, wide, A.eio(t, 9.0, 10.6));
  }

  private shotA(c: CanvasRenderingContext2D, t: number, cam: K.Cam) {
    const tx = x1(t);
    const moving = t > 1.9;
    const ph = tx / 24;
    if (moving) Cm.exhaust(c, tx - 125, GY - 98, t, 1, 1);
    S.truckSide(c, tx, GY, 1, { tank: tank1(t), ph });
    if (t > 9.0) {
      const t2 = x2(t);
      Cm.exhaust(c, t2 - 125, GY - 98, t, 1, 1);
      S.truckSide(c, t2, GY, 1, { tank: tank2(t), ph: t2 / 24 });
      // dòng nhiên liệu truyền từ xe 2 sang xe 1
      const g = A.win(t, 10.3, 13.0, 0.4, 0.6);
      if (g > 0) {
        const a = [t2 + 110, GY - 70] as const, b = [tx - 118, GY - 70] as const;
        for (let i = 0; i < 5; i++) {
          const k = (t * 1.6 + i / 5) % 1;
          A.circle(c, A.lerp(a[0], b[0], k), A.lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * 18, 7, P.amber, S.INK, A.px(c, 2));
        }
        A.withA(c, g, () => A.line(c, [[a[0], a[1]], [b[0], b[1]]], 'rgba(30,41,59,0.35)', A.px(c, 2), [8, 8]));
      }
    }
    // khoảng cách 500 km, hiện khi voice nói "500"
    const dp = A.eo(t, 3.6, 4.9);
    if (dp > 0 && t < 6.2) {
      const a = A.win(t, 3.6, 6.0, 0.2, 0.4);
      A.withA(c, a, () => {
        Cm.dimLine(c, FAC + 40, CAMP - 120, GY - 520, dp, P.ink, 7);
      });
      const [sx, sy] = K.toScreen(cam, (FAC + CAMP) / 2, GY - 520);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      if (t > 4.3 && t < 6.2) {
        A.withA(c, A.win(t, 4.3, 6.0, 0.2, 0.4), () => {
          c.font = "900 120px 'Archivo', sans-serif"; c.textAlign = 'center'; c.fillStyle = P.ink;
          c.fillText('500 km', sx, sy - 40);
        });
      }
      c.restore();
    }
  }

  private shotB(c: CanvasRenderingContext2D, t: number, _cam: K.Cam) {
    const gp = A.ph(t, 14.4, 22.0);
    for (let i = 0; i < 5; i++) {
      const bx = BX[i]!;
      const u = A.eo(gp, i * 0.14, i * 0.14 + 0.34);
      const burned = BURN[i]! * u;
      S.truckSide(c, bx, GY, 1, { tank: 1 - burned, ph: 0, bob: 0 });
      S.loadColumn(c, bx - 20, GY - 130, 70, 230, burned);
      // km: tick ở chân
    }
    // lính + phần còn lại ở doanh trại; viền nét đứt = lượng ban đầu
    const k = A.sm(t, 21.2, 22.4);
    for (let i = 0; i < 10; i++) {
      const dx = CAMP - 40 + (i % 5) * 36, dy = GY - 0 - Math.floor(i / 5) * 40;
      A.withA(c, k, () => {
        if (i < 1) S.crate(c, dx, dy, 1, 'fuel');
        else { c.save(); c.setLineDash([6, 5]); A.rrect(c, dx - 16, dy - 34, 32, 34, 6, null, 'rgba(30,41,59,0.45)', A.px(c, 2.5)); c.restore(); }
      });
    }
    A.withA(c, k, () => Cm.soldier(c, CAMP - 110, GY, 1, { dir: 1 }));
  }

  private camB(t: number): K.Cam {
    return K.track(t, [
      [14.28, { x: BX[0]! + 300, y: GY - 200, z: 0.95 }],
      [17.0, { x: BX[0]! + 300, y: GY - 200, z: 0.95 }],
      [21.2, { x: BX[3]! + 500, y: GY - 200, z: 0.85 }],
      [22.8, { x: CAMP - 150, y: GY - 130, z: 1.25 }],
      [24.4, { x: CAMP - 150, y: GY - 130, z: 1.25 }],
      [26.98, { x: 2150, y: GY - 240, z: 0.42 }],
    ], A.eio);
  }
}
