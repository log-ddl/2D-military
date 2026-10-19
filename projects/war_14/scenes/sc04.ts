// scenes/sc04.ts — Chương 4 (280.00 – 388.76s): Bước sóng VHF cộng hưởng, quy luật 1/R^4 rút tầm phát hiện còn 1/3, đường bay hình học & mạng lưới radar đa điểm
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawTechBg,
  drawSkyGroundBg,
  drawTacticalMapBg,
  drawStealthDiamond,
  drawConventionalJet,
  drawRadarStation,
  drawPassiveReceiver,
  drawSamBattery,
  drawRadarWave,
} from './_assets';

export default class Sc04 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // ── NHỊP 4.1 (280.00 – 312.24s): GIỚI HẠN BƯỚC SÓNG — SÓNG NGẮN VS SÓNG DÀI VHF CỘNG HƯỞNG ─
    if (t < CUE.fourth_power_range) {
      const cam: K.Cam = { x: 40, y: 20, z: 1.0 };
      A.clear(c, P.bg);
      K.begin(c, cam);
      drawSkyGroundBg(c, cam, { groundY: 260, scrollX: (t - CUE.ch4_start) * 40 });

      const jx = -160;
      const jy = -105 + Math.sin(t * 1.6) * 6;
      const isVhf = t >= CUE.long_wavelength_vhf - 0.5 && t < CUE.reduction_in_range;
      const isResonant = t >= CUE.resonant_elements - 0.5 && t < CUE.reduction_in_range;

      drawStealthDiamond(c, jx, jy, 1.55, 'side', {
        highlightFacet: isResonant ? 99 : 0,
      });

      // Đài radar mặt đất bên phải (chuyển sang ăng-ten VHF sóng dài tại 287.2s)
      const rx = 560, ry = 260;
      drawRadarStation(c, rx, ry, 1.35, 'side', {
        vhfMode: isVhf,
        dishAngle: -0.35,
      });

      if (t < CUE.long_wavelength_vhf - 0.5) {
        // 280.00 – 287.2s: Sóng tần số cao có bước sóng ngắn (nhỏ hơn nhiều so với mặt vát máy bay) -> bị hắt lệch dễ dàng
        const pShort = A.sm(t, 280.4, 282.0);
        const hitPt: A.Pt = [jx + 150, jy + 8];
        drawRadarWave(c, [rx - 45, ry - 110], hitPt, pShort, {
          color: P.sky,
          w: A.px(c, 5),
          wavelength: 26,
          amp: 7,
        });
        drawRadarWave(c, hitPt, [jx + 370, jy - 240], pShort, {
          color: P.amber,
          w: A.px(c, 5.5),
          wavelength: 26,
          amp: 7,
        });
      } else if (isVhf) {
        // 287.2 – 306.62s: Sóng VHF bước sóng rất dài (tương đương kích thước thân/cánh) gây cộng hưởng!
        const pVhf = A.sm(t, CUE.long_wavelength_vhf - 0.3, CUE.long_wavelength_vhf + 1.2);
        drawRadarWave(c, [rx - 20, ry - 155], [jx + 40, jy], pVhf, {
          color: P.sky,
          w: A.px(c, 6),
          wavelength: 185,
          amp: 28,
        });

        if (isResonant) {
          // Cả khung máy bay cộng hưởng với sóng dài và phát vòng sóng đỏ ngược về đài VHF
          const resP = A.sm(t, CUE.resonant_elements - 0.3, CUE.resonant_elements + 1.0);
          for (const r of [140, 220, 300]) {
            A.circle(c, jx, jy, r * resP, null, P.enemy, A.px(c, 3.5));
          }
          drawRadarWave(c, [jx + 40, jy], [rx - 20, ry - 155], resP, {
            color: P.enemy,
            w: A.px(c, 5.5),
            wavelength: 185,
            amp: 22,
          });
        }

        // 296.08 – 306.62s: "Not precise enough to guide a missile, but they can tell that something is there"
        if (t >= CUE.not_precise_missile - 2.2) {
          const samX = 240, samY = 260;
          drawSamBattery(c, samX, samY, 1.15, 'side', { railAngle: -0.75, missiles: 2 });
          // Nón ngắm mờ rộng không khóa được điểm chính xác
          A.poly(
            c,
            [
              [samX, samY - 60],
              [jx - 220, jy + 130],
              [jx + 260, jy - 190],
            ],
            'rgba(180,73,60,0.12)',
            P.enemy,
            A.px(c, 2.5)
          );
        }
      } else {
        // 306.62 – 312.24s: "Reduction in detection range at the frequencies that matter for shooting"
        const shrink = A.eio(t, CUE.reduction_in_range, 310.5);
        const curR = A.lerp(680, 290, shrink);
        A.circle(c, rx - 45, ry - 110, 680, null, P.light, A.px(c, 2.5));
        A.circle(c, rx - 45, ry - 110, curR, 'rgba(180,73,60,0.10)', P.enemy, A.px(c, 4));
      }

      K.end(c);

      if (t >= 287.5 && t <= 295.5) {
        const pt = K.toScreen(cam, 560, 75);
        U.callout(c, 'VHF', pt[0], pt[1] - 52, {
          to: pt,
          p: A.win(t, 287.5, 295.5, 0.3, 0.3),
          color: P.enemy,
        });
      }
      return;
    }

    // ── NHỊP 4.2 (312.24 – 338.16s): QUY LUẬT LŨY THỪA 4 (1/100 ECHO -> 1/3 RANGE) & MUA TỪNG GIÂY ─
    if (t < CUE.puzzle_of_geometry) {
      if (t < 325.6) {
        // 312.24 – 325.6s: Sơ đồ ngang đối chiếu trực tiếp Tầm phát hiện Máy bay thường (R) vs Máy bay tàng hình (1/3 R)
        const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
        A.clear(c, P.bg);
        K.begin(c, cam);
        drawTechBg(c, cam);

        // Đài radar đặt cố định ở bên phải (640) cho cả 2 đường đo
        drawRadarStation(c, 640, -130, 1.1, 'side', { dishAngle: -0.1 });
        drawRadarStation(c, 640, 220, 1.1, 'side', { dishAngle: -0.1 });

        // Hàng trên: Máy bay thường (100% Echo -> Bị phát hiện ở toàn bộ cự ly R)
        const convX = -430, convY = -195;
        drawConventionalJet(c, convX, convY, 1.12, 'side', { externalWeapons: true });
        A.line(c, [[convX + 180, convY], [560, convY]], P.enemy, A.px(c, 5));
        // Cột độ lớn tiếng vọng (100%) tách biệt bên trái (-790)
        A.rrect(c, -790, -265, 54, 140, 6, P.enemy, P.ink, A.px(c, 3));

        // Hàng dưới: Máy bay tàng hình (1/100 Echo -> Tầm phát hiện co về 1/3 R!)
        const pThird = A.eio(t, 319.5, CUE.falls_to_third + 0.6);
        const stX = A.lerp(-430, 190, pThird);
        const stY = 155;

        // Vạch khoảng cách cũ (mờ) chia 3 đoạn bằng nhau và khoảng cách 1/3 mới
        A.line(c, [[-430 + 180, stY], [560, stY]], P.light, A.px(c, 3), [10, 8]);
        for (const tickX of [-10, 275]) {
          A.line(c, [[tickX, stY - 16], [tickX, stY + 16]], P.ink2, A.px(c, 2.5));
        }
        A.line(c, [[stX + 160, stY], [560, stY]], P.amber, A.px(c, 6));
        drawStealthDiamond(c, stX, stY, 1.18, 'side', { highlightFacet: 0 });

        // Cột độ lớn tiếng vọng (1/100: cực nhỏ ở đáy cột)
        A.rrect(c, -790, 85, 54, 140, 6, P.white, P.ink, A.px(c, 3));
        A.rrect(c, -790, 211, 54, 14, 4, P.amber, P.ink, A.px(c, 2.5));

        K.end(c);

        if (t >= CUE.cut_to_hundredth - 1.0 && t <= 325.2) {
          const p1 = K.toScreen(cam, -763, 85);
          U.callout(c, '1/100', p1[0], p1[1] - 48, {
            to: p1,
            p: A.win(t, CUE.cut_to_hundredth - 1.0, 325.2, 0.3, 0.3),
            color: P.ink,
          });
        }
        if (t >= 321.2 && t <= 325.4) {
          const p2 = K.toScreen(cam, 415, 155);
          U.callout(c, '1/3 RANGE', p2[0], p2[1] - 56, {
            to: p2,
            p: A.win(t, 321.2, 325.4, 0.3, 0.3),
            color: P.amber,
          });
        }
      } else {
        // 325.6 – 338.16s: Góc nhìn bản đồ ('top') — Vòng phát hiện 1/3 khiến khẩu đội SAM chỉ còn vài giây phản ứng
        const cam: K.Cam = { x: 0, y: 0, z: 0.98 };
        A.clear(c, P.bg);
        K.begin(c, cam);
        drawTacticalMapBg(c, cam);

        const bx = 220, by = 45;
        // Vòng phát hiện thường (R = 450) vs Vòng phát hiện 1/3 (R = 165)
        A.circle(c, bx, by, 450, null, P.light, A.px(c, 3));
        A.circle(c, bx, by, 165, 'rgba(180,73,60,0.18)', P.enemy, A.px(c, 4));

        drawRadarStation(c, bx - 48, by + 35, 0.95, 'top', { dishAngle: t * 2.2 });
        drawSamBattery(c, bx + 48, by + 35, 0.95, 'top', { railAngle: -2.2 });

        // Chiếc F-117 bay ở hành lang phía trên (jy = -55), chỉ báo động khi cắt vào vòng 1/3
        const flyP = A.ph(t, 325.6, 337.8);
        const jx = A.lerp(-520, 360, flyP);
        const jy = -55;
        drawStealthDiamond(c, jx, jy, 0.85, 'top');

        // Thanh thời gian phản ứng (Reaction Time Bar) của khẩu đội SAM tụt nhanh khi máy bay vào vòng 1/3
        const inInner = jx >= bx - 165 - 60;
        const timeRem = inInner ? 1 - A.clamp01((jx - (bx - 225)) / 420) : 1;
        U.bar(c, bx - 140, by + 215, 280, 28, timeRem, inInner ? P.enemy : P.olive, 1);

        K.end(c);
      }
      return;
    }

    // ── NHỊP 4.3 (338.16 – 388.76s): BÀI TOÁN HÌNH HỌC ĐƯỜNG BAY & MẠNG LƯỚI CẢM BIẾN ĐA ĐIỂM ('TOP') ─
    const cam = K.track(
      t,
      [
        [CUE.puzzle_of_geometry, { x: 0, y: 0, z: 0.95 }],
        [365.5, { x: 0, y: 0, z: 0.95 }],
        [367.2, { x: 40, y: 0, z: 0.96 }],
        [CUE.ch4_end, { x: 40, y: 0, z: 0.96 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);
    drawTacticalMapBg(c, cam);

    if (t < 365.78) {
      // 338.16 – 365.78s: Vạch đường bay hình học giữa 3 đài radar đối phương & Nguy cơ rẽ sai góc (careless turn)
      const radars: A.Pt[] = [
        [-220, -290],
        [60, 295],
        [490, -220],
      ];
      const isCarelessTurn = t >= CUE.careless_turn - 0.3;

      for (let i = 0; i < radars.length; i++) {
        const [rx, ry] = radars[i]!;
        const alert = isCarelessTurn && i === 1 ? A.sm(t, CUE.careless_turn, CUE.careless_turn + 0.8) : 0;
        A.circle(c, rx, ry, 185, alert > 0.2 ? 'rgba(180,73,60,0.22)' : 'rgba(180,73,60,0.08)', P.enemy, A.px(c, 2.5));
        drawRadarStation(c, rx, ry, 1.0, 'top', {
          dishAngle: i === 1 ? -1.57 : 0.8 + i,
          alert,
        });
      }

      // Đường bay gấp khúc như đường chéo bàn cờ (chess diagonal)
      const routePts: A.Pt[] = [
        [-680, 120],
        [-310, 40],
        [15, -70],
        [240, 30],
        [640, 110],
      ];
      const routeP = A.sm(t, 343.0, 357.5);
      U.pathArrow(c, routePts, { p: routeP, color: P.oliveDark, w: A.px(c, 5), dash: [16, 10] });

      // Vị trí và góc xoay của F-117 trên đường bay
      let jx = 15, jy = -70, jrot = 0.45;
      if (!isCarelessTurn) {
        const u = A.ph(t, 344.0, 358.5);
        if (u < 0.35) {
          const k = u / 0.35;
          jx = A.lerp(-680, -310, k);
          jy = A.lerp(120, 40, k);
          jrot = -0.21;
        } else if (u < 0.7) {
          const k = (u - 0.35) / 0.35;
          jx = A.lerp(-310, 15, k);
          jy = A.lerp(40, -70, k);
          jrot = -0.32;
        } else {
          const k = (u - 0.7) / 0.3;
          jx = A.lerp(15, 240, k);
          jy = A.lerp(-70, 30, k);
          jrot = 0.42;
        }
      } else {
        // 359.14 – 365.78s: "A single careless turn can change a quiet sky into a loud one"
        jx = 60;
        jy = -40;
        jrot = A.lerp(0.42, 0.0, A.sm(t, CUE.careless_turn - 0.2, CUE.careless_turn + 0.6));
      }

      drawStealthDiamond(c, jx, jy, 0.88, 'top', { rot: jrot });

      // Hai cánh phản xạ mạnh (strongest echo lobes):
      // - Khi bay đúng lộ trình: luôn phóng vào vùng đất trống (empty ground) giữa các vòng radar
      // - Khi rẽ bất cẩn (isCarelessTurn): quét thẳng trúng đài radar (60, 295) bằng chùm đỏ P.enemy!
      if (!isCarelessTurn) {
        drawRadarWave(c, [jx, jy], [jx + 135, jy - 220], 1, { color: P.amber, w: A.px(c, 4.5) });
        drawRadarWave(c, [jx, jy], [jx - 190, jy + 185], 1, { color: P.amber, w: A.px(c, 4.5) });
      } else {
        drawRadarWave(c, [jx, jy], [60, 285], 1, { color: P.enemy, w: A.px(c, 6.5) });
        drawRadarWave(c, [jx, jy], [60, -295], 1, { color: P.amber, w: A.px(c, 4.5) });
      }
    } else {
      // 365.78 – 388.76s: Mạng lưới cảm biến đa vị trí (Bistatic/Multistatic Receivers) đón bắt tia hắt ngang
      const jx = 0, jy = -10;
      drawStealthDiamond(c, jx, jy, 1.05, 'top');

      // Đài phát radar chính ở phía trước mũi máy bay (520, -10)
      const tx = 520, ty = -10;
      drawRadarStation(c, tx, ty, 1.15, 'top', { dishAngle: Math.PI });

      // Chùm sóng phát tới từ đài chính
      const pSend = A.sm(t, 366.2, 368.0);
      drawRadarWave(c, [tx - 50, ty], [jx + 160, jy], pSend, {
        color: P.sky,
        w: A.px(c, 5.5),
      });

      // Các tia phản xạ bị hình dáng tàng hình hắt chéo sang hai bên (sideways@378.90)
      const rec1: A.Pt = [-40, -310];
      const rec2: A.Pt = [-40, 310];
      const rec3: A.Pt = [240, -290];

      const pSide = A.sm(t, 368.5, 371.0);
      drawRadarWave(c, [jx + 60, jy - 40], rec1, pSide, { color: P.amber, w: A.px(c, 5.5) });
      drawRadarWave(c, [jx + 60, jy + 40], rec2, pSide, { color: P.amber, w: A.px(c, 5.5) });
      drawRadarWave(c, [jx + 120, jy - 20], rec3, pSide, { color: P.amber, w: A.px(c, 5.5) });

      // 371.98 – 388.76s: Các trạm thu thụ động (receivers at other sites) bắt trọn sóng hắt ngang và nối thành mạng lưới
      const pRec = A.sm(t, CUE.receivers_other_sites - 1.0, CUE.receivers_other_sites + 0.8);
      if (pRec > 0) {
        A.withA(c, pRec, () => {
          drawPassiveReceiver(c, rec1[0], rec1[1], 1.15, 'top', { active: pRec });
          drawPassiveReceiver(c, rec2[0], rec2[1], 1.15, 'top', { active: pRec });
          drawPassiveReceiver(c, rec3[0], rec3[1], 1.15, 'top', { active: pRec });
        });
      }

      // 382.34 – 388.76s: "Networks of sensors, rather than single stations, are the answer"
      if (t >= CUE.networks_of_sensors - 0.8) {
        const pNet = A.sm(t, CUE.networks_of_sensors - 0.8, CUE.networks_of_sensors + 0.8);
        // Đường liên kết mạng lưới giữa đài phát và các trạm thu thụ động
        A.line(c, [rec1, [tx, ty], rec2, rec1], P.enemy, A.px(c, 3.5), [12, 8]);
        A.line(c, [rec3, [tx, ty]], P.enemy, A.px(c, 3.5), [12, 8]);
        // Tâm ngắm định vị khóa chặt máy bay tàng hình ở giữa mạng lưới
        U.crosshair(c, jx, jy, 64, P.enemy, pNet, (t - CUE.networks_of_sensors) * 0.6);
      }
    }

    K.end(c);
  }
}
