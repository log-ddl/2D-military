// scenes/sc04.ts — Chương 4 (290.78 – 364.64s):
// Tầng quỹ đạo trung bình (MEO ~20.000 km): Chòm vệ tinh định vị (GPS/Galileo/GLONASS/Beidou),
// bác bỏ hiểu lầm theo dõi 2 chiều, cơ chế đồng hồ nguyên tử 1 chiều, giao cắt 4 khoảng cách (Trilateration) & Vũ khí chính xác.

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
import { ORBIT_WORLD, drawThreeLayersWorld, CAM_THREE_LAYERS_WIDE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── SHOT 4.1 (290.78 – 307.16s): ORBITAL — Từ tầng cao hạ xuống tầng giữa MEO (~20.000 km) & Chòm vệ tinh định vị ──
    if (t < CUE.ch4_myth_tracks_receiver) {
      if (t < 300.0) {
        const cam = K.track(
          t,
          [
            [290.78, CAM_THREE_LAYERS_WIDE],
            [295.66, { x: 960, y: 580, z: 1.15 }],
            [300.0, { x: 960, y: 530, z: 1.38 }],
          ],
          A.eio
        );
        K.begin(c, cam);
        drawThreeLayersWorld(c, t, {
          activeLayer: t >= CUE.ch4_middle_layer_20000km ? 2 : 3,
          leoAngle: -0.25 + (t - 290.78) * 0.05,
          meoAngle: A.lerp(-0.18, 0, A.eio(t, 290.78, 299.5)),
          geoAngle: 0.18,
          showRays: true,
        });
        K.end(c);

        if (t >= 298.0 && t <= 300.0) {
          const sp = K.toScreen(cam, 960, 530);
          UI.callout(c, '20,000 km', sp[0] + 175, sp[1], {
            to: sp,
            p: A.win(t, 298.0, 300.0, 0.2, 0.15),
            color: P.sky,
          });
        }
        return;
      }

      // 300.00 – 307.16s: Mở rộng nhìn toàn bộ chòm vệ tinh định vị (constellations) quay quanh địa cầu ở tầng MEO 20.000 km
      const cam: K.Cam = { x: 960, y: 540, z: 1.02 };
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);
      const ecx = 960;
      const ecy = 540;
      const rE = 180;
      const rM = 365;

      // 2 mặt phẳng quỹ đạo chéo nhau của chòm vệ tinh định vị
      c.save();
      c.beginPath();
      c.arc(ecx, ecy, rM, 0, Math.PI * 2);
      c.setLineDash([16, 12]);
      c.strokeStyle = P.sky;
      c.lineWidth = lw;
      c.stroke();
      c.restore();

      A.ellipse(c, ecx, ecy, rM, rM * 0.48, 0.45, null, 'rgba(56,189,248,0.45)', li);
      A.ellipse(c, ecx, ecy, rM, rM * 0.48, -0.45, null, 'rgba(56,189,248,0.45)', li);

      Assets.drawEarthArc(c, ecx, ecy, rE, {
        rot: (t - 300.0) * 0.08,
        showAtmo: true,
        showGrid: true,
      });

      // 6 vệ tinh định vị rải đều quanh vòng quỹ đạo MEO
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + (t - 300.0) * 0.22;
        const sx = ecx + Math.sin(ang) * rM;
        const sy = ecy - Math.cos(ang) * rM;
        Assets.drawNavSat(c, sx, sy, 0.58, 'cutaway', {
          rot: ang,
          clockPhase: t * 4,
        });
      }

      K.end(c);
      if (t <= 303.0) {
        UI.callout(c, '20,000 km', 1460, 220, {
          p: A.win(t, 300.0, 303.0, 0.1, 0.25),
          color: P.sky,
        });
      }
      return;
    }

    // ── SHOT 4.2 (307.16 – 325.16s): SIDE → CUTAWAY — Bác bỏ hiểu lầm theo dõi 2 chiều & Lộ Đồng hồ nguyên tử phát sóng 1 chiều ──
    if (t < CUE.ch4_receivers_listen) {
      const cam = K.track(
        t,
        [
          [307.16, { x: 960, y: 540, z: 1.02 }],
          [315.5, { x: 960, y: 390, z: 1.42 }],
          [325.16, { x: 960, y: 430, z: 1.28 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Mặt đất ở y = 890 với người lính cầm máy tính bảng thu sóng
      Assets.drawSideTerrain(c, 100, 1820, 890);
      const sol = R.rig(c, { x: 960, y: 890, s: 1.05, dir: 1, skin: 'ally', weapon: null });
      // Máy tính bảng trên tay người lính
      A.rrect(c, sol.hand[0] - 4, sol.hand[1] - 12, 26, 18, 3, P.sky, P.ink, li);

      // Vệ tinh định vị ở trên cao (960, 260)
      const isCutaway = t >= 315.2;
      Assets.drawNavSat(c, 960, 260, 1.85, isCutaway ? 'cutaway' : 'side', {
        rot: 0,
        clockPhase: (t - 307.0) * 3.2,
      });

      // 307.16 – 315.40s ("People often talk as if a navigation satellite reaches down and tracks their receiver. It does nothing of the sort"):
      // Vẽ tia quét tìm kiếm + mũi tên phản hồi từ người lính lên vệ tinh, rồi gạch chéo X đỏ!
      if (t < 315.5) {
        const mythAlpha = A.win(t, 307.2, 315.3, 0.3, 0.3);
        A.withA(c, mythAlpha, () => {
          // Chùm đèn rọi tìm kiếm giả định
          A.withA(c, 0.2, () => {
            A.poly(c, [[940, 355], [980, 355], [1070, 890], [850, 890]], P.amber, null, 0);
          });
          UI.arrow(c, [935, 370], [935, 760], { p: A.sm(t, 307.6, 309.2), color: P.amber, w: 6 });
          UI.arrow(c, [985, 760], [985, 370], { p: A.sm(t, 309.0, 310.6), color: P.enemy, w: 6 });

          if (t >= CUE.ch4_never_knows) {
            UI.xMark(c, 960, 565, 68, A.sm(t, CUE.ch4_never_knows, 312.6), P.enemy, lw * 2.2);
          }
        });
      } else {
        // 315.50 – 325.16s ("All it does, day and night, is broadcast a continuous radio signal announcing where the satellite is... and the exact time according to an atomic clock on board"):
        // Vòng sóng đồng tâm phát 1 chiều từ đồng hồ nguyên tử lan tỏa đều xuống dưới kèm các icon mặt đồng hồ mốc giờ
        for (let i = 0; i < 4; i++) {
          const prog = ((t * 0.45 + i * 0.25) % 1);
          const r = 90 + prog * 540;
          A.withA(c, (1 - prog) * 0.85, () => {
            c.beginPath();
            c.arc(960, 260, r, 0.12 * Math.PI, 0.88 * Math.PI);
            c.strokeStyle = P.sky;
            c.lineWidth = lw;
            c.stroke();

            // Gói mốc thời gian (timestamp badge) đi kèm trên mặt sóng
            const bx = 960;
            const by = 260 + r;
            A.rrect(c, bx - 32, by - 18, 64, 36, 8, P.white, P.sky, li);
            A.circle(c, bx, by, 11, P.paper, P.ink, li);
            A.line(c, [[bx, by], [bx, by - 7]], P.ink, li);
            A.line(c, [[bx, by], [bx + 6, by]], P.enemy, li);
          });
        }
      }

      K.end(c);
      return;
    }

    // ── SHOT 4.3 (325.16 – 350.50s): SIDE DIAGRAM → TOP MAP — Lắng nghe 4 vệ tinh, đo độ trễ nhân tốc độ ánh sáng & Giao cắt 4 vòng khoảng cách ──
    if (t < 350.5) {
      // 4.3A (325.16 – 343.20s): Sơ đồ 4 vệ tinh trên cao phát sóng xuống 3 loại đầu thu (máy tính bảng, tên lửa hành trình, đạn pháo dẫn đường) & Thanh đo độ trễ thời gian
      if (t < 343.2) {
        const cam: K.Cam = { x: 960, y: 540, z: 1.0 };
        K.begin(c, cam);
        const lw = A.px(c, LINE.outer);
        const li = A.px(c, LINE.inner);

        Assets.drawSideTerrain(c, 80, 1840, 910);

        // 4 Vệ tinh định vị trên vòng cung cao (y = 180..250) ở các khoảng cách khác nhau tới mục tiêu
        const sats: { x: number; y: number; delay: number }[] = [
          { x: 310, y: 250, delay: 0.82 },
          { x: 740, y: 175, delay: 0.58 },
          { x: 1180, y: 175, delay: 0.62 },
          { x: 1610, y: 250, delay: 0.88 },
        ];

        // 3 vật mang đầu thu (325.16 – 333.24s): Lính cầm tablet (trái), Tên lửa hành trình (giữa), Đạn pháo dẫn đường (phải)
        const focusCenterP = A.eio(t, 332.8, 334.2);
        if (focusCenterP < 0.99) {
          A.withA(c, 1 - focusCenterP, () => {
            const s1 = R.rig(c, { x: 520, y: 910, s: 0.95, dir: 1, skin: 'ally', weapon: null });
            A.rrect(c, s1.hand[0] - 4, s1.hand[1] - 12, 24, 16, 3, P.sky, P.ink, li);
            Assets.drawGuidedMunition(c, 1400, 740, 1.15, 'shell', 'cutaway', 0.35);
          });
        }

        // Chủ thể chính ở giữa (960, 730): Tên lửa hành trình / Bom lượn mở mặt cắt lộ bộ thu GPS
        const recX = 960;
        const recY = 730;
        Assets.drawGuidedMunition(c, recX, recY, 1.45, 'cruise', 'cutaway', 0);

        // Vẽ 4 vệ tinh và 4 đường truyền xung thời gian xuống bộ thu (recX, recY)
        for (let i = 0; i < sats.length; i++) {
          const st = sats[i]!;
          Assets.drawNavSat(c, st.x, st.y, 0.78, 'cutaway', {
            clockPhase: t * 3.5,
          });
          const lineP = A.sm(t, 329.5 + i * 0.45, 331.5 + i * 0.45);
          if (lineP > 0) {
            UI.dashed(c, [st.x, st.y + 45], [recX, recY - 12], P.sky, lw, t * 130);
            // Xung mốc thời gian chạy dọc tia từ vệ tinh xuống đầu thu
            const pulseP = ((t * 0.65 + i * 0.2) % 1) * lineP;
            const px = A.lerp(st.x, recX, pulseP);
            const py = A.lerp(st.y + 45, recY - 12, pulseP);
            A.circle(c, px, py, 9, P.amber, P.ink, li);
          }
        }

        // Từ 333.24s ("By comparing the timestamp in each signal with the instant it arrived... multiplies that delay by the speed of light, and finds its distance"):
        // Bảng đo so sánh 4 độ trễ (Δt) chuyển hóa thành 4 thanh khoảng cách (d = c × Δt)
        if (t >= CUE.ch4_compare_timestamp) {
          const boxP = A.sm(t, CUE.ch4_compare_timestamp, 334.6);
          const distP = A.eio(t, CUE.ch4_multiply_lightspeed - 0.5, 342.5);
          A.withA(c, boxP, () => {
            A.rrect(c, 640, 380, 640, 230, 14, P.white, P.ink, lw);
            for (let i = 0; i < 4; i++) {
              const ry = 415 + i * 48;
              // Đồng hồ lúc phát (trái) vs lúc nhận (phải)
              A.circle(c, 685, ry, 15, P.paper, P.ink, li);
              A.line(c, [[685, ry], [685, ry - 10]], P.ink, li);
              // Thanh độ trễ kéo dài thành khoảng cách theo vận tốc ánh sáng
              const barW = 460 * sats[i]!.delay * A.lerp(0.45, 1.0, distP);
              UI.bar(c, 720, ry - 12, 480, 24, barW / 480, distP > 0.3 ? P.amber : P.sky, 1);
            }
          });
        }

        K.end(c);
        return;
      }

      // 4.3B (343.20 – 350.50s): Góc TOP trên bản đồ — 4 vòng tròn khoảng cách từ 4 vệ tinh giao cắt tại 1 điểm duy nhất ("Where those four distances meet is the receiver's position")
      const cam = K.track(
        t,
        [
          [343.2, { x: 960, y: 540, z: 1.0 }],
          [347.5, { x: 960, y: 540, z: 1.28 }],
          [350.5, { x: 960, y: 540, z: 1.35 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      M.mapBg(c, cam, { color: '#eae4d0', grid: 100 });
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Mục tiêu thực ở tâm (960, 540)
      const tx = 960;
      const ty = 540;
      M.road(c, [[200, 540], [1720, 540]], 26);
      M.road(c, [[960, 120], [960, 960]], 26);

      // 4 tâm chiếu vệ tinh ở 4 góc, bán kính đúng bằng khoảng cách tới (960, 540)
      const centers: A.Pt[] = [
        [360, 180],
        [1560, 200],
        [390, 890],
        [1530, 880],
      ];
      for (let i = 0; i < centers.length; i++) {
        const [cx, cy] = centers[i]!;
        const targetR = Math.hypot(tx - cx, ty - cy);
        const expandP = A.eio(t, 343.2 + i * 0.35, 346.2 + i * 0.25);
        const r = targetR * expandP;

        c.save();
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.strokeStyle = i % 2 === 0 ? P.sky : P.amber;
        c.lineWidth = lw;
        c.stroke();
        c.restore();

        // Bán kính nối từ vệ tinh tới điểm giao
        if (expandP > 0.85) {
          A.line(c, [[cx, cy], [tx, ty]], P.ink2, li, [10, 8]);
        }
        Assets.drawNavSat(c, cx, cy, 0.65, 'cutaway', { clockPhase: t * 3 });
      }

      // Điểm giao cắt của 4 vòng khoảng cách khóa chặt mục tiêu ở (960, 540)
      const meetP = A.sm(t, 346.0, 347.2);
      if (meetP > 0) {
        UI.crosshair(c, tx, ty, 46, P.enemy, meetP, (t - 346.0) * 1.2);
        A.circle(c, tx, ty, 12 * meetP, P.enemy, P.white, lw);
      }

      K.end(c);
      return;
    }

    // ── SHOT 4.4 (350.50 – 364.64s): SIDE → TOP → ORBITAL — Bom lượn xuyên mái nhà, Tên lửa trúng ngã tư & Chùm đồng hồ quỹ đạo ──
    // 4.4A (350.50 – 356.65s): Góc SIDE — Bom lượn nhận sóng từ 4 đồng hồ bay, rơi xuyên qua mái nhà mục tiêu và phát nổ lúc 355.8s
    if (t < 356.65) {
      const hitT = 355.75;
      const baseCam: K.Cam = { x: 960, y: 540, z: 1.05 };
      const cam = K.withShake(baseCam, t, [[hitT, 18, 0.6]]);

      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      Assets.drawSideTerrain(c, 80, 1840, 880);

      // Tòa nhà mục tiêu ở (1320, 880)
      const dmg = A.sm(t, hitT, hitT + 0.3);
      A.rrect(c, 1180, 720, 280, 160, 6, '#d6cbb0', P.ink, lw);
      // Mái nhà (bị xuyên thủng khi dmg > 0)
      if (dmg < 0.5) {
        A.poly(c, [[1160, 720], [1320, 650], [1480, 720]], P.enemy, P.ink, lw);
      } else {
        A.poly(c, [[1160, 720], [1265, 675], [1280, 720]], P.enemy, P.ink, lw);
        A.poly(c, [[1360, 720], [1375, 675], [1480, 720]], P.enemy, P.ink, lw);
      }

      // 4 biểu tượng đồng hồ nguyên tử vệ tinh ở rìa trên bầu trời phát tia dẫn đường xuống bom lượn
      const clockXs = [420, 760, 1120, 1460];
      const dropP = A.ei(t, 350.8, hitT);
      const bx = A.lerp(420, 1320, dropP);
      const by = A.lerp(290, 740, dropP);

      for (const cx of clockXs) {
        Assets.drawNavSat(c, cx, 135, 0.58, 'cutaway', { clockPhase: t * 4 });
        if (t < hitT) {
          UI.dashed(c, [cx, 175], [bx, by], P.sky, li, t * 150);
        }
      }

      if (t < hitT) {
        Assets.drawGuidedMunition(c, bx, by, 1.35, 'glide_bomb', 'cutaway', 0.44);
      }

      // Vụ nổ xuyên mái nhà tại hitT = 355.75s
      if (t >= hitT) {
        FX.explosion(c, 1320, 740, 145, A.ph(t, hitT, hitT + 0.8), lw);
        FX.debris(c, 1320, 720, t - hitT, 1.1, 14, 7, 880);
        FX.smoke(c, 1320, 730, t - hitT, 1.1, 7);
      }

      K.end(c);
      return;
    }

    // 4.4B (356.65 – 359.20s): Góc TOP — Đạn tên lửa rơi trúng tâm ngã tư ("every rocket landing on a crossroads")
    if (t < 359.2) {
      const hitT2 = 357.85;
      const baseCam: K.Cam = { x: 960, y: 540, z: 1.15 };
      const cam = K.withShake(baseCam, t, [[hitT2, 18, 0.6]]);

      K.begin(c, cam);
      M.mapBg(c, cam, { color: '#eae4d0', grid: 100 });
      const lw = A.px(c, LINE.outer);

      // Ngã tư đường chiến thuật ở (960, 540)
      M.road(c, [[180, 540], [1740, 540]], 44);
      M.road(c, [[960, 120], [960, 960]], 44);
      UI.crosshair(c, 960, 540, 52, P.enemy, 1, 0);

      // Đường đạn tên lửa bay vào tâm ngã tư
      const rP = A.ei(t, 356.65, hitT2);
      if (t < hitT2) {
        FX.straightShot(c, [320, 180], [960, 540], rP, { color: P.enemy, w: 7 });
      } else {
        FX.explosion(c, 960, 540, 155, A.ph(t, hitT2, hitT2 + 0.85), lw);
        FX.smoke(c, 960, 540, t - hitT2, 1.0, 6);
      }

      K.end(c);
      return;
    }

    // 4.4C (359.20 – 364.64s): ORBITAL / SIDE — Chùm đồng hồ nguyên tử trên quỹ đạo MEO 20.000 km phát sóng xuống mặt đất (nối mượt sang đầu Chương 5)
    const cam: K.Cam = { x: 960, y: 540, z: 1.0 };
    K.begin(c, cam);
    const lw = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // Mặt đất ở đáy y = 920
    Assets.drawSideTerrain(c, 80, 1840, 920);
    Assets.drawHowitzer(c, 640, 920, 1.05, 'side', 'ally', 1, 0.45);
    Assets.drawTank(c, 1280, 920, 1.05, 'side', 'ally', -1);

    // Cung quỹ đạo MEO ở y = 200..260 với 4 vệ tinh đồng hồ nguyên tử lớn
    c.save();
    c.beginPath();
    c.moveTo(160, 290);
    c.quadraticCurveTo(960, 130, 1760, 290);
    c.setLineDash([16, 12]);
    c.strokeStyle = P.sky;
    c.lineWidth = lw;
    c.stroke();
    c.restore();

    const satPositions: A.Pt[] = [
      [380, 250],
      [760, 195],
      [1160, 195],
      [1540, 250],
    ];
    for (const [sx, sy] of satPositions) {
      UI.dashed(c, [sx, sy + 55], [960, 910], P.sky, li * 1.2, t * 120);
      Assets.drawNavSat(c, sx, sy, 1.05, 'cutaway', {
        clockPhase: t * 4,
      });
    }

    K.end(c);
  }
}
