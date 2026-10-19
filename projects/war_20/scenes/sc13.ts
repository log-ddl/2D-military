// sc13.ts (415.58 – 458.70s): Tử huyệt chiến lược trên chiến trường Thái Bình Dương (TOP view) —
// Tiêm kích hiện đại chỉ có bán kính tự thân 1.000 km; tên lửa tầm xa đối phương vòng qua tiêm kích tàng hình
// ở tiền tuyến để bắn hạ trạm xăng bay khổng lồ lượn vòng phía sau 300 km, làm tiêm kích tự cạn dầu rơi xuống biển.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as UI from './shared/ui';
import { P } from './shared/palette';
import {
  drawOceanMapBg,
  drawModernTanker,
  drawStrikeFighter,
  drawCGMarker,
  drawEnemyMissile,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_state';

/** Nội suy điểm và góc hướng trên đường cong Bezier bậc 3 */
function evalCubic(
  p0: A.Pt,
  p1: A.Pt,
  p2: A.Pt,
  p3: A.Pt,
  u: number
): { x: number; y: number; ang: number } {
  const t = A.clamp01(u);
  const mt = 1 - t;
  const x =
    mt * mt * mt * p0[0] +
    3 * mt * mt * t * p1[0] +
    3 * mt * t * t * p2[0] +
    t * t * t * p3[0];
  const y =
    mt * mt * mt * p0[1] +
    3 * mt * mt * t * p1[1] +
    3 * mt * t * t * p2[1] +
    t * t * t * p3[1];
  const dx =
    3 * mt * mt * (p1[0] - p0[0]) +
    6 * mt * t * (p2[0] - p1[0]) +
    3 * t * t * (p3[0] - p2[0]);
  const dy =
    3 * mt * mt * (p1[1] - p0[1]) +
    6 * mt * t * (p2[1] - p1[1]) +
    3 * t * t * (p3[1] - p2[1]);
  return { x, y, ang: Math.atan2(dy, dx) };
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    let cam = K.track(
      t,
      [
        [415.58, { x: 10, y: 0, z: 0.96 }],
        [428.0, { x: 10, y: 0, z: 0.96 }],
        // Mở rộng toàn cảnh Thái Bình Dương từ căn cứ phía Tây (-720) tới đảo đối phương phía Đông (+780)
        [430.2, { x: 20, y: 0, z: 0.82 }],
        [452.8, { x: 20, y: 0, z: 0.82 }],
        // Lia nhẹ về phía biên đội tiêm kích cạn xăng rơi xuống biển sau khi Tanker nổ (453.5 – 458.70s)
        [455.2, { x: 85, y: 0, z: 0.90 }],
        [458.7, { x: 85, y: 0, z: 0.90 }],
      ],
      A.eio
    );

    cam = K.withShake(cam, t, [
      [CUE.shoot_down_tanker, 22, 0.7],
      [CUE.fighters_fall_ocean + 0.8, 10, 0.45],
    ]);

    A.clear(c, P.bg2);
    K.begin(c, cam);
    drawOceanMapBg(c, cam, 'pacific', t);

    const lo = lwO(c);
    const li = lwI(c);

    const tx = -210;
    const ty = 0;
    const fx = 230;
    const fyTop = -125;
    const fyBot = 125;

    const tankerHit = t >= CUE.shoot_down_tanker;
    const hitAge = t - CUE.shoot_down_tanker;

    // 1. Vòng bán kính chiến đấu tự thân 1.000 km của tiêm kích quanh căn cứ (-720, -15) — chỉ mới chớm ra biển
    const radWin = A.win(t, CUE.unrefueled_radius_1000km - 0.5, 442.2, 0.5, 0.5);
    if (radWin > 0.01) {
      A.withA(c, radWin, () => {
        c.save();
        c.strokeStyle = P.enemy;
        c.fillStyle = 'rgba(180, 73, 60, 0.09)';
        c.lineWidth = lo * 1.1;
        c.setLineDash([A.px(c, 10), A.px(c, 8)]);
        c.beginPath();
        c.arc(-720, -15, 340, -Math.PI * 0.42, Math.PI * 0.42);
        c.stroke();
        c.lineTo(-720, -15);
        c.closePath();
        c.fill();
        c.restore();
      });
    }

    // 2. Đường quỹ đạo lượn vòng (Orbit Racetrack) của Tanker ở (-210, 0) + đường cấp xăng ra tiền tuyến
    A.ellipse(c, tx, ty, 175, 88, 0, null, 'rgba(71, 85, 105, 0.35)', li, [
      A.px(c, 8),
      A.px(c, 8),
    ]);

    if (!tankerHit) {
      // Hai đường cầu nhiên liệu màu vàng hổ phách nuôi sống 2 tiêm kích ở tiền tuyến
      for (const fy of [fyTop, fyBot]) {
        A.line(c, [[tx + 85, ty], [fx - 85, fy]], P.amber, lo, [A.px(c, 10), A.px(c, 8)]);
      }
    }

    // Khoảng cách 300 km từ tiền tuyến tiêm kích (fx = 230) lùi về trạm xăng bay Tanker (tx = -210)
    const dist300Win = A.win(t, CUE.giant_fuel_station_300km - 1.2, 453.2, 0.35, 0.3);
    if (dist300Win > 0.01) {
      A.withA(c, dist300Win, () => {
        const by = 225;
        A.line(c, [[tx, by], [fx, by]], P.sky, lo);
        A.line(c, [[tx, by - 14], [tx, by + 14]], P.sky, lo);
        A.line(c, [[fx, by - 14], [fx, by + 14]], P.sky, lo);
      });
    }

    // 3. Vẽ Modern Tanker ("Trạm xăng bay khổng lồ" — Tử huyệt Center of Gravity)
    const tankerFade = tankerHit ? Math.max(0, 1 - hitAge * 0.55) : 1;
    if (tankerFade > 0.01) {
      A.withA(c, tankerFade, () => {
        c.save();
        c.translate(tx, ty);
        if (tankerHit) {
          c.rotate(hitAge * 0.25);
          c.scale(1 - hitAge * 0.15, 1 - hitAge * 0.15);
        }
        drawModernTanker(c, 'top', {
          scale: 1.22,
          wingPods: true,
          hasBoom: true,
        });
        c.restore();
      });
    }

    // Vòng khóa Trọng tâm chiến lược (Center of Gravity) trên lưng Tanker (430.2 – 453.2s)
    const cgWin = A.win(t, CUE.tanker_center_of_gravity - 0.4, 453.2, 0.45, 0.3);
    if (cgWin > 0.01) {
      A.withA(c, cgWin, () => {
        A.circle(c, tx, ty, 64, 'rgba(245, 158, 11, 0.14)', P.amber, lo * 1.2);
        drawCGMarker(c, tx - 18, ty, 20, t >= CUE.decisive_target_missiles);
      });
    }

    // 4. Vẽ 2 tiêm kích tàng hình ở tiền tuyến (fx = 230, y = ±125)
    // Khi Tanker nổ ở 453.32s -> cạn sạch bình xăng -> chúi lảo đảo rơi xuống biển ở 455.5s
    const fallP = A.eio(t, CUE.fighters_fall_ocean - 0.3, 458.3);
    const fFuel = tankerHit ? Math.max(0, 0.85 - hitAge * 0.65) : 0.85;

    for (const [idx, baseFy] of [
      [0, fyTop],
      [1, fyBot],
    ] as const) {
      const sign = idx === 0 ? -1 : 1;
      const curX = fx + (tankerHit ? hitAge * 26 : Math.sin(t * 2 + idx) * 6);
      const curY = baseFy + fallP * sign * 42;
      const curScale = 1.18 * (1 - fallP * 0.42);

      // Vòng bọt nước trắng khi tiêm kích cạn dầu rơi xuống mặt biển (456.8 – 458.7s)
      const splashAge = t - (CUE.fighters_fall_ocean + 1.1 + idx * 0.25);
      if (splashAge > 0 && splashAge < 1.8) {
        const sp = A.clamp01(splashAge / 1.5);
        A.withA(c, 1 - sp, () => {
          A.circle(c, curX + 20, curY, 18 + sp * 58, null, P.white, lo * 1.1);
          A.circle(c, curX + 20, curY, 8 + sp * 32, 'rgba(255,255,255,0.35)', P.sky, li);
        });
      }

      A.withA(c, 1 - fallP * 0.35, () => {
        c.save();
        c.translate(curX, curY);
        c.rotate(fallP * sign * 0.48);
        drawStrikeFighter(c, 'top', {
          scale: curScale,
          hasReceptacle: true,
          fuelLevel: fFuel,
          afterburner: tankerHit ? 0 : 0.75,
        });
        c.restore();
      });

      // Vòng tàng hình mảnh quanh tiêm kích lúc đối phương bỏ qua (420.5 – 448.0s)
      const stealthWin = A.win(t, CUE.speed_stealth_fighters - 0.4, 448.0, 0.4, 0.4);
      if (stealthWin > 0.01) {
        A.withA(c, stealthWin * 0.55, () => {
          A.circle(c, curX + 5, curY, 72, null, P.sky, li, [A.px(c, 6), A.px(c, 6)]);
        });
      }
    }

    // 5. Hai quả tên lửa đánh chặn tầm xa phóng từ đảo đối phương (+770, ±55),
    // LƯỢN VÒNG BỎ QUA 2 tiêm kích tàng hình để đâm thẳng vào Tanker ở (-210, 0) (442.2 – 453.32s)
    const mProg = A.eio(t, CUE.decisive_target_missiles - 0.2, CUE.shoot_down_tanker);
    if (t >= CUE.decisive_target_missiles - 0.2 && !tankerHit) {
      for (const sy of [-1, 1] as const) {
        const p0: A.Pt = [770, sy * 55];
        const p1: A.Pt = [460, sy * 255];
        const p2: A.Pt = [60, sy * 245];
        const p3: A.Pt = [tx + 15, sy * 18];

        // Vẽ vệt đường bay tên lửa vòng qua tiêm kích
        const trailPts: A.Pt[] = [];
        const steps = 24;
        const maxStep = Math.max(1, Math.floor(mProg * steps));
        for (let i = 0; i <= maxStep; i++) {
          const u = (i / steps) * mProg;
          const pt = evalCubic(p0, p1, p2, p3, u);
          trailPts.push([pt.x, pt.y]);
        }
        A.line(c, trailPts, P.enemy, lo * 1.1, [A.px(c, 8), A.px(c, 6)]);

        const head = evalCubic(p0, p1, p2, p3, mProg);
        drawEnemyMissile(c, head.x, head.y, head.ang, 1.15);
      }
    }

    // 6. Quầng nổ lớn khi tên lửa bắn hạ Tanker tại 453.32s + dấu tích xác máy bay rơi trên mặt biển
    if (tankerHit) {
      A.withA(c, A.clamp01(hitAge * 1.5) * 0.75, () => {
        A.circle(c, tx, ty, 44, 'rgba(180, 73, 60, 0.16)', P.enemy, lo);
        A.line(c, [[tx - 24, ty - 24], [tx + 24, ty + 24]], P.enemy, lo * 1.4);
        A.line(c, [[tx - 24, ty + 24], [tx + 24, ty - 24]], P.enemy, lo * 1.4);
      });
    }
    if (hitAge >= 0 && hitAge < 2.2) {
      FX.explosion(c, tx, ty, hitAge, 1.6, 125);
      FX.debris(c, tx, ty, hitAge, 1.5, 16, 41);
    }

    K.end(c);

    // ── Callout số liệu chiến dịch tối giản (tối đa 1 cùng lúc) ──
    const p1000 = A.win(t, CUE.unrefueled_radius_1000km - 0.2, 441.8, 0.25, 0.25);
    if (p1000 > 0.01) {
      const [sx, sy] = K.toScreen(cam, -445, -230);
      UI.callout(c, '1,000 KM', sx - 95, sy - 65, { to: [sx, sy], p: p1000, color: P.enemy });
    }

    const p300 = A.win(t, CUE.giant_fuel_station_300km - 0.6, 452.8, 0.25, 0.25);
    if (p300 > 0.01) {
      const [sx, sy] = K.toScreen(cam, (tx + fx) / 2, 225);
      UI.callout(c, '300 KM', sx, sy + 78, { to: [sx, sy], p: p300, color: P.sky });
    }
  }
}
