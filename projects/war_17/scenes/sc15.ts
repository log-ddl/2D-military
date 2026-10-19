// sc15.ts — Chương 5 (419.80–475.742s): Lời giải kết toàn phim:
// 1) 419.80–448.34s: Góc nhìn TOP bản đồ chiều sâu 10–20 km phía sau chiến hào —
//    Drone FPV và pháo binh chính xác xóa sổ "hậu phương an toàn". Mọi thứ di chuyển trong 20 km đó
//    (tiểu đội mới, hòm đạn cối, tổ thông tin, 4 thương binh trên cáng) đều đi dưới mưa mảnh đạn.
//    Không thể đóng xe tăng 60 tấn để chở cáng thương và cột ăng-ten → chiếc hộp bọc thép cần ở nhiều nơi hơn bao giờ hết.
// 2) 448.34–475.742s: Góc nhìn SIDE / CUTAWAY — Trở lại Normandy 1944 (Kangaroo) song hành cùng APC 8x8 hiện đại:
//    Mọi bộ phận (vỏ chống mảnh, khoang không tháp pháo, 8 bánh tự bơm xả, đáy chữ V, súng ngắm camera trên nóc)
//    đều trả lời cùng một phép tính: người lính tới được chiến hào trong chiếc hộp thép đơn giản thì vẫn chiến đấu được;
//    người lính không bao giờ tới nơi thì không thể.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as F from './shared/fx';
import * as R from './shared/rig';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    if (t < CUE.return_to_normandy - 0.1) {
      // ── PHẦN A (419.80 – 448.24s): GÓC TOP BẢN ĐỒ VÙNG NGUY HIỂM 20 KM PHÍA SAU CHIẾN HÀO ──
      const cam = K.track(
        t,
        [
          [419.8, { x: 0, y: 0, z: 0.96 }],
          [430.0, { x: -40, y: 0, z: 0.96 }],
          [448.2, { x: -40, y: 20, z: 0.96 }],
        ],
        A.eio,
      );

      K.begin(c, cam);
      M.mapBg(c, cam, { grid: 120 });

      // Tuyến chiến hào tiền tuyến ở bên phải (x = 580)
      M.front(c, [[580, -480], [580, 480]], 1, { color: P.enemy, side: 1, tooth: 24 });

      // Vùng nguy hiểm sâu 20 km phía sau chiến hào (x = -620..580) không còn an toàn trước Drone & Pháo chính xác
      const zoneP = A.sm(t, 421.0, 423.2);
      M.zone(
        c,
        [
          [-620, -420],
          [560, -420],
          [560, 420],
          [-620, 420],
        ],
        P.enemy,
        zoneP,
        true,
      );

      // 4 tuyến đường hậu phương song song chở:
      // (1) Tiểu đội bộ binh mới (fresh rifle squad), (2) Hòm đạn cối (crate of mortar bombs),
      // (3) Tổ thông tin (signal team), (4) 4 thương binh trên cáng (four wounded soldiers on stretchers)
      const lanesY = [-280, -100, 80, 260];
      for (const ly of lanesY) {
        M.road(c, [[-820, ly], [540, ly]], 26);
      }

      const moveP = A.ph(t, 420.0, 448.0);
      lanesY.forEach((ly, idx) => {
        const vx = A.lerp(-540, 260, (moveP + idx * 0.16) % 1);
        V.drawAPC8x8(c, { x: vx, y: ly, s: 0.52, dir: 1, view: 'top' });

        // Biểu tượng nhiệm vụ đi kèm bên cạnh từng chiếc APC từ t = 428.5s+
        const cargoA = A.sm(t, 429.0 + idx * 1.4, 430.0 + idx * 1.4);
        if (cargoA > 0.01) {
          A.withA(c, cargoA, () => {
            if (idx === 0) {
              // Fresh rifle squad
              for (let k = -1; k <= 1; k++) A.circle(c, vx + k * 22, ly - 56, 10, P.olive, P.ink, 2);
            } else if (idx === 1) {
              // Crate of mortar bombs
              A.rrect(c, vx - 28, ly - 68, 56, 24, 4, P.amber, P.ink, 2);
            } else if (idx === 2) {
              // Signal team (sóng vô tuyến)
              U.ring(c, vx, ly - 58, 34, (t * 1.8) % 1, P.sky, 3.5);
            } else {
              // Wounded soldiers on stretchers (chữ thập cứu thương)
              A.rrect(c, vx - 18, ly - 72, 36, 28, 4, P.white, P.ink, 2);
              A.rrect(c, vx - 4, ly - 68, 8, 20, 1, P.enemy, null, 0);
              A.rrect(c, vx - 10, ly - 62, 20, 8, 1, P.enemy, null, 0);
            }
          });
        }
      });

      // FPV Drones & Đạn pháo nổ chụp rải khắp vùng 20 km (422.0–448.0s)
      const dronePositions: [number, number][] = [
        [-320, -190],
        [40, -195],
        [-150, 175],
        [210, 170],
      ];
      dronePositions.forEach(([dx, dy], i) => {
        const hoverX = dx + Math.sin(t * 2.1 + i) * 35;
        const hoverY = dy + Math.cos(t * 1.7 + i) * 22;
        V.drawFPVDrone(c, hoverX, hoverY, 0.95, t);
      });

      // Các vụ nổ mảnh đạn (rain of fragments and small warheads @ 437.04s)
      for (const [bt, bx, by] of [
        [424.2, -180, -60],
        [437.2, -60, -180],
        [438.4, 120, 40],
        [439.6, -240, 180],
      ] as const) {
        const age = t - bt;
        if (age > 0 && age < 2.2) {
          F.explosion(c, bx, by, 54, A.clamp01(age / 0.8), LINE.outer);
        }
      }

      // Ở 440.64–445.0s ("You cannot build 60-ton tanks to haul stretchers and radio masts"):
      // Bảng đối chiếu chiếc xe tăng 60 tấn cõng cáng thương & cột ăng-ten bị gạch chéo X đỏ!
      const tank60P = A.win(t, 440.4, 446.5, 0.35, 0.4);
      if (tank60P > 0.01) {
        A.withA(c, tank60P, () => {
          A.rrect(c, -260, -110, 460, 210, 16, P.paper, P.ink, LINE.outer);
          V.drawCombatVehicle(c, { x: -30, y: 55, s: 0.78, dir: 1, kind: 'mbt', view: 'side' });
          // Cột ăng-ten cao & cáng thương gắn gượng gạo trên nóc xe tăng
          A.line(c, [[-85, -75], [-85, -165]], P.ink, 4);
          A.rrect(c, -155, -82, 58, 18, 4, P.white, P.ink, 2);
          U.xMark(c, -30, -10, 68, A.sm(t, 441.8, 442.8), P.enemy, 9);
        });
      }

      K.end(c);

      // Callout khoảng cách "20 km" (@425.56 / @428.90) và "60 tons" (@441.54)
      const p20 = A.win(t, 424.5, 436.5, 0.35, 0.4);
      if (p20 > 0.01) {
        const pt20 = K.toScreen(cam, -20, -410);
        U.callout(c, '10–20 km', pt20[0], pt20[1] + 52, {
          to: pt20,
          p: p20,
          color: P.enemy,
          size: 36,
        });
      }
      const p60 = A.win(t, 440.8, 446.0, 0.3, 0.35);
      if (p60 > 0.01) {
        const pt60 = K.toScreen(cam, -30, -110);
        U.callout(c, '60t Tank', pt60[0], pt60[1] - 42, {
          to: pt60,
          p: p60,
          color: P.enemy,
          size: 34,
        });
      }
      return;
    }

    // ── PHẦN B (448.24 – 475.742s): GÓC SIDE / CUTAWAY — HỘI TỤ KANGAROO 1944 & APC HIỆN ĐẠI TẠI CHIẾN HÀO ──
    const cam = K.track(
      t,
      [
        [448.24, { x: -40, y: -145, z: 1.15 }],
        [456.5, { x: 80, y: -145, z: 1.28 }],
        [466.5, { x: 180, y: -135, z: 1.22 }],
        [475.742, { x: 220, y: -135, z: 1.22 }],
      ],
      A.eio,
    );

    K.begin(c, cam);
    V.drawSideGround(c, -1400, 1400, 0, 'dirt');

    // Chiến hào tiền tuyến ở bên phải (x = 580)
    A.poly(
      c,
      [
        [480, 0],
        [515, -34],
        [555, -34],
        [570, 48],
        [690, 48],
        [705, -28],
        [770, 0],
      ],
      P.oliveDark,
      P.ink,
      LINE.outer,
    );

    // 1. Bên trái (448.34–459.5s): Hồi tưởng chiếc Kangaroo năm 1944 ở Normandy (cắt bỏ khẩu pháo để chở bộ binh)
    const kangAlpha = A.win(t, 448.3, 459.5, 0.5, 1.0);
    if (kangAlpha > 0.01) {
      A.withA(c, kangAlpha * 0.9, () => {
        V.drawKangaroo(c, {
          x: -380,
          y: 0,
          s: 0.92,
          dir: 1,
          view: 'cutaway',
          gunRemoved: A.eio(t, 450.5, 454.5),
          racksRemoved: 1,
          benchesIn: 1,
        });
      });
    }

    // 2. Chủ thể chính (455.36–475.742s): Chiếc APC 8x8 hiện đại tiến tới sát chiến hào (x = 125 -> 190)
    const apcArriveP = A.eio(t, 465.5, 469.5);
    const apcX = A.lerp(125, 190, apcArriveP);
    const rampOpen = A.sm(t, 468.5, 470.0);

    V.drawAPC8x8(c, {
      x: apcX,
      y: 0,
      s: 1.22,
      dir: 1,
      view: 'cutaway',
      wheelRot: t < 469.5 ? t * 5.5 : 0,
      rwsType: 'rws',
      rampOpen,
    });

    // Lần lượt 5 bộ phận của chiếc APC hiện đại sáng lên đúng theo nhịp điểm danh của voice (456.68–466.10s):
    // (1) fragment-proof hull (@458.0s), (2) turretless cabin (@459.8s),
    // (3) eight self-inflating wheels (@461.4s), (4) V-shaped belly (@463.2s), (5) camera-aimed gun on the roof (@464.6s)
    const fHull = A.win(t, 457.6, 460.0, 0.25, 0.25);
    if (fHull > 0.01) U.focus(c, apcX - 230, -220, 460, 145, fHull, P.amber, 4);

    const fCabin = A.win(t, 459.5, 461.8, 0.25, 0.25);
    if (fCabin > 0.01) U.focus(c, apcX - 210, -205, 235, 92, fCabin, P.sky, 4);

    const fWheels = A.win(t, 461.2, 463.5, 0.25, 0.25);
    if (fWheels > 0.01) U.focus(c, apcX - 225, -108, 420, 108, fWheels, P.amber, 4);

    const fBelly = A.win(t, 463.0, 465.0, 0.25, 0.25);
    if (fBelly > 0.01) U.focus(c, apcX - 195, -112, 360, 56, fBelly, P.amber, 4);

    const fRws = A.win(t, 464.4, 466.8, 0.25, 0.25);
    if (fRws > 0.01) U.focus(c, apcX - 15, -278, 125, 72, fRws, P.sky, 4);

    // 3. Kết phim (468.24–475.742s):
    // "A soldier who arrives at the trench in a simple steel box can still fight. A soldier who never arrives at all cannot."
    if (t >= 468.2) {
      const dismountP = A.eio(t, 468.8, 472.5);
      // Tiểu đội bộ binh khỏe mạnh bước xuống từ chiếc hộp thép và tiến vào chiến hào chiến đấu
      for (let i = 0; i < 4; i++) {
        const sx = A.lerp(apcX - 180, 420 + i * 52, A.clamp01(dismountP * 1.25 - i * 0.15));
        R.rig(c, {
          x: sx,
          y: sx > 565 ? 24 : 0,
          s: 0.94,
          dir: 1,
          skin: 'ally',
          walk: dismountP < 0.95 ? t * 10 + i : undefined,
          aim: 0.08,
          weapon: 'rifle',
        });
      }

      // Ở 471.34–475.742s ("A soldier who never arrives at all cannot"):
      // Phía xa bên trái hiện bóng mờ chiếc xe tải không giáp bị gục lại dọc đường với dấu X đỏ
      const neverArrivesP = A.sm(t, 471.3, 472.4);
      if (neverArrivesP > 0.01) {
        A.withA(c, neverArrivesP * 0.55, () => {
          V.drawOpenTruck(c, { x: -240, y: 0, s: 0.85, dir: 1, view: 'side', troopsAlive: 0 });
          U.xMark(c, -240, -95, 42, 1, P.enemy, 7);
        });
      }
    }

    K.end(c);
  }
}
