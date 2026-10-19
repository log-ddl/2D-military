import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { worldAt } from './_state';
import {
  drawTechnicalBg,
  drawFighterJet,
  drawHaleDrone,
  drawMaleDrone,
  drawQuadDrone,
  drawOneWayDrone,
} from './_assets';

const branchCam: K.Cam = { x: 0, y: 0, z: 1.02 };
const cutawayCam: K.Cam = { x: 15, y: -55, z: 1.52 };
const tradeCam: K.Cam = { x: 0, y: 0, z: 1.04 };

const camKeys: [number, K.Cam][] = [
  [23.32, branchCam],
  [30.2, branchCam],
  [31.4, cutawayCam],
  [37.4, cutawayCam],
  [38.8, tradeCam],
  [47.0, tradeCam],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = worldAt(t);
    const cam = K.track(t, camKeys, A.eio);

    K.begin(c, cam);
    drawTechnicalBg(c, cam, { showFloor: false, gridStep: 120 });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const inTradePhase = A.sm(t, CUE.ch1_threeThings - 0.3, CUE.ch1_threeThings + 0.6);

    // ── PHASE 1 & 2 (23.32 – 38.5s): BRANCHING SHAPES & PILOT EXTRACTION CUTAWAY ──
    if (inTradePhase < 0.99) {
      A.withA(c, 1 - inTradePhase, () => {
        // Radial branches ("why does one idea split into so many shapes?")
        const splitP = A.eo(t, CUE.ch1_manyShapes, CUE.ch1_manyShapes + 1.2);
        const fadeBranches = 1 - A.sm(t, CUE.ch1_pilotTakenOut, CUE.ch1_pilotTakenOut + 0.9);
        if (splitP > 0 && fadeBranches > 0) {
          A.withA(c, splitP * fadeBranches, () => {
            const targets: [number, number][] = [
              [-540, -240],
              [540, -240],
              [-540, 240],
              [540, 240],
            ];
            for (const [tx, ty] of targets) {
              const cx = A.lerp(0, tx, splitP);
              const cy = A.lerp(0, ty, splitP);
              A.line(c, [[0, 0], [cx, cy]], P.sky, li, [10, 8]);
            }
            drawHaleDrone(c, A.lerp(0, -540, splitP), A.lerp(0, -240, splitP), 0.72, { view: 'top' });
            drawMaleDrone(c, A.lerp(0, 540, splitP), A.lerp(0, -240, splitP), 1.0, { view: 'side' });
            drawQuadDrone(c, A.lerp(0, -540, splitP), A.lerp(0, 240, splitP), 1.35, {
              view: 'top',
              rotorPhase: st.rotorPhase,
            });
            drawOneWayDrone(c, A.lerp(0, 540, splitP), A.lerp(0, 240, splitP), 1.25, { view: 'top' });
          });
        }

        // Center Aircraft Cutaway: extracting the pilot, seat & life support!
        const extractP = A.eio(t, CUE.ch1_pilotTakenOut + 0.5, CUE.ch1_pilotTakenOut + 2.8);
        const morphToDroneP = A.eio(t, CUE.ch1_freesDesigner, CUE.ch1_freesDesigner + 2.0);
        const extractY = A.lerp(0, -88, extractP);

        if (morphToDroneP < 0.95) {
          A.withA(c, 1 - morphToDroneP, () => {
            drawFighterJet(c, 0, 15, 2.0, {
              view: 'cutaway',
              cutaway: t >= CUE.ch1_pilotTakenOut - 0.2,
              pilotExtractY: extractY,
            });
          });
        }

        // Upward extraction arrows when pilot module lifts out
        if (extractP > 0.05 && morphToDroneP < 0.8) {
          A.withA(c, Math.sin(extractP * Math.PI), () => {
            A.line(c, [[65, -5], [65, -135]], P.amber, lo, [8, 6]);
            A.poly(c, [[55, -130], [75, -130], [65, -150]], P.amber, null, 0);
          });
        }

        // Streamlined unmanned drone emerging once pilot is removed
        if (morphToDroneP > 0.05) {
          A.withA(c, morphToDroneP, () => {
            drawHaleDrone(c, 0, 15, 2.1, {
              view: 'cutaway',
              cutaway: true,
              wingStretch: 0.75 + 0.25 * morphToDroneP,
            });
          });
        }
      });
    }

    // ── PHASE 3 (38.26 – 47.00s): 3-AXIS TRADE-OFF MECHANISM ─────────────
    // "What has to be traded... three things that cannot all be had at once: Staying power, carrying power, and cost."
    if (inTradePhase > 0.01) {
      A.withA(c, inTradePhase, () => {
        let stayLvl = 0.55;
        let carryLvl = 0.55;
        let costLvl = 0.55;

        if (t < CUE.ch1_stayingPower) {
          const w = (t - CUE.ch1_threeThings) * 1.8;
          stayLvl = 0.55 + 0.32 * Math.sin(w);
          carryLvl = 0.55 + 0.32 * Math.sin(w + (Math.PI * 2) / 3);
          costLvl = 0.55 + 0.32 * Math.sin(w + (Math.PI * 4) / 3);
        } else if (t < CUE.ch1_carryingPower) {
          const p = A.eo(t, CUE.ch1_stayingPower, CUE.ch1_carryingPower);
          stayLvl = A.lerp(0.55, 0.95, p);
          carryLvl = A.lerp(0.55, 0.25, p);
          costLvl = A.lerp(0.55, 0.2, p);
        } else if (t < CUE.ch1_cost) {
          const p = A.eo(t, CUE.ch1_carryingPower, CUE.ch1_cost);
          stayLvl = A.lerp(0.95, 0.35, p);
          carryLvl = A.lerp(0.25, 0.95, p);
          costLvl = A.lerp(0.2, 0.25, p);
        } else {
          const p1 = A.eo(t, CUE.ch1_cost, CUE.ch1_cost + 0.5);
          const p2 = A.eio(t, CUE.ch1_cost + 0.5, CUE.ch1_end);
          stayLvl = A.lerp(A.lerp(0.35, 0.2, p1), 0.96, p2);
          carryLvl = A.lerp(A.lerp(0.95, 0.2, p1), 0.35, p2);
          costLvl = A.lerp(A.lerp(0.25, 0.95, p1), 0.18, p2);
        }

        // Top half (y = -215): Morphing Drone in cutaway/side
        const droneY = -215;
        drawHaleDrone(c, 0, droneY, 2.25, {
          view: 'cutaway',
          cutaway: true,
          wingStretch: 0.5 + 0.6 * stayLvl,
        });

        // Fade out the 3-piston manifold over 46.3..46.95s so at t=47.00s it matches sc04 start seamlessly
        const manifoldFade = 1 - A.sm(t, 46.3, 46.95);
        A.withA(c, manifoldFade, () => {
          // Show underwing ordnance pods scaling with carryLvl
          if (carryLvl > 0.4) {
            const mScale = (carryLvl - 0.35) * 1.35;
            A.rrect(c, -35 * mScale, droneY + 38, 76 * mScale, 18 * mScale, 5, P.amber, P.ink, li);
          }

          // Bottom half: Connected 3-Piston Hydraulic Manifold
          const manifoldY = 360;
          const colH = 260;
          const cols: { x: number; lvl: number; col: string; kind: 'stay' | 'carry' | 'cost'; active: boolean }[] = [
            {
              x: -520,
              lvl: stayLvl,
              col: P.sky,
              kind: 'stay',
              active: t >= CUE.ch1_stayingPower && t < CUE.ch1_carryingPower,
            },
            {
              x: 0,
              lvl: carryLvl,
              col: P.amber,
              kind: 'carry',
              active: t >= CUE.ch1_carryingPower && t < CUE.ch1_cost,
            },
            {
              x: 520,
              lvl: costLvl,
              col: P.oliveLight,
              kind: 'cost',
              active: t >= CUE.ch1_cost,
            },
          ];

          // Shared horizontal pressure pipe connecting all 3 cylinders
          A.rrect(c, -560, manifoldY - 14, 1120, 28, 8, P.slate, P.ink, lo);

          for (const item of cols) {
            const cx = item.x;
            const fillH = colH * item.lvl;
            const topY = manifoldY - 14 - fillH;

            // Cylinder outer glass housing
            A.rrect(c, cx - 70, manifoldY - 14 - colH, 140, colH, 10, P.paper, P.ink, lo);
            // Hydraulic fluid bar
            A.rrect(c, cx - 62, topY, 124, fillH, 6, item.col, P.ink, li);
            // Piston head platform + linkage rod up toward the drone
            A.rrect(c, cx - 78, topY - 16, 156, 18, 6, item.active ? P.amber : P.dark, P.ink, lo);
            A.line(c, [[cx, topY - 16], [cx * 0.35, droneY + 35]], P.ink2, li, [8, 6]);

            // Visual icon on each cylinder (no text needed!)
            const iconY = manifoldY - 14 - colH - 58;
            A.circle(c, cx, iconY, 38, P.paper, item.active ? P.amber : P.ink, lo);
            if (item.kind === 'stay') {
              // Clock icon (Staying power)
              A.circle(c, cx, iconY, 24, P.sky, P.ink, li);
              A.line(c, [[cx, iconY], [cx, iconY - 15]], P.ink, li);
              A.line(c, [[cx, iconY], [cx + 12, iconY + 6]], P.ink, li);
            } else if (item.kind === 'carry') {
              // Heavy missile/payload weight icon (Carrying power)
              A.rrect(c, cx - 20, iconY - 8, 30, 16, 4, P.amber, P.ink, li);
              A.poly(c, [[cx + 10, iconY - 8], [cx + 24, iconY], [cx + 10, iconY + 8]], P.enemy, P.ink, li);
            } else {
              // Multi-unit crate/stack icon (Cost / Affordability)
              for (let k = -1; k <= 1; k++) {
                A.rrect(c, cx + k * 14 - 6, iconY - 14, 12, 28, 3, P.oliveLight, P.ink, li);
              }
            }
          }
        });
      });
    }

    K.end(c);
  }
}
