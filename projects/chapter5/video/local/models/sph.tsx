// Pháo tự hành bánh xích 155 mm (kiểu M109, không phải bản sao): thân 6.2 × 3.15 m, cao 3.2 m, nòng 39 cỡ ≈ 6 m.
// Trục: mũi +X, trên +Y, gốc = tâm vết xích dưới đất. Tháp quay quanh trục đứng tại x = -0.9.
import React from 'react';
import { extrude, lathe, rbox, pipe } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Track, Wheel, Rivets } from '@lib/3d/parts';

// Khối đùn có UV tính theo mét → repeat 0.18 để một texture phủ ~5.5 m (loang to, không vụn).
export const OLIVE = { color: '#76804a', camo: ['#59633a', '#a39360', '#3d4230'], camoScale: 1.1, wear: 0.3, dirt: 0.3, repeat: 0.18 };
const hullMat = paint({ ...OLIVE, seed: 3 });
const turretMat = paint({ ...OLIVE, seed: 7 });
const gunMat = paint({ ...OLIVE, camo: [], wear: 0.15, dirt: 0.1, seed: 11, repeat: 1 });
const dark = plain('#2b2d27', 0.8, 0.3);
const steel = plain('#55584f', 0.45, 0.7);
const glass = plain('#1d2a33', 0.15, 0.6);

// Biên dạng nhìn ngang (m)
const HULL: [number, number][] = [[-3.1, 0.55], [-3.1, 1.72], [1.55, 1.75], [3.15, 1.28], [3.0, 0.62], [2.6, 0.48], [-2.8, 0.48]];
const TURRET: [number, number][] = [[-3.05, 0], [0.75, 0], [1.1, 0.5], [0.85, 1.32], [-2.45, 1.42], [-3.1, 1.15]];
const BARREL: [number, number][] = [[0.2, -0.2], [0.2, 0.55], [0.15, 0.7], [0.13, 1.4], [0.125, 2.3], [0.16, 2.45], [0.165, 3.25], [0.13, 3.4], [0.112, 5.9], [0.17, 5.95], [0.17, 6.55], [0.12, 6.6]];
const SPACING = [-2.2, -1.47, -0.73, 0, 0.73, 1.47, 2.2];
export const TRUNNION: [number, number, number] = [0.55, 2.45, 0];
export const BARREL_LEN = 6.6;

export type SPHProps = { elev?: number; yaw?: number; recoil?: number; travel?: number; hatch?: number };

/** Vị trí đầu nòng trong toạ độ xe (để đặt MuzzleBlast / điểm xuất phát quỹ đạo). */
export const muzzleOf = (elev: number, yaw = 0): [number, number, number] => {
  const r = BARREL_LEN + 0.35; // nòng lắp lệch 0.35 m trước chốt
  const rel = TRUNNION[0] + 0.9 + Math.cos(elev) * r; // tính từ trục quay tháp (x = -0.9)
  return [-0.9 + Math.cos(yaw) * rel, TRUNNION[1] + Math.sin(elev) * r, -Math.sin(yaw) * rel];
};

export const SPH: React.FC<SPHProps> = ({ elev = 0.05, yaw = 0, recoil = 0, travel = 0, hatch = 0 }) => (
  <group>
    {/* Thân */}
    <mesh geometry={extrude(HULL, 2.3, 0.06)} material={hullMat} castShadow receiveShadow />
    {/* Chắn bùn + hộp đồ trên chắn bùn */}
    {[-1, 1].map((s) => (
      <group key={s} position={[0, 0, s * 1.3]}>
        <mesh geometry={rbox(6.3, 0.06, 0.62, 0.02)} position={[0, 0.98, 0]} material={hullMat} castShadow receiveShadow />
        <mesh geometry={rbox(0.12, 0.42, 0.62, 0.03)} position={[3.12, 0.8, 0]} rotation={[0, 0, -0.5]} material={hullMat} castShadow />
        <mesh geometry={rbox(1.4, 0.38, 0.5, 0.03)} position={[1.9, 1.2, 0]} material={hullMat} castShadow />
        <mesh geometry={rbox(0.9, 0.3, 0.5, 0.03)} position={[0.4, 1.16, 0]} material={hullMat} castShadow />
        <Track xFront={2.72} xRear={-2.78} rFront={0.37} rRear={0.34} width={0.5} travel={travel} />
        <Wheel r={0.37} width={0.46} spin={travel / 0.37} position={[2.72, 0.37, 0]} bolts={10} rim="#4c5432" />
        <Wheel r={0.34} width={0.46} spin={travel / 0.34} position={[-2.78, 0.34, 0]} rim="#4c5432" />
        {SPACING.map((x) => <Wheel key={x} r={0.33} width={0.42} spin={travel / 0.33} position={[x, 0.33, 0]} rim="#55603a" />)}
      </group>
    ))}
    {/* Mũi: đèn, móc kéo, khoá nòng hành quân gập */}
    {[-1, 1].map((s) => (
      <group key={s}>
        <mesh position={[3.0, 1.38, s * 0.95]} rotation={[0, 0, Math.PI / 2]} material={glass}><cylinderGeometry args={[0.09, 0.09, 0.08, 14]} /></mesh>
        <mesh geometry={rbox(0.18, 0.12, 0.12, 0.02)} position={[3.12, 0.7, s * 0.7]} material={dark} castShadow />
      </group>
    ))}
    <mesh geometry={pipe([[2.3, 1.82, -0.55], [2.75, 1.55, 0], [2.3, 1.82, 0.55]], 0.04)} material={steel} castShadow />
    {/* Lưới tản nhiệt động cơ (mũi phải) */}
    <mesh geometry={rbox(1.0, 0.03, 0.9, 0.01)} position={[2.0, 1.69, 0.6]} rotation={[0, 0, -0.28]} material={dark} />
    {/* Tháp pháo */}
    <group position={[-0.9, 1.75, 0]} rotation={[0, yaw, 0]}>
      <group position={[0.9, 0, 0]}>
        <mesh geometry={extrude(TURRET, 2.95, 0.07)} material={turretMat} castShadow receiveShadow />
        {/* Giỏ đồ phía sau */}
        <mesh geometry={pipe([[-3.1, 0.55, -1.4], [-3.55, 0.6, -1.3], [-3.55, 0.6, 1.3], [-3.1, 0.55, 1.4]], 0.035)} material={steel} castShadow />
        <mesh geometry={rbox(0.42, 0.45, 2.5, 0.06)} position={[-3.32, 0.8, 0]} material={plain('#6e6a4e', 0.95)} castShadow />
        {/* Tháp chỉ huy + súng máy */}
        <group position={[-1.2, 1.42, 0.78]}>
          <mesh material={turretMat} castShadow><cylinderGeometry args={[0.42, 0.46, 0.28, 20]} /></mesh>
          <mesh position={[0, 0.18 + hatch * 0.3, -0.2 - hatch * 0.1]} rotation={[-hatch * 1.4, 0, 0]} material={turretMat} castShadow><cylinderGeometry args={[0.34, 0.34, 0.06, 18]} /></mesh>
          <group position={[0.15, 0.32, 0]}>
            <mesh geometry={lathe([[0.03, 0], [0.025, 1.1]], 8)} material={dark} castShadow />
            <mesh geometry={rbox(0.35, 0.16, 0.12, 0.02)} position={[0, 0, 0]} material={dark} />
          </group>
        </group>
        {/* Nắp lái pháo, kính ngắm, ăng-ten */}
        <mesh geometry={rbox(0.7, 0.07, 0.6, 0.03)} position={[-1.0, 1.43, -0.75]} material={turretMat} castShadow />
        <mesh geometry={rbox(0.22, 0.2, 0.18, 0.03)} position={[0.25, 1.38, -0.95]} material={turretMat} castShadow />
        <mesh geometry={rbox(0.02, 0.14, 0.14, 0.01)} position={[0.37, 1.38, -0.95]} material={glass} />
        <mesh position={[-2.6, 2.2, -1.2]} material={dark}><cylinderGeometry args={[0.008, 0.015, 1.6, 4]} /></mesh>
        <Rivets points={Array.from({ length: 9 }, (_, i) => [-2.6 + i * 0.36, 1.4, 1.46] as [number, number, number])} />
        <Rivets points={Array.from({ length: 9 }, (_, i) => [-2.6 + i * 0.36, 1.4, -1.46] as [number, number, number])} />
      </group>
      {/* Pháo: chốt muzzle quay quanh trục Z tại TRUNNION */}
      <group position={[TRUNNION[0] + 0.9, TRUNNION[1] - 1.75, 0]} rotation={[0, 0, elev]}>
        <mesh geometry={rbox(0.75, 0.85, 0.95, 0.1)} position={[0.15, 0, 0]} material={turretMat} castShadow />
        <group position={[0.35 - recoil * 0.85, 0, 0]}>
          <mesh geometry={lathe(BARREL, 28)} material={gunMat} castShadow />
          {/* Hãm giật: cửa xả hai bên */}
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={rbox(0.35, 0.16, 0.05, 0.01)} position={[6.25, 0, s * 0.165]} material={dark} />
          ))}
        </group>
        {/* Xi lanh hãm lùi dưới nòng */}
        <mesh geometry={lathe([[0.07, 0], [0.07, 1.3]], 12)} position={[0.4, -0.22, 0]} material={steel} castShadow />
      </group>
    </group>
  </group>
);
