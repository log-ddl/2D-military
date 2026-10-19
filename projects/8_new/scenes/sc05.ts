import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import * as M from './shared/map';
import { P, LINE } from './shared/palette';
import { drawTank, drawArmorCutaway, drawRound, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc05 (113.08–143.68s): Phòng thủ — Giáp dày quá nặng -> Mặt cắt giáp phức hợp nhiều lớp (Composite sandwich) -> Phân bổ giáp nhìn từ trên xuống (Top-down armor distribution).
 * - 113.08–123.50s: Nối mượt từ cuối sc04 (cùng vị trí xe tăng ta ở bên trái): khi thử đắp khối thép đặc dày lên mũi xe (117.3s), mặt cầu dưới bánh xích bị võng gãy vì quá nặng.
 * - 123.50–133.14s: Cận cảnh mặt cắt tấm giáp phức hợp (Thép - Gốm - Thép): thanh xuyên APFSDS đâm vào bị lớp gốm làm cùn và vỡ vụn (127.5s); sau đó ô gốm hỏng được nhấc ra thay thế bằng mô-đun mới (130.8s).
 * - 133.14–143.68s: Chuyển sang góc nhìn thẳng từ trên xuống (`top`): hiển thị rõ phần lớn trọng lượng giáp dồn vào mặt trước tháp pháo và mũi thân xe (màu vàng cam dày), còn hai bên sườn và đuôi rất mỏng (viền đỏ).
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < CUE.ch2_layered) {
      // Pha 1 (113.08–123.50s): Nối trực tiếp từ cuối sc04 -> tiến vào chiếc xe tăng ta và thử đắp giáp thép đặc quá nặng làm sập dầm cầu/đường ray
      const heavyP = A.sm(t, CUE.ch2_thick_heavy, CUE.ch2_thick_heavy + 2.2);
      const sagY = heavyP * 38;

      const cam = K.track(
        t,
        [
          [113.08, { x: 120, y: 15, z: 1.0 }],
          [116.2, { x: -320, y: 35, z: 1.32 }],
          [123.5, { x: -280, y: 35, z: 1.38 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawStageBg(c, 'field', { groundY: 210 });

      // Dầm cầu/đường ray dưới gầm xe tăng bị uốn cong và nứt khi đắp thêm khối thép đặc
      A.poly(
        c,
        [
          [-820, 210],
          [-440, 210 + sagY],
          [-60, 210],
          [-60, 232],
          [-440, 232 + sagY],
          [-820, 232],
        ],
        P.sand,
        P.ink,
        lwO
      );
      if (heavyP > 0.4) {
        A.line(
          c,
          [
            [-440, 232 + sagY],
            [-430, 215 + sagY],
            [-450, 210 + sagY],
          ],
          P.enemy,
          lwO
        );
      }

      drawTank(c, {
        x: -440,
        y: 210 + sagY,
        s: 1.75,
        dir: 1,
        view: 'cutaway',
        gunPitch: A.lerp(0.065, 0, A.sm(t, 113.08, 115.0)),
        highlightPart: 'armor',
      });

      // Giữ xác xe tăng mục tiêu đang bốc khói ở x = 640 từ cuối sc04 để chỗ nối 113.08s liền mạch tuyệt đối
      drawTank(c, {
        x: 640,
        y: 210,
        s: 1.25,
        dir: -1,
        view: 'side',
        side: 'foe',
        burntInside: 1,
      });
      FX.smoke(c, 580, 110, t - 110.75, 1.5, 7);

      // Khối thép đặc khổng lồ đè lên mũi xe khi nói "Armor that is simply thick gets heavy fast"
      if (heavyP > 0.01) {
        A.withA(c, heavyP, () => {
          A.poly(
            c,
            [
              [-350, -35 + sagY],
              [-150, 45 + sagY],
              [-190, 145 + sagY],
              [-380, 55 + sagY],
            ],
            P.dark,
            P.ink,
            lwO
          );
          // Mũi tên trọng lượng đè xuống mặt cầu
          UI.arrow(c, [-260, -95], [-260, -10 + sagY], { p: heavyP, color: P.enemy, w: 8 });
        });
      }

      K.end(c);
    } else if (t < CUE.ch2_front_armor) {
      // Pha 2 (123.50–133.14s): Cận cảnh mặt cắt giáp phức hợp (Composite sandwich: Thép - Gốm - Thép) chặn đứng thanh xuyên và thay thế mô-đun hỏng
      const hitT = 127.0;
      const penP = A.sm(t, 125.4, hitT + 1.2);
      const replaceP = A.sm(t, 130.3, 132.6);

      const cam = K.withShake({ x: 35, y: -5, z: 1.62 }, t, [[hitT, 18, 0.5]]);
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 320 });

      // Vẽ mặt cắt cụm giáp phức hợp lớn ở giữa khung (x = 90, y = 10)
      drawArmorCutaway(c, 90, 10, 1.35, {
        mode: 'composite',
        impactP: replaceP > 0.6 ? 0 : penP,
      });

      // Thanh xuyên APFSDS bay từ trái vào, chạm lớp gốm ở giữa thì bị gãy cùn mũi
      if (t >= 125.2 && t < 130.3) {
        const dx = A.lerp(-480, -35, A.clamp01(penP * 1.35));
        const blunt = A.clamp01((penP - 0.55) * 2.2);
        c.save();
        c.translate(dx, -10);
        // Nếu bị cùn mũi, thu ngắn thanh xuyên và toé tia lửa
        c.scale(1 - blunt * 0.45, 1 + blunt * 0.25);
        drawRound(c, 0, 0, 1.45, 0, 'dart');
        c.restore();

        if (blunt > 0.05 && blunt < 0.95) {
          FX.sparks(c, -10, -10, blunt, 1.35, Math.PI, 1.6, 5);
        }
      }

      // Khi nói "and are built so that damaged sections can be replaced" (130.24–132.84s):
      // Mô-đun gốm bị nứt trượt ra lên trên và mô-đun gốm mới trượt vào thế chỗ
      if (replaceP > 0.01) {
        const outY = A.lerp(0, -240, A.clamp01(replaceP * 1.8));
        A.withA(c, 1 - A.clamp01((replaceP - 0.3) * 2), () => {
          A.rrect(c, 45, outY - 35, 76, 70, 6, P.amber, P.enemy, lwO);
        });
        if (replaceP > 0.35) {
          const inP = A.sm(replaceP, 0.35, 0.95);
          const inY = A.lerp(-240, -15, inP);
          A.rrect(c, 55, inY - 25, 72, 52, 6, P.sky, P.ink, lwO);
          UI.arrow(c, [91, inY - 95], [91, inY - 35], { p: inP, color: P.sky, w: 6 });
        }
      }

      K.end(c);
    } else {
      // Pha 3 (133.14–143.68s): Góc nhìn từ trên xuống (`top`) — Giáp dồn vào cung phía trước nơi dự kiến có kẻ địch, còn hai bên sườn và đuôi rất mỏng
      const cam: K.Cam = {
        x: 40,
        y: 0,
        z: A.lerp(1.18, 1.08, A.sm(t, CUE.ch2_front_armor, 143.5)),
      };
      K.begin(c, cam);
      drawStageBg(c, 'top-map');

      const frontP = A.sm(t, CUE.ch2_front_armor, CUE.ch2_front_armor + 1.8);
      const thinP = A.sm(t, CUE.ch2_thick_thin, CUE.ch2_thick_thin + 1.5);

      // Góc quạt tầm hướng địch phía trước (nơi xe tăng kỳ vọng bị bắn trúng)
      M.fan(c, 80, 0, 520, -0.52, 0.52, frontP, P.amber);

      drawTank(c, {
        x: -40,
        y: 0,
        s: 2.15,
        view: 'top-cutaway',
        ammoLayout: 'bustle',
        highlightPart: 'armor',
      });

      // Các mũi tên đòn đánh từ phía trước bị chặn lại bởi lớp giáp mũi dày
      if (frontP > 0.2) {
        for (const [ay, ang] of [
          [-125, -0.18],
          [0, 0],
          [125, 0.18],
        ] as const) {
          const sx = 540;
          const sy = ay * 1.4;
          const ex = 225;
          const ey = ay * 0.55;
          UI.arrow(c, [sx, sy], [ex, ey], { p: frontP, color: P.amber, w: 7 });
        }
      }

      // Khi nói "thick where it is expected to be hit, and thin where it isn't" (140.02–143.54s):
      // Làm nổi bật 3 hướng sườn trái, sườn phải và phía sau bằng mũi tên cảnh báo đỏ chỉ vào lớp vỏ mỏng
      if (thinP > 0.05) {
        UI.arrow(c, [-60, -340], [-60, -195], { p: thinP, color: P.enemy, w: 6 });
        UI.arrow(c, [-60, 340], [-60, 195], { p: thinP, color: P.enemy, w: 6 });
        UI.arrow(c, [-490, 0], [-360, 0], { p: thinP, color: P.enemy, w: 6 });
      }

      K.end(c);
    }
  }
}
