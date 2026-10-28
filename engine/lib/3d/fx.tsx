// Hiệu ứng 3D tất định theo thời gian t (giây voice): nổ, lửa đầu nòng, khói, bụi, vệt bay.
// Mọi hạt tính từ (t - at) và seed — không state, không random — nên render khung nào cũng ra đúng một hình.
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

type V3 = [number, number, number];
const r1 = (i: number, k: number, s: number) => { const v = Math.sin(i * 12.9898 + k * 78.233 + s * 37.719) * 43758.5453; return v - Math.floor(v); };
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

let soft: THREE.Texture | null = null;
/** Texture tròn mềm cho sprite khói / bụi. */
export const softDot = () => {
  if (soft) return soft;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  // vân mây
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + 0.05 * r1(i, 1, 3)})`;
    ctx.beginPath();
    ctx.arc(20 + 88 * r1(i, 2, 3), 20 + 88 * r1(i, 3, 3), 6 + 12 * r1(i, 4, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  soft = new THREE.CanvasTexture(cv);
  soft.colorSpace = THREE.SRGBColorSpace;
  return soft;
};

const Puff: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({ pos, size, color, opacity, rot = 0 }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }), []);
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  if (opacity <= 0.003) return null;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

/**
 * Vụ nổ chạm đất tại `pos` lúc `at`: chớp sáng + cầu lửa + mảnh văng + vòng bụi + cột khói bốc lên và tan.
 * `size` ~ bán kính cầu lửa (m). `smokeLife` = giây khói còn lưu lại.
 */
export const Explosion: React.FC<{ t: number; at: number; pos: V3; size?: number; seed?: number; smokeLife?: number; smoke?: string }> = ({
  t, at, pos, size = 4, seed = 1, smokeLife = 7, smoke = '#6d665d',
}) => {
  const dt = t - at;
  if (dt < 0 || dt > smokeLife) return null;
  const fire = Math.max(0, 1 - dt / 0.6);
  const N = 22, D = 26;
  return (
    <group position={pos}>
      {dt < 0.35 && <pointLight color="#ffc070" intensity={size * size * 60 * (1 - dt / 0.35)} distance={size * 18} decay={1.5} position={[0, size, 0]} />}
      {fire > 0 && (
        <>
          <mesh scale={size * (0.5 + ease(dt / 0.35) * 0.9)} position={[0, size * 0.5, 0]}>
            <icosahedronGeometry args={[1, 2]} />
            <meshBasicMaterial color={dt < 0.12 ? '#fff6d0' : '#ffb347'} transparent opacity={fire} toneMapped={false} />
          </mesh>
          <mesh scale={size * (0.8 + ease(dt / 0.5) * 1.2)} position={[0, size * 0.7, 0]}>
            <icosahedronGeometry args={[1, 2]} />
            <meshBasicMaterial color="#ff6a1f" transparent opacity={fire * 0.55} toneMapped={false} />
          </mesh>
        </>
      )}
      {/* mảnh văng đạn đạo */}
      {dt < 2.2 && Array.from({ length: D }, (_, i) => {
        const a = r1(i, 1, seed) * Math.PI * 2, up = 0.4 + r1(i, 2, seed) * 0.9, v = size * (3 + r1(i, 3, seed) * 4);
        const x = Math.cos(a) * v * dt * (1 - up * 0.5), z = Math.sin(a) * v * dt * (1 - up * 0.5), y = v * up * dt - 4.9 * dt * dt;
        if (y < -0.2) return null;
        return (
          <mesh key={i} position={[x, y, z]} rotation={[dt * 9 + i, dt * 7, 0]} castShadow>
            <boxGeometry args={[size * 0.08, size * 0.05, size * 0.06]} />
            <meshStandardMaterial color="#3d3a35" roughness={0.9} />
          </mesh>
        );
      })}
      {/* vòng bụi sát đất */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + r1(i, 5, seed);
        const d = size * (0.6 + ease(dt / 1.4) * 2.6);
        return <Puff key={`d${i}`} pos={[Math.cos(a) * d, size * 0.35, Math.sin(a) * d]} size={size * (1.2 + dt * 0.8)} color="#b5a68a" opacity={0.75 * Math.max(0, 1 - dt / 3)} rot={i} />;
      })}
      {/* cột khói */}
      {Array.from({ length: N }, (_, i) => {
        const born = (i / N) * 0.8, age = dt - born;
        if (age < 0) return null;
        const life = smokeLife - born;
        const rise = size * (1 + i * 0.12) * ease(age / 2.5) + age * 0.6;
        const k = 1 - age / life;
        const c = new THREE.Color(age < 0.4 ? '#4a3f36' : smoke).lerp(new THREE.Color('#9b958c'), Math.min(1, age / life));
        return <Puff key={i} pos={[(r1(i, 6, seed) - 0.5) * size * 1.4 + age * 0.4, size * 0.6 + rise, (r1(i, 7, seed) - 0.5) * size * 1.4]} size={size * (1.4 + r1(i, 8, seed)) * (0.7 + ease(age / 3) * 1.4)} color={`#${c.getHexString()}`} opacity={0.85 * k} rot={i * 1.7} />;
      })}
    </group>
  );
};

/** Lửa + khói đầu nòng tại `pos`, hướng bắn `dir` (vector). */
export const MuzzleBlast: React.FC<{ t: number; at: number; pos: V3; dir: V3; size?: number; seed?: number }> = ({ t, at, pos, dir, size = 1.5, seed = 2 }) => {
  const dt = t - at;
  if (dt < 0 || dt > 4) return null;
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
  const flash = Math.max(0, 1 - dt / 0.12);
  return (
    <group position={pos}>
      {dt < 0.15 && <pointLight color="#ffd27a" intensity={300 * size * flash} distance={size * 25} decay={1.5} />}
      {flash > 0 && (
        <group quaternion={q}>
          <mesh position={[size * 0.9, 0, 0]} scale={[size * 1.6, size * 0.6, size * 0.6]}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshBasicMaterial color="#fff1b8" transparent opacity={flash} toneMapped={false} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[size * 0.2, 0, 0]} rotation={[(i * Math.PI) / 2, 0, 0]} scale={[size * 0.5, size * 1.1, size * 0.15]}>
              <sphereGeometry args={[1, 10, 6]} />
              <meshBasicMaterial color="#ffb347" transparent opacity={flash * 0.8} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      {Array.from({ length: 14 }, (_, i) => {
        const side = new THREE.Vector3(r1(i, 1, seed) - 0.5, r1(i, 2, seed) * 0.6, r1(i, 3, seed) - 0.5).normalize();
        const fwd = i < 6 ? 1 : 0.25;
        const p = d.clone().multiplyScalar(size * (1 + ease(dt / 0.8) * 5 * fwd)).add(side.multiplyScalar(size * ease(dt / 1.2) * 3)).add(new THREE.Vector3(0, dt * 0.8, 0));
        return <Puff key={i} pos={[p.x, p.y, p.z]} size={size * (1 + ease(dt / 2) * 3)} color="#cfc8bd" opacity={0.7 * Math.max(0, 1 - dt / 4)} rot={i} />;
      })}
    </group>
  );
};

/** Bụi tung sau phương tiện: `path(t)` trả vị trí bánh xe theo giây; sinh hạt trong [from, to]. */
export const DustTrail: React.FC<{ t: number; from: number; to: number; path: (t: number) => V3; rate?: number; size?: number; color?: string; life?: number }> = ({
  t, from, to, path, rate = 8, size = 2.2, color = '#c9b893', life = 3,
}) => {
  const items: React.ReactNode[] = [];
  const t0 = Math.max(from, t - life), t1 = Math.min(to, t);
  for (let k = Math.ceil(t0 * rate); k <= Math.floor(t1 * rate); k++) {
    const born = k / rate, age = t - born;
    const p = path(born);
    items.push(<Puff key={k} pos={[p[0] + (r1(k, 1, 4) - 0.5) * 1.5, p[1] + 0.4 + age * 0.7, p[2] + (r1(k, 2, 4) - 0.5) * 1.5]} size={size * (0.6 + age)} color={color} opacity={0.55 * (1 - age / life)} rot={k} />);
  }
  return <>{items}</>;
};

/** Vệt sáng theo dãy điểm (quỹ đạo đạn), vẽ tới tỉ lệ `upto` 0..1. Phát sáng (bloom) khi `glow`. */
export const Trail: React.FC<{ points: V3[]; upto?: number; color?: string; width?: number; opacity?: number; glow?: boolean }> = ({
  points, upto = 1, color = '#ffb347', width = 0.15, opacity = 0.9, glow = true,
}) => {
  const n = Math.max(2, Math.floor(points.length * Math.min(1, upto)));
  const geo = useMemo(() => {
    if (upto <= 0.001) return null;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.slice(0, n).map((p) => new THREE.Vector3(...p))), n * 2, width, 6, false);
  }, [points, n, width, upto]);
  useEffect(() => () => geo?.dispose(), [geo]); // geometry cũ được giải phóng khi vệt dài thêm
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={!glow} />
    </mesh>
  );
};

/** Điểm trên quỹ đạo đạn đạo (parabol) từ `a` tới `b`, đỉnh cao `apex` trên đường nối; p = 0..1. */
export const ballistic = (p: number, a: V3, b: V3, apex: number): V3 => [
  a[0] + (b[0] - a[0]) * p,
  a[1] + (b[1] - a[1]) * p + apex * 4 * p * (1 - p),
  a[2] + (b[2] - a[2]) * p,
];
export const ballisticPoints = (a: V3, b: V3, apex: number, n = 64): V3[] => Array.from({ length: n }, (_, i) => ballistic(i / (n - 1), a, b, apex));
