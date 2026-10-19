// scenes/sc04.ts — Chương 4 (200.70 – 289.50s): Tại sao đánh đổi chỗ ngồi lấy tháp pháo? Pháo tự động góc cao, Nạp đạn kép & ATGM.
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
  drawDualFeedMechanism,
  drawUrbanBuilding,
  drawEnemyLightArmor,
  drawDrone,
  drawSoldier,
  drawSideGround,
  drawTopMapBase,
} from './_assets';

export default class Sc04 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── CỤM 4.1 (200.70 – 217.30s): GIỚI HẠN CỦA PHÁO XE TĂNG — CHỈ ~40 VIÊN ĐẠN & GÓC NÂNG THẤP ──
    if (t < 217.3) {
      const toTank = A.sm(t, 207.2, 208.5);
      const cam = K.track(
        t,
        [
          [200.7, BOUNDARY.ch3_to_ch4.cam],
          [207.2, BOUNDARY.ch3_to_ch4.cam],
          [208.8, { x: 40, y: -110, z: 1.28 }],
          [217.3, { x: 60, y: -115, z: 1.25 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawSideGround(c, 0, { hills: true });

      if (toTank < 0.5) {
        // Bắt đầu từ đúng khung hình cuối Chương 3: chiếc IFV mặt cắt với giỏ tháp pháo ở giữa
        drawIFV(c, 0, 0, {
          view: 'cutaway',
          basketHighlight: 1 - A.sm(t, 202.0, 205.0),
          gunElev: -0.15 - Math.sin((t - 200.7) * 1.5) * 0.12,
        });
        const turFocus = A.win(t, 201.0, 207.0, 0.3, 0.3);
        if (turFocus > 0) {
          U.focus(c, -62, -230, 235, 175, turFocus, P.sky, 5);
        }
      } else {
        // 207.70 – 217.30s: Chiếc MBT với pháo 120mm lớn (~40 viên đạn) không thể ngóc cao lên tầng nhà
        const tankElev = -0.13 * A.sm(t, CUE.ch4_cannot_tilt_high - 0.3, 215.5);
        drawMBT(c, -165, 0, {
          view: 'cutaway',
          gunElev: tankElev,
          scale: 0.95,
        });

        // Tòa nhà 4 tầng bên phải với tổ súng máy đối phương trên tầng cao nhất
        drawUrbanBuilding(c, 360, 0, {
          floors: 4,
          width: 175,
          mgFiring: t > 214.0 ? (t * 4) % 1 : 0,
        });

        // Khung tiêu điểm vào khoang đạn 40 viên của xe tăng (209.5 – 213.8s)
        const ammoFocus = A.win(t, 209.5, 213.8, 0.3, 0.3);
        if (ammoFocus > 0) {
          U.focus(c, -225, -118, 130, 56, ammoFocus, P.amber, 4);
        }

        // Minh họa giới hạn góc nâng nòng pháo xe tăng (213.96 – 217.20s):
        // Tia ngắm đỏ của pháo tăng bị chặn thấp ở tầng 1, trong khi mục tiêu ở tầng 4!
        if (t >= CUE.ch4_cannot_tilt_high - 0.2) {
          const muzX = -65 + Math.cos(tankElev) * 200;
          const muzY = -158 + Math.sin(tankElev) * 200;
          A.line(c, [[muzX, muzY], [272, muzY + Math.tan(tankElev) * (272 - muzX)]], P.enemy, 4, [12, 8]);
          U.xMark(c, 272, muzY + Math.tan(tankElev) * (272 - muzX), 18, A.sm(t, 214.8, 215.4), P.enemy, 6);
        }
      }

      K.end(c);

      const cal40 = A.win(t, 211.8, 214.2, 0.25, 0.25);
      if (cal40 > 0 && toTank >= 0.5) {
        const pt = K.toScreen(cam, -160, -108);
        U.callout(c, '40 ROUNDS', pt[0], pt[1] - 85, {
          to: pt,
          p: cal40,
          color: P.amber,
        });
      }
      return;
    }

    // ── CỤM 4.2 (217.30 – 250.90s): 4 MỐI ĐE DỌA CỦA BỘ BINH & PHÁO TỰ ĐỘNG 25–40MM QUÉT GÓC CAO ──
    if (t < 250.9) {
      const cam = K.track(
        t,
        [
          [217.3, { x: 60, y: -125, z: 1.16 }],
          [229.8, { x: 60, y: -125, z: 1.16 }],
          [233.0, { x: 20, y: -115, z: 1.24 }],
          [250.9, { x: 45, y: -130, z: 1.22 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawSideGround(c, 0, { hills: true });

      const ifvEnter = A.sm(t, CUE.ch4_autocannon_25_40 - 0.3, 232.2);

      // Trước khi IFV tiến vào (217.3 – 230.2s): 3 người lính bộ binh đi bộ bên trái bị ghim đầu
      if (ifvEnter < 0.95) {
        A.withA(c, 1 - ifvEnter, () => {
          for (const [idx, sx] of [-410, -335, -260].entries()) {
            drawSoldier(c, sx, 0, {
              view: t > 222.0 ? 'side_crouch' : 'side_run',
              team: 'ally',
              weapon: 'rifle',
              facing: 1,
              walkPhase: t * 2 + idx * 0.3,
              scale: 0.98,
            });
          }
        });
      }

      // 4 MỐI ĐE DỌA XUẤT HIỆN TÁCH BIỆT RÕ RÀNG THEO VOICE (221.60 – 229.70s):
      // (1) Tầng cao tòa nhà ở x = 470 (machine gun teams on upper floors - 221.6s)
      const bldgHit = A.ph(t, 247.5, 249.2);
      drawUrbanBuilding(c, 470, 0, {
        floors: 4,
        width: 165,
        mgFiring: t >= 221.6 && t < 247.5 ? (t * 4.5) % 1 : 0,
        windowHit: bldgHit > 0 && bldgHit < 1 ? bldgHit : 0,
        scale: 0.92,
      });

      // (2) Tổ chống tăng ẩn trong hàng cây trên gò đồi x = 285, y = -95 (anti-tank crews tucked into tree lines - 223.8s)
      const showTreeAT = A.sm(t, 223.5, 224.3);
      if (showTreeAT > 0.01) {
        A.withA(c, showTreeAT, () => {
          // Gò đồi cao phía sau xe thiết giáp nhẹ
          A.poly(c, [[190, 0], [235, -95], [355, -95], [385, 0]], P.bg2, P.ink2, 2.5);
          A.circle(c, 265, -135, 34, P.oliveLight, P.ink, 3.5);
          A.circle(c, 308, -142, 40, P.olive, P.ink, 3.5);
          if (t < 248.8) {
            drawSoldier(c, 285, -95, {
              view: 'side_crouch',
              team: 'enemy',
              weapon: 'rpg',
              facing: -1,
              scale: 0.85,
            });
          }
          if (t >= 248.6 && t < 250.2) {
            F.explosion(c, 285, -120, 58, (t - 248.6) / 1.6, 4);
          }
        });
      }

      // (3) Xe thiết giáp nhẹ đối phương ở x = 85, y = 0 (light armored vehicles - 226.2s)
      const showLightArmor = A.sm(t, 226.0, 226.8);
      if (showLightArmor > 0.01) {
        const laShred = A.sm(t, 239.5, 243.5);
        A.withA(c, showLightArmor, () => {
          drawEnemyLightArmor(c, 85, 0, {
            facing: -1,
            scale: 0.74,
            shredded: laShred,
          });
        });
      }

      // (4) Drone bay thấp trên đầu ở x = 185, y = -285 (low-flying drones - 228.0s)
      const showDrone = A.sm(t, 227.8, 228.6);
      const droneHit = A.ph(t, 249.4, 250.6);
      if (showDrone > 0.01 && droneHit < 0.95) {
        const dx = 185 + Math.sin(t * 2.2) * 35;
        const dy = -285 + Math.cos(t * 3.1) * 12;
        A.withA(c, showDrone, () => {
          drawDrone(c, dx, dy, -0.12, 0.95, droneHit);
        });
      }

      // CHIẾC IFV TIẾN VÀO VỊ TRÍ x = -295 VỚI PHÁO TỰ ĐỘNG 25–40MM (229.94 – 250.90s):
      if (ifvEnter > 0.01) {
        const ifvX = A.lerp(-520, -295, ifvEnter);
        const highSweep = A.sm(t, CUE.ch4_tilts_steeply, 246.8);
        const sweepTargetElev = t < 248.5 ? -0.46 : t < 249.3 ? -0.24 : -0.58;
        const gunElev = A.lerp(-0.06, sweepTargetElev, highSweep);
        const isFiringBurst = (t >= 237.6 && t < 244.6) || (t >= 246.2 && t < 250.4);
        const burstCyc = isFiringBurst ? (t * 7.5) % 1 : 0;

        if (highSweep > 0.05) {
          const pivotX = ifvX + 75;
          const pivotY = -182;
          A.withA(c, highSweep * 0.22, () => {
            c.beginPath();
            c.moveTo(pivotX, pivotY);
            c.arc(pivotX, pivotY, 340, -0.62, 0.02);
            c.closePath();
            c.fillStyle = P.sky;
            c.fill();
          });
        }

        drawIFV(c, ifvX, 0, {
          view: 'side',
          wheelRot: ifvEnter * 18,
          gunElev,
          cannonFire: burstCyc,
          scale: 0.9,
        });

        if (isFiringBurst) {
          const pivotX = ifvX + 75;
          const pivotY = -182;
          const muzX = pivotX + Math.cos(gunElev) * 155;
          const muzY = pivotY + Math.sin(gunElev) * 155;
          const targetPt: A.Pt =
            t < 245.0
              ? [65, -55]
              : t < 248.5
              ? [425, -310]
              : t < 249.3
              ? [285, -120]
              : [185, -285];
          for (let b = 0; b < 3; b++) {
            const bp = ((t * 5.5 + b * 0.33) % 1 + 1) % 1;
            F.tracer(c, [muzX, muzY], targetPt, bp, 0.16, P.amber, 4.5);
          }
        }
      }

      K.end(c);

      const calCaliber = A.win(t, 234.8, 237.4, 0.25, 0.25);
      if (calCaliber > 0) {
        const pt = K.toScreen(cam, -125, -195);
        U.callout(c, '25–40 MM', pt[0], pt[1] - 82, {
          to: pt,
          p: calCaliber,
          color: P.sky,
        });
      }
      const calRpm = A.win(t, 242.5, 245.1, 0.25, 0.25);
      if (calRpm > 0) {
        const pt = K.toScreen(cam, -105, -195);
        U.callout(c, '200–500 RPM', pt[0], pt[1] - 82, {
          to: pt,
          p: calRpm,
          color: P.amber,
        });
      }
      return;
    }

    // ── CỤM 4.3 (250.90 – 262.68s): CƠ CHẾ NẠP ĐẠN KÉP (DUAL-FEED CUTAWAY: APFSDS TUNGSTEN vs HE AIRBURST) ──
    if (t < 262.68) {
      const cam: K.Cam = { x: 0, y: 0, z: 1.22 };
      K.begin(c, cam);

      const switchP = A.sm(t, CUE.ch4_flip_back_he - 0.2, CUE.ch4_flip_back_he + 0.65);
      const fireCyc = (t - 251.0) * 2.2;

      drawDualFeedMechanism(c, -290, 0, {
        mode: switchP < 0.5 ? 'ap' : 'he',
        switchP,
        fireCycle: fireCyc,
        scale: 0.92,
      });

      if (switchP < 0.5) {
        A.line(c, [[40, 95], [680, 95]], P.ink, LINE.outer);
        const shredP = A.ph(t, 252.2, 256.4);
        drawEnemyLightArmor(c, 360, 95, {
          facing: -1,
          scale: 0.98,
          shredded: shredP,
        });

        const dartP = (fireCyc % 1 + 1) % 1;
        const dx = A.lerp(45, 420, dartP);
        A.line(c, [[45, 0], [dx, 18]], P.sky, 3.5, [10, 6]);
        A.poly(c, [[dx - 24, 14], [dx + 14, 18], [dx - 24, 22]], P.ink, P.sky, 2);
      } else {
        const isAirburst = t >= 260.0;
        const shellP = ((t - 257.0) * 1.8) % 1;

        if (!isAirburst) {
          A.line(c, [[60, 140], [660, 140]], P.ink, LINE.outer);
          drawUrbanBuilding(c, 360, 140, {
            floors: 3,
            width: 185,
            windowHit: A.ph(t, 258.0, 259.9),
            scale: 0.92,
          });
          F.tracer(c, [45, 0], [315, -65], shellP, 0.22, P.amber, 5);
        } else {
          A.poly(
            c,
            [
              [80, 95],
              [260, 95],
              [280, 175],
              [440, 175],
              [460, 95],
              [660, 95],
            ],
            P.bg2,
            P.ink,
            LINE.outer
          );
          drawSoldier(c, 325, 175, { view: 'side_crouch', team: 'enemy', facing: -1, scale: 0.9 });
          drawSoldier(c, 395, 175, { view: 'side_crouch', team: 'enemy', facing: -1, scale: 0.9 });

          const burstP = A.ph(t, 260.4, 262.4);
          F.tracer(c, [45, 0], [360, -25], A.clamp01(burstP * 2.5), 0.25, P.amber, 5);
          if (burstP > 0.3) {
            const ep = (burstP - 0.3) / 0.7;
            F.explosion(c, 360, -25, 68, ep, 4);
            for (let s = -3; s <= 3; s++) {
              const sx = 360 + s * 22 * ep;
              const sy = -25 + 190 * ep;
              A.line(c, [[360, -25], [sx, sy]], P.enemy, 3, [6, 6]);
            }
          }
        }
      }

      K.end(c);
      return;
    }

    // ── CỤM 4.4 (262.68 – 289.50s): TÊN LỬA CHỐNG TĂNG ATGM, CHIẾN TRANH VÙNG VỊNH 1991 & BỊ ĐỊCH BẮN TRƯỚC TIÊN ──
    if (t < 270.5) {
      const cam = K.track(
        t,
        [
          [262.68, { x: 25, y: -155, z: 1.92 }],
          [266.8, { x: 120, y: -115, z: 1.42 }],
          [270.5, { x: 120, y: -115, z: 1.42 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawSideGround(c, 0, { hills: true });

      const strapP = A.back(t, 263.0, 264.8);
      const fireP = A.ph(t, 266.2, 269.2);

      drawIFV(c, -160, 0, {
        view: 'side',
        atgm: strapP,
        atgmFire: fireP > 0 && fireP < 0.25 ? fireP / 0.25 : 0,
      });

      if (t >= 265.5) {
        drawMBT(c, 420, 0, {
          view: 'side',
          team: 'enemy',
          facing: -1,
          scale: 0.78,
          destroyed: A.sm(t, 268.8, 270.2),
        });
      }

      if (fireP > 0 && fireP < 0.88) {
        const mp = fireP / 0.88;
        const mx = A.lerp(-95, 360, mp);
        const my = -192 + Math.sin(mp * Math.PI * 3) * 8;
        A.line(c, [[-95, -192], [mx, my]], P.amber, 2.5, [6, 4]);
        A.rrect(c, mx - 18, my - 5, 36, 10, 3, P.enemy, P.ink, 3);
        F.smoke(c, mx - 20, my, mp * 2, 0.45, 4);
      }
      if (fireP >= 0.85) {
        F.explosion(c, 375, -110, 95, (fireP - 0.85) / 0.15, 4);
      }

      K.end(c);
      return;
    }

    if (t < 283.1) {
      // 270.50 – 283.10s: Góc nhìn bản đồ TOP-DOWN Chiến tranh Vùng Vịnh 1991 — đội hình so le thoáng đãng
      const cam: K.Cam = { x: 0, y: 0, z: 1.18 };
      K.begin(c, cam);
      drawTopMapBase(c, { roadY: 0, rubble: false });

      drawIFV(c, -440, -195, {
        view: 'top',
        facing: 1,
        scale: 0.56,
        atgm: 1,
        atgmFire: A.win(t, 272.0, 273.0, 0.1, 0.2),
      });
      drawIFV(c, -440, -20, {
        view: 'top',
        facing: 1,
        scale: 0.56,
        atgm: 1,
        atgmFire: A.win(t, 273.4, 274.4, 0.1, 0.2),
      });
      drawMBT(c, -440, 195, {
        view: 'top',
        facing: 1,
        scale: 0.56,
        cannonFire: A.win(t, 275.5, 276.3, 0.1, 0.2),
      });

      // Đội hình 5 xe thiết giáp đối phương xếp so le (echelon) không chạm nhau:
      const targets: [number, number, number, 'ifv' | 'mbt'][] = [
        [210, -255, 272.2, 'ifv'],
        [450, -165, 273.0, 'ifv'],
        [210, -55, 273.8, 'ifv'],
        [450, 45, 274.6, 'ifv'],
        [330, 215, 275.8, 'mbt'],
      ];

      targets.forEach(([tx, ty, tFire, killer], idx) => {
        const shotP = A.ph(t, tFire, tFire + 1.1);
        const hitP = A.sm(t, tFire + 1.0, tFire + 2.2);
        const fromY = killer === 'ifv' ? (idx < 2 ? -195 : -20) : 195;

        if (shotP > 0 && shotP < 1) {
          F.straightShot(c, [-330, fromY], [tx, ty], shotP, {
            color: killer === 'ifv' ? P.amber : P.sky,
            w: 5,
          });
        }

        drawMBT(c, tx, ty, {
          view: 'top',
          team: 'enemy',
          facing: -1,
          scale: 0.5,
          destroyed: hitP,
        });

        if (hitP > 0.05 && hitP < 0.9) {
          F.explosion(c, tx, ty, 64, hitP, 4);
        }
      });

      K.end(c);

      // Callout "1991 GULF WAR"
      const calGulf = A.win(t, CUE.ch4_gulf_war_1991, 277.8, 0.25, 0.3);
      if (calGulf > 0) {
        U.callout(c, '1991 GULF WAR', 960, 110, {
          p: calGulf,
          color: P.ink,
        });
      }
      return;
    }

    // ── 283.10 – 289.50s: NGHỊCH LÝ KẾT CHƯƠNG 4 — KHI GẮN PHÁO & TÊN LỬA, ĐỊCH NGỪNG COI NÓ LÀ TAXI VÀ BẮN NÓ TRƯỚC TIÊN ──
    const cam = K.track(
      t,
      [
        [283.1, { x: 0, y: -90, z: 1.45 }],
        [286.5, BOUNDARY.ch4_to_ch5.cam],
        [289.5, BOUNDARY.ch4_to_ch5.cam],
      ],
      A.eio
    );

    K.begin(c, cam);
    drawSideGround(c, 0, { hills: true });

    drawIFV(c, 0, 0, {
      view: 'side',
      atgm: 1,
      armorLevel: 1,
    });

    // 3 tia ngắm chống tăng đỏ của địch từ bên phải khóa thẳng vào tháp pháo, khoang lính và mũi chiếc IFV (284.5 – 289.5s)
    const lockTargets: [number, number, number][] = [
      [25, -185, 284.6],
      [-95, -110, 285.4],
      [95, -105, 286.2],
    ];
    for (const [lx, ly, lt0] of lockTargets) {
      const lp = A.sm(t, lt0, lt0 + 0.6);
      if (lp > 0) {
        A.line(c, [[680, ly - 35], [lx, ly]], P.enemy, 3, [12, 8]);
        U.crosshair(c, lx, ly, 36, P.enemy, lp, (t - lt0) * 1.2);
      }
    }

    K.end(c);
  }
}
