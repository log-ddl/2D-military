// sc03.ts (41.96 – 75.50s): Phi vụ ngắn hiện đại — tiêm kích vừa cất cánh 15 phút đã phải gặp tanker;
// hai máy bay bay sát nhau ở 500 km/h và mở 3 trụ cột giải thích (vật lý cất cánh, 2 kiểu nối ống, van & máy tính cân bằng).
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawAltitudeWorldBg,
  drawModernTanker,
  drawStrikeFighter,
  drawFlyingBoom,
  drawHoseAndDrogue,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Quỹ đạo tiêm kích từ đường băng (-620, -28) leo lên ghép sau đuôi tanker ở (-145, -555)
    const climbP = A.eio(t, 42.4, 48.2);
    const climbPt = (u: number): A.Pt => [
      A.lerp(-620, -145, u),
      A.lerp(-28, -555, Math.pow(u, 1.35)),
    ];
    const [fx, fy] = climbPt(climbP);
    const fPitch = A.bump(t, 43.2, 4.4) * -22;

    // Tanker bay ổn định ở độ cao (-555) phía trước tiêm kích (x = 240, y = -685)
    const tx = 240;
    const ty = -685;

    // Camera đi theo tiêm kích từ đường băng lên bầu trời rồi tiến vào cặp Tanker-Fighter
    const cam = K.track(
      t,
      [
        [41.96, { x: -460, y: -95, z: 1.28 }],
        [44.2, { x: -350, y: -185, z: 1.22 }],
        [48.2, { x: 40, y: -610, z: 1.18 }],
        [55.5, { x: 40, y: -610, z: 1.18 }],
        // Tiến sát khoảng cách vài mét giữa 2 máy bay ở 500 km/h
        [58.5, { x: 35, y: -620, z: 1.48 }],
        [64.8, { x: 35, y: -620, z: 1.48 }],
        // Lùi nhẹ để đọc trọn 3 trụ cột (cất cánh, 2 kiểu ống nối, mặt cắt bình xăng + van máy tính)
        [66.8, { x: 45, y: -615, z: 1.36 }],
        [75.5, { x: 45, y: -615, z: 1.36 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    drawAltitudeWorldBg(c, cam, t, { showCarrier: false });

    const lo = lwO(c);
    const li = lwI(c);

    // Đường quỹ đạo cất cánh mọc mượt theo đúng vị trí tiêm kích
    if (climbP > 0.02) {
      const pts: A.Pt[] = [];
      for (let i = 0; i <= 24; i++) {
        pts.push(climbPt((i / 24) * climbP));
      }
      A.line(c, pts, P.sky, lo, [A.px(c, 12), A.px(c, 8)]);
    }

    // Chuyển sang mặt cắt (cutaway) từ 69.5s khi voice nói về "hidden web of valves and computers"
    const isCutaway = t >= CUE.web_valves_computers - 0.3;
    const transferP = A.ph(t, CUE.web_valves_computers, 75.2);

    // 1. Vẽ Modern Tanker ở (tx, ty)
    c.save();
    c.translate(tx, ty);
    drawModernTanker(c, isCutaway ? 'cutaway' : 'side', {
      scale: 1.18,
      hasBoom: true,
      tanks: {
        tail: A.lerp(0.8, 0.45, transferP),
        wing: A.lerp(0.85, 0.5, transferP),
        center: A.lerp(0.78, 0.45, transferP),
      },
      valvesOpen: [true, true, true],
      cgShift: 0,
    });
    c.restore();

    // 2. Cần cứng nối giữa đuôi Tanker và lưng Strike Fighter (khi đã lên tới độ cao)
    const boomConnect = A.sm(t, 47.5, 49.2);
    const bx0 = tx - 170;
    const by0 = ty + 32;
    const bx1 = A.lerp(bx0 - 95, fx - 14, boomConnect);
    const by1 = A.lerp(by0 + 48, fy - 24, boomConnect);

    drawFlyingBoom(c, bx0, by0, bx1, by1, {
      extension: boomConnect * 0.75,
      wingPitch: Math.sin(t * 2.5) * 0.25,
      flow: A.sm(t, 51.0, 52.5),
      flowPhase: t,
      locked: boomConnect > 0.9,
    });

    // Nhịp 67.36 – 69.8s ("two rival ways of connecting the pipe"): hiện thêm nhánh ống mềm & rổ phễu đối chiếu
    const rivalWin = A.win(t, CUE.two_rival_ways - 0.2, CUE.web_valves_computers + 0.2, 0.3, 0.3);
    if (rivalWin > 0.01) {
      A.withA(c, rivalWin, () => {
        drawHoseAndDrogue(c, tx - 45, ty + 26, fx + 95, fy - 6, {
          whipAmp: 4,
          whipPhase: t,
          flow: 0.8,
          flowPhase: t,
          basketScale: 0.9,
        });
      });
    }

    // 3. Vẽ Strike Fighter ở (fx, fy)
    const gear = 1 - A.sm(t, 43.4, 44.6);
    const simpleFuel =
      t < 51.0 ? A.lerp(0.45, 0.35, climbP) : A.lerp(0.35, 0.88, A.ph(t, 51.0, 64.5));

    c.save();
    c.translate(fx, fy);
    drawStrikeFighter(c, isCutaway ? 'cutaway' : 'side', {
      scale: 1.22,
      gearDown: gear,
      pitchDeg: fPitch,
      hasReceptacle: true,
      bombsCount: 2,
      fuelLevel: isCutaway ? undefined : simpleFuel,
      afterburner: A.win(t, 42.4, 47.5, 0.2, 0.5),
      tanks: {
        aft: A.lerp(0.3, 0.75, transferP),
        mid: A.lerp(0.35, 0.8, transferP),
        fwd: A.lerp(0.3, 0.75, transferP),
      },
      valvesOpen: [true, true, true],
      cgShift: 0,
    });
    c.restore();

    // 4. Dấu hiệu khoảng cách hẹp & nguy cơ va chạm/cháy nổ (56.5 – 64.8s)
    const hazardWin = A.win(t, CUE.two_metal_machines, 64.7, 0.3, 0.3);
    if (hazardWin > 0.01) {
      A.withA(c, hazardWin, () => {
        // Thước đo khoảng cách vài mét giữa đuôi tanker và tiêm kích
        A.line(c, [[fx + 40, ty + 38], [fx + 40, fy - 28]], P.enemy, lo, [A.px(c, 6), A.px(c, 5)]);
        A.line(c, [[fx + 26, ty + 38], [fx + 54, ty + 38]], P.enemy, lo);
        A.line(c, [[fx + 26, fy - 28], [fx + 54, fy - 28]], P.enemy, lo);

        // Chớp tia lửa cảnh báo ở đầu khớp nối lúc nhắc "without colliding or catching fire"
        if (t >= CUE.colliding_or_fire - 0.5) {
          const sp = A.bump(t, CUE.colliding_or_fire - 0.3, 1.2);
          A.circle(c, bx1, by1, 28 * sp, 'rgba(180, 73, 60, 0.28)', P.enemy, lo);
        }
      });
    }

    // 5. Nhấn trụ cột 1 ("takeoff physics", 66.0 – 69.5s): mũi tên trọng lực kéo xuống dưới bụng tiêm kích
    const physWin = A.win(t, CUE.takeoff_physics - 0.2, CUE.web_valves_computers, 0.25, 0.25);
    if (physWin > 0.01) {
      const [sx, sy] = K.toScreen(cam, fx, fy + 26);
      K.end(c);
      UI.arrow(c, [sx, sy], [sx, sy + 95], { p: physWin, color: P.enemy, w: 6 });
      K.begin(c, cam);
    }

    K.end(c);

    // ── Callout tối giản (tối đa 1 cùng lúc) ──
    const p15 = A.win(t, CUE.min_15_later - 0.2, 50.8, 0.25, 0.25);
    if (p15 > 0.01) {
      const [sx, sy] = K.toScreen(cam, fx - 40, fy + 40);
      UI.callout(c, '15 MIN', sx - 130, sy + 75, { to: [sx, sy], p: p15, color: P.sky });
    }

    const p500 = A.win(t, CUE.kmh_500 - 0.15, 63.2, 0.25, 0.25);
    if (p500 > 0.01) {
      const [sx, sy] = K.toScreen(cam, bx1, by1);
      UI.callout(c, '500 KM/H', sx - 150, sy - 95, { to: [sx, sy], p: p500, color: P.amber });
    }
  }
}
