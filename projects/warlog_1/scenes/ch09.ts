// Chương 9 (375.6–402.6): quy luật: mạnh một chỗ, trả giá ở xe kế.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as W from './_world';
import * as V from './_assets';
import { CUE as Q } from './_cue';
import { sideCam, dip, LINE, LINE_ORDER, type LineKey } from './_common';
import { drawKind, TOP_OF } from './_lineup';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    const cam = sideCam(636, 1.45, 800);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, roadA: 0 });
    // mỗi xe sáng lên khi voice nói tới nó; xe còn lại mờ
    const stages: [LineKey, number, number][] = [['truck', Q.truckCheap, Q.carrierCant], ['apc', Q.carrierCant, Q.ifvLight], ['ifv', Q.ifvLight, Q.tankHungry], ['tank', Q.tankHungry, Q.noBest], ['arv', Q.tankHungry + 2.2, Q.noBest]];
    LINE_ORDER.forEach((k) => {
      let on = 0.4;
      for (const [kk, a, b] of stages) if (kk === k && t > a && t < b) on = 1;
      if (t > Q.noBest) on = 1;
      drawKind(c, k, LINE[k], 0, 1, { a: on });
    });
    K.end(c);
    // mạnh (xanh) / trả giá (đỏ) trên mỗi xe, rồi mũi tên sang xe kế
    const items: { k: LineKey; to: LineKey; t0: number }[] = [
      { k: 'truck', to: 'apc', t0: Q.truckCheap }, { k: 'apc', to: 'ifv', t0: Q.carrierCant }, { k: 'ifv', to: 'tank', t0: Q.ifvLight },
      { k: 'tank', to: 'arv', t0: Q.tankHungry }, { k: 'tank', to: 'bridge', t0: Q.tankHungry + 2.4 },
    ];
    items.forEach((it) => {
      const [ax, ay] = K.toScreen(cam, LINE[it.k], -TOP_OF[it.k] - 14), [bx, by] = K.toScreen(cam, LINE[it.to], -TOP_OF[it.to] - 14);
      const p = A.eo(t, it.t0 + 1.2, it.t0 + 2.0);
      V.flaw(c, ax, ay - 56, 1.7, A.eo(t, it.t0 + 0.2, it.t0 + 0.9));
      const h = 90 + Math.abs(bx - ax) * 0.18, pts: [number, number][] = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([A.lerp(ax, bx, u), A.lerp(ay, by, u) - 10 - 4 * h * u * (1 - u)]); }
      U.pathArrow(c, pts, { p, color: P.amber, w: 8, head: 26 });
    });
    // "không có xe tốt nhất": giá trả bởi xe kế (đồng xu)
    if (t > Q.noBest) {
      LINE_ORDER.forEach((k, i) => V.coins(c, K.toScreen(cam, LINE[k], 0)[0], 280, Math.round(1 + 3 * A.eo(t, Q.noBest + i * 0.25, Q.noBest + i * 0.25 + 0.8)), 1.3));
    }
    dip(c, t, 375.58, 0.2);
  }
}
