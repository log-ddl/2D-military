// scenes/sc14.ts — Chương 5, Cảnh 14 (369.18 - 397.08s): Tử huyệt Bay thấp — Phục kích Tên lửa vác vai MANPADS
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import {
  lw,
  drawArrow,
  drawArc,
  drawBgSkyGrid,
  drawBgTacticalMapTop,
  drawBgTacticalTerrainSide,
  drawGunship,
  drawRadarStation,
  drawManpadsTeam,
  drawMissileInFlight,
  drawExplosion2D,
} from './_assets';

export default class extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const rotorA = mainRotorAngleAt(t);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Chuyển góc máy:
    // - 369.18 -> 379.80s: TOP-DOWN Bản đồ chiến thuật (vạch trần xạ thủ ẩn nấp trong chính rừng cây & sườn đồi)
    // - 379.80 -> 397.08s: SIDE Cận cảnh phục kích (Radar quét trượt trên cao, nhưng sóng âm rotor truyền tới tai xạ thủ MANPADS)
    const switchTime = CUE.ch5_radar_not_low - 0.35; // 379.89s

    if (t < switchTime) {
      // =======================================================================
      // GIAI ĐOẠN 1 (369.18 - 379.89s): GÓC TOP-DOWN BẢN ĐỒ CHIẾN THUẬT
      // =======================================================================
      const topHitTime = CUE.ch5_bring_down_millions - 0.2; // 377.06s
      const cam = K.withShake({ x: -60, y: 15, z: 1.05 }, t, [[topHitTime, 14, 0.55]]);
      K.begin(c, cam);

      drawBgTacticalMapTop(c);

      // Quỹ đạo Gunship bay luồn lách giữa khe đồi và các tán cây
      const flyP = A.ph(t, CUE.ch5_same_trees_hills - 0.3, topHitTime + 1.8);
      const gx = A.lerp(-520, 120, flyP);
      const gy = Math.sin(flyP * Math.PI * 1.6) * 55 - 25;
      const gHeading = Math.cos(flyP * Math.PI * 1.6) * 0.22;

      // Vòng phủ che khuất của rừng cây & đồi núi (lúc đầu màu xanh che chở trực thăng, lúc 372.40s chuyển sang đỏ lộ ổ phục kích)
      const ambushReveal = A.eio(t, CUE.ch5_hide_shooter - 0.5, CUE.ch5_hide_shooter + 0.8);
      const ambushSites: [number, number][] = [
        [-120, 210],
        [165, 82],
        [280, -140],
      ];

      for (let i = 0; i < ambushSites.length; i++) {
        const [ax, ay] = ambushSites[i]!;
        const aimA = Math.atan2(gy - ay, gx - ax);

        // Vòng tròn cảnh báo dưới tán cây / sườn đồi
        const ringCol = ambushReveal > 0.3 ? P.enemy : P.olive;
        A.circle(c, ax, ay, 56 + Math.sin(t * 5 + i) * 4, null, ringCol, lw(c, 2.8));

        if (ambushReveal > 0.01) {
          A.withA(c, ambushReveal, () => {
            c.save();
            c.translate(ax, ay);
            drawManpadsTeam(c, 'top', aimA, 1.35);
            c.restore();

            // Đường ngắm khóa mục tiêu từ tán cây vào trực thăng
            A.line(c, [[ax, ay], [gx, gy]], P.enemy, li, [8, 6]);
          });
        }
      }

      // Tên lửa vác vai phóng từ ổ phục kích đồi trung tâm (165, 82) lúc 375.28s -> trúng trực thăng lúc 377.06s
      const launchT0 = CUE.ch5_man_shoulder_missile + 1.1; // 374.98s
      const mProg = (t - launchT0) / (topHitTime - launchT0);
      if (mProg > 0 && mProg < 1) {
        const mx0 = 165;
        const my0 = 82;
        const mx = A.lerp(mx0, gx, mProg);
        const my = A.lerp(my0, gy, mProg);
        const ma = Math.atan2(gy - my0, gx - mx0);
        A.line(c, [[mx0, my0], [mx, my]], P.amber, lw(c, 3), [8, 5]);
        drawMissileInFlight(c, mx, my, ma, P.enemy);
      }

      // Vẽ trực thăng Gunship nhìn từ trên xuống
      c.save();
      c.translate(gx, gy);
      c.rotate(gHeading + (t > topHitTime ? (t - topHitTime) * 0.45 : 0));
      drawGunship(c, 'top', rotorA, 0.96);
      c.restore();

      // Vụ nổ trên thân Gunship khi trúng tên lửa vác vai
      const expP = (t - topHitTime) / 1.1;
      if (expP > 0 && expP < 1) {
        drawExplosion2D(c, gx, gy, expP, 95);
      }

      K.end(c);
    } else {
      // =======================================================================
      // GIAI ĐOẠN 2 (379.89 - 397.08s): GÓC SIDE CẬN CẢNH PHỤC KÍCH BẰNG THÍNH GIÁC & ỐNG PHÓNG
      // =======================================================================
      const sideHitTime = CUE.ch5_low_dangerous + 1.3; // 387.52s
      const cam = K.withShake({ x: -35, y: 38, z: 1.12 }, t, [[sideHitTime, 15, 0.6]]);
      K.begin(c, cam);

      drawBgSkyGrid(c);
      const baseGround = 260;
      drawBgTacticalTerrainSide(c, baseGround);

      // 1. Đài Radar trên đồi cao bên phải quét trượt qua bầu trời cao ("Radar does not see low")
      const radarX = 680;
      const radarY = baseGround - 160;
      const dishX = radarX - 18;
      const dishY = radarY - 64;
      const hillPeakX = 140;
      const hillPeakY = baseGround - 210;

      A.poly(
        c,
        [[dishX, dishY], [-900, -280], [-900, 78], [hillPeakX, hillPeakY]],
        'rgba(220, 38, 38, 0.12)',
        null,
        0
      );
      A.line(c, [[dishX, dishY], [hillPeakX, hillPeakY], [-900, 78]], P.enemy, lw(c, 2.8), [12, 8]);
      c.save();
      c.translate(radarX, radarY);
      drawRadarStation(c, 'side', 0, 1.05);
      c.restore();

      // 2. Vị trí Gunship bay thấp trong thung lũng bên trái đồi (x = -265, y = 42)
      const postHit = Math.max(0, t - sideHitTime);
      const gunX = -275 + Math.min(45, (t - switchTime) * 5);
      const gunY = 32 + Math.sin(t * 3.5) * 4 + Math.min(62, postHit * 14);
      const gunPitch = Math.min(0.24, postHit * 0.08);


      // 3. Xạ thủ MANPADS đứng phục kích giữa lùm cây ở sườn thung lũng (x = 35, y = 218)
      const shooterX = 35;
      const shooterY = baseGround - 36;
      const aimAngle = Math.atan2((gunY + 10) - (shooterY - 26), gunX - shooterX);

      // Sóng âm thanh cánh quạt ("but a person with a tube and a pair of ears does" @ 382.72 - 384.4s)
      const soundReveal = A.eio(t, CUE.ch5_tube_and_ears - 0.8, CUE.ch5_tube_and_ears + 0.6);
      if (soundReveal > 0.01) {
        A.withA(c, soundReveal * (1 - A.sm(t, sideHitTime, sideHitTime + 1.2) * 0.6), () => {
          const waveAngle = Math.atan2(shooterY - 38 - (gunY - 40), shooterX - gunX);
          for (let k = 0; k < 5; k++) {
            const r = (((t * 155) + k * 72) % 360) + 28;
            drawArc(
              c,
              gunX,
              gunY - 40,
              r,
              waveAngle - 0.38,
              waveAngle + 0.38,
              P.amber,
              lw(c, 2.8)
            );
          }
          // Vòng cảm nhận âm thanh ngay tại tai xạ thủ
          A.circle(
            c,
            shooterX,
            shooterY - 38,
            24 + Math.sin(t * 12) * 5,
            null,
            P.amber,
            lw(c, 2.6)
          );
        });
      }

      // Vẽ Xạ thủ MANPADS dưới mặt đất
      c.save();
      c.translate(shooterX, shooterY);
      drawManpadsTeam(c, 'side', aimAngle, 1.55);
      c.restore();

      // Tên lửa tầm nhiệt vác vai phóng lên lúc 386.35s -> nổ trúng Gunship lúc 387.52s
      const sLaunchT0 = CUE.ch5_low_dangerous + 0.15;
      const smProg = (t - sLaunchT0) / (sideHitTime - sLaunchT0);
      if (smProg > 0 && smProg < 1) {
        const mx0 = shooterX - 18;
        const my0 = shooterY - 36;
        const mx1 = gunX + 10;
        const my1 = gunY + 12;
        const mx = A.lerp(mx0, mx1, smProg);
        const my = A.lerp(my0, my1, smProg);
        A.line(c, [[mx0, my0], [mx, my]], P.amber, lw(c, 3.2), [8, 5]);
        drawMissileInFlight(c, mx, my, aimAngle, P.enemy);
      }

      // Vẽ Gunship
      c.save();
      c.translate(gunX, gunY);
      c.rotate(gunPitch);
      drawGunship(c, 'side', rotorA * (postHit > 0 ? 0.75 : 1), 1.08);
      c.restore();

      // Vụ nổ và khói đen khi Gunship trúng tên lửa MANPADS
      const sExpP = (t - sideHitTime) / 1.2;
      if (sExpP > 0 && sExpP < 1) {
        drawExplosion2D(c, gunX + 8, gunY + 8, sExpP, 105);
      }
      if (postHit > 0.25) {
        A.withA(c, A.clamp01(postHit) * 0.72, () => {
          for (let i = 0; i < 5; i++) {
            const sy = ((t * 42 + i * 26) % 120);
            const sx = -i * 18 + Math.sin(t * 3 + i) * 10;
            A.circle(c, gunX + sx, gunY - 15 - sy * 0.7, 16 + i * 4, P.slate, P.ink, li);
          }
        });
      }

      // 4. Bảng đối chiếu bất đối xứng Chi phí vs Sống sót (390.22 - 397.08s: "tens of millions" vs "tube" / "budget")
      const budgetP = A.eio(t, CUE.ch5_question_gunship, CUE.ch5_question_gunship + 1.2);
      if (budgetP > 0.01) {
        const bx = 285;
        const by = -10;
        A.withA(c, budgetP, () => {
          A.rrect(c, bx - 155, by - 110, 310, 220, 14, P.paper, P.ink, lo);

          // Cột trái: Trực thăng Gunship đắt đỏ (5 tầng vàng hổ phách) bị gạch chéo đỏ
          const colL = bx - 68;
          for (let k = 0; k < 5; k++) {
            A.rrect(c, colL - 36, by + 62 - k * 26, 72, 20, 4, P.amber, P.ink, li);
          }
          A.line(c, [[colL - 42, by + 80], [colL + 42, by - 55]], P.enemy, lw(c, 3.8));
          A.line(c, [[colL + 42, by + 80], [colL - 42, by - 55]], P.enemy, lw(c, 3.8));

          // Mũi tên khắc chế từ phải sang trái
          drawArrow(c, [bx + 25, by + 20], [bx - 18, by + 20], P.enemy, lw(c, 3.4), 11);

          // Cột phải: Ống phóng tên lửa vác vai rẻ tiền (chỉ 1 khối nhỏ) nhưng hạ gục cỗ máy lớn
          const colR = bx + 72;
          A.rrect(c, colR - 36, by + 62, 72, 20, 4, P.enemy, P.ink, lo);
          // Vẽ thu nhỏ ống phóng MANPADS phía trên cột phải
          A.rrect(c, colR - 38, by + 12, 76, 12, 3, P.dark, P.ink, li);
          A.rrect(c, colR - 42, by + 9, 14, 18, 3, P.amber, P.ink, li);
        });
      }

      K.end(c);
    }
  }
}
