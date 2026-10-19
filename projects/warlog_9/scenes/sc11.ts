import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C5: tên lửa là một máy bay nhỏ — mặt cắt. 213.4–228.2 */
export default class Sc11 extends CanvasScene {
  protected draw(c: C2, t: number) {
    const cam = K.track(t, [
      [213.4, { x: 0, y: 0, z: 0.8 }], [218.0, { x: 0, y: 0, z: 0.8 }],
      [219.0, { x: 0, y: 0, z: 0.95 }], [220.2, { x: -230, y: 0, z: 1.1 }],
      [222.6, { x: -230, y: 0, z: 1.1 }], [223.6, { x: 260, y: 0, z: 1.2 }],
      [225.0, { x: 260, y: 0, z: 1.2 }], [226.0, { x: 0, y: 0, z: 0.9 }],
    ], A.eio);
    const bgFly = 1 - A.sm(t, 218.0, 218.8);
    A.clear(c, P.paper);
    A.withA(c, bgFly, () => A.clear(c, P.bg));
    K.begin(c, cam);
    // vạch tốc độ khi đang bay
    const speedA = Math.max(bgFly, A.sm(t, 225.8, 226.3));
    A.withA(c, speedA * 0.8, () => {
      for (let i = 0; i < 14; i++) {
        const y = -380 + i * 58, x = ((-(t * 2400) + A.rnd(i) * 3000) % 3000 + 3000) % 3000 - 1500;
        A.line(c, [[x, y], [x + 160 + A.rnd(i + 3) * 200, y]], P.light, S.L(c, 3));
      }
    });
    if (bgFly > 0) A.withA(c, bgFly, () => { for (let i = 0; i < 4; i++) S.cloud(c, ((i * 700 - t * 1400) % 2800 + 2800) % 2800 - 1400, -300 + (i % 2) * 600, 1.1); });
    const cut = A.sm(t, 218.2, 218.9);
    const motor = A.win(t, 220.4, 222.5, 0.15, 0.4);
    const flame = t < 218.2 ? 1 : motor;
    let hl = -2;
    if (t > 220.3) hl = 3;
    if (t > 222.7) hl = 1;
    if (t > 223.9) hl = 0;
    if (t > 225.0) hl = -1;
    const wob = Math.sin(t * 3) * 0.04 * A.sm(t, 225.8, 226.4);
    S.missileSide(c, 0, Math.sin(t * 2) * 6, 4.4, wob, { flame, cut, hl: hl === -2 ? -1 : hl, t, seeker: t * 2.5 * (hl === 0 ? 1 : 0) });
    // cánh lái nổi lên khi được nhắc
    const fa = A.win(t, 225.0, 226.8, 0.2, 0.5);
    if (fa > 0) A.withA(c, fa, () => {
      c.save(); c.translate(0, Math.sin(t * 2) * 6); c.rotate(wob); c.scale(4.4, 4.4);
      for (const sy of [-1, 1]) {
        A.poly(c, [[-70, -10 * sy], [-82, -32 * sy], [-100, -32 * sy], [-100, -10 * sy]], null, P.amber, S.L(c, 5));
      }
      c.restore();
    });
    K.end(c);
  }
}
