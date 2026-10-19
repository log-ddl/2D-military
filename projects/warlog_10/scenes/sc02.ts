import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';
import { stateAt } from './_state';

/**
 * sc02 (26.66–46.00s): Câu hỏi trung tâm — Từ mạng lưới phòng không, tàu chiến, không lưu (TOP)
 * sang chuỗi đánh đổi khắc nghiệt (chain of compromises) của thiết kế radar.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    const cam = K.track(
      t,
      [
        [CUE.ch1_question, { x: -20, y: 0, z: 1.02 }],
        [CUE.ch1_earth, { x: -20, y: 0, z: 1.02 }],
        [CUE.ch1_compromises + 1.8, { x: -40, y: -10, z: 1.14 }],
      ],
      A.eio
    );

    K.begin(c, cam);

    // Bản đồ TOP vùng bờ biển
    M.drawTacticalMapTop(c, -300, -10, 820, { coastlineX: -210 });

    const compA = A.sm(t, CUE.ch1_compromises - 0.2, CUE.ch1_compromises + 0.9);
    const bgDim = A.lerp(1, 0.25, compA);

    // 1) Đài radar phòng không bờ biển (chính là đài groundRadar của sc01 nhìn từ trên xuống)
    const r1x = -300, r1y = -10;
    const sweep1 = st.radarTopAzimuth;
    A.withA(c, 0.24, () => {
      c.beginPath();
      c.moveTo(r1x, r1y);
      c.arc(r1x, r1y, 460, sweep1 - 0.35, sweep1 + 0.05);
      c.closePath();
      A.fs(c, P.amber, null, 0);
    });
    M.drawGroundRadar(c, r1x, r1y, 'top', { scale: 1.35, dishAngle: sweep1, active: true });

    // 2) Tàu khu trục phòng không ngoài khơi & Đài không lưu (mờ nhẹ đi khi bảng cơ chế đánh đổi hiện lên để không chồng hình)
    A.withA(c, bgDim, () => {
      const shipA = A.sm(t, CUE.ch1_question + 2.0, CUE.ch1_question + 3.2);
      const sx = 220, sy = 210;
      A.withA(c, shipA, () => {
        A.circle(c, sx, sy, 280, null, P.amber, M.lwI(c));
        M.drawWarship(c, sx, sy, 'top', { scale: 1.2, angle: -0.35, activePanels: true });
      });

      const atcA = A.sm(t, CUE.ch1_warship, CUE.ch1_warship + 1.4);
      const ax = -490, ay = -265;
      A.withA(c, atcA, () => {
        A.rrect(c, ax - 130, ay - 22, 180, 32, 4, P.slate, P.ink, M.lwO(c));
        A.line(c, [[ax - 115, ay - 6], [ax + 35, ay - 6]], P.white, M.lwI(c), [12, 10]);
        M.drawGroundRadar(c, ax + 85, ay - 6, 'top', { scale: 0.95, dishAngle: t * 1.6, active: true });
        A.circle(c, ax + 85, ay - 6, 220, null, P.sky, M.lwI(c));
      });

      M.drawIntruderJet(c, 150, -170, 'top', { scale: 1.1, angle: 0.15 });
      M.drawIntruderJet(c, 480, -25, 'top', { scale: 1.05, angle: -0.1 });
    });

    // 3) Từ 36.28s ("The answer is a chain of compromises..."): Bảng cơ chế 3 thanh trượt giằng co nhau
    if (compA > 0.01) {
      A.withA(c, compA, () => {
        const px = 150, py = -10;
        A.rrect(c, px - 270, py - 210, 540, 420, 14, P.paper, P.ink, M.lwO(c));

        const swing = 0.5 + 0.38 * Math.sin((t - CUE.ch1_compromises) * 1.7);
        const metrics: [number, number, string][] = [
          [-120, swing, P.amber],             // Thanh 1: Công suất & Tầm phát
          [0, 1 - swing * 0.75, P.sky],       // Thanh 2: Độ sắc nét / Tốc độ quét
          [120, 0.25 + swing * 0.7, P.enemy], // Thanh 3: Mức độ tự bộc lộ / Chi phí
        ];

        const pts: A.Pt[] = metrics.map(([ry, val]) => [A.lerp(px - 185, px + 185, val), py + ry]);
        A.line(c, pts, P.ink2, M.lwO(c));

        for (const [ry, val, col] of metrics) {
          const x0 = px - 185, x1 = px + 185;
          const curX = A.lerp(x0, x1, val);
          A.rrect(c, x0, py + ry - 15, x1 - x0, 30, 15, P.bg2, P.ink, M.lwI(c));
          A.rrect(c, x0, py + ry - 15, Math.max(30, curX - x0), 30, 15, col, P.ink, M.lwI(c));
          A.circle(c, curX, py + ry, 22, P.paper, P.ink, M.lwO(c));
          A.circle(c, curX, py + ry, 9, col, P.ink, M.lwI(c));
        }

        A.line(c, [[r1x + 62, r1y], [px - 270, py]], P.ink, M.lwO(c), [10, 8]);
      });
    }

    K.end(c);
  }
}
