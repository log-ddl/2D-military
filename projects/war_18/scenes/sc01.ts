// scenes/sc01.ts — Chương 1 (0.00 – 12.14s): Quy luật đồng hồ 10 giây trên chiến trường.
// Góc nhìn SIDE mặt cắt ngang mặt đất & chiến hào: 9 người lính đứng lộ ngoài trời,
// 2/3 (6/9 người) gục ngã bởi mảnh văng ngang ngay trong 5–10 giây đầu khi chưa kịp nhảy xuống hào.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvSide,
  drawTrench,
  drawHowitzer,
  drawSoldier,
  drawShell,
  drawExplosion,
  drawArrow,
  drawCallout,
  drawTimerBar,
} from './_assets';
import { trenchSoldiersAt, ch1TenSecProgress } from './_state';

const GROUND_Y = 220;

export function sc01CameraAt(t: number): K.Cam {
  return K.track(
    t,
    [
      [0.0, { x: -30, y: 175, z: 1.56 }],
      [5.0, { x: -10, y: 175, z: 1.54 }],
      [12.14, { x: 85, y: 185, z: 1.52 }],
    ],
    A.eio
  );
}

// Danh sách các quả đạn rơi trong cửa sổ 10 giây đầu (t0 = lúc chạm đất phát nổ, x = vị trí nổ)
const OPENING_STRIKES: [number, number][] = [
  [0.25, -460],
  [2.65, -340],
  [4.85, -220],
  [6.55, -110],
  [8.15, -15],
  [9.65, 65],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const hits: [number, number, number?][] = OPENING_STRIKES.map(([t0]) => [t0, 12, 0.45]);
    const baseCam = sc01CameraAt(t);
    const cam = K.withShake(baseCam, t, hits);

    K.begin(c, cam);

    // Nền mặt cắt ngang + chiến hào bên phải (x = 260..520, sâu 100px xuống y = 320), không đặt cây đè lên miệng hào
    drawEnvSide(c, cam, { groundY: GROUND_Y, showTrees: true, clearZoneX: [-750, 560] });
    drawTrench(c, 260, GROUND_Y, 260, 100, 'side');

    // Khẩu pháo nòng ở x = -680 luôn hiện diện trong cùng thế giới với sc02 để chỗ nối 12.14s liền mạch tuyệt đối
    c.save();
    c.translate(-680, GROUND_Y);
    drawHowitzer(c, { view: 'side', elevateDeg: 22 });
    c.restore();

    // Vẽ 9 người lính đối phương theo hàm state chung xuyên sc01 -> sc02
    const soldiers = trenchSoldiersAt(t);
    for (const s of soldiers) {
      c.save();
      c.translate(s.x, s.y);
      drawSoldier(c, {
        view: 'side',
        faction: 'enemy',
        pose: s.pose,
        dir: s.dir,
        phase: t * 1.4 + s.id * 0.7,
      });
      c.restore();
    }

    // Đạn bay rơi chéo từ bầu trời trái xuống và phát nổ, phóng mảnh văng ngang sát mặt đất
    const lwIn = A.px(c, LINE.inner);
    for (const [tHit, hx] of OPENING_STRIKES) {
      const flightP = (t - (tHit - 0.55)) / 0.55;
      if (flightP > 0 && flightP < 1) {
        const sx = A.lerp(hx - 240, hx, flightP);
        const sy = A.lerp(GROUND_Y - 380, GROUND_Y - 10, flightP);
        A.line(c, [[sx - 45, sy - 70], [sx, sy]], P.ink2, lwIn, [8, 6]);
        drawShell(c, { x: sx, y: sy, rot: 0.98, scale: 0.82 });
      }

      const blastP = (t - tHit) / 1.05;
      if (blastP > 0 && blastP < 1) {
        drawExplosion(c, hx, GROUND_Y - 6, blastP, 86, 10);
        const rayAlpha = 1 - A.sm(blastP, 0.35, 1.0);
        A.withA(c, rayAlpha, () => {
          const reach = A.lerp(30, 165, A.eo(blastP, 0, 0.7));
          drawArrow(c, [hx + 15, GROUND_Y - 26], [hx + reach, GROUND_Y - 24], P.amber, lwIn * 1.3, 10);
        });
      }

      if (t >= tHit) {
        A.ellipse(c, hx, GROUND_Y, 22, 5, 0, P.dark, P.ink, lwIn);
      }
    }

    K.end(c);

    // Thanh đồng hồ cửa sổ 10 giây đầu trên đỉnh màn hình
    const tenProg = ch1TenSecProgress(t);
    drawTimerBar(c, 960, 78, 520, tenProg, '0 – 10 s', P.amber, A.sm(t, 0.2, 0.8));

    // Callout tối giản: "2/3" thương vong trong "5–10 s" đầu
    const callAlpha = A.win(t, 6.2, 11.8, 0.4, 0.4);
    if (callAlpha > 0.01) {
      const ptTwoThirds = K.toScreen(baseCam, -210, GROUND_Y - 18);
      drawCallout(c, ptTwoThirds, [0, -110], '2/3 (6 / 9)', callAlpha, P.enemy);
    }
  }
}
