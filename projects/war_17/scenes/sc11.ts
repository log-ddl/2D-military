// sc11.ts — Chương 4 (275.20–304.00s): Sự thay đổi cách tự vệ trên nóc xe (Up on the roof):
// 1) 275.20–288.10s: Suốt nhiều thập kỷ, xạ thủ súng máy phải đứng trong ô cửa mở sau tấm khiên thép nhỏ,
//    lộ toàn bộ từ ngực trở lên trước lính bắn tỉa và đạn nổ chụp.
// 2) 288.26–304.00s: Hầu hết APC hiện đại gắn Trạm vũ khí điều khiển từ xa (RWS) trên nóc —
//    súng máy hạng nặng / súng phóng lựu tự động nằm trong giá ổn định kèm camera nhiệt ngày/đêm,
//    trong khi xạ thủ ngồi khóa kín dưới lớp giáp ngắm bắn trên màn hình bằng joystick.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';
import { stateAt } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    const isModernRWS = t >= CUE.remote_weapon_station - 0.1;

    // Camera: tập trung vào nửa trên và khoang điều khiển của chiếc APC (zoom lớn 1.55–1.72)
    const cam = K.track(
      t,
      [
        [275.2, { x: 20, y: -165, z: 1.55 }],
        [283.0, { x: 25, y: -185, z: 1.68 }],
        [289.5, { x: 20, y: -165, z: 1.58 }],
        [299.5, { x: 5, y: -150, z: 1.68 }],
        [304.0, { x: 10, y: -150, z: 1.62 }],
      ],
      A.eio,
    );

    K.begin(c, cam);
    V.drawSideGround(c, -1200, 1200, 0, 'dirt');

    if (!isModernRWS) {
      // ── GIAI ĐOẠN 1 (275.20 – 288.15s): XẠ THỦ ĐỨNG LỘ THIÊN TRONG Ô CỬA NÓC MỞ ──
      V.drawAPC8x8(c, {
        x: 0,
        y: 0,
        s: 1.25,
        dir: 1,
        view: 'side',
        wheelRot: t * 3.0,
        rwsType: 'openGunner',
        rwsAim: Math.sin(t * 2.2) * 0.12,
      });

      // Vùng cơ thể lộ từ ngực trở lên (Exposed from the chest up: y = -215..-265)
      const expP = A.sm(t, 283.0, 284.2);
      if (expP > 0.01) {
        U.focus(c, -22, -268, 76, 60, expP, P.enemy, 4);
      }

      // Đạn bắn tỉa ngắm thẳng vào xạ thủ (snipers) & Đạn pháo nổ chụp trên đầu (shell bursts @ 286.14s)
      if (t >= 285.2) {
        const snipeP = A.sm(t, 285.2, 286.0);
        A.line(c, [[460, -248], [22, -242]], P.enemy, 3, [10, 8]);
        U.crosshair(c, 16, -242, 28, P.enemy, snipeP, t * 1.5);

        // Quả đạn nổ chụp phía trên nóc xe ở t = 286.3s
        const bAge = t - 286.3;
        if (bAge > 0 && bAge < 2.2) {
          F.explosion(c, 55, -335, 58, A.clamp01(bAge / 0.8), LINE.outer);
          for (let i = -2; i <= 2; i++) {
            A.line(
              c,
              [
                [55, -335],
                [18 + i * 18, A.lerp(-335, -235, A.clamp01(bAge / 0.45))],
              ],
              P.enemy,
              3,
            );
          }
        }
      }

      K.end(c);
      return;
    }

    // ── GIAI ĐOẠN 2 (288.15 – 304.00s): TRẠM VŨ KHÍ ĐIỀU KHIỂN TỪ XA (RWS) + XẠ THỦ TRONG GIÁP ──
    V.drawAPC8x8(c, {
      x: 0,
      y: 0,
      s: 1.25,
      dir: 1,
      view: 'cutaway',
      wheelRot: t * 3.5,
      rwsType: 'rws',
      rwsAim: st.rwsAim,
    });

    // Khung ngắm highlight cụm RWS và camera nhiệt trên nóc (289.0–298.5s)
    const rwsFocus = A.win(t, 289.0, 298.8, 0.35, 0.35);
    if (rwsFocus > 0.01) {
      U.focus(c, -22, -286, 138, 74, rwsFocus, P.sky, 4);
    }

    // Chùm tia quét của Camera nhiệt ngày/đêm (Day and night thermal camera @ 295.68–299.22s)
    const camCone = A.sm(t, 295.4, 296.5);
    if (camCone > 0.01) {
      const rx = 28;
      const ry = -254;
      const aim = -st.rwsAim * 0.8;
      A.withA(c, camCone * 0.22, () => {
        A.poly(
          c,
          [
            [rx, ry],
            [rx + Math.cos(aim - 0.16) * 440, ry + Math.sin(aim - 0.16) * 440],
            [rx + Math.cos(aim + 0.16) * 440, ry + Math.sin(aim + 0.16) * 440],
          ],
          P.sky,
          null,
          0,
        );
      });
      A.line(
        c,
        [
          [rx, ry],
          [rx + Math.cos(aim) * 420, ry + Math.sin(aim) * 420],
        ],
        P.sky,
        2.5,
        [8, 6],
      );
    }

    // Phóng to cửa sổ Màn hình nhiệt + Tay cầm Joystick của xạ thủ ngồi trong giáp (299.38–304.00s)
    const screenPip = A.sm(t, CUE.gunner_locked_inside - 0.2, CUE.gunner_locked_inside + 0.8);
    if (screenPip > 0.01) {
      A.withA(c, screenPip, () => {
        // Đường dẫn nối từ vị trí xạ thủ bên trong giáp (-25, -180) ra bảng cận cảnh bên trái (-295, -245)
        A.line(c, [[-2, -185], [-175, -225]], P.sky, 3, [6, 5]);
        c.save();
        c.translate(-275, -235);
        // Khung màn hình điều khiển của xạ thủ
        A.rrect(c, -105, -78, 210, 146, 10, P.dark, P.ink, LINE.outer);
        A.rrect(c, -92, -66, 184, 104, 6, '#0f293a', P.sky, LINE.inner);
        // Hình ảnh mục tiêu nhiệt + Tâm ngắm xanh trên màn hình
        A.rrect(c, -18, -22, 36, 22, 4, P.amber, null, 0);
        U.crosshair(c, 0, -12, 26, P.sky, 1, 0);
        // Tay cầm Joystick phía dưới màn hình lắc theo góc ngắm
        c.save();
        c.translate(0, 58);
        c.rotate(st.rwsAim * 1.6);
        A.capsule(c, [0, 0], [0, -28], 10, P.slate, P.ink, 2.5);
        A.circle(c, 0, -30, 8, P.enemy, P.ink, 2);
        c.restore();
        c.restore();
      });
    }

    // Trạm RWS khai hỏa loạt súng máy chính xác ở t = 301.4–303.2s trong khi xạ thủ hoàn toàn an toàn bên dưới
    if (t >= 301.4 && t <= 303.2) {
      const muzzleX = 115;
      const muzzleY = -262 - st.rwsAim * 60;
      const fp = ((t - 301.4) * 8) % 1;
      F.muzzleFlash(c, muzzleX, muzzleY, -st.rwsAim, fp, 0.75, 2.5);
      F.tracer(c, [muzzleX, muzzleY], [muzzleX + 380, muzzleY - st.rwsAim * 220], fp, 0.22, P.amber, 5);
    }

    K.end(c);
  }
}
