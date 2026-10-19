// scenes/sc01.ts — Chương 1 (0.00 – 80.64s): Hình khối kim cương từ toán học 1970s & nguyên lý hắt lệch tia radar
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawTechBg,
  drawSkyGroundBg,
  drawStealthDiamond,
  drawConventionalJet,
  drawRadarStation,
  drawComputer1970s,
  drawRuler,
  drawRadarWave,
} from './_assets';

export default class Sc01 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // ── NHỊP 1.1 (0.00 – 25.68s): BÀN THIẾT KẾ KỸ THUẬT & MÁY TÍNH 1970s ──────
    if (t < CUE.question) {
      const cam = K.track(
        t,
        [
          [0.0, { x: 0, y: -10, z: 1.08 }],
          [4.2, { x: 0, y: -10, z: 1.08 }],
          [11.3, { x: 0, y: 0, z: 1.02 }],
          [13.2, { x: -40, y: 0, z: 0.96 }],
          [25.68, { x: -40, y: 0, z: 0.96 }],
        ],
        A.eio
      );

      A.clear(c, P.bg);
      K.begin(c, cam);
      drawTechBg(c, cam);

      if (t < 11.32) {
        // 0.00 – 4.2s: Hiện góc nhìn từ trên xuống ('top') thấy rõ hình viên kim cương,
        // sau đó chuyển sang góc nhìn ngang ('side') với thước kẻ đo các mặt vát phẳng
        const toSide = A.sm(t, 3.6, 4.7);
        if (toSide < 0.99) {
          A.withA(c, 1 - toSide, () => {
            // Khung viền kim cương bao quanh máy bay ở giây đầu tiên
            const dScale = 1.65;
            drawStealthDiamond(c, 0, -20, dScale, 'top', {
              showParallelAngles: t > 2.2,
            });
            const dp = A.sm(t, 0.2, 2.8);
            if (dp > 0) {
              const pts: A.Pt[] = [
                [410, -20],
                [-40, -375],
                [-400, -20],
                [-40, 335],
                [410, -20],
              ];
              A.line(c, pts.slice(0, Math.max(2, Math.ceil(pts.length * dp))), P.amber, A.px(c, 4.5), [16, 10]);
            }
          });
        }

        if (toSide > 0.01) {
          A.withA(c, toSide, () => {
            const fIdx = t > 6.2 ? Math.floor(((t - 6.2) * 2.2) % 4) : 0;
            drawStealthDiamond(c, 20, -20, 1.85, 'side', {
              highlightFacet: t > 4.2 && t < 8.2 ? fIdx : -1,
            });

            // Cây thước kẻ trượt dọc theo mặt vát mũi & buồng lái (4.6 – 8.5s)
            const rIn = A.win(t, 4.3, 8.8, 0.4, 0.4);
            if (rIn > 0.01) {
              A.withA(c, rIn, () => {
                const slide = A.lerp(-80, 90, A.eio(t, 4.5, 8.2));
                drawRuler(c, 160 + slide * 0.6, -98 + slide * 0.18, 420, 0.29);
              });
            }

            // 7.96 – 11.32s: "Not designed that way because engineers thought it was elegant"
            // Hiện đường cong khí động học mượt phía trên rồi gạch bỏ
            if (t >= 7.9) {
              const cp = A.sm(t, 7.96, 9.4);
              c.save();
              c.beginPath();
              c.moveTo(-360, -180);
              c.bezierCurveTo(-120, -290, 180, -280, 430, -170);
              A.fs(c, null, P.ink2, A.px(c, 4));
              c.restore();
              if (cp > 0.4) {
                U.xMark(c, 40, -235, 38, A.sm(t, 9.2, 10.2), P.enemy, A.px(c, 7));
              }
            }
          });
        }
      } else {
        // 11.32 – 25.68s: Máy tính 1970s bên trái + So sánh phản xạ Mặt phẳng vs Mặt cong bên phải
        const compIn = A.sm(t, 11.32, 12.6);
        const isCurvePhase = t >= CUE.curves_beyond && t < CUE.arithmetic - 0.5;
        const isFinalDiamond = t >= CUE.arithmetic - 0.5;
        const overload = isCurvePhase ? A.sm(t, CUE.curves_beyond, CUE.curves_beyond + 1.0) : 0;

        A.withA(c, compIn, () => {
          drawComputer1970s(c, -580, 20, 1.25, {
            tapeAngle: t * (isCurvePhase ? 12 : 4.5),
            overload,
          });
        });

        // Đường cáp dữ liệu nối từ máy tính sang vùng thử phản xạ
        A.line(c, [[-430, 20], [-290, 20]], P.ink2, A.px(c, 3.5), [10, 8]);

        // Nguồn phát tia thử nghiệm bên phải
        drawRadarStation(c, 670, 230, 1.15, 'side', { dishAngle: -0.38 });

        if (!isCurvePhase && !isFinalDiamond) {
          // 11.54 – 19.24s: Tia radar đập vào tấm phẳng nghiêng → 1 tia phản xạ đơn giản
          drawStealthDiamond(c, 110, -10, 1.5, 'side', { highlightFacet: 0 });
          const wp = ((t - 11.5) * 0.75) % 1;
          const hitPt: A.Pt = [290, -30];
          drawRadarWave(c, [590, 115], hitPt, A.clamp01(wp * 1.7), { color: P.sky, w: A.px(c, 5) });
          if (wp > 0.35) {
            drawRadarWave(c, hitPt, [410, -310], A.clamp01((wp - 0.35) * 1.7), {
              color: P.amber,
              w: A.px(c, 5),
            });
            A.circle(c, hitPt[0], hitPt[1], 10, P.amber, P.ink, A.px(c, 2.5));
          }
        } else if (isCurvePhase) {
          // 19.24 – 23.3s: "Curves were beyond them" — Mặt cong làm tia tán xạ hàng chục hướng, máy tính quá tải
          drawConventionalJet(c, 110, -10, 1.5, 'side', { externalWeapons: false });
          const wp = A.clamp01((t - CUE.curves_beyond) * 1.2);
          const hitPt: A.Pt = [280, -18];
          drawRadarWave(c, [590, 115], hitPt, wp, { color: P.sky, w: A.px(c, 5) });
          if (wp > 0.45) {
            const sp = A.clamp01((t - (CUE.curves_beyond + 0.35)) * 1.4);
            const angles = [-2.4, -1.9, -1.4, -0.9, -0.4, 0.2, 0.7, 1.2, 2.6];
            for (const a of angles) {
              const tx = hitPt[0] + Math.cos(a) * 260;
              const ty = hitPt[1] + Math.sin(a) * 260;
              drawRadarWave(c, hitPt, [tx, ty], sp, { color: P.enemy, w: A.px(c, 3.8) });
            }
            U.xMark(c, -580, -235, 36, sp, P.enemy, A.px(c, 7));
          }
        } else {
          // 23.3 – 25.68s: "The shape the arithmetic of the time could handle"
          drawStealthDiamond(c, 110, -10, 1.68, 'side', { highlightFacet: 99 });
        }
      }

      K.end(c);

      // Callout tối thiểu: năm "1970s" trên tủ máy tính
      if (t >= 13.8 && t <= 18.8) {
        const pt = K.toScreen(cam, -580, -185);
        U.callout(c, '1970s', pt[0], pt[1] - 58, {
          to: pt,
          p: A.win(t, 13.8, 18.8, 0.35, 0.35),
          color: P.ink,
        });
      }
      return;
    }

    // ── NHỊP 1.2 & 1.3 (25.68 – 80.64s): BẦU TRỜI, ĐÀI RADAR & CƠ CHẾ GƯƠNG NGHIÊNG ─
    const cam = K.track(
      t,
      [
        [CUE.question, { x: 80, y: 30, z: 0.94 }],
        [59.5, { x: 80, y: 30, z: 0.94 }],
        // 60.02s: Tiến vào cận cảnh tấm phẳng nghiêng (mirror/plate)
        [61.2, { x: 20, y: -55, z: 1.25 }],
        [71.2, { x: 20, y: -55, z: 1.25 }],
        // 71.84s: Mở ra toàn cảnh khối kim cương F-117 hắt sóng lên trời/xuống đất
        [73.0, { x: 80, y: 40, z: 0.95 }],
        [80.64, { x: 80, y: 40, z: 0.95 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);
    drawSkyGroundBg(c, cam, { groundY: 260, scrollX: (t - CUE.question) * 45 });

    // Đài radar mặt đất của đối phương luôn giữ vị trí mốc ở bên phải (560, 260)
    const radarX = 560;
    const radarY = 260;
    const dishPt: A.Pt = [radarX - 42, radarY - 108];
    drawRadarStation(c, radarX, radarY, 1.3, 'side', { dishAngle: -0.42 });

    if (t < CUE.surface_tilted) {
      // ── NHỊP 1.2 (25.68 – 60.02s): ĐÍNH CHÍNH "TÀNG HÌNH KHÔNG PHẢI VÔ HÌNH" ──
      const jetX = -180;
      const jetY = -105 + Math.sin(t * 1.5) * 6;

      const ghostCompare = t >= 29.5 && t < 37.2;
      if (ghostCompare && t < 34.8) {
        A.withA(c, 0.35, () => {
          drawStealthDiamond(c, jetX, jetY, 1.5, 'side');
        });
        A.rrect(c, jetX - 310, jetY - 82, 620, 120, 12, null, P.ink2, A.px(c, 3));
      } else {
        drawStealthDiamond(c, jetX, jetY, 1.5, 'side', {
          highlightFacet: t >= CUE.part_before && t < 48.0 ? Math.floor(((t - CUE.part_before) * 1.5) % 4) : -1,
        });
      }

      // Dấu X bác bỏ ý niệm "vô hình trong suốt" tại 34.94 – 37.2s
      if (t >= 34.8 && t < 37.3) {
        U.xMark(c, jetX, jetY - 135, 34, A.win(t, 34.8, 37.3, 0.25, 0.25), P.enemy, A.px(c, 7));
      }

      // 37.34 – 47.96s: Ba nguyên tắc (1: Return less, 2: Wrong direction, 3: Shorter distance)
      if (t >= 37.3 && t < 48.3) {
        drawRadarWave(c, dishPt, [jetX + 140, jetY + 10], A.sm(t, 37.3, 38.3), {
          color: P.sky,
          w: A.px(c, 5),
        });

        if (t >= CUE.return_less) {
          drawRadarWave(c, [jetX + 120, jetY + 18], [dishPt[0] - 40, dishPt[1] - 10], A.sm(t, 38.5, 39.6), {
            color: P.enemy,
            w: A.px(c, 2),
            dashed: true,
          });
        }
        if (t >= CUE.wrong_direction) {
          drawRadarWave(c, [jetX + 140, jetY + 10], [jetX + 360, jetY - 240], A.sm(t, 39.9, 41.2), {
            color: P.amber,
            w: A.px(c, 6),
          });
        }
        if (t >= CUE.shorter_distance) {
          const shrink = A.eio(t, 41.8, 43.5);
          const rDist = A.lerp(680, 260, shrink);
          const rx = dishPt[0] - Math.cos(0.45) * rDist;
          const ry = dishPt[1] - Math.sin(0.45) * rDist;
          A.circle(c, dishPt[0], dishPt[1], rDist, null, P.enemy, A.px(c, 3));
          A.circle(c, rx, ry, 9, P.enemy, P.white, A.px(c, 2.5));
        }
        if (t >= CUE.part_before) {
          const bx = -420, by = 140;
          const steps = [
            { h: 120, col: P.enemy, t0: 43.0 },
            { h: 52, col: P.amber, t0: 44.4 },
            { h: 16, col: P.olive, t0: 45.8 },
          ];
          for (let i = 0; i < steps.length; i++) {
            const st = steps[i]!;
            const p = A.sm(t, st.t0, st.t0 + 0.8);
            if (p > 0) {
              const sx = bx + i * 105;
              const sh = st.h * p;
              A.rrect(c, sx, by - sh, 62, sh, 6, st.col, P.ink, A.px(c, 3));
              if (i < 2) {
                U.arrow(c, [sx + 68, by - sh * 0.5], [sx + 98, by - steps[i + 1]!.h * 0.5], {
                  p,
                  color: P.ink,
                  w: A.px(c, 3.5),
                });
              }
            }
          }
        }
      }

      // 48.38 – 60.02s:
      // - 48.38–55.56s: "A radar needs a little of its signal to come back to the antenna"
      //   -> Hiện khung màn hình thu (receiver scope) cạnh đài radar cần xung dội về để nhảy đỉnh tín hiệu
      // - 55.56–60.02s: "A stealth aircraft's main trick is to make sure that very little does"
      //   -> Tia bị hắt lệch lên trời, màn hình thu của radar phẳng lặng không nhận được đỉnh sóng
      if (t >= CUE.radar_problem) {
        const hitPt: A.Pt = [jetX + 145, jetY + 8];
        const isStealthTrick = t >= CUE.main_trick;

        // Màn hình dao động ký của ăng-ten thu đặt cạnh đài radar (735, 95)
        const sx = 735, sy = 75;
        A.rrect(c, sx - 90, sy - 65, 180, 130, 10, P.dark, P.ink, A.px(c, 3.5));
        A.line(c, [[sx - 72, sy + 20], [sx + 72, sy + 20]], P.slate, A.px(c, 2));

        // Sóng phát đi từ radar tới máy bay
        drawRadarWave(c, dishPt, hitPt, A.sm(t, CUE.radar_problem, CUE.radar_problem + 1.2), {
          color: P.sky,
          w: A.px(c, 5),
          wavelength: 44,
          amp: 9,
        });

        if (!isStealthTrick) {
          // 48.38 – 55.56s: Minh hoạ điều kiện cần của radar — cần tín hiệu phản hồi quay về ăng-ten
          const retP = A.sm(t, 50.2, 52.8);
          drawRadarWave(c, hitPt, dishPt, retP, {
            color: P.enemy,
            w: A.px(c, 4.5),
            dashed: true,
          });
          if (retP > 0.7) {
            // Đỉnh xung báo mục tiêu trên màn hình thu của radar
            A.line(
              c,
              [
                [sx - 68, sy + 20],
                [sx - 22, sy + 20],
                [sx, sy - 42],
                [sx + 22, sy + 20],
                [sx + 68, sy + 20],
              ],
              P.enemy,
              A.px(c, 4)
            );
            A.circle(c, dishPt[0], dishPt[1], 18, 'rgba(180,73,60,0.35)', P.enemy, A.px(c, 3));
          }
        } else {
          // 55.56 – 60.02s: Máy bay tàng hình hắt tia đi chỗ khác -> màn hình radar phẳng lặng
          const deflP = A.sm(t, CUE.main_trick, CUE.main_trick + 1.2);
          drawRadarWave(c, hitPt, [jetX + 390, jetY - 250], deflP, {
            color: P.amber,
            w: A.px(c, 6),
          });
          A.line(c, [[sx - 68, sy + 20], [sx + 68, sy + 20]], P.oliveLight, A.px(c, 4));
        }
      }
    } else if (t < CUE.reason_diamond) {
      // ── NHỊP 1.3a (60.02 – 71.84s): CẬN CẢNH TẤM PHẲNG NGHIÊNG (MIRROR & TORCH) ──
      const plateX = -120;
      const plateY = -80;
      // Góc tấm gương: từ thẳng đứng vuông góc với tia (0.42 rad) xoay sang nghiêng mạnh (-0.38 rad, rồi +0.95 rad)
      let tilt = 0.42; // vuông góc với tia tới -> dội thẳng về radar
      if (t >= CUE.tilted_word && t < CUE.downward - 0.2) {
        tilt = A.lerp(0.42, -0.35, A.eio(t, CUE.tilted_word, CUE.tilted_word + 1.4));
      } else if (t >= CUE.downward - 0.2) {
        tilt = A.lerp(-0.35, 0.92, A.eio(t, CUE.downward - 0.2, CUE.downward + 0.5));
      }

      // Vẽ bóng mờ của thân máy bay phía sau tấm phẳng để giữ liên kết phần–toàn thể
      A.withA(c, 0.18, () => {
        drawStealthDiamond(c, plateX - 80, plateY + 10, 1.45, 'side');
      });

      // Tấm phẳng/gương phản xạ (Flat plate / Mirror)
      c.save();
      c.translate(plateX, plateY);
      c.rotate(tilt);
      A.rrect(c, -12, -130, 24, 260, 5, P.oliveLight, P.ink, A.px(c, LINE.outer));
      A.line(c, [[12, -120], [12, 120]], P.white, A.px(c, 3));
      c.restore();

      // Tia tới từ đài radar/đèn pin
      const inP = A.sm(t, 60.2, 61.0);
      drawRadarWave(c, dishPt, [plateX, plateY], inP, {
        color: P.sky,
        w: A.px(c, 5.5),
      });

      // Tia phản xạ theo đúng góc nghiêng của tấm phẳng
      if (t < CUE.tilted_word + 0.3) {
        // Khi chưa nghiêng: dội ngược 180° thẳng về đài radar!
        drawRadarWave(c, [plateX, plateY], dishPt, A.sm(t, 60.8, 61.8), {
          color: P.enemy,
          w: A.px(c, 5.5),
        });
      } else if (t < CUE.downward - 0.2) {
        // Khi nghiêng ngửa: hắt vọt lên bầu trời (upward)
        drawRadarWave(c, [plateX, plateY], [plateX + 180, plateY - 310], A.sm(t, 63.3, 64.2), {
          color: P.amber,
          w: A.px(c, 6),
        });
      } else {
        // Khi nghiêng úp: hắt xuống mặt đất trống (downward)
        drawRadarWave(c, [plateX, plateY], [plateX + 110, 255], A.sm(t, CUE.downward - 0.1, CUE.downward + 0.5), {
          color: P.amber,
          w: A.px(c, 6),
        });
      }
    } else {
      // ── NHỊP 1.3b (71.84 – 80.64s): KHỐI KIM CƯƠNG HOÀN CHỈNH HẮT SÓNG LÊN TRỜI & XUỐNG ĐẤT ──
      const sx = -120;
      const sy = -80 + Math.sin(t * 1.4) * 6;
      const facetCycle = t >= CUE.every_facet ? Math.floor(((t - CUE.every_facet) * 2.0) % 4) : 99;

      drawStealthDiamond(c, sx, sy, 1.5, 'side', {
        highlightFacet: t > 78.2 ? 99 : facetCycle,
      });

      // 3 chùm tia từ đài radar chiếu tới mũi, buồng lái và thân dưới của khối kim cương
      const pBeam = A.sm(t, 72.4, 73.6);
      const hitTop: A.Pt = [sx + 135, sy - 42];
      const hitNose: A.Pt = [sx + 255, sy + 6];
      const hitBot: A.Pt = [sx + 40, sy + 18];

      drawRadarWave(c, dishPt, hitTop, pBeam, { color: P.sky, w: A.px(c, 4.5) });
      drawRadarWave(c, dishPt, hitNose, pBeam, { color: P.sky, w: A.px(c, 4.5) });
      drawRadarWave(c, dishPt, hitBot, pBeam, { color: P.sky, w: A.px(c, 4.5) });

      // Các tia phản xạ hắt vọt lên bầu trời (sky@79.24) và xuống đất (ground@80.02)
      const pDefl = A.sm(t, 73.6, 75.0);
      drawRadarWave(c, hitTop, [sx + 290, sy - 280], pDefl, { color: P.amber, w: A.px(c, 5.5) });
      drawRadarWave(c, hitNose, [sx + 430, sy - 220], pDefl, { color: P.amber, w: A.px(c, 5.5) });
      drawRadarWave(c, hitBot, [sx + 160, 255], pDefl, { color: P.amber, w: A.px(c, 5.5) });
    }

    K.end(c);

    // Callout tối thiểu: "10 TONS" khi đặt câu hỏi về cỗ máy kim loại 10 tấn (28.0 – 32.5s)
    if (t >= 28.0 && t <= 32.5) {
      const pt = K.toScreen(cam, -180, -165);
      U.callout(c, '10 TONS', pt[0], pt[1] - 56, {
        to: pt,
        p: A.win(t, 28.0, 32.5, 0.3, 0.3),
        color: P.ink,
      });
    }
  }
}
