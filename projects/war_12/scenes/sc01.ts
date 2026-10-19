import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import {
  drawEarthSpaceBg,
  drawICBM,
  drawMobileTEL,
  drawIRSatellite,
  drawEarlyWarningRadar,
  drawInterceptorSilo,
  drawInterceptorBooster,
  drawKillVehicle,
  drawTargetCluster,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';
import { WORLD_SIDE, ballisticArcAt, drawBallisticCurve } from './_state';

/**
 * sc01 (0.00 – 40.42s): Hook & Câu hỏi trung tâm.
 * - Shot 1.1 (0.00 – 19.60s): Lát cắt Trái Đất – Vũ trụ (`side`). Tên lửa đạn đạo phóng lên không gian,
 *   bên phòng thủ phát hiện, tính toán đường rơi và phóng đạn đánh chặn lên đón ở đỉnh chân không trong 30 phút.
 * - Shot 1.2 (19.60 – 40.42s): Cận cảnh "viên đạn đâm viên đạn" giữa chân không (đối lập với bắt bóng),
 *   sau đó mở khung đối chiếu chi phí: 1 tên lửa tấn công vs cả mạng lưới vệ tinh + radar + nhiều đạn đánh chặn.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.c1_no_second_look) {
      this.drawOrbitalHook(c, t);
    } else {
      this.drawBulletVsSystem(c, t);
    }
  }

  private drawOrbitalHook(c: CanvasRenderingContext2D, t: number) {
    // Camera đi từ cận bệ phóng bên trái -> mở toàn cảnh cung quỹ đạo -> tiến vào điểm đánh chặn trên vũ trụ
    const cam = K.track(
      t,
      [
        [0.0, { x: -420, y: 120, z: 1.22 }],
        [4.2, { x: 40, y: 10, z: 0.92 }],
        [14.5, { x: 60, y: 10, z: 0.92 }],
        [19.5, { x: 185, y: -215, z: 1.55 }],
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

    // Xe phóng TEL bên trái
    c.save();
    c.translate(WORLD_SIDE.launchSite[0], WORLD_SIDE.launchSite[1]);
    c.scale(0.85, 0.85);
    drawMobileTEL(c, { view: 'side', erect: 1, hasMissile: false });
    c.restore();

    // Khói bệ phóng lúc vừa rời bệ
    F.smoke(c, WORLD_SIDE.launchSite[0] - 60, WORLD_SIDE.launchSite[1] - 20, t, 1.1, 8, P.slate, -18);

    // Mục tiêu thành phố + Radar + Giếng phóng bên phải
    c.save();
    c.translate(WORLD_SIDE.citySite[0], WORLD_SIDE.citySite[1]);
    c.scale(0.95, 0.95);
    drawTargetCluster(c, 'city', 'side');
    c.restore();

    const detectP = A.sm(t, CUE.c1_somewhere_half_hour, CUE.c1_fire_another);
    const fireP = A.sm(t, CUE.c1_fire_another - 0.3, CUE.c1_no_second_look - 0.2);

    c.save();
    c.translate(WORLD_SIDE.radarSite[0], WORLD_SIDE.radarSite[1]);
    c.scale(0.75, 0.75);
    drawEarlyWarningRadar(c, {
      view: 'side',
      faceDir: -1,
      beamLen: detectP > 0 ? 520 * detectP : 0,
      beamAngle: -2.35,
      showScaleRef: false,
    });
    c.restore();

    c.save();
    c.translate(WORLD_SIDE.siloSite[0], WORLD_SIDE.siloSite[1]);
    c.scale(0.75, 0.75);
    drawInterceptorSilo(c, {
      open: A.sm(t, CUE.c1_notice_launch + 1.5, CUE.c1_fire_another),
      hasBooster: fireP <= 0.02,
    });
    c.restore();

    // Quỹ đạo tên lửa đạn đạo tiến dần lên đỉnh không gian
    const uMissile = A.keys(t, [
      [0.0, 0.07],
      [5.0, 0.34],
      [10.3, 0.46],
      [15.0, 0.54],
      [19.6, 0.61],
    ]);

    // Đường đã bay (màu đỏ gạch liền)
    drawBallisticCurve(c, 0.0, uMissile, P.enemy, o * 1.1);

    // Đường dự đoán điểm rơi khi radar bên thủ tính toán (từ 10.3s)
    if (detectP > 0) {
      drawBallisticCurve(
        c,
        uMissile,
        A.lerp(uMissile, 1.0, detectP),
        P.sky,
        inn * 1.1,
        [14, 10]
      );
    }

    // Vẽ tên lửa đạn đạo tại vị trí hiện tại
    const [mx, my, mang] = ballisticArcAt(uMissile);
    c.save();
    c.translate(mx, my);
    c.rotate(mang);
    c.scale(0.88, 0.88);
    drawICBM(c, {
      view: 'side',
      stage: uMissile < 0.26 ? 'full' : 'stage2',
      thrust: uMissile < 0.26 ? 1.0 : 0.0,
    });
    c.restore();

    // Tên lửa đánh chặn phóng từ giếng phóng bên phải lên điểm hẹn (u = 0.61)
    if (fireP > 0) {
      const [ixTarget, iyTarget] = ballisticArcAt(0.61);
      const sx = WORLD_SIDE.siloSite[0];
      const sy = WORLD_SIDE.siloSite[1] - 20;
      const ix = A.lerp(sx, ixTarget + 42, fireP);
      const iy = A.lerp(sy, iyTarget + 6, fireP);
      const iang = Math.atan2(iyTarget - sy, ixTarget - sx);

      A.line(
        c,
        [
          [sx, sy],
          [ix, iy],
        ],
        P.oliveDark,
        o,
        [10, 8]
      );

      c.save();
      c.translate(ix, iy);
      c.rotate(iang);
      c.scale(0.85, 0.85);
      drawInterceptorBooster(c, {
        thrust: fireP < 0.7 ? 0.9 : 0,
        sep: A.sm(fireP, 0.55, 0.95),
      });
      c.restore();

      // Vòng ngắm khóa mục tiêu tại điểm giao cắt ngoài chân không
      const lockP = A.sm(fireP, 0.6, 0.98);
      if (lockP > 0) {
        A.circle(c, ixTarget, iyTarget, 48 * (1.3 - 0.3 * lockP), null, P.amber, inn);
      }
    }

    K.end(c);

    // Callout duy nhất: đồng hồ 30 MIN khi voice nói "less time than a lunch break / Somewhere in that half hour"
    const callP = A.win(t, 6.2, 14.5, 0.4, 0.4);
    if (callP > 0) {
      const [sx, sy] = K.toScreen(cam, 0, -250);
      U.callout(c, '30 MIN', sx, sy - 65, {
        to: [sx, sy],
        p: callP,
        color: P.enemy,
        size: 34,
      });
    }
  }

  private drawBulletVsSystem(c: CanvasRenderingContext2D, t: number) {
    // 19.60 – 30.04s: Cận cảnh "viên đạn đâm viên đạn" đối lập với bắt bóng
    // 30.04 – 40.42s: Mở khung đối chiếu 1 tên lửa tấn công vs cả hệ thống phòng thủ nhiều tầng đắt đỏ
    const splitP = A.eio(t, CUE.c1_question_fast, CUE.c1_question_fast + 1.2);

    const cam: K.Cam = { x: A.W / 2, y: A.H / 2, z: 1 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    if (splitP < 0.99) {
      A.withA(c, 1 - splitP, () => {
        // Nền không gian chân không
        c.fillStyle = '#dfe9f2';
        c.fillRect(0, 0, A.W, A.H);

        // Vạch tốc độ ngang nền để cảm nhận vận tốc nhiều km/s
        for (let i = 0; i < 14; i++) {
          const ly = 120 + i * 68;
          const lx = ((i * 230 + t * 950) % (A.W + 400)) - 200;
          A.line(
            c,
            [
              [lx, ly],
              [lx + 140, ly],
            ],
            P.light,
            inn
          );
        }

        // Khung phụ bên trên-trái (22.0 – 26.5s): "Not like catching a ball" -> hình bóng chày & găng bị gạch X
        const ballWin = A.win(t, CUE.c1_stopping_ball - 0.4, CUE.c1_bullet_with_bullet + 1.8, 0.35, 0.35);
        if (ballWin > 0) {
          A.withA(c, ballWin, () => {
            A.rrect(c, 110, 80, 360, 170, 14, P.paper, P.ink, o);
            // Đường cong quả bóng bay chậm vào vòng cung chặn
            A.circle(c, 210, 165, 22, P.white, P.ink, o);
            A.path(
              c,
              [
                [350, 115],
                [385, 140],
                [385, 190],
                [350, 215],
              ],
              false
            );
            A.fs(c, null, P.slate, o * 1.4);
            U.xMark(c, 290, 165, 52, A.sm(t, CUE.c1_stopping_ball + 0.3, CUE.c1_stopping_ball + 0.9), P.enemy, 7);
          });
        }

        // Chính giữa khung: Đầu đạn (Warhead) từ trái lao sang vs Đầu tự dẫn (KillVehicle) từ phải lao tới
        const approach = A.eio(t, CUE.c1_no_second_look, CUE.c1_question_fast - 0.2);
        const wx = A.lerp(240, 865, approach);
        const kx = A.lerp(1680, 1055, approach);
        const cy = 580;

        // Vệt vận tốc và đường ngắm trực diện
        A.line(
          c,
          [
            [wx + 90, cy],
            [kx - 90, cy],
          ],
          P.amber,
          inn * 1.2,
          [14, 10]
        );

        // Đầu đạn hồi quyển (Warhead) lớn bên trái
        c.save();
        c.translate(wx, cy);
        c.scale(2.6, 2.6);
        drawICBM(c, { view: 'side', stage: 'warhead', reentryGlow: 0.65 });
        c.restore();

        // Đầu tự dẫn EKV lớn bên phải (quay mũi sang trái -X)
        const pulse = Math.sin(t * 18) > 0.2 ? 0.9 : 0.0;
        c.save();
        c.translate(kx, cy);
        c.scale(-2.3, 2.3);
        drawKillVehicle(c, {
          view: 'side',
          thrusterUp: pulse,
          thrusterDown: 1 - pulse,
          sensorCone: 75,
        });
        c.restore();

        // Vòng khóa tâm va chạm
        A.circle(c, A.W / 2, cy, 78, null, P.amber, o);
      });
    }

    if (splitP > 0.01) {
      A.withA(c, splitP, () => {
        // Bố cục đối chiếu trực diện:
        // Nửa trái: 1 quả tên lửa tấn công duy nhất ("the attack")
        // Nửa phải: Chuỗi hệ thống phòng thủ đồ sộ ("why does the defense always seem to cost more")
        A.rrect(c, 90, 90, 740, 900, 18, '#f7eeec', P.enemy, o);
        A.rrect(c, 890, 90, 940, 900, 18, P.paper, P.oliveDark, o);

        // Bên trái: 1 tên lửa trên xe phóng TEL
        c.save();
        c.translate(460, 620);
        c.scale(1.65, 1.65);
        drawMobileTEL(c, { view: 'side', erect: 1, hasMissile: true });
        c.restore();

        // Thanh chi phí bên trái (1 cột thấp)
        A.rrect(c, 360, 760, 200, 44, 8, P.enemy, P.ink, o);

        // Bên phải: Xuất hiện lần lượt 3 tầng trang bị đắt đỏ (Vệ tinh + Radar khổng lồ + 3 Giếng phóng đạn đánh chặn)
        const p1 = A.sm(t, CUE.c1_question_fast + 0.4, CUE.c1_question_fast + 1.8);
        const p2 = A.sm(t, CUE.c1_cost_more - 1.2, CUE.c1_cost_more + 0.4);
        const p3 = A.sm(t, CUE.c1_chain_of_stages - 0.8, CUE.c1_chain_of_stages + 1.2);

        A.withA(c, p1, () => {
          c.save();
          c.translate(1150, 250);
          c.scale(1.25, 1.25);
          drawIRSatellite(c, { view: 'side' });
          c.restore();
          c.save();
          c.translate(1560, 250);
          c.scale(1.25, 1.25);
          drawIRSatellite(c, { view: 'side' });
          c.restore();
        });

        A.withA(c, p2, () => {
          c.save();
          c.translate(1160, 650);
          c.scale(1.3, 1.3);
          drawEarlyWarningRadar(c, { view: 'side', beamLen: 120, showScaleRef: true });
          c.restore();
        });

        A.withA(c, p3, () => {
          for (let i = 0; i < 3; i++) {
            c.save();
            c.translate(1480 + i * 115, 520);
            c.scale(1.05, 1.05);
            drawInterceptorSilo(c, { open: 1, hasBooster: true });
            c.restore();
          }
        });

        // Đường cáp kết nối 3 tầng phòng thủ
        if (p2 > 0.2) {
          A.line(
            c,
            [
              [1150, 330],
              [1150, 450],
            ],
            P.sky,
            o,
            [10, 8]
          );
        }
        if (p3 > 0.2) {
          A.line(
            c,
            [
              [1280, 580],
              [1440, 580],
            ],
            P.sky,
            o,
            [10, 8]
          );
        }

        // Các khối chi phí chồng cao bên phải (5 thanh vàng cam lớn)
        const barsCount = Math.floor(A.lerp(1, 5.9, A.sm(t, CUE.c1_cost_more - 0.5, CUE.c1_distinct_parts - 0.5)));
        for (let b = 0; b < barsCount; b++) {
          A.rrect(c, 1140 + b * 95, 760, 82, 44, 8, P.amber, P.ink, o);
        }
      });
    }

    K.end(c);
  }
}
