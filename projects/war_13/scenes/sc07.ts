import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';
import { SIDE_AIR_NODES } from './_state';

/**
 * sc07 (165.02–192.42s): Chương 3 (Phần 1) — Nghịch lý của máy gây nhiễu (Jammer as a Beacon)
 * Nối liên tục từ cuối sc06 trên góc SIDE:
 * - Máy gây nhiễu phát tín hiệu mạnh tự biến mình thành ngọn hải đăng (beacon).
 * - Tên lửa tự dẫn bám bức xạ (home-on-jam) bay ngược theo chính chùm sóng gây nhiễu về phía máy bay.
 * - Kíp lái phải quyết định khi nào bật/tắt, và quyết định tốt nhất thường là tắt đi (189.88s) để tên lửa mất đường dẫn.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Khớp chính xác camera cuối sc06 tại t = 165.02s: { x: 45, y: 5, z: 1.05 }
    const cam = K.track(
      t,
      [
        [165.02, { x: 45, y: 5, z: 1.05 }],
        [172.0, { x: 20, y: 15, z: 1.04 }],
        [192.42, { x: -10, y: 0, z: 1.06 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawSkyEnv(c, cam, { groundY: 320, hills: true });

    const jetPos: A.Pt = [-120, -40];
    const samPos = SIDE_AIR_NODES.samBase;
    const beaconP = A.sm(t, CUE.c3_jammer_beacon - 0.5, CUE.c3_jammer_beacon + 0.8);
    const switchOffP = A.sm(t, CUE.c3_keep_it_off - 0.3, CUE.c3_keep_it_off + 0.4);
    const jamActive = 1 - switchOffP;

    const nosePos: A.Pt = [jetPos[0] + 135, jetPos[1] + 4];
    const samLauncherPos: A.Pt = [samPos[0] + 45, samPos[1] - 42];
    const radarAnt: A.Pt = [samPos[0] - 28, samPos[1] - 88];

    // 1. Chùm sóng gây nhiễu cực mạnh phát ra từ máy bay như một ngọn hải đăng (Beacon: 169.48s..189.88s)
    if (jamActive > 0.02) {
      A.withA(c, jamActive, () => {
        // Phễu chùm sóng gây nhiễu chiếu thẳng xuống đài địch
        A.poly(
          c,
          [
            nosePos,
            [samPos[0] - 110, samPos[1] - 130],
            [samPos[0] + 90, samPos[1] + 10],
          ],
          'rgba(245,158,11,0.18)',
          P.amber,
          lwI
        );
        U.drawSignalLink(c, nosePos, radarAnt, t, {
          color: P.amber,
          mode: 'noise',
          amp: 14,
          speed: 3.4,
          progress: 1,
        });

        // Các vòng sóng hải đăng (beacon rings) lan tỏa rộng khắp bầu trời để bất kỳ máy thu nào từ xa cũng thấy
        if (beaconP > 0.02) {
          for (let i = 0; i < 4; i++) {
            const p = ((t * 0.75 + i * 0.25) % 1);
            const r = A.lerp(45, 520, p);
            A.withA(c, (1 - p) * 0.65 * beaconP, () => {
              A.circle(c, nosePos[0], nosePos[1], r, null, P.amber, lwO);
            });
          }
        }
      });
    }

    // 2. Trạm thu đối phương từ xa bắt được ngọn hải đăng sóng (173.74s+)
    const dfShow = A.sm(t, CUE.c3_find_from_far - 0.3, CUE.c3_find_from_far + 0.8);
    if (dfShow > 0.02) {
      const dfPos: A.Pt = [170, 320];
      A.withA(c, dfShow, () => {
        c.save();
        c.translate(dfPos[0], dfPos[1]);
        U.drawGroundStation(c, {
          view: 'side',
          scale: 1.05,
          role: 'jammer',
          team: 'enemy',
          dishAngle: -0.7,
          active: jamActive > 0.5,
        });
        c.restore();
        if (jamActive > 0.2) {
          A.line(c, [[dfPos[0], dfPos[1] - 88], nosePos], P.enemy, lwI, [A.px(c, 8), A.px(c, 6)]);
        }
      });
    }

    // 3. Tên lửa tự dẫn bám bức xạ ("fly down the beam to the transmitter that is making it": 176.2s+)
    const mStart = 175.8;
    const mFly = A.ph(t, mStart, 192.2);
    if (mFly > 0.01) {
      // Khi jammer đang bật (t < 189.88s), tên lửa trượt chính xác dọc theo trục chùm sóng về phía mũi máy bay;
      // Khi phi công tắt jammer (189.88s+), chùm sóng biến mất, tên lửa mất khóa và chúi sượt xuống dưới bụng máy bay!
      const beamX = A.lerp(samLauncherPos[0], nosePos[0] - 90, mFly);
      const beamY = A.lerp(samLauncherPos[1], nosePos[1], mFly) + switchOffP * 135;
      const dx = nosePos[0] - samLauncherPos[0];
      const dy = (nosePos[1] + switchOffP * 180) - samLauncherPos[1];
      const mang = Math.atan2(dy, dx);

      A.line(c, [samLauncherPos, [beamX, beamY]], P.enemy, lwO, [A.px(c, 10), A.px(c, 7)]);
      c.save();
      c.translate(beamX, beamY);
      c.rotate(mang);
      U.drawSamMissile(c, { scale: 1.25, thrust: 1 });
      c.restore();
    }

    // 4. Chủ thể Tiêm kích StrikeJet & Đài SAM
    c.save();
    c.translate(jetPos[0], jetPos[1]);
    U.drawStrikeJet(c, {
      view: 'cutaway',
      scale: 1.85,
      rwrAlert: mFly > 0.05 && switchOffP < 0.5,
    });
    c.restore();

    c.save();
    c.translate(samPos[0], samPos[1]);
    U.drawSamRadarSite(c, {
      view: 'side',
      scale: 1.35,
      blinded: jamActive > 0.5,
      missilesLeft: mFly > 0.02 ? 1 : 2,
    });
    c.restore();

    // 5. Hộp Công tắc Quyết định trong buồng lái ("when to switch it on, for how long... keep it off": 180.78–192.42s)
    const tensionShow = A.sm(t, CUE.c3_tension - 0.2, CUE.c3_tension + 0.8);
    if (tensionShow > 0.02) {
      const bx = -120;
      const by = -235;
      A.withA(c, tensionShow, () => {
        A.line(c, [[jetPos[0] + 65, jetPos[1] - 25], [bx, by + 68]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
        A.rrect(c, bx - 155, by - 64, 310, 128, 12, P.paper, P.ink, lwO);

        // Nửa trái: Vòng khiên bảo vệ (Protects) vs Nửa phải: Cột sóng chấm than báo vị trí (Announces)
        A.circle(c, bx - 85, by, 32, jamActive > 0.5 ? P.sky : P.bg2, P.ink, lwO);
        A.poly(
          c,
          [
            [bx - 85, by - 18],
            [bx - 69, by - 10],
            [bx - 69, by + 6],
            [bx - 85, by + 18],
            [bx - 101, by + 6],
            [bx - 101, by - 10],
          ],
          P.paper,
          P.ink,
          lwI
        );

        // Cần gạt công tắc ở giữa (Gạt từ phải/ON sang trái/OFF lúc 189.88s)
        const knobX = A.lerp(bx + 18, bx - 18, switchOffP);
        A.rrect(c, bx - 34, by - 16, 68, 32, 16, jamActive > 0.5 ? P.amber : P.slate, P.ink, lwO);
        A.circle(c, knobX, by, 13, P.paper, P.ink, lwO);

        // Biểu tượng ngọn hải đăng phát lộ vị trí bên phải
        A.circle(c, bx + 85, by, 32, jamActive > 0.5 ? P.enemy : P.bg2, P.ink, lwO);
        A.poly(
          c,
          [
            [bx + 85, by - 16],
            [bx + 101, by + 14],
            [bx + 69, by + 14],
          ],
          P.amber,
          P.ink,
          lwI
        );
      });
    }

    K.end(c);
  }
}
