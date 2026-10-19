// scenes/sc03.ts — Chương 1 (26.80 – 38.78s): Năm 1941, kỹ sư Liên Xô bắt giàn ray thép lên lưng xe tải
// thường tạo thành Katyusha; một khẩu đội phóng hơn 4 tấn thuốc nổ trong dưới 10 giây.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawKatyusha,
  drawRocket,
  drawCallout,
  drawTimerBar,
} from './_assets';

const GROUND_Y = 230;

export const KATYUSHA_LAUNCH_TIMES = [
  34.18, 34.48, 34.78, 35.08, 35.38, 35.68, 35.98, 36.28,
  36.58, 36.88, 37.18, 37.48, 37.78, 38.08, 38.38,
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Chủ thể lớn trong khung: cận chiếc Katyusha ở z=2.3 khi lắp ray thép, sau đó lùi ra z=1.35 thấy khẩu đội 3 xe khai hỏa
    const camClose: K.Cam = { x: -45, y: 150, z: 2.32 };
    const camBattery: K.Cam = { x: -65, y: 100, z: 1.38 };
    const baseCam = K.track(
      t,
      [
        [26.8, camClose],
        [33.1, camClose],
        [34.4, camBattery],
        [38.78, { x: 10, y: 75, z: 1.32 }],
      ],
      A.eio
    );

    const hits: [number, number, number?][] = KATYUSHA_LAUNCH_TIMES.map((t0) => [t0, 4.5, 0.22]);
    const cam = K.withShake(baseCam, t, hits);

    K.begin(c, cam);

    drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-680, 120] });

    const railMountProg = A.sm(t, 27.1, 29.6);
    const loadRockets = Math.floor(A.lerp(0, 4.99, A.sm(t, 29.6, 32.8)));

    const batteryAlpha = A.sm(t, 33.0, 34.1);
    A.withA(c, batteryAlpha, () => {
      for (const [bx, by, sc] of [[-310, GROUND_Y - 10, 0.92], [-530, GROUND_Y - 20, 0.84]] as [number, number, number][]) {
        c.save();
        c.translate(bx, by);
        c.scale(sc, sc);
        drawKatyusha(c, { view: 'side', railMountProg: 1, rocketCount: 4, elevateDeg: 26 });
        c.restore();
      }
    });

    const firedFromMain = KATYUSHA_LAUNCH_TIMES.filter((lt, idx) => idx % 3 === 0 && t >= lt).length;
    c.save();
    c.translate(-60, GROUND_Y);
    drawKatyusha(c, {
      view: 'side',
      railMountProg,
      rocketCount: Math.max(0, loadRockets - Math.min(3, firedFromMain)),
      elevateDeg: 26,
    });
    c.restore();

    const elevRad = (26 * Math.PI) / 180;
    const cosE = Math.cos(elevRad);
    const sinE = Math.sin(elevRad);
    const origins: [number, number][] = [
      [-85, GROUND_Y - 115],
      [-330, GROUND_Y - 115],
      [-545, GROUND_Y - 118],
    ];

    const lwIn = A.px(c, LINE.inner);
    for (let i = 0; i < KATYUSHA_LAUNCH_TIMES.length; i++) {
      const lt0 = KATYUSHA_LAUNCH_TIMES[i]!;
      if (t < lt0) continue;
      const dt = t - lt0;
      const [ox, oy] = origins[i % 3]!;
      const rowOffset = (i % 4) * 9;
      const dist = 320 * dt + 260 * dt * dt;
      const rx = ox + dist * cosE;
      const ry = oy - rowOffset - dist * sinE;

      const smokeAlpha = A.clamp01(1 - dt / 3.4) * 0.78;
      A.withA(c, smokeAlpha, () => {
        A.line(c, [[ox, oy - rowOffset], [rx - 40 * cosE, ry + 40 * sinE]], P.white, lwIn * 4.5);
        A.line(c, [[ox, oy - rowOffset], [rx - 40 * cosE, ry + 40 * sinE]], P.light, lwIn * 1.6);
      });

      if (dt < 2.2) {
        c.save();
        c.translate(rx, ry);
        c.rotate(-elevRad);
        c.scale(0.62, 0.62);
        drawRocket(c, {
          variant: '122mm',
          view: 'side',
          thrust: 1,
          finOpen: 1,
          spinPhase: t * 4 + i,
        });
        c.restore();
      }
    }

    K.end(c);

    const c1941 = A.win(t, 27.3, 33.1, 0.35, 0.35);
    if (c1941 > 0.01) {
      const ptRail = K.toScreen(baseCam, -105, GROUND_Y - 110);
      drawCallout(c, ptRail, [0, -105], '1941 · KATYUSHA', c1941, P.amber);
    }

    const cTons = A.win(t, 34.6, 38.6, 0.35, 0.3);
    if (cTons > 0.01) {
      const ptSalvo = K.toScreen(baseCam, 50, GROUND_Y - 210);
      drawCallout(c, ptSalvo, [90, -70], '> 4 TONS  (< 10 s)', cTons, P.amber);
      drawTimerBar(
        c,
        960,
        78,
        520,
        A.clamp01((t - 34.04) / 4.7),
        '< 10 s SALVO',
        P.amber,
        cTons
      );
    }
  }
}
