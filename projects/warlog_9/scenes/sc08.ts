import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C4: phát radar = bị nghe; máy thu nghe xa hơn radar thấy. 144–168.4 */
const F = (t: number): [number, number] => [-17000 + 160 * (t - 144), 2000];
function E(t: number): [number, number, number] {
  // địch giữ hướng tây, 158.5 quay đầu ra xa
  const turn = A.eio(t, 158.5, 162.5);
  const h = A.lerp(Math.PI, Math.PI * 0.05 - 0.0, turn) ;
  let x = 26000, y = -5000;
  const dt = 1 / 15;
  for (let u = 144; u < t; u += dt) {
    const hh = A.lerp(Math.PI, 0.1, A.eio(u, 158.5, 162.5));
    const d = Math.min(dt, t - u);
    x += Math.cos(hh) * 220 * d; y += Math.sin(hh) * 220 * d;
  }
  return [x, y, h];
}

export default class Sc08 extends CanvasScene {
  protected draw(c: C2, t: number) {
    const cam = K.track(t, [[144, { x: 4000, y: 0, z: 0.03 }], [168.4, { x: 4000, y: 0, z: 0.027 }]]);
    S.mapBg(c, cam, 1000);
    K.begin(c, cam);
    const ic = 0.22 / cam.z;
    const [fx, fy] = F(t), [ex, ey, eh] = E(t);
    const radarOn = 1 - A.sm(t, 165.8, 166.6);
    // vòng máy thu địch nghe được (lớn) và vòng radar thấy (nhỏ)
    const R1 = 21000, R2 = 50000;
    A.withA(c, A.sm(t, 151.0, 152.0), () => S.ring(c, fx, fy, R2, P.enemy, 4, [18, 14]));
    A.withA(c, A.sm(t, 154.2, 155.2) * radarOn, () => S.ring(c, fx, fy, R1, P.sky, 4));
    // sóng phát lan ra trong nón
    const dir = 0.35 * Math.sin((t - 144) * 1.6);
    S.cone(c, fx, fy, dir, 0.45, R1, P.sky, 0.12 * radarOn);
    for (let i = 0; i < 6; i++) {
      const p = ((t - 144) * 0.55 + i / 6) % 1;
      const R = p * R2;
      A.withA(c, (1 - p) * 0.9 * radarOn * A.sm(t, 145.8, 146.4), () => {
        c.beginPath(); c.arc(fx, fy, R, dir - 0.45, dir + 0.45); A.fs(c, null, P.sky, S.L(c, 3));
      });
    }
    // địch nghe thấy: vòng nháy và đường hướng chỉ về nguồn phát
    const heard = A.sm(t, 147.1, 147.6);
    if (heard > 0) {
      const pr = (t * 1.5) % 1;
      S.ring(c, ex, ey, 1500 + pr * 3500, P.enemy, 3, undefined, (1 - pr) * heard * radarOn);
      A.withA(c, A.sm(t, 149.6, 150.4) * (1 - A.sm(t, 163, 164)), () => A.line(c, [[ex, ey], [fx, fy]], P.enemy, S.L(c, 3), [14, 12]));
    }
    // tiếng vọng radar: quá yếu, tắt trước khi về tới
    for (let i = 0; i < 3; i++) {
      const p = A.ph(t, 154.2 + i * 1.1, 156.4 + i * 1.1);
      if (p <= 0 || p >= 1) continue;
      const cx = A.lerp(ex, fx, p * 0.6), cy = A.lerp(ey, fy, p * 0.6);
      const back = Math.atan2(fy - ey, fx - ex);
      A.withA(c, (1 - p) * 0.9, () => {
        c.beginPath(); c.arc(cx, cy, 2200, back - 0.6, back + 0.6); A.fs(c, null, P.sky, S.L(c, 3 * (1 - p) + 0.5));
      });
    }
    S.jetTop(c, ex, ey, eh, ic, { side: S.ENEMY, t, ab: 0.2 });
    S.jetTop(c, fx, fy, 0, ic, { t, ab: 0.2 });
    K.end(c);
  }
}
