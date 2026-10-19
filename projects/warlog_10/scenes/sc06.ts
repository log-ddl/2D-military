import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc06 (137.46–168.74s): Ba cách đối phó với tiếng vọng cực yếu và cái giá phải trả của mỗi cách:
 * 1) Phát công suất lớn (Megawatts) -> Cái giá: Dễ bị phát hiện từ xa (162.02s)
 * 2) Anten khổng lồ như mặt bên tòa nhà -> Cái giá: Nặng nề, khó di chuyển (164.84s)
 * 3) Lắng nghe lâu hơn (cộng tích lũy nhiều xung) -> Cái giá: Chậm hơn (166.50s)
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam = K.track(
      t,
      [
        [CUE.ch2_ways_to_deal, { x: -360, y: 30, z: 1.18 }],
        [CUE.ch2_bigger_antenna, { x: -80, y: 15, z: 1.05 }],
        [CUE.ch2_listen_longer, { x: 80, y: 20, z: 1.02 }],
        [CUE.ch2_cost_something, { x: 0, y: 20, z: 1.0 }],
      ],
      A.eio
    );
    K.begin(c, cam);

    const groundY = 230;
    M.drawSideTerrain(c, -1200, 1200, groundY);

    // ── CỤM 1 (Trái, x = -560): Giữ liên tục đài groundRadar từ sc05, tới 141.16s phóng lớn buồng phát Megawatts ──
    const pScale = A.lerp(1.0, 1.48, A.eio(t, CUE.ch2_more_power - 0.6, CUE.ch2_more_power + 1.4));
    const cost1A = A.sm(t, CUE.ch2_easier_to_find - 0.3, CUE.ch2_easier_to_find + 0.7);

    // Vòm sóng công suất cực mạnh phát ra từ đài Megawatt
    for (let i = 1; i <= 3; i++) {
      const r = 75 + i * 52 + ((t * 60) % 52);
      M.drawWaveArc(c, -510, groundY - 115, r, -0.35, 0.55, P.amber, 0.85, 6);
    }
    M.drawGroundRadar(c, -560, groundY, 'cutaway', {
      scale: 1.55,
      dishAngle: -0.35,
      active: true,
      powerScale: pScale,
    });

    // Cái giá 1 (162.02s): Công suất lớn làm radar dễ bị phát hiện -> Máy bay địch ở trên cao khóa mục tiêu đỏ gạch!
    if (cost1A > 0.01) {
      A.withA(c, cost1A, () => {
        M.drawIntruderJet(c, -310, -250, 'side', { scale: 1.05, rwrAlert: 1 });
        A.line(c, [[-395, -250], [-545, groundY - 95]], P.enemy, M.lwO(c), [12, 8]);
        c.save();
        c.translate(-560, groundY - 75);
        c.rotate(Math.PI / 4);
        A.rrect(c, -68, -68, 136, 136, 8, null, P.enemy, M.lwO(c));
        c.restore();
      });
    }

    // ── CỤM 2 (Giữa, x = -40): Anten khổng lồ như mặt bên tòa nhà ──
    const p2A = A.sm(t, CUE.ch2_bigger_antenna - 0.2, CUE.ch2_bigger_antenna + 0.9);
    const cost2A = A.sm(t, CUE.ch2_harder_to_move - 0.3, CUE.ch2_harder_to_move + 0.7);
    if (p2A > 0.01) {
      A.withA(c, p2A, () => {
        const buildGrow = A.eo(t, CUE.ch2_bigger_antenna, CUE.ch2_sides_of_buildings + 0.8);
        // Chùm tia hẹp tập trung và mặt thu lớn gom sóng sky quay về
        A.withA(c, 0.24, () => {
          A.poly(
            c,
            [
              [15, groundY - 295],
              [520, -260],
              [520, -140],
              [80, groundY - 20],
            ],
            P.sky,
            null,
            0
          );
        });
        M.drawEarlyWarningRadar(c, -40, groundY, 'side', {
          scale: A.lerp(0.85, 1.38, buildGrow),
          active: true,
        });

        // Cái giá 2 (164.84s): Anten lớn cồng kềnh không thể cơ động -> Móng bê tông chôn sâu & khóa cố định
        if (cost2A > 0.01) {
          A.withA(c, cost2A, () => {
            A.rrect(c, -225, groundY, 370, 56, 6, P.slate, P.ink, M.lwO(c));
            for (const ax of [-180, -90, 0, 90]) {
              A.line(c, [[ax, groundY], [ax, groundY + 52]], P.enemy, M.lwO(c));
            }
          });
        }
      });
    }

    // ── CỤM 3 (Phải, x = 510): Lắng nghe lâu hơn — Cộng tích lũy nhiều xung vượt nhiễu ──
    const p3A = A.sm(t, CUE.ch2_listen_longer - 0.2, CUE.ch2_listen_longer + 0.9);
    const cost3A = A.sm(t, CUE.ch2_harder_to_move + 1.2, CUE.ch2_harder_to_move + 2.0);
    if (p3A > 0.01) {
      A.withA(c, p3A, () => {
        // Số xung đã cộng dồn (1 -> 6 xung): mỗi xung làm gai tín hiệu mục tiêu (rxHeight) cao dần lên vượt khỏi nền nhiễu!
        const accumP = A.clamp01((t - CUE.ch2_listen_longer) / 4.8);
        const pulseCount = Math.max(1, Math.min(6, Math.floor(accumP * 6) + 1));
        const stackedHeight = A.lerp(0.16, 0.92, accumP);

        M.drawTimingScope(c, 510, -20, 520, 290, {
          txPos: 0.14,
          rxPos: 0.72,
          rxHeight: stackedHeight,
          noiseFloor: 0.32,
          cursorP: accumP,
        });

        // Các ô đèn đếm số xung đã tích lũy (1..6) phía trên hộp tích lũy
        for (let i = 0; i < 6; i++) {
          const bx = 330 + i * 72;
          const by = -205;
          const lit = i < pulseCount;
          A.rrect(c, bx - 26, by - 16, 52, 32, 6, lit ? P.sky : P.bg2, P.ink, M.lwO(c));
        }

        // Cái giá 3 (166.50s): Nghe lâu hơn thì chậm hơn -> Đồng hồ chờ quay chậm phía dưới khung tích lũy
        if (cost3A > 0.01) {
          A.withA(c, cost3A, () => {
            const cx = 510, cy = 195, r = 46;
            A.circle(c, cx, cy, r, P.paper, P.enemy, M.lwO(c));
            const handAng = -Math.PI / 2 + (t - CUE.ch2_harder_to_move) * 1.8;
            A.line(c, [[cx, cy], [cx + Math.cos(handAng) * 32, cy + Math.sin(handAng) * 32]], P.enemy, M.lwO(c));
            A.line(c, [[cx, cy], [cx, cy - 22]], P.ink, M.lwI(c));
          });
        }
      });
    }

    K.end(c);
  }
}
