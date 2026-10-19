import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc09 (235.98–267.68s): Diện tích phản xạ hiệu dụng (Radar Cross-Section - RCS):
 * - 235.98–255.62s: Tấm kim loại phẳng vuông góc phản xạ thẳng về radar như gương sáng; nghiêng vài độ là hắt tia lên trời.
 * - 255.86–260.26s: Máy bay tàng hình lớn vát góc trả về ít năng lượng hơn một con chim nhỏ.
 * - 260.26–267.68s: Góc phản xạ (corner reflector) trả về nhiều hơn quả cầu lớn gấp 10 lần.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam: K.Cam = { x: 0, y: 15, z: 1.08 };
    K.begin(c, cam);

    const groundY = 220;
    M.drawSideTerrain(c, -1100, 1100, groundY);

    const rx = -560;
    const txX = rx + 48, txY = groundY - 108;
    const targetX = 340, targetY = -75;
    const beamAng = Math.atan2(targetY - txY, targetX - txX);

    // Chùm sóng tới từ đài radar sang phải (màu amber)
    A.line(c, [[txX, txY], [targetX - 40, targetY]], P.amber, M.lwO(c));
    for (let i = 0; i < 5; i++) {
      const u = (((t - CUE.ch3_rcs_intro) * 0.55 + i / 5) % 1);
      M.drawWaveArc(c, txX, txY, A.lerp(60, 840, u), beamAng, 0.24, P.amber, 0.85, 5);
    }

    let echoStrength = 0.9; // 0..1 mức năng lượng quay về chảo radar

    if (t < CUE.ch3_stealth_bird - 0.2) {
      // ── THÍ NGHIỆM 1 (235.98–255.62s): Tấm kim loại phẳng vuông góc vs nghiêng đi vài độ ──
      const tiltP = A.eio(t, CUE.ch3_plate_tilted - 0.3, CUE.ch3_plate_tilted + 0.8);
      const tiltAngle = A.lerp(0, 0.32, tiltP);
      echoStrength = A.lerp(0.96, 0.06, tiltP);

      // Khi tiltAngle = 0: tia phản xạ (sky) quay ngược thẳng về chảo radar
      // Khi nghiêng (+0.32 rad): mặt phẳng ngửa nhẹ lên trời, hắt toàn bộ chùm tia phản xạ vọt chéo lên bầu trời (-y)!
      const reflAng = Math.PI + beamAng + tiltAngle * 2.2;
      const reflEndX = targetX + Math.cos(reflAng) * 560;
      const reflEndY = targetY + Math.sin(reflAng) * 560;
      A.line(c, [[targetX, targetY], [reflEndX, reflEndY]], P.sky, A.px(c, 6));
      for (let i = 0; i < 4; i++) {
        const u = (((t - CUE.ch3_rcs_intro) * 0.6 + i / 4) % 1);
        M.drawWaveArc(c, targetX, targetY, A.lerp(45, 520, u), reflAng, 0.22, P.sky, 0.9, 5);
      }

      // Chân đế thử nghiệm và tấm kim loại phẳng
      A.line(c, [[targetX, groundY], [targetX, targetY]], P.slate, M.lwO(c));
      M.drawRcsSpecimen(c, targetX, targetY, 'plate', { scale: 1.45, tiltAngle });
    } else if (t < CUE.ch3_corner_sphere - 0.2) {
      // ── THÍ NGHIỆM 2 (255.86–260.26s): Máy bay tàng hình lớn vát cạnh vs Con chim nhỏ ──
      echoStrength = 0.08;

      // Máy bay tàng hình lớn ở trên (y = -135): mặt vát nghiêng hắt toàn bộ tia sóng lên trời!
      const sx = 360, sy = -145;
      A.line(c, [[sx - 55, sy - 8], [sx - 180, sy - 260]], P.sky, A.px(c, 5), [10, 8]);
      M.drawStealthJet(c, sx, sy, 'side', { scale: 1.55 });

      // Con chim nhỏ ở dưới (y = 25): bề mặt cong tròn lại tán xạ một vòng sóng sky quay về radar rõ hơn máy bay tàng hình!
      const bx = 260, by = 25;
      for (let i = 1; i <= 3; i++) {
        const r = 35 + i * 55 + ((t * 70) % 55);
        M.drawWaveArc(c, bx, by, r, Math.PI, 0.48, P.sky, 0.85, 4);
      }
      M.drawRcsSpecimen(c, bx, by, 'bird', { scale: 1.75 });
    } else {
      // ── THÍ NGHIỆM 3 (260.26–267.68s): Góc phản xạ nhỏ (Corner reflector) vs Quả cầu lớn gấp 10 lần ──
      echoStrength = 0.95;

      // Góc phản xạ nhỏ ở trên (y = -145): tia tới đập 2 mặt vuông góc rồi dội thẳng 180 độ về đúng đài radar!
      const cx = 310, cy = -145;
      A.line(c, [[txX, txY], [cx - 10, cy - 28], [cx - 10, cy + 28], [txX, txY + 14]], P.sky, A.px(c, 5.5));
      for (let i = 1; i <= 4; i++) {
        const r = 45 + i * 85 + ((t * 90) % 85);
        M.drawWaveArc(c, cx, cy, r, Math.PI + 0.06, 0.26, P.sky, 0.95, 5.5);
      }
      M.drawRcsSpecimen(c, cx, cy, 'corner', { scale: 1.15 });

      // Quả cầu kim loại khổng lồ ở dưới (y = 45): tia sóng bị tán xạ tứ tung đi mọi hướng, rất ít quay về radar
      const spX = 420, spY = 45;
      for (let a = -2.4; a <= 2.4; a += 0.6) {
        A.line(
          c,
          [
            [spX + Math.cos(a) * 95, spY + Math.sin(a) * 95],
            [spX + Math.cos(a) * 155, spY + Math.sin(a) * 155],
          ],
          P.light,
          M.lwI(c),
          [6, 6]
        );
      }
      M.drawRcsSpecimen(c, spX, spY, 'sphere', { scale: 1.45 });
    }

    // Đài radar bên trái
    M.drawGroundRadar(c, rx, groundY, 'side', { scale: 1.55, dishAngle: beamAng, active: true });

    // Thanh đo cường độ tiếng vọng thu về (Echo Return Meter / RCS Bar) đặt dưới mặt đất
    A.rrect(c, -460, 275, 920, 95, 10, P.paper, P.ink, M.lwO(c));
    A.rrect(c, -420, 304, 840, 36, 18, P.bg2, P.ink, M.lwI(c));
    A.rrect(c, -420, 304, Math.max(36, 840 * echoStrength), 36, 18, P.sky, P.ink, M.lwO(c));

    K.end(c);
  }
}
