// Mô hình 3D giải phẫu vật lý 180° đầu đạn nổ lõm HEAT (Shaped Charge Cutaway):
// Vỏ thép khí động & chóp rỗng standoff + ngòi áp điện mũi + dây dẫn tới kíp nổ đuôi +
// khối thuốc nổ RDX/Octol có sóng kích nổ quét xuống + phễu đồng 60° sập biến dạng liên tục +
// luồng kim loại đồng siêu tốc Munroe 8 km/s + tấm giáp thép nóc xe tăng cắt bổ bị đục xuyên & mảnh văng spall.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { rnd } from '@core/time';
import { paint, plain } from '@skill/military/3d/materials';
import { extrude, pipe, rbox } from '@skill/military/3d/geom';
import { turntable } from '@skill/military/3d/turntable';

// Đồng bộ chính xác bảng màu vật lý từ THEME (`src/design/index.ts`)
const THEME = {
  armorBase: '#4c5642',
  armorCamo1: '#353d30',
  armorCamo2: '#6e6850',
  copperLiner: '#d87a38',
  copperJet: '#ffd166',
  explosiveHE: '#f4a236',
} as const;

export type ShapedChargeCutawayProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** 'vertical' = đầu đạn chúc thẳng đứng từ +Y xuống tấm giáp nóc nằm ngang ở y=0 (mặc định); 'horizontal' = dọc +X. */
  orientation?: 'vertical' | 'horizontal';
  /** 0..1 tiến độ sóng nổ truyền từ kíp nổ đuôi xuống khối thuốc nổ mạnh. */
  detonate?: number;
  /** 0..1 tiến độ sóng nổ ép bẹp phễu đồng 60° vào trục tâm. */
  collapse?: number;
  /** 0..1 tiến độ luồng kim loại đồng siêu tốc (Munroe jet) phóng vọt xuống dưới. */
  jet?: number;
  /** 0..1 tiến độ đục xuyên và nung chảy đỏ rực tấm giáp thép mỏng ở y=0. */
  pierce?: number;
  /** Hiện tấm giáp thép nóc cắt bổ ở y=0 (mặc định true). */
  showArmor?: boolean;
};

type P2 = [number, number];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth01 = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Đảm bảo đa giác 2D trong mặt phẳng (r, y) ngược chiều kim đồng hồ (CCW) để pháp tuyến LatheGeometry & ShapeGeometry hướng ra ngoài. */
const ensureCCW = (pts: P2[]): P2[] => {
  let area2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area2 += x1 * y2 - x2 * y1;
  }
  return area2 >= 0 ? pts : [...pts].reverse();
};

/** Nhân đôi đỉnh ở các góc gãy để LatheGeometry giữ cạnh vát cơ khí sắc nét, không bị bệt pháp tuyến. */
const creaseLoop = (ccw: P2[], cosThresh = 0.75): P2[] => {
  const n = ccw.length;
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = ccw[(i - 1 + n) % n];
    const curr = ccw[i];
    const next = ccw[(i + 1) % n];
    const ux = curr[0] - prev[0], uy = curr[1] - prev[1];
    const vx = next[0] - curr[0], vy = next[1] - curr[1];
    const ul = Math.hypot(ux, uy), vl = Math.hypot(vx, vy);
    out.push(curr);
    if (ul > 1e-6 && vl > 1e-6) {
      const cos = (ux * vx + uy * vy) / (ul * vl);
      if (cos < cosThresh) out.push([curr[0], curr[1]]);
    }
  }
  out.push([ccw[0][0], ccw[0][1]]);
  return out;
};

/**
 * Tạo khối tròn xoay cắt bổ 180° (giữ nửa sau z <= 0, mở toang nửa trước z > 0 ra phía camera +Z):
 * - `body`: LatheGeometry từ phi = π/2 (+X, z=0) qua π (x=0, -Z) tới 3π/2 (-X, z=0)
 * - `rightCap`, `leftCap`: 2 mặt cắt phẳng khít đặc trên mặt phẳng z = 0 hướng thẳng +Z.
 */
const buildHalfRing = (rawLoop: P2[], seg = 44) => {
  const ccw = ensureCCW(rawLoop);
  const lathePts = creaseLoop(ccw).map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  const body = new THREE.LatheGeometry(lathePts, seg, Math.PI / 2, Math.PI);
  body.computeVertexNormals();

  const rightShape = new THREE.Shape(ccw.map(([r, y]) => new THREE.Vector2(r, y)));
  const leftPts = [...ccw].reverse().map(([r, y]) => new THREE.Vector2(-r, y));
  const leftShape = new THREE.Shape(leftPts);

  const rightCap = new THREE.ShapeGeometry(rightShape, 16);
  const leftCap = new THREE.ShapeGeometry(leftShape, 16);
  return { body, rightCap, leftCap };
};

/**
 * Tạo khối đặc chạm trục tâm r = 0 cắt bổ 180° (z <= 0):
 * `meridian` đi từ đáy trên trục [0, yBot] -> vòng ra biên ngoài r > 0 -> kết thúc ở đỉnh trên trục [0, yTop].
 * Mặt cắt tại z = 0 là một đa giác đối xứng liền khối từ -r sang +r, không có khe nối ở x = 0.
 */
const buildHalfAxialSolid = (meridian: P2[], seg = 44) => {
  const creased: P2[] = [];
  for (let i = 0; i < meridian.length; i++) {
    const curr = meridian[i];
    creased.push(curr);
    if (i > 0 && i < meridian.length - 1) {
      const prev = meridian[i - 1], next = meridian[i + 1];
      const ux = curr[0] - prev[0], uy = curr[1] - prev[1];
      const vx = next[0] - curr[0], vy = next[1] - curr[1];
      const ul = Math.hypot(ux, uy), vl = Math.hypot(vx, vy);
      if (ul > 1e-6 && vl > 1e-6 && (ux * vx + uy * vy) / (ul * vl) < 0.72) {
        creased.push([curr[0], curr[1]]);
      }
    }
  }
  const body = new THREE.LatheGeometry(
    creased.map(([r, y]) => new THREE.Vector2(Math.max(0.00005, r), y)),
    seg,
    Math.PI / 2,
    Math.PI,
  );
  body.computeVertexNormals();

  const full2D: THREE.Vector2[] = [];
  for (let i = 0; i < meridian.length; i++) {
    const [r, y] = meridian[i];
    if (i === 0 || i === meridian.length - 1) {
      full2D.push(new THREE.Vector2(r > 0.0002 ? r : 0, y));
    } else {
      full2D.push(new THREE.Vector2(r, y));
    }
  }
  for (let i = meridian.length - 1; i >= 0; i--) {
    const [r, y] = meridian[i];
    if ((i === 0 || i === meridian.length - 1) && r <= 0.0002) continue;
    full2D.push(new THREE.Vector2(-r, y));
  }
  const cap = new THREE.ShapeGeometry(new THREE.Shape(full2D), 16);
  return { body, cap };
};

/** Tạo cặp mặt phẳng đối xứng (+X và -X) trên mặt cắt z = 0 cho dải sóng nổ / vùng nhiệt. */
const buildSymmetricCaps = (rawLoop: P2[]) => {
  const ccw = ensureCCW(rawLoop);
  const rightCap = new THREE.ShapeGeometry(
    new THREE.Shape(ccw.map(([r, y]) => new THREE.Vector2(r, y))),
    12,
  );
  const leftCap = new THREE.ShapeGeometry(
    new THREE.Shape([...ccw].reverse().map(([r, y]) => new THREE.Vector2(-r, y))),
    12,
  );
  return { rightCap, leftCap };
};

/** Đường sinh ogive khí động của chóp standoff từ mũi (y=0.115, r=0.036) lên thân trụ (y=0.345, r=0.180). */
const ogiveOuterR = (y: number): number => {
  const t = clamp01((y - 0.115) / (0.345 - 0.115));
  return 0.036 + (0.180 - 0.036) * (1 - Math.pow(1 - t, 1.85));
};

// Bù tuyến tính sRGB cho `paint()` để màu pixel trên CanvasTexture khớp chuẩn NATO Olive-Drab (#4c5642)
const MAT = {
  casingPaint: () =>
    paint({
      color: '#919b87',
      camo: ['#788270', '#a8a38e'],
      camoScale: 1.35,
      wear: 0.28,
      dirt: 0.22,
      roughness: 0.52,
      metalness: 0.34,
      repeat: 1,
      seed: 17,
    }),
  armorRoofPaint: () =>
    paint({
      color: '#939d89',
      camo: ['#77806f', '#aea893'],
      camoScale: 1.15,
      wear: 0.34,
      dirt: 0.26,
      roughness: 0.56,
      metalness: 0.38,
      repeat: 0.5,
      seed: 41,
    }),
  steelCut: () => plain('#adb9c6', 0.28, 0.72),
  armorCut: () => plain('#8b97a4', 0.34, 0.66),
  armorBevelLine: () => plain('#4e5863', 0.45, 0.6),
  cavityDark: () => plain('#1c222a', 0.68, 0.38),
  collarDark: () => plain('#343d47', 0.42, 0.62),
  silverProbe: () => plain('#d8e0e8', 0.22, 0.85),
  brassFuze: () => plain('#dfb052', 0.26, 0.82),
  piezoCeramic: () => plain('#66ecff', 0.22, 0.15, { emissive: '#0e7f99', emissiveIntensity: 0.4 }),
  bandYellow: () => plain('#eab31a', 0.42, 0.2),
  bandCopper: () => plain('#d47536', 0.38, 0.42),
  copperBody: () => plain(THEME.copperLiner, 0.27, 0.78),
  copperCut: () => plain('#eb8f4b', 0.24, 0.62),
  linerBuffer: () => plain('#2a231d', 0.7, 0.2),
  heBody: () => plain('#cf8120', 0.66, 0.04),
  heCut: () => plain(THEME.explosiveHE, 0.56, 0.03),
  waveShaper: () => plain('#232931', 0.58, 0.22),
  waveShaperCut: () => plain('#363f4b', 0.48, 0.28),
  boosterBody: () => plain('#b53a29', 0.54, 0.08),
  boosterCut: () => plain('#d64c38', 0.46, 0.08),
  spallLiner: () => plain('#30382c', 0.78, 0.08),
  wireJacket: () => plain('#ff7322', 0.38, 0.15, { emissive: '#661d00', emissiveIntensity: 0.22 }),
  slugCopper: () => plain('#c85820', 0.3, 0.74, { emissive: '#c43800', emissiveIntensity: 0.45 }),
};

// ---------------- HÌNH HỌC TĨNH CỦA VỎ ĐẦU ĐẠN & TẤM GIÁP NGOÀI ----------------
const ARMOR_PLUG_R = 0.135;
const ARMOR_HALF_W = 0.65;
const ARMOR_DEPTH = 0.43; // Bề sâu nửa sau cắt bổ (~0.86 m toàn tấm cắt đôi tại z = 0)
const ARMOR_THICK = 0.10;

const buildStaticGeometries = () => {
  // 1. Vỏ chóp khí động rỗng (Standoff Ogive) + Thân trụ thép dày + Đáy côn (y = 0.115 .. 1.050)
  const casingOuter: P2[] = [];
  const N_OGIVE = 18;
  for (let i = 0; i <= N_OGIVE; i++) {
    const y = lerp(0.115, 0.335, i / N_OGIVE);
    casingOuter.push([ogiveOuterR(y), y]);
  }
  // Đai ren khoá phễu đồng có rãnh tiện cơ khí (y = 0.335 .. 0.378)
  casingOuter.push(
    [0.184, 0.338],
    [0.184, 0.352],
    [0.179, 0.354],
    [0.179, 0.360],
    [0.184, 0.362],
    [0.184, 0.375],
    [0.180, 0.378],
  );
  // Thân trụ chính & gờ đuôi boat-tail có đai ghép tầng động cơ (y = 0.378 .. 1.050)
  casingOuter.push(
    [0.180, 0.895],
    [0.1835, 0.898],
    [0.1835, 0.916],
    [0.180, 0.920],
    [0.180, 0.945],
    [0.175, 0.972],
    [0.158, 1.010],
    [0.134, 1.040],
    [0.115, 1.050],
  );

  // Biên trong vỏ thép (từ đỉnh y = 1.050 chạy ngược xuống y = 0.115)
  const casingInner: P2[] = [
    [0.025, 1.050],
    [0.025, 0.974],
    [0.118, 0.974],
    [0.163, 0.946],
    [0.163, 0.374],
    [0.155, 0.370],
    [0.155, 0.342],
    [0.166, 0.338],
  ];
  for (let i = N_OGIVE - 1; i >= 0; i--) {
    const y = lerp(0.115, 0.335, i / N_OGIVE);
    const rIn = Math.max(0.022, ogiveOuterR(y) - 0.012);
    casingInner.push([rIn, y]);
  }
  const casing = buildHalfRing([...casingOuter, ...casingInner], 48);

  // Lớp lót tối lòng khoang standoff để tạo chiều sâu và tương phản cao cho luồng xuyên
  const linerCoatPts: P2[] = [];
  for (let i = 0; i <= 14; i++) {
    const y = lerp(0.122, 0.335, i / 14);
    linerCoatPts.push([Math.max(0.022, ogiveOuterR(y) - 0.0122), y]);
  }
  for (let i = 14; i >= 0; i--) {
    const y = lerp(0.122, 0.335, i / 14);
    linerCoatPts.push([Math.max(0.020, ogiveOuterR(y) - 0.015), y]);
  }
  const cavityCoat = buildHalfRing(linerCoatPts, 40).body;

  // 2 gân gia cường vòng bên trong khoang rỗng standoff
  const rib1 = buildHalfRing([
    [ogiveOuterR(0.195) - 0.012, 0.190],
    [ogiveOuterR(0.195) - 0.012, 0.202],
    [ogiveOuterR(0.195) - 0.024, 0.199],
    [ogiveOuterR(0.195) - 0.024, 0.193],
  ], 36);
  const rib2 = buildHalfRing([
    [ogiveOuterR(0.270) - 0.012, 0.264],
    [ogiveOuterR(0.270) - 0.012, 0.277],
    [ogiveOuterR(0.270) - 0.027, 0.274],
    [ogiveOuterR(0.270) - 0.027, 0.267],
  ], 36);

  // Vạch sơn quân sự chuẩn NATO bên ngoài vỏ thép (vàng HE & đồng HEAT)
  const yellowBand = buildHalfRing([
    [0.1809, 0.600],
    [0.1809, 0.642],
    [0.1795, 0.642],
    [0.1795, 0.600],
  ], 44).body;
  const copperBand = buildHalfRing([
    [0.1809, 0.805],
    [0.1809, 0.834],
    [0.1795, 0.834],
    [0.1795, 0.805],
  ], 44).body;

  // Cánh vây ổn định khí động vát chéo ở đuôi đạn (dùng extrude biên dạng thang vát)
  const strakeFin = extrude(
    [
      [0, 0],
      [0.036, 0.018],
      [0.032, 0.105],
      [0, 0.125],
    ],
    0.010,
    0.002,
  );

  // 2. Cụm ngòi nổ áp điện mũi (Piezoelectric Standoff Probe: y = 0.000 .. 0.122)
  const probeStalk = buildHalfRing([
    [0.025, 0.046],
    [0.028, 0.068],
    [0.031, 0.095],
    [0.037, 0.122],
    [0.022, 0.122],
    [0.013, 0.092],
    [0.013, 0.046],
  ], 32);

  const probeTip = buildHalfAxialSolid([
    [0, 0.000],
    [0.015, 0.001],
    [0.022, 0.010],
    [0.022, 0.018],
    [0, 0.018],
  ], 32);

  const brassCollar = buildHalfRing([
    [0.027, 0.017],
    [0.027, 0.047],
    [0.014, 0.047],
    [0.014, 0.017],
  ], 32);

  const piezoCrystal = buildHalfAxialSolid([
    [0, 0.019],
    [0.0135, 0.019],
    [0.0135, 0.043],
    [0, 0.043],
  ], 28);

  // 3. Kíp nổ đuôi (Base Detonator), Trạm kích nổ (Booster Pellet) & Đĩa nắn sóng nổ (Wave-Shaper)
  const detonator = buildHalfAxialSolid([
    [0, 0.972],
    [0.024, 0.972],
    [0.024, 1.042],
    [0.017, 1.049],
    [0, 1.049],
  ], 28);

  const booster = buildHalfAxialSolid([
    [0, 0.922],
    [0.044, 0.922],
    [0.048, 0.948],
    [0.044, 0.974],
    [0, 0.974],
  ], 32);

  const waveShaper = buildHalfAxialSolid([
    [0, 0.818],
    [0.064, 0.824],
    [0.070, 0.846],
    [0.056, 0.868],
    [0, 0.874],
  ], 32);

  // 4. Dây dẫn điện từ tinh thể áp điện mũi dọc khoang lên kíp nổ đuôi
  const wirePtsL: [number, number, number][] = [
    [-0.005, 0.042, -0.004],
    [-0.009, 0.118, -0.005],
    [-(ogiveOuterR(0.17) - 0.018), 0.17, -0.006],
    [-(ogiveOuterR(0.25) - 0.018), 0.25, -0.006],
    [-0.148, 0.33, -0.006],
    [-0.160, 0.365, -0.006],
    [-0.160, 0.66, -0.006],
    [-0.158, 0.945, -0.006],
    [-0.105, 0.978, -0.006],
    [-0.020, 0.995, -0.005],
  ];
  const firingWireL = pipe(wirePtsL, 0.0036, 44);
  const centralPin = new THREE.CylinderGeometry(0.0038, 0.0038, 0.088, 12);

  // 5. Tấm giáp thép nóc xe tăng bên ngoài vùng nút xuyên (x ∈ [-0.65, +0.65], z ∈ [-0.43, 0], khoét bán nguyệt R = 0.135)
  const slabShape = new THREE.Shape();
  slabShape.moveTo(ARMOR_PLUG_R, 0);
  slabShape.lineTo(ARMOR_HALF_W, 0);
  slabShape.lineTo(ARMOR_HALF_W, -ARMOR_DEPTH + 0.05);
  slabShape.lineTo(ARMOR_HALF_W - 0.05, -ARMOR_DEPTH);
  slabShape.lineTo(-ARMOR_HALF_W + 0.05, -ARMOR_DEPTH);
  slabShape.lineTo(-ARMOR_HALF_W, -ARMOR_DEPTH + 0.05);
  slabShape.lineTo(-ARMOR_HALF_W, 0);
  slabShape.lineTo(-ARMOR_PLUG_R, 0);
  const N_ARC = 32;
  for (let i = 1; i < N_ARC; i++) {
    const a = Math.PI - (i / N_ARC) * Math.PI;
    slabShape.lineTo(Math.cos(a) * ARMOR_PLUG_R, -Math.sin(a) * ARMOR_PLUG_R);
  }
  slabShape.closePath();

  const armorOuterBody = new THREE.ExtrudeGeometry(slabShape, {
    depth: ARMOR_THICK,
    bevelEnabled: false,
    curveSegments: 24,
  });
  armorOuterBody.rotateX(Math.PI / 2);
  armorOuterBody.computeVertexNormals();

  // Lớp lót Kevlar chống mảnh văng (Spall Liner) dưới trần tháp pháo (y = -0.100 .. -0.111)
  const spallLinerBody = new THREE.ExtrudeGeometry(slabShape, {
    depth: 0.011,
    bevelEnabled: false,
    curveSegments: 24,
  });
  spallLinerBody.rotateX(Math.PI / 2);
  spallLinerBody.translate(0, -ARMOR_THICK, 0);
  spallLinerBody.computeVertexNormals();

  // Mặt cắt thép phay sáng phẳng tại z = 0 cho phần tấm giáp ngoài
  const rightCutShape = new THREE.Shape([
    new THREE.Vector2(ARMOR_PLUG_R, -ARMOR_THICK),
    new THREE.Vector2(ARMOR_HALF_W, -ARMOR_THICK),
    new THREE.Vector2(ARMOR_HALF_W, 0),
    new THREE.Vector2(ARMOR_PLUG_R, 0),
  ]);
  const leftCutShape = new THREE.Shape([
    new THREE.Vector2(-ARMOR_HALF_W, -ARMOR_THICK),
    new THREE.Vector2(-ARMOR_PLUG_R, -ARMOR_THICK),
    new THREE.Vector2(-ARMOR_PLUG_R, 0),
    new THREE.Vector2(-ARMOR_HALF_W, 0),
  ]);
  const armorRightCut = new THREE.ShapeGeometry(rightCutShape, 1);
  const armorLeftCut = new THREE.ShapeGeometry(leftCutShape, 1);

  return {
    casing,
    cavityCoat,
    rib1,
    rib2,
    yellowBand,
    copperBand,
    strakeFin,
    probeStalk,
    probeTip,
    brassCollar,
    piezoCrystal,
    detonator,
    booster,
    waveShaper,
    firingWireL,
    centralPin,
    armorOuterBody,
    spallLinerBody,
    armorRightCut,
    armorLeftCut,
  };
};

let STATIC_GEOM: ReturnType<typeof buildStaticGeometries> | null = null;
const getStaticGeom = () => {
  if (!STATIC_GEOM) STATIC_GEOM = buildStaticGeometries();
  return STATIC_GEOM;
};

// ---------------- BIẾN DẠNG ĐỘNG BIRKHOFF-TAYLOR: PHỄU ĐỒNG 60° + KHỐI THUỐC NỔ RDX ----------------
/**
 * Mô phỏng vật lý thủy động lực học sập phễu đồng 60° theo `collapse` (0..1):
 * - Ban đầu (collapse = 0): nón đồng 60° dày ~1.4 cm, miệng mở ở y = 0.344 (r = 0.158), đỉnh nón ở y ≈ 0.675.
 * - Khi `collapse` tăng 0 -> 1: mặt bản lề sập (sHinge) truyền từ đỉnh xuống vành đáy; phần phễu phía trên sHinge
 *   bị sóng nổ ép khép phẳng vào trục tâm x = 0 tạo cổ hội tụ chữ Y (stagnation point) đơn điệu tuyệt đối (không tự cắt).
 */
const buildLinerAndExplosive = (collapseRaw: number) => {
  const c = clamp01(collapseRaw);
  const N = 28;
  const R_BASE = 0.157;
  const Y_BASE = 0.352;
  const H_CONE = 0.285; // 2 * atan(0.157 / 0.272) ≈ 60°

  const sHinge = Math.max(0.06, 1 - 0.85 * c);
  const yHingeOrig = Y_BASE + H_CONE * sHinge;
  // Đỉnh thân đồng đã khép tụt dần từ 0.637 xuống 0.545 khi phễu bị nén dọc trục
  const yStemTop = lerp(Y_BASE + H_CONE, Math.max(yHingeOrig + 0.085, 0.545), c);

  const midPts: P2[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const rCone = R_BASE * (1 - s);
    const yCone = Y_BASE + H_CONE * s;

    if (c <= 0.002) {
      midPts.push([Math.max(0.003, rCone), yCone]);
    } else {
      // Hệ số chuyển tiếp mượt quanh bản lề sHinge (0 dưới bản lề, 1 trên thân đã sập)
      const u = smooth01((s - (sHinge - 0.09)) / Math.max(0.14, 1 - sHinge + 0.09));
      const pinch = Math.pow(u, 1.15) * clamp01(c * 1.25);

      // Bán kính khép sát vào thân chày trung tâm r ≈ 0.0085 m
      const rStem = 0.0085 + 0.003 * (1 - s);
      const rMid = lerp(rCone, rStem, pinch);

      // Toạ độ y tăng đơn điệu từ yCone dưới bản lề lên yStemTop ở đỉnh chày
      const sAbove = clamp01((s - (sHinge - 0.09)) / Math.max(0.12, 1 - (sHinge - 0.09)));
      const yCollapsedBranch = lerp(
        Y_BASE + H_CONE * Math.max(0, sHinge - 0.09),
        yStemTop,
        Math.pow(sAbove, 0.86),
      );
      const yMid = lerp(yCone, yCollapsedBranch, pinch);
      midPts.push([Math.max(0.003, rMid), yMid]);
    }
  }

  const innerCurve: P2[] = [];
  const outerCurve: P2[] = [];
  const bufferOuter: P2[] = [];
  for (let i = 0; i <= N; i++) {
    const pPrev = midPts[Math.max(0, i - 1)];
    const pNext = midPts[Math.min(N, i + 1)];
    const tx = pNext[0] - pPrev[0];
    const ty = pNext[1] - pPrev[1];
    const tl = Math.hypot(tx, ty) || 1;
    const nx = ty / tl;
    const ny = -tx / tl;

    const s = i / N;
    const u = c > 0.002 ? smooth01((s - sHinge) / Math.max(0.14, 1 - sHinge)) : 0;
    const halfT = 0.0070 * (1 + 0.34 * u * c); // Dày ~1.4 cm ở cánh nón, dồn đặc ~1.88 cm ở cổ chày

    const rOut = Math.max(0.010, midPts[i][0] + nx * halfT);
    const yOut = midPts[i][1] + ny * halfT;
    const rIn = Math.max(0.0002, midPts[i][0] - nx * halfT);
    const yIn = midPts[i][1] - ny * halfT;

    outerCurve.push([rOut, yOut]);
    innerCurve.push([rIn, yIn]);
    bufferOuter.push([rOut + 0.0022, yOut + ny * 0.0018]);
  }

  // Tìm đỉnh vòm trong lòng nón (nơi thành đồng chạm trục tâm tạo điểm phóng luồng xuyên Munroe)
  let yJetOrigin = innerCurve[N][1];
  for (let i = 0; i <= N; i++) {
    if (innerCurve[i][0] <= 0.0035) {
      yJetOrigin = innerCurve[i][1];
      break;
    }
  }

  // Đóng khít đa giác phễu đồng 60° từ vành chân đế (y=0.342) lên đỉnh
  const linerPoly: P2[] = [
    [0.165, 0.342],
    [0.165, 0.362],
    [0.158, 0.366],
    ...outerCurve,
    [0.0002, outerCurve[N][1] + 0.005],
    [0.0002, innerCurve[N][1] - 0.001],
    ...[...innerCurve].reverse(),
    [0.149, 0.342],
  ];
  const liner = buildHalfRing(linerPoly, 44);

  // Lớp đệm viền tối mỏng 2 mm giữa lưng phễu đồng và thuốc nổ RDX giúp tách lớp giải phẫu cực rõ
  const bufferCaps = buildSymmetricCaps([
    ...outerCurve,
    [0.0003, outerCurve[N][1] + 0.0068],
    [0.0003, outerCurve[N][1] + 0.005],
    ...[...bufferOuter].reverse(),
  ]);

  // Vùng cổ hội tụ đồng nóng sáng rực khi bị sóng nổ ép ở áp suất siêu cao
  let hotThroatCaps: ReturnType<typeof buildSymmetricCaps> | null = null;
  if (c > 0.06) {
    const iStart = Math.max(2, Math.floor((sHinge - 0.04) * N));
    const hotOuter = outerCurve.slice(iStart);
    const hotInner = innerCurve.slice(iStart);
    if (hotOuter.length >= 2) {
      hotThroatCaps = buildSymmetricCaps([
        ...hotOuter,
        [0.0004, hotOuter[hotOuter.length - 1][1] + 0.004],
        [0.0004, hotInner[hotInner.length - 1][1]],
        ...[...hotInner].reverse(),
      ]);
    }
  }

  // Khối thuốc nổ RDX/Octol đặc khít từ lưng phễu đồng lên tới trạm booster & đuôi vỏ thép
  const heMeridian: P2[] = [
    [0, outerCurve[N][1] + 0.005],
    ...[...outerCurve].reverse(),
    [0.158, 0.366],
    [0.1626, 0.374],
    [0.1626, 0.946],
    [0.118, 0.973],
    [0.044, 0.973],
    [0.048, 0.948],
    [0.044, 0.922],
    [0, 0.922],
  ];
  const he = buildHalfAxialSolid(heMeridian, 44);

  /** Hàm tra cứu giới hạn bán kính lưng phễu đồng tại độ cao y để cắt gọn sóng nổ không tràn vào phễu đồng. */
  const linerOuterRAtY = (y: number): number => {
    if (y >= outerCurve[N][1] + 0.004) return 0.0005;
    if (y <= outerCurve[0][1]) return 0.160;
    for (let i = 0; i < N; i++) {
      const [r0, y0] = outerCurve[i];
      const [r1, y1] = outerCurve[i + 1];
      if ((y >= y0 && y <= y1) || (y >= y1 && y <= y0)) {
        const t = Math.abs(y1 - y0) < 1e-5 ? 0 : (y - y0) / (y1 - y0);
        return lerp(r0, r1, clamp01(t)) + 0.0025;
      }
    }
    return 0.015;
  };

  return {
    liner,
    bufferCaps,
    hotThroatCaps,
    he,
    outerCurve,
    linerOuterRAtY,
    yOrigin: yJetOrigin,
  };
};

// ---------------- SÓNG KÍCH NỔ QUÉT QUA KHỐI THUỐC NỔ (detonate 0..1) ----------------
const buildDetonationWave = (
  detonateRaw: number,
  linerOuterRAtY: (y: number) => number,
) => {
  const d = clamp01(detonateRaw);
  if (d <= 0.008) return null;

  // Tâm mặt sóng quét từ kíp nổ đuôi (y = 0.965) xuống lưng phễu đồng (y = 0.415)
  // Tại preview detonate = 0.85 => mặt sóng sáng rực trải rộng ngang bầu thuốc nổ ôm đúng bản lề sập phễu đồng
  const yCenter = lerp(0.965, 0.415, Math.pow(d, 0.88));
  const rMax = d < 0.15 ? lerp(0.032, 0.160, d / 0.15) : 0.161;

  // Hàm biên dạng độ cao mặt sóng nổ theo bán kính r (uốn cong quanh đĩa nắn sóng wave-shaper)
  const waveYAtU = (u: number, yBase: number) => {
    const arch =
      d < 0.24
        ? -0.042 * u * u
        : 0.052 * Math.sin(u * Math.PI * 0.82) - 0.054 * u * u;
    return Math.min(0.970, Math.max(0.366, yBase + arch));
  };

  const makeClippedArc = (yOff: number, halfThick: number) => {
    const M = 22;
    const lower: P2[] = [];
    const upper: P2[] = [];
    for (let i = 0; i <= M; i++) {
      const u = i / M;
      const yMid = waveYAtU(u, yCenter + yOff);
      const rMinHere = linerOuterRAtY(yMid);
      const r = lerp(rMinHere, Math.max(rMinHere + 0.006, rMax), u);
      const rBound = Math.min(0.1615, Math.max(linerOuterRAtY(yMid), r));
      lower.push([rBound, Math.max(0.364, yMid - halfThick)]);
      upper.push([rBound, Math.min(0.971, yMid + halfThick)]);
    }
    return buildHalfRing([...lower, ...[...upper].reverse()], 38);
  };

  const coreWave = makeClippedArc(0, 0.0085);
  const haloWave = makeClippedArc(0.013, 0.024);
  const ripple1 = d > 0.20 ? makeClippedArc(0.072, 0.0040) : null;
  const ripple2 = d > 0.40 ? makeClippedArc(0.145, 0.0032) : null;
  const ripple3 = d > 0.62 ? makeClippedArc(0.222, 0.0026) : null;

  // Vùng khí nổ cao áp sẫm cam nóng phía trên mặt sóng: nối liền khối đối xứng từ -r sang +r để không có khe ở trục x = 0
  const M_ZONE = 20;
  const rightBranch: P2[] = [];
  for (let i = 0; i <= M_ZONE; i++) {
    const u = i / M_ZONE;
    const yMid = waveYAtU(u, yCenter + 0.005);
    const rMinHere = linerOuterRAtY(yMid);
    const r = Math.min(0.1615, Math.max(rMinHere, lerp(rMinHere, rMax, u)));
    rightBranch.push([r, yMid]);
  }
  const yInnerFront = rightBranch[0][1];
  const rInnerFront = rightBranch[0][0];

  let shockedUnifiedCap: THREE.ShapeGeometry;
  if (rInnerFront <= 0.018) {
    // Mặt sóng còn ở phía trên đỉnh phễu đồng: nối liền một mảng đối xứng qua trục x = 0
    const fullPts: THREE.Vector2[] = [
      new THREE.Vector2(0, yInnerFront),
      ...rightBranch.map(([r, y]) => new THREE.Vector2(r, y)),
      new THREE.Vector2(0.1615, 0.946),
      new THREE.Vector2(0.118, 0.972),
      new THREE.Vector2(-0.118, 0.972),
      new THREE.Vector2(-0.1615, 0.946),
      ...[...rightBranch].reverse().map(([r, y]) => new THREE.Vector2(-r, y)),
    ];
    shockedUnifiedCap = new THREE.ShapeGeometry(new THREE.Shape(fullPts), 12);
  } else {
    // Mặt sóng đã xuống ngang thân phễu đồng: men vòng qua đỉnh phễu đồng tại x = 0 tạo một đa giác chữ U liền mạch
    const spineR: P2[] = [];
    for (let k = 1; k <= 8; k++) {
      const yk = lerp(yInnerFront, 0.66, k / 8);
      const rk = linerOuterRAtY(yk);
      if (rk > 0.002) spineR.push([rk, yk]);
    }
    const fullPts: THREE.Vector2[] = [
      ...[...spineR].reverse().map(([r, y]) => new THREE.Vector2(r, y)),
      ...rightBranch.map(([r, y]) => new THREE.Vector2(r, y)),
      new THREE.Vector2(0.1615, 0.946),
      new THREE.Vector2(0.118, 0.972),
      new THREE.Vector2(-0.118, 0.972),
      new THREE.Vector2(-0.1615, 0.946),
      ...[...rightBranch].reverse().map(([r, y]) => new THREE.Vector2(-r, y)),
      ...spineR.map(([r, y]) => new THREE.Vector2(-r, y)),
    ];
    shockedUnifiedCap = new THREE.ShapeGeometry(new THREE.Shape(fullPts), 12);
  }

  return { coreWave, haloWave, ripple1, ripple2, ripple3, shockedUnifiedCap, yLight: yCenter };
};

// ---------------- LUỒNG XUYÊN KIM LOẠI MUNROE 8 KM/S & CHÀY ĐỒNG (jet 0..1) ----------------
const buildMunroeJet = (jetRaw: number, yOrigin: number) => {
  const j = clamp01(jetRaw);
  if (j <= 0.008) return null;

  // 0..0.30: phóng qua khoang rỗng standoff tới mặt giáp y = 0; 0.30..1.0: xuyên sâu xuống y = -0.75 m
  const yTip =
    j <= 0.30
      ? lerp(yOrigin - 0.01, 0.0, j / 0.30)
      : lerp(0.0, -0.75, (j - 0.30) / 0.70);

  const len = Math.max(0.025, yOrigin - yTip);

  // 1. Khối chày đồng (Slug) dày nặng bám theo sau cổ hội tụ
  const slugTop = yOrigin + 0.068 * Math.min(1, j * 2.2);
  const slugBot = yOrigin - 0.022;
  const slugPts: THREE.Vector2[] = [
    new THREE.Vector2(0.0001, slugBot),
    new THREE.Vector2(0.013, lerp(slugBot, slugTop, 0.24)),
    new THREE.Vector2(0.023, lerp(slugBot, slugTop, 0.60)),
    new THREE.Vector2(0.018, lerp(slugBot, slugTop, 0.88)),
    new THREE.Vector2(0.0001, slugTop),
  ];
  const slugGeom = new THREE.LatheGeometry(slugPts, 28);
  slugGeom.computeVertexNormals();

  // 2. Lớp vỏ đồng nóng chảy cam rực & lõi plasma trắng-vàng siêu tốc 8 km/s
  const N = 30;
  const outerPts: THREE.Vector2[] = [new THREE.Vector2(0.0002, yTip)];
  const corePts: THREE.Vector2[] = [
    new THREE.Vector2(0.0002, yTip + Math.min(0.006, len * 0.04)),
  ];
  const sheathPts: THREE.Vector2[] = [new THREE.Vector2(0.0004, yTip - 0.005)];

  for (let i = 1; i <= N; i++) {
    const u = i / N; // 0 = mũi nhọn yTip, 1 = gốc hội tụ yOrigin
    const y = lerp(yTip, yOrigin, u);
    const tipFlare = Math.exp(-Math.pow((u - 0.042) / 0.028, 2)) * 0.0034;
    const neckRipple = 0.0008 * Math.sin(u * Math.PI * 8);
    const rootCone = Math.pow(u, 3.0) * 0.0125;
    const baseNeedle = u < 0.038 ? (u / 0.038) * 0.0074 : 0.0074 + 0.0030 * u;
    const r = Math.max(0.001, baseNeedle + tipFlare + neckRipple + rootCone);

    outerPts.push(new THREE.Vector2(r, y));
    corePts.push(new THREE.Vector2(r * 0.56, y));
    sheathPts.push(new THREE.Vector2(r * 1.68, y));
  }
  outerPts.push(new THREE.Vector2(0.0002, yOrigin + 0.012));
  corePts.push(new THREE.Vector2(0.0002, yOrigin + 0.008));
  sheathPts.push(new THREE.Vector2(0.0004, yOrigin + 0.016));

  const jetOuterGeom = new THREE.LatheGeometry(outerPts, 28);
  const jetCoreGeom = new THREE.LatheGeometry(corePts, 24);
  const jetSheathGeom = new THREE.LatheGeometry(sheathPts, 24);

  return { slugGeom, jetOuterGeom, jetCoreGeom, jetSheathGeom, yTip };
};

// ---------------- NÚT GIÁP THÉP BỊ ĐỤC XUYÊN & NUNG CHẢY (pierce 0..1) ----------------
const buildArmorBorePlug = (pierceRaw: number) => {
  const p = clamp01(pierceRaw);
  const BREAK_AT = 0.48;

  if (p <= 0.006) {
    const solid = buildHalfAxialSolid([
      [0, -ARMOR_THICK],
      [ARMOR_PLUG_R, -ARMOR_THICK],
      [ARMOR_PLUG_R, 0],
      [0, 0],
    ], 36);
    return { kind: 'solid' as const, solid, hazOuter: null, hazCore: null };
  }

  if (p < BREAK_AT) {
    const k = p / BREAK_AT;
    const boreDepth = ARMOR_THICK * 0.94 * k;
    const rTop = 0.016 + 0.018 * k;
    const rShaft = 0.011 + 0.009 * k;
    const lipH = 0.017 * smooth01(k);
    const bulgeBot = 0.011 * k * k;

    const craterCurve: P2[] = [
      [0, -boreDepth],
      [rShaft * 0.55, -boreDepth + 0.005 * k],
      [rShaft, -boreDepth * 0.55],
      [rTop, 0.001],
      [rTop + 0.008, lipH],
      [rTop + 0.020, lipH * 0.45],
      [rTop + 0.036, 0],
    ];

    const meridian: P2[] = [
      [0, -ARMOR_THICK - bulgeBot],
      [0.036, -ARMOR_THICK - bulgeBot * 0.5],
      [0.075, -ARMOR_THICK],
      [ARMOR_PLUG_R, -ARMOR_THICK],
      [ARMOR_PLUG_R, 0],
      ...[...craterCurve].reverse(),
    ];
    const partial = buildHalfAxialSolid(meridian, 40);

    const hazLoop: P2[] = [
      ...craterCurve.slice(0, 6),
      ...craterCurve
        .slice(0, 6)
        .reverse()
        .map(([r, y]): P2 => [r + 0.009, y - 0.005]),
    ];
    const hazOuter = buildHalfRing(hazLoop, 36);
    const moltenLoop: P2[] = [
      ...craterCurve.slice(0, 6).map(([r, y]): P2 => [Math.max(0.001, r - 0.001), y + 0.0005]),
      ...craterCurve
        .slice(0, 6)
        .reverse()
        .map(([r, y]): P2 => [r + 0.0034, y - 0.002]),
    ];
    const hazCore = buildHalfRing(moltenLoop, 36);

    return { kind: 'partial' as const, solid: partial, hazOuter, hazCore };
  }

  // Đục xuyên thủng hoàn toàn chiều dày tấm giáp y = 0 xuống y = -0.10 m
  const w = smooth01((p - BREAK_AT) / (1 - BREAK_AT));
  const rEntry = 0.032 + 0.010 * w;
  const rThroat = 0.019 + 0.007 * w;
  const rExit = 0.035 + 0.015 * w;
  const topLip = 0.015 + 0.006 * w;
  const botLip = 0.014 + 0.009 * w;

  const boreWall: P2[] = [
    [rExit + 0.028, -ARMOR_THICK],
    [rExit + 0.012, -ARMOR_THICK - botLip * 0.6],
    [rExit, -ARMOR_THICK - botLip],
    [rThroat * 1.18, -0.078],
    [rThroat, -0.052],
    [rThroat * 1.12, -0.024],
    [rEntry, 0.002],
    [rEntry + 0.009, topLip],
    [rEntry + 0.022, topLip * 0.42],
    [rEntry + 0.038, 0.0],
  ];

  const ringLoop: P2[] = [
    [rExit + 0.028, -ARMOR_THICK],
    [ARMOR_PLUG_R, -ARMOR_THICK],
    [ARMOR_PLUG_R, 0.0],
    ...[...boreWall].reverse(),
  ];
  const pierced = buildHalfRing(ringLoop, 42);

  // Vành nhiệt đỏ cam (HAZ) gọn sắc nét quanh vách lỗ xuyên (~1.1 cm)
  const innerBore = boreWall.slice(1, 9);
  const hazOuterWall = innerBore.map(([r, y]): P2 => [
    Math.min(ARMOR_PLUG_R - 0.005, r + 0.011),
    Math.max(-ARMOR_THICK - botLip * 0.35, Math.min(topLip * 0.55, y)),
  ]);
  const hazOuter = buildHalfRing([...innerBore, ...[...hazOuterWall].reverse()], 38);

  // Lớp màng thép nóng chảy trắng-vàng sát lòng rãnh lỗ xuyên
  const moltenInner = innerBore.map(([r, y]): P2 => [Math.max(0.004, r - 0.0012), y]);
  const moltenOuter = innerBore.map(([r, y]): P2 => [r + 0.0038, y]);
  const hazCore = buildHalfRing([...moltenInner, ...[...moltenOuter].reverse()], 38);

  return { kind: 'pierced' as const, pierced, hazOuter, hazCore };
};

// ---------------- DỮ LIỆU TẤT ĐỊNH CHO MẢNH VĂNG THÉP SPALL SẮC CẠNH & TIA XỈ ----------------
const SPALL_SHARDS = Array.from({ length: 28 }, (_, i) => {
  const phi =
    lerp(Math.PI * 0.40, Math.PI * 1.60, (i + 0.5) / 28) + (rnd(i * 13 + 3) - 0.5) * 0.12;
  const spread = 0.18 + 0.52 * rnd(i * 17 + 7);
  const speed = 0.42 + 0.58 * rnd(i * 23 + 11);
  const size = 0.009 + 0.015 * rnd(i * 31 + 5);
  const hot = rnd(i * 41 + 19);
  const streak = i % 3 === 0;
  const rot: [number, number, number] = [
    rnd(i * 7 + 1) * Math.PI,
    rnd(i * 11 + 2) * Math.PI,
    rnd(i * 19 + 4) * Math.PI,
  ];
  return { phi, spread, speed, size, hot, streak, rot };
});

const SPLASH_SEEDS = Array.from({ length: 16 }, (_, i) => {
  const phi = lerp(Math.PI * 0.36, Math.PI * 1.64, (i + 0.5) / 16);
  const elev = 0.45 + 0.45 * rnd(i * 29 + 9);
  const reach = 0.045 + 0.075 * rnd(i * 37 + 13);
  const size = 0.0032 + 0.0036 * rnd(i * 43 + 17);
  return { phi, elev, reach, size };
});

const BOLT_X = [-0.55, -0.43, -0.31, 0.31, 0.43, 0.55];

export const ShapedChargeCutaway: React.FC<ShapedChargeCutawayProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  orientation = 'vertical',
  detonate = 0,
  collapse = 0,
  jet = 0,
  pierce = 0,
  showArmor = true,
}) => {
  const det = clamp01(detonate);
  const col = clamp01(collapse);
  const jt = clamp01(jet);
  const prc = clamp01(pierce);

  const sg = useMemo(() => getStaticGeom(), []);

  const qCol = Math.round(col * 240) / 240;
  const qDet = Math.round(det * 240) / 240;
  const qJet = Math.round(jt * 240) / 240;
  const qPrc = Math.round(prc * 240) / 240;

  const dynLinerHE = useMemo(() => buildLinerAndExplosive(qCol), [qCol]);
  const dynWave = useMemo(
    () => buildDetonationWave(qDet, dynLinerHE.linerOuterRAtY),
    [qDet, dynLinerHE],
  );
  const dynJet = useMemo(
    () => buildMunroeJet(qJet, dynLinerHE.yOrigin),
    [qJet, dynLinerHE.yOrigin],
  );
  const dynArmor = useMemo(() => (showArmor ? buildArmorBorePlug(qPrc) : null), [showArmor, qPrc]);

  const orientRot: [number, number, number] =
    orientation === 'horizontal' ? [0, 0, Math.PI / 2] : [0, 0, 0];

  const spallProgress = clamp01((prc - 0.44) / 0.56);
  const showSplash = showArmor && jt > 0.28 && prc > 0.04;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group rotation={orientRot}>
        {/* ================= 1. ĐẦU ĐẠN NỔ LÕM HEAT CẮT BỔ 180° (y = 0 .. 1.05) ================= */}

        {/* Vỏ thép khí động ngoài & thân trụ bọc thuốc nổ sơn NATO Olive-Drab */}
        <mesh geometry={sg.casing.body} material={MAT.casingPaint()} castShadow receiveShadow />
        <mesh geometry={sg.casing.rightCap} material={MAT.steelCut()} position={[0, 0, 0.0004]} receiveShadow />
        <mesh geometry={sg.casing.leftCap} material={MAT.steelCut()} position={[0, 0, 0.0004]} receiveShadow />

        {/* Lớp lót tối lòng khoang rỗng standoff & 2 gân gia cường cơ khí */}
        <mesh geometry={sg.cavityCoat} material={MAT.cavityDark()} receiveShadow />
        <mesh geometry={sg.rib1.body} material={MAT.collarDark()} />
        <mesh geometry={sg.rib1.rightCap} material={MAT.steelCut()} position={[0, 0, 0.0005]} />
        <mesh geometry={sg.rib1.leftCap} material={MAT.steelCut()} position={[0, 0, 0.0005]} />
        <mesh geometry={sg.rib2.body} material={MAT.collarDark()} />
        <mesh geometry={sg.rib2.rightCap} material={MAT.steelCut()} position={[0, 0, 0.0005]} />
        <mesh geometry={sg.rib2.leftCap} material={MAT.steelCut()} position={[0, 0, 0.0005]} />

        {/* Vòng sơn nhận diện đạn nổ mạnh HE (vàng) & nổ lõm HEAT (đồng) */}
        <mesh geometry={sg.yellowBand} material={MAT.bandYellow()} />
        <mesh geometry={sg.copperBand} material={MAT.bandCopper()} />

        {/* 3 cánh vây ổn định khí động vát chéo ở đuôi đạn (nằm gọn trong nửa z < -0.05) */}
        {[-0.78, 0, 0.78].map((ang, idx) => (
          <group key={idx} rotation={[0, ang, 0]}>
            <mesh
              geometry={sg.strakeFin}
              material={MAT.collarDark()}
              position={[0, 0.895, -0.178]}
              rotation={[0, Math.PI / 2, 0]}
              castShadow
            />
          </group>
        ))}

        {/* Ngòi nổ áp điện mũi (Piezoelectric Standoff Probe tại y = 0) */}
        <mesh geometry={sg.probeStalk.body} material={MAT.collarDark()} castShadow />
        <mesh geometry={sg.probeStalk.rightCap} material={MAT.steelCut()} position={[0, 0, 0.0005]} />
        <mesh geometry={sg.probeStalk.leftCap} material={MAT.steelCut()} position={[0, 0, 0.0005]} />

        <mesh geometry={sg.probeTip.body} material={MAT.silverProbe()} castShadow />
        <mesh geometry={sg.probeTip.cap} material={MAT.silverProbe()} position={[0, 0, 0.0006]} />

        <mesh geometry={sg.brassCollar.body} material={MAT.brassFuze()} />
        <mesh geometry={sg.brassCollar.rightCap} material={MAT.brassFuze()} position={[0, 0, 0.0006]} />
        <mesh geometry={sg.brassCollar.leftCap} material={MAT.brassFuze()} position={[0, 0, 0.0006]} />

        <mesh geometry={sg.piezoCrystal.body} material={MAT.piezoCeramic()} />
        <mesh geometry={sg.piezoCrystal.cap} material={MAT.piezoCeramic()} position={[0, 0, 0.0008]} />

        {/* Trục cực điện mũi & dây dẫn tín hiệu kích nổ chạy dọc vách trong tới kíp nổ đuôi */}
        <mesh geometry={sg.centralPin} material={MAT.silverProbe()} position={[0, 0.086, -0.002]} />
        <mesh geometry={sg.firingWireL} material={MAT.wireJacket()} />
        <mesh geometry={sg.firingWireL} material={MAT.wireJacket()} scale={[-1, 1, 1]} />

        {/* Tia lửa xung điện tại mũi áp điện khi chạm giáp */}
        {det > 0.005 && (
          <group position={[0, 0.008, 0.008]}>
            <mesh scale={0.012 + 0.015 * (1 - Math.min(1, det * 1.4))}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#9ef7ff" toneMapped={false} />
            </mesh>
          </group>
        )}

        {/* ================= 2. KHỐI THUỐC NỔ RDX/OCTOL, KÍP NỔ ĐUÔI & WAVE-SHAPER ================= */}
        <mesh geometry={dynLinerHE.he.body} material={MAT.heBody()} castShadow receiveShadow />
        <mesh
          geometry={dynLinerHE.he.cap}
          material={MAT.heCut()}
          position={[0, 0, 0.0005]}
          receiveShadow
        />

        {/* Vùng sản phẩm cháy nổ cao áp sẫm cam nóng phía sau mặt sóng kích nổ (liền khối qua x = 0) */}
        {dynWave && (
          <mesh geometry={dynWave.shockedUnifiedCap} position={[0, 0, 0.0008]}>
            <meshBasicMaterial color="#9e3805" transparent opacity={0.42} depthWrite={false} />
          </mesh>
        )}

        {/* Sóng kích nổ (Detonation Shockwave) quét từ kíp nổ đuôi y=0.98 ôm xuống lưng phễu đồng */}
        {dynWave && (
          <group>
            {/* Vành khí nén cam rực ngay sau mặt sóng */}
            <mesh geometry={dynWave.haloWave.body}>
              <meshBasicMaterial
                color="#ff5e00"
                transparent
                opacity={0.42}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            <mesh geometry={dynWave.haloWave.rightCap} position={[0, 0, 0.0014]}>
              <meshBasicMaterial
                color="#ff6f00"
                transparent
                opacity={0.72}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            <mesh geometry={dynWave.haloWave.leftCap} position={[0, 0, 0.0014]}>
              <meshBasicMaterial
                color="#ff6f00"
                transparent
                opacity={0.72}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>

            {/* Lõi mặt sóng kích nổ Chapman-Jouguet trắng-vàng sắc lẹm */}
            <mesh geometry={dynWave.coreWave.body}>
              <meshBasicMaterial color="#fff3b0" toneMapped={false} />
            </mesh>
            <mesh geometry={dynWave.coreWave.rightCap} position={[0, 0, 0.002]}>
              <meshBasicMaterial color="#fff8cf" toneMapped={false} />
            </mesh>
            <mesh geometry={dynWave.coreWave.leftCap} position={[0, 0, 0.002]}>
              <meshBasicMaterial color="#fff8cf" toneMapped={false} />
            </mesh>

            {/* Các vòng gợn sóng áp suất thứ cấp biểu diễn hướng truyền sóng từ đuôi xuống */}
            {dynWave.ripple1 && (
              <>
                <mesh geometry={dynWave.ripple1.rightCap} position={[0, 0, 0.0015]}>
                  <meshBasicMaterial color="#ffb72b" transparent opacity={0.62} toneMapped={false} depthWrite={false} />
                </mesh>
                <mesh geometry={dynWave.ripple1.leftCap} position={[0, 0, 0.0015]}>
                  <meshBasicMaterial color="#ffb72b" transparent opacity={0.62} toneMapped={false} depthWrite={false} />
                </mesh>
              </>
            )}
            {dynWave.ripple2 && (
              <>
                <mesh geometry={dynWave.ripple2.rightCap} position={[0, 0, 0.0015]}>
                  <meshBasicMaterial color="#ff9214" transparent opacity={0.46} toneMapped={false} depthWrite={false} />
                </mesh>
                <mesh geometry={dynWave.ripple2.leftCap} position={[0, 0, 0.0015]}>
                  <meshBasicMaterial color="#ff9214" transparent opacity={0.46} toneMapped={false} depthWrite={false} />
                </mesh>
              </>
            )}
            {dynWave.ripple3 && (
              <>
                <mesh geometry={dynWave.ripple3.rightCap} position={[0, 0, 0.0015]}>
                  <meshBasicMaterial color="#ff7708" transparent opacity={0.32} toneMapped={false} depthWrite={false} />
                </mesh>
                <mesh geometry={dynWave.ripple3.leftCap} position={[0, 0, 0.0015]}>
                  <meshBasicMaterial color="#ff7708" transparent opacity={0.32} toneMapped={false} depthWrite={false} />
                </mesh>
              </>
            )}

            {/* Nguồn sáng đặt lùi ra z = 0.28 với cường độ vừa phải để tôn ánh vàng cam mà không làm cháy trắng mặt cắt RDX */}
            <pointLight
              position={[0, dynWave.yLight, 0.28]}
              color="#ff9928"
              intensity={0.65}
              distance={1.2}
              decay={1.5}
            />
          </group>
        )}

        {/* Đĩa nắn sóng nổ (Inert Wave-Shaper), Trạm kích nổ (Booster) & Kíp nổ đuôi (Base Detonator) đặt nổi rõ trên mặt cắt */}
        <mesh geometry={sg.waveShaper.body} material={MAT.waveShaper()} />
        <mesh geometry={sg.waveShaper.cap} material={MAT.waveShaperCut()} position={[0, 0, 0.0022]} />

        <mesh geometry={sg.booster.body} material={MAT.boosterBody()} />
        <mesh geometry={sg.booster.cap} material={MAT.boosterCut()} position={[0, 0, 0.0022]} />

        <mesh geometry={sg.detonator.body} material={MAT.silverProbe()} />
        <mesh geometry={sg.detonator.cap} material={MAT.brassFuze()} position={[0, 0, 0.0024]} />

        {/* ================= 3. PHỄU ĐỒNG 60° (CONICAL COPPER LINER) & BIẾN DẠNG ÉP SẬP ================= */}
        <mesh geometry={dynLinerHE.liner.body} material={MAT.copperBody()} castShadow receiveShadow />
        <mesh
          geometry={dynLinerHE.bufferCaps.rightCap}
          material={MAT.linerBuffer()}
          position={[0, 0, 0.0011]}
        />
        <mesh
          geometry={dynLinerHE.bufferCaps.leftCap}
          material={MAT.linerBuffer()}
          position={[0, 0, 0.0011]}
        />
        <mesh
          geometry={dynLinerHE.liner.rightCap}
          material={MAT.copperCut()}
          position={[0, 0, 0.0016]}
          receiveShadow
        />
        <mesh
          geometry={dynLinerHE.liner.leftCap}
          material={MAT.copperCut()}
          position={[0, 0, 0.0016]}
          receiveShadow
        />

        {/* Cổ hội tụ đồng nung sáng cam-vàng dưới áp suất va chạm ~100 GPa */}
        {dynLinerHE.hotThroatCaps && (
          <>
            <mesh geometry={dynLinerHE.hotThroatCaps.rightCap} position={[0, 0, 0.0022]}>
              <meshBasicMaterial
                color="#ffb057"
                transparent
                opacity={0.55 * clamp01(col * 1.3)}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            <mesh geometry={dynLinerHE.hotThroatCaps.leftCap} position={[0, 0, 0.0022]}>
              <meshBasicMaterial
                color="#ffb057"
                transparent
                opacity={0.55 * clamp01(col * 1.3)}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          </>
        )}

        {/* ================= 4. LUỒNG XUYÊN KIM LOẠI SIÊU TỐC MUNROE 8 KM/S & CHÀY ĐỒNG ================= */}
        {dynJet && (
          <group>
            {/* Khối chày đồng (Slug) dày nặng bám theo sau */}
            <mesh geometry={dynJet.slugGeom} material={MAT.slugCopper()} castShadow />

            {/* Quầng plasma xung kích cam đỏ bao quanh luồng đồng */}
            <mesh geometry={dynJet.jetSheathGeom}>
              <meshBasicMaterial
                color="#ff4d00"
                transparent
                opacity={0.32}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>

            {/* Lớp vỏ đồng nóng chảy cam vàng rực */}
            <mesh geometry={dynJet.jetOuterGeom}>
              <meshBasicMaterial color="#ff7619" toneMapped={false} />
            </mesh>

            {/* Lõi plasma đồng trắng-vàng chói 8 km/s */}
            <mesh geometry={dynJet.jetCoreGeom} position={[0, 0, 0.0015]}>
              <meshBasicMaterial color="#fff8dc" toneMapped={false} />
            </mesh>

            {/* Giọt kim loại nóng chảy bắn tóe quanh miệng lỗ trong khoang standoff */}
            {showSplash &&
              SPLASH_SEEDS.map((sp, idx) => {
                const burst = clamp01((jt - 0.28) * 2.4);
                const r = 0.02 + sp.reach * burst;
                const x = Math.sin(sp.phi) * r;
                const z = Math.cos(sp.phi) * r * 0.75;
                const y = 0.012 + sp.elev * 0.14 * burst - 0.03 * burst * burst;
                return (
                  <mesh
                    key={idx}
                    position={[x, y, z]}
                    rotation={[0, 0, -Math.sin(sp.phi) * 0.65]}
                    scale={[sp.size * 0.75, sp.size * 2.7, sp.size * 0.75]}
                  >
                    <octahedronGeometry args={[1, 0]} />
                    <meshBasicMaterial
                      color={idx % 2 === 0 ? '#fff2bd' : '#ff8524'}
                      toneMapped={false}
                    />
                  </mesh>
                );
              })}

            <pointLight
              position={[0, Math.max(-0.35, dynJet.yTip * 0.55), 0.24]}
              color="#ff8826"
              intensity={0.6 * jt}
              distance={1.1}
              decay={1.5}
            />
          </group>
        )}

        {/* ================= 5. TẤM GIÁP THÉP NÓC XE TĂNG CẮT BỔ & LỖ XUYÊN SPALL ================= */}
        {showArmor && dynArmor && (
          <group>
            {/* Thân tấm giáp thép nóc sơn ngụy trang NATO + lớp lót Kevlar chống mảnh spall dưới trần */}
            <mesh
              geometry={sg.armorOuterBody}
              material={MAT.armorRoofPaint()}
              castShadow
              receiveShadow
            />
            <mesh geometry={sg.spallLinerBody} material={MAT.spallLiner()} receiveShadow />

            {/* Mặt cắt thép cán đồng nhất (RHA) phẳng sắc nét tại z = 0 */}
            <mesh
              geometry={sg.armorRightCut}
              material={MAT.armorCut()}
              position={[0, 0, 0.0004]}
              receiveShadow
            />
            <mesh
              geometry={sg.armorLeftCut}
              material={MAT.armorCut()}
              position={[0, 0, 0.0004]}
              receiveShadow
            />

            {/* Vạch gờ mép thép cán & lớp lót spall trên mặt cắt z = 0 */}
            {[1, -1].map((sgn) => (
              <React.Fragment key={sgn}>
                <mesh
                  geometry={rbox(ARMOR_HALF_W - ARMOR_PLUG_R, 0.003, 0.0015, 0.0005)}
                  material={MAT.armorBevelLine()}
                  position={[sgn * (ARMOR_HALF_W + ARMOR_PLUG_R) * 0.5, -0.0018, 0.0008]}
                />
                <mesh
                  geometry={rbox(ARMOR_HALF_W - ARMOR_PLUG_R, 0.011, 0.002, 0.001)}
                  material={MAT.spallLiner()}
                  position={[
                    sgn * (ARMOR_HALF_W + ARMOR_PLUG_R) * 0.5,
                    -ARMOR_THICK - 0.0055,
                    0.0004,
                  ]}
                />
              </React.Fragment>
            ))}

            {/* Chi tiết nhận diện nóc tháp pháo xe tăng (gờ mối hàn giáp & hàng bu-lông lục giác ở nửa sau z < 0) */}
            <mesh
              geometry={rbox(1.16, 0.013, 0.034, 0.004)}
              material={MAT.collarDark()}
              position={[0, 0.006, -0.32]}
              castShadow
            />
            {BOLT_X.map((bx, idx) => (
              <mesh
                key={idx}
                position={[bx, 0.009, -0.19]}
                material={MAT.collarDark()}
                castShadow
              >
                <cylinderGeometry args={[0.016, 0.016, 0.018, 6]} />
              </mesh>
            ))}

            {/* Vùng nút tâm giáp thép (R <= 0.135 m): liền khối hoặc bị khoan rỗng theo `pierce` */}
            {dynArmor.kind !== 'pierced' ? (
              <>
                <mesh
                  geometry={dynArmor.solid.body}
                  material={MAT.armorRoofPaint()}
                  castShadow
                  receiveShadow
                />
                <mesh
                  geometry={dynArmor.solid.cap}
                  material={MAT.armorCut()}
                  position={[0, 0, 0.0005]}
                  receiveShadow
                />
              </>
            ) : (
              <>
                <mesh
                  geometry={dynArmor.pierced.body}
                  material={MAT.armorRoofPaint()}
                  castShadow
                  receiveShadow
                />
                <mesh
                  geometry={dynArmor.pierced.rightCap}
                  material={MAT.armorCut()}
                  position={[0, 0, 0.0005]}
                  receiveShadow
                />
                <mesh
                  geometry={dynArmor.pierced.leftCap}
                  material={MAT.armorCut()}
                  position={[0, 0, 0.0005]}
                  receiveShadow
                />
              </>
            )}

            {/* Vành thép nung đỏ cam (HAZ) & màng thép nóng chảy trắng-vàng quanh lòng lỗ đục xuyên */}
            {dynArmor.hazOuter && (
              <>
                <mesh geometry={dynArmor.hazOuter.body}>
                  <meshStandardMaterial
                    color="#b82900"
                    emissive="#ff4500"
                    emissiveIntensity={1.65}
                    roughness={0.4}
                    metalness={0.35}
                  />
                </mesh>
                <mesh geometry={dynArmor.hazOuter.rightCap} position={[0, 0, 0.0012]}>
                  <meshBasicMaterial color="#ff5100" toneMapped={false} />
                </mesh>
                <mesh geometry={dynArmor.hazOuter.leftCap} position={[0, 0, 0.0012]}>
                  <meshBasicMaterial color="#ff5100" toneMapped={false} />
                </mesh>
              </>
            )}
            {dynArmor.hazCore && (
              <>
                <mesh geometry={dynArmor.hazCore.body}>
                  <meshBasicMaterial color="#ffae42" toneMapped={false} />
                </mesh>
                <mesh geometry={dynArmor.hazCore.rightCap} position={[0, 0, 0.0019]}>
                  <meshBasicMaterial color="#ffd584" toneMapped={false} />
                </mesh>
                <mesh geometry={dynArmor.hazCore.leftCap} position={[0, 0, 0.0019]}>
                  <meshBasicMaterial color="#ffd584" toneMapped={false} />
                </mesh>
              </>
            )}

            {/* Chùm mảnh thép văng sắc cạnh (Spall Shards & Slag Streaks) bắn tung tóe dưới đáy tấm giáp (y < -0.10) */}
            {spallProgress > 0.01 &&
              SPALL_SHARDS.map((fg, idx) => {
                const travel = (0.045 + 0.35 * fg.speed) * spallProgress;
                const radial = 0.022 + travel * fg.spread;
                const x = Math.sin(fg.phi) * radial;
                const z = Math.cos(fg.phi) * radial * 0.85 - 0.010;
                const y = -ARMOR_THICK - 0.016 - travel;

                if (fg.streak) {
                  // Vệt tia xỉ kim loại nóng trắng-cam văng xiên theo vector vận tốc
                  const tiltZ = Math.atan2(x, travel + 0.04);
                  const tiltX = -Math.atan2(z, travel + 0.04);
                  return (
                    <mesh
                      key={idx}
                      position={[x, y, z]}
                      rotation={[tiltX, 0, tiltZ]}
                      scale={[0.0026, fg.size * 3.4, 0.0026]}
                    >
                      <octahedronGeometry args={[1, 0]} />
                      <meshBasicMaterial
                        color={fg.hot > 0.5 ? '#ffe39e' : '#ff6a1a'}
                        toneMapped={false}
                      />
                    </mesh>
                  );
                }

                // Mảnh thép rách sắc cạnh (lăng trụ tam giác dẹt)
                const isIncandescent = fg.hot > 0.42;
                return (
                  <mesh
                    key={idx}
                    position={[x, y, z]}
                    rotation={[
                      fg.rot[0] + spallProgress * 2.6,
                      fg.rot[1] + spallProgress * 2.0,
                      fg.rot[2],
                    ]}
                    scale={[fg.size * 1.45, fg.size * 0.42, fg.size * 1.1]}
                  >
                    <cylinderGeometry args={[0.35, 1.0, 1.0, 3]} />
                    {isIncandescent ? (
                      <meshBasicMaterial
                        color={fg.hot > 0.76 ? '#ffd27d' : '#ff5514'}
                        toneMapped={false}
                      />
                    ) : (
                      <meshStandardMaterial
                        color="#414952"
                        emissive="#9e2200"
                        emissiveIntensity={0.85}
                        metalness={0.72}
                        roughness={0.38}
                      />
                    )}
                  </mesh>
                );
              })}

            {prc > 0.05 && (
              <pointLight
                position={[0, -0.07, 0.24]}
                color="#ff6214"
                intensity={0.55 * prc}
                distance={0.95}
                decay={1.5}
              />
            )}
          </group>
        )}
      </group>
    </group>
  );
};

const ShapedChargePreview: React.FC = () => (
  <ShapedChargeCutaway
    position={[0, 0.55, 0]}
    detonate={0.85}
    collapse={0.6}
    jet={0.8}
    pierce={0.75}
    showArmor
  />
);

export const preview = turntable(ShapedChargePreview, {
  size: 2.12,
  center: [0, 0.77, 0],
});
