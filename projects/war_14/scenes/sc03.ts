// scenes/sc03.ts — Chương 3 (169.58 – 280.00s): Vật liệu RAM, bản đồ RCS bí mật, khí động học Wobbling Goblin & đột kích ban đêm
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as FX from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawTechBg,
  drawSkyGroundBg,
  drawHangarBg,
  drawTacticalMapBg,
  drawStealthDiamond,
  drawConventionalJet,
  drawRadarStation,
  drawRamCutaway,
  drawMechanicCrew,
  drawRcsObjects,
  drawRadarWave,
  drawGuidedBomb,
} from './_assets';

export default class Sc03 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // ── NHỊP 3.1 (169.58 – 202.54s): LỚP PHỦ HẤP THỤ SÓNG (RAM) & BẢO DƯỠNG HANGAR ─
    if (t < CUE.nobody_knows) {
      if (t < 192.36) {
        // 169.58 – 192.36s: Mặt cắt cận cảnh lớp phủ RAM (chuyển sóng vô tuyến thành nhiệt & dễ hỏng do mưa cát)
        const cam: K.Cam = { x: 0, y: 0, z: 1.12 };
        A.clear(c, P.bg);
        K.begin(c, cam);
        drawTechBg(c, cam);

        // Hình thu nhỏ của F-117 ở góc trên trái kèm khung phóng đại nối chuẩn xác tới hai đầu khối mặt cắt RAM
        drawStealthDiamond(c, -480, -255, 0.82, 'side', { highlightFacet: 0 });
        A.rrect(c, -405, -292, 74, 48, 4, null, P.amber, A.px(c, 3));
        A.line(c, [[-405, -244], [-372, -21]], P.amber, A.px(c, 2.5), [10, 7]);
        A.line(c, [[-331, -244], [492, -21]], P.amber, A.px(c, 2.5), [10, 7]);

        const heat = A.win(t, CUE.ram_particles - 0.5, CUE.rain_sand_damage, 0.8, 0.8);
        const dmg = A.sm(t, CUE.rain_sand_damage - 0.4, CUE.rain_sand_damage + 1.2);

        drawRamCutaway(c, 60, 60, 1.35, {
          heatGlow: heat,
          damage: dmg,
        });

        // Chùm sóng vô tuyến từ trên chiếu xuống lớp phủ RAM
        const pIn = A.sm(t, 170.5, 172.2);
        drawRadarWave(c, [-180, -310], [-80, -22], pIn, {
          color: P.sky,
          w: A.px(c, 5.5),
          wavelength: 44,
          amp: 11,
        });
        drawRadarWave(c, [280, -310], [190, -22], pIn, {
          color: P.sky,
          w: A.px(c, 5.5),
          wavelength: 44,
          amp: 11,
        });

        // Gợn nhiệt toả ra từ các hạt vi mô khi chuyển hoá năng lượng sóng (177.22 – 188.0s)
        if (heat > 0.1) {
          A.withA(c, heat, () => {
            for (const hx of [-110, 10, 130, 250]) {
              drawRadarWave(c, [hx, -22], [hx, -145], 1, {
                color: P.amber,
                w: A.px(c, 3.8),
                wavelength: 28,
                amp: 6,
                arrow: false,
              });
            }
          });
        }

        // 188.0 – 192.36s: Mưa và hạt cát đập vào làm nứt lớp phủ -> tia phản xạ đỏ vọt ngược ra ngoài!
        if (t >= CUE.rain_sand_damage - 0.6) {
          const rProg = (t - (CUE.rain_sand_damage - 0.6)) * 2.4;
          for (let i = 0; i < 10; i++) {
            const rx = -140 + i * 42 + ((rProg * 80 + i * 29) % 60);
            const ry = -280 + ((rProg * 220 + i * 73) % 240);
            A.line(c, [[rx, ry], [rx - 14, ry + 26]], P.sky, A.px(c, 3));
            A.circle(c, rx + 12, ry + 18, 4.5, P.sand, P.ink, A.px(c, 1.5));
          }
          if (dmg > 0.35) {
            // Tia phản xạ mạnh bắn ngược lên từ vết hở kim loại
            drawRadarWave(c, [60, 35], [175, -295], (dmg - 0.35) / 0.65, {
              color: P.enemy,
              w: A.px(c, 6.5),
            });
          }
        }

        K.end(c);
      } else {
        // 192.36 – 202.54s: Nhà chứa máy bay (Hangar) — Đội thợ dành hàng giờ bảo dưỡng lớp vỏ
        const cam: K.Cam = { x: 0, y: 85, z: 1.24 };
        A.clear(c, P.bg);
        K.begin(c, cam);
        drawHangarBg(c, cam, 260);

        // Máy bay F-117 đặt trên giá nâng bảo dưỡng trong hangar (lớn, rõ chủ thể)
        drawStealthDiamond(c, -20, 110, 1.95, 'side');
        // Trụ kích nâng thủy lực dưới bụng
        A.rrect(c, -215, 132, 22, 128, 3, P.slate, P.ink, A.px(c, 3));
        A.rrect(c, 145, 132, 22, 128, 3, P.slate, P.ink, A.px(c, 3));

        // Mảng vỏ bị tróc trên sống lưng và mũi đang được trám lại
        const repairP = A.sm(t, 193.5, 200.0);
        A.rrect(c, -155, 68, 62 * (1 - repairP * 0.55), 24, 3, P.enemy, P.ink, A.px(c, 2.5));
        A.rrect(c, 155, 78, 52 * (1 - repairP * 0.55), 22, 3, P.enemy, P.ink, A.px(c, 2.5));

        // 2 thợ máy đứng hai bên sườn/mũi trên giàn giáo (nổi rõ trên nền sáng)
        drawMechanicCrew(c, -265, 260, 1.08, { armPhase: t * 5 });
        drawMechanicCrew(c, 245, 260, 1.08, { armPhase: t * 5 + 1.5 });

        // Khi nói "an aircraft with damaged coating was a different aircraft" (199.5 – 202.54s):
        // Tia phản xạ đỏ vọt lên ngay tại vết xước chưa trám kín
        if (t >= 199.5) {
          const ep = A.sm(t, 199.5, 200.8);
          drawRadarWave(c, [480, -140], [175, 86], ep, { color: P.sky, w: A.px(c, 4.5) });
          drawRadarWave(c, [175, 86], [420, -175], ep, { color: P.enemy, w: A.px(c, 6.5) });
          A.circle(c, 175, 86, 26, 'rgba(180,73,60,0.3)', P.enemy, A.px(c, 3));
        }

        K.end(c);
      }
      return;
    }

    // ── NHỊP 3.2 (202.54 – 228.18s): BẢN ĐỒ SỐ LIỆU RCS BÍ MẬT THEO GÓC & TẦN SỐ ('TOP') ─
    if (t < CUE.price_beyond) {
      const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
      A.clear(c, P.bg);
      K.begin(c, cam);
      drawTechBg(c, cam);

      // Máy bay F-117 nhìn từ trên xuống tại trung tâm (0, 20)
      drawStealthDiamond(c, 0, 20, 1.22, 'top');

      // 202.54 – 215.2s: Bí mật quân sự (vòng quét đo chấm hỏi) & các con số đồn đoán (viên bi, con chim, quả bóng golf)
      if (t < 216.0) {
        const fadeOut = 1 - A.sm(t, 214.8, 215.8);
        A.withA(c, fadeOut, () => {
          // Vòng đo đạc chấm hỏi từ đài radar bên ngoài (202.54 – 215.0s)
          const qIn = A.sm(t, 202.7, 204.2);
          A.circle(c, 0, 20, 295, null, P.ink2, A.px(c, 2.5));
          drawRadarStation(c, 560, 280, 1.1, 'top', { dishAngle: -2.5 });
          drawRadarWave(c, [560, 280], [210, 120], qIn, { color: P.sky, w: A.px(c, 4.5) });
          drawRadarWave(c, [210, 120], [420, 215], qIn * 0.6, {
            color: P.amber,
            w: A.px(c, 3.5),
            dashed: true,
          });

          // 3 vật so sánh đặt tách biệt phía trên (y = -345) không chạm cánh
          drawRcsObjects(c, 0, -345, 1.3, {
            showMarble: A.sm(t, CUE.marble - 0.3, CUE.marble + 0.3),
            showBird: A.sm(t, CUE.bird - 0.3, CUE.bird + 0.3),
            showGolf: A.sm(t, CUE.golf_ball - 0.3, CUE.golf_ball + 0.3),
          });
        });
      }

      // 215.06 – 228.18s: Bản đồ bức xạ RCS (Polar Map of Numbers) phụ thuộc mạnh vào góc & tần số
      if (t >= 215.0) {
        const mapP = A.sm(t, 215.0, 216.8);
        const freqShift = Math.sin((t - 215.0) * 1.8) * 0.25;
        A.withA(c, mapP, () => {
          for (const r of [180, 280, 380]) {
            A.circle(c, 0, 20, r, null, P.light, A.px(c, 1.8));
          }
          const pts: A.Pt[] = [];
          const N = 120;
          for (let i = 0; i <= N; i++) {
            const a = (i / N) * Math.PI * 2;
            const lobe1 = Math.pow(Math.max(0, Math.cos((a - 1.02) * 3)), 6) * (240 + freqShift * 90);
            const lobe2 = Math.pow(Math.max(0, Math.cos((a + 1.02) * 3)), 6) * (240 - freqShift * 90);
            const tailLobe = Math.pow(Math.max(0, Math.cos((a - Math.PI) * 2)), 8) * 165;
            const r = 95 + lobe1 + lobe2 + tailLobe;
            pts.push([Math.cos(a) * r, 20 + Math.sin(a) * r]);
          }
          A.poly(c, pts, 'rgba(245,158,11,0.16)', P.amber, A.px(c, 3.8));
        });

        drawRadarStation(c, 580, 290, 1.15, 'top', { dishAngle: -2.4, alert: t >= CUE.defender_worse_case ? 0.8 : 0.2 });
        if (t >= CUE.defender_worse_case) {
          const wp = A.sm(t, CUE.defender_worse_case, CUE.defender_worse_case + 1.0);
          A.circle(c, 0, 20, 380 * wp, null, P.enemy, A.px(c, 3.5));
        }
      }

      K.end(c);
      if (t >= 204.0 && t < 214.5) {
        const pt = K.toScreen(cam, 330, 175);
        U.callout(c, 'RCS = ?', pt[0], pt[1] - 48, {
          to: pt,
          p: A.win(t, 204.0, 214.5, 0.35, 0.35),
          color: P.ink,
        });
      }
      return;
    }

    // ── NHỊP 3.3 (228.18 – 262.22s): CÁI GIÁ KHÍ ĐỘNG HỌC ("WOBBLING GOBLIN") & TẢI TRỌNG BOM ─
    if (t < CUE.flew_at_night) {
      const isPayloadCompare = t >= CUE.internal_weapons_limit && t < 254.5;
      const cam = K.track(
        t,
        [
          [CUE.price_beyond, { x: 0, y: -30, z: 1.05 }],
          [242.0, { x: 0, y: -30, z: 1.05 }],
          [243.2, { x: 0, y: 10, z: 0.96 }],
          [254.0, { x: 0, y: 10, z: 0.96 }],
          [255.2, { x: 0, y: -30, z: 1.06 }],
          [262.22, { x: 0, y: -30, z: 1.06 }],
        ],
        A.eio
      );

      A.clear(c, P.bg);
      K.begin(c, cam);
      drawSkyGroundBg(c, cam, { groundY: 270, scrollX: (t - CUE.price_beyond) * 55 });

      if (!isPayloadCompare) {
        // 228.18 – 242.44s & 254.5 – 262.22s: Khí động học bất ổn & Máy tính bay Fly-by-Wire ("Wobbling Goblin")
        const fbwActive = t >= CUE.flown_by_computer - 0.5 && t < 254.5;
        const wobbleAmp = fbwActive ? 0.035 : 0.14;
        const wobble = Math.sin(t * 6.5) * wobbleAmp;
        const sy = -65 + Math.sin(t * 3.8) * (fbwActive ? 6 : 26);

        // Các đường dòng khí (airflow streamlines) bị gãy xoáy qua các cạnh sắc
        for (let i = -2; i <= 2; i++) {
          const ay = sy + i * 42;
          drawRadarWave(c, [480, ay], [-480, ay + (i < 0 ? -18 : 18)], 1, {
            color: P.light,
            w: A.px(c, 2.5),
            wavelength: 90,
            amp: fbwActive ? 6 : 18,
            arrow: false,
          });
        }

        drawStealthDiamond(c, 0, sy, 1.68, 'side', {
          wobble,
          flyByWireActive: fbwActive,
          fanPhase: t,
        });

        // Khi nhắc "could only be flown by a computer making constant corrections" (239.5 – 242.44s):
        // Hiện mô-đun máy tính bay nối dây điều khiển tới cánh lái đuôi
        if (fbwActive) {
          A.rrect(c, 55, sy - 42, 48, 28, 4, P.amber, P.ink, A.px(c, 2.5));
          A.line(c, [[55, sy - 28], [-320, sy + 10]], P.amber, A.px(c, 3.5), [8, 6]);
        }
      } else {
        // 242.44 – 254.5s: So sánh tải trọng vũ khí & nhiên liệu
        // Phía trên: Máy bay thường mang hàng loạt bom bên ngoài cánh (6 quả)
        drawConventionalJet(c, -20, -175, 1.38, 'side', { externalWeapons: true });
        for (let i = 0; i < 4; i++) {
          drawGuidedBomb(c, -160 + i * 75, -102, 0.85, A.px(c, LINE.inner));
        }

        // Phía dưới: Máy bay tàng hình ('cutaway') chỉ mang được 2 quả bom và nhiên liệu gói gọn bên trong thân
        const showFuel = A.sm(t, CUE.fuel_inside - 0.3, CUE.fuel_inside + 0.6);
        drawStealthDiamond(c, -20, 115, 1.48, 'cutaway', {
          bayOpen: 0.45,
          highlightFuel: showFuel,
          fanPhase: t * 5,
        });
      }

      K.end(c);

      // Callout biệt danh "WOBBLING GOBLIN" (259.8 – 262.2s)
      if (t >= 259.8 && t <= 262.2) {
        const pt = K.toScreen(cam, 0, -135);
        U.callout(c, 'WOBBLING GOBLIN', pt[0], pt[1] - 58, {
          to: pt,
          p: A.win(t, 259.8, 262.2, 0.25, 0.25),
          color: P.ink,
        });
      }
      return;
    }

    // ── NHỊP 3.4 (262.22 – 280.00s): ĐỘT KÍCH BAN ĐÊM LÁCH KHE PHÒNG KHÔNG & MỞ ĐƯỜNG ─
    if (t < 270.2) {
      // 262.22 – 270.2s: Bản đồ chiến thuật ban đêm ('top') — Lách qua khe hở giữa các vòng phủ sóng radar
      const cam: K.Cam = { x: 0, y: 0, z: 0.96 };
      A.clear(c, P.dark);
      K.begin(c, cam);
      drawTacticalMapBg(c, cam, { night: true });

      // 2 đài radar phòng không tạo khe hở hẹp ở giữa + 1 sở chỉ huy mục tiêu phía sau
      const r1: A.Pt = [-180, -250];
      const r2: A.Pt = [-140, 260];
      const targetPt: A.Pt = [420, -20];

      A.circle(c, r1[0], r1[1], 215, 'rgba(180,73,60,0.18)', P.enemy, A.px(c, 3));
      A.circle(c, r2[0], r2[1], 215, 'rgba(180,73,60,0.18)', P.enemy, A.px(c, 3));
      drawRadarStation(c, r1[0], r1[1], 0.95, 'top', { dishAngle: t * 1.6 });
      drawRadarStation(c, r2[0], r2[1], 0.95, 'top', { dishAngle: -t * 1.4 });

      // Mục tiêu then chốt phía sau (Đài chỉ huy/radar chính)
      drawRadarStation(c, targetPt[0], targetPt[1], 1.15, 'top', { dishAngle: 3.14, alert: 0.5 });

      // Đường bay lách qua khe hở (slip through gaps in air defenses)
      const pathPts: A.Pt[] = [
        [-680, 80],
        [-340, 40],
        [-120, 5],
        [140, -15],
        [360, -20],
      ];
      const pFly = A.sm(t, CUE.flew_at_night + 0.3, 270.0);
      U.pathArrow(c, pathPts, { p: pFly, color: P.amber, w: A.px(c, 4.5), dash: [14, 10] });

      const jx = A.lerp(-660, 290, pFly);
      const jy = A.lerp(75, -18, A.eio(t, CUE.flew_at_night + 0.3, 270.0));
      drawStealthDiamond(c, jx, jy, 0.78, 'top', { rot: -0.09 });

      K.end(c);
    } else {
      // 270.2 – 280.00s: Góc nhìn ngang ban đêm ('side') — Đánh sập mục tiêu mở đường cho phi đội thường
      const boomT = 272.2;
      const cam = K.withShake({ x: 40, y: 20, z: 0.98 }, t, [[boomT, 16, 0.6]]);

      A.clear(c, P.dark);
      K.begin(c, cam);
      drawSkyGroundBg(c, cam, { groundY: 260, night: true, scrollX: (t - 270.2) * 35 });

      // Mục tiêu đài radar/chỉ huy dưới mặt đất tại (120, 260)
      const tx = 120, ty = 260;
      const destroyed = t >= boomT;
      if (!destroyed) {
        drawRadarStation(c, tx, ty, 1.35, 'side', { dishAngle: -0.55 });
        // Vòng chắn phòng không đỏ trước khi bị phá hủy
        A.circle(c, tx, ty - 60, 420, 'rgba(180,73,60,0.12)', P.enemy, A.px(c, 3));
      } else {
        // Xác đài radar bị phá hủy + khói lửa bốc lên
        A.rrect(c, tx - 70, ty - 28, 140, 28, 4, P.dark, P.ink, A.px(c, 3));
        FX.fire(c, tx, ty - 24, t - boomT, 1.25);
        FX.smoke(c, tx, ty - 35, t - boomT, 1.35);
      }

      // Quả nổ chính xác lúc bom chạm mục tiêu (boomT = 272.2s)
      FX.explosion(c, tx, ty - 40, 145, A.ph(t, boomT, boomT + 0.85), A.px(c, 3.5));
      FX.debris(c, tx, ty - 40, t - boomT, 1.2, 14, 7, ty);

      // Máy bay F-117 bay qua ở cao độ, thả quả bom dẫn đường (270.3 – 272.2s)
      const stX = A.lerp(-220, 320, A.ph(t, 270.2, 280.0));
      const stY = -130;
      const bayOpen = A.win(t, 270.3, 272.6, 0.3, 0.4);
      drawStealthDiamond(c, stX, stY, 1.35, 'side', { bayOpen });

      if (t >= 270.5 && t < boomT) {
        const bp = A.ei(t, 270.5, boomT);
        const bx = A.lerp(-140, tx, bp);
        const by = A.lerp(stY + 18, ty - 40, bp);
        c.save();
        c.translate(bx, by);
        c.rotate(0.78);
        drawGuidedBomb(c, 0, 0, 1.0, A.px(c, 3));
        c.restore();
      }

      // Sau khi mục tiêu bị diệt (t >= 273.0s): Phi đội máy bay thường phía sau tràn vào qua hành lang vừa mở!
      if (t >= 273.0) {
        const fProg = A.sm(t, 273.0, 279.5);
        const cx1 = A.lerp(-780, -40, fProg);
        const cx2 = A.lerp(-960, -240, fProg);
        drawConventionalJet(c, cx1, -40, 1.05, 'side', { externalWeapons: true });
        drawConventionalJet(c, cx2, 35, 1.05, 'side', { externalWeapons: true });
      }

      K.end(c);
    }
  }
}
