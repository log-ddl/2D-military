import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawGroundSideBg,
  drawTerminalBattery,
  drawEarlyWarningRadar,
  drawTargetCluster,
  drawICBM,
  drawSpaceDebrisItem,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';

/**
 * sc07 (274.76 – 305.76s): Bài toán con số, Cạn kiệt kho đạn (Magazine Drain) & Chiến thuật bắn chọn lọc (`side` + `cut`).
 * - Phần A (274.76 – 290.40s):
 *   + 274.76 – 284.50s: Đạn đánh chặn rất đắt và mỗi mục tiêu phải phóng 1 cặp (2 quả - `fired in pairs`) vì trượt còn đắt hơn nhiều.
 *   + 284.50 – 290.40s: Kẻ tấn công phóng vài chục tên lửa rẻ tiền + bóng mồi rút cạn sạch kho đạn (`Magazine`) tích trữ nhiều năm (8/8 ống đạn về 0/8).
 * - Phần B (290.40 – 305.76s):
 *   Làm phòng thủ rẻ hơn bằng cách chọn lọc: radar tính điểm rơi, **bỏ qua** các quả nhắm vào vùng đất trống (`Empty Ground`)
 *   và chỉ bắn hạ quả đe dọa mục tiêu giá trị (`City`); đối chiếu thanh ngân sách bên thủ với dãy tên lửa giá rẻ của bên công.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    const groundY = 340;
    drawGroundSideBg(c, groundY, { hills: true });

    // Thành phố mục tiêu giá trị ở bên phải
    const cityX = 640;
    c.save();
    c.translate(cityX, groundY);
    c.scale(1.2, 1.2);
    drawTargetCluster(c, 'city', 'side');
    c.restore();

    // Trạm radar và 2 bệ phóng của bên phòng thủ
    const radarX = 180;
    const bat1X = 350;
    const bat2X = 485;

    c.save();
    c.translate(radarX, groundY);
    c.scale(0.62, 0.62);
    drawEarlyWarningRadar(c, {
      view: 'side',
      faceDir: -1,
      beamLen: 460,
      beamAngle: -2.15,
      showScaleRef: false,
    });
    c.restore();

    if (t < CUE.c3_making_defense_cheaper) {
      this.drawPairsAndMagazineDrain(c, t, groundY, bat1X, bat2X);
    } else {
      this.drawSelectiveEngagementAndCost(c, t, groundY, radarX, bat1X, bat2X, cityX);
    }

    K.end(c);

    // Callout "2x" khi voice nói "each is fired in pairs or more" (279.5 – 284.5s)
    const pairCall = A.win(t, CUE.c3_fired_in_pairs - 0.3, CUE.c3_drain_magazine - 0.3, 0.35, 0.35);
    if (pairCall > 0) {
      const [sx, sy] = K.toScreen(cam, 260, -40);
      U.callout(c, '2x INTERCEPTORS', sx, sy - 55, {
        to: [sx, sy],
        p: pairCall,
        color: P.oliveDark,
        size: 32,
      });
    }
  }

  private drawPairsAndMagazineDrain(
    c: CanvasRenderingContext2D,
    t: number,
    groundY: number,
    bat1X: number,
    bat2X: number
  ) {
    const o = lwO(c);
    const inn = lwI(c);

    // Tính số lượng đạn còn lại trong kho 8 ống (mỗi lần bắn giảm 2 ống theo cặp!)
    // - 279.8s: bắn cặp 1 (còn 6/8)
    // - 285.5s: bắn cặp 2 (còn 4/8)
    // - 287.0s: bắn cặp 3 (còn 2/8)
    // - 288.4s: bắn cặp 4 (còn 0/8 - cạn sạch kho đạn!)
    let remain = 8;
    if (t >= 279.8) remain = 6;
    if (t >= 285.5) remain = 4;
    if (t >= 287.0) remain = 2;
    if (t >= 288.4) remain = 0;

    c.save();
    c.translate(bat1X, groundY);
    c.scale(1.05, 1.05);
    drawTerminalBattery(c, { view: 'side', ammoCount: Math.min(4, remain), faceDir: -1 });
    c.restore();

    c.save();
    c.translate(bat2X, groundY);
    c.scale(1.05, 1.05);
    drawTerminalBattery(c, {
      view: 'side',
      ammoCount: Math.max(0, remain - 4),
      faceDir: -1,
    });
    c.restore();

    // ── Mặt cắt Kho đạn 8 ống (Magazine Cutaway Box) hiển thị lớn, rõ ràng ở góc phải-trên ──
    const magX = 360,
      magY = -430,
      magW = 460,
      magH = 195;
    A.rrect(c, magX, magY, magW, magH, 14, P.paper, remain === 0 ? P.enemy : P.ink, o);
    for (let i = 0; i < 8; i++) {
      const cx = magX + 34 + i * 52;
      const cy = magY + 26;
      const hasRound = i < remain;
      A.rrect(
        c,
        cx,
        cy,
        38,
        142,
        6,
        hasRound ? '#e8efe4' : '#e2e8f0',
        hasRound ? P.oliveDark : P.slate,
        inn
      );
      if (hasRound) {
        // Quả đạn đánh chặn đắt tiền nằm trong ống
        A.rrect(c, cx + 9, cy + 34, 20, 96, 3, P.olive, P.ink, inn);
        A.poly(
          c,
          [
            [cx + 9, cy + 34],
            [cx + 19, cy + 10],
            [cx + 29, cy + 34],
          ],
          P.amber,
          P.ink,
          inn
        );
      } else {
        U.xMark(c, cx + 19, cy + 75, 11, 1, P.slate, inn);
      }
    }

    // ── Nhịp 1 (274.76 – 284.96s): 1 đầu đạn bay tới -> Phóng 1 cặp (2 quả) đạn đánh chặn song song ──
    if (t < CUE.c3_drain_magazine) {
      const targetPt: A.Pt = [120, -60];
      const wP = A.sm(t, CUE.c3_question_of_numbers, 282.4);
      const wx = A.lerp(-680, targetPt[0], wP);
      const wy = A.lerp(-380, targetPt[1], wP);

      if (t < 282.4) {
        A.line(
          c,
          [
            [-680, -380],
            [wx, wy],
          ],
          P.enemy,
          o
        );
        c.save();
        c.translate(wx, wy);
        c.rotate(0.52);
        c.scale(1.6, 1.6);
        drawICBM(c, { view: 'side', stage: 'warhead', reentryGlow: 0.5 });
        c.restore();
      }

      // Phóng 2 quả đạn đánh chặn đi thành cặp song song tại t = 279.8s
      const pairP = A.sm(t, 279.8, 282.4);
      if (pairP > 0 && t < 282.4) {
        F.straightShot(c, [bat1X - 20, groundY - 50], [targetPt[0] - 10, targetPt[1] - 18], pairP, {
          color: P.oliveDark,
          w: o * 1.25,
        });
        F.straightShot(c, [bat2X - 20, groundY - 50], [targetPt[0] + 12, targetPt[1] + 18], pairP, {
          color: P.oliveDark,
          w: o * 1.25,
        });
      }
      if (t >= 282.4) {
        F.explosion(c, targetPt[0], targetPt[1], 105, A.clamp01((t - 282.4) / 1.3), o);
      }
    } else {
      // ── Nhịp 2 (284.96 – 290.40s): Mưa tên lửa rẻ tiền + bóng mồi rút cạn sạch kho đạn ──
      const salvo = [
        { t0: 285.0, x0: -780, y0: -410, x1: 40, y1: -90, hitT: 286.6, decoy: false },
        { t0: 285.4, x0: -690, y0: -450, x1: 110, y1: -150, hitT: 288.0, decoy: true },
        { t0: 286.0, x0: -820, y0: -320, x1: -20, y1: -20, hitT: 289.4, decoy: false },
        { t0: 286.6, x0: -760, y0: -380, x1: 210, y1: 30, hitT: 999, decoy: true },
        { t0: 287.1, x0: -860, y0: -280, x1: 160, y1: 80, hitT: 999, decoy: false },
        { t0: 287.5, x0: -720, y0: -430, x1: 280, y1: -40, hitT: 999, decoy: false },
      ];

      salvo.forEach((m, idx) => {
        if (t < m.t0) return;
        const endT = Math.min(m.hitT, CUE.c3_making_defense_cheaper);
        const p = A.clamp01((t - m.t0) / (endT - m.t0));
        const mx = A.lerp(m.x0, m.x1, p);
        const my = A.lerp(m.y0, m.y1, p);

        if (t < m.hitT) {
          A.line(
            c,
            [
              [m.x0, m.y0],
              [mx, my],
            ],
            m.decoy ? P.slate : P.enemy,
            inn,
            m.decoy ? [10, 8] : undefined
          );
          c.save();
          c.translate(mx, my);
          c.rotate(0.48);
          c.scale(1.35, 1.35);
          if (m.decoy) drawSpaceDebrisItem(c, 'balloonCone');
          else drawICBM(c, { view: 'side', stage: 'warhead' });
          c.restore();
        } else {
          F.explosion(c, m.x1, m.y1, 78, A.clamp01((t - m.hitT) / 1.1), o);
        }

        // Các cặp đạn đánh chặn bắn lên liên tiếp cho tới khi kho đạn về 0
        if (idx < 3) {
          const fireT = m.t0 + 0.45;
          const ip = A.clamp01((t - fireT) / (m.hitT - fireT));
          if (ip > 0 && ip < 1) {
            F.straightShot(c, [bat1X - 20, groundY - 50], [m.x1 - 8, m.y1 - 12], ip, {
              color: P.oliveDark,
              w: o,
            });
            F.straightShot(c, [bat2X - 20, groundY - 50], [m.x1 + 8, m.y1 + 12], ip, {
              color: P.oliveDark,
              w: o,
            });
          }
        }
      });

      // Vòng cảnh báo đỏ quanh kho đạn trống rỗng khi remain === 0
      if (remain === 0) {
        U.focus(c, magX - 10, magY - 10, magW + 20, magH + 20, A.sm(t, 288.4, 289.2), P.enemy, o * 1.3);
      }
    }
  }

  private drawSelectiveEngagementAndCost(
    c: CanvasRenderingContext2D,
    t: number,
    groundY: number,
    radarX: number,
    bat1X: number,
    bat2X: number,
    cityX: number
  ) {
    const o = lwO(c);
    const inn = lwI(c);

    // Khẩu đội giữ đạn, chỉ bắn đúng 1 lần vào quả tên lửa đe dọa thành phố
    const shootValuable = A.sm(t, 294.2, 297.2);
    c.save();
    c.translate(bat1X, groundY);
    c.scale(1.05, 1.05);
    drawTerminalBattery(c, { view: 'side', ammoCount: shootValuable > 0.1 ? 3 : 4, faceDir: -1 });
    c.restore();

    c.save();
    c.translate(bat2X, groundY);
    c.scale(1.05, 1.05);
    drawTerminalBattery(c, { view: 'side', ammoCount: 4, faceDir: -1 });
    c.restore();

    // Vùng đất trống (Empty Ground) bên trái radar (-680 .. -80)
    A.line(
      c,
      [
        [-680, groundY + 18],
        [-80, groundY + 18],
      ],
      P.slate,
      inn,
      [14, 10]
    );

    // 3 quả tên lửa bay tới:
    // - Quả 1 & 2 rơi xuống vùng đất trống (-520 và -240): Radar vẽ đường dự đoán màu xám và BỎ QUA (không bắn)
    // - Quả 3 nhắm thẳng vào Thành phố (cityX = 640): Radar khóa đỏ và phóng đạn đánh chặn tiêu diệt tại (380, 40)
    const m1P = A.sm(t, CUE.c3_making_defense_cheaper, 298.0);
    const m2P = A.sm(t, CUE.c3_making_defense_cheaper + 0.8, 299.2);
    const m3P = A.sm(t, CUE.c3_making_defense_cheaper + 0.3, 297.2);

    // Quả 1 & 2 (rơi xuống đất trống -> được phép rơi tự do không tốn đạn đánh chặn)
    for (const [p, x0, y0, xLand] of [
      [m1P, -820, -390, -490],
      [m2P, -680, -420, -210],
    ] as const) {
      const mx = A.lerp(x0, xLand, p);
      const my = A.lerp(y0, groundY, p);
      // Đường dự đoán rơi xuống đất trống
      A.line(
        c,
        [
          [x0, y0],
          [xLand, groundY],
        ],
        P.slate,
        inn,
        [10, 10]
      );
      if (p < 0.98) {
        c.save();
        c.translate(mx, my);
        c.rotate(Math.atan2(groundY - y0, xLand - x0));
        c.scale(1.4, 1.4);
        drawICBM(c, { view: 'side', stage: 'warhead' });
        c.restore();
      } else {
        F.dust(c, xLand, groundY, A.clamp01((p - 0.95) * 15), 1.4);
        F.smoke(c, xLand, groundY, Math.max(0.1, t - 297.8), 0.65, 5, P.slate, 10);
      }
    }

    // Quả 3 (nhắm vào Thành phố -> Bắn chặn!)
    const hitPt: A.Pt = [380, 40];
    const m3x = A.lerp(-520, hitPt[0], m3P);
    const m3y = A.lerp(-420, hitPt[1], m3P);
    // Đường dự đoán lao vào thành phố
    A.line(
      c,
      [
        [-520, -420],
        [cityX, groundY - 40],
      ],
      P.enemy,
      inn,
      [12, 8]
    );
    if (t < 297.2) {
      A.line(
        c,
        [
          [-520, -420],
          [m3x, m3y],
        ],
        P.enemy,
        o
      );
      c.save();
      c.translate(m3x, m3y);
      c.rotate(Math.atan2(hitPt[1] - -420, hitPt[0] - -520));
      c.scale(1.55, 1.55);
      drawICBM(c, { view: 'side', stage: 'warhead', reentryGlow: 0.6 });
      c.restore();
    }
    if (shootValuable > 0 && t < 297.2) {
      F.straightShot(c, [bat1X - 20, groundY - 50], hitPt, shootValuable, {
        color: P.oliveDark,
        w: o * 1.25,
      });
    }
    if (t >= 297.2) {
      const age = t - 297.2;
      F.explosion(c, hitPt[0], hitPt[1], 95, A.clamp01(age / 1.3), o);
      F.smoke(c, hitPt[0], hitPt[1], age, 0.85, 6, P.slate, 12);
    }

    // ── Khung đối chiếu kinh tế cuối cảnh (299.40 – 305.76s): "run out of money before the attacker runs out of rockets" ──
    const econWin = A.sm(t, CUE.c3_run_out_of_money - 0.5, CUE.c3_run_out_of_money + 0.8);
    if (econWin > 0) {
      const drainP = A.sm(t, CUE.c3_run_out_of_money + 0.3, CUE.c3_end - 0.8);
      A.withA(c, econWin, () => {
        A.rrect(c, -780, -450, 1560, 150, 14, P.paper, P.ink, o);
        // Bên trái: Hàng dài 10 quả rocket giá rẻ của phe tấn công vẫn còn đầy
        for (let r = 0; r < 10; r++) {
          c.save();
          c.translate(-680 + r * 62, -375);
          c.rotate(-Math.PI / 2);
          c.scale(0.45, 0.45);
          drawICBM(c, { view: 'side', stage: 'full', thrust: 0 });
          c.restore();
        }
        // Bên phải: Thanh ngân sách của bên phòng thủ tụt nhanh về mức cạn kiệt
        U.bar(c, 80, -398, 620, 46, 1 - 0.88 * drainP, P.amber, 1);
      });
    }
  }
}
