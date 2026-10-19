import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C8: ghế phóng — bắn qua kính, dù mở trong một giây; 0/0 trên đường băng. 373.0–399.9 */
const T1 = 378.7, FIRE = 384.4, CHUTE = 388.4;
const jetPos = (t: number): [number, number, number] => {
  const u = Math.max(0, t - T1);
  return [700 * u, 0.5 * 140 * u * u, 0.35 * Math.sin(u * 3.2) + u * 0.12];
};
const cockpit = (t: number): [number, number] => {
  const [x, y, r] = jetPos(t), s = 1.7;
  return [x + (Math.cos(r) * 80 - Math.sin(r) * -30) * s, y + (Math.sin(r) * 80 + Math.cos(r) * -30) * s];
};
function seatPos(t: number): [number, number] {
  const u = Math.max(0, t - FIRE);
  const [x0, y0] = cockpit(FIRE);
  const vx = 700;
  const x = x0 + vx * (1 - Math.exp(-u * 0.9)) / 0.9;
  const up = u < 1.2 ? -1100 * u + 460 * u * u : -1100 * 1.2 + 460 * 1.44 + (u - 1.2) * 40;
  return [x, y0 + up];
}

export default class Sc18 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < T1) this.intro(c, t);
    else if (t < 389.7) this.eject(c, t);
    else this.runway(c, t);
  }

  intro(c: C2, t: number) {
    const cam = K.track(t, [[373, { x: 0, y: 0, z: 0.95 }], [377.4, { x: 180, y: -40, z: 1.25 }]], A.eio);
    S.skyBg(c, cam, t, -300);
    K.begin(c, cam);
    const s = 2.3;
    S.jetSide(c, 0, 0, s, 0, { t, ab: 0.25, pilot: true });
    // ghế lộ qua kính
    const a = A.sm(t, 374.2, 374.8);
    A.withA(c, a, () => {
      c.save(); c.scale(s, s);
      A.rrect(c, 60, -46, 12, 40, 3, P.dark, P.amber, S.L(c, 3));
      c.restore();
      S.ring(c, 80 * s, -32 * s, 70 + 6 * Math.sin(t * 4), P.amber, 4);
    });
    K.end(c);
  }

  eject(c: C2, t: number) {
    const [jx, jy, jr] = jetPos(t);
    const [sx, sy] = seatPos(t);
    const jc: K.Cam = { x: jx + 100, y: jy, z: 0.8 };
    const sc: K.Cam = { x: sx, y: sy + 60, z: 1.0 };
    let cam = K.mix(jc, sc, A.eio(t, FIRE, FIRE + 1.2));
    cam = K.withShake(cam, t, [[379.0, 8, 3.5], [FIRE, 16, 0.6]]);
    S.skyBg(c, cam, t, 0);
    K.begin(c, cam);
    // khói từ máy bay mất điều khiển
    for (let i = 0; i < 14; i++) {
      const lag = i * 0.18, [px, py] = jetPos(t - lag);
      S.puff(c, px - 200, py, 30 + i * 6, 0.55 * (1 - i / 14));
    }
    const canopy = A.eo(t, 383.8, 384.6);
    S.jetSide(c, jx, jy, 1.7, jr, { t, ab: 0, pilot: t < FIRE, canopy: canopy, hideCanopy: canopy >= 1 });
    if (t > FIRE) {
      const fl = A.win(t, FIRE, FIRE + 0.8, 0.05, 0.3);
      const chute = A.eo(t, CHUTE, CHUTE + 0.9);
      // vệt lửa
      A.withA(c, 1 - A.sm(t, FIRE + 0.8, FIRE + 2), () => A.line(c, [cockpit(FIRE), [sx, sy + 20]], P.light, S.L(c, 10)));
      S.seatSide(c, sx, sy, 0.95, chute > 0 ? 0 : -0.15 + 0.1 * Math.sin(t * 5), { flame: fl, t, chute });
    }
    K.end(c);
  }

  runway(c: C2, t: number) {
    const cam = K.track(t, [[389.7, { x: 0, y: 0, z: 0.9 }], [396.0, { x: 0, y: 0, z: 0.9 }], [399.9, { x: 0, y: -120, z: 0.72 }]], A.eio);
    S.skyBg(c, cam, t, -30);
    K.begin(c, cam);
    const gy = 280;
    c.fillStyle = '#dfe6d3'; c.fillRect(-3000, gy, 6000, 2000);
    A.rrect(c, -2000, gy, 4000, 50, 0, P.slate, null);
    for (let i = -10; i < 10; i++) A.rrect(c, i * 200, gy + 20, 100, 10, 2, P.paper, null);
    A.line(c, [[-3000, gy], [3000, gy]], P.ink, S.L(c, 3));
    const s = 1.6;
    const jy = gy - 46 * s;
    S.jetSide(c, -200, jy, s, 0, { gear: true, pilot: t < 394.6, canopy: A.eo(t, 394.3, 394.8) });
    // đồng hồ: độ cao 0, tốc độ 0
    const dial = (x: number, at: number) => {
      const a = A.back(t, at, at + 0.4);
      if (a <= 0) return;
      c.save(); c.translate(x, -300); c.scale(a, a);
      A.circle(c, 0, 0, 80, P.paper, P.ink, S.L(c, 4));
      for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i / 10 * Math.PI * 2; A.line(c, [[Math.cos(an) * 62, Math.sin(an) * 62], [Math.cos(an) * 74, Math.sin(an) * 74]], P.ink, S.L(c, 2.5)); }
      A.line(c, [[0, 0], [0, -62]], S.BLOOD, S.L(c, 6));
      A.circle(c, 0, 0, 8, P.ink, null);
      S.label(c, '0', 0, 40, 34, P.ink);
      c.restore();
    };
    dial(-620, 391.5); dial(-400, 393.0);
    // ghế bắn khi đứng yên
    const F2 = 394.6;
    const [cx, cy] = [-200 + 80 * s, jy - 30 * s];
    if (t > F2) {
      const u = t - F2;
      const up = u < 1.2 ? -900 * u + 380 * u * u : -900 * 1.2 + 380 * 1.44 + (u - 1.2) * 45;
      const chute = A.eo(t, F2 + 1.0, F2 + 1.8);
      S.seatSide(c, cx + 60 * u, cy + up, 0.6, 0, { flame: A.win(t, F2, F2 + 0.7, 0.05, 0.3), t, chute });
    }
    // hàng nghìn người đã dùng
    const many = A.sm(t, 398.6, 399.0);
    if (many > 0) {
      for (let i = 0; i < 36; i++) {
        const at = 398.6 + i * 0.03;
        const p = A.back(t, at, at + 0.3);
        if (p <= 0) continue;
        const x = -1150 + (i % 12) * 210 + (Math.floor(i / 12) % 2) * 100, y = -720 + Math.floor(i / 12) * 150 + Math.sin(t + i) * 6;
        c.save(); c.translate(x, y); c.scale(0.35 * p, 0.35 * p);
        c.beginPath(); c.ellipse(0, 0, 120, 66, 0, Math.PI, 0); c.closePath(); A.fs(c, P.amber, P.ink, S.L(c, 3));
        A.line(c, [[-110, 0], [0, 130]], P.ink2, S.L(c, 1.5)); A.line(c, [[110, 0], [0, 130]], P.ink2, S.L(c, 1.5));
        A.circle(c, 0, 140, 16, P.olive, P.ink, S.L(c, 2));
        c.restore();
      }
    }
    K.end(c);
  }
}
