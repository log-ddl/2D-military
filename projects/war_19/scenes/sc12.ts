// scenes/sc12.ts — Chương 4, Shot 4.4 (331.60 – 373.70s)
// Giao hàng không cần hạ cánh khi mặt đất quá nóng:
// 1) (331.60–353.50s): Giữa không trung, mở bửng đuôi thả dù mồi (drogue chute) giật nguyên đoàn pallet trượt khỏi con lăn sàn.
// 2) (353.50–373.70s): Cực hạn Chiến tranh Lạnh LAPES — lướt cách mặt cỏ chỉ 2–3m không chạm đất, dù khổng lồ giật chiếc xe thiết giáp bay khỏi đuôi trượt trong mây bụi!
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawC17,
  drawC130,
  drawPallet,
  drawArmoredVehicle,
  drawParachute,
  drawExplosion,
  drawGroundSide,
  drawCallout,
  lw,
} from './_assets';

const camHighDrop: K.Cam = { x: 0, y: -235, z: 1.38 };
const camLapesSkim: K.Cam = { x: 45, y: -105, z: 1.48 };
const camLapesEnd: K.Cam = { x: 180, y: -115, z: 1.42 };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const inLapes = t >= CUE.ch4_lapes_intro;
    let cam = inLapes
      ? K.track(t, [[CUE.ch4_lapes_intro, camLapesSkim], [366.0, camLapesSkim], [373.7, camLapesEnd]], A.eio)
      : camHighDrop;

    cam = K.withShake(cam, t, [
      [CUE.ch4_hot_shell1, 12, 0.45],
      [CUE.ch4_hot_shell2, 14, 0.45],
      [CUE.ch4_lapes_hit, 16, 0.65],
    ]);

    A.clear(c, P.bg);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    drawGroundSide(c, cam, 'dirt', 0);

    // ── PHẦN 1 (331.60 – 353.60s): Mặt đất quá nóng & Thả dù mồi kéo đoàn pallet trên cao ──
    if (!inLapes) {
      // Mặt đất chiến trường bên dưới đang nổ đạn pháo ("the ground is too hot to stop")
      drawExplosion(c, -210, -12, A.ph(t, CUE.ch4_hot_shell1, CUE.ch4_hot_shell1 + 1.0), 58);
      drawExplosion(c, 165, -12, A.ph(t, CUE.ch4_hot_shell2, CUE.ch4_hot_shell2 + 1.0), 64);

      const planeX = 95, planeY = -205;
      const rampOpen = A.sm(t, 338.8, 341.2);

      // Dù mồi (drogue parachute) bung ra ở 342.24s, căng gió giật chuỗi 3 pallet trượt khỏi khoang ở 346.88s
      const drogueP = A.eio(t, CUE.ch4_drogue_chute, CUE.ch4_drogue_chute + 2.2);
      const yankP = A.ei(t, CUE.ch4_yank_pallets - 0.3, 352.8);

      // Vị trí đoàn pallet trượt từ trong khoang (-120..60) văng ra bầu trời phía sau (-580)
      const trainOffset = A.lerp(0, -540, yankP);
      const dropY = yankP > 0.25 ? Math.pow(yankP - 0.25, 2) * 140 : 0;

      for (let i = 0; i < 3; i++) {
        const px = planeX - 185 + i * 105 + trainOffset;
        const py = planeY - 58 + (px < planeX - 255 ? dropY * (1 + i * 0.15) : 0);
        drawPallet(c, px, py, 0.85);
      }

      // Vòm dù mồi nhỏ (drogue chute) kéo đầu đoàn pallet
      const leadX = planeX - 185 + trainOffset - 45;
      const leadY = planeY - 82 + (leadX < planeX - 255 ? dropY : 0);
      const chuteX = leadX - A.lerp(20, 145, drogueP);
      const chuteY = leadY - 12;
      drawParachute(c, leadX, leadY, chuteX, chuteY, 44, drogueP);

      // Vẽ C-17 ở chế độ Cutaway để thấy rõ đoàn pallet trượt dọc con lăn sàn lao ra khỏi đuôi!
      drawC17(c, planeX, planeY, {
        view: 'cutaway',
        scale: 0.92,
        gearDown: 0,
        rampOpen,
      });
    }

    // ── PHẦN 2 (353.60 – 373.70s): Rút hàng bằng dù tầm cực thấp LAPES (cách mặt cỏ chỉ 2–3m!) ──
    if (inLapes) {
      // Thước đo khoảng cách 2–3 mét từ bụng máy bay xuống mặt cỏ phẳng
      const skimDimAlpha = A.win(t, CUE.ch4_lapes_skim - 0.3, 366.5, 0.35, 0.4);

      // Máy bay vận tải C-130 / C-17 lướt là là cách mặt đất đúng 2–3m (bánh thu gọn, không chạm đất!)
      const climbOut = A.ei(t, 368.0, 373.5);
      const planeX = A.lerp(-40, 290, A.ph(t, CUE.ch4_lapes_intro, 373.7));
      const planeY = -36 - climbOut * 145;

      // Quá trình dù kéo khổng lồ giật chiếc xe thiết giáp bay khỏi đuôi (362.60–373.0s)
      const chOpen = A.eio(t, CUE.ch4_lapes_drag - 0.4, CUE.ch4_lapes_drag + 1.4);
      const extractP = A.eo(t, CUE.ch4_lapes_drag + 0.5, 371.2);

      // Khi extractP = 0: xe nằm trong khoang (planeX - 65, planeY - 52)
      // Khi extractP tăng: xe bị dù giật tụt lại phía sau, đập xuống mặt đất (y = 0) lúc 367.20s rồi trượt trên cỏ!
      const vehX = A.lerp(planeX - 65, -145, extractP);
      const hitGround = A.sm(t, CUE.ch4_lapes_hit - 0.5, CUE.ch4_lapes_hit + 0.2);
      const vehY = A.lerp(planeY - 52, 0, hitGround);
      const vehBounce = A.bump(t, CUE.ch4_lapes_hit, 0.65) * -0.14;

      // Vòm dù kéo khổng lồ (gigantic extraction parachute) phía sau đuôi
      if (chOpen > 0.01) {
        const chuteTension = 1 - A.sm(t, 371.0, 373.0);
        const chuteX = vehX - 75 - chOpen * 165;
        const chuteY = vehY - 45 * chuteTension - 18;
        drawParachute(c, vehX - 68, vehY - 28, chuteX, chuteY, 82, chOpen);
      }

      // Đám mây bụi cỏ cuồn cuộn khi chiếc xe thiết giáp đập xuống trượt dài ("slide across the grass in a cloud of dust")
      const dustP = A.ph(t, CUE.ch4_lapes_hit, 373.2);
      if (dustP > 0) {
        for (let i = 0; i < 8; i++) {
          const dp = A.clamp01(dustP * 1.5 - i * 0.12);
          if (dp <= 0) continue;
          const dx = vehX - 35 - i * 32 + dp * 15;
          const dy = -12 - dp * (22 + (i % 3) * 14);
          const dr = (16 + i * 5) * Math.sin(dp * Math.PI * 0.85);
          A.withA(c, (1 - dp * 0.65) * 0.85, () => {
            A.circle(c, dx, dy, dr, i % 2 === 0 ? P.sand : P.bg2, P.ink, inW * 0.8);
          });
        }
      }

      // Vẽ chiếc xe thiết giáp bị giật ra khỏi đuôi
      c.save();
      c.translate(vehX, vehY);
      c.rotate(vehBounce);
      drawArmoredVehicle(c, 0, 0, {
        kind: 'ifv',
        view: 'side',
        scale: 0.96,
      });
      c.restore();

      // Vẽ vận tải cơ C-130 Hercules đang mở bửng đuôi bay sát mặt cỏ
      drawC130(c, planeX, planeY, {
        view: 'side',
        scale: 1.05,
        propPhase: t,
        rampOpen: 1,
        gearDown: 0,
      });

      // Thước gióng độ cao 2–3 mét dưới bụng máy bay
      A.withA(c, skimDimAlpha, () => {
        const gx = planeX + 65;
        A.line(c, [[gx, planeY - 44], [gx, -2]], P.amber, lw(c, 4));
        A.line(c, [[gx - 14, planeY - 44], [gx + 14, planeY - 44]], P.amber, lw(c, 4));
        A.line(c, [[gx - 14, -2], [gx + 14, -2]], P.amber, lw(c, 4));
      });

      K.end(c);
      drawCallout(c, cam, planeX + 65, -40, 88, 0, '2–3m', skimDimAlpha, P.amber);
      return;
    }

    K.end(c);
  }
}
