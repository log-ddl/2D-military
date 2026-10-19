import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import * as M from './shared/map';
import { P, LINE } from './shared/palette';
import { drawTank, drawSoldierTop, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc14 (394.86–424.46s): Điểm mù của xe tăng (Blind spots) & Phối hợp Xe tăng – Bộ binh trong đô thị (Combined Tank-Infantry).
 * - 394.86–401.80s: Mặt cắt cận cảnh tháp pháo (`cutaway`): kíp lái ngồi trong hộp kín đóng nắp, chỉ nhìn thế giới qua khe kính tiềm vọng hẹp và màn hình nhỏ.
 * - 401.80–411.16s: Chuyển sang góc nhìn từ trên xuống giữa khu phố đô thị (`top-town`):
 *   + Xe tăng chỉ có 2 quạt nhìn hẹp chiếu ra phía trước, còn hai bên sườn sát dãy nhà là vùng mù tối.
 *   + Tại ô cửa sổ tòa nhà sát sườn xe (`[-40, -195]`), một người lính đối phương cầm súng chống tăng RPG ngồi phục kích mà xe tăng hoàn toàn không thấy.
 * - 411.16–424.46s: 4 người lính bộ binh đồng minh (`drawSoldierTop`) đi kèm hai bên sườn xe tăng:
 *   + Quạt quan sát rộng của bộ binh quét thẳng vào các ô cửa sổ hai bên, phát hiện và bắn hạ tay súng RPG lúc 414.6s.
 *   + Khi hỏa lực địch từ đầu phố bắn tới lúc 416.8s, thân giáp dày của xe tăng chắn đạn cho bộ binh nấp phía sau ("Each protects the other from its own blind spots").
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < 401.8) {
      // Pha 1 (394.86–401.80s): Cận cảnh mặt cắt kíp lái ngồi dưới nắp thép đóng kín, nhìn qua khe kính tiềm vọng hẹp
      const cam: K.Cam = {
        x: A.lerp(0, 35, A.sm(t, 394.86, 401.5)),
        y: -15,
        z: A.lerp(1.38, 1.55, A.sm(t, 394.86, 401.5)),
      };
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 185 });

      const tk = drawTank(c, {
        x: 0,
        y: 185,
        s: 2.35,
        dir: 1,
        view: 'cutaway',
        hasERA: true,
        highlightPart: 'sight',
      });

      // Tia nhìn cực hẹp qua kính tiềm vọng (narrow periscopes) còn phía trên và sau lưng bị vỏ thép che kín
      M.fan(c, tk.sight[0], tk.sight[1], 560, -0.14, 0.14, A.sm(t, 397.5, 399.5), P.sky);
      // Nhấn mạnh nắp trưởng xe đóng kín trên đầu
      A.line(c, [[-115, -142], [25, -142]], P.enemy, lwO * 1.6);

      K.end(c);
    } else {
      // Pha 2 & 3 (401.80–424.46s): Góc nhìn từ trên xuống trong khu phố (`top-town`) — Điểm mù sát sườn, Lính RPG trong cửa sổ & Bộ binh đi kèm bảo vệ lẫn nhau
      const infArriveP = A.sm(t, CUE.ch5_infantry_with_tank, CUE.ch5_infantry_with_tank + 1.8);
      const clearRpgT = 414.6;
      const frontFireT = 416.8;

      const camBase: K.Cam = {
        x: A.lerp(-40, 40, A.sm(t, 401.8, 424.0)),
        y: 0,
        z: A.lerp(1.08, 1.0, A.sm(t, 410.0, 420.0)),
      };
      const cam = K.withShake(camBase, t, [
        [clearRpgT, 12, 0.35],
        [frontFireT + 0.35, 16, 0.45],
      ]);

      K.begin(c, cam);
      drawStageBg(c, 'top-town');

      const tankX = A.lerp(-140, 20, A.sm(t, 401.8, 424.0));

      // Vùng mù sát hai bên sườn xe tăng (chỉ hiển thị đậm khi chưa có bộ binh đi kèm)
      const blindAlpha = A.lerp(0.75, 0.15, infArriveP);
      M.zone(
        c,
        [
          [tankX - 280, -340],
          [tankX + 190, -340],
          [tankX + 140, -85],
          [tankX - 280, -85],
        ],
        P.slate,
        blindAlpha,
        true
      );
      M.zone(
        c,
        [
          [tankX - 280, 85],
          [tankX + 140, 85],
          [tankX + 190, 340],
          [tankX - 280, 340],
        ],
        P.slate,
        blindAlpha,
        true
      );

      // Quạt tầm nhìn cực hẹp của riêng xe tăng hướng về phía trước
      M.fan(c, tankX + 95, 0, 580, -0.22, 0.22, 1, P.sky);

      // Xe tăng chủ lực đi giữa lòng đường phố
      drawTank(c, {
        x: tankX,
        y: 0,
        s: 1.45,
        view: 'top',
        hasERA: true,
        turretYaw: 0.05,
      });

      // Người lính đối phương cầm súng chống tăng RPG ngồi sát ô cửa sổ tòa nhà phía bắc (`[-25, -210]`) ngay trong điểm mù của xe tăng!
      const rpgShow = A.sm(t, CUE.ch5_window_rpg - 0.5, CUE.ch5_window_rpg + 0.8);
      const rpgDead = A.sm(t, clearRpgT, clearRpgT + 0.6);
      if (rpgShow > 0.01) {
        A.withA(c, rpgShow * (1 - rpgDead * 0.65), () => {
          // Ô cửa sổ mở sát mép tòa nhà
          A.rrect(c, -65, -215, 80, 46, 4, P.bg2, P.enemy, lwO);
          drawSoldierTop(c, -25, -192, 1.35, 1.45, 'foe', 'rpg');
          if (t < CUE.ch5_infantry_with_tank + 1.5) {
            UI.circleMark(c, -25, -192, 48, rpgShow, P.enemy, lwO * 1.2);
            UI.dashed(c, [-25, -165], [tankX, -65], P.enemy, lwI * 1.3, t * 90);
          }
        });
        if (rpgDead > 0.01) {
          UI.xMark(c, -25, -192, 36, rpgDead, P.enemy, lwO * 1.5);
        }
      }

      // Từ 411.16s: 4 người lính bộ binh đồng minh đi kèm hai bên sườn và sau đuôi xe tăng, mở quạt quan sát quét sạch các tòa nhà hai bên!
      if (infArriveP > 0.01) {
        const infOffsets: [number, number, number][] = [
          [-165, -125, -1.15],
          [-65, -130, -0.85],
          [-165, 125, 1.15],
          [-65, 130, 0.85],
        ];
        A.withA(c, infArriveP, () => {
          // Quạt tầm nhìn rộng của bộ binh phủ kín hai bên tòa nhà (xóa điểm mù cho xe tăng)
          M.fan(c, tankX - 110, -125, 310, -2.2, -0.35, infArriveP, P.olive);
          M.fan(c, tankX - 110, 125, 310, 0.35, 2.2, infArriveP, P.olive);

          for (const [ox, oy, ang] of infOffsets) {
            // Khi hỏa lực địch bắn từ phía trước lúc 416.8s, bộ binh hơi khép vào sau đuôi giáp xe tăng để được che chắn
            const coverShift = A.sm(t, frontFireT - 0.4, frontFireT + 0.5);
            const ix = tankX + ox - coverShift * 55;
            const iy = oy * (1 - coverShift * 0.45);
            drawSoldierTop(c, ix, iy, 1.25, ang, 'ally', 'rifle');
          }
        });

        // Lúc 414.2–414.8s: Bộ binh đồng minh bắn hạ tay súng RPG trong cửa sổ trước khi hắn kịp khai hỏa
        const infShotP = A.ph(t, clearRpgT - 0.4, clearRpgT);
        if (infShotP > 0 && infShotP <= 1) {
          FX.tracer(c, [tankX - 65, -130], [-25, -192], infShotP, 0.25, P.amber, 5);
        }
        if (t >= clearRpgT && t < clearRpgT + 0.6) {
          FX.sparks(c, -25, -192, (t - clearRpgT) / 0.6, 1.1, 1.5, Math.PI, 4);
        }

        // Lúc 416.8s ("while the tank takes the fire that would otherwise land on them"):
        // Loạt đạn từ phía trước đường phố bắn tới đập vào mũi giáp dày của xe tăng, bảo vệ toán bộ binh đứng sau!
        for (let k = 0; k < 3; k++) {
          const st = frontFireT + k * 0.28;
          const sp = A.ph(t, st, st + 0.35);
          if (sp > 0 && sp <= 1) {
            FX.straightShot(
              c,
              [680, (k - 1) * 38],
              [tankX + 165, (k - 1) * 24],
              sp,
              { color: P.enemy, w: 6 }
            );
          }
          if (t >= st + 0.35 && t < st + 0.85) {
            FX.sparks(
              c,
              tankX + 165,
              (k - 1) * 24,
              (t - (st + 0.35)) / 0.5,
              1.2,
              0,
              1.4,
              k + 2
            );
          }
        }
      }

      K.end(c);
    }
  }
}
