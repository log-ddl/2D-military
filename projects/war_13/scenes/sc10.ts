import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc10 (252.92–277.10s): Chương 3 (Phần 4) — Bản cập nhật phần mềm & Tốc độ viết lại Bảng tín hiệu
 * - 252.92–264.20s: Một kỹ thuật hiệu quả tháng này sang tháng sau thất bại vì đối phương tìm ra lỗ hổng và đóng lại bằng bản cập nhật phần mềm.
 * - 264.20–277.10s: Đối chiếu trực diện 2 Bảng tra cứu tín hiệu (Signal Lookup Table):
 *   + Bên trái: Viết lại ngay khi nghe thấy sóng mới -> nhận diện và khóa chặn tức thời.
 *   + Bên phải: Mất cả năm mới cập nhật ("table of what the enemy used to do") -> sóng mới đi xuyên qua không bị nhận diện.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(
      t,
      [
        [252.92, { x: 0, y: 0, z: 1.04 }],
        [264.2, { x: 0, y: 0, z: 1.0 }],
        [277.1, { x: 0, y: 0, z: 1.0 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawMapEnv(c, cam, { ridge: false });

    // Giữ neo vật thể thật (Máy bay Jammer bên trái <-> Đài Radar bên phải) phía trên bảng phần mềm
    c.save();
    c.translate(-520, -340);
    U.drawStandoffJammerJet(c, { view: 'side', scale: 1.15, podsActive: true });
    c.restore();
    c.save();
    c.translate(540, -310);
    U.drawSamRadarSite(c, { view: 'side', scale: 1.05 });
    c.restore();
    U.drawSignalLink(c, [-360, -330], [450, -345], t, {
      color: P.amber,
      mode: 'wave',
      amp: 9,
      speed: 2.8,
      progress: 1,
    });

    const comparePhase = A.sm(t, CUE.c3_table_signals - 0.3, CUE.c3_table_signals + 0.6);

    if (comparePhase < 0.98) {
      // ── PHA 1 (252.92–264.20s): LỖ HỔNG (GAP) BỊ ĐÓNG LẠI BẰNG SOFTWARE UPDATE ──
      const patchP = A.eio(t, CUE.c3_software_update - 1.2, CUE.c3_software_update + 0.8);
      A.withA(c, 1 - comparePhase, () => {
        const bx = 0;
        const by = 0;
        const bw = 720;
        const bh = 380;

        A.rrect(c, bx - bw / 2 - 8, by - bh / 2 - 8, bw + 16, bh + 16, 14, P.dark, P.ink, lwO);
        A.rrect(c, bx - bw / 2, by - bh / 2, bw, bh, 10, P.paper, P.ink, lwI);

        // 4 hàng bộ lọc tần số trong phần mềm radar/jammer (Hàng 3 ban đầu bị hở, sau đó được vá bằng khối amber/olive)
        for (let r = 0; r < 4; r++) {
          const ry = by - 120 + r * 80;
          const isGapRow = r === 2;
          if (!isGapRow) {
            A.rrect(c, bx - 120, ry - 24, 240, 48, 8, P.olive, P.ink, lwO);
          } else {
            // Khe hở được đóng sập lại khi patchP -> 1
            const gapW = A.lerp(180, 0, patchP);
            const blockW = (240 - gapW) / 2;
            A.rrect(c, bx - 120, ry - 24, blockW, 48, 6, P.amber, P.ink, lwO);
            A.rrect(c, bx + 120 - blockW, ry - 24, blockW, 48, 6, P.amber, P.ink, lwO);
          }

          // Luồng sóng tấn công thử đi qua hàng 3
          if (isGapRow) {
            const stopX = patchP > 0.6 ? bx - 125 : bx + 310;
            U.drawSignalLink(c, [bx - 320, ry], [stopX, ry], t, {
              color: P.enemy,
              mode: 'wave',
              amp: 11,
              speed: 3.0,
              progress: 1,
            });
            if (patchP > 0.6) {
              A.circle(c, bx - 125, ry, 20, P.amber, P.ink, lwO);
            }
          }
        }
      });
    }

    // ── PHA 2 (264.20–277.10s): ĐỐI CHIẾU 2 BẢNG TRA CỨU TÍN HIỆU (NHANH vs CHẬM 1 NĂM) ──
    if (comparePhase > 0.02) {
      const rewriteP = A.sm(t, CUE.c3_speed_rewriting - 0.5, CUE.c3_speed_rewriting + 1.2);
      const yearP = A.sm(t, CUE.c3_year_to_update - 0.4, CUE.c3_year_to_update + 1.0);

      A.withA(c, comparePhase, () => {
        const panels: { cx: number; fast: boolean }[] = [
          { cx: -370, fast: true },
          { cx: 370, fast: false },
        ];

        for (const p of panels) {
          const pw = 580;
          const ph = 460;
          A.rrect(c, p.cx - pw / 2 - 8, -ph / 2 - 8, pw + 16, ph + 16, 14, P.dark, P.ink, lwO);
          A.rrect(c, p.cx - pw / 2, -ph / 2, pw, ph, 10, P.paper, P.ink, lwI);

          // Thanh trạng thái tốc độ cập nhật trên đầu bảng
          A.rrect(
            c,
            p.cx - pw / 2 + 24,
            -ph / 2 + 22,
            pw - 48,
            44,
            8,
            p.fast ? P.olive : P.enemyLight,
            P.ink,
            lwO
          );
          // Thanh tiến độ ghi lại dữ liệu (bên trái chạy vọt 100%, bên phải nhích cực chậm)
          const progW = (pw - 64) * (p.fast ? A.lerp(0.25, 1.0, rewriteP) : 0.14);
          A.rrect(
            c,
            p.cx - pw / 2 + 32,
            -ph / 2 + 30,
            progW,
            28,
            5,
            p.fast ? P.sky : P.slate,
            P.ink,
            lwI
          );

          // 4 dòng mẫu tín hiệu trong bảng (3 dòng đầu là mẫu đã biết, dòng 4 là xung lạ mới vừa xuất hiện)
          for (let r = 0; r < 4; r++) {
            const ry = -95 + r * 82;
            const isNewSignalRow = r === 3;
            const rowUpdated = p.fast ? rewriteP > 0.4 : false;

            A.rrect(
              c,
              p.cx - pw / 2 + 24,
              ry - 28,
              pw - 48,
              56,
              8,
              isNewSignalRow && rowUpdated
                ? 'rgba(56,189,248,0.22)'
                : isNewSignalRow && yearP > 0.2
                ? 'rgba(180,73,60,0.16)'
                : P.bg2,
              isNewSignalRow && rowUpdated ? P.sky : P.ink,
              lwI
            );

            // Hình mẫu sóng lưu trong từng dòng
            const wx0 = p.cx - pw / 2 + 48;
            const wx1 = p.cx + 40;
            const pts: A.Pt[] = [];
            for (let x = wx0; x <= wx1; x += 8) {
              const f = isNewSignalRow
                ? rowUpdated
                  ? Math.sin((x - wx0) * 0.09 + t * 4) * 16
                  : 0 // bảng chậm 1 năm chưa có mẫu sóng mới!
                : Math.sin((x - wx0) * (0.04 + r * 0.015)) * 14;
              pts.push([x, ry + f]);
            }
            A.line(c, pts, isNewSignalRow && rowUpdated ? P.sky : P.ink2, lwO);

            // Ô kết quả bên phải dòng 4: Bảng nhanh khóa chặn được sóng mới; bảng chậm để sóng mới đi xuyên qua!
            const statusX = p.cx + pw / 2 - 96;
            if (!isNewSignalRow || rowUpdated) {
              A.circle(c, statusX, ry, 18, P.olive, P.ink, lwI);
              A.line(c, [[statusX - 8, ry], [statusX - 2, ry + 7], [statusX + 9, ry - 7]], P.white, lwO);
            } else {
              A.circle(c, statusX, ry, 18, P.enemy, P.ink, lwI);
              A.line(c, [[statusX - 7, ry - 7], [statusX + 7, ry + 7]], P.white, lwO);
              A.line(c, [[statusX + 7, ry - 7], [statusX - 7, ry + 7]], P.white, lwO);
            }
          }
        }
      });
    }

    K.end(c);
  }
}
