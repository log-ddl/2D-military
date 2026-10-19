import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
type Pt = [number, number];
/** C3: fly-by-wire — máy tính sửa liên tục, cần lái chỉ là yêu cầu. 98.0–112.0 */
export default class Sc06 extends CanvasScene {
  protected draw(c: C2, t: number) {
    const cam = K.track(t, [[98, { x: 0, y: 0, z: 1.0 }], [107.2, { x: 0, y: 0, z: 1.0 }], [112, { x: 0, y: 20, z: 0.86 }]], A.eio);
    S.skyBg(c, cam, t, -380);
    K.begin(c, cam);
    const on = A.sm(t, 99.7, 100.1);
    // tư thế: đang chực nhào → máy tính kéo về; vi chỉnh liên tục
    const micro = 0.012 * Math.sin(t * 13) + 0.008 * Math.sin(t * 23.7);
    let pitch = A.lerp(-0.3 - 0.25 * A.sm(t, 98, 99.8), 0, A.eio(t, 99.8, 101.0)) + micro * on;
    pitch += -0.2 * A.eio(t, 105.4, 106.8);
    const req = A.sm(t, 103.4, 103.9);
    const elev = on * (-micro * 6 + 0.35 * A.win(t, 99.8, 100.8, 0.1, 0.3)) - 0.3 * A.win(t, 105.2, 106.6, 0.2, 0.5);
    const s = 2.5, jx = -40, jy = 0;
    S.jetSide(c, jx, jy, s, pitch, { t, ab: 0.3, elev, pilot: true, glow: [] });
    // lớp sơ đồ bên trong (toạ độ cục bộ máy bay)
    c.save(); c.translate(jx, jy); c.rotate(pitch); c.scale(s, s);
    const stick: Pt = [96, -14], comp: Pt = [-30, -6], tail: Pt = [-160, 8], wing: Pt = [-70, 14];
    // cần lái
    A.line(c, [[96, -4], [96 - req * 8, -24]], P.ink, S.L(c, 4));
    A.circle(c, 96 - req * 8, -24, 3, P.dark, null);
    // dây
    for (const [a, b] of [[stick, comp], [comp, tail], [comp, wing]] as [Pt, Pt][])
      A.line(c, [a, b], P.sky, S.L(c, 3), [6, 6]);
    // hộp máy tính
    const pulse = on * (0.5 + 0.5 * Math.sin(t * 30));
    A.rrect(c, comp[0] - 22, comp[1] - 12, 44, 24, 4, A.lerpColor(P.dark, P.sky, 0.4 + 0.5 * pulse), P.ink, S.L(c, 2.5));
    // xung sửa lỗi: hàng trăm mỗi giây (minh hoạ chậm)
    if (on > 0) {
      for (const tgt of [tail, wing]) {
        for (let i = 0; i < 6; i++) {
          const p = (t * 2.4 + i / 6) % 1;
          A.circle(c, A.lerp(comp[0], tgt[0], p), A.lerp(comp[1], tgt[1], p), 3, P.sky, null);
        }
      }
    }
    // yêu cầu của phi công: một xung amber lớn
    const r1 = A.ph(t, 104.1, 104.9), r2 = A.ph(t, 105.0, 105.6);
    if (r1 > 0 && r1 < 1) A.circle(c, A.lerp(stick[0], comp[0], r1), A.lerp(stick[1], comp[1], r1), 7, P.amber, P.ink, S.L(c, 1.5));
    if (r2 > 0 && r2 < 1) A.circle(c, A.lerp(comp[0], tail[0], r2), A.lerp(comp[1], tail[1], r2), 7, P.amber, P.ink, S.L(c, 1.5));
    c.restore();
    K.end(c);
  }
}
