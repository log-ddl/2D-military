// scenes/_assets.ts — Toàn bộ vật thể và nền của project war_19 ở mọi góc nhìn.
// Tuân thủ code-video-2d: đường bao rõ (LINE.outer/inner), màu từ bảng P (palette.ts), tất định theo thời gian.
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';

export type ViewAngle = 'side' | 'cutaway' | 'front' | 'top';

// ── Helper nét vẽ theo độ phóng hoặc cố định ────────────────────────
export function lw(c: CanvasRenderingContext2D, base: number = LINE.outer) {
  return A.px(c, base);
}

// ── 1. Vận tải cơ quân sự hạng nặng (C-17 Globemaster) ───────────────
export interface C17Opts {
  view?: ViewAngle;
  scale?: number;
  flipX?: boolean;
  rampOpen?: number;      // 0..1: mở bửng đuôi hạ làm cầu dẫn
  flapAngle?: number;     // 0..1: hạ cánh tà titan (blown flaps)
  spoilers?: number;      // 0..1: bật tấm cản khí trên cánh
  reverseThrust?: number; // 0..1: mở gầu đảo chiều luồng phụt
  jetBlast?: number;      // 0..1: luồng phụt động cơ
  gearDown?: number;      // 0..1: hạ càng đáp
  gearComp?: number;      // 0..1: độ nhún càng khi chạm đất
  hiWing?: number;        // 0..1: nhấn sáng cánh trên nóc
  hiBelly?: number;       // 0..1: nhấn sáng bụng thấp
  hiTail?: number;        // 0..1: nhấn sáng đuôi chữ T
  hiPods?: number;        // 0..1: nhấn sáng bầu bánh xe
  hiFlaps?: number;       // 0..1: nhấn sáng cánh tà thổi
  hiFloor?: number;       // 0..1: nhấn sáng sàn dầm cầu
  hiRamp?: number;        // 0..1: nhấn sáng bửng đuôi
  openDorsal?: number;    // 0..1: (góc top) mở lưng khoang để thấy hàng bên trong
  interiorLoad?: 'none' | 'tank' | 'pallets' | 'troops' | 'bladders';
}

export function drawC17(c: CanvasRenderingContext2D, x: number, y: number, opts: C17Opts = {}) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  if (opts.flipX) c.scale(-s, s);
  else c.scale(s, s);

  if (view === 'side' || view === 'cutaway') {
    const isCut = view === 'cutaway';
    const ramp = A.clamp01(opts.rampOpen ?? 0);
    const flap = A.clamp01(opts.flapAngle ?? 0);
    const spoil = A.clamp01(opts.spoilers ?? 0);
    const rev = A.clamp01(opts.reverseThrust ?? 0);
    const blast = A.clamp01(opts.jetBlast ?? 0);
    const gear = A.clamp01(opts.gearDown ?? 1);
    const comp = A.clamp01(opts.gearComp ?? 0);

    // Điểm gốc y = 0 là mặt đất khi gearDown = 1, sàn khoang ở y = -52 (tương ứng ~1.5m)
    const bodyLift = (1 - gear) * 28 - comp * 10;
    c.translate(0, -bodyLift);

    // 1. Đuôi đứng chữ T (T-Tail) vươn cao phía sau
    const tailFill = opts.hiTail ? A.lerpColor(P.olive, P.amber, opts.hiTail) : P.olive;
    const tailTopFill = opts.hiTail ? A.lerpColor(P.oliveLight, P.amber, opts.hiTail) : P.oliveLight;
    A.poly(c, [
      [-370, -148], [-450, -325], [-380, -325], [-275, -148],
    ], tailFill, P.ink, outW);
    // Cánh ngang đỉnh đuôi chữ T
    A.rrect(c, -475, -342, 135, 22, 8, tailTopFill, P.ink, outW);

    // 2. Bửng đuôi thép (Rear Ramp) — mở hạ xuống chạm đất y = 0
    const rx0 = -255, ry0 = -54;
    const rampAng = A.lerp(-0.42, 0.23, ramp); // khi đóng khép lên đuôi, khi mở chạm đất
    c.save();
    c.translate(rx0, ry0);
    c.rotate(-rampAng);
    const rampColor = opts.hiRamp ? A.lerpColor(P.oliveDark, P.amber, opts.hiRamp) : P.oliveDark;
    A.poly(c, [[0, -6], [-135, -6], [-145, 8], [0, 8]], rampColor, P.ink, outW);
    // Gân thép trên cầu dẫn
    for (let i = 1; i <= 4; i++) {
      const gx = -i * 28;
      A.line(c, [[gx, -5], [gx, 7]], P.light, inW);
    }
    c.restore();

    // 3. Thân chính (Fuselage) béo thấp sát đất
    const hullPts: A.Pt[] = [
      [-260, -48],
      [-395, -135],
      [-370, -168],
      [-220, -182],
      [215, -182],
      [305, -145],
      [365, -98],
      [375, -68],
      [340, -46],
      [-260, -46],
    ];
    A.poly(c, hullPts, isCut ? P.oliveDark : P.olive, P.ink, outW);

    // Sống lưng sáng màu hơn (nếu không phải cutaway)
    if (!isCut) {
      A.poly(c, [
        [-365, -165], [-220, -182], [215, -182], [305, -145], [220, -140], [-240, -140],
      ], P.oliveLight, null, 0);
      // Nếu nhấn bụng thấp (hiBelly > 0): chỉ tô sáng dải bụng dưới sát đất để giữ thứ bậc thị giác
      if ((opts.hiBelly ?? 0) > 0.02) {
        A.withA(c, opts.hiBelly!, () => {
          A.rrect(c, -258, -64, 600, 18, 6, P.amber, P.ink, inW);
        });
      }
      A.path(c, hullPts);
      A.fs(c, null, P.ink, outW);
    }

    // Kính buồng lái
    A.poly(c, [
      [272, -152], [326, -122], [312, -102], [258, -118],
    ], P.glass, P.ink, inW);

    // 4. Nếu là góc Cutaway: mở lòng khoang, thấy sàn dầm cầu, khuyên chằng, ghế lính và APU
    if (isCut) {
      // Khoang rỗng bên trong
      A.rrect(c, -255, -162, 485, 108, 8, P.paper, P.ink, inW);
      // Vách cách nhiệt kẻ ô và dải ghế lưới đỏ (red nylon webbing seats)
      for (let xk = -240; xk <= 200; xk += 32) {
        A.line(c, [[xk, -160], [xk, -60]], P.bg2, inW * 0.7);
      }
      A.rrect(c, -245, -122, 440, 12, 3, P.enemyLight, P.enemy, inW * 0.8);

      // Sàn dầm cầu hợp kim (Bridge-beam floor) ở y = -56..-44
      const floorCol = opts.hiFloor ? A.lerpColor(P.dark, P.amber, opts.hiFloor) : P.dark;
      A.rrect(c, -258, -58, 492, 12, 2, floorCol, P.ink, inW);
      // Các dầm chữ I dày bên dưới sàn
      for (let bx = -240; bx <= 215; bx += 26) {
        A.rrect(c, bx - 5, -57, 10, 11, 1, opts.hiFloor ? P.amber : P.slate, P.ink, inW * 0.75);
        // Khuyên chằng buộc (tie-down ring) trên mặt sàn
        A.circle(c, bx, -59, 3.5, P.amber, P.ink, inW * 0.7);
      }

      // Hộp cánh chịu lực (Wing Box) nằm TRÊN NÓC khoang (không chiếm bụng)
      const wbCol = opts.hiWing ? P.amber : P.oliveLight;
      A.rrect(c, -65, -196, 155, 34, 6, wbCol, P.ink, outW);
      for (let wx = -45; wx <= 70; wx += 28) {
        A.line(c, [[wx, -194], [wx, -164]], P.ink, inW);
      }

      // APU & Tời điện ở đầu khoang (x = 195..225)
      A.rrect(c, 192, -96, 34, 36, 4, P.slate, P.ink, inW);
      A.circle(c, 209, -78, 10, P.amber, P.ink, inW);
    }

    // 5. Bầu phình càng đáp hai bên sườn bụng (Bulging Landing Gear Pods) + 6 bánh/bên
    const podCol = opts.hiPods ? A.lerpColor(P.oliveDark, P.amber, opts.hiPods) : P.oliveDark;
    A.rrect(c, -118, -76, 196, 34, 15, podCol, P.ink, outW);
    if (gear > 0.05) {
      const wheelY = -18 - (1 - gear) * 24 + comp * 8;
      // 3 cặp bánh chính (6 bánh mỗi bên = 12 bánh chính)
      const wheelXs = [-82, -46, -2, 34, 62];
      for (const wx of wheelXs) {
        A.line(c, [[wx, -46], [wx, wheelY]], P.dark, inW * 1.4);
        A.circle(c, wx, wheelY, 17, P.dark, P.ink, outW);
        A.circle(c, wx, wheelY, 7, P.light, P.ink, inW);
      }
      // Càng mũi (Nose gear)
      A.line(c, [[285, -48], [285, wheelY + 2]], P.dark, inW * 1.4);
      A.circle(c, 285, wheelY + 2, 14, P.dark, P.ink, outW);
      A.circle(c, 285, wheelY + 2, 5.5, P.light, P.ink, inW);
    }

    // 6. Cánh cao trên nóc (High Wing) + Cánh tà titan (Blown Flaps) + Spoilers + 4 Động cơ
    // Trong chế độ cutaway: hộp cánh trên nóc đã hiện rõ, chỉ vẽ cánh ngoài/động cơ khi giải thích cánh tà (flapAngle/hiFlaps)
    const wingCol = opts.hiWing ? A.lerpColor(P.oliveLight, P.amber, opts.hiWing) : P.oliveLight;
    if (!isCut || (opts.flapAngle ?? 0) > 0.05 || (opts.hiFlaps ?? 0) > 0.05) {
      const wyOff = isCut ? -24 : 0;
      c.save();
      c.translate(0, wyOff);
      // Thân cánh trên nóc
      A.poly(c, [
        [-75, -172], [95, -178], [45, -148], [-95, -152],
      ], wingCol, P.ink, outW);
      // Mấu winglet đầu cánh
      A.poly(c, [
        [-72, -152], [-98, -152], [-110, -188], [-88, -188],
      ], wingCol, P.ink, inW);

      // Spoilers bật trên lưng cánh khi chạm đất
      if (spoil > 0.02) {
        c.save();
        c.translate(-25, -172);
        c.rotate(A.lerp(0, 0.85, spoil));
        A.rrect(c, -45, -6, 48, 8, 2, P.amber, P.ink, inW);
        c.restore();
      }

      // Cánh tà titan khổng lồ (Blown Flaps) hạ xuống phía sau cánh
      if (flap > 0.02 || opts.hiFlaps) {
        c.save();
        c.translate(-68, -154);
        c.rotate(A.lerp(0.1, 0.78, flap));
        const fCol = opts.hiFlaps ? P.amber : P.slate;
        A.poly(c, [[0, -6], [-78, 8], [-74, 22], [6, 8]], fCol, P.ink, outW);
        c.restore();
      }

      // 2 Động cơ phản lực đại diện phía bên này (treo cao dưới cánh)
      const engPositions: A.Pt[] = [[58, -136], [8, -130]];
      for (const [ex, ey] of engPositions) {
        A.poly(c, [[ex - 10, ey - 22], [ex + 22, ey - 22], [ex + 16, ey], [ex - 16, ey]], P.oliveDark, P.ink, inW);
        A.rrect(c, ex - 38, ey - 16, 78, 34, 10, P.olive, P.ink, outW);
        A.rrect(c, ex + 24, ey - 14, 18, 30, 4, P.light, P.ink, inW);
        if (rev > 0.02) {
          const rx = ex - 38;
          A.poly(c, [
            [rx, ey - 16], [rx - 18 * rev, ey - 6], [rx - 18 * rev, ey + 8], [rx, ey + 18],
          ], P.amber, P.ink, inW);
          if (blast > 0.05) {
            A.withA(c, blast * 0.85, () => {
              A.line(c, [[rx - 10, ey - 12], [rx + 65, ey - 42]], P.amber, lw(c, 3.5), [10, 6]);
              A.line(c, [[rx - 10, ey + 12], [rx + 65, ey + 38]], P.amber, lw(c, 3.5), [10, 6]);
            });
          }
        } else if (blast > 0.05) {
          const bx = ex - 40;
          A.withA(c, blast * 0.9, () => {
            if (flap > 0.25) {
              A.line(c, [[bx, ey], [bx - 65, ey + 6], [bx - 125, ey + 58]], P.amber, lw(c, 4.5), [12, 6]);
              A.line(c, [[bx - 85, ey + 20], [bx - 85, ey - 68]], P.sky, lw(c, 5));
              A.poly(c, [[bx - 85, ey - 80], [bx - 96, ey - 62], [bx - 74, ey - 62]], P.sky, P.ink, inW);
            } else {
              A.line(c, [[bx, ey - 5], [bx - 110, ey - 8]], P.amber, lw(c, 3.5), [12, 8]);
              A.line(c, [[bx, ey + 5], [bx - 95, ey + 8]], P.amber, lw(c, 3.5), [12, 8]);
            }
          });
        }
      }
      c.restore();
    }
  } else if (view === 'front') {
    // GÓC FRONT (Mặt cắt ngang / Chính diện):
    // Gốc y = 0 là mặt đất. Sàn khoang thấp (y = -48, ~1.5m), hộp cánh trên nóc, 4 động cơ treo cao
    const isCut = true;
    // Đuôi chữ T phía sau vươn cao
    const tailCol = opts.hiTail ? P.amber : P.oliveDark;
    A.rrect(c, -14, -335, 28, 155, 6, tailCol, P.ink, outW);
    A.rrect(c, -140, -348, 280, 22, 8, opts.hiTail ? P.amber : P.oliveLight, P.ink, outW);

    // Cánh cao bắt ngang qua đỉnh nóc (High Wing spans -460..460)
    const wingCol = opts.hiWing ? P.amber : P.oliveLight;
    A.poly(c, [
      [-450, -162], [-90, -198], [90, -198], [450, -162],
      [445, -146], [85, -172], [-85, -172], [-445, -146],
    ], wingCol, P.ink, outW);
    // Mấu winglet hai đầu cánh
    A.poly(c, [[-450, -162], [-468, -210], [-452, -210], [-438, -160]], wingCol, P.ink, inW);
    A.poly(c, [[450, -162], [468, -210], [452, -210], [438, -160]], wingCol, P.ink, inW);

    // 4 Động cơ phản lực treo cao dưới cánh (cách mặt đất rất xa)
    const engXs = [-310, -185, 185, 310];
    for (const ex of engXs) {
      const ey = Math.abs(ex) > 240 ? -122 : -132;
      A.rrect(c, ex - 8, ey - 36, 16, 24, 3, P.oliveDark, P.ink, inW);
      A.circle(c, ex, ey, 28, P.olive, P.ink, outW);
      A.circle(c, ex, ey, 20, P.dark, P.ink, inW);
      A.circle(c, ex, ey, 7, P.light, P.ink, inW);
    }

    // Bầu phình càng đáp hai bên má bụng (Bulging Cheek Pods)
    const podCol = opts.hiPods ? P.amber : P.oliveDark;
    A.rrect(c, -138, -86, 276, 48, 22, podCol, P.ink, outW);

    // Càng đáp nhiều bánh béo áp suất thấp (Wide low-pressure tires)
    const wheelXs = [-122, -96, -70, 70, 96, 122];
    for (const wx of wheelXs) {
      A.rrect(c, wx - 10, -38, 20, 38, 6, P.dark, P.ink, outW);
      A.rrect(c, wx - 5, -26, 10, 14, 2, P.light, null, 0);
    }

    // Thân tròn (Fuselage)
    A.circle(c, 0, -118, 96, P.olive, P.ink, outW);

    if (isCut) {
      // Lòng khoang mở mặt cắt ngang: thấy hộp cánh trên nóc và sàn khoang thấp ở y = -48
      A.circle(c, 0, -118, 84, P.paper, P.ink, inW);
      // Hộp cánh chịu lực (Wing Box) nằm trên nóc
      A.rrect(c, -68, -204, 136, 32, 6, opts.hiWing ? P.amber : P.oliveDark, P.ink, outW);
      // Sàn khoang hàng dầm cầu rất thấp (cách đất chỉ ~1.5m = 48px)
      const flCol = opts.hiFloor || opts.hiBelly ? P.amber : P.dark;
      A.rrect(c, -76, -56, 152, 14, 3, flCol, P.ink, outW);
      for (let bx = -64; bx <= 64; bx += 16) {
        A.line(c, [[bx, -56], [bx, -42]], P.paper, inW * 0.8);
      }
    }
  } else if (view === 'top') {
    // GÓC TOP-DOWN (Nhìn thẳng từ trên xuống, mũi hướng sang phải +x)
    const ramp = A.clamp01(opts.rampOpen ?? 0);
    const openDorsal = A.clamp01(opts.openDorsal ?? 0);

    // Bửng đuôi thò ra sau khi mở
    if (ramp > 0.05) {
      A.rrect(c, -295 - ramp * 55, -34, 65 + ramp * 55, 68, 4, P.oliveDark, P.ink, outW);
      for (let ry = -22; ry <= 22; ry += 14) {
        A.line(c, [[-290 - ramp * 50, ry], [-235, ry]], P.light, inW * 0.8);
      }
    }

    // 4 Động cơ nhô ra trước mép cánh
    const engY = [-255, -145, 145, 255];
    for (const ey of engY) {
      const ex = Math.abs(ey) > 200 ? -15 : 28;
      A.rrect(c, ex, ey - 18, 68, 36, 10, P.oliveDark, P.ink, outW);
      if ((opts.jetBlast ?? 0) > 0.05) {
        A.withA(c, (opts.jetBlast ?? 0) * 0.8, () => {
          A.line(c, [[ex - 8, ey], [ex - 85, ey]], P.amber, lw(c, 3.5), [10, 6]);
        });
      }
    }

    // Cánh xuôi lớn gắn trên lưng
    A.poly(c, [
      [85, -48], [15, -345], [-45, -345], [-65, -48],
      [-65, 48], [-45, 345], [15, 345], [85, 48],
    ], P.oliveLight, P.ink, outW);

    // Hai bầu càng đáp phình ở hông bụng
    A.rrect(c, -95, -66, 155, 132, 24, P.oliveDark, P.ink, outW);

    // Thân chính
    A.poly(c, [
      [-285, -38], [-195, -52], [185, -52], [275, -24], [295, 0],
      [275, 24], [185, 52], [-195, 52], [-285, 38],
    ], P.olive, P.ink, outW);

    // Kính buồng lái nhìn từ trên
    A.poly(c, [
      [215, -28], [252, -16], [252, 16], [215, 28], [202, 0],
    ], P.glass, P.ink, inW);

    // Nếu mở nắp lưng (openDorsal > 0): thấy lòng khoang từ trên xuống
    if (openDorsal > 0.02) {
      A.withA(c, openDorsal, () => {
        A.rrect(c, -215, -42, 375, 84, 6, P.paper, P.ink, inW);
        // Hai ray con lăn dọc sàn
        A.line(c, [[-205, -16], [150, -16]], P.slate, inW);
        A.line(c, [[-205, 16], [150, 16]], P.slate, inW);
        if (opts.interiorLoad === 'bladders') {
          // Các túi nhiên liệu mềm màu vàng hổ phách (bladder tanks)
          for (let bx = -180; bx <= 90; bx += 68) {
            A.rrect(c, bx, -30, 56, 60, 14, P.amber, P.ink, inW);
            A.line(c, [[bx + 12, -20], [bx + 44, -20]], P.ink, inW * 0.7);
          }
        } else if (opts.interiorLoad === 'tank') {
          drawTank(c, -30, 0, { view: 'top', scale: 0.55 });
        }
      });
    }

    // Đuôi ngang chữ T phía sau
    A.poly(c, [
      [-245, -16], [-305, -135], [-335, -135], [-295, 0],
      [-335, 135], [-305, 135], [-245, 16],
    ], P.oliveLight, P.ink, outW);
  }

  c.restore();
}

// ── 2. Máy bay chở hàng dân sự (Boeing 747 Freighter) ────────────────
export interface B747Opts {
  view?: ViewAngle;
  scale?: number;
  flipX?: boolean;
  floorCrush?: number; // 0..1: độ cong và gãy sập của dầm sàn khi xe tăng 60T đè lên
  showContainers?: number; // 0..1: hiện hàng chục thùng nhôm nhẹ trải đều
  alpha?: number;
}

export function drawB747(c: CanvasRenderingContext2D, x: number, y: number, opts: B747Opts = {}) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);
  const crush = A.clamp01(opts.floorCrush ?? 0);
  const containers = A.clamp01(opts.showContainers ?? 0);

  c.save();
  c.translate(x, y);
  if (opts.flipX) c.scale(-s, s);
  else c.scale(s, s);

  if (opts.alpha !== undefined) c.globalAlpha *= opts.alpha;

  if (view === 'side' || view === 'cutaway') {
    const isCut = view === 'cutaway';
    // Gốc y = 0 là mặt đất. Sàn khoang của 747 cao tới 5m (y = -158)!
    // Càng đáp cao lêu nghêu
    const gearXs = [-145, -95, 255];
    for (const gx of gearXs) {
      A.line(c, [[gx, -108], [gx, -18]], P.dark, outW);
      A.circle(c, gx - 8, -18, 16, P.dark, P.ink, outW);
      A.circle(c, gx + 8, -18, 16, P.dark, P.ink, outW);
    }

    // Đuôi đứng truyền thống (cánh ngang nằm thấp ở đuôi thân)
    A.poly(c, [
      [-355, -185], [-445, -335], [-390, -335], [-285, -185],
    ], P.slate, P.ink, outW);

    // Thân 747 với bướu tầng trên đặc trưng ở đầu
    const bodyPts: A.Pt[] = [
      [-395, -175], [-315, -238], [135, -238], [195, -268],
      [315, -268], [385, -215], [425, -172], [395, -135],
      [285, -112], [-255, -112], [-395, -155],
    ];
    A.poly(c, bodyPts, P.white, P.ink, outW);
    // Dải màu dọc thân dân sự
    if (!isCut) {
      A.line(c, [[-360, -168], [395, -168]], P.slate, lw(c, 8));
      // Cánh thấp gắn dưới bụng (khi nhìn bên ngoài)
      A.poly(c, [[-115, -132], [65, -138], [25, -112], [-145, -116]], P.light, P.ink, outW);
    }

    // Kính buồng lái tầng 2
    A.poly(c, [[315, -258], [362, -228], [348, -212], [305, -232]], P.glass, P.ink, inW);

    if (isCut) {
      // Lòng khoang mở mặt cắt dọc (sàn khoang ở y = -158, tức là cao 5 mét!)
      A.rrect(c, -285, -228, 565, 114, 8, P.bg, P.ink, inW);

      // Hộp cánh chịu lực nằm DƯỚI BỤNG (y = -132..-114) đẩy sàn lên cao
      A.rrect(c, -155, -130, 175, 16, 3, P.light, P.ink, inW);

      // Các thanh dầm sàn mỏng của máy bay dân dụng (bị cong và gãy sập khi crush > 0)
      const numBeams = 18;
      for (let i = 0; i <= numBeams; i++) {
        const bx = -270 + i * 30;
        const distCenter = Math.abs(bx - (-15));
        const localCrush = distCenter < 95 ? crush * (1 - distCenter / 95) : 0;
        const by = -158 + localCrush * 34;
        const col = localCrush > 0.35 ? P.enemy : P.slate;
        A.line(c, [[bx, by], [bx, by + 16]], col, inW);
      }

      // Thanh mặt sàn mảnh (gãy gập ở giữa khi crush > 0.45)
      if (crush < 0.45) {
        A.line(c, [[-280, -158], [-15, -158 + crush * 32], [275, -158]], crush > 0.15 ? P.enemy : P.ink, outW);
      } else {
        // Sàn gãy đôi sập xuống!
        A.line(c, [[-280, -158], [-85, -158], [-22, -158 + crush * 36]], P.enemy, outW);
        A.line(c, [[275, -158], [55, -158], [-8, -158 + crush * 36]], P.enemy, outW);
        // Tia nứt gãy màu đỏ/vàng
        A.line(c, [[-28, -135], [-15, -116], [-2, -135]], P.amber, inW);
      }

      // Nếu hiển thị các thùng hàng nhôm nhẹ trải đều (100 tấn phân bố đều)
      if (containers > 0.02) {
        A.withA(c, containers, () => {
          for (let cx = -265; cx <= 215; cx += 48) {
            A.rrect(c, cx, -216, 42, 54, 4, P.light, P.ink, inW);
            // Mũi tên lực nhỏ rải đều
            A.line(c, [[cx + 21, -160], [cx + 21, -142]], P.slate, inW);
          }
        });
      }
    }

    // Động cơ treo rất thấp dưới cánh (sát đất)
    for (const [ex, ey] of [[15, -82], [-55, -76]] as A.Pt[]) {
      A.rrect(c, ex - 32, ey - 15, 64, 30, 8, P.paper, P.ink, outW);
      A.rrect(c, ex + 18, ey - 13, 14, 26, 3, P.slate, P.ink, inW);
    }
  } else if (view === 'front') {
    // Góc FRONT của Boeing 747: cánh gắn dưới bụng, hộp cánh chiếm bụng, động cơ sát đất hút đá
    // Đuôi đứng
    A.rrect(c, -10, -325, 20, 120, 4, P.slate, P.ink, outW);
    // Cánh thấp dưới bụng vươn chéo lên
    A.poly(c, [
      [-440, -115], [-85, -92], [85, -92], [440, -115],
      [435, -128], [85, -114], [-85, -114], [-435, -128],
    ], P.light, P.ink, outW);

    // 4 Động cơ treo thấp sát mặt đất (y = -56, rất dễ hút sỏi đá/mảnh đạn)
    for (const ex of [-295, -175, 175, 295]) {
      const ey = Math.abs(ex) > 230 ? -68 : -56;
      A.rrect(c, ex - 6, ey - 38, 12, 20, 2, P.slate, P.ink, inW);
      A.circle(c, ex, ey, 25, P.white, P.ink, outW);
      A.circle(c, ex, ey, 17, P.dark, P.ink, inW);
    }

    // Càng đáp ít bánh hẹp áp suất cao
    for (const wx of [-68, -48, 48, 68]) {
      A.line(c, [[wx, -88], [wx, -16]], P.dark, inW * 1.3);
      A.rrect(c, wx - 6, -34, 12, 34, 3, P.dark, P.ink, outW);
    }

    // Thân máy bay dân sự (sàn khoang đẩy cao lên y = -142 vì hộp cánh chiếm bụng dưới)
    A.ellipse(c, 0, -158, 86, 98, 0, P.white, P.ink, outW);
    A.ellipse(c, 0, -158, 76, 86, 0, P.bg, P.ink, inW);
    // Hộp cánh + hầm hàng bụng chiếm toàn bộ nửa dưới thân
    A.rrect(c, -66, -138, 132, 54, 6, P.light, P.ink, outW);
    // Sàn khoang chính nằm tít trên cao (y = -142)
    A.rrect(c, -74, -148, 148, 10, 2, P.slate, P.ink, outW);
  }

  c.restore();
}

// ── 3. Vận tải cơ chiến lược khổng lồ C-5 Galaxy (Mở mũi Visor & Quỳ càng) ──
export interface C5Opts {
  view?: ViewAngle;
  scale?: number;
  visorOpen?: number; // 0..1: mở bật toàn bộ chóp mũi lên trên như kính mũ
  rampOpen?: number;  // 0..1: mở cầu dẫn đuôi
  kneel?: number;     // 0..1: càng đáp quỳ thủy lực hạ thấp sàn
  cutaway?: boolean;  // nhìn xuyên sườn thấy đoàn xe tải chạy xuyên hầm
}

export function drawC5(c: CanvasRenderingContext2D, x: number, y: number, opts: C5Opts = {}) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'side' || view === 'cutaway') {
    const visor = A.clamp01(opts.visorOpen ?? 0);
    const ramp = A.clamp01(opts.rampOpen ?? 0);
    const kneel = A.clamp01(opts.kneel ?? 0);
    const isCut = view === 'cutaway' || (opts.cutaway ?? false);

    // Khi kneel = 1, toàn bộ thân hạ thấp sát đất thêm 22px
    const dropY = kneel * 22;
    c.translate(0, dropY);

    // Đuôi chữ T khổng lồ
    A.poly(c, [[-430, -155], [-520, -355], [-445, -355], [-335, -155]], P.olive, P.ink, outW);
    A.rrect(c, -545, -372, 145, 22, 8, P.oliveLight, P.ink, outW);

    // Cầu dẫn đuôi (Rear Ramp) và Cầu dẫn mũi (Front Visor Ramp)
    if (ramp > 0.02) {
      c.save();
      c.translate(-320, -58);
      c.rotate(-A.lerp(-0.35, 0.18 - kneel * 0.08, ramp));
      A.rrect(c, -135, -6, 135, 12, 3, P.oliveDark, P.ink, outW);
      c.restore();
    }
    if (visor > 0.15) {
      c.save();
      c.translate(310, -58);
      c.rotate(A.lerp(0.35, -0.18 + kneel * 0.08, visor));
      A.rrect(c, 0, -6, 135, 12, 3, P.oliveDark, P.ink, outW);
      c.restore();
    }

    // Thân chính C-5 dài như đường hầm (x = -325..310)
    A.poly(c, [
      [-325, -52], [-435, -142], [-405, -178], [-270, -196],
      [255, -196], [310, -162], [310, -52],
    ], P.olive, P.ink, outW);
    // Bướu buồng lái tầng trên cố định phía sau khớp bản lề mũi
    A.poly(c, [
      [185, -196], [245, -222], [310, -214], [310, -162], [185, -162],
    ], P.oliveLight, P.ink, outW);
    A.poly(c, [[275, -210], [308, -196], [308, -178], [268, -184]], P.glass, P.ink, inW);

    // Lòng đường hầm xuyên suốt từ đuôi tới mũi (nếu mở cutaway)
    if (isCut) {
      A.rrect(c, -318, -158, 624, 100, 4, P.paper, P.ink, inW);
      A.rrect(c, -322, -60, 630, 10, 2, P.dark, P.ink, inW);
      // Mũi tên luồng thông xe xuyên suốt từ đuôi ra mũi
      A.line(c, [[-420, -105], [420, -105]], P.sky, lw(c, 3), [14, 10]);
      // Gốc cánh trên nóc đường hầm (không che lòng hầm)
      A.rrect(c, -95, -194, 190, 28, 6, P.oliveLight, P.ink, outW);
    } else {
      // Cánh cao + 4 động cơ khi nhìn mặt ngoài
      A.poly(c, [[-95, -184], [105, -190], [55, -152], [-115, -158]], P.oliveLight, P.ink, outW);
      for (const [ex, ey] of [[72, -138], [6, -132]] as A.Pt[]) {
        A.rrect(c, ex - 38, ey - 16, 76, 32, 9, P.olive, P.ink, outW);
      }
    }

    // Chóp mũi Visor mở bật lên trên quanh bản lề (305, -168)
    c.save();
    c.translate(305, -168);
    c.rotate(-visor * 1.12); // Mở vểnh lên cao
    A.poly(c, [
      [0, 0], [85, 38], [125, 86], [95, 116], [5, 116], [0, 0],
    ], P.oliveLight, P.ink, outW);
    A.line(c, [[15, 58], [98, 92]], P.oliveDark, inW);
    c.restore();

    // Bầu càng đáp 28 bánh (kneeling landing gear)
    const wheelY = -18 - dropY;
    A.rrect(c, -165, -78, 255, 32, 14, P.oliveDark, P.ink, outW);
    for (const wx of [-135, -95, -55, -15, 25, 65, 275]) {
      A.line(c, [[wx, -52], [wx, wheelY]], P.dark, inW * 1.3);
      A.circle(c, wx, wheelY, 15, P.dark, P.ink, outW);
      A.circle(c, wx, wheelY, 6, P.light, P.ink, inW);
    }
  } else if (view === 'top') {
    // Góc TOP-DOWN C-5 Galaxy cho bản đồ chiến lược Chương 5
    A.poly(c, [
      [95, -52], [10, -380], [-55, -380], [-75, -52],
      [-75, 52], [-55, 380], [10, 380], [95, 52],
    ], P.oliveLight, P.ink, outW);
    for (const ey of [-275, -155, 155, 275]) {
      A.rrect(c, 5, ey - 18, 68, 36, 8, P.oliveDark, P.ink, outW);
    }
    A.rrect(c, -310, -54, 620, 108, 45, P.olive, P.ink, outW);
    A.poly(c, [[-265, -18], [-330, -145], [-360, -145], [-315, 0], [-360, 145], [-330, 145], [-265, 18]], P.oliveLight, P.ink, outW);
  }

  c.restore();
}

// ── 4. Vận tải cơ chiến thuật 4 cánh quạt C-130 Hercules ────────────
export interface C130Opts {
  view?: ViewAngle;
  scale?: number;
  propPhase?: number;
  rampOpen?: number;
  gearDown?: number;
}

export function drawC130(c: CanvasRenderingContext2D, x: number, y: number, opts: C130Opts = {}) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);
  const phase = opts.propPhase ?? 0;
  const ramp = A.clamp01(opts.rampOpen ?? 0);
  const gear = A.clamp01(opts.gearDown ?? 1);

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'side') {
    // Đuôi đứng cao (nhưng cánh ngang đặt ở gốc đuôi đặc trưng C-130)
    A.poly(c, [[-220, -118], [-285, -245], [-235, -245], [-165, -118]], P.olive, P.ink, outW);
    // Cầu đuôi mở
    if (ramp > 0.02) {
      c.save();
      c.translate(-165, -52);
      c.rotate(A.lerp(0.3, -0.15, ramp));
      A.rrect(c, -95, -5, 95, 10, 2, P.oliveDark, P.ink, outW);
      c.restore();
    }
    // Thân ngắn gọn
    A.poly(c, [
      [-175, -46], [-265, -108], [-245, -138], [-135, -148],
      [155, -148], [225, -112], [248, -76], [218, -46],
    ], P.olive, P.ink, outW);
    A.poly(c, [[175, -132], [218, -104], [205, -88], [165, -102]], P.glass, P.ink, inW);
    // Bầu càng đáp và bánh xe (khi gearDown > 0)
    A.rrect(c, -65, -68, 110, 26, 10, P.oliveDark, P.ink, outW);
    if (gear > 0.05) {
      const wy = -15 - (1 - gear) * 24;
      for (const wx of [-32, 8, 185]) {
        A.circle(c, wx, wy, 14, P.dark, P.ink, outW);
        A.circle(c, wx, wy, 5, P.light, P.ink, inW);
      }
    }
    // Cánh thẳng trên lưng + động cơ turboprop cánh quạt
    A.rrect(c, -55, -158, 125, 22, 6, P.oliveLight, P.ink, outW);
    A.rrect(c, -15, -142, 95, 26, 8, P.oliveDark, P.ink, outW);
    // Cánh quạt quay
    const bladeH = 42 * Math.abs(Math.cos(phase * 14));
    A.rrect(c, 80, -129 - bladeH, 6, bladeH * 2, 3, P.amber, P.ink, inW);
    A.circle(c, 82, -129, 8, P.light, P.ink, inW);
  } else {
    // Góc TOP-DOWN C-130: cánh thẳng vuông vức + 4 động cơ cánh quạt
    A.rrect(c, -35, -245, 76, 490, 12, P.oliveLight, P.ink, outW);
    for (const ey of [-185, -105, 105, 185]) {
      A.rrect(c, 10, ey - 14, 52, 28, 6, P.oliveDark, P.ink, outW);
      const bw = 28 * Math.abs(Math.sin(phase * 14 + ey));
      A.line(c, [[66, ey - bw], [66, ey + bw]], P.amber, lw(c, 3.5));
    }
    A.rrect(c, -195, -38, 390, 76, 32, P.olive, P.ink, outW);
    A.rrect(c, -215, -95, 48, 190, 8, P.oliveLight, P.ink, outW);
  }

  c.restore();
}

// ── 5. Xe tăng chủ lực 60 tấn (Main Battle Tank) ────────────────────
export interface TankOpts {
  view?: ViewAngle;
  scale?: number;
  flipX?: boolean;
  pitch?: number;        // góc chúi/ngóc thân xe (radian)
  gunAngle?: number;     // góc nâng pháo
  turretRot?: number;    // góc quay tháp pháo (cho góc top)
  hiFootprint?: number;  // 0..1: nhấn sáng 2 vệt xích thép chịu tải 60 tấn
  fireFlash?: number;    // 0..1: chớp lửa đầu nòng
}

export function drawTank(c: CanvasRenderingContext2D, x: number, y: number, opts: TankOpts = {}) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  if (opts.flipX) c.scale(-s, s);
  else c.scale(s, s);
  if (opts.pitch) c.rotate(opts.pitch);

  if (view === 'side' || view === 'cutaway') {
    // Gốc y = 0 là mặt dưới xích xe
    const trackCol = (opts.hiFootprint ?? 0) > 0.05
      ? A.lerpColor(P.dark, P.amber, opts.hiFootprint!)
      : P.dark;
    // Dải xích thép (6 bánh chịu nặng)
    A.rrect(c, -86, -34, 172, 34, 16, trackCol, P.ink, outW);
    for (let i = 0; i < 6; i++) {
      const wx = -64 + i * 25.6;
      A.circle(c, wx, -15, 11, P.oliveDark, P.ink, inW);
      A.circle(c, wx, -15, 4, P.light, null, 0);
    }
    // Nhấn vệt tiếp xúc ngắn dưới đáy xích nếu hiFootprint > 0
    if ((opts.hiFootprint ?? 0) > 0.05) {
      A.line(c, [[-72, 2], [72, 2]], P.enemy, lw(c, 6));
    }

    // Thân bọc thép vát
    A.poly(c, [
      [-94, -30], [-82, -52], [74, -52], [98, -34], [82, -24], [-88, -24],
    ], P.olive, P.ink, outW);
    // Tấm chắn bùn sườn xe
    A.line(c, [[-82, -36], [78, -36]], P.ink, inW);

    // Tháp pháo dẹt hiện đại + Nòng pháo dài 120mm
    const gunAng = opts.gunAngle ?? -0.04;
    c.save();
    c.translate(38, -68);
    c.rotate(gunAng);
    A.rrect(c, 0, -6, 112, 11, 3, P.oliveDark, P.ink, outW);
    // Bầu hút khói giữa nòng (bore evacuator)
    A.rrect(c, 42, -9, 26, 17, 4, P.oliveLight, P.ink, inW);
    if ((opts.fireFlash ?? 0) > 0.02) {
      A.withA(c, opts.fireFlash!, () => {
        A.poly(c, [[112, 0], [158, -18], [142, 0], [158, 18]], P.amber, P.enemy, inW);
        A.circle(c, 120, 0, 14, P.white, null, 0);
      });
    }
    c.restore();

    A.poly(c, [
      [-62, -52], [-44, -82], [32, -82], [56, -64], [42, -52],
    ], P.oliveLight, P.ink, outW);
    // Nắp trưởng xe
    A.rrect(c, -28, -90, 24, 9, 3, P.oliveDark, P.ink, inW);
  } else if (view === 'top') {
    // Góc TOP-DOWN xe tăng
    const hiF = opts.hiFootprint ?? 0;
    const tCol = hiF > 0.05 ? A.lerpColor(P.dark, P.amber, hiF) : P.dark;
    // 2 Dải xích hai bên
    A.rrect(c, -78, -48, 156, 22, 6, tCol, P.ink, outW);
    A.rrect(c, -78, 26, 156, 22, 6, tCol, P.ink, outW);
    // Thân xe
    A.rrect(c, -72, -34, 144, 68, 8, P.olive, P.ink, outW);
    // Tháp pháo xoay được
    c.save();
    c.rotate(opts.turretRot ?? 0);
    A.rrect(c, 20, -6, 115, 12, 3, P.oliveDark, P.ink, outW);
    A.poly(c, [
      [-45, -26], [22, -28], [38, -14], [38, 14], [22, 28], [-45, 26],
    ], P.oliveLight, P.ink, outW);
    A.circle(c, -12, -10, 9, P.oliveDark, P.ink, inW);
    if ((opts.fireFlash ?? 0) > 0.02) {
      A.withA(c, opts.fireFlash!, () => {
        A.poly(c, [[135, 0], [178, -20], [162, 0], [178, 20]], P.amber, P.enemy, inW);
      });
    }
    c.restore();
  } else if (view === 'front') {
    // Góc FRONT xe tăng (nằm gọn trong khoang máy bay)
    const hiF = opts.hiFootprint ?? 0;
    const tCol = hiF > 0.05 ? P.amber : P.dark;
    A.rrect(c, -56, -34, 26, 34, 4, tCol, P.ink, outW);
    A.rrect(c, 30, -34, 26, 34, 4, tCol, P.ink, outW);
    A.rrect(c, -48, -54, 96, 32, 6, P.olive, P.ink, outW);
    A.poly(c, [[-38, -54], [-28, -80], [28, -80], [38, -54]], P.oliveLight, P.ink, outW);
    A.circle(c, 0, -66, 9, P.dark, P.ink, outW);
  }

  c.restore();
}

// ── 6. Xe thiết giáp / Xe phóng tên lửa 4 trục / Xe tải quân sự ──────
export interface VehicleOpts {
  kind?: 'ifv' | 'mlrs' | 'truck' | 'sam';
  view?: ViewAngle;
  scale?: number;
  flipX?: boolean;
  hiAxles?: number;     // 0..1: nhấn 4 trục nặng của xe tên lửa
  brokenWheel?: boolean; // xe hỏng bánh được kéo bằng tời điện
  fireFlash?: number;
}

export function drawArmoredVehicle(c: CanvasRenderingContext2D, x: number, y: number, opts: VehicleOpts = {}) {
  const kind = opts.kind ?? 'ifv';
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  if (opts.flipX) c.scale(-s, s);
  else c.scale(s, s);

  if (view === 'side') {
    if (kind === 'mlrs' || kind === 'sam') {
      // Xe phóng tên lửa 4 trục bánh lốp nặng (4 heavy axles)
      A.poly(c, [[-88, -24], [-88, -48], [42, -48], [42, -76], [82, -76], [90, -52], [90, -24]], P.olive, P.ink, outW);
      A.poly(c, [[58, -70], [78, -70], [84, -54], [58, -54]], P.glass, P.ink, inW);
      // Bệ phóng tên lửa nâng nghiêng
      c.save();
      c.translate(-68, -52);
      c.rotate(kind === 'sam' ? -0.45 : -0.22);
      A.rrect(c, 0, -32, 96, 30, 4, P.oliveLight, P.ink, outW);
      for (let r = -24; r <= -8; r += 8) {
        A.line(c, [[6, r], [88, r]], P.ink, inW);
      }
      if ((opts.fireFlash ?? 0) > 0.02) {
        A.withA(c, opts.fireFlash!, () => {
          A.poly(c, [[96, -16], [148, -32], [134, -16], [148, 0]], P.amber, P.enemy, inW);
        });
      }
      c.restore();

      // 4 Trục bánh nặng (4 heavy axles)
      const axleXs = [-66, -28, 22, 60];
      for (const ax of axleXs) {
        const wCol = (opts.hiAxles ?? 0) > 0.05 ? P.amber : P.dark;
        A.circle(c, ax, -16, 16, wCol, P.ink, outW);
        A.circle(c, ax, -16, 6, P.light, P.ink, inW);
      }
    } else if (kind === 'truck') {
      // Xe tải quân sự chạy xuyên hầm C-5
      A.rrect(c, -74, -68, 96, 44, 6, P.sand, P.ink, outW);
      A.poly(c, [[24, -24], [24, -62], [62, -62], [74, -44], [74, -24]], P.olive, P.ink, outW);
      A.rrect(c, 42, -56, 22, 14, 2, P.glass, P.ink, inW);
      for (const ax of [-52, -16, 48]) {
        A.circle(c, ax, -15, 15, P.dark, P.ink, outW);
        A.circle(c, ax, -15, 6, P.light, P.ink, inW);
      }
    } else {
      // Xe thiết giáp nhẹ (IFV / Light Armored Vehicle cho LAPES & khoang lính dù)
      A.poly(c, [
        [-72, -20], [-64, -48], [46, -48], [76, -32], [66, -18],
      ], P.olive, P.ink, outW);
      A.poly(c, [[-24, -48], [-14, -66], [18, -66], [28, -48]], P.oliveLight, P.ink, outW);
      A.line(c, [[24, -58], [62, -60]], P.ink, outW);
      const wheelXs = [-48, -16, 16, 48];
      wheelXs.forEach((wx, idx) => {
        const dy = opts.brokenWheel && idx === 2 ? -6 : 0;
        A.circle(c, wx, -15 + dy, 15, opts.brokenWheel && idx === 2 ? P.enemy : P.dark, P.ink, outW);
        A.circle(c, wx, -15 + dy, 5, P.light, P.ink, inW);
      });
    }
  } else if (view === 'top') {
    // Góc TOP-DOWN xe thiết giáp (dùng trong khoang lính dù Ch3 và bản đồ Ch5)
    for (const wx of [-46, -15, 15, 46]) {
      A.rrect(c, wx - 11, -38, 22, 10, 3, P.dark, P.ink, inW);
      A.rrect(c, wx - 11, 28, 22, 10, 3, P.dark, P.ink, inW);
    }
    A.poly(c, [
      [-68, -28], [48, -28], [68, -16], [68, 16], [48, 28], [-68, 28],
    ], P.olive, P.ink, outW);
    A.circle(c, -4, 0, 18, P.oliveLight, P.ink, outW);
    A.line(c, [[10, 0], [56, 0]], P.ink, outW);
  }

  c.restore();
}

// ── 7. Xe nâng thủy lực cắt kéo dân sự (Hydraulic Scissor Lift) ──────
export function drawScissorLift(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: { scale?: number; lift?: number; crossedOut?: number; alpha?: number } = {}
) {
  const s = opts.scale ?? 1;
  const lift = A.clamp01(opts.lift ?? 0.8);
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(s, s);
  if (opts.alpha !== undefined) c.globalAlpha *= opts.alpha;

  const deckY = A.lerp(-42, -156, lift);
  // Khung xe dưới đất
  A.rrect(c, -68, -28, 136, 16, 4, P.slate, P.ink, outW);
  A.rrect(c, 42, -52, 28, 26, 4, P.paper, P.ink, inW);
  for (const wx of [-46, 0, 48]) {
    A.circle(c, wx, -12, 12, P.dark, P.ink, outW);
  }

  // Cơ cấu thanh chéo cắt kéo (Scissor bars)
  const midY = (-28 + deckY) / 2;
  A.line(c, [[-52, -28], [42, midY]], P.amber, outW);
  A.line(c, [[42, -28], [-52, midY]], P.amber, outW);
  A.line(c, [[-52, midY], [42, deckY]], P.amber, outW);
  A.line(c, [[42, midY], [-52, deckY]], P.amber, outW);

  // Sàn nâng trên cùng + Thùng nhôm nhẹ
  A.rrect(c, -72, deckY - 10, 128, 10, 3, P.slate, P.ink, outW);
  A.rrect(c, -45, deckY - 54, 72, 44, 4, P.light, P.ink, inW);

  // Dấu gạch chéo đỏ (không tồn tại ở chiến trường)
  if ((opts.crossedOut ?? 0) > 0.02) {
    const p = A.clamp01(opts.crossedOut!);
    A.withA(c, p, () => {
      A.line(c, [[-82, -175], [82, 5]], P.enemy, lw(c, 7));
      A.line(c, [[82, -175], [-82, 5]], P.enemy, lw(c, 7));
    });
  }

  c.restore();
}

// ── 8. Cơ cấu Sàn dầm cầu & Con lăn lật 2 mặt (Flip Rollers) ─────────
export function drawFlipRollerChannel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: { scale?: number; flip?: number; rollerSpin?: number } = {}
) {
  const s = opts.scale ?? 1;
  const flip = A.clamp01(opts.flip ?? 0); // 0 = mặt phẳng nhám (smooth/traction side), 1 = mặt con lăn bi thép (rollers up)
  const spin = opts.rollerSpin ?? 0;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  // Dầm chữ I hợp kim dày dưới sàn (Highway bridge beams)
  A.rrect(c, -360, 18, 720, 68, 6, P.bg2, P.ink, outW);
  for (let bx = -310; bx <= 310; bx += 78) {
    // Dầm chữ I
    A.rrect(c, bx - 22, 22, 44, 10, 2, P.slate, P.ink, inW);
    A.rrect(c, bx - 8, 32, 16, 40, 1, P.dark, P.ink, inW);
    A.rrect(c, bx - 22, 72, 44, 10, 2, P.slate, P.ink, inW);
  }

  // Mặt sàn chính có rãnh âm (recessed floor channel)
  A.rrect(c, -360, -12, 720, 32, 4, P.dark, P.ink, outW);

  // 5 khay lật (Flip trays) xoay 180 độ quanh tâm (tx, -6):
  // - Khi flip = 0 (ang = 0): mặt phẳng nhám ở trên (y = -18..-6), con lăn giấu trong rãnh dưới
  // - Khi flip = 1 (ang = PI): con lăn bi thép nhô lên trên mặt sàn (y = -20), mặt phẳng giấu xuống rãnh
  for (let i = 0; i < 5; i++) {
    const tx = -256 + i * 128;
    const localP = A.clamp01((flip * 1.35) - i * 0.08);
    const ang = localP * Math.PI;

    c.save();
    c.translate(tx, -6);
    c.rotate(ang);

    // Con lăn bi thép (nằm ở nửa +y khi ang=0, lật lên đỉnh -y khi ang=PI)
    for (const rx of [-34, 0, 34]) {
      A.circle(c, rx, 11, 9.5, P.amber, P.ink, inW);
      const a0 = spin + rx * 0.1;
      A.line(c, [
        [rx + Math.cos(a0) * 6, 11 + Math.sin(a0) * 6],
        [rx - Math.cos(a0) * 6, 11 - Math.sin(a0) * 6],
      ], P.ink, inW * 0.8);
    }

    // Thân khay thép chữ U
    A.rrect(c, -54, -10, 108, 18, 4, P.oliveLight, P.ink, outW);
    // Gai nhám chống trượt ở mặt phẳng (nằm ở đỉnh y = -10 khi ang = 0)
    for (let gx = -42; gx <= 42; gx += 14) {
      A.line(c, [[gx, -13], [gx + 5, -10]], P.ink, inW * 1.2);
    }
    c.restore();

    // Nẹp thành rãnh che nửa dưới đang úp trong lòng rãnh sàn (khi không đang xoay giữa chừng)
    if (localP < 0.08 || localP > 0.92) {
      A.rrect(c, tx - 58, 0, 116, 18, 2, P.dark, P.ink, inW);
    }
  }

  c.restore();
}

// ── 9. Pallet hàng hóa, Túi dầu Bladder Tank, Dù kéo & Tàu chở hàng ──
export function drawPallet(c: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  // Đế nhôm phẳng
  A.rrect(c, -52, -8, 104, 8, 2, P.slate, P.ink, outW);
  // Kiện hàng phủ bạt + lưới chằng
  A.rrect(c, -46, -68, 92, 60, 6, P.sand, P.ink, outW);
  A.line(c, [[-44, -48], [44, -48]], P.oliveDark, inW);
  A.line(c, [[-44, -28], [44, -28]], P.oliveDark, inW);
  A.line(c, [[-22, -68], [-22, -8]], P.oliveDark, inW);
  A.line(c, [[22, -68], [22, -8]], P.oliveDark, inW);
  c.restore();
}

export function drawParachute(
  c: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  chuteX: number,
  chuteY: number,
  radius: number,
  open = 1
) {
  const p = A.clamp01(open);
  if (p <= 0.01) return;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);
  const r = radius * p;

  c.save();
  // Dây cáp kéo căng từ mấu hàng tới vòm dù
  A.line(c, [[anchorX, anchorY], [chuteX, chuteY - r * 0.75]], P.ink, inW);
  A.line(c, [[anchorX, anchorY], [chuteX, chuteY]], P.ink, outW);
  A.line(c, [[anchorX, anchorY], [chuteX, chuteY + r * 0.75]], P.ink, inW);

  // Vòm dù bán nguyệt mở căng hứng gió
  c.beginPath();
  c.arc(chuteX, chuteY, r, -Math.PI * 0.52, Math.PI * 0.52, true);
  c.closePath();
  A.fs(c, P.oliveLight, P.ink, outW);
  // Múi dù
  A.line(c, [[chuteX, chuteY - r], [chuteX - r * 0.85, chuteY - r * 0.35]], P.ink, inW);
  A.line(c, [[chuteX, chuteY + r], [chuteX - r * 0.85, chuteY + r * 0.35]], P.ink, inW);
  c.restore();
}

export function drawCargoShip(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: { view?: 'side' | 'top'; scale?: number } = {}
) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'side') {
    // Thân tàu chở hàng cỡ vừa (Medium Cargo Ship) chất hàng trăm tấn hàng
    A.poly(c, [
      [-280, 0], [-305, -52], [275, -52], [325, -62], [295, 0],
    ], P.dark, P.ink, outW);
    A.line(c, [[-292, -16], [302, -16]], P.enemy, lw(c, 5));
    // Đài chỉ huy phía lái
    A.rrect(c, -265, -132, 68, 80, 4, P.paper, P.ink, outW);
    A.rrect(c, -255, -118, 48, 16, 2, P.glass, P.ink, inW);
    // Hàng dãy container/xe tăng xếp kín boong tàu
    const cols = [P.olive, P.sand, P.oliveLight, P.slate];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 3; row++) {
        const cx = -175 + col * 62;
        const cy = -74 - row * 22;
        A.rrect(c, cx, cy, 56, 20, 2, cols[(col + row) % cols.length]!, P.ink, inW);
      }
    }
  } else {
    // Góc TOP-DOWN tàu biển
    A.poly(c, [
      [-240, -48], [185, -48], [265, 0], [185, 48], [-240, 48],
    ], P.dark, P.ink, outW);
    A.rrect(c, -220, -38, 52, 76, 4, P.paper, P.ink, inW);
    for (let cx = -150; cx <= 130; cx += 48) {
      A.rrect(c, cx, -34, 42, 30, 2, P.olive, P.ink, inW);
      A.rrect(c, cx, 4, 42, 30, 2, P.sand, P.ink, inW);
    }
  }

  c.restore();
}

// ── 10. Lính dù, Nhân viên bốc xếp (Loadmaster) & Tổ đội MANPADS ────
export function drawSoldier(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: { view?: 'side' | 'top'; scale?: number; color?: string; walkPhase?: number } = {}
) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const col = opts.color ?? P.olive;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'side') {
    const stride = Math.sin(opts.walkPhase ?? 0) * 7;
    // Chân
    A.capsule(c, [-2, -18], [-4 - stride, -2], 6, P.oliveDark, P.ink, inW);
    A.capsule(c, [2, -18], [4 + stride, -2], 6, P.oliveDark, P.ink, inW);
    // Thân áo giáp + ba lô
    A.rrect(c, -11, -38, 10, 18, 3, P.oliveDark, P.ink, inW);
    A.rrect(c, -7, -40, 14, 24, 5, col, P.ink, outW);
    // Đầu + Mũ sắt
    A.circle(c, 0, -48, 7, P.skin, P.ink, inW);
    A.poly(c, [[-8, -49], [-6, -57], [7, -57], [9, -48]], P.oliveDark, P.ink, inW);
  } else {
    // Góc TOP-DOWN (ngồi trên ghế lưới hoặc chạy trên đường băng)
    A.rrect(c, -11, -7, 22, 14, 6, col, P.ink, inW);
    A.circle(c, 0, 0, 6.5, P.oliveDark, P.ink, inW);
  }

  c.restore();
}

export function drawManpadsTeam(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: { scale?: number; aimAngle?: number; fired?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  const ang = opts.aimAngle ?? -0.85;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  // Công sự bao cát của đối phương
  A.rrect(c, -32, -16, 64, 16, 6, P.sand, P.ink, outW);
  // Xạ thủ phe đối phương (P.enemy)
  drawSoldier(c, 0, 0, { view: 'side', scale: 1, color: P.enemy });
  // Ống phóng tên lửa vác vai hướng lên máy bay
  c.save();
  c.translate(0, -36);
  c.rotate(ang);
  A.rrect(c, -18, -4, 54, 8, 2, P.enemy, P.ink, outW);
  if (opts.fired) {
    A.circle(c, -22, 0, 9, P.amber, null, 0);
  }
  c.restore();

  c.restore();
}

// ── 11. Hiệu ứng Vụ nổ, Pháo sáng mồi bẫy (Flare) & Tên lửa ─────────
export function drawExplosion(c: CanvasRenderingContext2D, x: number, y: number, p: number, maxR = 55) {
  if (p <= 0 || p >= 1) return;
  const outW = lw(c, LINE.outer);
  const r = maxR * A.eo(p, 0, 1);
  const alpha = 1 - A.ei(p, 0.35, 1);

  A.withA(c, alpha, () => {
    // Vòng khói ngoài
    A.circle(c, x, y - p * 18, r * 1.15, P.dark, P.ink, outW);
    // Quả cầu lửa đỏ/cam
    A.circle(c, x, y - p * 10, r * 0.82, P.enemy, P.ink, outW);
    // Tâm chớp vàng trắng
    if (p < 0.55) {
      A.circle(c, x, y, r * 0.48, P.amber, null, 0);
      A.circle(c, x, y, r * 0.22, P.white, null, 0);
    }
  });
}

export function drawFlareCluster(
  c: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  p: number
) {
  if (p <= 0 || p >= 1) return;
  const inW = lw(c, LINE.inner);
  for (let i = 0; i < 8; i++) {
    const lp = A.clamp01(p * 1.4 - i * 0.06);
    if (lp <= 0 || lp >= 1) continue;
    const ang = 1.65 + (i - 3.5) * 0.16;
    const dist = lp * (95 + (i % 3) * 28);
    const fx = originX + Math.cos(ang) * dist;
    const fy = originY + Math.sin(ang) * dist + lp * lp * 35;
    A.withA(c, 1 - lp * 0.65, () => {
      A.line(c, [[originX, originY], [fx, fy]], P.light, inW, [4, 4]);
      A.circle(c, fx, fy, 9, P.amber, P.enemy, inW);
      A.circle(c, fx, fy, 4, P.white, null, 0);
    });
  }
}

// ── 12. Nền môi trường & Callout tối thiểu ──────────────────────────
export function drawGroundSide(
  c: CanvasRenderingContext2D,
  cam: K.Cam,
  mode: 'civil' | 'dirt' | 'night' = 'dirt',
  groundY = 0
) {
  const v = K.view(cam, 200);
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  // Bầu trời
  c.fillStyle = mode === 'night' ? P.dark : P.bg;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, groundY - v.y0);

  // Dãy đồi mờ phía chân trời
  c.beginPath();
  c.moveTo(v.x0, groundY);
  const step = 220;
  const startX = Math.floor(v.x0 / step) * step;
  for (let hx = startX; hx <= v.x1 + step; hx += step) {
    const hh = 35 + A.rnd(hx * 0.01) * 55;
    c.lineTo(hx, groundY - hh);
  }
  c.lineTo(v.x1 + step, groundY);
  c.closePath();
  c.fillStyle = mode === 'night' ? P.ink : P.bg2;
  c.fill();

  // Lớp mặt đất / đường băng
  const slabColor = mode === 'civil' ? P.light : mode === 'night' ? P.ink2 : P.sand;
  c.fillStyle = slabColor;
  c.fillRect(v.x0, groundY, v.x1 - v.x0, v.y1 - groundY);
  A.line(c, [[v.x0, groundY], [v.x1, groundY]], P.ink, outW);

  if (mode === 'civil') {
    // Bê tông dày nhiều lớp chuẩn sân bay quốc tế
    c.fillStyle = P.slate;
    c.fillRect(v.x0, groundY + 26, v.x1 - v.x0, 38);
    A.line(c, [[v.x0, groundY + 26], [v.x1, groundY + 26]], P.ink, inW);
  } else {
    // Đường băng đất nện / tấm ghi thép có sỏi đá và vết nứt
    const gStart = Math.floor(v.x0 / 120) * 120;
    for (let gx = gStart; gx <= v.x1; gx += 120) {
      const r1 = A.rnd(gx * 0.13);
      A.circle(c, gx + r1 * 60, groundY + 18 + r1 * 16, 4 + r1 * 5, P.oliveDark, P.ink, inW * 0.7);
      // Tấm ghi thép (matted steel planks) trên mặt đất
      A.rrect(c, gx, groundY, 108, 6, 1, P.slate, P.ink, inW * 0.7);
    }
  }
}

export function drawCallout(
  c: CanvasRenderingContext2D,
  cam: K.Cam,
  wx: number,
  wy: number,
  dx: number,
  dy: number,
  text: string,
  alpha = 1,
  accent: string = P.ink
) {
  if (alpha <= 0.01) return;
  const [sx, sy] = K.toScreen(cam, wx, wy);
  const bx = sx + dx;
  const by = sy + dy;

  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  A.withA(c, alpha, () => {
    c.font = '700 26px system-ui, -apple-system, sans-serif';
    const tw = c.measureText(text).width;
    const padX = 16;
    const bw = tw + padX * 2;
    const bh = 44;

    // Đường chỉ neo vào điểm thế giới
    A.line(c, [[sx, sy], [bx, by]], accent, 3);
    A.circle(c, sx, sy, 5.5, P.amber, P.ink, 2.5);

    // Hộp nhãn gọn rõ
    A.rrect(c, bx - bw / 2, by - bh / 2, bw, bh, 8, P.white, accent, 3);
    c.fillStyle = P.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, bx, by + 1);
  });
  c.restore();
}
