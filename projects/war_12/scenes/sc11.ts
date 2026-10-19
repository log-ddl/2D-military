import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawEarthSpaceBg,
  drawTacticalMapBg,
  drawMobileTEL,
  drawICBM,
  drawIRSatellite,
  drawEarlyWarningRadar,
  drawInterceptorSilo,
  drawKillVehicle,
  drawTerminalBattery,
  drawTargetCluster,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';
import { WORLD_SIDE, ballisticArcAt, drawBallisticCurve } from './_state';

/**
 * sc11 (426.88 – 460.722s): Sự bất định trong tâm trí kẻ tấn công & Toàn cảnh 30 phút — Chuỗi "Những cơ hội thứ hai".
 * - Phần A (426.88 – 437.14s, góc nhìn từ trên xuống `top` trên sa bàn kế hoạch tấn công):
 *   + Tác động lớn nhất nằm ở tâm trí người quyết định tấn công: họ không còn biết chắc tên lửa có tới đích hay không;
 *     một kế hoạch đòi hỏi mọi tên lửa đều tới đích nay trở nên bất định.
 * - Phần B (437.14 – 460.722s, trở lại toàn cảnh lát cắt Trái Đất – Vũ trụ `side` của 30 phút):
 *   + Điểm lại toàn bộ 5 mắt xích trên cùng một đại cảnh: (1) Vệ tinh thấy ngọn lửa hồng ngoại, (2) Radar vẽ đường cong,
 *     (3) Đạn đánh chặn đâm trực diện ngoài không gian, (4) Đạn tầng cuối đợi ở vài km cuối cùng, và (5) Quyết định bỏ qua phần lớn bầu trời.
 *   + Phòng thủ tên lửa không phải một bức tường, mà là chuỗi các "cơ hội thứ hai" (second chances) — và kẻ tấn công không biết còn lại bao nhiêu.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.c5_return_30_minutes) {
      this.drawAttackerUncertaintyTop(c, t);
    } else {
      this.drawThirtyMinutesFinaleSide(c, t);
    }
  }

  private drawAttackerUncertaintyTop(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 0.96 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    drawTacticalMapBg(c, 'continents');

    // Khung sa bàn kế hoạch của người chỉ huy phe tấn công
    const uncertP = A.sm(t, CUE.c5_plan_uncertain - 0.6, CUE.c5_return_30_minutes - 0.8);

    const rows = [-260, -90, 90, 260];
    rows.forEach((ry, idx) => {
      const startPt: A.Pt = [-640, ry];
      const midPt: A.Pt = [120, ry];
      const endPt: A.Pt = [620, ry];

      // Bệ phóng bên trái
      c.save();
      c.translate(startPt[0], startPt[1]);
      c.scale(0.75, 0.75);
      drawMobileTEL(c, { view: 'top' });
      c.restore();

      // Mục tiêu bên phải
      c.save();
      c.translate(endPt[0], endPt[1]);
      c.scale(0.8, 0.8);
      drawTargetCluster(c, idx % 2 === 0 ? 'city' : 'base', 'top');
      c.restore();

      // Nửa đầu đường đạn tới lưới phòng thủ
      A.line(c, [startPt, midPt], P.enemy, o * 1.15);

      // Khi lưới phòng thủ bật lên (uncertP > 0), nửa sau đường đạn biến thành nét đứt mờ không biết có tới đích hay bị chặn!
      if (uncertP < 0.2) {
        U.arrow(c, midPt, [endPt[0] - 70, endPt[1]], {
          p: 1,
          color: P.enemy,
          w: o * 1.15,
        });
      } else {
        A.line(c, [midPt, [endPt[0] - 75, endPt[1]]], P.slate, inn, [10, 10]);
        // Vòng chắn phòng thủ tại trung tuyến khiến kết quả từng mũi tên trở nên bất định
        A.circle(c, midPt[0], midPt[1], 44, '#e6ece2', P.oliveDark, o);
        if (idx !== 2) {
          U.xMark(c, midPt[0], midPt[1], 18, uncertP, P.oliveDark, o * 1.2);
        } else {
          // 1 đường lấp lửng chưa rõ kết quả
          A.circle(c, midPt[0], midPt[1], 16, P.amber, P.ink, inn);
        }
      }
    });

    K.end(c);
  }

  private drawThirtyMinutesFinaleSide(c: CanvasRenderingContext2D, t: number) {
    // Camera toàn cảnh lát cắt Trái Đất – Vũ trụ, lia nhẹ từ trái sang phải rồi giữ đại cảnh
    const cam = K.track(
      t,
      [
        [CUE.c5_return_30_minutes, { x: -80, y: 10, z: 0.92 }],
        [CUE.c5_interceptor_space, { x: 40, y: 5, z: 0.9 }],
        [CUE.c5_second_chances, { x: 80, y: 15, z: 0.92 }],
        [CUE.film_end, { x: 80, y: 15, z: 0.92 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    drawEarthSpaceBg(c, {
      groundY: WORLD_SIDE.groundY,
      karmanY: WORLD_SIDE.karmanY,
      leftTerritory: true,
      rightTerritory: true,
    });

    // Cung quỹ đạo 30 phút xuyên suốt từ điểm phóng tới mục tiêu
    drawBallisticCurve(c, 0.0, 1.0, P.enemyLight, inn * 1.1, [16, 10]);

    // Kích hoạt tuần tự 5 mắt xích theo đúng lời tổng kết (440.86 – 452.42s):
    const pSat = A.sm(t, CUE.c5_satellite_flame - 0.5, CUE.c5_satellite_flame + 1.2);
    const pRad = A.sm(t, CUE.c5_radar_arc - 0.5, CUE.c5_radar_arc + 1.2);
    const pSpace = A.sm(t, CUE.c5_interceptor_space - 0.5, CUE.c5_interceptor_space + 1.2);
    const pTerm = A.sm(t, CUE.c5_last_kilometers - 0.5, CUE.c5_last_kilometers + 1.2);
    const pIgn = A.sm(t, CUE.c5_sky_ignored - 0.5, CUE.c5_sky_ignored + 1.2);
    const pChances = A.sm(t, CUE.c5_not_a_wall, CUE.c5_how_many_remain);

    // ── Bệ phóng & Mắt xích 1: Vệ tinh thấy ngọn lửa hồng ngoại ("the satellite that sees the flame") ──
    c.save();
    c.translate(WORLD_SIDE.launchSite[0], WORLD_SIDE.launchSite[1]);
    c.scale(0.85, 0.85);
    drawMobileTEL(c, { view: 'side', erect: 1, hasMissile: false });
    c.restore();

    const [b1x, b1y, b1ang] = ballisticArcAt(0.14);
    drawBallisticCurve(c, 0.0, 0.24, P.enemy, o * 1.15);
    c.save();
    c.translate(b1x, b1y);
    c.rotate(b1ang);
    c.scale(0.85, 0.85);
    drawICBM(c, { view: 'side', stage: 'full', thrust: 1.0 });
    c.restore();

    const satX = -320,
      satY = -320;
    if (pSat > 0) {
      U.dashed(c, [b1x - 20, b1y], [satX, satY + 48], P.amber, o, t * 90);
      U.circleMark(c, satX, satY, 68, pSat, P.amber, o);
    }
    c.save();
    c.translate(satX, satY);
    c.scale(1.0, 1.0);
    drawIRSatellite(c, { view: 'side' });
    c.restore();

    // ── Mắt xích 2: Trạm Radar vẽ cung quỹ đạo ("the radar that draws the arc") ──
    c.save();
    c.translate(WORLD_SIDE.radarSite[0], WORLD_SIDE.radarSite[1]);
    c.scale(0.8, 0.8);
    drawEarlyWarningRadar(c, {
      view: 'side',
      faceDir: -1,
      beamLen: pRad > 0 ? 480 * pRad : 180,
      beamAngle: -2.35,
      showScaleRef: false,
    });
    c.restore();
    if (pRad > 0) {
      drawBallisticCurve(c, 0.24, 0.24 + 0.54 * pRad, P.sky, o * 1.2, [14, 10]);
    }

    // ── Mắt xích 3: Đánh chặn Hit-to-kill ngoài không gian ("the interceptor that hits in space") ──
    c.save();
    c.translate(WORLD_SIDE.siloSite[0], WORLD_SIDE.siloSite[1]);
    c.scale(0.75, 0.75);
    drawInterceptorSilo(c, { open: 1, hasBooster: true });
    c.restore();

    const [spX, spY] = ballisticArcAt(0.55);
    if (pSpace > 0) {
      A.line(
        c,
        [
          [WORLD_SIDE.siloSite[0], WORLD_SIDE.siloSite[1] - 20],
          [spX + 35, spY],
        ],
        P.oliveDark,
        o,
        [10, 8]
      );
      c.save();
      c.translate(spX - 24, spY);
      c.scale(1.3, 1.3);
      drawICBM(c, { view: 'side', stage: 'warhead' });
      c.restore();

      c.save();
      c.translate(spX + 36, spY);
      c.scale(-1.25, 1.25);
      drawKillVehicle(c, { view: 'side', thrusterUp: 0.8, sensorCone: 45 });
      c.restore();

      U.circleMark(c, spX, spY, 64, pSpace, P.sky, o);
    }

    // ── Mắt xích 4: Khẩu đội tầng cuối đợi ở vài km cuối cùng ("the one that waits for the last few kilometers") ──
    c.save();
    c.translate(WORLD_SIDE.terminalSite[0], WORLD_SIDE.terminalSite[1]);
    c.scale(0.95, 0.95);
    drawTerminalBattery(c, { view: 'side', ammoCount: 3, faceDir: -1 });
    c.restore();

    const [tmX, tmY, tmAng] = ballisticArcAt(0.86);
    if (pTerm > 0) {
      A.line(
        c,
        [
          [WORLD_SIDE.terminalSite[0] - 18, WORLD_SIDE.terminalSite[1] - 42],
          [tmX, tmY],
        ],
        P.oliveDark,
        o
      );
      c.save();
      c.translate(tmX, tmY);
      c.rotate(tmAng);
      c.scale(1.3, 1.3);
      drawICBM(c, { view: 'side', stage: 'warhead', reentryGlow: 0.7 });
      c.restore();
      U.circleMark(c, tmX, tmY, 54, pTerm, P.oliveDark, o);
    }

    // ── Mắt xích 5: Bỏ qua quả rơi xuống đất trống ("the decision that most of the sky can be ignored") ──
    if (pIgn > 0) {
      const [igX, igY] = ballisticArcAt(0.68);
      A.line(
        c,
        [
          [igX, igY],
          [180, WORLD_SIDE.groundY],
        ],
        P.slate,
        inn,
        [10, 10]
      );
      A.circle(c, 180, WORLD_SIDE.groundY, 24 * pIgn, null, P.slate, inn);
    }

    // Thành phố mục tiêu được bảo vệ nguyên vẹn bên phải
    c.save();
    c.translate(WORLD_SIDE.citySite[0], WORLD_SIDE.citySite[1]);
    c.scale(1.05, 1.05);
    drawTargetCluster(c, 'city', 'side');
    c.restore();

    // ── Kết phim (453.94 – 460.722s): "Missile defense is not a wall. It is a series of second chances. And the attacker does not know how many remain." ──
    if (pChances > 0) {
      // 4 khung vòm/lớp chắn ("Second Chances") xếp nối tiếp nhau dọc theo đường tiến về thành phố
      const archXs = [-120, 140, 480, 740];
      archXs.forEach((ax, i) => {
        const ap = A.sm(pChances, i * 0.16, 0.45 + i * 0.16);
        if (ap > 0) {
          A.withA(c, ap * 0.85, () => {
            A.line(
              c,
              [
                [ax, -290],
                [ax, WORLD_SIDE.groundY],
              ],
              P.oliveDark,
              o * 1.4,
              [18, 10]
            );
            A.circle(c, ax, -290, 14, P.amber, P.ink, inn);
          });
        }
      });

      // Hộp kho đạn dự trữ bên phải thành phố hiển thị các ống đạn sáng xen lẫn ẩn số trước mắt kẻ tấn công
      const remP = A.sm(t, CUE.c5_how_many_remain - 0.6, CUE.c5_how_many_remain + 0.8);
      if (remP > 0) {
        A.withA(c, remP, () => {
          A.rrect(c, 520, -390, 340, 110, 12, P.paper, P.oliveDark, o);
          for (let i = 0; i < 6; i++) {
            const tx = 548 + i * 50;
            A.rrect(
              c,
              tx,
              -368,
              32,
              66,
              5,
              i < 3 ? P.oliveLight : P.bg2,
              P.ink,
              inn
            );
          }
        });
      }
    }

    K.end(c);

    // Callout "30 MIN" khi trở lại bức tranh 30 phút (437.5 – 442.2s)
    const call30 = A.win(t, CUE.c5_return_30_minutes, CUE.c5_radar_arc, 0.35, 0.35);
    if (call30 > 0) {
      const [sx, sy] = K.toScreen(cam, 0, -260);
      U.callout(c, '30 MIN', sx, sy - 50, {
        to: [sx, sy],
        p: call30,
        color: P.amber,
        size: 34,
      });
    }
  }
}
