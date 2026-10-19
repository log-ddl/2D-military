import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
type P3 = [number, number, number];
/** C5: phóng tới điểm mục tiêu sẽ tới; máy bay phóng phải giữ mũi về địch. 228.2–244.4 */
const T0 = 228.2, V = 520;
const LA = 1.0, SEEK = 12.0, HIT = 14.5, ELA = 8.0;
const E0: [number, number] = [16000, -7000], HE = Math.PI - 0.38;
const E = (lt: number): P3 => [E0[0] + Math.cos(HE) * V * lt, E0[1] + Math.sin(HE) * V * lt, HE];
const F0: [number, number] = [-16000, 5500];
function F(lt: number): P3 {
  let x = F0[0], y = F0[1], h = 0;
  const dt = 1 / 20;
  for (let u = 0; u < lt; u += dt) {
    const d = Math.min(dt, lt - u);
    const [ex, ey] = E(u);
    const aim = Math.atan2(ey - y, ex - x);
    if (u < SEEK) h = S.angLerp(h, aim, Math.min(1, d * 3));
    else h += 0.75 * d; // bẻ lái ra xa
    x += Math.cos(h) * V * d; y += Math.sin(h) * V * d;
  }
  return [x, y, h];
}
function M(lt: number): P3 {
  const p = A.ph(lt, LA, HIT);
  const [x0, y0] = F(LA), [x1, y1] = E(HIT);
  const f = (q: number): [number, number] => [A.lerp(x0, x1, q), A.lerp(y0, y1, q) - Math.sin(q * Math.PI) * 3000];
  const [x, y] = f(p), [x2, y2] = f(Math.min(1, p + 0.01));
  return [x, y, Math.atan2(y2 - y, x2 - x)];
}
// tên lửa địch: nhắm vào chỗ F lẽ ra đã tới nếu bay thẳng
const Q = (() => { const [x, y, h] = F(SEEK); return [x + Math.cos(h) * V * 3.5, y + Math.sin(h) * V * 3.5] as [number, number]; })();
function EM(lt: number): P3 {
  const p = A.ph(lt, ELA, 15.6);
  const [x0, y0] = E(ELA);
  const x = A.lerp(x0, Q[0], p), y = A.lerp(y0, Q[1], p);
  return [x, y, Math.atan2(Q[1] - y0, Q[0] - x0)];
}

export default class Sc12 extends CanvasScene {
  protected draw(c: C2, t: number) {
    const lt = t - T0;
    const cam = K.track(t, [[T0, { x: 0, y: 0, z: 0.042 }], [240, { x: -2000, y: 1000, z: 0.046 }], [244.4, { x: -2000, y: 1500, z: 0.044 }]], A.eio);
    S.mapBg(c, cam, 1000);
    K.begin(c, cam);
    const ic = 0.2 / cam.z;
    const [fx, fy, fh] = F(lt), [ex, ey] = E(lt);
    const Pi = E(HIT);
    // đường bay dự đoán của địch + điểm gặp
    A.withA(c, A.sm(lt, 0.2, 0.8) * (1 - A.sm(lt, HIT, HIT + 0.5)), () => {
      A.line(c, [[ex, ey], [Pi[0], Pi[1]]], P.enemyLight, S.L(c, 3), [10, 12]);
      const r = 700;
      A.line(c, [[Pi[0] - r, Pi[1] - r], [Pi[0] + r, Pi[1] + r]], P.amber, S.L(c, 5));
      A.line(c, [[Pi[0] - r, Pi[1] + r], [Pi[0] + r, Pi[1] - r]], P.amber, S.L(c, 5));
    });
    // radar F giữ hướng về địch tới khi đầu dò bật
    const rOn = 1 - A.sm(lt, SEEK, SEEK + 0.5);
    const toE = Math.atan2(ey - fy, ex - fx);
    S.cone(c, fx, fy, toE, 0.1, 40000, P.sky, 0.16 * rOn);
    // tên lửa ta
    if (lt > LA) {
      const [mx, my, mh] = M(lt);
      S.trail(c, (u) => M(u), LA, Math.min(lt, HIT), P.ink2, 2.5);
      if (lt < SEEK) A.line(c, [[fx, fy], [mx, my]], P.sky, S.L(c, 3), [10, 10]);
      if (lt < HIT) {
        S.cone(c, mx, my, mh, 0.35, 9000, P.sky, 0.3 * A.sm(lt, SEEK, SEEK + 0.4));
        S.missileSide(c, mx, my, ic * 0.55, mh, { flame: lt < LA + 3 ? 1 : 0.2, t });
      }
    }
    // tên lửa địch bắn trả
    if (lt > ELA && lt < 15.6) {
      const [qx, qy, qh] = EM(lt);
      S.trail(c, (u) => EM(u), ELA, lt, P.enemyLight, 2.5);
      A.withA(c, 1 - A.sm(lt, 14.8, 15.6), () => S.missileSide(c, qx, qy, ic * 0.55, qh, { flame: lt < ELA + 3 ? 1 : 0.2, t }));
    }
    S.trail(c, (u) => F(u), Math.max(0, lt - 6), lt, P.oliveLight, 3);
    if (lt < HIT + 0.05) S.jetTop(c, ex, ey, HE, ic, { side: S.ENEMY, t });
    S.boom(c, Pi[0], Pi[1], 2600, A.ph(lt, HIT, HIT + 1.4));
    S.jetTop(c, fx, fy, fh, ic, { t, ab: 0.2 });
    K.end(c);
  }
}
