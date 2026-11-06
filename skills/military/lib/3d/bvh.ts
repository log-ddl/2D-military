// Cây phân hoạch không gian tam giác (BVHTree) thuần TypeScript — tương đương mathutils.bvhtree.BVHTree của Blender.
// Dùng để truy vấn khoảng cách gần nhất từ ống kính camera tới mọi bề mặt vật thể trong cảnh (closestPoint)
// và đẩy mượt camera trượt ra ngoài theo pháp tuyến, cấm đâm xuyên vỏ máy bay, nhà chứa hay địa hình.
import * as THREE from 'three';

export type NearestHit = {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
};

type Tri = {
  ax: number; ay: number; az: number;
  bx: number; by: number; bz: number;
  cx: number; cy: number; cz: number;
  nx: number; ny: number; nz: number;
  mx: number; my: number; mz: number;
};

type BVHNode = {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  left: BVHNode | null;
  right: BVHNode | null;
  start: number;
  count: number;
};

/** Điểm gần nhất trên tam giác ABC tới điểm P (thuật toán chuẩn Ericson Real-Time Collision Detection). */
function closestPointOnTri(
  px: number, py: number, pz: number,
  t: Tri,
  out: { x: number; y: number; z: number },
) {
  const abx = t.bx - t.ax, aby = t.by - t.ay, abz = t.bz - t.az;
  const acx = t.cx - t.ax, acy = t.cy - t.ay, acz = t.cz - t.az;
  const apx = px - t.ax, apy = py - t.ay, apz = pz - t.az;

  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) {
    out.x = t.ax; out.y = t.ay; out.z = t.az;
    return;
  }

  const bpx = px - t.bx, bpy = py - t.by, bpz = pz - t.bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) {
    out.x = t.bx; out.y = t.by; out.z = t.bz;
    return;
  }

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    out.x = t.ax + v * abx; out.y = t.ay + v * aby; out.z = t.az + v * abz;
    return;
  }

  const cpx = px - t.cx, cpy = py - t.cy, cpz = pz - t.cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) {
    out.x = t.cx; out.y = t.cy; out.z = t.cz;
    return;
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    out.x = t.ax + w * acx; out.y = t.ay + w * acy; out.z = t.az + w * acz;
    return;
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    out.x = t.bx + w * (t.cx - t.bx);
    out.y = t.by + w * (t.cy - t.by);
    out.z = t.bz + w * (t.cz - t.bz);
    return;
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  out.x = t.ax + abx * v + acx * w;
  out.y = t.ay + aby * v + acy * w;
  out.z = t.az + abz * v + acz * w;
}

function aabbDistSq(px: number, py: number, pz: number, n: BVHNode): number {
  const dx = px < n.minX ? n.minX - px : px > n.maxX ? px - n.maxX : 0;
  const dy = py < n.minY ? n.minY - py : py > n.maxY ? py - n.maxY : 0;
  const dz = pz < n.minZ ? n.minZ - pz : pz > n.maxZ ? pz - n.maxZ : 0;
  return dx * dx + dy * dy + dz * dz;
}

export class BVHTree {
  private tris: Tri[];
  private root: BVHNode | null;

  private constructor(tris: Tri[]) {
    this.tris = tris;
    this.root = tris.length > 0 ? this.build(0, tris.length, 0) : null;
  }

  /** Dựng cây BVHTree từ danh sách Object3D (bỏ qua vật gắn userData.noCollide hoặc isGround). */
  static fromScene(rootObj: THREE.Object3D, maxTris = 35000): BVHTree {
    rootObj.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    let totalRawTris = 0;

    rootObj.traverse((o) => {
      if (!o.visible || o.userData?.noCollide || o.userData?.isGround) return;
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      const pos = m.geometry.attributes.position;
      if (!pos) return;
      const cnt = m.geometry.index ? m.geometry.index.count / 3 : pos.count / 3;
      if (cnt > 0) {
        meshes.push(m);
        totalRawTris += cnt;
      }
    });

    // Lấy mẫu đều nếu cảnh có hàng trăm nghìn tam giác để cây luôn dựng dưới 15 ms
    const stride = Math.max(1, Math.ceil(totalRawTris / maxTris));
    const tris: Tri[] = [];
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nm = new THREE.Vector3();

    for (const m of meshes) {
      const g = m.geometry;
      const pos = g.attributes.position;
      const idx = g.index;
      const mw = m.matrixWorld;
      const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
      for (let t = 0; t < triCount; t += stride) {
        const i0 = idx ? idx.getX(t * 3) : t * 3;
        const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        va.fromBufferAttribute(pos, i0).applyMatrix4(mw);
        vb.fromBufferAttribute(pos, i1).applyMatrix4(mw);
        vc.fromBufferAttribute(pos, i2).applyMatrix4(mw);
        e1.subVectors(vb, va);
        e2.subVectors(vc, va);
        nm.crossVectors(e1, e2);
        const len = nm.length();
        if (len < 1e-8) continue;
        nm.multiplyScalar(1 / len);
        tris.push({
          ax: va.x, ay: va.y, az: va.z,
          bx: vb.x, by: vb.y, bz: vb.z,
          cx: vc.x, cy: vc.y, cz: vc.z,
          nx: nm.x, ny: nm.y, nz: nm.z,
          mx: (va.x + vb.x + vc.x) / 3,
          my: (va.y + vb.y + vc.y) / 3,
          mz: (va.z + vb.z + vc.z) / 3,
        });
      }
    }
    return new BVHTree(tris);
  }

  get triangleCount(): number {
    return this.tris.length;
  }

  private build(start: number, end: number, depth: number): BVHNode {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let cMinX = Infinity, cMinY = Infinity, cMinZ = Infinity;
    let cMaxX = -Infinity, cMaxY = -Infinity, cMaxZ = -Infinity;

    for (let i = start; i < end; i++) {
      const t = this.tris[i];
      const lx = Math.min(t.ax, t.bx, t.cx), hx = Math.max(t.ax, t.bx, t.cx);
      const ly = Math.min(t.ay, t.by, t.cy), hy = Math.max(t.ay, t.by, t.cy);
      const lz = Math.min(t.az, t.bz, t.cz), hz = Math.max(t.az, t.bz, t.cz);
      if (lx < minX) minX = lx; if (hx > maxX) maxX = hx;
      if (ly < minY) minY = ly; if (hy > maxY) maxY = hy;
      if (lz < minZ) minZ = lz; if (hz > maxZ) maxZ = hz;
      if (t.mx < cMinX) cMinX = t.mx; if (t.mx > cMaxX) cMaxX = t.mx;
      if (t.my < cMinY) cMinY = t.my; if (t.my > cMaxY) cMaxY = t.my;
      if (t.mz < cMinZ) cMinZ = t.mz; if (t.mz > cMaxZ) cMaxZ = t.mz;
    }

    const count = end - start;
    if (count <= 8 || depth >= 22) {
      return { minX, minY, minZ, maxX, maxY, maxZ, left: null, right: null, start, count };
    }

    const sx = cMaxX - cMinX, sy = cMaxY - cMinY, sz = cMaxZ - cMinZ;
    const axis = sx >= sy && sx >= sz ? 0 : sy >= sz ? 1 : 2;
    const span = axis === 0 ? sx : axis === 1 ? sy : sz;
    if (span < 1e-5) {
      return { minX, minY, minZ, maxX, maxY, maxZ, left: null, right: null, start, count };
    }

    const split = axis === 0 ? 0.5 * (cMinX + cMaxX) : axis === 1 ? 0.5 * (cMinY + cMaxY) : 0.5 * (cMinZ + cMaxZ);
    let mid = start;
    for (let i = start; i < end; i++) {
      const v = axis === 0 ? this.tris[i].mx : axis === 1 ? this.tris[i].my : this.tris[i].mz;
      if (v < split) {
        const tmp = this.tris[i];
        this.tris[i] = this.tris[mid];
        this.tris[mid] = tmp;
        mid++;
      }
    }
    if (mid === start || mid === end) mid = start + (count >> 1);

    return {
      minX, minY, minZ, maxX, maxY, maxZ,
      left: this.build(start, mid, depth + 1),
      right: this.build(mid, end, depth + 1),
      start, count: 0,
    };
  }

  /** Tìm điểm trên lưới gần `p` nhất trong bán kính `maxDist` (tương đương bvhtree.find_nearest). */
  findNearest(p: THREE.Vector3, maxDist = Infinity): NearestHit | null {
    if (!this.root) return null;
    let bestSq = maxDist * maxDist;
    let bx = 0, by = 0, bz = 0, bnx = 0, bny = 1, bnz = 0;
    let found = false;
    const tmp = { x: 0, y: 0, z: 0 };
    const px = p.x, py = p.y, pz = p.z;

    const stack: BVHNode[] = [this.root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (aabbDistSq(px, py, pz, node) >= bestSq) continue;

      if (!node.left) {
        const end = node.start + node.count;
        for (let i = node.start; i < end; i++) {
          const t = this.tris[i];
          closestPointOnTri(px, py, pz, t, tmp);
          const dx = px - tmp.x, dy = py - tmp.y, dz = pz - tmp.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < bestSq) {
            bestSq = d2;
            bx = tmp.x; by = tmp.y; bz = tmp.z;
            bnx = t.nx; bny = t.ny; bnz = t.nz;
            found = true;
          }
        }
      } else {
        const dl = aabbDistSq(px, py, pz, node.left);
        const dr = aabbDistSq(px, py, pz, node.right!);
        if (dl < dr) {
          if (dr < bestSq) stack.push(node.right!);
          if (dl < bestSq) stack.push(node.left);
        } else {
          if (dl < bestSq) stack.push(node.left);
          if (dr < bestSq) stack.push(node.right!);
        }
      }
    }

    if (!found) return null;
    return {
      point: new THREE.Vector3(bx, by, bz),
      normal: new THREE.Vector3(bnx, bny, bnz),
      distance: Math.sqrt(bestSq),
    };
  }
}
