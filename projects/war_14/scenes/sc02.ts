// scenes/sc02.ts — Chương 2 (80.64 – 169.58s): Mép cánh đồng góc, răng cưa, khoang vũ khí, cánh bay B-2, ống chữ S & khe xả trên lưng
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import {
  drawTechBg,
  drawSkyGroundBg,
  drawStealthDiamond,
  drawFlyingWing,
  drawConventionalJet,
  drawRadarStation,
  drawComputer1970s,
  drawRadarWave,
} from './_assets';

export default class Sc02 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // ── NHỊP 2.1 (80.64 – 98.18s): GÓC NHÌN TRÊN XUỐNG ('TOP') — MÉP CÁNH ĐỒNG GÓC & RĂNG CƯA ─
    if (t < CUE.weapons_inside) {
      const cam = K.track(
        t,
        [
          [CUE.ch2_start, { x: 20, y: 10, z: 1.02 }],
          [94.4, { x: 20, y: 10, z: 1.02 }],
          // 95.06s: Tiến cận vào nắp khoang và buồng lái có viền răng cưa (saw-toothed edges)
          [95.8, { x: -45, y: 0, z: 1.78 }],
          [98.18, { x: -45, y: 0, z: 1.78 }],
        ],
        A.eio
      );

      A.clear(c, P.bg);
      K.begin(c, cam);
      drawTechBg(c, cam);

      // Máy bay F-117 nhìn từ trên xuống tại tâm
      const showParallel = t >= CUE.wing_tail_edges;
      const showSaw = t >= CUE.saw_toothed - 0.3;
      drawStealthDiamond(c, -20, 0, 1.55, 'top', {
        showParallelAngles: showParallel,
        showSawtooth: showSaw,
      });

      // Đài radar nhìn từ trên xuống ở góc dưới phải, quét chùm sóng qua máy bay
      const rx = 560, ry = 310;
      const sweepAng = t >= CUE.radar_sweeps ? -2.35 + Math.sin((t - CUE.radar_sweeps) * 1.4) * 0.45 : -2.35;
      drawRadarStation(c, rx, ry, 1.25, 'top', { dishAngle: sweepAng });

      // Chùm quét từ đài radar tới mép cánh và các tia phản xạ văng đi theo đúng 2 phương song song
      if (t >= CUE.radar_sweeps - 0.5 && t < CUE.saw_toothed - 0.2) {
        const pIn = A.sm(t, CUE.radar_sweeps - 0.4, CUE.radar_sweeps + 0.5);
        const edge1: A.Pt = [110, 115];
        const edge2: A.Pt = [-180, 195];
        drawRadarWave(c, [rx, ry], edge1, pIn, { color: P.sky, w: A.px(c, 4.5) });
        drawRadarWave(c, [rx, ry], edge2, pIn, { color: P.sky, w: A.px(c, 4.5) });

        // Các tia phản xạ mạnh từ mép cánh và đuôi bay đi theo đúng 1 góc song song duy nhất (same_few_dirs@91.32)
        const pOut = A.sm(t, CUE.radar_sweeps + 0.3, CUE.same_few_dirs);
        drawRadarWave(c, edge1, [edge1[0] + 240, edge1[1] - 320], pOut, { color: P.amber, w: A.px(c, 5.5) });
        drawRadarWave(c, edge2, [edge2[0] + 240, edge2[1] - 320], pOut, { color: P.amber, w: A.px(c, 5.5) });
        drawRadarWave(c, [-310, 85], [-310 + 240, 85 - 320], pOut, { color: P.amber, w: A.px(c, 5.5) });
      }

      // Khi phóng cận vào viền răng cưa (95.06 – 98.18s): chỉ rõ các cạnh răng cưa song song với mép cánh
      if (showSaw) {
        const pSaw = A.sm(t, CUE.saw_toothed, CUE.saw_toothed + 1.0);
        drawRadarWave(c, [140, 160], [-75, 18], pSaw, { color: P.sky, w: A.px(c, 3.5) });
        drawRadarWave(c, [-75, 18], [45, -142], pSaw, { color: P.amber, w: A.px(c, 4) });
      }

      K.end(c);
      return;
    }

    // ── NHỊP 2.2 (98.18 – 111.22s): VŨ KHÍ TRONG THÂN VS TREO NGOÀI & KÍNH BUỒNG LÁI ─
    if (t < CUE.remove_surfaces) {
      const cam = K.track(
        t,
        [
          [CUE.weapons_inside, { x: 60, y: 10, z: 0.96 }],
          [103.2, { x: 60, y: 10, z: 0.96 }],
          // 103.5s: Tiến cận vào mặt cắt khoang bom mở nhanh rồi đóng & kính buồng lái
          [104.5, { x: 55, y: 115, z: 1.22 }],
          [111.22, { x: 55, y: 115, z: 1.22 }],
        ],
        A.eio
      );

      A.clear(c, P.bg);
      K.begin(c, cam);
      drawTechBg(c, cam);

      // Đài radar bên phải chiếu sóng kiểm tra
      const radarX = 580, radarY = 260;
      const dishPt: A.Pt = [radarX - 42, radarY - 108];
      drawRadarStation(c, radarX, radarY, 1.25, 'side', { dishAngle: -0.45 });

      // Phía trên: Máy bay thường treo tên lửa lộ dưới cánh -> phản xạ cực mạnh (98.18 – 104.2s)
      if (t < 104.5) {
        A.withA(c, 1 - A.sm(t, 103.5, 104.4), () => {
          const convX = -110, convY = -205;
          drawConventionalJet(c, convX, convY, 1.35, 'side', {
            externalWeapons: true,
            highlightWeapons: t >= CUE.missile_hanging - 0.5,
          });
          const pHit = A.sm(t, 99.0, 100.4);
          const pylonPt: A.Pt = [convX - 15, convY + 48];
          drawRadarWave(c, dishPt, pylonPt, pHit, { color: P.sky, w: A.px(c, 4.5) });
          if (t >= CUE.missile_hanging - 0.3) {
            const pEcho = A.sm(t, CUE.missile_hanging - 0.2, CUE.missile_hanging + 0.9);
            drawRadarWave(c, pylonPt, dishPt, pEcho, { color: P.enemy, w: A.px(c, 6) });
            A.circle(c, pylonPt[0], pylonPt[1], 24, 'rgba(180,73,60,0.3)', P.enemy, A.px(c, 3));
          }
        });
      }

      // Phía dưới: Máy bay tàng hình F-117 ('cutaway') mang bom bên trong khoang bụng
      const stX = -110, stY = 125;
      // Cửa khoang mở ngắn tại 104.0 – 106.2s, thả bom rồi đóng sập ngay tại 105.68s
      const bayOpen =
        t < 104.0
          ? 0
          : t < CUE.bay_closed
            ? A.sm(t, 104.0, 104.8)
            : 1 - A.sm(t, CUE.bay_closed, CUE.bay_closed + 0.65);
      const bombDrop = t >= 104.5 && t < 106.4 ? A.sm(t, 104.5, 106.3) : 0;
      const hiCockpit = A.sm(t, CUE.cockpit_glass - 0.8, CUE.cockpit_glass + 0.4);

      drawStealthDiamond(c, stX, stY, 1.48, 'cutaway', {
        bayOpen,
        bombDrop,
        highlightCockpit: hiCockpit,
        fanPhase: t * 5,
      });

      // Khi cửa khoang mở (104.6 – 105.8s): hiện cảnh báo hốc phản xạ tạm thời rồi bị cắt đứt khi cửa đóng
      if (bayOpen > 0.25) {
        A.withA(c, bayOpen, () => {
          drawRadarWave(c, dishPt, [stX - 20, stY + 18], 1, { color: P.sky, w: A.px(c, 4) });
          drawRadarWave(c, [stX - 20, stY + 18], [stX + 180, stY + 85], 1, {
            color: P.enemy,
            w: A.px(c, 4.5),
            dashed: true,
          });
        });
      } else if (t >= CUE.bay_closed + 0.4 && t < CUE.cockpit_glass - 0.6) {
        // Khi cửa khoang đã đóng kín: sóng radar trượt qua bụng phẳng
        drawRadarWave(c, dishPt, [stX + 20, stY + 20], 1, { color: P.sky, w: A.px(c, 4) });
        drawRadarWave(c, [stX + 20, stY + 20], [stX - 180, stY + 140], 1, { color: P.amber, w: A.px(c, 5) });
      }

      // 107.70 – 111.22s: Lớp phủ kính buồng lái (coated cockpit glass) hắt sóng vọt lên trên
      if (t >= CUE.cockpit_glass - 0.6) {
        const pGlass = A.sm(t, CUE.cockpit_glass - 0.5, CUE.cockpit_glass + 0.5);
        const glassPt: A.Pt = [stX + 115, stY - 68];
        drawRadarWave(c, dishPt, glassPt, pGlass, { color: P.sky, w: A.px(c, 4.5) });
        drawRadarWave(c, glassPt, [glassPt[0] + 190, glassPt[1] - 210], pGlass, {
          color: P.amber,
          w: A.px(c, 5.5),
        });
      }

      K.end(c);
      return;
    }

    // ── NHỊP 2.3 (111.22 – 141.58s): GÓC NHÌN 'TOP' — GÓC VUÔNG ĐUÔI 90° VS CÁNH BAY B-2 ─
    if (t < CUE.cannot_be_tilted) {
      const cam = K.track(
        t,
        [
          [CUE.remove_surfaces, { x: 0, y: 0, z: 0.96 }],
          [127.8, { x: 0, y: 0, z: 0.96 }],
          // 128.20s: Lia sang phải ôm trọn Cánh bay B-2 và phép đối chiếu máy tính mới
          [129.4, { x: 220, y: -20, z: 1.04 }],
          [141.58, { x: 220, y: -20, z: 1.04 }],
        ],
        A.eio
      );

      A.clear(c, P.bg);
      K.begin(c, cam);
      drawTechBg(c, cam, { splitX: t < 128.5 ? 0 : undefined });

      if (t < 129.2) {
        // Bên trái (-450, -115): Máy bay thường với cánh đuôi đứng tạo góc vuông 90° (Corner Reflector)
        A.withA(c, 1 - A.sm(t, 128.2, 129.1), () => {
          drawConventionalJet(c, -450, -115, 1.15, 'top', {
            highlightTailCorner: t >= CUE.no_tail_fin,
          });
          // Đài radar chiếu vào góc đuôi máy bay thường
          drawRadarStation(c, -160, 295, 0.95, 'top', { dishAngle: -2.2 });
          const pCorner = A.sm(t, CUE.right_angles - 0.5, CUE.right_angles + 0.8);
          if (pCorner > 0) {
            // Sơ đồ phóng đại "góc phòng 90°" (corner of a room) tách biệt rõ ở góc dưới trái
            const cx = -680, cy = 320;
            A.line(c, [[cx, cy - 140], [cx, cy], [cx + 140, cy]], P.ink, A.px(c, 6));
            A.rrect(c, cx, cy - 32, 32, 32, 0, 'rgba(180,73,60,0.25)', P.enemy, A.px(c, 2.5));
            drawRadarWave(c, [cx + 210, cy - 150], [cx + 55, cy], pCorner, { color: P.sky, w: A.px(c, 4) });
            drawRadarWave(c, [cx + 55, cy], [cx, cy - 65], pCorner, { color: P.amber, w: A.px(c, 4), arrow: false });
            drawRadarWave(c, [cx, cy - 65], [cx + 185, cy - 185], pCorner, { color: P.enemy, w: A.px(c, 5) });

            // Tia dội ngược trực tiếp từ đuôi máy bay thường về đài radar
            drawRadarWave(c, [-160, 295], [-635, -115], pCorner, { color: P.sky, w: A.px(c, 4.5) });
            drawRadarWave(c, [-635, -115], [-160, 295], pCorner, { color: P.enemy, w: A.px(c, 5.5) });
          }
        });
      }

      // Bên phải (440, -90): Cánh bay B-2 (Flying Wing) không có đuôi đứng, mép trước cong mượt & mép sau răng cưa
      const fwX = 440, fwY = -90;
      drawFlyingWing(c, fwX, fwY, 1.24, 'top', {
        highlightCurve: t >= CUE.smooth_curves,
        highlightSawtooth: t >= CUE.smooth_curves + 1.2,
      });

      // Hình chiếu ngang ('side') của Cánh bay đặt tách biệt phía dưới (y = 310) để thấy rõ "no vertical fin"
      if (t >= CUE.flying_wing && t < 129.0) {
        A.withA(c, A.win(t, CUE.flying_wing, 129.0, 0.4, 0.4), () => {
          drawFlyingWing(c, 440, 310, 1.15, 'side');
          // Khung nét đứt chỗ đáng lẽ có cánh đuôi đứng bị xoá bỏ
          A.poly(
            c,
            [
              [230, 300],
              [290, 300],
              [260, 215],
              [215, 220],
            ],
            null,
            P.enemy,
            A.px(c, 2.5)
          );
          U.xMark(c, 255, 258, 24, 1, P.enemy, A.px(c, 5));
        });
      }

      // 132.0 – 141.58s: Đối chiếu chiếc F-117 cắt phẳng thu nhỏ (trái) với B-2 uốn cong hữu cơ (phải) nhờ máy tính mạnh hơn
      if (t >= 132.0) {
        const pComp = A.sm(t, 132.0, 133.2);
        A.withA(c, pComp, () => {
          drawStealthDiamond(c, -150, -145, 0.85, 'top');
          drawComputer1970s(c, -150, 175, 0.78, { tapeAngle: t * 8, overload: 0 });
          U.arrow(c, [90, -135], [240, -100], { p: pComp, color: P.oliveDark, w: A.px(c, 5) });
        });
      }

      K.end(c);
      return;
    }

    // ── NHỊP 2.4 (141.58 – 169.58s): MẶT CẮT DỌC ('CUTAWAY') — ĐỘNG CƠ, ỐNG CHỮ S & KHE XẢ TRÊN LƯNG ─
    const cam = K.track(
      t,
      [
        [CUE.cannot_be_tilted, { x: 0, y: -10, z: 1.08 }],
        [150.5, { x: 0, y: -10, z: 1.08 }],
        // 150.84s: Tiến cận vào mặt cắt ống dẫn khí chữ S (S-duct) và khe xả trên lưng
        [152.2, { x: -40, y: -20, z: 1.22 }],
        [169.58, { x: -40, y: -20, z: 1.22 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);
    drawSkyGroundBg(c, cam, { groundY: 250, scrollX: (t - CUE.cannot_be_tilted) * 30 });

    if (t < CUE.hide_engine) {
      // 141.58 – 150.84s: Động cơ phản lực thường với ống hút gió thẳng làm lộ cánh quạt quay
      const cx = -60, cy = -40;
      drawConventionalJet(c, cx, cy, 1.65, 'cutaway', {
        externalWeapons: false,
        showEngineBlades: true,
        fanPhase: t * 14,
      });
      drawRadarStation(c, 560, 250, 1.2, 'side', { dishAngle: -0.42 });

      // Tia radar đi thẳng vào ống hút gió, đập trúng cánh quạt đang quay và dội ngược chùm phản xạ mạnh
      const pIn = A.sm(t, 145.0, 147.2);
      const bladePt: A.Pt = [cx - 72, cy - 4];
      drawRadarWave(c, [515, 140], [cx + 95, cy - 4], pIn, { color: P.sky, w: A.px(c, 5) });
      drawRadarWave(c, [cx + 95, cy - 4], bladePt, A.sm(t, 146.8, 148.2), { color: P.sky, w: A.px(c, 5) });

      if (t >= CUE.spinning_blades - 0.4) {
        const pEcho = A.sm(t, CUE.spinning_blades - 0.3, CUE.spinning_blades + 0.8);
        drawRadarWave(c, bladePt, [515, 140], pEcho, { color: P.enemy, w: A.px(c, 6.5) });
        A.circle(c, bladePt[0], bladePt[1], 32, 'rgba(180,73,60,0.32)', P.enemy, A.px(c, 3.5));
      }
    } else {
      // 150.84 – 169.58s: Mặt cắt dọc máy bay tàng hình với ống hút gió chữ S (S-duct) & khe xả dẹt trên lưng
      const sx = 0, sy = -40;
      const hiSDuct = A.win(t, CUE.s_shape_intake - 0.5, CUE.exhaust_hot, 0.4, 0.4);
      const hiExhaust = A.sm(t, CUE.exhaust_hot, CUE.exhaust_hot + 1.0);

      drawStealthDiamond(c, sx, sy, 1.75, 'cutaway', {
        highlightSDuct: hiSDuct,
        highlightExhaust: hiExhaust,
        fanPhase: t * 12,
      });

      // Tia radar đi vào miệng ống chữ S, đập vào thành ống có lót vật liệu hấp thụ rồi tắt dần trước khi tới cánh quạt
      const pS = A.sm(t, CUE.s_shape_intake, CUE.s_shape_intake + 1.4);
      const pBounce = A.sm(t, CUE.s_shape_intake + 1.2, CUE.lined_absorbs + 1.2);
      const inletPt: A.Pt = [sx + 60, sy - 16];
      const b1: A.Pt = [sx + 8, sy - 28];
      const b2: A.Pt = [sx - 35, sy - 18];
      const b3: A.Pt = [sx - 68, sy - 64];

      drawRadarWave(c, [480, 120], inletPt, pS, { color: P.sky, w: A.px(c, 5) });
      if (pBounce > 0) {
        // Nảy lần 1 (mạnh) -> lần 2 (yếu dần) -> lần 3 (hấp thụ hết, không chạm tới cánh quạt ở sx - 154)
        drawRadarWave(c, inletPt, b1, A.clamp01(pBounce * 2.5), { color: P.sky, w: A.px(c, 4.5), arrow: false });
        drawRadarWave(c, b1, b2, A.clamp01((pBounce - 0.3) * 2.5), { color: P.amber, w: A.px(c, 3.5), arrow: false });
        drawRadarWave(c, b2, b3, A.clamp01((pBounce - 0.6) * 2.5), { color: P.enemyLight, w: A.px(c, 2), arrow: false });
        A.circle(c, b1[0], b1[1], 7, P.amber, null, 0);
        A.circle(c, b2[0], b2[1], 6, P.amber, null, 0);
      }

      // 160.80 – 169.58s: Khe xả dẹt đặt trên lưng che luồng nhiệt khỏi đầu dò hồng ngoại dưới đất
      if (t >= CUE.exhaust_hot) {
        const pEx = A.sm(t, CUE.exhaust_hot, CUE.exhaust_hot + 1.2);
        // Luồng khí nóng mỏng thoát ra ở mặt trên đuôi
        for (let i = 0; i < 3; i++) {
          const wy = sy - 28 - i * 10;
          drawRadarWave(c, [sx - 360, wy], [sx - 560, wy - 12], pEx, {
            color: P.amber,
            w: A.px(c, 3.5),
            wavelength: 36,
            amp: 5,
            arrow: false,
          });
        }

        // Đầu dò hồng ngoại dưới mặt đất (Heat seeker on the ground) bị gờ đuôi che khuất tầm nhìn
        const seekerX = -280, seekerY = 250;
        A.poly(c, [[seekerX - 32, seekerY], [seekerX + 32, seekerY], [seekerX + 18, seekerY - 36], [seekerX - 18, seekerY - 36]], P.enemy, P.ink, A.px(c, LINE.outer));
        A.circle(c, seekerX, seekerY - 42, 12, P.amber, P.ink, A.px(c, LINE.inner));

        const pSeek = A.sm(t, CUE.heat_seekers_ground - 1.2, CUE.heat_seekers_ground + 0.4);
        // Đường ngắm hồng ngoại bị chặn ở gờ dưới đuôi máy bay
        const blockPt: A.Pt = [sx - 355, sy + 22];
        A.line(c, [[seekerX, seekerY - 42], blockPt], P.enemy, A.px(c, 3.5), [10, 8]);
        if (pSeek > 0.6) {
          U.xMark(c, blockPt[0], blockPt[1], 20, (pSeek - 0.6) * 2.5, P.enemy, A.px(c, 5));
        }
      }
    }

    K.end(c);

    // Callout tối thiểu: "S-DUCT" chỉ vào ống dẫn khí chữ S (153.5 – 159.5s)
    if (t >= 153.5 && t <= 159.5) {
      const pt = K.toScreen(cam, -45, -88);
      U.callout(c, 'S-DUCT', pt[0], pt[1] - 64, {
        to: pt,
        p: A.win(t, 153.5, 159.5, 0.35, 0.35),
        color: P.ink,
      });
    }
  }
}
