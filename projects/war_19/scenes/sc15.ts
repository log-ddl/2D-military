// scenes/sc15.ts — Chương 5, Shot 5.3 (457.90 – 482.22s)
// Góc SIDE Cutaway Callback & Kết luận Toàn phim:
// - 457.90–463.52s: Quay lại chiếc xe tăng 60 tấn nằm trong lòng khoang như nhà kho biết bay.
// - 463.52–476.12s: Lần lượt 5 nét thiết kế dị biệt sáng rực màu P.amber khớp lời thoại:
//   (1) Cánh trên nóc (wing on the roof @ 466.08s)
//   (2) Bầu bánh xe hai bên má (podded wheels in the cheeks @ 467.35s)
//   (3) Sàn dầm cầu (bridge beam floor @ 468.90s)
//   (4) Cánh tà thổi (blown flaps @ 470.20s)
//   (5) Cầu dẫn ở đuôi (ramp in the tail @ 471.15s)
// - 476.38–482.22s: Máy bay dân sự nối những thành phố sẵn sàng đón nó vs. Vận tải cơ quân sự
//   "mang theo cả sân bay bên mình" (tự mở cầu, tự phát điện, hạ xe tăng 60T xuống đất hoang).
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch5StateAt } from './_state';
import {
  drawC17,
  drawB747,
  drawTank,
  drawScissorLift,
  drawSoldier,
  drawGroundSide,
  drawCallout,
  lw,
} from './_assets';

const camCutaway: K.Cam = { x: -15, y: -115, z: 1.38 };
const camFinale: K.Cam = { x: 0, y: -175, z: 1.06 };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = ch5StateAt(t);
    const pullBack = A.eio(t, CUE.ch5_airliner_cities - 0.3, CUE.ch5_airliner_cities + 0.9);
    const cam: K.Cam = {
      x: A.lerp(camCutaway.x, camFinale.x, pullBack),
      y: A.lerp(camCutaway.y, camFinale.y, pullBack),
      z: A.lerp(camCutaway.z, camFinale.z, pullBack),
    };

    A.clear(c, P.bg);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    // Mặt đất hoang sơ không có đường băng bê tông hay xe nâng
    drawGroundSide(c, cam, 'dirt', 0);

    // ── Tầng trên (476.38 – 482.22s): Máy bay dân sự nối 2 thành phố văn minh có sẵn tháp đài & xe nâng ──
    const cityAlpha = A.sm(t, CUE.ch5_airliner_cities - 0.1, CUE.ch5_airliner_cities + 0.6);
    A.withA(c, cityAlpha, () => {
      // Khung nền tầng thành phố văn minh phía trên (y = -415..-235)
      A.rrect(c, -740, -425, 1480, 175, 10, P.bg2, P.slate, inW);
      // Thành phố A (trái: nhà ga + tháp kiểm soát không lưu + xe nâng cắt kéo)
      A.rrect(c, -690, -355, 130, 105, 4, P.paper, P.ink, inW);
      A.rrect(c, -545, -405, 32, 155, 3, P.slate, P.ink, inW);
      A.poly(c, [[-555, -405], [-548, -422], [-510, -422], [-503, -405]], P.sky, P.ink, inW);
      drawScissorLift(c, -455, -250, { scale: 0.42, lift: 0.75 });

      // Thành phố B (phải: nhà ga + tháp kiểm soát không lưu + xe nâng cắt kéo)
      A.rrect(c, 560, -355, 130, 105, 4, P.paper, P.ink, inW);
      A.rrect(c, 513, -405, 32, 155, 3, P.slate, P.ink, inW);
      A.poly(c, [[503, -405], [510, -422], [548, -422], [555, -405]], P.sky, P.ink, inW);
      drawScissorLift(c, 455, -250, { scale: 0.42, lift: 0.75 });

      // Đường bay nối 2 thành phố & chiếc Boeing 747 dân sự
      A.line(c, [[-390, -325], [390, -325]], P.slate, lw(c, 3.5), [12, 8]);
      const airP = A.eio(t, CUE.ch5_airliner_cities, 481.5);
      drawB747(c, A.lerp(-240, 240, airP), -275, { view: 'side', scale: 0.44 });
    });

    // ── Trung tâm mặt đất: Vận tải cơ C-17 & Chiếc xe tăng 60 tấn trong lòng khoang ──
    const rampP = Math.max(
      A.eio(t, CUE.ch5_hi_ramp - 0.1, CUE.ch5_hi_ramp + 0.7),
      A.sm(t, CUE.ch5_brings_airport - 0.3, CUE.ch5_brings_airport + 0.3)
    );
    const flapP = A.eio(t, CUE.ch5_hi_flaps - 0.1, CUE.ch5_hi_flaps + 0.7);
    const apuP = A.sm(t, CUE.ch5_brings_airport - 0.2, CUE.ch5_brings_airport + 0.5);

    drawC17(c, 35, 0, {
      view: 'cutaway',
      scale: 1.12,
      rampOpen: rampP,
      flapAngle: flapP * 0.75,
      hiWing: st.hiWing,
      hiGearPod: st.hiCheeks,
      hiFloor: st.hiFloor,
      hiFlaps: st.hiFlaps,
      hiRamp: st.hiRamp,
      apuGlow: apuP,
      winchCable: 0,
    });

    // Chiếc xe tăng 60 tấn: từ 457.90s đến 479.16s nằm vững chãi trên sàn dầm cầu trong khoang;
    // từ 479.16s ("A military transport brings the airport with it") tự lăn qua cầu đuôi xuống đất hoang!
    const rollOut = A.eio(t, CUE.ch5_brings_airport, 481.4);
    let tankX = 15;
    let tankY = -49;
    let tankPitch = 0;

    if (rollOut > 0.01) {
      if (rollOut < 0.45) {
        const u = rollOut / 0.45;
        tankX = A.lerp(15, -185, u);
        tankY = -49;
      } else if (rollOut < 0.82) {
        const u = (rollOut - 0.45) / 0.37;
        tankX = A.lerp(-185, -345, u);
        tankY = A.lerp(-49, -6, u);
        tankPitch = -0.18 * Math.sin(u * Math.PI);
      } else {
        const u = (rollOut - 0.82) / 0.18;
        tankX = A.lerp(-345, -455, u);
        tankY = 0;
      }
    }

    drawTank(c, tankX, tankY, {
      view: 'side',
      scale: 0.92,
      flipX: rollOut > 0.01, // Quay mũi lăn xuống cầu đuôi ở cảnh kết
      pitch: tankPitch,
      hiFootprint: st.hiFloor,
    });

    // Khi vận tải cơ "mang theo cả sân bay bên mình" (479.16s), kíp loadmaster và lính dù đứng sẵn dưới chân cầu dẫn
    A.withA(c, apuP, () => {
      drawSoldier(c, -235, 0, { view: 'side', scale: 0.95, color: P.amber });
      drawSoldier(c, 365, 0, { view: 'side', scale: 0.95 });
    });

    K.end(c);

    // Callout tối thiểu: 60T (458.5–465.5s) và BRINGS THE AIRPORT (479.2–482.22s)
    const c60t = A.win(t, CUE.ch5_return_60t + 0.5, 465.5, 0.35, 0.35);
    drawCallout(c, cam, 15, -135, 0, -48, '60T', c60t, P.amber);

    const cAirport = A.sm(t, CUE.ch5_brings_airport + 0.1, CUE.ch5_brings_airport + 0.6);
    drawCallout(c, cam, 35, -235, 0, -44, 'BRINGS THE AIRPORT WITH IT', cAirport, P.amber);
  }
}
