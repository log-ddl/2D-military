import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';

export type ViewMode = 'side' | 'top' | 'cutaway';

// ── NỀN KHÔNG GIAN (ENVIRONMENTS) ──────────────────────────────────

/** Nền góc ngang (SIDE): bầu trời sáng, đường chân trời, mặt đất phân lớp, và dải quỹ đạo nếu cần. */
export function drawSkyEnv(
  c: CanvasRenderingContext2D,
  cam: K.Cam,
  opts: { groundY?: number; spaceBand?: boolean; hills?: boolean } = {}
) {
  const v = K.view(cam, 400);
  const gy = opts.groundY ?? 320;
  const lw = A.px(c, LINE.inner);
  const lwOuter = A.px(c, LINE.outer);

  // Dải tầng cao / quỹ đạo vệ tinh
  if (opts.spaceBand) {
    c.fillStyle = P.bg2;
    c.fillRect(v.x0, v.y0, v.x1 - v.x0, Math.max(0, -180 - v.y0));
    A.line(c, [[v.x0, -180], [v.x1, -180]], P.light, lw, [A.px(c, 10), A.px(c, 8)]);
  }

  // Dãy đồi xa
  if (opts.hills !== false) {
    c.beginPath();
    const step = 240;
    const startX = Math.floor(v.x0 / step) * step;
    c.moveTo(startX, gy);
    for (let x = startX; x <= v.x1 + step; x += step) {
      const h = 28 + Math.sin(x * 0.0031) * 18 + Math.cos(x * 0.0073) * 12;
      c.lineTo(x + step * 0.5, gy - h);
      c.lineTo(x + step, gy);
    }
    c.closePath();
    A.fs(c, P.bg2, P.light, lw);
  }

  // Mặt đất
  c.fillStyle = P.bg2;
  c.fillRect(v.x0, gy, v.x1 - v.x0, Math.max(600, v.y1 - gy));
  A.line(c, [[v.x0, gy], [v.x1, gy]], P.ink, lwOuter);

  // Vạch mốc địa hình mặt đất giúp đọc chuyển động camera
  const tickStep = 160;
  const tStart = Math.floor(v.x0 / tickStep) * tickStep;
  for (let x = tStart; x <= v.x1; x += tickStep) {
    A.line(c, [[x, gy], [x - 18, gy + 22]], P.light, lw);
  }
}

/** Nền góc nhìn từ trên xuống (TOP): bản đồ chiến thuật với đường bình độ, trục đường và sông/cầu mốc. */
export function drawMapEnv(
  c: CanvasRenderingContext2D,
  cam: K.Cam,
  opts: { roadY?: number; ridge?: boolean; coast?: boolean } = {}
) {
  const v = K.view(cam, 400);
  const lw = A.px(c, LINE.inner);
  const lwThin = A.px(c, 1.4);

  // Lưới tọa độ mờ định vị không gian
  const gridStep = 240;
  const gx0 = Math.floor(v.x0 / gridStep) * gridStep;
  const gy0 = Math.floor(v.y0 / gridStep) * gridStep;
  c.save();
  c.strokeStyle = P.bg2;
  c.lineWidth = lwThin;
  c.beginPath();
  for (let x = gx0; x <= v.x1; x += gridStep) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  for (let y = gy0; y <= v.y1; y += gridStep) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  c.stroke();
  c.restore();

  // Mảng đồi bình độ làm mốc địa hình
  if (opts.ridge !== false) {
    A.ellipse(c, -360, -240, 260, 140, -0.2, P.bg2, P.light, lw);
    A.ellipse(c, -360, -240, 160, 82, -0.2, P.bg, P.light, lwThin);
    A.ellipse(c, 420, 250, 290, 150, 0.15, P.bg2, P.light, lw);
    A.ellipse(c, 420, 250, 175, 86, 0.15, P.bg, P.light, lwThin);
  }

  // Đường bờ biển nếu là cảnh tàu biển / dẫn đường
  if (opts.coast) {
    const pts: A.Pt[] = [
      [v.x0, 240],
      [-500, 210],
      [-120, 275],
      [280, 225],
      [680, 260],
      [v.x1, 240],
      [v.x1, v.y1],
      [v.x0, v.y1],
    ];
    A.poly(c, pts, P.bg2, P.light, lw);
  }

  // Trục đường giao thông chính
  if (opts.roadY !== undefined) {
    const ry = opts.roadY;
    A.line(
      c,
      [
        [v.x0, ry + 30],
        [-280, ry - 10],
        [240, ry + 20],
        [v.x1, ry - 20],
      ],
      P.bg2,
      A.px(c, 22)
    );
    A.line(
      c,
      [
        [v.x0, ry + 30],
        [-280, ry - 10],
        [240, ry + 20],
        [v.x1, ry - 20],
      ],
      P.light,
      lw,
      [A.px(c, 12), A.px(c, 10)]
    );
  }
}

// ── 1. TÊN LỬA HÀNH TRÌNH (CRUISE MISSILE) ─────────────────────────

export interface CruiseMissileOpts {
  view?: ViewMode;
  scale?: number;
  gpsState?: 'ok' | 'jammed' | 'spoofed' | 'active';
  imuState?: 'idle' | 'active';
  camState?: 'idle' | 'active';
  finDeflect?: number; // góc lệch cánh lái đuôi (-1..1)
  thrust?: number;     // 0..1
  highlightPart?: 'none' | 'receiver' | 'imu' | 'camera' | 'all';
}

export function drawCruiseMissile(c: CanvasRenderingContext2D, opts: CruiseMissileOpts = {}) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const fin = opts.finDeflect ?? 0;
  const thrust = opts.thrust ?? 1;

  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  if (view === 'top') {
    // Luồng lửa đẩy phía sau
    if (thrust > 0) {
      A.poly(
        c,
        [[-145, -8], [-195 - thrust * 25, 0], [-145, 8]],
        P.amber,
        null,
        0
      );
    }
    // Cánh chính sải rộng
    A.poly(
      c,
      [[-20, -18], [-55, -115], [-85, -110], [-58, -18]],
      P.oliveLight,
      P.ink,
      lwO
    );
    A.poly(
      c,
      [[-20, 18], [-55, 115], [-85, 110], [-58, 18]],
      P.oliveLight,
      P.ink,
      lwO
    );
    // Cánh đuôi ngang
    A.poly(
      c,
      [[-115, -14], [-142, -52 + fin * 8], [-152, -46 + fin * 8], [-138, -14]],
      P.oliveDark,
      P.ink,
      lwO
    );
    A.poly(
      c,
      [[-115, 14], [-142, 52 + fin * 8], [-152, 46 + fin * 8], [-138, 14]],
      P.oliveDark,
      P.ink,
      lwO
    );
    // Thân trụ tên lửa
    c.beginPath();
    c.moveTo(-145, -20);
    c.lineTo(85, -20);
    c.quadraticCurveTo(138, -18, 160, 0);
    c.quadraticCurveTo(138, 18, 85, 20);
    c.lineTo(-145, 20);
    c.closePath();
    A.fs(c, P.olive, P.ink, lwO);

    // Nắp anten thu vệ tinh trên lưng
    const gpsCol =
      opts.gpsState === 'jammed'
        ? P.enemy
        : opts.gpsState === 'spoofed'
        ? P.amber
        : P.sky;
    A.ellipse(c, 35, 0, 22, 10, 0, gpsCol, P.ink, lwI);
    A.line(c, [[-90, -18], [-90, 18]], P.ink, lwI);
    c.restore();
    return;
  }

  // SIDE & CUTAWAY VIEW
  if (thrust > 0) {
    A.poly(
      c,
      [[-148, -10], [-205 - thrust * 30, 0], [-148, 10]],
      P.amber,
      null,
      0
    );
    A.poly(
      c,
      [[-148, -5], [-180 - thrust * 16, 0], [-148, 5]],
      P.white,
      null,
      0
    );
  }

  // Cửa hút gió dưới bụng
  A.poly(
    c,
    [[-35, 22], [-5, 22], [-18, 42], [-52, 42]],
    P.oliveDark,
    P.ink,
    lwO
  );

  // Cánh đuôi đứng và ngang (có góc lệch finDeflect)
  A.poly(
    c,
    [[-112, -22], [-138, -68 + fin * 10], [-152, -64 + fin * 10], [-142, -22]],
    P.oliveDark,
    P.ink,
    lwO
  );
  A.poly(
    c,
    [[-118, 22], [-140, 56 - fin * 10], [-152, 52 - fin * 10], [-142, 22]],
    P.oliveDark,
    P.ink,
    lwO
  );

  // Thân chính tên lửa
  c.beginPath();
  c.moveTo(-148, -24);
  c.lineTo(88, -24);
  c.quadraticCurveTo(145, -22, 172, 0);
  c.quadraticCurveTo(145, 22, 88, 24);
  c.lineTo(-148, 24);
  c.closePath();
  A.fs(c, P.olive, P.ink, lwO);

  // Đường sống lưng sáng
  A.poly(
    c,
    [[-144, -22], [86, -22], [136, -10], [-144, -10]],
    P.oliveLight,
    null,
    0
  );

  // Cánh nâng giữa thân (nhìn ngang)
  A.poly(
    c,
    [[-58, 2], [8, 2], [-12, 18], [-74, 16]],
    P.oliveDark,
    P.ink,
    lwO
  );

  // Anten thu vệ tinh trên lưng (luôn thấy để giữ dấu nhận dạng)
  const gpsCol =
    opts.gpsState === 'jammed'
      ? P.enemy
      : opts.gpsState === 'spoofed'
      ? P.amber
      : P.sky;
  A.rrect(c, 22, -32, 46, 10, 4, gpsCol, P.ink, lwI);

  // Nếu là CUTAWAY: mở khoang trong thân hiển thị 3 hệ thống dẫn đường
  if (view === 'cutaway') {
    A.rrect(c, -45, -19, 178, 38, 8, P.paper, P.ink, lwI);

    // 1) Khoang Bộ thu vệ tinh (Receiver: x = 15..68)
    const rxFill =
      opts.highlightPart === 'receiver' || opts.highlightPart === 'all'
        ? gpsCol
        : P.bg2;
    A.rrect(c, 16, -15, 52, 30, 4, rxFill, P.ink, lwI);
    // Đường dẫn từ anten lưng xuống chip thu
    A.line(c, [[42, -22], [42, -15]], P.ink, lwI);
    // Sóng mẫu nhỏ trong bộ thu
    A.line(
      c,
      [[22, 0], [30, 0], [30, -8], [40, -8], [40, 8], [50, 8], [50, 0], [62, 0]],
      opts.gpsState === 'jammed' ? P.enemy : P.ink,
      lwI
    );

    // 2) Khoang Quán tính IMU/INS (Gyroscope: x = -40..10)
    const imuActive = opts.imuState === 'active' || opts.highlightPart === 'imu' || opts.highlightPart === 'all';
    A.rrect(c, -40, -15, 50, 30, 4, imuActive ? P.amber : P.bg2, P.ink, lwI);
    A.circle(c, -15, 0, 11, P.white, P.ink, lwI);
    A.ellipse(c, -15, 0, 11, 4.5, 0.4, null, P.ink, lwI);
    A.ellipse(c, -15, 0, 4.5, 11, 0.4, null, P.ink, lwI);

    // 3) Khoang Camera đối chiếu địa hình ở mũi dưới (Camera: x = 74..128)
    const camActive = opts.camState === 'active' || opts.highlightPart === 'camera' || opts.highlightPart === 'all';
    A.rrect(c, 74, -14, 52, 28, 4, camActive ? P.sky : P.bg2, P.ink, lwI);
    // Thấu kính nhìn xuống dưới bụng mũi
    A.circle(c, 102, 14, 8, P.glass, P.ink, lwI);
    A.circle(c, 102, 14, 3.5, P.dark, null, 0);

    // Đường cáp điều khiển nối về cánh lái đuôi
    A.line(c, [[-40, 0], [-128, 0], [-134, -22]], P.ink2, lwI, [A.px(c, 5), A.px(c, 4)]);
  } else {
    // Vạch ghép khoang thân ngoài
    A.line(c, [[82, -23], [82, 23]], P.ink, lwI);
    A.line(c, [[-95, -23], [-95, 23]], P.ink, lwI);
  }

  c.restore();
}

// ── 2. VỆ TINH DẪN ĐƯỜNG (SATELLITE) ───────────────────────────────

export function drawSatellite(
  c: CanvasRenderingContext2D,
  opts: { view?: ViewMode; scale?: number; emitting?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  // Hai cánh pin mặt trời
  for (const dir of [-1, 1]) {
    const x0 = dir * 32;
    const w = dir * 92;
    A.line(c, [[dir * 22, 0], [x0, 0]], P.ink, lwO);
    A.rrect(
      c,
      dir < 0 ? x0 + w : x0,
      -18,
      Math.abs(w),
      36,
      4,
      P.sky,
      P.ink,
      lwO
    );
    // Đường chia ô pin mặt trời
    for (let i = 1; i <= 3; i++) {
      const gx = x0 + (w * i) / 4;
      A.line(c, [[gx, -17], [gx, 17]], P.ink, lwI);
    }
    A.line(c, [[x0, 0], [x0 + w, 0]], P.ink, lwI);
  }

  // Thân hộp vệ tinh
  A.rrect(c, -24, -24, 48, 48, 6, P.slate, P.ink, lwO);
  A.rrect(c, -16, -16, 32, 32, 3, P.light, P.ink, lwI);

  // Chảo phát sóng hướng xuống
  A.poly(c, [[-18, 24], [18, 24], [26, 38], [-26, 38]], P.dark, P.ink, lwO);
  A.line(c, [[0, 38], [0, 50]], P.ink, lwO);
  A.circle(c, 0, 52, 5, opts.emitting !== false ? P.sky : P.slate, P.ink, lwI);

  c.restore();
}

// ── 3. MÁY PHÁT NHIỄU HỘP CƠM TRƯA (LUNCHBOX JAMMER) ───────────────

export function drawLunchboxJammer(
  c: CanvasRenderingContext2D,
  opts: { view?: ViewMode; scale?: number; active?: boolean; showHelmetScale?: boolean } = {}
) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const active = opts.active ?? true;

  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  if (view === 'top') {
    A.rrect(c, -28, -18, 56, 36, 6, P.enemy, P.ink, lwO);
    A.rrect(c, -20, -10, 40, 20, 3, P.enemyLight, P.ink, lwI);
    A.circle(c, 14, 0, 6, active ? P.amber : P.dark, P.ink, lwI);
    c.restore();
    return;
  }

  // Vật đối chiếu kích thước: Mũ sắt lính đặt ngay cạnh để thấy hộp chỉ cỡ hộp cơm trưa
  if (opts.showHelmetScale !== false) {
    c.save();
    c.translate(-78, 0);
    c.beginPath();
    c.arc(0, -4, 28, Math.PI, 0);
    c.lineTo(32, 0);
    c.lineTo(-32, 0);
    c.closePath();
    A.fs(c, P.oliveDark, P.ink, lwO);
    A.line(c, [[-28, -8], [28, -8]], P.ink, lwI);
    c.restore();
  }

  // Quai xách hộp cơm
  A.rrect(c, -14, -44, 28, 12, 4, P.bg, P.ink, lwO);
  // Anten cần phát nhiễu
  A.line(c, [[16, -34], [16, -96]], P.ink, lwO);
  A.circle(c, 16, -98, 6, active ? P.enemy : P.slate, P.ink, lwI);

  // Thân hộp nhỏ cỡ hộp cơm trưa
  A.rrect(c, -32, -34, 64, 34, 6, P.enemy, P.ink, lwO);
  A.line(c, [[-31, -22], [31, -22]], P.ink, lwI);
  // Khóa gài & đèn báo nguồn
  A.rrect(c, -18, -26, 8, 10, 2, P.light, P.ink, lwI);
  A.rrect(c, 10, -26, 8, 10, 2, P.light, P.ink, lwI);
  A.circle(c, 0, -11, 5, active ? P.amber : P.dark, P.ink, lwI);

  c.restore();
}

// ── 4. TRẠM TÁC CHIẾN ĐIỆN TỬ MẶT ĐẤT (GROUND EW / SPOOFER / LISTENER) ──

export function drawGroundStation(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    scale?: number;
    role?: 'listener' | 'jammer' | 'spoofer';
    team?: 'ally' | 'enemy';
    dishAngle?: number;
    active?: boolean;
  } = {}
) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const role = opts.role ?? 'listener';
  const team = opts.team ?? (role === 'listener' ? 'ally' : 'enemy');
  const bodyCol = team === 'ally' ? P.olive : P.enemy;
  const topCol = team === 'ally' ? P.oliveLight : P.enemyLight;
  const sigCol = role === 'spoofer' ? P.amber : team === 'ally' ? P.sky : P.enemy;
  const ang = opts.dishAngle ?? -0.4;

  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  if (view === 'top') {
    // Thân xe / trạm container nhìn từ trên xuống
    A.rrect(c, -48, -26, 96, 52, 8, bodyCol, P.ink, lwO);
    A.rrect(c, -36, -18, 52, 36, 4, topCol, P.ink, lwI);
    // Đĩa / dàn anten xoay trên nóc
    c.save();
    c.translate(18, 0);
    c.rotate(ang);
    A.rrect(c, -6, -22, 12, 44, 4, P.slate, P.ink, lwO);
    A.circle(c, 8, 0, 5, opts.active !== false ? sigCol : P.dark, P.ink, lwI);
    c.restore();
    c.restore();
    return;
  }

  // SIDE VIEW
  // Bánh xe
  for (const wx of [-38, 0, 38]) {
    A.circle(c, wx, -14, 14, P.dark, P.ink, lwO);
    A.circle(c, wx, -14, 5, P.light, P.ink, lwI);
  }
  // Thùng xe tác chiến điện tử
  A.rrect(c, -58, -64, 116, 48, 6, bodyCol, P.ink, lwO);
  A.rrect(c, -46, -54, 42, 24, 3, P.glass, P.ink, lwI);
  A.rrect(c, 8, -54, 38, 28, 3, topCol, P.ink, lwI);

  // Trụ anten trên nóc
  A.rrect(c, -8, -88, 16, 24, 2, P.slate, P.ink, lwO);
  c.save();
  c.translate(0, -88);
  c.rotate(ang);
  // Chảo parabol thu/phát
  c.beginPath();
  c.arc(0, 0, 26, -Math.PI * 0.45, Math.PI * 0.45);
  A.fs(c, P.light, P.ink, lwO);
  A.line(c, [[8, 0], [28, 0]], P.ink, lwO);
  A.circle(c, 30, 0, 5.5, opts.active !== false ? sigCol : P.dark, P.ink, lwI);
  c.restore();

  c.restore();
}

// ── 5. ĐÀI RADAR PHÒNG KHÔNG & BỆ PHÓNG SAM (SAM RADAR SITE) ───────

export function drawSamRadarSite(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    scale?: number;
    dishAngle?: number;
    missilesLeft?: number;
    blinded?: boolean;
  } = {}
) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const ang = opts.dishAngle ?? -2.4;
  const missiles = opts.missilesLeft ?? 2;

  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  if (view === 'top') {
    // Bệ radar trung tâm
    A.rrect(c, -44, -34, 88, 68, 8, P.enemy, P.ink, lwO);
    A.circle(c, 0, 0, 24, P.enemyLight, P.ink, lwI);
    c.save();
    c.rotate(ang);
    A.rrect(c, -8, -28, 16, 56, 5, P.slate, P.ink, lwO);
    A.line(c, [[8, 0], [22, 0]], P.ink, lwO);
    c.restore();

    // Bệ phóng SAM đặt cạnh
    c.save();
    c.translate(0, 62);
    A.rrect(c, -36, -18, 72, 36, 6, P.dark, P.ink, lwO);
    if (missiles >= 1) A.rrect(c, -28, -11, 56, 8, 3, P.paper, P.ink, lwI);
    if (missiles >= 2) A.rrect(c, -28, 3, 56, 8, 3, P.paper, P.ink, lwI);
    c.restore();

    c.restore();
    return;
  }

  // SIDE VIEW: Đài radar bên trái + bệ phóng SAM bên phải
  // Thân xe radar
  A.rrect(c, -64, -46, 88, 36, 6, P.enemy, P.ink, lwO);
  for (const wx of [-46, -20, 6]) {
    A.circle(c, wx, -10, 10, P.dark, P.ink, lwO);
  }
  // Tháp chữ A đỡ anten radar
  A.poly(c, [[-36, -46], [-20, -82], [-4, -46]], P.slate, P.ink, lwO);
  c.save();
  c.translate(-20, -84);
  c.rotate(ang * 0.25);
  A.ellipse(c, 0, 0, 12, 28, -0.35, opts.blinded ? P.enemyLight : P.light, P.ink, lwO);
  A.line(c, [[-8, 0], [-26, -8]], P.ink, lwO);
  A.circle(c, -28, -9, 4.5, opts.blinded ? P.enemy : P.amber, P.ink, lwI);
  c.restore();

  // Bệ phóng tên lửa SAM cạnh đài radar
  c.save();
  c.translate(68, 0);
  A.rrect(c, -34, -22, 68, 22, 4, P.dark, P.ink, lwO);
  c.save();
  c.translate(0, -22);
  c.rotate(-0.55); // nghiêng hướng lên phía trái
  A.rrect(c, -42, -14, 72, 12, 3, P.slate, P.ink, lwO);
  if (missiles >= 1) {
    A.poly(
      c,
      [[-46, -16], [18, -16], [18, -26], [-34, -26]],
      P.paper,
      P.ink,
      lwO
    );
    A.poly(c, [[-46, -16], [-62, -21], [-46, -26]], P.enemy, P.ink, lwI);
  }
  c.restore();
  c.restore();

  c.restore();
}

/** Đạn tên lửa phòng không (SAM) hoặc tên lửa diệt bức xạ (HARM). */
export function drawSamMissile(
  c: CanvasRenderingContext2D,
  opts: { scale?: number; color?: string; thrust?: number } = {}
) {
  const s = opts.scale ?? 1;
  const col = opts.color ?? P.paper;
  const thrust = opts.thrust ?? 1;
  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  if (thrust > 0) {
    A.poly(c, [[-46, -6], [-82 - thrust * 18, 0], [-46, 6]], P.amber, null, 0);
  }
  A.poly(c, [[-46, -8], [26, -8], [48, 0], [26, 8], [-46, 8]], col, P.ink, lwO);
  A.poly(c, [[26, -8], [48, 0], [26, 8]], P.enemy, P.ink, lwO);
  A.poly(c, [[-44, -8], [-54, -20], [-34, -8]], P.slate, P.ink, lwO);
  A.poly(c, [[-44, 8], [-54, 20], [-34, 8]], P.slate, P.ink, lwO);
  c.restore();
}

// ── 6. TIÊM KÍCH CHIẾN ĐẤU (STRIKE JET) ────────────────────────────

export function drawStrikeJet(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    scale?: number;
    ghost?: boolean; // mục tiêu giả do DRFM deception tạo ra
    rwrAlert?: boolean;
    chaffBayOpen?: boolean;
  } = {}
) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const ghost = opts.ghost ?? false;

  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  if (ghost) {
    c.setLineDash([A.px(c, 10), A.px(c, 7)]);
  }

  const bodyFill = ghost ? 'rgba(245,158,11,0.22)' : P.olive;
  const wingFill = ghost ? 'rgba(245,158,11,0.16)' : P.oliveLight;
  const darkFill = ghost ? 'rgba(245,158,11,0.28)' : P.oliveDark;
  const strokeCol = ghost ? P.amber : P.ink;

  if (view === 'top') {
    // Luồng phản lực
    if (!ghost) {
      A.poly(c, [[-118, -9], [-152, 0], [-118, 9]], P.amber, null, 0);
    }
    // Cánh tam giác mở rộng
    A.poly(
      c,
      [[18, -16], [-52, -96], [-86, -92], [-66, -16]],
      wingFill,
      strokeCol,
      lwO
    );
    A.poly(
      c,
      [[18, 16], [-52, 96], [-86, 92], [-66, 16]],
      wingFill,
      strokeCol,
      lwO
    );
    // Cánh đuôi ngang
    A.poly(
      c,
      [[-84, -14], [-116, -48], [-128, -42], [-112, -14]],
      darkFill,
      strokeCol,
      lwO
    );
    A.poly(
      c,
      [[-84, 14], [-116, 48], [-128, 42], [-112, 14]],
      darkFill,
      strokeCol,
      lwO
    );
    // Thân máy bay
    A.poly(
      c,
      [[-118, -16], [48, -16], [126, 0], [48, 16], [-118, 16]],
      bodyFill,
      strokeCol,
      lwO
    );
    // Kính buồng lái
    A.ellipse(c, 36, 0, 28, 9, 0, ghost ? wingFill : P.glass, strokeCol, lwI);
    if (opts.rwrAlert) {
      A.circle(c, 42, 0, 6, P.amber, P.ink, lwI);
    }
    c.restore();
    return;
  }

  // SIDE / CUTAWAY VIEW
  if (!ghost) {
    A.poly(c, [[-122, -8], [-158, 2], [-122, 12]], P.amber, null, 0);
  }
  // Cánh đứng đuôi
  A.poly(
    c,
    [[-68, -14], [-106, -68], [-124, -64], [-112, -14]],
    darkFill,
    strokeCol,
    lwO
  );
  // Thân tiêm kích
  c.beginPath();
  c.moveTo(-122, -16);
  c.lineTo(38, -18);
  c.lineTo(132, 4);
  c.lineTo(42, 18);
  c.lineTo(-122, 16);
  c.closePath();
  A.fs(c, bodyFill, strokeCol, lwO);

  // Vòm kính buồng lái
  c.beginPath();
  c.moveTo(4, -17);
  c.quadraticCurveTo(38, -42, 74, -10);
  c.closePath();
  A.fs(c, ghost ? wingFill : P.glass, strokeCol, lwO);

  // Đầu phi công & mũ bay bên trong buồng lái
  if (!ghost) {
    A.circle(c, 36, -21, 7, P.oliveDark, P.ink, lwI);
    if (opts.rwrAlert) {
      // Sóng âm thanh RWR báo trong mũ phi công
      A.circle(c, 36, -21, 13, null, P.amber, lwI);
    }
  }

  // Cánh chính nhìn ngang
  A.poly(c, [[-54, 4], [18, 4], [-8, 16], [-72, 14]], wingFill, strokeCol, lwO);

  // Nếu là cutaway: hiện khoang mở từ mũi tới đuôi (RWR nối tai nghe phi công + hộp phóng mồi bẫy/chaff ở đuôi)
  if (view === 'cutaway' && !ghost) {
    A.rrect(c, 44, -9, 44, 19, 4, P.paper, P.ink, lwI);
    A.rrect(c, 48, -6, 22, 13, 2, P.amber, P.ink, lwI);
    // Đường tín hiệu RWR nối lên tai nghe phi công
    A.line(c, [[59, -6], [42, -18]], P.amber, lwI);
    // Khoang phóng Chaff / Decoy ở đuôi
    A.rrect(c, -112, -11, 44, 21, 4, P.paper, P.ink, lwI);
    for (const cx of [-105, -95, -85, -75]) {
      A.rrect(c, cx, -8, 6, 15, 1.5, cx < -90 ? P.sky : P.amber, P.ink, lwI);
    }
  }

  c.restore();
}

// ── 7. MÁY BAY GÂY NHIỄU TẦM XA CHUYÊN DỤNG (STANDOFF JAMMER JET) ──

export function drawStandoffJammerJet(
  c: CanvasRenderingContext2D,
  opts: { view?: ViewMode; scale?: number; podsActive?: boolean } = {}
) {
  const view = opts.view ?? 'side';
  const s = opts.scale ?? 1;
  const active = opts.podsActive ?? true;

  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  if (view === 'top') {
    // Cánh chính
    A.poly(
      c,
      [[22, -18], [-48, -112], [-82, -108], [-62, -18]],
      P.oliveLight,
      P.ink,
      lwO
    );
    A.poly(
      c,
      [[22, 18], [-48, 112], [-82, 108], [-62, 18]],
      P.oliveLight,
      P.ink,
      lwO
    );
    // Cánh đuôi
    A.poly(c, [[-88, -16], [-122, -54], [-134, -48], [-116, -16]], P.oliveDark, P.ink, lwO);
    A.poly(c, [[-88, 16], [-122, 54], [-134, 48], [-116, 16]], P.oliveDark, P.ink, lwO);
    // Thân lớn 2 chỗ ngồi
    A.poly(
      c,
      [[-126, -18], [56, -18], [138, 0], [56, 18], [-126, 18]],
      P.olive,
      P.ink,
      lwO
    );
    // Buồng lái đôi dài
    A.ellipse(c, 38, 0, 36, 10, 0, P.glass, P.ink, lwI);

    // DẤU NHẬN DẠNG QUAN TRỌNG: 2 Pod ở đầu mút cánh (wingtip pods) + 2 Pod dưới cánh
    const podCol = active ? P.amber : P.slate;
    for (const wy of [-112, 112]) {
      A.rrect(c, -86, wy - 7, 54, 14, 6, podCol, P.ink, lwO);
    }
    for (const wy of [-58, 58]) {
      A.rrect(c, -48, wy - 8, 62, 16, 7, podCol, P.ink, lwO);
      // Cánh quạt RAT nhỏ ở mũi pod
      A.line(c, [[16, wy - 9], [16, wy + 9]], P.ink, lwI);
    }
    c.restore();
    return;
  }

  // SIDE VIEW: nổi bật bầu pod thu-phát trên đỉnh đuôi đứng + pod lớn dưới cánh và đầu mút cánh
  const podCol = active ? P.amber : P.slate;

  // Cánh đuôi đứng có bầu anten EW đặc trưng trên đỉnh (kiểu EF-111 / EA-18G)
  A.poly(c, [[-72, -16], [-108, -74], [-128, -70], [-116, -16]], P.oliveDark, P.ink, lwO);
  A.rrect(c, -132, -82, 42, 12, 6, podCol, P.ink, lwO);

  // Thân máy bay
  c.beginPath();
  c.moveTo(-128, -18);
  c.lineTo(48, -20);
  c.lineTo(142, 4);
  c.lineTo(50, 18);
  c.lineTo(-128, 16);
  c.closePath();
  A.fs(c, P.olive, P.ink, lwO);

  // Buồng lái 2 phi công (Pilot + EWO)
  c.beginPath();
  c.moveTo(-4, -19);
  c.quadraticCurveTo(38, -46, 86, -10);
  c.closePath();
  A.fs(c, P.glass, P.ink, lwO);
  A.circle(c, 20, -22, 6.5, P.oliveDark, P.ink, lwI);
  A.circle(c, 52, -20, 6.5, P.oliveDark, P.ink, lwI);

  // Cánh chính
  A.poly(c, [[-56, 2], [24, 2], [-4, 14], [-74, 12]], P.oliveLight, P.ink, lwO);

  // Pod gây nhiễu công suất lớn treo dưới cánh (ALQ-99 style với chong chóng phát điện ở mũi)
  A.rrect(c, -48, 12, 12, 10, 2, P.slate, P.ink, lwI);
  A.rrect(c, -46, 20, 78, 18, 8, podCol, P.ink, lwO);
  A.line(c, [[35, 19], [35, 39]], P.ink, lwO);

  // Pod ở đầu mút cánh (wingtip pod)
  A.rrect(c, -78, 6, 52, 12, 5, podCol, P.ink, lwO);

  c.restore();
}

// ── 8. CHAFF (ĐÁM MÂY SỢI KIM LOẠI) & DECOY (MỒI BẪY CÓ ĐỘNG CƠ) ───

export function drawChaffCloud(
  c: CanvasRenderingContext2D,
  opts: { spread?: number; count?: number; highlightWavelength?: boolean } = {}
) {
  const spread = opts.spread ?? 1;
  const count = opts.count ?? 36;
  const lwI = A.px(c, LINE.inner);

  c.save();
  // Vùng mây tán xạ
  A.ellipse(
    c,
    0,
    0,
    85 * spread,
    52 * spread,
    0,
    'rgba(203,213,225,0.45)',
    P.slate,
    lwI
  );

  // Các sợi kim loại cắt theo bước sóng
  for (let i = 0; i < count; i++) {
    const rx = (A.rnd(i * 3.1 + 1) - 0.5) * 145 * spread;
    const ry = (A.rnd(i * 7.3 + 2) - 0.5) * 84 * spread;
    const ang = A.rnd(i * 5.7 + 3) * Math.PI;
    const len = 12;
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    const col = i % 3 === 0 ? P.amber : i % 2 === 0 ? P.sky : P.ink;
    A.line(c, [[rx - dx, ry - dy], [rx + dx, ry + dy]], col, lwI);
  }
  c.restore();
}

export function drawAirDecoy(
  c: CanvasRenderingContext2D,
  opts: { scale?: number; showMimicSignature?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  // Bóng chữ ký máy bay lớn bao quanh mồi bẫy để người xem thấy rõ "mimic the signature of a larger one"
  if (opts.showMimicSignature) {
    c.save();
    c.scale(0.85, 0.85);
    drawStrikeJet(c, { view: 'side', ghost: true });
    c.restore();
  }

  // Thân máy bay mồi bẫy nhỏ có động cơ (MALD)
  A.poly(c, [[-34, -4], [-48, 0], [-34, 4]], P.amber, null, 0);
  A.rrect(c, -34, -8, 68, 16, 6, P.amber, P.ink, lwO);
  A.poly(c, [[-8, 0], [-20, 18], [-28, 16], [-18, 0]], P.oliveLight, P.ink, lwI);
  A.poly(c, [[-26, -8], [-34, -18], [-22, -8]], P.dark, P.ink, lwI);

  c.restore();
}

// ── 9. UAV CHIẾN THUẬT / FPV DRONE & TÀU BIỂN ──────────────────────

export function drawTacticalDrone(
  c: CanvasRenderingContext2D,
  opts: { view?: ViewMode; scale?: number; spoofed?: boolean } = {}
) {
  const view = opts.view ?? 'top';
  const s = opts.scale ?? 1;
  const sigCol = opts.spoofed ? P.amber : P.sky;

  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  if (view === 'top') {
    // 4 tay đỡ cánh quạt quadcopter / UAV
    for (const [dx, dy] of [
      [-28, -28],
      [28, -28],
      [-28, 28],
      [28, 28],
    ] as A.Pt[]) {
      A.line(c, [[0, 0], [dx, dy]], P.ink, lwO);
      A.circle(c, dx, dy, 16, P.bg2, P.ink, lwI);
      A.circle(c, dx, dy, 4, P.dark, P.ink, lwI);
    }
    A.rrect(c, -18, -12, 36, 24, 6, P.olive, P.ink, lwO);
    A.circle(c, 0, 0, 6, sigCol, P.ink, lwI);
    // Mũi chỉ hướng bay (+x)
    A.poly(c, [[18, -6], [28, 0], [18, 6]], P.amber, P.ink, lwI);
    c.restore();
    return;
  }

  // SIDE VIEW
  A.rrect(c, -26, -8, 52, 16, 6, P.olive, P.ink, lwO);
  A.line(c, [[-22, -8], [-22, -16]], P.ink, lwO);
  A.line(c, [[22, -8], [22, -16]], P.ink, lwO);
  A.line(c, [[-38, -16], [-6, -16]], P.ink, lwO);
  A.line(c, [[6, -16], [38, -16]], P.ink, lwO);
  // Anten thu trên lưng
  A.circle(c, 0, -10, 5, sigCol, P.ink, lwI);
  // Camera dưới bụng
  A.circle(c, 14, 10, 5, P.glass, P.ink, lwI);
  c.restore();
}

export function drawShipTop(
  c: CanvasRenderingContext2D,
  opts: { scale?: number; ghost?: boolean } = {}
) {
  const s = opts.scale ?? 1;
  const ghost = opts.ghost ?? false;
  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  if (ghost) c.setLineDash([A.px(c, 8), A.px(c, 6)]);
  A.poly(
    c,
    [[-64, -18], [38, -18], [68, 0], [38, 18], [-64, 18]],
    ghost ? 'rgba(245,158,11,0.2)' : P.slate,
    ghost ? P.amber : P.ink,
    lwO
  );
  A.rrect(c, -36, -11, 44, 22, 4, ghost ? 'rgba(245,158,11,0.3)' : P.paper, ghost ? P.amber : P.ink, lwI);
  c.restore();
}

// ── 10. XE CHỈ HUY (MOBILE HQ) & NGƯỜI LÍNH TÁC CHIẾN ĐIỆN TỬ ──────

export function drawMobileHQ(
  c: CanvasRenderingContext2D,
  opts: {
    view?: ViewMode;
    scale?: number;
    emitting?: boolean;
    silentGhost?: boolean;
  } = {}
) {
  const view = opts.view ?? 'top';
  const s = opts.scale ?? 1;
  const ghost = opts.silentGhost ?? false;

  c.save();
  c.scale(s, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  if (ghost) c.setLineDash([A.px(c, 8), A.px(c, 6)]);

  if (view === 'top') {
    A.rrect(
      c,
      -44,
      -22,
      88,
      44,
      6,
      ghost ? 'rgba(125,139,90,0.28)' : P.olive,
      P.ink,
      lwO
    );
    A.rrect(c, -36, -16, 48, 32, 4, P.oliveLight, P.ink, lwI);
    A.rrect(c, 16, -15, 22, 30, 3, P.oliveDark, P.ink, lwI);
    A.circle(
      c,
      -12,
      0,
      7,
      opts.emitting ? P.sky : P.slate,
      P.ink,
      lwI
    );
    c.restore();
    return;
  }

  // SIDE VIEW
  for (const wx of [-28, 24]) {
    A.circle(c, wx, -12, 12, P.dark, P.ink, lwO);
  }
  A.rrect(c, -48, -52, 66, 38, 5, P.olive, P.ink, lwO);
  A.rrect(c, 18, -42, 26, 28, 4, P.oliveDark, P.ink, lwO);
  A.rrect(c, 24, -38, 16, 12, 2, P.glass, P.ink, lwI);
  // Cột anten thu phát
  A.line(c, [[-24, -52], [-24, -96]], P.ink, lwO);
  A.circle(c, -24, -98, 5, opts.emitting ? P.sky : P.slate, P.ink, lwI);
  c.restore();
}

export function drawSoldierEW(
  c: CanvasRenderingContext2D,
  opts: {
    scale?: number;
    team?: 'ally' | 'enemy';
    role?: 'drone_op' | 'df_hunter' | 'operator';
    facing?: 1 | -1;
    alert?: boolean;
  } = {}
) {
  const s = opts.scale ?? 1;
  const team = opts.team ?? 'ally';
  const role = opts.role ?? 'drone_op';
  const dir = opts.facing ?? (team === 'ally' ? 1 : -1);
  const coatCol = team === 'ally' ? P.olive : P.enemy;
  const helmCol = team === 'ally' ? P.oliveDark : P.dark;

  c.save();
  c.scale(s * dir, s);
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  // Chân
  A.capsule(c, [-8, -36], [-14, 0], 11, coatCol, P.ink, lwO);
  A.capsule(c, [8, -36], [14, 0], 11, coatCol, P.ink, lwO);
  // Thân áo giáp
  A.rrect(c, -16, -78, 32, 44, 8, coatCol, P.ink, lwO);
  // Đầu & mũ sắt
  A.circle(c, 0, -92, 12, P.skin, P.ink, lwO);
  c.beginPath();
  c.arc(0, -94, 14, Math.PI, 0);
  c.closePath();
  A.fs(c, helmCol, P.ink, lwO);

  if (role === 'drone_op') {
    // Tay cầm bộ điều khiển UAV + máy báo nhiễu nhỏ đeo ngực/cầm tay
    A.capsule(c, [4, -68], [26, -54], 9, coatCol, P.ink, lwO);
    A.rrect(c, 22, -64, 18, 14, 3, P.dark, P.ink, lwI);
    A.line(c, [[34, -64], [38, -82]], P.ink, lwI);
    // Thiết bị nhỏ báo nhiễu (spectrum warning detector)
    A.rrect(
      c,
      8,
      -84,
      14,
      12,
      3,
      opts.alert ? P.amber : P.sky,
      P.ink,
      lwI
    );
    A.line(c, [[15, -84], [15, -96]], P.ink, lwI);
  } else if (role === 'df_hunter') {
    // Tay cầm anten Yagi / máy dò hướng người lái UAV đối phương
    A.capsule(c, [4, -68], [28, -58], 9, coatCol, P.ink, lwO);
    A.rrect(c, 20, -68, 18, 14, 3, P.dark, P.ink, lwI);
    A.line(c, [[38, -61], [68, -61]], P.ink, lwO);
    for (const ax of [44, 54, 64]) {
      A.line(c, [[ax, -72], [ax, -50]], opts.alert ? P.enemy : P.amber, lwI);
    }
  }

  c.restore();
}

// ── 11. MÀN HÌNH CƠ CHẾ: RWR, RADAR SCOPE, PHỔ TẦN & THƯ VIỆN ──────

/** Đồng hồ cảnh báo radar trong buồng lái (RWR Scope). */
export function drawRwrScope(
  c: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    r: number;
    threatAngle?: number; // radian từ tâm tới đài radar địch
    alertLevel?: number;  // 0..1
  }
) {
  const { x, y, r } = opts;
  const ang = opts.threatAngle ?? 0.45;
  const alert = opts.alertLevel ?? 1;
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  c.save();
  c.translate(x, y);

  // Vỏ đồng hồ RWR
  A.circle(c, 0, 0, r + 10, P.dark, P.ink, lwO);
  A.circle(c, 0, 0, r, P.paper, P.ink, lwO);
  A.circle(c, 0, 0, r * 0.62, null, P.light, lwI);
  A.circle(c, 0, 0, r * 0.28, null, P.light, lwI);
  A.line(c, [[-r, 0], [r, 0]], P.light, lwI);
  A.line(c, [[0, -r], [0, r]], P.light, lwI);

  // Biểu tượng máy bay ở tâm
  A.poly(c, [[-12, 0], [14, 0], [0, -8], [0, 8]], P.oliveDark, P.ink, lwI);

  // Tia chỉ hướng (bearing) và ký hiệu đài radar phòng không đối phương
  if (alert > 0.05) {
    const tx = Math.cos(ang) * r * 0.72;
    const ty = Math.sin(ang) * r * 0.72;
    A.line(c, [[0, 0], [tx, ty]], P.amber, lwO, [A.px(c, 6), A.px(c, 5)]);
    // Ký hiệu kim cương cảnh báo radar
    A.poly(
      c,
      [
        [tx, ty - 16],
        [tx + 16, ty],
        [tx, ty + 16],
        [tx - 16, ty],
      ],
      P.enemy,
      P.ink,
      lwI
    );
    A.circle(c, tx, ty, 5, P.amber, null, 0);
  }

  c.restore();
}

/** Màn hình Radar đối phương: hiển thị mục tiêu thật, bão tuyết nhiễu ồn (snowstorm), hoặc mục tiêu giả + cổng bám bị kéo lệch (range gate pull-off). */
export function drawRadarScope(
  c: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    noiseLevel?: number;     // 0..1 (bão tuyết)
    realTargetPos?: A.Pt;    // [-1..1, -1..1]
    falseTargets?: A.Pt[];   // danh sách mục tiêu giả
    gatePos?: A.Pt;          // vị trí cổng bám bắt (tracking gate) của radar
  }
) {
  const { x, y, w, h } = opts;
  const noise = opts.noiseLevel ?? 0;
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  c.save();
  c.translate(x, y);
  A.rrect(c, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 12, P.dark, P.ink, lwO);
  A.rrect(c, -w / 2, -h / 2, w, h, 8, P.paper, P.ink, lwI);

  // Lưới cự ly và góc phương vị
  for (const frac of [-0.25, 0, 0.25]) {
    A.line(c, [[-w / 2, h * frac], [w / 2, h * frac]], P.bg2, lwI);
    A.line(c, [[w * frac, -h / 2], [w * frac, h / 2]], P.bg2, lwI);
  }

  // Mục tiêu thật (màu xanh/olive)
  if (opts.realTargetPos) {
    const [rx, ry] = opts.realTargetPos;
    const px = rx * (w * 0.42);
    const py = ry * (h * 0.42);
    A.circle(c, px, py, 9, P.olive, P.ink, lwI);
  }

  // Các mục tiêu giả (do DRFM / Chaff / Decoy tạo ra)
  if (opts.falseTargets) {
    for (const [fx, fy] of opts.falseTargets) {
      const px = fx * (w * 0.42);
      const py = fy * (h * 0.42);
      A.circle(c, px, py, 9, P.amber, P.ink, lwI);
    }
  }

  // Cổng bám bắt (Tracking gate) của đài radar
  if (opts.gatePos) {
    const [gx, gy] = opts.gatePos;
    const px = gx * (w * 0.42);
    const py = gy * (h * 0.42);
    const gs = 18;
    A.rrect(c, px - gs, py - gs, gs * 2, gs * 2, 3, null, P.enemy, lwO);
  }

  // Bão tuyết nhiễu ồn (Snowstorm jamming)
  if (noise > 0.02) {
    const nDots = Math.floor(85 * noise);
    for (let i = 0; i < nDots; i++) {
      const nx = (A.rnd(i * 4.1 + 11) - 0.5) * (w - 18);
      const ny = (A.rnd(i * 6.7 + 23) - 0.5) * (h - 18);
      const nw = 8 + A.rnd(i * 2.3) * 22;
      A.line(
        c,
        [[nx - nw / 2, ny], [nx + nw / 2, ny]],
        i % 2 === 0 ? P.enemy : P.enemyLight,
        lwO
      );
    }
  }

  c.restore();
}

// ── 12. HIỆU ỨNG SÓNG, VỤ NỔ & CALLOUT ────────────────────────────

/** Vẽ chuỗi sóng hoặc xung truyền từ điểm A tới điểm B. */
export function drawSignalLink(
  c: CanvasRenderingContext2D,
  a: A.Pt,
  b: A.Pt,
  t: number,
  opts: {
    color?: string;
    mode?: 'pulse' | 'wave' | 'noise' | 'ghost';
    amp?: number;
    speed?: number;
    progress?: number; // 0..1
  } = {}
) {
  const col = opts.color ?? P.sky;
  const mode = opts.mode ?? 'pulse';
  const amp = opts.amp ?? 10;
  const speed = opts.speed ?? 2.2;
  const prog = opts.progress ?? 1;
  if (prog <= 0.01) return;

  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dist = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  const maxLen = dist * A.clamp01(prog);
  const lw = A.px(c, mode === 'noise' ? LINE.outer : LINE.inner);

  c.save();
  c.translate(a[0], a[1]);
  c.rotate(ang);

  if (mode === 'wave' || mode === 'noise') {
    const pts: A.Pt[] = [];
    const step = 12;
    for (let x = 0; x <= maxLen; x += step) {
      const y =
        mode === 'noise'
          ? (A.rnd(Math.floor(x / step) + Math.floor(t * 18) * 13) - 0.5) * amp * 2.4
          : Math.sin(x * 0.07 - t * speed * 5) * amp;
      pts.push([x, y]);
    }
    A.line(c, pts, col, lw);
  } else {
    // Đường trục mảnh + các vòng cung xung di chuyển
    A.line(c, [[0, 0], [maxLen, 0]], col, A.px(c, 1.5), [A.px(c, 8), A.px(c, 8)]);
    const spacing = 64;
    const shift = ((t * speed * 60) % spacing + spacing) % spacing;
    for (let x = shift; x <= maxLen; x += spacing) {
      c.beginPath();
      c.arc(x - 10, 0, 12, -0.65, 0.65);
      A.fs(c, null, col, A.px(c, 3));
    }
  }

  c.restore();
}

/** Vụ nổ 2D tất định theo tiến độ p (0..1). */
export function drawExplosion(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: number,
  radius = 65
) {
  if (p <= 0 || p >= 1) return;
  const lwO = A.px(c, LINE.outer);
  const r = radius * A.eo(p, 0, 0.75);
  const alpha = 1 - A.sm(p, 0.55, 1);

  A.withA(c, alpha, () => {
    // Vòng sóng xung kích
    A.circle(c, x, y, r * 1.25, null, P.amber, lwO);
    // Quả cầu lửa đa giác răng cưa
    const pts: A.Pt[] = [];
    const spikes = 12;
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i * Math.PI) / spikes;
      const rad = i % 2 === 0 ? r : r * 0.58;
      pts.push([x + Math.cos(ang) * rad, y + Math.sin(ang) * rad]);
    }
    A.poly(c, pts, P.enemy, P.ink, lwO);
    A.circle(c, x, y, r * 0.42, P.amber, null, 0);
  });
}

/** Callout ngắn tối giản (chỉ dùng khi thật cần theo Director §6). */
export function drawCallout(
  c: CanvasRenderingContext2D,
  anchorScreen: A.Pt,
  boxScreen: A.Pt,
  text: string,
  alpha = 1
) {
  if (alpha <= 0.01) return;
  A.withA(c, alpha, () => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.font = '700 26px "Inter", "SF Pro Display", system-ui, sans-serif';
    const padX = 16;
    const tw = c.measureText(text).width;
    const bw = tw + padX * 2;
    const bh = 44;
    const bx = boxScreen[0] - bw / 2;
    const by = boxScreen[1] - bh / 2;

    A.line(c, [anchorScreen, boxScreen], P.ink, 2.5);
    A.circle(c, anchorScreen[0], anchorScreen[1], 5, P.amber, P.ink, 2);
    A.rrect(c, bx, by, bw, bh, 8, P.paper, P.ink, 3);
    c.fillStyle = P.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, boxScreen[0], boxScreen[1] + 1);
    c.restore();
  });
}
