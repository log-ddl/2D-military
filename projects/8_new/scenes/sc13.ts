import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import * as M from './shared/map';
import { P, LINE } from './shared/palette';
import { drawTank, drawTopThreat, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc13 (363.34–394.86s): Mối đe dọa từ trên cao (Top-attack threats) — Drone thả đạn, Tên lửa đột nóc & Lồng thép chống drone (Cope cage).
 * - 363.34–370.56s: Suốt thế kỷ 20, đòn tấn công đến từ phía trước nơi giáp mặt tháp pháo/mũi thân xe dày nhất.
 * - 370.56–381.62s: Ngày nay nguy hiểm đến từ trên cao: Drone 4 cánh quạt thả quả đạn nhỏ thẳng xuống nóc mỏng (375.5s), và Tên lửa chống tăng bay vọt qua đầu rồi bổ nhào thẳng đứng xuống nóc tháp pháo (379.5s) mà không chạm vào giáp trước.
 * - 381.62–387.12s: Nếu phủ lên toàn bộ nóc xe tấm giáp dày bằng giáp trước, chiếc xe sẽ nặng gấp đôi và sập lún xuống mặt đất.
 * - 387.12–394.86s: Xe tăng mọc thêm khung lồng thép (`hasCage = true`), lưới và cảm biến quét lên bầu trời, kích nổ sớm quả đạn drone ở khoảng cách an toàn phía trên nóc.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    const droneHitT = 375.6;
    const missileHitT = 379.8;
    const cageHitT = 391.2;

    const camBase: K.Cam = K.track(
      t,
      [
        [363.34, { x: 0, y: 15, z: 1.12 }],
        [370.56, { x: 0, y: -45, z: 1.04 }],
        [381.62, { x: 0, y: 25, z: 1.18 }],
        [387.12, { x: 0, y: -35, z: 1.12 }],
      ],
      A.eio
    );
    const cam = K.withShake(camBase, t, [
      [368.2, 14, 0.45],
      [droneHitT, 18, 0.55],
      [missileHitT, 22, 0.65],
      [cageHitT, 16, 0.5],
    ]);

    K.begin(c, cam);

    // Độ lún mặt đất khi thử đắp tấm giáp dày gấp đôi lên toàn bộ nóc xe (381.62–387.12s)
    const heavyTopP = A.win(t, CUE.ch5_double_weight, CUE.ch5_cages_nets, 0.5, 0.5);
    const sinkY = heavyTopP * 36;
    drawStageBg(c, 'field', { groundY: 220 + sinkY });

    const hasCage = t >= CUE.ch5_cages_nets;
    drawTank(c, {
      x: 0,
      y: 220 + sinkY,
      s: 2.1,
      dir: 1,
      view: 'cutaway',
      hasERA: true,
      hasCage,
      highlightPart: t < CUE.ch5_above_threat ? 'armor' : 'none',
    });

    // Làm nổi bật phần nóc tháp pháo cực mỏng bằng đường kẻ đỏ mảnh từ 370.56–387.0s
    if (t >= CUE.ch5_above_threat && t < CUE.ch5_cages_nets) {
      A.line(c, [[-310, -56 + sinkY], [115, -58 + sinkY]], P.enemy, lwO * 1.4);
    }

    if (t < CUE.ch5_above_threat) {
      // Pha 1 (363.34–370.56s): Mối đe dọa truyền thống thế kỷ 20 từ phía trước -> bị giáp mũi dày đánh bật
      const fShotP = A.ph(t, 366.8, 368.2);
      if (fShotP > 0 && fShotP <= 1) {
        FX.straightShot(c, [780, 35], [250, 35], fShotP, { color: P.enemy, w: 8 });
      }
      if (t >= 368.2) {
        const bAge = t - 368.2;
        FX.explosion(c, 255, 35, 110, A.clamp01(bAge / 0.55));
        FX.sparks(c, 255, 35, A.clamp01(bAge / 0.7), 1.4, -0.8, 1.3, 4);
      }
      UI.arrow(c, [680, -10], [310, -10], {
        p: A.sm(t, 365.4, 367.0),
        color: P.enemy,
        w: 7,
      });
    } else if (t < CUE.ch5_double_weight) {
      // Pha 2 (370.56–381.62s): Nguy hiểm từ bầu trời — Drone thả đạn lõm (372.8–376.5s) & Tên lửa đột nóc (377.0–381.5s)
      // 1. Drone 4 cánh quạt bay lơ lửng trên đỉnh tháp pháo và thả đạn xuống nóc mỏng
      if (t < 377.4) {
        const drIn = A.sm(t, 371.0, 373.0);
        const drOut = A.sm(t, 376.4, 377.4);
        const dropP = A.ei(t, 373.6, droneHitT);
        const drX = A.lerp(-280, -85, drIn) - drOut * 160;
        const drY = -320 - drOut * 90;
        drawTopThreat(
          c,
          drX,
          drY,
          1.35,
          'drone',
          0,
          t < droneHitT ? dropP : 0,
          t
        );
      }
      if (t >= droneHitT && t < 377.6) {
        const dAge = t - droneHitT;
        FX.explosion(c, -85, -56, 135, A.clamp01(dAge / 0.65));
        // Tia xuyên thẳng từ nóc mỏng xuống khoang kíp lái
        A.line(c, [[-85, -56], [-85, 85]], P.enemy, lwO * 1.5);
      }

      // 2. Tên lửa đột nóc (Top-attack missile) bay vọt lên cao rồi lao chúc thẳng xuống nóc tháp pháo (377.2–381.4s)
      if (t >= 377.0) {
        const mP = A.sm(t, 377.2, missileHitT);
        const aPt: A.Pt = [760, -120];
        const bPt: A.Pt = [15, -56];
        FX.arcShot(c, aPt, bPt, mP, 260, {
          color: P.enemy,
          w: 5,
          head: (ctx, hx, hy, ang) => {
            drawTopThreat(ctx, hx, hy, 1.15, 'missile', ang, 0, 0);
          },
        });
        if (t >= missileHitT) {
          const mAge = t - missileHitT;
          FX.explosion(c, 15, -56, 165, A.clamp01(mAge / 0.7));
          FX.fire(c, 15, -45, mAge, 1.4);
          A.line(c, [[15, -56], [15, 110]], P.amber, lwO * 1.6);
        }
      }
    } else if (t < CUE.ch5_cages_nets) {
      // Pha 3 (381.62–387.12s): Thử đắp tấm thép dày như giáp trước lên toàn bộ nóc xe -> Xe nặng gấp đôi và lún sập mặt đất
      const slabY = A.lerp(-220, -98 + sinkY, A.eo(t, 381.8, 383.2));
      A.rrect(c, -330, slabY, 480, 44, 6, P.dark, P.ink, lwO);
      UI.arrow(c, [-90, slabY - 85], [-90, slabY - 10], {
        p: A.sm(t, 382.0, 383.5),
        color: P.enemy,
        w: 8,
      });
    } else {
      // Pha 4 (387.12–394.86s): Lồng thép chống drone (Cope cage) + Cảm biến quét bầu trời kích nổ sớm đạn thả từ trên cao
      const scanP = A.sm(t, CUE.ch5_cages_nets + 0.5, CUE.ch5_cages_nets + 2.0);
      // Quạt cảm biến hướng lên bầu trời ("crews watch the sky as well as the ground")
      M.fan(c, 120, -85, 340, -2.35, -0.78, scanP, P.sky);

      // Drone thả đạn xuống nhưng bị khung lồng thép trên nóc chặn lại ở y = -142 (cách xa nóc tháp pháo)
      const dropCage = A.ei(t, 389.2, cageHitT);
      drawTopThreat(
        c,
        -65,
        -350,
        1.3,
        'drone',
        0,
        t < cageHitT ? dropCage * 0.68 : 0,
        t
      );
      if (t >= cageHitT) {
        const cAge = t - cageHitT;
        FX.explosion(c, -65, -142, 115, A.clamp01(cAge / 0.6));
        FX.sparks(c, -65, -142, A.clamp01(cAge / 0.7), 1.3, -Math.PI / 2, 1.8, 6);
      }
    }

    K.end(c);
  }
}
