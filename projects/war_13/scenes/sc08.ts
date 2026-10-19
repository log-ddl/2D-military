import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc08 (192.42–217.24s): Chương 3 (Phần 2) — Máy bay gây nhiễu tầm xa chuyên dụng (Standoff Jamming Aircraft)
 * - 192.42–203.8s (SIDE): Cận cảnh máy bay tác chiến điện tử chuyên dụng mang các pod dưới cánh và đầu mút cánh.
 * - 203.8–217.24s (TOP): Bản đồ chiến thuật cho thấy máy bay gây nhiễu bay ngoài tầm bắn phòng không,
 *   chiếu chùm nhiễu làm mù các đài radar địch để biên đội tấn công phía sau tiến vào mà không bị thấy.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const isTop = t >= 203.8;
    A.clear(c, P.bg);

    if (!isTop) {
      // ── PHA 1 (192.42–203.8s): GÓC NGANG (SIDE) CẬN CẢNH POD DƯỚI CÁNH & ĐẦU MÚT CÁNH ──
      const cam = K.track(
        t,
        [
          [192.42, { x: -40, y: -20, z: 1.15 }],
          [199.08, { x: 10, y: -10, z: 1.28 }],
          [203.8, { x: 25, y: -10, z: 1.28 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      const lwO = A.px(c, LINE.outer);
      const lwI = A.px(c, LINE.inner);

      U.drawSkyEnv(c, cam, { groundY: 320, hills: true });

      const podsHighlight = A.sm(t, CUE.c3_standoff_pods - 0.3, CUE.c3_standoff_pods + 1.0);
      const jetPos: A.Pt = [-40, -35];

      // Chùm sóng định hướng phát ra từ pod dưới cánh và đầu mút cánh
      if (podsHighlight > 0.02) {
        A.withA(c, podsHighlight, () => {
          A.poly(
            c,
            [
              [jetPos[0] + 65, jetPos[1] + 52],
              [620, -140],
              [620, 220],
            ],
            'rgba(245,158,11,0.16)',
            P.amber,
            lwI
          );
          U.drawSignalLink(c, [jetPos[0] + 65, jetPos[1] + 52], [560, 80], t, {
            color: P.amber,
            mode: 'wave',
            amp: 12,
            speed: 3.0,
            progress: podsHighlight,
          });
        });
      }

      // Máy bay tác chiến điện tử chuyên dụng (StandoffJammerJet) cỡ lớn
      c.save();
      c.translate(jetPos[0], jetPos[1]);
      U.drawStandoffJammerJet(c, {
        view: 'side',
        scale: 2.35,
        podsActive: podsHighlight > 0.1,
      });
      c.restore();

      // Vòng nhấn chỉ rõ vị trí Pod dưới cánh và Pod đầu mút cánh khi voice đọc "pods under its wings and wingtips"
      if (podsHighlight > 0.05) {
        A.withA(c, podsHighlight, () => {
          // Vòng khoanh Pod dưới cánh & đầu mút cánh
          A.circle(c, jetPos[0] - 12, jetPos[1] + 66, 52, null, P.amber, lwO);
          A.circle(c, jetPos[0] - 122, jetPos[1] + 28, 38, null, P.sky, lwO);
          // Vòng khoanh bầu anten trên đỉnh đuôi đứng
          A.circle(c, jetPos[0] - 260, jetPos[1] - 178, 36, null, P.sky, lwO);
        });
      }

      K.end(c);
      return;
    }

    // ── PHA 2 (203.8–217.24s): GÓC TRÊN XUỐNG (TOP) — CHE CHẮN CHO BIÊN ĐỘI TẤN CÔNG PHÍA SAU ──
    const camTop = K.track(
      t,
      [
        [203.8, { x: -40, y: 0, z: 0.96 }],
        [217.24, { x: 40, y: 0, z: 0.96 }],
      ],
      A.eio
    );

    K.begin(c, camTop);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawMapEnv(c, camTop, { roadY: 180, ridge: true });

    const sam1: A.Pt = [480, -165];
    const sam2: A.Pt = [520, 175];
    const jammerJet: A.Pt = [-480, 10];
    const blindP = A.sm(t, CUE.c3_blind_radars - 1.2, CUE.c3_blind_radars + 0.8);
    const strikeFlow = A.ph(t, 203.8, 217.24);

    // Vòng tầm bắn nguy hiểm của phòng không đối phương (máy bay Standoff Jammer đứng ngoài vòng này)
    A.circle(c, 500, 5, 420, 'rgba(180,73,60,0.06)', P.enemy, lwI);

    // 1. Hai chùm sóng gây nhiễu định hướng từ các pod của StandoffJammerJet khóa mù 2 đài radar SAM địch
    if (blindP > 0.01) {
      A.withA(c, blindP, () => {
        // Hành lang bóng râm an toàn ở giữa 2 chùm gây nhiễu cho biên đội cường kích bay vào
        A.poly(
          c,
          [
            [jammerJet[0] + 80, jammerJet[1] - 60],
            [640, -140],
            [640, 140],
            [jammerJet[0] + 80, jammerJet[1] + 60],
          ],
          'rgba(56,189,248,0.12)',
          P.sky,
          lwI
        );

        for (const sp of [sam1, sam2]) {
          U.drawSignalLink(c, jammerJet, sp, t, {
            color: P.amber,
            mode: 'noise',
            amp: 12,
            speed: 3.2,
            progress: blindP,
          });
          // Vòng khóa mù trên đài radar đối phương
          A.circle(c, sp[0], sp[1], 68, 'rgba(245,158,11,0.22)', P.amber, lwO);
        }
      });
    }

    // 2. Hai đài radar phòng không SAM của đối phương
    for (const sp of [sam1, sam2]) {
      c.save();
      c.translate(sp[0], sp[1]);
      U.drawSamRadarSite(c, {
        view: 'top',
        scale: 1.15,
        dishAngle: Math.atan2(jammerJet[1] - sp[1], jammerJet[0] - sp[0]),
        blinded: blindP > 0.5,
      });
      c.restore();
    }

    // 3. Biên đội 3 tiêm kích tấn công (StrikeJet) bay trong hành lang được che chắn ("aircraft behind it are not seen")
    const formationOffsets: A.Pt[] = [
      [0, 0],
      [-115, -78],
      [-115, 78],
    ];
    const leadX = A.lerp(-150, 290, strikeFlow);
    for (const [ox, oy] of formationOffsets) {
      c.save();
      c.translate(leadX + ox, jammerJet[1] + oy);
      U.drawStrikeJet(c, { view: 'top', scale: 0.92 });
      c.restore();
    }

    // 4. Máy bay gây nhiễu tầm xa chuyên dụng (StandoffJammerJet) bay yểm trợ phía sau
    c.save();
    c.translate(jammerJet[0], jammerJet[1]);
    U.drawStandoffJammerJet(c, {
      view: 'top',
      scale: 1.35,
      podsActive: true,
    });
    c.restore();

    K.end(c);
  }
}
