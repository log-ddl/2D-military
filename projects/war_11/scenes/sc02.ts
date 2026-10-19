import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch1HeliStateAt } from './_state';
import { drawBgAirfield, drawHeli, drawFixedWingPlane, lw } from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const heli = ch1HeliStateAt(t);
    const groundY = 220;

    // Camera góc SIDE:
    // - 30.52 -> 40.04: Toàn cảnh vừa thấy trực thăng đậu bên trái và máy bay cánh bằng phóng vọt qua đường băng
    // - 40.04 -> 48.40: Tiến vào trực thăng trong ô hẹp thực hiện (1) cất cánh thẳng đứng và (2) đứng treo (hover)
    // - 48.40 -> 53.18: Lia theo trực thăng lao sang phải và (3) phanh dừng khựng lại giữa không trung
    const camTrack: [number, K.Cam][] = [
      [30.52, { x: -160, y: 15, z: 1.28 }],
      [39.80, { x: -160, y: 15, z: 1.28 }],
      [41.60, { x: -350, y: 45, z: 1.62 }],
      [48.20, { x: -350, y: 20, z: 1.62 }],
      [50.90, { x: 80, y: -10, z: 1.58 }],
      [53.18, { x: 80, y: -10, z: 1.58 }],
    ];
    const cam = K.track(t, camTrack, A.eio);

    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    drawBgAirfield(c, groundY, -2400, 2400);

    // --- 1. Máy bay cánh bằng (35.8 - 40.8s): bay vọt trên tầng trời cao, đơn giản & nhanh nhưng cần đà chạy dài ---
    const planePresence = A.win(t, CUE.ch1_plane_simpler - 1.4, CUE.ch1_answer_three + 0.8, 0.45, 0.55);
    if (planePresence > 0.01) {
      const planeP = A.ph(t, CUE.ch1_plane_simpler - 1.4, CUE.ch1_answer_three + 0.8);
      const px = A.lerp(-780, 680, planeP);
      const py = A.lerp(-115, -210, A.eio(planeP, 0.15, 0.85));
      const pPitch = -0.08;
      A.withA(c, planePresence, () => {
        // Đường quỹ đạo bay thẳng tắp phía trên
        A.line(c, [[-780, -115], [px - 140, py + 8]], P.sky, lw(c, 3.5), [16, 10]);
        c.save();
        c.translate(px, py);
        c.rotate(pPitch);
        drawFixedWingPlane(c, 'side', 0.95, t * 22);
        c.restore();
      });
    }

    // --- 2. Khả năng #1: Cất cánh từ ô đất không lớn hơn chính thân trực thăng (44.0 - 48.5s) ---
    const showTightBox = A.win(t, CUE.ch1_takeoff_spot - 1.2, CUE.ch1_stop_in_air + 0.5, 0.4, 0.5);
    if (showTightBox > 0.01) {
      A.withA(c, showTightBox, () => {
        // Hai vạch dựng đứng kẹp sát chóp mũi (x = -380 + 160 = -220) và chóp đuôi (x = -380 - 295 = -675)
        const xRear = -676;
        const xFront = -218;
        A.rrect(c, xRear, groundY - 8, xFront - xRear, 14, 3, P.amber, P.ink, li);
        A.line(c, [[xRear, groundY - 95], [xRear, groundY + 10]], P.amber, lw(c, 3.5), [10, 6]);
        A.line(c, [[xFront, groundY - 95], [xFront, groundY + 10]], P.amber, lw(c, 3.5), [10, 6]);

        // Mũi tên thẳng đứng chỉ cất cánh tại chỗ
        const upP = A.sm(t, CUE.ch1_takeoff_spot, CUE.ch1_takeoff_spot + 1.5);
        if (upP > 0.01) {
          const ay = A.lerp(groundY - 25, -20, upP);
          A.line(c, [[-380, groundY - 12], [-380, ay]], P.amber, lw(c, 4));
          A.poly(c, [[-380, ay - 16], [-392, ay], [-368, ay]], P.amber, P.ink, li);
        }
      });
    }

    // --- 3. Khả năng #2: Đứng treo lơ lửng ngay trên một điểm mốc (46.8 - 48.8s) ---
    const showHoverPin = A.win(t, CUE.ch1_hover_spot - 0.3, CUE.ch1_stop_in_air + 0.4, 0.25, 0.35);
    if (showHoverPin > 0.01) {
      A.withA(c, showHoverPin, () => {
        // Bia điểm mốc trên mặt đất và đường giọt dọi thẳng đứng nối lên bụng trực thăng
        A.circle(c, -380, groundY, 16, P.sky, P.ink, lo);
        A.circle(c, -380, groundY, 6, P.paper, P.ink, li);
        A.line(c, [[-380, heli.y + 48], [-380, groundY - 16]], P.sky, lw(c, 3.5), [8, 6]);
        // Vòng khoá vị trí quanh tâm trực thăng
        A.circle(c, heli.x, heli.y, 24, null, P.sky, lw(c, 3));
      });
    }

    // --- 4. Khả năng #3: Lao tới rồi phanh đứng giữa không trung (48.4 - 53.18s) ---
    const showStopWall = A.sm(t, CUE.ch1_stop_in_air - 0.2, CUE.ch1_stop_in_air + 0.5);
    if (showStopWall > 0.01) {
      A.withA(c, showStopWall, () => {
        // Vạch chặn đứng trên không ngay trước mũi trực thăng tại x = 290
        const stopX = 292;
        A.line(c, [[stopX, -155], [stopX, 115]], P.enemy, lw(c, 4.5), [14, 8]);
        // Vệt động năng phanh phía sau trực thăng
        const trailP = A.win(t, 48.5, 51.4, 0.2, 0.5);
        if (trailP > 0.01) {
          A.withA(c, trailP, () => {
            A.line(c, [[-280, heli.y - 10], [heli.x - 130, heli.y - 10]], P.sky, lw(c, 3));
            A.line(c, [[-240, heli.y + 18], [heli.x - 115, heli.y + 18]], P.sky, lw(c, 3));
          });
        }
      });
    }

    // --- 5. Vẽ Trực thăng chủ đạo ---
    c.save();
    c.translate(heli.x, heli.y);
    c.rotate(heli.pitchRad);
    drawHeli(c, {
      view: 'side',
      rotorAngle: heli.rotorAngle,
      discTilt: -heli.pitchRad * 3.5,
      collectivePitch: t >= CUE.ch1_takeoff_spot ? 0.65 : 0.3,
      showGearboxCutaway: t < 37.0, // Đầu cảnh lộ nhẹ cơ cấu phức tạp khi voice nói "needs this much cleverness"
      powerFlow: t < 37.0 ? 0.8 : 0,
    });
    c.restore();

    // --- 6. Ba đèn chỉ thị trạng thái (3 khả năng độc nhất) ở góc trên màn hình ---
    if (t >= CUE.ch1_three_things - 0.2) {
      c.save();
      const s1 = A.sm(t, CUE.ch1_takeoff_spot - 0.1, CUE.ch1_takeoff_spot + 0.4);
      const s2 = A.sm(t, CUE.ch1_hover_spot - 0.1, CUE.ch1_hover_spot + 0.4);
      const s3 = A.sm(t, CUE.ch1_stop_in_air - 0.1, CUE.ch1_stop_in_air + 0.4);
      const badges: [number, number, string][] = [
        [heli.x - 90, heli.y - 145, s1 > 0.5 ? P.amber : P.light],
        [heli.x, heli.y - 145, s2 > 0.5 ? P.sky : P.light],
        [heli.x + 90, heli.y - 145, s3 > 0.5 ? P.enemy : P.light],
      ];
      // Biểu tượng hình học nhỏ trong mỗi huy hiệu: (1) mũi tên lên, (2) tâm điểm treo, (3) vạch dừng
      for (let i = 0; i < 3; i++) {
        const [bx, by, col] = badges[i]!;
        A.circle(c, bx, by, 18, P.paper, P.ink, lo);
        A.circle(c, bx, by, 12, col, null, 0);
        if (i === 0) {
          A.poly(c, [[bx, by - 7], [bx - 6, by + 5], [bx + 6, by + 5]], P.ink, null, 0);
        } else if (i === 1) {
          A.circle(c, bx, by, 4.5, P.ink, null, 0);
        } else {
          A.rrect(c, bx - 5, by - 5, 10, 10, 1, P.ink, null, 0);
        }
      }
      c.restore();
    }

    K.end(c);
  }
}
