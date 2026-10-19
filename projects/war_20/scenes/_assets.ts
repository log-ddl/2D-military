// scenes/_assets.ts — Toàn bộ vật thể và nền của project war_20.
// Tuân thủ code-video-2d: đường bao rõ (LINE.outer / LINE.inner), màu từ bảng P (palette.ts),
// mỗi vật một hàm nhận góc nhìn ('top' | 'side' | 'cutaway' | 'closeup' | 'belly' | 'front').
import * as A from './shared/art';
import { P, LINE } from './shared/palette';
import { type Cam, view } from './shared/camera';

export type ViewMode = 'top' | 'side' | 'cutaway' | 'closeup' | 'belly' | 'front';

// ── Helper nét vẽ chuẩn theo scale hiện tại ───────────────────────
export const lwO = (c: CanvasRenderingContext2D) => A.px(c, LINE.outer);
export const lwI = (c: CanvasRenderingContext2D) => A.px(c, LINE.inner);

// ── 1. NỀN KHÔNG GIAN (BẢN ĐỒ ĐẠI DƯƠNG, BẦU TRỜI, ĐƯỜNG BĂNG) ──

/** Nền bản đồ đại dương (TOP): Đại Tây Dương (Ascension -> Falklands) hoặc Thái Bình Dương */
export function drawOceanMapBg(
  c: CanvasRenderingContext2D,
  cam: Cam,
  theater: 'atlantic' | 'pacific',
  t = 0
) {
  const v = view(cam, 120);
  // Mặt biển sáng dịu
  c.fillStyle = P.bg2;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);

  // Lưới kinh vĩ độ mảnh
  const step = 160;
  c.strokeStyle = 'rgba(71, 85, 105, 0.12)';
  c.lineWidth = A.px(c, 1.5);
  c.beginPath();
  for (let x = Math.floor(v.x0 / step) * step; x <= v.x1; x += step) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  for (let y = Math.floor(v.y0 / step) * step; y <= v.y1; y += step) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  c.stroke();

  const lo = lwO(c);
  const li = lwI(c);

  if (theater === 'atlantic') {
    // Mốc 1: Đảo núi lửa Ascension ở phía Bắc (-480, -340)
    c.save();
    c.translate(-480, -340);
    A.poly(
      c,
      [
        [-58, -18],
        [-18, -46],
        [36, -34],
        [54, 12],
        [18, 42],
        [-42, 28],
      ],
      P.sand,
      P.ink,
      lo
    );
    // Miệng núi lửa + đường băng Ascension
    A.circle(c, -12, -8, 16, P.oliveLight, P.ink2, li);
    A.circle(c, -12, -8, 6, P.enemyLight, P.ink2, li);
    A.rrect(c, 4, 8, 36, 8, 2, P.dark, P.white, li * 0.7);
    c.restore();

    // Mốc 2: Quần đảo Falkland ở phía Nam (480, 340)
    c.save();
    c.translate(480, 340);
    // Đông Falkland & Tây Falkland
    A.poly(
      c,
      [
        [-95, -25],
        [-45, -52],
        [-15, -18],
        [-35, 34],
        [-88, 22],
      ],
      P.sand,
      P.ink,
      lo
    );
    A.poly(
      c,
      [
        [-4, -38],
        [68, -48],
        [98, -8],
        [82, 42],
        [12, 36],
        [-8, 4],
      ],
      P.sand,
      P.ink,
      lo
    );
    // Đường băng mục tiêu Port Stanley ở mũi Đông
    A.rrect(c, 28, -12, 54, 12, 3, P.dark, P.white, li);
    A.line(c, [[34, -6], [76, -6]], P.white, li * 0.8, [A.px(c, 5), A.px(c, 4)]);
    c.restore();

    // Đường mờ bờ biển Nam Mỹ bên trái và Châu Phi bên phải để định vị đại dương
    A.poly(
      c,
      [
        [-1150, -150],
        [-920, -40],
        [-880, 180],
        [-980, 520],
        [-1150, 580],
      ],
      '#dce4d0',
      P.ink2,
      li
    );
    A.poly(
      c,
      [
        [960, -560],
        [820, -320],
        [920, -80],
        [1120, 120],
        [1180, -560],
      ],
      '#dce4d0',
      P.ink2,
      li
    );
  } else {
    // Chiến trường Thái Bình Dương (TOP): Căn cứ bên trái (-760, 0), biển rộng ở giữa, căn cứ/bờ đối phương bên phải (+780, 0)
    A.poly(
      c,
      [
        [-1150, -580],
        [-690, -460],
        [-640, -120],
        [-680, 180],
        [-750, 560],
        [-1150, 580],
      ],
      '#dce4d0',
      P.ink,
      lo
    );
    // Đường băng căn cứ không quân bên trái
    A.rrect(c, -760, -24, 76, 18, 4, P.dark, P.white, li);
    A.line(c, [[-750, -15], [-694, -15]], P.white, li * 0.8, [A.px(c, 5), A.px(c, 4)]);

    // Chuỗi đảo/bờ đối phương phía xa bên phải (+780)
    A.poly(
      c,
      [
        [740, -260],
        [830, -180],
        [810, 40],
        [750, 220],
        [890, 380],
        [1100, 420],
        [1100, -380],
      ],
      P.sand,
      P.ink,
      lo
    );
    // Vài sóng nước nhẹ tĩnh định theo t
    for (let i = 0; i < 8; i++) {
      const wx = -420 + (i % 4) * 280 + Math.sin(t * 0.6 + i) * 14;
      const wy = -260 + Math.floor(i / 4) * 480;
      A.line(c, [[wx - 28, wy], [wx + 28, wy]], 'rgba(56, 189, 248, 0.28)', li);
    }
  }
}

/** Nền bầu trời nhìn ngang (SIDE): có dải mây parallax và vệt gió tốc độ cao */
export function drawSkySideBg(
  c: CanvasRenderingContext2D,
  cam: Cam,
  t: number,
  opt: { speed?: number; night?: boolean; highAltBand?: boolean } = {}
) {
  const v = view(cam, 150);
  const bgCol = opt.night ? '#1e293b' : P.bg;
  c.fillStyle = bgCol;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);

  if (opt.highAltBand) {
    // Dải tầng bình lưu loãng lạnh phía trên
    c.fillStyle = opt.night ? 'rgba(15, 23, 42, 0.55)' : 'rgba(56, 189, 248, 0.10)';
    c.fillRect(v.x0, v.y0, v.x1 - v.x0, (v.y1 - v.y0) * 0.32);
  }

  const spd = opt.speed ?? 180;
  const span = 2200;
  const cloudCol = opt.night ? 'rgba(71, 85, 105, 0.35)' : P.bg2;
  const strokeCol = opt.night ? 'rgba(148, 163, 184, 0.35)' : P.light;

  // Dải mây phẳng ở phía dưới khung để định hướng chiều bay trái -> phải
  for (let i = 0; i < 6; i++) {
    const rawX = ((i * 370 - t * spd * 0.55) % span + span) % span;
    const cx = v.x0 - 200 + rawX;
    const cy = cam.y + 340 + (i % 2) * 55;
    const cw = 210 + (i % 3) * 65;
    A.rrect(c, cx - cw / 2, cy - 16, cw, 32, 16, cloudCol, strokeCol, lwI(c));
  }

  // Vệt khí quyển lướt qua để cảm nhận vận tốc 500 km/h
  if (spd > 80) {
    const streakCol = opt.night ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.18)';
    for (let i = 0; i < 9; i++) {
      const rawX = ((i * 260 - t * spd * 1.6) % span + span) % span;
      const sx = v.x0 - 100 + rawX;
      const sy = cam.y - 360 + i * 85;
      A.line(c, [[sx, sy], [sx + 110, sy]], streakCol, lwI(c));
    }
  }
}

/** Nền mặt đất đường băng / tàu sân bay + tầng khí quyển độ cao 8-9 km (SIDE) */
export function drawAltitudeWorldBg(
  c: CanvasRenderingContext2D,
  cam: Cam,
  t: number,
  opt: { showCarrier?: boolean } = {}
) {
  const v = view(cam, 200);
  // Nền trời sáng
  c.fillStyle = P.bg;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);

  // Tầng không khí đặc/nóng sát mặt đất (y từ -260 tới 0)
  c.fillStyle = 'rgba(245, 158, 11, 0.08)';
  c.fillRect(v.x0, -260, v.x1 - v.x0, 260);

  // Tầng không khí loãng lạnh ở 8-9 km (y < -520)
  c.fillStyle = 'rgba(56, 189, 248, 0.12)';
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, Math.max(0, -520 - v.y0));
  A.line(c, [[v.x0, -520], [v.x1, -520]], P.sky, lwI(c), [A.px(c, 12), A.px(c, 8)]);

  const lo = lwO(c);
  const li = lwI(c);

  // Mặt biển / mặt đất từ y = 0 trở xuống
  c.fillStyle = P.bg2;
  c.fillRect(v.x0, 0, v.x1 - v.x0, Math.max(0, v.y1));
  A.line(c, [[v.x0, 0], [v.x1, 0]], P.ink, lo);

  // Đường băng bên trái (-950 .. -120)
  A.rrect(c, -960, -22, 840, 26, 4, P.dark, P.ink, lo);
  A.line(c, [[-920, -9], [-150, -9]], P.white, li, [A.px(c, 22), A.px(c, 18)]);

  if (opt.showCarrier) {
    // Tàu sân bay ở (-520 .. 60)
    A.poly(
      c,
      [
        [-520, 4],
        [40, 4],
        [85, -36],
        [-540, -36],
      ],
      P.slate,
      P.ink,
      lo
    );
    // Boong phóng & thượng tầng (island)
    A.rrect(c, -545, -44, 635, 10, 2, P.dark, P.ink, lo);
    A.rrect(c, -340, -108, 78, 64, 4, P.light, P.ink, lo);
    A.rrect(c, -325, -92, 48, 16, 2, P.glass, P.ink2, li);
  }

  // Một vài cụm mây ở tầng trung gian (y = -360)
  for (let i = 0; i < 5; i++) {
    const cx = -750 + i * 420 - ((t * 25) % 420);
    A.rrect(c, cx, -380, 170, 28, 14, P.white, P.light, li);
  }
}

// ── 2. AVRO VULCAN BOMBER (OANH TẠC CƠ CÁNH TAM GIÁC) ─────────────

export function drawVulcan(
  c: CanvasRenderingContext2D,
  viewMode: 'top' | 'side',
  opt: {
    scale?: number;
    fuelLevel?: number; // 0..1 thanh xăng trên thân
    bombBayOpen?: boolean;
  } = {}
) {
  const s = opt.scale ?? 1;
  c.save();
  c.scale(s, s);
  const lo = lwO(c);
  const li = lwI(c);

  if (viewMode === 'top') {
    // Cánh tam giác lớn (Cranked Delta Wing) đặc trưng của Avro Vulcan, hướng mũi sang phải (+x)
    A.poly(
      c,
      [
        [92, 0],     // mũi
        [44, -16],   // cổ buồng lái
        [12, -36],   // gờ cánh trong
        [-54, -108], // mút cánh trái
        [-74, -102],
        [-64, -22],
        [-84, 0],    // chóp đuôi
        [-64, 22],
        [-74, 102],
        [-54, 108],  // mút cánh phải
        [12, 36],
        [44, 16],
      ],
      P.olive,
      P.ink,
      lo
    );
    // Sống lưng thân máy bay nổi bật
    A.rrect(c, -74, -15, 154, 30, 15, P.oliveLight, P.ink, li);
    // Kính buồng lái & chóp radar đen
    A.poly(c, [[74, -8], [92, 0], [74, 8]], P.dark, P.ink, li);
    A.rrect(c, 42, -10, 20, 20, 6, P.glass, P.ink, li);
    // Cần tiếp dầu ở mũi
    A.line(c, [[92, 0], [112, 0]], P.ink, lo);
    A.circle(c, 112, 0, 3.5, P.amber, P.ink, li);

    // Khoang bom mở (nếu có)
    if (opt.bombBayOpen) {
      A.rrect(c, -28, -11, 46, 22, 3, P.dark, P.ink, li);
      for (let i = 0; i < 3; i++) {
        A.circle(c, -16 + i * 14, -4, 3.5, P.amber, null, 0);
        A.circle(c, -16 + i * 14, 4, 3.5, P.amber, null, 0);
      }
    }

    // Thanh nhiên liệu trực quan trên lưng (nếu truyền fuelLevel)
    if (opt.fuelLevel !== undefined) {
      const f = A.clamp01(opt.fuelLevel);
      A.rrect(c, -48, -9, 72, 18, 5, P.white, P.ink, li);
      if (f > 0.01) {
        const col = f < 0.25 ? P.enemy : P.amber;
        A.rrect(c, -45, -6, 66 * f, 12, 3, col, null, 0);
      }
    }
  } else {
    // SIDE view: Cánh dày gốc thân, đuôi đứng cao, mũi chúc kèm cần tiếp dầu
    // Cánh đứng đuôi
    A.poly(
      c,
      [
        [-82, -6],
        [-42, -6],
        [-62, -58],
        [-88, -54],
      ],
      P.oliveDark,
      P.ink,
      lo
    );
    // Thân chính
    A.poly(
      c,
      [
        [-92, -4],
        [-35, -18],
        [45, -18],
        [84, -6],
        [98, 2],
        [68, 12],
        [-68, 12],
      ],
      P.olive,
      P.ink,
      lo
    );
    // Dải cánh tam giác nhìn ngang
    A.poly(
      c,
      [
        [-62, 4],
        [24, 4],
        [34, 14],
        [-72, 14],
      ],
      P.oliveLight,
      P.ink,
      lo
    );
    // Buồng lái & mũi radar
    A.poly(c, [[42, -18], [64, -18], [72, -8], [42, -8]], P.glass, P.ink, li);
    A.poly(c, [[82, -7], [98, 2], [82, 8]], P.dark, P.ink, li);
    // Cần tiếp dầu mũi
    A.line(c, [[96, -2], [118, -6]], P.ink, lo);
  }
  c.restore();
}

// ── 3. HANDLEY PAGE VICTOR TANKER (MÁY BAY TIẾP DẦU CÁNH LƯỠI LIỀM) ──

export function drawVictor(
  c: CanvasRenderingContext2D,
  viewMode: 'top' | 'side',
  opt: {
    scale?: number;
    hoseOut?: number; // 0..1 độ dài thả ống tiếp dầu
    fuelLevel?: number;
  } = {}
) {
  const s = opt.scale ?? 1;
  c.save();
  c.scale(s, s);
  const lo = lwO(c);
  const li = lwI(c);

  if (viewMode === 'top') {
    // Cánh lưỡi liềm (Crescent Wing) + thân xám xanh (P.slate / P.light)
    A.poly(
      c,
      [
        [32, -14],
        [4, -52],
        [-38, -96],
        [-54, -90],
        [-28, -42],
        [-12, -14],
        [-12, 14],
        [-28, 42],
        [-54, 90],
        [-38, 96],
        [4, 52],
        [32, 14],
      ],
      P.slate,
      P.ink,
      lo
    );
    // 2 pod tiếp dầu đầu cánh
    A.rrect(c, -52, -98, 22, 7, 3, P.dark, P.ink, li);
    A.rrect(c, -52, 91, 22, 7, 3, P.dark, P.ink, li);

    // Thân thuôn dài
    A.rrect(c, -84, -14, 168, 28, 14, P.light, P.ink, lo);
    // Kính mũi đặc trưng Victor
    A.rrect(c, 50, -10, 22, 20, 6, P.glass, P.ink, li);

    // Đuôi ngang chữ T ở phía sau
    A.poly(
      c,
      [
        [-70, 0],
        [-88, -38],
        [-96, -34],
        [-84, 0],
        [-96, 34],
        [-88, 38],
      ],
      P.slate,
      P.ink,
      lo
    );

    if (opt.hoseOut && opt.hoseOut > 0.01) {
      const L = 58 * A.clamp01(opt.hoseOut);
      A.line(c, [[-84, 0], [-84 - L, 0]], P.dark, lo);
      A.poly(
        c,
        [
          [-84 - L, 0],
          [-84 - L - 10, -7],
          [-84 - L - 10, 7],
        ],
        P.amber,
        P.ink,
        li
      );
    }

    if (opt.fuelLevel !== undefined) {
      const f = A.clamp01(opt.fuelLevel);
      A.rrect(c, -42, -7, 64, 14, 4, P.white, P.ink, li);
      if (f > 0.01) {
        A.rrect(c, -39, -4, 58 * f, 8, 2, P.amber, null, 0);
      }
    }
  } else {
    // SIDE view: Đuôi chữ T cao vút, mũi bậc thang kính
    A.poly(
      c,
      [
        [-80, -8],
        [-52, -8],
        [-72, -62],
        [-92, -62],
      ],
      P.slate,
      P.ink,
      lo
    );
    // Cánh ngang trên đỉnh đuôi T
    A.rrect(c, -98, -68, 34, 9, 4, P.light, P.ink, lo);
    // Thân
    A.poly(
      c,
      [
        [-86, -6],
        [-40, -16],
        [48, -16],
        [86, -2],
        [72, 12],
        [-68, 12],
      ],
      P.light,
      P.ink,
      lo
    );
    A.poly(c, [[46, -15], [70, -10], [66, -2], [46, -2]], P.glass, P.ink, li);
    A.rrect(c, -26, 2, 56, 12, 5, P.slate, P.ink, lo);
  }
  c.restore();
}

// ── 4. MODERN TANKER (KC-135 / KC-46 / A330 MRTT) ────────────────

export interface TankerOpt {
  scale?: number;
  wingPods?: boolean;           // gắn 2 pod ống mềm ở đầu cánh
  hasBoom?: boolean;            // gắn cụm cần cứng dưới đuôi
  directorLights?: 'off' | 'fwd' | 'steady' | 'up';
  operatorMode?: 'none' | 'prone' | 'console';
  tanks?: { wing: number; center: number; tail: number }; // 0..1 cho cutaway
  valvesOpen?: [boolean, boolean, boolean];
  nitrogen?: number;            // 0..1 lớp khí N2 xanh da trời trên mặt xăng
  cgShift?: number;             // -1 (mũi) .. 0 (chuẩn) .. +1 (đuôi)
  pitchDeg?: number;
}

export function drawModernTanker(
  c: CanvasRenderingContext2D,
  viewMode: ViewMode,
  opt: TankerOpt = {}
) {
  const s = opt.scale ?? 1;
  c.save();
  c.scale(s, s);
  if (opt.pitchDeg) c.rotate((opt.pitchDeg * Math.PI) / 180);

  const lo = lwO(c);
  const li = lwI(c);

  if (viewMode === 'top') {
    // Cánh xuôi lớn + 4 động cơ phản lực dưới cánh
    A.poly(
      c,
      [
        [42, -24],
        [-58, -176],
        [-84, -170],
        [-22, -24],
        [-22, 24],
        [-84, 170],
        [-58, 176],
        [42, 24],
      ],
      P.slate,
      P.ink,
      lo
    );
    // 4 vỏ động cơ (nacelles)
    for (const [ex, ey] of [
      [14, -76],
      [-22, -128],
      [14, 76],
      [-22, 128],
    ] as const) {
      A.rrect(c, ex - 18, ey - 9, 38, 18, 6, P.dark, P.ink, li);
    }

    // 2 pod tiếp dầu đầu cánh (nếu bật)
    if (opt.wingPods) {
      A.rrect(c, -86, -182, 34, 12, 5, P.amber, P.ink, lo);
      A.rrect(c, -86, 170, 34, 12, 5, P.amber, P.ink, lo);
    }

    // Đuôi ngang
    A.poly(
      c,
      [
        [-132, -16],
        [-178, -68],
        [-192, -62],
        [-164, 0],
        [-192, 62],
        [-178, 68],
        [-132, 16],
      ],
      P.slate,
      P.ink,
      lo
    );

    // Thân rộng (Wide-body fuselage)
    A.rrect(c, -178, -26, 356, 52, 26, P.paper, P.ink, lo);
    // Dải sống lưng xám nhạt
    A.rrect(c, -148, -14, 286, 28, 14, P.light, P.ink2, li);
    // Kính buồng lái ở mũi (+x)
    A.poly(
      c,
      [
        [146, -16],
        [164, -8],
        [164, 8],
        [146, 16],
        [136, 10],
        [136, -10],
      ],
      P.glass,
      P.ink,
      li
    );
    // Sống đuôi đứng
    A.line(c, [[-174, 0], [-126, 0]], P.ink, lo);

    // Cần cứng ở đuôi nhìn từ trên xuống (nếu có)
    if (opt.hasBoom !== false) {
      A.rrect(c, -212, -5, 42, 10, 4, P.dark, P.ink, li);
    }
  } else if (viewMode === 'belly') {
    // Góc nhìn cận cảnh dưới bụng Tanker (để thấy rõ dải đèn chỉ dẫn Director Lights + khớp bản lề Boom)
    A.rrect(c, -340, -90, 680, 180, 75, P.slate, P.ink, lo);
    A.rrect(c, -300, -56, 600, 112, 46, P.light, P.ink2, li);

    // Hai hộp đèn chỉ dẫn (Director Lights) dọc dưới bụng: Trái = ELEVATION (UP/DN), Phải = FORE/AFT (FWD/BACK)
    A.rrect(c, -120, -38, 220, 30, 8, P.dark, P.ink, lo);
    A.rrect(c, -120, 8, 220, 30, 8, P.dark, P.ink, lo);

    const mode = opt.directorLights ?? 'steady';
    for (let i = 0; i < 5; i++) {
      const lx = -88 + i * 44;
      const isCenter = i === 2;
      const isFwd = mode === 'fwd' && i >= 3;
      const isUp = mode === 'up' && i <= 1;
      const col1 = isCenter && mode === 'steady' ? P.sky : isFwd ? P.amber : P.ink2;
      const col2 = isCenter && mode === 'steady' ? P.sky : isUp ? P.amber : P.ink2;
      A.circle(c, lx, -23, 9, col1, P.ink, li);
      A.circle(c, lx, 23, 9, col2, P.ink, li);
    }
    // Ụ bản lề cần cứng phía đuôi trái
    A.rrect(c, -310, -24, 95, 48, 16, P.dark, P.ink, lo);
  } else {
    // SIDE hoặc CUTAWAY (nhìn ngang, mũi hướng sang phải +x)
    const isCut = viewMode === 'cutaway';

    // Đuôi đứng lớn phía sau
    A.poly(
      c,
      [
        [-174, -22],
        [-106, -22],
        [-142, -118],
        [-186, -114],
      ],
      P.slate,
      P.ink,
      lo
    );
    // Vạch nhận diện trên đuôi đứng
    A.poly(
      c,
      [
        [-178, -94],
        [-134, -94],
        [-139, -108],
        [-183, -106],
      ],
      P.amber,
      P.ink,
      li
    );

    // Thân chính của Tanker (dài 370px, cao 68px)
    const bodyFill = isCut ? 'rgba(248, 250, 252, 0.88)' : P.paper;
    A.poly(
      c,
      [
        [-186, -14],
        [-132, -34],
        [118, -34],
        [162, -16],
        [186, 4],
        [168, 24],
        [118, 30],
        [-112, 30],
        [-176, 12],
      ],
      bodyFill,
      P.ink,
      lo
    );

    if (!isCut) {
      // Dải bụng xám xanh quân sự
      A.poly(
        c,
        [
          [-176, 12],
          [-112, 30],
          [118, 30],
          [168, 24],
          [178, 10],
          [-180, 2],
        ],
        P.slate,
        P.ink,
        li
      );
    }

    // Kính buồng lái
    A.poly(
      c,
      [
        [124, -30],
        [156, -18],
        [152, -4],
        [120, -4],
      ],
      P.glass,
      P.ink,
      li
    );

    // Cụm pod cần tiếp dầu dưới đuôi (Boom pod blister)
    A.poly(
      c,
      [
        [-172, 12],
        [-108, 28],
        [-118, 42],
        [-168, 28],
      ],
      P.dark,
      P.ink,
      lo
    );

    // Dải đèn chỉ dẫn dưới bụng (Director lights strip)
    if (opt.directorLights && opt.directorLights !== 'off') {
      A.rrect(c, -56, 26, 96, 10, 4, P.dark, P.ink, li);
      for (let i = 0; i < 5; i++) {
        const active =
          (opt.directorLights === 'steady' && i === 2) ||
          (opt.directorLights === 'fwd' && i >= 3) ||
          (opt.directorLights === 'up' && i <= 1);
        A.circle(c, -40 + i * 20, 31, 4, active ? P.amber : P.light, null, 0);
      }
    }

    // Nếu mở buồng điều khiển Boom Operator (Chương 2B)
    if (opt.operatorMode === 'prone') {
      // Khoang nằm sấp ở đuôi máy bay thế hệ cũ (KC-135)
      A.rrect(c, -162, -10, 68, 34, 8, P.bg2, P.amber, lo);
      // Cửa sổ kính nhìn chéo xuống đuôi
      A.line(c, [[-162, 18], [-134, 34]], P.sky, lo);
      // Người vận hành nằm sấp cầm cần lái
      A.circle(c, -144, 6, 7, P.skin, P.ink, li); // đầu
      A.capsule(c, [-134, 10], [-106, 12], 10, P.olive, P.ink, li); // thân nằm sấp
      A.line(c, [[-148, 12], [-156, 20]], P.ink, li); // tay cầm joystick
    } else if (opt.operatorMode === 'console') {
      // Khoang ngồi màn hình 3D phía trước ở tanker thế hệ mới (KC-46 / A330)
      A.rrect(c, 42, -26, 68, 46, 8, P.bg2, P.sky, lo);
      // Màn hình 3D + ghế ngồi + kính 3D
      A.rrect(c, 88, -18, 14, 24, 3, P.dark, P.sky, li);
      A.circle(c, 64, -10, 8, P.skin, P.ink, li);
      A.rrect(c, 66, -13, 8, 5, 2, P.sky, P.ink, li * 0.7); // kính 3D
      A.capsule(c, [64, 2], [64, 14], 11, P.olive, P.ink, li);
      A.line(c, [[68, 4], [84, 6]], P.ink, li); // tay cầm joystick
    }

    // Nếu là mặt cắt CUTAWAY (Chương 4: 3 bình xăng Cánh - Thân - Đuôi + khí Nitơ + ống góp + CG)
    if (isCut && opt.tanks) {
      const boxes = [
        { x: -150, y: -22, w: 76, h: 40, lv: opt.tanks.tail },   // Tail tank
        { x: -52, y: -24, w: 92, h: 42, lv: opt.tanks. wing },   // Wing/Center tank
        { x: 56, y: -22, w: 68, h: 40, lv: opt.tanks.center },   // Forward fuselage tank
      ];
      // Đường ống góp (Manifold pipe) nối 3 bình tới đuôi
      A.line(c, [[-158, 22], [92, 22]], P.dark, lo);

      boxes.forEach((b, idx) => {
        A.rrect(c, b.x, b.y, b.w, b.h, 6, P.white, P.ink, li);
        // Lớp khí Nitơ (N2) phía trên mặt chất lỏng
        if (opt.nitrogen && opt.nitrogen > 0.01) {
          c.save();
          c.globalAlpha *= 0.45 * A.clamp01(opt.nitrogen);
          A.rrect(c, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 4, P.sky, null, 0);
          c.restore();
        }
        // Mức nhiên liệu màu vàng hổ phách (P.amber)
        const f = A.clamp01(b.lv);
        if (f > 0.02) {
          const fh = (b.h - 4) * f;
          A.rrect(c, b.x + 2, b.y + b.h - 2 - fh, b.w - 4, fh, 4, P.amber, null, 0);
        }
        // Van điện tử dưới mỗi bình
        const vOpen = opt.valvesOpen ? opt.valvesOpen[idx] : true;
        const vx = b.x + b.w / 2;
        A.line(c, [[vx, b.y + b.h], [vx, 22]], P.ink, li);
        A.circle(c, vx, 22, 6, vOpen ? P.amber : P.slate, P.ink, li);
      });

      // Ký hiệu Trọng tâm (Center of Gravity - CG)
      const cgX = -4 + (opt.cgShift ?? 0) * 58;
      drawCGMarker(c, cgX, -2, 15, Math.abs(opt.cgShift ?? 0) > 0.35);
    }

    if (!isCut) {
      // Cánh chính & động cơ phản lực treo dưới cánh (vẽ đè ngoài thân khi không cắt lớp)
      A.poly(
        c,
        [
          [-38, 6],
          [38, 6],
          [16, 22],
          [-56, 22],
        ],
        P.light,
        P.ink,
        lo
      );
      // Động cơ phản lực dưới cánh
      A.rrect(c, -16, 22, 54, 22, 8, P.dark, P.ink, lo);
      A.rrect(c, 22, 24, 16, 18, 3, P.slate, P.ink, li);
      // Cánh ngang đuôi
      A.poly(
        c,
        [
          [-178, -6],
          [-134, -6],
          [-146, 4],
          [-184, 4],
        ],
        P.light,
        P.ink,
        lo
      );
    }
  }
  c.restore();
}

/** Ký hiệu Trọng tâm (CG) chuẩn hàng không: vòng tròn 4 góc phần tư đen-trắng */
export function drawCGMarker(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r = 14,
  warn = false
) {
  const li = lwI(c);
  const col = warn ? P.enemy : P.ink;
  A.circle(c, x, y, r, P.white, col, li * 1.2);
  c.save();
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y);
  c.arc(x, y, r, 0, Math.PI / 2);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(x, y);
  c.arc(x, y, r, Math.PI, (Math.PI * 3) / 2);
  c.closePath();
  c.fill();
  c.restore();
}

// ── 5. STRIKE FIGHTER (TIÊM KÍCH TẤN CÔNG / TÀNG HÌNH) ─────────────

export interface FighterOpt {
  scale?: number;
  hasReceptacle?: boolean; // ổ nhận trên lưng (cho Flying Boom)
  probeExtended?: number;  // 0..1 cần tiếp dầu bên mũi (cho Probe & Drogue)
  probeBroken?: boolean;   // gãy đầu probe khi đâm lệch
  canopyCracked?: boolean; // nứt kính buồng lái khi rổ quất vào
  bombsCount?: number;     // 0..4 quả bom nặng dưới cánh/bụng
  fuelLevel?: number;      // 0..1 mức bình xăng đơn giản (Chương 1, 2, 5)
  gearDown?: number;       // 0..1 bánh đáp
  tanks?: { fwd: number; mid: number; aft: number }; // cho cutaway Chương 4
  valvesOpen?: [boolean, boolean, boolean];
  nitrogen?: number;
  cgShift?: number;
  pitchDeg?: number;
  afterburner?: number;    // 0..1 lửa đuôi
}

export function drawStrikeFighter(
  c: CanvasRenderingContext2D,
  viewMode: ViewMode,
  opt: FighterOpt = {}
) {
  const s = opt.scale ?? 1;
  c.save();
  c.scale(s, s);
  if (opt.pitchDeg) c.rotate((opt.pitchDeg * Math.PI) / 180);

  const lo = lwO(c);
  const li = lwI(c);

  if (viewMode === 'top') {
    // Dáng tiêm kích hiện đại (cánh hình thang vát + 2 đuôi đứng nghiêng)
    if (opt.afterburner && opt.afterburner > 0.01) {
      const ab = 28 * opt.afterburner;
      A.poly(c, [[-82, -10], [-82 - ab, -6], [-82, -2]], P.amber, null, 0);
      A.poly(c, [[-82, 2], [-82 - ab, 6], [-82, 10]], P.amber, null, 0);
    }

    // Cánh chính + cánh ngang đuôi
    A.poly(
      c,
      [
        [32, -12],
        [-18, -68],
        [-44, -64],
        [-38, -14],
        [-64, -36],
        [-80, -32],
        [-72, -12],
        [-72, 12],
        [-80, 32],
        [-64, 36],
        [-38, 14],
        [-44, 64],
        [-18, 68],
        [32, 12],
      ],
      P.olive,
      P.ink,
      lo
    );
    // Thân giữa + mũi nhọn
    A.poly(
      c,
      [
        [88, 0],
        [44, -13],
        [-78, -13],
        [-84, 0],
        [-78, 13],
        [44, 13],
      ],
      P.oliveLight,
      P.ink,
      lo
    );
    // Kính buồng lái
    A.rrect(c, 16, -9, 34, 18, 9, P.glass, P.ink, li);
    // Ổ nhận (receptacle) trên sống lưng sau buồng lái
    if (opt.hasReceptacle !== false) {
      A.rrect(c, -12, -5, 14, 10, 3, P.dark, P.white, li);
    }
    // Cần probe thò bên phải mũi
    if (opt.probeExtended && opt.probeExtended > 0.01) {
      const p = A.clamp01(opt.probeExtended);
      A.line(c, [[52, 10], [52 + 28 * p, 12]], P.dark, lo);
      A.circle(c, 52 + 28 * p, 12, 3, P.amber, P.ink, li);
    }
    // Thanh xăng trên lưng nếu có
    if (opt.fuelLevel !== undefined) {
      const f = A.clamp01(opt.fuelLevel);
      A.rrect(c, -52, -7, 48, 14, 4, P.white, P.ink, li);
      if (f > 0.01) {
        A.rrect(c, -49, -4, 42 * f, 8, 2, f < 0.25 ? P.enemy : P.amber, null, 0);
      }
    }
  } else if (viewMode === 'front') {
    // Góc nhìn chính diện (FRONT) cho thấy sải cánh, buồng lái và cần probe thò bên hông mũi
    A.poly(c, [[-110, 8], [-22, -4], [22, -4], [110, 8], [110, 14], [-110, 14]], P.olive, P.ink, lo);
    // 2 đuôi đứng nghiêng chữ V
    A.poly(c, [[-20, -4], [-38, -42], [-30, -44], [-12, -4]], P.oliveDark, P.ink, lo);
    A.poly(c, [[20, -4], [38, -42], [30, -44], [12, -4]], P.oliveDark, P.ink, lo);
    // Thân & kính buồng lái
    A.ellipse(c, 0, 4, 26, 18, 0, P.oliveLight, P.ink, lo);
    A.ellipse(c, 0, -10, 15, 12, 0, P.glass, P.ink, li);
    A.circle(c, 0, -10, 6, P.white, P.ink, li);
    // Mũi radar
    A.circle(c, 0, 6, 10, P.dark, P.ink, li);
    // Cần Probe bên hông mũi
    if (opt.probeExtended && opt.probeExtended > 0.01) {
      A.capsule(c, [20, 2], [36, -2], 6, P.slate, P.ink, li);
      A.circle(c, 36, -2, 5, P.amber, P.ink, li);
    }
  } else {
    // SIDE hoặc CUTAWAY (mũi hướng sang phải +x)
    const isCut = viewMode === 'cutaway';

    // Lửa động cơ sau đuôi
    if (opt.afterburner && opt.afterburner > 0.01) {
      const ab = 46 * opt.afterburner;
      A.poly(c, [[-102, -4], [-102 - ab, 2], [-102, 10]], P.amber, null, 0);
      A.poly(c, [[-102, -1], [-102 - ab * 0.55, 2], [-102, 6]], P.white, null, 0);
    }

    // Bánh đáp (nếu hạ)
    if (opt.gearDown && opt.gearDown > 0.01) {
      const g = A.clamp01(opt.gearDown);
      A.line(c, [[44, 14], [44, 14 + 26 * g]], P.dark, lo);
      A.circle(c, 44, 14 + 28 * g, 7, P.ink, P.light, li);
      A.line(c, [[-34, 14], [-34, 14 + 26 * g]], P.dark, lo);
      A.circle(c, -34, 14 + 28 * g, 9, P.ink, P.light, li);
    }

    // Bom nặng treo dưới cánh/bụng (Chương 1C)
    if (opt.bombsCount && opt.bombsCount > 0) {
      for (let i = 0; i < opt.bombsCount; i++) {
        const bx = -22 + i * 24;
        const by = 24 + (i % 2) * 5;
        A.line(c, [[bx, 14], [bx, by - 4]], P.dark, li);
        // Thân quả bom nặng màu tối có vạch vàng ở mũi
        A.rrect(c, bx - 16, by - 5, 32, 10, 5, P.dark, P.ink, li);
        A.line(c, [[bx + 10, by - 4], [bx + 10, by + 4]], P.amber, li);
        A.poly(c, [[bx - 16, by - 5], [bx - 21, by - 8], [bx - 21, by + 8], [bx - 16, by + 5]], P.slate, P.ink, li * 0.8);
      }
    }

    // Đuôi đứng vát chéo
    A.poly(
      c,
      [
        [-92, -8],
        [-48, -8],
        [-68, -56],
        [-98, -52],
      ],
      P.oliveDark,
      P.ink,
      lo
    );

    // Loa phụt động cơ
    A.poly(
      c,
      [
        [-104, -6],
        [-88, -10],
        [-88, 12],
        [-104, 8],
      ],
      P.dark,
      P.ink,
      lo
    );

    // Thân chính của tiêm kích
    const bodyFill = isCut ? 'rgba(248, 250, 252, 0.90)' : P.olive;
    A.poly(
      c,
      [
        [-90, -10],
        [-24, -18],
        [44, -16],
        [86, -6],
        [112, 4],
        [82, 12],
        [34, 16],
        [-88, 14],
      ],
      bodyFill,
      P.ink,
      lo
    );

    // Mũi radar đen
    A.poly(
      c,
      [
        [86, -6],
        [112, 4],
        [84, 11],
      ],
      P.dark,
      P.ink,
      lo
    );

    // Kính buồng lái + phi công
    A.poly(
      c,
      [
        [6, -17],
        [32, -32],
        [62, -26],
        [78, -8],
        [6, -12],
      ],
       opt.canopyCracked ? P.enemyLight : P.glass,
      P.ink,
      lo
    );
    // Mũ bay phi công
    A.circle(c, 42, -18, 6.5, P.white, P.ink, li);
    // Vết nứt kính buồng lái nếu bị rổ phễu đập trúng (Chương 3B)
    if (opt.canopyCracked) {
      A.line(c, [[48, -28], [42, -18], [54, -14], [36, -12]], P.enemy, lo);
      A.line(c, [[42, -18], [30, -24]], P.enemy, li);
    }

    // Ổ nhận (receptacle) trên sống lưng sau buồng lái (cho Flying Boom)
    if (opt.hasReceptacle !== false) {
      A.poly(
        c,
        [
          [-24, -18],
          [-4, -18],
          [-8, -24],
          [-20, -24],
        ],
        P.dark,
        P.ink,
        li
      );
    }

    // Cần tiếp dầu (Probe) thò ngang ra phía trước mũi (cho Probe & Drogue)
    if (opt.probeExtended && opt.probeExtended > 0.01) {
      const p = A.clamp01(opt.probeExtended);
      const px1 = 70, py1 = -4;
      const px2 = 70 + 50 * p, py2 = -4;
      A.capsule(c, [px1, py1], [px2, py2], 5, P.slate, P.ink, li);
      if (!opt.probeBroken) {
        A.circle(c, px2, py2, 4.5, P.amber, P.ink, li);
      } else {
        // Đầu probe bị gãy văng ra
        A.line(c, [[px2 - 4, py2 - 4], [px2 + 4, py2 + 4]], P.enemy, lo);
      }
    }

    // Bình xăng đơn giản trong thân (dùng cho Chương 1C & 2B để thấy mức 1/2 -> đầy 100%)
    if (!isCut && opt.fuelLevel !== undefined) {
      const f = A.clamp01(opt.fuelLevel);
      const tx = -54, ty = -10, tw = 78, th = 20;
      A.rrect(c, tx, ty, tw, th, 5, P.white, P.ink, li);
      if (f > 0.01) {
        A.rrect(c, tx + 2, ty + 2, (tw - 4) * f, th - 4, 3, P.amber, null, 0);
      }
      // Vạch chia 1/2 bình
      A.line(c, [[tx + tw / 2, ty], [tx + tw / 2, ty + th]], P.ink2, li, [A.px(c, 3), A.px(c, 3)]);
    }

    // Mặt cắt CUTAWAY (Chương 4: 3 bình xăng Mũi - Cánh - Đuôi + van máy tính + khí Nitơ + CG)
    if (isCut && opt.tanks) {
      const boxes = [
        { x: -78, y: -8, w: 34, h: 18, lv: opt.tanks.aft },
        { x: -36, y: -12, w: 42, h: 22, lv: opt.tanks.mid },
        { x: 14, y: -8, w: 32, h: 18, lv: opt.tanks.fwd },
      ];
      A.line(c, [[-62, 12], [32, 12]], P.dark, li * 1.3);
      boxes.forEach((b, idx) => {
        A.rrect(c, b.x, b.y, b.w, b.h, 4, P.white, P.ink, li);
        if (opt.nitrogen && opt.nitrogen > 0.01) {
          c.save();
          c.globalAlpha *= 0.45 * A.clamp01(opt.nitrogen);
          A.rrect(c, b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3, 3, P.sky, null, 0);
          c.restore();
        }
        const f = A.clamp01(b.lv);
        if (f > 0.02) {
          const fh = (b.h - 3) * f;
          A.rrect(c, b.x + 1.5, b.y + b.h - 1.5 - fh, b.w - 3, fh, 3, P.amber, null, 0);
        }
        const vOpen = opt.valvesOpen ? opt.valvesOpen[idx] : true;
        A.circle(c, b.x + b.w / 2, 12, 4.5, vOpen ? P.amber : P.slate, P.ink, li * 0.8);
      });
      const cgX = -14 + (opt.cgShift ?? 0) * 42;
      drawCGMarker(c, cgX, -1, 11, Math.abs(opt.cgShift ?? 0) > 0.35);
    }

    if (!isCut && opt.fuelLevel === undefined) {
      // Cánh ngang nhìn từ bên hông
      A.poly(c, [[-48, 2], [18, 2], [6, 10], [-58, 10]], P.oliveLight, P.ink, lo);
    }
  }
  c.restore();
}

// ── 6. CARRIER FIGHTER (TIÊM KÍCH HẠM TÀU SÂN BAY + BUDDY POD) ─────

export function drawCarrierFighter(
  c: CanvasRenderingContext2D,
  viewMode: 'top' | 'side',
  opt: {
    scale?: number;
    buddyPod?: boolean;
    probeExtended?: number;
    fuelLevel?: number;
  } = {}
) {
  const s = opt.scale ?? 1;
  c.save();
  c.scale(s, s);
  const lo = lwO(c);
  const li = lwI(c);

  if (viewMode === 'top') {
    // Tiêm kích hạm cánh rộng vừa, 2 đuôi chéo, sơn xám hải quân / olive sáng
    A.poly(
      c,
      [
        [28, -12],
        [-12, -62],
        [-36, -58],
        [-32, -14],
        [-58, -32],
        [-72, -28],
        [-64, -12],
        [-64, 12],
        [-72, 28],
        [-58, 32],
        [-32, 14],
        [-36, 58],
        [-12, 62],
        [28, 12],
      ],
      P.oliveLight,
      P.ink,
      lo
    );
    A.poly(
      c,
      [
        [82, 0],
        [38, -12],
        [-70, -12],
        [-76, 0],
        [-70, 12],
        [38, 12],
      ],
      P.olive,
      P.ink,
      lo
    );
    A.rrect(c, 12, -8, 30, 16, 8, P.glass, P.ink, li);

    // Pod tiếp dầu đồng đội dưới bụng (nhìn lấp ló hoặc nổi rõ)
    if (opt.buddyPod) {
      A.rrect(c, -36, -8, 42, 16, 7, P.amber, P.ink, lo);
    }
    if (opt.probeExtended && opt.probeExtended > 0.01) {
      const p = A.clamp01(opt.probeExtended);
      A.line(c, [[48, -9], [48 + 26 * p, -10]], P.dark, lo);
      A.circle(c, 48 + 26 * p, -10, 3, P.amber, P.ink, li);
    }
  } else {
    // SIDE view: Có móc hạ cánh (tailhook) dưới đuôi và pod tiếp dầu đồng đội (buddy pod) dưới bụng
    A.poly(c, [[-82, -8], [-44, -8], [-64, -52], [-88, -48]], P.oliveDark, P.ink, lo);
    // Móc cáp tàu sân bay (Tailhook)
    A.line(c, [[-68, 12], [-88, 28]], P.ink, lo);
    A.circle(c, -88, 28, 3.5, P.amber, P.ink, li);

    // Thân
    A.poly(
      c,
      [
        [-84, -8],
        [-22, -16],
        [42, -14],
        [98, 4],
        [72, 12],
        [-80, 12],
      ],
      P.oliveLight,
      P.ink,
      lo
    );
    A.poly(c, [[8, -15], [32, -28], [58, -22], [70, -6], [8, -10]], P.glass, P.ink, lo);
    A.poly(c, [[-40, 2], [18, 2], [8, 10], [-50, 10]], P.olive, P.ink, lo);

    if (opt.buddyPod) {
      // Pod tiếp dầu đồng đội treo dưới bụng kèm chong chóng風 (RAT turbine) ở mũi pod
      A.rrect(c, -34, 13, 56, 14, 7, P.amber, P.ink, lo);
      A.line(c, [[24, 15], [24, 25]], P.ink, li);
    }
    if (opt.probeExtended && opt.probeExtended > 0.01) {
      const p = A.clamp01(opt.probeExtended);
      A.capsule(c, [62, -4], [62 + 44 * p, -4], 4.5, P.slate, P.ink, li);
      A.circle(c, 62 + 44 * p, -4, 4, P.amber, P.ink, li);
    }
  }
  c.restore();
}

// ── 7. HELICOPTER (TRỰC THĂNG QUÂN SỰ CÓ CẦN PROBE DÀI) ────────────

export function drawHelicopter(
  c: CanvasRenderingContext2D,
  viewMode: 'top' | 'side',
  opt: {
    scale?: number;
    rotorPhase?: number; // góc quay cánh quạt theo t
    probeExtended?: number;
    rotorWarn?: boolean; // vùng nguy hiểm cánh quạt khi cần cứng lại gần
  } = {}
) {
  const s = opt.scale ?? 1;
  c.save();
  c.scale(s, s);
  const lo = lwO(c);
  const li = lwI(c);
  const ang = opt.rotorPhase ?? 0;
  const pProbe = opt.probeExtended ?? 1;

  if (viewMode === 'top') {
    // Cần tiếp dầu vươn dài ra phía trước vượt qua cả vòng quay cánh quạt
    const probeLen = 46 + 78 * A.clamp01(pProbe);
    A.capsule(c, [36, 10], [36 + probeLen, 10], 5, P.slate, P.ink, li);
    A.circle(c, 36 + probeLen, 10, 4.5, P.amber, P.ink, li);

    // Thân trực thăng
    A.poly(
      c,
      [
        [54, 0],
        [36, -18],
        [-32, -18],
        [-108, -6],
        [-108, 6],
        [-32, 18],
        [36, 18],
      ],
      P.olive,
      P.ink,
      lo
    );
    A.rrect(c, 22, -14, 24, 28, 8, P.glass, P.ink, li);

    // Vòng quét cánh quạt chính (Main Rotor Disc)
    const rDisc = 86;
    c.save();
    c.globalAlpha *= 0.18;
    A.circle(c, 0, 0, rDisc, opt.rotorWarn ? P.enemy : P.sky, null, 0);
    c.restore();
    A.circle(c, 0, 0, rDisc, null, opt.rotorWarn ? P.enemy : P.ink2, li);

    // 4 lá cánh quạt đang quay
    for (let i = 0; i < 4; i++) {
      const a = ang + (i * Math.PI) / 2;
      A.line(c, [[0, 0], [Math.cos(a) * rDisc, Math.sin(a) * rDisc]], P.ink, lo);
    }
    A.circle(c, 0, 0, 10, P.dark, P.ink, lo);
  } else {
    // SIDE view: Cánh quạt quay ngang trên nóc, cần probe dài thò ra dưới mũi
    const probeLen = 42 + 76 * A.clamp01(pProbe);
    A.capsule(c, [44, 14], [44 + probeLen, 12], 5.5, P.slate, P.ink, li);
    A.circle(c, 44 + probeLen, 12, 4.5, P.amber, P.ink, li);

    // Đuôi + cánh quạt đuôi
    A.poly(
      c,
      [
        [-118, -36],
        [-94, -36],
        [-84, -4],
        [-32, -12],
        [-32, 8],
        [-106, 4],
      ],
      P.oliveDark,
      P.ink,
      lo
    );
    A.circle(c, -108, -24, 18, 'rgba(100,116,139,0.25)', P.ink2, li);

    // Thân cabin
    A.poly(
      c,
      [
        [-42, -18],
        [34, -18],
        [58, -2],
        [54, 18],
        [-38, 18],
      ],
      P.olive,
      P.ink,
      lo
    );
    A.poly(c, [[22, -14], [44, -14], [54, 0], [22, 0]], P.glass, P.ink, li);
    // Càng đáp
    A.circle(c, 24, 24, 7, P.dark, P.ink, li);
    A.circle(c, -26, 24, 7, P.dark, P.ink, li);

    // Trụ và đĩa cánh quạt chính (hơi chúc nhẹ về phía trước)
    A.rrect(c, -6, -34, 12, 16, 3, P.dark, P.ink, lo);
    const rSpan = 96;
    const sweep = Math.cos(ang * 3);
    if (opt.rotorWarn) {
      A.ellipse(c, 0, -36, rSpan, 14, -0.06, 'rgba(180, 73, 60, 0.25)', P.enemy, li);
    } else {
      A.ellipse(c, 0, -36, rSpan, 10, -0.06, 'rgba(56, 189, 248, 0.16)', P.ink2, li);
    }
    A.line(c, [[-rSpan * sweep, -36 + 5 * sweep], [rSpan * sweep, -36 - 5 * sweep]], P.ink, lo * 1.2);
    A.line(c, [[-rSpan, -31], [rSpan, -41]], P.ink, li);
    A.circle(c, 0, -36, 8, P.dark, P.ink, lo);
  }
  c.restore();
}

// ── 8. FLYING BOOM (CẦN TIẾP DẦU CỨNG + CÁNH CHỮ V + ỐNG LỒNG) ─────

export interface BoomOpt {
  extension?: number;     // 0..1 độ phóng ống lồng bên trong (inner telescope tube)
  wingPitch?: number;     // -1..1 góc bẻ cánh chữ V (ruddevator)
  flow?: number;          // 0..1 tiến độ/mật độ dòng nhiên liệu vàng chảy trong ống
  flowPhase?: number;     // t để hạt xăng chạy
  locked?: boolean;       // khớp khóa sáng lên ở đầu vòi
}

/** Vẽ cần cứng nối từ khớp bản lề đuôi tanker (x0,y0) tới đầu vòi (x1,y1) */
export function drawFlyingBoom(
  c: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opt: BoomOpt = {}
) {
  const lo = lwO(c);
  const li = lwI(c);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  const ext = A.clamp01(opt.extension ?? 0.5);
  // Phần vỏ ngoài (outer spar) chiếm 62% chiều dài tối đa, phần ống lồng thò ra phần còn lại
  const outerL = L * (1 - 0.36 * (0.3 + 0.7 * ext));

  c.save();
  c.translate(x0, y0);
  c.rotate(ang);

  // 1. Ống lồng bên trong (Inner telescoping tube)
  A.rrect(c, outerL - 12, -5.5, L - outerL + 12, 11, 4, P.light, P.ink, lo);

  // 2. Ống vỏ ngoài cứng (Outer rigid spar)
  A.rrect(c, 0, -9, outerL, 18, 6, P.slate, P.ink, lo);
  // Khớp bản lề ở gốc
  A.circle(c, 0, 0, 11, P.dark, P.ink, lo);

  // 3. Cặp cánh lái chữ V (V-shaped ruddevator wings) gắn ở gần đầu ống ngoài
  const wx = outerL - 18;
  const tilt = (opt.wingPitch ?? 0) * 0.25;
  c.save();
  c.translate(wx, 0);
  c.rotate(tilt);
  // Cánh V hướng lên-sau
  A.poly(
    c,
    [
      [-10, -6],
      [10, -6],
      [-6, -34],
      [-22, -32],
    ],
    P.oliveLight,
    P.ink,
    lo
  );
  // Cánh V hướng xuống-sau
  A.poly(
    c,
    [
      [-10, 6],
      [10, 6],
      [-6, 34],
      [-22, 32],
    ],
    P.oliveLight,
    P.ink,
    lo
  );
  c.restore();

  // 4. Đầu vòi khớp khóa (Nozzle head)
  const lockCol = opt.locked ? P.amber : P.dark;
  A.rrect(c, L - 14, -8, 16, 16, 4, lockCol, P.ink, lo);

  // 5. Dòng nhiên liệu áp suất cao chạy dọc trong lòng cần (nếu đang bơm)
  if (opt.flow && opt.flow > 0.01) {
    const phase = opt.flowPhase ?? 0;
    const nDots = 9;
    for (let i = 0; i < nDots; i++) {
      const u = ((i / nDots + phase * 1.4) % 1 + 1) % 1;
      if (u <= opt.flow) {
        const px = 12 + u * (L - 22);
        A.circle(c, px, 0, 4.2, P.amber, P.ink, li * 0.6);
      }
    }
  }

  c.restore();
}

// ── 9. MẶT CẮT KHỚP NỐI NOZZLE–RECEPTACLE (CHỐT TIẾP ĐỊA, VAN & BREAKAWAY) ──

export interface CouplingOpt {
  gap?: number;           // khoảng cách tách rời giữa Nozzle (trái-trên) và Receptacle (phải-dưới)
  latchesLocked?: number; // 0..1 chốt cơ khí ngoắc khóa
  bonded?: number;        // 0..1 dây tiếp địa nối liền & cân bằng điện tích
  staticSpark?: number;   // 0..1 tia lửa tĩnh điện nguy hiểm (khi chưa nối đất)
  valveOpen?: number;     // 0..1 van xăng chính mở
  fuelFlow?: number;      // 0..1 dòng nhiên liệu vàng chảy qua
  breakaway?: number;     // 0..1 khớp ngắt khẩn cấp bung ra & đóng sập 2 van
  angleDeg?: number;      // góc bẻ gập khi nhiễu động giật mạnh
  t?: number;
}

/** Mặt cắt phóng lớn cụm đầu vòi (Nozzle) và ổ nhận (Receptacle) cho Chương 4 */
export function drawCouplingCutaway(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opt: CouplingOpt = {}
) {
  c.save();
  c.translate(x, y);
  const lo = lwO(c);
  const li = lwI(c);
  const gap = opt.gap ?? 0;
  const brk = A.clamp01(opt.breakaway ?? 0);
  const sep = gap + brk * 95;
  const t = opt.t ?? 0;

  // Nửa bên trái: Đầu vòi Nozzle của Tanker (đi từ trái sang phải)
  c.save();
  c.translate(-sep * 0.55, 0);
  if (opt.angleDeg) c.rotate(((opt.angleDeg * Math.PI) / 180) * 0.5);

  // Vỏ ống Nozzle cắt dọc
  A.rrect(c, -260, -58, 240, 116, 12, P.slate, P.ink, lo);
  A.rrect(c, -250, -36, 230, 72, 6, P.bg, P.ink, li);

  // Dòng xăng vàng chờ sẵn bên trái van
  const fOpen = A.clamp01((opt.valveOpen ?? 0) * (1 - brk));
  A.rrect(c, -248, -33, 185, 66, 4, P.amber, null, 0);

  // Van chặn phía Tanker (xoay 90 độ khi mở, đóng sập khi breakaway)
  c.save();
  c.translate(-56, 0);
  c.rotate(fOpen * (Math.PI / 2));
  A.rrect(c, -8, -34, 16, 68, 4, brk > 0.1 ? P.enemy : P.dark, P.ink, lo);
  c.restore();

  // 2 Chốt ngoắc cơ khí (Mechanical Latches) kèm dây tiếp địa (Electrical Bond Wire)
  const latchAng = A.lerp(-0.42, 0, A.clamp01(opt.latchesLocked ?? 0)) - brk * 0.55;
  for (const sy of [-1, 1] as const) {
    c.save();
    c.translate(-26, sy * 48);
    c.rotate(sy * latchAng);
    A.poly(
      c,
      [
        [0, -sy * 8],
        [52, -sy * 8],
        [52, sy * 16],
        [36, sy * 16],
        [36, sy * 4],
        [0, sy * 4],
      ],
      opt.bonded && opt.bonded > 0.5 ? P.sky : P.light,
      P.ink,
      lo
    );
    c.restore();
  }
  // Đường dây tiếp địa màu xanh da trời (P.sky) chạy dọc vỏ Nozzle tới chốt
  if ((opt.bonded ?? 0) > 0.05) {
    A.line(c, [[-245, -48], [-26, -48]], P.sky, lo);
    A.circle(c, -26, -48, 6, P.sky, P.ink, li);
  }
  c.restore();

  // Nửa bên phải: Ổ nhận Receptacle của Receiver
  c.save();
  c.translate(sep * 0.55, 0);
  if (opt.angleDeg) c.rotate(-((opt.angleDeg * Math.PI) / 180) * 0.5);

  // Vỏ ổ nhận Receptacle cắt dọc
  A.rrect(c, 20, -58, 240, 116, 12, P.olive, P.ink, lo);
  A.rrect(c, 20, -36, 230, 72, 6, P.bg, P.ink, li);

  // Rãnh ngàm khóa trên miệng Receptacle
  A.rrect(c, 12, -56, 22, 16, 4, P.dark, P.ink, li);
  A.rrect(c, 12, 40, 22, 16, 4, P.dark, P.ink, li);

  // Dòng nhiên liệu chảy qua sang bên phải khi van mở
  if ((opt.fuelFlow ?? 0) > 0.01 && brk < 0.2) {
    const fl = A.clamp01(opt.fuelFlow ?? 0);
    A.rrect(c, -56, -30, 76 + 225 * fl, 60, 4, P.amber, null, 0);
    for (let i = 0; i < 6; i++) {
      const px = -40 + (((i / 6 + t * 1.2) % 1) * (60 + 210 * fl));
      A.circle(c, px, (i % 2 === 0 ? -1 : 1) * 10, 5, P.white, null, 0);
    }
  }

  // Van một chiều phía Receiver (đóng sập khi breakaway)
  c.save();
  c.translate(58, 0);
  c.rotate(fOpen * (Math.PI / 2));
  A.rrect(c, -8, -34, 16, 68, 4, brk > 0.1 ? P.enemy : P.dark, P.ink, lo);
  c.restore();

  // Đường tiếp địa phía Receiver nối liền mạch khi chốt đóng
  if ((opt.bonded ?? 0) > 0.05 && brk < 0.2) {
    const bp = A.clamp01(opt.bonded ?? 0);
    A.line(c, [[-26, -48], [26 + 210 * bp, -48]], P.sky, lo);
    A.circle(c, 24, -48, 6, P.sky, P.ink, li);
  }
  c.restore();

  // Tia lửa tĩnh điện nguy hiểm giữa 2 vỏ khi chưa cân bằng điện tích
  if (opt.staticSpark && opt.staticSpark > 0.01) {
    const sp = opt.staticSpark;
    A.line(
      c,
      [
        [-28, -30],
        [-8, -12],
        [4, -22],
        [24, 0],
        [-6, 16],
        [22, 28],
      ],
      P.enemy,
      lo * 1.3
    );
    A.circle(c, 0, 0, 24 * sp, 'rgba(245, 158, 11, 0.35)', P.enemy, li);
  }

  // Một giọt nhiên liệu nhỏ xíu ("barely a cupful of fuel") rơi ra khi breakaway đóng sập 2 van
  if (brk > 0.25) {
    const dy = (brk - 0.25) * 85;
    A.circle(c, 0, dy, 8, P.amber, P.ink, li);
    A.circle(c, -12, dy - 10, 5, P.amber, P.ink, li);
  }

  c.restore();
}

// ── 10. HOSE AND DROGUE (ỐNG MỀM + RỔ PHỄU CẦU LÔNG) ──────────────

export interface HoseOpt {
  whipAmp?: number;    // biên độ sóng quất ngang (hose whip)
  whipPhase?: number;  // pha sóng
  flow?: number;       // 0..1 dòng nhiên liệu chảy trong ống
  flowPhase?: number;
  basketScale?: number;
  basketAngle?: number;
}

/** Vẽ ống mềm cao su cốt thép nối từ (x0,y0) tới rổ phễu (x1,y1) */
export function drawHoseAndDrogue(
  c: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opt: HoseOpt = {}
) {
  const lo = lwO(c);
  const li = lwI(c);
  const N = 28;
  const pts: A.Pt[] = [];
  const amp = opt.whipAmp ?? 0;
  const ph = opt.whipPhase ?? 0;

  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const bx = A.lerp(x0, x1, u);
    // Độ võng tự nhiên của ống mềm dưới trọng lực + sóng quất khi bị đâm lệch
    const sag = Math.sin(u * Math.PI) * 26;
    const whip = Math.sin(u * Math.PI * 2.5 - ph * 9) * amp * Math.pow(u, 1.2);
    const by = A.lerp(y0, y1, u) + sag + whip;
    pts.push([bx, by]);
  }

  // Vẽ ống cao su cốt thép (viền đen dày + lõi xám đậm)
  A.line(c, pts, P.ink, lo * 2.4);
  A.line(c, pts, P.dark, lo * 1.3);

  // Dòng nhiên liệu chạy dọc ống mềm (nếu có)
  if (opt.flow && opt.flow > 0.01) {
    const fph = opt.flowPhase ?? 0;
    for (let i = 0; i < 8; i++) {
      const u = ((i / 8 + fph * 1.1) % 1 + 1) % 1;
      if (u <= opt.flow) {
        const idx = Math.min(N, Math.floor(u * N));
        const [px, py] = pts[idx]!;
        A.circle(c, px, py, 4, P.amber, P.ink, li * 0.6);
      }
    }
  }

  // Vẽ chiếc rổ phễu (Shuttlecock Drogue Basket) ở đầu ống (x1, y1)
  const prev = pts[N - 2] ?? [x0, y0];
  const endAng = opt.basketAngle ?? Math.atan2(y1 - prev[1], x1 - prev[0]);
  const bs = opt.basketScale ?? 1;

  c.save();
  c.translate(x1, y1);
  c.rotate(endAng);
  c.scale(bs, bs);

  // Cổ van nối ống tại (0,0)
  A.rrect(c, -6, -7, 14, 14, 4, P.slate, P.ink, lo);
  // Khung nan rổ hình nón cụt (mở rộng ra phía ngoài +x đón mũi kim Probe của máy bay nhận)
  A.poly(
    c,
    [
      [4, -6],
      [34, -25],
      [34, 25],
      [4, 6],
    ],
    'rgba(248, 250, 252, 0.85)',
    P.ink,
    lo
  );
  // Các nan thép đan như cầu lông
  for (const ny of [-15, -5, 5, 15]) {
    A.line(c, [[5, ny * 0.25], [32, ny]], P.ink2, li);
  }
  // Vành ổn định cản gió ở miệng rổ (màu cam hổ phách + đỏ nổi bật)
  A.rrect(c, 32, -28, 8, 56, 3, P.amber, P.ink, lo);
  A.rrect(c, 32, -10, 8, 20, 2, P.enemy, P.ink, li);
  // Ổ khóa trung tâm rổ
  A.circle(c, 6, 0, 5, P.amber, P.ink, li);

  c.restore();
}

// ── 11. TÊN LỬA ĐÁNH CHẶN TẦM XA CỦA ĐỐI PHƯƠNG (CHƯƠNG 5) ─────────

export function drawEnemyMissile(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  ang: number,
  scale = 1
) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(scale, scale);
  const lo = lwO(c);
  const li = lwI(c);

  // Lửa đuôi tên lửa
  A.poly(c, [[-34, -5], [-64, 0], [-34, 5]], P.amber, null, 0);
  A.poly(c, [[-34, -2.5], [-48, 0], [-34, 2.5]], P.white, null, 0);

  // Cánh đuôi & cánh lái giữa thân
  A.poly(c, [[-32, -6], [-20, -6], [-28, -18], [-34, -16]], P.enemy, P.ink, li);
  A.poly(c, [[-32, 6], [-20, 6], [-28, 18], [-34, 16]], P.enemy, P.ink, li);

  // Thân tên lửa dài mảnh
  A.poly(
    c,
    [
      [-34, -6],
      [18, -6],
      [36, 0],
      [18, 6],
      [-34, 6],
    ],
    P.enemyLight,
    P.ink,
    lo
  );
  // Đầu nổ màu đỏ gạch đậm
  A.poly(c, [[14, -6], [36, 0], [14, 6]], P.enemy, P.ink, lo);
  c.restore();
}
