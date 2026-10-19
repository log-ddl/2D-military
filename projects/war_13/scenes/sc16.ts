import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc16 (414.76–441.22s): Chương 6 (Phần 2) — Thiết bị phần cứng vs Thư viện bản ghi thời bình & Trắc thủ
 * Góc nhìn SIDE đối chiếu:
 * - 414.76–421.36s: Người ta dễ nghĩ EW chỉ là các thiết bị phần cứng (máy gây nhiễu, pod, máy bay chuyên dụng).
 * - 421.36–441.22s: Thực chất đó là cuộc đấu của thói quen và cơ sở dữ liệu (habits and databases):
 *   thư viện bản ghi tín hiệu thu thập từ thời bình và người trắc thủ nhận ra ngay một xung bất thường ("what unusual looks like").
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(
      t,
      [
        [414.76, { x: -240, y: 0, z: 1.08 }],
        [421.36, { x: 80, y: 0, z: 1.02 }],
        [434.0, { x: 165, y: 10, z: 1.08 }],
        [441.22, { x: 165, y: 10, z: 1.08 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawSkyEnv(c, cam, { groundY: 320, hills: false });

    const dbFocusP = A.sm(t, CUE.c6_habits_databases - 0.3, CUE.c6_habits_databases + 1.0);
    const unusualP = A.sm(t, CUE.c6_unusual_looks - 1.2, CUE.c6_unusual_looks + 0.6);

    // 1. CỤM TRÁI: Bộ thiết bị phần cứng (Jammers, Pods, Special Aircraft) — sáng đầu cảnh rồi hạ xuống thứ cấp khi vào phần Database
    A.withA(c, A.lerp(1.0, 0.38, dbFocusP), () => {
      c.save();
      c.translate(-460, -120);
      U.drawStandoffJammerJet(c, { view: 'side', scale: 1.55, podsActive: true });
      c.restore();

      c.save();
      c.translate(-560, 320);
      U.drawLunchboxJammer(c, { view: 'side', scale: 1.5, active: true, showHelmetScale: false });
      c.restore();

      c.save();
      c.translate(-340, 320);
      U.drawGroundStation(c, { view: 'side', scale: 1.25, role: 'jammer', team: 'ally', active: true });
      c.restore();
    });

    // 2. CỤM PHẢI: Thư viện Bản ghi Tín hiệu Thời bình (Library of Recordings) & Trắc thủ nhận diện điểm bất thường (421.36–441.22s)
    if (dbFocusP > 0.01) {
      A.withA(c, dbFocusP, () => {
        const libX = 160;
        const libY = -95;
        const libW = 680;
        const libH = 330;

        A.rrect(c, libX - libW / 2 - 8, libY - libH / 2 - 8, libW + 16, libH + 16, 14, P.dark, P.ink, lwO);
        A.rrect(c, libX - libW / 2, libY - libH / 2, libW, libH, 10, P.paper, P.ink, lwI);

        // Ngăn trái của bảng: Thư viện bản ghi mẫu thu thập từ thời bình (4 băng ghi sóng chuẩn màu P.sky)
        for (let r = 0; r < 4; r++) {
          const ry = libY - 108 + r * 72;
          A.rrect(c, libX - libW / 2 + 24, ry - 24, 260, 48, 6, P.bg2, P.ink, lwI);
          A.circle(c, libX - libW / 2 + 52, ry, 10, P.sky, P.ink, lwI);
          const pts: A.Pt[] = [];
          for (let x = 0; x <= 175; x += 7) {
            pts.push([
              libX - libW / 2 + 80 + x,
              ry + Math.sin(x * (0.06 + r * 0.02) + t * 2) * 12,
            ]);
          }
          A.line(c, pts, P.sky, lwO);
        }

        // Ngăn phải của bảng: Màn hình giám sát trực tiếp nơi 1 xung BẤT THƯỜNG (Unusual spike màu P.amber/P.enemy) xuất hiện giữa các xung chuẩn!
        const scopeX = libX + 165;
        const scopeY = libY;
        A.rrect(c, scopeX - 155, scopeY - 132, 310, 264, 8, P.bg2, P.ink, lwO);

        // Dòng xung đang chạy: có 1 xung dị thường nhô cao và lệch nhịp ở giữa
        const streamPts: A.Pt[] = [];
        for (let x = -135; x <= 135; x += 6) {
          const isAnomaly = Math.abs(x - 15) < 22;
          const yOff = isAnomaly
            ? -78 * Math.cos(((x - 15) / 22) * (Math.PI / 2))
            : Math.sin(x * 0.12 - t * 4) * 14;
          streamPts.push([scopeX + x, scopeY + 35 + yOff]);
        }
        A.line(c, streamPts, P.sky, lwO);

        // Khoanh vùng phát hiện xung bất thường ("an operator who knows what unusual looks like")
        if (unusualP > 0.02) {
          A.withA(c, unusualP, () => {
            A.rrect(c, scopeX - 18, scopeY - 68, 66, 118, 6, 'rgba(245,158,11,0.22)', P.amber, lwO);
            A.circle(c, scopeX + 15, scopeY - 43, 8, P.enemy, P.ink, lwI);
          });
        }

        // Người trắc thủ đeo tai nghe đứng trước bàn phân tích (dưới đất ở x = 220, y = 320)
        const opX = 180;
        const opY = 320;
        c.save();
        c.translate(opX, opY);
        U.drawSoldierEW(c, {
          scale: 1.95,
          team: 'ally',
          role: 'drone_op',
          facing: 1,
          alert: unusualP > 0.2,
        });
        // Vòng tai nghe chuyên dụng trên mũ trắc thủ
        A.circle(c, 0, -180, 18, null, P.amber, lwO);
        c.restore();

        A.line(c, [[opX + 35, opY - 150], [scopeX + 15, scopeY + 50]], P.amber, lwI, [A.px(c, 6), A.px(c, 5)]);
      });
    }

    K.end(c);
  }
}
