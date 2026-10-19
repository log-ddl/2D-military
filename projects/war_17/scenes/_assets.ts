// scenes/_assets.ts — Toàn bộ vật thể và nền của phim war_17 (vẽ 1 lần, giữ nhất quán suốt 5 chương).
// Tuân thủ nguyên tắc code-video-2d và bảng màu P từ ./shared/palette.
import * as A from './shared/art';
import { P, LINE } from './shared/palette';
import * as R from './shared/rig';
import * as F from './shared/fx';

export type ViewKind = 'side' | 'top' | 'cutaway' | 'front';

const LW = LINE.outer;
const LWI = LINE.inner;

// ── Helper: Bánh xe lốp / bánh xích ─────────────────────────────────────────
export function drawWheelSide(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot = 0,
  flatten = 0, // 0..1: CTIS xả hơi làm bẹt đáy lốp
  shredded = 0, // 0..1: vỏ ngoài bị bắn rách lộ lõi run-flat
  showRunflat = false,
) {
  c.save();
  c.translate(x, y + flatten * r * 0.22);
  const rx = r * (1 + flatten * 0.28);
  const ry = r * (1 - flatten * 0.22);

  // Lốp cao su ngoài
  if (shredded < 0.95) {
    A.ellipse(c, 0, 0, rx, ry, 0, P.dark, P.ink, LW);
    // Gai lốp
    for (let i = 0; i < 8; i++) {
      const a = rot + (i / 8) * Math.PI * 2;
      const x0 = Math.cos(a) * rx * 0.78;
      const y0 = Math.sin(a) * ry * 0.78;
      const x1 = Math.cos(a) * rx * 0.98;
      const y1 = Math.sin(a) * ry * 0.98;
      A.line(c, [[x0, y0], [x1, y1]], P.ink, LWI);
    }
  } else {
    // Vỏ lốp bị rách tả tơi
    for (let i = 0; i < 7; i++) {
      const a = rot + (i / 7) * Math.PI * 2;
      const rOut = r * (0.72 + 0.25 * ((i % 2) * 0.8));
      A.line(
        c,
        [
          [Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58],
          [Math.cos(a + 0.18) * rOut, Math.sin(a + 0.18) * rOut],
        ],
        P.dark,
        LW,
      );
    }
  }

  // Vòng cao su đặc Run-flat bên trong
  if (showRunflat || shredded > 0.1) {
    A.circle(c, 0, 0, r * 0.66, P.amber, P.ink, LWI);
  }

  // Mâm thép (Wheel rim)
  A.circle(c, 0, 0, r * 0.45, P.oliveLight, P.ink, LW);
  A.circle(c, 0, 0, r * 0.16, P.slate, P.ink, LWI);
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * Math.PI * 2;
    A.circle(c, Math.cos(a) * r * 0.29, Math.sin(a) * r * 0.29, 3, P.ink, null, 0);
  }
  c.restore();
}

export function drawTrackAssembly(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  nWheels = 5,
  phase = 0,
  wear = 0, // 0..1: xích nóng/mòn đỏ cam khi chạy đường nhựa
) {
  c.save();
  c.translate(x, y);
  const r = h * 0.42;
  const trackCol = wear > 0.05 ? A.lerpColor(P.dark, P.enemy, wear * 0.7) : P.dark;
  // Dải xích bao quanh
  A.rrect(c, -w / 2, -h, w, h, h * 0.48, P.slate, P.ink, LW);
  A.rrect(c, -w / 2 + 6, -h + 6, w - 12, h - 12, (h - 12) * 0.48, P.bg2, P.ink, LWI);

  // Mắt xích chạy dọc viền
  const perim = w * 2;
  const nLinks = 18;
  for (let i = 0; i < nLinks; i++) {
    const u = ((i / nLinks + phase * 0.1) % 1 + 1) % 1;
    const lx = A.lerp(-w * 0.44, w * 0.44, u);
    A.rrect(c, lx - 6, -5, 12, 6, 2, trackCol, P.ink, 1.5);
    A.rrect(c, lx - 6, -h - 1, 12, 6, 2, trackCol, P.ink, 1.5);
  }

  // Bánh chịu nặng (Road wheels)
  const span = w - r * 2.4;
  for (let i = 0; i < nWheels; i++) {
    const wx = -span / 2 + (nWheels > 1 ? (i / (nWheels - 1)) * span : 0);
    A.circle(c, wx, -r - 3, r * 0.78, P.olive, P.ink, LW);
    A.circle(c, wx, -r - 3, r * 0.3, P.oliveDark, P.ink, LWI);
  }
  // Bánh chủ động & bánh hướng dẫn ở hai đầu trên
  A.circle(c, -w / 2 + r * 0.85, -h * 0.62, r * 0.58, P.oliveLight, P.ink, LW);
  A.circle(c, w / 2 - r * 0.85, -h * 0.62, r * 0.58, P.oliveLight, P.ink, LW);
  c.restore();
}

// ── 1. Xe tải mui trần (Open Truck 1944) ────────────────────────────────────
export interface TruckOpts {
  x: number;
  y: number;
  s?: number;
  dir?: 1 | -1;
  view?: 'side' | 'top';
  wheelRot?: number;
  troopsAlive?: number; // 0..1: tỷ lệ lính còn ngồi thẳng
  hitP?: number; // 0..1: bị mảnh đạn đánh trúng
}

export function drawOpenTruck(c: CanvasRenderingContext2D, o: TruckOpts) {
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const view = o.view ?? 'side';
  const rot = o.wheelRot ?? 0;
  const alive = o.troopsAlive ?? 1;

  c.save();
  c.translate(o.x, o.y);
  c.scale(dir * s, s);

  if (view === 'top') {
    // Nhìn từ trên xuống: thùng xe hở thấy rõ 2 hàng lính ngồi
    A.rrect(c, -150, -52, 300, 104, 10, P.oliveDark, P.ink, LW);
    // Thùng chở lính hở
    A.rrect(c, -142, -44, 195, 88, 6, P.sand, P.ink, LWI);
    // Cabin + nắp capo
    A.rrect(c, 58, -46, 52, 92, 8, P.olive, P.ink, LW);
    A.rrect(c, 108, -40, 40, 80, 6, P.oliveLight, P.ink, LW);
    // Kính chắn gió
    A.rrect(c, 96, -38, 10, 76, 3, P.glass, P.ink, LWI);
    // 2 hàng lính bên trong thùng hở
    for (let i = 0; i < 4; i++) {
      const tx = -115 + i * 44;
      const deadTop = i / 4 >= alive;
      A.circle(c, tx, -24, 13, deadTop ? P.enemy : P.olive, P.ink, LWI);
      A.circle(c, tx, 24, 13, deadTop ? P.enemy : P.olive, P.ink, LWI);
    }
    c.restore();
    return;
  }

  // SIDE VIEW: gốc tại mặt đất y=0
  // Khung gầm
  A.rrect(c, -155, -62, 305, 18, 4, P.dark, P.ink, LW);
  // Sàn thùng gỗ/thép
  A.rrect(c, -155, -76, 198, 16, 3, P.sand, P.ink, LW);

  // Hàng lính ngồi lộ hoàn toàn từ thắt lưng trở lên trong thùng mui trần
  for (let i = 0; i < 5; i++) {
    const sx = -128 + i * 38;
    const isHit = i / 5 >= alive;
    R.rig(c, {
      x: sx,
      y: -74,
      s: 0.78,
      dir: 1,
      skin: 'ally',
      lie: isHit ? 'dead' : null,
      weapon: 'rifle',
    });
  }

  // Thành thùng lửng phía dưới ngực lính (chứng tỏ không có giáp che thân trên và đầu)
  A.rrect(c, -155, -98, 198, 24, 3, P.olive, P.ink, LW);
  for (let i = 0; i < 5; i++) {
    const px = -135 + i * 42;
    A.line(c, [[px, -98], [px, -74]], P.oliveDark, LWI);
  }
  // Khung xương bạt trống rỗng phía trên
  for (let i = 0; i < 3; i++) {
    const bx = -135 + i * 82;
    c.beginPath();
    c.moveTo(bx, -98);
    c.lineTo(bx, -162);
    c.lineTo(bx + 22, -166);
    c.strokeStyle = P.ink2;
    c.lineWidth = LWI;
    c.stroke();
  }

  // Cabin lái & mũi xe
  A.poly(
    c,
    [
      [43, -58],
      [43, -142],
      [96, -142],
      [110, -108],
      [152, -102],
      [152, -58],
    ],
    P.olive,
    P.ink,
    LW,
  );
  // Cửa sổ cabin
  A.poly(
    c,
    [
      [52, -134],
      [90, -134],
      [100, -108],
      [52, -108],
    ],
    P.glass,
    P.ink,
    LWI,
  );

  // Bánh xe trước và cụm bánh đôi sau
  drawWheelSide(c, -105, -36, 36, rot);
  drawWheelSide(c, -32, -36, 36, rot);
  drawWheelSide(c, 112, -36, 36, rot);

  c.restore();
}

// ── 2. Xe bán xích (Half-Track M3 1944 — hở nóc) ────────────────────────────
export interface HalfTrackOpts {
  x: number;
  y: number;
  s?: number;
  dir?: 1 | -1;
  view?: 'side' | 'top';
  phase?: number;
  troopsAlive?: number;
}

export function drawHalfTrack(c: CanvasRenderingContext2D, o: HalfTrackOpts) {
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const view = o.view ?? 'side';
  const ph = o.phase ?? 0;
  const alive = o.troopsAlive ?? 1;

  c.save();
  c.translate(o.x, o.y);
  c.scale(dir * s, s);

  if (view === 'top') {
    A.rrect(c, -155, -52, 310, 104, 8, P.olive, P.ink, LW);
    // Khoang sau hở nóc
    A.rrect(c, -142, -40, 185, 80, 4, P.oliveDark, P.ink, LWI);
    for (let i = 0; i < 4; i++) {
      const tx = -115 + i * 42;
      const deadTop = i / 4 >= alive;
      A.circle(c, tx, -22, 12, deadTop ? P.enemy : P.oliveLight, P.ink, LWI);
      A.circle(c, tx, 22, 12, deadTop ? P.enemy : P.oliveLight, P.ink, LWI);
    }
    c.restore();
    return;
  }

  // Lính lộ vai và đầu trên mép thành xe bán xích hở nóc
  for (let i = 0; i < 4; i++) {
    const sx = -120 + i * 38;
    const isHit = i / 4 >= alive;
    R.rig(c, {
      x: sx,
      y: -72,
      s: 0.78,
      dir: 1,
      skin: 'ally',
      lie: isHit ? 'dead' : null,
      weapon: 'rifle',
    });
  }

  // Thân bọc thép mỏng nhưng hở hoàn toàn phần nóc (-112)
  A.poly(
    c,
    [
      [-155, -52],
      [-148, -112],
      [62, -112],
      [84, -126],
      [104, -104],
      [158, -98],
      [162, -52],
    ],
    P.olive,
    P.ink,
    LW,
  );
  // Cửa sổ hông thấp để thấy lính ngồi trong khoang không mui
  A.rrect(c, -138, -106, 175, 22, 3, P.bg2, P.ink, LWI);
  for (let i = 0; i < 4; i++) {
    const sx = -120 + i * 38;
    const isHit = i / 4 >= alive;
    if (!isHit) {
      A.rrect(c, sx - 8, -104, 16, 20, 3, P.olive, P.ink, 1.5);
    }
  }
  A.line(c, [[-146, -112], [62, -112]], P.oliveLight, LW);
  // Tấm chắn kính lái
  A.rrect(c, 66, -122, 22, 16, 3, P.oliveLight, P.ink, LWI);

  // Cụm xích phía sau + bánh lốp phía trước
  drawTrackAssembly(c, -68, -4, 155, 58, 4, ph);
  drawWheelSide(c, 118, -34, 34, ph);

  c.restore();
}

// ── 3. Pháo tự hành M7 Priest biến đổi thành Kangaroo APC ───────────────────
export interface KangarooOpts {
  x: number;
  y: number;
  s?: number;
  dir?: 1 | -1;
  view?: 'side' | 'cutaway' | 'top';
  phase?: number;
  gunRemoved?: number; // 0 = còn pháo 105mm, 1 = đã cắt rời và nhấc đi
  racksRemoved?: number; // 0 = còn giá đạn, 1 = đã tháo bỏ
  benchesIn?: number; // 0 = chưa có ghế/lính, 1 = đã lắp ghế băng & lính ngồi thấp trong thành thép dày
}

export function drawKangaroo(c: CanvasRenderingContext2D, o: KangarooOpts) {
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const view = o.view ?? 'side';
  const ph = o.phase ?? 0;
  const gunRem = A.clamp01(o.gunRemoved ?? 1);
  const rackRem = A.clamp01(o.racksRemoved ?? 1);
  const benchIn = A.clamp01(o.benchesIn ?? 1);

  c.save();
  c.translate(o.x, o.y);
  c.scale(dir * s, s);

  if (view === 'top') {
    // Khung xích
    A.rrect(c, -165, -78, 330, 26, 6, P.dark, P.ink, LW);
    A.rrect(c, -165, 52, 330, 26, 6, P.dark, P.ink, LW);
    // Thân thép dày
    A.rrect(c, -155, -62, 310, 124, 12, P.olive, P.ink, LW);
    // Khoang trong
    A.rrect(c, -95, -48, 190, 96, 6, P.oliveDark, P.ink, LWI);
    if (benchIn > 0.1) {
      A.withA(c, benchIn, () => {
        A.rrect(c, -85, -42, 170, 18, 4, P.sand, P.ink, LWI);
        A.rrect(c, -85, 24, 170, 18, 4, P.sand, P.ink, LWI);
        for (let i = 0; i < 4; i++) {
          A.circle(c, -60 + i * 40, -28, 12, P.oliveLight, P.ink, LWI);
          A.circle(c, -60 + i * 40, 28, 12, P.oliveLight, P.ink, LWI);
        }
      });
    }
    c.restore();
    return;
  }

  // Cụm xích Sherman M4
  drawTrackAssembly(c, 0, -4, 330, 74, 6, ph);

  // Thân dưới bọc thép dày
  A.poly(
    c,
    [
      [-168, -68],
      [-152, -138],
      [135, -138],
      [172, -96],
      [158, -68],
    ],
    P.oliveDark,
    P.ink,
    LW,
  );

  // Nếu còn pháo 105mm (trước hoặc đang bị cắt bỏ)
  if (gunRem < 0.99) {
    const liftX = gunRem * 90;
    const liftY = -gunRem * 160;
    const rotGun = -gunRem * 0.35;
    A.withA(c, 1 - gunRem * 0.85, () => {
      c.save();
      c.translate(75 + liftX, -145 + liftY);
      c.rotate(rotGun);
      // Bệ pháo & lá chắn
      A.rrect(c, -28, -32, 54, 42, 6, P.olive, P.ink, LW);
      // Nòng lựu pháo 105mm
      A.capsule(c, [10, -14], [135, -34], 18, P.slate, P.ink, LW);
      A.rrect(c, 126, -44, 18, 22, 3, P.dark, P.ink, LWI);
      c.restore();
    });
  }

  // Giá đạn pháo (Ammo racks) đang bị rút ra
  if (rackRem < 0.99) {
    const liftR = -rackRem * 130;
    A.withA(c, 1 - rackRem, () => {
      c.save();
      c.translate(-35, -125 + liftR);
      A.rrect(c, -48, -36, 96, 44, 4, P.slate, P.ink, LW);
      for (let i = 0; i < 5; i++) {
        A.rrect(c, -38 + i * 17, -30, 10, 32, 3, P.amber, P.ink, 1.5);
      }
      c.restore();
    });
  }

  // Ghế băng & bộ binh ngồi thấp an toàn trong thành thép Kangaroo (khi không phải cutaway)
  if (benchIn > 0.01 && view !== 'cutaway') {
    A.withA(c, benchIn, () => {
      const dropY = (1 - benchIn) * -90;
      c.save();
      c.translate(0, dropY);
      // Ghế băng dài
      A.rrect(c, -118, -110, 185, 14, 4, P.sand, P.ink, LWI);
      for (let i = 0; i < 5; i++) {
        const sx = -102 + i * 38;
        // Lính ngồi thấp dưới mép giáp trên (-174)
        A.rrect(c, sx - 10, -142, 20, 34, 6, P.olive, P.ink, 2);
        A.circle(c, sx, -152, 9, P.skin, P.ink, 2);
        c.beginPath();
        c.arc(sx, -154, 10, Math.PI, 0);
        c.closePath();
        c.fillStyle = P.oliveDark;
        c.fill();
        c.strokeStyle = P.ink;
        c.lineWidth = 2;
        c.stroke();
      }
      c.restore();
    });
  }

  // Thành thép cao bao quanh khoang (Cutaway mở 1 cửa sổ để thấy ghế & lính bên trong)
  if (view === 'cutaway') {
    A.poly(
      c,
      [
        [-152, -138],
        [-144, -176],
        [118, -176],
        [135, -138],
      ],
      P.olive,
      P.ink,
      LW,
    );
    // Cửa sổ mặt cắt cho thấy lòng thùng thép sâu
    A.rrect(c, -126, -166, 205, 58, 6, P.paper, P.ink, LWI);
    // Giá đạn pháo (Ammo racks) bên trong lòng xe trước/đang khi bị rút ra
    if (rackRem < 0.99) {
      const liftR = -rackRem * 130;
      A.withA(c, 1 - rackRem, () => {
        c.save();
        c.translate(-25, -118 + liftR);
        A.rrect(c, -52, -40, 104, 42, 4, P.slate, P.ink, LW);
        for (let i = 0; i < 5; i++) {
          A.rrect(c, -42 + i * 18, -34, 11, 32, 3, P.amber, P.ink, 1.5);
        }
        c.restore();
      });
    }
    // Vẽ ghế & lính nằm gọn bên dưới mép giáp (-176)
    if (benchIn > 0.01) {
      A.withA(c, benchIn, () => {
        const dropY = (1 - benchIn) * -80;
        c.save();
        c.translate(0, dropY);
        A.rrect(c, -116, -118, 185, 10, 3, P.sand, P.ink, LWI);
        for (let i = 0; i < 5; i++) {
          const sx = -98 + i * 38;
          A.rrect(c, sx - 9, -144, 18, 26, 5, P.olive, P.ink, 2);
          A.circle(c, sx, -152, 8, P.skin, P.ink, 2);
          c.beginPath();
          c.arc(sx, -154, 9.5, Math.PI, 0);
          c.closePath();
          c.fillStyle = P.oliveDark;
          c.fill();
          c.strokeStyle = P.ink;
          c.lineWidth = 2;
          c.stroke();
        }
        c.restore();
      });
    }
    // Tấm thép hàn bịt kín lỗ pháo phía trước
    if (gunRem > 0.5) {
      A.withA(c, (gunRem - 0.5) * 2, () => {
        A.rrect(c, 92, -176, 30, 38, 4, P.oliveLight, P.ink, LW);
      });
    }
  } else {
    // Side view đầy đủ thành thép cao che kín đầu lính
    A.poly(
      c,
      [
        [-152, -138],
        [-144, -174],
        [120, -174],
        [135, -138],
      ],
      P.olive,
      P.ink,
      LW,
    );
    // Nét gân thép dày
    A.line(c, [[-144, -174], [120, -174]], P.oliveLight, LW + 1);
  }

  c.restore();
}

// ── 4. Xe tăng chủ lực (MBT) & Xe chiến đấu bộ binh (IFV có tháp pháo + giỏ) ─
export interface CombatVehOpts {
  x: number;
  y: number;
  s?: number;
  dir?: 1 | -1;
  kind: 'mbt' | 'ifv';
  view?: 'side' | 'cutaway' | 'top';
  phase?: number;
}

export function drawCombatVehicle(c: CanvasRenderingContext2D, o: CombatVehOpts) {
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const view = o.view ?? 'side';
  const ph = o.phase ?? 0;

  c.save();
  c.translate(o.x, o.y);
  c.scale(dir * s, s);

  if (view === 'top') {
    if (o.kind === 'mbt') {
      A.rrect(c, -185, -86, 370, 172, 12, P.oliveDark, P.ink, LW);
      A.rrect(c, -165, -66, 330, 132, 10, P.olive, P.ink, LW);
      A.poly(
        c,
        [
          [-85, -56],
          [55, -48],
          [85, 0],
          [55, 48],
          [-85, 56],
        ],
        P.oliveLight,
        P.ink,
        LW,
      );
      A.capsule(c, [65, 0], [245, 0], 16, P.slate, P.ink, LW);
    } else {
      // IFV top view (dùng để so sánh mặt cắt ngang khoang lính với APC)
      A.rrect(c, -175, -82, 350, 164, 12, P.oliveDark, P.ink, LW);
      // Lòng xe mở mặt cắt ngang
      A.rrect(c, -155, -64, 310, 128, 8, P.paper, P.ink, LW);
      // Khoang động cơ trước bên phải
      A.rrect(c, 55, -58, 92, 72, 6, P.slate, P.ink, LWI);
      // Giỏ tháp pháo lớn (Turret ring / basket) choán chính giữa lòng xe!
      A.circle(c, -10, 0, 56, P.amber, P.ink, LW);
      A.circle(c, -10, 0, 42, P.oliveLight, P.ink, LWI);
      A.capsule(c, [15, 0], [135, 0], 12, P.dark, P.ink, LW);
      // Chỉ nhét được 6 lính chật chội quanh giỏ tháp pháo
      const seats: A.Pt[] = [
        [-132, -42],
        [-98, -42],
        [-64, -42],
        [-132, 42],
        [-98, 42],
        [-64, 42],
      ];
      for (const [sx, sy] of seats) {
        A.circle(c, sx, sy, 13, P.olive, P.ink, LWI);
      }
    }
    c.restore();
    return;
  }

  // SIDE / CUTAWAY VIEW
  drawTrackAssembly(c, 0, -4, 350, 72, 6, ph);

  if (o.kind === 'mbt') {
    // Thân thấp dày + giáp phức hợp dày ở mũi
    A.poly(
      c,
      [
        [-180, -68],
        [-170, -122],
        [145, -122],
        [192, -88],
        [165, -68],
      ],
      P.olive,
      P.ink,
      LW,
    );
    // Khối giáp mũi cực dày
    A.poly(
      c,
      [
        [115, -122],
        [145, -122],
        [192, -88],
        [165, -68],
        [115, -68],
      ],
      P.slate,
      P.ink,
      LW,
    );
    // Tháp pháo lớn + pháo 120mm dài
    A.poly(
      c,
      [
        [-95, -122],
        [-75, -172],
        [68, -172],
        [105, -142],
        [82, -122],
      ],
      P.oliveLight,
      P.ink,
      LW,
    );
    A.capsule(c, [95, -148], [285, -152], 16, P.slate, P.ink, LW);
  } else {
    // IFV (ví dụ Bradley/Warrior): có tháp pháo 30mm và giỏ tháp pháo ăn sâu xuống sàn
    A.poly(
      c,
      [
        [-172, -68],
        [-165, -142],
        [118, -142],
        [176, -98],
        [160, -68],
      ],
      P.olive,
      P.ink,
      LW,
    );
    // Tháp pháo lớn trên nóc
    A.poly(
      c,
      [
        [-58, -142],
        [-42, -188],
        [48, -188],
        [72, -156],
        [58, -142],
      ],
      P.oliveLight,
      P.ink,
      LW,
    );
    // Pháo tự động 30mm
    A.capsule(c, [64, -166], [168, -168], 10, P.dark, P.ink, LW);

    if (view === 'cutaway') {
      // Lòng xe bị chia cắt bởi giỏ tháp pháo sâu (Deep turret basket)
      A.rrect(c, -152, -134, 255, 60, 6, P.paper, P.ink, LWI);
      // Giỏ tháp pháo choán giữa khoang
      A.rrect(c, -52, -142, 104, 68, 4, P.amber, P.ink, LW);
      A.line(c, [[-32, -142], [-32, -74]], P.ink, LWI);
      A.line(c, [[32, -142], [32, -74]], P.ink, LWI);
      // Chỉ còn chỗ hẹp phía sau cho 3 lính ngồi chật
      for (let i = 0; i < 3; i++) {
        const lx = -132 + i * 26;
        A.rrect(c, lx - 8, -112, 16, 32, 4, P.olive, P.ink, 2);
        A.circle(c, lx, -120, 8, P.skin, P.ink, 2);
      }
    }
  }

  c.restore();
}

// ── 5. Xe bọc thép bánh xích M113 ("Hộp giày nhôm" có bửng sau lớn) ──────────
export interface M113Opts {
  x: number;
  y: number;
  s?: number;
  dir?: 1 | -1;
  view?: 'side' | 'cutaway' | 'top';
  phase?: number;
  rampOpen?: number; // 0 = đóng, 1 = hạ sát đất làm cầu dẫn
  trackWear?: number; // 0..1: xích mòn khi chạy đường nhựa
}

export function drawM113(c: CanvasRenderingContext2D, o: M113Opts) {
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const view = o.view ?? 'side';
  const ph = o.phase ?? 0;
  const ramp = A.clamp01(o.rampOpen ?? 0);

  c.save();
  c.translate(o.x, o.y);
  c.scale(dir * s, s);

  if (view === 'top') {
    A.rrect(c, -155, -80, 310, 160, 10, P.oliveDark, P.ink, LW);
    A.rrect(c, -145, -64, 290, 128, 6, P.olive, P.ink, LW);
    // Khoang rỗng chữ nhật rộng rãi (clean rectangular cavern)
    A.rrect(c, -135, -54, 210, 108, 4, P.paper, P.ink, LWI);
    // 2 hàng ghế băng dọc vách cho 10-12 lính
    A.rrect(c, -130, -50, 195, 20, 3, P.sand, P.ink, LWI);
    A.rrect(c, -130, 30, 195, 20, 3, P.sand, P.ink, LWI);
    for (let i = 0; i < 5; i++) {
      const sx = -114 + i * 38;
      A.circle(c, sx, -34, 12, P.olive, P.ink, LWI);
      A.circle(c, sx, 34, 12, P.olive, P.ink, LWI);
    }
    // Trang bị ở lối đi giữa: tên lửa chống tăng, đạn cối, cáng, can nước
    A.rrect(c, -95, -10, 56, 20, 3, P.oliveLight, P.ink, LWI);
    A.rrect(c, -25, -10, 48, 20, 3, P.amber, P.ink, LWI);
    c.restore();
    return;
  }

  // Bánh xích 5 bánh chịu nặng đặc trưng của M113
  drawTrackAssembly(c, 0, -4, 295, 68, 5, ph, o.trackWear ?? 0);

  // Thân "hộp giày nhôm" vuông vức, mũi vát phẳng
  A.poly(
    c,
    [
      [-148, -62],
      [-148, -162],
      [96, -162],
      [152, -106],
      [138, -62],
    ],
    P.olive,
    P.ink,
    LW,
  );
  // Gờ chắn bùn
  A.line(c, [[-150, -66], [142, -66]], P.oliveLight, LW);

  // Súng máy nhỏ trên nóc
  A.rrect(c, 32, -174, 28, 12, 3, P.oliveLight, P.ink, LWI);
  A.capsule(c, [48, -180], [92, -180], 6, P.dark, P.ink, LWI);

  if (view === 'cutaway') {
    // Mở vách hông thấy khoang chữ nhật rộng thoáng từ sau ra trước
    A.rrect(c, -138, -152, 215, 82, 6, P.paper, P.ink, LWI);
    // Hàng ghế & tiểu đội + thùng đạn bên trong
    A.rrect(c, -130, -92, 180, 12, 3, P.sand, P.ink, LWI);
    for (let i = 0; i < 5; i++) {
      const sx = -112 + i * 34;
      A.rrect(c, sx - 8, -124, 16, 32, 4, P.olive, P.ink, 2);
      A.circle(c, sx, -134, 8, P.skin, P.ink, 2);
      c.beginPath();
      c.arc(sx, -136, 9, Math.PI, 0);
      c.closePath();
      c.fillStyle = P.oliveDark;
      c.fill();
      c.stroke();
    }
    // Chồng thùng đạn & trang bị
    A.rrect(c, 32, -116, 36, 44, 4, P.amber, P.ink, LWI);
    A.line(c, [[32, -94], [68, -94]], P.ink, LWI);
  }

  // Bửng sau lớn (Rear ramp) xoay quanh bản lề dưới (-148, -64)
  c.save();
  c.translate(-148, -64);
  const rampAng = A.lerp(0, -Math.PI * 0.43, ramp); // Mở ngửa ra phía sau bên trái
  c.rotate(rampAng);
  A.rrect(c, -10, -96, 14, 96, 3, P.oliveLight, P.ink, LW);
  c.restore();

  c.restore();
}

// ── 6. Xe đầu kéo chở tăng/thiết giáp (Heavy Flatbed Truck) ─────────────────
export function drawFlatbedTruck(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  wheelRot = 0,
  withM113 = true,
) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);

  // Rơ-moóc sàn thấp dài
  A.poly(
    c,
    [
      [-320, -48],
      [-290, -64],
      [90, -64],
      [115, -96],
      [175, -96],
      [175, -72],
      [95, -48],
    ],
    P.slate,
    P.ink,
    LW,
  );
  // Đầu kéo hạng nặng
  A.poly(
    c,
    [
      [115, -52],
      [115, -168],
      [205, -168],
      [220, -122],
      [272, -114],
      [272, -52],
    ],
    P.oliveDark,
    P.ink,
    LW,
  );
  A.rrect(c, 162, -156, 44, 32, 4, P.glass, P.ink, LWI);

  // Dàn bánh rơ-moóc và đầu kéo
  for (const wx of [-255, -200, -145, 140, 192, 245]) {
    drawWheelSide(c, wx, -30, 30, wheelRot);
  }

  // Chiếc M113 nằm trên lưng rơ-moóc
  if (withM113) {
    drawM113(c, { x: -95, y: -64, s: 0.78, dir: 1, view: 'side', phase: 0 });
    // Dây xích chằng buộc
    A.line(c, [[-220, -64], [-195, -110]], P.amber, LW);
    A.line(c, [[25, -64], [5, -110]], P.amber, LW);
  }

  c.restore();
}

// ── 7. Xe bọc thép 8 bánh hiện đại (8x8 APC: Stryker / Boxer / VBCI) ────────
export interface APC8x8Opts {
  x: number;
  y: number;
  s?: number;
  dir?: 1 | -1;
  view?: 'side' | 'cutaway' | 'top' | 'front';
  wheelRot?: number;
  tireFlat?: number; // 0..1: CTIS xả hơi làm bẹt 8 lốp
  rwsType?: 'rws' | 'openGunner' | 'none';
  rwsAim?: number; // góc ngẩng nòng súng RWS
  rampOpen?: number; // 0..1: mở bửng sau
  trimBoard?: number; // 0..1: tấm chắn sóng mũi xe khi bơi
  waterJet?: number; // 0..1: luồng phụt nước ở đuôi
  hullShape?: 'v' | 'doubleV' | 'flat'; // cho góc nhìn front chống mìn
  wheelBreakP?: number; // 0..1: cụm bánh văng ra khi trúng mìn lớn
  podLiftY?: number; // >0: nhấc module sau lên (dành cho Boxer)
  podRole?: 'troop' | 'ambulance' | 'command' | 'mortar' | 'ew' | 'hospital';
  mortarDoorsOpen?: number; // 0..1
  sideHitP?: number; // 0..1: bị RPG bắn xuyên hông
}

export function drawAPC8x8(c: CanvasRenderingContext2D, o: APC8x8Opts) {
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const view = o.view ?? 'side';
  const rot = o.wheelRot ?? 0;
  const flat = o.tireFlat ?? 0;
  const rws = o.rwsType ?? 'rws';
  const aim = o.rwsAim ?? 0;
  const ramp = A.clamp01(o.rampOpen ?? 0);
  const trim = A.clamp01(o.trimBoard ?? 0);
  const jet = A.clamp01(o.waterJet ?? 0);
  const podLift = o.podLiftY ?? 0;
  const role = o.podRole ?? 'troop';

  c.save();
  c.translate(o.x, o.y);
  c.scale(dir * s, s);

  // ── GÓC FRONT (Mặt cắt trực diện để so sánh đáy phẳng vs đáy chữ V chống mìn)
  if (view === 'front') {
    const shape = o.hullShape ?? 'v';
    const brk = A.clamp01(o.wheelBreakP ?? 0);
    const rideH = shape === 'flat' ? -86 : -124; // Xe 8x8 gầm cao hơn hẳn xe đáy phẳng cũ

    // Cụm bánh trái & phải (có thể văng ra khi nổ mìn để xả năng lượng)
    c.save();
    c.translate(-128 - brk * 135, -48 - brk * 55);
    c.rotate(-brk * 0.65);
    A.rrect(c, -22, -48, 44, 96, 10, P.dark, P.ink, LW);
    A.line(c, [[22, 0], [52, -18]], P.slate, LW + 1);
    c.restore();

    c.save();
    c.translate(128 + brk * 135, -48 - brk * 45);
    c.rotate(brk * 0.55);
    A.rrect(c, -22, -48, 44, 96, 10, P.dark, P.ink, LW);
    A.line(c, [[-22, 0], [-52, -18]], P.slate, LW + 1);
    c.restore();

    // Thân mặt cắt ngang
    if (shape === 'flat') {
      // Đáy phẳng cũ: hứng trọn xung nổ từ dưới lên, sàn xe cong vồng lên đập vào chân lính
      const buckle = brk * 28;
      A.poly(
        c,
        [
          [-108, rideH],
          [-116, rideH - 118],
          [116, rideH - 118],
          [108, rideH],
          [0, rideH - buckle],
        ],
        P.olive,
        P.ink,
        LW,
      );
      A.poly(
        c,
        [
          [-94, rideH - 10],
          [-98, rideH - 106],
          [98, rideH - 106],
          [94, rideH - 10],
          [0, rideH - 10 - buckle],
        ],
        P.paper,
        P.ink,
        LWI,
      );
      // 2 người lính bên trong bị sàn bật tung
      for (const sx of [-48, 48]) {
        R.rig(c, {
          x: sx,
          y: rideH - 12 - buckle * 0.8,
          s: 0.72,
          dir: sx < 0 ? 1 : -1,
          skin: 'ally',
          lie: brk > 0.4 ? 'dead' : null,
        });
      }
    } else {
      // Đáy chữ V hoặc chữ V kép (V / Double-V hull) gầm cao
      const vTipY = rideH + 36;
      const pts: A.Pt[] =
        shape === 'doubleV'
          ? [
              [-112, rideH - 14],
              [-102, rideH - 132],
              [102, rideH - 132],
              [112, rideH - 14],
              [54, vTipY],
              [0, rideH + 8],
              [-54, vTipY],
            ]
          : [
              [-114, rideH - 14],
              [-102, rideH - 132],
              [102, rideH - 132],
              [114, rideH - 14],
              [0, vTipY],
            ];
      A.poly(c, pts, P.olive, P.ink, LW);
      // Khoang lính nguyên vẹn phía trên lớp đáy chữ V dày
      A.rrect(c, -88, rideH - 118, 176, 94, 8, P.paper, P.ink, LW);
      // Ghế treo chống mìn hai bên vách
      for (const sx of [-52, 52]) {
        R.rig(c, {
          x: sx,
          y: rideH - 26,
          s: 0.72,
          dir: sx < 0 ? 1 : -1,
          skin: 'ally',
        });
      }
    }
    c.restore();
    return;
  }

  // ── GÓC TOP (Nhìn từ trên xuống: thấy rõ 8 bánh, khoang động cơ trước & bửng sau rộng)
  if (view === 'top') {
    // 8 bánh xe chia 2 cụm (4 trước, 4 sau)
    const wheelXs = [-142, -88, 62, 116];
    for (const wx of wheelXs) {
      A.rrect(c, wx - 22, -96, 44, 22, 6, P.dark, P.ink, LW);
      A.rrect(c, wx - 22, 74, 44, 22, 6, P.dark, P.ink, LW);
    }
    // Chân vịt phụt nước (Water jets) ở đuôi khi bơi
    if (jet > 0.01) {
      for (const wy of [-44, 44]) {
        A.circle(c, -182, wy, 12, P.slate, P.ink, LWI);
        for (let i = 0; i < 3; i++) {
          const d = 18 + ((rot * 25 + i * 18) % 52);
          A.line(c, [[-192, wy], [-192 - d * jet, wy + (i - 1) * 8]], P.sky, 4);
        }
      }
    }
    // Thân giáp đa diện
    A.poly(
      c,
      [
        [-180, -74],
        [135, -74],
        [185, -42],
        [185, 42],
        [135, 74],
        [-180, 74],
      ],
      P.olive,
      P.ink,
      LW,
    );
    // Mặt cắt ngang: Động cơ đặt ở mũi phải + Khoang lính rộng phía sau + Bửng sau
    A.rrect(c, 58, 6, 98, 56, 6, P.slate, P.ink, LW); // Động cơ phía trước (Western front engine)
    A.rrect(c, -168, -60, 214, 120, 6, P.paper, P.ink, LWI); // Khoang lính rộng mở thẳng ra đuôi
    // 2 hàng ghế dọc vách
    A.rrect(c, -158, -54, 194, 20, 4, P.sand, P.ink, LWI);
    A.rrect(c, -158, 34, 194, 20, 4, P.sand, P.ink, LWI);
    for (let i = 0; i < 5; i++) {
      const sx = -140 + i * 38;
      A.circle(c, sx, -38, 12, P.olive, P.ink, LWI);
      A.circle(c, sx, 38, 12, P.olive, P.ink, LWI);
    }
    // Bửng sau rộng (Wide rear ramp)
    if (ramp > 0.05) {
      A.rrect(c, -180 - 52 * ramp, -48, 52 * ramp, 96, 4, P.oliveLight, P.ink, LW);
    }
    c.restore();
    return;
  }

  // ── GÓC SIDE & CUTAWAY (Gốc mặt đất y = 0, thân xe cao trên 8 bánh lớn) ───
  const wheelXs = [-142, -82, 58, 118];

  // Khung gầm chữ V dưới bụng (V-shaped lower hull)
  A.poly(
    c,
    [
      [-172, -62],
      [-145, -44],
      [125, -44],
      [168, -68],
      [168, -88],
      [-172, -88],
    ],
    P.oliveDark,
    P.ink,
    LW,
  );

  // Phần đầu xe cố định (Base unit: mũi + khoang lái + động cơ trước)
  A.poly(
    c,
    [
      [-180, -68],
      [-180, -96],
      [22, -96],
      [22, -168],
      [118, -168],
      [192, -116],
      [176, -68],
    ],
    P.olive,
    P.ink,
    LW,
  );
  // Kính tiềm vọng khoang lái
  A.rrect(c, 88, -164, 26, 12, 3, P.glass, P.ink, LWI);

  // Module khoang sau (Mission pod — có thể nhấc lên bằng cần cẩu với Boxer khi podLift > 0)
  c.save();
  c.translate(0, -podLift);

  // Vỏ ngoài khoang sau
  A.poly(
    c,
    [
      [-188, -92],
      [-176, -172],
      [22, -172],
      [22, -92],
    ],
    role === 'ambulance' || role === 'hospital' ? P.oliveLight : P.olive,
    P.ink,
    LW,
  );

  // Khóa chốt module hạng nặng (Heavy locks ở đáy pod)
  for (const lx of [-152, -88, -18]) {
    A.rrect(c, lx - 8, -98, 16, 10, 2, P.amber, P.ink, 1.5);
  }

  // Nội thất bên trong khoang khi ở chế độ cutaway hoặc theo vai trò (role)
  if (view === 'cutaway') {
    A.rrect(c, -168, -162, 180, 64, 6, P.paper, P.ink, LWI);

    if (role === 'troop') {
      // Ghế ngồi + xạ thủ RWS cầm tay cầm điều khiển nhìn màn hình bên trong giáp
      for (let i = 0; i < 3; i++) {
        const sx = -146 + i * 38;
        A.rrect(c, sx - 8, -132, 16, 32, 4, P.olive, P.ink, 2);
        A.circle(c, sx, -142, 8, P.skin, P.ink, 2);
        c.beginPath();
        c.arc(sx, -144, 9, Math.PI, 0);
        c.closePath();
        c.fillStyle = P.oliveDark;
        c.fill();
        c.stroke();
      }
      // Trạm điều khiển của xạ thủ bên dưới trạm RWS
      A.rrect(c, -32, -132, 18, 32, 4, P.olive, P.ink, 2);
      A.circle(c, -23, -142, 8, P.skin, P.ink, 2);
      // Màn hình nhiệt (Screen) + tay cầm Joystick
      A.rrect(c, -2, -152, 18, 22, 3, P.dark, P.ink, 2);
      A.rrect(c, 1, -149, 12, 16, 2, P.sky, null, 0);
      A.line(c, [[-6, -120], [0, -132]], P.ink, 3);
      // Dây cáp tín hiệu nối lên trạm RWS trên nóc
      if (rws === 'rws') {
        A.line(c, [[8, -152], [12, -172]], P.sky, 3, [5, 4]);
      }
    } else if (role === 'ambulance' || role === 'hospital') {
      // Cáng cứu thương 2 tầng + đèn phẫu thuật + chữ thập đỏ
      A.rrect(c, -156, -148, 110, 10, 3, P.sand, P.ink, LWI);
      A.rrect(c, -156, -118, 110, 10, 3, P.sand, P.ink, LWI);
      // Thương binh nằm trên cáng
      A.rrect(c, -142, -156, 72, 10, 4, P.olive, P.ink, 1.5);
      A.circle(c, -62, -152, 7, P.skin, P.ink, 1.5);
      A.rrect(c, -142, -126, 72, 10, 4, P.olive, P.ink, 1.5);
      A.circle(c, -62, -122, 7, P.skin, P.ink, 1.5);
      // Tủ y tế & chữ thập
      A.rrect(c, -32, -156, 36, 52, 4, P.white, P.ink, LWI);
      A.rrect(c, -18, -144, 8, 26, 1, P.enemy, null, 0);
      A.rrect(c, -27, -135, 26, 8, 1, P.enemy, null, 0);
    } else if (role === 'command') {
      // Trạm chỉ huy ngập máy thông tin vô tuyến & bàn bản đồ
      A.rrect(c, -156, -156, 58, 52, 4, P.slate, P.ink, LWI);
      for (let r = 0; r < 3; r++) {
        A.rrect(c, -150, -150 + r * 15, 46, 10, 2, P.dark, P.ink, 1.5);
        A.circle(c, -112, -145 + r * 15, 3, P.sky, null, 0);
      }
      // Bàn màn hình tác chiến
      A.rrect(c, -86, -132, 68, 10, 2, P.oliveDark, P.ink, LWI);
      A.rrect(c, -76, -154, 48, 22, 3, P.sky, P.ink, LWI);
      // Cần ăng-ten cao trên nóc
      A.line(c, [[-140, -172], [-140, -245]], P.ink, 3);
      A.line(c, [[-110, -172], [-110, -230]], P.ink, 3);
    } else if (role === 'mortar') {
      // Cối hạng nặng 120mm bắn qua cửa nóc mở
      const md = A.clamp01(o.mortarDoorsOpen ?? 1);
      // Cửa nóc mở bung
      A.line(c, [[-145, -172], [-145 - 35 * md, -172 - 28 * md]], P.oliveLight, LW);
      A.line(c, [[-35, -172], [-35 + 35 * md, -172 - 28 * md]], P.oliveLight, LW);
      // Bệ xoay và nòng cối 120mm
      A.rrect(c, -125, -112, 70, 14, 3, P.slate, P.ink, LW);
      A.capsule(c, [-95, -114], [-52, -196], 16, P.dark, P.ink, LW);
      // Giá đạn cối 120mm dựng đứng
      for (let i = 0; i < 3; i++) {
        A.rrect(c, -22 + i * 11, -148, 8, 42, 3, P.amber, P.ink, 1.5);
      }
    } else if (role === 'ew') {
      // Xe tác chiến điện tử (Electronic warfare van) với cột ăng-ten vòm
      A.rrect(c, -156, -156, 160, 52, 4, P.dark, P.ink, LWI);
      A.rrect(c, -146, -146, 54, 32, 3, P.sky, P.ink, 1.5);
      A.rrect(c, -78, -146, 72, 32, 3, P.amber, P.ink, 1.5);
      // Cột radar/jammer nâng cao trên nóc
      A.rrect(c, -96, -232, 16, 60, 3, P.slate, P.ink, LW);
      A.ellipse(c, -88, -242, 34, 16, 0, P.oliveLight, P.ink, LW);
    }
  } else if (role === 'ambulance' || role === 'hospital') {
    // Dấu chữ thập ngoài thân xe cứu thương
    A.circle(c, -78, -132, 24, P.white, P.ink, LWI);
    A.rrect(c, -83, -148, 10, 32, 2, P.enemy, null, 0);
    A.rrect(c, -94, -137, 32, 10, 2, P.enemy, null, 0);
  }

  // Bửng sau mở
  c.save();
  c.translate(-188, -92);
  c.rotate(A.lerp(0, -Math.PI * 0.42, ramp));
  A.rrect(c, -10, -78, 12, 78, 3, P.oliveLight, P.ink, LW);
  c.restore();

  c.restore(); // Kết thúc nhóm pod (có thể nhấc)

  // ── VŨ KHÍ TRÊN NÓC: Xạ thủ đứng hở (Open gunner) vs Trạm RWS ────────────
  if (rws === 'openGunner' && podLift < 5) {
    // Xạ thủ truyền thống phải đứng lộ từ ngực trở lên trong ô cửa nóc, chỉ có tấm khiên nhỏ
    R.rig(c, {
      x: 12,
      y: -136,
      s: 0.78,
      dir: 1,
      skin: 'ally',
      weapon: null,
    });
    // Nắp cửa mở ra phía sau
    A.rrect(c, -22, -198, 8, 28, 2, P.oliveLight, P.ink, LWI);
    // Tấm khiên thép nhỏ phía trước ngực (Small steel shield)
    A.poly(
      c,
      [
        [34, -172],
        [44, -206],
        [52, -206],
        [42, -172],
      ],
      P.oliveLight,
      P.ink,
      LW,
    );
    // Súng máy hạng nặng gắn trên giá
    A.capsule(c, [24, -192], [88, -192 - aim * 25], 8, P.dark, P.ink, LW);
  } else if (rws === 'rws' && podLift < 5) {
    // Trạm vũ khí điều khiển từ xa (Remote Weapon Station - RWS)
    c.save();
    c.translate(18, -172);
    // Bệ xoay ổn định (Stabilized cradle)
    A.rrect(c, -22, -14, 44, 14, 4, P.oliveLight, P.ink, LW);
    A.poly(
      c,
      [
        [-14, -14],
        [-8, -46],
        [14, -46],
        [18, -14],
      ],
      P.olive,
      P.ink,
      LW,
    );
    // Cụm camera nhiệt ngày/đêm (Day/night thermal camera pod)
    A.rrect(c, -20, -40, 24, 18, 4, P.slate, P.ink, LW);
    A.circle(c, 2, -31, 6, P.sky, P.ink, 2);
    // Nòng súng máy hạng nặng / súng phóng lựu tự động xoay theo góc aim
    c.save();
    c.translate(6, -38);
    c.rotate(-aim);
    A.rrect(c, -16, -8, 32, 16, 3, P.dark, P.ink, LW);
    A.capsule(c, [14, 0], [74, 0], 7, P.dark, P.ink, LW);
    c.restore();
    c.restore();
  }

  // Tấm chắn sóng ở mũi xe (Trim board) khi bơi qua sông
  if (trim > 0.01) {
    c.save();
    c.translate(184, -112);
    c.rotate(A.lerp(0.5, -0.45, trim));
    A.rrect(c, 0, -6, 46, 8, 2, P.oliveLight, P.ink, LW);
    c.restore();
  }

  // Luồng nước phản lực ở đuôi xe (Twin water jets)
  if (jet > 0.01) {
    for (let i = 0; i < 4; i++) {
      const d = 22 + ((rot * 30 + i * 20) % 64);
      A.line(c, [[-188, -74], [-188 - d * jet, -74 + (i - 1.5) * 9]], P.sky, 4);
    }
  }

  // 8 bánh xe lớn (4 bánh bên hông nhìn thấy ở góc side)
  for (const wx of wheelXs) {
    drawWheelSide(c, wx, -44, 42, rot, flat);
  }

  // Vết nổ xuyên giáp hông khi trúng tên lửa chống tăng (Chương 5)
  if ((o.sideHitP ?? 0) > 0.01) {
    const hp = o.sideHitP!;
    F.explosion(c, -45, -125, 95, hp);
    F.smoke(c, -45, -135, hp * 2.5, 1.1);
  }

  c.restore();
}

// ── 8. Xe bọc thép Liên Xô BTR-80 (Động cơ sau, cửa hẹp giữa bánh 2 & 3) ───
export interface BTR80Opts {
  x: number;
  y: number;
  s?: number;
  dir?: 1 | -1;
  view?: 'side' | 'cutaway' | 'top';
  wheelRot?: number;
  sideHatchOpen?: number; // 0..1: cửa hông chật hẹp giữa bánh 2 và 3
  roofRiders?: number; // 0..1: lính leo lên ngồi trên nóc xe thay vì chui vào trong
}

export function drawBTR80(c: CanvasRenderingContext2D, o: BTR80Opts) {
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const view = o.view ?? 'side';
  const rot = o.wheelRot ?? 0;
  const hatch = A.clamp01(o.sideHatchOpen ?? 0);
  const riders = A.clamp01(o.roofRiders ?? 0);

  c.save();
  c.translate(o.x, o.y);
  c.scale(dir * s, s);

  if (view === 'top') {
    // 8 bánh xe
    const wheelXs = [-138, -78, 32, 92];
    for (const wx of wheelXs) {
      A.rrect(c, wx - 20, -92, 40, 20, 5, P.dark, P.ink, LW);
      A.rrect(c, wx - 20, 72, 40, 20, 5, P.dark, P.ink, LW);
    }
    // Thân hình thuyền nhọn mũi
    A.poly(
      c,
      [
        [-185, -62],
        [115, -72],
        [195, -28],
        [195, 28],
        [115, 72],
        [-185, 62],
      ],
      P.olive,
      P.ink,
      LW,
    );
    // Mặt cắt ngang: ĐỘNG CƠ NẰM Ở ĐUÔI XE (-175..-68), chặn mất lối ra phía sau!
    A.rrect(c, -172, -52, 104, 104, 6, P.enemyLight, P.ink, LW);
    // Khoang lính nằm kẹp ở giữa, phải chui ra bằng 2 khe cửa hẹp bên hông
    A.rrect(c, -58, -54, 145, 108, 6, P.paper, P.ink, LWI);
    // Cửa hông mở ra đúng kẽ giữa bánh thứ 2 và thứ 3
    if (hatch > 0.05) {
      A.line(c, [[-18, -72], [-18 - 22 * hatch, -104]], P.amber, LW);
      A.line(c, [[-18, 72], [-18 - 22 * hatch, 104]], P.amber, LW);
    }
    c.restore();
    return;
  }

  // SIDE / CUTAWAY VIEW
  const wheelXs = [-138, -78, 38, 98]; // Khoảng trống hẹp giữa bánh 2 (-78) và bánh 3 (+38)

  // Thân hình thuyền thấp, đuôi vát chứa động cơ
  A.poly(
    c,
    [
      [-188, -74],
      [-164, -148],
      [96, -148],
      [152, -124],
      [196, -92],
      [162, -60],
      [-172, -60],
    ],
    P.olive,
    P.ink,
    LW,
  );

  // Tháp súng nhỏ hình nón cụt đặc trưng của BTR-80 ở phía trước
  A.poly(
    c,
    [
      [28, -148],
      [42, -176],
      [86, -176],
      [98, -148],
    ],
    P.oliveLight,
    P.ink,
    LW,
  );
  A.capsule(c, [92, -164], [148, -166], 6, P.dark, P.ink, LWI);

  if (view === 'cutaway') {
    // Khối động cơ lớn đặt ở đuôi xe (Engine at the back) tô màu nhấn để thấy rõ nó bít cửa sau
    A.rrect(c, -168, -140, 96, 72, 6, P.enemyLight, P.ink, LW);
    // Quạt tản nhiệt & xi-lanh động cơ
    for (let i = 0; i < 3; i++) {
      A.rrect(c, -156 + i * 28, -130, 20, 48, 3, P.slate, P.ink, LWI);
    }
    // Khoang lính chật ở giữa
    A.rrect(c, -62, -140, 138, 72, 6, P.paper, P.ink, LWI);
  }

  // Cửa hông chật hẹp (Cramped side hatch wedged between the middle wheels: x = -20)
  A.rrect(c, -42, -136, 44, 54, 4, hatch > 0.1 ? P.dark : P.oliveLight, P.ink, LW);
  if (hatch > 0.1) {
    // Cánh cửa mở gập xuống ngay sát bánh xe
    A.rrect(c, -42, -82, 44, 24 * hatch, 3, P.oliveLight, P.ink, LWI);
    // Người lính phải bò/vắt người qua khe bánh xe
    R.rig(c, {
      x: -20,
      y: -48,
      s: 0.72,
      dir: 1,
      skin: 'ally',
      aim: -0.4,
    });
  }

  // Lính chọn ngồi hẳn lên nóc xe (Ride on the roof) thay vì ngồi trong bụng xe
  if (riders > 0.05) {
    A.withA(c, riders, () => {
      for (let i = 0; i < 4; i++) {
        const rx = -132 + i * 36;
        R.rig(c, {
          x: rx,
          y: -148,
          s: 0.74,
          dir: i % 2 === 0 ? 1 : -1,
          skin: 'ally',
          weapon: 'rifle',
        });
      }
    });
  }

  // 8 bánh xe
  for (const wx of wheelXs) {
    drawWheelSide(c, wx, -42, 40, rot);
  }

  c.restore();
}

// ── 9. Mặt cắt kỹ thuật Lớp Giáp & Đạn (Chương 2) ──────────────────────────
export function drawAPFSDSDart(c: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // Thanh xuyên dưới cỡ có cánh ổn định (Armor-piercing fin-stabilized dart)
  A.poly(
    c,
    [
      [-110, -5],
      [75, -5],
      [115, 0],
      [75, 5],
      [-110, 5],
    ],
    P.dark,
    P.ink,
    LW,
  );
  // Cánh đuôi
  A.poly(
    c,
    [
      [-110, -5],
      [-130, -24],
      [-92, -5],
    ],
    P.slate,
    P.ink,
    LWI,
  );
  A.poly(
    c,
    [
      [-110, 5],
      [-130, 24],
      [-92, 5],
    ],
    P.slate,
    P.ink,
    LWI,
  );
  c.restore();
}

export function drawShellFragment(c: CanvasRenderingContext2D, x: number, y: number, s = 1, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  A.poly(
    c,
    [
      [-18, -10],
      [8, -14],
      [22, -2],
      [10, 14],
      [-14, 10],
    ],
    P.enemy,
    P.ink,
    LWI,
  );
  c.restore();
}

// ── 10. Drone & Đạn pháo thông minh (Chương 5) ──────────────────────────────
export function drawFPVDrone(c: CanvasRenderingContext2D, x: number, y: number, s = 1, t = 0) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // Khung chữ X + đầu đạn treo dưới
  A.line(c, [[-38, -12], [38, -12]], P.ink, LW);
  A.rrect(c, -16, -20, 32, 16, 4, P.enemy, P.ink, LWI);
  // Đầu đạn nhỏ bên dưới
  A.poly(c, [[-10, -4], [10, -4], [0, 22]], P.amber, P.ink, LWI);
  // Cánh quạt quay
  const w = 18 + Math.sin(t * 45) * 10;
  A.line(c, [[-38 - w, -18], [-38 + w, -18]], P.ink2, 3);
  A.line(c, [[38 - w, -18], [38 + w, -18]], P.ink2, 3);
  c.restore();
}

// ── 11. Nền đường / địa hình mặt cắt ngang (SIDE Ground) ────────────────────
export function drawSideGround(
  c: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  groundY = 0,
  kind: 'dirt' | 'paved' | 'mud' | 'bridge' | 'trench' = 'dirt',
) {
  // Lớp đất sâu
  A.rrect(c, x0, groundY, x1 - x0, 420, 0, P.bg2, null, 0);
  if (kind === 'paved') {
    A.rrect(c, x0, groundY - 10, x1 - x0, 16, 0, P.slate, P.ink, LW);
    A.line(c, [[x0, groundY - 2], [x1, groundY - 2]], P.white, 3, [28, 24]);
  } else if (kind === 'mud') {
    A.rrect(c, x0, groundY - 6, x1 - x0, 28, 0, P.sand, null, 0);
    A.line(c, [[x0, groundY], [x1, groundY]], P.ink, LW);
  } else {
    A.line(c, [[x0, groundY], [x1, groundY]], P.ink, LW);
  }
}
