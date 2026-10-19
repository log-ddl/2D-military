import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc04 (77.70–108.08s): Vật lý khắc nghiệt của tiếng vọng — Định luật suy hao lũy thừa 4 (1/R^4),
 * gấp đôi cự ly tiếng vọng yếu đi 16 lần, giải thích vì sao radar tầm xa phải khổng lồ.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam = K.track(
      t,
      [
        [CUE.ch2_start, { x: -10, y: 20, z: 1.12 }],
        [CUE.ch2_fourth_power, { x: 20, y: 35, z: 1.04 }],
        [CUE.ch2_enormous + 1.5, { x: -40, y: 15, z: 0.98 }],
      ],
      A.eio
    );
    K.begin(c, cam);

    const groundY = 220;
    M.drawSideTerrain(c, -1200, 1200, groundY);

    const rx = -560;
    const txX = rx + 48, txY = groundY - 108;

    // Hai mốc cự ly R (x = 20) và 2R (x = 580)
    const r1X = 20, r1Y = -65;
    const r2X = 580, r2Y = -175;
    const showDouble = A.eio(t, CUE.ch2_double_range - 0.6, CUE.ch2_double_range + 0.8);
    const jx = A.lerp(r1X, r2X, showDouble);
    const jy = A.lerp(r1Y, r2Y, showDouble);

    const ang = Math.atan2(jy - txY, jx - txX);
    const dist = Math.hypot(jx - txX, jy - txY);

    // 1) Hình nón mặt cầu mở rộng khi sóng phát đi (hiện ngay từ đầu cảnh 77.70s và mở rộng mạnh ở 81.28s)
    const coneOutA = A.lerp(0.55, 1.0, A.sm(t, CUE.ch2_start, CUE.ch2_widening_sphere));
    if (coneOutA > 0.01) {
      A.withA(c, coneOutA * 0.18, () => {
        c.beginPath();
        c.moveTo(txX, txY);
        c.arc(txX, txY, dist, ang - 0.36, ang + 0.36);
        c.closePath();
        A.fs(c, P.amber, null, 0);
      });
      // Biên trên/dưới của chùm tia mở rộng
      A.line(
        c,
        [
          [txX, txY],
          [txX + Math.cos(ang - 0.36) * dist, txY + Math.sin(ang - 0.36) * dist],
        ],
        P.amber,
        M.lwI(c),
        [10, 8]
      );
      A.line(
        c,
        [
          [txX, txY],
          [txX + Math.cos(ang + 0.36) * dist, txY + Math.sin(ang + 0.36) * dist],
        ],
        P.amber,
        M.lwI(c),
        [10, 8]
      );

      // Các vòm sóng phát đi mở rộng dần và mỏng dần
      for (let i = 1; i <= 4; i++) {
        const u = ((t - CUE.ch2_start) * 0.45 + i * 0.25) % 1;
        const r = A.lerp(60, dist - 40, u);
        M.drawWaveArc(c, txX, txY, r, ang, 0.72, P.amber, (1 - u * 0.65) * coneOutA, A.lerp(7, 2.5, u));
      }
    }

    // 2) Phần nhỏ chạm máy bay lại tỏa rộng lần thứ 2 khi quay về ("spreads out again as it returns" @ 85.84s)
    const coneRetA = A.sm(t, CUE.ch2_returns - 0.5, CUE.ch2_returns + 0.8);
    if (coneRetA > 0.01) {
      const noseX = jx - 95, noseY = jy;
      const retAng = ang + Math.PI;
      A.withA(c, coneRetA * 0.16, () => {
        c.beginPath();
        c.moveTo(noseX, noseY);
        c.arc(noseX, noseY, dist, retAng - 0.34, retAng + 0.34);
        c.closePath();
        A.fs(c, P.sky, null, 0);
      });
      for (let i = 1; i <= 3; i++) {
        const u = ((t - CUE.ch2_returns) * 0.45 + i * 0.33) % 1;
        const r = A.lerp(45, dist - 45, u);
        M.drawWaveArc(c, noseX, noseY, r, retAng, 0.68, P.sky, (1 - u * 0.78) * coneRetA, A.lerp(4, 1.4, u));
      }
    }

    // 3) Hai lưới 16 ô (drawPowerGrid16) đối chiếu trực quan cự ly 1x (16/16) vs cự ly 2x (1/16)
    const gridA = A.sm(t, CUE.ch2_fourth_power - 0.2, CUE.ch2_fourth_power + 0.9);
    if (gridA > 0.01) {
      A.withA(c, gridA, () => {
        // Cột mốc cự ly 1x (R)
        A.line(c, [[r1X, groundY], [r1X, r1Y + 40]], P.ink2, M.lwI(c), [8, 8]);
        M.drawPowerGrid16(c, r1X, groundY + 105, 136, { highlightSingle: false });

        // Cột mốc cự ly 2x (2R) khi tăng gấp đôi tầm
        if (showDouble > 0.02) {
          A.withA(c, showDouble, () => {
            A.line(c, [[r2X, groundY], [r2X, r2Y + 40]], P.ink2, M.lwI(c), [8, 8]);
            M.drawPowerGrid16(c, r2X, groundY + 105, 136, { highlightSingle: true });
            // Đường thước đo so sánh R và 2R
            A.line(c, [[rx, groundY + 22], [r1X, groundY + 22]], P.amber, M.lwO(c));
            A.line(c, [[r1X, groundY + 22], [r2X, groundY + 22]], P.sky, M.lwO(c));
          });
        }
      });
    }

    // 4) Từ 101.78s ("why long-range radars are enormous"): Đài cảnh báo sớm cỡ tòa nhà vươn lên cạnh đài nhỏ
    const bigRadarA = A.sm(t, CUE.ch2_enormous - 0.3, CUE.ch2_enormous + 1.0);
    if (bigRadarA > 0.01) {
      A.withA(c, bigRadarA, () => {
        M.drawEarlyWarningRadar(c, rx - 210, groundY, 'side', {
          scale: 1.25 * A.eo(t, CUE.ch2_enormous - 0.3, CUE.ch2_enormous + 0.9),
          active: true,
        });
      });
    }

    // Chủ thể chính: Đài groundRadar (phóng lớn buồng phát khi nói "16 times more powerful" @ 98.74s) và máy bay
    const pBoost = 1 + 0.35 * A.bump(t, CUE.ch2_num_16_powerful - 0.8, 3.2);
    M.drawGroundRadar(c, rx, groundY, 'side', {
      scale: 1.55,
      dishAngle: ang,
      active: true,
      powerScale: pBoost,
    });

    // Giữ bóng mờ ở vị trí 1x khi máy bay lùi ra 2x để mắt người xem đọc rõ khoảng cách tăng gấp đôi
    if (showDouble > 0.05) {
      A.withA(c, 0.28 * showDouble, () => {
        M.drawIntruderJet(c, r1X, r1Y, 'side', { scale: 1.38 });
      });
    }
    M.drawIntruderJet(c, jx, jy, 'side', { scale: 1.38 });

    K.end(c);

    // Callout số 16 khớp đúng giọng đọc ("16 times fainter" @ 95.02s & "16 times more powerful" @ 98.74s)
    const a16Faint = A.win(t, CUE.ch2_double_range + 0.5, CUE.ch2_enormous + 0.2, 0.35, 0.35);
    if (a16Faint > 0.01) {
      M.drawCallout(c, 1480, 620, '2× range  →  1/16 echo', {
        anchorScreen: K.toScreen(cam, r2X, groundY + 40),
        accent: P.sky,
        alpha: a16Faint,
      });
    }

    const a16Power = A.win(t, CUE.ch2_num_16_powerful - 0.6, CUE.ch2_enormous + 1.5, 0.35, 0.35);
    if (a16Power > 0.01) {
      M.drawCallout(c, 420, 410, '16× power', {
        anchorScreen: K.toScreen(cam, rx, groundY - 70),
        accent: P.amber,
        alpha: a16Power,
      });
    }
  }
}
