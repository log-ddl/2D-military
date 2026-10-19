// sc10.ts — Chương 4 (238.80–275.20s): Nguy hiểm dưới gầm xe bánh lốp — Mìn & IED chôn trên đường:
// 1) 238.80–246.80s: Góc nhìn SIDE mặt cắt lòng đường cho thấy mìn và bom tự chế (IED) chôn ngay dưới vệt bánh xe.
// 2) 246.80–275.20s: Góc nhìn FRONT mặt cắt trực diện đặt cạnh nhau:
//    - Bên trái: Xe đáy phẳng cũ (flat-bottomed carrier) nhốt sóng nổ dội vuông góc biến sàn thành búa đập dưới chân lính.
//    - Bên phải: Xe 8 bánh hiện đại gầm cao đáy chữ V / chữ V kép (shallow V or double V profile) lái luồng sóng nổ sang hai bên,
//      đồng thời cụm trục bánh xe bung rời có chủ đích (break away cleanly) mang theo năng lượng nổ để giữ nguyên khoang lính.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.flat_bottom_traps_blast - 0.15) {
      // ── PHẦN A (238.80 – 246.85s): GÓC SIDE — Phát hiện mìn & IED chôn dưới lòng đường ──
      const cam = K.track(
        t,
        [
          [238.8, { x: 40, y: -90, z: 1.48 }],
          [243.5, { x: 110, y: -65, z: 1.56 }],
          [246.8, { x: 140, y: -60, z: 1.62 }],
        ],
        A.eio,
      );

      K.begin(c, cam);
      V.drawSideGround(c, -1200, 1400, 0, 'dirt');

      // Chiếc APC 8x8 gầm cao đang lăn bánh tiến tới vị trí chôn mìn
      const apcX = A.lerp(-140, 65, A.eio(t, 238.8, 246.8));
      V.drawAPC8x8(c, {
        x: apcX,
        y: 0,
        s: 1.22,
        dir: 1,
        view: 'side',
        wheelRot: t * 5.2,
        rwsType: 'rws',
      });

      // Mặt cắt xuyên lòng đất (x = 180..360) để lộ Quả mìn chống tăng & Quả bom tự chế (IED) chôn ngầm
      const mineShow = A.sm(t, 241.8, 243.2);
      if (mineShow > 0.01) {
        A.withA(c, mineShow, () => {
          // Hốc đất mặt cắt dưới mặt đường
          A.rrect(c, 165, 2, 220, 74, 10, P.paper, P.ink, LINE.inner);
          // Quả mìn đĩa tròn (Landmine)
          A.rrect(c, 195, 18, 56, 24, 6, P.enemy, P.ink, LINE.outer);
          A.rrect(c, 211, 10, 24, 10, 3, P.amber, P.ink, 2);
          // Quả đạn pháo cải tạo làm IED nối dây kích nổ
          A.rrect(c, 285, 22, 72, 28, 12, P.enemyLight, P.ink, LINE.outer);
          A.line(c, [[357, 36], [420, 12]], P.enemy, 3, [6, 5]);
          U.ring(c, 223, 24, 58, ((t - 242) * 1.4) % 1, P.enemy, 4);
        });
      }

      K.end(c);
      return;
    }

    // ── PHẦN B (246.85 – 275.20s): GÓC FRONT MẶT CẮT TRỰC DIỆN — ĐÁY PHẲNG VS ĐÁY CHỮ V + TRỤC BÁNH TỰ BUNG ──
    const baseCam = K.track(
      t,
      [
        [246.85, { x: -240, y: -125, z: 1.38 }],
        [254.8, { x: -240, y: -125, z: 1.38 }],
        [256.8, { x: 20, y: -130, z: 1.24 }],
        [267.0, { x: 85, y: -130, z: 1.24 }],
        [275.2, { x: 85, y: -130, z: 1.24 }],
      ],
      A.eio,
    );
    const cam = K.withShake(baseCam, t, [
      [249.2, 16, 0.65],
      [261.2, 16, 0.65],
      [268.8, 18, 0.7],
    ]);

    K.begin(c, cam);
    V.drawSideGround(c, -1400, 1400, 0, 'dirt');

    // 1. BÊN TRÁI (x = -330): Xe bọc thép ĐÁY PHẲNG kiểu cũ (Older flat-bottomed carrier)
    const flatX = -330;
    const flatBlastAge = t - 249.2;
    const flatBuckle = A.sm(t, 249.2, 250.2);

    // Quả mìn dưới bụng xe đáy phẳng trước khi nổ
    if (t < 249.5) {
      A.rrect(c, flatX - 26, -4, 52, 18, 4, P.enemy, P.ink, LINE.inner);
    }
    if (flatBlastAge > 0 && flatBlastAge < 3.2) {
      F.explosion(c, flatX, -18, 82, A.clamp01(flatBlastAge / 1.0), LINE.outer);
      F.smoke(c, flatX, -35, flatBlastAge, 0.9, 5, P.slate, 8);
    }

    V.drawAPC8x8(c, {
      x: flatX,
      y: 0,
      s: 1.22,
      dir: 1,
      view: 'front',
      hullShape: 'flat',
      wheelBreakP: flatBuckle * 0.25,
    });

    // Mũi tên sóng xung kích bị nhốt đập vuông góc thẳng lên sàn phẳng ("turning the hull floor into a hammer")
    const trapArrowA = A.win(t, 249.3, 255.2, 0.25, 0.4);
    if (trapArrowA > 0.01) {
      A.withA(c, trapArrowA, () => {
        for (const ox of [-55, 0, 55]) {
          U.arrow(c, [flatX + ox, -12], [flatX + ox, -102], { color: P.enemy, w: 6, head: 18 });
        }
        U.xMark(c, flatX, -185, 42, A.sm(t, 252.8, 253.8), P.enemy, 7);
      });
    }

    // 2. BÊN PHẢI (x = +290): Xe 8 bánh hiện đại GẦM CAO + ĐÁY CHỮ V / CHỮ V KÉP (Shallow V or double V profile)
    const vHullP = A.sm(t, CUE.v_hull_profile - 0.3, CUE.v_hull_profile + 1.0);
    if (vHullP > 0.01) {
      const vX = 290;
      const isDoubleV = t >= 260.4 && t <= 262.2;
      // Cụm bánh xe bung rời ở t = 268.8s ("Even the wheel stations are designed to break away cleanly in a big explosion")
      const wheelBrk = A.eio(t, 268.8, 270.4);

      // Quả mìn dưới đáy chữ V
      if (t < 261.4 || (t > 266.8 && t < 269.0)) {
        A.rrect(c, vX - 26, -4, 52, 18, 4, P.enemy, P.ink, LINE.inner);
      }

      // Vụ nổ 1 dưới đáy chữ V (261.2s) & Vụ nổ 2 lớn dưới bánh xe làm bung trục bánh (268.8s)
      for (const [bt, bxOff, rad] of [
        [261.2, 0, 86],
        [268.8, -110, 96],
      ] as const) {
        const age = t - bt;
        if (age > 0 && age < 2.8) {
          F.explosion(c, vX + bxOff, -18, rad, A.clamp01(age / 0.95), LINE.outer);
          F.smoke(c, vX + bxOff, -35, age, 0.9, 5, P.slate, 10);
        }
      }

      A.withA(c, vHullP, () => {
        V.drawAPC8x8(c, {
          x: vX,
          y: 0,
          s: 1.25,
          dir: 1,
          view: 'front',
          hullShape: isDoubleV ? 'doubleV' : 'v',
          wheelBreakP: wheelBrk,
        });
      });

      // Luồng sóng nổ và khí nóng bị hai má nghiêng chữ V lái trượt sang hai bên ("deflecting the blast wave and hot gas outward to the sides")
      const deflectA = A.win(t, 261.3, 274.8, 0.3, 0.4);
      if (deflectA > 0.01) {
        A.withA(c, deflectA, () => {
          U.pathArrow(
            c,
            [
              [vX - 10, -18],
              [vX - 45, -88],
              [vX - 195, -175],
            ],
            { p: A.sm(t, 261.3, 262.4), color: P.amber, w: 6, head: 20 },
          );
          U.pathArrow(
            c,
            [
              [vX + 10, -18],
              [vX + 45, -88],
              [vX + 195, -175],
            ],
            { p: A.sm(t, 261.3, 262.4), color: P.amber, w: 6, head: 20 },
          );
        });
      }

      // Khi trục bánh xe bung rời (268.8s+): mũi tên chỉ năng lượng nổ đi theo bánh xe văng ra ngoài thay vì vặn xoắn cabin
      if (wheelBrk > 0.05) {
        U.arrow(
          c,
          [vX - 160, -65],
          [vX - 310, -125],
          { p: wheelBrk, color: P.amber, w: 5, head: 18 },
        );
      }
    }

    K.end(c);

    // Callout chữ "V" chỉ vào đáy chữ V đúng lúc voice đọc @259.94s
    const pV = A.win(t, 258.5, 266.5, 0.35, 0.4);
    if (pV > 0.01) {
      const pt = K.toScreen(cam, 250, -110);
      U.callout(c, 'V-Hull', pt[0], pt[1] + 75, {
        to: pt,
        p: pV,
        color: P.amber,
        size: 34,
      });
    }
  }
}
