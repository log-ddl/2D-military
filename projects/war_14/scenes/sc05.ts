// scenes/sc05.ts — Chương 5 (388.76 – 479.53s): Serbia 1999, Kỷ luật Phát xạ, Quyền Chủ động & Tổng kết
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as U from './shared/ui';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawTechBg,
  drawSkyGroundBg,
  drawTacticalMapBg,
  drawStealthDiamond,
  drawRadarStation,
  drawPassiveReceiver,
  drawSamBattery,
  drawSamMissile,
  drawComputer1970s,
  drawRadarWave,
} from './_assets';

function drawBadge(c: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, fg = P.white) {
  const w = Math.max(130, text.length * 17 + 38);
  A.rrect(c, x - w / 2, y - 24, w, 48, 10, bg, P.ink, A.px(c, 3));
  U.label(c, text, x, y + 1, 24, fg, 1, 'center');
}

function drawCheck(c: CanvasRenderingContext2D, x: number, y: number, r: number, col = P.oliveLight) {
  A.circle(c, x, y, r, P.white, P.ink, A.px(c, 3));
  A.line(
    c,
    [
      [x - r * 0.45, y + r * 0.05],
      [x - r * 0.1, y + r * 0.42],
      [x + r * 0.48, y - r * 0.38],
    ],
    col,
    A.px(c, 6)
  );
}

export default class Sc05 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const T51_END = CUE.other_ways_found; // 404.00
    const T52_END = CUE.easy_to_get_wrong; // 433.54
    const T53_END = CUE.return_to_diamond; // 459.98

    // ── CẢNH 5.1 (388.76 – 404.00s): Vụ bắn rơi tại Serbia năm 1999 ─────────────
    if (t < T51_END) {
      const T_SPLIT = 396.5;

      if (t < T_SPLIT) {
        // Nửa đầu (388.76 – 396.50s): Bản đồ chiến thuật nhìn từ trên xuống (top) ban đêm
        const cam: K.Cam = { x: 0, y: 0, z: 0.96 };
        A.clear(c, P.dark);
        K.begin(c, cam);
        drawTacticalMapBg(c, cam, { night: true });

        // Nhãn mốc sự kiện ngắn gọn
        drawBadge(c, -480, -320, 'SERBIA 1999', P.enemy, P.white);

        // 3 đường bay lặp đi lặp lại qua cùng một hành lang (predictable paths)
        const pathsY = [-155, -100, -45];
        for (let i = 0; i < pathsY.length; i++) {
          const py = pathsY[i]!;
          const pReveal = A.sm(t, CUE.shot_down_serbia + i * 0.8, CUE.shot_down_serbia + i * 0.8 + 1.8);
          if (pReveal > 0) {
            const endX = A.lerp(-580, 500, pReveal);
            A.line(
              c,
              [[-580, py], [endX, py]],
              i === 2 ? P.amber : 'rgba(245,158,11,0.45)',
              A.px(c, i === 2 ? 3.5 : 2.5),
              [A.px(c, 12), A.px(c, 8)]
            );
            if (pReveal > 0.9) {
              U.arrow(c, [endX - 45, py], [endX, py], {
                color: i === 2 ? P.amber : P.oliveLight,
                w: A.px(c, 3.5),
                head: 15,
              });
            }
          }
        }

        // Khẩu đội SAM và đài Radar VHF cơ động liên tục giữa các trận địa (battery_moved_often @ 395.14)
        const moveP = A.sm(t, 391.5, 395.8);
        const samX = A.lerp(380, 120, moveP);
        const samY = A.lerp(260, 125, moveP);

        // Vệt di chuyển trận địa phòng không
        A.line(c, [[380, 260], [250, 200], [120, 125]], P.enemyLight, A.px(c, 3.5), [A.px(c, 10), A.px(c, 7)]);
        A.circle(c, 380, 260, 12, P.dark, P.enemyLight, A.px(c, 2.5));
        A.circle(c, 250, 200, 12, P.dark, P.enemyLight, A.px(c, 2.5));

        // Vòng sóng VHF tần số thấp quét lên hành lang bay
        if (t >= 393.5) {
          const pulse = (t - 393.5) % 1.6;
          const r = 45 + pulse * 175;
          A.circle(c, samX + 80, samY + 10, r, null, P.sky, A.px(c, 3));
        }

        drawSamBattery(c, samX - 40, samY, 1.15, 'top', { railAngle: -1.35 });
        drawRadarStation(c, samX + 80, samY + 10, 1.1, 'top', { dishAngle: t * 2.2, alert: moveP });

        // Máy bay F-117 đi vào đúng hành lang lặp lại thứ 3
        const jetP = A.ph(t, CUE.ch5_start, T_SPLIT);
        const jetX = A.lerp(-440, 90, jetP);
        drawStealthDiamond(c, jetX, -45, 0.92, 'top', { dir: 1 });
        K.end(c);
        return;
      }

      // Nửa sau (396.50 – 404.00s): Cắt sang góc nhìn ngang (side) ban đêm — Phóng SAM & Bắn rơi
      const hitT = 400.4;
      const [sx, sy] = K.shake(t, hitT, 0.85, 14);
      const cam: K.Cam = {
        x: sx,
        y: -25 + sy,
        z: 0.96,
      };
      A.clear(c, P.dark);
      K.begin(c, cam);
      drawSkyGroundBg(c, cam, { groundY: 260, night: true });

      // Hành lang đường bay lặp lại (predictable_paths @ 401.92) hiện bằng đường nét đứt trên bầu trời đêm
      const showCorridor = A.sm(t, CUE.predictable_paths - 1.2, CUE.predictable_paths + 0.8);
      if (showCorridor > 0) {
        A.withA(c, 0.68 * showCorridor, () => {
          A.line(c, [[-720, -145], [640, -145]], P.amber, A.px(c, 3.5), [A.px(c, 16), A.px(c, 10)]);
          A.line(c, [[-720, -190], [640, -190]], 'rgba(245,158,11,0.45)', A.px(c, 2.5), [A.px(c, 12), A.px(c, 10)]);
        });
      }

      // Đài radar VHF bước sóng dài (lower_freq_radar @ 398.5)
      const radarX = 320;
      const samX = 75;
      drawRadarStation(c, radarX, 260, 1.28, 'side', { vhfMode: true, alert: 1 });

      // Vị trí máy bay F-117 trước và sau khi trúng tên lửa
      const preHitP = A.ph(t, T_SPLIT, hitT);
      const postHitP = A.ei(t, hitT, T51_END);
      const jetX = t < hitT ? A.lerp(-340, 30, preHitP) : A.lerp(30, 270, postHitP);
      const jetY = t < hitT ? -145 : A.lerp(-145, 95, postHitP);
      const jetRot = t < hitT ? 0 : postHitP * 0.46;

      // Sóng VHF bước sóng dài chiếu lên máy bay
      if (t < hitT + 0.5) {
        const wP = A.sm(t, T_SPLIT + 0.2, T_SPLIT + 1.4);
        drawRadarWave(c, [radarX, 55], [jetX, jetY + 12], wP, {
          color: P.sky,
          w: A.px(c, 4),
          wavelength: 92,
          amp: 15,
        });
      }
      if (t >= CUE.lower_freq_radar - 0.5 && t < hitT + 1.2) {
        drawBadge(c, radarX + 145, 105, 'VHF', P.white, P.ink);
      }

      // Vẽ máy bay F-117 lớn, rõ nét
      drawStealthDiamond(c, jetX, jetY, 1.38, 'side', {
        dir: 1,
        rot: jetRot,
        highlightFacet: t >= hitT && t < hitT + 0.6 ? 99 : -1,
      });

      // Khói đen bốc ra từ máy bay sau khi trúng đạn
      if (t >= hitT) {
        FX.smoke(c, jetX - 50, jetY - 10, t - hitT, 1.25, 7, P.dark);
        FX.smoke(c, 30, -145, t - hitT, 1.45, 8, P.slate);
      }

      // Phóng 2 quả tên lửa SAM (Quả 1: 397.8 -> 400.4s; Quả 2: 399.0 -> 401.2s)
      const m1Launch = 397.8;
      const m2Launch = 399.0;
      const missilesRemaining = t < m1Launch ? 2 : t < m2Launch ? 1 : 0;
      drawSamBattery(c, samX, 260, 1.28, 'side', { railAngle: -1.35, missiles: missilesRemaining });

      if (t >= m1Launch && t <= hitT) {
        const m1P = A.ei(t, m1Launch, hitT);
        const mx = A.lerp(samX - 12, 30, m1P);
        const my = A.lerp(180, -145, m1P);
        A.line(c, [[samX - 12, 180], [mx, my]], 'rgba(226,232,240,0.55)', A.px(c, 4.5), [A.px(c, 10), A.px(c, 6)]);
        drawSamMissile(c, mx, my, 1.15, -1.62, { inFlight: true });
      }

      if (t >= m2Launch && t <= hitT + 0.8) {
        const m2P = A.ei(t, m2Launch, hitT + 0.8);
        const mx2 = A.lerp(samX + 14, 95, m2P);
        const my2 = A.lerp(180, -175, m2P);
        A.line(c, [[samX + 14, 180], [mx2, my2]], 'rgba(226,232,240,0.45)', A.px(c, 4), [A.px(c, 10), A.px(c, 6)]);
        drawSamMissile(c, mx2, my2, 1.1, -1.52, { inFlight: true });
      }

      // Vụ nổ đánh chặn tại t = 400.4s (SFX boom)
      if (t >= hitT && t <= hitT + 1.4) {
        FX.explosion(c, 30, -145, 130, (t - hitT) / 1.1);
      }
      K.end(c);
      return;
    }

    // ── CẢNH 5.2 (404.00 – 433.54s): 4 Nguồn Phát xạ & So sánh Im lặng vs Ồn ào ─
    if (t < T52_END) {
      const T_COMPARE = CUE.careful_crew_emissions; // 418.16

      if (t < T_COMPARE) {
        // Giai đoạn A (404.00 – 418.16s): 4 cách làm lộ vị trí dù RCS thấp
        const cam: K.Cam = { x: 0, y: -20, z: 0.96 };
        A.clear(c, P.dark);
        K.begin(c, cam);
        drawSkyGroundBg(c, cam, { groundY: 260, night: true });

        const jetX = -50;
        const jetY = -115;

        // 1. Phát nhiệt hồng ngoại (emits_heat_ir @ 406.52)
        const pIR = A.sm(t, CUE.emits_heat_ir - 0.3, CUE.emits_heat_ir + 0.9);
        if (pIR > 0) {
          A.withA(c, pIR, () => {
            // Luồng nhiệt đỏ-vàng sau khe xả
            A.poly(
              c,
              [
                [jetX - 285, jetY - 8],
                [jetX - 510, jetY - 48],
                [jetX - 555, jetY + 2],
                [jetX - 500, jetY + 48],
              ],
              'rgba(245,158,11,0.38)',
              P.enemy,
              A.px(c, 2.5)
            );
            A.poly(
              c,
              [
                [jetX - 285, jetY - 5],
                [jetX - 420, jetY - 22],
                [jetX - 445, jetY + 2],
                [jetX - 415, jetY + 22],
              ],
              P.amber,
              null,
              0
            );
            // Cảm biến hồng ngoại dưới đất bắt tia nhiệt
            drawPassiveReceiver(c, -340, 260, 1.2, 'side', { active: pIR });
            A.line(c, [[jetX - 360, jetY + 10], [-340, 155]], P.enemy, A.px(c, 3.5), [A.px(c, 8), A.px(c, 6)]);
          });
        }

        // 2. Tiếng ồn động cơ & vệt khói (noise_exhaust_trail @ 410.18)
        const pNoise = A.sm(t, CUE.noise_exhaust_trail - 0.3, CUE.noise_exhaust_trail + 0.9);
        if (pNoise > 0) {
          A.withA(c, pNoise, () => {
            // Vệt khói kéo dài phía sau
            for (let i = 0; i < 5; i++) {
              const sx = jetX - 330 - i * 78;
              const sr = 22 + i * 8;
              A.circle(c, sx, jetY + Math.sin(i * 1.5) * 9, sr, 'rgba(203,213,225,0.35)', P.light, A.px(c, 2));
            }
            // Vòng sóng âm thanh lan xuống đất
            for (const r of [75, 125, 175]) {
              c.beginPath();
              c.arc(jetX - 180, jetY + 18, r, Math.PI * 0.2, Math.PI * 0.8);
              A.fs(c, null, P.amber, A.px(c, 3.5));
            }
            drawPassiveReceiver(c, -90, 260, 1.2, 'side', { active: pNoise });
          });
        }

        // 3. Liên lạc vô tuyến (talks_on_radio @ 413.60)
        const pRadio = A.sm(t, CUE.talks_on_radio - 0.3, CUE.talks_on_radio + 0.7);
        if (pRadio > 0) {
          A.withA(c, pRadio, () => {
            for (let i = 1; i <= 3; i++) {
              const rr = i * 56 + ((t * 45) % 45);
              A.circle(c, jetX + 45, jetY - 58, rr, null, P.sky, A.px(c, 2.8));
            }
            drawPassiveReceiver(c, 150, 260, 1.2, 'side', { active: pRadio });
            A.line(c, [[jetX + 45, jetY - 25], [150, 155]], P.sky, A.px(c, 3), [A.px(c, 8), A.px(c, 6)]);
          });
        }

        // 4. Tự bật radar mũi như đèn pha trong phòng tối (own_radar_gives_away @ 414.80)
        const pRadarCone = A.sm(t, CUE.own_radar_gives_away - 0.2, CUE.own_radar_gives_away + 0.8);
        if (pRadarCone > 0) {
          A.withA(c, pRadarCone, () => {
            A.poly(
              c,
              [
                [jetX + 305, jetY + 10],
                [660, jetY - 210],
                [660, jetY + 250],
              ],
              'rgba(245,158,11,0.28)',
              P.amber,
              A.px(c, 3.5)
            );
            drawRadarWave(c, [jetX + 305, jetY + 10], [440, 145], 1, {
              color: P.enemy,
              w: A.px(c, 4.5),
            });
            drawRadarStation(c, 440, 260, 1.25, 'side', { alert: 1 });
          });
        } else {
          drawRadarStation(c, 440, 260, 1.25, 'side', { alert: 0 });
        }

        drawStealthDiamond(c, jetX, jetY, 1.38, 'side', {
          dir: 1,
          highlightExhaust: pIR,
          highlightCockpit: pRadio,
        });
        K.end(c);
        return;
      }

      // Giai đoạn B (418.16 – 433.54s): So sánh 2 tầng — Tầng trên IM LẶNG vs Tầng dưới ỒN ÀO
      const cam: K.Cam = { x: 0, y: 0, z: 0.94 };
      A.clear(c, P.dark);
      K.begin(c, cam);
      drawTechBg(c, cam, { darkMode: true });

      // Đường chia đôi tầng trên / tầng dưới
      A.line(c, [[-960, 0], [960, 0]], P.slate, A.px(c, 3), [A.px(c, 14), A.px(c, 10)]);

      const topY = -180;
      const botY = 180;
      const jetX = -110;

      // ── TẦNG TRÊN: Máy bay giữ kỷ luật phát xạ (SILENT) ──
      drawStealthDiamond(c, jetX, topY, 1.15, 'side', { dir: 1 });
      drawRadarStation(c, 420, topY + 105, 1.02, 'side', { alert: 0 });

      // Cảm biến chỉ thu thụ động (sensors_passive @ 423.62)
      const pPassive = A.sm(t, CUE.sensors_passive - 0.5, CUE.sensors_passive + 0.8);
      if (pPassive > 0) {
        drawRadarWave(c, [370, topY + 10], [jetX + 245, topY + 8], pPassive, {
          color: P.sky,
          w: A.px(c, 3.5),
          dashed: true,
        });
        A.circle(c, jetX + 240, topY + 8, 12, P.oliveLight, P.ink, A.px(c, 2.5));
      }

      // Truyền tin bằng chùm tia định hướng cực hẹp (narrow_beam @ 425.88)
      const pBeam = A.sm(t, CUE.narrow_beam - 0.3, CUE.narrow_beam + 0.8);
      if (pBeam > 0) {
        // Nút thu vệ tinh/đồng đội phía trên-sau, không lọt xuống đài địch
        A.circle(c, -450, topY - 125, 18, P.oliveLight, P.ink, A.px(c, 2.5));
        drawRadarWave(c, [jetX - 25, topY - 52], [-432, topY - 120], pBeam, {
          color: P.oliveLight,
          w: A.px(c, 3.5),
        });
      }

      drawBadge(c, -650, topY, 'SILENT', P.olive, P.white);
      if (t >= CUE.silent_vs_noisy) {
        drawCheck(c, 565, topY + 45, 38, P.oliveLight);
      }

      // ── TẦNG DƯỚI: Máy bay ồn ào phát sóng bừa bãi (NOISY) ──
      const pNoisy = A.sm(t, CUE.silent_vs_noisy - 1.2, CUE.silent_vs_noisy + 0.5);
      A.withA(c, Math.max(0.35, pNoisy), () => {
        // Nón đèn pha radar mũi
        if (pNoisy > 0.1) {
          A.poly(
            c,
            [
              [jetX + 245, botY + 10],
              [540, botY - 120],
              [540, botY + 145],
            ],
            'rgba(245,158,11,0.28)',
            P.amber,
            A.px(c, 2.8)
          );
          // Vòng sóng vô tuyến tỏa tròn
          for (const r of [65, 110]) {
            A.circle(c, jetX + 25, botY - 45, r, null, P.amber, A.px(c, 2.8));
          }
          // Luồng nhiệt đuôi (không chạm vào badge NOISY ở -650)
          A.poly(
            c,
            [
              [jetX - 240, botY - 6],
              [jetX - 410, botY - 30],
              [jetX - 410, botY + 30],
            ],
            P.enemy,
            null,
            0
          );
        }

        drawStealthDiamond(c, jetX, botY, 1.15, 'side', {
          dir: 1,
          highlightCockpit: pNoisy,
          highlightExhaust: pNoisy,
        });
        drawRadarStation(c, 420, botY + 105, 1.02, 'side', { alert: pNoisy });

        if (pNoisy > 0.3) {
          // Đài địch khóa ngược lại ngay lập tức
          drawRadarWave(c, [370, botY + 10], [jetX + 160, botY + 10], pNoisy, {
            color: P.enemy,
            w: A.px(c, 4.5),
          });
          U.xMark(c, 565, botY + 45, 32, 1, P.enemy, A.px(c, 8));
        }
        drawBadge(c, -650, botY, 'NOISY', P.enemy, P.white);
      });
      K.end(c);
      return;
    }

    // ── CẢNH 5.3 (433.54 – 459.98s): Không Bất tử & Thay đổi Quyền Chủ động ─────
    if (t < T53_END) {
      const T_INITIATIVE = CUE.changes_initiative; // 441.72

      if (t < T_INITIATIVE) {
        // Giai đoạn A (433.54 – 441.72s): Bác bỏ ngộ nhận "tấm khiên bất tử" (not_immune @ 438.00)
        const cam: K.Cam = { x: 0, y: 0, z: 0.98 };
        A.clear(c, P.bg);
        K.begin(c, cam);
        drawTechBg(c, cam);

        drawStealthDiamond(c, 0, -10, 1.58, 'side', { dir: 1 });

        // Vòng khiên bảo vệ giả định quanh máy bay
        const pShield = A.sm(t, CUE.easy_to_get_wrong + 0.3, CUE.easy_to_get_wrong + 1.5);
        const pReject = A.sm(t, CUE.not_immune - 0.2, CUE.not_immune + 0.6);
        if (pShield > 0) {
          A.ellipse(
            c,
            0,
            -18,
            450,
            195,
            0,
            pReject > 0.2 ? 'rgba(180,73,60,0.10)' : 'rgba(59,130,246,0.14)',
            pReject > 0.2 ? P.enemy : P.sky,
            A.px(c, 4.5)
          );
        }

        if (pReject > 0) {
          U.xMark(c, 0, -18, 165, pReject, P.enemy, A.px(c, 11));
        }
        K.end(c);
        return;
      }

      // Giai đoạn B (441.72 – 459.98s): Quyền chủ động — Phòng thủ thấy muộn/bắn mù vs Tấn công chọn thời điểm
      const blindHitT = 446.8;
      const strikeHitT = 450.2;
      const [sx, sy] = K.shake(t, strikeHitT, 0.75, 12);
      const cam: K.Cam = {
        x: 20 + sx,
        y: -25 + sy,
        z: 0.96,
      };
      A.clear(c, P.bg);
      K.begin(c, cam);
      drawSkyGroundBg(c, cam, { groundY: 260 });

      const samX = -70;
      const radarX = 140;
      const targetX = 410;

      // Đường bay chủ động của máy bay tàng hình từ trái sang phải
      const flyP = A.ph(t, T_INITIATIVE, T53_END);
      const jetX = A.lerp(-420, 480, flyP);
      const jetY = -165;

      // Vòng phát hiện rất hẹp của bên phòng thủ (defender_sees_late @ 444.34)
      const lateAlert = A.sm(t, CUE.defender_sees_late - 0.3, CUE.defender_sees_late + 0.8);
      A.circle(
        c,
        radarX,
        190,
        215,
        lateAlert > 0.2 ? 'rgba(180,73,60,0.10)' : null,
        P.enemy,
        A.px(c, 3)
      );

      // Mục tiêu sở chỉ huy đối phương tại (410, 260)
      const destroyed = t >= strikeHitT;
      A.rrect(
        c,
        targetX - 75,
        185,
        150,
        75,
        6,
        destroyed ? P.dark : P.enemy,
        P.ink,
        A.px(c, LINE.outer)
      );
      A.poly(
        c,
        [
          [targetX - 88, 185],
          [targetX, 150],
          [targetX + 88, 185],
        ],
        destroyed ? P.slate : P.enemyLight,
        P.ink,
        A.px(c, LINE.inner)
      );

      // Bên phòng thủ bắn mù lên khoảng không trống rỗng (shooting_blind_waiting @ 446.12)
      const blindLaunchT = 445.5;
      const blindMissiles = t < blindLaunchT ? 2 : 1;
      drawSamBattery(c, samX, 260, 1.25, 'side', { railAngle: -2.15, missiles: blindMissiles });
      drawRadarStation(c, radarX, 260, 1.22, 'side', {
        dishAngle: Math.sin(t * 5) * 0.35,
        alert: lateAlert,
      });

      if (t >= blindLaunchT && t <= blindHitT) {
        const bmP = A.eo(t, blindLaunchT, blindHitT);
        const bmx = A.lerp(samX - 18, -260, bmP);
        const bmy = A.lerp(180, -235, bmP);
        A.line(c, [[samX - 18, 180], [bmx, bmy]], 'rgba(180,73,60,0.45)', A.px(c, 4), [A.px(c, 8), A.px(c, 6)]);
        drawSamMissile(c, bmx, bmy, 1.1, -2.08, { inFlight: true });
      }
      if (t >= blindHitT && t <= blindHitT + 1.1) {
        FX.explosion(c, -260, -235, 85, (t - blindHitT) / 1.0);
      }

      // Bên tấn công tự chọn thời điểm và vị trí cắt bom (attacker_picks_time @ 447.50)
      const bayOpen =
        t >= CUE.attacker_picks_time && t < strikeHitT + 0.6
          ? A.sm(t, CUE.attacker_picks_time, CUE.attacker_picks_time + 0.7)
          : 0;
      const dropStart = 448.2;
      if (t >= dropStart && t <= strikeHitT) {
        const bP = A.ei(t, dropStart, strikeHitT);
        const bx = A.lerp(180, targetX, bP);
        const by = A.lerp(jetY + 24, 200, bP);
        A.line(c, [[180, jetY + 24], [bx, by]], P.olive, A.px(c, 3), [A.px(c, 8), A.px(c, 6)]);
        A.rrect(c, bx - 22, by - 7, 44, 14, 5, P.amber, P.ink, A.px(c, 2.5));
      }

      if (t >= strikeHitT) {
        if (t <= strikeHitT + 1.3) {
          FX.explosion(c, targetX, 205, 125, (t - strikeHitT) / 1.1);
        }
        FX.smoke(c, targetX, 190, t - strikeHitT, 1.35, 8, P.dark);
      }

      drawStealthDiamond(c, jetX, jetY, 1.38, 'side', {
        dir: 1,
        bayOpen,
      });
      K.end(c);
      return;
    }

    // ── CẢNH 5.4 (459.98 – 479.53s): Trở lại Hình Kim Cương & Tiếng vọng Quá muộn ─
    const T_FINAL_WIDE = 471.2;

    if (t < T_FINAL_WIDE) {
      // Giai đoạn A (459.98 – 471.20s): Tổng kết 5 bộ phận trên mặt cắt F-117 & rút ngắn thời gian địch
      const cam: K.Cam = { x: 0, y: 0, z: 0.98 };
      A.clear(c, P.bg);
      K.begin(c, cam);
      drawTechBg(c, cam);

      // Gợi lại máy tính thập niên 1970 ở góc trái (return_to_diamond @ 459.98)
      const pComp = A.sm(t, CUE.return_to_diamond, CUE.return_to_diamond + 0.9);
      A.withA(c, pComp, () => {
        drawComputer1970s(c, -540, -15, 1.02, { tapeAngle: t * 2.4, overload: 0.25 });
      });

      // Lần lượt làm sáng 5 thành phần theo lời đọc (every_part_list @ 463.52)
      const p1Panels = A.sm(t, 463.3, 464.3); // the angled panels
      const p2Bay = A.sm(t, 464.5, 465.5); // the internal bay
      const p3Inlet = A.sm(t, 465.7, 466.7); // the S-shaped inlet
      const p4Paint = A.sm(t, 466.9, 467.9); // the absorbent paint
      const p5Silence = A.sm(t, 468.0, 469.0); // the electronic silence

      const jetX = 110;
      const jetY = -45;
      drawStealthDiamond(c, jetX, jetY, 1.62, 'cutaway', {
        dir: 1,
        showParallelAngles: p1Panels > 0.2,
        bayOpen: p2Bay,
        highlightSDuct: p3Inlet,
        highlightExhaust: p4Paint,
        highlightCockpit: p5Silence,
        fanPhase: t * 8,
      });

      // 5 chấm đèn chỉ thị bộ phận sáng lên tuần tự quanh thân máy bay
      const markers: { p: number; pt: A.Pt; anchor: A.Pt; col: string }[] = [
        { p: p1Panels, pt: [jetX + 165, jetY - 175], anchor: [jetX + 130, jetY - 62], col: P.amber },
        { p: p2Bay, pt: [jetX - 35, jetY + 165], anchor: [jetX - 35, jetY + 25], col: P.oliveLight },
        { p: p3Inlet, pt: [jetX + 48, jetY - 175], anchor: [jetX + 48, jetY - 30], col: P.sky },
        { p: p4Paint, pt: [jetX - 255, jetY - 155], anchor: [jetX - 225, jetY - 20], col: P.amber },
        { p: p5Silence, pt: [jetX + 335, jetY - 115], anchor: [jetX + 295, jetY + 8], col: P.oliveLight },
      ];
      for (let i = 0; i < markers.length; i++) {
        const m = markers[i]!;
        if (m.p > 0.05) {
          A.withA(c, m.p, () => {
            A.line(c, [m.pt, m.anchor], m.col, A.px(c, 3.5));
            A.circle(c, m.pt[0], m.pt[1], 22, m.col, P.ink, A.px(c, 2.8));
            U.label(c, `${i + 1}`, m.pt[0], m.pt[1], 20, P.ink, 1, 'center');
          });
        }
      }

      // Thanh thời gian phản ứng của đối phương bị rút cạn (take_time_away @ 468.86)
      const pDrain = A.sm(t, CUE.take_time_away - 0.3, CUE.take_time_away + 1.8);
      if (pDrain > 0) {
        const barW = 540;
        const bx = jetX - barW / 2;
        const by = 215;
        A.rrect(c, bx, by, barW, 32, 8, P.white, P.ink, A.px(c, LINE.outer));
        const fillW = Math.max(20, (barW - 8) * (1 - 0.86 * pDrain));
        A.rrect(c, bx + 4, by + 4, fillW, 24, 6, pDrain > 0.5 ? P.enemy : P.amber, null, 0);
      }
      K.end(c);
      return;
    }

    // Giai đoạn B (471.20 – 479.53s): Cảnh kết phim — Máy bay đã bay qua trước khi tiếng vọng kịp chạm về đài radar
    const cam: K.Cam = { x: 40, y: -30, z: 0.96 };
    A.clear(c, P.bg);
    K.begin(c, cam);
    drawSkyGroundBg(c, cam, { groundY: 260 });

    const radarX = 160;
    const radarY = 260;

    // Máy bay tàng hình bay vọt qua bên phải và giữ vị trí kết phim trang trọng (478.0 – 479.53s)
    const flyOutP = A.eo(t, T_FINAL_WIDE, 477.8);
    const jetX = A.lerp(20, 440, flyOutP);
    const jetY = -150;

    // Tia sóng phát lên đã trượt qua phía sau đuôi máy bay
    const pIncident = A.sm(t, T_FINAL_WIDE + 0.3, T_FINAL_WIDE + 2.2);
    if (pIncident > 0 && t < CUE.arrive_too_late) {
      drawRadarWave(c, [radarX - 24, radarY - 125], [140, jetY], pIncident, {
        color: P.sky,
        w: A.px(c, 4),
      });
      // Tia phản xạ chính bị bẻ chệch lên trời trống
      if (pIncident > 0.7) {
        drawRadarWave(c, [140, jetY], [-40, -340], (pIncident - 0.7) / 0.3, {
          color: P.amber,
          w: A.px(c, 4),
        });
      }
    }

    // Xung phản xạ yếu ớt về đến đài radar quá muộn (arrive_too_late @ 477.24)
    const pLateEcho = A.ph(t, 474.0, CUE.arrive_too_late);
    if (pLateEcho > 0) {
      drawRadarWave(c, [180, jetY + 12], [radarX - 22, radarY - 122], pLateEcho, {
        color: P.enemy,
        w: A.px(c, 3),
        dashed: true,
      });
    }

    const lateAlert = t >= CUE.arrive_too_late ? 1 : 0;
    drawRadarStation(c, radarX, radarY, 1.32, 'side', {
      dishAngle: -0.25,
      alert: lateAlert,
    });

    // Vòng báo động muộn màng dưới đất khi máy bay đã đi xa ở góc phải trên
    if (t >= CUE.arrive_too_late) {
      A.circle(c, radarX - 22, radarY - 122, 48, 'rgba(180,73,60,0.22)', P.enemy, A.px(c, 3));
    }

    drawStealthDiamond(c, jetX, jetY, 1.42, 'side', { dir: 1 });
    K.end(c);
  }
}
