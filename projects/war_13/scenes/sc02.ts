import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';
import { TOP_MAP_NODES } from './_state';

/**
 * sc02 (26.86–52.58s): Chương 1 (Phần 2) — Góc nhìn TOP
 * Toàn cảnh chiến trường phụ thuộc vào sóng vô tuyến: sóng có thể bị nghe (heard),
 * chặn (blocked), hoặc đánh lừa (lied to) — mở ra 3 trụ cột nối tiếp nhau của Tác chiến điện tử.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Camera: Bắt đầu cận quả tên lửa đang bay chệch mục tiêu, lùi ra toàn cảnh bản đồ TOP,
    // cuối cảnh tiến vào trạm thu sóng (listener) để nối liên tục sang Chương 2 (sc03).
    const cam = K.track(
      t,
      [
        [26.86, { x: 320, y: -150, z: 1.32 }],
        [30.5, { x: 0, y: -20, z: 0.96 }],
        [49.8, { x: 0, y: -20, z: 0.96 }],
        [52.58, { x: -210, y: -95, z: 1.18 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    // 1. Nền bản đồ chiến thuật TOP
    U.drawMapEnv(c, cam, { roadY: 160, ridge: true });

    // 2. Mục tiêu kho tàng ở góc đông bắc & Quả tên lửa từ sc01 bay chệch qua phía bắc mục tiêu
    const depot = TOP_MAP_NODES.targetDepot;
    c.save();
    c.translate(depot[0], depot[1]);
    A.rrect(c, -46, -34, 92, 68, 6, P.slate, P.ink, lwO);
    A.rrect(c, -32, -20, 64, 40, 3, P.dark, P.ink, lwI);
    c.restore();

    // Đường chuẩn đáng lẽ trúng kho (nét đứt mờ) vs đường bay lệch thực tế của tên lửa
    A.line(c, [[-80, -140], depot], P.light, lwI, [A.px(c, 10), A.px(c, 8)]);
    const mProg = A.ph(t, 26.86, 36.0);
    const mx = A.lerp(140, 680, mProg);
    const my = A.lerp(-140, -320, mProg);
    A.line(c, [[140, -140], [mx, my]], P.enemy, lwO, [A.px(c, 10), A.px(c, 8)]);
    if (t < 37.5) {
      A.withA(c, 1 - A.sm(t, 35.5, 37.5), () => {
        c.save();
        c.translate(mx, my);
        c.rotate(-0.32);
        U.drawCruiseMissile(c, { view: 'top', scale: 0.95, gpsState: 'jammed' });
        c.restore();
      });
    }

    // 3. Các đơn vị trên chiến trường hiện đại (HQ, Trạm thu, Tiêm kích, Đài Radar SAM, Vệ tinh)
    const unitsShow = A.sm(t, 28.2, 31.0);
    const jetX = A.lerp(-340, -110, A.ph(t, 26.86, 52.58));
    const jetPos: A.Pt = [jetX, -20];
    const hqPos = TOP_MAP_NODES.hq;
    const lisPos = TOP_MAP_NODES.listener;
    const samPos = TOP_MAP_NODES.samSite;
    const satPos: A.Pt = [20, -360];

    // Sóng vô tuyến kết nối toàn bộ lực lượng (từ 34.72s: "depends on something that travels through the air as a radio wave")
    const waveShow = A.sm(t, CUE.c1_answer_radio, CUE.c1_radio_wave);
    const heardP = A.sm(t, CUE.c1_heard - 0.2, CUE.c1_heard + 0.6);
    const blockedP = A.sm(t, CUE.c1_blocked - 0.2, CUE.c1_blocked + 0.6);
    const liedP = A.sm(t, CUE.c1_lied_to - 0.2, CUE.c1_lied_to + 0.6);
    const threePartsP = A.sm(t, CUE.c1_three_parts, CUE.c1_three_parts + 1.8);

    if (waveShow > 0.01) {
      A.withA(c, waveShow, () => {
        // Đường sóng HQ <-> Tiêm kích (bị chặn một nửa rồi nhảy tần khi vào phần 3)
        U.drawSignalLink(c, hqPos, jetPos, t, {
          color: P.sky,
          mode: 'pulse',
          progress: blockedP > 0.1 && threePartsP < 0.5 ? 0.48 : 1.0,
        });
        // Đường sóng Vệ tinh <-> Tiêm kích
        U.drawSignalLink(c, satPos, jetPos, t, {
          color: P.sky,
          mode: 'wave',
          amp: 7,
          progress: 1.0,
        });
        // Sóng quét từ Đài Radar SAM đối phương về phía Tiêm kích
        U.drawSignalLink(c, samPos, jetPos, t, {
          color: P.enemy,
          mode: 'pulse',
          progress: 1.0,
        });
      });
    }

    // (a) HEARD (41.2s+): Trạm thu lắng nghe bắt tia sóng của đài radar đối phương
    if (heardP > 0.01) {
      A.withA(c, heardP, () => {
        // Phễu thu sóng từ đài SAM về trạm Listener
        A.poly(
          c,
          [
            lisPos,
            [samPos[0] - 40, samPos[1] - 90],
            [samPos[0] - 40, samPos[1] + 40],
          ],
          'rgba(56,189,248,0.12)',
          null,
          0
        );
        U.drawSignalLink(c, samPos, lisPos, t, {
          color: P.sky,
          mode: 'pulse',
          speed: 2.5,
          progress: heardP,
        });
        A.circle(c, lisPos[0], lisPos[1], 58, null, P.sky, lwO);
      });
    }

    // (b) BLOCKED (42.1s+): Chùm nhiễu đỏ cắt ngang đường sóng giữa HQ và Tiêm kích
    if (blockedP > 0.01) {
      const midHQJet: A.Pt = [
        (hqPos[0] + jetPos[0]) * 0.5,
        (hqPos[1] + jetPos[1]) * 0.5,
      ];
      A.withA(c, blockedP, () => {
        U.drawSignalLink(c, samPos, midHQJet, t, {
          color: P.enemy,
          mode: 'noise',
          amp: 12,
          progress: blockedP,
        });
        // Bức tường chắn nhiễu tại điểm cắt
        A.rrect(c, midHQJet[0] - 28, midHQJet[1] - 28, 56, 56, 8, 'rgba(180,73,60,0.28)', P.enemy, lwO);
        A.line(c, [[midHQJet[0] - 16, midHQJet[1] - 16], [midHQJet[0] + 16, midHQJet[1] + 16]], P.enemy, lwO);
        A.line(c, [[midHQJet[0] + 16, midHQJet[1] - 16], [midHQJet[0] - 16, midHQJet[1] + 16]], P.enemy, lwO);
      });
    }

    // (c) LIED TO (43.0s+): Xung giả màu amber tạo bóng ma máy bay kéo lệch cổng khóa của Radar địch
    if (liedP > 0.01) {
      const ghostPos: A.Pt = [jetPos[0] + 155, jetPos[1] - 135];
      A.withA(c, liedP, () => {
        U.drawSignalLink(c, jetPos, ghostPos, t, {
          color: P.amber,
          mode: 'wave',
          amp: 8,
          progress: liedP,
        });
        c.save();
        c.translate(ghostPos[0], ghostPos[1]);
        U.drawStrikeJet(c, { view: 'top', scale: 0.95, ghost: true });
        c.restore();
        // Khung khóa đỏ của radar địch bị lừa bám vào bóng ma thay vì máy bay thật
        A.rrect(c, ghostPos[0] - 58, ghostPos[1] - 58, 116, 116, 6, null, P.enemy, lwO);
      });
    }

    // 4. Ba vòng mắt xích nhân quả của Tác chiến điện tử (44.2s–52.58s: Support -> Attack -> Protection)
    if (threePartsP > 0.01) {
      const openP = A.sm(t, CUE.c1_left_open - 0.5, CUE.c1_left_open + 1.5);
      A.withA(c, threePartsP, () => {
        // Vòng 1: Nghe (Support) quanh trạm thu
        A.circle(c, lisPos[0], lisPos[1], 88, 'rgba(56,189,248,0.10)', P.sky, lwO);
        // Vòng 2: Tấn công (Attack) quanh tiêm kích & vùng đối kháng giữa bản đồ
        A.circle(c, jetPos[0] + 60, jetPos[1] - 40, 115, 'rgba(245,158,11,0.10)', P.amber, lwO);
        // Vòng 3: Bảo vệ (Protection) quanh Sở chỉ huy HQ (nhảy tần vượt tường chặn)
        A.circle(c, hqPos[0], hqPos[1], 88, 'rgba(125,139,90,0.15)', P.olive, lwO);

        // Đường cung nối nhân quả: Vòng 1 -> Vòng 2 -> Vòng 3 ("each exists because the one before it left something open")
        if (openP > 0.02) {
          A.withA(c, openP, () => {
            A.line(c, [[lisPos[0] + 75, lisPos[1] + 40], [jetPos[0] - 35, jetPos[1] - 60]], P.sky, lwO);
            A.line(c, [[jetPos[0], jetPos[1] + 65], [hqPos[0] + 75, hqPos[1] - 35]], P.amber, lwO);
          });
        }
      });
    }

    // 5. Vẽ các chủ thể đơn vị lên trên lớp nền & vùng sóng
    A.withA(c, unitsShow, () => {
      // Trạm thu lắng nghe (Electronic Support)
      c.save();
      c.translate(lisPos[0], lisPos[1]);
      U.drawGroundStation(c, {
        view: 'top',
        scale: 1.15,
        role: 'listener',
        team: 'ally',
        dishAngle: Math.atan2(samPos[1] - lisPos[1], samPos[0] - lisPos[0]),
        active: true,
      });
      c.restore();

      // Xe chỉ huy MobileHQ
      c.save();
      c.translate(hqPos[0], hqPos[1]);
      U.drawMobileHQ(c, { view: 'top', scale: 1.15, emitting: true });
      c.restore();

      // Tiêm kích StrikeJet
      c.save();
      c.translate(jetPos[0], jetPos[1]);
      U.drawStrikeJet(c, { view: 'top', scale: 1.05, rwrAlert: heardP > 0.5 });
      c.restore();

      // Đài radar phòng không & bệ SAM đối phương
      c.save();
      c.translate(samPos[0], samPos[1]);
      U.drawSamRadarSite(c, {
        view: 'top',
        scale: 1.15,
        dishAngle: Math.atan2(jetPos[1] - samPos[1], jetPos[0] - samPos[0]),
      });
      c.restore();

      // Vệ tinh ở rìa trên bản đồ
      c.save();
      c.translate(satPos[0], satPos[1]);
      U.drawSatellite(c, { scale: 0.95, emitting: true });
      c.restore();
    });

    K.end(c);
  }
}
