import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc15 (393.14–414.76s): Chương 6 (Phần 1) — Nghịch lý Mạng lưới & Làm quân địch điếc trong khi quân mình vẫn nghe được
 * Góc nhìn TOP bản đồ mạng lưới chiến trường:
 * - 393.14–402.10s: Mạng lưới thấy mọi thứ cũng là mạng lưới có thể bị làm mù tại một điểm nút trung tâm ("blinded in one place").
 * - 402.10–414.76s: Suốt một thế kỷ, thắng trận là tiêu diệt vật lý quân địch; nay phần lớn nỗ lực là làm quân địch điếc ("making the enemy's army deaf")
 *   và giữ cho quân mình vẫn nghe được ("making sure that yours is still able to hear").
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const camBase = K.track(
      t,
      [
        [393.14, { x: 0, y: 0, z: 1.0 }],
        [402.1, { x: 0, y: 0, z: 0.96 }],
        [414.76, { x: 0, y: 0, z: 0.96 }],
      ],
      A.eio
    );
    const cam = K.withShake(camBase, t, [[403.6, 14, 0.55], [404.4, 16, 0.55]]);

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawMapEnv(c, cam, { roadY: 0, ridge: true });

    const shiftDoctrineP = A.sm(t, CUE.c6_destroy_army - 0.3, CUE.c6_destroy_army + 0.8);

    if (shiftDoctrineP < 0.98) {
      // ── PHA 1 (393.14–402.10s): MẠNG LƯỚI NHÌN THẤY MỌI THỨ BỊ LÀM MÙ TẠI 1 NÚT TRUNG TÂM ──
      const blindHubP = A.sm(t, CUE.c6_blinded_one_place - 0.5, CUE.c6_blinded_one_place + 0.8);
      const hub: A.Pt = [0, 0];
      const nodes: A.Pt[] = [
        [-460, -210],
        [460, -210],
        [-480, 210],
        [480, 210],
      ];

      A.withA(c, 1 - shiftDoctrineP, () => {
        for (const n of nodes) {
          if (blindHubP < 0.5) {
            U.drawSignalLink(c, hub, n, t, {
              color: P.sky,
              mode: 'pulse',
              speed: 2.6,
              progress: 1,
            });
          } else {
            // Đường mạng bị cắt đứt và xám xịt khi nút trung tâm bị đánh mù
            A.line(c, [hub, n], P.light, lwI, [A.px(c, 10), A.px(c, 10)]);
          }
        }

        // Các đơn vị vệ tinh quanh nút mạng
        c.save(); c.translate(nodes[0]![0], nodes[0]![1]); U.drawStrikeJet(c, { view: 'top', scale: 1.05 }); c.restore();
        c.save(); c.translate(nodes[1]![0], nodes[1]![1]); U.drawTacticalDrone(c, { view: 'top', scale: 1.35, spoofed: blindHubP > 0.5 }); c.restore();
        c.save(); c.translate(nodes[2]![0], nodes[2]![1]); U.drawMobileHQ(c, { view: 'top', scale: 1.15, emitting: blindHubP < 0.5 }); c.restore();
        c.save(); c.translate(nodes[3]![0], nodes[3]![1]); U.drawSamRadarSite(c, { view: 'top', scale: 1.15, blinded: blindHubP > 0.5 }); c.restore();

        // Nút trung tâm mạng lưới bị chùm nhiễu khóa mù ("blinded in one place")
        c.save();
        c.translate(hub[0], hub[1]);
        U.drawGroundStation(c, {
          view: 'top',
          scale: 1.35,
          role: 'listener',
          team: 'ally',
          dishAngle: t * 1.5,
          active: blindHubP < 0.5,
        });
        c.restore();

        if (blindHubP > 0.02) {
          A.withA(c, blindHubP, () => {
            A.circle(c, hub[0], hub[1], 86, 'rgba(180,73,60,0.28)', P.enemy, lwO);
            A.line(c, [[-45, -45], [45, 45]], P.enemy, lwO);
            A.line(c, [[45, -45], [-45, 45]], P.enemy, lwO);
          });
        }
      });
    }

    // ── PHA 2 (402.10–414.76s): TỪ TIÊU DIỆT VẬT LÝ -> LÀM QUÂN ĐỊCH ĐIẾC & GIỮ QUÂN TA NGHE ĐƯỢC ──
    if (shiftDoctrineP > 0.02) {
      const deafP = A.sm(t, CUE.c6_enemy_deaf - 0.3, CUE.c6_enemy_deaf + 1.0);
      const hearP = A.sm(t, CUE.c6_yours_hear - 0.6, CUE.c6_yours_hear + 0.8);

      A.withA(c, shiftDoctrineP, () => {
        // Phe Ta (Trái): Liên kết thông suốt bằng sóng xanh P.sky ("making sure that yours is still able to hear")
        const allyHQ: A.Pt = [-520, 120];
        const allyJet: A.Pt = [-380, -160];
        const allyEW: A.Pt = [-180, 20];

        if (hearP > 0.01 || t < CUE.c6_enemy_deaf) {
          U.drawSignalLink(c, allyHQ, allyEW, t, { color: P.sky, mode: 'pulse', speed: 2.5, progress: 1 });
          U.drawSignalLink(c, allyEW, allyJet, t, { color: P.sky, mode: 'pulse', speed: 2.5, progress: 1 });
          for (const ap of [allyHQ, allyJet, allyEW]) {
            A.circle(c, ap[0], ap[1], 72, 'rgba(56,189,248,0.12)', P.sky, lwO);
          }
        }

        c.save(); c.translate(allyHQ[0], allyHQ[1]); U.drawMobileHQ(c, { view: 'top', scale: 1.2, emitting: true }); c.restore();
        c.save(); c.translate(allyJet[0], allyJet[1]); U.drawStrikeJet(c, { view: 'top', scale: 1.1 }); c.restore();
        c.save(); c.translate(allyEW[0], allyEW[1]); U.drawStandoffJammerJet(c, { view: 'top', scale: 1.25, podsActive: deafP > 0.1 }); c.restore();

        // Phe Địch (Phải):
        // Lúc 402.1–405.8s ("destroy the enemy's army"): nổ hỏa lực truyền thống;
        // Lúc 406.06s+ ("making the enemy's army deaf"): xe pháo còn nguyên nhưng bị chùm sóng làm điếc & đứt kết nối hoàn toàn!
        const foe1: A.Pt = [420, -160];
        const foe2: A.Pt = [520, 40];
        const foe3: A.Pt = [380, 210];

        if (deafP > 0.02) {
          for (const fp of [foe1, foe2, foe3]) {
            U.drawSignalLink(c, allyEW, fp, t, {
              color: P.amber,
              mode: 'noise',
              amp: 11,
              speed: 3.2,
              progress: deafP,
            });
            // Vòng sóng của địch bị gạch chéo (Điếc - Deaf)
            A.circle(c, fp[0], fp[1], 70, 'rgba(100,116,139,0.22)', P.slate, lwO);
            A.line(c, [[fp[0] - 42, fp[1] - 42], [fp[0] + 42, fp[1] + 42]], P.enemy, lwO);
          }
        } else {
          // Kết nối cũ trước khi bị làm điếc
          A.line(c, [foe1, foe2], P.enemyLight, lwI, [A.px(c, 8), A.px(c, 8)]);
          A.line(c, [foe2, foe3], P.enemyLight, lwI, [A.px(c, 8), A.px(c, 8)]);
        }

        c.save(); c.translate(foe1[0], foe1[1]); U.drawGroundStation(c, { view: 'top', scale: 1.15, team: 'enemy', active: deafP < 0.3 }); c.restore();
        c.save(); c.translate(foe2[0], foe2[1]); U.drawSamRadarSite(c, { view: 'top', scale: 1.2, blinded: deafP > 0.3 }); c.restore();
        c.save(); c.translate(foe3[0], foe3[1]); U.drawMobileHQ(c, { view: 'top', scale: 1.15, emitting: false, silentGhost: deafP > 0.3 }); c.restore();

        // Minh họa "destroy the enemy's army" ở 403.6s & 404.4s
        U.drawExplosion(c, foe1[0], foe1[1], A.ph(t, 403.5, 404.9), 76);
        U.drawExplosion(c, foe3[0], foe3[1], A.ph(t, 404.3, 405.7), 82);
      });
    }

    K.end(c);
  }
}
