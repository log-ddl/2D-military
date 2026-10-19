import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawStageBg } from './_assets';
import { CUE } from './_cue';
import { rig } from './shared/rig';

/**
 * sc12 (317.90–363.34s): Nghịch lý chiếc xe cháy bên trong nhưng cứu sống kíp lái & Mẹo chiến thuật ẩn thân sau sườn đồi (Hull-down & Gun depression).
 * - 317.90–338.12s:
 *   + 317.90–332.08s: Chiếc xe vừa nổ khoang đạn đuôi nhìn bên ngoài vẫn nguyên vẹn trong khi khoang đạn cháy đen, và 3 người lính kíp lái bước đi rời khỏi xe an toàn ("walked away from the burnt-out turret").
 *   + 332.08–338.12s: Đặt 2 chiếc xe nhìn từ bên ngoài (`side`) cạnh nhau — một chiếc đã bị tiêu diệt bên trong (trái) và một chiếc mà kíp lái đã sống sót (phải) trông giống hệt nhau với người nhìn từ ngoài.
 * - 338.12–363.34s: Góc nhìn ngang địa hình sườn đồi dốc ngược (`ridge`):
 *   + Xe tăng tiến lên nấp sau đỉnh đồi (`hull-down` @344.38s): toàn bộ phần thân xe đắt tiền và khoang máy ẩn dưới đất đá, chỉ lộ đỉnh tháp pháo dày nhất.
 *   + Nòng pháo chúc xuống dưới phương ngang (`gun depression` @351.38s) và khai hỏa lúc 348.2s tiêu diệt mục tiêu phía dưới dốc.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < CUE.ch4_identical_tanks) {
      // Pha 1 (317.90–332.08s): Tấm bung thoát nổ đã làm đúng nhiệm vụ — Khoang đạn cháy đen nhưng vỏ ngoài nguyên vẹn và kíp lái bước đi an toàn
      const cam: K.Cam = {
        x: A.lerp(-40, 120, A.sm(t, 317.9, 331.8)),
        y: 35,
        z: 1.15,
      };
      K.begin(c, cam);
      drawStageBg(c, 'field', { groundY: 205 });

      // Chiếc xe tăng với khoang đuôi bốc khói qua tấm blow-off mở, chuyển dần từ cutaway ra side để thấy bên ngoài vẫn nguyên khối
      const outsideBlend = A.sm(t, 320.5, 323.5);
      drawTank(c, {
        x: -140,
        y: 205,
        s: 2.0,
        dir: 1,
        view: 'cutaway',
        ammoLayout: 'bustle',
        hasERA: true,
        blowOffOpen: 1,
      });
      if (outsideBlend > 0.01) {
        A.withA(c, outsideBlend * 0.85, () => {
          drawTank(c, {
            x: -140,
            y: 205,
            s: 2.0,
            dir: 1,
            view: 'side',
            hasERA: true,
            blowOffOpen: 1,
          });
        });
      }

      // Khói đen bốc lên từ khoang đạn đuôi tháp pháo ("burnt-out turret")
      FX.smoke(c, -355, -55, t - 315.0, 1.45, 7);

      // 3 người lính kíp lái bước đi khỏe mạnh sang bên phải rời khỏi chiếc xe ("the crew walked away from the burnt-out turret")
      const walkP = A.sm(t, 325.2, 331.8);
      if (walkP > 0.01) {
        for (let i = 0; i < 3; i++) {
          const cx = A.lerp(180 + i * 75, 420 + i * 85, walkP);
          rig(c, {
            x: cx,
            y: 205,
            s: 1.45,
            dir: 1,
            skin: 'ally',
            weapon: null,
            walk: t * 7.5 + i * 1.4,
          });
        }
      }

      K.end(c);
    } else if (t < CUE.ch4_turret_trick) {
      // Pha 2 (332.08–338.12s): Hai chiếc xe tăng đặt cạnh nhau nhìn từ bên ngoài trông giống hệt nhau (1 chiếc bị diệt kíp lái vs 1 chiếc kíp lái sống sót)
      const cam: K.Cam = { x: 0, y: 20, z: 1.06 };
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 220 });

      // Chiếc bên trái (-410): Đã bị hủy diệt bên trong (Destroyed)
      A.rrect(c, -780, -180, 720, 430, 14, P.paper, P.ink, lwO);
      drawTank(c, {
        x: -420,
        y: 195,
        s: 1.45,
        dir: 1,
        view: 'side',
        hasERA: true,
      });
      FX.smoke(c, -450, 5, t - 330.0, 1.15, 6);

      // Chiếc bên phải (+410): Đã cứu sống kíp lái nhờ blow-off panel (Survived) — Nhìn ngoài giống hệt!
      A.rrect(c, 60, -180, 720, 430, 14, P.paper, P.ink, lwO);
      drawTank(c, {
        x: 420,
        y: 195,
        s: 1.45,
        dir: 1,
        view: 'side',
        hasERA: true,
      });
      FX.smoke(c, 390, 5, t - 330.0, 1.15, 6);

      // Khi nhìn X-quang thoáng qua ở giây cuối (335.5–337.8s): chiếc trái có dấu X đỏ, chiếc phải có 3 người lính đứng bên cạnh sống sót
      const revealP = A.sm(t, 335.0, 336.4);
      if (revealP > 0.01) {
        UI.xMark(c, -420, -95, 42, revealP, P.enemy, lwO * 1.6);
        UI.circleMark(c, 420, -95, 46, revealP, P.olive, lwO * 1.6);
      }

      K.end(c);
    } else {
      // Pha 3 (338.12–363.34s): Mẹo chiến thuật của tháp pháo xoay & góc hạ nòng — Ẩn thân sau sườn đồi (Hull-down on a reverse slope)
      const fireT = CUE.ch4_hulldown_fire;
      const moveUp = A.sm(t, 338.5, 343.8);
      // Góc hạ nòng chúc xuống sườn đồi bên phải: thân xe nghiêng lên (-0.18 rad), nên gunPitch phải âm (-0.34 rad) để nòng chúc xuống -0.16 rad dưới phương ngang!
      const depP = A.sm(t, 343.5, 347.2);
      const gunPitch = -0.18 - depP * 0.16;

      const camBase: K.Cam = K.track(
        t,
        [
          [338.12, { x: -160, y: 40, z: 1.05 }],
          [344.5, { x: -80, y: 35, z: 1.18 }],
          [355.0, { x: 20, y: 40, z: 1.08 }],
          [363.34, { x: -40, y: 35, z: 1.12 }],
        ],
        A.eio
      );
      const cam = K.withShake(camBase, t, [[fireT, 16, 0.45]]);

      K.begin(c, cam);

      // Vẽ chiếc xe tăng TRƯỚC khi vẽ gờ đất sườn đồi phía trước để thấy rõ sườn đồi che kín toàn bộ thân xe, chỉ lộ đỉnh tháp pháo!
      const tx = A.lerp(-460, -245, moveUp);
      const ty = A.lerp(310, 252, moveUp);
      const rec = A.bump(t, fireT, 0.42);

      const tk = drawTank(c, {
        x: tx,
        y: ty,
        s: 1.85,
        dir: 1,
        view: 'side',
        hasERA: true,
        hullRot: -0.18, // Đứng trên sườn dốc ngược (reverse slope)
        gunPitch: gunPitch, // Chúc nòng xuống dưới phương ngang (-0.16 rad so với mặt đất)
        recoil: rec,
        wheelPhase: moveUp < 0.99 ? t * 5 : 0,
      });

      // Vẽ địa hình sườn đồi (`ridge`) đè lên phần thân dưới của xe tăng, rồi vẽ lại đường nét mờ của thân xe nằm an toàn sau lớp đất đồi!
      drawStageBg(c, 'ridge', { groundY: 200 });

      A.withA(c, 0.35, () => {
        drawTank(c, {
          x: tx,
          y: ty,
          s: 1.85,
          dir: 1,
          view: 'cutaway',
          hasERA: true,
          hullRot: -0.18,
          gunPitch: gunPitch,
          recoil: rec,
        });
      });

      // Chỉ rõ vùng rất hẹp (vài mét vuông đỉnh tháp pháo) lộ ra trước tầm ngắm kẻ địch vs toàn bộ thân xe được che kín
      if (t >= CUE.ch4_hull_down) {
        const hdP = A.sm(t, CUE.ch4_hull_down, CUE.ch4_hull_down + 1.2);
        A.withA(c, hdP, () => {
          // Đường ngắm ngang qua đỉnh đồi (y = 132)
          A.line(c, [[-520, 132], [680, 132]], P.slate, lwI, [14, 10]);
          // Khung hẹp phần đỉnh tháp pháo nhô lên trên đỉnh đồi
          UI.focus(c, tx - 105, 38, 330, 96, hdP, P.amber, lwO);
        });
      }

      // Khi nói "A gun that can depress below the horizontal makes the trick work on a reverse slope" (351.38–355.46s):
      // Vẽ đường chuẩn ngang và đường ngắm chúc xuống sườn đồi từ đúng miệng nòng
      if (t >= CUE.ch4_reverse_slope) {
        const slP = A.sm(t, CUE.ch4_reverse_slope, CUE.ch4_reverse_slope + 1.2);
        A.withA(c, slP, () => {
          A.line(c, [tk.breech, [tk.breech[0] + 480, tk.breech[1]]], P.sky, lwI, [10, 8]);
          UI.dashed(c, tk.muzzle, [620, 265], P.amber, lwO, t * 110);
        });
      }

      // Khai hỏa từ vị trí hull-down lúc 348.2s
      const shotP = A.ph(t, fireT, fireT + 0.55);
      if (shotP > 0 && shotP <= 1) {
        FX.muzzleFlash(c, tk.muzzle[0], tk.muzzle[1], 0.16, A.clamp01(shotP * 2.4), 1.65);
        FX.straightShot(c, tk.muzzle, [620, 265], shotP, { color: P.amber, w: 7 });
      }
      if (t >= fireT + 0.55 && t < fireT + 2.5) {
        FX.explosion(c, 620, 265, 135, A.clamp01((t - (fireT + 0.55)) / 0.7));
      }

      K.end(c);
    }
  }
}
