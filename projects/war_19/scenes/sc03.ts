// scenes/sc03.ts — Chương 1, Shot 1.4 (58.68 – 73.10s)
// Góc nhìn TOP-DOWN chiến thuật: Toàn bộ cơ thể vận tải cơ quân sự được định hình quanh 20 phút
// đỗ trên đường băng dã chiến vỡ nát với động cơ vẫn quay, cố nuốt/nhả cả đạo quân trước khi bị bắn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawC17,
  drawTank,
  drawSoldier,
  drawExplosion,
  drawCallout,
  lw,
} from './_assets';

const camRunwayWide: K.Cam = { x: 0, y: 0, z: 1.18 };
const camUnloadTight: K.Cam = { x: -45, y: 15, z: 1.38 };

const camTrack: [number, K.Cam][] = [
  [58.68, camRunwayWide],
  [63.80, camUnloadTight],
  [73.10, camUnloadTight],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam = K.track(t, camTrack, A.eio);
    cam = K.withShake(cam, t, [
      [CUE.ch1_shell_1, 14, 0.45],
      [CUE.ch1_shell_2, 16, 0.45],
      [CUE.ch1_shell_3, 18, 0.50],
    ]);

    A.clear(c, P.bg2);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    // 1. Nền đường băng dã chiến nhìn từ trên xuống (TOP-DOWN) với các hố bom/pháo kích vỡ nát
    const v = K.view(cam, 150);
    c.fillStyle = P.bg2;
    c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);

    // Dải đường băng bê tông/đất nện bị hư hại ở đầu phải
    A.rrect(c, -760, -145, 1520, 290, 8, P.light, P.ink, outW);
    for (let rx = -680; rx <= 520; rx += 120) {
      A.rrect(c, rx, -6, 64, 12, 2, P.paper, null, 0);
    }

    // Các hố bom/vết nứt lớn trên đường băng ("broken runway")
    const craters: [number, number, number][] = [
      [420, -45, 52],
      [515, 65, 44],
      [-460, -110, 38],
      [180, 125, 34],
    ];
    for (const [cx, cy, cr] of craters) {
      A.circle(c, cx, cy, cr, P.sand, P.ink, inW);
      A.circle(c, cx, cy, cr * 0.58, P.dark, P.ink, inW);
      A.line(c, [[cx - cr, cy], [cx - cr * 1.45, cy - 18]], P.ink, inW);
      A.line(c, [[cx + cr, cy], [cx + cr * 1.4, cy + 22]], P.ink, inW);
    }

    // 2. Chiếc C-17 hạ cánh lăn vào dừng trên đoạn đường băng còn lành (58.68–63.5s)
    const landRoll = A.eo(t, CUE.ch1_not_sky, 63.4);
    const c17X = A.lerp(-420, 45, landRoll);
    const rampOpen = A.sm(t, CUE.ch1_20_min + 0.5, CUE.ch1_20_min + 2.2);

    // 3. Đội hình xe tăng 60 tấn và bộ binh phóng ra từ bửng đuôi C-17 (67.8–73.10s)
    const unloadP = A.eio(t, 67.8, 72.2);
    if (unloadP > 0.01) {
      const tankX = A.lerp(c17X - 240, c17X - 495, unloadP);
      const tankY = A.lerp(0, 48, A.sm(unloadP, 0.4, 1.0));
      const tankFire = A.bump(t, 71.85, 0.28);
      drawTank(c, tankX, tankY, {
        view: 'top',
        scale: 0.78,
        flipX: true,
        turretRot: -0.45,
        fireFlash: tankFire,
      });

      // Hai hàng lính bộ binh tỏa ra hai bên sườn đuôi
      for (let i = 0; i < 6; i++) {
        const sp = A.clamp01(unloadP * 1.35 - i * 0.12);
        if (sp <= 0) continue;
        const side = i % 2 === 0 ? -1 : 1;
        const sx = A.lerp(c17X - 260, c17X - 360 - i * 28, sp);
        const sy = A.lerp(side * 18, side * (82 + (i % 3) * 24), sp);
        drawSoldier(c, sx, sy, { view: 'top', scale: 1.05 });
      }
    }

    // Vẽ C-17 nhìn từ trên xuống với cả 4 động cơ đang phụt khí nóng ("with engines running")
    drawC17(c, c17X, 0, {
      view: 'top',
      scale: 0.88,
      rampOpen,
      jetBlast: 0.85 + 0.15 * Math.sin(t * 18),
    });

    // 4. Vòng đồng hồ tác chiến 20 phút quanh mũi/cánh máy bay (64.24–73.10s)
    const clockAlpha = A.win(t, CUE.ch1_20_min, 73.0, 0.35, 0.25);
    const clockProg = A.ph(t, CUE.ch1_20_min, 72.8);
    A.withA(c, clockAlpha, () => {
      const kx = c17X + 215, ky = -195, kr = 46;
      A.circle(c, kx, ky, kr, P.paper, P.ink, outW);
      c.beginPath();
      c.moveTo(kx, ky);
      c.arc(kx, ky, kr - 5, -Math.PI / 2, -Math.PI / 2 + clockProg * Math.PI * 1.65, false);
      c.closePath();
      A.fs(c, P.amber, P.ink, inW);
      A.circle(c, kx, ky, 5, P.ink, null, 0);
    });

    // 5. Đạn pháo địch bắn tới đường băng ("before someone shoots at it" @ 70.6, 71.5, 72.3s)
    const shells: [number, number, number][] = [
      [CUE.ch1_shell_1, -185, -155],
      [CUE.ch1_shell_2, 235, 145],
      [CUE.ch1_shell_3, -325, 165],
    ];
    for (const [st0, tx, ty] of shells) {
      // Đường đạn đỏ bay tới trước khi nổ 0.45s
      const flyP = A.ph(t, st0 - 0.45, st0);
      if (flyP > 0 && flyP < 1) {
        const sx0 = tx + 280, sy0 = ty - 260;
        const curX = A.lerp(sx0, tx, flyP);
        const curY = A.lerp(sy0, ty, flyP);
        A.line(c, [[sx0, sy0], [curX, curY]], P.enemy, lw(c, 4), [10, 6]);
        A.circle(c, curX, curY, 7, P.amber, P.enemy, inW);
      }
      // Vụ nổ và hố khói lưu lại
      const boomP = A.ph(t, st0, st0 + 0.85);
      if (t >= st0) {
        A.circle(c, tx, ty, 26, P.dark, P.ink, inW);
      }
      drawExplosion(c, tx, ty, boomP, 62);
    }

    K.end(c);

    // Callout 20 MIN cạnh đồng hồ tác chiến
    drawCallout(c, cam, c17X + 215, -195, 105, 0, '20 MIN', clockAlpha, P.amber);
  }
}
