import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc12 (309.42–341.74s): Chương 4 (Phần 2) — Spoofing (Đánh lừa tọa độ dẫn đường)
 * Góc nhìn TOP bản đồ ven biển kết hợp Màn hình Nhận thức Nội bộ của UAV:
 * - Spoofer không phát nhiễu ồn mà gửi tín hiệu giả hoàn hảo khiến bộ thu tin tưởng, từ từ "dắt" chiếc UAV đi lạc.
 * - Màn hình trong đầu UAV vẫn báo nó đang bay thẳng tới mục tiêu, nhưng ngoài đời thực nó đang bay lệch hàng km.
 * - Tàu biển và máy bay xa chiến trường cũng hiện vị trí sai lệch hàng nhiều km sâu trong đất liền.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Cuối cảnh (336.46–341.74s) camera dịch sang vùng thông tin bộ đàm lục quân để nối mượt sang Chương 5 (sc13)
    const cam = K.track(
      t,
      [
        [309.42, { x: -40, y: -30, z: 1.02 }],
        [326.82, { x: 20, y: 35, z: 0.96 }],
        [336.46, { x: 20, y: 35, z: 0.96 }],
        [341.74, { x: -120, y: -20, z: 1.0 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawMapEnv(c, cam, { roadY: 80, ridge: true, coast: true });

    const spooferPos: A.Pt = [60, 120];
    const intendedTarget: A.Pt = [540, -40];
    const startPos: A.Pt = [-540, -40];

    const spoofP = A.sm(t, CUE.c4_false_signal - 0.3, CUE.c4_slowly_walks);
    const walkProg = A.ph(t, 309.42, 335.0);
    const shipShow = A.sm(t, CUE.c4_ships_aircraft - 0.3, CUE.c4_ships_aircraft + 1.0);
    const commsBridge = A.sm(t, CUE.c4_work_comms - 0.2, CUE.c4_work_comms + 1.2);

    // 1. Đường bay dự kiến trong đầu UAV (thẳng tắp từ trái sang phải tới mục tiêu)
    A.line(c, [startPos, intendedTarget], P.sky, lwI, [A.px(c, 12), A.px(c, 9)]);
    c.save();
    c.translate(intendedTarget[0], intendedTarget[1]);
    A.rrect(c, -38, -28, 76, 56, 6, P.enemy, P.ink, lwO);
    c.restore();

    // Vị trí ảo mà chiếc UAV "nghĩ" mình đang ở trên đường chuẩn
    const believedX = A.lerp(startPos[0], intendedTarget[0] - 80, walkProg);
    const believedPos: A.Pt = [believedX, startPos[1]];

    // Vị trí thực tế ngoài đời: bị trạm Spoofer từ từ dắt cong lệch hẳn lên vùng trống phía bắc!
    const driftCurve = Math.pow( Math.max(0, walkProg - 0.15) / 0.85, 1.55 );
    const realPos: A.Pt = [
      believedX - driftCurve * 70,
      startPos[1] - driftCurve * 245,
    ];
    const realHeading = Math.atan2(-driftCurve * 245, 520);

    // Vẽ quỹ đạo thực tế bị dắt lệch (màu amber)
    const trailPts: A.Pt[] = [];
    for (let s = 0; s <= walkProg; s += 0.04) {
      const dc = Math.pow(Math.max(0, s - 0.15) / 0.85, 1.55);
      trailPts.push([
        A.lerp(startPos[0], intendedTarget[0] - 80, s) - dc * 70,
        startPos[1] - dc * 245,
      ]);
    }
    if (trailPts.length > 1) {
      A.line(c, trailPts, P.amber, lwO);
    }

    // 2. Trạm Spoofer mặt đất phát xung giả êm ả (màu amber, không phải nhiễu răng cưa đỏ) dắt chiếc UAV đi lạc
    if (spoofP > 0.01) {
      U.drawSignalLink(c, spooferPos, realPos, t, {
        color: P.amber,
        mode: 'pulse',
        speed: 2.2,
        progress: spoofP,
      });
      // Đường nối đối chiếu giữa Vị trí ảo UAV tưởng (believedPos) và Vị trí thật (realPos)
      A.line(c, [believedPos, realPos], P.amber, lwI, [A.px(c, 6), A.px(c, 6)]);
      A.circle(c, believedPos[0], believedPos[1], 10, 'rgba(56,189,248,0.35)', P.sky, lwI);
    }

    c.save();
    c.translate(spooferPos[0], spooferPos[1]);
    U.drawGroundStation(c, {
      view: 'top',
      scale: 1.2,
      role: 'spoofer',
      team: 'enemy',
      dishAngle: Math.atan2(realPos[1] - spooferPos[1], realPos[0] - spooferPos[0]),
      active: true,
    });
    c.restore();

    // Chiếc UAV thực tế đang bay tự tin về nơi không phải chỗ nó nghĩ
    c.save();
    c.translate(realPos[0], realPos[1]);
    c.rotate(realHeading);
    U.drawTacticalDrone(c, { view: 'top', scale: 1.4, spoofed: spoofP > 0.3 });
    c.restore();

    // 3. Cửa sổ "Màn hình dẫn đường bên trong UAV" (UAV Internal Nav) để thấy rõ nó KHÔNG BIẾT mình bị lạc
    const navShow = A.win(t, 317.8, 336.0, 0.5, 0.5);
    if (navShow > 0.02) {
      const nx = -430;
      const ny = -255;
      const nw = 320;
      const nh = 155;
      A.withA(c, navShow, () => {
        A.line(c, [realPos, [nx + nw / 2, ny + 20]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
        A.rrect(c, nx - nw / 2 - 6, ny - nh / 2 - 6, nw + 12, nh + 12, 10, P.dark, P.ink, lwO);
        A.rrect(c, nx - nw / 2, ny - nh / 2, nw, nh, 8, P.paper, P.ink, lwI);

        // Trong màn hình của UAV: Đường bay màu xanh thẳng tắp, UAV báo khóa tốt (chấm xanh lá/sky) hướng thẳng vào tâm bia!
        A.line(c, [[nx - 125, ny], [nx + 115, ny]], P.sky, lwO);
        A.circle(c, nx + 115, ny, 14, P.enemy, P.ink, lwI);
        const iconX = A.lerp(nx - 110, nx + 65, walkProg);
        A.poly(c, [[iconX - 12, ny - 9], [iconX + 14, ny], [iconX - 12, ny + 9]], P.sky, P.ink, lwI);
      });
    }

    // 4. Tàu biển ngoài khơi hiển thị tọa độ giả nằm sâu trong đất liền ("ships and aircraft... wrong by many kilometers": 326.82s+)
    if (shipShow > 0.01) {
      const realShip: A.Pt = [-180, 325]; // dưới biển
      const spoofedShip: A.Pt = [-220, 45]; // nhảy lên giữa đất liền!
      A.withA(c, shipShow, () => {
        U.drawSignalLink(c, spooferPos, realShip, t, {
          color: P.amber,
          mode: 'pulse',
          speed: 2.0,
          progress: shipShow,
        });
        A.line(c, [realShip, spoofedShip], P.amber, lwO, [A.px(c, 8), A.px(c, 6)]);

        c.save();
        c.translate(realShip[0], realShip[1]);
        U.drawShipTop(c, { scale: 1.2, ghost: false });
        c.restore();

        c.save();
        c.translate(spoofedShip[0], spoofedShip[1]);
        U.drawShipTop(c, { scale: 1.2, ghost: true });
        c.restore();
      });
    }

    // 5. Chuẩn bị nối sang Chương 5 (336.46–341.74s: "The same ideas work against communications...")
    if (commsBridge > 0.01) {
      const hqTalkPos: A.Pt = [-460, 120];
      A.withA(c, commsBridge, () => {
        c.save();
        c.translate(hqTalkPos[0], hqTalkPos[1]);
        U.drawMobileHQ(c, { view: 'top', scale: 1.2, emitting: true });
        c.restore();
        for (let i = 0; i < 3; i++) {
          const r = A.lerp(24, 150, ((t * 1.1 + i * 0.33) % 1));
          A.circle(c, hqTalkPos[0], hqTalkPos[1], r, null, P.sky, lwI);
        }
      });
    }

    K.end(c);
  }
}
