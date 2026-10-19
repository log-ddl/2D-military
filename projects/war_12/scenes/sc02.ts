import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawEarthSpaceBg,
  drawICBM,
  drawMobileTEL,
  drawIRSatellite,
  drawEarlyWarningRadar,
  drawInterceptorSilo,
  drawTargetCluster,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';
import { WORLD_SIDE, ballisticArcAt, drawBallisticCurve } from './_state';

/**
 * sc02 (40.42 – 108.56s): Ba giai đoạn bay, Giai đoạn 1 (Vệ tinh hồng ngoại) & Giai đoạn 2 (Radar mảng pha tính đường cong trọng trường).
 * - 40.42 – 51.84s: Toàn cảnh lát cắt Trái Đất – Vũ trụ chia rõ 3 giai đoạn (Boost / Midcourse / Terminal), mỗi giai đoạn một lớp phòng thủ.
 * - 51.84 – 78.18s: Camera tiến vào Giai đoạn 1 (bên trái): tên lửa đốt tầng đẩy phát nhiệt hồng ngoại cực lớn, vệ tinh quỹ đạo cao thu nhiệt (mặt cắt `cut` lộ gương hội tụ & cảm biến IR), báo động điểm phóng nhưng chưa biết điểm rơi.
 * - 78.18 – 108.56s: Camera lia sang Giai đoạn 2 (trạm Radar mảng pha khổng lồ cao bằng tòa nhà): bắt mục tiêu nhô lên chân trời; khi động cơ tắt, tên lửa bay theo đường cong trọng trường đoán trước được -> từ vài điểm đo tính ra toàn bộ quỹ đạo và điểm bắn đón.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Track camera liên tục trên cùng thế giới Lát cắt Trái Đất – Vũ trụ
    const cam = K.track(
      t,
      [
        [CUE.c1_distinct_parts, { x: 45, y: 10, z: 0.94 }],
        [CUE.c1_first_stage_knowing, { x: 45, y: 10, z: 0.94 }],
        [CUE.c1_flame_infrared, { x: -410, y: -40, z: 1.42 }],
        [CUE.c1_roughly_where_from, { x: -240, y: -20, z: 1.18 }],
        [CUE.c1_next_what_do, { x: -120, y: 0, z: 1.02 }],
        [CUE.c1_large_radars, { x: 350, y: 145, z: 1.62 }],
        [CUE.c1_engine_stops_arc, { x: 180, y: 15, z: 1.06 }],
        [CUE.c1_boost_best_time, { x: 180, y: 15, z: 1.06 }],
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

    // ── 1. Vạch chia 3 giai đoạn bay (hiển thị rõ ở 40.42 – 53.5s) ──
    const stageDivAlpha = A.win(t, CUE.c1_distinct_parts, CUE.c1_boost_burns + 1.5, 0.5, 0.8);
    if (stageDivAlpha > 0) {
      A.withA(c, stageDivAlpha, () => {
        const [x1] = ballisticArcAt(0.24);
        const [x2] = ballisticArcAt(0.78);
        for (const dx of [x1, x2]) {
          A.line(
            c,
            [
              [dx, -420],
              [dx, WORLD_SIDE.groundY],
            ],
            P.slate,
            inn,
            [14, 12]
          );
        }
        // Vẽ 3 đoạn cung quỹ đạo với 3 độ đậm để thấy 3 phần tách biệt
        drawBallisticCurve(c, 0.0, 0.24, P.amber, o * 1.2);
        drawBallisticCurve(c, 0.24, 0.78, P.enemy, o * 1.2);
        drawBallisticCurve(c, 0.78, 1.0, P.enemyLight, o * 1.2);

        // 3 vòng đánh dấu 3 tầng phòng thủ tương ứng trên mỗi giai đoạn ("each part allows one kind of defense")
        const eachP = A.sm(t, CUE.c1_distinct_parts + 1.5, CUE.c1_each_stage + 1.5);
        if (eachP > 0) {
          const [p1x, p1y] = ballisticArcAt(0.14);
          const [p2x, p2y] = ballisticArcAt(0.52);
          const [p3x, p3y] = ballisticArcAt(0.88);
          A.circle(c, p1x, p1y, 28 * eachP, null, P.amber, o);
          A.circle(c, p2x, p2y, 28 * eachP, null, P.sky, o);
          A.circle(c, p3x, p3y, 28 * eachP, null, P.oliveDark, o);
        }
      });
    }

    // ── 2. Chủ thể mặt đất cố định ──
    // Bệ phóng TEL bên trái
    c.save();
    c.translate(WORLD_SIDE.launchSite[0], WORLD_SIDE.launchSite[1]);
    c.scale(0.85, 0.85);
    drawMobileTEL(c, { view: 'side', erect: 1, hasMissile: false });
    c.restore();

    // Thành phố & Giếng phóng bên phải
    c.save();
    c.translate(WORLD_SIDE.citySite[0], WORLD_SIDE.citySite[1]);
    c.scale(0.95, 0.95);
    drawTargetCluster(c, 'city', 'side');
    c.restore();

    c.save();
    c.translate(WORLD_SIDE.siloSite[0], WORLD_SIDE.siloSite[1]);
    c.scale(0.75, 0.75);
    drawInterceptorSilo(c, { open: A.sm(t, CUE.c1_fired_in_advance - 0.5, CUE.c1_boost_best_time), hasBooster: true });
    c.restore();

    // ── 3. Tên lửa đạn đạo bay theo tiến độ câu chuyện ──
    const uMissile = A.keys(t, [
      [CUE.c1_distinct_parts, 0.12],
      [CUE.c1_first_stage_knowing, 0.03],
      [CUE.c1_flame_infrared, 0.14],
      [CUE.c1_30_minutes, 0.23],
      [CUE.c1_climbs_horizon, 0.26],
      [CUE.c1_engine_stops_arc, 0.31],
      [CUE.c1_calculate_land, 0.44],
      [CUE.c1_boost_best_time, 0.54],
    ]);

    const isBoost = uMissile < 0.28;
    drawBallisticCurve(c, 0.0, uMissile, P.enemy, o);

    const [mx, my, mang] = ballisticArcAt(uMissile);

    // Khi động cơ tắt ở 91.42s ("Once the engine stops"), tầng đẩy 1 tách ra rơi lại phía sau
    const sepStageP = A.sm(t, CUE.c1_engine_stops_arc, CUE.c1_engine_stops_arc + 3.2);
    if (sepStageP > 0 && sepStageP < 1) {
      const [sx0, sy0, sang0] = ballisticArcAt(0.28);
      c.save();
      c.translate(sx0 - sepStageP * 75, sy0 + sepStageP * 95);
      c.rotate(sang0 + sepStageP * 1.1);
      A.rrect(c, -35, -14, 70, 28, 3, P.light, P.ink, inn);
      c.restore();
    }

    c.save();
    c.translate(mx, my);
    c.rotate(mang);
    c.scale(0.95, 0.95);
    drawICBM(c, {
      view: 'side',
      stage: isBoost ? 'full' : 'stage2',
      thrust: isBoost ? 1.0 : 0.0,
    });
    c.restore();

    // ── 4. GIAI ĐOẠN 1: Vệ tinh hồng ngoại phát hiện lửa tầng đẩy (51.84 – 78.18s) ──
    const satX = WORLD_SIDE.satellitePos[0] - 190;
    const satY = WORLD_SIDE.satellitePos[1] + 55;
    const irRayP = A.sm(t, CUE.c1_flame_infrared - 0.5, CUE.c1_satellites_watch + 1.2);
    const satCutP = A.win(t, CUE.c1_satellites_watch - 0.5, CUE.c1_roughly_where_from, 0.5, 0.5);
    const alarmP = A.sm(t, CUE.c1_alarm_moments, CUE.c1_alarm_moments + 2.0);

    // Chùm bức xạ nhiệt hồng ngoại từ đuôi lửa tên lửa truyền thẳng lên ống kính vệ tinh
    if (irRayP > 0 && t < CUE.c1_large_radars) {
      A.withA(c, 0.25 * irRayP, () => {
        A.poly(
          c,
          [
            [mx - 45, my + 10],
            [satX - 32, satY + 55],
            [satX + 32, satY + 55],
          ],
          P.amber,
          null,
          0
        );
      });
      U.dashed(c, [mx - 40, my], [satX, satY + 52], P.amber, o, t * 90);
    }

    // Vẽ vệ tinh (chuyển sang mặt cắt `cut` khi giải thích cảm biến thu nhiệt)
    c.save();
    c.translate(satX, satY);
    c.scale(1.15, 1.15);
    drawIRSatellite(c, { view: satCutP > 0.4 ? 'cut' : 'side' });
    c.restore();

    // Sóng báo động từ vệ tinh truyền xuống mặt đất & khoanh vùng điểm phóng ("roughly where from")
    if (alarmP > 0 && t < CUE.c1_large_radars) {
      U.dashed(
        c,
        [satX + 42, satY + 25],
        [WORLD_SIDE.radarSite[0] - 20, WORLD_SIDE.radarSite[1] - 90],
        P.sky,
        inn * 1.2,
        t * 120
      );
      // Vòng tròn định vị vùng phóng dưới mặt đất
      U.circleMark(
        c,
        WORLD_SIDE.launchSite[0],
        WORLD_SIDE.launchSite[1] - 20,
        75,
        A.sm(t, CUE.c1_roughly_where_from - 0.5, CUE.c1_roughly_where_from + 1.2),
        P.amber,
        o
      );

      // "Cannot say where the missile will land": 3 nhánh đường đứt tỏa ra phía trước biểu thị chưa biết điểm rơi
      const unkP = A.win(t, CUE.c1_cannot_say_land - 0.3, CUE.c1_next_what_do, 0.4, 0.5);
      if (unkP > 0) {
        A.withA(c, unkP * 0.75, () => {
          for (const endX of [220, 560, 880]) {
            const pts: A.Pt[] = [];
            for (let i = 0; i <= 20; i++) {
              const s = i / 20;
              pts.push(F.arcPos([mx, my], [endX, WORLD_SIDE.groundY], s, 210));
            }
            A.line(c, pts, P.slate, inn, [10, 10]);
          }
        });
      }
    }

    // ── 5. GIAI ĐOẠN 2: Trạm Radar mảng pha khổng lồ & Đường cong trọng trường (78.18 – 108.56s) ──
    const radarTrackP = A.sm(t, CUE.c1_climbs_horizon - 0.5, CUE.c1_predictable);
    const radarCutP = A.win(t, CUE.c1_large_radars, CUE.c1_climbs_horizon + 0.5, 0.4, 0.4);
    const radarAng = Math.atan2(my - (WORLD_SIDE.radarSite[1] - 78), mx - (WORLD_SIDE.radarSite[0] - 42));

    c.save();
    c.translate(WORLD_SIDE.radarSite[0], WORLD_SIDE.radarSite[1]);
    c.scale(0.95, 0.95);
    drawEarlyWarningRadar(c, {
      view: radarCutP > 0.5 ? 'cut' : 'side',
      faceDir: -1,
      beamLen: t >= CUE.c1_large_radars ? 560 : 0,
      beamAngle: radarTrackP > 0 ? radarAng : -2.55,
      showScaleRef: true,
    });
    c.restore();

    // Khi động cơ tắt (91.42s), hiển thị các chấm đo của radar trên quỹ đạo và nối thành đường cong trọng trường hoàn chỉnh
    const calcP = A.sm(t, CUE.c1_engine_stops_arc + 0.5, CUE.c1_strength_weakness);
    if (calcP > 0) {
      // 4 điểm đo radar lấy mẫu ("from a few seconds of track")
      for (const sampleU of [0.29, 0.34, 0.39, 0.44]) {
        if (uMissile >= sampleU) {
          const [px, py] = ballisticArcAt(sampleU);
          A.circle(c, px, py, 9, P.sky, P.ink, inn);
        }
      }
      // Đường cong parabol dự đoán vươn thẳng tới điểm rơi
      drawBallisticCurve(
        c,
        uMissile,
        A.lerp(uMissile, 1.0, calcP),
        P.sky,
        o * 1.1,
        [16, 10]
      );
    }

    // "So it can be hit by something fired in advance" (105.72s): Đường bắn đón vạch từ giếng phóng lên điểm hẹn tương lai (u = 0.68)
    const advanceP = A.sm(t, CUE.c1_fired_in_advance - 0.6, CUE.c1_boost_best_time - 0.2);
    if (advanceP > 0) {
      const [hx, hy] = ballisticArcAt(0.68);
      U.arrow(
        c,
        [WORLD_SIDE.siloSite[0], WORLD_SIDE.siloSite[1] - 15],
        [hx, hy],
        { p: advanceP, color: P.oliveDark, w: o * 1.2 }
      );
      A.circle(c, hx, hy, 26 * advanceP, null, P.amber, o);
    }

    K.end(c);

    // Callout số "30 MIN" khi voice nhắc "a minute of the 30 that the defender has to work with" (74.32–79.62s)
    const call30 = A.win(t, CUE.c1_30_minutes - 1.0, CUE.c1_next_what_do + 0.5, 0.35, 0.35);
    if (call30 > 0) {
      const [sx, sy] = K.toScreen(cam, mx, my);
      U.callout(c, '30 MIN', sx + 120, sy - 70, {
        to: [sx, sy],
        p: call30,
        color: P.amber,
        size: 34,
      });
    }
  }
}
