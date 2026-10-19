// scenes/_assets.ts — Toàn bộ vật thể và môi trường cho war_16 (vẽ 1 lần, dùng xuyên suốt 6 chương).
// Tuân thủ code-video-2d: đường bao rõ (LINE.outer = 4, LINE.inner = 2.25), bảng màu P từ ./shared/palette.
import * as A from './shared/art';
import * as F from './shared/fx';
import { P, LINE } from './shared/palette';

export type ViewAngle = 'side' | 'cutaway' | 'top' | 'rear';

// ── Helper nét chuẩn giữ độ dày theo pixel màn hình hoặc world ──────
const lw = (c: CanvasRenderingContext2D, base: number) => Math.max(1.2, A.px(c, base));

// ── 1. NGƯỜI LÍNH (Bộ binh ta & đối phương, mọi góc nhìn) ──────────
export interface SoldierOpts {
  view?: 'side_stand' | 'side_run' | 'side_crouch' | 'side_seat' | 'rear_seat' | 'top';
  team?: 'ally' | 'enemy';
  weapon?: 'rifle' | 'rpg' | 'mg' | 'none';
  facing?: 1 | -1;
  walkPhase?: number;
  firing?: number; // 0..1
  downed?: number; // 0..1 (ngã gục)
  scale?: number;
}

export function drawSoldier(c: CanvasRenderingContext2D, x: number, y: number, opts: SoldierOpts = {}) {
  const {
    view = 'side_stand',
    team = 'ally',
    weapon = 'rifle',
    facing = 1,
    walkPhase = 0,
    firing = 0,
    downed = 0,
    scale = 1,
  } = opts;

  const bodyCol = team === 'ally' ? P.olive : P.enemy;
  const darkCol = team === 'ally' ? P.oliveDark : '#7f2e26';
  const helmCol = team === 'ally' ? P.oliveLight : P.enemyLight;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  if (view === 'top') {
    c.rotate(facing === 1 ? 0 : Math.PI);
    // Vai
    A.rrect(c, -14, -22, 28, 44, 12, bodyCol, P.ink, outW);
    // Ba lô
    A.rrect(c, -22, -14, 10, 28, 4, darkCol, P.ink, inW);
    // Súng hướng về trước (+x)
    if (weapon !== 'none') {
      const gunLen = weapon === 'rpg' ? 38 : weapon === 'mg' ? 34 : 28;
      A.capsule(c, [4, 8], [gunLen, 4], 6, P.dark, P.ink, inW);
      if (weapon === 'rpg') {
        A.poly(c, [[gunLen, 4], [gunLen + 10, -2], [gunLen + 14, 4], [gunLen + 10, 10]], P.amber, P.ink, inW);
      }
      if (firing > 0) {
        F.muzzleFlash(c, gunLen + 4, 4, 0, firing, 0.45, inW);
      }
    }
    // Mũ sắt chính giữa
    A.circle(c, 2, 0, 13, helmCol, P.ink, outW);
    c.restore();
    return;
  }

  if (view === 'rear_seat') {
    // Nhìn dọc khoang: lính ngồi trên ghế treo hướng vào tâm khoang (facing = 1 nhìn sang phải, -1 nhìn sang trái)
    c.scale(facing, 1);
    // Đùi và chân co (không chạm sàn)
    A.capsule(c, [-6, 0], [18, 4], 14, darkCol, P.ink, outW);
    A.capsule(c, [18, 4], [20, 32], 12, bodyCol, P.ink, outW);
    // Giày
    A.rrect(c, 14, 30, 16, 9, 3, P.dark, P.ink, inW);
    // Thân trên
    A.rrect(c, -16, -42, 24, 44, 8, bodyCol, P.ink, outW);
    // Dây đai an toàn trên ghế treo
    A.line(c, [[-10, -40], [4, -4]], P.sand, inW);
    // Tay ôm súng trường dựng đứng
    A.capsule(c, [-2, -28], [14, -14], 9, bodyCol, P.ink, inW);
    A.line(c, [[12, -46], [12, 6]], P.dark, outW);
    // Đầu + mũ
    A.circle(c, -2, -54, 11, P.skin, P.ink, outW);
    A.path(c, [[-15, -54], [-12, -68], [10, -68], [13, -52]], true);
    A.fs(c, helmCol, P.ink, outW);
    c.restore();
    return;
  }

  // Các góc nhìn ngang (side_*)
  c.scale(facing, 1);
  if (downed > 0) {
    c.rotate(A.lerp(0, Math.PI * 0.46, downed));
  }

  if (view === 'side_seat') {
    // Ngồi trong khoang xe: bàn chân tại y = 0 (trên sàn khoang), đùi ngang tại y = -18
    A.capsule(c, [-4, -20], [15, -18], 11, darkCol, P.ink, outW);
    A.capsule(c, [15, -18], [16, -2], 10, bodyCol, P.ink, outW);
    A.rrect(c, -12, -50, 20, 34, 7, bodyCol, P.ink, outW);
    A.circle(c, 0, -61, 10, P.skin, P.ink, outW);
    A.path(c, [[-12, -61], [-9, -73], [10, -73], [12, -59]], true);
    A.fs(c, helmCol, P.ink, outW);
    if (weapon !== 'none') {
      A.capsule(c, [0, -38], [18, -32], 8, bodyCol, P.ink, inW);
      A.line(c, [[8, -36], [36, -36]], P.dark, outW);
    }
    c.restore();
    return;
  }

  const crouch = view === 'side_crouch' ? 1 : 0;
  const stride = view === 'side_run' ? Math.sin(walkPhase * Math.PI * 2) * 14 : 0;
  const hipY = crouch ? -26 : -36;
  const torsoH = crouch ? 30 : 36;

  // Chân sau
  A.capsule(c, [-2, hipY], [-8 - stride, -16], 11, darkCol, P.ink, outW);
  A.capsule(c, [-8 - stride, -16], [-10 - stride * 1.1, -3], 10, darkCol, P.ink, outW);
  // Chân trước
  A.capsule(c, [2, hipY], [10 + stride, -16], 11, bodyCol, P.ink, outW);
  A.capsule(c, [10 + stride, -16], [8 + stride * 1.1, -3], 10, bodyCol, P.ink, outW);

  // Ba lô
  A.rrect(c, -19, hipY - torsoH + 4, 11, 24, 4, darkCol, P.ink, inW);
  // Thân áo giáp
  A.rrect(c, -10, hipY - torsoH, 22, torsoH + 4, 7, bodyCol, P.ink, outW);

  // Đầu & mũ sắt
  const headY = hipY - torsoH - 11;
  A.circle(c, 2, headY, 10, P.skin, P.ink, outW);
  A.path(c, [[-10, headY], [-8, headY - 12], [11, headY - 12], [14, headY + 1]], true);
  A.fs(c, helmCol, P.ink, outW);

  // Vũ khí & tay
  const shY = hipY - torsoH + 10;
  if (weapon === 'rpg') {
    A.line(c, [[-14, shY - 4], [28, shY - 6]], P.dark, outW * 1.3);
    A.poly(c, [[28, shY - 6], [40, shY - 13], [48, shY - 6], [40, shY + 1]], P.amber, P.ink, inW);
    A.capsule(c, [0, shY], [16, shY - 4], 9, bodyCol, P.ink, inW);
  } else if (weapon !== 'none') {
    const gunLen = weapon === 'mg' ? 40 : 32;
    A.line(c, [[2, shY + 2], [2 + gunLen, shY]], P.dark, outW * 1.15);
    A.capsule(c, [-2, shY], [14, shY + 3], 9, bodyCol, P.ink, inW);
    if (firing > 0) {
      F.muzzleFlash(c, 4 + gunLen, shY, 0, firing, 0.5, inW);
    }
  }

  c.restore();
}

// ── 2. BMP-1 (1966) — Mũi nhọn, thân thấp, 4 lỗ bắn sườn, cửa hậu chứa dầu ──
export interface BMP1Opts {
  view?: 'side' | 'cutaway' | 'top';
  facing?: 1 | -1;
  scale?: number;
  wheelRot?: number;
  pitch?: number; // độ chúc mũi/xóc (radian)
  firingPorts?: number; // 0..1: súng thò qua lỗ bắn & khạc lửa
  portsWelded?: number; // 0..1: hàn bít các lỗ bắn
  airFilter?: number; // 0..1: hệ thống lọc khí áp suất dương
  fumes?: number; // 0..1: vỏ đạn và khói thuốc súng trong khoang
  turretFire?: number; // 0..1: pháo 73mm bắn
  turretAng?: number; // góc xoay tháp pháo ở góc top
  doorOpen?: number; // 0..1: mở 2 cánh cửa hậu ở góc top
  showFuelDoors?: number; // 0..1: lộ nhiên liệu vàng cam trong cửa hậu rỗng
  hullPierced?: number; // 0..1: bị súng máy/RPG bắn thủng sườn mỏng
}

export function drawBMP1(c: CanvasRenderingContext2D, x: number, y: number, opts: BMP1Opts = {}) {
  const {
    view = 'side',
    facing = 1,
    scale = 1,
    wheelRot = 0,
    pitch = 0,
    firingPorts = 0,
    portsWelded = 0,
    airFilter = 0,
    fumes = 0,
    turretFire = 0,
    turretAng = 0,
    doorOpen = 0,
    showFuelDoors = 0,
    hullPierced = 0,
  } = opts;

  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(facing * scale, scale);
  if (pitch) c.rotate(pitch);

  if (view === 'top') {
    // ── GÓC NHÌN TỪ TRÊN XUỐNG (TOP-DOWN) CỦA BMP-1 ──
    // Hai băng xích hai bên
    A.rrect(c, -220, -108, 430, 24, 6, P.dark, P.ink, outW);
    A.rrect(c, -220, 84, 430, 24, 6, P.dark, P.ink, outW);

    // Thân chính mũi vát nhọn (pike nose)
    A.poly(
      c,
      [
        [-225, -92],
        [155, -92],
        [245, 0],
        [155, 92],
        [-225, 92],
      ],
      P.olive,
      P.ink,
      outW
    );

    // Gân sóng trên mũi và lưới tản nhiệt động cơ phía trước bên phải
    for (let i = -3; i <= 3; i++) {
      A.line(c, [[120, i * 18], [195, i * 14]], P.oliveDark, inW);
    }
    A.rrect(c, 55, 10, 82, 62, 6, P.oliveDark, P.ink, inW); // Khoang động cơ lệch phải
    A.circle(c, 85, -45, 18, P.oliveLight, P.ink, inW); // Nắp lái xe bên trái

    // Nếu hiển thị bên trong khoang sau (khi nói về cửa hậu chứa nhiên liệu và lính tựa lưng)
    if (showFuelDoors > 0.01) {
      A.withA(c, showFuelDoors, () => {
        // Khoang lính mở nóc
        A.rrect(c, -210, -76, 170, 152, 8, P.paper, P.ink, inW);
        // Băng ghế giữa cho lính ngồi quay lưng vào nhau
        A.rrect(c, -195, -22, 135, 44, 6, P.sand, P.ink, inW);
        // 6 mũ lính ngồi sát cửa hậu
        for (const lx of [-175, -135, -95]) {
          A.circle(c, lx, -42, 14, P.oliveLight, P.ink, inW);
          A.circle(c, lx, 42, 14, P.oliveLight, P.ink, inW);
        }
      });
    } else {
      // 4 nắp mở trên nóc khoang sau
      A.rrect(c, -195, -66, 56, 48, 5, P.oliveLight, P.ink, inW);
      A.rrect(c, -125, -66, 56, 48, 5, P.oliveLight, P.ink, inW);
      A.rrect(c, -195, 18, 56, 48, 5, P.oliveLight, P.ink, inW);
      A.rrect(c, -125, 18, 56, 48, 5, P.oliveLight, P.ink, inW);
    }

    // Hai cánh cửa hậu rỗng chứa nhiên liệu ở đuôi xe (x = -225) mở ra phía sau (-x)
    for (const side of [-1, 1] as const) {
      c.save();
      c.translate(-225, side * 80);
      c.rotate(-side * doorOpen * 1.25);
      // Cánh cửa bầu dục dày chứa bình xăng
      const doorFill = showFuelDoors > 0.05 ? P.amber : P.oliveDark;
      A.rrect(c, -22, side === -1 ? 0 : -74, 24, 74, 10, doorFill, P.ink, outW);
      if (showFuelDoors > 0.05) {
        // Sóng chất lỏng nhiên liệu bên trong cánh cửa rỗng
        A.rrect(c, -17, side === -1 ? 6 : -68, 14, 62, 6, '#fde68a', P.ink, inW);
      }
      c.restore();
    }

    // Súng trường thò ra từ 4 lỗ bắn mỗi bên sườn
    if (firingPorts > 0.01 && portsWelded < 0.5) {
      const portXs = [-180, -135, -90, -45];
      portXs.forEach((px, idx) => {
        for (const side of [-1, 1] as const) {
          const py = side * 92;
          const ang = side * 0.42 - 0.15;
          const gx = px + Math.cos(ang) * 32 * firingPorts;
          const gy = py + Math.sin(ang) * 32 * firingPorts;
          A.line(c, [[px, py], [gx, gy]], P.dark, outW);
          const fPhase = ((wheelRot * 2 + idx * 0.27 + (side > 0 ? 0.13 : 0)) % 1 + 1) % 1;
          if (firingPorts > 0.5 && fPhase < 0.35) {
            F.muzzleFlash(c, gx, gy, ang, fPhase / 0.35, 0.45, inW);
          }
        }
      });
    }

    // Tháp pháo nón cụt đặt giữa xe
    c.save();
    c.translate(-10, 0);
    c.rotate(turretAng);
    A.circle(c, 0, 0, 56, P.oliveLight, P.ink, outW);
    A.circle(c, -8, -14, 18, P.olive, P.ink, inW);
    // Nòng pháo 73mm Grom + tên lửa Malyutka trên ray
    A.rrect(c, 45, -7, 115, 14, 4, P.dark, P.ink, outW);
    A.poly(c, [[75, -20], [115, -14], [115, 14], [75, 20]], P.enemy, P.ink, inW);
    if (turretFire > 0) {
      F.muzzleFlash(c, 164, 0, 0, turretFire, 0.85, outW);
    }
    c.restore();

    c.restore();
    return;
  }

  // ── GÓC NHÌN NGANG (SIDE) & MẶT CẮT NGANG (CUTAWAY) CỦA BMP-1 ──
  // Hệ quy chiếu mặt đất y = 0, tâm xe ngang x = 0, tổng chiều dài ~500px (-240..+260)
  // 1. Hệ thống bánh xích (6 bánh chịu nặng + bánh chủ động trước + bánh hướng sau)
  A.rrect(c, -232, -62, 468, 60, 28, P.dark, P.ink, outW);
  A.rrect(c, -222, -54, 448, 44, 22, P.slate, P.ink, inW);

  const wheelXs = [-172, -110, -48, 14, 76, 138];
  for (const wx of wheelXs) {
    A.circle(c, wx, -26, 23, P.oliveDark, P.ink, outW);
    A.circle(c, wx, -26, 10, P.oliveLight, P.ink, inW);
    const a = wheelRot;
    A.line(c, [[wx - Math.cos(a) * 16, -26 - Math.sin(a) * 16], [wx + Math.cos(a) * 16, -26 + Math.sin(a) * 16]], P.ink, inW);
  }
  // Bánh chủ động phía mũi (x = 198, y = -40) và bánh căng xích phía đuôi (x = -205, y = -38)
  A.circle(c, 198, -40, 18, P.oliveDark, P.ink, outW);
  A.circle(c, -205, -38, 17, P.oliveDark, P.ink, outW);

  // 2. Thân xe thấp dẹt với mũi nhọn đặc trưng (Pike Nose)
  const hullPts: A.Pt[] = [
    [-238, -52],
    [-226, -122],
    [135, -122],
    [258, -76],
    [206, -46],
    [-238, -46],
  ];
  A.poly(c, hullPts, P.olive, P.ink, outW);

  // Váy chắn bùn có gân dọc thân
  A.poly(
    c,
    [
      [-236, -54],
      [216, -54],
      [246, -68],
      [-232, -64],
    ],
    P.oliveDark,
    P.ink,
    inW
  );

  // 3. Tháp pháo nón cụt thấp trên nóc
  A.poly(
    c,
    [
      [-68, -122],
      [-42, -162],
      [48, -162],
      [78, -122],
    ],
    P.oliveLight,
    P.ink,
    outW
  );
  // Nòng pháo 73mm + bệ phóng tên lửa Malyutka trên lưng nòng
  A.rrect(c, 68, -148, 118, 11, 3, P.dark, P.ink, outW);
  A.line(c, [[82, -158], [134, -158]], P.ink, inW);
  A.poly(c, [[94, -166], [138, -162], [138, -154], [94, -150]], P.enemy, P.ink, inW);
  if (turretFire > 0) {
    F.muzzleFlash(c, 190, -142, 0, turretFire, 0.9, outW);
  }

  // Kính tiềm vọng (periscopes) dọc nóc xe
  for (const px of [-185, -135, -85, 112]) {
    A.rrect(c, px - 7, -132, 14, 10, 2, P.glass, P.ink, inW);
  }

  if (view === 'side') {
    // 4 lỗ bắn súng trường dọc sườn thân trên
    const portXs = [-190, -142, -94, -36];
    portXs.forEach((px, idx) => {
      const py = -94;
      if (portsWelded > 0.01) {
        // Tấm thép hàn bít đè lên lỗ bắn
        A.circle(c, px, py, 10, P.dark, P.ink, inW);
        if (portsWelded > 0.3) {
          A.rrect(c, px - 14, py - 14, 28, 28, 4, P.oliveLight, P.ink, outW);
          // Vệt mối hàn cam sáng lúc mới hàn
          if (portsWelded < 0.95) {
            A.circle(c, px + 12, py - 10, 6, P.amber, P.ink, inW);
          }
        }
      } else {
        // Lỗ bắn mở với ụ cầu xoay
        A.circle(c, px, py, 11, P.oliveDark, P.ink, outW);
        A.circle(c, px, py, 5, P.ink, null, 0);
        // Khối kính ngắm nhỏ ngay trên mỗi lỗ bắn
        A.rrect(c, px - 8, py - 21, 16, 7, 2, P.glass, P.ink, inW);

        if (firingPorts > 0.01) {
          const ext = 30 * firingPorts;
          const ang = -0.08 + Math.sin(wheelRot * 1.5 + idx) * 0.08;
          const gx = px + Math.cos(ang) * ext;
          const gy = py + Math.sin(ang) * ext;
          A.line(c, [[px, py], [gx, gy]], P.dark, outW);
          const fPhase = ((wheelRot * 1.8 + idx * 0.25) % 1 + 1) % 1;
          if (firingPorts > 0.5 && fPhase < 0.35) {
            F.muzzleFlash(c, gx, gy, ang, fPhase / 0.35, 0.5, inW);
          }
        }
      }
    });

    // Nếu bị đạn xuyên giáp mỏng bên sườn (Chương 5)
    if (hullPierced > 0.01) {
      for (const hx of [-155, -80, 10]) {
        A.circle(c, hx, -86, 9, P.ink, P.amber, inW);
        F.sparks(c, hx, -86, (hullPierced * 2) % 1, 0.7, Math.PI, 1.4, hx);
      }
    }
  } else if (view === 'cutaway') {
    // ── MẶT CẮT BÊN (CUTAWAY) LỘ RÕ NỘI THẤT HỘP KÍN BMP-1 ──
    // Khoang rỗng bên trong nền sáng P.paper
    A.poly(
      c,
      [
        [-224, -56],
        [-216, -114],
        [128, -114],
        [228, -76],
        [192, -56],
      ],
      P.paper,
      P.ink,
      outW
    );

    // 1. Khoang động cơ UTD-20 phía trước (x: +95..+210)
    A.rrect(c, 98, -106, 96, 46, 6, P.slate, P.ink, outW);
    for (let i = 0; i < 4; i++) {
      A.rrect(c, 106 + i * 21, -100, 14, 34, 3, P.dark, P.ink, inW);
    }

    // 2. Hệ thống lọc khí áp suất dương (NBC Air Filtration) trên vách ngăn
    if (airFilter > 0.01) {
      A.rrect(c, 56, -112, 34, 24, 5, P.sky, P.ink, outW);
      // Luồng khí sạch màu xanh sky đẩy ra khắp khoang và dạt bụi phóng xạ bên ngoài
      A.withA(c, airFilter * 0.85, () => {
        for (const ax of [20, -50, -130, -190]) {
          A.line(c, [[56, -100], [ax, -85]], P.sky, inW, [6, 5]);
        }
      });
    }

    // 3. Giỏ tháp pháo ở giữa (x: -36..+46)
    A.rrect(c, -34, -114, 78, 56, 4, '#e2e8f0', P.ink2, inW);
    drawSoldier(c, 4, -58, { view: 'side_seat', facing: 1, weapon: 'none', scale: 0.72 });

    // 4. Khoang bộ binh chật hẹp phía sau (x: -220..-42) với 3 tay súng ngồi bó gối bắn qua lỗ bắn
    const seatXs = [-190, -138, -86];
    seatXs.forEach((sx, idx) => {
      // Ghế băng thấp
      A.rrect(c, sx - 16, -68, 32, 8, 2, P.sand, P.ink, inW);
      drawSoldier(c, sx, -56, { view: 'side_seat', facing: 1, weapon: 'none', scale: 0.72 });

      // Lỗ bắn và nòng súng trường chọc xuyên qua vách ra ngoài
      const py = -92;
      A.circle(c, sx + 12, py, 7, P.oliveDark, P.ink, inW);
      const pitchWobble = pitch ? Math.sin(wheelRot * 3 + idx) * 0.25 : 0;
      const gx = sx + 48;
      const gy = py - 4 + pitchWobble * 40;
      A.line(c, [[sx, -86], [gx, gy]], P.dark, outW);

      if (firingPorts > 0.1) {
        const fPhase = ((wheelRot * 1.9 + idx * 0.31) % 1 + 1) % 1;
        if (fPhase < 0.38) {
          F.muzzleFlash(c, gx, gy, pitchWobble, fPhase / 0.38, 0.5, inW);
        }
      }

      // Vỏ đạn đồng nóng văng trong khoang & khói thuốc súng (Chương 3)
      if (fumes > 0.01) {
        A.withA(c, fumes, () => {
          for (let b = 0; b < 3; b++) {
            const bx = sx + 4 - b * 8 + Math.sin(wheelRot * 4 + b + idx) * 6;
            const by = -82 + b * 7 + Math.cos(wheelRot * 3 + b) * 5;
            A.rrect(c, bx, by, 7, 3, 1, P.amber, P.ink, 1);
          }
        });
      }
    });

    // Đám khói thuốc súng đặc quánh tích tụ trong khoang kín khi bắn
    if (fumes > 0.05) {
      A.withA(c, fumes * 0.65, () => {
        for (const kx of [-195, -155, -115, -75]) {
          A.circle(c, kx + Math.sin(wheelRot + kx) * 6, -94, 22, P.slate, null, 0);
        }
      });
    }

    // Cửa hậu rỗng chứa nhiên liệu ở vách đuôi (x = -224)
    if (showFuelDoors > 0.05) {
      A.rrect(c, -236, -118, 16, 62, 5, P.amber, P.ink, outW);
    }
  }

  c.restore();
}

// ── 3. IFV HIỆN ĐẠI (Bradley / Puma / CV90) — Mọi góc nhìn & biến thể ──
export interface IFVOpts {
  view?: 'side' | 'cutaway' | 'top' | 'rear';
  facing?: 1 | -1;
  scale?: number;
  wheelRot?: number;
  pitch?: number;
  gunElev?: number; // góc nâng nòng pháo tự động (radian, âm là ngóc lên, vd -0.65)
  rampOpen?: number; // 0..1: hạ cửa dốc thủy lực phía sau
  turretType?: 'manned' | 'unmanned' | 'none';
  armorLevel?: 0 | 1 | 2; // 0: vỏ thường/có lỗ bắn; 1: hàn kín + giáp hộp sườn; 2: giáp nặng 35-40t + chắn mìn bụng
  pistolPorts?: boolean; // lỗ bắn súng ngắn trên Bradley đời đầu
  atgm?: number; // 0..1: bệ phóng tên lửa chống tăng gắn má tháp pháo
  atgmFire?: number; // 0..1: lửa phóng tên lửa
  cannonFire?: number; // 0..1: chớp lửa đầu nòng pháo tự động
  engineHit?: number; // 0..1: đạn xuyên vào mũi bị khối động cơ gang chặn đứng
  mineBlast?: number; // 0..1: mìn nổ dưới đáy ở góc rear/cutaway, ghế treo cách ly xung lực
  thermalScreen?: number; // 0..1: màn hình ảnh nhiệt sáng lên trong khoang
  basketHighlight?: number; // 0..1: tô nhấn chiếc giỏ tháp pháo chiếm chỗ ngồi giữa xe
  tugOfWar?: number; // 0..1: minh họa cuộc kéo co không gian giữa pháo thủ và bộ binh trong thân xe
  turretAng?: number; // góc xoay tháp pháo ở góc top
  topCutout?: number; // 0..1: mở nóc ở góc top để thấy động cơ trước, giỏ tháp pháo và ghế lính sau
}

export function drawIFV(c: CanvasRenderingContext2D, x: number, y: number, opts: IFVOpts = {}) {
  const {
    view = 'side',
    facing = 1,
    scale = 1,
    wheelRot = 0,
    pitch = 0,
    gunElev = -0.08,
    rampOpen = 0,
    turretType = 'manned',
    armorLevel = 1,
    pistolPorts = false,
    atgm = 1,
    atgmFire = 0,
    cannonFire = 0,
    engineHit = 0,
    mineBlast = 0,
    thermalScreen = 0,
    basketHighlight = 0,
    tugOfWar = 0,
    turretAng = 0,
    topCutout = 0,
  } = opts;

  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(facing * scale, scale);
  if (pitch) c.rotate(pitch);

  // ── A. GÓC NHÌN TỪ ĐUÔI DỌC TRỤC THÂN (REAR CROSS-SECTION: PHÒNG GIAO BAN & GHẾ TREO) ──
  if (view === 'rear') {
    const shockY = mineBlast > 0 ? Math.sin(mineBlast * Math.PI) * -18 : 0;
    c.translate(0, shockY);

    // Hai dải xích hai bên
    A.rrect(c, -210, -78, 48, 78, 8, P.dark, P.ink, outW);
    A.rrect(c, 162, -78, 48, 78, 8, P.dark, P.ink, outW);

    // Khung vỏ thân ngoài (kèm tấm chắn mìn chữ V/dày dưới đáy)
    A.poly(
      c,
      [
        [-178, -42],
        [-196, -150],
        [-168, -260],
        [168, -260],
        [196, -150],
        [178, -42],
      ],
      P.olive,
      P.ink,
      outW
    );

    // Tấm giáp bụng chống mìn (Belly Shield)
    const bellyDeform = mineBlast > 0 ? Math.sin(mineBlast * Math.PI) * 16 : 0;
    A.poly(
      c,
      [
        [-178, -42],
        [0, -26 - bellyDeform],
        [178, -42],
        [156, -58 - bellyDeform * 0.6],
        [0, -48 - bellyDeform],
        [-156, -58 - bellyDeform * 0.6],
      ],
      armorLevel >= 1 ? P.slate : P.oliveDark,
      P.ink,
      outW
    );

    // Các mô-đun giáp hộp treo hai bên sườn
    if (armorLevel >= 1) {
      A.rrect(c, -220, -238, 28, 136, 5, P.oliveDark, P.ink, outW);
      A.rrect(c, 192, -238, 28, 136, 5, P.oliveDark, P.ink, outW);
    }

    // Khoang nội thất ("Briefing room") sáng rõ
    A.rrect(c, -156, -244, 312, 184, 10, P.paper, P.ink, outW);

    // Sàn xe tách biệt dưới chân (bị đẩy cong lên khi mìn nổ nhưng không chạm vào ghế!)
    A.path(
      c,
      [
        [-150, -64],
        [0, -64 - bellyDeform * 1.1],
        [150, -64],
      ],
      false
    );
    A.fs(c, null, mineBlast > 0.05 ? P.enemy : P.ink2, outW);

    // Màn hình ảnh nhiệt trên vách ngăn giữa (Bulkhead Thermal Screen)
    const scrCol = thermalScreen > 0.05 ? P.sky : P.slate;
    A.rrect(c, -56, -226, 112, 68, 6, P.dark, P.ink, outW);
    A.rrect(c, -48, -218, 96, 52, 4, scrCol, P.ink, inW);
    if (thermalScreen > 0.05) {
      // Hình ảnh mục tiêu phát sáng trên màn hình ảnh nhiệt
      A.rrect(c, -30, -204, 26, 28, 2, P.white, null, 0);
      A.circle(c, 16, -190, 10, P.amber, P.ink, 1.5);
      A.line(c, [[-8, -192], [8, -192]], P.white, 2);
      A.line(c, [[0, -200], [0, -184]], P.white, 2);
    }

    // GHẾ TREO TỪ TRẦN XE (Roof-suspended seats) hai bên trái & phải!
    for (const side of [-1, 1] as const) {
      const sx = side * 116;
      // Thanh cáp/giá treo gắn chặt vào trần xe (-244) xuống ghế (-136), hoàn toàn KHÔNG nối xuống sàn (-64)
      A.line(c, [[sx - side * 12, -244], [sx - side * 12, -124]], P.amber, outW);
      A.line(c, [[sx + side * 16, -244], [sx - side * 12, -162]], P.amber, inW);
      A.circle(c, sx - side * 12, -242, 6, P.amber, P.ink, inW);
      // Mặt ghế gấp và tựa lưng treo lơ lửng
      A.poly(
        c,
        [
          [sx + side * 22, -188],
          [sx + side * 22, -128],
          [sx - side * 20, -128],
          [sx - side * 20, -138],
          [sx + side * 10, -138],
          [sx + side * 10, -188],
        ],
        P.sand,
        P.ink,
        outW
      );
      // Người lính ngồi quay mặt vào nhau, chân lơ lửng cách sàn 30px
      drawSoldier(c, sx, -134, {
        view: 'rear_seat',
        facing: (side === -1 ? 1 : -1) as 1 | -1,
        scale: 0.92,
      });
    }

    // Tháp pháo phía trên nóc
    if (turretType === 'manned') {
      A.poly(c, [[-84, -260], [-64, -320], [64, -320], [84, -260]], P.oliveLight, P.ink, outW);
      A.circle(c, 0, -292, 16, P.dark, P.ink, outW);
      if (atgm > 0.1) {
        A.rrect(c, -118, -312, 30, 36, 4, P.oliveDark, P.ink, outW);
      }
    } else if (turretType === 'unmanned') {
      A.poly(c, [[-52, -260], [-36, -314], [36, -314], [52, -260]], P.sky, P.ink, outW);
      A.circle(c, 0, -290, 14, P.dark, P.ink, outW);
    }

    // Quả nổ mìn dưới gầm xe nếu mineBlast > 0
    if (mineBlast > 0.01) {
      F.explosion(c, 0, -10, 95, mineBlast, outW);
    }

    c.restore();
    return;
  }

  // ── B. GÓC NHÌN TỪ TRÊN XUỐNG (TOP-DOWN) CỦA IFV HIỆN ĐẠI ──
  if (view === 'top') {
    // Xích hai bên
    A.rrect(c, -230, -118, 456, 28, 7, P.dark, P.ink, outW);
    A.rrect(c, -230, 90, 456, 28, 7, P.dark, P.ink, outW);

    // Mô-đun giáp hộp bên sườn nếu armorLevel >= 1
    if (armorLevel >= 1) {
      A.rrect(c, -216, -130, 412, 18, 5, P.oliveDark, P.ink, outW);
      A.rrect(c, -216, 112, 412, 18, 5, P.oliveDark, P.ink, outW);
    }

    // Thân xe chính
    A.poly(
      c,
      [
        [-232, -98],
        [184, -98],
        [236, -62],
        [236, 62],
        [184, 98],
        [-232, 98],
      ],
      P.olive,
      P.ink,
      outW
    );

    // Mũi xe: Khoang động cơ đặt phía trước bên phải (y > 0) + Nắp trưởng/lái xe bên trái (y < 0)
    A.rrect(c, 84, 8, 122, 76, 6, P.oliveDark, P.ink, outW);
    for (let i = 0; i < 5; i++) {
      A.line(c, [[98 + i * 22, 16], [98 + i * 22, 76]], P.ink, inW);
    }
    A.circle(c, 132, -48, 22, P.oliveLight, P.ink, outW); // Nắp lái xe bên trái động cơ

    // Cửa dốc thủy lực phía sau (Rear Ramp) hạ ra sau (x < -232)
    if (rampOpen > 0.02) {
      const rampLen = 118 * rampOpen;
      A.poly(
        c,
        [
          [-232, -74],
          [-232 - rampLen, -68],
          [-232 - rampLen, 68],
          [-232, 74],
        ],
        P.sand,
        P.ink,
        outW
      );
      for (let r = 1; r <= 3; r++) {
        const rx = -232 - (rampLen * r) / 4;
        A.line(c, [[rx, -66], [rx, 66]], P.ink2, inW);
      }
    }

    // Nếu mở mặt cắt từ trên xuống (topCutout > 0) để thấy động cơ trước, giỏ tháp pháo giữa & 6-8 ghế sau
    if (topCutout > 0.01) {
      A.withA(c, topCutout, () => {
        // Khoang động cơ mở nắp thấy khối máy V8
        A.rrect(c, 88, 12, 114, 68, 5, P.slate, P.ink, inW);
        // Khoang sau mở nóc
        A.rrect(c, -222, -84, 294, 168, 8, P.paper, P.ink, outW);
        // Hai hàng ghế bộ binh ở phần đuôi (-215..-85)
        for (const lx of [-196, -156, -116]) {
          A.rrect(c, lx - 14, -76, 28, 28, 5, P.sand, P.ink, inW);
          A.circle(c, lx, -58, 13, P.oliveLight, P.ink, inW);
          A.rrect(c, lx - 14, 48, 28, 28, 5, P.sand, P.ink, inW);
          A.circle(c, lx, 58, 13, P.oliveLight, P.ink, inW);
        }
        // Vòng giỏ tháp pháo khổng lồ chiếm trọn khoang giữa (x = -12, y = 0, r = 68)
        if (turretType === 'manned') {
          A.circle(c, -12, 0, 68, basketHighlight > 0 ? '#fef3c7' : '#e2e8f0', P.amber, outW * 1.2);
          A.circle(c, -12, 0, 52, P.slate, P.ink, inW);
        }
      });
    }

    // Tháp pháo xoay trên nóc
    if (turretType !== 'none') {
      c.save();
      c.translate(-12, 0);
      c.rotate(turretAng);
      const tAlpha = topCutout > 0.5 ? 0.35 : 1;
      A.withA(c, tAlpha, () => {
        A.poly(
          c,
          [
            [-68, -58],
            [52, -52],
            [68, 0],
            [52, 52],
            [-68, 58],
          ],
          P.oliveLight,
          P.ink,
          outW
        );
        // Bệ phóng tên lửa chống tăng TOW/Spike gắn bên má trái tháp pháo
        if (atgm > 0.05) {
          A.rrect(c, -48, -88, 92, 26, 5, P.oliveDark, P.ink, outW);
          if (atgmFire > 0) {
            F.muzzleFlash(c, 50, -75, 0, atgmFire, 0.85, outW);
          }
        }
        // Nòng pháo tự động 25–40mm dài mảnh
        A.rrect(c, 56, -7, 152, 14, 4, P.dark, P.ink, outW);
        if (cannonFire > 0) {
          F.muzzleFlash(c, 214, 0, 0, cannonFire, 0.8, outW);
        }
      });
      c.restore();
    }

    c.restore();
    return;
  }

  // ── C. GÓC NHÌN NGANG (SIDE) & MẶT CẮT NGANG (CUTAWAY) CỦA IFV HIỆN ĐẠI ──
  // 1. Bánh xích & 6 bánh chịu nặng
  A.rrect(c, -238, -68, 476, 66, 30, P.dark, P.ink, outW);
  A.rrect(c, -226, -58, 452, 46, 22, P.slate, P.ink, inW);
  const wheelXs = [-176, -112, -48, 16, 80, 144];
  for (const wx of wheelXs) {
    A.circle(c, wx, -28, 25, P.oliveDark, P.ink, outW);
    A.circle(c, wx, -28, 11, P.oliveLight, P.ink, inW);
    const a = wheelRot;
    A.line(c, [[wx - Math.cos(a) * 18, -28 - Math.sin(a) * 18], [wx + Math.cos(a) * 18, -28 + Math.sin(a) * 18]], P.ink, inW);
  }
  A.circle(c, 202, -44, 19, P.oliveDark, P.ink, outW);
  A.circle(c, -210, -42, 18, P.oliveDark, P.ink, outW);

  // Tấm chắn mìn dưới bụng (Belly shield) khi armorLevel >= 2
  if (armorLevel >= 2) {
    A.rrect(c, -195, -62, 370, 12, 4, P.amber, P.ink, outW);
  }

  // 2. Khung thân xe cao ráo của IFV hiện đại
  const hullPts: A.Pt[] = [
    [-236, -56],
    [-236, -162],
    [96, -162],
    [244, -92],
    [212, -52],
  ];
  A.poly(c, hullPts, P.olive, P.ink, outW);

  // 3. Cửa dốc thủy lực phía sau (Rear Hydraulic Ramp tại x = -236)
  c.save();
  c.translate(-236, -58);
  // Khi rampOpen = 0: dựng đứng dọc vách sau (góc 0); khi rampOpen = 1: hạ xuống chạm mặt đất phía trái (góc ~ -1.32 rad)
  c.rotate(-rampOpen * 1.32);
  A.rrect(c, -14, -104, 16, 104, 4, P.oliveDark, P.ink, outW);
  c.restore();
  // Xi-lanh thủy lực kéo cửa dốc
  if (rampOpen > 0.05) {
    const rx = -236 - Math.sin(rampOpen * 1.32) * 65;
    const ry = -58 - Math.cos(rampOpen * 1.32) * 65;
    A.line(c, [[-222, -138], [rx, ry]], P.slate, outW);
  }

  // 4. Chi tiết bên ngoài nếu view === 'side'
  if (view === 'side') {
    if (armorLevel === 0 && pistolPorts) {
      // Lỗ bắn súng ngắn kiểu Bradley đời đầu
      for (const px of [-185, -135, -85]) {
        A.circle(c, px, -118, 10, P.oliveDark, P.ink, outW);
        A.circle(c, px, -118, 4, P.ink, null, 0);
        A.rrect(c, px - 8, -144, 16, 8, 2, P.glass, P.ink, inW);
      }
    } else if (armorLevel >= 1) {
      // Các mô-đun giáp gốm / ERA treo kín dọc sườn xe
      const modCount = armorLevel === 2 ? 6 : 5;
      for (let i = 0; i < modCount; i++) {
        const mx = -218 + i * 64;
        const mCol = armorLevel === 2 && i % 2 === 1 ? P.oliveLight : P.oliveDark;
        A.rrect(c, mx, -146, 58, 76, 5, mCol, P.ink, outW);
        A.circle(c, mx + 10, -134, 3, P.ink, null, 0);
        A.circle(c, mx + 48, -134, 3, P.ink, null, 0);
        A.circle(c, mx + 10, -82, 3, P.ink, null, 0);
        A.circle(c, mx + 48, -82, 3, P.ink, null, 0);
      }
    }
  }

  // 5. Mặt cắt nội thất nếu view === 'cutaway'
  if (view === 'cutaway') {
    // Hốc nội thất nền sáng P.paper
    A.poly(
      c,
      [
        [-224, -62],
        [-224, -152],
        [92, -152],
        [224, -90],
        [198, -62],
      ],
      P.paper,
      P.ink,
      outW
    );

    // a) KHOANG ĐỘNG CƠ DIESEL GANG ĐÚC + HỘP SỐ Ở MŨI XE (x: +96..+214)
    A.rrect(c, 98, -140, 102, 72, 8, P.slate, P.ink, outW);
    // Các xi-lanh và bánh răng hộp số bên trong khối động cơ
    for (let i = 0; i < 4; i++) {
      A.rrect(c, 106 + i * 22, -132, 16, 42, 3, P.dark, P.ink, inW);
    }
    A.circle(c, 182, -88, 14, P.amber, P.ink, inW);

    // Nếu có đạn bắn vào mũi xe bị khối động cơ chặn lại (Chương 2: 113.76–122.00)
    if (engineHit > 0.01) {
      const hitX = A.lerp(280, 134, A.eo(engineHit, 0, 0.55));
      const hitY = A.lerp(-112, -106, A.eo(engineHit, 0, 0.55));
      // Đường đạn xuyên lớp vỏ mũi nhưng khựng lại giữa khối gang động cơ
      A.line(c, [[280, -112], [hitX, hitY]], P.enemy, outW, [10, 6]);
      A.poly(c, [[hitX, hitY], [hitX + 18, hitY - 7], [hitX + 18, hitY + 7]], P.amber, P.ink, inW);
      if (engineHit > 0.45) {
        F.sparks(c, 134, -106, (engineHit - 0.45) / 0.55, 0.9, 0, Math.PI * 1.4, 7);
      }
    }

    // b) KHOANG GIỮA: GIỎ THÁP PHÁO (Turret Basket) vs GHẾ BỘ BINH MỞ RỘNG (Unmanned Turret)
    if (turretType === 'manned') {
      // Giỏ tháp pháo và băng đạn thòng từ trần xuống sát sàn như một cái thùng phi lớn (x: -36..+82)
      const bCol = basketHighlight > 0.05 ? '#fef3c7' : '#e2e8f0';
      const bStroke = basketHighlight > 0.05 ? P.amber : P.ink;
      A.rrect(c, -34, -152, 114, 88, 8, bCol, bStroke, outW);
      // Nan lồng giỏ tháp pháo & hai máng đạn kép bên trong
      A.line(c, [[-10, -152], [-10, -64]], bStroke, inW);
      A.line(c, [[24, -152], [24, -64]], bStroke, inW);
      A.line(c, [[56, -152], [56, -64]], bStroke, inW);
      // Thùng đạn AP (sky) và HE (amber) dưới đáy giỏ
      A.rrect(c, -26, -98, 42, 28, 4, P.sky, P.ink, inW);
      A.rrect(c, 28, -98, 44, 28, 4, P.amber, P.ink, inW);
      // Pháo thủ ngồi trong giỏ
      drawSoldier(c, 14, -72, { view: 'side_seat', facing: 1, weapon: 'none', scale: 0.78 });
    } else if (turretType === 'unmanned') {
      // Không có giỏ tháp pháo! Sàn khoang giữa hoàn toàn trống để lắp thêm ghế treo + màn hình điều khiển từ xa
      A.rrect(c, 52, -138, 28, 36, 4, P.sky, P.ink, outW); // Màn hình điều khiển tháp pháo không người lái
      for (const sx of [-18, 28]) {
        A.line(c, [[sx, -152], [sx, -94]], P.amber, inW);
        A.rrect(c, sx - 14, -94, 28, 8, 3, P.sand, P.ink, inW);
        drawSoldier(c, sx, -76, { view: 'side_seat', facing: 1, scale: 0.78 });
      }
    }

    // c) KHOANG BỘ BINH PHÍA SAU (x: -220..-42): Ghế treo từ trần + Màn hình ảnh nhiệt trên vách ngăn
    if (thermalScreen > 0.01) {
      A.rrect(c, -48, -142, 12, 34, 3, P.sky, P.ink, inW);
    }

    const squadXs = [-196, -146, -96];
    for (const sx of squadXs) {
      // Thanh treo ghế từ trần xe xuống (-152 -> -94), hoàn toàn cách ly khỏi sàn (-62)
      A.line(c, [[sx - 6, -152], [sx - 6, -92]], P.amber, inW * 1.2);
      A.rrect(c, sx - 16, -94, 30, 8, 3, P.sand, P.ink, inW);
      drawSoldier(c, sx, -76, { view: 'side_seat', facing: 1, scale: 0.78 });
    }

    // Nếu minh họa cuộc kéo co không gian (tugOfWar > 0, Chương 5: 382.92–397.98)
    if (tugOfWar > 0.01) {
      const shift = Math.sin(tugOfWar * Math.PI * 4) * 24;
      A.line(c, [[-34 + shift, -152], [-34 + shift, -62]], P.enemy, outW * 1.5);
    }
  }

  // 6. Tháp pháo trên nóc (Manned vs Unmanned)
  if (turretType !== 'none') {
    const isUnmanned = turretType === 'unmanned';
    const ty = -162;
    c.save();
    c.translate(22, ty);

    if (isUnmanned) {
      // Tháp pháo điều khiển từ xa gọn nhẹ đặt hoàn toàn trên mặt nóc
      A.poly(
        c,
        [
          [-56, 0],
          [-38, -46],
          [44, -46],
          [62, 0],
        ],
        P.sky,
        P.ink,
        outW
      );
      A.rrect(c, -18, -62, 28, 16, 4, P.glass, P.ink, inW); // Cụm quang điện tử
    } else {
      // Tháp pháo 2 người tiêu chuẩn
      A.poly(
        c,
        [
          [-78, 0],
          [-58, -56],
          [56, -56],
          [82, 0],
        ],
        P.oliveLight,
        P.ink,
        outW
      );
      // Kính ngắm ảnh nhiệt của trưởng xe trên nóc tháp pháo
      A.rrect(c, -34, -74, 32, 18, 4, P.glass, P.ink, outW);
      // Bệ phóng tên lửa chống tăng TOW/Spike bên má tháp pháo
      if (atgm > 0.05) {
        c.save();
        c.scale(atgm, atgm);
        A.rrect(c, -48, -44, 86, 26, 5, P.oliveDark, P.ink, outW);
        A.circle(c, 38, -31, 9, P.amber, P.ink, inW);
        if (atgmFire > 0) {
          F.muzzleFlash(c, 46, -31, 0, atgmFire, 0.9, outW);
        }
        c.restore();
      }
    }

    // Nòng pháo tự động 25–40mm có thể ngóc cao (gunElev âm = nâng lên)
    c.save();
    c.translate(58, -28);
    c.rotate(gunElev);
    A.rrect(c, -8, -9, 32, 18, 4, P.oliveDark, P.ink, outW);
    A.rrect(c, 22, -5, 138, 10, 3, P.dark, P.ink, outW);
    // Loa giảm giật đầu nòng
    A.rrect(c, 154, -8, 14, 16, 3, P.dark, P.ink, outW);
    if (cannonFire > 0) {
      F.muzzleFlash(c, 172, 0, 0, cannonFire, 0.85, outW);
    }
    c.restore();

    c.restore();
  }

  c.restore();
}

// ── 4. XE TĂNG CHỦ LỰC (MBT — Abrams / T-72) & Biến thể NAMER 60 TẤN ──
export interface MBTOpts {
  view?: 'side' | 'cutaway' | 'top';
  facing?: 1 | -1;
  scale?: number;
  wheelRot?: number;
  gunElev?: number; // xe tăng chỉ nâng được rất thấp (-0.15..0.05)
  cannonFire?: number;
  isNamer?: boolean; // biến thể Namer 60 tấn của Israel (bỏ tháp pháo, động cơ trước, chở quân)
  team?: 'ally' | 'enemy';
  destroyed?: number; // 0..1
}

export function drawMBT(c: CanvasRenderingContext2D, x: number, y: number, opts: MBTOpts = {}) {
  const {
    view = 'side',
    facing = 1,
    scale = 1,
    wheelRot = 0,
    gunElev = -0.04,
    cannonFire = 0,
    isNamer = false,
    team = 'ally',
    destroyed = 0,
  } = opts;

  const bodyCol = team === 'ally' ? P.olive : P.enemy;
  const darkCol = team === 'ally' ? P.oliveDark : '#7f2e26';
  const lightCol = team === 'ally' ? P.oliveLight : P.enemyLight;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(facing * scale, scale);

  if (view === 'top') {
    A.rrect(c, -250, -128, 500, 34, 8, P.dark, P.ink, outW);
    A.rrect(c, -250, 94, 500, 34, 8, P.dark, P.ink, outW);
    A.rrect(c, -242, -102, 484, 204, 10, bodyCol, P.ink, outW);
    // Lưới động cơ ở ĐUÔI XE (-230..-110)
    A.rrect(c, -226, -78, 108, 156, 6, darkCol, P.ink, inW);
    // Giáp mũi dày (+150..+242)
    A.rrect(c, 154, -96, 84, 192, 6, darkCol, P.ink, inW);
    if (!isNamer) {
      // Tháp pháo lớn + pháo 120mm dài
      A.poly(
        c,
        [
          [-105, -84],
          [75, -72],
          [112, 0],
          [75, 72],
          [-105, 84],
        ],
        lightCol,
        P.ink,
        outW
      );
      A.rrect(c, 98, -11, 210, 22, 5, P.dark, P.ink, outW);
      A.rrect(c, 178, -16, 46, 32, 6, darkCol, P.ink, outW); // Bầu hút khói
    }
    if (destroyed > 0.05) {
      F.smoke(c, 0, 0, destroyed * 4, 1.1, 6);
      F.fire(c, -10, 10, destroyed * 4, 0.9);
    }
    c.restore();
    return;
  }

  // Bánh xích 7 bánh chịu nặng của MBT
  A.rrect(c, -256, -68, 512, 66, 30, P.dark, P.ink, outW);
  for (let i = 0; i < 7; i++) {
    const wx = -192 + i * 64;
    A.circle(c, wx, -28, 24, darkCol, P.ink, outW);
    A.circle(c, wx, -28, 10, lightCol, P.ink, inW);
    const a = wheelRot;
    A.line(c, [[wx - Math.cos(a) * 16, -28 - Math.sin(a) * 16], [wx + Math.cos(a) * 16, -28 + Math.sin(a) * 16]], P.ink, inW);
  }

  // Thân xe tăng (Namer cao hơn ở khoang sau vì là APC hạng nặng 60 tấn từ thân Merkava)
  const hullTopY = isNamer ? -168 : -134;
  A.poly(
    c,
    [
      [-254, -56],
      [-248, hullTopY],
      [148, hullTopY],
      [262, -88],
      [224, -52],
    ],
    bodyCol,
    P.ink,
    outW
  );

  if (view === 'cutaway') {
    A.poly(
      c,
      [
        [-240, -62],
        [-236, hullTopY + 10],
        [142, hullTopY + 10],
        [236, -88],
        [208, -62],
      ],
      P.paper,
      P.ink,
      outW
    );

    if (isNamer) {
      // Namer (thân Merkava 60 tấn): Giáp siêu dày + Động cơ trước + Khoang chở quân phía sau không tháp pháo!
      A.rrect(c, -246, hullTopY - 12, 396, 22, 6, P.slate, P.ink, outW); // Giáp nóc siêu dày
      A.rrect(c, 98, -138, 98, 70, 6, P.slate, P.ink, outW); // Động cơ phía trước
      for (const sx of [-195, -140, -85, -30, 25]) {
        drawSoldier(c, sx, -74, { view: 'side_seat', facing: 1, scale: 0.78 });
      }
    } else {
      // MBT tiêu chuẩn:
      // 1. Khối giáp composite cực dày ở MŨI XE (x: +140..+252)
      A.poly(
        c,
        [
          [140, -124],
          [248, -88],
          [214, -62],
          [140, -62],
        ],
        P.dark,
        P.ink,
        outW
      );
      for (let k = 0; k < 3; k++) {
        A.line(c, [[156 + k * 22, -120 + k * 8], [148 + k * 22, -64]], P.amber, inW);
      }

      // 2. Khoang chiến đấu ở giữa với ~40 viên đạn pháo 120mm cỡ lớn
      for (let r = 0; r < 2; r++) {
        for (let col = 0; col < 5; col++) {
          A.rrect(c, -56 + col * 24, -112 + r * 22, 18, 16, 3, P.amber, P.ink, inW);
        }
      }

      // 3. ĐỘNG CƠ VÀ HỘP SỐ ĐẶT Ở ĐUÔI XE (x: -236..-86) — bít kín hoàn toàn lối ra phía sau!
      A.rrect(c, -234, -120, 142, 56, 8, P.slate, P.ink, outW);
      for (let i = 0; i < 5; i++) {
        A.rrect(c, -222 + i * 26, -112, 18, 40, 3, P.dark, P.ink, inW);
      }
    }
  } else {
    // Váy giáp sườn MBT
    for (let i = 0; i < 6; i++) {
      A.rrect(c, -236 + i * 74, -112, 70, 48, 4, darkCol, P.ink, inW);
    }
  }

  // Tháp pháo MBT lớn với pháo 120mm nặng nề (trừ khi là Namer đã tháo tháp pháo)
  if (!isNamer) {
    A.poly(
      c,
      [
        [-118, -134],
        [-92, -192],
        [78, -192],
        [124, -152],
        [102, -134],
      ],
      lightCol,
      P.ink,
      outW
    );
    c.save();
    c.translate(106, -166);
    c.rotate(gunElev);
    A.rrect(c, 0, -10, 212, 20, 4, P.dark, P.ink, outW);
    A.rrect(c, 78, -15, 48, 30, 6, darkCol, P.ink, outW); // Bầu hút khói (bore evacuator)
    if (cannonFire > 0) {
      F.muzzleFlash(c, 218, 0, 0, cannonFire, 1.1, outW);
    }
    c.restore();
  } else {
    // Namer có trạm súng máy nhỏ trên nóc và giáp vát siêu dày
    A.rrect(c, -220, -182, 340, 18, 5, darkCol, P.ink, outW);
    A.rrect(c, 40, -206, 36, 24, 4, P.dark, P.ink, outW);
    A.line(c, [[76, -196], [122, -196]], P.dark, outW);
  }

  if (destroyed > 0.05) {
    F.smoke(c, -20, -160, destroyed * 4, 1.2, 7);
    F.fire(c, 10, -140, destroyed * 4, 1.0);
  }

  c.restore();
}

// ── 5. XE CHỞ QUÂN (APC — M113) & XE TẢI QUÂN SỰ (So sánh ở Ch.1 & Ch.2) ──
export interface APCOpts {
  type?: 'apc' | 'truck';
  view?: 'side' | 'cutaway';
  facing?: 1 | -1;
  scale?: number;
  wheelRot?: number;
  topClimb?: number; // 0..1: lính phải trèo qua nóc/hông bị súng máy bắn (Ch.2: 97.64–103.98)
}

export function drawAPC(c: CanvasRenderingContext2D, x: number, y: number, opts: APCOpts = {}) {
  const {
    type = 'apc',
    view = 'side',
    facing = 1,
    scale = 1,
    wheelRot = 0,
    topClimb = 0,
  } = opts;

  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(facing * scale, scale);

  if (type === 'truck') {
    // Xe tải quân sự 6x6 mui bạt mỏng manh, rẻ tiền
    A.rrect(c, -200, -172, 260, 108, 10, P.sand, P.ink, outW);
    for (const rx of [-150, -100, -50, 0]) {
      A.line(c, [[rx, -170], [rx, -66]], P.ink2, inW);
    }
    A.poly(
      c,
      [
        [60, -64],
        [60, -156],
        [135, -156],
        [156, -112],
        [198, -104],
        [198, -54],
        [-200, -54],
        [-200, -64],
      ],
      P.olive,
      P.ink,
      outW
    );
    A.rrect(c, 105, -146, 38, 30, 4, P.glass, P.ink, inW);
    for (const wx of [-150, -78, 148]) {
      A.circle(c, wx, -34, 32, P.dark, P.ink, outW);
      A.circle(c, wx, -34, 14, P.oliveLight, P.ink, inW);
    }
    c.restore();
    return;
  }

  // APC kiểu hộp nhôm M113: không tháp pháo, khoang rộng chở 10-12 lính, vỏ mỏng
  A.rrect(c, -196, -64, 392, 62, 26, P.dark, P.ink, outW);
  for (let i = 0; i < 5; i++) {
    const wx = -144 + i * 72;
    A.circle(c, wx, -26, 23, P.oliveDark, P.ink, outW);
    A.circle(c, wx, -26, 10, P.oliveLight, P.ink, inW);
    const a = wheelRot;
    A.line(c, [[wx - Math.cos(a) * 15, -26 - Math.sin(a) * 15], [wx + Math.cos(a) * 15, -26 + Math.sin(a) * 15]], P.ink, inW);
  }

  A.poly(
    c,
    [
      [-196, -54],
      [-196, -168],
      [136, -168],
      [198, -94],
      [176, -54],
    ],
    P.olive,
    P.ink,
    outW
  );

  // Súng máy nhỏ lộ thiên trên nóc
  A.rrect(c, 64, -184, 24, 16, 3, P.oliveLight, P.ink, inW);
  A.line(c, [[88, -178], [134, -178]], P.dark, outW);

  if (view === 'cutaway') {
    A.rrect(c, -184, -158, 286, 96, 6, P.paper, P.ink, outW);
    // 6 người lính ngồi dày đặc bên trong (đại diện cho tiểu đội lớn 10-12 người)
    for (const sx of [-160, -118, -76, -34, 8, 50]) {
      drawSoldier(c, sx, -74, { view: 'side_seat', facing: 1, weapon: 'none', scale: 0.74 });
    }
  }

  // Nếu minh họa lính trèo qua nắp nóc / cửa hông bị phơi mình trước súng máy (Ch.2)
  if (topClimb > 0.01) {
    // Nắp nóc bật mở
    A.line(c, [[-80, -168], [-115, -196]], P.oliveLight, outW);
    // Cửa hông mở
    A.rrect(c, -45, -142, 46, 62, 4, P.paper, P.ink, inW);
    // Lính nhô lên trên nóc và nhảy từ hông ra, trúng đạn gục xuống
    const downedP = A.sm(topClimb, 0.45, 0.9);
    drawSoldier(c, -62, -168, { view: 'side_stand', facing: 1, downed: downedP, scale: 0.82 });
    drawSoldier(c, -18, -82, { view: 'side_run', facing: 1, downed: downedP, scale: 0.82 });
  }

  c.restore();
}

// ── 6. CƠ CHẾ NẠP ĐẠN KÉP (DUAL-FEED AUTOCANNON CUTAWAY — Chương 4) ──
export interface DualFeedOpts {
  mode: 'ap' | 'he';
  switchP?: number; // 0 (APFSDS) .. 1 (HE-Frag)
  fireCycle?: number; // tiến độ nạp và bắn liên thanh
  scale?: number;
}

export function drawDualFeedMechanism(c: CanvasRenderingContext2D, x: number, y: number, opts: DualFeedOpts) {
  const { switchP = opts.mode === 'he' ? 1 : 0, fireCycle = 0, scale = 1 } = opts;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Hộp khóa nòng pháo tự động (Breech Housing)
  A.rrect(c, -260, -150, 380, 300, 16, P.paper, P.ink, outW);
  A.rrect(c, -244, -134, 348, 268, 10, P.bg2, P.ink2, inW);

  // 1. Máng dẫn đạn trên: Đạn xuyên giáp dưới cỡ APFSDS (Tungsten Darts — màu P.sky)
  A.poly(
    c,
    [
      [-230, -120],
      [-70, -120],
      [-20, -48],
      [-90, -48],
      [-150, -82],
      [-230, -82],
    ],
    '#e0f2fe',
    P.ink,
    outW
  );
  for (let i = 0; i < 4; i++) {
    const rx = -205 + i * 38;
    const ry = -102 + (i === 3 ? 16 : 0);
    // Viên đạn APFSDS với thanh kim tungsten nhọn bên trong guốc sabot
    A.rrect(c, rx, ry - 9, 28, 18, 3, P.sky, P.ink, inW);
    A.poly(c, [[rx + 28, ry - 3], [rx + 50, ry], [rx + 28, ry + 3]], P.ink, P.ink, 1.5);
  }

  // 2. Máng dẫn đạn dưới: Đạn nổ phá mảnh HE-Frag (màu P.amber)
  A.poly(
    c,
    [
      [-230, 120],
      [-70, 120],
      [-20, 48],
      [-90, 48],
      [-150, 82],
      [-230, 82],
    ],
    '#fef3c7',
    P.ink,
    outW
  );
  for (let i = 0; i < 4; i++) {
    const rx = -205 + i * 38;
    const ry = 102 - (i === 3 ? 16 : 0);
    // Viên đạn HE đầu tù chứa thuốc nổ mạnh
    A.rrect(c, rx, ry - 9, 28, 18, 3, P.sand, P.ink, inW);
    A.rrect(c, rx + 26, ry - 8, 20, 16, 6, P.amber, P.ink, inW);
  }

  // 3. Cần gạt chuyển nguồn đạn (Feed Selector Lever & Shuttle Gate)
  const gateY = A.lerp(-36, 36, switchP);
  const activeCol = switchP < 0.5 ? P.sky : P.amber;
  A.rrect(c, -86, gateY - 26, 68, 52, 8, activeCol, P.ink, outW);
  // Trục và tay gạt cơ khí
  const leverAng = A.lerp(-0.55, 0.55, switchP);
  c.save();
  c.translate(-128, 0);
  c.rotate(leverAng);
  A.capsule(c, [0, 0], [56, 0], 14, P.slate, P.ink, outW);
  A.circle(c, 0, 0, 18, P.dark, P.ink, outW);
  A.circle(c, 56, 0, 11, activeCol, P.ink, outW);
  c.restore();

  // 4. Buồng đạn & Khóa nòng trượt (Reciprocating Bolt)
  const cyc = (fireCycle % 1 + 1) % 1;
  const boltShift = Math.sin(cyc * Math.PI) * 58;
  // Nòng pháo kéo dài sang phải
  A.rrect(c, 92, -26, 260, 52, 6, P.dark, P.ink, outW);
  A.rrect(c, 84, -14, 268, 28, 2, P.paper, P.ink, inW);

  // Viên đạn đang được đẩy vào buồng đạn
  const roundX = A.lerp(-10, 72, cyc);
  if (switchP < 0.5) {
    // Đạn APFSDS tungsten dart
    A.rrect(c, roundX, -10, 36, 20, 3, P.sky, P.ink, inW);
    A.poly(c, [[roundX + 36, -4], [roundX + 68, 0], [roundX + 36, 4]], P.ink, P.ink, 2);
  } else {
    // Đạn HE-Frag
    A.rrect(c, roundX, -10, 36, 20, 3, P.sand, P.ink, inW);
    A.rrect(c, roundX + 34, -9, 26, 18, 7, P.amber, P.ink, inW);
  }

  // Khóa nòng đẩy phía sau viên đạn
  A.rrect(c, -62 + boltShift, -20, 52, 40, 6, P.slate, P.ink, outW);

  if (cyc > 0.72) {
    F.muzzleFlash(c, 358, 0, 0, (cyc - 0.72) / 0.28, 0.95, outW);
  }

  c.restore();
}

// ── 7. CẬN CẢNH MẶT CẮT LỖ BẮN SƯỜN XE & MỐI HÀN / GIÁP MÔ-ĐUN (Chương 3 & 6) ──
export interface FiringPortDetailOpts {
  pitchOsc?: number; // độ chao đảo đường ngắm khi xe chạy 30 km/h
  firing?: number; // 0..1: bắn đạn, văng vỏ đạn và khói vào trong khoang
  enemyHit?: number; // 0..1: đạn đối phương bắn trúng đúng chỗ khoét lỗ trên giáp
  weldShut?: number; // 0..1: hàn bít lỗ bắn
  armorModule?: number; // 0..1: treo tấm giáp hộp composite/ERA ra bên ngoài
  scale?: number;
}

export function drawFiringPortDetail(c: CanvasRenderingContext2D, x: number, y: number, opts: FiringPortDetailOpts = {}) {
  const {
    pitchOsc = 0,
    firing = 0,
    enemyHit = 0,
    weldShut = 0,
    armorModule = 0,
    scale = 1,
  } = opts;

  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Vùng bên trong khoang xe (bên trái x < 0) và bên ngoài chiến trường (bên phải x > 0)
  A.rrect(c, -360, -220, 340, 440, 12, P.paper, P.ink2, inW);

  // Tấm giáp sườn xe bị khoét 2 lỗ: lỗ kính ngắm phía trên (-110) và lỗ ổ cầu súng trường phía dưới (+30)
  // Phần trên tấm giáp
  A.rrect(c, -28, -220, 56, 86, 4, P.olive, P.ink, outW);
  // Khối kính tiềm vọng (glass block) lắp trong lỗ trên
  A.rrect(c, -24, -134, 48, 52, 4, P.glass, P.ink, outW);
  // Phần giữa tấm giáp
  A.rrect(c, -28, -82, 56, 68, 4, P.olive, P.ink, outW);
  // Phần dưới tấm giáp
  A.rrect(c, -28, 74, 56, 146, 4, P.olive, P.ink, outW);

  if (weldShut < 0.5) {
    // Ổ cầu xoay (Ball mount) ở lỗ khoét giữa (y = 30)
    A.circle(c, 0, 30, 42, P.oliveDark, P.ink, outW);
    // Nòng súng trường thò từ trong khoang (-x) qua ổ cầu ra ngoài (+x)
    c.save();
    c.translate(0, 30);
    c.rotate(pitchOsc);
    A.rrect(c, -165, -12, 145, 24, 5, P.dark, P.ink, outW);
    A.rrect(c, -20, -7, 175, 14, 3, P.dark, P.ink, outW);
    // Đường ngắm qua khối kính bị lắc điên đảo khi xe xóc 30 km/h
    if (Math.abs(pitchOsc) > 0.01) {
      A.line(c, [[0, -138], [290, -138 + Math.sin(pitchOsc * 3) * 140]], P.sky, inW, [10, 8]);
    }
    if (firing > 0.05) {
      F.muzzleFlash(c, 160, 0, 0, (firing * 3) % 1, 0.85, outW);
      // Vỏ đạn đồng nóng văng ngược vào trong khoang (-x) + khói thuốc súng
      for (let i = 0; i < 5; i++) {
        const p = ((firing * 2 + i * 0.2) % 1 + 1) % 1;
        const bx = -75 - p * 160;
        const by = -18 - Math.sin(p * Math.PI) * 55 + i * 22;
        A.rrect(c, bx, by, 18, 8, 2, P.amber, P.ink, inW);
      }
      F.smoke(c, -180, 60, firing * 4, 1.1, 6, P.slate, -18);
    }
    c.restore();

    // Nếu đạn đối phương bắn từ phải (+x) xuyên đúng lỗ khoét yếu trên tấm giáp
    if (enemyHit > 0.01) {
      const rx = A.lerp(320, -120, A.eo(enemyHit, 0, 0.6));
      const ry = A.lerp(18, 30, A.eo(enemyHit, 0, 0.6));
      A.line(c, [[320, 18], [rx, ry]], P.enemy, outW * 1.3, [12, 6]);
      A.poly(c, [[rx, ry], [rx + 26, ry - 9], [rx + 26, ry + 9]], P.enemy, P.ink, inW);
      if (enemyHit > 0.35) {
        F.explosion(c, 0, 30, 78, (enemyHit - 0.35) / 0.65, outW);
      }
    }
  } else {
    // HÀN BÍT LỖ BẮN (weldShut >= 0.5)
    const wp = A.clamp01((weldShut - 0.5) * 2);
    A.rrect(c, -28, -14, 56, 88, 2, P.olive, P.ink, outW);
    // Tấm thép hàn đè lên cả lỗ ngắm và lỗ súng
    A.rrect(c, 18, -146, 22, 234, 4, P.oliveLight, P.ink, outW);
    if (wp < 0.95) {
      const wy = A.lerp(-140, 84, wp);
      F.sparks(c, 28, wy, (wp * 4) % 1, 0.75, 0, Math.PI, 3);
    }
  }

  // Treo mô-đun giáp hộp (Composite / ERA module) ra mặt ngoài tấm giáp
  if (armorModule > 0.01) {
    const mx = A.lerp(190, 44, A.eo(armorModule, 0, 1));
    A.withA(c, A.clamp01(armorModule * 2), () => {
      A.rrect(c, mx, -185, 76, 360, 10, P.oliveDark, P.ink, outW);
      for (const by of [-140, -50, 40, 130]) {
        A.rrect(c, mx + 10, by, 56, 62, 5, P.slate, P.ink, inW);
      }
    });
  }

  c.restore();
}

// ── 8. MỤC TIÊU ĐỐI PHƯƠNG & ĐỊA HÌNH CHIẾN THUẬT (Đô thị, Rừng, Chiến hào, Drone) ──
export function drawUrbanBuilding(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: {
    floors?: number;
    width?: number;
    mgFiring?: number;
    windowHit?: number; // 0..1: đạn HE nổ bên trong cửa sổ tầng cao
    scale?: number;
  } = {}
) {
  const { floors = 3, width = 180, mgFiring = 0, windowHit = 0, scale = 1 } = opts;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);
  const floorH = 92;
  const totalH = floors * floorH;

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Khối nhà bê tông
  A.rrect(c, -width / 2, -totalH, width, totalH, 6, P.light, P.ink, outW);
  for (let f = 0; f < floors; f++) {
    const fy = -(f + 1) * floorH;
    A.line(c, [[-width / 2, fy], [width / 2, fy]], P.ink2, inW);
    // Cửa sổ mỗi tầng
    for (const wx of [-width * 0.26, width * 0.26]) {
      const isTopLeft = f === floors - 1 && wx < 0;
      const winCol = isTopLeft && windowHit > 0.1 ? P.amber : P.dark;
      A.rrect(c, wx - 22, fy + 18, 44, 52, 4, winCol, P.ink, inW);
    }
  }

  // Tổ súng máy đối phương trên tầng cao nhất bắn xuống trái
  const topY = -totalH + 56;
  const mgX = -width * 0.26;
  if (windowHit < 0.4) {
    drawSoldier(c, mgX + 8, topY + 14, {
      view: 'side_crouch',
      team: 'enemy',
      weapon: 'mg',
      facing: -1,
      firing: mgFiring,
      scale: 0.76,
    });
  }
  if (windowHit > 0.05) {
    F.explosion(c, mgX, topY - 10, 68, windowHit, outW);
  }

  c.restore();
}

export function drawDrone(c: CanvasRenderingContext2D, x: number, y: number, rot = 0, scale = 1, hit = 0) {
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.rotate(rot);

  A.line(c, [[-42, -12], [42, -12]], P.ink, outW);
  A.rrect(c, -18, -16, 36, 22, 6, P.enemy, P.ink, outW);
  A.circle(c, 0, 8, 7, P.glass, P.ink, inW);
  // 2 cụm cánh quạt hai đầu
  A.ellipse(c, -42, -18, 22, 4, 0, P.slate, P.ink, inW);
  A.ellipse(c, 42, -18, 22, 4, 0, P.slate, P.ink, inW);

  if (hit > 0.05) {
    F.explosion(c, 0, 0, 52, hit, outW);
  }
  c.restore();
}

export function drawEnemyLightArmor(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: { facing?: 1 | -1; scale?: number; shredded?: number; view?: 'side' | 'top' } = {}
) {
  const { facing = -1, scale = 1, shredded = 0, view = 'side' } = opts;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  c.save();
  c.translate(x, y);
  c.scale(facing * scale, scale);

  if (view === 'top') {
    A.rrect(c, -150, -76, 300, 152, 18, P.enemy, P.ink, outW);
    A.circle(c, 15, 0, 38, P.enemyLight, P.ink, outW);
    A.line(c, [[45, 0], [125, 0]], P.dark, outW);
    if (shredded > 0.05) {
      F.explosion(c, 0, 0, 74, shredded, outW);
    }
    c.restore();
    return;
  }

  // Xe thiết giáp bánh lốp 8x8 nhẹ kiểu BTR đối phương
  A.poly(
    c,
    [
      [-175, -38],
      [-165, -108],
      [115, -108],
      [178, -68],
      [148, -38],
    ],
    P.enemy,
    P.ink,
    outW
  );
  A.poly(c, [[-25, -108], [-10, -138], [45, -138], [62, -108]], P.enemyLight, P.ink, outW);
  A.line(c, [[58, -124], [132, -124]], P.dark, outW);

  for (const wx of [-125, -45, 35, 115]) {
    A.circle(c, wx, -30, 28, P.dark, P.ink, outW);
    A.circle(c, wx, -30, 12, P.enemyLight, P.ink, inW);
  }

  // Hiệu ứng bị đạn thanh xuyên tungsten (APFSDS) xé toạc vỏ giáp mỏng
  if (shredded > 0.01) {
    for (const hx of [-85, -15, 55]) {
      A.circle(c, hx, -76, 11, P.ink, P.amber, inW);
      F.sparks(c, hx, -76, (shredded * 2) % 1, 0.85, Math.PI, 1.3, hx);
    }
    if (shredded > 0.35) {
      F.smoke(c, 0, -110, shredded * 3, 0.9, 5);
    }
  }

  c.restore();
}

// ── 9. NỀN MÔI TRƯỜNG CHUẨN CHO TỪNG BỐI CẢNH ─────────────────────
/** Nền mặt đất kỹ thuật / chiến trường ngang (SIDE) với mặt đất tại y = groundY. */
export function drawSideGround(
  c: CanvasRenderingContext2D,
  groundY = 0,
  opts: {
    nuclear?: number; // 0..1: cột nấm hạt nhân xa & bụi phóng xạ
    river?: boolean; // mặt cắt sông nước cho cảnh BMP-1 bơi ở Ch.5
    hills?: boolean;
  } = {}
) {
  const { nuclear = 0, river = false, hills = true } = opts;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  if (hills) {
    A.poly(
      c,
      [
        [-2400, groundY],
        [-1400, groundY - 140],
        [-600, groundY - 60],
        [300, groundY - 165],
        [1200, groundY - 75],
        [2400, groundY - 130],
        [2400, groundY],
      ],
      P.bg2,
      null,
      0
    );
  }

  if (nuclear > 0.01) {
    // Cột nấm nguyên tử ở đường chân trời xa
    A.withA(c, nuclear * 0.85, () => {
      const mx = 520;
      const my = groundY;
      // Quầng sáng cam vàng ở chân trời
      A.circle(c, mx, my - 210, 220, '#fef3c7', null, 0);
      // Thân cột nấm
      A.poly(
        c,
        [
          [mx - 75, my],
          [mx - 42, my - 260],
          [mx + 42, my - 260],
          [mx + 75, my],
        ],
        P.enemyLight,
        P.ink2,
        inW
      );
      // Vòng khói giữa thân
      A.ellipse(c, mx, my - 140, 95, 22, 0, P.sand, P.ink2, inW);
      // Mũ nấm
      A.ellipse(c, mx, my - 290, 175, 78, 0, P.amber, P.ink, outW);
      A.ellipse(c, mx, my - 305, 125, 48, 0, '#fde68a', null, 0);
    });
  }

  if (river) {
    // Bờ đất hai bên và lòng sông ở giữa (-650..+650)
    A.poly(
      c,
      [
        [-2400, groundY],
        [-680, groundY],
        [-520, groundY + 260],
        [520, groundY + 260],
        [680, groundY],
        [2400, groundY],
        [2400, groundY + 600],
        [-2400, groundY + 600],
      ],
      P.bg2,
      P.ink,
      outW
    );
    // Mặt nước sông bán trong suốt màu P.sky
    A.withA(c, 0.32, () => {
      A.rrect(c, -640, groundY + 24, 1280, 236, 0, P.sky, null, 0);
    });
    A.line(c, [[-640, groundY + 24], [640, groundY + 24]], P.sky, outW);
  } else {
    A.rrect(c, -2600, groundY, 5200, 700, 0, P.bg2, null, 0);
    A.line(c, [[-2600, groundY], [2600, groundY]], P.ink, outW);
  }
}

/** Nền bản đồ chiến thuật nhìn thẳng từ trên xuống (TOP-DOWN). */
export function drawTopMapBase(
  c: CanvasRenderingContext2D,
  opts: {
    roadY?: number;
    rubble?: boolean;
    urban?: boolean;
    trees?: boolean;
  } = {}
) {
  const { roadY = 0, rubble = false, urban = false, trees = false } = opts;
  const outW = lw(c, LINE.outer);
  const inW = lw(c, LINE.inner);

  // Lưới ô bản đồ tinh tế
  for (let gx = -1600; gx <= 1600; gx += 200) {
    A.line(c, [[gx, -1000], [gx, 1000]], 'rgba(71,85,105,0.10)', inW);
  }
  for (let gy = -1000; gy <= 1000; gy += 200) {
    A.line(c, [[-1600, gy], [1600, gy]], 'rgba(71,85,105,0.10)', inW);
  }

  // Con đường trục ngang
  A.rrect(c, -1600, roadY - 72, 3200, 144, 0, P.bg2, P.ink2, inW);
  A.line(c, [[-1600, roadY], [1600, roadY]], P.light, inW, [24, 20]);

  if (rubble) {
    const blocks: [number, number, number, number][] = [
      [-420, -280, 180, 110],
      [140, -290, 210, 120],
      [-180, 160, 220, 115],
      [260, 150, 190, 125],
    ];
    for (const [bx, by, bw, bh] of blocks) {
      A.rrect(c, bx, by, bw, bh, 8, P.light, P.ink, outW);
      A.rrect(c, bx + 18, by + 16, bw * 0.45, bh * 0.5, 4, P.slate, P.ink, inW);
    }
  }

  if (urban) {
    // Các khối công trình có tầng hầm & góc khuất (cho Chương 6)
    const buildings: [number, number, number, number][] = [
      [-120, -340, 220, 160],
      [220, -320, 240, 170],
      [40, 160, 230, 160],
    ];
    for (const [bx, by, bw, bh] of buildings) {
      A.rrect(c, bx, by, bw, bh, 6, P.light, P.ink, outW);
      A.rrect(c, bx + 14, by + 14, bw - 28, bh - 28, 4, P.paper, P.ink2, inW);
    }
  }

  if (trees) {
    const treePts: [number, number, number][] = [
      [520, -240, 42],
      [580, -180, 36],
      [540, 210, 44],
      [610, 260, 38],
      [-560, -240, 40],
      [-520, 250, 38],
    ];
    for (const [tx, ty, tr] of treePts) {
      A.circle(c, tx, ty, tr, P.oliveLight, P.ink, outW);
      A.circle(c, tx - 8, ty - 6, tr * 0.55, P.olive, null, 0);
    }
  }
}
