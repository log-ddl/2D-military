import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C5: ngắm bằng mũ — tên lửa nhìn theo ánh mắt, không theo mũi. 202.2–213.4 */
export default class Sc10 extends CanvasScene {
  protected draw(c: C2, t: number) {
    const cam = K.track(t, [[202.2, { x: 60, y: -120, z: 0.95 }], [213.4, { x: 80, y: -150, z: 1.02 }]]);
    A.clear(c, '#e3ead9');
    K.begin(c, cam);
    for (let i = 0; i < 7; i++) S.cloud(c, ((i * 430 - (t - 202) * 160) % 2600 + 2600) % 2600 - 1100, -600 + (i % 3) * 420, 1.0);
    const jx = -330, jy = 140, s = 1.5;
    const hx = jx + 98 * s, hy = jy;
    const eAng = -0.95, eD = 760;
    const ex = hx + Math.cos(eAng) * eD + (t - 206) * 6, ey = hy + Math.sin(eAng) * eD;
    const head = -0.95 * A.eio(t, 208.3, 209.9);
    const seek = t < 210.5 ? 0 : A.lerp(0, head, A.eio(t, 210.5, 211.3));
    // mũi máy bay: hướng cố định
    A.withA(c, A.sm(t, 211.9, 212.4), () => A.line(c, [[jx + 215 * s, jy], [jx + 215 * s + 700, jy]], P.ink2, S.L(c, 3), [14, 12]));
    // ánh nhìn
    const ga = A.sm(t, 204.4, 205.0);
    S.cone(c, hx, hy, head, 0.07, 1100, P.sky, 0.28 * ga);
    A.withA(c, ga, () => {
      const rx = hx + Math.cos(head) * eD, ry = hy + Math.sin(head) * eD;
      S.ring(c, rx, ry, 46, P.sky, 4);
      A.line(c, [[rx - 64, ry], [rx - 30, ry]], P.sky, S.L(c, 4)); A.line(c, [[rx + 30, ry], [rx + 64, ry]], P.sky, S.L(c, 4));
    });
    // đầu dò tên lửa
    const mx = jx - 60 * s, my = jy - 62 * s;
    const sa = A.sm(t, 206.0, 206.6);
    const lock = A.sm(t, 211.2, 211.5);
    S.cone(c, mx, my, seek, 0.12, 1050, A.lerpColor(P.amber, P.enemy, lock), 0.22 * sa);
    A.withA(c, sa, () => { c.beginPath(); c.arc(mx, my, 1050, seek - 0.12, seek + 0.12); A.fs(c, null, P.amber, S.L(c, 3)); });
    if (lock > 0) A.withA(c, lock, () => { c.save(); c.translate(ex, ey); c.rotate(Math.PI / 4 + t); A.rrect(c, -60, -60, 120, 120, 8, null, P.enemy, S.L(c, 4)); c.restore(); });
    S.jetTop(c, ex, ey, Math.PI + 0.35, 0.38, { side: S.ENEMY, t });
    S.jetTop(c, jx, jy, 0, s, { t, ab: 0.2, stores: 2, head });
    K.end(c);
  }
}
