// scenes/sc09.ts — Chương 2 (124.48 – 146.30s): BM-21 Grad — ống dẫn hướng thành mỏng chỉ giữ góc
// trong 0.5 giây đầu, giúp xe tải 6 bánh bình thường chở được 40 ống 122mm và phóng hết trong 20 giây.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvCutaway,
  drawEnvSide,
  drawGrad,
  drawRocket,
  drawCallout,
  drawTimerBar,
} from './_assets';
import { sc08CameraAt } from './sc08';

const SWITCH_TRUCK_T = 135.6;
const GROUND_Y = 235;

// 20 mốc phóng đại diện cho loạt 40 quả đạn BM-21 Grad bắn liên thanh từ 139.2s đến 145.9s
export const GRAD_SALVO_TIMES = Array.from({ length: 20 }, (_, i) => 139.2 + i * 0.33);

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < SWITCH_TRUCK_T) {
      // ── NHỊP 1 (124.48 – 135.60s): CUTAWAY ỐNG DẪN HƯỚNG MỎNG GIỮ GÓC TRONG 0.5 GIÂY ĐẦU ──
      // Bắt đầu đúng tại camera cuối của sc08 ({ x: 0, y: 65, z: 1.72 })
      const startCam = sc08CameraAt(124.48);
      const cam = K.track(
        t,
        [
          [124.48, startCam],
          [129.5, { x: 40, y: 65, z: 1.52 }],
          [135.6, { x: 80, y: 50, z: 1.42 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawEnvCutaway(c, cam, 120);

      // Góc nghiêng nhẹ của ống dẫn hướng từ 129.5s ("pointed at the right angle for the first half-second")
      const tiltRad = A.sm(t, 129.2, 131.0) * (-18 * Math.PI / 180);
      const launchSlip = A.eo(t, 131.6, 134.8) * 440;

      c.save();
      c.translate(0, 65);
      c.rotate(tiltRad);
      c.scale(1.42, 1.42);

      drawGrad(c, { view: 'cutaway', highlight: 'tubes' });

      c.save();
      c.translate(launchSlip, 0);
      drawRocket(c, {
        variant: '122mm',
        view: 'cutaway',
        fuelLeft: 0.78,
        thrust: t >= 131.2 ? 1.0 : 0.8,
        finOpen: A.lerp(0.1, 1.0, A.sm(t, 133.2, 133.9)),
      });
      c.restore();

      c.restore();
      K.end(c);

      const cPipe = A.win(t, 125.0, 135.2, 0.35, 0.35);
      if (cPipe > 0.01) {
        const ptPipe = K.toScreen(cam, -40, 15);
        drawCallout(c, ptPipe, [0, -110], 'BM-21 GRAD · THIN GUIDE PIPE (0.5 s)', cPipe, P.amber);
      }
      return;
    }

    // ── NHỊP 2 (135.60 – 146.30s): SIDE XE TẢI 6 BÁNH CHỞ 40 ỐNG 122MM & BẮN LIÊN THANH TRONG 20 GIÂY ──
    const baseCam: K.Cam = K.track(
      t,
      [
        [135.6, { x: -40, y: 120, z: 1.88 }],
        [139.0, { x: 20, y: 95, z: 1.62 }],
        [146.3, { x: 40, y: 90, z: 1.58 }],
      ],
      A.eio
    );
    const hits: [number, number, number?][] = GRAD_SALVO_TIMES.map((t0) => [t0, 4.0, 0.18]);
    const cam = K.withShake(baseCam, t, hits);

    K.begin(c, cam);
    drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-360, 260] });

    const firedPairs = GRAD_SALVO_TIMES.filter((lt) => t >= lt).length;
    const rocketsLeft = Math.max(0, 40 - firedPairs * 2);

    // Chiếc xe tải 6 bánh BM-21 Grad đặt lớn ở (x = -80, y = GROUND_Y)
    c.save();
    c.translate(-80, GROUND_Y);
    drawGrad(c, {
      view: 'side',
      elevateDeg: 24,
      rocketsLeft,
      jacksDown: 1,
      shuttersDown: 1,
      highlight: t < 140.5 ? 'tubes' : null,
    });
    c.restore();

    // Ô trực diện mặt cắt ngang 4×10 = 40 ống 122mm ở góc trái-trên để người xem đếm rõ 40 ống đang phóng vơi dần
    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);
    c.save();
    c.translate(-340, -15);
    A.rrect(c, -125, -62, 250, 118, 8, P.paper, P.ink, lw);
    let idx = 0;
    for (let r = 0; r < 4; r++) {
      for (let col = 0; col < 10; col++) {
        const cx = -99 + col * 22;
        const cy = -35 + r * 23;
        A.circle(c, cx, cy, 8.5, P.dark, P.ink, lwIn);
        if (idx < rocketsLeft) {
          A.circle(c, cx, cy, 5, P.amber, P.ink, lwIn);
        }
        idx++;
      }
    }
    c.restore();

    // Chuỗi tên lửa phóng liên thanh (ripple-fire) rời giàn 40 ống bay vọt lên góc phải-trên
    const elevRad = (24 * Math.PI) / 180;
    const cosE = Math.cos(elevRad);
    const sinE = Math.sin(elevRad);
    const ox = -95, oy = GROUND_Y - 125;

    for (let i = 0; i < GRAD_SALVO_TIMES.length; i++) {
      const lt0 = GRAD_SALVO_TIMES[i]!;
      if (t < lt0) continue;
      const dt = t - lt0;
      const rowOff = (i % 4) * 11;
      const dist = 360 * dt + 280 * dt * dt;
      const rx = ox + dist * cosE;
      const ry = oy - rowOff - dist * sinE;

      // Luồng lửa phụt ngược ra sau đuôi ống phóng lúc vừa khai hỏa
      if (dt < 0.22) {
        A.circle(c, ox - 85 * cosE, oy - rowOff + 85 * sinE, 26 * (1 - dt / 0.22), P.amber, null, 0);
      }

      const smokeAlpha = A.clamp01(1 - dt / 2.8) * 0.75;
      A.withA(c, smokeAlpha, () => {
        A.line(c, [[ox, oy - rowOff], [rx - 35 * cosE, ry + 35 * sinE]], P.white, lwIn * 4.2);
      });

      if (dt < 1.8) {
        c.save();
        c.translate(rx, ry);
        c.rotate(-elevRad);
        c.scale(0.62, 0.62);
        drawRocket(c, { variant: '122mm', view: 'side', thrust: 1, finOpen: 1 });
        c.restore();
      }
    }

    K.end(c);

    // Callout "40 × 122 mm" & Thanh tiến độ "20 s SALVO"
    const cForty = A.win(t, 136.4, 146.1, 0.35, 0.25);
    if (cForty > 0.01) {
      const ptBank = K.toScreen(baseCam, -340, -77);
      drawCallout(c, ptBank, [0, -55], '40 × 122 mm TUBES', cForty, P.amber);
    }
    const cSalvo = A.win(t, 139.0, 146.2, 0.3, 0.25);
    if (cSalvo > 0.01) {
      drawTimerBar(
        c,
        960,
        78,
        520,
        A.clamp01((t - 139.2) / 6.7),
        '40 ROCKETS IN 20 s',
        P.amber,
        cSalvo
      );
    }
  }
}
