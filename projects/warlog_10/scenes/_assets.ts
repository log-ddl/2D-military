import * as A from './shared/art';
import { P, LINE } from './shared/palette';

export type ViewMode = 'side' | 'top' | 'cutaway' | 'front';

// ── Helper nét vẽ chuẩn code-video-2d ──────────────────────────────
export const lwO = (c: CanvasRenderingContext2D) => A.px(c, LINE.outer);
export const lwI = (c: CanvasRenderingContext2D) => A.px(c, LINE.inner);

// ── 1. NỀN CỦA MỖI NƠI (BACKGROUNDS) ──────────────────────────────

/** Nền SIDE bầu trời – mặt đất phẳng hoặc đồi thấp */
export function drawSideTerrain(
  c: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  groundY = 260,
  opts: { hillAt?: number; hillH?: number; rainX?: [number, number]; seaFrom?: number } = {}
) {
  const o = lwO(c), inn = lwI(c);
  // Giải tầng trời nhạt phía trên
  c.fillStyle = P.bg2;
  c.fillRect(x0, groundY - 900, x1 - x0, 220);

  // Dải đồi xa mờ
  c.beginPath();
  c.moveTo(x0, groundY);
  for (let x = x0; x <= x1; x += 160) {
    const h = 24 + 18 * Math.sin(x * 0.0035) + 12 * Math.cos(x * 0.008);
    c.lineTo(x, groundY - h);
  }
  c.lineTo(x1, groundY);
  c.closePath();
  A.fs(c, P.bg2, P.light, inn);

  // Quả đồi cụ thể nếu có (dùng cho Doppler / chắn sóng)
  if (opts.hillAt !== undefined) {
    const hx = opts.hillAt, hh = opts.hillH ?? 170, hw = hh * 1.9;
    c.beginPath();
    c.moveTo(hx - hw, groundY);
    c.quadraticCurveTo(hx - hw * 0.35, groundY - hh * 1.05, hx, groundY - hh);
    c.quadraticCurveTo(hx + hw * 0.35, groundY - hh * 1.05, hx + hw, groundY);
    c.closePath();
    A.fs(c, P.oliveLight, P.ink, o);
    // Đườngชั้น địa chất bên trong đồi
    A.line(c, [[hx - hw * 0.55, groundY - hh * 0.35], [hx, groundY - hh * 0.65], [hx + hw * 0.5, groundY - hh * 0.3]], P.oliveDark, inn);
  }

  // Mặt đất chính
  c.fillStyle = P.bg2;
  c.fillRect(x0, groundY, x1 - x0, 600);
  // Lớp cỏ/đất mặt trên
  c.fillStyle = P.sand;
  c.fillRect(x0, groundY, x1 - x0, 14);

  // Nếu có vùng biển bên phải
  if (opts.seaFrom !== undefined && opts.seaFrom < x1) {
    c.fillStyle = P.glass;
    c.fillRect(opts.seaFrom, groundY, x1 - opts.seaFrom, 600);
    for (let sx = opts.seaFrom + 40; sx < x1 - 40; sx += 110) {
      A.line(c, [[sx, groundY + 18], [sx + 55, groundY + 18]], P.sky, inn);
    }
  }

  // Đường mặt đất sắc nét
  A.line(c, [[x0, groundY], [x1, groundY]], P.ink, o);

  // Vùng mưa hấp thụ sóng ngắn nếu có
  if (opts.rainX) {
    const [rx0, rx1] = opts.rainX;
    const rw = rx1 - rx0;
    const cy = groundY - 380;
    // Đám mây mưa lớn
    A.rrect(c, rx0, cy - 45, rw, 70, 35, P.light, P.ink, o);
    A.circle(c, rx0 + rw * 0.28, cy - 42, 46, P.light, P.ink, o);
    A.circle(c, rx0 + rw * 0.62, cy - 50, 54, P.light, P.ink, o);
    A.rrect(c, rx0 + 8, cy - 40, rw - 16, 58, 28, P.light, null, 0);
    // Hạt mưa xiên
    for (let x = rx0 + 25; x < rx1 - 15; x += 32) {
      for (let y = cy + 35; y < groundY - 20; y += 55) {
        A.line(c, [[x, y], [x - 12, y + 28]], P.slate, inn);
      }
    }
  }
}

/** Nền SIDE mặt cắt Trái Đất cong (cho chương đường chân trời radar / OTH / AWACS) */
export function drawCurvedEarthSide(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  opts: { hillAngle?: number; hillH?: number } = {}
) {
  const o = lwO(c), inn = lwI(c);
  // Tầng khí quyển / tầng điện ly mờ phía trên
  c.beginPath();
  c.arc(cx, cy, R + 360, -Math.PI * 0.75, -Math.PI * 0.25);
  A.fs(c, null, P.light, inn);

  // Quả đồi chắn trên mặt cong nếu có
  if (opts.hillAngle !== undefined) {
    const ha = opts.hillAngle;
    const hh = opts.hillH ?? 65;
    const da = 0.045;
    const p1: A.Pt = [cx + Math.cos(ha - da) * (R - 5), cy + Math.sin(ha - da) * (R - 5)];
    const pk: A.Pt = [cx + Math.cos(ha) * (R + hh), cy + Math.sin(ha) * (R + hh)];
    const p2: A.Pt = [cx + Math.cos(ha + da) * (R - 5), cy + Math.sin(ha + da) * (R - 5)];
    c.beginPath();
    c.moveTo(p1[0], p1[1]);
    c.quadraticCurveTo(pk[0], pk[1], p2[0], p2[1]);
    c.closePath();
    A.fs(c, P.oliveLight, P.ink, o);
  }

  // Khối mặt đất cong
  c.beginPath();
  c.arc(cx, cy, R, -Math.PI * 0.8, -Math.PI * 0.2);
  c.lineTo(cx + R * 0.8, cy);
  c.lineTo(cx - R * 0.8, cy);
  c.closePath();
  A.fs(c, P.bg2, P.ink, o);

  // Vòng kinh vĩ độ phụ bên dưới mặt đất
  c.beginPath();
  c.arc(cx, cy, R - 22, -Math.PI * 0.76, -Math.PI * 0.24);
  A.fs(c, null, P.sand, inn);
}

/** Nền TOP sa bàn chiến thuật / vùng quét radar đồng tâm */
export function drawTacticalMapTop(
  c: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  maxR = 850,
  opts: { coastlineX?: number; roads?: boolean } = {}
) {
  const o = lwO(c), inn = lwI(c);
  // Nền vùng biển / không vực
  c.fillStyle = P.bg2;
  c.fillRect(originX - maxR * 1.4, originY - maxR * 1.2, maxR * 2.8, maxR * 2.4);

  // Bờ đất liền bên trái nếu có
  if (opts.coastlineX !== undefined) {
    const cx = opts.coastlineX;
    const pts: A.Pt[] = [
      [originX - maxR * 1.4, originY - maxR * 1.2],
      [cx - 40, originY - maxR * 1.2],
      [cx + 25, originY - maxR * 0.6],
      [cx - 15, originY - maxR * 0.15],
      [cx + 45, originY + maxR * 0.3],
      [cx - 10, originY + maxR * 0.8],
      [cx + 20, originY + maxR * 1.2],
      [originX - maxR * 1.4, originY + maxR * 1.2],
    ];
    A.poly(c, pts, P.paper, P.ink, o);
  }

  // Đường giao thông cơ động (cho cảnh SAM shoot-and-scoot)
  if (opts.roads) {
    A.line(
      c,
      [
        [originX - 420, originY - 360],
        [originX - 180, originY - 120],
        [originX, originY],
        [originX - 140, originY + 240],
        [originX - 360, originY + 380],
      ],
      P.sand,
      A.px(c, 18)
    );
    A.line(
      c,
      [
        [originX - 420, originY - 360],
        [originX - 180, originY - 120],
        [originX, originY],
        [originX - 140, originY + 240],
        [originX - 360, originY + 380],
      ],
      P.ink2,
      inn,
      [10, 10]
    );
  }

  // Các vòng cự ly đồng tâm quanh đài radar
  for (let i = 1; i <= 4; i++) {
    const r = (maxR / 4) * i;
    c.beginPath();
    c.arc(originX, originY, r, 0, Math.PI * 2);
    c.setLineDash([8, 8]);
    A.fs(c, null, P.light, inn);
    c.setLineDash([]);
  }
  // Trục chữ thập phương vị
  A.line(c, [[originX - maxR, originY], [originX + maxR, originY]], P.light, inn);
  A.line(c, [[originX, originY - maxR * 0.75], [originX, originY + maxR * 0.75]], P.light, inn);
}

/** Nền TOP Bản đồ Eo biển Manche 1940 (Đông Nam nước Anh & bờ Pháp) */
export function drawChannel1940MapTop(c: CanvasRenderingContext2D) {
  const o = lwO(c), inn = lwI(c);
  // Biển Manche nền bg2
  c.fillStyle = P.bg2;
  c.fillRect(-1100, -650, 2200, 1300);

  // Bờ biển Đông Nam & Nam nước Anh (bên trái / trên)
  const britainPts: A.Pt[] = [
    [-1050, -620],
    [-120, -620],
    [-60, -450],   // East Anglia
    [-180, -310],  // Cửa sông Thames
    [-40, -210],   // Dover / Kent
    [-210, -80],   // Sussex
    [-480, 20],    // Portsmouth / Isle of Wight
    [-820, 110],   // Dorset / Devon
    [-1050, 140],
  ];
  A.poly(c, britainPts, P.paper, P.ink, o);
  // Đường đồng mức nội địa Anh
  A.line(c, [[-750, -380], [-360, -320], [-240, -180], [-560, -60]], P.light, inn);

  // Bờ biển Pháp / Bỉ (bên phải / dưới)
  const francePts: A.Pt[] = [
    [1050, -520],
    [420, -290],
    [170, -140],   // Calais (hẹp nhất đối diện Dover)
    [140, 40],     // Boulogne / Dieppe
    [-80, 220],    // Normandy
    [-320, 380],   // Cherbourg
    [-520, 620],
    [1050, 620],
  ];
  A.poly(c, francePts, P.sand, P.ink, o);
}

// ── 2. VẬT XUYÊN PHIM (RECURRING ASSETS) ───────────────────────────

/**
 * 1) `groundRadar`: Đài radar chảo parabol mặt đất / đặt trên xe cơ động
 * Dấu nhận dạng: bệ olive, trụ xoay giữa, chảo parabol cong chữ C màu oliveLight + cần thu feed horn nhô ra trước.
 */
export function drawGroundRadar(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'side',
  opts: {
    scale?: number;
    dishAngle?: number; // SIDE: góc ngẩng (rad); TOP: góc phương vị (rad)
    mobile?: boolean;   // gắn trên khung xe tải cơ động
    active?: boolean;   // đèn/cần feed phát sáng amber
    powerScale?: number;// phóng to máy phát khi minh họa MW
  } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'side' || view === 'cutaway') {
    const elev = opts.dishAngle ?? -0.32;
    const pScale = opts.powerScale ?? 1;

    if (opts.mobile) {
      // Thân xe tải cơ động
      A.rrect(c, -85, -36, 170, 24, 5, P.olive, P.ink, o);
      // Cabin xe bên trái
      A.poly(c, [[-85, -36], [-85, -66], [-52, -66], [-40, -36]], P.oliveDark, P.ink, o);
      A.poly(c, [[-80, -61], [-56, -61], [-47, -40], [-80, -40]], P.glass, P.ink, inn);
      // 3 bánh xe
      for (const wx of [-62, -12, 52]) {
        A.circle(c, wx, -12, 13, P.dark, P.ink, o);
        A.circle(c, wx, -12, 5, P.light, P.ink, inn);
      }
    } else {
      // Chân đế cố định mặt đất
      A.poly(c, [[-64, 0], [-48, -26], [48, -26], [64, 0]], P.oliveDark, P.ink, o);
    }

    const baseY = opts.mobile ? -36 : -26;
    // Thùng máy phát công suất (phóng to khi minh họa Megawatt)
    const cabW = 68 * pScale, cabH = 34 * pScale;
    A.rrect(c, -cabW / 2, baseY - cabH, cabW, cabH, 6, P.olive, P.ink, o);
    if (view === 'cutaway' || pScale > 1.05) {
      // Lộ cuộn cao áp / đèn phát sóng bên trong thùng
      A.rrect(c, -cabW * 0.38, baseY - cabH * 0.82, cabW * 0.76, cabH * 0.64, 4, P.paper, P.ink2, inn);
      A.circle(c, 0, baseY - cabH * 0.5, cabH * 0.22, opts.active ? P.amber : P.slate, P.ink, inn);
    } else {
      // Cửa chớp tản nhiệt
      A.line(c, [[-18, baseY - 22], [18, baseY - 22]], P.ink2, inn);
      A.line(c, [[-18, baseY - 12], [18, baseY - 12]], P.ink2, inn);
    }

    // Trụ xoay nâng chảo
    const pivotY = baseY - cabH - 28;
    A.rrect(c, -12, pivotY, 24, 30, 4, P.slate, P.ink, o);
    A.circle(c, 0, pivotY, 9, P.dark, P.ink, o);

    // Cụm chảo parabol xoay theo góc ngẩng
    c.save();
    c.translate(0, pivotY);
    c.rotate(elev);
    // Đối trọng & khớp xoay phía sau lưng chảo
    A.rrect(c, -26, -10, 22, 20, 4, P.oliveDark, P.ink, o);
    // Lưng chảo parabol (dáng chữ C mở sang phải +x, đỉnh lưng nằm tại x = -6 sát trục xoay)
    c.beginPath();
    c.arc(44, 0, 52, Math.PI * 0.64, Math.PI * 1.36, false);
    c.arc(52, 0, 46, Math.PI * 1.34, Math.PI * 0.66, true);
    c.closePath();
    A.fs(c, P.oliveLight, P.ink, o);
    // Cần thu phát (feed horn) nhô ra trước tâm chảo
    A.line(c, [[4, -22], [44, 0], [4, 22]], P.ink, inn);
    A.circle(c, 46, 0, 8, opts.active ? P.amber : P.olive, P.ink, o);
    c.restore();
  } else if (view === 'top') {
    const az = opts.dishAngle ?? 0;
    if (opts.mobile) {
      // Thân xe tải nhìn từ trên xuống
      A.rrect(c, -75, -32, 150, 64, 8, P.olive, P.ink, o);
      A.rrect(c, -72, -26, 32, 52, 4, P.oliveDark, P.ink, inn);
    } else {
      // Bệ bát giác nhìn từ trên xuống
      A.circle(c, 0, 0, 48, P.oliveDark, P.ink, o);
    }
    A.circle(c, 0, 0, 34, P.olive, P.ink, o);
    // Chảo radar quay theo góc phương vị az
    c.save();
    c.rotate(az);
    // Chảo nhìn từ trên xuống là mặt cong elip có gờ trước và cần feed nhô ra
    A.ellipse(c, -6, 0, 18, 52, 0, P.oliveLight, P.ink, o);
    A.line(c, [[-6, -46], [-6, 46]], P.ink2, inn);
    // Cần feed horn chụm về phía trước (+x)
    A.line(c, [[-4, -26], [30, 0], [-4, 26]], P.ink, inn);
    A.circle(c, 32, 0, 8, opts.active ? P.amber : P.olive, P.ink, o);
    c.restore();
  }
  c.restore();
}

/**
 * 2) `earlyWarningRadar`: Đài radar cảnh giới tầm xa khổng lồ cỡ tòa nhà / giàn VHF
 * Dấu nhận dạng: Mặt tường nghiêng khổng lồ chia lưới/chấn tử hoặc chảo siêu lớn cao gấp 4 lần xe thường, có cửa/lan can đối chiếu tỷ lệ.
 */
export function drawEarlyWarningRadar(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'side',
  opts: { scale?: number; active?: boolean; vhfArray?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'side' || view === 'front') {
    if (opts.vhfArray) {
      // Giàn anten sóng dài VHF (cột cao gắn các chấn tử ngang lớn)
      A.poly(c, [[-55, 0], [-38, -32], [38, -32], [55, 0]], P.oliveDark, P.ink, o);
      A.rrect(c, -12, -260, 24, 230, 4, P.slate, P.ink, o);
      // 4 tầng chấn tử Yagi/VHF lớn
      for (const ty of [-235, -185, -135, -85]) {
        A.line(c, [[-48, ty], [48, ty]], P.ink, o);
        for (const dx of [-36, -12, 14, 38]) {
          A.line(c, [[dx, ty - 18], [dx, ty + 18]], opts.active ? P.amber : P.oliveLight, o);
        }
      }
    } else {
      // Đài cảnh báo sớm khổng lồ kiểu tòa nhà vát nghiêng (PAVE PAWS / Voronezh)
      A.poly(c, [[-130, 0], [-110, -240], [45, -240], [95, 0]], P.oliveDark, P.ink, o);
      // Mặt bên nghiêng gắn mảng thu phát khổng lồ hướng sang phải
      A.poly(c, [[30, -232], [45, -240], [95, 0], [76, 0]], P.oliveLight, P.ink, o);
      // Các tầng ban công kỹ thuật bên sườn tòa nhà để thấy quy mô khổng lồ
      for (const fy of [-60, -120, -180]) {
        A.line(c, [[-115 - fy * 0.08, fy], [35 + fy * 0.2, fy]], P.ink2, inn);
      }
      // Cửa ra vào nhỏ xíu ở chân tòa nhà để so sánh tỷ lệ con người
      A.rrect(c, -80, -32, 18, 32, 2, P.dark, P.ink, inn);
      // Đèn phát xung ở mặt nghiêng
      if (opts.active) {
        A.line(c, [[48, -220], [92, -12]], P.amber, A.px(c, 6) / s);
      }
    }
  } else if (view === 'top') {
    A.poly(c, [[-90, -80], [50, -110], [90, 0], [50, 110], [-90, 80]], P.oliveDark, P.ink, o);
    A.poly(c, [[35, -95], [78, 0], [35, 95], [15, 0]], P.oliveLight, P.ink, o);
  }
  c.restore();
}

/**
 * 3) `intruderJet`: Máy bay mục tiêu / cường kích đối phương (màu P.enemy)
 * Dấu nhận dạng: Mũi nhọn có ăng-ten RWR, buồng lái kính P.glass, cánh mũi tên, cánh đuôi đứng.
 */
export function drawIntruderJet(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'side',
  opts: {
    scale?: number;
    angle?: number;    // góc xoay (rad)
    flipX?: boolean;   // mặc định hướng sang TRÁI (-x, bay từ phải sang trái về phía radar); flipX=true thì hướng sang PHẢI
    rwrAlert?: number; // 0..1: vòng sóng cảnh báo RWR sáng ở mũi/đuôi máy bay khi nghe thấy tiếng hét radar
    jamming?: number;  // 0..1: phát chùm nhiễu chế áp từ pod dưới cánh
  } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  if (opts.angle) c.rotate(opts.angle);
  if (opts.flipX) c.scale(-s, s);
  else c.scale(s, s);

  if (view === 'side' || view === 'cutaway') {
    // Luồng phụt động cơ phía sau (+x)
    A.poly(c, [[76, -7], [102, -12], [92, 0], [102, 12], [76, 7]], P.amber, null, 0);
    // Cánh đuôi đứng
    A.poly(c, [[42, -10], [72, -46], [84, -46], [76, -8]], P.enemy, P.ink, o);
    // Thân chính khí động học (mũi hướng về -x)
    A.poly(
      c,
      [
        [-95, 2],    // chóp mũi
        [-52, -14],  // gốc buồng lái
        [18, -16],   // lưng thân
        [78, -10],   // đuôi trên
        [78, 10],    // ống xả
        [15, 14],    // bụng
        [-58, 12],
      ],
      P.enemy,
      P.ink,
      o
    );
    // Mảng lưng sáng hơn
    A.poly(c, [[-52, -14], [18, -16], [76, -10], [76, -3], [-68, -2]], P.enemyLight, null, 0);
    // Buồng lái kính
    A.poly(c, [[-56, -11], [-28, -24], [2, -16], [-18, -8]], P.glass, P.ink, o);
    // Cánh chính nhìn ngang
    A.poly(c, [[-8, 2], [28, 18], [46, 18], [22, 2]], P.enemyLight, P.ink, o);
    // Đầu thu RWR ở mũi và đỉnh đuôi
    A.circle(c, -92, 2, 4.5, opts.rwrAlert ? P.amber : P.dark, P.ink, inn);
    A.circle(c, 76, -44, 4, opts.rwrAlert ? P.amber : P.dark, P.ink, inn);
  } else if (view === 'top') {
    // Dáng nhìn từ trên xuống (mũi hướng về -x)
    // Hai cánh chính quét sau
    A.poly(
      c,
      [
        [-18, -12],
        [24, -74],
        [44, -70],
        [26, -12],
        [26, 12],
        [44, 70],
        [24, 74],
        [-18, 12],
      ],
      P.enemy,
      P.ink,
      o
    );
    // Cánh đuôi ngang
    A.poly(
      c,
      [
        [46, -10],
        [70, -38],
        [82, -34],
        [72, 0],
        [82, 34],
        [70, 38],
        [46, 10],
      ],
      P.enemy,
      P.ink,
      o
    );
    // Thân giữa
    A.poly(c, [[-95, 0], [-45, -14], [76, -10], [84, 0], [76, 10], [-45, 14]], P.enemyLight, P.ink, o);
    // Buồng lái
    A.ellipse(c, -36, 0, 22, 7, 0, P.glass, P.ink, o);
    // Cảm biến RWR ở mũi & hai mút cánh
    A.circle(c, -92, 0, 5, opts.rwrAlert ? P.amber : P.dark, P.ink, inn);
  }

  // Hiệu ứng đèn cảnh báo RWR (khi máy bay "nghe" thấy tiếng hét của radar)
  if (opts.rwrAlert && opts.rwrAlert > 0.01) {
    const a = opts.rwrAlert;
    A.withA(c, a, () => {
      A.circle(c, -92, 0, 14 + 6 * Math.sin(a * Math.PI), null, P.amber, o);
      A.circle(c, -92, 0, 26 + 10 * Math.sin(a * Math.PI), null, P.amber, inn);
    });
  }
  c.restore();
}

/**
 * 4) `stealthJet`: Máy bay tàng hình đa diện vát cạnh (dùng cho chương RCS & chương kết)
 * Dấu nhận dạng: Mũi và thân vát phẳng sắc cạnh màu P.dark viền P.ink, hất tia sóng lệch hướng.
 */
export function drawStealthJet(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'side',
  opts: { scale?: number; angle?: number; flipX?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  if (opts.angle) c.rotate(opts.angle);
  if (opts.flipX) c.scale(-s, s);
  else c.scale(s, s);

  if (view === 'side') {
    // Hình dáng vát góc đa diện phẳng (mũi bên trái -x), không có mặt đứng vuông góc
    A.poly(
      c,
      [
        [-105, 6],   // mũi nhọn sắc
        [-28, -22],  // mặt vát nghiêng chính (hất tia radar lên trời)
        [32, -16],   // đỉnh lưng
        [88, 4],     // đuôi vát mỏng
        [40, 10],    // bụng phẳng
        [-45, 10],
      ],
      P.dark,
      P.ink,
      o
    );
    // Mặt vát sáng phía trước để thấy rõ góc nghiêng hình học
    A.poly(c, [[-105, 6], [-28, -22], [-10, -4], [-55, 6]], P.slate, P.ink, inn);
    // Ô kính buồng lái vát phẳng liền khối
    A.poly(c, [[-58, -8], [-30, -19], [-12, -14], [-34, -4]], P.glass, P.ink, inn);
  } else {
    // Góc TOP: Cánh dơi răng cưa (B-2 / F-117)
    A.poly(
      c,
      [
        [-88, 0],
        [18, -92],
        [48, -74],
        [24, -36],
        [52, -18],
        [34, 0],
        [52, 18],
        [24, 36],
        [48, 74],
        [18, 92],
      ],
      P.dark,
      P.ink,
      o
    );
    A.line(c, [[-88, 0], [0, -32], [34, 0], [0, 32], [-88, 0]], P.slate, inn);
    A.poly(c, [[-52, 0], [-28, -12], [-18, 0], [-28, 12]], P.glass, P.ink, inn);
  }
  c.restore();
}

/**
 * 5) `awacsPlane`: Máy bay cảnh báo sớm trên không (AWACS) + đĩa rotodome trên lưng
 * Và `fighterInterceptor`: Tiêm kích đánh chặn phe phòng thủ (Spitfire / Fighter)
 */
export function drawAwacsPlane(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'side',
  opts: { scale?: number; dishRot?: number } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'side') {
    // Hướng bay sang phải (+x) để quét về phía đối phương
    // Cánh đuôi đứng
    A.poly(c, [[-86, -8], [-108, -52], [-88, -52], [-62, -10]], P.olive, P.ink, o);
    // Thân máy bay lớn
    A.rrect(c, -95, -16, 185, 32, 15, P.paper, P.ink, o);
    A.line(c, [[-88, 2], [82, 2]], P.olive, inn);
    // Kính buồng lái phía trước (+x)
    A.poly(c, [[62, -12], [84, -4], [84, 2], [62, 2]], P.glass, P.ink, inn);
    // Cánh chính & động cơ
    A.poly(c, [[-15, 4], [-32, 20], [18, 20], [28, 4]], P.oliveLight, P.ink, o);
    A.rrect(c, -6, 16, 26, 12, 4, P.slate, P.ink, o);
    // Giá đỡ chữ V trên lưng
    A.line(c, [[-28, -16], [-18, -44]], P.ink, o);
    A.line(c, [[4, -16], [-6, -44]], P.ink, o);
    // Đĩa radar Rotodome đặc trưng trên lưng
    A.ellipse(c, -12, -48, 52, 11, 0, P.dark, P.ink, o);
    A.ellipse(c, -12, -48, 22, 6, 0, P.white, null, 0);
  } else {
    // TOP
    A.poly(c, [[-12, -95], [14, -14], [14, 14], [-12, 95], [-28, 90], [-8, 0], [-28, -90]], P.oliveLight, P.ink, o);
    A.rrect(c, -90, -14, 180, 28, 14, P.paper, P.ink, o);
    A.circle(c, -14, 0, 46, P.dark, P.ink, o);
    const r = opts.dishRot ?? 0;
    A.line(c, [[-14 + Math.cos(r) * -42, Math.sin(r) * -42], [-14 + Math.cos(r) * 42, Math.sin(r) * 42]], P.white, A.px(c, 5) / s);
  }
  c.restore();
}

export function drawFighterInterceptor(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'top',
  opts: { scale?: number; angle?: number } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  if (opts.angle) c.rotate(opts.angle);
  c.scale(s, s);

  if (view === 'top') {
    // Dáng tiêm kích cánh elip (Spitfire / Hurricane năm 1940) nhìn từ trên xuống, hướng +x
    A.ellipse(c, 4, 0, 18, 48, 0, P.olive, P.ink, o);
    A.poly(c, [[-38, -5], [-46, -18], [-32, -18], [-26, 0], [-32, 18], [-46, 18], [-38, 5]], P.oliveDark, P.ink, o);
    A.rrect(c, -42, -7, 84, 14, 7, P.oliveLight, P.ink, o);
    A.ellipse(c, -4, 0, 10, 5, 0, P.glass, P.ink, inn);
    // Cánh quạt mũi
    A.line(c, [[44, -14], [44, 14]], P.ink, inn);
  } else {
    A.poly(c, [[-44, -4], [-40, -18], [-28, -6], [36, -8], [44, 0], [34, 8], [-38, 6]], P.olive, P.ink, o);
    A.ellipse(c, -4, -8, 11, 5, 0, P.glass, P.ink, inn);
  }
  c.restore();
}

/**
 * 6) `chainHomeTower` & `plotTable`: Tháp radar Chain Home 1940 & Bàn bản đồ điều hành tác chiến
 */
export function drawChainHomeTower(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'side',
  opts: { scale?: number; active?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'side' || view === 'front') {
    // Tháp khung thép chữ A cao mảnh năm 1940
    A.line(c, [[-26, 0], [-6, -150]], P.ink, o);
    A.line(c, [[26, 0], [6, -150]], P.ink, o);
    // Các thanh giằng chữ X
    for (const [y0, y1, w0, w1] of [
      [0, -38, 26, 21],
      [-38, -76, 21, 16],
      [-76, -114, 16, 11],
      [-114, -150, 11, 6],
    ] as const) {
      A.line(c, [[-w1, y1], [w1, y1]], P.ink, inn);
      A.line(c, [[-w0, y0], [w1, y1]], P.ink2, inn);
      A.line(c, [[w0, y0], [-w1, y1]], P.ink2, inn);
    }
    // Xà ngang đỉnh tháp căng dây anten phát sóng
    A.line(c, [[-28, -142], [28, -142]], P.oliveDark, o);
    A.line(c, [[-22, -112], [22, -112]], P.oliveDark, o);
    if (opts.active) {
      A.circle(c, 0, -152, 7, P.amber, P.ink, inn);
    }
  } else {
    // TOP: chân đế vuông khung thép + điểm tâm phát sóng
    A.rrect(c, -16, -16, 32, 32, 3, P.oliveLight, P.ink, o);
    A.line(c, [[-16, -16], [16, 16]], P.ink, inn);
    A.line(c, [[-16, 16], [16, -16]], P.ink, inn);
    A.circle(c, 0, 0, 7, opts.active ? P.amber : P.oliveDark, P.ink, o);
  }
  c.restore();
}

/** Bàn bản đồ phòng tác chiến (Filter Room 1940) với nhân viên đẩy quân cờ mục tiêu */
export function drawPlottingTable(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: { scale?: number; markerProgress?: number } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  const p = opts.markerProgress ?? 0.5;
  c.save();
  c.translate(x, y);
  c.scale(s, s);

  // Mặt bàn gỗ/kim loại nhìn từ trên xuống
  A.rrect(c, -260, -165, 520, 330, 14, P.oliveDark, P.ink, o);
  A.rrect(c, -238, -145, 476, 290, 8, P.bg2, P.ink, o);

  // Lưới ô vuông tác chiến trên mặt bàn
  for (let gx = -160; gx <= 160; gx += 80) {
    A.line(c, [[gx, -145], [gx, 145]], P.light, inn);
  }
  for (let gy = -80; gy <= 80; gy += 80) {
    A.line(c, [[-238, gy], [238, gy]], P.light, inn);
  }

  // Bờ biển Anh (trái) và Pháp (phải) thu nhỏ trên mặt bàn
  A.poly(c, [[-238, -145], [-70, -145], [-40, -30], [-130, 85], [-238, 110]], P.paper, P.ink, o);
  A.poly(c, [[238, -90], [95, -20], [50, 95], [10, 145], [238, 145]], P.sand, P.ink, o);

  // Vệt đường đi của tốp máy bay địch và quân cờ đang được que cào đẩy
  const mx = A.lerp(115, -15, p);
  const my = A.lerp(35, -25, p);
  A.line(c, [[115, 35], [mx, my]], P.enemy, o, [8, 6]);
  // Quân cờ mục tiêu (khối mũi tên đỏ gạch)
  A.rrect(c, mx - 24, my - 16, 48, 32, 5, P.enemy, P.ink, o);
  A.poly(c, [[mx - 14, my], [mx + 10, my - 9], [mx + 10, my + 9]], P.white, null, 0);

  // Quân cờ tiêm kích đánh chặn của Anh xuất phát từ bờ biển
  const fx = A.lerp(-125, -45, p);
  const fy = A.lerp(-75, -35, p);
  A.rrect(c, fx - 22, fy - 14, 44, 28, 5, P.olive, P.ink, o);

  // Hai nhân viên (nhìn từ trên xuống: vai + đầu + que cào đẩy quân cờ)
  // Nhân viên 1 (phía dưới bàn, đẩy quân cờ địch)
  A.ellipse(c, 40, 200, 38, 20, 0, P.olive, P.ink, o);
  A.circle(c, 40, 195, 16, P.skin, P.ink, o);
  // Que cào gỗ (croupier rake) có viền tối nối từ tay tới quân cờ
  A.capsule(c, [68, 185], [mx + 8, my + 16], 4, P.paper, P.ink, inn);
  A.line(c, [[mx - 8, my + 16], [mx + 22, my + 16]], P.ink, o);

  // Nhân viên 2 (phía trên bàn, đeo tai nghe điện thoại nhận tin từ tháp radar)
  A.ellipse(c, -90, -200, 38, 20, 0, P.olive, P.ink, o);
  A.circle(c, -90, -195, 16, P.skin, P.ink, o);
  A.rrect(c, -110, -200, 7, 14, 3, P.dark, P.ink, inn);
  A.rrect(c, -77, -200, 7, 14, 3, P.dark, P.ink, inn);
  c.restore();
}

/**
 * 7) `phasedArrayPanel` & `warship`: Mảng pha điện tử AESA (SIDE/CUTAWAY/FRONT) và Tàu khu trục 4 mặt phẳng
 */
export function drawPhasedArrayPanel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'cutaway',
  opts: {
    scale?: number;
    steerAngle?: number; // góc lái tia điện tử (rad)
    brokenModules?: number[]; // danh sách chỉ số mô-đun bị hỏng (minh họa hỏng vài phần tử vẫn chạy)
    pulsePhase?: number; // 0..1 pha dịch thời gian
  } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  const steer = opts.steerAngle ?? 0;
  const broken = new Set(opts.brokenModules ?? []);
  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (view === 'cutaway' || view === 'side') {
    // Khung vỏ mặt cắt của mảng pha phẳng (8 mô-đun T/R xếp dọc)
    A.rrect(c, -150, -230, 180, 460, 12, P.paper, P.ink, o);
    // Mặt tấm chắn bức xạ phía trước (+x)
    A.rrect(c, 22, -230, 16, 460, 4, P.slate, P.ink, o);
    // Đường trục phân phối tín hiệu gốc phía sau
    A.line(c, [[-120, -190], [-120, 190]], P.ink, o);

    const N = 7;
    for (let i = 0; i < N; i++) {
      const my = -180 + i * 60;
      const isDead = broken.has(i);
      // Độ dịch thời gian (phase shift) phụ thuộc vào góc lái tia steer
      const delayShift = Math.sin(steer) * (i - (N - 1) / 2) * 14;

      // Dây dẫn từ trục chính vào bộ dịch pha
      A.line(c, [[-120, my], [-92, my]], P.ink2, inn);

      // Hộp dịch pha (Phase Shifter) + Mô-đun thu phát (T/R module)
      A.rrect(
        c,
        -92,
        my - 18,
        96,
        36,
        6,
        isDead ? P.light : P.oliveLight,
        P.ink,
        o
      );

      if (isDead) {
        // Dấu gạch chéo mô-đun hỏng
        A.line(c, [[-80, my - 10], [-8, my + 10]], P.enemy, o);
        A.line(c, [[-80, my + 10], [-8, my - 10]], P.enemy, o);
      } else {
        // Xung tín hiệu bên trong mô-đun lệch nhau theo delayShift để lái mặt sóng
        const px = A.clamp(-55 + delayShift, -82, -14);
        A.circle(c, px, my, 8, P.amber, P.ink, inn);
        // Đầu phát gắn vào mặt phẳng anten
        A.line(c, [[4, my], [28, my]], P.ink, o);
        A.circle(c, 34, my, 6, P.amber, P.ink, inn);
      }
    }
  } else {
    // FRONT: Tấm bát giác phẳng gồm hàng trăm ô mô-đun nhỏ
    A.poly(
      c,
      [
        [-95, -135],
        [95, -135],
        [135, -95],
        [135, 95],
        [95, 135],
        [-95, 135],
        [-135, 95],
        [-135, -95],
      ],
      P.dark,
      P.ink,
      o
    );
    let idx = 0;
    for (let gy = -96; gy <= 96; gy += 32) {
      for (let gx = -96; gx <= 96; gx += 32) {
        if (Math.abs(gx) + Math.abs(gy) > 165) continue;
        const dead = broken.has(idx++);
        A.rrect(
          c,
          gx - 12,
          gy - 12,
          24,
          24,
          3,
          dead ? P.enemy : P.oliveLight,
          P.ink,
          inn
        );
      }
    }
  }
  c.restore();
}

/** Tàu khu trục phòng không (Warship) có 4 tấm mảng pha phẳng gắn trên thượng tầng */
export function drawWarship(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  view: ViewMode = 'top',
  opts: { scale?: number; angle?: number; activePanels?: boolean; vlsOpen?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  if (opts.angle) c.rotate(opts.angle);
  c.scale(s, s);

  if (view === 'top') {
    // Sóng rẽ nước quanh mũi tàu
    A.line(c, [[150, 0], [85, -52], [-120, -64]], P.white, inn);
    A.line(c, [[150, 0], [85, 52], [-120, 64]], P.white, inn);
    // Thân tàu khu trục nhìn từ trên xuống (mũi nhọn ở +x)
    A.poly(
      c,
      [
        [145, 0],
        [75, -36],
        [-125, -34],
        [-142, -24],
        [-142, 24],
        [-125, 34],
        [75, 36],
      ],
      P.slate,
      P.ink,
      o
    );
    // Sàn tàu bên trong
    A.poly(c, [[122, 0], [68, -28], [-118, -26], [-118, 26], [68, 28]], P.light, P.ink2, inn);
    // Cụm bệ phóng thẳng đứng VLS phía mũi
    A.rrect(c, 52, -16, 34, 32, 3, P.paper, P.ink, inn);
    if (opts.vlsOpen) {
      A.circle(c, 69, 0, 7, P.amber, P.ink, inn);
    }
    // Thượng tầng trung tâm mang 4 mặt mảng pha AESA nhìn 4 hướng
    A.poly(
      c,
      [
        [34, -18],
        [18, -32],
        [-32, -32],
        [-48, -18],
        [-48, 18],
        [-32, 32],
        [18, 32],
        [34, 18],
      ],
      P.olive,
      P.ink,
      o
    );
    // 4 tấm mảng pha phẳng ở 4 mặt vát (Đông-Bắc, Đông-Nam, Tây-Bắc, Tây-Nam)
    const pCol = opts.activePanels ? P.amber : P.dark;
    A.line(c, [[32, -16], [16, -30]], pCol, A.px(c, 6) / s);
    A.line(c, [[32, 16], [16, 30]], pCol, A.px(c, 6) / s);
    A.line(c, [[-46, -16], [-30, -30]], pCol, A.px(c, 6) / s);
    A.line(c, [[-46, 16], [-30, 30]], pCol, A.px(c, 6) / s);
    // Pháo hạm ở mũi
    A.circle(c, 102, 0, 9, P.oliveDark, P.ink, o);
    A.line(c, [[108, 0], [126, 0]], P.ink, o);
  } else {
    // SIDE: Tàu khu trục nhìn ngang trên mặt biển
    // Thân tàu
    A.poly(c, [[-145, 0], [-135, -28], [115, -32], [148, -42], [132, 0]], P.slate, P.ink, o);
    // Đài chỉ huy vát góc gắn tấm mảng pha phẳng
    A.poly(c, [[-48, -30], [-30, -86], [28, -86], [46, -30]], P.olive, P.ink, o);
    // Tấm mảng pha bát giác gắn trên mặt vát đài chỉ huy
    A.poly(c, [[18, -76], [34, -76], [42, -44], [24, -44]], opts.activePanels ? P.amber : P.dark, P.ink, o);
    // Cột anten nhỏ trên đỉnh
    A.line(c, [[0, -86], [-6, -118]], P.ink, o);
    // Pháo mũi và cụm VLS
    A.rrect(c, 56, -36, 26, 6, 2, P.oliveDark, P.ink, inn);
    A.poly(c, [[92, -32], [98, -44], [112, -44], [116, -32]], P.oliveLight, P.ink, o);
    A.line(c, [[114, -40], [134, -44]], P.ink, o);
  }
  c.restore();
}

/**
 * 8) `samMissile` & `armMissile`: Tên lửa phòng không (phe ta) và Tên lửa chống bức xạ săn radar ARM (phe địch)
 */
export function drawMissile(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  opts: { scale?: number; isEnemyArm?: boolean; thrust?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  const bodyCol = opts.isEnemyArm ? P.enemy : P.paper;
  const noseCol = opts.isEnemyArm ? P.dark : P.olive;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(s, s);

  if (opts.thrust !== false) {
    // Luồng lửa động cơ tên lửa phía sau (-x)
    A.poly(c, [[-34, -5], [-64, -10], [-52, 0], [-64, 10], [-34, 5]], P.amber, null, 0);
  }
  // Cánh lái đuôi và giữa
  A.poly(c, [[-32, -6], [-38, -16], [-24, -16], [-18, -6]], noseCol, P.ink, inn);
  A.poly(c, [[-32, 6], [-38, 16], [-24, 16], [-18, 6]], noseCol, P.ink, inn);
  // Thân tên lửa mảnh dài (mũi hướng về +x)
  A.poly(c, [[-34, -6], [18, -6], [38, 0], [18, 6], [-34, 6]], bodyCol, P.ink, o);
  // Đầu dò (seeker head)
  A.poly(c, [[16, -6], [38, 0], [16, 6]], noseCol, P.ink, o);
  c.restore();
}

// ── 3. HIỆU ỨNG SÓNG, ĐỒ THỊ CƠ CHẾ, VỤ NỔ & CALLOUT ─────────────

/** Vẽ vòng cung sóng radar (phát đi màu P.amber hoặc tiếng vọng về màu P.sky) */
export function drawWaveArc(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  centerAngle: number,
  spreadAngle: number,
  color: string,
  alpha = 1,
  thicknessPx = 4,
  dashed = false
) {
  if (r <= 2 || alpha <= 0.01) return;
  A.withA(c, alpha, () => {
    c.beginPath();
    c.arc(cx, cy, r, centerAngle - spreadAngle / 2, centerAngle + spreadAngle / 2);
    if (dashed) c.setLineDash([12, 8]);
    A.fs(c, null, color, A.px(c, thicknessPx));
    c.setLineDash([]);
  });
}

/** Bảng trục thời gian đo độ trễ xung phát - xung thu (A-scope / Timing bar) */
export function drawTimingScope(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    txPos?: number;     // 0..1 vị trí xung phát
    rxPos?: number;     // 0..1 vị trí xung thu
    rxHeight?: number;  // 0..1 biên độ xung thu
    cursorP?: number;   // 0..1 vị trí con trỏ quét thời gian
    secondTxPos?: number; // nếu minh họa PRF nhanh phát xung thứ 2 trước khi xung thu về
    ambiguousGhost?: number; // 0..1 hiện bóng mục tiêu ảo ở gần
    noiseFloor?: number; // 0..1 mức nhiễu nền
  } = {}
) {
  const o = lwO(c), inn = lwI(c);
  c.save();
  c.translate(x, y);
  A.rrect(c, -w / 2, -h / 2, w, h, 10, P.paper, P.ink, o);

  const x0 = -w * 0.43, x1 = w * 0.43, baseY = h * 0.28;
  // Lưới chia khắc thời gian
  for (let i = 0; i <= 8; i++) {
    const gx = A.lerp(x0, x1, i / 8);
    A.line(c, [[gx, -h * 0.35], [gx, baseY]], P.light, inn);
  }
  A.line(c, [[x0, baseY], [x1, baseY]], P.ink, o);

  // Nhiễu nền (noise floor) nếu có
  const nf = opts.noiseFloor ?? 0.08;
  const pts: A.Pt[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const px = A.lerp(x0, x1, u);
    let amp = A.rnd(i * 19 + 3) * h * 0.35 * nf;

    // Gai xung phát 1 (màu amber)
    if (opts.txPos !== undefined && Math.abs(u - opts.txPos) < 0.025) {
      const k = 1 - Math.abs(u - opts.txPos) / 0.025;
      amp = Math.max(amp, k * h * 0.62);
    }
    // Gai xung phát 2 (khi PRF cao)
    if (opts.secondTxPos !== undefined && Math.abs(u - opts.secondTxPos) < 0.025) {
      const k = 1 - Math.abs(u - opts.secondTxPos) / 0.025;
      amp = Math.max(amp, k * h * 0.62);
    }
    // Gai xung thu (màu sky)
    if (opts.rxPos !== undefined && Math.abs(u - opts.rxPos) < 0.028) {
      const k = 1 - Math.abs(u - opts.rxPos) / 0.028;
      amp = Math.max(amp, k * h * 0.55 * (opts.rxHeight ?? 0.45));
    }
    pts.push([px, baseY - amp]);
  }
  A.line(c, pts, P.ink, inn);

  // Tô nổi xung phát (amber) và xung thu (sky)
  if (opts.txPos !== undefined) {
    const txX = A.lerp(x0, x1, opts.txPos);
    A.poly(c, [[txX - 10, baseY], [txX, baseY - h * 0.62], [txX + 10, baseY]], P.amber, P.ink, inn);
  }
  if (opts.secondTxPos !== undefined) {
    const tx2X = A.lerp(x0, x1, opts.secondTxPos);
    A.poly(c, [[tx2X - 10, baseY], [tx2X, baseY - h * 0.62], [tx2X + 10, baseY]], P.amber, P.ink, inn);
  }
  if (opts.rxPos !== undefined && (opts.rxHeight ?? 0.45) > 0.02) {
    const rxX = A.lerp(x0, x1, opts.rxPos);
    const rh = h * 0.55 * (opts.rxHeight ?? 0.45);
    A.poly(c, [[rxX - 10, baseY], [rxX, baseY - rh], [rxX + 10, baseY]], P.sky, P.ink, inn);
  }

  // Mũi tên khoảng trễ thời gian giữa xung phát và xung thu
  if (opts.txPos !== undefined && opts.rxPos !== undefined && opts.rxPos > opts.txPos) {
    const txX = A.lerp(x0, x1, opts.txPos);
    const rxX = A.lerp(x0, x1, opts.rxPos);
    const curX = opts.cursorP !== undefined ? A.lerp(txX, rxX, opts.cursorP) : rxX;
    A.line(c, [[txX, baseY + 14], [curX, baseY + 14]], P.amber, o);
  }
  c.restore();
}

/** Lưới 4x4 = 16 ô vuông minh họa định luật suy hao lũy thừa 4 (gấp đôi cự ly → yếu đi 16 lần) */
export function drawPowerGrid16(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opts: { highlightSingle?: boolean; fillFraction?: number } = {}
) {
  const o = lwO(c), inn = lwI(c);
  const cell = size / 4;
  c.save();
  c.translate(x - size / 2, y - size / 2);
  for (let r = 0; r < 4; r++) {
    for (let col = 0; col < 4; col++) {
      const isCenter = r === 1 && col === 1;
      const fill = opts.highlightSingle
        ? isCenter
          ? P.sky
          : P.paper
        : P.amber;
      A.rrect(c, col * cell + 2, r * cell + 2, cell - 4, cell - 4, 4, fill, P.ink, isCenter && opts.highlightSingle ? o : inn);
    }
  }
  c.restore();
}

/** Vật mẫu thử nghiệm diện tích phản xạ hiệu dụng RCS (Tấm phẳng nghiêng, Góc phản xạ corner reflector, Quả cầu, Chim nhỏ) */
export function drawRcsSpecimen(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: 'plate' | 'corner' | 'sphere' | 'bird',
  opts: { scale?: number; tiltAngle?: number } = {}
) {
  const s = opts.scale ?? 1;
  const o = lwO(c) / s, inn = lwI(c) / s;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  if (opts.tiltAngle) c.rotate(opts.tiltAngle);

  if (kind === 'plate') {
    // Tấm kim loại phẳng dày có chân giá xoay
    A.rrect(c, -10, -85, 20, 170, 3, P.light, P.ink, o);
    A.line(c, [[-6, -72], [-6, 72]], P.white, inn);
    A.circle(c, 0, 0, 8, P.dark, P.ink, o);
  } else if (kind === 'corner') {
    // Góc phản xạ (Corner reflector — 2 mặt vuông góc 90 độ hắt ngược mọi tia tới về đúng nguồn)
    A.poly(
      c,
      [
        [35, -70],
        [-35, 0],
        [35, 70],
        [48, 57],
        [-9, 0],
        [48, -57],
      ],
      P.light,
      P.ink,
      o
    );
  } else if (kind === 'sphere') {
    // Quả cầu kim loại lớn (tán xạ đều mọi hướng nên phản hồi về radar yếu hơn góc phản xạ)
    A.circle(c, 0, 0, 62, P.slate, P.ink, o);
    A.ellipse(c, -18, -18, 20, 12, -0.5, P.light, null, 0);
  } else if (kind === 'bird') {
    // Con chim nhỏ đang vỗ cánh
    A.poly(c, [[-16, 0], [-4, -6], [14, -2], [22, 2], [4, 5]], P.oliveDark, P.ink, o);
    A.poly(c, [[-2, -4], [8, -22], [16, -18], [8, -2]], P.olive, P.ink, o);
  }
  c.restore();
}

/** Vụ nổ / Chớp đầu nòng đồng bộ với sound.json */
export function drawExplosion(c: CanvasRenderingContext2D, x: number, y: number, p: number, maxR = 65) {
  if (p <= 0 || p >= 1) return;
  const o = lwO(c);
  const r = maxR * A.eo(p, 0, 1);
  const a = 1 - A.ei(p, 0.35, 1);
  A.withA(c, a, () => {
    // Sao gai nổ bên ngoài
    const pts: A.Pt[] = [];
    const spikes = 10;
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i * Math.PI) / spikes;
      const rad = i % 2 === 0 ? r * 1.15 : r * 0.58;
      pts.push([x + Math.cos(ang) * rad, y + Math.sin(ang) * rad]);
    }
    A.poly(c, pts, P.amber, P.ink, o);
    A.circle(c, x, y, r * 0.45, P.white, null, 0);
  });
}

/** Callout tối giản (chỉ dùng cho số liệu voice đọc hoặc phân biệt 2 chế độ, tối đa 2 cùng lúc) */
export function drawCallout(
  c: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  text: string,
  opts: { anchorScreen?: A.Pt; accent?: string; alpha?: number } = {}
) {
  const a = opts.alpha ?? 1;
  if (a <= 0.01) return;
  A.withA(c, a, () => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.font = '700 26px "Inter", "SF Pro Display", -apple-system, sans-serif';
    const m = c.measureText(text);
    const padX = 18, h = 46;
    const w = m.width + padX * 2;

    if (opts.anchorScreen) {
      const [ax, ay] = opts.anchorScreen;
      A.line(c, [[sx, sy], [ax, ay]], P.ink, 2.5);
      A.circle(c, ax, ay, 5, opts.accent ?? P.amber, P.ink, 2);
    }

    A.rrect(c, sx - w / 2, sy - h / 2, w, h, 8, P.paper, P.ink, 3);
    if (opts.accent) {
      A.rrect(c, sx - w / 2, sy - h / 2, 8, h, 4, opts.accent, null, 0);
    }
    c.fillStyle = P.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, sx + (opts.accent ? 3 : 0), sy + 1);
    c.restore();
  });
}

