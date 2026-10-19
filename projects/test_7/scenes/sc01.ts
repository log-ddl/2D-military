import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { worldAt } from './_state';
import {
  drawTechnicalBg,
  drawHaleDrone,
  drawAirliner,
  drawQuadDrone,
  drawCallout,
} from './_assets';

const wideCam: K.Cam = { x: -40, y: 0, z: 0.92 };
const tableCam: K.Cam = { x: 590, y: 275, z: 2.25 };

const camKeys: [number, K.Cam][] = [
  [0, wideCam],
  [8.6, wideCam],
  [9.8, tableCam],
  [14.26, tableCam],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = worldAt(t);
    const cam = K.track(t, camKeys, A.eio);

    K.begin(c, cam);
    drawTechnicalBg(c, cam, { showFloor: false, gridStep: 120 });

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // ── 1. LEFT/CENTER: HALE DRONE vs SMALL AIRLINER (TOP VIEW) ────────
    // Placed with nose pointing UP (-PI/2) so wingspan stretches horizontally
    const haleX = -230;
    const haleY = -75;
    const haleScale = 1.95; // Wingspan = 1.95 * 560 = 1092 world units

    // Ghosted small airliner underneath for direct wingspan comparison
    const airAlpha = A.sm(t, 2.2, 3.1);
    A.withA(c, 0.35 + 0.55 * airAlpha, () => {
      drawAirliner(c, haleX, haleY + 55, haleScale, {
        view: 'top',
        rot: -Math.PI / 2,
        ghost: true,
      });
    });

    // HALE drone on top
    drawHaleDrone(c, haleX, haleY - 25, haleScale, {
      view: 'top',
      rot: -Math.PI / 2,
    });

    // Wingspan caliper bars (t >= 2.64)
    const spanP = A.eo(t, CUE.ch1_wingspan, CUE.ch1_wingspan + 1.1);
    if (spanP > 0) {
      const haleHalf = 280 * haleScale * spanP;
      const airHalf = 165 * haleScale * spanP;
      const barY = -355;
      const airBarY = 185;

      // HALE span caliper (wider!)
      A.line(c, [[haleX - haleHalf, barY], [haleX + haleHalf, barY]], P.amber, lo);
      A.line(c, [[haleX - haleHalf, barY - 18], [haleX - haleHalf, haleY - 40]], P.amber, li, [8, 6]);
      A.line(c, [[haleX + haleHalf, barY - 18], [haleX + haleHalf, haleY - 40]], P.amber, li, [8, 6]);

      // Airliner span caliper (narrower)
      A.line(c, [[haleX - airHalf, airBarY], [haleX + airHalf, airBarY]], P.slate, li);
      A.line(c, [[haleX - airHalf, airBarY + 14], [haleX - airHalf, haleY + 80]], P.slate, li, [6, 6]);
      A.line(c, [[haleX + airHalf, airBarY + 14], [haleX + airHalf, haleY + 80]], P.slate, li, [6, 6]);
    }

    // 24h+ Endurance Clock Gauge (t >= 5.5)
    const endP = A.eo(t, CUE.ch1_moreThanDay, CUE.ch1_moreThanDay + 1.2);
    if (endP > 0) {
      const cx = -760;
      const cy = -230;
      const r = 68;
      A.withA(c, endP, () => {
        A.circle(c, cx, cy, r, P.paper, P.ink, lo);
        // Full 24h sky circle + extra overflow arc in amber
        c.beginPath();
        c.moveTo(cx, cy);
        c.arc(cx, cy, r - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, endP * 1.2));
        c.closePath();
        A.fs(c, P.sky, null, 0);
        if (endP > 0.7) {
          c.beginPath();
          c.moveTo(cx, cy);
          c.arc(cx, cy, r - 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.65 * ((endP - 0.7) / 0.3));
          c.closePath();
          A.fs(c, P.amber, null, 0);
        }
        // Clock ticks
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          A.line(
            c,
            [
              [cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12)],
              [cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3)],
            ],
            P.ink,
            li,
          );
        }
        A.circle(c, cx, cy, 6, P.ink, null, 0);
      });
    }

    // High Cost Stack (t >= 7.2)
    const costP = A.eo(t, CUE.ch1_tensMillions, CUE.ch1_tensMillions + 1.1);
    if (costP > 0) {
      const bx = -810;
      const by = 210;
      const count = Math.round(8 * costP);
      for (let i = 0; i < count; i++) {
        A.rrect(c, bx, by - i * 22, 100, 18, 4, P.amber, P.ink, li);
      }
    }

    // ── 2. LOWER-RIGHT WORKTABLE: QUADCOPTER, SUGAR BAG, 15m, BOX OF 10 ─
    const tx = 590;
    const ty = 275;
    // Table surface
    A.rrect(c, tx - 360, ty - 185, 720, 370, 14, P.bg2, P.ink, lo);

    const scaleP = A.eo(t, CUE.ch1_sugarBag, CUE.ch1_sugarBag + 1.2);
    const tilt = 0.22 * scaleP; // Sugar bag side goes DOWN, quadcopter goes UP!

    // Balance Scale at left of table
    const sx = tx - 190;
    const sy = ty + 50;
    // Scale pillar & base
    A.rrect(c, sx - 38, sy + 42, 76, 16, 4, P.slate, P.ink, lo);
    A.line(c, [[sx, sy - 35], [sx, sy + 42]], P.ink, lo);
    // Tilting beam
    const beamL = 95;
    const lx = sx - Math.cos(tilt) * beamL;
    const ly = sy - 35 - Math.sin(tilt) * beamL;
    const rx = sx + Math.cos(tilt) * beamL;
    const ry = sy - 35 + Math.sin(tilt) * beamL;
    A.line(c, [[lx, ly], [rx, ry]], P.ink, lo);
    A.circle(c, sx, sy - 35, 6, P.amber, P.ink, li);

    // Left pan: Quadcopter (lighter -> rises!)
    A.line(c, [[lx - 34, ly + 18], [lx + 34, ly + 18]], P.ink, lo);
    A.line(c, [[lx, ly], [lx, ly + 18]], P.ink2, li);
    drawQuadDrone(c, lx, ly - 10, 0.62, {
      view: 'side',
      rotorPhase: st.rotorPhase,
    });

    // Right pan: Bag of Sugar (heavier -> sinks!)
    if (scaleP > 0.05) {
      A.withA(c, scaleP, () => {
        A.line(c, [[rx - 34, ry + 18], [rx + 34, ry + 18]], P.ink, lo);
        A.line(c, [[rx, ry], [rx, ry + 18]], P.ink2, li);
        // Sugar sack shape
        A.rrect(c, rx - 24, ry - 32, 48, 48, 8, P.paper, P.ink, lo);
        A.rrect(c, rx - 16, ry - 16, 32, 18, 3, P.sky, P.ink, li);
      });
    }

    // 15-Minute Quarter-Hour Clock Dial (t >= 11.0) at top-center of table
    const qtrP = A.eo(t, CUE.ch1_quarterHour, CUE.ch1_quarterHour + 0.9);
    const qx = tx - 15;
    const qy = ty - 110;
    if (qtrP > 0) {
      const qr = 42;
      A.withA(c, qtrP, () => {
        A.circle(c, qx, qy, qr, P.paper, P.ink, lo);
        // 1/4 hour (90 deg) sector
        c.beginPath();
        c.moveTo(qx, qy);
        c.arc(qx, qy, qr - 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI / 2) * qtrP);
        c.closePath();
        A.fs(c, P.amber, null, 0);
        A.line(c, [[qx, qy], [qx, qy - qr + 6]], P.ink, li);
        A.line(c, [[qx, qy], [qx + (qr - 6) * qtrP, qy]], P.ink, li);
        A.circle(c, qx, qy, 4, P.ink, null, 0);
      });
    }

    // Box of Ten Quadcopters (t >= 12.3) at right of table
    const boxP = A.eo(t, CUE.ch1_boxOfTen, CUE.ch1_boxOfTen + 1.1);
    const bx = tx + 165;
    const by = ty + 20;
    // Open crate base
    A.rrect(c, bx - 125, by - 95, 250, 190, 8, P.sand, P.ink, lo);
    A.rrect(c, bx - 115, by - 85, 230, 170, 5, P.bg, P.ink2, li);

    // 10 mini quadcopters in a 2x5 grid inside the crate
    const shownDrones = boxP <= 0 ? 1 : Math.min(10, Math.floor(1 + boxP * 9.9));
    for (let i = 0; i < shownDrones; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const dx = bx - 88 + col * 44;
      const dy = by - 42 + row * 84;
      drawQuadDrone(c, dx, dy, 0.32, {
        view: 'top',
        rotorPhase: st.rotorPhase + i,
      });
    }

    // Sliding crate lid opening to the right as boxP progresses
    if (boxP < 0.98) {
      const lidOff = boxP * 240;
      A.rrect(c, bx - 125 + lidOff, by - 95, 250 * (1 - boxP * 0.6), 190, 8, P.oliveLight, P.ink, lo);
    }

    K.end(c);

    // Minimal Callouts (max 2, only for spoken numbers)
    const call24Alpha = A.win(t, 5.6, 8.7, 0.3, 0.3);
    if (call24Alpha > 0) {
      const pScreen = K.toScreen(cam, -760, -230);
      drawCallout(c, pScreen, [pScreen[0] + 135, pScreen[1] - 55], '> 24 h', call24Alpha, P.sky);
    }

    const call15Alpha = A.win(t, 11.0, 14.1, 0.3, 0.25);
    if (call15Alpha > 0) {
      const qScreen = K.toScreen(cam, qx, qy);
      drawCallout(c, qScreen, [qScreen[0] - 175, qScreen[1]], '15 min', call15Alpha, P.amber);
    }
  }
}
