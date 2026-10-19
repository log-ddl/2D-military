import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawEarthSpaceBg,
  drawTacticalMapBg,
  drawHGV,
  drawICBM,
  drawKillVehicle,
  drawTerminalBattery,
  drawEarlyWarningRadar,
  drawTargetCluster,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';
import { WORLD_SIDE, drawBallisticCurve } from './_state';

/**
 * sc09 (351.48 – 381.40s): Vũ khí lượn siêu vượt âm (`HGV` - Hypersonic Glide Vehicle).
 * - Phần A (351.48 – 373.60s, góc nhìn ngang `side`):
 *   + Phóng lên bằng tên lửa đẩy rồi tách phương tiện lượn `HGV` ở tầng khí quyển cao; không đi theo cung parabol đạn đạo dự đoán được.
 *   + Khe hở độ cao: Bay **quá thấp** đối với đạn đánh chặn không gian (`KillVehicle` trên vũ trụ) nhưng lại **quá cao** đối với nhiều tên lửa phòng không tầm thấp dưới mặt đất.
 * - Phần B (373.60 – 381.40s, chuyển sang góc nhìn từ trên xuống `top`):
 *   + Radar vốn được thiết kế để tính một đường cong trơn mượt nay buộc phải đuổi theo một mục tiêu chủ động lượn chữ S bẻ gãy mọi đường dự đoán.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < 373.6) {
      this.drawHGVAltitudeGapSide(c, t);
    } else {
      this.drawHGVManeuverTop(c, t);
    }
  }

  private drawHGVAltitudeGapSide(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 40, y: 15, z: 0.96 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    const groundY = WORLD_SIDE.groundY;
    const karmanY = WORLD_SIDE.karmanY;
    drawEarthSpaceBg(c, {
      groundY,
      karmanY,
      leftTerritory: true,
      rightTerritory: true,
    });

    // Cung đạn đạo parabol truyền thống (nét đứt xanh `P.sky`) vươn cao lên không gian để đối chiếu
    drawBallisticCurve(c, 0.0, 1.0, P.sky, inn, [16, 12]);

    // Thành phố, Radar và Khẩu đội phòng không bên phải
    c.save();
    c.translate(WORLD_SIDE.citySite[0], WORLD_SIDE.citySite[1]);
    c.scale(0.95, 0.95);
    drawTargetCluster(c, 'city', 'side');
    c.restore();

    c.save();
    c.translate(WORLD_SIDE.radarSite[0], WORLD_SIDE.radarSite[1]);
    c.scale(0.75, 0.75);
    drawEarlyWarningRadar(c, {
      view: 'side',
      faceDir: -1,
      beamLen: 480,
      beamAngle: -2.4,
      showScaleRef: false,
    });
    c.restore();

    c.save();
    c.translate(WORLD_SIDE.terminalSite[0], WORLD_SIDE.terminalSite[1]);
    c.scale(0.95, 0.95);
    drawTerminalBattery(c, { view: 'side', ammoCount: 4, faceDir: -1 });
    c.restore();

    // Quỹ đạo của HGV:
    // 1. Phóng lên bằng tên lửa đẩy từ (-740, 310) tới (-420, -40)
    // 2. Tách tầng đẩy và chúc xuống tầng khí quyển cao (y ~ 10..65), lướt ngang với sóng xung kích và uốn lượn!
    const hgvPts: A.Pt[] = [
      [-740, 310],
      [-590, 105],
      [-430, -35],
      [-260, 45],
      [-60, 15],
      [150, 58],
      [360, 22],
      [580, 68],
      [835, 310],
    ];

    const pTotal = A.sm(t, CUE.c4_newest_weapon, 373.4);
    const maxSeg = (hgvPts.length - 1) * A.lerp(0.15, 0.86, pTotal);
    const sIdx = Math.min(hgvPts.length - 2, Math.floor(maxSeg));
    const sFrac = maxSeg - sIdx;
    const ptA = hgvPts[sIdx]!;
    const ptB = hgvPts[sIdx + 1]!;
    const hx = A.lerp(ptA[0], ptB[0], sFrac);
    const hy = A.lerp(ptA[1], ptB[1], sFrac);
    const hang = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);

    // Vẽ vệt đường bay HGV đã đi qua
    const drawnPts = hgvPts.slice(0, sIdx + 1).concat([[hx, hy]]);
    A.line(c, drawnPts, P.enemy, o * 1.25);

    // Tầng đẩy tách ra rơi lại phía sau khi HGV bắt đầu lướt (t >= 357.16s)
    const sepP = A.sm(t, CUE.c4_separate_glide_maneuver - 0.5, CUE.c4_separate_glide_maneuver + 2.5);
    if (sepP > 0 && sepP < 1) {
      c.save();
      c.translate(-430 - sepP * 60, -35 + sepP * 110);
      c.rotate(-0.4 + sepP * 1.2);
      A.rrect(c, -40, -14, 80, 28, 3, P.light, P.ink, inn);
      c.restore();
    }

    // Vẽ tên lửa đẩy (khi chưa tách) hoặc phương tiện lượn HGV (sau khi tách)
    c.save();
    c.translate(hx, hy);
    c.rotate(hang * 0.65);
    if (t < CUE.c4_separate_glide_maneuver - 0.3) {
      c.scale(0.95, 0.95);
      drawICBM(c, { view: 'side', stage: 'full', thrust: 1.0 });
    } else {
      c.scale(1.55, 1.55);
      drawHGV(c, { view: 'side', shockwave: true });
    }
    c.restore();

    // "Defenders cannot easily say where they will land until late" (362.56 – 368.16s):
    // Ba nhánh dự đoán nét đứt tỏa ra phía trước mũi HGV vì không biết nó sẽ chúc xuống đâu
    const uncertP = A.win(t, CUE.c4_not_predictable_arc, 373.4, 0.4, 0.4);
    if (uncertP > 0 && sIdx >= 2) {
      A.withA(c, uncertP * 0.75, () => {
        for (const dy of [-85, 0, 125]) {
          A.line(
            c,
            [
              [hx, hy],
              [hx + 280, hy + dy],
            ],
            P.amber,
            inn,
            [10, 8]
          );
        }
      });
    }

    // "too low for space interceptors and too high for many missiles designed to stop aircraft" (368.16 – 373.60s):
    const gapP = A.sm(t, CUE.c4_altitudes_gap - 0.3, CUE.c4_altitudes_gap + 1.5);
    if (gapP > 0) {
      A.withA(c, gapP, () => {
        // 1. Phía trên đường Kármán (y = -230): Đầu tự dẫn không gian `KillVehicle` không thể hạ xuống khí quyển đặc
        c.save();
        c.translate(220, -235);
        c.scale(-1.5, 1.5);
        drawKillVehicle(c, { view: 'side', thrusterUp: 0.6 });
        c.restore();
        U.arrow(c, [220, -195], [220, -105], { p: gapP, color: P.enemy, w: o });
        U.xMark(c, 220, -105, 22, gapP, P.enemy, o * 1.3);

        // 2. Phía dưới thấp (y = 165..320): Vòm trần bay của tên lửa phòng không máy bay không vươn tới độ cao HGV
        c.save();
        c.beginPath();
        c.rect(-180, 155, 860, groundY - 155);
        c.fillStyle = 'rgba(125, 139, 90, 0.16)';
        c.fill();
        c.restore();
        A.line(
          c,
          [
            [-180, 155],
            [680, 155],
          ],
          P.oliveDark,
          inn,
          [12, 8]
        );
        U.arrow(c, [480, 260], [480, 158], { p: gapP, color: P.oliveDark, w: o });
        U.xMark(c, 480, 145, 22, gapP, P.enemy, o * 1.3);
      });
    }

    K.end(c);
  }

  private drawHGVManeuverTop(c: CanvasRenderingContext2D, t: number) {
    // Góc nhìn từ trên xuống (`top`): Radar cố vẽ đường cong trơn nhưng HGV lượn chữ S đổi hướng liên tục
    const cam: K.Cam = { x: 40, y: 0, z: 1.0 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    drawTacticalMapBg(c, 'continents');

    // Trạm radar và 3 mục tiêu bên phải
    const radarPos: A.Pt = [360, 0];
    const targetTop: A.Pt = [680, -280];
    const targetMid: A.Pt = [720, 10];
    const targetBot: A.Pt = [660, 290];

    c.save();
    c.translate(targetTop[0], targetTop[1]);
    drawTargetCluster(c, 'city', 'top');
    c.restore();

    c.save();
    c.translate(targetMid[0], targetMid[1]);
    drawTargetCluster(c, 'base', 'top');
    c.restore();

    c.save();
    c.translate(targetBot[0], targetBot[1]);
    drawTargetCluster(c, 'city', 'top');
    c.restore();

    c.save();
    c.translate(radarPos[0], radarPos[1]);
    c.scale(1.0, 1.0);
    drawEarlyWarningRadar(c, { view: 'top', faceDir: -1, beamLen: 540 });
    c.restore();

    // Đường lượn chữ S của HGV nhìn từ trên xuống
    const sCurve: A.Pt[] = [
      [-680, -60],
      [-420, -210],
      [-140, 185],
      [140, -175],
      [420, 160],
      [660, 290],
    ];

    const p = A.sm(t, 373.6, CUE.c4_end - 0.2);
    const totalSeg = (sCurve.length - 1) * p;
    const idx = Math.min(sCurve.length - 2, Math.floor(totalSeg));
    const frac = totalSeg - idx;
    const pA = sCurve[idx]!;
    const pB = sCurve[idx + 1]!;
    const hx = A.lerp(pA[0], pB[0], frac);
    const hy = A.lerp(pA[1], pB[1], frac);
    const hang = Math.atan2(pB[1] - pA[1], pB[0] - pA[0]);

    // 3 đường cong dự đoán trơn mượt của radar bị gãy vỡ khi HGV ngoặt hướng ("forced to follow something that deliberately will not draw one")
    if (p > 0.15) {
      A.line(c, [[-420, -210], targetTop], P.sky, inn, [14, 10]);
      if (p > 0.28) U.xMark(c, 80, -245, 22, 1, P.enemy, o);
    }
    if (p > 0.42) {
      A.line(c, [[-140, 185], targetBot], P.sky, inn, [14, 10]);
      if (p > 0.56) U.xMark(c, 220, 235, 22, 1, P.enemy, o);
    }
    if (p > 0.68) {
      A.line(c, [[140, -175], targetMid], P.sky, inn, [14, 10]);
      if (p > 0.8) U.xMark(c, 410, -85, 22, 1, P.enemy, o);
    }

    // Vẽ đường đi thực tế ngoắt ngoéo của HGV
    const passed = sCurve.slice(0, idx + 1).concat([[hx, hy]]);
    A.line(c, passed, P.enemy, o * 1.35);

    c.save();
    c.translate(hx, hy);
    c.rotate(hang);
    c.scale(1.65, 1.65);
    drawHGV(c, { view: 'top', shockwave: true });
    c.restore();

    K.end(c);
  }
}
