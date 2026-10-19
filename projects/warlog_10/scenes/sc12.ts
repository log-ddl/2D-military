import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P } from './shared/palette';
import * as M from './_assets';
import { CUE } from './_cue';

/**
 * sc12 (320.64–350.50s): Trận chiến nước Anh năm 1940 (Chain Home & Battle of Britain):
 * - 320.64–334.78s: Chuỗi tháp cao Chain Home dọc bờ biển Đông & Nam nước Anh bắt sóng máy bay vượt eo biển Manche (kèm cửa sổ SIDE cho thấy tháp cao không nhìn được sát mặt biển).
 * - 334.78–344.34s: Truyền qua điện thoại về phòng bản đồ (Plotting Table) nơi nhân viên đẩy quân cờ mục tiêu.
 * - 344.34–350.50s: Phi đội tiêm kích đánh chặn (Fighter Squadrons) xuất kích đón lõng đúng chỗ và nổ súng bắn hạ địch.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    K.begin(c, cam);

    // 1) Bản đồ TOP Eo biển Manche năm 1940
    M.drawChannel1940MapTop(c);

    // Tọa độ 6 tháp radar Chain Home dọc bờ biển Đông và Nam nước Anh
    const towers: A.Pt[] = [
      [-95, -450],  // East Anglia
      [-155, -310], // Thames Estuary
      [-65, -210],  // Dover
      [-215, -85],  // Rye / Pevensey
      [-460, 15],   // Poling / Ventnor
      [-740, 95],   // Worth Matravers
    ];

    // Vòm phủ sóng phát ra từ chuỗi tháp Chain Home vươn qua eo biển sang bờ Pháp
    const towerAppear = A.sm(t, CUE.ch4_year_1940, CUE.ch4_tall_towers + 1.5);
    for (let i = 0; i < towers.length; i++) {
      const [tx, ty] = towers[i]!;
      const itemA = A.clamp01(towerAppear * 1.4 - i * 0.12);
      if (itemA <= 0.01) continue;

      A.withA(c, itemA, () => {
        // Quạt sóng hướng sang Đông-Nam (eo biển Manche)
        A.withA(c, 0.15, () => {
          c.beginPath();
          c.moveTo(tx, ty);
          c.arc(tx, ty, 460, -0.35, 0.65);
          c.closePath();
          A.fs(c, P.amber, null, 0);
        });
        const pulseR = 60 + (((t - CUE.ch4_year_1940) * 140 + i * 55) % 380);
        M.drawWaveArc(c, tx, ty, pulseR, 0.15, 0.75, P.amber, 0.75, 3.5);
      });
    }

    // 2) Tốp 3 máy bay ném bom Đức (raiders) bay từ bờ Pháp vượt eo biển sang Anh
    const raidP = A.ph(t, CUE.ch4_crossing_channel - 2.0, CUE.ch4_end);
    const raidX = A.lerp(420, -45, raidP);
    const raidY = A.lerp(-30, -175, raidP);
    const raidAng = Math.atan2(-175 - -30, -45 - 420) - Math.PI;

    // Tiếng vọng sky dội từ tốp máy bay về tháp Dover (-65, -210)
    if (t >= CUE.ch4_crossing_channel - 0.5) {
      const echoR = 45 + (((t - CUE.ch4_crossing_channel) * 160) % 280);
      M.drawWaveArc(c, raidX, raidY, echoR, Math.PI - 0.25, 0.55, P.sky, 0.85, 4);
    }

    // 3) Từ 334.78s ("relayed by telephone to a room where operators moved markers on a table"):
    // Đường dây điện thoại từ các tháp về Trung tâm chỉ huy (-520, -340) + Cửa sổ Bàn bản đồ Plotting Table
    const tableA = A.sm(t, CUE.ch4_relayed_telephone - 0.3, CUE.ch4_relayed_telephone + 0.8);
    const hqX = -460, hqY = -310;
    if (tableA > 0.01) {
      A.withA(c, tableA, () => {
        for (const [tx, ty] of towers) {
          A.line(c, [[tx, ty], [hqX, hqY]], P.ink2, M.lwI(c), [8, 6]);
        }
        // Cửa sổ phóng lớn Bàn bản đồ tác chiến (Plotting Table) ở góc dưới-trái
        M.drawPlottingTable(c, -540, 235, {
          scale: 0.92,
          markerProgress: A.ph(t, CUE.ch4_relayed_telephone, CUE.ch4_end - 1.0),
        });
      });
    }

    // Vẽ chuỗi tháp Chain Home trên bờ biển
    for (const [tx, ty] of towers) {
      M.drawChainHomeTower(c, tx, ty, 'top', { scale: 1.35, active: true });
    }

    // 4) Khung cắt góc SIDE (329.18–335.5s) minh họa "The system was crude. It could not see low":
    const crudeSideA = A.win(t, CUE.ch4_crossing_channel + 1.5, CUE.ch4_relayed_telephone + 1.5, 0.4, 0.4);
    if (crudeSideA > 0.01) {
      A.withA(c, crudeSideA, () => {
        const bx = 480, by = 250, bw = 540, bh = 250;
        A.rrect(c, bx - bw / 2, by - bh / 2, bw, bh, 12, P.paper, P.ink, M.lwO(c));
        A.line(c, [[bx - bw / 2 + 20, by + 85], [bx + bw / 2 - 20, by + 85]], P.ink, M.lwO(c));
        M.drawChainHomeTower(c, bx - 185, by + 85, 'side', { scale: 1.05, active: true });
        // Búp sóng chếch cao bỏ trống khoảng sát mặt biển bên dưới
        A.withA(c, 0.25, () => {
          A.poly(c, [[bx - 185, by - 65], [bx + 230, by - 95], [bx + 230, by - 5]], P.amber, null, 0);
        });
        // Máy bay bay sát mặt biển lọt dưới chùm tia
        M.drawIntruderJet(c, bx + 95, by + 45, 'side', { scale: 0.85 });
      });
    }

    // 5) Từ 339.80s ("told the fighter squadrons when the raiders were coming"):
    // Phi đội tiêm kích Spitfire (3 chiếc) xuất kích từ sân bay nội địa (-310, -250) lao ra đón lõng đúng chỗ!
    const interceptA = A.sm(t, CUE.ch4_fighter_squadrons - 0.3, CUE.ch4_fighter_squadrons + 0.7);
    const hitTime = 347.20;
    const hitP = A.ph(t, hitTime, hitTime + 0.9);

    if (interceptA > 0.01) {
      const fp = A.eio(t, CUE.ch4_fighter_squadrons, hitTime);
      const fx = A.lerp(-310, raidX - 115, fp);
      const fy = A.lerp(-255, raidY - 20, fp);
      const fAng = Math.atan2(raidY - -255, raidX - -310);

      A.withA(c, interceptA, () => {
        A.line(c, [[-310, -255], [fx, fy]], P.olive, M.lwO(c), [10, 8]);
        for (const [dx, dy] of [
          [0, 0],
          [-45, -38],
          [-48, 36],
        ] as const) {
          M.drawFighterInterceptor(c, fx + dx, fy + dy, 'top', { scale: 1.08, angle: fAng });
        }

        // Loạt đạn súng máy bắn chặn lúc 346.40–347.80s & Vụ nổ hạ chiếc đi đầu lúc 347.20s!
        if (t >= 346.40 && t <= 348.10) {
          const tracerU = ((t - 346.40) * 9) % 1;
          const tx0 = A.lerp(fx + 30, raidX - 20, tracerU);
          const ty0 = A.lerp(fy + 5, raidY, tracerU);
          A.line(c, [[tx0, ty0], [tx0 + 28, ty0 + 4]], P.amber, A.px(c, 5));
        }
      });
    }

    // Vẽ đội hình 3 máy bay địch vượt eo biển (chiếc dẫn đầu bị bắn nổ ở 347.20s)
    for (const [idx, [ox, oy]] of [
      [0, [0, 0]],
      [1, [65, -48]],
      [2, [70, 48]],
    ] as const) {
      if (idx === 0 && t >= hitTime + 0.35) continue;
      M.drawIntruderJet(c, raidX + ox, raidY + oy, 'top', { scale: 1.05, angle: raidAng });
    }
    if (hitP > 0 && hitP < 1) {
      M.drawExplosion(c, raidX, raidY, hitP, 78);
    }

    K.end(c);

    // Callout năm lịch sử "1940" khớp đúng mốc voice đọc (323.26s)
    const a1940 = A.win(t, CUE.ch4_year_1940 - 0.2, CUE.ch4_tall_towers + 3.2, 0.35, 0.35);
    if (a1940 > 0.01) {
      M.drawCallout(c, 580, 140, '1940 · Chain Home', {
        anchorScreen: K.toScreen(cam, -155, -310),
        accent: P.amber,
        alpha: a1940,
      });
    }
  }
}
