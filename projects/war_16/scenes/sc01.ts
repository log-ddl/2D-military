// scenes/sc01.ts — Chương 1 (0.00 – 72.60s): Khởi nguồn BMP-1 (1966) và nghịch lý cỗ máy "lỡ cỡ" IFV.
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

export default class Sc01 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── CỤM 1.1 (0.00 – 14.50s): HOOK — BMP-1 chạy qua vùng đất chết hạt nhân, súng thò qua lỗ bắn ──
    if (t < 14.5) {
      const cam = K.track(
        t,
        [
          [0.0, { x: 15, y: -72, z: 1.95 }],
          [6.5, { x: 25, y: -72, z: 2.02 }],
          [8.6, { x: -35, y: -78, z: 2.38 }],
          [14.5, { x: -20, y: -78, z: 2.32 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawSideGround(c, 0, { nuclear: 1, hills: true });

      // Các hạt bụi phóng xạ trôi ngang ngược chiều xe chạy
      for (let i = 0; i < 24; i++) {
        const px = ((((i * 190 - t * 220) % 1800) + 1800) % 1800) - 900;
        const py = -340 + A.rnd(i + 5) * 310;
        A.circle(c, px, py, 3 + A.rnd(i) * 3, P.amber, null, 0);
      }

      // BMP-1 lao về phía trước (hiệu ứng xóc nhẹ trên mặt đất và bánh quay liên tục)
      const bobY = Math.sin(t * 9.5) * 2.5;
      const pitch = Math.sin(t * 7.2) * 0.015;
      const isCutaway = t >= CUE.ch1_pierced_ports;

      drawBMP1(c, 0, bobY, {
        view: isCutaway ? 'cutaway' : 'side',
        wheelRot: t * 6.5,
        pitch,
        firingPorts: 1,
        airFilter: 0,
      });

      // Vệt đạn vạch (tracers) bắn ra từ 4 lỗ bắn sườn vào màn bụi hạt nhân
      for (let i = 0; i < 4; i++) {
        const cyc = ((t * 2.4 + i * 0.25) % 1 + 1) % 1;
        const sx = -175 + i * 52;
        const sy = -90 + bobY;
        F.tracer(c, [sx + 36, sy], [sx + 340, sy - 18 + (i - 1.5) * 14], cyc, 0.18, P.amber, 4);
      }

      // Bụi cuốn dưới xích xe
      F.dust(c, -215, 0, (t * 2.2) % 1, 0.9);
      K.end(c);

      // Callout duy nhất xác định mẫu xe và năm ra đời khi voice đọc "in 1966, the BMP-1"
      const calP = A.win(t, CUE.ch1_bmp1_1966 - 0.2, 6.75, 0.25, 0.25);
      if (calP > 0) {
        const pt = K.toScreen(cam, 20, -148);
        U.callout(c, 'BMP-1 (1966)', pt[0] - 40, pt[1] - 85, {
          to: pt,
          p: calP,
          color: P.ink,
        });
      }
      return;
    }

    // ── CỤM 1.2 (14.50 – 26.35s): BÀI TOÁN CHIẾN TRANH LẠNH — Bộ binh chết vì sóng nổ, Xe tăng lẻ bị phục kích (TOP-DOWN) ──
    if (t < 26.35) {
      const cam = K.track(
        t,
        [
          [14.5, { x: -130, y: 0, z: 1.26 }],
          [21.6, { x: -130, y: 0, z: 1.32 }],
          [23.2, { x: 230, y: 0, z: 1.48 }],
          [26.35, { x: 255, y: 0, z: 1.54 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawTopMapBase(c, { roadY: 0, rubble: true });

      // 1. Vụ nổ hạt nhân & sóng xung kích quét qua bộ binh đi bộ bên trái (17.16 – 22.32s)
      const blastP = A.ph(t, CUE.ch1_atomic_blasts, 22.2);
      if (blastP > 0) {
        const r = A.lerp(40, 1150, A.eo(blastP, 0, 1));
        A.withA(c, (1 - blastP * 0.65) * 0.24, () => {
          A.circle(c, 50, -240, r, P.amber, null, 0);
        });
        F.shock(c, 50, -240, r, blastP, 5, P.enemy);
        if (blastP < 0.45) {
          F.explosion(c, 50, -240, 140, blastP / 0.45, 4);
        }
      }

      // 4 người lính bộ binh đi bộ ngoài trời bên trái bị sóng xung kích quét ngã (19.18 – 22.32s)
      const infPositions: [number, number][] = [
        [-450, -65],
        [-365, 48],
        [-285, -45],
        [-210, 56],
      ];
      infPositions.forEach(([ix, iy], idx) => {
        const hitTime = CUE.ch1_infantry_die + idx * 0.38;
        const downP = A.sm(t, hitTime, hitTime + 0.55);
        const walkX = ix + A.lerp(0, 45, A.ph(t, 14.5, hitTime));
        c.save();
        c.translate(walkX, iy);
        if (downP > 0.05) {
          U.ring(c, 0, 0, 38, A.ph(t, hitTime, hitTime + 0.9), P.enemy, 4);
          c.globalAlpha = A.lerp(1, 0.45, downP);
        }
        drawSoldier(c, 0, 0, {
          view: 'top',
          team: 'ally',
          weapon: 'rifle',
          facing: 1,
          scale: 1.05,
        });
        if (downP > 0.5) {
          U.xMark(c, 0, 0, 18, A.sm(t, hitTime + 0.2, hitTime + 0.6), P.enemy, 5);
        }
        c.restore();
      });

      // 2. Chiếc xe tăng (MBT) tiến một mình vào giữa đống đổ nát bên phải, bị phục kích RPG (22.54 – 26.35s)
      const tankX = A.lerp(-40, 265, A.sm(t, 21.5, 25.2));
      const rpg1P = A.ph(t, CUE.ch1_ambushed_rubble - 0.2, 25.15);
      const rpg2P = A.ph(t, CUE.ch1_ambushed_rubble + 0.25, 25.6);
      const tankHit = A.sm(t, 25.1, 26.2);

      drawMBT(c, tankX, 0, {
        view: 'top',
        facing: 1,
        scale: 0.74,
        destroyed: tankHit,
      });

      // 2 tổ diệt tăng RPG đối phương ẩn nấp sau khối nhà đổ nát phía trên & phía dưới
      const ambushers: [number, number, number][] = [
        [235, -195, rpg1P],
        [325, 185, rpg2P],
      ];
      const appearP = A.sm(t, CUE.ch1_tanks_alone + 0.3, CUE.ch1_ambushed_rubble);
      if (appearP > 0.01) {
        A.withA(c, appearP, () => {
          for (const [ax, ay, rp] of ambushers) {
            c.save();
            c.translate(ax, ay);
            c.rotate(Math.atan2(-ay, tankX - ax));
            drawSoldier(c, 0, 0, {
              view: 'top',
              team: 'enemy',
              weapon: 'rpg',
              facing: 1,
              firing: rp > 0 && rp < 0.35 ? rp / 0.35 : 0,
              scale: 1.05,
            });
            c.restore();

            if (rp > 0 && rp < 1) {
              F.straightShot(c, [ax, ay], [tankX, ay * 0.18], rp, {
                color: P.enemy,
                w: 5,
              });
            }
          }
        });
      }
      if (rpg1P >= 0.95) {
        F.explosion(c, tankX - 15, -32, 72, A.ph(t, 25.1, 26.1), 4);
      }
      if (rpg2P >= 0.95) {
        F.explosion(c, tankX + 25, 32, 68, A.ph(t, 25.55, 26.3), 4);
      }

      K.end(c);
      return;
    }

    // ── CỤM 1.3 (26.35 – 48.90s): GIẢI PHÁP HỘP THÉP KÍN KHÍ & NGHỊCH LÝ SAO CHÉP (SIDE CUTAWAY -> SIDE) ──
    if (t < 48.9) {
      const copyPhase = A.sm(t, CUE.ch1_every_army_copied - 0.3, 47.5);
      const cam = K.track(
        t,
        [
          [26.35, { x: 10, y: -76, z: 2.02 }],
          [38.8, { x: 10, y: -76, z: 2.02 }],
          [44.5, { x: 10, y: -76, z: 1.85 }],
          [46.8, { x: 10, y: 15, z: 1.32 }],
          [48.9, { x: 10, y: 15, z: 1.32 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      const nucFade = 1 - A.sm(t, CUE.ch1_never_came, 41.5);
      const bmpY = A.lerp(0, -105, copyPhase);

      if (copyPhase < 0.05) {
        drawSideGround(c, 0, { nuclear: nucFade, hills: true });
      } else {
        // Mặt đường cho 2 xe đối chiếu trên/dưới (cách nhau 300px không bao giờ đè nhau)
        A.line(c, [[-1200, bmpY], [1200, bmpY]], P.ink, LINE.outer);
        A.line(c, [[-1200, 195], [1200, 195]], P.ink, LINE.outer);
      }

      const airP = A.win(t, CUE.ch1_air_filtration - 0.3, 38.8, 0.4, 0.5);
      const portsActive = t >= CUE.ch1_periscopes_ports && t < CUE.ch1_ports_useless ? 1 : 0;
      const weldedP = A.sm(t, CUE.ch1_ports_useless + 0.4, 44.6);
      const turFire = A.ph(t, 35.8, 36.7);

      // Hạt bụi độc bên ngoài bị luồng áp suất dương đẩy dạt ra khỏi thân xe (28.80 – 38.48s)
      if (airP > 0.05) {
        A.withA(c, airP, () => {
          A.rrect(c, -252, bmpY - 176, 520, 174, 34, null, P.sky, 3);
        });
      }

      drawBMP1(c, 0, bmpY, {
        view: t < 41.8 ? 'cutaway' : 'side',
        wheelRot: t * 4.2,
        airFilter: airP,
        firingPorts: portsActive,
        portsWelded: weldedP,
        turretFire: turFire > 0 && turFire < 1 ? turFire : 0,
      });

      // Khi nhắc "and the rifle ports turned out to be nearly useless" (42.40–44.84)
      if (t >= 41.8 && t < 44.8) {
        const wildP = A.ph(t, 41.8, 44.2);
        F.tracer(c, [-140, bmpY - 94], [180, bmpY - 240], (wildP * 3) % 1, 0.2, P.enemy, 4);
        F.tracer(c, [-90, bmpY - 94], [220, bmpY - 15], (wildP * 3 + 0.4) % 1, 0.2, P.enemy, 4);
      }

      // Khi nhắc "yet every major army on earth still copied the machine" (45.12–48.66)
      if (copyPhase > 0.01) {
        const ifvX = A.lerp(-420, 0, copyPhase);
        drawIFV(c, ifvX, 195, {
          view: 'side',
          wheelRot: t * 4.2,
          armorLevel: 1,
          atgm: 1,
        });
      }

      K.end(c);
      return;
    }

    // ── CỤM 1.4 (48.90 – 72.60s): CÂU HỎI TRUNG TÂM — So sánh APC / MBT / Xe tải vs IFV & Chạy đồng tốc ──
    const cam = K.track(
      t,
      [
        [48.9, { x: 0, y: -10, z: 1.24 }],
        [63.5, { x: 0, y: -10, z: 1.26 }],
        [66.2, { x: 10, y: 85, z: 1.68 }], // Tiến vào IFV để lộ giải phẫu thân xe
        [69.0, BOUNDARY.ch1_to_ch2.cam],    // Lùi ra thấy MBT (trên) và IFV (dưới) chạy đồng tốc
        [72.6, BOUNDARY.ch1_to_ch2.cam],
      ],
      A.eio
    );

    K.begin(c, cam);

    if (t < CUE.ch1_how_laid_out) {
      // Bố cục bàn cân đối chiếu chặt chẽ, rõ nét ở z = 1.25:
      const showAPC = A.sm(t, CUE.ch1_fewer_soldiers - 0.2, CUE.ch1_fewer_soldiers + 0.6);
      const showMBT = A.sm(t, CUE.ch1_thinner_armor - 0.2, CUE.ch1_thinner_armor + 0.6);
      const showTruck = A.sm(t, CUE.ch1_fortune_truck - 0.2, CUE.ch1_fortune_truck + 0.6);

      // 1. Chiếc IFV ở trung tâm dưới (y = 175)
      const ifvCenterX = A.lerp(0, -230, showTruck * (1 - A.sm(t, 59.2, 60.2)));
      A.line(c, [[-720, 175], [720, 175]], P.ink, LINE.outer);
      drawIFV(c, ifvCenterX, 175, {
        view: 'cutaway',
        scale: 0.9,
        basketHighlight: A.sm(t, 51.5, 53.5),
      });

      // 2. APC (M113) ở góc trên trái (-320, -110): khoang dài chở 12 lính
      if (showAPC > 0.01) {
        A.withA(c, showAPC, () => {
          A.line(c, [[-720, -110], [-30, -110]], P.ink2, LINE.inner);
          drawAPC(c, -330, -110, {
            type: 'apc',
            view: 'cutaway',
            scale: 0.86,
          });
        });
      }

      // 3. MBT ở góc trên phải (+320, -110): giáp mũi siêu dày
      if (showMBT > 0.01) {
        A.withA(c, showMBT, () => {
          A.line(c, [[30, -110], [720, -110]], P.ink2, LINE.inner);
          drawMBT(c, 320, -110, {
            view: 'cutaway',
            scale: 0.82,
          });
        });
      }

      // 4. Xe tải 6x6 ở góc dưới phải (+290, +175)
      if (showTruck > 0.01) {
        const truckAlpha = showTruck * (1 - A.sm(t, 59.5, 60.6));
        A.withA(c, truckAlpha, () => {
          drawAPC(c, 290, 175, {
            type: 'truck',
            scale: 0.86,
          });
        });
      }

      // Khung ngắm khoanh vào chiếc IFV "awkward middleweight" (59.14 – 63.70s)
      const focusP = A.win(t, CUE.ch1_awkward_middleweight, 63.7, 0.35, 0.35);
      if (focusP > 0) {
        U.focus(c, ifvCenterX - 235, -15, 470, 200, focusP, P.amber, 5);
      }
    } else {
      // 63.96 – 72.60s: Mở mặt cắt giải phẫu IFV và cho Xe tăng chủ lực (MBT) lao ĐỒNG TỐC song song!
      const moveP = A.ph(t, CUE.ch1_same_speed - 0.5, 72.6);
      const wheelRot = moveP * 26;
      const mbtEnter = A.sm(t, CUE.ch1_same_speed - 0.8, CUE.ch1_same_speed + 0.6);

      const [mbtX, mbtY] = BOUNDARY.ch1_to_ch2.mbtPos;
      const [ifvX, ifvY] = BOUNDARY.ch1_to_ch2.ifvPos;

      A.line(c, [[-1200, mbtY], [1200, mbtY]], P.ink, LINE.outer);
      A.line(c, [[-1200, ifvY], [1200, ifvY]], P.ink, LINE.outer);

      const speedLinesAlpha = A.win(t, CUE.ch1_same_speed, 72.1, 0.3, 0.4);
      if (speedLinesAlpha > 0.01) {
        A.withA(c, speedLinesAlpha, () => {
          for (let i = 0; i < 10; i++) {
            const lx = ((((i * 220 - moveP * 1400) % 2000) + 2000) % 2000) - 1000;
            A.line(c, [[lx, mbtY + 18], [lx + 90, mbtY + 18]], P.amber, 4);
            A.line(c, [[lx, ifvY + 18], [lx + 90, ifvY + 18]], P.amber, 4);
          }
          A.line(c, [[190, mbtY - 60], [190, ifvY - 60]], P.sky, 4, [10, 8]);
        });
      }

      if (mbtEnter > 0.01) {
        const curMbtX = A.lerp(-520, mbtX, mbtEnter);
        drawMBT(c, curMbtX, mbtY, {
          view: 'cutaway',
          wheelRot,
          scale: 0.92,
        });
      }

      drawIFV(c, ifvX, ifvY, {
        view: 'cutaway',
        wheelRot,
        scale: 0.92,
        basketHighlight: A.win(t, 64.2, 68.2, 0.3, 0.3),
      });
    }

    K.end(c);
  }
}
