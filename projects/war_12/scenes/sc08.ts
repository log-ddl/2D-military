import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawGroundSideBg,
  drawTacticalMapBg,
  drawCruiseMissile,
  drawICBM,
  drawEarlyWarningRadar,
  drawTerminalBattery,
  drawTargetCluster,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';

/**
 * sc08 (305.76 – 351.48s): Tên lửa hành trình bay thấp, Tấn công kết hợp & Hệ thống lọc rocket biên giới ("Saying No").
 * - Phần A (305.76 – 327.84s, góc nhìn ngang `side`):
 *   + 305.76 – 321.32s: Tên lửa hành trình (`CruiseMissile`) giống máy bay phản lực nhỏ, bay thấp và chậm ôm theo địa hình đồi núi;
 *     hệ thống phòng thủ đạn đạo nhìn lên trời cao không có tác dụng với nó, phải chuyển cho các lớp phòng không tầm thấp.
 *   + 321.32 – 327.84s: Tấn công thực tế kết hợp cả tên lửa đạn đạo từ vũ trụ lẫn tên lửa hành trình sát mặt đất, buộc bên thủ
 *     phải chia đôi mắt nhìn giữa trời cao và mặt đất.
 * - Phần B (327.84 – 351.48s, chuyển sang góc nhìn từ trên xuống `top` tại vùng biên giới `border`):
 *   + Phiên bản tầm ngắn quen thuộc trên truyền hình (Iron Dome): Rocket bắn qua biên giới vào thành phố chỉ bay dưới 1 phút (`< 1 MIN`).
 *   + Radar và máy tính tính toán điểm rơi của từng quả: 4 quả rơi xuống đồng ruộng (`fields`) được phép rơi tự do ("defense built around saying no"),
 *     chỉ phóng đạn đánh chặn 2 quả lao vào khu dân cư.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.c4_short_range_tv) {
      this.drawCruiseAndCombinedSide(c, t);
    } else {
      this.drawBorderRocketFilterTop(c, t);
    }
  }

  private drawCruiseAndCombinedSide(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(
      t,
      [
        [CUE.ch4_start, { x: -120, y: 120, z: 1.18 }],
        [CUE.c4_air_defense_layers, { x: 40, y: 90, z: 1.08 }],
        [CUE.c4_real_attack_combines, { x: 80, y: -10, z: 0.96 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    const groundY = 330;
    drawGroundSideBg(c, groundY, { hills: true });

    // Thành phố & Trận địa phòng thủ bên phải
    const cityX = 690;
    const radarX = 290;
    const batX = 480;

    c.save();
    c.translate(cityX, groundY);
    c.scale(1.15, 1.15);
    drawTargetCluster(c, 'city', 'side');
    c.restore();

    // Radar đạn đạo quét hướng lên bầu trời cao (bỏ sót vùng thấp dưới chân đồi)
    c.save();
    c.translate(radarX, groundY);
    c.scale(0.68, 0.68);
    drawEarlyWarningRadar(c, {
      view: 'side',
      faceDir: -1,
      beamLen: 520,
      beamAngle: -2.25,
      showScaleRef: false,
    });
    c.restore();

    // Khẩu đội phòng không tầm thấp bật lên khi voice nhắc "falls to the air defense layers" (317.58s)
    const lowDefP = A.sm(t, CUE.c4_air_defense_layers - 0.8, CUE.c4_air_defense_layers + 1.0);
    c.save();
    c.translate(batX, groundY);
    c.scale(1.0, 1.0);
    drawTerminalBattery(c, { view: 'side', ammoCount: 4, faceDir: -1 });
    c.restore();

    if (lowDefP > 0) {
      // Quạt radar tầm thấp quét ngang mặt đất
      A.withA(c, 0.2 * lowDefP, () => {
        A.poly(
          c,
          [
            [batX - 30, groundY - 35],
            [-220, groundY - 150],
            [-220, groundY - 10],
          ],
          P.oliveLight,
          null,
          0
        );
      });
      A.line(
        c,
        [
          [batX - 30, groundY - 35],
          [-220, groundY - 150],
        ],
        P.oliveDark,
        inn,
        [10, 8]
      );
    }

    // Đường bay thấp ôm địa hình của Tên lửa hành trình (Cruise Missile)
    const terrainPts: A.Pt[] = [
      [-860, groundY - 95],
      [-650, groundY - 145],
      [-390, groundY - 82],
      [-180, groundY - 68],
      [-10, groundY - 85],
      [165, groundY - 70],
    ];

    const cmP = A.ph(t, CUE.ch4_start, CUE.c4_short_range_tv - 0.5);
    const segCount = terrainPts.length - 1;
    const rawIdx = cmP * segCount;
    const idx = Math.min(segCount - 1, Math.floor(rawIdx));
    const frac = rawIdx - idx;
    const pA = terrainPts[idx]!;
    const pB = terrainPts[idx + 1]!;
    const cx = A.lerp(pA[0], pB[0], frac);
    const cy = A.lerp(pA[1], pB[1], frac);
    const cang = Math.atan2(pB[1] - pA[1], pB[0] - pA[0]);

    // Vẽ đường quỹ đạo bay thấp ôm sườn đồi đã đi qua
    const passedPts: A.Pt[] = terrainPts.slice(0, idx + 1).concat([[cx, cy]]);
    A.line(c, passedPts, P.enemy, o, [14, 8]);

    c.save();
    c.translate(cx, cy);
    c.rotate(cang * 0.65);
    c.scale(1.55, 1.55);
    drawCruiseMissile(c, { view: 'side', thrust: 0.9 });
    c.restore();

    // Khi sang 321.70s ("A real attack often combines both, so that a defender must choose between watching the heights and watching the ground"):
    // Xuất hiện thêm đầu đạn đạn đạo lao từ tầng cao vũ trụ xuống cùng lúc với tên lửa hành trình dưới đất!
    const combP = A.sm(t, CUE.c4_real_attack_combines - 0.3, CUE.c4_short_range_tv - 0.5);
    if (combP > 0) {
      const bStart: A.Pt = [-540, -440];
      const bEnd: A.Pt = [320, -60];
      const bx = A.lerp(bStart[0], bEnd[0], combP);
      const by = A.lerp(bStart[1], bEnd[1], combP);
      const bang = Math.atan2(bEnd[1] - bStart[1], bEnd[0] - bStart[0]);

      A.line(c, [bStart, [bx, by]], P.enemy, o * 1.15);
      c.save();
      c.translate(bx, by);
      c.rotate(bang);
      c.scale(1.75, 1.75);
      drawICBM(c, { view: 'side', stage: 'warhead', reentryGlow: 0.7 });
      c.restore();

      // Hai mũi tên chỉ sự phân tán tầm nhìn của bên phòng thủ: Lên trời cao (Heights) vs Xuống sát đất (Ground)
      U.arrow(c, [radarX - 40, groundY - 95], [140, -165], {
        p: combP,
        color: P.sky,
        w: o,
      });
      U.arrow(c, [radarX - 40, groundY - 45], [40, groundY - 75], {
        p: combP,
        color: P.amber,
        w: o,
      });
    }

    K.end(c);
  }

  private drawBorderRocketFilterTop(c: CanvasRenderingContext2D, t: number) {
    // Góc nhìn từ trên xuống (`top`) trên bản đồ biên giới (`border`)
    const cam: K.Cam = { x: 90, y: 0, z: 0.98 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    drawTacticalMapBg(c, 'border');

    // Khu đô thị đông dân cư (`Inhabited Area / City`) bên phải
    const cityPos: A.Pt = [640, -20];
    c.save();
    c.translate(cityPos[0], cityPos[1]);
    c.scale(1.45, 1.45);
    drawTargetCluster(c, 'city', 'top');
    c.restore();

    // Trạm radar và khẩu đội đánh chặn tầm ngắn (Iron Dome) bảo vệ thành phố
    const radarPos: A.Pt = [240, -15];
    const domeBatPos: A.Pt = [380, -15];

    const trackP = A.sm(t, CUE.c4_radar_computer_land - 0.4, CUE.c4_headed_inhabited);
    const engageP = A.sm(t, CUE.c4_headed_inhabited + 0.3, 344.2);

    c.save();
    c.translate(radarPos[0], radarPos[1]);
    c.scale(0.85, 0.85);
    drawEarlyWarningRadar(c, {
      view: 'top',
      faceDir: -1,
      beamLen: trackP > 0 ? 480 : 220,
    });
    c.restore();

    c.save();
    c.translate(domeBatPos[0], domeBatPos[1]);
    c.scale(1.1, 1.1);
    drawTerminalBattery(c, {
      view: 'top',
      ammoCount: engageP > 0.1 ? 2 : 4,
      faceDir: -1,
    });
    c.restore();

    // 6 quả rocket tầm ngắn phóng từ bên trái biên giới sang:
    // - 2 quả (engaged: true) nhắm thẳng vào Thành phố (cityPos) -> Bị khóa ĐỎ và bắn hạ!
    // - 4 quả (engaged: false) nhắm vào các ô đồng ruộng trống (`fields`) -> Được máy tính đánh dấu XÁM bỏ qua ("saying no")!
    const rockets: {
      start: A.Pt;
      land: A.Pt;
      engaged: boolean;
      interceptPt: A.Pt;
    }[] = [
      { start: [-620, -340], land: [170, -335], engaged: false, interceptPt: [170, -335] },
      { start: [-580, -210], land: [450, -320], engaged: false, interceptPt: [450, -320] },
      { start: [-640, -70], land: [610, -55], engaged: true, interceptPt: [260, -62] },
      { start: [-610, 65], land: [635, 35], engaged: true, interceptPt: [280, 48] },
      { start: [-590, 220], land: [200, 300], engaged: false, interceptPt: [200, 300] },
      { start: [-550, 360], land: [490, 315], engaged: false, interceptPt: [490, 315] },
    ];

    const flightP = A.sm(t, CUE.c4_rockets_border_city - 0.8, 344.2);

    rockets.forEach((r, idx) => {
      // Khi radar & máy tính tính điểm rơi (từ 336.48s): hiện đường dự đoán và vòng tròn điểm rơi
      if (trackP > 0) {
        const col = r.engaged ? P.enemy : P.slate;
        A.line(c, [r.start, r.land], col, inn, [10, 8]);
        U.circleMark(c, r.land[0], r.land[1], 32, trackP, col, o);

        // Với 4 quả rơi xuống đồng ruộng: hiện dấu gạch bỏ qua ("saying no / not worth a missile")
        if (!r.engaged && t >= CUE.c4_allowed_fall_fields - 0.5) {
          const ignP = A.sm(t, CUE.c4_allowed_fall_fields - 0.5, CUE.c4_saying_no);
          A.line(
            c,
            [
              [r.land[0] - 18, r.land[1] - 18],
              [r.land[0] + 18, r.land[1] + 18],
            ],
            P.slate,
            o * ignP
          );
        }
      }

      // Vị trí bay của từng quả rocket
      const stopAt = r.engaged ? 0.62 : 1.0;
      const curP = Math.min(stopAt, A.clamp01(flightP * (1.0 + (idx % 2) * 0.06)));
      const rx = A.lerp(r.start[0], r.land[0], curP);
      const ry = A.lerp(r.start[1], r.land[1], curP);
      const rang = Math.atan2(r.land[1] - r.start[1], r.land[0] - r.start[0]);

      if (!r.engaged || t < 344.2) {
        A.line(c, [r.start, [rx, ry]], r.engaged ? P.enemy : P.ink2, o);
        if (curP < 0.99) {
          c.save();
          c.translate(rx, ry);
          c.rotate(rang);
          c.scale(0.65, 0.65);
          drawICBM(c, { view: 'top', thrust: 0.7 });
          c.restore();
        } else {
          // Chạm đất nổ nhỏ vô hại trên đồng ruộng
          F.smoke(c, r.land[0], r.land[1], Math.max(0.1, t - 344.5), 0.55, 4, P.slate, 6);
        }
      }

      // Đạn đánh chặn từ khẩu đội bắn hạ 2 quả nhắm vào khu dân cư
      if (r.engaged && engageP > 0) {
        if (t < 344.2) {
          F.straightShot(c, domeBatPos, r.interceptPt, engageP, {
            color: P.oliveDark,
            w: o * 1.2,
          });
        } else {
          const age = t - 344.2;
          F.explosion(c, r.interceptPt[0], r.interceptPt[1], 75, A.clamp01(age / 1.2), o);
          F.smoke(c, r.interceptPt[0], r.interceptPt[1], age, 0.65, 5, P.slate, 8);
        }
      }
    });

    K.end(c);

    // Callout "< 1 MIN" khi voice nói "Rockets fired over a border at a city fly for under a minute" (331.5 – 337.0s)
    const callMin = A.win(t, CUE.c4_rockets_border_city - 0.3, CUE.c4_radar_computer_land + 0.5, 0.35, 0.35);
    if (callMin > 0) {
      const [sx, sy] = K.toScreen(cam, -210, -260);
      U.callout(c, '< 1 MIN', sx, sy, {
        p: callMin,
        color: P.enemy,
        size: 34,
      });
    }
  }
}
