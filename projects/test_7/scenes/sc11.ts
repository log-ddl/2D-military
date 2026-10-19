import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawAirspaceBg,
  drawCallout,
  drawExplosion,
  drawMissile,
  drawOneWayDrone,
  drawSamSystem,
  drawSatellite,
  drawTacticalMapBg,
} from './_assets';

// sc11 (215.80–243.82s): Long-range one-way drone cutaway, motorway speed comparison,
// and night swarm arithmetic keeping air defenses awake.
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const inMapPhase = t >= CUE.ch4_cannotDodgeLoud;
    let cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    cam = K.withShake(cam, t, [
      [CUE.ch4_samFire1 + 0.95, 10, 0.4],
      [CUE.ch4_samFire2 + 0.95, 10, 0.4],
      [CUE.ch4_samFire3 + 0.95, 10, 0.4],
    ]);

    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    if (!inMapPhase) {
      // ── PHASE 1 (215.80 – 231.90s): Cutaway mechanism + Motorway car speed + > 1,000 km ──
      K.begin(c, cam);
      drawAirspaceBg(c, cam, { groundY: 310, showBands: false });

      const introP = A.eo(t, CUE.ch4_start, CUE.ch4_oneWayDrone + 0.6);
      const propP = A.eio(t, CUE.ch4_slowPropEngine, CUE.ch4_slowPropEngine + 1.2);
      const warheadP = A.eio(t, CUE.ch4_warheadNose, CUE.ch4_warheadNose + 1.2);
      const satNavP = A.eio(t, CUE.ch4_satNavReceiver, CUE.ch4_satNavReceiver + 1.2);
      const carP = A.eio(t, CUE.ch4_thousandKmCar - 0.5, CUE.ch4_thousandKmCar + 1.2);

      // Slight forward cruise motion synced with car below
      const cruiseU = A.ph(t, CUE.ch4_thousandKmCar - 0.5, CUE.ch4_cannotDodgeLoud);
      const cruiseX = carP > 0 ? A.lerp(-120, 120, cruiseU) : 0;
      const droneX = cruiseX;
      const droneY = -105;
      const droneScale = 4.2 * (0.85 + 0.15 * introP);

      // Satellite in upper sky sending navigation pulses to receiver
      if (satNavP > 0.01) {
        A.withA(c, satNavP, () => {
          const satX = 0;
          const satY = -435;
          drawSatellite(c, satX, satY, 1.05);
          // GNSS navigation rays down to dorsal receiver on drone
          const rxX = droneX - 8 * droneScale;
          const rxY = droneY - 16 * droneScale;
          A.line(c, [[satX, satY + 32], [rxX, rxY]], P.sky, li, [8, 8]);
          for (let i = 0; i < 3; i++) {
            const u = ((t * 0.65 + i / 3) % 1 + 1) % 1;
            const px = A.lerp(satX, rxX, u);
            const py = A.lerp(satY + 32, rxY, u);
            A.circle(c, px, py, 5, P.sky, P.ink, li * 0.8);
          }
        });
      }

      // Main cutaway one-way drone
      drawOneWayDrone(c, droneX, droneY, droneScale, {
        view: 'cutaway',
        cutaway: true,
        propPhase: t * 14,
      });

      // 1. Rear slow-propeller & small piston engine breakout callout (-480, -285)
      if (propP > 0.01) {
        A.withA(c, propP, () => {
          const bx = -480;
          const by = -285;
          const tailX = droneX - 68 * droneScale;
          const tailY = droneY;
          A.line(c, [[tailX, tailY], [bx + 70, by + 40]], P.slate, li, [6, 5]);
          A.circle(c, tailX, tailY, 8, P.amber, P.ink, li);

          A.circle(c, bx, by, 76, P.paper, P.ink, lo);
          // Mini piston cylinder + crankshaft inside circle
          A.rrect(c, bx - 28, by - 36, 56, 48, 6, P.slate, P.ink, li);
          const pistY = by - 14 + Math.sin(t * 14) * 10;
          A.rrect(c, bx - 18, pistY - 10, 36, 20, 3, P.amber, P.ink, li);
          A.line(c, [[bx, pistY + 10], [bx, by + 28]], P.ink, lo);
          A.circle(c, bx, by + 28, 12, P.dark, P.ink, li);
          // Spinning 2-blade pusher prop icon
          const blade = 38 * Math.cos(t * 14);
          A.line(c, [[bx - 48, by - blade], [bx - 48, by + blade]], P.ink, lo);
        });
      }

      // 2. Nose warhead breakout callout (480, -285)
      if (warheadP > 0.01) {
        A.withA(c, warheadP, () => {
          const bx = 480;
          const by = -285;
          const noseX = droneX + 46 * droneScale;
          const noseY = droneY;
          A.line(c, [[noseX, noseY], [bx - 70, by + 40]], P.amber, li, [6, 5]);
          A.circle(c, noseX, noseY, 8, P.amber, P.ink, li);

          A.circle(c, bx, by, 76, P.paper, P.ink, lo);
          // Warhead cone inside breakout circle
          A.poly(
            c,
            [
              [bx - 42, by - 26],
              [bx + 12, by - 26],
              [bx + 52, by],
              [bx + 12, by + 26],
              [bx - 42, by + 26],
            ],
            P.amber,
            P.ink,
            lo,
          );
          A.circle(c, bx + 28, by, 8, P.enemy, P.ink, li);
          // Blast symbol rays
          for (let a = 0; a < 6; a++) {
            const ang = (a * Math.PI) / 3;
            A.line(
              c,
              [
                [bx - 12 + Math.cos(ang) * 10, by + Math.sin(ang) * 10],
                [bx - 12 + Math.cos(ang) * 20, by + Math.sin(ang) * 20],
              ],
              P.enemy,
              li,
            );
          }
        });
      }

      // 3. Satellite navigation receiver highlight ring on dorsal fuselage
      if (satNavP > 0.01) {
        A.withA(c, satNavP, () => {
          const rxX = droneX - 2 * droneScale;
          const rxY = droneY - 2 * droneScale;
          A.rrect(c, rxX - 68, rxY - 52, 136, 96, 12, null, P.sky, lo);
        });
      }

      // 4. Motorway car speed comparison + > 1,000 km range scale (227.0 – 231.90s)
      if (carP > 0.01) {
        A.withA(c, carP, () => {
          const roadY = 310;
          // Motorway asphalt strip & dashed lane markings
          A.rrect(c, -860, roadY - 24, 1720, 48, 4, P.dark, P.ink, lo);
          A.line(c, [[-840, roadY], [840, roadY]], P.paper, li, [28, 22]);

          // Range ruler bar above motorway
          const rulerY = 160;
          A.line(c, [[-640, rulerY], [640, rulerY]], P.ink, lo);
          A.line(c, [[-640, rulerY - 16], [-640, rulerY + 16]], P.ink, lo);
          A.line(c, [[640, rulerY - 16], [640, rulerY + 16]], P.ink, lo);
          for (let tick = -480; tick <= 480; tick += 160) {
            A.line(c, [[tick, rulerY - 8], [tick, rulerY + 8]], P.ink2, li);
          }

          // Vertical speed synchronization line linking drone and motorway car
          const carX = droneX;
          const carY = roadY - 18;
          A.line(c, [[droneX, droneY + 58], [carX, carY - 34]], P.sky, li, [8, 8]);

          // Velocity arrows (equal length on drone and car)
          for (const vy of [droneY - 88, carY - 46]) {
            A.line(c, [[carX - 45, vy], [carX + 65, vy]], P.amber, lo);
            A.poly(c, [[carX + 60, vy - 8], [carX + 78, vy], [carX + 60, vy + 8]], P.amber, null, 0);
          }

          // Clean 2D motorway car silhouette
          c.save();
          c.translate(carX, carY);
          A.rrect(c, -52, -18, 104, 20, 6, P.sky, P.ink, lo);
          A.poly(c, [[-28, -18], [-12, -34], [24, -34], [38, -18]], P.glass, P.ink, lo);
          A.circle(c, -30, 4, 11, P.dark, P.ink, lo);
          A.circle(c, 30, 4, 11, P.dark, P.ink, lo);
          c.restore();
        });
      }

      K.end(c);

      // Callout: > 1,000 km
      if (carP > 0.05) {
        drawCallout(c, [960, 700], [960, 625], '> 1,000 km', carP, P.amber);
      }
    } else {
      // ── PHASE 2 (231.90 – 243.82s): Top-down Map — Loud/No-dodge, Cost Ratio & Night Swarm ──
      K.begin(c, cam);
      drawTacticalMapBg(c, cam, { showFrontStrip: false });

      const swarmP = A.eio(t, CUE.ch4_nightSwarm, CUE.ch4_linkShared);
      const costP = A.eo(t, CUE.ch4_arithmeticValue, CUE.ch4_arithmeticValue + 1.2);

      // Night overlay tint as swarm arrives ("a few hundred in one night keep a whole air defense awake")
      if (swarmP > 0.01) {
        A.withA(c, 0.22 * swarmP, () => {
          A.rrect(c, -960, -540, 1920, 1080, 0, P.dark, null, 0);
        });
      }

      // 3 Enemy SAM batteries on right defending strategic sector
      const samPositions: [number, number][] = [
        [560, -240],
        [610, 20],
        [550, 260],
      ];
      for (let i = 0; i < samPositions.length; i++) {
        const [sx, sy] = samPositions[i]!;
        // SAM engagement ring
        A.withA(c, 0.14 + 0.1 * Math.sin(t * 5 + i), () => {
          A.circle(c, sx, sy, 230, P.enemy, null, 0);
        });
        A.circle(c, sx, sy, 230, null, P.enemy, li);
        drawSamSystem(c, sx, sy, 1.2, {
          view: 'top',
          radarAngle: t * 4.5 + i * 1.3,
        });
      }

      // Before swarm (231.90 – 236.82s): Single one-way drone flying rigid straight line + loud acoustic waves
      const leadU = A.ph(t, CUE.ch4_cannotDodgeLoud, CUE.ch4_linkShared);
      const leadX = A.lerp(-680, 360, leadU);
      const leadY = 20;

      // Straight rigid trajectory line (cannot dodge)
      A.line(c, [[-760, leadY], [580, leadY]], P.olive, li, [12, 8]);

      // Concentric loud engine noise rings ("easy to hear coming")
      for (let r = 0; r < 3; r++) {
        const waveP = ((t * 1.4 + r / 3) % 1 + 1) % 1;
        A.withA(c, (1 - waveP) * 0.75, () => {
          A.circle(c, leadX - 24, leadY, 28 + waveP * 115, null, P.amber, li);
        });
      }
      drawOneWayDrone(c, leadX, leadY, 1.35, { view: 'top', propPhase: t * 18 });

      // Night swarm of 16 additional one-way drones (236.82 – 243.82s)
      if (swarmP > 0.01) {
        const offsets: [number, number, number][] = [
          [-140, -310, 0.02],
          [-260, -230, 0.06],
          [-80, -170, 0.0],
          [-340, -120, 0.1],
          [-190, -60, 0.04],
          [-420, 10, 0.14],
          [-280, 95, 0.08],
          [-120, 155, 0.02],
          [-380, 210, 0.12],
          [-220, 285, 0.05],
          [-500, -270, 0.18],
          [-540, -85, 0.2],
          [-480, 130, 0.16],
          [-590, 250, 0.22],
          [-650, -180, 0.25],
          [-670, 45, 0.26],
        ];

        const interceptTimes = [CUE.ch4_samFire1 + 1.0, CUE.ch4_samFire2 + 1.0, CUE.ch4_samFire3 + 1.0];

        for (let i = 0; i < offsets.length; i++) {
          const [ox, oy, delay] = offsets[i]!;
          const u = A.clamp01((swarmP - delay) / (1 - delay));
          if (u <= 0) continue;
          const dx = ox + u * 820;
          const dy = oy;

          // First 3 drones get intercepted by the 3 SAM missiles
          if (i < 3 && t >= interceptTimes[i]!) continue;

          drawOneWayDrone(c, dx, dy, 0.92, { view: 'top', propPhase: t * 18 + i });
        }

        // 3 SAM intercepts firing at 239.0s, 240.4s, 241.8s
        const fires: [number, [number, number], [number, number]][] = [
          [CUE.ch4_samFire1, samPositions[0]!, [190, -310]],
          [CUE.ch4_samFire2, samPositions[1]!, [230, -170]],
          [CUE.ch4_samFire3, samPositions[2]!, [210, 155]],
        ];

        for (const [fStart, [sx, sy], [tx, ty]] of fires) {
          const mU = A.ph(t, fStart, fStart + 1.0);
          if (mU > 0 && mU < 1) {
            const mx = A.lerp(sx, tx, mU);
            const my = A.lerp(sy, ty, mU);
            const ang = Math.atan2(ty - sy, tx - sx);
            A.line(c, [[sx, sy], [mx, my]], P.amber, li, [6, 5]);
            drawMissile(c, mx, my, ang, 1.05, { color: P.paper, flame: true });
          }
          const expU = A.ph(t, fStart + 0.95, fStart + 1.95);
          if (expU > 0 && expU < 1) {
            drawExplosion(c, tx, ty, 68, expU);
          }
        }
      }

      // Cost Arithmetic Comparison Card (top-left, 234.96 – 243.82s)
      // "A single one costs a small fraction of the missile that would be fired to stop it"
      if (costP > 0.01) {
        A.withA(c, costP, () => {
          const cx = -540;
          const cy = -315;
          A.rrect(c, cx - 250, cy - 110, 500, 220, 14, P.paper, P.ink, lo);

          // Top row: 1 One-Way Drone = 1 small cost block
          drawOneWayDrone(c, cx - 150, cy - 45, 0.65, { view: 'top', propPhase: 0.4 });
          A.rrect(c, cx - 45, cy - 62, 28, 34, 4, P.olive, P.ink, li);

          // Divider
          A.line(c, [[cx - 220, cy], [cx + 220, cy]], P.bg2, li);

          // Bottom row: 1 SAM Interceptor Missile = 8 expensive amber cost blocks
          drawMissile(c, cx - 150, cy + 52, 0, 1.15, { color: P.paper, flame: false });
          for (let b = 0; b < 8; b++) {
            A.rrect(c, cx - 45 + b * 34, cy + 35, 28, 34, 4, P.amber, P.ink, li);
          }
        });
      }

      K.end(c);
    }
  }
}
