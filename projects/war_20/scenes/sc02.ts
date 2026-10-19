// sc02.ts (17.42 – 41.96s): 11 chiếc máy bay tiếp dầu Victor truyền nhiên liệu dây chuyền
// qua 4 chặng xuyên Đại Tây Dương để đưa 1 chiếc Avro Vulcan tới đảo Falkland.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import { drawOceanMapBg, drawVulcan, drawVictor, lwO, lwI } from './_assets';
import { ATLANTIC, atlanticPt, atlanticCamCh1, CUE } from './_state';

// 11 chiếc Victor chia thành 4 chặng tiếp sức (uTurn: điểm quay đầu về Ascension, perp: độ lệch ngang đội hình)
const VICTORS: { uTurn: number; perp: number; tRefuel: number }[] = [
  // Chặng 1 (u = 0.24): 4 chiếc Victor ngoài cùng tiếp xăng cho đoàn rồi quay về
  { uTurn: 0.24, perp: -165, tRefuel: 23.4 },
  { uTurn: 0.24, perp: 165, tRefuel: 23.4 },
  { uTurn: 0.27, perp: -125, tRefuel: 24.2 },
  { uTurn: 0.27, perp: 125, tRefuel: 24.2 },
  // Chặng 2 (u = 0.46): 3 chiếc Victor tiếp sức chặng giữa
  { uTurn: 0.46, perp: -95, tRefuel: 26.2 },
  { uTurn: 0.46, perp: 95, tRefuel: 26.2 },
  { uTurn: 0.50, perp: -65, tRefuel: 27.2 },
  // Chặng 3 (u = 0.68): 3 chiếc Victor đẩy sâu xuống phía Nam
  { uTurn: 0.68, perp: 65, tRefuel: 29.0 },
  { uTurn: 0.70, perp: -45, tRefuel: 29.8 },
  { uTurn: 0.70, perp: 45, tRefuel: 29.8 },
  // Chặng 4 (u = 0.84): Chiếc Victor cuối cùng bơm đầy chiếc Vulcan ngay trước đảo Falkland
  { uTurn: 0.84, perp: -38, tRefuel: 31.8 },
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = atlanticCamCh1(t);
    A.clear(c, P.bg);

    K.begin(c, cam);
    drawOceanMapBg(c, cam, 'atlantic', t);

    const lo = lwO(c);
    const li = lwI(c);

    // Giữ nguyên vòng mốc Ascension, Falkland và đường tuyến 6.000 km từ sc01
    A.circle(c, ATLANTIC.ascension[0], ATLANTIC.ascension[1], 24, null, P.sky, lo);
    A.circle(c, ATLANTIC.falkland[0], ATLANTIC.falkland[1], 24, null, P.enemy, lo);
    A.line(c, [ATLANTIC.ascension, ATLANTIC.falkland], P.ink2, lo, [A.px(c, 14), A.px(c, 10)]);

    // Tiến độ bay của chiếc Vulcan từ Ascension (0.0) tới Falkland (1.0) trong [18.0 .. 35.4s]
    const vulcanU = A.eio(t, 18.0, 35.4);
    const [vx, vy, mainAng] = atlanticPt(vulcanU, 0);

    // 1. Khi ở đoạn kết (35.78 – 41.96s: "really a tanker operation with a bomber attached to the tip"),
    // làm nổi bật cấu trúc hình tháp / mũi giáo tiếp sức của 11 chiếc Victor hội tụ vào 1 chiếc Vulcan ở mũi nhọn
    const pyramidP = A.sm(t, CUE.longest_raid, CUE.tanker_operation + 0.6);
    if (pyramidP > 0.01) {
      const [pL] = atlanticPt(0.18, -195);
      const [, pLy] = atlanticPt(0.18, -195);
      const [pR, pRy] = atlanticPt(0.18, 195);
      const [tipX, tipY] = ATLANTIC.falkland;
      A.withA(c, pyramidP * 0.22, () => {
        A.poly(c, [ATLANTIC.ascension, [pL, pLy], [tipX, tipY], [pR, pRy]], P.amber, null, 0);
      });
      A.withA(c, pyramidP * 0.85, () => {
        A.line(c, [[pL, pLy], [tipX, tipY], [pR, pRy]], P.amber, lo, [A.px(c, 12), A.px(c, 8)]);
      });
    }

    // Tuyến đường trục chính của chiếc Vulcan đã bay qua
    A.line(c, [ATLANTIC.ascension, [vx, vy]], P.amber, lo * 1.2);

    // 2. Vẽ 11 chiếc Victor Tanker theo từng chặng tiếp sức và vòng quay về căn cứ
    VICTORS.forEach((v, idx) => {
      const appear = A.sm(t, 18.2 + idx * 0.18, 19.2 + idx * 0.18);
      if (appear <= 0.01) return;

      // Trước khi chạm uTurn: đi cùng tiến độ vulcanU; sau khi chạm uTurn: vòng quay ngược về Ascension
      const reached = vulcanU >= v.uTurn;
      let curU = Math.min(vulcanU, v.uTurn);
      let curPerp = v.perp * A.sm(vulcanU, 0.0, 0.14);
      let heading = mainAng;
      let fuel = A.clamp01(1 - (curU / v.uTurn) * 0.72);

      // Lưu vết đường bay vòng quay về của mỗi tanker để tạo sơ đồ chuỗi tiếp sức rõ ràng
      const [turnX, turnY] = atlanticPt(v.uTurn, v.perp);
      A.withA(c, appear * 0.55, () => {
        A.line(c, [ATLANTIC.ascension, [turnX, turnY]], P.slate, li, [A.px(c, 6), A.px(c, 6)]);
      });

      if (reached) {
        const retP = A.sm(vulcanU, v.uTurn, Math.min(1, v.uTurn + 0.26));
        curU = A.lerp(v.uTurn, 0.06, retP);
        // Mở rộng vòng cung khi quay đầu rồi khép về Ascension
        const arcOut = Math.sin(retP * Math.PI) * (v.perp > 0 ? 48 : -48);
        curPerp = A.lerp(v.perp, v.perp * 0.2, retP) + arcOut;
        heading = mainAng + Math.PI * A.sm(retP, 0, 0.25);
        fuel = A.lerp(0.28, 0.12, retP);
      }

      const [tx, ty] = atlanticPt(curU, curPerp);

      // Tia truyền nhiên liệu vàng (Handing fuel forward) sang máy bay bên trong khi ở giai đoạn tiếp dầu
      const refuelWin = A.win(t, v.tRefuel - 0.6, v.tRefuel + 1.8, 0.3, 0.3);
      if (refuelWin > 0.01 && !reached) {
        // Đích truyền xăng: chiếc Victor chặng trong hoặc chiếc Vulcan ở giữa
        const targetPerp = Math.abs(v.perp) > 75 ? v.perp * 0.45 : 0;
        const [rx, ry] = atlanticPt(curU + 0.03, targetPerp);
        A.line(c, [[tx, ty], [rx, ry]], P.ink, li * 1.1);
        for (let k = 0; k < 4; k++) {
          const uDot = ((k / 4 + t * 2.2) % 1 + 1) % 1;
          const dx = A.lerp(tx, rx, uDot);
          const dy = A.lerp(ty, ry, uDot);
          A.circle(c, dx, dy, A.px(c, 4.5), P.amber, P.ink, li * 0.5);
        }
      }

      // Vẽ chiếc Victor Tanker (scale vừa vặn để 11 chiếc không đè nhau trên bản đồ)
      A.withA(c, appear, () => {
        c.save();
        c.translate(tx, ty);
        c.rotate(heading);
        drawVictor(c, 'top', {
          scale: 0.42,
          hoseOut: refuelWin,
          fuelLevel: fuel,
        });
        c.restore();
      });
    });

    // 3. Vẽ chiếc Avro Vulcan chủ lực ở trục giữa — luôn được bơm đầy xăng qua mỗi chặng!
    const vulcanFuel =
      0.85 + 0.15 * Math.sin(t * 2.4) * A.clamp01(1 - A.ph(t, 34.8, 36.0));
    c.save();
    c.translate(vx, vy);
    c.rotate(mainAng);
    drawVulcan(c, 'top', { scale: 0.72, fuelLevel: vulcanFuel });
    c.restore();

    // Vòng nhấn "attached to the tip" quanh chiếc Vulcan ở mũi nhọn Falkland (39.5 – 41.96s)
    const tipP = A.sm(t, CUE.tanker_operation, CUE.attached_tip);
    if (tipP > 0.01) {
      A.circle(c, vx, vy, 54, 'rgba(245, 158, 11, 0.18)', P.amber, lo * 1.2);
    }

    K.end(c);

    // Callout duy nhất: "11 TANKERS" khi phóng đội hình từ Ascension (20.3 – 23.3s)
    const p11 = A.win(t, CUE.launched_11_victor - 0.15, 23.3, 0.25, 0.25);
    if (p11 > 0.01) {
      const [sx, sy] = K.toScreen(cam, -350, -245);
      UI.callout(c, '11 TANKERS', sx + 165, sy - 85, { to: [sx, sy], p: p11, color: P.slate });
    }
  }
}
