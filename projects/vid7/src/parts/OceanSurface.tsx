// Mặt biển 3D động tất định theo thời gian t (giây voice) + hàm tính độ cao sóng & góc chúi/nghiêng tàu theo chiều dài thân thật.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { turntable } from '@skill/military/3d/turntable';
import { fbm, grain } from '@skill/military/3d/materials';
import { OCEAN_PALETTE } from '../design/palette';

/**
 * Độ cao mặt sóng (m) tại (x, z) lúc t (giây), với biên độ cồn sóng `swell` (m).
 * Sóng bão 30-foot (9.1 m từ đáy tới đỉnh) tương ứng `swell ≈ 4.2..4.5`. Biển êm dùng `swell ≈ 0.5..0.9`.
 */
export function waveY(x: number, z: number, t: number, swell = 3.8): number {
  // Sóng chính truyền ngược chiều mũi tàu (+X → -X, tức tàu lao ngược gió bão hướng +X)
  const w1 = Math.sin(x * 0.048 + z * 0.014 + t * 1.45) * 0.54;
  const w2 = Math.sin(x * 0.082 - z * 0.036 + t * 1.95 + 1.3) * 0.26;
  const w3 = Math.cos(x * 0.145 + z * 0.11 + t * 2.65 + 0.7) * 0.12;
  const chop = (Math.sin(x * 0.31 - z * 0.27 + t * 3.8) * 0.5 + Math.cos(x * 0.23 + z * 0.34 - t * 3.1) * 0.5) * 0.08;
  // Đỉnh sóng nhọn nhẹ kiểu Trochoid
  const raw = w1 + w2 + w3 + chop;
  const peaked = raw + 0.16 * (raw * raw - 0.25);
  return peaked * swell;
}

/**
 * Tính độ cao trọng tâm `y`, góc chúi mũi `pitch` (rad, quanh trục Z) và góc nghiêng mạn `roll` (rad, quanh trục X)
 * cho tàu đặt dọc hướng +X (hoặc xoay góc `heading` quanh trục Y) dựa trên kích thước thân thật (length, beam).
 * Tàu sân bay 251 m lướt êm qua nhiều bước sóng; tàu gác 30 m tròng trành dữ dội giữa hõm sóng!
 */
export function shipPose(
  x: number,
  z: number,
  length: number,
  beam: number,
  t: number,
  swell = 3.8,
  heading = 0,
): { y: number; pitch: number; roll: number } {
  const ca = Math.cos(heading);
  const sa = -Math.sin(heading);
  const dx = length * 0.34;
  const dz = Math.max(2.5, beam * 0.42);

  const yBow = waveY(x + ca * dx, z + sa * dx, t, swell);
  const yMid = waveY(x, z, t, swell);
  const yStern = waveY(x - ca * dx, z - sa * dx, t, swell);
  const yStbd = waveY(x - sa * dz, z + ca * dz, t, swell);
  const yPort = waveY(x + sa * dz, z - ca * dz, t, swell);

  // Hệ số trung bình theo chiều dài thân (tàu dài làm mượt biên độ nhấp nhô thẳng đứng)
  const damp = length > 140 ? 0.52 : length > 70 ? 0.68 : 0.94;
  const y = ((yBow + yMid * 2 + yStern) * 0.25) * damp;
  const pitch = Math.atan2(yBow - yStern, dx * 2) * (length > 140 ? 0.58 : 0.88);
  const roll = Math.atan2(yPort - yStbd, dz * 2) * (length > 140 ? 0.48 : 0.85);
  return { y, pitch, roll };
}

export type OceanSurfaceProps = {
  t: number;
  swell?: number;
  size?: number;
  seg?: number;
  center?: [number, number];
  palette?: keyof typeof OCEAN_PALETTE;
};

export const OceanSurface: React.FC<OceanSurfaceProps> = ({
  t,
  swell = 3.8,
  size = 900,
  seg = 160,
  center = [0, 0],
  palette = 'stormPacific',
}) => {
  const pal = OCEAN_PALETTE[palette];
  // Khóa làm tròn thời gian theo từng khung 1/30s để ổn định
  const tk = Math.round(t * 30) / 30;

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(center[0], 0, center[1]);
    const p = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3);
    const cDeep = new THREE.Color(pal.deep);
    const cMid = new THREE.Color(pal.mid);
    const cCrest = new THREE.Color(pal.crest);
    const cFoam = new THREE.Color(pal.foam);
    const c = new THREE.Color();

    const invSpan = 1 / Math.max(0.4, swell * 1.9);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const y = waveY(x, z, tk, swell);
      p.setY(i, y);

      const hNorm = Math.max(0, Math.min(1, (y + swell * 0.95) * invSpan));
      if (hNorm < 0.5) {
        c.copy(cDeep).lerp(cMid, hNorm * 2);
      } else {
        c.copy(cMid).lerp(cCrest, (hNorm - 0.5) * 2);
      }

      // Vệt bọt trắng kéo dài dọc theo sống sóng bão (ridge whitecaps) và vệt gió tạt dọc trục X
      const crestBand = Math.max(0, (hNorm - 0.68) * 3.1);
      const ridgeNoise = fbm(x * 0.18 + tk * 0.25, z * 0.042, 19, 3);
      const windStreak = Math.max(0, fbm(x * 0.035 + tk * 0.35, z * 0.28, 41, 3) - 0.56) * 1.1;
      const foam = (crestBand * (0.35 + 0.85 * ridgeNoise) + windStreak * Math.max(0, hNorm - 0.35)) * Math.min(1, swell / 2.2);
      if (foam > 0.02) {
        c.lerp(cFoam, Math.min(0.92, foam));
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, [tk, swell, size, seg, center[0], center[1], pal.deep, pal.mid, pal.crest, pal.foam]);

  const mat = useMemo(() => {
    const tex = grain(23, 8).clone();
    tex.needsUpdate = true;
    tex.repeat.set(36, 36);
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: tex,
      roughness: swell > 2.2 ? 0.34 : 0.24,
      metalness: 0.18,
    });
  }, [swell > 2.2]);

  return <mesh geometry={geo} material={mat} receiveShadow />;
};

export const preview = turntable(
  () => (
    <group position={[0, 4.6, 0]}>
      <OceanSurface t={2.5} swell={4.2} size={150} seg={112} palette="stormPacific" />
    </group>
  ),
  { size: 90, center: [0, 4.6, 0] },
);
