import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawAirspaceBg,
  drawMaleDrone,
  drawFighterJet,
  drawSamSystem,
  drawMissile,
  drawExplosion,
} from './_assets';

const closeMaleCam: K.Cam = { x: -160, y: -130, z: 1.58 };
const battleCam: K.Cam = { x: 40, y: 10, z: 0.96 };

const camKeys: [number, K.Cam][] = [
  [83.3, closeMaleCam],
  [88.4, closeMaleCam],
  [89.8, battleCam],
  [108.0, battleCam],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam = K.track(t, camKeys, A.eio);
    cam = K.withShake(cam, t, [[CUE.ch2_samHitsMale, 16, 0.55]]);

    K.begin(c, cam);
    drawAirspaceBg(c, cam, { groundY: 320, showBands: false });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const hitP = A.ph(t, CUE.ch2_samHitsMale, 107.6);
    const isHit = t >= CUE.ch2_samHitsMale;

    // Lead MALE drone position (drops when hit at 104.2s)
    const m1x = A.lerp(-180, 40, A.ph(t, 83.3, CUE.ch2_samHitsMale)) + (isHit ? hitP * 110 : 0);
    const m1y = -135 + (isHit ? hitP * hitP * 380 : 0);
    const m1rot = isHit ? hitP * 0.65 : 0;

    // Camera scan cone from lead MALE before hit
    if (!isHit) {
      A.withA(c, 0.18, () => {
        A.poly(c, [[m1x + 68, m1y + 28], [m1x - 140, 320], [m1x + 360, 320]], P.sky, null, 0);
      });
      A.line(c, [[m1x + 68, m1y + 28], [m1x - 140, 320]], P.sky, li, [8, 6]);
      A.line(c, [[m1x + 68, m1y + 28], [m1x + 360, 320]], P.sky, li, [8, 6]);
    }

    // Highlight rings on camera & underwing missiles during close-up (83.46–88.74s)
    const equipAlpha = A.win(t, CUE.ch2_mediumDrones, 88.6, 0.35, 0.35);
    if (equipAlpha > 0) {
      A.withA(c, equipAlpha, () => {
        // Camera turret highlight
        A.circle(c, m1x + 76, m1y + 29, 26, null, P.sky, lo);
        // Missiles highlight
        A.rrect(c, m1x - 52, m1y + 32, 104, 48, 8, null, P.amber, lo);
      });
    }

    // Acoustic noise rings ("slow and loud, and cannot pretend to be hard to hit" 98.74–104.2s)
    const loudAlpha = A.win(t, CUE.ch2_slowAndLoud, CUE.ch2_samHitsMale, 0.4, 0.2);
    if (loudAlpha > 0) {
      A.withA(c, loudAlpha, () => {
        for (let i = 0; i < 3; i++) {
          const u = ((t * 1.2 + i / 3) % 1 + 1) % 1;
          const r = 35 + u * 150;
          A.withA(c, 1 - u, () => {
            A.circle(c, m1x - 125, m1y, r, null, P.amber, li);
          });
        }
      });
    }

    // Draw Lead MALE Drone
    drawMaleDrone(c, m1x, m1y, 1.8, {
      view: 'side',
      rot: m1rot,
      missiles: 2,
      propPhase: t * 24,
      damaged: isHit,
    });

    // Second MALE drone in background formation (89.0..108.0s)
    const wideAlpha = A.sm(t, 88.8, 90.0);
    if (wideAlpha > 0) {
      A.withA(c, wideAlpha, () => {
        drawMaleDrone(c, -460 + (t - 89) * 10, -210, 1.25, {
          view: 'side',
          missiles: 2,
          propPhase: t * 24 + 1.5,
        });

        // Cost comparison card in upper-left sky ("cost a fraction of a fighter" 88.9–96.5s)
        const costCardAlpha = A.win(t, CUE.ch2_fractionFighter, 96.8, 0.4, 0.5);
        if (costCardAlpha > 0) {
          A.withA(c, costCardAlpha, () => {
            const cx = -560;
            const cy = 65;
            A.rrect(c, cx - 220, cy - 115, 440, 220, 14, P.paper, P.ink, lo);
            // Top row: Fighter Jet + 6 gold bars
            drawFighterJet(c, cx - 105, cy - 52, 0.72, { view: 'side' });
            for (let k = 0; k < 6; k++) {
              A.rrect(c, cx + 10 + k * 30, cy - 68, 24, 34, 4, P.amber, P.ink, li);
            }
            // Bottom row: MALE Drone + 1 bar
            drawMaleDrone(c, cx - 105, cy + 42, 0.78, { view: 'side', missiles: 1 });
            A.rrect(c, cx + 10, cy + 25, 24, 34, 4, P.oliveLight, P.ink, li);
          });
        }

        // Enemy SAM System on ground right (x = 560, y = 320)
        const fired = t >= CUE.ch2_samFires;
        drawSamSystem(c, 560, 320, 1.55, {
          view: 'side',
          missiles: fired ? 1 : 2,
          elevateDeg: -135,
        });

        // SAM Missile streak from (540, 230) to (m1x, m1y) during [102.8, 104.2]
        if (t >= CUE.ch2_samFires && t <= CUE.ch2_samHitsMale) {
          const mp = A.ei(t, CUE.ch2_samFires, CUE.ch2_samHitsMale);
          const sx = 540;
          const sy = 230;
          const mx = A.lerp(sx, m1x, mp);
          const my = A.lerp(sy, m1y, mp);
          const ang = Math.atan2(m1y - sy, m1x - sx);
          A.line(c, [[sx, sy], [mx, my]], P.light, lo, [10, 6]);
          drawMissile(c, mx, my, ang, 1.35);
        }

        // Explosion at impact (104.2..105.6s)
        const expP = A.ph(t, CUE.ch2_samHitsMale, CUE.ch2_samHitsMale + 1.3);
        drawExplosion(c, 40, -135, 130, expP);
      });
    }

    K.end(c);
  }
}
