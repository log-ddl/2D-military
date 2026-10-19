// Chương 1 (0–41.8): vì sao một xe tăng cần cả đoàn xe?
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as V from './_assets';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { dip, sideCam, halo, LINE, LINE_ORDER, type LineKey } from './_common';
import { drawKind, TOP_OF } from './_lineup';

const COL_X = { tank: 700, truck: 480, apc: 300, ifv: 130, arv: -90, bridge: -330 } as const; // đoàn xe trên đường
const ENTER: Record<string, number> = { truck: 5.7, apc: 6.4, ifv: 7.1, arv: 7.8, bridge: 8.5 };

/** Quãng đường đã lăn: chạy đều rồi dừng dần sau khi xe tăng bị bỏ lại một mình. */
function dist(t: number) {
  const v = 170;
  if (t < 14.7) return v * t;
  const tau = Math.min(1.5, t - 14.7);
  return v * 14.7 + v * (tau - (tau * tau) / 3);
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    if (t < Q.oneBest) this.road(c, t);
    else if (t < Q.answer) this.grid(c, t);
    else this.line(c, t);
    dip(c, t, Q.oneBest, 0.18);
    dip(c, t, Q.answer, 0.18);
  }

  // NGANG: đường → đoàn xe → bỏ đoàn xe → hàng xe (liền một máy)
  private road(c: CanvasRenderingContext2D, t: number) {
    // máy: toàn đoàn → áp sát xe tăng đỗ → lùi ra thấy cả hàng
    const hero = sideCam(640, 2.2, 800), wide = sideCam(190, 1.2, 760), close = sideCam(700, 2.1, 860), row = sideCam(636, 1.45, 800);
    let cam = K.track(t, [[0, hero], [5.0, hero], [10.0, wide], [14.4, wide], [17.2, close]], A.eio);
    if (t > Q.question) cam = K.mix(close, row, A.eio(t, Q.question, Q.question + 3));
    const sc = dist(t);
    c.save();
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: sc, roadA: 1 - A.sm(t, 14.2, 16.4) });

    // xe tăng
    const f1 = 1.0, f2 = Q.tankFires + 0.1;
    const rec = Math.max(A.bump(t, f1, 0.4), A.bump(t, f2, 0.4));
    const tankOpt: V.TankO = { ph: sc, recoil: rec, lift: t < 14.7 ? Math.sin(t * 6) * 0.6 : 0 };
    V.tank(c, COL_X.tank, 0, 1, tankOpt);
    const mz = V.tankMuzzle(COL_X.tank, 0, 1, tankOpt);
    for (const f of [f1, f2]) {
      F.muzzleFlash(c, mz[0], mz[1], 0, A.ph(t, f, f + 0.18), 0.9);
      if (t > f && t < f + 2.4) F.smoke(c, mz[0] + 14, mz[1] - 4, t - f, 0.6, 4, '#aab0b8', 18);
      F.straightShot(c, [mz[0] + 30, mz[1]], [mz[0] + 1500, mz[1] - 40], A.ph(t, f, f + 1.6), { color: P.amber, w: 3, trail: 0.12, head: (cc, x, y, a) => V.shellHead(cc, x, y, a) });
    }

    // đoàn xe vào rồi bị bỏ lại
    const keys = ['truck', 'apc', 'ifv', 'arv', 'bridge'] as const;
    keys.forEach((k, i) => {
      const inP = A.eo(t, ENTER[k]!, ENTER[k]! + 1.9);
      const out = A.ei(t, Q.takeAway + 0.12 * i, Q.takeAway + 2.6 + 0.12 * i);
      const x = COL_X[k] - (1 - inP) * 1100 - out * 1500;
      if (inP <= 0 || x < -2200) return;
      const off = x - COL_X[k];
      drawKind(c, k, x, 0, 1, { ph: sc + off, lift: Math.sin(t * 5 + i) * 0.5 });
    });

    // luồng tiếp tế: từ mỗi xe về xe tăng
    const flow = A.win(t, 7.0, Q.takeAway + 0.6, 0.5, 0.5);
    if (flow > 0.01) {
      keys.forEach((k, i) => {
        const out = A.ei(t, Q.takeAway + 0.12 * i, Q.takeAway + 2.6 + 0.12 * i);
        const inP = A.eo(t, ENTER[k]!, ENTER[k]! + 1.9);
        const x = COL_X[k] - (1 - inP) * 1100 - out * 1500;
        for (let j = 0; j < 2; j++) {
          const u = ((t * 0.5 + j / 2 + i * 0.19) % 1);
          const a: [number, number] = [x, -TOP_OF[k] - 6], b: [number, number] = [COL_X.tank - 10, -TOP_OF.tank - 4];
          const px = A.lerp(a[0], b[0], u), py = A.lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * (60 + i * 14);
          const kind: V.CrateKind = i % 2 ? 'shell' : 'drum';
          A.withA(c, flow * Math.min(1, u * 6) * Math.min(1, (1 - u) * 6), () => {
            c.save(); c.translate(px, py); c.scale(0.9, 0.9); V.cargo(c, 0, 14, kind, 1, 1); c.restore();
          });
        }
      });
    }

    // lineup: các xe thả xuống quanh xe tăng
    if (t > Q.question + 2) this.lineVehicles(c, t, true);
    K.end(c);

    // callout 60 t
    if (t > Q.steel60 - 0.1 && t < Q.question + 1.5) {
      const p = A.win(t, Q.steel60, Q.question + 1.2, 0.4, 0.4);
      const [sx, sy] = K.toScreen(cam, COL_X.tank, -100);
      U.callout(c, '60 t', sx, sy - 150, { to: [sx, sy], p, size: 44 });
    }
  }

  /** hàng xe cho chương 1 (thả xuống theo từ khoá) */
  private lineVehicles(c: CanvasRenderingContext2D, t: number, withCoins: boolean) {
    const appear: Partial<Record<LineKey, number>> = { truck: Q.trucks, apc: Q.carriers, ifv: Q.fighting, bridge: Q.bridgeL, arv: Q.tow };
    const coinN: Record<LineKey, number> = { truck: 2, apc: 3, ifv: 4, tank: 6, arv: 4, bridge: 4 };
    LINE_ORDER.forEach((k, i) => {
      if (k !== 'tank') {
        const at = appear[k]!;
        const p = A.back(t, at, at + 0.55, 1.4);
        if (t < at) return;
        c.save(); c.translate(LINE[k], 0); c.scale(p, p);
        drawKind(c, k, 0, 0, 1, { a: Math.min(1, (t - at) * 6) });
        c.restore();
      }
      if (withCoins && t > Q.pay) {
        const n = Math.round(coinN[k] * A.eo(t, Q.pay + i * 0.12, Q.pay + i * 0.12 + 0.9));
        if (n > 0) V.coins(c, LINE[k], -TOP_OF[k] - 14, n, 1.1);
      }
    });
  }

  // TRÊN: một xe "tốt nhất" nhân ra thành cả cánh đồng
  private grid(c: CanvasRenderingContext2D, t: number) {
    const z = Math.exp(A.lerp(Math.log(1.0), Math.log(0.2), A.eio(t, Q.oneBest + 0.5, Q.answer - 0.1)));
    const cam: K.Cam = { x: 0, y: 0, z };
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 250 });
    const R = (Math.hypot(960, 540) / z) * 1.1 * A.eo(t, Q.oneBest + 0.9, Q.answer - 0.2);
    const dx = 250, dy = 118, v = K.view(cam, 150);
    for (let r = -24; r <= 24; r++) {
      const y = r * dy;
      if (y < v.y0 || y > v.y1) continue;
      for (let q = -20; q <= 20; q++) {
        const x = q * dx + (r & 1 ? dx / 2 : 0);
        if (x < v.x0 || x > v.x1) continue;
        const d = Math.hypot(x, y);
        if (d > R && !(q === 0 && r === 0)) continue;
        V.tankTop(c, x, y, 1, { a: q === 0 && r === 0 ? 1 : A.eo(R - d, 0, 400) });
      }
    }
    K.end(c);
    const p = A.win(t, Q.oneBest, Q.oneBest + 1.3, 0.2, 0.4);
    if (p > 0) { const [sx, sy] = K.toScreen(cam, 0, 0); halo(c, sx, sy, 120 * z + 50, 70 * z + 40, p, P.amber, 6); }
  }

  // NGANG: hàng xe, chuỗi "lỗi → loại kế tiếp sửa"
  private line(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(636, 1.45);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, roadA: 0 });
    // nhịp nhún lần lượt: mỗi loại tồn tại vì một lý do
    LINE_ORDER.forEach((k, i) => {
      const at = 35.4 + i * 0.42;
      const hop = A.bump(t, at, 0.5) * 12;
      drawKind(c, k, LINE[k], -hop, 1, {});
    });
    K.end(c);
    // lỗi → sửa
    const pairs: [LineKey, LineKey, number][] = [['truck', 'apc', 38.3], ['apc', 'ifv', 39.0], ['ifv', 'tank', 39.7], ['tank', 'arv', 40.4], ['tank', 'bridge', 40.7]];
    pairs.forEach(([a, b, at]) => {
      const p = A.eo(t, at, at + 0.6);
      if (p <= 0) return;
      const [ax, ay] = K.toScreen(cam, LINE[a], -TOP_OF[a] - 12);
      const [bx, by] = K.toScreen(cam, LINE[b], -TOP_OF[b] - 12);
      if (a !== 'tank' || b === 'arv') V.flaw(c, ax, ay - 52, 1.7, A.eo(t, at - 0.15, at + 0.4));
      const hgt = 90 + Math.abs(bx - ax) * 0.18, pts: [number, number][] = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([A.lerp(ax, bx, u), A.lerp(ay, by, u) - 10 - 4 * hgt * u * (1 - u)]); }
      U.pathArrow(c, pts, { p, color: P.amber, w: 8, head: 26 });
    });
  }
}
