// Chương 12 · 457.74–476.84 · Kết: quay về chiếc xe tải của phần mở đầu; các cách chữa; ngày thứ 10.
// SIDE cùng cảnh phần mở đầu (đường, đồi, cột mốc km) → năm cách chữa chồng lên chính con đường đó
// (kho gần, đường ngắn, ống, thay động cơ, che chuỗi) → duyệt binh mờ đi, hàng đến vào ngày thứ 10.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import * as S from './_assets';
import * as Cm from './_common';
import { P } from './shared/palette';

const INK = S.INK;
type Ctx = CanvasRenderingContext2D;

const GY = 640;
const FAC = 0, CAMP0 = 4300;

export default class C12 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    if (t < 462.7) this.back(c, t);
    else if (t < 471.3) this.fixes(c, t);
    else this.end(c, t);
  }

  // 457.7–462.7: lại chiếc xe tải đốt nhiên liệu nó chở (hệt phần mở đầu)
  private back(c: Ctx, t: number) {
    const x1 = A.keys(t, [[457.7, 800], [462.7, 2000]]);
    const cam: K.Cam = K.track(t, [[457.7, { x: 960, y: GY - 150, z: 1.3 }], [462.7, { x: 2250, y: GY - 200, z: 1.0 }]], A.sm);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.55, '#dde7ee', 190, 2);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.8, '#d3e0e8', 120, 5);
    S.sideGround(c, v.x0, v.x1, GY, { depth: 900 });
    for (let x = 0; x <= CAMP0; x += 500) A.line(c, [[x, GY + 4], [x, GY + 26]], INK, A.px(c, 3));
    S.factorySide(c, FAC - 40, GY, 0.9, { smoke: t });
    Cm.camp(c, CAMP0, GY, 1);
    const lv = A.keys(t, [[457.7, 0.55], [462.7, 0.3]]);
    Cm.exhaust(c, x1 - 125, GY - 98, t, 1, 1);
    S.truckSide(c, x1, GY, 1, { tank: lv, ph: x1 / 24 });
    K.end(c);
  }

  // 462.8–471.2: các cách chữa cùng một con đường: kho lùi về gần, đường ngắn lại, ống, thay động cơ, che chuỗi
  private fixes(c: Ctx, t: number) {
    const cam: K.Cam = K.track(t, [[462.7, { x: 2250, y: GY - 200, z: 1.0 }], [464.6, { x: 3150, y: GY - 210, z: 0.78 }], [471.3, { x: 3150, y: GY - 210, z: 0.78 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 400);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.55, '#dde7ee', 190, 2);
    S.sideGround(c, v.x0, v.x1, GY, { depth: 900 });
    for (let x = 0; x <= CAMP0; x += 500) A.line(c, [[x, GY + 4], [x, GY + 26]], INK, A.px(c, 3));
    // 3) ống: chạy dọc đường tới doanh trại, nhiên liệu chảy (465.8–467.4)
    const pk = A.eo(t, 465.8, 467.6);
    if (pk > 0) {
      const x0 = v.x0 - 60, x1 = A.lerp(x0, CAMP0 - 60, pk);
      A.line(c, [[x0, GY + 70], [x1, GY + 70]], INK, A.px(c, 30));
      A.line(c, [[x0, GY + 70], [x1, GY + 70]], '#e5e9ee', A.px(c, 20));
      if (pk >= 1) for (let i = 0; i < 40; i++) A.circle(c, x0 + ((t * 240 + i * 120) % (CAMP0 - 120 - x0)), GY + 70, 7, P.amber, null, 0);
    }
    // 1) kho tiến lên gần doanh trại
    const depX = A.lerp(2100, 3500, A.eio(t, 462.9, 464.8));
    S.depotSide(c, depX, GY, 1.0);
    Cm.camp(c, CAMP0, GY, 1);
    // 2) quãng đường ngắn lại: đường kích thước từ kho tới doanh trại
    A.withA(c, A.eo(t, 464.2, 465.0), () => Cm.dimLine(c, depX + 140, CAMP0 - 150, GY - 330, 1, P.ink, 9));
    // xe tải: chiếc đầu phim tiếp tục tới kho (462.7–464.5), rồi đi thoi quãng ngắn
    const x0t = A.keys(t, [[462.7, 2000], [464.8, depX - 150]]);
    if (t < 464.9) { Cm.exhaust(c, x0t - 125, GY - 98, t, 1, 1); S.truckSide(c, x0t, GY, 1, { tank: A.keys(t, [[462.7, 0.3], [464.8, 0.28]]), ph: x0t / 24 }); }
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.18) + i / 3) % 1;
      const out = u < 0.5, k = out ? u / 0.5 : (u - 0.5) / 0.5;
      const x = out ? A.lerp(depX + 190, CAMP0 - 240, k) : A.lerp(CAMP0 - 240, depX + 190, k);
      if (t > 464.8) S.truckSide(c, x, GY, 1.0, { tank: out ? 0.9 : 0.1, dir: out ? 1 : -1, ph: x / 24 });
    }
    K.end(c);
    // 4) thay động cơ: hộp mặt cắt nhỏ ở góc; cụm hỏng (xám) nhấc lên, cụm mới (olive) hạ vào (467.9–469.6)
    if (t > 467.6) {
      const a = A.win(t, 467.6, 471.2, 0.4, 0.5);
      A.withA(c, a, () => {
        A.rrect(c, 1170, 60, 700, 360, 20, 'rgba(255,255,255,0.94)', INK, 3.4);
        const lift = A.eio(t, 468.0, 469.0), place = A.eio(t, 469.2, 470.3);
        c.save(); c.translate(1520, 330);
        S.tankSide(c, 0, 0, 1.4, { ph: 0 });
        // cụm: ra, vào
        const oldY = -lift * 140, newY = -(1 - place) * 140;
        A.withA(c, 1 - A.ph(lift, 0.6, 1), () => A.rrect(c, -150, -96 + oldY, 70, 36, 5, P.slate, INK, 3.4));
        A.withA(c, A.ph(t, 468.8, 469.2), () => A.rrect(c, -150, -96 + newY, 70, 36, 5, P.oliveLight, INK, 3.4));
        c.restore();
      });
    }
    // 5) che chuỗi: vòm bảo vệ nhẹ trên cả đoạn chính, mũi nhọn bị gạt (470.0–471.2)
    if (t > 469.9) {
      const a = A.sm(t, 469.9, 471.0);
      const [x0, y0] = K.toScreen(cam, FAC, GY - 30), [x1, y1] = K.toScreen(cam, CAMP0 + 100, GY - 30);
      A.withA(c, a * 0.8, () => {
        c.save(); c.strokeStyle = P.sky; c.lineWidth = 16; c.setLineDash([30, 16]);
        c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(x0 + 200, y0 - 360, x1 - 200, y1 - 360, x1, y1); c.stroke(); c.restore();
      });
    }
    // 4/5: các phần UI trên đây dùng toạ độ màn hình
    void U;
  }

  // 471.4–476.84: duyệt binh mờ đi; hàng đến vào ngày thứ 10
  private end(c: Ctx, t: number) {
    A.clear(c, '#f4f8fb');
    const parade = 1 - A.sm(t, 473.5, 474.6);
    const cam: K.Cam = { x: 960, y: 560, z: 1 };
    K.begin(c, cam);
    c.fillStyle = '#e3e9ee'; c.fillRect(-100, 760, 2200, 600);
    A.line(c, [[-100, 760], [2100, 760]], INK, A.px(c, 4));
    // duyệt binh: hàng xe tăng sáng, cờ
    A.withA(c, parade, () => {
      const off = ((t - 471.4) * 140) % 520;
      for (let i = -1; i < 5; i++) {
        const x = i * 520 + off - 100;
        S.tankSide(c, x, 760, 1.0, { ph: t * 3 });
        A.line(c, [[x - 60, 760 - 150], [x - 60, 760 - 230]], INK, A.px(c, 5));
        A.poly(c, [[x - 60, 760 - 230], [x - 10, 760 - 218], [x - 60, 760 - 206]], P.enemy, INK, A.px(c, 2));
      }
    });
    // ngày thứ mười: dải ngày, xe tải tới nơi
    const days = A.sm(t, 473.0, 474.0);
    const dayN = A.keys(t, [[473.4, 0], [475.6, 10]]);
    A.withA(c, days, () => {
      for (let i = 0; i < 10; i++) {
        const on = i + 1 <= Math.floor(dayN + 0.0001);
        A.rrect(c, 280 + i * 130, 140, 112, 130, 10, on ? P.amber : '#ffffff', INK, A.px(c, 3.4));
      }
      c.save(); c.font = "900 90px 'Archivo', sans-serif"; c.textAlign = 'center'; c.fillStyle = INK;
      if (dayN >= 9.9) c.fillText('10', 280 + 9 * 130 + 56, 235);
      c.restore();
    });
    // xe tải với hàng tới doanh trại ở ngày 10
    const k = A.eio(t, 473.6, 476.0);
    S.truckSide(c, A.lerp(-200, 1250, k), 760, 1.4, { load: 1, ph: k * 40, kind: 'cargo' });
    Cm.camp(c, 1620, 760, 1.2);
    // kiện giao vào lúc tới
    if (k > 0.98) { /* hold */ }
    K.end(c);
  }
}
