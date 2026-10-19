// sc09.ts (252.56 – 307.30s): Cơ chế Ống mềm & Rổ phễu (Probe and Drogue) —
// Xả ống cao su cốt thép 20–30m + rổ phễu cầu lông 60 cm, thử thách xâu kim trong nhiễu động đêm ở 500 km/h,
// và cú đâm lệch làm ống mềm quất ngang (hose whip) đập nứt kính buồng lái / gãy đầu kim probe.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawSkySideBg,
  drawModernTanker,
  drawStrikeFighter,
  drawCarrierFighter,
  drawFlyingBoom,
  drawHoseAndDrogue,
  lwO,
  lwI,
} from './_assets';
import { SIDE_PAIR, CUE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Khớp liền mạch tại 252.56s với cuối sc08 ({ x: 520, y: 15, z: 1.24 }), sau đó lia về cặp Tanker – Fighter
    let cam = K.track(
      t,
      [
        [252.56, { x: 520, y: 15, z: 1.24 }],
        [256.8, { x: 15, y: -15, z: 1.08 }],
        [274.0, { x: 5, y: -10, z: 1.12 }],
        // Tiến vào cận cảnh mũi tiêm kích & rổ phễu 60 cm (275..298s)
        [278.5, { x: -115, y: 45, z: 1.36 }],
        [298.5, { x: -115, y: 45, z: 1.36 }],
        // Cận sát khoảnh khắc đâm lệch, quất ống đập vỡ kính buồng lái & gãy đầu probe (299..307.3s)
        [300.5, { x: -145, y: 68, z: 1.54 }],
        [307.3, { x: -145, y: 68, z: 1.54 }],
      ],
      A.eio
    );

    // Rung nhẹ khi bay trong nhiễu động đêm (290.4..298.8s) và rung mạnh khi rổ đập vào kính buồng lái (303.4s)
    const nightP = A.win(t, CUE.turbulence_at_night - 1.2, 298.8, 0.7, 0.7);
    if (nightP > 0.05) {
      cam = K.handheld(cam, t * 2.4, 5.5 * nightP);
    }
    cam = K.withShake(cam, t, [
      [CUE.slap_canopy, 18, 0.55],
      [CUE.rip_probe_tip, 14, 0.45],
    ]);

    A.clear(c, P.bg);
    K.begin(c, cam);
    drawSkySideBg(c, cam, t, { speed: 230, night: nightP > 0.5, highAltBand: true });

    const lo = lwO(c);
    const li = lwI(c);
    const [tx, ty] = SIDE_PAIR.tanker; // [210, -145]

    // Giữ chiếc CarrierFighter của cuối sc08 mờ dần trong 2 giây đầu (252.56..255.0s) để nối cảnh mượt tuyệt đối
    const carryFade = 1 - A.sm(t, 252.8, 255.2);
    if (carryFade > 0.01) {
      A.withA(c, carryFade, () => {
        const cx = 620;
        const cy = 10;
        c.save();
        c.translate(cx, cy);
        drawCarrierFighter(c, 'side', { scale: 1.38 });
        c.restore();
        drawFlyingBoom(c, cx - 98, cy + 14, cx - 343, cy + 92, {
          extension: 0.85,
          locked: false,
        });
        A.line(c, [[cx - 235, cy + 42], [cx - 195, cy + 78]], P.enemy, lo * 1.8);
        A.line(c, [[cx - 235, cy + 78], [cx - 195, cy + 42]], P.enemy, lo * 1.8);
      });
    }

    // 1. Vẽ Tanker với pod ống mềm dưới cánh/bụng
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, 'side', { scale: 1.25, wingPods: true, hasBoom: false });
    c.restore();

    // 2. Xả cuộn ống mềm cao su cốt thép dài 20–30m (261.5 – 268.0s)
    const reelP = A.eio(t, CUE.probe_and_drogue, CUE.reels_out_20_30m + 2.8);
    const hx0 = tx - 28;
    const hy0 = ty + 34;

    // Quỹ đạo lắc lư của chiếc rổ phễu (drogue) và cú quất ngang khi bị đâm lệch (299.5 – 306.8s)
    const tossAmp =
      t < 280.0
        ? 4
        : t < 298.8
        ? 18 + 10 * nightP
        : 8;
    const tossY = Math.sin(t * 5.6) * tossAmp;

    // Cú đâm lệch tâm tại 299.8s -> sóng quất ống (301.8..306.8s) đập rổ xuống kính buồng lái ở (-205, 62)
    const stabP = A.bump(t, CUE.stabs_too_hard_offcenter - 0.3, 2.2);
    const slapP = A.bump(t, CUE.slap_canopy - 0.35, 1.3);
    const whipWave = A.win(t, CUE.hose_whip_sideways - 0.3, 306.8, 0.25, 0.5);

    const basketBaseX = A.lerp(hx0 - 35, -108, reelP);
    const basketBaseY = A.lerp(hy0 + 12, 74, reelP);
    const hx1 = basketBaseX - slapP * 88;
    const hy1 = basketBaseY + tossY - stabP * 18 + slapP * 6;

    // Luồng gió xanh da trời thổi vào vành rổ phễu giữ căng như quả cầu lông (270.0 – 275.5s)
    const windWin = A.win(t, CUE.funnel_basket_drogue, 275.8, 0.4, 0.4);
    if (windWin > 0.01) {
      A.withA(c, windWin, () => {
        for (const dy of [-22, 0, 22]) {
          A.line(
            c,
            [
              [hx1 + 75, hy1 + dy],
              [hx1 + 28, hy1 + dy * 0.7],
            ],
            P.sky,
            lo,
            [A.px(c, 8), A.px(c, 6)]
          );
        }
      });
    }

    if (reelP > 0.02) {
      drawHoseAndDrogue(c, hx0, hy0, hx1, hy1, {
        whipAmp: whipWave * 48,
        whipPhase: t * 1.4,
        basketScale: A.lerp(0.35, 1.12, A.sm(t, 267.5, 270.5)),
        basketScaleY: 1,
        basketAngle: slapP * 0.65,
      } as any);
    }

    // 3. Vẽ Strike Fighter thò cần thép Probe bên mũi (275.0s) và đuổi theo tâm rổ phễu
    const probeP = A.eio(t, CUE.extends_probe_nose - 0.8, CUE.extends_probe_nose + 1.6);
    const entrySlide = (1 - A.eio(t, 253.0, 256.8)) * -190;
    const chaseX =
      -265 +
      entrySlide +
      A.sm(t, 282.5, 287.5) * 24 +
      stabP * 38 -
      A.sm(t, 304.2, 306.5) * 28;
    const chaseY =
      80 +
      (t >= 283.0 && t < 298.8 ? Math.sin(t * 5.6 - 0.55) * 14 : 0) -
      stabP * 14;

    const canopyHit = t >= CUE.slap_canopy - 0.1;
    const probeSnapped = t >= CUE.rip_probe_tip - 0.1;

    c.save();
    c.translate(chaseX, chaseY);
    drawStrikeFighter(c, 'side', {
      scale: 1.28,
      hasReceptacle: false,
      probeExtended: probeP,
      canopyCracked: canopyHit,
      probeBroken: probeSnapped,
      bombsCount: 2,
      fuelLevel: 0.35,
    });
    c.restore();

    // Hiệu ứng tia lửa toé trên kính buồng lái (303.3s) và mảnh gãy đầu kim probe (306.1s)
    const pSpark = A.ph(t, CUE.slap_canopy - 0.1, CUE.slap_canopy + 0.65);
    if (pSpark > 0 && pSpark < 1) {
      FX.sparks(c, chaseX + 54, chaseY - 22, pSpark, 1.2, -Math.PI / 2, Math.PI, 7);
    }
    const ageDebris = t - CUE.rip_probe_tip;
    if (ageDebris > 0 && ageDebris < 1.2) {
      FX.debris(c, chaseX + 150, chaseY - 5, ageDebris, 0.8, 8, 13);
    }

    // 4. Khung ngắm góc CHÍNH DIỆN (FRONT VIEW) khi xâu kim rổ 60 cm trong nhiễu động ban đêm (284.5 – 298.8s)
    const frontWin = A.win(t, CUE.fly_probe_into_basket - 0.4, 298.8, 0.45, 0.4);
    if (frontWin > 0.01) {
      A.withA(c, frontWin, () => {
        c.save();
        c.translate(-320, -65);
        A.rrect(c, -155, -95, 310, 190, 16, nightP > 0.5 ? '#0f172a' : P.white, P.ink, lo);
        // Máy bay tiêm kích nhìn chính diện ở phía sau
        c.save();
        c.translate(-15, 22);
        c.scale(1.05, 1.05);
        drawStrikeFighter(c, 'front', { probeExtended: 1 });
        c.restore();
        // Vòng miệng rổ phễu 60 cm đang lắc lư trước mũi kim probe
        const bx = 22 + Math.cos(t * 6.2) * (14 + 12 * nightP);
        const by = 18 + Math.sin(t * 5.6) * (14 + 12 * nightP);
        A.circle(c, bx, by, 34, 'rgba(245, 158, 11, 0.15)', P.amber, lo * 1.2);
        A.circle(c, bx, by, 22, null, P.enemy, li);
        A.circle(c, bx, by, 5, P.amber, P.ink, li);
        c.restore();
      });
    }

    K.end(c);

    // ── Callout số liệu tối giản (tối đa 1 cùng lúc) ──
    const p2030 = A.win(t, CUE.reels_out_20_30m, 267.8, 0.25, 0.25);
    if (p2030 > 0.01) {
      const [sx, sy] = K.toScreen(cam, (hx0 + hx1) / 2, (hy0 + hy1) / 2);
      UI.callout(c, '20–30 M', sx - 135, sy - 85, { to: [sx, sy], p: p2030, color: P.slate });
    }

    const p60cm = A.win(t, CUE.cm_60_across - 0.3, 292.0, 0.25, 0.25);
    if (p60cm > 0.01) {
      const [sx, sy] = K.toScreen(cam, hx1 + 26, hy1);
      UI.callout(c, '60 CM', sx + 135, sy - 80, { to: [sx, sy], p: p60cm, color: P.amber });
    }

    const p500 = A.win(t, CUE.threading_needle_500 + 2.2, 298.8, 0.2, 0.2);
    if (p500 > 0.01) {
      const [sx, sy] = K.toScreen(cam, hx1, hy1);
      UI.callout(c, '500 KM/H', sx + 145, sy + 80, { to: [sx, sy], p: p500, color: P.sky });
    }
  }
}
