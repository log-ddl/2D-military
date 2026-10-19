// sc14.ts — Chương 5 (378.00–419.80s): Lời hứa "Taxi chiến trường" (Battle Taxi) vs Sai lầm chiến thuật & Ngộ nhận:
// 1) 378.00–391.32s: Góc nhìn TOP bản đồ chiến thuật — trước chiến tranh, tướng lĩnh hứa APC chỉ là "battle taxi"
//    thả tiểu đội bộ binh phía sau ngọn đồi che khuất rồi quay xe rút đi.
// 2) 391.32–402.86s: Góc nhìn SIDE — ngay khi tiếng súng nổ ra, ai đó lại ra lệnh cho chiếc taxi xung phong thẳng vào chiến hào như xe tăng!
//    Khi không có bộ binh tản khai đi kèm bảo vệ (without dismounted infantry screening it), tên lửa chống tăng bắn xuyên giáp hông mỏng.
// 3) 402.86–419.80s: Ngộ nhận truyền thông: thấy APC cháy gần tiền tuyến liền tuyên bố "battle taxi đã lỗi thời, mọi xe đều phải có giáp tăng & tháp pháo lớn"
//    → Tác giả bác bỏ ("My own reading is the opposite").
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as F from './shared/fx';
import * as R from './shared/rig';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.charge_trench_like_tank - 0.15) {
      // ── PHẦN A (378.00 – 391.40s): GÓC TOP BẢN ĐỒ — Lời hứa "Battle Taxi": thả tiểu đội sau đồi rồi lái đi ──
      const cam = K.track(
        t,
        [
          [378.0, { x: -40, y: 0,Z: 1.02 } as unknown as K.Cam],
          [385.0, { x: 0, y: 0, z: 1.08 }],
          [391.4, { x: 40, y: 0, z: 1.08 }],
        ],
        A.eio,
      );
      cam.z = cam.z || 1.05;

      K.begin(c, cam);
      M.mapBg(c, cam, { grid: 120 });

      // Ngọn đồi che khuất ở giữa (Hill @ x = 40, y = 0) & Tuyến chiến hào địch ở bên phải (x = 460)
      M.hill(c, 40, 0, 220, 5, 3);
      M.front(c, [[460, -450], [460, 450]], 1, { color: P.enemy, side: 1, tooth: 24 });
      M.unit(c, 530, -140, 'inf', 'foe', 56);
      M.unit(c, 530, 140, 'inf', 'foe', 56);

      // Đường hành quân của chiếc Battle Taxi: tiến tới sau đồi (-190, 0) thả quân rồi vòng lui về (-540, 210)
      const taxiPts: A.Pt[] = [
        [-640, -110],
        [-210, -20],
        [-240, 140],
        [-620, 220],
      ];
      const driveP = A.eio(t, 378.4, 389.4);
      M.route(c, taxiPts, driveP, P.oliveDark);

      // Tính vị trí & góc xe APC trên đường vòng
      const seg = driveP * (taxiPts.length - 1);
      const idx = Math.min(taxiPts.length - 2, Math.floor(seg));
      const f = seg - idx;
      const p0 = taxiPts[idx]!;
      const p1 = taxiPts[idx + 1]!;
      const vx = A.lerp(p0[0], p1[0], f);
      const vy = A.lerp(p0[1], p1[1], f);
      const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);

      c.save();
      c.translate(vx, vy);
      c.rotate(ang);
      V.drawAPC8x8(c, {
        x: 0,
        y: 0,
        s: 0.56,
        dir: 1,
        view: 'top',
        rampOpen: A.win(t, 383.2, 386.8, 0.4, 0.4),
      });
      c.restore();

      // Tiểu đội bộ binh được thả xuống an toàn phía sau ngọn đồi (t >= 384.0s)
      const dropP = A.sm(t, 384.0, 385.5);
      if (dropP > 0.01) {
        A.withA(c, dropP, () => {
          for (let i = 0; i < 6; i++) {
            const sy = -95 + i * 38;
            const sx = -155 + A.eio(t, 385.0, 389.0) * 65;
            A.circle(c, sx, sy, 14, P.olive, P.ink, 2.5);
          }
        });
      }

      // Ở 389.58–391.40s ("And then the moment the shooting starts, somebody orders the taxi to charge a trench line"):
      // Mũi tiến công đỏ bất ngờ phóng vọt qua đỉnh đồi lao thẳng vào chiến hào địch!
      const chargeArrow = A.sm(t, 389.6, 391.2);
      if (chargeArrow > 0.01) {
        M.advance(c, [[-190, 0], [410, 0]], chargeArrow, { color: P.amber, w: 48 });
      }

      K.end(c);
      return;
    }

    // ── PHẦN B & C (391.40 – 419.80s): GÓC SIDE — Xung phong đơn độc trúng tên lửa chống tăng & Bác bỏ ngộ nhận ──
    const baseCam = K.track(
      t,
      [
        [391.4, { x: 40, y: -135, z: 1.25 }],
        [398.5, { x: 120, y: -135, z: 1.32 }],
        [404.0, { x: 60, y: -145, z: 1.18 }],
        [419.8, { x: 60, y: -145, z: 1.18 }],
      ],
      A.eio,
    );
    const cam = K.withShake(baseCam, t, [[398.4, 18, 0.7]]);

    K.begin(c, cam);
    V.drawSideGround(c, -1400, 1400, 0, 'dirt');

    // Sườn đồi phía trái (x = -480..-120) & Công sự chiến hào địch phía phải (x = 460)
    A.poly(
      c,
      [
        [-560, 0],
        [-360, -110],
        [-140, 0],
      ],
      P.bg2,
      P.ink,
      LINE.outer,
    );
    A.poly(
      c,
      [
        [410, 0],
        [440, -34],
        [475, -34],
        [490, 46],
        [590, 46],
        [605, -26],
        [660, 0],
      ],
      P.oliveDark,
      P.ink,
      LINE.outer,
    );

    // Xạ thủ chống tăng địch (RPG / anti-tank rocket) đứng trong chiến hào bên phải (x = 525)
    R.rig(c, { x: 525, y: 22, s: 0.96, dir: -1, skin: 'foe', aim: 0.06, weapon: 'tube' });
    R.rig(c, { x: 575, y: 22, s: 0.92, dir: -1, skin: 'foe', aim: 0.04, weapon: 'rifle' });

    // Chiếc APC 8x8 bị đẩy lao đơn độc về phía chiến hào (391.4..398.4s) mà KHÔNG có bộ binh đi bộ bảo vệ
    const chargeP = A.eio(t, 391.4, 398.4);
    const apcX = A.lerp(-180, 95, chargeP);
    const hitAge = t - 398.4;

    // Bóng mờ nét đứt của tiểu đội bộ binh tản khai đáng lẽ phải đi trước bảo vệ xe ("without dismounted infantry screening it")
    const noInfP = A.win(t, 396.5, 402.5, 0.35, 0.4);
    if (noInfP > 0.01) {
      A.withA(c, noInfP * 0.45, () => {
        R.rig(c, { x: apcX + 210, y: 0, s: 0.88, dir: 1, skin: 'ally', weapon: 'rifle' });
        R.rig(c, { x: apcX + 255, y: 0, s: 0.88, dir: 1, skin: 'ally', weapon: 'rifle' });
        U.xMark(c, apcX + 232, -48, 32, 1, P.amber, 6);
      });
    }

    V.drawAPC8x8(c, {
      x: apcX,
      y: 0,
      s: 1.18,
      dir: 1,
      view: 'side',
      wheelRot: t < 398.4 ? t * 7.5 : 0,
      rwsType: 'rws',
      sideHitP: hitAge > 0 ? A.clamp01(hitAge / 1.2) : 0,
    });

    // Trạm RWS trên nóc APC bắn trả loạt súng máy ngắn lúc xung phong (393.2–394.6s)
    if (t >= 393.2 && t <= 394.6) {
      const fp = ((t - 393.2) * 8) % 1;
      F.muzzleFlash(c, apcX + 105, -248, 0.12, fp, 0.7, 2);
      F.tracer(c, [apcX + 105, -248], [465, -45], fp, 0.2, P.amber, 4);
    }

    // Quả đạn tên lửa chống tăng (anti-tank rocket) phóng từ chiến hào địch ở t = 397.6s trúng hông APC ở t = 398.4s!
    const rpgP = A.ph(t, 397.6, 398.4);
    if (rpgP > 0 && rpgP < 1) {
      F.muzzleFlash(c, 470, -42, Math.PI, rpgP, 0.85, 2.5);
      F.straightShot(c, [470, -42], [apcX - 35, -135], rpgP, { color: P.enemy, w: 6, trail: 0.4 });
    }
    if (hitAge > 0) {
      F.smoke(c, apcX - 45, -155, hitAge, 1.15, 7, P.slate, 16);
      F.fire(c, apcX - 45, -135, hitAge, 0.95);
    }

    // ── PHẦN C (402.86 – 419.80s): NGỘ NHẬN "BATTLE TAXI ĐÃ LỖI THỜI, MỌI XE PHẢI CÓ GIÁP TĂNG & THÁP PHÁO LỚN" ──
    const misconP = A.sm(t, 408.5, 410.0);
    if (misconP > 0.01) {
      A.withA(c, misconP, () => {
        // Khung suy nghĩ/bình luận ở phía trên (x = 80, y = -325):
        // Biến chiếc APC thành xe hạng nặng có giáp mũi dày + tháp pháo lớn ("every vehicle should have tank-grade armor and a big turret")
        A.rrect(c, -210, -415, 580, 175, 16, P.paper, P.ink, LINE.outer);
        V.drawAPC8x8(c, { x: -85, y: -255, s: 0.56, dir: 1, view: 'side', rwsType: 'rws' });
        U.arrow(c, [35, -325], [105, -325], { color: P.ink, w: 6, head: 18 });
        V.drawCombatVehicle(c, { x: 235, y: -255, s: 0.62, dir: 1, kind: 'mbt', view: 'side' });

        // Ở 418.18s ("My own reading is the opposite"): gạch bỏ thẳng thừng nhận định sai lầm đó!
        const rejectP = A.sm(t, CUE.opposite_reading - 0.1, CUE.opposite_reading + 0.8);
        if (rejectP > 0.01) {
          U.xMark(c, 80, -328, 76, rejectP, P.enemy, 9);
        }
      });
    }

    K.end(c);
  }
}
