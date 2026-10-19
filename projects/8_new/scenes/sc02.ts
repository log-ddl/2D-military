import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import { P, LINE } from './shared/palette';
import { drawTank, drawSoldierTop, drawArmorCutaway, drawEngine, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc02 (28.98–50.68s): Nghịch lý chiếc xe mạnh nhất bị tiêu diệt bởi thứ nhỏ hơn & Tam giác 3 đỉnh + Thể tích thứ 4.
 * - 28.98–41.06s: Góc nhìn từ trên xuống (top): Xe tăng di chuyển uy lực trên đường, nhưng một lính cầm súng chống tăng nhỏ bé ẩn ở bìa rừng bắn cháy xe lúc 35.48s.
 * - 41.06–50.68s: Chuyển sang Sơ đồ Tam giác đánh đổi (Firepower - Armor - Mobility) bao quanh chiếc xe tăng mặt cắt ở tâm (yếu tố thứ 4). Khi một đỉnh vươn ra thì hai đỉnh kia bị kéo tụt lại.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.ch1_triangle) {
      // Phần 1 (28.98–41.40s): Góc nhìn từ trên xuống (top-down tactical)
      const hitT = CUE.ch1_smaller_hit;
      const moveP = A.sm(t, 28.98, hitT);
      const tx = A.lerp(-320, 40, moveP);
      const shotP = A.ph(t, hitT - 0.55, hitT);
      const hitAge = Math.max(0, t - hitT);

      const camBase: K.Cam = {
        x: A.lerp(-100, 60, A.sm(t, 28.98, 41.0)),
        y: -20,
        z: A.lerp(1.12, 1.0, A.sm(t, 33.0, 40.5)),
      };
      const cam = K.withShake(camBase, t, [[hitT, 20, 0.6]]);

      K.begin(c, cam);
      drawStageBg(c, 'top-map');

      // Cụm rừng nhỏ bên dưới phải nơi người lính đối phương ẩn nấp
      for (const [fx, fy, fr] of [
        [340, 290, 56],
        [410, 310, 48],
        [285, 325, 42],
      ] as const) {
        A.circle(c, fx, fy, fr, P.oliveLight, P.ink, A.px(c, LINE.inner));
      }

      // Chiếc xe tăng chủ lực đi trên đường
      drawTank(c, {
        x: tx,
        y: 0,
        s: 1.85,
        view: 'top',
        turretYaw: A.lerp(0.15, -0.25, A.sm(t, 30.0, 35.0)),
      });

      // Người lính nhỏ bé cầm ống phóng RPG ở [335, 275] (nhỏ hơn xe tăng gấp nhiều lần)
      const soldierReveal = A.sm(t, 33.5, 34.8);
      A.withA(c, Math.max(0.35, soldierReveal), () => {
        drawSoldierTop(c, 335, 275, 1.35, -1.95, 'foe', 'rpg');
        // Vòng tròn khoanh đỏ làm rõ sự chênh lệch kích thước giữa người lính nhỏ và cỗ xe tăng lớn
        if (soldierReveal > 0.1) {
          A.circle(c, 335, 275, 52, null, P.enemy, A.px(c, 4));
        }
      });

      // Quả đạn chống tăng bay từ người lính nhỏ trúng sườn xe tăng
      if (shotP > 0 && shotP <= 1) {
        FX.straightShot(c, [320, 240], [tx + 10, 55], shotP, {
          color: P.enemy,
          w: 7,
          trail: 0.4,
        });
      }

      if (hitAge > 0) {
        FX.explosion(c, tx + 10, 45, 145, A.clamp01(hitAge / 0.75));
        FX.smoke(c, tx + 10, 35, hitAge, 1.45, 7);
        FX.fire(c, tx + 10, 45, hitAge, 1.25);
      }

      K.end(c);
    } else {
      // Phần 2 (41.40–50.68s): Sơ đồ Tam giác đánh đổi (The Iron Triangle + 4th factor at center)
      const cam: K.Cam = { x: 0, y: 0, z: 1.05 };
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 420 });

      const triP = A.sm(t, CUE.ch1_triangle, CUE.ch1_triangle + 1.8);
      const fourthP = A.sm(t, 45.2, 46.6);
      const tradePhase = Math.max(0, t - CUE.ch1_take_from_others);

      // Khi "Each of the three can be improved only by taking from the others" (47.2–50.68s):
      // Cho 3 đỉnh co giãn đối nghịch nhau (tổng luôn cố định)
      const wFire = tradePhase > 0 ? 1 + 0.28 * Math.sin(tradePhase * 2.6) : 1;
      const wArmor = tradePhase > 0 ? 1 + 0.28 * Math.sin(tradePhase * 2.6 + 2.09) : 1;
      const wMob = tradePhase > 0 ? 1 + 0.28 * Math.sin(tradePhase * 2.6 + 4.18) : 1;

      const topPt: A.Pt = [0, -295 * wFire];
      const leftPt: A.Pt = [-390 * wArmor, 210 * wArmor];
      const rightPt: A.Pt = [390 * wMob, 210 * wMob];

      // Cạnh tam giác nối 3 đỉnh
      A.withA(c, triP, () => {
        A.poly(c, [topPt, rightPt, leftPt], 'rgba(232, 239, 244, 0.55)', P.ink, A.px(c, 5));
        // Đường nối từ tâm tới 3 đỉnh như dây kéo căng
        A.line(c, [[0, 10], topPt], P.ink2, A.px(c, 3), [12, 10]);
        A.line(c, [[0, 10], leftPt], P.ink2, A.px(c, 3), [12, 10]);
        A.line(c, [[0, 10], rightPt], P.ink2, A.px(c, 3), [12, 10]);

        // Đỉnh 1 (Trên): HỎA LỰC — Biểu tượng cụm nòng pháo + đạn thanh xuyên
        c.save();
        c.translate(topPt[0], topPt[1]);
        c.scale(0.85 + 0.2 * wFire, 0.85 + 0.2 * wFire);
        A.circle(c, 0, 0, 86, P.paper, wFire > 1.08 ? P.amber : P.ink, A.px(c, 4.5));
        A.rrect(c, -62, -10, 110, 20, 4, P.dark, P.ink, A.px(c, 3));
        A.rrect(c, -12, -16, 32, 32, 4, P.oliveLight, P.ink, A.px(c, 3));
        A.poly(c, [[48, -8], [76, 0], [48, 8]], P.amber, P.ink, A.px(c, 2.5));
        c.restore();

        // Đỉnh 2 (Trái dưới): GIÁP BẢO VỆ — Mặt cắt tấm giáp phức hợp
        c.save();
        c.translate(leftPt[0], leftPt[1]);
        c.scale(0.85 + 0.2 * wArmor, 0.85 + 0.2 * wArmor);
        A.circle(c, 0, 0, 86, P.paper, wArmor > 1.08 ? P.amber : P.ink, A.px(c, 4.5));
        drawArmorCutaway(c, 0, 0, 0.34, { mode: 'composite' });
        c.restore();

        // Đỉnh 3 (Phải dưới): CƠ ĐỘNG — Động cơ & bánh xích
        c.save();
        c.translate(rightPt[0], rightPt[1]);
        c.scale(0.85 + 0.2 * wMob, 0.85 + 0.2 * wMob);
        A.circle(c, 0, 0, 86, P.paper, wMob > 1.08 ? P.amber : P.ink, A.px(c, 4.5));
        drawEngine(c, 0, 0, 0.44, 'turbine', t * 2);
        c.restore();
      });

      // Tâm tam giác (Yếu tố thứ 4 xuất hiện lúc 45.2s): Chiếc hộp thép mặt cắt chứa kíp lái & đạn pháo
      const centerScale = 1.05 + fourthP * 0.22;
      if (fourthP > 0.01) {
        A.rrect(
          c,
          -245 * centerScale,
          -95 * centerScale,
          490 * centerScale,
          175 * centerScale,
          16,
          'rgba(245, 158, 11, 0.16)',
          P.amber,
          A.px(c, 4.5)
        );
      }
      drawTank(c, {
        x: 0,
        y: 65,
        s: 0.92 * centerScale,
        dir: 1,
        view: 'cutaway',
        ammoLayout: 'bustle',
        highlightPart: fourthP > 0.2 ? 'crew' : 'none',
        ammoGlow: fourthP * 0.6,
      });

      K.end(c);
    }
  }
}
