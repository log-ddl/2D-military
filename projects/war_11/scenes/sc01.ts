import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import { drawBgSkyGrid, drawAsymmetricRotorTop, drawAirfoilCutaway, lw } from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Camera TOP-DOWN ôm trọn đĩa rotor + sóng nén ở mút cánh mà không bị cắt mép trên/dưới
    const camTrack: [number, K.Cam][] = [
      [0.0, { x: 14, y: 0, z: 1.56 }],
      [5.2, { x: 14, y: 0, z: 1.56 }],
      // Nhấn nhẹ vào nửa trên (Cánh tiến) nhưng vẫn giữ trọn mút cánh và sóng Mach trong khung
      [8.2, { x: 28, y: -28, z: 1.64 }],
      [15.8, { x: 28, y: -28, z: 1.64 }],
      // Dịch nhẹ xuống nửa dưới (Cánh lùi & vùng gốc)
      [17.6, { x: 24, y: 26, z: 1.64 }],
      [22.9, { x: 24, y: 26, z: 1.64 }],
      // Toàn cảnh đĩa rotor + 2 hộp mặt cắt cánh đối chiếu bên phải
      [24.4, { x: 95, y: 0, z: 1.50 }],
      [30.52, { x: 95, y: 0, z: 1.50 }],
    ];
    const cam = K.track(t, camTrack, A.eio);

    // Góc quay liên tục, mượt xuyên suốt cảnh (không nhảy góc)
    const rotA = mainRotorAngleAt(t);

    const advAlpha = A.sm(t, CUE.ch1_blade_nose - 0.3, CUE.ch1_blade_nose + 0.8);
    const sonicAlpha = A.sm(t, CUE.ch1_speed_of_sound - 0.6, CUE.ch1_speed_of_sound + 0.4);
    const retAlpha = A.sm(t, CUE.ch1_blade_tail - 0.2, CUE.ch1_blade_tail + 0.8);
    const rootAlpha = A.sm(t, CUE.ch1_almost_nothing_root - 0.6, CUE.ch1_almost_nothing_root + 0.4);
    const windP = A.sm(t, CUE.ch1_moves_forward - 0.5, CUE.ch1_moves_forward + 0.8);

    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Nền lưới trôi ngược sang trái để thể hiện trực thăng đang bay về phía trước (+x)
    const scrollX = -((t * 180 * (0.25 + 0.75 * windP)) % 120);
    drawBgSkyGrid(c, -1800 + scrollX, -1200, 3600, 2400, 120);

    // Mũi tên lớn chỉ hướng bay tới của cả trực thăng (bên phải mũi +x)
    if (windP > 0.01) {
      A.withA(c, windP, () => {
        A.capsule(c, [185, 0], [275, 0], 10, P.olive, P.ink, lo);
        A.poly(c, [[298, 0], [268, -18], [268, 18]], P.olive, P.ink, lo);
      });
    }

    // Vẽ trực thăng TOP-DOWN và đĩa rotor bất đối xứng
    drawAsymmetricRotorTop(c, {
      rotorAngle: rotA,
      advHighlight: advAlpha,
      retHighlight: retAlpha,
      sonicShock: sonicAlpha,
      rootStall: rootAlpha,
      showHeroBlade: true,
      forwardWindPhase: windP > 0.05 ? t * 0.85 : undefined,
    });

    // Minh họa trực quan cộng/trừ véc-tơ vận tốc ngay tại Cánh Tiến (nửa trên) và Cánh Lùi (nửa dưới)
    // 1. Cụm véc-tơ Cánh Tiến (y = -195): V_rotor (sang phải) + V_heli (sang phải) = V_tổng cực lớn (sát Mach 1 ở mút)
    const showPlusVec = A.win(t, CUE.ch1_rotor_speed - 0.3, CUE.ch1_blade_tail - 0.2, 0.4, 0.4);
    if (showPlusVec > 0.01) {
      const plusP = A.sm(t, CUE.ch1_plus_heli_speed - 0.2, CUE.ch1_plus_heli_speed + 0.6);
      A.withA(c, showPlusVec, () => {
        const vy = -185;
        // Thanh vận tốc quay của cánh (V_rotor)
        A.rrect(c, -95, vy - 10, 110, 20, 5, P.oliveLight, P.ink, li);
        // Thanh vận tốc tiến của trực thăng cộng thêm (V_heli)
        if (plusP > 0.01) {
          const addW = 78 * plusP;
          A.rrect(c, 18, vy - 10, addW, 20, 5, P.amber, P.ink, li);
          A.poly(c, [[18 + addW + 22, vy], [18 + addW, vy - 15], [18 + addW, vy + 15]], P.amber, P.ink, li);
          // Dấu '+' hình học giữa hai thanh véc-tơ
          A.rrect(c, 10, vy - 30, 16, 16, 4, P.paper, P.ink, li);
          A.line(c, [[14, vy - 22], [22, vy - 22]], P.ink, li);
          A.line(c, [[18, vy - 26], [18, vy - 18]], P.ink, li);
        }
      });
    }

    // 2. Cụm véc-tơ Cánh Lùi (y = +165): V_rotor (sang trái) - V_heli (sang phải) = gần bằng 0 ở vùng gốc
    const showMinusVec = A.win(t, CUE.ch1_blade_tail + 0.2, CUE.ch1_fly_fast - 0.3, 0.4, 0.4);
    if (showMinusVec > 0.01) {
      const minusP = A.sm(t, CUE.ch1_minus_heli_speed - 0.2, CUE.ch1_minus_heli_speed + 0.6);
      A.withA(c, showMinusVec, () => {
        const vy = 165;
        // Véc-tơ cánh quạt quét về đuôi (sang trái) bị cắt cụt bởi vận tốc tiến của trực thăng
        const remW = A.lerp(110, 32, minusP);
        A.rrect(c, -15 - remW, vy - 10, remW, 20, 5, P.sky, P.ink, li);
        A.poly(c, [[-15 - remW - 20, vy], [-15 - remW, vy - 14], [-15 - remW, vy + 14]], P.sky, P.ink, li);
        if (minusP > 0.01) {
          // Phần bị trừ đi (nét đứt mờ) + dấu '-' hình học
          A.rrect(c, -15, vy - 9, 78 * minusP, 18, 4, 'rgba(203,213,225,0.45)', P.slate, li);
          A.rrect(c, -23, vy - 30, 16, 16, 4, P.paper, P.ink, li);
          A.line(c, [[-19, vy - 22], [-11, vy - 22]], P.ink, li);
        }
      });
    }

    // 3. Ở đoạn "asks one wing to fly fast and the other to barely fly, and asks them to swap" (23.22-30.52s):
    // Hiển thị 2 khung mặt cắt cánh (Airfoil) nhỏ ở góc trên-phải (cánh tiến nhanh) và dưới-phải (cánh lùi chậm)
    const showCompareAirfoils = A.sm(t, 23.22, 24.20);
    if (showCompareAirfoils > 0.01) {
      A.withA(c, showCompareAirfoils, () => {
        // Hộp mặt cắt cánh tiến (trên)
        A.rrect(c, 290, -235, 195, 115, 10, P.paper, P.amber, lo);
        c.save();
        c.translate(388, -175);
        drawAirfoilCutaway(c, { aoaRad: 0.12, mode: 'transonic', flowPhase: t * 1.8, scale: 0.46 });
        c.restore();

        // Hộp mặt cắt cánh lùi (dưới)
        A.rrect(c, 290, 120, 195, 115, 10, P.paper, P.sky, lo);
        c.save();
        c.translate(388, 178);
        drawAirfoilCutaway(c, { aoaRad: 0.34, mode: 'stall', flowPhase: t * 0.35, scale: 0.46 });
        c.restore();

        // Hai mũi tên cong nối hai hộp biểu thị sự tráo đổi (swap) mỗi nửa vòng quay
        const swapP = A.sm(t, CUE.ch1_swap - 0.3, CUE.ch1_swap + 0.5);
        if (swapP > 0.01) {
          A.withA(c, swapP, () => {
            A.line(c, [[388, -112], [368, 0], [388, 112]], P.ink, lw(c, 3.5), [10, 6]);
            A.poly(c, [[388, -118], [378, -100], [396, -102]], P.amber, P.ink, li);
            A.poly(c, [[388, 118], [378, 100], [396, 102]], P.sky, P.ink, li);
          });
        }
      });
    }

    K.end(c);
  }
}
