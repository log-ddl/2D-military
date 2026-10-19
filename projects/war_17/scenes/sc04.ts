// sc04.ts — Chương 2 (79.20–113.80s): Lớp giáp trên APC thực sự được thiết kế để chặn thứ gì?
// Nửa đầu (79.20–98.00s): Nối mượt từ chiếc APC cuối Chương 1 — không phải thanh xuyên APFSDS của xe tăng,
// mà là mảnh đạn pháo nổ chụp, mảnh cối và đạn súng máy ở hậu tuyến cách chiến hào vài km.
// Nửa sau (98.00–113.80s): Mặt cắt kỹ thuật đối chiếu khối giáp phức hợp hàng chục tấn ở mũi MBT
// với vách giáp thép cứng / nhôm hàn kèm lớp gốm cách mặt (spaced ceramic) bao quanh thân APC.
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

    if (t < CUE.stopping_tank_round) {
      // ── PHẦN A (79.20 – 98.06s): Nối mượt từ camera cuối sc03 ({ x: 165, y: -138, z: 1.42 })
      const cam = K.track(
        t,
        [
          [79.2, { x: 165, y: -138, z: 1.42 }],
          [85.0, { x: 190, y: -138, z: 1.46 }],
          [92.0, { x: 210, y: -142, z: 1.52 }],
          [98.05, { x: 220, y: -142, z: 1.55 }],
        ],
        A.eio,
      );

      K.begin(c, cam);
      V.drawSideGround(c, -800, 1200, 0, 'paved');

      // Chiếc APC 8x8 giữ nguyên vị trí x = 260 từ cuối sc03
      V.drawAPC8x8(c, {
        x: 260,
        y: 0,
        s: 1.12,
        dir: 1,
        view: 'cutaway',
        wheelRot: t * 5.0,
        rwsType: 'rws',
      });

      // 85.90–90.40s ("not been the armor-piercing dart of a tank"):
      // Thanh xuyên APFSDS bay ngang từ phải sang nhưng bị gạch chéo X (không phải mối đe dọa chính ở tuyến sau)
      const dartA = A.win(t, 85.5, 91.2, 0.4, 0.4);
      if (dartA > 0.01) {
        A.withA(c, dartA, () => {
          c.save();
          c.translate(540, -135);
          c.scale(-1, 1);
          V.drawAPFSDSDart(c, 0, 0, 1.0);
          c.restore();
          A.line(c, [[680, -135], [430, -135]], P.ink2, 3, [12, 8]);
          U.xMark(c, 540, -135, 36, A.sm(t, 87.9, 88.8), P.enemy, 7);
        });
      }

      // 90.80–97.80s ("high-explosive shell splinters, mortar fragments, and machine gun fire"):
      // Đạn nổ chụp phía trên + mảnh văng sắc nhọn & đạn súng máy bắn từ nhiều góc vào quanh vỏ APC và bật ra
      const fragPhase = A.sm(t, 90.6, 91.5);
      if (fragPhase > 0.01) {
        const bAge1 = (t - 90.8) % 2.6;
        const bAge2 = (t - 92.1) % 2.6;
        if (t >= 90.8) {
          F.explosion(c, 160, -295, 58, A.clamp01(bAge1 / 0.85), LINE.outer);
          F.smoke(c, 160, -295, bAge1, 0.75, 5, P.slate, 10);
        }
        if (t >= 92.1) {
          F.explosion(c, 370, -285, 54, A.clamp01(bAge2 / 0.85), LINE.outer);
        }

        // Các mảnh gang sắc nhọn (shell splinters) lao vào nóc và hông xe rồi bật tung tia lửa
        const hitSpots: [number, number, number][] = [
          [175, -192, -1.2],
          [245, -192, -1.5],
          [325, -192, -1.8],
          [445, -130, -2.8],
        ];
        hitSpots.forEach(([hx, hy, ang], idx) => {
          const cyc = ((t * 1.8 + idx * 0.27) % 1 + 1) % 1;
          const sx = hx - Math.cos(ang) * (1 - cyc) * 120;
          const sy = hy - Math.sin(ang) * (1 - cyc) * 120;
          if (cyc < 0.75) {
            V.drawShellFragment(c, sx, sy, 0.85, t * 8 + idx);
          } else {
            F.sparks(c, hx, hy, (cyc - 0.75) * 4, 0.85, ang + Math.PI, 1.2, idx + 1);
          }
        });
      }

      K.end(c);
      return;
    }

    // ── PHẦN B (98.06 – 113.80s): MẶT CẮT KỸ THUẬT CẬN CẢNH SO SÁNH 2 CẤU TRÚC GIÁP ──
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    K.begin(c, cam);

    // Khung chia 2 buồng thử nghiệm mặt cắt giáp lớn chiếm 85% màn hình
    // 1. BÊN TRÁI (x = -440): Giáp phức hợp cực dày ở mũi Xe tăng (Tens of tons of composite plate across the nose)
    const leftP = A.sm(t, 98.06, 99.2);
    A.withA(c, leftP, () => {
      c.save();
      c.translate(-430, 20);
      // Khung nền buồng trái
      A.rrect(c, -360, -340, 700, 640, 18, P.bg2, P.ink, LINE.outer);

      // Khối giáp phức hợp nhiều lớp dày 220px nghiêng (Composite armor block)
      A.poly(
        c,
        [
          [-40, -220],
          [190, -220],
          [110, 220],
          [-120, 220],
        ],
        P.slate,
        P.ink,
        LINE.outer,
      );
      // Các lớp gốm/thép/hợp kim dày bên trong khối giáp phức hợp
      for (let i = 1; i <= 4; i++) {
        const ox = A.lerp(-40, 190, i / 5);
        const ox2 = A.lerp(-120, 110, i / 5);
        A.line(c, [[ox, -220], [ox2, 220]], P.dark, LINE.outer);
      }

      // Đạn thanh xuyên APFSDS lao từ trái vào găm sâu trong khối giáp dày
      const dartFly = A.eio(t, 98.6, 100.2);
      const dx = A.lerp(-280, -10, dartFly);
      V.drawAPFSDSDart(c, dx, -10, 1.15);
      if (t >= 99.8) {
        F.sparks(c, -35, -10, ((t - 99.8) * 1.5) % 1, 1.3, Math.PI, 1.4, 5);
      }
      c.restore();
    });

    // 2. BÊN PHẢI (x = +430): Mặt cắt vách giáp APC (1-2 cm thép cứng / nhôm hàn + lớp gốm cách mặt bên ngoài)
    const rightP = A.sm(t, CUE.stopping_fragments, CUE.stopping_fragments + 1.2);
    if (rightP > 0.01) {
      A.withA(c, rightP, () => {
        c.save();
        c.translate(430, 20);
        A.rrect(c, -340, -340, 700, 640, 18, P.bg2, P.ink, LINE.outer);

        // Khoang trong xe có người lính ngồi an toàn bên phải vách giáp
        A.rrect(c, 75, -240, 240, 440, 10, P.paper, P.ink, LINE.inner);
        A.rrect(c, 155, -20, 120, 22, 4, P.sand, P.ink, LINE.inner);
        // Người lính ngồi trong khoang
        A.rrect(c, 185, -125, 42, 105, 10, P.olive, P.ink, LINE.outer);
        A.circle(c, 206, -155, 24, P.skin, P.ink, LINE.outer);
        c.beginPath();
        c.arc(206, -160, 27, Math.PI, 0);
        c.closePath();
        c.fillStyle = P.oliveDark;
        c.fill();
        c.stroke();

        // Lớp chính: Thép cứng / tấm nhôm hàn (High-hardness steel / welded aluminum slab)
        A.rrect(c, 15, -250, 56, 460, 6, P.olive, P.ink, LINE.outer);

        // Lớp gốm cách mặt bên ngoài (Spaced ceramic layer on the outside @ 111.30s)
        const cerP = A.eio(t, 110.5, 112.2);
        const cerX = A.lerp(-95, -42, cerP);
        if (t >= 105.5) {
          A.withA(c, A.sm(t, 105.5, 106.8), () => {
            // Các viên gạch gốm (Ceramic tiles) lắp cách mặt ngoài
            for (let k = -220; k < 200; k += 68) {
              A.rrect(c, cerX, k, 28, 62, 4, P.amber, P.ink, LINE.outer);
            }
            // Chốt giữ cách mặt (Spaced standoffs)
            for (let k = -190; k < 200; k += 136) {
              A.rrect(c, cerX + 28, k, 15 - cerX - 28, 10, 2, P.slate, P.ink, 2);
            }
          });
        }

        // Mảnh đạn pháo & đạn súng trường lao từ trái vào bị lớp gốm + vách thép/nhôm chặn đứng hoàn toàn
        const impacts: [number, number][] = [
          [102.6, -120],
          [104.2, 35],
          [107.4, -45],
          [111.8, 95],
        ];
        for (const [it, iy] of impacts) {
          const fly = A.ph(t, it - 0.6, it);
          const stopX = t >= 110.8 ? cerX - 8 : 8;
          if (fly > 0 && fly < 1) {
            V.drawShellFragment(c, A.lerp(-290, stopX, fly), iy, 1.25, t * 10);
          }
          if (t >= it && t <= it + 1.1) {
            F.sparks(c, stopX, iy, (t - it) / 1.1, 1.15, Math.PI, 1.3, Math.round(it * 10));
          }
        }

        c.restore();
      });
    }

    K.end(c);

    // Callout thông số độ dày "1–2 cm" đúng lúc voice nói "takes only a centimeter or two" @106.2s
    const pCm = A.win(t, 105.8, 113.4, 0.4, 0.4);
    if (pCm > 0.01) {
      const pt = K.toScreen(cam, 430 + 42, -250);
      U.callout(c, '1–2 cm', pt[0], pt[1] - 58, {
        to: pt,
        p: pCm,
        color: P.ink,
        size: 34,
      });
    }
  }
}
