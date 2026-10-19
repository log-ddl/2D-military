import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc08 (201.32–235.98s): Hiệu ứng Doppler đo chuyển động & tách máy bay khỏi sườn đồi:
 * - 201.32–216.28s (SIDE): Vật bay lại gần nén bước sóng (tần số cao), bay ra xa kéo giãn bước sóng (tần số thấp).
 * - 216.28–227.58s (SIDE + Cutaway Filter): Quả đồi đứng yên trả về sóng không lệch tần -> bị bộ lọc vứt bỏ; máy bay dịch tần đi qua.
 * - 227.58–235.98s (TOP): Điểm yếu — Máy bay bay cắt ngang vuông góc tia radar (notching) không tạo độ lệch tần và biến mất.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const topBlend = A.eio(t, CUE.ch3_across_los - 0.3, CUE.ch3_across_los + 0.5);
    const cam: K.Cam = { x: 0, y: 15, z: 1.06 };
    K.begin(c, cam);

    if (topBlend < 0.99) {
      A.withA(c, 1 - topBlend, () => {
        const groundY = 135;
        const hillShow = A.sm(t, CUE.ch3_hillside - 0.4, CUE.ch3_hillside + 0.6);
        M.drawSideTerrain(c, -1100, 1100, groundY, {
          hillAt: hillShow > 0.01 ? 470 : undefined,
          hillH: 230 * hillShow,
        });

        const rx = -560;
        const txX = rx + 48, txY = groundY - 108;

        if (t < CUE.ch3_hillside) {
          // Giai đoạn 1 (201.32–216.28s): Đối chiếu sóng nén tần số cao (bay lại gần) vs sóng giãn tần số thấp (bay ra xa)
          const isAway = t >= CUE.ch3_lower_freq - 0.3;
          const jx = isAway
            ? A.lerp(240, 560, A.ph(t, CUE.ch3_lower_freq - 0.3, CUE.ch3_hillside))
            : A.lerp(520, 190, A.ph(t, CUE.ch3_start, CUE.ch3_lower_freq - 0.3));
          const jy = -140;
          const ang = Math.atan2(jy - txY, jx - txX);

          // Sóng phát đi chuẩn (amber)
          for (let i = 0; i < 5; i++) {
            const u = (((t - CUE.ch3_doppler) * 0.45 + i / 5) % 1);
            M.drawWaveArc(c, txX, txY, A.lerp(55, 650, u), ang, 0.3, P.amber, 0.45, 3.5);
          }

          // Sóng phản hồi (sky): khích sát nhau khi bay tới (!isAway), giãn thưa ra khi bay đi (isAway)
          const count = isAway ? 4 : 11;
          const col = isAway ? P.slate : P.sky;
          for (let i = 0; i < count; i++) {
            const u = (((t - CUE.ch3_doppler) * 0.6 + i / count) % 1);
            const r = A.lerp(40, Math.hypot(jx - txX, jy - txY) - 55, u);
            M.drawWaveArc(c, jx - (isAway ? -85 : 95), jy, r, ang + Math.PI, 0.34, col, 0.95, isAway ? 5 : 4);
          }

          // Mũi tên chỉ chiều chuyển động của máy bay
          const dir = isAway ? 1 : -1;
          A.line(c, [[jx + dir * 130, jy], [jx + dir * 220, jy]], isAway ? P.slate : P.sky, M.lwO(c));

          M.drawGroundRadar(c, rx, groundY, 'side', { scale: 1.55, dishAngle: ang, active: true });
          M.drawIntruderJet(c, jx, jy, 'side', { scale: 1.42, flipX: isAway });

          // Khung hiển thị dạng sóng hình sin dịch tần bên dưới mặt đất
          A.rrect(c, -480, 220, 960, 175, 12, P.paper, P.ink, M.lwO(c));
          const wavePts: A.Pt[] = [];
          const freq = isAway ? 3.2 : 11.5;
          for (let k = 0; k <= 120; k++) {
            const u = k / 120;
            const wx = A.lerp(-430, 430, u);
            const wy = 308 + Math.sin(u * Math.PI * 2 * freq - t * 8) * 52;
            wavePts.push([wx, wy]);
          }
          A.line(c, wavePts, col, M.lwO(c));
        } else {
          // Giai đoạn 2 (216.28–227.58s): Tách máy bay khỏi sườn đồi bằng Bộ lọc Doppler (MTI Filter)
          const jx = A.lerp(360, 160, A.ph(t, CUE.ch3_hillside, CUE.ch3_across_los));
          const jy = -105;
          const ang = Math.atan2(jy - txY, jx - txX);

          // Sóng dội từ quả đồi đứng yên (màu slate, bước sóng thưa không đổi)
          for (let i = 0; i < 5; i++) {
            const u = (((t - CUE.ch3_hillside) * 0.4 + i / 5) % 1);
            M.drawWaveArc(c, 420, groundY - 120, A.lerp(45, 860, u), Math.PI - 0.12, 0.28, P.slate, 0.75, 5, true);
          }
          // Sóng dội từ máy bay đang bay tới (màu sky, bước sóng nén khích - dịch tần Doppler)
          for (let i = 0; i < 10; i++) {
            const u = (((t - CUE.ch3_hillside) * 0.65 + i / 10) % 1);
            M.drawWaveArc(c, jx - 95, jy, A.lerp(35, Math.hypot(jx - txX, jy - txY) - 55, u), ang + Math.PI, 0.28, P.sky, 0.95, 3.8);
          }

          M.drawGroundRadar(c, rx, groundY, 'side', { scale: 1.55, dishAngle: ang, active: true });
          M.drawIntruderJet(c, jx, jy, 'side', { scale: 1.38 });

          // Hộp cơ chế Bộ lọc Doppler (Doppler Filter) bên dưới:
          // Đầu vào bên trái gồm 2 đường (Sóng đồi không dịch tần f0 & Sóng máy bay dịch tần f0 + Δf)
          // Qua cổng lọc ở giữa -> Sóng đồi bị chặn gạch chéo đỏ, chỉ Sóng máy bay đi sang màn hình bên phải!
          A.rrect(c, -520, 210, 1040, 200, 12, P.paper, P.ink, M.lwO(c));
          // Vách ngăn cổng lọc ở x = 0
          A.rrect(c, -28, 224, 56, 172, 8, P.oliveLight, P.ink, M.lwO(c));

          // Đường trên (Quả đồi đứng yên: sóng thưa f0 -> bị chặn tại cổng lọc!)
          const hillWave: A.Pt[] = [];
          for (let k = 0; k <= 50; k++) {
            const u = k / 50;
            hillWave.push([A.lerp(-470, -45, u), 268 + Math.sin(u * Math.PI * 6) * 22]);
          }
          A.line(c, hillWave, P.slate, M.lwO(c));
          // Dấu X chặn sóng tĩnh tại cổng lọc
          A.line(c, [[-16, 252], [16, 284]], P.enemy, M.lwO(c));
          A.line(c, [[-16, 284], [16, 252]], P.enemy, M.lwO(c));
          A.line(c, [[45, 268], [320, 268]], P.light, M.lwI(c), [8, 8]);

          // Đường dưới (Máy bay di chuyển: sóng nén khích f0 + Δf -> đi xuyên qua cổng lọc sang màn hình!)
          const jetWaveIn: A.Pt[] = [];
          for (let k = 0; k <= 50; k++) {
            const u = k / 50;
            jetWaveIn.push([A.lerp(-470, -45, u), 352 + Math.sin(u * Math.PI * 16 - t * 10) * 22]);
          }
          A.line(c, jetWaveIn, P.sky, M.lwO(c));
          const jetWaveOut: A.Pt[] = [];
          for (let k = 0; k <= 40; k++) {
            const u = k / 40;
            jetWaveOut.push([A.lerp(45, 320, u), 352 + Math.sin(u * Math.PI * 13 - t * 10) * 22]);
          }
          A.line(c, jetWaveOut, P.sky, M.lwO(c));

          // Ô kết quả bên phải hộp lọc: chỉ còn mục tiêu máy bay nổi bật
          A.rrect(c, 345, 236, 145, 148, 8, P.bg2, P.ink, M.lwO(c));
          A.circle(c, 418, 310, 18, P.sky, P.ink, M.lwO(c));
        }
      });
    }

    // Giai đoạn 3 (227.58–235.98s): Góc TOP — Điểm yếu khi máy bay bay cắt ngang vuông góc tia radar (Notching / Beaming)
    if (topBlend > 0.01) {
      A.withA(c, topBlend, () => {
        const ox = 0, oy = 180;
        M.drawTacticalMapTop(c, ox, oy, 720);

        // Chùm tia radar chiếu thẳng lên hướng Bắc (-Math.PI / 2)
        const beamAng = -Math.PI / 2;
        A.withA(c, 0.24, () => {
          c.beginPath();
          c.moveTo(ox, oy);
          c.arc(ox, oy, 640, beamAng - 0.14, beamAng + 0.14);
          c.closePath();
          A.fs(c, P.amber, null, 0);
        });
        A.line(c, [[ox, oy], [ox, oy - 620]], P.amber, M.lwO(c));

        // Máy bay bay ngang từ phải sang trái cắt vuông góc 90 độ với đường ngắm radar tại y = -180
        const crossP = A.ph(t, CUE.ch3_across_los, CUE.ch3_rcs_intro - 0.2);
        const jx = A.lerp(280, -280, crossP);
        const jy = -180;

        // Ký hiệu góc vuông 90° giữa đường ngắm radar và đường bay ngang của máy bay
        A.line(c, [[-380, jy], [380, jy]], P.enemy, M.lwI(c), [10, 8]);
        A.rrect(c, 0, jy, 28, 28, 0, null, P.ink, M.lwO(c));

        // Khi đi ngang qua tâm chùm tia (khoảng cách không đổi -> Doppler shift = 0): máy bay mờ đi (biến mất vào clutter!)
        const inNotch = 1 - 0.72 * A.bump(crossP, 0.22, 0.56);
        A.withA(c, inNotch, () => {
          M.drawIntruderJet(c, jx, jy, 'top', { scale: 1.35, angle: 0 });
        });

        M.drawGroundRadar(c, ox, oy, 'top', { scale: 1.45, dishAngle: beamAng, active: true });
      });
    }

    K.end(c);
  }
}
