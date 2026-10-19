import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawSupportTruck, drawStageBg } from './_assets';
import { CUE } from './_cue';
import { rig } from './shared/rig';

/**
 * sc08 (203.44–226.42s): Vai trò của dải xích (Tracks) — Áp suất mặt đất ngang người đứng, Vượt đồng bùn vs Xe tải lún & Đứt xích (Thrown track).
 * - 203.44–212.50s: Cận cảnh dải xích xe tăng 60 tấn trải rộng lực ép xuống nền đất mềm so với 1 người lính đứng bên cạnh (áp suất mặt đất tương đương nhau, mũi tên lực ngắn đều).
 * - 212.50–219.10s: Toàn cảnh cánh đồng bùn (`mudZone`): Xe tăng lướt qua êm ái trên bề mặt bùn, trong khi chiếc xe tải bánh lốp đi theo bị lún sâu nửa bánh không đi tiếp được.
 * - 219.10–226.42s: Mắt xích xe tăng bị đứt bung ra (`thrown track`): xe khựng lại giữa đồng trống, 2 người lính kíp lái chui ra ngoài sửa xích và lập tức bị khóa trong tâm ngắm đỏ của đối phương.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < 212.5) {
      // Pha 1 (203.44–212.50s): Đối chiếu áp suất mặt đất (Ground pressure): 60 tấn dàn đều trên dải xích dài ≈ áp suất bàn chân 1 người đứng
      const cam: K.Cam = {
        x: 40,
        y: 80,
        z: A.lerp(1.42, 1.28, A.sm(t, 203.44, 212.2)),
      };
      K.begin(c, cam);
      drawStageBg(c, 'field', { groundY: 205, mudZone: true });

      const pressP = A.sm(t, 206.2, 208.5);
      const personP = A.sm(t, 209.5, 211.2);

      // Xe tăng 60 tấn ở bên trái (x = -140, y = 205)
      drawTank(c, {
        x: -140,
        y: 205,
        s: 1.95,
        dir: 1,
        view: 'side',
        hasERA: true,
        wheelPhase: t * 3.0,
      });

      // Vẽ dải phân bố áp suất đều dưới toàn bộ chiều dài xích (12 mũi tên ngắn bằng nhau)
      if (pressP > 0.01) {
        A.withA(c, pressP, () => {
          A.rrect(c, -565, 205, 850, 26, 6, 'rgba(245, 158, 11, 0.25)', P.amber, lwI);
          for (let i = 0; i < 11; i++) {
            const ax = -520 + i * 76;
            UI.arrow(c, [ax, 198], [ax, 238], { p: pressP, color: P.amber, w: 4, head: 14 });
          }
        });
      }

      // Người lính đứng bên phải (x = 460, y = 205) với cùng độ lún mặt đất và cùng độ dài mũi tên áp suất!
      if (personP > 0.01) {
        A.withA(c, personP, () => {
          rig(c, {
            x: 460,
            y: 205,
            s: 2.05,
            dir: -1,
            skin: 'ally',
            weapon: null,
          });
          A.rrect(c, 420, 205, 80, 26, 6, 'rgba(245, 158, 11, 0.25)', P.amber, lwI);
          UI.arrow(c, [460, 198], [460, 238], { p: personP, color: P.amber, w: 4, head: 14 });
          // Dấu bằng "=" nối giữa vùng áp suất dưới xích và vùng áp suất dưới chân người
          A.line(c, [[335, 212], [375, 212]], P.ink, lwO * 1.3);
          A.line(c, [[335, 224], [375, 224]], P.ink, lwO * 1.3);
        });
      }

      K.end(c);

      const p60 = A.win(t, CUE.ch3_ground_pressure - 0.2, 212.2, 0.25, 0.25);
      if (p60 > 0.01) {
        const pt = K.toScreen(cam, -140, 20);
        UI.callout(c, '60 tons', pt[0], pt[1] - 40, {
          to: [pt[0], pt[1] + 20],
          p: p60,
          color: P.amber,
        });
      }
    } else if (t < CUE.ch3_thrown_track - 0.2) {
      // Pha 2 (212.50–219.16s): Cánh đồng bùn — Xe tăng lướt qua trên mặt bùn, còn xe tải bánh lốp bị bùn nuốt chìm
      const pMud = A.sm(t, 212.5, 218.8);
      const cam: K.Cam = { x: 0, y: 40, z: 1.06 };
      K.begin(c, cam);
      drawStageBg(c, 'field', { groundY: 205, mudZone: true, scrollX: pMud * 220 });

      // Vùng bùn nhão sẫm màu
      A.rrect(c, -860, 202, 1720, 95, 12, '#b39c6d', P.ink2, lwI);

      // Xe tải đi phía sau (bên trái): bánh lốp hẹp tạo mũi tên áp suất rất dài đâm sâu xuống bùn làm xe lún ngập bánh!
      const sink = A.sm(t, 213.5, 216.2) * 38;
      drawSupportTruck(c, -410, 205, 1.45, 'side', 'fuel', 1, sink);
      // Hố bùn trào lên che nửa dưới bánh xe tải và mũi tên áp suất đỏ cắm sâu
      A.rrect(c, -630, 205, 430, 52, 10, '#9c8454', P.ink2, lwI);
      UI.arrow(c, [-470, 185], [-470, 285], { p: A.sm(t, 213.5, 215.5), color: P.enemy, w: 6 });
      UI.arrow(c, [-280, 185], [-280, 285], { p: A.sm(t, 213.5, 215.5), color: P.enemy, w: 6 });

      // Xe tăng phía trước (bên phải) lướt êm qua đồng bùn không hề lún
      const tx = A.lerp(80, 380, pMud);
      drawTank(c, {
        x: tx,
        y: 205,
        s: 1.75,
        dir: 1,
        view: 'side',
        hasERA: true,
        wheelPhase: t * 7.5,
      });

      K.end(c);
    } else {
      // Pha 3 (219.16–226.42s): Đứt xích (Thrown track) — Xe tăng dừng đứng giữa đồng trống, kíp lái phải ra ngoài sửa và thành mục tiêu
      const breakT = CUE.ch3_thrown_track;
      const brkP = A.eo(t, breakT, breakT + 0.8);
      const crewOutP = A.sm(t, 221.8, 223.2);
      const targetLockP = A.sm(t, 223.6, 225.2);

      const camBase: K.Cam = {
        x: A.lerp(120, 160, A.sm(t, 219.16, 226.0)),
        y: 55,
        z: 1.32,
      };
      const cam = K.withShake(camBase, t, [[breakT + 0.1, 16, 0.45]]);

      K.begin(c, cam);
      drawStageBg(c, 'field', { groundY: 205, mudZone: true });

      // Xe tăng khựng lại và nghiêng nhẹ về phía trước khi dải xích đứt tuột ra
      drawTank(c, {
        x: 80,
        y: 205,
        s: 1.95,
        dir: 1,
        view: 'side',
        hasERA: true,
        hullRot: brkP * 0.035,
        brokenTrack: brkP,
        wheelPhase: 0,
      });

      if (t >= breakT && t < breakT + 1.0) {
        FX.sparks(c, 420, 185, (t - breakT) / 1.0, 1.3, 0, Math.PI, 4);
        FX.dust(c, 420, 200, (t - breakT) / 1.0, 1.4);
      }

      // 2 người lính kíp lái chui ra ngoài đứng cạnh bánh xích bị đứt để sửa chữa giữa đồng trống
      if (crewOutP > 0.01) {
        A.withA(c, crewOutP, () => {
          rig(c, {
            x: 360,
            y: 205,
            s: 1.55,
            dir: 1,
            skin: 'ally',
            weapon: null,
            aim: -0.4,
          });
          rig(c, {
            x: 470,
            y: 205,
            s: 1.5,
            dir: -1,
            skin: 'ally',
            weapon: null,
            aim: -0.5,
          });
        });
      }

      // Khi nói "a crew that cannot repair it in the open becomes a target" (223.88–225.96s):
      // Tâm ngắm đỏ của địch khóa thẳng vào chiếc xe bất động và kíp lái đang phơi mình ngoài vỏ giáp
      if (targetLockP > 0.01) {
        UI.focus(c, -280, -65, 820, 290, targetLockP, P.enemy, lwO * 1.2);
        UI.crosshair(c, 415, 130, 85, P.enemy, targetLockP, (t - 223.6) * 0.4);
      }

      K.end(c);
    }
  }
}
