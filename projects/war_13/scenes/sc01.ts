import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';
import { ch1StateAt } from './_state';

/**
 * sc01 (0.00–26.86s): Hook Chương 1
 * Tín hiệu vệ tinh đi 20,000 km yếu hơn nhiễu nền, bộ thu nhận ra nhờ khớp mẫu xung,
 * rồi bị máy phát nhiễu cỡ hộp cơm trưa dưới đất dâng nhiễu đè ngập khiến tên lửa mất phương hướng.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = ch1StateAt(t);

    // Camera track: đầu cảnh ôm trọn vệ tinh + tên lửa, lúc 13.5s hạ nhẹ xuống lấy hộp cơm dưới đất
    const cam = K.track(
      t,
      [
        [0.0, { x: 0, y: -55, z: 1.05 }],
        [5.0, { x: 40, y: -35, z: 1.12 }],
        [13.2, { x: 40, y: -35, z: 1.12 }],
        [15.4, { x: 20, y: 55, z: 1.04 }],
        [26.86, { x: 60, y: 35, z: 1.04 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    // 1. Nền bầu trời, dải quỹ đạo vệ tinh và mặt đất
    U.drawSkyEnv(c, cam, { groundY: 320, spaceBand: true, hills: true });

    // 2. Vệ tinh ở quỹ đạo cao (-380, -310) phát sóng xuống tên lửa
    const satPos: A.Pt = [-380, -310];
    const antWorld: A.Pt = [
      st.missileX + Math.cos(st.missileAngle) * 75,
      st.missileY + Math.sin(st.missileAngle) * 75 - 48,
    ];

    // Đường truyền 20,000 km từ vệ tinh xuống lưng tên lửa
    const satLinkProg = A.eo(t, 0.0, 1.4);
    U.drawSignalLink(c, satPos, antWorld, t, {
      color: P.sky,
      mode: 'pulse',
      speed: 2.0,
      progress: satLinkProg,
    });

    c.save();
    c.translate(satPos[0], satPos[1]);
    c.rotate(0.28);
    U.drawSatellite(c, { scale: 1.15, emitting: true });
    c.restore();

    // 3. Đường ngắm chuẩn tới mục tiêu (nét đứt) vs quỹ đạo lệch khi mất GPS
    const targetGround: A.Pt = [760, 320];
    A.line(
      c,
      [
        [-520, 40],
        [360, 40],
        targetGround,
      ],
      P.sky,
      lwI,
      [A.px(c, 12), A.px(c, 10)]
    );

    // Bia mục tiêu phía xa bên phải trên mặt đất
    c.save();
    c.translate(targetGround[0], targetGround[1]);
    A.rrect(c, -42, -54, 84, 54, 4, P.slate, P.ink, lwO);
    A.rrect(c, -26, -38, 52, 38, 2, P.dark, P.ink, lwI);
    c.restore();

    // 4. Hộp phát nhiễu cỡ hộp cơm trưa (Lunchbox Jammer) dưới mặt đất (xuất hiện từ 13.2s)
    const jamShow = A.sm(t, CUE.c1_lunchbox - 0.5, CUE.c1_lunchbox + 0.5);
    const jamPos: A.Pt = [-40, 320];
    A.withA(c, jamShow, () => {
      // Vòm sóng nhiễu đỏ dâng lên nuốt chửng tên lửa
      if (st.jammerPower > 0.01) {
        for (let i = 0; i < 4; i++) {
          const phase = ((t * 0.85 + i * 0.25) % 1);
          const rad = A.lerp(45, 540, phase) * st.jammerPower;
          const a = (1 - phase) * 0.75 * st.jammerPower;
          A.withA(c, a, () => {
            c.beginPath();
            c.arc(jamPos[0] + 16, jamPos[1] - 90, rad, Math.PI * 1.08, Math.PI * 1.92);
            A.fs(c, null, P.enemy, lwO);
          });
        }
        // Chùm nhiễu răng cưa bắn thẳng lên anten thu của tên lửa
        U.drawSignalLink(c, [jamPos[0] + 16, jamPos[1] - 98], antWorld, t, {
          color: P.enemy,
          mode: 'noise',
          amp: 14 * st.jammerPower,
          speed: 3.5,
          progress: st.jammerPower,
        });
      }

      c.save();
      c.translate(jamPos[0], jamPos[1]);
      U.drawLunchboxJammer(c, {
        view: 'side',
        scale: 1.55,
        active: st.jammerPower > 0.1,
        showHelmetScale: true,
      });
      c.restore();
    });

    // 5. Chủ thể chính: Quả tên lửa hành trình (scale lớn 2.05, mở cutaway từ 9.26s)
    c.save();
    c.translate(st.missileX, st.missileY);
    c.rotate(st.missileAngle);
    U.drawCruiseMissile(c, {
      view: st.cutawayAlpha > 0.5 ? 'cutaway' : 'side',
      scale: 2.05,
      gpsState: st.gpsState,
      finDeflect: st.finDeflect,
      highlightPart: st.cutawayAlpha > 0.5 ? 'receiver' : 'none',
      thrust: 1 + 0.15 * Math.sin(t * 24),
    });
    c.restore();

    // Khi mất tín hiệu (t > 21.36s): hiện quỹ đạo bay vọt lệch lên cao (không lửa khói hỏng hóc)
    const lostP = A.sm(t, CUE.c1_no_bang, CUE.c1_stops_knowing + 1.2);
    if (lostP > 0.02) {
      A.withA(c, lostP, () => {
        A.line(
          c,
          [
            [st.missileX + 180, st.missileY - 35],
            [st.missileX + 460, st.missileY - 145],
          ],
          P.enemy,
          lwO,
          [A.px(c, 10), A.px(c, 8)]
        );
      });
    }

    // 6. Cửa sổ Mặt cắt Phổ & Khuôn mẫu Bộ thu (Receiver Pattern Scope) nối trực tiếp từ anten lưng tên lửa
    if (st.hissShow > 0.02) {
      const boxX = 370;
      const boxY = -248;
      const boxW = 410;
      const boxH = 185;

      A.withA(c, st.hissShow, () => {
        // Đường dóng từ anten lưng tên lửa lên hộp giải thích cơ chế
        A.line(c, [antWorld, [boxX - boxW / 2, boxY + 25]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
        A.circle(c, antWorld[0], antWorld[1], 6, st.gpsState === 'jammed' ? P.enemy : P.sky, P.ink, lwI);

        // Khung cửa sổ mặt cắt tín hiệu bên trong bộ thu
        A.rrect(c, boxX - boxW / 2 - 6, boxY - boxH / 2 - 6, boxW + 12, boxH + 12, 12, P.dark, P.ink, lwO);
        A.rrect(c, boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 8, P.paper, P.ink, lwI);

        const baseLineY = boxY + 62;
        const leftX = boxX - boxW / 2 + 22;
        const rightX = boxX + boxW / 2 - 22;
        A.line(c, [[leftX, baseLineY], [rightX, baseLineY]], P.ink2, lwI);

        // (a) Xung mẫu vệ tinh (yếu, nằm thấp sát đáy: cao 28px)
        const pulsePts: A.Pt[] = [
          [leftX, baseLineY],
          [leftX + 55, baseLineY],
          [leftX + 55, baseLineY - 26],
          [leftX + 105, baseLineY - 26],
          [leftX + 105, baseLineY],
          [leftX + 150, baseLineY],
          [leftX + 150, baseLineY - 26],
          [leftX + 215, baseLineY - 26],
          [leftX + 215, baseLineY],
          [leftX + 260, baseLineY],
          [leftX + 260, baseLineY - 26],
          [leftX + 305, baseLineY - 26],
          [leftX + 305, baseLineY],
          [rightX, baseLineY],
        ];
        A.line(c, pulsePts, P.sky, lwO);

        // (b) Nhiễu nền tự nhiên (Background hiss: cao 48px, cao hơn cả xung vệ tinh!)
        const hissPts: A.Pt[] = [];
        const step = 10;
        for (let x = leftX; x <= rightX; x += step) {
          const r = A.rnd(Math.floor(x / step) + Math.floor(t * 8) * 17);
          const h = 18 + r * 36;
          hissPts.push([x, baseLineY - h]);
        }
        A.line(c, hissPts, P.slate, lwI);

        // (c) Khuôn mẫu nhận dạng của Bộ thu (Pattern template gate: 9.26s..16.8s)
        if (st.patternLock > 0.02) {
          const slideY = A.lerp(-42, 0, st.patternLock);
          A.withA(c, st.patternLock, () => {
            c.save();
            c.translate(0, slideY);
            A.line(c, pulsePts, P.amber, lwO, [A.px(c, 7), A.px(c, 5)]);
            // Điểm khóa mẫu khớp xung
            for (const kx of [leftX + 80, leftX + 182, leftX + 282]) {
              A.circle(c, kx, baseLineY - 26, 6, P.sky, P.ink, lwI);
            }
            c.restore();
          });
        }

        // (d) Nhiễu hộp cơm trưa (Lunchbox Jammer Noise Wall: 16.8s+, dâng cao 135px nuốt trọn tất cả)
        if (st.jammerPower > 0.02) {
          const jamPts: A.Pt[] = [[leftX, baseLineY]];
          for (let x = leftX; x <= rightX; x += 8) {
            const r = A.rnd(Math.floor(x / 8) + Math.floor(t * 20) * 31);
            const h = (75 + r * 62) * st.jammerPower;
            jamPts.push([x, baseLineY - h]);
          }
          jamPts.push([rightX, baseLineY]);
          A.poly(c, jamPts, 'rgba(180,73,60,0.32)', P.enemy, lwO);
        }
      });
    }

    K.end(c);

    // Callout duy nhất cho con số 20,000 km khi voice đọc "20,000 km" (2.2s..6.2s)
    const callA = A.win(t, 2.1, 6.2, 0.35, 0.45);
    const midPt = K.toScreen(cam, -190, -180);
    U.drawCallout(c, midPt, [midPt[0] - 135, midPt[1] + 55], '20,000 km', callA);
  }
}
