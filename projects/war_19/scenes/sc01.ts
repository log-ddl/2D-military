// scenes/sc01.ts — Chương 1, Shot 1.1 & 1.2 (0.00 – 33.24s)
// Hook mặt cắt dọc (SIDE Cutaway): Boeing 747 chở 100T thùng nhôm nhẹ nhưng gãy sập sàn dưới 60T tập trung của xe tăng,
// và ở đường băng dã chiến không có xe nâng cắt kéo (scissor lift) thì sàn khoang cao 5m hoàn toàn bất khả xâm phạm.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch1StateAt } from './_state';
import {
  drawB747,
  drawTank,
  drawScissorLift,
  drawExplosion,
  drawGroundSide,
  drawCallout,
  lw,
} from './_assets';

const camWideCrush: K.Cam = { x: -35, y: -145, z: 1.68 };
const camZoomBeam: K.Cam = { x: -20, y: -152, z: 1.92 };
const camAirstrip5m: K.Cam = { x: -75, y: -125, z: 1.52 };

const camTrack: [number, K.Cam][] = [
  [0.0, camWideCrush],
  [9.5, camWideCrush],
  [13.8, camZoomBeam],
  [17.6, camZoomBeam],
  [19.6, camAirstrip5m],
  [33.24, camAirstrip5m],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = ch1StateAt(t);
    let cam = K.track(t, camTrack, A.eio);
    cam = K.withShake(cam, t, [[CUE.ch1_crush_snap, 16, 0.55]]);

    A.clear(c, P.bg);
    K.begin(c, cam);

    // 1. Nền sân bay (chuyển mượt từ bê tông dân sự sang đường băng đất dã chiến ở 18.18s)
    drawGroundSide(c, cam, st.isDirtStrip > 0.5 ? 'dirt' : 'civil', 0);

    // 2. Cầu dẫn tạm lúc đầu để thử đưa xe tăng lên khoang (chỉ hiện trong giả định 8.5–18.18s)
    const testBridgeAlpha = A.win(t, 8.2, CUE.ch1_airstrip_shift, 0.5, 0.5);
    A.withA(c, testBridgeAlpha, () => {
      A.poly(c, [[-490, 0], [-275, -158], [-255, -158], [-465, 0]], P.slate, P.ink, lw(c, LINE.inner));
    });

    // 3. Máy bay dân sự Boeing 747 Freighter mở mặt cắt dọc (sàn cao 5m = -158px)
    drawB747(c, 55, 0, {
      view: 'cutaway',
      scale: 1,
      floorCrush: st.floorCrush,
      showContainers: st.containersAlpha,
    });

    // 4. Chiếc xe tăng chủ lực 60 tấn (đã hiện diện ngay từ giây 0.00 ở đầu cầu dẫn để đối chiếu trực quan với 747)
    const tankAppear = 1;
    A.withA(c, tankAppear, () => {
      drawTank(c, st.tankX, st.tankY, {
        view: 'side',
        scale: 0.92,
        pitch: st.tankPitch,
        hiFootprint: st.tankHiFootprint,
      });

      // Mũi tên áp lực 60 tấn tập trung đè gãy dầm sàn (10.2–17.9s)
      const forceAlpha = A.win(t, 10.2, CUE.ch1_airstrip_shift - 0.2, 0.4, 0.3);
      A.withA(c, forceAlpha, () => {
        for (const ox of [-38, 38]) {
          const ax = st.tankX + ox;
          const ay = st.tankY + 4;
          A.line(c, [[ax, ay - 26], [ax, ay + 24]], P.enemy, lw(c, 5.5));
          A.poly(c, [[ax, ay + 34], [ax - 9, ay + 18], [ax + 9, ay + 18]], P.enemy, P.ink, lw(c, 2));
        }
      });
    });

    // Chớp gãy dầm sàn tại 15.60s
    const snapP = A.ph(t, CUE.ch1_crush_snap, CUE.ch1_crush_snap + 0.65);
    drawExplosion(c, -15, -128, snapP, 38);

    // 5. Shot 1.2: Thước đo chiều cao 5 mét từ mặt đất lên sàn khoang 747 (23.44–33.24s)
    A.withA(c, st.dim5mAlpha, () => {
      const dx = -245;
      A.line(c, [[dx, -2], [dx, -156]], P.enemy, lw(c, 4), [8, 6]);
      A.line(c, [[dx - 16, -2], [dx + 16, -2]], P.enemy, lw(c, 4));
      A.line(c, [[dx - 16, -158], [dx + 16, -158]], P.enemy, lw(c, 4));
      // Mũi tên 2 đầu
      A.poly(c, [[dx, -158], [dx - 7, -142], [dx + 7, -142]], P.enemy, null, 0);
      A.poly(c, [[dx, -2], [dx - 7, -18], [dx + 7, -18]], P.enemy, null, 0);
    });

    // 6. Xe nâng thủy lực cắt kéo (Scissor lift truck) hiện lên rồi bị gạch chéo đỏ trên đường băng chiến trường
    if (st.scissorAlpha > 0.01) {
      const liftCycle = A.eio(t, CUE.ch1_scissor_lift, CUE.ch1_scissor_cross - 0.2);
      drawScissorLift(c, -185, 0, {
        scale: 0.95,
        lift: A.lerp(0.25, 0.92, liftCycle),
        crossedOut: st.scissorCross,
        alpha: st.scissorAlpha * (1 - 0.35 * st.scissorCross),
      });
    }

    K.end(c);

    // Callout tối thiểu cho các con số chính voice đọc ra (100T, 60T, 5m)
    const c100 = A.win(t, CUE.ch1_b747_100t - 0.2, CUE.ch1_drive_in, 0.3, 0.3);
    drawCallout(c, cam, 55, -215, 0, -58, '100 TONS', c100, P.slate);

    const c60 = A.win(t, CUE.ch1_tank_60t, 17.8, 0.3, 0.3);
    drawCallout(c, cam, st.tankX, st.tankY - 78, -65, -48, '60 TONS', c60, P.enemy);

    const c5m = A.win(t, CUE.ch1_deck_5m + 0.2, 32.8, 0.3, 0.3);
    drawCallout(c, cam, -245, -80, -82, 0, '5m', c5m, P.enemy);
  }
}
