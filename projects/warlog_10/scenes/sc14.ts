import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc14 (391.46–421.60s) — Chương 5, Cảnh 2:
 * - 391.46–402.64s (SIDE): Chế áp điện tử — gây nhiễu tạp âm (jamming noise) làm ngập máy thu
 *   và tạo tiếng vọng giả (false echo) đánh lừa vị trí.
 * - 402.64–414.12s (SIDE): Bay thấp bám địa hình (terrain hugging) và phóng tên lửa chống bức xạ (ARM)
 *   bám theo chính chùm tia radar lao thẳng xuống phá hủy anten tại 412.60s.
 * - 414.12–421.60s (TOP): Chiến thuật sinh tồn của kíp trắc thủ radar cơ động (shoot-and-scoot):
 *   tắt sóng im lặng, di chuyển dọc mạng lưới đường sang trận địa mới khiến tên lửa ARM nổ trượt tại 417.80s,
 *   rồi mới bật sóng trở lại.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const o = M.lwO(c), inn = M.lwI(c);
    const topMix = A.sm(t, CUE.ch5_switches_off_moves - 0.35, CUE.ch5_switches_off_moves + 0.45);

    const cam: K.Cam = { x: 0, y: 0, z: 1.03 };
    K.begin(c, cam);

    // ══════════════════════════════════════════════════════════════════
    // PHẦN 1: SIDE — GÂY NHIỄU, ĐÁNH LỪA & TÊN LỬA SĂN RADAR (391.46–414.12s)
    // ══════════════════════════════════════════════════════════════════
    if (topMix < 0.99) {
      A.withA(c, 1 - topMix, () => {
        const gY = 300;
        const pLow = A.sm(t, CUE.ch5_avoided_low - 0.2, CUE.ch5_avoided_low + 0.6);
        const pJam = A.sm(t, CUE.ch5_jammed - 0.1, CUE.ch5_jammed + 0.5) * (1 - pLow);
        const pFalse = A.sm(t, CUE.ch5_false_echo - 0.1, CUE.ch5_false_echo + 0.5) * (1 - pLow);

        M.drawSideTerrain(c, -1100, 1100, gY, {
          hillAt: pLow > 0.01 ? -30 : undefined,
          hillH: 145 * pLow,
        });

        const radarX = -560;
        const radarDestroyed = t >= 412.60;

        if (!radarDestroyed) {
          const beamAng = pLow > 0.5 ? -0.24 : -0.32;
          const bx = radarX + Math.cos(beamAng) * 1180;
          const by = gY - 108 + Math.sin(beamAng) * 1180;
          A.withA(c, 0.2, () => {
            A.poly(
              c,
              [
                [radarX + 18, gY - 108],
                [bx - 40, by - 75],
                [bx + 40, by + 75],
              ],
              P.amber,
              null,
              0
            );
          });
          A.line(c, [[radarX + 18, gY - 108], [bx, by]], P.amber, o, [12, 8]);
        }

        A.withA(c, radarDestroyed ? 0.45 : 1, () => {
          M.drawGroundRadar(c, radarX, gY, 'side', {
            scale: 1.05,
            dishTilt: pLow > 0.5 ? -0.24 : -0.32,
            active: !radarDestroyed,
          });
        });

        // 1) Giai đoạn 391.46–402.64s: Gây nhiễu tạp âm (Jamming) & Tạo tiếng vọng giả (False Echo)
        if (pLow < 0.98) {
          A.withA(c, 1 - pLow, () => {
            const jx = 480 - (t - CUE.ch5_enemy_do) * 10;
            const jy = -165;
            M.drawIntruderJet(c, jx, jy, 'side', { scale: 0.9, rwrAlert: 0.9 });

            if (pJam > 0.02) {
              A.withA(c, pJam * (1 - pFalse * 0.4), () => {
                const startX = jx - 85, startY = jy + 6;
                const endX = radarX + 35, endY = gY - 108;
                const pts: A.Pt[] = [];
                const N = 32;
                for (let i = 0; i <= N; i++) {
                  const u = i / N;
                  const px = A.lerp(startX, endX, u);
                  const py = A.lerp(startY, endY, u);
                  const jag = (i % 2 === 0 ? 1 : -1) * 22 * Math.sin(u * Math.PI);
                  pts.push([px, py + jag]);
                }
                A.line(c, pts, P.enemy, o * 1.15);
              });
            }

            if (pFalse > 0.02) {
              const gx = 125, gy = -85;
              A.withA(c, pFalse * 0.78, () => {
                M.drawIntruderJet(c, gx, gy, 'side', { scale: 0.85 });
                A.rrect(c, gx - 98, gy - 46, 196, 92, 8, null, P.enemy, o);
                const rWave = (t * 240) % 450;
                M.drawWaveArc(c, gx - 60, gy, rWave, Math.PI - 0.25, 0.55, P.enemy, 0.8, 3.5, true);
              });
            }

            M.drawTimingScope(c, 0, 195, 520, 140, {
              txPos: 0.1,
              rxPos: pFalse > 0.3 ? 0.42 : 0.76,
              rxHeight: pFalse > 0.3 ? 0.88 : 0.35,
              noiseFloor: pJam > 0.1 && pFalse < 0.3 ? 0.92 * pJam : 0.12,
            });
          });
        }

        // 2) Giai đoạn 402.64–414.12s: Bay thấp bám địa hình & phóng tên lửa chống bức xạ ARM
        if (pLow > 0.02) {
          A.withA(c, pLow, () => {
            const lowPhase = A.clamp((t - CUE.ch5_avoided_low) / 4.4, 0, 1);
            const popUp = A.sm(t, CUE.ch5_special_missiles - 0.6, CUE.ch5_special_missiles + 0.3);
            const jx = A.lerp(560, 390, lowPhase);
            const jy = A.lerp(gY - 72, -110, popUp);
            const jAng = A.lerp(0, 0.12, popUp);

            A.line(
              c,
              [
                [640, gY - 68],
                [240, gY - 68],
                [80, gY - 165],
              ],
              P.ink2,
              inn,
              [8, 6]
            );

            M.drawIntruderJet(c, jx, jy, 'side', { scale: 0.92, angle: jAng, rwrAlert: 1 });

            const armLaunchT = 407.40;
            const armHitT = 412.60;
            if (t >= armLaunchT && t <= armLaunchT + 0.6) {
              M.drawExplosion(c, jx - 30, jy + 18, (t - armLaunchT) / 0.6, 36);
            }
            if (t >= armLaunchT && t <= armHitT) {
              const mp = A.ei(t, armLaunchT, armHitT);
              const startX = 360, startY = -92;
              const endX = radarX + 18, endY = gY - 108;
              const mx = A.lerp(startX, endX, mp);
              const my = A.lerp(startY, endY, mp);
              const mang = Math.atan2(endY - startY, endX - startX);

              A.line(c, [[startX, startY], [endX, endY]], P.enemy, o, [10, 6]);
              M.drawMissile(c, mx, my, mang, { scale: 1.08, isEnemyArm: true, thrust: true });
            }
            if (t >= armHitT - 0.05 && t <= armHitT + 1.25) {
              M.drawExplosion(c, radarX + 12, gY - 95, (t - (armHitT - 0.05)) / 1.3, 105);
            }
          });
        }
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // PHẦN 2: TOP — ĐÀI CƠ ĐỘNG TẮT SÓNG & DI CHUYỂN (414.12–421.60s)
    // ══════════════════════════════════════════════════════════════════
    if (topMix > 0.01) {
      A.withA(c, topMix, () => {
        M.drawTacticalMapTop(c, 0, 0, 850, { roads: true });

        const posA: A.Pt = [-260, -45];
        const posB: A.Pt = [185, 165];
        const moveP = A.sm(t, 415.25, 418.75);
        const rx = A.lerp(posA[0], posB[0], moveP);
        const ry = A.lerp(posA[1], posB[1], moveP);
        const roadAngle = Math.atan2(posB[1] - posA[1], posB[0] - posA[0]);

        const isRadiating = t < 415.20 || t >= 419.10;

        A.circle(c, posA[0], posA[1], 44, null, P.enemy, o);
        A.line(c, [[posA[0] - 18, posA[1]], [posA[0] + 18, posA[1]]], P.enemy, inn);
        A.line(c, [[posA[0], posA[1] - 18], [posA[0], posA[1] + 18]], P.enemy, inn);

        if (moveP > 0.02) {
          A.line(c, [posA, [rx, ry]], P.oliveDark, o, [10, 6]);
        }

        if (isRadiating) {
          const waveR = (t * 220) % 280;
          A.circle(c, rx, ry, waveR, null, P.amber, o);
        }

        M.drawGroundRadar(c, rx, ry, 'top', {
          scale: 1.15,
          mobile: true,
          dishRot: isRadiating ? t * 2.8 : roadAngle,
          active: isRadiating,
        });

        const jetX = 520 - (t - CUE.ch5_switches_off_moves) * 22;
        const jetY = -235;
        M.drawIntruderJet(c, jetX, jetY, 'top', { scale: 0.78, angle: -0.35, rwrAlert: isRadiating ? 0.9 : 0 });

        const arm2Launch = 415.00;
        const arm2Hit = 417.80;
        if (t >= arm2Launch && t <= arm2Launch + 0.55) {
          M.drawExplosion(c, 480, -225, (t - arm2Launch) / 0.55, 34);
        }
        if (t >= arm2Launch && t <= arm2Hit) {
          const mp = A.ei(t, arm2Launch, arm2Hit);
          const mx = A.lerp(480, posA[0], mp);
          const my = A.lerp(-225, posA[1], mp);
          const mang = Math.atan2(posA[1] - -225, posA[0] - 480);
          A.line(c, [[480, -225], [mx, my]], P.enemy, inn, [8, 6]);
          M.drawMissile(c, mx, my, mang, { scale: 0.98, isEnemyArm: true, thrust: true });
        }
        if (t >= arm2Hit - 0.05 && t <= arm2Hit + 1.1) {
          M.drawExplosion(c, posA[0], posA[1], (t - (arm2Hit - 0.05)) / 1.15, 85);
        }
      });
    }

    K.end(c);

    // Callouts ở tọa độ màn hình
    const pLow = A.sm(t, CUE.ch5_avoided_low - 0.2, CUE.ch5_avoided_low + 0.6);
    const pJam = A.sm(t, CUE.ch5_jammed - 0.1, CUE.ch5_jammed + 0.5) * (1 - pLow);
    const pFalse = A.sm(t, CUE.ch5_false_echo - 0.1, CUE.ch5_false_echo + 0.5) * (1 - pLow);
    const pArm = A.sm(t, CUE.ch5_special_missiles - 0.1, CUE.ch5_special_missiles + 0.4) * (1 - topMix);

    if (topMix < 0.5) {
      if (pFalse > 0.05) {
        M.drawCallout(c, 1110, 210, 'FALSE ECHO', { accent: P.enemy, alpha: pFalse });
      } else if (pJam > 0.2) {
        M.drawCallout(c, 1380, 120, 'NOISE JAMMING', { accent: P.enemy, alpha: pJam });
      }
      if (pArm > 0.1) {
        M.drawCallout(c, 960, 110, 'ANTI-RADIATION MISSILE', { accent: P.enemy, alpha: pArm });
      }
    } else {
      const isRadiating = t < 415.20 || t >= 419.10;
      if (!isRadiating) {
        M.drawCallout(c, 960, 115, 'RADIO SILENCE · RELOCATING', { accent: P.olive, alpha: 0.95 });
      } else if (t >= 419.10) {
        M.drawCallout(c, 1140, 595, 'BACK ON AIR', { accent: P.amber, alpha: A.sm(t, 419.1, 419.5) });
      }
    }
  }
}
