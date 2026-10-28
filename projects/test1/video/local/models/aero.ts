// Công cụ dựng cánh khí động học NACA (loft thiết diện cánh từ gốc tới mút có UV chuẩn cho paint()).
import * as THREE from 'three';

const aeroCache = new Map<string, THREE.BufferGeometry>();

export type WingSpec = {
  /** Dây cung gốc cánh (m) và tâm X gốc cánh (mép trước ở rootX + rootChord * 0.5) */
  rootChord: number;
  rootX: number;
  /** Dây cung mút cánh (m) và tâm X mút cánh */
  tipChord: number;
  tipX: number;
  /** Chiều dài nửa sải cánh (m, luôn dương) */
  span: number;
  /** Tỉ lệ độ dày tối đa / dây cung (vd 0.13) */
  thickness?: number;
  /** Độ vồng mặt trên (camber, vd 0.025) */
  camber?: number;
  /** Độ nâng mút cánh theo Y (dihedral, m; âm = chúc xuống như đuôi MQ-1) */
  dihedralY?: number;
  /** Độ xoắn mút cánh (rad) */
  washout?: number;
  /** +1 = cánh phải (+Z), -1 = cánh trái (-Z) — giữ nguyên scale dương để không lật pháp tuyến bóng đổ */
  side?: 1 | -1;
  segSpan?: number;
  segProfile?: number;
};

/** Sinh geometry cánh khí động mượt có đầy đủ position, normal, uv. */
export function airfoilWing(o: WingSpec): THREE.BufferGeometry {
  const key = JSON.stringify(o);
  if (aeroCache.has(key)) return aeroCache.get(key)!;

  const {
    rootChord,
    rootX,
    tipChord,
    tipX,
    span,
    thickness = 0.13,
    camber = 0.024,
    dihedralY = 0,
    washout = -0.02,
    side = 1,
    segSpan = 10,
    segProfile = 28,
  } = o;

  // Thiết diện NACA mỏng: u chạy 0..1 từ mép sau -> mặt trên -> mép trước -> mặt dưới -> mép sau
  const profilePt = (u: number): [number, number] => {
    // u=0: TE(x=-0.5), u=0.5: LE(x=+0.5), u=1: TE(x=-0.5)
    const upper = u <= 0.5;
    const s = upper ? 1 - u * 2 : (u - 0.5) * 2; // s: 0 tại mũi LE, 1 tại đuôi TE
    // Phân bố cosine cho mũi cánh tròn mượt
    const xc = 0.5 * (1 - Math.cos(s * Math.PI)); // 0 (LE) -> 1 (TE)
    const yt =
      5 *
      thickness *
      (0.2969 * Math.sqrt(Math.max(0, xc)) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc ** 3 - 0.1015 * xc ** 4);
    const yc = camber * 4 * xc * (1 - xc);
    const localX = 0.5 - xc; // +0.5 tại LE, -0.5 tại TE
    const localY = yc + (upper ? yt : -yt * 0.75);
    return [localX, localY];
  };

  const rings: [number, number, number][][] = [];
  for (let j = 0; j <= segSpan; j++) {
    const v = j / segSpan;
    const chord = rootChord + (tipChord - rootChord) * v;
    const cx = rootX + (tipX - rootX) * v;
    const cy = dihedralY * v;
    const cz = side * span * v;
    const tw = washout * v;
    const cosT = Math.cos(tw),
      sinT = Math.sin(tw);
    const ring: [number, number, number][] = [];
    for (let i = 0; i <= segProfile; i++) {
      const u = i / segProfile;
      const [px, py] = profilePt(u);
      const sx = px * chord;
      const sy = py * chord * (1 - 0.15 * v);
      const rx = sx * cosT - sy * sinT;
      const ry = sx * sinT + sy * cosT;
      ring.push([cx + rx, cy + ry, cz]);
    }
    rings.push(ring);
  }

  const pos: number[] = [];
  const uvs: number[] = [];
  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    ua: [number, number],
    ub: [number, number],
    uc: [number, number],
  ) => {
    pos.push(...a, ...b, ...c);
    uvs.push(...ua, ...ub, ...uc);
  };

  for (let j = 0; j < segSpan; j++) {
    const v0 = j / segSpan,
      v1 = (j + 1) / segSpan;
    for (let i = 0; i < segProfile; i++) {
      const u0 = i / segProfile,
        u1 = (i + 1) / segProfile;
      const a = rings[j][i],
        b = rings[j + 1][i],
        c = rings[j][i + 1],
        d = rings[j + 1][i + 1];
      if (side === 1) {
        pushTri(a, b, c, [u0, v0], [u0, v1], [u1, v0]);
        pushTri(c, b, d, [u1, v0], [u0, v1], [u1, v1]);
      } else {
        pushTri(a, c, b, [u0, v0], [u1, v0], [u0, v1]);
        pushTri(c, d, b, [u1, v0], [u1, v1], [u0, v1]);
      }
    }
  }

  // Nắp đóng kín gốc và mút cánh
  const addCap = (ringIdx: number, outwardSign: number) => {
    const ring = rings[ringIdx];
    const center: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < segProfile; i++) {
      center[0] += ring[i][0] / segProfile;
      center[1] += ring[i][1] / segProfile;
      center[2] += ring[i][2] / segProfile;
    }
    for (let i = 0; i < segProfile; i++) {
      const p0 = ring[i],
        p1 = ring[i + 1];
      if (outwardSign > 0) {
        pushTri(center, p1, p0, [0.5, 0.5], [i / segProfile, 1], [(i + 1) / segProfile, 1]);
      } else {
        pushTri(center, p0, p1, [0.5, 0.5], [i / segProfile, 0], [(i + 1) / segProfile, 0]);
      }
    }
  };
  addCap(0, -side);
  addCap(segSpan, side);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  aeroCache.set(key, g);
  return g;
}
