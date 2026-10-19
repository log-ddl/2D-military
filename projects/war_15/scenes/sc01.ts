// scenes/sc01.ts — Chương 1 (0.00 – 74.76s):
// Từ chiếc móc thép vớt khoang phim đồng năm 1960 đến bài toán 3 tầng quỹ đạo.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as M from './shared/map';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import * as Assets from './_assets';
import { CUE } from './_cue';
import { ORBIT_WORLD, drawThreeLayersWorld, CAM_THREE_LAYERS_WIDE, CAM_CH1_END } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── SHOT 1.1A (0.00 – 6.20s): TOP VIEW — Vệ tinh Corona chụp sân bay Liên Xô ──
    if (t < 6.2) {
      const cam = K.track(
        t,
        [
          [0.0, { x: 960, y: 540, z: 1.05 }],
          [3.5, { x: 990, y: 540, z: 1.15 }],
          [6.2, { x: 1020, y: 540, z: 1.18 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      M.mapBg(c, cam, { color: '#eae4d0', grid: 120 });

      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Đường băng chính và đường lăn sân bay Liên Xô
      A.rrect(c, 320, 440, 1280, 130, 8, '#cbd5e1', P.ink, lw);
      A.line(c, [[360, 505], [1560, 505]], P.white, lw, [36, 28]);
      // 3 sân đỗ máy bay ném bom (aprons) phía trên đường băng
      for (const bx of [580, 960, 1340]) {
        A.rrect(c, bx - 115, 210, 230, 175, 10, '#d8e0e8', P.ink, lw);
        A.rrect(c, bx - 38, 375, 76, 70, 0, '#cbd5e1', P.ink, li);
        Assets.drawParkedBomber(c, bx, 295, 1.05, 'top', 'foe', -Math.PI / 2);
      }

      // Khung quét ảnh quang học của vệ tinh chạy ngang sân bay từ trái sang phải
      const scanX = A.lerp(420, 1460, A.eio(t, 0.0, 4.8));
      A.withA(c, 0.22, () => {
        A.rrect(c, scanX - 180, 160, 360, 520, 8, P.amber, null, 0);
      });
      UI.focus(c, scanX - 180, 160, 360, 520, A.sm(t, 0.0, 0.6), P.amber, lw * 1.2);

      // Chớp chụp ảnh tại từng sân đỗ (1.2s, 2.5s, 3.8s)
      for (const ft of [1.2, 2.5, 3.8]) {
        const fp = A.bump(t, ft, 0.35);
        if (fp > 0) {
          A.withA(c, fp * 0.45, () => {
            A.rrect(c, scanX - 180, 160, 360, 520, 8, P.white, null, 0);
          });
        }
      }

      // Vệ tinh Corona bay lướt qua ở lớp tiền cảnh phía trên
      const satX = A.lerp(360, 1520, A.ph(t, 0.0, 6.2));
      Assets.drawCoronaSat(c, satX, 740, 1.35, 'top', { capsuleAttached: true });

      // Từ 5.28s ("had no way to send the pictures home"): tia sóng phát ra bị đứt gãy + dấu X
      if (t >= CUE.ch1_no_way_send) {
        const wp = A.sm(t, CUE.ch1_no_way_send, 6.0);
        A.line(c, [[satX, 680], [satX - 120 * wp, 540]], P.sky, lw, [12, 10]);
        UI.xMark(c, satX - 95, 575, 28, wp, P.enemy, lw * 1.6);
      }

      K.end(c);
      return;
    }

    // ── SHOT 1.1B & 1.2 (6.20 – 20.60s): CUTAWAY → SIDE — Đẩy khoang phim đồng, đốt tên lửa hãm, bung dù ──
    if (t < 20.6) {
      // Quỹ đạo rơi của khoang phim trong thế giới dọc:
      // y = 300: Quỹ đạo vệ tinh Corona
      // y = 850: Ranh giới khí quyển
      // y = 1480: Bầu trời mở dù
      // y = 1880: Mặt biển Thái Bình Dương
      const ejectP = A.eio(t, CUE.ch1_pushed_capsule, 14.6);
      const retroP = A.win(t, CUE.ch1_braking_rocket, 17.1, 0.2, 0.3);
      const dropP = A.eio(t, 15.6, 19.6);

      // Vị trí khoang phim sau khi tách
      const capX = 960 + ejectP * 230 + dropP * 120;
      const capY = 300 + dropP * 1120;
      // Góc xoay khoang phim: ban đầu nằm ngang (0), khi đốt tên lửa hãm & rơi thì chúc mũi đồng xuống (+Math.PI/2)
      const capRot = A.lerp(0, Math.PI / 2, A.eio(t, 14.8, 17.5));

      const cam = K.track(
        t,
        [
          [6.2, { x: 880, y: 310, z: 1.85 }],
          [11.0, { x: 930, y: 310, z: 1.92 }],
          [14.8, { x: 1120, y: 320, z: 1.65 }],
          [17.5, { x: 1240, y: 860, z: 1.28 }],
          [20.6, { x: 1310, y: 1260, z: 1.22 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Lưới tọa độ không gian mảnh phía trên & Đường cong khí quyển mờ
      for (let gy = 100; gy <= 700; gy += 120) {
        A.line(c, [[-200, gy], [2400, gy]], 'rgba(71,85,105,0.10)', li);
      }
      for (let gx = 200; gx <= 2000; gx += 180) {
        A.line(c, [[gx, 0], [gx, 780]], 'rgba(71,85,105,0.10)', li);
      }

      // Ranh giới khí quyển (y = 780..920)
      A.rrect(c, -200, 780, 2600, 120, 0, 'rgba(56,189,248,0.14)', null, 0);
      A.line(c, [[-200, 780], [2400, 780]], P.sky, li, [18, 14]);

      // Mặt biển Thái Bình Dương ở đáy (y = 1760)
      Assets.drawSideTerrain(c, -200, 2400, 1760, {
        oceanFrom: -200,
        oceanTo: 2400,
        wavePhase: t,
      });

      // Vệ tinh Corona ở y = 300 (dùng mặt cắt cutaway để thấy cuộn phim và lò xo đẩy)
      const satDriftX = 820 - A.sm(t, 14.5, 18.0) * 260;
      Assets.drawCoronaSat(c, satDriftX, 300, 1.35, 'cutaway', {
        capsuleAttached: false,
        ejectProgress: ejectP,
        filmRollPhase: t * 3.5,
      });

      // Trước 11.18s: biểu tượng sóng radio bị gạch bỏ bên dưới vệ tinh để giải thích "Digital cameras and fast radio links did not exist yet"
      if (t < CUE.ch1_pushed_capsule) {
        const wAlpha = A.win(t, 6.4, 11.0, 0.3, 0.3);
        A.withA(c, wAlpha, () => {
          for (let r = 1; r <= 3; r++) {
            c.beginPath();
            c.arc(satDriftX, 410, r * 32, 0.25 * Math.PI, 0.75 * Math.PI);
            c.strokeStyle = P.sky;
            c.lineWidth = lw;
            c.stroke();
          }
          UI.xMark(c, satDriftX, 465, 32, A.sm(t, 7.6, 8.3), P.enemy, lw * 1.6);
        });
      }

      // Vẽ khoang phim bằng đồng (gắn ở đầu mũi khi t < 11.18, sau đó đẩy ra và rơi xuống)
      const heatP = A.win(t, 16.4, 18.7, 0.3, 0.4);
      const chuteP = A.eo(t, CUE.ch1_parachute_pacific - 0.1, 20.1);

      // Khi dù bung ở 18.7s, vẽ dù thẳng đứng phía trên khoang phim còn thân khoang xoay theo capRot
      if (chuteP > 0.01) {
        Assets.drawFilmCapsule(c, capX, capY, 1.35, 'cutaway', {
          rot: 0,
          chuteOpen: chuteP,
        });
      } else {
        Assets.drawFilmCapsule(c, capX, capY, 1.35, t < 15.0 ? 'cutaway' : 'side', {
          rot: capRot,
          retroThrust: retroP,
          heatGlow: heatP,
          chuteOpen: 0,
        });
      }

      // Khói lửa khi đốt tên lửa hãm ở 15.42s
      if (t >= CUE.ch1_braking_rocket && t < 17.5) {
        FX.smoke(c, capX - 65, capY - 20, t - CUE.ch1_braking_rocket, 0.9, 6, '#94a3b8', -18);
      }

      K.end(c);
      return;
    }

    // ── SHOT 1.3 (20.60 – 35.32s): SIDE + TOP + SIDE — Máy bay C-119 ở 4.000m ngoắc dù giữa không trung ──
    if (t < CUE.ch1_replaced_by_radio) {
      // Giai đoạn ngắn 24.00 – 26.40s chuyển sang góc TOP để thấy rõ cửa đuôi mở và khung dây cáp chữ V gắn móc thép ("trailing steel hooks behind its open tail ramp")
      if (t >= 24.0 && t < 26.4) {
        const camTop: K.Cam = { x: 1020, y: 540, z: 1.35 };
        K.begin(c, camTop);
        const lw = A.px(c, LINE.outer);
        const li = A.px(c, LINE.inner);

        // Nền mặt biển nhìn từ trên xuống với gợn sóng
        A.rrect(c, 0, 0, 1920, 1080, 0, '#d6eaf4', null, 0);
        for (let wy = 160; wy <= 920; wy += 140) {
          A.line(c, [[200, wy], [1720, wy]], 'rgba(56,189,248,0.35)', li, [40, 35]);
        }

        // Vòm dù tròn nhìn từ trên xuống ở phía trước đường móc
        const chuteTopX = 920;
        const chuteTopY = 540;
        A.circle(c, chuteTopX, chuteTopY, 120, P.paper, P.ink, lw);
        A.circle(c, chuteTopX, chuteTopY, 74, P.amber, P.ink, li);
        A.circle(c, chuteTopX, chuteTopY, 18, P.amber, P.ink, lw);

        // Máy bay C-119 vừa bay qua đỉnh dù, kéo khung cáp chữ V phía sau đuôi áp sát khuyên dù
        const planeTopX = A.lerp(980, 1240, A.ph(t, 24.0, 26.4));
        Assets.drawCatchPlane(c, planeTopX, 540, 1.35, 'top', {
          hookExtend: A.sm(t, 24.0, 24.6),
        });

        K.end(c);
        return;
      }

      // Góc SIDE chính (20.60–24.00s và 26.40–35.32s):
      // Mặt biển ở y = 940; độ cao 4.000m ở y = 300
      const snagTime = CUE.ch1_snagged_midair + 0.35; // 27.11s: thời điểm móc thép chạm khuyên dù
      const caught = t >= snagTime;

      // Vị trí máy bay C-119 bay ngang từ trái sang phải ở y = 260
      const planeX = A.lerp(420, 1820, A.ph(t, 20.6, 35.3));
      const planeY = 260;
      // Đầu móc thép nằm ở (planeX - 292 * scale, planeY + 92 * scale)
      const planeScale = 1.3;
      const hookX = planeX - 292 * planeScale;
      const hookY = planeY + 92 * planeScale; // = 260 + 119.6 = 379.6

      // Với drawFilmCapsule(s = 1.05, chuteOpen = 1), vòng khuyên đỉnh dù nằm ở capY - 450 * 1.05 = capY - 472.5
      // Để tại t = snagTime (27.11s), khuyên đỉnh dù khớp chính xác với (hookX, hookY):
      const snagHookX = A.lerp(420, 1820, (snagTime - 20.6) / (35.3 - 20.6)) - 292 * planeScale;
      const ringOffset = 472.5;
      const preFallCapY = A.lerp(hookY + ringOffset - 55, hookY + ringOffset, A.ph(t, 20.6, snagTime));
      const postPullP = A.eo(t, snagTime, 33.5);
      // Khi caught: khuyên đỉnh dù (capX, capY - ringOffset) dính chặt vào đầu móc (hookX, hookY) và dây cáp thu dần vào bụng máy bay
      const winchInX = postPullP * 85;
      const winchInY = postPullP * 45;
      const capX = caught ? hookX + winchInX : snagHookX;
      const capY = caught ? hookY + ringOffset - winchInY : preFallCapY;

      const cam = K.track(
        t,
        [
          [20.6, { x: 860, y: 540, z: 1.0 }],
          [23.8, { x: 920, y: 480, z: 1.12 }],
          [26.5, { x: 980, y: 490, z: 1.28 }],
          [28.5, { x: 1120, y: 470, z: 1.22 }],
          [35.3, { x: 1380, y: 460, z: 1.08 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);

      // Đám mây tầng thấp & mặt biển Thái Bình Dương ở đáy
      Assets.drawSideTerrain(c, -200, 2600, 940, {
        oceanFrom: -200,
        oceanTo: 2600,
        wavePhase: t,
        clouds: [
          { x: 420, y: 690, w: 320, h: 75 },
          { x: 1580, y: 720, w: 360, h: 80 },
        ],
      });

      // Vẽ khoang phim + dù
      Assets.drawFilmCapsule(c, capX, capY, 1.05, 'cutaway', {
        chuteOpen: 1,
      });

      // Vẽ máy bay C-119 kéo móc thép
      Assets.drawCatchPlane(c, planeX, planeY, planeScale, 'side', {
        dir: 1,
        propPhase: t,
        hookExtend: 1,
        caughtCapsule: caught,
      });

      // Tia lửa/vòng nhấn ngay khoảnh khắc móc thép ngoắc trúng khuyên dù (27.11s)
      const hitBump = A.bump(t, snagTime, 0.55);
      if (hitBump > 0) {
        FX.sparks(c, hookX, hookY, 1 - hitBump, 1.1, Math.PI, Math.PI, 3);
        UI.ring(c, hookX, hookY, 65, 1 - hitBump, P.amber, lw * 1.4);
      }

      K.end(c);

      // Callout duy nhất của đoạn: "4,000 m" khi voice đọc "A cargo aircraft flew past at 4,000 meters"
      if (t >= 22.4 && t <= 23.95) {
        const sp = K.toScreen(cam, planeX, planeY - 55);
        UI.callout(c, '4,000 m', sp[0], sp[1] - 70, {
          to: sp,
          p: A.win(t, 22.4, 23.95, 0.25, 0.25),
          color: P.ink,
        });
      }
      return;
    }

    // ── SHOT 1.4 (35.32 – 74.76s): ORBITAL / SIDE — Sóng số thay móc câu, Đường ray cố định & 3 Tầng quỹ đạo ──
    // Fase A (35.32 – 62.04s): Vệ tinh hiện đại truyền tia số, không thể đứng yên, trượt trên "đường ray" quỹ đạo cố định
    // Fase B (62.04 – 74.76s): Mở ra 3 tầng quỹ đạo (ORBIT_WORLD) và tiến vào tầng thấp LEO để nối mượt sang Chương 2
    const cam = K.track(
      t,
      [
        [35.32, { x: 960, y: 860, z: 1.35 }],
        [46.68, { x: 960, y: 840, z: 1.25 }],
        [55.44, { x: 960, y: 860, z: 1.18 }],
        [62.04, CAM_THREE_LAYERS_WIDE],
        [70.5, CAM_THREE_LAYERS_WIDE],
        [74.76, CAM_CH1_END],
      ],
      A.eio
    );

    K.begin(c, cam);
    const lw = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    if (t < CUE.ch1_orbital_altitude) {
      const { cx, cy, rEarth, rLeo } = ORBIT_WORLD;

      // Vẽ đường ray quỹ đạo cố định ("moves along a fixed path that any astronomer can calculate in advance")
      const railAlpha = A.sm(t, 49.5, 51.2);
      c.save();
      c.beginPath();
      c.arc(cx, cy, rLeo, -Math.PI * 0.8, -Math.PI * 0.2);
      c.strokeStyle = P.slate;
      c.lineWidth = lw;
      c.stroke();
      if (railAlpha > 0.01) {
        A.withA(c, railAlpha, () => {
          c.beginPath();
          c.arc(cx, cy, rLeo - 14, -Math.PI * 0.8, -Math.PI * 0.2);
          c.strokeStyle = P.dark;
          c.lineWidth = li;
          c.stroke();
          // Các thanh tà-vẹt đường ray dọc theo quỹ đạo
          for (let a = -0.55; a <= 0.55; a += 0.045) {
            const rx0 = cx + Math.sin(a) * (rLeo - 18);
            const ry0 = cy - Math.cos(a) * (rLeo - 18);
            const rx1 = cx + Math.sin(a) * (rLeo + 6);
            const ry1 = cy - Math.cos(a) * (rLeo + 6);
            A.line(c, [[rx0, ry0], [rx1, ry1]], P.dark, li);
          }
        });
      }
      c.restore();

      // Cung Trái Đất
      Assets.drawEarthArc(c, cx, cy, rEarth, { showAtmo: true, showGrid: true });

      // Các đơn vị trên mặt đất (xe tăng, pháo, tàu, trạm radar) ở đỉnh cung Trái Đất (y ≈ 1030)
      Assets.drawHowitzer(c, cx - 220, cy - rEarth + 22, 0.75, 'side', 'ally', 1, 0.5);
      Assets.drawTank(c, cx, cy - rEarth + 6, 0.75, 'side', 'ally', 1);
      Assets.drawWarship(c, cx + 230, cy - rEarth + 25, 0.7, 'side', 'ally', 1);

      // Góc bay của vệ tinh trên đường ray
      // Ở 46.68–49.94 ("cannot hover over a battlefield"): thử ghìm đứng yên rồi bị kéo vọt đi theo đường ray
      let satAng = 0;
      if (t < 46.68) {
        satAng = A.lerp(-0.22, 0.05, A.ph(t, 35.32, 46.68));
      } else if (t < 50.2) {
        satAng = 0.05;
      } else {
        satAng = A.lerp(0.05, 0.36, A.ph(t, 50.2, 55.2)) - A.sm(t, 55.2, 62.0) * 0.36;
      }

      const sx = cx + Math.sin(satAng) * rLeo;
      const sy = cy - Math.cos(satAng) * rLeo;

      // Từ 35.32 – 46.5s: phát chùm tia số xuống trạm thu mặt đất ("replaced by radio beams and digital sensors")
      if (t < 46.5) {
        const beamP = A.sm(t, 35.8, 37.5);
        UI.dashed(c, [sx, sy + 40], [cx, cy - rEarth + 6], P.sky, lw, t * 90 * beamP);
      }

      // Từ 46.8 – 49.9s: dấu X đỏ trên dây neo giả định muốn giữ vệ tinh đứng yên ("cannot hover")
      if (t >= 46.8 && t < 50.0) {
        const hp = A.win(t, 46.8, 49.9, 0.25, 0.25);
        A.withA(c, hp, () => {
          A.line(c, [[sx, sy + 55], [sx, cy - rEarth]], P.enemy, lw, [10, 8]);
          UI.xMark(c, sx, (sy + cy - rEarth) / 2, 26, 1, P.enemy, lw * 1.5);
        });
      }

      // Từ 55.44 – 62.04s ("run almost every shot, message, and warning"): tia liên kết từ vệ tinh tới pháo, xe tăng, tàu chiến
      if (t >= CUE.ch1_run_every_shot) {
        const lp = A.sm(t, CUE.ch1_run_every_shot, 57.5);
        for (const tx of [cx - 220, cx, cx + 230]) {
          UI.dashed(c, [sx, sy + 35], [tx, cy - rEarth + 15], P.amber, lw, t * 110 * lp);
        }
        // Chớp đầu nòng pháo minh họa "every shot" lúc 58.2s
        const shotP = A.ph(t, 58.2, 58.65);
        if (shotP > 0 && shotP < 1) {
          FX.muzzleFlash(c, cx - 170, cy - rEarth - 5, -0.5, shotP, 0.85, lw);
        }
      }

      Assets.drawOpticalSat(c, sx, sy, 0.72, 'side', { rot: satAng });
    } else {
      // Fase B (62.04 – 74.76s): Hiện sơ đồ 3 tầng quỹ đạo (LEO, MEO, GEO)
      // Cuối chương (t = 74.76): leoAngle = 0 để khớp chính xác tâm CAM_CH1_END (960, 880)
      const moveP = A.ph(t, 62.04, 71.5);
      const settleP = A.eio(t, 71.5, 74.76);
      const leoAng = A.lerp(-0.28 + moveP * 0.35, 0, settleP);
      const meoAng = -0.25 + moveP * 0.18;
      const geoAng = 0.16;

      drawThreeLayersWorld(c, t, {
        activeLayer: t >= 72.0 ? 1 : 0,
        leoAngle: leoAng,
        meoAngle: meoAng,
        geoAngle: geoAng,
        showRays: t >= CUE.ch1_distinct_layers,
      });
    }

    K.end(c);
  }
}
