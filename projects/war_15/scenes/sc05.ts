// scenes/sc05.ts — Chương 5 (364.64 – 424.68s):
// Điểm yếu của tín hiệu và vệ tinh: Sóng định vị yếu từ 20.000 km bị xe tải tác chiến điện tử gây nhiễu (Jamming)
// và giả mạo giờ (Spoofing); Vệ tinh không giáp chạy trên đường ray cố định bị chiếu laser và bắn hạ bằng tên lửa ASAT
// tạo đám mây mảnh vỡ → Chuyển dịch sang mạng lưới hàng trăm vệ tinh nhỏ giá rẻ.

import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P, LINE } from './shared/palette';
import * as Assets from './_assets';
import { CUE } from './_cue';
import { ORBIT_WORLD } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // ── SHOT 5.1 (364.64 – 372.40s): ORBITAL / SIDE — Nối khớp cuối Ch4: Tín hiệu đi 20.000 km suy yếu dần ──
    if (t < 372.4) {
      const cam: K.Cam = { x: 960, y: 540, z: 1.0 };
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      Assets.drawSideTerrain(c, 80, 1840, 920);
      Assets.drawHowitzer(c, 640, 920, 1.05, 'side', 'ally', 1, 0.45);
      Assets.drawTank(c, 1280, 920, 1.05, 'side', 'ally', -1);

      // Cung quỹ đạo MEO khớp 100% với cuối Chương 4
      c.save();
      c.beginPath();
      c.moveTo(160, 290);
      c.quadraticCurveTo(960, 130, 1760, 290);
      c.setLineDash([16, 12]);
      c.strokeStyle = P.sky;
      c.lineWidth = lw;
      c.stroke();
      c.restore();

      const satPositions: A.Pt[] = [
        [380, 250],
        [760, 195],
        [1160, 195],
        [1540, 250],
      ];

      // Hiệu ứng suy giảm cường độ tia sóng khi đi xuống mặt đất ("arrives weaker than a bedside lamp")
      const fadeProgress = A.eio(t, 365.5, 370.5);
      for (const [sx, sy] of satPositions) {
        // Nửa trên tia sóng còn rõ, nửa dưới mờ dần khi fadeProgress tăng
        const midX = A.lerp(sx, 960, 0.5);
        const midY = A.lerp(sy + 55, 910, 0.5);
        UI.dashed(c, [sx, sy + 55], [midX, midY], P.sky, li * 1.2, t * 120);
        A.withA(c, A.lerp(1.0, 0.18, fadeProgress), () => {
          UI.dashed(c, [midX, midY], [960, 910], P.sky, li * (1 - fadeProgress * 0.45), t * 120);
        });
        Assets.drawNavSat(c, sx, sy, 1.05, 'cutaway', {
          clockPhase: t * 4,
        });
      }

      // Thanh đo cường độ tín hiệu (Signal Strength Bar) tại mặt đất (960, 845) tụt xuống mức cực yếu
      if (t >= 367.2) {
        const bp = A.sm(t, 367.2, 368.2);
        const level = A.lerp(0.85, 0.08, A.eio(t, 367.5, 370.8));
        UI.bar(c, 810, 825, 300, 28, level, level < 0.25 ? P.amber : P.sky, bp);
      }

      K.end(c);

      if (t >= 366.3 && t <= 370.2) {
        UI.callout(c, '20,000 km', 1480, 390, {
          p: A.win(t, 366.3, 370.2, 0.2, 0.25),
          color: P.sky,
        });
      }
      return;
    }

    // ── SHOT 5.2 (372.40 – 385.56s): SIDE — Xe tải tác chiến điện tử gây nhiễu (Jamming) & phát giờ giả (Spoofing) lừa UAV ──
    if (t < CUE.ch5_satellites_exposed) {
      const cam = K.track(
        t,
        [
          [372.4, { x: 960, y: 540, z: 1.02 }],
          [380.5, { x: 960, y: 510, z: 1.08 }],
          [385.56, { x: 960, y: 510, z: 1.08 }],
        ],
        A.eio
      );
      K.begin(c, cam);
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      Assets.drawSideTerrain(c, 80, 1840, 880);

      // Vệ tinh định vị ở tít trên cao (780, 140) phát tia sóng rất mảnh và mờ xuống
      Assets.drawNavSat(c, 780, 140, 0.72, 'cutaway', { clockPhase: t * 4 });

      // Xe tải gây nhiễu (Jammer Truck) của đối phương ở gần tiền tuyến (1340, 880)
      const jamPower = A.sm(t, CUE.ch5_jammer_truck, 377.2);
      Assets.drawJammerTruck(c, 1340, 880, 1.45, 'side', 'foe', -1, jamPower);

      // Vòm phủ sóng nhiễu đỏ khổng lồ át hoàn toàn vùng tiền tuyến ("shout on the same frequency and drown it out")
      if (jamPower > 0.05) {
        for (let r = 1; r <= 4; r++) {
          const prog = ((t * 0.7 + r * 0.25) % 1);
          const rad = 120 + prog * 620 * jamPower;
          A.withA(c, (1 - prog) * 0.55 * jamPower, () => {
            c.beginPath();
            c.arc(1355, 740, rad, -Math.PI * 0.92, -Math.PI * 0.08);
            c.strokeStyle = P.enemy;
            c.lineWidth = lw * 1.4;
            c.stroke();
          });
        }
      }

      // Chiếc UAV phe ta đang bay từ trái sang phải; từ 381.26s ("broadcast fake timestamps that trick a drone into thinking it is somewhere else"):
      const spoofP = A.eio(t, CUE.ch5_fake_timestamps_spoof, 385.0);
      const uavTrueX = A.lerp(420, 1060, A.ph(t, 372.4, 385.56));
      // Khi bị đánh lừa bởi giờ giả, UAV tự chúc mũi lao chệch hướng lên/xuống khỏi đường chuẩn
      const uavTrueY = 470 + spoofP * 145;
      const uavRot = spoofP * 0.35;

      // Tia sóng thật cực mảnh từ vệ tinh xuống UAV bị đứt trước vòm nhiễu
      A.withA(c, 0.25, () => {
        UI.dashed(c, [780, 190], [uavTrueX, uavTrueY], P.sky, li, t * 80);
      });

      // Từ 381.26s: Xe tải bắn các gói "mốc đồng hồ giả" (màu đỏ P.enemy) thẳng vào bộ thu của UAV, làm hiện bóng UAV ảo ở vị trí sai lệch!
      if (t >= CUE.ch5_fake_timestamps_spoof - 0.2) {
        const sp = A.sm(t, CUE.ch5_fake_timestamps_spoof - 0.2, 382.2);
        UI.dashed(c, [1355, 740], [uavTrueX, uavTrueY], P.enemy, lw, -t * 160);

        // Các biểu tượng đồng hồ giả màu đỏ bay từ ăng-ten xe tải lên UAV
        for (const pOff of [0.25, 0.65]) {
          const prog = ((t * 0.8 + pOff) % 1);
          const cx = A.lerp(1355, uavTrueX, prog);
          const cy = A.lerp(740, uavTrueY, prog);
          A.circle(c, cx, cy, 14 * sp, P.paper, P.enemy, lw);
          A.line(c, [[cx, cy], [cx - 7, cy - 5]], P.enemy, li);
          A.line(c, [[cx, cy], [cx + 6, cy - 6]], P.enemy, li);
        }

        // Bóng ma vị trí ảo (Ghost Drone) nơi UAV tưởng mình đang đứng ("thinking it is somewhere else")
        const ghostX = uavTrueX - 180 * sp;
        const ghostY = 330;
        A.withA(c, 0.42 * sp, () => {
          Assets.drawGuidedMunition(c, ghostX, ghostY, 1.35, 'uav', 'side', 0);
        });
        A.line(c, [[uavTrueX, uavTrueY], [ghostX, ghostY]], P.enemy, li, [10, 8]);
        UI.focus(c, ghostX - 70, ghostY - 55, 140, 80, sp, P.enemy, li);
      }

      // Vẽ chiếc UAV thực
      Assets.drawGuidedMunition(c, uavTrueX, uavTrueY, 1.35, 'uav', 'cutaway', uavRot);

      K.end(c);
      return;
    }

    // ── SHOT 5.3 (385.56 – 414.10s): CUTAWAY → ORBITAL / SIDE — Không giáp, ít nhiên liệu, chạy trên đường ray, bị Laser làm chói & Tên lửa ASAT bắn nổ mảnh văng ──
    if (t < CUE.ch5_constellations_small) {
      // 5.3A (385.56 – 398.14s): Cận cảnh vệ tinh không giáp & bình nhiên liệu né tránh gần cạn
      if (t < CUE.ch5_travels_on_rails) {
        const cam: K.Cam = { x: 960, y: 540, z: 1.15 };
        K.begin(c, cam);
        const lw = A.px(c, LINE.outer);
        const li = A.px(c, LINE.inner);

        // Vệ tinh trinh sát lớn ở chính giữa (960, 520)
        Assets.drawOpticalSat(c, 960, 520, 1.85, 'cutaway', { rayProgress: 0.5 });

        // 390.28 – 395.68s ("carries no armor because every kilogram lifted into orbit costs a fortune in fuel"):
        // Hai tấm giáp thép dày thử ốp vào hai bên sườn vệ tinh rồi bị gạch chéo X đỏ
        if (t >= CUE.ch5_no_armor_fuel - 0.3) {
          const armP = A.win(t, CUE.ch5_no_armor_fuel - 0.3, 395.8, 0.3, 0.3);
          A.withA(c, armP, () => {
            A.rrect(c, 770, 390, 32, 240, 6, P.slate, P.ink, lw);
            A.rrect(c, 1118, 390, 32, 240, 6, P.slate, P.ink, lw);
            UI.xMark(c, 786, 510, 36, A.sm(t, 391.0, 391.8), P.enemy, lw * 1.8);
            UI.xMark(c, 1134, 510, 36, A.sm(t, 391.0, 391.8), P.enemy, lw * 1.8);
          });
        }

        // 395.50 – 398.14s ("and it holds very little propellant to dodge"):
        // Thanh đo bình nhiên liệu (Propellant gauge) bên cạnh thân vệ tinh tụt xuống mức đỏ cạn kiệt
        if (t >= 395.2) {
          const fp = A.sm(t, 395.2, 396.0);
          const fuelLvl = A.lerp(0.45, 0.08, A.eio(t, 395.5, 397.6));
          UI.bar(c, 830, 260, 260, 28, fuelLvl, P.enemy, fp);
        }

        K.end(c);
        return;
      }

      // 5.3B (398.14 – 414.10s): ORBITAL / SIDE — Vệ tinh chạy trên đường ray cố định, bị Laser mặt đất chiếu chói (404.54s) và Tên lửa ASAT bắn vỡ thành đám mây mảnh văng (409.5s)
      const asatLaunchT = CUE.ch5_asat_missiles + 0.2; // 407.16s
      const asatHitT = 409.45; // lúc đâm vỡ vệ tinh trên quỹ đạo
      const baseCam: K.Cam = { x: 960, y: 850, z: 1.28 };
      const cam = K.withShake(baseCam, t, [[asatHitT, 22, 0.75]]);

      K.begin(c, cam);
      const { cx, cy, rEarth, rLeo } = ORBIT_WORLD;
      const lw = A.px(c, LINE.outer);
      const li = A.px(c, LINE.inner);

      // Đường ray quỹ đạo cố định ("travels on rails in full view of the enemy")
      c.save();
      c.beginPath();
      c.arc(cx, cy, rLeo, -Math.PI * 0.82, -Math.PI * 0.18);
      c.strokeStyle = P.slate;
      c.lineWidth = lw;
      c.stroke();
      c.beginPath();
      c.arc(cx, cy, rLeo - 16, -Math.PI * 0.82, -Math.PI * 0.18);
      c.strokeStyle = P.dark;
      c.lineWidth = li;
      c.stroke();
      for (let a = -0.6; a <= 0.6; a += 0.042) {
        const rx0 = cx + Math.sin(a) * (rLeo - 20);
        const ry0 = cy - Math.cos(a) * (rLeo - 20);
        const rx1 = cx + Math.sin(a) * (rLeo + 6);
        const ry1 = cy - Math.cos(a) * (rLeo + 6);
        A.line(c, [[rx0, ry0], [rx1, ry1]], P.dark, li);
      }
      c.restore();

      Assets.drawEarthArc(c, cx, cy, rEarth, { showAtmo: true, showGrid: true });

      // Trạm chiếu Laser mặt đất ở bên trái (cx - 190, cy - rEarth + 14) & Bệ phóng tên lửa ASAT ở bên phải (cx + 150, cy - rEarth + 10)
      const laserX = cx - 190;
      const laserY = cy - rEarth + 14;
      A.rrect(c, laserX - 28, laserY - 22, 56, 22, 4, P.enemy, P.ink, lw);
      A.circle(c, laserX, laserY - 26, 14, P.enemyLight, P.ink, lw);

      const asatBaseX = cx + 150;
      const asatBaseY = cy - rEarth + 10;
      A.rrect(c, asatBaseX - 30, asatBaseY - 18, 60, 18, 4, P.enemy, P.ink, lw);

      // Vị trí Vệ tinh mục tiêu trượt dọc đường ray tới điểm va chạm (góc 0.06 rad tại asatHitT)
      const satAng = A.lerp(-0.26, 0.06, A.ph(t, 398.14, asatHitT));
      const satX = cx + Math.sin(satAng) * rLeo;
      const satY = cy - Math.cos(satAng) * rLeo;

      // Vệ tinh thứ hai đi phía sau trên cùng vành đai quỹ đạo (để thấy đám mây mảnh văng đe dọa mọi thứ khác trong cùng tầng: "threaten everything else in the same band")
      const sat2Ang = satAng - 0.34 + Math.max(0, t - asatHitT) * 0.045;
      const sat2X = cx + Math.sin(sat2Ang) * rLeo;
      const sat2Y = cy - Math.cos(sat2Ang) * rLeo;
      Assets.drawNavSat(c, sat2X, sat2Y, 0.62, 'side', { rot: sat2Ang });

      // Tia Laser mặt đất chiếu làm chói ống kính quang học (404.54 – 407.1s)
      const dazzleP = A.win(t, CUE.ch5_ground_lasers, 407.2, 0.2, 0.3);
      if (dazzleP > 0.01 && t < asatHitT) {
        A.withA(c, dazzleP, () => {
          A.line(c, [[laserX, laserY - 32], [satX, satY + 45]], P.enemy, lw * 1.8);
          A.line(c, [[laserX, laserY - 32], [satX, satY + 45]], P.white, li);
        });
      }

      // Tên lửa diệt vệ tinh ASAT phóng từ (asatBaseX, asatBaseY) lúc 407.16s lao lên đâm trúng (satX, satY) lúc 409.45s
      if (t >= asatLaunchT && t < asatHitT) {
        const mP = A.ei(t, asatLaunchT, asatHitT);
        FX.straightShot(c, [asatBaseX, asatBaseY - 20], [satX, satY], mP, {
          color: P.enemy,
          w: 6,
          trail: 0.45,
        });
      }

      // Trước khi bị đâm nổ: vẽ vệ tinh mục tiêu; Sau khi nổ (t >= asatHitT): nổ tung thành đám mây mảnh vỡ bay dọc quỹ đạo!
      if (t < asatHitT) {
        Assets.drawOpticalSat(c, satX, satY, 0.76, 'side', {
          rot: satAng,
          dazzled: dazzleP,
        });
      } else {
        const age = t - asatHitT;
        FX.explosion(c, satX, satY, 130, A.ph(t, asatHitT, asatHitT + 0.75), lw);
        // Đám mây mảnh vỡ tốc độ cao (clouds of fast shrapnel) tỏa dọc theo vòng quỹ đạo LEO
        for (let i = 0; i < 22; i++) {
          const dir = i % 2 === 0 ? 1 : -1;
          const speed = (0.04 + 0.09 * A.rnd(i + 3)) * dir;
          const dAng = 0.06 + speed * age;
          const dR = rLeo + (A.rnd(i * 7) - 0.5) * 48 * Math.min(1, age * 0.8);
          const dx = cx + Math.sin(dAng) * dR;
          const dy = cy - Math.cos(dAng) * dR;
          c.save();
          c.translate(dx, dy);
          c.rotate(age * (5 + (i % 4)));
          A.poly(c, [[-8, -5], [9, -3], [4, 7], [-6, 5]], i % 3 === 0 ? P.amber : P.slate, P.ink, li);
          c.restore();
        }
        // Vòng cảnh báo nguy hiểm quanh vệ tinh thứ 2 khi mảnh vỡ bay tới gần
        if (age > 1.2) {
          UI.ring(c, sat2X, sat2Y, 65, (age * 1.4) % 1, P.enemy, lw);
        }
      }

      K.end(c);
      return;
    }

    // ── SHOT 5.4 (414.10 – 424.68s): ORBITAL NETWORK — Chuyển từ vài vệ tinh khổng lồ sang chòm hàng trăm vệ tinh nhỏ ──
    const cam: K.Cam = { x: 960, y: 540, z: 1.02 };
    K.begin(c, cam);
    const lw = A.px(c, LINE.outer);
    const li = A.px(c, LINE.inner);

    const ecx = 960;
    const ecy = 560;
    const rE = 210;
    const rSwarm = 335;

    Assets.drawEarthArc(c, ecx, ecy, rE, {
      rot: (t - 414.1) * 0.05,
      showAtmo: true,
      showGrid: true,
    });

    // Giai đoạn đầu (414.10 – 418.2s): 2 vệ tinh khổng lồ cũ mờ đi, nhường chỗ cho chòm 16 vệ tinh nhỏ giá rẻ xuất hiện dày đặc quanh quỹ đạo thấp
    const shiftP = A.eio(t, 415.5, 418.8);
    if (shiftP < 0.95) {
      A.withA(c, 1 - shiftP, () => {
        Assets.drawOpticalSat(c, ecx - 370, ecy - 180, 0.85, 'side', { rot: -0.5 });
        Assets.drawOpticalSat(c, ecx + 370, ecy - 180, 0.85, 'side', { rot: 0.5 });
        UI.xMark(c, ecx - 370, ecy - 180, 48, A.sm(t, 416.2, 417.0), P.enemy, lw * 1.8);
        UI.xMark(c, ecx + 370, ecy - 180, 48, A.sm(t, 416.2, 417.0), P.enemy, lw * 1.8);
      });
    }

    // Vẽ chòm 16 vệ tinh nhỏ (constellation of small cheap ones) nối mạng lưới với nhau quanh quỹ đạo thấp
    const N = 16;
    const nodes: A.Pt[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (t - 414.1) * 0.12;
      const r = rSwarm + (i % 2 === 0 ? -18 : 18);
      nodes.push([ecx + Math.sin(a) * r, ecy - Math.cos(a) * r]);
    }

    // Hai mắt lưới (index 15 và 1) bị bắn hỏng lúc 421.8s ("where losing a few barely slows the network")
    const killT = 421.8;
    const lost = t >= killT;

    if (shiftP > 0.1) {
      A.withA(c, shiftP, () => {
        // Đường liên kết mạng lưới giữa các vệ tinh nhỏ lân cận
        for (let i = 0; i < N; i++) {
          const next = (i + 1) % N;
          const next2 = (i + 2) % N;
          const deadEdge1 = lost && (i === 15 || next === 15 || i === 1 || next === 1);
          if (!deadEdge1) {
            A.line(c, [nodes[i]!, nodes[next]!], 'rgba(56,189,248,0.45)', li);
          }
          A.line(c, [nodes[i]!, nodes[next2]!], 'rgba(56,189,248,0.28)', li, [8, 8]);
        }

        // Luồng dữ liệu đang truyền từ đỉnh trái (node 13) sang đỉnh phải (node 3) xuống mặt đất:
        // Khi node 15 & 1 bị mất, đường truyền tự động bẻ qua node 14 -> 0 -> 2 -> 3 không hề gián đoạn!
        const activeRoute = lost ? [13, 14, 0, 2, 3] : [13, 14, 15, 0, 1, 2, 3];
        for (let k = 0; k < activeRoute.length - 1; k++) {
          const pA = nodes[activeRoute[k]!]!;
          const pB = nodes[activeRoute[k + 1]!]!;
          UI.dashed(c, pA, pB, P.amber, lw * 1.1, -t * 160);
        }

        // Vẽ từng vệ tinh nhỏ
        for (let i = 0; i < N; i++) {
          const [nx, ny] = nodes[i]!;
          const isDead = lost && (i === 15 || i === 1);
          c.save();
          c.translate(nx, ny);
          A.rrect(c, -34, -8, 68, 16, 3, P.slate, P.ink, li);
          A.rrect(c, -14, -14, 28, 28, 5, isDead ? P.dark : P.olive, P.ink, lw);
          A.circle(c, 0, 0, 5, isDead ? P.enemy : P.sky, null, 0);
          c.restore();

          if (isDead) {
            FX.explosion(c, nx, ny, 55, A.ph(t, killT, killT + 0.55), li);
            UI.xMark(c, nx, ny, 22, A.sm(t, killT + 0.1, killT + 0.5), P.enemy, lw * 1.4);
          }
        }
      });
    }

    K.end(c);
  }
}
