import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';
import { SIDE_AIR_NODES } from './_state';

/**
 * sc04 (84.96–108.22s): Chương 2 (Phần 2) — RWR trong buồng lái tiêm kích
 * Góc nhìn SIDE kết hợp mặt cắt buồng lái: Khi đài radar phòng không đối phương quét qua,
 * bộ thu cảnh báo radar (RWR) phát âm thanh trong mũ phi công, hiện ký hiệu và hướng (bearing)
 * trên màn hình, giúp phi công cơ động thoát hiểm trước cả khi nhìn thấy quả tên lửa SAM dưới mây.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(
      t,
      [
        [84.96, { x: -160, y: -55, z: 1.18 }],
        [91.0, { x: -40, y: -10, z: 1.04 }],
        [108.22, { x: 20, y: 15, z: 1.02 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawSkyEnv(c, cam, { groundY: 320, hills: true });

    const sweepP = A.sm(t, CUE.c2_radar_sweeps - 0.3, CUE.c2_radar_sweeps + 1.0);
    const toneP = A.sm(t, CUE.c2_tone_headset - 0.3, CUE.c2_tone_headset + 0.8);
    const symbolP = A.sm(t, CUE.c2_symbol_screen - 0.3, CUE.c2_symbol_screen + 0.8);
    const samLaunchP = A.ph(t, CUE.c2_never_see_missile, 107.8);
    const evadeP = A.eio(t, CUE.c2_first_sign_sound + 1.2, CUE.c2_seconds_react + 1.5);

    // Vị trí tiêm kích (cơ động chúc mũi tránh đạn ở cuối cảnh nhờ nghe tiếng RWR sớm)
    const jetX = A.lerp(SIDE_AIR_NODES.jetBase[0], -140, A.ph(t, 84.96, 108.22));
    const jetY = SIDE_AIR_NODES.jetBase[1] - evadeP * 115;
    const jetPitch = -evadeP * 0.18;
    const samPos = SIDE_AIR_NODES.samBase;

    // 1. Chùm quét của đài radar SAM đối phương quét qua máy bay (90.58s+)
    if (sweepP > 0.01) {
      const radarOrigin: A.Pt = [samPos[0] - 28, samPos[1] - 88];
      A.withA(c, sweepP, () => {
        A.poly(
          c,
          [
            radarOrigin,
            [jetX - 180, jetY - 120],
            [jetX + 220, jetY + 70],
          ],
          'rgba(180,73,60,0.12)',
          null,
          0
        );
        U.drawSignalLink(c, radarOrigin, [jetX + 95, jetY - 10], t, {
          color: P.enemy,
          mode: 'pulse',
          speed: 2.8,
          progress: sweepP,
        });
      });
    }

    // 2. Đài radar phòng không & bệ phóng SAM ở góc phải dưới
    c.save();
    c.translate(samPos[0], samPos[1]);
    U.drawSamRadarSite(c, {
      view: 'side',
      scale: 1.35,
      dishAngle: -0.6,
      missilesLeft: samLaunchP > 0.05 ? 1 : 2,
    });
    c.restore();

    // 3. Quả tên lửa SAM phóng lên từ 98.20s ("The pilot may never see the missile that follows")
    // Bay bên dưới một lớp mây mù để thấy rõ phi công không thể nhìn thấy bằng mắt thường
    if (samLaunchP > 0.01) {
      const mx = A.lerp(samPos[0] + 40, jetX + 120, samLaunchP);
      const my = A.lerp(samPos[1] - 45, 20, samLaunchP);
      const mang = Math.atan2(20 - (samPos[1] - 45), jetX + 120 - (samPos[0] + 40));

      // Vệt khói tên lửa dưới mây
      A.line(c, [[samPos[0] + 40, samPos[1] - 45], [mx, my]], P.light, A.px(c, 5), [A.px(c, 10), A.px(c, 8)]);
      c.save();
      c.translate(mx, my);
      c.rotate(mang);
      U.drawSamMissile(c, { scale: 1.15, thrust: 1 });
      c.restore();
    }

    // Dải mây chắn tầm nhìn mắt thường giữa buồng lái và bệ SAM dưới đất
    A.withA(c, 0.82, () => {
      A.ellipse(c, 160, 115, 290, 44, 0, P.bg2, P.light, lwI);
      A.ellipse(c, 340, 130, 210, 38, 0, P.bg2, P.light, lwI);
    });

    // 4. Chủ thể chính: Tiêm kích StrikeJet mở mặt cắt buồng lái & RWR (scale lớn 2.15)
    c.save();
    c.translate(jetX, jetY);
    c.rotate(jetPitch);
    U.drawStrikeJet(c, {
      view: 'cutaway',
      scale: 2.15,
      rwrAlert: toneP > 0.2,
    });

    // Vòng sóng âm thanh (tone) ngân lên quanh mũ phi công khi RWR kêu (93.1s+)
    if (toneP > 0.05) {
      for (let i = 0; i < 3; i++) {
        const p = ((t * 1.8 + i * 0.33) % 1);
        const rad = A.lerp(18, 72, p);
        A.withA(c, (1 - p) * toneP, () => {
          A.circle(c, 76, -45, rad, null, P.amber, lwO);
        });
      }
    }
    c.restore();

    // 5. Đồng hồ RWR phóng lớn phía trên buồng lái (hiển thị ký hiệu radar & hướng phương vị từ 95.3s)
    const rwrX = jetX + 275;
    const rwrY = Math.max(-210, jetY - 185);
    const cockpitScreenPos: A.Pt = [jetX + 95, jetY - 22];
    A.line(c, [cockpitScreenPos, [rwrX - 85, rwrY + 45]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
    U.drawRwrScope(c, {
      x: rwrX,
      y: rwrY,
      r: 102,
      threatAngle: Math.atan2(samPos[1] - jetY, samPos[0] - jetX),
      alertLevel: symbolP,
    });

    K.end(c);
  }
}
