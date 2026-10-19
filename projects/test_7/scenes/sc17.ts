import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawAirspaceBg,
  drawExplosion,
  drawFighterJet,
  drawQuadDrone,
  drawSignalLink,
  drawSoldierUnit,
} from './_assets';

// sc17 (374.20–388.82s): "What drones have changed is who gets to look."
// Left ("Before"): High command needed an aircraft & pilot; frontline unit blind behind hill.
// Right ("Now"): Company commander pulls a drone from a backpack, sees over the hill, and calls fire.
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    cam = K.withShake(cam, t, [[CUE.ch6_commanderCallsFire, 15, 0.45]]);

    const groundY = 300;
    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    K.begin(c, cam);
    drawAirspaceBg(c, cam, { groundY, showBands: false });

    const beforeP = A.eo(t, CUE.ch6_start, CUE.ch6_beforeObservation + 1.0);
    const nowP = A.eio(t, CUE.ch6_companyCommanderNow - 0.5, CUE.ch6_companyCommanderNow + 1.2);
    const fireU = A.ph(t, CUE.ch6_commanderCallsFire - 0.8, CUE.ch6_commanderCallsFire);
    const isHit = t >= CUE.ch6_commanderCallsFire;

    // Center vertical divider separating BEFORE (left) and NOW (right)
    A.line(c, [[0, -450], [0, groundY + 120]], P.ink, lo);

    // ── LEFT HALF (-860 .. -30): BEFORE — Only High Command Had Aircraft & Pilot ──
    A.withA(c, beforeP, () => {
      // Top Tier (-450, -310): High-altitude manned reconnaissance aircraft + HQ building
      drawFighterJet(c, -450, -310, 1.35, { view: 'cutaway', cutaway: true });
      // High HQ command pyramid box at (-720, -250)
      A.rrect(c, -800, -310, 140, 90, 8, P.paper, P.ink, lo);
      for (let star = -1; star <= 1; star++) {
        A.circle(c, -730 + star * 28, -280, 7, P.amber, P.ink, li);
      }
      A.line(c, [[-660, -275], [-590, -300]], P.sky, li, [8, 6]);

      // Middle Tier (-730, -60): Slow bureaucratic relay chain blocked by red locks
      A.rrect(c, -790, -100, 120, 70, 8, P.bg2, P.ink2, li);
      A.line(c, [[-730, -220], [-730, -100]], P.slate, li, [8, 8]);
      A.line(c, [[-730, -30], [-730, groundY - 120]], P.slate, li, [8, 8]);
      // Red lock / bottleneck X on the chain down to the frontline
      A.circle(c, -730, 85, 22, P.paper, P.enemy, lo);
      A.line(c, [[-740, 75], [-720, 95]], P.enemy, lo);
      A.line(c, [[-720, 75], [-740, 95]], P.enemy, lo);

      // Terrain hill at (-380, groundY) blocking the frontline unit's view
      A.poly(
        c,
        [
          [-560, groundY],
          [-410, groundY - 165],
          [-340, groundY - 165],
          [-200, groundY],
        ],
        P.bg2,
        P.ink2,
        lo,
      );

      // Frontline unit at (-640, groundY) unable to see enemy behind hill (-140, groundY)
      drawSoldierUnit(c, -640, groundY, 1.65, { view: 'side', role: 'controller', facing: 1 });
      A.line(c, [[-610, groundY - 120], [-445, groundY - 120]], P.enemy, li, [8, 8]);
      // Question mark badge over blind frontline unit
      A.circle(c, -640, groundY - 195, 24, P.paper, P.slate, lo);
      c.save();
      c.font = '800 30px system-ui, -apple-system, sans-serif';
      c.fillStyle = P.slate;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('?', -640, groundY - 193);
      c.restore();

      // Unseen enemy vehicle behind the left hill (-120, groundY)
      A.rrect(c, -170, groundY - 40, 100, 28, 5, P.enemy, P.ink, lo);
      A.circle(c, -145, groundY - 10, 10, P.dark, P.ink, lo);
      A.circle(c, -95, groundY - 10, 10, P.dark, P.ink, lo);
    });

    // ── RIGHT HALF (30 .. 860): NOW — Company Commander Has One in a Backpack ──
    if (nowP > 0.01) {
      A.withA(c, nowP, () => {
        // Bold downward authority transfer arrow ("moved down the ranks") at x = 115
        A.line(c, [[115, -280], [115, 60]], P.sky, lo * 1.6);
        A.poly(c, [[95, 45], [135, 45], [115, 80]], P.sky, P.ink, li);

        // Company commander with backpack at (230, groundY)
        const cmdX = 230;
        drawSoldierUnit(c, cmdX, groundY, 1.75, { view: 'side', role: 'backpack', facing: 1 });

        // Friendly mortar / artillery gun team behind commander at (95, groundY)
        A.rrect(c, 55, groundY - 26, 68, 26, 5, P.oliveDark, P.ink, lo);
        A.line(c, [[95, groundY - 26], [128, groundY - 82]], P.dark, lo * 1.5);

        // Terrain hill at (480, groundY)
        A.poly(
          c,
          [
            [320, groundY],
            [450, groundY - 165],
            [520, groundY - 165],
            [660, groundY],
          ],
          P.bg2,
          P.ink2,
          lo,
        );

        // QuadDrone launched from backpack up to (485, -135) seeing right over the hill!
        const dX = A.lerp(cmdX + 20, 485, nowP);
        const dY = A.lerp(groundY - 110, -135, nowP);

        drawSignalLink(c, cmdX + 58, groundY - 120, dX - 35, dY + 12, t, { mode: 'radio' });

        // Camera cone illuminating enemy target at (745, groundY)
        if (nowP > 0.6) {
          A.withA(c, 0.22, () => {
            A.poly(
              c,
              [
                [dX + 42, dY + 8],
                [665, groundY],
                [835, groundY],
              ],
              P.sky,
              null,
              0,
            );
          });
          A.line(c, [[dX + 42, dY + 8], [745, groundY - 28]], P.enemy, li, [8, 6]);
        }

        drawQuadDrone(c, dX, dY, 1.85, { view: 'side', rotorPhase: t * 26 });

        // Enemy target vehicle at (745, groundY)
        A.rrect(c, 695, groundY - 40, 100, 28, 5, isHit ? P.slate : P.enemy, P.ink, lo);
        A.circle(c, 720, groundY - 10, 10, P.dark, P.ink, lo);
        A.circle(c, 770, groundY - 10, 10, P.dark, P.ink, lo);

        // Artillery fire arc called directly by the company commander ("and with it the decision to fire")
        if (fireU > 0 && fireU < 1) {
          const sx = A.lerp(128, 745, fireU);
          const sy = A.lerp(groundY - 82, groundY - 28, fireU) - Math.sin(fireU * Math.PI) * 320;
          A.line(
            c,
            [
              [128, groundY - 82],
              [435, groundY - 360],
              [sx, sy],
            ],
            P.amber,
            lo,
            [10, 8],
          );
          A.circle(c, sx, sy, 8, P.amber, P.ink, li);
        }

        const expU = A.ph(t, CUE.ch6_commanderCallsFire, CUE.ch6_commanderCallsFire + 1.2);
        if (expU > 0 && expU < 1) {
          drawExplosion(c, 745, groundY - 30, 110, expU);
        }
      });
    }

    K.end(c);
  }
}
