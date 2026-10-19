// scenes/sc23.ts — Chương 5 (448.02 – 476.421s): Khép vòng tròn về "10 giây đầu tiên" & tổng hợp 4 mảnh ghép cơ khí.
// - Nhịp 1 (448.02 – 455.8s, SIDE chiến hào): Trở lại 10 giây đầu tiên khi bộ binh trên mặt đất chưa kịp nhảy xuống hào.
// - Nhịp 2 (455.8 – 467.2s, CUTAWAY tổng hợp 4 cơ cấu -> Katyusha 1941): (1) Ống phóng hở không giật,
//   (2) Cánh đuôi gập lò xo, (3) Hộp Pod nạp bằng cẩu, (4) Mũi dẫn đường vệ tinh — tất cả bắt nguồn từ Katyusha 1941.
// - Nhịp 3 (467.2 – 476.421s, SIDE chia đôi kết phim): Pháo nòng chiến đấu qua hàng giờ vs Pháo phản lực
//   nén cả một buổi chiều hủy diệt vào đúng vài giây trước khi kẻ địch kịp chớp mắt.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawEnvCutaway,
  drawTrench,
  drawSoldier,
  drawGrad,
  drawRocket,
  drawPod,
  drawKatyusha,
  drawHowitzer,
  drawHimars,
  drawShell,
  drawExplosion,
  drawCallout,
  drawTimerBar,
} from './_assets';

const GROUND_Y = 220;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const mixB = A.eio(t, 455.3, 456.4);
    const mixC = A.eio(t, 466.8, 467.9);

    const cam: K.Cam = { x: 0, y: 80, z: 1.45 };
    K.begin(c, cam);

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // ── NHỊP 1 (448.02 – 456.4s): QUAY LẠI 10 GIÂY ĐẦU TIÊN Ở CHIẾN HÀO ──
    if (mixB < 0.99) {
      A.withA(c, 1 - mixB, () => {
        drawEnvSide(c, cam, {
          groundY: GROUND_Y,
          showTrees: true,
          clearZoneX: [-420, 480],
        });
        drawTrench(c, 120, GROUND_Y, 260, 100, 'side');

        // 5 người lính đứng lộ trên mặt đất chưa kịp nhảy xuống hào trong 10 giây đầu
        const diveP = A.eio(t, 453.2, 455.4);
        const sxList = [-220, -125, -35, 415, 495];
        for (let i = 0; i < sxList.length; i++) {
          const sx = A.lerp(sxList[i], 160 + i * 38, diveP);
          const sy = A.lerp(GROUND_Y, GROUND_Y + 86, diveP);
          c.save();
          c.translate(sx, sy);
          drawSoldier(c, {
            view: 'side',
            faction: 'enemy',
            pose: diveP > 0.65 ? 'prone' : diveP > 0.15 ? 'run' : 'stand',
            dir: i < 3 ? 1 : -1,
            phase: t * 2 + i,
          });
          c.restore();
        }

        // Loạt đạn phản lực dội xuống mặt đất trong cửa sổ 10 giây
        for (let r = 0; r < 6; r++) {
          const rt0 = 449.2 + r * 0.65;
          const rp = (t - rt0) / 1.15;
          const tx = -260 + r * 115;
          if (rp > 0 && rp < 1) {
            const rx = A.lerp(tx - 180, tx, rp);
            const ry = A.lerp(GROUND_Y - 340, GROUND_Y - 8, rp);
            A.line(c, [[rx - 45, ry - 85], [rx, ry]], P.amber, lwIn, [6, 5]);
            c.save();
            c.translate(rx, ry);
            c.rotate(1.05);
            c.scale(0.65, 0.65);
            drawRocket(c, { variant: '122mm', view: 'side', thrust: 0.7 });
            c.restore();
          } else if (rp >= 1 && rp < 2.1) {
            drawExplosion(c, tx, GROUND_Y - 6, rp - 1, 78, 8);
          }
        }
      });
    }

    // ── NHỊP 2 (455.3 – 467.9s): 4 CƠ CẤU HIỆN ĐẠI BẮT NGUỒN TỪ KATYUSHA 1941 ──
    if (mixB > 0.01 && mixC < 0.99) {
      A.withA(c, mixB * (1 - mixC), () => {
        drawEnvCutaway(c, cam, 120);
        const katGroundY = 265;
        A.line(c, [[-820, katGroundY], [820, katGroundY]], P.ink, lw);

        const panels = [
          { x: -420, t0: 457.0 },
          { x: -140, t0: 459.5 },
          { x: 140, t0: 461.1 },
          { x: 420, t0: 462.6 },
        ];
        const py = -55;

        // Đường nối phả hệ từ 4 ô cơ khí xuống chiếc Katyusha 1941 ở (0, katGroundY - 65)
        if (t >= 463.8) {
          const lineP = A.eo(t, 463.8, 465.4);
          for (const pan of panels) {
            const ex = A.lerp(pan.x, 0, lineP);
            const ey = A.lerp(py + 88, katGroundY - 95, lineP);
            A.line(c, [[pan.x, py + 88], [ex, ey]], P.amber, lwIn * 1.4, [8, 6]);
          }
        }

        // Vẽ 4 ô cơ khí theo đúng nhịp lời đọc
        for (let i = 0; i < panels.length; i++) {
          const pan = panels[i];
          const pIn = A.eo(t, pan.t0, pan.t0 + 1.0);
          if (pIn <= 0.01) continue;

          A.withA(c, pIn, () => {
            A.rrect(c, pan.x - 122, py - 88, 244, 176, 10, P.paper, P.amber, lw);

            c.save();
            c.translate(pan.x, py);
            if (i === 0) {
              // 1. Ống phóng hở không giật (Recoilless Open Tube)
              c.scale(0.55, 0.55);
              drawGrad(c, { view: 'cutaway' });
              drawRocket(c, {
                variant: '122mm',
                view: 'cutaway',
                fuelLeft: 0.65,
                thrust: 0.85,
              });
            } else if (i === 1) {
              // 2. Cánh đuôi gập lò xo (Folding Tail Fins)
              c.scale(0.95, 0.95);
              drawRocket(c, {
                variant: '122mm',
                view: 'rear_axis',
                finOpen: A.eo(t, pan.t0 + 0.15, pan.t0 + 1.1),
                spinPhase: (t - pan.t0) * 3.2,
              });
            } else if (i === 2) {
              // 3. Hộp Pod nạp bằng cẩu (Crane-Loaded Pod)
              c.scale(0.72, 0.72);
              drawPod(c, { view: 'front', variant: '6x227', rocketsLeft: 6, highlight: true });
            } else if (i === 3) {
              // 4. Mũi dẫn đường vệ tinh (Satellite-Steered Nosecone)
              c.translate(-12, 0);
              c.scale(0.56, 0.56);
              drawRocket(c, {
                variant: '227mm',
                view: 'cutaway',
                fuelLeft: 0.85,
                canardDeg: Math.sin(t * 5) * 14,
                highlight: 'guidance',
              });
            }
            c.restore();
          });
        }

        // Xe tải Katyusha 1941 ở trung tâm bên dưới
        const katIn = A.eo(t, 456.0, 457.2);
        if (katIn > 0.01) {
          A.withA(c, katIn, () => {
            c.save();
            c.translate(0, katGroundY);
            c.scale(0.95, 0.95);
            drawKatyusha(c, {
              view: 'side',
              elevateDeg: 26,
              rocketsLoaded: 8,
            });
            c.restore();
          });
        }
      });
    }

    // ── NHỊP 3 (466.8 – 476.421s): ĐỐI CHIẾU KẾT PHIM — HOWITZER (HOURS) VS ROCKET ARTILLERY (SECONDS) ──
    if (mixC > 0.01) {
      A.withA(c, mixC, () => {
        drawEnvSide(c, cam, {
          groundY: GROUND_Y,
          showTrees: false,
        });

        // Vạch chia đôi khung hình
        A.line(c, [[0, -280], [0, 340]], P.ink, lw);

        // --- NỬA TRÁI: PHÁO NÒNG CHIẾN ĐẤU QUA HÀNG GIỜ (HOWITZER · HOURS) ---
        const howCycle = (t - 467.2) % 2.4;
        const howRecoil =
          howCycle >= 0 && howCycle < 0.4 ? Math.sin((howCycle / 0.4) * Math.PI) * 0.75 : 0;
        const howFlash = howCycle >= 0 && howCycle < 0.18 ? 1 - howCycle / 0.18 : 0;

        c.save();
        c.translate(-480, GROUND_Y);
        c.scale(0.82, 0.82);
        drawHowitzer(c, {
          view: 'side',
          elevateDeg: 24,
          recoil: howRecoil,
          muzzleFlash: howFlash,
        });
        c.restore();

        if (howCycle >= 0) {
          const sp = A.clamp01(howCycle / 1.75);
          const sx = A.lerp(-385, -95, sp);
          const sy = GROUND_Y - 45 * (1 - sp) - Math.sin(sp * Math.PI) * 135;
          if (sp < 1) {
            drawShell(c, { x: sx, y: sy, rot: (sp - 0.5) * 1.1, scale: 0.78 });
          } else {
            drawExplosion(c, -95, GROUND_Y - 6, A.clamp01((howCycle - 1.75) / 0.55), 52, 6);
          }
        }

        // --- NỬA PHẢI: PHÁO PHẢN LỰC NÉN CẢ BUỔI CHIỀU HỦY DIỆT VÀO VÀI GIÂY (ROCKET ARTILLERY · SECONDS) ---
        c.save();
        c.translate(155, GROUND_Y);
        c.scale(0.85, 0.85);
        drawHimars(c, {
          view: 'side',
          elevateDeg: 28,
          podVariant: '6x227',
        });
        c.restore();

        drawTrench(c, 435, GROUND_Y, 155, 85, 'side');

        if (t >= 469.6) {
          for (let k = 0; k < 12; k++) {
            const kt0 = 469.8 + k * 0.26;
            const kp = (t - kt0) / 1.35;
            if (kp <= 0) continue;

            const tx = 415 + (k % 5) * 32;
            const arcH = 145 + (k % 3) * 28;
            const clampP = A.clamp01(kp);

            const pts: A.Pt[] = [];
            for (let s = 0; s <= 14; s++) {
              const u = (s / 14) * clampP;
              pts.push([
                A.lerp(185, tx, u),
                GROUND_Y - 95 * (1 - u) - Math.sin(u * Math.PI) * arcH,
              ]);
            }
            A.line(c, pts, P.amber, lwIn * 1.2);

            const head = pts[pts.length - 1];
            if (kp < 1) {
              c.save();
              c.translate(head[0], head[1]);
              c.rotate((kp - 0.45) * 1.25);
              c.scale(0.58, 0.58);
              drawRocket(c, { variant: '227mm', view: 'side', thrust: 0.9 });
              c.restore();
            } else if (kp < 2.1) {
              drawExplosion(c, tx, GROUND_Y - 6, kp - 1, 68, 8);
            }
          }
        }
      });
    }

    K.end(c);

    // ── CALLOUTS & ĐỒNG HỒ TRÊN MÀN HÌNH ──
    if (mixB < 0.95) {
      const tProg = A.clamp01((t - 448.02) / 7.2);
      drawTimerBar(
        c,
        960,
        125,
        460,
        tProg,
        '0 – 10s CASUALTY WINDOW (ABOVE GROUND)',
        P.enemy,
        1 - mixB
      );
    }

    if (mixB > 0.1 && mixC < 0.9) {
      const cAlpha = mixB * (1 - mixC);
      const titles: [number, number, string][] = [
        [-420, 457.0, '1. OPEN TUBE'],
        [-140, 459.5, '2. FOLDING FINS'],
        [140, 461.1, '3. CRANE POD'],
        [420, 462.6, '4. GPS NOSECONE'],
      ];
      for (const [px, t0, title] of titles) {
        const a = A.eo(t, t0, t0 + 0.8) * cAlpha;
        if (a > 0.01) {
          const pt = K.toScreen(cam, px, -143);
          drawCallout(c, pt, [0, -42], title, a, P.amber);
        }
      }

      const kAlpha = A.eo(t, 463.8, 465.0) * cAlpha;
      if (kAlpha > 0.01) {
        const ptK = K.toScreen(cam, 0, 145);
        drawCallout(c, ptK, [240, -25], '1941 KATYUSHA LINEAGE', kAlpha, P.amber);
      }
    }

    if (mixC > 0.1) {
      const ptLeft = K.toScreen(cam, -290, -145);
      drawCallout(c, ptLeft, [0, -45], 'HOWITZER · FIGHTS OVER HOURS', mixC, P.olive);

      const rAlpha = A.eo(t, 469.6, 470.8) * mixC;
      if (rAlpha > 0.01) {
        const ptRight = K.toScreen(cam, 310, -145);
        drawCallout(
          c,
          ptRight,
          [0, -45],
          'ROCKET ARTILLERY · AFTERNOON IN SECONDS',
          rAlpha,
          P.amber
        );
      }
    }
  }
}
