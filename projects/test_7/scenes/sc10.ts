import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { worldAt } from './_state';
import {
  drawTacticalMapBg,
  drawAirspaceBg,
  drawLoiterDrone,
  drawQuadDrone,
  drawSamSystem,
  drawSoldierUnit,
  drawSignalLink,
  drawExplosion,
  drawCallout,
} from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = worldAt(t);
    let cam: K.Cam = { x: 0, y: 0, z: 0.98 };
    cam = K.withShake(cam, t, [
      [CUE.ch3_loiterHits, 15, 0.5],
      [CUE.ch3_fpvHits, 15, 0.5],
    ]);

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    // ── PHASE 1 (186.00 – 194.60s): TOP-DOWN LOITERING MUNITION ORBIT ──
    if (t < 194.6) {
      K.begin(c, cam);
      drawTacticalMapBg(c, cam, { showFrontStrip: false });

      // Enemy target group on ground
      drawSamSystem(c, 160, 40, 1.35, { view: 'top', radarAngle: t * 1.5 });
      drawSoldierUnit(c, -80, 120, 1.25, { view: 'top', enemy: true });
      drawSoldierUnit(c, 220, -140, 1.25, { view: 'top', enemy: true });

      // Loitering orbit circle (P.sky dashed)
      const orbitR = 260;
      A.circle(c, 80, 0, orbitR, null, P.sky, lo);

      // Loitering munition flies in and circles along the orbit
      const enterP = A.sm(t, 186.0, 189.5);
      const ang = (t - 189.0) * 1.35;
      const lx = A.lerp(-680, 80 + Math.cos(ang) * orbitR, enterP);
      const ly = A.lerp(-180, Math.sin(ang) * orbitR, enterP);
      const lrot = enterP < 0.95 ? 0.15 : ang + Math.PI / 2;

      // Target lock reticle tightening onto enemy vehicle at (160, 40) after 192.5s
      const lockP = A.sm(t, 192.2, 194.4);
      if (lockP > 0) {
        A.withA(c, lockP, () => {
          A.line(c, [[lx, ly], [160, 40]], P.enemy, lo, [10, 8]);
          const boxS = A.lerp(140, 76, lockP);
          A.rrect(c, 160 - boxS, 40 - boxS * 0.65, boxS * 2, boxS * 1.3, 8, null, P.enemy, lo * 1.3);
        });
      }

      drawLoiterDrone(c, lx, ly, 1.55, { view: 'top', rot: lrot, propPhase: t * 28 });
      K.end(c);
      return;
    }

    // ── PHASE 2 (194.60 – 200.08s): SIDE DIVE + OPERATOR SEEKER POV INSET ──
    if (t < CUE.ch3_fpvDrone) {
      K.begin(c, cam);
      const gy = 300;
      drawAirspaceBg(c, cam, { groundY: gy, showBands: false });

      // Operator on left ground watching through screen
      drawSoldierUnit(c, -640, gy, 1.45, { role: 'controller', facing: 1 });

      // Enemy target on right ground (x = 420, y = 300)
      const isHit = t >= CUE.ch3_loiterHits;
      drawSamSystem(c, 420, gy, 1.5, { view: 'side', missiles: isHit ? 0 : 2 });

      // Diving loitering munition
      const diveP = A.ei(t, 194.6, CUE.ch3_loiterHits);
      if (!isHit) {
        const dx = A.lerp(-180, 400, diveP);
        const dy = A.lerp(-280, gy - 45, diveP);
        const drot = Math.atan2(gy - 45 - -280, 400 - -180);
        A.line(c, [[-180, -280], [dx, dy]], P.amber, lo, [10, 8]);
        drawSignalLink(c, -585, gy - 105, dx, dy, t, { mode: 'radio' });
        drawLoiterDrone(c, dx, dy, 1.65, { view: 'side', rot: drot, propPhase: t * 30 });
      }

      // Explosion at 196.8s
      const expP = A.ph(t, CUE.ch3_loiterHits, CUE.ch3_loiterHits + 1.4);
      drawExplosion(c, 420, gy - 45, 145, expP);

      // Operator Camera Seeker POV Window ("An operator watches through its camera and decides")
      const povX = -320;
      const povY = -180;
      A.rrect(c, povX - 210, povY - 135, 420, 270, 14, P.paper, P.ink, lo * 1.2);
      // Crosshair & target inside POV screen
      drawSamSystem(c, povX, povY + 45, 1.05, { view: 'side', missiles: isHit ? 0 : 2 });
      A.circle(c, povX, povY + 10, 68, null, P.enemy, lo);
      A.line(c, [[povX - 95, povY + 10], [povX + 95, povY + 10]], P.enemy, li);
      A.line(c, [[povX, povY - 85], [povX, povY + 105]], P.enemy, li);

      K.end(c);
      return;
    }

    // ── PHASE 3 (200.08 – 215.80s): CHEAP FPV QUADCOPTER + WARHEAD = COST OF A PHONE ──
    K.begin(c, cam);
    const gy = 300;
    drawAirspaceBg(c, cam, { groundY: gy, showBands: false });

    // Keep the FPV Quadcopter + Warhead = Smartphone card visible across 200.08–215.80s
    const attachP = A.eio(t, 201.2, 203.2);
    A.rrect(c, -620, -345, 1240, 340, 16, P.paper, P.ink, lo);

    // Left of card: Racing Quadcopter + Warhead attaching underneath
    const qx = -240;
    const qy = -180;
    drawQuadDrone(c, qx, qy, 2.25, {
      view: 'side',
      rotorPhase: st.rotorPhase,
      fpvWarhead: attachP > 0.85,
    });
    if (attachP <= 0.85) {
      const wy = A.lerp(qy + 125, qy + 30, attachP / 0.85);
      A.rrect(c, qx - 42, wy, 108, 36, 12, P.amber, P.ink, lo);
      A.poly(c, [[qx + 66, wy + 2], [qx + 104, wy + 18], [qx + 66, wy + 34]], P.enemy, P.ink, li);
    }

    // Right of card: Equal sign (=) + Smartphone icon ("for the cost of a phone")
    const phoneP = A.eo(t, CUE.ch3_fewHundredDollars - 0.5, CUE.ch3_fewHundredDollars + 1.0);
    if (phoneP > 0) {
      A.withA(c, phoneP, () => {
        A.line(c, [[90, -190], [160, -190]], P.ink, lo * 1.4);
        A.line(c, [[90, -160], [160, -160]], P.ink, lo * 1.4);
        const px = 340;
        const py = -175;
        A.rrect(c, px - 54, py - 98, 108, 196, 16, P.dark, P.ink, lo);
        A.rrect(c, px - 44, py - 78, 88, 150, 8, P.sky, P.ink, li);
        A.circle(c, px, py + 85, 6, P.paper, null, 0);
      });
    }

    // Bottom battlefield (200.08–215.80s): FPV Goggled Infantryman launches precision FPV strike!
    drawSoldierUnit(c, -620, gy, 1.5, { role: 'fpv', facing: 1 });
    const fpvHit = t >= CUE.ch3_fpvHits;
    drawSamSystem(c, 520, gy, 1.5, { view: 'side', missiles: fpvHit ? 0 : 2 });

    // Persistent smoke plume & red X on target after FPV impact
    if (fpvHit) {
      for (let i = 0; i < 4; i++) {
        const u = ((t * 0.8 + i * 0.25) % 1 + 1) % 1;
        A.withA(c, (1 - u) * 0.7, () => {
          A.circle(c, 520 + Math.sin(u * 6 + i) * 24, gy - 65 - u * 120, 18 + u * 26, P.slate, P.ink, li);
        });
      }
    }

    const flyP = A.ei(t, CUE.ch3_costOfPhone - 0.6, CUE.ch3_fpvHits);
    if (!fpvHit && flyP > 0) {
      const fx = A.lerp(-520, 480, flyP);
      const fy = A.lerp(gy - 105, gy - 48, flyP) - Math.sin(flyP * Math.PI) * 95;
      drawSignalLink(c, -565, gy - 105, fx - 35, fy, t, { mode: 'radio' });
      drawQuadDrone(c, fx, fy, 1.35, {
        view: 'side',
        rot: 0.18,
        rotorPhase: st.rotorPhase,
        fpvWarhead: true,
      });
    }

    const exp2P = A.ph(t, CUE.ch3_fpvHits, CUE.ch3_fpvHits + 1.3);
    drawExplosion(c, 520, gy - 45, 145, exp2P);

    K.end(c);

    // Minimal Callout for spoken price: "a few hundred dollars" -> "$500"
    const call500Alpha = A.win(t, CUE.ch3_fewHundredDollars, 211.6, 0.3, 0.3);
    if (call500Alpha > 0) {
      const sPt = K.toScreen(cam, -240, -135);
      drawCallout(c, sPt, [sPt[0], sPt[1] + 95], '$500', call500Alpha, P.amber);
    }
  }
}
