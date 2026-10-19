// scenes/sc02.ts — Chương 1, Shot 1.3 (33.24 – 58.68s)
// Đối chiếu trực diện (SIDE Profile Comparison): Vì sao không quân từ chối dùng máy bay dân dụng sơn lại
// mà mọi vận tải cơ quân sự đều mang cùng một hình dáng kỳ cục (cánh trên nóc, bụng phệ sát đất, đuôi vểnh cao)?
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { drawB747, drawC17, drawGroundSide, lw } from './_assets';

const camStart: K.Cam = { x: 0, y: -155, z: 1.55 };
const camFocusC17: K.Cam = { x: -15, y: -142, z: 1.72 };
const camDragCompare: K.Cam = { x: 0, y: -175, z: 1.50 };

const camTrack: [number, K.Cam][] = [
  [33.24, camStart],
  [38.50, camFocusC17],
  [54.20, camFocusC17],
  [56.00, camDragCompare],
  [58.68, camDragCompare],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(t, camTrack, A.eio);
    A.clear(c, P.bg);
    K.begin(c, cam);

    drawGroundSide(c, cam, 'dirt', 0);

    // 1. Giai đoạn 33.24–41.60s: Máy bay dân sự lùi lên cao thành bóng đối chiếu, nhường chỗ cho C-17
    const shiftUp = A.eio(t, 36.2, 39.8);
    const b747Y = A.lerp(0, -165, shiftUp);
    const b747Scale = A.lerp(0.88, 0.56, shiftUp);
    const b747Alpha = A.lerp(0.85, 0.42, shiftUp);
    const b747X = A.lerp(35, 65 + Math.max(0, t - CUE.ch1_drag_fuel) * 28, shiftUp);

    drawB747(c, b747X, b747Y, {
      view: 'side',
      scale: b747Scale,
      alpha: b747Alpha,
    });

    // Dấu gạch bỏ chiếc máy bay dân dụng sơn lại ở 35.0–39.0s
    const rejectAlpha = A.win(t, 34.8, 39.2, 0.3, 0.4);
    A.withA(c, rejectAlpha, () => {
      A.line(c, [[-180, -230], [220, -70]], P.enemy, lw(c, 6));
      A.line(c, [[220, -230], [-180, -70]], P.enemy, lw(c, 6));
    });

    // 2. Chiếc vận tải cơ quân sự C-17 lăn vào chiếm vị trí chủ đạo (chiếm ~80% ngang khung)
    const c17Enter = A.eo(t, 36.2, 40.8);
    const c17X = A.lerp(-920, -15, c17Enter);

    // Chuyển giao màu nhấn tuần tự (sequential highlight transfer) qua 3 bộ phận kỳ dị theo lời đọc:
    // - "wings bolted to the roof" @ 49.66
    // - "a fat belly scraping the concrete" @ 51.60
    // - "and an upswept tail" @ 53.40
    const hiWing = A.win(t, CUE.ch1_wings_roof - 0.2, CUE.ch1_fat_belly + 0.4, 0.35, 0.45)
      + 0.35 * A.sm(t, CUE.ch1_fat_belly + 0.4, CUE.ch1_upswept_tail);
    const hiBelly = A.win(t, CUE.ch1_fat_belly - 0.2, CUE.ch1_upswept_tail + 0.4, 0.35, 0.45)
      + 0.35 * A.sm(t, CUE.ch1_upswept_tail + 0.4, CUE.ch1_drag_fuel);
    const hiTail = A.win(t, CUE.ch1_upswept_tail - 0.2, CUE.ch1_drag_fuel + 0.8, 0.35, 0.45);

    drawC17(c, c17X, 0, {
      view: 'side',
      scale: 1.05,
      hiWing: A.clamp01(hiWing),
      hiBelly: A.clamp01(hiBelly),
      hiPods: A.clamp01(hiBelly),
      hiTail: A.clamp01(hiTail),
      hiRamp: A.clamp01(hiTail),
      jetBlast: A.sm(t, 36.5, 40.0) * 0.6,
    });

    // 3. Các ký hiệu giải phẫu trực quan khi điểm danh 3 đặc điểm hình dáng (49.66–58.68s)
    // (a) Chốt bắt cánh trên nóc (roof wing bolts)
    A.withA(c, A.sm(t, CUE.ch1_wings_roof - 0.2, CUE.ch1_wings_roof + 0.4), () => {
      for (const bx of [-35, 15, 65]) {
        A.line(c, [[c17X + bx, -228], [c17X + bx, -192]], P.amber, lw(c, 4));
        A.poly(c, [
          [c17X + bx, -186], [c17X + bx - 7, -200], [c17X + bx + 7, -200],
        ], P.amber, P.ink, lw(c, 2));
      }
    });

    // (b) Bụng phệ sát mặt đất (fat belly scraping concrete)
    A.withA(c, A.sm(t, CUE.ch1_fat_belly - 0.2, CUE.ch1_fat_belly + 0.4), () => {
      A.line(c, [[c17X - 165, -45], [c17X + 210, -45]], P.amber, lw(c, 4), [10, 6]);
      for (const gx of [-110, 25, 145]) {
        A.line(c, [[c17X + gx, -42], [c17X + gx, -4]], P.amber, lw(c, 3.5));
      }
    });

    // (c) Đuôi vểnh ngược lên cao (upswept tail)
    A.withA(c, A.sm(t, CUE.ch1_upswept_tail - 0.2, CUE.ch1_upswept_tail + 0.4), () => {
      A.line(c, [[c17X - 265, -42], [c17X - 420, -142]], P.amber, lw(c, 5));
      A.poly(c, [
        [c17X - 428, -148], [c17X - 406, -144], [c17X - 418, -128],
      ], P.amber, P.ink, lw(c, 2));
    });

    // 4. Giai đoạn 54.66–58.68s: Sức cản không khí lớn & tốn nhiên liệu hơn máy bay thương mại
    const dragAlpha = A.sm(t, CUE.ch1_drag_fuel, CUE.ch1_drag_fuel + 0.6);
    A.withA(c, dragAlpha, () => {
      const flowShift = ((t - CUE.ch1_drag_fuel) * 240) % 90;
      for (const ly of [-175, -135, -95]) {
        A.line(c, [
          [c17X + 430 - flowShift, ly],
          [c17X + 355 - flowShift * 0.3, ly],
        ], P.enemy, lw(c, 3.5), [14, 8]);
      }
      // Thanh so sánh mức tiêu hao nhiên liệu đặt thoáng phía trước mũi
      const fuelDrop = A.ph(t, CUE.ch1_drag_fuel, 58.5);
      A.rrect(c, c17X + 435, -172, 24, 110, 4, P.paper, P.ink, lw(c, LINE.inner));
      const fillH = A.lerp(98, 28, fuelDrop);
      A.rrect(c, c17X + 439, -66 - fillH, 16, fillH, 2, P.amber, null, 0);
    });

    K.end(c);
  }
}
