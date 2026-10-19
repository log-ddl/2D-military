import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc15 (421.60–475.742s) — Chương 5, Cảnh 3 (Cảnh kết toàn phim):
 * - 421.60–452.58s (SIDE): Phá bỏ ngộ nhận nhị phân "thấy / không thấy ở 100 km" — radar hoạt động theo
 *   Đường cong xác suất phát hiện (Probability Curve) suy giảm theo cự ly, kích thước mục tiêu (RCS) và mức nhiễu.
 * - 452.58–475.742s (SIDE): Quay trở lại khung hình mở đầu phim (đài radar phải hét thật to, máy bay nghe thấy trước),
 *   thắp sáng 5 thành tựu kỹ thuật xuyên suốt bộ phim (xung cực mạnh, anten khổng lồ, bộ lọc Doppler, chuỗi tháp Chain Home,
 *   ô mảng pha AESA) cùng hội tụ để tái tạo bầu trời từ một tiếng thì thầm giữa căn phòng ngày càng ồn ào.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const o = M.lwO(c), inn = M.lwI(c);
    const finaleMix = A.sm(t, CUE.ch5_return_to_shout - 0.4, CUE.ch5_return_to_shout + 0.6);

    const cam: K.Cam = { x: 0, y: 0, z: 1.02 };
    K.begin(c, cam);

    // ══════════════════════════════════════════════════════════════════
    // PHẦN 1: ĐƯỜNG CONG XÁC SUẤT PHÁT HIỆN VS RANH GIỚI CỨNG 100 KM (421.60–452.58s)
    // ══════════════════════════════════════════════════════════════════
    if (finaleMix < 0.99) {
      A.withA(c, 1 - finaleMix, () => {
        const gY = 320;
        M.drawSideTerrain(c, -1100, 1100, gY);

        const pProb = A.sm(t, CUE.ch5_probabilities - 0.2, CUE.ch5_probabilities + 0.7);
        const pFalls = A.sm(t, CUE.ch5_chance_falls, CUE.ch5_chance_falls + 1.2);
        const pSmaller = A.sm(t, 435.2, 436.4);
        const p100km = A.sm(t, CUE.ch5_hundred_km - 0.1, CUE.ch5_hundred_km + 0.7);
        const pCurveEmph = A.sm(t, CUE.ch5_has_a_curve - 0.2, CUE.ch5_has_a_curve + 0.6);

        M.drawGroundRadar(c, -610, gY, 'side', { scale: 0.96, dishTilt: -0.22, active: true });

        const gx0 = -410, gx1 = 590;
        const gyTop = -170, gyBot = 205;
        A.rrect(c, gx0 - 50, gyTop - 55, gx1 - gx0 + 100, gyBot - gyTop + 105, 14, P.paper, P.ink, o);

        for (let i = 0; i <= 4; i++) {
          const ly = A.lerp(gyBot, gyTop, i / 4);
          A.line(c, [[gx0, ly], [gx1, ly]], P.light, inn);
        }
        for (let j = 0; j <= 5; j++) {
          const lx = A.lerp(gx0, gx1, j / 5);
          A.line(c, [[lx, gyTop], [lx, gyBot]], P.light, inn);
        }
        A.line(c, [[gx0, gyTop], [gx0, gyBot]], P.ink, o);
        A.line(c, [[gx0, gyBot], [gx1, gyBot]], P.ink, o);

        const wallX = A.lerp(gx0, gx1, 0.62);
        const binaryAlpha = 1 - pProb * 0.78;
        A.withA(c, binaryAlpha, () => {
          A.line(
            c,
            [
              [gx0, gyTop + 8],
              [wallX, gyTop + 8],
              [wallX, gyBot - 4],
              [gx1, gyBot - 4],
            ],
            P.ink2,
            o,
            pProb > 0.2 ? [10, 8] : undefined
          );
          if (pProb > 0.15) {
            A.line(c, [[wallX - 28, (gyTop + gyBot) / 2 - 28], [wallX + 28, (gyTop + gyBot) / 2 + 28]], P.enemy, o * 1.3);
            A.line(c, [[wallX - 28, (gyTop + gyBot) / 2 + 28], [wallX + 28, (gyTop + gyBot) / 2 - 28]], P.enemy, o * 1.3);
          }
        });

        if (pProb > 0.02) {
          A.withA(c, pProb, () => {
            const N = 60;
            const curveLarge: A.Pt[] = [];
            const curveSmall: A.Pt[] = [];
            const maxIdx = Math.max(2, Math.floor(N * A.clamp(pProb * 0.35 + pFalls * 0.65, 0.2, 1)));

            for (let i = 0; i <= maxIdx; i++) {
              const u = i / N;
              const px = A.lerp(gx0, gx1, u);
              const prob1 = 1 / (1 + Math.exp((u - 0.68) * 8.5));
              const py1 = A.lerp(gyBot - 6, gyTop + 8, prob1);
              curveLarge.push([px, py1]);

              const prob2 = 1 / (1 + Math.exp((u - 0.38) * 9.0));
              const py2 = A.lerp(gyBot - 6, gyTop + 8, prob2);
              curveSmall.push([px, py2]);
            }

            if (curveLarge.length > 2) {
              const fillPts: A.Pt[] = [
                [gx0, gyBot],
                ...curveLarge,
                [curveLarge[curveLarge.length - 1]![0], gyBot],
              ];
              A.withA(c, 0.16 + 0.1 * pCurveEmph, () => {
                A.poly(c, fillPts, P.sky, null, 0);
              });
              A.line(c, curveLarge, P.sky, o * (1.2 + 0.3 * pCurveEmph));
            }

            if (pSmaller > 0.02 && curveSmall.length > 2) {
              A.withA(c, pSmaller, () => {
                A.line(c, curveSmall, P.enemy, o, [10, 6]);
                M.drawStealthJet(c, A.lerp(gx0, gx1, 0.42), A.lerp(gyBot, gyTop, 0.34), 'side', { scale: 0.48 });
                for (let k = 0; k < 22; k++) {
                  const cx = A.lerp(gx0 + 20, gx1 - 20, k / 21);
                  const ch = (12 + (k % 3) * 9) * pSmaller;
                  A.line(c, [[cx, gyBot], [cx, gyBot - ch]], P.slate, inn);
                }
              });
            }

            M.drawIntruderJet(c, A.lerp(gx0, gx1, 0.55), A.lerp(gyBot, gyTop, 0.82), 'side', { scale: 0.52 });

            if (p100km > 0.02) {
              const u100 = 0.62;
              const x100 = A.lerp(gx0, gx1, u100);
              const probAt100Large = 1 / (1 + Math.exp((u100 - 0.68) * 8.5));
              const probAt100Small = 1 / (1 + Math.exp((u100 - 0.38) * 9.0));
              const y100Large = A.lerp(gyBot - 6, gyTop + 8, probAt100Large);
              const y100Small = A.lerp(gyBot - 6, gyTop + 8, probAt100Small);

              A.withA(c, p100km, () => {
                A.line(c, [[x100, gyTop], [x100, gyBot]], P.amber, o, [8, 6]);
                A.circle(c, x100, y100Large, 9, P.sky, P.ink, o);
                A.line(c, [[gx0, y100Large], [x100, y100Large]], P.sky, inn, [6, 6]);

                if (pSmaller > 0.2) {
                  A.circle(c, x100, y100Small, 9, P.enemy, P.ink, o);
                  A.line(c, [[gx0, y100Small], [x100, y100Small]], P.enemy, inn, [6, 6]);
                }
              });
            }
          });
        }
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // PHẦN 2: QUAY LẠI KHUNG HÌNH MỞ ĐẦU & TỔNG HỢP 5 THÀNH TỰU (452.58–475.742s)
    // ══════════════════════════════════════════════════════════════════
    if (finaleMix > 0.01) {
      A.withA(c, finaleMix, () => {
        const gY = 300;
        M.drawSideTerrain(c, -1100, 1100, gY);

        const radarX = -580;
        const jetX = 510;
        const jetY = -140;

        M.drawGroundRadar(c, radarX, gY, 'side', { scale: 1.1, dishTilt: -0.32, active: true });
        M.drawIntruderJet(c, jetX, jetY, 'side', { scale: 0.98, rwrAlert: 1 });

        const shoutCycle = ((t - CUE.ch5_return_to_shout) * 0.55) % 1;
        for (let k = 0; k < 3; k++) {
          const p = (shoutCycle + k / 3) % 1;
          const r = A.lerp(60, 1120, p);
          M.drawWaveArc(c, radarX + 18, gY - 108, r, -0.34, 0.42, P.amber, (1 - p * 0.55) * 0.85, 5);
        }

        for (let k = 0; k < 3; k++) {
          const p = (shoutCycle + k / 3) % 1;
          const r = A.lerp(40, 1100, p);
          M.drawWaveArc(c, jetX - 85, jetY, r, Math.PI - 0.34, 0.36, P.sky, (1 - p * 0.65) * 0.75, 2.5, true);
        }

        const badges = [
          { cue: 457.2, x: -420, y: -235 },
          { cue: 458.8, x: -210, y: -255 },
          { cue: 460.6, x: 0, y: -265 },
          { cue: 462.6, x: 210, y: -255 },
          { cue: 464.4, x: 420, y: -235 },
        ];

        badges.forEach((b, idx) => {
          const ba = A.sm(t, b.cue - 0.15, b.cue + 0.55);
          if (ba <= 0.01) return;
          A.withA(c, ba, () => {
            A.line(c, [[b.x, b.y + 62], [0, 95]], P.sky, inn, [6, 6]);
            A.rrect(c, b.x - 76, b.y - 62, 152, 124, 12, P.paper, P.ink, o);

            if (idx === 0) {
              A.line(
                c,
                [
                  [b.x - 52, b.y + 28],
                  [b.x - 16, b.y + 28],
                  [b.x, b.y - 42],
                  [b.x + 16, b.y + 28],
                  [b.x + 52, b.y + 28],
                ],
                P.amber,
                o * 1.2
              );
            } else if (idx === 1) {
              M.drawEarlyWarningRadar(c, b.x, b.y + 44, 'side', { scale: 0.42 });
            } else if (idx === 2) {
              A.poly(c, [[b.x - 45, b.y + 26], [b.x - 18, b.y - 12], [b.x + 8, b.y + 26]], P.sand, P.ink, inn);
              A.line(c, [[b.x - 42, b.y - 18], [b.x + 4, b.y + 24]], P.enemy, o);
              A.line(c, [[b.x + 14, b.y], [b.x + 52, b.y]], P.sky, o * 1.2);
            } else if (idx === 3) {
              M.drawChainHomeTower(c, b.x - 22, b.y + 44, 'side', { scale: 0.52, active: true });
              M.drawChainHomeTower(c, b.x + 22, b.y + 44, 'side', { scale: 0.52, active: true });
            } else if (idx === 4) {
              M.drawPhasedArrayPanel(c, b.x, b.y, 'front', { scale: 0.36 });
            }
          });
        });

        const pRoom = A.sm(t, CUE.ch5_whisper_in_room - 0.6, CUE.ch5_whisper_in_room + 0.8);
        if (pRoom > 0.01 || t >= 464.0) {
          const panelA = A.sm(t, 464.0, 465.2);
          A.withA(c, panelA, () => {
            if (pRoom > 0.02) {
              for (let n = 0; n < 14; n++) {
                const nx = -520 + n * 82;
                const ny = 220 + Math.sin(t * 5 + n) * 28;
                A.line(c, [[nx, ny], [nx + 36, ny - 18]], P.slate, inn);
              }
            }

            const sx = 0, sy = 145;
            A.rrect(c, sx - 210, sy - 95, 420, 190, 14, P.dark, P.ink, o);
            A.circle(c, sx, sy, 74, null, P.olive, inn);
            A.line(c, [[sx - 180, sy], [sx + 180, sy]], P.olive, inn);
            A.line(c, [[sx, sy - 74], [sx, sy + 74]], P.olive, inn);

            M.drawIntruderJet(c, sx + 24, sy - 12, 'side', { scale: 0.56 });
            A.rrect(c, sx - 42, sy - 44, 132, 64, 6, null, P.sky, o);
          });
        }
      });
    }

    K.end(c);

    // Callouts ở tọa độ màn hình
    if (finaleMix < 0.5) {
      const p100km = A.sm(t, CUE.ch5_hundred_km - 0.1, CUE.ch5_hundred_km + 0.7) * (1 - finaleMix);
      if (p100km > 0.05) {
        M.drawCallout(c, 1185, 130, '100 km · PROBABILITY CURVE', {
          accent: P.amber,
          alpha: p100km,
        });
      }
    } else {
      const pRoom = A.sm(t, CUE.ch5_whisper_in_room - 0.6, CUE.ch5_whisper_in_room + 0.8);
      if (pRoom > 0.1) {
        M.drawCallout(c, 960, 110, 'RECONSTRUCTING THE WHISPER', {
          accent: P.sky,
          alpha: pRoom,
        });
      }
    }
  }
}
