// sc06.ts (156.08 – 195.08s): Phương pháp 1 (USAF Flying Boom) — Cần cứng 15m có cánh chữ V
// và phi công tiêm kích bay vào vị trí nhìn dải đèn chỉ dẫn màu dưới bụng Tanker (Director Lights).
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawSkySideBg,
  drawModernTanker,
  drawStrikeFighter,
  drawFlyingBoom,
  drawHoseAndDrogue,
  lwO,
  lwI,
} from './_assets';
import { SIDE_PAIR, boomCamCh2, CUE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = boomCamCh2(t);
    A.clear(c, P.bg);

    K.begin(c, cam);
    drawSkySideBg(c, cam, t, { speed: 210, highAltBand: true });

    const lo = lwO(c);
    const li = lwI(c);
    const [tx, ty] = SIDE_PAIR.tanker;

    // Phi công tiêm kích nhích nhẹ từ phía sau-dưới vào đúng điểm neo chuẩn dưới bụng tanker (182.9 – 194.6s)
    const adjustP = A.eio(t, CUE.flies_into_position, CUE.move_fwd_back_up_down + 2.2);
    const fx = SIDE_PAIR.receiverDocked[0] - (1 - adjustP) * (t >= 182.0 ? 38 : 0);
    const fy = SIDE_PAIR.receiverDocked[1] + (1 - adjustP) * (t >= 182.0 ? 22 : 0);

    // Trạng thái đèn chỉ dẫn dưới bụng Tanker: 'fwd' -> 'up' -> 'steady'
    const lightMode: 'off' | 'fwd' | 'up' | 'steady' =
      t < CUE.director_lights - 0.5
        ? 'off'
        : t < 191.5
        ? 'fwd'
        : t < 193.6
        ? 'up'
        : 'steady';

    // 1. Nhịp "militaries split into two camps" (156.2 – 160.2s): nhá nhẹ nhánh ống mềm đối diện cần cứng
    const campsWin = A.win(t, CUE.two_camps - 0.6, 160.5, 0.3, 0.4);
    if (campsWin > 0.01) {
      A.withA(c, campsWin * 0.65, () => {
        drawHoseAndDrogue(c, tx - 50, ty + 28, fx + 95, fy - 8, {
          whipAmp: 5,
          whipPhase: t,
          basketScale: 0.9,
        });
      });
    }

    // 2. Vẽ Tanker
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, 'side', {
      scale: 1.25,
      hasBoom: true,
      directorLights: lightMode === 'off' ? 'steady' : lightMode,
    });
    c.restore();

    // 3. Vẽ Cần cứng (Flying Boom) dài 15m gắn bản lề dưới đuôi Tanker, có 2 cánh chữ V nghiêng lái
    const bx0 = tx - 185;
    const by0 = ty + 34;
    const deployP = A.eio(t, CUE.flying_boom - 0.5, CUE.pipe_15_meters);
    const bx1 = A.lerp(bx0 - 110, fx + 18, deployP);
    const by1 = A.lerp(by0 + 52, fy - 42, deployP);
    const wingWave =
      t >= CUE.v_shaped_wings - 0.3 && t <= 182.5 ? Math.sin(t * 5.2) * 0.95 : 0.15;

    drawFlyingBoom(c, bx0, by0, bx1, by1, {
      extension: 0.3 + 0.25 * deployP,
      wingPitch: wingWave,
      locked: false,
    });

    // Đường tia mắt từ phi công Receiver nhìn lên dải đèn bụng Tanker (186.5 – 195.08s)
    const sightWin = A.win(t, CUE.director_lights - 0.8, 195.0, 0.4, 0.3);
    if (sightWin > 0.01) {
      A.withA(c, sightWin, () => {
        A.line(
          c,
          [
            [fx + 54, fy - 24],
            [tx - 10, ty + 38],
          ],
          P.amber,
          lo,
          [A.px(c, 10), A.px(c, 8)]
        );
      });

      // Cửa sổ phóng cận cảnh góc nhìn dưới bụng Tanker (Belly View) đặt ở góc trên-trái để thấy rõ hàng đèn chỉ dẫn!
      A.withA(c, sightWin, () => {
        c.save();
        c.translate(-225, -135);
        // Khung định vị liên kết với bụng tanker
        A.rrect(c, -185, -58, 370, 116, 16, P.white, P.ink, lo);
        c.save();
        c.scale(0.48, 0.48);
        drawModernTanker(c, 'belly', {
          directorLights: lightMode === 'off' ? 'steady' : lightMode,
        });
        c.restore();
        // Mũi tên chỉ hướng dịch chuyển tương ứng với đèn sáng (FWD -> UP -> chấm tròn STEADY)
        if (lightMode === 'fwd') {
          A.poly(c, [[115, 0], [88, -14], [88, 14]], P.amber, P.ink, li);
        } else if (lightMode === 'up') {
          A.poly(c, [[100, -22], [84, 6], [116, 6]], P.amber, P.ink, li);
        } else {
          A.circle(c, 102, 0, 13, P.sky, P.ink, li);
        }
        c.restore();

        // Đường dẫn nối từ khung phóng cận tới đúng dải đèn dưới bụng Tanker
        A.line(c, [[-40, -110], [tx - 20, ty + 36]], P.ink2, li, [A.px(c, 6), A.px(c, 6)]);
      });
    }

    // 4. Vẽ Strike Fighter (Receiver)
    c.save();
    c.translate(fx, fy);
    drawStrikeFighter(c, 'side', {
      scale: 1.28,
      hasReceptacle: true,
      bombsCount: 2,
      fuelLevel: 0.45,
    });
    c.restore();

    K.end(c);

    // Khung ngắm focus vào đôi cánh chữ V khi voice nhắc "fitted with two small V-shaped wings near its nozzle"
    const vFocus = A.win(t, CUE.v_shaped_wings - 0.3, 178.0, 0.25, 0.3);
    if (vFocus > 0.01) {
      const [sx, sy] = K.toScreen(cam, A.lerp(bx0, bx1, 0.72), A.lerp(by0, by1, 0.72));
      UI.focus(c, sx - 52, sy - 52, 104, 104, vFocus, P.amber, 5);
    }

    // Callout duy nhất: "15 M" cho chiều dài cần cứng (173.0 – 176.8s)
    const p15m = A.win(t, CUE.pipe_15_meters - 0.2, 176.8, 0.25, 0.25);
    if (p15m > 0.01) {
      const [sx, sy] = K.toScreen(cam, (bx0 + bx1) / 2, (by0 + by1) / 2);
      UI.callout(c, '15 M', sx - 135, sy - 85, { to: [sx, sy], p: p15m, color: P.slate });
    }
  }
}
