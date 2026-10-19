import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawAirspaceBg,
  drawCallout,
  drawQuadDrone,
  drawSatDish,
  drawSatellite,
  drawSignalLink,
  drawSoldierUnit,
} from './_assets';

// sc12 (243.82–281.82s): The invisible radio link (lifeline & leash),
// BLOS satellite 1-second delay (field vs duel), and EW jamming cutting the link.
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    const groundY = 300;

    K.begin(c, cam);
    drawAirspaceBg(c, cam, { groundY, showBands: false });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const inSatPhase = t >= CUE.ch4_blosSatDelay && t < CUE.ch4_weakPoint;
    const inJamPhase = t >= CUE.ch4_weakPoint;

    if (!inSatPhase && !inJamPhase) {
      // ── PHASE 1 (243.82 – 262.64s): Direct Radio Link — Lifeline and Leash ──
      const opX = -560;
      const opY = groundY;
      drawSoldierUnit(c, opX, opY, 1.85, { view: 'side', role: 'controller', facing: 1 });

      // Signal drop test at 260.0 – 262.1s ("and loses it if the signal fails")
      const testFail = t >= CUE.ch4_signalFailsTest && t < CUE.ch4_blosSatDelay - 0.3;
      const failU = testFail ? A.eio(t, CUE.ch4_signalFailsTest, CUE.ch4_signalFailsTest + 1.4) : 0;

      const droneX = 320 + Math.sin(t * 1.6) * 28;
      const droneY = -150 + failU * 165;
      const droneRot = failU * 0.38;

      const antX = opX + 70;
      const antY = opY - 136;
      const rxX = droneX - 42;
      const rxY = droneY - 40;

      // Two-way radio link: Downlink (video) + Uplink (control)
      drawSignalLink(c, antX, antY, rxX, rxY, t, {
        mode: testFail ? 'jammed' : 'radio',
        jamProgress: failU,
      });

      // Second parallel control uplink line when link is healthy
      if (!testFail && t >= CUE.ch4_lifelineLeash) {
        A.line(c, [[antX, antY - 22], [rxX, rxY - 22]], P.amber, li, [8, 8]);
        for (let i = 0; i < 3; i++) {
          const u = ((t * 0.7 + i / 3) % 1 + 1) % 1;
          const px = A.lerp(antX, rxX, u);
          const py = A.lerp(antY - 22, rxY - 22, u);
          A.circle(c, px, py, 5, P.amber, P.ink, li * 0.7);
        }
      }

      // QuadDrone in air with camera cone looking down at target vehicle
      if (!testFail) {
        A.withA(c, 0.18, () => {
          A.poly(
            c,
            [
              [droneX + 55, droneY + 8],
              [droneX + 210, groundY],
              [droneX + 380, groundY],
            ],
            P.sky,
            null,
            0,
          );
        });
      }

      // Target truck on right ground being observed
      const tgtX = 620;
      A.rrect(c, tgtX - 54, groundY - 38, 108, 28, 5, P.enemy, P.ink, lo);
      A.circle(c, tgtX - 30, groundY - 10, 10, P.dark, P.ink, lo);
      A.circle(c, tgtX + 30, groundY - 10, 10, P.dark, P.ink, lo);

      drawQuadDrone(c, droneX, droneY, 2.35, {
        view: 'cutaway',
        cutaway: true,
        rot: droneRot,
        rotorPhase: t * 24,
      });

      // Magnified Operator Monitor Inset (-160, 80) showing what the camera sees (255.0 – 262.64s)
      const monP = A.eo(t, CUE.ch4_cameraSees - 1.5, CUE.ch4_cameraSees);
      if (monP > 0.01) {
        A.withA(c, monP, () => {
          const mx = -165;
          const my = 85;
          const mw = 320;
          const mh = 200;

          // Leader line from operator controller to magnified screen
          A.line(c, [[opX + 52, opY - 98], [mx - mw / 2, my + 20]], P.ink2, li, [6, 5]);
          A.rrect(c, mx - mw / 2, my - mh / 2, mw, mh, 12, P.dark, P.ink, lo);
          A.rrect(c, mx - mw / 2 + 12, my - mh / 2 + 12, mw - 24, mh - 24, 8, testFail ? P.ink : P.bg, P.ink, li);

          if (!testFail) {
            // Live camera feed inside monitor: ground horizon + enemy truck + HUD crosshair
            A.rrect(c, mx - mw / 2 + 14, my + 18, mw - 28, mh / 2 - 30, 4, P.bg2, null, 0);
            A.rrect(c, mx - 36, my + 2, 72, 20, 4, P.enemy, P.ink, li);
            A.circle(c, mx - 18, my + 22, 7, P.dark, P.ink, li);
            A.circle(c, mx + 18, my + 22, 7, P.dark, P.ink, li);
            // Crosshair reticle
            A.circle(c, mx, my + 10, 34, null, P.sky, li);
            A.line(c, [[mx - 46, my + 10], [mx + 46, my + 10]], P.sky, li);
            A.line(c, [[mx, my - 36], [mx, my + 56]], P.sky, li);
          } else {
            // Signal lost red X on dark screen
            A.line(c, [[mx - 55, my - 45], [mx + 55, my + 45]], P.enemy, lo * 1.4);
            A.line(c, [[mx + 55, my - 45], [mx - 55, my + 45]], P.enemy, lo * 1.4);
          }
        });
      }
      K.end(c);
    } else if (inSatPhase) {
      // ── PHASE 2 (262.64 – 270.86s): BLOS Satellite Relay + 1s Delay (Field vs Duel) ──
      const satP = A.eo(t, CUE.ch4_blosSatDelay, CUE.ch4_blosSatDelay + 1.0);
      const cardP = A.eio(t, CUE.ch4_fieldVsDuel - 0.6, CUE.ch4_fieldVsDuel + 0.8);

      // Left ground station + satDish
      const dishX = -620;
      drawSatDish(c, dishX, groundY, 1.35, { dir: 1 });
      drawSoldierUnit(c, -730, groundY, 1.5, { view: 'side', role: 'controller', facing: 1 });

      // Central hill blocking direct line-of-sight
      A.poly(
        c,
        [
          [-220, groundY],
          [-40, groundY - 140],
          [40, groundY - 140],
          [220, groundY],
        ],
        P.bg2,
        P.ink2,
        lo,
      );

      // Satellite high in orbit at (0, -370)
      const satX = 0;
      const satY = -370;
      drawSatellite(c, satX, satY, 1.2);

      // Distant drone on right side at (620, -130)
      const droneX = 620;
      const droneY = -130;
      drawQuadDrone(c, droneX, droneY, 2.0, { view: 'side', rotorPhase: t * 22 });

      // Long relay path: Dish -> Satellite -> Drone
      drawSignalLink(c, dishX + 20, groundY - 65, satX - 18, satY + 28, t * 0.6, { mode: 'radio' });
      drawSignalLink(c, satX + 18, satY + 28, droneX - 35, droneY - 30, t * 0.6, { mode: 'radio' });

      // Stopwatch icon beside satellite showing 1-second latency
      const clkX = 155;
      const clkY = -370;
      A.circle(c, clkX, clkY, 34, P.paper, P.ink, lo);
      const handAng = -Math.PI / 2 + ((t - CUE.ch4_blosSatDelay) % 1) * Math.PI * 2;
      A.line(
        c,
        [
          [clkX, clkY],
          [clkX + Math.cos(handAng) * 24, clkY + Math.sin(handAng) * 24],
        ],
        P.amber,
        lo,
      );

      // Two side-by-side comparison cards: Watching a static field (OK) vs Fighting a duel (Misses due to 1s delay)
      if (cardP > 0.01) {
        A.withA(c, cardP, () => {
          const cardY = 65;
          const cw = 420;
          const ch = 220;

          // Left Card (-250, 65): Static Field Observation -> Checkmark
          const lx = -250;
          A.rrect(c, lx - cw / 2, cardY - ch / 2, cw, ch, 14, P.paper, P.ink, lo);
          // Field grid & static building inside left card
          A.rrect(c, lx - 170, cardY + 15, 340, 65, 6, P.bg2, P.ink2, li);
          A.rrect(c, lx - 35, cardY - 22, 70, 38, 4, P.oliveLight, P.ink, li);
          // Stable camera reticle centered
          A.circle(c, lx, cardY - 3, 42, null, P.sky, lo);
          // Green/Sky check badge
          A.circle(c, lx + 160, cardY - 68, 22, P.sky, P.ink, li);
          A.line(c, [[lx + 150, cardY - 68], [lx + 158, cardY - 58], [lx + 172, cardY - 78]], P.paper, lo);

          // Right Card (250, 65): Moving Duel -> 1s Delay Miss!
          const rx = 250;
          A.rrect(c, rx - cw / 2, cardY - ch / 2, cw, ch, 14, P.paper, P.ink, lo);
          A.rrect(c, rx - 170, cardY + 15, 340, 65, 6, P.bg2, P.ink2, li);

          // Ghost vehicle where it was 1 second ago (left) vs actual fast-moving vehicle now (right)
          A.withA(c, 0.35 * cardP, () => {
            A.rrect(c, rx - 115, cardY - 12, 68, 26, 4, P.slate, P.ink2, li);
          });
          // Delayed reticle aims at the old ghost position (-80)
          A.circle(c, rx - 80, cardY, 38, null, P.amber, lo);
          A.line(c, [[rx - 100, cardY], [rx - 60, cardY]], P.amber, li);

          // Actual enemy vehicle has already moved +150px right!
          const moveX = rx + 65 + Math.sin(t * 4) * 20;
          A.rrect(c, moveX - 34, cardY - 12, 68, 26, 4, P.enemy, P.ink, li);
          A.line(c, [[rx - 40, cardY], [moveX - 42, cardY]], P.enemy, li, [6, 5]);

          // Red X badge
          A.circle(c, rx + 160, cardY - 68, 22, P.enemy, P.ink, li);
          A.line(c, [[rx + 151, cardY - 77], [rx + 169, cardY - 59]], P.paper, lo);
          A.line(c, [[rx + 169, cardY - 77], [rx + 151, cardY - 59]], P.paper, lo);
        });
      }

      K.end(c);
      drawCallout(c, [1115, 170], [1250, 170], '1 s', satP, P.amber);
    } else {
      // ── PHASE 3 (270.86 – 281.82s): Jamming — The Weak Point ("drops out or flies on its own") ──
      const opX = -620;
      drawSoldierUnit(c, opX, groundY, 1.75, { view: 'side', role: 'controller', facing: 1 });

      // Enemy EW Jammer team on the right (560, groundY)
      const jamX = 560;
      drawSoldierUnit(c, jamX, groundY, 1.85, {
        view: 'side',
        role: 'jammer',
        enemy: true,
        facing: -1,
        aimAngle: -0.52,
      });

      // EW vehicle / high-power jammer mast behind enemy soldier
      A.rrect(c, 650, groundY - 75, 130, 55, 6, P.enemy, P.ink, lo);
      A.circle(c, 680, groundY - 14, 14, P.dark, P.ink, lo);
      A.circle(c, 750, groundY - 14, 14, P.dark, P.ink, lo);
      A.line(c, [[715, groundY - 75], [715, groundY - 165]], P.ink, lo);
      A.poly(c, [[695, groundY - 165], [735, groundY - 185], [735, groundY - 145]], P.amber, P.ink, lo);

      const jamU = A.eio(t, CUE.ch4_jammersPushNoise, CUE.ch4_jammersPushNoise + 2.2);
      const afterJamU = A.ph(t, CUE.ch4_jammersPushNoise + 0.6, 281.3);

      // Drone 1: "drops out" (falls straight down to ground when jammed)
      const d1X = -60;
      const d1Y = A.lerp(-120, groundY - 26, A.eio(t, CUE.ch4_jammersPushNoise + 0.6, 280.5));
      const d1Rot = afterJamU * 0.65;

      // Drone 2: "or flies on its own" (drifts blindly upward/right off-course)
      const d2X = A.lerp(120, 420, afterJamU);
      const d2Y = A.lerp(-230, -340, afterJamU) + Math.sin(t * 6) * 14 * jamU;
      const d2Rot = -0.18 * afterJamU;

      // Radio links from operator to the 2 drones (severed when jamU > 0.2)
      drawSignalLink(c, opX + 66, groundY - 130, d1X - 30, -120, t, {
        mode: jamU > 0.15 ? 'jammed' : 'radio',
        jamProgress: jamU,
      });
      drawSignalLink(c, opX + 66, groundY - 130, 120 - 30, -230, t, {
        mode: jamU > 0.15 ? 'jammed' : 'radio',
        jamProgress: jamU,
      });

      // Jagged red EW jamming waves radiating from enemy jammer into the sky
      if (jamU > 0.01) {
        A.withA(c, jamU, () => {
          for (let w = 0; w < 4; w++) {
            const r = 90 + w * 125 + ((t * 140) % 125);
            c.beginPath();
            c.arc(jamX - 45, groundY - 110, r, Math.PI * 1.05, Math.PI * 1.48);
            A.fs(c, null, P.enemy, lo);
          }
        });
      }

      drawQuadDrone(c, d1X, d1Y, 2.0, {
        view: 'side',
        rot: d1Rot,
        rotorPhase: afterJamU > 0.8 ? 0.4 : t * 20,
      });
      drawQuadDrone(c, d2X, d2Y, 1.9, {
        view: 'side',
        rot: d2Rot,
        rotorPhase: t * 24,
      });

      // Blind drift indicator ("?") above Drone 2 when link is severed
      if (afterJamU > 0.1) {
        A.circle(c, d2X, d2Y - 68, 22, P.paper, P.enemy, lo);
        A.line(c, [[d2X - 10, d2Y - 68], [d2X + 10, d2Y - 68]], P.enemy, lo);
      }
      K.end(c);
    }
  }
}
