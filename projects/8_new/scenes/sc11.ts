import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc11 (282.04–317.90s): Nạp đạn tay vs Nạp đạn tự động (Autoloader Carousel) & Đánh đổi vị trí khoang đạn (Bay tháp pháo vs Tấm bung thoát nổ Blow-off panels).
 * - 282.04–300.40s: Đối chiếu song song:
 *   + Trái (282.0–300.4s): Nạp đạn bằng người (Manual loader — 4 người, thân xe cao hơn, vất vả khi xe rung lắc).
 *   + Phải (290.8–300.4s): Nạp đạn tự động băng chuyền tròn (Autoloader carousel — 3 người, cánh tay gắp đạn tự động, xe thấp gọn hơn rõ rệt khi nhìn chính diện `front`).
 * - 300.40–310.20s: Cái giá của băng chuyền tròn dưới sàn (`carousel`): mở bằng `top-cutaway` thấy vòng đạn nằm ngay dưới chân kíp lái (300.4–305.5s), rồi chuyển sang `cutaway` ngang lúc 306.3s khi một phát đạn bắn xuyên sàn làm nổ toàn bộ vòng đạn và hất tung tháp pháo lên không trung (`turretToss`).
 * - 310.20–317.90s: Giải pháp khoang đạn biệt lập ở đuôi tháp pháo (`bustle`) có tấm bung thoát nổ (`blow-off panels`): khi bị bắn trúng lúc 314.5s, vách ngăn bảo vệ kíp lái và tấm bung trên nóc bật mở xả toàn bộ luồng lửa nổ thẳng lên trời!
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < CUE.ch4_ammo_trade) {
      // Pha 1 (282.04–300.40s): Đối chiếu Nạp đạn tay (4 người) vs Nạp đạn tự động Carousel (3 người, thấp nhỏ hơn)
      const cam: K.Cam = { x: 0, y: 0, z: 1.06 };
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 420 });

      const autoP = A.sm(t, CUE.ch4_autoloader, CUE.ch4_autoloader + 1.2);
      const pitch = Math.sin(t * 4.5) * 0.045;

      // Nửa trái: NẠP ĐẠN BẰNG NGƯỜI (Manual Loader — 4 người, tháp pháo cao)
      A.rrect(c, -820, -370, 780, 710, 16, P.paper, P.ink, lwO);
      drawTank(c, {
        x: -430,
        y: -45,
        s: 1.38,
        dir: 1,
        view: 'cutaway',
        ammoLayout: 'manual',
        hullRot: pitch,
        highlightPart: 'crew',
      });
      // Hình chiếu chính diện (`front`) ở dưới để so chiều cao
      drawTank(c, {
        x: -430,
        y: 295,
        s: 1.35,
        view: 'front',
        ammoLayout: 'manual',
      });
      // Thước đo chiều cao bên trái
      A.line(c, [[-650, 295], [-650, 100]], P.ink2, lwI, [8, 6]);
      A.line(c, [[-670, 100], [-610, 100]], P.enemy, lwO);

      // Nửa phải: NẠP ĐẠN TỰ ĐỘNG (Autoloader Carousel — 3 người, xe thấp hơn và gọn hơn)
      A.withA(c, Math.max(0.2, autoP), () => {
        A.rrect(c, 40, -370, 780, 710, 16, P.paper, P.ink, lwO);
        drawTank(c, {
          x: 430,
          y: -45,
          s: 1.38,
          dir: 1,
          view: 'cutaway',
          ammoLayout: 'carousel',
          highlightPart: 'autoloader',
          ammoGlow: 0.45 + 0.35 * Math.sin(t * 6),
        });
        // Hình chiếu chính diện (`front`) thấp hơn rõ rệt khi đặt cạnh bên trái
        drawTank(c, {
          x: 430,
          y: 295,
          s: 1.35,
          view: 'front',
          ammoLayout: 'carousel',
        });
        // Đường gióng chiều cao từ xe 4 người sang xe 3 người để thấy phần chiều cao tiết kiệm được
        if (t >= 295.8) {
          const hP = A.sm(t, 295.8, 297.2);
          A.line(c, [[-610, 100], [670, 100]], P.enemy, lwI, [12, 10]);
          A.line(c, [[210, 128], [670, 128]], P.olive, lwO);
          UI.arrow(c, [640, 70], [640, 125], { p: hP, color: P.olive, w: 6 });
        }
      });

      K.end(c);
    } else if (t < CUE.ch4_bustle_blowoff) {
      // Pha 2 (300.40–310.20s): Cái giá của băng chuyền tròn dưới sàn (Carousel ring) — Từ `top-cutaway` sang `cutaway` bị bắn nổ tung tháp pháo (`turretToss`)
      const isTopRing = t < 305.4;

      if (isTopRing) {
        // 300.40–305.40s: Góc nhìn từ trên xuống cắt lớp (`top-cutaway`) cho thấy rõ vòng đạn xếp tròn quanh sàn khoang lái
        const cam: K.Cam = {
          x: 0,
          y: 0,
          z: A.lerp(1.22, 1.38, A.sm(t, 300.4, 305.2)),
        };
        K.begin(c, cam);
        drawStageBg(c, 'top-map');

        drawTank(c, {
          x: 0,
          y: 0,
          s: 2.25,
          view: 'top-cutaway',
          ammoLayout: 'carousel',
          ammoCount: 18,
          ammoGlow: 0.4 + 0.4 * Math.sin(t * 8),
          turretYaw: (t - 300.4) * 0.25,
        });

        // Vòng mũi tên xoay chỉ rõ vòng đạn nằm bao quanh sàn khoang chiến đấu
        UI.circleMark(c, 0, 0, 165, A.sm(t, 302.5, 304.2), P.amber, lwO * 1.2);
        K.end(c);
      } else {
        // 305.40–310.20s: Mặt cắt ngang (`cutaway`) — Đạn xuyên vào vòng đạn dưới sàn làm nổ tung tất cả và hất tháp pháo bay lên trời!
        const hitT = CUE.ch4_carousel_hit + 0.45;
        const shotP = A.ph(t, hitT - 0.45, hitT);
        const blastAge = Math.max(0, t - hitT);
        const tossP = A.eo(t, hitT + 0.1, hitT + 2.2);

        const camBase: K.Cam = { x: 0, y: -35, z: 1.12 };
        const cam = K.withShake(camBase, t, [[hitT, 26, 0.8]]);

        K.begin(c, cam);
        drawStageBg(c, 'cutaway-grid', { groundY: 220 });

        drawTank(c, {
          x: 0,
          y: 220,
          s: 2.05,
          dir: 1,
          view: 'cutaway',
          ammoLayout: 'carousel',
          ammoGlow: blastAge > 0 ? 1 : 0.5,
          turretToss: tossP,
          burntInside: blastAge > 0.15 ? 1 : 0,
        });

        if (shotP > 0 && shotP <= 1) {
          FX.straightShot(c, [680, 80], [65, 120], shotP, { color: P.enemy, w: 8 });
        }

        if (blastAge > 0) {
          // Quả cầu lửa bùng lên từ sàn đẩy tháp pháo bay vọt lên không trung
          FX.explosion(c, 0, 95, 210, A.clamp01(blastAge / 0.85));
          FX.fire(c, 0, 120, blastAge, 2.2);
          FX.smoke(c, -15, 60, blastAge, 2.1, 8);
          FX.debris(c, 0, 80, blastAge, 1.5, 16, 9, 220, P.dark);
        }

        K.end(c);
      }
    } else {
      // Pha 3 (310.20–317.90s): Khoang đạn riêng ở đuôi tháp pháo (`bustle`) với tấm bung thoát nổ (`blow-off panels`) xả lực nổ ra ngoài cứu kíp lái
      const hitT = CUE.ch4_blowoff_blast;
      const shotP = A.ph(t, hitT - 0.45, hitT);
      const blastAge = Math.max(0, t - hitT);
      const openP = A.eo(t, hitT, hitT + 0.45);

      const camBase: K.Cam = K.track(
        t,
        [
          [310.2, { x: -80, y: 10, z: 1.32 }],
          [313.5, { x: -110, y: -15, z: 1.45 }],
          [317.9, { x: -60, y: -10, z: 1.28 }],
        ],
        A.eio
      );
      const cam = K.withShake(camBase, t, [[hitT, 20, 0.6]]);

      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 210 });

      drawTank(c, {
        x: 0,
        y: 210,
        s: 2.2,
        dir: 1,
        view: 'cutaway',
        ammoLayout: 'bustle',
        hasERA: true,
        ammoGlow: blastAge > 0 ? 1 : 0.4,
        blowOffOpen: openP,
        highlightPart: blastAge > 0 ? 'crew' : 'ammo',
      });

      // Nhấn mạnh vách ngăn thép kín (blast door) ở x = -167 ngăn cách khoang đạn đuôi và kíp lái
      A.line(c, [[-167, -72], [-167, 30]], P.sky, lwO * 1.6);

      // Đạn bắn trúng khoang đạn đuôi lúc 315.0s
      if (shotP > 0 && shotP <= 1) {
        FX.straightShot(c, [-720, -45], [-265, -25], shotP, { color: P.enemy, w: 8 });
      }

      // Khi khoang đạn đuôi phát nổ: tấm bung trên nóc bật mở, toàn bộ cột lửa phụt thẳng lên trời, còn kíp lái bên phải vách ngăn hoàn toàn nguyên vẹn!
      if (blastAge > 0) {
        FX.explosion(c, -250, -75, 115, A.clamp01(blastAge / 0.6));
        // Cột lửa thoát áp lực hướng thẳng lên trên qua lỗ blow-off panel
        for (let i = 0; i < 5; i++) {
          const fy = -80 - i * 42;
          FX.fire(c, -250 + Math.sin(t * 12 + i) * 8, fy, blastAge, 1.35 - i * 0.12);
        }
        FX.smoke(c, -250, -140, blastAge, 1.6, 7);
        UI.arrow(c, [-250, -45], [-250, -245], {
          p: A.clamp01(blastAge * 2.2),
          color: P.amber,
          w: 8,
        });
      }

      K.end(c);
    }
  }
}
