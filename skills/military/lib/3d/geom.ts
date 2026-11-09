// Công cụ dựng hình 3D: đùn biên dạng 2D, tiện tròn / cắt góc giải phẫu, nối mượt đa mặt cắt (loft),
// quét tiết diện theo đường cong 3D (sweep), biên dạng cánh khí động (airfoil), tạo độ dày vỏ (shell), mặt phẳng cắt.
// Quy ước khi dựng mô hình: lấy kích thước thật (mét) làm đơn vị, mũi phương tiện hướng +X, trên là +Y.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const cache = new Map<string, THREE.BufferGeometry>();
const memo = (key: string, make: () => THREE.BufferGeometry) => {
  let g = cache.get(key);
  if (!g) {
    g = make();
    g.computeBoundingBox();
    cache.set(key, g);
  }
  return g;
};

export type P2 = [number, number];
export type P3 = [number, number, number];

const ensureCCW = (pts: P2[]): P2[] => {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    area += x0 * y1 - x1 * y0;
  }
  return area >= 0 ? pts : [...pts].reverse();
};

const resampleClosed = (raw: P2[], seg: number): P2[] => {
  const pts = ensureCCW(raw);
  const n = pts.length;
  const cum = [0];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = Math.max(1e-6, cum[n]);
  // Xoay điểm bắt đầu về góc gần +X (theta = 0 quanh tâm đa giác) nhất để không bị xoắn lưới giữa các trạm.
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x / n; cy += y / n; }
  let best = 0, bestScore = -Infinity;
  for (let i = 0; i < n; i++) {
    const dx = pts[i][0] - cx, dy = pts[i][1] - cy, r = Math.hypot(dx, dy) || 1;
    const sc = dx / r - Math.abs(dy / r) * 0.25;
    if (sc > bestScore) { bestScore = sc; best = i; }
  }
  const s0 = cum[best];
  const out: P2[] = [];
  for (let k = 0; k < seg; k++) {
    let target = (s0 + (k / seg) * total) % total;
    if (target < 0) target += total;
    let idx = 0;
    while (idx < n - 1 && cum[idx + 1] < target) idx++;
    const segLen = Math.max(1e-6, cum[idx + 1] - cum[idx]);
    const t = (target - cum[idx]) / segLen;
    const [x0, y0] = pts[idx], [x1, y1] = pts[(idx + 1) % n];
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
  }
  return out;
};

/**
 * Đùn một biên dạng 2D (mặt cắt nhìn ngang, trục X–Y) thành khối dày `depth` theo Z, căn giữa Z.
 * Dùng cho thân xe phẳng sườn, càng kéo, vách ngăn… `bevel` = vát mép (m).
 */
export const extrude = (pts: P2[], depth: number, bevel = 0.04) =>
  memo(`ex${JSON.stringify(pts)}${depth}${bevel}`, () => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16 });
    g.translate(0, 0, -(depth - bevel * 2) / 2);
    g.computeVertexNormals();
    return g;
  });

/** Đùn biên dạng nhìn từ trên (trục X–Z) thành khối cao `h` theo Y, đáy ở y=0. Dùng cho mặt bằng tháp pháo, sàn. */
export const extrudeTop = (pts: P2[], h: number, bevel = 0.04) =>
  memo(`ext${JSON.stringify(pts)}${h}${bevel}`, () => {
    const g = extrude(pts, h, bevel).clone();
    g.rotateX(Math.PI / 2);
    g.translate(0, h / 2, 0);
    return g;
  });

/**
 * Tiện tròn quanh trục: `profile` là [bán kính, vị trí dọc trục] từ đầu tới cuối. Kết quả nằm dọc trục +X
 * (từ x=profile[0][1]) — đúng cho nòng pháo, đạn, ống phóng, vỏ tên lửa. `seg` = số cạnh tròn.
 */
export const lathe = (profile: P2[], seg = 32) =>
  memo(`la${JSON.stringify(profile)}${seg}`, () => {
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
    g.rotateZ(-Math.PI / 2);
    return g;
  });

/**
 * Tiện tròn một cung góc `arc` (rad, ví dụ Math.PI * 1.5 để mở góc cắt 90° lộ cơ khí bên trong), có bịt 2 mặt cắt dọc.
 */
export const revolve = (profile: P2[], seg = 40, arc = Math.PI * 2, phiStart = 0) =>
  memo(`rev${JSON.stringify(profile)}${seg}${arc}${phiStart}`, () => {
    const clamped = Math.min(Math.PI * 2, Math.max(0.05, arc));
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg, phiStart, clamped);
    g.rotateZ(-Math.PI / 2);
    if (clamped < Math.PI * 2 - 1e-3 && profile.length >= 3) {
      const sh = new THREE.Shape(profile.map(([r, x]) => new THREE.Vector2(x, Math.max(r, 0))));
      sh.lineTo(profile[profile.length - 1][1], 0);
      sh.lineTo(profile[0][1], 0);
      const capA = new THREE.ShapeGeometry(sh);
      capA.rotateX(phiStart - Math.PI / 2);
      const capB = new THREE.ShapeGeometry(sh);
      // Đảo chiều pháp tuyến cho mặt cắt thứ hai
      const idx = capB.index!;
      for (let i = 0; i < idx.count; i += 3) {
        const tmp = idx.getX(i + 1);
        idx.setX(i + 1, idx.getX(i + 2));
        idx.setX(i + 2, tmp);
      }
      capB.rotateX(phiStart + clamped - Math.PI / 2);
      const merged = merge([g, capA, capB]);
      merged.computeVertexNormals();
      return merged;
    }
    return g;
  });

/** Trạm mặt cắt cho `loft()`: dùng bán kính siêu elip (`rz` nửa rộng Z, `ry` nửa cao Y) hoặc đa giác `pts` [z, y][]. */
export type LoftStation = {
  /** Vị trí dọc trục chính +X (m). Tự động sắp tăng dần theo x. */
  x: number;
  /** Bán kính ngang (nửa bề rộng theo Z, mét). */
  rz?: number;
  /** Bán kính đứng (nửa chiều cao theo Y, mét). */
  ry?: number;
  /** Tâm mặt cắt theo Y (mặc định 0). */
  y?: number;
  /** Tâm mặt cắt theo Z (mặc định 0). */
  z?: number;
  /** Độ vuông góc siêu elip: 2 = elip tròn, 3.5..5 = thân hộp bầu, 1.2 = thoi vát cạnh; hoặc [nTop, nBot] bất đối xứng lưng/bụng. */
  n?: number | [number, number];
  /** Góc xoắn mặt cắt quanh trục X (rad). */
  twist?: number;
  /** Biên dạng mặt cắt tuỳ ý [z, y][] (dùng khi cần góc vát tàng hình, sống tàu chữ V…). */
  pts?: P2[];
};

export type LoftOpts = {
  /** Số cạnh quanh chu vi mặt cắt (mặc định 40). */
  radialSeg?: number;
  /** Số bước nội suy mượt Catmull-Rom giữa mỗi cặp trạm (mặc định 4; đặt 1 nếu muốn nối thẳng). */
  subdiv?: number;
  /** Đóng kín hai đầu (mặc định true). */
  caps?: boolean | [boolean, boolean];
  /** Góc gãy cạnh sắc (độ, mặc định 46°): nhỏ hơn thì bo mượt, lớn hơn thì giữ sống cạnh giáp/tàng hình sắc nét. */
  crease?: number;
};

const superPt = (theta: number, rz: number, ry: number, nTop: number, nBot: number, twist: number): P2 => {
  const ct = Math.cos(theta), st = Math.sin(theta);
  const e = st >= 0 ? 2 / Math.max(0.35, nTop) : 2 / Math.max(0.35, nBot);
  const z0 = rz * Math.sign(ct) * Math.pow(Math.abs(ct), e);
  const y0 = ry * Math.sign(st) * Math.pow(Math.abs(st), e);
  if (!twist) return [z0, y0];
  const cw = Math.cos(twist), sw = Math.sin(twist);
  return [z0 * cw - y0 * sw, z0 * sw + y0 * cw];
};

const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

/**
 * Nối mượt chuỗi mặt cắt biến thiên dọc trục +X (thân máy bay, tàu chiến, tàu ngầm, tháp pháo đúc, vỏ động cơ, mũi tên lửa…).
 * Tự nội suy mượt giữa các trạm, khâu liền đường ghép UV và tính pháp tuyến mượt không gãy mép.
 */
export const loft = (stations: LoftStation[], opts: LoftOpts = {}) =>
  memo(`loft${JSON.stringify(stations)}${JSON.stringify(opts)}`, () => {
    const radialSeg = Math.max(8, opts.radialSeg ?? 40);
    const subdiv = Math.max(1, opts.subdiv ?? 4);
    const [capStart, capEnd] = Array.isArray(opts.caps) ? opts.caps : [opts.caps ?? true, opts.caps ?? true];
    const sorted = [...stations].sort((a, b) => a.x - b.x);
    if (sorted.length < 2) throw new Error('loft() cần ít nhất 2 trạm mặt cắt');

    // Chuẩn hoá mọi trạm thành vòng điểm [z, y] cùng số đỉnh `radialSeg` + toạ độ tâm (x, yc, zc)
    const baseRings = sorted.map((s) => {
      const yc = s.y ?? 0, zc = s.z ?? 0;
      if (s.pts && s.pts.length >= 3) {
        const ring = resampleClosed(s.pts, radialSeg).map(([z, y]): P2 => [z + zc, y + yc]);
        return { x: s.x, yc, zc, ring };
      }
      const rz = Math.max(1e-4, s.rz ?? 0.5), ry = Math.max(1e-4, s.ry ?? 0.5);
      const [nT, nB] = Array.isArray(s.n) ? s.n : [s.n ?? 2, s.n ?? 2];
      const tw = s.twist ?? 0;
      const ring: P2[] = [];
      for (let j = 0; j < radialSeg; j++) {
        const [z, y] = superPt((j / radialSeg) * Math.PI * 2, rz, ry, nT, nB, tw);
        ring.push([z + zc, y + yc]);
      }
      return { x: s.x, yc, zc, ring };
    });

    // Nội suy mượt giữa các trạm (kẹp biên để không vọt lố bán kính âm ở chóp mũi)
    const rings: { x: number; yc: number; zc: number; ring: P2[] }[] = [];
    const M = baseRings.length;
    for (let i = 0; i < M - 1; i++) {
      const r0 = baseRings[Math.max(0, i - 1)], r1 = baseRings[i], r2 = baseRings[i + 1], r3 = baseRings[Math.min(M - 1, i + 2)];
      const steps = i === M - 2 ? subdiv : subdiv;
      for (let s = 0; s < steps; s++) {
        if (subdiv === 1 && s > 0) break;
        const t = s / subdiv;
        const x = r1.x + (r2.x - r1.x) * t;
        const yc = catmull(r0.yc, r1.yc, r2.yc, r3.yc, t);
        const zc = catmull(r0.zc, r1.zc, r2.zc, r3.zc, t);
        const ring: P2[] = [];
        for (let j = 0; j < radialSeg; j++) {
          const z = catmull(r0.ring[j][0], r1.ring[j][0], r2.ring[j][0], r3.ring[j][0], t);
          const y = catmull(r0.ring[j][1], r1.ring[j][1], r2.ring[j][1], r3.ring[j][1], t);
          ring.push([z, y]);
        }
        rings.push({ x, yc, zc, ring });
      }
    }
    rings.push(baseRings[M - 1]);

    const R = rings.length;
    const cols = radialSeg + 1;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const xMin = rings[0].x, xSpan = Math.max(1e-4, rings[R - 1].x - xMin);

    for (let i = 0; i < R; i++) {
      const { x, ring } = rings[i];
      const u = (x - xMin) / xSpan;
      for (let j = 0; j <= radialSeg; j++) {
        const [z, y] = ring[j % radialSeg];
        pos.push(x, y, z);
        uv.push(u, j / radialSeg);
      }
    }

    for (let i = 0; i < R - 1; i++) {
      for (let j = 0; j < radialSeg; j++) {
        const a = i * cols + j, b = (i + 1) * cols + j, c = b + 1, d = a + 1;
        idx.push(a, b, c, a, c, d);
      }
    }

    // Đóng nắp hai đầu đúng tâm thực của vòng điểm đầu/cuối (kể cả khi `pts` dịch tâm Y/Z)
    const ringCenter = (ring: P2[]): P2 => {
      let cz = 0, cy = 0;
      for (const [z, y] of ring) { cz += z / ring.length; cy += y / ring.length; }
      return [cz, cy];
    };
    if (capStart) {
      const [cz0, cy0] = ringCenter(rings[0].ring);
      const cIdx = pos.length / 3;
      pos.push(rings[0].x, cy0, cz0);
      uv.push(0, 0.5);
      for (let j = 0; j < radialSeg; j++) idx.push(cIdx, j, j + 1);
    }
    if (capEnd) {
      const [cz1, cy1] = ringCenter(rings[R - 1].ring);
      const base = (R - 1) * cols;
      const cIdx = pos.length / 3;
      pos.push(rings[R - 1].x, cy1, cz1);
      uv.push(1, 0.5);
      for (let j = 0; j < radialSeg; j++) idx.push(cIdx, base + j + 1, base + j);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return toCreasedNormals(g, ((opts.crease ?? 46) * Math.PI) / 180);
  });

export type SweepOpts = {
  /** Số bước chia dọc đường dẫn (mặc định 48). */
  steps?: number;
  /** Tỉ lệ thu phóng tiết diện theo u (0..1): hằng số, [sx, sy], hoặc mảng [u, sx, sy][]. */
  taper?: [number, number] | [number, number, number][];
  /** Góc xoắn (rad) biến thiên tuyến tính từ đầu tới cuối [twist0, twist1] (dùng cho cánh quạt, cánh máy bay). */
  twist?: [number, number];
  /** Đóng kín 2 mặt đầu mút (mặc định true). */
  caps?: boolean;
};

const evalTaper = (taper: SweepOpts['taper'], u: number): [number, number] => {
  if (!taper) return [1, 1];
  if (typeof taper[0] === 'number') {
    const [s0, s1] = taper as [number, number];
    const s = s0 + (s1 - s0) * u;
    return [s, s];
  }
  const stops = taper as [number, number, number][];
  if (u <= stops[0][0]) return [stops[0][1], stops[0][2]];
  for (let i = 0; i < stops.length - 1; i++) {
    const [u0, x0, y0] = stops[i], [u1, x1, y1] = stops[i + 1];
    if (u <= u1) {
      const t = (u - u0) / Math.max(1e-6, u1 - u0);
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
  }
  const last = stops[stops.length - 1];
  return [last[1], last[2]];
};

/**
 * Quét biên dạng 2D `profile` ([ngang, cao] theo mét) chạy dọc đường cong 3D `curvePts` bằng hệ khung trượt không lật (Bishop frame).
 * Hỗ trợ thuôn nhọn (`taper`) và xoắn khí động (`twist`) — dùng cho cánh máy bay/tên lửa, chân vịt tàu ngầm, cánh quạt, ống dẫn, sườn cong.
 */
export const sweep = (profile: P2[], curvePts: P3[], opts: SweepOpts = {}) =>
  memo(`swp${JSON.stringify(profile)}${JSON.stringify(curvePts)}${JSON.stringify(opts)}`, () => {
    const prof = ensureCCW(profile);
    const steps = Math.max(4, opts.steps ?? 48);
    const [tw0, tw1] = opts.twist ?? [0, 0];
    const caps = opts.caps ?? true;
    const curve = new THREE.CatmullRomCurve3(curvePts.map((p) => new THREE.Vector3(...p)));
    const pts = curve.getSpacedPoints(steps);
    const tangents: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) tangents.push(curve.getTangent(i / steps).normalize());

    // Hệ khung song song (Parallel Transport / Bishop) tránh xoắn gãy đột ngột ở điểm uốn
    const normals: THREE.Vector3[] = [];
    const binormals: THREE.Vector3[] = [];
    const up0 = Math.abs(tangents[0].y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const n0 = up0.clone().addScaledVector(tangents[0], -up0.dot(tangents[0])).normalize();
    normals.push(n0);
    binormals.push(new THREE.Vector3().crossVectors(tangents[0], n0).normalize());

    const axis = new THREE.Vector3();
    for (let i = 1; i <= steps; i++) {
      const prevN = normals[i - 1].clone();
      axis.crossVectors(tangents[i - 1], tangents[i]);
      if (axis.lengthSq() > 1e-10) {
        const ang = Math.acos(Math.max(-1, Math.min(1, tangents[i - 1].dot(tangents[i]))));
        prevN.applyAxisAngle(axis.normalize(), ang);
      }
      prevN.addScaledVector(tangents[i], -prevN.dot(tangents[i])).normalize();
      normals.push(prevN);
      binormals.push(new THREE.Vector3().crossVectors(tangents[i], prevN).normalize());
    }

    const K = prof.length, cols = K + 1;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const p = new THREE.Vector3();

    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const [sx, sy] = evalTaper(opts.taper, u);
      const tw = tw0 + (tw1 - tw0) * u;
      const ct = Math.cos(tw), st = Math.sin(tw);
      const B = binormals[i], N = normals[i], C = pts[i];
      for (let j = 0; j <= K; j++) {
        const [px0, py0] = prof[j % K];
        const px = px0 * sx, py = py0 * sy;
        const rx = px * ct - py * st, ry = px * st + py * ct;
        p.copy(C).addScaledVector(B, rx).addScaledVector(N, ry);
        pos.push(p.x, p.y, p.z);
        uv.push(u, j / K);
      }
    }

    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < K; j++) {
        const a = i * cols + j, b = (i + 1) * cols + j, c = b + 1, d = a + 1;
        idx.push(a, b, c, a, c, d);
      }
    }

    if (caps) {
      let cx0 = 0, cy0 = 0;
      for (const [px, py] of prof) { cx0 += px / K; cy0 += py / K; }
      const [sx0, sy0] = evalTaper(opts.taper, 0);
      const [sx1, sy1] = evalTaper(opts.taper, 1);
      const cStart = pos.length / 3;
      const p0 = pts[0].clone().addScaledVector(binormals[0], cx0 * sx0).addScaledVector(normals[0], cy0 * sy0);
      pos.push(p0.x, p0.y, p0.z); uv.push(0, 0.5);
      for (let j = 0; j < K; j++) idx.push(cStart, j, j + 1);

      const baseEnd = steps * cols;
      const cEnd = pos.length / 3;
      const p1 = pts[steps].clone().addScaledVector(binormals[steps], cx0 * sx1).addScaledVector(normals[steps], cy0 * sy1);
      pos.push(p1.x, p1.y, p1.z); uv.push(1, 0.5);
      for (let j = 0; j < K; j++) idx.push(cEnd, baseEnd + j + 1, baseEnd + j);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });

/**
 * Sinh biên dạng cánh khí động NACA 4 số chuẩn (dây cung `chord` mét, độ dày tương đối `thickness` 0.08..0.18, độ cong `camber` 0..0.06).
 * Mép trước hướng về +X (x = +0.25*chord), mép sau hướng về -X (x = -0.75*chord) — sẵn sàng truyền thẳng vào `sweep()` hoặc `extrude()`.
 */
export const airfoil = (chord: number, thickness = 0.12, camber = 0.02, seg = 24): P2[] => {
  const upper: P2[] = [], lower: P2[] = [];
  const p = 0.4;
  for (let i = 0; i <= seg; i++) {
    // Phân bố cosine dày điểm ở mép trước để mũi cánh tròn mượt
    const beta = (i / seg) * Math.PI;
    const xc = 0.5 * (1 - Math.cos(beta));
    const yt = 5 * thickness * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc ** 3 - 0.1036 * xc ** 4);
    const yc = camber === 0 ? 0 : xc < p ? (camber / (p * p)) * (2 * p * xc - xc * xc) : (camber / ((1 - p) ** 2)) * ((1 - 2 * p) + 2 * p * xc - xc * xc);
    const xPos = (0.25 - xc) * chord;
    upper.push([xPos, (yc + yt) * chord]);
    if (i > 0 && i < seg) lower.push([xPos, (yc - yt) * chord]);
  }
  return ensureCCW([...upper, ...lower.reverse()]);
};

/**
 * Tạo độ dày thành vỏ `thickness` (m) cho một mặt lưới hở (vỏ nắp khoang, tấm chắn, nửa thân cắt mở).
 */
export const shell = (surface: THREE.BufferGeometry, thickness = 0.04) => {
  const src = surface.index ? surface.clone() : surface.clone();
  src.computeVertexNormals();
  const outer = src.clone();
  const inner = src.clone();
  const pos = inner.attributes.position as THREE.BufferAttribute;
  const nrm = inner.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) - nrm.getX(i) * thickness, pos.getY(i) - nrm.getY(i) * thickness, pos.getZ(i) - nrm.getZ(i) * thickness);
    nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i));
  }
  if (inner.index) {
    const a = inner.index;
    for (let i = 0; i < a.count; i += 3) { const tmp = a.getX(i + 1); a.setX(i + 1, a.getX(i + 2)); a.setX(i + 2, tmp); }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      for (const attr of [pos, nrm]) {
        const tx = attr.getX(i + 1), ty = attr.getY(i + 1), tz = attr.getZ(i + 1);
        attr.setXYZ(i + 1, attr.getX(i + 2), attr.getY(i + 2), attr.getZ(i + 2));
        attr.setXYZ(i + 2, tx, ty, tz);
      }
    }
  }
  return merge([outer, inner]);
};

/** Tạo mặt phẳng cắt giải phẫu 3D: giữ lại phần thoả `normal · point + offset >= 0` (truyền vào `clipMat(mat, [plane])`). */
export const clipPlane = (normal: P3, offset = 0) => new THREE.Plane(new THREE.Vector3(...normal).normalize(), offset);

/** Hộp vát tròn cạnh bán kính r. */
export const rbox = (w: number, h: number, d: number, r = 0.05, seg = 2) =>
  memo(`rb${w}${h}${d}${r}${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)));

/** Ống tròn chạy theo đường cong qua các điểm (dây, ống thủy lực, tay vịn). */
export const pipe = (pts: P3[], r = 0.03, seg = 48) =>
  memo(`pi${JSON.stringify(pts)}${r}${seg}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 10, false));

/** Gộp nhiều geometry (đã đặt vị trí bằng applyMatrix4) thành một để vẽ nhanh. */
export const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;

/** Ma trận đặt vị trí/xoay/tỉ lệ (dùng với merge hoặc InstancedMesh). */
export const mat4 = (pos: P3, rot: P3 = [0, 0, 0], scale: number | P3 = 1) => {
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...s));
};
