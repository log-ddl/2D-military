import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc10 (267.68–291.90s): Nhiễu địa vật (Clutter) là kẻ thù thực sự của radar:
 * - 267.68–278.90s: Mặt đất, mặt biển, mưa và đàn chim đều dội tiếng vọng về làm ngập lấp mục tiêu.
 * - 278.90–291.90s: Radar trên không nhìn chúc xuống máy bay bay thấp đang nhìn vào mảng mặt đất sáng hơn rất nhiều;
 *   kỹ thuật radar là quyết định cái gì KHÔNG nhìn (lọc bỏ nhiễu nền).
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const lookDownP = A.eio(t, CUE.ch4_looking_down - 0.3, CUE.ch4_looking_down + 0.8);
    const cam: K.Cam = { x: 0, y: 15, z: 1.06 };
    K.begin(c, cam);

    const groundY = 175;
    M.drawSideTerrain(c, -1100, 1100, groundY, {
      hillAt: -40,
      hillH: 135,
      rainX: [90, 290],
      seaFrom: 340,
    });

    const rx = -580;
    const jx = A.lerp(420, 195, A.ph(t, CUE.ch4_start, CUE.ch4_cannot_see_world));
    const jy = A.lerp(-140, 65, lookDownP); // Khi sang phần 2, máy bay hạ thấp bay sát mặt đất (low-flying)

    if (lookDownP < 0.99) {
      A.withA(c, 1 - lookDownP, () => {
        const txX = rx + 48, txY = groundY - 108;

        // 4 nguồn nhiễu (Clutter): Đồi đất (-40, 80), Mưa (190, -80), Đàn chim (330, -190), Mặt biển (560, 175)
        const clutterSources: A.Pt[] = [
          [-40, 85],
          [190, -75],
          [330, -185],
          [540, 165],
        ];

        // Đàn chim vỗ cánh trên trời
        for (const [bx, by] of [
          [300, -195],
          [335, -175],
          [365, -205],
          [320, -150],
          [360, -160],
        ] as const) {
          M.drawRcsSpecimen(c, bx, by, 'bird', { scale: 1.25 });
        }

        // Mọi nguồn nhiễu đồng loạt dội các vòm sóng xám (slate) hỗn loạn về phía đài radar
        for (let sIdx = 0; sIdx < clutterSources.length; sIdx++) {
          const [cx, cy] = clutterSources[sIdx]!;
          const ang = Math.atan2(txY - cy, txX - cx);
          for (let i = 0; i < 3; i++) {
            const u = (((t - CUE.ch4_start) * 0.55 + i / 3 + sIdx * 0.17) % 1);
            M.drawWaveArc(c, cx, cy, A.lerp(35, 520, u), ang, 0.42, P.slate, 0.8, 4.5, true);
          }
        }

        // Tiếng vọng thật của máy bay (màu sky) bị lọt thỏm giữa rừng sóng nhiễu
        M.drawWaveArc(c, jx - 90, jy, 180 + (((t - CUE.ch4_start) * 180) % 280), Math.PI, 0.28, P.sky, 0.9, 4);

        M.drawGroundRadar(c, rx, groundY, 'side', { scale: 1.55, dishAngle: -0.26, active: true });
      });
    }

    if (lookDownP > 0.01) {
      A.withA(c, lookDownP, () => {
        // Giai đoạn 2 (278.90–291.90s): Radar trên cao nhìn chúc xuống máy bay bay thấp (Look-down clutter)
        const awX = -260, awY = -235;
        const patchX0 = 35, patchX1 = 365;
        const filterOutP = A.eio(t, CUE.ch4_deciding_not_to_see - 0.2, CUE.ch4_deciding_not_to_see + 1.2);

        // Chùm tia từ radar trên không chiếu chúc xuống bao trùm cả chiếc máy bay bay thấp lẫn mảng đất rộng bên dưới
        A.withA(c, 0.22, () => {
          A.poly(
            c,
            [
              [awX, awY + 15],
              [patchX0, groundY],
              [patchX1, groundY],
            ],
            P.amber,
            null,
            0
          );
        });

        // Mảng mặt đất dưới bụng máy bay sáng rực lên ("a patch of ground that is much brighter")
        const groundGlow = A.lerp(1, 0.12, filterOutP);
        A.withA(c, groundGlow, () => {
          A.rrect(c, patchX0, groundY - 12, patchX1 - patchX0, 28, 6, P.amber, P.ink, M.lwO(c));
          // Các vòm sóng dội ngược cực mạnh từ mảng mặt đất lên radar trên không
          for (let i = 0; i < 5; i++) {
            const u = (((t - CUE.ch4_looking_down) * 0.65 + i / 5) % 1);
            M.drawWaveArc(
              c,
              (patchX0 + patchX1) / 2,
              groundY,
              A.lerp(45, 460, u),
              -2.18,
              0.52,
              P.amber,
              0.9,
              6.5
            );
          }
        });

        // Khi "deciding what not to see" (288.80s): Gạch bỏ chùm nhiễu mặt đất, làm nổi bật duy nhất vệt sóng sky của máy bay!
        const targetHighlight = A.lerp(0.45, 1.0, filterOutP);
        for (let i = 0; i < 4; i++) {
          const u = (((t - CUE.ch4_looking_down) * 0.65 + i / 4) % 1);
          M.drawWaveArc(c, jx - 40, jy, A.lerp(35, 380, u), -2.22, 0.24, P.sky, targetHighlight, 5);
        }
        if (filterOutP > 0.1) {
          A.withA(c, filterOutP, () => {
            A.rrect(c, jx - 140, jy - 50, 280, 100, 10, null, P.sky, M.lwO(c));
          });
        }

        M.drawAwacsPlane(c, awX, awY, 'side', { scale: 1.35 });
      });
    }

    // Mục tiêu máy bay đối phương và bộ hiển thị tỷ lệ Nhiễu vs Tín hiệu bên dưới
    M.drawIntruderJet(c, jx, jy, 'side', { scale: 1.38 });

    const clutterLevel = t >= CUE.ch4_deciding_not_to_see
      ? A.lerp(0.88, 0.08, A.eio(t, CUE.ch4_deciding_not_to_see, CUE.ch4_cannot_see_world - 0.3))
      : 0.88;
    M.drawTimingScope(c, 0, 325, 1120, 185, {
      txPos: 0.12,
      rxPos: 0.62,
      rxHeight: 0.72,
      noiseFloor: clutterLevel,
    });

    K.end(c);
  }
}
