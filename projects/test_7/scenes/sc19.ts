import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawAirliner,
  drawCallout,
  drawGroundStation,
  drawHaleDrone,
  drawOneWayDrone,
  drawQuadDrone,
  drawSatDish,
  drawSatellite,
  drawSignalLink,
  drawTechnicalBg,
} from './_assets';

// sc19 (418.60–461.584s):
// Phase 1 (418.60–442.76s): Airframe is the cheap part vs expensive ecosystem (link, sensors, operators, software, weekly batch factory).
// Phase 2 (442.76–461.584s): Return to the two opening machines (HALE vs Quadcopter) — turning a vehicle into a tool.
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const inFinale = t >= CUE.ch6_returnTwoMachines;

    K.begin(c, cam);
    drawTechnicalBg(c, cam);

    if (!inFinale) {
      // ── PHASE 1 (418.60 – 442.76s): Airframe Is the Cheap Part vs Industrial Ecosystem & Factory ──
      const airframeP = A.eo(t, CUE.ch6_airframeCheapPart, CUE.ch6_airframeCheapPart + 1.2);
      const sysP = A.eio(t, CUE.ch6_whatCostsMoney - 0.5, CUE.ch6_whatCostsMoney + 2.0);
      const batchP = A.eio(t, CUE.ch6_newBatchNextWeek - 1.5, CUE.ch6_newBatchNextWeek + 1.0);

      // Left Card (-630, -50): The Airframe Shell = Cheap Part (1 single small cost block)
      A.withA(c, airframeP, () => {
        const ax = -630;
        const ay = -50;
        A.rrect(c, ax - 190, ay - 220, 380, 440, 16, P.paper, P.ink, lo);
        // Empty unpainted airframe shells with clean vertical separation
        drawOneWayDrone(c, ax, ay - 95, 1.55, { view: 'top', color: P.bg2, propPhase: 0 });
        drawQuadDrone(c, ax, ay + 65, 1.45, { view: 'side', color: P.bg2, rotorPhase: 0 });
        // Just 1 small cost block at bottom of left card
        A.rrect(c, ax - 18, ay + 155, 36, 36, 5, P.olive, P.ink, lo);
      });

      // Right Ecosystem Area (-180 .. 820): Link, Sensors, Operators & Software (expensive & takes years)
      if (sysP > 0.01) {
        A.withA(c, sysP, () => {
          const topY = -205;

          // Pillar 1 (-120, topY): THE LINK (Satellite + Dish)
          A.rrect(c, -260, topY - 135, 280, 250, 14, P.paper, P.ink, lo);
          drawSatellite(c, -120, topY - 65, 0.9);
          drawSatDish(c, -155, topY + 65, 1.0, { dir: 1 });
          drawSignalLink(c, -135, topY + 20, -120, topY - 40, t, { mode: 'radio' });
          for (let b = 0; b < 4; b++) {
            A.rrect(c, -220 + b * 36, topY + 75, 28, 28, 4, P.amber, P.ink, li);
          }

          // Pillar 2 (200, topY): SENSORS & SOFTWARE PICTURE
          A.rrect(c, 60, topY - 135, 280, 250, 14, P.paper, P.ink, lo);
          // EO/IR sensor turret + software screen analyzing target grid
          A.circle(c, 135, topY - 25, 36, P.dark, P.ink, lo);
          A.circle(c, 145, topY - 25, 16, P.sky, P.ink, li);
          A.rrect(c, 190, topY - 70, 120, 88, 8, P.dark, P.ink, lo);
          A.rrect(c, 198, topY - 62, 104, 72, 4, P.bg, P.ink, li);
          A.rrect(c, 225, topY - 42, 48, 32, 4, null, P.enemy, li);
          for (let b = 0; b < 5; b++) {
            A.rrect(c, 95 + b * 36, topY + 75, 28, 28, 4, P.amber, P.ink, li);
          }

          // Pillar 3 (540, topY): OPERATORS & TRAINING
          A.rrect(c, 380, topY - 135, 340, 250, 14, P.paper, P.ink, lo);
          drawGroundStation(c, 550, topY + 55, 1.05, { cutaway: true, activeLink: true });
          for (let b = 0; b < 6; b++) {
            A.rrect(c, 435 + b * 36, topY + 75, 28, 28, 4, P.amber, P.ink, li);
          }
        });
      }

      // Bottom Right Conveyor Factory (-260 .. 720, y = 235): "a system that can produce a new batch next week"
      if (batchP > 0.01) {
        A.withA(c, batchP, () => {
          const fy = 235;
          A.rrect(c, -260, fy - 135, 980, 230, 16, P.paper, P.ink, lo);

          // Conveyor belt track & rollers
          const beltY = fy + 38;
          A.rrect(c, -210, beltY, 880, 26, 12, P.dark, P.ink, lo);
          for (let rx = -180; rx <= 640; rx += 82) {
            A.circle(c, rx, beltY + 13, 9, P.slate, P.ink, li);
          }

          // Overhead factory assembly gantry arms
          A.line(c, [[-210, fy - 105], [670, fy - 105]], P.slate, lo);
          for (const gx of [-40, 230, 500]) {
            A.rrect(c, gx - 18, fy - 105, 36, 42, 4, P.amber, P.ink, li);
            A.line(c, [[gx, fy - 63], [gx, fy - 28]], P.ink, lo);
          }

          // Moving batches of drones rolling along the conveyor belt
          const shift = ((t * 95) % 220 + 220) % 220;
          for (let i = 0; i < 4; i++) {
            const bx = -160 + i * 220 + shift * 0.85;
            if (bx > 630) continue;
            // Batch crate base + freshly produced drone on top
            A.rrect(c, bx - 48, beltY - 22, 96, 22, 4, P.sand, P.ink, li);
            drawQuadDrone(c, bx, beltY - 44, 1.15, {
              view: 'side',
              fpvWarhead: true,
              rotorPhase: 0.4,
            });
          }
        });
      }

      K.end(c);
    } else {
      // ── PHASE 2 (442.76 – 461.584s): Return to the Two Machines — Vehicle Into a Tool ──
      const retP = A.eo(t, CUE.ch6_returnTwoMachines, CUE.ch6_returnTwoMachines + 1.2);
      const timeP = A.eo(t, CUE.ch6_dayVsQuarterHour - 0.3, CUE.ch6_dayVsQuarterHour + 0.8);
      const costP = A.eo(t, CUE.ch6_fortuneVsWages - 0.3, CUE.ch6_fortuneVsWages + 0.8);
      const toolP = A.eio(t, CUE.ch6_vehicleIntoTool - 0.3, CUE.ch6_decisionWorth + 1.0);

      A.withA(c, retP, () => {
        // Left Machine (-470, -115): Giant HALE Drone (wider than small airliner, stays for a day, costs a fortune)
        const lx = -470;
        const ly = -115;
        A.rrect(c, lx - 360, ly - 240, 720, 410, 18, P.paper, P.ink, lo);

        A.withA(c, 0.32 * retP, () => {
          drawAirliner(c, lx, ly - 10, 1.05, { view: 'top', rot: -Math.PI / 2, ghost: true });
        });
        drawHaleDrone(c, lx, ly - 15, 1.22, { view: 'top', rot: -Math.PI / 2 });

        // Fortune stack of golden blocks on bottom-left of HALE card
        if (costP > 0.01) {
          for (let r = 0; r < 2; r++) {
            for (let col = 0; col < 6; col++) {
              A.rrect(c, lx - 310 + col * 36, ly + 105 + r * 28, 30, 22, 4, P.amber, P.ink, li);
            }
          }
        }

        // Right Machine (470, -110): Small Quadcopter (bag of sugar, box of 10, quarter of an hour, night's wages)
        const rx = 470;
        const ry = -115;
        A.rrect(c, rx - 360, ry - 240, 720, 410, 18, P.paper, P.ink, lo);

        // Open box of 10 quadcopters on right side of card
        A.rrect(c, rx + 20, ry - 115, 280, 180, 10, P.sand, P.ink, lo);
        for (let r = 0; r < 2; r++) {
          for (let col = 0; col < 5; col++) {
            drawQuadDrone(c, rx + 56 + col * 52, ry - 68 + r * 82, 0.42, {
              view: 'top',
              rotorPhase: 0.5,
            });
          }
        }

        // Hero small quadcopter on left of right card
        drawQuadDrone(c, rx - 165, ry - 25, 1.75, { view: 'top', rotorPhase: t * 26 });

        // Single small coin/block ("a night's wages") at bottom of right card
        if (costP > 0.01) {
          A.rrect(c, rx - 180, ry + 115, 30, 24, 4, P.olive, P.ink, li);
        }
      });

      // Bottom Center Synthesis Bar (0, 285):
      // "taking a person out of the aircraft turns it from a vehicle into a tool.
      //  The drone is not a type of aircraft so much as a decision about how much an aircraft is worth."
      if (toolP > 0.01) {
        A.withA(c, toolP, () => {
          const by = 285;
          A.rrect(c, -680, by - 105, 1360, 195, 18, P.paper, P.ink, lo);

          // Left of bar (-430, by): Pilot stepping out of aircraft cockpit ("taking a person out...")
          drawOneWayDrone(c, -470, by + 10, 1.35, { view: 'side', cutaway: true, propPhase: t * 18 });
          // Pilot figure lifted above & separated from the aircraft
          const px = -470;
          const py = by - 58;
          A.circle(c, px, py - 18, 12, P.paper, P.ink, lo);
          A.rrect(c, px - 12, py - 4, 24, 26, 6, P.amber, P.ink, lo);
          A.line(c, [[px + 34, by - 10], [px + 125, by - 10]], P.sky, lo * 1.4);
          A.poly(c, [[px + 120, by - 20], [px + 142, by - 10], [px + 120, by]], P.sky, null, 0);

          // Center-Right of bar (140, by): Precision Balance / Worth Scale ("a decision about how much an aircraft is worth")
          const sx = 160;
          const sy = by + 55;
          // Fulcrum triangle & vertical pillar
          A.poly(c, [[sx - 28, sy], [sx + 28, sy], [sx, sy - 95]], P.slate, P.ink, lo);
          // Balance beam holding the two extremes as tools for different jobs
          const tilt = Math.sin(t * 1.5) * 0.06;
          c.save();
          c.translate(sx, sy - 95);
          c.rotate(tilt);
          A.line(c, [[-240, 0], [240, 0]], P.ink, lo * 1.3);
          // Left pan: HALE tool
          A.line(c, [[-220, 0], [-220, 36]], P.ink2, li);
          A.rrect(c, -285, 36, 130, 10, 4, P.olive, P.ink, li);
          drawHaleDrone(c, -220, 18, 0.48, { view: 'side' });
          // Right pan: Swarm of small quad tools
          A.line(c, [[220, 0], [220, 36]], P.ink2, li);
          A.rrect(c, 155, 36, 130, 10, 4, P.olive, P.ink, li);
          for (const qx of [185, 220, 255]) {
            drawQuadDrone(c, qx, 20, 0.42, { view: 'side', rotorPhase: t * 24 });
          }
          c.restore();
        });
      }

      K.end(c);

      if (timeP > 0.05) {
        drawCallout(c, [490, 240], [490, 165], '> 24 h', timeP, P.sky);
        drawCallout(c, [1265, 240], [1265, 165], '15 min', timeP, P.amber);
      }
    }
  }
}
