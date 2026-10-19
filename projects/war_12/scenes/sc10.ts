import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawEarthSpaceBg,
  drawMobileTEL,
  drawICBM,
  drawSpaceDebrisItem,
  drawHGV,
  drawIRSatellite,
  drawEarlyWarningRadar,
  drawInterceptorSilo,
  drawTerminalBattery,
  drawTargetCluster,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';
import { WORLD_SIDE } from './_state';

/**
 * sc10 (381.40 – 426.88s): Thử nghiệm (Trial) vs Thực chiến (War) & Bản chất Mạng cảm biến + Kho đạn hữu hạn.
 * - Phần A (381.40 – 408.26s, góc nhìn từ trên xuống `top`):
 *   + Đối chiếu hai khung: Bên trái (Thử nghiệm / Trial) có giờ phóng biết trước, điểm phóng biết trước, đường bay 1 mục tiêu chuẩn bị sẵn;
 *     Bên phải (Thực chiến / War) phóng bất ngờ từ nhiều nơi, kèm mồi bẫy và cơ động để đánh bại hệ thống.
 *   + Phía dưới là dãy 8 ô kết quả thử nghiệm công khai (`Public test records`) xen kẽ cả thành công (tích xanh) lẫn thất bại (dấu X đỏ).
 * - Phần B (408.26 – 426.88s, góc nhìn ngang `side`):
 *   + Bác bỏ quan niệm "chiếc khiên hoàn hảo hoặc vô dụng" (vòm khiên cứng bị gạch bỏ).
 *   + Hiện rõ bản chất thực: Mạng cảm biến (`IRSatellite` + `EarlyWarningRadar`) nối với các kho đạn hữu hạn (`InterceptorSilo` + `TerminalBattery`),
 *     làm nghiêng thanh xác suất về phía có lợi cho bên phòng thủ trước một số lượng đạn tấn công nhất định.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.c5_easy_to_get_wrong) {
      this.drawTrialVsWarTop(c, t);
    } else {
      this.drawNotAShieldSide(c, t);
    }
  }

  private drawTrialVsWarTop(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    // Hai bảng bản đồ `top` đặt cạnh nhau: Trái = TRIAL (Thử nghiệm), Phải = WAR (Thực chiến)
    const warIn = A.sm(t, CUE.c5_in_war_none_holds - 0.5, CUE.c5_in_war_none_holds + 1.2);

    // ── Khung Trái: Bắn thử nghiệm (Known Time, Known Place, Expected Target) ──
    A.rrect(c, -860, -440, 810, 620, 16, P.paper, P.oliveDark, o);
    // Lưới tọa độ chuẩn bị sẵn trong trường bắn thử nghiệm
    for (let gx = -760; gx <= -160; gx += 120) {
      A.line(
        c,
        [
          [gx, -420],
          [gx, 160],
        ],
        P.bg2,
        inn * 0.8
      );
    }
    for (let gy = -340; gy <= 80; gy += 120) {
      A.line(
        c,
        [
          [-840, gy],
          [-70, gy],
        ],
        P.bg2,
        inn * 0.8
      );
    }

    // Biểu tượng Đồng hồ biết trước giờ phóng ("at a known time")
    A.circle(c, -740, -340, 38, P.white, P.ink, o);
    A.line(
      c,
      [
        [-740, -340],
        [-740, -364],
      ],
      P.ink,
      o
    );
    A.line(
      c,
      [
        [-740, -340],
        [-720, -340],
      ],
      P.amber,
      o
    );

    // Điểm phóng biết trước đóng khung vuông ("from a known place")
    const trialLaunch: A.Pt = [-720, -110];
    U.focus(c, trialLaunch[0] - 65, trialLaunch[1] - 45, 130, 90, A.sm(t, CUE.ch5_start, CUE.c5_in_a_trial + 1.5), P.sky, o);
    c.save();
    c.translate(trialLaunch[0], trialLaunch[1]);
    c.scale(0.65, 0.65);
    drawMobileTEL(c, { view: 'top' });
    c.restore();

    // Radar & Khẩu đội thử nghiệm bên phải khung trái đã ngắm sẵn đường bay dự kiến
    const trialBat: A.Pt = [-190, -110];
    A.line(c, [trialLaunch, trialBat], P.sky, inn, [12, 8]);
    c.save();
    c.translate(trialBat[0], trialBat[1]);
    c.scale(0.85, 0.85);
    drawEarlyWarningRadar(c, { view: 'top', faceDir: -1, beamLen: 210 });
    c.restore();

    const trialP = A.sm(t, CUE.c5_in_a_trial + 0.5, CUE.c5_in_war_none_holds - 0.6);
    const trialHitPt: A.Pt = [-380, -110];
    if (trialP < 0.95) {
      const tx = A.lerp(trialLaunch[0], trialHitPt[0], trialP);
      c.save();
      c.translate(tx, -110);
      c.scale(0.85, 0.85);
      drawICBM(c, { view: 'top', thrust: 0.5 });
      c.restore();
      F.straightShot(c, trialBat, trialHitPt, trialP, { color: P.oliveDark, w: o });
    } else {
      F.explosion(c, trialHitPt[0], trialHitPt[1], 65, A.clamp01((t - (CUE.c5_in_war_none_holds - 0.8)) / 1.2), o);
      A.circle(c, trialHitPt[0], trialHitPt[1], 32, '#dcfce7', P.oliveDark, o);
      // Dấu tích xanh (Success in exercise)
      A.line(
        c,
        [
          [trialHitPt[0] - 14, trialHitPt[1] + 2],
          [trialHitPt[0] - 3, trialHitPt[1] + 13],
          [trialHitPt[0] + 16, trialHitPt[1] - 11],
        ],
        P.oliveDark,
        o * 1.3
      );
    }

    // ── Khung Phải: Thực chiến (In War, none of that holds - Unknown time/place, decoys, maneuvering) ──
    A.withA(c, Math.max(0.2, warIn), () => {
      A.rrect(c, 50, -440, 810, 620, 16, '#f7eeec', P.enemy, o);

      const warCity: A.Pt = [720, -120];
      c.save();
      c.translate(warCity[0], warCity[1]);
      c.scale(0.95, 0.95);
      drawTargetCluster(c, 'city', 'top');
      c.restore();

      const warBat: A.Pt = [560, -120];
      c.save();
      c.translate(warBat[0], warBat[1]);
      c.scale(0.85, 0.85);
      drawTerminalBattery(c, { view: 'top', ammoCount: 2, faceDir: -1 });
      c.restore();

      if (warIn > 0.05) {
        const wp = A.sm(t, CUE.c5_in_war_none_holds, CUE.c5_easy_to_get_wrong - 1.0);
        // 3 hướng phóng bất ngờ không báo trước kèm bóng mồi và HGV lượn
        const w1: A.Pt = [A.lerp(140, 520, wp), A.lerp(-340, -180, wp)];
        const w2: A.Pt = [A.lerp(120, 480, wp), A.lerp(-80, -90 + Math.sin(wp * 8) * 55, wp)];
        const w3: A.Pt = [A.lerp(160, 540, wp), A.lerp(90, -40, wp)];

        A.line(c, [[140, -340], w1], P.enemy, o);
        A.line(c, [[120, -80], w2], P.enemy, o, [12, 8]);
        A.line(c, [[160, 90], w3], P.enemy, o);

        c.save();
        c.translate(w1[0], w1[1]);
        c.rotate(0.4);
        c.scale(0.8, 0.8);
        drawICBM(c, { view: 'top', thrust: 0 });
        c.restore();

        c.save();
        c.translate(w2[0], w2[1]);
        c.scale(0.9, 0.9);
        drawHGV(c, { view: 'top', shockwave: true });
        c.restore();

        c.save();
        c.translate(w3[0], w3[1]);
        c.rotate(-0.35);
        c.scale(0.8, 0.8);
        drawICBM(c, { view: 'top', thrust: 0 });
        c.restore();

        // Các bóng mồi bay kèm làm nhiễu
        for (const [dx, dy] of [
          [-45, -28],
          [-35, 32],
          [-70, 12],
        ] as const) {
          c.save();
          c.translate(w1[0] + dx, w1[1] + dy);
          c.scale(0.8, 0.8);
          drawSpaceDebrisItem(c, 'balloonCone');
          c.restore();
        }
      }
    });

    // ── Bảng dưới: Hồ sơ thử nghiệm hỗn hợp ("Public test records... mixed, with successes and failures") ──
    const recP = A.sm(t, CUE.c5_public_records_mixed - 0.4, CUE.c5_shown_can_work);
    if (recP > 0) {
      A.withA(c, recP, () => {
        A.rrect(c, -860, 220, 1720, 210, 16, P.paper, P.ink, o);
        const results = [true, false, true, true, false, true, false, true];
        const revealed = Math.floor(A.lerp(1, 8.9, recP));
        for (let i = 0; i < 8; i++) {
          const bx = -760 + i * 200;
          const by = 255;
          const ok = results[i]!;
          const show = i < revealed;
          A.rrect(
            c,
            bx,
            by,
            145,
            140,
            12,
            !show ? P.bg2 : ok ? '#e6f4ea' : '#fce8e6',
            !show ? P.slate : ok ? P.oliveDark : P.enemy,
            o
          );
          if (show) {
            if (ok) {
              A.line(
                c,
                [
                  [bx + 42, by + 72],
                  [bx + 64, by + 96],
                  [bx + 106, by + 46],
                ],
                P.oliveDark,
                o * 1.6
              );
            } else {
              U.xMark(c, bx + 72, by + 70, 28, 1, P.enemy, o * 1.6);
            }
          }
        }
      });
    }

    K.end(c);
  }

  private drawNotAShieldSide(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 80, y: 20, z: 0.96 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    const groundY = WORLD_SIDE.groundY;
    const karmanY = WORLD_SIDE.karmanY;
    drawEarthSpaceBg(c, {
      groundY,
      karmanY,
      showContinents: false,
    });
    c.fillStyle = P.bg2;
    c.fillRect(-1600, groundY, 3200, 500);
    A.line(
      c,
      [
        [-1600, groundY],
        [1600, groundY],
      ],
      P.ink,
      o
    );

    const cityX = 620;
    c.save();
    c.translate(cityX, groundY);
    c.scale(1.15, 1.15);
    drawTargetCluster(c, 'city', 'side');
    c.restore();

    // 1. (408.26 – 416.70s): Hình ảnh "Chiếc khiên vòm cứng tuyệt đối" bị bác bỏ ("discussed as a shield, either perfect or useless. It is neither.")
    const shieldAlpha = A.win(t, CUE.c5_easy_to_get_wrong, CUE.c5_sensor_limited_magazines + 0.8, 0.4, 0.6);
    if (shieldAlpha > 0) {
      const rejectP = A.sm(t, CUE.c5_shield_neither + 2.2, CUE.c5_sensor_limited_magazines);
      A.withA(c, shieldAlpha, () => {
        c.beginPath();
        c.arc(cityX - 80, groundY, 460, Math.PI, 0);
        c.strokeStyle = P.slate;
        c.lineWidth = o * 4.5;
        c.stroke();
        if (rejectP > 0) {
          U.xMark(c, cityX - 80, groundY - 260, 95, rejectP, P.enemy, o * 2.2);
        }
      });
    }

    // 2. (415.80 – 426.88s): Bản chất thật — "It is a sensor network and a set of limited magazines, which tilts the odds in the defender's favor"
    const netP = A.sm(t, CUE.c5_sensor_limited_magazines - 0.5, CUE.c5_sensor_limited_magazines + 1.8);
    if (netP > 0) {
      A.withA(c, netP, () => {
        const satPos: A.Pt = [-240, -290];
        const radarPos: A.Pt = [40, groundY];
        const siloPos: A.Pt = [250, groundY];
        const batPos: A.Pt = [430, groundY];

        // Vệ tinh + Radar nối mạng dây tín hiệu (`Sensor Network`)
        c.save();
        c.translate(satPos[0], satPos[1]);
        c.scale(1.1, 1.1);
        drawIRSatellite(c, { view: 'side' });
        c.restore();

        c.save();
        c.translate(radarPos[0], radarPos[1]);
        c.scale(0.85, 0.85);
        drawEarlyWarningRadar(c, { view: 'side', faceDir: -1, beamLen: 420, beamAngle: -2.35 });
        c.restore();

        // Kho đạn giới hạn (`Limited Magazines`: Giếng phóng + Khẩu đội đạn hiển thị rõ số đạn hữu hạn)
        c.save();
        c.translate(siloPos[0], siloPos[1]);
        c.scale(0.85, 0.85);
        drawInterceptorSilo(c, { open: 1, hasBooster: true });
        c.restore();

        c.save();
        c.translate(batPos[0], batPos[1]);
        c.scale(1.05, 1.05);
        drawTerminalBattery(c, { view: 'side', ammoCount: 3, faceDir: -1 });
        c.restore();

        // Đường mạng liên kết giữa các cảm biến và kho đạn
        U.dashed(c, [satPos[0] + 35, satPos[1] + 40], [radarPos[0], radarPos[1] - 110], P.sky, o, t * 90);
        U.dashed(c, [radarPos[0] + 55, radarPos[1] - 40], [siloPos[0], siloPos[1] - 20], P.sky, o, t * 90);
        U.dashed(c, [siloPos[0] + 30, siloPos[1] - 20], [batPos[0] - 40, batPos[1] - 20], P.sky, o, t * 90);

        // Cán cân xác suất ở phía trên nghiêng dần về phía bên phòng thủ ("tilts the odds in the defender's favor")
        const tilt = A.eio(t, CUE.c5_sensor_limited_magazines + 1.5, CUE.c5_mind_of_attacker);
        const beamAng = A.lerp(-0.18, 0.22, tilt);
        const pivotX = 120,
          pivotY = -180;

        A.poly(
          c,
          [
            [pivotX, pivotY],
            [pivotX - 28, pivotY + 52],
            [pivotX + 28, pivotY + 52],
          ],
          P.dark,
          P.ink,
          o
        );

        c.save();
        c.translate(pivotX, pivotY);
        c.rotate(beamAng);
        A.rrect(c, -260, -8, 520, 16, 6, P.paper, P.ink, o);
        // Bên trái cán cân: Số lượng tên lửa tấn công giới hạn (3 quả)
        for (let i = 0; i < 3; i++) {
          c.save();
          c.translate(-220 + i * 42, -38);
          c.rotate(-Math.PI / 2);
          c.scale(0.55, 0.55);
          drawICBM(c, { view: 'side', stage: 'warhead' });
          c.restore();
        }
        // Bên phải cán cân: Cụm cảm biến + đạn đánh chặn làm nặng cán cân về phía bên thủ
        A.rrect(c, 130, -54, 110, 44, 8, P.olive, P.ink, o);
        c.restore();
      });
    }

    K.end(c);
  }
}
