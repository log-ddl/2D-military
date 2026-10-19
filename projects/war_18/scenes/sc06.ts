// scenes/sc06.ts — Chương 1 (68.08 – 78.02s): "The answer follows the parts of the system itself..."
// Góc nhìn SIDE chuyển sang CUTAWAY trên bệ phóng & quả tên lửa tách lớp:
// Lần lượt làm nổi 4 bộ phận sẽ được giải thích xuyên suốt bộ phim (ống phóng hở không giật ->
// cánh đuôi ổn định -> hộp pod & cẩu tự nạp -> đầu mũi dẫn đường), rồi xếp 2 mặt cắt
// (buồng đốt pháo nòng phía trên & ống phóng tên lửa phía dưới) để nối liền sang Chương 2.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import {
  drawEnvCutaway,
  drawHimars,
  drawGrad,
  drawRocket,
  drawHowitzer,
} from './_assets';
import { LINE } from './shared/palette';

export function sc06CameraAt(t: number): K.Cam {
  return K.track(
    t,
    [
      [68.08, { x: 0, y: 15, z: 1.24 }],
      [75.4, { x: 0, y: 15, z: 1.28 }],
      [78.02, { x: 0, y: -40, z: 1.38 }],
    ],
    A.eio
  );
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam = sc06CameraAt(t);
    K.begin(c, cam);

    drawEnvCutaway(c, cam, 120);
    const lwIn = A.px(c, LINE.inner);

    const activeStage =
      t < 70.6 ? 1 :
      t < 72.8 ? 2 :
      t < 74.8 ? 3 :
                 4;

    // Từ 75.6 – 78.02s: Dịch mặt cắt ống phóng tên lửa xuống y = 95 để nhường tầng trên (y = -165)
    // cho mặt cắt buồng đốt pháo nòng, tạo bố cục so sánh trên-dưới hoàn hảo cho đầu Chương 2!
    const ch2Prep = A.sm(t, 75.6, 77.6);
    const rocketY = A.lerp(-120, 95, ch2Prep);

    c.save();
    c.translate(0, rocketY);
    c.scale(1.42, 1.42);
    drawGrad(c, {
      view: 'cutaway',
      highlight: activeStage === 1 ? 'tubes' : activeStage === 2 ? 'grooves' : null,
    });
    drawRocket(c, {
      variant: '227mm',
      view: 'cutaway',
      fuelLeft: 0.85,
      thrust: activeStage === 1 ? 0.9 : 0.35,
      finOpen: activeStage >= 2 ? 1 : 0.25,
      canardDeg: activeStage === 4 ? 18 : 0,
      highlight:
        activeStage === 1
          ? 'motor'
          : activeStage === 2
          ? 'fins'
          : activeStage === 4
          ? 'guidance'
          : null,
    });
    c.restore();

    // Nửa dưới (y = 225): Xe phóng M142 HIMARS ở chế độ mặt cắt hộp Pod & cần cẩu (mờ đi khi chuyển sang so sánh buồng đốt ở 75.6s)
    const lowerAlpha = 1 - ch2Prep;
    A.withA(c, lowerAlpha, () => {
      c.save();
      c.translate(30, 235);
      c.scale(1.3, 1.3);
      drawHimars(c, {
        view: 'cutaway',
        elevateDeg: 0,
        craneExtend: activeStage === 3 ? 0.55 : 0,
        cableDrop: activeStage === 3 ? 0.25 : 0,
        highlightCrane: activeStage === 3,
      });
      c.restore();

      A.line(c, [[-80, 95], [-190, -40]], P.slate, lwIn, [8, 6]);
      A.line(c, [[90, 95], [150, -40]], P.slate, lwIn, [8, 6]);
    });

    // Tầng trên (y = -165): Mặt cắt buồng đốt pháo nòng xuất hiện từ 75.6s để chuẩn bị cho Chương 2 (78.02s)
    A.withA(c, ch2Prep, () => {
      c.save();
      c.translate(-20, -165);
      c.scale(1.12, 1.12);
      drawHowitzer(c, {
        view: 'cutaway',
        chamberPressure: 0.35,
        shellProg: 0.04,
        highlight: 'breech',
      });
      c.restore();
    });

    K.end(c);
  }
}
