import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc05 (108.08–137.46s): Bài toán nhịp phát xung (PRF timing problem):
 * - Chờ tiếng vọng về trước khi phát xung mới (108.08–118.90s)
 * - Phát nhanh (High PRF): đo tốc độ tốt nhưng tiếng vọng xa về sau xung kế tiếp -> đọc nhầm thành mục tiêu gần (118.90–126.90s)
 * - Phát chậm (Low PRF): cự ly rõ nhưng vận tốc bị nhòe (126.90–130.62s)
 * - Đổi chế độ luân phiên (Alternating modes) (130.62–137.46s)
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam: K.Cam = { x: 0, y: 15, z: 1.08 };
    K.begin(c, cam);

    const groundY = 120;
    M.drawSideTerrain(c, -1100, 1100, groundY);

    const rx = -560;
    const txX = rx + 48, txY = groundY - 108;
    const farX = 560, farY = -170;
    const nearGhostX = -85, nearGhostY = -45;
    const dist = Math.hypot(farX - txX, farY - txY);
    const ang = Math.atan2(farY - txY, farX - txX);

    // Đường ngắm từ radar tới mục tiêu xa
    A.line(c, [[txX, txY], [farX - 95, farY]], P.light, M.lwI(c), [10, 10]);

    // 4 giai đoạn cơ chế PRF
    const isWaitPhase = t < CUE.ch2_pulses_quickly;
    const isFastPhase = t >= CUE.ch2_pulses_quickly && t < CUE.ch2_pulses_slowly;
    const isSlowPhase = t >= CUE.ch2_pulses_slowly && t < CUE.ch2_alternate_modes;
    const isAltPhase = t >= CUE.ch2_alternate_modes;

    let scopeTx1 = 0.1;
    let scopeTx2: number | undefined = undefined;
    let scopeRx: number | undefined = undefined;
    let scopeCursor = 0.5;

    if (isWaitPhase) {
      // Chu kỳ chuẩn: Xung 1 đi và về xong mới phát tiếp
      const u = ((t - CUE.ch2_timing_problem) % 5.2) / 5.2;
      const outP = A.clamp01(u * 2);
      const backP = A.clamp01((u - 0.5) * 2);
      if (outP < 1) {
        M.drawWaveArc(c, txX, txY, A.lerp(50, dist - 65, outP), ang, 0.36, P.amber, 1, 6.5);
      } else {
        M.drawWaveArc(c, farX - 95, farY, A.lerp(45, dist - 55, backP), ang + Math.PI, 0.34, P.sky, 0.95, 5);
      }
      scopeTx1 = 0.1;
      scopeRx = backP > 0.85 ? 0.78 : undefined;
      scopeCursor = u;
    } else if (isFastPhase) {
      // Phát xung nhanh (High PRF): khi tiếng vọng Xung 1 đang trên đường về thì Xung 2 đã bắn ra!
      const dt = t - CUE.ch2_pulses_quickly;
      const backP = A.clamp01(dt / 3.8);
      const tx2P = A.clamp01((dt - 1.4) / 2.4);

      // Tiếng vọng của Xung 1 từ mục tiêu xa đang bay về
      if (backP < 1) {
        M.drawWaveArc(c, farX - 95, farY, A.lerp(60, dist - 50, backP), ang + Math.PI, 0.36, P.sky, 0.95, 5);
      }
      // Xung 2 màu amber đã bắn chen ngang trước khi tiếng vọng 1 kịp về!
      if (dt >= 1.2) {
        M.drawWaveArc(c, txX, txY, A.lerp(50, dist * 0.65, tx2P), ang, 0.36, P.amber, 1, 6.5);
      }

      // Khi tiếng vọng 1 về tới ngay sau Xung 2 -> Hiện BÓNG MA MỤC TIÊU GIẢ ở gần (Range Ambiguity!)
      const ghostA = A.sm(t, CUE.ch2_read_as_near - 0.8, CUE.ch2_read_as_near + 0.4);
      if (ghostA > 0.01) {
        A.withA(c, ghostA * 0.65, () => {
          M.drawIntruderJet(c, nearGhostX, nearGhostY, 'side', { scale: 1.38 });
        });
        A.withA(c, ghostA, () => {
          A.rrect(c, nearGhostX - 150, nearGhostY - 58, 300, 116, 10, null, P.enemy, M.lwO(c));
          A.line(c, [[txX, txY], [nearGhostX, nearGhostY]], P.enemy, M.lwO(c), [10, 8]);
        });
      }

      scopeTx1 = 0.08;
      scopeTx2 = 0.52;
      scopeRx = dt > 2.4 ? 0.64 : undefined; // Nằm ngay sát sau Xung 2 nên bị đọc nhầm là cự ly gần!
      scopeCursor = A.clamp01(dt / 4.2);
    } else if (isSlowPhase) {
      // Phát xung chậm (Low PRF): Cự ly xa rất rõ, không còn bóng ma, nhưng vận tốc máy bay bị nhòe (3 bóng trễ)
      const dt = t - CUE.ch2_pulses_slowly;
      const u = A.clamp01(dt / 2.8);
      M.drawWaveArc(c, txX, txY, A.lerp(80, dist - 60, u), ang, 0.36, P.amber, 1 - u * 0.5, 6);

      // Vệt nhòe vận tốc (speed becomes blurred) quanh máy bay ở xa
      for (const dx of [-75, -38, 38, 75]) {
        A.withA(c, 0.26, () => {
          M.drawIntruderJet(c, farX + dx, farY - dx * 0.12, 'side', { scale: 1.38 });
        });
      }
      scopeTx1 = 0.08;
      scopeRx = 0.82;
      scopeCursor = u;
    } else if (isAltPhase) {
      // Đổi chế độ luân phiên (Alternate between modes): chùm nhanh đo tốc độ + chùm chậm đo cự ly
      const dt = t - CUE.ch2_alternate_modes;
      const isFastSub = Math.floor(dt / 1.8) % 2 === 0;
      const subU = (dt % 1.8) / 1.8;

      if (isFastSub) {
        // Nhịp nhanh: 3 vòm sóng sát nhau
        for (const off of [0, 0.16, 0.32]) {
          const p = A.clamp01(subU - off);
          if (p > 0) M.drawWaveArc(c, txX, txY, A.lerp(60, dist - 70, p), ang, 0.34, P.amber, 0.9, 5);
        }
        scopeTx1 = 0.1;
        scopeTx2 = 0.32;
        scopeRx = 0.48;
      } else {
        // Nhịp chậm: 1 vòm sóng đơn tách biệt + tiếng vọng rõ
        M.drawWaveArc(c, farX - 95, farY, A.lerp(50, dist - 55, subU), ang + Math.PI, 0.34, P.sky, 0.95, 5.5);
        scopeTx1 = 0.1;
        scopeTx2 = undefined;
        scopeRx = 0.82;
      }
      scopeCursor = subU;

      // Khung khóa chuẩn xác cả vị trí và vectơ vận tốc trên máy bay thật
      A.rrect(c, farX - 150, farY - 58, 300, 116, 10, null, P.olive, M.lwO(c));
      A.line(c, [[farX - 140, farY], [farX - 245, farY + 26]], P.amber, M.lwO(c));
    }

    // Chủ thể chính: Đài radar và Máy bay mục tiêu ở xa
    M.drawGroundRadar(c, rx, groundY, 'side', { scale: 1.55, dishAngle: ang, active: true });
    M.drawIntruderJet(c, farX, farY, 'side', { scale: 1.38 });

    // Bảng trục xung Timing Scope bên dưới
    M.drawTimingScope(c, 0, 315, 1180, 220, {
      txPos: scopeTx1,
      secondTxPos: scopeTx2,
      rxPos: scopeRx,
      rxHeight: 0.65,
      cursorP: scopeCursor,
    });

    K.end(c);
  }
}
