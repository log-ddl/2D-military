import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { worldAt } from './_state';
import {
  drawTechnicalBg,
  drawCargoShip,
  drawRowBoat,
  drawHaleDrone,
  drawQuadDrone,
} from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = worldAt(t);
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };

    K.begin(c, cam);
    drawTechnicalBg(c, cam, { showFloor: false, gridStep: 120 });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // Phase 1 (14.26–17.60): Cargo ship vs Rowing boat on shared waterline
    // Phase 2 (17.60–23.32): Morph/align with HALE vs Quadcopter + single rigid clamp box + war map mismatch
    const morphP = A.eio(t, CUE.ch1_sameWord, CUE.ch1_sameWord + 1.1);
    const shipY = A.lerp(40, 210, morphP);
    const shipAlpha = A.lerp(1.0, 0.28, morphP);

    // Shared waterline & waves
    A.withA(c, shipAlpha, () => {
      c.fillStyle = P.bg2;
      c.fillRect(-980, shipY, 1960, 420);
      A.line(c, [[-980, shipY], [980, shipY]], P.sky, lo);

      // Massive Cargo Ship on Left (-260)
      drawCargoShip(c, -260, shipY, 1.48);

      // Tiny Rowing Boat on Right (520)
      const bob = Math.sin(t * 3.5) * 4;
      drawRowBoat(c, 520, shipY + bob, 1.35);
    });

    // Phase 2: HALE Drone & Quadcopter locked into one single rigid frame
    if (morphP > 0.01) {
      const droneY = A.lerp(-140, -110, morphP);
      A.withA(c, morphP, () => {
        // Left: Giant HALE Drone (Side profile + front silhouette wingspan bar)
        drawHaleDrone(c, -260, droneY, 2.25, { view: 'side' });

        // Right: Tiny Quadcopter at same scale reference
        drawQuadDrone(c, 520, droneY, 0.95, {
          view: 'side',
          rotorPhase: st.rotorPhase,
        });

        // Vertical dashed alignment lines proving Cargo Ship <-> HALE and Rowboat <-> Quadcopter
        A.line(c, [[-260, droneY + 45], [-260, shipY - 90]], P.slate, li, [8, 8]);
        A.line(c, [[520, droneY + 35], [520, shipY - 25]], P.slate, li, [8, 8]);
      });

      // Heavy iron clamp bracket ("the same word covers them both")
      const clampP = A.eo(t, CUE.ch1_sameWord + 0.4, CUE.ch1_sameWord + 1.4);
      if (clampP > 0) {
        const topY = A.lerp(-420, -255, clampP);
        // Outer rigid stamp box enclosing both dissimilar machines
        A.rrect(c, -640, topY, 1310, 275, 16, null, P.ink, lo * 1.4);
        // Top stamp header bar (visual symbol for "1 single label" without text clutter)
        A.rrect(c, -150, topY - 26, 300, 52, 10, P.ink, P.ink, lo);
        A.circle(c, -110, topY, 8, P.amber, null, 0);
        A.line(c, [[-80, topY], [110, topY]], P.paper, lo * 1.2);
      }

      // Tactical misunderstanding warning (t >= 20.4: "treating it as one thing is the fastest way to misunderstand a modern war")
      const errP = A.eo(t, CUE.ch1_misunderstand, CUE.ch1_misunderstand + 1.0);
      if (errP > 0) {
        A.withA(c, errP, () => {
          // Red conflict border & broken equality sign between Left and Right
          A.rrect(c, -640, -255, 1310, 275, 16, null, P.enemy, lo * 1.6);

          // Not-equal symbol (≠) in center between the giant HALE and tiny Quad
          const nx = 185;
          const ny = -110;
          A.circle(c, nx, ny, 54, P.paper, P.enemy, lo * 1.2);
          A.line(c, [[nx - 26, ny - 12], [nx + 26, ny - 12]], P.ink, lo * 1.3);
          A.line(c, [[nx - 26, ny + 12], [nx + 26, ny + 12]], P.ink, lo * 1.3);
          A.line(c, [[nx - 24, ny + 30], [nx + 24, ny - 30]], P.enemy, lo * 1.5);
        });
      }
    }

    K.end(c);
  }
}
