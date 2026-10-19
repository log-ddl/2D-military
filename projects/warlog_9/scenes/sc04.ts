import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C2: đốt sau (mặt cắt), nhiên liệu cạn nhanh, tầm bay co. 54.5–76.1 */
export default class Sc04 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 64.5) this.engine(c, t);
    else if (t < 69.3) this.fuel(c, t);
    else this.range(c, t);
  }

  engine(c: C2, t: number) {
    const cam = K.track(t, [
      [54.5, { x: -150, y: 0, z: 0.92 }], [57.4, { x: -150, y: 0, z: 0.92 }],
      [58.6, { x: -480, y: 0, z: 1.4 }], [61.2, { x: -480, y: 0, z: 1.4 }],
      [62.6, { x: -560, y: 0, z: 0.92 }],
    ], A.eio);
    A.clear(c, P.paper);
    K.begin(c, cam);
    const spray = A.sm(t, 58.6, 59.4), burn = A.sm(t, 60.0, 61.0);
    const lw = S.L(c, 3);
    // luồng phụt bên ngoài
    const plume = 120 + 520 * burn;
    const fl = 1 + 0.05 * Math.sin(t * 40);
    A.poly(c, [[-860, -110], [-860 - plume * fl, 0], [-860, 110]], A.lerpColor('#e2e8f0', P.amber, 0.3 + 0.7 * burn), null);
    A.withA(c, burn, () => {
      A.poly(c, [[-860, -60], [-860 - plume * 0.6 * fl, 0], [-860, 60]], '#fde68a', null);
      for (let i = 1; i <= 4; i++) A.ellipse(c, -860 - plume * 0.16 * i, 0, 14, 60 - i * 10, 0, '#fff7d6', null);
    });
    // vỏ
    A.poly(c, [[700, -170], [-280, -150], [-320, -125], [-860, -125 + 15 * burn], [-860, 125 - 15 * burn], [-320, 125], [-280, 150], [700, 170]], P.light, P.ink, lw);
    A.rrect(c, -860, -110, 1520, 220, 6, '#eef2f6', null);
    // ống đốt sau: lửa lấp đầy
    A.withA(c, burn, () => {
      const g = c.createLinearGradient(-330, 0, -860, 0);
      g.addColorStop(0, P.amber); g.addColorStop(1, '#fde68a');
      c.fillStyle = g; c.fillRect(-860, -100, 530, 200);
    });
    // trục
    A.line(c, [[-120, 0], [640, 0]], P.ink, S.L(c, 8));
    // quạt / máy nén: cánh chớp theo thời gian
    for (let i = 0; i < 9; i++) {
      const x = 640 - i * 34, h = 150 - i * 8;
      const ph = (t * 9 + i * 0.37) % 1;
      A.rrect(c, x - 6, -h, 12, h - 12, 3, ph < 0.5 ? P.slate : '#7c8aa0', P.ink, S.L(c, 2));
      A.rrect(c, x - 6, 12, 12, h - 12, 3, ph < 0.5 ? '#7c8aa0' : P.slate, P.ink, S.L(c, 2));
    }
    // buồng đốt
    for (const sy of [-1, 1]) A.rrect(c, 50, sy > 0 ? 24 : -94, 260, 70, 30, P.amber, P.ink, lw);
    // tuabin
    for (let i = 0; i < 3; i++) {
      const x = 10 - i * 40;
      A.rrect(c, x - 7, -110, 14, 98, 3, P.dark, P.ink, S.L(c, 2));
      A.rrect(c, x - 7, 12, 14, 98, 3, P.dark, P.ink, S.L(c, 2));
    }
    // vòi phun đốt sau
    const bar = A.lerpColor(P.slate, P.amber, spray);
    A.rrect(c, -350, -100, 18, 200, 4, bar, P.ink, lw);
    // giọt nhiên liệu
    A.withA(c, spray, () => {
      for (let i = 0; i < 26; i++) {
        const lane = (i % 6) - 2.5, p = (t * 1.8 + A.rnd(i) ) % 1;
        const x = -350 - p * 260, y = lane * 32 + Math.sin(i + t * 3) * 4;
        A.circle(c, x, y, 6 * (1 - p * 0.5), P.amber, P.ink, S.L(c, 1.2));
      }
    });
    // dòng khí: xanh trước buồng đốt, cam sau buồng đốt
    for (let i = 0; i < 40; i++) {
      const lane = (i % 5) - 2, p = (t * 0.55 + A.rnd(i * 3.1)) % 1;
      const x = 700 - p * 1560, y = lane * 36;
      if (x > 50 && x < 320) continue;
      if (Math.abs(y) < 14) continue;
      const col = x > 50 ? P.sky : (x < -340 && burn > 0.2 ? '#fde68a' : P.amber);
      A.circle(c, x, y, 7, col, null);
    }
    // ống xả co giãn
    const open = 20 * burn;
    A.poly(c, [[-860, -125 + 15 * burn], [-920, -100 - open], [-920, -88 - open], [-860, -110]], P.slate, P.ink, lw);
    A.poly(c, [[-860, 125 - 15 * burn], [-920, 100 + open], [-920, 88 + open], [-860, 110]], P.slate, P.ink, lw);
    K.end(c);
  }

  fuel(c: C2, t: number) {
    const cam = { x: -60, y: 20, z: 1.0 };
    S.skyBg(c, cam, t, -300);
    K.begin(c, cam);
    const ab = A.sm(t, 66.0, 66.5);
    const f = t < 66.2 ? A.lerp(1, 0.96, A.ph(t, 64.5, 66.2)) : A.lerp(0.96, 0.4, A.ph(t, 66.2, 69.2));
    S.jetSide(c, -120, -60, 2.3, 0, { t, ab: 0.2 + 0.8 * ab, fuel: f, pilot: true });
    // đồng hồ nhiên liệu
    const gx = 560, gy = 300;
    A.circle(c, gx, gy, 130, P.paper, P.ink, S.L(c, 4));
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI * (0.8 + i * 0.35);
      A.line(c, [[gx + Math.cos(a) * 100, gy + Math.sin(a) * 100], [gx + Math.cos(a) * 120, gy + Math.sin(a) * 120]], P.ink, S.L(c, 3));
    }
    c.beginPath(); c.arc(gx, gy, 110, Math.PI * 0.8, Math.PI * 1.0); A.fs(c, null, S.BLOOD, S.L(c, 8));
    const na = Math.PI * (0.8 + f * 1.4);
    A.line(c, [[gx, gy], [gx + Math.cos(na) * 100, gy + Math.sin(na) * 100]], P.ink, S.L(c, 6));
    A.circle(c, gx, gy, 12, P.ink, null);
    S.iconCost(c, 'heat', gx, gy + 60, 0.5, P.amber);
    K.end(c);
  }

  range(c: C2, t: number) {
    const cam = K.track(t, [[69.3, { x: 0, y: 0, z: 0.9 }], [76.1, { x: 80, y: 0, z: 0.86 }]]);
    S.mapBg(c, cam, 100);
    K.begin(c, cam);
    const bx = -560, by = 80;
    // căn cứ
    A.rrect(c, bx - 90, by - 14, 180, 28, 6, P.slate, P.ink, S.L(c, 3));
    A.line(c, [[bx - 70, by], [bx + 70, by]], P.paper, S.L(c, 3), [12, 10]);
    // vòng tầm bay: co lại khi bật đốt sau
    const R = A.lerp(1300, 880, A.eio(t, 73.0, 75.4));
    S.ring(c, bx, by, R, P.sky, 4, [16, 12]);
    A.withA(c, A.sm(t, 73.0, 73.6), () => S.ring(c, bx, by, 1300, P.light, 2, [6, 10]));
    // jet bay ra; 72.8 lao nhanh
    const ab = A.sm(t, 72.6, 73.0);
    const d = 50 * (t - 69.3) + 110 * Math.max(0, t - 72.8) * A.sm(t, 72.6, 73.2);
    const ang = -0.25;
    const jx = bx + Math.cos(ang) * (120 + d), jy = by + Math.sin(ang) * (120 + d);
    S.trail(c, (u) => { const dd = 50 * (u - 69.3) + 110 * Math.max(0, u - 72.8) * A.sm(u, 72.6, 73.2); return [bx + Math.cos(ang) * (120 + dd), by + Math.sin(ang) * (120 + dd), ang]; }, 69.3, t, P.ink2, 2, [8, 8]);
    S.jetTop(c, jx, jy, ang, 0.42, { t, ab: 0.2 + 0.8 * ab });
    K.end(c);
  }
}
