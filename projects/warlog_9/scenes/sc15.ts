import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
type P3 = [number, number, number];
/** C6: phòng thủ — chaff, flare, gây nhiễu, notching. 292.1–319.5 */
const T0 = 292.1, V = 230;
const head = (t: number) => -Math.PI / 2 * A.eio(t, 309.3, 310.4);
function F(t: number): P3 {
  let x = 0, y = 0;
  const dt = 1 / 15;
  for (let u = T0; u < t; u += dt) {
    const d = Math.min(dt, t - u), h = head(u);
    x += Math.cos(h) * V * d; y += Math.sin(h) * V * d;
  }
  return [x, y, head(t)];
}
const lin = (a: [number, number], b: [number, number], p: number): [number, number] => [A.lerp(a[0], b[0], p), A.lerp(a[1], b[1], p)];

export default class Sc15 extends CanvasScene {
  protected draw(c: C2, t: number) {
    const [fx, fy, fh] = F(t);
    const cam = { x: fx + 260, y: fy + 40, z: 0.74 };
    S.mapBg(c, cam, 200);
    K.begin(c, cam);
    // cảnh báo bị khoá
    const warn = A.win(t, 294.6, 297.4, 0.2, 0.4);
    if (warn > 0) { const p = (t * 1.6) % 1; S.ring(c, fx, fy, 120 + p * 260, P.enemy, 4, undefined, (1 - p) * warn); }

    // --- CHAFF vs tên lửa radar
    const cp = F(298.2);
    const chA = A.sm(t, 298.2, 298.5) * (1 - A.sm(t, 302.5, 303.5));
    if (chA > 0) {
      const g = A.eo(t, 298.2, 300.0);
      for (let i = 0; i < 46; i++) {
        const a = A.rnd(i) * Math.PI * 2, r = A.rnd(i + 50) * 260 * g;
        const x = cp[0] - 120 + Math.cos(a) * r, y = cp[1] + Math.sin(a) * r * 0.7;
        A.withA(c, chA, () => { c.save(); c.translate(x, y); c.rotate(a + t * 3); A.rrect(c, -10, -2, 20, 4, 1, P.slate, null); c.restore(); });
      }
    }
    const R1s: [number, number] = [F(297.6)[0] + 1500, -420];
    if (t > 297.6 && t < 302.4) {
      const tgt = lin([F(299.4)[0], F(299.4)[1]], [cp[0] - 120, cp[1]], A.sm(t, 299.0, 299.8));
      const p = A.ph(t, 297.6, 301.6);
      const pos = lin(R1s, [tgt[0] - 300, tgt[1]], p);
      const ang = Math.atan2(tgt[1] - R1s[1], tgt[0] - 300 - R1s[0]);
      A.withA(c, 1 - A.sm(t, 301.6, 302.3), () => {
        S.cone(c, pos[0], pos[1], ang, 0.3, 600, P.sky, 0.25);
        S.missileSide(c, pos[0], pos[1], 0.75, ang, { flame: 0.4, t });
      });
    }
    // --- FLARE vs tên lửa nhiệt
    const flp = F(302.6);
    const flA = A.sm(t, 302.5, 302.7) * (1 - A.sm(t, 305.6, 306.4));
    const flares: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
      const u = t - (302.6 + i * 0.25);
      if (u < 0) continue;
      const fl: [number, number] = [flp[0] - 60 + i * 60 - 90 * u, flp[1] + (i - 1) * 50 + 80 * u];
      flares.push(fl);
      A.withA(c, flA, () => { A.circle(c, fl[0], fl[1], 38 + 6 * Math.sin(t * 30 + i), '#fde68a', null); A.circle(c, fl[0], fl[1], 18, P.white, null); S.ring(c, fl[0], fl[1], 60, P.amber, 3); });
    }
    const HS: [number, number] = [F(302.0)[0] - 1300, 380];
    const HB = 304.9;
    if (t > 302.0 && t < HB) {
      const tgtF: [number, number] = flares[0] ?? [fx, fy];
      const goal = lin([fx, fy], tgtF, A.sm(t, 302.9, 303.6));
      const p = A.ph(t, 302.0, HB);
      const pos = lin(HS, goal, A.eio(p, 0, 1) * 0.0 + p);
      const ang = Math.atan2(goal[1] - HS[1], goal[0] - HS[0]);
      S.cone(c, pos[0], pos[1], ang, 0.25, 420, P.amber, 0.25);
      S.missileSide(c, pos[0], pos[1], 0.75, ang, { flame: 1, t });
    }
    if (flares[0]) S.boom(c, flares[0][0], flares[0][1], 130, A.ph(t, HB, HB + 1.1));
    // --- GÂY NHIỄU
    const jA = A.win(t, 306.0, 309.0, 0.3, 0.5);
    const ej: [number, number] = [F(306)[0] + 1250, -560];
    if (jA > 0) {
      A.withA(c, jA, () => {
        S.jetTop(c, ej[0], ej[1], Math.PI - 0.4, 0.42, { side: S.ENEMY });
        const to = Math.atan2(fy - ej[1], fx - ej[0]);
        S.cone(c, ej[0], ej[1], to, 0.18, 1400, P.sky, 0.15);
        // sóng răng cưa từ ta về địch
        for (let k = 0; k < 3; k++) {
          const pts: [number, number][] = [];
          const ox = (k - 1) * 30;
          for (let i = 0; i <= 16; i++) {
            const p = i / 16; const zz = (i % 2 ? 1 : -1) * 22;
            pts.push([A.lerp(fx, ej[0], p) + ox, A.lerp(fy, ej[1], p) + zz]);
          }
          A.line(c, pts, P.amber, S.L(c, 3));
        }
        // mục tiêu ma
        const gh = A.sm(t, 307.6, 308.0);
        for (let i = 0; i < 4; i++) A.withA(c, 0.35 * gh, () => S.jetTop(c, fx + [-260, 240, -120, 330][i]!, fy + [-260, -200, 240, 180][i]!, fh, 0.42, {}));
      });
    }
    // --- NOTCHING
    const N0 = 309.0;
    const NS: [number, number] = [F(N0)[0] + 1500, 60];
    if (t > N0 && t < 315.5) {
      const aim: [number, number] = [F(310)[0], F(310)[1]];
      const ang = Math.atan2(aim[1] - NS[1], aim[0] - NS[0]);
      const d = (t - N0) * 520;
      const pos: [number, number] = [NS[0] + Math.cos(ang) * d, NS[1] + Math.sin(ang) * d];
      const lost = A.sm(t, 312.0, 312.6);
      S.cone(c, pos[0], pos[1], ang, 0.3, 700, A.lerpColor(P.sky, P.light, lost), 0.25 * (1 - lost * 0.6));
      A.withA(c, 1 - A.sm(t, 314.6, 315.4), () => S.missileSide(c, pos[0], pos[1], 0.75, ang, { flame: 0.4, t }));
      // góc vuông giữa hướng bay và đường tên lửa
      const ra = A.win(t, 310.4, 313.6, 0.3, 0.4);
      A.withA(c, ra, () => {
        A.line(c, [[fx, fy], [fx + 420, fy + (Math.tan(ang)) * 420]], P.enemyLight, S.L(c, 3), [10, 10]);
        A.line(c, [[fx + 70, fy], [fx + 70, fy - 70], [fx, fy - 70]], P.ink, S.L(c, 3));
      });
    }
    S.trail(c, (u) => F(u), Math.max(T0, t - 5), t, P.oliveLight, 3);
    S.jetTop(c, fx, fy, fh, 0.42, { t, ab: 0.3 });
    K.end(c);
  }
}
