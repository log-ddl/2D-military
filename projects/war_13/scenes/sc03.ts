import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';
import { TOP_MAP_NODES } from './_state';

/**
 * sc03 (52.58–84.96s): Chương 2 (Phần 1) — Electronic Support (Listening)
 * Nối liên tục từ cuối sc02 trên bản đồ TOP: Trạm thu bắt sóng từ các đài radar/radio địch,
 * kẻ đường định hướng (bearing) và phân biệt từng loại thiết bị qua nhịp xung (pulse rhythm)
 * để xếp vào thư viện tín hiệu từ thời bình.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Khớp chính xác camera cuối sc02 tại t = 52.58s: { x: -210, y: -95, z: 1.18 }
    const cam = K.track(
      t,
      [
        [52.58, { x: -210, y: -95, z: 1.18 }],
        [57.2, { x: -10, y: -35, z: 0.98 }],
        [84.96, { x: 10, y: -45, z: 1.0 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawMapEnv(c, cam, { roadY: 160, ridge: true });

    const lisPos = TOP_MAP_NODES.listener;
    const hqPos = TOP_MAP_NODES.hq;
    const samPos = TOP_MAP_NODES.samSite;
    const searchPos = TOP_MAP_NODES.searchRadar;
    const radioPos = TOP_MAP_NODES.enemyRadio;
    const jetX = A.lerp(-110, 60, A.ph(t, 52.58, 84.96));
    const jetPos: A.Pt = [jetX, -20];

    // 1. Mọi thiết bị đối phương đều phát sóng (55.22s+)
    const emitP = A.sm(t, CUE.c2_every_radar - 0.3, CUE.c2_every_radar + 1.2);
    const catchP = A.sm(t, CUE.c2_receiver_catch, CUE.c2_direction);
    const rhythmP = A.sm(t, CUE.c2_pulse_rhythm, CUE.c2_pulse_rhythm + 1.4);
    const libP = A.sm(t, CUE.c2_libraries - 0.4, CUE.c2_libraries + 1.4);

    if (emitP > 0.01) {
      A.withA(c, emitP, () => {
        // Sóng từ 3 nguồn phát địch truyền về trạm thu Listener
        U.drawSignalLink(c, searchPos, lisPos, t, {
          color: P.sky,
          mode: 'pulse',
          speed: 1.6,
          progress: 1,
        });
        U.drawSignalLink(c, samPos, lisPos, t, {
          color: P.enemy,
          mode: 'pulse',
          speed: 2.8,
          progress: 1,
        });
        U.drawSignalLink(c, radioPos, lisPos, t, {
          color: P.amber,
          mode: 'wave',
          amp: 6,
          speed: 2.1,
          progress: 1,
        });
      });
    }

    // Vòng nhấn Trạm thu lắng nghe nối liên tục từ cuối sc02
    A.circle(c, lisPos[0], lisPos[1], 88, 'rgba(56,189,248,0.10)', P.sky, lwO);

    // 2. Tia định hướng góc phương vị (Bearing lines: 60.12s–65.80s+)
    if (catchP > 0.01) {
      A.withA(c, catchP, () => {
        for (const [target, col] of [
          [searchPos, P.sky],
          [samPos, P.enemy],
          [radioPos, P.amber],
        ] as [A.Pt, string][]) {
          A.line(c, [lisPos, target], col, lwO, [A.px(c, 12), A.px(c, 8)]);
          A.rrect(c, target[0] - 54, target[1] - 54, 108, 108, 8, null, col, lwO);
        }
      });
    }

    // 3. Các đơn vị trên bản đồ
    // Trạm thu lắng nghe (Listener)
    c.save();
    c.translate(lisPos[0], lisPos[1]);
    U.drawGroundStation(c, {
      view: 'top',
      scale: 1.2,
      role: 'listener',
      team: 'ally',
      dishAngle: Math.sin(t * 1.4) * 0.35,
      active: true,
    });
    c.restore();

    // Xe chỉ huy HQ & Tiêm kích phe ta
    c.save();
    c.translate(hqPos[0], hqPos[1]);
    U.drawMobileHQ(c, { view: 'top', scale: 1.15, emitting: false });
    c.restore();

    c.save();
    c.translate(jetPos[0], jetPos[1]);
    U.drawStrikeJet(c, { view: 'top', scale: 1.05, rwrAlert: t > 62 });
    c.restore();

    // Ba nguồn phát phe đối phương:
    // (1) Đài radar cảnh giới tầm xa (Search Radar ở [480, -220])
    c.save();
    c.translate(searchPos[0], searchPos[1]);
    U.drawGroundStation(c, {
      view: 'top',
      scale: 1.1,
      role: 'jammer',
      team: 'enemy',
      dishAngle: t * 1.8,
      active: true,
    });
    c.restore();

    // (2) Đài radar hỏa lực SAM (SAM Radar ở [520, 60])
    c.save();
    c.translate(samPos[0], samPos[1]);
    U.drawSamRadarSite(c, {
      view: 'top',
      scale: 1.15,
      dishAngle: Math.atan2(jetPos[1] - samPos[1], jetPos[0] - samPos[0]),
    });
    c.restore();

    // (3) Đơn vị bộ đàm dã chiến đối phương (Radio Unit ở [260, 220])
    c.save();
    c.translate(radioPos[0], radioPos[1]);
    U.drawMobileHQ(c, { view: 'top', scale: 1.05, emitting: true });
    c.restore();

    // 4. Bảng Phân tích Nhịp Xung & Thư viện Tín hiệu (Pulse Rhythm & Signal Library: 66.04s–84.96s)
    if (rhythmP > 0.01) {
      const bx = -110;
      const by = -285;
      const bw = 540;
      const bh = 215;

      A.withA(c, rhythmP, () => {
        // Đường nối từ trạm thu Listener lên bảng phân tích nhịp xung
        A.line(c, [lisPos, [bx - bw / 2, by + 20]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
        A.rrect(c, bx - bw / 2 - 6, by - bh / 2 - 6, bw + 12, bh + 12, 12, P.dark, P.ink, lwO);
        A.rrect(c, bx - bw / 2, by - bh / 2, bw, bh, 8, P.paper, P.ink, lwI);

        const rows: { y: number; col: string; pattern: number[] }[] = [
          // Hàng 1: Radar cảnh giới — xung đơn nhịp chậm đều
          { y: by - 58, col: P.sky, pattern: [0.1, 0.38, 0.66, 0.92] },
          // Hàng 2: Radar hỏa lực SAM — nhịp xung kép dồn dập
          { y: by + 4, col: P.enemy, pattern: [0.08, 0.14, 0.34, 0.4, 0.6, 0.66, 0.86, 0.92] },
          // Hàng 3: Bộ đàm đơn vị — cụm sóng theo thói quen liên lạc
          { y: by + 66, col: P.amber, pattern: [0.12, 0.18, 0.24, 0.62, 0.68, 0.74] },
        ];

        const x0 = bx - bw / 2 + 24;
        const waveW = libP > 0.05 ? A.lerp(bw - 48, bw - 175, libP) : bw - 48;

        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const row = rows[rIdx]!;
          const ry = row.y;
          A.line(c, [[x0, ry + 16], [x0 + waveW, ry + 16]], P.bg2, lwI);

          // Vẽ chuỗi nhịp xung (pulse rhythm)
          const pts: A.Pt[] = [[x0, ry + 16]];
          for (const p of row.pattern) {
            const px = x0 + ((p + t * 0.22) % 1) * waveW;
            pts.push([px, ry + 16]);
          }
          // Sắp xếp theo x để vẽ xung vuông rõ ràng
          const sorted = row.pattern
            .map((p) => ((p + t * 0.18) % 1))
            .sort((a, b) => a - b);
          const pulseLine: A.Pt[] = [[x0, ry + 16]];
          for (const s of sorted) {
            const px = x0 + s * (waveW - 18);
            pulseLine.push([px, ry + 16], [px, ry - 14], [px + 10, ry - 14], [px + 10, ry + 16]);
          }
          pulseLine.push([x0 + waveW, ry + 16]);
          A.line(c, pulseLine, row.col, lwO);

          // Khi voice nhắc "libraries of what everyone's equipment sounds like" (80.04s+):
          // Hiện ngăn hồ sơ lưu trữ mẫu bên phải mỗi dòng xung
          if (libP > 0.02) {
            const slotX = bx + bw / 2 - 132;
            A.withA(c, libP, () => {
              A.rrect(c, slotX, ry - 16, 112, 36, 5, P.bg2, P.ink, lwI);
              A.circle(c, slotX + 20, ry + 2, 8, row.col, P.ink, lwI);
              A.line(c, [[slotX + 38, ry - 4], [slotX + 98, ry - 4]], P.ink, lwI);
              A.line(c, [[slotX + 38, ry + 8], [slotX + 82, ry + 8]], P.ink2, lwI);
            });
          }
        }
      });
    }

    K.end(c);
  }
}
