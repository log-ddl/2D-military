import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawSupportTruck, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc09 (226.42–252.94s): Giới hạn trọng lượng xa chiến trường — Sập cầu nhẹ, Xe kéo/Xe bắc cầu & Đánh đổi Nhẹ vs Nặng.
 * - 226.42–238.98s: Chiếc xe tăng 60 tấn tiến lên cây cầu nhẹ qua sông -> nhịp cầu gãy sập lúc 230.2s -> từ 233.8s Xe bắc cầu (bridgelayer) bắc dầm cầu thép qua sông và Xe kéo hạng nặng (transporter) chở xe tăng.
 * - 238.98–252.94s: Đối chiếu trực tiếp hai triết lý:
 *   + Trên: Xe tăng hạng nhẹ (lighter tank) cơ động nhanh hơn nhưng khi đến chiến trường bị bắn trúng là nổ tung ("arrives and is destroyed").
 *   + Dưới: Xe tăng hạng nặng 60 tấn (heavier tank) đi chậm hơn nhưng khi trúng đạn vào giáp trước (248.5s) vẫn sống sót và tiếp tục chiến đấu ("arrives and endures").
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);

    if (t < CUE.ch3_light_vs_heavy) {
      // Pha 1 (226.42–238.98s): Cầu nhẹ gãy dưới sức nặng 60 tấn -> Xe bắc cầu & Xe kéo hạng nặng giải cứu chuỗi hậu cần
      const breakT = CUE.ch3_bridge_break;
      const colP = A.eo(t, breakT, breakT + 1.1);
      const supportP = A.sm(t, CUE.ch3_transporters - 0.5, CUE.ch3_transporters + 1.0);

      const camBase: K.Cam = {
        x: A.lerp(-80, 40, A.sm(t, 226.42, 238.5)),
        y: 45,
        z: 1.05,
      };
      const cam = K.withShake(camBase, t, [[breakT, 18, 0.55]]);

      K.begin(c, cam);
      drawStageBg(c, 'bridge', { groundY: 185, bridgeCollapse: supportP > 0.5 ? 0 : colP });

      if (supportP < 0.5) {
        // Xe tăng 60 tấn đi ra giữa cầu làm nhịp cầu gãy sập
        const tx = A.lerp(-420, -110, A.sm(t, 226.42, breakT));
        const ty = 185 + colP * 58;
        const rot = colP * 0.24;
        drawTank(c, {
          x: tx,
          y: ty,
          s: 1.55,
          dir: 1,
          view: 'side',
          hasERA: true,
          hullRot: rot,
          wheelPhase: t * 5,
        });
        if (colP > 0.05 && colP < 0.95) {
          FX.debris(c, 0, 195, (t - breakT) * 1.2, 1.3, 14, 5, 380, P.sand);
        }
      } else {
        // Từ 234.5s: Nhịp cầu thép quân sự của Xe bắc cầu (bridgelayer) đặt qua lòng sông + Xe kéo hạng nặng (transporter) chở xe tăng ở bờ trái
        // Dầm cầu thép chịu lực chữ A bắc ngang lòng sông (-360..360)
        A.poly(
          c,
          [
            [-375, 185],
            [-335, 152],
            [335, 152],
            [375, 185],
          ],
          P.sand,
          P.ink,
          lwO
        );
        for (let bx = -310; bx <= 260; bx += 70) {
          A.line(c, [[bx, 185], [bx + 35, 152], [bx + 70, 185]], P.ink, lwO * 0.8);
        }
        // Xe bắc cầu đứng ở bờ phải
        drawSupportTruck(c, 560, 185, 1.15, 'side', 'bridgelayer', 1, 0);
        // Xe kéo hạng nặng (HET transporter) chở chiếc xe tăng 60 tấn ở bờ trái tiến qua cầu
        const hetX = A.lerp(-560, -180, A.sm(t, 234.5, 238.8));
        drawSupportTruck(c, hetX, 185, 1.35, 'side', 'transporter', 1, 0);
        drawTank(c, {
          x: hetX - 115,
          y: 147,
          s: 1.15,
          dir: 1,
          view: 'side',
          hasERA: true,
        });
      }

      K.end(c);

      const p60 = A.win(t, 229.1, 233.5, 0.25, 0.25);
      if (p60 > 0.01) {
        const pt = K.toScreen(cam, -110, 40);
        UI.callout(c, '60 tons', pt[0], pt[1] - 40, {
          to: [pt[0], pt[1] + 20],
          p: p60,
          color: P.enemy,
        });
      }
    } else {
      // Pha 2 (238.98–252.94s): Đối chiếu Xe tăng hạng nhẹ (đến nhanh nhưng bị bắn cháy) vs Xe tăng hạng nặng 60 tấn (đến chậm hơn nhưng sống sót qua đòn bắn)
      const lightHitT = 246.8;
      const heavyHitT = 248.6;
      const camBase: K.Cam = { x: 0, y: 0, z: 1.06 };
      const cam = K.withShake(camBase, t, [
        [lightHitT, 16, 0.5],
        [heavyHitT, 18, 0.5],
      ]);

      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 420 });

      // Khung trên: XE TĂNG HẠNG NHẸ (Lighter tank) — Chạy nhanh tới đích sớm, nhưng trúng đạn lúc 246.8s là nổ tung và gạch chéo X
      A.rrect(c, -760, -370, 1520, 315, 16, P.paper, P.ink, lwO);
      A.line(c, [[-680, -125], [680, -125]], P.slate, lwO);
      const lMove = A.sm(t, 239.2, 245.5);
      const lx = A.lerp(-520, 180, lMove);
      const lHitAge = Math.max(0, t - lightHitT);
      drawTank(c, {
        x: lx,
        y: -125,
        s: 1.08,
        dir: 1,
        view: 'side',
        ammoLayout: 'carousel',
        turretToss: A.clamp01(lHitAge * 1.4),
        burntInside: lHitAge > 0.1 ? 1 : 0,
        wheelPhase: lHitAge > 0 ? 0 : t * 10,
      });

      const lShotP = A.ph(t, lightHitT - 0.45, lightHitT);
      if (lShotP > 0 && lShotP <= 1) {
        FX.straightShot(c, [680, -195], [lx + 60, -195], lShotP, { color: P.enemy, w: 7 });
      }
      if (lHitAge > 0) {
        FX.explosion(c, lx + 30, -195, 140, A.clamp01(lHitAge / 0.75));
        FX.fire(c, lx + 20, -180, lHitAge, 1.35);
        FX.smoke(c, lx + 20, -195, lHitAge, 1.3, 6);
        UI.xMark(c, -560, -215, 52, A.sm(t, lightHitT + 0.4, lightHitT + 1.0), P.enemy, lwO * 1.8);
      }

      // Khung dưới: XE TĂNG HẠNG NẶNG 60 TẤN (Heavier tank) — Chạy điềm tĩnh hơn, trúng đạn vào giáp trước lúc 248.6s nhưng làm chệch đạn và tiếp tục tiến về phía trước!
      const showHeavy = A.sm(t, 242.8, 243.8);
      A.withA(c, Math.max(0.25, showHeavy), () => {
        A.rrect(c, -760, 25, 1520, 315, 16, P.paper, P.ink, lwO);
        A.line(c, [[-680, 270], [680, 270]], P.slate, lwO);
        const hMove = A.sm(t, 243.0, 252.2);
        const hx = A.lerp(-360, 240, hMove);
        const hHitAge = Math.max(0, t - heavyHitT);

        drawTank(c, {
          x: hx,
          y: 270,
          s: 1.32,
          dir: 1,
          view: 'side',
          hasERA: true,
          highlightPart: hHitAge > 0 && hHitAge < 1.5 ? 'armor' : 'none',
          wheelPhase: t * 6.5,
        });

        const hShotP = A.ph(t, heavyHitT - 0.45, heavyHitT);
        if (hShotP > 0 && hShotP <= 1) {
          FX.straightShot(c, [680, 175], [hx + 160, 175], hShotP, { color: P.enemy, w: 7 });
        }
        if (hHitAge > 0 && hHitAge < 1.2) {
          // Đạn bị giáp trước + ERA đánh bật văng lên trời, xe tăng vẫn nguyên vẹn tiến tiếp!
          FX.explosion(c, hx + 165, 175, 95, A.clamp01(hHitAge / 0.55));
          FX.sparks(c, hx + 165, 175, A.clamp01(hHitAge / 0.7), 1.4, -0.9, 1.2, 8);
        }
        if (hHitAge > 0.4) {
          // Vòng tròn xanh/vàng xác nhận xe sống sót ("arrives and endures")
          UI.circleMark(c, -560, 180, 56, A.sm(t, heavyHitT + 0.4, heavyHitT + 1.1), P.olive, lwO * 1.8);
        }
      });

      K.end(c);
    }
  }
}
