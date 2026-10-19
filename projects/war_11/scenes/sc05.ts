import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import { drawBgSkyGrid, drawBgAirfield, drawTandemHeli, drawCoaxialHeli, drawHeli, lw } from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const rotA = mainRotorAngleAt(t);

    // Chia 2 giai đoạn góc nhìn rõ ràng:
    // - Pha A (107.08 -> 116.48s): Góc TOP-DOWN cho thấy 2 đĩa rotor chính quay ngược chiều nhau tự triệt tiêu mô-men xoắn về 0
    // - Pha B (116.48 -> 143.46s): Góc SIDE đối chiếu trực quan 3 cấu hình: Tandem (-480), Coaxial (+120), và Single-rotor (+680)
    if (t < CUE.ch2_tandem_version) {
      const cam: K.Cam = { x: 0, y: 0, z: 1.55 };
      K.begin(c, cam);
      const lo = lw(c, LINE.outer);
      const li = lw(c, LINE.inner);

      drawBgSkyGrid(c, -1600, -1000, 3200, 2000, 110);

      // Hai đĩa rotor đặt đối xứng quay ngược chiều nhau (+rotA và -rotA)
      const sep = A.lerp(220, 145, A.eio(t, CUE.ch2_two_rotors_opposite, CUE.ch2_twisting_cancel + 0.8));
      for (const [dir, col, arcCol] of [[-1, P.oliveLight, P.amber], [1, P.oliveLight, P.sky]] as const) {
        const rx = dir * sep;
        c.save();
        c.translate(rx, 0);
        A.circle(c, 0, 0, 175, 'rgba(255,255,255,0.55)', col, li);
        // Vòng cung chỉ chiều quay ngược nhau
        c.beginPath();
        c.arc(0, 0, 192, -Math.PI * 0.72, -Math.PI * 0.28);
        c.strokeStyle = arcCol;
        c.lineWidth = lw(c, 5.5);
        c.stroke();
        const tipAngle = dir > 0 ? -Math.PI * 0.28 : -Math.PI * 0.72;
        const ax = Math.cos(tipAngle) * 192;
        const ay = Math.sin(tipAngle) * 192;
        A.circle(c, ax, ay, 8, arcCol, P.ink, li);

        for (let i = 0; i < 3; i++) {
          const a = -dir * rotA + (i * Math.PI * 2) / 3;
          c.save();
          c.rotate(a);
          A.rrect(c, 12, -9, 158, 18, 4, col, P.ink, lo);
          A.rrect(c, 146, -9, 20, 18, 2, arcCol, P.ink, li);
          c.restore();
        }
        A.circle(c, 0, 0, 18, P.dark, P.ink, lo);
        c.restore();
      }

      // Hai mũi tên mô-men xoắn ở tâm đối đầu và triệt tiêu nhau (twisting forces cancel)
      const cancelP = A.sm(t, CUE.ch2_twisting_cancel - 0.4, CUE.ch2_twisting_cancel + 0.6);
      if (cancelP > 0.01) {
        A.withA(c, cancelP, () => {
          A.capsule(c, [-95, -245], [-16, -245], 9, P.amber, P.ink, li);
          A.poly(c, [[-4, -245], [-22, -257], [-22, -233]], P.amber, P.ink, li);
          A.capsule(c, [95, -245], [16, -245], 9, P.sky, P.ink, li);
          A.poly(c, [[4, -245], [22, -257], [22, -233]], P.sky, P.ink, li);
          // Vòng cân bằng = 0 ở giữa
          A.circle(c, 0, -245, 16, P.paper, P.ink, lo);
          A.circle(c, 0, -245, 6, P.olive, P.ink, li);
        });
      }

      K.end(c);
      return;
    }

    // Pha B (116.48 -> 143.46s): Góc SIDE đối chiếu Tandem (-540), Coaxial (40), và Single-rotor (620)
    const camTrack: [number, K.Cam][] = [
      // Cận vừa chiếc Tandem (Chinook) ở x = -540
      [116.48, { x: -540, y: 15, z: 1.62 }],
      [126.80, { x: -540, y: 15, z: 1.62 }],
      // Lia sang chiếc Coaxial (Ka-52) ở x = 40
      [128.30, { x: 40, y: -20, z: 1.68 }],
      [135.10, { x: 40, y: -55, z: 1.62 }],
      // Lùi ra thấy trọn cả 3 cấu hình ("Each is a different bargain") rồi nhấn vào chiếc Single-rotor phổ biến
      [136.60, { x: 40, y: -15, z: 1.05 }],
      [139.20, { x: 40, y: -15, z: 1.05 }],
      [141.00, { x: 540, y: -20, z: 1.38 }],
      [143.46, { x: 540, y: -20, z: 1.38 }],
    ];
    const cam = K.track(t, camTrack, A.eio);

    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);
    const groundY = 235;

    drawBgAirfield(c, groundY, -1800, 1800);

    // --- 1. TANDEM HELICOPTER (x = -540): Khoang dài, cẩu hàng nặng cân bằng ---
    const tandemY = A.lerp(20, -15, A.eio(t, 117.0, 121.0)) + Math.sin(t * 2.2) * 3;
    const showHookLoad = A.sm(t, CUE.ch2_long_cabin + 0.5, CUE.ch2_heavy_hung_hook);
    c.save();
    c.translate(-540, tandemY);
    drawTandemHeli(c, 'side', rotA, showHookLoad > 0.1);
    // Hai mũi tên lực nâng ở đầu mũi và đuôi giữ thanh thăng bằng ngang tuyệt đối
    if (t < 128.0) {
      const balP = A.sm(t, CUE.ch2_long_cabin - 0.3, CUE.ch2_long_cabin + 0.6);
      A.withA(c, balP, () => {
        A.line(c, [[-135, 2], [135, 2]], P.amber, lw(c, 4), [12, 8]);
        for (const lx of [-136, 118]) {
          A.capsule(c, [lx, -85], [lx, -138], 8, P.amber, P.ink, li);
          A.poly(c, [[lx, -154], [lx - 12, -134], [lx + 12, -134]], P.amber, P.ink, li);
        }
      });
    }
    c.restore();

    // --- 2. COAXIAL HELICOPTER (x = 40): 2 tầng đồng trục, cực gọn, không tail rotor, leo vọt thẳng đứng ---
    const coaxShow = A.sm(t, CUE.ch2_coaxial_version - 0.4, CUE.ch2_coaxial_version + 0.4);
    if (coaxShow > 0.01) {
      const climbP = A.eio(t, CUE.ch2_no_tail_climb + 0.6, CUE.ch2_no_tail_climb + 2.0);
      const coaxY = A.lerp(25, -95, climbP) + Math.sin(t * 2.8 + 1) * 3;
      A.withA(c, coaxShow, () => {
        c.save();
        c.translate(40, coaxY);
        drawCoaxialHeli(c, 'side', rotA);
        // Khung đo độ gọn (compact) và mũi tên leo vọt thẳng đứng
        const compactAlpha = A.win(t, CUE.ch2_compact_machine - 0.5, CUE.ch2_different_bargain + 0.2, 0.3, 0.4);
        if (compactAlpha > 0.01) {
          A.withA(c, compactAlpha, () => {
            A.line(c, [[-175, -65], [-175, 55]], P.sky, lw(c, 3.5), [8, 6]);
            A.line(c, [[130, -65], [130, 55]], P.sky, lw(c, 3.5), [8, 6]);
            if (climbP > 0.05) {
              A.capsule(c, [0, 85], [0, 165], 9, P.amber, P.ink, li);
              A.poly(c, [[0, 65], [-14, 88], [14, 88]], P.amber, P.ink, lo);
            }
          });
        }
        c.restore();
      });
    }

    // --- 3. ORDINARY SINGLE-ROTOR HELICOPTER (x = 620): Rẻ nhất, phổ biến nhất trong đội bay thế giới ---
    const singleShow = A.sm(t, CUE.ch2_different_bargain - 0.3, CUE.ch2_ordinary_single + 0.4);
    if (singleShow > 0.01) {
      A.withA(c, singleShow, () => {
        // Đội bay nhiều chiếc trực thăng 1 rotor ở lớp xa (most of the world's fleets)
        const fleetP = A.sm(t, CUE.ch2_cheapest_common + 0.4, CUE.ch2_worlds_fleets);
        if (fleetP > 0.01) {
          A.withA(c, fleetP * 0.78, () => {
            for (const [fx, fy, fs] of [[370, -145, 0.48], [540, -175, 0.44], [770, -135, 0.50], [880, -45, 0.54]] as const) {
              c.save();
              c.translate(fx, fy);
              drawHeli(c, { view: 'side', scale: fs, rotorAngle: rotA + fx });
              c.restore();
            }
          });
        }

        // Chiếc Single-rotor chính ở tiền cảnh
        c.save();
        c.translate(620, 15 + Math.sin(t * 2.5) * 3);
        drawHeli(c, {
          view: 'side',
          rotorAngle: rotA,
          showGearboxCutaway: true,
          powerFlow: 0.9,
        });
        c.restore();
      });
    }

    K.end(c);
  }
}
