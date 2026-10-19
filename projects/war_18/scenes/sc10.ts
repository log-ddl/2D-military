// scenes/sc10.ts — Chương 2 (146.30 – 157.50s): Hai cơ cấu bảo vệ đơn giản trên xe tải BM-21 Grad:
// 1) Chân chống thủy lực (hydraulic jacks, 146.30 – 150.84s) hạ xuống đất giữ nhíp xe không lắc lư giữa các phát bắn.
// 2) Tấm chắn thép (steel shutters, 150.84 – 157.50s) gập che kín kính chắn gió buồng lái để luồng lửa
//    phản lực dữ dội từ đuôi loa phụt không làm vỡ kính trên đầu kíp lái.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawGrad,
  drawRocket,
  drawArrow,
  drawCallout,
} from './_assets';

const GROUND_Y = 235;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Camera nối từ góc nhìn chiếc BM-21 Grad của sc09 ({ x: 40, y: 90, z: 1.58 }),
    // tiến vào gầm xe & ca-bin, đồng thời mở khung chính diện (FRONT) ở bên phải khi giải thích tấm chắn kính.
    const cam: K.Cam = K.track(
      t,
      [
        [146.3, { x: 40, y: 90, z: 1.58 }],
        [147.2, { x: -95, y: 145, z: 2.15 }],
        [150.6, { x: -95, y: 145, z: 2.15 }],
        [151.8, { x: 55, y: 125, z: 1.85 }],
        [156.4, { x: 55, y: 125, z: 1.85 }],
        [157.5, { x: 160, y: 40, z: 1.55 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-420, 420] });

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // 146.3 – 148.2s: Chân chống chưa hạ (jacksDown = 0), thân xe nhún lắc (rockAngleDeg) khi bắn thử.
    // 148.2 – 150.8s: Chân chống thủy lực hạ xuống tỳ chặt mặt đất (jacksDown -> 1), khóa cứng nhíp (rockAngleDeg = 0).
    const jacksDown = A.sm(t, 148.0, 149.3);
    const rocking = (1 - jacksDown) * Math.sin((t - 146.3) * 14) * 3.8;

    // 150.8 – 152.6s: Tấm chắn thép trên nóc ca-bin gập sập xuống che kín kính chắn gió (shuttersDown: 0 -> 1)
    const shuttersDown = t < 150.8 ? 0.15 : A.sm(t, 151.0, 152.5);

    const hl: 'jacks' | 'shutters' | null =
      t < 150.8 ? 'jacks' : t < 156.5 ? 'shutters' : null;

    // Xe BM-21 Grad ở góc SIDE (x = -80, y = GROUND_Y)
    c.save();
    c.translate(-80, GROUND_Y);
    drawGrad(c, {
      view: 'side',
      elevateDeg: 24,
      jacksDown,
      shuttersDown,
      rockAngleDeg: rocking,
      highlight: hl,
    });
    c.restore();

    // Mũi tên chỉ lực tỳ của chân chống thủy lực khóa hệ thống treo (148.4 – 150.8s)
    const jackArrowAlpha = A.win(t, 148.3, 150.7, 0.3, 0.3);
    A.withA(c, jackArrowAlpha, () => {
      drawArrow(c, [-265, GROUND_Y - 52], [-265, GROUND_Y - 4], P.amber, lw, 11);
    });

    // Từ 151.0 – 156.6s: Đặt hình góc nhìn chính diện (FRONT view) của BM-21 Grad ngay bên phải (x = 245)
    // để người xem nhìn trực diện 2 tấm chắn thép gập xuống che kín mặt kính ca-bin có 2 người lính ngồi trong!
    const frontAlpha = A.win(t, 150.9, 156.6, 0.4, 0.4);
    A.withA(c, frontAlpha, () => {
      A.rrect(c, 115, GROUND_Y - 245, 260, 255, 10, P.paper, P.ink, lw);
      c.save();
      c.translate(245, GROUND_Y - 8);
      c.scale(0.92, 0.92);
      drawGrad(c, {
        view: 'front',
        jacksDown: 1,
        shuttersDown,
        rocketsLeft: 28,
        highlight: 'shutters',
      });
      c.restore();
    });

    // Từ 153.0 – 157.5s: Phóng đạn tên lửa, luồng lửa phản lực dữ dội từ loa phụt dội thẳng vào tấm chắn thép
    // trên kính chắn gió rồi bật ra mà kính ca-bin bên dưới hoàn toàn nguyên vẹn!
    const blastFlame = A.win(t, 153.1, 156.4, 0.25, 0.4);
    if (blastFlame > 0.01) {
      A.withA(c, blastFlame, () => {
        // Luồng lửa phản lực dội về phía nóc & tấm chắn kính ca-bin
        A.poly(
          c,
          [
            [-95, GROUND_Y - 122],
            [15, GROUND_Y - 135],
            [18, GROUND_Y - 82],
            [-65, GROUND_Y - 88],
          ],
          P.amber,
          null,
          0
        );
        drawArrow(c, [-65, GROUND_Y - 112], [-2, GROUND_Y - 102], P.enemy, lwIn * 1.3, 10);
      });
    }

    // Quả tên lửa rời ống lúc 155.4s và leo chéo lên bầu trời phải-trên để nối mượt sang Chương 3 (157.50s)
    if (t >= 155.2) {
      const dt = t - 155.2;
      const elevRad = (24 * Math.PI) / 180;
      const rx = -80 + dt * 210 * Math.cos(elevRad);
      const ry = GROUND_Y - 130 - dt * 210 * Math.sin(elevRad);
      A.line(c, [[-80, GROUND_Y - 130], [rx, ry]], P.white, lwIn * 4.5);
      c.save();
      c.translate(rx, ry);
      c.rotate(-elevRad);
      c.scale(0.85, 0.85);
      drawRocket(c, { variant: '122mm', view: 'side', thrust: 1, finOpen: 1 });
      c.restore();
    }

    K.end(c);

    // Callout 1: Chân chống thủy lực
    const cJacks = A.win(t, 146.8, 150.6, 0.3, 0.3);
    if (cJacks > 0.01) {
      const ptJack = K.toScreen(cam, -234, GROUND_Y - 18);
      drawCallout(c, ptJack, [-30, -110], 'HYDRAULIC JACKS', cJacks, P.amber);
    }

    // Callout 2: Tấm chắn thép bảo vệ kính buồng lái (neo vào tấm chắn nhưng đặt hộp chữ phía trên khung FRONT)
    const cShutters = A.win(t, 151.2, 156.4, 0.3, 0.3);
    if (cShutters > 0.01) {
      const ptSh = K.toScreen(cam, 245, GROUND_Y - 105);
      drawCallout(c, ptSh, [0, -295], 'STEEL SHUTTERS', cShutters, P.amber);
    }
  }
}
