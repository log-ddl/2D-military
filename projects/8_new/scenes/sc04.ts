import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc04 (82.24–113.08s): Hệ thống ngắm bắn hiện đại — Kính ngắm nhiệt (Thermal), Đo xa Laser & Máy tính đường đạn (Ballistic Computer).
 * - 82.24–93.24s: Góc nhìn qua ống ngắm (Sight POV): Màn khói mù che khuất mục tiêu -> bật chế độ ảnh nhiệt lúc 88.18s làm chiếc xe tăng địch hiện rõ rực sáng màu cam giữa màn khói.
 * - 93.24–113.08s: Góc nhìn ngang mặt cắt (Cutaway Side) thấy cả xe ta (trái) và xe mục tiêu ở xa (phải):
 *   + 93.24s: Tia laser đo xa bắn tới mục tiêu và phản hồi cự ly về kính ngắm.
 *   + 98.56s: Dữ liệu cự ly + gió ngang + nhiệt độ nòng pháo truyền vào Máy tính đường đạn -> tự động nâng góc nòng.
 *   + 105.74s: Pháo thủ chỉ việc đặt tâm ngắm và bấm nút -> khai hỏa lúc 110.20s trúng đích lúc 110.75s.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < CUE.ch1_laser) {
      // Pha 1 (82.24–93.24s): Góc nhìn qua kính ngắm pháo thủ (Gunner's Thermal Sight POV)
      const thermP = A.sm(t, CUE.ch1_thermal - 0.3, CUE.ch1_thermal + 1.1);
      // Khi bật thermal, nền chuyển sang xanh đen tối của màn hình ảnh nhiệt, mục tiêu phát nhiệt màu vàng cam rực rỡ
      const bgCol = A.lerpColor(P.bg2, P.dark, thermP);
      A.clear(c, bgCol);

      const cam: K.Cam = { x: 0, y: 15, z: 1.25 };
      K.begin(c, cam);

      // Đường chân trời trong kính ngắm
      A.line(c, [[-960, 120], [960, 120]], thermP > 0.5 ? P.sky : P.ink2, lwI);

      // Khi chưa bật ảnh nhiệt, vẽ xe trước rồi phủ khói dày đè lên; khi bật ảnh nhiệt, bức xạ nhiệt xuyên qua khói nổi bật rõ nét!
      const smokeAlpha = A.lerp(0.92, 0.22, thermP);
      if (thermP > 0.4) {
        A.withA(c, smokeAlpha, () => {
          for (let i = -3; i <= 3; i++) {
            const sx = i * 155 + Math.sin(t * 0.9 + i) * 45;
            const sy = 45 + (i % 2) * 35;
            A.circle(c, sx, sy, 140, P.slate, P.ink2, lwI);
          }
        });
      }

      // Xe tăng mục tiêu ở giữa khung ngắm
      const targetVis = A.lerp(0.14, 1.0, thermP);
      A.withA(c, targetVis, () => {
        if (thermP > 0.25) {
          // Quầng bức xạ nhiệt rực sáng quanh xe mục tiêu
          A.ellipse(c, 0, 50, 340, 125, 0, 'rgba(245, 158, 11, 0.35)', P.amber, lwI);
        }
        drawTank(c, {
          x: 0,
          y: 120,
          s: 1.75,
          dir: -1,
          view: 'side',
          side: 'foe',
          highlightPart: thermP > 0.3 ? 'armor' : 'none',
        });
      });

      if (thermP <= 0.4) {
        A.withA(c, smokeAlpha, () => {
          for (let i = -3; i <= 3; i++) {
            const sx = i * 155 + Math.sin(t * 0.9 + i) * 45;
            const sy = 45 + (i % 2) * 35;
            A.circle(c, sx, sy, 140, P.light, P.slate, lwI);
          }
        });
      }

      K.end(c);

      // Khung viền kính ngắm pháo thủ ở toạ độ màn hình
      c.save();
      c.strokeStyle = thermP > 0.5 ? P.sky : P.ink;
      c.lineWidth = 6;
      c.strokeRect(140, 90, 1640, 900);
      // Thước ngắm chữ thập ở tâm màn hình
      UI.crosshair(c, 960, 495, 105, thermP > 0.5 ? P.amber : P.ink, 0.95);
      c.restore();
    } else {
      // Pha 2 (93.24–113.08s): Chuỗi Kính ngắm – Laser đo xa – Máy tính đường đạn – Góc nâng nòng – Khai hỏa
      const fireT = CUE.ch1_sight_fire;
      const hitT = fireT + 0.55;
      const compP = A.sm(t, CUE.ch1_computer, CUE.ch1_computer + 2.8);
      // Máy tính nâng nhẹ góc nòng pháo lên để bù cự ly và gió
      const gunElev = compP * 0.065;

      const camBase: K.Cam = K.track(
        t,
        [
          [CUE.ch1_laser, { x: 80, y: 15, z: 1.02 }],
          [CUE.ch1_computer, { x: -190, y: -10, z: 1.38 }],
          [104.5, { x: 80, y: 15, z: 1.02 }],
          [113.08, { x: 120, y: 15, z: 1.0 }],
        ],
        A.eio
      );
      const cam = K.withShake(camBase, t, [
        [fireT, 16, 0.45],
        [hitT, 20, 0.65],
      ]);

      K.begin(c, cam);
      drawStageBg(c, 'field', { groundY: 210 });

      const rec = A.bump(t, fireT, 0.42);
      const allyTank = drawTank(c, {
        x: -440,
        y: 210,
        s: 1.75,
        dir: 1,
        view: 'cutaway',
        gunPitch: gunElev,
        recoil: rec,
        highlightPart:
          t < CUE.ch1_computer
            ? 'sight'
            : t < CUE.ch1_point_decide
              ? 'computer'
              : 'breech',
      });

      // Xe tăng địch ở xa bên phải (x = 640, y = 210)
      const hitAge = Math.max(0, t - hitT);
      drawTank(c, {
        x: 640,
        y: 210,
        s: 1.25,
        dir: -1,
        view: 'side',
        side: 'foe',
        burntInside: hitAge > 0.2 ? 1 : 0,
      });

      // 1) Tia laser đo xa (93.24–98.56s): Bắn từ kính ngắm [allyTank.sight] tới mục tiêu và dội ngược về
      const laserOut = A.ph(t, CUE.ch1_laser + 0.2, CUE.ch1_laser + 1.1);
      const laserBack = A.ph(t, CUE.ch1_laser + 1.1, CUE.ch1_laser + 2.0);
      if (t >= CUE.ch1_laser && t < 105.5) {
        const targetPt: A.Pt = [520, 115];
        UI.dashed(c, allyTank.sight, targetPt, P.sky, lwO, t * 140);
        if (laserOut > 0 && laserOut < 1) {
          const lx = A.lerp(allyTank.sight[0], targetPt[0], laserOut);
          const ly = A.lerp(allyTank.sight[1], targetPt[1], laserOut);
          A.circle(c, lx, ly, 10, P.sky, P.white, lwI);
        }
        if (laserBack > 0 && laserBack < 1) {
          const lx = A.lerp(targetPt[0], allyTank.sight[0], laserBack);
          const ly = A.lerp(targetPt[1], allyTank.sight[1], laserBack);
          A.circle(c, lx, ly, 10, P.amber, P.white, lwI);
        }
      }

      // 2) Khi máy tính đường đạn xử lý gió + nhiệt độ nòng (98.56–105.5s):
      // Vẽ biểu tượng luồng gió ngang trên cao và cung góc nâng nòng tại đầu pháo
      if (t >= CUE.ch1_computer && t < 105.5) {
        const wP = A.sm(t, CUE.ch1_computer, CUE.ch1_computer + 1.2);
        A.withA(c, wP, () => {
          // Các đường gió thổi trên không trung
          for (let i = 0; i < 3; i++) {
            const wy = -165 + i * 28;
            const wx = -260 + i * 45;
            UI.arrow(c, [wx, wy], [wx + 120, wy], { p: wP, color: P.sky, w: 4 });
          }
          // Đường truyền tín hiệu từ Kính ngắm -> Máy tính -> Khóa nòng
          A.line(
            c,
            [
              allyTank.sight,
              [allyTank.sight[0] - 42, allyTank.sight[1] + 34],
              allyTank.breech,
            ],
            P.sky,
            lwO
          );
          // Cung chỉ góc nâng nòng pháo ở phía trước mũi nòng
          A.line(
            c,
            [
              [allyTank.breech[0], allyTank.breech[1]],
              [allyTank.muzzle[0] + 140, allyTank.breech[1]],
            ],
            P.slate,
            lwI,
            [10, 8]
          );
          A.line(
            c,
            [allyTank.breech, [allyTank.muzzle[0] + 140, allyTank.muzzle[1] - 12]],
            P.amber,
            lwO
          );
        });
      }

      // 3) Lúc 105.74s ("They put the mark on the target, press the laser..."):
      // Khoá mục tiêu bằng tâm ngắm trên xe địch rồi khai hỏa lúc 110.20s
      if (t >= CUE.ch1_point_decide) {
        const lockP = A.sm(t, CUE.ch1_point_decide, CUE.ch1_point_decide + 0.9);
        UI.focus(c, 495, 45, 290, 175, lockP, P.amber, lwO);
      }

      const shotP = A.ph(t, fireT, hitT);
      if (shotP > 0 && shotP <= 1) {
        FX.muzzleFlash(
          c,
          allyTank.muzzle[0],
          allyTank.muzzle[1],
          -gunElev,
          A.clamp01(shotP * 2.5),
          1.7
        );
        FX.arcShot(c, allyTank.muzzle, [560, 125], shotP, 28, {
          color: P.amber,
          w: 6,
        });
      }

      if (hitAge > 0) {
        FX.explosion(c, 560, 125, 165, A.clamp01(hitAge / 0.8));
        FX.smoke(c, 580, 110, hitAge, 1.5, 7);
        FX.fire(c, 565, 130, hitAge, 1.3);
      }

      K.end(c);
    }
  }
}
