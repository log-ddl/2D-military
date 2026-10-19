import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc13 (341.74–364.18s): Chương 5 (Phần 1) — Tử huyệt thông tin bộ đàm & Kỷ luật im lặng vô tuyến
 * Nối liên tục từ cuối sc12 trên góc nhìn TOP:
 * - Đơn vị nói nhiều trên bộ đàm ([-460, 120]) bị 2 trạm dò sóng đối phương giao hội phương vị (triangulation) và pháo kích nổ.
 * - Ngược lại, Sở chỉ huy có kỷ luật im lặng vô tuyến ([-420, -160]) chỉ phát xung cực ngắn, tắt sóng và cơ động sang vị trí mới ([-60, -180]),
 *   khiến tia dò sóng của địch quét vào khoảng trống vô hình ("looks, from the outside, like nothing at all").
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Khớp chính xác camera cuối sc12 tại t = 341.74s: { x: -120, y: -20, z: 1.0 }
    const camBase = K.track(
      t,
      [
        [341.74, { x: -120, y: -20, z: 1.0 }],
        [349.0, { x: -30, y: -25, z: 0.98 }],
        [364.18, { x: 0, y: -35, z: 0.98 }],
      ],
      A.eio
    );
    const shellHit1 = 346.8;
    const shellHit2 = 347.4;
    const cam = K.withShake(camBase, t, [
      [shellHit1, 15, 0.55],
      [shellHit2, 18, 0.65],
    ]);

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawMapEnv(c, cam, { roadY: -175, ridge: true, coast: true });

    const noisyHQ: A.Pt = [-460, 120];
    const df1: A.Pt = [390, -150];
    const df2: A.Pt = [420, 185];

    const triP = A.sm(t, CUE.c5_talk_found + 0.3, CUE.c5_jammed_listened);
    const silencePhase = A.sm(t, CUE.c5_silence_weapon - 0.2, CUE.c5_silence_weapon + 0.8);
    const moveProg = A.eio(t, CUE.c5_hq_move, CUE.c5_stay_off_air + 1.8);

    // 1. Hai trạm dò sóng & tác chiến điện tử đối phương ở phía đông
    for (const dp of [df1, df2]) {
      c.save();
      c.translate(dp[0], dp[1]);
      U.drawGroundStation(c, {
        view: 'top',
        scale: 1.15,
        role: 'jammer',
        team: 'enemy',
        dishAngle: Math.PI,
        active: true,
      });
      c.restore();
    }

    // 2. NỬA NAM: Đơn vị nói bộ đàm liên tục (noisyHQ) -> bị giao hội định vị và pháo kích (341.74–348.5s)
    const destroyed = t >= shellHit1;
    if (!destroyed) {
      for (let i = 0; i < 3; i++) {
        const p = ((t * 1.2 + i * 0.33) % 1);
        const r = A.lerp(24, 165, p);
        A.withA(c, (1 - p) * 0.8, () => {
          A.circle(c, noisyHQ[0], noisyHQ[1], r, null, P.sky, lwO);
        });
      }
    }

    // Hai tia giao hội phương vị (triangulation) của địch cắt nhau tại noisyHQ
    if (triP > 0.01 && t < 351.0) {
      A.withA(c, triP * (1 - A.sm(t, 349.2, 351.0)), () => {
        A.line(c, [df1, noisyHQ], P.enemy, lwO, [A.px(c, 10), A.px(c, 7)]);
        A.line(c, [df2, noisyHQ], P.enemy, lwO, [A.px(c, 10), A.px(c, 7)]);
        A.circle(c, noisyHQ[0], noisyHQ[1], 56, 'rgba(180,73,60,0.22)', P.enemy, lwO);
      });
    }

    c.save();
    c.translate(noisyHQ[0], noisyHQ[1]);
    U.drawMobileHQ(c, {
      view: 'top',
      scale: 1.2,
      emitting: !destroyed,
      silentGhost: destroyed,
    });
    c.restore();

    // Hai loạt đạn pháo dập trúng đơn vị nói nhiều trên radio (346.8s & 347.4s)
    U.drawExplosion(c, noisyHQ[0] - 15, noisyHQ[1] - 10, A.ph(t, shellHit1, shellHit1 + 1.2), 78);
    U.drawExplosion(c, noisyHQ[0] + 22, noisyHQ[1] + 14, A.ph(t, shellHit2, shellHit2 + 1.3), 88);

    // 3. NỬA BẮC: Kỷ luật im lặng vô tuyến ("treat silence as a weapon. Headquarters move, change frequencies and talk less": 348.30–364.18s)
    if (silencePhase > 0.01) {
      const oldHQPos: A.Pt = [-420, -165];
      const newHQPos: A.Pt = [-50, -185];
      const curHQPos: A.Pt = [
        A.lerp(oldHQPos[0], newHQPos[0], moveProg),
        A.lerp(oldHQPos[1], newHQPos[1], moveProg),
      ];

      A.withA(c, silencePhase, () => {
        // Chỉ phát 1 xung cực ngắn lúc 349.0–350.4s rồi tắt hẳn
        const shortBurst = A.win(t, 348.8, 350.6, 0.2, 0.3);
        if (shortBurst > 0.02) {
          A.withA(c, shortBurst, () => {
            A.circle(c, oldHQPos[0], oldHQPos[1], 68, null, P.sky, lwO);
          });
        }

        // Bóng vị trí cũ đã bỏ trống khi Sở chỉ huy di chuyển
        if (moveProg > 0.05) {
          c.save();
          c.translate(oldHQPos[0], oldHQPos[1]);
          U.drawMobileHQ(c, { view: 'top', scale: 1.15, emitting: false, silentGhost: true });
          c.restore();
          A.line(c, [oldHQPos, curHQPos], P.olive, lwO, [A.px(c, 8), A.px(c, 7)]);
        }

        // Hai tia dò sóng của địch quét muộn vào vị trí cũ (oldHQPos) hoặc quét trượt qua đầu vị trí mới vì HQ giữ im lặng tuyệt đối
        const enemySearchP = A.sm(t, CUE.c5_hear_target - 0.5, CUE.c5_hear_target + 1.0);
        if (enemySearchP > 0.02) {
          const sweepY = A.lerp(-165, -280, Math.sin((t - 357) * 1.4) * 0.5 + 0.5);
          const missPt: A.Pt = [oldHQPos[0], sweepY];
          A.withA(c, enemySearchP, () => {
            A.line(c, [df1, missPt], P.enemy, lwI, [A.px(c, 10), A.px(c, 8)]);
            A.line(c, [df2, missPt], P.enemy, lwI, [A.px(c, 10), A.px(c, 8)]);
            A.circle(c, missPt[0], missPt[1], 46, null, P.enemy, lwI);
          });
        }

        // Chiếc xe Sở chỉ huy thật ở vị trí mới tắt sóng hoàn toàn ("best radio discipline looks, from the outside, like nothing at all")
        c.save();
        c.translate(curHQPos[0], curHQPos[1]);
        U.drawMobileHQ(c, {
          view: 'top',
          scale: 1.25,
          emitting: shortBurst > 0.2,
          silentGhost: t > CUE.c5_nothing_at_all - 0.5,
        });
        c.restore();
      });
    }

    K.end(c);
  }
}
