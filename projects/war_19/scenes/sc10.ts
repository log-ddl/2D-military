// scenes/sc10.ts — Chương 4, Shot 4.2 (277.40 – 324.60s)
// Góc SIDE Chiến thuật & Cơ chế khí động:
// 1) Đường trượt 3° dân sự vs. C-17 chúc mũi lao dốc như thang máy né tên lửa MANPADS & bắn tường pháo sáng (flares).
// 2) Cận cảnh luồng phụt 4 động cơ thổi thẳng vào cánh tà titan (blown flaps) tạo lực nâng ở tốc độ thấp.
// 3) Đập bánh xuống đường băng, bật spoilers + đảo chiều lực đẩy (reverse thrust) dừng 200 tấn trong < 1 km.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawC17,
  drawB747,
  drawManpadsTeam,
  drawFlareCluster,
  drawExplosion,
  drawGroundSide,
  drawCallout,
  lw,
} from './_assets';

const camApproachWide: K.Cam = { x: 0, y: -235, z: 1.05 };
const camBlownFlapClose: K.Cam = { x: 40, y: -255, z: 2.15 };
const camTouchdownRoll: K.Cam = { x: 165, y: -135, z: 1.42 };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // 3 giai đoạn rõ ràng trong cùng thế giới SIDE đường băng tiền phương:
    // Pha 1 (277.40–303.74s): Toàn cảnh lao dốc né tên lửa & bắn flare
    // Pha 2 (303.74–314.72s): Cận cảnh cánh tà thổi (Blown Flaps)
    // Pha 3 (314.72–324.60s): Chạm đất, bật spoilers & đảo chiều lực đẩy dừng < 1 km
    const inFlapClose = t >= CUE.ch4_blown_flaps && t < CUE.ch4_smash_runway;
    const inTouchdown = t >= CUE.ch4_smash_runway;

    let cam = inFlapClose ? camBlownFlapClose : inTouchdown ? camTouchdownRoll : camApproachWide;
    cam = K.withShake(cam, t, [
      [CUE.ch4_missile_spoof, 14, 0.45],
      [CUE.ch4_smash_runway + 0.3, 18, 0.55],
    ]);

    A.clear(c, P.bg);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    drawGroundSide(c, cam, 'dirt', 0);

    // ── PHA 1 (277.40 – 303.74s): Đường trượt 3° vs. C-17 lao dốc đứng né MANPADS & bắn Flares ──
    if (!inFlapClose && !inTouchdown) {
      // Vòm nguy hiểm của tên lửa phòng không vác vai (MANPADS threat dome) bên trái đường băng
      const manpadsAlpha = A.sm(t, CUE.ch4_steep_elevator, CUE.ch4_manpads_reach);
      A.withA(c, manpadsAlpha * 0.22, () => {
        c.beginPath();
        c.arc(-340, 0, 520, -Math.PI, 0, false);
        c.closePath();
        A.fs(c, P.enemyLight, P.enemy, inW);
      });
      A.withA(c, manpadsAlpha, () => {
        drawManpadsTeam(c, -340, 0, {
          scale: 1.35,
          aimAngle: -0.95,
          fired: t >= CUE.ch4_manpads_fire,
        });
      });

      // Đường trượt thoải 3° của máy bay thương mại (hiện ngay từ đầu cảnh 277.40s)
      const civSlopeAlpha = 1 - A.sm(t, 297.0, 298.0);
      A.withA(c, civSlopeAlpha, () => {
        A.line(c, [[-820, -240], [320, 0]], P.slate, lw(c, 4), [14, 8]);
        const civP = A.ph(t, CUE.ch4_aero_violence, 292.0);
        const cx = A.lerp(-640, -90, civP);
        const cy = A.lerp(-202, -86, civP);
        drawB747(c, cx, cy, { view: 'side', scale: 0.48, alpha: 0.78 });
      });

      // Đường lao dốc đứng như thang máy (steep elevator drop) của C-17 từ đỉnh trời xuống đầu đường băng
      const dropEnter = A.sm(t, CUE.ch4_steep_elevator - 0.2, CUE.ch4_steep_elevator + 0.5);
      A.withA(c, dropEnter, () => {
        A.line(c, [[-195, -520], [185, -18]], P.amber, lw(c, 4.5), [12, 8]);
        const dropP = A.eio(t, CUE.ch4_steep_elevator, 303.6);
        const c17X = A.lerp(-185, 85, dropP);
        const c17Y = A.lerp(-475, -125, dropP);

        c.save();
        c.translate(c17X, c17Y);
        c.rotate(0.36); // Chúc mũi dốc đứng xuống đường băng!
        drawC17(c, 0, 0, {
          view: 'side',
          scale: 0.68,
          flapAngle: 0.75,
          jetBlast: 0.85,
        });
        c.restore();

        // Chùm pháo sáng mồi bẫy (walls of decoy flares) bắn ra từ bụng C-17 lúc 299.10s và 300.30s
        drawFlareCluster(c, c17X - 45, c17Y - 25, A.ph(t, CUE.ch4_flare_burst1, CUE.ch4_flare_burst1 + 2.8));
        drawFlareCluster(c, c17X - 25, c17Y - 18, A.ph(t, CUE.ch4_flare_burst2, CUE.ch4_flare_burst2 + 2.8));

        // Quả tên lửa tầm nhiệt MANPADS bắn lên lúc 296.20s, bị hút lệch vào chùm pháo sáng và nổ lúc 301.80s
        const misP = A.ph(t, CUE.ch4_manpads_fire, CUE.ch4_missile_spoof);
        if (misP > 0 && misP < 1) {
          const targetX = c17X - 95, targetY = c17Y + 55; // vị trí chùm flare
          const mx = A.lerp(-340, targetX, misP);
          const my = A.lerp(-38, targetY, A.eo(misP, 0, 1));
          A.line(c, [[-340, -38], [mx, my]], P.enemy, lw(c, 3.5), [8, 5]);
          A.circle(c, mx, my, 8, P.amber, P.enemy, inW);
        }
        drawExplosion(
          c,
          c17X - 95,
          c17Y + 55,
          A.ph(t, CUE.ch4_missile_spoof, CUE.ch4_missile_spoof + 1.1),
          64
        );
      });
    }

    // ── PHA 2 (303.74 – 314.72s): Cận cảnh Cơ chế Cánh tà thổi Titan (Blown Titanium Flaps) ──
    if (inFlapClose) {
      const flap = A.eio(t, CUE.ch4_blown_flaps, CUE.ch4_blown_flaps + 1.8);
      // Vẽ C-17 đang bay chậm ở y = -110 để camera zoom sát vào cụm động cơ + cánh tà titan
      drawC17(c, 65, -110, {
        view: 'side',
        scale: 1.05,
        flapAngle: flap,
        hiFlaps: 1,
        jetBlast: 1,
      });

      // Các đường dòng khí & véc-tơ lực nâng bổ trợ quanh cánh tà titan
      const liftP = A.sm(t, CUE.ch4_blown_flaps + 1.2, CUE.ch4_blown_flaps + 2.4);
      A.withA(c, liftP, () => {
        for (const lx of [-45, -15, 15]) {
          A.line(c, [[lx, -225], [lx, -325]], P.sky, lw(c, 5.5));
          A.poly(c, [[lx, -338], [lx - 10, -318], [lx + 10, -318]], P.sky, P.ink, inW);
        }
      });
    }

    // ── PHA 3 (314.72 – 324.60s): Đập bánh xuống đường băng, Spoilers + Đảo chiều lực đẩy dừng < 1 km ──
    if (inTouchdown) {
      // Vạch mốc < 1 KM trên đường băng
      A.line(c, [[485, -45], [485, 25]], P.enemy, outW);
      A.rrect(c, 465, -55, 40, 14, 3, P.enemy, P.ink, inW);

      const rollP = A.eo(t, CUE.ch4_smash_runway, 323.5);
      const c17X = A.lerp(-220, 145, rollP);
      const comp = A.bump(t, CUE.ch4_smash_runway + 0.1, 0.9);
      const spoil = A.sm(t, CUE.ch4_spoilers_rev - 0.2, CUE.ch4_spoilers_rev + 0.5);
      const rev = A.sm(t, CUE.ch4_spoilers_rev + 0.2, CUE.ch4_spoilers_rev + 0.9);

      drawC17(c, c17X, 0, {
        view: 'side',
        scale: 0.92,
        gearComp: comp,
        flapAngle: 0.65,
        spoilers: spoil,
        reverseThrust: rev,
        jetBlast: 1,
      });

      // Mũi tên lực hãm ngược chiều chuyển động
      A.withA(c, rev, () => {
        A.line(c, [[c17X + 365, -95], [c17X + 255, -95]], P.amber, lw(c, 6));
        A.poly(c, [[c17X + 240, -95], [c17X + 262, -107], [c17X + 262, -83]], P.amber, P.ink, inW);
      });
    }

    K.end(c);

    // Callout tối thiểu: 3° (281.7–287.2s) và 200T / <1 KM (321.5–324.5s)
    const c3deg = A.win(t, CUE.ch4_three_deg + 0.3, 287.2, 0.3, 0.3);
    drawCallout(c, cam, -380, -148, 0, -55, '3° SLOPE', c3deg, P.slate);

    const c200t = A.win(t, CUE.ch4_stop_200t - 0.2, 324.5, 0.3, 0.25);
    drawCallout(c, cam, 485, -55, 0, -52, '200T · <1 KM', c200t, P.amber);
  }
}
