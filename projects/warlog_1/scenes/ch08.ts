// Chương 8 (347.5–375.6): mặt đất cũng là kẻ thù: xe công binh mở đường.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as V from './_assets';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { dip, sideCam, at, type Pt } from './_common';

const T_SIDE = 359.4;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    if (t < T_SIDE) this.column(c, t); else this.span(c, t);
    dip(c, t, T_SIDE, 0.15);
  }

  // TRÊN: cột xe dừng trước sông, mìn, hào, cầu gãy
  private column(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 650, y: 0, z: 0.95 };
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 250, patches: true });
    W.topRiver(c, [[1300, -800], [1300, 800]], 140);
    W.topRoad(c, [[-600, 0], [1000, 0]], 80);
    W.topRoad(c, [[1600, 0], [2000, 0]], 80);
    // cầu gãy
    A.withA(c, A.sm(t, 355.0, 355.6), () => {
      A.rrect(c, 1240, -30, 60, 60, 4, '#b3bcc6', P.ink, A.px(c, 3));
    });
    // mìn
    const mp = A.sm(t, 354.2, 354.8);
    A.withA(c, mp, () => { for (let i = 0; i < 9; i++) A.circle(c, 780 + (i % 3) * 60, -60 + Math.floor(i / 3) * 50 - 0, 9, P.enemy, P.ink, A.px(c, 2)); });
    // hào chống tăng
    A.withA(c, A.sm(t, 353.6, 354.2), () => { c.fillStyle = '#8a7a58'; c.fillRect(540, -260, 40, 520); });
    // cột xe dừng
    const stop = A.eio(t, 347.8, 350.0);
    const xs = [380, 240, 100, -40, -180];
    xs.forEach((x, i) => {
      const px = x - (1 - stop) * 600;
      if (i === 0) V.tankTop(c, px, 0, 1, {});
      else if (i % 2) V.truckTop(c, px, 0, 1, {});
      else V.ifvTop(c, px, 0, 1, {});
    });
    // xe công binh lần lượt tới (360 chuyển sang NGANG)
    const arrive = (t0: number) => A.eo(t, t0, t0 + 1.6);
    if (t > Q.engineer - 0.5) V.bridgeLayerTop(c, A.lerp(-300, 560, arrive(Q.engineer - 0.5)), 90, 1, { u: 0 });
    K.end(c);
  }

  // NGANG: nhịp cầu bung qua khe; xe phá mìn; xe ủi
  private span(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(520, 1.55, 830);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: false });
    W.sideGap(c, 560, 980, 70, true);
    // cầu: xe cầu chạy tới bờ, bung nhịp (360.5–364.5)
    const u = A.eio(t, 361.0, 364.0);
    const lx = A.lerp(40, 400, A.eio(t, T_SIDE, 361.0));
    if (t < 365.2) V.bridgeLayer(c, lx, 0, 1, { u: t > 361 ? u : 0, ph: lx * 1.2 });
    // nhịp đã bắc
    const laid = A.sm(t, 364.0, 364.6);
    if (laid > 0) V.bridgeDeck(c, 520, 1020, -6, 1, 10);
    // 365.3: xe phá mìn đẩy lưỡi cày; 369.9 pháo rãnh nổ dây; 370: ủi
    if (t > 365.3) {
      const mx = A.lerp(-250, 820, A.eio(t, 365.3, 370.0));
      V.tank(c, mx, 0, 1, { ph: mx * 1.2 });
      // lưỡi cày phía trước: răng cào
      for (let i = 0; i < 5; i++) A.line(c, [[mx + 86 + i * 0, -4 - i * 5], [mx + 112, 8 - i * 5]], P.ink, A.px(c, 4));
      // dây thuốc nổ bắn phía trước
      const rp = A.ph(t, 367.4, 368.6);
      if (rp > 0 && rp < 1) A.line(c, [[mx + 90, -70], [A.lerp(mx + 90, mx + 560, rp), -70 - 20 * Math.sin(rp * Math.PI)]], P.amber, A.px(c, 4), [10, 8]);
      if (rp >= 1 && t < 369.4) F.explosion(c, mx + 560, -4, 80, A.ph(t, 368.6, 369.4));
    }
    K.end(c);
    void at; void U; void P;
  }
}
