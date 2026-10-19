// scenes/sc15.ts — Chương 3 (231.60 – 259.38s): Hai cơn đau đầu của pháo phản lực cổ điển:
// 1) (231.60 – 244.40s, SIDE rộng): 40 quả tên lửa để lại bức màn khói trắng khổng lồ và vệt cỏ cháy xém
//    mà mọi UAV và trinh sát viên trong bán kính 20 km đều nhìn thấy ngay lập tức.
// 2) (244.40 – 259.38s, SIDE cận vừa): Khi BM-21 Grad bắn hết ống, lính phải đứng ngoài trời bê từng quả đạn
//    nặng đút tay vào 40 ống suốt 20–30 phút đúng lúc hỏa lực phản pháo của đối phương đang bay tới!

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawGrad,
  drawSoldier,
  drawRocket,
  drawDrone,
  drawShell,
  drawExplosion,
  drawCallout,
  drawTimerBar,
} from './_assets';

const GROUND_Y = 230;

// Các quả đạn phản pháo của đối phương rơi xuống trận địa lúc lính đang nạp đạn tay (255.2 – 259.1s)
export const COUNTER_BATTERY_HITS: [number, number][] = [
  [255.8, 195],
  [257.1, 75],
  [258.3, -380],
];

export function sc15CameraAt(t: number): K.Cam {
  return K.track(
    t,
    [
      [231.6, { x: 0, y: 35, z: 1.08 }],
      [244.0, { x: 20, y: 35, z: 1.08 }],
      [246.0, { x: -135, y: 135, z: 1.72 }],
      [259.38, { x: -135, y: 135, z: 1.72 }],
    ],
    A.eio
  );
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const baseCam = sc15CameraAt(t);
    const hits: [number, number, number?][] = COUNTER_BATTERY_HITS.map(([t0]) => [t0, 12, 0.45]);
    const cam = K.withShake(baseCam, t, hits);

    K.begin(c, cam);

    // Mặt đất có mảng cỏ cháy đen (scorchedX) ngay phía sau đuôi xe BM-21 Grad
    drawEnvSide(c, cam, {
      groundY: GROUND_Y,
      showTrees: true,
      scorchedX: [-340, -140],
      clearZoneX: [-480, 260],
    });

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // ── PHẦN 1 (231.60 – 244.40s): BỨC MÀN KHÓI TRẮNG KHỔNG LỒ & UAV ĐỊCH PHÁT HIỆN TỪ 20 KM ──
    const smokeFade = 1 - A.sm(t, 244.2, 246.2);
    A.withA(c, smokeFade, () => {
      // Bức màn khói trắng khổng lồ bốc cao từ vị trí phóng
      const smokeGrow = A.sm(t, 232.0, 236.5);
      const puffs: [number, number, number][] = [
        [-240, GROUND_Y - 65, 58],
        [-180, GROUND_Y - 125, 76],
        [-95, GROUND_Y - 195, 92],
        [15, GROUND_Y - 265, 108],
        [145, GROUND_Y - 335, 118],
      ];
      for (const [px, py, pr] of puffs) {
        A.circle(c, px, py, pr * smokeGrow, P.white, P.slate, lwIn);
      }

      // UAV trinh sát của đối phương ở góc phải-trên (cự ly 20 km) quét chùm tia phát hiện đám khói (238.5 – 244.4s)
      const droneAlpha = A.sm(t, 238.2, 239.5);
      A.withA(c, droneAlpha, () => {
        c.save();
        c.translate(520, -240);
        c.scale(1.35, 1.35);
        drawDrone(c, { view: 'side', scanCone: true });
        c.restore();
        A.line(c, [[520, -230], [-95, GROUND_Y - 195]], P.enemy, lw, [12, 8]);
      });
    });

    // Xe tải BM-21 Grad đặt tại (x = -90, y = GROUND_Y); sau 244.5s hạ góc tầm thấp để lính nạp đạn bằng tay
    const elev = A.lerp(24, 8, A.sm(t, 244.4, 246.0));
    const handLoaded = t < 246.0 ? 0 : Math.floor(A.lerp(1, 6, A.ph(t, 246.5, 259.0)));
    c.save();
    c.translate(-90, GROUND_Y);
    drawGrad(c, {
      view: 'side',
      elevateDeg: elev,
      rocketsLeft: handLoaded,
      jacksDown: 1,
      shuttersDown: t < 245.0 ? 1 : 0.2,
    });
    c.restore();

    // ── PHẦN 2 (244.60 – 259.38s): LÍNH ĐỨNG NGOÀI TRỜI ĐÚT TAY TỪNG QUẢ TÊN LỬA VÀO 40 ỐNG (20–30 PHÚT) ──
    const reloadAlpha = A.sm(t, 245.2, 246.4);
    A.withA(c, reloadAlpha, () => {
      // Kiện đạn tên lửa xếp dưới đất phía sau xe (x = -380)
      A.rrect(c, -430, GROUND_Y - 28, 110, 28, 3, P.sand, P.ink, lw);
      A.rrect(c, -420, GROUND_Y - 52, 95, 24, 3, P.sand, P.ink, lw);

      // Chu kỳ 2 người lính khiêng từng quả tên lửa nặng đút vào đuôi ống BM-21 Grad
      const cycle = ((t - 246.2) % 3.4) / 3.4;
      const slideP = A.sm(cycle, 0.1, 0.85);
      const carryX = A.lerp(-315, -235, slideP);

      c.save();
      c.translate(carryX - 28, GROUND_Y);
      drawSoldier(c, { view: 'side', faction: 'ally', pose: 'carry', dir: 1, phase: t * 2 });
      c.restore();

      c.save();
      c.translate(carryX + 24, GROUND_Y);
      drawSoldier(c, { view: 'side', faction: 'ally', pose: 'carry', dir: 1, phase: t * 2 + 1 });
      c.restore();

      // Quả tên lửa 122mm đang được lính trượt bằng tay vào đuôi ống
      c.save();
      c.translate(carryX + 10, GROUND_Y - 56 - slideP * 28);
      c.rotate((-8 * Math.PI) / 180);
      c.scale(0.62, 0.62);
      drawRocket(c, { variant: '122mm', view: 'side', finOpen: 0 });
      c.restore();
    });

    // Đạn pháo phản kích của đối phương (Counter-battery fire) lao từ phải sang trái nổ chụp xuống trận địa (255.0 – 259.38s)
    for (const [tHit, hx] of COUNTER_BATTERY_HITS) {
      const flightP = (t - (tHit - 0.55)) / 0.55;
      if (flightP > 0 && flightP < 1) {
        const sx = A.lerp(hx + 220, hx, flightP);
        const sy = A.lerp(GROUND_Y - 340, GROUND_Y - 10, flightP);
        A.line(c, [[sx + 40, sy - 65], [sx, sy]], P.enemy, lwIn * 1.5, [8, 6]);
        drawShell(c, { x: sx, y: sy, rot: 2.15, scale: 0.85 });
      }
      const bp = (t - tHit) / 1.0;
      if (bp > 0 && bp < 1) {
        drawExplosion(c, hx, GROUND_Y - 6, bp, 84, 9);
      }
      if (t >= tHit) {
        A.ellipse(c, hx, GROUND_Y, 22, 5, 0, P.dark, P.ink, lwIn);
      }
    }

    K.end(c);

    // Callout 1: UAV & trinh sát phát hiện từ 20 km
    const c20km = A.win(t, 239.2, 244.2, 0.35, 0.3);
    if (c20km > 0.01) {
      const ptDrone = K.toScreen(baseCam, 520, -240);
      drawCallout(c, ptDrone, [-130, 65], 'SPOTTED FROM 20 km', c20km, P.enemy);
    }

    // Callout 2 & Thanh đồng hồ: Nạp tay 40 quả đạn mất 20–30 phút
    const cReload = A.win(t, 247.5, 259.2, 0.35, 0.25);
    if (cReload > 0.01) {
      drawTimerBar(
        c,
        960,
        78,
        560,
        A.clamp01((t - 247.5) / 11.5),
        '40 ROCKETS BY HAND: 20 – 30 MIN',
        P.enemy,
        cReload
      );
    }
  }
}
