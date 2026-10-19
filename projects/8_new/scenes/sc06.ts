import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawShapedCharge, drawArmorCutaway, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc06 (143.68–171.82s): Mối đe dọa thứ hai — Đạn nổ lõm (Shaped Charge) & Giáp phản ứng nổ (ERA - Explosive Reactive Armor).
 * - 143.68–158.40s: Đầu đạn tên lửa/RPG bay vào chậm -> mở mặt cắt (cutaway) lộ khối thuốc nổ vàng cam và phễu kim loại rỗng hình nón (hollow cone) -> kích nổ lúc 154.8s tạo luồng kim loại mảnh siêu tốc xuyên thủng tấm thép dày.
 * - 158.40–171.82s: Gắn các hộp gạch Giáp phản ứng nổ (ERA) ra mặt ngoài tấm giáp -> lúc 164.2s đạn nổ lõm chạm gạch ERA -> viên gạch phát nổ bung tấm thép ra ngoài cắt đứt và làm lệch luồng xuyên kim loại. Cuối cảnh (167.6–171.82s), vị trí viên gạch vừa nổ trống rỗng ("only works once for each block").
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < CUE.ch2_reactive_armor) {
      // Pha 1 (143.68–158.40s): Cơ chế Đạn nổ lõm (Shaped Charge) tạo luồng kim loại xuyên qua tấm thép dày
      const detT = CUE.ch2_metal_jet;
      const moveP = A.sm(t, 143.68, 151.6);
      const cutOpen = A.sm(t, 150.2, 152.0);
      const jetP = A.sm(t, detT, detT + 1.6);

      const camBase: K.Cam = K.track(
        t,
        [
          [143.68, { x: -80, y: 0, z: 1.52 }],
          [151.6, { x: 20, y: 0, z: 1.72 }],
          [158.4, { x: 55, y: 0, z: 1.58 }],
        ],
        A.eio
      );
      const cam = K.withShake(camBase, t, [[detT, 20, 0.55]]);

      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 290 });

      // Tấm giáp thép dày đơn thuần bên phải (x = 140..255): bị luồng kim loại đục xuyên ngọt xớt
      A.rrect(c, 140, -210, 125, 460, 6, P.slate, P.ink, lwO);
      if (jetP > 0.1) {
        // Rãnh xuyên hẹp nung đỏ đi xuyên qua cả tấm thép dày
        const penW = A.clamp01(jetP * 1.25) * 125;
        A.rrect(c, 140, -10, penW, 20, 2, P.amber, P.enemy, lwI);
      }

      // Đầu đạn nổ lõm tiến từ trái tới sát mặt giáp ở x = -15
      const wx = A.lerp(-340, -15, moveP);
      drawShapedCharge(c, wx, 0, 1.55, 0, cutOpen > 0.3, jetP);

      // Trước khi cắt mở vỏ hoàn toàn, vẽ lớp vỏ ngoài mờ dần
      if (cutOpen > 0 && cutOpen < 1) {
        A.withA(c, 1 - cutOpen, () => {
          drawShapedCharge(c, wx, 0, 1.55, 0, false, 0);
        });
      }

      // Khi kích nổ tạo luồng kim loại (155.2s): vẽ mũi tên ép hội tụ vào tâm phễu đồng + chớp nổ
      if (t >= 152.0 && t < detT + 0.5) {
        const sqP = A.sm(t, 152.2, 154.5);
        UI.arrow(c, [wx + 15, -75], [wx + 25, -22], { p: sqP, color: P.enemy, w: 5 });
        UI.arrow(c, [wx + 15, 75], [wx + 25, 22], { p: sqP, color: P.enemy, w: 5 });
      }
      if (t >= detT) {
        FX.explosion(c, wx + 25, 0, 95, A.clamp01((t - detT) / 0.55));
        if (jetP > 0.7) {
          FX.sparks(c, 265, 0, ((t - detT) * 2.5) % 1, 1.2, 0, 1.1, 9);
        }
      }

      K.end(c);
    } else {
      // Pha 2 (158.40–171.82s): Giáp phản ứng nổ (ERA) gắn ngoài mặt giáp phát nổ hướng ra ngoài cắt đứt luồng kim loại
      const eraTrigT = CUE.ch2_era_detonate;
      const mountP = A.sm(t, CUE.ch2_reactive_armor, CUE.ch2_reactive_armor + 1.8);
      const trigAge = Math.max(0, t - eraTrigT);

      const camBase: K.Cam = {
        x: 45,
        y: 5,
        z: A.lerp(1.52, 1.65, A.sm(t, 158.4, 168.0)),
      };
      const cam = K.withShake(camBase, t, [[eraTrigT, 22, 0.6]]);

      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 310 });

      // Vẽ cụm giáp chính + 3 hộp gạch ERA gắn bên ngoài
      // Trong 1.8s đầu (158.4–160.2s), các hộp gạch ERA lắp trượt từ trái vào gắn lên mặt giáp
      if (mountP < 0.99) {
        drawArmorCutaway(c, 150, 10, 1.35, { mode: 'composite', impactP: 0 });
        const slideX = (1 - mountP) * -140;
        c.save();
        c.translate(150 + slideX, 10);
        c.scale(1.35, 1.35);
        c.rotate(0.42);
        for (let i = -1; i <= 1; i++) {
          const ey = i * 95;
          A.rrect(c, -132, ey - 38, 36, 76, 4, P.oliveDark, P.ink, lwO);
          A.rrect(c, -122, ey - 32, 16, 64, 2, P.amber, P.ink2, lwI);
        }
        c.restore();
      } else {
        drawArmorCutaway(c, 150, 10, 1.35, {
          mode: 'era',
          impactP: trigAge > 0 ? 0.26 + A.clamp01(trigAge / 1.4) * 0.74 : 0,
        });
      }

      // Đầu đạn nổ lõm bay từ trái tới chạm hộp gạch ERA giữa lúc 164.2s
      if (t >= 161.5 && t < 167.8) {
        const inP = A.sm(t, 161.5, eraTrigT);
        const rx = A.lerp(-440, -145, inP);
        const ry = A.lerp(-90, -15, inP);
        const jet = trigAge > 0 ? A.clamp01(trigAge * 2.5) * 0.45 : 0;
        drawShapedCharge(c, rx, ry, 1.35, 0.22, true, jet);

        // Khi hộp ERA nổ bung tấm thép ra ngoài (trigAge > 0), luồng kim loại bị tấm thép bay chéo cắt đứt thành các đoạn vụn bay lệch hướng!
        if (trigAge > 0.05) {
          FX.explosion(c, -35, -5, 130, A.clamp01(trigAge / 0.65));
          for (let k = 0; k < 5; k++) {
            const fragX = -20 + k * 24 + trigAge * (40 + k * 20);
            const fragY = -10 + (k - 2) * 28 * A.clamp01(trigAge * 1.5);
            A.rrect(c, fragX, fragY, 18, 6, 2, P.amber, P.enemy, lwI);
          }
        }
      }

      // Khi nói "the trade is that it only works once for each block" (167.58–171.48s):
      // Khoanh đỏ vị trí viên gạch ERA ở giữa đã nổ mất, lộ khoảng giáp trống không còn ERA bảo vệ nếu bị bắn lần thứ hai
      if (t >= CUE.ch2_works_once) {
        const onceP = A.sm(t, CUE.ch2_works_once, CUE.ch2_works_once + 1.0);
        UI.circleMark(c, -22, 10, 68, onceP, P.enemy, lwO * 1.3);
        UI.xMark(c, -22, 10, 32, onceP, P.enemy, lwO * 1.4);
      }

      K.end(c);
    }
  }
}
