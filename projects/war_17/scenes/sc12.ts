// sc12.ts — Chương 4 (304.00–337.28s): Bơi vượt sông & Nghịch lý bố cục động cơ Phương Tây vs Liên Xô (BTR):
// 1) 304.00–313.50s: Góc nhìn SIDE — APC 8 bánh hạ tấm chắn sóng ở mũi (trim board) và quay 2 chân vịt phụt nước ở đuôi (twin water jets) bơi qua sông.
// 2) 313.50–326.00s: Góc nhìn TOP mặt cắt ngang đặt cạnh nhau —
//    - Bên trái: Thiết kế phương Tây (Western design) đặt động cơ ở phía trước để bộ binh đi bộ ra bằng bửng sau rộng.
//    - Bên phải: Dòng BTR-60/70/80 Liên Xô đặt động cơ ở đuôi xe để cân bằng dưới nước, bít kín cửa sau.
// 3) 326.00–337.28s: Góc nhìn CUTAWAY / SIDE cận chiếc BTR-80 — bộ binh phải chui qua khe cửa hẹp kẹp giữa bánh thứ 2 và 3
//    ("battlefield gymnastics"), khiến lính trong thực chiến leo hẳn lên ngồi trên nóc xe (ride on the roof) thay vì ngồi trong giáp.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as R from './shared/rig';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';
import { stateAt } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    if (t < CUE.western_front_engine - 0.1) {
      // ── PHẦN A (304.00 – 313.50s): GÓC SIDE — Hạ tấm chắn sóng (Trim board) & Phụt nước (Water jets) bơi qua sông ──
      const cam = K.track(
        t,
        [
          [304.0, { x: -120, y: -90, z: 1.38 }],
          [308.5, { x: 20, y: -85, z: 1.44 }],
          [313.5, { x: 140, y: -85, z: 1.38 }],
        ],
        A.eio,
      );

      K.begin(c, cam);

      // Hai bờ sông và lòng sông rộng ở giữa (x = -380..420)
      A.rrect(c, -1200, 0, 820, 320, 0, P.bg2, P.ink, LINE.outer);
      A.rrect(c, 420, 0, 820, 320, 0, P.bg2, P.ink, LINE.outer);
      // Lòng sông chứa nước màu xanh nhạt
      A.rrect(c, -380, 18, 800, 240, 0, '#bfe0f2', null, 0);

      // Chiếc APC 8x8 nổi trên mặt nước (mặt nước ở y = 18, thân xe chìm một nửa xuống y = 78)
      const swimX = A.lerp(-240, 210, st.swimProgress);
      const bobY = 74 + Math.sin(t * 3.8) * 5;
      const trimP = A.sm(t, 304.5, 306.5);
      const jetP = A.sm(t, 307.5, 309.0);

      V.drawAPC8x8(c, {
        x: swimX,
        y: bobY,
        s: 1.22,
        dir: 1,
        view: 'side',
        wheelRot: t * 6.5,
        rwsType: 'rws',
        trimBoard: trimP,
        waterJet: jetP,
      });

      // Lớp sóng mặt nước bán trong suốt đè lên nửa dưới bánh xe để tạo cảm giác xe đang bơi nổi thật
      A.withA(c, 0.58, () => {
        A.rrect(c, -380, 18, 800, 95, 0, P.sky, null, 0);
      });
      A.line(c, [[-380, 18], [420, 18]], P.ink, LINE.outer);

      // Bọt sóng trước tấm chắn mũi (trim board) và luồng phụt nước ở đuôi (twin water jets)
      if (trimP > 0.2) {
        A.circle(c, swimX + 245, 16, 14 + Math.sin(t * 10) * 3, P.white, P.sky, 2);
      }
      if (jetP > 0.2) {
        for (let k = 0; k < 3; k++) {
          const jx = swimX - 240 - ((t * 140 + k * 35) % 95);
          A.circle(c, jx, 22 + (k - 1) * 8, 9, P.white, P.sky, 2);
        }
      }

      K.end(c);
      return;
    }

    if (t < CUE.cramped_middle_hatches - 0.1) {
      // ── PHẦN B (313.50 – 326.00s): GÓC TOP MẶT CẮT NGANG ĐẶT CẠNH NHAU — Phương Tây (Động cơ trước) vs BTR Liên Xô (Động cơ sau) ──
      const cam: K.Cam = { x: 0, y: 0, z: 1.18 };
      K.begin(c, cam);

      // 1. BÊN TRÁI (x = -380): Thiết kế Phương Tây (Western design) — Động cơ đặt ở mũi, bửng sau mở rộng cho lính bước ra
      c.save();
      c.translate(-380, 0);
      V.drawAPC8x8(c, { x: 0, y: 0, s: 1.38, dir: 1, view: 'top', rampOpen: 1 });
      // Mũi tên xanh dẫn đường bộ binh bước thẳng ra từ bửng sau rộng
      const walkOutP = A.sm(t, 315.2, 317.2);
      if (walkOutP > 0.01) {
        U.arrow(c, [-190, 0], [-345, 0], { p: walkOutP, color: P.oliveDark, w: 7, head: 22 });
        A.circle(c, -295, -26, 16, P.olive, P.ink, 2.5);
        A.circle(c, -295, 26, 16, P.olive, P.ink, 2.5);
      }
      c.restore();

      // 2. BÊN PHẢI (x = +380): Dòng BTR-60/70/80 Liên Xô — Động cơ đặt ở đuôi xe (Engine at the back) bít kín lối ra sau!
      const btrAppear = A.sm(t, CUE.soviet_btr_rear_engine - 0.5, CUE.soviet_btr_rear_engine + 0.8);
      if (btrAppear > 0.01) {
        A.withA(c, btrAppear, () => {
          c.save();
          c.translate(380, 0);
          V.drawBTR80(c, { x: 0, y: 0, s: 1.38, dir: 1, view: 'top', sideHatchOpen: A.sm(t, 323.5, 325.0) });
          // Dấu X đỏ ở đuôi xe vì động cơ đã chặn mất bửng sau
          U.xMark(c, -165, 0, 42, A.sm(t, 322.5, 323.6), P.enemy, 7);
          c.restore();
        });
      }

      K.end(c);

      // Callout phân biệt rõ "BTR-80" bên phải đúng lúc voice đọc @321.64s
      const pBtr = A.win(t, 318.5, 325.8, 0.35, 0.35);
      if (pBtr > 0.01) {
        const pt = K.toScreen(cam, 380, -135);
        U.callout(c, 'BTR-60 / 70 / 80', pt[0], pt[1] - 48, {
          to: pt,
          p: pBtr,
          color: P.ink,
          size: 32,
        });
      }
      return;
    }

    // ── PHẦN C (326.00 – 337.28s): GÓC CUTAWAY / SIDE CẬN CHIẾC BTR-80 — Cửa hông kẹp giữa bánh xe & Lính ngồi trên nóc ──
    const cam = K.track(
      t,
      [
        [326.0, { x: -20, y: -115, z: 1.62 }],
        [331.5, { x: -15, y: -125, z: 1.56 }],
        [337.28, { x: 0, y: -145, z: 1.48 }],
      ],
      A.eio,
    );

    K.begin(c, cam);
    V.drawSideGround(c, -1200, 1200, 0, 'dirt');

    const hatchOpen = A.sm(t, 326.1, 327.2);
    const roofRiders = A.sm(t, CUE.ride_on_the_roof - 0.3, CUE.ride_on_the_roof + 1.2);

    V.drawBTR80(c, {
      x: 0,
      y: 0,
      s: 1.35,
      dir: 1,
      view: 'cutaway',
      wheelRot: t < 332.5 ? 0 : (t - 332.5) * 5.0,
      sideHatchOpen: hatchOpen,
      roofRiders,
    });

    // Khung ngắm màu cam chỉ rõ khe cửa hông chật hẹp kẹp ngay giữa bánh thứ 2 và bánh thứ 3 ("wedged right between the middle wheels")
    const hatchFocus = A.win(t, 326.5, 332.4, 0.35, 0.35);
    if (hatchFocus > 0.01) {
      U.focus(c, -85, -195, 118, 145, hatchFocus, P.amber, 4);
      // Thêm một người lính đang vắt người chui khó nhọc qua khe bánh xe ("a piece of battlefield gymnastics")
      R.rig(c, {
        x: -68,
        y: -15,
        s: 0.92,
        dir: -1,
        skin: 'ally',
        aim: -0.65,
        walk: t * 8,
      });
    }

    K.end(c);
  }
}
