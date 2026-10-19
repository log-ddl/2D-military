// scenes/sc06.ts — Chương 6 (398.10 – 475.98s): Hai nửa của một đơn vị chiến đấu — Phối hợp 200m / 2km & Tổng kết cấu hình IFV.
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
  drawAPC,
  drawSoldier,
  drawSideGround,
  drawTopMapBase,
} from './_assets';

export default class Sc06 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── CỤM 6.1 (398.10 – 423.60s): SAI LẦM KHI NHÌN IFV BỊ BẮN CHÁY MỘT MÌNH vs HAI NỬA CỦA MỘT ĐƠN VỊ (SIDE -> TOP-DOWN) ──
    if (t < 423.6) {
      const isTopUnit = t >= 411.8;

      if (!isTopUnit) {
        const cam = K.track(
          t,
          [
            [398.1, BOUNDARY.ch5_to_ch6.cam],
            [403.5, { x: 0, y: -95, z: 1.08 }],
            [411.8, { x: 0, y: -95, z: 1.08 }],
          ],
          A.eio
        );
        const shakenCam = K.withShake(cam, t, [[400.2, 18, 0.65]]);

        K.begin(c, shakenCam);
        drawSideGround(c, 0, { hills: true });

        // Quả tên lửa/đạn pháo bắn trúng chiếc IFV đi lẻ lúc 399.5 – 400.3s
        const hitP = A.ph(t, 399.4, 400.25);
        if (hitP > 0 && hitP < 1) {
          F.straightShot(c, [520, -240], [10, -110], hitP, { color: P.enemy, w: 6 });
        }

        drawIFV(c, 0, 0, {
          view: 'side',
          armorLevel: 1,
          atgm: 1,
        });

        if (t >= 400.2) {
          const age = t - 400.2;
          F.explosion(c, 10, -115, 92, A.clamp01(age / 1.2), 4);
          F.smoke(c, -10, -145, age, 1.15, 7);
          F.fire(c, 15, -130, age, 0.95);
        }

        // Khi voice đọc "neither as tough as a tank nor as roomy as a carrier" (404.0 – 411.8s):
        // hiện bóng đối chiếu của MBT bên trái (-520) và APC bên phải (+520)
        const cmpAlpha = A.win(t, 404.0, 411.6, 0.4, 0.4) * 0.48;
        if (cmpAlpha > 0.01) {
          A.withA(c, cmpAlpha, () => {
            drawMBT(c, -520, 0, { view: 'side', scale: 0.78 });
            drawAPC(c, 520, 0, { type: 'apc', view: 'cutaway', scale: 0.82 });
          });
        }

        K.end(c);
        return;
      }

      // 411.80 – 423.60s: Góc nhìn TOP-DOWN — Chiếc IFV và tiểu đội bộ binh tháo dỡ là HAI NỬA CỦA MỘT ĐƠN VỊ CHIẾN ĐẤU!
      const cam = K.track(
        t,
        [
          [411.8, { x: 0, y: 0, z: 1.32 }],
          [419.5, { x: 25, y: 0, z: 1.38 }],
          [423.6, { x: 25, y: 0, z: 1.38 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawTopMapBase(c, { roadY: 0 });

      const joinP = A.sm(t, CUE.ch6_two_halves_unit - 0.5, 421.8);

      // Vòng liên kết đơn vị thống nhất bao quanh cả chiếc IFV và tiểu đội bộ binh
      if (joinP > 0.01) {
        A.withA(c, joinP * 0.22, () => {
          A.rrect(c, -360, -165, 760, 330, 165, P.sky, null, 0);
        });
        A.rrect(c, -360, -165, 760, 330, 165, null, P.sky, 4);
      }

      // Nửa 1 (bên trái): Chiếc IFV mở cửa dốc
      drawIFV(c, -155, 0, {
        view: 'top',
        facing: 1,
        scale: 0.78,
        rampOpen: A.sm(t, 412.2, 413.8),
      });

      // Nửa 2 (bên phải): Tiểu đội 6 người lính bộ binh triển khai đội hình chiến đấu gắn kết với xe
      const squadOffsets: [number, number][] = [
        [155, -85],
        [155, 85],
        [235, -45],
        [235, 45],
        [305, -95],
        [305, 95],
      ];
      squadOffsets.forEach(([ox, oy], idx) => {
        const sp = A.sm(t, 412.5 + idx * 0.25, 414.5 + idx * 0.25);
        const sx = A.lerp(-155, ox, sp);
        const sy = A.lerp(0, oy, sp);
        drawSoldier(c, sx, sy, {
          view: 'top',
          team: 'ally',
          weapon: 'rifle',
          facing: 1,
          scale: 1.0,
        });
        if (joinP > 0.1) {
          U.dashed(c, [-55, 0], [sx, sy], P.sky, 2.5, t * 28);
        }
      });

      K.end(c);
      return;
    }

    // ── CỤM 6.2 (423.60 – 447.80s): BẢN ĐỒ TÁC CHIẾN TOP-DOWN — BỘ BINH QUÉT 200M GÓC KHUẤT & IFV YỂM TRỢ TỪ 2 KM ──
    if (t < 447.8) {
      const cam = K.track(
        t,
        [
          [423.6, { x: 110, y: -20, z: 1.22 }],
          [430.5, { x: 110, y: -20, z: 1.22 }],
          [432.5, { x: 0, y: 0, z: 1.02 }],
          [447.8, { x: 0, y: 0, z: 1.02 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawTopMapBase(c, { roadY: 0, urban: true, trees: true });

      const ifvX = -510;
      const ifvY = 45;
      const squadCenterX = 125;
      const squadCenterY = -35;
      const strongpointX = 540;
      const strongpointY = -120;

      // Vật che khuất (gò đồi/công sự) phía trước chiếc IFV ở tuyến sau (x = -360)
      A.rrect(c, -385, -45, 36, 180, 12, P.oliveDark, P.ink, LINE.outer);

      // 1. Khi nhắc "while the vehicle stands back behind cover and uses its thermal sights and autocannon..." (431.2 – 438.9s):
      // Quạt tầm nhìn kính ngắm ảnh nhiệt (màu P.sky) quét từ IFV ở -510 tới tận hỏa điểm địch ở +540!
      const overwatchP = A.win(t, CUE.ch6_vehicle_2km_cover - 0.3, 438.9, 0.4, 0.4);
      if (overwatchP > 0.01) {
        A.withA(c, overwatchP * 0.18, () => {
          A.poly(
            c,
            [
              [ifvX + 40, ifvY],
              [strongpointX + 60, strongpointY - 190],
              [strongpointX + 60, strongpointY + 190],
            ],
            P.sky,
            null,
            0
          );
        });
        A.line(c, [[ifvX + 40, ifvY], [strongpointX, strongpointY]], P.sky, 3, [12, 8]);
      }

      // 2. Vòng bán kính 200m quanh tiểu đội bộ binh đang lùng sục góc khuất và tầng hầm (423.86 – 438.92s)
      const ring200P = A.win(t, CUE.ch6_foot_200m, 438.9, 0.4, 0.4);
      if (ring200P > 0.01) {
        A.withA(c, ring200P * 0.16, () => {
          A.circle(c, squadCenterX, squadCenterY, 210, P.sky, null, 0);
        });
        A.circle(c, squadCenterX, squadCenterY, 210, null, P.sky, 3.5);
      }

      // 3. Nhịp đối chiếu (438.92 – 447.68s):
      // - 438.92 – 442.82s ("Separate them and the squad is slow while the vehicle is blind"): vách ngăn đỏ cắt đứt giữa xe và lính
      // - 443.18 – 447.68s ("Keep them within sight and radio reach and each covers the weakness"): đường liên lạc vô tuyến nối chặt
      const sepP = A.win(t, CUE.ch6_separate_slow_blind, 443.0, 0.25, 0.25);
      if (sepP > 0.01) {
        A.line(c, [[-175, -380], [-175, 380]], P.enemy, 7, [18, 12]);
        U.xMark(c, -175, 0, 32, sepP, P.enemy, 7);
      }

      const radioP = A.win(t, CUE.ch6_keep_within_sight, 447.7, 0.3, 0.3);
      if (radioP > 0.01) {
        U.dashed(c, [ifvX + 60, ifvY], [squadCenterX, squadCenterY], P.sky, 4.5, t * 40);
        for (let r = 1; r <= 3; r++) {
          const rp = ((t * 1.4 + r * 0.33) % 1 + 1) % 1;
          U.ring(c, ifvX + 20, ifvY, 110, rp, P.sky, 3.5);
          U.ring(c, squadCenterX, squadCenterY, 110, rp, P.sky, 3.5);
        }
      }

      // 4. Vẽ chiếc IFV ở tuyến sau bên trái (x = -510, y = 45)
      const isAutocannonFiring = t >= 434.2 && t < 438.2;
      drawIFV(c, ifvX, ifvY, {
        view: 'top',
        facing: 1,
        scale: 0.72,
        turretAng: Math.atan2(strongpointY - ifvY, strongpointX - ifvX),
        cannonFire: isAutocannonFiring ? (t * 7) % 1 : 0,
      });

      // 5. Vẽ Tiểu đội bộ binh đi bộ tiến qua góc khuất công trình và diệt tổ RPG ẩn nấp trong bán kính 200m
      const rpgEliminated = A.sm(t, 429.2, 430.5);
      const footSquad: [number, number][] = [
        [45, -110],
        [145, -135],
        [95, 35],
        [185, 55],
      ];
      footSquad.forEach(([fx, fy], idx) => {
        const walkShift = A.lerp(-55, 0, A.sm(t, 423.8, 428.5));
        drawSoldier(c, fx + walkShift, fy, {
          view: 'top',
          team: 'ally',
          weapon: 'rifle',
          facing: 1,
          firing: t >= 428.0 && t < 429.8 && idx < 2 ? (t * 6) % 1 : 0,
          scale: 0.98,
        });
      });

      // Tổ chống tăng RPG đối phương ẩn trong góc khuất sau tòa nhà (x = 195, y = -185) bị bộ binh phát hiện và tiêu diệt
      if (rpgEliminated < 0.95) {
        drawSoldier(c, 195, -185, {
          view: 'top',
          team: 'enemy',
          weapon: 'rpg',
          facing: -1,
          scale: 0.98,
        });
      }
      if (t >= 428.2 && t < 430.8) {
        F.tracer(c, [145, -135], [195, -185], ((t - 428.2) * 3) % 1, 0.22, P.amber, 4);
      }
      if (rpgEliminated > 0.05) {
        U.xMark(c, 195, -185, 22, rpgEliminated, P.enemy, 6);
      }

      // 6. Hỏa điểm mạnh của đối phương (Strongpoint MG) ở x = 540, y = -120 ghim bộ binh nhưng bị pháo tự động IFV từ 2 km nghiền nát!
      const spCrushed = A.sm(t, 435.5, 438.2);
      A.rrect(c, strongpointX - 48, strongpointY - 48, 96, 96, 10, P.enemyLight, P.ink, LINE.outer);
      if (spCrushed < 0.8) {
        drawSoldier(c, strongpointX, strongpointY, {
          view: 'top',
          team: 'enemy',
          weapon: 'mg',
          facing: -1,
          firing: t < 435.5 ? (t * 5) % 1 : 0,
          scale: 1.0,
        });
        // Làn đạn địch ghim bộ binh lúc 431.5 – 435.0s
        if (t >= 431.2 && t < 435.2) {
          F.tracer(c, [strongpointX - 35, strongpointY], [210, -45], (t * 3.5) % 1, 0.18, P.enemy, 4);
        }
      }

      // Loạt đạn pháo tự động từ IFV cách 2 km bắn nổ tung hỏa điểm địch (434.2 – 438.2s)
      if (isAutocannonFiring) {
        for (let b = 0; b < 3; b++) {
          const bp = ((t * 4.5 + b * 0.33) % 1 + 1) % 1;
          F.tracer(c, [ifvX + 85, ifvY - 12], [strongpointX, strongpointY], bp, 0.16, P.amber, 5);
        }
        F.explosion(c, strongpointX, strongpointY, 86, ((t - 434.2) * 1.5) % 1, 4);
      }
      if (spCrushed > 0.2) {
        U.xMark(c, strongpointX, strongpointY, 30, spCrushed, P.enemy, 7);
      }

      K.end(c);

      // Callout "200 M" (428.8 – 433.5s) và "2 KM" (435.2 – 438.8s)
      const cal200 = A.win(t, 428.8, 433.5, 0.25, 0.25);
      if (cal200 > 0) {
        const pt = K.toScreen(cam, squadCenterX, squadCenterY - 210);
        U.callout(c, '200 M', pt[0], pt[1] - 55, {
          to: pt,
          p: cal200,
          color: P.sky,
        });
      }
      const cal2km = A.win(t, 435.2, 438.8, 0.25, 0.25);
      if (cal2km > 0) {
        const pt = K.toScreen(cam, -210, -40);
        U.callout(c, '2 KM', pt[0], pt[1] - 65, {
          to: pt,
          p: cal2km,
          color: P.amber,
        });
      }
      return;
    }

    // ── CỤM 6.3 (447.80 – 475.98s): TRỞ LẠI LỖ BẮN HÀN KÍN TRÊN BMP-1 (1966) & TỔNG KẾT 5 CẤU PHẦN SỐNG SÓT TRONG ĐỘI HÌNH HỢP THÀNH ──
    if (t < 461.8) {
      // 447.80 – 461.80s: Cận cảnh chiếc BMP-1 năm 1966 -> hàn kín lỗ bắn vì bộ binh vẫn phải chiến đấu bằng đôi chân trên bùn & gạch vụn
      const cam = K.track(
        t,
        [
          [447.8, { x: -40, y: -82, z: 1.92 }],
          [456.4, { x: -40, y: -82, z: 1.85 }],
          [458.5, { x: 35, y: -78, z: 1.48 }],
          [461.8, { x: 35, y: -78, z: 1.48 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      const nucFade = 1 - A.sm(t, 455.5, 457.5);
      drawSideGround(c, 0, { nuclear: nucFade, hills: true });

      const weldP = A.sm(t, CUE.ch6_welded_mud_rubble, 458.8);
      drawBMP1(c, -80, 0, {
        view: 'side',
        wheelRot: t * 3.5,
        firingPorts: 1 - weldP,
        portsWelded: weldP,
      });

      // Khi lỗ bắn được hàn kín (456.52 – 461.68s): 3 người lính bộ binh bước đi trên đôi chân của mình qua lớp bùn và đống gạch vụn phía trước xe!
      const footAppear = A.sm(t, 457.0, 458.4);
      if (footAppear > 0.01) {
        A.withA(c, footAppear, () => {
          for (const [idx, sx] of [210, 295, 380].entries()) {
            drawSoldier(c, sx + (t - 457.0) * 18, 0, {
              view: 'side_run',
              team: 'ally',
              weapon: 'rifle',
              facing: 1,
              walkPhase: t * 2.4 + idx * 0.35,
              scale: 1.0,
            });
          }
        });
      }

      K.end(c);

      const cal1966 = A.win(t, 450.0, 455.8, 0.25, 0.25);
      if (cal1966 > 0) {
        const pt = K.toScreen(cam, -80, -148);
        U.callout(c, 'BMP-1 (1966)', pt[0], pt[1] - 82, {
          to: pt,
          p: cal1966,
          color: P.ink,
        });
      }
      return;
    }

    // ── 461.80 – 475.98s: TỔNG KẾT 5 CẤU PHẦN TRÊN MẶT CẮT IFV HIỆN ĐẠI & ĐỘI HÌNH HỢP ĐỒNG BINH CHỦNG CÙNG TIẾN VỀ PHÍA TRƯỚC ──
    const finalMarchP = A.sm(t, 470.0, 472.2);
    const cam = K.track(
      t,
      [
        [461.8, { x: 0, y: -92, z: 1.66 }],
        [469.8, { x: 0, y: -92, z: 1.66 }],
        [472.5, { x: 55, y: -95, z: 1.14 }],
        [475.98, { x: 95, y: -95, z: 1.14 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    drawSideGround(c, 0, { hills: true });

    const wheelRot = (t - 461.8) * 5.2;
    const gunHighP = A.sm(t, 466.8, 468.0);

    // Chiếc IFV hiện đại ở trung tâm (mở mặt cắt khi điểm danh 5 bộ phận, sau đó tiến cùng đội hình)
    drawIFV(c, 0, 0, {
      view: finalMarchP > 0.6 ? 'side' : 'cutaway',
      wheelRot,
      armorLevel: 1,
      atgm: 1,
      gunElev: A.lerp(-0.08, -0.42, gunHighP * (1 - finalMarchP * 0.5)),
      rampOpen: A.win(t, 464.5, 466.2, 0.25, 0.35) * 0.85,
    });

    // Điểm danh 5 bộ phận sống còn theo đúng nhịp lời đọc (463.5 – 470.2s):
    // 1. "the front engine" (463.6 – 464.8s)
    const f1 = A.win(t, 463.5, 465.0, 0.2, 0.25);
    if (f1 > 0) U.focus(c, 92, -144, 112, 78, f1, P.amber, 5);

    // 2. "the rear ramp" (464.6 – 466.0s)
    const f2 = A.win(t, 464.6, 466.1, 0.2, 0.25);
    if (f2 > 0) U.focus(c, -315, -162, 100, 160, f2, P.sky, 5);

    // 3. "the suspended seats" (465.7 – 467.2s)
    const f3 = A.win(t, 465.7, 467.3, 0.2, 0.25);
    if (f3 > 0) U.focus(c, -218, -154, 150, 90, f3, P.amber, 5);

    // 4. "the high-angle autocannon" (467.0 – 468.6s)
    const f4 = A.win(t, 467.0, 468.7, 0.2, 0.25);
    if (f4 > 0) U.focus(c, 58, -265, 185, 95, f4, P.sky, 5);

    // 5. "and the missiles on the turret cheek" (468.4 – 470.2s)
    const f5 = A.win(t, 468.4, 470.3, 0.2, 0.25);
    if (f5 > 0) U.focus(c, -36, -216, 102, 42, f5, P.enemy, 5);

    // Khi lùi ra toàn cảnh (470.0 – 475.98s): Tiểu đội bộ binh đi bộ và Xe tăng chủ lực (MBT) cùng tiến bên cạnh IFV!
    if (finalMarchP > 0.01) {
      A.withA(c, finalMarchP, () => {
        // Xe tăng chủ lực MBT tiến song song ở hậu cảnh/cánh trái (-490, 0)
        drawMBT(c, -490, 0, {
          view: 'side',
          wheelRot,
          scale: 0.84,
        });

        // Tiểu đội bộ binh tiến bước phía trước/cạnh chiếc IFV (+290..+470)
        for (const [idx, sx] of [295, 380, 465].entries()) {
          drawSoldier(c, sx, 0, {
            view: 'side_run',
            team: 'ally',
            weapon: 'rifle',
            facing: 1,
            walkPhase: t * 2.5 + idx * 0.33,
            scale: 1.0,
          });
        }
      });
    }

    K.end(c);
  }
}
