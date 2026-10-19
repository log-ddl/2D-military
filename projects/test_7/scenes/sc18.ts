import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawCallout,
  drawExplosion,
  drawFighterJet,
  drawHaleDrone,
  drawOneWayDrone,
  drawTacticalMapBg,
  drawTechnicalBg,
} from './_assets';

// sc18 (388.82–418.60s):
// Phase 1 (388.82–399.76s): Cutaway removing pilot, cockpit, life support, ejection seat, G-force limit.
// Phase 2 (399.76–403.08s): Top-down high-G tight turn comparison (unmanned vs human limit).
// Phase 3 (403.08–418.60s): Reusable 1,000x drone vs expendable 1x drone.
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const inTurnPhase = t >= CUE.ch6_tighterTurns && t < CUE.ch6_thrownAway;
    const inPhilosPhase = t >= CUE.ch6_thrownAway;

    if (!inTurnPhase && !inPhilosPhase) {
      // ── PHASE 1 (388.82 – 399.76s): Cutaway Removing Cockpit, Life Support, Ejection Seat, G-Limit ──
      K.begin(c, cam);
      drawTechnicalBg(c, cam);

      const extractP = A.eio(t, CUE.ch6_noPilotDesign + 0.8, CUE.ch6_noEjectionSeat + 1.0);
      const cockpitP = A.eo(t, CUE.ch6_noCockpit - 0.4, CUE.ch6_noCockpit + 0.6);
      const lifeP = A.eo(t, CUE.ch6_noLifeSupport - 0.4, CUE.ch6_noLifeSupport + 0.6);
      const seatP = A.eo(t, CUE.ch6_noEjectionSeat - 0.4, CUE.ch6_noEjectionSeat + 0.6);
      const gForceP = A.eo(t, CUE.ch6_noTurningForces - 0.4, CUE.ch6_noTurningForces + 0.8);

      // Large cutaway aircraft in lower center (0, 175) with cockpit module lifting out cleanly below cards
      drawFighterJet(c, 0, 175, 3.0, {
        view: 'cutaway',
        cutaway: true,
        pilotExtractY: -extractP * 56,
      });

      // 4 Breakout Cards Across Top Row (-540, -180, 180, 540 at y = -280) Getting Crossed Out
      const cards: [number, number, (cx: number, cy: number) => void][] = [
        // 1. Cockpit canopy
        [
          -540,
          cockpitP,
          (cx, cy) => {
            c.beginPath();
            c.moveTo(cx - 56, cy + 18);
            c.quadraticCurveTo(cx, cy - 42, cx + 56, cy + 18);
            c.closePath();
            A.fs(c, P.glass, P.ink, lo);
          },
        ],
        // 2. Life support oxygen cylinder
        [
          -180,
          lifeP,
          (cx, cy) => {
            A.rrect(c, cx - 22, cy - 36, 44, 72, 12, P.sky, P.ink, lo);
            A.rrect(c, cx - 10, cy - 48, 20, 12, 3, P.slate, P.ink, li);
          },
        ],
        // 3. Ejection seat
        [
          180,
          seatP,
          (cx, cy) => {
            A.poly(
              c,
              [
                [cx - 24, cy + 34],
                [cx - 14, cy - 38],
                [cx + 4, cy - 38],
                [cx, cy + 16],
                [cx + 30, cy + 16],
                [cx + 30, cy + 34],
              ],
              P.slate,
              P.ink,
              lo,
            );
            A.circle(c, cx - 5, cy - 44, 8, P.amber, P.ink, li);
          },
        ],
        // 4. Human G-Force Limit Gauge (9G blackout limit)
        [
          540,
          gForceP,
          (cx, cy) => {
            A.circle(c, cx, cy, 44, P.bg2, P.ink, lo);
            c.beginPath();
            c.arc(cx, cy, 34, -Math.PI * 0.8, Math.PI * 0.2);
            A.fs(c, null, P.amber, lo);
            A.line(c, [[cx, cy], [cx + 24, cy - 20]], P.enemy, lo);
          },
        ],
      ];

      for (const [cx, p, drawIcon] of cards) {
        if (p <= 0.01) continue;
        A.withA(c, p, () => {
          const cy = -280;
          A.rrect(c, cx - 115, cy - 82, 230, 164, 14, P.paper, P.ink, lo);
          drawIcon(cx, cy);
          // Red elimination slash across card
          A.line(c, [[cx - 85, cy - 58], [cx + 85, cy + 58]], P.enemy, lo * 1.5);
          A.line(c, [[cx + 85, cy - 58], [cx - 85, cy + 58]], P.enemy, lo * 1.5);
        });
      }

      K.end(c);
    } else if (inTurnPhase) {
      // ── PHASE 2 (399.76 – 403.08s): Top-Down High-G Turn Radius Comparison ──
      K.begin(c, cam);
      drawTacticalMapBg(c, cam, { showFrontStrip: false });

      const turnU = A.eio(t, CUE.ch6_tighterTurns, CUE.ch6_thrownAway - 0.2);

      // Left Side: Wide Human-Limited Turn Arc (Manned Fighter Jet: R = 420)
      const fCx = -360;
      const fCy = 320;
      const fR = 430;
      c.beginPath();
      c.arc(fCx, fCy, fR, -Math.PI * 0.85, -Math.PI * 0.18);
      A.fs(c, null, P.slate, lo);
      A.line(c, [[fCx, fCy], [fCx + Math.cos(-Math.PI * 0.5) * fR, fCy + Math.sin(-Math.PI * 0.5) * fR]], P.slate, li, [8, 6]);

      const fAng = A.lerp(-Math.PI * 0.82, -Math.PI * 0.22, turnU);
      const fx = fCx + Math.cos(fAng) * fR;
      const fy = fCy + Math.sin(fAng) * fR;
      drawFighterJet(c, fx, fy, 1.35, { view: 'top', rot: fAng + Math.PI / 2 });

      // Right Side: Razor-Tight Unmanned High-G Turn (Drone: R = 120)
      const dCx = 320;
      const dCy = 20;
      const dR = 125;
      c.beginPath();
      c.arc(dCx, dCy, dR, -Math.PI * 0.95, Math.PI * 0.25);
      A.fs(c, null, P.sky, lo * 1.5);
      A.line(c, [[dCx, dCy], [dCx, dCy - dR]], P.sky, li, [8, 6]);

      const dAng = A.lerp(-Math.PI * 0.9, Math.PI * 0.2, turnU);
      const dx = dCx + Math.cos(dAng) * dR;
      const dy = dCy + Math.sin(dAng) * dR;
      drawOneWayDrone(c, dx, dy, 1.5, { view: 'top', rot: dAng + Math.PI / 2, propPhase: t * 24 });

      K.end(c);
    } else {
      // ── PHASE 3 (403.08 – 418.60s): Return 1,000 Times vs Fly Once ──
      K.begin(c, cam);
      drawTechnicalBg(c, cam);

      const leftP = A.eo(t, CUE.ch6_thrownAway, CUE.ch6_howManyAfforded + 1.0);
      const rightP = A.eo(t, CUE.ch6_thousandVsOnce - 0.5, CUE.ch6_thousandVsOnce + 1.2);
      const groundY = 250;

      // Center vertical divider
      A.line(c, [[0, -440], [0, 440]], P.ink, lo);

      // ── LEFT PANEL (-860 .. -40): Meant to Return 1,000 Times (Reusable HALE) ──
      A.withA(c, leftP, () => {
        A.line(c, [[-860, groundY], [-40, groundY]], P.ink, lo);
        // Home runway strip at (-680, groundY)
        A.rrect(c, -800, groundY - 12, 260, 24, 4, P.slate, P.ink, lo);
        A.line(c, [[-780, groundY], [-560, groundY]], P.paper, li, [18, 14]);

        // Closed oval return loop in the sky above runway
        c.beginPath();
        c.ellipse(-450, -60, 280, 140, 0, 0, Math.PI * 2);
        A.fs(c, null, P.sky, lo);

        // Direction arrows on the oval loop showing outbound AND return home
        A.poly(c, [[-440, -210], [-465, -200], [-440, -190]], P.sky, P.ink, li);
        A.poly(c, [[-460, 70], [-435, 80], [-460, 90]], P.sky, P.ink, li);

        const loopAng = (t - CUE.ch6_thrownAway) * 1.1;
        const hx = -450 + Math.cos(loopAng) * 280;
        const hy = -60 + Math.sin(loopAng) * 140;
        drawHaleDrone(c, hx, hy, 1.35, { view: 'side' });
      });

      // ── RIGHT PANEL (40 .. 860): Meant to Fly Once (Expendable Mass-Afforded) ──
      A.withA(c, Math.max(0.25, rightP), () => {
        A.line(c, [[40, groundY], [860, groundY]], P.ink, lo);

        // Row of 5 affordable launch racks on left of right panel (120..360, groundY)
        for (let r = 0; r < 5; r++) {
          const rx = 110 + r * 58;
          A.line(c, [[rx - 18, groundY], [rx + 18, groundY - 36]], P.slate, lo);
          drawOneWayDrone(c, rx, groundY - 42, 0.58, { view: 'side', rot: -0.35, propPhase: 0.4 });
        }

        // One-way trajectory arrow straight from launch rack to target impact (740, groundY)
        const oneWayU = ((t - CUE.ch6_thousandVsOnce) * 0.45 % 1 + 1) % 1;
        const ox = A.lerp(220, 740, oneWayU);
        const oy = A.lerp(groundY - 90, groundY - 40, oneWayU) - Math.sin(oneWayU * Math.PI) * 220;
        const orot = A.lerp(-0.4, 0.45, oneWayU);

        A.line(
          c,
          [
            [220, groundY - 90],
            [480, -180],
            [740, groundY - 35],
          ],
          P.amber,
          lo,
          [12, 8],
        );

        if (oneWayU < 0.92) {
          drawOneWayDrone(c, ox, oy, 1.35, { view: 'side', rot: orot, propPhase: t * 22 });
        } else {
          drawExplosion(c, 740, groundY - 35, 85, (oneWayU - 0.92) / 0.08);
        }

        // Target structure at (740, groundY)
        A.rrect(c, 690, groundY - 42, 100, 42, 6, P.enemy, P.ink, lo);
      });

      K.end(c);

      if (rightP > 0.05) {
        drawCallout(c, [510, 290], [510, 210], '1,000x', rightP, P.sky);
        drawCallout(c, [1440, 290], [1440, 210], '1x', rightP, P.amber);
      }
    }
  }
}
