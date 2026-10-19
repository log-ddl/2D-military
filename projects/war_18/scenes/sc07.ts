// scenes/sc07.ts — Chương 2 (78.02 – 102.36s): Vì sao pháo tự hành chỉ mang nổi 1 nòng?
// - 78.02 – 98.40s (CUTAWAY): Bắt đầu đúng tại khung cuối của sc06, tiến máy vào mặt cắt buồng đốt kín
//   của pháo nòng. Toàn bộ thuốc phóng nổ bùng một lần trong buồng thép kín, áp suất cực đại đẩy viên đạn
//   vọt đi đồng thời giáng lực giật dữ dội vào khóa nòng làm cả khối nòng thép dày hàng tấn giật lùi nén xi-lanh thủy lực.
// - 98.40 – 102.36s (SIDE): Chuyển ra toàn thân xe pháo tự hành chỉ chở nổi đúng 1 nòng pháo nặng nề.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvCutaway,
  drawEnvSide,
  drawHowitzer,
  drawGrad,
  drawRocket,
  drawCallout,
} from './_assets';
import { sc06CameraAt } from './sc06';

const SWITCH_SIDE_T = 98.4;
const GROUND_Y = 230;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_SIDE_T) {
      const startCam = sc06CameraAt(78.02); // { x: 0, y: -40, z: 1.38 }
      const focusChamberCam: K.Cam = { x: 10, y: -155, z: 1.88 };
      const baseCam = K.track(
        t,
        [
          [78.02, startCam],
          [81.2, focusChamberCam],
          [98.4, focusChamberCam],
        ],
        A.eio
      );

      // Hai lần phát hỏa minh họa áp suất cực đại & thu lùi thủy lực: lúc 82.8s và 91.8s
      const hits: [number, number, number?][] = [
        [82.8, 12, 0.55],
        [91.8, 12, 0.55],
      ];
      const cam = K.withShake(baseCam, t, hits);

      K.begin(c, cam);
      drawEnvCutaway(c, cam, 120);

      // Ống phóng tên lửa ở tầng dưới (y = 95) từ cuối sc06 mờ dần khi camera tiến vào buồng pháo nòng
      const lowerFade = 1 - A.sm(t, 78.4, 80.8);
      A.withA(c, lowerFade, () => {
        c.save();
        c.translate(0, 95);
        c.scale(1.42, 1.42);
        drawGrad(c, { view: 'cutaway' });
        drawRocket(c, {
          variant: '227mm',
          view: 'cutaway',
          fuelLeft: 0.85,
          thrust: 0.35,
          finOpen: 1,
          canardDeg: 18,
          highlight: 'guidance',
        });
        c.restore();
      });

      // Tính trạng thái bắn, áp suất buồng đốt kín và hành trình giật lùi của pháo nòng
      let shellProg = 0.04;
      let pressure = 0.35 * (1 - A.sm(t, 78.2, 80.5));
      let recoil = 0;

      if (t >= 82.8 && t < 90.2) {
        shellProg = A.eo(t, 82.8, 84.4);
        pressure = A.win(t, 82.8, 86.8, 0.15, 1.2);
        recoil = A.win(t, 82.85, 86.5, 0.2, 1.8);
      } else if (t >= 90.2) {
        shellProg = t < 91.8 ? 0.02 : A.eo(t, 91.8, 93.4);
        pressure = A.win(t, 91.8, 95.2, 0.15, 1.2);
        recoil = A.win(t, 91.85, 96.2, 0.2, 2.2);
      }

      const hl: 'breech' | 'barrel' | 'recoil' | null =
        t < 88.5 ? 'breech' : t < 93.8 ? 'barrel' : 'recoil';

      c.save();
      c.translate(-20, -165);
      c.scale(1.12, 1.12);
      drawHowitzer(c, {
        view: 'cutaway',
        chamberPressure: pressure,
        shellProg,
        recoil,
        highlight: hl,
      });
      c.restore();

      K.end(c);

      const cPress = A.win(t, 83.2, 89.8, 0.35, 0.35);
      if (cPress > 0.01) {
        const ptCh = K.toScreen(baseCam, -160, -165);
        drawCallout(c, ptCh, [-40, -125], 'SEALED CHAMBER', cPress, P.enemy);
      }

      const cRecoil = A.win(t, 90.8, 98.0, 0.35, 0.35);
      if (cRecoil > 0.01) {
        const ptRec = K.toScreen(baseCam, -140, -75);
        drawCallout(c, ptRec, [0, 105], 'HEAVY BARREL + RECOIL', cRecoil, P.amber);
      }
      return;
    }

    // ── NHỊP 2 (98.40 – 102.36s): GÓC SIDE — TOÀN THÂN PHÁO TỰ HÀNH CHỈ MANG NỔI 1 NÒNG ──
    const camSide: K.Cam = K.track(
      t,
      [
        [98.4, { x: 0, y: 125, z: 1.95 }],
        [102.36, { x: 10, y: 125, z: 1.85 }],
      ],
      A.eio
    );
    const cam = K.withShake(camSide, t, [[99.4, 11, 0.45]]);

    K.begin(c, cam);
    drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-280, 320] });

    const rec = A.win(t, 99.4, 101.2, 0.12, 1.1);
    c.save();
    c.translate(0, GROUND_Y);
    drawHowitzer(c, {
      view: 'side',
      elevateDeg: 20,
      recoil: rec,
      highlight: 'barrel',
    });
    c.restore();

    // Lửa đầu nòng khi bắn lúc 99.4s
    const flashP = (t - 99.4) / 0.45;
    if (flashP > 0 && flashP < 1) {
      const lw = A.px(c, LINE.inner);
      A.circle(c, 225, GROUND_Y - 185, 38 * (1 - flashP * 0.4), P.amber, P.ink, lw);
    }

    K.end(c);

    const cOne = A.win(t, 98.8, 102.2, 0.3, 0.25);
    if (cOne > 0.01) {
      const ptBarrel = K.toScreen(camSide, 80, GROUND_Y - 155);
      drawCallout(c, ptBarrel, [40, -100], '1 HEAVY BARREL', cOne, P.amber);
    }
  }
}
