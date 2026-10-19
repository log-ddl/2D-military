// scenes/sc08.ts — Chương 3, Shot 3.3 (216.80 – 245.50s)
// Phần 1 (216.80–230.94s): C-5 Galaxy mở bật mũi visor lên cao + quỳ càng đáp biến thân thành đường hầm cho đoàn xe tải chạy xuyên qua.
// Phần 2 (230.94–245.50s): Đường băng ban đêm tối đen không có đội mặt đất, APU trong khoang tự phát điện chiếu sáng và chạy tời điện kéo xe hỏng lên dốc.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch3StateAt } from './_state';
import {
  drawC5,
  drawC17,
  drawArmoredVehicle,
  drawGroundSide,
  lw,
} from './_assets';

const camC5Wide: K.Cam = { x: 0, y: -135, z: 1.34 };
const camNightWinch: K.Cam = { x: -55, y: -115, z: 1.62 };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = ch3StateAt(t);
    const toNight = t >= CUE.ch3_apu_winch ? 1 : 0;
    const cam = toNight ? camNightWinch : camC5Wide;

    A.clear(c, toNight > 0.5 ? P.dark : P.bg);
    K.begin(c, cam);

    const inW = lw(c, LINE.inner);

    // ── PHẦN 1 (216.80 – 231.20s): C-5 Galaxy mở mũi Visor & Quỳ càng đáp cho đoàn xe tải chạy xuyên hầm ──
    A.withA(c, 1 - toNight, () => {
      drawGroundSide(c, cam, 'dirt', 0);

      drawC5(c, 0, 0, {
        view: 'cutaway',
        scale: 1,
        visorOpen: st.c5Visor,
        rampOpen: A.sm(t, 217.2, 219.5),
        kneel: st.c5Kneel,
        cutaway: true,
      });

      // Đoàn 3 chiếc xe tải quân sự chạy vào từ cầu đuôi và phóng thẳng ra đằng mũi (225.5–231.0s)
      const driveP = A.ph(t, 224.8, 230.9);
      if (driveP > 0) {
        const dropY = st.c5Kneel * 22;
        for (let i = 0; i < 3; i++) {
          const tx = A.lerp(-520, 620, driveP) - i * 185;
          // Khi nằm trên thân C-5 (-315..305), xe ở độ cao sàn khoang (-58 + dropY); ngoài hai đầu thì ở mặt đất (0)
          let ty = 0;
          if (tx > -440 && tx < 440) {
            const upTail = A.clamp01((tx - (-440)) / 120);
            const downNose = 1 - A.clamp01((tx - 310) / 130);
            ty = (-58 + dropY) * Math.min(upTail, downNose);
          }
          drawArmoredVehicle(c, tx, ty, {
            kind: 'truck',
            view: 'side',
            scale: 0.82,
          });
        }
      }
    });

    // ── PHẦN 2 (230.94 – 245.50s): Đường băng đêm tối, APU tự phát điện & Tời điện kéo xe hỏng lên dốc ──
    A.withA(c, toNight, () => {
      drawGroundSide(c, cam, 'night', 0);

      drawC17(c, 0, 0, {
        view: 'cutaway',
        scale: 1,
        rampOpen: 1,
      });

      // Ánh đèn vàng ấm bật sáng bên trong khoang nhờ máy phát APU (235.5–245.5s)
      const apuActive = A.sm(t, 232.2, 234.0);
      A.withA(c, apuActive * 0.28, () => {
        A.rrect(c, -252, -160, 480, 102, 6, P.amber, null, 0);
      });

      // Cụm máy phát tua-bin khí phụ (APU) & Tời điện hạng nặng ở đầu khoang (x = 195, y = -78)
      A.withA(c, apuActive, () => {
        // Vòng phát sáng quanh APU
        A.circle(c, 209, -78, 18 + Math.sin(t * 14) * 3, null, P.amber, lw(c, 3.5));
        // Đường điện màu xanh sky dẫn từ APU lên đèn trần khoang và xuống cụm thủy lực bửng đuôi
        A.line(c, [[209, -96], [209, -158], [-220, -158]], P.sky, lw(c, 3), [8, 6]);
        A.line(c, [[209, -60], [-255, -52]], P.sky, lw(c, 3), [8, 6]);
      });

      // Chiếc xe thiết giáp hỏng bánh (brokenWheel: true) được cáp tời điện kéo từ mặt đất tối leo lên cầu đuôi
      const vehX = A.lerp(-465, -85, st.winchPull);
      const onRamp = A.clamp01((vehX - (-405)) / 150);
      const vehY = A.lerp(0, -58, A.sm(onRamp, 0, 1));

      // Dây cáp tời điện căng thẳng từ tời đầu khoang (185, -72) tới mũi chiếc xe hỏng
      A.line(c, [[185, -72], [vehX + 62, vehY - 26]], P.amber, lw(c, 3.8), [10, 5]);
      A.circle(c, 185, -72, 11, P.amber, P.ink, inW);

      drawArmoredVehicle(c, vehX, vehY, {
        kind: 'ifv',
        view: 'side',
        scale: 0.92,
        brokenWheel: true,
      });
    });

    K.end(c);
  }
}
