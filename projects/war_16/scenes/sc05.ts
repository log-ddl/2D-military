// scenes/sc05.ts — Chương 5 (289.50 – 398.10s): Cân nặng vs Giáp bảo vệ — BMP-1 13t bơi sông, cửa hậu chứa dầu, Giáp 30-60t, Tháp pháo không người lái & Kéo co nội thất.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { BOUNDARY } from './_state';
import {
  drawBMP1,
  drawIFV,
  drawMBT,
  drawSoldier,
  drawSideGround,
  drawTopMapBase,
} from './_assets';

export default class Sc05 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── CỤM 5.1A (289.50 – 314.60s): TỪ CUỐI CHƯƠNG 4 SANG BMP-1 13–14 TẤN BƠI QUA SÔNG & VỎ THÉP MỎNG BỊ XUYÊN THỦNG ──
    if (t < 314.6) {
      const toRiver = A.sm(t, 293.4, 294.5);
      const cam = K.track(
        t,
        [
          [289.5, BOUNDARY.ch4_to_ch5.cam],
          [293.5, BOUNDARY.ch4_to_ch5.cam],
          [295.0, { x: 0, y: 15, z: 1.32 }],
          [304.0, { x: 0, y: 25, z: 1.48 }],
          [308.5, { x: 80, y: -55, z: 1.48 }],
          [314.6, { x: 80, y: -55, z: 1.48 }],
        ],
        A.eio
      );

      K.begin(c, cam);

      if (toRiver < 0.5) {
        // Bắt đầu khớp 100% với cuối Chương 4: chiếc IFV ở trung tâm bị 3 tâm ngắm đỏ khóa chặt
        drawSideGround(c, 0, { hills: true });
        drawIFV(c, 0, 0, {
          view: 'side',
          atgm: 1,
          armorLevel: 1,
        });
        for (const [lx, ly] of [
          [25, -185],
          [-95, -110],
          [95, -105],
        ] as const) {
          A.line(c, [[680, ly - 35], [lx, ly]], P.enemy, 3, [12, 8]);
          U.crosshair(c, lx, ly, 36, P.enemy, 1 - toRiver * 2, t * 1.2);
        }
      } else {
        // 293.96 – 314.60s: BMP-1 nặng 13–14 tấn tự bơi qua sông rồi lên bờ bị súng máy hạng nặng & RPG bắn xuyên sườn
        const onBankP = A.sm(t, CUE.ch5_pierced_hmg_rpg - 0.3, 308.8);
        drawSideGround(c, 0, { river: onBankP < 0.5, hills: true });

        const floatY = onBankP < 0.5 ? 92 + Math.sin(t * 3.2) * 7 : 0;
        const floatPitch = onBankP < 0.5 ? -0.05 + Math.cos(t * 2.6) * 0.025 : 0;
        const isCutaway = t >= CUE.ch5_large_volume_light - 0.2 && t < CUE.ch5_pierced_hmg_rpg;
        const piercedP = A.ph(t, 308.4, 314.2);

        drawBMP1(c, 0, floatY, {
          view: isCutaway ? 'cutaway' : 'side',
          wheelRot: t * 4.5,
          pitch: floatPitch,
          hullPierced: piercedP,
        });

        // Khi giải thích "To float, a vehicle needs a large internal volume and light armor" (303.40–307.32s):
        // hiện các mũi tên lực đẩy nổi Archimedes hướng lên dưới đáy sông
        if (isCutaway) {
          for (const bx of [-150, -30, 90]) {
            U.arrow(c, [bx, floatY + 45], [bx, floatY - 12], {
              p: A.sm(t, 303.6, 304.8),
              color: P.sky,
              w: 5,
            });
          }
        }

        // Khi lên bờ (307.54 – 314.62s): Súng máy hạng nặng và RPG từ bên phải bắn xuyên qua lớp thép mỏng của BMP-1
        if (onBankP >= 0.5) {
          drawSoldier(c, 420, 0, {
            view: 'side_crouch',
            team: 'enemy',
            weapon: 'rpg',
            facing: -1,
            firing: A.win(t, 311.2, 312.0, 0.1, 0.2),
            scale: 1.0,
          });
          // Luồng đạn súng máy hạng nặng xuyên dọc sườn
          for (let i = 0; i < 3; i++) {
            const cyc = ((t * 3.8 + i * 0.33) % 1 + 1) % 1;
            F.tracer(c, [410, -45], [-155 + i * 82, -86], cyc, 0.18, P.enemy, 4.5);
          }
          // Quả đạn RPG bắn vào xé toạc thân xe lúc 311.4 – 314.2s
          const rpgP = A.ph(t, 311.4, 312.4);
          if (rpgP > 0 && rpgP < 1) {
            F.straightShot(c, [395, -52], [10, -86], rpgP, { color: P.enemy, w: 6 });
          }
          if (t >= 312.35) {
            F.explosion(c, 10, -86, 88, A.ph(t, 312.35, 314.2), 4);
          }
        }
      }

      K.end(c);

      // Callout "13–14 TONS" khi voice đọc "BMP-1 and BMP-2 weighed around 13 to 14 tons"
      const cal13 = A.win(t, 297.6, 303.0, 0.25, 0.25);
      if (cal13 > 0 && toRiver >= 0.5) {
        const pt = K.toScreen(cam, 0, -55);
        U.callout(c, '13–14 TONS', pt[0], pt[1] - 85, {
          to: pt,
          p: cal13,
          color: P.sky,
        });
      }
      return;
    }

    // ── CỤM 5.1B (314.60 – 323.30s): GÓC NHÌN TỪ TRÊN XUỐNG (TOP-DOWN) — BÌNH NHIÊN LIỆU TRONG 2 CÁNH CỬA HẬU BMP-1 ──
    if (t < 323.3) {
      const cam = K.track(
        t,
        [
          [314.6, { x: -85, y: 0, z: 1.68 }],
          [318.5, { x: -125, y: 0, z: 1.82 }],
          [323.3, { x: -125, y: 0, z: 1.82 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawTopMapBase(c, { roadY: 0 });

      const doorOpen = A.sm(t, 315.2, 317.4) * 0.45;
      drawBMP1(c, 0, 0, {
        view: 'top',
        showFuelDoors: 1,
        doorOpen,
      });

      // Khung tiêu điểm khoanh vào 2 cánh cửa hậu rỗng chứa nhiên liệu ngay sau lưng hàng ghế bộ binh (316.5 – 320.2s)
      const doorFocus = A.win(t, 316.5, 320.5, 0.3, 0.3);
      if (doorFocus > 0) {
        U.focus(c, -278, -98, 76, 196, doorFocus, P.amber, 5);
      }

      // Một viên đạn bắn trúng cánh cửa hậu chứa nhiên liệu làm bùng lửa dữ dội (320.0 – 323.2s)
      const hitDoorP = A.ph(t, 320.0, 320.8);
      if (hitDoorP > 0 && hitDoorP < 1) {
        F.tracer(c, [-460, -90], [-238, -48], hitDoorP, 0.25, P.enemy, 5);
      }
      if (t >= 320.75) {
        const fireAge = t - 320.75;
        F.explosion(c, -238, -45, 76, A.clamp01(fireAge / 1.4), 4);
        F.fire(c, -232, 35, fireAge, 1.05);
        F.smoke(c, -235, 0, fireAge, 1.0, 6);
      }

      K.end(c);
      return;
    }

    // ── CỤM 5.2 (323.30 – 370.90s): ĐẮP GIÁP 30–40 TẤN, NAMER 60 TẤN & THÁP PHÁO KHÔNG NGƯỜI LÁI ──
    if (t < 370.9) {
      // Chia thành 3 nhịp nối mượt:
      // 323.30 – 347.85s: Puma / CV90 / Bradley đắp giáp gốm, ERA, tấm chắn mìn bụng lên 30–40 tấn
      // 347.85 – 358.75s: Israel Namer 60 tấn (thân xe tăng Merkava tháo bỏ tháp pháo)
      // 358.75 – 370.90s: Tháp pháo không người lái (Unmanned Turret) trả lại sàn xe cho bộ binh
      const cam = K.track(
        t,
        [
          [323.3, { x: 0, y: -90, z: 1.48 }],
          [347.8, { x: 0, y: -90, z: 1.48 }],
          [349.0, { x: 0, y: -95, z: 1.45 }],
          [358.7, { x: 0, y: -95, z: 1.45 }],
          [360.0, { x: 0, y: -95, z: 1.62 }],
          [370.9, { x: 0, y: -95, z: 1.62 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawSideGround(c, 0, { hills: false });

      if (t < CUE.ch5_israel_namer_60t) {
        // Nhịp 1 (323.30 – 347.88s): Bỏ yêu cầu bơi, lắp giáp mô-đun gốm + ERA + tấm chắn mìn bụng (30–40 tấn)
        const armorLvl: 0 | 1 | 2 = t < 333.2 ? 0 : t < 337.5 ? 1 : 2;
        drawIFV(c, 0, 0, {
          view: 'side',
          armorLevel: armorLvl,
          atgm: 1,
        });

        // Nhấn khung tiêu điểm vào giáp sườn ERA (333.2 – 337.2s) và tấm chắn mìn bụng (337.2 – 340.5s)
        const sideModFocus = A.win(t, 333.2, 337.2, 0.3, 0.3);
        if (sideModFocus > 0) {
          U.focus(c, -225, -152, 395, 88, sideModFocus, P.amber, 5);
        }
        const bellyFocus = A.win(t, 337.2, 341.0, 0.3, 0.3);
        if (bellyFocus > 0) {
          U.focus(c, -205, -68, 390, 28, bellyFocus, P.amber, 5);
        }
      } else if (t < CUE.ch5_unmanned_turret) {
        // Nhịp 2 (347.88 – 358.78s): Israel Namer 60 tấn — lấy thân xe tăng Merkava, nhấc bỏ tháp pháo, biến thành APC siêu giáp!
        const liftTurretP = A.sm(t, 351.8, 354.2);

        drawMBT(c, 0, 0, {
          view: 'cutaway',
          isNamer: liftTurretP > 0.5,
          scale: 0.98,
        });

        // Hiệu ứng chiếc tháp pháo xe tăng được nhấc bổng lên khỏi thân xe (351.5 – 354.8s)
        if (liftTurretP > 0.01 && liftTurretP < 0.99) {
          const ty = A.lerp(0, -240, liftTurretP);
          A.withA(c, 1 - liftTurretP, () => {
            c.save();
            c.translate(0, ty);
            A.poly(
              c,
              [
                [-118, -134],
                [-92, -192],
                [78, -192],
                [124, -152],
                [102, -134],
              ],
              P.oliveLight,
              P.ink,
              4
            );
            A.rrect(c, 106, -176, 212, 20, 4, P.dark, P.ink, 4);
            c.restore();
          });
        }

        // Đạn chống tăng bắn vào mũi Namer lúc 355.5 – 358.4s bị lớp giáp xe tăng đánh bật hoàn toàn!
        const namerHitP = A.ph(t, 355.5, 356.6);
        if (namerHitP > 0 && namerHitP < 1) {
          F.straightShot(c, [480, -135], [210, -115], namerHitP, { color: P.enemy, w: 6 });
        }
        if (t >= 356.55) {
          F.sparks(c, 210, -115, A.ph(t, 356.55, 358.0), 1.1, -0.6, Math.PI * 0.8, 9);
        }
      } else {
        // Nhịp 3 (358.78 – 370.90s): Tháp pháo không người lái (Unmanned Turret) đặt trên nóc, giải phóng sàn xe!
        const switchUnmanned = t >= 362.0;
        drawIFV(c, 0, 0, {
          view: 'cutaway',
          turretType: switchUnmanned ? 'unmanned' : 'manned',
          armorLevel: 2,
          basketHighlight: !switchUnmanned ? 1 : 0,
        });

        // Nhấn khung tiêu điểm vào tháp pháo không người lái màu P.sky trên nóc và hàng ghế mở rộng dưới sàn (362.2 – 370.5s)
        if (switchUnmanned) {
          const uFocus = A.win(t, 362.2, 370.5, 0.35, 0.35);
          U.focus(c, -42, -230, 145, 72, uFocus, P.sky, 5);
          U.focus(c, -40, -152, 130, 92, uFocus, P.amber, 4);
        }
      }

      K.end(c);

      // Callout "30–40 TONS" (343.8 – 347.6s) và "60 TONS (NAMER)" (350.0 – 358.2s)
      const cal3040 = A.win(t, 343.8, 347.6, 0.25, 0.25);
      if (cal3040 > 0) {
        const pt = K.toScreen(cam, 0, -162);
        U.callout(c, '30–40 TONS', pt[0], pt[1] - 85, {
          to: pt,
          p: cal3040,
          color: P.amber,
        });
      }
      const cal60 = A.win(t, 350.0, 358.2, 0.25, 0.25);
      if (cal60 > 0) {
        const pt = K.toScreen(cam, -30, -175);
        U.callout(c, '60 TONS', pt[0], pt[1] - 85, {
          to: pt,
          p: cal60,
          color: P.sky,
        });
      }
      return;
    }

    // ── CỤM 5.3 (370.90 – 398.10s): BIẾM HỌA THIẾT KẾ BRADLEY & CUỘC KÉO CO KHÔNG GIAN BÊN TRONG MỘT THÂN XE ──
    const isTugOfWar = t >= CUE.ch5_tug_of_war;
    const closeEndP = A.sm(t, 395.2, 397.5);
    const cam = K.track(
      t,
      [
        [370.9, { x: 0, y: -95, z: 1.48 }],
        [382.8, { x: 0, y: -95, z: 1.48 }],
        [384.2, { x: -15, y: -102, z: 1.62 }],
        [394.8, { x: -15, y: -102, z: 1.62 }],
        [397.5, BOUNDARY.ch5_to_ch6.cam],
        [398.1, BOUNDARY.ch5_to_ch6.cam],
      ],
      A.eio
    );

    K.begin(c, cam);
    drawSideGround(c, 0, { hills: false });

    if (!isTugOfWar) {
      // 370.94 – 382.92s: Biếm họa ủy ban thiết kế Bradley — từ một chiếc xe chở quân phẳng, lần lượt gắn thêm:
      // (1) Tháp pháo (375.2s) -> (2) Tên lửa chống tăng (376.8s) -> (3) Lỗ ngắm & lỗ bắn (378.4s)
      const hasTurret = t >= 375.0;
      const atgmP = A.back(t, 376.6, 377.6);
      const hasPorts = t >= 378.2;

      drawIFV(c, 0, 0, {
        view: 'side',
        turretType: hasTurret ? 'manned' : 'none',
        atgm: atgmP,
        armorLevel: 0,
        pistolPorts: hasPorts,
      });

      // Mũi tên chỉ từng món đồ được "ủy ban" cộng dồn lên lưng xe
      if (t >= 374.8 && t < 376.6) {
        U.arrow(c, [22, -310], [22, -235], { p: A.sm(t, 374.8, 375.4), color: P.amber, w: 6 });
      }
      if (t >= 376.6 && t < 378.2) {
        U.arrow(c, [-80, -295], [-20, -215], { p: A.sm(t, 376.6, 377.2), color: P.enemy, w: 6 });
      }
      if (t >= 378.2 && t < 382.5) {
        U.focus(c, -210, -155, 155, 55, A.win(t, 378.2, 382.2, 0.25, 0.25), P.sky, 4);
      }
    } else {
      // 382.92 – 398.10s: Cuộc kéo co (Tug of War) bên trong một thân xe giữa Pháo thủ (muốn chỗ chứa đạn) và Bộ binh (8 đôi đầu gối & ba lô)
      const tugP = A.win(t, 383.2, 395.0, 0.4, 0.5) * ((t - 383.0) * 0.25);

      drawIFV(c, 0, 0, {
        view: closeEndP > 0.5 ? 'side' : 'cutaway',
        armorLevel: 1,
        atgm: 1,
        basketHighlight: 1 - closeEndP,
        tugOfWar: tugP,
      });

      if (closeEndP < 0.5) {
        const shift = Math.sin(tugP * Math.PI * 4) * 24;
        // Mũi tên Pháo thủ đẩy sang trái (màu P.amber) vs Mũi tên Bộ binh đẩy sang phải (màu P.sky)
        U.arrow(c, [45 + shift, -115], [-30 + shift, -115], {
          p: 1,
          color: P.amber,
          w: 6,
        });
        U.arrow(c, [-115 + shift, -115], [-40 + shift, -115], {
          p: 1,
          color: P.sky,
          w: 6,
        });
      }
    }

    K.end(c);
  }
}
