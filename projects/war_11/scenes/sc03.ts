import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch1HeliStateAt } from './_state';
import { drawBgSkyGrid, drawHeli, drawFixedWingPlane, drawAirfoilCutaway, lw } from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const heli = ch1HeliStateAt(t);

    // Camera nối mượt từ cuối sc02 ({ x: 80, y: -10, z: 1.58 }) sang khung đối chiếu rồi tiến cận vào hộp số
    const camTrack: [number, K.Cam][] = [
      [53.18, { x: 80, y: -10, z: 1.58 }],
      [54.60, { x: 0, y: -55, z: 1.35 }],
      [66.50, { x: 0, y: -55, z: 1.35 }],
      [68.40, { x: 10, y: -5, z: 1.82 }],
      [75.10, { x: 10, y: -5, z: 1.82 }],
      [77.20, { x: 65, y: 35, z: 1.45 }],
      [83.64, { x: 65, y: 35, z: 1.45 }],
    ];
    const cam = K.track(t, camTrack, A.eio);

    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    drawBgSkyGrid(c, -1800, -1200, 3600, 2400, 110);

    // --- 1. Tầng trên (53.8 - 67.2s): Máy bay cánh bằng bay tới -> gió chảy qua cánh cố định ---
    const showPlaneTop = A.win(t, CUE.ch1_start_lift + 0.5, CUE.ch1_blades_long_thin + 0.4, 0.5, 0.8);
    if (showPlaneTop > 0.01) {
      A.withA(c, showPlaneTop, () => {
        const py = -225;
        // Đường phân cách mảnh
        A.line(c, [[-560, -115], [560, -115]], P.light, li, [12, 10]);

        // Máy bay cánh bằng đang lao sang phải
        const px = A.lerp(-180, 120, A.ph(t, 53.18, 67.0));
        c.save();
        c.translate(px, py);
        drawFixedWingPlane(c, 'side', 0.92, t * 20);
        c.restore();

        // Luồng khí ngang chảy qua cánh vì máy bay đang di chuyển
        for (let i = -1; i <= 1; i++) {
          const wy = py + i * 24;
          const shift = ((t * 260) % 160);
          A.line(c, [[px + 180 - shift, wy], [px + 90 - shift, wy]], P.sky, lw(c, 3));
          A.poly(c, [[px + 78 - shift, wy], [px + 94 - shift, wy - 6], [px + 94 - shift, wy + 6]], P.sky, null, 0);
        }

        // Hình phóng mặt cắt cánh cố định bên phải
        A.rrect(c, 285, py - 58, 175, 116, 10, P.paper, P.slate, lo);
        c.save();
        c.translate(372, py + 4);
        drawAirfoilCutaway(c, { aoaRad: 0.16, mode: 'normal', flowPhase: t * 1.4, scale: 0.44 });
        c.restore();
      });
    }

    // --- 2. Luồng khí đẩy thẳng xuống (Downwash) & Phản lực nâng trực thăng lên (71.4 - 83.64s) ---
    const downwashP = A.sm(t, CUE.ch1_push_air_down - 0.2, CUE.ch1_push_air_down + 0.8);
    if (downwashP > 0.01) {
      A.withA(c, downwashP, () => {
        // Cột khí rộng dưới đĩa rotor chảy thẳng xuống
        const flowOff = (t * 210) % 75;
        for (const dx of [-175, -110, -45, 45, 110, 175]) {
          const topY = heli.y - 88;
          const botY = heli.y + 155;
          A.line(c, [[heli.x + dx, topY + flowOff * 0.4], [heli.x + dx * 1.08, botY]], P.sky, lw(c, 3.2), [22, 14]);
          const ay = topY + 55 + flowOff;
          A.poly(c, [[heli.x + dx, ay + 16], [heli.x + dx - 8, ay], [heli.x + dx + 8, ay]], P.sky, null, 0);
        }
      });
    }

    const reactionP = A.sm(t, CUE.ch1_reaction_up - 0.2, CUE.ch1_reaction_up + 0.7);
    if (reactionP > 0.01) {
      A.withA(c, reactionP, () => {
        // Hai mũi tên lực nâng phản lực lớn màu amber đẩy thân trực thăng hướng lên
        for (const side of [-1, 1]) {
          const rx = heli.x + 14 + side * 78;
          const ry0 = heli.y + 30;
          const ry1 = heli.y - 135;
          A.capsule(c, [rx, ry0], [rx, ry1], 9, P.amber, P.ink, li);
          A.poly(c, [[rx, ry1 - 22], [rx - 15, ry1 + 2], [rx + 15, ry1 + 2]], P.amber, P.ink, lo);
        }
      });
    }

    // --- 3. Vòng quỹ đạo cánh quay trên nóc cabin khi thân đứng yên (60.36 - 68.5s) ---
    const circleGuide = A.win(t, CUE.ch1_heli_no_forward, CUE.ch1_engine_gearbox + 0.5, 0.4, 0.5);
    if (circleGuide > 0.01) {
      A.withA(c, circleGuide, () => {
        // Elip phối cảnh hiển thị đường tròn cánh quay phía trên cabin
        A.ellipse(c, heli.x + 14, heli.y - 100, 238, 26, 0, 'rgba(56, 189, 248, 0.14)', P.sky, lw(c, 3));
      });
    }

    // --- 4. Vẽ Trực thăng chủ đạo (mở mặt cắt Động cơ + Hộp số từ 67.5s) ---
    const cutP = A.sm(t, CUE.ch1_blades_long_thin, CUE.ch1_engine_gearbox + 0.4);
    const loadP = A.sm(t, CUE.ch1_heavy_bill - 0.2, CUE.ch1_heavy_bill + 0.8);
    c.save();
    c.translate(heli.x, heli.y);
    drawHeli(c, {
      view: 'side',
      rotorAngle: heli.rotorAngle,
      collectivePitch: 0.62,
      showGearboxCutaway: cutP > 0.1,
      powerFlow: A.sm(t, CUE.ch1_engine_gearbox - 0.3, CUE.ch1_engine_gearbox + 0.5),
      slingLoad: loadP,
      loadFrac: 1,
    });
    c.restore();

    // --- 5. Khung phóng đại Bánh răng Hộp số (Gearbox) nối Động cơ -> Trục Rotor (68.8 - 76.5s) ---
    const gbZoom = A.win(t, CUE.ch1_engine_gearbox - 0.3, CUE.ch1_heavy_bill - 0.2, 0.35, 0.45);
    if (gbZoom > 0.01) {
      A.withA(c, gbZoom, () => {
        const bx = 265, by = -65;
        A.line(c, [[heli.x + 28, heli.y - 48], [bx - 85, by]], P.amber, li, [6, 5]);
        A.rrect(c, bx - 85, by - 65, 170, 130, 12, P.paper, P.amber, lo);
        // Trục ngang từ động cơ tuabin (quay rất nhanh)
        A.rrect(c, bx - 72, by + 12, 58, 16, 4, P.amber, P.ink, li);
        // Bánh răng nhỏ động cơ ăn khớp bánh răng lớn trục rotor
        A.circle(c, bx - 12, by + 20, 16, P.amber, P.ink, lo);
        A.circle(c, bx + 24, by - 4, 28, P.oliveLight, P.ink, lo);
        // Răng xoay trực quan
        for (let k = 0; k < 6; k++) {
          const ga = heli.rotorAngle + (k * Math.PI) / 3;
          A.line(c, [[bx + 24, by - 4], [bx + 24 + Math.cos(ga) * 24, by - 4 + Math.sin(ga) * 24]], P.ink, li);
        }
        // Trục đứng lên rotor
        A.rrect(c, bx + 16, by - 58, 16, 30, 3, P.slate, P.ink, lo);
      });
    }

    // --- 6. So sánh Công suất tiêu thụ trên mỗi kg tải trọng (76.8 - 83.64s) ---
    if (loadP > 0.01) {
      const barP = A.eio(t, CUE.ch1_heavy_bill + 0.2, CUE.ch1_power_per_kg + 0.6);
      A.withA(c, loadP, () => {
        const panelX = 335, panelY = 45;
        A.rrect(c, panelX - 115, panelY - 145, 230, 290, 12, P.paper, P.ink, lo);

        // Cột 1 (Trái): Công suất Trực thăng (Rất cao - màu amber/enemy)
        const hBarMax = 175;
        const hBar = hBarMax * barP;
        A.rrect(c, panelX - 72, panelY + 85 - hBar, 52, hBar, 6, P.amber, P.ink, lo);
        // Biểu tượng rotor nhỏ dưới chân cột 1
        A.capsule(c, [panelX - 76, panelY + 108], [panelX - 16, panelY + 108], 5, P.olive, P.ink, li);
        A.circle(c, panelX - 46, panelY + 108, 5, P.dark, P.ink, li);

        // Cột 2 (Phải): Công suất Máy bay cánh bằng cho cùng 1kg (Thấp hơn nhiều - màu sky)
        const pBar = 42 * barP;
        A.rrect(c, panelX + 20, panelY + 85 - pBar, 52, pBar, 6, P.sky, P.ink, lo);
        // Biểu tượng cánh cố định dưới chân cột 2
        A.poly(c, [[panelX + 16, panelY + 112], [panelX + 46, panelY + 102], [panelX + 76, panelY + 112]], P.light, P.ink, li);

        // Vạch nền chân biểu đồ
        A.line(c, [[panelX - 92, panelY + 85], [panelX + 92, panelY + 85]], P.ink, lo);
      });
    }

    K.end(c);
  }
}
