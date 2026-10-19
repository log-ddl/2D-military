import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C8: cái giá mặt đất — giờ bảo dưỡng, tháo động cơ, phi đội sẵn sàng buổi sáng. 399.9–426.0 */
export default class Sc19 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 416.5) this.hangar(c, t); else this.line(c, t);
  }

  hangar(c: C2, t: number) {
    const photo = 1 - A.eio(t, 403.0, 404.4);
    const cam = K.mix({ x: -60, y: 60, z: 0.85 }, { x: -60, y: 150, z: 1.5 }, photo);
    A.clear(c, '#e6e9ec');
    K.begin(c, cam);
    const gy = 300;
    // nhà chứa
    A.rrect(c, -1400, -700, 2800, gy + 700, 0, '#dde3e8', null);
    for (let i = -6; i <= 6; i++) A.line(c, [[i * 220, -700], [i * 220, gy]], '#cfd7de', S.L(c, 3));
    A.line(c, [[-1400, -420], [1400, -420]], '#c3ccd4', S.L(c, 6));
    c.fillStyle = '#c9d1d8'; c.fillRect(-1600, gy, 3200, 600);
    A.line(c, [[-1600, gy], [1600, gy]], P.ink, S.L(c, 3));
    const s = 1.6, jx = -40, jy = gy - 46 * s;
    // động cơ tháo ra khỏi đuôi
    const eng = A.eio(t, 414.4, 415.9);
    if (eng > 0) {
      const ex = jx - 150 * s - eng * 420, ey = jy - 2 * s;
      A.rrect(c, ex - 70, gy - 40, 260, 26, 6, P.dark, P.ink, S.L(c, 3));
      for (const wx of [ex - 40, ex + 160]) A.circle(c, wx, gy - 12, 12, P.ink, null);
      A.rrect(c, ex - 70, ey - 26, 260, 52, 24, P.slate, P.ink, S.L(c, 3));
      for (let i = 0; i < 6; i++) A.line(c, [[ex - 40 + i * 36, ey - 22], [ex - 40 + i * 36, ey + 22]], P.ink2, S.L(c, 2));
    }
    S.jetSide(c, jx, jy, s, 0, { gear: true, pilot: false, canopy: A.sm(t, 407.6, 408.4) * 0.6 });
    // đội kỹ thuật
    const crew: [number, number, string, number][] = [
      [jx + 260, 407.7, P.slate, 1], [jx - 80, 408.8, '#c9a227', 0], [jx - 300, 409.6, P.slate, 1], [jx + 40, 410.2, P.enemyLight, 0], [jx - 520, 411.2, P.sky, 0], [jx + 470, 412.0, P.slate, 1],
    ];
    crew.forEach(([x, at, col, arm], i) => {
      const a = A.back(t, at, at + 0.35);
      if (a > 0) S.person(c, x, gy, 0.95 * Math.min(1, a), col, arm * (0.5 + 0.5 * Math.sin(t * 4 + i)));
    });
    // xe nhiên liệu + xe đạn
    const fu = A.sm(t, 408.8, 409.3);
    if (fu > 0) A.withA(c, fu, () => {
      A.rrect(c, jx + 560, gy - 150, 300, 120, 14, '#c9a227', P.ink, S.L(c, 3));
      A.circle(c, jx + 620, gy - 18, 20, P.ink, null); A.circle(c, jx + 800, gy - 18, 20, P.ink, null);
      c.beginPath(); c.moveTo(jx + 560, gy - 90); c.quadraticCurveTo(jx + 300, gy - 10, jx + 60, jy + 10); A.fs(c, null, P.ink, S.L(c, 4));
    });
    const ar = A.eio(t, 410.2, 411.4);
    if (t > 410.2) {
      const mx = A.lerp(jx - 700, jx - 120, ar);
      A.rrect(c, mx - 90, gy - 46, 180, 20, 4, P.dark, P.ink, S.L(c, 2));
      A.circle(c, mx - 60, gy - 14, 12, P.ink, null); A.circle(c, mx + 60, gy - 14, 12, P.ink, null);
      S.missileSide(c, mx, gy - 66, 0.8, 0, {});
    }
    K.end(c);
    // khung ảnh chụp (tấm ảnh chỉ thấy chiếc máy bay sạch sẽ)
    if (photo > 0.01) A.withA(c, photo, () => {
      c.save(); c.lineWidth = 60; c.strokeStyle = P.white; c.strokeRect(150, 120, 1620, 840); c.restore();
      c.save(); c.lineWidth = 3; c.strokeStyle = P.ink; c.strokeRect(120, 90, 1680, 900); c.strokeRect(180, 150, 1560, 780); c.restore();
    });
    // thanh thời gian: 1 giờ bay vs nhiều giờ dưới đất
    const ba = A.sm(t, 405.0, 405.4);
    if (ba > 0) A.withA(c, ba, () => {
      const x0 = 260, y0 = 70, hw = 110;
      A.rrect(c, x0, y0, hw, 44, 8, P.amber, P.ink, 3);
      const n = A.clamp((t - 406.6) / 0.55, 0, 10);
      for (let i = 0; i < Math.floor(n); i++) A.rrect(c, x0 + hw + 10 + i * (hw + 10) * 1.0, y0, hw, 44, 8, P.slate, P.ink, 3);
      S.iconCost(c, 'heat', x0 + hw / 2, y0 + 22, 0.35, P.ink);
    });
  }

  line(c: C2, t: number) {
    const cam = K.track(t, [[416.5, { x: 0, y: 0, z: 0.82 }], [426, { x: 60, y: 0, z: 0.9 }]]);
    A.clear(c, '#d9dee2');
    K.begin(c, cam);
    // sân đỗ
    A.rrect(c, -1200, -560, 2400, 1120, 0, '#c9d0d6', null);
    const spots: [number, number][] = [];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) spots.push([-760 + i * 260, -190 + r * 380]);
    spots.forEach(([x, y]) => A.rrect(c, x - 110, y - 130, 220, 260, 10, null, P.paper, S.L(c, 3)));
    // 12 chiếc đã mua
    const ready = [0, 2, 3, 6, 7, 9];
    spots.forEach(([x, y], i) => {
      const a = A.back(t, 416.8 + i * 0.12, 417.2 + i * 0.12);
      if (a <= 0) return;
      const isReady = ready.includes(i);
      const dim = isReady ? 0 : A.sm(t, 419.4, 420.2);
      const goIn = isReady ? 0 : A.eio(t, 422.4, 423.8);
      const hx = 1050, hy = y;
      const px = A.lerp(x, hx + (i % 6) * 0, goIn), py = y;
      A.withA(c, 1 - 0.55 * dim, () => S.jetTop(c, px, py, -Math.PI / 2, 0.42 * Math.min(1, a), { t }));
      if (isReady) { const ra = A.sm(t, 419.6, 420.2); S.ring(c, x, y, 120, P.amber, 4, undefined, ra); }
    });
    // nhà chứa bên phải: nửa phi đội nằm trong
    const ha = A.sm(t, 422.0, 422.6);
    A.withA(c, ha, () => {
      A.rrect(c, 880, -560, 420, 1120, 16, '#aab4bd', P.ink, S.L(c, 4));
      for (let i = 0; i < 6; i++) A.line(c, [[880, -560 + i * 190], [1300, -560 + i * 190]], '#97a2ac', S.L(c, 3));
    });
    K.end(c);
  }
}
