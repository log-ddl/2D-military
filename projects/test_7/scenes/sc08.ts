import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { worldAt } from './_state';
import {
  drawAirspaceBg,
  drawQuadDrone,
  drawSoldierUnit,
  drawSamSystem,
  drawSignalLink,
  drawCallout,
} from './_assets';

const hillWideCam: K.Cam = { x: 0, y: 35, z: 0.98 };
const quadCloseCam: K.Cam = { x: -30, y: -155, z: 2.35 };

const camKeys: [number, K.Cam][] = [
  [132.0, hillWideCam],
  [141.6, hillWideCam],
  [142.6, quadCloseCam],
  [146.0, quadCloseCam],
  [147.2, hillWideCam],
  [157.0, hillWideCam],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = worldAt(t);
    const cam = K.track(t, camKeys, A.eio);

    K.begin(c, cam);
    const gy = 300;
    // Tall hill ridge at x = 20 blocking direct line of sight
    drawAirspaceBg(c, cam, { groundY: gy, ridgeX: 20, ridgeH: 250, showBands: false });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // ── 1. FRIENDLY PLATOON ON LEFT SLOPE (x = -560, y = 300) ──────────
    drawSoldierUnit(c, -640, gy, 1.45, { role: 'backpack', facing: 1 });
    drawSoldierUnit(c, -510, gy, 1.45, { role: 'controller', facing: 1 });

    // Blocked ground line-of-sight arrow hitting the hill ridge ("not knowing what is behind the next ridge")
    const losAlpha = A.win(t, 132.4, 156.8, 0.4, 0.3);
    if (losAlpha > 0) {
      A.withA(c, losAlpha * 0.75, () => {
        A.line(c, [[-470, gy - 95], [-115, gy - 140]], P.slate, lo, [10, 8]);
        // Blocked X at hill face
        A.line(c, [[-128, gy - 153], [-102, gy - 127]], P.enemy, lo * 1.2);
        A.line(c, [[-128, gy - 127], [-102, gy - 153]], P.enemy, lo * 1.2);
      });
    }

    // ── 2. ENEMY POSITION BEHIND THE HILL RIDGE (x = 480..640) ─────────
    const launchP = A.eio(t, CUE.ch3_smallQuad, CUE.ch3_overNextHill);
    const revealP = A.sm(t, CUE.ch3_overNextHill - 0.3, CUE.ch3_overNextHill + 1.0);

    // Before drone reaches crest, show mystery shadow; once drone crests, reveal clear enemy force!
    A.withA(c, 0.25 + 0.75 * revealP, () => {
      drawSamSystem(c, 490, gy, 1.4, { view: 'side', missiles: 2 });
      drawSoldierUnit(c, 650, gy, 1.4, { role: 'shotgun', enemy: true, facing: -1 });
    });
    if (revealP > 0.1) {
      A.withA(c, revealP, () => {
        // Target brackets around revealed enemy behind the ridge
        A.rrect(c, 385, gy - 135, 315, 140, 10, null, P.enemy, lo);
      });
    }

    // ── 3. QUADCOPTER LAUNCHES IN A MINUTE & CRESTS THE HILL ───────────
    const qx = A.lerp(-470, -30, launchP);
    const qy = A.lerp(gy - 85, -165, launchP);
    const inCloseUp = A.win(t, 142.0, 146.8, 0.4, 0.4);

    // Camera observation cone over the ridge + radio link back to soldier
    if (launchP > 0.7 && inCloseUp < 0.8) {
      A.withA(c, (1 - inCloseUp) * revealP, () => {
        A.withA(c, 0.18, () => {
          A.poly(c, [[qx + 42, qy + 8], [340, gy], [710, gy]], P.sky, null, 0);
        });
        A.line(c, [[qx + 42, qy + 8], [340, gy]], P.sky, li, [10, 8]);
        A.line(c, [[qx + 42, qy + 8], [710, gy]], P.sky, li, [10, 8]);
        drawSignalLink(c, -455, gy - 105, qx - 32, qy, t, { mode: 'radio' });
      });
    }

    // Draw the Quadcopter (scales up slightly and opens cutaway during 142.2..146.5s)
    const qScale = 1.45;
    drawQuadDrone(c, qx, qy, qScale, {
      view: 'cutaway',
      cutaway: inCloseUp > 0.2,
      rotorPhase: st.rotorPhase,
    });

    // Sequential Component Highlights during close-up (142.24–146.16s:
    // "It has four small rotors, a camera, a battery, and a radio link.")
    if (inCloseUp > 0.05) {
      A.withA(c, inCloseUp, () => {
        // 1. Rotors (142.2..143.3)
        if (t >= 142.2 && t < 143.4) {
          A.rrect(c, qx - 130, qy - 45, 260, 32, 8, null, P.amber, lo);
        }
        // 2. Camera (143.3..144.2)
        if (t >= 143.3 && t < 144.3) {
          A.circle(c, qx + 45, qy + 3, 24, null, P.sky, lo);
        }
        // 3. Battery (144.2..145.1)
        if (t >= 144.2 && t < 145.2) {
          A.rrect(c, qx - 38, qy - 20, 66, 36, 6, null, P.amber, lo * 1.2);
        }
        // 4. Radio antenna & link (145.1..146.5)
        if (t >= 145.1) {
          A.circle(c, qx - 35, qy - 60, 22, null, P.sky, lo * 1.2);
          drawSignalLink(c, qx - 35, qy - 60, qx - 160, qy + 50, t, { mode: 'radio' });
        }
      });
    }

    K.end(c);

    // Minimal Callout for spoken numbers: "20 or 30 minutes"
    const callAlpha = A.win(t, CUE.ch3_twentyThirtyMin, 151.0, 0.35, 0.35);
    if (callAlpha > 0) {
      const sPt = K.toScreen(cam, qx, qy - 28);
      drawCallout(c, sPt, [sPt[0], sPt[1] - 95], '20–30 min', callAlpha, P.amber);
    }
  }
}
