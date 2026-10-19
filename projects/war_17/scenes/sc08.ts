// sc08.ts — Chương 3 (197.20–210.62s): Góc nhìn TOP bản đồ cơ động chiến lược —
// Chiếc APC 8 bánh tự lăn bánh từ doanh trại (barracks) ra đường cao tốc,
// chạy gần 100 km/h suốt 500 km trên chính lốp của mình và tới tiền tuyến ngay trong buổi tối
// chỉ với một phần nhỏ nhiên liệu và phụ tùng so với đoàn xe bánh xích.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam = K.track(
      t,
      [
        [197.2, { x: -160, y: 0, z: 0.96 }],
        [203.0, { x: 40, y: 0, z: 0.92 }],
        [210.62, { x: 180, y: 30, z: 0.96 }],
      ],
      A.eio,
    );

    K.begin(c, cam);
    M.mapBg(c, cam, { grid: 120 });

    // 1. Khu doanh trại xuất phát (Barracks) ở bên trái (x = -680, y = -80)
    A.rrect(c, -820, -240, 260, 260, 12, '#dcd3b8', P.ink, LINE.outer);
    for (let r = 0; r < 3; r++) {
      A.rrect(c, -790, -210 + r * 72, 165, 42, 4, P.oliveDark, P.ink, LINE.inner);
    }

    // 2. Đường cao tốc xuyên quốc gia (Highway) nối từ Doanh trại tới Tiền tuyến bên phải (x = +680)
    const hwyPts: A.Pt[] = [
      [-650, -90],
      [-280, -140],
      [180, -70],
      [640, -110],
    ];
    M.road(c, hwyPts, 46);
    // Vạch phân làn đường cao tốc
    A.line(c, hwyPts, P.amber, 3, [22, 18]);

    // Tuyến mặt trận phía Đông (x = 740)
    M.front(c, [[740, -480], [740, 480]], 1, { color: P.enemy, side: 1, tooth: 24 });

    // Đường đo quãng đường 500 km dọc theo cao tốc
    const routeP = A.eio(t, 197.0, 206.4);
    M.route(c, hwyPts, routeP, P.sky);

    // Đoàn 3 chiếc APC 8x8 phóng nhanh trên đường cao tốc từ Doanh trại tới Tiền tuyến
    for (let i = 0; i < 3; i++) {
      const u = A.clamp01(0.04 + routeP * 1.12 - i * 0.14);
      if (i === 0 || u > 0.01) {
        // Nội suy điểm trên đường gấp khúc
        const seg = u * (hwyPts.length - 1);
        const idx = Math.min(hwyPts.length - 2, Math.floor(seg));
        const f = seg - idx;
        const p0 = hwyPts[idx]!;
        const p1 = hwyPts[idx + 1]!;
        const vx = A.lerp(p0[0], p1[0], f);
        const vy = A.lerp(p0[1], p1[1], f);
        const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);

        c.save();
        c.translate(vx, vy);
        c.rotate(ang);
        V.drawAPC8x8(c, { x: 0, y: 0, s: 0.48, dir: 1, view: 'top', wheelRot: t * 12 });
        c.restore();
      }
    }

    // 3. Đối chiếu trực quan ở nửa dưới bản đồ (205.5–210.62s):
    // "using a fraction of the fuel and spare parts a tracked column would burn"
    const fuelCompP = A.sm(t, 206.4, 207.6);
    if (fuelCompP > 0.01) {
      A.withA(c, fuelCompP, () => {
        // Hộp so sánh bên dưới đường cao tốc
        A.rrect(c, -340, 110, 880, 250, 16, P.paper, P.ink, LINE.outer);

        // Dòng 1: APC 8 bánh lốp -> chỉ tốn 2 can nhiên liệu xanh/vàng (Fraction of fuel)
        V.drawAPC8x8(c, { x: -200, y: 195, s: 0.42, dir: 1, view: 'side', rwsType: 'rws' });
        for (let k = 0; k < 2; k++) {
          A.rrect(c, -40 + k * 54, 150, 42, 48, 6, P.olive, P.ink, LINE.inner);
        }
        U.bar(c, 85, 162, 410, 26, 0.22, P.olive, 1);

        // Dòng 2: Đoàn xe bánh xích -> tốn hàng loạt thùng phuy nhiên liệu & mắt xích thay thế (Crippling fuel & spare parts)
        V.drawM113(c, { x: -200, y: 315, s: 0.42, dir: 1, view: 'side' });
        for (let k = 0; k < 6; k++) {
          A.rrect(c, -40 + k * 54, 270, 42, 48, 6, P.enemy, P.ink, LINE.inner);
        }
        U.bar(c, 295, 282, 200, 26, 0.95, P.enemy, 1);
      });
    }

    K.end(c);

    // Callout số liệu chính voice đọc: "100 km/h" (@201.74) và "500 km" (@203.18)
    const p100 = A.win(t, 200.2, 206.5, 0.35, 0.4);
    if (p100 > 0.01) {
      const pt100 = K.toScreen(cam, -120, -135);
      U.callout(c, '100 km/h', pt100[0], pt100[1] - 62, {
        to: pt100,
        p: p100,
        color: P.ink,
        size: 36,
      });
    }
    const p500 = A.win(t, 202.8, 209.8, 0.35, 0.4);
    if (p500 > 0.01) {
      const pt500 = K.toScreen(cam, 380, -105);
      U.callout(c, '500 km', pt500[0], pt500[1] - 62, {
        to: pt500,
        p: p500,
        color: P.sky,
        size: 36,
      });
    }
  }
}
