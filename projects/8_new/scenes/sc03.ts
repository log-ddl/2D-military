import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawRound, drawStageBg } from './_assets';
import { CUE } from './_cue';
import { rig } from './shared/rig';

/**
 * sc03 (50.68–82.24s): Góc thứ nhất — Hỏa lực (Firepower): Pháo 120/125mm, Đạn thanh xuyên APFSDS đục giáp & Ổn định nòng pháo (Stabilizer).
 * - 50.68–66.50s: Mặt cắt nòng pháo nạp đạn 120/125mm -> khai hỏa lúc 58.82s -> Camera theo đầu đạn tách 3 mảnh guốc (sabot) để lộ mũi tên kim loại đặc bay ở 1.5 km/s.
 * - 66.50–73.88s: Mặt cắt vách giáp xe địch: mũi tên đâm xuyên qua lớp thép bằng động năng thuần túy, đẩy nút kim loại (plug) và chùm mảnh văng (spall) vào khoang.
 * - 73.88–82.24s: Góc nhìn ngang toàn cảnh (side): Xe tăng chạy qua địa hình gồ ghề, thân xe nhấp nhô lên xuống nhưng nòng pháo giữ góc ngắm phẳng tuyệt đối và bắn trúng khi đang chạy lúc 79.4s.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < 66.5) {
      // Pha 1 (50.68–66.50s): Từ mặt cắt khóa nòng 120/125mm tới viên đạn tách guốc APFSDS đang bay
      const fireT = CUE.ch1_fire_dart;
      const inFlight = t >= fireT;
      const flightP = A.sm(t, fireT, 66.4);

      const camBase: K.Cam = !inFlight
        ? K.track(
            t,
            [
              [50.68, { x: 40, y: 10, z: 1.15 }],
              [54.5, { x: 140, y: -25, z: 1.42 }],
              [fireT, { x: 180, y: -25, z: 1.35 }],
            ],
            A.eio
          )
        : {
            x: A.lerp(280, 920, flightP),
            y: -25,
            z: A.lerp(1.35, 1.55, A.sm(t, fireT, fireT + 2.2)),
          };

      const cam = K.withShake(camBase, t, [[fireT, 18, 0.45]]);
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 185 });

      const rec = A.bump(t, fireT, 0.45);
      const tk = drawTank(c, {
        x: -120,
        y: 185,
        s: 2.25,
        dir: 1,
        view: 'cutaway',
        recoil: rec,
        highlightPart: 'breech',
      });

      // Trước khi bắn: hiển thị viên đạn lớn cắt dọc ngay trên nòng pháo để đối chiếu cỡ nòng 120/125mm và cấu tạo bên trong
      if (!inFlight) {
        const showRound = A.sm(t, 52.2, 53.6);
        A.withA(c, showRound, () => {
          A.rrect(c, 55, -215, 310, 92, 12, P.paper, P.ink, lwO);
          drawRound(c, 195, -169, 1.45, 0, 'full', 0, 0.15);
        });
      } else {
        // Sau khi bắn (58.82–66.50s): Chớp lửa đầu nòng + Đầu đạn bay sang phải và tách bỏ 3 cánh guốc (sabot)
        FX.muzzleFlash(c, tk.muzzle[0], tk.muzzle[1], 0, A.ph(t, fireT, fireT + 0.32), 1.8);
        const dartX = A.lerp(tk.muzzle[0] + 40, 1020, flightP);
        const dartY = tk.muzzle[1];
        const sepP = A.sm(t, fireT + 0.45, fireT + 3.2);

        // Vệt gió siêu thanh quanh mũi tên kim loại
        for (let i = -2; i <= 2; i++) {
          if (i === 0) continue;
          const wy = dartY + i * 28;
          const wx = dartX - 40 - Math.abs(i) * 35;
          A.line(c, [[wx - 90, wy], [wx, wy]], P.sky, lwI, [14, 10]);
        }
        // Sóng xung kích nón Mach ở mũi đạn
        A.line(
          c,
          [
            [dartX + 95, dartY - 58],
            [dartX + 165, dartY],
            [dartX + 95, dartY + 58],
          ],
          P.sky,
          lwO * 0.85
        );

        drawRound(c, dartX, dartY, 1.55, 0, 'separating', sepP, 0);
      }

      K.end(c);

      // Callout cỡ nòng 120 / 125 mm (@56.0s) và vận tốc 1.5 km/s (@62.1s)
      const pCal = A.win(t, CUE.ch1_120mm - 0.2, 58.6, 0.25, 0.25);
      if (pCal > 0.01) {
        const pt = K.toScreen(cam, 210, -169);
        UI.callout(c, '120 / 125 mm', pt[0], pt[1] - 95, {
          to: [pt[0], pt[1] - 35],
          p: pCal,
          color: P.ink,
        });
      }

      const pSpd = A.win(t, CUE.ch1_dart_speed, 66.2, 0.3, 0.3);
      if (pSpd > 0.01) {
        const dartX = A.lerp(tk.muzzle[0] + 40, 1020, flightP);
        const pt = K.toScreen(cam, dartX, tk.muzzle[1]);
        UI.callout(c, '1.5 km/s', pt[0], pt[1] - 115, {
          to: [pt[0], pt[1] - 25],
          p: pSpd,
          color: P.amber,
        });
      }
    } else if (t < CUE.ch1_stabilized) {
      // Pha 2 (66.50–74.08s): Cận cảnh mặt cắt giáp xe mục tiêu — Thanh xuyên đục thủng vỏ thép đẩy nút thép (plug) và chùm mảnh văng (spall) vào khoang kíp lái
      const hitT = CUE.ch1_punch_armor + 0.35;
      const penP = A.sm(t, 66.6, hitT + 1.4);
      const spallAge = Math.max(0, t - hitT);

      const cam = K.withShake({ x: 110, y: 15, z: 1.52 }, t, [[hitT, 22, 0.65]]);
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 260 });

      // Khoang xe mục tiêu bên phải vách giáp (x: -40..460)
      A.rrect(c, -40, -210, 520, 470, 12, P.paper, P.ink, lwO);
      // Hình bóng kíp lái đối phương bên trong khoang
      rig(c, {
        x: 240,
        y: 245,
        s: 1.65,
        dir: -1,
        skin: 'foe',
        weapon: null,
        alpha: spallAge > 0.4 ? 0.35 : 0.85,
      });

      // Tấm giáp thép dày ở x = -80..10 (bị khoét rãnh nóng chảy khi thanh xuyên đi qua)
      A.rrect(c, -95, -210, 105, 470, 6, P.slate, P.ink, lwO);
      if (spallAge > 0) {
        const holeW = A.clamp01(spallAge * 2.2) * 105;
        A.rrect(c, -95, -26, holeW, 52, 4, P.amber, P.enemy, lwI);
      }

      // Thanh xuyên kim loại lao từ trái xuyên qua tấm giáp
      const dx = A.lerp(-420, 130, penP);
      drawRound(c, dx, 0, 1.5, 0, 'dart');

      // Nút thép bị đẩy bật ra (plug of metal) + Chùm mảnh văng hình nón (spray of fragments)
      if (spallAge > 0) {
        const plugX = 25 + A.eo(t, hitT, hitT + 1.8) * 280;
        const plugY = A.ei(t, hitT, hitT + 1.8) * 65;
        A.rrect(c, plugX, -18 + plugY, 34, 36, 4, P.enemy, P.ink, lwO);

        // Chùm mảnh văng toả hình quạt vào khoang
        for (let i = 0; i < 18; i++) {
          const ang = ((i - 8.5) / 18) * 1.15;
          const spd = 210 + (i % 4) * 55;
          const dist = Math.min(390, spallAge * spd);
          const fx = 12 + Math.cos(ang) * dist;
          const fy = Math.sin(ang) * dist;
          A.line(
            c,
            [
              [12, 0],
              [fx, fy],
            ],
            i % 2 ? P.amber : P.enemy,
            lwI * 0.9,
            [8, 12]
          );
          A.poly(
            c,
            [
              [fx - 6, fy - 4],
              [fx + 7, fy],
              [fx - 5, fy + 5],
            ],
            P.enemy,
            P.ink,
            lwI * 0.7
          );
        }
        FX.sparks(c, 10, 0, A.clamp01(spallAge / 0.8), 1.4, 0, 1.3, 11);
      }

      K.end(c);
    } else {
      // Pha 3 (74.08–82.24s): Hệ thống ổn định nòng pháo (Gun Stabilizer) — Thân xe dập dềnh qua mô đất nhưng nòng pháo giữ nguyên đường ngắm ngang và khai hỏa lúc 79.4s
      const fireStabT = CUE.ch1_stab_fire;
      const dt = t - CUE.ch1_stabilized;
      // Thân xe nghiêng lên xuống mạnh khi vượt địa hình gồ ghề
      const hullPitch = Math.sin(dt * 4.2) * 0.11 + Math.cos(dt * 2.7) * 0.05;
      const bounceY = Math.sin(dt * 4.2 + 0.5) * 18;
      // Nòng pháo bù trừ góc nghiêng thân xe (gunPitch = hullPitch) để luôn chỉ thẳng ngang (muzzleAng = 0)!
      const gunPitch = hullPitch;

      const cam = K.withShake({ x: 60, y: 20, z: 1.04 }, t, [[fireStabT, 16, 0.45]]);
      K.begin(c, cam);

      // Địa hình đồng bằng gồ ghề trôi sang trái khi xe chạy tới
      drawStageBg(c, 'field', { groundY: 205, scrollX: dt * 360 });

      const rec = A.bump(t, fireStabT, 0.4);
      const tk = drawTank(c, {
        x: -140,
        y: 200 + bounceY,
        s: 2.1,
        dir: 1,
        view: 'side',
        hullRot: hullPitch,
        gunPitch: gunPitch,
        wheelPhase: t * 9.5,
        recoil: rec,
      });

      // Đường chuẩn ngắm phẳng ngang màu xanh P.sky để người xem thấy rõ nòng pháo không hề lệch dù thân xe nhấp nhô
      UI.dashed(c, [tk.muzzle[0], tk.muzzle[1]], [950, tk.muzzle[1]], P.sky, lwO, t * 80);

      // Khai hỏa khi đang chạy lúc 79.4s
      const shotP = A.ph(t, fireStabT, fireStabT + 0.55);
      if (shotP > 0 && shotP <= 1) {
        FX.muzzleFlash(c, tk.muzzle[0], tk.muzzle[1], 0, A.clamp01(shotP * 2.2), 1.6);
        FX.straightShot(c, tk.muzzle, [920, tk.muzzle[1]], shotP, {
          color: P.amber,
          w: 7,
          trail: 0.35,
        });
      }

      K.end(c);
    }
  }
}
