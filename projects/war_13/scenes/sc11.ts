import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc11 (277.10–309.42s): Chương 4 (Phần 1) — Dẫn đường vệ tinh bị gây nhiễu & Hệ thống dự phòng (IMU + Camera địa hình)
 * Góc nhìn SIDE kết hợp mặt cắt cơ chế lớn của CruiseMissile:
 * - 277.10–295.00s: Sóng vệ tinh bị gây nhiễu làm đạn/UAV chỉ phụ thuộc vào 1 tín hiệu bay lệch khỏi mục tiêu.
 * - 295.00–309.42s: Vũ khí hiện đại mở khoang dự phòng: (1) Khối quán tính IMU tự đo chuyển động,
 *   (2) Camera mũi nhận diện mặt đất bên dưới, đưa tên lửa quay lại đúng đường ngắm và đánh trúng mục tiêu.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const camBase = K.track(
      t,
      [
        [277.1, { x: -40, y: -20, z: 1.05 }],
        [295.0, { x: 10, y: 15, z: 1.12 }],
        [309.42, { x: 110, y: 25, z: 1.06 }],
      ],
      A.eio
    );
    const hitT = 307.6;
    const cam = K.withShake(camBase, t, [[hitT, 18, 0.7]]);

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawSkyEnv(c, cam, { groundY: 320, spaceBand: true, hills: true });

    const satPos: A.Pt = [-360, -295];
    const jamPos: A.Pt = [-60, 320];
    const targetBunker: A.Pt = [640, 320];

    const jamP = A.sm(t, CUE.c4_jamming_pushed - 0.5, CUE.c4_jamming_pushed + 0.8);
    const imuP = A.sm(t, CUE.c4_inertial_unit - 0.4, CUE.c4_inertial_unit + 0.8);
    const camP = A.sm(t, CUE.c4_camera_ground - 0.3, CUE.c4_camera_ground + 0.8);

    // 1. Vệ tinh dẫn đường trên quỹ đạo & Trạm gây nhiễu mặt đất
    c.save();
    c.translate(satPos[0], satPos[1]);
    c.rotate(0.25);
    U.drawSatellite(c, { scale: 1.1, emitting: true });
    c.restore();

    c.save();
    c.translate(jamPos[0], jamPos[1]);
    U.drawGroundStation(c, {
      view: 'side',
      scale: 1.25,
      role: 'jammer',
      team: 'enemy',
      dishAngle: -0.6,
      active: jamP > 0.1,
    });
    c.restore();

    // Hầm mục tiêu bên phải
    c.save();
    c.translate(targetBunker[0], targetBunker[1]);
    A.rrect(c, -48, -56, 96, 56, 6, P.enemy, P.ink, lwO);
    A.rrect(c, -28, -36, 56, 36, 3, P.dark, P.ink, lwI);
    c.restore();

    // 2. Một đạn/UAV thế hệ cũ chỉ có 1 kênh GPS bị nhiễu đẩy bay lệch vọt lên cao (289.70s+)
    if (t < 299.0) {
      const uavAlpha = 1 - A.sm(t, 296.5, 298.8);
      const uavX = A.lerp(-380, 280, A.ph(t, 277.1, 298.0));
      const uavY = -125 - jamP * 115;
      A.withA(c, uavAlpha, () => {
        A.line(c, [[-380, -125], [uavX, uavY]], P.enemy, lwI, [A.px(c, 8), A.px(c, 6)]);
        c.save();
        c.translate(uavX, uavY);
        c.rotate(-jamP * 0.28);
        U.drawTacticalDrone(c, { view: 'side', scale: 1.45, spoofed: jamP > 0.3 });
        c.restore();
      });
    }

    // 3. Chủ thể chính: Tên lửa hành trình mở mặt cắt sâu (mang bộ sưu tập dự phòng: GPS + IMU + Camera địa hình)
    const mMoveP = A.ei(t, 304.8, hitT);
    const mx = A.lerp(-140, targetBunker[0] - 20, mMoveP);
    const my = A.lerp(10, targetBunker[1] - 30, mMoveP);
    const mang = A.lerp(0, 0.38, mMoveP);

    // Đường sóng vệ tinh xuống lưng tên lửa & Chùm nhiễu đỏ từ dưới đất bắn lên chặn GPS (tắt khi tên lửa đã nổ trúng đích)
    if (t < hitT) {
      U.drawSignalLink(c, satPos, [mx + 40, my - 45], t, {
        color: P.sky,
        mode: 'pulse',
        speed: 2.0,
        progress: jamP > 0.5 ? 0.55 : 1.0,
      });
      if (jamP > 0.02) {
        U.drawSignalLink(c, [jamPos[0], jamPos[1] - 110], [mx + 40, my - 35], t, {
          color: P.enemy,
          mode: 'noise',
          amp: 14 * jamP,
          speed: 3.5,
          progress: jamP,
        });
      }
    }

    // Chùm quét quang học của Camera mũi nhìn xuống nhận diện địa hình mặt đất (300.6s+)
    if (camP > 0.02 && t < hitT) {
      const lensWorld: A.Pt = [mx + 195, my + 28];
      const groundScanX = mx + 245;
      A.withA(c, camP, () => {
        A.poly(
          c,
          [
            lensWorld,
            [groundScanX - 95, 320],
            [groundScanX + 95, 320],
          ],
          'rgba(56,189,248,0.18)',
          P.sky,
          lwI
        );
        // Đường viền khớp địa hình (terrain contour match) trên mặt đất
        A.line(
          c,
          [
            [groundScanX - 90, 320],
            [groundScanX - 30, 286],
            [groundScanX + 25, 302],
            [groundScanX + 90, 320],
          ],
          P.sky,
          lwO
        );
      });
    }

    // Vẽ quả tên lửa hành trình mở mặt cắt (trước khi chạm nổ tại hitT)
    if (t < hitT) {
      c.save();
      c.translate(mx, my);
      c.rotate(mang);
      U.drawCruiseMissile(c, {
        view: 'cutaway',
        scale: 2.15,
        gpsState: jamP > 0.4 ? 'jammed' : 'ok',
        imuState: imuP > 0.3 ? 'active' : 'idle',
        camState: camP > 0.3 ? 'active' : 'idle',
      });
      c.restore();
    }

    // Cửa sổ phóng đại 2 cơ chế dự phòng bên trên tên lửa (297.92s–306.5s)
    const backupBoxA =
      A.sm(t, CUE.c4_inertial_unit - 0.3, CUE.c4_inertial_unit + 0.5) *
      (1 - A.sm(t, 305.8, 306.8));
    if (backupBoxA > 0.02) {
      A.withA(c, backupBoxA, () => {
        // Hộp 1: Khối quán tính IMU (Con quay hồi chuyển 3 trục đo vận tốc nội tại)
        const ix = -210;
        const iy = -195;
        A.line(c, [[mx - 30, my - 15], [ix, iy + 68]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
        A.rrect(c, ix - 115, iy - 62, 230, 124, 10, P.paper, P.ink, lwO);
        A.circle(c, ix - 45, iy, 36, P.bg2, P.ink, lwO);
        A.ellipse(c, ix - 45, iy, 36, 14, t * 2.2, null, P.amber, lwO);
        A.ellipse(c, ix - 45, iy, 14, 36, -t * 1.8, null, P.ink, lwI);
        // Mũi tên đo gia tốc 3 trục
        A.line(c, [[ix + 20, iy + 18], [ix + 88, iy + 18]], P.amber, lwO);
        A.line(c, [[ix + 20, iy + 18], [ix + 20, iy - 34]], P.sky, lwO);

        // Hộp 2: Camera đối chiếu mặt đất (Terrain Contour Matching: 300.6s+)
        if (camP > 0.02) {
          const cx = 210;
          const cy = -195;
          A.withA(c, camP, () => {
            A.line(c, [[mx + 195, my], [cx, cy + 68]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
            A.rrect(c, cx - 125, cy - 62, 250, 124, 10, P.paper, P.ink, lwO);
            // Hình ảnh đồi thu từ camera khớp khít với đường mẫu nét đứt
            A.poly(
              c,
              [
                [cx - 98, cy + 38],
                [cx - 38, cy - 18],
                [cx + 18, cy + 8],
                [cx + 68, cy - 26],
                [cx + 98, cy + 38],
              ],
              'rgba(56,189,248,0.22)',
              P.sky,
              lwO
            );
            A.line(
              c,
              [
                [cx - 98, cy + 32],
                [cx - 38, cy - 24],
                [cx + 18, cy + 2],
                [cx + 68, cy - 32],
                [cx + 98, cy + 32],
              ],
              P.amber,
              lwI,
              [A.px(c, 6), A.px(c, 5)]
            );
          });
        }
      });
    }

    // 4. Vụ nổ chính xác tại hầm mục tiêu khi tên lửa có hệ thống dự phòng lao trúng (307.6s)
    const boomP = A.ph(t, hitT, hitT + 1.5);
    U.drawExplosion(c, targetBunker[0], targetBunker[1] - 25, boomP, 95);

    K.end(c);
  }
}
