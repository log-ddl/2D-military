import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { drawBgHangar, drawHeli, lw } from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Camera trong Hangar bảo dưỡng:
    // - 207.08 -> 222.20s: Cận vừa trực thăng trên sàn xưởng + 4 thẻ giải phẫu cụm chi tiết chịu tải
    // - 222.20 -> 232.94s: Mở nhẹ xuống dưới để thấy thanh đối chiếu Thời gian bảo dưỡng (dài) vs Thời gian bay (ngắn)
    const camTrack: [number, K.Cam][] = [
      [207.08, { x: 0, y: 15, z: 1.52 }],
      [221.80, { x: 0, y: 15, z: 1.52 }],
      [223.60, { x: 0, y: 65, z: 1.38 }],
      [232.94, { x: 0, y: 65, z: 1.38 }],
    ];
    const cam = K.track(t, camTrack, A.eio);

    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);
    const groundY = 175;

    drawBgHangar(c, groundY);

    // Vẽ Trực thăng chủ đạo đang đậu bảo dưỡng (rotor quay rất chậm để kiểm tra)
    const hx = 0, hy = groundY - 82;
    c.save();
    c.translate(hx, hy);
    c.scale(1.18, 1.18);
    drawHeli(c, {
      view: 'side',
      rotorAngle: t * 0.45,
      showGearboxCutaway: true,
      highlightMaint: t >= CUE.ch3_moving_part_load - 0.3,
      powerFlow: 1,
    });
    c.restore();

    // --- 4 Thẻ giải phẫu + Đồng hồ giới hạn giờ bay cho 4 bộ phận chịu tải ---
    // (1) The blades (215.04s), (2) The head (215.72s), (3) The gearbox (216.30s), (4) The bearings (217.08s)
    const parts: { cue: number; anchor: A.Pt; box: A.Pt; icon: 'blade' | 'head' | 'gearbox' | 'bearing' }[] = [
      { cue: CUE.ch3_part_blades, anchor: [-165, hy - 118], box: [-325, -155], icon: 'blade' },
      { cue: CUE.ch3_part_head, anchor: [16, hy - 112], box: [-110, -215], icon: 'head' },
      { cue: CUE.ch3_part_gearbox, anchor: [16, hy - 55], box: [145, -215], icon: 'gearbox' },
      { cue: CUE.ch3_part_bearings, anchor: [16, hy - 88], box: [325, -145], icon: 'bearing' },
    ];

    const hoursP = A.sm(t, CUE.ch3_limited_hours - 0.3, CUE.ch3_replaced ?? 220.4);
    const checkP = A.sm(t, CUE.ch3_checked_often - 0.4, CUE.ch3_checked_often + 0.4);

    for (const pt of parts) {
      const showP = A.sm(t, pt.cue - 0.15, pt.cue + 0.35);
      if (showP <= 0.01) continue;
      A.withA(c, showP, () => {
        const [ax, ay] = pt.anchor;
        const [bx, by] = pt.box;
        // Đường dẫn neo vào bộ phận trên trực thăng
        A.line(c, [[ax, ay], [bx, by + 38]], P.amber, lw(c, 3), [8, 5]);
        A.circle(c, ax, ay, 7, P.amber, P.ink, li);

        // Khung thẻ bộ phận + Đồng hồ giới hạn giờ bay bên cạnh
        A.rrect(c, bx - 68, by - 38, 136, 76, 10, P.paper, P.amber, lo);

        // Hình vẽ bộ phận bên trái thẻ (bx - 28, by)
        const ix = bx - 26, iy = by;
        if (pt.icon === 'blade') {
          A.rrect(c, ix - 32, iy - 7, 64, 14, 3, P.oliveLight, P.ink, li);
          A.rrect(c, ix + 18, iy - 7, 14, 14, 2, P.amber, P.ink, li);
        } else if (pt.icon === 'head') {
          A.rrect(c, ix - 6, iy - 22, 12, 44, 2, P.slate, P.ink, li);
          A.rrect(c, ix - 22, iy - 4, 44, 10, 3, P.amber, P.ink, li);
        } else if (pt.icon === 'gearbox') {
          A.circle(c, ix - 10, iy + 4, 12, P.amber, P.ink, li);
          A.circle(c, ix + 12, iy - 6, 15, P.oliveLight, P.ink, li);
        } else {
          // Vòng bi (Bearings)
          A.circle(c, ix, iy, 20, P.light, P.ink, li);
          A.circle(c, ix, iy, 9, P.paper, P.ink, li);
          for (let b = 0; b < 6; b++) {
            const ba = (b * Math.PI) / 3 + t * 1.5;
            A.circle(c, ix + Math.cos(ba) * 14.5, iy + Math.sin(ba) * 14.5, 3.5, P.amber, P.ink, lw(c, 1.2));
          }
        }

        // Đồng hồ giới hạn giờ bay bên phải thẻ (bx + 34, by)
        const cx = bx + 34, cy = by;
        A.circle(c, cx, cy, 22, P.bg, P.ink, li);
        // Cung giới hạn giờ (chuyển sang đỏ gạch khi hết hạn thay thế)
        const sweep = A.lerp(0.25, 0.88, hoursP);
        c.beginPath();
        c.moveTo(cx, cy);
        c.arc(cx, cy, 19, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI * 2);
        c.closePath();
        c.fillStyle = hoursP > 0.75 ? P.enemy : P.amber;
        c.fill();
        A.circle(c, cx, cy, 22, null, P.ink, li);

        // Huy hiệu kiểm tra định kỳ (checked often)
        if (checkP > 0.01) {
          A.circle(c, bx + 58, by - 30, 13, P.sky, P.ink, li);
          A.line(c, [[bx + 52, by - 30], [bx + 57, by - 25], [bx + 65, by - 35]], P.paper, lw(c, 3));
        }
      });
    }

    // --- Thanh đối chiếu Thời gian Bảo dưỡng dưới đất vs Thời gian Bay (222.6 - 232.94s) ---
    const ratioShow = A.sm(t, CUE.ch3_cost_owning - 0.2, CUE.ch3_cost_owning + 0.8);
    if (ratioShow > 0.01) {
      const fillProg = A.eio(t, CUE.ch3_cost_owning + 0.4, CUE.ch3_worked_more_than_flown + 0.8);
      A.withA(c, ratioShow, () => {
        const py = 258;
        A.rrect(c, -440, py - 48, 880, 96, 12, P.paper, P.ink, lo);

        // Thanh 1 (Trái - Rất dài, 610px): Giờ bảo dưỡng trong xưởng (worked on) - màu amber + biểu tượng cờ lê
        const maintW = 580 * fillProg;
        A.rrect(c, -415, py - 24, maintW, 48, 8, P.amber, P.ink, lo);
        for (let k = 0; k < 5; k++) {
          const wx = -365 + k * 110;
          if (wx < -415 + maintW - 25) {
            A.capsule(c, [wx - 14, py], [wx + 14, py], 6, P.paper, P.ink, li);
            A.circle(c, wx - 16, py, 7, P.paper, P.ink, li);
          }
        }

        // Thanh 2 (Phải - Ngắn, 180px): Giờ thực sự bay trên không (flown) - màu sky
        const flyW = 195 * fillProg;
        A.rrect(c, 205, py - 24, flyW, 48, 8, P.sky, P.ink, lo);
        if (flyW > 60) {
          A.capsule(c, [205 + flyW / 2 - 22, py - 8], [205 + flyW / 2 + 22, py - 8], 4, P.paper, P.ink, li);
          A.rrect(c, 205 + flyW / 2 - 14, py - 2, 28, 12, 4, P.olive, P.ink, li);
        }
      });
    }

    K.end(c);
  }
}
