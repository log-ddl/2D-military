import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc14 (364.18–393.14s): Chương 5 (Phần 2) — Cuộc đấu phổ tần số của UAV chiến trường
 * Góc nhìn SIDE tiền duyên:
 * - Người lính lái UAV (bên trái) điều khiển chiếc drone nhỏ trên bầu trời và mang thiết bị bỏ túi cảnh báo nhiễu gần đó.
 * - Người lính đối phương (bên phải) bật hộp gây nhiễu chặn sóng drone và cầm thiết bị dò tìm vị trí người lái UAV đang đứng.
 * - Vũ khí rẻ nhất trên chiến trường và dải phổ tranh chấp khốc liệt nhất là một — phần lớn trận đánh định đoạt trước khi có gì phát nổ.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(
      t,
      [
        [364.18, { x: 0, y: 25, z: 1.14 }],
        [372.84, { x: -15, y: 15, z: 1.16 }],
        [380.14, { x: 0, y: 15, z: 1.12 }],
        [393.14, { x: 0, y: 15, z: 1.12 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawSkyEnv(c, cam, { groundY: 320, hills: true });

    const opPos: A.Pt = [-450, 320];
    const hunterPos: A.Pt = [450, 320];
    const jamBoxPos: A.Pt = [190, 320];
    const dronePos: A.Pt = [
      -20 + Math.sin(t * 1.6) * 40,
      -65 + Math.cos(t * 2.1) * 16,
    ];

    const warnP = A.sm(t, CUE.c5_warns_jamming - 0.6, CUE.c5_warns_jamming + 0.8);
    const seeOpP = A.sm(t, CUE.c5_see_operator - 0.6, CUE.c5_see_operator + 0.8);
    const spectrumFightP = A.sm(t, CUE.c5_cheapest_weapon - 0.3, CUE.c5_cheapest_weapon + 1.0);

    // 1. Đường sóng điều khiển từ tay người lính (trái) lên chiếc UAV
    const controllerTip: A.Pt = [opPos[0] + 76, opPos[1] - 135];
    U.drawSignalLink(c, controllerTip, dronePos, t, {
      color: P.sky,
      mode: 'pulse',
      speed: 2.8,
      progress: 1,
    });

    // 2. Hộp gây nhiễu tiền duyên của địch phát nhiễu chặn đường truyền UAV (368.48s+)
    const jamLinkP = A.sm(t, CUE.c5_drone_link_found, CUE.c5_drone_link_found + 1.0);
    if (jamLinkP > 0.01) {
      U.drawSignalLink(c, [jamBoxPos[0] + 18, jamBoxPos[1] - 110], dronePos, t, {
        color: P.enemy,
        mode: 'noise',
        amp: 12 * jamLinkP,
        speed: 3.4,
        progress: jamLinkP,
      });
    }

    c.save();
    c.translate(jamBoxPos[0], jamBoxPos[1]);
    U.drawLunchboxJammer(c, {
      view: 'side',
      scale: 1.55,
      active: jamLinkP > 0.2,
      showHelmetScale: false,
    });
    c.restore();

    // 3. Tia dò vị trí người lái UAV từ thiết bị của lính địch bên phải ("see where the drone's operator is standing": 377.50s+)
    const hunterAntTip: A.Pt = [hunterPos[0] - 135, hunterPos[1] - 125];
    if (seeOpP > 0.01) {
      A.withA(c, seeOpP, () => {
        A.line(c, [hunterAntTip, controllerTip], P.enemy, lwO, [A.px(c, 12), A.px(c, 8)]);
        // Vòng khóa vị trí dưới chân người lính điều khiển UAV
        A.ellipse(c, opPos[0], opPos[1], 82, 24, 0, 'rgba(180,73,60,0.22)', P.enemy, lwO);
      });
    }

    // 4. Vẽ 2 người lính đối kháng & chiếc UAV trên bầu trời
    c.save();
    c.translate(opPos[0], opPos[1]);
    U.drawSoldierEW(c, {
      scale: 2.15,
      team: 'ally',
      role: 'drone_op',
      facing: 1,
      alert: warnP > 0.3,
    });
    c.restore();

    c.save();
    c.translate(hunterPos[0], hunterPos[1]);
    U.drawSoldierEW(c, {
      scale: 2.15,
      team: 'enemy',
      role: 'df_hunter',
      facing: -1,
      alert: seeOpP > 0.3,
    });
    c.restore();

    c.save();
    c.translate(dronePos[0], dronePos[1]);
    U.drawTacticalDrone(c, {
      view: 'side',
      scale: 2.15,
      spoofed: jamLinkP > 0.5,
    });
    c.restore();

    // 5. Khung phóng đại (Trái): Máy báo nhiễu bỏ túi của người lính lái UAV (372.84s+)
    if (warnP > 0.02) {
      const wx = -460;
      const wy = -95;
      A.withA(c, warnP, () => {
        A.line(c, [[opPos[0] + 30, opPos[1] - 175], [wx, wy + 72]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
        A.rrect(c, wx - 115, wy - 62, 230, 124, 10, P.paper, P.ink, lwO);
        // Thân máy dò phổ cầm tay
        A.rrect(c, wx - 42, wy - 36, 84, 78, 8, P.dark, P.ink, lwO);
        A.line(c, [[wx + 18, wy - 36], [wx + 18, wy - 56]], P.ink, lwO);
        // Đèn và cột sóng báo nhiễu gần đó
        A.rrect(c, wx - 28, wy - 22, 56, 36, 4, P.amber, P.ink, lwI);
        A.circle(c, wx, wy + 26, 7, P.enemy, P.ink, lwI);
      });
    }

    // 6. Khung phóng đại (Phải): Máy dò hướng người lái UAV của lính địch (377.50s+)
    if (seeOpP > 0.02) {
      const dx = 460;
      const dy = -95;
      A.withA(c, seeOpP, () => {
        A.line(c, [hunterAntTip, [dx, dy + 72]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
        A.rrect(c, dx - 115, dy - 62, 230, 124, 10, P.paper, P.ink, lwO);
        // Màn hình la bàn chỉ thẳng góc hướng về vị trí người lính lái UAV bên trái
        A.circle(c, dx, dy, 46, P.bg2, P.ink, lwO);
        A.poly(
          c,
          [
            [dx - 34, dy],
            [dx + 14, dy - 14],
            [dx + 6, dy],
            [dx + 14, dy + 14],
          ],
          P.enemy,
          P.ink,
          lwI
        );
      });
    }

    // 7. Dải Phổ Tần Số Tranh Chấp Khốc Liệt ở giữa ("cheapest weapon... most closely contested portions of the spectrum": 380.14–393.14s)
    if (spectrumFightP > 0.02) {
      const sx = 0;
      const sy = -245;
      const sw = 540;
      const sh = 115;
      A.withA(c, spectrumFightP, () => {
        A.rrect(c, sx - sw / 2 - 5, sy - sh / 2 - 5, sw + 10, sh + 10, 10, P.dark, P.ink, lwO);
        A.rrect(c, sx - sw / 2, sy - sh / 2, sw, sh, 8, P.paper, P.ink, lwI);

        const base = sy + 38;
        const x0 = sx - sw / 2 + 22;
        const x1 = sx + sw / 2 - 22;
        A.line(c, [[x0, base], [x1, base]], P.ink2, lwI);

        // Xung điều khiển UAV nhảy kênh (P.sky) giằng co với các cột nhiễu săn đuổi (P.enemy)
        const hopSlot = Math.floor(t * 4) % 5;
        for (let i = 0; i < 5; i++) {
          const cx = x0 + 48 + i * 98;
          if (i === hopSlot) {
            A.rrect(c, cx - 22, base - 74, 44, 74, 4, P.sky, P.ink, lwO);
          } else if (i === (hopSlot + 4) % 5 || i === (hopSlot + 2) % 5) {
            A.rrect(c, cx - 26, base - 64, 52, 64, 4, 'rgba(180,73,60,0.42)', P.enemy, lwO);
          }
        }
      });
    }

    K.end(c);
  }
}
