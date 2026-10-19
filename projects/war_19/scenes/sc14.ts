// scenes/sc14.ts — Chương 5, Shot 5.2 (418.70 – 457.90s)
// Góc SIDE Đối chiếu Hải vận vs. Không vận & Chiến trường đêm "Xe cứu hỏa 48 giờ":
// - Pha 1 (418.70–445.34s): Đối chiếu nuôi quân dài hạn bằng máy bay (ngốn nhiên liệu khổng lồ)
//   với 1 tàu chở hàng cỡ vừa (drawCargoShip) chở ngang hàng trăm chuyến C-17 với chi phí nhiên liệu tí hon.
// - Pha 2 (445.34–457.90s): Ban đêm, C-17 đóng vai "xe cứu hỏa" đổ bộ khẩn cấp xe tăng,
//   khẩu đội tên lửa phòng không (SAM phóng đạn đánh chặn) và đạn pháo giữ phòng tuyến chờ tàu biển tới.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawC17,
  drawCargoShip,
  drawTank,
  drawArmoredVehicle,
  drawPallet,
  drawSoldier,
  drawExplosion,
  drawGroundSide,
  drawCallout,
  lw,
} from './_assets';

const camCompare: K.Cam = { x: 0, y: -165, z: 1.05 };
const camFireEngine: K.Cam = { x: 0, y: -155, z: 1.08 };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const inFireEngine = t >= CUE.ch5_fire_engines - 0.1;

    let cam = inFireEngine ? camFireEngine : camCompare;
    cam = K.withShake(cam, t, [
      [CUE.ch5_enemy_shell1 + 0.25, 11, 0.35],
      [CUE.ch5_enemy_shell2 + 0.25, 11, 0.35],
      [CUE.ch5_friendly_fire + 0.2, 13, 0.4],
      [CUE.ch5_sam_hit, 14, 0.42],
    ]);

    A.clear(c, inFireEngine ? P.dark : P.bg);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    // ── PHA 1 (418.70 – 445.34s): Đối chiếu Cầu hàng không dài hạn vs. Tàu chở hàng cỡ vừa ──
    if (!inFireEngine) {
      // Mặt biển phía dưới (y = -20..220) và Lục địa/Bầu trời phía trên (y = -520..-20)
      A.rrect(c, -1200, -20, 2400, 320, 0, P.sky, P.ink, outW);
      A.withA(c, 0.35, () => {
        for (let wx = -750; wx <= 750; wx += 190) {
          A.line(c, [[wx, 25], [wx + 110, 25]], P.white, lw(c, 3.5));
          A.line(c, [[wx - 40, 75], [wx + 70, 75]], P.white, lw(c, 3.5));
        }
      });

      const showShipComp = t >= CUE.ch5_cargo_ship - 0.4;

      if (!showShipComp) {
        // Nửa đầu Pha 1 (418.70 – 437.30s): Dòng máy bay vận tải bay liên tục qua lục địa & Cột chi phí nhiên liệu
        A.line(c, [[-680, -260], [260, -260]], P.slate, lw(c, 3.5), [14, 10]);
        for (let i = 0; i < 4; i++) {
          const prog = ((t - CUE.ch5_mistake) * 0.22 + i * 0.25) % 1;
          const ax = A.lerp(-660, 240, prog);
          const ay = -260 - Math.sin(prog * Math.PI) * 65 - (i % 2) * 55;
          drawC17(c, ax, ay, { view: 'side', scale: 0.34, gearDown: 0, jetBlast: 0.8 });
        }

        // Bảng đo bên phải (x = 380..680): Cột FUEL BURN (MONTHS) tăng vọt màu đỏ vs. Đồng hồ 48 HOURS màu vàng
        A.rrect(c, 360, -430, 340, 340, 12, P.paper, P.ink, outW);
        const fuelBurn = A.eio(t, CUE.ch5_supply_war, CUE.ch5_worst_months + 2.5);
        const barH = A.lerp(35, 240, fuelBurn);
        A.rrect(c, 415, -135 - barH, 86, barH, 6, P.enemy, P.ink, outW);

        // Dấu gạch chéo đỏ khi nuôi quân hàng tháng trời (429.2s)
        const worstP = A.sm(t, CUE.ch5_worst_months, CUE.ch5_worst_months + 0.8);
        A.withA(c, worstP, () => {
          A.line(c, [[405, -385], [510, -135]], P.ink, lw(c, 6));
          A.line(c, [[510, -385], [405, -135]], P.ink, lw(c, 6));
        });

        // Huy hiệu cứu nguy khẩn cấp trong 48 GIỜ (434.3s)
        const save48P = A.sm(t, CUE.ch5_save_48h - 0.2, CUE.ch5_save_48h + 0.5);
        A.withA(c, save48P, () => {
          A.rrect(c, 545, -325, 125, 190, 10, P.amber, P.ink, outW);
          // Biểu tượng tia chớp khẩn cấp 48h
          A.poly(c, [[615, -300], [582, -230], [610, -230], [595, -165], [638, -245], [608, -245]], P.white, P.ink, inW);
        });
      } else {
        // Nửa sau Pha 1 (437.30 – 445.34s): HÀNG TRĂM CHUYẾN BAY C-17 trên trời vs. 1 TÀU CHỞ HÀNG CỠ VỪA dưới biển
        // Khung lưới 12 chiếc C-17 đại diện cho "Hundreds of C-17 sorties" ở tầng trời (y = -435..-215)
        A.rrect(c, -690, -455, 960, 235, 10, P.bg2, P.ink, inW);
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4; col++) {
            const cx = -560 + col * 215;
            const cy = -400 + row * 68;
            drawC17(c, cx, cy, { view: 'side', scale: 0.22, gearDown: 0, jetBlast: 0.6 });
          }
        }

        // Dưới mặt biển (y = -20): 1 chiếc tàu chở hàng cỡ vừa (Medium Cargo Ship) chở khối lượng hàng tương đương!
        const shipX = A.lerp(-240, -60, A.ph(t, CUE.ch5_cargo_ship - 0.4, 445.3));
        drawCargoShip(c, shipX, -15, { view: 'side', scale: 1.25 });

        // Cột so sánh Chi phí nhiên liệu bên phải (x = 340..680)
        const fracP = A.sm(t, CUE.ch5_fuel_fraction - 0.8, CUE.ch5_fuel_fraction + 0.5);
        A.rrect(c, 330, -455, 360, 420, 12, P.paper, P.ink, outW);
        // Cột nhiên liệu khổng lồ của Không vận (trên)
        const airFuelW = A.lerp(40, 280, A.eio(t, CUE.ch5_cargo_ship, CUE.ch5_cargo_ship + 2.5));
        A.rrect(c, 365, -365, airFuelW, 56, 6, P.enemy, P.ink, outW);
        // Cột nhiên liệu tí hon của Tàu biển (dưới)
        A.withA(c, fracP, () => {
          A.rrect(c, 365, -145, 28, 56, 4, P.sky, P.ink, outW);
        });
      }
    }

    // ── PHA 2 (445.34 – 457.90s): Chiến trường đêm — C-17 là "Xe cứu hỏa" đổ quân & SAM giữ phòng tuyến ──
    if (inFireEngine) {
      drawGroundSide(c, cam, 'night', 0);

      // Góc biển phía xa bên trái (x = -820..-460): Tàu chở hàng đang trên đường tiến vào bờ ("until the ships arrive")
      A.rrect(c, -900, -6, 420, 95, 0, P.sky, P.ink, inW);
      const shipArriveP = A.eio(t, CUE.ch5_shells_night, CUE.ch5_return_60t);
      drawCargoShip(c, A.lerp(-780, -585, shipArriveP), -6, { view: 'side', scale: 0.48 });

      // Chiếc C-17 "Xe cứu hỏa" số 1 đỗ trên đường băng tiền tuyến (x = -265, y = 0), mở cầu đuôi tung lực lượng
      drawC17(c, -265, 0, {
        view: 'cutaway',
        scale: 0.72,
        rampOpen: 1,
        apuGlow: 1,
      });
      // Đèn chớp cứu hỏa khẩn cấp màu vàng hổ phách trên lưng C-17
      const strobe = Math.abs(Math.sin(t * 12));
      A.withA(c, strobe * 0.85, () => {
        A.circle(c, -235, -142, 16, P.amber, P.white, inW);
      });

      // Chiếc C-17 số 2 bay hỗ trợ trên bầu trời đêm
      const airX = A.lerp(-620, 280, A.ph(t, CUE.ch5_fire_engines, CUE.ch5_return_60t));
      drawC17(c, airX, -345, { view: 'side', scale: 0.46, gearDown: 0, jetBlast: 0.9 });

      // 1. Lữ đoàn xe tăng & bộ binh ta (Brigade) lao ra từ cầu đuôi C-17 tới chốt giữ phòng tuyến (x = 95)
      const brigadeP = A.eio(t, CUE.ch5_fire_engines + 0.5, CUE.ch5_throw_brigade + 1.5);
      const tankX = A.lerp(-145, 95, brigadeP);
      const friendlyFlash = A.bump(t, CUE.ch5_friendly_fire, 0.35);
      drawTank(c, tankX, 0, { view: 'side', scale: 0.78, fireFlash: friendlyFlash });
      drawSoldier(c, tankX - 65, 0, { view: 'side', scale: 0.9, walkPhase: brigadeP < 1 ? t * 10 : 0 });
      drawSoldier(c, tankX - 92, 0, { view: 'side', scale: 0.9, walkPhase: brigadeP < 1 ? t * 10 + 1 : 0 });

      // 2. Khẩu đội tên lửa phòng không (SAM Battery) triển khai lúc 449.0s và phóng đạn đánh chặn lúc 452.10s
      const samEnter = A.eio(t, CUE.ch5_throw_brigade + 0.4, CUE.ch5_throw_brigade + 2.2);
      const samX = A.lerp(-195, -45, samEnter);
      const samFlash = A.bump(t, CUE.ch5_sam_launch, 0.4);
      A.withA(c, A.sm(t, CUE.ch5_throw_brigade, CUE.ch5_throw_brigade + 0.6), () => {
        drawArmoredVehicle(c, samX, 0, { kind: 'sam', view: 'side', scale: 0.78, fireFlash: samFlash });
      });

      // Quả tên lửa phòng không SAM bay lên tiêu diệt mục tiêu đường không của địch tại (265, -265)
      const samFly = A.ph(t, CUE.ch5_sam_launch, CUE.ch5_sam_hit);
      if (samFly > 0 && samFly < 1) {
        const mx = A.lerp(samX + 25, 265, samFly);
        const my = A.lerp(-58, -265, samFly);
        A.line(c, [[samX + 25, -58], [mx, my]], P.amber, lw(c, 4), [10, 5]);
        A.circle(c, mx, my, 8, P.white, P.amber, inW);
      }
      drawExplosion(c, 265, -265, A.ph(t, CUE.ch5_sam_hit, CUE.ch5_sam_hit + 1.1), 62);

      // 3. Kho đạn pháo khẩn cấp (Emergency stock of shells) dỡ xuống chân cầu đuôi lúc 452.84s
      const shellEnter = A.sm(t, CUE.ch5_shells_night - 0.3, CUE.ch5_shells_night + 0.8);
      A.withA(c, shellEnter, () => {
        drawPallet(c, -155, 0, 0.55);
        drawPallet(c, -215, 0, 0.55);
      });

      // Vạch phòng tuyến vững chắc (Hold the line @ x = 215)
      A.line(c, [[215, -210], [215, 10]], P.amber, lw(c, 5), [14, 8]);

      // Quân địch bên phải (x = 465, 625) tiến công và bắn pháo nhưng bị chặn đứng trước phòng tuyến
      const eFlash1 = A.bump(t, CUE.ch5_enemy_shell1, 0.35);
      const eFlash2 = A.bump(t, CUE.ch5_enemy_shell2, 0.35);
      drawTank(c, 465, 0, { view: 'side', scale: 0.78, flipX: true, fireFlash: eFlash1 });
      drawTank(c, 635, 0, { view: 'side', scale: 0.78, flipX: true, fireFlash: eFlash2 });

      // Các vụ nổ đạn pháo tại phòng tuyến và phản pháo trúng xe tăng địch
      drawExplosion(c, 215, -18, A.ph(t, CUE.ch5_enemy_shell1 + 0.2, CUE.ch5_enemy_shell1 + 1.1), 48);
      drawExplosion(c, 235, -12, A.ph(t, CUE.ch5_enemy_shell2 + 0.2, CUE.ch5_enemy_shell2 + 1.1), 48);
      drawExplosion(c, 445, -25, A.ph(t, CUE.ch5_friendly_fire + 0.18, CUE.ch5_friendly_fire + 1.15), 58);
    }

    K.end(c);

    // Callout tối thiểu: 48 HOURS, 1 SHIP = 100s SORTIES, và HOLD THE LINE
    const c48h = A.win(t, CUE.ch5_save_48h - 0.1, 437.3, 0.25, 0.25);
    drawCallout(c, cam, 608, -325, 0, -45, '48 HOURS', c48h, P.amber);

    const cShip = A.win(t, CUE.ch5_cargo_ship + 0.3, 445.1, 0.3, 0.25);
    drawCallout(c, cam, -120, -145, 0, -52, '1 SHIP = 100s SORTIES', cShip, P.sky);

    const cHold = A.win(t, CUE.ch5_fire_engines + 0.5, 457.6, 0.35, 0.3);
    drawCallout(c, cam, 215, -210, 0, -42, '48H FIRE ENGINE', cHold, P.amber);
  }
}
