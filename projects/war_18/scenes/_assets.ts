// scenes/_assets.ts — Toàn bộ vật thể, phương tiện, mặt cắt cơ khí, mục tiêu và nền của war_18.
// Tuân thủ code-video-2d: đường bao rõ (LINE.outer / LINE.inner), màu từ bảng P (scenes/shared/palette.ts),
// không gọi camera bên trong hàm asset, dùng save/restore cân bằng, tất định 100% theo tham số truyền vào.

import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';

export type ViewMode = 'side' | 'cutaway' | 'top' | 'front' | 'rear_axis';

// ── 1. NỀN & MÔI TRƯỜNG (SIDE / CUTAWAY / TOP) ───────────────────────────────

export interface EnvSideOpts {
  groundY?: number;
  showTrees?: boolean;
  scorchedX?: [number, number] | null;
  hideCanopyX?: number | null;
  clearZoneX?: [number, number] | null;
}

export function drawEnvSide(c: CanvasRenderingContext2D, cam: K.Cam, opts: EnvSideOpts = {}) {
  const gy = opts.groundY ?? 220;
  const v = K.view(cam, 500);
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);

  c.save();
  // Dải đồi mờ phía xa tạo chiều sâu không gian nhưng không gây nhiễu
  c.fillStyle = P.bg2;
  c.beginPath();
  c.moveTo(v.x0, gy);
  const step = 320;
  const startStep = Math.floor(v.x0 / step) * step;
  for (let x = startStep; x <= v.x1 + step; x += step) {
    const h = 28 + 22 * Math.sin(x * 0.0023) + 14 * Math.cos(x * 0.0051);
    c.lineTo(x, gy - h);
  }
  c.lineTo(v.x1 + step, gy);
  c.closePath();
  c.fill();

  // Lớp đất dưới mặt đất
  c.fillStyle = P.bg2;
  c.fillRect(v.x0, gy, v.x1 - v.x0, v.y1 - gy);
  c.fillStyle = P.light;
  c.fillRect(v.x0, gy + 18, v.x1 - v.x0, Math.max(0, v.y1 - gy - 18));

  // Vệt cỏ cháy xém sau loạt phóng (nếu có)
  if (opts.scorchedX) {
    const [sx0, sx1] = opts.scorchedX;
    A.rrect(c, sx0, gy - 5, sx1 - sx0, 14, 4, P.dark, P.ink, lwIn);
  }

  // Cây thông giản lược làm mốc tỷ lệ
  if (opts.showTrees !== false) {
    const treeStep = 280;
    const tStart = Math.floor(v.x0 / treeStep) * treeStep;
    for (let tx = tStart; tx <= v.x1; tx += treeStep) {
      const r = A.rnd(Math.floor(tx / treeStep) + 17);
      if (r < 0.45) continue;
      const xPos = tx + (r - 0.5) * 90;
      if (opts.clearZoneX && xPos >= opts.clearZoneX[0] && xPos <= opts.clearZoneX[1]) continue;
      const scale = 0.75 + 0.35 * A.rnd(tx + 5);
      drawPineSide(c, xPos, gy, scale, false);
    }
  }

  // Cụm tán cây lớn để xe phóng ẩn nấp chờ tiếp vận (Chương 5)
  if (opts.hideCanopyX != null) {
    const cx = opts.hideCanopyX;
    for (const dx of [-150, -55, 55, 155]) {
      drawPineSide(c, cx + dx, gy, 1.55, true);
    }
  }

  // Đường mặt đất chính
  A.line(c, [[v.x0, gy], [v.x1, gy]], P.ink, lw);
  c.restore();
}

export function drawPineSide(c: CanvasRenderingContext2D, x: number, gy: number, s = 1, tallCanopy = false) {
  const lw = A.px(c, LINE.inner);
  c.save();
  c.translate(x, gy);
  c.scale(s, s);
  const trunkH = tallCanopy ? 95 : 26;
  A.rrect(c, -5, -trunkH, 10, trunkH, 2, P.slate, P.ink, lw);
  if (tallCanopy) {
    A.poly(c, [[-58, -trunkH + 10], [0, -trunkH - 55], [58, -trunkH + 10]], P.oliveLight, P.ink, lw);
    A.poly(c, [[-48, -trunkH - 22], [0, -trunkH - 82], [48, -trunkH - 22]], P.olive, P.ink, lw);
  } else {
    A.poly(c, [[-24, -22], [0, -64], [24, -22]], P.oliveLight, P.ink, lw);
    A.poly(c, [[-19, -46], [0, -82], [19, -46]], P.oliveLight, P.ink, lw);
  }
  c.restore();
}

export function drawEnvCutaway(c: CanvasRenderingContext2D, cam: K.Cam, gridStep = 120) {
  const v = K.view(cam, 400);
  const lw = A.px(c, 1.2);
  c.save();
  c.strokeStyle = P.bg2;
  c.lineWidth = lw;
  c.beginPath();
  const xStart = Math.floor(v.x0 / gridStep) * gridStep;
  const yStart = Math.floor(v.y0 / gridStep) * gridStep;
  for (let x = xStart; x <= v.x1; x += gridStep) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  for (let y = yStart; y <= v.y1; y += gridStep) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  c.stroke();
  c.restore();
}

export interface EnvTopOpts {
  gridStep?: number;
  riverX?: number | null;
  bridgeY?: number;
  roadY?: number | null;
  forestBox?: { x: number; y: number; w: number; h: number } | null;
}

export function drawEnvTop(c: CanvasRenderingContext2D, cam: K.Cam, opts: EnvTopOpts = {}) {
  const v = K.view(cam, 500);
  const gs = opts.gridStep ?? 200;
  const lwGrid = A.px(c, 1.4);
  const lw = A.px(c, LINE.inner);
  const lwOut = A.px(c, LINE.outer);

  c.save();
  // Lưới ô vuông bản đồ
  c.strokeStyle = P.bg2;
  c.lineWidth = lwGrid;
  c.beginPath();
  const x0 = Math.floor(v.x0 / gs) * gs;
  const y0 = Math.floor(v.y0 / gs) * gs;
  for (let x = x0; x <= v.x1; x += gs) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  for (let y = y0; y <= v.y1; y += gs) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  c.stroke();

  // Sông và cầu (nếu có)
  if (opts.riverX != null) {
    const rx = opts.riverX;
    c.fillStyle = P.glass;
    c.strokeStyle = P.ink2;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(rx - 55, v.y0);
    for (let y = y0; y <= v.y1 + gs; y += 160) {
      const bend = Math.sin(y * 0.004) * 35;
      c.lineTo(rx - 55 + bend, y);
    }
    for (let y = y0 + Math.ceil((v.y1 - y0) / 160) * 160; y >= v.y0 - gs; y -= 160) {
      const bend = Math.sin(y * 0.004) * 35;
      c.lineTo(rx + 55 + bend, y);
    }
    c.closePath();
    c.fill();
    c.stroke();

    if (opts.bridgeY != null) {
      const by = opts.bridgeY;
      const bend = Math.sin(by * 0.004) * 35;
      const bx = rx + bend;
      A.rrect(c, bx - 78, by - 24, 156, 48, 4, P.light, P.ink, lwOut);
      // Trụ cầu
      A.rrect(c, bx - 36, by - 32, 16, 64, 3, P.slate, P.ink, lw);
      A.rrect(c, bx + 20, by - 32, 16, 64, 3, P.slate, P.ink, lw);
    }
  }

  // Đường giao thông ngang
  if (opts.roadY != null) {
    const ry = opts.roadY;
    c.fillStyle = P.sand;
    c.fillRect(v.x0, ry - 18, v.x1 - v.x0, 36);
    A.line(c, [[v.x0, ry - 18], [v.x1, ry - 18]], P.ink2, lw);
    A.line(c, [[v.x0, ry + 18], [v.x1, ry + 18]], P.ink2, lw);
  }

  // Ô rừng 1 km² (nếu có)
  if (opts.forestBox) {
    const fb = opts.forestBox;
    A.rrect(c, fb.x, fb.y, fb.w, fb.h, 8, P.bg2, P.ink2, lw);
    const cols = 6, rows = 5;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const seed = r * 13 + col * 7 + 3;
        const tx = fb.x + (col + 0.5) * (fb.w / cols) + (A.rnd(seed) - 0.5) * 28;
        const ty = fb.y + (r + 0.5) * (fb.h / rows) + (A.rnd(seed + 9) - 0.5) * 24;
        const rad = 16 + A.rnd(seed + 2) * 8;
        A.circle(c, tx, ty, rad, P.oliveLight, P.ink, lw);
        A.circle(c, tx - 3, ty - 3, rad * 0.45, P.olive, null, 0);
      }
    }
  }
  c.restore();
}

// Mặt cắt chiến hào ngang (SIDE) hoặc đường hào nhìn từ trên xuống (TOP)
export function drawTrench(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w = 220,
  depth = 110,
  view: 'side' | 'top' = 'side'
) {
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);
  c.save();
  if (view === 'side') {
    // Hố hào khoét sâu xuống dưới mặt đất (x .. x+w, y .. y+depth)
    c.fillStyle = P.bg;
    c.fillRect(x, y - 4, w, depth + 4);
    // Thành gỗ/đất gia cố hai bên hào
    A.rrect(c, x - 10, y, 12, depth, 2, P.sand, P.ink, lwIn);
    A.rrect(c, x + w - 2, y, 12, depth, 2, P.sand, P.ink, lwIn);
    // Đáy hào
    A.line(c, [[x - 10, y], [x, y], [x, y + depth], [x + w, y + depth], [x + w, y], [x + w + 10, y]], P.ink, lw);
    // Bao cát chắn miệng hào bên trái và phải
    for (let i = 0; i < 3; i++) {
      A.rrect(c, x - 38 + i * 11, y - 16 - (i === 1 ? 10 : 0), 22, 14, 5, P.sand, P.ink, lwIn);
      A.rrect(c, x + w + 4 + i * 11, y - 16 - (i === 1 ? 10 : 0), 22, 14, 5, P.sand, P.ink, lwIn);
    }
  } else {
    // TOP view: Chiến hào gấp khúc chữ Z
    const zig: A.Pt[] = [
      [x - w * 0.5, y - 24],
      [x - w * 0.18, y + 20],
      [x + w * 0.18, y - 20],
      [x + w * 0.5, y + 24],
    ];
    A.line(c, zig, P.ink, lw * 3.8);
    A.line(c, zig, P.dark, lw * 2.2);
  }
  c.restore();
}

// ── 2. PHÁO NÒNG (HOWITZER / TUBE ARTILLERY) ─────────────────────────────────

export interface HowitzerOpts {
  view?: 'side' | 'cutaway' | 'top';
  elevateDeg?: number;
  recoil?: number;        // 0..1 độ giật lùi của nòng
  breechOpen?: number;    // 0..1 mở khóa nòng nạp đạn
  chamberPressure?: number; // 0..1 vùng lửa áp suất cực đại trong buồng kín
  shellProg?: number;     // -1: không vẽ đạn trong nòng; 0..1: vị trí đạn dọc theo nòng
  highlight?: 'barrel' | 'breech' | 'recoil' | null;
}

export function drawHowitzer(c: CanvasRenderingContext2D, opts: HowitzerOpts = {}) {
  const view = opts.view ?? 'side';
  const elev = ((opts.elevateDeg ?? 18) * Math.PI) / 180;
  const rec = (opts.recoil ?? 0) * 34;
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);

  c.save();
  if (view === 'top') {
    // Khung gầm tự hành/giá pháo từ trên xuống
    A.rrect(c, -95, -52, 150, 104, 10, P.oliveDark, P.ink, lw);
    A.rrect(c, -85, -38, 130, 76, 8, P.olive, P.ink, lwIn);
    // Tháp pháo
    A.poly(c, [[-65, -34], [35, -28], [50, 0], [35, 28], [-65, 34]], P.oliveLight, P.ink, lw);
    // Nòng pháo dài + loa giảm giật
    A.rrect(c, 35 - rec, -7, 175, 14, 3, P.oliveDark, P.ink, lw);
    A.rrect(c, 204 - rec, -14, 24, 28, 4, P.slate, P.ink, lw);
    c.restore();
    return;
  }

  if (view === 'side') {
    // Thân xe pháo tự hành / giá pháo hạng nặng (y=0 là mặt đất)
    // Dải xích & bánh chịu nặng
    A.rrect(c, -135, -48, 250, 44, 20, P.dark, P.ink, lw);
    for (let i = 0; i < 6; i++) {
      A.circle(c, -100 + i * 40, -24, 15, P.slate, P.ink, lwIn);
      A.circle(c, -100 + i * 40, -24, 5, P.light, P.ink, lwIn);
    }
    // Bàn chống giật hạ xuống đất phía sau
    A.poly(c, [[-130, -28], [-172, 2], [-152, 4], [-118, -18]], P.slate, P.ink, lw);
    // Thân dưới
    A.poly(c, [[-140, -44], [115, -44], [130, -76], [-132, -76]], P.olive, P.ink, lw);

    // Cụm nòng xoay theo góc tầm
    c.save();
    c.translate(5, -108);
    c.rotate(-elev);

    // Máy thu lùi thủy lực cố định trên giá đỡ
    const recColor = opts.highlight === 'recoil' ? P.amber : P.slate;
    A.rrect(c, -45, -26, 95, 14, 4, recColor, P.ink, lw);
    A.rrect(c, -45, 12, 95, 14, 4, recColor, P.ink, lw);

    // Nòng thép dày + khóa nòng giật lùi theo -rec
    const brlColor = opts.highlight === 'barrel' ? P.amber : P.oliveDark;
    const brcColor = opts.highlight === 'breech' ? P.amber : P.dark;
    // Khóa nòng sau
    A.rrect(c, -72 - rec, -18, 38, 36, 4, brcColor, P.ink, lw);
    if ((opts.breechOpen ?? 0) > 0.05) {
      const bo = (opts.breechOpen ?? 0) * 26;
      A.rrect(c, -86 - rec, -16 + bo, 18, 30, 3, P.slate, P.ink, lwIn);
    }
    // Nòng chính rất dài
    A.rrect(c, -34 - rec, -11, 245, 22, 3, brlColor, P.ink, lw);
    A.rrect(c, 65 - rec, -14, 36, 28, 4, P.olive, P.ink, lwIn); // Bầu hút khói (bore evacuator)
    // Loa giảm giật đầu nòng
    A.poly(c, [[210 - rec, -18], [238 - rec, -22], [238 - rec, 22], [210 - rec, 18]], P.slate, P.ink, lw);
    c.restore();

    // Tháp pháo lớn che bên ngoài
    A.poly(c, [[-122, -76], [52, -76], [76, -128], [28, -148], [-115, -148]], P.oliveLight, P.ink, lw);
    A.rrect(c, -92, -134, 58, 28, 4, P.olive, P.ink, lwIn);
    c.restore();
    return;
  }

  // view === 'cutaway': Mặt cắt ngang phóng lớn của buồng đốt kín + thành nòng thép dày + xi-lanh thu lùi
  const p = opts.chamberPressure ?? 0;
  const bo = (opts.breechOpen ?? 0) * 58;

  // Khung giá pháo cố định & Xi-lanh thu lùi thủy lực bên dưới
  const recFill = opts.highlight === 'recoil' ? P.amber : P.light;
  A.rrect(c, -250, 56, 280, 46, 6, recFill, P.ink, lw);
  // Piston thu lùi dịch chuyển theo rec
  A.rrect(c, -120 - rec * 1.4, 64, 130, 30, 4, P.slate, P.ink, lw);
  A.line(c, [[-120 - rec * 1.4, 79], [-240, 79]], P.ink, lwIn, [6, 6]);

  // Cụm nòng pháo + buồng đốt thép đúc dày hàng tấn (dịch lùi theo rec)
  c.save();
  c.translate(-rec * 1.4, 0);

  const wallFill = opts.highlight === 'barrel' ? P.amber : P.slate;
  // Thành nòng thép dày phía trên
  A.poly(
    c,
    [[-220, -68], [-50, -68], [20, -44], [340, -40], [340, -18], [-220, -18]],
    wallFill,
    P.ink,
    lw
  );
  // Thành nòng thép dày phía dưới
  A.poly(
    c,
    [[-220, 68], [-50, 68], [20, 44], [340, 40], [340, 18], [-220, 18]],
    wallFill,
    P.ink,
    lw
  );

  // Lòng nòng & buồng đốt rỗng ở giữa
  A.rrect(c, -218, -18, 556, 36, 0, P.paper, null, 0);

  // Rãnh khương tuyến bên trong nòng
  for (let x = -30; x < 320; x += 36) {
    A.line(c, [[x, -17], [x + 22, 17]], P.light, lwIn);
  }

  // Khối khóa nòng thép bịt kín đuôi buồng đốt (Sealed Breech Block)
  const breechFill = opts.highlight === 'breech' ? P.amber : P.dark;
  A.rrect(c, -268, -68 + bo, 52, 136, 6, breechFill, P.ink, lw);

  // Vị trí viên đạn pháo và liều phóng trong buồng đốt
  const sp = opts.shellProg ?? 0;
  if (sp >= 0) {
    const sx = A.lerp(-60, 320, sp);
    // Vùng khí cháy áp suất cực cao bị nhốt kín giữa khóa nòng và đáy đạn
    if (p > 0.02) {
      c.save();
      c.globalAlpha = A.clamp01(p);
      A.rrect(c, -214, -17, Math.max(20, sx - -214), 34, 2, P.amber, null, 0);
      // Các mũi tên áp suất dội ngược vào khóa nòng và đẩy đạn đi
      drawArrow(c, [-150, 0], [-208, 0], P.enemy, lw);
      drawArrow(c, [-120, -10], [-120, -34], P.enemy, lwIn);
      drawArrow(c, [-120, 10], [-120, 34], P.enemy, lwIn);
      c.restore();
    } else if (sp < 0.05) {
      // Túi thuốc phóng chưa cháy
      A.rrect(c, -198, -14, 118, 28, 4, P.sand, P.ink, lwIn);
    }
    // Đầu đạn pháo
    drawShell(c, { x: sx, y: 0, scale: 0.95 });
  }

  c.restore();
  c.restore();
}

export function drawShell(
  c: CanvasRenderingContext2D,
  opts: { x?: number; y?: number; rot?: number; scale?: number; showSpin?: boolean } = {}
) {
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);
  c.save();
  c.translate(opts.x ?? 0, opts.y ?? 0);
  if (opts.rot) c.rotate(opts.rot);
  const s = opts.scale ?? 1;
  c.scale(s, s);

  // Thân đạn pháo nòng gọn, vỏ thép dày, đai dẫn đồng
  c.beginPath();
  c.moveTo(-36, -15);
  c.lineTo(6, -15);
  c.quadraticCurveTo(34, -14, 48, 0);
  c.quadraticCurveTo(34, 14, 6, 15);
  c.lineTo(-36, 15);
  c.closePath();
  A.fs(c, P.olive, P.ink, lw);
  // Đai đồng khương tuyến
  A.rrect(c, -28, -16, 8, 32, 1, P.amber, P.ink, lwIn);
  // Ngòi nổ mũi
  A.poly(c, [[34, -6], [48, 0], [34, 6]], P.slate, P.ink, lwIn);

  if (opts.showSpin) {
    c.strokeStyle = P.sky;
    c.lineWidth = lwIn;
    c.beginPath();
    c.ellipse(10, 0, 10, 26, 0, -Math.PI * 0.7, Math.PI * 0.7);
    c.stroke();
  }
  c.restore();
}

// ── 3. TÊN LỬA (122MM GRAD / 227MM GMLRS / 300MM SMERCH / ATACMS) ─────────────

export interface RocketOpts {
  variant?: '122mm' | '227mm' | '300mm' | 'atacms';
  view?: 'side' | 'cutaway' | 'top' | 'rear_axis';
  fuelLeft?: number;     // 0..1 lượng nhiên liệu rắn còn lại
  thrust?: number;       // 0..1 luồng lửa phụt ra từ loa phụt
  finOpen?: number;      // 0..1 độ bung của 4 cánh đuôi lò xo
  canardDeg?: number;    // góc bẻ cánh lái mũi (cho 227mm GMLRS / ATACMS)
  spinPhase?: number;    // pha xoay quanh trục dọc
  warheadType?: 'he' | 'frag_rings' | 'mines' | 'submunitions' | 'fae' | 'gmlrs';
  highlight?: 'motor' | 'nozzle' | 'fins' | 'guidance' | 'canards' | 'warhead' | null;
}

export function drawRocket(c: CanvasRenderingContext2D, opts: RocketOpts = {}) {
  const variant = opts.variant ?? '122mm';
  const view = opts.view ?? 'side';
  const fuel = A.clamp01(opts.fuelLeft ?? 1);
  const thrust = A.clamp01(opts.thrust ?? 0);
  const fin = A.clamp01(opts.finOpen ?? 1);
  const canardRad = ((opts.canardDeg ?? 0) * Math.PI) / 180;
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);

  c.save();

  // Góc nhìn dọc trục đuôi (rear_axis) để đọc chuyển động xoay + bung 4 cánh đuôi cong
  if (view === 'rear_axis') {
    const rot = opts.spinPhase ?? 0;
    c.rotate(rot);
    // Vòng ống phóng bao ngoài (mờ)
    A.circle(c, 0, 0, 58, P.bg2, P.slate, lwIn);
    // 4 rãnh xoắn dẫn hướng trong thành ống
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      A.rrect(c, Math.cos(a) * 54 - 4, Math.sin(a) * 54 - 4, 8, 8, 2, P.slate, P.ink, lwIn);
    }
    // 4 cánh đuôi cong bật mở theo finOpen
    const finSpan = A.lerp(4, 68, fin);
    const finFill = opts.highlight === 'fins' ? P.amber : P.oliveLight;
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate((i * Math.PI) / 2);
      c.beginPath();
      c.moveTo(34, -4);
      c.quadraticCurveTo(34 + finSpan * 0.6, -18 * fin, 34 + finSpan, -8 * fin);
      c.quadraticCurveTo(34 + finSpan * 0.55, -2 * fin, 34, 4);
      c.closePath();
      A.fs(c, finFill, P.ink, lw);
      c.restore();
    }
    // Thân đuôi tên lửa & loa phụt ở tâm
    A.circle(c, 0, 0, 36, P.olive, P.ink, lw);
    A.circle(c, 0, 0, 20, P.dark, P.ink, lwIn);
    if (thrust > 0.02) {
      A.circle(c, 0, 0, 14 * thrust, P.amber, null, 0);
    }
    c.restore();
    return;
  }

  // Kích thước chuẩn hóa theo biến thể
  const len = variant === 'atacms' ? 250 : variant === '300mm' ? 270 : variant === '227mm' ? 230 : 210;
  const rad = variant === 'atacms' ? 34 : variant === '300mm' ? 24 : variant === '227mm' ? 21 : 15;
  const noseLen = variant === 'atacms' ? 75 : 58;
  const tailX = -len * 0.52;
  const noseBaseX = len * 0.52 - noseLen;
  const tipX = len * 0.52;

  // Luồng lửa phản lực phụt tự do ra phía sau loa phụt
  if (thrust > 0.02) {
    const fl = (75 + 55 * Math.sin((opts.spinPhase ?? 0) * 19)) * thrust;
    A.poly(
      c,
      [
        [tailX - 6, -rad * 0.65],
        [tailX - fl, -rad * 1.45 * thrust],
        [tailX - fl * 1.28, 0],
        [tailX - fl, rad * 1.45 * thrust],
        [tailX - 6, rad * 0.65],
      ],
      P.amber,
      null,
      0
    );
    A.poly(
      c,
      [
        [tailX - 4, -rad * 0.35],
        [tailX - fl * 0.65, 0],
        [tailX - 4, rad * 0.35],
      ],
      P.white,
      null,
      0
    );
  }

  // 4 cánh đuôi lò xo ở đuôi (gập sát thân khi fin=0, bật xòe khi fin=1)
  const finH = A.lerp(2, rad * 1.55, fin);
  const finFill = opts.highlight === 'fins' ? P.amber : P.slate;
  // Cánh trên & dưới
  A.poly(
    c,
    [
      [tailX + 4, -rad],
      [tailX - 6, -rad - finH],
      [tailX + 26, -rad - finH * 0.85],
      [tailX + 36, -rad],
    ],
    finFill,
    P.ink,
    lw
  );
  A.poly(
    c,
    [
      [tailX + 4, rad],
      [tailX - 6, rad + finH],
      [tailX + 26, rad + finH * 0.85],
      [tailX + 36, rad],
    ],
    finFill,
    P.ink,
    lw
  );
  // Chốt bản lề lò xo ở gốc cánh đuôi
  A.circle(c, tailX + 8, -rad, 4, P.amber, P.ink, lwIn);
  A.circle(c, tailX + 8, rad, 4, P.amber, P.ink, lwIn);

  // Loa phụt (Nozzle)
  const nozFill = opts.highlight === 'nozzle' ? P.amber : P.dark;
  A.poly(
    c,
    [
      [tailX + 8, -rad * 0.82],
      [tailX - 10, -rad * 0.96],
      [tailX - 10, rad * 0.96],
      [tailX + 8, rad * 0.82],
    ],
    nozFill,
    P.ink,
    lw
  );

  if (view === 'side' || view === 'top') {
    // Thân trụ tên lửa bên ngoài
    const bodyFill = variant === '227mm' || variant === 'atacms' ? P.olive : P.oliveLight;
    A.rrect(c, tailX + 6, -rad, noseBaseX - (tailX + 6), rad * 2, 2, bodyFill, P.ink, lw);
    // Vạch phân khoang động cơ & đầu đạn
    const midX = tailX + (noseBaseX - tailX) * 0.62;
    A.line(c, [[midX, -rad], [midX, rad]], P.ink, lwIn);

    // Chóp mũi (Nosecone)
    c.beginPath();
    c.moveTo(noseBaseX, -rad);
    c.quadraticCurveTo(noseBaseX + noseLen * 0.58, -rad * 0.82, tipX, 0);
    c.quadraticCurveTo(noseBaseX + noseLen * 0.58, rad * 0.82, noseBaseX, rad);
    c.closePath();
    A.fs(c, opts.highlight === 'guidance' ? P.amber : P.oliveDark, P.ink, lw);
  } else {
    // view === 'cutaway': Mặt cắt dọc cho thấy toàn bộ cấu tạo bên trong tên lửa
    const motorEndX = tailX + (noseBaseX - tailX) * 0.64;

    // Vỏ thân cắt dọc
    A.rrect(c, tailX + 6, -rad, noseBaseX - (tailX + 6), rad * 2, 2, P.paper, P.ink, lw);
    // Thành vỏ kim loại mảnh trên/dưới
    A.rrect(c, tailX + 6, -rad, noseBaseX - (tailX + 6), 4, 0, P.slate, P.ink, lwIn);
    A.rrect(c, tailX + 6, rad - 4, noseBaseX - (tailX + 6), 4, 0, P.slate, P.ink, lwIn);

    // 1) Khoang động cơ nhiên liệu rắn (Solid Fuel Motor)
    const motorW = (motorEndX - (tailX + 18)) * fuel;
    const motorFill = opts.highlight === 'motor' ? P.amber : P.sand;
    if (fuel > 0.02) {
      // Khối thuốc phóng rắn có rãnh đốt ở tâm
      A.rrect(c, motorEndX - motorW, -rad + 5, motorW, rad * 0.62, 2, motorFill, P.ink, lwIn);
      A.rrect(c, motorEndX - motorW, rad * 0.38 - 5, motorW, rad * 0.62, 2, motorFill, P.ink, lwIn);
    }
    // Luồng khí nóng cháy trong rãnh tâm phụt thẳng ra cổ loa phụt
    if (thrust > 0.02) {
      A.rrect(c, tailX + 6, -rad * 0.35, motorEndX - (tailX + 6), rad * 0.7, 2, P.amber, null, 0);
    }
    // Vách ngăn động cơ & khoang đầu đạn
    A.rrect(c, motorEndX, -rad, 6, rad * 2, 0, P.dark, P.ink, lwIn);

    // 2) Khoang đầu đạn (Warhead) + Mũi dẫn đường (Guidance)
    c.beginPath();
    c.moveTo(noseBaseX, -rad);
    c.quadraticCurveTo(noseBaseX + noseLen * 0.58, -rad * 0.82, tipX, 0);
    c.quadraticCurveTo(noseBaseX + noseLen * 0.58, rad * 0.82, noseBaseX, rad);
    c.closePath();
    A.fs(c, P.paper, P.ink, lw);

    const whType = opts.warheadType ?? (variant === '227mm' ? 'gmlrs' : 'he');
    if (whType === 'gmlrs' || variant === '227mm') {
      // Khoang thuốc nổ 90kg
      A.rrect(c, motorEndX + 8, -rad + 5, noseBaseX - motorEndX - 10, (rad - 5) * 2, 3, P.oliveLight, P.ink, lwIn);
      // Khối dẫn đường quán tính (IMU) + Thu vệ tinh GPS ở chóp mũi
      const gFill = opts.highlight === 'guidance' ? P.amber : P.sky;
      A.rrect(c, noseBaseX + 2, -rad * 0.62, 24, rad * 1.24, 3, gFill, P.ink, lwIn);
      A.circle(c, noseBaseX + 14, 0, 5, P.white, P.ink, lwIn); // Con quay hồi chuyển IMU
      // Chip thu GPS + cơ cấu chấp hành cánh lái
      A.rrect(c, noseBaseX + 29, -rad * 0.42, 18, rad * 0.84, 2, P.amber, P.ink, lwIn);
    } else if (whType === 'frag_rings') {
      // Các vòng mảnh cắt sẵn (pre-scored fragmentation rings)
      for (let rx = motorEndX + 10; rx < noseBaseX - 4; rx += 11) {
        A.rrect(c, rx, -rad + 4, 9, (rad - 4) * 2, 1, P.slate, P.ink, lwIn);
      }
      A.poly(c, [[noseBaseX, -rad + 4], [tipX - 8, 0], [noseBaseX, rad - 4]], P.amber, P.ink, lwIn);
    } else if (whType === 'mines' || whType === 'submunitions') {
      // Các quả mìn chống tăng / đạn con xếp chồng trong khoang đầu đạn
      const cols = 4;
      const cellW = (noseBaseX - motorEndX - 12) / cols;
      for (let i = 0; i < cols; i++) {
        const cx = motorEndX + 10 + i * cellW;
        A.rrect(c, cx, -rad + 5, cellW - 3, rad - 6, 2, P.enemyLight, P.ink, lwIn);
        A.rrect(c, cx, 1, cellW - 3, rad - 6, 2, P.enemyLight, P.ink, lwIn);
      }
    } else {
      // Đầu đạn nổ mạnh / nhiệt áp (FAE)
      A.rrect(c, motorEndX + 8, -rad + 5, noseBaseX - motorEndX - 10, (rad - 5) * 2, 3, P.amber, P.ink, lwIn);
    }
  }

  // 4 cánh lái nhỏ ở mũi (Canards) cho đạn dẫn đường 227mm GMLRS / ATACMS
  if (variant === '227mm' || variant === 'atacms') {
    const canX = noseBaseX + noseLen * 0.56;
    const canFill = opts.highlight === 'canards' ? P.amber : P.sky;
    c.save();
    c.translate(canX, -rad * 0.55);
    c.rotate(canardRad);
    A.poly(c, [[-8, 0], [4, -14], [12, 0]], canFill, P.ink, lwIn);
    c.restore();

    c.save();
    c.translate(canX, rad * 0.55);
    c.rotate(canardRad);
    A.poly(c, [[-8, 0], [4, 14], [12, 0]], canFill, P.ink, lwIn);
    c.restore();
  }

  c.restore();
}

// ── 4. KATYUSHA BM-13 (1941) & BM-21 GRAD (40 ỐNG) ───────────────────────────

export interface KatyushaOpts {
  view?: 'side' | 'top';
  railMountProg?: number; // 0..1 lắp giàn ray lên xe tải thường
  rocketCount?: number;   // 0..8 số đạn trên ray
  elevateDeg?: number;
}

export function drawKatyusha(c: CanvasRenderingContext2D, opts: KatyushaOpts = {}) {
  const view = opts.view ?? 'side';
  const mount = A.clamp01(opts.railMountProg ?? 1);
  const rCount = opts.rocketCount ?? 8;
  const elev = ((opts.elevateDeg ?? 26) * Math.PI) / 180;
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);

  c.save();
  if (view === 'top') {
    A.rrect(c, -110, -38, 220, 76, 8, P.oliveDark, P.ink, lw);
    A.rrect(c, 35, -34, 65, 68, 6, P.olive, P.ink, lwIn);
    // 8 thanh ray song song trên lưng
    for (let i = -3; i <= 3; i++) {
      const ry = i * 9;
      A.line(c, [[-100, ry], [25, ry]], P.slate, lwIn);
    }
    c.restore();
    return;
  }

  // SIDE view: Xe tải 6 bánh ZIS-6 năm 1941 (mặt đất y=0)
  // Khung sườn & thùng gỗ phẳng
  A.rrect(c, -135, -42, 250, 12, 3, P.dark, P.ink, lw);
  A.rrect(c, -138, -54, 165, 14, 2, P.oliveDark, P.ink, lw);
  // Ca-bin vuông cổ điển + nắp ca-pô
  A.poly(c, [[28, -42], [28, -104], [76, -104], [84, -74], [122, -70], [122, -42]], P.olive, P.ink, lw);
  // Cửa sổ ca-bin
  A.rrect(c, 42, -96, 30, 22, 3, P.glass, P.ink, lwIn);
  // Chắn bùn & 3 trục bánh xe (6 bánh)
  for (const wx of [-96, -46, 92]) {
    A.circle(c, wx, -22, 22, P.dark, P.ink, lw);
    A.circle(c, wx, -22, 10, P.oliveLight, P.ink, lwIn);
  }

  // Giàn ray thép bắt ốc lên thùng sau (hạ xuống theo railMountProg)
  if (mount > 0.01) {
    const dropY = (1 - mount) * -90;
    c.save();
    c.globalAlpha = mount;
    c.translate(-45, -54 + dropY);
    // Khung chữ A đỡ giàn ray
    A.poly(c, [[-38, 0], [0, -42], [38, 0]], null, P.ink, lw);
    c.translate(0, -40);
    c.rotate(-elev);
    // Thanh ray chữ I dài
    A.rrect(c, -95, -8, 195, 12, 2, P.slate, P.ink, lw);
    A.line(c, [[-90, -2], [95, -2]], P.light, lwIn);
    // Đạn tên lửa M-13 xếp chồng trên/dưới ray
    for (let i = 0; i < Math.min(rCount, 4); i++) {
      const rx = -25 + i * 8;
      const ry = -18 - i * 5;
      c.save();
      c.translate(rx, ry);
      c.scale(0.48, 0.48);
      drawRocket(c, { variant: '122mm', view: 'side', finOpen: 1 });
      c.restore();
    }
    c.restore();
  }
  c.restore();
}

export interface GradOpts {
  view?: 'side' | 'front' | 'cutaway' | 'top';
  elevateDeg?: number;
  rocketsLeft?: number;    // 0..40
  jacksDown?: number;      // 0..1 chân chống thủy lực hạ xuống khóa nhíp
  shuttersDown?: number;   // 0..1 tấm chắn thép gập che kính chắn gió
  rockAngleDeg?: number;   // độ lắc nhíp nếu chưa hạ chân chống
  highlight?: 'tubes' | 'jacks' | 'shutters' | 'grooves' | null;
}

export function drawGrad(c: CanvasRenderingContext2D, opts: GradOpts = {}) {
  const view = opts.view ?? 'side';
  const elev = ((opts.elevateDeg ?? 24) * Math.PI) / 180;
  const jacks = A.clamp01(opts.jacksDown ?? 1);
  const shutters = A.clamp01(opts.shuttersDown ?? 1);
  const rLeft = opts.rocketsLeft ?? 40;
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);

  c.save();

  if (view === 'top') {
    // Xe tải Ural 6x6 nhìn từ trên xuống
    A.rrect(c, -130, -46, 260, 92, 10, P.oliveDark, P.ink, lw);
    // Ca-bin + mũi xe
    A.rrect(c, 28, -42, 56, 84, 6, P.olive, P.ink, lw);
    A.rrect(c, 84, -32, 42, 64, 6, P.oliveLight, P.ink, lwIn);
    // Tấm chắn kính trên ca-bin
    if (shutters > 0.1) {
      A.rrect(c, 68, -38, 14 * shutters, 76, 2, P.slate, P.ink, lwIn);
    }
    // Cụm 40 ống phóng xếp khối chữ nhật ở thùng sau
    const tFill = opts.highlight === 'tubes' ? P.amber : P.oliveLight;
    A.rrect(c, -122, -40, 142, 80, 4, tFill, P.ink, lw);
    for (let i = -3; i <= 3; i++) {
      A.line(c, [[-118, i * 10], [16, i * 10]], P.ink2, lwIn);
    }
    c.restore();
    return;
  }

  if (view === 'front') {
    // Chính diện / hơi chếch để thấy rõ: (1) tấm chắn thép gập che kính buồng lái,
    // (2) giàn 40 ống phóng (4 hàng × 10 cột) phía trên, (3) 2 chân chống thủy lực hạ xuống đất
    const cabY = -65;
    // Bánh xe trước & chân chống thủy lực hai bên
    A.rrect(c, -96, -54, 32, 54, 6, P.dark, P.ink, lw);
    A.rrect(c, 64, -54, 32, 54, 6, P.dark, P.ink, lw);

    // Hai chân chống thủy lực (Hydraulic Jacks) hạ xuống đất
    const jFill = opts.highlight === 'jacks' ? P.amber : P.slate;
    const jLen = A.lerp(14, 52, jacks);
    for (const side of [-1, 1]) {
      const jx = side * 116;
      A.rrect(c, jx - 10, -54, 20, 26, 3, P.dark, P.ink, lw);
      A.rrect(c, jx - 6, -42, 12, jLen, 2, jFill, P.ink, lw);
      A.rrect(c, jx - 18, -42 + jLen - 4, 36, 8, 2, jFill, P.ink, lw);
    }

    // Thân ca-bin & lưới tản nhiệt Ural
    A.rrect(c, -82, cabY - 62, 164, 96, 10, P.olive, P.ink, lw);
    A.rrect(c, -52, cabY - 12, 104, 42, 6, P.oliveDark, P.ink, lw);
    for (let i = -3; i <= 3; i++) {
      A.line(c, [[i * 12, cabY - 8], [i * 12, cabY + 26]], P.ink, lwIn);
    }
    A.circle(c, -66, cabY + 6, 10, P.amber, P.ink, lwIn);
    A.circle(c, 66, cabY + 6, 10, P.amber, P.ink, lwIn);

    // Kính chắn gió (có lính ngồi trong) & Tấm chắn thép có khe nhìn gập xuống (Steel Shutters)
    A.rrect(c, -70, cabY - 54, 64, 34, 4, P.glass, P.ink, lwIn);
    A.rrect(c, 6, cabY - 54, 64, 34, 4, P.glass, P.ink, lwIn);
    // Mũ sắt kíp lái bên trong ca-bin
    A.circle(c, -38, cabY - 34, 11, P.oliveDark, P.ink, lwIn);
    A.circle(c, 38, cabY - 34, 11, P.oliveDark, P.ink, lwIn);

    if (shutters > 0.02) {
      const shH = 36 * shutters;
      const shFill = opts.highlight === 'shutters' ? P.amber : P.slate;
      A.rrect(c, -72, cabY - 55, 68, shH, 3, shFill, P.ink, lw);
      A.rrect(c, 4, cabY - 55, 68, shH, 3, shFill, P.ink, lw);
      if (shutters > 0.6) {
        // Khe quan sát hẹp trên tấm chắn thép
        A.line(c, [[-56, cabY - 37], [-20, cabY - 37]], P.ink, lwIn);
        A.line(c, [[20, cabY - 37], [56, cabY - 37]], P.ink, lwIn);
      }
    }

    // Cụm 40 ống phóng 122mm (4 hàng × 10 cột) nhô cao phía sau ca-bin
    const bankY = cabY - 152;
    const tFill = opts.highlight === 'tubes' ? P.amber : P.oliveDark;
    A.rrect(c, -112, bankY, 224, 92, 6, tFill, P.ink, lw);
    let idx = 0;
    for (let r = 0; r < 4; r++) {
      for (let col = 0; col < 10; col++) {
        const tx = -94.5 + col * 21;
        const ty = bankY + 15 + r * 20.5;
        A.circle(c, tx, ty, 8.5, P.dark, P.ink, lwIn);
        if (idx < rLeft) {
          A.circle(c, tx, ty, 4.5, P.amber, P.ink, lwIn);
        }
        idx++;
      }
    }
    c.restore();
    return;
  }

  if (view === 'cutaway') {
    // Mặt cắt 1 ống phóng thành mỏng của BM-21 Grad: hở cả 2 đầu + rãnh xoắn nông (spiral grooves)
    const tubeFill = opts.highlight === 'tubes' ? P.amber : P.slate;
    const grvColor = opts.highlight === 'grooves' ? P.amber : P.ink2;
    // Thành ống rất mỏng (so với thành pháo nòng dày hàng tấn)
    A.rrect(c, -240, -34, 480, 7, 2, tubeFill, P.ink, lw);
    A.rrect(c, -240, 27, 480, 7, 2, tubeFill, P.ink, lw);
    A.rrect(c, -240, -27, 480, 54, 0, P.paper, null, 0);

    // Rãnh xoắn dẫn hướng nông bên trong ống (shallow spiral grooves)
    for (let x = -220; x <= 200; x += 44) {
      A.line(c, [[x, -26], [x + 34, 26]], grvColor, A.px(c, opts.highlight === 'grooves' ? 3.5 : 2), [8, 5]);
    }
    c.restore();
    return;
  }

  // SIDE view: Xe tải 6 bánh Ural BM-21 Grad (y=0 là mặt đất)
  const rockRad = ((opts.rockAngleDeg ?? 0) * Math.PI) / 180;
  // 3 trục bánh xe lớn (6x6)
  for (const wx of [-112, -52, 108]) {
    A.circle(c, wx, -26, 26, P.dark, P.ink, lw);
    A.circle(c, wx, -26, 12, P.oliveLight, P.ink, lwIn);
  }

  // Chân chống thủy lực phía đuôi xe (hạ từ gầm xuống mặt đất y=0)
  const jFill = opts.highlight === 'jacks' ? P.amber : P.slate;
  const jackExt = A.lerp(8, 42, jacks);
  A.rrect(c, -158, -46, 18, 16, 2, P.dark, P.ink, lw);
  A.rrect(c, -154, -36, 10, jackExt, 2, jFill, P.ink, lw);
  A.rrect(c, -166, -36 + jackExt - 4, 34, 6, 2, jFill, P.ink, lw);

  c.save();
  c.translate(-25, -44);
  c.rotate(rockRad);
  c.translate(25, 44);

  // Khung gầm sắt-xi
  A.rrect(c, -162, -52, 295, 14, 3, P.dark, P.ink, lw);
  // Thùngệ bệ xoay phía sau
  A.rrect(c, -148, -68, 155, 18, 3, P.oliveDark, P.ink, lw);

  // Ca-bin Ural mũi dài phía trước
  A.poly(
    c,
    [
      [18, -52],
      [18, -118],
      [74, -118],
      [90, -86],
      [144, -80],
      [144, -52],
    ],
    P.olive,
    P.ink,
    lw
  );
  // Cửa kính ca-bin
  A.poly(c, [[52, -110], [72, -110], [84, -86], [52, -86]], P.glass, P.ink, lwIn);

  // Tấm chắn thép gập xuống che kính chắn gió (Steel Shutters)
  const shFill = opts.highlight === 'shutters' ? P.amber : P.slate;
  c.save();
  c.translate(72, -114);
  // Khi shutters=0 tấm chắn nằm ngang trên nóc ca-bin; khi shutters=1 gập che kín mặt kính nghiêng
  const shRot = A.lerp(-1.25, 0.36, shutters);
  c.rotate(shRot);
  A.rrect(c, -4, 0, 10, 34, 2, shFill, P.ink, lw);
  c.restore();

  // Bệ 40 ống phóng 122mm nâng góc tầm
  c.save();
  c.translate(-88, -74);
  c.rotate(-elev);
  // Trụ nâng thủy lực
  A.rrect(c, -18, -12, 38, 22, 4, P.oliveDark, P.ink, lw);
  // Cụm 4 tầng ống phóng nhìn ngang
  const tubeColor = opts.highlight === 'tubes' ? P.amber : P.oliveLight;
  A.rrect(c, -86, -54, 182, 48, 4, tubeColor, P.ink, lw);
  for (let row = 0; row < 4; row++) {
    const ry = -48 + row * 11;
    A.rrect(c, -88, ry, 186, 9, 2, tubeColor, P.ink, lwIn);
  }
  c.restore();

  c.restore();
  c.restore();
}

// ── 5. HỘP PHÓNG POD 6 QUẢ, M142 HIMARS, M270 MLRS & XE TIẾP VẬN ──────────────

export interface PodOpts {
  view?: 'side' | 'cutaway' | 'front' | 'top';
  variant?: '6x227' | '1xAtacms';
  rocketsLeft?: number; // 0..6 (hoặc 0..1 với ATACMS)
  highlight?: boolean;
}

export function drawPod(c: CanvasRenderingContext2D, opts: PodOpts = {}) {
  const view = opts.view ?? 'side';
  const variant = opts.variant ?? '6x227';
  const rLeft = opts.rocketsLeft ?? (variant === '1xAtacms' ? 1 : 6);
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);
  const boxFill = opts.highlight ? P.amber : P.olive;

  c.save();
  if (view === 'front') {
    // Mặt trước hộp Pod chữ nhật: 6 ống 227mm xếp 2 cột × 3 hàng (hoặc 1 ống ATACMS lớn)
    A.rrect(c, -56, -74, 112, 148, 6, boxFill, P.ink, lw);
    A.rrect(c, -48, -66, 96, 132, 4, P.oliveDark, P.ink, lwIn);
    if (variant === '6x227') {
      let idx = 0;
      for (let r = 0; r < 3; r++) {
        for (let col = 0; col < 2; col++) {
          const cx = -22 + col * 44;
          const cy = -42 + r * 42;
          A.circle(c, cx, cy, 17, P.dark, P.ink, lw);
          if (idx < rLeft) {
            A.circle(c, cx, cy, 13, P.paper, P.ink, lwIn);
            A.circle(c, cx, cy, 5, P.amber, P.ink, lwIn);
          }
          idx++;
        }
      }
    } else {
      // Hộp ATACMS nhìn ngoài giống hệt pod nhưng bên trong là 1 quả tên lửa đạn đạo khổng lồ
      A.circle(c, 0, 0, 38, P.dark, P.ink, lw);
      if (rLeft > 0) {
        A.circle(c, 0, 0, 30, P.amber, P.ink, lw);
        A.circle(c, 0, 0, 12, P.sky, P.ink, lwIn);
      }
    }
    c.restore();
    return;
  }

  if (view === 'top') {
    A.rrect(c, -85, -32, 170, 64, 5, boxFill, P.ink, lw);
    A.line(c, [[-80, 0], [80, 0]], P.ink2, lwIn);
    for (const x of [-55, 0, 55]) {
      A.line(c, [[x, -30], [x, 30]], P.ink2, lwIn);
    }
    c.restore();
    return;
  }

  if (view === 'side') {
    // Hộp phóng chữ nhật nhôm - sợi thủy tinh nguyên khối
    A.rrect(c, -92, -36, 184, 72, 5, boxFill, P.ink, lw);
    // Các gân chịu lực dọc và móc cáp cẩu trên lưng
    for (const rx of [-60, -20, 20, 60]) {
      A.line(c, [[rx, -35], [rx, 35]], P.oliveDark, lwIn);
    }
    A.rrect(c, -86, -30, 172, 16, 2, P.oliveLight, P.ink, lwIn);
    A.rrect(c, -86, -8, 172, 16, 2, P.oliveLight, P.ink, lwIn);
    A.rrect(c, -86, 14, 172, 16, 2, P.oliveLight, P.ink, lwIn);
    // Móc cẩu trên đỉnh pod
    A.circle(c, -50, -39, 5, P.slate, P.ink, lwIn);
    A.circle(c, 50, -39, 5, P.slate, P.ink, lwIn);
    c.restore();
    return;
  }

  // view === 'cutaway': Mặt cắt dọc hộp Pod cho thấy các quả tên lửa 227mm (hoặc 1 quả ATACMS lớn) đóng sẵn bên trong
  A.rrect(c, -96, -42, 192, 84, 6, P.paper, P.ink, lw);
  A.rrect(c, -96, -42, 192, 6, 2, boxFill, P.ink, lwIn);
  A.rrect(c, -96, 36, 192, 6, 2, boxFill, P.ink, lwIn);

  if (variant === '6x227') {
    for (let r = 0; r < 3; r++) {
      const ry = -22 + r * 22;
      A.line(c, [[-92, ry - 10], [92, ry - 10]], P.slate, lwIn);
      if (r * 2 < rLeft) {
        c.save();
        c.translate(0, ry);
        c.scale(0.72, 0.42);
        drawRocket(c, { variant: '227mm', view: 'side', finOpen: 0 });
        c.restore();
      }
    }
  } else {
    if (rLeft > 0) {
      c.save();
      c.scale(0.7, 0.85);
      drawRocket(c, { variant: 'atacms', view: 'cutaway', finOpen: 0, highlight: 'guidance' });
      c.restore();
    }
  }
  c.restore();
}

export interface HimarsOpts {
  view?: 'side' | 'cutaway' | 'top';
  elevateDeg?: number;
  podVariant?: '6x227' | '1xAtacms' | 'none';
  podRocketsLeft?: number;
  craneExtend?: number;   // 0..1 dầm cẩu cơ khí vươn ra sau xe để cẩu pod
  cableDrop?: number;     // 0..1 dây cáp tời hạ pod xuống mặt đất / kéo pod lên
  highlightCrane?: boolean;
}

export function drawHimars(c: CanvasRenderingContext2D, opts: HimarsOpts = {}) {
  const view = opts.view ?? 'side';
  const elev = ((opts.elevateDeg ?? 22) * Math.PI) / 180;
  const craneExt = A.clamp01(opts.craneExtend ?? 0);
  const cable = A.clamp01(opts.cableDrop ?? 0);
  const podVar = opts.podVariant ?? '6x227';
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);

  c.save();
  if (view === 'top') {
    // M142 HIMARS từ trên xuống: thân xe tải bọc thép 6 bánh + 1 hộp pod 6 ống
    A.rrect(c, -135, -46, 270, 92, 10, P.oliveDark, P.ink, lw);
    // Ca-bin bọc thép vát góc phía trước
    A.poly(c, [[45, -44], [125, -38], [135, 0], [125, 38], [45, 44]], P.olive, P.ink, lw);
    A.rrect(c, 92, -28, 22, 56, 3, P.glass, P.ink, lwIn);
    if (podVar !== 'none') {
      c.save();
      c.translate(-35, 0);
      drawPod(c, { view: 'top', variant: podVar });
      c.restore();
    }
    c.restore();
    return;
  }

  // SIDE / CUTAWAY view (mặt đất y=0)
  // 3 trục bánh lốp lớn (6x6)
  for (const wx of [-108, -46, 98]) {
    A.circle(c, wx, -28, 28, P.dark, P.ink, lw);
    A.circle(c, wx, -28, 13, P.oliveLight, P.ink, lwIn);
  }
  // Khung gầm xe tải FMTV
  A.rrect(c, -152, -56, 286, 16, 3, P.dark, P.ink, lw);
  A.rrect(c, -142, -72, 165, 16, 3, P.oliveDark, P.ink, lw);

  // Ca-bin bọc thép vát nghiêng đặc trưng của M142 HIMARS
  A.poly(
    c,
    [
      [38, -56],
      [38, -132],
      [108, -132],
      [136, -86],
      [136, -56],
    ],
    P.olive,
    P.ink,
    lw
  );
  // Cửa sổ kính chống đạn
  A.poly(c, [[82, -120], [104, -120], [122, -90], [82, -90]], P.glass, P.ink, lwIn);
  A.rrect(c, 48, -120, 26, 30, 3, P.glass, P.ink, lwIn);

  // Khung bệ phóng chữ U (Launcher Cradle) có tích hợp dầm cẩu & tời cơ khí (Mechanical Crane & Winch)
  c.save();
  c.translate(-56, -74);
  c.rotate(-elev);

  const craneColor = opts.highlightCrane ? P.amber : P.slate;
  const boomSlide = craneExt * 145; // Dầm cẩu trượt vươn ra sau đuôi xe

  // Trụ đỡ khung bệ (vẽ phía sau hộp Pod để không đè lên Pod khi trượt cẩu)
  A.poly(c, [[-98, 0], [-98, -92], [-78, -92], [-72, 0]], P.oliveDark, P.ink, lw);

  // Hộp Pod nằm trong khung (hoặc đang được dây cáp tời kéo lên/hạ xuống)
  if (podVar !== 'none') {
    const podOffsetX = -boomSlide;
    const podOffsetY = -42 + cable * 112;
    // Dây cáp tời từ dầm cẩu xuống móc hộp Pod
    if (craneExt > 0.02 || cable > 0.02) {
      A.line(c, [[podOffsetX - 50, -82], [podOffsetX - 50, podOffsetY - 36]], P.ink, lwIn);
      A.line(c, [[podOffsetX + 50, -82], [podOffsetX + 50, podOffsetY - 36]], P.ink, lwIn);
      // Cụm ròng rọc tời
      A.rrect(c, podOffsetX - 60, -88, 22, 10, 2, P.amber, P.ink, lwIn);
      A.rrect(c, podOffsetX + 38, -88, 22, 10, 2, P.amber, P.ink, lwIn);
    }
    c.save();
    c.translate(podOffsetX, podOffsetY);
    drawPod(c, {
      view: view === 'cutaway' ? 'cutaway' : 'side',
      variant: podVar,
      rocketsLeft: opts.podRocketsLeft,
    });
    c.restore();
  }

  // Khung dầm cẩu trên đỉnh bệ (Boom & Winch Frame)
  A.rrect(c, -102 - boomSlide, -92, 204 + boomSlide, 12, 3, craneColor, P.ink, lw);

  c.restore();
  c.restore();
}

export function drawSmerch(c: CanvasRenderingContext2D, opts: { elevateDeg?: number } = {}) {
  const elev = ((opts.elevateDeg ?? 22) * Math.PI) / 180;
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);
  c.save();
  // 4 trục bánh xe khổng lồ 8x8 MAZ-543
  for (const wx of [-142, -82, 42, 102]) {
    A.circle(c, wx, -30, 30, P.dark, P.ink, lw);
    A.circle(c, wx, -30, 14, P.oliveLight, P.ink, lwIn);
  }
  A.rrect(c, -182, -60, 326, 16, 3, P.dark, P.ink, lw);
  // Ca-bin thấp đặt trước trục bánh trước đặc trưng của MAZ-543
  A.poly(c, [[74, -60], [74, -122], [136, -122], [156, -82], [156, -60]], P.olive, P.ink, lw);
  A.poly(c, [[108, -112], [132, -112], [146, -84], [108, -84]], P.glass, P.ink, lwIn);
  // Khoang động cơ giữa xe
  A.rrect(c, -10, -102, 76, 42, 4, P.oliveDark, P.ink, lw);
  // Cụm 12 ống phóng 300mm cỡ lớn phía sau
  c.save();
  c.translate(-105, -72);
  c.rotate(-elev);
  A.rrect(c, -110, -76, 235, 68, 5, P.oliveLight, P.ink, lw);
  for (let r = 0; r < 3; r++) {
    const ry = -68 + r * 20;
    A.rrect(c, -114, ry, 242, 16, 3, P.olive, P.ink, lwIn);
  }
  c.restore();
  c.restore();
}

export function drawM270(c: CanvasRenderingContext2D, opts: { view?: 'side' | 'top'; elevateDeg?: number } = {}) {
  const view = opts.view ?? 'side';
  const elev = ((opts.elevateDeg ?? 20) * Math.PI) / 180;
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);

  c.save();
  if (view === 'top') {
    // Khung gầm bánh xích M270 chở 2 hộp Pod 6 quả song song (tổng 12 ống)
    A.rrect(c, -125, -62, 250, 124, 10, P.oliveDark, P.ink, lw);
    A.rrect(c, 35, -54, 82, 108, 6, P.olive, P.ink, lw);
    // 2 Pod đặt cạnh nhau
    c.save();
    c.translate(-35, -28);
    c.scale(0.85, 0.78);
    drawPod(c, { view: 'top' });
    c.restore();
    c.save();
    c.translate(-35, 28);
    c.scale(0.85, 0.78);
    drawPod(c, { view: 'top' });
    c.restore();
    c.restore();
    return;
  }

  // SIDE view: M270 bánh xích
  A.rrect(c, -135, -50, 270, 46, 22, P.dark, P.ink, lw);
  for (let i = 0; i < 6; i++) {
    A.circle(c, -100 + i * 40, -24, 16, P.slate, P.ink, lwIn);
  }
  A.poly(c, [[-140, -46], [132, -46], [142, -88], [110, -118], [25, -118], [25, -68], [-140, -68]], P.olive, P.ink, lw);
  // Cửa kính chớp bọc thép buồng lái
  A.rrect(c, 55, -108, 45, 24, 3, P.oliveLight, P.ink, lwIn);

  // Cụm bệ phóng mang 2 Pod
  c.save();
  c.translate(-52, -72);
  c.rotate(-elev);
  A.rrect(c, -96, -86, 192, 82, 6, P.oliveDark, P.ink, lw);
  c.save();
  c.translate(0, -44);
  drawPod(c, { view: 'side' });
  c.restore();
  c.restore();
  c.restore();
}

export function drawSupplyTruck(c: CanvasRenderingContext2D, opts: { podsCount?: number } = {}) {
  const pods = opts.podsCount ?? 2;
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);
  c.save();
  for (const wx of [-120, -65, 55, 110]) {
    A.circle(c, wx, -26, 26, P.dark, P.ink, lw);
    A.circle(c, wx, -26, 11, P.sand, P.ink, lwIn);
  }
  A.rrect(c, -155, -52, 295, 14, 3, P.dark, P.ink, lw);
  A.poly(c, [[62, -52], [62, -124], [122, -124], [138, -82], [138, -52]], P.olive, P.ink, lw);
  A.rrect(c, 88, -114, 34, 26, 3, P.glass, P.ink, lwIn);
  for (let i = 0; i < pods; i++) {
    c.save();
    c.translate(-65, -88 - i * 74);
    drawPod(c, { view: 'side' });
    c.restore();
  }
  c.restore();
}

// ── 6. BỘ BINH, UAV, MỤC TIÊU & HIỆU ỨNG CHIẾN TRƯỜNG ────────────────────────

export interface SoldierOpts {
  view?: 'side' | 'top';
  faction?: 'ally' | 'enemy';
  pose?: 'stand' | 'run' | 'prone' | 'fallen' | 'carry';
  phase?: number;
  dir?: 1 | -1;
}

export function drawSoldier(c: CanvasRenderingContext2D, opts: SoldierOpts = {}) {
  const view = opts.view ?? 'side';
  const bodyColor = (opts.faction ?? 'enemy') === 'enemy' ? P.enemy : P.olive;
  const helmColor = (opts.faction ?? 'enemy') === 'enemy' ? P.enemyLight : P.oliveDark;
  const pose = opts.pose ?? 'stand';
  const dir = opts.dir ?? 1;
  const ph = opts.phase ?? 0;
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);

  c.save();
  if (view === 'top') {
    const r = pose === 'prone' || pose === 'fallen' ? 11 : 9;
    if (pose === 'fallen') c.globalAlpha *= 0.45;
    A.ellipse(c, 0, 0, r * 1.35, r * 0.85, 0, bodyColor, P.ink, lwIn);
    A.circle(c, 0, 0, r * 0.65, helmColor, P.ink, lwIn);
    c.restore();
    return;
  }

  c.scale(dir, 1);
  if (pose === 'prone' || pose === 'fallen') {
    // Nằm bẹp sát đất hoặc gục ngã
    if (pose === 'fallen') c.globalAlpha *= 0.55;
    A.rrect(c, -22, -12, 32, 12, 5, bodyColor, P.ink, lw);
    A.circle(c, 16, -9, 7, P.skin, P.ink, lwIn);
    A.poly(c, [[9, -11], [24, -11], [22, -18], [11, -18]], helmColor, P.ink, lwIn);
    c.restore();
    return;
  }

  const stride = pose === 'run' ? Math.sin(ph * 10) * 9 : pose === 'carry' ? Math.sin(ph * 5) * 4 : 0;
  // Hai chân
  A.capsule(c, [-3, -20], [-6 - stride, -2], 6, bodyColor, P.ink, lwIn);
  A.capsule(c, [3, -20], [6 + stride, -2], 6, bodyColor, P.ink, lwIn);
  // Thân người
  A.rrect(c, -9, -42, 18, 24, 5, bodyColor, P.ink, lw);
  // Đầu & mũ sắt
  A.circle(c, 0, -50, 7.5, P.skin, P.ink, lwIn);
  A.poly(c, [[-9, -51], [10, -51], [8, -60], [-7, -60]], helmColor, P.ink, lw);
  // Tay
  if (pose === 'carry') {
    A.capsule(c, [2, -36], [14, -44], 5, bodyColor, P.ink, lwIn);
  } else {
    A.capsule(c, [0, -36], [10, -26], 5, bodyColor, P.ink, lwIn);
  }
  c.restore();
}

export function drawDrone(c: CanvasRenderingContext2D, opts: { view?: 'side' | 'top'; scanCone?: boolean } = {}) {
  const view = opts.view ?? 'side';
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);
  c.save();
  if (opts.scanCone) {
    c.save();
    c.globalAlpha = 0.22;
    A.poly(c, [[0, 0], [-180, 260], [60, 260]], P.amber, null, 0);
    c.restore();
    A.line(c, [[0, 0], [-180, 260]], P.amber, lwIn, [8, 6]);
    A.line(c, [[0, 0], [60, 260]], P.amber, lwIn, [8, 6]);
  }
  if (view === 'top') {
    A.rrect(c, -42, -5, 84, 10, 3, P.enemyLight, P.ink, lw);
    A.rrect(c, -7, -28, 14, 56, 5, P.enemy, P.ink, lw);
    A.circle(c, 0, 18, 5, P.amber, P.ink, lwIn);
  } else {
    A.poly(c, [[-34, -4], [28, -4], [38, 4], [-28, 4]], P.enemy, P.ink, lw);
    A.poly(c, [[-26, -4], [-36, -18], [-20, -18], [-14, -4]], P.enemyLight, P.ink, lwIn);
    A.circle(c, 16, 7, 6, P.amber, P.ink, lwIn);
  }
  c.restore();
}

export function drawTargetSet(
  c: CanvasRenderingContext2D,
  kind: 'radar_van' | 'bridge_pier' | 'bunker' | 'room_building' | 'depot_top',
  damaged = 0
) {
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);
  c.save();
  if (kind === 'radar_van') {
    // Xe radar đối phương
    A.rrect(c, -48, -36, 96, 26, 4, P.enemy, P.ink, lw);
    A.circle(c, -30, -10, 10, P.dark, P.ink, lwIn);
    A.circle(c, 30, -10, 10, P.dark, P.ink, lwIn);
    // Chảo radar xoay trên nóc
    c.save();
    c.rotate(damaged > 0.5 ? 0.45 : 0);
    A.poly(c, [[-6, -36], [6, -36], [4, -52], [-4, -52]], P.slate, P.ink, lwIn);
    A.ellipse(c, 0, -64, 26, 12, -0.25, P.enemyLight, P.ink, lw);
    c.restore();
  } else if (kind === 'bunker') {
    // Hầm đạn bê tông cốt thép
    A.poly(c, [[-62, 0], [-46, -36], [46, -36], [62, 0]], P.slate, P.ink, lw);
    A.rrect(c, -26, -24, 52, 24, 3, P.enemy, P.ink, lwIn);
  } else if (kind === 'bridge_pier') {
    // Trụ cầu chính
    A.rrect(c, -70, -48, 140, 14, 2, P.light, P.ink, lw);
    A.rrect(c, -20, -34, 40, 56, 3, P.enemy, P.ink, lw);
  } else if (kind === 'room_building') {
    // Tòa nhà nhiều phòng nhìn từ trên xuống/mặt cắt để minh họa bắn trúng 1 căn phòng từ 80km
    A.rrect(c, -76, -54, 152, 108, 4, P.paper, P.ink, lw);
    for (const gx of [-25, 25]) A.line(c, [[gx, -54], [gx, 54]], P.ink, lwIn);
    A.line(c, [[-76, 0], [76, 0]], P.ink, lwIn);
    // Căn phòng mục tiêu ở góc phải trên được đánh dấu rõ
    A.rrect(c, 26, -53, 49, 52, 2, damaged > 0.3 ? P.amber : P.enemyLight, P.ink, lw);
  } else {
    // Khu kho tàng / tập kết diện rộng (TOP)
    for (const [bx, by] of [[-55, -35], [15, -35], [-55, 15], [15, 15]] as A.Pt[]) {
      A.rrect(c, bx, by, 44, 24, 3, P.enemyLight, P.ink, lwIn);
    }
  }
  c.restore();
}

// ── 7. VỤ NỔ, MẢNH VĂNG, VỆT KHÓI & CALLOUT TỐI THIỂU ───────────────────────

export function drawExplosion(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: number, // tiến độ nổ 0..1
  radius = 65,
  shrapnelDirs = 8
) {
  if (p <= 0 || p >= 1) return;
  const lw = A.px(c, LINE.inner);
  const grow = A.eo(p, 0, 0.35);
  const fade = 1 - A.sm(p, 0.45, 1);

  c.save();
  c.translate(x, y);
  c.globalAlpha = fade;

  // Vòng sóng xung kích
  const rOuter = radius * (0.35 + 0.95 * p);
  A.circle(c, 0, 0, rOuter, null, P.amber, lw * 1.4);

  // Quả cầu lửa & khói
  const rCore = radius * 0.68 * grow;
  A.circle(c, 0, 0, rCore, P.amber, P.ink, lw);
  A.circle(c, 0, 0, rCore * 0.52, P.white, null, 0);

  // Tia mảnh văng (Shrapnel)
  for (let i = 0; i < shrapnelDirs; i++) {
    const a = (i / shrapnelDirs) * Math.PI * 2 + 0.2;
    const d0 = rCore * 0.6;
    const d1 = radius * (0.45 + 1.25 * p);
    A.line(
      c,
      [
        [Math.cos(a) * d0, Math.sin(a) * d0],
        [Math.cos(a) * d1, Math.sin(a) * d1],
      ],
      P.ink,
      lw
    );
  }
  c.restore();
}

export function drawArrow(c: CanvasRenderingContext2D, from: A.Pt, to: A.Pt, color: string = P.ink, lw = 3, head = 12) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const ang = Math.atan2(dy, dx);
  A.line(c, [from, to], color, lw);
  A.poly(
    c,
    [
      to,
      [to[0] - Math.cos(ang - 0.45) * head, to[1] - Math.sin(ang - 0.45) * head],
      [to[0] - Math.cos(ang + 0.45) * head, to[1] - Math.sin(ang + 0.45) * head],
    ],
    color,
    color,
    lw * 0.6
  );
}

// Callout tối giản neo vào điểm màn hình (chỉ dùng cho con số then chốt hoặc phân biệt 2 vật theo mục 6)
export function drawCallout(
  c: CanvasRenderingContext2D,
  targetScreen: A.Pt,
  boxOffset: A.Pt,
  text: string,
  alpha = 1,
  accentColor: string = P.amber
) {
  if (alpha <= 0.01) return;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = A.clamp01(alpha);

  const bx = targetScreen[0] + boxOffset[0];
  const by = targetScreen[1] + boxOffset[1];
  c.font = '700 26px "Inter", "SF Pro Display", -apple-system, sans-serif';
  const tw = c.measureText(text).width;
  const padX = 16;
  const bw = tw + padX * 2;
  const bh = 44;

  // Đường chỉ mảnh từ điểm neo tới hộp nhãn
  A.line(c, [targetScreen, [bx, by]], P.ink, 2.5);
  A.circle(c, targetScreen[0], targetScreen[1], 5, accentColor, P.ink, 2);

  A.rrect(c, bx - bw / 2, by - bh / 2, bw, bh, 8, P.paper, P.ink, 3);
  A.rrect(c, bx - bw / 2, by - bh / 2, 7, bh, 4, accentColor, null, 0);

  c.fillStyle = P.ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, bx + 2, by + 1);
  c.restore();
}

// Thanh đồng hồ thời gian cơ khí gọn trên màn hình (chỉ dùng cho cửa sổ 10s / 20s / 20-30m / 5m)
export function drawTimerBar(
  c: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  progress: number, // 0..1
  label: string,
  activeColor: string = P.amber,
  alpha = 1
) {
  if (alpha <= 0.01) return;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = A.clamp01(alpha);

  const h = 24;
  A.rrect(c, sx - w / 2, sy - h / 2, w, h, 6, P.paper, P.ink, 3);
  const fillW = Math.max(0, (w - 6) * A.clamp01(progress));
  if (fillW > 2) {
    A.rrect(c, sx - w / 2 + 3, sy - h / 2 + 3, fillW, h - 6, 4, activeColor, null, 0);
  }
  c.font = '700 22px "Inter", "SF Pro Display", -apple-system, sans-serif';
  c.fillStyle = P.ink;
  c.textAlign = 'center';
  c.textBaseline = 'bottom';
  c.fillText(label, sx, sy - h / 2 - 8);
  c.restore();
}
