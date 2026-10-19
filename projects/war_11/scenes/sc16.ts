// scenes/sc16.ts — Chương 6, Cảnh 16 (427.84 - 452.40s): Định nghĩa lại Trực thăng — "Chiếc Xe Tải Biết Bay" không cần đường băng
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import {
  lw,
  drawArrow,
  drawBgSkyGrid,
  drawBgMountainValley,
  drawHeli,
  drawFixedWingPlane,
  drawMilitaryTruck,
} from './_assets';

export default class extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const rotorA = mainRotorAngleAt(t);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Chuyển từ Giai đoạn 1 (427.84 - 437.2s: So sánh Trực thăng ≠ Máy bay, Trực thăng ≈ Xe tải)
    // sang Giai đoạn 2 (437.2 - 452.40s: Đáp xuống một mỏm đá hẹp giữa địa hình hiểm trở không cần đường băng)
    const missionP = A.eio(t, CUE.ch6_not_cross_sky - 0.3, CUE.ch6_not_cross_sky + 1.5);
    const camX = A.lerp(0, 120, missionP);
    const camY = A.lerp(15, 5, missionP);
    const camZ = A.lerp(1.08, 1.06, missionP);

    K.begin(c, { x: camX, y: camY, z: camZ });

    drawBgSkyGrid(c);
    const groundY = 230;
    drawBgMountainValley(c, groundY, false);

    // =========================================================================
    // 1. GIAI ĐOẠN 1 (427.84 - 438.0s): BÁC BỎ "MÁY BAY VỤNG VỀ" -> ĐỒNG NHẤT VỚI "XE TẢI"
    // =========================================================================
    const compAlpha = 1 - missionP;
    if (compAlpha > 0.01) {
      const truckSwapP = A.eio(t, CUE.ch6_closer_to_truck - 1.2, CUE.ch6_closer_to_truck + 0.4);

      A.withA(c, compAlpha, () => {
        // Mặt đường cho xe tải chạy bên dưới
        A.rrect(c, -850, groundY, 1700, 46, 0, P.light, P.ink, lo);

        // Khung so sánh bên phải (x = 250):
        // - Trước 433.4s: Máy bay cánh bằng bị gạch dấu ≠ đỏ ("slow, clumsy plane")
        // - Từ 433.4s: Xe tải quân sự chở hàng chạy song hành với dấu ≈ vàng ("closer to a truck... that happens to fly")
        if (truckSwapP < 0.99) {
          A.withA(c, 1 - truckSwapP, () => {
            c.save();
            c.translate(255, -35);
            drawFixedWingPlane(c, 'side', 0.96);
            c.restore();

            // Vòng tròn dấu ≠ lớn ở giữa (x = 10, y = -35)
            A.circle(c, 10, -35, 38, P.paper, P.enemy, lo);
            A.line(c, [[-12, -43], [32, -43]], P.enemy, lw(c, 4));
            A.line(c, [[-12, -27], [32, -27]], P.enemy, lw(c, 4));
            A.line(c, [[-4, -55], [24, -15]], P.enemy, lw(c, 4));
          });
        }

        if (truckSwapP > 0.01) {
          A.withA(c, truckSwapP, () => {
            const truckX = A.lerp(420, 235, truckSwapP);
            c.save();
            c.translate(truckX, groundY - 52);
            drawMilitaryTruck(c, 'side', 1.38);
            c.restore();

            // Dấu tương đương công năng ≈ nối giữa Trực thăng chở hàng và Xe tải chở hàng
            A.line(c, [[-210, 45], [truckX - 25, groundY - 82]], P.amber, lw(c, 2.8), [10, 7]);
            A.circle(c, 15, 55, 42, P.paper, P.amber, lo);
            A.line(c, [[-8, 46], [38, 46]], P.amber, lw(c, 4.5));
            A.line(c, [[-8, 64], [38, 64]], P.amber, lw(c, 4.5));
          });
        }
      });
    }

    // =========================================================================
    // 2. GIAI ĐOẠN 2 (436.78 - 452.40s): ĐẾN ĐÚNG MỘT MỎM ĐẤT HẸP KHÔNG CẦN ĐƯỜNG BĂNG
    // =========================================================================
    if (missionP > 0.01) {
      A.withA(c, missionP, () => {
        // Bờ vực & Khe sông hiểm trở bên dưới (cắt đứt đường giao thông bộ và không có chỗ làm đường băng)
        A.rrect(c, -220, groundY, 390, 62, 0, P.skyLight, P.sky, lo);

        // Biểu tượng Đường băng dài ở góc trái dưới bị gạch bỏ ("without a runway" @ 443.46s)
        const noRunwayP = A.eio(t, CUE.ch6_without_runway - 0.6, CUE.ch6_without_runway + 0.6);
        if (noRunwayP > 0.01) {
          A.withA(c, noRunwayP, () => {
            const rx = -245;
            const ry = 145;
            A.rrect(c, rx - 155, ry - 26, 310, 52, 8, P.light, P.ink, lo);
            A.line(c, [[rx - 135, ry], [rx + 135, ry]], P.paper, lw(c, 3), [18, 14]);
            // Dấu gạch chéo đỏ bác bỏ sự phụ thuộc vào đường băng
            A.line(c, [[rx - 140, ry - 22], [rx + 140, ry + 22]], P.enemy, lw(c, 4));
            A.line(c, [[rx + 140, ry - 22], [rx - 140, ry + 22]], P.enemy, lw(c, 4));
          });
        }

        // Mỏm đá cao hiểm trở bên phải (x = 340, đỉnh phẳng nhỏ ở y = 62 chỉ rộng đúng 220px)
        const ledgeY = 62;

        A.poly(
          c,
          [
            [145, groundY],
            [225, ledgeY],
            [455, ledgeY],
            [545, groundY],
          ],
          '#cfc4ae',
          P.ink,
          lo
        );
        A.line(c, [[205, 140], [475, 140]], P.ink2, li, [16, 12]);

        // Vạch đánh dấu "Một mảnh đất cụ thể" (one specific piece of ground) trên đỉnh mỏm đá
        A.rrect(c, 232, ledgeY - 8, 216, 10, 3, P.amber, P.ink, li);

        // Thước đo khoảng đất tối thiểu cần thiết ("how little it needs from the ground" @ 450.74s)
        const littleP = A.eio(t, CUE.ch6_not_how_fast - 0.4, CUE.ch6_how_little_ground + 0.8);
        if (littleP > 0.01) {
          A.withA(c, littleP, () => {
            A.line(c, [[232, ledgeY + 18], [232, ledgeY + 52]], P.amber, lw(c, 2.8));
            A.line(c, [[448, ledgeY + 18], [448, ledgeY + 52]], P.amber, lw(c, 2.8));
            drawArrow(c, [180, ledgeY + 36], [230, ledgeY + 36], P.amber, lw(c, 3), 9);
            drawArrow(c, [500, ledgeY + 36], [450, ledgeY + 36], P.amber, lw(c, 3), 9);
          });
        }
      });
    }

    // =========================================================================
    // 3. TRỰC THĂNG CHỦ ĐẠO: TỪ BAY SONG HÀNH XE TẢI -> ĐÁP CHÍNH XÁC LÊN MỎM ĐÁ HẸP
    // =========================================================================
    const landP = A.eio(t, CUE.ch6_arrive_specific_ground - 0.5, CUE.ch6_without_runway + 1.2);
    const heliX = A.lerp(-225, 340, landP);
    // Khi đáp xuống mỏm đá y = 62, bánh xe ở +82*scale (scale=0.96 -> +79) chạm đúng mặt đá khi heliY = 62 - 79 = -17
    const hoverY = -42 + Math.sin(t * 2.8) * 3.5 * (1 - landP);
    const heliY = A.lerp(hoverY, -17, A.eio(t, CUE.ch6_without_runway - 0.8, CUE.ch6_without_runway + 1.4));
    const flare = A.bump(t, CUE.ch6_arrive_specific_ground, 3.2) * 0.1;

    c.save();
    c.translate(heliX, heliY);
    c.rotate(flare);
    drawHeli(c, {
      view: 'side',
      scale: 0.96,
      rotorAngle: rotorA,
      collectivePitch: 0.52,
      slingLoad: 1 - missionP * 0.9,
      loadFrac: 1.0,
    });
    c.restore();

    K.end(c);
  }
}
