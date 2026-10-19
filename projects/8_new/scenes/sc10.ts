import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import { drawTank, drawStageBg } from './_assets';
import { CUE } from './_cue';

/**
 * sc10 (252.94–282.04s): Yếu tố thứ tư — Không gian cực hẹp bên trong (Internal Volume):
 * - 252.94–264.60s: Mặt cắt khoang xe (`cutaway`) lần lượt làm nổi bật từng hệ thống bị nhồi chặt: Khóa nòng (breech), Đạn (ammunition), Động cơ (engine), Kíp lái 4 người (crew), Kính ngắm & Radio (sight/computer).
 * - 264.60–274.80s: Đặt đường bao một chiếc xe van dân dụng chồng lên khoang kíp lái để thấy 4 người ngồi trong không gian nhỏ hơn cả chiếc xe van, phải hít khói thuốc súng khi khai hỏa và chịu chấn động khi trúng đạn.
 * - 274.80–282.04s: Cơ chế "Squeezing the volume lets the designer cover it with thicker armor per ton": hai mũi tên ép nhỏ thể tích khoang trong xuống -> cùng lượng thép đó lập tức làm vách giáp bao quanh dày vọt lên.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    if (t < CUE.ch4_squeeze_volume) {
      // Pha 1 & 2 (252.94–274.80s): Mặt cắt chiếc xe tăng 4 người nạp tay, lần lượt điểm danh các khối bên trong & đặt khung xe Van so sánh
      const hitShockT = 273.0;
      const camBase: K.Cam = K.track(
        t,
        [
          [252.94, { x: -20, y: 15, z: 1.15 }],
          [259.5, { x: -25, y: 5, z: 1.28 }],
          [265.0, { x: 10, y: 0, z: 1.42 }],
          [274.8, { x: 10, y: 0, z: 1.42 }],
        ],
        A.eio
      );
      const cam = K.withShake(camBase, t, [[hitShockT, 18, 0.55]]);

      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 185 });

      // Chọn bộ phận được nhấn sáng theo từng từ voice đọc (259.92–264.38s)
      let hl: 'none' | 'breech' | 'ammo' | 'engine' | 'crew' | 'sight' | 'computer' = 'none';
      if (t >= 259.8 && t < 260.9) hl = 'breech';
      else if (t >= 260.9 && t < 261.8) hl = 'ammo';
      else if (t >= 261.8 && t < 262.6) hl = 'engine';
      else if (t >= 262.6 && t < 263.4) hl = 'crew';
      else if (t >= 263.4 && t < 264.6) hl = 'sight';
      else if (t >= 264.6) hl = 'crew';

      drawTank(c, {
        x: 0,
        y: 185,
        s: 2.35,
        dir: 1,
        view: 'cutaway',
        ammoLayout: 'manual',
        hasERA: true,
        highlightPart: hl,
        ammoGlow: hl === 'ammo' ? 0.8 : 0.15,
      });

      // Khi nói "The crew of three or four sits in a space smaller than a van" (264.60–267.60s):
      // Vẽ hình dáng chiếc xe Van (nét đứt xanh P.sky) bao trùm bên ngoài khoang kíp lái để thấy khoang kíp lái lọt thỏm bên trong
      const vanP = A.win(t, CUE.ch4_smaller_than_van, 274.6, 0.5, 0.4);
      if (vanP > 0.01) {
        A.withA(c, vanP, () => {
          // Khung bao khoang thực tế của 4 người lính (màu vàng cam)
          A.rrect(c, -165, -108, 465, 210, 10, 'rgba(245, 158, 11, 0.12)', P.amber, lwO);
          // Đường bao chiếc xe Van lớn hơn rõ rệt bên ngoài (nét đứt P.sky)
          const vanPts: A.Pt[] = [
            [-235, 118],
            [-235, -165],
            [240, -165],
            [335, -55],
            [345, 118],
          ];
          A.path(c, vanPts, true);
          c.setLineDash([16, 12]);
          A.fs(c, null, P.sky, lwO * 1.15);
          c.setLineDash([]);
          // Hai bánh xe van nét đứt
          A.circle(c, -145, 118, 36, null, P.sky, lwI);
          A.circle(c, 245, 118, 36, null, P.sky, lwI);
        });
      }

      // Khi nói "breathe in the fumes of firing, and be shielded from the shock of a hit" (270.8–274.5s):
      if (t >= 270.6 && t < 274.6) {
        FX.smoke(c, 15, -15, t - 270.6, 0.85, 5, '#64748b', -10);
      }
      if (t >= hitShockT - 0.3 && t < hitShockT + 0.8) {
        const sp = A.ph(t, hitShockT - 0.3, hitShockT);
        if (sp > 0 && sp < 1) {
          FX.straightShot(c, [620, -45], [275, -15], sp, { color: P.enemy, w: 7 });
        }
        if (t >= hitShockT) {
          FX.shock(c, 275, -15, 180, A.clamp01((t - hitShockT) / 0.65), lwO, P.enemy);
          FX.sparks(c, 275, -15, A.clamp01((t - hitShockT) / 0.65), 1.3, -0.4, 1.4, 6);
        }
      }

      K.end(c);
    } else {
      // Pha 3 (274.80–282.04s): Cơ chế "Squeezing the volume lets the designer cover it with thicker armor per ton"
      // Trực quan hoá bằng mặt cắt hộp khoang xe: khi 4 mũi tên ép nhỏ thể tích khoang trong lại, vách thép bao quanh tự động dày gấp đôi!
      const sqP = A.eio(t, CUE.ch4_squeeze_volume + 0.4, 280.2);
      const cam: K.Cam = { x: 0, y: 0, z: 1.12 };
      K.begin(c, cam);
      drawStageBg(c, 'cutaway-grid', { groundY: 320 });

      // Bên trái (-420): Khoang thể tích lớn -> Vỏ giáp mỏng
      c.save();
      c.translate(-390, 0);
      A.rrect(c, -230, -185, 460, 370, 14, P.slate, P.ink, lwO);
      A.rrect(c, -206, -161, 412, 322, 8, P.paper, P.ink, lwO);
      drawTank(c, { x: 0, y: 135, s: 0.86, view: 'cutaway', ammoLayout: 'manual' });
      c.restore();

      // Mũi tên chuyển đổi ở giữa
      UI.arrow(c, [-110, 0], [85, 0], { p: A.sm(t, 275.0, 276.5), color: P.amber, w: 8 });

      // Bên phải (+390): Khoang thể tích được ép nhỏ theo sqP -> Cùng số tấn thép nhưng thành vách giáp dày gấp 2.5 lần!
      c.save();
      c.translate(390, 0);
      const innerW = A.lerp(412, 270, sqP);
      const innerH = A.lerp(322, 200, sqP);
      const armorThick = A.lerp(24, 68, sqP);
      const outerW = innerW + armorThick * 2;
      const outerH = innerH + armorThick * 2;

      // Vách giáp ngoài dày lên rõ rệt (đổi sang màu vàng cam nhấn mạnh độ dày tăng thêm)
      A.rrect(
        c,
        -outerW / 2,
        -outerH / 2,
        outerW,
        outerH,
        16,
        A.lerpColor(P.slate, P.amber, sqP),
        P.ink,
        lwO
      );
      A.rrect(c, -innerW / 2, -innerH / 2, innerW, innerH, 8, P.paper, P.ink, lwO);
      drawTank(c, {
        x: 0,
        y: innerH / 2 - 20,
        s: A.lerp(0.86, 0.58, sqP),
        view: 'cutaway',
        ammoLayout: 'carousel',
      });

      // 4 mũi tên ép từ 4 phía vào hộp bên phải
      const arrP = A.sm(t, 275.5, 277.2);
      UI.arrow(c, [0, -outerH / 2 - 75], [0, -outerH / 2 - 12], { p: arrP, color: P.ink, w: 6 });
      UI.arrow(c, [0, outerH / 2 + 75], [0, outerH / 2 + 12], { p: arrP, color: P.ink, w: 6 });
      UI.arrow(c, [-outerW / 2 - 75, 0], [-outerW / 2 - 12, 0], { p: arrP, color: P.ink, w: 6 });
      UI.arrow(c, [outerW / 2 + 75, 0], [outerW / 2 + 12, 0], { p: arrP, color: P.ink, w: 6 });
      c.restore();

      K.end(c);
    }
  }
}
