import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc13 (350.50–391.46s) — Chương 5, Cảnh 1:
 * - 350.50–374.50s (SIDE / CUTAWAY): Chảo quay cơ khí cũ vs Mảng pha điện tử phẳng (Phased Array).
 *   Dịch thời gian từng mô-đun T/R để bẻ góc chùm tia trong vài micro-giây, bám nhiều mục tiêu cùng lúc,
 *   mất vài mô-đun vẫn hoạt động bình thường.
 * - 374.50–391.46s (TOP): Tàu khu trục phòng không mang 4 mặt mảng pha phẳng giám sát 360° không cần quay,
 *   cùng lúc vừa sục sạo, bám bắt vừa dẫn bắn tên lửa phòng không (phóng 383.20s, diệt 385.60s),
 *   và cái giá đắt đỏ khi mỗi mô-đun là một đài vô tuyến thu phát chính xác.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const o = M.lwO(c), inn = M.lwI(c);
    const topMix = A.sm(t, CUE.ch5_warship_four_panels - 0.35, CUE.ch5_warship_four_panels + 0.55);

    const cam: K.Cam = { x: 0, y: 0, z: 1.03 };
    K.begin(c, cam);

    // ══════════════════════════════════════════════════════════════════
    // PHẦN 1: SIDE / CUTAWAY — MẢNG PHA ĐIỆN TỬ LÁI TIA (350.50–374.50s)
    // ══════════════════════════════════════════════════════════════════
    if (topMix < 0.99) {
      A.withA(c, 1 - topMix, () => {
        const gY = 300;
        M.drawSideTerrain(c, -1100, 1100, gY);

        const pPanelIn = A.sm(t, CUE.ch5_phased_array - 0.3, CUE.ch5_phased_array + 0.8);
        const pSteer = A.sm(t, CUE.ch5_shifting_timing, CUE.ch5_shifting_timing + 1.0);
        const pMulti = A.sm(t, CUE.ch5_microseconds, CUE.ch5_microseconds + 0.8);
        const pLoseMod = A.sm(t, CUE.ch5_lose_modules, CUE.ch5_lose_modules + 0.6);

        // 1) Bên trái (-560): Chảo quay cơ khí cũ (350.50–360.5s), sau đó nhường chỗ cho mặt FRONT của mảng pha
        const oldRadarAlpha = 1 - A.sm(t, CUE.ch5_shifting_timing - 0.6, CUE.ch5_shifting_timing + 0.4);
        if (oldRadarAlpha > 0.01) {
          A.withA(c, oldRadarAlpha, () => {
            const dishTilt = Math.sin(t * 2.2) * 0.25;
            M.drawGroundRadar(c, -560, gY, 'side', { scale: 0.95, dishTilt, active: true });
            c.beginPath();
            c.arc(-560, gY - 108, 62, -Math.PI * 0.75, -Math.PI * 0.25);
            A.fs(c, null, P.ink2, inn);

            if (pPanelIn > 0.2) {
              A.withA(c, A.sm(pPanelIn, 0.2, 0.9), () => {
                A.line(c, [[-640, gY - 170], [-480, gY - 10]], P.enemy, o * 1.4);
                A.line(c, [[-640, gY - 10], [-480, gY - 170]], P.enemy, o * 1.4);
              });
            }
          });
        }

        // Mặt trước (FRONT) của tấm mảng pha ngàn ô mô-đun hiện lên ở góc trái
        if (pPanelIn > 0.01) {
          const frontScale = A.lerp(0.55, 0.72, 1 - oldRadarAlpha);
          const frontY = A.lerp(-140, 15, 1 - oldRadarAlpha);
          const brokenFront = pLoseMod > 0.3 ? [4, 11, 19, 26] : [];
          A.withA(c, pPanelIn, () => {
            M.drawPhasedArrayPanel(c, -560, frontY, 'front', {
              scale: frontScale,
              brokenModules: brokenFront,
            });
            A.line(c, [[-460, frontY - 40], [-365, -190]], P.ink2, inn, [6, 6]);
            A.line(c, [[-460, frontY + 40], [-365, 170]], P.ink2, inn, [6, 6]);
          });
        }

        // 2) Trung tâm (-215, -10): Mặt cắt CUTAWAY của 7 mô-đun T/R dịch thời gian phát xung
        if (pPanelIn > 0.01) {
          const targetAngles = [-0.34, 0.02, 0.32];
          const hopIdx = Math.floor((t - CUE.ch5_microseconds) * 4.5) % 3;
          const smoothSteer = Math.sin((t - CUE.ch5_shifting_timing) * 2.1) * 0.34;
          const steerAngle =
            t < CUE.ch5_microseconds
              ? smoothSteer * pSteer
              : A.lerp(smoothSteer, targetAngles[(hopIdx + 3) % 3]!, pMulti);

          const brokenCutaway = pLoseMod > 0.25 ? [1, 4] : [];

          A.withA(c, pPanelIn, () => {
            M.drawPhasedArrayPanel(c, -215, -10, 'cutaway', {
              scale: 0.96,
              steerAngle,
              brokenModules: brokenCutaway,
            });

            if (t >= CUE.ch5_lose_modules && t <= CUE.ch5_lose_modules + 0.9) {
              const ep = (t - CUE.ch5_lose_modules) / 0.9;
              M.drawExplosion(c, -215 - 35, -10 + (-180 + 1 * 60) * 0.96, ep, 32);
              M.drawExplosion(c, -215 - 35, -10 + (-180 + 4 * 60) * 0.96, ep, 32);
            }

            if (pSteer > 0.02) {
              const faceX = -215 + 34 * 0.96;
              const N = 7;
              const waveCycle = (t * 2.2) % 1;
              for (let i = 0; i < N; i++) {
                if (brokenCutaway.includes(i)) continue;
                const ey = -10 + (-180 + i * 60) * 0.96;
                const phaseOffset = Math.sin(steerAngle) * (i - 3) * 28;
                const r = Math.max(8, waveCycle * 150 + phaseOffset);
                M.drawWaveArc(c, faceX, ey, r, steerAngle, 0.95, P.amber, 0.55 * pSteer, 2.5);
              }

              // Đường mặt sóng phẳng tổng hợp (Constructive Wavefront)
              const wfDist = 115 + waveCycle * 160;
              const nx = Math.cos(steerAngle), ny = Math.sin(steerAngle);
              const tx = -ny, ty = nx;
              const wcx = faceX + nx * wfDist;
              const wcy = -10 + ny * wfDist;
              A.line(
                c,
                [
                  [wcx - tx * 165, wcy - ty * 165],
                  [wcx + tx * 165, wcy + ty * 165],
                ],
                P.amber,
                o * 1.2,
                [10, 6]
              );

              // Luồng búp sóng hẹp cường độ cao chiếu thẳng tới mục tiêu
              const beamLen = 780;
              const bx = faceX + nx * beamLen;
              const by = -10 + ny * beamLen;
              A.withA(c, 0.22 * pSteer, () => {
                A.poly(
                  c,
                  [
                    [faceX, -10 - 28],
                    [bx - tx * 46, by - ty * 46],
                    [bx + tx * 46, by + ty * 46],
                    [faceX, -10 + 28],
                  ],
                  P.amber,
                  null,
                  0
                );
              });
              A.line(c, [[faceX, -10], [bx, by]], P.amber, o);
            }
          });
        }

        // 3) Bên phải (360..610): 3 mục tiêu trên không được quét và khóa đồng thời trong vài micro-giây
        const targets = [
          { x0: 540, y: -225, vx: -26 },
          { x0: 610, y: 5, vx: -32 },
          { x0: 510, y: 195, vx: -24 },
        ];
        const dt = Math.max(0, t - CUE.ch5_start);
        targets.forEach((tg, idx) => {
          const jx = tg.x0 + tg.vx * dt * 0.45;
          const jy = tg.y;
          const showJet = idx === 1 ? 1 : pMulti;
          if (showJet > 0.01) {
            A.withA(c, showJet, () => {
              M.drawIntruderJet(c, jx, jy, 'side', { scale: 0.72, rwrAlert: pSteer * 0.7 });

              if (pMulti > 0.2) {
                A.withA(c, A.sm(pMulti, 0.2, 0.8), () => {
                  A.rrect(c, jx - 78, jy - 40, 156, 80, 6, null, P.sky, o);
                  const faceX = -215 + 34 * 0.96;
                  A.line(c, [[faceX, -10], [jx - 65, jy]], P.sky, inn, [8, 8]);
                });
              }
            });
          }
        });
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // PHẦN 2: TOP — TÀU KHU TRỤC 4 MẶT MẢNG PHA QUÉT 360° (374.50–391.46s)
    // ══════════════════════════════════════════════════════════════════
    if (topMix > 0.01) {
      A.withA(c, topMix, () => {
        M.drawTacticalMapTop(c, 0, 0, 850);

        const pModes = A.sm(t, CUE.ch5_switch_modes, CUE.ch5_switch_modes + 0.8);
        const pCost = A.sm(t, CUE.ch5_cost_money, CUE.ch5_cost_money + 0.7);

        // 4 mặt mảng pha trên thượng tầng tàu khu trục phát 4 quạt sóng 90° bao phủ đủ 360°
        const sectorDirs = [-Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.75];
        sectorDirs.forEach((dir, idx) => {
          const sweepSub = Math.sin(t * 4.5 + idx * 1.7) * 0.28;
          A.withA(c, 0.14, () => {
            c.beginPath();
            c.moveTo(0, 0);
            c.arc(0, 0, 470, dir - 0.68, dir + 0.68);
            c.closePath();
            A.fs(c, P.amber, P.amber, inn);
          });
          const bx = Math.cos(dir + sweepSub) * 460;
          const by = Math.sin(dir + sweepSub) * 460;
          A.line(c, [[0, 0], [bx, by]], P.amber, inn, [10, 6]);
        });

        const vlsOpen = t >= 382.8 && t <= 386.5;
        M.drawWarship(c, 0, 0, 'top', { scale: 1.38, activePanels: true, vlsOpen });

        // Mục tiêu 1 (Đông-Bắc): đang bị tia TRACKING (P.sky) khóa chặt
        const t1x = 420 - (t - CUE.ch5_warship_four_panels) * 14;
        const t1y = -250 + (t - CUE.ch5_warship_four_panels) * 6;
        M.drawIntruderJet(c, t1x, t1y, 'top', { scale: 0.68, angle: -0.35, rwrAlert: 0.8 });
        A.line(c, [[28, -28], [t1x, t1y]], P.sky, o);
        A.rrect(c, t1x - 56, t1y - 46, 112, 92, 6, null, P.sky, o);

        // Mục tiêu 2 (Tây-Bắc): nằm trong quạt SEARCHING
        const t2x = -460 + (t - CUE.ch5_warship_four_panels) * 12;
        const t2y = -210;
        M.drawIntruderJet(c, t2x, t2y, 'top', { scale: 0.65, angle: Math.PI, rwrAlert: 0.5 });

        // Mục tiêu 3 (Đông-Nam): từ 381.64s tàu vừa sục sạo, vừa khóa mục tiêu, vừa DẪN BẮN TÊN LỬA (383.20s -> 385.60s)
        const t3x = 470 - (t - CUE.ch5_warship_four_panels) * 18;
        const t3y = 235 - (t - CUE.ch5_warship_four_panels) * 7;
        const interceptT = 385.60;
        if (t < interceptT + 0.15) {
          M.drawIntruderJet(c, t3x, t3y, 'top', { scale: 0.72, angle: 0.38, rwrAlert: 1 });
          if (pModes > 0.1) {
            A.rrect(c, t3x - 58, t3y - 48, 116, 96, 6, null, P.enemy, o);
          }
        }

        // Phóng tên lửa phòng không SAM từ bệ VLS mũi tàu tại 383.20s và dẫn bắn tới 385.60s
        const launchT = 383.20;
        if (t >= launchT && t <= launchT + 0.65) {
          M.drawExplosion(c, 95, 0, (t - launchT) / 0.65, 38);
        }
        if (t >= launchT && t <= interceptT) {
          const mp = A.sm(t, launchT, interceptT);
          const mx = A.lerp(95, t3x, mp);
          const my = A.lerp(0, t3y, mp);
          const mang = Math.atan2(t3y, t3x - 95);
          A.line(c, [[95, 0], [mx, my]], P.paper, o, [8, 6]);
          A.line(c, [[28, 28], [mx, my]], P.amber, o, [6, 5]);
          M.drawMissile(c, mx, my, mang, { scale: 0.95, isEnemyArm: false, thrust: true });
        }
        if (t >= interceptT - 0.05 && t <= interceptT + 1.1) {
          M.drawExplosion(c, t3x, t3y, (t - (interceptT - 0.05)) / 1.15, 86);
        }

        // Cửa sổ chi phí ở 386.84s ("There is a cost, and it is money, because each module is a small, precise radio")
        if (pCost > 0.01) {
          A.withA(c, pCost, () => {
            const cx = -540, cy = 220;
            A.rrect(c, cx - 230, cy - 125, 460, 250, 12, P.paper, P.ink, o);
            A.rrect(c, cx - 195, cy - 55, 210, 86, 8, P.oliveLight, P.ink, o);
            A.rrect(c, cx - 175, cy - 35, 52, 46, 4, P.dark, P.ink, inn);
            A.rrect(c, cx - 105, cy - 35, 52, 46, 4, P.sky, P.ink, inn);
            A.circle(c, cx - 16, cy - 12, 14, P.amber, P.ink, o);
            A.line(c, [[cx + 15, cy - 12], [cx + 55, cy - 12]], P.ink, o);

            for (let k = 0; k < 5; k++) {
              const ky = cy + 55 - k * 24;
              A.rrect(c, cx + 80, ky - 10, 110, 20, 5, P.amber, P.ink, o);
            }
          });
        }
      });
    }

    K.end(c);

    // Callout ở không gian màn hình
    if (t >= CUE.ch5_microseconds - 0.1 && t <= CUE.ch5_warship_four_panels - 0.3) {
      const ca =
        A.sm(t, CUE.ch5_microseconds - 0.1, CUE.ch5_microseconds + 0.4) *
        (1 - A.sm(t, CUE.ch5_warship_four_panels - 0.8, CUE.ch5_warship_four_panels - 0.3));
      M.drawCallout(c, 960, 110, 'MICROSECOND STEERING', { accent: P.amber, alpha: ca });
    }
    if (topMix > 0.5 && t >= CUE.ch5_cost_money) {
      const pCost = A.sm(t, CUE.ch5_cost_money, CUE.ch5_cost_money + 0.7);
      M.drawCallout(c, 420, 610, '1,000× PRECISION RADIOS', { accent: P.amber, alpha: pCost });
    }
  }
}
