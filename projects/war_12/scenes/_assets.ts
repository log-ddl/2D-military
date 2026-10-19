import * as A from './shared/art';
import { P, LINE } from './shared/palette';

export type ViewMode = 'side' | 'cut' | 'top';

/** Helper lấy độ dày nét chuẩn theo transform hiện tại */
export const lwO = (c: CanvasRenderingContext2D) => A.px(c, LINE.outer);
export const lwI = (c: CanvasRenderingContext2D) => A.px(c, LINE.inner);

// ═══════════════════════════════════════════════════════════════════════════
// 1. NỀN BỐI CẢNH (BACKGROUNDS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nền lát cắt Trái Đất - Khí quyển - Vũ trụ (dùng cho góc nhìn ngang `side`).
 * Mặt đất tại groundY (mặc định y = 320), tầng khí quyển từ y = -80..320, trên y = -80 là không gian vũ trụ.
 */
export function drawEarthSpaceBg(
  c: CanvasRenderingContext2D,
  opts: {
    groundY?: number;
    karmanY?: number;
    curvature?: number;
    showContinents?: boolean;
    leftTerritory?: boolean;
    rightTerritory?: boolean;
  } = {}
) {
  const gY = opts.groundY ?? 320;
  const kY = opts.karmanY ?? -90;
  const curv = opts.curvature ?? 90;
  const o = lwO(c);
  const inn = lwI(c);

  // Tầng không gian vũ trụ (phía trên đường Kármán)
  c.fillStyle = '#dfe9f2';
  c.fillRect(-3000, -2000, 6000, kY + 2000);

  // Dải chuyển tiếp thượng tầng khí quyển
  c.fillStyle = '#eaf1f7';
  c.fillRect(-3000, kY, 6000, (gY - kY) * 0.42);

  // Tầng khí quyển chính
  c.fillStyle = P.bg;
  c.fillRect(-3000, kY + (gY - kY) * 0.42, 6000, (gY - kY) * 0.58 + 300);

  // Đường ranh giới Kármán (khí quyển / chân không vũ trụ)
  c.save();
  c.beginPath();
  c.moveTo(-2400, kY + curv * 0.65);
  c.quadraticCurveTo(0, kY - curv * 0.35, 2400, kY + curv * 0.65);
  c.setLineDash([18, 14]);
  c.strokeStyle = P.slate;
  c.lineWidth = inn;
  c.stroke();
  c.setLineDash([]);
  c.restore();

  // Mặt biển / đường cong Trái Đất
  c.beginPath();
  c.moveTo(-2600, gY + curv);
  c.quadraticCurveTo(0, gY - curv * 0.5, 2600, gY + curv);
  c.lineTo(2600, gY + 1400);
  c.lineTo(-2600, gY + 1400);
  c.closePath();
  c.fillStyle = '#dde7ef';
  c.fill();

  if (opts.showContinents !== false) {
    // Lục địa phe tấn công bên trái
    c.beginPath();
    c.moveTo(-2200, gY + curv * 0.85);
    c.quadraticCurveTo(-1100, gY - curv * 0.15, -360, gY + 6);
    c.lineTo(-320, gY + 900);
    c.lineTo(-2200, gY + 900);
    c.closePath();
    c.fillStyle = opts.leftTerritory ? '#efe4e1' : P.bg2;
    c.fill();
    c.strokeStyle = opts.leftTerritory ? P.enemy : P.ink;
    c.lineWidth = o;
    c.stroke();

    // Lục địa phe phòng thủ bên phải
    c.beginPath();
    c.moveTo(360, gY + 6);
    c.quadraticCurveTo(1100, gY - curv * 0.15, 2200, gY + curv * 0.85);
    c.lineTo(2200, gY + 900);
    c.lineTo(320, gY + 900);
    c.closePath();
    c.fillStyle = opts.rightTerritory ? '#e6ece2' : P.bg2;
    c.fill();
    c.strokeStyle = opts.rightTerritory ? P.oliveDark : P.ink;
    c.lineWidth = o;
    c.stroke();
  }

  // Đường cong chân trời chính
  c.beginPath();
  c.moveTo(-2400, gY + curv * 0.9);
  c.quadraticCurveTo(0, gY - curv * 0.45, 2400, gY + curv * 0.9);
  c.strokeStyle = P.ink;
  c.lineWidth = o;
  c.stroke();
}

/**
 * Nền mặt đất phẳng/đồi thoải cho các cảnh cận/trung cảnh mặt đất (`side`).
 */
export function drawGroundSideBg(
  c: CanvasRenderingContext2D,
  groundY = 300,
  opts: { hills?: boolean; seaLeft?: number; seaRight?: number } = {}
) {
  const o = lwO(c);
  const inn = lwI(c);

  // Dải trời phân tầng nhẹ
  c.fillStyle = '#e7eff6';
  c.fillRect(-3000, -1600, 6000, 1000);
  c.fillStyle = P.bg;
  c.fillRect(-3000, -600, 6000, groundY + 600);

  if (opts.hills) {
    A.poly(
      c,
      [
        [-2200, groundY],
        [-1650, groundY - 85],
        [-1150, groundY - 35],
        [-650, groundY - 110],
        [-150, groundY - 28],
        [450, groundY - 75],
        [1050, groundY - 20],
        [1650, groundY - 65],
        [2200, groundY],
      ],
      '#e4ecf2',
      P.slate,
      inn
    );
  }

  // Lớp đất dưới chân trời
  c.fillStyle = P.bg2;
  c.fillRect(-3000, groundY, 6000, 1200);

  // Nếu có vùng biển
  if (opts.seaLeft !== undefined && opts.seaRight !== undefined) {
    c.fillStyle = '#d6e6ee';
    c.fillRect(opts.seaLeft, groundY, opts.seaRight - opts.seaLeft, 180);
    A.line(
      c,
      [
        [opts.seaLeft, groundY],
        [opts.seaRight, groundY],
      ],
      P.sky,
      o
    );
  }

  A.line(
    c,
    [
      [-3000, groundY],
      [3000, groundY],
    ],
    P.ink,
    o
  );
  // Gạch mặt cắt đất
  for (let x = -2000; x <= 2000; x += 90) {
    A.line(
      c,
      [
        [x, groundY + 4],
        [x - 22, groundY + 28],
      ],
      P.slate,
      inn * 0.8
    );
  }
}

/**
 * Nền bản đồ chiến thuật nhìn từ trên xuống (`top`).
 * Hỗ trợ nhiều bố cục: 'continents' (2 lục địa cách đại dương), 'coast' (bờ biển + vùng biển rộng cho tàu chiến), 'border' (biên giới đất liền + thành phố + đồng ruộng).
 */
export function drawTacticalMapBg(
  c: CanvasRenderingContext2D,
  mode: 'continents' | 'coast' | 'border' = 'continents'
) {
  const o = lwO(c);
  const inn = lwI(c);

  // Nền đại dương hoặc đất nền
  c.fillStyle = mode === 'border' ? P.bg : '#dce8f0';
  c.fillRect(-2400, -1600, 4800, 3200);

  // Lưới tọa độ chiến thuật rất nhạt để định vị không gian
  c.save();
  c.strokeStyle = 'rgba(71, 85, 105, 0.12)';
  c.lineWidth = inn * 0.75;
  for (let x = -1800; x <= 1800; x += 200) {
    c.beginPath();
    c.moveTo(x, -1200);
    c.lineTo(x, 1200);
    c.stroke();
  }
  for (let y = -1000; y <= 1000; y += 200) {
    c.beginPath();
    c.moveTo(-1800, y);
    c.lineTo(1800, y);
    c.stroke();
  }
  c.restore();

  if (mode === 'continents') {
    // Lục địa Trái (Lãnh thổ phe phóng tên lửa)
    const leftLand: A.Pt[] = [
      [-1900, -900],
      [-320, -900],
      [-210, -560],
      [-140, -180],
      [-240, 220],
      [-170, 560],
      [-350, 900],
      [-1900, 900],
    ];
    A.poly(c, leftLand, '#efe6e4', P.enemy, o);

    // Đường biên giới nội địa phe trái
    A.line(
      c,
      [
        [-230, -540],
        [-160, -180],
        [-255, 220],
        [-190, 550],
      ],
      P.enemy,
      inn,
      [14, 10]
    );

    // Lục địa Phải (Lãnh thổ phe phòng thủ)
    const rightLand: A.Pt[] = [
      [1900, -900],
      [360, -900],
      [250, -480],
      [190, -80],
      [280, 310],
      [210, 650],
      [390, 900],
      [1900, 900],
    ];
    A.poly(c, rightLand, P.bg2, P.oliveDark, o);
  } else if (mode === 'coast') {
    // Vùng lãnh thổ đối phương góc trái-trên
    A.poly(
      c,
      [
        [-1900, -950],
        [-520, -950],
        [-440, -520],
        [-620, -180],
        [-980, 80],
        [-1900, 180],
      ],
      '#efe6e4',
      P.enemy,
      o
    );
    // Bờ biển đồng minh/phòng thủ bên phải
    A.poly(
      c,
      [
        [1900, -950],
        [420, -950],
        [310, -480],
        [240, -60],
        [330, 380],
        [490, 950],
        [1900, 950],
      ],
      P.bg2,
      P.oliveDark,
      o
    );
  } else if (mode === 'border') {
    // Vùng bên trái biên giới
    A.poly(
      c,
      [
        [-1900, -950],
        [-180, -950],
        [-120, -320],
        [-210, 260],
        [-140, 950],
        [-1900, 950],
      ],
      '#efe6e4',
      P.ink,
      o
    );
    // Vùng bên phải biên giới (cánh đồng + đô thị)
    A.poly(
      c,
      [
        [-180, -950],
        [1900, -950],
        [1900, 950],
        [-140, 950],
        [-210, 260],
        [-120, -320],
      ],
      P.bg2,
      P.ink,
      o
    );
    // Các ô ruộng trống (empty fields) bên phải
    for (const [fx, fy, fw, fh] of [
      [40, -420, 260, 170],
      [330, -400, 240, 160],
      [60, 210, 280, 180],
      [370, 230, 260, 170],
    ] as const) {
      A.rrect(c, fx, fy, fw, fh, 8, '#e2ebd9', P.slate, inn * 0.8);
      for (let ly = fy + 35; ly < fy + fh - 20; ly += 35) {
        A.line(
          c,
          [
            [fx + 18, ly],
            [fx + fw - 18, ly],
          ],
          P.oliveLight,
          inn * 0.7
        );
      }
    }
    // Đường phân giới nét đứt đậm
    A.line(
      c,
      [
        [-180, -900],
        [-120, -320],
        [-210, 260],
        [-140, 900],
      ],
      P.enemy,
      o * 1.1,
      [20, 14]
    );
  }
}

/**
 * Vẽ cụm Thành phố (City) hoặc Căn cứ quân sự (Base) ở cả góc `side` và `top`.
 */
export function drawTargetCluster(
  c: CanvasRenderingContext2D,
  kind: 'city' | 'base',
  view: 'side' | 'top' = 'side'
) {
  const o = lwO(c);
  const inn = lwI(c);

  if (view === 'side') {
    if (kind === 'city') {
      const blds = [
        [-95, 70, 38],
        [-52, 115, 44],
        [-4, 145, 48],
        [48, 95, 42],
        [94, 62, 34],
      ] as const;
      for (const [bx, bh, bw] of blds) {
        A.rrect(c, bx - bw / 2, -bh, bw, bh, 3, P.paper, P.ink, o);
        for (let wy = -bh + 14; wy < -12; wy += 20) {
          for (let wx = bx - bw / 2 + 8; wx < bx + bw / 2 - 10; wx += 12) {
            c.fillStyle = P.glass;
            c.fillRect(wx, wy, 7, 10);
          }
        }
      }
    } else {
      // Căn cứ quân sự: nhà vòm hangar + tháp chỉ huy + ăng-ten
      A.path(
        c,
        [
          [-95, 0],
          [-85, -48],
          [-20, -48],
          [-10, 0],
        ],
        true
      );
      A.fs(c, P.oliveLight, P.ink, o);
      A.rrect(c, 5, -78, 52, 78, 3, P.slate, P.ink, o);
      A.rrect(c, 12, -68, 38, 18, 2, P.glass, P.ink, inn);
      A.line(
        c,
        [
          [31, -78],
          [31, -110],
        ],
        P.ink,
        inn
      );
      A.circle(c, 31, -112, 5, P.sky, P.ink, inn);
    }
  } else {
    // Góc nhìn từ trên xuống (`top`)
    if (kind === 'city') {
      A.rrect(c, -85, -65, 170, 130, 12, P.paper, P.ink, o);
      const blocks = [
        [-68, -48, 42, 36],
        [-16, -48, 48, 36],
        [40, -48, 32, 36],
        [-68, -2, 52, 46],
        [-6, -2, 42, 46],
        [44, -2, 28, 46],
      ] as const;
      for (const [bx, by, bw, bh] of blocks) {
        A.rrect(c, bx, by, bw, bh, 4, P.light, P.ink, inn);
      }
    } else {
      // Căn cứ quân sự nhìn từ trên xuống: đường băng + công sự lục giác
      A.poly(
        c,
        [
          [-80, -45],
          [0, -75],
          [80, -45],
          [80, 45],
          [0, 75],
          [-80, 45],
        ],
        '#dce4d5',
        P.oliveDark,
        o
      );
      A.rrect(c, -58, -14, 116, 28, 4, P.slate, P.ink, inn);
      A.line(
        c,
        [
          [-44, 0],
          [44, 0],
        ],
        P.white,
        inn,
        [10, 8]
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. TÊN LỬA ĐẠN ĐẠO LIÊN LỤC ĐỊA (ICBM), ĐẦU ĐẠN (RV) & XE PHÓNG (TEL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vẽ tên lửa đạn đạo `ICBM` (hướng mũi mặc định sang PHẢI dọc trục +X tại góc 0).
 * - `view`: 'side' (ngoài), 'cut' (mặt cắt dọc lộ 3 tầng nhiên liệu + đầu đạn + bóng mồi bên trong chóp mũi), 'top' (nhìn từ trên xuống).
 * - `stage`: 'full' (3 tầng), 'stage2' (đã tách tầng 1), 'warhead' (chỉ còn đầu đạn nón RV).
 */
export function drawICBM(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    stage?: 'full' | 'stage2' | 'warhead';
    thrust?: number; // 0..1 độ mạnh luồng lửa hồng ngoại
    reentryGlow?: number; // 0..1 vệt nhiệt khi hồi quyển
  } = {}
) {
  const view = opts.view ?? 'side';
  const stage = opts.stage ?? 'full';
  const thrust = opts.thrust ?? 0;
  const glow = opts.reentryGlow ?? 0;
  const o = lwO(c);
  const inn = lwI(c);

  if (stage === 'warhead') {
    // Đầu đạn hồi quyển (Reentry Vehicle - RV) hình nón nhọn
    if (glow > 0.01) {
      A.withA(c, glow * 0.85, () => {
        A.poly(
          c,
          [
            [46, 0],
            [-28, -32],
            [-14, 0],
            [-28, 32],
          ],
          P.amber,
          null,
          0
        );
      });
    }
    A.poly(
      c,
      [
        [36, 0],
        [-22, -16],
        [-26, -10],
        [-26, 10],
        [-22, 16],
      ],
      P.enemy,
      P.ink,
      o
    );
    A.line(
      c,
      [
        [10, -9],
        [10, 9],
      ],
      P.white,
      inn
    );
    return;
  }

  if (view === 'top') {
    // Góc nhìn từ trên xuống trên bản đồ (mũi hướng sang phải +X)
    if (thrust > 0.01) {
      A.poly(
        c,
        [
          [-68, -10],
          [-130 - thrust * 35, 0],
          [-68, 10],
        ],
        P.amber,
        P.enemy,
        inn
      );
    }
    A.rrect(c, -68, -14, 98, 28, 8, P.enemyLight, P.ink, o);
    A.poly(
      c,
      [
        [30, -14],
        [68, 0],
        [30, 14],
      ],
      P.enemy,
      P.ink,
      o
    );
    A.circle(c, -18, 0, 7, P.paper, P.ink, inn);
    return;
  }

  // Luồng lửa động cơ hồng ngoại cực sáng ở đuôi
  const tailX = stage === 'full' ? -110 : -50;
  if (thrust > 0.01) {
    const fl = (95 + 45 * thrust) * (stage === 'full' ? 1.15 : 0.85);
    // Hào quang hồng ngoại ngoài
    A.withA(c, 0.35 * thrust, () => {
      A.ellipse(c, tailX - fl * 0.48, 0, fl * 0.72, 34 * thrust, 0, P.amber, null, 0);
    });
    // Luồng lửa chính
    A.poly(
      c,
      [
        [tailX, -14],
        [tailX - fl * 0.45, -26 * thrust],
        [tailX - fl, 0],
        [tailX - fl * 0.45, 26 * thrust],
        [tailX, 14],
      ],
      P.amber,
      P.enemy,
      inn
    );
    A.poly(
      c,
      [
        [tailX, -8],
        [tailX - fl * 0.58, 0],
        [tailX, 8],
      ],
      P.white,
      null,
      0
    );
  }

  // Loa phụt động cơ
  A.poly(
    c,
    [
      [tailX + 10, -11],
      [tailX - 6, -17],
      [tailX - 6, 17],
      [tailX + 10, 11],
    ],
    P.dark,
    P.ink,
    o
  );

  // Vây ổn định đuôi
  if (stage === 'full') {
    A.poly(
      c,
      [
        [-82, -20],
        [-106, -34],
        [-108, -20],
      ],
      P.enemy,
      P.ink,
      o
    );
    A.poly(
      c,
      [
        [-82, 20],
        [-106, 34],
        [-108, 20],
      ],
      P.enemy,
      P.ink,
      o
    );
  }

  // Thân chính của tên lửa (tầng 1 + tầng 2)
  const bodyX = stage === 'full' ? -104 : -44;
  const bodyW = stage === 'full' ? 144 : 84;
  A.rrect(c, bodyX, -20, bodyW, 40, 4, P.paper, P.ink, o);

  // Dải màu nhận diện phe tấn công
  c.fillStyle = P.enemyLight;
  c.fillRect(bodyX + 4, -18, bodyW - 8, 12);

  // Vạch ngăn tầng đẩy
  if (stage === 'full') {
    A.line(
      c,
      [
        [-42, -20],
        [-42, 20],
      ],
      P.ink,
      o
    );
  }
  A.line(
    c,
    [
      [12, -20],
      [12, 20],
    ],
    P.ink,
    o
  );

  // Chóp mũi (Payload Shroud)
  A.poly(
    c,
    [
      [40, -20],
      [96, 0],
      [40, 20],
    ],
    P.enemy,
    P.ink,
    o
  );

  // Nếu là góc mặt cắt `cut`: mở lớp vỏ cho thấy thùng nhiên liệu và khoang đầu đạn + bóng mồi bên trong!
  if (view === 'cut') {
    // Khoang nhiên liệu tầng 1 & 2
    if (stage === 'full') {
      A.rrect(c, -96, -13, 48, 26, 4, P.amber, P.ink, inn);
    }
    A.rrect(c, -36, -13, 42, 26, 4, '#fcd34d', P.ink, inn);

    // Mở mặt cắt khoang mũi: thấy rõ đầu đạn thật (RV) ở giữa và các bóng mồi xếp xung quanh
    A.poly(
      c,
      [
        [16, -16],
        [88, 0],
        [16, 16],
      ],
      P.bg,
      P.ink,
      inn
    );
    // Đầu đạn thật (RV) nằm trong chóp
    A.poly(
      c,
      [
        [76, 0],
        [34, -10],
        [34, 10],
      ],
      P.enemy,
      P.ink,
      inn
    );
    // Các quả bóng mồi bẫy xếp gọn bên cạnh
    A.circle(c, 25, -8, 5.5, P.light, P.ink, inn * 0.8);
    A.circle(c, 25, 8, 5.5, P.light, P.ink, inn * 0.8);
    A.circle(c, 40, -11, 4.5, P.light, P.ink, inn * 0.8);
    A.circle(c, 40, 11, 4.5, P.light, P.ink, inn * 0.8);
  }
}

/**
 * Xe bệ phóng tên lửa đạn đạo cơ động (`MobileTEL`) của phe tấn công.
 * Gốc (0,0) tại mặt đất giữa xe.
 */
export function drawMobileTEL(
  c: CanvasRenderingContext2D,
  opts: {
    view?: 'side' | 'top';
    erect?: number; // 0 = nằm ngang, 1 = dựng đứng 90 độ
    hasMissile?: boolean;
  } = {}
) {
  const view = opts.view ?? 'side';
  const erect = A.clamp01(opts.erect ?? 1);
  const hasM = opts.hasMissile ?? false;
  const o = lwO(c);
  const inn = lwI(c);

  if (view === 'top') {
    A.rrect(c, -95, -28, 190, 56, 8, P.dark, P.ink, o);
    // Buồng lái phía phải
    A.rrect(c, 52, -24, 36, 48, 5, P.enemy, P.ink, inn);
    A.rrect(c, 68, -18, 14, 36, 2, P.glass, P.ink, inn);
    // Ống phóng tên lửa trên lưng
    A.rrect(c, -88, -16, 134, 32, 6, P.enemyLight, P.ink, o);
    A.circle(c, -70, 0, 11, P.enemy, P.ink, inn);
    return;
  }

  // Góc nhìn ngang `side`: Khung gầm 8 bánh
  A.rrect(c, -110, -34, 210, 18, 4, P.dark, P.ink, o);
  // Buồng lái đầu xe
  A.poly(
    c,
    [
      [58, -34],
      [58, -68],
      [96, -68],
      [108, -46],
      [108, -34],
    ],
    P.enemy,
    P.ink,
    o
  );
  A.poly(
    c,
    [
      [74, -62],
      [92, -62],
      [101, -46],
      [74, -46],
    ],
    P.glass,
    P.ink,
    inn
  );

  // Ống phóng nâng góc `erect` quanh khớp đuôi (-86, -36)
  c.save();
  c.translate(-86, -36);
  c.rotate(-erect * (Math.PI / 2));
  if (hasM) {
    c.save();
    c.translate(95, -18);
    c.scale(0.75, 0.75);
    drawICBM(c, { view: 'side', stage: 'full', thrust: 0 });
    c.restore();
  }
  A.rrect(c, -10, -36, 165, 32, 5, P.enemyLight, P.ink, o);
  for (const gx of [18, 52, 86, 120]) {
    A.line(
      c,
      [
        [gx, -36],
        [gx, -4],
      ],
      P.ink,
      inn
    );
  }
  c.restore();

  // 4 bánh xe lớn
  for (const wx of [-82, -38, 18, 62]) {
    A.circle(c, wx, -16, 16, P.dark, P.ink, o);
    A.circle(c, wx, -16, 6, P.light, P.ink, inn);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. VỆ TINH CẢNH BÁO SỚM HỒNG NGOẠI (`IRSatellite`) & RADAR MẢNG PHA (`EarlyWarningRadar`)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Vệ tinh cảnh báo sớm hồng ngoại trên quỹ đạo cao (`IRSatellite`).
 * Gốc (0,0) ở tâm thân vệ tinh, ống kính cảm biến hướng xuống (+Y) hoặc theo góc xoay.
 */
export function drawIRSatellite(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    scanPulse?: number; // 0..1 chùm thu tia hồng ngoại
    alarmPulse?: number; // 0..1 phát sóng báo động
  } = {}
) {
  const view = opts.view ?? 'side';
  const o = lwO(c);
  const inn = lwI(c);

  if (view === 'top') {
    A.rrect(c, -95, -14, 65, 28, 3, P.sky, P.ink, o);
    A.rrect(c, 30, -14, 65, 28, 3, P.sky, P.ink, o);
    A.circle(c, 0, 0, 24, P.amber, P.ink, o);
    A.circle(c, 0, 0, 10, P.oliveLight, P.ink, inn);
    return;
  }

  // Hai cánh pin mặt trời lớn hai bên
  for (const dir of [-1, 1] as const) {
    const sx = dir < 0 ? -138 : 38;
    A.rrect(c, sx, -18, 100, 36, 3, P.sky, P.ink, o);
    for (let i = 1; i < 4; i++) {
      A.line(
        c,
        [
          [sx + i * 25, -18],
          [sx + i * 25, 18],
        ],
        P.ink,
        inn * 0.8
      );
    }
    A.line(
      c,
      [
        [sx, 0],
        [sx + 100, 0],
      ],
      P.ink,
      inn * 0.8
    );
    A.line(
      c,
      [
        [dir * 28, 0],
        [dir * 38, 0],
      ],
      P.ink,
      o
    );
  }

  // Thân vệ tinh
  A.rrect(c, -28, -32, 56, 64, 6, P.oliveLight, P.ink, o);
  // Lớp bọc cách nhiệt vàng ở phần trên
  A.rrect(c, -24, -28, 48, 24, 4, P.amber, P.ink, inn);

  // Ống kính cảm biến hồng ngoại hướng xuống dưới (+Y)
  A.poly(
    c,
    [
      [-18, 32],
      [-26, 56],
      [26, 56],
      [18, 32],
    ],
    P.dark,
    P.ink,
    o
  );
  A.ellipse(c, 0, 56, 22, 6, 0, P.amber, P.ink, inn);

  // Chảo ăng-ten truyền tin bên hông
  A.line(
    c,
    [
      [28, 12],
      [44, 26],
    ],
    P.ink,
    o
  );
  A.poly(
    c,
    [
      [38, 34],
      [54, 18],
      [50, 38],
    ],
    P.paper,
    P.ink,
    inn
  );

  // Nếu là góc mặt cắt `cut`: lộ gương hội tụ tia hồng ngoại + chip cảm biến nhiệt bên trong
  if (view === 'cut') {
    A.rrect(c, -22, -24, 44, 52, 4, P.paper, P.ink, inn);
    // Gương lõm hội tụ
    A.line(
      c,
      [
        [-16, 20],
        [0, 12],
        [16, 20],
      ],
      P.sky,
      o
    );
    // Chip cảm biến hồng ngoại (IR Focal Plane)
    A.rrect(c, -12, -16, 24, 14, 3, P.amber, P.ink, inn);
    // Đường tia nhiệt thu vào gương rồi hội tụ lên cảm biến
    A.line(
      c,
      [
        [-12, 52],
        [-10, 16],
        [0, -2],
      ],
      P.amber,
      inn,
      [6, 4]
    );
    A.line(
      c,
      [
        [12, 52],
        [10, 16],
        [0, -2],
      ],
      P.amber,
      inn,
      [6, 4]
    );
  }
}

/**
 * Trạm Radar mảng pha cảnh báo sớm khổng lồ (`EarlyWarningRadar` - PAVE PAWS / BMEWS).
 * Mặt phẳng nghiêng lớn bằng tòa nhà nhiều tầng; gốc (0,0) tại mặt đất chân trạm.
 * Mặc định mặt radar hướng sang TRÁI (-X) để quét tên lửa bay từ trái sang.
 */
export function drawEarlyWarningRadar(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    faceDir?: -1 | 1; // -1 = nhìn sang trái, 1 = nhìn sang phải
    beamAngle?: number; // góc tia quét (rad)
    beamLen?: number;
    showScaleRef?: boolean; // vẽ xe/người nhỏ dưới chân để thấy to bằng tòa nhà
  } = {}
) {
  const view = opts.view ?? 'side';
  const dir = opts.faceDir ?? -1;
  const o = lwO(c);
  const inn = lwI(c);

  if (view === 'top') {
    c.save();
    c.scale(dir === -1 ? 1 : -1, 1);
    if (opts.beamLen && opts.beamLen > 0) {
      const L = opts.beamLen;
      A.withA(c, 0.22, () => {
        A.poly(
          c,
          [
            [-30, 0],
            [-30 - L, -L * 0.52],
            [-30 - L, L * 0.52],
          ],
          P.sky,
          null,
          0
        );
      });
      A.line(
        c,
        [
          [-30, 0],
          [-30 - L, -L * 0.52],
        ],
        P.sky,
        inn,
        [12, 8]
      );
      A.line(
        c,
        [
          [-30, 0],
          [-30 - L, L * 0.52],
        ],
        P.sky,
        inn,
        [12, 8]
      );
    }
    A.poly(
      c,
      [
        [-42, -32],
        [12, -52],
        [46, 0],
        [12, 52],
        [-42, 32],
      ],
      P.oliveDark,
      P.ink,
      o
    );
    A.line(
      c,
      [
        [-42, -30],
        [-42, 30],
      ],
      P.sky,
      o * 1.4
    );
    c.restore();
    return;
  }

  c.save();
  c.scale(dir === -1 ? 1 : -1, 1);

  // Chùm sóng mảng pha phát ra từ mặt phẳng nghiêng
  if (opts.beamLen && opts.beamLen > 0) {
    const L = opts.beamLen;
    const ang = opts.beamAngle ?? -2.65;
    const bx = -42,
      by = -78;
    const tx = bx + Math.cos(ang) * L;
    const ty = by + Math.sin(ang) * L;
    A.withA(c, 0.22, () => {
      A.poly(
        c,
        [
          [bx, by - 36],
          [tx - 45, ty - 75],
          [tx + 45, ty + 75],
          [bx, by + 36],
        ],
        P.sky,
        null,
        0
      );
    });
    A.line(
      c,
      [
        [bx, by],
        [tx, ty],
      ],
      P.sky,
      o,
      [14, 10]
    );
  }

  // Khối tháp bê tông hình chóp cụt vát nghiêng (cao 155 đơn vị ~ tòa nhà 10 tầng)
  A.poly(
    c,
    [
      [-76, 0],
      [-24, -152],
      [68, -152],
      [96, 0],
    ],
    P.olive,
    P.ink,
    o
  );

  // Mặt phẳng mảng pha (Phased Array Face) bên sườn nghiêng
  A.poly(
    c,
    [
      [-70, -8],
      [-22, -146],
      [-6, -146],
      [-54, -8],
    ],
    P.paper,
    P.ink,
    o
  );
  // Các chấn tử phát sóng trên mặt phẳng
  for (let i = 1; i <= 6; i++) {
    const p = i / 7;
    const px = A.lerp(-66, -18, p);
    const py = A.lerp(-14, -140, p);
    A.circle(c, px, py, 3.5, P.sky, P.ink, inn * 0.7);
  }

  if (view === 'cut') {
    // Mặt cắt lộ các tầng máy tính xử lý tín hiệu và mô-đun thu phát T/R bên trong tòa nhà
    A.rrect(c, -18, -134, 72, 120, 4, P.paper, P.ink, inn);
    for (const fy of [-100, -68, -36]) {
      A.line(
        c,
        [
          [-18, fy],
          [54, fy],
        ],
        P.ink,
        inn
      );
    }
    // Dây dẫn từ chấn tử mảng pha vào máy tính tính quỹ đạo
    A.rrect(c, 2, -92, 42, 20, 3, P.sky, P.ink, inn);
    A.rrect(c, 2, -60, 42, 20, 3, P.oliveLight, P.ink, inn);
  } else {
    // Các đường gân kiến trúc ngoài tòa nhà radar
    A.line(
      c,
      [
        [-8, -152],
        [18, 0],
      ],
      P.oliveDark,
      inn
    );
    A.rrect(c, 32, -32, 24, 32, 2, P.dark, P.ink, inn);
  }

  // Vẽ xe quân sự và người nhỏ ở chân trạm để thấy ngay độ cao bằng tòa nhà lớn
  if (opts.showScaleRef !== false) {
    A.rrect(c, 112, -18, 34, 12, 3, P.oliveDark, P.ink, inn);
    A.circle(c, 120, -5, 5, P.dark, P.ink, inn);
    A.circle(c, 138, -5, 5, P.dark, P.ink, inn);
    // Hình người nhỏ đứng cạnh
    A.circle(c, 158, -19, 3.2, P.ink, null, 0);
    A.line(
      c,
      [
        [158, -15],
        [158, -2],
      ],
      P.ink,
      inn
    );
  }

  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ĐÁNH CHẶN NGOÀI KHÔNG GIAN: BOOSTER, KILL VEHICLE (EKV), MỒI BẪY & HỘP CHÂN KHÔNG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tên lửa đẩy đánh chặn ngoài không gian (`InterceptorBooster`) và Giếng phóng (`Silo`).
 */
export function drawInterceptorSilo(
  c: CanvasRenderingContext2D,
  opts: { open?: number; hasBooster?: boolean } = {}
) {
  const open = A.clamp01(opts.open ?? 1);
  const o = lwO(c);
  const inn = lwI(c);

  // Giếng phóng âm xuống lòng đất
  A.rrect(c, -28, 0, 56, 135, 4, P.paper, P.ink, o);
  A.rrect(c, -22, 6, 44, 122, 2, P.slate, P.ink, inn);

  if (opts.hasBooster) {
    c.save();
    c.translate(0, 72);
    c.rotate(-Math.PI / 2);
    c.scale(0.68, 0.68);
    drawInterceptorBooster(c, { thrust: 0, sep: 0 });
    c.restore();
  }

  // Nắp thép giếng phóng mở bật sang bên
  c.save();
  c.translate(-28, 0);
  c.rotate(-open * 1.95);
  A.rrect(c, 0, -10, 60, 10, 2, P.oliveDark, P.ink, o);
  c.restore();
}

/**
 * Tên lửa đánh chặn ngoài không gian (`InterceptorBooster` - GBI/SM-3).
 * Hướng mũi mặc định sang PHẢI (+X).
 */
export function drawInterceptorBooster(
  c: CanvasRenderingContext2D,
  opts: {
    thrust?: number;
    sep?: number; // 0 = nguyên khối, >0 = đã mở vỏ tách đầu tự dẫn EKV ra phía trước
    hideEKV?: boolean;
  } = {}
) {
  const thrust = opts.thrust ?? 0;
  const sep = A.clamp01(opts.sep ?? 0);
  const o = lwO(c);
  const inn = lwI(c);

  if (thrust > 0.01 && sep < 0.2) {
    const fl = 75 + 35 * thrust;
    A.poly(
      c,
      [
        [-84, -10],
        [-84 - fl, 0],
        [-84, 10],
      ],
      P.sky,
      P.ink,
      inn
    );
    A.poly(
      c,
      [
        [-84, -5],
        [-84 - fl * 0.55, 0],
        [-84, 5],
      ],
      P.white,
      null,
      0
    );
  }

  // Thân tầng đẩy
  const backShift = -sep * 55;
  c.save();
  c.translate(backShift, 0);
  A.poly(
    c,
    [
      [-74, -10],
      [-86, -15],
      [-86, 15],
      [-74, 10],
    ],
    P.dark,
    P.ink,
    o
  );
  A.rrect(c, -76, -15, 96, 30, 3, P.olive, P.ink, o);
  A.rrect(c, -22, -15, 42, 30, 2, P.oliveLight, P.ink, o);

  if (sep < 0.05) {
    // Chóp bảo vệ khi chưa tách
    A.poly(
      c,
      [
        [20, -15],
        [68, 0],
        [20, 15],
      ],
      P.white,
      P.ink,
      o
    );
  } else {
    // Hai nửa vỏ chóp bung mở khi tách EKV
    const ang = sep * 0.65;
    c.save();
    c.translate(20, -15);
    c.rotate(-ang);
    A.poly(
      c,
      [
        [0, 0],
        [46, 12],
        [0, 12],
      ],
      P.white,
      P.ink,
      inn
    );
    c.restore();

    c.save();
    c.translate(20, 15);
    c.rotate(ang);
    A.poly(
      c,
      [
        [0, 0],
        [46, -12],
        [0, -12],
      ],
      P.white,
      P.ink,
      inn
    );
    c.restore();
  }
  c.restore();

  if (sep >= 0.05 && !opts.hideEKV) {
    c.save();
    c.translate(38 + sep * 42, 0);
    c.scale(0.75, 0.75);
    drawKillVehicle(c, { view: 'side', thrusterUp: sep > 0.4 ? 0.8 : 0 });
    c.restore();
  }
}

/**
 * Đầu tự dẫn tiêu diệt bằng động năng ngoài không gian (`KillVehicle` - EKV).
 * Hướng mũi cảm biến mặc định sang PHẢI (+X).
 * Có 4 vòi phụt ngang (DACS thrusters) chỉnh hướng trực tiếp trong chân không.
 */
export function drawKillVehicle(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    thrusterUp?: number; // 0..1 phụt lên (đẩy thân xuống)
    thrusterDown?: number; // 0..1 phụt xuống (đẩy thân lên)
    thrusterBack?: number; // 0..1 phụt đuôi
    sensorCone?: number; // >0 chiều dài chùm cảm biến quang học đầu mũi
  } = {}
) {
  const view = opts.view ?? 'side';
  const tUp = opts.thrusterUp ?? 0;
  const tDn = opts.thrusterDown ?? 0;
  const tBk = opts.thrusterBack ?? 0;
  const cone = opts.sensorCone ?? 0;
  const o = lwO(c);
  const inn = lwI(c);

  // Chùm cảm biến quang học tìm mục tiêu phía trước mũi
  if (cone > 0) {
    A.withA(c, 0.24, () => {
      A.poly(
        c,
        [
          [48, 0],
          [48 + cone, -cone * 0.42],
          [48 + cone, cone * 0.42],
        ],
        P.sky,
        null,
        0
      );
    });
    A.line(
      c,
      [
        [48, 0],
        [48 + cone, -cone * 0.42],
      ],
      P.sky,
      inn,
      [10, 8]
    );
    A.line(
      c,
      [
        [48, 0],
        [48 + cone, cone * 0.42],
      ],
      P.sky,
      inn,
      [10, 8]
    );
  }

  // Luồng khí phụt điều hướng ngang (Divert & Attitude Control Thrusters)
  if (tUp > 0.01) {
    const L = 42 + 38 * tUp;
    A.poly(
      c,
      [
        [-4, -22],
        [-18, -22 - L],
        [0, -22 - L * 0.85],
        [12, -22 - L],
        [4, -22],
      ],
      P.sky,
      P.ink,
      inn * 0.8
    );
  }
  if (tDn > 0.01) {
    const L = 42 + 38 * tDn;
    A.poly(
      c,
      [
        [-4, 22],
        [-18, 22 + L],
        [0, 22 + L * 0.85],
        [12, 22 + L],
        [4, 22],
      ],
      P.sky,
      P.ink,
      inn * 0.8
    );
  }
  if (tBk > 0.01) {
    const L = 45 + 35 * tBk;
    A.poly(
      c,
      [
        [-48, -10],
        [-48 - L, 0],
        [-48, 10],
      ],
      P.amber,
      P.ink,
      inn * 0.8
    );
  }

  // 4 cụm ống phụt ngang trên/dưới thân
  A.rrect(c, -10, -27, 20, 7, 2, P.dark, P.ink, inn);
  A.rrect(c, -10, 20, 20, 7, 2, P.dark, P.ink, inn);

  // Thân hình trụ vát côn của EKV
  A.poly(
    c,
    [
      [-48, -18],
      [12, -22],
      [44, -12],
      [44, 12],
      [12, 22],
      [-48, 18],
    ],
    P.oliveLight,
    P.ink,
    o
  );

  // Vành cảm biến quang học ở đầu mũi
  A.poly(
    c,
    [
      [44, -11],
      [52, -8],
      [52, 8],
      [44, 11],
    ],
    P.glass,
    P.ink,
    o
  );

  if (view === 'cut') {
    // Mặt cắt dọc lộ 3 bộ phận cốt lõi của EKV:
    // (1) Cụm kính thiên văn & cảm biến hồng ngoại ở mũi
    A.rrect(c, 16, -13, 26, 26, 3, P.paper, P.ink, inn);
    A.ellipse(c, 36, 0, 4, 10, 0, P.sky, P.ink, inn);
    A.rrect(c, 19, -7, 10, 14, 2, P.amber, P.ink, inn);
    // (2) Cụm van & đường ống dẫn tới 4 vòi phụt ngang ở giữa
    A.rrect(c, -12, -16, 24, 32, 3, P.paper, P.ink, inn);
    A.line(
      c,
      [
        [0, -16],
        [0, 16],
      ],
      P.sky,
      o
    );
    A.circle(c, 0, 0, 6, P.sky, P.ink, inn);
    // (3) Bình nhiên liệu nén ở đuôi
    A.rrect(c, -42, -13, 26, 26, 6, P.amber, P.ink, inn);
  } else {
    // Đường gân kỹ thuật bên ngoài
    A.line(
      c,
      [
        [12, -22],
        [12, 22],
      ],
      P.ink,
      inn
    );
    A.line(
      c,
      [
        [-20, -19],
        [-20, 19],
      ],
      P.ink,
      inn
    );
    A.rrect(c, -38, -8, 14, 16, 2, P.amber, P.ink, inn);
  }
}

/**
 * Vẽ bóng bay mồi bẫy (`BalloonDecoy`), tầng đẩy rỗng lộn nhào (`TumblingStage`), và mảnh nhiễu kim loại (`Chaff`).
 */
export function drawSpaceDebrisItem(
  c: CanvasRenderingContext2D,
  kind: 'balloonCone' | 'balloonSphere' | 'tumblingStage' | 'chaffCluster'
) {
  const o = lwO(c);
  const inn = lwI(c);

  if (kind === 'balloonCone') {
    // Bóng bay bơm hơi có hình nón giống hệt đầu đạn thật nhưng vỏ mỏng rỗng bên trong
    A.poly(
      c,
      [
        [34, 0],
        [-20, -15],
        [-24, -9],
        [-24, 9],
        [-20, 15],
      ],
      '#e2e8f0',
      P.slate,
      o
    );
    // Nét đứt bên trong cho người xem biết đây là bóng rỗng nhẹ
    A.line(
      c,
      [
        [-14, -10],
        [20, 0],
        [-14, 10],
      ],
      P.slate,
      inn,
      [5, 4]
    );
  } else if (kind === 'balloonSphere') {
    A.circle(c, 0, 0, 18, '#e2e8f0', P.slate, o);
    A.ellipse(c, 0, 0, 18, 7, 0.3, null, P.slate, inn);
  } else if (kind === 'tumblingStage') {
    // Tầng đẩy tên lửa rỗng đã cháy hết, lộn nhào bên cạnh
    A.rrect(c, -42, -16, 84, 32, 3, P.light, P.ink, o);
    A.poly(
      c,
      [
        [-42, -10],
        [-54, -15],
        [-54, 15],
        [-42, 10],
      ],
      P.dark,
      P.ink,
      inn
    );
    A.line(
      c,
      [
        [-10, -16],
        [-10, 16],
      ],
      P.slate,
      inn
    );
  } else {
    // Đám mảnh kim loại (chaff) tạo phản xạ giả
    const pts: [number, number, number][] = [
      [-16, -12, 0.4],
      [8, -16, -0.5],
      [18, 4, 0.9],
      [-8, 14, -0.3],
      [2, -2, 1.1],
    ];
    for (const [px, py, rot] of pts) {
      c.save();
      c.translate(px, py);
      c.rotate(rot);
      A.line(
        c,
        [
          [-9, 0],
          [9, 0],
        ],
        P.sky,
        inn * 1.1
      );
      c.restore();
    }
  }
}

/**
 * Hộp so sánh thí nghiệm Chân không (Vacuum) vs Khí quyển: Chiếc búa nặng (Hammer) và Lông vũ nhẹ (Feather).
 */
export function drawFeatherHammerBox(
  c: CanvasRenderingContext2D,
  opts: {
    fallProgress: number; // 0..1 vị trí rơi
    hasAir?: boolean; // false = chân không (rơi bằng nhau), true = có không khí (lông vũ bị cản tụt lại)
  }
) {
  const p = A.clamp01(opts.fallProgress);
  const o = lwO(c);
  const inn = lwI(c);

  // Khung buồng chân không cao
  A.rrect(c, -135, -185, 270, 370, 14, P.paper, P.ink, o);
  // Nền chia vạch độ cao để mắt đọc ngay tốc độ rơi bằng nhau
  for (let y = -130; y <= 140; y += 54) {
    A.line(
      c,
      [
        [-115, y],
        [115, y],
      ],
      P.light,
      inn * 0.8,
      [8, 8]
    );
  }

  const hammerY = A.lerp(-135, 130, p);
  const featherY = opts.hasAir ? A.lerp(-135, 10, p * 0.65) : hammerY;

  // Bên trái: Chiếc búa sắt nặng (tương ứng Đầu đạn thật)
  c.save();
  c.translate(-55, hammerY);
  A.rrect(c, -7, -28, 14, 58, 3, P.sand, P.ink, o);
  A.rrect(c, -28, -36, 56, 22, 4, P.dark, P.ink, o);
  c.restore();

  // Bên phải: Chiếc lông vũ nhẹ (tương ứng Bóng bay mồi bẫy)
  c.save();
  c.translate(55, featherY);
  A.path(
    c,
    [
      [0, -32],
      [18, -12],
      [14, 16],
      [0, 32],
      [-14, 16],
      [-18, -12],
    ],
    true
  );
  A.fs(c, P.white, P.ink, o);
  A.line(
    c,
    [
      [0, -30],
      [0, 36],
    ],
    P.ink,
    inn
  );
  c.restore();

  // Đường nối ngang chứng minh hai vật rơi ngang nhau trong chân không
  if (!opts.hasAir) {
    A.line(
      c,
      [
        [-25, hammerY],
        [25, featherY],
      ],
      P.amber,
      inn,
      [6, 6]
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. KHẨU ĐỘI PHÒNG THỦ TẦNG CUỐI (TERMINAL / IRON DOME) & TÀU CHIẾN HẢI QUÂN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Khẩu đội tên lửa đánh chặn tầng cuối (`TerminalBattery` - THAAD / Patriot / Iron Dome).
 * Gốc (0,0) tại mặt đất. Hỗ trợ hiển thị số ống đạn còn lại (`ammoCount: 0..4`) để thấy trực quan việc cạn kho đạn!
 */
export function drawTerminalBattery(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    ammoCount?: number; // 0..4 ống đạn còn sáng/đầy
    maxAmmo?: number;
    faceDir?: -1 | 1; // -1 = bắn sang trái, 1 = bắn sang phải
  } = {}
) {
  const view = opts.view ?? 'side';
  const maxAmmo = opts.maxAmmo ?? 4;
  const ammo = A.clamp(opts.ammoCount ?? maxAmmo, 0, maxAmmo);
  const dir = opts.faceDir ?? -1;
  const o = lwO(c);
  const inn = lwI(c);

  if (view === 'top') {
    c.save();
    c.scale(dir === -1 ? 1 : -1, 1);
    A.rrect(c, -45, -24, 90, 48, 6, P.oliveDark, P.ink, o);
    for (let i = 0; i < 4; i++) {
      const y = -15 + i * 10;
      const full = i < ammo;
      A.rrect(c, -34, y - 3.5, 58, 7, 2, full ? P.oliveLight : P.dark, P.ink, inn * 0.8);
    }
    c.restore();
    return;
  }

  c.save();
  c.scale(dir === -1 ? 1 : -1, 1);

  // Thân xe bệ phóng
  A.rrect(c, -68, -28, 136, 16, 3, P.oliveDark, P.ink, o);
  // Chân chống thủy lực hạ xuống đất
  A.line(
    c,
    [
      [-58, -12],
      [-66, 0],
    ],
    P.ink,
    o
  );
  A.line(
    c,
    [
      [58, -12],
      [66, 0],
    ],
    P.ink,
    o
  );

  // Bệ ống phóng nghiêng 50 độ hướng sang trái (-X)
  c.save();
  c.translate(16, -28);
  c.rotate(0.72);
  A.rrect(c, -86, -42, 92, 38, 4, P.olive, P.ink, o);

  // Vẽ các ống chứa đạn (sáng = còn đạn, tối rỗng = đã bắn hết)
  for (let i = 0; i < maxAmmo; i++) {
    const rowY = -36 + (i / maxAmmo) * 30;
    const hTube = 26 / maxAmmo;
    const isFull = i < ammo;
    A.rrect(
      c,
      -82,
      rowY,
      82,
      hTube,
      2,
      isFull ? P.paper : P.dark,
      P.ink,
      inn * 0.75
    );
    if (isFull) {
      // Đầu đạn nhô nhẹ ở miệng ống
      A.circle(c, -80, rowY + hTube / 2, hTube * 0.42, P.oliveLight, P.ink, inn * 0.6);
    }
  }
  c.restore();

  // Bánh xe
  for (const wx of [-42, -14, 28, 52]) {
    A.circle(c, wx, -11, 11, P.dark, P.ink, o);
    A.circle(c, wx, -11, 4, P.light, P.ink, inn);
  }

  c.restore();
}

/**
 * Tàu khu trục phòng thủ tên lửa (`NavalDestroyer` - Aegis BMD).
 * Có đài radar mảng pha 4 mặt SPY và cụm giếng phóng thẳng đứng VLS (`vlsAmmo: 0..8`).
 */
export function drawNavalDestroyer(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    vlsAmmo?: number; // 0..8 ô đạn VLS còn lại
    radarSweep?: number; // >0 bán kính quạt radar
  } = {}
) {
  const view = opts.view ?? 'side';
  const ammo = A.clamp(opts.vlsAmmo ?? 8, 0, 8);
  const o = lwO(c);
  const inn = lwI(c);

  if (view === 'top') {
    if (opts.radarSweep && opts.radarSweep > 0) {
      A.withA(c, 0.16, () => {
        A.circle(c, 0, 0, opts.radarSweep!, P.sky, P.sky, inn);
      });
    }
    // Thân tàu nhìn từ trên xuống (mũi hướng sang phải +X)
    A.poly(
      c,
      [
        [-115, -24],
        [45, -26],
        [120, 0],
        [45, 26],
        [-115, 24],
      ],
      P.slate,
      P.ink,
      o
    );
    // Đài chỉ huy gắn 4 mặt radar SPY
    A.poly(
      c,
      [
        [-28, -18],
        [24, -18],
        [34, -8],
        [34, 8],
        [24, 18],
        [-28, 18],
      ],
      P.oliveLight,
      P.ink,
      o
    );
    // Cụm 8 ô giếng phóng thẳng đứng VLS ở mũi tàu
    for (let i = 0; i < 8; i++) {
      const col = Math.floor(i / 2);
      const row = i % 2;
      const cx = 42 + col * 11;
      const cy = -7 + row * 14;
      A.rrect(c, cx, cy - 4.5, 9, 9, 1.5, i < ammo ? P.paper : P.dark, P.ink, inn * 0.7);
    }
    // Bãi đáp trực thăng đuôi tàu
    A.rrect(c, -104, -18, 56, 36, 3, P.dark, P.ink, inn);
    A.circle(c, -76, 0, 11, null, P.white, inn);
    return;
  }

  // Góc nhìn ngang `side` (mũi tàu hướng sang phải +X, mặt nước tại y = 0)
  A.poly(
    c,
    [
      [-125, 0],
      [-135, -26],
      [40, -28],
      [130, -38],
      [108, 0],
    ],
    P.slate,
    P.ink,
    o
  );
  // Thượng tầng vát góc gắn tấm radar mảng pha bát giác SPY-1
  A.poly(
    c,
    [
      [-48, -28],
      [-32, -74],
      [26, -74],
      [42, -28],
    ],
    P.oliveLight,
    P.ink,
    o
  );
  // Tấm radar bát giác sáng trên đài chỉ huy
  A.poly(
    c,
    [
      [10, -62],
      [24, -62],
      [30, -50],
      [24, -38],
      [10, -38],
      [4, -50],
    ],
    P.sky,
    P.ink,
    inn
  );
  // Cột ăng-ten chính
  A.line(
    c,
    [
      [-4, -74],
      [-12, -112],
    ],
    P.ink,
    o
  );
  A.line(
    c,
    [
      [-22, -96],
      [4, -96],
    ],
    P.ink,
    inn
  );
  // Pháo hạm mũi tàu & bệ phóng VLS
  A.rrect(c, 46, -36, 36, 8, 2, P.oliveDark, P.ink, inn);
  A.rrect(c, 86, -40, 18, 12, 3, P.olive, P.ink, inn);
  A.line(
    c,
    [
      [104, -36],
      [124, -44],
    ],
    P.ink,
    o
  );
}

/**
 * Tàu sân bay (`Carrier`) cần được hộ tống (dùng trong Chương 3 khi giải thích đánh đổi nhiệm vụ của tàu khu trục).
 */
export function drawAircraftCarrier(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'top') {
  const o = lwO(c);
  const inn = lwI(c);

  if (view === 'top') {
    // Boong phóng máy bay góc chéo đặc trưng
    A.poly(
      c,
      [
        [-145, -36],
        [115, -36],
        [150, -18],
        [150, 18],
        [95, 42],
        [-35, 48],
        [-145, 32],
      ],
      P.dark,
      P.ink,
      o
    );
    // Đường băng chéo màu trắng
    A.line(
      c,
      [
        [-130, 16],
        [110, -20],
      ],
      P.white,
      inn * 1.2,
      [16, 12]
    );
    // Đảo chỉ huy bên mạn phải
    A.rrect(c, -25, -34, 52, 16, 3, P.oliveLight, P.ink, o);
    return;
  }

  A.poly(
    c,
    [
      [-150, 0],
      [-160, -34],
      [165, -34],
      [140, 0],
    ],
    P.dark,
    P.ink,
    o
  );
  A.rrect(c, -35, -72, 48, 38, 3, P.oliveLight, P.ink, o);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. MÁY BAY TIÊM KÍCH, TÊN LỬA HÀNH TRÌNH (`CruiseMissile`) & VŨ KHÍ SIÊU VƯỢT ÂM (`HGV`)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Máy bay tiêm kích đánh chặn của phe phòng thủ (`FighterInterceptor`).
 */
export function drawFighterInterceptor(c: CanvasRenderingContext2D, view: 'side' | 'top' = 'top') {
  const o = lwO(c);
  const inn = lwI(c);

  if (view === 'top') {
    A.poly(
      c,
      [
        [48, 0],
        [12, -10],
        [-18, -42],
        [-32, -42],
        [-22, -12],
        [-42, -18],
        [-46, -8],
        [-34, 0],
        [-46, 8],
        [-42, 18],
        [-22, 12],
        [-32, 42],
        [-18, 42],
        [12, 10],
      ],
      P.oliveLight,
      P.ink,
      o
    );
    A.ellipse(c, 14, 0, 12, 5, 0, P.glass, P.ink, inn);
    return;
  }

  A.poly(
    c,
    [
      [52, 2],
      [16, -10],
      [-28, -10],
      [-44, -28],
      [-52, -28],
      [-44, -4],
      [-50, 6],
      [12, 8],
    ],
    P.oliveLight,
    P.ink,
    o
  );
  A.ellipse(c, 16, -6, 13, 5, -0.1, P.glass, P.ink, inn);
}

/**
 * Tên lửa hành trình (`CruiseMissile`) có cánh và động cơ phản lực như máy bay nhỏ bay thấp ôm địa hình.
 */
export function drawCruiseMissile(
  c: CanvasRenderingContext2D,
  opts: { view?: 'side' | 'top'; thrust?: number } = {}
) {
  const view = opts.view ?? 'side';
  const thrust = opts.thrust ?? 0.8;
  const o = lwO(c);
  const inn = lwI(c);

  if (thrust > 0.01) {
    A.poly(
      c,
      [
        [-48, -5],
        [-48 - 28 * thrust, 0],
        [-48, 5],
      ],
      P.amber,
      null,
      0
    );
  }

  if (view === 'top') {
    // Cánh nâng xòe rộng như máy bay nhỏ
    A.poly(
      c,
      [
        [8, -8],
        [-12, -44],
        [-22, -44],
        [-10, -8],
      ],
      P.enemyLight,
      P.ink,
      o
    );
    A.poly(
      c,
      [
        [8, 8],
        [-12, 44],
        [-22, 44],
        [-10, 8],
      ],
      P.enemyLight,
      P.ink,
      o
    );
    A.rrect(c, -48, -9, 86, 18, 9, P.enemy, P.ink, o);
    return;
  }

  // Cửa hút khí động cơ phản lực dưới bụng
  A.poly(
    c,
    [
      [-18, 8],
      [-8, 17],
      [-32, 17],
      [-36, 8],
    ],
    P.dark,
    P.ink,
    inn
  );
  // Thân trụ tròn mũi bầu
  A.rrect(c, -48, -9, 92, 18, 9, P.enemyLight, P.ink, o);
  A.poly(
    c,
    [
      [24, -9],
      [46, 0],
      [24, 9],
    ],
    P.enemy,
    P.ink,
    o
  );
  // Cánh nâng giữa thân & cánh đuôi đứng
  A.poly(
    c,
    [
      [-4, 2],
      [-22, 12],
      [8, 4],
    ],
    P.enemy,
    P.ink,
    inn
  );
  A.poly(
    c,
    [
      [-34, -9],
      [-46, -24],
      [-48, -9],
    ],
    P.enemy,
    P.ink,
    o
  );
}

/**
 * Phương tiện lượn siêu vượt âm (`HGV` - Hypersonic Glide Vehicle) thân nêm dẹp lướt trên sóng xung kích ở tầng khí quyển cao.
 */
export function drawHGV(
  c: CanvasRenderingContext2D,
  opts: { view?: ViewMode; shockwave?: boolean } = {}
) {
  const view = opts.view ?? 'side';
  const o = lwO(c);
  const inn = lwI(c);

  if (opts.shockwave !== false) {
    // Sóng xung kích khí động học và plasma nóng quanh mũi nêm
    A.withA(c, 0.45, () => {
      A.line(
        c,
        [
          [56, 0],
          [-42, -34],
        ],
        P.amber,
        o
      );
      A.line(
        c,
        [
          [56, 0],
          [-42, 34],
        ],
        P.amber,
        o
      );
    });
  }

  if (view === 'top') {
    // Hình mũi tên tam giác vát sắc (Waverider delta wedge)
    A.poly(
      c,
      [
        [52, 0],
        [-38, -28],
        [-28, 0],
        [-38, 28],
      ],
      P.enemy,
      P.ink,
      o
    );
    A.line(
      c,
      [
        [52, 0],
        [-28, 0],
      ],
      P.enemyLight,
      inn
    );
    return;
  }

  // Góc nhìn ngang `side`: bụng phẳng lướt trên không khí, lưng vát nêm
  A.poly(
    c,
    [
      [54, 6],
      [-10, -14],
      [-42, -16],
      [-36, 8],
    ],
    P.enemy,
    P.ink,
    o
  );
  A.poly(
    c,
    [
      [-26, -15],
      [-44, -28],
      [-42, -15],
    ],
    P.enemyLight,
    P.ink,
    inn
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. BẢNG TỔNG DUYỆT TẤT CẢ VẬT (`drawAssetSheet`) ĐỂ KIỂM TRA TRƯỚC KHI DỰNG
// ═══════════════════════════════════════════════════════════════════════════

export function drawAssetSheet(c: CanvasRenderingContext2D) {
  A.clear(c, P.bg);
  const cells: { title: string; draw: () => void }[] = [
    {
      title: '1. ICBM (side + cut)',
      draw: () => {
        c.save();
        c.translate(-30, -32);
        c.scale(0.85, 0.85);
        drawICBM(c, { view: 'side', stage: 'full', thrust: 0.9 });
        c.restore();
        c.save();
        c.translate(-30, 34);
        c.scale(0.85, 0.85);
        drawICBM(c, { view: 'cut', stage: 'full', thrust: 0.4 });
        c.restore();
      },
    },
    {
      title: '2. MobileTEL (side + top)',
      draw: () => {
        c.save();
        c.translate(-65, 55);
        c.scale(0.55, 0.55);
        drawMobileTEL(c, { view: 'side', erect: 0.85, hasMissile: true });
        c.restore();
        c.save();
        c.translate(85, 10);
        c.scale(0.55, 0.55);
        drawMobileTEL(c, { view: 'top' });
        c.restore();
      },
    },
    {
      title: '3. IRSatellite (side + cut)',
      draw: () => {
        c.save();
        c.translate(-80, 0);
        c.scale(0.52, 0.52);
        drawIRSatellite(c, { view: 'side' });
        c.restore();
        c.save();
        c.translate(80, 0);
        c.scale(0.52, 0.52);
        drawIRSatellite(c, { view: 'cut' });
        c.restore();
      },
    },
    {
      title: '4. EarlyWarningRadar (side + cut + top)',
      draw: () => {
        c.save();
        c.translate(-90, 58);
        c.scale(0.62, 0.62);
        drawEarlyWarningRadar(c, { view: 'side', beamLen: 80 });
        c.restore();
        c.save();
        c.translate(20, 58);
        c.scale(0.62, 0.62);
        drawEarlyWarningRadar(c, { view: 'cut' });
        c.restore();
        c.save();
        c.translate(125, 0);
        c.scale(0.62, 0.62);
        drawEarlyWarningRadar(c, { view: 'top', beamLen: 60 });
        c.restore();
      },
    },
    {
      title: '5. InterceptorBooster & Silo',
      draw: () => {
        c.save();
        c.translate(-95, -5);
        c.scale(0.58, 0.58);
        drawInterceptorSilo(c, { open: 0.9, hasBooster: true });
        c.restore();
        c.save();
        c.translate(35, 0);
        c.scale(0.75, 0.75);
        drawInterceptorBooster(c, { thrust: 0.8, sep: 0.65 });
        c.restore();
      },
    },
    {
      title: '6. KillVehicle EKV (side + cut)',
      draw: () => {
        c.save();
        c.translate(-75, 0);
        c.scale(0.95, 0.95);
        drawKillVehicle(c, { view: 'side', thrusterUp: 0.9, sensorCone: 55 });
        c.restore();
        c.save();
        c.translate(75, 0);
        c.scale(0.95, 0.95);
        drawKillVehicle(c, { view: 'cut', thrusterDown: 0.8 });
        c.restore();
      },
    },
    {
      title: '7. Decoys & Feather-Hammer Vacuum Box',
      draw: () => {
        c.save();
        c.translate(-95, -35);
        drawSpaceDebrisItem(c, 'balloonCone');
        c.restore();
        c.save();
        c.translate(-95, 30);
        drawSpaceDebrisItem(c, 'tumblingStage');
        c.restore();
        c.save();
        c.translate(55, 0);
        c.scale(0.38, 0.38);
        drawFeatherHammerBox(c, { fallProgress: 0.55, hasAir: false });
        c.restore();
      },
    },
    {
      title: '8. TerminalBattery (side + top)',
      draw: () => {
        c.save();
        c.translate(-65, 38);
        c.scale(0.85, 0.85);
        drawTerminalBattery(c, { view: 'side', ammoCount: 3 });
        c.restore();
        c.save();
        c.translate(85, 5);
        c.scale(0.85, 0.85);
        drawTerminalBattery(c, { view: 'top', ammoCount: 2 });
        c.restore();
      },
    },
    {
      title: '9. NavalDestroyer & Carrier (side + top)',
      draw: () => {
        c.save();
        c.translate(-65, -20);
        c.scale(0.62, 0.62);
        drawNavalDestroyer(c, { view: 'side' });
        c.restore();
        c.save();
        c.translate(-65, 38);
        c.scale(0.62, 0.62);
        drawNavalDestroyer(c, { view: 'top', vlsAmmo: 5 });
        c.restore();
        c.save();
        c.translate(85, 10);
        c.scale(0.52, 0.52);
        drawAircraftCarrier(c, 'top');
        c.restore();
      },
    },
    {
      title: '10. CruiseMissile, HGV & Fighter',
      draw: () => {
        c.save();
        c.translate(-85, -32);
        c.scale(0.85, 0.85);
        drawCruiseMissile(c, { view: 'side' });
        c.restore();
        c.save();
        c.translate(-85, 32);
        c.scale(0.85, 0.85);
        drawCruiseMissile(c, { view: 'top' });
        c.restore();
        c.save();
        c.translate(45, -32);
        c.scale(0.85, 0.85);
        drawHGV(c, { view: 'side', shockwave: true });
        c.restore();
        c.save();
        c.translate(25, 32);
        c.scale(0.75, 0.75);
        drawFighterInterceptor(c, 'top');
        c.restore();
        c.save();
        c.translate(105, 32);
        c.scale(0.75, 0.75);
        drawHGV(c, { view: 'top', shockwave: true });
        c.restore();
      },
    },
  ];

  const cols = 4;
  const cw = A.W / cols;
  const ch = A.H / 3;
  cells.forEach((cell, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = col * cw + cw / 2;
    const cy = row * ch + ch / 2 + 12;
    A.rrect(c, col * cw + 14, row * ch + 14, cw - 28, ch - 28, 12, P.paper, P.ink, 2.5);
    c.save();
    c.translate(cx, cy);
    cell.draw();
    c.restore();
  });
}
