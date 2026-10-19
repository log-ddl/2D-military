import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as S from './_assets';

type C2 = CanvasRenderingContext2D;
/** C9 kết: trở lại phi công — mọi hệ thống giải quyết trận đấu trước giới hạn thân thể. 451.9–470.4 */
export default class Sc21 extends CanvasScene {
  protected draw(c: C2, t: number) {
    const cam = K.track(t, [[451.9, { x: 0, y: 0, z: 1 }], [465.6, { x: 0, y: 0, z: 1 }], [470.4, { x: 40, y: 20, z: 0.94 }]], A.eio);
    A.clear(c, P.bg);
    K.begin(c, cam);
    // cùng bố cục buồng lái như mở đầu, nhưng bầu trời phẳng lặng
    c.fillStyle = '#dfe6d3'; c.fillRect(-2000, 260, 4000, 2000);
    A.line(c, [[-2000, 260], [2000, 260]], P.ink2, S.L(c, 2));
    for (let i = 0; i < 5; i++) S.cloud(c, ((i * 640 - (t - 451) * 60) % 3200 + 3200) % 3200 - 1600, -300 + (i % 2) * 160, 0.9);
    A.withA(c, 0.35, () => { c.beginPath(); c.ellipse(80, 40, 640, 480, 0, Math.PI, 0); c.fillStyle = P.glass; c.fill(); });
    c.beginPath(); c.ellipse(80, 40, 640, 480, 0, Math.PI * 1.02, -0.02); A.fs(c, null, P.ink, S.L(c, 5));
    A.rrect(c, -700, 330, 1500, 260, 20, P.oliveDark, P.ink, S.L(c, 4));
    A.rrect(c, 380, 150, 260, 180, 16, P.dark, P.ink, S.L(c, 3));
    A.circle(c, 470, 240, 50, '#203040', P.sky, S.L(c, 2));
    A.circle(c, 580, 240, 30, '#203040', P.sky, S.L(c, 2));
    S.pilotSide(c, -140, 300, 1.9, { drain: 0 });
    // bóng ma 9 quả tạ của mở đầu, bị đẩy đi khi hệ thống xuất hiện
    const ghost = A.win(t, 452.8, 462.4, 0.6, 1.2);
    for (let i = 0; i < 9; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      A.withA(c, 0.3 * ghost, () => S.iconCost(c, 'weight', -520 + col * 92, 220 - row * 92, 0.95, P.dark));
    }
    // vòng hệ thống trên đầu phi công
    const items: [number, (x: number, y: number, s: number) => void][] = [
      [456.8, (x, y, s) => S.iconCost(c, 'heat', x, y, s, P.amber)],
      [457.9, (x, y, s) => S.jetTop(c, x, y, -Math.PI / 2, 0.22 * s, {})],
      [458.7, (x, y, s) => { for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x - 30 * s, y + 20 * s, (20 + k * 18) * s, -0.8, 0.8); A.fs(c, null, P.sky, S.L(c, 4)); } }],
      [459.4, (x, y, s) => S.missileSide(c, x, y, 0.5 * s, -0.4, {})],
      [460.1, (x, y, s) => { for (let k = 0; k < 9; k++) { c.save(); c.translate(x + Math.cos(k * 2.3) * 34 * s, y + Math.sin(k * 1.7) * 26 * s); c.rotate(k); A.rrect(c, -9 * s, -2 * s, 18 * s, 4 * s, 1, P.slate, null); c.restore(); } }],
      [460.8, (x, y, s) => { c.save(); c.translate(x, y); c.scale(s, s); A.poly(c, [[-20, 30], [-12, -40], [4, -40], [-2, 22], [30, 22], [30, 32]], P.dark, P.ink, S.L(c, 3)); c.restore(); }],
    ];
    const cx = -170, cy = -40;
    items.forEach(([at, fn], i) => {
      const p = A.back(t, at, at + 0.4);
      if (p <= 0) return;
      const a = Math.PI * (1.05 + i * 0.18);
      const x = cx + Math.cos(a) * 470, y = cy + Math.sin(a) * 330;
      A.circle(c, x, y, 66 * p, P.paper, P.ink, S.L(c, 3));
      fn(x, y, p);
    });
    // đồng hồ G: kim đứng ở 1, vạch 9 đỏ không bao giờ chạm
    const ga = A.sm(t, 463.0, 463.6);
    if (ga > 0) A.withA(c, ga, () => {
      const gx = 510, gy = -230, R = 120;
      A.circle(c, gx, gy, R + 14, P.paper, P.ink, S.L(c, 4));
      const ang = (g: number) => Math.PI * 0.75 + (g / 10) * Math.PI * 1.5;
      for (let g = 0; g <= 10; g++) A.line(c, [[gx + Math.cos(ang(g)) * (R - 22), gy + Math.sin(ang(g)) * (R - 22)], [gx + Math.cos(ang(g)) * R, gy + Math.sin(ang(g)) * R]], g >= 9 ? S.BLOOD : P.ink, S.L(c, g >= 9 ? 6 : 3));
      c.beginPath(); c.arc(gx, gy, R - 10, ang(8.6), ang(10)); A.fs(c, null, S.BLOOD, S.L(c, 10));
      const g = 1 + 0.08 * Math.sin(t * 2);
      A.line(c, [[gx, gy], [gx + Math.cos(ang(g)) * (R - 30), gy + Math.sin(ang(g)) * (R - 30)]], P.ink, S.L(c, 7));
      A.circle(c, gx, gy, 12, P.ink, null);
      S.label(c, '1G', gx, gy + 60, 36, P.ink);
    });
    K.end(c);
  }
}
