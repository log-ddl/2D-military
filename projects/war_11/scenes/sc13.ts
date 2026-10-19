// scenes/sc13.ts — Chương 5, Cảnh 13 (339.38 - 369.18s): Bay bám địa hình (Nap of the Earth) & Kích bắn nhô đồi (Pop-up Attack)
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import {
  lw,
  drawArrow,
  drawArc,
  drawBgSkyGrid,
  drawBgTacticalTerrainSide,
  drawHeli,
  drawGunship,
  drawFixedWingPlane,
  drawRadarStation,
  drawArmorTarget,
  drawMissileInFlight,
  drawExplosion2D,
} from './_assets';

export default class extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const rotorA = mainRotorAngleAt(t);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    // Camera lia mượt từ thung lũng bên trái (nơi trực thăng vận tải bay NOE) sang quả đồi trung tâm & mục tiêu bên phải
    const panToHill = A.eio(t, CUE.ch5_gunship_hover - 0.8, CUE.ch5_gunship_hover + 1.2);
    const zoomWide = A.eio(t, CUE.ch5_opposite_fighter - 0.6, CUE.ch5_opposite_fighter + 1.2);

    const camX = A.lerp(-180, 125, panToHill) - zoomWide * 45;
    const camY = A.lerp(45, 25, panToHill) - zoomWide * 30;
    const camZ = A.lerp(1.08, 1.02, panToHill) - zoomWide * 0.08;

    const cam = K.withShake({ x: camX, y: camY, z: camZ }, t, [[CUE.ch5_drop_down, 12, 0.55]]);
    K.begin(c, cam);

    drawBgSkyGrid(c);
    const baseGround = 260;
    drawBgTacticalTerrainSide(c, baseGround);

    // =========================================================================
    // 1. TRẠM RADAR ĐỊCH TRÊN ĐỒI CAO (x = 760) & CHÙM TIA BỊ ĐỒI GIỮA CHẮN
    // =========================================================================
    const radarX = 760;
    const radarY = baseGround - 165;
    const dishX = radarX - 18;
    const dishY = radarY - 64;
    const hillPeakX = 140;
    const hillPeakY = baseGround - 210; // (140, 50)

    const radarReveal = A.eio(t, CUE.ch5_below_radar - 1.2, CUE.ch5_below_radar + 0.5);
    if (radarReveal > 0.01) {
      A.withA(c, radarReveal, () => {
        // Chùm tia radar (Line of Sight) quét từ đài radar (742, 31) chạm đỉnh đồi giữa (140, 50) và vọt lên trời trái (-950, 84)
        // Không thể chiếu xuyên qua quả đồi xuống thung lũng bên dưới!
        A.poly(
          c,
          [
            [dishX, dishY],
            [-950, -320],
            [-950, 84],
            [hillPeakX, hillPeakY],
          ],
          'rgba(220, 38, 38, 0.13)',
          null,
          0
        );

        // Đường giới hạn tầm nhìn thẳng của Radar (Line of Sight)
        A.line(
          c,
          [[dishX, dishY], [hillPeakX, hillPeakY], [-950, 84]],
          P.enemy,
          lw(c, 3),
          [14, 9]
        );

        // Vùng bóng khuất radar (Radar Shadow Zone) an toàn dưới lòng thung lũng
        A.poly(
          c,
          [
            [hillPeakX, hillPeakY],
            [-950, 84],
            [-950, baseGround + 15],
            [-250, baseGround + 20],
            [-40, baseGround - 20],
          ],
          'rgba(56, 189, 248, 0.12)',
          null,
          0
        );

        // Sóng xung radar lan truyền trên cao
        for (let k = 0; k < 4; k++) {
          const rDist = (((t * 260) + k * 240) % 960) + 60;
          drawArc(
            c,
            dishX,
            dishY,
            rDist,
            Math.PI * 0.98,
            Math.PI * 1.18,
            P.enemy,
            lw(c, 2.2)
          );
        }
      });
    }

    // Vẽ đài Radar trên cao nguyên bên phải
    c.save();
    c.translate(radarX, radarY);
    drawRadarStation(c, 'side', 0, 1.15);
    c.restore();

    // =========================================================================
    // 2. XE THIẾT GIÁP MỤC TIÊU ĐỊCH Ở SƯỜN ĐÔNG (x = 495, y = 236)
    // =========================================================================
    const tankX = 495;
    const tankY = baseGround - 22;
    const hitTime = CUE.ch5_drop_down; // 355.04s
    const isDestroyed = t >= hitTime;

    c.save();
    c.translate(tankX, tankY);
    drawArmorTarget(c, 'side', isDestroyed, 1.18);
    c.restore();

    // =========================================================================
    // 3. TRỰC THĂNG VẬN TẢI BAY THẤP BÁM ĐỊA HÌNH (NAP OF THE EARTH: 339.38 - 353s)
    // =========================================================================
    const noeP = A.eio(t, CUE.ch5_start, CUE.ch5_nap_of_earth + 1.5);
    const transX = A.lerp(-740, -395, noeP);
    // Lượn sát theo đường viền mặt đất và ngọn cây trong thung lũng, hoàn toàn dưới vạch đỏ radar
    const terrainFollowY = 148 + Math.sin(noeP * Math.PI * 3) * 18 + Math.sin(t * 3.2) * 3;
    const transPitch = 0.08 + Math.cos(noeP * Math.PI * 3) * 0.06;

    // Đường quỹ đạo bay bám địa hình (Nap-of-the-Earth contour line)
    const trailReveal = A.sm(t, CUE.ch5_valleys_trees - 0.5, CUE.ch5_nap_of_earth + 0.5);
    if (trailReveal > 0.01) {
      A.withA(c, trailReveal, () => {
        const pathPts: A.Pt[] = [];
        for (let s = 0; s <= 24; s++) {
          const u = (s / 24) * noeP;
          const px = A.lerp(-740, -395, u);
          const py = 148 + Math.sin(u * Math.PI * 3) * 18;
          pathPts.push([px, py]);
        }
        if (pathPts.length >= 2) {
          A.line(c, pathPts, P.amber, lw(c, 2.8), [10, 7]);
        }
      });
    }

    c.save();
    c.translate(transX, terrainFollowY);
    c.rotate(transPitch);
    drawHeli(c, {
      view: 'side',
      scale: 0.72,
      rotorAngle: rotorA,
      discTilt: 0.35,
      collectivePitch: 0.5,
    });
    c.restore();

    // =========================================================================
    // 4. TRỰC THĂNG VŨ TRANG GUNSHIP: NẤP SAU ĐỒI -> NHÔ LÊN BẮN TÊN LỬA -> TỤT XUỐNG
    // =========================================================================
    const gunReveal = A.sm(t, CUE.ch5_gunship_hover - 1.2, CUE.ch5_gunship_hover);
    if (gunReveal > 0.01) {
      // Từ 351.68 -> 353.30: treo thấp sau sườn trái đồi (y = 132)
      // 353.30 -> 354.10: nhô thẳng lên đỉnh đồi (y = -18, "pop up")
      // 354.12 -> 355.04: phóng tên lửa diệt xe tăng
      // 355.04 -> 356.10: tụt ngay xuống sau đồi (y = 132, "drop back down")
      // 364.20 -> 368.80: rút lui khỏi trận địa ("leaving before they have time to react")
      const popUpP = A.eio(t, CUE.ch5_pop_up - 0.25, CUE.ch5_fire_missile);
      const dropDownP = A.eio(t, CUE.ch5_drop_down - 0.1, CUE.ch5_drop_down + 1.0);
      const leaveP = A.ei(t, CUE.ch5_leaving_before - 0.4, CUE.ch5_end - 0.3);

      const hoverElevation = popUpP * (1 - dropDownP);
      const gunX = A.lerp(18, -95, leaveP);
      const gunY = A.lerp(132, -18, hoverElevation) + Math.sin(t * 3.8) * 3;
      const gunPitch = hoverElevation * 0.12 - leaveP * 0.1;


      A.withA(c, gunReveal, () => {
        // Mũi tên chỉ động tác Nhô lên (Pop-up) và Tụt xuống (Drop down) sau sườn đồi
        if (t >= CUE.ch5_pop_up - 0.2 && t <= CUE.ch5_opposite_fighter) {
          drawArrow(c, [18, 125], [18, -10], P.amber, lw(c, 2.8), 10);
          if (dropDownP > 0.1) {
            drawArrow(c, [46, -10], [46, 125], P.sky, lw(c, 2.8), 10);
          }
        }

        c.save();
        c.translate(gunX, gunY);
        c.rotate(gunPitch);
        drawGunship(c, 'side', rotorA, 0.92);
        c.restore();
      });

      // Tên lửa chống tăng bay từ Gunship tới xe thiết giáp địch (354.12 -> 355.04s)
      const mFlight = (t - CUE.ch5_fire_missile) / (hitTime - CUE.ch5_fire_missile);
      if (mFlight > 0 && mFlight < 1) {
        const mx0 = gunX + 52;
        const my0 = gunY + 18;
        const mx1 = tankX - 10;
        const my1 = tankY - 12;
        const mx = A.lerp(mx0, mx1, mFlight);
        const my = A.lerp(my0, my1, mFlight);
        const mAngle = Math.atan2(my1 - my0, mx1 - mx0);
        // Vệt khói tên lửa
        A.line(c, [[mx0, my0], [mx, my]], P.amber, lw(c, 2.4), [8, 6]);
        drawMissileInFlight(c, mx, my, mAngle, P.enemy);
      }

      // Vụ nổ tại mục tiêu xe thiết giáp khi tên lửa chạm đích (355.04s)
      const expP = (t - hitTime) / 1.15;
      if (expP > 0 && expP < 1) {
        drawExplosion2D(c, tankX, tankY - 14, expP, 98);
      }
      // Khói đen bốc lên từ xác xe thiết giáp sau vụ nổ
      if (t > hitTime + 0.3) {
        const smokeA = A.clamp01((t - hitTime - 0.3) / 0.8) * 0.65;
        A.withA(c, smokeA, () => {
          for (let i = 0; i < 4; i++) {
            const sy = ((t * 32 + i * 28) % 110);
            const sx = Math.sin(t * 2 + i) * 12;
            A.circle(c, tankX + sx, tankY - 22 - sy, 14 + sy * 0.18, P.slate, P.ink, li);
          }
        });
      }
    }

    // =========================================================================
    // 5. ĐỐI LẬP VỚI TIÊM KÍCH BAY CAO & NHANH TRONG VÙNG RADAR (358.00 - 369.18s)
    // =========================================================================
    const fighterReveal = A.eio(t, CUE.ch5_opposite_fighter - 0.3, CUE.ch5_opposite_fighter + 1.0);
    if (fighterReveal > 0.01) {
      const fProgress = A.ph(t, CUE.ch5_opposite_fighter - 0.3, CUE.ch5_end);
      const fx = A.lerp(-620, 480, fProgress);
      const fy = -215;

      A.withA(c, fighterReveal, () => {
        // Vệt tốc độ cao trên tầng không
        A.line(c, [[fx - 260, fy], [fx - 110, fy]], P.sky, lw(c, 3), [16, 10]);
        drawArrow(c, [fx + 115, fy], [fx + 210, fy], P.sky, lw(c, 3.2), 11);

        c.save();
        c.translate(fx, fy);
        drawFixedWingPlane(c, 'side', 0.82);
        c.restore();

        // Vòng khóa mục tiêu đỏ của Radar bắt dính chiếc máy bay bay cao
        const pulse = 54 + Math.sin(t * 9) * 6;
        A.circle(c, fx, fy, pulse, null, P.enemy, lw(c, 2.8));
        A.line(c, [[dishX, dishY], [fx, fy]], P.enemy, lw(c, 2.2), [8, 6]);
      });
    }

    K.end(c);
  }
}
