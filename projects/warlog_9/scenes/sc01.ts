import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

/** C1 hook: phi công kéo 9G, máu rút, tầm nhìn co → máy bay vẫn quay bình thường. 0–15.12 */
export default class Sc01 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    if (t < 12.5) this.cockpit(c, t); else this.outside(c, t);
  }

  cockpit(c: CanvasRenderingContext2D, t: number) {
    const cam = K.withShake({ x: 0, y: 0, z: 1 }, t, [[0.5, 6, 1.2]]);
    A.clear(c, P.bg);
    K.begin(c, cam);
    // chân trời nghiêng xoay chậm: đang lượn gắt
    const bank = -0.55 - t * 0.05;
    c.save(); c.rotate(bank);
    c.fillStyle = '#dfe6d3'; c.fillRect(-2000, 260, 4000, 2000);
    A.line(c, [[-2000, 260], [2000, 260]], P.ink2, S.L(c, 2));
    for (let i = 0; i < 9; i++) {
      const x = ((i * 520 - t * 900) % 4600 + 4600) % 4600 - 2300;
      S.cloud(c, x, -260 + (i % 3) * 170, 0.9);
    }
    c.restore();
    // khung buồng lái (mặt cắt)
    A.withA(c, 0.35, () => { c.beginPath(); c.ellipse(80, 40, 640, 480, 0, Math.PI, 0); c.fillStyle = P.glass; c.fill(); });
    c.beginPath(); c.ellipse(80, 40, 640, 480, 0, Math.PI * 1.02, -0.02); A.fs(c, null, P.ink, S.L(c, 5));
    A.rrect(c, -700, 330, 1500, 260, 20, P.oliveDark, P.ink, S.L(c, 4));
    A.rrect(c, 380, 150, 260, 180, 16, P.dark, P.ink, S.L(c, 3));
    A.circle(c, 470, 240, 50, '#203040', P.sky, S.L(c, 2));
    A.circle(c, 580, 240, 30, '#203040', P.sky, S.L(c, 2));
    // phi công
    const drain = A.sm(t, 4.2, 6.6);
    const faint = A.sm(t, 10.3, 11.8);
    S.pilotSide(c, -140, 300, 1.9, { drain, head: faint * 0.5, arm: faint });
    // lực G: tạ chồng lên
    const n = Math.floor(A.clamp(A.ph(t, 1.6, 3.7) * 9 + (t > 1.6 ? 1 : 0), 0, 9));
    for (let i = 0; i < n; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const pop = A.back(t, 1.6 + i * 0.23, 1.6 + i * 0.23 + 0.25);
      S.iconCost(c, 'weight', -520 + col * 92, 220 - row * 92, 0.95 * pop, i === 0 ? P.slate : P.dark);
    }
    if (t > 1.6) S.arrow(c, -40, -60, -40, -60 + 330 * A.eo(t, 1.6, 3.8), 34, P.amber);
    K.end(c);
    // tầm nhìn co thành đường hầm rồi xám (POV phi công)
    const [hx, hy] = K.toScreen(cam, -140 - 20 * 1.9, 300 - 150 * 1.9);
    const r = A.lerp(1500, 210, A.sm(t, 6.5, 8.6));
    const g = c.createRadialGradient(hx, hy, r * 0.55, hx, hy, r);
    g.addColorStop(0, 'rgba(15,23,42,0)'); g.addColorStop(1, 'rgba(15,23,42,0.96)');
    c.save(); c.fillStyle = g; c.fillRect(0, 0, A.W, A.H); c.restore();
    A.withA(c, A.sm(t, 8.4, 11.6) * 0.82, () => A.clear(c, '#7c8591'));
    A.withA(c, A.sm(t, 11.2, 12.5), () => A.clear(c, '#1e293b'));
    if (t > 2.3 && t < 6.2) A.withA(c, A.win(t, 2.3, 6.2), () => S.label(c, '9×', 330, 210, 84, P.ink));
  }

  outside(c: CanvasRenderingContext2D, t: number) {
    const lt = t - 12.5;
    const cam = { x: 0, y: 0, z: 0.95 };
    A.clear(c, '#e3ead9');
    K.begin(c, cam);
    for (let i = 0; i < 6; i++) S.cloud(c, -900 + i * 380, -380 + (i % 2) * 720, 1.1);
    const R = 330, w = 1.25;
    const pos: S.Track = (u) => { const a = -1.9 + u * w; return [R * Math.cos(a), R * Math.sin(a), a + Math.PI / 2]; };
    // vệt hơi ở đầu cánh
    for (const off of [-1, 1]) {
      const tr: S.Track = (u) => { const [x, y, h] = pos(u); return [x + Math.cos(h + Math.PI / 2) * off * 60, y + Math.sin(h + Math.PI / 2) * off * 60, h]; };
      A.withA(c, 0.9, () => S.trail(c, tr, Math.max(-2, lt - 2.6), lt, P.light, 7));
    }
    const [x, y, h] = pos(lt);
    S.jetTop(c, x, y, h, 0.8, { t, ab: 0.4 });
    K.end(c);
  }
}
