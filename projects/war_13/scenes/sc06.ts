import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';
import { SIDE_AIR_NODES } from './_state';

/**
 * sc06 (141.36–165.02s): Chương 2 (Phần 4) — Chaff & Powered Decoys
 * Góc nhìn SIDE kết hợp mặt cắt cơ chế:
 * - Chaff (143.84–152.60s): đám mây sợi kim loại cắt đúng bước sóng radar tạo phản xạ mạnh che máy bay.
 * - Decoys (153.18–157.92s): mồi bẫy nhỏ có động cơ phóng ra từ máy bay, giả chữ ký của máy bay lớn.
 * - Kết luận (158.14–165.02s): Cảm biến địch vẫn hoạt động, nhưng bị cho quá nhiều mục tiêu nên không thể chắc chắn.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(
      t,
      [
        [141.36, { x: -70, y: -20, z: 1.1 }],
        [153.0, { x: 25, y: -5, z: 1.05 }],
        [165.02, { x: 45, y: 5, z: 1.05 }],
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
    const chaffP = A.sm(t, CUE.c2_chaff_cloud - 0.2, CUE.c2_blizzard_echo);
    const waveZoomP =
      A.sm(t, CUE.c2_wavelength - 0.6, CUE.c2_wavelength + 0.4) *
      (1 - A.sm(t, CUE.c2_decoys_launch - 0.5, CUE.c2_decoys_launch + 0.3));
    const decoyP = A.sm(t, CUE.c2_decoys_launch, CUE.c2_mimic_larger + 0.5);
    const tooManyP = A.sm(t, CUE.c2_too_many_things - 0.3, CUE.c2_too_many_things + 1.2);

    // 1. Sóng radar đối phương quét lên bầu trời
    const radarOrigin: A.Pt = [samPos[0] - 28, samPos[1] - 88];
    U.drawSignalLink(c, radarOrigin, [jetPos[0] + 60, jetPos[1]], t, {
      color: P.enemy,
      mode: 'pulse',
      speed: 2.5,
      progress: 1,
    });

    // 2. Đám mây sợi kim loại Chaff phóng ra phía sau đuôi tiêm kích (143.84s+)
    const chaffPos: A.Pt = [jetPos[0] - 310, jetPos[1] + 20];
    if (chaffP > 0.01) {
      A.withA(c, chaffP, () => {
        c.save();
        c.translate(chaffPos[0], chaffPos[1]);
        U.drawChaffCloud(c, { spread: A.lerp(0.35, 1.35, chaffP), count: 42 });
        c.restore();

        // Sóng phản xạ mạnh từ đám mây Chaff dội ngược về đài radar địch
        U.drawSignalLink(c, chaffPos, radarOrigin, t, {
          color: P.amber,
          mode: 'pulse',
          speed: 3.0,
          progress: chaffP,
        });
      });
    }

    // Cửa sổ phóng đại cơ chế: Sợi kim loại Chaff cắt đúng độ dài bước sóng radar ("cut to the length of the radar's wavelength")
    if (waveZoomP > 0.01) {
      const wx = -370;
      const wy = -235;
      A.withA(c, waveZoomP, () => {
        A.line(c, [chaffPos, [wx + 40, wy + 75]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
        A.rrect(c, wx - 165, wy - 70, 330, 140, 10, P.paper, P.ink, lwO);
        // Sóng hình sin của radar (1 bước sóng)
        const wavePts: A.Pt[] = [];
        for (let x = -120; x <= 120; x += 6) {
          wavePts.push([wx + x, wy - 20 + Math.sin((x / 120) * Math.PI) * 24]);
        }
        A.line(c, wavePts, P.enemy, lwO);
        // Thanh sợi kim loại Chaff đặt song song khớp đúng độ dài bước sóng, phát sáng cộng hưởng
        A.rrect(c, wx - 120, wy + 22, 240, 12, 4, P.amber, P.ink, lwO);
        A.line(c, [[wx - 120, wy - 20], [wx - 120, wy + 34]], P.ink2, lwI, [A.px(c, 4), A.px(c, 4)]);
        A.line(c, [[wx + 120, wy - 20], [wx + 120, wy + 34]], P.ink2, lwI, [A.px(c, 4), A.px(c, 4)]);
      });
    }

    // 3. Mồi bẫy có động cơ (Powered Decoys) phóng ra từ máy bay (153.18s+)
    const decoy1Pos: A.Pt = [
      A.lerp(jetPos[0] + 20, jetPos[0] + 290, decoyP),
      A.lerp(jetPos[1] + 28, jetPos[1] - 105, decoyP),
    ];
    const decoy2Pos: A.Pt = [
      A.lerp(jetPos[0] - 10, jetPos[0] + 240, decoyP),
      A.lerp(jetPos[1] + 32, jetPos[1] + 95, decoyP),
    ];
    if (decoyP > 0.01) {
      const mimic = A.sm(t, CUE.c2_mimic_larger - 0.5, CUE.c2_mimic_larger + 0.5) > 0.3;
      A.withA(c, decoyP, () => {
        for (const dp of [decoy1Pos, decoy2Pos]) {
          c.save();
          c.translate(dp[0], dp[1]);
          U.drawAirDecoy(c, { scale: 1.35, showMimicSignature: mimic });
          c.restore();
          U.drawSignalLink(c, dp, radarOrigin, t, {
            color: P.amber,
            mode: 'pulse',
            speed: 2.8,
            progress: decoyP,
          });
        }
      });
    }

    // 4. Tiêm kích StrikeJet & Đài radar SAM
    c.save();
    c.translate(jetPos[0], jetPos[1]);
    U.drawStrikeJet(c, { view: 'cutaway', scale: 1.75 });
    c.restore();

    c.save();
    c.translate(samPos[0], samPos[1]);
    U.drawSamRadarSite(c, { view: 'side', scale: 1.35 });
    c.restore();

    // 5. Màn hình RadarScope đối phương: Cảm biến vẫn hoạt động tốt nhưng ngập trong quá nhiều mục tiêu ("given too many things to be sure about")
    const falseList: A.Pt[] = [];
    if (chaffP > 0.3) {
      falseList.push([-0.68, 0.08], [-0.56, 0.18], [-0.74, -0.05]);
    }
    if (decoyP > 0.3) {
      falseList.push([0.18, -0.32], [0.08, 0.28]);
    }
    // Cổng bám bắt của radar nhảy loạn xạ giữa các mục tiêu giả khi tooManyP > 0
    const allTargets: A.Pt[] = [[-0.2, -0.05], ...falseList];
    const gateIdx = tooManyP > 0.1 ? Math.floor(t * 3.5) % allTargets.length : 0;

    U.drawRadarScope(c, {
      x: 490,
      y: -185,
      w: 360,
      h: 230,
      noiseLevel: 0,
      realTargetPos: [-0.2, -0.05],
      falseTargets: falseList,
      gatePos: allTargets[gateIdx] ?? [-0.2, -0.05],
    });

    K.end(c);
  }
}
