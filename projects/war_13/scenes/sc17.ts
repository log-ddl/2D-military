import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc17 (441.22–464.483s): Chương 6 (Phần 3 — Kết phim) — Trở lại Quả tên lửa trong "Cảnh quan của những quy tắc vô hình"
 * Callback về đúng quả tên lửa hành trình ở sc01, nhưng giờ người xem nhìn thấy rõ 5 thành phần bên trong và xung quanh nó:
 * 1. The receiver that listens (444.4s)
 * 2. The jammer that blocks (446.2s)
 * 3. The decoy that lies (447.8s)
 * 4. The radio that hops (449.4s)
 * 5. The backup that looks at the ground (451.2s)
 * Cuối cùng (456.78–464.483s): Phổ vô tuyến không có chiến tuyến và không có địa hình — nó là một cảnh quan tạo bằng các quy tắc,
 * và ai hiểu quy tắc nhất sẽ đi xuyên qua đó mà không bị phát hiện.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(
      t,
      [
        [441.22, { x: 0, y: 15, z: 1.08 }],
        [454.04, { x: 20, y: 10, z: 1.02 }],
        [464.483, { x: 80, y: 0, z: 1.0 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    const rulesLandscapeP = A.sm(t, CUE.c6_no_frontline, CUE.c6_landscape_rules + 1.0);

    // 1. Nền: Từ mặt đất vật lý chuyển dần sang "Cảnh quan của những quy tắc tần số" (Landscape made of rules)
    A.withA(c, 1 - rulesLandscapeP * 0.75, () => {
      U.drawSkyEnv(c, cam, { groundY: 320, spaceBand: true, hills: true });
    });

    if (rulesLandscapeP > 0.01) {
      A.withA(c, rulesLandscapeP, () => {
        // Các làn quy tắc phổ vô tuyến (Spectrum Rule Lanes) trải ngang không gian thay cho địa hình
        for (let i = -3; i <= 3; i++) {
          const ly = i * 95;
          const isSafeChannel = i === 0;
          A.rrect(
            c,
            -950,
            ly - 34,
            1900,
            68,
            8,
            isSafeChannel ? 'rgba(56,189,248,0.16)' : 'rgba(203,213,225,0.22)',
            isSafeChannel ? P.sky : P.light,
            isSafeChannel ? lwO : lwI
          );
          if (!isSafeChannel && Math.abs(i) === 2) {
            // Khối luật chặn ở các kênh lân cận
            A.rrect(c, -220 + i * 110, ly - 26, 360, 52, 6, 'rgba(180,73,60,0.20)', P.enemy, lwI);
          }
        }
      });
    }

    // Tiến độ bật sáng lần lượt 5 thành phần theo lời đọc
    const p1Rx = A.sm(t, CUE.c6_part_receiver - 0.3, CUE.c6_part_receiver + 0.5);
    const p2Jam = A.sm(t, CUE.c6_part_jammer - 0.3, CUE.c6_part_jammer + 0.5);
    const p3Decoy = A.sm(t, CUE.c6_part_decoy - 0.3, CUE.c6_part_decoy + 0.5);
    const p4Hop = A.sm(t, CUE.c6_part_radio_hops - 0.3, CUE.c6_part_radio_hops + 0.5);
    const p5Backup = A.sm(t, CUE.c6_part_backup_ground - 0.3, CUE.c6_part_backup_ground + 0.5);

    const mx = A.lerp(-80, 180, A.ph(t, 441.22, 464.483));
    const my = 0;

    // (1) THE RECEIVER THAT LISTENS: Vệ tinh & xung mẫu truyền xuống khoang thu lưng tên lửa
    if (p1Rx > 0.01) {
      const satPos: A.Pt = [-360, -295];
      A.withA(c, p1Rx, () => {
        c.save();
        c.translate(satPos[0], satPos[1]);
        c.rotate(0.25);
        U.drawSatellite(c, { scale: 1.05, emitting: true });
        c.restore();
        U.drawSignalLink(c, satPos, [mx + 70, my - 55], t, {
          color: P.sky,
          mode: 'pulse',
          speed: 2.2,
          progress: p1Rx,
        });
      });
    }

    // (2) THE JAMMER THAT BLOCKS: Hộp cơm gây nhiễu dưới đất phát chùm sóng đỏ
    if (p2Jam > 0.01) {
      const jamPos: A.Pt = [-140, 320];
      A.withA(c, p2Jam * (1 - rulesLandscapeP * 0.5), () => {
        c.save();
        c.translate(jamPos[0], jamPos[1]);
        U.drawLunchboxJammer(c, { view: 'side', scale: 1.45, active: true, showHelmetScale: true });
        c.restore();
        U.drawSignalLink(c, [jamPos[0] + 16, jamPos[1] - 98], [mx + 20, my + 42], t, {
          color: P.enemy,
          mode: 'noise',
          amp: 12,
          speed: 3.4,
          progress: p2Jam,
        });
      });
    }

    // (3) THE DECOY THAT LIES: Mồi bẫy có động cơ bay phía trên phát bóng ma đánh lừa
    if (p3Decoy > 0.01) {
      const decoyPos: A.Pt = [mx + 220, my - 155];
      A.withA(c, p3Decoy, () => {
        c.save();
        c.translate(decoyPos[0], decoyPos[1]);
        U.drawAirDecoy(c, { scale: 1.35, showMimicSignature: true });
        c.restore();
      });
    }

    // (4) THE RADIO THAT HOPS: Bậc thang nhảy tần phía sau đuôi tên lửa
    if (p4Hop > 0.01) {
      const hx = mx - 360;
      const hy = my - 145;
      A.withA(c, p4Hop, () => {
        A.rrect(c, hx - 110, hy - 52, 220, 104, 8, P.paper, P.ink, lwO);
        const activeStep = Math.floor(t * 4.5) % 4;
        for (let s = 0; s < 4; s++) {
          const sx = hx - 82 + s * 46;
          const sy = hy + 24 - ((s * 2 + 1) % 4) * 18;
          A.rrect(
            c,
            sx,
            sy - 8,
            36,
            16,
            3,
            s === activeStep ? P.sky : P.bg2,
            P.ink,
            lwI
          );
        }
      });
    }

    // (5) THE BACKUP THAT LOOKS AT THE GROUND: Chùm quét camera địa hình dưới mũi tên lửa
    if (p5Backup > 0.01) {
      const lensPos: A.Pt = [mx + 210, my + 28];
      A.withA(c, p5Backup, () => {
        A.poly(
          c,
          [
            lensPos,
            [mx + 140, 320],
            [mx + 330, 320],
          ],
          'rgba(56,189,248,0.20)',
          P.sky,
          lwI
        );
      });
    }

    // Chủ thể trung tâm xuyên suốt bộ phim: Quả tên lửa hành trình mở mặt cắt đầy đủ 3 khoang (Receiver, IMU, Ground Camera)
    c.save();
    c.translate(mx, my);
    U.drawCruiseMissile(c, {
      view: 'cutaway',
      scale: 2.1,
      gpsState: 'active',
      imuState: p5Backup > 0.2 ? 'active' : 'idle',
      camState: p5Backup > 0.2 ? 'active' : 'idle',
      highlightPart:
        p5Backup > 0.2
          ? 'all'
          : p1Rx > 0.2
          ? 'receiver'
          : 'none',
    });
    c.restore();

    K.end(c);
  }
}
