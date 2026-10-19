import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawAirspaceBg,
  drawHaleDrone,
  drawGroundStation,
  drawSatDish,
  drawSatellite,
  drawSoldierUnit,
  drawSignalLink,
  drawExplosion,
} from './_assets';

const baseCam: K.Cam = { x: -120, y: 20, z: 1.08 };
const wideSysCam: K.Cam = { x: 0, y: -15, z: 1.02 };

const camKeys: [number, K.Cam][] = [
  [108.0, baseCam],
  [116.5, baseCam],
  [118.2, wideSysCam],
  [132.0, wideSysCam],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam = K.track(t, camKeys, A.eio);
    cam = K.withShake(cam, t, [[CUE.ch2_droneFallsSafe, 14, 0.5]]);

    K.begin(c, cam);
    const gy = 250;
    drawAirspaceBg(c, cam, { groundY: gy, showBands: true });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // ── 1. AIRBASE GROUND INFRASTRUCTURE (108.00 – 132.00s) ────────────
    // Left (-640): Runway strip + Maintenance team
    A.rrect(c, -880, gy - 12, 430, 24, 4, P.slate, P.ink, lo);
    A.line(c, [[-850, gy], [-480, gy]], P.paper, li, [18, 14]);

    const maintAlpha = A.sm(t, CUE.ch2_runwayCrew, CUE.ch2_runwayCrew + 0.9);
    if (maintAlpha > 0) {
      A.withA(c, maintAlpha, () => {
        drawSoldierUnit(c, -770, gy, 1.35, { role: 'controller', facing: 1 });
        drawSoldierUnit(c, -660, gy, 1.35, { role: 'backpack', facing: 1 });
        drawSoldierUnit(c, -550, gy, 1.35, { role: 'controller', facing: -1 });
      });
    }

    // Center (-160): Ground Control Container (Cutaway with pilot + sensor operator + shift relief crew)
    const gcsAlpha = A.sm(t, CUE.ch2_runwayCrew + 0.6, CUE.ch2_runwayCrew + 1.5);
    const gcsX = -160;
    if (gcsAlpha > 0) {
      A.withA(c, gcsAlpha, () => {
        drawGroundStation(c, gcsX, gy, 1.75, {
          cutaway: true,
          activeLink: true,
        });
        // Relief shift crew standing right outside container waiting to rotate
        const shiftAlpha = A.sm(t, CUE.ch2_shiftsContainer, CUE.ch2_shiftsContainer + 1.0);
        A.withA(c, shiftAlpha, () => {
          drawSoldierUnit(c, gcsX + 265, gy, 1.35, { role: 'controller', facing: -1 });
          drawSoldierUnit(c, gcsX + 345, gy, 1.35, { role: 'controller', facing: -1 });
        });
      });
    }

    // Right (+340) & Upper Sky: Satellite Dish & Orbital Satellite across continents
    const satAlpha = A.sm(t, CUE.ch2_satContinent - 0.5, CUE.ch2_satContinent + 0.8);
    const dishX = 330;
    const satX = 140;
    const satY = -280;
    const droneX = 560;
    const isFalling = t >= CUE.ch2_droneFallsSafe;
    const fallP = A.ph(t, CUE.ch2_droneFallsSafe, 131.6);
    const droneY = -195 + (isFalling ? fallP * fallP * 380 : 0);

    if (satAlpha > 0) {
      A.withA(c, satAlpha, () => {
        drawSatDish(c, dishX, gy, 1.7, { dir: 1 });
        drawSatellite(c, satX, satY, 1.45);
        // Up-link & Down-link beams
        drawSignalLink(c, gcsX + 122, gy - 250, dishX, gy - 75, t, { mode: 'radio' });
        drawSignalLink(c, dishX, gy - 82, satX - 18, satY + 32, t, { mode: 'radio' });
        if (!isFalling) {
          drawSignalLink(c, satX + 24, satY + 32, droneX - 60, droneY, t, { mode: 'radio' });
        }
      });
    }

    // Large Drone on the right sky (empty cockpit cutaway!)
    drawHaleDrone(c, droneX, droneY, 1.8, {
      view: 'cutaway',
      cutaway: true,
      rot: isFalling ? fallP * 0.55 : 0,
    });

    // ── 2. DOZENS OF SUPPORT PERSONNEL ROSTER (120.40 – 123.46s) ───────
    const rosterAlpha = A.win(t, CUE.ch2_dozensPeople, CUE.ch2_movedToContainer + 0.6, 0.4, 0.5);
    if (rosterAlpha > 0) {
      A.withA(c, rosterAlpha, () => {
        A.rrect(c, -800, -340, 580, 220, 12, P.paper, P.ink, lo);
        for (let r = 0; r < 2; r++) {
          for (let col = 0; col < 10; col++) {
            const px = -745 + col * 52;
            const py = -272 + r * 86;
            A.circle(c, px, py - 18, 10, P.skin, P.ink, li);
            A.rrect(c, px - 12, py - 5, 24, 30, 5, P.olive, P.ink, li);
          }
        }
        A.line(c, [[-220, -230], [droneX - 200, droneY]], P.sky, lo, [10, 8]);
      });
    }

    // ── 3. PILOT MOVED FROM COCKPIT TO CONTAINER & SAFE WHEN SHOT DOWN (123.46 – 132.00s) ──
    const moveP = A.eio(t, CUE.ch2_movedToContainer, CUE.ch2_movedToContainer + 2.2);
    if (moveP > 0) {
      const px = A.lerp(droneX + 65, gcsX - 65, moveP);
      const py = A.lerp(droneY - 15, gy - 95, moveP) - Math.sin(moveP * Math.PI) * 140;

      c.beginPath();
      c.moveTo(droneX + 65, droneY - 15);
      c.quadraticCurveTo(180, -320, gcsX - 65, gy - 140);
      c.setLineDash([12, 8]);
      A.fs(c, null, P.amber, lo);
      c.setLineDash([]);

      if (moveP < 0.98) {
        A.circle(c, px, py, 28, P.paper, P.amber, lo);
        A.circle(c, px, py - 7, 9, P.skin, P.ink, li);
        A.rrect(c, px - 11, py + 4, 22, 16, 4, P.oliveDark, P.ink, li);
      } else {
        // Protective shield glow around the container crew while drone explodes on the right!
        A.rrect(c, gcsX - 225, gy - 185, 450, 190, 14, null, P.sky, lo * 1.4);
      }
    }

    // Explosion when unmanned drone is hit at 128.5s (nobody on board is at risk!)
    const expP = A.ph(t, CUE.ch2_droneFallsSafe, CUE.ch2_droneFallsSafe + 1.4);
    drawExplosion(c, droneX, -195, 135, expP);

    K.end(c);
  }
}
