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
  drawQuadDrone,
  drawSamSystem,
} from './_assets';

// sc15 (327.60–353.00s): Air defense cost arithmetic ($500 drone vs $300,000 missile)
// and swarm saturation exhausting expensive SAM launchers.
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    cam = K.withShake(cam, t, [
      [CUE.ch5_samHitsCheapDrone, 16, 0.5],
      [CUE.ch5_samSwarmFire1 + 1.0, 12, 0.4],
      [CUE.ch5_samSwarmFire2 + 1.0, 12, 0.4],
    ]);

    const groundY = 300;
    const lo = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const inSwarmPhase = t >= CUE.ch5_sentInNumbers;

    K.begin(c, cam);
    drawAirspaceBg(c, cam, { groundY, showBands: false });

    const samX = 540;

    if (!inSwarmPhase) {
      // ── PHASE 1 (327.60 – 342.26s): 1 Cheap Drone ($500) vs 1 Expensive SAM Missile ($300,000) ──
      const costP = A.eo(t, CUE.ch5_hundredVsHundredThousand - 0.8, CUE.ch5_hundredVsHundredThousand + 0.8);
      const fireU = A.ph(t, CUE.ch5_samFiresExpensive, CUE.ch5_samHitsCheapDrone);
      const isHit = t >= CUE.ch5_samHitsCheapDrone;
      const lossP = A.eio(t, CUE.ch5_samHitsCheapDrone + 0.5, CUE.ch5_disturbingArithmetic + 1.0);

      // Enemy SAM launcher on right ground
      drawSamSystem(c, samX, groundY, 1.65, {
        view: 'side',
        missiles: t >= CUE.ch5_samFiresExpensive ? 1 : 2,
        elevateDeg: -36,
      });

      // Incoming $500 quadcopter on left approaching center (-80, -130)
      const dU = A.ph(t, CUE.ch5_cheapnessCuts, CUE.ch5_samHitsCheapDrone);
      const droneX = A.lerp(-580, -80, dU);
      const droneY = -130;

      if (!isHit) {
        drawQuadDrone(c, droneX, droneY, 2.1, {
          view: 'side',
          fpvWarhead: true,
          rotorPhase: t * 24,
        });

        // Single tiny cost block above the $500 drone
        if (costP > 0.01) {
          A.withA(c, costP, () => {
            A.rrect(c, droneX - 16, droneY - 88, 32, 32, 5, P.olive, P.ink, lo);
          });
        }
      }

      // SAM missile flying from launcher to hit the cheap drone
      if (fireU > 0 && fireU < 1) {
        const mx = A.lerp(samX - 20, -80, fireU);
        const my = A.lerp(groundY - 95, droneY, fireU);
        const ang = Math.atan2(droneY - (groundY - 95), -80 - (samX - 20));
        A.line(c, [[samX - 20, groundY - 95], [mx, my]], P.amber, lo, [10, 6]);
        drawMissile(c, mx, my, ang, 1.5, { color: P.paper, flame: true });
      }

      const expU = A.ph(t, CUE.ch5_samHitsCheapDrone, CUE.ch5_samHitsCheapDrone + 1.1);
      if (expU > 0 && expU < 1) {
        drawExplosion(c, -80, droneY, 115, expU);
      }

      // Defender's Huge Cost Block Stack ($300,000 = 24 golden blocks in 4x6 grid above SAM)
      if (costP > 0.01) {
        A.withA(c, costP, () => {
          const bx0 = 360;
          const by0 = -280;
          A.rrect(c, bx0 - 24, by0 - 28, 308, 224, 12, P.paper, P.ink, lo);

          for (let r = 0; r < 4; r++) {
            for (let col = 0; col < 6; col++) {
              const dropY = lossP * (35 + ((r * 6 + col) % 5) * 14);
              const blkCol = lossP > 0.3 ? P.enemyLight : P.amber;
              A.rrect(
                c,
                bx0 + col * 44,
                by0 + r * 44 + dropY * 0.25,
                36,
                34,
                4,
                blkCol,
                P.ink,
                li,
              );
            }
          }

          // Economic Loss Slash ("has already lost something, even if the missile hits")
          if (lossP > 0.05) {
            A.line(c, [[bx0 - 10, by0 - 10], [bx0 + 270, by0 + 180]], P.enemy, lo * 1.6);
            A.line(c, [[bx0 + 270, by0 - 10], [bx0 - 10, by0 + 180]], P.enemy, lo * 1.6);
            // Downward economic drain arrow on left of stack
            A.line(c, [[300, -260], [300, -60]], P.enemy, lo * 1.5);
            A.poly(c, [[284, -75], [316, -75], [300, -40]], P.enemy, P.ink, li);
          }
        });
      }

      K.end(c);

      if (costP > 0.05) {
        if (!isHit) {
          const sx = 960 + droneX;
          drawCallout(c, [sx, 330], [sx, 250], '$500', costP, P.olive);
        }
        drawCallout(c, [1470, 260], [1470, 175], '$300,000', costP, P.amber);
      }
    } else {
      // ── PHASE 2 (342.26 – 353.00s): Sent in Numbers — Exhausting Expensive Air Defense ──
      const swarmU = A.ph(t, CUE.ch5_sentInNumbers, CUE.ch5_cheapAnswers);

      // SAM launcher fires its 2 missiles at 345.0s and 346.5s, then runs completely out of ammo!
      const mLeft = t < CUE.ch5_samSwarmFire1 ? 2 : t < CUE.ch5_samSwarmFire2 ? 1 : 0;
      drawSamSystem(c, samX, groundY, 1.65, {
        view: 'side',
        missiles: mLeft,
        elevateDeg: -38,
      });

      // Ammo counter gauge above SAM launcher (2/2 -> 1/2 -> 0/2 Red Empty!)
      const gx = samX;
      const gy = groundY - 215;
      A.rrect(c, gx - 58, gy - 26, 116, 44, 8, P.paper, mLeft === 0 ? P.enemy : P.ink, lo);
      for (let slot = 0; slot < 2; slot++) {
        const filled = slot < mLeft;
        A.rrect(
          c,
          gx - 42 + slot * 46,
          gy - 14,
          36,
          20,
          4,
          filled ? P.amber : P.bg2,
           mLeft === 0 ? P.enemy : P.ink,
          li,
        );
      }
      if (mLeft === 0) {
        A.line(c, [[gx - 48, gy - 18], [gx + 48, gy + 10]], P.enemy, lo);
      }

      // Wave of 10 cheap drones streaming across the sky left-to-right
      const wave: [number, number, 'quad' | 'oneway'][] = [
        [-220, -140, 'oneway'],
        [-340, -230, 'quad'],
        [-430, -80, 'quad'],
        [-540, -190, 'oneway'],
        [-640, -280, 'quad'],
        [-720, -120, 'oneway'],
        [-830, -220, 'quad'],
        [-920, -60, 'quad'],
        [-1040, -170, 'oneway'],
        [-1150, -260, 'quad'],
      ];

      const hitTimes = [CUE.ch5_samSwarmFire1 + 1.0, CUE.ch5_samSwarmFire2 + 1.0];

      for (let i = 0; i < wave.length; i++) {
        const [ox, oy, kind] = wave[i]!;
        const dx = ox + swarmU * 1180;
        const dy = oy + Math.sin(t * 2 + i) * 6;

        // First 2 drones get intercepted; the other 8 fly right over the empty SAM battery!
        if (i < 2 && t >= hitTimes[i]!) continue;

        if (kind === 'oneway') {
          drawOneWayDrone(c, dx, dy, 1.35, { view: 'side', propPhase: t * 18 + i });
        } else {
          drawQuadDrone(c, dx, dy, 1.5, { view: 'side', fpvWarhead: true, rotorPhase: t * 24 + i });
        }
        // Small single cost tag above each cheap drone
        A.rrect(c, dx - 10, dy - 48, 20, 20, 3, P.olive, P.ink, li);
      }

      // 2 SAM intercept missiles fired at the first 2 drones
      const intercepts: [number, [number, number]][] = [
        [CUE.ch5_samSwarmFire1, [80, -140]],
        [CUE.ch5_samSwarmFire2, [110, -230]],
      ];
      for (const [fStart, [tx, ty]] of intercepts) {
        const mU = A.ph(t, fStart, fStart + 1.0);
        if (mU > 0 && mU < 1) {
          const mx = A.lerp(samX - 20, tx, mU);
          const my = A.lerp(groundY - 95, ty, mU);
          const ang = Math.atan2(ty - (groundY - 95), tx - (samX - 20));
          A.line(c, [[samX - 20, groundY - 95], [mx, my]], P.amber, lo, [8, 6]);
          drawMissile(c, mx, my, ang, 1.35, { color: P.paper, flame: true });
        }
        const expU = A.ph(t, fStart + 0.95, fStart + 1.95);
        if (expU > 0 && expU < 1) {
          drawExplosion(c, tx, ty, 85, expU);
        }
      }

      K.end(c);
    }
  }
}
