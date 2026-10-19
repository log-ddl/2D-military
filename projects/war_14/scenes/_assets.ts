// scenes/_assets.ts — Toàn bộ vật và nền của project war_14 (vẽ 1 lần, nhất quán mọi góc nhìn)
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';

export type ViewAngle = 'side' | 'top' | 'cutaway' | 'front';

// ── 1. NỀN CỦA MỖI NƠI (tự mở rộng theo K.view) ──────────────────────────────

/** Nền bàn kỹ thuật / phòng tính toán phản xạ */
export function drawTechBg(c: CanvasRenderingContext2D, cam: K.Cam, opts: { splitX?: number; darkMode?: boolean } = {}) {
  const v = K.view(cam, 800);
  const bgCol = opts.darkMode ? P.dark : P.bg;
  const gridCol = opts.darkMode ? 'rgba(203,213,225,0.08)' : P.bg2;
  c.fillStyle = bgCol;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);

  const step = 120;
  const gx0 = Math.floor(v.x0 / step) * step;
  const gy0 = Math.floor(v.y0 / step) * step;
  c.strokeStyle = gridCol;
  c.lineWidth = A.px(c, 1.5);
  c.beginPath();
  for (let x = gx0; x <= v.x1; x += step) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  for (let y = gy0; y <= v.y1; y += step) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  c.stroke();

  if (opts.splitX !== undefined) {
    A.line(c, [[opts.splitX, v.y0], [opts.splitX, v.y1]], P.ink2, A.px(c, 3), [A.px(c, 12), A.px(c, 8)]);
  }
}

/** Nền bầu trời và mặt đất cho cảnh nhìn ngang (side) */
export function drawSkyGroundBg(
  c: CanvasRenderingContext2D,
  cam: K.Cam,
  opts: { groundY?: number; night?: boolean; scrollX?: number } = {}
) {
  const v = K.view(cam, 900);
  const gy = opts.groundY ?? 300;
  const sx = opts.scrollX ?? 0;

  // Bầu trời
  c.fillStyle = opts.night ? P.dark : P.bg;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, gy - v.y0);

  // Dải tầng trời / mây mờ định vị độ cao
  const cloudCol = opts.night ? 'rgba(100,116,139,0.18)' : P.bg2;
  c.fillStyle = cloudCol;
  const cStep = 700;
  const cx0 = Math.floor((v.x0 + sx * 0.3) / cStep) * cStep;
  for (let cx = cx0; cx <= v.x1 + sx * 0.3 + cStep; cx += cStep) {
    const wx = cx - sx * 0.3;
    A.rrect(c, wx - 160, gy - 540, 320, 36, 18, cloudCol, null, 0);
    A.rrect(c, wx + 120, gy - 420, 240, 28, 14, cloudCol, null, 0);
  }

  // Đồi xa
  const hillStep = 600;
  const hx0 = Math.floor((v.x0 + sx * 0.6) / hillStep) * hillStep;
  const hillPts: A.Pt[] = [[v.x0, gy]];
  for (let hx = hx0 - hillStep; hx <= v.x1 + sx * 0.6 + hillStep * 2; hx += hillStep) {
    const wx = hx - sx * 0.6;
    hillPts.push([wx, gy - 42], [wx + 180, gy - 85], [wx + 380, gy - 28], [wx + 520, gy - 55]);
  }
  hillPts.push([v.x1, gy]);
  A.poly(c, hillPts, opts.night ? P.ink : P.bg2, opts.night ? P.slate : P.light, A.px(c, 2));

  // Mặt đất chính
  c.fillStyle = opts.night ? P.ink : P.sand;
  c.fillRect(v.x0, gy, v.x1 - v.x0, v.y1 - gy);
  A.line(c, [[v.x0, gy], [v.x1, gy]], P.ink, A.px(c, LINE.outer));

  // Vạch địa hình phụ dưới mặt đất
  const gStep = 220;
  const gx0 = Math.floor((v.x0 + sx) / gStep) * gStep;
  for (let gx = gx0; gx <= v.x1 + sx + gStep; gx += gStep) {
    const wx = gx - sx;
    A.line(c, [[wx, gy + 24], [wx + 70, gy + 24]], opts.night ? P.slate : P.ink2, A.px(c, 2));
  }
}

/** Nền nhà chứa máy bay (Hangar) cho cảnh bảo dưỡng RAM */
export function drawHangarBg(c: CanvasRenderingContext2D, cam: K.Cam, floorY = 260) {
  const v = K.view(cam, 800);
  c.fillStyle = P.bg;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, floorY - v.y0);

  // Khung dầm thép nhà chứa
  const colStep = 380;
  const x0 = Math.floor(v.x0 / colStep) * colStep;
  for (let x = x0; x <= v.x1; x += colStep) {
    A.rrect(c, x - 14, v.y0, 28, floorY - v.y0, 0, P.bg2, P.light, A.px(c, 2));
    // Đèn trần hangar
    A.rrect(c, x + colStep * 0.5 - 55, -360, 110, 18, 6, P.white, P.ink2, A.px(c, 2));
  }
  // Sàn hangar
  c.fillStyle = P.bg2;
  c.fillRect(v.x0, floorY, v.x1 - v.x0, v.y1 - floorY);
  A.line(c, [[v.x0, floorY], [v.x1, floorY]], P.ink, A.px(c, LINE.outer));
}

/** Nền bản đồ chiến thuật nhìn từ trên xuống (top) */
export function drawTacticalMapBg(c: CanvasRenderingContext2D, cam: K.Cam, opts: { night?: boolean } = {}) {
  const v = K.view(cam, 900);
  c.fillStyle = opts.night ? P.dark : P.bg;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);

  const gridCol = opts.night ? 'rgba(148,163,184,0.12)' : P.bg2;
  const contourCol = opts.night ? 'rgba(148,163,184,0.18)' : P.light;

  // Lưới tọa độ bản đồ
  const step = 180;
  const gx0 = Math.floor(v.x0 / step) * step;
  const gy0 = Math.floor(v.y0 / step) * step;
  c.strokeStyle = gridCol;
  c.lineWidth = A.px(c, 1.5);
  c.beginPath();
  for (let x = gx0; x <= v.x1; x += step) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  for (let y = gy0; y <= v.y1; y += step) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  c.stroke();

  // Đường bình độ địa hình cố định làm mốc không gian
  const ridges: [number, number, number, number, number][] = [
    [-520, -240, 210, 120, 0.3],
    [420, -280, 250, 140, -0.25],
    [-380, 280, 230, 130, -0.15],
    [480, 240, 260, 145, 0.2],
    [40, -40, 160, 95, 0.1],
  ];
  for (const [rx, ry, rw, rh, rot] of ridges) {
    A.ellipse(c, rx, ry, rw, rh, rot, opts.night ? 'rgba(30,41,59,0.45)' : 'rgba(232,239,244,0.65)', contourCol, A.px(c, 2));
    A.ellipse(c, rx + 12, ry - 6, rw * 0.62, rh * 0.62, rot, null, contourCol, A.px(c, 1.5));
  }
}

// ── 2. MÁY BAY TÀNG HÌNH KIM CƯƠNG (F-117 Nighthawk) ─────────────────────────

export interface StealthDiamondOpts {
  dir?: 1 | -1;
  rot?: number;
  highlightFacet?: number; // -1: none, 0: nose, 1: canopy, 2: upper body, 3: tail, 99: all
  showParallelAngles?: boolean;
  showSawtooth?: boolean;
  bayOpen?: number; // 0..1
  bombDrop?: number; // 0..1
  fanPhase?: number; // rad
  highlightSDuct?: number; // 0..1
  highlightCockpit?: number; // 0..1
  highlightExhaust?: number; // 0..1
  highlightFuel?: number; // 0..1
  ghostAlpha?: number; // cho hiệu ứng "không phải trong suốt"
  wobble?: number; // góc chao đảo khí động học
  flyByWireActive?: boolean;
}

export function drawStealthDiamond(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  view: ViewAngle = 'side',
  opts: StealthDiamondOpts = {}
) {
  const dir = opts.dir ?? 1;
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  if (opts.wobble) c.rotate(opts.wobble);
  c.scale(dir * scale, scale);

  if (view === 'side') {
    // Khung đa diện nhìn ngang (mũi hướng sang phải +X)
    // Cánh đuôi V nghiêng phía sau
    const tailFill = opts.highlightFacet === 3 || opts.highlightFacet === 99 ? P.amber : P.oliveDark;
    A.poly(c, [[-210, -8], [-150, -8], [-195, -92], [-235, -86]], tailFill, P.ink, lw);
    A.line(c, [[-205, -86], [-172, -8]], P.ink2, lwIn);

    // Thân dưới phẳng và mép chine sắc
    A.poly(
      c,
      [
        [-225, 12],
        [235, 12],
        [155, -18],
        [-195, -18],
      ],
      P.dark,
      P.ink,
      lw
    );

    // Mặt vát lưng sau (Facet 2)
    const bodyFill = opts.highlightFacet === 2 || opts.highlightFacet === 99 ? P.amber : P.olive;
    A.poly(
      c,
      [
        [-210, -8],
        [-30, -56],
        [50, -14],
        [-195, -8],
      ],
      bodyFill,
      P.ink,
      lw
    );

    // Mặt vát mũi trước (Facet 0)
    const noseFill = opts.highlightFacet === 0 || opts.highlightFacet === 99 ? P.amber : P.oliveLight;
    A.poly(
      c,
      [
        [50, -14],
        [115, -42],
        [235, 12],
        [120, 12],
      ],
      noseFill,
      P.ink,
      lw
    );

    // Kính buồng lái vát phẳng (Facet 1)
    const canopyFill =
      opts.highlightFacet === 1 || opts.highlightFacet === 99 || (opts.highlightCockpit ?? 0) > 0.3
        ? P.amber
        : P.glass;
    A.poly(
      c,
      [
        [-30, -56],
        [42, -58],
        [115, -42],
        [50, -14],
      ],
      canopyFill,
      P.ink,
      lw
    );
    // Khung kính buồng lái + viền răng cưa nhỏ
    A.line(c, [[12, -57], [50, -14]], P.ink, lwIn);
    A.line(c, [[68, -52], [85, -14]], P.ink, lwIn);

    // Cửa hút gió lưới chắn (Chevrons/Grille)
    A.poly(c, [[15, -26], [62, -38], [62, -16], [15, -16]], P.slate, P.ink, lwIn);

    // Khe xả dẹt phía đuôi
    A.rrect(c, -230, -10, 28, 12, 2, P.slate, P.ink, lwIn);

    // Đường gờ đa diện đặc trưng
    A.line(c, [[-30, -56], [-125, -8]], P.ink2, lwIn);
    A.line(c, [[50, -14], [235, 12]], P.ink, lwIn);

    // Khoang vũ khí dưới bụng khi mở
    if ((opts.bayOpen ?? 0) > 0.01) {
      const bo = A.clamp01(opts.bayOpen ?? 0);
      A.rrect(c, -55, -4, 110, 18, 2, P.ink, P.ink, lwIn);
      // Cửa khoang mở gập xuống
      A.poly(
        c,
        [
          [-55, 12],
          [55, 12],
          [50, 12 + 28 * bo],
          [-50, 12 + 28 * bo],
        ],
        P.oliveDark,
        P.ink,
        lwIn
      );
      // Quả bom dẫn đường bên trong hoặc đang rơi
      const bd = opts.bombDrop ?? 0;
      const by = 4 + bd * 190;
      c.save();
      c.translate(0, by);
      drawGuidedBomb(c, 0, 0, 0.85, lw);
      c.restore();
    }

    // Cánh lái chỉnh liên tục khi minh họa fly-by-wire
    if (opts.flyByWireActive) {
      const flapAng = Math.sin((opts.fanPhase ?? 0) * 8) * 0.35;
      c.save();
      c.translate(-195, 6);
      c.rotate(flapAng);
      A.rrect(c, -36, -6, 36, 12, 3, P.amber, P.ink, lwIn);
      c.restore();
    }
  } else if (view === 'top') {
    // Góc nhìn thẳng từ trên xuống (mũi hướng sang phải +X)
    // Hình thoi/cánh én góc cạnh với các mép song song chuẩn xác
    const bodyPts: A.Pt[] = [
      [240, 0],     // Mũi nhọn
      [-140, -210], // Mút cánh trái
      [-205, -180], // Mép vát mút cánh trái
      [-150, -55],  // Hốc cánh sau trái
      [-235, -75],  // Đuôi V trái
      [-200, 0],    // Đỉnh khe xả giữa
      [-235, 75],   // Đuôi V phải
      [-150, 55],   // Hốc cánh sau phải
      [-205, 180],  // Mép vát mút cánh phải
      [-140, 210],  // Mút cánh phải
    ];
    A.poly(c, bodyPts, P.olive, P.ink, lw);

    // Các mảng đa diện trên lưng (tạo khối kim cương rõ ràng)
    A.poly(c, [[240, 0], [10, -72], [-150, -55], [-200, 0], [-150, 55], [10, 72]], P.oliveDark, P.ink, lwIn);
    A.poly(c, [[240, 0], [35, -42], [-95, 0], [35, 42]], P.oliveLight, P.ink, lwIn);

    // Kính buồng lái 5 cạnh nhìn từ trên xuống
    A.poly(c, [[105, 0], [52, -32], [5, -24], [5, 24], [52, 32]], P.glass, P.ink, lwIn);
    // Răng cưa viền buồng lái và nắp khoang
    const sawCol = opts.showSawtooth ? P.amber : P.ink2;
    const sawW = opts.showSawtooth ? lw * 1.15 : lwIn;
    A.line(
      c,
      [[-15, -22], [-5, -12], [-15, -4], [-5, 4], [-15, 12], [-5, 22]],
      sawCol,
      sawW
    );
    // Nắp khoang răng cưa trên thân
    A.poly(
      c,
      [
        [-35, -28],
        [-95, -28],
        [-95, 28],
        [-35, 28],
      ],
      opts.showSawtooth ? 'rgba(245,158,11,0.22)' : P.dark,
      sawCol,
      sawW
    );
    A.line(
      c,
      [[-35, -28], [-45, -18], [-35, -9], [-45, 0], [-35, 9], [-45, 18], [-35, 28]],
      sawCol,
      sawW
    );
    A.line(
      c,
      [[-95, -28], [-85, -18], [-95, -9], [-85, 0], [-95, 9], [-85, 18], [-95, 28]],
      sawCol,
      sawW
    );

    // 2 cửa hút gió lưới trên vai
    A.poly(c, [[20, -42], [-15, -62], [-35, -48], [0, -30]], P.slate, P.ink, lwIn);
    A.poly(c, [[20, 42], [-15, 62], [-35, 48], [0, 30]], P.slate, P.ink, lwIn);

    // 2 cánh đuôi V nhìn từ trên
    A.poly(c, [[-145, -35], [-235, -75], [-218, -45], [-145, -18]], P.dark, P.ink, lwIn);
    A.poly(c, [[-145, 35], [-235, 75], [-218, 45], [-145, 18]], P.dark, P.ink, lwIn);

    // Nổi bật các đường mép song song cùng góc nghiêng
    if (opts.showParallelAngles) {
      // Cặp góc 1: Mép cánh trước phải & mép cánh sau trái & mép đuôi
      A.line(c, [[260, 12], [-150, 226]], P.amber, lw * 1.4, [14, 10]);
      A.line(c, [[-130, -200], [-220, -60]], P.amber, lw * 1.4, [14, 10]);
      // Cặp góc 2: Mép cánh trước trái & mép cánh sau phải
      A.line(c, [[260, -12], [-150, -226]], P.sky, lw * 1.4, [14, 10]);
      A.line(c, [[-130, 200], [-220, 60]], P.sky, lw * 1.4, [14, 10]);
    }
  } else if (view === 'cutaway') {
    // Mặt cắt dọc nhìn ngang cho thấy rõ bên trong:
    // 1. Vỏ ngoài đa diện mờ nhẹ để lộ nội thất
    A.poly(
      c,
      [
        [-230, 14],
        [235, 14],
        [115, -44],
        [42, -60],
        [-32, -58],
        [-210, -8],
      ],
      P.paper,
      P.ink,
      lw
    );
    // Cánh đuôi V phía sau
    A.poly(c, [[-210, -8], [-155, -8], [-195, -90], [-232, -84]], P.oliveDark, P.ink, lwIn);

    // 2. Buồng lái + Kính phủ lớp dẫn điện (Coated Cockpit Glass)
    const cpHi = opts.highlightCockpit ?? 0;
    A.poly(
      c,
      [
        [35, -58],
        [115, -44],
        [165, -18],
        [35, -18],
      ],
      cpHi > 0.1 ? 'rgba(245,158,11,0.32)' : P.glass,
      cpHi > 0.1 ? P.amber : P.ink,
      cpHi > 0.1 ? lw * 1.2 : lwIn
    );
    // Ghế phi công & bảng điều khiển
    A.rrect(c, 58, -42, 18, 24, 4, P.slate, P.ink, lwIn);
    A.circle(c, 68, -48, 8, P.skin, P.ink, lwIn);

    // 3. Ống dẫn khí chữ S (S-shaped intake duct) + lớp lót hấp thụ RAM + Cánh quạt nén
    const sdHi = opts.highlightSDuct ?? 0;
    const sDuctPts: A.Pt[] = [
      [35, -18],
      [5, -18],
      [-28, -42],
      [-72, -42],
      [-72, -10],
      [-25, -10],
      [8, 4],
      [35, 4],
    ];
    A.poly(c, sDuctPts, P.bg2, sdHi > 0.1 ? P.amber : P.ink, sdHi > 0.1 ? lw * 1.15 : lwIn);
    // Lớp lót vật liệu hấp thụ dọc thành ống chữ S
    A.line(c, [[32, -16], [5, -16], [-26, -39], [-68, -39]], P.dark, lw * 1.4, [8, 5]);
    A.line(c, [[32, 2], [8, 2], [-24, -12], [-68, -12]], P.dark, lw * 1.4, [8, 5]);

    // Cánh quạt động cơ (Spinning turbine blades) nằm khuất sau khúc cua chữ S
    const fx = -88, fy = -26, fr = 20;
    A.circle(c, fx, fy, fr, P.slate, P.ink, lwIn);
    const fanAng = opts.fanPhase ?? 0;
    for (let i = 0; i < 6; i++) {
      const a = fanAng + (i * Math.PI) / 3;
      A.line(c, [[fx, fy], [fx + Math.cos(a) * (fr - 2), fy + Math.sin(a) * (fr - 2)]], P.white, lwIn);
    }
    A.circle(c, fx, fy, 5, P.ink, null, 0);

    // Thân động cơ & Khe xả dẹt nằm trên lưng (Flattened top exhaust)
    const exHi = opts.highlightExhaust ?? 0;
    A.rrect(c, -155, -42, 65, 32, 4, P.slate, P.ink, lwIn);
    A.poly(
      c,
      [
        [-155, -36],
        [-225, -14],
        [-225, -4],
        [-155, -14],
      ],
      exHi > 0.1 ? P.amber : P.dark,
      P.ink,
      lwIn
    );

    // 4. Khoang nhiên liệu nội thân (Internal fuel)
    if ((opts.highlightFuel ?? 0) > 0.05) {
      A.rrect(c, -145, -8, 62, 18, 3, P.sky, P.ink, lwIn);
    }

    // 5. Khoang vũ khí nội thân dưới bụng (Internal Weapons Bay)
    const bo = A.clamp01(opts.bayOpen ?? 0);
    A.rrect(c, -62, -6, 92, 20, 2, P.bg2, P.ink, lwIn);
    const bd = opts.bombDrop ?? 0;
    c.save();
    c.translate(-16, 4 + bd * 170);
    drawGuidedBomb(c, 0, 0, 0.78, lwIn);
    c.restore();
    if (bo > 0.02) {
      A.line(c, [[-62, 14], [-55, 14 + 26 * bo]], P.ink, lw);
      A.line(c, [[30, 14], [24, 14 + 26 * bo]], P.ink, lw);
    }
  } else if (view === 'front') {
    // Góc nhìn chính diện (Front view): thấy rõ tiết diện hình thoi vát nghiêng
    // Hai cánh đuôi V
    A.poly(c, [[-38, -22], [-95, -92], [-82, -96], [-24, -22]], P.oliveDark, P.ink, lw);
    A.poly(c, [[38, -22], [95, -92], [82, -96], [24, -22]], P.oliveDark, P.ink, lw);
    // Thân và cánh hình tam giác dẹt sắc cạnh
    A.poly(c, [[-230, 16], [0, -28], [230, 16], [0, 22]], P.olive, P.ink, lw);
    // Tháp buồng lái đa diện ở giữa
    A.poly(c, [[-68, -6], [0, -64], [68, -6], [0, 8]], P.oliveLight, P.ink, lw);
    A.poly(c, [[-42, -16], [0, -52], [42, -16]], P.glass, P.ink, lwIn);
    // 2 cửa hút gió lưới hai bên
    A.poly(c, [[-75, -4], [-42, -26], [-32, -8]], P.dark, P.ink, lwIn);
    A.poly(c, [[75, -4], [42, -26], [32, -8]], P.dark, P.ink, lwIn);
  }

  c.restore();
}

export function drawGuidedBomb(c: CanvasRenderingContext2D, x: number, y: number, scale = 1, lw = 3) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  // Thân bom oliveDark + mũi dẫn đường + cánh đuôi
  A.poly(c, [[-36, -7], [22, -7], [38, 0], [22, 7], [-36, 7]], P.oliveDark, P.ink, lw);
  A.poly(c, [[-36, -7], [-46, -15], [-30, -7]], P.slate, P.ink, lw * 0.8);
  A.poly(c, [[-36, 7], [-46, 15], [-30, 7]], P.slate, P.ink, lw * 0.8);
  A.line(c, [[12, -7], [12, 7]], P.amber, lw);
  c.restore();
}

// ── 3. MÁY BAY CÁNH BAY (B-2 Spirit Flying Wing) ──────────────────────────────

export function drawFlyingWing(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  view: 'top' | 'side' = 'top',
  opts: { dir?: 1 | -1; rot?: number; highlightSawtooth?: boolean; highlightCurve?: boolean } = {}
) {
  const dir = opts.dir ?? 1;
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(dir * scale, scale);

  if (view === 'top') {
    // Mép trước cong mượt + mép sau răng cưa chữ W (mũi hướng sang phải +X)
    c.beginPath();
    c.moveTo(165, 0);
    c.bezierCurveTo(135, -55, 20, -175, -75, -245);
    c.lineTo(-125, -210);
    c.lineTo(-75, -135);
    c.lineTo(-135, -75);
    c.lineTo(-85, 0);
    c.lineTo(-135, 75);
    c.lineTo(-75, 135);
    c.lineTo(-125, 210);
    c.lineTo(-75, 245);
    c.bezierCurveTo(20, 175, 135, 55, 165, 0);
    c.closePath();
    A.fs(c, P.oliveDark, P.ink, lw);

    // Phần lưng trung tâm uốn cong mượt (Organic blended body)
    c.beginPath();
    c.moveTo(145, 0);
    c.bezierCurveTo(95, -52, -15, -82, -75, -55);
    c.lineTo(-55, 0);
    c.lineTo(-75, 55);
    c.bezierCurveTo(-15, 82, 95, 52, 145, 0);
    c.closePath();
    A.fs(c, P.olive, P.ink, lwIn);

    // Kính buồng lái đôi uốn cong
    A.poly(c, [[92, -6], [62, -28], [42, -20], [65, -3]], P.glass, P.ink, lwIn);
    A.poly(c, [[92, 6], [62, 28], [42, 20], [65, 3]], P.glass, P.ink, lwIn);

    // Cửa hút gió răng cưa trên lưng
    A.poly(c, [[15, -38], [-15, -58], [-32, -45], [-5, -26]], P.dark, P.ink, lwIn);
    A.poly(c, [[15, 38], [-15, 58], [-32, 45], [-5, 26]], P.dark, P.ink, lwIn);

    // Khe xả trên lưng
    A.rrect(c, -72, -46, 26, 18, 3, P.slate, P.ink, lwIn);
    A.rrect(c, -72, 28, 26, 18, 3, P.slate, P.ink, lwIn);

    if (opts.highlightSawtooth) {
      A.line(
        c,
        [
          [-125, -210],
          [-75, -135],
          [-135, -75],
          [-85, 0],
          [-135, 75],
          [-75, 135],
          [-125, 210],
        ],
        P.amber,
        lw * 1.4
      );
    }
    if (opts.highlightCurve) {
      c.beginPath();
      c.moveTo(165, 0);
      c.bezierCurveTo(135, -55, 20, -175, -75, -245);
      c.moveTo(165, 0);
      c.bezierCurveTo(135, 55, 20, 175, -75, 245);
      A.fs(c, null, P.sky, lw * 1.4);
    }
  } else {
    // Góc nhìn ngang (Side profile): siêu mỏng, uốn cong như cánh chim, hoàn toàn KHÔNG có đuôi đứng
    c.beginPath();
    c.moveTo(210, 8);
    c.bezierCurveTo(155, -22, 85, -48, 10, -46);
    c.bezierCurveTo(-55, -44, -135, -16, -210, 6);
    c.bezierCurveTo(-110, 18, 80, 18, 210, 8);
    c.closePath();
    A.fs(c, P.olive, P.ink, lw);

    // Kính buồng lái mượt
    A.poly(c, [[120, -18], [62, -38], [32, -36], [78, -14]], P.glass, P.ink, lwIn);
    // Cửa hút gió trên lưng & khe xả che kín phía trên
    A.poly(c, [[15, -45], [-30, -34], [-30, -20], [15, -24]], P.dark, P.ink, lwIn);
    A.rrect(c, -175, -14, 42, 8, 3, P.slate, P.ink, lwIn);
  }

  c.restore();
}

// ── 4. MÁY BAY CHIẾN ĐẤU THƯỜNG (Conventional Aircraft) ───────────────────────

export interface ConventionalJetOpts {
  dir?: 1 | -1;
  rot?: number;
  externalWeapons?: boolean;
  highlightWeapons?: boolean;
  highlightTailCorner?: boolean;
  showEngineBlades?: boolean;
  fanPhase?: number;
}

export function drawConventionalJet(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  view: 'side' | 'top' | 'cutaway' = 'side',
  opts: ConventionalJetOpts = {}
) {
  const dir = opts.dir ?? 1;
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(dir * scale, scale);

  if (view === 'side' || view === 'cutaway') {
    // Cánh đuôi đứng lớn vuông góc (Vertical Tail Fin)
    const tailCol = opts.highlightTailCorner ? P.enemy : P.slate;
    A.poly(c, [[-215, -14], [-135, -14], [-175, -118], [-228, -112]], tailCol, P.ink, lw);

    // Thân máy bay tròn khí động học
    c.beginPath();
    c.moveTo(235, 0);
    c.bezierCurveTo(175, -28, 70, -34, -215, -20);
    c.lineTo(-225, 16);
    c.bezierCurveTo(60, 24, 175, 20, 235, 0);
    c.closePath();
    A.fs(c, view === 'cutaway' ? P.paper : P.slate, P.ink, lw);

    // Buồng lái giọt nước (Bubble canopy)
    c.beginPath();
    c.moveTo(135, -18);
    c.bezierCurveTo(105, -56, 35, -56, 5, -24);
    c.closePath();
    A.fs(c, P.glass, P.ink, lwIn);

    // Cửa hút gió thẳng (Straight intake) làm lộ cánh quạt nén
    if (view === 'cutaway' || opts.showEngineBlades) {
      A.rrect(c, -95, -16, 155, 28, 4, P.bg2, P.ink, lwIn);
      const fx = -45, fy = -2, fr = 18;
      A.circle(c, fx, fy, fr, P.enemyLight, P.ink, lwIn);
      const fa = opts.fanPhase ?? 0;
      for (let i = 0; i < 6; i++) {
        const a = fa + (i * Math.PI) / 3;
        A.line(c, [[fx, fy], [fx + Math.cos(a) * (fr - 2), fy + Math.sin(a) * (fr - 2)]], P.ink, lwIn);
      }
    } else {
      // Cánh chính
      A.poly(c, [[25, 4], [-85, 4], [-115, 18], [-15, 18]], P.dark, P.ink, lwIn);
    }

    // Loa phụt động cơ lộ phía sau
    A.poly(c, [[-215, -16], [-242, -12], [-242, 12], [-215, 14]], P.dark, P.ink, lwIn);

    // Vũ khí treo ngoài dưới cánh (External pylons & missiles/bombs)
    if (opts.externalWeapons !== false) {
      const wCol = opts.highlightWeapons ? P.enemy : P.oliveDark;
      // Giá treo 1 + Tên lửa
      A.rrect(c, -20, 14, 14, 16, 2, P.slate, P.ink, lwIn);
      A.poly(c, [[-65, 30], [35, 30], [52, 35], [35, 40], [-65, 40]], wCol, P.ink, lwIn);
      // Giá treo 2 + Bom/Thùng dầu phụ
      A.rrect(c, -78, 14, 14, 22, 2, P.slate, P.ink, lwIn);
      A.poly(c, [[-118, 36], [-32, 36], [-16, 44], [-32, 52], [-118, 52]], wCol, P.ink, lwIn);
    }
  } else {
    // Góc nhìn từ trên xuống (Top view)
    // Cánh chính và cánh ngang đuôi
    A.poly(
      c,
      [
        [65, -24],
        [-55, -195],
        [-105, -185],
        [-65, -24],
        [-165, -24],
        [-210, -88],
        [-232, -80],
        [-205, 0],
        [-232, 80],
        [-210, 88],
        [-165, 24],
        [-65, 24],
        [-105, 185],
        [-55, 195],
        [65, 24],
      ],
      P.slate,
      P.ink,
      lw
    );
    // Thân tròn dài
    A.ellipse(c, 10, 0, 220, 26, 0, P.light, P.ink, lw);
    A.ellipse(c, 75, 0, 48, 14, 0, P.glass, P.ink, lwIn);

    // Cánh đuôi đứng tạo góc vuông 90° (Corner reflector) với cánh đuôi ngang
    const finCol = opts.highlightTailCorner ? P.enemy : P.dark;
    A.rrect(c, -225, -7, 85, 14, 4, finCol, P.ink, lw);
    if (opts.highlightTailCorner) {
      // Ký hiệu góc vuông 90° ở đuôi
      A.poly(c, [[-175, -7], [-175, -34], [-148, -34], [-148, -7]], 'rgba(180,73,60,0.28)', P.enemy, lwIn);
    }
  }

  c.restore();
}

// ── 5. ĐÀI RADAR PHÒNG KHÔNG, TRẠM THU THỤ ĐỘNG & KHẨU ĐỘI TÊN LỬA SAM ────────

export function drawRadarStation(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  view: 'side' | 'top' = 'side',
  opts: { dishAngle?: number; vhfMode?: boolean; alert?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;
  const ang = opts.dishAngle ?? -0.55;

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  if (view === 'side') {
    // Xe/Bệ đài radar mặt đất (gốc y=0 tại mặt đất)
    A.rrect(c, -75, -48, 150, 36, 6, P.enemy, P.ink, lw);
    A.rrect(c, -58, -40, 42, 20, 3, P.glass, P.ink, lwIn);
    // Bánh xe
    A.circle(c, -45, -12, 14, P.dark, P.ink, lw);
    A.circle(c, 0, -12, 14, P.dark, P.ink, lw);
    A.circle(c, 45, -12, 14, P.dark, P.ink, lw);
    // Trụ xoay ăng-ten
    A.rrect(c, -16, -92, 32, 46, 4, P.slate, P.ink, lw);

    c.save();
    c.translate(0, -96);
    c.rotate(ang);
    if (opts.vhfMode) {
      // Ăng-ten VHF bước sóng dài (giàn chấn tử lớn đặt cao trên trụ)
      A.line(c, [[0, -96], [0, 8]], P.ink, lw * 1.1);
      for (let wy = -88; wy <= -4; wy += 28) {
        A.line(c, [[-30, wy], [30, wy]], P.enemyLight, lw);
      }
    } else {
      // Chảo parabol hướng chùm tia theo trục -X (khi ang=0 nhìn sang trái)
      c.beginPath();
      c.arc(14, 0, 56, Math.PI * 0.58, Math.PI * 1.42);
      A.fs(c, P.enemyLight, P.ink, lw * 1.2);
      // Kim thu phát (Feed horn)
      A.line(c, [[-18, 0], [-52, 0]], P.ink, lw);
      A.circle(c, -54, 0, 7, opts.alert ? P.amber : P.enemy, P.ink, lwIn);
    }
    c.restore();
  } else {
    // Góc nhìn từ trên xuống (Top view)
    if ((opts.alert ?? 0) > 0.05) {
      A.circle(c, 0, 0, 58 + (opts.alert ?? 0) * 18, 'rgba(180,73,60,0.22)', P.enemy, lwIn);
    }
    A.rrect(c, -42, -32, 84, 64, 10, P.enemy, P.ink, lw);
    A.circle(c, 0, 0, 26, P.enemyLight, P.ink, lwIn);
    c.save();
    c.rotate(ang);
    // Thanh ăng-ten xoay
    A.rrect(c, -8, -48, 16, 96, 5, P.white, P.ink, lw);
    A.line(c, [[0, 0], [34, 0]], P.ink, lw);
    A.circle(c, 34, 0, 6, P.amber, P.ink, lwIn);
    c.restore();
  }

  c.restore();
}

/** Trạm thu radar thụ động (Passive receiver site cho mạng lưới đa điểm) */
export function drawPassiveReceiver(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  view: 'top' | 'side' = 'top',
  opts: { active?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  if (view === 'top') {
    if ((opts.active ?? 0) > 0.05) {
      A.circle(c, 0, 0, 44, 'rgba(245,158,11,0.25)', P.amber, lwIn);
    }
    A.poly(c, [[0, -32], [28, 20], [-28, 20]], P.enemyLight, P.ink, lw);
    A.circle(c, 0, 2, 11, (opts.active ?? 0) > 0.1 ? P.amber : P.enemy, P.ink, lwIn);
  } else {
    A.rrect(c, -28, -28, 56, 28, 4, P.enemyLight, P.ink, lw);
    A.line(c, [[0, -28], [0, -82]], P.ink, lw);
    A.circle(c, 0, -86, 9, (opts.active ?? 0) > 0.1 ? P.amber : P.enemy, P.ink, lwIn);
  }
  c.restore();
}

/** Bệ phóng tên lửa phòng không SAM (SA-3 / S-125) */
export function drawSamBattery(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  view: 'side' | 'top' = 'side',
  opts: { railAngle?: number; missiles?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;
  const missiles = opts.missiles ?? 2;

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  if (view === 'side') {
    // Đế bệ phóng trên mặt đất
    A.poly(c, [[-68, 0], [68, 0], [52, -24], [-52, -24]], P.enemy, P.ink, lw);
    A.circle(c, -38, -8, 12, P.dark, P.ink, lwIn);
    A.circle(c, 38, -8, 12, P.dark, P.ink, lwIn);
    A.rrect(c, -18, -54, 36, 32, 4, P.slate, P.ink, lw);

    c.save();
    c.translate(0, -54);
    c.rotate(opts.railAngle ?? -0.65);
    // Giá phóng nghiêng
    A.rrect(c, -55, -8, 110, 14, 3, P.dark, P.ink, lw);
    if (missiles >= 1) {
      drawSamMissile(c, -8, -18, 0.9, 0, { inFlight: false });
    }
    if (missiles >= 2) {
      drawSamMissile(c, 4, -32, 0.9, 0, { inFlight: false });
    }
    c.restore();
  } else {
    A.rrect(c, -36, -36, 72, 72, 8, P.enemy, P.ink, lw);
    c.save();
    c.rotate(opts.railAngle ?? -1.2);
    A.rrect(c, -38, -18, 76, 12, 3, P.white, P.ink, lwIn);
    A.rrect(c, -38, 6, 76, 12, 3, P.white, P.ink, lwIn);
    c.restore();
  }

  c.restore();
}

export function drawSamMissile(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  ang = 0,
  opts: { inFlight?: boolean } = {}
) {
  const lw = A.px(c, LINE.inner) / scale;
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(scale, scale);

  if (opts.inFlight) {
    // Luồng lửa tên lửa
    A.poly(c, [[-48, -6], [-95, 0], [-48, 6]], P.amber, null, 0);
    A.poly(c, [[-48, -4], [-72, 0], [-48, 4]], P.white, null, 0);
  }
  // Thân tên lửa trắng-đỏ
  A.poly(c, [[-48, -7], [32, -7], [52, 0], [32, 7], [-48, 7]], P.white, P.ink, lw);
  A.poly(c, [[12, -7], [32, -7], [52, 0], [32, 7], [12, 7]], P.enemy, P.ink, lw);
  // Cánh đuôi
  A.poly(c, [[-48, -7], [-58, -18], [-34, -7]], P.enemy, P.ink, lw);
  A.poly(c, [[-48, 7], [-58, 18], [-34, 7]], P.enemy, P.ink, lw);
  c.restore();
}

// ── 6. MÁY TÍNH 1970s, THƯỚC KẺ & LỚP VỎ RAM CẬN CẢNH ────────────────────────

export function drawComputer1970s(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { tapeAngle?: number; overload?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;
  const ta = opts.tapeAngle ?? 0;
  const ov = A.clamp01(opts.overload ?? 0);

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Tủ máy tính Mainframe 1970s
  A.rrect(c, -115, -185, 230, 370, 10, P.sand, P.ink, lw);
  A.rrect(c, -98, -168, 196, 155, 6, P.dark, P.ink, lwIn);

  // 2 cuộn băng từ tròn (Magnetic tape reels)
  for (const rx of [-48, 48]) {
    A.circle(c, rx, -90, 40, P.paper, P.ink, lwIn);
    A.circle(c, rx, -90, 12, P.slate, P.ink, lwIn);
    for (let i = 0; i < 3; i++) {
      const a = ta + (i * Math.PI * 2) / 3;
      A.line(c, [[rx + Math.cos(a) * 14, -90 + Math.sin(a) * 14], [rx + Math.cos(a) * 34, -90 + Math.sin(a) * 34]], P.ink, lwIn);
    }
  }

  // Màn hình CRT / Đồng hồ tải tính toán
  A.rrect(c, -98, 4, 196, 86, 6, ov > 0.5 ? 'rgba(180,73,60,0.22)' : P.bg, P.ink, lwIn);
  // Thanh tải (Load meter)
  A.rrect(c, -80, 26, 160, 22, 6, P.white, P.ink, lwIn);
  const barCol = ov > 0.6 ? P.enemy : P.olive;
  A.rrect(c, -77, 29, Math.max(12, 154 * (0.28 + 0.72 * ov)), 16, 4, barCol, null, 0);

  // Dãy đèn nhấp nháy
  for (let i = 0; i < 6; i++) {
    const lx = -75 + i * 30;
    const col = ov > 0.5 ? (i % 2 === 0 ? P.enemy : P.amber) : i < 3 ? P.olive : P.sky;
    A.circle(c, lx, 68, 6, col, P.ink, lwIn * 0.8);
  }

  // Bảng nút bấm dưới
  A.rrect(c, -98, 106, 196, 58, 4, P.slate, P.ink, lwIn);
  c.restore();
}

export function drawRuler(c: CanvasRenderingContext2D, x: number, y: number, len = 360, ang = 0) {
  const lw = A.px(c, LINE.outer);
  const lwIn = A.px(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  A.rrect(c, -len / 2, -22, len, 44, 4, P.amber, P.ink, lw);
  const ticks = Math.floor(len / 24);
  for (let i = 1; i < ticks; i++) {
    const tx = -len / 2 + i * 24;
    const th = i % 5 === 0 ? 20 : 11;
    A.line(c, [[tx, -22], [tx, -22 + th]], P.ink, lwIn);
  }
  c.restore();
}

/** Mặt cắt cận cảnh lớp phủ hấp thụ sóng (RAM Coating Cutaway) */
export function drawRamCutaway(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { waveProgress?: number; heatGlow?: number; damage?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;
  const heat = A.clamp01(opts.heatGlow ?? 0);
  const dmg = A.clamp01(opts.damage ?? 0);

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Lớp khung kim loại bên dưới (Metal airframe substrate)
  A.rrect(c, -320, 60, 640, 90, 6, P.slate, P.ink, lw);
  // Đinh tán khung kim loại
  for (let rx = -260; rx <= 260; rx += 104) {
    A.circle(c, rx, 105, 8, P.light, P.ink, lwIn);
  }

  // Lớp phủ gạch/sơn RAM bên trên (chứa các hạt vi mô hấp thụ sóng)
  A.rrect(c, -320, -60, 640, 120, 6, P.dark, P.ink, lw);

  // Vết nứt / bong tróc lớp phủ do mưa cát (nếu damage > 0)
  if (dmg > 0.05) {
    A.poly(
      c,
      [
        [-55 * dmg, -60],
        [65 * dmg, -60],
        [38 * dmg, 60],
        [-32 * dmg, 60],
      ],
      P.bg,
      P.enemy,
      lw
    );
  }

  // Các hạt vi mô (Tiny particles) chuyển hóa sóng điện từ thành nhiệt
  const pCols = [-250, -180, -110, -40, 40, 110, 180, 250];
  const pRows = [-28, 18];
  for (const py of pRows) {
    for (const px of pCols) {
      if (dmg > 0.2 && Math.abs(px) < 55 * dmg) continue;
      const pCol = heat > 0.1 ? A.lerpColor(P.oliveLight, P.amber, heat) : P.oliveLight;
      A.circle(c, px, py, 12 + heat * 4, pCol, P.ink, lwIn);
      if (heat > 0.25) {
        A.circle(c, px, py, 22 * heat, 'rgba(245,158,11,0.28)', null, 0);
      }
    }
  }

  c.restore();
}

/** Thợ kỹ thuật bảo dưỡng lớp vỏ máy bay tàng hình */
export function drawMechanicCrew(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { armPhase?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;
  const arm = Math.sin(opts.armPhase ?? 0) * 14;

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Giàn giáo kỹ thuật
  A.line(c, [[-48, 0], [-48, -135]], P.slate, lw);
  A.line(c, [[48, 0], [48, -135]], P.slate, lw);
  A.line(c, [[-56, -75], [56, -75]], P.slate, lw);

  // Người thợ đứng trên bệ (-75)
  A.capsule(c, [-12, -75], [-10, -115], 12, P.oliveDark, P.ink, lwIn);
  A.capsule(c, [12, -75], [10, -115], 12, P.oliveDark, P.ink, lwIn);
  A.rrect(c, -18, -162, 36, 50, 10, P.olive, P.ink, lw);
  A.circle(c, 0, -178, 14, P.skin, P.ink, lw);
  // Mũ bảo hộ
  A.poly(c, [[-16, -182], [18, -182], [14, -196], [-14, -196]], P.amber, P.ink, lwIn);
  // Tay cầm dụng cụ trám vỏ RAM
  A.capsule(c, [12, -150], [42 + arm, -168 - arm * 0.5], 10, P.olive, P.ink, lwIn);
  A.rrect(c, 38 + arm, -178 - arm * 0.5, 22, 12, 3, P.amber, P.ink, lwIn);

  c.restore();
}

// ── 7. TIA SÓNG RADAR & BỐI CẢNH SO SÁNH RCS (Viên bi, Con chim, Quả bóng golf) ─

export function drawRcsObjects(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { showMarble?: number; showBird?: number; showGolf?: number } = {}
) {
  const lw = A.px(c, LINE.outer) / scale;
  const lwIn = A.px(c, LINE.inner) / scale;

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // 1. Viên bi (Marble)
  if ((opts.showMarble ?? 0) > 0.01) {
    A.withA(c, opts.showMarble ?? 1, () => {
      A.circle(c, -180, 0, 26, P.sky, P.ink, lw);
      A.circle(c, -188, -8, 8, P.white, null, 0);
    });
  }
  // 2. Con chim (Bird)
  if ((opts.showBird ?? 0) > 0.01) {
    A.withA(c, opts.showBird ?? 1, () => {
      A.poly(
        c,
        [
          [-35, 4],
          [-8, -18],
          [22, -6],
          [38, -2],
          [18, 12],
          [-18, 14],
        ],
        P.oliveLight,
        P.ink,
        lw
      );
      A.poly(c, [[-5, -6], [-22, -36], [12, -12]], P.olive, P.ink, lwIn);
    });
  }
  // 3. Quả bóng golf (Golf ball)
  if ((opts.showGolf ?? 0) > 0.01) {
    A.withA(c, opts.showGolf ?? 1, () => {
      A.circle(c, 180, 0, 32, P.white, P.ink, lw);
      for (const [dx, dy] of [[-10, -10], [8, -12], [0, 4], [-12, 10], [12, 8]] as const) {
        A.circle(c, 180 + dx, dy, 3.5, P.light, null, 0);
      }
    });
  }

  c.restore();
}

/** Vẽ chùm sóng radar hoặc tia phản xạ có đầu sóng dễ đọc */
export function drawRadarWave(
  c: CanvasRenderingContext2D,
  a: A.Pt,
  b: A.Pt,
  p: number,
  opts: {
    color?: string;
    w?: number;
    wavelength?: number; // >0 thì vẽ gợn sóng hình sin theo bước sóng
    amp?: number;
    arrow?: boolean;
    dashed?: boolean;
  } = {}
) {
  if (p <= 0.001) return;
  const q = A.clamp01(p);
  const col = opts.color ?? P.sky;
  const w = opts.w ?? A.px(c, 4);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) * q;
  const ang = Math.atan2(dy, dx);

  c.save();
  c.translate(a[0], a[1]);
  c.rotate(ang);

  if (opts.wavelength && opts.wavelength > 0) {
    const wl = opts.wavelength;
    const amp = opts.amp ?? 14;
    const steps = Math.max(16, Math.floor(len / 6));
    const pts: A.Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const sx = (i / steps) * len;
      const sy = Math.sin((sx / wl) * Math.PI * 2) * amp;
      pts.push([sx, sy]);
    }
    A.line(c, pts, col, w);
  } else {
    A.line(c, [[0, 0], [len, 0]], col, w, opts.dashed ? [w * 3, w * 2] : undefined);
  }

  if (opts.arrow !== false && len > 24) {
    const hs = w * 3.8;
    A.poly(c, [[len, 0], [len - hs, -hs * 0.62], [len - hs, hs * 0.62]], col, null, 0);
  }
  c.restore();
}
