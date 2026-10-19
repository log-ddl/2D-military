import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

/** C2: lực đẩy lớn hơn trọng lượng → leo thẳng đứng. 42.1–54.5 */
const T0 = 42.1;
const pitchAt = (t: number) => -Math.PI / 2 * A.eio(t, 51.8, 53.0);
const speedAt = (t: number) => 520 + 380 * A.sm(t, 52.4, 54.5);
function posAt(t: number): [number, number] {
  // tích phân tất định theo bước cố định
  let x = 0, y = 0;
  const dt = 1 / 30;
  for (let u = T0; u < t; u += dt) {
    const h = Math.min(dt, t - u), a = pitchAt(u), v = speedAt(u);
    x += Math.cos(a) * v * h; y += Math.sin(a) * v * h;
  }
  return [x, y];
}

export default class Sc03 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    const [x, y] = posAt(t);
    const rot = pitchAt(t);
    const lead = K.mix({ x: x + 120, y: y, z: 0.95 }, { x: x, y: y - 160, z: 0.8 }, A.eio(t, 51.8, 53.4));
    const cam = lead;
    S.skyBg(c, cam, t, 0);
    K.begin(c, cam);
    S.jetSide(c, x, y, 2.0, rot, { t, ab: 0.25 + 0.75 * A.sm(t, 51.6, 52.2), pilot: true });
    // lực: trọng lượng (luôn hướng xuống) và lực đẩy (dọc trục máy bay)
    const wA = A.sm(t, 47.3, 47.9);
    const wLen = 250 - 50 * A.sm(t, 50.3, 51.3);
    const thLen = A.lerp(110, 330, A.eo(t, 47.2, 49.6));
    A.withA(c, wA, () => S.arrow(c, x, y + 10, x, y + 10 + wLen, 34, P.dark));
    const tA = A.sm(t, 46.9, 47.4);
    const ca = Math.cos(rot), sa = Math.sin(rot);
    const bx = x + ca * 460, by = y + sa * 460;
    A.withA(c, tA, () => S.arrow(c, bx, by, bx + ca * thLen, by + sa * thLen, 34, P.amber));
    K.end(c);
  }
}
