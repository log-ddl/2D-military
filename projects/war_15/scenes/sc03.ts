// scenes/sc03.ts — Chương 3 (202.34 – 290.78s):
// Điểm mù 90 phút của tầng thấp trước tên lửa đạn đạo (30 phút) → Leo lên Quỹ đạo Địa tĩnh (36.000 km, 24h)
// làm Trạm cảnh báo sớm hồng ngoại và Trạm chuyển tiếp liên lạc (cùng nghịch lý giông bão / tán thông ướt).

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as R from './shared/rig';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import * as Assets from './_assets';
import { CUE } from './_cue';
import { ORBIT_WORLD } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── SHOT 3.1 (202.34 – 221.72s): ORBITAL / SIDE — Vệ tinh LEO khuất chân trời, Tên lửa đạn đạo rời giếng phóng (<30p vs 90p) ──
    if (t < 221.72) {
      const cam = K.track(
        t,
        [
          [202.34, { x: 960, y: 860, z: 1.32 }],
          [210.5, { x: 960, y: 860, z: 1.32 }],
          [214.0, { x: 960, y: 920, z: 1.48 }],
          [221.72, { x: 960, y: 900, z: 1.38 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      const { cx, cy, rEarth, rLeo } = ORBIT_WORLD;
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Vòng quỹ đạo LEO
      c.save();
      c.beginPath();
      c.arc(cx, cy, rLeo, -Math.PI * 0.8, -Math.PI * 0.2);
      c.setLineDash([16, 12]);
      c.strokeStyle = P.slate;
      c.lineWidth = lw;
      c.stroke();
      c.restore();

      Assets.drawEarthArc(c, cx, cy, rEarth, { showAtmo: true, showGrid: true });

      // Giữ 3 nguồn phát sóng mặt đất ở đầu chương (202.34 – 207.5s) để nối khớp 100% với cuối Chương 2
      const emitFade = 1 - A.sm(t, 206.0, 208.0);
      if (emitFade > 0.01) {
        A.withA(c, emitFade, () => {
          const emitters = [
            { x: cx - 210, y: cy - rEarth + 18, col: P.amber },
            { x: cx, y: cy - rEarth + 4, col: P.enemy },
            { x: cx + 210, y: cy - rEarth + 18, col: P.sky },
          ];
          for (const em of emitters) {
            A.rrect(c, em.x - 26, em.y - 24, 52, 24, 4, P.dark, P.ink, lw);
            A.line(c, [[em.x, em.y - 24], [em.x, em.y - 48]], P.ink, lw);
          }
        });
      }

      // Tiếp nối mượt vị trí sigAng = +0.18, sarAng = +0.46 từ cuối Chương 2 (t = 202.34s)
      const drift = (t - 202.34) * 0.085;
      const sigAng = 0.18 + drift;
      const sarAng = 0.46 + drift;

      const [sigX, sigY] = [cx + Math.sin(sigAng) * rLeo, cy - Math.cos(sigAng) * rLeo];
      const [sarX, sarY] = [cx + Math.sin(sarAng) * rLeo, cy - Math.cos(sarAng) * rLeo];

      Assets.drawRadarSat(c, sarX, sarY, 0.65, 'side', { rot: sarAng, highlightArray: 0.8 });
      Assets.drawSigintSat(c, sigX, sigY, 0.78, 'side', { rot: sigAng, listening: emitFade });

      // Khi vệ tinh đã khuất sang phải (t >= 206.5s): vùng đỉnh Trái Đất bị bỏ trống ("the target goes unwatched")
      if (t >= 206.5) {
        const blindP = A.sm(t, 206.5, 208.2);
        A.withA(c, blindP * 0.22, () => {
          A.poly(
            c,
            [
              [cx - 260, cy - rEarth + 30],
              [cx - 320, cy - rLeo - 40],
              [cx + 320, cy - rLeo - 40],
              [cx + 260, cy - rEarth + 30],
            ],
            P.slate,
            null,
            0
          );
        });
      }

      // Giếng phóng tên lửa đạn đạo tại đỉnh cung Trái Đất (cx - 80, cy - rEarth + 6)
      // Trước 212.5s giếng phóng còn đóng kín nắp phẳng dưới đất, tới 212.8s mới bật mở nắp và phóng tên lửa lên!
      const siloOpenP = A.sm(t, CUE.ch3_missile_silo - 0.5, CUE.ch3_missile_silo + 0.3);
      const launchP = A.eio(t, CUE.ch3_missile_silo + 0.2, 220.8);
      if (t >= 207.5) {
        A.withA(c, A.sm(t, 207.5, 208.8), () => {
          Assets.drawMissileAndSilo(c, cx - 80, cy - rEarth + 6, 0.88, {
            siloOpen: siloOpenP,
            launchHeight: launchP * 260,
            rot: launchP * 0.38,
            plume: t >= CUE.ch3_missile_silo + 0.2 ? 1 : 0,
          });
        });
      }

      // Khói bốc lên tại miệng giếng phóng khi tên lửa rời bệ
      if (t >= CUE.ch3_missile_silo + 0.3) {
        FX.smoke(c, cx - 80, cy - rEarth + 6, t - (CUE.ch3_missile_silo + 0.3), 0.9, 6, '#64748b', -15);
      }

      // Đường dự báo quỹ đạo đạn đạo cong sang mục tiêu bên phải
      if (t >= CUE.ch3_less_30m) {
        const arcP = A.sm(t, CUE.ch3_less_30m, 219.5);
        FX.arcShot(c, [cx - 80, cy - rEarth - 110], [cx + 290, cy - rEarth + 55], arcP, 180, {
          color: P.enemy,
          w: lw * 1.1,
        });
      }

      // Gạch bỏ biểu tượng vệ tinh LEO canh gác ở 218.5s ("A watchman that checks in once every hour and a half is useless")
      if (t >= CUE.ch3_watchman_useless) {
        const xp = A.sm(t, CUE.ch3_watchman_useless, 219.4);
        UI.xMark(c, cx + 220, cy - rLeo + 30, 36, xp, P.enemy, lw * 1.8);
      }

      K.end(c);

      // Hai callout đối chiếu thời gian: "90 min" (quỹ đạo LEO) vs "< 30 min" (tên lửa đạn đạo)
      if (t >= 211.5 && t <= 221.2) {
        UI.callout(c, '90 min', 1420, 290, {
          p: A.win(t, 211.5, 221.2, 0.25, 0.25),
          color: P.slate,
        });
      }
      if (t >= 216.2 && t <= 221.2) {
        const sp = K.toScreen(cam, cx - 40, cy - rEarth - 140);
        UI.callout(c, '< 30 min', sp[0] - 160, sp[1], {
          to: sp,
          p: A.win(t, 216.2, 221.2, 0.25, 0.25),
          color: P.enemy,
        });
      }
      return;
    }

    // ── SHOT 3.2 (221.72 – 241.26s): ORBITAL TOP-POLE — Leo lên 36.000 km & Đồng bộ chu kỳ 24h với Trái Đất ──
    if (t < 241.26) {
      const cam: K.Cam = { x: 960, y: 540, z: 1.0 };
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      const ecx = 960;
      const ecy = 560;
      const rE = 155;
      const rLeoSmall = 215;
      const rGeoBig = 435;

      // Vòng quỹ đạo LEO trong cùng (mờ) và vòng quỹ đạo Địa tĩnh GEO 36.000 km ngoài cùng
      c.save();
      c.beginPath();
      c.arc(ecx, ecy, rLeoSmall, 0, Math.PI * 2);
      c.setLineDash([10, 10]);
      c.strokeStyle = P.light;
      c.lineWidth = li;
      c.stroke();

      c.beginPath();
      c.arc(ecx, ecy, rGeoBig, 0, Math.PI * 2);
      c.setLineDash([18, 12]);
      c.strokeStyle = P.amber;
      c.lineWidth = lw;
      c.stroke();
      c.restore();

      // Giai đoạn 221.72 – 228.5s: Vệ tinh leo từ bán kính LEO (215) lên bán kính GEO (435) ("climbs to roughly 36,000 km")
      const climbP = A.eio(t, 222.2, 228.2);
      const curR = A.lerp(rLeoSmall, rGeoBig, climbP);

      // Giai đoạn 228.5 – 241.26s: Trái Đất và vệ tinh cùng quay đồng bộ với tốc độ góc bằng nhau ("takes 24 hours... Earth spins at the same rate underneath, the satellite hangs motionless over one spot")
      const syncAng = t < 228.5 ? 0 : A.lerp(0, Math.PI * 0.85, A.ph(t, 228.5, 241.26));

      // Vẽ quả cầu Trái Đất quay theo góc syncAng
      Assets.drawEarthArc(c, ecx, ecy, rE, {
        rot: syncAng,
        showAtmo: true,
        showGrid: true,
      });

      // Điểm mục tiêu cố định trên bề mặt Trái Đất quay cùng Trái Đất
      const spotX = ecx + Math.sin(syncAng) * (rE - 12);
      const spotY = ecy - Math.cos(syncAng) * (rE - 12);
      A.circle(c, spotX, spotY, 10, P.enemy, P.white, li);

      // Vị trí vệ tinh Địa tĩnh
      const satX = ecx + Math.sin(syncAng) * curR;
      const satY = ecy - Math.cos(syncAng) * curR;

      // Chùm tia khóa cứng nối từ Vệ tinh xuống đúng điểm mục tiêu trên mặt đất (chứng minh nó đứng yên so với mặt đất!)
      if (climbP > 0.8) {
        const coneDirX = Math.sin(syncAng);
        const coneDirY = -Math.cos(syncAng);
        const perpX = -coneDirY;
        const perpY = coneDirX;
        A.withA(c, 0.22, () => {
          A.poly(
            c,
            [
              [satX, satY],
              [spotX - perpX * 65, spotY - perpY * 65],
              [spotX + perpX * 65, spotY + perpY * 65],
            ],
            P.amber,
            null,
            0
          );
        });
        UI.dashed(c, [satX, satY], [spotX, spotY], P.amber, lw, 0);
      }

      // Mũi tên leo cao độ (khi đang leo)
      if (climbP > 0.05 && climbP < 0.98) {
        UI.arrow(c, [ecx, ecy - rLeoSmall], [ecx, satY + 45], {
          p: climbP,
          color: P.amber,
          w: 6,
        });
      }

      Assets.drawGeoWarningSat(c, satX, satY, 0.72, 'side', {
        rot: syncAng,
        irLock: climbP > 0.9 ? 1 : 0,
      });

      K.end(c);

      // Callout "36,000 km" và "24 h"
      if (t >= 225.2 && t <= 231.5) {
        const sp = K.toScreen(cam, satX, satY);
        UI.callout(c, '36,000 km', sp[0] + 170, sp[1], {
          to: sp,
          p: A.win(t, 225.2, 231.5, 0.25, 0.25),
          color: P.amber,
        });
      }
      if (t >= 232.5 && t <= 239.5) {
        UI.callout(c, '24 h', 1480, 210, {
          p: A.win(t, 232.5, 239.5, 0.25, 0.25),
          color: P.ink,
        });
      }
      return;
    }

    // ── SHOT 3.3 (241.26 – 258.90s): CUTAWAY → SIDE — Vệ tinh Cảnh báo sớm Hồng ngoại bắt luồng lửa tên lửa xuyên mây ──
    if (t < CUE.ch3_comms_satellites) {
      const cam = K.track(
        t,
        [
          [241.26, { x: 960, y: 340, z: 1.35 }],
          [246.5, { x: 960, y: 540, z: 1.02 }],
          [258.9, { x: 960, y: 540, z: 1.02 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Địa hình mặt đất ở y = 900: bên phải (x = 1380) là giếng phóng tên lửa đối phương dưới tầng mây (y = 660); bên trái (x = 380) là Sở chỉ huy phòng thủ phe ta
      Assets.drawSideTerrain(c, 80, 1840, 900, {
        clouds: [{ x: 1360, y: 660, w: 620, h: 110, dark: false }],
      });

      // Sở chỉ huy & Radar phòng thủ phe ta ở bên trái (x = 380)
      A.rrect(c, 290, 830, 140, 70, 6, P.olive, P.ink, lw);
      A.rrect(c, 315, 848, 42, 28, 3, P.glass, P.ink, li);
      // Chảo thu tín hiệu cảnh báo trên nóc HQ
      c.beginPath();
      c.arc(395, 815, 24, 0.1 * Math.PI, 0.9 * Math.PI);
      A.fs(c, P.paper, P.ink, lw);
      A.line(c, [[395, 830], [395, 805]], P.ink, lw);

      // Tên lửa đạn đạo phóng lên từ giếng (x = 1380, y = 900) xuyên qua lớp mây đúng lúc 248.2s ("The moment a booster clears the clouds")
      const boostP = A.eio(t, 245.0, 255.0);
      const misRot = -0.32 * boostP;

      Assets.drawMissileAndSilo(c, 1380, 900, 1.0, {
        siloOpen: 1,
        launchHeight: boostP * 480,
        rot: misRot,
        plume: 1,
      });

      // Vệ tinh cảnh báo sớm địa tĩnh ở trên cao (x = 960, y = 190), mở mặt cắt cutaway lộ cảm biến hồng ngoại
      const clearedClouds = boostP * 480 >= 230;
      Assets.drawGeoWarningSat(c, 960, 190, 1.35, 'cutaway', {
        rot: 0,
        irLock: clearedClouds ? 1 : 0,
      });

      // Khi tên lửa vượt lên trên mây (boostP * 480 >= 230): cảm biến hồng ngoại bắt trúng luồng lửa đuôi, khóa mục tiêu, tính điểm phóng & điểm rơi, và báo động về HQ!
      if (clearedClouds) {
        const lockP = A.sm(t, 248.5, 250.2);
        const plumePos: A.Pt = [1380 + Math.sin(misRot) * 20, 900 - boostP * 480 + 25];

        // Tia hồng ngoại từ luồng lửa tên lửa truyền thẳng lên kính thiên văn vệ tinh
        UI.dashed(c, plumePos, [960, 295], P.enemy, lw, -t * 140);
        UI.crosshair(c, plumePos[0], plumePos[1], 44, P.enemy, lockP, t * 1.5);

        // Từ 254.10s ("calculates where it launched and where it is heading, giving defenders their first warning"):
        if (t >= CUE.ch3_calculates_heading) {
          const calcP = A.sm(t, CUE.ch3_calculates_heading, 256.2);
          // 1) Đường truy ngược về điểm phóng (1380, 900)
          A.line(c, [[1380, 900], plumePos], P.amber, li, [10, 8]);
          UI.circleMark(c, 1380, 895, 34, calcP, P.amber, lw);
          // 2) Đường dự báo quỹ đạo bay sang mục tiêu phía trái
          FX.arcShot(c, plumePos, [520, 900], calcP, 190, {
            color: P.enemy,
            w: lw,
          });
          // 3) Đường truyền cảnh báo sớm từ vệ tinh thẳng xuống Sở chỉ huy phe ta (395, 815)
          UI.arrow(c, [920, 275], [405, 800], {
            p: A.sm(t, 256.2, 257.6),
            color: P.sky,
            w: 6,
          });
        }
      }

      K.end(c);
      return;
    }

    // ── SHOT 3.4 (258.90 – 290.78s): SIDE → CLOSE-UP — Vệ tinh Liên lạc Địa tĩnh & Nghịch lý giông bão / tán thông ướt ──
    const cam = K.track(
      t,
      [
        [258.9, { x: 960, y: 560, z: 0.98 }],
        [277.6, { x: 960, y: 560, z: 0.98 }],
        [284.5, { x: 1210, y: 740, z: 1.75 }],
        [290.78, { x: 1210, y: 740, z: 1.82 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    const lw = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const hasStorm = t >= 285.2;

    // Mặt cắt địa hình:
    // - Trái (x = 280): Sở chỉ huy (HQ)
    // - Giữa (x = 760): Dãy núi cao chắn sóng thẳng
    // - Phải vừa (x = 1140..1320): Rừng thông có toán tuần tra (Patrol behind mountains)
    // - Phải ngoài cùng (x = 1440..1860): Đại dương có Tàu chiến (Ship in mid-ocean)
    Assets.drawSideTerrain(c, 60, 1860, 880, {
      mountainAt: 760,
      mountainH: 250,
      oceanFrom: 1420,
      oceanTo: 1860,
      wavePhase: t,
      pineForestAt: { x: 1120, w: 220, wet: hasStorm },
    });

    // Sở chỉ huy ở bên trái (x = 280)
    A.rrect(c, 210, 810, 140, 70, 6, P.olive, P.ink, lw);
    A.line(c, [[280, 810], [280, 765]], P.ink, lw);
    A.circle(c, 280, 760, 9, P.sky, P.ink, li);

    // Toán lính tuần tra mang ăng-ten dã chiến dưới tán rừng thông (x = 1205, y = 880)
    R.rig(c, { x: 1175, y: 880, s: 0.72, dir: -1, skin: 'ally', weapon: 'rifle' });
    // Thiết bị điện đài & ăng-ten dã chiến đặt ở (1215, 880)
    A.rrect(c, 1200, 854, 30, 26, 4, P.oliveDark, P.ink, lw);
    A.line(c, [[1215, 854], [1215, 812]], P.ink, lw);
    A.circle(c, 1215, 808, 6, hasStorm ? P.enemy : P.sky, P.ink, li);

    // Tàu chiến ngoài biển (x = 1640, y = 886)
    Assets.drawWarship(c, 1640, 886, 1.05, 'side', 'ally', -1);

    // Vệ tinh Liên lạc Địa tĩnh ở đỉnh trời (x = 960, y = 185)
    Assets.drawGeoCommsSat(c, 960, 185, 1.35, 'side', {
      relayActive: 1,
    });

    // 261.82 – 270.36s: Sóng vô tuyến truyền thẳng bị chặn bởi dãy núi ("radio waves travel in straight lines... cannot talk directly")
    if (t >= CUE.ch3_curved_earth_blocked && t < CUE.ch3_relay_tower + 0.5) {
      const bP = A.win(t, CUE.ch3_curved_earth_blocked, CUE.ch3_relay_tower + 0.4, 0.3, 0.3);
      A.withA(c, bP, () => {
        UI.arrow(c, [1215, 812], [845, 760], { p: A.sm(t, 262.0, 263.8), color: P.enemy, w: 5 });
        UI.xMark(c, 830, 755, 28, A.sm(t, 263.8, 264.6), P.enemy, lw * 1.6);
      });
    }

    // Từ 270.36s ("acts as a relay tower in the sky, catching a beam from one continent and bouncing it to another"):
    if (t >= CUE.ch3_relay_tower) {
      const rP = A.sm(t, CUE.ch3_relay_tower, 273.0);
      // Đường sóng từ Sở chỉ huy (280, 760) lên Vệ tinh (900, 220) rồi phản xạ xuống Tàu chiến (1640, 815)
      UI.dashed(c, [280, 760], [900, 225], P.sky, lw, t * 130 * rP);
      UI.dashed(c, [1020, 225], [1640, 815], P.sky, lw, t * 130 * rP);

      // Đường sóng tới Toán tuần tra trong rừng thông (1215, 808):
      // Trước 285.2s: thông suốt; Từ 285.2s ("cut off by an afternoon thunderstorm or wet pine needles"): bị đám mây giông và tán thông ướt chặn đứt!
      if (!hasStorm) {
        UI.dashed(c, [995, 230], [1215, 808], P.sky, lw, t * 130 * rP);
      } else {
        // Đám mây giông kéo tới ở (1180, 560) có mưa rơi và tia chớp
        Assets.drawCloudLayer(c, 1180, 555, 340, 90, true, t);
        // Tia chớp giông chiều
        if (Math.sin(t * 14) > 0.2) {
          A.line(c, [[1165, 595], [1145, 645], [1175, 650], [1150, 705]], P.amber, lw * 1.2);
        }
        // Tia sóng từ vệ tinh đi xuống bị chặn tại đám mây giông & vòm lá thông ướt (y = 735)
        UI.dashed(c, [995, 230], [1195, 735], P.sky, lw, t * 60);
        UI.xMark(c, 1205, 765, 24, A.sm(t, 286.0, 286.8), P.enemy, lw * 1.6);
      }
    }

    K.end(c);

    // Callout "36,000 km" lúc nhắc lại ở 282.5s (chỉ hiện trước khi zoom cận vào rừng thông)
    if (t >= 281.5 && t <= 284.4) {
      const sp = K.toScreen(cam, 960, 185);
      UI.callout(c, '36,000 km', sp[0] + 170, sp[1], {
        to: sp,
        p: A.win(t, 281.5, 284.4, 0.2, 0.2),
        color: P.amber,
      });
    }
  }
}
