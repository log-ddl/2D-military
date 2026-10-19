import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';
import { stateAt } from './_state';

/**
 * sc01 (0.00–26.66s): Hook — Nghịch lý tiếng hét 1 chiều vs tiếng vọng 2 chiều.
 * Góc nhìn: SIDE bầu trời - mặt đất. Chủ thể lớn, rõ sức nặng thị giác ngay từ t=0.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    // Camera ôm sát chủ thể (z=1.18), từ 20.18s lùi nhẹ (z=0.96) để lộ thêm bầu trời và các máy bay khác
    const cam = K.track(
      t,
      [
        [0, { x: -30, y: 45, z: 1.18 }],
        [CUE.ch1_trip_twice, { x: -30, y: 55, z: 1.14 }],
        [CUE.ch1_announcing + 3.5, { x: 10, y: 10, z: 0.96 }],
      ],
      A.eio
    );

    K.begin(c, cam);

    // Nền địa hình SIDE
    M.drawSideTerrain(c, -1300, 1300, st.radarGroundY);

    // Tâm phát sóng ở đầu feed horn của chảo radar
    const txOriginX = st.radarSideX + 48;
    const txOriginY = st.radarGroundY - 108;
    const dx = st.jetSideX - txOriginX;
    const dy = st.jetSideY - txOriginY;
    const distToJet = Math.hypot(dx, dy);
    const beamAngle = Math.atan2(dy, dx);

    // 1) Sóng phát đi ("tiếng hét" - màu P.amber, nét dày, luôn có mặt ngay từ t=0)
    const outP1 = A.ph(t, 0, CUE.ch1_receiver + 0.4);
    const rOut1 = A.lerp(150, distToJet - 65, outP1);
    if (t < CUE.ch1_bounce_back + 1.5) {
      for (const dr of [-42, -21, 0]) {
        M.drawWaveArc(
          c,
          txOriginX,
          txOriginY,
          Math.max(28, rOut1 + dr),
          beamAngle,
          0.44,
          P.amber,
          1 - A.sm(t, CUE.ch1_bounce_back, CUE.ch1_bounce_back + 1.5),
          6.5
        );
      }
    }

    // Các đợt sóng phát lặp lại khi radar "hét" vang cả bầu trời
    for (let k = 0; k < 5; k++) {
      const tStart = 1.2 + k * 4.8;
      if (t >= tStart) {
        const p = (t - tStart) / 6.5;
        if (p <= 1.25) {
          const rad = 90 + p * 1020;
          const spread = t >= CUE.ch1_announcing ? 0.98 : 0.48;
          M.drawWaveArc(
            c,
            txOriginX,
            txOriginY,
            rad,
            beamAngle - (t >= CUE.ch1_announcing ? 0.12 : 0),
            spread,
            P.amber,
            A.clamp01(1 - p * 0.72),
            5.5
          );
        }
      }
    }

    // 2) Khi sóng phát chạm máy bay (7.32s): Đầu thu RWR trên máy bay bắt được ngay và vạch tia định vị ngược về radar
    if (st.rwrAlert > 0.01) {
      A.withA(c, st.rwrAlert, () => {
        const lockP = A.eo(t, CUE.ch1_receiver, CUE.ch1_receiver + 2.0);
        const lx = A.lerp(st.jetSideX - 115, txOriginX, lockP);
        const ly = A.lerp(st.jetSideY, txOriginY, lockP);
        A.line(c, [[st.jetSideX - 115, st.jetSideY], [lx, ly]], P.amber, M.lwO(c), [14, 10]);
        if (lockP > 0.85) {
          c.save();
          c.translate(st.radarSideX, st.radarGroundY - 72);
          c.rotate(Math.PI / 4);
          A.rrect(c, -64, -64, 128, 128, 8, null, P.enemy, M.lwO(c));
          c.restore();
        }
      });
    }

    // 3) Tiếng vọng phản hồi ("tiny fraction bounce back" - màu P.sky, mỏng và yếu, phải đi ngược cả chặng về)
    if (t >= CUE.ch1_bounce_back - 0.6) {
      const retP = A.ph(t, CUE.ch1_bounce_back - 0.6, CUE.ch1_trip_twice + 3.2);
      const rRet = A.lerp(55, distToJet - 45, retP);
      const retAlpha = A.lerp(0.95, 0.35, retP);
      M.drawWaveArc(c, st.jetSideX - 95, st.jetSideY, rRet, beamAngle + Math.PI, 0.34, P.sky, retAlpha, 3.2);
      M.drawWaveArc(c, st.jetSideX - 95, st.jetSideY, Math.max(18, rRet - 24), beamAngle + Math.PI, 0.3, P.sky, retAlpha * 0.75, 2.2);
    }

    // 4) Thanh sơ đồ so sánh hành trình 1 chiều (Máy bay nghe ngay) vs 2 chiều (Radar phải đợi) ở 15.68–26.66s
    if (t >= CUE.ch1_trip_twice - 0.3) {
      const barA = A.sm(t, CUE.ch1_trip_twice - 0.3, CUE.ch1_trip_twice + 0.6);
      A.withA(c, barA, () => {
        const by = st.radarGroundY + 95;
        const bx0 = st.radarSideX;
        const bx1 = st.jetSideX - 20;
        A.rrect(c, bx0 - 45, by - 48, bx1 - bx0 + 90, 108, 10, P.paper, P.ink, M.lwO(c));

        // Hàng trên: Lượt đi 1x
        const p1 = A.sm(t, CUE.ch1_trip_twice, CUE.ch1_trip_twice + 1.8);
        A.line(c, [[bx0, by - 18], [A.lerp(bx0, bx1, p1), by - 18]], P.amber, A.px(c, 7));
        A.circle(c, A.lerp(bx0, bx1, p1), by - 18, 10, P.amber, P.ink, M.lwI(c));

        // Hàng dưới: Lượt đi + Lượt về 2x
        const p2 = A.sm(t, CUE.ch1_trip_twice, CUE.ch1_trip_twice + 3.8);
        const turnP = Math.min(1, p2 * 2);
        const backP = Math.max(0, (p2 - 0.5) * 2);
        A.line(c, [[bx0, by + 20], [A.lerp(bx0, bx1, turnP), by + 20]], P.amber, A.px(c, 3.5));
        if (backP > 0) {
          A.line(c, [[bx1, by + 32], [A.lerp(bx1, bx0, backP), by + 32]], P.sky, A.px(c, 3.5), [8, 6]);
          A.circle(c, A.lerp(bx1, bx0, backP), by + 32, 8, P.sky, P.ink, M.lwI(c));
        }
      });
    }

    // 5) Từ 20.18s ("announcing its position to the whole sky"): thêm 2 máy bay ở xa cũng bắt được sóng RWR
    if (t >= CUE.ch1_announcing - 0.2) {
      const extraA = A.sm(t, CUE.ch1_announcing - 0.2, CUE.ch1_announcing + 1.2);
      A.withA(c, extraA, () => {
        M.drawIntruderJet(c, -60, -290, 'side', { scale: 0.92, rwrAlert: extraA });
        M.drawIntruderJet(c, 650, -15, 'side', { scale: 0.95, rwrAlert: extraA });
        A.line(c, [[-145, -290], [txOriginX, txOriginY]], P.amber, M.lwI(c), [10, 10]);
        A.line(c, [[565, -15], [txOriginX, txOriginY]], P.amber, M.lwI(c), [10, 10]);
      });
    }

    // Vẽ chủ thể chính lớn, rõ nét: Đài radar mặt đất (trái) và Máy bay đối phương (phải)
    M.drawGroundRadar(c, st.radarSideX, st.radarGroundY, 'side', {
      scale: 1.55,
      dishAngle: st.radarDishElev,
      active: true,
    });
    M.drawIntruderJet(c, st.jetSideX, st.jetSideY, 'side', {
      scale: 1.42,
      rwrAlert: st.rwrAlert,
    });

    K.end(c);
  }
}
