import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc11 (291.90–320.64s): Giới hạn đường chân trời radar (Radar Horizon) trên mặt cắt Trái Đất cong:
 * - 291.90–304.68s: Sóng đi thẳng, Trái Đất cong xuống -> máy bay bay thấp ẩn nấp dưới đường chân trời.
 * - 304.68–307.08s: Đặt radar lên cột cao (high mast) nhìn xa hơn.
 * - 307.08–312.46s: Đặt radar lên máy bay (AWACS) nhìn xa hơn rất nhiều.
 * - 312.46–320.64s: Chuỗi trạm bờ biển & quả đồi chắn sai chỗ tạo vùng mù lớn.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam: K.Cam = { x: 0, y: 10, z: 1.04 };
    K.begin(c, cam);

    // Tâm và bán kính đường cong Trái Đất
    const cx = 0, cy = 1520, R = 1320;
    const showHill = A.sm(t, CUE.ch4_hill_wrong_place - 0.4, CUE.ch4_hill_wrong_place + 0.5);

    M.drawCurvedEarthSide(c, cx, cy, R, {
      hillAngle: showHill > 0.01 ? -Math.PI / 2 - 0.08 : undefined,
      hillH: 95 * showHill,
    });

    // Vị trí đài radar gốc ở sườn trái quả địa cầu
    const rAng = -Math.PI / 2 - 0.34;
    const mastP = A.eio(t, CUE.ch4_high_mast - 0.3, CUE.ch4_high_mast + 0.8);
    const mastH = A.lerp(0, 125, mastP);

    const baseRx = cx + Math.cos(rAng) * R;
    const baseRy = cy + Math.sin(rAng) * R;
    const topRx = cx + Math.cos(rAng) * (R + mastH);
    const topRy = cy + Math.sin(rAng) * (R + mastH);

    // Cột cao nâng radar (khi t >= 304.68s)
    if (mastH > 2) {
      A.line(c, [[baseRx, baseRy], [topRx, topRy]], P.slate, A.px(c, 10));
      A.line(c, [[baseRx - 18, baseRy], [topRx, topRy]], P.ink, M.lwI(c));
      A.line(c, [[baseRx + 18, baseRy], [topRx, topRy]], P.ink, M.lwI(c));
    }

    // 1) Đường tiếp tuyến chân trời radar (Radar Horizon Line) và Vùng tối dưới chân trời (Shadow Zone)
    // Khi nâng cột cao (mastP), góc đường tiếp tuyến chúi xuống thấp hơn -> nhìn xa hơn!
    // Khi quả đồi mọc lên chắn ngang (showHill), tia bị hất ngược lên cao tạo vùng mù lớn sau đồi!
    const horizonSlope = A.lerp(0.04, 0.14, mastP) - 0.22 * showHill;
    const hStartX = topRx + 32;
    const hStartY = topRy - 65;
    const hEndX = 760;
    const hEndY = hStartY + (hEndX - hStartX) * horizonSlope;

    // Tô vùng tối (Shadow Zone) nằm dưới đường chân trời radar và trên mặt cong Trái Đất
    A.withA(c, 0.22, () => {
      c.beginPath();
      c.moveTo(hStartX + 260, hStartY + 260 * horizonSlope);
      c.lineTo(hEndX, hEndY);
      c.lineTo(hEndX, cy);
      c.arc(cx, cy, R, -Math.PI / 2 + 0.45, -Math.PI / 2 - 0.12, true);
      c.closePath();
      A.fs(c, P.dark, null, 0);
    });

    // Tia giới hạn đường chân trời
    A.line(c, [[hStartX, hStartY], [hEndX, hEndY]], P.amber, M.lwO(c), [14, 8]);

    // 2) Máy bay cảnh báo sớm trên không AWACS (307.08s): từ độ cao lớn chiếu chùm tia xóa sạch vùng mù dưới chân trời!
    const awacsA = A.sm(t, CUE.ch4_aircraft_radar - 0.2, CUE.ch4_aircraft_radar + 0.9);
    if (awacsA > 0.01) {
      A.withA(c, awacsA, () => {
        const awX = -120, awY = -285;
        A.withA(c, 0.2, () => {
          A.poly(
            c,
            [
              [awX, awY + 15],
              [120, 210],
              [680, 340],
            ],
            P.sky,
            null,
            0
          );
        });
        A.line(c, [[awX, awY + 15], [520, 225]], P.sky, M.lwO(c), [10, 8]);
        M.drawAwacsPlane(c, awX, awY, 'side', { scale: 1.32 });
      });
    }

    // 3) Chuỗi trạm radar bờ biển nối tiếp nhau (312.46s: "builds a chain of stations")
    const chainA = A.sm(t, CUE.ch4_chain_stations - 0.2, CUE.ch4_chain_stations + 0.9);
    if (chainA > 0.01) {
      A.withA(c, chainA, () => {
        for (const aOff of [-0.18, -0.02, 0.14]) {
          const ang = -Math.PI / 2 + aOff;
          const sx = cx + Math.cos(ang) * R;
          const sy = cy + Math.sin(ang) * R;
          M.drawGroundRadar(c, sx, sy, 'side', { scale: 0.9, dishAngle: -0.25, active: true });
        }
      });
    }

    // Đài radar chính bên trái
    c.save();
    c.translate(topRx, topRy);
    c.rotate(-0.28);
    M.drawGroundRadar(c, 0, 0, 'side', { scale: 1.4, dishAngle: -0.15, active: true });
    c.restore();

    // Máy bay đối phương bay thấp ôm theo độ cong Trái Đất bên dưới đường chân trời
    const jetOrbitP = A.ph(t, CUE.ch4_cannot_see_world, CUE.ch4_year_1940);
    const jAng = A.lerp(-Math.PI / 2 + 0.38, -Math.PI / 2 + 0.08, jetOrbitP);
    const jx = cx + Math.cos(jAng) * (R + 62);
    const jy = cy + Math.sin(jAng) * (R + 62);
    M.drawIntruderJet(c, jx, jy, 'side', {
      scale: 1.32,
      angle: jAng + Math.PI / 2,
    });

    K.end(c);
  }
}
