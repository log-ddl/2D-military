// Chương 3 (82.7 – 151.9): nổi/chìm bằng ballast, rồi giữ độ sâu bằng bồn bù và bồn cân bằng.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain } from './_c';

const LAYER = 600;       // ranh giới hai lớp nước (y thế giới)
const Z = 1.45;

const yKeys: A.Pt[] = [
  [82.7, 12], [89.4, 12], [91.6, 62], [93.8, 12], [98.0, 12], [101.0, 380], [103.7, 380], [106.6, 12],
  [113, 520], [124.8, 520], [128.6, 662], [131.0, 602], [132.6, 578], [134.9, 578], [135.8, 520], [138.8, 578], [152, 578],
];

export default class S03 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t >= 106.7 && t < 113.0) this.endView(c, t);
    else this.side(c, t);
    S.cutDip(c, t, 106.7, 0.12); S.cutDip(c, t, 113.0, 0.12);
    chain(c, t);
  }

  private side(c: CanvasRenderingContext2D, t: number) {
    const y = A.keys(t, yKeys);
    const fill = A.keys(t, [[97.4, 0], [100.6, 1], [103.6, 1], [106.5, 0]]);
    const comp = A.keys(t, [[135.0, 0], [138.4, 0.9], [152, 0.9]]);
    const trimF = A.keys(t, [[143.8, 0.3], [146.8, 0.8]]), trimA = A.keys(t, [[143.8, 0.7], [146.8, 0.2]]);
    const pitch = -0.08 * A.bump(t, 135.0, 1.9) + 0.07 * (A.sm(t, 144.6, 145.4) - A.sm(t, 146.4, 148.4));
    const camY = t < 107 ? y * 0.75 + 20 : y;
    const cam: K.Cam = { x: 0, y: camY, z: t < 107 ? Z : 1.4 };
    const hl: string[] = t >= 94.7 && t < 98 ? ['ballast'] : t >= 103.1 && t < 106.7 ? ['air', 'ballast'] : t >= 134 && t < 140 ? ['comp', 'torp'] : t >= 143.6 ? ['trim'] : [];
    const torpOut = A.ph(t, 135.0, 136.6);
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    // lớp nước theo mật độ
    if (t >= 113) {
      const v = K.view(cam, 60);
      const pA = A.sm(t, 124.0, 124.9) , pB = 1;
      A.withA(c, t < 124 ? 0 : pA, () => {
        c.fillStyle = 'rgba(30,90,140,0.17)'; c.fillRect(v.x0, LAYER, v.x1 - v.x0, v.y1 - LAYER);
        A.line(c, [[v.x0, LAYER], [v.x1, LAYER]], 'rgba(30,90,140,0.5)', A.px(c, 3), [20, 14]);
        for (let i = 0; i < 70; i++) {
          const dx = v.x0 + A.rnd(i) * (v.x1 - v.x0), dy = LAYER + 10 + A.rnd(i + 90) * (v.y1 - LAYER - 10);
          A.circle(c, dx, dy, 2.4, 'rgba(30,90,140,0.4)', null, 0);
        }
        for (let i = 0; i < 24; i++) {
          const dx = v.x0 + A.rnd(i + 300) * (v.x1 - v.x0), dy = v.y0 + A.rnd(i + 400) * (LAYER - v.y0);
          A.circle(c, dx, dy, 2.4, 'rgba(30,90,140,0.4)', null, 0);
        }
      });
      void pB;
    }
    // mục tiêu độ sâu (S4)
    if (t >= 113 && t < 125) {
      const v = K.view(cam, 20);
      A.withA(c, A.sm(t, 113.4, 114.0) * (1 - A.sm(t, 124.4, 124.9)), () => A.line(c, [[v.x0, 520], [v.x1, 520]], '#16a34a', A.px(c, 4), [18, 12]));
    }
    // dao động trôi quanh mục tiêu
    const drift = t >= 115 && t < 124.8 ? 55 * Math.sin((t - 115) * 0.95) * A.sm(t, 115, 118.5) * (1 - A.sm(t, 123.2, 124.8)) : 0;
    const sy = y + drift;
    // bóng tàu nổi lên mặt nước nếu không bù (S6)
    if (t > 139.3 && t < 144.4) {
      const gp = A.eio(t, 139.6, 143.4);
      const gy = A.lerp(578, 26, gp);
      S.drawSubSide(c, t, { x: 0, y: gy, s: 1, cut: 0, alpha: 0.38, pitch: -0.05 });
      const k = A.sm(t, 142.4, 143.6) * (1 - A.sm(t, 144.0, 144.4));
      for (let i = 0; i < 7; i++) A.circle(c, -80 + i * 28, 10 - 20 * ((t * 2 + i) % 1), 7, '#ffffff', P.sky, A.px(c, 2));
      void k;
    }
    S.drawSubSide(c, t, {
      x: 0, y: sy, s: 1, cut: 1, pitch, fillF: fill, fillA: fill, comp, trimF: t >= 143.8 ? trimF : 0.5, trimA: t >= 143.8 ? trimA : 0.5,
      hl, glow: P.amber, plant: 'nuclear', plantRun: 0.4, breath: t * 1.6, torp: torpOut > 0 ? 1 : 2, tube: torpOut, prop: t * 2.5, planeF: 0, planeA: 0,
    });
    // ngư lôi ra khỏi ống
    if (torpOut > 0 && torpOut < 1) {
      const tx = 240 + 480 * torpOut * torpOut, ty = sy + 8 - 14;
      S.torpedo(c, tx, ty, pitch, 1.5);
      for (let i = 0; i < 6; i++) A.circle(c, tx - 40 - i * 14, ty + Math.sin(i * 2 + t * 8) * 4, 4 + i * 0.4, '#ffffff', P.sky, A.px(c, 2));
    }
    // cửa thông hơi trên đầu bồn
    {
      const open = A.keys(t, [[97.2, 0], [97.8, 1], [100.8, 1], [101.3, 0]], true);
      const open2 = 0;
      for (const vx of [-110, 108]) {
        c.save(); c.translate(vx, sy - 60); c.rotate(-open * 1.1);
        A.capsule(c, [0, 0], [26, 0], 6, P.dark, P.ink, A.px(c, 2));
        c.restore();
        if (open > 0.3) S.bubbles(c, vx + 10, sy - 66, 20, 120, t, 7, vx, open * (fill < 0.98 ? 1 : 0.2));
      }
      void open2;
    }
    // khí nén đẩy nước ra (S3, lúc nổi)
    if (t >= 103.2 && t < 106.7) {
      const p = A.sm(t, 103.2, 103.8) * (1 - A.sm(t, 106.0, 106.6));
      for (const [bx, by] of [[-110, sy - 46], [108, sy - 46]] as const) S.arrowW(c, [bx, by - 38], [bx, by], p, P.sky, 5, 12);
      for (const bx of [-110, 108]) {
        S.arrowW(c, [bx, sy + 66], [bx, sy + 118], p, P.sky, 5, 12);
        S.bubbles(c, bx, sy + 130, 24, 40, t, 5, bx + 4, p);
      }
    }
    // ngập vào đáy (S3, lúc chìm)
    if (t >= 98.0 && t < 101.0) {
      const p = A.sm(t, 98.0, 98.6) * (1 - A.sm(t, 100.4, 101.0));
      for (const bx of [-110, 108]) S.arrowW(c, [bx, sy + 118], [bx, sy + 66], p, P.sky, 5, 12);
    }
    // vị trí cuối của bồn bù: nước ào vào
    if (t >= 135.2 && t < 138.6) {
      const p = A.sm(t, 135.2, 135.8) * (1 - A.sm(t, 138.0, 138.6));
      S.arrowW(c, [-12, sy + 108], [-12, sy + 44], p, P.sky, 6, 14);
    }
    // bơm nước giữa hai bồn cân bằng (S7)
    if (t >= 144.8 && t < 147.4) {
      const p = A.sm(t, 144.8, 145.4) * (1 - A.sm(t, 146.8, 147.4));
      S.arrowW(c, [140, sy + 24], [-190, sy + 24], p, P.amber, 6, 16);
    }
    // vật mới rơi vào mũi (S7)
    if (t >= 143.8 && t < 146.5) {
      const p = A.eo(t, 143.9, 144.7);
      const fy = A.lerp(sy - 150, sy + 6, p);
      A.rrect(c, 188, fy - 14, 30, 28, 4, P.sand, P.ink, A.px(c, 3));
      A.line(c, [[188, fy], [218, fy]], P.ink, A.px(c, 2));
    }
    // mũi tên trọng lực / lực đẩy
    const W = A.keys(t, [[82.7, 110], [89.4, 110], [91.0, 170], [92.4, 170], [93.4, 60], [94.0, 110], [124.8, 110], [128, 100], [131, 110],
      [131.4, 110], [132.6, 92], [134.9, 92], [135.3, 60], [138.4, 92], [143.9, 92], [144.7, 92]]);
    const Bf = (yy: number) => (t >= 124.8 && t < 131.8) ? 100 + 28 * A.sm(yy, 560, 640) : 110;
    const arrowsOn = (t < 94.6) || (t >= 113 && t < 131.8) ? 1 : 0;
    if (arrowsOn > 0) {
      const a = A.sm(t, 83.4, 84.2) * (t < 94.6 ? 1 - A.sm(t, 94.2, 94.6) : A.sm(t, 113, 113.6) * (1 - A.sm(t, 131.2, 131.8)));
      S.arrowW(c, [0, sy + 4], [0, sy + 4 + W], a, P.amber, 8, 26 / cam.z);
      S.arrowW(c, [30, sy - 4], [30, sy - 4 - Bf(sy)], a, P.sky, 8, 26 / cam.z);
    }
    K.end(c);
    S.ruler(c, cam, 0, 3, { x: 60, a: t < 106.7 ? 1 : 0.7 });
    // cân thể hiện nặng/nhẹ hơn nước bị chiếm chỗ
    if (t >= 89.2 && t < 94.6) {
      const p = A.sm(t, 89.2, 89.9) * (1 - A.sm(t, 94.0, 94.6));
      const tilt = -(W - 110) / 60 * 0.3;
      A.withA(c, p, () => balance(c, 1620, 250, tilt, 1));
    }
    if (t >= 144.6) {
      const p = A.sm(t, 144.6, 145.2);
      // lệch rồi trở về cân bằng: "không thay đổi trọng lượng nào bị bỏ sót"
      const tilt = -0.28 * (A.sm(t, 144.6, 145.4) - A.sm(t, 146.4, 148.4));
      A.withA(c, p, () => balance(c, 1620, 250, tilt, 1));
    }
  }

  private endView(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#cfe5f1');
    const cx = 860, cy = 520, Ro = 280, Ri = 180;
    const L = A.keys(t, [[106.7, 0], [109.4, 1], [110.4, 1], [112.9, 0]]);
    // bồn vòng quanh thân chịu áp
    c.save();
    c.beginPath(); c.arc(cx, cy, Ro, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#f2f6f9'; c.fillRect(cx - Ro, cy - Ro, Ro * 2, Ro * 2);
    c.fillStyle = 'rgba(56,189,248,0.8)';
    c.fillRect(cx - Ro, cy + Ro - 2 * Ro * L, 2 * Ro, 2 * Ro * L + 2);
    c.restore();
    // bọt/khí thoát qua đầu bồn khi chìm; khí vào khi nổi
    if (t < 109.6) S.bubbles(c, cx, cy - Ro - 4, 120, 160, t, 9, 3, A.sm(t, 107, 107.6) * (1 - A.sm(t, 109, 109.6)));
    if (t >= 110.4) {
      S.arrowW(c, [cx, cy - Ro - 110], [cx, cy - Ro - 14], A.sm(t, 110.4, 111), P.sky, 7, 24);
    }
    // nước ra/vào ở đáy
    const flowIn = A.sm(t, 107, 107.5) * (1 - A.sm(t, 109.4, 109.8));
    const flowOut = A.sm(t, 110.6, 111.1) * (1 - A.sm(t, 112.6, 112.9));
    S.arrowW(c, [cx - 70, cy + Ro + 90], [cx - 70, cy + Ro + 10], flowIn, P.sky, 7, 24);
    S.arrowW(c, [cx + 70, cy + Ro + 10], [cx + 70, cy + Ro + 90], flowOut, P.sky, 7, 24);
    // thân chịu áp bên trong, có người ngủ
    A.circle(c, cx, cy, Ri, '#ffffff', P.ink2, 5);
    for (let tier = 0; tier < 3; tier++) {
      const yy = cy - 70 + tier * 62;
      for (let i = 0; i < 3; i++) {
        const x = cx - 80 + i * 80;
        A.rrect(c, x - 28, yy - 10, 56, 22, 10, i % 2 ? P.sand : P.light, P.ink, 3);
        A.circle(c, x - 17, yy - 12, 9, P.skin, P.ink, 3);
      }
    }
    A.circle(c, cx, cy, Ro, null, P.ink, 12);
    A.circle(c, cx, cy, Ri, null, P.ink, 8);
    // chìm khi đầy, nổi khi rỗng
    const down = A.sm(t, 108.2, 108.9) * (1 - A.sm(t, 110.2, 110.6));
    const up = A.sm(t, 111.1, 111.8) * (1 - A.sm(t, 112.8, 113.0));
    if (down > 0) A.withA(c, down, () => S.arrowW(c, [1440, 330], [1440, 700], 1, P.amber, 16, 56));
    if (up > 0) A.withA(c, up, () => S.arrowW(c, [1440, 700], [1440, 330], 1, P.sky, 16, 56));
    // cùng một con tàu nhìn ngang, đang đầy/rỗng
    const tx = 1440, ty = 150;
    S.drawSubSide(c, t, { x: tx, y: ty + 740 * 0, s: 0.2, cut: 1, fillF: L, fillA: L, breath: t });
  }
}

function balance(c: CanvasRenderingContext2D, x: number, y: number, tilt: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  A.poly(c, [[0, 0], [-34, 120], [34, 120]], P.dark, P.ink, 4);
  c.save(); c.rotate(tilt);
  A.line(c, [[-130, 0], [130, 0]], P.ink, 8);
  for (const sgn of [-1, 1]) {
    const px = sgn * 130;
    A.line(c, [[px, 0], [px - 24, 70], [px + 24, 70]], P.ink2, 3);
    c.save(); c.translate(px, 0); c.rotate(-tilt);
    A.line(c, [[0, 0], [-34, 76]], P.ink2, 3); A.line(c, [[0, 0], [34, 76]], P.ink2, 3);
    A.rrect(c, -44, 74, 88, 10, 5, P.light, P.ink, 3);
    // vật trong đĩa: tàu (olive) bên trái, nước bị chiếm chỗ (xanh) bên phải
    A.rrect(c, -34, 52, 68, 22, 11, sgn < 0 ? P.olive : 'rgba(56,189,248,0.85)', P.ink, 3);
    c.restore();
  }
  c.restore();
  A.circle(c, 0, 0, 10, P.ink, null, 0);
  c.restore();
}
