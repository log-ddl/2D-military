import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawRound, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc01 (0.00–28.98s): Hook — Chiếc hộp thép chứa đầy thuốc nổ và 4 con người ngồi trong các khe hẹp.
 * - 0.00–11.20s: Góc cutaway ngang mở ra từ vỏ ngoài -> tiến cận vào viên đạn 20kg và các hạt thuốc phóng cháy rực.
 * - 11.20–22.20s: Góc top-cutaway thấy 40 viên đạn vây quanh kíp lái -> tia xuyên từ phải đâm thủng vỏ -> kích nổ chuỗi đạn biến cỗ máy 60 tấn thành biển lửa.
 * - 22.20–28.98s: Trở lại mặt cắt ngang chiếc xe tăng nguyên vẹn, làm nổi bật kíp lái ngồi lọt thỏm giữa các khối đạn và máy móc.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const isTopPhase = t >= 11.2 && t < CUE.ch1_arrangement;

    if (!isTopPhase) {
      // Góc nhìn mặt cắt ngang (Cutaway Side)
      const cam = K.track(
        t,
        [
          [0.0, { x: -20, y: 15, z: 1.08 }],
          [3.5, { x: -35, y: 5, z: 1.24 }],
          [7.4, { x: -165, y: -25, z: 1.48 }],
          [11.1, { x: -165, y: -25, z: 1.48 }],
          [22.2, { x: -15, y: 15, z: 1.22 }],
          [28.98, { x: 0, y: 20, z: 1.08 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 185 });

      // Vẽ vỏ ngoài mờ dần trong 1.8 giây đầu để tạo hiệu ứng X-quang mở hộp thép
      const shellFade = 1 - A.sm(t, 0.25, 1.85);
      const ammoPulse =
        t < 11.2
          ? 0.25 + 0.35 * Math.sin(t * 4.5)
          : 0.2 + 0.25 * Math.sin(t * 3.0);

      drawTank(c, {
        x: 0,
        y: 185,
        s: 2.35,
        dir: 1,
        view: 'cutaway',
        ammoLayout: 'bustle',
        ammoCount: 12,
        ammoGlow: ammoPulse,
        highlightPart: t >= CUE.ch1_arrangement ? 'crew' : t >= CUE.ch1_decision ? 'ammo' : 'none',
      });

      if (shellFade > 0.01) {
        A.withA(c, shellFade * 0.85, () => {
          drawTank(c, {
            x: 0,
            y: 185,
            s: 2.35,
            dir: 1,
            view: 'side',
          });
        });
      }

      // Khi nhắc tới "A single gun round weighs around 20 kilograms... propellant charge that burns like a firework" (7.5–11.2s):
      // Phóng một mặt cắt viên đạn 120mm lớn phía trên khoang đạn để người xem thấy rõ hạt thuốc phóng cháy bên trong vỏ
      const roundWin = A.win(t, 7.3, 11.15, 0.4, 0.3);
      if (roundWin > 0.01) {
        A.withA(c, roundWin, () => {
          const rx = -175;
          const ry = -205;
          A.rrect(c, rx - 145, ry - 48, 290, 96, 12, P.paper, P.ink, A.px(c, LINE.outer));
          const burnP = A.sm(t, 9.8, 11.1);
          drawRound(c, rx - 10, ry, 1.45, 0, 'full', 0, burnP);
          if (burnP > 0.05) {
            FX.sparks(c, rx - 45 + burnP * 65, ry, (t * 2.5) % 1, 0.75, 0, Math.PI * 2, 7);
          }
        });
      }

      // Từ 22.2–28.98s: Vẽ các khung viền đỏ đứt nét quanh khoang đạn và khoang động cơ để thấy kíp lái bị kẹp vào các khe hẹp ("placed in whatever gaps are left")
      if (t >= CUE.ch1_arrangement) {
        const gapP = A.sm(t, CUE.ch1_arrangement, CUE.ch1_arrangement + 1.2);
        A.withA(c, gapP, () => {
          // Vùng nguy hiểm 1: khoang đạn đuôi tháp pháo
          A.rrect(c, -350, -112, 168, 92, 6, null, P.enemy, A.px(c, 3.5));
          // Vùng nguy hiểm 2: đạn dự trữ trong thân
          A.rrect(c, -225, 10, 195, 76, 6, null, P.enemy, A.px(c, 3.5));
        });
      }

      K.end(c);

      // Callout duy nhất cho con số 20 kg khi voice đọc
      const p20 = A.win(t, CUE.ch1_round_20kg - 0.2, 11.1, 0.25, 0.25);
      if (p20 > 0.01) {
        const scPt = K.toScreen(cam, -175, -205);
        UI.callout(c, '20 kg', scPt[0] + 220, scPt[1] - 10, {
          to: [scPt[0] + 95, scPt[1]],
          p: p20,
          color: P.amber,
        });
      }
    } else {
      // Góc nhìn từ trên xuống cắt lớp (Top-Cutaway: 11.20–22.20s)
      // Cho thấy rõ vòng 40 viên đạn xếp quanh sàn và khoang đuôi, kế đó một tia đạn xuyên vào làm nổ tung toàn bộ
      const hitP = A.ph(t, CUE.ch1_hit_through, CUE.ch1_hit_through + 0.55);
      const fireAge = Math.max(0, t - (CUE.ch1_hit_through + 0.45));
      const camBase: K.Cam = {
        x: 0,
        y: 0,
        z: A.lerp(1.15, 1.02, A.sm(t, 11.2, 21.8)),
      };
      const cam = K.withShake(camBase, t, [
        [CUE.ch1_hit_through + 0.42, 22, 0.65],
        [CUE.ch1_60ton_fire, 18, 0.8],
      ]);

      K.begin(c, cam);
      drawStageBg(c, 'top-map');

      // Chiếc xe tăng nhìn từ trên xuống mở nắp (top-cutaway, vòng đạn carousel + khoang đạn hiển thị đủ 20+20 = 40 viên)
      const countGrow = Math.floor(A.lerp(4, 18, A.sm(t, 11.4, 13.2)));
      const glow =
        fireAge > 0
          ? 1
          : t >= CUE.ch1_firework
            ? 0.45 + 0.45 * Math.sin(t * 10)
            : 0.15;

      drawTank(c, {
        x: 0,
        y: 0,
        s: 2.35,
        view: 'top-cutaway',
        ammoLayout: 'carousel',
        ammoCount: countGrow,
        ammoGlow: glow,
        turretYaw: 0.08,
      });

      // Tia lửa "burns the way a firework does" (13.16–16.16s) chạy quanh vòng đạn
      if (t >= CUE.ch1_firework && t < CUE.ch1_hit_through + 0.4) {
        const fwAng = (t - CUE.ch1_firework) * 3.8;
        const fx = Math.cos(fwAng) * 130;
        const fy = Math.sin(fwAng) * 130;
        FX.sparks(c, fx, fy, ((t - CUE.ch1_firework) * 3) % 1, 0.85, fwAng, Math.PI, 3);
      }

      // Lúc 16.40s: Một thanh xuyên đỏ rực từ bên phải lao xuyên qua sườn xe chạm đúng vòng thuốc phóng
      if (hitP > 0 && hitP <= 1) {
        FX.straightShot(c, [820, -210], [85, -35], hitP, {
          color: P.enemy,
          w: 8,
          trail: 0.45,
        });
      }

      // Ngay khi chạm thuốc phóng (16.85s–22.0s): Chuỗi nổ lan khắp khoang xe biến xe tăng 60 tấn thành biển lửa
      if (fireAge > 0) {
        FX.explosion(c, 55, -25, 220, A.clamp01(fireAge / 0.85));
        if (fireAge > 0.25) {
          FX.explosion(c, -65, 30, 260, A.clamp01((fireAge - 0.25) / 0.95));
        }
        FX.fire(c, 0, 25, fireAge, 2.2);
        FX.smoke(c, 0, 0, fireAge, 2.0, 9);
      }

      K.end(c);

      // Callout "40 rounds" (@11.64s) và "60 t" (@19.46s) — tối đa 1 cùng lúc
      const p40 = A.win(t, CUE.ch1_carry_40 - 0.15, 15.8, 0.25, 0.3);
      if (p40 > 0.01) {
        const pt = K.toScreen(cam, 0, -135);
        UI.callout(c, '40 rounds', pt[0] + 240, pt[1] - 70, {
          to: [pt[0] + 60, pt[1]],
          p: p40,
          color: P.amber,
        });
      }

      const p60 = A.win(t, CUE.ch1_60ton_fire - 0.2, 21.8, 0.25, 0.3);
      if (p60 > 0.01) {
        const pt = K.toScreen(cam, -120, -110);
        UI.callout(c, '60 tons', pt[0] - 240, pt[1] - 60, {
          to: [pt[0], pt[1]],
          p: p60,
          color: P.enemy,
        });
      }
    }
  }
}
