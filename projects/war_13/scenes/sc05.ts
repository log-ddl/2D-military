import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';
import { SIDE_AIR_NODES, TOP_MAP_NODES } from './_state';

/**
 * sc05 (108.22–141.36s): Chương 2 (Phần 3) — Electronic Attack: Noise Jamming vs DRFM Deception
 * - 108.22–133.14s (SIDE + Cutaway): So sánh Gây nhiễu ồn (biến màn hình radar địch thành bão tuyết)
 *   với Đánh lừa xung (bắt xung của radar địch rồi phát trả trễ, tạo bóng ma ở xa hơn hoặc hàng chục bóng ma).
 * - 133.14–141.36s (TOP): Nhìn từ trên xuống để thấy rõ cổng bám bắt (tracking gate) của radar bị kéo lệch
 *   sang bóng ma khiến quả tên lửa SAM bắn trượt máy bay thật hàng trăm mét.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const isTopPhase = t >= CUE.c2_dragged_away;

    A.clear(c, P.bg);

    if (!isTopPhase) {
      // ── PHA 1 (108.22–133.14s): GÓC NGANG (SIDE) GIẢI THÍCH CƠ CHẾ JAMMING & DECEPTION ──
      const cam = K.track(
        t,
        [
          [108.22, { x: 40, y: 20, z: 1.08 }],
          [120.0, { x: -20, y: -5, z: 1.04 }],
          [133.14, { x: -40, y: -5, z: 1.04 }],
        ],
        A.eio
      );

      K.begin(c, cam);
      const lwO = A.px(c, LINE.outer);
      const lwI = A.px(c, LINE.inner);

      U.drawSkyEnv(c, cam, { groundY: 320, hills: true });

      const jetPos: A.Pt = [-180, -40];
      const samPos = SIDE_AIR_NODES.samBase;
      const radarAnt: A.Pt = [samPos[0] - 28, samPos[1] - 88];

      // Mức gây nhiễu ồn bão tuyết (111.74–119.34s)
      const noiseP =
        A.sm(t, CUE.c2_send_noise, CUE.c2_snowstorm) *
        (1 - A.sm(t, CUE.c2_deception - 0.3, CUE.c2_deception + 0.6));

      // Mức đánh lừa xung DRFM (121.62–133.14s)
      const captureP = A.sm(t, CUE.c2_captures_pulse, CUE.c2_sends_late);
      const fartherP = A.sm(t, CUE.c2_farther_off - 0.3, CUE.c2_farther_off + 0.8);
      const dozenP = A.sm(t, CUE.c2_dozen_aircraft - 0.4, CUE.c2_dozen_aircraft + 0.8);

      // 1. Sóng radar địch chiếu lên tiêm kích
      U.drawSignalLink(c, radarAnt, [jetPos[0] + 110, jetPos[1] + 5], t, {
        color: P.enemy,
        mode: 'pulse',
        speed: 2.4,
        progress: 1,
      });

      // 2. Nếu đang ở nhịp Noise Jamming: máy bay bắn chùm nhiễu răng cưa đỏ ngược về đài radar
      if (noiseP > 0.01) {
        U.drawSignalLink(c, [jetPos[0] + 110, jetPos[1] + 5], radarAnt, t, {
          color: P.enemy,
          mode: 'noise',
          amp: 16 * noiseP,
          speed: 3.8,
          progress: noiseP,
        });
      }

      // 3. Nếu đang ở nhịp Deception (DRFM): bắt xung, giữ trễ, phát lại tạo bóng ma ở xa hơn / hàng chục bóng ma
      if (captureP > 0.01) {
        // Cửa sổ cơ chế DRFM ngay trên lưng tiêm kích: Xung đỏ đi vào -> vòng trễ -> Xung vàng phát ra trễ
        const drfmX = jetPos[0] - 10;
        const drfmY = jetPos[1] - 185;
        A.withA(c, captureP, () => {
          A.line(c, [[jetPos[0] + 40, jetPos[1] - 20], [drfmX, drfmY + 60]], P.ink, lwI, [A.px(c, 6), A.px(c, 5)]);
          A.rrect(c, drfmX - 155, drfmY - 56, 310, 112, 10, P.paper, P.ink, lwO);
          // Xung radar địch đi vào (đỏ)
          A.line(
            c,
            [
              [drfmX - 135, drfmY + 18],
              [drfmX - 95, drfmY + 18],
              [drfmX - 95, drfmY - 24],
              [drfmX - 65, drfmY - 24],
              [drfmX - 65, drfmY + 18],
              [drfmX - 35, drfmY + 18],
            ],
            P.enemy,
            lwO
          );
          // Vòng giữ trễ bộ nhớ (delay loop)
          A.circle(c, drfmX, drfmY, 22, P.bg2, P.ink, lwI);
          A.circle(c, drfmX, drfmY, 12, null, P.amber, lwO);
          // Xung nhại phát trả trễ (vàng amber)
          A.line(
            c,
            [
              [drfmX + 35, drfmY + 18],
              [drfmX + 65, drfmY + 18],
              [drfmX + 65, drfmY - 24],
              [drfmX + 95, drfmY - 24],
              [drfmX + 95, drfmY + 18],
              [drfmX + 135, drfmY + 18],
            ],
            P.amber,
            lwO
          );
        });

        // Luồng xung giả màu vàng trả về đài radar
        U.drawSignalLink(c, [jetPos[0] + 110, jetPos[1] + 5], radarAnt, t, {
          color: P.amber,
          mode: 'pulse',
          speed: 2.4,
          progress: captureP,
        });
      }

      // Bóng ma máy bay ở xa hơn phía sau (farther off: 126.78s+) và tách thành nhiều chiếc (dozen: 131.6s+)
      if (fartherP > 0.01) {
        const ghosts: A.Pt[] = [
          [-460, -85],
          ...(dozenP > 0.05
            ? ([
                [-340, -155],
                [-560, -25],
                [-410, 45],
                [-620, -125],
              ] as A.Pt[])
            : []),
        ];
        for (let i = 0; i < ghosts.length; i++) {
          const g = ghosts[i]!;
          const a = i === 0 ? fartherP : dozenP;
          A.withA(c, a, () => {
            A.line(c, [jetPos, g], P.amber, lwI, [A.px(c, 8), A.px(c, 6)]);
            c.save();
            c.translate(g[0], g[1]);
            U.drawStrikeJet(c, { view: 'side', scale: 1.55, ghost: true });
            c.restore();
          });
        }
      }

      // Chủ thể tiêm kích thật & đài radar SAM
      c.save();
      c.translate(jetPos[0], jetPos[1]);
      U.drawStrikeJet(c, { view: 'cutaway', scale: 1.65 });
      c.restore();

      c.save();
      c.translate(samPos[0], samPos[1]);
      U.drawSamRadarSite(c, { view: 'side', scale: 1.35, blinded: noiseP > 0.4 });
      c.restore();

      // Màn hình RadarScope của đài SAM ở góc phải trên để người xem đọc ngay kết quả trên cảm biến địch
      const falseBlips: A.Pt[] = [];
      if (fartherP > 0.2) falseBlips.push([-0.62, -0.22]);
      if (dozenP > 0.2) {
        falseBlips.push([-0.42, -0.48], [-0.75, 0.08], [-0.5, 0.32], [-0.18, -0.35], [-0.82, -0.38]);
      }
      U.drawRadarScope(c, {
        x: 470,
        y: -175,
        w: 360,
        h: 230,
        noiseLevel: noiseP,
        realTargetPos: [-0.22, -0.05],
        falseTargets: falseBlips,
        gatePos: fartherP > 0.5 ? [-0.62, -0.22] : [-0.22, -0.05],
      });

      K.end(c);
      return;
    }

    // ── PHA 2 (133.14–141.36s): GÓC TRÊN XUỐNG (TOP) — CỔNG BÁM BỊ KÉO LỆCH & TÊN LỬA BẮN TRƯỢT HÀNG TRĂM MÉT ──
    const camTop = K.track(
      t,
      [
        [133.14, { x: 40, y: -20, z: 1.02 }],
        [141.36, { x: 0, y: -40, z: 0.98 }],
      ],
      A.eio
    );
    const shakenCam = K.withShake(camTop, t, [[CUE.c2_missile_misses + 0.3, 16, 0.65]]);

    K.begin(c, shakenCam);
    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawMapEnv(c, shakenCam, { roadY: 160, ridge: true });

    const samPos = TOP_MAP_NODES.samSite;
    const realJet: A.Pt = [A.lerp(-180, 40, A.ph(t, 133.14, 141.36)), -10];
    // Bóng ma giả bị đẩy lùi và lệch sang bên kia hàng trăm mét
    const pullP = A.eio(t, CUE.c2_dragged_away + 0.2, CUE.c2_dragged_away + 2.8);
    const ghostJet: A.Pt = [
      realJet[0] - A.lerp(20, 290, pullP),
      realJet[1] - A.lerp(10, 210, pullP),
    ];

    // Tia radar địch bị kéo lệch từ máy bay thật sang bóng ma
    U.drawSignalLink(c, samPos, ghostJet, t, {
      color: P.enemy,
      mode: 'pulse',
      speed: 2.6,
      progress: 1,
    });

    // Bóng ma máy bay & Khung khóa đỏ (tracking gate) bị kéo theo bóng ma
    c.save();
    c.translate(ghostJet[0], ghostJet[1]);
    U.drawStrikeJet(c, { view: 'top', scale: 1.15, ghost: true });
    c.restore();
    A.rrect(c, ghostJet[0] - 68, ghostJet[1] - 68, 136, 136, 8, null, P.enemy, lwO);

    // Máy bay thật bay an toàn ở dưới
    c.save();
    c.translate(realJet[0], realJet[1]);
    U.drawStrikeJet(c, { view: 'top', scale: 1.15 });
    c.restore();

    // Đài radar SAM đối phương phóng đạn tên lửa dẫn đường vào khung khóa giả
    c.save();
    c.translate(samPos[0], samPos[1]);
    U.drawSamRadarSite(c, {
      view: 'top',
      scale: 1.2,
      dishAngle: Math.atan2(ghostJet[1] - samPos[1], ghostJet[0] - samPos[0]),
      missilesLeft: 1,
    });
    c.restore();

    const hitT = CUE.c2_missile_misses + 0.3;
    const flyP = A.ph(t, 134.2, hitT);
    const mx = A.lerp(samPos[0], ghostJet[0], flyP);
    const my = A.lerp(samPos[1] + 55, ghostJet[1], flyP);
    const mang = Math.atan2(ghostJet[1] - (samPos[1] + 55), ghostJet[0] - samPos[0]);

    A.line(c, [[samPos[0], samPos[1] + 55], [mx, my]], P.enemy, lwI, [A.px(c, 10), A.px(c, 8)]);
    if (t < hitT) {
      c.save();
      c.translate(mx, my);
      c.rotate(mang);
      U.drawSamMissile(c, { scale: 1.05, thrust: 1 });
      c.restore();
    }

    // Vụ nổ tại vị trí bóng ma — cách máy bay thật hàng trăm mét
    const boomP = A.ph(t, hitT, hitT + 1.4);
    U.drawExplosion(c, ghostJet[0], ghostJet[1], boomP, 88);

    // Thước đo khoảng cách trượt ("misses by a distance that the crew can measure in hundreds of meters")
    const distShow = A.sm(t, CUE.c2_missile_misses, CUE.c2_missile_misses + 0.8);
    if (distShow > 0.02) {
      A.withA(c, distShow, () => {
        A.line(c, [realJet, ghostJet], P.sky, lwO, [A.px(c, 8), A.px(c, 6)]);
        A.circle(c, realJet[0], realJet[1], 7, P.sky, P.ink, lwI);
        A.circle(c, ghostJet[0], ghostJet[1], 7, P.enemy, P.ink, lwI);
      });
    }

    K.end(c);
  }
}
