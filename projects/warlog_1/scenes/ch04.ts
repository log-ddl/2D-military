// Chương 4 (140.6–162.4): tới nơi sống rồi, lính xuống trần trụi.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import { P } from './shared/palette';
import * as V from './_assets';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { at, halo, type Pt } from './_common';

const ENEMY: Pt[] = [[800, -260], [1180, 250], [1420, -230]];
const APC_X = 1620;
// vị trí lính khi rời xe (cửa sau ở phía -x của xe)
const OUT: Pt[] = [[1500, -50], [1470, -20], [1450, 12], [1480, 40], [1430, -44], [1410, -6]];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    const start: K.Cam = { x: 1250, y: 0, z: 1.35 };
    const mid: K.Cam = { x: 1560, y: 0, z: 2.3 };
    const wide: K.Cam = { x: 1430, y: 0, z: 1.7 };
    const cam = K.track(t, [[140.62, start], [142.4, mid], [152.0, mid], [154.6, wide], [162.38, wide]], A.eio);
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 250, patches: true });
    W.topRoad(c, [[-400, 0], [1900, 0]], 80);
    W.dangerZone(c, 560, -380, 1100, 760, 0.9);
    // điểm đích
    A.rrect(c, 1720, -90, 120, 180, 10, '#d3dbe2', P.ink, A.px(c, 3));
    // địch + cung bắn
    ENEMY.forEach((e) => {
      A.rrect(c, e[0] - 44, e[1] - 28, 88, 56, 8, P.enemy, P.ink, A.px(c, 3));
      A.circle(c, e[0], e[1], 12, P.enemyLight, P.ink, A.px(c, 2));
    });
    // bãi trống: nơi lính nằm
    const ramp = A.eo(t, 140.9, 142.4);
    // xe: quay đầu và rời đi 152.3–155
    const turn = A.eio(t, Q.leaves, Q.leaves + 1.0);
    const away = A.ei(t, Q.leaves + 0.9, Q.leaves + 3.2);
    const ax = APC_X - away * 900;
    const ang = turn * Math.PI;
    const ret = t > Q.leaves ? 1 : 0;
    // (xe quay đầu quanh tâm; vẽ nghiêng)
    // lính trong xe (cut) tới khi xuống hết
    const out = A.ph(t, Q.getOut, Q.getOut + 2.2);
    at(c, ax, 0, ang, () => {
      V.apcTop(c, 0, 0, 1, { cut: t < Q.getOut + 2.4 ? 1 : 0, riders: t < Q.getOut ? 6 : Math.max(0, 6 - Math.floor(out * 6.2)), ramp: t < Q.getOut + 2.6 ? ramp : A.eo(t, Q.leaves - 0.4, Q.leaves + 0.4) * 0 + ramp });
    });
    void ret;
    // 143–149: không thấy, không bắn được
    if (t > Q.cannotSee && t < Q.getOut) {
      // tầm nhìn: hai khe hẹp ở mũi xe
      const p = A.win(t, Q.cannotSee, Q.cannotShoot + 1.4, 0.3, 0.4);
      A.withA(c, p * 0.8, () => {
        for (const sgn of [-1, 1]) {
          c.fillStyle = 'rgba(56,189,248,0.25)'; c.beginPath(); c.moveTo(APC_X + 50, sgn * 12); c.arc(APC_X + 50, sgn * 12, 130, -0.12 + (sgn > 0 ? 0.0 : 0), 0.12); c.closePath(); c.fill();
        }
      });
      // đạn từ trong xe chạm vách và dừng
      const q = A.win(t, Q.cannotShoot, Q.getOut - 0.3, 0.3, 0.3);
      if (q > 0) for (let i = 0; i < 3; i++) {
        const u = ((t * 2.2 + i / 3) % 1);
        const y = -14 + i * 14;
        A.withA(c, q, () => { A.line(c, [[APC_X - 20 + u * 36, y], [APC_X - 20 + u * 36 + 10, y]], P.amber, A.px(c, 4)); });
      }
    }
    // địch bắn vào xe (140.6–149.6): tia đỏ tới thân xe rồi tắt
    if (t > 140.8 && t < Q.getOut + 0.2) {
      ENEMY.forEach((e, i) => {
        const u = ((t * 1.9 + i * 0.34) % 1);
        F.tracer(c, e, [APC_X + 10, 0], u, 0.08, '#d95a48', 4);
        if (u > 0.9) F.sparks(c, APC_X + 10, 0, (u - 0.9) * 10, 0.7, Math.atan2(e[1], e[0] - APC_X), 2.2, i + 1);
      });
    }
    // lính xuống xe → trần trụi trên bãi
    if (t > Q.getOut) {
      OUT.forEach((p, i) => {
        const e = A.eo(t, Q.getOut + i * 0.3, Q.getOut + i * 0.3 + 1.0);
        const prone = t > 156.0 + i * 0.12;
        const sx = APC_X - 90 + (p[0] - (APC_X - 90)) * e, sy = p[1] * e;
        V.soldierTop(c, sx, sy, 1.7, { prone, ang: Math.PI });
      });
    }
    // 150.9–: lửa địch dồn xuống lính
    if (t > Q.exposed) {
      const k = A.win(t, Q.exposed, 161.8, 0.6, 0.6);
      ENEMY.forEach((e, i) => {
        for (let j = 0; j < 2; j++) {
          const u = ((t * 2.0 + i * 0.3 + j * 0.5) % 1);
          const tgt = OUT[(i * 2 + j) % OUT.length]!;
          A.withA(c, k, () => F.tracer(c, e, [tgt[0], tgt[1]], u, 0.07, '#d95a48', 4));
          if (u > 0.92) F.dust(c, tgt[0], tgt[1], (u - 0.92) * 12, 0.6, '#b9a77f');
        }
      });
    }
    // 160–162: hoả lực của lính mỏng so với của địch
    if (t > Q.short - 0.6) {
      const k = A.win(t, Q.short - 0.6, 162.3, 0.4, 0.3);
      A.withA(c, k, () => {
        const m: Pt = [1180, 250];
        for (let i = 0; i < 3; i++) {
          const u = ((t * 2.0 + i / 3) % 1);
          F.tracer(c, [OUT[2]![0], OUT[2]![1]], m, u, 0.04, P.amber, 2.5);
        }
        A.line(c, [[1180, 250], [1410, -6]], '#d95a48', A.px(c, 14));
      });
    }
    K.end(c);
    void halo;
  }
}
