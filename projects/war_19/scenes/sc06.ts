// scenes/sc06.ts — Chương 3, Shot 3.1 (143.00 – 194.50s)
// Nối liên tục từ sc05: Xe tăng 60 tấn trong khoang C-17. Đối chiếu tải phân bố đều (thùng nhôm 100T)
// với tải tập trung (2 vệt xích xe tăng / 4 trục xe tên lửa) trên sàn dầm cầu chữ I + khuyên chằng,
// sau đó tiến cận vào cơ cấu rãnh con lăn lật 2 mặt (mặt nhám cho xe chạy vs. con lăn để 2 người đẩy pallet).
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch3StateAt } from './_state';
import {
  drawC17,
  drawTank,
  drawArmoredVehicle,
  drawFlipRollerChannel,
  drawPallet,
  drawSoldier,
  drawGroundSide,
  lw,
} from './_assets';

// Bắt đầu đúng camera cuối sc05 ({ x: -45, y: -125, z: 1.58 }) để nối continuous!
const camJoinSc05: K.Cam = { x: -45, y: -125, z: 1.58 };
const camCompareLoad: K.Cam = { x: -10, y: -145, z: 1.54 };
const camBridgeFloor: K.Cam = { x: -15, y: -92, z: 2.15 };
const camRollerDetail: K.Cam = { x: 0, y: 12, z: 1.92 };

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = ch3StateAt(t);
    const inRollerMode = t >= CUE.ch3_rollers_intro ? 1 : 0;

    const camMain = K.track(t, [
      [143.00, camJoinSc05],
      [149.50, camCompareLoad],
      [165.00, camCompareLoad],
      [167.20, camBridgeFloor],
      [178.35, camBridgeFloor],
    ], A.eio);

    let cam = inRollerMode ? camRollerDetail : camMain;
    // Rung nhẹ khi thử độ bền khuyên chằng trong "rough landing" (175.2–177.5s)
    if (t >= 175.0 && t <= 177.8) {
      cam = K.handheld(cam, t * 4.5, 6);
    }

    A.clear(c, P.bg);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    // ── PHẦN A (143.00 – 178.60s): Khoang C-17 mặt cắt dọc, Tải tập trung & Sàn dầm cầu ──
    A.withA(c, 1 - inRollerMode, () => {
      drawGroundSide(c, cam, 'dirt', 0);

      const hiFloor = A.win(t, CUE.ch3_highway_bridge, 178.4, 0.4, 0.3);
      drawC17(c, 0, 0, {
        view: 'cutaway',
        scale: 1,
        rampOpen: 1,
        hiFloor,
      });

      // Thanh đối chiếu sàn dân sự phía trên khoang (150.84–165.2s): 100T trải đều qua hàng chục thùng nhôm nhẹ
      const civBarAlpha = A.win(t, CUE.ch3_civil_100t - 0.2, CUE.ch3_highway_bridge, 0.4, 0.4);
      A.withA(c, civBarAlpha, () => {
        const by = -238;
        A.rrect(c, -255, by - 46, 485, 52, 6, P.paper, P.ink, inW);
        A.line(c, [[-245, by], [220, by]], P.slate, outW);
        for (let cx = -238; cx <= 185; cx += 42) {
          A.rrect(c, cx, by - 38, 34, 36, 3, P.light, P.ink, inW * 0.8);
          // Mũi tên lực nhỏ rải đều
          A.line(c, [[cx + 17, by + 2], [cx + 17, by + 16]], P.sky, inW);
        }
      });

      // Chủ thể trong khoang: Xe tăng 60 tấn (143.0–162.9s & 165.5–178.5s) hoặc Xe phóng tên lửa 4 trục (162.6–166.2s)
      const showMlrs = A.win(t, CUE.ch3_mlrs_axles - 0.3, CUE.ch3_highway_bridge + 0.5, 0.35, 0.35);
      A.withA(c, 1 - showMlrs, () => {
        drawTank(c, -25, -58, {
          view: 'side',
          scale: 0.88,
          hiFootprint: A.win(t, CUE.ch3_mil_60t_tracks - 0.3, CUE.ch3_mlrs_axles, 0.3, 0.3),
        });
        // 2 Mũi tên áp lực 60T dồn thẳng xuống 2 điểm xích ngắn
        const fTank = A.win(t, CUE.ch3_mil_60t_tracks, CUE.ch3_mlrs_axles, 0.3, 0.3);
        A.withA(c, fTank, () => {
          for (const ox of [-42, 42]) {
            A.line(c, [[-25 + ox, -88], [-25 + ox, -42]], P.enemy, lw(c, 5.5));
            A.poly(c, [[-25 + ox, -34], [-25 + ox - 8, -48], [-25 + ox + 8, -48]], P.enemy, P.ink, inW);
          }
        });
      });

      A.withA(c, showMlrs, () => {
        drawArmoredVehicle(c, -20, -58, {
          kind: 'mlrs',
          view: 'side',
          scale: 0.92,
          hiAxles: 1,
        });
        // 4 Mũi tên áp lực dồn xuống 4 trục bánh nặng
        for (const ax of [-60, -25, 20, 55]) {
          A.line(c, [[-20 + ax, -84], [-20 + ax, -42]], P.enemy, lw(c, 4.5));
          A.poly(c, [[-20 + ax, -35], [-20 + ax - 6, -46], [-20 + ax + 6, -46]], P.enemy, P.ink, inW);
        }
      });

      // Dây xích thép chằng từ thân xe tăng vào các khuyên chữ D trên sàn dầm cầu (172.24–178.4s)
      const chainAlpha = A.sm(t, CUE.ch3_tiedown_rings - 0.2, CUE.ch3_tiedown_rings + 0.5);
      A.withA(c, chainAlpha, () => {
        const anchors: [A.Pt, A.Pt][] = [
          [[-92, -82], [-144, -59]],
          [[-68, -82], [-118, -59]],
          [[24, -82], [64, -59]],
          [[46, -82], [90, -59]],
        ];
        for (const [p0, p1] of anchors) {
          A.line(c, [p0, p1], P.amber, lw(c, 4), [6, 4]);
          A.circle(c, p1[0], p1[1], 5.5, P.amber, P.ink, inW);
        }
      });
    });

    // ── PHẦN B (178.36 – 194.50s): Cận cảnh Cơ cấu Rãnh con lăn lật 2 mặt (Flip Rollers) ──
    A.withA(c, inRollerMode, () => {
      // Nền lòng khoang sáng rõ phía sau rãnh sàn
      A.rrect(c, -460, -240, 920, 360, 12, P.paper, P.ink, outW);
      for (let wx = -420; wx <= 420; wx += 60) {
        A.line(c, [[wx, -236], [wx, -8]], P.bg2, inW);
      }

      // Vẽ kênh sàn dầm cầu + 5 khay con lăn lật 180 độ
      const spin = (t - CUE.ch3_flip_rollers) * 9;
      drawFlipRollerChannel(c, 0, 65, {
        scale: 1.05,
        flip: st.rollerFlip,
        rollerSpin: Math.max(0, spin),
      });

      // (1) Khi mặt nhám phẳng ngửa lên (183.16–188.20s): Xe thiết giáp/xe tăng lăn bám đường trên mặt sàn phẳng
      const flatVehicleAlpha = A.win(t, CUE.ch3_smooth_side - 0.3, CUE.ch3_flip_rollers - 0.2, 0.35, 0.35);
      A.withA(c, flatVehicleAlpha, () => {
        const vx = A.lerp(-180, 140, A.eio(t, CUE.ch3_smooth_side, CUE.ch3_flip_rollers - 0.3));
        drawArmoredVehicle(c, vx, 56, {
          kind: 'ifv',
          view: 'side',
          scale: 1.35,
        });
      });

      // (2) Khi lật mặt con lăn bi thép lên (188.48–194.50s): 2 Loadmaster đẩy tay không cả đoàn 4 kiện pallet
      const palletAlpha = A.sm(t, CUE.ch3_flip_rollers + 0.6, CUE.ch3_flip_rollers + 1.2);
      A.withA(c, palletAlpha, () => {
        const baseX = A.lerp(-230, 95, st.palletSlide);
        for (let i = 0; i < 3; i++) {
          drawPallet(c, baseX + i * 118, 52, 1.02);
        }
        // Hai nhân viên bốc xếp (loadmasters) đi theo đẩy ở phía sau đoàn pallet
        const walk = (t - CUE.ch3_flip_rollers) * 10;
        drawSoldier(c, baseX - 82, 56, { view: 'side', scale: 1.28, color: P.oliveLight, walkPhase: walk });
        drawSoldier(c, baseX - 118, 56, { view: 'side', scale: 1.28, color: P.olive, walkPhase: walk + 1.5 });
        // Mũi tên lực đẩy nhẹ nhàng ngang qua đoàn pallet
        A.line(c, [[baseX - 65, 16], [baseX + 295, 16]], P.amber, lw(c, 4), [12, 6]);
      });
    });

    K.end(c);
  }
}
