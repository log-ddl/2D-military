// Bộ 3 mô hình tên lửa 3D tỉ lệ thật 1:1 (mũi +X, đuôi -X, tâm tại gốc [0,0,0]):
// - PAC3 (MIM-104F PAC-3 CRI): 5.20 m × Ø 0.254 m, đai 180 lỗ động cơ đẩy ngang ACM ở thân trước
// - PAC2 (MIM-104D PAC-2 GEM): 5.31 m × Ø 0.410 m, thân lớn + 4 cánh đuôi clipped-delta sải 0.85 m
// - Kinzhal (Kh-47M2 Kinzhal): 7.20 m × Ø 0.920 m, thân xám chì chiến thuật + mũi xuyên âm + vỏ plasma heatGlow
import React from 'react';
import * as THREE from 'three';
import { extrude, lathe, mat4, merge, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

export type PAC3Props = {
  plume?: number;
  acmFire?: number;
  acmAngle?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export type PAC2Props = {
  plume?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export type KinzhalProps = {
  plume?: number;
  heatGlow?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

const X_FIN_ANGLES = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75] as const;

/**
 * Tính bán kính r(x) trên cung Tangent Ogive chuẩn (tiếp tuyến ngang dr/dx = 0 tại x0),
 * đi từ (x0, r0) tới (xEnd, rTip). Dùng để chia khoang kim loại & chóp radome nằm trên cùng một đường cong mượt.
 */
const evalTangentOgive = (x: number, x0: number, r0: number, xEnd: number, rTip: number): number => {
  const L = xEnd - x0;
  const dR = r0 - rTip;
  const rho = (L * L + dR * dR) / (2 * dR);
  const rc = r0 - rho;
  const dx = Math.max(0, Math.min(L, x - x0));
  return rc + Math.sqrt(Math.max(0, rho * rho - dx * dx));
};

/** Sinh mảng điểm [r, x] dọc theo một đoạn [xa .. xb] của cung Tangent Ogive gốc (x0, r0) -> (xEnd, rTip). */
const ogiveSegment = (
  xa: number,
  xb: number,
  x0: number,
  r0: number,
  xEnd: number,
  rTip: number,
  steps = 24,
): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xa + (i / steps) * (xb - xa);
    pts.push([Math.max(0.0005, evalTangentOgive(x, x0, r0, xEnd, rTip)), x]);
  }
  return pts;
};

/** Sinh chóp cầu nhỏ khép đỉnh mũi từ (xCap0, rCap0) tới đỉnh xTip. */
const noseCapSegment = (xCap0: number, rCap0: number, xTip: number, steps = 7): P2[] => {
  const capLen = xTip - xCap0;
  const pts: P2[] = [];
  for (let j = 0; j <= steps; j++) {
    const a = (j / steps) * (Math.PI / 2);
    pts.push([Math.max(0.0005, rCap0 * Math.cos(a)), xCap0 + capLen * Math.sin(a)]);
  }
  return pts;
};

/** Sinh đường cong Power-Secant Ogive khớp độ dốc thân côn trước cho mũi siêu vượt âm Kinzhal (x tăng dần). */
const hypersonicNoseProfile = (x0: number, r0: number, x1: number, rTip: number, steps = 24): P2[] => {
  const L = x1 - x0;
  const pts: P2[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const shape = Math.pow(1 - u, 0.8) * (1 + 0.16 * u);
    const r = rTip + (r0 - rTip) * shape;
    pts.push([Math.max(0.0006, r), x0 + u * L]);
  }
  return pts;
};

/** Gán màu đỉnh suy giảm mượt từ 0 (tại cZero) tới 1 (tại cFull) dọc trục 'x' hoặc 'y' cho hiệu ứng AdditiveBlending. */
const withAxisFade = (
  src: THREE.BufferGeometry,
  axis: 'x' | 'y',
  cZero: number,
  cFull: number,
  exp = 1.6,
): THREE.BufferGeometry => {
  const g = src.clone();
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = axis === 'x' ? pos.getX(i) : pos.getY(i);
    const t = Math.max(0, Math.min(1, (v - cZero) / (cFull - cZero)));
    const w = Math.pow(t, exp);
    colors[i * 3] = w;
    colors[i * 3 + 1] = w;
    colors[i * 3 + 2] = w;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
};

/** Tạo danh sách toạ độ đinh tán tròn quanh chu vi thân tại các hoành độ xs. */
const ringRivets = (xs: number[], r: number, count: number, phase = 0): [number, number, number][] => {
  const out: [number, number, number][] = [];
  for (const x of xs) {
    for (let i = 0; i < count; i++) {
      const a = ((i + phase) / count) * Math.PI * 2;
      out.push([x, Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  return out;
};

// ============================================================================
// VẬT LIỆU DÙNG CHUNG (ĐỒNG BỘ PAL3D & TỐI ƯU ĐỘ PHẢN XẠ DƯỚI ACES FILMIC)
// ============================================================================
const MAT = {
  pac3Body: () => paint({
    color: PAL3D.pacBody,
    camo: ['#d8e0e9', '#c5cfd9'],
    camoScale: 3.6,
    wear: 0.12,
    dirt: 0.08,
    roughness: 0.42,
    metalness: 0.22,
    repeat: 2,
    seed: 31,
  }),
  pac3Fin: () => paint({
    color: PAL3D.pacBody,
    camo: ['#c6d0dc'],
    camoScale: 2.6,
    wear: 0.15,
    dirt: 0.1,
    roughness: 0.44,
    metalness: 0.25,
    repeat: 0.45,
    seed: 33,
  }),
  pac2Body: () => paint({
    color: PAL3D.pacBody,
    camo: ['#d7dfe8', '#c3cdd8'],
    camoScale: 3.4,
    wear: 0.13,
    dirt: 0.09,
    roughness: 0.44,
    metalness: 0.22,
    repeat: 2,
    seed: 47,
  }),
  pac2Fin: () => paint({
    color: PAL3D.pacBody,
    camo: ['#c4ceda'],
    camoScale: 2.5,
    wear: 0.16,
    dirt: 0.1,
    roughness: 0.45,
    metalness: 0.24,
    repeat: 0.42,
    seed: 49,
  }),
  pacBand: () => plain(PAL3D.pacBand, 0.4, 0.48),
  pacRadome: () => plain(PAL3D.pacRadome, 0.33, 0.04),
  acmRing: () => plain(PAL3D.acmRing, 0.42, 0.58),
  acmBrass: () => plain(PAL3D.brass, 0.34, 0.72),
  brass: () => plain(PAL3D.brass, 0.32, 0.76),
  steel: () => plain(PAL3D.steel, 0.32, 0.68),
  darkSteel: () => plain(PAL3D.darkSteel, 0.46, 0.52),
  nozzleInner: () => plain('#0e1116', 0.88, 0.15),

  // Xám chì lạnh chiến thuật Nga cho Kinzhal (rõ khối trụ/côn dưới mọi góc nắng)
  kinzhalBody: () => paint({
    color: '#646f7d',
    camo: [PAL3D.kinzhalBody, '#707c8b'],
    camoScale: 2.8,
    wear: 0.15,
    dirt: 0.07,
    roughness: 0.46,
    metalness: 0.16,
    repeat: 2,
    seed: 73,
  }),
  kinzhalFin: () => paint({
    color: '#616c7a',
    camo: [PAL3D.kinzhalBody, '#6f7b8a'],
    camoScale: 2.4,
    wear: 0.17,
    dirt: 0.08,
    roughness: 0.45,
    metalness: 0.2,
    repeat: 0.42,
    seed: 79,
  }),
  kinzhalBand: () => plain(PAL3D.kinzhalBand, 0.38, 0.44),
  kinzhalNose: () => paint({
    color: PAL3D.kinzhalNose,
    camo: ['#c5ced7'],
    camoScale: 4.0,
    wear: 0.08,
    dirt: 0.05,
    roughness: 0.34,
    metalness: 0.18,
    repeat: 1,
    seed: 83,
  }),
  ruRedMark: () => plain('#9e2b2b', 0.45, 0.2),
};

// ============================================================================
// HIỆU ỨNG LUỒNG LỬA ĐUÔI DÙNG CHUNG CHO 3 TÊN LỬA (plume 0..1)
// ============================================================================
const PLUME_CORE_GEO = withAxisFade(
  lathe([
    [0.001, -1.0],
    [0.14, -0.88],
    [0.44, -0.64],
    [0.72, -0.34],
    [0.85, -0.14],
    [0.72, 0.0],
    [0.001, 0.02],
  ], 24),
  'x',
  -1.0,
  -0.08,
  1.2,
);

const PLUME_OUTER_GEO = withAxisFade(
  lathe([
    [0.001, -1.0],
    [0.28, -0.9],
    [0.74, -0.68],
    [1.12, -0.4],
    [1.24, -0.17],
    [0.88, -0.02],
    [0.001, 0.01],
  ], 24),
  'x',
  -1.0,
  -0.05,
  1.35,
);

const RocketPlume: React.FC<{ x: number; radius: number; length: number; power: number }> = ({ x, radius, length, power }) => {
  if (power <= 0.005) return null;
  const p = Math.min(1.4, Math.max(0, power));
  const len = length * (0.42 + 0.58 * p);
  const rad = radius * (0.68 + 0.32 * p);
  const coreLen = len * 0.58;
  return (
    <group position={[x, 0, 0]}>
      <pointLight color="#ffaa3b" intensity={22 * radius * p * 8} distance={length * 3.2} decay={1.6} position={[-len * 0.18, 0, 0]} />
      {/* Đĩa rực trắng trong cổ loa phụt */}
      <mesh position={[0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.84, radius * 0.84, 0.02, 20]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* Lõi trắng vàng siêu âm */}
      <mesh geometry={PLUME_CORE_GEO} scale={[coreLen, rad * 0.86, rad * 0.86]}>
        <meshBasicMaterial
          color={PAL3D.flameCore}
          vertexColors
          transparent
          opacity={0.96}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Chuỗi nút sóng xung kích Mach diamonds */}
      {[0.14, 0.28, 0.42].map((k, idx) => (
        <mesh key={idx} position={[-len * k, 0, 0]} scale={[len * 0.058, rad * (0.58 - idx * 0.12), rad * (0.58 - idx * 0.12)]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshBasicMaterial
            color="#fff8dc"
            transparent
            opacity={0.85 - idx * 0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* Áo lửa cam cốt lõi (giữ sắc cam đậm trên cả nền chân trời sáng lẫn nền trời tối) */}
      <mesh geometry={PLUME_CORE_GEO} scale={[len * 0.82, rad * 0.96, rad * 0.96]}>
        <meshBasicMaterial color={PAL3D.flame} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Áo lửa cam phát sáng cộng hưởng */}
      <mesh geometry={PLUME_OUTER_GEO} scale={[len, rad, rad]}>
        <meshBasicMaterial
          color={PAL3D.flame}
          vertexColors
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Quầng nhiệt đỏ cam ngoài cùng */}
      <mesh geometry={PLUME_OUTER_GEO} scale={[len * 1.18, rad * 1.35, rad * 1.35]}>
        <meshBasicMaterial
          color={PAL3D.plasma}
          vertexColors
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// 1. MÔ HÌNH PAC-3 (MIM-104F PAC-3 CRI): Dài 5.20 m (-2.60 .. +2.60), Ø 0.254 m
// ============================================================================
const PAC3_R = 0.127;

// Thân chính từ đáy đuôi (-2.46) tới khớp radome (+1.76)
const PAC3_BODY_GEO = lathe([
  [0.088, -2.46],
  [0.122, -2.46],
  [PAC3_R, -2.42],
  [PAC3_R, 1.21],
  [0.124, 1.215],
  [0.124, 1.625],
  [PAC3_R, 1.63],
  [PAC3_R, 1.76],
  [0.001, 1.76],
], 36);

// Loa phụt đuôi (-2.60 .. -2.45)
const PAC3_NOZZLE_GEO = lathe([
  [0.084, -2.6],
  [0.112, -2.6],
  [0.094, -2.5],
  [0.118, -2.45],
  [0.082, -2.45],
], 32);

// Chóp mũi Radome gốm thạch anh kem ngà (+1.76 .. +2.55) — 24 điểm tangent ogive mượt
const PAC3_RADOME_GEO = lathe([
  [0.001, 1.76],
  ...ogiveSegment(1.76, 2.55, 1.76, PAC3_R, 2.585, 0.009, 24),
  [0.001, 2.55],
], 36);

// Đầu chóp kim loại chống xói mòn (+2.55 .. +2.60) nối tiếp chính đường cong ogive
const PAC3_NOSE_TIP_GEO = lathe([
  [0.001, 2.55],
  ...ogiveSegment(2.55, 2.585, 1.76, PAC3_R, 2.585, 0.009, 6),
  ...noseCapSegment(2.585, 0.009, 2.6, 6),
], 28);

// Đai thép tối của khoang ACM (+1.21 .. +1.63)
const PAC3_ACM_BAND_GEO = lathe([
  [0.125, 1.21],
  [0.1292, 1.215],
  [0.1292, 1.625],
  [0.125, 1.63],
], 36);

// Gộp tĩnh đúng 180 vành đồng mảnh + 180 lõi họng đen của động cơ đẩy ngang ACM (10 vòng × 18 lỗ quanh 360°)
const buildPac3AcmPorts = () => {
  const rims: THREE.BufferGeometry[] = [];
  const cores: THREE.BufferGeometry[] = [];
  const baseRim = new THREE.CylinderGeometry(0.0114, 0.0124, 0.0046, 12);
  const baseCore = new THREE.CylinderGeometry(0.0074, 0.0074, 0.0056, 10);
  const rows = 10;
  const cols = 18;
  for (let row = 0; row < rows; row++) {
    const x = 1.25 + (row / (rows - 1)) * 0.34;
    const offset = (row % 2) * 0.5;
    for (let col = 0; col < cols; col++) {
      const theta = ((col + offset) / cols) * Math.PI * 2;
      const ny = Math.cos(theta);
      const nz = Math.sin(theta);
      const gRim = baseRim.clone();
      gRim.applyMatrix4(mat4([x, ny * 0.1294, nz * 0.1294], [theta, 0, 0]));
      rims.push(gRim);

      const gCore = baseCore.clone();
      gCore.applyMatrix4(mat4([x, ny * 0.1298, nz * 0.1298], [theta, 0, 0]));
      cores.push(gCore);
    }
  }
  return { rimGeo: merge(rims), coreGeo: merge(cores) };
};
const PAC3_ACM_PORTS = buildPac3AcmPorts();

// Các đai khớp tầng kim loại xám đậm dọc thân PAC-3
const PAC3_BANDS_GEO = merge(
  [
    [-2.43, -2.14, 0.1292],
    [-1.42, -1.38, 0.1288],
    [-0.75, -0.69, 0.1292],
    [0.31, 0.38, 0.1292],
    [0.92, 0.98, 0.1292],
    [1.18, 1.215, 0.1304],
    [1.625, 1.66, 0.1304],
    [1.735, 1.765, 0.1288],
  ].map(([x0, x1, r]) =>
    lathe(
      [
        [PAC3_R - 0.002, x0],
        [r, x0 + 0.004],
        [r, x1 - 0.004],
        [PAC3_R - 0.002, x1],
      ],
      36,
    ),
  ),
);

// Vạch chỉ thị kỹ thuật mảnh màu đồng trên khoang thân trước PAC-3
const PAC3_STRIPE_GEO = lathe([
  [0.126, 0.86],
  [0.1288, 0.863],
  [0.1288, 0.887],
  [0.126, 0.89],
], 36);

// Nẹp dẫn cáp khí động dọc thân PAC-3
const PAC3_CONDUIT_GEO = extrude(
  [
    [-2.12, 0.122],
    [-2.04, 0.146],
    [1.08, 0.146],
    [1.17, 0.122],
  ],
  0.03,
  0.005,
);

// Cánh lái đuôi ngắn vát khí động của PAC-3 (x ≈ -2.44 .. -2.15, rTip = 0.280 m)
const PAC3_FIN_GEO = extrude(
  [
    [-2.15, 0.123],
    [-2.32, 0.28],
    [-2.43, 0.28],
    [-2.445, 0.123],
  ],
  0.013,
  0.0025,
);

const PAC3_FIN_LE_GEO = extrude(
  [
    [-2.145, 0.123],
    [-2.316, 0.281],
    [-2.342, 0.281],
    [-2.182, 0.123],
  ],
  0.0145,
  0.002,
);

// Geometry tia phụt ngang ACM (hướng thẳng dọc +Y, suy giảm mượt về 0 ở đầu ngọn y = 1.0)
const ACM_CORE_SPIKE_GEO = (() => {
  const g = lathe([
    [0.014, 0.0],
    [0.034, 0.12],
    [0.026, 0.42],
    [0.01, 0.8],
    [0.001, 1.0],
  ], 18).clone();
  g.rotateZ(Math.PI / 2);
  return withAxisFade(g, 'y', 1.0, 0.05, 1.25);
})();

const ACM_PLUME_FAN_GEO = (() => {
  const g = lathe([
    [0.016, 0.0],
    [0.058, 0.18],
    [0.115, 0.52],
    [0.145, 0.82],
    [0.11, 0.96],
    [0.001, 1.0],
  ], 22).clone();
  g.rotateZ(Math.PI / 2);
  return withAxisFade(g, 'y', 1.0, 0.04, 1.5);
})();

const PAC3_RIVETS = ringRivets([-2.12, 0.345, 0.95, 1.195, 1.642], 0.1298, 12, 0.25);

/** Tia lửa phản lực ngang sắc mạnh từ lỗ ACM khi acmFire > 0 tại góc lăn acmAngle quanh trục X. */
const AcmSideJet: React.FC<{ fire: number; angle: number }> = ({ fire, angle }) => {
  if (fire <= 0.005) return null;
  const f = Math.min(1.4, Math.max(0, fire));
  const jetLen = 1.12 * (0.42 + 0.58 * f);
  const coreLen = jetLen * 0.72;
  const radScale = 0.62 + 0.38 * f;
  return (
    <group position={[1.42, 0, 0]} rotation={[angle, 0, 0]}>
      <pointLight color="#ffb84d" intensity={26 * f} distance={3.0} decay={1.6} position={[0, 0.32, 0]} />
      {/* Chớp nổ trắng rực tại miệng lỗ ACM */}
      <mesh position={[0, 0.132, 0]} scale={[0.042 * radScale, 0.028, 0.042 * radScale]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* Đĩa sóng xung kích tròn sát bề mặt đai ACM */}
      <mesh position={[0, 0.135, 0]}>
        <cylinderGeometry args={[0.095 * f, 0.025 * f, 0.007, 20]} />
        <meshBasicMaterial
          color={PAL3D.flameCore}
          transparent
          opacity={0.78 * Math.min(1, f)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Lõi cam đậm giữ độ tương phản trên nền trời sáng */}
      <mesh position={[0, 0.13, 0]} geometry={ACM_CORE_SPIKE_GEO} scale={[radScale * 1.45, jetLen * 0.86, radScale * 1.45]}>
        <meshBasicMaterial color={PAL3D.flame} transparent opacity={0.46} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Lõi tia xung lực trắng vàng sắc nhọn vuông góc thân */}
      <mesh position={[0, 0.13, 0]} geometry={ACM_CORE_SPIKE_GEO} scale={[radScale, coreLen, radScale]}>
        <meshBasicMaterial
          color="#ffffff"
          vertexColors
          transparent
          opacity={0.98}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Nón khí phụt cam mở rộng tầng cao tan mờ ở đỉnh */}
      <mesh position={[0, 0.13, 0]} geometry={ACM_PLUME_FAN_GEO} scale={[radScale, jetLen, radScale]}>
        <meshBasicMaterial
          color={PAL3D.flame}
          vertexColors
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Quầng plasma đỏ cam bao ngoài */}
      <mesh position={[0, 0.13, 0]} geometry={ACM_PLUME_FAN_GEO} scale={[radScale * 1.42, jetLen * 1.15, radScale * 1.42]}>
        <meshBasicMaterial
          color={PAL3D.plasma}
          vertexColors
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

export const PAC3: React.FC<PAC3Props> = ({
  plume = 0,
  acmFire = 0,
  acmAngle = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: PAC3Props = {}) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Thân trụ mảnh Ø 0.254 m */}
    <mesh geometry={PAC3_BODY_GEO} material={MAT.pac3Body()} castShadow receiveShadow />
    {/* Các đai khớp tầng kim loại xám đậm & vạch chỉ thị đồng */}
    <mesh geometry={PAC3_BANDS_GEO} material={MAT.pacBand()} castShadow receiveShadow />
    <mesh geometry={PAC3_STRIPE_GEO} material={MAT.brass()} castShadow />

    {/* Nẹp dẫn cáp dọc lưng + đai kẹp cáp + nẹp phụ dưới bụng */}
    <mesh geometry={PAC3_CONDUIT_GEO} material={MAT.pac3Fin()} castShadow receiveShadow />
    {[-1.75, -1.05, -0.25, 0.55].map((x, idx) => (
      <mesh key={idx} position={[x, 0.136, 0]} geometry={rbox(0.026, 0.028, 0.038, 0.004)} material={MAT.pacBand()} castShadow />
    ))}
    <mesh geometry={PAC3_CONDUIT_GEO} rotation={[Math.PI, 0, 0]} scale={[0.72, 1, 0.85]} position={[-0.25, 0, 0]} material={MAT.pacBand()} castShadow />

    {/* 4 tấm ăng-ten datalink phẳng ôm quanh khoang dẫn đường (x = +0.62) */}
    {X_FIN_ANGLES.map((ang, i) => (
      <group key={`dl${i}`} rotation={[ang, 0, 0]}>
        <mesh position={[0.62, 0.1275, 0]} geometry={rbox(0.095, 0.006, 0.036, 0.002)} material={MAT.darkSteel()} />
      </group>
    ))}

    {/* Cụm đai 180 động cơ đẩy ngang ACM (x = +1.21 .. +1.63) + hai viền thép sáng */}
    <mesh geometry={PAC3_ACM_BAND_GEO} material={MAT.acmRing()} castShadow receiveShadow />
    <mesh position={[1.215, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.steel()}>
      <cylinderGeometry args={[0.1306, 0.1306, 0.008, 36]} />
    </mesh>
    <mesh position={[1.625, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.steel()}>
      <cylinderGeometry args={[0.1306, 0.1306, 0.008, 36]} />
    </mesh>
    <mesh geometry={PAC3_ACM_PORTS.rimGeo} material={MAT.acmBrass()} castShadow />
    <mesh geometry={PAC3_ACM_PORTS.coreGeo} material={MAT.nozzleInner()} />

    {/* Chóp mũi radome gốm thạch anh kem ngà + chóp kim loại */}
    <mesh geometry={PAC3_RADOME_GEO} material={MAT.pacRadome()} castShadow receiveShadow />
    <mesh geometry={PAC3_NOSE_TIP_GEO} material={MAT.steel()} castShadow />

    {/* Loa phụt đuôi & lõi sâu */}
    <mesh geometry={PAC3_NOZZLE_GEO} material={MAT.darkSteel()} castShadow />
    <mesh position={[-2.525, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.nozzleInner()}>
      <cylinderGeometry args={[0.082, 0.082, 0.145, 24]} />
    </mesh>

    {/* 4 cánh lái đuôi ngắn vát khí động + đế khớp xoay */}
    {X_FIN_ANGLES.map((ang, i) => (
      <group key={i} rotation={[ang, 0, 0]}>
        <mesh geometry={PAC3_FIN_GEO} material={MAT.pac3Fin()} castShadow receiveShadow />
        <mesh geometry={PAC3_FIN_LE_GEO} material={MAT.steel()} castShadow />
        <mesh position={[-2.3, 0.128, 0]} geometry={rbox(0.25, 0.022, 0.036, 0.005)} material={MAT.darkSteel()} castShadow />
      </group>
    ))}

    <Rivets points={PAC3_RIVETS} r={0.0045} color={PAL3D.steel} />

    {/* Hiệu ứng phụt ngang ACM & lửa động cơ chính */}
    <AcmSideJet fire={acmFire} angle={acmAngle} />
    <RocketPlume x={-2.6} radius={0.105} length={2.25} power={plume} />
  </group>
);

// ============================================================================
// 2. MÔ HÌNH PAC-2 (MIM-104D PAC-2 GEM): Dài 5.31 m (-2.65 .. +2.66), Ø 0.410 m
// ============================================================================
const PAC2_R = 0.205;
const PAC2_OGIVE_X0 = 1.38;
const PAC2_RADOME_X0 = 1.65;
const PAC2_TIP_X0 = 2.615;

// Thân trụ mập Ø 0.410 m (-2.55 .. +1.38) + đoạn cổ kim loại đầu mũi (+1.38 .. +1.65) cùng nằm trên cung Tangent Ogive
const PAC2_BODY_GEO = lathe([
  [0.145, -2.55],
  [0.176, -2.55],
  [PAC2_R, -2.42],
  [PAC2_R, PAC2_OGIVE_X0],
  ...ogiveSegment(PAC2_OGIVE_X0, PAC2_RADOME_X0, PAC2_OGIVE_X0, PAC2_R, 2.642, 0.012, 8).slice(1),
  [0.001, PAC2_RADOME_X0],
], 40);

// Loa phụt đuôi lớn của PAC-2 (-2.65 .. -2.53)
const PAC2_NOZZLE_GEO = lathe([
  [0.136, -2.65],
  [0.17, -2.65],
  [0.148, -2.57],
  [0.175, -2.53],
  [0.132, -2.53],
], 36);

// Chóp mũi Ogive dài gốm kem ngà (+1.65 .. +2.615) — 24 điểm tiếp nối mượt đường cong từ thân
const PAC2_RADOME_GEO = lathe([
  [0.001, PAC2_RADOME_X0],
  ...ogiveSegment(PAC2_RADOME_X0, PAC2_TIP_X0, PAC2_OGIVE_X0, PAC2_R, 2.642, 0.012, 24),
  [0.001, PAC2_TIP_X0],
], 40);

// Đầu chóp kim loại nhỏ (+2.615 .. +2.66)
const PAC2_NOSE_TIP_GEO = lathe([
  [0.001, PAC2_TIP_X0],
  ...ogiveSegment(PAC2_TIP_X0, 2.642, PAC2_OGIVE_X0, PAC2_R, 2.642, 0.012, 5),
  ...noseCapSegment(2.642, 0.012, 2.66, 6),
], 28);

// Đai khớp tầng & khoang đầu đạn nổ mảnh tiếp cận M251
const PAC2_RADOME_COLLAR_R = evalTangentOgive(PAC2_RADOME_X0, PAC2_OGIVE_X0, PAC2_R, 2.642, 0.012);
const PAC2_BANDS_GEO = merge([
  ...[
    [-2.42, -2.35, 0.2082],
    [-1.85, -1.78, 0.2082],
    [-0.58, -0.51, 0.2082],
    [0.68, 0.76, 0.2086],
    [1.31, 1.385, 0.2086],
  ].map(([x0, x1, r]) =>
    lathe(
      [
        [PAC2_R - 0.008, x0],
        [r, x0 + 0.005],
        [r, x1 - 0.005],
        [PAC2_R - 0.008, x1],
      ],
      40,
    ),
  ),
  lathe(
    [
      [PAC2_RADOME_COLLAR_R - 0.004, 1.632],
      [PAC2_RADOME_COLLAR_R + 0.004, 1.638],
      [PAC2_RADOME_COLLAR_R + 0.002, 1.662],
      [PAC2_RADOME_COLLAR_R - 0.006, 1.668],
    ],
    40,
  ),
]);

// Vạch chỉ thị khoang đầu đạn nổ mảnh màu đồng vàng (x = +1.02 .. +1.07)
const PAC2_WARHEAD_STRIPE_GEO = lathe([
  [0.203, 1.02],
  [0.2074, 1.024],
  [0.2074, 1.066],
  [0.203, 1.07],
], 40);

// Máng cáp nổi lớn dọc lưng PAC-2 (dorsal wiring tunnel)
const PAC2_RACEWAY_GEO = extrude(
  [
    [-2.34, 0.196],
    [-2.2, 0.24],
    [1.16, 0.24],
    [1.29, 0.198],
  ],
  0.058,
  0.008,
);

// 4 cánh đuôi tam giác cụt (Clipped-Delta) sải rộng 0.85 m (rTip = 0.425 m) đặc trưng của PAC-2
const PAC2_FIN_GEO = extrude(
  [
    [-1.85, 0.198],
    [-2.27, 0.425],
    [-2.5, 0.425],
    [-2.52, 0.18],
  ],
  0.018,
  0.003,
);

const PAC2_FIN_LE_GEO = extrude(
  [
    [-1.845, 0.198],
    [-2.265, 0.426],
    [-2.305, 0.426],
    [-1.895, 0.198],
  ],
  0.02,
  0.002,
);

const PAC2_RIVETS = ringRivets([-1.815, -0.545, 0.72, 1.345], 0.209, 16, 0.2);

export const PAC2: React.FC<PAC2Props> = ({
  plume = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: PAC2Props = {}) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Thân trụ lớn Ø 0.410 m */}
    <mesh geometry={PAC2_BODY_GEO} material={MAT.pac2Body()} castShadow receiveShadow />
    {/* Các đai khoang đầu đạn nổ mảnh tiếp cận & khớp tầng */}
    <mesh geometry={PAC2_BANDS_GEO} material={MAT.pacBand()} castShadow receiveShadow />
    <mesh geometry={PAC2_WARHEAD_STRIPE_GEO} material={MAT.brass()} castShadow />

    {/* Máng cáp nổi dọc lưng + đai kẹp máng cáp + guốc trượt ống phóng */}
    <mesh geometry={PAC2_RACEWAY_GEO} material={MAT.pac2Fin()} castShadow receiveShadow />
    {[-1.95, -1.2, -0.45, 0.3, 0.95].map((x, i) => (
      <mesh key={i} position={[x, 0.224, 0]} geometry={rbox(0.036, 0.044, 0.068, 0.005)} material={MAT.pacBand()} castShadow />
    ))}
    <mesh position={[-1.15, -0.212, 0]} geometry={rbox(0.18, 0.028, 0.07, 0.006)} material={MAT.darkSteel()} castShadow />
    <mesh position={[0.45, -0.212, 0]} geometry={rbox(0.18, 0.028, 0.07, 0.006)} material={MAT.darkSteel()} castShadow />

    {/* 4 cửa sổ cảm biến ngòi nổ radar cận đích (proximity fuze windows) quanh khoang đầu đạn */}
    {X_FIN_ANGLES.map((ang, i) => (
      <group key={`fz${i}`} rotation={[ang, 0, 0]}>
        <mesh position={[1.18, 0.205, 0]} geometry={rbox(0.13, 0.012, 0.056, 0.003)} material={MAT.acmRing()} castShadow />
      </group>
    ))}

    {/* Chóp mũi ogive dài kem ngà + chóp thép nhỏ */}
    <mesh geometry={PAC2_RADOME_GEO} material={MAT.pacRadome()} castShadow receiveShadow />
    <mesh geometry={PAC2_NOSE_TIP_GEO} material={MAT.steel()} castShadow />

    {/* Loa phụt đuôi */}
    <mesh geometry={PAC2_NOZZLE_GEO} material={MAT.darkSteel()} castShadow />
    <mesh position={[-2.585, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.nozzleInner()}>
      <cylinderGeometry args={[0.132, 0.132, 0.125, 28]} />
    </mesh>

    {/* 4 cánh đuôi tam giác cụt clipped-delta sải rộng 0.85 m + hộp trục cơ cấu lái */}
    {X_FIN_ANGLES.map((ang, i) => (
      <group key={i} rotation={[ang, 0, 0]}>
        <mesh geometry={PAC2_FIN_GEO} material={MAT.pac2Fin()} castShadow receiveShadow />
        <mesh geometry={PAC2_FIN_LE_GEO} material={MAT.pacBand()} castShadow />
        <mesh position={[-2.2, 0.205, 0]} geometry={rbox(0.63, 0.036, 0.058, 0.008)} material={MAT.pacBand()} castShadow />
        <mesh position={[-2.35, 0.295, 0]} geometry={rbox(0.24, 0.14, 0.024, 0.004)} material={MAT.pacBand()} />
      </group>
    ))}

    <Rivets points={PAC2_RIVETS} r={0.006} color={PAL3D.steel} />

    {/* Luồng lửa đuôi */}
    <RocketPlume x={-2.65} radius={0.16} length={2.95} power={plume} />
  </group>
);

// ============================================================================
// 3. MÔ HÌNH KINZHAL (Kh-47M2 Kinzhal / gốc 9M723 Iskander): Dài 7.20 m (-3.60 .. +3.60), Ø 0.92 m
// ============================================================================
const KIN_R = 0.46;

/** Đường sinh thân côn trước mượt 20 điểm từ thân trụ (x = -0.20, r = 0.460) về cổ mũi (x = +2.15, r = 0.266). */
const kinzhalForebodyTaper = (steps = 20): P2[] => {
  const x0 = -0.2;
  const x1 = 2.15;
  const r0 = KIN_R;
  const r1 = 0.266;
  const pts: P2[] = [];
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    const s = u * u * (2.15 - 1.15 * u);
    pts.push([r0 + (r1 - r0) * s, x0 + u * (x1 - x0)]);
  }
  return pts;
};

/** Đường thu eo đuôi động cơ (aft boat-tail) mượt 10 điểm từ (-2.62, r = 0.460) về (-3.44, r = 0.348). */
const kinzhalAftBoattail = (steps = 10): P2[] => {
  const x0 = -3.44;
  const x1 = -2.62;
  const r0 = 0.348;
  const r1 = KIN_R;
  const pts: P2[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const s = 1 - Math.pow(1 - u, 1.65);
    pts.push([r0 + (r1 - r0) * s, x0 + u * (x1 - x0)]);
  }
  return pts;
};

const KINZHAL_BODY_GEO = lathe([
  [0.275, -3.44],
  ...kinzhalAftBoattail(10),
  [KIN_R, -0.2],
  ...kinzhalForebodyTaper(20),
  [0.001, 2.15],
], 48);

// Mũi nhọn bi-conic/ogive xuyên âm (+2.15 .. +3.40) — 24 điểm mượt khớp độ dốc thân côn
const KINZHAL_NOSE_GEO = lathe([
  [0.001, 2.15],
  ...hypersonicNoseProfile(2.15, 0.266, 3.4, 0.035, 24),
  [0.001, 3.4],
], 44);

// Đầu kim xuyên âm hợp kim tungsten/thép chịu nhiệt (+3.395 .. +3.60)
const KINZHAL_SPIKE_GEO = lathe([
  [0.001, 3.395],
  ...hypersonicNoseProfile(3.395, 0.0355, 3.588, 0.005, 12),
  ...noseCapSegment(3.588, 0.005, 3.6, 5),
], 28);

// Loa phụt động cơ rắn cỡ lớn ở đuôi (-3.60 .. -3.40)
const KINZHAL_NOZZLE_GEO = lathe([
  [0.265, -3.6],
  [0.332, -3.6],
  [0.285, -3.49],
  [0.338, -3.4],
  [0.25, -3.4],
], 40);

// Các vòng đai khớp tầng và đai chịu lực xám thép trên thân Kinzhal
const KINZHAL_BANDS_GEO = merge([
  lathe([[0.344, -3.44], [0.358, -3.43], [0.372, -3.33], [0.358, -3.32]], 44),
  lathe([[0.452, -2.66], [0.466, -2.65], [0.466, -2.55], [0.452, -2.54]], 44),
  lathe([[0.454, -1.52], [0.466, -1.51], [0.466, -1.42], [0.454, -1.41]], 44),
  lathe([[0.454, -0.25], [0.466, -0.24], [0.466, -0.15], [0.452, -0.14]], 44),
  lathe([[0.365, 1.02], [0.376, 1.03], [0.369, 1.1], [0.358, 1.11]], 44),
  lathe([[0.262, 2.11], [0.273, 2.12], [0.269, 2.185], [0.258, 2.195]], 44),
]);

// Vạch cảnh báo kỹ thuật mảnh kiểu quân sự Nga ở khoang chiến đấu
const KINZHAL_WARN_STRIPE_GEO = lathe([
  [0.456, -0.08],
  [0.4635, -0.075],
  [0.4635, -0.035],
  [0.456, -0.03],
], 44);

// Sống lưng dẫn cáp & giao tiếp giá phóng MiG-31K (dorsal spine fairing)
const KINZHAL_SPINE_GEO = extrude(
  [
    [-2.62, 0.445],
    [-2.44, 0.502],
    [0.05, 0.502],
    [0.72, 0.435],
    [0.86, 0.395],
  ],
  0.096,
  0.012,
);

// 4 cánh lái đuôi Cropped-Delta sải 1.25 m (rTip = 0.625 m, bám dọc eo đuôi x = -3.44 .. -2.60)
const KINZHAL_FIN_GEO = extrude(
  [
    [-2.6, 0.445],
    [-3.14, 0.625],
    [-3.42, 0.625],
    [-3.44, 0.345],
  ],
  0.028,
  0.004,
);

const KINZHAL_FIN_LE_GEO = extrude(
  [
    [-2.595, 0.445],
    [-3.135, 0.626],
    [-3.19, 0.626],
    [-2.665, 0.438],
  ],
  0.03,
  0.003,
);

const KINZHAL_RIVETS = [
  ...ringRivets([-2.6, -1.465, -0.195], 0.467, 22, 0.15),
  ...ringRivets([1.065], 0.376, 18, 0.2),
  ...ringRivets([2.15], 0.273, 14, 0.3),
];

// Hình học lớp vỏ plasma ma sát khí quyển ôm phần chóp mũi khi bổ nhào (heatGlow 0..1)
// Dùng withAxisFade + AdditiveBlending để sáng trắng-cam rực ở chóp mũi và tan mượt 100% về phía thân!
const KINZHAL_HEAT_CAP_GEO = withAxisFade(
  lathe([
    ...hypersonicNoseProfile(2.95, 0.158, 3.63, 0.016, 18),
    ...noseCapSegment(3.63, 0.016, 3.65, 5),
  ], 32),
  'x',
  2.95,
  3.62,
  1.4,
);

const KINZHAL_HEAT_INNER_GEO = withAxisFade(
  lathe([
    ...hypersonicNoseProfile(1.25, 0.388, 3.65, 0.024, 24),
    ...noseCapSegment(3.65, 0.024, 3.675, 5),
  ], 36),
  'x',
  1.25,
  3.58,
  1.65,
);

const KINZHAL_HEAT_SHOCK_GEO = withAxisFade(
  lathe([
    ...hypersonicNoseProfile(0.35, 0.585, 3.685, 0.04, 26),
    ...noseCapSegment(3.685, 0.04, 3.72, 5),
  ], 36),
  'x',
  0.35,
  3.6,
  1.9,
);

const KinzhalHeatShield: React.FC<{ glow: number }> = ({ glow }) => {
  if (glow <= 0.005) return null;
  const g = Math.min(1.25, Math.max(0, glow));
  return (
    <group>
      <pointLight color={PAL3D.plasma} intensity={48 * g} distance={6.2} decay={1.5} position={[3.8, 0, 0]} />
      {/* Điểm đình trệ đầu mũi trắng vàng siêu nhiệt */}
      <mesh geometry={KINZHAL_HEAT_CAP_GEO}>
        <meshBasicMaterial
          color={PAL3D.flameCore}
          vertexColors
          transparent
          opacity={0.95 * Math.min(1, g)}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Vỏ plasma cam rực ôm sát chóp mũi tan mượt về thân trước */}
      <mesh geometry={KINZHAL_HEAT_INNER_GEO}>
        <meshBasicMaterial
          color={PAL3D.plasma}
          vertexColors
          transparent
          opacity={0.85 * Math.min(1, g)}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Màng sóng xung kích nén khí đầu mũi (bow-shock) loe mờ mềm mại */}
      <mesh geometry={KINZHAL_HEAT_SHOCK_GEO}>
        <meshBasicMaterial
          color="#ff4414"
          vertexColors
          transparent
          opacity={0.48 * Math.min(1, g)}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

export const Kinzhal: React.FC<KinzhalProps> = ({
  plume = 0,
  heatGlow = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: KinzhalProps = {}) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Thân trụ lớn Ø 0.92 m & đoạn thu côn trước xám chì chiến thuật */}
    <mesh geometry={KINZHAL_BODY_GEO} material={MAT.kinzhalBody()} castShadow receiveShadow />
    {/* Các đai khớp tầng kim loại & vạch cảnh báo khoang chiến đấu */}
    <mesh geometry={KINZHAL_BANDS_GEO} material={MAT.kinzhalBand()} castShadow receiveShadow />
    <mesh geometry={KINZHAL_WARN_STRIPE_GEO} material={MAT.ruRedMark()} castShadow />

    {/* Chóp mũi xuyên âm bi-conic/ogive & đầu kim chịu nhiệt */}
    <mesh geometry={KINZHAL_NOSE_GEO} material={MAT.kinzhalNose()} castShadow receiveShadow />
    <mesh geometry={KINZHAL_SPIKE_GEO} material={MAT.darkSteel()} castShadow />

    {/* Sống lưng dẫn cáp + 2 cụm tai móc treo giá phóng APU-47 dưới bụng MiG-31K */}
    <mesh geometry={KINZHAL_SPINE_GEO} material={MAT.kinzhalFin()} castShadow receiveShadow />
    {[-1.15, -0.05].map((lx, idx) => (
      <group key={idx} position={[lx, 0.506, 0]}>
        <mesh geometry={rbox(0.26, 0.036, 0.145, 0.006)} material={MAT.darkSteel()} castShadow />
        <mesh position={[0, 0.04, 0]} geometry={rbox(0.14, 0.056, 0.046, 0.008)} material={MAT.steel()} castShadow />
        <mesh position={[0, 0.044, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.nozzleInner()}>
          <cylinderGeometry args={[0.015, 0.015, 0.05, 12]} />
        </mesh>
      </group>
    ))}

    {/* Hộp cảm biến dưới bụng & 2 tấm cửa tiếp cận kỹ thuật bên hông */}
    <mesh position={[-1.35, -0.462, 0]} geometry={rbox(2.1, 0.038, 0.078, 0.008)} material={MAT.kinzhalBand()} castShadow />
    {[-1, 1].map((side) => (
      <mesh key={side} position={[-0.85, 0, side * 0.456]} geometry={rbox(0.46, 0.18, 0.018, 0.005)} material={MAT.kinzhalBand()} castShadow />
    ))}

    {/* Loa phụt đuôi lớn + họng sâu + 4 cánh hướng dòng phản lực (jet vanes) */}
    <mesh geometry={KINZHAL_NOZZLE_GEO} material={MAT.darkSteel()} castShadow />
    <mesh position={[-3.49, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.nozzleInner()}>
      <cylinderGeometry args={[0.252, 0.252, 0.21, 32]} />
    </mesh>
    {X_FIN_ANGLES.map((ang, i) => (
      <group key={`jv${i}`} rotation={[ang, 0, 0]}>
        <mesh position={[-3.55, 0.215, 0]} geometry={rbox(0.085, 0.085, 0.016, 0.003)} material={MAT.kinzhalBand()} />
      </group>
    ))}

    {/* 4 cánh lái đuôi cropped-delta sải 1.25 m xếp chữ X 45° + bầu cơ cấu xoay thủy lực */}
    {X_FIN_ANGLES.map((ang, i) => (
      <group key={i} rotation={[ang, 0, 0]}>
        <mesh geometry={KINZHAL_FIN_GEO} material={MAT.kinzhalFin()} castShadow receiveShadow />
        <mesh geometry={KINZHAL_FIN_LE_GEO} material={MAT.kinzhalBand()} castShadow />
        <mesh position={[-3.02, 0.398, 0]} rotation={[0, 0, 0.13]} geometry={rbox(0.76, 0.068, 0.092, 0.014)} material={MAT.darkSteel()} castShadow />
      </group>
    ))}

    <Rivets points={KINZHAL_RIVETS} r={0.009} color={PAL3D.steel} />

    {/* Luồng lửa động cơ rắn ở đuôi & lớp vỏ plasma ma sát ở mũi */}
    <RocketPlume x={-3.6} radius={0.31} length={4.5} power={plume} />
    <KinzhalHeatShield glow={heatGlow} />
  </group>
);

// ============================================================================
// BÀN XOAY KIỂM TRA 4 GÓC (NÂNG LƠ LỬNG Y = +1.0 M ĐỂ ĐỔ BÓNG ĐẸP & KHÔNG CẮT SÀN)
// ============================================================================
const PAC3Turntable: React.FC = () => <PAC3 position={[0, 1.0, 0]} />;
const PAC2Turntable: React.FC = () => <PAC2 position={[0, 1.0, 0]} />;
const KinzhalTurntable: React.FC = () => <Kinzhal position={[0, 1.0, 0]} />;

export const MODELS: ModelSet = {
  PAC3: { C: PAC3Turntable, size: 5.4, center: [0, 1.0, 0] },
  PAC2: { C: PAC2Turntable, size: 5.5, center: [0, 1.0, 0] },
  Kinzhal: { C: KinzhalTurntable, size: 7.4, center: [0, 1.0, 0] },
};
