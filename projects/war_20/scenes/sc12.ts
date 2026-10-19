// sc12.ts (366.30 – 415.58s): Hệ thống ngầm #2 & #3 — Máy tính chia van cân bằng Trọng tâm (CG)
// khi bơm 10–20 tấn xăng trong 5 phút, Khớp ngắt khẩn cấp (Breakaway Couplings) đóng sập 2 van
// trong vài mili-giây khi nhiễu động giật mạnh, và Tanker hiện đại tích hợp cả Boom + 2 Wing Pods.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawSkySideBg,
  drawModernTanker,
  drawStrikeFighter,
  drawCarrierFighter,
  drawHelicopter,
  drawFlyingBoom,
  drawCouplingCutaway,
  lwO,
  lwI,
} from './_assets';
import { SIDE_PAIR, CUE } from './_state';

/** Vẽ ống mềm & rổ phễu nhìn từ trên xuống (TOP view) cho phân cảnh cuối Chương 4 */
function drawTopHose(
  c: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number
) {
  const lo = lwO(c);
  const li = lwI(c);
  const pts: A.Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    pts.push([
      A.lerp(x0, x1, u),
      A.lerp(y0, y1, u) + Math.sin(u * Math.PI * 2 + t * 3) * 3.5,
    ]);
  }
  A.line(c, pts, P.ink, lo * 2.1);
  A.line(c, pts, P.dark, lo * 1.1);
  A.poly(
    c,
    [
      [x1 + 4, y1 - 4],
      [x1 - 18, y1 - 14],
      [x1 - 18, y1 + 14],
      [x1 + 4, y1 + 4],
    ],
    P.paper,
    P.ink,
    li
  );
  A.rrect(c, x1 - 22, y1 - 15, 5, 30, 2, P.amber, P.ink, li);
  for (let i = 0; i < 6; i++) {
    const u = ((i / 6 + t * 1.3) % 1 + 1) % 1;
    const idx = Math.min(16, Math.floor(u * 16));
    const [px, py] = pts[idx]!;
    A.circle(c, px, py, 3.8, P.amber, P.ink, li * 0.5);
  }
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const isTopAdapter = t >= 403.8;

    if (!isTopAdapter) {
      // ── PHẦN A (366.30 – 403.8s): Góc SIDE CUTAWAY (Cân bằng Trọng tâm CG & Khớp ngắt Breakaway) ──
      let cam = K.track(
        t,
        [
          [366.3, { x: 25, y: -35, z: 1.14 }],
          [392.5, { x: 25, y: -35, z: 1.14 }],
          [394.5, { x: 120, y: 10, z: 1.12 }],
          [403.8, { x: 120, y: 10, z: 1.12 }],
        ],
        A.eio
      );

      // Rung lắc khi nhiễu động giật 2 máy bay lệch góc an toàn (393.3s) và khi khớp ngắt bung ra (396.7s)
      const turbWin = A.win(t, CUE.turbulence_yanks_apart - 0.3, 396.7, 0.25, 0.3);
      if (turbWin > 0.05) {
        cam = K.handheld(cam, t * 3.2, 8 * turbWin);
      }
      cam = K.withShake(cam, t, [
        [CUE.turbulence_yanks_apart, 14, 0.5],
        [CUE.breakaway_couplings_snap, 16, 0.45],
      ]);

      A.clear(c, P.bg);
      K.begin(c, cam);
      drawSkySideBg(c, cam, t, { speed: 220, highAltBand: true });

      const lo = lwO(c);
      const li = lwI(c);
      const [tx, ty] = SIDE_PAIR.tanker; // [210, -145]

      // Giai đoạn lệch Trọng tâm nguy hiểm (373.5 – 382.2s) vs Máy tính chia đều 3 bình ghim cứng CG (382.2 – 393.0s)
      const unbalWin = A.win(t, 373.5, CUE.computers_manifold_valves + 0.6, 0.8, 0.8);
      const cgWave = Math.sin((t - 373.5) * 2.1) * unbalWin;
      const compFixP = A.eio(t, CUE.computers_manifold_valves, CUE.splitting_wing_fuselage_tail + 1.2);

      // Nhiễu động giật chiếc tiêm kích tụt xuống & tách khỏi cần cứng (393.2 – 403.8s)
      const yankP = A.eio(t, CUE.turbulence_yanks_apart - 0.2, CUE.breakaway_couplings_snap);
      const snapP = A.eio(t, CUE.breakaway_couplings_snap - 0.1, CUE.shut_valves_ms + 0.4);

      const fx = -160 - yankP * 28 - snapP * 34;
      const fy = 75 + yankP * 32 + snapP * 26;

      // Mức xăng trong 3 bình của Tanker & Fighter
      const tWing = A.lerp(0.72, 0.52, A.ph(t, 366.3, 392.5));
      const tCenter = A.lerp(0.75, 0.54, A.ph(t, 366.3, 392.5));
      const tTail = A.lerp(0.70, 0.50, A.ph(t, 366.3, 392.5)) - cgWave * 0.22;

      const fMid = A.lerp(0.48, 0.78, compFixP);
      const fFwd = A.lerp(0.45, 0.76, compFixP) - Math.max(0, cgWave) * 0.25;
      const fAft = A.lerp(0.45, 0.76, compFixP) + Math.max(0, cgWave) * 0.32;

      // 1. Vẽ Modern Tanker ở chế độ mặt cắt CUTAWAY
      c.save();
      c.translate(tx, ty);
      drawModernTanker(c, 'cutaway', {
        scale: 1.25,
        tanks: { wing: tWing, center: tCenter, tail: tTail },
        valvesOpen: [true, true, true],
        nitrogen: 1,
        cgShift: -cgWave * 0.65,
        pitchDeg: -cgWave * 7.5,
      });
      c.restore();

      // 2. Vẽ Cần cứng Flying Boom (tách rời tại 396.7s khi khớp Breakaway bung ra)
      const bx0 = tx - 210;
      const by0 = ty + 16;
      const recX = fx - 16;
      const recY = fy - 24;
      const bx1 = A.lerp(recX, recX + 54, snapP);
      const by1 = A.lerp(recY, recY - 38, snapP);

      drawFlyingBoom(c, bx0, by0, bx1, by1, {
        extension: 0.72 - snapP * 0.18,
        locked: snapP < 0.1,
        flow: snapP < 0.1 ? 1 : 0,
        flowPhase: t,
      });

      if (snapP < 0.1) {
        A.line(c, [[bx0, by0 - 8], [bx1, by1 - 8]], P.sky, lo * 1.1);
      }

      // 3. Vẽ Strike Fighter ở chế độ mặt cắt CUTAWAY
      c.save();
      c.translate(fx, fy);
      drawStrikeFighter(c, 'cutaway', {
        scale: 1.28,
        hasReceptacle: true,
        tanks: { fwd: fFwd, mid: fMid, aft: fAft },
        valvesOpen: [true, true, true],
        nitrogen: 1,
        cgShift: cgWave * 0.85,
        pitchDeg: cgWave * 11.5 - yankP * 6,
      });
      c.restore();

      // Đường xung máy tính màu xanh sáng điều phối các van chia xăng sang 3 bình (382.0 – 392.5s)
      const compWin = A.win(t, CUE.computers_manifold_valves - 0.2, 392.6, 0.35, 0.4);
      if (compWin > 0.01) {
        A.withA(c, compWin, () => {
          for (const dx of [-75, -18, 32]) {
            A.circle(c, fx + dx, fy + 15, 7, P.sky, P.ink, li);
          }
          for (const dx of [-142, -8, 112]) {
            A.circle(c, tx + dx, ty + 28, 8, P.sky, P.ink, li);
          }
        });
      }

      // 4. Khung phóng lớn mặt cắt Khớp ngắt khẩn cấp ở góc phải dưới (Breakaway Couplings: 393.5 – 403.5s)
      const brkWin = A.win(t, 393.5, 403.5, 0.45, 0.4);
      if (brkWin > 0.01) {
        A.withA(c, brkWin, () => {
          const cx = 310;
          const cy = 125;
          A.line(c, [[recX, recY], [cx - 315, cy - 25]], P.ink, li, [A.px(c, 6), A.px(c, 5)]);
          A.rrect(c, cx - 315, cy - 88, 650, 176, 18, P.white, P.ink, lo * 1.2);

          drawCouplingCutaway(c, cx, cy, {
            gap: 0,
            latchesLocked: 1,
            bonded: 1,
            valveOpen: 1,
            fuelFlow: 1,
            breakaway: snapP,
            angleDeg: yankP * 18 * (1 - snapP * 0.5),
            t,
          });

          const pSnapSpark = A.ph(t, CUE.breakaway_couplings_snap - 0.05, CUE.breakaway_couplings_snap + 0.55);
          if (pSnapSpark > 0 && pSnapSpark < 1) {
            FX.sparks(c, cx, cy, pSnapSpark, 1.1, 0, Math.PI * 2, 6);
          }
        });
      }

      K.end(c);

      // ── Callout số liệu tối giản (tối đa 1 cùng lúc) ──
      const pTons = A.win(t, CUE.min_5_tons_10_20 - 0.2, 377.5, 0.25, 0.25);
      if (pTons > 0.01) {
        const [sx, sy] = K.toScreen(cam, (bx0 + bx1) / 2, (by0 + by1) / 2);
        UI.callout(c, '10–20 T / 5 MIN', sx - 165, sy - 95, {
          to: [sx, sy],
          p: pTons,
          color: P.amber,
        });
      }

      const pCG = A.win(t, CUE.splitting_wing_fuselage_tail + 1.2, 392.5, 0.25, 0.25);
      if (pCG > 0.01) {
        const [sx, sy] = K.toScreen(cam, fx - 18, fy - 2);
        UI.callout(c, 'CG', sx - 125, sy - 80, { to: [sx, sy], p: pCG, color: P.sky });
      }
    } else {
      // ── PHẦN B (403.8 – 415.58s): Góc TOP — Tanker hiện đại tích hợp cả Tail Boom + 2 Wing Pods ("Ổ cắm đa năng") ──
      const cam = K.track(
        t,
        [
          [403.8, { x: -45, y: 0, z: 1.02 }],
          [415.58, { x: -65, y: 0, z: 1.06 }],
        ],
        A.eio
      );

      A.clear(c, P.bg2);
      K.begin(c, cam);

      // Lưới tọa độ mặt biển nhìn từ trên xuống
      const v = K.view(cam, 120);
      c.strokeStyle = 'rgba(71, 85, 105, 0.11)';
      c.lineWidth = A.px(c, 1.5);
      const step = 150;
      const shift = ((t * 210) % step + step) % step;
      c.beginPath();
      for (let x = Math.floor(v.x0 / step) * step - shift; x <= v.x1; x += step) {
        c.moveTo(x, v.y0);
        c.lineTo(x, v.y1);
      }
      for (let y = Math.floor(v.y0 / step) * step; y <= v.y1; y += step) {
        c.moveTo(v.x0, y);
        c.lineTo(v.x1, y);
      }
      c.stroke();

      const tx = 175;
      const ty = 0;
      const extP = A.eio(t, 404.2, CUE.tail_boom_and_wing_pods + 1.2);

      // 1. Hai ống mềm xả từ 2 pod đầu cánh (y = -215 và y = +215)
      const hoseEndX = A.lerp(tx - 105, -165, extP);
      drawTopHose(c, tx - 95, -215, hoseEndX, -215, t);
      drawTopHose(c, tx - 95, 215, hoseEndX, 215, t);

      // 2. Cần cứng Flying Boom phóng ra từ chính giữa đuôi (y = 0)
      const boomEndX = A.lerp(tx - 210, -215, extP);
      drawFlyingBoom(c, tx - 195, 0, boomEndX, 0, {
        extension: 0.75 * extP,
        locked: extP > 0.9,
        flow: extP,
        flowPhase: t,
      });

      // 3. Vẽ Modern Tanker ở trung tâm mang cả Boom ở đuôi lẫn 2 Wing Pods ở đầu cánh
      c.save();
      c.translate(tx, ty);
      drawModernTanker(c, 'top', {
        scale: 1.22,
        wingPods: true,
        hasBoom: true,
      });
      c.restore();

      // 4. Ba loại máy bay khác chuẩn (Không quân, Hải quân, Trực thăng) cùng cắm vào "ổ cắm đa năng" trên trời
      const fLevel = A.lerp(0.35, 0.9, A.ph(t, 408.0, 415.4));

      // Giữa (y = 0): Tiêm kích Không quân nhận xăng qua ổ Receptacle trên lưng (Flying Boom)
      c.save();
      c.translate(-225, 0);
      drawStrikeFighter(c, 'top', {
        scale: 1.18,
        hasReceptacle: true,
        probeExtended: 0,
        fuelLevel: fLevel,
        afterburner: 0.35,
      });
      c.restore();

      // Cánh trên (y = -205): Tiêm kích hạm Hải quân nhận xăng qua cần Probe bên mũi (Wing Pod #1)
      c.save();
      c.translate(-250, -205);
      drawCarrierFighter(c, 'top', {
        scale: 1.18,
        buddyPod: false,
        probeExtended: 1,
      });
      c.restore();

      // Cánh dưới (y = +205): Trực thăng nhận xăng qua cần Probe dài vượt ngoài cánh quạt (Wing Pod #2)
      c.save();
      c.translate(-308, 205);
      drawHelicopter(c, 'top', {
        scale: 1.16,
        rotorPhase: t * 14,
        probeExtended: 1,
        rotorWarn: false,
      });
      c.restore();

      K.end(c);
    }
  }
}
