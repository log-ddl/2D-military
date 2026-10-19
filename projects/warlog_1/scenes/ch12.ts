// Chương 12 (456.3–478.5): điều không có trong ảnh: họ xe là vũ khí.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { sideCam, dip, LINE, LINE_ORDER } from './_common';
import { drawKind } from './_lineup';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    const cam = sideCam(636, 1.45, 800);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, roadA: 0 });
    // xe tăng trong "bức ảnh"; từng xe hiện quanh nó theo lời
    const at0: Record<string, number> = { truck: Q.truckFed, apc: Q.carrierWalked, ifv: Q.ifvCovered, arv: Q.recovery, bridge: Q.bridgeGot };
    LINE_ORDER.forEach((k) => {
      if (k === 'tank') { drawKind(c, k, LINE[k], 0, 1, {}); return; }
      const p = A.eo(t, at0[k]!, at0[k]! + 0.8);
      if (p <= 0) return;
      c.save(); c.translate(LINE[k], 0); c.scale(p, p); drawKind(c, k, 0, 0, 1, { a: p }); c.restore();
    });
    K.end(c);
    // khung ảnh quanh xe tăng lúc đầu
    const fr = 1 - A.sm(t, Q.truckFed - 0.4, Q.truckFed + 0.2);
    if (fr > 0) {
      const [sx, sy] = K.toScreen(cam, LINE.tank, -50);
      U.focus(c, sx - 240, sy - 130, 480, 260, fr, P.ink, 7);
    }
    // họ xe: nối các xe bằng mắt xích
    const fam = A.eo(t, Q.family, Q.family + 1.4);
    if (fam > 0) {
      for (let i = 0; i < LINE_ORDER.length - 1; i++) {
        const [ax] = K.toScreen(cam, LINE[LINE_ORDER[i]!], 0), [bx] = K.toScreen(cam, LINE[LINE_ORDER[i + 1]!], 0);
        A.withA(c, fam, () => A.line(c, [[ax + 60, 660], [bx - 60, 660]], P.amber, 8));
      }
    }
    dip(c, t, 456.34, 0.2);
  }
}
