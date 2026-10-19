import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawQuadDrone,
  drawSignalLink,
  drawSoldierUnit,
  drawTacticalMapBg,
} from './_assets';

// sc14 (303.40–327.60s): Top-down frontline map — operators stay within a few km of the front,
// crowded & noisy spectrum where both sides jam, and the drone whose link survives longest wins.
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };

    K.begin(c, cam);
    drawTacticalMapBg(c, cam, { showFrontStrip: true });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const introP = A.eo(t, CUE.ch5_start, CUE.ch5_stayFewKm + 0.8);
    const stripP = A.eio(t, CUE.ch5_narrowStrip - 1.0, CUE.ch5_narrowStrip + 1.5);
    const crowdP = A.eio(t, CUE.ch5_crowdedSpectrum - 0.5, CUE.ch5_crowdedSpectrum + 1.2);
    const winP = A.eio(t, CUE.ch5_linkSurvivesLongest, CUE.ch5_cheapnessCuts - 0.4);

    // Friendly operators hugging the left side of the front strip (x = -380)
    const allyOps: [number, number][] = [
      [-380, -230],
      [-360, 0],
      [-380, 230],
    ];
    // Enemy operators + jammers hugging the right side of the front strip (x = 380)
    const enemyOps: [number, number, 'controller' | 'jammer'][] = [
      [380, -230, 'jammer'],
      [360, 0, 'controller'],
      [380, 230, 'jammer'],
    ];

    // Short range radius arcs ("stay within a few kilometers to keep a clean link")
    A.withA(c, 0.35 * introP, () => {
      for (const [ox, oy] of allyOps) {
        A.circle(c, ox, oy, 280, null, P.sky, li);
      }
      // Distance bracket showing short distance to frontline at top-left (-380..0, -380)
      A.line(c, [[-380, -370], [0, -370]], P.ink, lo);
      A.line(c, [[-380, -384], [-380, -356]], P.ink, lo);
      A.line(c, [[0, -384], [0, -356]], P.ink, lo);
    });

    for (const [ox, oy] of allyOps) {
      drawSoldierUnit(c, ox, oy, 1.4, { view: 'top', role: 'controller', facing: 1 });
    }
    for (const [ex, ey, role] of enemyOps) {
      drawSoldierUnit(c, ex, ey, 1.4, { view: 'top', role, enemy: true, facing: -1 });
    }

    //Enemy target vehicle behind right frontline (560, 0)
    A.rrect(c, 510, -28, 96, 56, 8, P.enemy, P.ink, lo);
    A.rrect(c, 530, -18, 56, 36, 4, P.enemyLight, P.ink, li);

    // Overlapping jamming waves from BOTH sides filling the narrow frontline strip (-260..260)
    if (stripP > 0.01) {
      A.withA(c, stripP * 0.75, () => {
        for (let w = 0; w < 3; w++) {
          const r = 70 + w * 95 + ((t * 110) % 95);
          // Enemy jammer arcs from right
          c.beginPath();
          c.arc(380, -230, r, Math.PI * 0.65, Math.PI * 1.25);
          A.fs(c, null, P.enemy, lo);
          c.beginPath();
          c.arc(380, 230, r, Math.PI * 0.75, Math.PI * 1.35);
          A.fs(c, null, P.enemy, lo);
          // Friendly jammer arcs from left
          c.beginPath();
          c.arc(-380, -230, r, -Math.PI * 0.25, Math.PI * 0.35);
          A.fs(c, null, P.amber, lo);
          c.beginPath();
          c.arc(-380, 230, r, -Math.PI * 0.35, Math.PI * 0.25);
          A.fs(c, null, P.amber, lo);
        }
      });
    }

    // Multiple drones from both sides flying into the crowded center strip
    if (stripP > 0.01) {
      // Top friendly drone (-380, -230) -> gets jammed after 321s
      const d1Jammed = t >= CUE.ch5_linkSurvivesLongest - 0.5;
      const d1X = A.lerp(-310, -40, stripP);
      const d1Y = -210 + (d1Jammed ? Math.sin(t * 12) * 28 : 0);
      drawSignalLink(c, -350, -230, d1X, d1Y, t, {
        mode: d1Jammed ? 'jammed' : 'radio',
        jamProgress: d1Jammed ? 1 : 0,
      });
      drawQuadDrone(c, d1X, d1Y, 1.15, {
        view: 'top',
        rot: d1Jammed ? t * 4 : 0.1,
        rotorPhase: t * 24,
      });

      // Bottom friendly drone (-380, 230) -> gets jammed after 321.5s
      const d3Jammed = t >= CUE.ch5_linkSurvivesLongest;
      const d3X = A.lerp(-310, 30, stripP);
      const d3Y = 210 + (d3Jammed ? Math.cos(t * 10) * 28 : 0);
      drawSignalLink(c, -350, 230, d3X, d3Y, t, {
        mode: d3Jammed ? 'jammed' : 'radio',
        jamProgress: d3Jammed ? 1 : 0,
      });
      drawQuadDrone(c, d3X, d3Y, 1.15, {
        view: 'top',
        rot: d3Jammed ? -t * 3.5 : -0.1,
        rotorPhase: t * 24,
      });

      // Enemy drones flying right-to-left -> also jammed in the center strip
      const e1X = A.lerp(310, 80, stripP);
      const e1Y = -110;
      drawSignalLink(c, 330, 0, e1X, e1Y, t, {
        mode: d1Jammed ? 'jammed' : 'radio',
        jamProgress: d1Jammed ? 1 : 0,
      });
      drawQuadDrone(c, e1X, e1Y, 1.1, {
        view: 'top',
        color: P.enemy,
        rot: Math.PI + (d1Jammed ? Math.sin(t * 8) * 0.8 : 0),
        rotorPhase: t * 24,
      });

      // CENTER HERO DRONE: "The drone that wins there is not the cleverest, it is the one whose link survives the longest"
      const heroX = A.lerp(-290, A.lerp(40, 480, winP), stripP);
      const heroY = 0;

      // Reinforced resilient link (shielded sky channel)
      if (winP > 0.01) {
        A.withA(c, 0.28 * winP, () => {
          A.capsule(c, [-330, 0], [heroX, heroY], 22, P.sky, P.ink, li);
        });
      }
      drawSignalLink(c, -330, 0, heroX - 35, heroY, t * 1.4, { mode: 'fiber' });
      drawQuadDrone(c, heroX, heroY, 1.45, {
        view: 'top',
        fpvWarhead: true,
        rotorPhase: t * 28,
      });
      if (winP > 0.05) {
        A.circle(c, heroX, heroY, 54, null, P.sky, lo);
      }
    }

    // Crowded Radio Spectrum Bar at bottom (-460..460, 395) ("fighting for the same slice of the spectrum")
    if (crowdP > 0.01) {
      A.withA(c, crowdP, () => {
        const barY = 395;
        A.rrect(c, -480, barY - 48, 960, 96, 12, P.paper, P.ink, lo);
        A.line(c, [[-440, barY + 24], [440, barY + 24]], P.ink2, li);

        // Jagged interference spikes across spectrum except one clean surviving channel in center
        const pts: A.Pt[] = [];
        for (let sx = -430; sx <= 430; sx += 18) {
          const isCleanSlot = Math.abs(sx) < 42;
          const amp = isCleanSlot
            ? 58
            : 14 + 28 * Math.abs(Math.sin(sx * 0.13 + t * 9));
          pts.push([sx, barY + 24 - amp]);
        }
        A.line(c, pts, P.enemy, li);

        // Highlight the clean surviving frequency slot in the middle
        A.rrect(c, -44, barY - 38, 88, 64, 6, P.sky, P.ink, lo);
      });
    }

    K.end(c);
  }
}
