// scenes/sc21.ts — Chương 5 (377.36 – 409.36s): Cơn ác mộng hậu cần của pháo phản lực.
// - Nhịp 1 (377.36 – 402.0s): 1 hộp Pod 6 quả nặng > 2 tấn; bắn 2 Pod trong 10 phút ném đi 4 tấn
//   phần cứng chính xác (động cơ tên lửa + cánh lái dẫn đường), đốt sạch ngân sách đạn cả tuần của lữ đoàn.
// - Nhịp 2 (402.0 – 409.36s): Chiếc HIMARS rỗng đạn nằm ẩn mình dưới tán cây thông suốt phần còn lại của ngày
//   để chờ chiếc xe tải tiếp vận đang bò tới từ xa.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawHimars,
  drawPod,
  drawRocket,
  drawSupplyTruck,
  drawCallout,
  drawTimerBar,
} from './_assets';

const GROUND_Y = 230;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const hideMix = A.eio(t, 402.0, 404.8);
    const cam: K.Cam = {
      x: A.lerp(-40, 220, hideMix),
      y: A.lerp(105, 115, hideMix),
      z: A.lerp(1.52, 1.5, hideMix),
    };

    K.begin(c, cam);

    drawEnvSide(c, cam, {
      groundY: GROUND_Y,
      showTrees: true,
      hideCanopyX: 380,
      clearZoneX: [-520, 260],
    });

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // ── NHỊP 1 (377.36 – 404.5s): BỆ CÂN 2 TẤN -> 4 TẤN TRONG 10 PHÚT & THANH NGÂN SÁCH ──
    if (hideMix < 0.99) {
      A.withA(c, 1 - hideMix, () => {
        // Chiếc HIMARS bên trái (x = -320) bắn liên tiếp 2 cơ số Pod trong 10 phút (385.5 – 393.0s)
        const launcherX = -320;
        const isFiring = t >= 385.5 && t <= 393.0;
        const rocketsLeft =
          t < 385.5 ? 6 : Math.max(0, 6 - Math.floor(((t - 385.5) / 7.5) * 6));

        c.save();
        c.translate(launcherX, GROUND_Y);
        drawHimars(c, {
          view: 'side',
          elevateDeg: 26,
          podVariant: '6x227',
          podRocketsLeft: rocketsLeft,
        });
        c.restore();

        // Đạn GMLRS bay vọt lên trời khi phóng 2 Pod
        if (isFiring) {
          const ang = (-26 * Math.PI) / 180;
          for (let i = 0; i < 6; i++) {
            const ft = 385.6 + i * 1.15;
            const dt = t - ft;
            if (dt > 0 && dt < 1.8) {
              const dist = dt * 310;
              const rx = launcherX - 20 + Math.cos(ang) * dist;
              const ry = GROUND_Y - 125 + Math.sin(ang) * dist;
              c.save();
              c.translate(rx, ry);
              c.rotate(ang);
              c.scale(0.62, 0.62);
              drawRocket(c, { variant: '227mm', view: 'side', thrust: 1, finOpen: 1 });
              c.restore();
            }
          }
        }

        // Bàn cân tải trọng công nghiệp ở x = 45, GROUND_Y
        const scaleX = 45;
        A.rrect(c, scaleX - 135, GROUND_Y - 20, 270, 20, 4, P.slate, P.ink, lw);
        A.rrect(c, scaleX - 55, GROUND_Y - 44, 110, 24, 3, P.dark, P.ink, lwIn);

        // Hộp Pod thứ nhất (> 2 TONS) hạ xuống bàn cân (378.2 – 381.2s)
        const pod1In = A.eo(t, 378.2, 381.2);
        const pod1Y = A.lerp(-120, GROUND_Y - 78, pod1In);
        const showCut = t >= 393.5;

        c.save();
        c.translate(scaleX, pod1Y);
        drawPod(c, {
          view: showCut ? 'cutaway' : 'side',
          variant: '6x227',
          rocketsLeft: 6,
          highlight: t >= 382.0 && t < 386.0,
        });
        c.restore();

        // Hộp Pod thứ hai chồng lên khi bắn 2 Pod trong 10 phút = 4 TONS (385.8s)
        if (t >= 385.8) {
          const pod2In = A.eo(t, 385.8, 388.4);
          const pod2Y = A.lerp(-180, GROUND_Y - 154, pod2In);
          A.withA(c, pod2In, () => {
            c.save();
            c.translate(scaleX, pod2Y);
            drawPod(c, {
              view: showCut ? 'cutaway' : 'side',
              variant: '6x227',
              rocketsLeft: 6,
              highlight: true,
            });
            c.restore();
          });
        }

        // Mặt cắt phóng lớn động cơ tên lửa & cánh lái dẫn đường đắt đỏ ở phía trên bên trái (393.8 – 402.0s)
        if (t >= 393.8) {
          const finIn = A.eo(t, 393.8, 396.0);
          A.withA(c, finIn, () => {
            c.save();
            c.translate(-285, -35);
            c.scale(1.05, 1.05);
            drawRocket(c, {
              variant: '227mm',
              view: 'cutaway',
              fuelLeft: 0.85,
              thrust: 0.5,
              finOpen: 1,
              canardDeg: Math.sin(t * 5) * 12,
              highlight: 'guidance',
            });
            c.restore();
          });
        }
      });
    }

    // ── NHỊP 2 (402.0 – 409.36s): NẰM TRỐN DƯỚI TÁN CÂY CHỜ XE TIẾP VẬN CẢ NGÀY ──
    if (hideMix > 0.01) {
      A.withA(c, hideMix, () => {
        // Chiếc HIMARS đã hết sạch đạn (podVariant: 'none') nằm im dưới rặng thông x = 380
        c.save();
        c.translate(380, GROUND_Y);
        drawHimars(c, {
          view: 'side',
          elevateDeg: 2,
          podVariant: 'none',
        });
        c.restore();

        // Xe tải tiếp vận (Supply Truck) bò chậm từ phía xa bên trái (-180 -> 10)
        const truckX = A.lerp(-190, 10, A.sm(t, 403.0, 409.36));
        c.save();
        c.translate(truckX, GROUND_Y);
        c.scale(0.88, 0.88);
        drawSupplyTruck(c, { podsCount: 2 });
        c.restore();
      });
    }

    K.end(c);

    // ── CALLOUTS & ĐỒNG HỒ NGÂN SÁCH TRÊN MÀN HÌNH ──
    if (hideMix < 0.95) {
      const c2Tons = A.win(t, 382.2, 387.8, 0.35, 0.35) * (1 - hideMix);
      if (c2Tons > 0.01) {
        const pt1 = K.toScreen(cam, 25, GROUND_Y - 115);
        drawCallout(c, pt1, [0, -65], '1 POD (6 ROCKETS) · > 2 TONS', c2Tons, P.amber);
      }

      const c4Tons = A.win(t, 388.0, 401.8, 0.35, 0.4) * (1 - hideMix);
      if (c4Tons > 0.01) {
        const pt2 = K.toScreen(cam, 25, GROUND_Y - 190);
        drawCallout(c, pt2, [0, -65], '2 PODS IN 10 MIN = 4 TONS HARDWARE', c4Tons, P.enemy);
      }

      const bAlpha = A.win(t, 397.2, 402.5, 0.35, 0.35) * (1 - hideMix);
      if (bAlpha > 0.01) {
        const drain = A.sm(t, 398.0, 401.8);
        drawTimerBar(
          c,
          960,
          135,
          440,
          1 - drain * 0.94,
          'WEEKLY BRIGADE AMMO BUDGET',
          P.enemy,
          bAlpha
        );
      }
    }

    if (hideMix > 0.1) {
      const cWait = A.win(t, 404.0, 409.2, 0.4, 0.25) * hideMix;
      if (cWait > 0.01) {
        const ptH = K.toScreen(cam, 380, GROUND_Y - 135);
        drawCallout(c, ptH, [0, -75], 'EMPTY · HIDING ALL DAY FOR RESUPPLY', cWait, P.amber);
      }
    }
  }
}
