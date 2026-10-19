import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import * as M from './shared/map';
import { P, LINE } from './shared/palette';
import {
  drawTank,
  drawSoldierTop,
  drawArtilleryTop,
  drawTopThreat,
  drawStageBg,
} from './_assets';
import { CUE } from './_cue';

/**
 * sc15 (424.46–469.16s): Kết luận toàn phim — Hệ thống hiệp đồng binh chủng (Combined Arms System) & Trở về chiếc hộp thép cùng cuộc thương lượng kỹ thuật tỉ mỉ.
 * - 424.46–447.08s: Góc nhìn từ trên xuống (`top` sa bàn chiến thuật):
 *   + Xe tăng di chuyển giữa các gờ che đỡ, khai hỏa trước lúc 431.8s.
 *   + Từ 433.02s: Mạng lưới Bộ binh, Pháo binh và Drone đồng minh bao quanh tạo thành các lớp phòng thủ từ xa phát hiện và diệt mối đe dọa trước khi chúng chạm tới xe tăng (lớp giáp sát thân chỉ là tuyến phòng thủ cuối cùng).
 *   + 443.24–447.08s: "A tank alone is a target, a tank in a system is a weapon".
 * - 447.08–469.16s: Trở lại mặt cắt ngang (`cutaway`) chiếc xe tăng chứa đầy thuốc nổ và 4 con người ở tâm khung:
 *   + Lần lượt điểm sáng từng bộ phận (Pháo, Kính ngắm, Giáp nhiều lớp, Động cơ, Băng chuyền đạn, Tấm bung thoát nổ) — tất cả cùng trả lời một câu hỏi: đưa nguồn năng lượng khổng lồ vào trận đánh và giữ cho con người sống sót khi rời trận.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < CUE.ch5_return_box) {
      // Pha 1 (424.46–447.08s): Sa bàn hiệp đồng binh chủng (`top`) — Di chuyển giữa vật che, bắn trước, và các lớp bảo vệ đồng tâm (Bộ binh + Pháo binh + Drone)
      const firstFireT = 431.6;
      const artFireT = 436.2;

      const camBase: K.Cam = K.track(
        t,
        [
          [424.46, { x: -120, y: 0, z: 1.08 }],
          [432.5, { x: 40, y: 0, z: 0.92 }],
          [447.0, { x: 40, y: 0, z: 0.96 }],
        ],
        A.eio
      );
      const cam = K.withShake(camBase, t, [
        [firstFireT, 14, 0.45],
        [artFireT + 0.6, 16, 0.5],
      ]);

      K.begin(c, cam);
      drawStageBg(c, 'top-map');

      // Hai gờ đồi/rừng che đỡ để xe tăng cơ động ẩn nấp ("moves between cover")
      M.hill(c, -320, -195, 130, 3, 2);
      M.hill(c, -20, 195, 135, 3, 5);

      const moveCover = A.sm(t, 427.8, 431.2);
      const tx = A.lerp(-280, -20, moveCover);
      const ty = A.lerp(-85, 65, moveCover);

      // Các vòng tròn lớp phòng thủ đồng tâm ("armor is the last line of the defense and not the first")
      const sysP = A.sm(t, CUE.ch5_combined_arms, CUE.ch5_combined_arms + 2.2);
      if (sysP > 0.01) {
        A.withA(c, sysP, () => {
          // Vòng 1 (ngoài cùng - bán kính 480): Trinh sát Drone & Hỏa lực Pháo binh tầm xa
          A.circle(c, tx, ty, 470, null, P.sky, lwI);
          // Vòng 2 (giữa - bán kính 280): Bộ binh tùng thiết bảo vệ cự ly gần
          A.circle(c, tx, ty, 275, null, P.olive, lwI);
          // Vòng 3 (sát thân xe - bán kính 135): Lớp giáp thép (tuyến phòng thủ cuối cùng, nổi bật lúc 438.5s)
          const lastLineP = A.sm(t, 438.0, 439.8);
          A.circle(
            c,
            tx,
            ty,
            145,
            lastLineP > 0.1 ? 'rgba(245, 158, 11, 0.18)' : null,
            P.amber,
            lwO * (1 + lastLineP * 0.6)
          );
        });
      }

      // Chiếc xe tăng chủ lực ở tâm hệ thống
      const tk = drawTank(c, {
        x: tx,
        y: ty,
        s: 1.25,
        view: 'top',
        hasERA: true,
        turretYaw: -0.15,
      });

      // Mục tiêu địch ở xa phía đông (`[580, -90]` và `[620, 140]`)
      const hit1Age = Math.max(0, t - (firstFireT + 0.45));
      drawTank(c, {
        x: 580,
        y: -90,
        s: 1.05,
        view: 'top',
        side: 'foe',
        turretYaw: 3.0,
      });
      if (hit1Age > 0) {
        FX.explosion(c, 580, -90, 110, A.clamp01(hit1Age / 0.65));
        FX.smoke(c, 580, -90, hit1Age, 1.2, 5);
        UI.xMark(c, 580, -90, 42, A.clamp01(hit1Age * 2), P.enemy, lwO * 1.4);
      }

      // Phát bắn phủ đầu ("because it fires first" @431.6s)
      const shot1P = A.ph(t, firstFireT, firstFireT + 0.45);
      if (shot1P > 0 && shot1P <= 1) {
        FX.muzzleFlash(c, tk.muzzle[0], tk.muzzle[1], -0.15, A.clamp01(shot1P * 2.5), 1.4);
        FX.straightShot(c, tk.muzzle, [580, -90], shot1P, { color: P.amber, w: 6 });
      }

      // Hệ thống hiệp đồng xung quanh xe tăng (433.02–447.08s): Bộ binh + Pháo binh + Drone đồng minh
      if (sysP > 0.01) {
        A.withA(c, sysP, () => {
          // 1. Toán bộ binh đồng minh đi kèm bảo vệ vòng giữa
          for (const [ix, iy, ia] of [
            [tx + 170, ty - 140, -0.3],
            [tx + 195, ty + 125, 0.25],
            [tx - 155, ty - 160, -0.8],
          ] as const) {
            drawSoldierTop(c, ix, iy, 1.2, ia, 'ally', 'rifle');
            UI.dashed(c, [tx, ty], [ix, iy], P.sky, lwI, -t * 80);
          }

          // 2. Khẩu đội pháo binh đồng minh ở tuyến sau (`[-480, 220]`)
          drawArtilleryTop(c, -480, 220, 1.35, -0.12);
          UI.dashed(c, [-480, 220], [tx, ty], P.sky, lwI, -t * 80);

          // 3. Drone trinh sát đồng minh trên cao (`[160, -290]`) phát hiện ổ phục kích địch ở `[620, 140]` và chỉ điểm cho pháo binh tiêu diệt!
          drawTopThreat(c, 160, -290, 1.15, 'drone', 0, 0, t);
          M.fan(c, 160, -290, 520, 0.45, 0.95, sysP, P.sky);
          UI.dashed(c, [160, -290], [tx, ty], P.sky, lwI, -t * 90);

          // Mối đe dọa thứ 2 ở `[620, 140]` bị Drone phát hiện và Pháo binh bắn hạ lúc 436.2s trước khi kịp thấy xe tăng
          drawSoldierTop(c, 620, 140, 1.4, 2.9, 'foe', 'rpg');
          const artShotP = A.ph(t, artFireT, artFireT + 0.65);
          if (artShotP > 0 && artShotP <= 1) {
            FX.arcShot(c, [-400, 210], [620, 140], artShotP, 180, {
              color: P.amber,
              w: 5,
            });
          }
          const hit2Age = Math.max(0, t - (artFireT + 0.65));
          if (hit2Age > 0) {
            FX.explosion(c, 620, 140, 125, A.clamp01(hit2Age / 0.65));
            UI.xMark(c, 620, 140, 38, A.clamp01(hit2Age * 2), P.enemy, lwO * 1.4);
          }
        });
      }

      K.end(c);
    } else {
      // Pha 2 (447.08–469.16s): Trở lại mặt cắt chiếc hộp thép chứa thuốc nổ và 4 con người ("So return to the box full of explosive and the four people in it... A tank is not a monument to strength. It is a very careful negotiation.")
      const cam = K.track(
        t,
        [
          [447.08, { x: 0, y: 15, z: 1.25 }],
          [456.0, { x: -15, y: 10, z: 1.15 }],
          [469.159, { x: 0, y: 15, z: 1.08 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 185 });

      // Lần lượt làm sáng từng bộ phận theo đúng lời tổng kết (450.82–456.5s):
      // "the gun (451.4s), the sights (452.2s), the layers of armor (453.2s), the engine (454.3s), the carousel (455.1s), and the blow-off panel (456.0s)"
      let hl: 'none' | 'breech' | 'sight' | 'armor' | 'engine' | 'ammo' | 'crew' = 'none';
      if (t >= 451.0 && t < 452.0) hl = 'breech';
      else if (t >= 452.0 && t < 453.0) hl = 'sight';
      else if (t >= 453.0 && t < 454.1) hl = 'armor';
      else if (t >= 454.1 && t < 455.0) hl = 'engine';
      else if (t >= 455.0 && t < 457.2) hl = 'ammo';
      else if (t >= 457.2) hl = 'crew';

      const blowDemo = A.bump(t, 455.8, 1.6) * 0.65;

      const tk = drawTank(c, {
        x: 0,
        y: 185,
        s: 2.35,
        dir: 1,
        view: 'cutaway',
        ammoLayout: 'manual',
        hasERA: true,
        hasCage: true,
        highlightPart: hl,
        ammoGlow: hl === 'ammo' ? 0.85 : 0.25,
        blowOffOpen: blowDemo,
      });

      // Từ 457.5–469.16s: Vẽ các vòng cung cân bằng hội tụ quanh 4 người lính bên trong khoang xe ("how to bring far more energy to a fight than a person could ever carry and leave the person alive when it arrives... a very careful negotiation")
      const endP = A.sm(t, 457.5, 461.0);
      if (endP > 0.01) {
        A.withA(c, endP, () => {
          // Khung bảo vệ màu xanh P.sky ôm quanh 4 người lính kíp lái ở trung tâm chiếc xe
          A.rrect(c, -165, -108, 465, 210, 14, 'rgba(56, 189, 248, 0.10)', P.sky, lwO);
          // Đường liên kết hài hòa từ Pháo, Giáp, Động cơ, Khoang đạn hội tụ về khoang kíp lái
          UI.dashed(c, tk.muzzle, [80, -10], P.amber, lwI, -t * 60);
          UI.dashed(c, tk.ammoCenter, [-110, -10], P.amber, lwI, -t * 60);
          UI.dashed(c, tk.engineCenter, [-140, 45], P.sky, lwI, -t * 60);
        });
      }

      K.end(c);
    }
  }
}
