// sc05.ts (112.24 – 156.08s): Cuộc chiến khí động học sau đuôi tanker 200 tấn —
// TOP view (112.24–131.12s): sóng khí đẩy lùi & 2 lốc xoáy đầu cánh (twin tornadoes);
// SIDE view (131.12–156.08s): downwash đè mũi tiêm kích xuống, bow wave đẩy đuôi tanker lên trong hộp không gian 10m.
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
  lwO,
  lwI,
} from './_assets';
import { SIDE_PAIR, CUE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const isTopPhase = t < CUE.within_10_meters - 2.0; // 112.24 .. 131.28s là góc TOP

    if (isTopPhase) {
      const cam: K.Cam = K.track(
        t,
        [
          [112.24, { x: 10, y: 0, z: 1.26 }],
          [121.0, { x: 25, y: 0, z: 1.32 }],
          [131.28, { x: -10, y: 0, z: 1.24 }],
        ],
        A.eio
      );

      A.clear(c, P.bg2);
      K.begin(c, cam);
      const lo = lwO(c);
      const li = lwI(c);

      // Lưới bầu trời tốc độ cao nhìn từ trên xuống
      const v = K.view(cam, 120);
      c.strokeStyle = 'rgba(71, 85, 105, 0.10)';
      c.lineWidth = A.px(c, 1.5);
      const step = 140;
      const shift = ((t * 240) % step + step) % step;
      c.beginPath();
      for (let x = Math.floor(v.x0 / step) * step - shift; x <= v.x1; x += step) {
        c.moveTo(x, v.y0);
        c.lineTo(x, v.y1);
      }
      for (let y = Math.floor(v.y0 / step) * step; y <= v.y1; y += step) {
        c.moveTo(v.x0, y);
        c.lineTo(v.x1, y);
      }
      c.stroke();

      const tx = 210;
      const ty = 0;

      // 1. Sóng khí khổng lồ đẩy lùi sau cánh tanker 200 tấn (124.1 – 131.28s)
      const wakeP = A.sm(t, CUE.ton_200_tanker - 0.3, CUE.wave_downward + 0.8);
      if (wakeP > 0.01) {
        A.withA(c, wakeP, () => {
          for (let i = 0; i < 4; i++) {
            const u = ((t * 1.1 + i * 0.25) % 1 + 1) % 1;
            const wx = tx - 60 - u * 380;
            const spread = 110 + u * 85;
            A.withA(c, (1 - u) * 0.75, () => {
              A.line(
                c,
                [
                  [wx, -spread],
                  [wx - 45, 0],
                  [wx, spread],
                ],
                P.sky,
                lo
              );
            });
          }
        });
      }

      // 2. Hai lốc xoáy đầu cánh (Twin Tornadoes spinning off wingtips, 128.5 – 131.28s)
      const vortP = A.sm(t, CUE.twin_tornadoes - 0.5, CUE.twin_tornadoes + 0.8);
      if (vortP > 0.01) {
        for (const sy of [-1, 1] as const) {
          const wy0 = sy * 212;
          const pts: A.Pt[] = [];
          for (let i = 0; i <= 48; i++) {
            const u = (i / 48) * vortP;
            const vx = tx - 85 - u * 460;
            const vy = wy0 + Math.sin(u * 18 - t * 10 * sy) * (10 + u * 26);
            pts.push([vx, vy]);
          }
          A.line(c, pts, P.enemy, lo);
        }
      }

      // 3. Vẽ chiếc Tanker 200 tấn ở (tx, ty)
      c.save();
      c.translate(tx, ty);
      drawModernTanker(c, 'top', { scale: 1.22, wingPods: true, hasBoom: true });
      c.restore();

      // 4. Tiêm kích tiến dần vào vùng nhiễu động sau đuôi tanker
      const approachP = A.eio(t, 112.5, 123.5);
      const fx = A.lerp(-420, -185, approachP);
      const fy = Math.sin(t * 5.5) * 10 * A.sm(t, 121.5, 124.0);
      c.save();
      c.translate(fx, fy);
      c.rotate(Math.sin(t * 6.0) * 0.05 * A.sm(t, 121.5, 124.0));
      drawStrikeFighter(c, 'top', { scale: 1.18, hasReceptacle: true, afterburner: 0.5 });
      c.restore();

      K.end(c);

      const p200 = A.win(t, CUE.ton_200_tanker - 0.2, 128.4, 0.25, 0.25);
      if (p200 > 0.01) {
        const [sx, sy] = K.toScreen(cam, tx + 20, ty - 40);
        UI.callout(c, '200 TONS', sx, sy - 95, { to: [sx, sy], p: p200, color: P.slate });
      }
      return;
    }

    // ── Giai đoạn 2 (131.28 – 156.08s): Góc SIDE cận vùng 10m sau đuôi Tanker ──
    const cam: K.Cam = K.track(
      t,
      [
        [131.28, { x: -20, y: -15, z: 1.18 }],
        [135.5, { x: -10, y: -10, z: 1.24 }],
        [145.0, { x: 0, y: -10, z: 1.12 }],
        // Khớp chính xác với điểm đầu của boomCamCh2(156.08) = { x: 0, y: -10, z: 1.0 }
        [156.08, { x: 0, y: -10, z: 1.0 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);
    drawSkySideBg(c, cam, t, { speed: 220, highAltBand: true });

    const lo = lwO(c);
    const li = lwI(c);

    const [tx, ty] = SIDE_PAIR.tanker; // [210, -145]
    const creepP = A.eio(t, 131.3, 135.0);
    const stabilizeP = A.sm(t, CUE.autopilots_hands, CUE.motionless_box);

    // Khi downwash đập xuống (135.2 – 142.0s), mũi tiêm kích bị ấn chúc xuống (+deg), sau đó autopilot ghì phẳng lại
    const downwashP = A.win(t, CUE.downwash_nose_down - 0.4, 145.5, 0.4, 0.6);
    const bowWaveP = A.win(t, CUE.bow_wave_upward - 0.4, 145.5, 0.4, 0.6);

    const rawOsc = Math.sin(t * 4.8) * (1 - stabilizeP * 0.85);
    const fx = A.lerp(-265, SIDE_PAIR.receiverDocked[0], creepP);
    const fy = SIDE_PAIR.receiverDocked[1] + downwashP * 18 * (1 - stabilizeP) + rawOsc * 6;
    const fPitch = downwashP * 9.5 * (1 - stabilizeP * 0.9);
    const tPitch = bowWaveP * -3.5 * (1 - stabilizeP * 0.9);

    // 1. Hộp không gian vô hình ("invisible box of sky a few meters wide", 146.5 – 155.95s)
    const boxP = A.win(t, CUE.motionless_box - 0.4, 155.95, 0.5, 0.45);
    if (boxP > 0.01) {
      A.withA(c, boxP, () => {
        A.rrect(
          c,
          fx - 155,
          fy - 58,
          315,
          108,
          10,
          'rgba(56, 189, 248, 0.10)',
          P.sky,
          lo
        );
      });
    }

    // 2. Luồng Downwash từ cánh Tanker đập chéo xuống mũi Receiver (màu đỏ gạch P.enemy)
    if (downwashP > 0.01) {
      A.withA(c, downwashP, () => {
        for (let i = 0; i < 3; i++) {
          const ox = i * 38;
          A.line(
            c,
            [
              [tx - 40 - ox, ty + 28],
              [fx + 85 - ox * 0.6, fy - 14],
            ],
            P.enemy,
            lo,
            [A.px(c, 10), A.px(c, 8)]
          );
        }
      });
    }

    // 3. Sóng mũi Bow Wave của Receiver đẩy ngược lên cánh đuôi ngang Tanker (màu xanh P.sky)
    if (bowWaveP > 0.01) {
      A.withA(c, bowWaveP, () => {
        // Vòm sóng áp suất trước mũi tiêm kích
        c.beginPath();
        c.arc(fx + 105, fy - 4, 48, -Math.PI * 0.65, Math.PI * 0.15);
        A.fs(c, null, P.sky, lo * 1.2);
        A.line(
          c,
          [
            [fx + 115, fy - 36],
            [tx - 185, ty + 10],
          ],
          P.sky,
          lo,
          [A.px(c, 10), A.px(c, 8)]
        );
      });
    }

    // 4. Vẽ Tanker & Cần cứng thu gọn ở đuôi
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, 'side', { scale: 1.25, hasBoom: true, pitchDeg: tPitch });
    c.restore();

    const bx0 = tx - 185;
    const by0 = ty + 34;
    // Ở cuối sc05 (151.2 – 155.95s: "fuel has to cross the gap"), nhấn khoảng trống cần nối giữa 2 máy bay
    const gapHighlight = A.win(t, 151.2, 155.95, 0.5, 0.45);
    drawFlyingBoom(c, bx0, by0, bx0 - 110, by0 + 52, {
      extension: 0.3,
      wingPitch: 0,
      locked: false,
    });
    if (gapHighlight > 0.01) {
      A.withA(c, gapHighlight, () => {
        A.line(
          c,
          [
            [bx0 - 110, by0 + 52],
            [fx - 18, fy - 24],
          ],
          P.amber,
          lo * 1.2,
          [A.px(c, 10), A.px(c, 8)]
        );
        A.circle(c, (bx0 - 110 + fx - 18) / 2, (by0 + 52 + fy - 24) / 2, 18, 'rgba(245,158,11,0.22)', P.amber, li);
      });
    }

    // 5. Vẽ Strike Fighter (Receiver)
    c.save();
    c.translate(fx, fy);
    drawStrikeFighter(c, 'side', {
      scale: 1.28,
      hasReceptacle: true,
      pitchDeg: fPitch,
      bombsCount: 2,
      fuelLevel: 0.45,
    });
    c.restore();

    K.end(c);

    // Mũi tên lực trực quan trên màn hình cho Downwash (ấn mũi xuống) và Bow wave (đẩy đuôi lên)
    if (downwashP > 0.05) {
      const [sx, sy] = K.toScreen(cam, fx + 95, fy - 22);
      UI.arrow(c, [sx, sy - 55], [sx, sy + 12], { p: downwashP, color: P.enemy, w: 7 });
    }
    if (bowWaveP > 0.05) {
      const [sx, sy] = K.toScreen(cam, tx - 195, ty + 18);
      UI.arrow(c, [sx, sy + 65], [sx, sy - 5], { p: bowWaveP, color: P.sky, w: 7 });
    }

    // Callout "10 M" khi tiêm kích tiến sát đuôi tanker (133.1 – 137.2s)
    const p10m = A.win(t, CUE.within_10_meters - 0.15, 137.2, 0.25, 0.25);
    if (p10m > 0.01) {
      const [sx, sy] = K.toScreen(cam, (tx - 185 + fx + 95) / 2, (ty + fy) / 2);
      UI.callout(c, '10 M', sx - 110, sy - 80, { to: [sx, sy], p: p10m, color: P.amber });
    }
  }
}
