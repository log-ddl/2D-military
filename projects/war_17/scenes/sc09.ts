// sc09.ts — Chương 3 (210.62–238.80s): Hai cơ chế sinh tồn của bánh lốp APC:
// 1) 210.62–228.50s: Hệ thống bơm xả lốp trung tâm (CTIS) điều khiển từ táp-lô — xả hơi cả 8 lốp
//    để làm bẹt vết tiếp xúc như "giày tuyết" (snowshoe) bò qua bùn cát, rồi bơm căng lại khi lên đường nhựa (tarmac).
// 2) 228.50–238.80s: Mặt cắt cận cảnh bánh xe — vòng cao su đặc (solid rubber ring / run-flat core) gắn vào mâm thép,
//    giúp xe chạy thoát khỏi ổ phục kích trên lõi trong ngay cả khi súng máy bắn nát vỏ cao su ngoài.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';
import { stateAt } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    if (t < CUE.runflat_rubber_ring - 0.15) {
      // ── PHẦN A (210.62 – 228.60s): HỆ THỐNG BƠM XẢ LỐP TRUNG TÂM (CTIS) ──
      const cam = K.track(
        t,
        [
          [210.62, { x: 0, y: -115, z: 1.48 }],
          [218.0, { x: 25, y: -95, z: 1.62 }],
          [225.5, { x: 65, y: -95, z: 1.62 }],
          [228.55, { x: 95, y: -105, z: 1.55 }],
        ],
        A.eio,
      );

      K.begin(c, cam);

      // Mặt đất chuyển từ Đường nhựa (trái) -> Bùn cát mềm (giữa: -280..480) -> Đường nhựa Tarmac (phải: > 480)
      const worldShift = A.lerp(190, -720, A.ph(t, 210.62, 228.5));
      c.save();
      c.translate(worldShift, 0);
      V.drawSideGround(c, -1200, -240, 0, 'paved');
      V.drawSideGround(c, -240, 480, 0, 'mud');
      V.drawSideGround(c, 480, 1600, 0, 'paved');
      c.restore();

      const apcX = 20;
      const flat = st.tireFlatten; // 0..1 khi đi qua bùn (217.8..225.8s)
      const wheelRot = t * 5.8;

      // Vẽ chiếc APC 8x8 với lốp biến dạng theo áp suất CTIS
      V.drawAPC8x8(c, {
        x: apcX,
        y: 0,
        s: 1.25,
        dir: 1,
        view: 'side',
        wheelRot,
        tireFlat: flat,
        rwsType: 'rws',
      });

      // Sơ đồ cơ chế đường ống khí nén CTIS nối từ Bảng điều khiển buồng lái (Dashboard) tới tâm cả 4 trục bánh xe
      const ctisShow = A.sm(t, 213.6, 214.8);
      if (ctisShow > 0.01) {
        A.withA(c, ctisShow, () => {
          const dashX = apcX + 115 * 1.25;
          const dashY = -148 * 1.25;
          // Hộp điều khiển áp suất trên táp-lô
          A.rrect(c, dashX - 24, dashY - 22, 48, 34, 6, P.paper, P.ink, LINE.outer);
          // Đồng hồ áp suất (cao = xanh sky, thấp/xả hơi = vàng amber)
          const pCol = flat > 0.35 ? P.amber : P.sky;
          A.circle(c, dashX, dashY - 5, 11, pCol, P.ink, 2);

          // Ống khí chính chạy dọc khung gầm xuống tâm 4 trục bánh
          const manifoldY = -88;
          A.line(c, [[dashX, dashY + 12], [dashX, manifoldY]], pCol, 4);
          A.line(c, [[apcX - 142 * 1.25, manifoldY], [apcX + 118 * 1.25, manifoldY]], pCol, 5);

          for (const wx of [-142, -82, 58, 118]) {
            const hubX = apcX + wx * 1.25;
            const hubY = -44 * 1.25 + flat * 12;
            A.line(c, [[hubX, manifoldY], [hubX, hubY]], pCol, 4);
            A.circle(c, hubX, hubY, 8, pCol, P.ink, 2);

            // Khi xả hơi (217.8–223.0s): luồng khí thoát ra và vệt tiếp xúc mở rộng như giày đi tuyết (snowshoe footprint)
            if (flat > 0.15) {
              const footprintW = A.lerp(42, 92, flat);
              A.rrect(c, hubX - footprintW / 2, -6, footprintW, 10, 4, P.amber, P.ink, 2);
            }
          }
        });
      }

      K.end(c);
      return;
    }

    // ── PHẦN B (228.60 – 238.80s): MẶT CẮT CẬN BÁNH XE — VÒNG CAO SU ĐẶC RUN-FLAT CHỐNG ĐẠN SÚNG MÁY ──
    const baseCam = K.track(
      t,
      [
        [228.6, { x: 0, y: -95, z: 1.85 }],
        [233.0, { x: 0, y: -90, z: 1.92 }],
        [238.8, { x: 80, y: -95, z: 1.75 }],
      ],
      A.eio,
    );
    const cam = K.withShake(baseCam, t, [
      [232.8, 10, 0.4],
      [233.5, 10, 0.4],
      [234.2, 10, 0.4],
    ]);

    K.begin(c, cam);

    V.drawSideGround(c, -1200, 1400, 0, 'dirt');

    const rollX = A.lerp(0, 95, A.eio(t, 235.2, 238.8));
    const wheelRot = t * 7.2;

    // Vẽ phần gầm xe phía trên để giữ quan hệ phần–toàn thể (Part-whole context)
    A.rrect(c, rollX - 280, -245, 560, 95, 8, P.olive, P.ink, LINE.outer);
    A.rrect(c, rollX - 260, -165, 520, 28, 4, P.oliveDark, P.ink, LINE.outer);

    // Bánh phụ phía sau để thấy cụm bogie
    V.drawWheelSide(c, rollX - 185, -82, 82, wheelRot, 0, st.tireShredded * 0.5, true);

    // BÁNH XE CHÍNH Ở TÂM KHUNG (Phóng lớn r = 86, mặt cắt mở để thấy rõ Vòng cao su đặc Run-flat gắn trên mâm thép)
    const mainX = rollX + 20;
    const mainY = -82 + st.tireShredded * 14; // Khi lốp ngoài rách, bánh hạ nhẹ xuống tì lên vòng lõi đặc Run-flat!
    V.drawWheelSide(c, mainX, mainY, 86, wheelRot, 0, st.tireShredded, true);

    // Khung ngắm bộ phận (Focus bracket) chỉ rõ vòng cao su đặc màu hổ phách bên trong (229.0–232.5s)
    const focusP = A.win(t, 229.0, 232.5, 0.35, 0.35);
    if (focusP > 0.01) {
      U.focus(c, mainX - 64, mainY - 64, 128, 128, focusP, P.amber, 4);
    }

    // Loạt đạn súng máy bắn từ ổ phục kích bên phải làm rách toạc vỏ cao su ngoài (232.60–235.28s)
    if (t >= 232.5 && t <= 235.5) {
      for (let b = 0; b < 4; b++) {
        const bp = ((t - 232.5) * 3.8 + b * 0.25) % 1;
        F.tracer(c, [mainX + 340, mainY - 25 + b * 14], [mainX + 65, mainY - 15 + b * 12], bp, 0.18, P.enemy, 4);
      }
      F.sparks(c, mainX + 62, mainY - 5, ((t - 232.5) * 4) % 1, 1.1, 0, 1.4, 7);
      F.debris(c, mainX + 40, mainY + 20, (t - 232.7) % 1.2, 0.85, 9, 13, 0, P.dark);
    }

    // Sau khi vỏ ngoài bị bắn rách (t >= 235.5s): mũi tên lực tải trọng đè lên vòng lõi đặc (inner core) và xe vẫn lăn bánh thoát đi!
    const driveOutP = A.sm(t, 235.4, 236.4);
    if (driveOutP > 0.01) {
      A.withA(c, driveOutP, () => {
        U.arrow(c, [mainX, mainY - 95], [mainX, mainY - 48], { color: P.amber, w: 5, head: 16 });
        U.arrow(c, [mainX + 95, mainY], [mainX + 165, mainY], { color: P.olive, w: 6, head: 18 });
      });
    }

    K.end(c);
  }
}
