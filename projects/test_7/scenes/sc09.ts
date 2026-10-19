import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { worldAt } from './_state';
import {
  drawTechnicalBg,
  drawQuadDrone,
  drawHaleDrone,
  drawCallout,
} from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = worldAt(t);
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };

    K.begin(c, cam);
    drawTechnicalBg(c, cam, { showFloor: false, gridStep: 120 });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const pHover = A.sm(t, CUE.ch3_hoversBurns - 0.4, CUE.ch3_hoversBurns + 0.5);
    const pGlide = A.sm(t, CUE.ch3_fixedWingGlides - 0.4, CUE.ch3_fixedWingGlides + 0.6);

    // ── PHASE 1 (157.00 – 166.80s): 1 KG BATTERY vs 1 KG FUEL ENERGY DENSITY ──
    if (pHover < 0.99) {
      A.withA(c, 1 - pHover, () => {
        const compareP = A.eo(t, CUE.ch3_kgBatteryFuel - 0.8, CUE.ch3_kgBatteryFuel + 1.4);
        const fuelShowP = A.sm(t, 157.0, 159.5);

        // Left (-360): Small Quadcopter + 1 kg Battery Pack + tiny energy column
        const lx = -360;
        const baseY = 270;
        drawQuadDrone(c, lx - 230, baseY - 55, 1.35, {
          view: 'cutaway',
          cutaway: true,
          rotorPhase: st.rotorPhase,
          batteryLevel: 0.25,
        });
        // 1kg Battery casing
        A.rrect(c, lx - 110, baseY - 110, 220, 110, 14, P.paper, P.ink, lo);
        A.rrect(c, lx + 110, baseY - 75, 18, 40, 4, P.slate, P.ink, lo);
        A.rrect(c, lx - 92, baseY - 92, 64, 74, 6, P.amber, P.ink, li);
        // Energy output meter above battery (small fraction!)
        const meterH = 380;
        A.rrect(c, lx - 55, baseY - 140 - meterH, 110, meterH, 10, P.bg2, P.ink, lo);
        const batEnergyH = Math.max(18, 52 * compareP);
        A.rrect(c, lx - 47, baseY - 140 - batEnergyH, 94, batEnergyH, 6, P.amber, P.ink, li);

        // Right (+360): 1 kg Aviation Fuel Canister + towering energy column!
        const rx = 360;
        A.withA(c, 0.35 + 0.65 * fuelShowP, () => {
          drawHaleDrone(c, rx + 250, baseY - 60, 1.05, { view: 'cutaway', cutaway: true });
          // 1kg Fuel jerrycan
          A.rrect(c, rx - 95, baseY - 125, 190, 125, 14, P.olive, P.ink, lo);
          A.rrect(c, rx - 35, baseY - 145, 70, 20, 5, P.slate, P.ink, li);
          A.circle(c, rx, baseY - 62, 32, P.amber, P.ink, li);
          // Energy output meter above fuel (10x taller!)
          A.rrect(c, rx - 55, baseY - 140 - meterH, 110, meterH, 10, P.bg2, P.ink, lo);
          const fuelEnergyH = Math.max(24, (meterH - 12) * compareP);
          A.rrect(c, rx - 47, baseY - 140 - fuelEnergyH, 94, fuelEnergyH, 6, P.amber, P.ink, li);
        });
      });
    }

    // ── PHASE 2 (166.80 – 176.92s): HOVER BURNS POWER + EVERY GRAM COSTS MINUTES ──
    if (pHover > 0.01 && pGlide < 0.99) {
      A.withA(c, pHover * (1 - pGlide), () => {
        const gramP = A.ph(t, CUE.ch3_everyGram, 176.5);
        // Battery drains continuously while hovering, and drops faster as extra payload grams attach!
        const batLvl = A.clamp01(0.92 - A.ph(t, CUE.ch3_hoversBurns, 176.5) * 0.65);

        const qx = -120;
        const qy = -30 + Math.sin(t * 6) * 5;

        // Downward gravity arrow vs Continuous rotor downward thrust vectors
        A.line(c, [[qx, qy + 65], [qx, qy + 185]], P.enemy, lo);
        A.poly(c, [[qx - 12, qy + 175], [qx + 12, qy + 175], [qx, qy + 198]], P.enemy, null, 0);

        drawQuadDrone(c, qx, qy, 2.75, {
          view: 'cutaway',
          cutaway: true,
          rotorPhase: st.rotorPhase,
          batteryLevel: batLvl,
          showLiftVectors: true,
          fpvWarhead: gramP > 0.55,
        });

        // "Every gram of camera, radio, and warhead is paid for in minutes of flight" (172.90–176.92s)
        // Show 3 weight blocks dropping onto the frame while the Flight Minutes Bar on the right drops in steps!
        const meterX = 440;
        const meterY = 220;
        const maxH = 380;
        const minLeft = A.lerp(0.88, 0.28, gramP);
        const curH = maxH * minLeft;

        // Flight-minutes clock pillar on the right
        A.rrect(c, meterX - 65, meterY - maxH, 130, maxH, 12, P.paper, P.ink, lo);
        A.rrect(c, meterX - 55, meterY - curH, 110, curH, 8, P.sky, P.ink, li);
        // Clock icon above pillar
        A.circle(c, meterX, meterY - maxH - 52, 34, P.paper, P.ink, lo);
        A.line(c, [[meterX, meterY - maxH - 52], [meterX, meterY - maxH - 72]], P.ink, li);
        A.line(c, [[meterX, meterY - maxH - 52], [meterX + 16, meterY - maxH - 52]], P.ink, li);

        if (gramP > 0.02) {
          // 1. Camera weight badge
          A.rrect(c, qx + 115, qy - 95, 58, 42, 6, P.sky, P.ink, lo);
          // 2. Radio weight badge
          if (gramP > 0.28) {
            A.rrect(c, qx - 165, qy - 95, 58, 42, 6, P.slate, P.ink, lo);
          }
          // 3. Warhead weight badge
          if (gramP > 0.55) {
            A.rrect(c, qx - 30, qy - 125, 76, 44, 6, P.amber, P.ink, lo);
          }
          // Balance lever linking drone weight down -> flight minutes down
          A.line(c, [[qx + 160, qy + 40], [meterX - 70, meterY - curH]], P.amber, lo, [10, 8]);
        }
      });
    }

    // ── PHASE 3 (176.92 – 186.00s): HOVER (ROTORS HOLD IT UP) vs FIXED-WING GLIDER (WINGS DO THE WORK) ──
    if (pGlide > 0.01) {
      A.withA(c, pGlide, () => {
        // Center divider
        A.line(c, [[0, -420], [0, 420]], P.ink2, li, [12, 10]);

        // LEFT (-460): Hovering Quadcopter rapidly draining battery
        const drain = A.clamp01(0.85 - A.ph(t, CUE.ch3_fixedWingGlides, 185.5) * 0.7);
        drawQuadDrone(c, -460, -40, 2.2, {
          view: 'cutaway',
          cutaway: true,
          rotorPhase: st.rotorPhase,
          batteryLevel: drain,
          showLiftVectors: true,
        });
        // Small battery bar below Left
        A.rrect(c, -610, 210, 300, 36, 8, P.paper, P.ink, lo);
        A.rrect(c, -604, 216, 288 * drain, 24, 5, P.amber, null, 0);

        // RIGHT (+450): Fixed-Wing Glider Drone gliding effortlessly on wing lift & sipping fuel
        drawHaleDrone(c, 450, -140, 1.45, { view: 'front', wingStretch: 1.05 });
        drawHaleDrone(c, 450, 30, 1.75, { view: 'cutaway', cutaway: true });
        // Upward wing lift arrows under front glider wings
        for (const wx of [180, 310, 590, 720]) {
          A.line(c, [[wx, -85], [wx, -125]], P.sky, lo);
          A.poly(c, [[wx - 8, -120], [wx + 8, -120], [wx, -134]], P.sky, null, 0);
        }
        // Almost-full endurance bar below Right (stays full for a day!)
        A.rrect(c, 300, 210, 300, 36, 8, P.paper, P.ink, lo);
        A.rrect(c, 306, 216, 275, 24, 5, P.sky, null, 0);
      });
    }

    K.end(c);

    // Minimal Callout for spoken "20 minutes" at start of scene
    const call20Alpha = A.win(t, 157.3, 161.2, 0.3, 0.3);
    if (call20Alpha > 0) {
      const sPt = K.toScreen(cam, -590, 195);
      drawCallout(c, sPt, [sPt[0], sPt[1] - 110], '20 min', call20Alpha, P.amber);
    }
  }
}
