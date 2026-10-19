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
  drawSamSystem,
  drawSoldierUnit,
} from './_assets';

// sc16 (353.00–374.20s): 4 cheap counter-drone layers (jammer, net, MG with ring sight, shotgun)
// and contrast with fast, heavily armed manned fighter jet surviving frontline fire.
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    cam = K.withShake(cam, t, [
      [CUE.ch5_mgAnswer + 0.5, 10, 0.35],
      [CUE.ch5_shotgunAnswer + 0.4, 10, 0.35],
      [CUE.ch5_fighterSurvivesFire, 12, 0.4],
    ]);

    const groundY = 300;
    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const inFighterPhase = t >= CUE.ch5_fighterNotObsolete;

    K.begin(c, cam);
    drawAirspaceBg(c, cam, { groundY, showBands: inFighterPhase });

    if (!inFighterPhase) {
      // ── PHASE 1 (353.00 – 363.72s): 4 Cheap Counter-Drone Answers Along the Ground ──
      // Subtle vertical column dividers separating the 4 cheap counter-drone stations
      for (const divX of [-420, 0, 420]) {
        A.line(c, [[divX, -380], [divX, groundY]], P.bg2, li, [8, 8]);
      }

      // 1. ELECTRONIC JAMMER RIFLE (x = -630, active at 354.2s)
      const jP = A.eio(t, CUE.ch5_jammerAnswer - 0.8, CUE.ch5_jammerAnswer + 1.4);
      drawSoldierUnit(c, -660, groundY, 1.75, {
        view: 'side',
        role: 'jammer',
        facing: 1,
        aimAngle: -0.75,
      });
      const d1Y = A.lerp(-150, groundY - 24, A.eio(t, CUE.ch5_jammerAnswer + 0.4, CUE.ch5_jammerAnswer + 2.0));
      if (jP > 0.01 && d1Y < groundY - 40) {
        // Directional jammer wave arcs
        for (let w = 0; w < 3; w++) {
          const r = 65 + w * 65 + ((t * 90) % 65);
          c.beginPath();
          c.arc(-620, groundY - 110, r, -Math.PI * 0.48, -Math.PI * 0.18);
          A.fs(c, null, P.amber, lo);
        }
      }
      drawQuadDrone(c, -560, d1Y, 1.55, {
        view: 'side',
        color: P.enemy,
        rot: jP * 0.55,
        rotorPhase: d1Y > groundY - 40 ? 0.2 : t * 22,
      });

      // 2. CAPTURE NET (x = -210, active at 356.8s)
      const netP = A.eio(t, CUE.ch5_netAnswer - 0.5, CUE.ch5_netAnswer + 1.2);
      const d2Y = A.lerp(-150, groundY - 28, A.eio(t, CUE.ch5_netAnswer + 0.6, CUE.ch5_netAnswer + 2.2));
      // Friendly net-launcher turret / interceptor on ground
      A.rrect(c, -250, groundY - 42, 64, 42, 6, P.olive, P.ink, lo);
      A.line(c, [[-218, groundY - 42], [-205, groundY - 76]], P.dark, lo * 1.4);

      drawQuadDrone(c, -195, d2Y, 1.55, {
        view: 'side',
        color: P.enemy,
        rot: netP * 0.3,
        rotorPhase: netP > 0.5 ? 0.5 : t * 22,
      });
      if (netP > 0.05) {
        // Woven capture net mesh wrapping around Drone #2
        const nx = -195;
        const ny = d2Y;
        A.rrect(c, nx - 64, ny - 36, 128, 68, 18, null, P.sky, lo);
        for (let gx = -48; gx <= 48; gx += 24) {
          A.line(c, [[nx + gx, ny - 34], [nx + gx, ny + 32]], P.sky, li);
        }
        for (let gy = -18; gy <= 18; gy += 18) {
          A.line(c, [[nx - 62, ny + gy], [nx + 62, ny + gy]], P.sky, li);
        }
      }

      // 3. MACHINE GUN WITH SIMPLE RING SIGHT (x = 210, active at 358.8s)
      const mgP = A.ph(t, CUE.ch5_mgAnswer, CUE.ch5_mgAnswer + 0.6);
      const mgHit = t >= CUE.ch5_mgAnswer + 0.5;
      drawSoldierUnit(c, 150, groundY, 1.75, {
        view: 'side',
        role: 'mg',
        facing: 1,
        aimAngle: -0.68,
      });

      // Magnified simple mechanical ring sight inset at (210, -310)
      const rSightP = A.eo(t, CUE.ch5_mgAnswer - 0.8, CUE.ch5_mgAnswer + 0.2);
      if (rSightP > 0.01) {
        A.withA(c, rSightP, () => {
          const sx = 210;
          const sy = -310;
          A.circle(c, sx, sy, 56, P.paper, P.ink, lo);
          A.circle(c, sx, sy, 36, null, P.amber, lo);
          A.circle(c, sx, sy, 14, null, P.amber, li);
          A.line(c, [[sx - 48, sy], [sx + 48, sy]], P.amber, li);
          A.line(c, [[sx, sy - 48], [sx, sy + 48]], P.amber, li);
        });
      }

      if (mgP > 0 && mgP < 1) {
        // Tracer stream from pintle MG to Drone #3
        A.line(c, [[215, groundY - 115], [250, -145]], P.amber, lo, [14, 10]);
      }
      if (!mgHit) {
        drawQuadDrone(c, 250, -145, 1.55, {
          view: 'side',
          color: P.enemy,
          rotorPhase: t * 24,
        });
      }
      const mgExp = A.ph(t, CUE.ch5_mgAnswer + 0.5, CUE.ch5_mgAnswer + 1.4);
      if (mgExp > 0 && mgExp < 1) {
        drawExplosion(c, 250, -145, 76, mgExp);
      }

      // 4. SHOTGUN + LISTENING FOR THE BUZZ (x = 630, active at 361.2s)
      const sgP = A.ph(t, CUE.ch5_shotgunAnswer, CUE.ch5_shotgunAnswer + 0.5);
      const sgHit = t >= CUE.ch5_shotgunAnswer + 0.4;
      drawSoldierUnit(c, 580, groundY, 1.75, {
        view: 'side',
        role: 'shotgun',
        facing: 1,
        aimAngle: -0.72,
      });

      if (!sgHit) {
        // Acoustic buzz rings radiating from Drone #4 ("learned to listen for the buzz")
        for (let r = 0; r < 3; r++) {
          const wP = ((t * 1.8 + r / 3) % 1 + 1) % 1;
          A.withA(c, (1 - wP) * 0.75, () => {
            A.circle(c, 665, -135, 22 + wP * 75, null, P.amber, li);
          });
        }
        drawQuadDrone(c, 665, -135, 1.55, {
          view: 'side',
          color: P.enemy,
          rotorPhase: t * 26,
        });
      }
      if (sgP > 0 && sgP < 1) {
        // Shotgun pellet spread cone
        for (const spread of [-0.12, -0.06, 0, 0.06, 0.12]) {
          const px = A.lerp(625, 665 + spread * 220, sgP);
          const py = A.lerp(groundY - 115, -135 + spread * 120, sgP);
          A.circle(c, px, py, 4.5, P.amber, P.ink, li * 0.7);
        }
      }
      const sgExp = A.ph(t, CUE.ch5_shotgunAnswer + 0.4, CUE.ch5_shotgunAnswer + 1.3);
      if (sgExp > 0 && sgExp < 1) {
        drawExplosion(c, 665, -135, 76, sgExp);
      }
    } else {
      // ── PHASE 2 (363.72 – 374.20s): Fighter Jet vs Small Drone Across the Front ──
      // "a fighter can carry heavy weapons fast, cross the front in minutes, and survive when it is shot at, a small drone cannot"
      const phaseU = A.ph(t, CUE.ch5_fighterNotObsolete, CUE.ch5_end);

      // Enemy air defense & AA guns on ground along the front (x = -120, 380)
      drawSamSystem(c, -120, groundY, 1.35, { view: 'side', missiles: 2, elevateDeg: -52 });
      drawSoldierUnit(c, 360, groundY, 1.6, {
        view: 'side',
        role: 'mg',
        enemy: true,
        facing: -1,
        aimAngle: -0.65,
      });

      // Lower altitude (y = 65): Small quadcopter crawls slowly, carries tiny payload, and gets shot down at 367.2s!
      const smallHit = t >= 367.2;
      const smallX = A.lerp(-640, -180, A.ph(t, CUE.ch5_fighterNotObsolete, 367.2));
      const smallY = 65;

      if (!smallHit) {
        drawQuadDrone(c, smallX, smallY, 1.65, {
          view: 'side',
          fpvWarhead: true,
          rotorPhase: t * 24,
        });
      }
      // Enemy AA burst shooting down the small slow quadcopter at 366.7..367.2s
      if (t >= 366.6 && t < 367.3) {
        A.line(c, [[-120, groundY - 75], [smallX, smallY]], P.enemy, lo, [10, 6]);
      }
      const smallExp = A.ph(t, 367.2, 368.3);
      if (smallExp > 0 && smallExp < 1) {
        drawExplosion(c, -180, smallY, 78, smallExp);
      }
      if (smallHit) {
        // Wreckage of small drone on ground + red X badge showing "a small drone cannot"
        A.circle(c, -180, smallY, 28, P.paper, P.enemy, lo);
        A.line(c, [[-192, smallY - 12], [-168, smallY + 12]], P.enemy, lo);
        A.line(c, [[-168, smallY - 12], [-192, smallY + 12]], P.enemy, lo);
      }

      // Upper altitude (y = -185): Fast heavily-armed Fighter Jet streaking across the front!
      const jetU = A.eio(t, CUE.ch5_fighterNotObsolete + 0.4, CUE.ch5_end - 0.6);
      const jetX = A.lerp(-680, 560, jetU);
      const jetY = -185;

      // High-speed streak lines behind fighter jet
      for (let s = 0; s < 4; s++) {
        const sx = jetX - 280 - s * 95;
        const sy = jetY - 30 + s * 22;
        A.line(c, [[sx - 120, sy], [sx, sy]], P.sky, li, [18, 12]);
      }

      // Enemy AA fire shooting at the fast fighter jet around 369.0..370.5s — jet deploys flares & survives!
      if (t >= 368.8 && t <= 371.2) {
        A.line(c, [[340, groundY - 90], [jetX - 110, jetY + 45]], P.enemy, lo, [12, 8]);
        // Decoy flares ejected behind the fighter jet deflecting fire
        for (let f = 0; f < 3; f++) {
          const fx = jetX - 180 - f * 55;
          const fy = jetY + 35 + f * 24;
          A.circle(c, fx, fy, 12, P.amber, P.ink, li);
        }
        // Protective survival shield arc around fighter jet
        A.circle(c, jetX, jetY, 165, null, P.sky, lo);
      }

      drawFighterJet(c, jetX, jetY, 2.15, {
        view: 'side',
        heavyLoad: true,
        afterburner: 1.0,
      });
    }

    K.end(c);
  }
}
