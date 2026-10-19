// scenes/_assets.ts — Toàn bộ tài sản hình ảnh 2D cho project war_15
// Tuân thủ code-video-2d: đường bao rõ (LINE.outer = 4, LINE.inner = 2.25), bảng màu P,
// hỗ trợ đa góc nhìn ('side', 'top', 'cutaway') để đọc rõ cơ chế bên trong và chiến thuật không gian.

import * as A from './shared/art';
import { P, LINE } from './shared/palette';

export type ViewMode = 'side' | 'top' | 'cutaway';

// ── 1. Môi trường & Trái Đất / Bầu trời / Biển / Địa hình ─────────────────────

/** Vẽ cung cong Trái Đất ở góc nhìn quỹ đạo (Orbital Side/Cross-section). */
export function drawEarthArc(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  opt: {
    rot?: number;
    showAtmo?: boolean;
    showGrid?: boolean;
    features?: ('airfield' | 'ocean' | 'silo' | 'mountains' | 'frontline')[];
  } = {}
) {
  const lw = A.px(c, LINE.outer);
  const li = A.px(c, LINE.inner);
  c.save();
  c.translate(cx, cy);
  if (opt.rot) c.rotate(opt.rot);

  // Lớp khí quyển mỏng
  if (opt.showAtmo !== false) {
    A.circle(c, 0, 0, radius + 55, 'rgba(56,189,248,0.10)', null, 0);
    A.circle(c, 0, 0, radius + 26, 'rgba(56,189,248,0.18)', 'rgba(56,189,248,0.35)', li);
  }

  // Khối Trái Đất
  A.circle(c, 0, 0, radius, P.bg2, P.ink, lw);

  // Lưới kinh-vĩ tuyến trên bề mặt
  if (opt.showGrid !== false) {
    c.save();
    c.beginPath();
    c.arc(0, 0, radius - 2, 0, Math.PI * 2);
    c.clip();
    for (let a = -1.2; a <= 1.2; a += 0.2) {
      const x1 = Math.sin(a) * radius;
      const y1 = -Math.cos(a) * radius;
      A.line(c, [[0, 0], [x1, y1]], 'rgba(71,85,105,0.16)', li);
    }
    for (let r = radius * 0.72; r < radius; r += radius * 0.08) {
      A.circle(c, 0, 0, r, null, 'rgba(71,85,105,0.14)', li);
    }
    // Mảng lục địa giản lược
    A.poly(
      c,
      [
        [-radius * 0.45, -radius * 0.9],
        [-radius * 0.12, -radius * 0.99],
        [radius * 0.25, -radius * 0.96],
        [radius * 0.18, -radius * 0.82],
        [-radius * 0.25, -radius * 0.8],
      ],
      '#dce6d5',
      P.ink2,
      li
    );
    c.restore();
  }
  c.restore();
}

/** Vẽ mặt cắt ngang địa hình chiến trường (Side view: mặt đất, biển, núi, mây, tán thông). */
export function drawSideTerrain(
  c: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  groundY: number,
  opt: {
    oceanFrom?: number;
    oceanTo?: number;
    wavePhase?: number;
    mountainAt?: number;
    mountainH?: number;
    clouds?: { x: number; y: number; w: number; h: number; dark?: boolean }[];
    pineForestAt?: { x: number; w: number; wet?: boolean };
  } = {}
) {
  const lw = A.px(c, LINE.outer);
  const li = A.px(c, LINE.inner);

  // Khối đất nền
  A.rrect(c, x0, groundY, x1 - x0, 600, 0, '#e3dfd3', null, 0);
  // Lớp đất mặt
  A.rrect(c, x0, groundY, x1 - x0, 26, 0, '#cbd5c0', null, 0);

  // Vùng biển nếu có
  if (opt.oceanFrom !== undefined && opt.oceanTo !== undefined) {
    const ox0 = opt.oceanFrom;
    const ox1 = opt.oceanTo;
    A.rrect(c, ox0, groundY + 6, ox1 - ox0, 594, 0, '#cbe4f0', null, 0);
    const wp = opt.wavePhase ?? 0;
    const pts: A.Pt[] = [];
    for (let x = ox0; x <= ox1; x += 40) {
      pts.push([x, groundY + 6 + Math.sin((x + wp * 60) * 0.03) * 5]);
    }
    A.line(c, pts, P.sky, lw);
  }

  // Dãy núi chắn sóng
  if (opt.mountainAt !== undefined) {
    const mx = opt.mountainAt;
    const mh = opt.mountainH ?? 240;
    A.poly(
      c,
      [
        [mx - mh * 1.35, groundY],
        [mx - mh * 0.45, groundY - mh * 0.72],
        [mx, groundY - mh],
        [mx + mh * 0.55, groundY - mh * 0.65],
        [mx + mh * 1.3, groundY],
      ],
      '#d5d0c3',
      P.ink,
      lw
    );
    // Sườn tối của núi
    A.poly(
      c,
      [
        [mx, groundY - mh],
        [mx + mh * 0.22, groundY - mh * 0.45],
        [mx - mh * 0.1, groundY],
        [mx + mh * 1.3, groundY],
        [mx + mh * 0.55, groundY - mh * 0.65],
      ],
      '#beb8a8',
      null,
      0
    );
    A.line(
      c,
      [
        [mx - mh * 1.35, groundY],
        [mx - mh * 0.45, groundY - mh * 0.72],
        [mx, groundY - mh],
        [mx + mh * 0.55, groundY - mh * 0.65],
        [mx + mh * 1.3, groundY],
      ],
      P.ink,
      lw
    );
  }

  // Đường mặt đất chính
  A.line(c, [[x0, groundY], [x1, groundY]], P.ink, lw);

  // Rừng thông ướt (cho chương 3)
  if (opt.pineForestAt) {
    const { x, w, wet } = opt.pineForestAt;
    for (let tx = x; tx <= x + w; tx += 52) {
      const th = 120 + ((tx * 17) % 30);
      // Thân cây
      A.rrect(c, tx - 6, groundY - 36, 12, 36, 2, P.dark, P.ink, li);
      // 3 tầng tán lá thông
      for (let tier = 0; tier < 3; tier++) {
        const ty = groundY - 30 - tier * 30;
        const tw = 38 - tier * 7;
        A.poly(
          c,
          [
            [tx - tw, ty],
            [tx, ty - 46],
            [tx + tw, ty],
          ],
          P.oliveDark,
          P.ink,
          li
        );
      }
      if (wet) {
        // Giọt nước đọng trên tán thông
        A.circle(c, tx - 14, groundY - 58, 4, P.sky, P.ink, 1.5);
        A.circle(c, tx + 16, groundY - 82, 4, P.sky, P.ink, 1.5);
      }
    }
  }

  // Các đám mây / mây giông
  if (opt.clouds) {
    for (const cl of opt.clouds) {
      drawCloudLayer(c, cl.x, cl.y, cl.w, cl.h, cl.dark ?? false);
    }
  }
}

/** Đám mây dày (mây mùa đông hoặc mây giông). */
export function drawCloudLayer(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  dark = false,
  rainPhase?: number
) {
  const lw = A.px(c, LINE.outer);
  const li = A.px(c, LINE.inner);
  const fill = dark ? '#94a3b8' : '#e2e8f0';
  const sub = dark ? '#64748b' : '#cbd5e1';

  c.save();
  c.translate(x, y);
  // Mưa rơi bên dưới nếu có rainPhase
  if (rainPhase !== undefined) {
    for (let i = -w * 0.42; i <= w * 0.42; i += 34) {
      const off = ((rainPhase * 220 + i * 3.7) % 180);
      A.line(
        c,
        [
          [i, h * 0.3 + off],
          [i - 12, h * 0.3 + off + 32],
        ],
        P.sky,
        li
      );
    }
  }
  // Đế phẳng và các vòm mây
  A.rrect(c, -w / 2, -h * 0.2, w, h * 0.6, h * 0.3, fill, P.ink, lw);
  const bumps = 5;
  for (let i = 0; i < bumps; i++) {
    const bx = -w * 0.36 + (i / (bumps - 1)) * w * 0.72;
    const br = h * (0.45 + 0.18 * Math.sin(i * 1.9 + 0.5));
    A.circle(c, bx, -h * 0.18, br, fill, P.ink, lw);
  }
  // Lấp phần viền giao nhau bên trong
  A.rrect(c, -w / 2 + 4, -h * 0.22, w - 8, h * 0.56, h * 0.25, fill, null, 0);
  // Nét bóng bụng mây
  A.line(c, [[-w * 0.38, h * 0.2], [w * 0.38, h * 0.2]], sub, lw);
  c.restore();
}

// ── 2. Vệ tinh Corona 1960 & Khoang phim đồng + Máy bay C-119 móc dù ─────────

/**
 * Vệ tinh gián điệp Corona (1960):
 * - 'side': nhìn ngang thân trụ, buồng máy ảnh và khoang phim đồng ở mũi.
 * - 'cutaway': mặt cắt dọc thân cho thấy cuộn phim chạy qua ống kính vào khoang đồng, lò xo đẩy tách khoang.
 * - 'top': nhìn từ trên xuống khi bay qua sân bay.
 */
export function drawCoronaSat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  opt: {
    rot?: number;
    capsuleAttached?: boolean;
    ejectProgress?: number; // 0..1 đẩy khoang phim ra
    scanCone?: number; // 0..1 chùm chụp ảnh
    filmRollPhase?: number;
  } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;
  const attached = opt.capsuleAttached ?? true;

  c.save();
  c.translate(x, y);
  if (opt.rot) c.rotate(opt.rot);
  c.scale(s, s);

  if (view === 'top') {
    // Thân trụ nhìn từ trên xuống
    A.rrect(c, -130, -38, 220, 76, 16, P.olive, P.ink, lw);
    A.rrect(c, -110, -26, 170, 52, 8, P.oliveLight, P.ink, li);
    // Đuôi động cơ Agena
    A.poly(c, [[-130, -24], [-165, -34], [-165, 34], [-130, 24]], P.dark, P.ink, lw);
    // Vòng ghép mũi
    A.rrect(c, 82, -34, 16, 68, 4, P.slate, P.ink, lw);
    if (attached) {
      drawFilmCapsule(c, 130, 0, 1, 'top', {});
    }
    c.restore();
    return;
  }

  // Chùm tia chụp ảnh hướng xuống nếu có
  if (opt.scanCone && opt.scanCone > 0) {
    const ch = 420 * opt.scanCone;
    A.withA(c, 0.22, () => {
      A.poly(c, [[-20, 36], [30, 36], [140, 36 + ch], [-130, 36 + ch]], P.amber, null, 0);
    });
    A.line(c, [[-20, 36], [-130, 36 + ch]], P.amber, li, [10, 8]);
    A.line(c, [[30, 36], [140, 36 + ch]], P.amber, li, [10, 8]);
  }

  // Động cơ đuôi Agena
  A.poly(c, [[-130, -24], [-168, -36], [-168, 36], [-130, 24]], P.dark, P.ink, lw);
  // Thân chính vệ tinh
  A.rrect(c, -130, -42, 220, 84, 14, P.olive, P.ink, lw);

  if (view === 'side') {
    // Dải tấm ghép & cửa sổ ống kính dưới bụng
    A.rrect(c, -110, -34, 180, 24, 6, P.oliveLight, null, 0);
    A.line(c, [[-50, -42], [-50, 42]], P.ink, li);
    A.line(c, [[45, -42], [45, 42]], P.ink, li);
    // Cụm ống kính thò dưới bụng
    A.poly(c, [[-24, 42], [34, 42], [24, 62], [-14, 62]], P.slate, P.ink, lw);
    A.rrect(c, -10, 56, 30, 8, 2, P.glass, P.ink, li);
  } else {
    // CUTAWAY: Mặt cắt dọc cho thấy cuộn phim, hệ thống ống kính quét và lò xo đẩy khoang
    A.rrect(c, -118, -32, 196, 64, 8, P.paper, P.ink, li);
    // Cụm ống kính dưới bụng hướng lên trục cuốn phim
    A.poly(c, [[-22, 42], [32, 42], [22, 62], [-12, 62]], P.slate, P.ink, lw);
    A.ellipse(c, 5, 34, 18, 7, 0, P.glass, P.ink, li);
    // Cuộn phim cấp (trái) và đường dây phim chạy sang khoang thu hồi (phải)
    const fp = opt.filmRollPhase ?? 0;
    A.circle(c, -72, -4, 22, P.dark, P.ink, lw);
    A.circle(c, -72, -4, 9, P.amber, P.ink, li);
    A.line(
      c,
      [
        [-72 + Math.cos(fp) * 18, -4 + Math.sin(fp) * 18],
        [-72 - Math.cos(fp) * 18, -4 - Math.sin(fp) * 18],
      ],
      P.paper,
      li
    );
    // Con lăn dẫn dải phim màu đồng/hổ phách qua tiêu điểm ống kính
    A.circle(c, -20, 20, 7, P.slate, P.ink, li);
    A.circle(c, 28, 20, 7, P.slate, P.ink, li);
    A.line(c, [[-72, 18], [-20, 26], [28, 26], [95, 0]], P.amber, lw);

    // Lò xo đẩy ở vách ngăn mũi (x = 76..90)
    const ej = A.clamp01(opt.ejectProgress ?? 0);
    const springLen = 18 + ej * 36;
    const pts: A.Pt[] = [[72, -18]];
    for (let i = 1; i <= 6; i++) {
      pts.push([72 + (i / 6) * springLen, i % 2 === 0 ? -18 : 18]);
    }
    A.line(c, pts, P.ink, li);
  }

  // Vành khớp nối mũi
  A.rrect(c, 82, -38, 14, 76, 3, P.slate, P.ink, lw);

  if (attached) {
    const ej = A.clamp01(opt.ejectProgress ?? 0);
    drawFilmCapsule(c, 134 + ej * 120, 0, 1, view === 'cutaway' ? 'cutaway' : 'side', {});
  }

  c.restore();
}

/**
 * Khoang hồi quyển chứa phim bằng đồng (Brass-weighted film capsule):
 * - 'side': chóp cụt bầu màu đồng `P.amber`, đế có loa phụt hãm quỹ đạo (`retroThrust`), hoặc bung dù (`chuteOpen`).
 * - 'cutaway': mở vỏ thấy lõi cuộn phim bên trong và lớp khiên nhiệt bằng đồng dày ở mũi.
 */
export function drawFilmCapsule(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  opt: {
    rot?: number;
    retroThrust?: number; // 0..1 lửa tên lửa hãm ở đuôi khoang
    heatGlow?: number; // 0..1 vầng lửa ma sát khí quyển ở đầu mũi đồng
    chuteOpen?: number; // 0..1 độ mở dù (khi rơi thẳng đứng)
  } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;

  c.save();
  c.translate(x, y);
  if (opt.rot) c.rotate(opt.rot);
  c.scale(s, s);

  // Nếu dù bung (chuteOpen > 0), dây dù nối từ đuôi khoang (-28, 0) hoặc đỉnh khoang khi rơi
  if (opt.chuteOpen && opt.chuteOpen > 0.01) {
    const p = A.clamp01(opt.chuteOpen);
    const cw = 135 * p;
    const cy = -215 * p - 45;
    // Dây dù nối từ phần vành trên của khoang (-18..18, -30) lên vòm dù
    for (let i = -3; i <= 3; i++) {
      A.line(c, [[i * 6, -30], [(i / 3) * cw, cy]], P.ink, li);
    }
    // Vòm dù cam-trắng
    c.beginPath();
    c.arc(0, cy, cw, Math.PI, 0);
    c.closePath();
    A.fs(c, P.paper, P.ink, lw);
    // Múi cam giữa dù
    c.beginPath();
    c.moveTo(-cw * 0.42, cy);
    c.arc(0, cy, cw, Math.PI * 1.35, Math.PI * 1.65);
    c.lineTo(cw * 0.42, cy);
    c.closePath();
    A.fs(c, P.amber, P.ink, li);
    // Dây cáp khuyên phía trên đỉnh dù (móc câu của máy bay sẽ ngoắc vào đây)
    A.line(c, [[-44 * p, cy - cw * 0.92], [0, cy - cw - 52 * p], [44 * p, cy - cw * 0.92]], P.ink, lw);
    A.circle(c, 0, cy - cw - 54 * p, 12 * p, P.amber, P.ink, lw);
  }

  // Lửa tên lửa hãm quỹ đạo (phụt về phía -x)
  if (opt.retroThrust && opt.retroThrust > 0.01) {
    const tp = opt.retroThrust;
    const L = 95 * tp;
    A.poly(c, [[-44, -12], [-44 - L, -32], [-44 - L * 0.7, 0], [-44 - L, 32], [-44, 12]], P.amber, P.ink, li);
    A.poly(c, [[-44, -6], [-44 - L * 0.55, 0], [-44, 6]], P.white, null, 0);
  }

  // Loa phụt hãm ở đáy khoang (-x)
  A.poly(c, [[-28, -16], [-44, -22], [-44, 22], [-28, 16]], P.dark, P.ink, lw);

  // Thân khoang hình chóp cụt mũi tròn (hướng +x là mũi bầu bằng đồng)
  c.beginPath();
  c.moveTo(-28, -34);
  c.lineTo(14, -28);
  c.arc(14, 0, 28, -Math.PI / 2, Math.PI / 2);
  c.lineTo(-28, 34);
  c.closePath();
  A.fs(c, P.amber, P.ink, lw);

  if (view === 'side' || view === 'top') {
    // Đai kim loại chịu lực & vạch chia thân khoang
    A.rrect(c, -28, -34, 14, 68, 3, P.slate, P.ink, lw);
    A.line(c, [[10, -28], [10, 28]], P.ink, li);
    // Ánh sáng bóng trên mũi đồng
    A.ellipse(c, 22, -10, 8, 4, -0.3, P.white, null, 0);
  } else {
    // CUTAWAY: Mở ruột khoang thấy lõi cuộn phim bên trong lớp vỏ đồng dày
    A.rrect(c, -20, -22, 36, 44, 6, P.paper, P.ink, li);
    A.circle(c, -2, 0, 16, P.dark, P.ink, lw);
    A.circle(c, -2, 0, 7, P.amber, P.ink, li);
  }

  // Vầng nhiệt ma sát khí quyển bao quanh mũi đồng (+x)
  if (opt.heatGlow && opt.heatGlow > 0.01) {
    const hg = opt.heatGlow;
    A.withA(c, hg * 0.85, () => {
      c.beginPath();
      c.arc(18, 0, 38, -Math.PI * 0.65, Math.PI * 0.65);
      c.strokeStyle = P.enemy;
      c.lineWidth = lw * 3;
      c.stroke();
    });
  }

  c.restore();
}

/**
 * Máy bay vận tải C-119 Flying Boxcar mở cửa đuôi kéo dàn móc thép chữ V:
 * - 'side': nhìn ngang thân hộp, cánh cao, dầm đuôi, cửa hầm hàng mở, sào và dây cáp chữ V gắn móc thép.
 * - 'top': nhìn từ trên xuống thấy thiết kế hai dầm đuôi kép (twin-boom) và lưới cáp chữ V phía sau.
 */
export function drawCatchPlane(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  opt: {
    dir?: 1 | -1;
    propPhase?: number;
    hookExtend?: number; // 0..1 độ vươn dàn cáp móc phía sau
    caughtCapsule?: boolean; // đã móc trúng dây dù chưa
  } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;
  const dir = opt.dir ?? 1;
  const ext = opt.hookExtend ?? 1;

  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);

  if (view === 'top') {
    // Cánh chính sải rộng
    A.rrect(c, -45, -180, 84, 360, 12, P.olive, P.ink, lw);
    // Hai dầm đuôi kép (twin-boom) nối ra cánh đuôi ngang
    A.rrect(c, -185, -82, 160, 18, 4, P.oliveDark, P.ink, lw);
    A.rrect(c, -185, 64, 160, 18, 4, P.oliveDark, P.ink, lw);
    A.rrect(c, -195, -96, 28, 192, 6, P.oliveLight, P.ink, lw);
    // 2 động cơ cánh quạt trên cánh
    A.rrect(c, 15, -88, 42, 30, 6, P.slate, P.ink, lw);
    A.rrect(c, 15, 58, 42, 30, 6, P.slate, P.ink, lw);
    // Thân hộp trung tâm mở đuôi
    A.rrect(c, -80, -42, 185, 84, 24, P.oliveLight, P.ink, lw);
    A.rrect(c, 68, -28, 28, 56, 10, P.glass, P.ink, li);
    // Dàn cáp chữ V kéo sau đuôi
    if (ext > 0.05) {
      const L = 190 * ext;
      A.line(c, [[-80, -24], [-80 - L, -65], [-80 - L * 1.15, 0], [-80 - L, 65], [-80, 24]], P.dark, lw);
      // 3 móc thép trên dây ngang
      for (const hy of [-45, 0, 45]) {
        A.circle(c, -80 - L * 1.05, hy, 8, P.amber, P.ink, li);
      }
    }
    c.restore();
    return;
  }

  // SIDE VIEW:
  // Dàn sào và dây cáp móc thép kéo phía sau cửa đuôi mở (-x)
  if (ext > 0.05) {
    const L = 210 * ext;
    // Hai thanh sào dẫn hướng thò ra từ bụng đuôi
    A.line(c, [[-82, 16], [-82 - L * 0.65, 68]], P.slate, lw * 1.2);
    // Dây cáp thép dài nối xuống móc câu
    A.line(c, [[-75, 4], [-82 - L * 0.65, 68], [-82 - L, 92]], P.dark, lw);
    // Chùm móc câu bằng thép ở cuối dây
    const hx = -82 - L;
    const hy = 92;
    c.save();
    c.translate(hx, hy);
    A.path(c, [[0, 0], [-18, 12], [-10, 28], [6, 20]], false);
    A.fs(c, null, P.ink, lw * 1.2);
    A.path(c, [[0, 0], [-22, -4], [-18, -20], [-2, -14]], false);
    A.fs(c, null, P.ink, lw * 1.2);
    A.circle(c, 0, 0, 7, P.amber, P.ink, li);
    c.restore();
  }

  // Dầm đuôi cao & cánh đứng
  A.rrect(c, -185, -36, 130, 20, 4, P.oliveDark, P.ink, lw);
  A.poly(c, [[-185, -36], [-150, -36], [-165, -96], [-192, -96]], P.olive, P.ink, lw);

  // Thân hộp máy bay vận tải (mở vạt đuôi dưới)
  A.poly(
    c,
    [
      [-90, -40],
      [85, -40],
      [125, -10],
      [125, 22],
      [95, 34],
      [-55, 34],
      [-90, -6],
    ],
    P.olive,
    P.ink,
    lw
  );
  // Khoang hàng mở ở đuôi (-90..-55)
  A.poly(c, [[-90, -6], [-55, 34], [-55, -8], [-90, -6]], P.dark, P.ink, li);
  // Kính buồng lái mũi
  A.poly(c, [[78, -34], [112, -12], [78, -12]], P.glass, P.ink, li);
  // Cánh cao gắn động cơ cánh quạt
  A.rrect(c, -35, -50, 92, 18, 6, P.oliveLight, P.ink, lw);
  A.rrect(c, 15, -46, 56, 26, 8, P.slate, P.ink, lw);
  // Cánh quạt quay
  const pp = opt.propPhase ?? 0;
  const ph = 38 * Math.cos(pp * 18);
  A.line(c, [[74, -33 - ph], [74, -33 + ph]], P.ink, lw);
  A.circle(c, 74, -33, 6, P.amber, P.ink, li);

  c.restore();
}

// ── 3. Vệ tinh Quang học Tầng thấp (LEO Optical Reconnaissance Satellite) ─────

/**
 * Vệ tinh trinh sát quang học tầng thấp (~500 km):
 * - 'side': thân trụ kính thiên văn hướng xuống hoặc nghiêng, nắp che ống kính, 2 cánh pin mặt trời.
 * - 'cutaway': mặt cắt dọc thân lộ gương chính lõm rộng nhiều mét (`P.glass`), gương phụ phản xạ tia sáng về cảm biến ảnh.
 * - 'top': nhìn từ trên xuống với hai cánh pin mặt trời đối xứng.
 */
export function drawOpticalSat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  opt: {
    rot?: number; // góc xoay (mặc định 0: ống kính hướng xuống +y)
    rayProgress?: number; // 0..1 tia sáng đi vào gương chính → gương phụ → cảm biến
    dazzled?: number; // 0..1 cảm biến bị chói bởi laser mặt đất (chương 5)
  } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;

  c.save();
  c.translate(x, y);
  if (opt.rot) c.rotate(opt.rot);
  c.scale(s, s);

  if (view === 'top') {
    // 2 cánh pin mặt trời
    for (const sx of [-1, 1]) {
      A.rrect(c, sx > 0 ? 48 : -198, -28, 150, 56, 4, P.slate, P.ink, lw);
      for (let gx = 1; gx < 5; gx++) {
        const px = (sx > 0 ? 48 : -198) + gx * 30;
        A.line(c, [[px, -28], [px, 28]], P.ink, li);
      }
    }
    A.line(c, [[-48, 0], [48, 0]], P.ink, lw);
    // Thân tròn ở tâm
    A.circle(c, 0, 0, 48, P.olive, P.ink, lw);
    A.circle(c, 0, 0, 32, P.oliveLight, P.ink, li);
    c.restore();
    return;
  }

  // Cánh pin mặt trời vươn ngang 2 bên
  for (const sx of [-1, 1]) {
    A.rrect(c, sx > 0 ? 54 : -194, -18, 140, 36, 4, P.slate, P.ink, lw);
    for (let gx = 1; gx < 4; gx++) {
      const px = (sx > 0 ? 54 : -194) + gx * 35;
      A.line(c, [[px, -18], [px, 18]], P.ink, li);
    }
    A.line(c, [[sx * 44, 0], [sx * 54, 0]], P.ink, lw);
  }

  // Khoang thiết bị phía trên (-y)
  A.rrect(c, -46, -110, 92, 46, 10, P.oliveDark, P.ink, lw);
  // Thân ống kính thiên văn chính (hướng xuống +y)
  A.rrect(c, -52, -68, 104, 156, 8, P.olive, P.ink, lw);
  // Nắp chắn sáng mở nghiêng ở miệng dưới (+y)
  A.poly(c, [[-52, 88], [52, 88], [66, 118], [-38, 108]], P.oliveLight, P.ink, lw);

  if (view === 'side') {
    // Các đai gân chịu lực ngoài vỏ
    A.line(c, [[-52, -20], [52, -20]], P.ink, li);
    A.line(c, [[-52, 34], [52, 34]], P.ink, li);
    A.rrect(c, -34, -52, 68, 22, 4, P.oliveLight, P.ink, li);
  } else {
    // CUTAWAY: Lộ lòng ống kính thiên văn với gương lõm lớn (Primary Mirror) và gương phụ (Secondary Mirror)
    A.rrect(c, -42, -60, 84, 142, 4, P.paper, P.ink, li);

    // Gương chính lõm rộng ở phía trên (-y = -32), mặt lõm quay xuống (+y)
    c.beginPath();
    c.moveTo(-38, -38);
    c.lineTo(38, -38);
    c.lineTo(38, -18);
    c.quadraticCurveTo(0, -34, -38, -18);
    c.closePath();
    A.fs(c, P.glass, P.ink, lw);

    // Cảm biến thu ảnh đặt sau tâm gương chính (-y = -52)
    A.rrect(c, -16, -56, 32, 14, 3, P.amber, P.ink, li);

    // Giá chữ A giữ gương phụ nhỏ ở gần miệng dưới (+y = 58)
    A.line(c, [[-40, 26], [-12, 58]], P.slate, li);
    A.line(c, [[40, 26], [12, 58]], P.slate, li);
    A.rrect(c, -14, 56, 28, 9, 3, P.glass, P.ink, lw);

    // Đường đi của tia sáng: từ dưới đi lên gương chính → hội tụ về gương phụ → xuyên qua tâm gương chính lên cảm biến
    const rp = A.clamp01(opt.rayProgress ?? 1);
    if (rp > 0.01) {
      for (const rx of [-28, 28]) {
        // Chặng 1: từ ngoài vào gương chính
        const p1 = A.clamp01(rp * 2.5);
        A.line(c, [[rx, 110], [rx, A.lerp(110, -24, p1)]], P.amber, li);
        // Chặng 2: phản xạ từ gương chính về gương phụ
        if (rp > 0.4) {
          const p2 = A.clamp01((rp - 0.4) * 2.5);
          A.line(
            c,
            [
              [rx, -24],
              [A.lerp(rx, rx * 0.25, p2), A.lerp(-24, 56, p2)],
            ],
            P.amber,
            li
          );
        }
      }
      // Chặng 3: từ gương phụ hội tụ thẳng lên cảm biến ở đỉnh
      if (rp > 0.75) {
        const p3 = A.clamp01((rp - 0.75) * 4);
        A.line(c, [[0, 56], [0, A.lerp(56, -42, p3)]], P.enemy, lw);
      }
    }
  }

  // Hiệu ứng chói cảm biến khi bị chiếu laser (chương 5)
  if (opt.dazzled && opt.dazzled > 0.01) {
    const dz = opt.dazzled;
    A.withA(c, dz, () => {
      A.circle(c, 0, 88, 52 * dz, P.enemyLight, P.enemy, lw);
      A.circle(c, 0, 88, 24 * dz, P.white, null, 0);
    });
  }

  c.restore();
}

// ── 4. Vệ tinh Radar SAR & Vệ tinh Trinh sát Tín hiệu SIGINT ─────────────────

/**
 * Vệ tinh Radar khẩu độ tổng hợp (SAR):
 * - Đặc trưng: thanh ăng-ten phẳng dài dưới bụng (`P.slate`) phát chùm sóng vi ba (`P.sky`), cánh pin mặt trời nghiêng.
 */
export function drawRadarSat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  opt: {
    rot?: number;
    pulsePhase?: number; // phát xung radar
    highlightArray?: number; // làm sáng các ô thu phát trên mặt ăng-ten
  } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;

  c.save();
  c.translate(x, y);
  if (opt.rot) c.rotate(opt.rot);
  c.scale(s, s);

  // Thân lục giác/hộp trên
  A.poly(c, [[-55, -42], [55, -42], [70, -8], [-70, -8]], P.olive, P.ink, lw);
  // Cánh năng lượng mặt trời vươn chéo lên trên
  A.poly(c, [[-45, -42], [-95, -92], [-25, -92], [15, -42]], P.oliveDark, P.ink, lw);

  // Tấm ăng-ten phẳng SAR dài gắn dưới bụng
  const aw = 180;
  const ah = view === 'cutaway' ? 32 : 22;
  A.rrect(c, -aw / 2, -4, aw, ah, 4, P.slate, P.ink, lw);

  // Các phân đoạn mô-đun thu-phát (T/R modules) dọc tấm ăng-ten
  const n = 6;
  for (let i = 0; i < n; i++) {
    const mx = -aw / 2 + 8 + i * ((aw - 16) / n);
    const mw = (aw - 16) / n - 6;
    const active = opt.highlightArray !== undefined && i <= opt.highlightArray * n;
    A.rrect(c, mx, 1, mw, ah - 10, 2, active ? P.sky : P.light, P.ink, li);
  }

  c.restore();
}

/**
 * Vệ tinh Trinh sát Tín hiệu (SIGINT):
 * - Đặc trưng: chảo ăng-ten lưới parabol khổng lồ mở rộng đón sóng vô tuyến từ dưới đất.
 */
export function drawSigintSat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  opt: { rot?: number; listening?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;

  c.save();
  c.translate(x, y);
  if (opt.rot) c.rotate(opt.rot);
  c.scale(s, s);

  // Thân chính phía trên
  A.rrect(c, -36, -54, 72, 42, 8, P.olive, P.ink, lw);
  // Cánh pin mặt trời hai bên
  A.rrect(c, -130, -45, 88, 24, 3, P.slate, P.ink, lw);
  A.rrect(c, 42, -45, 88, 24, 3, P.slate, P.ink, lw);

  // Vòm ăng-ten lưới rộng mở hướng xuống (+y)
  c.beginPath();
  c.moveTo(-92, 24);
  c.quadraticCurveTo(0, -28, 92, 24);
  c.quadraticCurveTo(0, 6, -92, 24);
  c.closePath();
  A.fs(c, P.amber, P.ink, lw);

  // Nan lưới ăng-ten
  for (let i = -3; i <= 3; i++) {
    A.line(c, [[0, -12], [i * 26, 20]], P.ink, li);
  }
  // Cột thu hội tụ ở tâm dưới chảo
  A.line(c, [[-24, 8], [0, 52], [24, 8]], P.ink, lw);
  A.circle(c, 0, 52, 8, opt.listening ? P.sky : P.amber, P.ink, lw);

  c.restore();
}

// ── 5. Vệ tinh Địa tĩnh (GEO Early Warning & GEO Communications) ─────────────

/**
 * Vệ tinh Cảnh báo sớm Địa tĩnh (~36.000 km, cảm biến Hồng ngoại bắt nhiệt tên lửa):
 * - Đặc trưng: đầu ống kính hồng ngoại hình nón cụt lớn hướng xuống, tấm chắn nhiệt và 2 cánh pin lớn.
 */
export function drawGeoWarningSat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  opt: {
    rot?: number;
    irLock?: number; // 0..1 bắt trúng tia nhiệt hồng ngoại
  } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;

  c.save();
  c.translate(x, y);
  if (opt.rot) c.rotate(opt.rot);
  c.scale(s, s);

  // 2 cánh pin mặt trời dài
  for (const sx of [-1, 1]) {
    A.rrect(c, sx > 0 ? 52 : -202, -20, 150, 40, 4, P.slate, P.ink, lw);
    for (let k = 1; k < 4; k++) {
      const gx = (sx > 0 ? 52 : -202) + k * 38;
      A.line(c, [[gx, -20], [gx, 20]], P.ink, li);
    }
  }
  // Thân hộp điều khiển
  A.rrect(c, -48, -46, 96, 74, 10, P.olive, P.ink, lw);

  // Cụm kính thiên văn hồng ngoại (Infrared Telescope) hướng xuống (+y)
  A.poly(c, [[-34, 28], [34, 28], [48, 86], [-48, 86]], P.oliveLight, P.ink, lw);
  A.ellipse(c, 0, 86, 46, 12, 0, view === 'cutaway' ? P.enemyLight : P.amber, P.ink, lw);

  if (view === 'cutaway') {
    // Mặt cắt lộ cảm biến nhiệt lạnh bên trong
    A.rrect(c, -28, -32, 56, 54, 6, P.paper, P.ink, li);
    A.circle(c, 0, -4, 16, P.enemy, P.ink, lw);
    A.line(c, [[-24, 78], [0, -4], [24, 78]], P.enemy, li);
  }

  if (opt.irLock && opt.irLock > 0.01) {
    A.circle(c, 0, 86, 16 + 8 * Math.sin(opt.irLock * 12), P.enemy, P.white, li);
  }

  c.restore();
}

/**
 * Vệ tinh Liên lạc Địa tĩnh (GEO Communications Relay Satellite):
 * - Đặc trưng: 2 chảo thu-phát parabol lớn hai bên sườn để bắt sóng từ lục địa này và phản xạ sang lục địa kia.
 */
export function drawGeoCommsSat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  _view: ViewMode = 'side',
  opt: { rot?: number; relayActive?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;

  c.save();
  c.translate(x, y);
  if (opt.rot) c.rotate(opt.rot);
  c.scale(s, s);

  // Cánh pin mặt trời hướng dọc lên/xuống hoặc ngang
  A.rrect(c, -18, -145, 36, 95, 4, P.slate, P.ink, lw);
  A.rrect(c, -18, -110, 36, 25, 0, P.light, P.ink, li);

  // Thân trung tâm
  A.rrect(c, -42, -45, 84, 76, 10, P.olive, P.ink, lw);
  A.rrect(c, -30, -33, 60, 52, 6, P.oliveLight, P.ink, li);

  // Hai chảo parabol thu và phát hướng chéo xuống dưới-trái và dưới-phải
  for (const sx of [-1, 1]) {
    c.save();
    c.translate(sx * 56, 18);
    c.rotate(sx * 0.45);
    c.beginPath();
    c.arc(0, 0, 34, 0, Math.PI);
    c.closePath();
    A.fs(c, P.paper, P.ink, lw);
    A.line(c, [[0, 12], [0, 42]], P.ink, lw);
    A.circle(c, 0, 42, 7, opt.relayActive ? P.sky : P.amber, P.ink, li);
    c.restore();
  }

  c.restore();
}

// ── 6. Vệ tinh Định vị MEO / GPS (20.000 km) có mặt cắt Đồng hồ nguyên tử ────

/**
 * Vệ tinh Định vị MEO (GPS / Galileo / GLONASS / Beidou):
 * - 'side': thân hộp có dàn 12 cọc ăng-ten phát sóng L-band dưới bụng, 2 cánh pin nghiêng.
 * - 'cutaway': mặt cắt chính giữa lộ mặt Đồng hồ nguyên tử (Atomic Clock) + vòng quỹ đạo nguyên tử Cesium/Rubidium.
 */
export function drawNavSat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  opt: {
    rot?: number;
    clockPhase?: number; // góc kim đồng hồ nguyên tử
    broadcastPulse?: number; // 0..1 phát sóng
  } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;

  c.save();
  c.translate(x, y);
  if (opt.rot) c.rotate(opt.rot);
  c.scale(s, s);

  // 2 cánh pin mặt trời
  for (const sx of [-1, 1]) {
    A.rrect(c, sx > 0 ? 50 : -165, -22, 115, 44, 4, P.slate, P.ink, lw);
    A.line(c, [[sx > 0 ? 88 : -127, -22], [sx > 0 ? 88 : -127, 22]], P.ink, li);
    A.line(c, [[sx > 0 ? 126 : -89, -22], [sx > 0 ? 126 : -89, 22]], P.ink, li);
  }

  // Thân hộp vuông
  A.rrect(c, -48, -48, 96, 96, 12, P.olive, P.ink, lw);

  // Dàn cọc ăng-ten phát sóng định vị dưới bụng (+y)
  for (const ax of [-28, -10, 10, 28]) {
    A.rrect(c, ax - 4, 48, 8, 22, 3, P.amber, P.ink, li);
  }

  if (view === 'cutaway') {
    // Lộ mặt đồng hồ nguyên tử chính xác bên trong thân vệ tinh
    A.circle(c, 0, 0, 36, P.paper, P.ink, lw);
    // Hai vòng elip nguyên tử đan chéo
    A.ellipse(c, 0, 0, 28, 10, 0.6, null, P.sky, li);
    A.ellipse(c, 0, 0, 28, 10, -0.6, null, P.sky, li);
    // Vạch chia giờ và kim đồng hồ
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      A.line(c, [[Math.cos(a) * 29, Math.sin(a) * 29], [Math.cos(a) * 34, Math.sin(a) * 34]], P.ink, li);
    }
    const cp = opt.clockPhase ?? 0;
    A.line(c, [[0, 0], [Math.cos(cp) * 24, Math.sin(cp) * 24]], P.enemy, lw);
    A.line(c, [[0, 0], [Math.cos(cp * 0.2) * 16, Math.sin(cp * 0.2) * 16]], P.ink, lw);
    A.circle(c, 0, 0, 4, P.ink, null, 0);
  } else {
    A.rrect(c, -34, -34, 68, 68, 6, P.oliveLight, P.ink, li);
    A.circle(c, 0, 0, 18, P.amber, P.ink, li);
  }

  c.restore();
}

// ── 7. Phương tiện Mặt đất, Biển, Không & Vũ khí dẫn đường / Chống vệ tinh ────

/** Máy bay ném bom đậu trên sân bay (Chapter 1 & 2, nhìn từ trên xuống hoặc nhìn ngang). */
export function drawParkedBomber(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'top',
  side: 'ally' | 'foe' = 'foe',
  rot = 0
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;
  const bodyCol = side === 'foe' ? P.enemy : P.olive;
  const subCol = side === 'foe' ? P.enemyLight : P.oliveLight;

  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.scale(s, s);

  if (view === 'top') {
    // Cánh xuôi sau (swept-wing bomber)
    A.poly(
      c,
      [
        [15, 0],
        [-25, -88],
        [-45, -88],
        [-18, 0],
        [-45, 88],
        [-25, 88],
      ],
      bodyCol,
      P.ink,
      lw
    );
    // Cánh đuôi
    A.poly(
      c,
      [
        [-58, 0],
        [-80, -34],
        [-90, -34],
        [-74, 0],
        [-90, 34],
        [-80, 34],
      ],
      subCol,
      P.ink,
      lw
    );
    // Thân dài
    A.rrect(c, -88, -11, 148, 22, 11, subCol, P.ink, lw);
    // Buồng lái mũi
    A.rrect(c, 28, -7, 20, 14, 5, P.glass, P.ink, li);
    // Dấu nhận dạng trên cánh (ngôi sao/vạch để kính thiên văn 500km đọc được)
    A.circle(c, -22, -52, 7, P.white, P.ink, li);
    A.circle(c, -22, 52, 7, P.white, P.ink, li);
  } else {
    A.rrect(c, -80, -16, 150, 32, 14, bodyCol, P.ink, lw);
    A.poly(c, [[-80, -16], [-55, -16], [-72, -52], [-88, -52]], subCol, P.ink, lw);
    A.rrect(c, 35, -14, 24, 12, 4, P.glass, P.ink, li);
  }

  c.restore();
}

/** Xe tăng / Thiết giáp (Side hoặc Top). */
export function drawTank(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  side: 'ally' | 'foe' = 'ally',
  dir: 1 | -1 = 1
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;
  const body = side === 'ally' ? P.olive : P.enemy;
  const topCol = side === 'ally' ? P.oliveLight : P.enemyLight;

  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);

  if (view === 'top') {
    A.rrect(c, -48, -30, 96, 60, 8, body, P.ink, lw);
    A.rrect(c, -44, -34, 88, 10, 3, P.dark, P.ink, li);
    A.rrect(c, -44, 24, 88, 10, 3, P.dark, P.ink, li);
    A.circle(c, -4, 0, 22, topCol, P.ink, lw);
    A.capsule(c, [12, 0], [66, 0], 8, P.dark, P.ink, lw);
    c.restore();
    return;
  }

  // SIDE (gốc y=0 ở mặt đất)
  A.rrect(c, -52, -22, 104, 22, 11, P.dark, P.ink, lw);
  for (let i = -36; i <= 36; i += 24) {
    A.circle(c, i, -11, 8, P.slate, P.ink, li);
  }
  A.poly(c, [[-56, -20], [-42, -38], [44, -38], [58, -20]], body, P.ink, lw);
  A.poly(c, [[-26, -38], [-16, -56], [20, -56], [28, -38]], topCol, P.ink, lw);
  A.capsule(c, [24, -47], [78, -49], 7, P.dark, P.ink, lw);
  c.restore();
}

/** Pháo mặt đất / Lựu pháo (Howitzer - có các góc vuông kim loại phản xạ radar SAR). */
export function drawHowitzer(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  side: 'ally' | 'foe' = 'ally',
  dir: 1 | -1 = 1,
  elev = 0.45
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;
  const col = side === 'ally' ? P.olive : P.enemy;

  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);

  if (view === 'top') {
    // 2 càng pháo chữ V phía sau
    A.line(c, [[-55, -28], [0, 0], [-55, 28]], P.dark, lw * 1.4);
    // Khiên pháo góc cạnh
    A.rrect(c, -10, -26, 22, 52, 3, col, P.ink, lw);
    // Nòng dài
    A.capsule(c, [6, 0], [72, 0], 8, P.slate, P.ink, lw);
    c.restore();
    return;
  }

  // Càng pháo chống xuống đất
  A.poly(c, [[-58, 0], [-8, -18], [4, -12], [-44, 0]], P.dark, P.ink, lw);
  // Nòng pháo nâng theo góc elev
  c.save();
  c.translate(0, -24);
  c.rotate(-elev);
  A.capsule(c, [-10, 0], [72, 0], 9, P.slate, P.ink, lw);
  A.rrect(c, 66, -8, 12, 16, 2, P.dark, P.ink, li);
  c.restore();
  // Lá chắn góc vuông kim loại (Corner reflector tự nhiên cho SAR)
  A.poly(c, [[-12, -14], [14, -14], [8, -46], [-6, -46]], col, P.ink, lw);
  // Bánh xe
  A.circle(c, 0, -15, 15, P.dark, P.ink, lw);
  A.circle(c, 0, -15, 6, P.slate, P.ink, li);
  c.restore();
}

/** Tàu chiến mặt nước (có kiến trúc thượng tầng góc vuông phản xạ SAR & chảo liên lạc vệ tinh). */
export function drawWarship(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  side: 'ally' | 'foe' = 'ally',
  dir: 1 | -1 = 1
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;
  const hull = side === 'ally' ? P.slate : P.enemy;
  const deck = side === 'ally' ? P.light : P.enemyLight;

  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);

  if (view === 'top') {
    c.beginPath();
    c.moveTo(-110, -24);
    c.lineTo(65, -24);
    c.lineTo(115, 0);
    c.lineTo(65, 24);
    c.lineTo(-110, 24);
    c.closePath();
    A.fs(c, hull, P.ink, lw);
    // Thượng tầng góc vuông
    A.rrect(c, -55, -16, 85, 32, 3, deck, P.ink, lw);
    A.rrect(c, -25, -10, 36, 20, 2, P.white, P.ink, li);
    // Ụ pháo mũi
    A.circle(c, 54, 0, 10, deck, P.ink, li);
    A.line(c, [[54, 0], [82, 0]], P.ink, lw);
    c.restore();
    return;
  }

  // SIDE (mặt nước ở y = 0)
  A.poly(c, [[-110, 0], [-98, -26], [88, -28], [118, -34], [96, 0]], hull, P.ink, lw);
  // Thượng tầng góc vuông (góc 90 độ giữa sàn tàu và vách đài chỉ huy)
  A.poly(c, [[-55, -27], [-45, -62], [25, -62], [35, -27]], deck, P.ink, lw);
  // Cột ăng-ten & vòm liên lạc vệ tinh SATCOM
  A.line(c, [[-10, -62], [-10, -92]], P.ink, lw);
  A.circle(c, 12, -70, 9, P.white, P.ink, li);
  // Pháo hạm ở mũi
  A.rrect(c, 52, -38, 22, 11, 3, deck, P.ink, li);
  A.line(c, [[74, -33], [98, -40]], P.ink, lw);
  c.restore();
}

/** Giếng phóng & Tên lửa đạn đạo (ICBM Silo & Booster) hoặc Tên lửa diệt vệ tinh (ASAT). */
export function drawMissileAndSilo(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  opt: {
    launchHeight?: number; // độ cao tên lửa đã rời giếng
    rot?: number; // góc nghiêng của tên lửa
    plume?: number; // 0..1 luồng lửa nhiệt lớn ở đuôi
    siloOpen?: number; // 0..1 nắp hầm phóng mở
    drawSilo?: boolean;
    side?: 'ally' | 'foe';
  } = {}
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;
  const col = (opt.side ?? 'foe') === 'foe' ? P.enemy : P.olive;

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (opt.drawSilo !== false) {
    // Miệng giếng phóng âm dưới đất
    A.rrect(c, -32, -6, 64, 48, 4, P.dark, P.ink, lw);
    // Nắp hầm bê tông bật mở sang trái
    const open = A.clamp01(opt.siloOpen ?? 1);
    c.save();
    c.translate(-32, -6);
    c.rotate(-open * 1.9);
    A.rrect(c, 0, -10, 64, 10, 3, P.slate, P.ink, lw);
    c.restore();
  }

  // Thân tên lửa
  const lh = opt.launchHeight ?? 0;
  c.save();
  c.translate(0, -lh);
  if (opt.rot) c.rotate(opt.rot);

  // Luồng lửa nhiệt hồng ngoại rực sáng ở đuôi (+y)
  if (opt.plume && opt.plume > 0.01) {
    const pl = opt.plume;
    const L = (75 + 25 * Math.sin(pl * 25)) * pl;
    A.poly(c, [[-14, 10], [-28, 10 + L * 0.6], [0, 10 + L], [28, 10 + L * 0.6], [14, 10]], P.amber, P.enemy, li);
    A.poly(c, [[-8, 10], [0, 10 + L * 0.62], [8, 10 + L * 0.62]], P.white, null, 0);
  }

  // Cánh ổn định đuôi
  A.poly(c, [[-16, -6], [-28, 12], [28, 12], [16, -6]], col, P.ink, lw);
  // Thân trụ 2 tầng
  A.rrect(c, -16, -96, 32, 106, 4, P.paper, P.ink, lw);
  A.rrect(c, -16, -48, 32, 18, 0, col, P.ink, li);
  // Đầu đạn hình nón
  A.poly(c, [[-16, -96], [0, -138], [16, -96]], col, P.ink, lw);

  c.restore();
  c.restore();
}

/** Xe tải Tác chiến điện tử / Gây nhiễu GPS (EW Jammer Truck) hoặc Xe tải quân sự. */
export function drawJammerTruck(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: ViewMode = 'side',
  side: 'ally' | 'foe' = 'foe',
  dir: 1 | -1 = -1,
  jamPower = 0
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;
  const col = side === 'foe' ? P.enemy : P.olive;
  const sub = side === 'foe' ? P.enemyLight : P.oliveLight;

  c.save();
  c.translate(x, y);
  c.scale(dir * s, s);

  if (view === 'top') {
    A.rrect(c, -52, -22, 104, 44, 6, col, P.ink, lw);
    A.rrect(c, 22, -20, 28, 40, 5, sub, P.ink, li);
    A.circle(c, -15, 0, 16, P.amber, P.ink, lw);
    c.restore();
    return;
  }

  // Thùng xe tác chiến điện tử và buồng lái
  A.rrect(c, -56, -54, 74, 36, 4, col, P.ink, lw);
  A.poly(c, [[18, -46], [46, -46], [54, -30], [54, -18], [18, -18]], sub, P.ink, lw);
  A.poly(c, [[24, -42], [43, -42], [49, -31], [24, -31]], P.glass, P.ink, li);
  // Bánh xe
  for (const wx of [-40, -12, 36]) {
    A.circle(c, wx, -14, 14, P.dark, P.ink, lw);
    A.circle(c, wx, -14, 5, P.slate, P.ink, li);
  }
  // Cột ăng-ten phát nhiễu công suất lớn trên nóc thùng
  A.line(c, [[-20, -54], [-20, -96]], P.dark, lw * 1.3);
  A.poly(c, [[-38, -84], [-2, -108], [-2, -76]], P.amber, P.ink, lw);

  // Vòng sóng gây nhiễu át tín hiệu vệ tinh
  if (jamPower > 0.01) {
    for (let i = 1; i <= 3; i++) {
      const r = (40 + i * 48) * jamPower;
      A.withA(c, 0.85 - i * 0.2, () => {
        c.beginPath();
        c.arc(-10, -96, r, -Math.PI * 0.85, -Math.PI * 0.15);
        c.strokeStyle = P.enemy;
        c.lineWidth = lw * 1.3;
        c.stroke();
      });
    }
  }

  c.restore();
}

/** Bom lượn / Tên lửa hành trình / UAV có mặt cắt đầu thu tín hiệu định vị (GPS Receiver). */
export function drawGuidedMunition(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  kind: 'glide_bomb' | 'cruise' | 'uav' | 'shell' = 'glide_bomb',
  view: ViewMode = 'side',
  rot = 0
) {
  const lw = A.px(c, LINE.outer) / s;
  const li = A.px(c, LINE.inner) / s;

  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.scale(s, s);

  if (kind === 'uav') {
    // UAV cánh bằng nhìn ngang hoặc trên xuống
    A.rrect(c, -45, -10, 90, 20, 10, P.oliveLight, P.ink, lw);
    A.poly(c, [[-10, -10], [12, -10], [4, -46], [-12, -46]], P.olive, P.ink, lw);
    A.poly(c, [[-45, -10], [-30, -10], [-38, -28], [-48, -28]], P.oliveDark, P.ink, lw);
    if (view === 'cutaway') {
      A.rrect(c, 6, -7, 22, 14, 3, P.amber, P.ink, li);
    }
    c.restore();
    return;
  }

  // Thân bom lượn / đạn dẫn đường
  A.poly(c, [[-52, -12], [28, -14], [58, 0], [28, 14], [-52, 12]], P.olive, P.ink, lw);
  // Cánh lượn bung ra
  if (kind === 'glide_bomb' || kind === 'cruise') {
    A.poly(c, [[-12, -14], [14, -14], [-6, -48], [-24, -48]], P.slate, P.ink, lw);
  }
  // Cánh lái đuôi (nhận lệnh từ bộ thu GPS)
  A.poly(c, [[-52, -12], [-34, -12], [-44, -28], [-56, -28]], P.amber, P.ink, lw);
  A.poly(c, [[-52, 12], [-34, 12], [-44, 28], [-56, 28]], P.amber, P.ink, lw);

  if (view === 'cutaway') {
    // Mặt cắt lộ ăng-ten thu sóng trên lưng + chip so sánh thời gian nối tới cánh lái
    A.rrect(c, -22, -10, 48, 20, 4, P.paper, P.ink, li);
    A.rrect(c, -6, -7, 24, 14, 2, P.sky, P.ink, li);
    A.circle(c, 18, -14, 5, P.amber, P.ink, li);
    A.line(c, [[-6, 0], [-44, -18]], P.enemy, li);
    A.line(c, [[-6, 0], [-44, 18]], P.enemy, li);
  }

  c.restore();
}
