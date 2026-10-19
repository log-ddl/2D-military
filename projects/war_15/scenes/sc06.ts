// scenes/sc06.ts — Chương 6 (424.68 – 488.255s):
// Bác bỏ ảo tưởng "camera trên trần nhà", cuộc cách mạng thực sự của vệ tinh (Đồng hồ & Bản đồ chung kết nối
// pháo, tàu, máy bay, sở chỉ huy thành 1 cỗ máy), hồi tưởng chiếc C-119 năm 1960 & Tổng kết toàn bộ các tầng quỹ đạo.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as M from './shared/map';
import * as R from './shared/rig';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import * as Assets from './_assets';
import { CUE } from './_cue';
import { ORBIT_WORLD } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── SHOT 6.1 (424.68 – 442.36s): SIDE → ORBITAL — Bác bỏ ảo tưởng "camera trên trần nhà" & Thực tế chuyển tiếp máy móc ──
    if (t < 442.36) {
      if (t < CUE.ch6_reality_relay) {
        const cam: K.Cam = { x: 960, y: 540, z: 1.02 };
        K.begin(c, cam);
        const lw = A.px(c, LINE.outer);
        const li = A.px(c, LINE.inner);

        // Trần nhà giả định (xà ngang ở y = 130) có gắn chiếc Camera giám sát khổng lồ ("as if space were a camera in the ceiling")
        A.rrect(c, 160, 90, 1600, 32, 4, P.dark, P.ink, lw);
        // Giá treo và thân camera giám sát gắn trên trần
        A.line(c, [[960, 122], [960, 185]], P.slate, lw * 1.6);
        A.rrect(c, 890, 180, 140, 68, 12, P.slate, P.ink, lw);
        A.poly(c, [[935, 248], [985, 248], [1005, 286], [915, 286]], P.dark, P.ink, lw);
        A.circle(c, 960, 214, 14, P.enemy, P.white, li);

        // Chùm tia chiếu xuống mục tiêu xe tăng dưới sàn & Màn hình Live Video trong phòng chỉ huy bên trái
        A.withA(c, 0.2, () => {
          A.poly(c, [[925, 286], [995, 286], [1340, 880], [580, 880]], P.amber, null, 0);
        });
        Assets.drawSideTerrain(c, 120, 1800, 880);
        Assets.drawTank(c, 1140, 880, 1.25, 'side', 'foe', -1);

        // Phòng chỉ huy ở góc dưới trái (x = 420, y = 880): Chỉ huy đứng xem màn hình lớn
        A.rrect(c, 260, 560, 340, 210, 12, P.ink, P.slate, lw * 1.3);
        A.rrect(c, 280, 580, 300, 170, 6, '#e2e8f0', P.ink, li);
        Assets.drawTank(c, 430, 710, 0.85, 'side', 'foe', -1);
        A.circle(c, 310, 608, 9, P.enemy, null, 0);
        R.rig(c, { x: 220, y: 880, s: 1.1, dir: 1, skin: 'ally', weapon: null });

        // Từ 433.84s ("as if space were a camera in the ceiling"): Gạch chéo X đỏ lên chiếc camera trần nhà và màn hình ảo tưởng!
        if (t >= CUE.ch6_camera_in_ceiling - 0.3) {
          const xp = A.sm(t, CUE.ch6_camera_in_ceiling - 0.3, 434.8);
          UI.xMark(c, 960, 235, 72, xp, P.enemy, lw * 2.2);
          UI.xMark(c, 430, 665, 68, xp, P.enemy, lw * 2.2);
        }

        K.end(c);
        return;
      }

      // 436.16 – 442.36s ("In reality, space is a relay between machines that either see clearly for three minutes or stare dimly from afar"):
      const cam: K.Cam = { x: 960, y: 650, z: 0.96 };
      K.begin(c, cam);
      const { cx, cy, rEarth, rLeo, rGeo } = ORBIT_WORLD;
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      c.save();
      c.beginPath();
      c.arc(cx, cy, rLeo, -Math.PI * 0.8, -Math.PI * 0.2);
      c.setLineDash([14, 10]);
      c.strokeStyle = P.amber;
      c.lineWidth = lw;
      c.stroke();

      c.beginPath();
      c.arc(cx, cy, rGeo, -Math.PI * 0.8, -Math.PI * 0.2);
      c.setLineDash([18, 12]);
      c.strokeStyle = P.sky;
      c.lineWidth = lw;
      c.stroke();
      c.restore();

      Assets.drawEarthArc(c, cx, cy, rEarth, { showAtmo: true, showGrid: true });

      // 1) Vệ tinh LEO bay vọt nhanh qua trong "3 minutes", quét chùm tia hẹp rõ nét
      const leoAng = A.lerp(-0.32, 0.32, A.ph(t, 436.16, 442.2));
      const [lx, ly] = [cx + Math.sin(leoAng) * rLeo, cy - Math.cos(leoAng) * rLeo];
      A.withA(c, 0.28, () => {
        A.poly(c, [[lx, ly], [lx - 65, cy - rEarth + 15], [lx + 65, cy - rEarth + 15]], P.amber, null, 0);
      });
      Assets.drawOpticalSat(c, lx, ly, 0.65, 'side', { rot: leoAng });

      // 2) Vệ tinh GEO ở tít trên cao (rGeo) đứng yên nhìn mờ từ xa ("or stare dimly from afar") và truyền tiếp sóng giữa các máy móc
      const [gx, gy] = [cx, cy - rGeo];
      A.withA(c, 0.12, () => {
        A.poly(c, [[gx, gy], [cx - 460, cy - rEarth + 110], [cx + 460, cy - rEarth + 110]], P.sky, null, 0);
      });
      UI.dashed(c, [lx, ly], [gx, gy], P.sky, li * 1.2, -t * 140);
      UI.dashed(c, [gx, gy], [cx - 240, cy - rEarth + 30], P.sky, li * 1.2, t * 140);
      Assets.drawGeoWarningSat(c, gx, gy, 0.68, 'side', { rot: 0, irLock: 0.6 });

      K.end(c);

      if (t >= 438.8 && t <= 442.1) {
        const sp = K.toScreen(cam, lx, ly);
        UI.callout(c, '3 min', sp[0] + 135, sp[1] - 25, {
          to: sp,
          p: A.win(t, 438.8, 442.1, 0.2, 0.2),
          color: P.amber,
        });
      }
      return;
    }

    // ── SHOT 6.2 (442.36 – 460.00s): TOP TACTICAL MAP — Đồng hồ & Bản đồ chung kết nối Pháo, Tàu, Máy bay, Sở chỉ huy thành 1 cỗ máy ──
    if (t < CUE.ch6_return_cargo_1960) {
      const fireT = 455.2;
      const hitT = 456.4;
      const baseCam = K.track(
        t,
        [
          [442.36, { x: 960, y: 540, z: 1.05 }],
          [448.0, { x: 960, y: 540, z: 1.0 }],
          [460.0, { x: 960, y: 540, z: 1.02 }],
        ],
        A.eio
      );
      const cam = K.withShake(baseCam, t, [[hitT, 16, 0.6]]);

      K.begin(c, cam);
      M.mapBg(c, cam, { color: '#eae4d0', grid: 100 });
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Vùng biển ở góc dưới phải cho Tàu chiến, đường băng ở góc trên phải cho Máy bay
      A.rrect(c, 1280, 620, 640, 460, 0, '#cbe4f0', P.ink, lw);

      // 442.36 – 447.8s ("the real revolution of military satellites is not the spy photograph at all"):
      // Tấm ảnh chụp gián điệp hiện ở giữa rồi bị gạt bỏ sang một bên
      if (t < 448.2) {
        const photoAlpha = A.win(t, 442.5, 448.0, 0.3, 0.4);
        A.withA(c, photoAlpha, () => {
          A.rrect(c, 740, 360, 440, 320, 12, P.white, P.ink, lw * 1.4);
          Assets.drawParkedBomber(c, 960, 520, 1.35, 'top', 'foe', -0.3);
          if (t >= 445.5) {
            UI.xMark(c, 960, 520, 64, A.sm(t, 445.5, 446.3), P.enemy, lw * 2);
          }
        });
      }

      // Từ 447.96s ("It is that they put every gun, ship, aircraft, and headquarters onto a single shared clock and map, turning separate branches into one connected machine"):
      const appearP = A.sm(t, 447.8, 449.5);
      const connectP = A.eio(t, 451.2, 454.5);

      if (appearP > 0.01) {
        A.withA(c, appearP, () => {
          // Vòng đồng hồ nguyên tử & lưới tọa độ trung tâm ở (960, 540)
          if (connectP > 0.05) {
            A.withA(c, connectP * 0.85, () => {
              A.circle(c, 960, 540, 260, null, P.sky, lw);
              A.circle(c, 960, 540, 86, P.paper, P.ink, lw);
              for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                A.line(
                  c,
                  [
                    [960 + Math.cos(a) * 68, 540 + Math.sin(a) * 68],
                    [960 + Math.cos(a) * 80, 540 + Math.sin(a) * 80],
                  ],
                  P.ink,
                  li
                );
              }
              const cp = t * 2.5;
              A.line(c, [[960, 540], [960 + Math.cos(cp) * 54, 540 + Math.sin(cp) * 54]], P.enemy, lw);
              A.line(c, [[960, 540], [960 + Math.cos(cp * 0.2) * 38, 540 + Math.sin(cp * 0.2) * 38]], P.ink, lw);
            });
          }

          // 4 Quân chủng ở 4 góc bản đồ:
          // 1) Gun (Khẩu đội pháo ở 380, 780)
          const gunPos: A.Pt = [380, 780];
          // 2) Ship (Tàu chiến ở 1540, 800)
          const shipPos: A.Pt = [1540, 800];
          // 3) Aircraft (Máy bay chiến đấu ở 1480, 250)
          const airPos: A.Pt = [1480, 250];
          // 4) Headquarters (Sở chỉ huy ở 380, 250)
          const hqPos: A.Pt = [380, 250];

          // Mục tiêu đối phương ở (960, 250)
          const targetPos: A.Pt = [960, 220];
          Assets.drawTank(c, targetPos[0], targetPos[1], 1.15, 'top', 'foe', -1);

          // Khi connectP > 0: các đường mạng lưới đồng bộ nối từ Đồng hồ trung tâm (960, 540) ra cả 4 quân chủng và khóa mục tiêu!
          if (connectP > 0.1) {
            for (const p of [gunPos, shipPos, airPos, hqPos]) {
              UI.dashed(c, [960, 540], p, P.sky, lw, -t * 140);
              UI.ring(c, p[0], p[1], 68, (t * 1.2) % 1, P.sky, li);
            }
            UI.dashed(c, hqPos, targetPos, P.amber, lw, -t * 140);
            UI.crosshair(c, targetPos[0], targetPos[1], 48, P.enemy, connectP, t);
          }

          // Vẽ 4 đơn vị
          Assets.drawHowitzer(c, gunPos[0], gunPos[1], 1.35, 'top', 'ally', 1);
          Assets.drawWarship(c, shipPos[0], shipPos[1], 1.15, 'top', 'ally', -1);
          Assets.drawParkedBomber(c, airPos[0], airPos[1], 1.15, 'top', 'ally', -2.4);
          M.unit(c, hqPos[0], hqPos[1], 'hq', 'ally', 95);

          // Khai hỏa hiệp đồng từ Pháo, Tàu và Máy bay cùng trúng mục tiêu lúc hitT = 456.4s!
          if (t >= fireT && t < hitT) {
            const sP = A.ei(t, fireT, hitT);
            FX.muzzleFlash(c, gunPos[0] + 65, gunPos[1] - 25, -0.7, A.ph(t, fireT, fireT + 0.35), 0.9, lw);
            FX.muzzleFlash(c, shipPos[0] - 65, shipPos[1] - 25, -2.4, A.ph(t, fireT, fireT + 0.35), 0.9, lw);
            FX.straightShot(c, gunPos, targetPos, sP, { color: P.amber, w: 6 });
            FX.straightShot(c, shipPos, targetPos, sP, { color: P.amber, w: 6 });
            FX.straightShot(c, airPos, targetPos, sP, { color: P.enemy, w: 6 });
          }
          if (t >= hitT) {
            FX.explosion(c, targetPos[0], targetPos[1], 140, A.ph(t, hitT, hitT + 0.8), lw);
            FX.smoke(c, targetPos[0], targetPos[1], t - hitT, 1.0, 6);
          }

          // Từ 456.5s ("while making the whole force dependent on hardware that cannot take cover"):
          // Hiện bóng 2 vệ tinh không có chỗ ẩn nấp ở cạnh trên màn hình đang giữ toàn bộ mạng lưới
          if (t >= 456.5) {
            const satAlpha = A.sm(t, 456.5, 457.6);
            A.withA(c, satAlpha, () => {
              Assets.drawNavSat(c, 680, 110, 0.72, 'cutaway', { clockPhase: t * 4 });
              Assets.drawOpticalSat(c, 1240, 110, 0.68, 'side');
              UI.dashed(c, [680, 155], [960, 454], P.sky, li, t * 120);
              UI.dashed(c, [1240, 155], [960, 454], P.sky, li, t * 120);
            });
          }
        });
      }

      K.end(c);
      return;
    }

    // ── SHOT 6.3 (460.00 – 481.54s): SIDE → ORBITAL WIDE — Hồi tưởng chiếc C-119 năm 1960 & Toàn cảnh 4 loại cảm biến kéo thông tin từ bầu trời ──
    if (t < CUE.ch6_never_fire_shot) {
      // 6.3A (460.00 – 468.42s): Trở lại chiếc máy bay vận tải C-119 trên Thái Bình Dương năm 1960 ngoắc khoang phim đồng bằng móc thép
      if (t < CUE.ch6_every_orbit_sensor) {
        const snagT = 465.2;
        const caught = t >= snagT;
        const planeX = A.lerp(560, 1480, A.ph(t, 460.0, 468.42));
        const planeY = 260;
        const planeScale = 1.3;
        const hookX = planeX - 292 * planeScale;
        const hookY = planeY + 92 * planeScale;

        const snagHookX = A.lerp(560, 1480, (snagT - 460.0) / 8.42) - 292 * planeScale;
        const ringOffset = 472.5;
        const preFallCapY = A.lerp(hookY + ringOffset - 40, hookY + ringOffset, A.ph(t, 460.0, snagT));
        const postPullP = A.eo(t, snagT, 468.2);
        const capX = caught ? hookX + postPullP * 60 : snagHookX;
        const capY = caught ? hookY + ringOffset - postPullP * 35 : preFallCapY;

        const cam: K.Cam = { x: 960, y: 490, z: 1.15 };
        K.begin(c, cam);
        const lw = A.px(c, LINE.outer);

        Assets.drawSideTerrain(c, -200, 2400, 940, {
          oceanFrom: -200,
          oceanTo: 2400,
          wavePhase: t,
          clouds: [
            { x: 420, y: 700, w: 320, h: 75 },
            { x: 1520, y: 720, w: 340, h: 78 },
          ],
        });

        Assets.drawFilmCapsule(c, capX, capY, 1.05, 'cutaway', { chuteOpen: 1 });
        Assets.drawCatchPlane(c, planeX, planeY, planeScale, 'side', {
          dir: 1,
          propPhase: t,
          hookExtend: 1,
          caughtCapsule: caught,
        });

        const hitBump = A.bump(t, snagT, 0.5);
        if (hitBump > 0) {
          FX.sparks(c, hookX, hookY, 1 - hitBump, 1.1, Math.PI, Math.PI, 4);
          UI.ring(c, hookX, hookY, 62, 1 - hitBump, P.amber, lw * 1.4);
        }

        K.end(c);
        return;
      }

      // 6.3B (468.42 – 481.54s): ORBITAL WIDE — Điểm danh toàn bộ các tầng quỹ đạo và cảm biến ("the low-flying mirror, the cloud-piercing radar, the high-infrared watchmen, and the chorus of atomic clocks exist to pull information down from the only high ground that covers the entire Earth")
      const cam: K.Cam = { x: 960, y: 620, z: 0.92 };
      K.begin(c, cam);
      const { cx, cy, rEarth, rLeo, rMeo, rGeo } = ORBIT_WORLD;
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      for (const [r, col] of [
        [rLeo, P.amber],
        [rMeo, P.sky],
        [rGeo, P.enemy],
      ] as const) {
        c.save();
        c.beginPath();
        c.arc(cx, cy, r, -Math.PI * 0.85, -Math.PI * 0.15);
        c.setLineDash([16, 12]);
        c.strokeStyle = col;
        c.lineWidth = li * 1.2;
        c.stroke();
        c.restore();
      }

      Assets.drawEarthArc(c, cx, cy, rEarth, {
        rot: (t - 468.4) * 0.04,
        showAtmo: true,
        showGrid: true,
      });

      // 1) Low-flying mirror (470.82s): Vệ tinh quang học ở tầng LEO bên trái (-0.24 rad)
      const p1 = A.sm(t, 470.5, 471.5);
      const [ox, oy] = [cx + Math.sin(-0.24) * rLeo, cy - Math.cos(-0.24) * rLeo];
      if (p1 > 0) {
        UI.dashed(c, [ox, oy + 40], [cx - 160, cy - rEarth + 15], P.amber, lw, t * 130);
        Assets.drawOpticalSat(c, ox, oy, 0.65, 'cutaway', { rot: -0.24, rayProgress: p1 });
      }

      // 2) Cloud-piercing radar (472.24s): Vệ tinh SAR ở tầng LEO bên phải (+0.24 rad)
      const p2 = A.sm(t, 472.0, 473.0);
      const [rx, ry] = [cx + Math.sin(0.24) * rLeo, cy - Math.cos(0.24) * rLeo];
      if (p2 > 0) {
        UI.dashed(c, [rx, ry + 30], [cx + 160, cy - rEarth + 15], P.sky, lw, t * 130);
        Assets.drawRadarSat(c, rx, ry, 0.68, 'side', { rot: 0.24, highlightArray: p2 });
      }

      // 3) High-infrared watchmen (473.84s): Vệ tinh cảnh báo sớm hồng ngoại ở đỉnh tầng GEO (0 rad)
      const p3 = A.sm(t, 473.6, 474.6);
      const [gx, gy] = [cx, cy - rGeo];
      if (p3 > 0) {
        UI.dashed(c, [gx, gy + 50], [cx, cy - rEarth + 5], P.enemy, lw, t * 130);
        Assets.drawGeoWarningSat(c, gx, gy, 0.72, 'cutaway', { rot: 0, irLock: p3 });
      }

      // 4) Chorus of atomic clocks (475.32s): 2 Vệ tinh đồng hồ nguyên tử ở tầng MEO (-0.28 và +0.28 rad)
      const p4 = A.sm(t, 475.1, 476.2);
      if (p4 > 0) {
        for (const ma of [-0.28, 0.28]) {
          const [mx, my] = [cx + Math.sin(ma) * rMeo, cy - Math.cos(ma) * rMeo];
          UI.dashed(c, [mx, my + 45], [cx + ma * 400, cy - rEarth + 25], P.sky, lw, t * 130);
          Assets.drawNavSat(c, mx, my, 0.68, 'cutaway', { rot: ma, clockPhase: t * 4 });
        }
      }

      K.end(c);
      return;
    }

    // ── SHOT 6.4 (481.54 – 488.255s): SPLIT SIDE / TACTICAL — "Satellites never fire a shot. They decide who fights with their eyes open and who has to swing in the dark." ──
    const allyFireT = 484.45;
    const allyHitT = 485.15;
    const foeFireT = 486.25;
    const foeMissT = 487.05;

    const baseCam: K.Cam = { x: 960, y: 540, z: 1.0 };
    const cam = K.withShake(baseCam, t, [
      [allyHitT, 14, 0.5],
      [foeMissT, 12, 0.5],
    ]);

    K.begin(c, cam);
    const lw = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // Chia đôi màn hình tại x = 960:
    // - Nửa trái (0..960): Nền sáng rõ, có vệ tinh chiếu sáng thông tin ("fights with their eyes open"), pháo khóa tâm ngắm bắn trúng đích!
    // - Nửa phải (960..1920): Chìm trong bóng tối mù mịt mất kết nối vệ tinh ("swing in the dark"), pháo bắn mù trượt ra đồng không!

    // Nền tối cho nửa bên phải (xuất hiện mạnh khi voice đọc "and who has to swing in the dark")
    const darkP = A.sm(t, 483.2, 485.8);
    A.withA(c, 0.78 * darkP + 0.15, () => {
      A.rrect(c, 960, 0, 960, 1080, 0, '#1e293b', null, 0);
    });

    // Mặt đất chung ở y = 880
    Assets.drawSideTerrain(c, 0, 1920, 880);
    // Phủ lớp tối lên mặt đất nửa bên phải
    A.withA(c, 0.55 * darkP, () => {
      A.rrect(c, 960, 880, 960, 200, 0, '#0f172a', null, 0);
    });

    // Đường ranh giới chia đôi ở x = 960
    A.line(c, [[960, 0], [960, 1080]], P.ink, lw * 1.5);

    // 1) NỬA TRÁI: "Who fights with their eyes open"
    // Vệ tinh ở (480, 180) không bắn đạn nhưng chiếu chùm thông tin sáng rõ xuống khẩu pháo (220, 880) và mục tiêu (740, 880)
    Assets.drawOpticalSat(c, 480, 180, 1.0, 'cutaway', { rayProgress: 1 });
    A.withA(c, 0.22, () => {
      A.poly(c, [[440, 260], [520, 260], [860, 880], [120, 880]], P.amber, null, 0);
    });
    UI.dashed(c, [480, 260], [220, 840], P.sky, lw, t * 140);
    UI.dashed(c, [480, 260], [740, 850], P.amber, lw, t * 140);

    Assets.drawHowitzer(c, 220, 880, 1.25, 'side', 'ally', 1, 0.45);
    Assets.drawTank(c, 740, 880, 1.15, 'side', 'foe', -1);
    UI.crosshair(c, 740, 850, 42, P.enemy, A.sm(t, 483.5, 484.2), t);

    // Pháo bên trái bắn trúng mục tiêu chính xác
    if (t >= allyFireT) {
      FX.muzzleFlash(c, 295, 825, -0.45, A.ph(t, allyFireT, allyFireT + 0.35), 0.95, lw);
      FX.arcShot(c, [295, 825], [740, 855], A.ph(t, allyFireT, allyHitT), 170, {
        color: P.amber,
        w: lw,
      });
    }
    if (t >= allyHitT) {
      FX.explosion(c, 740, 855, 115, A.ph(t, allyHitT, allyHitT + 0.75), lw);
      FX.smoke(c, 740, 855, t - allyHitT, 0.95, 6);
    }

    // 2) NỬA PHẢI: "And who has to swing in the dark"
    // Phía trên không có vệ tinh (đường sóng bị gạch X đỏ), khẩu pháo đối phương ở (1700, 880) bắn mù trượt hẳn sang bãi đất trống (1180, 880) trong khi mục tiêu thật ở (1380, 880)!
    UI.xMark(c, 1440, 190, 42, darkP, P.enemy, lw * 1.8);
    Assets.drawHowitzer(c, 1700, 880, 1.25, 'side', 'foe', -1, 0.52);
    Assets.drawTank(c, 1390, 880, 1.15, 'side', 'ally', 1);

    if (t >= foeFireT) {
      FX.muzzleFlash(c, 1625, 820, Math.PI + 0.52, A.ph(t, foeFireT, foeFireT + 0.35), 0.95, lw);
      // Bắn trượt quá xa sang (1140, 880) do mù thông tin
      FX.arcShot(c, [1625, 820], [1140, 880], A.ph(t, foeFireT, foeMissT), 195, {
        color: P.enemy,
        w: lw,
      });
    }
    if (t >= foeMissT) {
      FX.explosion(c, 1140, 880, 105, A.ph(t, foeMissT, foeMissT + 0.75), lw);
      FX.dust(c, 1140, 880, A.ph(t, foeMissT, foeMissT + 0.8), 1.2);
    }

    K.end(c);
  }
}
