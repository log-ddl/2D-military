// scenes/sc02.ts — Chương 2 (72.60 – 129.95s): Đảo ngược giải phẫu xe tăng — Động cơ trước & Cửa dốc sau làm lá chắn sống.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { BOUNDARY } from './_state';
import {
  drawIFV,
  drawMBT,
  drawAPC,
  drawSoldier,
  drawSideGround,
  drawTopMapBase,
} from './_assets';

export default class Sc02 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── CỤM 2.1 (72.60 – 93.00s): ĐẢO NGƯỢC GIẢI PHẪU XE TĂNG (SIDE CUTAWAY ĐỐI CHIẾU MBT & IFV) ──
    if (t < 93.0) {
      const [mbtX, mbtY] = BOUNDARY.ch1_to_ch2.mbtPos;
      const [ifvX, ifvY] = BOUNDARY.ch1_to_ch2.ifvPos;

      const cam = K.track(
        t,
        [
          [72.6, BOUNDARY.ch1_to_ch2.cam],
          [82.8, BOUNDARY.ch1_to_ch2.cam],
          [86.5, { x: 10, y: 55, z: 1.48 }],
          [90.2, { x: -55, y: 85, z: 1.66 }],
          [93.0, { x: -55, y: 85, z: 1.66 }],
        ],
        A.eio
      );

      K.begin(c, cam);

      A.line(c, [[-1200, mbtY], [1200, mbtY]], P.ink, LINE.outer);
      A.line(c, [[-1200, ifvY], [1200, ifvY]], P.ink, LINE.outer);

      // 1. MBT ở tầng trên (y = -135)
      drawMBT(c, mbtX, mbtY, {
        view: 'cutaway',
        scale: 0.92,
      });

      // Khung tiêu điểm vào động cơ đặt ở đuôi MBT (76.68 – 80.10s)
      const mbtEngFocus = A.win(t, CUE.ch2_tank_rear_engine - 0.2, 81.8, 0.3, 0.3);
      if (mbtEngFocus > 0) {
        U.focus(c, mbtX - 222, mbtY - 118, 144, 62, mbtEngFocus, P.amber, 5);
      }

      // Khung tiêu điểm vào khối giáp mũi cực dày của MBT (79.50 – 82.90s)
      const mbtArmorFocus = A.win(t, CUE.ch2_tank_nose_armor - 0.3, 83.2, 0.3, 0.3);
      if (mbtArmorFocus > 0) {
        U.focus(c, mbtX + 124, mbtY - 122, 118, 68, mbtArmorFocus, P.sky, 5);
      }

      // 2. IFV ở tầng dưới (y = 175)
      const rampOpen = A.sm(t, CUE.ch2_back_wall_ramp + 0.4, 91.5);
      drawIFV(c, ifvX, ifvY, {
        view: 'cutaway',
        scale: 0.92,
        rampOpen,
      });

      // Mũi tên đảo ngược giải phẫu: từ khối động cơ đuôi MBT chỉ chéo xuống khối động cơ mũi IFV (82.90 – 88.00s)
      const flipArrowP = A.win(t, CUE.ch2_ifv_front_engine - 0.2, 88.2, 0.4, 0.4);
      if (flipArrowP > 0) {
        U.arrow(c, [mbtX - 150, mbtY - 52], [ifvX + 140, ifvY - 135], {
          p: A.sm(t, CUE.ch2_ifv_front_engine - 0.2, CUE.ch2_ifv_front_engine + 0.9),
          color: P.amber,
          w: 6,
        });
        U.focus(c, ifvX + 86, ifvY - 136, 112, 74, flipArrowP, P.amber, 5);
      }

      // Khi cửa dốc thủy lực mở ra ở vách sau (88.14 – 93.00s), nhấn vào lối ra rộng mở phía sau
      const rampFocus = A.win(t, CUE.ch2_back_wall_ramp, 92.8, 0.35, 0.3);
      if (rampFocus > 0) {
        U.focus(c, ifvX - 315, ifvY - 152, 125, 152, rampFocus, P.sky, 5);
      }

      K.end(c);
      return;
    }

    // ── CỤM 2.2A (93.00 – 104.20s): NẾU TRÈO QUA NÓC HOẶC CỬA HÔNG DƯỚI LÀN ĐẠN SÚNG MÁY (SIDE) ──
    if (t < 104.2) {
      const cam = K.track(
        t,
        [
          [93.0, { x: 40, y: -78, z: 1.52 }],
          [97.5, { x: 15, y: -82, z: 1.58 }],
          [104.2, { x: 15, y: -82, z: 1.58 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawSideGround(c, 0, { hills: true });

      // Chiếc xe dừng lại ở x = -140; từ 97.64s lính trèo qua nắp nóc và cửa hông
      const stopP = A.eo(t, 93.0, 95.8);
      const vehX = A.lerp(-320, -140, stopP);
      const climbP = A.ph(t, CUE.ch2_climb_roof_cut, 103.5);

      drawAPC(c, vehX, 0, {
        type: 'apc',
        view: 'side',
        wheelRot: stopP * 14,
        topClimb: climbP,
        scale: 0.96,
      });

      // Tổ súng máy đối phương bên phải (x = 340) bắn quét ngang nóc và sườn xe
      const mgFiring = t >= 95.2 ? ((t * 5.5) % 1) : 0;
      // Ụ bao cát công sự súng máy địch
      A.rrect(c, 285, -36, 48, 36, 8, P.sand, P.ink, LINE.outer);
      drawSoldier(c, 345, 0, {
        view: 'side_crouch',
        team: 'enemy',
        weapon: 'mg',
        facing: -1,
        firing: mgFiring,
        scale: 1.05,
      });

      // Luồng đạn vạch súng máy quét thẳng vào nắp nóc và cửa hông xe
      if (t >= 95.4) {
        for (let i = 0; i < 4; i++) {
          const cyc = ((t * 3.2 + i * 0.25) % 1 + 1) % 1;
          const targetY = i % 2 === 0 ? -182 : -105;
          F.tracer(c, [285, -42], [vehX - 45, targetY], cyc, 0.16, P.enemy, 4.5);
        }
        F.sparks(c, vehX - 50, -172, (t * 4) % 1, 0.75, 0, Math.PI, 2);
      }

      // Dấu X đỏ xác nhận trèo qua nóc/hông là tự sát dưới làn đạn (102.2 – 104.1s)
      const xP = A.sm(t, 102.0, 102.8);
      if (xP > 0) {
        U.xMark(c, vehX - 40, -195, 28, xP, P.enemy, 7);
      }

      K.end(c);
      return;
    }

    // ── CỤM 2.2B (104.20 – 113.60s): GÓC NHÌN TỪ TRÊN XUỐNG (TOP-DOWN) — THÂN XE 25–30 TẤN LÀM LÁ CHẮN SỐNG ──
    if (t < 113.6) {
      const cam = K.track(
        t,
        [
          [104.2, { x: -20, y: 0, z: 1.38 }],
          [108.5, { x: -55, y: 0, z: 1.46 }],
          [113.6, { x: -55, y: 0, z: 1.46 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawTopMapBase(c, { roadY: 0, rubble: true });

      const ifvX = 20;
      const enemyX = 430;
      const rampOpen = A.sm(t, 104.4, 105.8);

      // 1. Vùng hỏa lực nguy hiểm của súng máy địch từ phải bắn sang (bị chặn đứng tại mũi IFV!)
      A.withA(c, 0.16, () => {
        A.poly(
          c,
          [
            [enemyX, 0],
            [ifvX + 210, -135],
            [ifvX + 210, 135],
          ],
          P.enemy,
          null,
          0
        );
      });

      // 2. Vùng bóng an toàn (Safe Shadow Cone màu P.sky) phía sau lưng chiếc IFV 25–30 tấn!
      const shieldAlpha = A.sm(t, 105.0, 106.5);
      if (shieldAlpha > 0.01) {
        A.withA(c, shieldAlpha * 0.24, () => {
          A.poly(
            c,
            [
              [ifvX - 220, -108],
              [-520, -195],
              [-520, 195],
              [ifvX - 220, 108],
            ],
            P.sky,
            P.sky,
            3
          );
        });
      }

      // 3. Chiếc IFV đứng chắn giữa địch (bên phải) và tiểu đội bộ binh bước ra từ cửa dốc (bên trái)
      drawIFV(c, ifvX, 0, {
        view: 'top',
        facing: 1,
        scale: 0.88,
        rampOpen,
        topCutout: A.win(t, 104.4, 106.8, 0.3, 0.5) * 0.65,
        cannonFire: t > 110.2 ? ((t * 4) % 1 < 0.35 ? ((t * 4) % 1) / 0.35 : 0) : 0,
      });

      // Tổ súng máy đối phương bên phải bắn dồn dập vào mũi IFV nhưng toàn bộ đạn bị bật ra
      drawSoldier(c, enemyX, 0, {
        view: 'top',
        team: 'enemy',
        weapon: 'mg',
        facing: -1,
        firing: (t * 5) % 1,
        scale: 1.1,
      });
      for (let i = 0; i < 4; i++) {
        const cyc = ((t * 3.4 + i * 0.25) % 1 + 1) % 1;
        const hitY = (i - 1.5) * 42;
        F.tracer(c, [enemyX - 30, 0], [ifvX + 205, hitY], cyc, 0.18, P.enemy, 4.5);
      }
      F.sparks(c, ifvX + 205, 0, (t * 4.5) % 1, 0.9, 0, Math.PI * 0.9, 5);

      // 4. Tiểu đội bộ binh (6 người) bước ra an toàn qua cửa dốc phía sau lưng xe (106.0 – 113.5s)
      const squadTargets: [number, number][] = [
        [-275, -52],
        [-275, 52],
        [-355, -88],
        [-355, 88],
        [-425, -36],
        [-425, 36],
      ];
      squadTargets.forEach(([tx, ty], idx) => {
        const exitP = A.sm(t, 106.2 + idx * 0.42, 108.4 + idx * 0.42);
        if (exitP > 0.01) {
          const sx = A.lerp(ifvX - 195, tx, exitP);
          const sy = A.lerp(0, ty, exitP);
          drawSoldier(c, sx, sy, {
            view: 'top',
            team: 'ally',
            weapon: 'rifle',
            facing: 1,
            scale: 0.98,
          });
        }
      });

      K.end(c);

      // Callout "25–30 TONS" khi voice đọc "the 25 or 30 tons of the vehicle stand between the enemy"
      const calP = A.win(t, CUE.ch2_tons_25_30 - 0.15, 111.3, 0.25, 0.3);
      if (calP > 0) {
        const pt = K.toScreen(cam, ifvX + 20, -45);
        U.callout(c, '25–30 TONS', pt[0], pt[1] - 92, {
          to: pt,
          p: calP,
          color: P.ink,
        });
      }
      return;
    }

    // ── CỤM 2.3 (113.60 – 129.95s): KHỐI ĐỘNG CƠ GANG ĐÚC CHẶN ĐẠN Ở MŨI & LIA VÀO KHOANG SAU ĐÓNG KÍN ──
    const cam = K.track(
      t,
      [
        [113.6, { x: 95, y: -88, z: 1.88 }],
        [121.8, { x: 95, y: -88, z: 1.92 }],
        [125.5, BOUNDARY.ch2_to_ch3.cam],
        [129.95, BOUNDARY.ch2_to_ch3.cam],
      ],
      A.eio
    );

    const hitP = A.ph(t, CUE.ch2_stop_metal - 0.6, 121.5);
    const shakenCam = K.withShake(cam, t, [[CUE.ch2_stop_metal - 0.05, 14, 0.55]]);

    K.begin(c, shakenCam);
    drawSideGround(c, 0, { hills: false });

    // Cửa dốc sau đang mở khi đổ quân xong rồi đóng khít lại từ 122.4s -> 125.5s
    const rampCloseP = 1 - A.sm(t, 122.2, 125.2);

    drawIFV(c, 0, 0, {
      view: 'cutaway',
      rampOpen: rampCloseP,
      engineHit: hitP,
    });

    // Nhấn khung tiêu điểm vào khối động cơ gang đúc ở mũi khi chặn đứng viên đạn (113.8 – 121.8s)
    const engFocus = A.win(t, CUE.ch2_cast_iron_engine, 121.8, 0.35, 0.35);
    if (engFocus > 0) {
      U.focus(c, 92, -146, 114, 82, engFocus, P.amber, 5);
    }

    // Khi camera lia sang khoang bộ binh phía sau lúc cửa dốc đã đóng kín (125.0 – 129.95s),
    // nhấn khung viền quanh khoang sau để đặt câu hỏi dẫn vào Chương 3
    const rearFocus = A.win(t, CUE.ch2_what_happens_inside, 129.8, 0.4, 0.3);
    if (rearFocus > 0) {
      U.focus(c, -228, -156, 190, 98, rearFocus, P.sky, 5);
    }

    K.end(c);
  }
}
