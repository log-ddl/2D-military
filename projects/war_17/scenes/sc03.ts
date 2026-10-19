// sc03.ts — Chương 1 (43.35–79.20s): Câu hỏi trung tâm của cả phim —
// Nửa đầu (43.35–59.36s): Góc nhìn TOP bản đồ đội hình MBT + IFV đi đầu, hàng vạn APC đi sau.
// Nửa sau (59.36–79.20s): Góc nhìn SIDE mặt cắt đối chiếu 3 phương tiện đi qua "vùng chết của xe tải"
// (Xe tải mui trần bị mảnh đạn tiêu diệt vs IFV nặng nề vì tháp pháo lớn vs APC bỏ tháp pháo chở trọn tiểu đội).
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Chuyển đổi góc nhìn có chủ đích ở t = 59.36s ("And how does an armored box balance carrying a full squad...")
    if (t < CUE.balance_three_things) {
      // ── PHẦN A (43.35 – 59.36s): GÓC TOP — Đội hình chiến thuật MBT, IFV và số lượng áp đảo của APC ──
      const cam = K.track(
        t,
        [
          [43.35, { x: 120, y: 0, z: 1.05 }],
          [51.5, { x: 40, y: 0, z: 0.92 }],
          [59.35, { x: -110, y: 0, z: 0.85 }],
        ],
        A.eio,
      );

      K.begin(c, cam);
      M.mapBg(c, cam, { grid: 120 });

      // Hai trục đường tiến công ngang bản đồ
      M.road(c, [[-1200, -180], [1200, -180]], 28);
      M.road(c, [[-1200, 180], [1200, 180]], 28);
      M.front(c, [[680, -520], [680, 520]], 1, { color: P.enemy, side: 1, tooth: 24 });

      const marchX = (t - 43.35) * 18;

      // Hàng đầu (t=43.35s+): MBT và IFV hạng nặng tiến ở mũi nhọn ngay từ khung đầu cảnh
      V.drawCombatVehicle(c, { x: 260 + marchX, y: -180, s: 0.65, dir: 1, kind: 'mbt', view: 'top' });
      V.drawCombatVehicle(c, { x: 260 + marchX, y: 180, s: 0.65, dir: 1, kind: 'mbt', view: 'top' });
      V.drawCombatVehicle(c, { x: 10 + marchX, y: -180, s: 0.65, dir: 1, kind: 'ifv', view: 'top' });
      V.drawCombatVehicle(c, { x: 10 + marchX, y: 180, s: 0.65, dir: 1, kind: 'ifv', view: 'top' });

      // Phía sau (t=52.5s+): Hàng loạt xe bọc thép chở quân APC ("tens of thousands of APCs that mount little more than a machine gun")
      const pApc = A.sm(t, CUE.why_buy_thousands_apc - 0.8, CUE.why_buy_thousands_apc + 1.2);
      if (pApc > 0.01) {
        const rows = [-320, -180, 0, 180, 320];
        const cols = [-240, -490, -740];
        let idx = 0;
        for (const cx of cols) {
          for (const ry of rows) {
            const appear = A.sm(t, 52.6 + idx * 0.16, 53.3 + idx * 0.16);
            if (appear > 0.01) {
              A.withA(c, appear, () => {
                V.drawAPC8x8(c, {
                  x: cx + marchX,
                  y: ry,
                  s: 0.54,
                  dir: 1,
                  view: 'top',
                });
              });
            }
            idx++;
          }
        }
      }

      K.end(c);
      return;
    }

    // ── PHẦN B (59.36 – 79.20s): GÓC SIDE / CUTAWAY — Đối chiếu 3 làn phương tiện qua "vùng chết của xe tải" ──
    const cam = K.track(
      t,
      [
        [59.36, { x: -40, y: -135, z: 1.18 }],
        [68.0, { x: -20, y: -135, z: 1.18 }],
        [75.5, { x: 115, y: -138, z: 1.34 }],
        [79.2, { x: 165, y: -138, z: 1.42 }],
      ],
      A.eio,
    );

    K.begin(c, cam);

    V.drawSideGround(c, -1400, 1400, 0, 'paved');

    // Vùng mưa mảnh đạn (The zone where unarmored trucks die: x = -220..520)
    const zoneP = A.sm(t, 64.0, 65.8);
    if (zoneP > 0.01) {
      A.withA(c, zoneP * 0.16, () => {
        A.rrect(c, -240, -420, 780, 420, 0, P.enemy, null, 0);
      });
      A.line(c, [[-240, 0], [-240, -400]], P.enemy, 3, [12, 10]);
      A.line(c, [[540, 0], [540, -400]], P.enemy, 3, [12, 10]);

      // Đạn nổ chụp liên tiếp trên đỉnh vùng nguy hiểm ở t = 72.2s, 73.8s
      for (const [bt, bx] of [
        [72.2, -90],
        [73.8, 220],
      ] as const) {
        const age = t - bt;
        if (age > 0 && age < 2.6) {
          F.explosion(c, bx, -320, 62, A.clamp01(age / 0.9), LINE.outer);
          for (let i = -3; i <= 3; i++) {
            const tx = bx + i * 32;
            const ty = A.lerp(-320, -165, A.clamp01(age / 0.55));
            if (age < 0.7) A.line(c, [[bx, -320], [tx, ty]], P.enemy, 3);
          }
        }
      }
    }

    // 1. Bên trái (x = -420): Xe tải mui trần dừng cháy khi bước vào vùng mảnh đạn (71.16–75.56s)
    const truckHit = A.sm(t, 72.4, 73.2);
    V.drawOpenTruck(c, {
      x: -410,
      y: 0,
      s: 0.92,
      dir: 1,
      view: 'side',
      wheelRot: t < 72.4 ? t * 4 : 0,
      troopsAlive: 1 - truckHit * 0.85,
    });
    if (truckHit > 0.1) {
      F.smoke(c, -410, -110, t - 72.4, 0.85, 5, P.slate, 12);
      U.xMark(c, -410, -115, 42, truckHit, P.enemy, 7);
    }

    // 2. Ở giữa-trên (bay lơ lửng như phép đối chiếu ở t = 75.88–79.20s):
    // Khối tháp pháo nặng nề và giỏ tháp pháo của IFV bị nhấc bỏ ("without paying the crippling weight and space penalty of a heavy turret")
    const turretPenaltyP = A.sm(t, 75.2, 76.6);
    if (turretPenaltyP > 0.01) {
      A.withA(c, turretPenaltyP, () => {
        c.save();
        c.translate(-55, -245);
        // Tháp pháo + giỏ tháp pháo nặng
        A.rrect(c, -48, -10, 96, 58, 4, P.amber, P.ink, LINE.outer);
        A.poly(
          c,
          [
            [-54, -10],
            [-38, -52],
            [44, -52],
            [64, -22],
            [52, -10],
          ],
          P.oliveLight,
          P.ink,
          LINE.outer,
        );
        A.capsule(c, [58, -32], [150, -34], 10, P.dark, P.ink, LINE.outer);
        U.xMark(c, 5, -5, 44, A.sm(t, 76.5, 77.4), P.enemy, 7);
        c.restore();
      });
    }

    // 3. Chủ thể chính bên phải (x = 260): Chiếc APC 8x8 mặt cắt cutaway
    // Chở nguyên tiểu đội + trang bị đi xuyên qua vùng mưa mảnh đạn an toàn, mảnh đạn bật khỏi nóc
    const apcX = A.lerp(140, 260, A.eio(t, 59.4, 74.0));
    V.drawAPC8x8(c, {
      x: apcX,
      y: 0,
      s: 1.12,
      dir: 1,
      view: 'cutaway',
      wheelRot: t * 6.5,
      rwsType: 'rws',
      rwsAim: 0.05,
    });

    // Tia lửa mảnh đạn bật khỏi lớp vỏ giáp nóc APC khi đi qua vùng nổ chụp ở t = 73.8..75.0s
    if (t >= 74.0 && t <= 75.2) {
      F.sparks(c, apcX - 40, -192, (t - 74.0) / 1.2, 0.9, -Math.PI * 0.5, Math.PI * 0.8, 17);
    }

    K.end(c);
  }
}
