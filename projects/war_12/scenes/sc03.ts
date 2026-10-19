import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawGroundSideBg,
  drawTacticalMapBg,
  drawICBM,
  drawMobileTEL,
  drawFighterInterceptor,
  drawNavalDestroyer,
  drawEarlyWarningRadar,
  drawTargetCluster,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';
import { WORLD_TOP } from './_state';

/**
 * sc03 (108.56 – 136.02s): Nghịch lý giai đoạn tăng tốc (Boost Phase) & Rào cản địa lý.
 * - Phần A (108.56 – 119.68s, góc `side` + mặt cắt `cut`):
 *   Cận cảnh tên lửa đang leo chậm ở giai đoạn tăng tốc: thân lớn, lửa sáng, mở mặt cắt chóp mũi cho thấy
 *   đầu đạn và toàn bộ bóng mồi vẫn đóng gói chung — một phát bắn trúng lúc này sẽ phá hủy tất cả.
 * - Phần B (119.68 – 136.02s, Hard cut có chủ đích sang góc nhìn từ trên xuống `top` trên bản đồ chiến thuật):
 *   Giải thích "The catch is geography": điểm phóng nằm sâu trong lãnh thổ đối phương; vòng tròn bán kính
 *   vài trăm km quanh bệ phóng quá nhỏ và nằm khuất sau biên giới, khiến máy bay và tàu đánh chặn của bên thủ
 *   đứng ngoài biên giới không thể chạm tới trước khi tên lửa vọt lên không gian.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.c1_catch_geography) {
      this.drawBoostCutawaySide(c, t);
    } else {
      this.drawBoostGeographyTop(c, t);
    }
  }

  private drawBoostCutawaySide(c: CanvasRenderingContext2D, t: number) {
    const p = A.ph(t, CUE.c1_boost_best_time, CUE.c1_catch_geography);
    const cutOpen = A.sm(t, CUE.c1_large_slow_bright + 0.8, CUE.c1_single_hit_destroy);
    const hitSimP = A.sm(t, CUE.c1_single_hit_destroy - 0.2, CUE.c1_catch_geography - 0.6);

    // Camera đi theo tên lửa đang leo lên chậm rãi từ bệ phóng
    const mx = A.lerp(-220, 80, p);
    const my = A.lerp(120, -140, p);
    const cam = K.track(
      t,
      [
        [CUE.c1_boost_best_time, { x: -120, y: 60, z: 1.15 }],
        [CUE.c1_large_slow_bright, { x: mx + 20, y: my, z: 1.85 }],
        [CUE.c1_catch_geography, { x: mx + 30, y: my, z: 1.95 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    drawGroundSideBg(c, 300, { hills: true });

    // Xe phóng TEL dưới mặt đất phía trái
    c.save();
    c.translate(-320, 300);
    c.scale(0.95, 0.95);
    drawMobileTEL(c, { view: 'side', erect: 1, hasMissile: false });
    c.restore();

    // Vệt khói dày nối từ bệ phóng lên đuôi tên lửa
    A.line(
      c,
      [
        [-320, 260],
        [mx - 70, my + 55],
      ],
      P.light,
      o * 2.2,
      [18, 12]
    );

    // Tên lửa lớn đang leo lên (xoay nghiêng -0.68 rad); chuyển sang mặt cắt `cut` để lộ đầu đạn + bóng mồi bên trong mũi
    c.save();
    c.translate(mx, my);
    c.rotate(-0.68);
    c.scale(1.65, 1.65);
    drawICBM(c, {
      view: cutOpen > 0.35 ? 'cut' : 'side',
      stage: 'full',
      thrust: 1.0,
    });
    c.restore();

    // Khung ngắm bốn góc chỉ vào khoang mũi chứa cả đầu đạn lẫn mồi bẫy chưa bung
    if (cutOpen > 0.2) {
      const noseX = mx + Math.cos(-0.68) * 95;
      const noseY = my + Math.sin(-0.68) * 95;
      A.circle(c, noseX, noseY, 52, null, P.amber, inn * 1.2);
    }

    // Minh họa giả định ("if it could be reached... a single hit would destroy everything it carries")
    if (hitSimP > 0) {
      const startPt: A.Pt = [mx + 260, my + 120];
      const targetPt: A.Pt = [mx + 35, my - 25];
      F.straightShot(c, startPt, targetPt, A.clamp01(hitSimP * 1.4), {
        color: P.oliveDark,
        w: o * 1.3,
      });
      if (hitSimP > 0.65) {
        const boomP = A.ph(hitSimP, 0.65, 1.0);
        F.explosion(c, targetPt[0], targetPt[1], 75, boomP, o);
      }
    }

    K.end(c);
  }

  private drawBoostGeographyTop(c: CanvasRenderingContext2D, t: number) {
    // Góc nhìn từ trên xuống (`top`) trên bản đồ lục địa
    const cam = K.track(
      t,
      [
        [CUE.c1_catch_geography, { x: -420, y: 20, z: 1.25 }],
        [CUE.c1_inside_territory, { x: -180, y: 15, z: 0.96 }],
        [CUE.c1_end, { x: -40, y: 10, z: 0.88 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    drawTacticalMapBg(c, 'continents');

    const [lx, ly] = WORLD_TOP.launchPad;
    const R = WORLD_TOP.boostRadius;

    // Vòng tròn bán kính vài trăm km quanh điểm phóng ("within a few hundred kilometers of the launch site")
    const ringP = A.sm(t, CUE.c1_catch_geography + 0.4, CUE.c1_few_hundred_km + 1.2);
    if (ringP > 0) {
      A.withA(c, 0.18 * ringP, () => {
        A.circle(c, lx, ly, R, P.amber, null, 0);
      });
      U.circleMark(c, lx, ly, R, ringP, P.amber, o * 1.1);
    }

    // Bệ phóng TEL tại tâm điểm phóng sâu trong lãnh thổ đối phương
    c.save();
    c.translate(lx, ly);
    c.scale(0.85, 0.85);
    drawMobileTEL(c, { view: 'top' });
    c.restore();

    // Máy bay tiêm kích đánh chặn & Tàu khu trục của bên phòng thủ đứng ngoài biên giới/ngoài biển (không thể vào trong lãnh thổ đối phương)
    const defShow = A.sm(t, CUE.c1_few_hundred_km, CUE.c1_inside_territory);
    if (defShow > 0) {
      const fx = -85,
        fy = -150;
      const sx = -40,
        sy = 210;

      // Máy bay tiêm kích tuần tra ngoài biên giới
      c.save();
      c.translate(fx, fy);
      c.rotate(2.65);
      c.scale(1.15, 1.15);
      drawFighterInterceptor(c, 'top');
      c.restore();

      // Tàu chiến ngoài biển quốc tế
      c.save();
      c.translate(sx, sy);
      c.rotate(-2.7);
      c.scale(0.95, 0.95);
      drawNavalDestroyer(c, { view: 'top', vlsAmmo: 8 });
      c.restore();

      // Đường khoảng cách bị chặn từ máy bay/tàu chiến tới vòng Boost-phase
      const blockP = A.sm(t, CUE.c1_inside_territory, CUE.c1_best_window_hardest);
      if (blockP > 0) {
        U.dashed(c, [fx, fy], [lx + R * 0.7, ly - R * 0.5], P.enemy, o, t * 60);
        U.dashed(c, [sx, sy], [lx + R * 0.75, ly + R * 0.45], P.enemy, o, t * 60);
        U.xMark(c, -210, -70, 26, blockP, P.enemy, o * 1.4);
        U.xMark(c, -205, 125, 26, blockP, P.enemy, o * 1.4);
      }
    }

    // Trạm radar và thành phố bên lục địa phòng thủ (bên phải)
    c.save();
    c.translate(WORLD_TOP.radarTop[0], WORLD_TOP.radarTop[1]);
    c.scale(0.9, 0.9);
    drawEarlyWarningRadar(c, { view: 'top', faceDir: -1, beamLen: 260 });
    c.restore();

    c.save();
    c.translate(WORLD_TOP.cityNorth[0], WORLD_TOP.cityNorth[1]);
    c.scale(0.85, 0.85);
    drawTargetCluster(c, 'city', 'top');
    c.restore();

    // Tên lửa đạn đạo bay từ điểm phóng vượt ra ngoài vòng tròn Boost-phase tiến ra đại dương
    const flightP = A.sm(t, CUE.c1_catch_geography + 0.5, CUE.c1_end);
    const mx = A.lerp(lx, 60, flightP);
    const my = A.lerp(ly, -30, flightP);
    const inBoost = Math.hypot(mx - lx, my - ly) < R;

    A.line(
      c,
      [
        [lx, ly],
        [mx, my],
      ],
      P.enemy,
      o * 1.15
    );

    c.save();
    c.translate(mx, my);
    c.rotate(Math.atan2(-30 - ly, 60 - lx));
    c.scale(1.1, 1.1);
    drawICBM(c, { view: 'top', thrust: inBoost ? 1.0 : 0.0 });
    c.restore();

    K.end(c);
  }
}
