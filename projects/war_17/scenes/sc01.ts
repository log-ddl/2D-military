// sc01.ts — Chương 1 (0.00–20.10s): Normandy 1944 — Bộ binh trên xe tải mui trần & xe bán xích
// bị sát thương bởi đạn pháo nổ chụp trên không (airburst) trước khi tới chiến hào Đức.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as R from './shared/rig';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { stateAt } from './_state';

function drawAirburst(
  c: CanvasRenderingContext2D,
  bx: number,
  by: number,
  age: number,
  targetY = -90,
) {
  if (age <= 0 || age > 3.2) return;
  const p = A.clamp01(age / 1.1);
  // Quả nổ trên không
  F.explosion(c, bx, by, 72, p, LINE.outer);
  F.smoke(c, bx, by, age, 0.9, 6, P.slate, 12);

  // Chùm mảnh đạn hình nón chụp thẳng xuống thùng xe hở bên dưới
  const coneP = A.clamp01(age / 0.85);
  const fade = 1 - A.sm(age, 0.7, 2.2);
  if (fade > 0.01) {
    A.withA(c, fade * 0.25, () => {
      A.poly(
        c,
        [
          [bx, by],
          [bx - 165 * coneP, A.lerp(by, targetY, coneP)],
          [bx + 165 * coneP, A.lerp(by, targetY, coneP)],
        ],
        P.enemy,
        null,
        0,
      );
    });
    for (let i = -4; i <= 4; i++) {
      const ang = Math.PI * 0.5 + i * 0.13;
      const d0 = 25 + coneP * 85;
      const d1 = Math.min(targetY - by, d0 + 68);
      if (d1 > d0) {
        A.line(
          c,
          [
            [bx + Math.cos(ang) * d0, by + Math.sin(ang) * d0],
            [bx + Math.cos(ang) * d1, by + Math.sin(ang) * d1],
          ],
          i % 2 === 0 ? P.enemy : P.amber,
          3.5,
        );
      }
    }
  }
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    // Camera nhìn ngang: mở toàn cảnh thấy cả đoàn xe và chiến hào Đức bên phải,
    // sau đó tiến dần vào đoàn xe mui trần và bán xích dưới mưa đạn nổ chụp.
    const baseCam = K.track(
      t,
      [
        [0.0, { x: 20, y: -125, z: 1.12 }],
        [6.5, { x: 60, y: -128, z: 1.16 }],
        [12.5, { x: -35, y: -132, z: 1.38 }],
        [20.1, { x: 35, y: -130, z: 1.32 }],
      ],
      A.eio,
    );
    const cam = K.withShake(baseCam, t, [
      [4.5, 14, 0.55],
      [13.4, 16, 0.65],
      [16.1, 16, 0.65],
    ]);

    K.begin(c, cam);

    // Mặt đất Normandy + Cột mốc Tuyến xuất phát (Start line) + Chiến hào Đức bên phải
    V.drawSideGround(c, -1600, 1600, 0, 'dirt');

    // Chiến hào quân Đức ở phía phải (x = 760)
    A.poly(
      c,
      [
        [670, 0],
        [705, -34],
        [745, -34],
        [760, 48],
        [860, 48],
        [875, -28],
        [940, 0],
      ],
      P.oliveDark,
      P.ink,
      LINE.outer,
    );
    // Hàng bao cát công sự Đức
    for (let i = 0; i < 3; i++) {
      A.rrect(c, 695 + i * 16, -46, 22, 14, 5, P.sand, P.ink, LINE.inner);
    }
    R.rig(c, { x: 795, y: 24, s: 0.85, dir: -1, skin: 'foe', aim: 0.08, weapon: 'rifle' });
    R.rig(c, { x: 842, y: 24, s: 0.85, dir: -1, skin: 'foe', aim: 0.12, weapon: 'rifle' });

    // Vạch tuyến xuất phát (Start line @ x = 420)
    A.line(c, [[420, 0], [420, -290]], P.ink2, 3, [12, 10]);

    // Đoàn xe hành quân tiến sang phải: Xe bán xích M3 đi trước, Xe tải mui trần đi sau
    const truckX = st.convoyX - 250;
    const halfTrackX = st.convoyX + 165;
    const wheelRot = t * 5.2;

    V.drawOpenTruck(c, {
      x: truckX,
      y: 0,
      s: 1.0,
      dir: 1,
      view: 'side',
      wheelRot,
      troopsAlive: st.truckAlive,
    });

    V.drawHalfTrack(c, {
      x: halfTrackX,
      y: 0,
      s: 1.0,
      dir: 1,
      view: 'side',
      phase: wheelRot,
      troopsAlive: st.halfTrackAlive,
    });

    // Bụi bánh xe lăn
    F.dust(c, truckX - 135, 0, (t * 1.4) % 1, 0.8);
    F.dust(c, halfTrackX - 130, 0, (t * 1.4 + 0.4) % 1, 0.8);

    // Ở 8.46–12.42s ("not dying primarily from tank duels or sniper fire"):
    // Đường ngắm bắn thẳng ngang từ chiến hào bị gạch chéo X (không phải nguyên nhân chính)
    const directFireA = A.win(t, 8.5, 12.5, 0.4, 0.4);
    if (directFireA > 0.01) {
      A.withA(c, directFireA, () => {
        A.line(c, [[690, -78], [halfTrackX + 140, -78]], P.ink2, 3.5, [14, 10]);
        U.xMark(c, 535, -78, 26, A.sm(t, 9.2, 10.0), P.enemy, 6);
      });
    }

    // Quỹ đạo đạn pháo bắn cầu vồng từ xa bên phải tới điểm nổ chụp ngay trên đầu đoàn xe
    // Quả 1: mở hook ở 4.5s ("watching his infantry get cut to pieces before they even reached the German trenches")
    F.arcShot(c, [980, -40], [halfTrackX - 20, -265], A.ph(t, 3.5, 4.5), 140, {
      color: P.enemy,
      w: 4,
      trail: t < 5.2,
    });
    drawAirburst(c, halfTrackX - 20, -265, t - 4.5, -75);

    // Quả 2 & 3: giải thích trực diện ở 12.6–19.8s ("killed by artillery shells bursting in the air above the open trucks and lightly armored half-tracks")
    F.arcShot(c, [960, -40], [truckX - 30, -260], A.ph(t, 12.4, 13.4), 150, {
      color: P.enemy,
      w: 4,
      trail: t < 14.3,
    });
    drawAirburst(c, truckX - 30, -260, t - 13.4, -75);

    F.arcShot(c, [960, -40], [halfTrackX - 35, -255], A.ph(t, 15.1, 16.1), 145, {
      color: P.enemy,
      w: 4,
      trail: t < 17.0,
    });
    drawAirburst(c, halfTrackX - 35, -255, t - 16.1, -75);

    K.end(c);

    // Callout duy nhất ở mở đầu để định vị bối cảnh lịch sử "1944" theo mốc từ voice @0.64
    const p1944 = A.win(t, 0.5, 4.2, 0.35, 0.4);
    if (p1944 > 0.01) {
      const pt = K.toScreen(cam, truckX, -195);
      U.callout(c, '1944', pt[0], pt[1] - 55, { to: pt, p: p1944, color: P.ink, size: 34 });
    }
  }
}
