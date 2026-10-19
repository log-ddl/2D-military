// scenes/sc02.ts — Chương 1 (12.14 – 26.80s): Sau giây thứ 10, lính đã nằm bẹp dưới đáy hào sâu,
// 10 phút pháo kích tiếp theo bị thành đất cản hết mảnh văng; trong khi khẩu pháo nòng ở bên trái
// chỉ kịp bắn 1 viên vào cửa sổ 10 giây rồi phải mở khóa nòng nạp lại chậm chạp.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawTrench,
  drawSoldier,
  drawHowitzer,
  drawShell,
  drawExplosion,
  drawArrow,
  drawCallout,
  drawTimerBar,
} from './_assets';
import { trenchSoldiersAt } from './_state';
import { sc01CameraAt } from './sc01';

const GROUND_Y = 220;

const LATE_STRIKES: [number, number][] = [
  [13.3, 185],
  [15.6, 555],
  [17.9, 215],
  [20.2, 535],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const startCam = sc01CameraAt(12.14);
    const trenchFocusCam: K.Cam = { x: 295, y: 195, z: 1.55 };
    const wideHowitzerCam: K.Cam = { x: -250, y: 155, z: 1.08 };

    const baseCam = K.track(
      t,
      [
        [12.14, startCam],
        [13.6, trenchFocusCam],
        [21.6, trenchFocusCam],
        [23.4, wideHowitzerCam],
        [26.8, wideHowitzerCam],
      ],
      A.eio
    );

    const hits: [number, number, number?][] = LATE_STRIKES.map(([t0]) => [t0, 9, 0.4]);
    const cam = K.withShake(baseCam, t, hits);

    K.begin(c, cam);

    drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-750, 560] });
    drawTrench(c, 260, GROUND_Y, 260, 100, 'side');

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    for (const hx of [-460, -340, -220, -110, -15, 65]) {
      A.ellipse(c, hx, GROUND_Y, 22, 5, 0, P.dark, P.ink, lwIn);
    }

    const soldiers = trenchSoldiersAt(t);
    for (const s of soldiers) {
      c.save();
      c.translate(s.x, s.y);
      drawSoldier(c, {
        view: 'side',
        faction: 'enemy',
        pose: s.pose,
        dir: s.dir,
        phase: t,
      });
      c.restore();
    }

    for (const [tHit, hx] of LATE_STRIKES) {
      const flightP = (t - (tHit - 0.5)) / 0.5;
      if (flightP > 0 && flightP < 1) {
        const sx = A.lerp(hx - 200, hx, flightP);
        const sy = A.lerp(GROUND_Y - 340, GROUND_Y - 10, flightP);
        drawShell(c, { x: sx, y: sy, rot: 0.95, scale: 0.82 });
      }
      const blastP = (t - tHit) / 1.1;
      if (blastP > 0 && blastP < 1) {
        drawExplosion(c, hx, GROUND_Y - 6, blastP, 78, 8);
        const rayAlpha = 1 - A.sm(blastP, 0.4, 1.0);
        A.withA(c, rayAlpha, () => {
          const dir = hx < 390 ? 1 : -1;
          drawArrow(
            c,
            [hx + dir * 20, GROUND_Y - 24],
            [hx + dir * 210, GROUND_Y - 28],
            P.amber,
            lwIn * 1.4,
            11
          );
        });
      }
      if (t >= tHit) {
        A.ellipse(c, hx, GROUND_Y, 20, 5, 0, P.dark, P.ink, lwIn);
      }
    }

    const shieldAlpha = A.win(t, 12.8, 21.6, 0.5, 0.5);
    A.withA(c, shieldAlpha, () => {
      A.line(c, [[250, GROUND_Y - 18], [530, GROUND_Y - 18]], P.sky, lw, [10, 8]);
    });

    const breechOpen = A.win(t, 22.4, 25.6, 0.4, 0.4);
    const recoil = A.bump(t, 22.1, 0.9) * 0.6;
    c.save();
    c.translate(-680, GROUND_Y);
    drawHowitzer(c, {
      view: 'side',
      elevateDeg: 22,
      recoil,
      breechOpen,
      highlight: t > 22.4 ? 'breech' : null,
    });
    c.restore();

    const loadP = A.sm(t, 22.8, 25.4);
    c.save();
    c.translate(-865, GROUND_Y);
    drawSoldier(c, { view: 'side', faction: 'ally', pose: 'carry', dir: 1, phase: t * 2 });
    c.restore();
    if (t >= 22.5 && t <= 25.8) {
      const shellX = A.lerp(-835, -745, loadP);
      const shellY = A.lerp(GROUND_Y - 46, GROUND_Y - 96, loadP);
      drawShell(c, { x: shellX, y: shellY, rot: -0.35 * loadP, scale: 0.78 });
    }

    if (t > 22.2) {
      const arcAlpha = A.sm(t, 22.4, 23.4);
      A.withA(c, arcAlpha, () => {
        c.strokeStyle = P.amber;
        c.lineWidth = lw;
        c.setLineDash([12, 8]);
        c.beginPath();
        c.moveTo(-490, GROUND_Y - 185);
        c.quadraticCurveTo(-120, GROUND_Y - 420, 180, GROUND_Y - 20);
        c.stroke();
        c.setLineDash([]);
      });
    }

    K.end(c);

    const barAlpha = A.win(t, 12.14, 21.8, 0.2, 0.4);
    drawTimerBar(
      c,
      960,
      78,
      520,
      A.clamp01((t - 12.14) / 9.5),
      '> 10 s  (10 MIN SHELLING)',
      P.slate,
      barAlpha
    );

    const oneShellAlpha = A.win(t, 23.0, 26.6, 0.35, 0.3);
    if (oneShellAlpha > 0.01) {
      const ptGun = K.toScreen(baseCam, -610, GROUND_Y - 140);
      drawCallout(c, ptGun, [60, -95], '1 SHELL / 10 s', oneShellAlpha, P.amber);
    }
  }
}
