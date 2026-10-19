import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawTacticalMapBg,
  drawHaleDrone,
  drawMaleDrone,
  drawSamSystem,
} from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 0.96 };

    K.begin(c, cam);
    drawTacticalMapBg(c, cam, { showFrontStrip: false });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // ── 1. ENEMY AIR DEFENSE ZONE ON RIGHT (x = 380, y = 20) ───────────
    const samAppear = A.eo(t, CUE.ch2_cannotSurviveSam - 0.5, CUE.ch2_cannotSurviveSam + 0.8);
    const samX = 380;
    const samY = 20;
    const samRadius = 410 * samAppear;

    if (samAppear > 0) {
      A.withA(c, 0.16 * samAppear, () => {
        A.circle(c, samX, samY, samRadius, P.enemy, null, 0);
      });
      A.circle(c, samX, samY, samRadius, null, P.enemy, lo);
      // Rotating radar sweep line
      const rAng = t * 2.4;
      A.line(
        c,
        [
          [samX, samY],
          [samX + Math.cos(rAng) * samRadius, samY + Math.sin(rAng) * samRadius],
        ],
        P.enemy,
        li,
      );
      drawSamSystem(c, samX, samY, 1.35, { view: 'top', radarAngle: rAng });
    }

    // ── 2. HALE DRONE: APPROACHES SAM ZONE, THEN RETREATS TO SAFE SKY ──
    // 67.55..71.5: moves slowly right (-380 -> -60)
    // 72.0..76.5: turns back left to safe uncontested zone (-480)
    const approachP = A.sm(t, 67.55, 71.8);
    const retreatP = A.eio(t, CUE.ch2_noShootingSky - 0.4, CUE.ch2_noShootingSky + 3.0);
    const haleX = A.lerp(A.lerp(-420, -45, approachP), -520, retreatP);
    const haleY = A.lerp(0, -140, Math.sin(retreatP * Math.PI));
    const haleRot = A.lerp(0, Math.PI, A.eio(t, 72.0, 74.2));

    // Province surveillance ring around HALE
    A.withA(c, 0.18, () => {
      A.circle(c, haleX, haleY, 270, P.sky, null, 0);
    });
    A.circle(c, haleX, haleY, 270, null, P.sky, li);

    drawHaleDrone(c, haleX, haleY, 1.05, {
      view: 'top',
      rot: haleRot,
    });

    // High-cost badge attached to HALE (showing why it's too precious to risk)
    for (let i = 0; i < 4; i++) {
      A.rrect(c, haleX - 45 + i * 22, haleY - 210, 18, 28, 3, P.amber, P.ink, li);
    }

    // Red radar lock warning when HALE touches the SAM ring edge (70.2..73.2s)
    const warnAlpha = A.win(t, 70.2, 73.2, 0.3, 0.4);
    if (warnAlpha > 0) {
      A.withA(c, warnAlpha, () => {
        A.line(c, [[samX, samY], [haleX, haleY]], P.enemy, lo, [10, 8]);
        A.circle(c, haleX, haleY, 95, null, P.enemy, lo * 1.3);
      });
    }

    // ── 3. NEXT CLASS (78.36–83.30s): CHEAPER MEDIUM DRONES ENTER ──────
    // "If the biggest machine is too precious to risk, something cheaper must do the dangerous work."
    const maleP = A.eio(t, CUE.ch2_nextClass, 83.2);
    if (maleP > 0) {
      const m1x = A.lerp(-680, -40, maleP);
      const m2x = A.lerp(-780, -160, maleP);
      A.withA(c, A.sm(t, CUE.ch2_nextClass, CUE.ch2_nextClass + 0.8), () => {
        // Dashed forward paths into the contested zone
        A.line(c, [[-680, -130], [160, -130]], P.oliveDark, li, [10, 8]);
        A.line(c, [[-780, 150], [120, 150]], P.oliveDark, li, [10, 8]);

        drawMaleDrone(c, m1x, -130, 1.05, { view: 'top', propPhase: t * 22, missiles: 2 });
        drawMaleDrone(c, m2x, 150, 1.05, { view: 'top', propPhase: t * 22 + 1, missiles: 2 });

        // Single small cost block on each MALE (cheaper than the 4-block HALE)
        A.rrect(c, m1x - 10, -225, 20, 24, 3, P.oliveLight, P.ink, li);
        A.rrect(c, m2x - 10, 55, 20, 24, 3, P.oliveLight, P.ink, li);
      });
    }

    K.end(c);
  }
}
