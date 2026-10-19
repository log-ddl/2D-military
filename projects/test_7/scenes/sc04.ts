import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawTechnicalBg,
  drawAirspaceBg,
  drawHaleDrone,
  drawAirliner,
  drawCallout,
} from './_assets';

const startCam: K.Cam = { x: 0, y: 0, z: 1.04 };
const closeCam: K.Cam = { x: 0, y: -120, z: 1.22 };
const skyWideCam: K.Cam = { x: 0, y: -30, z: 0.96 };

const camKeys: [number, K.Cam][] = [
  [47.0, startCam],
  [51.0, closeCam],
  [59.6, closeCam],
  [61.2, skyWideCam],
  [67.55, skyWideCam],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(t, camKeys, A.eio);
    const skyFade = A.sm(t, 47.2, 49.0);

    K.begin(c, cam);
    if (skyFade < 0.99) {
      drawTechnicalBg(c, cam, { showFloor: false, gridStep: 120 });
    }
    if (skyFade > 0.01) {
      A.withA(c, skyFade, () => {
        drawAirspaceBg(c, cam, { groundY: 340, showBands: true });
      });
    }

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // Province landmarks on ground (visible when camera pulls out at 60.38s)
    const wideP = A.sm(t, CUE.ch2_aboveAirliners - 0.3, CUE.ch2_aboveAirliners + 1.0);
    if (wideP > 0.01) {
      A.withA(c, wideP, () => {
        // Town & road blocks across the province on groundY = 340
        for (const gx of [-520, -240, 80, 380, 620]) {
          A.rrect(c, gx - 32, 308, 64, 32, 4, P.slate, P.ink, li);
          A.rrect(c, gx + 42, 318, 42, 22, 3, P.oliveLight, P.ink, li);
        }
        // Small commercial airliner flying in lower altitude band (y = -25)
        const airX = A.lerp(-420, 320, A.ph(t, 59.5, 67.55));
        drawAirliner(c, airX, -25, 1.45, { view: 'side' });
      });
    }

    // HALE Drone position & scale transitions smoothly from end of sc03 (0, -215, scale 2.25)
    // to (-40, 20) during wing/engine explanation, then up to stratosphere (y = -310, scale 1.85) in wide view
    const explainP = A.eio(t, 47.2, 50.8);
    const midY = A.lerp(-215, 25, explainP);
    const haleY = A.lerp(midY, -310, wideP);
    const haleScale = A.lerp(2.25, 1.85, wideP);
    const scanP = A.sm(t, CUE.ch2_watchProvince - 0.4, CUE.ch2_watchProvince + 0.8);

    // Wide province sensor cone from HALE down to ground (y = 340)
    if (scanP > 0) {
      const noseX = 52 * haleScale;
      const noseY = haleY + 20 * haleScale;
      A.withA(c, 0.2 * scanP, () => {
        A.poly(c, [[noseX, noseY], [-680, 340], [720, 340]], P.sky, null, 0);
      });
      A.line(c, [[noseX, noseY], [-680, 340]], P.sky, lo, [12, 8]);
      A.line(c, [[noseX, noseY], [720, 340]], P.sky, lo, [12, 8]);
      const sweepX = A.lerp(-620, 660, (Math.sin(t * 1.8) + 1) * 0.5);
      A.line(c, [[noseX, noseY], [sweepX, 340]], P.sky, li);
      A.ellipse(c, 20, 340, 690 * scanP, 22, 0, null, P.sky, lo);
    }

    // Draw the HALE drone in cutaway/side view
    drawHaleDrone(c, 0, haleY, haleScale, {
      view: 'cutaway',
      cutaway: t < 61.5,
      wingStretch: 1.08,
    });

    // Front-profile glider wingspan diagram + lift arrows above the cutaway HALE (51.30–60.2s)
    // ("long, thin wings that glide efficiently")
    const liftAlpha = A.win(t, CUE.ch2_haleTypes, 60.2, 0.5, 0.5);
    if (liftAlpha > 0) {
      const frontY = haleY - 220;
      A.withA(c, liftAlpha, () => {
        drawHaleDrone(c, 0, frontY, 1.95, { view: 'front', wingStretch: 1.08 });
        // Upward aerodynamic lift arrows along the long thin wings
        const arrowP = A.sm(t, CUE.ch2_longWings, CUE.ch2_longWings + 0.8);
        A.withA(c, arrowP, () => {
          for (const lx of [-420, -260, -120, 120, 260, 420]) {
            A.line(c, [[lx, frontY + 58], [lx, frontY + 14]], P.sky, lo);
            A.poly(c, [[lx - 9, frontY + 20], [lx + 9, frontY + 20], [lx, frontY + 5]], P.sky, null, 0);
          }
        });
      });
    }

    // Fuel-sipping mechanism: tiny droplets moving from center fuel tank to small rear engine (57.1–60.5s)
    const sipAlpha = A.win(t, CUE.ch2_smallEngine, 60.5, 0.4, 0.4);
    if (sipAlpha > 0) {
      A.withA(c, sipAlpha, () => {
        const bx = -90;
        const by = haleY + 125;
        A.rrect(c, bx - 160, by - 42, 320, 84, 12, P.paper, P.ink, lo);
        // Connector lines to actual fuel tank and rear engine inside cutaway
        A.line(c, [[bx + 80, by - 42], [-20, haleY]], P.amber, li, [6, 6]);
        A.line(c, [[bx - 110, by - 42], [-220, haleY - 40]], P.slate, li, [6, 6]);
        // Large fuel tank -> tiny slow drops -> small engine
        A.rrect(c, bx + 35, by - 26, 95, 52, 6, P.amber, P.ink, li);
        A.rrect(c, bx - 135, by - 18, 52, 36, 5, P.slate, P.ink, li);
        for (let i = 0; i < 3; i++) {
          const u = ((t * 0.95 + i / 3) % 1 + 1) % 1;
          const dx = A.lerp(bx + 28, bx - 76, u);
          A.circle(c, dx, by, 5.5, P.amber, P.ink, li * 0.8);
        }
      });
    }

    K.end(c);

    // Minimal Callout for spoken number: "a day and a half" -> "36 h"
    const call36Alpha = A.win(t, CUE.ch2_dayAndHalf, 67.3, 0.35, 0.3);
    if (call36Alpha > 0) {
      const sPt = K.toScreen(cam, 0, haleY - 35);
      drawCallout(c, sPt, [sPt[0] + 220, sPt[1] - 40], '36 h', call36Alpha, P.sky);
    }
  }
}
