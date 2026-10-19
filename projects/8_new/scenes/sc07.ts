import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawEngine, drawSupportTruck, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc07 (171.82–203.44s): Góc thứ ba — Cơ động (Mobility): Động cơ >1.000 mã lực, Đối chiếu Tuabin khí vs Diesel & Đoàn xe tải bồn hậu cần.
 * - 171.82–182.40s: Mặt cắt khoang động cơ ở đuôi xe tăng 60 tấn: khối động cơ >1.000 mã lực hoạt động mạnh mẽ và hút cạn bình nhiên liệu nhanh gấp nhiều lần ô tô.
 * - 182.40–195.64s: Đặt song song hai mặt cắt động cơ:
 *   + Trên: Tuabin khí (Gas Turbine — họ động cơ trực thăng) nhỏ gọn, vọt nhanh nhưng cột nhiên liệu tụt rất nhanh.
 *   + Dưới: Động cơ Diesel lớn hơn, tăng tốc từ tốn hơn nhưng đi được quãng đường xa hơn trên cùng một bình nhiên liệu.
 * - 195.64–203.44s: Chuyển sang góc nhìn từ trên xuống (`top`): Chiếc xe tăng đi đầu kéo theo đoàn 3 xe tải bồn nhiên liệu nối đuôi nhau phía sau trên tuyến đường hậu cần.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < CUE.ch3_turbine) {
      // Pha 1 (171.82–182.40s): Mặt cắt xe tăng 60 tấn tập trung vào buồng động cơ >1.000 mã lực phía sau và bồn nhiên liệu đang vơi nhanh
      const cam = K.track(
        t,
        [
          [171.82, { x: -30, y: 20, z: 1.15 }],
          [175.8, { x: -240, y: 40, z: 1.52 }],
          [182.4, { x: -260, y: 40, z: 1.55 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 185 });

      drawTank(c, {
        x: 0,
        y: 185,
        s: 2.25,
        dir: 1,
        view: 'cutaway',
        hasERA: true,
        highlightPart: 'engine',
        wheelPhase: t * 6.0,
      });

      // Phóng lớn mặt cắt buồng máy & bình nhiên liệu phía trên đuôi xe để thấy mức tiêu thụ nhiên liệu
      const showEng = A.sm(t, 174.5, 176.2);
      if (showEng > 0.01) {
        A.withA(c, showEng, () => {
          A.rrect(c, -490, -210, 440, 145, 12, P.paper, P.ink, lwO);
          drawEngine(c, -335, -138, 0.85, 'turbine', t * 3.5);
          // Cột mức nhiên liệu tụt xuống nhanh khi động cơ chạy ("drinks fuel in a way a car never would")
          const fuelLvl = 1 - A.sm(t, 176.5, 181.8) * 0.82;
          A.rrect(c, -155, -190, 68, 105, 8, P.bg2, P.ink, lwO);
          const fh = Math.max(6, 95 * fuelLvl);
          A.rrect(c, -150, -90 - fh, 58, fh, 5, P.amber, P.ink2, lwI);
          // Đường dẫn nhiên liệu từ bình vào buồng đốt
          UI.dashed(c, [-155, -138], [-225, -138], P.amber, lwO, -t * 110);
        });
      }

      K.end(c);

      const p60 = A.win(t, CUE.ch3_1000hp - 0.1, 181.5, 0.25, 0.3);
      if (p60 > 0.01) {
        const pt = K.toScreen(cam, -335, -210);
        UI.callout(c, '60 t · >1000 hp', pt[0], pt[1] - 48, {
          to: [pt[0], pt[1] + 5],
          p: p60,
          color: P.amber,
        });
      }
    } else if (t < CUE.ch3_logistics_trucks) {
      // Pha 2 (182.40–195.64s): Đối chiếu trực tiếp Tuabin khí (trên) vs Diesel (dưới)
      const cam: K.Cam = { x: 0, y: 0, z: 1.08 };
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 420 });

      const turbP = A.sm(t, CUE.ch3_turbine, CUE.ch3_turbine + 1.2);
      const diesP = A.sm(t, CUE.ch3_diesel, CUE.ch3_diesel + 1.2);

      // Khung nửa trên: TUABIN KHÍ (Gas Turbine) — Nhỏ gọn, tăng tốc vọt nhanh, nhưng uống cạn bình nhiên liệu sớm
      A.withA(c, turbP, () => {
        A.rrect(c, -740, -365, 1480, 310, 16, P.paper, P.ink, lwO);
        drawEngine(c, -450, -210, 1.35, 'turbine', t * 4.5);

        // Thanh nhiên liệu của Tuabin tụt rất nhanh
        const tRun = A.sm(t, CUE.ch3_turbine + 1.0, 188.8);
        UI.bar(c, -190, -310, 240, 34, 1 - tRun * 0.85, P.amber, 1);

        // Đường chạy minh hoạ tốc độ vọt nhanh nhưng dừng sớm ở cự ly ngắn
        A.line(c, [[110, -145], [680, -145]], P.slate, lwO);
        const tx = A.lerp(160, 460, A.eo(t, CUE.ch3_turbine + 1.0, 187.5));
        drawTank(c, { x: tx, y: -145, s: 0.52, dir: 1, view: 'side', wheelPhase: t * 12 });
      });

      // Khung nửa dưới: ĐỘNG CƠ DIESEL — Khối máy lớn hơn, tăng tốc điềm tĩnh hơn, nhưng đi được quãng đường xa hơn hẳn
      A.withA(c, Math.max(0.2, diesP), () => {
        A.rrect(c, -740, 25, 1480, 310, 16, P.paper, P.ink, lwO);
        drawEngine(c, -450, 180, 1.18, 'diesel', t * 2.2);

        // Thanh nhiên liệu của Diesel vơi chậm hơn
        const dRun = A.sm(t, CUE.ch3_diesel + 0.8, 194.8);
        UI.bar(c, -190, 80, 240, 34, 1 - dRun * 0.45, P.olive, 1);

        // Đường chạy minh hoạ tăng tốc đều và đi tới tận cuối đường (xa hơn Tuabin)
        A.line(c, [[110, 245], [680, 245]], P.slate, lwO);
        const dx = A.lerp(160, 635, A.sm(t, CUE.ch3_diesel + 0.8, 194.8));
        drawTank(c, { x: dx, y: 245, s: 0.52, dir: 1, view: 'side', wheelPhase: t * 7 });
      });

      K.end(c);
    } else {
      // Pha 3 (195.64–203.44s): Góc nhìn từ trên xuống (`top`) — Đoàn xe tải bồn nhiên liệu nối đuôi bám theo nuôi chiếc xe tăng
      const dt = t - CUE.ch3_logistics_trucks;
      const cam: K.Cam = {
        x: A.lerp(-40, 110, A.sm(t, CUE.ch3_logistics_trucks, 203.4)),
        y: 0,
        z: 1.02,
      };

      K.begin(c, cam);
      drawStageBg(c, 'top-map');

      const tankX = 340 + dt * 26;
      // 3 chiếc xe tải bồn tiếp vận chạy nối đuôi phía sau xe tăng
      for (let i = 0; i < 3; i++) {
        const appear = A.sm(t, CUE.ch3_logistics_trucks + i * 0.6, CUE.ch3_logistics_trucks + 1.1 + i * 0.6);
        const trX = tankX - 460 - i * 290;
        A.withA(c, appear, () => {
          drawSupportTruck(c, trX, 0, 0.92, 'top', 'fuel', 1, 0);
          // Đường ống/luồng nhiên liệu màu vàng cam nối từ đoàn xe bồn lên xe tăng phía trước
          UI.dashed(c, [trX + 110, 0], [trX + 205, 0], P.amber, lwO * 1.2, -t * 140);
        });
      }

      drawTank(c, {
        x: tankX,
        y: 0,
        s: 1.38,
        view: 'top',
        hasERA: true,
        turretYaw: 0,
      });

      K.end(c);
    }
  }
}
