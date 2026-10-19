// Chương 5 (162.4–201.5): IFV: thêm pháo, mất chỗ, đắt hơn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as R from './shared/rig';
import { P } from './shared/palette';
import * as V from './_assets';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { dip, sideCam, halo } from './_common';

const SK_FOE = { body: P.enemyLight, limb: P.enemy, hat: true };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    if (t < 169.8) this.morph(c, t);
    else if (t < 178.6) this.advance(c, t, 169.8, 0);
    else if (t < 190.3) this.inside(c, t);
    else if (t < 196.0) this.compare(c, t);
    else this.advance(c, t, 196.0, 1);
    dip(c, t, 162.38, 0.25);
    dip(c, t, 169.8, 0.15);
    dip(c, t, 178.6, 0.15);
    dip(c, t, 196.0, 0.15);
  }

  // NGANG, mặt cắt: APC + tháp pháo = IFV
  private morph(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(0, 5.0, 900);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0 });
    const m = A.sm(t, Q.turret, Q.turret + 1.0);
    if (m < 1) V.apc(c, 0, 0, 1, { cut: 1, riders: 7, spacing: 13, a: 1 - m });
    if (m > 0) {
      const drop = (1 - A.eo(t, Q.turret, Q.turret + 0.9)) * 70;
      V.ifv(c, 0, -drop * 0.0, 1, { cut: 1, riders: 6, a: m, fire: A.bump(t, 168.2, 0.25) });
    }
    if (t > 168.1 && t < 169.7) {
      const mz: [number, number] = [92, -76];
      F.muzzleFlash(c, mz[0], mz[1], 0, A.ph(t, 168.2, 168.45), 0.5);
    }
    K.end(c);
    if (t > 165.8 && t < 169.6) {
      const [sx, sy] = K.toScreen(cam, 0, -100);
      U.callout(c, 'IFV', sx, sy - 190, { to: [sx, sy - 10], p: A.win(t, Q.ifvIs + 1.9, 169.5, 0.3, 0.3), size: 44 });
    }
    if (t > Q.turret) {
      const [sx, sy] = K.toScreen(cam, 6, -96);
      halo(c, sx, sy, 78 * 1.0 * 1.2, 40, A.win(t, Q.turret + 0.2, 169.4, 0.2, 0.4), P.amber, 6);
    }
  }

  // NGANG: IFV đi cùng lính, bắn qua đầu họ
  private advance(c: CanvasRenderingContext2D, t: number, t0: number, round: number) {
    const ix = 100 + 38 * (t - t0);
    const cam = sideCam(ix + 300, 2.2, 820);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: ix, road: false });
    const targets = round
      ? [{ k: 'bunker', x: 640, hit: 198.0 }, { k: 'inf', x: 800, hit: 199.5 }]
      : [{ k: 'truck', x: 640, hit: 175.3 }, { k: 'bunker', x: 800, hit: 176.7 }, { k: 'inf', x: 920, hit: 177.9 }];
    for (const g of targets) {
      const dead = A.sm(t, g.hit, g.hit + 0.2);
      const a = 1 - dead * 0.65;
      if (g.k === 'truck') V.truck(c, g.x, 0, 1, { side: 'foe', flip: true, a });
      if (g.k === 'bunker') {
        c.save(); c.globalAlpha = a;
        c.beginPath(); c.moveTo(g.x - 60, 0); c.quadraticCurveTo(g.x - 50, -52, g.x, -54); c.quadraticCurveTo(g.x + 50, -52, g.x + 60, 0); c.closePath();
        A.fs(c, P.enemyLight, P.ink, A.px(c, 3)); A.rrect(c, g.x - 30, -36, 44, 9, 3, P.dark, P.ink, A.px(c, 2));
        c.restore();
      }
      if (g.k === 'inf') for (let i = 0; i < 3; i++) R.rig(c, { x: g.x + i * 26, y: 0, s: 0.5, skin: SK_FOE, dir: -1, alpha: a, lie: dead > 0.5 ? 'dead' : null });
      const p = A.ph(t, g.hit, g.hit + 0.6);
      if (p > 0 && p < 1) F.explosion(c, g.x, -30, 50, p);
    }
    for (let i = 0; i < 4; i++) R.rig(c, { x: ix + 150 + i * 34, y: 0, s: 0.5, walk: t * 4 + i * 1.3 });
    V.ifv(c, ix, 0, 1, { ph: ix * 1.2, lift: Math.sin(t * 5) * 0.4, fire: 0 });
    const muz: [number, number] = [ix + 92, -76];
    for (const g of targets) {
      const b0 = g.hit - 1.3, b1 = g.hit + 0.1;
      if (t > b0 && t < b1) {
        const tgY = g.k === 'inf' ? -28 : g.k === 'bunker' ? -30 : -42;
        for (let j = 0; j < 4; j++) {
          const u = ((t - b0) * 3.2 + j / 4) % 1;
          F.tracer(c, muz, [g.x, tgY], u, 0.12, P.amber, 4);
        }
        F.muzzleFlash(c, muz[0], muz[1], 0, A.ph((t * 8) % 1, 0, 0.7), 0.5);
      }
    }
    K.end(c);
  }

  // NGANG, mặt cắt: Bradley, ba tổ lái + sáu lính, rồi đạn chiếm chỗ lính
  private inside(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(0, 5.0, 900);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: false });
    const ammo = A.sm(t, Q.space, Q.space + 1.0);
    V.ifv(c, 0, 0, 1, { cut: 1, riders: 6, ammo });
    // chỗ trống đáng ra có người
    if (ammo > 0.2) {
      A.withA(c, ammo * 0.5, () => {
        for (let i = 0; i < 3; i++) { c.save(); c.setLineDash([5, 4]); V.bust(c, -52 + i * 16, -36, 0.6, '#ffffff', '#ffffff'); c.restore(); }
      });
    }
    K.end(c);
    const [sx, sy] = K.toScreen(cam, 0, -90);
    if (t > 178.8 && t < 181.4) U.callout(c, 'Bradley', sx, sy - 170, { to: [sx, sy + 30], p: A.win(t, Q.bradley, 181.6, 0.3, 0.3), size: 44 });
    // tổ lái 3 → lính 6
    const crewP = A.win(t, Q.crew, Q.crew + 1.6, 0.2, 0.3);
    const [c1x, c1y] = K.toScreen(cam, 12, -72), [c2x, c2y] = K.toScreen(cam, 52, -44);
    halo(c, c1x, c1y, 120, 60, crewP, P.sky, 6);
    halo(c, c2x, c2y, 40, 50, crewP, P.sky, 6);
    const [r1x, r1y] = K.toScreen(cam, -40, -36);
    halo(c, r1x, r1y, 240, 62, A.win(t, Q.crew + 1.0, Q.trade, 0.2, 0.3), P.amber, 6);
  }

  // NGANG: APC (đông hơn, rẻ) bên trái, IFV (ít người hơn, đắt) bên phải
  private compare(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(0, 3.3, 880);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: false });
    V.apc(c, -170, 0, 1, { cut: 1, riders: 8, spacing: 12.5 });
    V.ifv(c, 150, 0, 1, { cut: 1, riders: 6, ammo: 1 });
    // giá
    const k = A.eo(t, Q.costs, Q.costs + 1.2);
    V.coins(c, -170, -92, Math.round(2 * Math.min(1, k * 1.5)), 1.5, 1);
    V.coins(c, 150, -122, Math.round(7 * k), 1.5, 1);
    K.end(c);
  }
}
