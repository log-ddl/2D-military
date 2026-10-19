// sc07.ts (195.08 – 233.56s): Bên trong Tanker — Boom Operator (nằm sấp ở đuôi đời cũ vs ngồi màn hình 3D ở mũi đời mới)
// lái cánh chữ V bằng joystick, bắn ống lồng khóa vào ổ nhận trên lưng tiêm kích, bơm 3.000–4.000 lít/phút.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawSkySideBg,
  drawModernTanker,
  drawStrikeFighter,
  drawVulcan,
  drawFlyingBoom,
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
    const [fx, fy] = SIDE_PAIR.receiverDocked;

    // Chế độ hiển thị buồng điều khiển của Boom Operator:
    // 195.5..204.2s: nằm sấp ở đuôi ('prone'); 204.2..213.5s: ngồi màn hình 3D phía trước ('console')
    const opMode: 'none' | 'prone' | 'console' =
      t < 195.4 || t >= 223.0
        ? 'none'
        : t < CUE.newer_console_3d - 0.2
        ? 'prone'
        : t < 214.0
        ? 'console'
        : 'prone';

    // 1. Vẽ Tanker kèm mặt cắt buồng điều khiển của Boom Operator
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, 'side', {
      scale: 1.25,
      hasBoom: true,
      directorLights: 'steady',
      operatorMode: opMode,
    });
    c.restore();

    // Đường tầm nhìn từ cửa sổ đuôi (prone) hoặc từ camera 3D đuôi truyền lên buồng lái (console)
    const bx0 = tx - 185;
    const by0 = ty + 34;

    // Ống lồng phóng ra khóa vào ổ nhận trên lưng tiêm kích tại 218.88s ("fires an inner telescope tube forward")
    const steerP = A.eio(t, CUE.joystick_flies_boom, CUE.socket_receiver_back);
    const fireTubeP = A.eo(t, CUE.fires_telescope_tube - 0.15, CUE.lock_receptacle);

    const bx1 = A.lerp(fx + 18, fx - 18, steerP * 0.55 + fireTubeP * 0.45);
    const by1 = A.lerp(fy - 42, fy - 24, steerP * 0.55 + fireTubeP * 0.45);
    const wingDeflect =
      t >= CUE.joystick_flies_boom && t <= CUE.fires_telescope_tube
        ? Math.sin((t - CUE.joystick_flies_boom) * 4.5) * 0.85
        : 0.1;

    if (opMode === 'prone' && t < 212.5) {
      A.line(
        c,
        [
          [tx - 175, ty + 28],
          [bx1, by1],
        ],
        P.amber,
        li,
        [A.px(c, 8), A.px(c, 6)]
      );
    } else if (opMode === 'console') {
      // Camera dưới đuôi quét chùm tia 3D xanh dương và truyền dữ liệu dọc thân lên màn hình phía trước
      A.line(c, [[tx - 165, ty + 32], [bx1, by1]], P.sky, li, [A.px(c, 6), A.px(c, 5)]);
      A.line(c, [[tx - 165, ty + 26], [tx + 80, ty - 8]], P.sky, lo, [A.px(c, 10), A.px(c, 6)]);
    }

    // 2. Vẽ Cần cứng (Flying Boom) phóng ống lồng và bơm nhiên liệu 3.000–4.000 L/phút
    const flowActive = A.sm(t, CUE.lock_receptacle + 0.3, CUE.lock_receptacle + 1.2);
    drawFlyingBoom(c, bx0, by0, bx1, by1, {
      extension: 0.45 + 0.48 * fireTubeP,
      wingPitch: wingDeflect,
      flow: flowActive,
      flowPhase: t * 1.6,
      locked: fireTubeP > 0.9,
    });

    // 3. Vẽ Strike Fighter nhận nhiên liệu: thanh xăng đầy nhanh từ 0.35 lên 1.0 trong vài giây (224..231.5s)
    const fighterFill = A.lerp(0.35, 1.0, A.eio(t, 224.0, CUE.fighter_couple_min + 0.8));
    c.save();
    c.translate(fx, fy);
    drawStrikeFighter(c, 'side', {
      scale: 1.28,
      hasReceptacle: true,
      bombsCount: 2,
      fuelLevel: fighterFill,
    });
    c.restore();

    // 4. Nhịp "or a giant bomber in 15" (231.6 – 233.56s): hiện hình đối chiếu chiếc oanh tạc cơ lớn phía dưới đang nạp đầy bình
    const bomberWin = A.win(t, 231.4, 233.55, 0.35, 0.25);
    if (bomberWin > 0.01) {
      A.withA(c, bomberWin, () => {
        c.save();
        c.translate(fx + 220, fy + 150);
        drawVulcan(c, 'side', { scale: 1.15 });
        // Thanh nhiên liệu lớn của Bomber đang đầy lên
        const bf = A.eio(t, 231.5, 233.4);
        A.rrect(c, -45, -8, 86, 16, 4, P.white, P.ink, li);
        A.rrect(c, -42, -5, 80 * bf, 10, 3, P.amber, null, 0);
        c.restore();
      });
    }

    K.end(c);

    // Vòng ring xác nhận khoảnh khắc đầu vòi khóa vào ổ nhận (221.0 – 222.4s)
    const lockRing = A.ph(t, CUE.lock_receptacle - 0.1, CUE.lock_receptacle + 0.9);
    if (lockRing > 0 && lockRing < 1) {
      const [sx, sy] = K.toScreen(cam, bx1, by1);
      UI.ring(c, sx, sy, 68, lockRing, P.amber, 6);
    }

    // Callout số liệu tốc độ bơm: "3,000–4,000 L/MIN" (227.1 – 231.6s) và "15 MIN" (232.2 – 233.5s)
    const pRate = A.win(t, CUE.pump_3000_4000 - 0.2, 231.6, 0.25, 0.25);
    if (pRate > 0.01) {
      const [sx, sy] = K.toScreen(cam, (bx0 + bx1) / 2, (by0 + by1) / 2);
      UI.callout(c, '3,000–4,000 L/MIN', sx - 160, sy - 95, { to: [sx, sy], p: pRate, color: P.amber });
    }

    const p15m = A.win(t, CUE.bomber_15_min - 0.3, 233.5, 0.2, 0.2);
    if (p15m > 0.01) {
      const [sx, sy] = K.toScreen(cam, fx + 220, fy + 150);
      UI.callout(c, '15 MIN', sx + 145, sy - 60, { to: [sx, sy], p: p15m, color: P.oliveDark });
    }
  }
}
