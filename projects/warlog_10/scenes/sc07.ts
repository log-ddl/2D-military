import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc07 (168.74–201.32s): Chọn bước sóng (Wavelength decision):
 * - Sóng dài VHF (174.26–187.30s): xuyên qua mưa dễ dàng, đi xa, nhưng chùm rộng không tách được 2 mục tiêu bay gần nhau.
 * - Sóng ngắn điều khiển hỏa lực (187.58–195.78s): chùm tia hẹp, chi tiết sắc nét, nhưng bị mưa hấp thụ và không đi xa.
 * - Phối hợp 2 đài ở góc TOP (196.14–201.32s): Đài tìm kiếm VHF chỉ thị mục tiêu cho đài dẫn bắn tên lửa phòng không.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const topBlend = A.eio(t, CUE.ch3_rarely_same_set - 0.3, CUE.ch3_rarely_same_set + 0.5);
    const cam: K.Cam = { x: 0, y: 15, z: 1.05 };
    K.begin(c, cam);

    // Giai đoạn A (168.74–196.14s): Góc SIDE đối chiếu Sóng dài VHF vs Sóng ngắn hỏa lực qua vùng mưa
    if (topBlend < 0.99) {
      A.withA(c, 1 - topBlend, () => {
        const groundY = 230;
        const rainZone: [number, number] = [-70, 175];
        M.drawSideTerrain(c, -1100, 1100, groundY, { rainX: rainZone });

        const isShortWave = t >= CUE.ch3_short_waves - 0.2;
        const shortA = A.sm(t, CUE.ch3_short_waves - 0.2, CUE.ch3_short_waves + 0.8);

        // Hai mục tiêu bay gần nhau ở bên phải
        const j1x = 520, j1y = -185;
        const j2x = 580, j2y = -105;

        // 1) Đài cảnh giới Sóng dài VHF (x = -590)
        const vhfX = -590;
        if (!isShortWave || shortA < 1) {
          A.withA(c, 1 - shortA * 0.65, () => {
            // Chùm sóng dài: góc mở lớn (0.58 rad), khoảng cách giữa các vòm sóng thưa (bước sóng dài), xuyên thẳng qua mưa!
            const txX = vhfX + 20, txY = groundY - 170;
            A.withA(c, 0.16, () => {
              c.beginPath();
              c.moveTo(txX, txY);
              c.arc(txX, txY, 1220, -0.34, 0.24);
              c.closePath();
              A.fs(c, P.amber, null, 0);
            });
            for (let i = 0; i < 6; i++) {
              const u = (((t - CUE.ch3_start) * 0.38 + i / 6) % 1);
              const r = A.lerp(70, 1200, u);
              M.drawWaveArc(c, txX, txY, r, -0.05, 0.54, P.amber, 1 - u * 0.45, 7);
            }

            // Ô hiển thị độ phân giải của sóng dài (182.90s): 2 máy bay gần nhau bị nhòe thành 1 đốm to thô!
            const blurBoxA = A.sm(t, CUE.ch3_cannot_tell_apart - 0.3, CUE.ch3_cannot_tell_apart + 0.7);
            if (blurBoxA > 0.01) {
              A.withA(c, blurBoxA, () => {
                A.ellipse(c, 550, -145, 165, 95, 0, 'rgba(245,158,11,0.28)', P.amber, M.lwO(c));
                // Màn hình radar thu nhỏ bên dưới báo 1 vệt duy nhất không tách nổi 2 chiếc
                A.rrect(c, 390, 60, 320, 130, 10, P.paper, P.ink, M.lwO(c));
                A.ellipse(c, 550, 125, 72, 34, 0, P.amber, P.ink, M.lwO(c));
              });
            }
          });
        }
        M.drawEarlyWarningRadar(c, vhfX, groundY, 'side', {
          scale: 1.15,
          vhfArray: true,
          active: !isShortWave,
        });

        // 2) Đài điều khiển hỏa lực Sóng ngắn (x = -360)
        const fcX = -360;
        if (shortA > 0.01) {
          A.withA(c, shortA, () => {
            const txX = fcX + 42, txY = groundY - 98;
            const rainHitA = A.sm(t, CUE.ch3_absorbed_rain - 0.3, CUE.ch3_absorbed_rain + 0.6);

            // Chùm tia cực hẹp (tight beam), các vòm sóng khích sát nhau (bước sóng ngắn)
            // Trước 193.0s: chiếu thẳng tới mục tiêu tách bạch rõ 2 máy bay; từ 193.0s: bị đám mưa hấp thụ!
            const maxReach = A.lerp(960, 460, rainHitA);
            A.withA(c, 0.22, () => {
              c.beginPath();
              c.moveTo(txX, txY);
              c.arc(txX, txY, maxReach, -0.26, -0.10);
              c.closePath();
              A.fs(c, P.sky, null, 0);
            });
            for (let i = 0; i < 14; i++) {
              const u = (((t - CUE.ch3_short_waves) * 0.65 + i / 14) % 1);
              const r = A.lerp(45, maxReach, u);
              const fadeInRain = rainHitA > 0.1 && r > 310 ? A.clamp01(1 - (r - 310) / 160) : 1;
              M.drawWaveArc(c, txX, txY, r, -0.18, 0.16, P.sky, fadeInRain * (1 - u * 0.3), 3.5);
            }

            // Ô hiển thị độ phân giải cao của sóng ngắn (188.5–193.0s): 2 chấm mục tiêu sắc nét tách rời
            A.rrect(c, 390, 60, 320, 130, 10, P.paper, P.ink, M.lwO(c));
            const dotAlpha = A.lerp(1, 0.2, rainHitA);
            A.withA(c, dotAlpha, () => {
              A.circle(c, 515, 105, 12, P.sky, P.ink, M.lwO(c));
              A.circle(c, 585, 145, 12, P.sky, P.ink, M.lwO(c));
            });
          });
        }
        M.drawGroundRadar(c, fcX, groundY, 'side', {
          scale: 1.4,
          dishAngle: -0.24,
          active: isShortWave,
        });

        // Hai chiếc máy bay mục tiêu bay đội hình gần nhau
        M.drawIntruderJet(c, j1x, j1y, 'side', { scale: 1.18 });
        M.drawIntruderJet(c, j2x, j2y, 'side', { scale: 1.18 });
      });
    }

    // Giai đoạn B (196.14–201.32s): Góc TOP — Đài cảnh giới tìm kiếm (Search Radar) + Đài dẫn bắn tên lửa (Fire Control)
    if (topBlend > 0.01) {
      A.withA(c, topBlend, () => {
        M.drawTacticalMapTop(c, -220, 15, 780, { coastlineX: -120 });

        const searchX = -380, searchY = -140;
        const fireX = -240, fireY = 140;
        const targetX = 360, targetY = -40;

        // 1. Đài tìm kiếm sóng dài quét quạt rộng màu amber phát hiện mục tiêu
        const sweep = -0.35 + Math.sin((t - CUE.ch3_rarely_same_set) * 1.8) * 0.45;
        A.withA(c, 0.22, () => {
          c.beginPath();
          c.moveTo(searchX, searchY);
          c.arc(searchX, searchY, 780, sweep - 0.35, sweep + 0.35);
          c.closePath();
          A.fs(c, P.amber, null, 0);
        });
        M.drawEarlyWarningRadar(c, searchX, searchY, 'top', { scale: 1.05, active: true });

        // 2. Đường truyền chỉ thị mục tiêu (Target Handoff) từ đài cảnh giới sang đài hỏa lực
        A.line(c, [[searchX + 35, searchY + 55], [fireX - 20, fireY - 45]], P.amber, M.lwO(c), [12, 8]);

        // 3. Đài điều khiển hỏa lực sóng ngắn chiếu chùm tia bút chì cực hẹp màu sky khóa chặt mục tiêu & dẫn tên lửa
        const lockAng = Math.atan2(targetY - fireY, targetX - fireX);
        A.withA(c, 0.32, () => {
          c.beginPath();
          c.moveTo(fireX, fireY);
          c.arc(fireX, fireY, 680, lockAng - 0.045, lockAng + 0.045);
          c.closePath();
          A.fs(c, P.sky, null, 0);
        });
        A.line(c, [[fireX, fireY], [targetX, targetY]], P.sky, M.lwO(c));
        M.drawGroundRadar(c, fireX, fireY, 'top', { scale: 1.35, dishAngle: lockAng, active: true });

        // Tên lửa phòng không phóng ra ở 197.20s bay dọc theo tia dẫn đường tới mục tiêu
        const mLaunchT = 197.20;
        if (t >= mLaunchT) {
          const mp = A.ph(t, mLaunchT, CUE.ch3_doppler - 0.4);
          const mx = A.lerp(fireX + 45, targetX - 35, mp);
          const my = A.lerp(fireY - 15, targetY + 10, mp);
          A.line(c, [[fireX + 45, fireY - 15], [mx, my]], P.white, M.lwO(c), [8, 6]);
          M.drawMissile(c, mx, my, lockAng, { scale: 1.35, isEnemyArm: false });
          M.drawExplosion(c, fireX + 45, fireY - 15, (t - mLaunchT) / 0.55, 48);
        }

        M.drawIntruderJet(c, targetX, targetY, 'top', { scale: 1.25, angle: 0.08 });
      });
    }

    K.end(c);
  }
}
