// scenes/sc03.ts — Chương 3 (129.95 – 200.70s): Tiến hóa bên trong khoang bộ binh — Lỗ bắn, Ghế treo chống mìn & Giỏ tháp pháo.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import { CUE } from './_cue';
import { BOUNDARY } from './_state';
import {
  drawBMP1,
  drawIFV,
  drawFiringPortDetail,
  drawSoldier,
  drawSideGround,
} from './_assets';

export default class Sc03 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── CỤM 3.1 (129.95 – 143.20s): LỖ BẮN SƯỜN TỪ BMP-1 ĐẾN BRADLEY ĐỜI ĐẦU (SIDE CUTAWAY -> SIDE) ──
    if (t < 143.2) {
      const cam = K.track(
        t,
        [
          [129.95, BOUNDARY.ch2_to_ch3.cam],
          [135.4, { x: -95, y: -88, z: 1.88 }],
          [137.0, { x: -60, y: -92, z: 1.78 }],
          [143.2, { x: -60, y: -92, z: 1.78 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawSideGround(c, 0, { hills: false });

      if (t < CUE.ch3_bradley_pistol_ports) {
        // Bắt đầu từ đúng khung hình khoang bộ binh đóng kín của cuối Chương 2, rồi hiện lỗ bắn thời Chiến tranh Lạnh
        const coldWarMorph = A.sm(t, 130.6, 132.0);
        if (coldWarMorph < 0.5) {
          drawIFV(c, 0, 0, {
            view: 'cutaway',
            rampOpen: 0,
            engineHit: 1 - coldWarMorph * 2,
          });
        } else {
          drawBMP1(c, 0, 0, {
            view: 'cutaway',
            wheelRot: (t - 131) * 5,
            firingPorts: A.sm(t, 132.1, 133.0),
          });
        }
      } else {
        // 135.64 – 143.20s: Bradley đời đầu với các lỗ bắn kiểu súng ngắn (pistol style firing ports) dọc thân
        drawIFV(c, 0, 0, {
          view: 'side',
          armorLevel: 0,
          pistolPorts: true,
          wheelRot: t * 3.5,
        });

        // Lửa bắn từ 3 lỗ súng ngắn trên sườn Bradley đời đầu (136.5 – 140.2s)
        if (t < CUE.ch3_trials_killed_idea) {
          for (const [idx, px] of [-185, -135, -85].entries()) {
            const cyc = ((t * 2.5 + idx * 0.33) % 1 + 1) % 1;
            if (cyc < 0.35) {
              F.muzzleFlash(c, px, -118, -0.1, cyc / 0.35, 0.48, 3);
            }
          }
        }

        // Thực chiến và thử nghiệm nhanh chóng bác bỏ ý tưởng (140.40 – 143.00s): 3 dấu X đỏ trên 3 lỗ bắn
        const killP = A.sm(t, CUE.ch3_trials_killed_idea, 141.6);
        if (killP > 0) {
          for (const px of [-185, -135, -85]) {
            U.xMark(c, px, -118, 18, killP, P.enemy, 6);
          }
        }
      }

      K.end(c);
      return;
    }

    // ── CỤM 3.2 (143.20 – 164.90s): CẬN CẢNH MẶT CẮT LỖ BẮN — 3 LÝ DO THẤT BẠI & HÀN KÍN + TREO GIÁP HỘP ──
    if (t < 164.9) {
      const cam = K.track(
        t,
        [
          [143.2, { x: 0, y: 0, z: 1.42 }],
          [154.2, { x: 0, y: 0, z: 1.45 }],
          [164.9, { x: 15, y: 0, z: 1.42 }],
        ],
        A.eio
      );

      // Rung xóc khi xe chạy 30 km/h (143.46 – 148.96s) và khi đạn địch xuyên lỗ bắn (156.5s)
      const isPitching = t >= 143.3 && t < 149.2;
      const pitchShake = isPitching ? Math.sin(t * 22) * 14 : 0;
      const shakenCam = K.withShake(
        { ...cam, y: cam.y + pitchShake },
        t,
        [[156.6, 18, 0.6]]
      );

      K.begin(c, shakenCam);

      const pitchOsc = isPitching ? Math.sin(t * 16) * 0.28 : 0;
      const firingP = A.win(t, CUE.ch3_hot_brass_fumes - 0.3, 154.1, 0.3, 0.3) * ((t - 148.6) * 0.45);
      const enemyHitP = A.ph(t, CUE.ch3_hole_weak_spot + 0.8, 158.6);
      const weldP = A.sm(t, CUE.ch3_weld_shut_modules - 0.2, 162.2);
      const modP = A.sm(t, 162.1, 164.5);

      drawFiringPortDetail(c, 0, 0, {
        pitchOsc,
        firing: firingP,
        enemyHit: enemyHitP,
        weldShut: weldP,
        armorModule: modP,
        scale: 1.0,
      });

      K.end(c);

      // Callout "30 KM/H" khi voice đọc "pitching across a field at 30 km an hour"
      const cal30 = A.win(t, 145.3, 148.8, 0.25, 0.25);
      if (cal30 > 0) {
        const pt = K.toScreen(shakenCam, 0, -134);
        U.callout(c, '30 KM/H', pt[0] + 165, pt[1] - 55, {
          to: pt,
          p: cal30,
          color: P.sky,
        });
      }
      return;
    }

    // ── CỤM 3.3 (164.90 – 185.80s): GÓC NHÌN TỪ ĐUÔI DỌC TRỤC THÂN (REAR CROSS-SECTION) — GHẾ TREO & MÀN HÌNH ẢNH NHIỆT ──
    if (t < 185.8) {
      const cam = K.track(
        t,
        [
          [164.9, { x: 0, y: -155, z: 1.68 }],
          [174.0, { x: 0, y: -145, z: 1.62 }],
          [179.0, { x: 0, y: -175, z: 1.78 }],
          [183.0, { x: 90, y: -155, z: 1.48 }],
          [185.8, { x: 90, y: -155, z: 1.48 }],
        ],
        A.eio
      );

      const mineP = A.ph(t, CUE.ch3_mine_exploding + 0.3, 178.4);
      const shakenCam = K.withShake(cam, t, [[CUE.ch3_mine_exploding + 0.4, 22, 0.75]]);

      K.begin(c, shakenCam);
      A.line(c, [[-1200, 0], [1200, 0]], P.ink, 4);

      const thermalP = A.sm(t, CUE.ch3_bulkhead_screens, 180.4);
      drawIFV(c, 0, 0, {
        view: 'rear',
        armorLevel: 1,
        mineBlast: mineP > 0 && mineP < 1 ? mineP : 0,
        thermalScreen: thermalP,
      });

      // Nhấn khung tiêu điểm vào dây cáp ghế treo từ trần xe (171.0 – 174.5s)
      const seatFocus = A.win(t, 171.0, 174.5, 0.3, 0.3);
      if (seatFocus > 0) {
        U.focus(c, -152, -248, 72, 130, seatFocus, P.amber, 4);
        U.focus(c, 80, -248, 72, 130, seatFocus, P.amber, 4);
      }

      // Khi nhắc "what the commander's thermal camera sees outside. So when the ramp drops, nobody steps out blind" (180.5–185.6s):
      // Hiển thị cửa sổ hình ảnh camera ảnh nhiệt kết nối từ màn hình trong khoang ra mục tiêu bên ngoài!
      const extViewP = A.sm(t, 180.8, 182.2);
      if (extViewP > 0.01) {
        A.withA(c, extViewP, () => {
          // Đường tín hiệu từ kính ngắm ảnh nhiệt trên tháp pháo xuống màn hình vách ngăn và mở ra khung cảnh bên ngoài
          A.line(c, [[-18, -320], [0, -218]], P.sky, 3.5, [8, 6]);
          A.rrect(c, 250, -268, 220, 165, 10, P.dark, P.sky, 4);
          // Mục tiêu phát nhiệt sáng rực bên trong khung ngắm ảnh nhiệt
          A.line(c, [[260, -145], [460, -145]], P.sky, 2);
          drawSoldier(c, 360, -145, {
            view: 'side_crouch',
            team: 'enemy',
            weapon: 'rpg',
            facing: -1,
            scale: 0.9,
          });
          U.crosshair(c, 360, -172, 32, P.amber, 1);
        });
      }

      K.end(c);
      return;
    }

    // ── CỤM 3.4 (185.80 – 200.70s): ĐẾM SỐ LÍNH (6–8 NGƯỜI) & GIỎ THÁP PHÁO ĂN MẤT GIỮA THÂN XE ──
    const isTopPhase = t < 192.8;
    const cam = isTopPhase
      ? K.track(
          t,
          [
            [185.8, { x: -45, y: 0, z: 1.56 }],
            [190.0, { x: -10, y: 0, z: 1.64 }],
            [192.8, { x: -10, y: 0, z: 1.64 }],
          ],
          A.eio
        )
      : K.track(
          t,
          [
            [192.8, { x: -10, y: -95, z: 1.72 }],
            [196.5, BOUNDARY.ch3_to_ch4.cam],
            [200.7, BOUNDARY.ch3_to_ch4.cam],
          ],
          A.eio
        );

    K.begin(c, cam);

    if (isTopPhase) {
      // Góc nhìn từ trên xuống mở nóc (topCutout = 1): thấy rõ 6 mũ lính ở đuôi và chiếc vòng tháp pháo chiếm giữa thân
      drawIFV(c, 0, 0, {
        view: 'top',
        topCutout: 1,
        basketHighlight: A.sm(t, CUE.ch3_middle_of_hull, 192.5),
      });

      // Khung tiêu điểm khoanh vào giữa thân xe khi voice đọc "Where the rest of the room went sits right in the middle of the hull"
      const midFocus = A.win(t, CUE.ch3_middle_of_hull, 192.75, 0.3, 0.2);
      if (midFocus > 0) {
        U.focus(c, -86, -76, 148, 152, midFocus, P.amber, 5);
      }
    } else {
      // 192.80 – 200.70s: Góc nhìn SIDE Cutaway — chiếc giỏ tháp pháo thòng từ trần xuống sàn đè mất chỗ của 3 tay súng!
      drawSideGround(c, 0, { hills: false });

      const basketDrop = A.sm(t, CUE.ch3_turret_basket - 0.2, 196.2);
      drawIFV(c, 0, 0, {
        view: 'cutaway',
        basketHighlight: 1,
      });

      // Hiển thị 3 bóng mờ người lính (missing riflemen) ở khoang giữa bị chiếc giỏ tháp pháo lấn chỗ (195.60 – 200.52s)
      const ghostAlpha = A.win(t, 195.2, 200.4, 0.4, 0.4) * (0.55 + 0.25 * Math.sin(t * 6));
      if (ghostAlpha > 0.01) {
        A.withA(c, ghostAlpha, () => {
          for (const gx of [-22, 18, 56]) {
            drawSoldier(c, gx, -68, {
              view: 'side_seat',
              team: 'ally',
              scale: 0.76,
            });
            U.xMark(c, gx, -96, 14, 1, P.enemy, 4);
          }
        });
      }

      // Khung tiêu điểm quanh giỏ tháp pháo
      U.focus(c, -40, -158, 126, 98, basketDrop, P.amber, 5);
    }

    K.end(c);

    // Callout "6–8 SOLDIERS" khi voice đọc "Six to eight soldiers is a small squad"
    const calSquad = A.win(t, CUE.ch3_notice_head_count + 0.8, 190.2, 0.25, 0.25);
    if (calSquad > 0 && isTopPhase) {
      const pt = K.toScreen(cam, -156, -58);
      U.callout(c, '6–8 SOLDIERS', pt[0], pt[1] - 82, {
        to: pt,
        p: calSquad,
        color: P.ink,
      });
    }
  }
}
