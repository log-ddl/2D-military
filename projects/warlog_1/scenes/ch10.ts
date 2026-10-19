// Chương 10 (402.6–432.3): cột xe kẹt vì hệ thống, không vì một chiếc xe tăng.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as W from './_world';
import * as V from './_assets';
import { CUE as Q } from './_cue';
import { dip, type Pt } from './_common';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    const cam = K.track(t, [[402.56, { x: 300, y: 0, z: 1.25 }], [413, { x: 300, y: 0, z: 1.25 }], [422, { x: 900, y: 0, z: 0.8 }], [432.2, { x: 1500, y: 0, z: 0.5 }]], A.eio);
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 300, patches: true });
    const road: Pt[] = [];
    for (let x = -1500; x <= 4500; x += 100) road.push([x, 40 * Math.sin(x / 800)]);
    W.topRoad(c, road, 90);
    const y = (x: number) => 40 * Math.sin(x / 800);
    // cột: tăng đứng đầu, bồn xăng (cạn) và xe cứu thiếu (trống chỗ)
    const kinds = ['tank', 'tank', 'tanker', 'truck', 'tank', 'tanker', 'truck', 'gap', 'tank', 'tanker'];
    const stuck = A.sm(t, Q.stuck, Q.stuck + 1.5);
    kinds.forEach((k, i) => {
      const x = 800 - i * 260 - (1 - A.eo(t, 402.6, 404)) * 400 + stuck * 0;
      if (k === 'gap') {
        if (t > Q.failure) { const [sx, sy] = K.toScreen(cam, x, y(x)); U.xMark(c, sx, sy, 22, A.eo(t, Q.failure, Q.failure + 0.5), P.enemy, 6); }
        return;
      }
      c.save(); c.translate(x, y(x)); c.rotate(Math.atan2(y(x + 1) - y(x), 1));
      if (k === 'tank') V.tankTop(c, 0, 0, 1, {});
      else V.truckTop(c, 0, 0, 1, { load: k === 'tanker' ? 'tanker' : 'tarp' });
      c.restore();
      if (k === 'tanker' && t > Q.stuck) {
        const [sx, sy] = K.toScreen(cam, x, y(x) - 60);
        A.rrect(c, sx - 30, sy - 8, 60, 14, 6, '#fff', P.ink, 3);
        A.rrect(c, sx - 27, sy - 5, 54 * (1 - stuck), 8, 3, P.amber, null, 0);
      }
    });
    // đoạn xa: cột dài kẹt
    for (let i = 0; i < 14; i++) {
      const x = 800 - 11 * 260 - i * 230;
      c.save(); c.translate(x, y(x)); c.rotate(Math.atan2(y(x + 1) - y(x), 1)); V.truckTop(c, 0, 0, 1, {}); c.restore();
    }
    // 2022 Ukraine / Kyiv: hướng bắc → thủ đô; sơ đồ minh hoạ
    const ar = A.eo(t, Q.ukraine + 1.0, Q.kyiv + 2.0);
    K.end(c);
    if (ar > 0) {
      const [sx, sy] = K.toScreen(cam, 1400, 0);
      A.rrect(c, sx - 40, sy - 36, 80, 72, 8, '#d3dbe2', P.ink, 3);
    }
    if (t > Q.ukraine && t < Q.kyiv + 0.5) U.label(c, '2022', 960, 120, 72, P.ink, A.win(t, Q.ukraine + 1.5, Q.kyiv, 0.3, 0.3));
    dip(c, t, 402.56, 0.2);
  }
}
