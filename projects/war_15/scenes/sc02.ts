// scenes/sc02.ts — Chương 2 (74.76 – 202.34s):
// Tầng quỹ đạo thấp (LEO ~500 km): Kính thiên văn gương lớn, vận tốc 28.000 km/h (90 phút/vòng),
// điểm mù mây/đêm, nguyên lý Radar khẩu độ tổng hợp (SAR) & Phản xạ góc vuông + SIGINT.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import * as Assets from './_assets';
import { CUE } from './_cue';
import { ORBIT_WORLD, drawThreeLayersWorld, CAM_CH1_END } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── SHOT 2.1 (74.76 – 101.50s): ORBITAL (nối khớp Ch1) → TOP (máy bay/cầu phao) → CUTAWAY (kính thiên văn gương lớn) ──
    if (t < CUE.ch2_orbital_rule) {
      // 2.1A (74.76 – 80.80s): Bắt đầu khớp 100% với trạng thái cuối Chương 1 (CAM_CH1_END)
      if (t < 80.8) {
        const cam = K.track(
          t,
          [
            [74.76, CAM_CH1_END],
            [78.0, { x: 960, y: 900, z: 1.75 }],
            [80.8, { x: 960, y: 915, z: 1.9 }],
          ],
          A.eio
        );
        K.begin(c, cam);
        drawThreeLayersWorld(c, t, {
          activeLayer: 1,
          leoAngle: 0,
          meoAngle: -0.07,
          geoAngle: 0.16,
          showRays: true,
        });
        K.end(c);
        return;
      }

      // 2.1B (80.80 – 88.60s): Góc TOP nhìn xuống sân đỗ máy bay ném bom & kho cầu phao ("read markings on a parked bomber, or count pontoons in a depot")
      if (t < 88.6) {
        const cam = K.track(
          t,
          [
            [80.8, { x: 640, y: 540, z: 1.15 }],
            [83.5, { x: 640, y: 540, z: 1.45 }],
            [85.2, { x: 1280, y: 540, z: 1.35 }],
            [88.6, { x: 1280, y: 540, z: 1.45 }],
          ],
          A.eio
        );
        K.begin(c, cam);
        M.mapBg(c, cam, { color: '#eae4d0', grid: 100 });
        const lw = A.px(c, LINE.outer);
        const li = A.px(c, LINE.inner);

        // Khu vực trái (x = 640): Sân đỗ máy bay ném bom với phù hiệu rõ trên cánh
        A.rrect(c, 420, 320, 440, 440, 12, '#cbd5e1', P.ink, lw);
        Assets.drawParkedBomber(c, 640, 540, 2.1, 'top', 'foe', -0.25);
        UI.focus(c, 535, 395, 75, 75, A.sm(t, 81.5, 82.4), P.amber, lw * 1.3);

        // Khu vực phải (x = 1280): Kho bãi chứa các đốt cầu phao (pontoons in a depot) xếp hàng
        A.rrect(c, 1040, 320, 480, 440, 12, '#dcd6c4', P.ink, lw);
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4; col++) {
            const px = 1100 + col * 102;
            const py = 380 + row * 125;
            A.rrect(c, px, py, 76, 38, 8, P.olive, P.ink, lw);
            A.line(c, [[px + 18, py], [px + 18, py + 38]], P.ink, li);
            A.line(c, [[px + 58, py], [px + 58, py + 38]], P.ink, li);
          }
        }
        UI.focus(c, 1080, 360, 400, 360, A.sm(t, 83.7, 84.8), P.sky, lw * 1.2);

        K.end(c);
        return;
      }

      // 2.1C (88.60 – 101.50s): Góc CUTAWAY — Mặt cắt dọc kính thiên văn vũ trụ quay ngược xuống đất ("telescope with a mirror several meters wide... pointed downward")
      const cam = K.track(
        t,
        [
          [88.6, { x: 960, y: 540, z: 1.05 }],
          [94.0, { x: 960, y: 500, z: 1.22 }],
          [101.5, { x: 960, y: 540, z: 1.08 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Các vì sao mờ phía trên (để đối chiếu "pointed downward instead of out at the stars")
      for (const [sx, sy] of [
        [340, 140],
        [580, 190],
        [1360, 150],
        [1580, 210],
        [780, 120],
        [1160, 130],
      ] as const) {
        A.circle(c, sx, sy, 5, P.slate, null, 0);
      }

      // Mặt đất ở đáy (y = 890) với mục tiêu nhỏ cỡ chiếc đĩa ("smaller than a dinner plate")
      Assets.drawSideTerrain(c, 100, 1820, 890);
      Assets.drawParkedBomber(c, 960, 874, 1.15, 'side', 'foe', 0);

      // Vệ tinh quang học lớn ở chính giữa, mặt cắt cutaway cho thấy gương lõm rộng vài mét đón tia sáng từ mặt đất
      const rayP = A.eio(t, 90.0, 96.5);
      Assets.drawOpticalSat(c, 960, 420, 2.55, 'cutaway', {
        rot: 0,
        rayProgress: rayP,
      });

      // Thước đo bề rộng gương chính bên trong thân kính thiên văn (từ 93.0s)
      if (t >= 93.0) {
        const mp = A.win(t, 93.0, 98.5, 0.3, 0.3);
        A.withA(c, mp, () => {
          A.line(c, [[862, 305], [1058, 305]], P.sky, lw);
          A.line(c, [[862, 293], [862, 317]], P.sky, lw);
          A.line(c, [[1058, 293], [1058, 317]], P.sky, lw);
        });
      }

      K.end(c);

      // Callout "500 km" khi voice đọc "Even at five hundred kilometers up"
      if (t >= 88.8 && t <= 92.5) {
        const sp = K.toScreen(cam, 1110, 420);
        UI.callout(c, '500 km', sp[0] + 150, sp[1], {
          to: sp,
          p: A.win(t, 88.8, 92.5, 0.25, 0.25),
          color: P.ink,
        });
      }
      return;
    }

    // ── SHOT 2.2 (101.50 – 144.12s): Cơ học quỹ đạo 28.000 km/h (90 phút) & Điểm mù mây/đêm/ngụy trang ──
    if (t < 144.12) {
      // 2.2A (101.50 – 117.98s): ORBITAL — Trọng lực kéo xuống vs vận tốc ngang 28.000 km/h & chu kỳ 90 phút
      if (t < CUE.ch2_never_hangs) {
        const cam: K.Cam = { x: 960, y: 540, z: 1.05 };
        K.begin(c, cam);
        const lw = A.px(c, LINE.outer);
        const li = A.px(c, LINE.inner);

        // Quả cầu Trái Đất ở chính giữa (960, 560, bán kính 250), quỹ đạo LEO bán kính 360
        const ecx = 960;
        const ecy = 560;
        const rE = 250;
        const rO = 365;

        // Vòng quỹ đạo tròn 90 phút
        c.save();
        c.beginPath();
        c.arc(ecx, ecy, rO, 0, Math.PI * 2);
        c.setLineDash([16, 12]);
        c.strokeStyle = P.slate;
        c.lineWidth = lw;
        c.stroke();
        c.restore();

        Assets.drawEarthArc(c, ecx, ecy, rE, {
          rot: (t - 101.5) * 0.04,
          showAtmo: true,
          showGrid: true,
        });

        // Đường thử rơi xuống Trái Đất nếu không đủ vận tốc ngang (104.76 – 110.26s)
        if (t >= 104.5 && t < 111.5) {
          const fp = A.win(t, 104.5, 111.5, 0.3, 0.3);
          A.withA(c, fp, () => {
            FX_arcFall(c, ecx, ecy - rO, ecx + 210, ecy - rE + 30, P.enemy, lw);
          });
        }

        // Góc bay của vệ tinh quanh Trái Đất: sau 110.26s tăng tốc quay đủ 1 vòng minh họa 90 phút
        const ang =
          t < CUE.ch2_28000_kmh
            ? A.lerp(-0.35, 0, A.eio(t, 101.5, CUE.ch2_28000_kmh))
            : A.lerp(0, Math.PI * 2, A.eio(t, CUE.ch2_28000_kmh, 117.8));

        const sx = ecx + Math.sin(ang) * rO;
        const sy = ecy - Math.cos(ang) * rO;

        // Mũi tên trọng lực hướng vào tâm Trái Đất & mũi tên vận tốc tiếp tuyến
        const gravP = A.sm(t, 104.7, 106.2);
        if (gravP > 0 && t < 114.5) {
          const gx = ecx + Math.sin(ang) * (rO - 95 * gravP);
          const gy = ecy - Math.cos(ang) * (rO - 95 * gravP);
          UI.arrow(c, [sx, sy], [gx, gy], { p: gravP, color: P.enemy, w: 6 });
        }
        const velP = A.sm(t, CUE.ch2_28000_kmh - 0.3, 111.8);
        if (velP > 0) {
          const tx = sx + Math.cos(ang) * 150 * velP;
          const ty = sy + Math.sin(ang) * 150 * velP;
          UI.arrow(c, [sx, sy], [tx, ty], { p: velP, color: P.amber, w: 7 });
        }

        Assets.drawOpticalSat(c, sx, sy, 0.65, 'side', { rot: ang });

        // Đồng hồ 90 phút ở góc phải trên khi voice đọc "circles the planet in about 90 minutes"
        if (t >= CUE.ch2_90_minutes - 0.2) {
          const cp = A.sm(t, CUE.ch2_90_minutes - 0.2, 115.5);
          A.withA(c, cp, () => {
            A.circle(c, 1520, 250, 62, P.paper, P.ink, lw);
            A.line(c, [[1520, 250], [1520, 202]], P.ink, lw);
            A.line(c, [[1520, 250], [1565, 250]], P.enemy, lw);
          });
        }

        K.end(c);

        // Callout "28,000 km/h" và "90 min"
        if (t >= 111.5 && t <= 117.8) {
          UI.callout(c, '28,000 km/h', 960, 105, {
            p: A.win(t, 111.5, 117.8, 0.25, 0.25),
            color: P.amber,
          });
        }
        if (t >= 115.0 && t <= 117.8) {
          UI.callout(c, '90 min', 1520, 355, {
            to: [1520, 312],
            p: A.win(t, 115.0, 117.8, 0.25, 0.25),
            color: P.ink,
          });
        }
        return;
      }

      // 2.2B (117.98 – 144.12s): TOP VIEW — Đoàn xe tăng hành quân, vệ tinh vọt qua chụp 1 dải hẹp, rồi mây mùa đông/lưới ngụy trang che kín ("pictures of gray wool")
      const cam = K.track(
        t,
        [
          [117.98, { x: 960, y: 540, z: 1.05 }],
          [129.7, { x: 960, y: 540, z: 1.12 }],
          [144.12, { x: 960, y: 540, z: 1.15 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      M.mapBg(c, cam, { color: '#eae4d0', grid: 100 });
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Con đường chiến thuật ngang màn hình & rừng cây hai bên
      M.road(c, [[120, 560], [650, 520], [1280, 560], [1800, 530]], 38);
      M.forest(c, 420, 290, 95, 2);
      M.forest(c, 1420, 780, 110, 5);

      // Đoàn 4 xe tăng đang di chuyển trên đường (hoặc tấp vào dưới lưới ngụy trang từ 136.88s)
      const parkP = A.eio(t, CUE.ch2_winter_cloud + 3.0, 139.2);
      for (let i = 0; i < 4; i++) {
        const baseX = 480 + i * 240 + (t - 118.0) * 18 * (1 - parkP);
        const baseY = A.lerp(540, 360, parkP);
        Assets.drawTank(c, baseX, baseY, 1.05, 'top', 'foe', 1);

        // Lưới ngụy trang căng đè lên xe từ 136.88s ("park vehicles under nets")
        if (parkP > 0.05) {
          A.withA(c, parkP * 0.9, () => {
            A.rrect(c, baseX - 65, baseY - 46, 130, 92, 10, '#a3b18a', P.ink, li);
            A.line(c, [[baseX - 55, baseY - 36], [baseX + 55, baseY + 36]], P.oliveDark, li);
            A.line(c, [[baseX + 55, baseY - 36], [baseX - 55, baseY + 36]], P.oliveDark, li);
          });
        }
      }

      // Ở 122.36 – 128.5s: Vệ tinh lao vọt rất nhanh từ chân trời trái sang phải, chỉ chụp 1 dải ảnh hẹp ("streaks from horizon to horizon in minutes, snaps a strip of images")
      if (t >= 122.0 && t < 130.5) {
        const streakP = A.ph(t, 122.3, 126.2);
        const stripW = 1400 * streakP;
        A.withA(c, 0.25, () => {
          A.rrect(c, 260, 410, stripW, 240, 4, P.amber, P.amber, lw);
        });
        if (streakP < 1) {
          const sx = 260 + stripW;
          Assets.drawOpticalSat(c, sx, 530, 0.9, 'top');
        }
      }

      // Từ 133.80s ("Pull winter cloud over the front, wait for nightfall..."): Lớp mây xám dày kéo vào che kín chiến trường
      const cloudP = A.eio(t, CUE.ch2_winter_cloud, 136.5);
      if (cloudP > 0.01) {
        const cx1 = A.lerp(-350, 740, cloudP);
        const cx2 = A.lerp(2250, 1180, cloudP);
        Assets.drawCloudLayer(c, cx1, 520, 780, 320, true);
        Assets.drawCloudLayer(c, cx2, 560, 820, 340, true);
      }

      // Từ 140.8s ("comes back with pictures of gray wool"): Khung ảnh thu về hiện lên chỉ thấy một mảng xám đục + dấu X
      if (t >= 140.5) {
        const gp = A.sm(t, 140.5, 141.6);
        A.withA(c, gp, () => {
          A.rrect(c, 680, 260, 560, 360, 14, P.white, P.ink, lw * 1.4);
          A.rrect(c, 704, 284, 512, 312, 8, '#94a3b8', P.ink, li);
          // Vân len xám mù mịt bên trong khung ảnh
          for (let wy = 330; wy <= 550; wy += 55) {
            A.line(c, [[740, wy], [1180, wy]], '#cbd5e1', lw * 1.5, [28, 18]);
          }
          UI.xMark(c, 960, 440, 54, A.sm(t, 141.5, 142.3), P.enemy, lw * 2);
        });
      }

      K.end(c);
      return;
    }

    // ── SHOT 2.3 (144.12 – 183.00s): SIDE / CUTAWAY — Nguyên lý Radar Khẩu độ Tổng hợp (SAR) xuyên mây ──
    if (t < 183.0) {
      const cam = K.track(
        t,
        [
          [144.12, { x: 960, y: 540, z: 1.0 }],
          [158.36, { x: 960, y: 540, z: 1.02 }],
          [174.58, { x: 960, y: 580, z: 1.06 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Mặt đất ở y = 880 với xe tăng, lựu pháo ẩn dưới lớp mây dày ở y = 540
      Assets.drawSideTerrain(c, 80, 1840, 880, {
        clouds: [
          { x: 560, y: 550, w: 680, h: 115, dark: true },
          { x: 1280, y: 555, w: 720, h: 120, dark: true },
        ],
      });
      Assets.drawTank(c, 680, 880, 1.15, 'side', 'foe', 1);
      Assets.drawHowitzer(c, 1020, 880, 1.2, 'side', 'foe', -1, 0.45);
      Assets.drawTank(c, 1340, 880, 1.15, 'side', 'foe', -1);

      // 150.88 – 158.0s: Minh họa "An ordinary radar antenna in space would need to be hundreds of meters long... which no rocket could launch"
      if (t >= CUE.ch2_hundreds_meters && t < CUE.ch2_sar_solved) {
        const ap = A.win(t, CUE.ch2_hundreds_meters, CUE.ch2_sar_solved - 0.2, 0.3, 0.3);
        A.withA(c, ap, () => {
          // Thanh ăng-ten khổng lồ bất khả thi dài ngang cả bầu trời
          A.rrect(c, 320, 250, 1280, 32, 6, P.slate, P.ink, lw);
          Assets.drawRadarSat(c, 960, 240, 1.1, 'side');
          if (t >= 155.5) {
            UI.xMark(c, 960, 265, 58, A.sm(t, 155.5, 156.4), P.enemy, lw * 2);
          }
        });
      } else {
        // 158.36 – 183.00s: Nguyên lý SAR — Vệ tinh nhỏ bay dọc quỹ đạo (y = 220), bắn xung vi ba tại 5 vị trí và ghép thành 1 ăng-ten ảo dài
        const sarFlightP = A.ph(t, 158.5, 168.8);
        const curSatX = A.lerp(420, 1500, sarFlightP);
        const stations = [460, 710, 960, 1210, 1460];

        // Đường quỹ đạo ngang
        A.line(c, [[300, 220], [1620, 220]], P.slate, li, [14, 10]);

        // Vẽ các vị trí vệ tinh đã đi qua & chùm xung vi ba xuyên thẳng qua mây xuống mục tiêu rồi dội lại
        for (let i = 0; i < stations.length; i++) {
          const stX = stations[i]!;
          if (curSatX >= stX || t >= 168.8) {
            // Bóng mờ vị trí lấy mẫu trên đường bay
            A.withA(c, 0.45, () => {
              Assets.drawRadarSat(c, stX, 220, 0.78, 'side', { highlightArray: 1 });
            });
            // Tia vi ba (màu P.sky) đi xuyên qua lớp mây (y=550) xuống mục tiêu ở mặt đất (y=860)
            const targetX = i < 2 ? 680 : i === 2 ? 1020 : 1340;
            UI.dashed(c, [stX, 245], [targetX, 850], P.sky, li * 1.3, t * 120);
            // Sóng phản hồi (echo) màu P.amber đi ngược từ mục tiêu lên vị trí thu
            if (t >= 165.0) {
              UI.dashed(c, [targetX, 850], [stX, 245], P.amber, li, t * 95);
            }
          }
        }

        // Vệ tinh SAR thực tại vị trí hiện tại
        Assets.drawRadarSat(c, curSatX, 220, 1.1, 'cutaway', {
          highlightArray: (t * 1.5) % 1,
        });

        // Từ 168.90s ("combines those echoes as if they had been caught by one antenna the length of that flight path"):
        // Khung tổng hợp nối 5 vị trí thành 1 ăng-ten ảo dài + màn hình dựng bản đồ hình khối bên dưới
        if (t >= CUE.ch2_combines_echoes) {
          const cp = A.sm(t, CUE.ch2_combines_echoes, 170.5);
          A.withA(c, cp, () => {
            A.rrect(c, 410, 145, 1100, 115, 12, null, P.sky, lw * 1.2);
            A.line(c, [[410, 125], [1510, 125]], P.sky, lw);
          });
        }

        // Từ 178.58s ("not a photograph of colors, but a map of shapes and surfaces"):
        // Hiện đường viền hình học radar sắc nét nổi bật trên nền mục tiêu dưới mây
        if (t >= CUE.ch2_map_of_shapes) {
          const mp = A.sm(t, CUE.ch2_map_of_shapes, 180.0);
          UI.focus(c, 600, 815, 160, 75, mp, P.sky, lw);
          UI.focus(c, 945, 810, 150, 80, mp, P.sky, lw);
          UI.focus(c, 1260, 815, 160, 75, mp, P.sky, lw);
        }
      }

      K.end(c);
      return;
    }

    // ── SHOT 2.4 (183.00 – 202.34s): Phản xạ mặt nước vs Góc vuông kim loại (Corner Reflector) & Vệ tinh SIGINT ──
    if (t < CUE.ch2_sigint_antennas) {
      // 183.00 – 193.12s: Đối chiếu trực tiếp cơ chế tia radar chạm Mặt nước phẳng (bên trái) vs Góc vuông pháo/tàu (bên phải)
      const cam: K.Cam = { x: 960, y: 540, z: 1.05 };
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Địa hình: nửa trái (150..920) là mặt nước phẳng, nửa phải (920..1780) là bờ cảng có khẩu pháo & tàu chiến góc cạnh
      Assets.drawSideTerrain(c, 100, 1820, 840, {
        oceanFrom: 100,
        oceanTo: 920,
        wavePhase: 0, // mặt nước phẳng
      });

      // Vệ tinh SAR ở góc trên trái (380, 210) phát 2 tia radar xuống
      Assets.drawRadarSat(c, 380, 210, 1.15, 'side', { highlightArray: 1 });

      // 1) Tia bên trái chạm mặt nước phẳng tại (620, 845) → bị hắt chéo đi mất sang (860, 580), không quay về vệ tinh!
      const wP = A.sm(t, 183.5, 185.2);
      UI.arrow(c, [410, 240], [620, 842], { p: wP, color: P.sky, w: 5 });
      if (wP > 0.7) {
        UI.arrow(c, [620, 842], [860, 580], {
          p: A.sm(t, 184.5, 185.8),
          color: P.slate,
          w: 5,
        });
      }

      // 2) Tia bên phải (từ 186.40s) chạm góc vuông kim loại của khẩu pháo (1180, 840) và thượng tầng tàu chiến (1540, 840) → dội ngược thẳng về vệ tinh và lóe sáng như đèn hiệu!
      Assets.drawHowitzer(c, 1180, 840, 1.35, 'side', 'foe', -1, 0.45);
      Assets.drawWarship(c, 1540, 840, 1.25, 'side', 'foe', -1);

      // Màn hình kết quả thu ảnh Radar SAR (đặt ở góc trên phải 1260, 220) đối chiếu trực tiếp: Mặt nước = Đen tối vs Góc kim loại = Chấm sáng rực
      const screenP = A.sm(t, 184.2, 185.4);
      if (screenP > 0.01) {
        A.withA(c, screenP, () => {
          A.rrect(c, 1020, 110, 580, 220, 14, P.ink, P.slate, lw * 1.4);
          // Ngăn trái: Mặt nước phẳng không có sóng dội về -> Tối đen
          A.rrect(c, 1044, 134, 250, 172, 8, '#0f172a', P.ink2, li);
          A.line(c, [[1080, 250], [1255, 250]], P.dark, li, [12, 10]);
          // Ngăn phải: Pháo và Tàu có góc vuông -> Lóe sáng như đèn hiệu khi bP > 0
          A.rrect(c, 1316, 134, 260, 172, 8, '#0f172a', P.ink2, li);
        });
      }

      if (t >= CUE.ch2_metal_corners) {
        const cP = A.sm(t, CUE.ch2_metal_corners, 188.5);
        // Tia tới góc vuông của pháo & tàu
        UI.arrow(c, [440, 235], [1165, 805], { p: cP, color: P.sky, w: 5 });
        UI.arrow(c, [460, 230], [1510, 795], { p: cP, color: P.sky, w: 5 });

        // Ký hiệu góc vuông 90° màu vàng ở tấm chắn pháo và vách tàu
        A.path(c, [[1145, 805], [1145, 785], [1165, 785]], false);
        A.fs(c, null, P.amber, lw);
        A.path(c, [[1490, 795], [1490, 775], [1510, 775]], false);
        A.fs(c, null, P.amber, lw);

        // Tia phản xạ ngược thẳng về vệ tinh ("bounce the beam straight back and shine like beacons")
        const bP = A.sm(t, 188.8, 190.8);
        if (bP > 0) {
          UI.arrow(c, [1165, 805], [440, 235], { p: bP, color: P.amber, w: 6 });
          UI.arrow(c, [1510, 795], [460, 230], { p: bP, color: P.amber, w: 6 });

          // Đèn hiệu lóe sáng tại điểm góc vuông và trong màn hình ảnh SAR
          const beaconR = 24 + 8 * Math.sin(t * 14);
          A.circle(c, 1165, 805, beaconR * bP, P.amber, P.white, li);
          A.circle(c, 1510, 795, beaconR * bP, P.amber, P.white, li);

          // Hai điểm sáng rực trong ngăn phải màn hình Radar SAR
          A.circle(c, 1390, 220, 22 * bP, P.amber, P.white, lw);
          A.circle(c, 1500, 220, 26 * bP, P.amber, P.white, lw);
          UI.ring(c, 1390, 220, 48, (t * 1.6) % 1, P.amber, li);
          UI.ring(c, 1500, 220, 54, (t * 1.6 + 0.4) % 1, P.amber, li);
        }
      }

      K.end(c);
      return;
    }

    // 2.4B (193.12 – 202.34s): ORBITAL / SIDE — Vệ tinh SIGINT nghe lén sóng radio chỉ huy, radar phòng không, rồi bay về phía đường chân trời để nối sang Chương 3
    const cam: K.Cam = { x: 960, y: 860, z: 1.32 };
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

    // 3 nguồn phát sóng mặt đất: Sở chỉ huy (trái), Đài radar phòng không (giữa), Trạm truyền tin dã chiến (phải)
    const emitters = [
      { x: cx - 210, y: cy - rEarth + 18, col: P.amber },
      { x: cx, y: cy - rEarth + 4, col: P.enemy },
      { x: cx + 210, y: cy - rEarth + 18, col: P.sky },
    ];
    for (const em of emitters) {
      A.rrect(c, em.x - 26, em.y - 24, 52, 24, 4, P.dark, P.ink, lw);
      A.line(c, [[em.x, em.y - 24], [em.x, em.y - 48]], P.ink, lw);
      // Vòng sóng vô tuyến lan tỏa lên bầu trời
      for (let w = 1; w <= 3; w++) {
        const prog = ((t * 0.9 + w * 0.33) % 1);
        const r = 35 + prog * 185;
        A.withA(c, (1 - prog) * 0.8, () => {
          c.beginPath();
          c.arc(em.x, em.y - 48, r, -Math.PI * 0.8, -Math.PI * 0.2);
          c.strokeStyle = em.col;
          c.lineWidth = li * 1.3;
          c.stroke();
        });
      }
    }

    // Vệ tinh SAR đi trước và Vệ tinh SIGINT căng chảo lớn đi theo sau dọc quỹ đạo LEO (cách nhau 0.28 rad để thoáng rõ)
    // Tại t = 202.34s (cuối chương 2), góc của vệ tinh SIGINT là +0.18, SAR là +0.46 đang tiến về đường chân trời bên phải
    const pOrb = A.ph(t, CUE.ch2_sigint_antennas, CUE.ch2_end);
    const sigAng = A.lerp(-0.18, 0.18, pOrb);
    const sarAng = sigAng + 0.28;

    const [sigX, sigY] = [cx + Math.sin(sigAng) * rLeo, cy - Math.cos(sigAng) * rLeo];
    const [sarX, sarY] = [cx + Math.sin(sarAng) * rLeo, cy - Math.cos(sarAng) * rLeo];

    Assets.drawRadarSat(c, sarX, sarY, 0.65, 'side', { rot: sarAng, highlightArray: 0.8 });
    Assets.drawSigintSat(c, sigX, sigY, 0.78, 'side', { rot: sigAng, listening: 1 });

    K.end(c);
  }
}

function FX_arcFall(
  c: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  col: string,
  lw: number
) {
  c.beginPath();
  c.moveTo(x0, y0);
  c.quadraticCurveTo(x1 - 40, y0 + 20, x1, y1);
  c.setLineDash([12, 10]);
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.stroke();
  c.setLineDash([]);
}
