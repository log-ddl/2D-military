import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';
import { stateAt } from './_state';

/**
 * sc03 (46.00–77.70s): Nguyên lý 2 phép đo cơ bản của radar:
 * 1) Thời gian trễ giữa xung phát và tiếng vọng -> Khoảng cách (150 m vs 150 km) ở góc SIDE + A-scope.
 * 2) Hướng chảo anten khi tiếng vọng quay về -> Phương vị (bearing) ở góc TOP đồng bộ.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    const cam: K.Cam = { x: 0, y: 15, z: 1.08 };
    K.begin(c, cam);

    // Giai đoạn A (46.00–68.74s): Góc SIDE đo thời gian trễ xung (Range by timing delay)
    const topBlend = A.eio(t, CUE.ch1_dish_turns - 0.3, CUE.ch1_dish_turns + 0.6);

    if (topBlend < 0.99) {
      A.withA(c, 1 - topBlend, () => {
        const groundY = 125;
        M.drawSideTerrain(c, -1100, 1100, groundY);

        const rx = st.radarSideX;
        const txX = rx + 48, txY = groundY - 108;
        const jx = st.jetSideX, jy = st.jetSideY - 30;
        const dist = Math.hypot(jx - txX, jy - txY);
        const ang = Math.atan2(jy - txY, jx - txX);

        // Chu kỳ phát xung và thu tiếng vọng rõ ràng, đảm bảo gai thu hiện rõ trước và trong lúc hiện callout
        let pulseOutP = 0;
        let pulseBackP = 0;
        let rxTargetPos = 0.54;

        if (t < CUE.ch1_delay_150m) {
          pulseOutP = A.ph(t, CUE.ch1_short_burst, CUE.ch1_short_burst + 2.4);
          pulseBackP = A.ph(t, CUE.ch1_short_burst + 2.4, CUE.ch1_time_between + 0.4);
          rxTargetPos = 0.54;
        } else if (t < CUE.ch1_delay_150km - 0.2) {
          pulseOutP = A.ph(t, CUE.ch1_delay_150m + 0.2, CUE.ch1_delay_150m + 1.0);
          pulseBackP = A.ph(t, CUE.ch1_delay_150m + 1.0, CUE.ch1_delay_150m + 2.0);
          rxTargetPos = 0.28; // Trễ cực ngắn (150 m)
        } else {
          pulseOutP = A.ph(t, CUE.ch1_delay_150km - 0.1, CUE.ch1_delay_150km + 0.8);
          pulseBackP = A.ph(t, CUE.ch1_delay_150km + 0.8, CUE.ch1_num_150km - 0.2);
          rxTargetPos = 0.84; // Trễ dài (150 km)
        }

        // Đường gióng cự ly từ radar tới máy bay
        A.line(c, [[txX, txY], [jx - 90, jy]], P.light, M.lwI(c), [10, 10]);

        // Vẽ gói xung phát đi (amber)
        if (pulseOutP > 0 && pulseOutP < 1) {
          const r = A.lerp(50, dist - 65, pulseOutP);
          M.drawWaveArc(c, txX, txY, r, ang, 0.36, P.amber, 1, 6.5);
          M.drawWaveArc(c, txX, txY, Math.max(22, r - 24), ang, 0.32, P.amber, 0.75, 4.5);
        }
        // Vẽ gói tiếng vọng quay về (sky)
        if (pulseBackP > 0 && pulseBackP < 1) {
          const r = A.lerp(45, dist - 55, pulseBackP);
          M.drawWaveArc(c, jx - 95, jy, r, ang + Math.PI, 0.32, P.sky, 0.95, 5);
        }

        // Đài radar & Máy bay mục tiêu lớn, rõ nét
        M.drawGroundRadar(c, rx, groundY, 'side', {
          scale: 1.55,
          dishAngle: ang,
          active: pulseOutP > 0 && pulseOutP < 0.35,
        });
        M.drawIntruderJet(c, jx, jy, 'side', { scale: 1.42 });

        // Bộ đo thời gian trễ (Timing Scope) lớn đặt ngay phần dưới khung hình
        const totalProgress = A.clamp01((pulseOutP + pulseBackP) / 2);
        M.drawTimingScope(c, 0, 315, 1180, 220, {
          txPos: 0.1,
          rxPos: pulseBackP >= 0.88 ? rxTargetPos : undefined,
          rxHeight: 0.68,
          cursorP: totalProgress,
        });
      });
    }

    // Giai đoạn B (68.40–77.70s): Góc TOP đo góc phương vị (Bearing) kết hợp khóa tọa độ (Range + Bearing)
    if (topBlend > 0.01) {
      A.withA(c, topBlend, () => {
        const ox = -110, oy = 15;
        M.drawTacticalMapTop(c, ox, oy, 760, { coastlineX: -310 });

        // Vòng thước đo độ phương vị quanh đài radar
        c.beginPath();
        c.arc(ox, oy, 360, 0, Math.PI * 2);
        A.fs(c, null, P.ink, M.lwO(c));
        for (let deg = 0; deg < 360; deg += 15) {
          const rad = (deg * Math.PI) / 180;
          const r0 = deg % 45 === 0 ? 332 : 346;
          A.line(
            c,
            [
              [ox + Math.cos(rad) * r0, oy + Math.sin(rad) * r0],
              [ox + Math.cos(rad) * 360, oy + Math.sin(rad) * 360],
            ],
            P.ink,
            deg % 45 === 0 ? M.lwO(c) : M.lwI(c)
          );
        }

        // Mục tiêu ở phương vị -0.28 rad, cự ly 480
        const targetAz = -0.28;
        const targetDist = 480;
        const tx = ox + Math.cos(targetAz) * targetDist;
        const ty = oy + Math.sin(targetAz) * targetDist;

        // Chùm tia phương vị quay cùng chảo anten
        const az = st.radarTopAzimuth;
        A.withA(c, 0.26, () => {
          c.beginPath();
          c.moveTo(ox, oy);
          c.arc(ox, oy, 640, az - 0.12, az + 0.12);
          c.closePath();
          A.fs(c, P.amber, null, 0);
        });
        A.line(c, [[ox, oy], [ox + Math.cos(az) * 640, oy + Math.sin(az) * 640]], P.amber, M.lwO(c));

        // Khi chảo quét qua mục tiêu: khóa giao điểm Vòng cự ly (Range) × Tia phương vị (Bearing)
        const lockA = A.sm(t, CUE.ch1_dish_turns + 2.6, CUE.ch1_sharper);
        if (lockA > 0.01) {
          A.withA(c, lockA, () => {
            M.drawWaveArc(c, ox, oy, targetDist, targetAz, 0.55, P.sky, 1, 5.5);
            A.circle(c, tx, ty, 64 - 16 * lockA, null, P.amber, M.lwO(c));
          });
        }

        M.drawGroundRadar(c, ox, oy, 'top', { scale: 1.45, dishAngle: az, active: true });
        M.drawIntruderJet(c, tx, ty, 'top', { scale: 1.22, angle: targetAz });
      });
    }

    K.end(c);

    // Callout số liệu khớp đúng thời điểm voice đọc 150 m (62.58s) và 150 km (66.62s)
    const a150m = A.win(t, CUE.ch1_delay_150m + 1.8, CUE.ch1_delay_150km - 0.1, 0.3, 0.3);
    if (a150m > 0.01) {
      M.drawCallout(c, 740, 620, '1 μs  →  150 m', {
        anchorScreen: K.toScreen(cam, -212, 290),
        accent: P.sky,
        alpha: a150m,
      });
    }

    const a150km = A.win(t, CUE.ch1_delay_150km + 1.2, CUE.ch1_dish_turns - 0.2, 0.3, 0.3);
    if (a150km > 0.01) {
      M.drawCallout(c, 1340, 620, '1 ms  →  150 km', {
        anchorScreen: K.toScreen(cam, 395, 290),
        accent: P.amber,
        alpha: a150km,
      });
    }
  }
}
