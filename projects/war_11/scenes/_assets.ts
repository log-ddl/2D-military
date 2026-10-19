// scenes/_assets.ts — Toàn bộ vật thể và nền của project war_11 (vẽ 1 lần, giữ nhất quán xuyên suốt 6 chương).
import * as A from './shared/art';
import { P, LINE } from './shared/palette';

export type ViewAngle = 'side' | 'top' | 'cutaway' | 'front';

/** Độ dày nét thích ứng nhẹ theo zoom để không quá mảnh hay quá đậm. */
export function lw(c: CanvasRenderingContext2D, base: number = LINE.outer): number {
  return A.clamp(A.px(c, base), base * 0.55, base * 1.35);
}

/** Vẽ mũi tên kỹ thuật từ p0 tới p1 có đầu tam giác sắc nét. */
export function drawArrow(
  c: CanvasRenderingContext2D,
  p0: A.Pt,
  p1: A.Pt,
  color: string = P.ink,
  w: number = 3,
  head: number = 10
) {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  A.line(c, [p0, [p1[0] - ux * head * 0.65, p1[1] - uy * head * 0.65]], color, w);
  A.poly(
    c,
    [
      p1,
      [p1[0] - ux * head + nx * head * 0.52, p1[1] - uy * head + ny * head * 0.52],
      [p1[0] - ux * head - nx * head * 0.52, p1[1] - uy * head - ny * head * 0.52],
    ],
    color,
    null,
    0
  );
}

/** Vẽ cung tròn có tuỳ chọn nét đứt. */
export function drawArc(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
  color: string = P.ink,
  w: number = 3,
  dash?: number[]
) {
  c.save();
  c.beginPath();
  c.arc(x, y, Math.max(0, r), a0, a1);
  if (dash) c.setLineDash(dash);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.stroke();
  c.restore();
}


// ============================================================================
// 1. NỀN CỦA CÁC NƠI CHỐN (BACKGROUNDS)
// ============================================================================

/** Nền sáng kỹ thuật có lưới mảnh trong không gian thế giới. */
export function drawBgSkyGrid(c: CanvasRenderingContext2D, wx0 = -2400, wy0 = -1600, ww = 4800, wh = 3200, step = 120) {
  c.save();
  c.fillStyle = P.bg;
  c.fillRect(wx0, wy0, ww, wh);
  c.strokeStyle = 'rgba(71, 85, 105, 0.09)';
  c.lineWidth = lw(c, 1.2);
  c.beginPath();
  for (let x = Math.floor(wx0 / step) * step; x <= wx0 + ww; x += step) {
    c.moveTo(x, wy0);
    c.lineTo(x, wy0 + wh);
  }
  for (let y = Math.floor(wy0 / step) * step; y <= wy0 + wh; y += step) {
    c.moveTo(wx0, y);
    c.lineTo(wx0 + ww, y);
  }
  c.stroke();
  c.restore();
}

/** Nền sân bay / bãi đáp góc ngang (groundY mặc định = 220). */
export function drawBgAirfield(c: CanvasRenderingContext2D, groundY = 220, wx0 = -2600, wx1 = 2600) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  // Dải đồi mờ phía xa
  A.poly(c, [
    [wx0, groundY],
    [-1800, groundY - 90],
    [-1100, groundY - 45],
    [-300, groundY - 110],
    [500, groundY - 50],
    [1300, groundY - 95],
    [wx1, groundY - 40],
    [wx1, groundY],
  ], P.bg2, P.light, li);

  // Mặt đường băng và đất nền
  c.fillStyle = P.bg2;
  c.fillRect(wx0, groundY, wx1 - wx0, 900);
  // Lớp bê tông đường băng
  A.rrect(c, wx0, groundY, wx1 - wx0, 44, 0, P.light, P.ink, lo);
  // Vạch kẻ đứt đoạn trên đường băng
  A.line(c, [[wx0 + 100, groundY + 22], [wx1 - 100, groundY + 22]], P.paper, lw(c, 3), [42, 32]);
  c.restore();
}

/** Nền Hangar bảo dưỡng trực thăng (Chương 3). */
export function drawBgHangar(c: CanvasRenderingContext2D, groundY = 230) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  // Khung vòm hangar phía sau
  for (let x = -900; x <= 900; x += 300) {
    A.line(c, [[x, groundY], [x, -380]], P.light, li);
  }
  A.line(c, [[-1050, -340], [0, -430], [1050, -340]], P.light, lo);
  A.line(c, [[-1050, -220], [1050, -220]], P.light, li, [18, 14]);
  // Giàn giáo kỹ thuật hai bên
  for (const side of [-1, 1]) {
    const gx = side * 460;
    A.rrect(c, gx - 55, -140, 110, groundY + 140, 4, null, P.slate, li);
    A.line(c, [[gx - 55, -20], [gx + 55, -20]], P.slate, li);
    A.line(c, [[gx - 55, 100], [gx + 55, 100]], P.slate, li);
  }
  // Mặt sàn xưởng
  c.fillStyle = P.bg2;
  c.fillRect(-1600, groundY, 3200, 600);
  A.line(c, [[-1600, groundY], [1600, groundY]], P.ink, lo);
  c.restore();
}

/** Nền thung lũng núi cao & sa mạc khô (Chương 4). */
export function drawBgMountainValley(c: CanvasRenderingContext2D, groundY = 230, isDesert = false) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  // Dãy núi cao lớp xa
  A.poly(c, [
    [-1800, groundY],
    [-1350, -320],
    [-920, -140],
    [-460, -390],
    [40, -160],
    [520, -360],
    [980, -190],
    [1420, -330],
    [1800, groundY],
  ], P.bg2, P.slate, li);
  // Sườn núi lớp gần
  A.poly(c, [
    [-1800, groundY],
    [-1100, -150],
    [-620, -40],
    [-180, -180],
    [340, -50],
    [820, -170],
    [1350, -30],
    [1800, groundY],
  ], isDesert ? '#e6dec8' : P.light, P.ink2, li);
  // Mặt đất
  c.fillStyle = isDesert ? P.sand : P.bg2;
  c.fillRect(-1800, groundY, 3600, 700);
  A.line(c, [[-1800, groundY], [1800, groundY]], P.ink, lo);
  c.restore();
}

/** Nền mặt cắt dọc địa hình đồi - thung lũng - hàng cây cho chiến thuật NOE (Chương 5). */
export function drawBgTacticalTerrainSide(c: CanvasRenderingContext2D, baseGround = 260) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  // Đường mặt đất có thung lũng trũng ở bên trái/giữa, đồi chắn ở giữa (x=120), và cao nguyên radar ở bên phải (x=680)
  const pts: A.Pt[] = [
    [-1400, baseGround - 40],
    [-950, baseGround - 120],
    [-650, baseGround + 10],
    [-250, baseGround + 20],
    [-40, baseGround - 20],
    [140, baseGround - 210], // Đỉnh đồi che khuất gunship
    [310, baseGround - 30],
    [520, baseGround - 15],
    [700, baseGround - 160], // Đồi đặt radar / mục tiêu địch
    [1200, baseGround - 150],
    [1200, baseGround + 600],
    [-1400, baseGround + 600],
  ];
  A.poly(c, pts, P.bg2, P.ink, lo);

  // Các cụm cây rừng trong thung lũng
  const treeXs = [-780, -540, -380, -190, 360, 450];
  const treeYs = [baseGround - 40, baseGround + 12, baseGround + 16, baseGround + 10, baseGround - 24, baseGround - 18];
  for (let i = 0; i < treeXs.length; i++) {
    const tx = treeXs[i]!, ty = treeYs[i]!;
    A.line(c, [[tx, ty], [tx, ty - 28]], P.ink, li);
    A.poly(c, [[tx - 22, ty - 20], [tx, ty - 64], [tx + 22, ty - 20]], P.olive, P.ink, li);
    A.poly(c, [[tx - 17, ty - 42], [tx, ty - 78], [tx + 17, ty - 42]], P.oliveLight, P.ink, li);
  }
  c.restore();
}

/** Nền bản đồ chiến thuật nhìn từ trên xuống (TOP-DOWN) cho Chương 5 & Chương 6. */
export function drawBgTacticalMapTop(c: CanvasRenderingContext2D) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  drawBgSkyGrid(c, -1600, -1000, 3200, 2000, 100);

  // Khe thung lũng uốn lượn từ trái sang phải
  A.poly(c, [
    [-1100, -480], [-450, -420], [180, -470], [880, -420],
    [880, 440], [180, 480], [-450, 410], [-1100, 460],
  ], P.bg2, null, 0);

  // Đường bình độ (contour lines) của 2 dãy đồi kẹp hai bên thung lũng
  // Đồi Bắc (trên)
  A.ellipse(c, -260, -340, 360, 150, -0.12, P.light, P.slate, li);
  A.ellipse(c, -250, -345, 220, 85, -0.12, P.bg, P.slate, li);
  // Đồi Trung tâm (nơi Gunship nấp / MANPADS phục kích)
  A.ellipse(c, 160, 80, 240, 145, 0.18, P.light, P.slate, li);
  A.ellipse(c, 165, 82, 140, 80, 0.18, P.bg, P.slate, li);
  // Cao điểm Đông (phải - nơi đặt Radar & Thiết giáp địch)
  A.ellipse(c, 670, -120, 230, 175, -0.08, P.light, P.slate, li);
  A.ellipse(c, 675, -120, 130, 95, -0.08, P.bg, P.slate, li);

  // Cụm tán cây nhìn từ trên xuống dọc sườn thung lũng
  const groves: [number, number, number][] = [
    [-640, -110, 34], [-580, -85, 26], [-480, 160, 32],
    [-120, 210, 36], [-60, 235, 28],
    [250, -140, 38], [310, -115, 30], [285, -175, 26],
    [350, 220, 34], [410, 200, 26],
  ];
  for (const [gx, gy, gr] of groves) {
    A.circle(c, gx, gy, gr, P.olive, P.ink, li);
    A.circle(c, gx - gr * 0.25, gy - gr * 0.2, gr * 0.55, P.oliveLight, null, 0);
  }
  c.restore();
}

// ============================================================================
// 2. TRỰC THĂNG ĐA DỤNG CHỦ ĐẠO (MAIN HELICOPTER — SIDE / TOP / CUTAWAY / FRONT)
// ============================================================================

export interface HeliOpts {
  view?: ViewAngle;
  scale?: number;
  rotorAngle?: number;       // Góc quay cánh chính (rad)
  tailRotorAngle?: number;   // Góc quay cánh quạt đuôi (rad)
  discTilt?: number;         // Nghiêng đĩa rotor (-1..1, dương = chúc mũi tiến tới)
  collectivePitch?: number;  // Độ mở góc cánh chung (0..1)
  showGearboxCutaway?: boolean; // Mở mặt cắt động cơ + hộp số
  powerFlow?: number;        // 0..1 tô nổi luồng công suất amber
  tailDamaged?: boolean;     // Cánh quạt đuôi bị bắn hỏng
  highlightMaint?: boolean;  // Tô nổi 4 cụm bảo dưỡng (Chương 3)
  combatHits?: {
    seatArmor?: boolean;
    selfSealingTank?: boolean;
    dryGearbox?: boolean;
    rotorHit?: boolean;
  };
  slingLoad?: number;        // 0..1 hiện dây cáp + thùng hàng treo dưới bụng
  loadFrac?: number;         // Tỷ lệ thùng hàng (1 = full, 0.5 = nửa tải)
}

export function drawHeli(c: CanvasRenderingContext2D, opts: HeliOpts = {}) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  c.save();
  c.scale(s, s);
  if (view === 'top') {
    drawHeliTop(c, opts);
  } else if (view === 'front') {
    drawHeliFront(c, opts);
  } else {
    drawHeliSideOrCutaway(c, opts, view === 'cutaway');
  }
  c.restore();
}

function drawHeliSideOrCutaway(c: CanvasRenderingContext2D, opts: HeliOpts, isFullCutaway: boolean) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  const rotorA = opts.rotorAngle ?? 0;
  const tailA = opts.tailRotorAngle ?? rotorA * 3.5;
  const tilt = (opts.discTilt ?? 0) * 0.16;
  const pitch = opts.collectivePitch ?? 0.45;
  const showMech = isFullCutaway || !!opts.showGearboxCutaway || !!opts.highlightMaint;

  // --- 0. Dây cáp và thùng hàng treo dưới bụng (nếu có) ---
  if ((opts.slingLoad ?? 0) > 0.01) {
    const a = A.clamp01(opts.slingLoad ?? 0);
    const lf = opts.loadFrac ?? 1;
    A.withA(c, a, () => {
      A.line(c, [[0, 52], [-28, 125], [28, 125], [0, 52]], P.ink, li);
      const bw = 96 * (0.65 + 0.35 * lf);
      const bh = 58 * (0.65 + 0.35 * lf);
      A.rrect(c, -bw / 2, 125, bw, bh, 6, P.sand, P.ink, lo);
      A.line(c, [[-bw / 2 + 12, 125], [-bw / 2 + 12, 125 + bh]], P.ink2, li);
      A.line(c, [[bw / 2 - 12, 125], [bw / 2 - 12, 125 + bh]], P.ink2, li);
    });
  }

  // --- 1. Càng đáp (Landing gear) ---
  A.line(c, [[48, 48], [62, 78]], P.ink, lo);
  A.line(c, [[22, 48], [62, 78]], P.ink, li);
  A.circle(c, 62, 82, 13, P.dark, P.ink, lo);
  A.circle(c, 62, 82, 5, P.light, P.ink, li);

  A.line(c, [[-110, 42], [-132, 76]], P.ink, lo);
  A.circle(c, -132, 80, 10, P.dark, P.ink, lo);

  // --- 2. Dầm đuôi (Tail boom) & Cánh đứng ---
  A.poly(c, [
    [-95, -24],
    [-255, -18],
    [-292, -78],
    [-268, -82],
    [-232, -32],
    [-95, 16],
  ], P.olive, P.ink, lo);
  // Nắp trên dầm đuôi
  A.poly(c, [
    [-95, -24],
    [-255, -18],
    [-250, -10],
    [-95, -12],
  ], P.oliveLight, P.ink, li);
  // Cánh ngang ở đuôi (stabilator)
  A.rrect(c, -286, -24, 38, 10, 3, P.oliveDark, P.ink, li);

  // --- 3. Thân chính (Fuselage) ---
  A.poly(c, [
    [-105, -34],
    [82, -34],
    [138, -8],
    [156, 22],
    [142, 46],
    [-88, 48],
    [-112, 16],
  ], P.olive, P.ink, lo);

  // Sống lưng và bầu động cơ phía trên cabin
  A.poly(c, [
    [-86, -34],
    [-64, -64],
    [54, -64],
    [76, -34],
  ], P.oliveLight, P.ink, lo);
  // Cửa hút khí tuabin và ống xả
  A.rrect(c, 32, -58, 26, 16, 4, P.dark, P.ink, li);
  A.rrect(c, -74, -56, 24, 14, 4, P.slate, P.ink, li);

  // Kính buồng lái phía mũi (hướng phải +x)
  A.poly(c, [
    [78, -30],
    [132, -6],
    [144, 16],
    [82, 16],
  ], P.glass, P.ink, lo);
  A.line(c, [[108, -18], [108, 16]], P.ink, li);

  // Cửa khoang hàng và cửa sổ phụ (nếu không mở cutaway toàn phần)
  if (!isFullCutaway) {
    A.rrect(c, -48, -18, 86, 54, 5, P.oliveDark, P.ink, li);
    A.rrect(c, -36, -8, 26, 22, 3, P.glass, P.ink, li);
    A.rrect(c, 2, -8, 26, 22, 3, P.glass, P.ink, li);
  }

  // --- 4. Mặt cắt bên trong (Cutaway: Động cơ, Hộp số, Bình xăng, Ghế bọc giáp) ---
  if (showMech) {
    // Khung khoang cắt mở
    if (isFullCutaway) {
      A.rrect(c, -86, -26, 198, 66, 6, P.paper, P.ink, li);
    }
    // Bầu mở trên lưng cho Động cơ + Hộp số
    A.rrect(c, -60, -60, 114, 28, 5, P.paper, P.ink, li);

    // Động cơ tuabin (phía sau hộp số)
    const engFill = (opts.powerFlow ?? 0) > 0.1 ? P.amber : P.slate;
    A.rrect(c, -52, -55, 42, 18, 4, engFill, P.ink, li);
    // Trục nối động cơ -> hộp số
    A.line(c, [[-10, -46], [2, -46]], P.ink, lw(c, 3));

    // Hộp số chính (Main Gearbox) dưới chân trục rotor (x = 12, y = -46)
    const gbHighlight = opts.highlightMaint || opts.combatHits?.dryGearbox || (opts.powerFlow ?? 0) > 0.1;
    const gbFill = opts.combatHits?.dryGearbox ? P.amber : (gbHighlight ? P.amber : P.light);
    A.poly(c, [
      [-2, -34], [4, -58], [24, -58], [30, -34],
    ], gbFill, P.ink, li);
    // Cặp bánh răng côn ăn khớp bên trong hộp số
    A.circle(c, 14, -46, 7, P.paper, P.ink, lw(c, 1.8));
    // Trục truyền động dọc dầm đuôi ra cánh quạt đuôi
    A.line(c, [[-2, -42], [-96, -20], [-252, -16], [-276, -68]], gbHighlight ? P.amber : P.ink2, li, [8, 5]);

    if (isFullCutaway) {
      // Bình nhiên liệu tự liền (Self-sealing fuel tank) ở khoang sau (-78..-22)
      const tankHit = !!opts.combatHits?.selfSealingTank;
      A.rrect(c, -78, -16, 56, 48, 6, P.oliveLight, P.ink, li);
      // Mức nhiên liệu bên trong
      A.rrect(c, -73, -4, 46, 31, 4, P.amber, null, 0);
      // Lớp cao su tự liền quanh thành bình
      A.rrect(c, -78, -16, 56, 48, 6, null, tankHit ? P.amber : P.ink2, lw(c, tankHit ? 4 : 2));
      if (tankHit) {
        // Vết đạn xuyên đáy bình đang được hai mép cao su ép khít lại
        A.circle(c, -50, 32, 7, P.amber, P.ink, li);
      }

      // Ghế phi công giảm chấn + Tấm giáp chắn đạn (Armored energy-absorbing seat) ở x = 68..105
      const seatHit = !!opts.combatHits?.seatArmor;
      // Khung lò xo/ống giảm chấn dưới ghế
      A.line(c, [[82, 18], [82, 36]], P.slate, lw(c, 3));
      A.line(c, [[75, 24], [89, 24]], P.ink, li);
      A.line(c, [[75, 30], [89, 30]], P.ink, li);
      // Tấm giáp lưng và gầm ghế
      A.poly(c, [[68, -18], [76, -18], [76, 18], [102, 18], [102, 25], [68, 25]], seatHit ? P.amber : P.dark, P.ink, li);
      // Hình phi công giản lược ngồi trên ghế
      A.circle(c, 88, -12, 8, P.skin, P.ink, li);
      A.poly(c, [[82, -14], [95, -14], [93, -22], [82, -20]], P.oliveDark, P.ink, li); // mũ bay
      A.rrect(c, 78, -2, 16, 18, 4, P.olive, P.ink, li);
    }
  }

  // --- 5. Cụm Đầu Rotor (Rotor Head), Đĩa nghiêng (Swashplate) & Cánh chính ---
  c.save();
  c.translate(14, -64); // Tâm chân trục rotor trên lưng
  c.rotate(tilt);

  const hubHighlight = !!opts.highlightMaint;
  // Trục chính (Mast)
  A.rrect(c, -6, -34, 12, 34, 2, hubHighlight ? P.amber : P.slate, P.ink, lo);
  // Đĩa nghiêng (Swashplate) dưới đầu rotor
  A.rrect(c, -18, -18, 36, 8, 3, hubHighlight ? P.amber : P.light, P.ink, li);
  // Hai thanh kéo pitch links nối từ đĩa nghiêng lên gốc cánh
  A.line(c, [[-13, -18], [-15, -32]], P.amber, li);
  A.line(c, [[13, -18], [15, -32]], P.amber, li);
  // Đầu hub
  A.rrect(c, -14, -40, 28, 10, 4, hubHighlight ? P.amber : P.dark, P.ink, lo);

  // 4 lá cánh nhìn ngang: xoay theo rotorA
  for (let i = 0; i < 4; i++) {
    const a = rotorA + (i * Math.PI) / 2;
    const xTip = Math.cos(a) * 235;
    const zDepth = Math.sin(a); // -1..1
    const bladeY = -36 - Math.abs(xTip) * 0.015; // hơi võng/nâng nhẹ
    const bladeH = 6 + pitch * 8 * Math.abs(zDepth);
    const bladeFill = opts.highlightMaint ? P.amber : (zDepth >= 0 ? P.olive : P.oliveDark);
    A.poly(c, [
      [0, -36 - 3],
      [xTip, bladeY - bladeH / 2],
      [xTip, bladeY + bladeH / 2],
      [0, -36 + 3],
    ], bladeFill, P.ink, li);
    // Vạch sơn cảnh báo ở mút cánh
    if (Math.abs(xTip) > 45) {
      const xStripe = xTip * 0.88;
      A.line(c, [[xStripe, bladeY - bladeH / 2], [xStripe, bladeY + bladeH / 2]], P.amber, lw(c, 3));
    }
    // Lỗ đạn xuyên qua cánh (Chương 4 combatHits.rotorHit)
    if (opts.combatHits?.rotorHit && i === 0 && Math.abs(xTip) > 90) {
      A.circle(c, xTip * 0.55, bladeY, 5, P.enemy, P.ink, li);
    }
  }
  c.restore();

  // --- 6. Cánh quạt đuôi (Tail Rotor) tại (-278, -68) ---
  c.save();
  c.translate(-278, -68);
  if (opts.tailDamaged) {
    // Cánh quạt đuôi gãy toác + tia lửa đỏ gạch
    A.circle(c, 0, 0, 10, P.enemy, P.ink, li);
    for (let i = 0; i < 4; i++) {
      const a = tailA + (i * Math.PI) / 2;
      const r = i % 2 === 0 ? 14 : 9;
      A.line(c, [[0, 0], [Math.cos(a) * r, Math.sin(a) * r]], P.ink, lo);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const a = tailA + (i * Math.PI) / 2;
      const rx = Math.cos(a) * 34;
      const ry = Math.sin(a) * 34;
      A.capsule(c, [0, 0], [rx, ry], 6, P.oliveLight, P.ink, li);
      A.circle(c, rx * 0.85, ry * 0.85, 2.5, P.amber, null, 0);
    }
    A.circle(c, 0, 0, 7, P.dark, P.ink, li);
  }
  c.restore();
}

/** Trực thăng chủ đạo nhìn thẳng từ trên xuống (TOP-DOWN, mũi hướng sang phải +x). */
function drawHeliTop(c: CanvasRenderingContext2D, opts: HeliOpts) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  const rotorA = opts.rotorAngle ?? 0;

  // Dầm đuôi vươn sang trái (-x)
  A.poly(c, [
    [-85, -14],
    [-275, -6],
    [-275, 6],
    [-85, 14],
  ], P.olive, P.ink, lo);
  // Cánh ngang đuôi
  A.rrect(c, -268, -36, 22, 72, 3, P.oliveDark, P.ink, li);
  // Cánh quạt đuôi nhìn từ trên xuống (nằm bên hông đuôi y = -22)
  if (opts.tailDamaged) {
    A.circle(c, -272, -16, 11, P.enemy, P.ink, li);
  } else {
    const tailSpan = 26 * Math.abs(Math.cos(opts.tailRotorAngle ?? rotorA * 3.5));
    A.capsule(c, [-272 - tailSpan, -18], [-272 + tailSpan, -18], 5, P.amber, P.ink, li);
    A.circle(c, -272, -18, 5, P.dark, P.ink, li);
  }

  // Thân chính nhìn từ trên xuống
  A.poly(c, [
    [-95, -42],
    [75, -44],
    [138, -24],
    [156, 0],
    [138, 24],
    [75, 44],
    [-95, 42],
    [-112, 0],
  ], P.olive, P.ink, lo);
  // Nắp lưng động cơ
  A.rrect(c, -62, -26, 118, 52, 12, P.oliveLight, P.ink, li);
  // Kính mũi buồng lái
  A.poly(c, [
    [82, -34],
    [134, -20],
    [148, 0],
    [134, 20],
    [82, 34],
    [94, 0],
  ], P.glass, P.ink, li);

  // Vòng quét đĩa rotor mảnh
  c.save();
  c.translate(14, 0);
  A.circle(c, 0, 0, 235, null, 'rgba(30, 41, 59, 0.18)', li);

  // 4 lá cánh nhìn từ trên xuống
  for (let i = 0; i < 4; i++) {
    const a = rotorA + (i * Math.PI) / 2;
    c.save();
    c.rotate(a);
    A.rrect(c, 12, -9, 222, 18, 4, P.oliveLight, P.ink, lo);
    A.rrect(c, 206, -9, 24, 18, 2, P.amber, P.ink, li);
    c.restore();
  }
  // Hub trung tâm
  A.circle(c, 0, 0, 20, P.dark, P.ink, lo);
  A.circle(c, 0, 0, 8, P.oliveLight, P.ink, li);
  c.restore();
}

/** Trực thăng nhìn chính diện từ phía mũi (FRONT VIEW). */
function drawHeliFront(c: CanvasRenderingContext2D, opts: HeliOpts) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  const rotorA = opts.rotorAngle ?? 0;
  const tilt = (opts.discTilt ?? 0) * 0.18;

  // Càng đáp hai bên
  A.line(c, [[-44, 42], [-66, 78]], P.ink, lo);
  A.line(c, [[44, 42], [66, 78]], P.ink, lo);
  A.rrect(c, -74, 70, 16, 24, 4, P.dark, P.ink, lo);
  A.rrect(c, 58, 70, 16, 24, 4, P.dark, P.ink, lo);

  // Thân chính chính diện
  A.rrect(c, -64, -38, 128, 86, 24, P.olive, P.ink, lo);
  A.rrect(c, -42, -64, 84, 30, 10, P.oliveLight, P.ink, lo);
  // Hai cửa hút khí tuabin hai bên lưng
  A.circle(c, -26, -50, 9, P.dark, P.ink, li);
  A.circle(c, 26, -50, 9, P.dark, P.ink, li);
  // Kính chắn gió 2 bên
  A.rrect(c, -52, -24, 46, 34, 8, P.glass, P.ink, li);
  A.rrect(c, 6, -24, 46, 34, 8, P.glass, P.ink, li);

  // Đĩa rotor trên đỉnh
  c.save();
  c.translate(0, -64);
  c.rotate(tilt);
  A.rrect(c, -7, -34, 14, 34, 2, P.slate, P.ink, lo);
  for (let i = 0; i < 4; i++) {
    const a = rotorA + (i * Math.PI) / 2;
    const xTip = Math.cos(a) * 235;
    A.capsule(c, [0, -34], [xTip, -34], 8, P.oliveLight, P.ink, li);
  }
  A.circle(c, 0, -34, 12, P.dark, P.ink, lo);
  c.restore();
}

// ============================================================================
// 3. ĐĨA ROTOR BẤT ĐỐI XỨNG TOP-DOWN (CHƯƠNG 1 HOOK, CHƯƠNG 2 STALL, CHƯƠNG 6)
// ============================================================================

export interface AsymRotorOpts {
  rotorAngle: number;
  advHighlight?: number;    // 0..1 tô vùng cánh tiến (nửa trên, y < 0 khi bay sang phải và quay ngược chiều KĐH)
  retHighlight?: number;    // 0..1 tô vùng cánh lùi (nửa dưới, y > 0)
  sonicShock?: number;      // 0..1 gợn sóng xung kích ở mút cánh tiến
  rootStall?: number;       // 0..1 vùng gốc cánh lùi gần bằng 0 / thất tốc
  showHeroBlade?: boolean;  // Đánh dấu 1 lá cánh nổi bật để mắt bám theo
  forwardWindPhase?: number;// Pha các đường gió ngược từ phải sang trái
}

/**
 * Vẽ trực thăng TOP-DOWN bay sang phải (+x), rotor quay ngược chiều kim đồng hồ (trong hệ y hướng xuống của Canvas:
 * nửa trên y < 0 có cánh quét từ trái sang phải CÙNG chiều bay -> Cánh Tiến (Advancing Blade);
 * nửa dưới y > 0 có cánh quét từ phải sang trái NGƯỢC chiều bay -> Cánh Lùi (Retreating Blade)).
 */
export function drawAsymmetricRotorTop(c: CanvasRenderingContext2D, opts: AsymRotorOpts) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  const R = 250;
  const cx = 14, cy = 0;

  // 1. Luồng gió tương đối thổi từ Phải sang Trái (do trực thăng bay sang Phải)
  if (opts.forwardWindPhase !== undefined) {
    const wp = opts.forwardWindPhase;
    c.save();
    for (let row = -3; row <= 3; row++) {
      const wy = row * 95;
      const offset = ((wp * 340 + row * 70) % 420);
      for (let k = -1; k <= 2; k++) {
        const wx = 420 - k * 420 - offset;
        A.line(c, [[wx, wy], [wx - 95, wy]], P.sky, li);
        A.poly(c, [[wx - 105, wy], [wx - 88, wy - 6], [wx - 88, wy + 6]], P.sky, null, 0);
      }
    }
    c.restore();
  }

  // 2. Vùng quạt Nửa Trên (Advancing Blade — Cánh Tiến: V_rotor + V_heli)
  if ((opts.advHighlight ?? 0) > 0.01) {
    A.withA(c, (opts.advHighlight ?? 0) * 0.28, () => {
      c.beginPath();
      c.arc(cx, cy, R, Math.PI, Math.PI * 2);
      c.closePath();
      c.fillStyle = P.amber;
      c.fill();
    });
    // Vành mút cánh tiến sát ngưỡng âm thanh
    if ((opts.sonicShock ?? 0) > 0.01) {
      A.withA(c, opts.sonicShock ?? 0, () => {
        c.beginPath();
        c.arc(cx, cy, R, Math.PI * 1.15, Math.PI * 1.85);
        c.strokeStyle = P.enemy;
        c.lineWidth = lw(c, 8);
        c.stroke();
        // Gợn sóng nén Mach cone ở đỉnh mút cánh tiến (cx, cy - R)
        for (let k = 1; k <= 3; k++) {
          c.beginPath();
          c.arc(cx + 15 * k, cy - R, 22 * k, Math.PI * 0.75, Math.PI * 1.35);
          c.strokeStyle = k === 1 ? P.enemy : P.amber;
          c.lineWidth = li;
          c.stroke();
        }
      });
    }
  }

  // 3. Vùng quạt Nửa Dưới (Retreating Blade — Cánh Lùi: V_rotor - V_heli)
  if ((opts.retHighlight ?? 0) > 0.01) {
    A.withA(c, (opts.retHighlight ?? 0) * 0.25, () => {
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI);
      c.closePath();
      c.fillStyle = P.sky;
      c.fill();
    });
    // Vòng tròn vùng gốc (root) nơi vận tốc tương đối gần bằng 0 / thất tốc
    if ((opts.rootStall ?? 0) > 0.01) {
      A.withA(c, opts.rootStall ?? 0, () => {
        c.beginPath();
        c.arc(cx, cy, R * 0.48, 0.08 * Math.PI, 0.92 * Math.PI);
        c.closePath();
        c.fillStyle = 'rgba(56, 189, 248, 0.42)';
        c.fill();
        c.strokeStyle = P.sky;
        c.lineWidth = lw(c, 3.5);
        c.setLineDash([10, 8]);
        c.stroke();
        c.setLineDash([]);
      });
    }
  }

  // 4. Vẽ thân trực thăng bên dưới đĩa
  drawHeliTop(c, { rotorAngle: opts.rotorAngle });

  // 5. Vẽ đè lá cánh Hero (lá số 0) đổi màu trực tiếp theo vị trí nửa trên / nửa dưới
  if (opts.showHeroBlade) {
    const a = ((opts.rotorAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    // Trong hệ trục Canvas: sin(a) < 0 là nửa trên (cánh tiến), sin(a) > 0 là nửa dưới (cánh lùi)
    const isAdv = Math.sin(a) < 0;
    const heroColor = isAdv ? P.amber : P.sky;
    c.save();
    c.translate(cx, cy);
    c.rotate(a);
    A.rrect(c, 14, -12, R - 14, 24, 5, heroColor, P.ink, lo);
    // Mũi tên vận tốc tiếp tuyến ngay trên lá cánh Hero (+y_local = chiều tăng góc a: ở nửa trên y<0 hướng về mũi +x, ở nửa dưới y>0 hướng về đuôi -x)
    const arrowLen = isAdv ? 62 : 20;
    A.line(c, [[R * 0.65, 0], [R * 0.65, arrowLen]], P.ink, lw(c, 3.5));
    A.poly(c, [
      [R * 0.65, arrowLen + 13],
      [R * 0.65 - 8, arrowLen],
      [R * 0.65 + 8, arrowLen],
    ], P.ink, null, 0);
    c.restore();
  }
}

// ============================================================================
// 4. CỤM CƠ KHÍ ĐĨA NGHIÊNG (SWASHPLATE) & 3 CƠ CẤU LÁI (CHƯƠNG 3)
// ============================================================================

export interface SwashplateOpts {
  rotorAngle: number;
  collective: number; // -1..1 (nâng/hạ cả đĩa nghiêng)
  cyclicTilt: number; // -1..1 (nghiêng đĩa nghiêng trái/phải)
  highlightPlate?: boolean;
}

/**
 * Mặt cắt cơ khí cận cảnh Đầu Rotor & Đĩa Nghiêng (Swashplate) ở tỷ lệ lớn.
 * Người xem thấy rõ:
 * - Đĩa dưới tĩnh (stationary) nhận thanh đẩy Collective + Cyclic.
 * - Đĩa trên quay (rotating) trượt trên ổ bi, kéo 2 thanh Pitch Links làm xoay góc tấn của 2 lá cánh trái/phải.
 */
export function drawSwashplateMechanism(c: CanvasRenderingContext2D, opts: SwashplateOpts) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  const collY = -opts.collective * 38; // Collective nâng lên -> y âm
  const tiltRad = opts.cyclicTilt * 0.28;
  const rotA = opts.rotorAngle;

  c.save();
  // 1. Vỏ hộp số dưới chân trục
  A.poly(c, [[-110, 180], [-85, 110], [85, 110], [110, 180]], P.oliveLight, P.ink, lo);
  A.rrect(c, -65, 125, 130, 42, 6, P.paper, P.ink, li);
  // Bánh răng trong hộp số
  A.circle(c, -28, 146, 16, P.amber, P.ink, li);
  A.circle(c, 28, 146, 16, P.amber, P.ink, li);

  // 2. Trục chính (Main Rotor Mast) thẳng đứng ở giữa
  A.rrect(c, -18, -165, 36, 280, 4, P.slate, P.ink, lo);
  // Vạch sọc xoay trên trục để thấy trục đang quay
  const stripeOff = ((rotA / (Math.PI * 2)) * 36) % 36;
  for (let x = -14 + stripeOff; x <= 14; x += 18) {
    A.line(c, [[x, -150], [x, 105]], P.dark, li);
  }

  // 3. Hai thanh đẩy điều khiển từ buồng lái lên đĩa dưới (Control rods)
  const plateY = 18 + collY;
  const leftRodTopY = plateY - Math.sin(tiltRad) * 92 + 14;
  const rightRodTopY = plateY + Math.sin(tiltRad) * 92 + 14;
  // Thanh đẩy trái (Collective + Cyclic)
  A.capsule(c, [-92, 140], [-92, leftRodTopY], 10, P.amber, P.ink, li);
  A.circle(c, -92, leftRodTopY, 7, P.paper, P.ink, li);
  // Thanh đẩy phải (Collective - Cyclic)
  A.capsule(c, [92, 140], [92, rightRodTopY], 10, P.amber, P.ink, li);
  A.circle(c, 92, rightRodTopY, 7, P.paper, P.ink, li);

  // 4. Cụm Đĩa Nghiêng (Swashplate Assembly: Đĩa dưới tĩnh + Ổ bi + Đĩa trên quay)
  c.save();
  c.translate(0, plateY);
  c.rotate(tiltRad);
  // Khớp cầu trượt quanh trục (Spherical slider ball)
  A.circle(c, 0, 0, 34, P.light, P.ink, lo);
  // Đĩa dưới tĩnh (Stationary plate)
  A.rrect(c, -118, 2, 236, 18, 6, opts.highlightPlate ? P.amber : P.slate, P.ink, lo);
  // Lớp bi giữa hai đĩa
  for (let bx = -95; bx <= 95; bx += 24) {
    A.circle(c, bx, -2, 4.5, P.paper, P.ink, lw(c, 1.5));
  }
  // Đĩa trên quay (Rotating plate)
  A.rrect(c, -112, -18, 224, 16, 6, P.amber, P.ink, lo);
  c.restore();

  // 5. Thanh kéo Pitch Links nối từ Đĩa Trên lên Sừng chỉnh góc (Pitch Horn) của từng lá cánh
  const cosR = Math.cos(rotA);
  const sinR = Math.sin(rotA);
  // Điểm gắn trên đĩa quay cho cánh A (góc rotA) và cánh B (góc rotA + PI)
  for (const side of [-1, 1] as const) {
    const xAttach = side * 88 * cosR;
    const yAttach = plateY + Math.sin(tiltRad) * xAttach - 14;
    const hornX = side * 88 * cosR;
    const hubY = -148;
    // Độ nâng tại điểm gắn quyết định góc tấn của lá cánh đó!
    const localLift = -collY - Math.sin(tiltRad) * (side * 88 * cosR);
    const bladePitchDeg = 0.18 + (localLift / 55) * 0.42;

    // Thanh kéo Pitch Link
    A.capsule(c, [xAttach, yAttach], [hornX, hubY + 12], 7, P.amber, P.ink, li);
    A.circle(c, xAttach, yAttach, 5.5, P.paper, P.ink, li);
    A.circle(c, hornX, hubY + 12, 5.5, P.paper, P.ink, li);

    // Lá cánh và tiết diện góc tấn ở đầu mút
    const bladeLen = 250 * cosR;
    A.capsule(c, [0, hubY], [side * bladeLen, hubY - localLift * 0.22], 14, P.olive, P.ink, lo);

    // Mặt cắt cánh (airfoil) hiển thị ngay trên thân cánh để người xem ĐỌC ĐƯỢC góc tấn đang tăng hay giảm!
    const afX = side * 165;
    const afY = hubY - 38;
    c.save();
    c.translate(afX, afY);
    c.scale(side, 1);
    c.rotate(-bladePitchDeg);
    A.poly(c, [[-34, 0], [-18, -11], [32, -2], [34, 2], [-18, 9]], P.amber, P.ink, li);
    c.restore();
  }

  // Đầu Hub trung tâm
  A.rrect(c, -46, -168, 92, 28, 8, P.dark, P.ink, lo);
  A.circle(c, 0, -154, 10, P.oliveLight, P.ink, li);
  c.restore();
}

/** Mặt cắt cánh (Airfoil) độc lập cỡ lớn kèm đường dòng khí để giải thích lực nâng / thất tốc / tự quay. */
export interface AirfoilOpts {
  aoaRad?: number;          // Góc tấn (rad, dương = ngóc mũi cánh lên; mũi cánh ở bên phải +x)
  mode?: 'normal' | 'transonic' | 'stall' | 'autorotate';
  flowPhase?: number;
  scale?: number;
}

export function drawAirfoilCutaway(c: CanvasRenderingContext2D, opts: AirfoilOpts = {}) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  const s = opts.scale ?? 1;
  const aoa = opts.aoaRad ?? 0.18;
  const mode = opts.mode ?? 'normal';
  const fp = opts.flowPhase ?? 0;

  c.save();
  c.scale(s, s);

  // 1. Các đường dòng khí (Airflow streamlines)
  if (mode === 'autorotate') {
    // Luồng khí thổi ngược từ DƯỚI LÊN qua cánh giữ cánh tự quay
    for (let i = -2; i <= 2; i++) {
      const x = i * 52;
      const off = (fp * 140) % 70;
      A.line(c, [[x, 120 - off], [x + 18, -95 - off * 0.4]], P.sky, lw(c, 3));
      A.poly(c, [[x + 18, -108 - off * 0.4], [x + 10, -90 - off * 0.4], [x + 26, -90 - off * 0.4]], P.sky, null, 0);
    }
  } else {
    // Luồng khí thổi từ Phải sang Trái (vì mũi cánh hướng sang Phải +x)
    for (let i = -2; i <= 2; i++) {
      const yBase = i * 32;
      const deflect = mode === 'stall' && i < 0 ? -28 : 18;
      A.line(c, [[170, yBase], [20, yBase + (i < 0 ? -14 : 8)], [-165, yBase + deflect]], P.sky, lw(c, 2.8));
      A.poly(c, [[-175, yBase + deflect], [-158, yBase + deflect - 6], [-158, yBase + deflect + 6]], P.sky, null, 0);
    }
  }

  // 2. Sóng xung kích (Transonic shockwave) hoặc Xoáy thất tốc (Stall vortices)
  if (mode === 'transonic') {
    // Vệt sóng nén dựng đứng trên lưng cánh + rung lắc
    A.poly(c, [[15, -18], [32, -98], [-4, -92]], 'rgba(245, 158, 11, 0.35)', P.enemy, lw(c, 3.5));
    A.line(c, [[85, 0], [32, -88]], P.enemy, lw(c, 3.5));
    A.line(c, [[85, 0], [32, 82]], P.enemy, lw(c, 3.5));
  } else if (mode === 'stall') {
    // Các vòng xoáy tách dòng phía sau lưng cánh
    for (let k = 0; k < 3; k++) {
      const vx = -35 - k * 48;
      const vy = -26 - k * 12;
      const vr = 14 + k * 5;
      A.circle(c, vx, vy, vr, null, P.sky, li);
    }
  }

  // 3. Thân mặt cắt cánh (Mũi tròn bên phải +x, đuôi nhọn bên trái -x)
  c.save();
  c.rotate(-aoa);
  const bladeColor = mode === 'transonic' ? P.amber : (mode === 'stall' ? P.sky : P.oliveLight);
  A.poly(c, [
    [-115, 4],
    [-40, -22],
    [55, -24],
    [98, -8],
    [105, 4],
    [92, 14],
    [20, 14],
    [-115, 6],
  ], bladeColor, P.ink, lo);
  // Tâm trục spar bên trong cánh
  A.circle(c, 38, -4, 9, P.dark, P.ink, li);
  c.restore();
  c.restore();
}

// ============================================================================
// 5. CÁC DÒNG MÁY BAY ĐỐI CHIẾU (FIXED-WING, TANDEM, COAXIAL, GUNSHIP, TILT-ROTOR, TRUCK)
// ============================================================================

/** Máy bay cánh bằng (Fixed-wing plane, mũi hướng sang phải +x). */
export function drawFixedWingPlane(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'side', scale = 1, propAngle = 0) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.scale(scale, scale);

  if (view === 'top') {
    // Cánh chính dang rộng cố định
    A.poly(c, [[-18, -195], [32, -195], [52, 0], [32, 195], [-18, 195], [-8, 0]], P.light, P.ink, lo);
    // Cánh đuôi ngang
    A.poly(c, [[-155, -72], [-125, -72], [-115, 0], [-125, 72], [-155, 72]], P.slate, P.ink, lo);
    // Thân
    A.rrect(c, -165, -22, 315, 44, 22, P.paper, P.ink, lo);
    // Kính buồng lái
    A.poly(c, [[95, -15], [132, -8], [132, 8], [95, 15]], P.glass, P.ink, li);
  } else {
    // Bánh đáp
    A.line(c, [[8, 22], [8, 48]], P.ink, lo);
    A.circle(c, 8, 52, 9, P.dark, P.ink, li);
    A.line(c, [[95, 20], [95, 48]], P.ink, lo);
    A.circle(c, 95, 52, 8, P.dark, P.ink, li);
    // Cánh đứng đuôi
    A.poly(c, [[-158, -12], [-128, -74], [-96, -74], [-72, -12]], P.slate, P.ink, lo);
    // Thân máy bay
    A.poly(c, [
      [-158, -14], [98, -22], [148, 2], [138, 22], [-118, 22], [-158, 4],
    ], P.paper, P.ink, lo);
    // Kính buồng lái
    A.poly(c, [[88, -18], [132, -2], [132, 4], [88, 4]], P.glass, P.ink, li);
    // Cánh cố định bên hông
    A.poly(c, [[-28, 2], [48, -4], [56, 12], [-24, 14]], P.slate, P.ink, lo);
    // Cánh quạt mũi
    const pSpan = 28 * Math.abs(Math.cos(propAngle));
    A.capsule(c, [150, 2 - pSpan], [150, 2 + pSpan], 5, P.amber, P.ink, li);
  }
  c.restore();
}

/** Trực thăng Tandem 2 rotor trước-sau (CH-47 Chinook, Chương 2). */
export function drawTandemHeli(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'side', rotorA = 0, withLoad = true) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  if (view === 'top') {
    // Thân hộp dài
    A.rrect(c, -165, -38, 330, 76, 24, P.olive, P.ink, lo);
    A.rrect(c, 105, -28, 48, 56, 12, P.glass, P.ink, li);
    // 2 đĩa rotor quay ngược chiều nhau (trước: +rot, sau: -rot)
    for (const [rx, dir, col] of [[115, 1, P.amber], [-115, -1, P.sky]] as const) {
      c.save();
      c.translate(rx, 0);
      A.circle(c, 0, 0, 155, null, col, li);
      for (let i = 0; i < 3; i++) {
        const a = dir * rotorA + (i * Math.PI * 2) / 3;
        c.save();
        c.rotate(a);
        A.rrect(c, 10, -8, 142, 16, 4, P.oliveLight, P.ink, li);
        c.restore();
      }
      A.circle(c, 0, 0, 16, P.dark, P.ink, lo);
      c.restore();
    }
  } else {
    // Móc treo hàng nặng chính giữa bụng
    if (withLoad) {
      A.line(c, [[-35, 44], [0, 108], [35, 44]], P.ink, li);
      A.rrect(c, -62, 108, 124, 56, 6, P.sand, P.ink, lo);
      A.line(c, [[-20, 108], [-20, 164]], P.ink2, li);
      A.line(c, [[20, 108], [20, 164]], P.ink2, li);
    }
    // Bánh đáp trước & sau
    for (const wx of [-115, 98]) {
      A.circle(c, wx, 52, 11, P.dark, P.ink, lo);
    }
    // Thân dài với 2 trụ pylon trước và sau
    A.poly(c, [
      [-162, 34], [-162, -74], [-112, -74], [-88, -30],
      [78, -30], [98, -68], [138, -68], [164, 4], [152, 44], [-145, 44],
    ], P.olive, P.ink, lo);
    A.rrect(c, -135, -18, 240, 26, 6, P.oliveLight, P.ink, li);
    A.poly(c, [[122, -26], [156, 0], [156, 16], [122, 16]], P.glass, P.ink, li);
    // 2 Rotor trước & sau
    for (const [rx, ry, dir] of [[118, -74, 1], [-136, -80, -1]] as const) {
      for (let i = 0; i < 3; i++) {
        const a = dir * rotorA + (i * Math.PI * 2) / 3;
        const xTip = Math.cos(a) * 165;
        A.capsule(c, [rx, ry], [rx + xTip, ry - 4], 7, P.oliveLight, P.ink, li);
      }
      A.circle(c, rx, ry, 9, P.dark, P.ink, lo);
    }
  }
  c.restore();
}

/** Trực thăng Coaxial 2 tầng rotor đồng trục (Ka-52, Chương 2). */
export function drawCoaxialHeli(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'side', rotorA = 0) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  if (view === 'top') {
    A.rrect(c, -125, -32, 235, 64, 24, P.olive, P.ink, lo);
    A.rrect(c, -45, -75, 42, 150, 6, P.oliveDark, P.ink, li);
    // 2 tầng cánh quay ngược chiều nhau trên cùng tâm (0, 0)
    for (const [dir, col] of [[1, P.oliveLight], [-1, P.amber]] as const) {
      for (let i = 0; i < 3; i++) {
        const a = dir * rotorA + (i * Math.PI * 2) / 3;
        c.save();
        c.rotate(a);
        A.rrect(c, 12, -7, 175, 14, 4, col, P.ink, li);
        c.restore();
      }
    }
    A.circle(c, 0, 0, 18, P.dark, P.ink, lo);
  } else {
    // Càng đáp
    A.circle(c, 55, 52, 9, P.dark, P.ink, lo);
    A.circle(c, -45, 52, 10, P.dark, P.ink, lo);
    // Đuôi ngắn gọn có 2 cánh đứng nhỏ, KHÔNG có cánh quạt đuôi
    A.poly(c, [[-65, -18], [-152, -12], [-168, -54], [-140, -54], [-128, -18], [-65, 14]], P.olive, P.ink, lo);
    // Thân gọn
    A.poly(c, [[-75, -30], [65, -30], [122, 4], [108, 40], [-75, 40]], P.olive, P.ink, lo);
    A.poly(c, [[52, -26], [108, 2], [108, 14], [52, 14]], P.glass, P.ink, li);
    // Trục cao mang 2 tầng rotor xếp chồng lên nhau
    A.rrect(c, -6, -98, 12, 68, 2, P.slate, P.ink, lo);
    for (const [ry, dir, col] of [[-62, 1, P.oliveLight], [-94, -1, P.amber]] as const) {
      for (let i = 0; i < 3; i++) {
        const a = dir * rotorA + (i * Math.PI * 2) / 3;
        const xTip = Math.cos(a) * 185;
        A.capsule(c, [0, ry], [xTip, ry], 7, col, P.ink, li);
      }
      A.rrect(c, -12, ry - 5, 24, 10, 3, P.dark, P.ink, li);
    }
  }
  c.restore();
}

/** Trực thăng vũ trang Gunship (AH-64 Apache, Chương 4 & 5). */
export function drawGunship(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'side', rotorA = 0, scale = 1) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.scale(scale, scale);
  if (view === 'top') {
    // Dầm đuôi
    A.poly(c, [[-65, -10], [-215, -5], [-215, 5], [-65, 10]], P.oliveDark, P.ink, lo);
    // Cánh ngắn mang vũ khí hai bên hông
    A.rrect(c, -22, -98, 44, 196, 6, P.olive, P.ink, lo);
    // Ống phóng rocket & tên lửa treo dưới cánh
    for (const sy of [-78, -52, 52, 78]) {
      A.rrect(c, -10, sy - 6, 42, 12, 3, P.dark, P.ink, li);
    }
    // Thân hẹp dài
    A.poly(c, [[-75, -26], [85, -24], [135, 0], [85, 24], [-75, 26]], P.oliveDark, P.ink, lo);
    A.rrect(c, 22, -14, 72, 28, 6, P.glass, P.ink, li);
    // Rotor 4 cánh
    for (let i = 0; i < 4; i++) {
      const a = rotorA + (i * Math.PI) / 2;
      c.save();
      c.rotate(a);
      A.rrect(c, 10, -8, 185, 16, 3, P.olive, P.ink, li);
      c.restore();
    }
    A.circle(c, 0, 0, 16, P.dark, P.ink, lo);
  } else {
    // Bánh đáp & Pháo tự động dưới cằm
    A.line(c, [[38, 32], [48, 58]], P.ink, lo);
    A.circle(c, 48, 60, 8, P.dark, P.ink, li);
    A.rrect(c, 72, 34, 18, 12, 3, P.dark, P.ink, li);
    A.line(c, [[90, 40], [126, 42]], P.ink, lw(c, 3.5)); // nòng pháo 30mm

    // Đuôi và cánh quạt đuôi
    A.poly(c, [[-68, -16], [-212, -10], [-236, -58], [-215, -60], [-192, -20], [-68, 12]], P.oliveDark, P.ink, lo);
    A.circle(c, -224, -46, 22, null, P.ink, li);

    // Thân góc cạnh chiến đấu
    A.poly(c, [
      [-75, -24], [42, -28], [108, -4], [132, 16], [118, 34], [-68, 34],
    ], P.oliveDark, P.ink, lo);
    // Buồng lái 2 tầng kính phẳng
    A.poly(c, [[24, -26], [62, -26], [106, -4], [106, 10], [24, 10]], P.glass, P.ink, lo);
    A.line(c, [[64, -26], [64, 10]], P.ink, li);
    // Cánh phụ bên hông + cụm tên lửa
    A.rrect(c, -18, 6, 46, 12, 3, P.olive, P.ink, li);
    A.rrect(c, -12, 18, 48, 14, 4, P.amber, P.ink, li);

    // Rotor chính
    A.rrect(c, -5, -54, 10, 26, 2, P.slate, P.ink, lo);
    for (let i = 0; i < 4; i++) {
      const a = rotorA + (i * Math.PI) / 2;
      const xTip = Math.cos(a) * 195;
      A.capsule(c, [0, -54], [xTip, -54], 7, P.olive, P.ink, li);
    }
    A.circle(c, 0, -54, 9, P.dark, P.ink, lo);
  }
  c.restore();
}

/** Máy bay lai Tilt-rotor (V-22 Osprey, Chương 6). nacelleDeg: 90 = dựng đứng như trực thăng, 0 = xoay ngang như máy bay. */
export function drawTiltRotor(c: CanvasRenderingContext2D, nacelleDeg = 90, rotorA = 0, scale = 1) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.scale(scale, scale);

  // Bánh đáp
  A.circle(c, -25, 56, 10, P.dark, P.ink, lo);
  A.circle(c, 92, 56, 9, P.dark, P.ink, lo);

  // Đuôi chữ H (2 cánh đứng ở đuôi)
  A.poly(c, [[-95, -18], [-168, -14], [-182, -68], [-152, -68], [-138, -18], [-95, 16]], P.olive, P.ink, lo);

  // Thân chính
  A.poly(c, [
    [-112, -32], [82, -32], [136, -6], [148, 22], [132, 46], [-102, 46],
  ], P.olive, P.ink, lo);
  A.poly(c, [[82, -28], [130, -4], [138, 16], [82, 16]], P.glass, P.ink, lo);

  // Gốc cánh chính trên lưng
  A.rrect(c, -26, -42, 68, 22, 6, P.oliveLight, P.ink, lo);

  // Bầu động cơ xoay (Nacelle) ở đầu mút cánh (tâm xoay tại x = 12, y = -32)
  c.save();
  c.translate(12, -32);
  const rad = -(nacelleDeg * Math.PI) / 180; // 90 deg -> hướng thẳng lên (-PI/2); 0 deg -> hướng sang phải (0)
  c.rotate(rad);
  // Thân bầu động cơ nacelle
  A.rrect(c, -24, -22, 86, 44, 10, P.amber, P.ink, lo);
  A.circle(c, 0, 0, 11, P.dark, P.ink, li);
  // Cánh quạt cực lớn ở đầu nacelle (x = 66)
  for (let i = 0; i < 3; i++) {
    const a = rotorA + (i * Math.PI * 2) / 3;
    const span = Math.sin(a) * 138;
    A.capsule(c, [66, 0], [66, span], 9, P.oliveLight, P.ink, li);
    A.circle(c, 66, span * 0.88, 3.5, P.amber, null, 0);
  }
  A.poly(c, [[62, -14], [84, 0], [62, 14]], P.dark, P.ink, li);
  c.restore();

  c.restore();
}

/** Xe tải quân sự (Chương 6 — "closer to a truck than to a fighter"). */
export function drawMilitaryTruck(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'side', scale = 1) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.scale(scale, scale);
  if (view === 'top') {
    A.rrect(c, -95, -42, 125, 84, 6, P.sand, P.ink, lo);
    A.rrect(c, 32, -38, 56, 76, 8, P.olive, P.ink, lo);
    A.rrect(c, 62, -30, 18, 60, 4, P.glass, P.ink, li);
  } else {
    // Khung gầm
    A.rrect(c, -102, 18, 196, 14, 3, P.dark, P.ink, lo);
    // Thùng bạt chở hàng phía sau
    A.rrect(c, -100, -48, 126, 68, 6, P.sand, P.ink, lo);
    for (const sx of [-68, -36, -4]) {
      A.line(c, [[sx, -48], [sx, 18]], P.ink2, li);
    }
    // Cabin xe tải phía trước
    A.poly(c, [[28, -36], [68, -36], [82, -10], [96, -6], [96, 20], [28, 20]], P.olive, P.ink, lo);
    A.poly(c, [[48, -30], [66, -30], [76, -10], [48, -10]], P.glass, P.ink, li);
    // 3 bánh xe lớn
    for (const wx of [-72, -26, 66]) {
      A.circle(c, wx, 32, 20, P.dark, P.ink, lo);
      A.circle(c, wx, 32, 9, P.light, P.ink, li);
    }
  }
  c.restore();
}

// ============================================================================
// 6. ĐỘNG CƠ TUABIN CẮT DỌC, HẠT CHÒ, TRẠM RADAR & XẠ THỦ MANPADS (CHƯƠNG 3, 4, 5)
// ============================================================================

/** Mặt cắt Động cơ Tuabin & Bộ lọc tách hạt cát (Chương 4 Brownout). */
export function drawTurbineCutaway(c: CanvasRenderingContext2D, rotorA: number, sandDamage = 0, useSeparator = false) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();

  // Vỏ ngoài ống dẫn khí tuabin (cửa hút bên phải +x, buồng đốt ở giữa, xả bên trái -x)
  A.poly(c, [
    [-210, -58], [160, -78], [220, -92],
    [220, 92], [160, 78], [-210, 58],
  ], P.paper, P.ink, lo);

  // Nếu bật Bộ tách hạt (Particle Separator): ống tách nhánh đẩy cát văng ra cửa phụ phía dưới
  if (useSeparator) {
    A.poly(c, [[120, 48], [45, 132], [-15, 132], [65, 48]], P.light, P.ink, lo);
    // Vách chắn quán tính ở cửa hút
    A.rrect(c, 115, -48, 22, 96, 8, P.amber, P.ink, lo);
  }

  // Củ trục trung tâm
  const coreColor = sandDamage > 0.3 ? A.lerpColor(P.slate, P.enemy, sandDamage) : P.slate;
  A.poly(c, [[-195, -24], [110, -28], [168, 0], [110, 28], [-195, 24]], coreColor, P.ink, lo);

  // 3 tầng cánh nén (Compressor blades) quay nhanh
  for (let stage = 0; stage < 3; stage++) {
    const sx = 82 - stage * 42;
    const h = 66 - stage * 6;
    const phase = Math.sin(rotorA * 3 + stage * 1.1);
    const bladeCol = sandDamage > 0.2 ? A.lerpColor(P.oliveLight, P.enemy, sandDamage) : P.oliveLight;
    A.rrect(c, sx - 8, -h, 16, h * 2, 3, bladeCol, P.ink, li);
    A.line(c, [[sx, -h + 8], [sx, h - 8]], P.ink, lw(c, 2 + Math.abs(phase) * 2));
  }

  // Buồng đốt (Combustor) rực lửa amber
  A.rrect(c, -118, -54, 62, 24, 8, P.amber, P.ink, li);
  A.rrect(c, -118, 30, 62, 24, 8, P.amber, P.ink, li);

  // Tầng tuabin cuối
  A.rrect(c, -168, -52, 18, 104, 3, sandDamage > 0.4 ? P.enemy : P.dark, P.ink, li);
  c.restore();
}

/** Hạt chò / thích (Sycamore seed) tự quay khi rơi cho Chương 3 Autorotation. */
export function drawSycamoreSeed(c: CanvasRenderingContext2D, angle: number, scale = 1) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.scale(scale, scale);
  const span = Math.cos(angle) * 78;
  // Cánh mỏng của hạt chò
  A.poly(c, [
    [0, 0],
    [span * 0.35, -18],
    [span, -12],
    [span * 0.85, 6],
    [0, 8],
  ], P.amber, P.ink, lo);
  // Gân cánh
  A.line(c, [[0, 2], [span * 0.82, -8]], P.ink2, li);
  // Đầu hạt nặng ở tâm xoay
  A.circle(c, 0, 4, 11, P.oliveDark, P.ink, lo);
  c.restore();
}

/** Trạm Radar phòng không đối phương (Chương 5). */
export function drawRadarStation(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'side', dishAngle = 0, scale = 1) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.scale(scale, scale);
  if (view === 'top') {
    A.rrect(c, -32, -26, 64, 52, 6, P.enemy, P.ink, lo);
    c.save();
    c.rotate(dishAngle);
    A.ellipse(c, 0, 0, 12, 34, 0, P.enemyLight, P.ink, lo);
    A.line(c, [[0, 0], [-22, 0]], P.ink, li);
    c.restore();
  } else {
    // Xe/bệ đài radar
    A.rrect(c, -44, -26, 88, 34, 5, P.enemy, P.ink, lo);
    A.circle(c, -26, 12, 10, P.dark, P.ink, li);
    A.circle(c, 26, 12, 10, P.dark, P.ink, li);
    // Trụ và chảo radar hướng sang trái (-x)
    A.rrect(c, -8, -54, 16, 28, 2, P.dark, P.ink, li);
    c.save();
    c.translate(0, -64);
    c.beginPath();
    c.arc(8, 0, 28, Math.PI * 0.62, Math.PI * 1.38);
    c.strokeStyle = P.ink;
    c.lineWidth = lo;
    c.stroke();
    A.line(c, [[-12, 0], [-30, -6]], P.enemy, lw(c, 3));
    c.restore();
  }
  c.restore();
}

/** Xe thiết giáp mục tiêu đối phương (Chương 5). */
export function drawArmorTarget(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'side', destroyed = false, scale = 1) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.scale(scale, scale);
  const bodyCol = destroyed ? P.dark : P.enemy;
  const topCol = destroyed ? P.slate : P.enemyLight;
  if (view === 'top') {
    A.rrect(c, -46, -26, 92, 52, 6, bodyCol, P.ink, lo);
    A.circle(c, 0, 0, 18, topCol, P.ink, lo);
    A.line(c, [[0, 0], [-56, 0]], P.ink, lo);
  } else {
    A.rrect(c, -52, -4, 104, 22, 10, P.dark, P.ink, lo);
    A.poly(c, [[-56, -4], [-44, -22], [44, -22], [56, -4]], bodyCol, P.ink, lo);
    A.poly(c, [[-22, -22], [-14, -38], [18, -38], [26, -22]], topCol, P.ink, lo);
    A.line(c, [[-14, -30], [-68, -34]], P.ink, lo);
  }
  c.restore();
}

/** Xạ thủ vác tên lửa phòng không MANPADS (Chương 5). */
export function drawManpadsTeam(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'side', aimAngle = -0.65, scale = 1) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.scale(scale, scale);
  if (view === 'top') {
    A.circle(c, 0, 0, 16, P.enemy, P.ink, lo);
    c.save();
    c.rotate(aimAngle);
    A.rrect(c, -18, -16, 54, 10, 3, P.dark, P.ink, li);
    A.rrect(c, 26, -18, 12, 14, 2, P.amber, P.ink, li);
    c.restore();
  } else {
    // Chân và thân lính đứng ngắm
    A.line(c, [[-8, 0], [-14, 28]], P.ink, lo);
    A.line(c, [[8, 0], [14, 28]], P.ink, lo);
    A.rrect(c, -11, -28, 22, 30, 6, P.enemy, P.ink, lo);
    A.circle(c, 0, -38, 10, P.skin, P.ink, li);
    A.poly(c, [[-11, -40], [11, -40], [9, -50], [-9, -50]], P.enemy, P.ink, li);
    // Ống phóng tên lửa vác vai (MANPADS tube)
    c.save();
    c.translate(0, -26);
    c.rotate(aimAngle);
    A.rrect(c, -28, -10, 76, 11, 3, P.dark, P.ink, lo);
    A.rrect(c, 36, -13, 14, 17, 3, P.amber, P.ink, li); // đầu dò nhiệt
    c.restore();
  }
  c.restore();
}

/** Tên lửa đang bay kèm luồng lửa đuôi. */
export function drawMissileInFlight(c: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string = P.amber) {
  const lo = lw(c, LINE.outer);
  const li = lw(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  // Luồng lửa đuôi
  A.poly(c, [[-22, 0], [-54, -9], [-42, 0], [-54, 9]], P.amber, null, 0);
  // Thân tên lửa
  A.rrect(c, -22, -5, 38, 10, 3, P.paper, P.ink, lo);
  A.poly(c, [[16, -5], [28, 0], [16, 5]], color, P.ink, li);
  c.restore();
}

/** Vụ nổ 2D rõ nét (dùng đúng lúc tên lửa/đạn chạm mục tiêu, khớp với sfx boom). */
export function drawExplosion2D(c: CanvasRenderingContext2D, x: number, y: number, p: number, maxR = 85) {
  if (p <= 0 || p >= 1) return;
  const li = lw(c, LINE.inner);
  const r = maxR * A.eo(p, 0, 1);
  const alpha = 1 - A.ei(p, 0.35, 1);
  A.withA(c, alpha, () => {
    // Vòng khói ngoài
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + 0.2;
      const dist = r * 0.65;
      A.circle(c, x + Math.cos(a) * dist, y + Math.sin(a) * dist, r * 0.42, P.enemyLight, P.ink, li);
    }
    // Lõi lửa trong
    A.circle(c, x, y, r * 0.58, P.amber, P.enemy, lw(c, 3));
    A.circle(c, x, y, r * 0.28, P.paper, null, 0);
  });
}
