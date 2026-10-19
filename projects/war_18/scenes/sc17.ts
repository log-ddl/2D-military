// scenes/sc17.ts — Chương 4 (286.20 – 302.60s): Cơ cấu cần cẩu & tời cáp cơ khí tích hợp ngay trong khung bệ phóng.
// Sau khi bắn, chiếc M142 HIMARS chạy tới điểm giấu ven đường nơi xe tiếp vận đã đặt sẵn hộp pod mới trên mặt đất,
// hạ hộp rỗng xuống, cẩu hộp đầy lên trong khoảng 5 phút mà không ai phải chạm vào quả đạn trần, rồi phóng đi.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import {
  drawEnvSide,
  drawHimars,
  drawSupplyTruck,
  drawPod,
  drawSoldier,
  drawCallout,
  drawTimerBar,
} from './_assets';

const GROUND_Y = 230;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam: K.Cam = K.track(
      t,
      [
        [286.2, { x: -40, y: 120, z: 1.78 }],
        [289.8, { x: -40, y: 120, z: 1.65 }],
        [299.6, { x: -40, y: 120, z: 1.65 }],
        [302.6, { x: 120, y: 120, z: 1.55 }],
      ],
      A.eio
    );

    K.begin(c, cam);

    // Điểm giấu ven đường dưới tán cây thông cao
    drawEnvSide(c, cam, {
      groundY: GROUND_Y,
      showTrees: true,
      hideCanopyX: -60,
      clearZoneX: [-520, 480],
    });

    // Xe tiếp vận (Supply Truck) vừa đặt hộp Pod mới xuống đất rồi chạy đi về bên trái (289.8 – 293.8s)
    if (t >= 289.5 && t <= 294.5) {
      const sx = A.lerp(-420, -780, A.sm(t, 290.0, 294.2));
      c.save();
      c.translate(sx, GROUND_Y);
      c.scale(-0.85, 0.85);
      drawSupplyTruck(c, { podsCount: 1 });
      c.restore();
    }

    // Chuỗi động tác nạp hộp Pod bằng cần cẩu tích hợp trên HIMARS:
    // - 286.2 – 290.0s: Làm nổi dầm cẩu (craneExtend: 0 -> 0.75 rồi thu về 0)
    // - 290.0 – 294.5s: Hạ hộp rỗng (Empty Pod) xuống đất ở x = -360, xe nhích lên để dầm cẩu nằm ngay trên hộp đầy (x = -205)
    // - 294.5 – 299.4s: Dầm cẩu vươn ra (craneExtend = 1), tời cáp kéo hộp Pod mới từ mặt đất lên khóa gọn vào khung bệ
    // - 299.6 – 302.6s: Chiếc HIMARS đã nạp đầy phóng vọt đi về bên phải!
    let craneExtend = 0;
    let cableDrop = 0;
    let truckX = -60;

    if (t < 290.0) {
      craneExtend = A.win(t, 286.6, 289.8, 0.8, 0.8) * 0.85;
      cableDrop = A.win(t, 287.2, 289.6, 0.6, 0.6) * 0.45;
    } else if (t < 294.4) {
      // Hạ hộp rỗng xuống đất
      craneExtend = A.win(t, 290.2, 294.2, 0.6, 0.5);
      cableDrop = A.sm(t, 291.0, 293.6);
      truckX = A.lerp(-140, -60, A.sm(t, 293.4, 294.4));
    } else if (t < 299.6) {
      // Kéo hộp Pod đầy từ mặt đất lên thu gọn vào khung bệ
      craneExtend = 1 - A.sm(t, 297.6, 299.3);
      cableDrop = 1 - A.sm(t, 295.0, 297.6);
      truckX = -60;
    } else {
      // Lái xe rời đi ngay sau khi nạp xong
      truckX = A.lerp(-60, 520, A.ei(t, 299.6, 302.6));
    }

    // Hộp Pod rỗng đã được bỏ lại trên mặt đất bên trái (x = -365) từ 293.5s
    if (t >= 293.5) {
      c.save();
      c.translate(-365, GROUND_Y - 36);
      drawPod(c, { view: 'side', variant: '6x227', rocketsLeft: 0 });
      c.restore();
    }

    // Hộp Pod mới đặt sẵn trên mặt đất trước khi cần cẩu nhấc lên (289.8 – 294.4s)
    if (t >= 289.8 && t < 294.4) {
      c.save();
      c.translate(-205, GROUND_Y - 36);
      drawPod(c, { view: 'side', variant: '6x227', rocketsLeft: 6, highlight: true });
      c.restore();
    }

    // Chiếc M142 HIMARS thực hiện thao tác cẩu nạp
    c.save();
    c.translate(truckX, GROUND_Y);
    drawHimars(c, {
      view: 'side',
      elevateDeg: t > 299.6 ? 12 : 0,
      craneExtend,
      cableDrop,
      highlightCrane: t < 299.4,
    });
    c.restore();

    // Một người lính đứng cách xe vài mét cầm hộp điều khiển bấm nút (không hề chạm tay vào đạn trần!)
    if (t >= 291.0 && t < 299.4) {
      c.save();
      c.translate(125, GROUND_Y);
      drawSoldier(c, { view: 'side', faction: 'ally', pose: 'stand', dir: -1 });
      c.restore();
    }

    K.end(c);

    const cCrane = A.win(t, 286.4, 290.5, 0.3, 0.3);
    if (cCrane > 0.01) {
      const ptC = K.toScreen(cam, -120, GROUND_Y - 165);
      drawCallout(c, ptC, [0, -75], 'BUILT-IN CRANE & WINCH', cCrane, P.amber);
    }

    const cFiveMin = A.win(t, 294.2, 301.8, 0.35, 0.35);
    if (cFiveMin > 0.01) {
      drawTimerBar(
        c,
        960,
        78,
        520,
        A.clamp01((t - 294.2) / 5.2),
        '~ 5 MIN POD RELOAD',
        P.sky,
        cFiveMin
      );
    }
  }
}
