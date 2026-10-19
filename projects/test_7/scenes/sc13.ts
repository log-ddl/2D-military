import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawAirspaceBg,
  drawExplosion,
  drawQuadDrone,
  drawSignalLink,
  drawSoldierUnit,
  drawTechnicalBg,
} from './_assets';

// sc13 (281.82–303.40s): Optical fiber spool drone, AI target recognition camera drone,
// and the two new problems (tethered fiber range limit vs autonomous decision question).
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    cam = K.withShake(cam, t, [[CUE.ch4_aiDivesHit, 15, 0.5]]);

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);
    const groundY = 290;

    const inFiberPhase = t < CUE.ch4_aiTargetCam;
    const inAiPhase = t >= CUE.ch4_aiTargetCam && t < CUE.ch4_twoNewProblems;

    K.begin(c, cam);

    if (inFiberPhase) {
      // ── PHASE 1 (281.82 – 288.88s): Optical Fiber Spool — Immune to Radio Jamming ──
      drawAirspaceBg(c, cam, { groundY, showBands: false });

      const opX = -640;
      drawSoldierUnit(c, opX, groundY, 1.8, { view: 'side', role: 'fpv', facing: 1 });

      // Enemy jammer on right trying to jam
      const jamX = 620;
      drawSoldierUnit(c, jamX, groundY, 1.8, {
        view: 'side',
        role: 'jammer',
        enemy: true,
        facing: -1,
        aimAngle: -0.45,
      });

      const flyU = A.ph(t, 281.82, CUE.ch4_aiTargetCam);
      const droneX = A.lerp(-180, 220, flyU);
      const droneY = -110 + Math.sin(t * 2.5) * 10;

      // Continuous hair-thin optical fiber link from operator controller to rear spool of drone
      drawSignalLink(c, opX + 64, groundY - 125, droneX - 115, droneY + 8, t, {
        mode: 'fiber',
      });

      // Enemy jammer waves bouncing harmlessly off the physical optical fiber
      for (let w = 0; w < 3; w++) {
        const waveP = ((t * 1.3 + w / 3) % 1 + 1) % 1;
        const wx = A.lerp(jamX - 60, droneX - 40, waveP);
        const wy = A.lerp(groundY - 110, 40, waveP);
        A.withA(c, (1 - waveP) * 0.85, () => {
          A.line(c, [[wx - 18, wy - 14], [wx, wy], [wx - 14, wy + 18]], P.enemy, lo);
        });
      }
      // Protective shield arc around the fiber showing radio noise cannot enter glass fiber
      A.circle(c, droneX - 210, 45, 42, null, P.sky, lo);

      // QuadDrone with rear fiberSpool
      drawQuadDrone(c, droneX, droneY, 2.55, {
        view: 'cutaway',
        cutaway: true,
        fiberSpool: true,
        fpvWarhead: true,
        rotorPhase: t * 24,
      });

      // Magnified Cutaway Circle above drone showing the hair-thin optical fiber spool uncoiling
      const bx = droneX - 60;
      const by = -315;
      A.line(c, [[droneX - 110, droneY - 8], [bx, by + 82]], P.sky, li, [6, 5]);
      A.circle(c, bx, by, 82, P.paper, P.ink, lo);
      // Cylindrical bobbin spool inside circle
      A.rrect(c, bx - 44, by - 32, 88, 64, 10, P.sky, P.ink, lo);
      for (let cx = -30; cx <= 30; cx += 12) {
        A.line(c, [[bx + cx, by - 30], [bx + cx, by + 30]], P.ink2, li);
      }
      // Uncoiling fine glass thread exiting left
      A.line(c, [[bx - 44, by + 18], [bx - 78, by + 28]], P.sky, lo);
    } else if (inAiPhase) {
      // ── PHASE 2 (288.88 – 295.54s): AI Camera Target Recognition — Finishes Job Without Link ──
      drawAirspaceBg(c, cam, { groundY, showBands: false });

      const opX = -640;
      drawSoldierUnit(c, opX, groundY, 1.8, { view: 'side', role: 'controller', facing: 1 });

      // Enemy armored target vehicle on right ground (520, groundY)
      const tgtX = 520;
      const hitU = A.ph(t, CUE.ch4_aiDivesHit, CUE.ch4_aiDivesHit + 1.1);
      const isHit = t >= CUE.ch4_aiDivesHit;

      // Enemy jammer soldier standing behind vehicle at (690, groundY)
      drawSoldierUnit(c, 690, groundY, 1.65, {
        view: 'side',
        role: 'jammer',
        enemy: true,
        facing: -1,
        aimAngle: -0.5,
      });

      // Target armored vehicle
      A.rrect(c, tgtX - 75, groundY - 46, 150, 34, 6, isHit ? P.slate : P.enemy, P.ink, lo);
      A.rrect(c, tgtX - 35, groundY - 68, 70, 24, 5, isHit ? P.dark : P.enemyLight, P.ink, lo);
      for (const wx of [-48, 0, 48]) {
        A.circle(c, tgtX + wx, groundY - 12, 12, P.dark, P.ink, lo);
      }

      // Timeline within AI phase:
      // 288.88 – 291.2s: Operator locks on via radio link
      // 291.2 – 294.2s: Radio link is jammed/cut, AI camera keeps target lock and dives!
      const linkCut = t >= 291.2;
      const diveU = A.eio(t, 291.5, CUE.ch4_aiDivesHit);

      const droneX = A.lerp(-40, tgtX - 10, diveU);
      const droneY = A.lerp(-160, groundY - 52, diveU * diveU);
      const droneRot = A.lerp(0.08, 0.58, diveU);

      // Radio link between operator and drone (active during lock-on, jammed after 291.2s)
      drawSignalLink(c, opX + 64, groundY - 125, -40 - 45, -160 - 20, t, {
        mode: linkCut ? 'jammed' : 'radio',
        jamProgress: A.clamp01((t - 291.2) * 2),
      });

      if (!isHit) {
        // AI Camera Recognition Cone & Bounding Box on Target
        const camNoseX = droneX + 68 * Math.cos(droneRot);
        const camNoseY = droneY + 68 * Math.sin(droneRot);

        A.withA(c, 0.22, () => {
          A.poly(
            c,
            [
              [camNoseX, camNoseY],
              [tgtX - 95, groundY - 82],
              [tgtX + 95, groundY],
            ],
            linkCut ? P.amber : P.sky,
            null,
            0,
          );
        });
        // Autonomous lock line from AI camera straight to target center
        A.line(c, [[camNoseX, camNoseY], [tgtX, groundY - 40]], linkCut ? P.enemy : P.sky, lo, [10, 6]);

        // Target recognition bounding box around enemy vehicle
        const boxCol = linkCut ? P.enemy : P.sky;
        A.rrect(c, tgtX - 92, groundY - 84, 184, 84, 8, null, boxCol, lo);
        A.circle(c, tgtX, groundY - 42, 16, null, boxCol, li);

        drawQuadDrone(c, droneX, droneY, 2.35, {
          view: 'cutaway',
          cutaway: true,
          aiSeeker: true,
          fpvWarhead: true,
          rot: droneRot,
          rotorPhase: t * 26,
        });

        // Magnified AI Vision Module Breakout above drone (-40, -335)
        const bx = -40;
        const by = -335;
        A.circle(c, bx, by, 72, P.paper, P.ink, lo);
        // Camera lens + neural network nodes inside circle
        A.circle(c, bx - 22, by, 22, P.sky, P.ink, lo);
        A.circle(c, bx - 22, by, 10, P.glass, P.ink, li);
        for (const ny of [-22, 0, 22]) {
          A.line(c, [[bx, by], [bx + 28, by + ny]], P.amber, li);
          A.circle(c, bx + 28, by + ny, 7, P.amber, P.ink, li);
        }
      }

      if (hitU > 0 && hitU < 1) {
        drawExplosion(c, tgtX, groundY - 38, 125, hitU);
      }
    } else {
      // ── PHASE 3 (295.54 – 303.40s): Split Screen — Two Solutions, Two New Problems ──
      drawTechnicalBg(c, cam);

      const splitP = A.eo(t, CUE.ch4_twoNewProblems, CUE.ch4_twoNewProblems + 0.6);
      const autoP = A.eo(t, CUE.ch4_twoNewProblems + 0.1, CUE.ch4_twoNewProblems + 0.9);

      // Center vertical divider
      A.line(c, [[0, -440], [0, 440]], P.ink, lo);

      // ── LEFT PANEL: "because fiber limits range" ──
      A.withA(c, splitP, () => {
        const lGround = 240;
        A.line(c, [[-860, lGround], [-60, lGround]], P.ink, lo);

        // Operator on far left
        drawSoldierUnit(c, -780, lGround, 1.5, { view: 'side', role: 'fpv', facing: 1 });

        // Empty spool indicator above operator (-620, -190)
        A.circle(c, -620, -190, 56, P.paper, P.enemy, lo);
        A.rrect(c, -648, -208, 56, 36, 6, P.bg2, P.ink, li);
        // Red stop bar showing 0m left on spool
        A.line(c, [[-655, -225], [-585, -155]], P.enemy, lo);

        // Obstacle poles/trees snagging the taut optical fiber
        for (const px of [-540, -410]) {
          A.line(c, [[px, lGround], [px, lGround - 120]], P.slate, lo);
          A.circle(c, px, lGround - 135, 28, P.oliveDark, P.ink, li);
        }

        // Drone pulled taut at end of its fiber leash (-290, -40), unable to reach target at (-115, lGround)
        const jerkX = -290 + Math.sin(t * 10) * 4;
        // Taut straight fiber line snagged over obstacles
        A.line(
          c,
          [
            [-725, lGround - 105],
            [-540, lGround - 120],
            [-410, lGround - 120],
            [jerkX - 80, -35],
          ],
          P.enemy,
          lo,
        );

        drawQuadDrone(c, jerkX, -40, 1.85, {
          view: 'side',
          fiberSpool: true,
          fpvWarhead: true,
          rot: 0.22,
          rotorPhase: t * 24,
        });

        // Out-of-reach enemy target on right edge of left panel (-115, lGround)
        A.rrect(c, -165, lGround - 36, 96, 26, 5, P.enemy, P.ink, lo);
        A.circle(c, -140, lGround - 10, 9, P.dark, P.ink, li);
        A.circle(c, -95, lGround - 10, 9, P.dark, P.ink, li);
        // Gap arrow showing insufficient range
        A.line(c, [[jerkX + 55, -40], [-120, lGround - 55]], P.enemy, li, [8, 8]);
      });

      // ── RIGHT PANEL: "and autonomy raises a hard question about who decided" ──
      if (autoP > 0.01) {
        A.withA(c, autoP, () => {
          const rGround = 240;
          A.line(c, [[60, rGround], [860, rGround]], P.ink, lo);

          // Operator on left of right panel with hands off / severed link
          drawSoldierUnit(c, 160, rGround, 1.5, { view: 'side', role: 'controller', facing: 1 });

          // Autonomous AI drone hovering high at (520, -110)
          const aiX = 520;
          const aiY = -110 + Math.sin(t * 2.2) * 8;
          drawQuadDrone(c, aiX, aiY, 2.05, {
            view: 'side',
            aiSeeker: true,
            fpvWarhead: true,
            rotorPhase: t * 24,
          });

          // Severed link between human operator and autonomous drone
          A.line(c, [[215, rGround - 105], [330, 20]], P.slate, li, [8, 8]);
          A.line(c, [[400, -35], [aiX - 55, aiY + 10]], P.slate, li, [8, 8]);

          // Giant warning badge with "?" over the severed human-to-machine decision point (365, -10)
          const qx = 365;
          const qy = -10;
          A.circle(c, qx, qy, 58, P.paper, P.amber, lo * 1.2);
          c.save();
          c.font = '800 68px system-ui, -apple-system, sans-serif';
          c.fillStyle = P.enemy;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText('?', qx, qy + 4);
          c.restore();

          // AI drone scanning two ambiguous targets on the ground below (civilian truck vs military truck)
          A.line(c, [[aiX + 45, aiY + 15], [470, rGround - 36]], P.amber, li, [8, 6]);
          A.line(c, [[aiX + 45, aiY + 15], [700, rGround - 36]], P.enemy, li, [8, 6]);

          // Vehicle A (neutral/civilian) & Vehicle B (enemy)
          A.rrect(c, 425, rGround - 36, 90, 26, 5, P.paper, P.ink, lo);
          A.rrect(c, 655, rGround - 36, 90, 26, 5, P.enemy, P.ink, lo);
        });
      }
    }

    K.end(c);
  }
}
