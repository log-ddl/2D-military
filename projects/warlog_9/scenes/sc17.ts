import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C7: nhiên liệu, thùng phụ, tiếp dầu trên không, tanker cần bảo vệ. 345.2–373.0 */
export default class Sc17 extends CanvasScene {
  protected draw(c: C2, t: number) {
    if (t < 360.5) this.fuel(c, t);
    else if (t < 365.6) this.refuel(c, t);
    else this.map(c, t);
  }

  fuel(c: C2, t: number) {
    const cam = { x: 60, y: 30, z: 1.0 };
    S.skyBg(c, cam, t, -300);
    K.begin(c, cam);
    const D = 359.2;
    const f = A.lerp(1, 0.18, A.sm(t, 353.8, 355.4)) ;
    const jx = -120, jy = -60, s = 2.3;
    const glow: string[] = (t > 351.6 && t < 352.4) ? ['wing'] : [];
    S.jetSide(c, jx, jy, s, 0, { t, ab: 0.25, fuel: f, tanks: t < D ? 1 : 0, glow, pilot: true });
    // vòng chỉ chỗ chứa
    const ring = (x: number, y: number, at: number) => { const a = A.win(t, at, at + 1.0, 0.15, 0.3); if (a > 0) S.ring(c, jx + x * s, jy + y * s, 120, P.amber, 5, undefined, a); };
    ring(-40, -4, 350.7);
    ring(-40, 40, 352.3);
    // thùng phụ: cản và dễ thấy, rồi thả
    const tk = A.win(t, 355.6, 359.0, 0.3, 0.3);
    if (tk > 0) A.withA(c, tk, () => {
      S.iconCost(c, 'weight', jx - 40 * s - 250, jy + 40 * s + 60, 0.7, P.dark);
      S.iconCost(c, 'eye', jx - 40 * s + 260, jy + 40 * s + 60, 0.8, P.enemy);
    });
    if (t > D) {
      const u = t - D;
      c.save(); c.translate(jx - 40 * s - 300 * u, jy + 40 * s + 450 * u * u); c.rotate(u * 0.6);
      A.ellipse(c, 0, 0, 70 * s, 12 * s, 0, P.sand, P.ink, S.L(c, 3)); c.restore();
    }
    // đồng hồ sức bền: 1–2 giờ
    const ca = A.sm(t, 353.6, 354.0);
    if (ca > 0) A.withA(c, ca, () => {
      const gx = 640, gy = -300;
      A.circle(c, gx, gy, 120, P.paper, P.ink, S.L(c, 4));
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; A.line(c, [[gx + Math.cos(a) * 96, gy + Math.sin(a) * 96], [gx + Math.cos(a) * 110, gy + Math.sin(a) * 110]], P.ink, S.L(c, 3)); }
      const sweep = A.sm(t, 354.0, 355.4) * Math.PI * 2 * (2 / 12) * 6;
      c.beginPath(); c.moveTo(gx, gy); c.arc(gx, gy, 90, -Math.PI / 2, -Math.PI / 2 + sweep * 1); c.closePath();
      A.withA(c, 0.5, () => { c.fillStyle = P.amber; c.fill(); });
      A.line(c, [[gx, gy], [gx + Math.cos(-Math.PI / 2 + sweep) * 90, gy + Math.sin(-Math.PI / 2 + sweep) * 90]], P.ink, S.L(c, 5));
      A.circle(c, gx, gy, 10, P.ink, null);
    });
    K.end(c);
  }

  refuel(c: C2, t: number) {
    const cam = { x: -250, y: 20, z: 0.78 };
    S.skyBg(c, cam, t, -260);
    K.begin(c, cam);
    const hs = A.eio(t, 360.5, 361.8);
    const tx = 380, ty = -260, ts = 1.15;
    S.tankerSide(c, tx, ty, ts, { hose: hs, t });
    const dx = tx + (-380 - 420) * ts, dy = ty + (30 + 160) * ts;
    const dock = A.eio(t, 361.4, 363.3);
    const js = 1.15;
    const jx = A.lerp(dx - 215 * js - 600, dx - 215 * js - 34 * ts, dock), jy = A.lerp(dy + 260, dy - 2 * js, dock);
    const fuel = A.lerp(0.2, 0.95, A.sm(t, 363.4, 365.4));
    S.jetSide(c, jx, jy, js, 0, { t, ab: 0.2, fuel, pilot: true });
    // dòng nhiên liệu dọc vòi
    if (t > 363.4) for (let i = 0; i < 5; i++) {
      const p = ((t - 363.4) * 1.5 + i / 5) % 1;
      const x = A.lerp(tx - 390 * ts, dx, p), y = A.lerp(ty + 10 * ts, dy, p) + Math.sin(p * Math.PI) * 60;
      A.circle(c, x, y, 9, P.amber, P.ink, S.L(c, 1.5));
    }
    K.end(c);
  }

  map(c: C2, t: number) {
    const cam = K.track(t, [[365.6, { x: -200, y: 0, z: 0.5 }], [373, { x: 300, y: 0, z: 0.42 }]]);
    S.mapBg(c, cam, 200);
    K.begin(c, cam);
    const tkx = -900 + 60 * (t - 365.6), tky = 120;
    // vòng tầm có tanker
    const ext = A.eio(t, 368.6, 370.4);
    S.ring(c, tkx, tky, 1400 + ext * 1500, P.sky, 4, [16, 12], A.sm(t, 368.2, 368.8));
    // hộ tống quần quanh tanker
    for (let i = 0; i < 2; i++) {
      const a = t * 0.9 + i * Math.PI;
      const ex = tkx + Math.cos(a) * 380, ey = tky + Math.sin(a) * 300;
      S.jetTop(c, ex, ey, a + Math.PI / 2, 0.4, { t });
    }
    // mối đe doạ hướng vào tanker
    const thA = A.win(t, 365.8, 368.6, 0.3, 0.5);
    if (thA > 0) A.withA(c, thA, () => {
      const ex = tkx + 1300 - (t - 365.8) * 200, ey = tky - 900 + (t - 365.8) * 150;
      S.jetTop(c, ex, ey, Math.atan2(150, -200), 0.4, { side: S.ENEMY });
      A.line(c, [[ex, ey], [tkx, tky]], P.enemy, S.L(c, 3), [12, 12]);
    });
    // tiêm kích tiền tuyến ở xa, nối về tanker
    const fwA = A.sm(t, 368.4, 369.0);
    if (fwA > 0) A.withA(c, fwA, () => {
      for (let i = 0; i < 2; i++) {
        const fx = tkx + 2300 + i * 120, fy = tky - 160 + i * 300;
        A.line(c, [[tkx + 200, tky], [fx - 80, fy]], P.sky, S.L(c, 3), [10, 14]);
        S.jetTop(c, fx, fy, 0, 0.4, { t });
      }
    });
    S.tankerTop(c, tkx, tky, 0, 0.42);
    K.end(c);
  }
}
