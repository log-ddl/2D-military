import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawEarthSpaceBg,
  drawICBM,
  drawSpaceDebrisItem,
  drawTerminalBattery,
  drawEarlyWarningRadar,
  drawTargetCluster,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';

/**
 * sc05 (198.00 – 227.58s): Cơ hội thứ hai khi hồi quyển & Đánh chặn tầng cuối (Terminal Phase).
 * - 198.00 – 211.52s: Đám mây 10 vật thể (đầu đạn + bóng mồi + tầng đẩy) lao từ không gian qua đường Kármán
 *   vào bầu khí quyển. Sức cản không khí kéo tụt và đốt cháy toàn bộ bóng mồi nhẹ, chỉ còn lại duy nhất
 *   đầu đạn thật nặng (`Warhead`) lao xuống với vệt nhiệt đỏ rực.
 * - 211.52 – 227.58s: Camera đi theo đầu đạn xuống sát thành phố; khẩu đội đánh chặn tầng cuối (`TerminalBattery`)
 *   trong vòm bảo vệ nhỏ hẹp (`Footprint`) phóng đạn đón bắn ở vài chục km cuối cùng; đồng thời vạch rõ đường rơi
 *   sát sạt nếu bắn trượt là chạm nổ ngay mục tiêu.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Camera lia dọc từ ranh giới không gian-khí quyển xuống khẩu đội phòng thủ và thành phố bên dưới
    const cam = K.track(
      t,
      [
        [CUE.c2_more_than_one_chance, { x: -120, y: -150, z: 1.18 }],
        [CUE.c2_air_strips_decoys, { x: 40, y: -20, z: 1.15 }],
        [CUE.c2_different_interceptor, { x: 250, y: 120, z: 1.25 }],
        [CUE.c2_small_area_miss_impact, { x: 310, y: 145, z: 1.28 }],
      ],
      A.eio
    );

    const shookCam = K.withShake(cam, t, [[219.4, 18, 0.55]]);

    K.begin(c, shookCam);
    const o = lwO(c);
    const inn = lwI(c);

    const groundY = 320;
    const karmanY = -90;
    drawEarthSpaceBg(c, {
      groundY,
      karmanY,
      curvature: 30,
      showContinents: false,
    });

    // Nền đất liền phẳng khu vực thành phố & trận địa tầng cuối
    c.fillStyle = P.bg2;
    c.fillRect(-1800, groundY, 3600, 600);
    A.line(
      c,
      [
        [-1800, groundY],
        [1800, groundY],
      ],
      P.ink,
      o
    );

    const cityX = 420;
    const batX = 240;
    const radarX = 110;

    // ── 1. Vòm bảo vệ nhỏ hẹp (Terminal Footprint) chỉ che vừa khít thành phố ──
    const domeP = A.sm(t, CUE.c2_different_interceptor - 0.5, CUE.c2_last_stage_reliable);
    if (domeP > 0) {
      const domeR = 285;
      A.withA(c, 0.16 * domeP, () => {
        c.beginPath();
        c.arc(cityX - 40, groundY, domeR, Math.PI, 0);
        c.closePath();
        c.fillStyle = P.oliveLight;
        c.fill();
      });
      c.save();
      c.beginPath();
      c.arc(cityX - 40, groundY, domeR, Math.PI, 0);
      c.setLineDash([14, 10]);
      c.strokeStyle = P.oliveDark;
      c.lineWidth = o;
      c.stroke();
      c.setLineDash([]);
      c.restore();
    }

    // ── 2. Thành phố, Radar chiến thuật & Khẩu đội đánh chặn tầng cuối (`TerminalBattery`) ──
    c.save();
    c.translate(cityX, groundY);
    c.scale(1.15, 1.15);
    drawTargetCluster(c, 'city', 'side');
    c.restore();

    c.save();
    c.translate(radarX, groundY);
    c.scale(0.55, 0.55);
    drawEarlyWarningRadar(c, {
      view: 'side',
      faceDir: -1,
      beamLen: t > CUE.c2_air_strips_decoys ? 420 : 0,
      beamAngle: -1.95,
      showScaleRef: false,
    });
    c.restore();

    const fireTermP = A.sm(t, CUE.c2_different_interceptor + 1.2, 219.4);
    c.save();
    c.translate(batX, groundY);
    c.scale(1.05, 1.05);
    drawTerminalBattery(c, {
      view: 'side',
      ammoCount: fireTermP > 0.05 ? 3 : 4,
      faceDir: -1,
    });
    c.restore();

    // ── 3. Đường rơi của đầu đạn thật và sự bóc tách/cháy rụi của đám bóng mồi khi vào khí quyển ──
    const startPt: A.Pt = [-380, -310];
    const interceptPt: A.Pt = [265, 110];
    const impactPt: A.Pt = [cityX, groundY - 20];

    const fallU = A.keys(t, [
      [CUE.c2_more_than_one_chance, 0.0],
      [CUE.c2_comes_down_atmosphere, 0.28],
      [CUE.c2_air_strips_decoys, 0.58],
      [CUE.c2_different_interceptor, 0.76],
      [219.4, 1.0],
      [CUE.c2_end, 1.0],
    ]);

    const wx = A.lerp(startPt[0], interceptPt[0], fallU);
    const wy = A.lerp(startPt[1], interceptPt[1], fallU);
    const wang = Math.atan2(interceptPt[1] - startPt[1], interceptPt[0] - startPt[0]);

    // Vệt đường đi của đầu đạn thật
    A.line(c, [startPt, [wx, wy]], P.enemy, o);

    // Các bóng mồi nhẹ & tầng đẩy bị không khí cản tụt lại ở ngay dưới đường Kármán (y = -90..10) và cháy rụi
    const stripP = A.sm(t, CUE.c2_comes_down_atmosphere + 1.0, CUE.c2_different_interceptor);
    const decoyOffsets: [number, number, 'balloonCone' | 'balloonSphere' | 'tumblingStage'][] = [
      [-65, -35, 'balloonCone'],
      [45, -55, 'balloonCone'],
      [-95, 25, 'balloonSphere'],
      [25, 45, 'balloonSphere'],
      [-135, -15, 'tumblingStage'],
    ];

    decoyOffsets.forEach(([ox, oy, kind], i) => {
      // Khi vào khí quyển (stripP > 0), các vật nhẹ bị lực cản không khí giữ lại ở tầng cao và bốc cháy mờ dần
      const dragU = Math.min(fallU, 0.42 + i * 0.04);
      const dx = A.lerp(startPt[0], interceptPt[0], dragU) + ox - stripP * 55;
      const dy = A.lerp(startPt[1], interceptPt[1], dragU) + oy - stripP * 35;
      const alpha = 1 - A.sm(stripP, 0.35 + i * 0.08, 0.95);

      if (alpha > 0.02) {
        A.withA(c, alpha, () => {
          // Vệt lửa ma sát đốt cháy bóng mồi
          if (stripP > 0.15) {
            F.fire(c, dx - 10, dy, t - CUE.c2_comes_down_atmosphere, 0.65);
          }
          c.save();
          c.translate(dx, dy);
          c.rotate(wang + stripP * (i - 2) * 0.8);
          drawSpaceDebrisItem(c, kind);
          c.restore();
        });
      }
    });

    // Vẽ đầu đạn thật nặng duy nhất xuyên qua khí quyển lao xuống (trước khi bị bắn hạ tại 219.4s)
    if (t < 219.4) {
      c.save();
      c.translate(wx, wy);
      c.rotate(wang);
      c.scale(1.65, 1.65);
      drawICBM(c, {
        view: 'side',
        stage: 'warhead',
        reentryGlow: A.sm(t, CUE.c2_comes_down_atmosphere, CUE.c2_air_strips_decoys),
      });
      c.restore();
    }

    // ── 4. Đạn đánh chặn tầng cuối phóng lên đón đầu ở độ cao thấp (212.0 – 219.4s) ──
    if (fireTermP > 0 && t < 219.4) {
      const launchOrigin: A.Pt = [batX - 25, groundY - 52];
      F.straightShot(c, launchOrigin, interceptPt, fireTermP, {
        color: P.oliveDark,
        w: o * 1.25,
      });
    }

    // Vụ nổ đánh chặn tầng cuối sát trên bầu trời thành phố tại t = 219.4s
    if (t >= 219.4) {
      const age = t - 219.4;
      F.explosion(c, interceptPt[0], interceptPt[1], 110, A.clamp01(age / 1.2), o);
      F.smoke(c, interceptPt[0], interceptPt[1], age, 0.85, 6, P.slate, 12);
      F.debris(c, interceptPt[0], interceptPt[1], age, 1.0, 12, 5, groundY, P.enemy);
    }

    // "but it is also the one with the least time, and it protects only a small area, and a miss means impact" (221.28 – 227.58s)
    const missRiskP = A.sm(t, CUE.c2_small_area_miss_impact, CUE.c2_end - 1.2);
    if (missRiskP > 0) {
      // Vạch đường đứt đỏ từ điểm chặn cắm thẳng xuống tòa nhà thành phố để thấy nếu trượt là trúng đích ngay
      U.arrow(c, interceptPt, impactPt, {
        p: missRiskP,
        color: P.enemy,
        w: o * 1.2,
      });
      // Hình bóng mờ đầu đạn lao xuống chạm mái thành phố nếu bắn trượt
      const gx = A.lerp(interceptPt[0], impactPt[0], missRiskP);
      const gy = A.lerp(interceptPt[1], impactPt[1], missRiskP);
      A.withA(c, 0.65, () => {
        c.save();
        c.translate(gx, gy);
        c.rotate(wang);
        c.scale(1.4, 1.4);
        drawICBM(c, { view: 'side', stage: 'warhead' });
        c.restore();
      });
      if (missRiskP > 0.7) {
        U.ring(
          c,
          impactPt[0],
          impactPt[1],
          75,
          ((t - CUE.c2_small_area_miss_impact) * 1.2) % 1,
          P.enemy,
          o
        );
      }
    }

    K.end(c);
  }
}
