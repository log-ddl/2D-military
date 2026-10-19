// sc02.ts — Chương 1 (20.10–43.35s): Tướng Guy Simonds ra lệnh cải tạo pháo tự hành thành xe chở quân Kangaroo:
// cắt bỏ khẩu pháo, tháo giá đạn, lắp ghế băng vào thùng thép, và giảm ngay thương vong dưới đạn nổ chụp.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as R from './shared/rig';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';
import { stateAt } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    // Camera: từ cận trung cảnh trong xưởng dã chiến (20.1..32.8s) -> lia theo chiếc Kangaroo lăn bánh qua mưa mảnh đạn (32.8..38.3s)
    // -> giữ khung tổng kết nguyên lý "lấy xe chiến đấu và vứt bỏ khẩu pháo" (38.3..43.35s)
    const baseCam = K.track(
      t,
      [
        [20.1, { x: -20, y: -135, z: 1.52 }],
        [25.5, { x: 15, y: -145, z: 1.65 }],
        [32.4, { x: 10, y: -140, z: 1.52 }],
        [37.8, { x: 460, y: -142, z: 1.44 }],
        [43.35, { x: 485, y: -145, z: 1.48 }],
      ],
      A.eio,
    );
    const cam = K.withShake(baseCam, t, [
      [34.2, 12, 0.5],
      [35.8, 12, 0.5],
    ]);

    K.begin(c, cam);

    V.drawSideGround(c, -1400, 1800, 0, 'dirt');

    // Khung giàn cẩu dã chiến (Field workshop gantry) ở x = -220..220
    A.line(c, [[-230, 0], [-210, -310]], P.slate, LINE.outer + 2);
    A.line(c, [[230, 0], [210, -310]], P.slate, LINE.outer + 2);
    A.rrect(c, -235, -322, 470, 18, 4, P.slate, P.ink, LINE.outer);

    // Cáp cẩu nhấc khẩu pháo khi cắt rời (25.9..28.5s)
    if (t >= 25.0 && t <= 29.5) {
      const hx = 75 + st.kangarooGunRem * 90;
      const hy = -165 - st.kangarooGunRem * 160;
      A.line(c, [[hx, -304], [hx, hy]], P.ink, 3.5);
    }

    // Tướng Guy Simonds (bên trái chỉ tay) & Thợ máy cầm mỏ hàn cắt pháo
    const workshopAlpha = 1 - A.sm(t, 32.5, 34.0);
    if (workshopAlpha > 0.01) {
      A.withA(c, workshopAlpha, () => {
        R.rig(c, { x: -255, y: 0, s: 1.0, dir: 1, skin: 'ally', aim: 0.2, weapon: null });
        R.rig(c, { x: 205, y: 0, s: 0.96, dir: -1, skin: 'civil', aim: 0.45, weapon: null });
      });
    }

    // Chiếc pháo tự hành M7 Priest biến đổi thành Kangaroo APC
    const kx = st.kangarooDriveX;
    const wheelPh = A.eio(t, CUE.called_kangaroo, 38.2) * 28;
    V.drawKangaroo(c, {
      x: kx,
      y: 0,
      s: 1.15,
      dir: 1,
      view: 'cutaway',
      phase: wheelPh,
      gunRemoved: st.kangarooGunRem,
      racksRemoved: st.kangarooRacksRem,
      benchesIn: st.kangarooBenchesIn,
    });

    // Tia lửa hàn cắt khẩu pháo ("torch off the guns" @ 25.92–28.22s)
    if (t >= 25.7 && t <= 28.1) {
      const sp = ((t - 25.7) * 4.5) % 1;
      F.sparks(c, kx + 88, -162, sp, 1.15, -Math.PI * 0.4, Math.PI * 0.9, Math.floor(t * 10));
      A.circle(c, kx + 88, -162, 10, P.amber, P.white, 2);
    }

    // Khi Kangaroo chạy ra chiến trường (33.0–38.2s): đạn pháo nổ chụp trên đầu nhưng mảnh đạn bật tung khỏi thành thép dày!
    for (const [bt, bxOff] of [
      [34.2, 310],
      [35.8, 465],
    ] as const) {
      const age = t - bt;
      if (age > 0 && age < 2.8) {
        const bx = bxOff;
        const by = -285;
        F.explosion(c, bx, by, 68, A.clamp01(age / 1.0), LINE.outer);
        F.smoke(c, bx, by, age, 0.85, 5, P.slate, 10);
        // Chùm mảnh đạn lao xuống chạm vào mép giáp trên của Kangaroo (y = -195) rồi nảy bật ra
        const hitP = A.clamp01(age / 0.55);
        for (let i = -3; i <= 3; i++) {
          const tx = bx + i * 28;
          const ty = A.lerp(by, -198, hitP);
          if (age < 0.65) {
            A.line(c, [[bx, by], [tx, ty]], P.enemy, 3);
          }
          if (age >= 0.35 && age <= 1.2) {
            F.sparks(c, tx, -198, (age - 0.35) / 0.85, 0.75, -Math.PI * 0.5, Math.PI * 0.8, i + 10);
          }
        }
      }
    }

    // Ở 38.34–43.35s ("The modern armored personnel carrier was born by taking a combat vehicle and throwing away its gun"):
    // Hiển thị rõ khẩu pháo bị loại bỏ nằm bên phải trên cao với dấu gạch bỏ, đối lập với thùng thép chở lính nguyên vẹn.
    const summaryP = A.sm(t, CUE.apc_born_throw_gun, CUE.apc_born_throw_gun + 1.1);
    if (summaryP > 0.01) {
      A.withA(c, summaryP, () => {
        c.save();
        c.translate(kx + 215, -245);
        A.rrect(c, -32, -26, 54, 38, 6, P.olive, P.ink, LINE.outer);
        A.capsule(c, [10, -10], [125, -26], 16, P.slate, P.ink, LINE.outer);
        U.xMark(c, 45, -14, 38, A.sm(t, 40.4, 41.3), P.enemy, 7);
        c.restore();
      });
    }

    K.end(c);

    // Callout tên "Kangaroo" đúng lúc voice đọc @34.24
    const pKang = A.win(t, 33.0, 37.8, 0.35, 0.4);
    if (pKang > 0.01) {
      const pt = K.toScreen(cam, kx, -195);
      U.callout(c, 'Kangaroo', pt[0] - 80, pt[1] - 65, {
        to: pt,
        p: pKang,
        color: P.ink,
        size: 34,
      });
    }
  }
}
