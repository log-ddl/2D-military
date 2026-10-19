// scenes/sc05.ts — Chương 2, Shot 2.2 (116.10 – 143.00s)
// Góc SIDE Mặt cắt dọc (Cutaway): Hộp cánh chịu lực dời lên nóc giúp hạ sàn khoang xuống chỉ còn 1.5m;
// kết hợp đuôi chữ T nâng cao, bửng đuôi thép mở hạ xuống chạm đất để xe tăng 60 tấn tự lái thẳng vào khoang như lên phà.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch2StateAt } from './_state';
import {
  drawC17,
  drawTank,
  drawGroundSide,
  drawCallout,
  lw,
} from './_assets';

const camWingBox: K.Cam = { x: 25, y: -125, z: 1.68 };
const camTailRamp: K.Cam = { x: -115, y: -135, z: 1.52 };
const camTankDriveIn: K.Cam = { x: -45, y: -125, z: 1.58 };

const camTrack: [number, K.Cam][] = [
  [116.10, camWingBox],
  [123.50, camWingBox],
  [126.20, camTailRamp],
  [134.00, camTailRamp],
  [138.50, camTankDriveIn],
  [143.00, camTankDriveIn],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = ch2StateAt(t);
    const cam = K.track(t, camTrack, A.eio);

    A.clear(c, P.bg);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    drawGroundSide(c, cam, 'dirt', 0);

    // 1. Chuyển động minh hoạ cơ chế (116.10–120.0s): Hộp cánh chịu lực (wing box) nhấc khỏi bụng lên gắn trên nóc
    const wbLift = A.eio(t, CUE.ch2_wing_box + 0.3, CUE.ch2_floor_1_5m - 0.3);
    if (wbLift < 0.99) {
      const ghostY = A.lerp(-82, -196, wbLift);
      A.withA(c, 1 - wbLift * 0.7, () => {
        A.rrect(c, -65, ghostY, 155, 34, 6, P.amber, P.ink, outW);
        // Mũi tên chỉ hướng dời hộp cánh từ bụng lên nóc
        A.line(c, [[12, -75], [12, -162]], P.amber, lw(c, 4.5), [10, 6]);
        A.poly(c, [[12, -172], [2, -154], [22, -154]], P.amber, P.ink, inW);
      });
    }

    // 2. Vẽ chiếc C-17 ở góc SIDE mặt cắt dọc (Cutaway)
    const hiWing = A.win(t, CUE.ch2_wing_box, CUE.ch2_t_tail, 0.3, 0.5);
    const hiFloor = A.win(t, CUE.ch2_floor_1_5m - 0.2, CUE.ch2_t_tail + 0.5, 0.3, 0.5);
    const hiTail = A.win(t, CUE.ch2_t_tail, CUE.ch2_no_crane, 0.3, 0.5);
    const hiRamp = A.win(t, CUE.ch2_ramp_open, 142.8, 0.3, 0.4);

    drawC17(c, 0, 0, {
      view: 'cutaway',
      scale: 1,
      rampOpen: st.rampOpen,
      hiWing,
      hiFloor,
      hiTail,
      hiRamp,
    });

    // 3. Thước đo độ cao sàn khoang chỉ còn 1.5m so với mặt đất (120.24–133.5s)
    const dim15Alpha = A.win(t, CUE.ch2_floor_1_5m, 133.5, 0.35, 0.4);
    A.withA(c, dim15Alpha, () => {
      const dx = 252;
      A.line(c, [[dx, -2], [dx, -54]], P.sky, lw(c, 4));
      A.line(c, [[dx - 14, -2], [dx + 14, -2]], P.sky, lw(c, 4));
      A.line(c, [[dx - 14, -56], [dx + 14, -56]], P.sky, lw(c, 4));
    });

    // 4. Chiếc xe tăng chủ lực 60 tấn đứng chờ bên trái rồi tự lái thẳng lên cầu dẫn thép vào khoang (133.70–143.00s)
    drawTank(c, st.tankX, st.tankY, {
      view: 'side',
      scale: 0.88,
      pitch: st.tankPitch,
      hiFootprint: A.sm(t, 141.2, 142.8),
    });

    // Mũi tên dẫn hướng xe tăng leo thẳng qua cầu đuôi vào khoang như lên phà
    const ferryArrow = A.win(t, CUE.ch2_drive_ferry - 0.4, 142.2, 0.3, 0.4);
    A.withA(c, ferryArrow, () => {
      A.line(c, [[-430, -18], [-255, -62], [-95, -62]], P.amber, lw(c, 4), [12, 8]);
    });

    K.end(c);

    // Callout 1.5m (đối lập trực tiếp với 5m ở Chương 1)
    drawCallout(c, cam, 252, -28, 82, 0, '1.5m', dim15Alpha, P.sky);
  }
}
