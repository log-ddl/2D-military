// scenes/sc22.ts — Chương 5 (409.36 – 448.02s): Phá bỏ ngộ nhận giữa Pháo nòng và Pháo phản lực.
// Góc nhìn TOP bản đồ chiến dịch toàn dải:
// - 409.36 – 425.44s: Khán giả xem tin tức thấy đòn đánh kho đạn từ xa dễ tưởng pháo nòng đã thừa thãi -> Không phải đối thủ cạnh tranh!
// - 425.90 – 435.38s: Pháo nòng là nhịp đập tiền duyên (5–10 km), bắn đạn giá rẻ suốt buổi chiều để ghim chiến hào & bẻ gãy xung phong.
// - 435.38 – 448.02s: Pháo phản lực là chiếc búa tạ cán dài giữ ở dự bị, xuất kích 2 phút đập nát Sở chỉ huy, Cầu vượt sông, Đoàn xe tập kết ở độ sâu 50 km.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import {
  drawEnvTop,
  drawTrench,
  drawHowitzer,
  drawHimars,
  drawSoldier,
  drawTargetSet,
  drawExplosion,
  drawCallout,
} from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam: K.Cam = { x: 0, y: 0, z: 1.15 };
    K.begin(c, cam);

    const riverX = 260;
    drawEnvTop(c, cam, {
      gridStep: 170,
      riverX,
      bridgeY: 0,
      roadY: 165,
    });

    const lw = A.px(c, LINE.outer);
    const lwIn = A.px(c, LINE.inner);

    // Hai vạch ranh giới nhiệm vụ: Tiền duyên 5–10 km (x = -40) và Chiều sâu 50 km (x = 460)
    const frontX = -40;
    const deepX = 460;
    A.line(c, [[frontX, -420], [frontX, 420]], P.olive, lwIn, [10, 8]);
    A.line(c, [[deepX, -420], [deepX, 420]], P.amber, lw, [12, 8]);

    // ── MỤC TIÊU TIỀN DUYÊN (5 – 10 KM): CHIẾN HÀO & BỘ BINH XUNG PHONG ──
    drawTrench(c, frontX, -140, 160, 80, 'top');
    drawTrench(c, frontX, 140, 160, 80, 'top');
    for (let i = -3; i <= 3; i++) {
      c.save();
      c.translate(frontX - 38 + (i % 2) * 14, i * 62);
      drawSoldier(c, { view: 'top', faction: 'enemy', pose: 'run' });
      c.restore();
    }

    // ── MỤC TIÊU CHIỀU SÂU (50 KM): SỞ CHỈ HUY / KHO ĐẠN, CẦU VƯỢT SÔNG, ĐOÀN XE TẬP KẾT ──
    // 1. Sở chỉ huy / Kho đạn ở (deepX, -175)
    c.save();
    c.translate(deepX, -175);
    c.scale(1.15, 1.15);
    drawTargetSet(c, 'depot_top', t >= 440.5 ? 1 : 0);
    c.restore();

    // 2. Cầu vượt sông tại (riverX, 0) đã được drawEnvTop vẽ sẵn

    // 3. Đoàn xe cơ giới tập kết (Massed Column) dọc trục đường ở (deepX, 165)
    for (let k = 0; k < 3; k++) {
      const vx = deepX - 75 + k * 75;
      A.rrect(c, vx - 26, 165 - 14, 52, 28, 4, P.enemy, P.ink, lw);
      A.rrect(c, vx - 12, 165 - 10, 24, 20, 2, P.enemyLight, P.ink, lwIn);
    }

    // Đòn đánh kho đạn mở đầu trên bản tin (410.5 – 416.5s)
    if (t >= 410.5 && t <= 416.8) {
      const pNews = A.sm(t, 410.5, 412.2);
      const nx = A.lerp(-580, deepX, pNews);
      const ny = A.lerp(60, -175, pNews);
      A.line(c, [[-580, 60], [nx, ny]], P.amber, lw);
      if (t >= 412.2) {
        drawExplosion(c, deepX, -175, A.clamp01((t - 412.2) / 2.2), 78, 10);
      }
    }

    // ── TUYẾN 1: KHẨU ĐỘI 3 PHÁO NÒNG (NHỊP ĐẬP TIỀN DUYÊN 5 – 10 KM, x = -280) ──
    const howY = [-175, 0, 175];
    const tubeActive = t >= 425.5;
    for (let i = 0; i < 3; i++) {
      const hy = howY[i];
      const cycle = tubeActive ? (t - 425.5 + i * 0.42) % 1.25 : -1;
      const recoil = cycle >= 0 && cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) * 0.6 : 0;
      const flash = cycle >= 0 && cycle < 0.18 ? 1 - cycle / 0.18 : 0;

      c.save();
      c.translate(-280, hy);
      c.scale(0.82, 0.82);
      drawHowitzer(c, { view: 'top', recoil, muzzleFlash: flash });
      c.restore();

      if (tubeActive && cycle >= 0) {
        const fp = A.clamp01(cycle / 0.85);
        const sx = A.lerp(-210, frontX - 15, fp);
        const sy = hy + (i - 1) * 14 * fp;
        A.line(c, [[-210, hy], [sx, sy]], P.olive, lwIn, [6, 5]);
        if (fp < 1) {
          A.circle(c, sx, sy, 5, P.ink, null, 0);
        } else {
          drawExplosion(c, frontX - 15, hy, A.clamp01((cycle - 0.85) / 0.4), 38, 6);
        }
      }
    }

    // ── TUYẾN 2: PHÁO PHẢN LỰC DỰ BỊ (BÚA TẠ CÁN DÀI 50 KM, x = -600 -> -490) ──
    const sledgeMove = A.eio(t, 435.4, 437.6);
    const himarsX = A.lerp(-620, -490, sledgeMove);
    c.save();
    c.translate(himarsX, 0);
    c.scale(0.88, 0.88);
    drawHimars(c, { view: 'top' });
    c.restore();

    // 3 đòn giáng búa tạ ở độ sâu 50 km:
    // 1. Sở chỉ huy (deepX, -175) lúc 438.2 -> 440.5s
    // 2. Cầu vượt sông (riverX, 0) lúc 439.6 -> 442.2s
    // 3. Đoàn xe tập kết (deepX, 165) lúc 441.0 -> 444.0s
    const strikes = [
      { t0: 438.2, tHit: 440.5, tx: deepX, ty: -175 },
      { t0: 439.6, tHit: 442.2, tx: riverX, ty: 0 },
      { t0: 441.0, tHit: 444.0, tx: deepX, ty: 165 },
    ];

    for (const s of strikes) {
      if (t >= s.t0) {
        const fp = A.sm(t, s.t0, s.tHit);
        const startX = himarsX + 65;
        const pts: A.Pt[] = [];
        const steps = 20;
        for (let k = 0; k <= steps; k++) {
          const u = (k / steps) * fp;
          pts.push([
            A.lerp(startX, s.tx, u),
            A.lerp(0, s.ty, u) - Math.sin(u * Math.PI) * 48,
          ]);
        }
        A.line(c, pts, P.amber, lw * 1.25);

        const lastPt = pts[pts.length - 1];
        if (fp < 1) {
          A.circle(c, lastPt[0], lastPt[1], 7, P.amber, P.ink, lwIn);
        } else {
          drawExplosion(c, s.tx, s.ty, A.clamp01((t - s.tHit) / 2.2), 76, 10);
        }
      }
    }

    K.end(c);

    // ── CALLOUTS TRÊN MÀN HÌNH ──
    const cQuestion = A.win(t, 415.0, 425.4, 0.35, 0.35);
    if (cQuestion > 0.01) {
      const ptH = K.toScreen(cam, -280, -175);
      const label =
        t < 420.3 ? 'WHY KEEP TUBE HOWITZERS?' : 'NOT COMPETITORS · TWO DISTINCT ROLES';
      drawCallout(c, ptH, [0, -65], label, cQuestion, P.olive);
    }

    const cHeartbeat = A.win(t, 425.9, 447.8, 0.35, 0.3);
    if (cHeartbeat > 0.01) {
      const ptF = K.toScreen(cam, frontX, -245);
      drawCallout(c, ptF, [-75, -55], '5 - 10 km · STEADY FRONT-LINE HEARTBEAT', cHeartbeat, P.olive);
    }

    const cSledge = A.win(t, 435.5, 447.8, 0.35, 0.3);
    if (cSledge > 0.01) {
      const ptD = K.toScreen(cam, deepX, -245);
      drawCallout(c, ptD, [-55, -55], '50 km DEEP · 2-MIN SLEDGEHAMMER', cSledge, P.amber);
    }
  }
}
