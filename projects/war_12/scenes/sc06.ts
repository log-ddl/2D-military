import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawTacticalMapBg,
  drawTargetCluster,
  drawTerminalBattery,
  drawNavalDestroyer,
  drawAircraftCarrier,
  drawMobileTEL,
  drawICBM,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';

/**
 * sc06 (227.58 – 274.76s): Hệ quả hình học vùng phủ (Footprint) & Phòng thủ tên lửa trên biển ở góc nhìn từ trên xuống (`top`).
 * - Phần A (227.58 – 249.24s):
 *   Mỗi loại đạn đánh chặn chỉ bảo vệ được một vùng phủ (`Footprint`) giới hạn, không thể che hết cả đất nước.
 *   Đặt khẩu đội ở Thành phố (`City`) hay Căn cứ (`Base`) là phải đánh đổi; ngay cả hệ thống tốt cũng có rìa (`edge`)
 *   và kẻ tấn công chủ động nhắm vào vùng hở sát mép vòm.
 * - Phần B (249.24 – 274.76s):
 *   Vị trí bệ phóng: Tàu khu trục (`NavalDestroyer`) mang radar mạnh và đạn đánh chặn có thể cơ động trên biển
 *   tới chặn hướng đe dọa khi mối đe dọa dịch chuyển và che cho đồng minh, trong khi trận địa cố định trên đất liền
 *   không thể nhúc nhích. Nhưng cái giá chiến thuật: tàu khu trục neo giữ bờ biển thì không thể đi hộ tống Tàu sân bay (`AircraftCarrier`).
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, '#dce8f0');

    // Camera liên tục trên bản đồ chiến dịch nhìn từ trên xuống (`top`)
    const cam = K.track(
      t,
      [
        [CUE.ch3_start, { x: 480, y: -20, z: 1.15 }],
        [CUE.c3_city_vs_base, { x: 520, y: 10, z: 1.05 }],
        [CUE.c3_where_launchers_stand, { x: 80, y: 60, z: 0.92 }],
        [CUE.c3_cover_allies, { x: 60, y: 120, z: 0.88 }],
        [CUE.c3_not_escorting_carrier, { x: -40, y: 190, z: 0.82 }],
      ],
      A.eio
    );

    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    drawTacticalMapBg(c, 'coast');

    // ── 1. Cụm mục tiêu trên đất liền bên phải: Thành phố Bắc, Căn cứ Trung tâm, Thành phố Đồng minh phía Nam ──
    const cityN: A.Pt = [620, -240];
    const baseC: A.Pt = [560, 70];
    const cityS: A.Pt = [690, 410];

    c.save();
    c.translate(cityN[0], cityN[1]);
    drawTargetCluster(c, 'city', 'top');
    c.restore();

    c.save();
    c.translate(baseC[0], baseC[1]);
    drawTargetCluster(c, 'base', 'top');
    c.restore();

    c.save();
    c.translate(cityS[0], cityS[1]);
    drawTargetCluster(c, 'city', 'top');
    c.restore();

    // ── 2. Phần A (227.58 – 249.24s): Bài toán Footprint Thành phố vs Căn cứ & Điểm yếu ở mép vòm (Edge) ──
    const footR = 175;
    const showFoot1 = A.sm(t, CUE.ch3_start + 0.4, CUE.c3_each_footprint + 1.5);
    const shiftToBase = A.eio(t, CUE.c3_choices_batteries, CUE.c3_city_vs_base + 1.0);
    const showBoth = A.sm(t, CUE.c3_city_vs_base + 1.2, CUE.c3_system_has_edge);

    // Khẩu đội 1: ban đầu thử dịch chuyển giữa Thành phố và Căn cứ để cho thấy chọn cái này thì hở cái kia
    const b1x = A.lerp(cityN[0] - 40, baseC[0] - 40, shiftToBase * (1 - showBoth));
    const b1y = A.lerp(cityN[1], baseC[1], shiftToBase * (1 - showBoth));

    if (showFoot1 > 0) {
      A.withA(c, 0.2 * showFoot1, () => {
        A.circle(c, b1x, b1y, footR, P.oliveLight, null, 0);
      });
      U.circleMark(c, b1x, b1y, footR, showFoot1, P.oliveDark, o);
      c.save();
      c.translate(b1x, b1y);
      c.scale(0.85, 0.85);
      drawTerminalBattery(c, { view: 'top', ammoCount: 4 });
      c.restore();
    }

    // Khi đặt thêm khẩu đội thứ 2 ở Căn cứ (showBoth > 0), vẫn còn khoảng trống lớn ở rìa (edge) giữa các vòm
    if (showBoth > 0) {
      const b2x = baseC[0] - 40;
      const b2y = baseC[1];
      A.withA(c, 0.2 * showBoth, () => {
        A.circle(c, b2x, b2y, footR, P.oliveLight, null, 0);
      });
      U.circleMark(c, b2x, b2y, footR, showBoth, P.oliveDark, o);
      c.save();
      c.translate(b2x, b2y);
      c.scale(0.85, 0.85);
      drawTerminalBattery(c, { view: 'top', ammoCount: 4 });
      c.restore();
    }

    // "Even a very good system has an edge, and the attacker is able to choose where to aim" (244.88 – 249.24s)
    const edgeAttackP = A.sm(t, CUE.c3_system_has_edge - 0.3, CUE.c3_where_launchers_stand - 0.5);
    if (edgeAttackP > 0 && t < CUE.c3_ship_interceptors) {
      const edgeTarget: A.Pt = [cityN[0] + 55, cityN[1] + 155]; // Nằm ngay sát ngoài mép vòng phủ
      U.arrow(c, [-580, -340], edgeTarget, {
        p: edgeAttackP,
        color: P.enemy,
        w: o * 1.2,
      });
      A.circle(c, edgeTarget[0], edgeTarget[1], 24 * edgeAttackP, null, P.enemy, o * 1.2);
    }

    // ── 3. Phần B (249.24 – 274.76s): Tàu khu trục cơ động trên biển vs Trận địa cố định & Tàu sân bay bị bỏ trống ──
    if (t >= CUE.c3_where_launchers_stand - 0.5) {
      const navalIn = A.sm(t, CUE.c3_where_launchers_stand - 0.3, CUE.c3_ship_interceptors + 1.0);
      // Hướng đe dọa dịch chuyển từ phía Bắc xuống phía Nam ("move again when the threat moves")
      const threatShift = A.eio(t, CUE.c3_ship_interceptors + 2.0, CUE.c3_fixed_site_cannot + 1.0);

      const launchOrigin: A.Pt = [-720, A.lerp(-380, -80, threatShift)];
      const aimTarget: A.Pt = [
        A.lerp(cityN[0], cityS[0], threatShift),
        A.lerp(cityN[1], cityS[1], threatShift),
      ];

      // Xe phóng của đối phương ở bờ bên kia
      c.save();
      c.translate(launchOrigin[0], launchOrigin[1]);
      c.scale(0.85, 0.85);
      drawMobileTEL(c, { view: 'top' });
      c.restore();

      // Đường đạn đe dọa vắt qua biển
      U.dashed(c, launchOrigin, aimTarget, P.enemy, o * 1.15, t * 85);
      const mPos = A.lerpPt(launchOrigin, aimTarget, 0.38);
      c.save();
      c.translate(mPos[0], mPos[1]);
      c.rotate(Math.atan2(aimTarget[1] - launchOrigin[1], aimTarget[0] - launchOrigin[0]));
      c.scale(0.95, 0.95);
      drawICBM(c, { view: 'top', thrust: 0 });
      c.restore();

      // Trận địa cố định trên đất liền ("A fixed site in a country cannot"): bị đóng khung khóa chặt ở phía Bắc, không với tới đường đạn phía Nam
      if (t >= CUE.c3_fixed_site_cannot - 0.5) {
        const fixP = A.sm(t, CUE.c3_fixed_site_cannot - 0.5, CUE.c3_fixed_site_cannot + 1.0);
        A.rrect(c, b1x - 58, b1y - 42, 116, 84, 8, null, P.enemy, o);
        U.xMark(c, b1x, b1y + footR + 28, 22, fixP, P.enemy, o * 1.3);
      }

      // Tàu khu trục Aegis (`NavalDestroyer`) cơ động dọc bờ biển theo đường đe dọa để che chắn cho đồng minh phía Nam
      const shipStart: A.Pt = [60, -160];
      const shipEnd: A.Pt = [140, 210];
      const shipPos = A.lerpPt(shipStart, shipEnd, threatShift);
      const shipAng = threatShift > 0.05 && threatShift < 0.95 ? 1.35 : -1.57;

      // Vệt nước đuôi tàu khi cơ động
      if (threatShift > 0.02) {
        A.line(c, [shipStart, shipPos], P.sky, o, [12, 10]);
      }

      A.withA(c, navalIn, () => {
        c.save();
        c.translate(shipPos[0], shipPos[1]);
        c.rotate(shipAng);
        c.scale(1.15, 1.15);
        drawNavalDestroyer(c, { view: 'top', vlsAmmo: 8, radarSweep: 265 });
        c.restore();
      });

      // "A hull committed to watching the sky above a coast is a hull that is not escorting a carrier" (266.0 – 274.76s)
      const carrierP = A.sm(t, CUE.c3_not_escorting_carrier - 3.2, CUE.c3_not_escorting_carrier);
      if (carrierP > 0) {
        const carrierPos: A.Pt = [-460, 470];
        A.withA(c, carrierP, () => {
          // Tàu sân bay đi ngoài khơi xa
          c.save();
          c.translate(carrierPos[0], carrierPos[1]);
          c.rotate(-0.18);
          c.scale(1.35, 1.35);
          drawAircraftCarrier(c, 'top');
          c.restore();

          // Vòng đội hình hộ tống quanh tàu sân bay và ô trống nhấp nháy nơi chiếc khu trục lẽ ra phải đứng
          const escortSlot: A.Pt = [carrierPos[0] + 195, carrierPos[1] - 75];
          A.circle(c, carrierPos[0], carrierPos[1], 220, null, P.slate, inn);
          A.circle(c, escortSlot[0], escortSlot[1], 48, '#f8e6e4', P.enemy, o);
          U.xMark(c, escortSlot[0], escortSlot[1], 22, carrierP, P.enemy, o * 1.3);

          // Đường nối nét đứt chỉ rõ chiếc tàu khu trục đã bị rút khỏi đội hình tàu sân bay để canh bờ biển
          U.dashed(c, escortSlot, shipPos, P.amber, o, t * 70);
        });
      }
    }

    K.end(c);
  }
}
